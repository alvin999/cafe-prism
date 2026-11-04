import { useState, useEffect, useRef } from 'react';
import {
  runResearchPipeline,
  sendTelegram,
  formatTelegramMessage,
  Storage,
  hasConfiguredModel,
  getSampleCards,
  getSampleSourceStatus,
  KeyStatus,
} from '../lib/engine.js';

export function useDashboard(lang, t = null) {
  const [cards, setCards] = useState([]);
  const [sourceStatus, setSourceStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [lastRun, setLastRun] = useState('');
  const [sentTelegram, setSentTelegram] = useState(false);
  const [noModelMode, setNoModelMode] = useState(null); // null, 'no_config', 'conn_error'
  const [isSample, setIsSample] = useState(false);

  const abortControllerRef = useRef(null);

  // 密碼解鎖流程狀態
  const [needUnlock, setNeedUnlock] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'run' | 'push' | null

  useEffect(() => {
    const settings = Storage.getSettings();
    const provider = settings.provider || 'groq';
    const apiKey = (settings.apiKeys && settings.apiKeys[provider]) || settings.apiKey || '';
    const knownInvalid = KeyStatus.isKnownInvalid(provider, apiKey);
    const knownError = KeyStatus.getStatus(provider, apiKey)?.error;

    // 若當前金鑰在設定頁已知無效或連線失敗，0秒直接切換至 Sample 示範卡片與錯誤橫幅
    if (knownInvalid) {
      setCards(getSampleCards(lang));
      setSourceStatus(getSampleSourceStatus());
      setIsSample(true);
      setNoModelMode('auth_error');
      setError(knownError || '連線失敗或金鑰無效');
      return;
    }

    // Load last results from history
    const h = Storage.getHistory();
    if (h.length > 0) {
      setCards(h[0].cards || []);
      setSourceStatus(h[0].sourceStatus || null);
      setLastRun(new Date(h[0].date).toLocaleString());
      setIsSample(Boolean(h[0].cards?.[0]?.isSample));
    } else {
      // 若初次使用無歷史紀錄且尚未輸入金鑰，直接秒出 Sample 畫面，免去讀取假動作
      if (!hasConfiguredModel(settings)) {
        setCards(getSampleCards(lang));
        setSourceStatus(getSampleSourceStatus());
        setIsSample(true);
      }
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 即時監聽設定頁的金鑰驗證狀態變更 (跨頁 0 秒同步)
  useEffect(() => {
    const handleKeyStatusChange = (e) => {
      const { isValid, error: errReason } = e.detail || {};
      if (!isValid) {
        setCards(getSampleCards(lang));
        setSourceStatus(getSampleSourceStatus());
        setIsSample(true);
        setNoModelMode('auth_error');
        setError(errReason || '連線失敗或金鑰無效');
      } else {
        setNoModelMode(null);
        setError('');
      }
    };
    window.addEventListener('cr:key-status-changed', handleKeyStatusChange);
    return () => window.removeEventListener('cr:key-status-changed', handleKeyStatusChange);
  }, [lang]);

  // 當使用者在示範模式下切換語系時，即時更新示範卡片語系
  useEffect(() => {
    if (isSample) {
      setCards(getSampleCards(lang));
    }
  }, [lang, isSample]);

  const cancelRun = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setRunning(false);
      setProgress(0);
      setProgressMsg('');
    }
  };

  const run = async () => {
    const raw = Storage.getRawSettings();
    const settings = Storage.getSettings();

    // 關鍵體驗優化 1：如果尚未輸入金鑰，0秒直接顯示 Sample 示範畫面
    if (!hasConfiguredModel(settings)) {
      setCards(getSampleCards(lang));
      setSourceStatus(getSampleSourceStatus());
      setIsSample(true);
      setRunning(false);
      setProgress(0);
      setProgressMsg('');
      setError('');
      setNoModelMode(null);
      return;
    }

    // 關鍵體驗優化 2：如果該金鑰在設定頁已知無效或連線失敗，0秒直接攔截，絕不發起任何網路請求！
    const provider = settings.provider || 'groq';
    const apiKey = (settings.apiKeys && settings.apiKeys[provider]) || settings.apiKey || '';
    if (KeyStatus.isKnownInvalid(provider, apiKey)) {
      const errReason = KeyStatus.getStatus(provider, apiKey)?.error || '連線失敗或金鑰無效';
      setCards(getSampleCards(lang));
      setSourceStatus(getSampleSourceStatus());
      setIsSample(true);
      setRunning(false);
      setProgress(0);
      setProgressMsg('');
      setNoModelMode('auth_error');
      setError(errReason);
      return;
    }

    // 若已啟用密碼保護且尚未解鎖，且需使用雲端金鑰或 Telegram
    if (Storage.hasPasswordProtection() && !Storage.isUnlocked()) {
      if (raw.modelType === 'cloud' || (raw.autoTelegram)) {
        setPendingAction('run');
        setNeedUnlock(true);
        return;
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunning(true);
    setIsSample(false);
    setError('');
    setSentTelegram(false);
    setNoModelMode(null);

    try {
      const result = await runResearchPipeline(
        { ...settings, language: lang },
        (msg, pct) => { setProgressMsg(msg); setProgress(pct); },
        controller.signal
      );
      setCards(result);
      const status = result.sourceStatus || null;
      setSourceStatus(status);
      Storage.addHistory(result, status);
      setLastRun(new Date().toLocaleString());

      // Detect if all cards are in no-model fallback mode
      const anyLlmError = result.some(c => c.llmError);
      const allNoModel = result.length > 0 && result.every(c => c.noModel);

      if (allNoModel) {
        setNoModelMode(anyLlmError ? 'conn_error' : 'no_config');
      } else {
        setNoModelMode(null);
      }

      // Auto-push to Telegram if configured
      if (settings.botToken && settings.chatId && settings.autoTelegram) {
        const msg = formatTelegramMessage(result, lang, settings.telegramTemplate);
        await sendTelegram(settings.botToken, settings.chatId, msg);
        setSentTelegram(true);
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[Dashboard] Research run cancelled by user.');
        return;
      }
      if (e.sourceStatus) {
        setSourceStatus(e.sourceStatus);
      }

      // 檢查是否為金鑰無效或連線失敗 (Fast-Fail 反饋)
      const isAuth = e.isAuthError || e.name === 'LLMAuthError';
      const isConn = e.isConnectionError || e.name === 'LLMConnectionError';

      if (isAuth || isConn) {
        // 立即中斷讀取，呈現 Sample 示範卡片並精確標註錯誤類型
        setCards(getSampleCards(lang));
        setSourceStatus(getSampleSourceStatus());
        setIsSample(true);
        setNoModelMode(isAuth ? 'auth_error' : 'conn_error');
        setError(e.message);
        return;
      }

      setError(e.message || 'Unknown error');
    } finally {
      abortControllerRef.current = null;
      setRunning(false);
      setProgress(0);
      setProgressMsg('');
    }
  };

  const handleManualPush = async () => {
    if (Storage.hasPasswordProtection() && !Storage.isUnlocked()) {
      setPendingAction('push');
      setNeedUnlock(true);
      return;
    }

    const settings = Storage.getSettings();
    if (!settings.botToken || !settings.chatId) {
      setError(t?.dashboard?.messages?.telegramNotConfigured || 'Please configure Telegram Bot Token and Chat ID in Settings first.');
      return;
    }

    setRunning(true);
    setError('');
    try {
      const msg = formatTelegramMessage(cards, lang, settings.telegramTemplate);
      await sendTelegram(settings.botToken, settings.chatId, msg);
      setSentTelegram(true);
    } catch (e) {
      setError(e.message || 'Telegram error');
    } finally {
      setRunning(false);
    }
  };

  const handleUnlockSuccess = () => {
    setNeedUnlock(false);
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'run') {
      setTimeout(run, 50);
    } else if (action === 'push') {
      setTimeout(handleManualPush, 50);
    }
  };

  const handleCancelUnlock = () => {
    setNeedUnlock(false);
    setPendingAction(null);
  };

  return {
    cards,
    sourceStatus,
    running,
    progress,
    progressMsg,
    error,
    lastRun,
    sentTelegram,
    noModelMode,
    isSample,
    needUnlock,
    handleUnlockSuccess,
    handleCancelUnlock,
    run,
    cancelRun,
    handleManualPush,
  };
}
