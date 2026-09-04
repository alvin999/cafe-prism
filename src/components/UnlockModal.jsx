import { useState } from 'react';
import { Storage } from '../lib/engine.js';

export default function UnlockModal({ isOpen, onClose, onSuccess, t }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = async (e) => {
    e?.preventDefault();
    if (!password) {
      setError(t.settings.passwordEmpty);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await Storage.unlock(password);
      setPassword('');
      onSuccess?.();
      onClose?.();
    } catch {
      setError(t.settings.incorrectPassword);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="prism-modal-backdrop" onClick={onClose}>
      <div className="prism-modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontSize: '22px' }}>🔐</span>
          <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--prism-text-primary)' }}>
            {t.settings.unlockTitle}
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--prism-text-muted)', lineHeight: 1.5, margin: '0 0 18px' }}>
          {t.settings.unlockDesc}
        </p>

        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              className="prism-input"
              style={{ width: '100%' }}
              placeholder={t.settings.newPassword || 'Password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              autoFocus
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
              disabled={submitting}
            >
              {t.settings.cancelBtn}
            </button>
            <button
              type="submit"
              className="prism-btn prism-btn-primary"
              disabled={submitting}
            >
              {submitting ? '...' : t.settings.unlockBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
