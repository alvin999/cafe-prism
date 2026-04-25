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

  const confColor = { high: '#4a9967', medium: '#b89040', low: '#b05040' };

  if (history.length === 0) {
    return (
      <div>
        <h1 style={{ margin: '0 0 28px', fontSize: '22px', fontWeight: 600, color: '#f0e8d0', letterSpacing: '-0.02em' }}>
          {t.history.title}
        </h1>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#504030' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <p style={{ fontSize: '14px' }}>{t.history.empty}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#f0e8d0', letterSpacing: '-0.02em' }}>
          {t.history.title}
        </h1>
        <button
          onClick={clear}
          style={{
            background: 'none', border: '1px solid rgba(176,80,64,0.25)',
            borderRadius: '8px', color: '#805040',
            padding: '7px 14px', fontSize: '12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {lang === 'zh' ? '清除歷史' : 'Clear history'}
        </button>
      </div>

      {history.map((entry, idx) => (
        <div key={idx} style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', marginBottom: '12px', overflow: 'hidden',
        }}>
          <button
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            style={{
              width: '100%', background: 'none', border: 'none',
              padding: '16px 20px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#a09070' }}>
                {new Date(entry.date).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
              </span>
              <span style={{ fontSize: '12px', color: '#605040' }}>
                {entry.cards?.length || 0} {t.history.items}
              </span>
              {/* Mini confidence dots */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {(entry.cards || []).slice(0, 6).map((c, i) => (
                  <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: confColor[c.confidence] || '#555', display: 'inline-block' }} />
                ))}
              </div>
            </div>
            <span style={{ color: '#504030', fontSize: '12px' }}>{expanded === idx ? '▲' : '▶'}</span>
          </button>

          {expanded === idx && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px' }}>
              {(entry.cards || []).map((card, ci) => (
                <div key={ci} style={{
                  marginBottom: '14px', paddingBottom: '14px',
                  borderBottom: ci < entry.cards.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: confColor[card.confidence] || '#555', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#c0b090', fontWeight: 500 }}>{card.primaryTitle}</span>
                    <span style={{ fontSize: '10px', color: '#403020', fontFamily: 'monospace', marginLeft: 'auto' }}>#{card.hash}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#706050', lineHeight: 1.6 }}>
                    {card.summary?.slice(0, 200)}…
                  </p>
                  {card.articles?.[0]?.link && (
                    <a
                      href={card.articles[0].link}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#607090', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}
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
