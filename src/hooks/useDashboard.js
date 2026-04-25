import { useState, useEffect } from 'react';
import { runResearchPipeline, sendTelegram, formatTelegramMessage, Storage } from '../lib/engine.js';

export function useDashboard(lang) {
  const [cards, setCards] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [lastRun, setLastRun] = useState('');
  const [sentTelegram, setSentTelegram] = useState(false);

  useEffect(() => {
    // Load last results from history
    const h = Storage.getHistory();
    if (h.length > 0) {
      setCards(h[0].cards || []);
      setLastRun(new Date(h[0].date).toLocaleString());
    }
  }, []);

  const run = async () => {
    const settings = Storage.getSettings();
    if (!settings.modelType) {
      setError(lang === 'zh' ? '請先前往「設定」頁面配置 AI 模型。' : 'Please configure an AI model in Settings first.');
      return;
    }

    setRunning(true);
    setError('');
    setSentTelegram(false);

    try {
      const result = await runResearchPipeline(
        { ...settings, language: lang },
        (msg, pct) => { setProgressMsg(msg); setProgress(pct); }
      );
      setCards(result);
      Storage.addHistory(result);
      setLastRun(new Date().toLocaleString());

      // Auto-push to Telegram if configured
      if (settings.botToken && settings.chatId && settings.autoTelegram) {
        const msg = formatTelegramMessage(result, lang);
        await sendTelegram(settings.botToken, settings.chatId, msg);
        setSentTelegram(true);
      }
    } catch (e) {
      setError(e.message || 'Unknown error');
    } finally {
      setRunning(false);
      setProgress(0);
    }
  };

  const handleManualPush = async () => {
    const settings = Storage.getSettings();
    if (!settings.botToken || !settings.chatId) {
      setError(lang === 'zh' ? '請先前往「設定」配置 Telegram Bot Token 和 Chat ID。' : 'Please configure Telegram Bot Token and Chat ID in Settings first.');
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

  return {
    cards,
    running,
    progress,
    progressMsg,
    error,
    lastRun,
    sentTelegram,
    run,
    handleManualPush
  };
}
