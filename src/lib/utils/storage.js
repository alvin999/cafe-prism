import { encryptSensitiveData, decryptSensitiveData } from './crypto.js';

// ─── In-memory session key & password cache (僅存放於當前分頁 RAM，不寫入硬碟) ───
let sessionDecryptedKeys = null; // { apiKey: string, botToken: string }
let sessionPassword = null;

// ─── LocalStorage persistence ─────────────────────────────────────────────────
export const Storage = {
  getRawSettings: () => {
    try {
      return JSON.parse(localStorage.getItem('cr_settings') || '{}');
    } catch {
      return {};
    }
  },

  hasPasswordProtection: () => {
    const raw = Storage.getRawSettings();
    return Boolean(raw._encrypted_keys);
  },

  isUnlocked: () => {
    if (!Storage.hasPasswordProtection()) return true;
    return Boolean(sessionDecryptedKeys);
  },

  getSessionPassword: () => sessionPassword,

  getSettings: () => {
    const raw = Storage.getRawSettings();
    if (!raw._encrypted_keys) {
      return raw;
    }
    // 已啟用密碼保護
    if (sessionDecryptedKeys) {
      return {
        ...raw,
        apiKey: sessionDecryptedKeys.apiKey || '',
        botToken: sessionDecryptedKeys.botToken || '',
      };
    }
    // 尚未解鎖時，遮蔽敏感金鑰
    return {
      ...raw,
      apiKey: '',
      botToken: '',
    };
  },

  saveSettings: async (s) => {
    const raw = Storage.getRawSettings();
    const isProtected = Boolean(raw._encrypted_keys);

    if (isProtected) {
      const toSave = { ...s };
      // 若工作階段已解鎖且持有 sessionPassword，重新加密敏感資料
      if (sessionPassword) {
        const sensitive = {
          apiKey: s.apiKey ?? sessionDecryptedKeys?.apiKey ?? '',
          botToken: s.botToken ?? sessionDecryptedKeys?.botToken ?? '',
        };
        const encrypted = await encryptSensitiveData(sensitive, sessionPassword);
        toSave._encrypted_keys = encrypted;
        sessionDecryptedKeys = sensitive;
      } else {
        // 若未解鎖（例如僅背景或 App.jsx 更新 language），保留原加密封包
        toSave._encrypted_keys = raw._encrypted_keys;
      }
      // 確保明文金鑰不寫入 localStorage
      delete toSave.apiKey;
      delete toSave.botToken;
      localStorage.setItem('cr_settings', JSON.stringify(toSave));
    } else {
      // 未啟用密碼保護，直接儲存
      const toSave = { ...s };
      delete toSave._encrypted_keys;
      localStorage.setItem('cr_settings', JSON.stringify(toSave));
    }
  },

  unlock: async (password) => {
    const raw = Storage.getRawSettings();
    if (!raw._encrypted_keys) return true;

    const decrypted = await decryptSensitiveData(raw._encrypted_keys, password);
    sessionPassword = password;
    sessionDecryptedKeys = {
      apiKey: decrypted.apiKey || '',
      botToken: decrypted.botToken || '',
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-unlocked'));
    }
    return true;
  },

  lock: () => {
    sessionPassword = null;
    sessionDecryptedKeys = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-locked'));
    }
  },

  enablePasswordProtection: async (password, currentSettings = {}) => {
    const sensitive = {
      apiKey: currentSettings.apiKey || sessionDecryptedKeys?.apiKey || '',
      botToken: currentSettings.botToken || sessionDecryptedKeys?.botToken || '',
    };
    const encrypted = await encryptSensitiveData(sensitive, password);

    sessionPassword = password;
    sessionDecryptedKeys = sensitive;

    const raw = Storage.getRawSettings();
    const toSave = { ...raw, ...currentSettings, _encrypted_keys: encrypted };
    delete toSave.apiKey;
    delete toSave.botToken;

    localStorage.setItem('cr_settings', JSON.stringify(toSave));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-protection-changed', { detail: { enabled: true } }));
    }
    return true;
  },

  disablePasswordProtection: () => {
    const settings = Storage.getSettings();
    delete settings._encrypted_keys;
    // 明文還原回 localStorage
    localStorage.setItem('cr_settings', JSON.stringify(settings));

    sessionPassword = null;
    sessionDecryptedKeys = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-protection-changed', { detail: { enabled: false } }));
    }
    return true;
  },

  changePassword: async (oldPassword, newPassword) => {
    const raw = Storage.getRawSettings();
    if (!raw._encrypted_keys) {
      throw new Error('NO_PASSWORD_PROTECTION');
    }
    // 驗證舊密碼
    const decrypted = await decryptSensitiveData(raw._encrypted_keys, oldPassword);
    // 用新密碼重新加密
    const encrypted = await encryptSensitiveData(decrypted, newPassword);

    sessionPassword = newPassword;
    sessionDecryptedKeys = decrypted;

    const toSave = { ...raw, _encrypted_keys: encrypted };
    localStorage.setItem('cr_settings', JSON.stringify(toSave));
    return true;
  },

  getHistory: () => {
    try { return JSON.parse(localStorage.getItem('cr_history') || '[]'); } catch { return []; }
  },
  addHistory: (cards) => {
    const h = Storage.getHistory();
    h.unshift({ date: new Date().toISOString(), cards });
    localStorage.setItem('cr_history', JSON.stringify(h.slice(0, 30)));
  },
  getSchedule: () => {
    try { return JSON.parse(localStorage.getItem('cr_schedule') || '{}'); } catch { return {}; }
  },
  saveSchedule: (s) => localStorage.setItem('cr_schedule', JSON.stringify(s)),
  getScheduleMeta: () => {
    try { return JSON.parse(localStorage.getItem('cr_schedule_meta') || '{}'); } catch { return {}; }
  },
  saveScheduleMeta: (meta) => localStorage.setItem('cr_schedule_meta', JSON.stringify(meta)),
};
