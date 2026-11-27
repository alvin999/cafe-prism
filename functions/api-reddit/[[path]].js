// Cloudflare Pages Functions: Reddit API 代理端點
// 自動代理所有 /api-reddit/* 請求至 https://www.reddit.com/*

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
  const subPath = sanitizeSubPath(url.pathname, /^\/api-reddit/);
  if (subPath === null) {
    return new Response(
      JSON.stringify({ error: 'Invalid request path' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders } }
    );
  }

  const hosts = ['https://www.reddit.com', 'https://old.reddit.com'];
  const userAgent = 'web:cafe-prism:v1.0 (by /u/cafeprism)';

  let lastStatus = 502;
  let lastContentType = 'application/json; charset=utf-8';
  let lastBody = '';

  try {
    for (const host of hosts) {
      const targetUrl = `${host}${subPath}${url.search}`;
      const { resp, body } = await safeFetchExternal(targetUrl, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json, text/plain, */*',
        },
      });

      lastStatus = resp.status;
      lastContentType = sanitizeContentType(
        resp.headers.get('content-type'),
        'application/json; charset=utf-8'
      );
      lastBody = body;

      if (resp.ok) {
        return new Response(lastBody, {
          status: resp.status,
          headers: {
            'Content-Type': lastContentType,
            'Cache-Control': 'public, max-age=180', // 成功時快取 3 分鐘
            ...corsHeaders,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Upstream Reddit API error', status: lastStatus }),
      {
        status: lastStatus,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders,
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Reddit API', message: err.message }),
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
