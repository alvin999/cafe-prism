// Cloudflare Pages Functions: Reddit API 代理端點
// 自動代理所有 /api-reddit/* 請求至 https://www.reddit.com/*

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
  const subPath = url.pathname.replace(/^\/api-reddit/, '');
  const hosts = ['https://www.reddit.com', 'https://old.reddit.com'];
  const userAgent = 'web:cafe-prism:v1.0 (by /u/cafeprism)';

  let lastStatus = 502;
  let lastContentType = 'application/json; charset=utf-8';
  let lastBody = '';

  try {
    for (const host of hosts) {
      const targetUrl = `${host}${subPath}${url.search}`;
      const resp = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json, text/plain, */*',
        },
      });

      lastStatus = resp.status;
      lastContentType = resp.headers.get('content-type') || 'application/json; charset=utf-8';
      lastBody = await resp.text();

      if (resp.ok) {
        return new Response(lastBody, {
          status: resp.status,
          headers: {
            'Content-Type': lastContentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=180', // 成功時快取 3 分鐘
          },
        });
      }
    }

    return new Response(lastBody, {
      status: lastStatus,
      headers: {
        'Content-Type': lastContentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Reddit API', message: err.message }),
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
