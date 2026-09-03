import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage } from '../lib/engine.js';

export default function History() {
  const { t, lang } = useLang();
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setHistory(Storage.getHistory());
  }, []);

  const clear = () => {
    localStorage.removeItem('cr_history');
    setHistory([]);
  };

  const confColor = {
    high: 'var(--prism-success)',
    medium: 'var(--prism-warning)',
    low: 'var(--prism-danger)',
  };

  if (history.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="prism-page-title">
          {t.history.title}
        </h1>
        <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--prism-text-dim)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px', opacity: 0.8 }}>📋</div>
          <p style={{ fontSize: '14px', color: 'var(--prism-text-muted)' }}>{t.history.empty}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <h1 className="prism-page-title" style={{ margin: 0 }}>
          {t.history.title}
        </h1>
        <button
          onClick={clear}
          className="prism-btn prism-btn-danger prism-btn-sm"
        >
          {lang === 'zh' ? '清除歷史' : 'Clear history'}
        </button>
      </div>

      {history.map((entry, idx) => (
        <div
          key={idx}
          className="prism-card"
          style={{
            padding: 0,
            marginBottom: '14px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '16px 22px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              transition: 'background var(--prism-transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--prism-bg-glass-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13.5px', color: 'var(--prism-text-primary)', fontWeight: 500 }}>
                {new Date(entry.date).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
              </span>
              <span className="prism-badge prism-badge-ghost" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '11px' }}>
                {entry.cards?.length || 0} {t.history.items}
              </span>
              {/* Mini confidence dots */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {(entry.cards || []).slice(0, 6).map((c, i) => (
                  <span
                    key={i}
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: confColor[c.confidence] || '#555',
                      display: 'inline-block'
                    }}
                  />
                ))}
              </div>
            </div>
            <span style={{ color: 'var(--prism-amber-500)', fontSize: '12px' }}>
              {expanded === idx ? '▲' : '▶'}
            </span>
          </button>

          {expanded === idx && (
            <div className="animate-fade-in" style={{
              borderTop: '1px solid var(--prism-border-subtle)',
              padding: '18px 22px',
              background: 'rgba(0, 0, 0, 0.15)'
            }}>
              {(entry.cards || []).map((card, ci) => (
                <div
                  key={ci}
                  style={{
                    marginBottom: '14px',
                    paddingBottom: '14px',
                    borderBottom: ci < entry.cards.length - 1 ? '1px solid var(--prism-border-subtle)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: confColor[card.confidence] || '#555',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--prism-text-primary)', fontWeight: 600 }}>
                      {card.primaryTitle || card.subject || (lang === 'zh' ? '無標題' : 'Untitled')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--prism-text-dim)', fontFamily: 'monospace', marginLeft: 'auto' }}>
                      #{card.hash}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--prism-text-secondary)', lineHeight: 1.6 }}>
                    {card.summary?.slice(0, 220)}…
                  </p>
                  {card.articles?.[0]?.link && (
                    <a
                      href={card.articles[0].link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--prism-info)',
                        textDecoration: 'none',
                        marginTop: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {t.dashboard.viewSource} ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
