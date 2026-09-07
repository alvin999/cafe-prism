import { fetchWithTimeout } from '../api/proxy.js';

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
  // 1. 優先使用本機 Vite feed proxy（零 CORS 問題、零依賴外部 proxy）
  try {
    const res = await fetchWithTimeout(`/api-feed?url=${encodeURIComponent(url)}`, {}, 6000);
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
    // Vite proxy 不在（例如靜態發布模式），切換備援
  }

  // 2. 備援：使用 allorigins proxy
  try {
    const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {}, 6000);
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    lastErr = err;
  }

  throw lastErr || new Error(`無法連線至新聞來源: ${url}`);
}

export async function fetchCoffeeRSS(keywords, discoveryMode = false) {
  const feeds = [
    'https://news.google.com/rss/search?q=specialty+coffee+espresso+brewing&hl=en-US&gl=US&ceid=US:en',
    'https://perfectdailygrind.com/feed/',
    'https://sprudge.com/feed',
    'https://www.freshcup.com/feed/',
  ];

  const results = [];
  for (const feed of feeds) {
    try {
      const xml = await fetchFeedContent(feed);
      const items = parseRSS(xml);

      let filtered = items;
      if (!discoveryMode && keywords.length > 0) {
        const kw = keywords.map(k => k.toLowerCase());
        filtered = items.filter(item =>
          kw.some(k => item.title.toLowerCase().includes(k) || item.description.toLowerCase().includes(k))
        );
      }

      // 若過濾後無結果，但原 items 有資料且處於關鍵字模式，保留前 3 篇相關度較高者避免空列表
      if (filtered.length === 0 && items.length > 0) {
        filtered = items.slice(0, 3);
      }

      results.push(...filtered.map(i => ({ ...i, feedUrl: feed })));
      if (results.length >= 12) break; // 取得足夠資料即停止
    } catch {
      // 忽略單一來源錯誤
    }
  }

  return results;
}
