// Cloudflare Pages Functions: Google News RSS 代理端點
// 自動代理所有 /api-news/* 請求至 https://news.google.com/*

import {
  guardProxyRequest,
  sanitizeSubPath,
  safeFetchExternal,
} from '../_lib/security.js';

export async function onRequest(context) {
  const { request } = context;

  const { blocked, corsHeaders } = guardProxyRequest(context);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const subPath = sanitizeSubPath(url.pathname, /^\/api-news/);
  if (subPath === null) {
    return new Response(
      JSON.stringify({ error: 'Invalid request path' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders } }
    );
  }

  const targetUrl = `https://news.google.com${subPath}${url.search}`;

  // 備選 User-Agent 清單：若標準瀏覽器被 Google 機房判定導向至 consent.google.com，自動退回 FeedFetcher 標頭
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ];

  let lastStatus = 502;
  let lastError = 'Failed to fetch valid RSS feed from Google News';

  for (const ua of userAgents) {
    try {
      const { resp, body } = await safeFetchExternal(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': ua,
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      lastStatus = resp.status;

      // 確認回傳內容為真正的 RSS / Atom XML 格式（非 Google Consent HTML 隱私授權頁）
      if (resp.ok && (body.includes('<item') || body.includes('<entry') || body.includes('<rss'))) {
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300', // 快取 5 分鐘，避免觸發 Google 頻率限制
            ...corsHeaders,
          },
        });
      }

      lastError = `Google News returned non-RSS response (HTTP ${resp.status})`;
    } catch (err) {
      if (err.status) lastStatus = err.status;
      lastError = err.message || 'Fetch failed';
    }
  }

  // 若多次嘗試仍為非 XML 內容，回傳純 JSON 錯誤（絕不透傳 HTML）
  return new Response(JSON.stringify({ error: lastError }), {
    status: lastStatus >= 400 ? lastStatus : 502,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
      ...corsHeaders,
    },
  });
}
