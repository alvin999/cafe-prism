import { fetchFromProxy } from '../api/proxy.js';
import { parseRSS } from './rss.js';

// ─── Reddit fetcher ──────────────────────────────────────────────────────────
export async function fetchReddit(keywords, discoveryMode = false) {
  let endpoint;
  if (discoveryMode || keywords.length === 0) {
    endpoint = `/r/Coffee+espresso/hot.json?limit=15`;
  } else {
    const query = encodeURIComponent(keywords.join(' '));
    endpoint = `/r/Coffee+espresso/search.json?q=${query}&sort=new&limit=10&restrict_sr=1`;
  }

  // 1. 嘗試直接抓取 JSON API
  try {
    const data = await fetchFromProxy('/api-reddit', endpoint, true);
    if (data?.data?.children && data.data.children.length > 0) {
      return data.data.children.map(c => ({
        title: c.data.title,
        link: `https://reddit.com${c.data.permalink}`,
        description: c.data.selftext?.slice(0, 500) || c.data.title,
        pubDate: new Date(c.data.created_utc * 1000).toISOString(),
        source: 'reddit',
        score: c.data.score || 0,
      }));
    }
  } catch (err) {
    console.warn('[Reddit JSON] Direct fetch failed, trying RSS fallback...', err);
  }

  // 2. 備援策略：若 JSON 遇到 403，改抓取 Reddit RSS Feed（更不容易被擋）
  try {
    const rssTarget = 'https://www.reddit.com/r/Coffee/.rss?sort=hot';
    const res = await fetch(`/api-feed?url=${encodeURIComponent(rssTarget)}`);
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSS(xml);
      return items.map(item => ({
        ...item,
        source: 'reddit',
        score: 15,
      }));
    }
  } catch (rssErr) {
    console.warn('[Reddit RSS Fallback] Failed:', rssErr);
  }

  return [];
}
