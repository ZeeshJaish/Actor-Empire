import type {
    PlatformAiCapabilities,
    PlatformAiContentPlan,
    PlatformAiLocalizationLevel,
    PlatformAiResearchItem,
    PlatformId,
    Player,
    StreamingResearchLifecycleStage,
    StreamingTechnologyBuildMode,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeStreamingDayOneMarketIds } from '../streamingDayOneMarkets';
import {
    advanceStreamingResearchSchedule,
    beginStreamingResearchInstallationSchedule,
    completeStreamingResearchInstallationSchedule,
    markStreamingResearchReadyToInstallSchedule,
    previewStreamingResearchIpCost,
    previewStreamingResearchProgram,
} from '../streamingResearchCore';
import { STREAMING_RESEARCH_DEFINITIONS } from '../streamingResearchLifecycle';
import {
    STREAMING_TECHNOLOGY_DEFINITIONS,
    previewStreamingTechnologyProject,
} from '../streamingTechnologyCampus';
import { fullCurrencyToMillions } from '../streamingRightsCore';
import {
    appendPlatformAiDecisions,
    getPlatformAiLocalizationCoverageFromContentOperations,
    normalizePlatformAiLocalizationPromises,
    normalizePlatformAiState,
    resolvePlatformController,
} from './platformAiState';
import { createPlatformAiEfficiencySnapshot } from './platformAiEfficiency';
import { getPlatformAiOperatingProfile } from './platformAiOperatingProfiles';
import {
    choosePlatformResearchPortfolio,
    getPlatformAiResearchCapacity,
    getPlatformAiForwardObligations,
    type PlatformAiResearchChoice,
    type PlatformAiResearchPortfolioInput,
} from './platformAiResearchPortfolio';

export interface PlatformAiResearchInput extends PlatformAiResearchPortfolioInput {}

export type { PlatformAiResearchChoice } from './platformAiResearchPortfolio';

export interface CommitPlatformResearchInput extends PlatformAiResearchInput {
    choice?: PlatformAiResearchChoice | null;
}

export interface PlatformAiResearchMutationResult {
    world: WorldState;
    changed: boolean;
    changedItems: PlatformAiResearchItem[];
    /** Backward-compatible alias for the last changed or relevant item. */
    item: PlatformAiResearchItem | null;
    reason: 'COMMITTED' | 'PROGRESSED' | 'PLAYER_CONTROLLED' | 'PLATFORM_NOT_FOUND' | 'NO_CHOICE' | 'MAX_ACTIVE' | 'DISTRESSED' | 'DUPLICATE' | 'INSUFFICIENT_CASH' | 'UNCHANGED';
}

const ACTIVE_RESEARCH_STAGES = new Set<StreamingResearchLifecycleStage>([
    'RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP', 'READY_TO_INSTALL', 'INSTALLING',
]);
const LOCALIZATION_RANK: Record<PlatformAiLocalizationLevel, number> = {
    NONE: 0,
    SUBTITLES: 1,
    DUBS_AND_SUBTITLES: 2,
};

const applyResearchLeadTime = (
    researchWeeks: number,
    prototypeWeeks: number,
    testWeeks: number,
    appliedTotalWeeks: number,
): { researchWeeks: number; prototypeWeeks: number; testWeeks: number } => {
    const durations = [researchWeeks, prototypeWeeks, testWeeks];
    let reduction = Math.max(0, durations.reduce((sum, weeks) => sum + weeks, 0) - appliedTotalWeeks);
    for (let index = 0; index < durations.length && reduction > 0; index += 1) {
        const available = Math.max(0, durations[index] - 1);
        const applied = Math.min(available, reduction);
        durations[index] -= applied;
        reduction -= applied;
    }
    return { researchWeeks: durations[0], prototypeWeeks: durations[1], testWeeks: durations[2] };
};

export const resolvePlatformLocalizationLevel = (
    capabilities: PlatformAiCapabilities,
): PlatformAiLocalizationLevel => {
    if (capabilities.subtitleCoveragePercent < 35) return 'NONE';
    if (capabilities.dubCoveragePercent < 20) return 'SUBTITLES';
    return 'DUBS_AND_SUBTITLES';
};

/** Canonical Phase 5 recurring research cost. Installation technology costs are accounted separately. */
export const getPlatformResearchRecurringCostMillions = (
    item: PlatformAiResearchItem,
): number => item.stage === 'OPERATING'
    ? item.researchWeeklyOperatingCostMillions + item.licenseWeeklyCostMillions
    : 0;

export const clampPlatformContentPlanSupport = (
    plan: PlatformAiContentPlan,
    capabilities: PlatformAiCapabilities,
): PlatformAiContentPlan => {
    const supportedLocalization = resolvePlatformLocalizationLevel(capabilities);
    const requestedLocalization = plan.localizationLevel || 'NONE';
    const historical = ['RELEASED', 'CANCELLED', 'SOLD'].includes(plan.status);
    const localizationLevel = historical
        ? requestedLocalization
        : LOCALIZATION_RANK[requestedLocalization] <= LOCALIZATION_RANK[supportedLocalization]
            ? requestedLocalization
            : supportedLocalization;
    const supportedCountries = new Set(normalizeStreamingDayOneMarketIds(capabilities.activeCountryIds));
    const releaseCountryIds = normalizeStreamingDayOneMarketIds(plan.releaseCountryIds);
    const nextReleaseCountryIds = historical
        ? releaseCountryIds
        : releaseCountryIds.filter(countryId => supportedCountries.has(countryId));
    const releaseCountrySet = new Set(nextReleaseCountryIds);
    const supportedLocalizationRequirements = historical
        ? plan.localizationRequirements
        : localizationLevel === 'NONE'
            ? []
            : (plan.localizationRequirements || []).flatMap(requirement => {
                if (localizationLevel === 'SUBTITLES' && requirement.mode !== 'SUBTITLE') return [];
                const countryIds = normalizeStreamingDayOneMarketIds(requirement.countryIds)
                    .filter(countryId => releaseCountrySet.has(countryId)).sort();
                return countryIds.length ? [{ ...requirement, countryIds }] : [];
            });
    const localizationRequirements = normalizePlatformAiLocalizationPromises(
        supportedLocalizationRequirements,
        nextReleaseCountryIds,
        localizationLevel,
    );
    return {
        ...plan,
        localizationLevel,
        localizationRequirements,
        releaseCountryIds: nextReleaseCountryIds,
    };
};

const updatePlatform = (world: WorldState, platformId: PlatformId, platform: NonNullable<WorldState['platforms']>[PlatformId]): WorldState => ({
    ...world,
    platforms: { ...world.platforms!, [platformId]: platform },
});

export const choosePlatformResearch = (
    input: PlatformAiResearchInput,
): PlatformAiResearchChoice | null => choosePlatformResearchPortfolio(input).choices[0] ?? null;

export const commitPlatformResearch = (
    input: CommitPlatformResearchInput,
): PlatformAiResearchMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, changedItems: [], item: null, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, changedItems: [], item: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    if (ai.status !== 'ACTIVE') return { world: input.world, changed: false, changedItems: [], item: null, reason: 'DISTRESSED' };
    const capacity = getPlatformAiResearchCapacity(input);
    if (capacity.availableSlots <= 0) {
        const capacityReason = capacity.blockedReason === 'DISTRESSED'
            ? 'DISTRESSED'
            : capacity.blockedReason === 'RUNWAY'
                ? 'INSUFFICIENT_CASH'
                : 'MAX_ACTIVE';
        return { world: input.world, changed: false, changedItems: [], item: null, reason: capacityReason };
    }
    if (ai.researchQueue.filter(item => ACTIVE_RESEARCH_STAGES.has(item.stage)).length >= capacity.capacity) {
        return { world: input.world, changed: false, changedItems: [], item: null, reason: 'MAX_ACTIVE' };
    }
    const choice = input.choice ?? choosePlatformResearch(input);
    if (!choice) return { world: input.world, changed: false, changedItems: [], item: null, reason: 'NO_CHOICE' };
    const researchDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === choice.researchDefinitionId);
    const technologyDefinition = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === choice.technologyDefinitionId);
    if (!researchDefinition || !technologyDefinition || researchDefinition.mappedTechnologyId !== technologyDefinition.id) {
        return { world: input.world, changed: false, changedItems: [], item: null, reason: 'NO_CHOICE' };
    }
    const currentLevel = ai.capabilities.technologyLevels[technologyDefinition.branch] || 0;
    const prerequisite = technologyDefinition.prerequisiteId
        ? STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === technologyDefinition.prerequisiteId)
        : null;
    if (currentLevel >= technologyDefinition.targetLevel || prerequisite && currentLevel < prerequisite.targetLevel) {
        return { world: input.world, changed: false, changedItems: [], item: null, reason: 'NO_CHOICE' };
    }
    const idempotencyKey = `platform-ai-research:${input.platformId}:${researchDefinition.id}`;
    const existing = ai.researchQueue.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { world: input.world, changed: false, changedItems: [], item: existing, reason: 'DUPLICATE' };
    const researchPreview = previewStreamingResearchProgram(researchDefinition, choice.buildMode);
    const technologyPreview = previewStreamingTechnologyProject(technologyDefinition, choice.buildMode);
    const operatingProfile = getPlatformAiOperatingProfile(input.platformId);
    const efficiencySnapshot = createPlatformAiEfficiencySnapshot(
        fullCurrencyToMillions(researchPreview.researchCost),
        researchPreview.researchWeeks + researchPreview.prototypeWeeks + researchPreview.testWeeks,
        operatingProfile.efficiency,
        'RESEARCH',
    );
    const installationEfficiencySnapshot = createPlatformAiEfficiencySnapshot(
        fullCurrencyToMillions(technologyPreview.capitalCost),
        technologyPreview.constructionWeeks,
        operatingProfile.efficiency,
        'INSTALLATION',
    );
    const appliedResearchLeadTime = applyResearchLeadTime(
        researchPreview.researchWeeks,
        researchPreview.prototypeWeeks,
        researchPreview.testWeeks,
        efficiencySnapshot.appliedLeadWeeks,
    );
    const researchCostMillions = efficiencySnapshot.appliedCostMillions;
    const lifecycleCostMillions = researchCostMillions
        + fullCurrencyToMillions(previewStreamingResearchIpCost({ patentCost: researchPreview.patentCost }, choice.ipStrategy))
        + installationEfficiencySnapshot.appliedCostMillions;
    if (
        platform.cashReserve < researchCostMillions
        || platform.cashReserve - getPlatformAiForwardObligations(input) - lifecycleCostMillions
            < capacity.requiredReserveMillions
    ) {
        return { world: input.world, changed: false, changedItems: [], item: null, reason: 'INSUFFICIENT_CASH' };
    }
    const item: PlatformAiResearchItem = {
        id: createDeterministicId('platform_ai_research', input.platformId, researchDefinition.id),
        idempotencyKey,
        researchDefinitionId: researchDefinition.id,
        technologyDefinitionId: technologyDefinition.id,
        branch: technologyDefinition.branch,
        targetLevel: technologyDefinition.targetLevel,
        buildMode: choice.buildMode,
        stage: 'RESEARCHING',
        ipStrategy: choice.ipStrategy,
        researchCostMillions,
        ipCostMillions: fullCurrencyToMillions(previewStreamingResearchIpCost({ patentCost: researchPreview.patentCost }, choice.ipStrategy)),
        installationCostMillions: installationEfficiencySnapshot.appliedCostMillions,
        researchWeeklyOperatingCostMillions: fullCurrencyToMillions(researchPreview.weeklyOperatingCost),
        licenseWeeklyCostMillions: choice.ipStrategy === 'LICENSE'
            ? fullCurrencyToMillions(researchPreview.licenseWeeklyCost)
            : 0,
        technologyWeeklyOperatingCostMillions: fullCurrencyToMillions(technologyPreview.weeklyOperatingCostDelta),
        efficiencySnapshot,
        installationEfficiencySnapshot,
        researchWeeks: appliedResearchLeadTime.researchWeeks,
        prototypeWeeks: appliedResearchLeadTime.prototypeWeeks,
        testWeeks: appliedResearchLeadTime.testWeeks,
        installationWeeks: installationEfficiencySnapshot.appliedLeadWeeks,
        startedAtAbsoluteWeek: input.absoluteWeek,
        stageStartedAtAbsoluteWeek: input.absoluteWeek,
        stageReadyAtAbsoluteWeek: input.absoluteWeek + appliedResearchLeadTime.researchWeeks,
        completedAtAbsoluteWeek: null,
        lastProcessedAbsoluteWeek: input.absoluteWeek,
    };
    const decision = {
        id: createDeterministicId('platform_ai_decision', input.platformId, idempotencyKey),
        absoluteWeek: input.absoluteWeek,
        type: 'RESEARCH_COMMITTED',
        summary: `${researchDefinition.title} entered research.`,
        reason: `Priority ${choice.priority.toFixed(2)}; installation benefit remains locked.`,
        cashImpactMillions: -researchCostMillions,
    };
    const nextPlatform = {
        ...platform,
        cashReserve: platform.cashReserve - researchCostMillions,
        ai: {
            ...ai,
            researchQueue: [...ai.researchQueue, item],
            decisionHistory: appendPlatformAiDecisions(ai.decisionHistory, [decision]),
        },
    };
    return { world: updatePlatform(input.world, input.platformId, nextPlatform), changed: true, changedItems: [item], item, reason: 'COMMITTED' };
};

export const progressPlatformResearch = (
    input: PlatformAiResearchInput,
): PlatformAiResearchMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, changedItems: [], item: null, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, changedItems: [], item: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    let cashReserve = platform.cashReserve;
    let technologyLevels = { ...ai.capabilities.technologyLevels };
    const changedItems: PlatformAiResearchItem[] = [];
    const researchQueue = ai.researchQueue.map(item => {
        if (item.stage === 'OPERATING' || item.lastProcessedAbsoluteWeek === input.absoluteWeek || input.absoluteWeek < item.stageReadyAtAbsoluteWeek) return item;
        const ordinaryProgress = advanceStreamingResearchSchedule(item, input.absoluteWeek);
        if (ordinaryProgress !== item) {
            const progressed: PlatformAiResearchItem = {
                ...ordinaryProgress,
                lastProcessedAbsoluteWeek: input.absoluteWeek,
            };
            changedItems.push(progressed);
            return progressed;
        }
        if (item.stage === 'AWAITING_IP') {
            if (cashReserve < item.ipCostMillions) return item;
            cashReserve -= item.ipCostMillions;
            const progressed: PlatformAiResearchItem = {
                ...markStreamingResearchReadyToInstallSchedule(item, item.ipStrategy, input.absoluteWeek),
                lastProcessedAbsoluteWeek: input.absoluteWeek,
            };
            changedItems.push(progressed);
            return progressed;
        }
        if (item.stage === 'READY_TO_INSTALL') {
            if (cashReserve < item.installationCostMillions) return item;
            cashReserve -= item.installationCostMillions;
            const progressed: PlatformAiResearchItem = {
                ...beginStreamingResearchInstallationSchedule(item, input.absoluteWeek, item.installationWeeks),
                lastProcessedAbsoluteWeek: input.absoluteWeek,
            };
            changedItems.push(progressed);
            return progressed;
        }
        if (item.stage === 'INSTALLING') {
            technologyLevels = { ...technologyLevels, [item.branch]: item.targetLevel };
            const progressed: PlatformAiResearchItem = {
                ...completeStreamingResearchInstallationSchedule(item, input.absoluteWeek),
                lastProcessedAbsoluteWeek: input.absoluteWeek,
            };
            changedItems.push(progressed);
            return progressed;
        }
        return item;
    });
    if (!changedItems.length) return { world: input.world, changed: false, changedItems: [], item: null, reason: 'UNCHANGED' };
    const capabilities = {
        ...ai.capabilities,
        technologyLevels,
        ...getPlatformAiLocalizationCoverageFromContentOperations(technologyLevels.CONTENT_OPERATIONS),
    };
    const slate = ai.slate.map(plan => clampPlatformContentPlanSupport(plan, capabilities));
    const nextPlatform = {
        ...platform,
        cashReserve,
        ai: { ...ai, capabilities, researchQueue, slate },
    };
    return {
        world: updatePlatform(input.world, input.platformId, nextPlatform),
        changed: true,
        changedItems,
        item: changedItems.at(-1) || null,
        reason: 'PROGRESSED',
    };
};
