# 🔮 CaféPrism 稜咖

> **爬蟲爬到腳軟，三層光譜驗證** — AI 驅動的咖啡研究代理人，每個論點都有來源背書。

*稜咖（CaféPrism）* 取閩南語「軟腳」諧音，以爬蟲爬到腳軟的意象，將咖啡資訊折射為**學術 · 新聞 · 社群**三道光譜，呈現咖啡全貌，而非一種顏色。

## 功能 Features

- 🔍 **三層爬取**：學術論文（Semantic Scholar）、產業新知（RSS）、社群討論（Reddit）
- 🛡️ **防幻覺三重鎖**：來源引用鎖定 + 多來源交叉驗證 + 信心分數標示
- 🤖 **多元 LLM 支援**：
  - **雲端 API**：Google Gemini、Groq（推薦免費額度）、OpenAI、Anthropic Claude
  - **本地端**：Ollama 私有化部署
  - **動態同步**：支援全服務商線上即時取得最新模型清單，並防範連線競態
  - **無金鑰預覽**：未填金鑰時亦能完整選取各家官方熱門預設模型
- 🔒 **企業級隱私與主密碼保護**：支援 AES-256-GCM 自訂主密碼加密金鑰，各服務商金鑰獨立儲存，關閉分頁記憶體自動銷毀
- 📱 **Telegram Bot**：每日推播、即時查詢、關鍵字訂閱
- ⏰ **智慧排程**：每日 / 每週定時自動抓取與跨工作階段補跑
- 🌐 **中英雙語**：介面一鍵即時切換

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
4. **優勢**: 完美支援 `_redirects` 與 Cloudflare Pages Functions 代理，API 功能開箱即用。

### 2. Vercel / Netlify
- **Build settings**: `npm run build` / `dist`
- **注意**: 這兩個平台也支援重定向功能（Netlify 支援 `_redirects`）。

### 3. GitHub Pages（不建議）
> ⚠️ **限制**: GitHub Pages 不支援 `_redirects` 伺服器端代理。
- 若佈署至此，學術與社群搜尋功能將因 CORS 限制而失效。
- 需自行修改 `src/lib/api/proxy.js` 以連結外部 Proxy 伺服器。

## 設定 Configuration

所有設定儲存於瀏覽器 `localStorage`，**API 金鑰絕不離開你的裝置**。

### AI 模型設定
- **各服務商獨立記憶**：Groq、Gemini、OpenAI、Anthropic 各自保存專屬金鑰，切換時自動帶出互不干擾。
- **免金鑰預覽**：未填入金鑰時，下拉選單仍完整提供各家主流官方模型供您選取；填入金鑰後則自動向官方同步最新模型清單。
- **Google Gemini**：至 [Google AI Studio](https://aistudio.google.com/) 申請 API 金鑰
- **Groq**（推薦免費方案）：至 [groq.com](https://groq.com) 申請免費 API key
- **OpenAI / Anthropic**：填入對應平台 API key
- **本地端（Ollama）**：需先啟動 `ollama serve`，預設位址 `http://localhost:11434`

### 主密碼保護 (Master Password)
- 可於「設定」中自訂主密碼，將所有 API 金鑰以 AES-GCM (256-bit) 加密存放。
- 關閉瀏覽器分頁後記憶體自動銷毀，重新進入需解鎖，杜絕公用電腦金鑰外洩風險。

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
