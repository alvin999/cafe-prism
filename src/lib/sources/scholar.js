import { fetchFromProxy, fetchWithTimeout } from '../api/proxy.js';

// ─── 探索模式每日輪替研究主題庫 (Daily Research Topics for Discovery Mode) ───
export const DISCOVERY_TOPICS = [
  {
    topic: 'extraction_dynamics',
    label: '萃取動力學與粒徑分布',
    openAlexQuery: 'coffee extraction kinetics grind particle distribution brewing',
    scholarQuery: 'coffee extraction kinetics OR "particle size distribution" OR "brewing dynamics"',
  },
  {
    topic: 'roasting_chemistry',
    label: '烘焙化學反應與香氣物質',
    openAlexQuery: 'coffee roasting chemistry Maillard aroma compounds volatiles',
    scholarQuery: '"coffee roasting" OR "roasting chemistry" OR "Maillard reaction" coffee aroma',
  },
  {
    topic: 'water_minerals',
    label: '水質化學與礦物質影響',
    openAlexQuery: 'coffee brewing water chemistry magnesium bicarbonate extraction',
    scholarQuery: '"water quality" OR "water composition" OR magnesium coffee extraction brewing',
  },
  {
    topic: 'fermentation_processing',
    label: '發酵處理法與厭氧微批次',
    openAlexQuery: 'coffee fermentation yeast microbial anaerobic processing sensory',
    scholarQuery: '"coffee fermentation" OR "anaerobic fermentation" OR "yeast" coffee processing',
  },
  {
    topic: 'espresso_percolation',
    label: '義式濃縮流體力學與壓力曲線',
    openAlexQuery: 'espresso extraction percolation pressure fluid dynamics crema',
    scholarQuery: 'espresso percolation OR "fluid dynamics" OR "crema" espresso extraction',
  },
  {
    topic: 'cultivars_genetics',
    label: '品種基因與杯測風味品質',
    openAlexQuery: 'Coffea arabica cultivars genetics disease resistance climate cup quality',
    scholarQuery: '"Coffea arabica" OR "coffee cultivars" OR "coffee genetics" cup quality',
  },
  {
    topic: 'sensory_flavor',
    label: '感官科學與風味輪評價',
    openAlexQuery: 'coffee sensory evaluation flavor perception volatile organic compounds taste',
    scholarQuery: '"sensory evaluation" OR "flavor perception" OR "volatile compounds" specialty coffee',
  },
  {
    topic: 'bioactive_health',
    label: '生物活性物質與健康效應',
    openAlexQuery: 'coffee chlorogenic acids caffeine antioxidant metabolism human health',
    scholarQuery: '"chlorogenic acid" OR "caffeine metabolism" OR "coffee antioxidant" health',
  },
];

/**
 * 依據今日日期計算輪替的主題（確保每日自動切換，永不撞題）
 */
export function getDailyDiscoveryTopic(date = new Date()) {
  const dayNumber = Math.floor(date.getTime() / 86400000);
  const index = Math.abs(dayNumber) % DISCOVERY_TOPICS.length;
  return DISCOVERY_TOPICS[index];
}

// ─── Helper: 還原 OpenAlex 倒排索引摘要 ──────────────────────────────────────
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
  }
  return words.filter(Boolean).join(' ').slice(0, 600);
}

// ─── OpenAlex fetcher (免 API Key、高限額真實學術搜尋) ────────────────────────
export async function fetchOpenAlex(keywords, discoveryMode = false) {
  const isDiscovery = discoveryMode || keywords.length === 0;
  const currentTopic = isDiscovery ? getDailyDiscoveryTopic() : null;
  const query = isDiscovery
    ? currentTopic.openAlexQuery
    : keywords.join(' ');

  const currentYear = new Date().getFullYear();
  // Discovery 模式鎖定近 4 年文獻，確保發掘具代表性的近年研究成果
  const filterParam = isDiscovery ? `&filter=from_publication_date:${currentYear - 4}-01-01` : '';
  // 擴大每頁候選數量至 15 篇，Discovery 模式按相關度排序；自訂關鍵字按引用數排序
  const sortParam = isDiscovery ? '&sort=relevance_score:desc' : '&sort=cited_by_count:desc';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=15${sortParam}${filterParam}`;

  const res = await fetchWithTimeout(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CafePrism/1.0 (mailto:cafe-prism@research.local)',
    }
  }, 8000);

  if (!res.ok) {
    throw new Error(`OpenAlex API 錯誤 (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (data?.results && Array.isArray(data.results)) {
    return data.results
      .filter(p => p.display_name || p.title)
      .map(p => ({
        title: p.display_name || p.title,
        link: p.doi || p.primary_location?.landing_page_url || (p.id ? `https://openalex.org/${p.id.split('/').pop()}` : ''),
        description: reconstructAbstract(p.abstract_inverted_index) || p.display_name || '',
        pubDate: p.publication_year ? String(p.publication_year) : '',
        source: 'semantic_scholar',
        authors: (p.authorships || []).map(a => a.author?.display_name).filter(Boolean).slice(0, 5).join(', '),
        citationCount: p.cited_by_count || 0,
        topic: currentTopic?.label || null,
      }));
  }
  return [];
}

// ─── Semantic Scholar fetcher (優先嘗試，若 429 則切換至 OpenAlex 真實學術搜尋) ──
export async function fetchSemanticScholar(keywords, discoveryMode = false, apiKey = '') {
  const isDiscovery = discoveryMode || keywords.length === 0;
  const currentTopic = isDiscovery ? getDailyDiscoveryTopic() : null;
  let query;
  if (isDiscovery) {
    query = currentTopic.scholarQuery;
  } else {
    query = keywords.join(' ');
  }

  // 擴增候選池至 15 篇；Discovery 模式鎖定近 3 年，預設依相關度自然排序
  const currentYear = new Date().getFullYear();
  const yearSuffix = isDiscovery ? `&year=${currentYear - 3}-` : '';
  const sort = isDiscovery ? '' : '&sort=citationCount:desc';

  const endpoint = `/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=15&fields=title,abstract,year,authors,url,citationCount${sort}${yearSuffix}`;

  const headers = apiKey ? { 'x-api-key': apiKey.trim() } : {};

  try {
    const data = await fetchFromProxy('/api-scholar', endpoint, true, 8000, headers);
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map(p => ({
        title: p.title,
        link: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
        description: p.abstract || '',
        pubDate: p.year ? String(p.year) : '',
        source: 'semantic_scholar',
        authors: (p.authors || []).map(a => a.name).join(', '),
        citationCount: p.citationCount || 0,
        topic: currentTopic?.label || null,
      }));
    }
  } catch (err) {
    console.warn('[Semantic Scholar] 429 速率限制或連線受阻，自動切換至 OpenAlex 真實學術搜尋引擎...', err);
  }

  // 備援切換：當 Semantic Scholar 429 限流或無回應時，使用 OpenAlex 搜尋真實學術論文
  try {
    const openAlexPapers = await fetchOpenAlex(keywords, discoveryMode);
    if (openAlexPapers.length > 0) {
      return openAlexPapers;
    }
  } catch (oaErr) {
    console.error('[OpenAlex] 學術搜尋失敗:', oaErr);
    throw new Error(`無法連線至學術論文來源 (Semantic Scholar 429 且 OpenAlex 連線逾時): ${oaErr.message}`);
  }

  return [];
}

