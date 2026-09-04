/**
 * Web Crypto API 封裝模組 (PBKDF2 + AES-GCM 256-bit)
 * 提供純瀏覽器端安全加解密，不依賴任何第三方套件。
 */

// Helper: Uint8Array 轉 Base64 字串
function uint8ToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 字串轉 Uint8Array
function base64ToUint8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 從使用者密碼與 Salt 衍生出 256 位元 AES-GCM 金鑰 (PBKDF2)
 */
async function deriveAesKey(password, saltUint8) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltUint8,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密敏感資料物件
 * @param {Object} dataObj 要加密的物件，如 { apiKey: '...', botToken: '...' }
 * @param {string} password 使用者自訂密碼
 * @returns {Promise<{ salt: string, iv: string, ciphertext: string }>}
 */
export async function encryptSensitiveData(dataObj, password) {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API is not supported in this browser.');
  }

  // 1. 產生隨機 16 bytes Salt 與 12 bytes IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 2. 衍生 AES 金鑰
  const aesKey = await deriveAesKey(password, salt);

  // 3. 加密 JSON 字串 (AES-GCM 自帶 AEAD 驗證標籤)
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(dataObj));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedData
  );

  return {
    salt: uint8ToBase64(salt),
    iv: uint8ToBase64(iv),
    ciphertext: uint8ToBase64(new Uint8Array(ciphertextBuffer)),
  };
}

/**
 * 解密敏感資料物件
 * @param {{ salt: string, iv: string, ciphertext: string }} encryptedPackage
 * @param {string} password 使用者密碼
 * @returns {Promise<Object>} 解密後的原始資料物件
 */
export async function decryptSensitiveData(encryptedPackage, password) {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API is not supported in this browser.');
  }

  const { salt, iv, ciphertext } = encryptedPackage;
  if (!salt || !iv || !ciphertext) {
    throw new Error('INVALID_ENCRYPTED_PACKAGE');
  }

  const saltUint8 = base64ToUint8(salt);
  const ivUint8 = base64ToUint8(iv);
  const ciphertextUint8 = base64ToUint8(ciphertext);

  // 1. 根據密碼與 Salt 衍生 AES 金鑰
  const aesKey = await deriveAesKey(password, saltUint8);

  // 2. 嘗試 AES-GCM 解密
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivUint8 },
      aesKey,
      ciphertextUint8
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  } catch (err) {
    // 若密碼不正確或資料損毀，AES-GCM 會拋出 OperationError
    const error = new Error('INCORRECT_PASSWORD');
    error.cause = err;
    throw error;
  }
}
