import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage } from '../lib/engine.js';
import { safeUrl } from '../lib/utils/sanitize.js';

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

  return (
    <div className="animate-fade-in">
      {/* Editorial Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: '32px',
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
            ARCHIVE LOGS // CAFÉPRISM
          </div>
          <h1 className="prism-page-title" style={{ margin: 0 }}>
            {t.history.title}
          </h1>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="prism-btn prism-btn-danger prism-btn-sm"
          >
            {t.history.clear}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="prism-card" style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--prism-text-dim)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px', color: 'var(--prism-amber-500)', opacity: 0.6 }}>📋</div>
          <p style={{ fontSize: '13.5px', color: 'var(--prism-text-muted)', margin: 0 }}>{t.history.empty}</p>
        </div>
      ) : (
        history.map((entry, idx) => (
          <div
            key={idx}
            className="prism-card"
            style={{
              padding: 0,
              marginBottom: '16px',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '18px 24px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                transition: 'background var(--prism-transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '13px',
                  fontFamily: 'var(--prism-font-mono)',
                  color: 'var(--prism-text-primary)',
                  fontWeight: 500
                }}>
                  {new Date(entry.date).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
                </span>
                <span className="prism-badge prism-badge-ghost" style={{ fontSize: '11px' }}>
                  {entry.cards?.length || 0} {t.history.items}
                </span>
                {/* Mini confidence dots */}
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {(entry.cards || []).slice(0, 6).map((c, i) => (
                    <span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: confColor[c.confidence] || 'var(--prism-text-dim)',
                        display: 'inline-block'
                      }}
                    />
                  ))}
                </div>
              </div>
              <span style={{ color: 'var(--prism-amber-400)', fontSize: '11px', fontFamily: 'var(--prism-font-mono)' }}>
                {expanded === idx ? '▲ COLLAPSE' : '▼ EXPAND'}
              </span>
            </button>

            {expanded === idx && (
              <div className="animate-fade-in" style={{
                borderTop: '1px solid var(--prism-border-subtle)',
                padding: '20px 24px',
                background: 'var(--prism-bg-recessed)'
              }}>
                {(entry.cards || []).map((card, ci) => (
                  <div
                    key={ci}
                    style={{
                      marginBottom: '16px',
                      paddingBottom: '16px',
                      borderBottom: ci < entry.cards.length - 1 ? '1px solid var(--prism-border-subtle)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: confColor[card.confidence] || 'var(--prism-text-dim)',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontSize: '14px', fontFamily: 'var(--prism-font-display)', color: 'var(--prism-text-primary)', fontWeight: 650 }}>
                        {card.primaryTitle || card.subject || t.history.untitled}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--prism-text-dim)', fontFamily: 'var(--prism-font-mono)', marginLeft: 'auto' }}>
                        #{card.hash}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--prism-text-secondary)', lineHeight: 1.6 }}>
                      {card.summary?.slice(0, 220)}…
                    </p>
                    {card.articles?.[0]?.link && (
                      <a
                        href={safeUrl(card.articles[0].link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '11.5px',
                          fontFamily: 'var(--prism-font-mono)',
                          color: 'var(--prism-amber-400)',
                          textDecoration: 'none',
                          marginTop: '8px',
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
        ))
      )}
    </div>
  );
}