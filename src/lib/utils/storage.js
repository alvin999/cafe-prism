// ─── LocalStorage persistence ─────────────────────────────────────────────────
export const Storage = {
  getSettings: () => {
    try { return JSON.parse(localStorage.getItem('cr_settings') || '{}'); } catch { return {}; }
  },
  saveSettings: (s) => localStorage.setItem('cr_settings', JSON.stringify(s)),
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
};
