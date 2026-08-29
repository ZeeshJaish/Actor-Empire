import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingWeeklyCausalDriver,
    OwnedStreamingWeeklyDecision,
    OwnedStreamingWeeklySnapshot,
    OwnedStreamingTitleWeekPerformance,
    OwnedStreamingGrowthAttribution,
    Player,
    StreamingWeeklyPlanId,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { getOwnedStreamingProgramEntries } from './streamingOriginals';
import { commitStreamingQuarterSeasonCycle } from './streamingQuarterSeason';
import { evaluateStreamingRightsCompliance } from './streamingRightsMarketplace';
import {
    completeDueStreamingTechnologyProjects,
    getStreamingTechnologyWeeklyCost,
} from './streamingTechnologyCampus';
import {
    completeDueStreamingProductDevelopments,
    getStreamingProductWeeklyEffects,
} from './streamingProductSuite';
import {
    getStreamingGrowthEffects,
    resolveStreamingArtworkTest,
} from './streamingPromotion';
import {
    completeDueStreamingExecutiveDevelopment,
    getStreamingGovernanceWeeklyCost,
} from './streamingLeadershipGovernance';
import {
    commitStreamingCompetitiveWorldWeek,
    getStreamingCompetitiveWeeklyEffects,
} from './streamingCompetitiveWorld';
import { commitPlatformAiExternalCommitment } from './platformAi/platformAiExternalCommitments';
import {
    completeDueStreamingAcquisitionIntegrations,
    getStreamingAcquisitionWeeklyEffects,
} from './streamingAcquisitions';
import { commitStreamingPublicMarketWeek } from './streamingPublicMarkets';
import {
    commitStreamingCrisisSecurityWeek,
    getStreamingCrisisWeeklyEffects,
} from './streamingCrisisSecurity';
import { getStreamingEraWeeklyEffects } from './streamingLegacy';
import { advanceDueStreamingResearchPrograms } from './streamingResearchLifecycle';
import { completeDueStreamingCampusProjects } from './streamingCampusConstruction';
import {
    commitStreamingInfrastructureOperationsWeek,
    getStreamingInfrastructureOperationsEffects,
} from './streamingInfrastructureOperations';
import { commitStreamingInfrastructureProgressionWeek } from './streamingInfrastructureProgression';
import { calculateStreamingMarketOperatingCosts } from './streamingMarkets';
import {
    calculateStreamingPartnerRevenueShareFullCurrency,
    calculateStreamingRunwayFromTrailingCosts,
    calculateStreamingSubscriptionRevenueFullCurrency,
} from './streamingEconomyCore';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

const roundMoney = (value: number): number => Math.max(0, Math.round(value));
const roundRate = (value: number): number => Math.round(value * 10_000) / 10_000;
const roundPercent = (value: number): number => Math.round(value * 100) / 100;
const distributeIntegerTotal = (total: number, weights: number[]): number[] => {
    if (!weights.length) return [];
    const safeTotal = Math.max(0, Math.round(total));
    const weightTotal = Math.max(0.0001, weights.reduce((sum, weight) => sum + Math.max(0, weight), 0));
    const exact = weights.map(weight => safeTotal * Math.max(0, weight) / weightTotal);
    const allocated = exact.map(value => Math.floor(value));
    let remainder = safeTotal - allocated.reduce((sum, value) => sum + value, 0);
    exact
        .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((left, right) => right.fraction - left.fraction || left.index - right.index)
        .forEach(item => {
            if (remainder <= 0) return;
            allocated[item.index] += 1;
            remainder -= 1;
        });
    return allocated;
};

export interface StreamingWeeklyPlanDefinition {
    id: StreamingWeeklyPlanId;
    label: string;
    kicker: string;
    description: string;
    cashCost: number;
    preview: string[];
    risk: string;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    demandMultiplier: number;
    playbackBoost: number;
}

export const STREAMING_WEEKLY_PLANS: StreamingWeeklyPlanDefinition[] = [
    {
        id: 'AUDIENCE_PUSH',
        label: 'Turn up the premiere',
        kicker: 'AUDIENCE GROWTH',
        description: 'Buy a concentrated discovery push around this week’s strongest programming beat.',
        cashCost: 1_200_000,
        preview: ['Faster subscriber acquisition', 'More premiere demand', 'Small cancellation-pressure risk'],
        risk: 'Higher demand can expose a thin delivery stack.',
        acquisitionRateDelta: 0.012,
        churnRateDelta: 0.001,
        engagementRateDelta: 0.01,
        demandMultiplier: 1.08,
        playbackBoost: 0,
    },
    {
        id: 'RELIABILITY_GUARD',
        label: 'Protect every stream',
        kicker: 'NETWORK CONTROL',
        description: 'Reserve operational headroom and put the network team on a higher-support posture.',
        cashCost: 900_000,
        preview: ['Higher playback success', 'Lower cancellation pressure', 'Slower acquisition than a campaign'],
        risk: 'The spend protects trust but creates little direct awareness.',
        acquisitionRateDelta: -0.001,
        churnRateDelta: -0.0005,
        engagementRateDelta: 0.004,
        demandMultiplier: 0.98,
        playbackBoost: 0.7,
    },
    {
        id: 'RETENTION_SPOTLIGHT',
        label: 'Give viewers a next watch',
        kicker: 'RETENTION PROGRAMMING',
        description: 'Reframe the home experience around a returning series and the deepest catalog lane.',
        cashCost: 650_000,
        preview: ['Lower weekly churn', 'Higher engagement', 'Moderate acquisition lift'],
        risk: 'Protects existing members more than it creates an opening-week spike.',
        acquisitionRateDelta: 0.003,
        churnRateDelta: -0.004,
        engagementRateDelta: 0.035,
        demandMultiplier: 1.02,
        playbackBoost: 0.08,
    },
];

export interface StreamingCeoBriefItem {
    label: string;
    title: string;
    detail: string;
    tone: 'POSITIVE' | 'WATCH' | 'CRITICAL' | 'NEUTRAL';
}

export interface StreamingWeeklyCeoLoop {
    available: boolean;
    absoluteWeek: number;
    targetAbsoluteWeek: number;
    programWeek: number;
    latestSnapshot: OwnedStreamingWeeklySnapshot | null;
    previousSnapshot: OwnedStreamingWeeklySnapshot | null;
    hasUnreviewedResult: boolean;
    urgent: StreamingCeoBriefItem;
    opportunity: StreamingCeoBriefItem;
    upcoming: StreamingCeoBriefItem;
    nextWeekHook: string;
    lockedDecision: OwnedStreamingWeeklyDecision | null;
    planOptions: StreamingWeeklyPlanDefinition[];
}

const getProgramWeek = (platform: OwnedStreamingPlatformState, absoluteWeek: number): number => (
    platform.launchCommit
        ? Math.max(1, absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek + 1)
        : 0
);

const getNextSlateEntry = (platform: OwnedStreamingPlatformState, programWeek: number) => (
    platform.launchSlate?.entries
        .filter(entry => entry.launchWeek > programWeek)
        .sort((left, right) => left.launchWeek - right.launchWeek)[0] || null
);

const buildBriefItems = (
    platform: OwnedStreamingPlatformState,
    latestSnapshot: OwnedStreamingWeeklySnapshot | null,
    programWeek: number,
): Pick<StreamingWeeklyCeoLoop, 'urgent' | 'opportunity' | 'upcoming' | 'nextWeekHook'> => {
    const operations = latestSnapshot?.operations;
    const nextEntry = getNextSlateEntry(platform, programWeek);
    const runway = latestSnapshot?.cashRunwayWeeks ?? platform.metrics.cashRunwayWeeks;
    const churn = latestSnapshot?.churnRate ?? 0;
    const capacityUtilization = operations?.capacityUtilizationPercent ?? 0;

    let urgent: StreamingCeoBriefItem = {
        label: 'URGENT ISSUE',
        title: 'Protect the founding audience',
        detail: 'The first complete cohort has not reported yet. Choose what the operating team should prioritize.',
        tone: 'WATCH',
    };
    if (runway > 0 && runway < 8) urgent = {
        label: 'URGENT ISSUE',
        title: 'Runway has entered the danger zone',
        detail: `${runway.toFixed(1)} weeks of current burn remain. Growth without cash discipline can strand the slate.`,
        tone: 'CRITICAL',
    };
    else if (capacityUtilization >= 85) urgent = {
        label: 'URGENT ISSUE',
        title: 'Peak demand is closing on capacity',
        detail: `${capacityUtilization.toFixed(0)}% of burst capacity was used last week. Another event spike needs protection.`,
        tone: capacityUtilization >= 100 ? 'CRITICAL' : 'WATCH',
    };
    else if (churn >= 0.024) urgent = {
        label: 'URGENT ISSUE',
        title: 'Cancellation pressure is visible',
        detail: `${(churn * 100).toFixed(1)}% weekly churn means viewers are not finding a strong enough next watch.`,
        tone: churn >= 0.035 ? 'CRITICAL' : 'WATCH',
    };
    else if (operations) urgent = {
        label: 'URGENT ISSUE',
        title: operations.netCashContribution < 0 ? 'The service is consuming cash' : 'Do not waste a stable week',
        detail: operations.netCashContribution < 0
            ? 'Operating cash contribution was negative. The next plan needs a clear reason to spend.'
            : 'Delivery and audience signals are controlled; the risk is losing momentum between programming beats.',
        tone: operations.netCashContribution < 0 ? 'WATCH' : 'NEUTRAL',
    };

    const opportunity: StreamingCeoBriefItem = nextEntry ? {
        label: 'OPPORTUNITY',
        title: `${nextEntry.title} can carry the next beat`,
        detail: `Program week ${nextEntry.launchWeek} is the next locked premiere. The weekly posture can build toward it now.`,
        tone: 'POSITIVE',
    } : {
        label: 'OPPORTUNITY',
        title: 'Turn the opening library into habit',
        detail: 'No later launch-slate premiere is scheduled. A retention posture can extend the catalog’s useful life.',
        tone: 'POSITIVE',
    };

    const expiringLicense = platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE')
        .sort((left, right) => left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek)[0];
    const upcoming: StreamingCeoBriefItem = nextEntry ? {
        label: 'UPCOMING EVENT',
        title: `Premiere in ${Math.max(1, nextEntry.launchWeek - programWeek)} program week${nextEntry.launchWeek - programWeek === 1 ? '' : 's'}`,
        detail: `${nextEntry.title} is locked for week ${nextEntry.launchWeek} with a ${nextEntry.marketingPlan.toLowerCase()} marketing beat.`,
        tone: 'NEUTRAL',
    } : expiringLicense ? {
        label: 'UPCOMING EVENT',
        title: `${expiringLicense.titleAtSigning} has a rights clock`,
        detail: `The current license expires in ${Math.max(0, expiringLicense.expiresAtAbsoluteWeek - (latestSnapshot?.absoluteWeek || 0))} game weeks.`,
        tone: 'WATCH',
    } : {
        label: 'UPCOMING EVENT',
        title: 'The next weekly report',
        detail: 'Audience movement, delivery and cash contribution will close together on the next processed game week.',
        tone: 'NEUTRAL',
    };

    return {
        urgent,
        opportunity,
        upcoming,
        nextWeekHook: operations?.nextWeekHook
            || (nextEntry
                ? `${nextEntry.title} is the next programmed test of the platform promise.`
                : 'The locked twelve-week slate has no later premiere; content-gap pressure will keep rising.'),
    };
};

export const getStreamingWeeklyCeoLoop = (player: Player): StreamingWeeklyCeoLoop => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const programWeek = getProgramWeek(platform, absoluteWeek);
    const history = platform.weeklyHistory
        .filter(snapshot => snapshot.absoluteWeek > (platform.launchCommit?.committedAtAbsoluteWeek || Number.MAX_SAFE_INTEGER))
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek);
    const latestSnapshot = history.at(-1) || null;
    const previousSnapshot = history.at(-2) || null;
    const targetAbsoluteWeek = absoluteWeek + 1;
    const lockedDecision = platform.weeklyDecisions.find(decision => (
        decision.targetAbsoluteWeek === targetAbsoluteWeek && decision.status === 'LOCKED'
    )) || null;
    const brief = buildBriefItems(platform, latestSnapshot, programWeek);

    return {
        available: platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit),
        absoluteWeek,
        targetAbsoluteWeek,
        programWeek,
        latestSnapshot,
        previousSnapshot,
        hasUnreviewedResult: Boolean(
            latestSnapshot
            && latestSnapshot.absoluteWeek > (platform.lastAcknowledgedWeeklyReportAbsoluteWeek ?? -1)
        ),
        ...brief,
        lockedDecision,
        planOptions: STREAMING_WEEKLY_PLANS,
    };
};

export const lockStreamingWeeklyPlan = (
    player: Player,
    planId: StreamingWeeklyPlanId,
): { player: Player; changed: boolean; reason?: 'NOT_LIVE' | 'ALREADY_LOCKED' | 'INSUFFICIENT_TREASURY' | 'UNKNOWN_PLAN' } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) {
        return { player, changed: false, reason: 'NOT_LIVE' };
    }
    const plan = STREAMING_WEEKLY_PLANS.find(item => item.id === planId);
    if (!plan) return { player, changed: false, reason: 'UNKNOWN_PLAN' };
    const selectedAtAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const targetAbsoluteWeek = selectedAtAbsoluteWeek + 1;
    if (platform.weeklyDecisions.some(decision => decision.targetAbsoluteWeek === targetAbsoluteWeek)) {
        return { player, changed: false, reason: 'ALREADY_LOCKED' };
    }
    if (platform.treasuryCash < plan.cashCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }

    const idempotencyKey = `weekly-plan:${targetAbsoluteWeek}`;
    const decision: OwnedStreamingWeeklyDecision = {
        id: createDeterministicId('streaming_decision', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        planId: plan.id,
        label: plan.label,
        selectedAtAbsoluteWeek,
        targetAbsoluteWeek,
        cashCost: plan.cashCost,
        status: 'LOCKED',
        appliedAtAbsoluteWeek: null,
        outcomeNote: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek: selectedAtAbsoluteWeek,
        type: 'WEEKLY_PLAN_SELECTED',
        summary: `${plan.label} locked for the next platform week.`,
        source: 'PLAYER_ACTION',
        metadata: {
            planId: plan.id,
            targetAbsoluteWeek,
            cashCost: plan.cashCost,
        },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                weeklyDecisions: [...platform.weeklyDecisions, decision],
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};

export const acknowledgeStreamingWeeklyReport = (
    player: Player,
    absoluteWeek: number,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.weeklyHistory.some(snapshot => snapshot.absoluteWeek === absoluteWeek)) return player;
    if ((platform.lastAcknowledgedWeeklyReportAbsoluteWeek ?? -1) >= absoluteWeek) return player;
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            lastAcknowledgedWeeklyReportAbsoluteWeek: absoluteWeek,
        }, player.id),
    };
};

const buildNextWeekHook = (
    platform: OwnedStreamingPlatformState,
    programWeek: number,
    capacityUtilizationPercent: number,
    cashRunwayWeeks: number,
): string => {
    if (capacityUtilizationPercent >= 85) {
        return `Regional peak load is forecast to test ${Math.round(capacityUtilizationPercent)}% of current burst capacity again.`;
    }
    if (cashRunwayWeeks < 8) {
        return `${cashRunwayWeeks.toFixed(1)} weeks of current burn remain before the treasury needs a new answer.`;
    }
    const nextEntry = getNextSlateEntry(platform, programWeek);
    if (nextEntry) {
        return `${nextEntry.title} arrives in ${Math.max(1, nextEntry.launchWeek - programWeek)} program week${nextEntry.launchWeek - programWeek === 1 ? '' : 's'}.`;
    }
    const expiring = platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE')
        .sort((left, right) => left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek)[0];
    if (expiring) return `${expiring.titleAtSigning} is the next catalog right approaching expiry.`;
    return 'The opening slate has no later premiere; content-gap pressure will rise next week.';
};

export const processOwnedStreamingPlatformWeek = (
    player: Player,
): { player: Player; processed: boolean; snapshot: OwnedStreamingWeeklySnapshot | null } => {
    const normalizedPlatform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const launchCommit = normalizedPlatform.launchCommit;
    const weekKey = `owned-streaming-week:${absoluteWeek}`;
    if (
        normalizedPlatform.lifecycle !== 'ACTIVE'
        || !launchCommit
        || absoluteWeek <= launchCommit.committedAtAbsoluteWeek
        || normalizedPlatform.processedWeekKeys.includes(weekKey)
    ) {
        return { player, processed: false, snapshot: null };
    }
    const leadershipCompletion = completeDueStreamingExecutiveDevelopment(normalizedPlatform, absoluteWeek);
    const researchCompletion = advanceDueStreamingResearchPrograms(leadershipCompletion.platform, absoluteWeek);
    const campusCompletion = completeDueStreamingCampusProjects(researchCompletion.platform, absoluteWeek);
    const technologyCompletion = completeDueStreamingTechnologyProjects(campusCompletion.platform, absoluteWeek);
    const productCompletion = completeDueStreamingProductDevelopments(technologyCompletion.platform, absoluteWeek);
    const acquisitionCompletion = completeDueStreamingAcquisitionIntegrations(productCompletion.platform, absoluteWeek);
    const rightsCompliance = evaluateStreamingRightsCompliance(acquisitionCompletion.platform, absoluteWeek);
    const platform = rightsCompliance.platform;
    const productEffects = getStreamingProductWeeklyEffects(platform);
    const competitiveEffects = getStreamingCompetitiveWeeklyEffects(platform, absoluteWeek);
    const acquisitionEffects = getStreamingAcquisitionWeeklyEffects(platform);
    const crisisEffects = getStreamingCrisisWeeklyEffects(platform);
    const infrastructureOperationsEffects = getStreamingInfrastructureOperationsEffects(platform);
    const eraEffects = getStreamingEraWeeklyEffects(platform);

    const rng = createDeterministicRng(`${platform.simulationSeed}:weekly:${absoluteWeek}`);
    const programWeek = getProgramWeek(platform, absoluteWeek);
    const previousSubscribers = Math.max(platform.metrics.subscribers, launchCommit.initialSubscribers);
    const slateEntries = getOwnedStreamingProgramEntries({
        ...player,
        ownedStreamingPlatform: platform,
    });
    const releasesThisWeek = slateEntries.filter(entry => entry.launchWeek === programWeek);
    const recentEntries = slateEntries.filter(entry => (
        entry.launchWeek <= programWeek && programWeek - entry.launchWeek <= (entry.releasePattern === 'WEEKLY' ? 5 : 2)
    ));
    const availableEntries = slateEntries.filter(entry => entry.launchWeek <= programWeek);
    const genreBreadth = new Set(availableEntries.map(entry => entry.genre)).size;
    const activeOriginal = availableEntries.some(entry => entry.source === 'ORIGINAL');
    const longContentGap = releasesThisWeek.length === 0
        && !slateEntries.some(entry => entry.launchWeek > programWeek && entry.launchWeek <= programWeek + 2);
    const marketingHeat = releasesThisWeek.reduce((sum, entry) => (
        sum + (entry.marketingPlan === 'EVENT' ? 14 : entry.marketingPlan === 'STANDARD' ? 8 : 4)
    ), 0);
    const contentFreshness = clamp(
        34
        + Math.min(20, platform.catalogProjectIds.length * 2.5)
        + Math.min(16, genreBreadth * 4)
        + Math.min(24, recentEntries.length * 8)
        + marketingHeat
        + (activeOriginal ? 7 : 0)
        - (longContentGap ? 18 : 0),
        20,
        100,
    );

    const decision = platform.weeklyDecisions.find(item => (
        item.status === 'LOCKED' && item.targetAbsoluteWeek === absoluteWeek
    )) || null;
    const plan = decision ? STREAMING_WEEKLY_PLANS.find(item => item.id === decision.planId) || null : null;
    const growthAction = platform.growthActions.find(item => (
        item.status === 'LOCKED' && item.targetAbsoluteWeek === absoluteWeek
    )) || null;
    const growthEffects = growthAction ? getStreamingGrowthEffects(platform, growthAction) : null;
    const weightedArpu = (
        platform.subscriptionPrices.BASIC * 0.48
        + platform.subscriptionPrices.PREMIUM * 0.34
        + platform.subscriptionPrices.FAMILY * 0.18
    );
    const pricePressure = clamp((weightedArpu - 11) / 350, -0.004, 0.006);
    const weeksLive = Math.max(2, programWeek);
    const launchTail = clamp(0.018 - (weeksLive - 2) * 0.0018, 0.003, 0.018);
    const acquisitionJitter = (rng() - 0.5) * 0.004;
    const organicAcquisitionRate = clamp(
        0.004
        + launchTail
        + launchCommit.openingDemandIndex / 10_000
        + contentFreshness / 12_000
        + releasesThisWeek.length * 0.003
        + (plan?.acquisitionRateDelta || 0)
        + acquisitionJitter,
        0.002,
        0.09,
    );
    const productAdjustedAcquisitionRate = clamp(
        organicAcquisitionRate + productEffects.acquisitionRateDelta,
        0.002,
        0.09,
    );
    const acquisitionRate = clamp(
        productAdjustedAcquisitionRate
        + (growthEffects?.acquisitionRateDelta || 0)
        + competitiveEffects.acquisitionRateDelta
        + acquisitionEffects.acquisitionRateDelta
        + crisisEffects.acquisitionRateDelta
        + infrastructureOperationsEffects.acquisitionRateDelta
        + eraEffects.acquisitionRateDelta,
        0.002,
        0.09,
    );
    const counterfactualAcquisitionRate = clamp(
        productAdjustedAcquisitionRate
        + competitiveEffects.acquisitionRateDelta
        + acquisitionEffects.acquisitionRateDelta
        + crisisEffects.acquisitionRateDelta
        + infrastructureOperationsEffects.acquisitionRateDelta
        + eraEffects.acquisitionRateDelta,
        0.002,
        0.09,
    );
    const peakActivityRate = clamp(
        (0.11 + contentFreshness / 900 + releasesThisWeek.length * 0.025 + (rng() - 0.5) * 0.015)
        * (plan?.demandMultiplier || 1)
        * (1 + (productEffects.peakLoadPercent + competitiveEffects.peakLoadPercent) / 100),
        0.1,
        0.42,
    );
    const peakConcurrentStreams = Math.max(1, Math.round(previousSubscribers * peakActivityRate));
    const burstCapacity = Math.max(1, platform.capacity.burstConcurrentStreams * infrastructureOperationsEffects.capacityMultiplier);
    const capacityUtilizationPercent = peakConcurrentStreams / burstCapacity * 100;
    const overloadPenalty = capacityUtilizationPercent > 100
        ? Math.min(12, (capacityUtilizationPercent - 100) * 0.16)
        : 0;
    const technicalDebt = platform.infrastructureSetup?.technicalDebt || 0;
    const reliabilityTarget = platform.infrastructureSetup?.reliabilityTarget || 97;
    const playbackSuccessRate = clamp(
        reliabilityTarget
        + platform.technologyLevels.PLAYBACK_QUALITY * 0.004
        + platform.technologyLevels.RELIABILITY * 0.002
        - overloadPenalty
        - technicalDebt * 0.035
        + (plan?.playbackBoost || 0)
        + eraEffects.playbackBoost
        - acquisitionEffects.reliabilityRisk * 9
        + crisisEffects.playbackDelta
        + infrastructureOperationsEffects.playbackDelta
        + (rng() - 0.5) * 0.18,
        75,
        99.98,
    );
    const playbackPressure = Math.max(0, 99.2 - playbackSuccessRate) / 180;
    const freshnessProtection = Math.max(0, contentFreshness - 55) / 15_000;
    const organicChurnRate = clamp(
        0.018
        + pricePressure
        + (longContentGap ? 0.006 : 0)
        + playbackPressure
        - freshnessProtection
        + (plan?.churnRateDelta || 0)
        + (rng() - 0.5) * 0.0025,
        0.004,
        0.09,
    );
    const productAdjustedChurnRate = clamp(
        organicChurnRate + productEffects.churnRateDelta,
        0.004,
        0.09,
    );
    const churnRate = clamp(
        productAdjustedChurnRate
        + (growthEffects?.churnRateDelta || 0)
        + competitiveEffects.churnRateDelta
        + acquisitionEffects.churnRateDelta
        + crisisEffects.churnRateDelta
        + infrastructureOperationsEffects.churnRateDelta
        + eraEffects.churnRateDelta,
        0.004,
        0.09,
    );
    const counterfactualChurnRate = clamp(
        productAdjustedChurnRate
        + competitiveEffects.churnRateDelta
        + acquisitionEffects.churnRateDelta
        + crisisEffects.churnRateDelta
        + infrastructureOperationsEffects.churnRateDelta
        + eraEffects.churnRateDelta,
        0.004,
        0.09,
    );
    const joinedSubscribers = Math.round(previousSubscribers * acquisitionRate);
    const cancellations = Math.round(previousSubscribers * churnRate);
    const organicJoinedSubscribers = Math.round(previousSubscribers * counterfactualAcquisitionRate);
    const organicCancellations = Math.round(previousSubscribers * counterfactualChurnRate);
    const reactivationRate = clamp(
        0.001
        + contentFreshness / 55_000
        + (releasesThisWeek.length ? 0.001 : 0)
        + (plan?.id === 'RETENTION_SPOTLIGHT' ? 0.0015 : 0),
        0.001,
        0.012,
    );
    const reactivations = Math.round(previousSubscribers * reactivationRate);
    const netSubscriberMovement = joinedSubscribers + reactivations - cancellations;
    const subscribers = Math.max(0, previousSubscribers + netSubscriberMovement);
    const organicSubscribers = Math.max(
        0,
        previousSubscribers + organicJoinedSubscribers + reactivations - organicCancellations,
    );
    const organicEngagementRate = clamp(
        0.34
        + contentFreshness / 235
        + playbackSuccessRate / 550
        + (plan?.engagementRateDelta || 0)
        + (rng() - 0.5) * 0.018,
        0.3,
        0.94,
    );
    const productAdjustedEngagementRate = clamp(
        organicEngagementRate + productEffects.engagementRateDelta,
        0.3,
        0.94,
    );
    const engagementRate = clamp(
        productAdjustedEngagementRate
        + (growthEffects?.engagementRateDelta || 0)
        + crisisEffects.engagementRateDelta
        + infrastructureOperationsEffects.engagementRateDelta
        + eraEffects.engagementRateDelta,
        0.3,
        0.94,
    );
    const counterfactualEngagementRate = clamp(
        productAdjustedEngagementRate
        + crisisEffects.engagementRateDelta
        + infrastructureOperationsEffects.engagementRateDelta
        + eraEffects.engagementRateDelta,
        0.3,
        0.94,
    );
    const averageActiveSubscribers = (previousSubscribers + subscribers) / 2;
    const organicAverageActiveSubscribers = (previousSubscribers + organicSubscribers) / 2;
    const subscriptionRevenue = roundMoney(calculateStreamingSubscriptionRevenueFullCurrency({
        subscribers: averageActiveSubscribers,
        monthlyArpu: weightedArpu,
        paidSubscriberShare: 1,
    }));
    const productRevenue = roundMoney(
        averageActiveSubscribers * productEffects.weeklyRevenuePerSubscriber,
    );
    const partnerRevenueShareCost = roundMoney(calculateStreamingPartnerRevenueShareFullCurrency({
        weeklySubscriptionRevenueFullCurrency: subscriptionRevenue,
        licenses: platform.catalogLicenses,
        availableTitleCount: availableEntries.length || platform.catalogProjectIds.length,
        absoluteWeek,
    }));
    const infrastructureCost = roundMoney(platform.infrastructureSetup?.weeklyOperatingCost || 0);
    const leadershipCost = roundMoney(platform.leadership.appointments
        .filter(appointment => appointment.status === 'ACTIVE')
        .reduce((sum, appointment) => sum + appointment.weeklyCompensation, 0));
    const financingCost = roundMoney(platform.finance.loans
        .filter(loan => loan.status === 'ACTIVE')
        .reduce((sum, loan) => sum + loan.outstandingPrincipal * loan.weeklyInterestRate, 0));
    const weeklyPlanCost = plan?.cashCost || 0;
    const growthPlanCost = growthAction?.cashCost || 0;
    const rightsComplianceCost = rightsCompliance.complianceCost;
    const technologyCampusCost = getStreamingTechnologyWeeklyCost(platform);
    const productSuiteCost = productEffects.weeklyOperatingCost;
    const governanceCost = getStreamingGovernanceWeeklyCost(
        platform,
        subscriptionRevenue + productRevenue,
    );
    const competitiveOperationsCost = roundMoney(competitiveEffects.weeklyOperatingCost);
    const acquisitionIntegrationCost = roundMoney(acquisitionEffects.weeklyOperatingCost);
    const crisisRecoveryCost = roundMoney(crisisEffects.weeklyRecoveryCost);
    const infrastructureOperationsCost = roundMoney(infrastructureOperationsEffects.weeklyOperatingCost);
    const marketCosts = calculateStreamingMarketOperatingCosts(platform, subscriptionRevenue + productRevenue);
    const marketPolicyCost = roundMoney(marketCosts.marketPolicyCost);
    const marketOperatingCost = roundMoney(marketCosts.marketOperatingCost);
    const totalCashCost = roundMoney(
        partnerRevenueShareCost
        + infrastructureCost
        + leadershipCost
        + financingCost
        + weeklyPlanCost
        + growthPlanCost
        + rightsComplianceCost
        + technologyCampusCost
        + productSuiteCost
        + governanceCost
        + competitiveOperationsCost
        + acquisitionIntegrationCost
        + crisisRecoveryCost
        + infrastructureOperationsCost
        + marketPolicyCost
        + marketOperatingCost,
    );
    const treasuryAfter = Math.max(0, roundMoney(
        platform.treasuryCash + subscriptionRevenue + productRevenue - totalCashCost,
    ));
    const netCashContribution = treasuryAfter - platform.treasuryCash;
    const contentAmortization = roundMoney((
        platform.originalCommissions.reduce((sum, commission) => sum + commission.productionFundingApplied, 0)
        + platform.catalogLicenses.reduce((sum, license) => sum + license.minimumGuarantee, 0)
    ) / 104);
    const accountingContribution = netCashContribution - contentAmortization;
    const cashRunwayWeeks = calculateStreamingRunwayFromTrailingCosts({
        cash: treasuryAfter,
        trailingWeeklyOperatingCost: totalCashCost,
        trailingWeeklyNetCashFlow: subscriptionRevenue + productRevenue - totalCashCost,
    }).lossRunwayWeeks ?? 5_200;
    const technologyHealth = clamp(
        platform.metrics.technologyHealth * 0.58
        + playbackSuccessRate * 0.42
        + platform.technologyLevels.SECURITY * 0.018
        - technicalDebt * 0.12
        - (capacityUtilizationPercent > 100 ? 4 : 0)
        - (crisisEffects.activeCrisis
            ? crisisEffects.activeCrisis.severity === 'CRITICAL' ? 5
                : crisisEffects.activeCrisis.severity === 'MAJOR' ? 3.5
                    : crisisEffects.activeCrisis.severity === 'SERIOUS' ? 2 : 1
            : 0)
        - (infrastructureOperationsEffects.activeIncident
            ? infrastructureOperationsEffects.activeIncident.severity === 'CRITICAL' ? 5
                : infrastructureOperationsEffects.activeIncident.severity === 'MAJOR' ? 3.5
                    : infrastructureOperationsEffects.activeIncident.severity === 'SERIOUS' ? 2 : 1
            : 0),
        0,
        100,
    );

    const causalDrivers: OwnedStreamingWeeklyCausalDriver[] = [
        releasesThisWeek.length ? {
            id: 'programming',
            label: `${releasesThisWeek.map(entry => entry.title).join(' + ')} arrived`,
            detail: `Fresh programming lifted discovery and helped produce ${joinedSubscribers.toLocaleString()} joins.`,
            impact: 'POSITIVE',
        } : {
            id: 'programming-gap',
            label: longContentGap ? 'The next-watch lane is thinning' : 'Catalog carried a quiet week',
            detail: longContentGap
                ? 'No premiere is scheduled within two program weeks, increasing cancellation pressure.'
                : 'Recent titles continued to work without a new premiere spike.',
            impact: longContentGap ? 'NEGATIVE' : 'NEUTRAL',
        },
        {
            id: 'audience-balance',
            label: netSubscriberMovement >= 0 ? 'Joins stayed ahead of exits' : 'Exits overtook acquisition',
            detail: `${joinedSubscribers.toLocaleString()} joined, ${reactivations.toLocaleString()} returned and ${cancellations.toLocaleString()} cancelled.`,
            impact: netSubscriberMovement >= 0 ? 'POSITIVE' : 'NEGATIVE',
        },
        {
            id: 'delivery',
            label: capacityUtilizationPercent < 85 ? 'The network kept breathing room' : 'Peak load tested the stack',
            detail: `${roundPercent(playbackSuccessRate).toFixed(2)}% playback success at ${roundPercent(capacityUtilizationPercent).toFixed(0)}% burst-capacity use.`,
            impact: playbackSuccessRate >= 99 && capacityUtilizationPercent < 90 ? 'POSITIVE' : 'NEGATIVE',
        },
        {
            id: 'cash-contribution',
            label: netCashContribution >= 0 ? 'Operations added cash' : 'Operations consumed cash',
            detail: `${(subscriptionRevenue + productRevenue).toLocaleString()} total operating revenue produced a ${netCashContribution >= 0 ? 'positive' : 'negative'} ${Math.abs(netCashContribution).toLocaleString()} treasury movement.`,
            impact: netCashContribution >= 0 ? 'POSITIVE' : 'NEGATIVE',
        },
        ...(marketCosts.activeCountryCount ? [{
            id: 'living-market-policy',
            label: `${marketCosts.activeCountryCount} active ${marketCosts.activeCountryCount === 1 ? 'market is' : 'markets are'} shaping the P&L`,
            detail: `${marketPolicyCost.toLocaleString()} in country taxes and levies plus ${marketOperatingCost.toLocaleString()} in local weekly operations.`,
            impact: 'NEUTRAL' as const,
        }] : []),
        {
            id: `era-mandate-${eraEffects.mandate.toLowerCase()}`,
            label: `Era ${platform.legacy.currentEraNumber} is operating under ${eraEffects.mandate.toLowerCase().replaceAll('_', ' ')}`,
            detail: 'The company mandate applies a small, persistent operating bias without replacing weekly CEO decisions.',
            impact: 'NEUTRAL',
        },
        ...(growthAction ? [{
            id: 'growth-action',
            label: `${growthAction.title} entered the growth war room`,
            detail: `${growthAction.channels.length} paid channel${growthAction.channels.length === 1 ? '' : 's'}, ${growthAction.homepagePlacement.toLowerCase().replaceAll('_', ' ')} placement and a ${growthAction.recommendationObjective.toLowerCase().replaceAll('_', ' ')} recommendation objective shaped discovery.`,
            impact: 'POSITIVE' as const,
        }] : []),
        ...technologyCompletion.completedProjects.map(project => ({
            id: `technology-${project.id}`,
            label: `${project.title} entered live operations`,
            detail: `${project.branch.toLowerCase().replaceAll('_', ' ')} reached level ${project.targetLevel}; its operating cost and engineering benefits are now part of the company.`,
            impact: 'POSITIVE' as const,
        })),
        ...campusCompletion.completedStages.map(project => ({
            id: `campus-stage-${project.id}-${project.stage}`,
            label: `${project.name} construction advanced`,
            detail: project.status === 'READY_TO_OPEN'
                ? 'Commissioning is complete. Opening remains an explicit CEO decision.'
                : `${project.stage.toLowerCase().replaceAll('_', ' ')} is now the active construction gate.`,
            impact: project.status === 'DELAYED' ? 'NEGATIVE' as const : 'NEUTRAL' as const,
        })),
        ...campusCompletion.openedExpansions.map(project => ({
            id: `campus-expansion-${project.id}-${project.expansionCount}`,
            label: `${project.name} opened another data hall`,
            detail: `Installed capacity is now ${project.installedRacks} racks across ${project.hallCount} halls.`,
            impact: 'POSITIVE' as const,
        })),
        ...researchCompletion.advancedPrograms.map(program => ({
            id: `research-${program.id}-${program.stage}`,
            label: `${program.title} advanced to ${program.stage.replaceAll('_', ' ').toLowerCase()}`,
            detail: program.stage === 'AWAITING_IP'
                ? 'Testing is complete. Choose Patent or License before any installation can begin.'
                : program.stage === 'OPERATING'
                    ? `The installation in ${program.installationTargetLabel || 'live operations'} now applies its gameplay effect.`
                    : 'Research progress changed the project state without granting an installation benefit.',
            impact: program.stage === 'OPERATING' ? 'POSITIVE' as const : 'NEUTRAL' as const,
        })),
        ...leadershipCompletion.completedPrograms.map(program => {
            const executive = platform.leadership.appointments.find(item => item.executiveId === program.executiveId);
            return {
                id: `executive-development:${program.id}`,
                label: `${executive?.nameAtAppointment || 'An executive'} completed leadership development`,
                detail: `${program.track.toLowerCase().replaceAll('_', ' ')} now contributes to the persistent executive profile.`,
                impact: 'POSITIVE' as const,
            };
        }),
        ...productCompletion.launchedLines.map(line => ({
            id: `product-launch:${line.lineId}`,
            label: `${line.title} entered public operation`,
            detail: `${line.staffRequired} staff and ${line.peakLoadPercent}% added peak load now produce real weekly consequences.`,
            impact: 'POSITIVE' as const,
        })),
        ...(productEffects.activeProductIds.length > 1 ? [{
            id: 'product-suite',
            label: `${productEffects.activeProductIds.length} product lines are operating`,
            detail: `${productSuiteCost.toLocaleString()} weekly product cost and ${productEffects.peakLoadPercent.toFixed(1)}% added peak load.`,
            impact: productRevenue >= productSuiteCost ? 'POSITIVE' as const : 'NEUTRAL' as const,
        }] : []),
        ...(competitiveEffects.activeRegions.length > 1 ? [{
            id: 'global-footprint',
            label: `${competitiveEffects.activeRegions.length} regions are serving audiences`,
            detail: `${competitiveOperationsCost.toLocaleString()} in weekly regional operations created ${(competitiveEffects.acquisitionRateDelta * 100).toFixed(2)} points of net acquisition pressure.`,
            impact: competitiveEffects.acquisitionRateDelta >= 0 ? 'POSITIVE' as const : 'NEGATIVE' as const,
        }] : []),
        ...(competitiveEffects.activePressureMoves.length ? [{
            id: 'platform-war',
            label: 'A rival move reached this week',
            detail: `${competitiveEffects.activePressureMoves.length} funded competitive move${competitiveEffects.activePressureMoves.length === 1 ? '' : 's'} changed audience pressure. Open Platform Wars to inspect the responsible CEO and response history.`,
            impact: 'NEGATIVE' as const,
        }] : []),
        ...(acquisitionEffects.activeIntegrations.length ? [{
            id: 'acquisition-integration',
            label: `${acquisitionEffects.activeIntegrations.length} acquisition integration${acquisitionEffects.activeIntegrations.length === 1 ? ' is' : 's are'} live`,
            detail: `${acquisitionIntegrationCost.toLocaleString()} in weekly integration cost is reconciling audience, catalog and technology assets.`,
            impact: acquisitionEffects.reliabilityRisk >= 0.05 ? 'NEGATIVE' as const : 'NEUTRAL' as const,
        }] : []),
        ...acquisitionCompletion.completedIntegrations.map(integration => ({
            id: `acquisition-complete:${integration.id}`,
            label: `${integration.targetPlatformName} integration completed`,
            detail: `${integration.catalogAssetCount.toLocaleString()} catalog assets and +${integration.technologyLevelDelta} technology levels are now operating assets.`,
            impact: 'POSITIVE' as const,
        })),
        ...(crisisEffects.activeCrisis ? [{
            id: `crisis:${crisisEffects.activeCrisis.id}`,
            label: `${crisisEffects.activeCrisis.title} is shaping the week`,
            detail: crisisEffects.activeCrisis.stage === 'RECOVERING'
                ? `${crisisRecoveryCost.toLocaleString()} funded recovery spend reduced, but did not erase, audience and reliability pressure.`
                : 'The incident is awaiting a leadership response and is increasing churn, trust and operating pressure.',
            impact: 'NEGATIVE' as const,
        }] : []),
        ...(infrastructureOperationsEffects.activeIncident ? [{
            id: `infrastructure-incident:${infrastructureOperationsEffects.activeIncident.id}`,
            label: `${infrastructureOperationsEffects.activeIncident.title} is affecting service`,
            detail: infrastructureOperationsEffects.activeIncident.stage === 'RECOVERING'
                ? `${infrastructureOperationsCost.toLocaleString()} in operations and insurance cost is supporting recovery.`
                : `${infrastructureOperationsEffects.activeIncident.capacityLossPercent.toFixed(0)}% of affected capacity is exposed while Incident Command waits for a response.`,
            impact: 'NEGATIVE' as const,
        }] : []),
    ];

    const headline = infrastructureOperationsEffects.activeIncident
        ? infrastructureOperationsEffects.activeIncident.stage === 'RECOVERING'
            ? `Network recovery continues: ${infrastructureOperationsEffects.activeIncident.title}.`
            : `Infrastructure response required: ${infrastructureOperationsEffects.activeIncident.title}.`
        : crisisEffects.activeCrisis
        ? crisisEffects.activeCrisis.stage === 'RECOVERING'
            ? `Recovery continues: ${crisisEffects.activeCrisis.title}.`
            : `Leadership response required: ${crisisEffects.activeCrisis.title}.`
        : playbackSuccessRate < 98.5
        ? 'Demand exposed the delivery stack.'
        : netSubscriberMovement < 0
            ? 'The audience contracted despite a working service.'
            : releasesThisWeek.length
                ? `${releasesThisWeek[0].title} moved the week.`
                : netCashContribution >= 0
                    ? 'A quiet week still strengthened the company.'
                    : 'The platform held audience but paid for it.';
    const summary = `${netSubscriberMovement >= 0 ? '+' : ''}${netSubscriberMovement.toLocaleString()} net subscribers, ${(churnRate * 100).toFixed(1)}% churn and ${playbackSuccessRate.toFixed(2)}% playback success. ${netCashContribution >= 0 ? 'Treasury gained' : 'Treasury used'} ${Math.abs(netCashContribution).toLocaleString()}.`;
    const nextWeekHook = infrastructureOperationsEffects.activeIncident
        ? infrastructureOperationsEffects.activeIncident.stage === 'RECOVERING'
            ? `Facility recovery verification is scheduled for game week ${infrastructureOperationsEffects.activeIncident.recoveryReadyAtAbsoluteWeek}.`
            : 'Incident Command is waiting for an emergency action, rerouting target, insurance claim and compensation decision.'
        : crisisEffects.activeCrisis
        ? crisisEffects.activeCrisis.stage === 'RECOVERING'
            ? `Recovery verification is scheduled for game week ${crisisEffects.activeCrisis.recoveryReadyAtAbsoluteWeek}.`
            : 'Incident Command is waiting for a response doctrine, compensation decision and public message.'
        : buildNextWeekHook(
            platform,
            programWeek,
            capacityUtilizationPercent,
            cashRunwayWeeks,
        );
    const causeMarkers = [
        releasesThisWeek.length ? 'FRESH_RELEASE' : longContentGap ? 'CONTENT_GAP' : 'CATALOG_WEEK',
        netSubscriberMovement >= 0 ? 'SUBSCRIBER_GROWTH' : 'SUBSCRIBER_DECLINE',
        capacityUtilizationPercent >= 90 ? 'CAPACITY_PRESSURE' : 'CAPACITY_HEALTHY',
        netCashContribution >= 0 ? 'POSITIVE_CASH_CONTRIBUTION' : 'NEGATIVE_CASH_CONTRIBUTION',
        ...(plan ? [`PLAN_${plan.id}`] : ['BALANCED_AUTOPILOT']),
        ...(growthAction ? ['GROWTH_ACTION_APPLIED'] : []),
        ...(productCompletion.launchedLines.length ? ['PRODUCT_LAUNCHED'] : []),
        ...(competitiveEffects.activeRegions.length > 1 ? ['GLOBAL_REGIONS_ACTIVE'] : []),
        ...(competitiveEffects.activePressureMoves.length ? ['RIVAL_PRESSURE_ACTIVE'] : []),
        ...(acquisitionEffects.activeIntegrations.length ? ['ACQUISITION_INTEGRATION_ACTIVE'] : []),
        ...(acquisitionCompletion.completedIntegrations.length ? ['ACQUISITION_INTEGRATED'] : []),
        ...(crisisEffects.activeCrisis ? ['CRISIS_RECOVERY_ACTIVE'] : []),
        ...(infrastructureOperationsEffects.activeIncident ? ['INFRASTRUCTURE_INCIDENT_ACTIVE'] : []),
        `ERA_MANDATE_${eraEffects.mandate}`,
    ];
    const baseTitleWeights = availableEntries.map(entry => {
        const age = Math.max(0, programWeek - entry.launchWeek);
        return Math.max(0.25, 1.7 - age * 0.13)
            + (entry.releasePattern === 'WEEKLY' && age <= 6 ? 0.7 : 0)
            + (entry.marketingPlan === 'EVENT' ? 0.5 : entry.marketingPlan === 'STANDARD' ? 0.22 : 0.08)
            + (entry.source === 'ORIGINAL' ? 0.24 : 0)
            + (entry.launchWeek === programWeek ? 0.85 : 0);
    });
    const titleWeights = availableEntries.map((entry, index) => (
        Math.max(
            0.1,
            baseTitleWeights[index]
                + (growthAction?.projectId === entry.projectId ? growthEffects?.targetWeightBoost || 0 : 0)
                + (growthAction?.projectId !== entry.projectId ? growthEffects?.longTailWeightBoost || 0 : 0),
        )
    ));
    const totalViewingAccounts = Math.max(0, Math.round(averageActiveSubscribers * engagementRate));
    const organicViewingAccounts = Math.max(0, Math.round(organicAverageActiveSubscribers * counterfactualEngagementRate));
    const viewingAllocation = distributeIntegerTotal(totalViewingAccounts, titleWeights);
    const organicViewingAllocation = distributeIntegerTotal(organicViewingAccounts, baseTitleWeights);
    const revenueAllocation = distributeIntegerTotal(subscriptionRevenue, titleWeights);
    const cashCostAllocation = distributeIntegerTotal(totalCashCost, titleWeights);
    const amortizationAllocation = distributeIntegerTotal(contentAmortization, titleWeights);
    const titlePerformance: OwnedStreamingTitleWeekPerformance[] = availableEntries.map((entry, index) => {
        const titleRng = createDeterministicRng(`${platform.simulationSeed}:title:${entry.projectId}:${absoluteWeek}`);
        const weeksAvailable = Math.max(1, programWeek - entry.launchWeek + 1);
        const completionRate = clamp(
            0.52
            + (entry.projectType === 'MOVIE' ? 0.09 : 0.02)
            + (entry.source === 'ORIGINAL' ? 0.035 : 0)
            - Math.max(0, weeksAvailable - 3) * 0.008
            + (titleRng() - 0.5) * 0.08,
            0.25,
            0.94,
        );
        const repeatViewingRate = clamp(
            0.05
            + (entry.releasePattern === 'WEEKLY' ? 0.065 : 0.02)
            + (titleRng() - 0.5) * 0.025,
            0.015,
            0.24,
        );
        const isGrowthTarget = growthAction?.projectId === entry.projectId;
        const recommendationBias = growthAction
            ? (growthEffects?.targetDiscoveryBias.recommendations || 0) * (isGrowthTarget ? 1 : 0.55)
            : 0;
        const discoveryAllocation = distributeIntegerTotal(100, [
            30
                + (entry.launchWeek === programWeek ? 20 : 0)
                + (entry.marketingPlan === 'EVENT' ? 8 : 0)
                - weeksAvailable * 1.4
                + (isGrowthTarget ? growthEffects?.targetDiscoveryBias.homepage || 0 : 0),
            34 + weeksAvailable * 1.4 + recommendationBias,
            12
                + (entry.source === 'ORIGINAL' ? 3 : 0)
                + (isGrowthTarget ? growthEffects?.targetDiscoveryBias.search || 0 : 0),
            12 + (isGrowthTarget ? growthEffects?.targetDiscoveryBias.direct || 0 : 0),
        ]);
        const [homepagePercent, recommendationsPercent, searchPercent, directPercent] = discoveryAllocation;
        const attributedSubscriptionRevenue = revenueAllocation[index] || 0;
        const allocatedCashCost = cashCostAllocation[index] || 0;
        const allocatedContentAmortization = amortizationAllocation[index] || 0;
        const cashContributionForTitle = attributedSubscriptionRevenue - allocatedCashCost;
        return {
            id: createDeterministicId('streaming_title_week', platform.simulationSeed, entry.projectId, absoluteWeek),
            projectId: entry.projectId,
            title: entry.title,
            source: entry.source,
            projectType: entry.projectType,
            genre: entry.genre,
            absoluteWeek,
            programWeek,
            weeksAvailable,
            viewingAccounts: viewingAllocation[index] || 0,
            hoursViewed: Math.round((viewingAllocation[index] || 0) * (entry.projectType === 'SERIES' ? 1.05 : 1.72)),
            completionRate: roundRate(completionRate),
            repeatViewingRate: roundRate(repeatViewingRate),
            satisfactionScore: roundPercent(clamp(
                54 + completionRate * 35 + repeatViewingRate * 35 + (titleRng() - 0.5) * 5,
                35,
                96,
            )),
            discoveryMix: {
                homepagePercent,
                recommendationsPercent,
                searchPercent,
                directPercent,
            },
            attributedSubscriptionRevenue,
            allocatedCashCost,
            allocatedContentAmortization,
            cashContribution: cashContributionForTitle,
            accountingContribution: cashContributionForTitle - allocatedContentAmortization,
            playbackSuccessRate: roundPercent(clamp(
                playbackSuccessRate + (titleRng() - 0.5) * 0.22,
                75,
                99.99,
            )),
        };
    });
    const growthTargetIndex = growthAction
        ? availableEntries.findIndex(entry => entry.projectId === growthAction.projectId)
        : -1;
    const growthTargetEntry = growthTargetIndex >= 0 ? availableEntries[growthTargetIndex] : null;
    const growthTargetPerformance = growthTargetIndex >= 0 ? titlePerformance[growthTargetIndex] : null;
    const attributedViewingAccounts = growthTargetIndex >= 0
        ? Math.max(0, (viewingAllocation[growthTargetIndex] || 0) - (organicViewingAllocation[growthTargetIndex] || 0))
        : 0;
    const attributedJoins = growthAction
        ? Math.max(0, joinedSubscribers - organicJoinedSubscribers)
        : 0;
    const artworkResult = growthAction && growthTargetEntry
        ? resolveStreamingArtworkTest(platform, growthAction, growthTargetEntry, absoluteWeek)
        : { winner: null, liftPercent: null };
    const growthOutcome: OwnedStreamingGrowthAttribution | null = growthAction ? {
        attributedViewingAccounts,
        attributedJoins,
        costPerAttributedJoin: attributedJoins > 0 ? Math.round(growthAction.cashCost / attributedJoins) : null,
        artworkWinner: artworkResult.winner,
        artworkWinnerLiftPercent: artworkResult.liftPercent,
        observedDiscoveryMix: growthTargetPerformance?.discoveryMix || null,
        summary: `${growthAction.title} gained ${attributedViewingAccounts.toLocaleString()} modeled incremental viewing accounts and ${attributedJoins.toLocaleString()} attributed joins against the same week without the action.`,
    } : null;
    const snapshot: OwnedStreamingWeeklySnapshot = {
        id: createDeterministicId('streaming_snapshot', platform.simulationSeed, absoluteWeek),
        absoluteWeek,
        subscribers,
        netSubscriberMovement,
        churnRate: roundRate(churnRate),
        engagementRate: roundRate(engagementRate),
        averageRevenuePerUser: roundPercent(weightedArpu),
        cashRunwayWeeks: roundPercent(cashRunwayWeeks),
        technologyHealth: roundPercent(technologyHealth),
        causeMarkers,
        operations: {
            programWeek,
            releaseTitles: releasesThisWeek.map(entry => entry.title),
            joinedSubscribers,
            cancellations,
            reactivations,
            subscriptionRevenue,
            partnerRevenueShareCost,
            infrastructureCost,
            leadershipCost,
            financingCost,
            weeklyPlanCost,
            growthPlanCost,
            rightsComplianceCost,
            marketPolicyCost,
            marketOperatingCost,
            technologyCampusCost,
            productSuiteCost,
            productRevenue,
            productPeakLoadPercent: productEffects.peakLoadPercent,
            governanceCost,
            competitiveOperationsCost,
            acquisitionIntegrationCost,
            crisisRecoveryCost,
            totalCashCost,
            netCashContribution,
            contentAmortization,
            accountingContribution,
            peakConcurrentStreams,
            capacityUtilizationPercent: roundPercent(capacityUtilizationPercent),
            playbackSuccessRate: roundPercent(playbackSuccessRate),
            appliedDecisionId: decision?.id || null,
            appliedGrowthActionId: growthAction?.id || null,
            headline,
            summary,
            nextWeekHook,
            causalDrivers,
            titlePerformance,
        },
    };
    const checkpointKey = weekKey;
    const metricsKey = `owned-streaming-metrics:${absoluteWeek}`;
    const checkpointLedger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, checkpointKey),
        idempotencyKey: checkpointKey,
        absoluteWeek,
        type: 'WEEK_CHECKPOINT',
        summary: `Program week ${programWeek} processed exactly once.`,
        source: 'WEEK_PROCESSOR',
        metadata: {
            programWeek,
            appliedPlan: plan?.id || 'BALANCED_AUTOPILOT',
        },
    };
    const metricsLedger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, metricsKey),
        idempotencyKey: metricsKey,
        absoluteWeek,
        type: 'METRICS_COMMITTED',
        summary: headline,
        source: 'WEEK_PROCESSOR',
        metadata: {
            subscribers,
            netSubscriberMovement,
            churnRate: snapshot.churnRate,
            netCashContribution,
            playbackSuccessRate: snapshot.operations!.playbackSuccessRate,
        },
    };
    const growthLedger: OwnedStreamingLedgerEntry | null = growthAction && growthOutcome ? {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${growthAction.idempotencyKey}:applied`),
        idempotencyKey: `${growthAction.idempotencyKey}:applied`,
        absoluteWeek,
        type: 'GROWTH_ACTION_APPLIED',
        summary: growthOutcome.summary,
        source: 'WEEK_PROCESSOR',
        metadata: {
            projectId: growthAction.projectId,
            cashCost: growthAction.cashCost,
            attributedViewingAccounts: growthOutcome.attributedViewingAccounts,
            attributedJoins: growthOutcome.attributedJoins,
            artworkWinner: growthOutcome.artworkWinner || 'NO_TEST',
        },
    } : null;
    const weeklyDecisions = platform.weeklyDecisions.map(item => (
        item.id === decision?.id
            ? {
                ...item,
                status: 'APPLIED' as const,
                appliedAtAbsoluteWeek: absoluteWeek,
                outcomeNote: `${headline} ${netSubscriberMovement >= 0 ? '+' : ''}${netSubscriberMovement.toLocaleString()} net subscribers.`,
            }
            : item
    ));
    const growthActions = platform.growthActions.map(item => (
        item.id === growthAction?.id
            ? {
                ...item,
                status: 'APPLIED' as const,
                appliedAtAbsoluteWeek: absoluteWeek,
                outcome: growthOutcome,
            }
            : item
    ));
    const weeklyCommittedPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: treasuryAfter,
        metrics: {
            subscribers,
            netSubscriberMovement,
            churnRate: snapshot.churnRate,
            engagementRate: snapshot.engagementRate,
            averageRevenuePerUser: snapshot.averageRevenuePerUser,
            cashRunwayWeeks: snapshot.cashRunwayWeeks,
            technologyHealth: snapshot.technologyHealth,
        },
        lastProcessedAbsoluteWeek: absoluteWeek,
        processedWeekKeys: [...platform.processedWeekKeys, weekKey],
        weeklyDecisions,
        growthActions,
        weeklyHistory: [...platform.weeklyHistory, snapshot],
        eventLedger: [
            ...platform.eventLedger,
            checkpointLedger,
            metricsLedger,
            ...(growthLedger ? [growthLedger] : []),
            ...campusCompletion.ledgerEntries,
            ...technologyCompletion.ledgerEntries,
            ...researchCompletion.ledgerEntries,
            ...productCompletion.ledgerEntries,
            ...leadershipCompletion.ledgerEntries,
            ...rightsCompliance.ledgerEntries,
        ],
        milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'weekly-ceo-loop-started'])),
    }, player.id);
    const rivalMoveIdsBeforeCommit = new Set(weeklyCommittedPlatform.competitiveWorld.moves.map(move => move.id));
    const competitiveCommittedPlatform = commitStreamingCompetitiveWorldWeek(
        weeklyCommittedPlatform,
        player,
        absoluteWeek,
    );
    const newRivalMoves = competitiveCommittedPlatform.competitiveWorld.moves.filter(
        move => !rivalMoveIdsBeforeCommit.has(move.id),
    );
    let platformWarsCommittedPlayer = player;
    for (const move of newRivalMoves) {
        const canonicalPlatform = platformWarsCommittedPlayer.world.platforms?.[move.platformId];
        if (!canonicalPlatform) continue;
        const committedExternalCost = commitPlatformAiExternalCommitment({
            player: platformWarsCommittedPlayer,
            platform: canonicalPlatform,
            move,
            absoluteWeek,
        });
        if (!committedExternalCost.changed) continue;
        platformWarsCommittedPlayer = {
            ...platformWarsCommittedPlayer,
            world: {
                ...platformWarsCommittedPlayer.world,
                platforms: {
                    ...platformWarsCommittedPlayer.world.platforms,
                    [move.platformId]: committedExternalCost.platform,
                },
            },
        };
    }
    const quarterCommittedPlatform = commitStreamingQuarterSeasonCycle(
        competitiveCommittedPlatform,
        platformWarsCommittedPlayer,
        snapshot,
    );
    const infrastructureOperationsCommittedPlatform = commitStreamingInfrastructureOperationsWeek(
        quarterCommittedPlatform,
        platformWarsCommittedPlayer,
        snapshot,
    );
    const crisisCommittedPlatform = commitStreamingCrisisSecurityWeek(
        infrastructureOperationsCommittedPlatform,
        platformWarsCommittedPlayer,
        snapshot,
    );
    const publicMarketCommittedPlatform = commitStreamingPublicMarketWeek(
        crisisCommittedPlatform,
        platformWarsCommittedPlayer,
        snapshot,
    );
    const ownedStreamingPlatform = commitStreamingInfrastructureProgressionWeek(
        publicMarketCommittedPlatform,
        platformWarsCommittedPlayer,
        snapshot,
    );

    return {
        player: { ...platformWarsCommittedPlayer, ownedStreamingPlatform },
        processed: true,
        snapshot,
    };
};
