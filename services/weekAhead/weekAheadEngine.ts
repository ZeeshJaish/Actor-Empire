import type { Gender, Player } from '../../types';
import { processGameWeek, setWeekProcessingYield } from '../gameLoop';
import { prepareVerifiedPlayerForPersistence } from '../savePreparation';
import type { SaveIntegrityManifest } from '../saveIntegrity';
import { NPC_DATABASE } from '../npcLogic';
import { setGeneratedAvatarProvider } from '../npcAvatar';
import { setGameEventSink, setNonFatalSink } from '../firebaseService';
import { collectHealthConditionIds, syncPlayerAfterWeek, type WeekMedicalPrompt, type WeekPendingBabyNaming } from './postWeekSync';
import { PORTRAIT_PENDING_PREFIX } from './weekAheadProtocol';

export { PORTRAIT_PENDING_PREFIX };

/* Week Ahead (2026-11-12). On a big career a week took 1.6 s on a fast phone and 7 s or more on a mid-range
   one, nearly all of it simulation and save preparation. While the player reads the current week, a background
   worker runs this engine: the same processGameWeek, the same post-week step and the same save preparation the
   main thread runs after a tap. When Age Up Week is tapped and the career has not changed since, the main thread
   only writes the prepared save (read back and verified as before) and shows it.

   Exactness: the week is the same code on a structured copy of the same career. Three things differ in a worker
   and are handled here:
   - NPC_DATABASE is rolled with Math.random when the code loads, so the worker is given the main thread's list,
     and the NPCs a week changes are sent back (and put back if that week is not used);
   - portraits are drawn on a canvas, which a worker lacks: a pending mark stands in, the main thread draws the
     portrait, and the mark is replaced before the post-week step and the save preparation;
   - non-fatal reports are collected and sent by the main thread. */


export class WeekAheadCancelled extends Error {
    constructor() { super('Week Ahead run was replaced by a newer career state.'); this.name = 'WeekAheadCancelled'; }
}

export interface WeekAheadPortraitRequest { cacheKey: string; gender: Gender; nameSeed: string }
export type WeekAheadNpcChange = [number, unknown, boolean];

/* NPC_DATABASE is module data the week changes two ways: some entries are replaced (music payouts) and every
   entry's net worth moves in place (the Forbes list, processWorldTurn). Other lists made at load point at the
   same objects. So a week that is not used is put back object by object, and a week that is used tells the
   main thread which entries to replace and which to change in place, exactly as its own week would have. */
export interface NpcDatabaseSnapshot { refs: unknown[]; contents: unknown[] }
export const snapshotNpcDatabase = (): NpcDatabaseSnapshot => ({
    refs: NPC_DATABASE.slice(),
    contents: NPC_DATABASE.map(npc => structuredClone(npc)),
});
const replaceContents = (target: Record<string, unknown>, source: Record<string, unknown>) => {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
};
/** Puts NPC_DATABASE back exactly as it was (a week that will not be used). */
export const restoreNpcDatabase = (snapshot: NpcDatabaseSnapshot): void => {
    const list = NPC_DATABASE as unknown[];
    list.length = snapshot.refs.length;
    for (let index = 0; index < snapshot.refs.length; index++) {
        const original = snapshot.refs[index] as Record<string, unknown>;
        replaceContents(original, structuredClone(snapshot.contents[index]) as Record<string, unknown>);
        list[index] = original;
    }
};
export const npcChangesSince = (snapshot: NpcDatabaseSnapshot): WeekAheadNpcChange[] => {
    const changes: WeekAheadNpcChange[] = [];
    for (let index = 0; index < Math.max(NPC_DATABASE.length, snapshot.refs.length); index++) {
        const current = NPC_DATABASE[index] as unknown;
        if (current !== snapshot.refs[index]) changes.push([index, current, false]);
        else if (JSON.stringify(current) !== JSON.stringify(snapshot.contents[index])) changes.push([index, current, true]);
    }
    return changes;
};
/** The main thread's side: the NPCs the used week changed, each the way the week changed it. */
export const applyNpcChanges = (changes: readonly WeekAheadNpcChange[], length: number): void => {
    const list = NPC_DATABASE as unknown[];
    for (const [index, npc, inPlace] of changes) {
        const current = list[index] as Record<string, unknown> | undefined;
        if (inPlace && current && typeof current === 'object' && npc && typeof npc === 'object') replaceContents(current, npc as Record<string, unknown>);
        else list[index] = npc;
    }
    if (list.length > length) list.length = length;
};
export interface WeekAheadNonFatal { name: string; message: string; label: string; context: Record<string, unknown> }

export interface WeekAheadResult {
    /** Exactly what persistSlotSave would write for this week: compacted and signed. */
    player: Player;
    manifest: SaveIntegrityManifest;
    retainPrevious: boolean;
    needsRecoveryCheckpoint: boolean;
    triggerAd: boolean;
    shouldTriggerBabyQa: boolean;
    babyNamingDue: WeekPendingBabyNaming | null;
    medicalPromptToShow: WeekMedicalPrompt | null;
    /** NPC_DATABASE entries this week changed: [index, npc, changed in place (true) or replaced (false)]. */
    npcChanges: WeekAheadNpcChange[];
    npcLength: number;
    nonFatals: WeekAheadNonFatal[];
    /** Analytics events the week sent, for the main thread to send if this week is taken. */
    gameEvents: Array<[string, Record<string, unknown>]>;
    /** [stage, ms after the start], as processGameWeek reported them. */
    stages: Array<[string, number]>;
    timings: { simulateMs: number; portraitsMs: number; syncMs: number; prepareMs: number; totalMs: number; portraits: number };
}

export interface WeekAheadEnvironment {
    isCancelled: () => boolean;
    /** A real task break, so newer requests can arrive while a week runs. */
    pause: () => Promise<void>;
    /** Portraits the main thread has drawn, by cache key. Grows as requests are answered. */
    portraits: Map<string, string>;
    requestPortraits: (requests: WeekAheadPortraitRequest[]) => Promise<Record<string, string>>;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface PortraitSpot { holder: Record<string, unknown> | unknown[]; key: string | number }

/** Finds every pending portrait mark in a private object graph, by cache key. A mark inside a longer text or
 *  used as a key is an error: the caller then lets the main thread run the week instead. */
export const findPendingPortraits = (roots: readonly unknown[]): Map<string, PortraitSpot[]> => {
    const found = new Map<string, PortraitSpot[]>();
    const seen = new WeakSet<object>();
    const stack: unknown[] = [...roots];
    const check = (holder: PortraitSpot['holder'], key: string | number, value: string) => {
        if (!value.startsWith(PORTRAIT_PENDING_PREFIX)) {
            if (value.includes(PORTRAIT_PENDING_PREFIX)) throw new Error('A pending portrait mark was copied into a longer text.');
            return;
        }
        const cacheKey = value.slice(PORTRAIT_PENDING_PREFIX.length);
        const spots = found.get(cacheKey);
        if (spots) spots.push({ holder, key }); else found.set(cacheKey, [{ holder, key }]);
    };
    while (stack.length) {
        const item = stack.pop();
        if (!item || typeof item !== 'object' || seen.has(item as object)) continue;
        seen.add(item as object);
        if (Array.isArray(item)) {
            for (let index = 0; index < item.length; index++) {
                const child = item[index];
                if (typeof child === 'string') { if (child.length >= PORTRAIT_PENDING_PREFIX.length && child.includes(PORTRAIT_PENDING_PREFIX)) check(item, index, child); }
                else if (child && typeof child === 'object') stack.push(child);
            }
            continue;
        }
        if (item instanceof Map || item instanceof Set) throw new Error('Unexpected Map or Set in a career.');
        const record = item as Record<string, unknown>;
        for (const key of Object.keys(record)) {
            if (key.includes(PORTRAIT_PENDING_PREFIX)) throw new Error('A pending portrait mark was used as a key.');
            const child = record[key];
            if (typeof child === 'string') { if (child.length >= PORTRAIT_PENDING_PREFIX.length && child.includes(PORTRAIT_PENDING_PREFIX)) check(record, key, child); }
            else if (child && typeof child === 'object') stack.push(child);
        }
    }
    return found;
};

/** The main thread draws a portrait from its cache key alone: "GENDER:seed", exactly as getGenderedAvatar keys it. */
export const portraitRequestOfKey = (cacheKey: string): WeekAheadPortraitRequest => {
    const split = cacheKey.indexOf(':');
    const gender = cacheKey.slice(0, split) as Gender;
    return { cacheKey, gender, nameSeed: cacheKey.slice(split + 1) };
};

const describeError = (error: unknown) => ({
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
});

/** Runs one week ahead on a private copy of the career. On any failure NPC_DATABASE is put back as it was. */
export const runWeekAhead = async (input: Player, env: WeekAheadEnvironment): Promise<{ result: WeekAheadResult; npcBefore: NpcDatabaseSnapshot }> => {
    const npcBefore = snapshotNpcDatabase();
    const nonFatals: WeekAheadNonFatal[] = [];
    const gameEvents: Array<[string, Record<string, unknown>]> = [];
    const stages: Array<[string, number]> = [];
    const started = now();
    setGeneratedAvatarProvider((_gender, _nameSeed, cacheKey) => env.portraits.get(cacheKey) ?? PORTRAIT_PENDING_PREFIX + cacheKey);
    setNonFatalSink((error, label, context) => { nonFatals.push({ ...describeError(error), label, context: { ...context } }); });
    setGameEventSink((name, params) => { gameEvents.push([name, { ...params }]); });
    setWeekProcessingYield(async () => {
        await env.pause();
        if (env.isCancelled()) throw new WeekAheadCancelled();
    });
    try {
        const previousHealthConditionIds = collectHealthConditionIds(input);
        const week = await processGameWeek(input, {
            onStage: stage => { stages.push([stage, Math.round(now() - started)]); },
        });
        // The week's own code is done: nothing below may reach the worker's pause or portrait hooks.
        setWeekProcessingYield(null);
        setGeneratedAvatarProvider(null);
        if (env.isCancelled()) throw new WeekAheadCancelled();
        const simulated = now();

        const npcChanges = npcChangesSince(npcBefore);
        // Every pending mark (this week's new people, or one left from loading) gets the main thread's portrait.
        let portraits = 0;
        const pendingPortraits = findPendingPortraits([week.player, ...npcChanges.map(([, npc]) => npc)]);
        if (pendingPortraits.size) {
            const missing = [...pendingPortraits.keys()].filter(key => !env.portraits.has(key));
            if (missing.length) {
                const drawn = await env.requestPortraits(missing.map(portraitRequestOfKey));
                if (env.isCancelled()) throw new WeekAheadCancelled();
                for (const [key, portrait] of Object.entries(drawn)) if (typeof portrait === 'string' && portrait) env.portraits.set(key, portrait);
            }
            for (const [key, spots] of pendingPortraits) {
                const portrait = env.portraits.get(key);
                if (!portrait || portrait.startsWith(PORTRAIT_PENDING_PREFIX)) throw new Error('The main thread did not draw a pending portrait.');
                for (const spot of spots) (spot.holder as Record<string | number, unknown>)[spot.key] = portrait;
                portraits += spots.length;
            }
        }
        const drawnAt = now();

        const sync = syncPlayerAfterWeek(week.player, previousHealthConditionIds);
        const synced = now();
        const prepared = prepareVerifiedPlayerForPersistence(sync.player, 'PROCESS_WEEK', {
            currentIsUnverified: false,
            sourceByteEstimate: undefined,
        });
        const done = now();
        return {
            npcBefore,
            result: {
                player: prepared.player,
                manifest: prepared.manifest,
                retainPrevious: prepared.retainPrevious,
                needsRecoveryCheckpoint: prepared.needsRecoveryCheckpoint,
                triggerAd: week.triggerAd,
                shouldTriggerBabyQa: sync.shouldTriggerBabyQa,
                babyNamingDue: sync.babyNamingDue,
                medicalPromptToShow: sync.medicalPromptToShow,
                npcChanges,
                npcLength: NPC_DATABASE.length,
                nonFatals,
                gameEvents,
                stages,
                timings: {
                    simulateMs: Math.round(simulated - started),
                    portraitsMs: Math.round(drawnAt - simulated),
                    syncMs: Math.round(synced - drawnAt),
                    prepareMs: Math.round(done - synced),
                    totalMs: Math.round(done - started),
                    portraits,
                },
            },
        };
    } catch (error) {
        restoreNpcDatabase(npcBefore);
        throw error;
    } finally {
        setGeneratedAvatarProvider(null);
        setNonFatalSink(null);
        setGameEventSink(null);
        setWeekProcessingYield(null);
    }
};
