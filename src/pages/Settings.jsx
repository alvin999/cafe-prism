import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, sendTelegram, fetchOllamaModels, fetchGroqModels } from '../lib/engine.js';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 className="prism-section-title">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '13px', color: 'var(--prism-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)', margin: '5px 0 0', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

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
      type="button"
      className={`prism-toggle ${s[fieldKey] ? 'is-active' : ''}`}
      onClick={() => update(fieldKey, !s[fieldKey])}
      aria-label="Toggle"
    >
      <span className="prism-toggle-thumb" />
    </button>
  );

  return (
    <div className="animate-fade-in">
      <h1 className="prism-page-title">
        {t.settings.title}
      </h1>

      {/* AI Model */}
      <Section title={t.settings.modelSection}>
        <Field label={t.settings.modelType}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['local', 'cloud'].map(type => (
              <button
                key={type}
                onClick={() => update('modelType', type)}
                className={`prism-btn ${s.modelType === type ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
                style={{ flex: 1 }}
              >
                {type === 'local' ? t.settings.local : t.settings.cloud}
              </button>
            ))}
          </div>
        </Field>

        {s.modelType === 'local' ? (
          <>
            <Field label={t.settings.ollamaUrl}>
              <input
                className="prism-input"
                value={s.ollamaUrl}
                onChange={e => update('ollamaUrl', e.target.value)}
              />
            </Field>
            <Field label={t.settings.ollamaModel}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="prism-select"
                  style={{ flex: 1 }}
                  value={s.ollamaModel}
                  onChange={e => update('ollamaModel', e.target.value)}
                >
                  {ollamaModels.length > 0 ? (
                    ollamaModels.map(m => <option key={m} value={m}>{m}</option>)
                  ) : (
                    <option value="">{loadingModels ? '...' : (lang === 'zh' ? '未偵測到模型' : 'No models found')}</option>
                  )}
                  <option value={s.ollamaModel}>{s.ollamaModel} (手動輸入)</option>
                </select>
                <button
                  onClick={refreshModels}
                  className="prism-btn prism-btn-ghost"
                  style={{ padding: '0 16px' }}
                >
                  ↻
                </button>
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label={t.settings.provider}>
              <select
                className="prism-select"
                value={s.provider}
                onChange={e => {
                  const p = e.target.value;
                  update('provider', p);
                  if (FALLBACK_MODELS[p]) update('model', FALLBACK_MODELS[p][0].id);
                }}
              >
                <option value="groq">Groq (免費額度 / Free tier)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </Field>
            <Field label={t.settings.model}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="prism-select"
                  style={{ flex: 1 }}
                  value={s.model}
                  onChange={e => update('model', e.target.value)}
                >
                  {s.provider === 'groq' && cloudModels.length > 0 ? (
                    cloudModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                  ) : (
                    (FALLBACK_MODELS[s.provider] || []).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                {s.provider === 'groq' && (
                  <button
                    onClick={refreshCloudModels}
                    disabled={fetchingCloud || !s.apiKey}
                    className="prism-btn prism-btn-ghost"
                    style={{ padding: '0 16px' }}
                  >
                    {fetchingCloud ? '...' : '↻'}
                  </button>
                )}
              </div>
            </Field>
            <Field label={t.settings.apiKey} hint={t.settings.apiKeyHint}>
              <input
                className="prism-input"
                type="password"
                value={s.apiKey}
                onChange={e => update('apiKey', e.target.value)}
                placeholder="sk-..."
              />
            </Field>
          </>
        )}
      </Section>

      {/* Sources */}
      <Section title={t.settings.sourcesSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <Toggle fieldKey="discoveryMode" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)', fontWeight: 500 }}>{t.settings.discoveryMode}</span>
            <span style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)' }}>{t.settings.discoveryHint}</span>
          </div>
        </div>

        <Field label={t.settings.keywords}>
          <input
            className="prism-input"
            style={{ opacity: s.discoveryMode ? 0.4 : 1 }}
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
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Toggle fieldKey={key} />
            <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)' }}>{label}</span>
          </div>
        ))}
      </Section>

      {/* Telegram */}
      <Section title={t.settings.telegramSection}>
        <Field label={t.settings.botToken} hint={t.settings.telegramHint}>
          <input
            className="prism-input"
            type="password"
            value={s.botToken}
            onChange={e => update('botToken', e.target.value)}
            placeholder="1234567890:AAF..."
          />
        </Field>
        <Field label={t.settings.chatId}>
          <input
            className="prism-input"
            value={s.chatId}
            onChange={e => update('chatId', e.target.value)}
            placeholder="-100123456789 or @username"
          />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <Toggle fieldKey="autoTelegram" />
          <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)' }}>
            {lang === 'zh' ? '抓取後自動推送 Telegram' : 'Auto-send to Telegram after fetch'}
          </span>
        </div>

        <button
          onClick={testTelegram}
          disabled={testing}
          className="prism-btn prism-btn-ghost"
        >
          {testing ? <><span className="animate-spin">⟳</span> {lang === 'zh' ? '傳送中…' : 'Sending…'}</> : t.settings.testTelegram}
        </button>
        {testMsg && (
          <p style={{
            marginTop: '10px', fontSize: '12.5px',
            color: testMsg.startsWith('✓') ? 'var(--prism-success)' : 'var(--prism-danger)',
          }}>{testMsg}</p>
        )}
      </Section>

      {/* Save */}
      <button
        onClick={save}
        className={`prism-btn ${saved ? 'prism-btn-success' : 'prism-btn-primary'}`}
        style={{ minWidth: '140px', padding: '10px 30px' }}
      >
        {saved ? (lang === 'zh' ? '✓ 已儲存！' : '✓ Saved!') : t.settings.save}
      </button>
    </div>
  );
}
