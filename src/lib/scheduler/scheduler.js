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
 * 檢查特定排程 Profile 是否錯過執行並需要補跑 (Catch-up)
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

  const lastRunTimestamp = scheduleConfig.lastRunTimestamp || meta?.lastRunTimestamp || 0;
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
 * 內部排程執行核心 (支援多任務 Profiles)
 */
async function runTaskInternal(isCatchUp, profileId = null) {
  const allProfiles = Storage.getScheduleProfiles();
  const targets = profileId
    ? allProfiles.filter(p => p.id === profileId)
    : allProfiles.filter(p => p.enabled);

  if (targets.length === 0) {
    return { success: false, reason: 'no_active_profile' };
  }

  const settings = Storage.getSettings();
  const lang = settings.language || 'zh';

  isExecuting = true;
  console.log(`[Scheduler] Starting ${isCatchUp ? 'catch-up' : 'scheduled'} task for ${targets.length} profile(s)...`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cr:scheduler-status', {
      detail: { running: true, isCatchUp }
    }));
  }

  let totalCards = 0;
  const updatedProfiles = [...allProfiles];

  try {
    for (const profile of targets) {
      console.log(`[Scheduler] Running profile: ${profile.name} (${profile.id})`);

      // 構建個別任務專屬 Pipeline 參數
      const profileSettings = {
        ...settings,
        language: lang,
      };

      if (profile.subscriptions && profile.subscriptions.length > 0) {
        profileSettings.keywords = profile.subscriptions.join(', ');
        profileSettings.discoveryMode = false;
      }

      if (profile.sources && profile.sources.length > 0) {
        profileSettings.enablePapers = profile.sources.includes('scholar');
        profileSettings.enableReddit = profile.sources.includes('reddit');
        profileSettings.enableNews = profile.sources.includes('rss');
      }

      const cards = await runResearchPipeline(profileSettings, () => {});
      totalCards += cards.length;
      Storage.addHistory(cards);

      // Telegram 推播通知
      let telegramSent = false;
      if (profile.notifyTelegram && settings.botToken && settings.chatId) {
        try {
          const msg = formatTelegramMessage(cards, lang, settings.telegramTemplate);
          await sendTelegram(settings.botToken, settings.chatId, msg);
          telegramSent = true;
        } catch (tgErr) {
          console.error(`[Scheduler] Telegram notification failed for profile ${profile.name}:`, tgErr);
        }
      }

      // 更新該 Profile 的最後執行戳記
      const pIdx = updatedProfiles.findIndex(p => p.id === profile.id);
      if (pIdx !== -1) {
        updatedProfiles[pIdx] = {
          ...updatedProfiles[pIdx],
          lastRunTimestamp: Date.now(),
          lastRunStatus: 'success',
          lastRunCardsCount: cards.length,
          lastTelegramSent: telegramSent
        };
      }
    }

    Storage.saveScheduleProfiles(updatedProfiles);

    const meta = {
      lastRunTimestamp: Date.now(),
      lastRunStatus: 'success',
      lastRunType: isCatchUp ? 'catch_up' : 'scheduled',
      cardCount: totalCards,
    };
    Storage.saveScheduleMeta(meta);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:scheduler-completed', {
        detail: { isCatchUp, cardsCount: totalCards, timestamp: Date.now() }
      }));
    }

    return { success: true, totalCards, meta };
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
export async function executeScheduledTask(isCatchUp = false, profileId = null) {
  if (isExecuting) {
    console.warn('[Scheduler] Task is already running in current tab. Skipping duplicate execution.');
    return { success: false, reason: 'already_running' };
  }

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return await navigator.locks.request(
      'cafe_prism_scheduler_lock',
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          console.warn('[Scheduler] Another browser tab holds the scheduler lock. Skipping execution in this tab.');
          return { success: false, reason: 'lock_held_by_another_tab' };
        }
        return await runTaskInternal(isCatchUp, profileId);
      }
    );
  }

  return await runTaskInternal(isCatchUp, profileId);
}
