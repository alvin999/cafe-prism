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
    run,
    handleManualPush
  } = useDashboard(lang);

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#f0e8d0', letterSpacing: '-0.02em' }}>
            {t.dashboard.title}
          </h1>
          {lastRun && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#504838' }}>
              {t.dashboard.lastRun}: {lastRun}
            </p>
          )}
        </div>
        <button
          onClick={run}
          disabled={running}
          style={{
            background: running ? 'rgba(180,140,80,0.1)' : 'rgba(180,140,80,0.15)',
            border: '1px solid rgba(180,140,80,0.3)',
            borderRadius: '8px',
            color: running ? '#806040' : '#c8a060',
            padding: '9px 20px',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 500,
            cursor: running ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          {running ? (
            <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> {t.dashboard.running}</>
          ) : (
            <>{t.dashboard.runNow}</>
          )}
        </button>

        {cards.length > 0 && !running && (
          <button
            onClick={handleManualPush}
            style={{
              background: 'rgba(74,153,103,0.1)',
              border: '1px solid rgba(74,153,103,0.3)',
              borderRadius: '8px',
              color: '#4a9967',
              padding: '9px 20px',
              fontSize: '13px',
              fontFamily: 'inherit',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '8px',
              marginLeft: '12px'
            }}
          >
            ✈ {t.dashboard.pushToTelegram}
          </button>
        )}
      </div>

      {/* Legend */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px', padding: '14px 18px', marginBottom: '24px',
        display: 'flex', gap: '20px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', color: '#604830', fontWeight: 500 }}>
          {lang === 'zh' ? '信心分數說明' : 'Confidence legend'}:
        </span>
        {[
          { level: 'high', icon: '●', label: lang === 'zh' ? '高：多來源交叉驗證' : 'High: multi-source verified' },
          { level: 'medium', icon: '◉', label: lang === 'zh' ? '中：單一來源' : 'Medium: single source' },
          { level: 'low', icon: '○', label: lang === 'zh' ? '低：請謹慎參考' : 'Low: treat with caution' },
        ].map(cfg => (
          <span key={cfg.level} style={{ fontSize: '12px', color: '#807060' }}>
            <span style={{ color: cfg.level === 'high' ? '#4a9967' : cfg.level === 'medium' ? '#b89040' : '#b05040' }}>
              {cfg.icon}
            </span> {cfg.label}
          </span>
        ))}
        <span style={{ fontSize: '12px', color: '#807060' }}>
          ⚠ = {lang === 'zh' ? '不確定句子' : 'uncertain claim'}
        </span>
      </div>

      {/* Progress */}
      {running && <ProgressBar progress={progress} message={progressMsg} />}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(176,80,64,0.08)', border: '1px solid rgba(176,80,64,0.2)',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#c07060',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Telegram sent */}
      {sentTelegram && (
        <div style={{
          background: 'rgba(74,153,103,0.08)', border: '1px solid rgba(74,153,103,0.2)',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#4a9967',
        }}>
          ✓ {lang === 'zh' ? '已推送至 Telegram' : 'Sent to Telegram'}
        </div>
      )}

      {/* Cards Display */}
      {cards.length === 0 && !running && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#504030' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>☕</div>
          <p style={{ fontSize: '14px' }}>{t.dashboard.noResults}</p>
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
            <div style={{ marginBottom: '32px' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', 
                paddingBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e8d8b8' }}>
                  {title}
                </h2>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#807060', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
