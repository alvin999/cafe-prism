import { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import SourceChip from './SourceChip.jsx';

export default function ResearchCard({ card, t, lang }) {
  const [expanded, setExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Highlight ⚠ uncertain sentences
  const renderSummary = (text) => {
    return text.split('\n').map((line, i) => (
      <p key={i} style={{
        margin: '0 0 8px 0',
        fontSize: '14px',
        lineHeight: 1.7,
        color: line.includes('⚠') ? '#b89040' : '#c8c0a8',
      }}>
        {line}
      </p>
    ));
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '16px',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(180,140,80,0.2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <ConfidenceBadge level={card.confidence} t={t} />
        {card.crossVerified && (
          <span style={{
            fontSize: '11px', color: '#4a9967',
            background: 'rgba(74,153,103,0.08)', border: '1px solid rgba(74,153,103,0.2)',
            borderRadius: '20px', padding: '3px 9px',
          }}>
            ✓ {t.dashboard.crossVerified}
          </span>
        )}
        {card.hasConflict && (
          <span style={{
            fontSize: '11px', color: '#b89040',
            background: 'rgba(184,144,64,0.08)', border: '1px solid rgba(184,144,64,0.2)',
            borderRadius: '20px', padding: '3px 9px',
          }}>
            ⚠ {t.dashboard.conflict}
          </span>
        )}
        {card.repaired && !card.incomplete && (
          <span style={{ 
            fontSize: '11px', color: '#8090b0', border: '1px solid rgba(128,144,176,0.3)', 
            borderRadius: '4px', padding: '1px 6px', opacity: 0.8
          }}>
            ✧ {t.dashboard.jsonRepaired}
          </span>
        )}
        {card.incomplete && (
          <span style={{ 
            fontSize: '11px', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', 
            borderRadius: '4px', padding: '1px 6px', fontWeight: 600
          }}>
            ⚠ {lang === 'zh' ? '輸出不完整' : 'Incomplete'}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#504838', fontFamily: 'monospace' }}>
          #{card.hash}
        </span>
      </div>

      {/* Title */}
      <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: 600, color: '#f8f0e0', lineHeight: 1.4, letterSpacing: '0.02em' }}>
        {card.primaryTitle || card.subject || (lang === 'zh' ? '無標題' : 'Untitled')}
      </h3>

      {/* Summary */}
      <div style={{ marginBottom: '16px' }}>
        {card.incomplete ? (
          <div style={{ 
            color: '#ff8888', fontStyle: 'italic', background: 'rgba(255,25,25,0.08)', 
            padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,100,100,0.15)',
            fontSize: '14px', lineHeight: 1.6
          }}>
            {t.dashboard.incompleteData}
          </div>
        ) : renderSummary(card.summary)}
      </div>

      {/* Fun Fact & Practical Tip */}
      {(card.fun_fact || card.practical_tip) && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
          marginBottom: '16px'
        }}>
          {card.fun_fact && (
            <div style={{
              background: 'rgba(255,220,100,0.06)', border: '1px solid rgba(255,220,100,0.18)',
              padding: '12px', borderRadius: '8px',
              fontSize: '13px', color: '#e4d295', lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 {lang === 'zh' ? '社群趣聞 / 冷知識' : 'Fun Fact'}
              </div>
              {card.fun_fact}
            </div>
          )}
          {card.practical_tip && (
            <div style={{
              background: 'rgba(120,210,140,0.06)', border: '1px solid rgba(120,210,140,0.18)',
              padding: '12px', borderRadius: '8px',
              fontSize: '13px', color: '#a0d8b0', lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛠️ {lang === 'zh' ? '沖煮實用建議' : 'Practical Tip'}
              </div>
              {card.practical_tip}
            </div>
          )}
        </div>
      )}

      {/* Analysis Sub-items */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '8px', 
        paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)',
        marginBottom: '16px'
      }}>
        {card.consensus && (
          <div style={{ fontSize: '13px', color: '#a0b090', fontStyle: 'italic' }}>
            <span style={{ color: '#4a9967', fontWeight: 600, marginRight: '6px' }}>✓ {t.dashboard.consensus}:</span>
            {card.consensus}
          </div>
        )}
        {card.conflicts && (
          <div style={{ fontSize: '13px', color: '#c0a080', fontStyle: 'italic' }}>
            <span style={{ color: '#b89040', fontWeight: 600, marginRight: '6px' }}>⚠ {t.dashboard.conflicts}:</span>
            {card.conflicts}
          </div>
        )}
        {card.uncertainty && (
          <div style={{ fontSize: '13px', color: '#909090', fontStyle: 'italic' }}>
            <span style={{ color: '#707070', fontWeight: 600, marginRight: '6px' }}>? {t.dashboard.uncertainty}:</span>
            {card.uncertainty}
          </div>
        )}
      </div>

      {/* Key Terms */}
      {card.keyTerms && card.keyTerms.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#605848', alignSelf: 'center' }}>{t.dashboard.keyTerms}:</span>
          {card.keyTerms.map((term, i) => (
            <span key={i} style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
              background: 'rgba(180,140,80,0.1)', color: '#b89040',
              border: '1px solid rgba(180,140,80,0.2)',
            }}>
              #{term}
            </span>
          ))}
        </div>
      )}

      {/* Sources */}
      <div style={{
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#605848' }}>{t.dashboard.sources}:</span>
          {[...new Set(card.articles.map(a => a.source))].map(s => <SourceChip key={s} source={s} />)}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', color: '#706048',
            fontSize: '12px', cursor: 'pointer', padding: 0,
            fontFamily: 'inherit', marginRight: '16px'
          }}
        >
          {expanded ? '▲' : '▶'} {lang === 'zh' ? '顯示原始連結' : 'Show sources'} ({card.articles.length})
        </button>

        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            background: 'none', border: 'none', color: '#504838',
            fontSize: '12px', cursor: 'pointer', padding: 0,
            fontFamily: 'inherit',
          }}
        >
          {showDebug ? '▲' : '▶'} {t.dashboard.debugInfo}
        </button>

        {expanded && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {card.articles.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                padding: '10px 14px',
                borderLeft: '2px solid rgba(180,140,80,0.3)',
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <SourceChip source={a.source} />
                  <span style={{ fontSize: '12px', color: '#a09880', flex: 1 }}>{a.title}</span>
                </div>
                {a.description && (
                  <p style={{ fontSize: '12px', color: '#706858', margin: '4px 0', lineHeight: 1.5 }}>
                    {a.description.slice(0, 200)}…
                  </p>
                )}
                <a href={a.link} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '11px', color: '#8090c0', textDecoration: 'none',
                  wordBreak: 'break-all',
                }}>
                  {t.dashboard.viewSource} ↗
                </a>
              </div>
            ))}
          </div>
        )}

        {showDebug && card.debug && (
          <div style={{ 
            marginTop: '12px', padding: '12px',
            background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.1)',
            fontSize: '11px', color: '#807868'
          }}>
            <div style={{ marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', pb: '4px' }}>
              <strong>{t.dashboard.modelUsed}:</strong> {card.debug.model}
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <strong>{t.dashboard.rawPrompt}:</strong>
              <pre style={{ 
                whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', 
                padding: '8px', borderRadius: '4px', marginTop: '4px',
                maxHeight: '200px', overflowY: 'auto', fontSize: '10px'
              }}>
                {card.debug.prompt}
              </pre>
            </div>

            <div>
              <strong>{t.dashboard.rawResponse}:</strong>
              <pre style={{ 
                whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', 
                padding: '8px', borderRadius: '4px', marginTop: '4px',
                maxHeight: '200px', overflowY: 'auto', fontSize: '10px', color: '#a09070'
              }}>
                {card.debug.rawResponse}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
