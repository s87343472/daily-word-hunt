/**
 * Local progress: completed puzzles + daily streak (client-only).
 * Keyed by pack + play date so series don't clobber each other.
 */

const STORAGE_KEY = "dwh-progress-v1";

export type ProgressStore = {
  v: 1;
  /** ISO dates completed per pack id */
  completed: Record<string, string[]>;
  /** last completion date (default pack / any?) for streak — use daily pack */
  lastDailyDate?: string;
  streak: number;
  bestStreak: number;
};

function empty(): ProgressStore {
  return { v: 1, completed: {}, streak: 0, bestStreak: 0 };
}

export function readProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as ProgressStore;
    if (p?.v !== 1 || typeof p.completed !== "object") return empty();
    return {
      v: 1,
      completed: p.completed ?? {},
      lastDailyDate: p.lastDailyDate,
      streak: Number(p.streak) || 0,
      bestStreak: Number(p.bestStreak) || 0,
    };
  } catch {
    return empty();
  }
}

function writeProgress(p: ProgressStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Mark a puzzle complete; returns updated store (streak only for daily pack). */
export function markPuzzleComplete(
  packId: string,
  playDate: string | undefined,
  timeMs: number
): ProgressStore {
  const store = readProgress();
  const date = playDate || new Date().toISOString().slice(0, 10);
  const list = new Set(store.completed[packId] ?? []);
  const already = list.has(date);
  list.add(date);
  store.completed[packId] = [...list].sort();

  if (packId === "daily" && !already) {
    if (store.lastDailyDate === addDaysISO(date, -1)) {
      store.streak = (store.streak || 0) + 1;
    } else if (store.lastDailyDate === date) {
      // same day re-complete: keep streak
    } else {
      store.streak = 1;
    }
    store.lastDailyDate = date;
    store.bestStreak = Math.max(store.bestStreak || 0, store.streak);
  }

  // stash last time for share text (optional)
  try {
    localStorage.setItem(
      `dwh-last-time:${packId}:${date}`,
      String(timeMs)
    );
  } catch {
    /* ignore */
  }

  writeProgress(store);
  return store;
}

export function isCompleted(packId: string, playDate: string): boolean {
  return (readProgress().completed[packId] ?? []).includes(playDate);
}

export function formatShareText(opts: {
  title: string;
  date?: string;
  timeLabel: string;
  streak: number;
  url: string;
}): string {
  const day = opts.date ? ` (${opts.date})` : "";
  const streak =
    opts.streak > 1 ? ` · ${opts.streak}-day streak` : "";
  return `I finished ${opts.title}${day} in ${opts.timeLabel}${streak} on Daily Word Hunt ${opts.url}`;
}
