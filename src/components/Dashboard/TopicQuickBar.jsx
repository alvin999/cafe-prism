import { useState, useEffect } from 'react';
import { Storage } from '../../lib/engine.js';

const Icons = {
  Sparkles: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  Target: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Edit: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
};

export default function TopicQuickBar({ t, embedded = false }) {
  const [discoveryMode, setDiscoveryMode] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [tempKeywords, setTempKeywords] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  const loadSettings = () => {
    const s = Storage.getSettings();
    const isDisc = s.discoveryMode !== false;
    const kw = s.keywords || 'espresso extraction, coffee brewing, roasting';
    setDiscoveryMode(isDisc);
    setKeywords(kw);
    setTempKeywords(kw);
  };

  useEffect(() => {
    loadSettings();

    const handleUpdate = () => loadSettings();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cr:settings-updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('cr:settings-updated', handleUpdate);
    };
  }, []);

  const handleModeSwitch = async (mode) => {
    const current = Storage.getSettings();
    const updated = {
      ...current,
      discoveryMode: mode,
    };
    await Storage.saveSettings(updated);
    setDiscoveryMode(mode);
    window.dispatchEvent(new Event('cr:settings-updated'));
  };

  const handleSaveKeywords = async () => {
    const trimmed = tempKeywords.trim();
    const current = Storage.getSettings();
    const updated = {
      ...current,
      keywords: trimmed || 'espresso extraction, coffee brewing, roasting',
    };
    await Storage.saveSettings(updated);
    setKeywords(trimmed || 'espresso extraction, coffee brewing, roasting');
    setIsEditing(false);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
    window.dispatchEvent(new Event('cr:settings-updated'));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveKeywords();
    } else if (e.key === 'Escape') {
      setTempKeywords(keywords);
      setIsEditing(false);
    }
  };

  const topicT = t?.dashboard?.topicBar || {};
  // 移除字串開頭可能帶有的 Emoji，交由精緻 SVG 呈現
  const cleanLabel = (str, fallback) => (str || fallback).replace(/^[✨🎯✎\s]+/, '');

  return (
    <div
      className={embedded ? 'animate-fade-in' : 'prism-card prism-topic-bar animate-fade-in'}
      style={embedded ? { display: 'flex', flexDirection: 'column', gap: '10px' } : undefined}
    >
      <div className="prism-topic-bar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="prism-topic-bar-title">
            {topicT.title || 'DISCOVERY STRATEGY'}
          </span>

          <div className="prism-topic-pill-group">
            <button
              type="button"
              onClick={() => handleModeSwitch(true)}
              className={`prism-topic-pill-btn ${discoveryMode ? 'is-active' : ''}`}
            >
              <Icons.Sparkles />
              {cleanLabel(topicT.switchToSmart, '智慧探索')}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch(false)}
              className={`prism-topic-pill-btn ${!discoveryMode ? 'is-active' : ''}`}
            >
              <Icons.Target />
              {cleanLabel(topicT.switchToCustom, '自訂主題')}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedBadge && (
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'var(--prism-font-mono)',
                color: 'var(--prism-success)',
                animation: 'fade-in 0.2s ease',
              }}
            >
              ✓ SAVED
            </span>
          )}
        </div>
      </div>

      {discoveryMode ? (
        <div className="prism-topic-desc-box">
          <span style={{ color: 'var(--prism-amber-400)', display: 'inline-flex', flexShrink: 0 }}>
            <Icons.Sparkles />
          </span>
          <span>{cleanLabel(topicT.smartActive, '智慧探索模式（自動鎖定全球最新熱門論文、社群與產業焦點）')}</span>
        </div>
      ) : (
        <div className="prism-topic-custom-box">
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <input
                className="prism-input"
                style={{ flex: 1, fontSize: '12.5px', padding: '6px 12px' }}
                value={tempKeywords}
                onChange={(e) => setTempKeywords(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={topicT.placeholder || '輸入關鍵字（逗號分隔）...'}
                autoFocus
              />
              <button
                type="button"
                className="prism-btn prism-btn-primary prism-btn-sm"
                onClick={handleSaveKeywords}
              >
                {topicT.save || '儲存'}
              </button>
              <button
                type="button"
                className="prism-btn prism-btn-ghost prism-btn-sm"
                onClick={() => {
                  setTempKeywords(keywords);
                  setIsEditing(false);
                }}
              >
                {topicT.cancel || '取消'}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)', fontWeight: 500 }}>
                  {cleanLabel(topicT.customActive, '當前主題')}:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {keywords
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean)
                    .map((kw, i) => (
                      <span key={i} className="prism-badge prism-badge-amber">
                        {kw}
                      </span>
                    ))}
                </div>
              </div>

              <button
                type="button"
                className="prism-btn prism-btn-ghost prism-btn-sm"
                onClick={() => {
                  setTempKeywords(keywords);
                  setIsEditing(true);
                }}
              >
                <Icons.Edit />
                {cleanLabel(topicT.edit, '編輯主題')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}