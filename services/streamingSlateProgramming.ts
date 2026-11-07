/**
 * THE PROGRAMMING SLATE, AFTER LAUNCH
 *
 * Before launch the opening slate is twelve programme weeks, planned and locked
 * in the slate planner. Once the service is live the same slate keeps
 * programming the calendar: a title on the shelves that is not yet on the
 * service premieres in the week the player picks, with the campaign they pick,
 * and a premiere that has not happened yet can be moved, re-campaigned or taken
 * off again.
 *
 * Entries keep the slate's own programme-week numbers (week 1 is opening night),
 * so every reader of the slate already handles them: availability (SCHEDULED,
 * then LIVE), the title routes (general release), the programme the weekly loop
 * and the viewing engine stream from, and the offers' upcoming premieres.
 *
 * A licence bought after setup goes on the service by itself when its rights
 * start, with a lean campaign. While those rights have not started yet, the
 * slate can plan that premiere instead: a later week and a bigger campaign.
 *
 * Originals are not scheduled here: their premiere is cleared by the release
 * authorization in the Originals studio, after delivery and localization.
 */
import { getStreamingContentAvailability } from './streamingContentAvailability';
import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingSlateEntry,
    Player,
    StreamingOriginalReleasePattern,
    StreamingSlateMarketingPlan,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getStreamingCatalogLicenseStatus, resolveStreamingCatalogTitle } from './streamingCatalog';
import { getOwnedStreamingProgramEntries, getStreamingSlateCandidates } from './streamingOriginals';
import { ORIGINAL_LICENCE_WEEKS } from './originalsDeal';

/** How far ahead a premiere can be set: one year of weeks from next week. */
export const STREAMING_SLATE_HORIZON_WEEKS = 52;

export type StreamingSlateScheduleRefusal =
    | 'NOT_LIVE'
    | 'UNKNOWN_TITLE'
    | 'ORIGINAL_USES_RELEASE'
    | 'ORIGINAL_NOT_READY'
    | 'ALREADY_PREMIERED'
    | 'WEEK_OUT_OF_RANGE'
    | 'BEFORE_RIGHTS_START'
    | 'RIGHTS_END_FIRST'
    | 'EARLY_ACCESS_RUNNING';

export const STREAMING_SLATE_REFUSAL_COPY: Record<StreamingSlateScheduleRefusal, string> = {
    NOT_LIVE: 'The service is not live yet. Plan the opening slate first.',
    UNKNOWN_TITLE: 'That title is not on your shelves.',
    ORIGINAL_USES_RELEASE: 'An Original on the opening slate keeps its opening week.',
    ORIGINAL_NOT_READY: 'It is still being made. It can go on the Slate once it is delivered.',
    ALREADY_PREMIERED: 'That title has already premiered on the service.',
    WEEK_OUT_OF_RANGE: `Pick a week from next week to ${STREAMING_SLATE_HORIZON_WEEKS} weeks ahead.`,
    BEFORE_RIGHTS_START: 'Its rights have not started by that week. Pick a week from the start of its window.',
    RIGHTS_END_FIRST: 'Its licence ends before that week. Pick an earlier week or renew the rights.',
    EARLY_ACCESS_RUNNING: 'Premium viewers are already watching it, so its release date is locked.',
};

const MARKETING_PLANS: StreamingSlateMarketingPlan[] = ['LEAN', 'STANDARD', 'EVENT'];
const SERIES_PATTERNS: StreamingOriginalReleasePattern[] = ['FULL_SEASON', 'WEEKLY', 'SPLIT_VOLUME'];
/* #291: the two rhythms the viewing engine really tells apart */
const SERIES_RHYTHMS: StreamingOriginalReleasePattern[] = ['FULL_SEASON', 'WEEKLY'];

type Result = { player: Player; changed: boolean; reason?: StreamingSlateScheduleRefusal };
/** where a title taken off the slate goes: back to the shelves, or back to going live when its rights start */
export type StreamingSlateFallback = 'SHELF' | 'LICENCE_START';

/** The absolute weeks a premiere can be set in right now (next week through the horizon). */
export const getStreamingSlateScheduleWindow = (player: Player) => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return { firstAbsoluteWeek: now + 1, lastAbsoluteWeek: now + STREAMING_SLATE_HORIZON_WEEKS };
};

const yearAndWeek = (absoluteWeek: number) => ({ year: Math.floor(absoluteWeek / 52) + 1, week: (absoluteWeek % 52) + 1 });
const perpetual = (licence: Player['ownedStreamingPlatform']['catalogLicenses'][number]) => licence.windowType === 'PERMANENT' || Boolean(licence.permanentPurchase);

/** A licence signed for a window that has not started yet: its title can be planned too. */
const upcomingLicence = (player: Player, projectId: string, now: number) => player.ownedStreamingPlatform.catalogLicenses
    .filter(licence => licence.sourceProjectId === projectId && licence.status === 'ACTIVE' && licence.startsAtAbsoluteWeek > now)
    .sort((left, right) => left.startsAtAbsoluteWeek - right.startsAtAbsoluteWeek || left.id.localeCompare(right.id))[0] || null;

/** The licence a title is running on now: the latest active one, as the programme reads it. */
const currentLicence = (player: Player, projectId: string, absoluteWeek: number) => {
    const platform = player.ownedStreamingPlatform;
    return platform.catalogLicenses
        .filter(licence => licence.sourceProjectId === projectId
            && licence.status === 'ACTIVE'
            && licence.startsAtAbsoluteWeek <= absoluteWeek
            && getStreamingCatalogLicenseStatus(licence, absoluteWeek) === 'ACTIVE')
        .sort((left, right) => right.startsAtAbsoluteWeek - left.startsAtAbsoluteWeek || left.id.localeCompare(right.id))[0] || null;
};

/* Has this title premiered? On the slate: its week has come. Off the slate: a
   licence bought after setup goes on the service when its rights start (the
   programme adds it by itself); a setup (STARTER) licence or a studio title
   waits on the shelves until it is scheduled. */
const hasPremiered = (player: Player, projectId: string, source: OwnedStreamingSlateEntry['source'], now: number, launchAt: number) => {
    const entry = player.ownedStreamingPlatform.launchSlate?.entries.find(item => item.projectId === projectId);
    if (entry) return launchAt + entry.launchWeek - 1 <= now;
    if (source !== 'LICENSED_WINDOW') return false;
    const licence = currentLicence(player, projectId, now);
    return Boolean(licence && licence.origin !== 'STARTER');
};

const withSlate = (player: Player, entries: OwnedStreamingSlateEntry[], now: number, ledgerKey: string, summary: string, metadata: Record<string, string | number>): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const revision = (platform.launchSlate?.revision || 0) + 1;
    const idempotencyKey = `programming-slate:${revision}:${now}:${ledgerKey}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek: now,
        type: 'LAUNCH_SLATE_PROGRAMMED',
        summary,
        source: 'PLAYER_ACTION',
        metadata: { revision, ...metadata },
    };
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            launchSlate: { entries, revision, programmedAtAbsoluteWeek: now },
            eventLedger: [...platform.eventLedger, ledger],
        }, player.id),
    };
};

/** An Original delivered and waiting, or with a premiere still ahead */
export const originalOnTheShelf = (player: Player, projectId: string) => {
    const commission = player.ownedStreamingPlatform.originalCommissions.find(item => item.canonicalProjectId === projectId);
    if (!commission) return null;
    const job = (player.commitments || []).find(item => item.id === projectId);
    if (job) return job.projectPhase === 'AWAITING_RELEASE' ? { commission, job } : null;
    /* #294: a bid-room order is made in the world: delivered, and not yet on the service */
    const made = Object.values(player.world.industryProductions || {}).find(item => item.canonicalProjectId === projectId);
    return made?.status === 'DELIVERED' && !(player.world.projects || []).some(item => item.id === projectId) ? { commission, job: null } : null;
};

const scheduleOriginal = (
    player: Player,
    platform: Player['ownedStreamingPlatform'],
    projectId: string,
    week: number,
    now: number,
    releasePattern?: StreamingOriginalReleasePattern,
): Result => {
    const found = originalOnTheShelf(player, projectId);
    if (!found) {
        const stillMaking = (player.commitments || []).some(item => item.id === projectId)
            || Object.values(player.world.industryProductions || {}).some(item => item.canonicalProjectId === projectId && item.status !== 'DELIVERED' && item.status !== 'RELEASED');
        return { player, changed: false, reason: stillMaking ? 'ORIGINAL_NOT_READY' : 'ALREADY_PREMIERED' };
    }
    const { commission, job } = found;
    const pattern: StreamingOriginalReleasePattern = commission.projectType !== 'SERIES' ? 'SINGLE_PREMIERE'
        : releasePattern && SERIES_RHYTHMS.includes(releasePattern) ? releasePattern
            : commission.releasePlan && SERIES_RHYTHMS.includes(commission.releasePlan.releasePattern) ? commission.releasePlan.releasePattern : 'FULL_SEASON';
    const when = yearAndWeek(week);
    const idempotencyKey = `original-release:${commission.id}:${week}:${pattern}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek: now,
        type: 'ORIGINAL_RELEASE_AUTHORIZED',
        summary: `${commission.title} premieres in year ${when.year}, week ${when.week}.`,
        source: 'PLAYER_ACTION',
        metadata: { commissionId: commission.id, projectId, premiereAtAbsoluteWeek: week, scope: 'GLOBAL', releasePattern: pattern },
    };
    return {
        player: {
            ...player,
            commitments: !job ? player.commitments : player.commitments.map(item => (item.id !== job.id ? item : {
                ...item,
                phaseWeeksLeft: week - now,
                totalPhaseDuration: week - now,
                projectDetails: {
                    ...item.projectDetails!,
                    releaseStrategy: 'STREAMING_ONLY',
                    releaseDate: when.week,
                    hiddenStats: { ...item.projectDetails!.hiddenStats, ownedStreamingReleaseScope: 'GLOBAL', ownedStreamingReleasePattern: pattern },
                },
            })),
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                originalCommissions: platform.originalCommissions.map(item => (item.id !== commission.id ? item : {
                    ...item,
                    releasePlan: { scope: 'GLOBAL', releasePattern: pattern, marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: week, authorizedAtAbsoluteWeek: now },
                    /* a licence's three years run from its premiere */
                    ...(item.deal === 'LICENCE' ? { licenceEndsAtAbsoluteWeek: week + ORIGINAL_LICENCE_WEEKS } : {}),
                })),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};

const unscheduleOriginal = (player: Player, platform: Player['ownedStreamingPlatform'], projectId: string): Result => {
    const found = originalOnTheShelf(player, projectId);
    if (!found) return { player, changed: false, reason: 'ALREADY_PREMIERED' };
    const { commission, job } = found;
    const { releaseStrategy: _strategy, releaseDate: _date, ...details } = (job?.projectDetails || {}) as any;
    return {
        player: {
            ...player,
            commitments: !job ? player.commitments : player.commitments.map(item => (item.id !== job.id ? item : { ...item, phaseWeeksLeft: 0, totalPhaseDuration: 0, projectDetails: details })),
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                originalCommissions: platform.originalCommissions.map(item => (item.id !== commission.id ? item : { ...item, releasePlan: null })),
            }, player.id),
        },
        changed: true,
    };
};

/**
 * Put a title on the slate for a week (or move one that has not premiered yet,
 * or change its campaign). The title must be on the shelves, not yet premiered,
 * and its licence must still run in that week.
 */
export const scheduleStreamingSlateTitle = (
    player: Player,
    input: {
        projectId: string;
        absoluteWeek: number;
        marketingPlan: StreamingSlateMarketingPlan;
        releasePattern?: StreamingOriginalReleasePattern;
    },
): Result => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const launchAt = platform.launchCommit?.committedAtAbsoluteWeek;
    if (launchAt === undefined || platform.lifecycle !== 'ACTIVE') return { player, changed: false, reason: 'NOT_LIVE' };
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const week = Math.round(Number(input.absoluteWeek));
    const window = getStreamingSlateScheduleWindow(player);
    if (!Number.isFinite(week) || week < window.firstAbsoluteWeek || week > window.lastAbsoluteWeek) {
        return { player, changed: false, reason: 'WEEK_OUT_OF_RANGE' };
    }
    const upcoming = upcomingLicence(player, input.projectId, now);
    const candidate = getStreamingSlateCandidates(player).find(item => item.projectId === input.projectId)
        ?? (upcoming ? {
            projectId: upcoming.sourceProjectId, title: upcoming.titleAtSigning, source: 'LICENSED_WINDOW' as const,
            projectType: upcoming.projectType || 'MOVIE', genre: upcoming.genre || 'Licensed',
        } : undefined);
    if (!candidate) return { player, changed: false, reason: 'UNKNOWN_TITLE' };
    if (hasPremiered(player, candidate.projectId, candidate.source, now, launchAt)) return { player, changed: false, reason: 'ALREADY_PREMIERED' };
    /* #245: moving it on would keep it fresh for ever. #291: its rhythm can still change, in the same week */
    const sameWeek = candidate.source === 'ORIGINAL' && platform.originalCommissions.find(item => item.canonicalProjectId === candidate.projectId)?.releasePlan?.premiereAtAbsoluteWeek === week;
    if (!sameWeek && getStreamingContentAvailability(player, candidate.projectId).status === 'EARLY_ACCESS') return { player, changed: false, reason: 'EARLY_ACCESS_RUNNING' };
    /* #291: an Original takes its week like anything else on the shelves. The Campaign Studio is what gives it weight now */
    if (candidate.source === 'ORIGINAL') return scheduleOriginal(player, platform, candidate.projectId, week, now, input.releasePattern);
    if (candidate.source === 'LICENSED_WINDOW') {
        /* a licence must cover the premiere week: started by then, not yet ended */
        const licences = player.ownedStreamingPlatform.catalogLicenses.filter(licence => licence.sourceProjectId === candidate.projectId && licence.status === 'ACTIVE');
        const covering = licences.some(licence => licence.startsAtAbsoluteWeek <= week && (perpetual(licence) || licence.expiresAtAbsoluteWeek > week));
        if (!covering) {
            const startsLater = licences.some(licence => licence.startsAtAbsoluteWeek > week);
            return { player, changed: false, reason: startsLater ? 'BEFORE_RIGHTS_START' : 'RIGHTS_END_FIRST' };
        }
    }
    const existing = platform.launchSlate?.entries.find(item => item.projectId === candidate.projectId);
    const marketingPlan = MARKETING_PLANS.includes(input.marketingPlan) ? input.marketingPlan : existing?.marketingPlan || 'STANDARD';
    const releasePattern: StreamingOriginalReleasePattern = candidate.projectType !== 'SERIES'
        ? 'SINGLE_PREMIERE'
        : input.releasePattern && SERIES_PATTERNS.includes(input.releasePattern) ? input.releasePattern
            : existing && SERIES_PATTERNS.includes(existing.releasePattern) ? existing.releasePattern : 'FULL_SEASON';
    const entry: OwnedStreamingSlateEntry = {
        id: existing?.id || createDeterministicId('streaming_slate_entry', platform.simulationSeed, candidate.projectId),
        projectId: candidate.projectId,
        title: candidate.title,
        source: candidate.source,
        projectType: candidate.projectType,
        genre: candidate.genre,
        launchWeek: week - launchAt + 1,
        releasePattern,
        marketingPlan,
    };
    const entries = existing
        ? (platform.launchSlate?.entries || []).map(item => item.projectId === candidate.projectId ? entry : item)
        : [...(platform.launchSlate?.entries || []), entry];
    const when = yearAndWeek(week);
    /* #244: a film planned through the wizard opens on its Slate week, so moving one moves the other */
    const planned: Player = player.commitments.some(item => item.id === candidate.projectId && item.projectDetails?.hiddenStats?.ownPlatformRelease) ? {
        ...player,
        commitments: player.commitments.map(item => (item.id === candidate.projectId ? {
            ...item, phaseWeeksLeft: week - now, totalPhaseDuration: week - now,
            projectDetails: item.projectDetails ? { ...item.projectDetails, releaseDate: when.week } : item.projectDetails,
        } : item)),
    } : player;
    return {
        player: withSlate(planned, entries, now, `${candidate.projectId}:${week}`,
            `${candidate.title} ${existing ? 'moved to' : 'programmed for'} year ${when.year}, week ${when.week} with ${marketingPlan === 'EVENT' ? 'an' : 'a'} ${marketingPlan.toLowerCase()} campaign.`,
            { projectId: candidate.projectId, premiereAtAbsoluteWeek: week, marketingPlan }),
        changed: true,
    };
};

/** Where a title off the slate goes: a licence bought after setup still goes live when its rights start. */
export const getStreamingSlateFallback = (player: Player, projectId: string): StreamingSlateFallback => (
    player.ownedStreamingPlatform.catalogLicenses.some(licence => licence.sourceProjectId === projectId
        && licence.status === 'ACTIVE' && licence.origin !== 'STARTER') ? 'LICENCE_START' : 'SHELF'
);

/** Take a title that has not premiered yet off the slate: back to the shelves, or (a
    licence bought after setup) back to going live when its rights start. */
export const unscheduleStreamingSlateTitle = (player: Player, projectId: string): Result => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const launchAt = platform.launchCommit?.committedAtAbsoluteWeek;
    if (launchAt === undefined || platform.lifecycle !== 'ACTIVE') return { player, changed: false, reason: 'NOT_LIVE' };
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const entry = platform.launchSlate?.entries.find(item => item.projectId === projectId);
    /* #291: an Original off the Slate waits, delivered, until it is given a week */
    const original = !entry && platform.originalCommissions.find(item => item.canonicalProjectId === projectId && item.releasePlan);
    if (original) {
        if (original.releasePlan!.premiereAtAbsoluteWeek <= now) return { player, changed: false, reason: 'ALREADY_PREMIERED' };
        if (getStreamingContentAvailability(player, projectId).status === 'EARLY_ACCESS') return { player, changed: false, reason: 'EARLY_ACCESS_RUNNING' };
        return unscheduleOriginal(player, platform, projectId);
    }
    if (!entry) return { player, changed: false, reason: 'UNKNOWN_TITLE' };
    if (entry.source === 'ORIGINAL') return { player, changed: false, reason: 'ORIGINAL_USES_RELEASE' };
    if (launchAt + entry.launchWeek - 1 <= now) return { player, changed: false, reason: 'ALREADY_PREMIERED' };
    if (getStreamingContentAvailability(player, projectId).status === 'EARLY_ACCESS') return { player, changed: false, reason: 'EARLY_ACCESS_RUNNING' };
    return {
        player: withSlate(player, (platform.launchSlate?.entries || []).filter(item => item.projectId !== projectId), now,
            `${projectId}:off`, `${entry.title} taken off the slate before its premiere.`, { projectId }),
        changed: true,
    };
};

/* ── Auto-fill ───────────────────────────────────────────────────────────────
   Puts the titles on the shelves into the calendar the way the weekly loop
   rewards it: a week with no premiere that week or in the next two loses
   content freshness (the "long content gap"), and a premiere keeps the service
   fresh for the weeks after it. So the plan closes the earliest silent stretch
   first, each premiere as late as still closes it (about every third week),
   and once nothing is silent it spreads the rest into the emptiest weeks. A
   title only goes in weeks its rights cover; titles whose rights end soonest
   are placed first, then the best rated. One auto-filled premiere per week,
   never on a week that already has one, every campaign Standard. */
export interface StreamingSlateAutoFillItem {
    projectId: string;
    title: string;
    absoluteWeek: number;
    marketingPlan: StreamingSlateMarketingPlan;
}

/** The shelves: titles on the platform but not on the service, that the slate can premiere. */
const shelfTitles = (player: Player, now: number, launchAt: number) => getStreamingSlateCandidates(player).flatMap(candidate => {
    /* #291: a delivered Original with no week yet is on the shelves */
    const original = candidate.source === 'ORIGINAL' ? originalOnTheShelf(player, candidate.projectId) : null;
    if (candidate.source === 'ORIGINAL' && (!original || original.commission.releasePlan)) return [];
    if (player.ownedStreamingPlatform.launchSlate?.entries.some(entry => entry.projectId === candidate.projectId)) return [];
    if (hasPremiered(player, candidate.projectId, candidate.source, now, launchAt)) return [];
    const licence = candidate.source === 'LICENSED_WINDOW' ? currentLicence(player, candidate.projectId, now) : null;
    if (candidate.source === 'LICENSED_WINDOW' && !licence) return [];
    return [{
        ...candidate,
        rightsEnd: original?.commission.licenceEndsAtAbsoluteWeek ?? (licence && !perpetual(licence) ? licence.expiresAtAbsoluteWeek : Number.POSITIVE_INFINITY),
        rating: resolveStreamingCatalogTitle(player, candidate.projectId)?.rating ?? 0,
    }];
});

/** The premieres the player set on the slate that are still ahead (Originals keep their own record). */
const plannedEntries = (player: Player) => {
    const platform = player.ownedStreamingPlatform;
    const launchAt = platform.launchCommit?.committedAtAbsoluteWeek;
    if (launchAt === undefined) return [];
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return (platform.launchSlate?.entries || []).filter(entry => entry.source !== 'ORIGINAL' && launchAt + entry.launchWeek - 1 > now);
};

/** Remove all: every premiere still ahead that the slate set comes off at once, back to
    the shelves (or, a licence bought after setup, back to going live at its rights start). */
export const clearStreamingSlatePlans = (player: Player): { player: Player; changed: boolean; removed: string[] } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.launchCommit || platform.lifecycle !== 'ACTIVE') return { player, changed: false, removed: [] };
    const planned = plannedEntries(player);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    /* #291: Originals with a week still ahead come off with the rest */
    const originals = platform.originalCommissions.filter(item => item.canonicalProjectId && item.releasePlan && item.releasePlan.premiereAtAbsoluteWeek > now
        && originalOnTheShelf(player, item.canonicalProjectId) && !(platform.launchSlate?.entries || []).some(entry => entry.projectId === item.canonicalProjectId));
    if (!planned.length && !originals.length) return { player, changed: false, removed: [] };
    const off = new Set(planned.map(entry => entry.projectId));
    let next = planned.length ? withSlate(player, (platform.launchSlate?.entries || []).filter(entry => !off.has(entry.projectId)), now,
        'clear', `${planned.length} planned premiere${planned.length === 1 ? '' : 's'} taken off the slate.`, { removed: planned.length }) : player;
    originals.forEach(item => {
        next = unscheduleOriginal(next, next.ownedStreamingPlatform, item.canonicalProjectId!).player;
    });
    return { player: next, changed: true, removed: [...planned.map(entry => entry.title), ...originals.map(item => item.title)] };
};

/** Plan Auto-fill around the premieres already planned, or (fresh) as if none were. */
export const planStreamingSlateAutoFill = (player: Player, options: { fresh?: boolean } = {}): StreamingSlateAutoFillItem[] => {
    if (options.fresh) {
        const cleared = clearStreamingSlatePlans(player);
        if (cleared.changed) return planStreamingSlateAutoFill(cleared.player);
    }
    const platform = player.ownedStreamingPlatform;
    const launchAt = platform.launchCommit?.committedAtAbsoluteWeek;
    if (launchAt === undefined || platform.lifecycle !== 'ACTIVE') return [];
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const { firstAbsoluteWeek: first, lastAbsoluteWeek: last } = getStreamingSlateScheduleWindow(player);
    /* every premiere already on the calendar: the programme, Originals' cleared
       premieres and licences that go live when their rights start */
    const busy = new Set<number>();
    getOwnedStreamingProgramEntries(player).forEach(entry => busy.add(launchAt + entry.launchWeek - 1));
    platform.originalCommissions.forEach(commission => { if (commission.releasePlan) busy.add(commission.releasePlan.premiereAtAbsoluteWeek); });
    platform.catalogLicenses.forEach(licence => {
        if (licence.status === 'ACTIVE' && licence.origin !== 'STARTER' && licence.startsAtAbsoluteWeek > now) busy.add(licence.startsAtAbsoluteWeek);
    });
    const covered = (week: number) => busy.has(week) || busy.has(week + 1) || busy.has(week + 2);
    const distance = (week: number) => Math.min(Number.POSITIVE_INFINITY, ...[...busy].map(other => Math.abs(other - week)));
    const shelf = shelfTitles(player, now, launchAt)
        .sort((left, right) => (left.rightsEnd - right.rightsEnd) || (right.rating - left.rating) || left.title.localeCompare(right.title));
    const plan: StreamingSlateAutoFillItem[] = [];
    shelf.forEach(title => {
        const lastWeek = Math.min(last, title.rightsEnd - 1);
        if (lastWeek < first) return;
        let target: number | null = null;
        /* 1. the earliest silent week: premiere as late as still closes it */
        for (let week = first; week <= Math.min(last - 2, lastWeek) && target === null; week += 1) {
            if (covered(week)) continue;
            for (let candidate = Math.min(week + 2, lastWeek); candidate >= week; candidate -= 1) {
                if (!busy.has(candidate)) { target = candidate; break; }
            }
        }
        /* 2. nothing silent: the free week farthest from every premiere */
        if (target === null) {
            let best = -1;
            for (let week = first; week <= lastWeek; week += 1) {
                if (busy.has(week)) continue;
                const gap = distance(week);
                if (gap > best) { best = gap; target = week; }
            }
        }
        if (target === null) return;
        busy.add(target);
        plan.push({ projectId: title.projectId, title: title.title, absoluteWeek: target, marketingPlan: 'STANDARD' });
    });
    return plan.sort((left, right) => left.absoluteWeek - right.absoluteWeek);
};

/** Schedules the auto-fill plan, title by title through the same checks as a manual
    premiere. Fresh: the planned premieres come off first and everything is planned anew. */
export const autoFillStreamingSlate = (player: Player, options: { fresh?: boolean } = {}): { player: Player; changed: boolean; scheduled: StreamingSlateAutoFillItem[] } => {
    const cleared = options.fresh ? clearStreamingSlatePlans(player) : null;
    let next = cleared?.player ?? player;
    const scheduled: StreamingSlateAutoFillItem[] = [];
    planStreamingSlateAutoFill(next).forEach(item => {
        const result = scheduleStreamingSlateTitle(next, item);
        if (!result.changed) return;
        next = result.player;
        scheduled.push(item);
    });
    return { player: next, changed: Boolean(cleared?.changed) || scheduled.length > 0, scheduled };
};

