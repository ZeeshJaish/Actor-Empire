/* The forced (interstitial) ads and their rules, in one place.
   No Ads removes every one of these; rewarded ads are never affected.

   Rules (Zeesh, 2026-11-08, and Play's and AdMob's ad policies):
   - only a natural break, after the work is done and before its result page;
   - shown only if already loaded, skipped otherwise, never late;
   - one shared cooldown: 4 real minutes and 8 game weeks since the last ad
     (a rewarded ad counts for the minutes), nothing queued;
   - never over a decision popup, in debt or a crisis, in the Store, or soon
     after a real purchase; a new career sees none before week 24. */
import { isInterstitialReady, preloadInterstitial, showPreloadedInterstitial } from './adLogic';

export type ForcedAdMoment =
    | 'WEEK'
    | 'GREENLIGHT'
    | 'COMMISSION'
    | 'RELEASE'
    | 'RIGHTS_SOLD'
    | 'CAMPAIGN'
    | 'BUILD'
    | 'AWARD_NIGHT'
    | 'STUDIO_PURCHASE';

export type ForcedAdBlocker =
    | 'NO_ADS'
    | 'NEW_CAREER'
    | 'STORE'
    | 'TROUBLE'
    | 'DECISION'
    | 'PURCHASE'
    | 'COOLDOWN_TIME'
    | 'COOLDOWN_WEEKS'
    | 'NOT_LOADED';

export const FORCED_AD_RULES = {
    cooldownMs: 4 * 60_000,
    cooldownWeeks: 8,
    firstCareerWeek: 24,
    afterPurchaseMs: 10 * 60_000,
    /** the short beat between the work and the ad */
    beatMs: 350,
} as const;

export interface ForcedAdContext {
    noAds: boolean;
    /** weeks since this career began; old saves count as long-running */
    careerWeek: number;
    decisionOpen: boolean;
    inTrouble: boolean;
    storeOpen: boolean;
}

interface ForcedAdMemory {
    lastAdAt: number;
    weeksSinceForced: number;
    lastPurchaseAt: number;
}

const STORAGE_KEY = 'ae.forcedAds.v1';

/* Until the app reports a player, assume No Ads: nothing can fire on app open. */
let context: ForcedAdContext = { noAds: true, careerWeek: 0, decisionOpen: false, inTrouble: false, storeOpen: false };

const readMemory = (): ForcedAdMemory => {
    const fallback: ForcedAdMemory = { lastAdAt: 0, weeksSinceForced: 99, lastPurchaseAt: 0 };
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw) as Partial<ForcedAdMemory>;
        return {
            lastAdAt: Number.isFinite(parsed.lastAdAt) ? Number(parsed.lastAdAt) : 0,
            weeksSinceForced: Number.isFinite(parsed.weeksSinceForced) ? Number(parsed.weeksSinceForced) : 99,
            lastPurchaseAt: Number.isFinite(parsed.lastPurchaseAt) ? Number(parsed.lastPurchaseAt) : 0,
        };
    } catch {
        return fallback;
    }
};

let memory: ForcedAdMemory | null = null;
const getMemory = () => (memory ||= readMemory());
const saveMemory = () => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getMemory())); } catch { /* private mode: rules still hold for this session */ }
};

const isDev = () => Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

interface ForcedAdLogEntry { moment: ForcedAdMoment; blocker: ForcedAdBlocker | null; at: number }
const log = (entry: ForcedAdLogEntry) => {
    if (!isDev() || typeof window === 'undefined') return;
    const target = window as unknown as { __aeAdLog?: ForcedAdLogEntry[] };
    target.__aeAdLog = [...(target.__aeAdLog || []), entry].slice(-60);
};

export const setForcedAdContext = (patch: Partial<ForcedAdContext>) => {
    context = { ...context, ...patch };
};

export const getForcedAdContext = (): ForcedAdContext => context;

/** One game week went by (any save). */
export const noteForcedAdWeekPassed = () => {
    const current = getMemory();
    current.weeksSinceForced = Math.min(999, current.weeksSinceForced + 1);
    saveMemory();
};

/** Any ad closed, rewarded included: the minutes of the cooldown start again. */
export const noteAdClosed = () => {
    getMemory().lastAdAt = Date.now();
    saveMemory();
};

/** A real-money purchase went through: no forced ad for a while after it. */
export const noteRealPurchase = () => {
    getMemory().lastPurchaseAt = Date.now();
    saveMemory();
};

export const forcedAdBlocker = (
    moment: ForcedAdMoment,
    overrides: Partial<ForcedAdContext> = {},
    now = Date.now(),
): ForcedAdBlocker | null => {
    const at = { ...context, ...overrides };
    const remembered = getMemory();
    if (at.noAds) return 'NO_ADS';
    if (at.careerWeek < FORCED_AD_RULES.firstCareerWeek) return 'NEW_CAREER';
    if (at.storeOpen) return 'STORE';
    if (at.inTrouble) return 'TROUBLE';
    /* the week's own break comes before its popups appear, so only task breaks check for an open one */
    if (moment !== 'WEEK' && at.decisionOpen) return 'DECISION';
    if (now - remembered.lastPurchaseAt < FORCED_AD_RULES.afterPurchaseMs) return 'PURCHASE';
    if (now - remembered.lastAdAt < FORCED_AD_RULES.cooldownMs) return 'COOLDOWN_TIME';
    if (remembered.weeksSinceForced < FORCED_AD_RULES.cooldownWeeks) return 'COOLDOWN_WEEKS';
    if (!isInterstitialReady()) return 'NOT_LOADED';
    return null;
};

/** Shows the break if every rule allows it; resolves when it closes. Returns at once when it may not show. */
export const showForcedAd = async (moment: ForcedAdMoment, overrides: Partial<ForcedAdContext> = {}): Promise<boolean> => {
    const blocker = forcedAdBlocker(moment, overrides);
    log({ moment, blocker, at: Date.now() });
    if (blocker) {
        if (blocker !== 'NO_ADS') preloadInterstitial();
        return false;
    }
    const remembered = getMemory();
    remembered.weeksSinceForced = 0;
    remembered.lastAdAt = Date.now();
    saveMemory();
    const shown = await showPreloadedInterstitial(moment);
    noteAdClosed();
    return shown;
};

/** For a task's break: the work is already done; a short beat, the ad if it may show, then the caller shows the result. */
export const runTaskAd = async (moment: ForcedAdMoment): Promise<boolean> => {
    if (forcedAdBlocker(moment)) {
        log({ moment, blocker: forcedAdBlocker(moment), at: Date.now() });
        return false;
    }
    await new Promise(resolve => window.setTimeout(resolve, FORCED_AD_RULES.beatMs));
    return showForcedAd(moment);
};

/* ---- reading the player (kept here so every caller reads it the same way) ---- */
interface ForcedAdPlayerView {
    age: number;
    currentWeek: number;
    money: number;
    flags?: Record<string, unknown> | null;
    pendingEvents?: Array<{ type?: string }> | null;
}

const absoluteWeekOf = (age: number, week: number) =>
    (Math.max(1, age) - 1) * 52 + (Math.min(52, Math.max(1, week)) - 1);

/** Marks a new career's first week, so its first forced ad waits until week 24. */
export const careerStartFlag = (age: number, week = 1) => ({ careerStartAbsoluteWeek: absoluteWeekOf(age, week) });

/** Weeks since this career began. A save from before this rule has no mark and counts as long-running. */
export const forcedAdCareerWeek = (player: ForcedAdPlayerView): number => {
    const start = Number(player.flags?.careerStartAbsoluteWeek);
    if (!Number.isFinite(start)) return Number.POSITIVE_INFINITY;
    return absoluteWeekOf(player.age, player.currentWeek) - start;
};

const TROUBLE_EVENTS = new Set(['PRODUCTION_CRISIS', 'STREAMING_INCIDENT', 'ORIGINAL_ISSUE', 'LEGAL_HEARING', 'SCANDAL']);

/** In debt, or a crisis is waiting for the player. */
export const isForcedAdTrouble = (player: ForcedAdPlayerView): boolean =>
    (Number(player.money) || 0) < 0
    || (player.pendingEvents || []).some(event => TROUBLE_EVENTS.has(String(event?.type || '')));

/** True when a task's break would show now (for a screen that blocks taps during it). */
export const taskAdWouldShow = (moment: ForcedAdMoment): boolean => forcedAdBlocker(moment) === null;

if (isDev() && typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__aeForcedAds = {
        context: () => context,
        memory: () => ({ ...getMemory() }),
        reset: () => { memory = { lastAdAt: 0, weeksSinceForced: 99, lastPurchaseAt: 0 }; saveMemory(); },
    };
}
