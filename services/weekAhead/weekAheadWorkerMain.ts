import type { Player } from '../../types';
import { NPC_DATABASE } from '../npcLogic';
import { prepareProcessedWeekForUi } from '../playerUiState';
import { restoreNpcDatabase, runWeekAhead, WeekAheadCancelled, type NpcDatabaseSnapshot, type WeekAheadPortraitRequest, type WeekAheadResult } from './weekAheadEngine';
import type { WeekAheadStageRequest, WeekAheadToMain, WeekAheadToWorker, WeekAheadWriteRequest } from './weekAheadProtocol';
import { adoptIssuedManifest } from '../saveIntegrity';
import { getVerifiedLiveSave, promoteStagedGameData, saveVerifiedGameData, setVerifiedLiveSave, stageVerifiedGameData } from '../storage';
import type { StagedSaveGeneration } from '../saveGenerations';
import { diffCareer, packCareerPatches, type PackedCareerPatches } from './careerPatch';

/* Week Ahead worker (2026-11-12): holds one private copy of the open career and prepares its next week while
   the player reads the current one. Only the newest request is worked on; an older one stops at its next step.
   Nothing here writes to storage: the main thread saves the week it takes, through its usual save path. */

const post = (message: WeekAheadToMain) => (self as unknown as { postMessage: (m: unknown) => void }).postMessage(message);

/** The main thread rolled its NPC list when its code loaded; the same people get the same numbers here. The
 *  objects stay the same (other lists made at load point at them), only their contents are replaced. */
const adoptMainNpcList = (npcs: unknown[]): string | null => {
    const list = NPC_DATABASE as unknown as Array<Record<string, unknown>>;
    if (npcs.length < list.length) return `NPC list length ${list.length} here, ${npcs.length} on the main thread`;
    for (let index = 0; index < list.length; index++) {
        const source = npcs[index] as Record<string, unknown> | null;
        if (!source || typeof source !== 'object' || source.id !== list[index]?.id) return `NPC ${index} differs`;
    }
    for (let index = 0; index < npcs.length; index++) {
        const target = list[index], source = npcs[index] as Record<string, unknown>;
        if (!target) { list[index] = source; continue; }
        // Same object, main thread's contents and key order.
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, source);
    }
    return null;
};

export const startWeekAheadWorker = (
    init: Extract<WeekAheadToWorker, { kind: 'init' }>,
    portraits: Map<string, string>,
    loadMisses: number,
): void => {
    const scope = self as unknown as { onmessage: ((event: MessageEvent<WeekAheadToWorker>) => void) | null };
    const mismatch = adoptMainNpcList(init.npcs);
    if (mismatch) { post({ kind: 'unusable', reason: mismatch }); return; }

    let latestId = 0;
    let running: { id: number; cancelled: boolean; settleOnDone: boolean } | null = null;
    let pending: { id: number; input: Player | 'CONTINUE'; stage?: WeekAheadStageRequest; settle: boolean } | null = null;
    /** The prepared week written ahead (not live) for a request id, or being written. */
    const stagings = new Map<number, Promise<{ key: string; staged: StagedSaveGeneration } | null>>();
    /** A prepared week. Its patches and its write-ahead wait for 'settle' (basis: the career it started from). */
    let finished: {
        id: number; result: WeekAheadResult; npcBefore: NpcDatabaseSnapshot; patches: PackedCareerPatches | null;
        basis: Player | null; stage?: WeekAheadStageRequest; settled: boolean;
    } | null = null;
    /** The last week the main thread took: the next run starts from it when the main thread says CONTINUE. */
    let lastTaken: WeekAheadResult | null = null;
    const takeWaiters = new Map<number, WeekAheadWriteRequest | undefined>();
    const portraitWaiters = new Map<number, (drawn: Record<string, string>) => void>();
    let portraitRequestSeq = 0;

    const pauseChannel = new MessageChannel();
    const pauseWaiting: Array<() => void> = [];
    pauseChannel.port1.onmessage = () => { pauseWaiting.shift()?.(); };
    const pause = () => new Promise<void>(resolve => { pauseWaiting.push(resolve); pauseChannel.port2.postMessage(0); });

    const requestPortraits = (requests: WeekAheadPortraitRequest[]) => new Promise<Record<string, string>>(resolve => {
        const requestId = ++portraitRequestSeq;
        portraitWaiters.set(requestId, resolve);
        post({ kind: 'need-portraits', requestId, requests });
    });
    /** A run waiting for portraits that are no longer needed goes on, and stops at its cancel check. */
    const releasePortraitWaiters = () => {
        for (const resolve of portraitWaiters.values()) resolve({});
        portraitWaiters.clear();
    };
    const dropFinished = () => {
        if (finished) restoreNpcDatabase(finished.npcBefore);
        finished = null;
    };
    const sendResult = (id: number, write: WeekAheadWriteRequest | undefined) => {
        if (!finished || finished.id !== id) return;
        const { result, patches } = finished;
        // Not settled: the whole week is sent (cheaper now than working out its patches while the player waits).
        finished.basis = null;
        finished = null;
        takeWaiters.delete(id);
        if (write && typeof write.totalPlayTimeMs === 'number' && write.totalPlayTimeMs !== result.player.totalPlayTimeMs) {
            // The play-time count is not part of the signed projection: the same manifest still holds.
            result.player = { ...result.player, totalPlayTimeMs: write.totalPlayTimeMs };
            adoptIssuedManifest(result.player, result.manifest);
        }
        // The main thread rebuilds the player from the career it sent; the play time it carries itself.
        try {
            if (patches) post({ kind: 'result', id, result: { ...result, player: undefined }, playerPatches: patches });
            else post({ kind: 'result', id, result });
        } catch (error) {
            // Nothing is written: the main thread plays this week itself, at once.
            post({ kind: 'failed', id, reason: 'ERROR', message: `result could not be sent: ${error instanceof Error ? error.message : String(error)}` });
            return;
        }
        lastTaken = result;
        if (!write) return;
        // The main thread is reading the week meanwhile; it shows it only after this week is the live save. When
        // it was written ahead (staged, read back and checked), only the head changes now; otherwise it is
        // written the usual way here (read back and checked).
        const started = performance.now();
        const staging = stagings.get(id);
        stagings.delete(id);
        void (async () => {
            const stage = staging ? await staging.catch(() => null) : null;
            if (stage && stage.key === write.key) {
                try {
                    const committed = await promoteStagedGameData(write.key, stage.staged);
                    return { committed, promoted: true };
                } catch { /* something was written since: write it the usual way below */ }
            }
            setVerifiedLiveSave(write.key, write.live);
            await saveVerifiedGameData(write.key, result.player, result.manifest, {
                retainPrevious: result.retainPrevious,
                needsRecoveryCheckpoint: result.needsRecoveryCheckpoint,
            });
            return { committed: getVerifiedLiveSave(write.key), promoted: false };
        })().then(({ committed, promoted }) => {
            post({ kind: 'written', id, ok: true, committed, promoted, ms: Math.round(performance.now() - started) });
        }, error => {
            post({ kind: 'written', id, ok: false, message: error instanceof Error ? `${error.name}: ${error.message}` : String(error), ms: Math.round(performance.now() - started) });
        });
    };
    /** Writes the prepared week ahead, not live, so tapping only has to switch the head. */
    const stageAhead = (id: number, result: WeekAheadResult, stage: WeekAheadStageRequest | undefined) => {
        if (!stage || !stage.live || !result.retainPrevious) return;
        const started = performance.now();
        const staging = stageVerifiedGameData(stage.key, result.player, result.manifest, stage.live, {
            needsRecoveryCheckpoint: result.needsRecoveryCheckpoint,
        }).then(staged => {
            post({ kind: 'staged', id, ok: true, ms: Math.round(performance.now() - started) });
            return { key: stage.key, staged };
        }, error => {
            post({ kind: 'staged', id, ok: false, ms: Math.round(performance.now() - started), message: error instanceof Error ? error.message : String(error) });
            return null;
        });
        stagings.set(id, staging);
    };

    /** Patches against the career the week started from, then the write-ahead. */
    const settle = (week: NonNullable<typeof finished>) => {
        if (week.settled) return;
        week.settled = true;
        if (week.basis) {
            try { week.patches = packCareerPatches(diffCareer(week.basis, week.result.player)); } catch { week.patches = null; }
            week.basis = null;
        }
        stageAhead(week.id, week.result, week.stage);
    };

    let pendingNpcs: unknown[] | null = null;
    const pump = () => {
        if (running || !pending) return;
        const job = pending;
        pending = null;
        if (pendingNpcs) {
            const mismatch = adoptMainNpcList(pendingNpcs);
            pendingNpcs = null;
            if (mismatch) { post({ kind: 'unusable', reason: mismatch }); scope.onmessage = null; return; }
        }
        let input: Player;
        if (job.input === 'CONTINUE') {
            if (!lastTaken) { takeWaiters.delete(job.id); post({ kind: 'failed', id: job.id, reason: 'NO_TAKEN_WEEK' }); return; }
            // The main thread shows the taken week through prepareProcessedWeekForUi; the next week starts from the same.
            input = prepareProcessedWeekForUi(lastTaken.player);
            lastTaken = null;
        } else input = job.input;
        let basis: Player | null = input;
        const run = { id: job.id, cancelled: false, stage: job.stage, settleOnDone: job.settle };
        running = run;
        const startedAt = performance.now();
        void runWeekAhead(input, {
            isCancelled: () => run.cancelled || run.id !== latestId,
            pause,
            portraits,
            requestPortraits,
        }).then(({ result, npcBefore }) => {
            running = null;
            const weekBasis = basis;
            basis = null;
            if (run.cancelled || run.id !== latestId) {
                restoreNpcDatabase(npcBefore);
                takeWaiters.delete(run.id);
                post({ kind: 'failed', id: run.id, reason: 'REPLACED' });
            } else {
                finished = { id: run.id, result, npcBefore, patches: null, basis: weekBasis, stage: run.stage, settled: false };
                post({ kind: 'done', id: run.id, ms: Math.round(performance.now() - startedAt), timings: result.timings });
                // A tap is already waiting: send the week now. Otherwise settle now only when asked for already.
                if (takeWaiters.has(run.id)) sendResult(run.id, takeWaiters.get(run.id));
                else if (run.settleOnDone) settle(finished);
            }
            pump();
        }, error => {
            running = null;
            basis = null;
            takeWaiters.delete(run.id);
            const replaced = error instanceof WeekAheadCancelled;
            post({ kind: 'failed', id: run.id, reason: replaced ? 'REPLACED' : 'ERROR', message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
            pump();
        });
    };

    scope.onmessage = (event: MessageEvent<WeekAheadToWorker>) => {
        const message = event.data;
        switch (message.kind) {
            case 'speculate':
            case 'continue': {
                latestId = message.id;
                if (running) running.cancelled = true;
                releasePortraitWaiters();
                dropFinished();
                if (message.kind === 'speculate') {
                    lastTaken = null;
                    // A run still stopping puts the list back when it ends, so it is adopted after that (pump).
                    pendingNpcs = message.npcs;
                }
                pending = {
                    id: message.id, input: message.kind === 'speculate' ? message.player : 'CONTINUE', stage: message.stage,
                    settle: message.kind === 'continue' && message.settle === true,
                };
                // Older prepared weeks will not be taken: their staging (if any) just finishes and is forgotten.
                for (const old of [...stagings.keys()]) if (old !== message.id) stagings.delete(old);
                pump();
                break;
            }
            case 'take': {
                if (finished?.id === message.id) sendResult(message.id, message.write);
                else if (running?.id === message.id || pending?.id === message.id) takeWaiters.set(message.id, message.write);
                else post({ kind: 'failed', id: message.id, reason: 'UNKNOWN' });
                break;
            }
            case 'settle': {
                if (finished?.id === message.id) settle(finished);
                else if (running?.id === message.id) running.settleOnDone = true;
                else if (pending?.id === message.id) pending.settle = true;
                break;
            }
            case 'portraits': {
                const resolve = portraitWaiters.get(message.requestId);
                portraitWaiters.delete(message.requestId);
                resolve?.(message.drawn);
                break;
            }
            case 'drop': {
                latestId += 1;
                if (running) running.cancelled = true;
                releasePortraitWaiters();
                dropFinished();
                pending = null;
                lastTaken = null;
                break;
            }
            default:
                break;
        }
    };
    post({ kind: 'ready', npcs: NPC_DATABASE.length, loadMisses });
};
