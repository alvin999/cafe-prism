import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Storage,
  computeNextRun,
  checkMissedRun,
  executeScheduledTask,
} from '../lib/engine.js';

export function useGlobalScheduler() {
  const [status, setStatus] = useState({
    running: false,
    isCatchUp: false,
    toastMessage: null,
  });
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleNext = useCallback(() => {
    clearTimer();
    const profiles = Storage.getScheduleProfiles ? Storage.getScheduleProfiles() : [];
    const activeProfiles = profiles.filter(p => p.enabled);
    if (activeProfiles.length === 0) return;

    // 計算所有已啟用任務中，最快到達的下一次時間
    const runs = activeProfiles.map(p => ({
      profile: p,
      next: computeNextRun(p.hour, p.frequency, p.dayOfWeek)
    }));

    runs.sort((a, b) => a.next.getTime() - b.next.getTime());
    const earliest = runs[0];
    const msUntilNext = Math.max(0, earliest.next.getTime() - Date.now());

    console.log(`[useGlobalScheduler] Earliest run (${earliest.profile.name}) scheduled at: ${earliest.next.toLocaleString()} (in ${Math.round(msUntilNext / 1000 / 60)} mins)`);

    timerRef.current = setTimeout(async () => {
      console.log(`[useGlobalScheduler] Timer fired for ${earliest.profile.name}. Executing scheduled task...`);
      await executeScheduledTask(false, earliest.profile.id);
      scheduleNext();
    }, msUntilNext);
  }, []);

  const evaluateAndRun = useCallback(async () => {
    const profiles = Storage.getScheduleProfiles ? Storage.getScheduleProfiles() : [];
    const activeProfiles = profiles.filter(p => p.enabled);
    const meta = Storage.getScheduleMeta();

    if (activeProfiles.length === 0) {
      clearTimer();
      return;
    }

    // 檢查是否有任何 profile 錯過排程需要補跑
    for (const p of activeProfiles) {
      const { shouldCatchUp, scheduledTime } = checkMissedRun(p, meta);
      if (shouldCatchUp) {
        console.log(`[useGlobalScheduler] Missed run detected for profile "${p.name}" (${scheduledTime.toLocaleString()}). Triggering catch-up...`);
        await executeScheduledTask(true, p.id);
      }
    }

    // 重設下一次定時器
    scheduleNext();
  }, [scheduleNext]);

  useEffect(() => {
    // 初始啟動評估
    evaluateAndRun();

    // 監聽排程更新事件
    const handleScheduleUpdated = () => {
      console.log('[useGlobalScheduler] Schedule configuration updated. Re-evaluating...');
      evaluateAndRun();
    };

    // 監聽分頁能見度與網路恢復
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useGlobalScheduler] Tab became visible. Checking schedule...');
        evaluateAndRun();
      }
    };

    const handleOnline = () => {
      console.log('[useGlobalScheduler] Network restored. Checking schedule...');
      evaluateAndRun();
    };

    // 監聽執行狀態廣播以呈現微反饋 Toast
    const handleStatus = (e) => {
      const { running, isCatchUp } = e.detail || {};
      setStatus(prev => ({
        ...prev,
        running: !!running,
        isCatchUp: !!isCatchUp,
      }));
    };

    const handleCompleted = (e) => {
      const { isCatchUp, cardsCount } = e.detail || {};
      const msg = isCatchUp
        ? `⚡ 延遲補跑完成：已分析 ${cardsCount} 篇研究並同步`
        : `✓ 定時排程完成：已分析 ${cardsCount} 篇研究`;

      setStatus(prev => ({
        ...prev,
        toastMessage: msg,
      }));

      setTimeout(() => {
        setStatus(prev => ({ ...prev, toastMessage: null }));
      }, 5000);
    };

    window.addEventListener('cr:schedule-updated', handleScheduleUpdated);
    window.addEventListener('cr:settings-updated', handleScheduleUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('cr:scheduler-status', handleStatus);
    window.addEventListener('cr:scheduler-completed', handleCompleted);

    return () => {
      clearTimer();
      window.removeEventListener('cr:schedule-updated', handleScheduleUpdated);
      window.removeEventListener('cr:settings-updated', handleScheduleUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('cr:scheduler-status', handleStatus);
      window.removeEventListener('cr:scheduler-completed', handleCompleted);
    };
  }, [evaluateAndRun]);

  return status;
}
