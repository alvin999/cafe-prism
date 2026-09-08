# 🔮 CaféPrism 稜咖

> **爬蟲爬到腳軟，三層光譜驗證** — AI 驅動的咖啡研究代理人，每個論點都有來源背書。  
> **Deep crawls, three-spectrum verification** — An AI-powered coffee research agent where every claim is backed by credible sources.

[English](#-caféprism-english) | [繁體中文](#-caféprism-稜咖-繁體中文)

---

## 🔮 CaféPrism 稜咖 (繁體中文)

*稜咖（CaféPrism）* 取閩南語「軟腳」諧音，為爬蟲爬到腳軟的意象，以 AI 分析咖啡資訊，折射為**學術 · 新聞 · 社群**三道光譜，呈現咖啡全貌，而非一種顏色。

### 功能 Features

- 🔍 **三層爬取**：學術論文（Semantic Scholar）、產業新知（RSS）、社群討論（Reddit）
- 🛡️ **防幻覺三重鎖**：來源引用鎖定 + 多來源交叉驗證 + 信心分數標示
- 🤖 **多元 LLM 支援**：
  - **雲端 API**：Google Gemini、Groq（推薦免費額度）、OpenAI、Anthropic Claude
  - **本地端**：Ollama 私有化部署
  - **動態同步**：支援全服務商線上即時取得最新模型清單，並防範連線競態
  - **無金鑰預覽**：未填金鑰時亦能完整選取各家官方熱門預設模型
- 🔒 **企業級隱私與主密碼保護**：支援 AES-256-GCM 自訂主密碼加密金鑰，各服務商金鑰獨立儲存，關閉分頁記憶體自動銷毀
- ⚠️ **未儲存變更防護**：即時設定變更偵測、底部懸浮快捷列、側邊欄導航攔截確認及瀏覽器關閉防護
- 📱 **Telegram Bot**：每日推播、即時查詢、關鍵字訂閱
- ⏰ **智慧排程**：每日 / 每週定時自動抓取與跨工作階段補跑
- 🌐 **中英雙語**：介面一鍵即時切換

### 快速開始 Quick Start

```bash
npm install
npm run dev
```

### 部署 Deployment

#### 1. Cloudflare Pages（推薦）
1. Fork 此 repo（建議命名 `cafe-prism`）
2. 連接至 Cloudflare Pages 帳號
3. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **優勢**: 完美支援 `_redirects` 與 Cloudflare Pages Functions 代理，API 功能開箱即用。

#### 2. Vercel / Netlify
- **Build settings**: `npm run build` / `dist`
- **注意**: 這兩個平台也支援重定向功能（Netlify 支援 `_redirects`）。

#### 3. GitHub Pages（不建議）
> ⚠️ **限制**: GitHub Pages 不支援 `_redirects` 伺服器端代理。
- 若佈署至此，學術與社群搜尋功能將因 CORS 限制而失效。
- 需自行修改 `src/lib/api/proxy.js` 以連結外部 Proxy 伺服器。

### 設定 Configuration

所有設定儲存於瀏覽器 `localStorage`，**API 金鑰絕不離開你的裝置**。

#### AI 模型設定
- **各服務商獨立記憶**：Groq、Gemini、OpenAI、Anthropic 各自保存專屬金鑰，切換時自動帶出互不干擾。
- **免金鑰預覽**：未填入金鑰時，下拉選單仍完整提供各家主流官方模型供您選取；填入金鑰後則自動向官方同步最新模型清單。
- **Google Gemini**：至 [Google AI Studio](https://aistudio.google.com/) 申請 API 金鑰
- **Groq**（推薦免費方案）：至 [groq.com](https://groq.com) 申請免費 API key
- **OpenAI / Anthropic**：填入對應平台 API key
- **本地端（Ollama）**：需先啟動 `ollama serve`，預設位址 `http://localhost:11434`

#### 主密碼保護 (Master Password)
- 可於「設定」中自訂主密碼，將所有 API 金鑰以 AES-GCM (256-bit) 加密存放。
- 關閉瀏覽器分頁後記憶體自動銷毀，重新進入需解鎖，杜絕公用電腦金鑰外洩風險。

#### Telegram Bot 設定
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

---

## 🔮 CaféPrism (English)

> **Deep crawls, three-spectrum verification** — An AI-powered coffee research agent where every claim is backed by credible sources.

*CaféPrism (稜咖)* refracts coffee research into three rich spectra: **Academic · Industry News · Community Discussions**, presenting a complete picture of coffee rather than a single perspective.

### Features

- 🔍 **Three-Layer Crawling**: Academic papers (Semantic Scholar), industry news (RSS), and community discussions (Reddit).
- 🛡️ **Triple Anti-Hallucination Lock**: Source citation locking + cross-source verification + confidence score indicators.
- 🤖 **Comprehensive LLM Support**:
  - **Cloud APIs**: Google Gemini, Groq (recommended free tier), OpenAI, Anthropic Claude.
  - **Local Model**: Private on-device deployment via Ollama.
  - **Dynamic Model Sync**: Fetches live official model lists dynamically with connection race-condition guards.
  - **Keyless Previews**: Browse and select popular official default models without having to enter an API key upfront.
- 🔒 **Enterprise-Grade Privacy & Master Password**: Encrypt API keys locally using AES-GCM (256-bit). Provider keys are stored independently and automatically wiped from memory when tabs close.
- ⚠️ **Unsaved Changes Protection**: Real-time dirty-state detection, floating action bar, sidebar navigation guards, and browser close/reload protection.
- 📱 **Telegram Bot**: Daily scheduled push digests, instant topic querying, and keyword subscription.
- ⏰ **Smart Scheduler**: Automated daily/weekly research digests with background catch-up execution across sessions.
- 🌐 **Bilingual (i18n)**: Seamless one-click switching between Traditional Chinese and English.

### Quick Start

```bash
npm install
npm run dev
```

### Deployment

#### 1. Cloudflare Pages (Recommended)
1. Fork this repository (suggested name: `cafe-prism`).
2. Link the repository to your Cloudflare Pages account.
3. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Advantage**: Fully supports `_redirects` and Cloudflare Pages Functions proxies, enabling all APIs out of the box.

#### 2. Vercel / Netlify
- **Build settings**: `npm run build` / `dist`
- **Note**: Both platforms support redirect configurations (Netlify natively supports `_redirects`).

#### 3. GitHub Pages (Not Recommended)
> ⚠️ **Limitation**: GitHub Pages does not support server-side proxy rules via `_redirects`.
- Academic and Reddit search features will fail due to browser CORS restrictions.
- Requires manually configuring an external proxy in `src/lib/api/proxy.js`.

### Configuration

All settings are stored exclusively in your browser's `localStorage`. **Your API keys never leave your machine.**

#### AI Model Settings
- **Per-Provider Memory**: Groq, Gemini, OpenAI, and Anthropic store their API keys independently. Switching providers restores the corresponding key automatically.
- **Keyless Model Preview**: Even without entering an API key, full model dropdowns populated with official models remain selectable. Once an API key is provided, the live model list is dynamically synchronized.
- **Google Gemini**: Get an API key from [Google AI Studio](https://aistudio.google.com/).
- **Groq** (Recommended free tier): Obtain a free API key from [groq.com](https://groq.com).
- **OpenAI / Anthropic**: Enter your platform API key.
- **Local (Ollama)**: Start `ollama serve` first. Default address: `http://localhost:11434`.

#### Master Password Protection
- Set a custom master password in "Settings" to encrypt sensitive API keys with AES-GCM (256-bit).
- In-memory keys are automatically destroyed when the tab is closed. Re-entering requires your password, safeguarding against unauthorized access on shared computers.

#### Telegram Bot Setup
1. Send `/newbot` to `@BotFather` to create a bot and get your Bot Token.
2. Add your bot to your target channel or group.
3. Get Chat ID: Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`.
4. Fill in the Token and Chat ID in Settings, then click "Send test message".

### Three Spectra Architecture

```
Community Discussions (Reddit)     ── Trending topics, practical tips, user discussions
          ↓
Industry News (RSS)                ── Brand announcements, market trends, roasting events
          ↓
Academic Papers (Semantic Scholar) ── Extraction physics, sensory evaluation, bean chemistry
```

CaféPrism crawls all three spectra simultaneously, performing cross-source verification before generating summaries to avoid single-source bias.

### Anti-Hallucination Pipeline

```
Source Crawling → Content Hash → LLM Summary (Strictly constrained to crawled text)
                                       ↓
                          Source Citation Verification (Indexed per sentence)
                                       ↓
                          Cross-Source Consistency Check (Flag conflicts ⚠)
                                       ↓
                          Confidence Score Calculation (High / Medium / Low)
```

- **⚠ Flagging**: The LLM is strictly instructed to flag uncertain claims rather than guessing.
- **Content Hashing**: Every summary card includes a content hash to ensure traceability.
- **Conflict Detection**: Cross-references metrics and data across multiple sources, highlighting inconsistencies.

### Tech Stack

- React 18 + Vite (Pure static client-side architecture, zero dedicated backend)
- Data Sources: Semantic Scholar API, RSS via allorigins, Reddit JSON API
- Storage: localStorage + IndexedDB (History logs)
- Deployment: Cloudflare Pages (with `_redirects` proxy support)

### Name Origin

| Name | Description |
|------|-------------|
| **CaféPrism** | Café + Prism — Light refracting into three distinct information spectra. |
| **稜咖 (Lêng-ka)** | "Prism" + "Coffee". In Taiwanese Hokkien, it sounds like "soft legs / exhausted legs", playfully referencing crawlers that crawl so much their legs give out. |

---

## License

MIT
