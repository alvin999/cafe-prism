// Cloudflare Pages Functions: Google News RSS 代理端點
// 自動代理所有 /api-news/* 請求至 https://news.google.com/*

export async function onRequest(context) {
  const { request } = context;

  // 處理 CORS Preflight (OPTIONS) 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);
  const subPath = url.pathname.replace(/^\/api-news/, '');
  const targetUrl = `https://news.google.com${subPath}${url.search}`;

  // 備選 User-Agent 清單：若標準瀏覽器被 Google 機房判定導向至 consent.google.com，自動退回 FeedFetcher 標頭
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ];

  let lastStatus = 502;
  let lastBody = '';
  let lastContentType = 'text/xml; charset=utf-8';

  for (const ua of userAgents) {
    try {
      const resp = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': ua,
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      lastStatus = resp.status;
      lastContentType = resp.headers.get('content-type') || 'text/xml; charset=utf-8';
      lastBody = await resp.text();

      // 確認回傳內容為真正的 RSS / Atom XML 格式（非 Google Consent HTML 隱私授權頁）
      if (resp.ok && (lastBody.includes('<item') || lastBody.includes('<entry') || lastBody.includes('<rss'))) {
        return new Response(lastBody, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300', // 快取 5 分鐘，避免觸發 Google 頻率限制
          },
        });
      }
    } catch (err) {
      lastBody = err.message;
    }
  }

  // 若多次嘗試仍為非 XML 內容，回傳最後的回應內容
  return new Response(lastBody || 'Failed to fetch valid RSS feed from Google News', {
    status: lastStatus >= 400 ? lastStatus : 502,
    headers: {
      'Content-Type': lastContentType,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
