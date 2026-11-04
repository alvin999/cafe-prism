import { useLang } from '../App.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import ResearchCard from '../components/Dashboard/ResearchCard.jsx';
import ProgressBar from '../components/Dashboard/ProgressBar.jsx';
import UnlockModal from '../components/UnlockModal.jsx';
import TopicQuickBar from '../components/Dashboard/TopicQuickBar.jsx';

const Icons = {
  Scholar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Reddit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </svg>
  ),
  Rss: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  ),
  Send: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  CoffeeCup: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  )
};

export default function Dashboard({ onNavigate }) {
  const { t, lang } = useLang();
  const {
    cards,
    sourceStatus,
    running,
    progress,
    progressMsg,
    error,
    lastRun,
    sentTelegram,
    noModelMode,
    isSample,
    needUnlock,
    handleUnlockSuccess,
    handleCancelUnlock,
    run,
    cancelRun,
    handleManualPush
  } = useDashboard(lang, t);

  const navigateToSettings = () => {
    if (onNavigate) {
      onNavigate('settings');
    } else {
      document.querySelector('[data-nav="settings"]')?.click();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ─── Editorial Page Header ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--prism-border-subtle)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--prism-font-mono)',
            fontSize: '10.5px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--prism-amber-500)',
            marginBottom: '6px',
            fontWeight: 600
          }}>
            INTELLIGENCE BRIEFING // CAFÉPRISM
          </div>
          <h1 className="prism-page-title" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>{t.dashboard.title}</span>
            {isSample && (
              <span className="prism-badge" style={{
                background: 'rgba(168, 85, 247, 0.12)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.28)',
                fontSize: '11px',
                padding: '3px 9px',
                fontWeight: 500
              }}>
                ✦ {t.dashboard.sampleBadge}
              </span>
            )}
          </h1>
          {lastRun && (
            <p style={{
              margin: '8px 0 0',
              fontSize: '11.5px',
              fontFamily: 'var(--prism-font-mono)',
              color: 'var(--prism-text-muted)',
              letterSpacing: '0.02em'
            }}>
              {t.dashboard.lastRun}: <span style={{ color: 'var(--prism-text-secondary)' }}>{lastRun}</span>
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={run}
            disabled={running}
            className="prism-btn prism-btn-primary"
          >
            {running ? (
              <><span className="animate-spin">⟳</span> {t.dashboard.running}</>
            ) : (
              <><Icons.Play /> {t.dashboard.runNow}</>
            )}
          </button>

          {running && (
            <button
              onClick={cancelRun}
              className="prism-btn prism-btn-danger"
              style={{ padding: '10px 16px' }}
            >
              ✕ {t.dashboard.cancel || '取消'}
            </button>
          )}

          {cards.length > 0 && !running && (
            <button
              onClick={handleManualPush}
              className="prism-btn prism-btn-ghost"
            >
              <Icons.Send /> {t.dashboard.pushToTelegram}
            </button>
          )}
        </div>
      </div>

      {/* ─── Unified Command Console (整合探索策略 + 資料源遙測 + 精簡圖例) ─── */}
      <div className="prism-card prism-console-bar animate-fade-in">
        <div className="prism-console-main">
          <TopicQuickBar t={t} embedded />
        </div>

        {sourceStatus && (
          <>
            <div className="prism-console-divider" />
            <div className="prism-console-status" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <span style={{
                  fontFamily: 'var(--prism-font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--prism-amber-500)',
                  fontWeight: 600
                }}>
                  {t.dashboard.sourcesStatus.title}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--prism-text-dim)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px'
                }} title={t.dashboard.legend.title}>
                  <span><strong style={{ color: 'var(--prism-success)' }}>●</strong> {t.dashboard.legend.high}</span>
                  <span><strong style={{ color: 'var(--prism-warning)' }}>◉</strong> {t.dashboard.legend.medium}</span>
                  <span><strong style={{ color: 'var(--prism-danger)' }}>○</strong> {t.dashboard.legend.low}</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'semantic_scholar', icon: <Icons.Scholar />, label: t.dashboard.sourcesStatus.scholar, data: sourceStatus.semantic_scholar },
                  { key: 'reddit', icon: <Icons.Reddit />, label: t.dashboard.sourcesStatus.reddit, data: sourceStatus.reddit },
                  { key: 'rss', icon: <Icons.Rss />, label: t.dashboard.sourcesStatus.rss, data: sourceStatus.rss },
                ].map(source => {
                  const data = source.data || { status: 'disabled', count: 0 };
                  const isSuccess = data.status === 'success' && data.count > 0;
                  const isFailed = data.status === 'failed' || (data.status === 'success' && data.count === 0);

                  const badgeColor = isSuccess
                    ? 'var(--prism-success)'
                    : isFailed
                      ? 'var(--prism-danger)'
                      : 'var(--prism-text-dim)';

                  const statusText = isSuccess
                    ? `${data.count}`
                    : isFailed
                      ? t.dashboard.sourcesStatus.failed
                      : t.dashboard.sourcesStatus.disabled;

                  const tooltipText = isFailed
                    ? (data.error || t.dashboard.sourcesStatus.failed)
                    : `${source.label}：${t.dashboard.sourcesStatus.success} (${data.count})`;

                  return (
                    <span
                      key={source.key}
                      title={tooltipText}
                      style={{
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '6px 11px',
                        borderRadius: 'var(--prism-radius-sm)',
                        background: isFailed ? 'var(--prism-danger-bg)' : 'var(--prism-bg-recessed)',
                        border: `1px solid ${isFailed ? 'var(--prism-danger-border)' : 'var(--prism-border-subtle)'}`,
                        color: isFailed ? 'var(--prism-danger)' : 'var(--prism-text-secondary)',
                        cursor: isFailed ? 'help' : 'default'
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: badgeColor,
                        boxShadow: isSuccess ? '0 0 8px rgba(82, 168, 114, 0.65)' : isFailed ? '0 0 8px rgba(207, 89, 72, 0.65)' : 'none'
                      }} />
                      <span style={{ fontWeight: 500, color: 'var(--prism-text-primary)' }}>{source.label}</span>
                      {statusText && (
                        <span style={{
                          fontSize: '11px',
                          fontFamily: 'var(--prism-font-mono)',
                          color: isFailed ? 'var(--prism-danger)' : 'var(--prism-text-muted)'
                        }}>
                          {statusText}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Source Unresponsive Warning Banner ────────────────────────── */}
      {sourceStatus && Object.values(sourceStatus).some(s => s.status === 'failed') && !running && (() => {
        const failedNames = Object.entries(sourceStatus)
          .filter(([_, s]) => s.status === 'failed')
          .map(([key]) => t.dashboard.sourcesStatus[key === 'semantic_scholar' ? 'scholar' : key] || key)
          .join('、');

        return (
          <div className="prism-card animate-fade-in" style={{
            borderColor: 'var(--prism-warning-border)',
            background: 'var(--prism-warning-bg)',
            padding: '16px 22px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
              <span style={{ color: 'var(--prism-amber-400)', display: 'flex', flexShrink: 0 }}>
                <Icons.Alert />
              </span>
              <div>
                <div style={{
                  fontWeight: 600,
                  color: 'var(--prism-amber-400)',
                  fontSize: '13.5px',
                  marginBottom: '2px'
                }}>
                  {t.dashboard.sourceWarningTitle}
                </div>
                <div style={{
                  fontSize: '12.5px',
                  color: 'var(--prism-text-secondary)',
                  lineHeight: 1.5,
                }}>
                  {t.dashboard.sourceWarningDesc.replace('{sources}', failedNames || t.dashboard.sourcesStatus.title)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={navigateToSettings}
              className="prism-btn prism-btn-sm prism-btn-ghost"
            >
              {t.dashboard.sourceWarningBtn} →
            </button>
          </div>
        );
      })()}

      {/* Progress */}
      {running && <ProgressBar progress={progress} message={progressMsg} />}

      {/* Error */}
      {error && (
        <div className="prism-badge prism-badge-danger animate-fade-in" style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px 18px',
          marginBottom: '20px',
          fontSize: '13px',
          borderRadius: 'var(--prism-radius-md)',
          display: 'block'
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Telegram sent */}
      {sentTelegram && (
        <div className="prism-badge prism-badge-success animate-fade-in" style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px 18px',
          marginBottom: '20px',
          fontSize: '13px',
          borderRadius: 'var(--prism-radius-md)',
          display: 'block'
        }}>
          ✓ {t.dashboard.messages.telegramSent}
        </div>
      )}

      {/* ─── Sample Demonstration Banner ───────────────────────────────── */}
      {isSample && !noModelMode && !running && (
        <div className="prism-card prism-card-highlight animate-fade-in" style={{
          padding: '18px 24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
            <span style={{ color: 'var(--prism-amber-400)', display: 'flex', flexShrink: 0, marginTop: '2px' }}>
              <Icons.Sparkles />
            </span>
            <div>
              <div style={{
                fontWeight: 600,
                color: 'var(--prism-text-primary)',
                fontSize: '14px',
                marginBottom: '4px'
              }}>
                {t.dashboard.sampleBannerTitle}
              </div>
              <div style={{
                fontSize: '12.5px',
                color: 'var(--prism-text-secondary)',
                lineHeight: 1.6
              }}>
                {t.dashboard.sampleBannerDesc}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={navigateToSettings}
            className="prism-btn prism-btn-sm prism-btn-primary"
          >
            {t.dashboard.sampleGoSettings} →
          </button>
        </div>
      )}

      {/* ─── Auth Error / Connection Error / No-Model Reminder Banner ──── */}
      {noModelMode && cards.length > 0 && !running && (() => {
        const isAuth = noModelMode === 'auth_error';
        const isConn = noModelMode === 'conn_error';
        const isDanger = isAuth || isConn;

        const title = isAuth
          ? t.dashboard.modelAuthErrorTitle
          : isConn
            ? t.dashboard.modelConnErrorTitle
            : t.dashboard.noModelBannerTitle;

        const desc = isAuth
          ? (error ? `${t.dashboard.modelAuthErrorDesc} (${error})` : t.dashboard.modelAuthErrorDesc)
          : isConn
            ? (error ? `${t.dashboard.modelConnErrorDesc} (${error})` : t.dashboard.modelConnErrorDesc)
            : t.dashboard.noModelBannerDesc;

        return (
          <div className="prism-card animate-fade-in" style={{
            borderColor: isDanger ? 'var(--prism-danger-border)' : 'var(--prism-warning-border)',
            background: isDanger ? 'var(--prism-danger-bg)' : 'var(--prism-warning-bg)',
            padding: '18px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
              <span style={{
                color: isDanger ? 'var(--prism-danger)' : 'var(--prism-amber-400)',
                display: 'flex',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <Icons.Alert />
              </span>
              <div>
                <div style={{
                  fontWeight: 600,
                  color: isDanger ? 'var(--prism-danger)' : 'var(--prism-amber-400)',
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {title}
                </div>
                <div style={{
                  fontSize: '12.5px',
                  color: 'var(--prism-text-secondary)',
                  lineHeight: 1.65
                }}>
                  {desc}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={navigateToSettings}
              className={`prism-btn prism-btn-sm ${isDanger ? 'prism-btn-danger' : 'prism-btn-primary'}`}
            >
              {t.dashboard.noModelGoSettings} →
            </button>
          </div>
        );
      })()}

      {/* ─── Empty State ───────────────────────────────────────────────── */}
      {cards.length === 0 && !running && (
        <div className="prism-card" style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--prism-text-dim)' }}>
          <div style={{ marginBottom: '16px', color: 'var(--prism-amber-500)', opacity: 0.7, display: 'inline-flex' }}>
            <Icons.CoffeeCup />
          </div>
          <p style={{ fontSize: '14px', color: 'var(--prism-text-muted)', margin: 0 }}>{t.dashboard.noResults}</p>
        </div>
      )}

      {/* ─── Editorial Sections (Grouped by Source) ────────────────────── */}
      {(() => {
        if (cards.length === 0) return null;

        const getCardSource = (c) => c.primarySource || c.articles?.[0]?.source || 'unknown';
        const papers = cards.filter(c => getCardSource(c) === 'semantic_scholar');
        const reddits = cards.filter(c => getCardSource(c) === 'reddit');
        const news = cards.filter(c => getCardSource(c) === 'rss');

        const renderSection = (eyebrow, title, items, icon) => {
          if (items.length === 0) return null;

          return (
            <section style={{ marginBottom: '44px' }}>
              <div className="prism-section-header">
                <div>
                  <span className="prism-section-eyebrow">{eyebrow}</span>
                  <h2 className="prism-section-title">
                    <span style={{ color: 'var(--prism-amber-400)', display: 'inline-flex' }}>{icon}</span>
                    <span>{title}</span>
                  </h2>
                </div>
                <span className="prism-section-count">
                  {String(items.length).padStart(2, '0')} // {t.dashboard.sections.itemsUnit}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {items.map(card => <ResearchCard key={card.id} card={card} t={t} lang={lang} />)}
              </div>
            </section>
          );
        };

        return (
          <div>
            {renderSection('01 // ACADEMIC LITERATURE', t.dashboard.sections.papers, papers, <Icons.Scholar />)}
            {renderSection('02 // COMMUNITY PULSE', t.dashboard.sections.reddits, reddits, <Icons.Reddit />)}
            {renderSection('03 // INDUSTRY DISPATCH', t.dashboard.sections.news, news, <Icons.Rss />)}
          </div>
        );
      })()}

      <UnlockModal
        isOpen={needUnlock}
        onClose={handleCancelUnlock}
        onSuccess={handleUnlockSuccess}
        t={t}
      />
    </div>
  );
}