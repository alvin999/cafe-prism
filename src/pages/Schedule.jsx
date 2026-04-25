import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, runResearchPipeline, sendTelegram, formatTelegramMessage } from '../lib/engine.js';

function computeNextRun(hour, frequency, dayOfWeek) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else {
    // weekly
    const diff = (dayOfWeek - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + diff);
    if (diff === 7 && next <= now) next.setDate(next.getDate() + 7);
  }
  return next;
}

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
  const [nextRun, setNextRun] = useState(null);
  const [timerId, setTimerId] = useState(null);

  useEffect(() => {
    const stored = Storage.getSchedule();
    if (Object.keys(stored).length > 0) setSched(prev => ({ ...prev, ...stored }));
  }, []);

  useEffect(() => {
    if (sched.enabled) {
      const next = computeNextRun(sched.hour, sched.frequency, sched.dayOfWeek);
      setNextRun(next);
      const ms = next - new Date();
      const id = setTimeout(() => triggerScheduledRun(), ms);
      setTimerId(id);
      return () => clearTimeout(id);
    } else {
      setNextRun(null);
    }
  }, [sched.enabled, sched.hour, sched.frequency, sched.dayOfWeek]);

  const triggerScheduledRun = async () => {
    const settings = Storage.getSettings();
    try {
      const cards = await runResearchPipeline({ ...settings, language: lang }, () => {});
      Storage.addHistory(cards);
      if (sched.notifyTelegram && settings.botToken && settings.chatId) {
        const msg = formatTelegramMessage(cards, lang);
        await sendTelegram(settings.botToken, settings.chatId, msg);
      }
    } catch (e) {
      console.error('Scheduled run failed:', e);
    }
  };

  const save = () => {
    Storage.saveSchedule(sched);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
      onClick={() => update(fieldKey, !sched[fieldKey])}
      style={{
        width: '36px', height: '20px', borderRadius: '10px', border: 'none',
        background: sched[fieldKey] ? 'rgba(180,140,80,0.5)' : 'rgba(255,255,255,0.1)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: sched[fieldKey] ? '16px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  );

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '9px 12px', color: '#d0c8b0', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  };

  const days = lang === 'zh'
    ? ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <h1 style={{ margin: '0 0 28px', fontSize: '22px', fontWeight: 600, color: '#f0e8d0', letterSpacing: '-0.02em' }}>
        {t.schedule.title}
      </h1>

      {/* Enable */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', padding: '20px 24px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', color: '#c0b898', fontWeight: 500 }}>{t.schedule.enabled}</p>
          {nextRun && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#605040' }}>
              {t.schedule.nextRun}: {nextRun.toLocaleString()}
            </p>
          )}
        </div>
        <Toggle fieldKey="enabled" />
      </div>

      {/* Frequency */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#a09070', marginBottom: '8px' }}>
          {t.schedule.frequency}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['daily', 'weekly'].map(f => (
            <button
              key={f}
              onClick={() => update('frequency', f)}
              style={{
                padding: '9px 20px', borderRadius: '8px',
                border: sched.frequency === f ? '1px solid rgba(180,140,80,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: sched.frequency === f ? 'rgba(180,140,80,0.1)' : 'rgba(255,255,255,0.03)',
                color: sched.frequency === f ? '#c8a060' : '#706050',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {f === 'daily' ? t.schedule.daily : t.schedule.weekly}
            </button>
          ))}
        </div>
      </div>

      {/* Hour */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#a09070', marginBottom: '8px' }}>
          {t.schedule.time}: <span style={{ color: '#c8a060', fontWeight: 500 }}>{String(sched.hour).padStart(2, '0')}:00</span>
        </label>
        <input
          type="range" min="0" max="23" value={sched.hour}
          onChange={e => update('hour', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#c8a060' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#504030', marginTop: '4px' }}>
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>
      </div>

      {/* Day of week (weekly only) */}
      {sched.frequency === 'weekly' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#a09070', marginBottom: '8px' }}>
            {lang === 'zh' ? '執行日' : 'Day'}
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => update('dayOfWeek', i)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
                  border: sched.dayOfWeek === i ? '1px solid rgba(180,140,80,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  background: sched.dayOfWeek === i ? 'rgba(180,140,80,0.1)' : 'rgba(255,255,255,0.03)',
                  color: sched.dayOfWeek === i ? '#c8a060' : '#706050',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{d}</button>
            ))}
          </div>
        </div>
      )}

      {/* Telegram notify */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Toggle fieldKey="notifyTelegram" />
        <span style={{ fontSize: '13px', color: '#a09070' }}>{t.schedule.notifyTelegram}</span>
      </div>

      {/* Keyword subscriptions */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{
          fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#806040',
          margin: '0 0 14px', paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {lang === 'zh' ? '論文關鍵字訂閱' : 'Paper keyword subscriptions'}
        </h2>
        <p style={{ fontSize: '12px', color: '#504030', marginBottom: '12px' }}>
          {lang === 'zh'
            ? '新論文符合以下關鍵字時，自動發送 Telegram 通知'
            : 'Receive Telegram alerts when new papers match these keywords'}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder={lang === 'zh' ? '例：cold brew, caffeine metabolism' : 'e.g. cold brew, caffeine metabolism'}
          />
          <button
            onClick={addKeyword}
            style={{
              background: 'rgba(180,140,80,0.1)', border: '1px solid rgba(180,140,80,0.25)',
              borderRadius: '8px', color: '#c8a060', padding: '9px 16px',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >+</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sched.subscriptions.map(kw => (
            <span key={kw} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(128,100,64,0.12)', border: '1px solid rgba(128,100,64,0.25)',
              borderRadius: '20px', padding: '4px 12px',
              fontSize: '12px', color: '#a08050',
            }}>
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                style={{ background: 'none', border: 'none', color: '#604030', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }}
              >×</button>
            </span>
          ))}
          {sched.subscriptions.length === 0 && (
            <span style={{ fontSize: '12px', color: '#403020' }}>
              {lang === 'zh' ? '尚無訂閱關鍵字' : 'No keyword subscriptions yet'}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={save}
        style={{
          background: saved ? 'rgba(74,153,103,0.15)' : 'rgba(180,140,80,0.15)',
          border: `1px solid ${saved ? 'rgba(74,153,103,0.3)' : 'rgba(180,140,80,0.3)'}`,
          borderRadius: '8px',
          color: saved ? '#4a9967' : '#c8a060',
          padding: '10px 28px', fontSize: '14px',
          fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {saved ? (lang === 'zh' ? '已儲存！' : 'Saved!') : (lang === 'zh' ? '儲存排程' : 'Save schedule')}
      </button>
    </div>
  );
}
