import { fetchCoffeeRSS } from '../sources/rss.js';
import { fetchSemanticScholar } from '../sources/scholar.js';
import { fetchReddit } from '../sources/reddit.js';
import { callLLM, buildGroundedSummaryPrompt, parseAIGeneratedJSON } from '../llm/index.js';
import { computeConfidence, detectConflicts } from '../analyze/confidence.js';
import { hashText } from '../utils/hash.js';

// ─── Main pipeline ────────────────────────────────────────────────────────────
export async function runResearchPipeline(settings, onProgress) {
  const isDiscovery = settings.discoveryMode !== false;
  const keywords = (settings.keywords || '')
    .split(',').map(k => k.trim()).filter(Boolean);

  onProgress('Crawling coffee world…', 10);
  const allArticles = [];

  // Parallel fetch for speed with named tasks for observability
  const tasks = [];
  if (settings.enablePapers !== false) {
    tasks.push({ key: 'semantic_scholar', name: 'Semantic Scholar', promise: fetchSemanticScholar(keywords, isDiscovery, settings.scholarApiKey) });
  }
  if (settings.enableNews !== false) {
    tasks.push({ key: 'rss', name: 'RSS', promise: fetchCoffeeRSS(keywords, isDiscovery) });
  }
  if (settings.enableReddit !== false) {
    tasks.push({ key: 'reddit', name: 'Reddit', promise: fetchReddit(keywords, isDiscovery) });
  }

  const results = await Promise.allSettled(tasks.map(t => t.promise));
  const sourceStatus = {
    semantic_scholar: { status: settings.enablePapers === false ? 'disabled' : 'failed', count: 0, error: null },
    rss: { status: settings.enableNews === false ? 'disabled' : 'failed', count: 0, error: null },
    reddit: { status: settings.enableReddit === false ? 'disabled' : 'failed', count: 0, error: null },
  };

  tasks.forEach((task, idx) => {
    const res = results[idx];
    if (res.status === 'fulfilled') {
      const items = Array.isArray(res.value) ? res.value : [];
      allArticles.push(...items);
      const isSuccess = items.length > 0;
      sourceStatus[task.key] = {
        status: isSuccess ? 'success' : 'failed',
        count: items.length,
        error: isSuccess ? null : '未抓取到任何資料（連線受阻或無相關內容）',
      };
    } else {
      sourceStatus[task.key] = {
        status: 'failed',
        count: 0,
        error: res.reason?.message || String(res.reason || 'Unknown fetch error'),
      };
    }
  });

  onProgress('Organising by hotness & diversity…', 45);

  if (allArticles.length === 0) {
    const err = new Error('No articles fetched. Check your network or settings.');
    err.sourceStatus = sourceStatus;
    throw err;
  }

  // 1. Group articles by source & cluster them per source
  const clusterBySource = (articles, primarySource) => {
    const clusters = [];
    const used = new Set();
    const commonStopwords = new Set(['coffee', 'specialty', 'about', 'which', 'their', 'there', 'would', 'could', 'should', 'using', 'first', 'after']);

    for (let i = 0; i < articles.length; i++) {
      if (used.has(i)) continue;
      const group = [articles[i]];
      used.add(i);
      for (let j = i + 1; j < articles.length; j++) {
        if (used.has(j)) continue;
        const wordsA = articles[i].title.toLowerCase().split(/[\s,.:;!?"'()\[\]{}]+/).filter(w => w.length > 3 && !commonStopwords.has(w));
        const wordsB = articles[j].title.toLowerCase().split(/[\s,.:;!?"'()\[\]{}]+/).filter(w => w.length > 3 && !commonStopwords.has(w));
        const overlap = wordsA.filter(w => wordsB.includes(w));
        // At least 2 meaningful words match, or 1 long distinct word (>6 chars)
        if (overlap.length >= 2 || (overlap.length === 1 && overlap[0].length > 6)) {
          group.push(articles[j]);
          used.add(j);
        }
      }
      clusters.push(group);
    }

    return clusters.map(cluster => {
      let score = cluster.length * 10;
      cluster.forEach(a => {
        if (a.source === 'reddit') score += (a.score || 0) / 10;
        if (a.source === 'semantic_scholar') score += 20;
      });
      return {
        cluster,
        score,
        sources: new Set(cluster.map(a => a.source)),
        primarySource,
      };
    }).sort((a, b) => b.score - a.score);
  };

  const scholarArticles = allArticles.filter(a => a.source === 'semantic_scholar');
  const redditArticles = allArticles.filter(a => a.source === 'reddit');
  const rssArticles = allArticles.filter(a => a.source === 'rss');

  const scholarClusters = clusterBySource(scholarArticles, 'semantic_scholar');
  const redditClusters = clusterBySource(redditArticles, 'reddit');
  const rssClusters = clusterBySource(rssArticles, 'rss');

  // 2. Diversified Picker (Guarantee quotas for each available source: 1-2 Scholar, 2-3 RSS, 2-3 Reddit)
  const selectedClusters = new Set();
  const selected = [];

  const addClusters = (pool, quota) => {
    let added = 0;
    for (const sc of pool) {
      if (added >= quota) break;
      if (!selectedClusters.has(sc)) {
        selected.push(sc);
        selectedClusters.add(sc);
        added++;
      }
    }
    return added;
  };

  addClusters(scholarClusters, 1);
  addClusters(rssClusters, 2);
  addClusters(redditClusters, 3);

  // Fallback: If not enough, fill with remaining highest-scoring clusters until 6
  const remainingAll = [...scholarClusters, ...rssClusters, ...redditClusters].sort((a, b) => b.score - a.score);
  for (const sc of remainingAll) {
    if (selected.length >= 6) break;
    if (!selectedClusters.has(sc)) {
      selected.push(sc);
      selectedClusters.add(sc);
    }
  }

  onProgress('Generating grounded summaries…', 65);

  const cards = [];
  const lang = settings.language || 'en';

  // ─── Determine if a valid model is configured ────────────────────────────
  const hasModel =
    settings.modelType === 'local'
      ? !!(settings.ollamaUrl && settings.ollamaModel)
      : settings.modelType === 'cloud'
        ? !!(settings.provider && ((settings.apiKeys && settings.apiKeys[settings.provider]) || settings.apiKey))
        : false;

  for (const item of selected) {
    const cluster = item.cluster;

    // Helper to create a fallback card
    const createFallbackCard = async (errorMsg = null) => {
      const contentHash = await hashText(cluster.map(a => a.link).join(''));
      return {
        id: contentHash,
        summary: '',
        fun_fact: '',
        practical_tip: '',
        keyTerms: [],
        consensus: '',
        conflicts: '',
        uncertainty: '',
        repaired: false,
        incomplete: false,
        noModel: true,
        llmError: !!errorMsg,
        errorDetail: errorMsg,
        articles: cluster,
        primarySource: item.primarySource || cluster[0]?.source || 'unknown',
        confidence: 'low',
        hasConflict: detectConflicts(cluster),
        crossVerified: item.sources.size >= 2,
        uncertainCount: 0,
        hash: contentHash,
        timestamp: new Date().toISOString(),
        primaryTitle: cluster[0].title,
        debug: errorMsg ? { error: errorMsg } : null,
      };
    };

    // ─── No-Model Fallback: skip LLM ─────────────────────────────────────
    if (!hasModel) {
      cards.push(await createFallbackCard());
      continue;
    }

    // ─── Normal LLM path ─────────────────────────────────────────────────
    try {
      const prompt = await buildGroundedSummaryPrompt(cluster, lang);
      const rawResponse = await callLLM(settings, prompt);

      const { data, repaired, incomplete } = parseAIGeneratedJSON(rawResponse);
      
      const contentHash = await hashText(data.summary + cluster.map(a => a.link).join(''));
      const confidence = computeConfidence(cluster, data.summary);
      const hasConflict = detectConflicts(cluster) || (data.conflicts && data.conflicts.toLowerCase().includes('conflict'));
      const crossVerified = item.sources.size >= 2;

      const uncertainSentences = data.summary.split(/[.!?]/).filter(s => s.includes('⚠')).length;

      const actualModel = settings.modelType === 'local' ? settings.ollamaModel : (settings.model || 'default-standard');

      cards.push({
        id: contentHash,
        summary: data.summary,
        fun_fact: data.fun_fact || '',
        practical_tip: data.practical_tip || '',
        keyTerms: data.keyTerms || [],
        consensus: data.consensus || '',
        conflicts: data.conflicts || '',
        uncertainty: data.uncertainty || '',
        repaired: repaired,
        incomplete: incomplete,
        noModel: false,
        llmError: false,
        articles: cluster,
        primarySource: item.primarySource || cluster[0]?.source || 'unknown',
        confidence,
        hasConflict,
        crossVerified,
        uncertainCount: uncertainSentences,
        hash: contentHash,
        timestamp: new Date().toISOString(),
        primaryTitle: data.subject || cluster[0].title,
        debug: {
          prompt,
          rawResponse,
          model: actualModel,
        }
      });
    } catch (e) { 
      console.warn('LLM failed, falling back to raw title:', e);
      // Even if AI fails, we show the raw title so the user gets something
      cards.push(await createFallbackCard(e.message));
    }
  }

  onProgress('Done', 100);
  cards.sourceStatus = sourceStatus;
  return cards;
}
