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
    const sched = Storage.getSchedule();
    if (!sched || !sched.enabled) return;

    const next = computeNextRun(sched.hour, sched.frequency, sched.dayOfWeek);
    const msUntilNext = Math.max(0, next.getTime() - Date.now());

    console.log(`[useGlobalScheduler] Next run scheduled at: ${next.toLocaleString()} (in ${Math.round(msUntilNext / 1000 / 60)} mins)`);

    timerRef.current = setTimeout(async () => {
      console.log('[useGlobalScheduler] Timer fired. Executing scheduled task...');
      await executeScheduledTask(false);
      scheduleNext(); // 執行後安排下一次
    }, msUntilNext);
  }, []);

  const evaluateAndRun = useCallback(async () => {
    const sched = Storage.getSchedule();
    const meta = Storage.getScheduleMeta();

    if (!sched || !sched.enabled) {
      clearTimer();
      return;
    }

    // 檢查是否有錯過排程需要補跑
    const { shouldCatchUp, scheduledTime } = checkMissedRun(sched, meta);
    if (shouldCatchUp) {
      console.log(`[useGlobalScheduler] Missed run detected for ${scheduledTime.toLocaleString()}. Triggering catch-up...`);
      await executeScheduledTask(true);
    }

    // 重設下一次定時器
    scheduleNext();
  }, [scheduleNext]);

  useEffect(() => {
    // 初始啟動評估
    evaluateAndRun();

    // 監聽排程更新事件（使用者在設定頁存檔時）
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
      }, 4000);
    };

    window.addEventListener('cr:schedule-updated', handleScheduleUpdated);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('cr:scheduler-status', handleStatus);
    window.addEventListener('cr:scheduler-completed', handleCompleted);

    return () => {
      clearTimer();
      window.removeEventListener('cr:schedule-updated', handleScheduleUpdated);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('cr:scheduler-status', handleStatus);
      window.removeEventListener('cr:scheduler-completed', handleCompleted);
    };
  }, [evaluateAndRun]);

  return status;
}
