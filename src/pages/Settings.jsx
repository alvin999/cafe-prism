import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, sendTelegram, fetchOllamaModels, fetchProviderModels } from '../lib/engine.js';
import UnlockModal from '../components/UnlockModal.jsx';

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

function PasswordManageModal({ isOpen, mode, onClose, onSuccess, t }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setError(t.settings.passwordEmpty);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.settings.passwordMismatch);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'set') {
        await onSuccess({ newPassword });
      } else {
        await onSuccess({ oldPassword, newPassword });
      }
      onClose();
    } catch (err) {
      if (err.message === 'INCORRECT_PASSWORD') {
        setError(t.settings.incorrectPassword);
      } else {
        setError(err.message || 'Operation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prism-modal-backdrop" onClick={onClose}>
      <div className="prism-modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '22px' }}>{mode === 'set' ? '🔒' : '🔑'}</span>
          <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--prism-text-primary)' }}>
            {mode === 'set' ? t.settings.setPasswordTitle : t.settings.changePasswordTitle}
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'change' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '6px' }}>
                {t.settings.oldPassword}
              </label>
              <input
                type="password"
                className="prism-input"
                style={{ width: '100%' }}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '6px' }}>
              {t.settings.newPassword}
            </label>
            <input
              type="password"
              className="prism-input"
              style={{ width: '100%' }}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoFocus={mode === 'set'}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--prism-text-secondary)', marginBottom: '6px' }}>
              {t.settings.confirmPassword}
            </label>
            <input
              type="password"
              className="prism-input"
              style={{ width: '100%' }}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {error && (
              <p style={{ fontSize: '12px', color: 'var(--prism-danger)', margin: '6px 0 0' }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="prism-btn prism-btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              {t.settings.cancelBtn}
            </button>
            <button
              type="submit"
              className="prism-btn prism-btn-primary"
              disabled={loading}
            >
              {loading ? '...' : t.settings.save}
            </button>
          </div>
        </form>
      </div>
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
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
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

const normalizeSettings = (raw = {}) => {
  const provider = raw.provider || 'groq';
  const apiKeys = {
    groq: '',
    gemini: '',
    openai: '',
    anthropic: '',
    ...(raw.apiKeys || {}),
  };
  if (raw.apiKey && !apiKeys[provider]) {
    apiKeys[provider] = raw.apiKey;
  }
  return {
    modelType: raw.modelType || 'cloud',
    ollamaUrl: raw.ollamaUrl || 'http://localhost:11434',
    ollamaModel: raw.ollamaModel || 'llama3.2',
    provider,
    model: raw.model || 'llama-3.3-70b-versatile',
    apiKeys,
    botToken: raw.botToken || '',
    chatId: raw.chatId || '',
    keywords: raw.keywords !== undefined ? raw.keywords : 'espresso extraction, coffee brewing, roasting',
    discoveryMode: raw.discoveryMode !== undefined ? !!raw.discoveryMode : true,
    enablePapers: raw.enablePapers !== undefined ? !!raw.enablePapers : true,
    scholarApiKey: raw.scholarApiKey || '',
    enableNews: raw.enableNews !== undefined ? !!raw.enableNews : true,
    enableReddit: raw.enableReddit !== undefined ? !!raw.enableReddit : true,
    autoTelegram: raw.autoTelegram !== undefined ? !!raw.autoTelegram : false,
  };
};

const areSettingsEqual = (a, b) => {
  if (!a || !b) return true;
  const fields = [
    'modelType', 'ollamaUrl', 'ollamaModel', 'provider', 'model',
    'botToken', 'chatId', 'keywords', 'discoveryMode',
    'enablePapers', 'scholarApiKey', 'enableNews', 'enableReddit', 'autoTelegram'
  ];
  for (const field of fields) {
    if (a[field] !== b[field]) return false;
  }
  const providers = ['groq', 'gemini', 'openai', 'anthropic'];
  for (const p of providers) {
    const keyA = (a.apiKeys && a.apiKeys[p]) || '';
    const keyB = (b.apiKeys && b.apiKeys[p]) || '';
    if (keyA !== keyB) return false;
  }
  return true;
};

export default function Settings({ onDirtyChange, saveRef, discardRef }) {
  const { t, lang } = useLang();
  const [s, setS] = useState(() => normalizeSettings(Storage.getSettings()));
  const [snapshot, setSnapshot] = useState(() => normalizeSettings(Storage.getSettings()));

  const isDirty = snapshot ? !areSettingsEqual(s, snapshot) : false;

  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [cloudModels, setCloudModels] = useState([]);
  const [fetchingCloud, setFetchingCloud] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [fetchErrorDetail, setFetchErrorDetail] = useState('');

  // 密碼保護狀態管理
  const [isProtected, setIsProtected] = useState(() => Storage.hasPasswordProtection());
  const [isUnlocked, setIsUnlocked] = useState(() => Storage.isUnlocked());
  const [modalType, setModalType] = useState(null); // 'set' | 'change' | 'unlock' | null

  const currentApiKey = (s.apiKeys && s.apiKeys[s.provider]) || (s.provider === 'groq' ? s.apiKey : '') || '';

  const syncSettings = () => {
    setIsProtected(Storage.hasPasswordProtection());
    setIsUnlocked(Storage.isUnlocked());
    const stored = Storage.getSettings();
    if (Object.keys(stored).length > 0) {
      const normalized = normalizeSettings(stored);
      setS(normalized);
      setSnapshot(normalized);
    }
  };

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    syncSettings();

    const handleSync = () => syncSettings();
    window.addEventListener('cr:storage-unlocked', handleSync);
    window.addEventListener('cr:storage-locked', handleSync);
    window.addEventListener('cr:storage-protection-changed', handleSync);
    window.addEventListener('cr:settings-updated', handleSync);
    return () => {
      window.removeEventListener('cr:storage-unlocked', handleSync);
      window.removeEventListener('cr:storage-locked', handleSync);
      window.removeEventListener('cr:storage-protection-changed', handleSync);
      window.removeEventListener('cr:settings-updated', handleSync);
    };
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
    const key = (s.apiKeys && s.apiKeys[s.provider]) || (s.provider === 'groq' ? s.apiKey : '') || '';
    if (!key || key.trim().length <= 5) {
      setFetchingCloud(false);
      setCloudModels([]);
      setFetchStatus('idle');
      return;
    }
    setFetchingCloud(true);
    setFetchStatus('idle');
    setFetchErrorDetail('');
    try {
      const models = await fetchProviderModels(s.provider, key.trim());
      if (models && models.length > 0) {
        setCloudModels(models);
        setFetchStatus('success');
        if (!models.find(m => m.id === s.model)) {
          update('model', models[0].id);
        }
      } else {
        setCloudModels([]);
        setFetchStatus('error');
        setFetchErrorDetail('No models found');
      }
    } catch (e) {
      console.error('Failed to fetch cloud models:', e);
      setCloudModels([]);
      setFetchStatus('error');
      setFetchErrorDetail(e.message || 'Connection error');
    } finally {
      setFetchingCloud(false);
    }
  };

  useEffect(() => {
    const key = (s.apiKeys && s.apiKeys[s.provider]) || (s.provider === 'groq' ? s.apiKey : '') || '';
    if (s.modelType === 'cloud' && key && key.trim().length > 5) {
      setFetchingCloud(true);
      const timer = setTimeout(refreshCloudModels, 800);
      return () => clearTimeout(timer);
    } else {
      setFetchingCloud(false);
      setCloudModels([]);
      setFetchStatus('idle');
    }
  }, [s.provider, s.apiKeys?.[s.provider], s.modelType]);

  const save = async () => {
    await Storage.saveSettings(s);
    window.dispatchEvent(new Event('cr:settings-updated'));
    setSnapshot(normalizeSettings(s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDiscard = () => {
    if (snapshot) {
      setS(normalizeSettings(snapshot));
    }
  };

  useEffect(() => {
    if (saveRef) {
      saveRef.current = save;
    }
  }, [s, saveRef]);

  useEffect(() => {
    if (discardRef) {
      discardRef.current = handleDiscard;
    }
  }, [snapshot, discardRef]);

  const update = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const handleEnableProtection = async ({ newPassword }) => {
    await Storage.enablePasswordProtection(newPassword, s);
    syncSettings();
  };

  const handleChangePassword = async ({ oldPassword, newPassword }) => {
    await Storage.changePassword(oldPassword, newPassword);
    syncSettings();
  };

  const handleDisableProtection = () => {
    if (window.confirm(t.settings.disableProtectionConfirm)) {
      Storage.disablePasswordProtection();
      syncSettings();
    }
  };

  const handleLock = () => {
    Storage.lock();
    syncSettings();
  };

  const testTelegram = async () => {
    if (!s.botToken || !s.chatId) {
      setTestMsg(t.settings.emptyBotConfig);
      return;
    }
    setTesting(true);
    setTestMsg('');
    try {
      await sendTelegram(s.botToken, s.chatId, t.settings.testTelegramMsg);
      setTestMsg(t.settings.testSuccess);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h1 className="prism-page-title" style={{ margin: 0 }}>
          {t.settings.title}
        </h1>
        {isDirty && (
          <span className="prism-badge prism-badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className="prism-unsaved-dot" style={{ width: '6px', height: '6px' }} />
            {t.settings.unsavedChangesTitle}
          </span>
        )}
      </div>

      {/* Security & Privacy Notice Banner */}
      <div
        className="prism-card"
        style={{
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(200, 160, 96, 0.07) 0%, rgba(20, 18, 15, 0.6) 100%)',
          border: '1px solid var(--prism-border-accent)',
          padding: '18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <span style={{ fontSize: '22px', lineHeight: 1 }}>🛡️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--prism-amber-400)', fontWeight: 600 }}>
              {t.settings.securityNoticeTitle}
            </h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--prism-text-secondary)', lineHeight: 1.55 }}>
              {t.settings.securityNoticeDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Master Password Protection Section */}
      <Section title={t.settings.passwordProtection}>
        <div
          className="prism-card"
          style={{
            padding: '18px 20px',
            marginBottom: '24px',
            background: 'var(--prism-bg-glass-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--prism-text-primary)' }}>
                  {t.settings.passwordProtection}
                </span>
                <span className={`prism-badge ${isProtected ? 'prism-badge-success' : 'prism-badge-warning'}`}>
                  {isProtected ? t.settings.passwordStatusProtected : t.settings.passwordStatusUnprotected}
                </span>
                {isProtected && (
                  <span className={`prism-badge ${isUnlocked ? 'prism-badge-amber' : 'prism-badge-danger'}`}>
                    {isUnlocked ? t.settings.unlockedBadge : t.settings.lockedBadge}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--prism-text-muted)', lineHeight: 1.45 }}>
                {t.settings.passwordProtectionHint}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!isProtected ? (
                <button
                  type="button"
                  onClick={() => setModalType('set')}
                  className="prism-btn prism-btn-primary"
                >
                  🔒 {t.settings.enableProtectionBtn}
                </button>
              ) : (
                <>
                  {!isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => setModalType('unlock')}
                      className="prism-btn prism-btn-primary"
                    >
                      🔓 {t.settings.unlockBtn}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleLock}
                        className="prism-btn prism-btn-ghost"
                      >
                        🔒 {t.settings.lockNowBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalType('change')}
                        className="prism-btn prism-btn-ghost"
                      >
                        🔑 {t.settings.changePasswordBtn}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleDisableProtection}
                    className="prism-btn prism-btn-danger"
                  >
                    {t.settings.disableProtectionBtn}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

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
                  disabled={loadingModels}
                >
                  {loadingModels ? (
                    <option value="">{t.settings.loadingModels}</option>
                  ) : ollamaModels.length > 0 ? (
                    ollamaModels.map(m => <option key={m} value={m}>{m}</option>)
                  ) : (
                    <option value="">{t.settings.noModelsDetected}</option>
                  )}
                  <option value={s.ollamaModel}>{s.ollamaModel} (手動輸入)</option>
                </select>
                <button
                  type="button"
                  onClick={refreshModels}
                  disabled={loadingModels}
                  className="prism-btn prism-btn-ghost"
                  style={{ padding: '0 16px' }}
                  title={t.settings.loadingModels}
                >
                  {loadingModels ? '...' : '↻'}
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
                  const targetKey = (s.apiKeys && s.apiKeys[p]) || '';
                  setS(prev => ({
                    ...prev,
                    provider: p,
                    apiKey: targetKey,
                    model: FALLBACK_MODELS[p] ? FALLBACK_MODELS[p][0].id : prev.model,
                  }));
                  setCloudModels([]);
                  setFetchStatus('idle');
                  setFetchErrorDetail('');
                }}
              >
                <option value="groq">Groq (免費額度 / Free tier)</option>
                <option value="gemini">Google Gemini</option>
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
                  disabled={fetchingCloud}
                >
                  {fetchingCloud ? (
                    <option value="">{t.settings.loadingModels}</option>
                  ) : cloudModels.length > 0 ? (
                    cloudModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                  ) : (
                    (FALLBACK_MODELS[s.provider] || []).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={refreshCloudModels}
                  disabled={fetchingCloud || !currentApiKey || currentApiKey.trim().length <= 5}
                  className="prism-btn prism-btn-ghost"
                  style={{ padding: '0 16px' }}
                  title={t.settings.loadingModels}
                >
                  {fetchingCloud ? '...' : '↻'}
                </button>
              </div>
            </Field>
            <Field label={t.settings.apiKey} hint={t.settings.apiKeyHint}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="prism-input"
                  type="password"
                  style={{ flex: 1 }}
                  value={currentApiKey}
                  onChange={e => {
                    const val = e.target.value;
                    setS(prev => ({
                      ...prev,
                      apiKey: val,
                      apiKeys: {
                        ...(prev.apiKeys || {}),
                        [prev.provider]: val,
                      },
                    }));
                  }}
                  placeholder={
                    isProtected && !isUnlocked
                      ? t.settings.keysLockedPlaceholder
                      : s.provider === 'gemini'
                        ? 'AIzaSy... (Google AI Studio)'
                        : s.provider === 'groq'
                          ? 'gsk_... (Groq Cloud)'
                          : s.provider === 'anthropic'
                            ? 'sk-ant-... (Anthropic Console)'
                            : 'sk-... (OpenAI Platform)'
                  }
                  disabled={isProtected && !isUnlocked}
                />
                {isProtected && !isUnlocked && (
                  <button
                    type="button"
                    onClick={() => setModalType('unlock')}
                    className="prism-btn prism-btn-primary"
                    style={{ padding: '0 16px' }}
                  >
                    🔓 {t.settings.unlockBtn}
                  </button>
                )}
              </div>
              {!currentApiKey ? (
                <p style={{ fontSize: '12px', color: 'var(--prism-amber-400)', margin: '7px 0 0', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.4 }}>
                  <span>ℹ️</span>
                  <span>{t.settings.noKeyNotice}</span>
                </p>
              ) : fetchStatus === 'success' ? (
                <p style={{ fontSize: '12px', color: 'var(--prism-success)', margin: '7px 0 0', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.4 }}>
                  <span>✓</span>
                  <span>{t.settings.syncSuccessNotice}</span>
                </p>
              ) : fetchStatus === 'error' ? (
                <p style={{ fontSize: '12px', color: 'var(--prism-danger)', margin: '7px 0 0', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.4 }}>
                  <span>⚠️</span>
                  <span>{t.settings.syncErrorNotice}</span>
                </p>
              ) : null}
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

        {s.discoveryMode ? (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--prism-radius-md, 8px)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--prism-success, #4caf50)',
                  background: 'rgba(76, 175, 80, 0.12)',
                  border: '1px solid rgba(76, 175, 80, 0.25)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {t.settings.discoveryActiveBadge}
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--prism-text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>
              {t.settings.discoveryActiveDesc}
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--prism-text-muted)',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>🔬</span>
                <span>{t.settings.discoveryScholarKeywords}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>🔥</span>
                <span>{t.settings.discoveryRedditKeywords}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>📰</span>
                <span>{t.settings.discoveryRssKeywords}</span>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)', margin: 0, lineHeight: 1.4 }}>
              {t.settings.discoverySwitchToCustomHint}
            </p>
          </div>
        ) : (
          <Field label={t.settings.customKeywordsTitle} hint={t.settings.customKeywordsHint}>
            <input
              className="prism-input"
              style={{ width: '100%' }}
              value={s.keywords}
              onChange={e => update('keywords', e.target.value)}
              placeholder={t.settings.customKeywordsPlaceholder}
            />
          </Field>
        )}
        {[
          { key: 'enablePapers', label: t.settings.enablePapers },
          { key: 'enableNews', label: t.settings.enableNews },
          { key: 'enableReddit', label: t.settings.enableReddit },
        ].map(({ key, label }) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: key === 'enablePapers' && s.enablePapers !== false ? '10px' : '14px' }}>
              <Toggle fieldKey={key} />
              <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)' }}>{label}</span>
            </div>
            {key === 'enablePapers' && s.enablePapers !== false && (
              <div style={{ marginLeft: '48px', marginBottom: '18px', maxWidth: '520px' }}>
                <Field label={t.settings.scholarApiKey} hint={t.settings.scholarApiKeyHint}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="prism-input"
                      type="password"
                      style={{ flex: 1 }}
                      value={s.scholarApiKey}
                      onChange={e => update('scholarApiKey', e.target.value)}
                      placeholder={isProtected && !isUnlocked ? t.settings.tokenLockedPlaceholder : t.settings.scholarApiKeyPlaceholder}
                      disabled={isProtected && !isUnlocked}
                    />
                    {isProtected && !isUnlocked && (
                      <button
                        type="button"
                        onClick={() => setModalType('unlock')}
                        className="prism-btn prism-btn-primary"
                        style={{ padding: '0 16px' }}
                      >
                        🔓 {t.settings.unlockBtn}
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <a
                      href="https://www.semanticscholar.org/product/api#api-key-form"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', color: 'var(--prism-amber-400)', textDecoration: 'none' }}
                    >
                      {t.settings.scholarApplyKey}
                    </a>
                  </div>
                </Field>
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* Telegram */}
      <Section title={t.settings.telegramSection}>
        <Field label={t.settings.botToken} hint={t.settings.telegramHint}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              className="prism-input"
              type="password"
              style={{ flex: 1 }}
              value={s.botToken}
              onChange={e => update('botToken', e.target.value)}
              placeholder={isProtected && !isUnlocked ? t.settings.tokenLockedPlaceholder : "1234567890:AAF..."}
              disabled={isProtected && !isUnlocked}
            />
            {isProtected && !isUnlocked && (
              <button
                type="button"
                onClick={() => setModalType('unlock')}
                className="prism-btn prism-btn-primary"
                style={{ padding: '0 16px' }}
              >
                🔓 {t.settings.unlockBtn}
              </button>
            )}
          </div>
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
            {t.settings.autoSendTelegram}
          </span>
        </div>

        <button
          onClick={testTelegram}
          disabled={testing || (isProtected && !isUnlocked)}
          className="prism-btn prism-btn-ghost"
        >
          {testing ? <><span className="animate-spin">⟳</span> {t.settings.sending}</> : t.settings.testTelegram}
        </button>
        {testMsg && (
          <p style={{
            marginTop: '10px', fontSize: '12.5px',
            color: testMsg.startsWith('✓') ? 'var(--prism-success)' : 'var(--prism-danger)',
          }}>{testMsg}</p>
        )}
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <button
          onClick={save}
          className={`prism-btn ${saved ? 'prism-btn-success' : 'prism-btn-primary'}`}
          style={{
            minWidth: '140px',
            padding: '10px 30px',
            boxShadow: isDirty && !saved ? 'var(--prism-glow-amber), 0 0 16px rgba(200, 160, 96, 0.35)' : undefined,
          }}
        >
          {isDirty && !saved && <span className="prism-unsaved-dot" style={{ marginRight: '6px' }} />}
          {saved ? t.settings.savedSuccess : t.settings.save}
        </button>

        {isDirty && (
          <button
            type="button"
            className="prism-btn prism-btn-ghost"
            onClick={handleDiscard}
          >
            {t.settings.discardChanges}
          </button>
        )}
      </div>


      {/* Modals */}
      <PasswordManageModal
        isOpen={modalType === 'set' || modalType === 'change'}
        mode={modalType}
        onClose={() => setModalType(null)}
        onSuccess={modalType === 'set' ? handleEnableProtection : handleChangePassword}
        t={t}
      />

      <UnlockModal
        isOpen={modalType === 'unlock'}
        onClose={() => setModalType(null)}
        onSuccess={() => {
          syncSettings();
          setModalType(null);
        }}
        t={t}
      />
    </div>
  );
}
