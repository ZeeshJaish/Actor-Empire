import type { Player } from '../../types';
import type { WeekAheadPortraitRequest, WeekAheadResult } from './weekAheadEngine';
import type { PackedCareerPatches } from './careerPatch';

/* Week Ahead messages (2026-11-12). Ids rise on the main thread; only the newest one is worked on. */
export type WeekAheadToWorker =
    /** Sent once. Portraits the main thread drew (cache key, data URL) and its NPC list, before any week. */
    | { kind: 'init'; portraits: Array<[string, string]>; npcs: unknown[] }
    /** Prepare the week after this career (a structured copy of the main thread's live state), with the main
     *  thread's NPC list as it is now (a week the main thread ran itself changed it). */
    | { kind: 'speculate'; id: number; player: Player; npcs: unknown[]; stage?: WeekAheadStageRequest }
    /** Prepare the week after the week just taken, shown through prepareProcessedWeekForUi. */
    | { kind: 'continue'; id: number; stage?: WeekAheadStageRequest; settle?: boolean }
    /** The prepared week looks like it will be used: work out its patches and write it ahead now. Until then the
     *  worker does neither (a week replaced before that cost only its simulation). */
    | { kind: 'settle'; id: number }
    /** The main thread wants this week now (or as soon as it is ready). With `write`, the worker also writes it
     *  as the slot's save (the main thread holds that slot's save queue meanwhile) and reports 'written'. */
    | { kind: 'take'; id: number; write?: WeekAheadWriteRequest }
    | { kind: 'portraits'; requestId: number; drawn: Record<string, string> }
    /** Forget the career (closed, another slot opened, the week failed to save). */
    | { kind: 'drop' };

export interface WeekAheadVerifiedLive { digest: string; token: string | null }
/** Write the prepared week ahead (not live) into this slot's older copy, on top of this verified live copy. */
export interface WeekAheadStageRequest { key: string; live: WeekAheadVerifiedLive }
export interface WeekAheadWriteRequest {
    key: string;
    /** What the main thread verified about the live copy this session (null: the worker reads and checks it). */
    live: WeekAheadVerifiedLive | null;
    /** The play time on screen, when it moved on after the week was prepared. */
    totalPlayTimeMs?: number;
}

export type WeekAheadFailure = 'REPLACED' | 'ERROR' | 'UNKNOWN' | 'NO_TAKEN_WEEK' | 'NOT_READY';

export type WeekAheadToMain =
    | { kind: 'ready'; npcs: number; loadMisses: number }
    | { kind: 'unusable'; reason: string }
    | { kind: 'need-portraits'; requestId: number; requests: WeekAheadPortraitRequest[] }
    | { kind: 'done'; id: number; ms: number; timings: WeekAheadResult['timings'] }
    | { kind: 'staged'; id: number; ok: boolean; ms: number; message?: string }
    /** The week. Its player is sent as patches to the career the request was made from when possible. */
    | { kind: 'result'; id: number; result: Omit<WeekAheadResult, 'player'> & { player?: Player }; playerPatches?: PackedCareerPatches }
    | { kind: 'written'; id: number; ok: true; committed: WeekAheadVerifiedLive | null; ms: number; promoted: boolean }
    | { kind: 'written'; id: number; ok: false; message: string; ms: number }
    | { kind: 'failed'; id: number; reason: WeekAheadFailure; message?: string };

/** A portrait the main thread has not drawn yet: this prefix plus getGenderedAvatar's cache key. */
export const PORTRAIT_PENDING_PREFIX = 'ae-week-ahead-portrait-pending:';

/** Set by the worker's bootstrap while the game code loads there: portraits come from the main thread's table. */
export const WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL = '__aeWeekAheadLoadPortraits';
