import { fetchFromProxy } from '../api/proxy.js';

// ─── Semantic Scholar fetcher ────────────────────────────────────────────────
export async function fetchSemanticScholar(keywords, discoveryMode = false) {
  let query;
  if (discoveryMode || keywords.length === 0) {
    query = 'coffee OR espresso OR "coffee research"';
  } else {
    query = keywords.join(' ');
  }
  
  const sort = (discoveryMode || keywords.length === 0) ? '&sort=citationCount:desc' : '';
  const yearSuffix = (discoveryMode || keywords.length === 0) ? `&year=${new Date().getFullYear()-1}-` : '';
  
  const endpoint = `/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=8&fields=title,abstract,year,authors,url,citationCount${sort}${yearSuffix}`;
  
  try {
    const data = await fetchFromProxy('/api-scholar', endpoint, true);
    return (data.data || []).map(p => ({
      title: p.title,
      link: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      description: p.abstract || '',
      pubDate: p.year ? String(p.year) : '',
      source: 'semantic_scholar',
      authors: (p.authors || []).map(a => a.name).join(', '),
      citationCount: p.citationCount || 0,
    }));
  } catch {
    return [];
  }
}
