/* Week-speed Phase 2a (2026-11-17): the recovery list (the plan's Phase 2 item 5). Who may open it is D15, answered on
   16 Nov: strictly. It never appears in Settings or any menu, and opens in two cases only:
   1. LOAD_FAILED: a career's save fails to load or verify. The newest good copy is offered first, an older one only if
      that also fails. In 2a the A/B store keeps one backup copy, so there is one point.
   2. VERSION_FLAGGED: an app version is flagged as buggy through a switch (services/remoteSwitches.ts,
      `recoverFromVersions`). A career that played on that version is offered, once, its copy from before it. Only a
      copy whose writer is known (the manifest's appVersion, written from 2a on) and older than that version counts.
   Every restore names the weeks that will be lost and asks to confirm. The purchase ledger is applied again when the
   career opens (App.tsx), and the restore is logged. Later releases add their own points here, each with its entry:
   2b's pre-change copies, 3a's pre-v6 snapshot, 3b's year and version checkpoints. */

export type RecoveryReason = 'LOAD_FAILED' | 'VERSION_FLAGGED';
export type RecoveryPointKind = 'PREVIOUS';

export interface RecoveryPoint {
    kind: RecoveryPointKind;
    age: number;
    week: number;
    savedAt: number | null;
    /** The app version that wrote this copy, or null for copies written before 2a. */
    appVersion: string | null;
}

export interface RecoveryOffer {
    reason: RecoveryReason;
    /** Newest first: the first one is offered first. */
    points: RecoveryPoint[];
    flaggedVersion?: string;
}

const versionParts = (version: string): number[] => version.split('.').map(part => Number.parseInt(part, 10) || 0);
export const compareAppVersions = (left: string, right: string): number => {
    const a = versionParts(left), b = versionParts(right);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        const diff = (a[index] || 0) - (b[index] || 0);
        if (diff) return diff;
    }
    return 0;
};

const weekIndex = (age: number, week: number): number => (Math.max(1, Math.round(age)) - 1) * 52 + (Math.max(1, Math.round(week)) - 1);

export const pointFromCopy = (copy: { player: { age: number; currentWeek: number }; savedAt?: number | null; appVersion?: string | null }): RecoveryPoint => ({
    kind: 'PREVIOUS',
    age: Number(copy.player.age) || 1,
    week: Number(copy.player.currentWeek) || 1,
    savedAt: Number.isFinite(Number(copy.savedAt)) && copy.savedAt !== null ? Number(copy.savedAt) : null,
    appVersion: typeof copy.appVersion === 'string' ? copy.appVersion : null,
});

/** The weeks a restore would lose: from the copy's week up to the last week shown on screen for this career. */
export const weeksLostByRestoring = (
    point: RecoveryPoint,
    lastShown: { careerId: string; age: number; week: number } | null,
    careerId: string,
): number => (
    lastShown && lastShown.careerId === careerId
        ? Math.max(0, weekIndex(lastShown.age, lastShown.week) - weekIndex(point.age, point.week))
        : 0
);

/** Case 1: the offer when the current copy failed and a verified backup exists. */
export const offerForFailedLoad = (backup: RecoveryPoint): RecoveryOffer => ({ reason: 'LOAD_FAILED', points: [backup] });

/** Case 2: the offer for a career just opened, or null. A career played on a flagged version when the copy that just
 *  opened was written by it; the backup is offered when its writer is known and older than that version, and the
 *  player has not answered this offer for this career before. */
export const findFlaggedVersionOffer = (input: {
    flagged: readonly string[];
    currentAppVersion: string | null;
    backup: RecoveryPoint | null;
    answered: (version: string) => boolean;
}): RecoveryOffer | null => {
    const { backup } = input;
    if (!backup || !backup.appVersion || !input.currentAppVersion) return null;
    for (const version of input.flagged) {
        if (input.currentAppVersion !== version || input.answered(version)) continue;
        if (compareAppVersions(backup.appVersion, version) < 0) return { reason: 'VERSION_FLAGGED', points: [backup], flaggedVersion: version };
    }
    return null;
};

/* A flagged-version offer is shown once per career and version: restoring or keeping the career both answer it. */
const ANSWERED_KEY = 'actorEmpire.recoveryOffer.';
const readAnswered = (slot: number): { careerId: string; versions: string[] } | null => {
    try {
        const value = JSON.parse(globalThis.localStorage?.getItem(ANSWERED_KEY + slot) || 'null');
        return value && typeof value.careerId === 'string' && Array.isArray(value.versions) ? value : null;
    } catch { return null; }
};
export const isRecoveryOfferAnswered = (slot: number, careerId: string, version: string): boolean => {
    const answered = readAnswered(slot);
    return Boolean(answered && answered.careerId === careerId && answered.versions.includes(version));
};
export const rememberRecoveryOfferAnswered = (slot: number, careerId: string, version: string): void => {
    try {
        const answered = readAnswered(slot);
        const versions = answered && answered.careerId === careerId ? answered.versions : [];
        globalThis.localStorage?.setItem(ANSWERED_KEY + slot, JSON.stringify({ careerId, versions: [...new Set([...versions, version])].slice(-10) }));
    } catch { /* private mode: the offer may be shown again, which is safe */ }
};
export const forgetRecoveryOffers = (slot: number): void => {
    try { globalThis.localStorage?.removeItem(ANSWERED_KEY + slot); } catch { /* optional */ }
};
