import { fetchWithTimeout } from '../api/proxy.js';
import { getDailyDiscoveryTopic } from '../pipeline/topics.js';

// ─── RSS parser ─────────────────────────────────────────────────────────────
export function parseRSS(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const items = Array.from(doc.querySelectorAll('item, entry'));
    return items.slice(0, 10).map(item => ({
      title: item.querySelector('title')?.textContent?.trim() || '',
      link: item.querySelector('link')?.textContent?.trim() ||
            item.querySelector('link')?.getAttribute('href') || '',
      description: item.querySelector('description, summary, content')?.textContent?.trim() || '',
      pubDate: item.querySelector('pubDate, published, updated')?.textContent?.trim() || '',
      source: 'rss',
    })).filter(i => i.title && i.link);
  } catch (err) {
    console.warn('[RSS Parser] Parse error:', err);
    return [];
  }
}

async function fetchFeedContent(url) {
  let lastErr = null;

  // 1. 優先使用原生代理通道（Cloudflare _redirects / Vite proxy）
  try {
    let proxyPath = null;
    if (url.includes('news.google.com')) {
      proxyPath = url.replace('https://news.google.com', '/api-news');
    } else if (url.includes('sprudge.com')) {
      proxyPath = url.replace('https://sprudge.com', '/api-sprudge');
    }

    if (proxyPath) {
      const res = await fetchWithTimeout(proxyPath, {}, 7000);
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<item') || text.includes('<entry')) return text;
      }
    }
  } catch (err) {
    lastErr = err;
  }

  // 2. 次選：使用 /api-feed 動態代理（Cloudflare Pages Functions / Vite middleware）
  try {
    const res = await fetchWithTimeout(`/api-feed?url=${encodeURIComponent(url)}`, {}, 7000);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<item') || text.includes('<entry')) return text;
    } else {
      const detail = await res.text().catch(() => '');
      const clean = detail ? detail.trim().split('\n')[0] : '';
      lastErr = new Error(clean ? `${clean} (HTTP ${res.status})` : `HTTP ${res.status}`);
    }
  } catch (err) {
    lastErr = err;
  }

  // 3. 備援：使用 allorigins 公開代理
  try {
    const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {}, 7000);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<item') || text.includes('<entry')) return text;
    }
  } catch (err) {
    lastErr = err;
  }

  throw lastErr || new Error(`無法連線至新聞來源: ${url}`);
}

export async function fetchCoffeeRSS(keywords, discoveryMode = false) {
  const isDiscovery = discoveryMode || keywords.length === 0;
  const currentTopic = isDiscovery ? getDailyDiscoveryTopic() : null;

  // 雙軌制來源規劃：軌道 1（今日即時頭條與產業快訊）＋ 軌道 2（今日探索主題深入專欄）
  let feedConfigs = [];

  if (isDiscovery) {
    feedConfigs = [
      // 軌道 1：即時頭條新聞 (Trending Breaking News ~50%)
      {
        url: 'https://news.google.com/rss/search?q=specialty+coffee+espresso+brewing&hl=en-US&gl=US&ceid=US:en',
        type: 'trending',
        quota: 6,
      },
      {
        url: 'https://sprudge.com/feed',
        type: 'trending',
        quota: 5,
      },
      // 軌道 2：當日主題深入專題 (Topic News ~50%)
      {
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(currentTopic.newsQuery)}&hl=en-US&gl=US&ceid=US:en`,
        type: 'topic',
        quota: 7,
      },
    ];
  } else {
    const userQuery = keywords.join(' ');
    feedConfigs = [
      {
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(userQuery)}&hl=en-US&gl=US&ceid=US:en`,
        type: 'custom',
        quota: 8,
      },
      {
        url: 'https://sprudge.com/feed',
        type: 'custom',
        quota: 5,
      },
      {
        url: 'https://news.google.com/rss/search?q=specialty+coffee+espresso+brewing&hl=en-US&gl=US&ceid=US:en',
        type: 'custom',
        quota: 4,
      },
    ];
  }

  // 平行抓取各 Feed，兼顧效率與雙軌多元性
  const feedPromises = feedConfigs.map(async (cfg) => {
    try {
      const xml = await fetchFeedContent(cfg.url);
      const items = parseRSS(xml);
      let filtered = items;
      if (!isDiscovery && keywords.length > 0) {
        const kw = keywords.map(k => k.toLowerCase());
        filtered = items.filter(item =>
          kw.some(k => item.title.toLowerCase().includes(k) || item.description.toLowerCase().includes(k))
        );
      }
      return filtered.slice(0, cfg.quota).map(i => ({
        ...i,
        feedUrl: cfg.url,
        feedType: cfg.type,
        topic: cfg.type === 'topic' ? currentTopic?.label : null,
      }));
    } catch (err) {
      console.warn(`[RSS] Failed to fetch feed ${cfg.url}:`, err.message);
      return [];
    }
  });

  const settled = await Promise.allSettled(feedPromises);
  const rawItems = [];
  settled.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      rawItems.push(...res.value);
    }
  });

  // 去重（避免相同文章重複出現在不同 Feed）
  const seenUrls = new Set();
  const seenTitles = new Set();
  const results = [];

  for (const item of rawItems) {
    const normUrl = (item.link || '').toLowerCase().trim();
    const normTitle = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normUrl && seenUrls.has(normUrl)) continue;
    if (normTitle && seenTitles.has(normTitle)) continue;

    if (normUrl) seenUrls.add(normUrl);
    if (normTitle) seenTitles.add(normTitle);
    results.push(item);
  }

  // 若所有來源皆連線失敗，throw 錯誤讓狀態正確呈現為紅燈
  if (results.length === 0) {
    throw new Error('無法連線至任何新聞來源（連線受阻或伺服器逾時）');
  }

  return results;
}
