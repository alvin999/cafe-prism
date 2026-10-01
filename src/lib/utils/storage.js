import {
  encryptSensitiveData,
  decryptSensitiveData,
  encryptWithDeviceKey,
  decryptWithDeviceKey,
} from './crypto.js';

// ─── In-memory session key & password cache (僅存放於當前分頁 RAM，不寫入硬碟) ───
let sessionDecryptedKeys = null; // { apiKey: string, apiKeys: object, botToken: string, scholarApiKey: string }
let sessionPassword = null;
let transparentInitPromise = null;

function normalizeApiKeys(raw) {
  const keys = { ...(raw.apiKeys || {}) };
  if (raw.apiKey && !keys[raw.provider || 'groq']) {
    keys[raw.provider || 'groq'] = raw.apiKey;
  }
  return keys;
}

function getRawSettingsInternal() {
  try {
    return JSON.parse(localStorage.getItem('cr_settings') || '{}');
  } catch {
    return {};
  }
}

// ─── 自動背景透明解密 ─────────────────────────────────────────────────────────
async function initTransparentDecryption() {
  if (typeof window === 'undefined') return;
  try {
    const raw = getRawSettingsInternal();
    if (raw._transparent_keys && !sessionDecryptedKeys) {
      const decrypted = await decryptWithDeviceKey(raw._transparent_keys);
      const keys = decrypted.apiKeys || (decrypted.apiKey ? { [raw.provider || 'groq']: decrypted.apiKey } : {});
      sessionDecryptedKeys = {
        apiKey: decrypted.apiKey || (keys[raw.provider || 'groq'] || ''),
        apiKeys: keys,
        botToken: decrypted.botToken || '',
        scholarApiKey: decrypted.scholarApiKey || '',
      };
      window.dispatchEvent(new CustomEvent('cr:storage-unlocked'));
      window.dispatchEvent(new CustomEvent('cr:settings-updated'));
    }
  } catch (err) {
    console.warn('[CafePrism] 自動透明解密失敗:', err);
  }
}

// ─── LocalStorage persistence ─────────────────────────────────────────────────
export const Storage = {
  getRawSettings: getRawSettingsInternal,

  /**
   * 取得當前金鑰儲存防護模式：
   * - 'plaintext': 明文存於 LocalStorage
   * - 'transparent': 裝置透明加密（Web Crypto 非導出金鑰，免密碼）
   * - 'password': 主密碼防護（PBKDF2 加密，需手動解鎖）
   */
  getSecurityMode: () => {
    const raw = Storage.getRawSettings();
    if (raw._encrypted_keys) return 'password';
    if (raw._transparent_keys) return 'transparent';
    return 'plaintext';
  },

  hasPasswordProtection: () => {
    return Storage.getSecurityMode() === 'password';
  },

  hasTransparentProtection: () => {
    return Storage.getSecurityMode() === 'transparent';
  },

  isUnlocked: () => {
    const mode = Storage.getSecurityMode();
    if (mode === 'plaintext' || mode === 'transparent') return true;
    return Boolean(sessionDecryptedKeys);
  },

  ensureReady: () => transparentInitPromise || Promise.resolve(),

  getSessionPassword: () => sessionPassword,

  getSettings: () => {
    const raw = Storage.getRawSettings();
    const discoveryMode = raw.discoveryMode !== undefined ? raw.discoveryMode : true;

    // 1. 裝置透明加密模式
    if (raw._transparent_keys) {
      if (sessionDecryptedKeys) {
        const keys = sessionDecryptedKeys.apiKeys || (sessionDecryptedKeys.apiKey ? { [raw.provider || 'groq']: sessionDecryptedKeys.apiKey } : {});
        return {
          ...raw,
          discoveryMode,
          apiKeys: keys,
          apiKey: keys[raw.provider || 'groq'] || sessionDecryptedKeys.apiKey || '',
          botToken: sessionDecryptedKeys.botToken || '',
          scholarApiKey: sessionDecryptedKeys.scholarApiKey || '',
        };
      }
      // 若尚未完成非同步解密，觸發背景解密
      initTransparentDecryption();
      return {
        ...raw,
        discoveryMode,
        apiKeys: {},
        apiKey: '',
        botToken: '',
        scholarApiKey: '',
      };
    }

    // 2. 主密碼保護模式
    if (raw._encrypted_keys) {
      if (sessionDecryptedKeys) {
        const keys = sessionDecryptedKeys.apiKeys || (sessionDecryptedKeys.apiKey ? { [raw.provider || 'groq']: sessionDecryptedKeys.apiKey } : {});
        return {
          ...raw,
          discoveryMode,
          apiKeys: keys,
          apiKey: keys[raw.provider || 'groq'] || sessionDecryptedKeys.apiKey || '',
          botToken: sessionDecryptedKeys.botToken || '',
          scholarApiKey: sessionDecryptedKeys.scholarApiKey || '',
        };
      }
      // 尚未解鎖時，遮蔽敏感金鑰
      return {
        ...raw,
        discoveryMode,
        apiKeys: {},
        apiKey: '',
        botToken: '',
        scholarApiKey: '',
      };
    }

    // 3. 明文模式
    const normalizedKeys = normalizeApiKeys(raw);
    return {
      ...raw,
      discoveryMode,
      apiKeys: normalizedKeys,
      apiKey: normalizedKeys[raw.provider || 'groq'] || raw.apiKey || '',
      scholarApiKey: raw.scholarApiKey || '',
    };
  },

  saveSettings: async (s) => {
    const raw = Storage.getRawSettings();
    const mode = Storage.getSecurityMode();

    if (mode === 'password') {
      const toSave = { ...s };
      if (sessionPassword) {
        const sensitive = {
          apiKey: s.apiKey ?? sessionDecryptedKeys?.apiKey ?? '',
          apiKeys: s.apiKeys ?? sessionDecryptedKeys?.apiKeys ?? (s.apiKey ? { [s.provider || 'groq']: s.apiKey } : {}),
          botToken: s.botToken ?? sessionDecryptedKeys?.botToken ?? '',
          scholarApiKey: s.scholarApiKey ?? sessionDecryptedKeys?.scholarApiKey ?? '',
        };
        const encrypted = await encryptSensitiveData(sensitive, sessionPassword);
        toSave._encrypted_keys = encrypted;
        sessionDecryptedKeys = sensitive;
      } else {
        toSave._encrypted_keys = raw._encrypted_keys;
      }
      delete toSave._transparent_keys;
      delete toSave.apiKey;
      delete toSave.apiKeys;
      delete toSave.botToken;
      delete toSave.scholarApiKey;
      localStorage.setItem('cr_settings', JSON.stringify(toSave));
    } else if (mode === 'transparent') {
      const toSave = { ...s };
      const sensitive = {
        apiKey: s.apiKey ?? sessionDecryptedKeys?.apiKey ?? '',
        apiKeys: s.apiKeys ?? sessionDecryptedKeys?.apiKeys ?? (s.apiKey ? { [s.provider || 'groq']: s.apiKey } : {}),
        botToken: s.botToken ?? sessionDecryptedKeys?.botToken ?? '',
        scholarApiKey: s.scholarApiKey ?? sessionDecryptedKeys?.scholarApiKey ?? '',
      };
      try {
        const encrypted = await encryptWithDeviceKey(sensitive);
        toSave._transparent_keys = encrypted;
        sessionDecryptedKeys = sensitive;
      } catch (err) {
        console.error('[CafePrism] 透明加密儲存失敗:', err);
        if (raw._transparent_keys) toSave._transparent_keys = raw._transparent_keys;
      }
      delete toSave._encrypted_keys;
      delete toSave.apiKey;
      delete toSave.apiKeys;
      delete toSave.botToken;
      delete toSave.scholarApiKey;
      localStorage.setItem('cr_settings', JSON.stringify(toSave));
    } else {
      // 明文模式，直接儲存
      const toSave = { ...s };
      delete toSave._encrypted_keys;
      delete toSave._transparent_keys;
      localStorage.setItem('cr_settings', JSON.stringify(toSave));
    }
  },

  unlock: async (password) => {
    const raw = Storage.getRawSettings();
    if (!raw._encrypted_keys) return true;

    const decrypted = await decryptSensitiveData(raw._encrypted_keys, password);
    sessionPassword = password;
    const keys = decrypted.apiKeys || (decrypted.apiKey ? { [raw.provider || 'groq']: decrypted.apiKey } : {});
    sessionDecryptedKeys = {
      apiKey: decrypted.apiKey || (keys[raw.provider || 'groq'] || ''),
      apiKeys: keys,
      botToken: decrypted.botToken || '',
      scholarApiKey: decrypted.scholarApiKey || '',
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-unlocked'));
      window.dispatchEvent(new CustomEvent('cr:settings-updated'));
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

  /**
   * 啟用裝置透明加密模式 (免密碼)
   */
  enableTransparentProtection: async (currentSettings = {}) => {
    const sensitive = {
      apiKey: currentSettings.apiKey || sessionDecryptedKeys?.apiKey || '',
      apiKeys: currentSettings.apiKeys || sessionDecryptedKeys?.apiKeys || (currentSettings.apiKey ? { [currentSettings.provider || 'groq']: currentSettings.apiKey } : {}),
      botToken: currentSettings.botToken || sessionDecryptedKeys?.botToken || '',
      scholarApiKey: currentSettings.scholarApiKey || sessionDecryptedKeys?.scholarApiKey || '',
    };

    const encrypted = await encryptWithDeviceKey(sensitive);
    sessionPassword = null;
    sessionDecryptedKeys = sensitive;

    const raw = Storage.getRawSettings();
    const toSave = { ...raw, ...currentSettings, _transparent_keys: encrypted };
    delete toSave._encrypted_keys;
    delete toSave.apiKey;
    delete toSave.apiKeys;
    delete toSave.botToken;
    delete toSave.scholarApiKey;

    localStorage.setItem('cr_settings', JSON.stringify(toSave));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-protection-changed', { detail: { mode: 'transparent' } }));
      window.dispatchEvent(new CustomEvent('cr:settings-updated'));
    }
    return true;
  },

  enablePasswordProtection: async (password, currentSettings = {}) => {
    const sensitive = {
      apiKey: currentSettings.apiKey || sessionDecryptedKeys?.apiKey || '',
      apiKeys: currentSettings.apiKeys || sessionDecryptedKeys?.apiKeys || (currentSettings.apiKey ? { [currentSettings.provider || 'groq']: currentSettings.apiKey } : {}),
      botToken: currentSettings.botToken || sessionDecryptedKeys?.botToken || '',
      scholarApiKey: currentSettings.scholarApiKey || sessionDecryptedKeys?.scholarApiKey || '',
    };
    const encrypted = await encryptSensitiveData(sensitive, password);

    sessionPassword = password;
    sessionDecryptedKeys = sensitive;

    const raw = Storage.getRawSettings();
    const toSave = { ...raw, ...currentSettings, _encrypted_keys: encrypted };
    delete toSave._transparent_keys;
    delete toSave.apiKey;
    delete toSave.apiKeys;
    delete toSave.botToken;
    delete toSave.scholarApiKey;

    localStorage.setItem('cr_settings', JSON.stringify(toSave));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-protection-changed', { detail: { enabled: true, mode: 'password' } }));
      window.dispatchEvent(new CustomEvent('cr:settings-updated'));
    }
    return true;
  },

  /**
   * 切換回明文模式 (Plaintext)
   */
  disableProtectionToPlaintext: () => {
    const settings = Storage.getSettings();
    delete settings._encrypted_keys;
    delete settings._transparent_keys;
    // 將金鑰明文寫回 localStorage
    localStorage.setItem('cr_settings', JSON.stringify(settings));

    sessionPassword = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:storage-protection-changed', { detail: { enabled: false, mode: 'plaintext' } }));
      window.dispatchEvent(new CustomEvent('cr:settings-updated'));
    }
    return true;
  },

  disablePasswordProtection: () => {
    return Storage.disableProtectionToPlaintext();
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
  addHistory: (cards, sourceStatus = null) => {
    const h = Storage.getHistory();
    const statusToSave = sourceStatus || cards?.sourceStatus || null;
    h.unshift({ date: new Date().toISOString(), cards, sourceStatus: statusToSave });
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

  exportBackup: () => {
    const rawSettings = Storage.getRawSettings();
    const schedule = Storage.getSchedule();
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'CafePrism',
      settings: rawSettings,
      schedule,
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackup: (jsonString) => {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('INVALID_JSON');
    }
    if (!parsed || typeof parsed !== 'object' || (parsed.appName !== 'CafePrism' && !parsed.settings)) {
      throw new Error('INVALID_BACKUP_FORMAT');
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      localStorage.setItem('cr_settings', JSON.stringify(parsed.settings));
    }
    if (parsed.schedule && typeof parsed.schedule === 'object') {
      localStorage.setItem('cr_schedule', JSON.stringify(parsed.schedule));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cr:settings-updated'));
      window.dispatchEvent(new Event('cr:schedule-updated'));
    }
    return true;
  },
};

// 瀏覽器載入且 Storage 物件已完整就緒後，在背景觸發自動透明解密
if (typeof window !== 'undefined') {
  transparentInitPromise = initTransparentDecryption();
}
