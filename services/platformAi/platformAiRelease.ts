import type {
    BudgetTier,
    IndustryProductionCommitment,
    IndustryProject,
    OwnedStreamingCatalogLicense,
    PlatformAiAudienceSettlement,
    PlatformAiContentPlan,
    PlatformAiProjectStreamingWindow,
    PlatformAiReleaseEntry,
    PlatformAiReleasePattern,
    PlatformAiStreamingPerformance,
    PlatformId,
    PlatformState,
    Player,
    WorldState,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import {
    doesStreamingLicenseCoverCountry,
    getStreamingRightsContract,
    isStreamingLicenseActiveAt,
} from '../streamingRightsCore';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import {
    appendPlatformAiDecisions,
    normalizePlatformAiAudienceSettlements,
    normalizePlatformAiState,
    resolvePlatformController,
} from './platformAiState';
import { recordPlatformAiReleaseMemory } from './platformAiMemory';
import { getPlatformAiLocalizationRequirements } from './platformAiLocalizationCore';
import { resolvePlatformAiTitleCountryComprehension } from './platformAiLanguageCapabilities';
import { buildReadyPlatformAiReleasePassport } from './platformAiReleaseReadiness';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, value))
);

const round = (value: number, precision = 100): number => Math.round(value * precision) / precision;

/** Disclosed long-run balance thresholds, measured on the canonical 0-100 commercial score. */
export const PLATFORM_AI_HIT_COMMERCIAL_SCORE = 85;
export const PLATFORM_AI_FLOP_COMMERCIAL_SCORE = 74;
/**
 * A hit is measured against the audience scale and brand promise of the service
 * that released it. These public thresholds classify the same canonical
 * commercial score; they do not add quality, subscribers, or revenue.
 */
export const PLATFORM_AI_OUTCOME_THRESHOLDS: Record<PlatformId, { hit: number; flop: number }> = {
    NETFLIX: { hit: PLATFORM_AI_HIT_COMMERCIAL_SCORE, flop: PLATFORM_AI_FLOP_COMMERCIAL_SCORE },
    APPLE_TV: { hit: 85, flop: 81 },
    DISNEY_PLUS: { hit: 88.5, flop: 85 },
    HULU: { hit: 86, flop: 81.5 },
    YOUTUBE: { hit: 89, flop: 85.5 },
};

const activeCountryOperations = (platform: PlatformState): Map<string, NonNullable<PlatformState['ai']>['marketOperations'][number]> => (
    new Map(platform.ai!.marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => [operation.countryId!, operation]))
);

const relationshipFor = (
    plan: PlatformAiContentPlan,
): PlatformAiProjectStreamingWindow['platformRelationship'] => {
    if (plan.source === 'COMMISSIONED_ORIGINAL') return 'ORIGINAL_COMMISSIONER';
    if (plan.source === 'OWNED_STUDIO_TRANSFER') return 'OWNED_STUDIO';
    if (plan.source === 'CATALOGUE_ACQUISITION') return 'CATALOGUE_RIGHTSHOLDER';
    return 'LICENSEE';
};

const patternFor = (
    plan: PlatformAiContentPlan,
    mediaType: IndustryProject['mediaType'],
    requested: PlatformAiReleasePattern | undefined,
): PlatformAiReleasePattern => {
    if (mediaType === 'MOVIE') return 'MOVIE_SINGLE_PREMIERE';
    if (requested && requested !== 'MOVIE_SINGLE_PREMIERE') return requested;
    const roll = createDeterministicRng(`platform-ai-release-pattern:${plan.platformId}:${plan.id}`)();
    return roll < 0.34 ? 'SERIES_FULL_SEASON' : roll < 0.72 ? 'SERIES_WEEKLY' : 'SERIES_SPLIT_VOLUME';
};

const installmentWeeksFor = (
    pattern: PlatformAiReleasePattern,
    premiereAtAbsoluteWeek: number,
): number[] => {
    if (pattern === 'SERIES_WEEKLY') {
        return Array.from({ length: 8 }, (_, index) => premiereAtAbsoluteWeek + index);
    }
    if (pattern === 'SERIES_SPLIT_VOLUME') return [premiereAtAbsoluteWeek, premiereAtAbsoluteWeek + 4];
    return [premiereAtAbsoluteWeek];
};

const findPlan = (platform: PlatformState, planId: string): PlatformAiContentPlan | null => (
    platform.ai!.slate.find(plan => plan.id === planId) || null
);

const findContractForProject = (
    world: WorldState,
    plan: PlatformAiContentPlan,
    projectId: string,
    absoluteWeek: number,
): OwnedStreamingCatalogLicense | null => (
    plan.rightsContractIds
        .map(contractId => getStreamingRightsContract(world.streamingRightsContracts, contractId))
        .filter(contract => (
            contract
            && contract.sourceProjectId === projectId
            && contract.buyerPlatformId === plan.platformId
            && contract.platformContentPlanId === plan.id
            && contract.status === 'ACTIVE'
            && isStreamingLicenseActiveAt(contract, absoluteWeek)
        )) as OwnedStreamingCatalogLicense[]
).sort((left, right) => right.startsAtAbsoluteWeek - left.startsAtAbsoluteWeek || left.id.localeCompare(right.id))[0]
    || null;

const hasSufficientLocalization = (
    platform: PlatformState,
    plan: PlatformAiContentPlan,
    countryIds: string[] = plan.releaseCountryIds,
): boolean => {
    if (plan.localizationLevel === 'NONE') return true;
    const relevantPromises = plan.localizationRequirements?.filter(requirement => (
        requirement.countryIds.some(countryId => countryIds.includes(countryId))
    )) || [];
    if (!relevantPromises.length) return true;
    return relevantPromises.every(requirement => {
        const support = platform.ai!.languageCapabilities.find(capability => capability.languageId === requirement.languageId);
        const tier = requirement.mode === 'DUB' ? support?.dubbingLevel || 0 : support?.subtitleLevel || 0;
        return tier >= requirement.capabilityTierAtPromise;
    });
};

export const getReadyPlatformAiLocalizationJobs = (
    platform: PlatformState,
    plan: PlatformAiContentPlan,
    projectIds: string[],
    absoluteWeek: number,
    world?: WorldState,
    projectIndex?: ReadonlyMap<string, IndustryProject>,
) => {
    return projectIds.flatMap(projectId => {
        const project = projectIndex?.get(projectId) || world?.projects.find(item => item.id === projectId);
        const requirements = getPlatformAiLocalizationRequirements(platform, plan, project)
            .filter(requirement => requirement.mandatory);
        return requirements.map(requirement => platform.ai!.localizationJobs.find(job => (
            job.platformId === platform.id
            && job.contentPlanId === plan.id
            && job.projectId === projectId
            && job.languageId === requirement.languageId
            && job.mode === requirement.mode
            && job.countryIds.join(',') === requirement.countryIds.join(',')
            && job.status === 'READY'
            && job.readyAtAbsoluteWeek !== null
            && job.readyAtAbsoluteWeek <= absoluteWeek
        )) || null);
    });
};

const releaseCapacityFor = (platformId: PlatformId): number => (
    Math.max(1, PLATFORM_AI_PROFILES[platformId].releaseVolume)
);

const scheduledTitleCountAt = (
    platform: PlatformState,
    absoluteWeek: number,
    excludePlanId: string,
): number => platform.ai!.slate
    .filter(plan => plan.id !== excludePlanId)
    .flatMap(plan => plan.releaseEntries || [])
    .filter(entry => entry.premiereAtAbsoluteWeek === absoluteWeek)
    .length;

const productionForPlan = (
    world: WorldState,
    plan: PlatformAiContentPlan,
): IndustryProductionCommitment | null => (
    plan.industryProductionId ? world.industryProductions?.[plan.industryProductionId] || null : null
);

export type PlatformAiReleaseMutationReason =
    | 'PLAYER_CONTROLLED'
    | 'PLATFORM_NOT_FOUND'
    | 'PLAN_NOT_FOUND'
    | 'COMPANY_INACTIVE'
    | 'PREMIERE_NOT_FUTURE'
    | 'CONTENT_NOT_READY'
    | 'SOURCE_NOT_FOUND'
    | 'SOURCE_IDENTITY_CONFLICT'
    | 'RIGHTS_NOT_ACTIVE'
    | 'RIGHTS_BINDING_INVALID'
    | 'RIGHTS_NOT_COVERED'
    | 'COUNTRY_NOT_ACTIVE'
    | 'LOCALIZATION_INSUFFICIENT'
    | 'LOCALIZATION_NOT_READY'
    | 'RELEASE_CAPACITY_EXCEEDED'
    | 'ALREADY_SCHEDULED'
    | 'NOT_SCHEDULED'
    | 'PREMIERE_NOT_REACHED'
    | 'ALREADY_RELEASED';

export interface PlatformAiReleaseMutationResult {
    world: WorldState;
    changed: boolean;
    plan: PlatformAiContentPlan | null;
    projects: IndustryProject[];
    reason?: PlatformAiReleaseMutationReason;
}

export interface SchedulePlatformStreamingWindowInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    planId: string;
    absoluteWeek: number;
    premiereAtAbsoluteWeek: number;
    localizationReadyAtAbsoluteWeek?: number;
    releasePattern?: PlatformAiReleasePattern;
    /** Optional turn-local index; callers may reuse it across premiere previews. */
    projectIndex?: ReadonlyMap<string, IndustryProject>;
    /** Optional turn-local capacity count for this exact premiere week. */
    scheduledTitleCountAtPremiere?: number;
    /** Runs every legal/readiness check without cloning committed platform state. */
    previewOnly?: boolean;
}

const unchanged = (
    world: WorldState,
    plan: PlatformAiContentPlan | null,
    reason: PlatformAiReleaseMutationReason,
): PlatformAiReleaseMutationResult => ({ world, changed: false, plan, projects: [], reason });

export const schedulePlatformStreamingWindow = (
    input: SchedulePlatformStreamingWindowInput,
): PlatformAiReleaseMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return unchanged(input.world, null, 'PLAYER_CONTROLLED');
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return unchanged(input.world, null, 'PLATFORM_NOT_FOUND');
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const plan = findPlan(platform, input.planId);
    if (!plan) return unchanged(input.world, null, 'PLAN_NOT_FOUND');
    if (input.premiereAtAbsoluteWeek <= input.absoluteWeek) return unchanged(input.world, plan, 'PREMIERE_NOT_FUTURE');
    if (platform.ai!.status !== 'ACTIVE') return unchanged(input.world, plan, 'COMPANY_INACTIVE');
    if (plan.status === 'SCHEDULED' && plan.premiereAtAbsoluteWeek === input.premiereAtAbsoluteWeek) {
        return unchanged(input.world, plan, 'ALREADY_SCHEDULED');
    }
    if (plan.status === 'RELEASED') return unchanged(input.world, plan, 'ALREADY_RELEASED');

    const production = productionForPlan(input.world, plan);
    if (plan.source === 'COMMISSIONED_ORIGINAL') {
        if (plan.status !== 'DELIVERED' || !production || production.status !== 'DELIVERED') {
            return unchanged(input.world, plan, 'CONTENT_NOT_READY');
        }
    } else if (plan.status !== 'RIGHTS_READY') {
        return unchanged(input.world, plan, 'CONTENT_NOT_READY');
    }

    const sourceProjectIds = plan.source === 'COMMISSIONED_ORIGINAL'
        ? [production!.canonicalProjectId]
        : plan.sourceProjectIds;
    if (!sourceProjectIds.length || (plan.source !== 'COMMISSIONED_ORIGINAL' && sourceProjectIds.some(projectId => (
        !input.world.projects.some(project => project.id === projectId)
    )))) {
        return unchanged(input.world, plan, 'SOURCE_NOT_FOUND');
    }

    const operations = activeCountryOperations(platform);
    if (!plan.releaseCountryIds.length || plan.releaseCountryIds.some(countryId => !operations.has(countryId))) {
        return unchanged(input.world, plan, 'COUNTRY_NOT_ACTIVE');
    }
    if (!hasSufficientLocalization(platform, plan)) {
        return unchanged(input.world, plan, 'LOCALIZATION_INSUFFICIENT');
    }
    const localizationJobs = getReadyPlatformAiLocalizationJobs(
        platform,
        plan,
        sourceProjectIds,
        input.absoluteWeek,
        input.world,
        input.projectIndex,
    );
    if (localizationJobs.some(job => !job)) {
        return unchanged(input.world, plan, 'LOCALIZATION_NOT_READY');
    }
    const localizationReadyAtAbsoluteWeek = Math.max(
        input.absoluteWeek,
        ...localizationJobs.map(job => job!.readyAtAbsoluteWeek!),
    );

    const contracts = new Map<string, OwnedStreamingCatalogLicense>();
    if (plan.source !== 'COMMISSIONED_ORIGINAL') {
        for (const projectId of sourceProjectIds) {
            const contract = findContractForProject(input.world, plan, projectId, input.premiereAtAbsoluteWeek);
            if (
                !contract
                || contract.status !== 'ACTIVE'
                || !isStreamingLicenseActiveAt(contract, input.premiereAtAbsoluteWeek)
            ) {
                return unchanged(input.world, plan, 'RIGHTS_NOT_ACTIVE');
            }
            if (plan.releaseCountryIds.some(countryId => !doesStreamingLicenseCoverCountry(contract, countryId))) {
                return unchanged(input.world, plan, 'RIGHTS_NOT_COVERED');
            }
            contracts.set(projectId, contract);
        }
    }

    const existingAtPremiere = input.scheduledTitleCountAtPremiere
        ?? scheduledTitleCountAt(platform, input.premiereAtAbsoluteWeek, plan.id);
    if (existingAtPremiere + sourceProjectIds.length > releaseCapacityFor(input.platformId)) {
        return unchanged(input.world, plan, 'RELEASE_CAPACITY_EXCEEDED');
    }

    const sourceProjectsById = input.projectIndex || new Map(input.world.projects.map(project => [project.id, project]));
    const releaseEntries: PlatformAiReleaseEntry[] = sourceProjectIds.map(projectId => {
        const mediaType = plan.source === 'COMMISSIONED_ORIGINAL'
            ? production!.projectType
            : sourceProjectsById.get(projectId)!.mediaType;
        const releasePattern = patternFor(plan, mediaType, input.releasePattern);
        return {
            id: createDeterministicId('platform_ai_release_entry', input.platformId, plan.id, projectId),
            sourceProjectId: plan.source === 'COMMISSIONED_ORIGINAL' ? null : projectId,
            canonicalProjectId: projectId,
            rightsContractId: contracts.get(projectId)?.id || null,
            premiereAtAbsoluteWeek: input.premiereAtAbsoluteWeek,
            localizationReadyAtAbsoluteWeek,
            countryIds: [...plan.releaseCountryIds].sort(),
            releasePattern,
            installmentAbsoluteWeeks: installmentWeeksFor(releasePattern, input.premiereAtAbsoluteWeek),
            status: 'SCHEDULED',
            releasedAtAbsoluteWeek: null,
            streamingWindowId: null,
        };
    });
    const releasePatterns = new Set(releaseEntries.map(entry => entry.releasePattern));
    if (releaseEntries.some(entry => {
        const contract = entry.rightsContractId ? contracts.get(entry.canonicalProjectId) : null;
        return plan.source !== 'COMMISSIONED_ORIGINAL' && (
            !contract
            || contract.status !== 'ACTIVE'
            || entry.installmentAbsoluteWeeks.some(week => !isStreamingLicenseActiveAt(contract, week))
        );
    })) return unchanged(input.world, plan, 'RIGHTS_NOT_ACTIVE');
    const releasePattern = releasePatterns.size === 1 ? releaseEntries[0].releasePattern : null;
    const scheduledPlan: PlatformAiContentPlan = {
        ...plan,
        status: 'SCHEDULED',
        localizationReadyAtAbsoluteWeek,
        premiereAtAbsoluteWeek: input.premiereAtAbsoluteWeek,
        releasePattern,
        releaseEntries,
        releaseReadiness: buildReadyPlatformAiReleasePassport({
            evaluatedAtAbsoluteWeek: input.absoluteWeek,
            premiereAtAbsoluteWeek: input.premiereAtAbsoluteWeek,
            releaseEntries,
            rightsContractIds: releaseEntries.flatMap(entry => entry.rightsContractId ? [entry.rightsContractId] : []),
            localizationReadyAtAbsoluteWeek,
            scheduledTitleCount: existingAtPremiere + sourceProjectIds.length,
            releaseCapacity: releaseCapacityFor(input.platformId),
        }),
        scheduledAtAbsoluteWeek: input.absoluteWeek,
    };
    if (input.previewOnly) {
        return {
            world: input.world,
            changed: true,
            plan: scheduledPlan,
            projects: [],
        };
    }
    const nextPlatform: PlatformState = {
        ...platform,
        ai: {
            ...platform.ai!,
            slate: platform.ai!.slate.map(item => item.id === plan.id ? scheduledPlan : item),
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, [{
                id: createDeterministicId('platform_ai_decision', input.platformId, plan.id, 'RELEASE_SCHEDULED'),
                absoluteWeek: input.absoluteWeek,
                type: 'RELEASE_SCHEDULED',
                summary: `${plan.title} was scheduled for release.`,
                reason: `${releaseEntries.length} canonical title${releaseEntries.length === 1 ? '' : 's'} cleared rights, markets, localization and capacity.`,
                cashImpactMillions: 0,
            }]),
        },
    };
    return {
        world: {
            ...input.world,
            platforms: { ...input.world.platforms!, [input.platformId]: nextPlatform },
        },
        changed: true,
        plan: scheduledPlan,
        projects: [],
    };
};

export interface CalculatePlatformAiStreamingPerformanceInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    plan: PlatformAiContentPlan;
    project: IndustryProject;
    absoluteWeek: number;
}

export const calculatePlatformAiStreamingPerformance = (
    input: CalculatePlatformAiStreamingPerformanceInput,
): PlatformAiStreamingPerformance => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    const platform = sourcePlatform
        ? normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek)
        : null;
    const seed = `platform-ai-performance:${input.platformId}:${input.plan.id}:${input.project.id}:${input.absoluteWeek}`;
    const variance = (createDeterministicRng(seed)() - 0.5) * 10;
    const commercialSkill = platform?.ai?.competence.commercial || PLATFORM_AI_PROFILES[input.platformId].competence.commercial;
    const recommendationLevel = platform?.ai?.capabilities.technologyLevels.DATA_RECOMMENDATIONS || 0;
    const baselineCommercialScore = clamp(round(
        input.project.quality * 0.52
        + input.plan.forecast.commercial * 0.25
        + commercialSkill * 2
        + recommendationLevel * 0.08
        + variance,
    ), 0, 100);
    const addressableSubscribers = Math.max(0, platform?.subscribers || 0);
    const countryIds = [...new Set(input.plan.releaseCountryIds)].sort();
    const subscribersPerCountry = countryIds.length ? addressableSubscribers / countryIds.length : 0;
    const marketingMultiplier = 1 + Math.min(0.24, Math.max(0, input.plan.marketingReserveMillions) / 250);
    const reputationMultiplier = 0.86 + (platform?.reputation || 50) / 500;
    const regionalResults = countryIds.map(countryId => {
        const comprehension = countryComprehension(platform, input.plan, input.project, countryId);
        const countryVariance = (createDeterministicRng(`${seed}:${countryId}`)() - 0.5) * 6;
        const commercialScore = clamp(round(
            baselineCommercialScore * 0.72
            + comprehension.appreciationMultiplier * 14
            + comprehension.completionMultiplier * 10
            + countryVariance,
        ), 0, 100);
        const viewsMillions = round(
            subscribersPerCountry
            * (0.06 + commercialScore / 190)
            * comprehension.reachMultiplier
            * marketingMultiplier
            * reputationMultiplier,
            1_000,
        );
        const acquired = viewsMillions * Math.max(0, commercialScore - 58) / 100 * 0.028;
        const retained = viewsMillions * Math.max(0, comprehension.completionMultiplier * 100 - 55) / 100 * 0.012;
        const churned = viewsMillions * Math.max(0, 55 - commercialScore) / 100 * 0.02;
        return {
            countryId,
            localizationState: comprehension.state,
            reachMultiplier: comprehension.reachMultiplier,
            appreciationMultiplier: comprehension.appreciationMultiplier,
            completionMultiplier: comprehension.completionMultiplier,
            viewsMillions,
            commercialScore,
            subscriberImpactMillions: round(acquired + retained - churned, 1_000),
        };
    });
    const viewsMillions = round(regionalResults.reduce((sum, row) => sum + row.viewsMillions, 0), 1_000);
    const weightedCommercialTotal = regionalResults.reduce((sum, row) => sum + row.commercialScore * Math.max(0.001, row.viewsMillions), 0);
    const weightedCommercialDivisor = regionalResults.reduce((sum, row) => sum + Math.max(0.001, row.viewsMillions), 0);
    const commercialScore = regionalResults.length
        ? clamp(round(weightedCommercialTotal / weightedCommercialDivisor), 0, 100)
        : baselineCommercialScore;
    const localizationSupportMultiplier = round(averageLocalizationSupport(platform, input.plan, input.project), 1_000);
    const averageAppreciation = regionalResults.length
        ? regionalResults.reduce((sum, row) => sum + row.appreciationMultiplier, 0) / regionalResults.length
        : 1;
    const prestigeScore = clamp(round(
        input.project.quality * 0.58
        + input.plan.forecast.prestige * 0.26
        + (platform?.ai?.competence.prestige || PLATFORM_AI_PROFILES[input.platformId].competence.prestige)
        + averageAppreciation * 7,
    ), 0, 100);
    const acquiredSubscribersMillions = round(regionalResults.reduce((sum, row) => (
        sum + row.viewsMillions * Math.max(0, row.commercialScore - 58) / 100 * 0.028
    ), 0), 1_000);
    const retainedSubscribersMillions = round(regionalResults.reduce((sum, row) => (
        sum + row.viewsMillions * Math.max(0, row.completionMultiplier * 100 - 55) / 100 * 0.012
    ), 0), 1_000);
    const churnedSubscribersMillions = round(regionalResults.reduce((sum, row) => (
        sum + row.viewsMillions * Math.max(0, 55 - row.commercialScore) / 100 * 0.02
    ), 0), 1_000);
    const subscriberImpactMillions = round(
        acquiredSubscribersMillions + retainedSubscribersMillions - churnedSubscribersMillions,
        1_000,
    );
    const engagementIndexDelta = round(clamp((commercialScore - 55) / 7, -5, 8), 100);
    const catalogueStrengthDelta = round(clamp(
        (commercialScore - 60) / 18 + (prestigeScore - 60) / 30,
        -2,
        5,
    ), 100);
    const outcomeThresholds = PLATFORM_AI_OUTCOME_THRESHOLDS[input.platformId];
    const outcome = commercialScore >= outcomeThresholds.hit
        ? 'HIT'
        : commercialScore < outcomeThresholds.flop ? 'FLOP' : 'SOLID';
    return {
        calculatedAtAbsoluteWeek: input.absoluteWeek,
        viewsMillions,
        subscriberImpactMillions,
        acquiredSubscribersMillions,
        retainedSubscribersMillions,
        churnedSubscribersMillions,
        engagementIndexDelta,
        catalogueStrengthDelta,
        commercialScore,
        prestigeScore,
        localizationSupportMultiplier,
        outcome,
        regionalResults,
        seed,
    };
};

const countryComprehension = (
    platform: PlatformState | null,
    plan: PlatformAiContentPlan,
    project: IndustryProject,
    countryId: string,
) => {
    if (!platform?.ai) {
        return {
            state: 'NATIVE_OR_COMPATIBLE' as const,
            languageId: project.originalLanguageId || 'english',
            reachMultiplier: 1,
            appreciationMultiplier: 1,
            completionMultiplier: 1,
            localizationQuality: 100,
            reason: 'No platform localization state was available.',
        };
    }
    const asset = platform.ai.localizationJobs
        .filter(job => (
            job.contentPlanId === plan.id
            && job.projectId === project.id
            && job.countryIds.includes(countryId)
            && job.status === 'READY'
        ))
        .sort((left, right) => (
            (right.mode === 'DUB' ? 1 : 0) - (left.mode === 'DUB' ? 1 : 0)
            || right.qualityForecast - left.qualityForecast
        ))[0];
    return resolvePlatformAiTitleCountryComprehension({
        ai: platform.ai,
        originalLanguageId: project.originalLanguageId || 'english',
        countryId,
        targetAudience: plan.targetAudience,
        genre: plan.genre,
        assetLanguageId: asset?.languageId,
        assetMode: asset?.mode || null,
        localizationQuality: asset?.qualityForecast,
    });
};

const averageLocalizationSupport = (
    platform: PlatformState | null,
    plan: PlatformAiContentPlan,
    project: IndustryProject,
): number => {
    if (!platform?.ai) return 1;
    const values = plan.releaseCountryIds.map(countryId => {
        const comprehension = countryComprehension(platform, plan, project, countryId);
        return comprehension.reachMultiplier * 0.7
            + comprehension.appreciationMultiplier * 0.15
            + comprehension.completionMultiplier * 0.15;
    });
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};

const budgetTierFor = (budgetMillions: number): BudgetTier => (
    budgetMillions >= 150 ? 'BLOCKBUSTER' : budgetMillions >= 80 ? 'HIGH' : budgetMillions >= 30 ? 'MID' : 'LOW'
);

const releaseYearWeek = (absoluteWeek: number): { year: number; week: number } => ({
    year: Math.floor(Math.max(0, absoluteWeek) / 52) + 1,
    week: Math.max(0, absoluteWeek) % 52 + 1,
});

const buildAwardProfile = (
    plan: PlatformAiContentPlan,
    production: IndustryProductionCommitment,
    quality: number,
): NonNullable<IndustryProject['awardProfile']> => {
    const execution = production.aiExecution;
    const seed = `platform-ai-award-profile:${plan.platformId}:${plan.id}:${production.canonicalProjectId}`;
    const rng = createDeterministicRng(seed);
    const craft = (bias: number): number => clamp(round(quality * 0.74 + rng() * 12 + bias), 0, 100);
    const campaign = clamp(round(45 + plan.marketingReserveMillions * 1.5 + plan.forecast.prestige * 0.25), 0, 100);
    return {
        leadPerformance: craft(execution?.leadActorId ? 8 : 0),
        directing: craft(execution?.directorId ? 9 : 1),
        screenplay: clamp(round(quality * 0.65 + production.writerSkill * 0.3 + rng() * 5), 0, 100),
        cinematography: craft(4),
        picture: clamp(round(quality * 0.72 + plan.forecast.prestige * 0.2 + campaign * 0.08), 0, 100),
        originalScore: craft(plan.genre === 'MUSICAL' ? 10 : 0),
        originalSong: craft(plan.genre === 'MUSICAL' || plan.genre === 'ANIMATION' ? 9 : -7),
        campaign,
    };
};

const createOriginalProject = (
    plan: PlatformAiContentPlan,
    production: IndustryProductionCommitment,
    absoluteWeek: number,
): IndustryProject => {
    const quality = clamp(round(production.aiExecution?.finalQuality ?? production.aiExecution?.qualityForecast ?? plan.forecast.creative), 1, 100);
    const { year, week } = releaseYearWeek(absoluteWeek);
    return {
        id: production.canonicalProjectId,
        title: production.title,
        genre: production.genre,
        mediaType: production.projectType,
        targetAudience: plan.targetAudience,
        studioId: production.producerStudioId,
        budgetTier: budgetTierFor(production.budgetMillions),
        quality,
        rating: round(clamp(4.5 + quality * 0.055, 1, 10), 10),
        boxOffice: 0,
        year,
        weekReleased: week,
        leadActorId: production.aiExecution?.leadActorId || 'unknown-platform-original-lead',
        leadActorName: production.aiExecution?.leadActorName || 'Unknown Lead',
        directorId: production.aiExecution?.directorId || undefined,
        directorName: production.aiExecution?.directorName || 'Unknown Director',
        reviews: quality >= 80 ? 'Strong critical response' : quality >= 60 ? 'Mixed-positive response' : 'Muted critical response',
        awardProfile: buildAwardProfile(plan, production, quality),
        physicalProducerStudioId: production.producerStudioId,
        platformContentSource: 'COMMISSIONED_ORIGINAL',
        platformContentPlanId: plan.id,
        releaseStrategy: 'STREAMING_ONLY',
        streamingWindows: [],
    };
};

const isMatchingOriginalProject = (
    project: IndustryProject,
    plan: PlatformAiContentPlan,
    production: IndustryProductionCommitment,
): boolean => (
    project.platformContentSource === 'COMMISSIONED_ORIGINAL'
    && project.platformContentPlanId === plan.id
    && project.title === production.title
    && project.mediaType === production.projectType
    && (project.physicalProducerStudioId ?? project.studioId) === production.producerStudioId
);

const validateReleaseEntitlements = (
    platform: PlatformState,
    plan: PlatformAiContentPlan,
    absoluteWeek: number,
    world: WorldState,
): PlatformAiReleaseMutationReason | null => {
    const operations = activeCountryOperations(platform);
    if (plan.releaseEntries.some(entry => (
        !entry.countryIds.length || entry.countryIds.some(countryId => !operations.has(countryId))
    ))) return 'COUNTRY_NOT_ACTIVE';
    if (plan.releaseEntries.some(entry => !hasSufficientLocalization(platform, plan, entry.countryIds))) {
        return 'LOCALIZATION_INSUFFICIENT';
    }
    if (plan.releaseEntries.some(entry => {
        const readyJobs = getReadyPlatformAiLocalizationJobs(
            platform,
            plan,
            [entry.canonicalProjectId],
            absoluteWeek,
            world,
        );
        const readyWeek = readyJobs.length
            ? Math.max(...readyJobs.map(job => job?.readyAtAbsoluteWeek || 0))
            : entry.localizationReadyAtAbsoluteWeek;
        return readyJobs.some(job => !job)
            || entry.localizationReadyAtAbsoluteWeek !== readyWeek
            || entry.localizationReadyAtAbsoluteWeek > absoluteWeek;
    })) {
        return 'LOCALIZATION_NOT_READY';
    }
    if (plan.source === 'COMMISSIONED_ORIGINAL') return null;
    for (const entry of plan.releaseEntries) {
        const contract = entry.rightsContractId
            ? getStreamingRightsContract(world.streamingRightsContracts, entry.rightsContractId)
            : null;
        if (
            !contract
            || contract.status !== 'ACTIVE'
            || !isStreamingLicenseActiveAt(contract, absoluteWeek)
        ) return 'RIGHTS_NOT_ACTIVE';
        if (
            contract.id !== entry.rightsContractId
            || !plan.rightsContractIds.includes(contract.id)
            || !entry.sourceProjectId
            || entry.sourceProjectId !== entry.canonicalProjectId
            || contract.sourceProjectId !== entry.sourceProjectId
            || plan.platformId !== platform.id
            || contract.buyerPlatformId !== platform.id
            || contract.platformContentPlanId !== plan.id
        ) return 'RIGHTS_BINDING_INVALID';
        if (entry.countryIds.some(countryId => !doesStreamingLicenseCoverCountry(contract, countryId))) return 'RIGHTS_NOT_COVERED';
    }
    return null;
};

export interface ReleasePlatformContentPlanInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    planId: string;
    absoluteWeek: number;
    performanceByProjectId?: Record<string, PlatformAiStreamingPerformance>;
}

export const releasePlatformContentPlan = (
    input: ReleasePlatformContentPlanInput,
): PlatformAiReleaseMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return unchanged(input.world, null, 'PLAYER_CONTROLLED');
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return unchanged(input.world, null, 'PLATFORM_NOT_FOUND');
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const plan = findPlan(platform, input.planId);
    if (!plan) return unchanged(input.world, null, 'PLAN_NOT_FOUND');
    if (plan.status === 'RELEASED') return unchanged(input.world, plan, 'ALREADY_RELEASED');
    if (plan.status !== 'SCHEDULED' || !plan.releaseEntries.length) return unchanged(input.world, plan, 'NOT_SCHEDULED');
    if ((plan.premiereAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) > input.absoluteWeek) {
        return unchanged(input.world, plan, 'PREMIERE_NOT_REACHED');
    }
    const production = plan.source === 'COMMISSIONED_ORIGINAL' ? productionForPlan(input.world, plan) : null;
    if (plan.source === 'COMMISSIONED_ORIGINAL' && (!production || production.status !== 'DELIVERED')) {
        return unchanged(input.world, plan, 'CONTENT_NOT_READY');
    }
    if (production && plan.releaseEntries.some(entry => (
        entry.canonicalProjectId !== production.canonicalProjectId
        || entry.sourceProjectId !== null
    ))) {
        return unchanged(input.world, plan, 'SOURCE_IDENTITY_CONFLICT');
    }
    const entitlementFailure = validateReleaseEntitlements(platform, plan, input.absoluteWeek, input.world);
    if (entitlementFailure) return unchanged(input.world, plan, entitlementFailure);
    const projectsById = new Map(input.world.projects.map(project => [project.id, project]));
    const existingOriginal = production ? projectsById.get(production.canonicalProjectId) : null;
    if (production && existingOriginal && !isMatchingOriginalProject(existingOriginal, plan, production)) {
        return unchanged(input.world, plan, 'SOURCE_IDENTITY_CONFLICT');
    }
    if (production && !projectsById.has(production.canonicalProjectId)) {
        projectsById.set(production.canonicalProjectId, createOriginalProject(plan, production, input.absoluteWeek));
    }
    if (plan.releaseEntries.some(entry => !projectsById.has(entry.canonicalProjectId))) {
        return unchanged(input.world, plan, 'SOURCE_NOT_FOUND');
    }

    const releasedProjects: IndustryProject[] = [];
    const releasedEntries: PlatformAiReleaseEntry[] = [];
    const audienceSettlements: PlatformAiAudienceSettlement[] = [];
    for (const entry of plan.releaseEntries) {
        const existingProject = projectsById.get(entry.canonicalProjectId)!;
        const contract = entry.rightsContractId
            ? getStreamingRightsContract(input.world.streamingRightsContracts, entry.rightsContractId)
            : null;
        const windowId = createDeterministicId('platform_ai_streaming_window', input.platformId, plan.id, entry.canonicalProjectId);
        const performance = input.performanceByProjectId?.[entry.canonicalProjectId]
            || calculatePlatformAiStreamingPerformance({
                player: input.player,
                world: input.world,
                platformId: input.platformId,
                plan,
                project: existingProject,
                absoluteWeek: input.absoluteWeek,
            });
        const streamingWindow: PlatformAiProjectStreamingWindow = {
            id: windowId,
            platformId: input.platformId,
            platformContentPlanId: plan.id,
            rightsContractId: contract?.id || null,
            contentSource: plan.source,
            platformRelationship: relationshipFor(plan),
            countryIds: [...entry.countryIds],
            startsAtAbsoluteWeek: entry.premiereAtAbsoluteWeek,
            expiresAtAbsoluteWeek: contract?.expiresAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER,
            exclusivity: contract?.exclusivity ?? 'EXCLUSIVE',
            localizationLevel: plan.localizationLevel,
            releasePattern: entry.releasePattern,
            installmentAbsoluteWeeks: [...entry.installmentAbsoluteWeeks],
            performance,
        };
        const existingWindows = existingProject.streamingWindows || [];
        const nextProject: IndustryProject = existingWindows.some(window => window.id === windowId)
            ? existingProject
            : {
                ...existingProject,
                streamingWindows: [...existingWindows, streamingWindow],
                streamingPerformance: performance,
            };
        projectsById.set(nextProject.id, nextProject);
        releasedProjects.push(nextProject);
        releasedEntries.push({
            ...entry,
            status: 'RELEASED',
            releasedAtAbsoluteWeek: input.absoluteWeek,
            streamingWindowId: windowId,
        });
        audienceSettlements.push({
            id: createDeterministicId('platform_ai_audience_settlement', windowId, entry.canonicalProjectId, plan.id),
            streamingWindowId: windowId,
            projectId: entry.canonicalProjectId,
            planId: plan.id,
            subscriberImpactMillions: performance.subscriberImpactMillions,
            acquiredSubscribersMillions: performance.acquiredSubscribersMillions ?? Math.max(0, performance.subscriberImpactMillions),
            retainedSubscribersMillions: performance.retainedSubscribersMillions ?? 0,
            churnedSubscribersMillions: performance.churnedSubscribersMillions ?? Math.max(0, -performance.subscriberImpactMillions),
            engagementIndexDelta: performance.engagementIndexDelta,
            catalogueStrengthDelta: performance.catalogueStrengthDelta ?? 0,
            status: 'PENDING',
            createdAtAbsoluteWeek: input.absoluteWeek,
            settledAtAbsoluteWeek: null,
        });
    }

    const releasedPlan: PlatformAiContentPlan = {
        ...plan,
        status: 'RELEASED',
        releasedAtAbsoluteWeek: input.absoluteWeek,
        releaseEntries: releasedEntries,
        marketingReserveMillions: 0,
        productionEscrow: plan.productionEscrow?.status === 'FUNDED' ? {
            ...plan.productionEscrow,
            status: 'SETTLED',
            marketingBalanceMillions: 0,
            contingencyBalanceMillions: 0,
            settledAtAbsoluteWeek: input.absoluteWeek,
            settlementReason: 'RELEASED',
        } : plan.productionEscrow,
    };
    const nextProjectIds = new Set(releasedProjects.map(project => project.id));
    const nextProjects = [
        ...input.world.projects.map(project => projectsById.get(project.id) || project),
        ...releasedProjects.filter(project => !input.world.projects.some(existing => existing.id === project.id)),
    ].filter((project, index, rows) => rows.findIndex(candidate => candidate.id === project.id) === index);
    void nextProjectIds;
    const nextPlatform: PlatformState = {
        ...platform,
        ai: {
            ...platform.ai!,
            slate: platform.ai!.slate.map(item => item.id === plan.id ? releasedPlan : item),
            pendingAudienceSettlements: normalizePlatformAiAudienceSettlements([
                ...platform.ai!.pendingAudienceSettlements,
                ...audienceSettlements,
            ]),
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, plan.marketingReserveMillions >= 25 || releasedEntries.length >= 3 ? [{
                id: createDeterministicId('platform_ai_decision', input.platformId, plan.id, 'MAJOR_RELEASE'),
                absoluteWeek: input.absoluteWeek,
                type: 'MAJOR_RELEASE',
                summary: `${plan.title} became a major platform release.`,
                reason: `${releasedEntries.length} title${releasedEntries.length === 1 ? '' : 's'} launched with ${plan.marketingReserveMillions}M reserved for marketing.`,
                cashImpactMillions: 0,
            }] : []),
        },
    };
    let nextWorld: WorldState = {
        ...input.world,
        projects: nextProjects,
        platforms: { ...input.world.platforms!, [input.platformId]: nextPlatform },
    };
    for (const releasedProject of releasedProjects) {
        const performance = input.performanceByProjectId?.[releasedProject.id] || releasedProject.streamingPerformance!;
        nextWorld = recordPlatformAiReleaseMemory({
            player: input.player,
            world: nextWorld,
            platformId: input.platformId,
            project: releasedProject,
            plan: releasedPlan,
            performance,
            absoluteWeek: input.absoluteWeek,
        }).world;
    }
    return {
        world: nextWorld,
        changed: true,
        plan: nextWorld.platforms![input.platformId].ai!.slate.find(item => item.id === plan.id) || releasedPlan,
        projects: releasedProjects,
    };
};
