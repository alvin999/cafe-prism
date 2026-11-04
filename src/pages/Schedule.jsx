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
            AUTOMATED SCHEDULER // CAFÉPRISM
          </div>
          <h1 className="prism-page-title" style={{ margin: 0 }}>
            {t.schedule.title}
          </h1>
        </div>
      </div>

      {/* 01 // Master Enable Card */}
      <div className="prism-card prism-card-highlight" style={{
        marginBottom: '28px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--prism-text-primary)', fontWeight: 600 }}>
            {t.schedule.enabled}
          </p>
          {nextRun ? (
            <p style={{ margin: '6px 0 0', fontSize: '12.5px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-amber-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🕒</span> {t.schedule.nextRun}: <strong>{nextRun.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}</strong>
            </p>
          ) : (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--prism-text-muted)' }}>
              {t.schedule.disabled}
            </p>
          )}

          {meta.lastRunTimestamp && (
            <p style={{ margin: '6px 0 0', fontSize: '11.5px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)' }}>
              {t.schedule.lastRun}: {new Date(meta.lastRunTimestamp).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US')}
              {meta.lastRunType === 'catch_up' && <span className="prism-badge prism-badge-amber" style={{ marginLeft: '6px', fontSize: '10px' }}>{t.schedule.catchUp}</span>}
            </p>
          )}
        </div>
        <Toggle fieldKey="enabled" />
      </div>

      {/* 02 // Frequency & Timing Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div className="prism-card" style={{ padding: '22px 26px' }}>
          <h3 className="prism-section-title">FREQUENCY</h3>
          <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '10px', fontWeight: 500 }}>
            {t.schedule.frequency}
          </label>
          <div className="prism-topic-pill-group" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '4px', marginBottom: '20px' }}>
            {['daily', 'weekly'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => update('frequency', f)}
                className={`prism-topic-pill-btn ${sched.frequency === f ? 'is-active' : ''}`}
                style={{ padding: '8px 14px', fontSize: '12.5px' }}
              >
                {f === 'daily' ? t.schedule.daily : t.schedule.weekly}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
            {t.schedule.time}: <strong style={{ fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-amber-400)' }}>{String(sched.hour).padStart(2, '0')}:00</strong>
          </label>
          <input
            type="range"
            min="0"
            max="23"
            value={sched.hour}
            onChange={e => update('hour', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--prism-amber-500)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)', marginTop: '6px' }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>

          {sched.frequency === 'weekly' && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--prism-border-subtle)' }} className="animate-fade-in">
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                {t.schedule.day}
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {days.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => update('dayOfWeek', i)}
                    className={`prism-btn prism-btn-sm ${sched.dayOfWeek === i ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
                    style={{ fontFamily: 'var(--prism-font-mono)', fontSize: '11px' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 03 // Notification & Subscriptions */}
        <div className="prism-card" style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="prism-section-title">DISPATCH & TOPICS</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: 'var(--prism-text-secondary)', fontWeight: 500 }}>
              {t.schedule.notifyTelegram}
            </span>
            <Toggle fieldKey="notifyTelegram" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
              {t.schedule.keywordsTitle}
            </label>
            <p style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)', margin: '0 0 10px' }}>
              {t.schedule.keywordsHint}
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                className="prism-input"
                style={{ flex: 1, fontSize: '13px' }}
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()}
                placeholder={t.schedule.keywordsPlaceholder}
              />
              <button
                type="button"
                onClick={addKeyword}
                className="prism-btn prism-btn-primary prism-btn-sm"
              >
                +
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
              {sched.subscriptions.map(kw => (
                <span key={kw} className="prism-badge prism-badge-amber" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--prism-amber-600)',
                      cursor: 'pointer',
                      padding: '0 0 0 4px',
                      fontSize: '13px',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {sched.subscriptions.length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--prism-text-dim)', fontStyle: 'italic' }}>
                  {t.schedule.noKeywords}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '48px' }}>
        {sched.enabled && (
          <button
            type="button"
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
        <button
          type="button"
          onClick={save}
          className={`prism-btn ${saved ? 'prism-btn-success' : 'prism-btn-primary'}`}
          style={{ minWidth: '140px' }}
        >
          {saved ? t.settings.savedSuccess : t.schedule.saveBtn}
        </button>
      </div>
    </div>
  );
}