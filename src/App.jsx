import { useState, createContext, useContext, useEffect } from 'react';
import { translations } from './i18n/translations.js';
import { Storage } from './lib/engine.js';
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

  useEffect(() => {
    const s = Storage.getSettings();
    Storage.saveSettings({ ...s, language: lang });
  }, [lang]);

  const pages = { dashboard: Dashboard, settings: Settings, schedule: Schedule, history: History };
  const PageComponent = pages[page];

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      <div style={{
        minHeight: '100vh',
        background: '#0d0d0b',
        color: '#e8e4d8',
        fontFamily: '"Instrument Sans", "Noto Sans TC", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '0 24px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(13,13,11,0.92)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔮</span>
            <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em', color: '#f0ead8' }}>
              CaféPrism
            </span>
            <span style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '20px',
              background: 'rgba(180,140,80,0.15)',
              color: '#b49050',
              border: '1px solid rgba(180,140,80,0.25)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>Beta</span>
          </div>

          {/* Lang toggle */}
          <button
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#b0a890',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.03em',
            }}
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </header>

        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar */}
          <nav style={{
            width: '200px',
            flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.07)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            position: 'sticky',
            top: '52px',
            height: 'calc(100vh - 52px)',
          }}>
            {Object.keys(pages).map(key => (
              <button
                key={key}
                onClick={() => setPage(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: page === key ? 'rgba(180,140,80,0.12)' : 'transparent',
                  color: page === key ? '#c8a660' : '#888070',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: page === key ? 500 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  width: '100%',
                }}
              >
                <span style={{ color: page === key ? '#c8a660' : '#666050' }}>{NAV_ICONS[key]}</span>
                {t.nav[key]}
              </button>
            ))}

            <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', color: '#504838', lineHeight: 1.5, margin: 0 }}>
                {lang === 'zh' ? '金鑰僅存於本機\n絕不上傳至伺服器' : 'Keys stored locally\nNever sent to servers'}
              </p>
            </div>
          </nav>

          {/* Main content */}
          <main style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
            <PageComponent />
          </main>
        </div>
      </div>
    </LangContext.Provider>
  );
}
