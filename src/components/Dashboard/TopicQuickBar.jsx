import { useState, useEffect } from 'react';
import { Storage } from '../../lib/engine.js';

export default function TopicQuickBar({ t }) {
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

  return (
    <div className="prism-card prism-topic-bar animate-fade-in">
      <div className="prism-topic-bar-header">
        {/* 左側：模式選擇 Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="prism-topic-bar-title">
            {topicT.title || '探索主題策略'}:
          </span>

          <div className="prism-topic-pill-group">
            <button
              type="button"
              onClick={() => handleModeSwitch(true)}
              className={`prism-topic-pill-btn ${discoveryMode ? 'is-active' : ''}`}
            >
              {topicT.switchToSmart || '✨ 智慧探索'}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch(false)}
              className={`prism-topic-pill-btn ${!discoveryMode ? 'is-active' : ''}`}
            >
              {topicT.switchToCustom || '🎯 自訂主題'}
            </button>
          </div>
        </div>

        {/* 右側：狀態說明或反饋 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedBadge && (
            <span
              style={{
                fontSize: '11.5px',
                color: 'var(--prism-success)',
                animation: 'fade-in 0.2s ease',
              }}
            >
              ✓ 已儲存
            </span>
          )}
        </div>
      </div>

      {/* 下方內容展開 */}
      {discoveryMode ? (
        <div className="prism-topic-desc-box">
          <span>{topicT.smartActive || '✨ 智慧探索模式（自動鎖定全球最新熱門論文、社群與產業焦點）'}</span>
        </div>
      ) : (
        <div className="prism-topic-custom-box">
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <input
                className="prism-input"
                style={{ flex: 1, fontSize: '12px', padding: '6px 12px' }}
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
                <span style={{ fontSize: '12px', color: 'var(--prism-text-secondary)', fontWeight: 500 }}>
                  {topicT.customActive || '🎯 當前主題'}:
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
                ✎ {topicT.edit || '編輯主題'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
