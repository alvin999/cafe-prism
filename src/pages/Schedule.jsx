import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, computeNextRun, executeScheduledTask } from '../lib/engine.js';

export default function Schedule() {
  const { t, lang } = useLang();
  const [sched, setSched] = useState({
    enabled: false,
    frequency: 'daily',
    hour: 8,
    dayOfWeek: 1,
    notifyTelegram: true,
    subscriptions: [],
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [saved, setSaved] = useState(false);
  const [meta, setMeta] = useState({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const stored = Storage.getSchedule();
    if (Object.keys(stored).length > 0) {
      setSched(prev => ({ ...prev, ...stored }));
    }
    setMeta(Storage.getScheduleMeta());
  }, []);

  const nextRun = sched.enabled
    ? computeNextRun(sched.hour, sched.frequency, sched.dayOfWeek)
    : null;

  const save = () => {
    Storage.saveSchedule(sched);
    // 廣播給全域排程器即時生效
    window.dispatchEvent(new CustomEvent('cr:schedule-updated'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const runTestNow = async () => {
    setTesting(true);
    try {
      await executeScheduledTask(false);
      setMeta(Storage.getScheduleMeta());
    } finally {
      setTesting(false);
    }
  };

  const update = (key, val) => setSched(prev => ({ ...prev, [key]: val }));

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw || sched.subscriptions.includes(kw)) return;
    update('subscriptions', [...sched.subscriptions, kw]);
    setNewKeyword('');
  };

  const removeKeyword = (kw) => update('subscriptions', sched.subscriptions.filter(k => k !== kw));

  const Toggle = ({ fieldKey }) => (
    <button
      type="button"
      className={`prism-toggle ${sched[fieldKey] ? 'is-active' : ''}`}
      onClick={() => update(fieldKey, !sched[fieldKey])}
      aria-label="Toggle"
    >
      <span className="prism-toggle-thumb" />
    </button>
  );

  const days = t.schedule.days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="animate-fade-in">
      <h1 className="prism-page-title">
        {t.schedule.title}
      </h1>

      {/* Enable Card */}
      <div className="prism-card prism-card-highlight" style={{
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--prism-text-primary)', fontWeight: 600 }}>
            {t.schedule.enabled}
          </p>
          {nextRun ? (
            <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--prism-amber-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🕒</span> {t.schedule.nextRun}: <strong>{nextRun.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}</strong>
            </p>
          ) : (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--prism-text-muted)' }}>
              {t.schedule.disabled}
            </p>
          )}

          {meta.lastRunTimestamp && (
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--prism-text-dim)' }}>
              {t.schedule.lastRun}: {new Date(meta.lastRunTimestamp).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
              {meta.lastRunType === 'catch_up' && <span className="prism-badge prism-badge-amber" style={{ marginLeft: '6px', fontSize: '10px' }}>{t.schedule.catchUp}</span>}
            </p>
          )}
        </div>
        <Toggle fieldKey="enabled" />
      </div>

      {/* Frequency */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--prism-text-secondary)', marginBottom: '8px' }}>
          {t.schedule.frequency}
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['daily', 'weekly'].map(f => (
            <button
              key={f}
              onClick={() => update('frequency', f)}
              className={`prism-btn ${sched.frequency === f ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
            >
              {f === 'daily' ? t.schedule.daily : t.schedule.weekly}
            </button>
          ))}
        </div>
      </div>

      {/* Hour */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--prism-text-secondary)', marginBottom: '8px' }}>
          {t.schedule.time}: <strong style={{ color: 'var(--prism-amber-400)' }}>{String(sched.hour).padStart(2, '0')}:00</strong>
        </label>
        <input
          type="range"
          min="0"
          max="23"
          value={sched.hour}
          onChange={e => update('hour', Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--prism-amber-500)', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--prism-text-dim)', marginTop: '6px' }}>
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
      </div>

      {/* Day of week (weekly only) */}
      {sched.frequency === 'weekly' && (
        <div style={{ marginBottom: '24px' }} className="animate-fade-in">
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--prism-text-secondary)', marginBottom: '8px' }}>
            {t.schedule.day}
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => update('dayOfWeek', i)}
                className={`prism-btn prism-btn-sm ${sched.dayOfWeek === i ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Telegram notify */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Toggle fieldKey="notifyTelegram" />
        <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)' }}>
          {t.schedule.notifyTelegram}
        </span>
      </div>

      {/* Keyword subscriptions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 className="prism-section-title">
          {t.schedule.keywordsTitle}
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--prism-text-muted)', marginBottom: '14px' }}>
          {t.schedule.keywordsHint}
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <input
            className="prism-input"
            style={{ flex: 1 }}
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder={t.schedule.keywordsPlaceholder}
          />
          <button
            onClick={addKeyword}
            className="prism-btn prism-btn-primary"
            style={{ padding: '0 20px', fontSize: '16px' }}
          >
            +
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sched.subscriptions.map(kw => (
            <span key={kw} className="prism-badge prism-badge-amber" style={{ padding: '5px 12px', fontSize: '12px' }}>
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--prism-amber-700)',
                  cursor: 'pointer',
                  padding: '0 0 0 4px',
                  fontSize: '14px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </span>
          ))}
          {sched.subscriptions.length === 0 && (
            <span style={{ fontSize: '12.5px', color: 'var(--prism-text-dim)' }}>
              {t.schedule.noKeywords}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={save}
          className={`prism-btn ${saved ? 'prism-btn-success' : 'prism-btn-primary'}`}
          style={{ minWidth: '130px' }}
        >
          {saved ? t.settings.savedSuccess : t.schedule.saveBtn}
        </button>

        {sched.enabled && (
          <button
            onClick={runTestNow}
            disabled={testing}
            className="prism-btn prism-btn-ghost"
          >
            {testing ? (
              <><span className="animate-spin">⟳</span> {t.schedule.testing}</>
            ) : (
              <>{t.schedule.testBtn}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
