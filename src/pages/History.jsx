import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../App.jsx';
import { Storage } from '../lib/engine.js';
import { safeUrl } from '../lib/utils/sanitize.js';

export default function History() {
  const { t, lang } = useLang();
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({
    searchQuery: '',
    confidence: 'all', // 'all' | 'high' | 'medium' | 'low'
    sourceType: 'all',  // 'all' | 'scholar' | 'reddit' | 'rss'
    sortBy: 'date-desc' // 'date-desc' | 'date-asc' | 'cards-desc'
  });

  useEffect(() => {
    setHistory(Storage.getHistory());
  }, []);

  const clear = () => {
    if (window.confirm(t.history.clearConfirm || 'Are you sure you want to clear history?')) {
      localStorage.removeItem('cr_history');
      setHistory([]);
      setExpanded(null);
    }
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      confidence: 'all',
      sourceType: 'all',
      sortBy: 'date-desc'
    });
  };

  const isFiltering = Boolean(
    filters.searchQuery.trim() ||
    filters.confidence !== 'all' ||
    filters.sourceType !== 'all' ||
    filters.sortBy !== 'date-desc'
  );

  const confColor = {
    high: 'var(--prism-success)',
    medium: 'var(--prism-warning)',
    low: 'var(--prism-danger)',
  };

  // 檢查個別卡片是否符合篩選條件
  const matchCard = (card, query, conf, srcType) => {
    if (conf !== 'all' && card.confidence !== conf) {
      return false;
    }

    if (srcType !== 'all') {
      const pSrc = card.primarySource || '';
      const articleSources = (card.articles || []).map(a => a.source || '');
      const allSrcs = [pSrc, ...articleSources];

      if (srcType === 'scholar' && !allSrcs.includes('semantic_scholar')) return false;
      if (srcType === 'reddit' && !allSrcs.includes('reddit')) return false;
      if (srcType === 'rss' && !allSrcs.includes('rss')) return false;
    }

    if (query) {
      const q = query.toLowerCase();
      const title = (card.primaryTitle || card.subject || '').toLowerCase();
      const summary = (card.summary || '').toLowerCase();
      const tip = (card.practicalTip || '').toLowerCase();
      const hash = (card.hash || '').toLowerCase();
      const consensus = (card.consensus || '').toLowerCase();
      const snippets = (card.articles || []).map(a => a.snippet || '').join(' ').toLowerCase();

      const combinedText = `${title} ${summary} ${tip} ${hash} ${consensus} ${snippets}`;
      if (!combinedText.includes(q)) return false;
    }

    return true;
  };

  // 篩選與排序計算
  const filteredHistory = useMemo(() => {
    const q = filters.searchQuery.trim();
    const conf = filters.confidence;
    const srcType = filters.sourceType;

    const list = history.map((entry, originalIdx) => {
      const allCards = entry.cards || [];
      const matchedCards = allCards.filter(c => matchCard(c, q, conf, srcType));
      return {
        ...entry,
        originalIdx,
        matchedCards,
        isMatch: (!q && conf === 'all' && srcType === 'all') ? true : matchedCards.length > 0
      };
    }).filter(entry => entry.isMatch);

    // 排序
    return list.sort((a, b) => {
      if (filters.sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (filters.sortBy === 'cards-desc') {
        return (b.matchedCards?.length || 0) - (a.matchedCards?.length || 0);
      }
      // 預設 date-desc
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [history, filters]);

  return (
    <div className="animate-fade-in">
      {/* Editorial Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: '24px',
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

      {/* Advanced Filter Toolbar */}
      {history.length > 0 && (
        <div
          className="prism-card"
          style={{
            marginBottom: '24px',
            padding: '18px 20px',
            background: 'var(--prism-bg-surface)',
            border: '1px solid var(--prism-border-subtle)',
            borderRadius: 'var(--prism-radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--prism-text-dim)',
                  fontSize: '13px',
                  pointerEvents: 'none'
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={filters.searchQuery}
                onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder={t.history.searchPlaceholder}
                className="prism-input"
                style={{
                  paddingLeft: '38px',
                  paddingRight: filters.searchQuery ? '36px' : '14px',
                  width: '100%',
                }}
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--prism-text-dim)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '2px 6px'
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {isFiltering && (
              <button
                type="button"
                onClick={resetFilters}
                className="prism-btn prism-btn-ghost prism-btn-sm"
                style={{ flexShrink: 0, fontSize: '12px' }}
              >
                {t.history.resetFilters}
              </button>
            )}
          </div>

          {/* Filter Chips & Controls */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '8px',
            borderTop: '1px solid var(--prism-border-subtle)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Source Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)' }}>
                  {t.history.filterSource}:
                </span>
                <select
                  value={filters.sourceType}
                  onChange={e => setFilters(prev => ({ ...prev, sourceType: e.target.value }))}
                  className="prism-select"
                  style={{ fontSize: '11.5px', padding: '4px 8px' }}
                >
                  <option value="all">{t.history.allSources}</option>
                  <option value="scholar">{t.history.sourceScholar}</option>
                  <option value="reddit">{t.history.sourceReddit}</option>
                  <option value="rss">{t.history.sourceRss}</option>
                </select>
              </div>

              {/* Confidence Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)' }}>
                  {t.history.filterConfidence}:
                </span>
                <select
                  value={filters.confidence}
                  onChange={e => setFilters(prev => ({ ...prev, confidence: e.target.value }))}
                  className="prism-select"
                  style={{ fontSize: '11.5px', padding: '4px 8px' }}
                >
                  <option value="all">{t.history.allConfidence}</option>
                  <option value="high">🟢 {t.history.confHigh}</option>
                  <option value="medium">🟡 {t.history.confMedium}</option>
                  <option value="low">🔴 {t.history.confLow}</option>
                </select>
              </div>

              {/* Sort By */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)' }}>
                  {t.history.sortBy}:
                </span>
                <select
                  value={filters.sortBy}
                  onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="prism-select"
                  style={{ fontSize: '11.5px', padding: '4px 8px' }}
                >
                  <option value="date-desc">{t.history.sortDateDesc}</option>
                  <option value="date-asc">{t.history.sortDateAsc}</option>
                  <option value="cards-desc">{t.history.sortCardsDesc}</option>
                </select>
              </div>
            </div>

            {/* Filtered Count Indicator */}
            {isFiltering && (
              <span style={{
                fontSize: '11.5px',
                fontFamily: 'var(--prism-font-mono)',
                color: 'var(--prism-amber-400)'
              }}>
                {(t.history.filteredCount || '')
                  .replace('{count}', filteredHistory.length)
                  .replace('{total}', history.length)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {history.length === 0 ? (
        <div className="prism-card" style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--prism-text-dim)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px', color: 'var(--prism-amber-500)', opacity: 0.6 }}>📋</div>
          <p style={{ fontSize: '13.5px', color: 'var(--prism-text-muted)', margin: 0 }}>{t.history.empty}</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="prism-card" style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--prism-text-dim)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.7 }}>🔎</div>
          <p style={{ fontSize: '13.5px', color: 'var(--prism-text-muted)', marginBottom: '16px' }}>{t.history.noMatches}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="prism-btn prism-btn-primary prism-btn-sm"
          >
            {t.history.resetFilters}
          </button>
        </div>
      ) : (
        filteredHistory.map((entry, idx) => {
          const displayCards = isFiltering ? entry.matchedCards : (entry.cards || []);
          return (
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
                    {displayCards.length}
                    {isFiltering && entry.cards?.length !== displayCards.length ? ` / ${entry.cards?.length}` : ''} {t.history.items}
                  </span>
                  {/* Mini confidence dots */}
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {displayCards.slice(0, 6).map((c, i) => (
                      <span
                        key={i}
                        title={`Confidence: ${c.confidence}`}
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
                  {displayCards.map((card, ci) => (
                    <div
                      key={ci}
                      style={{
                        marginBottom: '16px',
                        paddingBottom: '16px',
                        borderBottom: ci < displayCards.length - 1 ? '1px solid var(--prism-border-subtle)' : 'none',
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
                        {card.primarySource && (
                          <span
                            className="prism-badge prism-badge-ghost"
                            style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--prism-font-mono)' }}
                          >
                            {card.primarySource.replace('_', ' ')}
                          </span>
                        )}
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
                          {t.dashboard?.viewSource || 'View Source'} ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
