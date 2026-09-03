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
        color: line.includes('⚠') ? 'var(--prism-warning)' : 'var(--prism-text-secondary)',
      }}>
        {line}
      </p>
    ));
  };

  return (
    <div className="prism-card prism-card-interactive animate-fade-in" style={{ marginBottom: '18px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <ConfidenceBadge level={card.confidence} t={t} />

        {card.crossVerified && (
          <span className="prism-badge prism-badge-success">
            ✓ {t.dashboard.crossVerified}
          </span>
        )}

        {card.hasConflict && (
          <span className="prism-badge prism-badge-warning animate-pulse">
            ⚠ {t.dashboard.conflict}
          </span>
        )}

        {card.repaired && !card.incomplete && (
          <span className="prism-badge prism-badge-info">
            ✧ {t.dashboard.jsonRepaired}
          </span>
        )}

        {card.incomplete && (
          <span className="prism-badge prism-badge-danger">
            ⚠ {lang === 'zh' ? '輸出不完整' : 'Incomplete'}
          </span>
        )}

        {card.noModel && (
          <span className={`prism-badge ${card.llmError ? 'prism-badge-danger' : 'prism-badge-warning'}`}>
            {card.llmError ? '⚠️' : '🔌'} {card.llmError ? t.dashboard.modelErrorBadge : t.dashboard.noModelBadge}
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--prism-text-dim)', fontFamily: 'monospace' }}>
          #{card.hash}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 14px 0',
        fontSize: '17.5px',
        fontWeight: 600,
        color: 'var(--prism-text-primary)',
        lineHeight: 1.45,
        letterSpacing: '-0.01em'
      }}>
        {card.primaryTitle || card.subject || (lang === 'zh' ? '無標題' : 'Untitled')}
      </h3>

      {/* Summary / No-Model placeholder */}
      <div style={{ marginBottom: '16px' }}>
        {card.noModel ? (
          <div style={{
            color: card.llmError ? '#ff8888' : 'var(--prism-text-muted)',
            fontStyle: 'italic',
            background: card.llmError ? 'var(--prism-danger-bg)' : 'var(--prism-warning-bg)',
            padding: '12px 16px',
            borderRadius: 'var(--prism-radius-md)',
            border: `1px dashed ${card.llmError ? 'var(--prism-danger-border)' : 'var(--prism-warning-border)'}`,
            fontSize: '13px',
            lineHeight: 1.6,
          }}>
            {card.llmError ? (
              <>
                <strong style={{ color: 'var(--prism-danger)' }}>{lang === 'zh' ? 'AI 連線失敗：' : 'AI Connection Failed: '}</strong>
                {card.errorDetail || (lang === 'zh' ? '請檢查模型設定或網路連線。' : 'Please check model settings or network.')}
              </>
            ) : (
              lang === 'zh'
                ? '—— 標題來自爬蟲原始資料，尚未經 AI 整理。串接模型後即可看到摘要。'
                : '—— Raw crawled data, not yet organized by AI. Connect a model to generate summaries.'
            )}
          </div>
        ) : card.incomplete ? (
          <div style={{
            color: 'var(--prism-danger)',
            fontStyle: 'italic',
            background: 'var(--prism-danger-bg)',
            padding: '12px 16px',
            borderRadius: 'var(--prism-radius-md)',
            border: '1px solid var(--prism-danger-border)',
            fontSize: '13.5px',
            lineHeight: 1.6
          }}>
            {t.dashboard.incompleteData}
          </div>
        ) : renderSummary(card.summary)}
      </div>

      {/* Fun Fact & Practical Tip */}
      {!card.noModel && (card.fun_fact || card.practical_tip) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {card.fun_fact && (
            <div style={{
              background: 'rgba(200, 160, 96, 0.06)',
              border: '1px solid rgba(200, 160, 96, 0.2)',
              padding: '12px 16px',
              borderRadius: 'var(--prism-radius-md)',
              fontSize: '13px',
              color: 'var(--prism-amber-200)',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--prism-amber-400)' }}>
                💡 {lang === 'zh' ? '社群趣聞 / 冷知識' : 'Fun Fact'}
              </div>
              {card.fun_fact}
            </div>
          )}
          {card.practical_tip && (
            <div style={{
              background: 'rgba(74, 153, 103, 0.06)',
              border: '1px solid rgba(74, 153, 103, 0.2)',
              padding: '12px 16px',
              borderRadius: 'var(--prism-radius-md)',
              fontSize: '13px',
              color: '#b0e0c0',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--prism-success)' }}>
                🛠️ {lang === 'zh' ? '沖煮實用建議' : 'Practical Tip'}
              </div>
              {card.practical_tip}
            </div>
          )}
        </div>
      )}

      {/* Analysis Sub-items */}
      {!card.noModel && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingLeft: '14px',
          borderLeft: '2px solid rgba(200, 160, 96, 0.25)',
          marginBottom: '16px'
        }}>
          {card.consensus && (
            <div style={{ fontSize: '13px', color: 'var(--prism-text-secondary)', fontStyle: 'italic' }}>
              <span style={{ color: 'var(--prism-success)', fontWeight: 600, marginRight: '6px' }}>✓ {t.dashboard.consensus}:</span>
              {card.consensus}
            </div>
          )}
          {card.conflicts && (
            <div style={{ fontSize: '13px', color: 'var(--prism-text-secondary)', fontStyle: 'italic' }}>
              <span style={{ color: 'var(--prism-warning)', fontWeight: 600, marginRight: '6px' }}>⚠ {t.dashboard.conflicts}:</span>
              {card.conflicts}
            </div>
          )}
          {card.uncertainty && (
            <div style={{ fontSize: '13px', color: 'var(--prism-text-muted)', fontStyle: 'italic' }}>
              <span style={{ color: 'var(--prism-text-dim)', fontWeight: 600, marginRight: '6px' }}>? {t.dashboard.uncertainty}:</span>
              {card.uncertainty}
            </div>
          )}
        </div>
      )}

      {/* Key Terms */}
      {!card.noModel && card.keyTerms && card.keyTerms.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--prism-text-dim)' }}>{t.dashboard.keyTerms}:</span>
          {card.keyTerms.map((term, i) => (
            <span key={i} className="prism-badge prism-badge-amber" style={{ fontSize: '11px' }}>
              #{term}
            </span>
          ))}
        </div>
      )}

      {/* Sources */}
      <div style={{
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid var(--prism-border-subtle)',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--prism-text-dim)' }}>{t.dashboard.sources}:</span>
          {[...new Set(card.articles.map(a => a.source))].map(s => <SourceChip key={s} source={s} />)}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="prism-btn prism-btn-ghost prism-btn-sm"
          >
            {expanded ? '▲' : '▶'} {lang === 'zh' ? '顯示原始連結' : 'Show sources'} ({card.articles.length})
          </button>

          {import.meta.env.DEV && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="prism-btn prism-btn-ghost prism-btn-sm"
              style={{ color: 'var(--prism-text-dim)' }}
            >
              {showDebug ? '▲' : '▶'} {t.dashboard.debugInfo}
            </button>
          )}
        </div>

        {expanded && (
          <div className="animate-fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {card.articles.map((a, i) => (
              <div key={i} style={{
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--prism-radius-md)',
                padding: '12px 16px',
                borderLeft: '3px solid var(--prism-amber-600)',
                borderTop: '1px solid var(--prism-border-subtle)',
                borderRight: '1px solid var(--prism-border-subtle)',
                borderBottom: '1px solid var(--prism-border-subtle)',
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                  <SourceChip source={a.source} />
                  <span style={{ fontSize: '12.5px', color: 'var(--prism-text-primary)', fontWeight: 500, flex: 1 }}>{a.title}</span>
                </div>
                {a.description && (
                  <p style={{ fontSize: '12px', color: 'var(--prism-text-muted)', margin: '4px 0 8px', lineHeight: 1.5 }}>
                    {a.description.slice(0, 200)}…
                  </p>
                )}
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px',
                    color: 'var(--prism-info)',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {t.dashboard.viewSource} ↗
                </a>
              </div>
            ))}
          </div>
        )}

        {import.meta.env.DEV && showDebug && card.debug && (
          <div className="animate-fade-in" style={{
            marginTop: '12px',
            padding: '14px',
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: 'var(--prism-radius-md)',
            border: '1px dashed var(--prism-border-medium)',
            fontSize: '11px',
            color: 'var(--prism-text-secondary)'
          }}>
            <div style={{ marginBottom: '10px', borderBottom: '1px solid var(--prism-border-subtle)', paddingBottom: '6px' }}>
              <strong>{t.dashboard.modelUsed}:</strong> <span style={{ color: 'var(--prism-amber-400)' }}>{card.debug.model}</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>{t.dashboard.rawPrompt}:</strong>
              <pre style={{
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '10px',
                color: 'var(--prism-text-muted)'
              }}>
                {card.debug.prompt}
              </pre>
            </div>

            <div>
              <strong>{t.dashboard.rawResponse}:</strong>
              <pre style={{
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '10px',
                color: 'var(--prism-text-secondary)'
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
