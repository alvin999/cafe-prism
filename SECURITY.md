# Security Policy

[繁體中文](#繁體中文) | [English](#english) | [日本語](#日本語)

---

## 繁體中文

### 架構與隱私保護設計

CaféPrism（稜咖）採用純靜態前端搭配 Cloudflare Pages Functions 邊緣代理架構，核心資安設計包含：

- **本地端金鑰保護**：所有 API 金鑰與 Telegram Bot Token 僅儲存於使用者瀏覽器端（支援基於 Web Crypto API 的裝置不可導出金鑰加密，或 PBKDF2 SHA-256 `600,000` 次迭代 + AES-256-GCM 主密碼加密），絕不上傳至開發者伺服器。
- **邊緣代理隔離**：`functions/api-*` 代理端點實施嚴格同源 CORS 檢查（相容 Fork 部署）、HTTP Method 限制、SSRF 防護（阻斷私有 IP 與非標準埠口、手動檢查 302 轉址、限制回應大小與逾時），並禁止透傳 `text/html` 以防範同源反射型 XSS。
- **瀏覽器防線**：透過 `public/_headers` 部署嚴格的 Content-Security-Policy (CSP)、HSTS、`X-Frame-Options: DENY` 與 `X-Content-Type-Options: nosniff`。
- **自動化弱點掃描**：本專案於 GitHub Actions 定期執行 CodeQL、Semgrep、OSV-Scanner、`npm audit`、TruffleHog 機敏資訊掃描與 OWASP ZAP 動態弱點掃描（針對 `https://cafe-prism.pages.dev`）。

### 支援版本

| 版本 / 分支 | 安全性更新支援 |
| :--- | :--- |
| `main` (線上版 `https://cafe-prism.pages.dev`) | ✅ 支援 |
| 舊版 commit / 非官方 Fork | ❌ 不支援 |

### 通報資安漏洞

如果您在本專案或線上服務發現任何資安弱點，**請勿直接公開建立 GitHub Issue**。請透過以下方式私下聯繫，我們將在收到通報後盡快確認並修補：

1. **GitHub Private Vulnerability Reporting**：點擊專案頁面 **Security → Advisories → Report a vulnerability**（建議方式）。
2. 請附上：
   - 漏洞類型與影響範圍（例如 XSS、SSRF、金鑰外洩等）
   - 重現步驟或最小驗證概念（PoC）
   - 預期影響與修補建議（若有）

感謝您協助提升開源社群的資安品質。

---

## English

### Security Architecture & Privacy Design

CaféPrism uses a pure static frontend paired with Cloudflare Pages Functions edge proxies. Core security controls include:

- **Client-Side Key Protection**: All API keys and Telegram Bot Tokens are stored exclusively in the user's browser (protected by non-extractable Web Crypto API device keys or PBKDF2 SHA-256 with `600,000` iterations + AES-256-GCM master password encryption) and are never sent to developer-owned servers.
- **Edge Proxy Isolation**: `functions/api-*` endpoints enforce dynamic same-origin CORS validation (fork-friendly), strict HTTP method restrictions, SSRF protections (blocking private/reserved IPs and non-standard ports, manually validating redirects, and enforcing response size/timeout limits), and block `text/html` pass-through to prevent same-origin reflected XSS.
- **Browser Hardening**: Strict Content-Security-Policy (CSP), HSTS, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff` are enforced via `public/_headers`.
- **Automated Vulnerability Scanning**: GitHub Actions continuously runs CodeQL, Semgrep, OSV-Scanner, `npm audit`, TruffleHog secret scanning, and scheduled OWASP ZAP DAST baseline scans against `https://cafe-prism.pages.dev`.

### Supported Versions

| Version / Branch | Security Updates |
| :--- | :--- |
| `main` (Live: `https://cafe-prism.pages.dev`) | ✅ Supported |
| Older commits / Unofficial forks | ❌ Not supported |

### Reporting a Vulnerability

If you discover a security vulnerability in this repository or the live deployment, **please do not open a public GitHub Issue**. Report it privately so we can investigate and remediate it promptly:

1. **GitHub Private Vulnerability Reporting**: Go to **Security → Advisories → Report a vulnerability** on this repository (recommended).
2. Please include:
   - Vulnerability type and affected scope (e.g., XSS, SSRF, credential exposure)
   - Steps to reproduce or a minimal Proof of Concept (PoC)
   - Potential impact and suggested remediation (if any)

Thank you for helping keep this open-source project and its users safe.

---

## 日本語

### セキュリティアーキテクチャとプライバシー設計

CaféPrism は純粋な静的フロントエンドと Cloudflare Pages Functions によるエッジプロキシ構成を採用しており、以下のセキュリティ対策を実装しています：

- **クライアント側での鍵保護**：すべての API キーおよび Telegram Bot Token はユーザーのブラウザ内にのみ保存され（Web Crypto API によるエクスポート不可のデバイス鍵暗号化、または PBKDF2 SHA-256 `600,000` 回反復 + AES-256-GCM マスターパスワード暗号化に対応）、開発者側のサーバーへ送信されることはありません。
- **エッジプロキシの分離**：`functions/api-*` エンドポイントは、動的同一オリジン CORS 検証（Fork デプロイ互換）、厳格な HTTP メソッド制限、SSRF 防御（プライベート IP・非標準ポートの遮断、リダイレクトの手動検証、レスポンスサイズとタイムアウトの制限）を実施し、同一オリジン反射型 XSS を防ぐため `text/html` の透過を禁止しています。
- **ブラウザ防御ヘッダー**：`public/_headers` を通じて厳格な Content-Security-Policy (CSP)、HSTS、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff` を適用しています。
- **自動脆弱性スキャン**：GitHub Actions により、CodeQL、Semgrep、OSV-Scanner、`npm audit`、TruffleHog 機密情報スキャン、および `https://cafe-prism.pages.dev` を対象とした定期的な OWASP ZAP 動的脆弱性スキャン（DAST）を実行しています。

### サポート対象バージョン

| バージョン / ブランチ | セキュリティアップデート |
| :--- | :--- |
| `main` (本番環境 `https://cafe-prism.pages.dev`) | ✅ サポート対象 |
| 過去のコミット / 非公式 Fork | ❌ サポート対象外 |

### 脆弱性の報告方法

本プロジェクトまたは公開環境でセキュリティ上の脆弱性を発見された場合は、**公開の GitHub Issue は作成せず**、以下の方法で非公開にてご連絡ください：

1. **GitHub Private Vulnerability Reporting**：リポジトリの **Security → Advisories → Report a vulnerability** からご報告ください（推奨）。
2. ご連絡の際は以下の情報をご記載ください：
   - 脆弱性の種類と影響範囲（XSS、SSRF、認証情報の漏洩など）
   - 再現手順または最小限の概念実証（PoC）
   - 想定される影響と修正案（ある場合）

オープンソースコミュニティの安全性向上へのご協力に感謝いたします。
