import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, sendTelegram, fetchOllamaModels, fetchGroqModels } from '../lib/engine.js';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{
        fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#806040',
        margin: '0 0 16px', paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', color: '#a09070', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: '11px', color: '#504030', margin: '5px 0 0' }}>{hint}</p>}
    </div>
  );
}

const theme = {
  inputBg: 'rgba(255, 255, 255, 0.06)',
  inputBorder: '1px solid rgba(255, 255, 255, 0.15)',
  inputColor: '#ffffff',
  accent: '#c8a060',
  optionBg: '#1a1814', // 深色背景，確保下拉選單可讀性
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: theme.inputBg,
  border: theme.inputBorder,
  borderRadius: '8px', padding: '9px 12px',
  color: theme.inputColor, fontSize: '13px',
  fontFamily: '"Instrument Sans", system-ui, sans-serif',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'none' };
const optionStyle = { background: theme.optionBg, color: theme.inputColor };
const FALLBACK_MODELS = {
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
    { id: 'o1-preview', name: 'o1 Preview' },
    { id: 'o1-mini', name: 'o1 Mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
};

export default function Settings() {
  const { t, lang } = useLang();
  const [s, setS] = useState({
    modelType: 'cloud',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    apiKey: '',
    botToken: '',
    chatId: '',
    keywords: 'espresso extraction, coffee brewing, roasting',
    discoveryMode: false,
    enablePapers: true,
    enableNews: true,
    enableReddit: true,
    autoTelegram: false,
  });
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [cloudModels, setCloudModels] = useState([]);
  const [fetchingCloud, setFetchingCloud] = useState(false);

  useEffect(() => {
    const stored = Storage.getSettings();
    if (Object.keys(stored).length > 0) setS(prev => ({ ...prev, ...stored }));
  }, []);

  useEffect(() => {
    if (s.modelType === 'local') {
      refreshModels();
    }
  }, [s.modelType, s.ollamaUrl]);

  const refreshModels = async () => {
    setLoadingModels(true);
    try {
      const models = await fetchOllamaModels(s.ollamaUrl);
      setOllamaModels(models.map(m => m.name));
    } catch (e) {
      setOllamaModels([]);
      console.error('Failed to fetch Ollama models:', e);
    } finally {
      setLoadingModels(false);
    }
  };

  const refreshCloudModels = async () => {
    if (s.provider !== 'groq' || !s.apiKey) return;
    setFetchingCloud(true);
    try {
      const models = await fetchGroqModels(s.apiKey);
      setCloudModels(models);
      // If current selected model is not in the new list, pick the first one
      if (models.length > 0 && !models.find(m => m.id === s.model)) {
        update('model', models[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch cloud models:', e);
      setCloudModels([]);
    } finally {
      setFetchingCloud(false);
    }
  };

  useEffect(() => {
    if (s.modelType === 'cloud' && s.provider === 'groq' && s.apiKey.length > 10) {
      const timer = setTimeout(refreshCloudModels, 1000);
      return () => clearTimeout(timer);
    }
  }, [s.provider, s.apiKey, s.modelType]);

  const save = () => {
    Storage.saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const testTelegram = async () => {
    if (!s.botToken || !s.chatId) {
      setTestMsg(lang === 'zh' ? '請填入 Bot Token 和 Chat ID' : 'Please fill in Bot Token and Chat ID');
      return;
    }
    setTesting(true);
    setTestMsg('');
    try {
      await sendTelegram(s.botToken, s.chatId,
        lang === 'zh'
          ? '🔮 CaféPrism 稜咖 測試訊息 — 設定成功！'
          : '🔮 CaféPrism test message — setup successful!'
      );
      setTestMsg(lang === 'zh' ? '✓ 測試訊息已送出！' : '✓ Test message sent!');
    } catch (e) {
      setTestMsg(`✗ ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const Toggle = ({ fieldKey }) => (
    <button
      onClick={() => update(fieldKey, !s[fieldKey])}
      style={{
        width: '36px', height: '20px', borderRadius: '10px', border: 'none',
        background: s[fieldKey] ? 'rgba(180,140,80,0.5)' : 'rgba(255,255,255,0.1)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: s[fieldKey] ? '16px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  );

  return (
    <div>
      <h1 style={{ margin: '0 0 28px', fontSize: '22px', fontWeight: 600, color: '#f0e8d0', letterSpacing: '-0.02em' }}>
        {t.settings.title}
      </h1>

      {/* AI Model */}
      <Section title={t.settings.modelSection}>
        <Field label={t.settings.modelType}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['local', 'cloud'].map(type => (
              <button
                key={type}
                onClick={() => update('modelType', type)}
                style={{
                  flex: 1, padding: '9px', borderRadius: '8px',
                  border: s.modelType === type ? '1px solid rgba(180,140,80,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  background: s.modelType === type ? 'rgba(180,140,80,0.1)' : 'rgba(255,255,255,0.03)',
                  color: s.modelType === type ? '#c8a060' : '#706050',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {type === 'local' ? t.settings.local : t.settings.cloud}
              </button>
            ))}
          </div>
        </Field>

        {s.modelType === 'local' ? (
          <>
            <Field label={t.settings.ollamaUrl}>
              <input style={inputStyle} value={s.ollamaUrl} onChange={e => update('ollamaUrl', e.target.value)} />
            </Field>
            <Field label={t.settings.ollamaModel}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  style={{ ...selectStyle, flex: 1 }}
                  value={s.ollamaModel}
                  onChange={e => update('ollamaModel', e.target.value)}
                >
                  {ollamaModels.length > 0 ? (
                    ollamaModels.map(m => <option key={m} value={m} style={optionStyle}>{m}</option>)
                  ) : (
                    <option value="" style={optionStyle}>{loadingModels ? '...' : (lang === 'zh' ? '未偵測到模型' : 'No models found')}</option>
                  )}
                  <option value={s.ollamaModel} style={optionStyle}>{s.ollamaModel} (手動輸入)</option>
                </select>
                <button
                  onClick={refreshModels}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: '#a09070', padding: '0 12px', cursor: 'pointer'
                  }}
                >
                  ↻
                </button>
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label={t.settings.provider}>
              <select style={selectStyle} value={s.provider} onChange={e => {
                const p = e.target.value;
                update('provider', p);
                // Auto-select first model from the new provider if possible
                if (FALLBACK_MODELS[p]) update('model', FALLBACK_MODELS[p][0].id);
              }}>
                <option value="groq" style={optionStyle}>Groq (免費額度 / Free tier)</option>
                <option value="openai" style={optionStyle}>OpenAI</option>
                <option value="anthropic" style={optionStyle}>Anthropic Claude</option>
              </select>
            </Field>
            <Field label={t.settings.model}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  style={{ ...selectStyle, flex: 1 }}
                  value={s.model}
                  onChange={e => update('model', e.target.value)}
                >
                  {s.provider === 'groq' && cloudModels.length > 0 ? (
                    cloudModels.map(m => <option key={m.id} value={m.id} style={optionStyle}>{m.name}</option>)
                  ) : (
                    (FALLBACK_MODELS[s.provider] || []).map(m => (
                      <option key={m.id} value={m.id} style={optionStyle}>{m.name}</option>
                    ))
                  )}
                </select>
                {s.provider === 'groq' && (
                  <button
                    onClick={refreshCloudModels}
                    disabled={fetchingCloud || !s.apiKey}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', color: '#a09070', padding: '0 12px', cursor: 'pointer',
                      opacity: (fetchingCloud || !s.apiKey) ? 0.5 : 1
                    }}
                  >
                    {fetchingCloud ? '...' : '↻'}
                  </button>
                )}
              </div>
            </Field>
            <Field label={t.settings.apiKey} hint={t.settings.apiKeyHint}>
              <input
                style={inputStyle} type="password"
                value={s.apiKey} onChange={e => update('apiKey', e.target.value)}
                placeholder="sk-..."
              />
            </Field>
          </>
        )}
      </Section>

      {/* Sources */}
      <Section title={t.settings.sourcesSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Toggle fieldKey="discoveryMode" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: '#a09070' }}>{t.settings.discoveryMode}</span>
            <span style={{ fontSize: '11px', color: '#504030' }}>{t.settings.discoveryHint}</span>
          </div>
        </div>

        <Field label={t.settings.keywords}>
          <input
            style={{ ...inputStyle, opacity: s.discoveryMode ? 0.4 : 1 }}
            value={s.keywords}
            onChange={e => update('keywords', e.target.value)}
            placeholder="espresso, pour over, roasting..."
            disabled={s.discoveryMode}
          />
        </Field>
        {[
          { key: 'enablePapers', label: t.settings.enablePapers },
          { key: 'enableNews', label: t.settings.enableNews },
          { key: 'enableReddit', label: t.settings.enableReddit },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Toggle fieldKey={key} />
            <span style={{ fontSize: '13px', color: '#a09070' }}>{label}</span>
          </div>
        ))}
      </Section>

      {/* Telegram */}
      <Section title={t.settings.telegramSection}>
        <Field label={t.settings.botToken} hint={t.settings.telegramHint}>
          <input style={inputStyle} type="password" value={s.botToken} onChange={e => update('botToken', e.target.value)} placeholder="1234567890:AAF..." />
        </Field>
        <Field label={t.settings.chatId}>
          <input style={inputStyle} value={s.chatId} onChange={e => update('chatId', e.target.value)} placeholder="-100123456789 or @username" />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Toggle fieldKey="autoTelegram" />
          <span style={{ fontSize: '13px', color: '#a09070' }}>
            {lang === 'zh' ? '抓取後自動推送 Telegram' : 'Auto-send to Telegram after fetch'}
          </span>
        </div>

        <button
          onClick={testTelegram}
          disabled={testing}
          style={{
            background: 'rgba(74,153,103,0.1)', border: '1px solid rgba(74,153,103,0.25)',
            borderRadius: '8px', color: '#4a9967', padding: '9px 18px',
            fontSize: '13px', fontFamily: 'inherit', cursor: testing ? 'not-allowed' : 'pointer',
          }}
        >
          {testing ? '…' : t.settings.testTelegram}
        </button>
        {testMsg && (
          <p style={{
            marginTop: '8px', fontSize: '12px',
            color: testMsg.startsWith('✓') ? '#4a9967' : '#c07060',
          }}>{testMsg}</p>
        )}
      </Section>

      {/* Save */}
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
        {saved ? t.settings.saved : t.settings.save}
      </button>
    </div>
  );
}
