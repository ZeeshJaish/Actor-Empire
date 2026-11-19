/* 2026-11-12 (player reports: "crashes every 10ish minutes", "the game just resets to the main menu"):
   when iOS or Android kills the web view for memory, the game simply starts again and Crashlytics sees
   nothing. A small marker says the game is open; going to the background marks it closed cleanly. If the
   next start finds it still open, the last session ended while playing, and the marker's last screen,
   save time and memory go to Crashlytics as a non-fatal, so these crashes name a cause. */

const KEY = 'ae.lastSession.v1';

export interface SessionBreadcrumb {
  live: boolean;
  at: number;
  version?: string;
  screen?: string;
  week?: string;
  lastSaveMs?: number;
  heapMb?: number;
  /** Phase 1 (2026-11-17): Week Ahead's state and the open slot, so a kill while it ran keeps it off. */
  weekAhead?: 'on' | 'off';
  slot?: number;
  /** Phase 1 (2026-11-17): the game's stored data in MB when the career opened (navigator.storage.estimate). */
  storageMb?: number;
}

const read = (): SessionBreadcrumb | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as SessionBreadcrumb : null;
  } catch { return null; }
};

const write = (value: SessionBreadcrumb) => {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage full or blocked: the marker is best effort */ }
};

const heapMb = (): number | undefined => {
  const memory = (typeof performance !== 'undefined' ? (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory : undefined);
  return memory?.usedJSHeapSize ? Math.round(memory.usedJSHeapSize / 1_048_576) : undefined;
};

/** The previous session, if it ended while the game was open (a kill, not a close). Read once at start. */
export const takeUncleanPreviousSession = (): SessionBreadcrumb | null => {
  const previous = read();
  return previous?.live ? previous : null;
};

export const noteSessionLive = (patch: Partial<Omit<SessionBreadcrumb, 'live' | 'at'>> = {}) => {
  const current = read();
  write({ ...(current || {}), ...patch, heapMb: heapMb() ?? patch.heapMb ?? current?.heapMb, live: true, at: Date.now() });
};

/** Phase 1 (2026-11-17): adds details to the marker without changing whether the session counts as live. */
export const noteSessionDetail = (patch: Partial<Pick<SessionBreadcrumb, 'weekAhead' | 'slot' | 'storageMb'>>) => {
  const current = read();
  if (!current) return;
  write({ ...current, ...patch });
};

export const noteSessionClean = () => {
  const current = read();
  write({ ...(current || { at: Date.now() }), live: false, at: Date.now() });
};
