import { useState, createContext, useContext, useEffect } from 'react';
import { translations } from './i18n/translations.js';
import { Storage } from './lib/engine.js';
import { useGlobalScheduler } from './hooks/useGlobalScheduler.js';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import Schedule from './pages/Schedule.jsx';
import History from './pages/History.jsx';

export const LangContext = createContext({ lang: 'zh', t: translations.zh, setLang: () => { } });
export const useLang = () => useContext(LangContext);

const NAV_ICONS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  schedule: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 9v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8a6 6 0 1 0 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function App() {
  const [lang, setLang] = useState(() => Storage.getSettings().language || 'zh');
  const [page, setPage] = useState('dashboard');
  const t = translations[lang];

  // 全域輕量排程生命週期管理
  const schedulerStatus = useGlobalScheduler();

  useEffect(() => {
    const s = Storage.getSettings();
    Storage.saveSettings({ ...s, language: lang });
  }, [lang]);

  const pages = { dashboard: Dashboard, settings: Settings, schedule: Schedule, history: History };
  const PageComponent = pages[page];

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      <div className="prism-app">
        {/* Top bar */}
        <header className="prism-header">
          <div className="prism-header-brand">
            <span style={{ fontSize: '20px' }}>🔮</span>
            <span className="prism-header-title">CaféPrism</span>
            <span className="prism-header-badge">Beta</span>
            {schedulerStatus.running && (
              <span className="prism-badge prism-badge-amber animate-pulse" style={{ fontSize: '11px', marginLeft: '6px' }}>
                <span className="animate-spin">⟳</span>
                {schedulerStatus.isCatchUp ? (lang === 'zh' ? '背景補跑中…' : 'Catching up…') : (lang === 'zh' ? '排程執行中…' : 'Scheduled run…')}
              </span>
            )}
          </div>

          {/* Lang toggle */}
          <button
            className="prism-btn prism-btn-ghost prism-btn-sm"
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </header>

        <div className="prism-body">
          {/* Sidebar */}
          <nav className="prism-sidebar">
            {Object.keys(pages).map(key => (
              <button
                key={key}
                data-nav={key}
                onClick={() => setPage(key)}
                className={`prism-nav-btn ${page === key ? 'is-active' : ''}`}
              >
                <span className="prism-nav-btn-icon">{NAV_ICONS[key]}</span>
                {t.nav[key]}
              </button>
            ))}

            <div className="prism-sidebar-footer">
              <p className="prism-sidebar-footer-text">
                {lang === 'zh' ? '金鑰僅存於本機\n絕不上傳至伺服器' : 'Keys stored locally\nNever sent to servers'}
              </p>
            </div>
          </nav>

          {/* Main content */}
          <main className="prism-main">
            <PageComponent />
          </main>
        </div>

        {/* Global Toast */}
        {schedulerStatus.toastMessage && (
          <div className="prism-toast">
            <span>✨</span>
            <span>{schedulerStatus.toastMessage}</span>
          </div>
        )}
      </div>
    </LangContext.Provider>
  );
}
