import { PORTRAIT_PENDING_PREFIX, WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL, type WeekAheadToMain, type WeekAheadToWorker } from './weekAheadProtocol';

/* Week Ahead worker bootstrap (2026-11-12). The game code builds its NPC list, crew and other people when it
   loads, with portraits drawn on a canvas. A worker has no canvas, so this file loads no game code until the
   main thread's 'init' arrives: its portraits are installed first, and the game code is loaded after, so every
   person here carries exactly the main thread's portrait. Nothing else happens in this file. */

const post = (message: WeekAheadToMain) => (self as unknown as { postMessage: (m: unknown) => void }).postMessage(message);
const scope = self as unknown as { onmessage: ((event: MessageEvent<WeekAheadToWorker>) => void) | null };

scope.onmessage = event => {
    const message = event.data;
    if (message.kind !== 'init') return;
    scope.onmessage = null;
    const table = new Map(message.portraits);
    let loadMisses = 0;
    (globalThis as Record<string, unknown>)[WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL] = (_gender: unknown, _seed: unknown, cacheKey: string) => {
        const portrait = table.get(cacheKey);
        if (portrait) return portrait;
        // A person rolled differently here than on the main thread: the NPC hand-over replaces it, and any copy
        // that reaches a week is found and drawn by the main thread before that week is saved.
        loadMisses += 1;
        return `${PORTRAIT_PENDING_PREFIX}${cacheKey}`;
    };
    import('./weekAheadWorkerMain').then(module => {
        delete (globalThis as Record<string, unknown>)[WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL];
        module.startWeekAheadWorker(message, table, loadMisses);
    }, error => {
        delete (globalThis as Record<string, unknown>)[WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL];
        post({ kind: 'unusable', reason: `load failed: ${error instanceof Error ? error.message : String(error)}` });
    });
};
