import { useState, useEffect } from 'react';
import { runResearchPipeline, sendTelegram, formatTelegramMessage, Storage } from '../lib/engine.js';

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

  // 密碼解鎖流程狀態
  const [needUnlock, setNeedUnlock] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'run' | 'push' | null

  useEffect(() => {
    // Load last results from history
    const h = Storage.getHistory();
    if (h.length > 0) {
      setCards(h[0].cards || []);
      setSourceStatus(h[0].sourceStatus || null);
      setLastRun(new Date(h[0].date).toLocaleString());
    }
  }, []);

  const run = async () => {
    const raw = Storage.getRawSettings();
    // 若已啟用密碼保護且尚未解鎖，且需使用雲端金鑰或 Telegram
    if (Storage.hasPasswordProtection() && !Storage.isUnlocked()) {
      if (raw.modelType === 'cloud' || (raw.autoTelegram)) {
        setPendingAction('run');
        setNeedUnlock(true);
        return;
      }
    }

    const settings = Storage.getSettings();

    setRunning(true);
    setError('');
    setSentTelegram(false);
    setNoModelMode(null);

    try {
      const result = await runResearchPipeline(
        { ...settings, language: lang },
        (msg, pct) => { setProgressMsg(msg); setProgress(pct); }
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
        const msg = formatTelegramMessage(result, lang);
        await sendTelegram(settings.botToken, settings.chatId, msg);
        setSentTelegram(true);
      }
    } catch (e) {
      if (e.sourceStatus) {
        setSourceStatus(e.sourceStatus);
      }
      setError(e.message || 'Unknown error');
    } finally {
      setRunning(false);
      setProgress(0);
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
      const msg = formatTelegramMessage(cards, lang);
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
    needUnlock,
    handleUnlockSuccess,
    handleCancelUnlock,
    run,
    handleManualPush,
  };
}
