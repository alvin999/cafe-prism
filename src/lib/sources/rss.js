// ─── RSS parser ─────────────────────────────────────────────────────────────
export function parseRSS(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item, entry'));
  return items.slice(0, 8).map(item => ({
    title: item.querySelector('title')?.textContent?.trim() || '',
    link: item.querySelector('link')?.textContent?.trim() ||
          item.querySelector('link')?.getAttribute('href') || '',
    description: item.querySelector('description, summary, content')?.textContent?.trim() || '',
    pubDate: item.querySelector('pubDate, published, updated')?.textContent?.trim() || '',
    source: 'rss',
  }));
}

export async function fetchCoffeeRSS(keywords, discoveryMode = false) {
  const feeds = [
    'https://www.scaa.org/feed/',
    'https://perfectdailygrind.com/feed/',
    'https://sprudge.com/feed',
    'https://www.freshcup.com/feed/',
    'https://coffeegeek.com/feed/',
  ];
  const results = [];
  for (const feed of feeds) {
    try {
      const feedUrl = encodeURIComponent(feed);
      const xml = await fetch(`https://api.codetabs.com/v1/proxy?quest=${feedUrl}`).then(res => res.text());
      const items = parseRSS(xml);
      
      let filtered = items;
      if (!discoveryMode && keywords.length > 0) {
        const kw = keywords.map(k => k.toLowerCase());
        filtered = items.filter(item =>
          kw.some(k => item.title.toLowerCase().includes(k) || item.description.toLowerCase().includes(k))
        );
      }
      results.push(...filtered.map(i => ({ ...i, feedUrl: feed })));
    } catch { /* ignore feed errors */ }
  }
  return results;
}
