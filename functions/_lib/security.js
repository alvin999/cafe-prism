/**
 * Cloudflare Pages Functions 共用資安防禦模組
 * 提供：動態同源 CORS 檢查（相容 Fork 部署）、HTTP Method 限制、
 * 嚴格 SSRF 防護（含手動 302 追蹤）、回應大小與逾時控制、以及防反射型 XSS 標頭。
 */

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const DANGEROUS_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
];

export const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};

/**
 * 判斷來源是否允許進行 CORS 存取：
 * 1. 與目前伺服器同源（自動支援所有 Fork 部署的 *.pages.dev）
 * 2. 本地開發環境 (localhost / 127.0.0.1)
 * 3. 環境變數 ALLOWED_ORIGINS 明確指定之網域
 */
export function resolveAllowedOrigin(request, env = {}) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;

  try {
    const reqUrl = new URL(request.url);
    const originUrl = new URL(origin);

    if (originUrl.origin === reqUrl.origin) {
      return originUrl.origin;
    }

    if (
      (originUrl.protocol === 'http:' || originUrl.protocol === 'https:') &&
      (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1')
    ) {
      return originUrl.origin;
    }

    if (typeof env?.ALLOWED_ORIGINS === 'string' && env.ALLOWED_ORIGINS.trim()) {
      const allowList = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
      if (allowList.includes(originUrl.origin)) {
        return originUrl.origin;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * 檢查請求來源與 HTTP 方法是否合法
 * 若不合法回傳 Response，合法則回傳 { corsHeaders }
 */
export function guardProxyRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const allowedOrigin = resolveAllowedOrigin(request, env);

  const corsHeaders = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
    ...BASE_SECURITY_HEADERS,
  };

  if (allowedOrigin) {
    corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  // 若瀏覽器帶入 Origin 但不在允許清單內，直接阻斷
  if (origin && !allowedOrigin) {
    return {
      blocked: new Response(JSON.stringify({ error: 'CORS origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...BASE_SECURITY_HEADERS },
      }),
    };
  }

  // 若無 Origin，阻斷明確來自跨站的瀏覽器請求 (Sec-Fetch-Site: cross-site)
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (!origin && fetchSite === 'cross-site') {
    return {
      blocked: new Response(JSON.stringify({ error: 'Cross-site request blocked' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...BASE_SECURITY_HEADERS },
      }),
    };
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return {
      blocked: new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
      }),
    };
  }

  if (request.method === 'OPTIONS') {
    return {
      blocked: new Response(null, {
        status: 204,
        headers: corsHeaders,
      }),
    };
  }

  return { blocked: null, corsHeaders };
}

/**
 * 清理並驗證子路徑，防範路徑遍歷與協定覆寫攻擊
 */
export function sanitizeSubPath(pathname, prefix) {
  const subPath = pathname.replace(prefix, '');
  if (
    subPath.includes('..') ||
    subPath.includes('\\') ||
    subPath.startsWith('//') ||
    subPath.includes('@') ||
    /[\x00-\x1f\x7f]/.test(subPath)
  ) {
    return null;
  }
  return subPath;
}

function isPrivateOrReservedIPv4(octets) {
  const [b0, b1] = octets;
  if (b0 === 0) return true; // 0.0.0.0/8
  if (b0 === 10) return true; // 10.0.0.0/8
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // 100.64.0.0/10 CGNAT
  if (b0 === 127) return true; // 127.0.0.0/8 Loopback
  if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 Link-local / Cloud Metadata
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12
  if (b0 === 192 && b1 === 0 && octets[2] === 0) return true; // 192.0.0.0/24
  if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true; // 198.18.0.0/15 Benchmark
  if (b0 >= 224) return true; // Multicast / Reserved
  return false;
}

/**
 * 檢查主機名稱是否為私有位址、內網網域或異常 IP 表示法
 */
export function isRestrictedHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa') ||
    !host.includes('.') && !host.includes(':')
  ) {
    return true;
  }

  // 阻擋純整數或十六進位 IP 混淆（如 2130706433, 0x7f000001）
  if (/^(0x[0-9a-f]+|\d+|0[0-7]+)$/i.test(host)) {
    return true;
  }

  // 標準 IPv4 檢查
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const octets = parts.map(Number);
    if (octets.some((n) => n < 0 || n > 255)) return true;
    return isPrivateOrReservedIPv4(octets);
  }

  // IPv6 檢查（含 IPv4-mapped IPv6 如 ::ffff:127.0.0.1 或 ::ffff:7f00:1）
  if (host.includes(':')) {
    if (host === '::' || host === '::1') return true;
    if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
    if (host.includes('::ffff:')) {
      const mapped = host.split('::ffff:')[1];
      if (mapped) return isRestrictedHost(mapped);
    }
    // 其他未明列的非公網 IPv6 一律嚴格阻擋
    if (!/^[23][0-9a-f]{0,3}:/i.test(host)) {
      return true;
    }
  }

  return false;
}

/**
 * 驗證外部 URL 合法性與 SSRF 安全邊界
 */
export function validateExternalUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format', status: 400 };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Disallowed protocol. Only http: and https: are permitted.', status: 400 };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'Credentials in URL are not permitted.', status: 400 };
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { valid: false, error: 'Non-standard ports are not permitted.', status: 403 };
  }

  if (isRestrictedHost(parsed.hostname)) {
    return { valid: false, error: 'Access to private or local network hosts is restricted.', status: 403 };
  }

  return { valid: true, url: parsed.toString() };
}

/**
 * 安全讀取 Response Body，並強制限制最大位元組數以防止記憶體耗盡
 */
export async function readBodyWithLimit(response, maxBytes = DEFAULT_MAX_BYTES) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    throw new Error(`Response exceeds maximum allowed size (${maxBytes} bytes)`);
  }

  if (!response.body) {
    return await response.text();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`Response exceeds maximum allowed size (${maxBytes} bytes)`);
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

/**
 * 執行具備 SSRF 防護、手動轉址校驗、逾時與大小上限的 fetch
 */
export async function safeFetchExternal(initialUrl, options = {}, config = {}) {
  const {
    maxRedirects = MAX_REDIRECTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
  } = config;

  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = validateExternalUrl(currentUrl);
    if (!check.valid) {
      const err = new Error(check.error);
      err.status = check.status;
      throw err;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(check.url, {
        ...options,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get('location');
        if (!location) {
          throw new Error('Redirect response missing Location header');
        }
        currentUrl = new URL(location, check.url).toString();
        continue;
      }

      const body = await readBodyWithLimit(resp, maxBytes);
      return { resp, body };
    } finally {
      clearTimeout(timer);
    }
  }

  const err = new Error('Too many redirects');
  err.status = 502;
  throw err;
}

/**
 * 過濾危險 Content-Type（如 text/html、image/svg+xml），防範同源反射型 XSS
 */
export function sanitizeContentType(rawType, fallback = 'text/plain; charset=utf-8') {
  const normalized = (rawType || '').toLowerCase().split(';')[0].trim();
  if (!normalized || DANGEROUS_CONTENT_TYPES.includes(normalized)) {
    return fallback;
  }
  return rawType;
}
