import { useState, createContext, useContext, useEffect, useRef, lazy, Suspense } from 'react';
import { translations } from './i18n/translations.js';
import { Storage } from './lib/engine.js';
import { useGlobalScheduler } from './hooks/useGlobalScheduler.js';
import Dashboard from './pages/Dashboard.jsx';
import UnsavedModal from './components/UnsavedModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const Settings = lazy(() => import('./pages/Settings.jsx'));
const Schedule = lazy(() => import('./pages/Schedule.jsx'));
const History = lazy(() => import('./pages/History.jsx'));

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

const getPageFromHash = () => {
  if (typeof window === 'undefined') return 'dashboard';
  const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return ['dashboard', 'settings', 'schedule', 'history'].includes(h) ? h : 'dashboard';
};

export default function App() {
  const [lang, setLang] = useState(() => Storage.getSettings().language || 'zh');
  const [page, setPage] = useState(getPageFromHash);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const saveSettingsRef = useRef(null);
  const discardSettingsRef = useRef(null);

  const t = translations[lang];

  // 全域輕量排程生命週期管理
  const schedulerStatus = useGlobalScheduler();

  useEffect(() => {
    const s = Storage.getSettings();
    Storage.saveSettings({ ...s, language: lang });
  }, [lang]);

  // Hash 路由監聽
  useEffect(() => {
    const handleHashChange = () => {
      const target = getPageFromHash();
      setPage(target);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const pages = { dashboard: Dashboard, settings: Settings, schedule: Schedule, history: History };
  const PageComponent = pages[page] || Dashboard;

  const navigateTo = (targetKey) => {
    setPage(targetKey);
    if (typeof window !== 'undefined' && window.location.hash !== `#${targetKey}`) {
      window.location.hash = targetKey;
    }
  };

  const handleNavClick = (targetKey) => {
    if (page === targetKey) return;
    if (page === 'settings' && hasUnsavedSettings) {
      setPendingPage(targetKey);
      setShowUnsavedModal(true);
    } else {
      navigateTo(targetKey);
    }
  };

  const handleStay = () => {
    setShowUnsavedModal(false);
    setPendingPage(null);
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedModal(false);
    setHasUnsavedSettings(false);
    if (pendingPage) {
      navigateTo(pendingPage);
      setPendingPage(null);
    }
  };

  const handleSaveAndLeave = async () => {
    if (saveSettingsRef.current) {
      await saveSettingsRef.current();
    }
    setShowUnsavedModal(false);
    setHasUnsavedSettings(false);
    if (pendingPage) {
      navigateTo(pendingPage);
      setPendingPage(null);
    }
  };

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
                {schedulerStatus.isCatchUp ? t.app.catchingUp : t.app.scheduledRun}
              </span>
            )}
          </div>

          {/* Lang toggle */}
          <button
            className="prism-btn prism-btn-ghost prism-btn-sm"
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
          >
            {t.app.switchLang}
          </button>
        </header>

        <div className="prism-body">
          {/* Sidebar */}
          <nav className="prism-sidebar">
            {Object.keys(pages).map(key => (
              <button
                key={key}
                data-nav={key}
                onClick={() => handleNavClick(key)}
                className={`prism-nav-btn ${page === key ? 'is-active' : ''}`}
              >
                <span className="prism-nav-btn-icon">{NAV_ICONS[key]}</span>
                {t.nav[key]}
                {key === 'settings' && hasUnsavedSettings && (
                  <span className="prism-unsaved-dot" style={{ marginLeft: 'auto' }} title={t.settings.unsavedChangesBar} />
                )}
              </button>
            ))}

            <div className="prism-sidebar-footer">
              <p className="prism-sidebar-footer-text" style={{ whiteSpace: 'pre-line' }}>
                {t.app.securityBadge}
              </p>
            </div>
          </nav>

          {/* Main content */}
          <main className="prism-main">
            <ErrorBoundary>
              <Suspense fallback={
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--prism-text-dim)' }}>
                  <span className="animate-spin" style={{ display: 'inline-block', fontSize: '24px', marginBottom: '12px' }}>⟳</span>
                  <p style={{ fontSize: '13px', margin: 0 }}>載入中…</p>
                </div>
              }>
                <PageComponent
                  onDirtyChange={setHasUnsavedSettings}
                  saveRef={saveSettingsRef}
                  discardRef={discardSettingsRef}
                  onNavigate={handleNavClick}
                />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        {/* Global Toast */}
        {schedulerStatus.toastMessage && (
          <div className="prism-toast">
            <span>✨</span>
            <span>{schedulerStatus.toastMessage}</span>
          </div>
        )}

        {/* Floating Unsaved Bar (Top-level Viewport Centered) */}
        {page === 'settings' && hasUnsavedSettings && (
          <div className="prism-unsaved-bar">
            <div className="prism-unsaved-bar-info">
              <span className="prism-unsaved-dot" />
              <span className="prism-unsaved-bar-text">{t.settings.unsavedChangesBar}</span>
            </div>
            <div className="prism-unsaved-bar-actions">
              <button
                type="button"
                className="prism-btn prism-btn-ghost prism-btn-sm"
                onClick={() => discardSettingsRef.current?.()}
              >
                {t.settings.discardChanges}
              </button>
              <button
                type="button"
                className="prism-btn prism-btn-primary prism-btn-sm"
                onClick={() => saveSettingsRef.current?.()}
              >
                ✓ {t.settings.save}
              </button>
            </div>
          </div>
        )}

        {/* Unsaved Changes Confirmation Modal */}
        <UnsavedModal
          isOpen={showUnsavedModal}
          onStay={handleStay}
          onDiscard={handleDiscardAndLeave}
          onSaveAndLeave={handleSaveAndLeave}
          t={t}
        />
      </div>
    </LangContext.Provider>
  );
}
