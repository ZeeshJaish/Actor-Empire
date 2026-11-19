import { addBreadcrumb } from './firebaseService';

/* Phase 1 of the week-speed plan (2026-11-17), the hide breadcrumb (the plan's Phase H item 12, built here because
   the bug chat did not take it). Android files an ANR at the next launch together with that session's Crashlytics
   log lines, so the page writes one short line whenever what it is doing changes (a save starts or ends, a week
   starts or ends, the forced ad opens or closes), and one more on every hide and every memory warning.
   - The state-change lines matter most: the hide's own line crosses Capacitor's bridge on Android's main thread,
     the very thread an ANR blocks, so it can be lost. The last state before the hide is then already written.
   - Log lines, not custom keys: the Crashlytics key budget is nearly full.
   - Week Ahead's own events (prepared, staged, not used) are already logged by its client (App's report callback);
     this file only keeps its state for the hide line. */

export type PageSaveKind = 'week' | 'hide' | 'checkpoint' | 'autosave' | 'other';
export type PageWeekAheadState = 'off' | 'idle' | 'preparing' | 'staged';

const state = {
    week: null as string | null,
    saves: [] as Array<{ kind: PageSaveKind; startedAt: number }>,
    weekAhead: 'off' as PageWeekAheadState,
    ad: 'none' as 'none' | 'showing' | 'closed',
    adClosedAt: 0,
    screen: '',
};

const describe = (now: number) => {
    const save = state.saves[state.saves.length - 1];
    const ad = state.ad === 'closed' && now - state.adClosedAt > 5_000 ? 'none' : state.ad;
    return {
        wk: state.week ?? '-',
        save: save ? save.kind : 'none',
        save_ms: save ? Math.round(now - save.startedAt) : 0,
        saves: state.saves.length,
        wa: state.weekAhead,
        ad,
        scr: state.screen || '-',
    };
};

const heapMb = (): number => {
    const memory = (typeof performance !== 'undefined'
        ? (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory
        : undefined);
    return memory?.usedJSHeapSize ? Math.round(memory.usedJSHeapSize / 1_048_576) : -1;
};

const line = (event: string, extra: Record<string, unknown> = {}) => {
    addBreadcrumb(`pg:${event}`, { ...describe(Date.now()), ...extra });
};

/** A save of the open career starts. Returns the function that marks its end (call it once). */
export const notePageSaveStarted = (kind: PageSaveKind): (() => void) => {
    const entry = { kind, startedAt: Date.now() };
    state.saves.push(entry);
    line('save_start');
    let ended = false;
    return () => {
        if (ended) return;
        ended = true;
        const index = state.saves.indexOf(entry);
        if (index >= 0) state.saves.splice(index, 1);
        addBreadcrumb('pg:save_end', { kind, ms: Math.round(Date.now() - entry.startedAt), saves: state.saves.length });
    };
};

/** A week starts (its first stage) or ends (null). Stages in between only update the state for the hide line. */
export const notePageWeekStage = (stage: string | null) => {
    const was = state.week;
    state.week = stage;
    if (!was && stage) line('week_start');
    else if (was && !stage) line('week_end');
};

export const notePageWeekAhead = (weekAhead: PageWeekAheadState) => {
    state.weekAhead = weekAhead;
};

export const notePageAd = (showing: boolean) => {
    state.ad = showing ? 'showing' : 'closed';
    if (!showing) state.adClosedAt = Date.now();
    line(showing ? 'ad_open' : 'ad_close');
};

export const notePageScreen = (screen: string) => {
    state.screen = screen.slice(0, 40);
};

/** The page is hidden (visibilitychange) or the system sent a memory warning (with its trim level on Android). */
export const notePageHiddenOrMemory = (event: 'hide' | 'show' | 'memory', detail: { level?: unknown; stage?: string } = {}) => {
    const level = Number(detail.level);
    line(event, {
        heap: heapMb(),
        ...(detail.level !== undefined && Number.isFinite(level) ? { trim: level } : {}),
        ...(detail.stage ? { stage: String(detail.stage).slice(0, 40) } : {}),
    });
};

/** Test hook (web test copies): the state the hide line would carry now. */
export const readPageStateForTest = () => describe(Date.now());
