/**
 * Localization by region — the player's two actions (Content Desk · Localization).
 *
 *   set up a region    cash once: the language network's activation and weekly cost
 *   add energy         to a track's next level, +5 a press (or the rest at once);
 *                      the level is reached the moment its bar is full, and energy
 *                      put in toward a level is kept until then
 *
 * No lab, no slots, no cash per level (Zeesh, 2026-10-23: "set it up with some
 * money, then just upgrade"). Each action returns a new player; nothing here
 * saves. Energy is spent with `spendPlayerEnergy` (this week's first, then the bank).
 */
import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingLocalizationMilestone,
    OwnedStreamingLocalizationRegion,
    OwnedStreamingPlatformState,
    Player,
    StreamingLocalizationTrack,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import { activateStreamingLanguagePackage } from './streamingGlobalLocalization';
import { STREAMING_LANGUAGE_PACKAGES } from './streamingLocalizationCapabilities';
import {
    STREAMING_LOCALIZATION_LEVEL_REACH,
    STREAMING_LOCALIZATION_REGION_META,
    getStreamingLocalizationLevelEnergy,
    measureStreamingLocalizationRegion,
    resolveStreamingLocalizationRegions,
} from './streamingLocalizationRegions';

export type StreamingLocalizationRefusal =
    | 'UNKNOWN_REGION'
    | 'ALREADY_OPEN'
    | 'REGION_LOCKED'
    | 'INSUFFICIENT_TREASURY'
    | 'MAX_LEVEL'
    | 'INSUFFICIENT_ENERGY';

export const STREAMING_LOCALIZATION_REFUSAL_COPY: Record<StreamingLocalizationRefusal, string> = {
    UNKNOWN_REGION: 'That language region is not available.',
    ALREADY_OPEN: 'That region is already set up.',
    REGION_LOCKED: 'Set the region up first.',
    INSUFFICIENT_TREASURY: 'The platform treasury cannot cover the setup.',
    MAX_LEVEL: 'That track already reaches every title.',
    INSUFFICIENT_ENERGY: 'Not enough energy left. More comes next week, or from the Store.',
};

export interface StreamingLocalizationActionResult {
    player: Player;
    changed: boolean;
    reason?: StreamingLocalizationRefusal;
    /** energy this action put in */
    contributed?: number;
    /** the level this action reached */
    completed?: { packageId: string; track: StreamingLocalizationTrack; level: 1 | 2 | 3 };
}

export const streamingLocalizationRegionName = (packageId: string): string => (
    STREAMING_LOCALIZATION_REGION_META[packageId]?.name
    || STREAMING_LANGUAGE_PACKAGES.find(item => item.id === packageId)?.name
    || packageId
);

export const streamingLocalizationLevelName = (track: StreamingLocalizationTrack, level: number): string => (
    `${track === 'SUBTITLES' ? 'Subtitles' : 'Dubbing'} ${level}`
);

const refuse = (player: Player, reason: StreamingLocalizationRefusal): StreamingLocalizationActionResult => (
    { player, changed: false, reason }
);

/** Sets a region up: its languages reach the service, ready for subtitles and dubbing. */
export const unlockStreamingLocalizationRegion = (player: Player, packageId: string): StreamingLocalizationActionResult => {
    const result = activateStreamingLanguagePackage(player, packageId, { requireFoundation: false });
    if (result.changed) return { player: result.player, changed: true };
    return refuse(player, result.reason === 'ALREADY_ACTIVE' ? 'ALREADY_OPEN'
        : result.reason === 'INSUFFICIENT_TREASURY' ? 'INSUFFICIENT_TREASURY' : 'UNKNOWN_REGION');
};

/** What the region looked like at the last processed week: the "since" baseline. */
const milestoneFor = (
    player: Player,
    packageId: string,
    track: StreamingLocalizationTrack,
    level: 1 | 2 | 3,
    absoluteWeek: number,
): OwnedStreamingLocalizationMilestone => {
    const snapshot = player.world?.worldStreamingViewing?.snapshots?.at(-1);
    return {
        track,
        level,
        completedAtAbsoluteWeek: absoluteWeek,
        baselineAbsoluteWeek: snapshot ? snapshot.absoluteWeek : null,
        baselineSubscribers: measureStreamingLocalizationRegion(player, packageId).subscribers,
        baselineLocalizedViewers: Math.max(0, Math.round(snapshot?.localization?.byPackage?.[packageId]?.localized || 0)),
        baselineAddedViewers: Math.max(0, Math.round(snapshot?.localization?.byPackage?.[packageId]?.added || 0)),
    };
};

const withLedger = (platform: OwnedStreamingPlatformState, entry: OwnedStreamingLedgerEntry): OwnedStreamingLedgerEntry[] => (
    platform.eventLedger.some(item => item.idempotencyKey === entry.idempotencyKey)
        ? platform.eventLedger
        : [...platform.eventLedger, entry]
);

/**
 * Puts energy toward a track's next level: `amount` (a press is 5) or 'FILL'
 * for the rest. A press needs its whole amount; FILL puts in what there is.
 * The level is reached the moment the bar is full and applies from the next
 * week.
 */
export const contributeStreamingLocalizationEnergy = (
    player: Player,
    packageId: string,
    track: StreamingLocalizationTrack,
    amount: number | 'FILL',
): StreamingLocalizationActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const effective = resolveStreamingLocalizationRegions(platform).find(region => region.packageId === packageId);
    if (!effective) return refuse(player, 'UNKNOWN_REGION');
    if (!effective.unlocked) return refuse(player, 'REGION_LOCKED');
    const currentLevel = track === 'SUBTITLES' ? effective.subtitleLevel : effective.dubbingLevel;
    const needed = getStreamingLocalizationLevelEnergy(track, currentLevel + 1);
    if (needed === null) return refuse(player, 'MAX_LEVEL');
    const progress = track === 'SUBTITLES' ? effective.subtitleProgress : effective.dubbingProgress;
    const remaining = Math.max(1, needed - progress);
    const available = Math.max(0, Math.floor(Number(player.energy?.current) || 0));
    const wanted = amount === 'FILL' ? remaining : Math.min(remaining, Math.max(0, Math.round(amount)));
    const put = Math.min(wanted, available);
    if (put <= 0 || (amount !== 'FILL' && put < wanted)) return refuse(player, 'INSUFFICIENT_ENERGY');

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const regions = platform.localizationOperations.regions || [];
    const stored = regions.find(region => region.packageId === packageId);
    const base: OwnedStreamingLocalizationRegion = stored
        ? { ...stored, subtitleLevel: effective.subtitleLevel, dubbingLevel: effective.dubbingLevel }
        : { packageId, subtitleLevel: effective.subtitleLevel, dubbingLevel: effective.dubbingLevel, subtitleProgress: 0, dubbingProgress: 0, milestones: [] };
    const reached = progress + put >= needed;
    const nextLevel = (currentLevel + 1) as 1 | 2 | 3;
    const label = `${streamingLocalizationRegionName(packageId)} · ${streamingLocalizationLevelName(track, nextLevel)}`;
    let updated: OwnedStreamingLocalizationRegion;
    let eventLedger = platform.eventLedger;
    if (!reached) {
        updated = track === 'SUBTITLES' ? { ...base, subtitleProgress: progress + put } : { ...base, dubbingProgress: progress + put };
    } else {
        const milestone = milestoneFor(player, packageId, track, nextLevel, absoluteWeek);
        updated = {
            ...base,
            ...(track === 'SUBTITLES' ? { subtitleLevel: nextLevel, subtitleProgress: 0 } : { dubbingLevel: nextLevel, dubbingProgress: 0 }),
            milestones: [...base.milestones.filter(row => !(row.track === track && row.level === nextLevel)), milestone].slice(-6),
        };
        const key = `streaming-localization-level:${packageId}:${track}:${nextLevel}:done`;
        eventLedger = withLedger(platform, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek,
            type: 'TITLE_LOCALIZATION_READY',
            summary: `${label}: ${track === 'SUBTITLES' ? 'subtitles' : 'dubbing'} now reach ${STREAMING_LOCALIZATION_LEVEL_REACH[nextLevel].detail}, from next week.`,
            source: 'PLAYER_ACTION',
            metadata: { kind: 'LOCALIZATION_LEVEL_COMPLETED', packageId, track, level: nextLevel, energy: needed },
        });
    }
    const order = STREAMING_LANGUAGE_PACKAGES.map(definition => definition.id);
    const nextRegions = [...regions.filter(region => region.packageId !== packageId), updated]
        .sort((left, right) => order.indexOf(left.packageId) - order.indexOf(right.packageId));
    const nextPlatform: OwnedStreamingPlatformState = {
        ...platform,
        localizationOperations: { ...platform.localizationOperations, regions: nextRegions },
        eventLedger,
        launchProgram: reached
            ? { ...platform.launchProgram, configurationRevision: platform.launchProgram.configurationRevision + 1 }
            : platform.launchProgram,
    };
    const nextPlayer: Player = {
        ...player,
        energy: { ...player.energy },
        flags: { ...player.flags },
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(nextPlatform, player.id),
    };
    spendPlayerEnergy(nextPlayer, put, `Localization: ${label}`);
    return {
        player: nextPlayer,
        changed: true,
        contributed: put,
        completed: reached ? { packageId, track, level: nextLevel } : undefined,
    };
};
