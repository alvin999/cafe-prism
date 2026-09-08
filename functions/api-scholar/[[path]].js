// Cloudflare Pages Functions: Semantic Scholar API 代理端點
// 自動代理所有 /api-scholar/* 請求至 https://api.semanticscholar.org/*

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
  const subPath = url.pathname.replace(/^\/api-scholar/, '');
  const targetUrl = `https://api.semanticscholar.org${subPath}${url.search}`;

  try {
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    const contentType = resp.headers.get('content-type') || 'application/json; charset=utf-8';
    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': resp.ok ? 'public, max-age=600' : 'no-cache', // 成功時快取 10 分鐘，避免 429 限流
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Semantic Scholar API', message: err.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
