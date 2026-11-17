import { Capacitor } from '@capacitor/core';
import { AppReview } from '@capawesome/capacitor-app-review';
import type { Player } from '../types';
import { trackGameEvent } from './firebaseService';

/* 2026-11-17 (Zeesh): store ratings, done the way Google Play and Apple ask.
   - The rating popup is the stores' own one (Play In-App Review API, Apple's requestReview), through
     @capawesome/capacitor-app-review. The game draws no rating popup of its own.
   - Nothing is asked before it or around it ("Do you like the game?", "5 stars?") and nothing is given for a rating.
   - A button never calls the popup: the stores may not show it. Settings opens the store page instead.
   - The stores decide whether the popup really shows (Apple: at most 3 times a year; Google: a quota of its own) and
     never say whether it did, so the game spaces its own asks out.
   - The game asks only at a happy moment (an award won, a finished film or show that did well) in a quick week without
     the break ad, only after the player has played a few days, and never soon after anything went wrong: a week that
     was not applied, a save that failed its check, Recovery Mode, a problem reported, the app closing by itself. */

export const STORE_REVIEW_RULES = {
    minDaysSinceFirstSeen: 3,
    minSessions: 3,
    minWeeksPlayed: 15,
    /** our own spacing between asks */
    minDaysBetweenAsks: 120,
    maxAsksPerYear: 3,
    /** how long anything going wrong holds the ask back */
    troubleHoldDays: 7,
    /** a week slower than this is no happy moment */
    maxHappyWeekMs: 8000,
    /** never while an ad is up, nor this soon after one started or closed (App checks services/adLogic + forcedAds) */
    quietAfterAdMs: 60_000,
} as const;

export const APP_STORE_ID = '6757667257';
const STORAGE_KEY = 'actorEmpire.storeReview.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export type StoreReviewTrouble =
    | 'week_not_applied' | 'save_recovery' | 'recovery_mode' | 'issue_report' | 'session_ended_unexpectedly';
export type StoreReviewMoment = 'award_won' | 'hit_project';

export type StoreReviewState = {
    firstSeenAt: number;
    sessions: number;
    weeksPlayed: number;
    lastTroubleAt: number | null;
    lastTroubleReason: StoreReviewTrouble | null;
    asks: number[];
    lastStoreOpenAt: number | null;
};

const freshState = (now: number): StoreReviewState => ({
    firstSeenAt: now, sessions: 0, weeksPlayed: 0, lastTroubleAt: null, lastTroubleReason: null, asks: [], lastStoreOpenAt: null,
});

export const readStoreReviewState = (now = Date.now()): StoreReviewState => {
    try {
        const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
        if (!raw || typeof raw !== 'object') return freshState(now);
        const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
        return {
            firstSeenAt: num(raw.firstSeenAt, now),
            sessions: Math.max(0, num(raw.sessions, 0)),
            weeksPlayed: Math.max(0, num(raw.weeksPlayed, 0)),
            lastTroubleAt: typeof raw.lastTroubleAt === 'number' ? raw.lastTroubleAt : null,
            lastTroubleReason: typeof raw.lastTroubleReason === 'string' ? raw.lastTroubleReason : null,
            asks: Array.isArray(raw.asks) ? raw.asks.filter((t: unknown) => typeof t === 'number').slice(-12) : [],
            lastStoreOpenAt: typeof raw.lastStoreOpenAt === 'number' ? raw.lastStoreOpenAt : null,
        };
    } catch {
        return freshState(now);
    }
};

const writeStoreReviewState = (state: StoreReviewState) => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode or full: no rating ask */ }
};
const updateState = (change: (state: StoreReviewState) => StoreReviewState, now = Date.now()) => {
    const next = change(readStoreReviewState(now));
    writeStoreReviewState(next);
    return next;
};

/** Once per app start. */
export const noteStoreReviewSession = (now = Date.now()) => updateState(state => ({ ...state, sessions: state.sessions + 1 }), now);
/** After every week that was applied. */
export const noteStoreReviewWeek = (now = Date.now()) => updateState(state => ({ ...state, weeksPlayed: state.weeksPlayed + 1 }), now);
/** Anything that went wrong holds the ask back (troubleHoldDays). */
export const noteStoreReviewTrouble = (reason: StoreReviewTrouble, now = Date.now()) =>
    updateState(state => ({ ...state, lastTroubleAt: now, lastTroubleReason: reason }), now);

/** Why the game must not ask now, or null when it may. Pure. */
export const storeReviewHoldReason = (state: StoreReviewState, now: number): string | null => {
    const rules = STORE_REVIEW_RULES;
    if (state.lastTroubleAt !== null && now - state.lastTroubleAt < rules.troubleHoldDays * DAY_MS) return `recent_trouble:${state.lastTroubleReason}`;
    if (now - state.firstSeenAt < rules.minDaysSinceFirstSeen * DAY_MS) return 'too_new';
    if (state.sessions < rules.minSessions) return 'few_sessions';
    if (state.weeksPlayed < rules.minWeeksPlayed) return 'few_weeks';
    const lastAsk = state.asks.length ? Math.max(...state.asks) : null;
    if (lastAsk !== null && now - lastAsk < rules.minDaysBetweenAsks * DAY_MS) return 'asked_recently';
    if (state.lastStoreOpenAt !== null && now - state.lastStoreOpenAt < rules.minDaysBetweenAsks * DAY_MS) return 'store_opened_recently';
    if (state.asks.filter(t => now - t < 365 * DAY_MS).length >= rules.maxAsksPerYear) return 'yearly_limit';
    return null;
};

/** The week's happy moment, if it had one: an award won, or a finished film or show that did well. Pure. */
export const findStoreReviewMoment = (before: Player, after: Player): StoreReviewMoment | null => {
    const oldAwards = new Set((before.awards || []).map(award => award.id));
    if ((after.awards || []).some(award => award.outcome === 'WON' && !oldAwards.has(award.id))) return 'award_won';
    const oldProjects = new Set((before.pastProjects || []).map(project => project.id));
    if ((after.pastProjects || []).some(project => !oldProjects.has(project.id)
        && (project.outcomeTier === 'SUCCESS' || project.outcomeTier === 'MASSIVE_SUCCESS'))) return 'hit_project';
    return null;
};

export const isStoreReviewAvailable = (): boolean => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AppReview');

/** Asks the store's own rating popup. Counts as an ask whether or not the store shows it. */
export const requestStoreReview = (moment: StoreReviewMoment, now = Date.now()): boolean => {
    if (!isStoreReviewAvailable()) return false;
    const state = updateState(current => ({ ...current, asks: [...current.asks, now].slice(-12) }), now);
    trackGameEvent('review_prompt_requested', {
        trigger: moment,
        weeks_played: state.weeksPlayed,
        days_since_first_seen: Math.floor((now - state.firstSeenAt) / DAY_MS),
        asks_this_year: state.asks.filter(t => now - t < 365 * DAY_MS).length,
    });
    void AppReview.requestReview().catch(error => trackGameEvent('review_prompt_failed', { error: String(error?.message || error).slice(0, 100) }));
    return true;
};

/** Settings: the store's own page for the game (Google Play; on iPhone the App Store's "write a review"). */
export const openStoreReviewPage = async (now = Date.now()): Promise<boolean> => {
    if (!isStoreReviewAvailable()) return false;
    updateState(current => ({ ...current, lastStoreOpenAt: now }), now);
    trackGameEvent('review_store_opened', { source: 'settings', platform: Capacitor.getPlatform() });
    try {
        await AppReview.openAppStore(Capacitor.getPlatform() === 'ios' ? { appId: APP_STORE_ID } : undefined);
        return true;
    } catch {
        return false;
    }
};
