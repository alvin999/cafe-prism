import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, computeNextRun, executeScheduledTask } from '../lib/engine.js';

export default function Schedule() {
  const { t, lang } = useLang();
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [newKeywords, setNewKeywords] = useState({});
  const [saved, setSaved] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [meta, setMeta] = useState({});

  useEffect(() => {
    const list = Storage.getScheduleProfiles();
    setProfiles(list);
    if (list.length > 0) {
      setActiveProfileId(list[0].id);
    }
    setMeta(Storage.getScheduleMeta());
  }, []);

  const saveAll = () => {
    Storage.saveScheduleProfiles(profiles);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateProfile = (id, key, val) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, [key]: val } : p));
  };

  const addProfile = () => {
    const newId = `profile_${Date.now()}`;
    const newProf = {
      id: newId,
      name: `${t.schedule.profileName || '新排程任務'} #${profiles.length + 1}`,
      enabled: true,
      frequency: 'daily',
      hour: 8,
      dayOfWeek: 1,
      subscriptions: [],
      sources: ['scholar', 'reddit', 'rss'],
      notifyTelegram: true,
    };
    const nextProfiles = [...profiles, newProf];
    setProfiles(nextProfiles);
    setActiveProfileId(newId);
  };

  const deleteProfile = (id) => {
    if (profiles.length <= 1) {
      alert(lang === 'zh' ? '至少需保留一組排程設定任務。' : 'You must keep at least one schedule profile.');
      return;
    }
    if (window.confirm(t.schedule.deleteConfirm || 'Are you sure you want to delete this schedule profile?')) {
      const nextProfiles = profiles.filter(p => p.id !== id);
      setProfiles(nextProfiles);
      if (activeProfileId === id) {
        setActiveProfileId(nextProfiles[0]?.id || null);
      }
      Storage.saveScheduleProfiles(nextProfiles);
    }
  };

  const runTestForProfile = async (id) => {
    setTestingId(id);
    try {
      await executeScheduledTask(false, id);
      setProfiles(Storage.getScheduleProfiles());
      setMeta(Storage.getScheduleMeta());
    } finally {
      setTestingId(null);
    }
  };

  const addKeyword = (profileId) => {
    const kw = (newKeywords[profileId] || '').trim();
    if (!kw) return;
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    if (profile.subscriptions.includes(kw)) return;

    updateProfile(profileId, 'subscriptions', [...profile.subscriptions, kw]);
    setNewKeywords(prev => ({ ...prev, [profileId]: '' }));
  };

  const removeKeyword = (profileId, kw) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    updateProfile(profileId, 'subscriptions', profile.subscriptions.filter(k => k !== kw));
  };

  const toggleSource = (profileId, sourceKey) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const currentSources = profile.sources || ['scholar', 'reddit', 'rss'];
    let nextSources;
    if (currentSources.includes(sourceKey)) {
      if (currentSources.length === 1) return; // 至少保留一個來源
      nextSources = currentSources.filter(s => s !== sourceKey);
    } else {
      nextSources = [...currentSources, sourceKey];
    }
    updateProfile(profileId, 'sources', nextSources);
  };

  const days = t.schedule.days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="animate-fade-in">
      {/* Editorial Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: '28px',
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
            AUTOMATED MULTI-TOPIC SCHEDULER // CAFÉPRISM
          </div>
          <h1 className="prism-page-title" style={{ margin: 0 }}>
            {t.schedule.title}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={addProfile}
            className="prism-btn prism-btn-ghost prism-btn-sm"
            style={{ fontSize: '12px' }}
          >
            + {t.schedule.addProfile}
          </button>
          <button
            type="button"
            onClick={saveAll}
            className={`prism-btn prism-btn-sm ${saved ? 'prism-btn-success' : 'prism-btn-primary'}`}
            style={{ minWidth: '120px', fontSize: '12px' }}
          >
            {saved ? (t.settings.savedSuccess || '✓ Saved') : t.schedule.saveBtn}
          </button>
        </div>
      </div>

      {/* Profiles List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '40px' }}>
        {profiles.map((profile, pIdx) => {
          const isExpanded = activeProfileId === profile.id;
          const nextRun = profile.enabled
            ? computeNextRun(profile.hour, profile.frequency, profile.dayOfWeek)
            : null;
          const isTesting = testingId === profile.id;

          return (
            <div
              key={profile.id}
              className="prism-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: isExpanded ? '1px solid var(--prism-border-accent)' : '1px solid var(--prism-border-subtle)',
                transition: 'all var(--prism-transition-fast)'
              }}
            >
              {/* Profile Card Header (Summary Bar) */}
              <div
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  background: isExpanded ? 'rgba(200, 160, 96, 0.03)' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveProfileId(isExpanded ? null : profile.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {/* Enable Switch */}
                  <button
                    type="button"
                    className={`prism-toggle ${profile.enabled ? 'is-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateProfile(profile.id, 'enabled', !profile.enabled);
                    }}
                    title={profile.enabled ? 'Enabled' : 'Disabled'}
                  >
                    <span className="prism-toggle-thumb" />
                  </button>

                  {/* Profile Title & Badge */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 650,
                        color: profile.enabled ? 'var(--prism-text-primary)' : 'var(--prism-text-dim)',
                        fontFamily: 'var(--prism-font-display)'
                      }}>
                        {profile.name || `Task #${pIdx + 1}`}
                      </span>
                      <span className="prism-badge prism-badge-ghost" style={{ fontSize: '10.5px' }}>
                        {profile.frequency === 'daily'
                          ? `${t.schedule.daily} ${String(profile.hour).padStart(2, '0')}:00`
                          : `${t.schedule.weekly} (${days[profile.dayOfWeek]}) ${String(profile.hour).padStart(2, '0')}:00`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', fontSize: '11.5px', fontFamily: 'var(--prism-font-mono)' }}>
                      {nextRun ? (
                        <span style={{ color: 'var(--prism-amber-400)' }}>
                          🕒 {t.schedule.nextRun}: {nextRun.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--prism-text-dim)' }}>
                          {t.schedule.disabled}
                        </span>
                      )}
                      {profile.lastRunTimestamp && (
                        <span style={{ color: 'var(--prism-text-dim)' }}>
                          • {t.schedule.lastRun}: {new Date(profile.lastRunTimestamp).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right quick stats and toggle chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'var(--prism-font-mono)',
                    color: 'var(--prism-text-dim)'
                  }}>
                    {profile.subscriptions?.length || 0} keywords • {(profile.sources || []).length} sources
                  </span>
                  <span style={{ color: 'var(--prism-amber-400)', fontSize: '11px', fontFamily: 'var(--prism-font-mono)' }}>
                    {isExpanded ? '▲ COLLAPSE' : '▼ EDIT'}
                  </span>
                </div>
              </div>

              {/* Profile Expanded Configuration Form */}
              {isExpanded && (
                <div className="animate-fade-in" style={{
                  padding: '22px 24px',
                  borderTop: '1px solid var(--prism-border-subtle)',
                  background: 'var(--prism-bg-recessed)'
                }}>
                  {/* Task Name Field */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--prism-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                      {t.schedule.profileName}
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={e => updateProfile(profile.id, 'name', e.target.value)}
                      placeholder={t.schedule.profileNamePlaceholder}
                      className="prism-input"
                      style={{ maxWidth: '460px' }}
                    />
                  </div>

                  {/* Frequency & Time Configuration */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginBottom: '22px'
                  }}>
                    {/* Frequency & Slider */}
                    <div style={{
                      padding: '16px',
                      background: 'var(--prism-bg-surface)',
                      borderRadius: 'var(--prism-radius-md)',
                      border: '1px solid var(--prism-border-subtle)'
                    }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--prism-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                        {t.schedule.frequency}
                      </label>
                      <div className="prism-topic-pill-group" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '3px', marginBottom: '16px' }}>
                        {['daily', 'weekly'].map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => updateProfile(profile.id, 'frequency', f)}
                            className={`prism-topic-pill-btn ${profile.frequency === f ? 'is-active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            {f === 'daily' ? t.schedule.daily : t.schedule.weekly}
                          </button>
                        ))}
                      </div>

                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--prism-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                        {t.schedule.time}: <strong style={{ fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-amber-400)' }}>{String(profile.hour).padStart(2, '0')}:00</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="23"
                        value={profile.hour}
                        onChange={e => updateProfile(profile.id, 'hour', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--prism-amber-500)', cursor: 'pointer' }}
                      />

                      {profile.frequency === 'weekly' && (
                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--prism-border-subtle)' }}>
                          <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--prism-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                            {t.schedule.day}
                          </label>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {days.map((d, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => updateProfile(profile.id, 'dayOfWeek', i)}
                                className={`prism-btn prism-btn-sm ${profile.dayOfWeek === i ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
                                style={{ fontFamily: 'var(--prism-font-mono)', fontSize: '11px', padding: '4px 8px' }}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sources & Telegram Toggle */}
                    <div style={{
                      padding: '16px',
                      background: 'var(--prism-bg-surface)',
                      borderRadius: 'var(--prism-radius-md)',
                      border: '1px solid var(--prism-border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--prism-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                          {t.schedule.targetSources}
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {[
                            { key: 'scholar', label: 'Semantic Scholar 🎓' },
                            { key: 'reddit', label: 'Reddit 💬' },
                            { key: 'rss', label: 'News / RSS 📰' },
                          ].map(src => {
                            const isSelected = (profile.sources || ['scholar', 'reddit', 'rss']).includes(src.key);
                            return (
                              <button
                                key={src.key}
                                type="button"
                                onClick={() => toggleSource(profile.id, src.key)}
                                className={`prism-btn prism-btn-sm ${isSelected ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
                                style={{ fontSize: '11.5px', padding: '5px 10px' }}
                              >
                                {isSelected ? '✓ ' : ''}{src.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--prism-border-subtle)' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--prism-text-secondary)' }}>
                          {t.schedule.notifyTelegram}
                        </span>
                        <button
                          type="button"
                          className={`prism-toggle ${profile.notifyTelegram ? 'is-active' : ''}`}
                          onClick={() => updateProfile(profile.id, 'notifyTelegram', !profile.notifyTelegram)}
                        >
                          <span className="prism-toggle-thumb" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Management */}
                  <div style={{
                    padding: '16px',
                    background: 'var(--prism-bg-surface)',
                    borderRadius: 'var(--prism-radius-md)',
                    border: '1px solid var(--prism-border-subtle)',
                    marginBottom: '20px'
                  }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--prism-text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      {t.schedule.keywordsTitle}
                    </label>
                    <p style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)', margin: '0 0 10px' }}>
                      {t.schedule.keywordsHint}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', maxWidth: '500px' }}>
                      <input
                        className="prism-input"
                        style={{ flex: 1, fontSize: '12.5px' }}
                        value={newKeywords[profile.id] || ''}
                        onChange={e => setNewKeywords({ ...newKeywords, [profile.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && addKeyword(profile.id)}
                        placeholder={t.schedule.keywordsPlaceholder}
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword(profile.id)}
                        className="prism-btn prism-btn-primary prism-btn-sm"
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(profile.subscriptions || []).map(kw => (
                        <span key={kw} className="prism-badge prism-badge-amber" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(profile.id, kw)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--prism-amber-600)',
                              cursor: 'pointer',
                              padding: '0 0 0 6px',
                              fontSize: '13px',
                              lineHeight: 1
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(!profile.subscriptions || profile.subscriptions.length === 0) && (
                        <span style={{ fontSize: '12px', color: 'var(--prism-text-dim)', fontStyle: 'italic' }}>
                          {t.schedule.noKeywords}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile Actions Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => deleteProfile(profile.id)}
                      className="prism-btn prism-btn-danger prism-btn-sm"
                      style={{ fontSize: '11.5px' }}
                    >
                      🗑️ {t.schedule.deleteProfile}
                    </button>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => runTestForProfile(profile.id)}
                        disabled={isTesting}
                        className="prism-btn prism-btn-ghost prism-btn-sm"
                        style={{ fontSize: '11.5px' }}
                      >
                        {isTesting ? (
                          <><span className="animate-spin">⟳</span> {t.schedule.testing}</>
                        ) : (
                          <>🧪 {t.schedule.testBtn}</>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={saveAll}
                        className="prism-btn prism-btn-primary prism-btn-sm"
                        style={{ fontSize: '11.5px' }}
                      >
                        {saved ? (t.settings.savedSuccess || '✓ Saved') : t.schedule.saveBtn}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
