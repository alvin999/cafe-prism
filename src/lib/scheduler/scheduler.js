import { runResearchPipeline } from '../pipeline/core.js';
import { sendTelegram, formatTelegramMessage } from '../utils/telegram.js';
import { Storage } from '../utils/storage.js';

let isExecuting = false;

/**
 * 計算下一次預計執行的時間點
 */
export function computeNextRun(hour = 8, frequency = 'daily', dayOfWeek = 1, fromDate = new Date()) {
  const next = new Date(fromDate);
  next.setHours(hour, 0, 0, 0);

  if (frequency === 'daily') {
    if (next <= fromDate) {
      next.setDate(next.getDate() + 1);
    }
  } else {
    // weekly
    const currentDay = fromDate.getDay();
    let diff = (dayOfWeek - currentDay + 7) % 7;
    if (diff === 0 && next <= fromDate) {
      diff = 7;
    }
    next.setDate(fromDate.getDate() + diff);
  }
  return next;
}

/**
 * 計算剛過去、最近一次應當執行的排程時間點
 */
export function getPreviousScheduledRunTime(hour = 8, frequency = 'daily', dayOfWeek = 1, fromDate = new Date()) {
  const target = new Date(fromDate);
  target.setHours(hour, 0, 0, 0);

  if (frequency === 'daily') {
    if (target > fromDate) {
      target.setDate(target.getDate() - 1);
    }
  } else {
    // weekly
    const currentDay = fromDate.getDay();
    let diff = (currentDay - dayOfWeek + 7) % 7;
    if (diff === 0 && target > fromDate) {
      diff = 7;
    }
    target.setDate(fromDate.getDate() - diff);
  }
  return target;
}

const MAX_CATCH_UP_AGE_MS = 48 * 3600 * 1000; // 最多只補跑過去 48 小時內的排程

/**
 * 檢查是否錯過排程並需要補跑 (Catch-up)
 */
export function checkMissedRun(scheduleConfig, meta, now = new Date()) {
  if (!scheduleConfig || !scheduleConfig.enabled) {
    return { shouldCatchUp: false };
  }

  const lastTarget = getPreviousScheduledRunTime(
    scheduleConfig.hour ?? 8,
    scheduleConfig.frequency ?? 'daily',
    scheduleConfig.dayOfWeek ?? 1,
    now
  );

  const lastRunTimestamp = meta?.lastRunTimestamp || 0;
  const timeSinceTarget = now.getTime() - lastTarget.getTime();

  // 若距離該排程時間已超過 48 小時，視為休眠重啟，避免無預警自動補跑消耗大量 Token
  if (timeSinceTarget > MAX_CATCH_UP_AGE_MS) {
    return { shouldCatchUp: false, expired: true, scheduledTime: lastTarget };
  }

  // 若最近應執行的排程點大於上次成功執行時間，且當前時間已過該排程點
  if (lastRunTimestamp < lastTarget.getTime() && now.getTime() >= lastTarget.getTime()) {
    return {
      shouldCatchUp: true,
      scheduledTime: lastTarget,
    };
  }

  return { shouldCatchUp: false };
}

/**
 * 內部排程執行核心
 */
async function runTaskInternal(isCatchUp) {
  const sched = Storage.getSchedule();
  if (!sched || !sched.enabled) {
    return { success: false, reason: 'schedule_disabled' };
  }

  const settings = Storage.getSettings();
  const lang = settings.language || 'zh';

  isExecuting = true;
  console.log(`[Scheduler] Starting ${isCatchUp ? 'catch-up' : 'scheduled'} task...`);

  // 發送開始事件
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cr:scheduler-status', {
      detail: { running: true, isCatchUp }
    }));
  }

  try {
    const cards = await runResearchPipeline({ ...settings, language: lang }, () => {});
    Storage.addHistory(cards);

    // Telegram 通知
    let telegramSent = false;
    if (sched.notifyTelegram && settings.botToken && settings.chatId) {
      try {
        const msg = formatTelegramMessage(cards, lang);
        await sendTelegram(settings.botToken, settings.chatId, msg);
        telegramSent = true;
      } catch (tgErr) {
        console.error('[Scheduler] Telegram notification failed:', tgErr);
      }
    }

    // 更新排程執行狀態元數據
    const meta = {
      lastRunTimestamp: Date.now(),
      lastRunStatus: 'success',
      lastRunType: isCatchUp ? 'catch_up' : 'scheduled',
      telegramSent,
      cardCount: cards.length,
    };
    Storage.saveScheduleMeta(meta);

    // 發送完成事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:scheduler-completed', {
        detail: { isCatchUp, cardsCount: cards.length, timestamp: Date.now() }
      }));
    }

    return { success: true, cards, meta };
  } catch (err) {
    console.error('[Scheduler] Task failed:', err);
    Storage.saveScheduleMeta({
      lastRunTimestamp: Date.now(),
      lastRunStatus: 'error',
      errorMessage: err.message,
    });
    return { success: false, error: err.message };
  } finally {
    isExecuting = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:scheduler-status', {
        detail: { running: false }
      }));
    }
  }
}

/**
 * 執行排程研究任務（支援 Web Locks API 跨分頁互斥防衝突）
 */
export async function executeScheduledTask(isCatchUp = false) {
  if (isExecuting) {
    console.warn('[Scheduler] Task is already running in current tab. Skipping duplicate execution.');
    return { success: false, reason: 'already_running' };
  }

  // 1. 若瀏覽器支援 Web Locks API，採用原生互斥鎖（防止多分頁重複觸發）
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return await navigator.locks.request(
      'cafe_prism_scheduler_lock',
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          console.warn('[Scheduler] Another browser tab holds the scheduler lock. Skipping execution in this tab.');
          return { success: false, reason: 'lock_held_by_another_tab' };
        }
        return await runTaskInternal(isCatchUp);
      }
    );
  }

  // 2. 備援方案：在單一分頁環境下直接執行
  return await runTaskInternal(isCatchUp);
}
