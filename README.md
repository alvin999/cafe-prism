# 🔮 CaféPrism 稜咖

> **爬蟲爬到腳軟，三層光譜驗證** — AI 驅動的咖啡研究代理人，每個論點都有來源背書。

*稜咖（CaféPrism）* 取閩南語「軟腳」諧音，以爬蟲爬到腳軟的意象，將咖啡資訊折射為**學術 · 新聞 · 社群**三道光譜，呈現咖啡全貌，而非一種顏色。

## 功能 Features

- 🔍 **三層爬取**：學術論文（Semantic Scholar）、產業新知（RSS）、社群討論（Reddit）
- 🛡️ **防幻覺三重鎖**：來源引用鎖定 + 多來源交叉驗證 + 信心分數標示
- 🤖 **LLM 彈性接入**：本地 Ollama 或雲端（OpenAI / Anthropic / Groq）
- 📱 **Telegram Bot**：每日推播、即時查詢、關鍵字訂閱
- ⏰ **排程執行**：每日 / 每週自動抓取
- 🌐 **中英雙語**：一鍵切換

## 快速開始 Quick Start

```bash
npm install
npm run dev
```

## 部署 Deployment

### 1. Cloudflare Pages（推薦）
1. Fork 此 repo（建議命名 `cafe-prism`）
2. 連接至 Cloudflare Pages 帳號
3. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **優勢**: 完美支援 `_redirects` 代理，API 功能開箱即用。

### 2. Vercel / Netlify
- **Build settings**: `npm run build` / `dist`
- **注意**: 這兩個平台也支援重定向功能（Netlify 支援 `_redirects`）。

### 3. GitHub Pages（不建議）
> ⚠️ **限制**: GitHub Pages 不支援 `_redirects` 伺服器端代理。
- 若佈署至此，學術與社群搜尋功能將因 CORS 限制而失效。
- 需自行修改 `src/lib/api/proxy.js` 以連結外部 Proxy 伺服器。

## 設定 Configuration

所有設定儲存於瀏覽器 `localStorage`，**API 金鑰絕不離開你的裝置**。

### 模型設定
- **本地（Ollama）**：需先啟動 `ollama serve`，預設 `http://localhost:11434`
- **Groq**（推薦免費方案）：[groq.com](https://groq.com) 申請免費 API key
- **OpenAI / Anthropic**：填入對應 API key

### Telegram Bot 設定
1. 向 `@BotFather` 發送 `/newbot`，取得 Bot Token
2. 將 bot 加入你的頻道或群組
3. 取得 Chat ID：訪問 `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. 在設定頁面填入 Token 和 Chat ID，點擊「發送測試訊息」

## 三層光譜說明 Three Spectra

```
社群討論（Reddit）   ── 熱門話題、實戰心得、使用者回饋
       ↓
產業新知（RSS）      ── 品牌動態、市場趨勢、烘焙賽事
       ↓
學術論文（Semantic Scholar） ── 萃取科學、成分研究、感官評估
```

CaféPrism 同時爬取三層，交叉比對後才產出摘要，避免單一視角的偏差。

## 防幻覺機制 Anti-Hallucination

```
來源爬取 → 原文 Hash → LLM 摘要（限制只能引用原文）
                              ↓
                    來源引用驗證（每句附來源編號）
                              ↓
                    跨來源一致性比對（衝突標記 ⚠）
                              ↓
                    信心分數計算（高 / 中 / 低）
```

- **⚠ 標記**：LLM 被要求在不確定時主動標記，而非硬猜
- **Hash 存證**：每張卡片附內容 hash，確保摘要可追溯
- **衝突偵測**：自動比對多來源數值，發現矛盾時警示

## 技術棧 Tech Stack

- React 18 + Vite（純靜態，無後端）
- 資料來源：Semantic Scholar API、RSS via allorigins、Reddit JSON API
- 儲存：localStorage + IndexedDB（歷史記錄）
- 部署：推薦 Cloudflare Pages (支援 _redirects Proxy)

## 名稱由來

| 名稱 | 說明 |
|------|------|
| **CaféPrism** | Café（咖啡館）+ Prism（稜鏡），光譜折射出三層資訊 |
| **稜咖** | 「稜鏡」+「咖啡」，閩南語諧音暗藏「軟腳」趣味 — 爬蟲爬到腳軟 |

## License

MIT
