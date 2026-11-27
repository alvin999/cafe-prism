// Cloudflare Pages Functions: Daily Coffee News RSS 代理端點
// 自動代理所有 /api-dcn/* 請求至 https://dailycoffeenews.com/*

import {
  guardProxyRequest,
  sanitizeSubPath,
  safeFetchExternal,
  sanitizeContentType,
} from '../_lib/security.js';

export async function onRequest(context) {
  const { request } = context;

  const { blocked, corsHeaders } = guardProxyRequest(context);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const subPath = sanitizeSubPath(url.pathname, /^\/api-dcn/);
  if (subPath === null) {
    return new Response(
      JSON.stringify({ error: 'Invalid request path' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders } }
    );
  }

  const targetUrl = `https://dailycoffeenews.com${subPath}${url.search}`;

  try {
    const { resp, body } = await safeFetchExternal(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });

    const contentType = sanitizeContentType(resp.headers.get('content-type'), 'application/xml; charset=utf-8');

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': resp.ok ? 'public, max-age=600' : 'no-cache', // 成功時快取 10 分鐘
        ...corsHeaders,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Daily Coffee News feed', message: err.message }),
      {
        status: err.status || 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
      }
    );
  }
}
