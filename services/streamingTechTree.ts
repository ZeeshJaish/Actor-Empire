/**
 * Platform tech tree: the player's two actions (Platform room · Tech).
 *
 *   unlock a tech    cash once, from the platform treasury; it arrives at version 1
 *   add energy       to its next version, +5 a press (or the rest at once); energy put in
 *                    is kept, and never needs money
 *   pay to complete  a full bar's price from the treasury (#84): the version is reached
 *
 * Both add the step's tech debt (Picture, HDR, Colour and Sound: pushing quality fast);
 * Stabilization pays it down at the weekly close.
 *
 * The same shape as localization (streamingLocalizationResearch.ts). Each action returns
 * a new player and nothing here saves. Energy is spent with `spendPlayerEnergy` (this
 * week's first, then the bank). The plan is codex-handoff/plans/platform-tech-plan.md.
 */
import { streamingPlusLocks } from './streamingPlusPack';
import type {
    OwnedStreamingCostCommitment,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingTechProgress,
    OwnedStreamingTechTreeState,
    Player,
    StreamingTechId,
    StreamingTechVersion,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import {
    addStreamingTechDebt,
    applyStreamingTechBridge,
    getStreamingTechDefinition,
    getStreamingTechGroup,
    getStreamingTechMissingRequirements,
    resolveStreamingTechTree,
    streamingTechDebtFor,
    streamingTechNextVersionEnergy,
    streamingTechVersion,
    streamingTechVersionCost,
    type StreamingTechDefinition,
} from './streamingTechTreeCatalogue';

export type StreamingTechRefusal =
    | 'NOT_FOUNDED'
    | 'UNKNOWN_TECH'
    | 'ALREADY_UNLOCKED'
    | 'NEEDS_EARLIER_TECH'
    | 'INSUFFICIENT_TREASURY'
    | 'LOCKED'
    | 'MAX_VERSION'
    | 'INSUFFICIENT_ENERGY'
    | 'ENERGY_FULL'
    | 'ENERGY_NOT_FULL'
    | 'STREAMING_PLUS';

export const STREAMING_TECH_REFUSAL_COPY: Record<StreamingTechRefusal, string> = {
    STREAMING_PLUS: 'This Tech step is part of the Streaming+ Pack.',
    NOT_FOUNDED: 'Found your platform first.',
    UNKNOWN_TECH: 'That tech is not available.',
    ALREADY_UNLOCKED: 'That tech is already unlocked.',
    NEEDS_EARLIER_TECH: 'Unlock the step before it first.',
    INSUFFICIENT_TREASURY: 'The platform treasury cannot cover it.',
    LOCKED: 'Unlock this tech first.',
    MAX_VERSION: 'That tech is already at version 3.',
    INSUFFICIENT_ENERGY: 'Not enough energy left. More comes next week, or from the Store.',
    ENERGY_FULL: 'Its energy is full. Pay its price to complete the version.',
    ENERGY_NOT_FULL: 'Fill its energy first.',
};

export interface StreamingTechActionResult {
    player: Player;
    changed: boolean;
    reason?: StreamingTechRefusal;
    /** the tech still missing when the reason is NEEDS_EARLIER_TECH */
    missing?: string;
    /** energy this action put in */
    contributed?: number;
    /** the tech this action unlocked */
    unlocked?: StreamingTechId;
    /** the version this action reached */
    completed?: { techId: StreamingTechId; version: StreamingTechVersion };
    /** the energy is full and the version waits for its price (#84) */
    ready?: boolean;
}

const refuse = (player: Player, reason: StreamingTechRefusal, missing?: string): StreamingTechActionResult => (
    { player, changed: false, reason, missing }
);

/** Tech can be bought once the platform is founded: before launch too, so plans can offer it on day one. */
const founded = (platform: OwnedStreamingPlatformState): boolean => (
    Boolean(platform.identity) && (platform.lifecycle === 'FOUNDING' || platform.lifecycle === 'ACTIVE')
);

const withLedger = (platform: OwnedStreamingPlatformState, entry: OwnedStreamingLedgerEntry): OwnedStreamingLedgerEntry[] => (
    platform.eventLedger.some(item => item.idempotencyKey === entry.idempotencyKey)
        ? platform.eventLedger
        : [...platform.eventLedger, entry]
);

/** The name a version goes by in its group: "4K · Sharp". */
export const streamingTechVersionLabel = (techId: StreamingTechId, version: StreamingTechVersion): string => {
    const definition = getStreamingTechDefinition(techId);
    if (!definition) return techId;
    return `${definition.name} · ${getStreamingTechGroup(definition.group).versionNames[version - 1]}`;
};

const playerWith = (player: Player, platform: OwnedStreamingPlatformState): Player => ({
    ...player,
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platform, player.id),
});

/** Unlocks a tech with treasury cash: it arrives at version 1, its upkeep starts and its debt is added. */
export const unlockStreamingTech = (player: Player, techId: StreamingTechId): StreamingTechActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!founded(platform)) return refuse(player, 'NOT_FOUNDED');
    const definition = getStreamingTechDefinition(techId);
    if (!definition) return refuse(player, 'UNKNOWN_TECH');
    const tree = resolveStreamingTechTree(platform);
    if (streamingTechVersion(tree, techId) >= 1) return refuse(player, 'ALREADY_UNLOCKED');
    /* Streaming+ (2026-11-08): the pack's 10 steps unlock only with the pack; a step a save already has keeps growing */
    if (streamingPlusLocks(player, { kind: 'TECH', id: techId })) return refuse(player, 'STREAMING_PLUS');
    const missing = getStreamingTechMissingRequirements(tree, definition);
    if (missing.length) return refuse(player, 'NEEDS_EARLIER_TECH', missing.map(item => item.name).join(' and '));
    if (platform.treasuryCash < definition.unlockCost) return refuse(player, 'INSUFFICIENT_TREASURY');

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `streaming-tech-unlock:${techId.toLowerCase()}`;
    const debt = streamingTechDebtFor(definition, 1);
    const nextTree: OwnedStreamingTechTreeState = addStreamingTechDebt({
        ...tree,
        techs: { ...tree.techs, [techId]: { version: 1, progress: 0, unlockedAtAbsoluteWeek: absoluteWeek, versionReachedAtAbsoluteWeek: absoluteWeek } },
    }, debt);
    const commitment: OwnedStreamingCostCommitment = {
        id: createDeterministicId('streaming_cost', platform.simulationSeed, key),
        idempotencyKey: key,
        category: 'TECHNOLOGY',
        label: definition.name,
        status: 'PAID',
        plannedAmount: definition.unlockCost,
        committedAmount: definition.unlockCost,
        paidAmount: definition.unlockCost,
        weeklyAmount: definition.weeklyUpkeep,
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: absoluteWeek,
        sourceReferenceId: `tech-tree:${techId}`,
    };
    const nextPlatform: OwnedStreamingPlatformState = {
        ...platform,
        treasuryCash: platform.treasuryCash - definition.unlockCost,
        techTree: nextTree,
        technologyLevels: applyStreamingTechBridge(platform.technologyLevels, nextTree),
        costCommitments: platform.costCommitments.some(item => item.idempotencyKey === key)
            ? platform.costCommitments
            : [...platform.costCommitments, commitment],
        // TECHNOLOGY_PROJECT_STARTED with capitalCost shows in the Finance room as "Technology program funded".
        eventLedger: withLedger(platform, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek,
            type: 'TECHNOLOGY_PROJECT_STARTED',
            summary: `${definition.name} unlocked: viewers see it from next week.`,
            source: 'PLAYER_ACTION',
            metadata: { kind: 'TECH_UNLOCKED', techId, capitalCost: definition.unlockCost, weeklyOperatingCost: definition.weeklyUpkeep, techDebt: debt },
        }),
        launchProgram: { ...platform.launchProgram, configurationRevision: platform.launchProgram.configurationRevision + 1 },
    };
    return { player: playerWith(player, nextPlatform), changed: true, unlocked: techId };
};

/** A version reached: the tree one version up (its energy cleared, its debt added), its price paid from the treasury (a
 *  PAID technology commitment), the ledger, the engine levels and the launch program's revision. */
const reachStreamingTechVersion = (
    platform: OwnedStreamingPlatformState,
    tree: OwnedStreamingTechTreeState,
    definition: StreamingTechDefinition,
    current: OwnedStreamingTechProgress,
    needed: number,
    absoluteWeek: number,
): OwnedStreamingPlatformState => {
    const techId = definition.id as StreamingTechId;
    const nextVersion = (current.version + 1) as StreamingTechVersion;
    const cost = streamingTechVersionCost(definition, nextVersion);
    const debt = streamingTechDebtFor(definition, nextVersion);
    const nextTree: OwnedStreamingTechTreeState = addStreamingTechDebt({
        ...tree,
        techs: { ...tree.techs, [techId]: { ...current, version: nextVersion, progress: 0, versionReachedAtAbsoluteWeek: absoluteWeek } },
    }, debt);
    const label = streamingTechVersionLabel(techId, nextVersion);
    const key = `streaming-tech-version:${techId.toLowerCase()}:${nextVersion}`;
    const commitment: OwnedStreamingCostCommitment = {
        id: createDeterministicId('streaming_cost', platform.simulationSeed, key),
        idempotencyKey: key,
        category: 'TECHNOLOGY',
        label,
        status: 'PAID',
        plannedAmount: cost,
        committedAmount: cost,
        paidAmount: cost,
        weeklyAmount: 0,
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: absoluteWeek,
        sourceReferenceId: `tech-tree:${techId}:v${nextVersion}`,
    };
    return {
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        costCommitments: cost <= 0 || platform.costCommitments.some(item => item.idempotencyKey === key)
            ? platform.costCommitments
            : [...platform.costCommitments, commitment],
        techTree: nextTree,
        technologyLevels: applyStreamingTechBridge(platform.technologyLevels, nextTree),
        eventLedger: withLedger(platform, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek,
            type: 'TECHNOLOGY_PROJECT_COMPLETED',
            summary: `${label} reached (version ${nextVersion}): viewers see it from next week.`,
            source: 'PLAYER_ACTION',
            metadata: { kind: 'TECH_VERSION_REACHED', techId, version: nextVersion, energy: needed, capitalCost: cost, techDebt: debt },
        }),
        launchProgram: { ...platform.launchProgram, configurationRevision: platform.launchProgram.configurationRevision + 1 },
    };
};

/**
 * Puts energy toward a tech's next version: `amount` (a press is 5) or 'FILL' for the rest. A press needs its whole
 * amount; FILL puts in what there is. Energy never needs money (#84): a full bar waits for its price
 * (`completeStreamingTechVersion`), and a version with no price is reached as its bar fills.
 */
export const contributeStreamingTechEnergy = (
    player: Player,
    techId: StreamingTechId,
    amount: number | 'FILL',
): StreamingTechActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!founded(platform)) return refuse(player, 'NOT_FOUNDED');
    const definition = getStreamingTechDefinition(techId);
    if (!definition) return refuse(player, 'UNKNOWN_TECH');
    const tree = resolveStreamingTechTree(platform);
    const current = tree.techs[techId];
    if (!current) return refuse(player, 'LOCKED');
    const needed = streamingTechNextVersionEnergy(definition, current.version);
    if (needed === null) return refuse(player, 'MAX_VERSION');
    const nextVersion = (current.version + 1) as StreamingTechVersion;
    const priced = streamingTechVersionCost(definition, nextVersion) > 0;
    if (priced && current.progress >= needed) return refuse(player, 'ENERGY_FULL');
    const remaining = Math.max(1, needed - current.progress);
    const available = Math.max(0, Math.floor(Number(player.energy?.current) || 0));
    const wanted = amount === 'FILL' ? remaining : Math.min(remaining, Math.max(0, Math.round(amount)));
    const put = Math.min(wanted, available);
    if (put <= 0 || (amount !== 'FILL' && put < wanted)) return refuse(player, 'INSUFFICIENT_ENERGY');

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const full = current.progress + put >= needed;
    const reached = full && !priced;
    const nextPlatform: OwnedStreamingPlatformState = reached
        ? reachStreamingTechVersion(platform, tree, definition, current, needed, absoluteWeek)
        : { ...platform, techTree: { ...tree, techs: { ...tree.techs, [techId]: { ...current, progress: Math.min(needed, current.progress + put) } } } };
    const nextPlayer: Player = {
        ...player,
        energy: { ...player.energy },
        flags: { ...player.flags },
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(nextPlatform, player.id),
    };
    spendPlayerEnergy(nextPlayer, put, `Tech: ${streamingTechVersionLabel(techId, nextVersion)}`);
    return {
        player: nextPlayer,
        changed: true,
        contributed: put,
        ready: full && priced,
        completed: reached ? { techId, version: nextVersion } : undefined,
    };
};

/**
 * Pays a full bar's price and reaches the version (#84; Zeesh: "pay 126 million to complete this level"). Refused until
 * the bar is full, and while the treasury cannot cover the price: then nothing changes.
 */
export const completeStreamingTechVersion = (player: Player, techId: StreamingTechId): StreamingTechActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!founded(platform)) return refuse(player, 'NOT_FOUNDED');
    const definition = getStreamingTechDefinition(techId);
    if (!definition) return refuse(player, 'UNKNOWN_TECH');
    const tree = resolveStreamingTechTree(platform);
    const current = tree.techs[techId];
    if (!current) return refuse(player, 'LOCKED');
    const needed = streamingTechNextVersionEnergy(definition, current.version);
    if (needed === null) return refuse(player, 'MAX_VERSION');
    if (current.progress < needed) return refuse(player, 'ENERGY_NOT_FULL');
    const nextVersion = (current.version + 1) as StreamingTechVersion;
    if (platform.treasuryCash < streamingTechVersionCost(definition, nextVersion)) return refuse(player, 'INSUFFICIENT_TREASURY');
    const nextPlatform = reachStreamingTechVersion(platform, tree, definition, current, needed, getAbsoluteWeek(player.age, player.currentWeek));
    return { player: playerWith(player, nextPlatform), changed: true, completed: { techId, version: nextVersion } };
};
