// Cloudflare Pages Functions: 動態 RSS / Feed 代理端點
// 當佈署至 Cloudflare Pages 時，此檔案會自動對應至 /api-feed 路由

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
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing "url" query parameter. Example: /api-feed?url=https://example.com/feed.xml' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // SSRF 防護與 URL 合法性校驗
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid URL format' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 僅允許 http 與 https 協議
  if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
    return new Response(
      JSON.stringify({ error: 'Disallowed protocol. Only http: and https: are permitted.' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 阻斷本地迴圈與私有 IP 網段
  const hostname = parsedTarget.hostname.toLowerCase();
  const isPrivateIp = (host) => {
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === '[::1]') return true;
    // 檢查 IPv4 內網網段
    const parts = host.split('.');
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
      const b0 = Number(parts[0]);
      const b1 = Number(parts[1]);
      if (b0 === 127) return true; // 127.0.0.0/8
      if (b0 === 10) return true;  // 10.0.0.0/8
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12
      if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16
      if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 (Link-local / Cloud metadata)
      if (b0 === 0) return true;
    }
    // 檢查 IPv6 私有位址
    if (host.startsWith('[fc') || host.startsWith('[fd') || host.startsWith('[fe80')) return true;
    return false;
  };

  if (isPrivateIp(hostname)) {
    return new Response(
      JSON.stringify({ error: 'Access to private or local network hosts is restricted.' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });

    const contentType = resp.headers.get('content-type') || 'text/xml; charset=utf-8';
    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // 快取 5 分鐘，避免過度頻繁請求目標伺服器
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch feed', message: err.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
