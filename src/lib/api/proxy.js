// ─── Local API Proxies (Vite/Cloudflare) ───────────────────────────────────
// These paths work in dev (via vite.config.js) and prod (via _redirects)

export async function fetchFromProxy(proxyPath, endpoint, asJson = false) {
  const url = `${proxyPath}${endpoint}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
  return asJson ? r.json() : r.text();
}
