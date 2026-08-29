import type {
    OwnedStreamingMarketOperation,
    PlatformId,
    Player,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    STREAMING_DAY_ONE_MARKETS,
    getStreamingCountryMarketProfile,
    getStreamingDayOneRegionIds,
    normalizeStreamingDayOneMarketIds,
} from '../streamingDayOneMarkets';
import {
    activateStreamingMarketOperation,
    advanceStreamingMarketOperation,
    createStreamingCountryMarketOperation,
    getStreamingMarketClearanceDuration,
    resolveStreamingMarketRequirementCore,
    resumeStreamingMarketOperationCore,
    startStreamingMarketOperation,
} from '../streamingMarketsCore';
import { fullCurrencyToMillions } from '../streamingRightsCore';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { clampPlatformContentPlanSupport } from './platformAiResearch';
import { appendPlatformAiDecisions, normalizePlatformAiState, resolvePlatformController } from './platformAiState';
import { createPlatformAiEfficiencySnapshot } from './platformAiEfficiency';
import { getPlatformAiOperatingProfile } from './platformAiOperatingProfiles';
import { getPlatformAiSpendingRestrictions } from './platformAiFinancing';

export interface PlatformAiMarketInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}

export interface PlatformAiMarketChoice {
    countryId: string;
    priority: number;
}

export interface CommitPlatformMarketInput extends PlatformAiMarketInput {
    countryId?: string | null;
}

export interface PlatformAiMarketMutationResult {
    world: WorldState;
    changed: boolean;
    changedOperations: OwnedStreamingMarketOperation[];
    /** Backward-compatible alias for the last changed or relevant operation. */
    operation: OwnedStreamingMarketOperation | null;
    reason: 'COMMITTED' | 'PROGRESSED' | 'PLAYER_CONTROLLED' | 'PLATFORM_NOT_FOUND' | 'NO_CHOICE' | 'DUPLICATE' | 'INSUFFICIENT_CASH' | 'UNCHANGED';
}

const updatePlatform = (world: WorldState, platformId: PlatformId, platform: NonNullable<WorldState['platforms']>[PlatformId]): WorldState => ({
    ...world,
    platforms: { ...world.platforms!, [platformId]: platform },
});

const applyMarketCostMultiplier = (
    costs: OwnedStreamingMarketOperation['plannedCosts'],
    multiplier: number,
): OwnedStreamingMarketOperation['plannedCosts'] => {
    const rights = Math.round(costs.rights * multiplier);
    const compliance = Math.round(costs.compliance * multiplier);
    const localization = Math.round(costs.localization * multiplier);
    const infrastructure = Math.round(costs.infrastructure * multiplier);
    const other = Math.round(costs.other * multiplier);
    return {
        rights,
        compliance,
        localization,
        infrastructure,
        other,
        total: rights + compliance + localization + infrastructure + other,
    };
};

export const getPlatformActiveCountryIds = (
    world: WorldState,
    platformId: PlatformId,
): string[] => normalizeStreamingDayOneMarketIds(world.platforms?.[platformId]?.ai?.capabilities.activeCountryIds);

export const getPlatformActiveRegionIds = (
    world: WorldState,
    platformId: PlatformId,
) => getStreamingDayOneRegionIds(getPlatformActiveCountryIds(world, platformId));

export const choosePlatformMarketExpansion = (
    input: PlatformAiMarketInput,
): PlatformAiMarketChoice | null => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') return null;
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return null;
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    if (ai.status !== 'ACTIVE' || getPlatformAiSpendingRestrictions(platform, input.absoluteWeek).blocksExpansion) return null;
    const unavailable = new Set([
        ...ai.capabilities.activeCountryIds,
        ...ai.marketOperations.map(operation => operation.countryId).filter((id): id is string => Boolean(id)),
    ]);
    const profile = PLATFORM_AI_PROFILES[input.platformId];
    const concurrentExpansionLoad = ai.marketOperations.filter(operation => (
        !['ACTIVE', 'EXITED'].includes(operation.status)
    )).length;
    const choices = STREAMING_DAY_ONE_MARKETS.filter(market => !unavailable.has(market.id)).map(market => {
        const dossier = getStreamingCountryMarketProfile(market.id)!;
        const marketScale = Math.log10(Math.max(1, market.streamingAudience)) * 8;
        const growth = market.annualGrowthPercent * 2.2;
        const strategicFit = profile.competence.strategy * 4 + profile.competence.commercial * 3;
        const competition = dossier.competitors.reduce((sum, rival) => sum + rival.watchSharePercent, 0) * 0.12;
        const costStrain = fullCurrencyToMillions(dossier.entryCosts.total) / Math.max(1, platform.cashReserve) * 100;
        const audienceLanguages = dossier.languageDistribution.filter(item => item.audiencePercent >= 20);
        const languageGap = audienceLanguages.reduce((penalty, item) => {
            const capability = ai.languageCapabilities.find(candidate => candidate.languageId === normalizeStreamingLanguageId(item.language));
            if (!capability?.subtitleLevel) return penalty + item.audiencePercent * 0.18;
            if (dossier.localizationPreference === 'DUB_FIRST' && !capability.dubbingLevel) return penalty + item.audiencePercent * 0.08;
            return penalty;
        }, 0);
        const upcomingSlateFit = ai.slate.filter(plan => (
            !['RELEASED', 'CANCELLED', 'SOLD'].includes(plan.status)
        )).reduce((score, plan) => (
            score + (dossier.localizationPreference === 'DUB_FIRST' && ['G', 'PG'].includes(plan.targetAudience) ? 1.5 : 0.75)
        ), 0);
        const operationalLoad = concurrentExpansionLoad * 6 + ai.localizationJobs.filter(job => (
            job.status === 'WAITING_FOR_FUNDS' || job.status === 'IN_PROGRESS'
        )).length * 0.8;
        return {
            countryId: market.id,
            priority: Math.round((marketScale + growth + strategicFit + upcomingSlateFit - competition - costStrain - languageGap - operationalLoad) * 100) / 100,
        };
    });
    return choices.sort((left, right) => right.priority - left.priority || left.countryId.localeCompare(right.countryId))[0] || null;
};

export const commitPlatformMarketExpansion = (
    input: CommitPlatformMarketInput,
): PlatformAiMarketMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    if (ai.status !== 'ACTIVE' || getPlatformAiSpendingRestrictions(platform, input.absoluteWeek).blocksExpansion) {
        return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'NO_CHOICE' };
    }
    const countryId = normalizeStreamingDayOneMarketIds([input.countryId || choosePlatformMarketExpansion(input)?.countryId])[0];
    if (!countryId) return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'NO_CHOICE' };
    const existing = ai.marketOperations.find(operation => operation.countryId === countryId && operation.status !== 'EXITED');
    if (existing || ai.capabilities.activeCountryIds.includes(countryId)) {
        return { world: input.world, changed: false, changedOperations: [], operation: existing || null, reason: 'DUPLICATE' };
    }
    const planned = createStreamingCountryMarketOperation({
        seed: `platform-ai:${input.platformId}`,
        countryId,
        entryKind: 'EXPANSION',
        absoluteWeek: input.absoluteWeek,
        source: 'PLATFORM_AI',
    });
    if (!planned) return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'NO_CHOICE' };
    const operatingProfile = getPlatformAiOperatingProfile(input.platformId);
    const efficiencySnapshot = createPlatformAiEfficiencySnapshot(
        fullCurrencyToMillions(planned.plannedCosts.total),
        getStreamingMarketClearanceDuration(planned.countryProfile!, planned.id),
        operatingProfile.efficiency,
        'MARKET_ENTRY',
    );
    const efficientPlannedCosts = applyMarketCostMultiplier(
        planned.plannedCosts,
        efficiencySnapshot.costMultiplier,
    );
    const platformAiPartnership = operatingProfile.efficiency.localPartnershipEligible
        && (planned.countryProfile?.localContentObligationPercent || 0) >= 20
        ? {
            partnerId: createDeterministicId('platform_ai_local_partner', input.platformId, countryId),
            weeklyPremium: Math.max(100_000, Math.round(planned.weeklyOperatingCost * 0.08)),
            performanceCeilingPercent: 92,
        }
        : null;
    const efficientPlanned: OwnedStreamingMarketOperation = {
        ...planned,
        plannedCosts: efficientPlannedCosts,
        platformAiEfficiencySnapshot: efficiencySnapshot,
        platformAiPartnership,
    };
    const costMillions = fullCurrencyToMillions(efficientPlannedCosts.total);
    if (platform.cashReserve < costMillions) {
        return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'INSUFFICIENT_CASH' };
    }
    const startedOperation = startStreamingMarketOperation(efficientPlanned, input.absoluteWeek);
    const operation: OwnedStreamingMarketOperation = {
        ...startedOperation,
        approvalReadyAtAbsoluteWeek: input.absoluteWeek + efficiencySnapshot.appliedLeadWeeks,
        weeklyOperatingCost: startedOperation.weeklyOperatingCost + (platformAiPartnership?.weeklyPremium || 0),
        platformAiEfficiencySnapshot: efficiencySnapshot,
        platformAiPartnership,
    };
    const decision = {
        id: createDeterministicId('platform_ai_decision', input.platformId, countryId, 'MARKET_EXPANSION_COMMITTED'),
        absoluteWeek: input.absoluteWeek,
        type: 'MARKET_EXPANSION_COMMITTED',
        summary: `${platform.name} committed to ${planned.countryProfile?.country || countryId}.`,
        reason: 'The expansion cleared the platform runway and capability gates.',
        cashImpactMillions: -costMillions,
    };
    const nextPlatform = {
        ...platform,
        cashReserve: platform.cashReserve - costMillions,
        ai: {
            ...ai,
            marketOperations: [...ai.marketOperations, operation],
            decisionHistory: appendPlatformAiDecisions(ai.decisionHistory, [decision]),
        },
    };
    return { world: updatePlatform(input.world, input.platformId, nextPlatform), changed: true, changedOperations: [operation], operation, reason: 'COMMITTED' };
};

export const progressPlatformMarketExpansion = (
    input: PlatformAiMarketInput,
): PlatformAiMarketMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    let cashReserve = platform.cashReserve;
    const changedOperations: OwnedStreamingMarketOperation[] = [];
    const marketOperations = ai.marketOperations.map(operation => {
        if (operation.lastProcessedAbsoluteWeek === input.absoluteWeek || operation.status === 'ACTIVE' || operation.status === 'EXITED') return operation;
        if (operation.status === 'AWAITING_FUNDING' && operation.clearance?.outcome === 'ADDITIONAL_REQUIREMENT') {
            const requirementMillions = fullCurrencyToMillions(operation.clearance.additionalPayment);
            if (cashReserve < requirementMillions) return operation;
            cashReserve -= requirementMillions;
            const resolved = resolveStreamingMarketRequirementCore(operation, input.absoluteWeek);
            if (resolved !== operation) changedOperations.push(resolved);
            return resolved;
        }
        if (operation.status === 'SUSPENDED' && operation.clearance?.outcome === 'TEMPORARILY_REJECTED') {
            const resumed = resumeStreamingMarketOperationCore(operation, input.absoluteWeek);
            if (resumed !== operation) changedOperations.push(resumed);
            return resumed;
        }
        const progressed = advanceStreamingMarketOperation(operation, input.absoluteWeek).operation;
        const activated = progressed.status === 'READY'
            ? activateStreamingMarketOperation(progressed, input.absoluteWeek)
            : progressed;
        if (activated !== operation) changedOperations.push(activated);
        return activated;
    });
    if (!changedOperations.length) return { world: input.world, changed: false, changedOperations: [], operation: null, reason: 'UNCHANGED' };
    const activeFromOperations = marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!);
    const activeCountryIds = normalizeStreamingDayOneMarketIds(activeFromOperations);
    const capabilities = { ...ai.capabilities, activeCountryIds };
    const slate = ai.slate.map(plan => clampPlatformContentPlanSupport(plan, capabilities));
    const nextPlatform = {
        ...platform,
        cashReserve,
        ai: { ...ai, capabilities, marketOperations, slate },
    };
    return {
        world: updatePlatform(input.world, input.platformId, nextPlatform),
        changed: true,
        changedOperations,
        operation: changedOperations.at(-1) || null,
        reason: 'PROGRESSED',
    };
};
