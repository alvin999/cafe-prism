import { fetchFromProxy, fetchWithTimeout } from '../api/proxy.js';
import { parseRSS } from './rss.js';
import { getDailyDiscoveryTopic } from '../pipeline/topics.js';
import { sanitizeHtmlText } from '../utils/sanitize.js';

// ─── Reddit fetcher ──────────────────────────────────────────────────────────
export async function fetchReddit(keywords, discoveryMode = false) {
  const isDiscovery = discoveryMode || keywords.length === 0;
  const currentTopic = isDiscovery ? getDailyDiscoveryTopic() : null;

  let jsonError = null;

  // 1. 嘗試直接抓取 JSON API (Discovery 模式採用雙軌 50/50：今日熱帖 + 當日主題討論)
  try {
    if (isDiscovery) {
      const endpoints = [
        // 軌道 1：今日爆款發燒文 (Hot Discussions ~50%)
        { path: `/r/Coffee+espresso/hot.json?limit=10`, type: 'hot' },
        // 軌道 2：當日主題深入討論 (Topic Discussions ~50%)
        { path: `/r/Coffee+espresso/search.json?q=${encodeURIComponent(currentTopic.redditQuery)}&sort=relevance&limit=10&restrict_sr=1`, type: 'topic' },
      ];

      const fetchPromises = endpoints.map(async (ep) => {
        try {
          const data = await fetchFromProxy('/api-reddit', ep.path, true, 7000);
          if (data?.data?.children && Array.isArray(data.data.children)) {
            return data.data.children
              .filter(c => !c.data.stickied && !c.data.pinned && !/^\[MOD\]/i.test(c.data.title) && !/daily question thread/i.test(c.data.title))
              .map(c => ({
                title: sanitizeHtmlText(c.data.title),
                link: `https://reddit.com${c.data.permalink}`,
                description: sanitizeHtmlText(c.data.selftext?.slice(0, 500) || c.data.title),
                pubDate: new Date(c.data.created_utc * 1000).toISOString(),
                source: 'reddit',
                score: c.data.score || 0,
                redditType: ep.type,
                topic: ep.type === 'topic' ? currentTopic?.label : null,
              }));
          }
        } catch (err) {
          console.warn(`[Reddit JSON] Failed endpoint ${ep.path}:`, err.message);
        }
        return [];
      });

      const settled = await Promise.allSettled(fetchPromises);
      const combined = [];
      settled.forEach(s => {
        if (s.status === 'fulfilled' && Array.isArray(s.value)) {
          combined.push(...s.value);
        }
      });

      // 去重
      const seenLinks = new Set();
      const results = [];
      for (const item of combined) {
        const linkKey = (item.link || '').toLowerCase();
        if (linkKey && !seenLinks.has(linkKey)) {
          seenLinks.add(linkKey);
          results.push(item);
        }
      }

      if (results.length > 0) {
        return results;
      }
    } else {
      // 自訂關鍵字搜尋
      const query = encodeURIComponent(keywords.join(' '));
      const endpoint = `/r/Coffee+espresso/search.json?q=${query}&sort=new&limit=15&restrict_sr=1`;
      const data = await fetchFromProxy('/api-reddit', endpoint, true, 7000);
      if (data?.data?.children && data.data.children.length > 0) {
        return data.data.children
          .filter(c => !c.data.stickied && !c.data.pinned && !/^\[MOD\]/i.test(c.data.title) && !/daily question thread/i.test(c.data.title))
          .map(c => ({
            title: sanitizeHtmlText(c.data.title),
            link: `https://reddit.com${c.data.permalink}`,
            description: sanitizeHtmlText(c.data.selftext?.slice(0, 500) || c.data.title),
            pubDate: new Date(c.data.created_utc * 1000).toISOString(),
            source: 'reddit',
            score: c.data.score || 0,
          }));
      }
    }
  } catch (err) {
    jsonError = err;
    console.warn('[Reddit JSON] Direct fetch failed, trying RSS fallback...', err);
  }

  // 2. 備援策略 1：若 JSON 失敗，改抓取 Reddit RSS Feed（設定 7 秒逾時）
  let rssError = null;
  try {
    const rssTarget = 'https://www.reddit.com/r/Coffee/.rss?sort=hot';
    const res = await fetchWithTimeout(`/api-feed?url=${encodeURIComponent(rssTarget)}`, {}, 7000);
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSS(xml);
      if (items && items.length > 0) {
        return items
          .filter(item => !/^\[MOD\]/i.test(item.title) && !/daily question thread/i.test(item.title))
          .map(item => ({
            ...item,
            source: 'reddit',
            score: 15,
          }));
      }
    } else {
      const detail = await res.text().catch(() => '');
      const clean = detail ? detail.trim().split('\n')[0] : '';
      rssError = new Error(clean ? `${clean} (HTTP ${res.status})` : `HTTP ${res.status}`);
    }
  } catch (rssErr) {
    rssError = rssErr;
    console.warn('[Reddit RSS Fallback] Failed:', rssErr);
  }

  // 3. 備援策略 2：若 Reddit 遭雲端機房 429 嚴格阻擋，自動切換至社群討論熱門備援通道
  try {
    const communityQuery = isDiscovery
      ? `coffee+espresso+${encodeURIComponent(currentTopic?.redditQuery || 'community')}+discussion`
      : `coffee+espresso+${encodeURIComponent(keywords.join('+'))}+discussion`;
    const communityProxy = `/api-news/rss/search?q=${communityQuery}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetchWithTimeout(communityProxy, {}, 7000);
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSS(xml);
      if (items && items.length > 0) {
        return items.slice(0, 8).map(item => ({
          ...item,
          source: 'reddit',
          score: 20,
          topic: isDiscovery ? currentTopic?.label : null,
        }));
      }
    }
  } catch (commErr) {
    console.warn('[Community Fallback] Failed:', commErr);
  }

  // 4. 若所有途徑均未取得內容，嚴格拋出錯誤觸發紅燈
  const lastMsg = rssError?.message || jsonError?.message || '連線逾時或遭阻擋';
  throw new Error(`無法連線至社群討論來源: ${lastMsg}`);
}
