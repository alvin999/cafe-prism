import { useLang } from '../App.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import ResearchCard from '../components/Dashboard/ResearchCard.jsx';
import ProgressBar from '../components/Dashboard/ProgressBar.jsx';
import UnlockModal from '../components/UnlockModal.jsx';

export default function Dashboard() {
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
    needUnlock,
    handleUnlockSuccess,
    handleCancelUnlock,
    run,
    handleManualPush
  } = useDashboard(lang, t);

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="prism-page-title" style={{ margin: 0 }}>
            {t.dashboard.title}
          </h1>
          {lastRun && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--prism-text-muted)' }}>
              {t.dashboard.lastRun}: {lastRun}
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
              <>{t.dashboard.runNow}</>
            )}
          </button>

          {cards.length > 0 && !running && (
            <button
              onClick={handleManualPush}
              className="prism-btn prism-btn-success"
            >
              ✈ {t.dashboard.pushToTelegram}
            </button>
          )}
        </div>
      </div>

      {/* Crawl Observability Bar */}
      {sourceStatus && (
        <div className="prism-card animate-fade-in" style={{
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid var(--prism-border-subtle)'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--prism-amber-500)', fontWeight: 600 }}>
            {t.dashboard.sourcesStatus.title}:
          </span>
          {[
            { key: 'semantic_scholar', icon: '🔬', label: t.dashboard.sourcesStatus.scholar, data: sourceStatus.semantic_scholar },
            { key: 'reddit', icon: '🔥', label: t.dashboard.sourcesStatus.reddit, data: sourceStatus.reddit },
            { key: 'rss', icon: '📰', label: t.dashboard.sourcesStatus.rss, data: sourceStatus.rss },
          ].map(source => {
            const data = source.data || { status: 'disabled', count: 0 };
            const isSuccess = data.status === 'success' && data.count > 0;
            const isFailed = data.status === 'failed' || (data.status === 'success' && data.count === 0);

            const badgeColor = isSuccess 
              ? 'var(--prism-success)' 
              : isFailed 
                ? 'var(--prism-danger)' 
                : 'var(--prism-text-dim)';

            // 連線正常時不顯示文字（僅綠燈），只有失敗或未啟用時才顯示狀態文字
            const statusText = isSuccess
              ? ''
              : isFailed
                ? t.dashboard.sourcesStatus.failed
                : t.dashboard.sourcesStatus.disabled;

            const tooltipText = isFailed
              ? (data.error || t.dashboard.sourcesStatus.failed)
              : `${source.label}：${t.dashboard.sourcesStatus.success} (${data.count} 篇原始資料)`;

            return (
              <span
                key={source.key}
                title={tooltipText}
                style={{
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: 'var(--prism-radius-sm)',
                  background: isFailed ? 'var(--prism-danger-bg)' : isSuccess ? 'rgba(74, 153, 103, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isFailed ? 'var(--prism-danger-border)' : isSuccess ? 'rgba(74, 153, 103, 0.25)' : 'transparent'}`,
                  color: isFailed ? 'var(--prism-danger)' : 'var(--prism-text-secondary)',
                  cursor: isFailed ? 'help' : 'default'
                }}
              >
                <span>{source.icon}</span>
                <span style={{ fontWeight: 500 }}>{source.label}</span>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: badgeColor,
                  boxShadow: isSuccess ? '0 0 6px rgba(74, 153, 103, 0.6)' : isFailed ? '0 0 6px rgba(239, 68, 68, 0.6)' : 'none'
                }} />
                {statusText && <span style={{ fontSize: '11px', opacity: 0.9 }}>{statusText}</span>}
                {isFailed && data.error && (
                  <span style={{ fontSize: '11px', color: 'var(--prism-danger)', marginLeft: '2px' }}>
                    ({data.error.slice(0, 30)}…)
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Firewall / Network Restriction Warning Banner */}
      {sourceStatus && Object.values(sourceStatus).some(s => s.status === 'failed') && !running && (
        <div className="prism-card animate-fade-in" style={{
          borderColor: 'rgba(234, 179, 8, 0.3)',
          background: 'rgba(234, 179, 8, 0.07)',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🛡️</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 600,
              color: 'var(--prism-amber-400)',
              fontSize: '13.5px',
              marginBottom: '4px'
            }}>
              {t.dashboard.firewallNoticeTitle}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--prism-text-secondary)',
              lineHeight: 1.6,
              marginBottom: '4px'
            }}>
              {t.dashboard.firewallNoticeDesc}
            </div>
            <div style={{
              fontSize: '11.5px',
              color: 'var(--prism-amber-300)',
              lineHeight: 1.5
            }}>
              {t.dashboard.firewallNoticeTip}
            </div>
          </div>
          <a
            href="#settings"
            onClick={e => { e.preventDefault(); document.querySelector('[data-nav="settings"]')?.click(); }}
            className="prism-btn prism-btn-sm prism-btn-primary"
            style={{
              flexShrink: 0,
              alignSelf: 'center',
              textDecoration: 'none',
              fontSize: '12px'
            }}
          >
            {t.dashboard.firewallGoSettings} →
          </a>
        </div>
      )}

      {/* Legend */}
      <div className="prism-card" style={{
        padding: '14px 20px',
        marginBottom: '24px',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--prism-amber-600)', fontWeight: 600 }}>
          {t.dashboard.legend.title}:
        </span>
        {[
          { level: 'high', icon: '●', label: t.dashboard.legend.high, color: 'var(--prism-success)' },
          { level: 'medium', icon: '◉', label: t.dashboard.legend.medium, color: 'var(--prism-warning)' },
          { level: 'low', icon: '○', label: t.dashboard.legend.low, color: 'var(--prism-danger)' },
        ].map(cfg => (
          <span key={cfg.level} style={{ fontSize: '12px', color: 'var(--prism-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: cfg.color }}>{cfg.icon}</span> {cfg.label}
          </span>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--prism-text-muted)', marginLeft: 'auto' }}>
          ⚠ = {t.dashboard.legend.uncertainClaim}
        </span>
      </div>

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

      {/* No-Model / Connection Error Reminder Banner */}
      {noModelMode && cards.length > 0 && !running && (
        <div className="prism-card animate-fade-in" style={{
          borderColor: noModelMode === 'conn_error' ? 'var(--prism-danger-border)' : 'var(--prism-warning-border)',
          background: noModelMode === 'conn_error' ? 'var(--prism-danger-bg)' : 'var(--prism-warning-bg)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}>
          <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '1px' }}>
            {noModelMode === 'conn_error' ? '⚠️' : '🔌'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 600,
              color: noModelMode === 'conn_error' ? 'var(--prism-danger)' : 'var(--prism-amber-400)',
              fontSize: '14px',
              marginBottom: '5px'
            }}>
              {noModelMode === 'conn_error' ? t.dashboard.modelConnErrorTitle : t.dashboard.noModelBannerTitle}
            </div>
            <div style={{
              fontSize: '12.5px',
              color: 'var(--prism-text-secondary)',
              lineHeight: 1.7
            }}>
              {noModelMode === 'conn_error' ? t.dashboard.modelConnErrorDesc : t.dashboard.noModelBannerDesc}
            </div>
          </div>
          <a
            href="#settings"
            onClick={e => { e.preventDefault(); document.querySelector('[data-nav="settings"]')?.click(); }}
            className={`prism-btn prism-btn-sm ${noModelMode === 'conn_error' ? 'prism-btn-danger' : 'prism-btn-primary'}`}
            style={{
              flexShrink: 0,
              alignSelf: 'center',
              textDecoration: 'none',
            }}
          >
            {t.dashboard.noModelGoSettings} →
          </a>
        </div>
      )}

      {/* Cards Display */}
      {cards.length === 0 && !running && (
        <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--prism-text-dim)' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px', opacity: 0.8 }}>☕</div>
          <p style={{ fontSize: '14px', color: 'var(--prism-text-muted)' }}>{t.dashboard.noResults}</p>
        </div>
      )}

      {/* Group cards by source */}
      {(() => {
        if (cards.length === 0) return null;

        const getCardSource = (c) => c.primarySource || c.articles?.[0]?.source || 'unknown';
        const papers = cards.filter(c => getCardSource(c) === 'semantic_scholar');
        const reddits = cards.filter(c => getCardSource(c) === 'reddit');
        const news = cards.filter(c => getCardSource(c) === 'rss');

        const renderSection = (title, items, icon) => {
          if (items.length === 0) return null;

          return (
            <div style={{ marginBottom: '36px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--prism-border-subtle)',
                paddingBottom: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--prism-text-primary)' }}>
                  {title}
                </h2>
                <span className="prism-badge prism-badge-ghost" style={{
                  marginLeft: 'auto',
                  background: 'var(--prism-bg-glass-card)',
                  fontSize: '11px',
                  padding: '3px 8px',
                  color: 'var(--prism-text-muted)',
                }}>
                  {items.length} {t.dashboard.sections.itemsUnit}
                </span>
              </div>
              {items.map(card => <ResearchCard key={card.id} card={card} t={t} lang={lang} />)}
            </div>
          );
        };

        return (
          <div>
            {renderSection(t.dashboard.sections.papers, papers, '🔬')}
            {renderSection(t.dashboard.sections.reddits, reddits, '🔥')}
            {renderSection(t.dashboard.sections.news, news, '📰')}
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
