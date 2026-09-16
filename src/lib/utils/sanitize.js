/**
 * @file sanitize.js
 * @description 文字與 HTML/XML 標籤清洗、消毒與純文字還原公用函式庫
 */

/**
 * 清除字串中的 HTML/XML 標籤、註解並還原 HTML 實體字元（如 &#39; -> ', &amp; -> &）
 * 適用於 RSS 摘要、社群討論串等夾帶 HTML 標籤的內容過濾
 * 
 * @param {string} rawText 包含 HTML/XML 標籤或實體的原始字串
 * @returns {string} 清洗後的純文字字串
 */
export function sanitizeHtmlText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. 去除 HTML/XML 註解 (例如 <!-- SC_OFF -->, <!-- SC_ON -->)
  let text = rawText.replace(/<!--[\s\S]*?-->/g, '');

  // 2. 利用瀏覽器原生 DOMParser 提取純文字並自動解碼實體
  if (typeof DOMParser !== 'undefined') {
    try {
      // 處理雙重跳脫情況 (例如 &amp;#39; -> &#39;)
      if (/&amp;(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/.test(text)) {
        text = text.replace(/&amp;/g, '&');
      }
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.body.textContent || '';
    } catch {
      // 備援方案：若 DOMParser 異常則使用正規表達式簡易去除
      text = text.replace(/<[^>]+>/g, '');
    }
  } else {
    // 非瀏覽器環境 (Node.js/SSR) 備用處理
    text = text
      .replace(/<[^>]+>/g, '')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');
  }

  // 3. 正規化多餘連續空白與換行，去除前後空白
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * stripHtml 語意別名，與 sanitizeHtmlText 等價
 */
export const stripHtml = sanitizeHtmlText;

/**
 * 檢查並回傳安全的 HTTP/HTTPS 網址，防範 javascript: 偽協議點擊 XSS 攻擊
 * @param {string} url 待驗證網址
 * @param {string} fallback 若不合法時的備援回傳值，預設為 '#'
 * @returns {string} 安全網址
 */
export function safeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}
