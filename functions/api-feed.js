// Cloudflare Pages Functions: 動態 RSS / Feed 代理端點
// 當佈署至 Cloudflare Pages 時，此檔案會自動對應至 /api-feed 路由

import {
  guardProxyRequest,
  validateExternalUrl,
  safeFetchExternal,
} from './_lib/security.js';

export async function onRequest(context) {
  const { request } = context;

  const { blocked, corsHeaders } = guardProxyRequest(context);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing "url" query parameter. Example: /api-feed?url=https://example.com/feed.xml' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
      }
    );
  }

  // SSRF 嚴格防護與 URL 合法性校驗
  const validation = validateExternalUrl(targetUrl);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      {
        status: validation.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
      }
    );
  }

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)',
    'Mozilla/5.0 (compatible; CafePrismBot/1.0; +https://cafe-prism.pages.dev)',
  ];

  let lastStatus = 502;
  let lastError = 'Failed to fetch valid feed content';

  for (const ua of userAgents) {
    try {
      const { resp, body } = await safeFetchExternal(validation.url, {
        method: 'GET',
        headers: {
          'User-Agent': ua,
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      lastStatus = resp.status;

      // 若回傳內容為真正的 RSS/Atom XML 內容，立即返回（強制以 application/xml 輸出，絕不透傳 text/html）
      if (resp.ok && (body.includes('<item') || body.includes('<entry') || body.includes('<rss'))) {
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300', // 快取 5 分鐘，避免過度頻繁請求目標伺服器
            ...corsHeaders,
          },
        });
      }

      lastError = `Upstream returned non-feed response (HTTP ${resp.status})`;
    } catch (err) {
      if (err.status) lastStatus = err.status;
      lastError = err.name === 'AbortError' ? 'Upstream request timeout' : (err.message || 'Fetch failed');
      if (err.status === 400 || err.status === 403) break;
    }
  }

  // 錯誤時一律回傳純 JSON，絕不將上游 HTML 透傳回同源網域（防範反射型 XSS）
  return new Response(
    JSON.stringify({ error: lastError }),
    {
      status: lastStatus >= 400 ? lastStatus : 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...corsHeaders,
      },
    }
  );
}
