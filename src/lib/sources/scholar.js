import { fetchFromProxy, fetchWithTimeout } from '../api/proxy.js';

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
  const query = (discoveryMode || keywords.length === 0)
    ? 'coffee espresso extraction brewing'
    : keywords.join(' ');

  const currentYear = new Date().getFullYear();
  const filterParam = discoveryMode ? `&filter=from_publication_date:${currentYear - 3}-01-01` : '';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=8&sort=cited_by_count:desc${filterParam}`;

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
      }));
  }
  return [];
}

// ─── Semantic Scholar fetcher (優先嘗試，若 429 則切換至 OpenAlex 真實學術搜尋) ──
export async function fetchSemanticScholar(keywords, discoveryMode = false, apiKey = '') {
  let query;
  if (discoveryMode || keywords.length === 0) {
    query = 'coffee OR espresso OR "coffee research"';
  } else {
    query = keywords.join(' ');
  }

  const sort = (discoveryMode || keywords.length === 0) ? '&sort=citationCount:desc' : '';
  const yearSuffix = (discoveryMode || keywords.length === 0) ? `&year=${new Date().getFullYear()-1}-` : '';

  const endpoint = `/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=8&fields=title,abstract,year,authors,url,citationCount${sort}${yearSuffix}`;

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

