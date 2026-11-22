import type { Player } from '../../types';
import { NPC_DATABASE } from '../npcLogic';
import { getGenderedAvatar, getPortraitsForWorker, isFaceStillWaiting, peopleForWorker, whenWaitingFacesDrawn } from '../npcAvatar';
import { PORTRAIT_PENDING_PREFIX } from './weekAheadProtocol';
import type { WeekAheadResult } from './weekAheadEngine';
import { applyCareerPatches, unpackCareerPatches } from './careerPatch';
import type { WeekAheadStageRequest, WeekAheadToMain, WeekAheadToWorker, WeekAheadVerifiedLive } from './weekAheadProtocol';
import { exportSaveWriteRecord, persistSaveWriteRecord } from '../saveWriteLimits';

/** Phase 1 (2026-11-17), plan item 3: the worker gets the slot's learned write limit (it has no localStorage). */
const withWriteRecord = (stage: WeekAheadStageRequest | null): WeekAheadStageRequest | undefined => (
    stage ? { ...stage, writeRecord: exportSaveWriteRecord(stage.key) } : undefined
);

/* Week Ahead, the main thread's side (2026-11-12). It keeps the worker one week ahead of the career on screen:
   - every change of the career (after a short quiet moment) is sent to the worker, which drops the week it was
     preparing and starts again from the new career;
   - after a week the worker prepared is saved and shown, the worker goes straight on from that week, with no
     copy sent;
   - the play-time count that ticks every minute is carried over instead of starting again;
   - Age Up Week takes the prepared week when it belongs to the career on screen (waiting for it if it is still
     being prepared), and otherwise App runs the week itself as before.
   When App asks, the worker also writes the taken week as the slot's save (the same verified write: read back
   and checked) while this thread reads the week; App holds that slot's save queue meanwhile and shows the week
   only after the write is confirmed. */

/** Top-level fields that may change after a week was prepared without changing that week: they are copied. */
const CARRIED_FIELDS = new Set<string>(['totalPlayTimeMs']);
/* Battery and heat (2026-11-12, Zeesh: "cpu battery garmi"). A week prepared for a career that then changes is
   thrown away, so the worker works only when that is unlikely to happen:
   - Age Up Week is on the Home screen. Away from Home the worker prepares nothing new, and a change made there
     stops the week it was preparing; back on Home the current career is sent at once;
   - on Home a changed career is sent after it stayed the same for `quietMs` (a run of taps costs one week);
   - a prepared week's patches and its write-ahead (~68 MB on a late career) wait until it stayed current on Home
     for `settleAfterMs`; a tap before that sends the whole week and writes it then, as without Week Ahead.
   A tap never waits for any of this: it sends the career at once if nothing is prepared for it. */
export interface WeekAheadPolicy { quietMs: number; settleAfterMs: number; homeOnly: boolean }
export const WEEK_AHEAD_POLICY: WeekAheadPolicy = { quietMs: 1500, settleAfterMs: 2500, homeOnly: true };

export type WeekAheadWriteOutcome =
    | { ok: true; committed: WeekAheadVerifiedLive | null; ms: number; promoted: boolean }
    | { ok: false; message: string; ms: number };

export interface WeekAheadTake {
    /** The week, already carrying the play time on screen (see CARRIED_FIELDS). */
    result: WeekAheadResult;
    /** How long the tap waited for the worker. */
    waitedMs: number;
    /** When a write was asked for: the worker's verified write of this week (null: no write was asked for). */
    written: Promise<WeekAheadWriteOutcome> | null;
}

export interface WeekAheadClient {
    noteCareer(player: Player): void;
    take(player: Player, timeoutMs: number, write?: { key: string; live: WeekAheadVerifiedLive | null }): Promise<WeekAheadTake | null>;
    /** The taken week was saved and is now on screen as this object. */
    committed(onScreen: Player): void;
    /** The taken week could not be used; the worker forgets it. */
    abandon(): void;
    dispose(): void;
    /** The app went to the background (no background weeks then) or came back. */
    setHidden(hidden: boolean): void;
    /** The player is on the Home screen (where Age Up Week is) or not. */
    setOnHome(onHome: boolean): void;
    readonly state: () => { ready: boolean; unusable: string | null; preparing: boolean; prepared: boolean };
    /** Phase 1 (2026-11-17), telemetry: the worker's busy time and the time spent on weeks thrown away since the
     *  last call (then reset). */
    drainEngineStats(): { busyMs: number; discardedMs: number };
}

type Reply = Extract<WeekAheadToMain, { kind: 'result' } | { kind: 'failed' }>;
type Written = Extract<WeekAheadToMain, { kind: 'written' }>;

const onlyCarriedFieldsDiffer = (left: Player, right: Player): boolean => {
    if (left === right) return true;
    const a = left as unknown as Record<string, unknown>, b = right as unknown as Record<string, unknown>;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (a[key] !== b[key] && !CARRIED_FIELDS.has(key)) return false;
    }
    return true;
};

/** Phase 1 (2026-11-17), plan item 7: is a Week Ahead worker preparing a week right now (holding a second copy of
 *  the career and working on it)? The cinema forecast waits for it on phones with 4 GB or less. */
const preparingChecks = new Set<() => boolean>();
export const isWeekAheadPreparing = (): boolean => {
    for (const check of preparingChecks) if (check()) return true;
    return false;
};

export const createWeekAheadClient = (
    createWorker: () => Worker,
    report: (event: string, detail?: Record<string, unknown>) => void = () => {},
    /** Where the prepared week may be written ahead: the slot's save key and its verified live copy now. */
    stageTarget: () => WeekAheadStageRequest | null = () => null,
    policy: WeekAheadPolicy = WEEK_AHEAD_POLICY,
): WeekAheadClient => {
    let worker: Worker | null = null;
    let ready = false;
    let unusable: string | null = null;
    let seq = 0;
    /** The career object on screen that the worker's newest request belongs to, and the main thread's NPC entries
     *  as that request saw them (a screen that replaces an NPC since makes the prepared week stale). */
    let current: { id: number; basis: Player; done: boolean; npcRefs: unknown[]; settled: boolean; startedAt: number } | null = null;
    let engineBusyMs = 0;
    let engineDiscardedMs = 0;
    const preparingCheck = () => Boolean(worker && current && !current.done);
    preparingChecks.add(preparingCheck);
    /** A week still being prepared is replaced or dropped: its time so far was spent for nothing. */
    const discardCurrent = () => { if (current && !current.done) engineDiscardedMs += Math.max(0, Date.now() - current.startedAt); };
    let hidden = false;
    let onHome = !policy.homeOnly;
    /** The worker may work now: the app is on screen, and on Home when the policy asks for that. */
    const active = () => !hidden && (onHome || !policy.homeOnly);
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const clearSettle = () => { if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; } };
    const armSettle = () => {
        clearSettle();
        if (!current || !current.done || current.settled || !active()) return;
        const id = current.id;
        settleTimer = setTimeout(() => {
            settleTimer = null;
            if (current?.id === id && current.done && !current.settled && active()) { current.settled = true; post({ kind: 'settle', id }); }
        }, policy.settleAfterMs);
    };
    /** Stop a week still being prepared (it would be thrown away); a prepared one stays for the tap. */
    const stopPreparing = () => {
        if (current && !current.done) { discardCurrent(); post({ kind: 'drop' }); current = null; }
    };
    const npcListUnchangedSince = (refs: unknown[]): boolean => {
        const list = NPC_DATABASE as unknown[];
        if (list.length !== refs.length) return false;
        for (let index = 0; index < list.length; index++) if (list[index] !== refs[index]) return false;
        return true;
    };
    let latest: Player | null = null;
    let sendTimer: ReturnType<typeof setTimeout> | null = null;
    const replies = new Map<number, (reply: Reply | null) => void>();
    const writes = new Map<number, (outcome: Written | null) => void>();

    const post = (message: WeekAheadToWorker): boolean => {
        if (!worker) return false;
        try { worker.postMessage(message); return true; }
        catch (error) {
            // A career with something that cannot be copied (a pending event's callback, for one): App runs this week.
            report('week_ahead_copy_failed', { error: error instanceof Error ? error.name : String(error) });
            return false;
        }
    };
    const giveUp = (reason: string) => {
        if (unusable) return;
        unusable = reason;
        report('week_ahead_unusable', { reason });
        for (const resolve of replies.values()) resolve(null);
        replies.clear();
        for (const resolve of writes.values()) resolve(null);
        writes.clear();
        worker?.terminate();
        worker = null;
        current = null;
    };
    const send = (player: Player): boolean => {
        if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
        clearSettle();
        const id = ++seq;
        discardCurrent();
        // 21 Nov 2026: a face nobody has read yet goes as a pending mark, so sending the list draws nothing (npcAvatar.ts)
        if (!post({ kind: 'speculate', id, player, npcs: peopleForWorker(NPC_DATABASE as unknown[], PORTRAIT_PENDING_PREFIX), stage: withWriteRecord(stageTarget()) })) { current = null; return false; }
        current = { id, basis: player, done: false, npcRefs: (NPC_DATABASE as unknown[]).slice(), settled: false, startedAt: Date.now() };
        return true;
    };

    try {
        worker = createWorker();
    } catch (error) {
        unusable = `worker could not start: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (worker) {
        worker.onmessage = (event: MessageEvent<WeekAheadToMain>) => {
            const message = event.data;
            switch (message.kind) {
                case 'ready':
                    ready = true;
                    report('week_ahead_ready', { npcs: message.npcs, load_misses: message.loadMisses });
                    if (latest && !current && active()) send(latest);
                    break;
                case 'unusable':
                    giveUp(message.reason);
                    break;
                case 'need-portraits': {
                    const answer = () => {
                        const drawn: Record<string, string> = {};
                        for (const request of message.requests) drawn[request.cacheKey] = getGenderedAvatar(request.gender, request.nameSeed);
                        post({ kind: 'portraits', requestId: message.requestId, drawn });
                    };
                    /* 22 Nov 2026: built-in faces that still wait for the idle drawing (the first weeks after a start ask for
                       every NPC, because every NPC's net worth moves) are answered once that drawing is done, so this answer
                       never draws hundreds of faces in one go on the main thread (services/npcAvatar.ts). */
                    if (message.requests.some(request => isFaceStillWaiting(request.cacheKey))) void whenWaitingFacesDrawn().then(answer);
                    else answer();
                    break;
                }
                case 'done':
                    engineBusyMs += Math.max(0, Number(message.ms) || 0);
                    report('week_ahead_prepared', { ms: message.ms, ...message.timings });
                    if (current?.id === message.id) {
                        current.done = true;
                        armSettle();
                    }
                    break;
                case 'staged':
                    // Phase 1 (2026-11-17): what the worker learned about this slot's writes is kept here.
                    if (message.key) persistSaveWriteRecord(message.key, message.writeRecord);
                    report(message.ok ? 'week_ahead_staged' : 'week_ahead_stage_skipped', { ms: message.ms, ...(message.message ? { message: message.message } : {}) });
                    break;
                case 'written': {
                    const resolve = writes.get(message.id);
                    writes.delete(message.id);
                    resolve?.(message);
                    break;
                }
                case 'result':
                case 'failed': {
                    if (message.kind === 'failed' && message.reason === 'ERROR') report('week_ahead_week_failed', { message: message.message });
                    const resolve = replies.get(message.id);
                    replies.delete(message.id);
                    resolve?.(message);
                    break;
                }
            }
        };
        worker.onerror = event => { event.preventDefault?.(); giveUp(`worker error: ${event.message || 'unknown'}`); };
        worker.onmessageerror = () => giveUp('a message could not be read');
        // Portraits first: the worker loads the game code only after it has them (see weekAhead.worker.ts).
        // Phase 1 (2026-11-17): the load-time faces and the NPC list's faces, not every face of the session.
        if (!post({ kind: 'init', portraits: getPortraitsForWorker(NPC_DATABASE as unknown[]), npcs: peopleForWorker(NPC_DATABASE as unknown[], PORTRAIT_PENDING_PREFIX) })) giveUp('init could not be sent');
    }

    /** Back on screen or on Home: the career on screen is sent at once if nothing is prepared for it; a prepared
     *  week gets its settle pause again. */
    const resume = () => {
        if (!ready || unusable || !active()) return;
        if (latest && !(current && onlyCarriedFieldsDiffer(current.basis, latest))) send(latest);
        else armSettle();
    };

    return {
        noteCareer(player) {
            latest = player;
            if (!ready || unusable) return;
            if (current && onlyCarriedFieldsDiffer(current.basis, player)) return;
            if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
            clearSettle();
            if (!active()) { stopPreparing(); return; }
            sendTimer = setTimeout(() => {
                sendTimer = null;
                if (latest === player && active() && !(current && onlyCarriedFieldsDiffer(current.basis, player))) send(player);
            }, policy.quietMs);
        },
        async take(player, timeoutMs, write) {
            if (!ready || unusable || !worker) return null;
            const started = Date.now();
            clearSettle();
            /* Phase 1 of the week-speed plan (2026-11-17): nothing prepared for this exact career means the main thread
               plays the week at once. Starting a fresh background week at the tap and waiting for it made players
               wait up to 90 s (field waits of 23, 42 and 48 s). */
            if (!current || !onlyCarriedFieldsDiffer(current.basis, player) || !npcListUnchangedSince(current.npcRefs)) {
                return null;
            }
            const { id, basis } = current!;
            let written: Promise<WeekAheadWriteOutcome> | null = null;
            if (write) {
                written = new Promise<WeekAheadWriteOutcome>(resolve => {
                    writes.set(id, outcome => {
                    if (outcome) persistSaveWriteRecord(write.key, outcome.writeRecord);
                        if (outcome && outcome.ok === true) resolve({ ok: true, committed: outcome.committed, ms: outcome.ms, promoted: outcome.promoted });
                        else if (outcome && outcome.ok === false) resolve({ ok: false, message: outcome.message, ms: outcome.ms });
                        else resolve({ ok: false, message: 'Week Ahead stopped before the write was confirmed', ms: 0 });
                    });
                });
            }
            const reply = await new Promise<Reply | null>(resolve => {
                /* Too slow. Phase 1 (2026-11-17), fencing: the worker is stopped, not just told to drop the week. A worker
                   that had already finished could still write its week after the main thread's own week (its
                   fallback write reads the changed live copy and writes anyway). A stopped worker writes nothing, and its
                   copy of the career is freed before the main thread plays the week. Week Ahead stays off until this career
                   is opened again (a new client is made then). */
                const timer = setTimeout(() => { replies.delete(id); giveUp('take_timeout'); resolve(null); }, timeoutMs);
                replies.set(id, value => { clearTimeout(timer); resolve(value); });
                const sent = post({ kind: 'take', id, write: write ? { ...write, totalPlayTimeMs: player.totalPlayTimeMs, writeRecord: exportSaveWriteRecord(write.key) } : undefined });
                if (!sent) { replies.delete(id); clearTimeout(timer); resolve(null); }
            });
            if (!reply || reply.kind !== 'result') {
                report('week_ahead_not_used', { reason: reply && reply.kind === 'failed' ? reply.reason : 'TIMEOUT', waited_ms: Date.now() - started });
                // A write that was asked for is not done without its week: settle it, so nothing waits on it.
                writes.get(id)?.(null);
                writes.delete(id);
                current = null;
                return null;
            }
            // The week's player: rebuilt from the career this request was made from, when sent as patches (the
            // untouched parts stay the very same objects on this side).
            let weekPlayer: Player | undefined;
            try {
                weekPlayer = reply.playerPatches ? applyCareerPatches(basis, unpackCareerPatches(reply.playerPatches)) : reply.result.player;
            } catch (error) {
                report('week_ahead_patch_failed', { message: error instanceof Error ? error.message : String(error) });
                weekPlayer = undefined;
            }
            if (!weekPlayer) {
                report('week_ahead_not_used', { reason: 'NO_PLAYER' });
                // The worker may be writing this week already: App's own save of the week must come after it.
                if (written) await written;
                current = null;
                return null;
            }
            const result: WeekAheadResult = { ...reply.result, player: weekPlayer };
            if (result.player.totalPlayTimeMs !== player.totalPlayTimeMs) {
                // The worker patched its own copy the same way before writing it (write requests only).
                result.player = { ...result.player, totalPlayTimeMs: player.totalPlayTimeMs };
            }
            return { result, waitedMs: Date.now() - started, written };
        },
        committed(onScreen) {
            latest = onScreen;
            if (unusable || !worker) return;
            if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
            clearSettle();
            const id = ++seq;
            // The next week starts at once from the week just taken (no copy sent); it settles like any other.
            if (post({ kind: 'continue', id, stage: withWriteRecord(stageTarget()) })) current = { id, basis: onScreen, done: false, npcRefs: (NPC_DATABASE as unknown[]).slice(), settled: false, startedAt: Date.now() };
            else current = null;
        },
        abandon() {
            clearSettle();
            current = null;
            post({ kind: 'drop' });
        },
        setHidden(isHidden) {
            if (hidden === isHidden) return;
            hidden = isHidden;
            if (!worker || unusable) return;
            if (isHidden) {
                if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
                clearSettle();
                stopPreparing();
            } else resume();
        },
        setOnHome(isOnHome) {
            if (onHome === isOnHome) return;
            onHome = isOnHome;
            if (!worker || unusable || !policy.homeOnly) return;
            if (!isOnHome) {
                if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
                clearSettle();
            } else resume();
        },
        dispose() {
            if (sendTimer) clearTimeout(sendTimer);
            clearSettle();
            for (const resolve of replies.values()) resolve(null);
            replies.clear();
            for (const resolve of writes.values()) resolve(null);
            writes.clear();
            worker?.terminate();
            worker = null;
            current = null;
            unusable = unusable || 'disposed';
            preparingChecks.delete(preparingCheck);
        },
        state: () => ({ ready, unusable, preparing: Boolean(current && !current.done), prepared: Boolean(current?.done) }),
        drainEngineStats: () => {
            const stats = { busyMs: Math.round(engineBusyMs), discardedMs: Math.round(engineDiscardedMs) };
            engineBusyMs = 0; engineDiscardedMs = 0;
            return stats;
        },
    };
};

/** The browser worker (Vite bundles it with the game code it loads). */
export const createWeekAheadBrowserWorker = (): Worker =>
    new Worker(new URL('./weekAhead.worker.ts', import.meta.url), { type: 'module', name: 'week-ahead' });
