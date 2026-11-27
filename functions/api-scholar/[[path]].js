// Cloudflare Pages Functions: Semantic Scholar API 代理端點
// 自動代理所有 /api-scholar/* 請求至 https://api.semanticscholar.org/*

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
  const subPath = sanitizeSubPath(url.pathname, /^\/api-scholar/);
  if (subPath === null) {
    return new Response(
      JSON.stringify({ error: 'Invalid request path' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders } }
    );
  }

  const targetUrl = `https://api.semanticscholar.org${subPath}${url.search}`;

  try {
    const targetHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    };
    const incomingApiKey = request.headers.get('x-api-key');
    if (incomingApiKey) {
      targetHeaders['x-api-key'] = incomingApiKey;
    }

    const { resp, body } = await safeFetchExternal(targetUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: targetHeaders,
    });

    const contentType = sanitizeContentType(
      resp.headers.get('content-type'),
      'application/json; charset=utf-8'
    );

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': resp.ok ? 'public, max-age=600' : 'no-cache', // 成功時快取 10 分鐘，避免 429 限流
        ...corsHeaders,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Semantic Scholar API', message: err.message }),
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
