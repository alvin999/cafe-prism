import { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import SourceChip from './SourceChip.jsx';
import { sanitizeHtmlText, safeUrl } from '../../lib/utils/sanitize.js';

const CardIcons = {
  Insight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  ),
  Craft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  ),
  External: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
};

export default function ResearchCard({ card, t }) {
  const [expanded, setExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const hasSidebarContent =
    !card.noModel &&
    Boolean(card.fun_fact || card.practical_tip || (card.keyTerms && card.keyTerms.length > 0));

  const renderSummary = (text) => {
    if (!text) return null;
    return text.split('\n').filter(Boolean).map((line, i) => {
      const isUncertain = line.includes('⚠');
      return (
        <p key={i} style={{
          margin: '0 0 12px 0',
          fontSize: '14.5px',
          lineHeight: 1.78,
          color: isUncertain ? 'var(--prism-warning)' : 'var(--prism-text-secondary)',
          paddingLeft: isUncertain ? '12px' : '0',
          borderLeft: isUncertain ? '2px solid var(--prism-warning)' : 'none',
        }}>
          {line}
        </p>
      );
    });
  };

  return (
    <article className="prism-card prism-card-interactive animate-fade-in">
      {/* ─── Top Meta Telemetry Row ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <ConfidenceBadge level={card.confidence} t={t} />

        {card.isSample && (
          <span className="prism-badge" style={{
            background: 'rgba(168, 85, 247, 0.12)',
            color: '#c084fc',
            border: '1px solid rgba(168, 85, 247, 0.28)',
          }}>
            ✦ {t.dashboard.sampleBadge || '示範範例'}
          </span>
        )}

        {card.crossVerified && (
          <span className="prism-badge prism-badge-success">
            ✓ {t.dashboard.crossVerified}
          </span>
        )}

        {card.hasConflict && (
          <span className="prism-badge prism-badge-warning">
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
            ⚠ {t.dashboard.card.incomplete}
          </span>
        )}

        {card.noModel && (
          <span className={`prism-badge ${card.llmError ? 'prism-badge-danger' : 'prism-badge-warning'}`}>
            {card.llmError ? '⚠' : '🔌'} {card.llmError ? t.dashboard.modelErrorBadge : t.dashboard.noModelBadge}
          </span>
        )}

        <span style={{
          marginLeft: 'auto',
          fontSize: '11px',
          color: 'var(--prism-text-dim)',
          fontFamily: 'var(--prism-font-mono)',
          letterSpacing: '0.04em'
        }}>
          #{card.hash}
        </span>
      </div>

      {/* ─── Editorial Headline ────────────────────────────────────────── */}
      <h3 style={{
        margin: '0 0 20px 0',
        fontFamily: 'var(--prism-font-display)',
        fontSize: '20px',
        fontWeight: 650,
        color: 'var(--prism-text-primary)',
        lineHeight: 1.4,
        letterSpacing: '-0.015em'
      }}>
        {card.primaryTitle || card.subject || t.dashboard.card.untitled}
      </h3>

      {/* ─── Main Editorial Body (Desktop 2-Column Asymmetric Grid) ───── */}
      <div className={hasSidebarContent ? 'prism-editorial-grid' : undefined}>
        {/* Left Column: Narrative Summary & Analytical Matrix */}
        <div>
          <div style={{ marginBottom: '18px' }}>
            {card.noModel ? (
              <div style={{
                color: card.llmError ? 'var(--prism-danger)' : 'var(--prism-text-muted)',
                background: card.llmError ? 'var(--prism-danger-bg)' : 'var(--prism-bg-recessed)',
                padding: '14px 18px',
                borderRadius: 'var(--prism-radius-md)',
                border: `1px solid ${card.llmError ? 'var(--prism-danger-border)' : 'var(--prism-border-subtle)'}`,
                fontSize: '13px',
                lineHeight: 1.65,
              }}>
                {card.llmError ? (
                  <>
                    <strong style={{ color: 'var(--prism-danger)' }}>{t.dashboard.card.aiConnErrorPrefix}</strong>
                    {card.errorDetail || t.dashboard.card.checkModelSettings}
                  </>
                ) : (
                  t.dashboard.card.noModelRawNotice
                )}
              </div>
            ) : card.incomplete ? (
              <div style={{
                color: 'var(--prism-danger)',
                background: 'var(--prism-danger-bg)',
                padding: '14px 18px',
                borderRadius: 'var(--prism-radius-md)',
                border: '1px solid var(--prism-danger-border)',
                fontSize: '13.5px',
                lineHeight: 1.65
              }}>
                {t.dashboard.incompleteData}
              </div>
            ) : renderSummary(card.summary)}
          </div>

          {/* Analytical Matrix: Consensus / Conflicts / Uncertainty */}
          {!card.noModel && (card.consensus || card.conflicts || card.uncertainty) && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '14px 18px',
              background: 'rgba(255, 255, 255, 0.015)',
              borderRadius: 'var(--prism-radius-md)',
              border: '1px solid var(--prism-border-subtle)',
              borderLeft: '2px solid var(--prism-border-accent)'
            }}>
              {card.consensus && (
                <div style={{ fontSize: '13px', color: 'var(--prism-text-secondary)', lineHeight: 1.6 }}>
                  <span style={{
                    fontFamily: 'var(--prism-font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--prism-success)',
                    fontWeight: 600,
                    marginRight: '8px'
                  }}>
                    [✓ {t.dashboard.consensus}]
                  </span>
                  {card.consensus}
                </div>
              )}
              {card.conflicts && (
                <div style={{ fontSize: '13px', color: 'var(--prism-text-secondary)', lineHeight: 1.6 }}>
                  <span style={{
                    fontFamily: 'var(--prism-font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--prism-warning)',
                    fontWeight: 600,
                    marginRight: '8px'
                  }}>
                    [⚠ {t.dashboard.conflicts}]
                  </span>
                  {card.conflicts}
                </div>
              )}
              {card.uncertainty && (
                <div style={{ fontSize: '13px', color: 'var(--prism-text-muted)', lineHeight: 1.6 }}>
                  <span style={{
                    fontFamily: 'var(--prism-font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--prism-text-dim)',
                    fontWeight: 600,
                    marginRight: '8px'
                  }}>
                    [? {t.dashboard.uncertainty}]
                  </span>
                  {card.uncertainty}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Insights & Key Terms */}
        {hasSidebarContent && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {card.fun_fact && (
              <div className="prism-insight-slot">
                <div style={{
                  fontFamily: 'var(--prism-font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--prism-amber-400)'
                }}>
                  <CardIcons.Insight />
                  {t.dashboard.card.funFact}
                </div>
                <div>{card.fun_fact}</div>
              </div>
            )}

            {card.practical_tip && (
              <div className="prism-insight-slot is-practical">
                <div style={{
                  fontFamily: 'var(--prism-font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--prism-success)'
                }}>
                  <CardIcons.Craft />
                  {t.dashboard.card.practicalTip}
                </div>
                <div>{card.practical_tip}</div>
              </div>
            )}

            {card.keyTerms && card.keyTerms.length > 0 && (
              <div style={{ paddingTop: '4px' }}>
                <div style={{
                  fontFamily: 'var(--prism-font-mono)',
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--prism-text-dim)',
                  marginBottom: '8px'
                }}>
                  {t.dashboard.keyTerms}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {card.keyTerms.map((term, i) => (
                    <span key={i} className="prism-badge prism-badge-amber" style={{ fontSize: '11px' }}>
                      #{term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ─── Card Footer: Sources & Telemetry Drawer ───────────────────── */}
      <div style={{
        marginTop: '22px',
        paddingTop: '14px',
        borderTop: '1px solid var(--prism-border-subtle)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--prism-font-mono)',
              fontSize: '11px',
              color: 'var(--prism-text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              {t.dashboard.sources}:
            </span>
            {[...new Set(card.articles.map(a => a.source))].map(s => <SourceChip key={s} source={s} />)}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setExpanded(!expanded)}
              className="prism-btn prism-btn-ghost prism-btn-sm"
            >
              {expanded ? '▲' : '▶'} {t.dashboard.card.showSources} ({card.articles.length})
            </button>

            {import.meta.env.DEV && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="prism-btn prism-btn-ghost prism-btn-sm"
                style={{ color: 'var(--prism-text-dim)', fontFamily: 'var(--prism-font-mono)' }}
              >
                {showDebug ? '▲' : '▶'} {t.dashboard.debugInfo}
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="animate-fade-in" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {card.articles.map((a, i) => (
              <div key={i} style={{
                background: 'var(--prism-bg-recessed)',
                borderRadius: 'var(--prism-radius-md)',
                padding: '12px 16px',
                border: '1px solid var(--prism-border-subtle)',
                borderLeft: '2px solid var(--prism-amber-600)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontFamily: 'var(--prism-font-mono)', fontSize: '11px', color: 'var(--prism-text-dim)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <SourceChip source={a.source} />
                    <span style={{ fontSize: '13px', color: 'var(--prism-text-primary)', fontWeight: 500 }}>
                      {sanitizeHtmlText(a.title)}
                    </span>
                  </div>
                  <a
                    href={safeUrl(a.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11.5px',
                      fontFamily: 'var(--prism-font-mono)',
                      color: 'var(--prism-amber-400)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    {t.dashboard.viewSource} <CardIcons.External />
                  </a>
                </div>
                {(a.description || a.snippet) && (
                  <p style={{ fontSize: '12px', color: 'var(--prism-text-muted)', margin: 0, lineHeight: 1.55 }}>
                    {sanitizeHtmlText(a.description || a.snippet).slice(0, 220)}…
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {import.meta.env.DEV && showDebug && card.debug && (
          <div className="animate-fade-in" style={{
            marginTop: '12px',
            padding: '14px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 'var(--prism-radius-md)',
            border: '1px dashed var(--prism-border-medium)',
            fontSize: '11px',
            fontFamily: 'var(--prism-font-mono)',
            color: 'var(--prism-text-secondary)'
          }}>
            <div style={{ marginBottom: '10px', borderBottom: '1px solid var(--prism-border-subtle)', paddingBottom: '6px' }}>
              <strong>{t.dashboard.modelUsed}:</strong> <span style={{ color: 'var(--prism-amber-400)' }}>{card.debug.model}</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>{t.dashboard.rawPrompt}:</strong>
              <pre style={{
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.35)',
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
                background: 'rgba(0,0,0,0.35)',
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
    </article>
  );
}