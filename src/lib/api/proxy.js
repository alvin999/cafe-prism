// ─── Local API Proxies (Vite/Cloudflare) ───────────────────────────────────
// These paths work in dev (via vite.config.js) and prod (via _redirects)

export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`連線逾時 (${timeoutMs / 1000}s) - 可能遭內網防火牆阻擋或網路不通`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFromProxy(proxyPath, endpoint, asJson = false, timeoutMs = 8000, extraHeaders = {}) {
  const url = `${proxyPath}${endpoint}`;
  const r = await fetchWithTimeout(url, { headers: extraHeaders }, timeoutMs);
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    const cleanDetail = detail ? detail.trim().split('\n')[0] : '';
    throw new Error(cleanDetail ? `${cleanDetail} (HTTP ${r.status})` : `HTTP ${r.status} ${r.statusText || ''}`);
  }
  return asJson ? r.json() : r.text();
}
