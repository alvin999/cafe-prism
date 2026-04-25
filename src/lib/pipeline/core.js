import { fetchCoffeeRSS } from '../sources/rss.js';
import { fetchSemanticScholar } from '../sources/scholar.js';
import { fetchReddit } from '../sources/reddit.js';
import { callLLM, buildGroundedSummaryPrompt, parseAIGeneratedJSON } from '../llm/index.js';
import { computeConfidence, detectConflicts } from '../analyze/confidence.js';
import { hashText } from '../utils/hash.js';

// ─── Main pipeline ────────────────────────────────────────────────────────────
export async function runResearchPipeline(settings, onProgress) {
  const isDiscovery = !!settings.discoveryMode;
  const keywords = (settings.keywords || '')
    .split(',').map(k => k.trim()).filter(Boolean);

  onProgress('Crawling coffee world…', 10);
  const allArticles = [];

  // Parallel fetch for speed
  const fetchers = [];
  if (settings.enablePapers !== false) fetchers.push(fetchSemanticScholar(keywords, isDiscovery));
  if (settings.enableNews   !== false) fetchers.push(fetchCoffeeRSS(keywords, isDiscovery));
  if (settings.enableReddit !== false) fetchers.push(fetchReddit(keywords, isDiscovery));

  const results = await Promise.allSettled(fetchers);
  results.forEach(r => { if (r.status === 'fulfilled') allArticles.push(...r.value); });

  onProgress('Organising by hotness & diversity…', 45);

  if (allArticles.length === 0) {
    throw new Error('No articles fetched. Check your network or settings.');
  }

  // 1. Clustering
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < allArticles.length; i++) {
    if (used.has(i)) continue;
    const group = [allArticles[i]];
    used.add(i);
    for (let j = i + 1; j < allArticles.length; j++) {
      if (used.has(j)) continue;
      const wordsA = allArticles[i].title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const wordsB = allArticles[j].title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const overlap = wordsA.filter(w => wordsB.includes(w));
      if (overlap.length >= 1) {
        group.push(allArticles[j]);
        used.add(j);
      }
    }
    clusters.push(group);
  }

  // 2. Scoring & Selection
  const scoredClusters = clusters.map(cluster => {
    let score = cluster.length * 10; // size bonus
    const sources = new Set(cluster.map(a => a.source));
    score += sources.size * 50; // diversity bonus

    // Add source-specific hotness
    cluster.forEach(a => {
      if (a.source === 'reddit') score += (a.score || 0) / 10;
      if (a.source === 'semantic_scholar') score += 20; // weight papers higher
    });

    return { cluster, score, sources };
  }).sort((a, b) => b.score - a.score);

  // 3. Diversified Picker (Fixed Quota: 3 Reddit, 2 RSS, 1 Scholar)
  const redditClusters = scoredClusters.filter(c => c.sources.has('reddit') && !c.sources.has('semantic_scholar'));
  const rssClusters = scoredClusters.filter(c => c.sources.has('rss') && !c.sources.has('semantic_scholar') && !c.sources.has('reddit'));
  const scholarClusters = scoredClusters.filter(c => c.sources.has('semantic_scholar'));

  // Ensure unique clusters are selected
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
  addClusters(redditClusters, 3);
  addClusters(rssClusters, 2);

  // Fallback: If we don't have enough, fill with any remaining highest-scoring clusters until we reach 6
  for (const sc of scoredClusters) {
    if (selected.length >= 6) break;
    if (!selectedClusters.has(sc)) {
      selected.push(sc);
      selectedClusters.add(sc);
    }
  }

  onProgress('Generating grounded summaries…', 65);

  const cards = [];
  const lang = settings.language || 'en';

  for (const item of selected) {
    const cluster = item.cluster;
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
        articles: cluster,
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
    } catch (e) { console.warn('LLM failed for cluster:', e); }
  }

  onProgress('Done', 100);
  return cards;
}
