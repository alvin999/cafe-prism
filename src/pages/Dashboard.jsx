import { useLang } from '../App.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import ResearchCard from '../components/Dashboard/ResearchCard.jsx';
import ProgressBar from '../components/Dashboard/ProgressBar.jsx';

export default function Dashboard() {
  const { t, lang } = useLang();
  const {
    cards,
    running,
    progress,
    progressMsg,
    error,
    lastRun,
    sentTelegram,
    noModelMode,
    run,
    handleManualPush
  } = useDashboard(lang);

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
          {lang === 'zh' ? '信心分數說明' : 'Confidence legend'}:
        </span>
        {[
          { level: 'high', icon: '●', label: lang === 'zh' ? '高：多來源交叉驗證' : 'High: multi-source verified', color: 'var(--prism-success)' },
          { level: 'medium', icon: '◉', label: lang === 'zh' ? '中：單一來源' : 'Medium: single source', color: 'var(--prism-warning)' },
          { level: 'low', icon: '○', label: lang === 'zh' ? '低：請謹慎參考' : 'Low: treat with caution', color: 'var(--prism-danger)' },
        ].map(cfg => (
          <span key={cfg.level} style={{ fontSize: '12px', color: 'var(--prism-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: cfg.color }}>{cfg.icon}</span> {cfg.label}
          </span>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--prism-text-muted)', marginLeft: 'auto' }}>
          ⚠ = {lang === 'zh' ? '不確定句子' : 'uncertain claim'}
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
          ✓ {lang === 'zh' ? '已成功推送至 Telegram' : 'Sent to Telegram'}
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

        const papers = cards.filter(c => c.articles.some(a => a.source === 'semantic_scholar'));
        const reddits = cards.filter(c => !c.articles.some(a => a.source === 'semantic_scholar') && c.articles.some(a => a.source === 'reddit'));
        const news = cards.filter(c => !c.articles.some(a => a.source === 'semantic_scholar') && !c.articles.some(a => a.source === 'reddit'));

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
                <span className="prism-badge prism-badge-ghost" style={{ marginLeft: 'auto', background: 'var(--prism-bg-glass-card)' }}>
                  {items.length} 篇
                </span>
              </div>
              {items.map(card => <ResearchCard key={card.id} card={card} t={t} lang={lang} />)}
            </div>
          );
        };

        return (
          <div>
            {renderSection(lang === 'zh' ? '學術研究 (Academic Papers)' : 'Academic Papers', papers, '🔬')}
            {renderSection(lang === 'zh' ? '社群熱議 (Reddit Discoveries)' : 'Reddit Discoveries', reddits, '🔥')}
            {renderSection(lang === 'zh' ? '產業新聞 (Industry News)' : 'Industry News', news, '📰')}
          </div>
        );
      })()}
    </div>
  );
}
