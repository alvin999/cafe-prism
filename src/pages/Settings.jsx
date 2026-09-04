import { useState, useEffect } from 'react';
import { useLang } from '../App.jsx';
import { Storage, sendTelegram, fetchOllamaModels, fetchGroqModels } from '../lib/engine.js';
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

  // 密碼保護狀態管理
  const [isProtected, setIsProtected] = useState(() => Storage.hasPasswordProtection());
  const [isUnlocked, setIsUnlocked] = useState(() => Storage.isUnlocked());
  const [modalType, setModalType] = useState(null); // 'set' | 'change' | 'unlock' | null

  const syncSettings = () => {
    setIsProtected(Storage.hasPasswordProtection());
    setIsUnlocked(Storage.isUnlocked());
    const stored = Storage.getSettings();
    if (Object.keys(stored).length > 0) {
      setS(prev => ({ ...prev, ...stored }));
    }
  };

  useEffect(() => {
    syncSettings();

    const handleSync = () => syncSettings();
    window.addEventListener('cr:storage-unlocked', handleSync);
    window.addEventListener('cr:storage-locked', handleSync);
    window.addEventListener('cr:storage-protection-changed', handleSync);
    return () => {
      window.removeEventListener('cr:storage-unlocked', handleSync);
      window.removeEventListener('cr:storage-locked', handleSync);
      window.removeEventListener('cr:storage-protection-changed', handleSync);
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

  const save = async () => {
    await Storage.saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="prism-input"
                  type="password"
                  style={{ flex: 1 }}
                  value={s.apiKey}
                  onChange={e => update('apiKey', e.target.value)}
                  placeholder={isProtected && !isUnlocked ? (lang === 'zh' ? '• • • • • • (金鑰已加密，請先解鎖)' : '• • • • • • (Keys locked, unlock to edit)') : "sk-..."}
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              className="prism-input"
              type="password"
              style={{ flex: 1 }}
              value={s.botToken}
              onChange={e => update('botToken', e.target.value)}
              placeholder={isProtected && !isUnlocked ? (lang === 'zh' ? '• • • • • • (Token 已加密，請先解鎖)' : '• • • • • • (Token locked, unlock to edit)') : "1234567890:AAF..."}
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
            {lang === 'zh' ? '抓取後自動推送 Telegram' : 'Auto-send to Telegram after fetch'}
          </span>
        </div>

        <button
          onClick={testTelegram}
          disabled={testing || (isProtected && !isUnlocked)}
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
