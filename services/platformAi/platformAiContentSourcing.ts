import type {
    Genre,
    IndustryProject,
    PlatformAiContentPlan,
    PlatformAiContentSource,
    PlatformAiStreamingWindow,
    PlatformState,
    PlatformId,
    Player,
    ProjectType,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingCataloguePackage,
    StreamingCataloguePackageComponent,
    StreamingRightsWindowType,
    StudioId,
    TargetAudience,
    WorldState,
} from '../../types';
import { STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION } from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { getAbsoluteWeek } from '../legacyLogic';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    fullCurrencyToMillions,
    getStreamingRightsContract,
    isStreamingLicenseActiveAt,
    millionsToFullCurrency,
    registerStreamingRightsContract,
    validateStreamingRightsAvailability,
} from '../streamingRightsCore';
import { normalizeStreamingDayOneMarketIds, STREAMING_DAY_ONE_MARKETS } from '../streamingDayOneMarkets';
import {
    allocateStreamingCatalogueGuarantee,
    calculateStreamingCatalogueReferenceValue,
    normalizeStreamingCataloguePackageRegistry,
} from '../streamingCataloguePackages';
import { buildStreamingBiddingRightsLot } from '../streamingRightsCompatibility';
import { STUDIO_CATALOG } from '../studioLogic';
import { PLATFORM_AI_PROFILES, type PlatformAiProfile } from './platformAiProfiles';
import { clampPlatformContentPlanSupport, resolvePlatformLocalizationLevel } from './platformAiResearch';
import { appendPlatformAiDecisions, normalizePlatformAiState, resolvePlatformController } from './platformAiState';
import {
    createPendingPlatformAiCommissioningLifecycle,
    createUnfundedPlatformAiProductionEscrow,
    getPlatformAiProductionReserveQuote,
} from './platformAiProductionEscrow';
import { resolveCapabilityBackedLocalizationPromise } from './platformAiLocalizationCore';
import { getPlatformAiSpendingRestrictions } from './platformAiFinancing';

export interface PlatformAiContentCandidate {
    id: string;
    source: PlatformAiContentSource;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    targetAudience: TargetAudience;
    sourceProjectIds: string[];
    producerStudioId: StudioId | null;
    streamingWindow: PlatformAiStreamingWindow;
    territory: StreamingLicenseTerritory;
    /** Exact market snapshot evaluated when this candidate is built. */
    countryIds: string[];
    exclusivity: StreamingLicenseExclusivity;
    durationWeeks: number;
    rightsCostMillions: number;
    productionBudgetMillions: number;
    depositMillions: number;
    scores: {
        strategic: number;
        creative: number;
        commercial: number;
        prestige: number;
        risk: number;
        total: number;
    };
}

export interface PlatformAiSourcingInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}

export interface CommitPlatformContentCandidateInput extends PlatformAiSourcingInput {
    candidate: PlatformAiContentCandidate;
}

export interface CommitPlatformContentCandidateResult {
    world: WorldState;
    changed: boolean;
    plan: PlatformAiContentPlan | null;
    reason?: 'PLAYER_CONTROLLED' | 'PLATFORM_NOT_FOUND' | 'PLATFORM_NOT_ACTIVE' | 'DUPLICATE' | 'INSUFFICIENT_RUNWAY' | 'RIGHTS_CONFLICT' | 'SOURCE_NOT_FOUND';
}

const ACTIVE_PLAN_STATUSES = new Set([
    'BRIEF',
    'PRODUCER_SELECTED',
    'GREENLIT',
    'IN_PRODUCTION',
    'NEGOTIATING',
    'CONTRACTED',
    'RIGHTS_READY',
    'DELIVERED',
    'LOCALIZED',
    'SCHEDULED',
    'ON_HOLD',
]);

const budgetMillions = (project: IndustryProject): number => ({
    LOW: 15,
    MID: 45,
    HIGH: 100,
    BLOCKBUSTER: 180,
}[project.budgetTier]);

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;

const releasedProject = (project: IndustryProject, absoluteWeek: number): boolean => {
    const releaseWeek = getAbsoluteWeek(project.year, project.weekReleased);
    return releaseWeek <= absoluteWeek;
};

export const PLATFORM_AI_RIGHTS_MARKET_PROJECT_LIMIT = 600;

/**
 * The shared, persisted universe from which every rival platform may source
 * released-title rights. Recency defines market membership; platform strategy
 * and project quality only rank titles after this bounded gate.
 */
export const getPlatformAiRightsMarketProjectUniverse = (
    projects: readonly IndustryProject[],
    absoluteWeek: number,
): IndustryProject[] => {
    const seenIds = new Set<string>();
    return projects
        .filter(project => Boolean(project?.id) && releasedProject(project, absoluteWeek))
        .slice()
        .sort((left, right) => (
            getAbsoluteWeek(right.year, right.weekReleased) - getAbsoluteWeek(left.year, left.weekReleased)
            || left.id.localeCompare(right.id)
        ))
        .filter(project => {
            if (seenIds.has(project.id)) return false;
            seenIds.add(project.id);
            return true;
        })
        .slice(0, PLATFORM_AI_RIGHTS_MARKET_PROJECT_LIMIT);
};

export const calculatePlatformAiRightsValueMillions = (project: IndustryProject): number => roundMillions(Math.max(
    3,
    Math.min(90, project.boxOffice * 0.02 / 1_000_000 + (project.rating || project.quality / 10) * 0.55),
));

const getRunwayFloor = (
    cashReserve: number,
    baseWeeklyOperationsMillions: number,
): number => Math.min(cashReserve * 0.4, baseWeeklyOperationsMillions * 8);

const buildScores = (
    profile: PlatformAiProfile,
    genre: Genre,
    quality: number,
    costMillions: number,
    riskBase: number,
) => {
    const genreAffinity = profile.preferredGenres.includes(genre) ? 12 : 4;
    const strategic = profile.competence.strategy * 7 + genreAffinity;
    const creative = profile.competence.creative * 6 + quality * 0.35;
    const commercial = profile.competence.commercial * 7 + quality * 0.25;
    const prestige = profile.competence.prestige * 6 + quality * 0.3;
    const risk = Math.max(1, riskBase + costMillions / 8 - profile.riskTolerance * 10);
    return {
        strategic: roundMillions(strategic),
        creative: roundMillions(creative),
        commercial: roundMillions(commercial),
        prestige: roundMillions(prestige),
        risk: roundMillions(risk),
        total: roundMillions(strategic * 0.3 + creative * 0.2 + commercial * 0.3 + prestige * 0.2 - risk),
    };
};

const hasRunway = (
    cashReserve: number,
    floor: number,
    commitmentMillions: number,
): boolean => cashReserve - commitmentMillions >= floor;

const isNonPlatformStudio = (studioId: StudioId): boolean => (
    Boolean(STUDIO_CATALOG[studioId]) && STUDIO_CATALOG[studioId].archetype !== 'PLATFORM'
);

const territoryForCountries = (countryIds: readonly string[]): StreamingLicenseTerritory => (
    countryIds.length === STREAMING_DAY_ONE_MARKETS.length
        ? 'GLOBAL'
        : countryIds.length === 1 ? 'DOMESTIC' : 'MULTI_REGION'
);

const rightsScopeForPlatform = (platform: PlatformState): {
    territory: StreamingLicenseTerritory;
    countryIds: string[];
} => {
    const countryIds = normalizeStreamingDayOneMarketIds(
        platform.ai?.capabilities.activeCountryIds,
    ).sort();
    return { territory: territoryForCountries(countryIds), countryIds };
};

const rightsWindowForProject = (
    project: IndustryProject,
    permanent: boolean,
): StreamingRightsWindowType => permanent
    ? 'PERMANENT'
    : project.boxOffice > 0 ? 'SECOND_WINDOW' : 'FIRST_WINDOW';

const selectProducerStudio = (
    playerId: string,
    platformId: PlatformId,
    absoluteWeek: number,
    strategyCycle: number,
): StudioId | null => {
    const profile = PLATFORM_AI_PROFILES[platformId];
    const preferred = profile.producerStudioPreferences.filter(isNonPlatformStudio);
    const fallback = (Object.keys(STUDIO_CATALOG) as StudioId[])
        .filter(isNonPlatformStudio)
        .sort();
    const candidates = preferred.length > 0 ? preferred : fallback;
    if (candidates.length === 0) return null;
    const rng = createDeterministicRng([
        playerId,
        platformId,
        absoluteWeek,
        strategyCycle,
        'PRODUCER_SELECTION',
    ].join(':'));
    return candidates[Math.floor(rng() * candidates.length)] || candidates[0];
};

const canUseReleasedProject = (
    input: PlatformAiSourcingInput,
    project: IndustryProject,
    exclusivity: StreamingLicenseExclusivity,
    durationWeeks: number,
    territory: StreamingLicenseTerritory,
    countryIds: string[],
    windowType: StreamingRightsWindowType,
): boolean => validateStreamingRightsAvailability({
    player: input.player,
    world: input.world,
    sourceProjectId: project.id,
    buyerPlatformId: input.platformId,
    territory,
    countryIds: territory === 'GLOBAL' ? [] : countryIds,
    windowType,
    exclusivity,
    startsAtAbsoluteWeek: input.absoluteWeek,
    expiresAtAbsoluteWeek: input.absoluteWeek + durationWeeks,
}).available;

const uniqueById = (candidates: PlatformAiContentCandidate[]): PlatformAiContentCandidate[] => {
    const seen = new Set<string>();
    return candidates.filter(candidate => {
        if (seen.has(candidate.id)) return false;
        seen.add(candidate.id);
        return true;
    });
};

export const buildPlatformContentCandidates = (
    input: PlatformAiSourcingInput,
): PlatformAiContentCandidate[] => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform || resolvePlatformController(input.player, input.platformId) === 'PLAYER') return [];
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    if (ai.status !== 'ACTIVE' || getPlatformAiSpendingRestrictions(platform, input.absoluteWeek).blocksNewGreenlights) return [];
    const profile = PLATFORM_AI_PROFILES[input.platformId];
    const rightsScope = rightsScopeForPlatform(platform);
    const runwayFloor = getRunwayFloor(platform.cashReserve, profile.baseWeeklyOperationsMillions);
    const activePlans = ai.slate.filter(plan => (
        ACTIVE_PLAN_STATUSES.has(plan.status)
        && (plan.source === 'COMMISSIONED_ORIGINAL' || plan.sourceProjectIds.every(projectId => (
            plan.rightsContractIds.some(contractId => {
                const contract = getStreamingRightsContract(input.world.streamingRightsContracts, contractId);
                return Boolean(
                    contract
                    && contract.sourceProjectId === projectId
                    && contract.buyerPlatformId === input.platformId
                    && contract.status === 'ACTIVE'
                    && isStreamingLicenseActiveAt(contract, input.absoluteWeek),
                );
            })
        )))
    ));
    const originalLimit = Math.max(1, Math.floor((
        profile.maxConcurrentProductions + Math.floor(ai.capabilities.technologyLevels.CONTENT_OPERATIONS / 15)
    )));
    const rightsLimit = Math.max(1, Math.floor((
        profile.maxActiveRightsPlans + Math.floor(ai.capabilities.technologyLevels.CONTENT_OPERATIONS / 10)
    )));
    const activeOriginals = activePlans.filter(plan => plan.source === 'COMMISSIONED_ORIGINAL').length;
    const activeRights = activePlans.length - activeOriginals;
    const alreadyCovered = new Set(Object.values(input.world.streamingRightsContracts || {}).filter(contract => (
        contract.buyerPlatformId === input.platformId
        && contract.status === 'ACTIVE'
        && isStreamingLicenseActiveAt(contract, input.absoluteWeek)
    )).map(contract => contract.sourceProjectId));
    const released = getPlatformAiRightsMarketProjectUniverse(input.world.projects, input.absoluteWeek)
        .filter(project => !alreadyCovered.has(project.id))
        .slice()
        .sort((left, right) => right.quality - left.quality || left.id.localeCompare(right.id));
    const candidates: PlatformAiContentCandidate[] = [];

    if (activeOriginals < originalLimit) {
        const producerStudioId = selectProducerStudio(
            input.player.id,
            input.platformId,
            input.absoluteWeek,
            ai.strategyCycle,
        );
        if (producerStudioId) {
            const genre = profile.preferredGenres[ai.strategyCycle % profile.preferredGenres.length] || 'DRAMA';
            const productionBudgetMillions = roundMillions(35 + profile.competence.production * 7.5);
            const depositMillions = roundMillions(productionBudgetMillions * 0.05);
            if (hasRunway(platform.cashReserve, runwayFloor, productionBudgetMillions)) {
                candidates.push({
                    id: createDeterministicId('platform_ai_candidate', input.player.id, input.platformId, input.absoluteWeek, ai.strategyCycle, 'ORIGINAL', genre, producerStudioId),
                    source: 'COMMISSIONED_ORIGINAL',
                    title: `${platform.name} ${genre.replaceAll('_', ' ')} Original`,
                    projectType: ai.strategyCycle % 3 === 0 ? 'SERIES' : 'MOVIE',
                    genre,
                    targetAudience: genre === 'CRIME' || genre === 'HORROR' ? 'R' : 'PG-13',
                    sourceProjectIds: [],
                    producerStudioId,
                    streamingWindow: 'ORIGINAL_STREAMING_PREMIERE',
                    territory: rightsScope.territory,
                    countryIds: rightsScope.countryIds,
                    exclusivity: 'EXCLUSIVE',
                    durationWeeks: 260,
                    rightsCostMillions: 0,
                    productionBudgetMillions,
                    depositMillions,
                    scores: buildScores(profile, genre, 75, productionBudgetMillions, 14),
                });
            }
        }
    }

    if (activeRights < rightsLimit) {
        const ownedProject = released.find(project => (
            profile.ownedStudioIds.includes(project.studioId)
            && rightsScope.countryIds.length > 0
            && canUseReleasedProject(
                input,
                project,
                'NON_EXCLUSIVE',
                520,
                rightsScope.territory,
                rightsScope.countryIds,
                'PERMANENT',
            )
        ));
        if (ownedProject) {
            candidates.push({
                id: createDeterministicId('platform_ai_candidate', input.platformId, 'OWNED', ownedProject.id),
                source: 'OWNED_STUDIO_TRANSFER',
                title: ownedProject.title,
                projectType: ownedProject.mediaType || 'MOVIE',
                genre: ownedProject.genre,
                targetAudience: ownedProject.targetAudience || 'PG-13',
                sourceProjectIds: [ownedProject.id],
                producerStudioId: null,
                streamingWindow: 'OWNED_STUDIO_STREAMING_WINDOW',
                territory: rightsScope.territory,
                countryIds: rightsScope.countryIds,
                exclusivity: 'NON_EXCLUSIVE',
                durationWeeks: 520,
                rightsCostMillions: 0,
                productionBudgetMillions: 0,
                depositMillions: 0,
                scores: buildScores(profile, ownedProject.genre, ownedProject.quality, 0, 2),
            });
        }

        const licensable = released.filter(project => (
            !profile.ownedStudioIds.includes(project.studioId)
            && isNonPlatformStudio(project.studioId)
            && rightsScope.countryIds.length > 0
            && canUseReleasedProject(
                input,
                project,
                'NON_EXCLUSIVE',
                104,
                rightsScope.territory,
                rightsScope.countryIds,
                rightsWindowForProject(project, false),
            )
        ));
        for (const project of licensable.slice(0, 2)) {
            const rightsCostMillions = calculatePlatformAiRightsValueMillions(project);
            if (!hasRunway(platform.cashReserve, runwayFloor, rightsCostMillions)) continue;
            candidates.push({
                id: createDeterministicId('platform_ai_candidate', input.platformId, 'LICENSE', project.id, input.absoluteWeek),
                source: 'LICENSED_RELEASED_TITLE',
                title: project.title,
                projectType: project.mediaType || 'MOVIE',
                genre: project.genre,
                targetAudience: project.targetAudience || 'PG-13',
                sourceProjectIds: [project.id],
                producerStudioId: null,
                streamingWindow: project.boxOffice > 0 ? 'POST_THEATRICAL_WINDOW' : 'CATALOGUE_WINDOW',
                territory: rightsScope.territory,
                countryIds: rightsScope.countryIds,
                exclusivity: 'NON_EXCLUSIVE',
                durationWeeks: 104,
                rightsCostMillions,
                productionBudgetMillions: 0,
                // Rights become usable immediately, so the canonical minimum guarantee is paid once at signing.
                depositMillions: rightsCostMillions,
                scores: buildScores(profile, project.genre, project.quality, rightsCostMillions, 6),
            });
        }

        const projectsByStudio = new Map<StudioId, IndustryProject[]>();
        for (const project of licensable) {
            projectsByStudio.set(project.studioId, [...(projectsByStudio.get(project.studioId) || []), project]);
        }
        const catalogueGroups = Array.from(projectsByStudio.entries())
            .map(([studioId, projects]) => ({ studioId, projects: projects.slice(0, 5) }))
            .filter(group => group.projects.length >= 3)
            .sort((left, right) => right.projects.length - left.projects.length || left.studioId.localeCompare(right.studioId));
        const group = catalogueGroups[0];
        if (group) {
            const groupedCost = roundMillions(group.projects.reduce((sum, project) => sum + calculatePlatformAiRightsValueMillions(project), 0) * 0.75);
            if (hasRunway(platform.cashReserve, runwayFloor, groupedCost)) {
                const averageQuality = group.projects.reduce((sum, project) => sum + project.quality, 0) / group.projects.length;
                const leadProject = group.projects[0];
                candidates.push({
                    id: createDeterministicId('platform_ai_candidate', input.platformId, 'CATALOGUE', group.studioId, ...group.projects.map(project => project.id).sort()),
                    source: 'CATALOGUE_ACQUISITION',
                    title: `${STUDIO_CATALOG[group.studioId].name} Collection`,
                    projectType: 'MOVIE',
                    genre: leadProject.genre,
                    targetAudience: leadProject.targetAudience || 'PG-13',
                    sourceProjectIds: group.projects.map(project => project.id).sort(),
                    producerStudioId: null,
                    streamingWindow: 'CATALOGUE_WINDOW',
                    territory: rightsScope.territory,
                    countryIds: rightsScope.countryIds,
                    exclusivity: 'NON_EXCLUSIVE',
                    durationWeeks: 156,
                    rightsCostMillions: groupedCost,
                    productionBudgetMillions: 0,
                    // Catalogue rights use the same one-time canonical MG boundary as single-title rights.
                    depositMillions: groupedCost,
                    scores: buildScores(profile, leadProject.genre, averageQuality, groupedCost, 8),
                });
            }
        }
    }

    return uniqueById(candidates)
        .sort((left, right) => right.scores.total - left.scores.total || left.id.localeCompare(right.id))
        .slice(0, 6);
};

const buildPlan = (
    input: CommitPlatformContentCandidateInput,
    platform: PlatformState,
    planId: string,
    cataloguePackageId: string | null,
): PlatformAiContentPlan => {
    const capabilities = platform.ai!.capabilities;
    const reserveQuote = getPlatformAiProductionReserveQuote(input.candidate.productionBudgetMillions);
    const isOriginal = input.candidate.source === 'COMMISSIONED_ORIGINAL';
    const requestedLocalizationLevel = resolvePlatformLocalizationLevel(capabilities);
    const sourceLanguages = isOriginal
        ? [{ sourceProjectId: null, originalLanguageId: 'english' }]
        : input.candidate.sourceProjectIds.map(sourceProjectId => ({
            sourceProjectId,
            originalLanguageId: input.world.projects.find(project => project.id === sourceProjectId)?.originalLanguageId || 'english',
        }));
    const promises = sourceLanguages.map(source => resolveCapabilityBackedLocalizationPromise({
        platform,
        countryIds: capabilities.activeCountryIds,
        originalLanguageId: source.originalLanguageId,
        requestedLevel: requestedLocalizationLevel,
    }));
    const localizationLevel = promises.every(promise => promise.localizationLevel === requestedLocalizationLevel)
        ? requestedLocalizationLevel
        : promises.every(promise => promise.localizationLevel !== 'NONE') ? 'SUBTITLES' : 'NONE';
    const finalPromises = sourceLanguages.map(source => ({
        sourceProjectId: source.sourceProjectId,
        promise: resolveCapabilityBackedLocalizationPromise({
            platform,
            countryIds: capabilities.activeCountryIds,
            originalLanguageId: source.originalLanguageId,
            requestedLevel: localizationLevel,
        }),
    }));
    const localizationRequirements = finalPromises.flatMap(({ sourceProjectId, promise }) => (
        promise.requirements.map(requirement => ({ ...requirement, sourceProjectId }))
    ));
    return clampPlatformContentPlanSupport({
    id: planId,
    platformId: input.platformId,
    controllerAtCommitment: 'AI',
    source: input.candidate.source,
    status: input.candidate.source === 'COMMISSIONED_ORIGINAL' ? 'BRIEF' : 'RIGHTS_READY',
    title: input.candidate.title,
    projectType: input.candidate.projectType,
    genre: input.candidate.genre,
    targetAudience: input.candidate.targetAudience,
    sourceProjectIds: [...input.candidate.sourceProjectIds],
    rightsContractIds: [],
    cataloguePackageId,
    commissionId: null,
    sourceStudioId: input.candidate.source === 'COMMISSIONED_ORIGINAL'
        ? input.candidate.producerStudioId
        : input.world.projects.find(project => project.id === input.candidate.sourceProjectIds[0])?.studioId || null,
    streamingWindow: input.candidate.streamingWindow,
    localizationLevel,
    localizationRequirements,
    releaseCountryIds: [...capabilities.activeCountryIds],
    minimumGuaranteeMillions: input.candidate.rightsCostMillions,
    rightsCostMillions: input.candidate.rightsCostMillions,
    productionFundingMillions: input.candidate.productionBudgetMillions,
    paidSpendMillions: input.candidate.depositMillions,
    marketingReserveMillions: isOriginal ? reserveQuote.marketingMillions : 0,
    contingencyMillions: isOriginal ? reserveQuote.contingencyMillions : 0,
    productionEscrow: createUnfundedPlatformAiProductionEscrow(input.candidate.productionBudgetMillions),
    commissioningLifecycle: isOriginal
        ? createPendingPlatformAiCommissioningLifecycle(input.absoluteWeek, input.candidate.depositMillions)
        : null,
    committedAtAbsoluteWeek: input.absoluteWeek,
    rightsReadyAtAbsoluteWeek: input.candidate.source === 'COMMISSIONED_ORIGINAL' ? null : input.absoluteWeek,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
    forecast: {
        strategic: input.candidate.scores.strategic,
        creative: input.candidate.scores.creative,
        commercial: input.candidate.scores.commercial,
        prestige: input.candidate.scores.prestige,
        risk: input.candidate.scores.risk,
    },
    }, capabilities);
};

export const commitPlatformContentCandidate = (
    input: CommitPlatformContentCandidateInput,
): CommitPlatformContentCandidateResult => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, plan: null, reason: 'PLATFORM_NOT_FOUND' };
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, plan: null, reason: 'PLAYER_CONTROLLED' };
    }
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    if (ai.status !== 'ACTIVE' || getPlatformAiSpendingRestrictions(platform, input.absoluteWeek).blocksNewGreenlights) {
        return { world: input.world, changed: false, plan: null, reason: 'PLATFORM_NOT_ACTIVE' };
    }
    const planId = createDeterministicId('platform_ai_content_plan', input.platformId, input.candidate.id);
    const existing = ai.slate.find(plan => plan.id === planId);
    if (existing) return { world: input.world, changed: false, plan: existing, reason: 'DUPLICATE' };
    const profile = PLATFORM_AI_PROFILES[input.platformId];
    const runwayFloor = getRunwayFloor(platform.cashReserve, profile.baseWeeklyOperationsMillions);
    const commitment = input.candidate.rightsCostMillions + input.candidate.productionBudgetMillions;
    if (!hasRunway(platform.cashReserve, runwayFloor, commitment)) {
        return { world: input.world, changed: false, plan: null, reason: 'INSUFFICIENT_RUNWAY' };
    }
    const sourceProjects = input.candidate.sourceProjectIds.map(projectId => (
        input.world.projects.find(project => project.id === projectId)
    ));
    if (sourceProjects.some(project => !project)) {
        return { world: input.world, changed: false, plan: null, reason: 'SOURCE_NOT_FOUND' };
    }
    const cataloguePackageId = input.candidate.source === 'CATALOGUE_ACQUISITION'
        ? createDeterministicId('platform_ai_catalogue_package', input.platformId, ...input.candidate.sourceProjectIds.slice().sort())
        : null;
    const plan = buildPlan(input, platform, planId, cataloguePackageId);
    const requestedCountryIds = normalizeStreamingDayOneMarketIds(
        input.candidate.countryIds?.length
            ? input.candidate.countryIds
            : platform.ai!.capabilities.activeCountryIds,
    ).sort();
    const requestedTerritory = territoryForCountries(requestedCountryIds);
    let cataloguePackage: StreamingCataloguePackage | null = null;
    const catalogueAllocations = new Map<string, ReturnType<typeof allocateStreamingCatalogueGuarantee>['rows'][number]>();
    if (input.candidate.source === 'CATALOGUE_ACQUISITION' && cataloguePackageId) {
        const rawComponents = sourceProjects.flatMap(project => {
            if (!project) return [];
            const windowType = rightsWindowForProject(project, false);
            const lotBuild = buildStreamingBiddingRightsLot({
                world: input.world,
                sourceProjectId: project.id,
                sellerPartyId: project.studioId,
                startsAtAbsoluteWeek: input.absoluteWeek,
                maximumDurationWeeks: input.candidate.durationWeeks,
                windowType,
                desiredCountryIds: requestedCountryIds,
            });
            if (!lotBuild.lot) return [];
            const component: StreamingCataloguePackageComponent = {
                sourceProjectId: project.id,
                title: project.title,
                projectType: project.mediaType || 'MOVIE',
                genre: project.genre,
                originalLanguageId: project.originalLanguageId || 'english',
                sellerStudioId: project.studioId,
                quality: project.quality,
                audience: 0,
                budget: millionsToFullCurrency(budgetMillions(project)),
                theatricalGross: Math.max(0, project.boxOffice || 0),
                streamingRevenue: 0,
                franchiseProtected: Boolean((project as any).franchiseId || project.universeId),
                rightsLot: lotBuild.lot,
                referenceValue: 0,
                referenceWeight: 0,
            };
            return [component];
        }).sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
        if (rawComponents.length !== sourceProjects.length || rawComponents.length < 2) {
            return { world: input.world, changed: false, plan: null, reason: 'RIGHTS_CONFLICT' };
        }
        const referenceValues = rawComponents.map(component => calculateStreamingCatalogueReferenceValue(component));
        const referenceTotal = referenceValues.reduce((sum, value) => sum + value, 0);
        const components = rawComponents.map((component, index) => ({
            ...component,
            referenceValue: referenceValues[index],
            referenceWeight: referenceTotal > 0 ? referenceValues[index] / referenceTotal : 1 / rawComponents.length,
        }));
        const bidderValues = Object.fromEntries(sourceProjects.map(project => [
            project!.id,
            millionsToFullCurrency(calculatePlatformAiRightsValueMillions(project!))
                * (PLATFORM_AI_PROFILES[input.platformId].preferredGenres.includes(project!.genre) ? 1.12 : 0.94),
        ]));
        const allocation = allocateStreamingCatalogueGuarantee({
            totalGuarantee: millionsToFullCurrency(input.candidate.rightsCostMillions),
            components,
            platformId: input.platformId,
            bidderValues,
            durationWeeks: input.candidate.durationWeeks,
            exclusivity: input.candidate.exclusivity,
            localization: plan.localizationLevel,
            localizationRequirements: plan.localizationRequirements || [],
        });
        if (!allocation.valid || allocation.rows.length !== components.length) {
            return { world: input.world, changed: false, plan: null, reason: 'RIGHTS_CONFLICT' };
        }
        allocation.rows.forEach(row => catalogueAllocations.set(row.componentProjectId, row));
        const sellerStudioId = sourceProjects[0]!.studioId;
        const sellerName = STUDIO_CATALOG[sellerStudioId]?.name || sellerStudioId;
        cataloguePackage = {
            schemaVersion: STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION,
            id: cataloguePackageId,
            idempotencyKey: `platform-ai-catalogue-package:${cataloguePackageId}`,
            source: 'PLATFORM_AI_SOURCING',
            lifecycle: 'SIGNED',
            name: input.candidate.title,
            seller: { type: 'NPC_STUDIO', id: sellerStudioId, name: sellerName, platformId: null },
            createdAtAbsoluteWeek: input.absoluteWeek,
            startsAtAbsoluteWeek: input.absoluteWeek,
            requestedWindowType: components[0].rightsLot.windowType,
            requestedExclusivity: input.candidate.exclusivity,
            requestedCountryIds,
            maximumDurationWeeks: input.candidate.durationWeeks,
            components,
            excluded: [],
            controlModeAtCreation: 'STRATEGY',
            protectionReasons: [],
            delegatedReason: `${platform.name} filled a persisted catalogue gap within runway and rights constraints.`,
            manualApprovalRequired: false,
            biddingSessionId: null,
            acceptedOfferId: createDeterministicId('platform_ai_catalogue_offer', cataloguePackageId, input.platformId),
            signedAtAbsoluteWeek: input.absoluteWeek,
            totalGuarantee: millionsToFullCurrency(input.candidate.rightsCostMillions),
            totalExpectedExposure: allocation.rows.reduce((sum, row) => sum + row.expectedTotalCost, 0),
            acceptedTerms: allocation.rows,
            componentContractIds: [],
            digestId: null,
        };
    }
    const contracts = sourceProjects.flatMap((project, index) => {
        if (!project || input.candidate.source === 'COMMISSIONED_ORIGINAL') return [];
        const permanent = input.candidate.source === 'OWNED_STUDIO_TRANSFER';
        const expiresAtAbsoluteWeek = permanent
            ? Number.MAX_SAFE_INTEGER
            : input.absoluteWeek + input.candidate.durationWeeks;
        const windowType = rightsWindowForProject(project, permanent);
        const availability = validateStreamingRightsAvailability({
            player: input.player,
            world: input.world,
            sourceProjectId: project.id,
            buyerPlatformId: input.platformId,
            territory: requestedTerritory,
            countryIds: requestedTerritory === 'GLOBAL' ? [] : requestedCountryIds,
            windowType,
            exclusivity: input.candidate.exclusivity,
            startsAtAbsoluteWeek: input.absoluteWeek,
            expiresAtAbsoluteWeek,
        });
        if (!availability.available) return [];
        const catalogueRow = catalogueAllocations.get(project.id);
        const perProjectCost = catalogueRow
            ? fullCurrencyToMillions(catalogueRow.minimumGuarantee)
            : input.candidate.rightsCostMillions;
        return [createStreamingLicenseContract({
            id: createDeterministicId('platform_ai_rights_contract', planId, project.id, index),
            sourceProject: project,
            buyerPlatformId: input.platformId,
            platformContentPlanId: planId,
            cataloguePackageId,
            contentSource: input.candidate.source,
            licensorName: STUDIO_CATALOG[project.studioId]?.name || project.studioId,
            territory: catalogueRow?.territory || requestedTerritory,
            countryIds: catalogueRow?.countryIds || (requestedTerritory === 'GLOBAL' ? [] : requestedCountryIds),
            durationWeeks: catalogueRow?.durationWeeks || input.candidate.durationWeeks,
            exclusivity: catalogueRow?.exclusivity || input.candidate.exclusivity,
            minimumGuarantee: millionsToFullCurrency(perProjectCost),
            platformRevenueShare: input.candidate.source === 'OWNED_STUDIO_TRANSFER'
                ? 100
                : catalogueRow?.platformRevenueShare || 70,
            signedAtAbsoluteWeek: input.absoluteWeek,
            startsAtAbsoluteWeek: input.absoluteWeek,
            origin: input.candidate.source === 'OWNED_STUDIO_TRANSFER'
                ? 'OWNED_STUDIO_TRANSFER'
                : input.candidate.source === 'CATALOGUE_ACQUISITION'
                    ? 'CATALOGUE_ACQUISITION'
                    : 'STUDIO_MARKET',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: catalogueRow?.windowType || windowType,
            permanentPurchase: permanent,
            renewalOption: !permanent,
            sublicensingAllowed: input.candidate.exclusivity === 'NON_EXCLUSIVE',
            sequelRightsIncluded: false,
            changeOfControl: permanent ? 'NONE' : 'NOTICE',
            cancellationPenalty: millionsToFullCurrency(perProjectCost * 0.2),
        })];
    });
    if (input.candidate.source !== 'COMMISSIONED_ORIGINAL' && contracts.length !== sourceProjects.length) {
        return { world: input.world, changed: false, plan: null, reason: 'RIGHTS_CONFLICT' };
    }
    let streamingRightsContracts = input.world.streamingRightsContracts;
    contracts.forEach((contract, index) => {
        const project = sourceProjects[index]!;
        const licensorName = STUDIO_CATALOG[project.studioId]?.name || project.studioId;
        const registration = registerStreamingRightsContract(
            streamingRightsContracts,
            createStreamingRightsContractFromLicense({
                license: contract,
                seller: {
                    type: 'NPC_STUDIO',
                    id: project.studioId,
                    name: licensorName,
                    platformId: null,
                },
                buyer: {
                    type: 'AI_PLATFORM',
                    id: input.platformId,
                    name: platform.name,
                    platformId: input.platformId,
                },
                guaranteeDisposition: input.candidate.source === 'OWNED_STUDIO_TRANSFER' ? 'INTERNAL' : 'PAID',
                settledAtAbsoluteWeek: input.absoluteWeek,
                localization: plan.localizationLevel,
                localizationRequirements: plan.localizationRequirements,
                guaranteeRecoupment: catalogueAllocations.get(project.id)?.guaranteeRecoupment,
                backendCap: catalogueAllocations.get(project.id)?.backendCap,
                sourceOfferId: cataloguePackage?.acceptedOfferId,
            }),
        );
        streamingRightsContracts = registration.registry;
    });
    const committedPlan: PlatformAiContentPlan = {
        ...plan,
        rightsContractIds: contracts.map(contract => contract.id),
    };
    if (cataloguePackage) cataloguePackage = { ...cataloguePackage, componentContractIds: [...committedPlan.rightsContractIds].sort() };
    const decision = {
        id: createDeterministicId('platform_ai_decision', input.platformId, planId, 'CONTENT_COMMITMENT'),
        absoluteWeek: input.absoluteWeek,
        type: 'CONTENT_COMMITMENT',
        summary: `${platform.name} committed to ${input.candidate.title}.`,
        reason: `${input.candidate.source} ranked among the platform's strongest current options.`,
        cashImpactMillions: -input.candidate.depositMillions,
    };
    const nextPlatform = {
        ...platform,
        cashReserve: roundMillions(platform.cashReserve - input.candidate.depositMillions),
        ai: {
            ...ai,
            slate: [...ai.slate, committedPlan],
            rightsContracts: [...ai.rightsContracts, ...contracts],
            decisionHistory: appendPlatformAiDecisions(ai.decisionHistory, [decision]),
        },
    };
    return {
        world: {
            ...input.world,
            streamingRightsContracts,
            streamingCataloguePackages: cataloguePackage ? {
                ...normalizeStreamingCataloguePackageRegistry(input.world.streamingCataloguePackages),
                [cataloguePackage.id]: cataloguePackage,
            } : input.world.streamingCataloguePackages,
            platforms: { ...input.world.platforms, [input.platformId]: nextPlatform },
        },
        changed: true,
        plan: committedPlan,
    };
};
