import { useState, useEffect, useRef } from 'react';
import { useLang } from '../App.jsx';
import { Storage, sendTelegram, formatTelegramMessage, getSampleCards, fetchOllamaModels, fetchProviderModels, testLLMConnection, KeyStatus } from '../lib/engine.js';
import UnlockModal from '../components/UnlockModal.jsx';

/* ─── Precision 1.5px SVG Icons for Settings Console ───────────────────── */
const SettingsIcons = {
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Unlock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
  Key: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  FileText: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  ),
  Eye: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ),
  Zap: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  Upload: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
};

/* ─── Two-Column Architectural Section Wrapper ─────────────────────────── */
function Section({ index, eyebrow, title, description, children }) {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px 36px',
        paddingBottom: '36px',
        marginBottom: '36px',
        borderBottom: '1px solid var(--prism-border-subtle)',
        alignItems: 'start'
      }}
    >
      {/* Left Meta Column */}
      <div style={{ maxWidth: '340px' }}>
        <span className="prism-section-eyebrow">
          {index} // {eyebrow}
        </span>
        <h2 style={{
          margin: '4px 0 10px',
          fontFamily: 'var(--prism-font-display)',
          fontSize: '18.5px',
          fontWeight: 650,
          color: 'var(--prism-text-primary)',
          letterSpacing: '-0.015em'
        }}>
          {title}
        </h2>
        {description && (
          <p style={{
            margin: 0,
            fontSize: '12.5px',
            color: 'var(--prism-text-muted)',
            lineHeight: 1.65
          }}>
            {description}
          </p>
        )}
      </div>

      {/* Right Control Surface Card */}
      <div className="prism-card" style={{ padding: '24px 28px', gridColumn: 'span 1' }}>
        {children}
      </div>
    </section>
  );
}

function Field({ label, hint, children, style }) {
  return (
    <div style={{ marginBottom: '18px', ...style }}>
      <label style={{
        display: 'block',
        fontSize: '12.5px',
        color: 'var(--prism-text-secondary)',
        marginBottom: '7px',
        fontWeight: 500,
        letterSpacing: '0.01em'
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{
          fontSize: '11.5px',
          color: 'var(--prism-text-muted)',
          margin: '6px 0 0',
          lineHeight: 1.5
        }}>
          {hint}
        </p>
      )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ color: 'var(--prism-amber-400)', display: 'flex' }}>
            {mode === 'set' ? <SettingsIcons.Lock /> : <SettingsIcons.Key />}
          </span>
          <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--prism-text-primary)', fontWeight: 600 }}>
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
    telegramTemplate: {
      mode: raw.telegramTemplate?.mode || 'standard',
      showConfidence: raw.telegramTemplate?.showConfidence !== undefined ? !!raw.telegramTemplate.showConfidence : true,
      showSummary: raw.telegramTemplate?.showSummary !== undefined ? !!raw.telegramTemplate.showSummary : true,
      showPracticalTip: raw.telegramTemplate?.showPracticalTip !== undefined ? !!raw.telegramTemplate.showPracticalTip : true,
      showFunFact: raw.telegramTemplate?.showFunFact !== undefined ? !!raw.telegramTemplate.showFunFact : false,
      showSourceLink: raw.telegramTemplate?.showSourceLink !== undefined ? !!raw.telegramTemplate.showSourceLink : true,
      showMatrix: raw.telegramTemplate?.showMatrix !== undefined ? !!raw.telegramTemplate.showMatrix : false,
    },
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
  const tmplA = a.telegramTemplate || {};
  const tmplB = b.telegramTemplate || {};
  const tmplKeys = ['mode', 'showConfidence', 'showSummary', 'showPracticalTip', 'showFunFact', 'showSourceLink', 'showMatrix'];
  for (const k of tmplKeys) {
    if (tmplA[k] !== tmplB[k]) return false;
  }
  return true;
};

export default function Settings({ onDirtyChange, saveRef, discardRef }) {
  const { t, lang } = useLang();
  const [s, setS] = useState(() => normalizeSettings(Storage.getSettings()));
  const [snapshot, setSnapshot] = useState(() => normalizeSettings(Storage.getSettings()));

  const isDirty = snapshot ? !areSettingsEqual(s, snapshot) : false;

  const [customSources, setCustomSources] = useState(() => Storage.getCustomSources());
  const [newSource, setNewSource] = useState({ type: 'rss', label: '', endpoint: '' });
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const fileInputRef = useRef(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [cloudModels, setCloudModels] = useState([]);
  const [fetchingCloud, setFetchingCloud] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('idle');
  const [fetchErrorDetail, setFetchErrorDetail] = useState('');
  const [testingLLM, setTestingLLM] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState(null);

  const [securityMode, setSecurityMode] = useState(() => Storage.getSecurityMode());
  const [isProtected, setIsProtected] = useState(() => Storage.hasPasswordProtection());
  const [isUnlocked, setIsUnlocked] = useState(() => Storage.isUnlocked());
  const [modalType, setModalType] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [securityMsg, setSecurityMsg] = useState('');

  const currentApiKey = (s.apiKeys && s.apiKeys[s.provider]) || (s.provider === 'groq' ? s.apiKey : '') || '';

  const syncSettings = () => {
    setSecurityMode(Storage.getSecurityMode());
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
        KeyStatus.markValid(s.provider, key.trim());
        if (!s.model) {
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
      const errDetail = e.message || 'Connection error';
      setFetchErrorDetail(errDetail);
      KeyStatus.markInvalid(s.provider, key.trim(), errDetail);
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

  const handleTestLLM = async () => {
    setTestingLLM(true);
    setLlmTestResult(null);
    try {
      const res = await testLLMConnection(s);
      if (res.success) {
        setLlmTestResult({
          success: true,
          message: `${t.settings.testConnectionSuccess} (${res.latencyMs}ms)`,
        });
        KeyStatus.markValid(s.provider, currentApiKey);
      } else {
        setLlmTestResult({
          success: false,
          message: `${t.settings.testConnectionFailed}: ${res.error}`,
        });
        KeyStatus.markInvalid(s.provider, currentApiKey, res.error);
      }
    } catch (err) {
      setLlmTestResult({
        success: false,
        message: `${t.settings.testConnectionFailed}: ${err.message || 'Error'}`,
      });
    } finally {
      setTestingLLM(false);
    }
  };

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
    setSecurityMsg(t.settings.savedSuccess || '✓');
    setTimeout(() => setSecurityMsg(''), 3500);
  };

  const handleChangePassword = async ({ oldPassword, newPassword }) => {
    await Storage.changePassword(oldPassword, newPassword);
    syncSettings();
    setSecurityMsg(t.settings.savedSuccess || '✓');
    setTimeout(() => setSecurityMsg(''), 3500);
  };

  const handleSwitchToTransparent = async () => {
    try {
      await Storage.enableTransparentProtection(s);
      syncSettings();
      setSecurityMsg(t.settings.transparentEnabledNotice);
      setTimeout(() => setSecurityMsg(''), 3500);
    } catch (err) {
      setSecurityMsg(`Error: ${err.message}`);
    }
  };

  const handleSwitchToPlaintext = () => {
    if (window.confirm(t.settings.disableProtectionConfirm)) {
      Storage.disableProtectionToPlaintext();
      syncSettings();
      setSecurityMsg(t.settings.plaintextEnabledNotice);
      setTimeout(() => setSecurityMsg(''), 3500);
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
      const sampleCards = getSampleCards(lang || 'zh').slice(0, 1);
      const testBody = formatTelegramMessage(sampleCards, lang || 'zh', s.telegramTemplate);
      await sendTelegram(s.botToken, s.chatId, testBody);
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
      {/* ─── Editorial Page Header ─────────────────────────────────────── */}
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
            SYSTEM CONFIGURATION // CAFÉPRISM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
        </div>
      </div>

      {/* ─── 01 // Security & Encryption Vault ─────────────────────────── */}
      <Section
        index="01"
        eyebrow="SECURITY VAULT"
        title={t.settings.securityStorageSection || t.settings.passwordProtection}
        description={t.settings.securityNoticeDesc}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--prism-amber-400)', display: 'inline-flex' }}>
                <SettingsIcons.Shield />
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--prism-text-primary)' }}>
                {t.settings.securityNoticeTitle}
              </span>
              {securityMode === 'transparent' && (
                <span className="prism-badge prism-badge-success">
                  ✓ {t.settings.transparentActiveBadge || '裝置已加密'}
                </span>
              )}
              {securityMode === 'password' && (
                <>
                  <span className="prism-badge prism-badge-success">
                    {t.settings.passwordStatusProtected}
                  </span>
                  <span className={`prism-badge ${isUnlocked ? 'prism-badge-amber' : 'prism-badge-danger'}`}>
                    {isUnlocked ? t.settings.unlockedBadge : t.settings.lockedBadge}
                  </span>
                </>
              )}
              {securityMode === 'plaintext' && (
                <span className="prism-badge prism-badge-warning">
                  {t.settings.passwordStatusUnprotected}
                </span>
              )}
            </div>

            {securityMode === 'password' && isProtected && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {!isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => setModalType('unlock')}
                    className="prism-btn prism-btn-primary prism-btn-sm"
                  >
                    <SettingsIcons.Unlock /> {t.settings.unlockBtn}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleLock}
                      className="prism-btn prism-btn-ghost prism-btn-sm"
                    >
                      <SettingsIcons.Lock /> {t.settings.lockNowBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalType('change')}
                      className="prism-btn prism-btn-ghost prism-btn-sm"
                    >
                      <SettingsIcons.Key /> {t.settings.changePasswordBtn}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 3 Modes Option Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              {
                id: 'transparent',
                icon: <SettingsIcons.Shield />,
                title: t.settings.securityModeTransparent,
                desc: t.settings.securityModeTransparentDesc,
                onSelect: handleSwitchToTransparent
              },
              {
                id: 'plaintext',
                icon: <SettingsIcons.FileText />,
                title: t.settings.securityModePlaintext,
                desc: t.settings.securityModePlaintextDesc,
                onSelect: handleSwitchToPlaintext
              },
              {
                id: 'password',
                icon: <SettingsIcons.Lock />,
                title: t.settings.securityModePassword,
                desc: t.settings.securityModePasswordDesc,
                onSelect: () => setModalType('set')
              }
            ].map(mode => {
              const active = securityMode === mode.id;
              return (
                <div
                  key={mode.id}
                  onClick={() => { if (!active) mode.onSelect(); }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--prism-radius-md)',
                    cursor: active ? 'default' : 'pointer',
                    border: active ? '1px solid var(--prism-amber-500)' : '1px solid var(--prism-border-subtle)',
                    background: active ? 'rgba(200, 160, 96, 0.08)' : 'var(--prism-bg-recessed)',
                    transition: 'all var(--prism-transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: active ? 'var(--prism-amber-400)' : 'var(--prism-text-primary)'
                    }}>
                      {mode.icon}
                      {mode.title}
                    </span>
                    <input
                      type="radio"
                      name="securityMode"
                      checked={active}
                      onChange={() => { if (!active) mode.onSelect(); }}
                      style={{ accentColor: 'var(--prism-amber-400)', cursor: 'pointer' }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--prism-text-muted)', lineHeight: 1.5 }}>
                    {mode.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {securityMsg && (
            <p style={{ margin: 0, fontSize: '12px', fontFamily: 'var(--prism-font-mono)', color: securityMsg.startsWith('✓') ? 'var(--prism-success)' : 'var(--prism-danger)' }}>
              {securityMsg}
            </p>
          )}
        </div>
      </Section>

      {/* ─── 02 // AI Inference Engine ─────────────────────────────────── */}
      <Section
        index="02"
        eyebrow="INFERENCE ENGINE"
        title={t.settings.modelSection}
        description={t.settings.apiKeyHint}
      >
        <Field label={t.settings.modelType}>
          <div className="prism-topic-pill-group" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '4px' }}>
            {['local', 'cloud'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => update('modelType', type)}
                className={`prism-topic-pill-btn ${s.modelType === type ? 'is-active' : ''}`}
                style={{ padding: '8px 14px', fontSize: '12.5px' }}
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
                style={{ fontFamily: 'var(--prism-font-mono)' }}
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
                  style={{ padding: '0 14px' }}
                  title={t.settings.loadingModels}
                >
                  {loadingModels ? '...' : <SettingsIcons.Refresh />}
                </button>
              </div>
            </Field>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
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
                  <option value="groq">Groq (Free Tier)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </Field>

              <Field label={t.settings.model}>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                    style={{ padding: '0 12px' }}
                    title={t.settings.loadingModels}
                  >
                    {fetchingCloud ? '...' : <SettingsIcons.Refresh />}
                  </button>
                </div>
              </Field>
            </div>

            <Field label={t.settings.apiKey} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="prism-input"
                  type={showApiKey ? 'text' : 'password'}
                  style={{ flex: 1, fontFamily: 'var(--prism-font-mono)' }}
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
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="prism-btn prism-btn-ghost"
                  style={{ padding: '0 12px' }}
                  title={showApiKey ? t.settings.toggleMaskHide : t.settings.toggleMaskShow}
                  disabled={isProtected && !isUnlocked}
                >
                  {showApiKey ? <SettingsIcons.EyeOff /> : <SettingsIcons.Eye />}
                </button>
                {isProtected && !isUnlocked && (
                  <button
                    type="button"
                    onClick={() => setModalType('unlock')}
                    className="prism-btn prism-btn-primary"
                    style={{ padding: '0 16px' }}
                  >
                    <SettingsIcons.Unlock /> {t.settings.unlockBtn}
                  </button>
                )}
              </div>
              {!currentApiKey ? (
                <p style={{ fontSize: '12px', color: 'var(--prism-amber-400)', margin: '8px 0 0', lineHeight: 1.4 }}>
                  • {t.settings.noKeyNotice}
                </p>
              ) : fetchStatus === 'success' ? (
                <p style={{ fontSize: '12px', color: 'var(--prism-success)', margin: '8px 0 0', lineHeight: 1.4 }}>
                  ✓ {t.settings.syncSuccessNotice}
                </p>
              ) : fetchStatus === 'error' ? (
                <p style={{ fontSize: '12px', color: 'var(--prism-danger)', margin: '8px 0 0', lineHeight: 1.4 }}>
                  ✕ {fetchErrorDetail ? `${t.settings.syncErrorNotice} (${fetchErrorDetail})` : t.settings.syncErrorNotice}
                </p>
              ) : null}
            </Field>
          </>
        )}

        {/* LLM Connection Test */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--prism-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTestLLM}
              disabled={testingLLM || (s.modelType === 'cloud' && (!currentApiKey || currentApiKey.trim().length <= 5))}
              className="prism-btn prism-btn-ghost prism-btn-sm"
            >
              <SettingsIcons.Zap />
              <span>{testingLLM ? t.settings.testingConnection : t.settings.testConnection}</span>
            </button>
            {llmTestResult && (
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--prism-font-mono)',
                  color: llmTestResult.success ? 'var(--prism-success)' : 'var(--prism-danger)',
                }}
              >
                {llmTestResult.message}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* ─── 03 // Intelligence Sources & Discovery ────────────────────── */}
      <Section
        index="03"
        eyebrow="DATA PIPELINE"
        title={t.settings.sourcesSection}
        description={t.settings.discoveryHint}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '13.5px', color: 'var(--prism-text-primary)', fontWeight: 500 }}>
              {t.settings.discoveryMode}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--prism-text-muted)', marginTop: '2px' }}>
              {t.settings.discoverySwitchToCustomHint}
            </div>
          </div>
          <Toggle fieldKey="discoveryMode" />
        </div>

        {s.discoveryMode ? (
          <div className="prism-insight-slot" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="prism-badge prism-badge-success">
                {t.settings.discoveryActiveBadge}
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--prism-text-secondary)', margin: '0 0 10px', lineHeight: 1.55 }}>
              {t.settings.discoveryActiveDesc}
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11.5px',
              fontFamily: 'var(--prism-font-mono)',
              color: 'var(--prism-text-muted)',
              paddingTop: '8px',
              borderTop: '1px solid var(--prism-border-subtle)'
            }}>
              <div>01 // {t.settings.discoveryScholarKeywords}</div>
              <div>02 // {t.settings.discoveryRedditKeywords}</div>
              <div>03 // {t.settings.discoveryRssKeywords}</div>
            </div>
          </div>
        ) : (
          <Field label={t.settings.customKeywordsTitle} hint={t.settings.customKeywordsHint}>
            <input
              className="prism-input"
              value={s.keywords}
              onChange={e => update('keywords', e.target.value)}
              placeholder={t.settings.customKeywordsPlaceholder}
            />
          </Field>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '14px', borderTop: '1px solid var(--prism-border-subtle)' }}>
          {[
            { key: 'enablePapers', label: t.settings.enablePapers },
            { key: 'enableNews', label: t.settings.enableNews },
            { key: 'enableReddit', label: t.settings.enableReddit },
          ].map(({ key, label }) => (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)' }}>{label}</span>
                <Toggle fieldKey={key} />
              </div>

              {key === 'enablePapers' && s.enablePapers !== false && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  background: 'var(--prism-bg-recessed)',
                  borderRadius: 'var(--prism-radius-md)',
                  border: '1px solid var(--prism-border-subtle)'
                }}>
                  <Field label={t.settings.scholarApiKey} hint={t.settings.scholarApiKeyHint} style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="prism-input"
                        type={showApiKey ? 'text' : 'password'}
                        style={{ flex: 1, fontFamily: 'var(--prism-font-mono)' }}
                        value={s.scholarApiKey}
                        onChange={e => update('scholarApiKey', e.target.value)}
                        placeholder={isProtected && !isUnlocked ? t.settings.tokenLockedPlaceholder : t.settings.scholarApiKeyPlaceholder}
                        disabled={isProtected && !isUnlocked}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(v => !v)}
                        className="prism-btn prism-btn-ghost"
                        style={{ padding: '0 12px' }}
                        disabled={isProtected && !isUnlocked}
                      >
                        {showApiKey ? <SettingsIcons.EyeOff /> : <SettingsIcons.Eye />}
                      </button>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <a
                        href="https://www.semanticscholar.org/product/api#api-key-form"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '11.5px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-amber-400)', textDecoration: 'none' }}
                      >
                        {t.settings.scholarApplyKey} ↗
                      </a>
                    </div>
                  </Field>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ─── Custom Sources Console ─── */}
        <div style={{
          marginTop: '24px',
          padding: '18px 20px',
          background: 'var(--prism-bg-recessed)',
          borderRadius: 'var(--prism-radius-lg)',
          border: '1px solid var(--prism-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 650,
              color: 'var(--prism-text-primary)',
              fontFamily: 'var(--prism-font-display)',
              marginBottom: '4px'
            }}>
              {t.settings.customSourcesSection || '自訂情報來源管理控制台'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--prism-text-dim)' }}>
              {t.settings.customSourcesHint || '動態管理自訂 RSS 專欄訂閱與 Subreddit 社群情報來源'}
            </div>
          </div>

          {/* Sources List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customSources.map((source) => (
              <div
                key={source.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--prism-bg-surface)',
                  borderRadius: 'var(--prism-radius-md)',
                  border: '1px solid var(--prism-border-subtle)',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', flex: 1 }}>
                  <span className={`prism-badge ${source.type === 'reddit' ? 'prism-badge-amber' : 'prism-badge-ghost'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                    {source.type === 'reddit' ? 'Reddit 💬' : 'RSS 📰'}
                  </span>
                  <span className="prism-badge" style={{
                    fontSize: '9.5px',
                    background: source.isBuiltin ? 'rgba(82, 168, 114, 0.1)' : 'rgba(100, 148, 212, 0.1)',
                    color: source.isBuiltin ? 'var(--prism-success)' : 'var(--prism-info)',
                    border: `1px solid ${source.isBuiltin ? 'var(--prism-success-border)' : 'var(--prism-info-border)'}`
                  }}>
                    {source.isBuiltin ? (t.settings.builtinBadge || '內建') : (t.settings.customBadge || '自訂')}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 550, color: 'var(--prism-text-primary)' }}>
                      {source.label}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)' }}>
                      {source.endpoint}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className={`prism-toggle ${source.enabled ? 'is-active' : ''}`}
                    onClick={() => {
                      const next = customSources.map(cs => cs.id === source.id ? { ...cs, enabled: !cs.enabled } : cs);
                      setCustomSources(next);
                      Storage.saveCustomSources(next);
                    }}
                    title={source.enabled ? 'Enabled' : 'Disabled'}
                  >
                    <span className="prism-toggle-thumb" />
                  </button>

                  {!source.isBuiltin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.settings.deleteSourceConfirm || 'Are you sure?')) {
                          const next = customSources.filter(cs => cs.id !== source.id);
                          setCustomSources(next);
                          Storage.saveCustomSources(next);
                        }
                      }}
                      className="prism-btn prism-btn-danger prism-btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Delete Source"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Source Form */}
          <div style={{
            padding: '14px',
            background: 'var(--prism-bg-surface-elevated)',
            borderRadius: 'var(--prism-radius-md)',
            border: '1px dashed var(--prism-border-medium)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ fontSize: '11.5px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-amber-400)', fontWeight: 600 }}>
              + {t.settings.addSource}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={newSource.type}
                onChange={e => setNewSource(prev => ({ ...prev, type: e.target.value }))}
                className="prism-select"
                style={{ fontSize: '12px', padding: '6px 10px', minWidth: '120px' }}
              >
                <option value="rss">RSS Feed 📰</option>
                <option value="reddit">Subreddit 💬</option>
              </select>

              <input
                type="text"
                placeholder={t.settings.sourceLabelPlaceholder}
                value={newSource.label}
                onChange={e => setNewSource(prev => ({ ...prev, label: e.target.value }))}
                className="prism-input"
                style={{ flex: 1, minWidth: '160px', fontSize: '12.5px' }}
              />

              <input
                type="text"
                placeholder={newSource.type === 'reddit' ? t.settings.sourceEndpointRedditPlaceholder : t.settings.sourceEndpointRssPlaceholder}
                value={newSource.endpoint}
                onChange={e => setNewSource(prev => ({ ...prev, endpoint: e.target.value }))}
                className="prism-input"
                style={{ flex: 2, minWidth: '200px', fontSize: '12.5px', fontFamily: 'var(--prism-font-mono)' }}
              />

              <button
                type="button"
                onClick={() => {
                  const lbl = newSource.label.trim();
                  const ep = newSource.endpoint.trim();
                  if (!lbl || !ep) return;
                  const newEntry = {
                    id: `source_${Date.now()}`,
                    type: newSource.type,
                    label: lbl,
                    endpoint: ep,
                    enabled: true,
                    isBuiltin: false,
                  };
                  const next = [...customSources, newEntry];
                  setCustomSources(next);
                  Storage.saveCustomSources(next);
                  setNewSource({ type: 'rss', label: '', endpoint: '' });
                }}
                disabled={!newSource.label.trim() || !newSource.endpoint.trim()}
                className="prism-btn prism-btn-primary prism-btn-sm"
                style={{ fontSize: '12px' }}
              >
                + {t.settings.addSource}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── 04 // Telegram Dispatch ───────────────────────────────────── */}
      <Section
        index="04"
        eyebrow="DISPATCH CHANNEL"
        title={t.settings.telegramSection}
        description={t.settings.telegramHint}
      >
        <Field label={t.settings.botToken}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="prism-input"
              type={showApiKey ? 'text' : 'password'}
              style={{ flex: 1, fontFamily: 'var(--prism-font-mono)' }}
              value={s.botToken}
              onChange={e => update('botToken', e.target.value)}
              placeholder={isProtected && !isUnlocked ? t.settings.tokenLockedPlaceholder : '1234567890:AAF...'}
              disabled={isProtected && !isUnlocked}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(v => !v)}
              className="prism-btn prism-btn-ghost"
              style={{ padding: '0 12px' }}
              disabled={isProtected && !isUnlocked}
            >
              {showApiKey ? <SettingsIcons.EyeOff /> : <SettingsIcons.Eye />}
            </button>
          </div>
        </Field>

        <Field label={t.settings.chatId}>
          <input
            className="prism-input"
            style={{ fontFamily: 'var(--prism-font-mono)' }}
            value={s.chatId}
            onChange={e => update('chatId', e.target.value)}
            placeholder="-100123456789 or @username"
          />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
          <span style={{ fontSize: '13.5px', color: 'var(--prism-text-secondary)' }}>
            {t.settings.autoSendTelegram}
          </span>
          <Toggle fieldKey="autoTelegram" />
        </div>

        {/* ─── Telegram Template Configurator & Live Preview ─── */}
        <div style={{
          marginTop: '20px',
          padding: '18px',
          background: 'var(--prism-bg-recessed)',
          borderRadius: 'var(--prism-radius-lg)',
          border: '1px solid var(--prism-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 650,
              color: 'var(--prism-text-primary)',
              fontFamily: 'var(--prism-font-display)',
              marginBottom: '4px'
            }}>
              {t.settings.telegramTemplate?.title || '推播範本自訂與即時預覽'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--prism-text-dim)' }}>
              {t.settings.telegramTemplate?.hint || '自訂派發至 Telegram 的內容欄位、長度與版面結構'}
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--prism-font-mono)', color: 'var(--prism-text-dim)' }}>
              {t.settings.telegramTemplate?.preset || '快速預設'}:
            </span>
            <button
              type="button"
              className={`prism-btn prism-btn-sm ${s.telegramTemplate?.mode === 'compact' ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
              onClick={() => {
                setS(prev => ({
                  ...prev,
                  telegramTemplate: {
                    mode: 'compact',
                    showConfidence: true,
                    showSummary: true,
                    showPracticalTip: true,
                    showFunFact: false,
                    showSourceLink: true,
                    showMatrix: false,
                  }
                }));
              }}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              ⚡ {t.settings.telegramTemplate?.modeCompact || '精簡重點'}
            </button>
            <button
              type="button"
              className={`prism-btn prism-btn-sm ${s.telegramTemplate?.mode === 'standard' ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
              onClick={() => {
                setS(prev => ({
                  ...prev,
                  telegramTemplate: {
                    mode: 'standard',
                    showConfidence: true,
                    showSummary: true,
                    showPracticalTip: true,
                    showFunFact: false,
                    showSourceLink: true,
                    showMatrix: false,
                  }
                }));
              }}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              ⚖ {t.settings.telegramTemplate?.modeStandard || '標準平衡'}
            </button>
            <button
              type="button"
              className={`prism-btn prism-btn-sm ${s.telegramTemplate?.mode === 'detailed' ? 'prism-btn-primary' : 'prism-btn-ghost'}`}
              onClick={() => {
                setS(prev => ({
                  ...prev,
                  telegramTemplate: {
                    mode: 'detailed',
                    showConfidence: true,
                    showSummary: true,
                    showPracticalTip: true,
                    showFunFact: true,
                    showSourceLink: true,
                    showMatrix: true,
                  }
                }));
              }}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              🔬 {t.settings.telegramTemplate?.modeDetailed || '深度研析'}
            </button>
          </div>

          {/* Module Toggles */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '8px',
            paddingTop: '6px'
          }}>
            {[
              { key: 'showConfidence', label: t.settings.telegramTemplate?.fieldConfidence || '信賴度指標 (🟢/🟡/🔴)' },
              { key: 'showSummary', label: t.settings.telegramTemplate?.fieldSummary || '核心研析摘要' },
              { key: 'showPracticalTip', label: t.settings.telegramTemplate?.fieldPracticalTip || '沖煮實用建議 (💡)' },
              { key: 'showFunFact', label: t.settings.telegramTemplate?.fieldFunFact || '冷知識 / 趣聞 (☕)' },
              { key: 'showMatrix', label: t.settings.telegramTemplate?.fieldMatrix || '專家共識與分歧 (✓/⚠)' },
              { key: 'showSourceLink', label: t.settings.telegramTemplate?.fieldSourceLink || '原文參照連結' },
            ].map(item => (
              <label
                key={item.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: s.telegramTemplate?.[item.key] ? 'var(--prism-text-primary)' : 'var(--prism-text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '4px 0'
                }}
              >
                <input
                  type="checkbox"
                  checked={!!s.telegramTemplate?.[item.key]}
                  onChange={e => {
                    const checked = e.target.checked;
                    setS(prev => ({
                      ...prev,
                      telegramTemplate: {
                        ...(prev.telegramTemplate || {}),
                        [item.key]: checked
                      }
                    }));
                  }}
                  style={{ accentColor: 'var(--prism-amber-500)', cursor: 'pointer' }}
                />
                {item.label}
              </label>
            ))}
          </div>

          {/* Live Preview Box */}
          <div style={{
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: '1px solid var(--prism-border-subtle)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontFamily: 'var(--prism-font-mono)',
                fontSize: '11px',
                color: 'var(--prism-amber-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                💬 {t.settings.telegramTemplate?.previewTitle || 'Telegram 氣泡即時預覽'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--prism-text-dim)' }}>
                {t.settings.telegramTemplate?.previewHint || '依據當前範本渲染'}
              </span>
            </div>

            <div style={{
              background: 'rgba(24, 37, 51, 0.92)',
              borderRadius: '12px 12px 12px 2px',
              padding: '14px 16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f5f5f5',
              fontSize: '13px',
              lineHeight: 1.6,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
              maxHeight: '260px',
              overflowY: 'auto',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: formatTelegramMessage(
                    getSampleCards(lang || 'zh').slice(0, 1),
                    lang || 'zh',
                    s.telegramTemplate
                  )
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '14px', borderTop: '1px solid var(--prism-border-subtle)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={testTelegram}
            disabled={testing || (isProtected && !isUnlocked)}
            className="prism-btn prism-btn-ghost prism-btn-sm"
          >
            {testing ? <><span className="animate-spin">⟳</span> {t.settings.sending}</> : t.settings.testTelegram}
          </button>
          {testMsg && (
            <span style={{
              fontSize: '12px',
              fontFamily: 'var(--prism-font-mono)',
              color: testMsg.startsWith('✓') ? 'var(--prism-success)' : 'var(--prism-danger)',
            }}>
              {testMsg}
            </span>
          )}
        </div>
      </Section>

      {/* ─── 05 // Backup & Restore Archive ────────────────────────────── */}
      <Section
        index="05"
        eyebrow="DATA ARCHIVE"
        title={t.settings.backupSection || '設定備份與還原'}
        description={t.settings.backupHint}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="prism-btn prism-btn-ghost"
            onClick={() => {
              try {
                const json = Storage.exportBackup();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `cafe-prism-settings-${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setBackupMsg(t.settings.savedSuccess || '✓ Exported!');
                setTimeout(() => setBackupMsg(''), 3500);
              } catch (err) {
                setBackupMsg(`Error: ${err.message}`);
              }
            }}
          >
            <SettingsIcons.Download /> {t.settings.exportBackupBtn}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => {
                try {
                  const text = evt.target?.result;
                  Storage.importBackup(text);
                  syncSettings();
                  setBackupMsg(t.settings.importSuccess || '✓ Restored!');
                  setTimeout(() => setBackupMsg(''), 3500);
                } catch (err) {
                  setBackupMsg(t.settings.importFailed || 'Import failed');
                }
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            className="prism-btn prism-btn-ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            <SettingsIcons.Upload /> {t.settings.importBackupBtn}
          </button>
        </div>

        {backupMsg && (
          <p style={{
            marginTop: '12px',
            marginBottom: 0,
            fontSize: '12px',
            fontFamily: 'var(--prism-font-mono)',
            color: backupMsg.startsWith('✓') ? 'var(--prism-success)' : 'var(--prism-danger)',
          }}>
            {backupMsg}
          </p>
        )}
      </Section>

      {/* ─── Bottom Action Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', marginBottom: '48px', flexWrap: 'wrap' }}>
        {isDirty && (
          <button
            type="button"
            className="prism-btn prism-btn-ghost"
            onClick={handleDiscard}
          >
            {t.settings.discardChanges}
          </button>
        )}
        <button
          onClick={save}
          className={`prism-btn ${saved ? 'prism-btn-success' : 'prism-btn-primary'}`}
          style={{ minWidth: '160px', padding: '11px 32px' }}
        >
          {isDirty && !saved && <span className="prism-unsaved-dot" style={{ marginRight: '6px' }} />}
          {saved ? t.settings.savedSuccess : t.settings.save}
        </button>
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
