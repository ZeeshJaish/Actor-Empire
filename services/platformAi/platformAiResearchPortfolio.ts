import type {
    PlatformAiCompanyScale,
    PlatformId,
    Player,
    StreamingTechnologyBuildMode,
    WorldState,
} from '../../types';
import { normalizeStreamingDayOneMarketIds } from '../streamingDayOneMarkets';
import { previewStreamingResearchIpCost, previewStreamingResearchProgram } from '../streamingResearchCore';
import { STREAMING_RESEARCH_DEFINITIONS } from '../streamingResearchLifecycle';
import { fullCurrencyToMillions } from '../streamingRightsCore';
import {
    STREAMING_TECHNOLOGY_DEFINITIONS,
    previewStreamingTechnologyProject,
} from '../streamingTechnologyCampus';
import { getPlatformAiOperatingProfile, type PlatformAiOperatingProfile } from './platformAiOperatingProfiles';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { normalizePlatformAiState, resolvePlatformController } from './platformAiState';
import { createPlatformAiEfficiencySnapshot } from './platformAiEfficiency';
import { getPlatformAiSpendingRestrictions } from './platformAiFinancing';

export interface PlatformAiResearchChoice {
    researchDefinitionId: string;
    technologyDefinitionId: string;
    buildMode: StreamingTechnologyBuildMode;
    ipStrategy: 'PATENT' | 'LICENSE';
    priority: number;
}

export interface PlatformAiResearchPortfolioInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
    /** Audit/configuration seam for future fictional platforms; normal play uses the canonical resolver. */
    operatingProfileOverride?: PlatformAiOperatingProfile;
}

export interface PlatformAiResearchCapacityResult {
    baseCapacity: number;
    bonusCapacity: number;
    capacity: number;
    activeCount: number;
    availableSlots: number;
    requiredReserveMillions: number;
    forwardObligationsMillions: number;
    blockedReason: 'DISTRESSED' | 'CAPACITY' | 'RUNWAY' | null;
}

export interface PlatformAiResearchPortfolioResult extends PlatformAiResearchCapacityResult {
    choices: PlatformAiResearchChoice[];
    projectedCashAfter: number;
}

const ACTIVE_RESEARCH_STAGES = new Set([
    'RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP', 'READY_TO_INSTALL', 'INSTALLING',
]);

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;

const baseCapacityForScale = (scale: PlatformAiCompanyScale): number => (
    scale === 'REGIONAL' ? 1 : scale === 'GLOBAL' ? 3 : 2
);

const buildModeFor = (platformId: PlatformId): StreamingTechnologyBuildMode => {
    const risk = PLATFORM_AI_PROFILES[platformId].riskTolerance;
    return risk >= 0.75 ? 'SPRINT' : risk < 0.62 ? 'HARDENED' : 'BALANCED';
};

const ipStrategyFor = (platformId: PlatformId): 'PATENT' | 'LICENSE' => (
    PLATFORM_AI_PROFILES[platformId].competence.technology >= 9 ? 'PATENT' : 'LICENSE'
);

export const getPlatformAiForwardObligations = (
    input: PlatformAiResearchPortfolioInput,
): number => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return 0;
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    const research = ai.researchQueue.reduce((sum, item) => {
        const remaining = ['RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP'].includes(item.stage)
            ? item.ipCostMillions + item.installationCostMillions
            : item.stage === 'READY_TO_INSTALL'
                ? item.installationCostMillions
                : 0;
        return sum + remaining;
    }, 0);
    const heldObligations = ai.pendingOneTimeObligations
        .filter(obligation => obligation.status === 'HELD')
        .reduce((sum, obligation) => sum + obligation.amountMillions, 0);
    const content = ai.slate
        .filter(plan => ['GREENLIT', 'IN_PRODUCTION'].includes(plan.status))
        .reduce((sum, plan) => sum + Math.max(0, plan.productionFundingMillions - plan.paidSpendMillions), 0);
    const activeMarketOperations = ai.marketOperations
        .filter(operation => operation.status === 'ACTIVE')
        .reduce((sum, operation) => sum + fullCurrencyToMillions(operation.weeklyOperatingCost) * 4, 0);
    const protectedLocalizationObligations = new Set(ai.pendingOneTimeObligations.map(item => item.id));
    const unledgeredLocalization = ai.localizationJobs
        .filter(job => job.status === 'WAITING_FOR_FUNDS' && !protectedLocalizationObligations.has(job.obligationId))
        .reduce((sum, job) => sum + job.costMillions, 0);
    return roundMillions(research + heldObligations + content + activeMarketOperations + unledgeredLocalization);
};

export const getPlatformAiResearchCapacity = (
    input: PlatformAiResearchPortfolioInput,
): PlatformAiResearchCapacityResult => {
    const operatingProfile = input.operatingProfileOverride ?? getPlatformAiOperatingProfile(input.platformId);
    const sourcePlatform = input.world.platforms?.[input.platformId];
    const baseCapacity = baseCapacityForScale(operatingProfile.scale);
    if (!sourcePlatform) {
        return {
            baseCapacity,
            bonusCapacity: 0,
            capacity: baseCapacity,
            activeCount: 0,
            availableSlots: 0,
            requiredReserveMillions: 0,
            forwardObligationsMillions: 0,
            blockedReason: 'RUNWAY',
        };
    }
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    const activeCount = ai.researchQueue.filter(item => ACTIVE_RESEARCH_STAGES.has(item.stage)).length;
    const forwardObligationsMillions = getPlatformAiForwardObligations(input);
    const latestReserveTarget = ai.financeHistory.at(-1)?.reserveTargetMillions ?? 0;
    const requiredReserveMillions = roundMillions(Math.max(
        PLATFORM_AI_PROFILES[input.platformId].baseWeeklyOperationsMillions * 4,
        latestReserveTarget,
    ));
    const uncommittedCash = platform.cashReserve - forwardObligationsMillions;
    const bonusCapacity = operatingProfile.researchOrganizationLevel >= 8
        && uncommittedCash >= requiredReserveMillions * 2.5
        ? 1
        : 0;
    const capacity = Math.min(4, baseCapacity + bonusCapacity);
    const blockedReason = ai.status !== 'ACTIVE'
        || getPlatformAiSpendingRestrictions(platform, input.absoluteWeek).blocksNewResearch
        ? 'DISTRESSED' as const
        : activeCount >= capacity
            ? 'CAPACITY' as const
            : uncommittedCash < requiredReserveMillions
                ? 'RUNWAY' as const
                : null;
    return {
        baseCapacity,
        bonusCapacity,
        capacity,
        activeCount,
        availableSlots: blockedReason === null ? Math.max(0, capacity - activeCount) : 0,
        requiredReserveMillions,
        forwardObligationsMillions,
        blockedReason,
    };
};

const buildEligibleChoices = (
    input: PlatformAiResearchPortfolioInput,
): PlatformAiResearchChoice[] => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return [];
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    const queuedDefinitionIds = new Set(ai.researchQueue.map(item => item.researchDefinitionId));
    const profile = PLATFORM_AI_PROFILES[input.platformId];
    const buildMode = buildModeFor(input.platformId);
    const inactiveCountryCount = Math.max(
        0,
        normalizeStreamingDayOneMarketIds(input.operatingProfileOverride?.startingCountryIds).length
            - ai.capabilities.activeCountryIds.length,
    );
    return STREAMING_RESEARCH_DEFINITIONS.flatMap((researchDefinition): PlatformAiResearchChoice[] => {
        if (!researchDefinition.mappedTechnologyId || queuedDefinitionIds.has(researchDefinition.id)) return [];
        const technologyDefinition = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === researchDefinition.mappedTechnologyId);
        if (!technologyDefinition) return [];
        const currentLevel = ai.capabilities.technologyLevels[technologyDefinition.branch] || 0;
        if (currentLevel >= technologyDefinition.targetLevel) return [];
        const prerequisite = technologyDefinition.prerequisiteId
            ? STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === technologyDefinition.prerequisiteId)
            : null;
        if (prerequisite && currentLevel < prerequisite.targetLevel) return [];
        const researchPreview = previewStreamingResearchProgram(researchDefinition, buildMode);
        const localizationPressure = technologyDefinition.branch === 'CONTENT_OPERATIONS'
            ? Math.min(24, ai.slate.length * 3 + inactiveCountryCount * 2)
            : 0;
        const strategicNeed = technologyDefinition.branch === 'CONTENT_OPERATIONS'
            ? Math.min(100, ai.slate.length * 12 + localizationPressure)
            : technologyDefinition.branch === 'SECURITY'
                ? 72
                : technologyDefinition.branch === 'PLAYBACK_QUALITY'
                    ? 78
                    : 68;
        const capabilityGap = Math.min(100, (technologyDefinition.targetLevel - currentLevel) / Math.max(1, technologyDefinition.targetLevel) * 100);
        const profileAffinity = profile.competence.technology * 10;
        const rivalPressure = Math.max(0, (10 - profile.overallLevel) * 10);
        const cashStrain = fullCurrencyToMillions(researchPreview.researchCost) / Math.max(1, platform.cashReserve) * 100;
        const priority = strategicNeed * 0.45 + capabilityGap * 0.30 + profileAffinity * 0.15 + rivalPressure * 0.10 - cashStrain;
        return [{
            researchDefinitionId: researchDefinition.id,
            technologyDefinitionId: technologyDefinition.id,
            buildMode,
            ipStrategy: ipStrategyFor(input.platformId),
            priority: Math.round(priority * 100) / 100,
        }];
    }).sort((left, right) => (
        right.priority - left.priority
        || left.researchDefinitionId.localeCompare(right.researchDefinitionId)
    ));
};

const lifecycleCostMillions = (
    choice: PlatformAiResearchChoice,
    operatingProfile: PlatformAiOperatingProfile,
): number => {
    const researchDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === choice.researchDefinitionId);
    const technologyDefinition = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === choice.technologyDefinitionId);
    if (!researchDefinition || !technologyDefinition) return Number.POSITIVE_INFINITY;
    const researchPreview = previewStreamingResearchProgram(researchDefinition, choice.buildMode);
    const technologyPreview = previewStreamingTechnologyProject(technologyDefinition, choice.buildMode);
    const researchEfficiency = createPlatformAiEfficiencySnapshot(
        fullCurrencyToMillions(researchPreview.researchCost),
        researchPreview.researchWeeks + researchPreview.prototypeWeeks + researchPreview.testWeeks,
        operatingProfile.efficiency,
        'RESEARCH',
    );
    const installationEfficiency = createPlatformAiEfficiencySnapshot(
        fullCurrencyToMillions(technologyPreview.capitalCost),
        technologyPreview.constructionWeeks,
        operatingProfile.efficiency,
        'INSTALLATION',
    );
    return roundMillions(
        researchEfficiency.appliedCostMillions
        + fullCurrencyToMillions(previewStreamingResearchIpCost(
            { patentCost: researchPreview.patentCost },
            choice.ipStrategy,
        ))
        + installationEfficiency.appliedCostMillions,
    );
};

export const choosePlatformResearchPortfolio = (
    input: PlatformAiResearchPortfolioInput,
): PlatformAiResearchPortfolioResult => {
    const capacity = getPlatformAiResearchCapacity(input);
    const sourcePlatform = input.world.platforms?.[input.platformId];
    const projectedOpeningCash = sourcePlatform
        ? normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek).cashReserve
            - capacity.forwardObligationsMillions
        : 0;
    if (
        !sourcePlatform
        || resolvePlatformController(input.player, input.platformId) === 'PLAYER'
        || capacity.availableSlots <= 0
    ) {
        return { ...capacity, choices: [], projectedCashAfter: roundMillions(projectedOpeningCash) };
    }
    const choices: PlatformAiResearchChoice[] = [];
    const operatingProfile = input.operatingProfileOverride ?? getPlatformAiOperatingProfile(input.platformId);
    let projectedCashAfter = projectedOpeningCash;
    for (const candidate of buildEligibleChoices(input)) {
        if (choices.length >= capacity.availableSlots) break;
        const lifecycleCost = lifecycleCostMillions(candidate, operatingProfile);
        if (!Number.isFinite(lifecycleCost)) continue;
        if (projectedCashAfter - lifecycleCost < capacity.requiredReserveMillions) continue;
        choices.push(candidate);
        projectedCashAfter -= lifecycleCost;
    }
    return {
        ...capacity,
        choices,
        projectedCashAfter: roundMillions(projectedCashAfter),
    };
};
