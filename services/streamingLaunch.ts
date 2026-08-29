import type {
    OwnedStreamingLaunchCommit,
    OwnedStreamingLedgerEntry,
    Player,
    StreamingHqSection,
    StreamingLaunchCapacityPlan,
    StreamingLaunchOutcomeTier,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
    transitionOwnedStreamingLifecycle,
} from './ownedStreamingPlatform';
import { getStreamingCatalogLicenseStatus } from './streamingCatalog';
import { getStreamingOriginalLiveStatus } from './streamingOriginals';
import { resolveOwnedStreamingReach } from './streamingProgression';
import { getStreamingLaunchDefinitionSignature } from './streamingLaunchProgram';

export type StreamingLaunchReadinessTone = 'READY' | 'WATCH' | 'BLOCKED';

export interface StreamingLaunchReadinessItem {
    id: string;
    label: string;
    detail: string;
    tone: StreamingLaunchReadinessTone;
    destination: StreamingHqSection;
}

export interface StreamingLaunchDemandRegion {
    id: string;
    label: string;
    demandSharePercent: number;
    intensity: 'CORE' | 'STRONG' | 'EMERGING';
}

export interface StreamingLaunchCapacityOption {
    id: StreamingLaunchCapacityPlan;
    title: string;
    kicker: string;
    description: string;
    cost: number;
    protectedPeakConcurrentStreams: number;
    effectiveLikelyConcurrentStreams: number;
    effectiveHighConcurrentStreams: number;
    headroomPercent: number;
    canAfford: boolean;
    consequence: string;
}

export interface StreamingLaunchReadiness {
    canLaunch: boolean;
    score: number;
    blockerCount: number;
    warningCount: number;
    absoluteWeek: number;
    reachLabel: string;
    items: StreamingLaunchReadinessItem[];
    forecastLikelyConcurrentStreams: number;
    forecastHighConcurrentStreams: number;
    demandRegions: StreamingLaunchDemandRegion[];
    capacityOptions: StreamingLaunchCapacityOption[];
    openingOriginalTitle: string;
    openingTitleCount: number;
    weeklyOperatingCost: number;
    runwayWeeks: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundCapacity = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 10_000) * 10_000);

const createItem = (
    id: string,
    label: string,
    detail: string,
    tone: StreamingLaunchReadinessTone,
    destination: StreamingHqSection,
): StreamingLaunchReadinessItem => ({ id, label, detail, tone, destination });

const getCapacityOption = (
    id: StreamingLaunchCapacityPlan,
    baseBurst: number,
    likely: number,
    high: number,
    weeklyOperatingCost: number,
    treasuryCash: number,
): StreamingLaunchCapacityOption => {
    const cost = id === 'CLOUD_BURST'
        ? roundMoney(Math.max(500_000, weeklyOperatingCost * 2))
        : id === 'STAGGERED_PREMIERE'
            ? roundMoney(Math.max(120_000, weeklyOperatingCost * 0.35))
            : 0;
    const protectedPeakConcurrentStreams = roundCapacity(
        id === 'CLOUD_BURST' ? baseBurst * 1.75 : baseBurst,
    );
    const demandMultiplier = id === 'STAGGERED_PREMIERE' ? 0.68 : 1;
    const effectiveLikelyConcurrentStreams = roundCapacity(likely * demandMultiplier);
    const effectiveHighConcurrentStreams = roundCapacity(high * demandMultiplier);
    const headroomPercent = effectiveHighConcurrentStreams > 0
        ? Math.round(((protectedPeakConcurrentStreams - effectiveHighConcurrentStreams) / effectiveHighConcurrentStreams) * 100)
        : 100;
    if (id === 'CLOUD_BURST') return {
        id,
        title: 'Reserve cloud burst',
        kicker: 'PROTECT THE MOMENT',
        description: 'Rent a launch-night overflow layer without permanently replacing your owned stack.',
        cost,
        protectedPeakConcurrentStreams,
        effectiveLikelyConcurrentStreams,
        effectiveHighConcurrentStreams,
        headroomPercent,
        canAfford: treasuryCash >= cost,
        consequence: 'Highest protection • temporary company-treasury cost',
    };
    if (id === 'STAGGERED_PREMIERE') return {
        id,
        title: 'Stagger the premiere',
        kicker: 'CONTROL THE WAVE',
        description: 'Open access in timed waves and protect playback by flattening the peak.',
        cost,
        protectedPeakConcurrentStreams,
        effectiveLikelyConcurrentStreams,
        effectiveHighConcurrentStreams,
        headroomPercent,
        canAfford: treasuryCash >= cost,
        consequence: 'Lower peak risk • 8% fewer opening-night conversions',
    };
    return {
        id,
        title: 'Open the gates',
        kicker: 'TRUST THE STACK',
        description: 'Launch at full demand using the infrastructure already commissioned.',
        cost,
        protectedPeakConcurrentStreams,
        effectiveLikelyConcurrentStreams,
        effectiveHighConcurrentStreams,
        headroomPercent,
        canAfford: true,
        consequence: headroomPercent >= 10 ? 'No extra cost • capacity has breathing room' : 'No extra cost • outage risk remains',
    };
};

export const getStreamingLaunchReadiness = (player: Player): StreamingLaunchReadiness => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const reach = resolveOwnedStreamingReach(platform);
    const setup = platform.infrastructureSetup;
    const slate = platform.launchSlate;
    const items: StreamingLaunchReadinessItem[] = [];
    const openingMarkets = platform.marketOperations.filter(operation => operation.entryKind === 'OPENING' && operation.status !== 'EXITED');
    const openingMarketsReady = openingMarkets.length > 0 && openingMarkets.every(operation => ['READY', 'ACTIVE'].includes(operation.status));
    const definitionReady = Boolean(
        platform.launchProgram.lastBlueprintSignature
        && platform.launchProgram.lastBlueprintSignature === getStreamingLaunchDefinitionSignature(player),
    );

    items.push(createItem(
        'company',
        'Company command',
        platform.lifecycle === 'FOUNDING'
            ? 'Founder authority and company records are ready.'
            : platform.lifecycle === 'ACTIVE'
                ? 'The platform is already live.'
                : 'Return the company to a launchable founding state.',
        platform.lifecycle === 'FOUNDING' ? 'READY' : 'BLOCKED',
        'COMPANY',
    ));

    items.push(createItem(
        'markets',
        'Opening markets',
        openingMarketsReady
            ? `${openingMarkets.length} opening countr${openingMarkets.length === 1 ? 'y is' : 'ies are'} cleared.`
            : openingMarkets.length
                ? 'Government clearance is still running in one or more opening countries.'
                : 'No opening countries have been selected.',
        openingMarketsReady ? 'READY' : 'BLOCKED',
        'MARKET',
    ));

    items.push(createItem(
        'launch-definition',
        'Launch blueprint',
        definitionReady
            ? 'Markets, service identity, storefront, pricing and content match the saved blueprint.'
            : 'Save or refresh the Launch Blueprint before final rehearsal.',
        definitionReady ? 'READY' : 'BLOCKED',
        'HOME',
    ));

    if (!setup) {
        items.push(createItem('network', 'Delivery network', 'No committed server configuration exists.', 'BLOCKED', 'TECH'));
    } else if (absoluteWeek < setup.readyAtAbsoluteWeek) {
        const weeks = setup.readyAtAbsoluteWeek - absoluteWeek;
        items.push(createItem('network', 'Delivery network', `${weeks} week${weeks === 1 ? '' : 's'} remain before the commissioned stack is operational.`, 'BLOCKED', 'TECH'));
    } else {
        items.push(createItem(
            'network',
            'Delivery network',
            `${setup.loadTest.status} load test • ${platform.capacity.burstConcurrentStreams.toLocaleString()} protected burst streams.`,
            setup.loadTest.status === 'PASS' ? 'READY' : 'WATCH',
            'TECH',
        ));
    }

    if (!slate) {
        items.push(createItem('slate', 'Opening slate', 'The twelve-week launch calendar is not locked.', 'BLOCKED', 'CONTENT'));
    } else if (slate.entries.length < 3) {
        items.push(createItem('slate', 'Opening slate', 'At least three canonical titles are required.', 'BLOCKED', 'CONTENT'));
    } else {
        items.push(createItem('slate', 'Opening slate', `${slate.entries.length} canonical titles programmed across twelve weeks.`, 'READY', 'CONTENT'));
    }

    const originalEntry = slate?.entries.find(entry => entry.source === 'ORIGINAL');
    const original = originalEntry
        ? platform.originalCommissions.find(commission => commission.canonicalProjectId === originalEntry.projectId)
        : undefined;
    const originalStatus = original ? getStreamingOriginalLiveStatus(player, original) : null;
    const originalReady = originalStatus === 'DELIVERED' || originalStatus === 'RELEASED';
    items.push(createItem(
        'original',
        'Original delivery',
        originalReady
            ? `${original?.title} has a final deliverable ready for the opening window.`
            : original
                ? `${original.title} is ${String(originalStatus).toLowerCase().replace(/_/g, ' ')}. Finish production before premiere night.`
                : 'The locked slate does not contain a canonical platform Original.',
        originalReady ? 'READY' : 'BLOCKED',
        'CONTENT',
    ));

    const licensedEntries = slate?.entries.filter(entry => entry.source === 'LICENSED_WINDOW') || [];
    const invalidLicensedEntries = licensedEntries.filter(entry => {
        const launchAbsoluteWeek = absoluteWeek + entry.launchWeek - 1;
        const license = platform.catalogLicenses.find(candidate => candidate.sourceProjectId === entry.projectId);
        return !license || getStreamingCatalogLicenseStatus(license, launchAbsoluteWeek) !== 'ACTIVE';
    });
    items.push(createItem(
        'rights',
        'Rights windows',
        invalidLicensedEntries.length
            ? `${invalidLicensedEntries.length} programmed title${invalidLicensedEntries.length === 1 ? '' : 's'} will not have active rights in its release week.`
            : `${licensedEntries.length || 'No'} licensed window${licensedEntries.length === 1 ? '' : 's'} verified against the calendar.`,
        invalidLicensedEntries.length ? 'BLOCKED' : 'READY',
        'CONTENT',
    ));

    const weeklyOperatingCost = setup?.weeklyOperatingCost || 0;
    const runwayWeeks = weeklyOperatingCost > 0 ? platform.treasuryCash / weeklyOperatingCost : 0;
    items.push(createItem(
        'runway',
        'Operating runway',
        weeklyOperatingCost
            ? `${Math.floor(runwayWeeks)} weeks of current network operating cost held in treasury.`
            : 'Runway becomes measurable after infrastructure is committed.',
        weeklyOperatingCost && runwayWeeks >= 8 ? 'READY' : 'WATCH',
        'COMPANY',
    ));

    const slateBoost = slate
        ? 1
            + Math.min(0.12, Math.max(0, slate.entries.length - 3) * 0.025)
            + (slate.entries.some(entry => entry.projectType === 'SERIES') ? 0.06 : 0)
            + (originalEntry?.marketingPlan === 'EVENT' ? 0.12 : 0)
        : 1;
    const forecastLikelyConcurrentStreams = roundCapacity(reach.demandRange.likely * slateBoost);
    const forecastHighConcurrentStreams = roundCapacity(reach.demandRange.high * (slateBoost + 0.08));
    const baseBurst = platform.capacity.burstConcurrentStreams;
    const capacityOptions: StreamingLaunchCapacityOption[] = ([
        'STANDARD',
        'CLOUD_BURST',
        'STAGGERED_PREMIERE',
    ] as StreamingLaunchCapacityPlan[]).map(id => getCapacityOption(
        id,
        baseBurst,
        forecastLikelyConcurrentStreams,
        forecastHighConcurrentStreams,
        weeklyOperatingCost,
        platform.treasuryCash,
    ));

    const standard = capacityOptions[0];
    items.push(createItem(
        'peak',
        'Premiere peak',
        `${forecastHighConcurrentStreams.toLocaleString()} high-case streams against ${baseBurst.toLocaleString()} burst capacity.`,
        standard.headroomPercent >= 10 ? 'READY' : 'WATCH',
        'TECH',
    ));

    const blockerCount = items.filter(item => item.tone === 'BLOCKED').length;
    const warningCount = items.filter(item => item.tone === 'WATCH').length;
    const score = clamp(Math.round(100 - blockerCount * 19 - warningCount * 7), 0, 100);
    const regionCount = clamp(reach.level + 1, 1, 5);
    const regionLabels = ['Home market', 'Growth corridor', 'Metro belt', 'International hubs', 'Global long tail'];
    const weights = [42, 24, 16, 11, 7].slice(0, regionCount);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    const demandRegions = weights.map((weight, index) => ({
        id: `region-${index + 1}`,
        label: regionLabels[index],
        demandSharePercent: Math.round((weight / weightTotal) * 100),
        intensity: index === 0 ? 'CORE' as const : index <= 2 ? 'STRONG' as const : 'EMERGING' as const,
    }));

    return {
        canLaunch: blockerCount === 0,
        score,
        blockerCount,
        warningCount,
        absoluteWeek,
        reachLabel: reach.label,
        items,
        forecastLikelyConcurrentStreams,
        forecastHighConcurrentStreams,
        demandRegions,
        capacityOptions,
        openingOriginalTitle: original?.title || 'First Original',
        openingTitleCount: slate?.entries.length || 0,
        weeklyOperatingCost,
        runwayWeeks,
    };
};

export const commitOwnedStreamingLaunch = (
    player: Player,
    capacityPlan: StreamingLaunchCapacityPlan,
): {
    player: Player;
    changed: boolean;
    reason?: 'ALREADY_LIVE' | 'BLOCKED' | 'INSUFFICIENT_TREASURY' | 'INVALID_PLAN';
    launchCommit?: OwnedStreamingLaunchCommit;
} => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.launchCommit || platform.lifecycle === 'ACTIVE') {
        return { player, changed: false, reason: 'ALREADY_LIVE', launchCommit: platform.launchCommit || undefined };
    }
    const readiness = getStreamingLaunchReadiness(player);
    if (!readiness.canLaunch) return { player, changed: false, reason: 'BLOCKED' };
    const option = readiness.capacityOptions.find(candidate => candidate.id === capacityPlan);
    if (!option) return { player, changed: false, reason: 'INVALID_PLAN' };
    if (!option.canAfford || platform.treasuryCash < option.cost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }

    const absoluteWeek = readiness.absoluteWeek;
    const idempotencyKey = `platform-launch:${platform.identity?.slug || player.id}`;
    const pressure = option.effectiveHighConcurrentStreams > 0
        ? option.protectedPeakConcurrentStreams / option.effectiveHighConcurrentStreams
        : 1;
    const playbackSuccessRate = clamp(
        96.8 + pressure * 2.2 + (platform.infrastructureSetup?.reliabilityTarget || 99) * 0.01
            - (platform.infrastructureSetup?.technicalDebt || 0) * 0.035,
        92,
        99.99,
    );
    const outcomeTier: StreamingLaunchOutcomeTier = playbackSuccessRate >= 99
        ? 'SMOOTH_OPENING'
        : playbackSuccessRate >= 97
            ? 'PRESSURED_OPENING'
            : 'DEGRADED_OPENING';
    const conversionMultiplier = capacityPlan === 'STAGGERED_PREMIERE' ? 0.92 : 1;
    const initialSubscribers = Math.max(1, Math.round(
        option.effectiveLikelyConcurrentStreams
        * (2.45 + readiness.score / 100)
        * conversionMultiplier,
    ));
    const openingDemandIndex = clamp(Math.round(
        48
        + readiness.openingTitleCount * 4
        + (readiness.reachLabel.includes('Global') ? 12 : readiness.reachLabel.includes('National') ? 8 : 4)
        + (outcomeTier === 'SMOOTH_OPENING' ? 8 : outcomeTier === 'DEGRADED_OPENING' ? -7 : 2),
    ), 0, 100);
    const launchCommit: OwnedStreamingLaunchCommit = {
        id: createDeterministicId('streaming_launch', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        committedAtAbsoluteWeek: absoluteWeek,
        capacityPlan,
        capacityPlanCost: option.cost,
        readinessScore: readiness.score,
        forecastLikelyConcurrentStreams: readiness.forecastLikelyConcurrentStreams,
        forecastHighConcurrentStreams: readiness.forecastHighConcurrentStreams,
        protectedPeakConcurrentStreams: option.protectedPeakConcurrentStreams,
        launchHeadroomPercent: option.headroomPercent,
        initialSubscribers,
        openingDemandIndex,
        playbackSuccessRate: Math.round(playbackSuccessRate * 100) / 100,
        outcomeTier,
        openingTitleCount: readiness.openingTitleCount,
        openingOriginalTitle: readiness.openingOriginalTitle,
    };
    const launchLedger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'LAUNCH_COMMITTED',
        summary: `${platform.identity?.name || 'The platform'} launched with ${readiness.openingOriginalTitle} leading a ${readiness.openingTitleCount}-title slate.`,
        source: 'PLAYER_ACTION',
        metadata: {
            capacityPlan,
            capacityPlanCost: option.cost,
            initialSubscribers,
            playbackSuccessRate: launchCommit.playbackSuccessRate,
            outcomeTier,
        },
    };
    const weightedArpu = (
        platform.subscriptionPrices.BASIC * 0.48
        + platform.subscriptionPrices.PREMIUM * 0.34
        + platform.subscriptionPrices.FAMILY * 0.18
    );
    const withLaunchFacts = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchCommit,
        launchProgram: {
            ...platform.launchProgram,
            status: 'LAUNCHED',
            completedAtAbsoluteWeek: absoluteWeek,
        },
        marketOperations: platform.marketOperations.map(operation => (
            operation.entryKind === 'OPENING' && operation.status === 'READY'
                ? { ...operation, status: 'ACTIVE' as const, activatedAtAbsoluteWeek: absoluteWeek }
                : operation
        )),
        treasuryCash: platform.treasuryCash - option.cost,
        metrics: {
            ...platform.metrics,
            subscribers: initialSubscribers,
            netSubscriberMovement: initialSubscribers,
            averageRevenuePerUser: Math.round(weightedArpu * 100) / 100,
            cashRunwayWeeks: readiness.weeklyOperatingCost > 0
                ? Math.max(0, (platform.treasuryCash - option.cost) / readiness.weeklyOperatingCost)
                : 0,
            technologyHealth: Math.round(launchCommit.playbackSuccessRate),
        },
        eventLedger: [...platform.eventLedger, launchLedger],
        milestoneKeys: [...platform.milestoneKeys, 'platform-launch-ready', 'platform-launched'],
    }, player.id);
    const live = transitionOwnedStreamingLifecycle(withLaunchFacts, 'ACTIVE', absoluteWeek, 'PLAYER_ACTION');
    const withCinematic = queueOwnedStreamingCinematic(live, {
        idempotencyKey: `premiere-night:${launchCommit.id}`,
        type: 'LAUNCH_NIGHT',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: absoluteWeek,
        title: `${platform.identity?.name || 'EMPIRE+'} is live`,
        factIds: [launchLedger.id],
    });
    return {
        player: { ...player, ownedStreamingPlatform: withCinematic },
        changed: true,
        launchCommit,
    };
};
