/**
 * The brand studio (#116; plan §18.6; Zeesh, 2026-11-01: "एचक्यू के लोगों को टैग करो तो चेंज हो जाए" … "लोगो और इंटेंट बदलने
 * का पैसा और हफ्ता लगेगा, और ठीक है करो").
 *
 * One place for the look, opened from the logo on the HQ: the logo (a mark or an upload), the colours, the typeface and the
 * lockup; the ident; the front page. The name stays: it is the company's id.
 *  - A new look costs money (a rollout across the apps, the stores and the marketing: $2M plus 40¢ a subscriber, up to
 *    $60M) and the next waits 4 weeks, like the studio's rebrand (services/studioRebrand.ts).
 *  - A new ident after launch is a new production: the kit's price ($500K to shoot the included one again) and the next
 *    waits 4 weeks. Before launch the ident is set in Define the Launch, where it is paid at launch (#112).
 *  - The front page changes as before (saveStreamingStorefrontPlan, OPERATIONS): free, from next week.
 * Each change writes a ledger line (SERVICE_CONFIGURATION_COMMITTED, metadata.brandChange LOOK or IDENT), which the
 * world reads (#117).
 */
import { getStreamingOpeningLock } from './streamingOpeningLock';
import type {
    OwnedStreamingCostCommitment, OwnedStreamingCustomIdentAudio, OwnedStreamingLedgerEntry, OwnedStreamingPlatformIdentity, Player,
    StreamingIdentPackageId, StreamingSoundIdentKey, StreamingTypefaceId, StreamingWordmarkStyleId,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { STREAMING_IDENT_PACKAGE_COSTS, STREAMING_IDENT_PACKAGE_DURATIONS } from './streamingLaunchProgram';
import { streamingLaunchUnlockLock } from './streamingLaunchUnlocks';
import { resolveStreamingTechTree } from './streamingTechTreeCatalogue';

export const STREAMING_BRAND_CHANGE_WEEKS = 4;
/** the included ident, made again */
export const STREAMING_IDENT_RESHOOT_COST = 500_000;

export interface StreamingBrandLook {
    visualMarkId: string;
    customMarkDataUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    typefaceId: StreamingTypefaceId;
    wordmarkStyleId: StreamingWordmarkStyleId;
}

export const getStreamingBrandLook = (identity: OwnedStreamingPlatformIdentity): StreamingBrandLook => ({
    visualMarkId: identity.visualMarkId || 'BOLT',
    customMarkDataUrl: identity.customMarkDataUrl || null,
    primaryColor: identity.primaryColor,
    secondaryColor: identity.secondaryColor,
    typefaceId: identity.typefaceId || 'GROTESK',
    wordmarkStyleId: identity.wordmarkStyleId || 'SIDE',
});

/** what changed between two looks, in words: "logo", "colours", "typeface", "lockup" */
export const streamingBrandLookChanges = (from: StreamingBrandLook, to: StreamingBrandLook): string[] => [
    ...(from.visualMarkId !== to.visualMarkId || from.customMarkDataUrl !== to.customMarkDataUrl ? ['logo'] : []),
    ...(from.primaryColor.toLowerCase() !== to.primaryColor.toLowerCase() || from.secondaryColor.toLowerCase() !== to.secondaryColor.toLowerCase() ? ['colours'] : []),
    ...(from.typefaceId !== to.typefaceId ? ['typeface'] : []),
    ...(from.wordmarkStyleId !== to.wordmarkStyleId ? ['lockup'] : []),
];

/** the changes as words (#117): "a new logo, new colours and a new typeface" */
export const streamingBrandLookChangeText = (changes: string[]): string => {
    const phrases = changes.map(change => (change === 'colours' ? 'new colours' : `a new ${change}`));
    return phrases.length > 1 ? `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}` : phrases[0] || 'a new look';
};

/** a new look: a rollout across the apps, the stores and the marketing */
export const getStreamingBrandLookCost = (subscribers: number): number => (
    Math.ceil(Math.max(2_000_000, Math.min(60_000_000, 2_000_000 + Math.max(0, subscribers) * .4)) / 100_000) * 100_000
);

/** a new ident after launch: the kit's price, or the included one shot again */
export const getStreamingIdentChangeCost = (packageId: StreamingIdentPackageId): number => (
    packageId === 'STANDARD' ? STREAMING_IDENT_RESHOOT_COST : STREAMING_IDENT_PACKAGE_COSTS[packageId]
);

const waitWeeks = (since: number | undefined, week: number) => (since === undefined ? 0 : Math.max(0, since + STREAMING_BRAND_CHANGE_WEEKS - week));

export interface StreamingBrandStudioView {
    live: boolean;
    look: StreamingBrandLook | null;
    lookCost: number;
    /** weeks until the next new look may be unveiled; 0 now */
    lookWaitWeeks: number;
    /** weeks until the next new ident may be commissioned (after launch); 0 now */
    identWaitWeeks: number;
    treasury: number;
}

export const getStreamingBrandStudioView = (player: Player): StreamingBrandStudioView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    return {
        live: Boolean(platform.launchCommit),
        look: platform.identity ? getStreamingBrandLook(platform.identity) : null,
        lookCost: getStreamingBrandLookCost(platform.metrics.subscribers),
        lookWaitWeeks: waitWeeks(platform.identity?.lookChangedAtAbsoluteWeek, week),
        identWaitWeeks: waitWeeks(platform.identity?.identChangedAtAbsoluteWeek, week),
        treasury: platform.treasuryCash,
    };
};

export interface StreamingBrandChangeResult {
    player: Player;
    changed: boolean;
    reason: 'APPLIED' | 'NO_CHANGE' | 'WAIT' | 'INSUFFICIENT_TREASURY' | 'LOCKED' | 'INVALID_STATE';
    message: string;
}

const paid = (seed: string, key: string, label: string, amount: number, week: number, sourceReferenceId: string): OwnedStreamingCostCommitment => ({
    id: createDeterministicId('streaming_brand_cost', seed, key), idempotencyKey: key, category: 'SERVICE', label, status: 'PAID',
    plannedAmount: amount, committedAmount: amount, paidAmount: amount, weeklyAmount: 0,
    createdAtAbsoluteWeek: week, committedAtAbsoluteWeek: week, paidAtAbsoluteWeek: week, sourceReferenceId,
});
const line = (seed: string, key: string, week: number, summary: string, metadata: OwnedStreamingLedgerEntry['metadata']): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', seed, key), idempotencyKey: key, absoluteWeek: week,
    type: 'SERVICE_CONFIGURATION_COMMITTED', summary, source: 'PLAYER_ACTION', metadata,
});
const money = (value: number) => `$${value >= 1e6 ? `${Math.round(value / 1e5) / 10}M` : `${Math.round(value / 1e3)}K`}`;

/** Unveil a new look: the name stays; the money is paid now; the next new look waits 4 weeks. */
export const applyStreamingBrandLook = (player: Player, next: StreamingBrandLook): StreamingBrandChangeResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity) return { player, changed: false, reason: 'INVALID_STATE', message: 'There is no service to rebrand yet.' };
    /* #253 */
    const buildLock = getStreamingOpeningLock(player);
    if (buildLock.planLocked) return { player, changed: false, reason: 'INVALID_STATE', message: buildLock.message };
    const changes = streamingBrandLookChanges(getStreamingBrandLook(platform.identity), next);
    if (!changes.length) return { player, changed: false, reason: 'NO_CHANGE', message: 'This is the look you have.' };
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const wait = waitWeeks(platform.identity.lookChangedAtAbsoluteWeek, week);
    if (wait > 0) return { player, changed: false, reason: 'WAIT', message: `The last new look is still rolling out. The next can come in ${wait} week${wait === 1 ? '' : 's'}.` };
    const cost = getStreamingBrandLookCost(platform.metrics.subscribers);
    if (platform.treasuryCash < cost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', message: `A new look costs ${money(cost)}; the treasury has ${money(platform.treasuryCash)}.` };
    const key = `brand-look:${week}:${changes.join('+')}`;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        identity: {
            ...platform.identity,
            visualMarkId: next.visualMarkId,
            customMarkDataUrl: next.customMarkDataUrl,
            primaryColor: next.primaryColor,
            secondaryColor: next.secondaryColor,
            typefaceId: next.typefaceId,
            wordmarkStyleId: next.wordmarkStyleId,
            lookChangedAtAbsoluteWeek: week,
        },
        costCommitments: [...platform.costCommitments, paid(platform.simulationSeed, key, 'new brand look', cost, week, `brand-look:${week}`)],
        eventLedger: [...platform.eventLedger, line(platform.simulationSeed, key, week,
            `${platform.identity.name} unveiled a new look: ${streamingBrandLookChangeText(changes)}.`,
            { cost, brandChange: 'LOOK', changes: changes.join(',') })],
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'APPLIED', message: `New look unveiled for ${money(cost)}.` };
};

/** Commission a new ident after launch: a new production, paid now; the next waits 4 weeks. */
export const rebrandStreamingIdent = (player: Player, input: {
    soundIdentKey: StreamingSoundIdentKey;
    identPackageId: StreamingIdentPackageId;
    customIdentAudio?: OwnedStreamingCustomIdentAudio | null;
}): StreamingBrandChangeResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || !platform.launchCommit) {
        return { player, changed: false, reason: 'INVALID_STATE', message: 'Before launch, the ident is set in Define the Launch.' };
    }
    const config = platform.serviceConfiguration;
    if (config.soundIdentKey === input.soundIdentKey && config.identPackageId === input.identPackageId
        && (config.customIdentAudio?.fingerprint || null) === (input.customIdentAudio?.fingerprint || null)) {
        return { player, changed: false, reason: 'NO_CHANGE', message: 'This is the ident you have.' };
    }
    const lock = streamingLaunchUnlockLock(resolveStreamingTechTree(platform), `ident:${input.identPackageId.toLowerCase()}`);
    if (lock) return { player, changed: false, reason: 'LOCKED', message: lock.needs };
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const wait = waitWeeks(platform.identity.identChangedAtAbsoluteWeek, week);
    if (wait > 0) return { player, changed: false, reason: 'WAIT', message: `The last new ident is still being rolled out. The next can come in ${wait} week${wait === 1 ? '' : 's'}.` };
    const cost = getStreamingIdentChangeCost(input.identPackageId);
    if (platform.treasuryCash < cost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', message: `A new ident costs ${money(cost)}; the treasury has ${money(platform.treasuryCash)}.` };
    const key = `brand-ident:${week}:${input.identPackageId}:${input.soundIdentKey}`;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        identity: { ...platform.identity, identChangedAtAbsoluteWeek: week },
        serviceConfiguration: {
            ...config,
            source: 'PLAYER_ACTION',
            soundIdentKey: input.soundIdentKey,
            identPackageId: input.identPackageId,
            identDurationSeconds: input.customIdentAudio?.durationSeconds || STREAMING_IDENT_PACKAGE_DURATIONS[input.identPackageId],
            customIdentAudio: input.customIdentAudio || null,
            committedCost: config.committedCost + cost,
            committedAtAbsoluteWeek: week,
            revision: config.revision + 1,
        },
        costCommitments: [...platform.costCommitments, paid(platform.simulationSeed, key, `${input.identPackageId.toLowerCase()} service ident package, after launch`, cost, week, `brand-ident:${week}`)],
        eventLedger: [...platform.eventLedger, line(platform.simulationSeed, key, week,
            `${platform.identity.name} commissioned a new ident.`,
            { cost, brandChange: 'IDENT', package: input.identPackageId, sound: input.soundIdentKey })],
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'APPLIED', message: `New ident commissioned for ${money(cost)}.` };
};
