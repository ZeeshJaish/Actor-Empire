import type {
    IndustryProject,
    PlatformAiContentPlan,
    PlatformAiPlayerCommissionOffer,
    Player,
    Script,
} from '../../types';
import { createPlatformAiPlayerCommissionOffer } from './platformAiPlayerCommissions';
import {
    createPendingPlatformAiCommissioningLifecycle,
    createUnfundedPlatformAiProductionEscrow,
} from './platformAiProductionEscrow';
import { normalizePlatformAiState } from './platformAiState';
import { commitPlatformMarketExpansion } from './platformAiMarkets';
import { getPlatformAiResearchCapacity } from './platformAiResearchPortfolio';
import { getPlatformAiOperatingProfile } from './platformAiOperatingProfiles';
import { createPlatformAiEfficiencySnapshot } from './platformAiEfficiency';
import {
    getPlatformAiLocalizationJobId,
    getPlatformAiLocalizationObligationId,
    getPlatformAiLocalizationRequirements,
    quotePlatformAiLocalization,
} from './platformAiLocalizationCore';
import { resolvePlatformAiTitleCountryComprehension } from './platformAiLanguageCapabilities';

const QA_PLAN_PREFIX = 'platform_commission_qa_plan_';
const QA_SCRIPT_PREFIX = 'platform_commission_qa_script_';
const QA_PRODUCTION_BUDGET_MILLIONS = 95;
const QA_DEPOSIT_MILLIONS = 8;
const QA_COMMISSION_SHOWCASES = [
    {
        title: 'After the Monsoon',
        logline: 'A celebrated journalist returns to Mumbai during monsoon season and uncovers a family secret tied to a powerful media dynasty.',
        author: 'Anika Sen',
    },
    {
        title: 'A City Without Dawn',
        logline: 'Two estranged detectives reunite when a missing-person case exposes the private bargains holding a sleepless city together.',
        author: 'Mara Voss',
    },
    {
        title: 'The Glass Harbour',
        logline: 'A shipping heir risks her inheritance to reveal why an entire coastal town agreed to bury the same night from its past.',
        author: 'Julian Mercer',
    },
    {
        title: 'Letters From Winter',
        logline: 'A translator discovers that decades of unsent letters connect her quiet family to a scandal that changed two countries.',
        author: 'Leena Kapoor',
    },
] as const;

export interface PlatformAiPlayerCommissionQaResult {
    player: Player;
    changed: boolean;
    offer: PlatformAiPlayerCommissionOffer | null;
    planId: string | null;
    scriptId: string | null;
    reason?: 'STUDIO_NOT_FOUND' | 'PLATFORM_NOT_FOUND' | 'OFFER_NOT_CREATED';
}

/** Creates a complete, unreleased Phase 3 test brief while leaving every player decision manual. */
export const createPlatformAiPlayerCommissionQaFixture = (input: {
    player: Player;
    studioId: string;
    absoluteWeek: number;
}): PlatformAiPlayerCommissionQaResult => {
    const studio = input.player.businesses.find(business => (
        business.id === input.studioId && business.type === 'PRODUCTION_HOUSE' && business.isActive
    ));
    if (!studio?.studioState) {
        return { player: input.player, changed: false, offer: null, planId: null, scriptId: null, reason: 'STUDIO_NOT_FOUND' };
    }
    const sourcePlatform = input.player.world.platforms?.NETFLIX;
    if (!sourcePlatform) {
        return { player: input.player, changed: false, offer: null, planId: null, scriptId: null, reason: 'PLATFORM_NOT_FOUND' };
    }

    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const existingQaPlanIds = new Set([
        ...Object.values(input.player.world.platformAiPlayerCommissionOffers || {})
            .map(offer => offer.platformContentPlanId),
        ...(platform.ai?.slate || []).map(plan => plan.id),
    ].filter(id => String(id || '').startsWith(QA_PLAN_PREFIX)));
    const existingQaCount = existingQaPlanIds.size;
    const sequence = existingQaCount + 1;
    const showcase = QA_COMMISSION_SHOWCASES[(sequence - 1) % QA_COMMISSION_SHOWCASES.length];
    const planId = `${QA_PLAN_PREFIX}${input.absoluteWeek}_${sequence}`;
    const scriptId = `${QA_SCRIPT_PREFIX}${input.absoluteWeek}_${sequence}`;
    const title = showcase.title;
    const script: Script = {
        id: scriptId,
        title,
        logline: showcase.logline,
        projectType: 'MOVIE',
        genres: ['DRAMA'],
        targetAudience: 'R',
        quality: 82,
        baseQuality: 82,
        status: 'READY',
        writerId: null,
        author: showcase.author,
        weeksInDevelopment: 6,
        totalDevelopmentWeeks: 6,
        isOriginal: true,
        options: [],
        sourceMaterial: 'ORIGINAL',
        tags: ['PLATFORM_COMMISSION_QA'],
    };
    const plan: PlatformAiContentPlan = {
        id: planId,
        platformId: 'NETFLIX',
        controllerAtCommitment: 'AI',
        source: 'COMMISSIONED_ORIGINAL',
        status: 'BRIEF',
        title,
        projectType: 'MOVIE',
        genre: 'DRAMA',
        targetAudience: 'R',
        sourceProjectIds: [],
        rightsContractIds: [],
        cataloguePackageId: null,
        commissionId: null,
        sourceStudioId: null,
        streamingWindow: 'ORIGINAL_STREAMING_PREMIERE',
        localizationLevel: 'DUBS_AND_SUBTITLES',
        releaseCountryIds: platform.ai?.capabilities.activeCountryIds.slice() || [],
        minimumGuaranteeMillions: 0,
        rightsCostMillions: 0,
        productionFundingMillions: QA_PRODUCTION_BUDGET_MILLIONS,
        paidSpendMillions: QA_DEPOSIT_MILLIONS,
        marketingReserveMillions: 14,
        contingencyMillions: 8,
        productionEscrow: createUnfundedPlatformAiProductionEscrow(QA_PRODUCTION_BUDGET_MILLIONS),
        commissioningLifecycle: createPendingPlatformAiCommissioningLifecycle(input.absoluteWeek, QA_DEPOSIT_MILLIONS),
        committedAtAbsoluteWeek: input.absoluteWeek,
        rightsReadyAtAbsoluteWeek: null,
        localizationReadyAtAbsoluteWeek: null,
        premiereAtAbsoluteWeek: null,
        releasePattern: null,
        releaseEntries: [],
        scheduledAtAbsoluteWeek: null,
        releasedAtAbsoluteWeek: null,
        industryProductionId: null,
        productionHoldStartedAtAbsoluteWeek: null,
        forecast: { strategic: 82, creative: 78, commercial: 76, prestige: 74, risk: 26 },
    };
    const preparedPlayer: Player = {
        ...input.player,
        businesses: input.player.businesses.map(business => business.id === studio.id ? {
            ...business,
            studioState: {
                ...business.studioState!,
                scripts: [script, ...(business.studioState!.scripts || []).filter(existing => existing.id !== scriptId)],
                platformRelations: {
                    ...(business.studioState!.platformRelations || {}),
                    NETFLIX: {
                        ...(business.studioState!.platformRelations?.NETFLIX || {}),
                        recoveryWeeksRemaining: 0,
                    } as NonNullable<typeof business.studioState>['platformRelations'][string],
                },
            },
        } : business),
        world: {
            ...input.player.world,
            platforms: {
                ...input.player.world.platforms!,
                NETFLIX: {
                    ...platform,
                    cashReserve: Math.round((Math.max(platform.cashReserve, 1_000) - QA_DEPOSIT_MILLIONS) * 100) / 100,
                    ai: {
                        ...platform.ai!,
                        slate: [plan, ...(platform.ai?.slate || [])],
                    },
                },
            },
        },
    };
    const created = createPlatformAiPlayerCommissionOffer({
        player: preparedPlayer,
        platformId: 'NETFLIX',
        planId,
        title,
        projectType: 'MOVIE',
        genre: 'DRAMA',
        targetAudience: 'R',
        productionFundingMillions: QA_PRODUCTION_BUDGET_MILLIONS,
        minimumImdbRating: 7.2,
        absoluteWeek: input.absoluteWeek,
    });
    if (!created.changed || !created.offer) {
        return { player: input.player, changed: false, offer: null, planId: null, scriptId: null, reason: 'OFFER_NOT_CREATED' };
    }
    return { player: created.player, changed: true, offer: created.offer, planId, scriptId };
};

const PHASE4_QA_PLAN_ID = 'platform_ai_phase4_qa_plan';
const PHASE4_QA_PROJECT_ID = 'platform_ai_phase4_qa_project';

export interface PlatformAiPhase4QaSnapshot {
    platformId: 'NETFLIX';
    researchCapacity: number;
    activeResearchPrograms: number;
    affordableCandidateSlots: number;
    activeCountries: number;
    expandingCountries: string[];
    subtitleOnlyLanguages: string[];
    dubbingLanguages: string[];
    waitingLocalizationJobs: number;
    readyLocalizationJobs: number;
    comprehension: { localizedReach: number; unlocalizedReach: number };
}

/** Seeds one deterministic Phase 4 rival-state showcase for the developer cheat menu. */
export const buildPlatformAiPhase4QaFixture = (
    player: Player,
    absoluteWeek: number,
): Player => {
    const platform = normalizePlatformAiState(player.world.platforms!.NETFLIX, player.id, absoluteWeek);
    const ai = platform.ai!;
    const researchQueue = ai.researchQueue.map((item, index) => index < 3 ? {
        ...item,
        stage: 'RESEARCHING' as const,
        stageStartedAtAbsoluteWeek: absoluteWeek,
        stageReadyAtAbsoluteWeek: absoluteWeek + 2 + index,
        completedAtAbsoluteWeek: null,
        lastProcessedAbsoluteWeek: absoluteWeek,
    } : item);
    const project: IndustryProject = {
        id: PHASE4_QA_PROJECT_ID,
        title: 'Seoul After Midnight',
        genre: 'DRAMA',
        mediaType: 'MOVIE',
        targetAudience: 'PG-13',
        studioId: 'UNIVERSAL',
        budgetTier: 'MID',
        quality: 82,
        rating: 8.1,
        boxOffice: 0,
        year: Math.floor(absoluteWeek / 52) + 1,
        weekReleased: absoluteWeek % 52 + 1,
        leadActorId: 'phase4-qa-lead',
        leadActorName: 'Min-jun Park',
        directorName: 'Sora Kim',
        reviews: 'A deterministic Phase 4 localization showcase.',
        originalLanguageId: 'korean',
        releaseStrategy: 'STREAMING_ONLY',
    };
    const plan: PlatformAiContentPlan = {
        id: PHASE4_QA_PLAN_ID, platformId: 'NETFLIX', controllerAtCommitment: 'AI',
        source: 'LICENSED_RELEASED_TITLE', status: 'RIGHTS_READY', title: project.title,
        projectType: 'MOVIE', genre: 'DRAMA', targetAudience: 'PG-13',
        sourceProjectIds: [project.id], rightsContractIds: [], cataloguePackageId: null,
        commissionId: null, sourceStudioId: 'UNIVERSAL', streamingWindow: 'POST_THEATRICAL_WINDOW',
        localizationLevel: 'DUBS_AND_SUBTITLES', releaseCountryIds: ['IN', 'JP'],
        minimumGuaranteeMillions: 0, rightsCostMillions: 0, productionFundingMillions: 0,
        paidSpendMillions: 0, marketingReserveMillions: 4, contingencyMillions: 0,
        committedAtAbsoluteWeek: absoluteWeek, rightsReadyAtAbsoluteWeek: absoluteWeek,
        localizationReadyAtAbsoluteWeek: null, premiereAtAbsoluteWeek: null, releasePattern: null,
        releaseEntries: [], scheduledAtAbsoluteWeek: null, releasedAtAbsoluteWeek: null,
        industryProductionId: null,
        forecast: { strategic: 80, creative: 82, commercial: 78, prestige: 84, risk: 24 },
    };
    const languageCapabilities = ai.languageCapabilities.map(capability => (
        capability.languageId === 'german'
            ? { ...capability, subtitleLevel: Math.max(1, capability.subtitleLevel) as 1 | 2 | 3, dubbingLevel: 0 as const }
            : capability
    ));
    const platformWithPlan = { ...platform, ai: {
        ...ai, researchQueue, languageCapabilities,
        slate: [plan, ...ai.slate.filter(item => item.id !== plan.id)],
    } };
    const requirements = getPlatformAiLocalizationRequirements(platformWithPlan, plan, project)
        .filter(requirement => requirement.supported).slice(0, 2);
    const profile = getPlatformAiOperatingProfile('NETFLIX');
    const jobs = requirements.map((requirement, index) => {
        const quote = quotePlatformAiLocalization({
            projectType: 'MOVIE', mode: requirement.mode,
            capabilityTier: requirement.capabilityTier as 1 | 2 | 3,
            countryIds: requirement.countryIds, controller: 'AI', efficiencyPolicy: profile.efficiency,
        });
        const id = getPlatformAiLocalizationJobId({
            platformId: 'NETFLIX', contentPlanId: plan.id, projectId: project.id,
            languageId: requirement.languageId, mode: requirement.mode,
            countryIds: requirement.countryIds, capabilityTier: requirement.capabilityTier as 1 | 2 | 3,
        });
        const ready = index === 1;
        const startedWeek = ready ? absoluteWeek - quote.leadWeeks : null;
        return {
            id, platformId: 'NETFLIX' as const, contentPlanId: plan.id, projectId: project.id,
            countryIds: requirement.countryIds, level: plan.localizationLevel,
            languageId: requirement.languageId, mode: requirement.mode,
            capabilityTierAtPlanning: requirement.capabilityTier as 1 | 2 | 3,
            qualityForecast: quote.qualityForecast,
            efficiencySnapshot: quote.efficiencySnapshot || createPlatformAiEfficiencySnapshot(
                quote.standardCostMillions, quote.standardLeadWeeks, null, 'LOCALIZATION',
            ),
            quoteVersion: 1 as const, legacyObligationId: null, contentOperationsLevelAtPlanning: 40,
            costMillions: quote.costMillions, leadWeeks: quote.leadWeeks,
            obligationId: getPlatformAiLocalizationObligationId(id),
            status: ready ? 'READY' as const : 'WAITING_FOR_FUNDS' as const,
            createdAtAbsoluteWeek: startedWeek ?? absoluteWeek,
            startedAtAbsoluteWeek: startedWeek,
            readyAtAbsoluteWeek: ready ? absoluteWeek : null,
            cancelledAtAbsoluteWeek: null,
        };
    });
    const obligations = jobs.map(job => ({
        id: job.obligationId, category: 'LOCALIZATION' as const, amountMillions: job.costMillions,
        createdWeek: job.createdAtAbsoluteWeek,
        status: job.status === 'READY' ? 'SETTLED' as const : 'HELD' as const,
        settledWeek: job.status === 'READY' ? job.startedAtAbsoluteWeek : null,
    }));
    const seededPlayer: Player = {
        ...player,
        world: {
            ...player.world,
            projects: [project, ...player.world.projects.filter(item => item.id !== project.id)],
            platforms: {
                ...player.world.platforms!,
                NETFLIX: {
                    ...platformWithPlan,
                    ai: {
                        ...platformWithPlan.ai!,
                        localizationJobs: [...jobs, ...ai.localizationJobs.filter(job => job.contentPlanId !== plan.id)],
                        pendingOneTimeObligations: [
                            ...obligations,
                            ...ai.pendingOneTimeObligations.filter(item => !jobs.some(job => job.obligationId === item.id)),
                        ],
                    },
                },
            },
        },
    };
    const expansion = commitPlatformMarketExpansion({
        player: seededPlayer,
        world: seededPlayer.world,
        platformId: 'NETFLIX',
        absoluteWeek,
    });
    return expansion.changed ? { ...seededPlayer, world: expansion.world } : seededPlayer;
};

export const getPlatformAiPhase4QaSnapshot = (
    player: Player,
    absoluteWeek: number,
): PlatformAiPhase4QaSnapshot => {
    const platform = normalizePlatformAiState(player.world.platforms!.NETFLIX, player.id, absoluteWeek);
    const ai = platform.ai!;
    const capacity = getPlatformAiResearchCapacity({ player, world: player.world, platformId: 'NETFLIX', absoluteWeek });
    const project = player.world.projects.find(item => item.id === PHASE4_QA_PROJECT_ID);
    const readyJob = ai.localizationJobs.find(job => job.contentPlanId === PHASE4_QA_PLAN_ID && job.status === 'READY');
    const localized = resolvePlatformAiTitleCountryComprehension({
        ai, originalLanguageId: project?.originalLanguageId || 'korean', countryId: readyJob?.countryIds[0] || 'JP',
        targetAudience: 'PG-13', genre: 'DRAMA', assetLanguageId: readyJob?.languageId,
        assetMode: readyJob?.mode || null, localizationQuality: readyJob?.qualityForecast,
    });
    const unlocalized = resolvePlatformAiTitleCountryComprehension({
        ai, originalLanguageId: project?.originalLanguageId || 'korean', countryId: readyJob?.countryIds[0] || 'JP',
        targetAudience: 'PG-13', genre: 'DRAMA', assetMode: null,
    });
    return {
        platformId: 'NETFLIX',
        researchCapacity: capacity.capacity,
        activeResearchPrograms: ai.researchQueue.filter(item => !['OPERATING'].includes(item.stage)).length,
        affordableCandidateSlots: capacity.availableSlots,
        activeCountries: ai.capabilities.activeCountryIds.length,
        expandingCountries: ai.marketOperations.filter(operation => !['ACTIVE', 'EXITED'].includes(operation.status)).map(operation => operation.countryId!).filter(Boolean),
        subtitleOnlyLanguages: ai.languageCapabilities.filter(item => item.subtitleLevel > 0 && item.dubbingLevel === 0).map(item => item.languageId),
        dubbingLanguages: ai.languageCapabilities.filter(item => item.dubbingLevel > 0).map(item => item.languageId),
        waitingLocalizationJobs: ai.localizationJobs.filter(job => job.status === 'WAITING_FOR_FUNDS').length,
        readyLocalizationJobs: ai.localizationJobs.filter(job => job.status === 'READY').length,
        comprehension: { localizedReach: localized.reachMultiplier, unlocalizedReach: unlocalized.reachMultiplier },
    };
};
