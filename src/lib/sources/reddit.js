import { fetchFromProxy } from '../api/proxy.js';

// ─── Reddit fetcher ──────────────────────────────────────────────────────────
export async function fetchReddit(keywords, discoveryMode = false) {
  let endpoint;
  if (discoveryMode || keywords.length === 0) {
    // Trending/Hot mode: fetch from top coffee subreddits
    endpoint = `/r/Coffee+espresso/hot.json?limit=15`;
  } else {
    const query = encodeURIComponent(keywords.join(' '));
    endpoint = `/r/Coffee+espresso/search.json?q=${query}&sort=new&limit=10&restrict_sr=1`;
  }

  try {
    const data = await fetchFromProxy('/api-reddit', endpoint, true);
    return (data?.data?.children || []).map(c => ({
      title: c.data.title,
      link: `https://reddit.com${c.data.permalink}`,
      description: c.data.selftext?.slice(0, 500) || c.data.title,
      pubDate: new Date(c.data.created_utc * 1000).toISOString(),
      source: 'reddit',
      score: c.data.score,
    }));
  } catch {
    return [];
  }
}
