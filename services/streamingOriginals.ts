import type {
    Business,
    Genre,
    OwnedStreamingLaunchSlate,
    OwnedStreamingLedgerEntry,
    OwnedStreamingOriginalCommission,
    OwnedStreamingOriginalCommissionDraft,
    OwnedStreamingSlateEntry,
    Player,
    ProjectConcept,
    Script,
    StreamingOriginalCommissionStatus,
    StreamingOriginalGapId,
    StreamingOriginalStrategy,
    StreamingSlateMarketingPlan,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { getStreamingContentAvailability } from './streamingContentAvailability';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    getStreamingCatalogLicenseStatus,
    resolveStreamingCatalogTitle,
} from './streamingCatalog';
import { resolveOwnedStreamingReach } from './streamingProgression';

export interface StreamingAudienceGap {
    id: StreamingOriginalGapId;
    title: string;
    signal: string;
    rationale: string;
    recommendedType: 'MOVIE' | 'SERIES';
    recommendedGenre: Genre;
    demandScore: number;
    catalogCount: number;
}

export interface StreamingSlateCandidate {
    projectId: string;
    title: string;
    source: OwnedStreamingSlateEntry['source'];
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
}

export interface StreamingSlateWarning {
    id: string;
    severity: 'BLOCKER' | 'WARNING' | 'NOTE';
    title: string;
    detail: string;
}

export const STREAMING_MARKETING_PLAN_BEATS: Record<StreamingSlateMarketingPlan, Array<{
    offset: number;
    label: string;
}>> = {
    LEAN: [
        { offset: -1, label: 'Final trailer' },
        { offset: 0, label: 'Platform premiere' },
    ],
    STANDARD: [
        { offset: -3, label: 'First look' },
        { offset: -1, label: 'Official trailer' },
        { offset: 0, label: 'Platform premiere' },
    ],
    EVENT: [
        { offset: -5, label: 'Title announcement' },
        { offset: -3, label: 'Teaser campaign' },
        { offset: -1, label: 'Global trailer' },
        { offset: 0, label: 'Premiere event' },
    ],
};

const cleanTitle = (value: string): string => (
    value.replace(/\s+/g, ' ').trim().slice(0, 100)
);

export const STREAMING_MINIMUM_ORIGINAL_BUDGET = 5_000_000;

const defaultStrategyForGap = (gapId: StreamingOriginalGapId): StreamingOriginalStrategy => {
    if (gapId === 'PRESTIGE_ANCHOR') return 'PRESTIGE_LIMITED';
    if (gapId === 'BROAD_AUDIENCE') return 'EVENT_BLOCKBUSTER';
    if (gapId === 'GENRE_WHITE_SPACE') return 'REGIONAL_BREAKOUT';
    return 'WEEKLY_RETENTION';
};

const roundBudget = (value: number): number => (
    Math.max(
        STREAMING_MINIMUM_ORIGINAL_BUDGET,
        Math.round(value / 1_000_000) * 1_000_000,
    )
);

export const getStreamingProductionPartners = (player: Player): Business[] => (
    player.businesses.filter(business => (
        business.type === 'PRODUCTION_HOUSE'
        && business.isActive
        && business.studioState?.operatingModel !== 'FULL_MERGER'
    ))
);

export const getStreamingAudienceGaps = (player: Player): StreamingAudienceGap[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const titles = platform.catalogProjectIds
        .map(projectId => resolveStreamingCatalogTitle(player, projectId))
        .filter((title): title is NonNullable<typeof title> => Boolean(title));
    const seriesCount = titles.filter(title => title.projectType === 'SERIES').length;
    const genres = new Map<string, number>();
    titles.forEach(title => genres.set(title.genre, (genres.get(title.genre) || 0) + 1));
    const promise = platform.identity?.brandPromiseId || 'BALANCED';
    const whiteSpaceGenre: Genre = promise === 'EVENT_HOUSE'
        ? 'ACTION'
        : promise === 'FANDOM_FOREVER'
            ? 'FANTASY'
            : promise === 'WORLD_STAGE'
                ? 'CRIME'
                : promise === 'EVERYONES_SCREEN'
                    ? 'COMEDY'
                    : promise === 'TECHNOLOGY_FIRST'
                        ? 'SCI_FI'
                        : 'THRILLER';
    const prestigeGenre: Genre = genres.has('DRAMA') ? 'BIOPIC' : 'DRAMA';
    const broadGenre: Genre = genres.has('COMEDY') ? 'ADVENTURE' : 'COMEDY';
    const gaps: StreamingAudienceGap[] = [
        {
            id: 'SERIES_RETENTION',
            title: 'A weekly return habit',
            signal: seriesCount === 0 ? 'No series in the opening library' : `Only ${seriesCount} series title${seriesCount === 1 ? '' : 's'}`,
            rationale: 'A character-led series gives viewers a reason to return after the first launch-night binge.',
            recommendedType: 'SERIES',
            recommendedGenre: genres.has('CRIME') ? 'MYSTERY' : 'CRIME',
            demandScore: Math.max(70, 96 - seriesCount * 8),
            catalogCount: seriesCount,
        },
        {
            id: 'GENRE_WHITE_SPACE',
            title: `${whiteSpaceGenre.replace('_', ' ')} identity gap`,
            signal: `${genres.get(whiteSpaceGenre) || 0} matching catalog titles`,
            rationale: 'Use the first Original to make the founding brand promise visible, not merely stated.',
            recommendedType: promise === 'EVENT_HOUSE' ? 'MOVIE' : 'SERIES',
            recommendedGenre: whiteSpaceGenre,
            demandScore: Math.max(64, 91 - (genres.get(whiteSpaceGenre) || 0) * 10),
            catalogCount: genres.get(whiteSpaceGenre) || 0,
        },
        {
            id: 'PRESTIGE_ANCHOR',
            title: 'Prestige conversation',
            signal: 'Awards and critical identity are unproven',
            rationale: 'A premium creator-led project can establish taste and keep the platform in cultural conversation.',
            recommendedType: 'MOVIE',
            recommendedGenre: prestigeGenre,
            demandScore: 78,
            catalogCount: genres.get(prestigeGenre) || 0,
        },
        {
            id: 'BROAD_AUDIENCE',
            title: 'Shared-screen reach',
            signal: 'Opening catalog needs a broad invitation',
            rationale: 'A welcoming, high-concept title can widen the funnel without diluting the platform identity.',
            recommendedType: 'MOVIE',
            recommendedGenre: broadGenre,
            demandScore: 74,
            catalogCount: genres.get(broadGenre) || 0,
        },
    ];
    return gaps.sort((a, b) => b.demandScore - a.demandScore);
};

export const createDefaultStreamingOriginalDraft = (player: Player): OwnedStreamingOriginalCommissionDraft => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const gap = getStreamingAudienceGaps(player)[0];
    const studio = getStreamingProductionPartners(player)[0];
    const reach = resolveOwnedStreamingReach(platform);
    const desiredBudgetByReach = [15_000_000, 20_000_000, 55_000_000, 100_000_000, 180_000_000] as const;
    const desiredBudget = desiredBudgetByReach[reach.level];
    const treasuryAwareRecommendation = Math.max(
        5_000_000,
        Math.min(desiredBudget, platform.treasuryCash * 0.65),
    );
    return {
        currentStep: 0,
        gapId: gap.id,
        title: '',
        projectType: gap.recommendedType,
        genre: gap.recommendedGenre,
        episodes: gap.recommendedType === 'SERIES' ? 8 : 1,
        targetAudience: 'PG-13',
        producerStudioId: studio?.id || null,
        productionBudgetCap: roundBudget(treasuryAwareRecommendation),
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        strategy: defaultStrategyForGap(gap.id),
        platformRightsPercent: 85,
        exclusiveWindowWeeks: 24,
        sequelRightsIncluded: true,
        parentCommissionId: null,
        lineageId: null,
        seasonNumber: 1,
    };
};

export const saveStreamingOriginalDraft = (
    player: Player,
    draft: OwnedStreamingOriginalCommissionDraft,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (
        !['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)
        || platform.originalCommissions.some(commission => !commission.canonicalProjectId)
    ) return player;
    const gaps = getStreamingAudienceGaps(player);
    const gap = gaps.find(item => item.id === draft.gapId) || gaps[0];
    const partnerIds = new Set(getStreamingProductionPartners(player).map(studio => studio.id));
    const projectType = draft.projectType === 'MOVIE' ? 'MOVIE' : 'SERIES';
    const nextDraft: OwnedStreamingOriginalCommissionDraft = {
        currentStep: Math.max(0, Math.min(3, Math.round(draft.currentStep || 0))),
        gapId: gap.id,
        title: cleanTitle(draft.title),
        projectType,
        genre: draft.genre,
        episodes: projectType === 'SERIES' ? Math.max(4, Math.min(24, Math.round(draft.episodes || 8))) : 1,
        targetAudience: draft.targetAudience,
        producerStudioId: draft.producerStudioId && partnerIds.has(draft.producerStudioId) ? draft.producerStudioId : null,
        productionBudgetCap: Math.max(
            STREAMING_MINIMUM_ORIGINAL_BUDGET,
            Math.min(platform.treasuryCash, roundBudget(draft.productionBudgetCap)),
        ),
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        strategy: draft.strategy || defaultStrategyForGap(gap.id),
        platformRightsPercent: Math.max(51, Math.min(100, Math.round(draft.platformRightsPercent || 85))),
        exclusiveWindowWeeks: Math.max(4, Math.min(104, Math.round(draft.exclusiveWindowWeeks || 24))),
        sequelRightsIncluded: draft.sequelRightsIncluded !== false,
        parentCommissionId: draft.parentCommissionId || null,
        lineageId: draft.lineageId || null,
        seasonNumber: Math.max(1, Math.min(50, Math.round(draft.seasonNumber || 1))),
    };
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            originalCommissionDraft: nextDraft,
        }, player.id),
    };
};

export const commissionFirstStreamingOriginal = (
    player: Player,
    inputDraft: OwnedStreamingOriginalCommissionDraft,
): {
    player: Player;
    changed: boolean;
    reason?: 'INVALID_STATE' | 'MISSING_TITLE' | 'MISSING_PRODUCER' | 'INSUFFICIENT_TREASURY';
    target?: { studioId: string; scriptId: string; commissionId: string };
} => {
    const saved = saveStreamingOriginalDraft(player, inputDraft);
    const platform = normalizeOwnedStreamingPlatformState(saved.ownedStreamingPlatform, saved.id);
    const draft = platform.originalCommissionDraft;
    if (
        !['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)
        || platform.originalCommissions.some(commission => !commission.canonicalProjectId)
        || !draft
    ) {
        return { player: saved, changed: false, reason: 'INVALID_STATE' };
    }
    if (!cleanTitle(draft.title)) return { player: saved, changed: false, reason: 'MISSING_TITLE' };
    const studio = getStreamingProductionPartners(saved).find(item => item.id === draft.producerStudioId);
    if (!studio || !studio.studioState) return { player: saved, changed: false, reason: 'MISSING_PRODUCER' };
    if (
        draft.productionBudgetCap < STREAMING_MINIMUM_ORIGINAL_BUDGET
        || platform.treasuryCash < draft.productionBudgetCap
    ) {
        return { player: saved, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }

    const absoluteWeek = getAbsoluteWeek(saved.age, saved.currentWeek);
    const mandateKey = `original-commission:${absoluteWeek}:${cleanTitle(draft.title).toLowerCase()}`;
    if (platform.eventLedger.some(entry => entry.idempotencyKey === mandateKey)) {
        return { player: saved, changed: false, reason: 'INVALID_STATE' };
    }
    const commissionId = createDeterministicId('streaming_original', platform.simulationSeed, mandateKey);
    const scriptId = createDeterministicId('streaming_script', platform.simulationSeed, mandateKey);
    const fundingId = createDeterministicId('streaming_funding', platform.simulationSeed, mandateKey);
    const script: Script = {
        id: scriptId,
        title: cleanTitle(draft.title),
        genres: [draft.genre],
        status: 'READY',
        quality: 68,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: true,
        projectType: draft.projectType,
        format: 'LIVE_ACTION',
        targetAudience: draft.targetAudience,
        episodes: draft.projectType === 'SERIES' ? draft.episodes : undefined,
        baseQuality: 68,
        logline: `Commissioned to answer the ${draft.gapId.toLowerCase().replace(/_/g, ' ')} audience gap.`,
        sourceMaterial: 'ORIGINAL',
        tags: ['STREAMING_ORIGINAL', 'COMMISSIONED'],
        createdAtWeek: saved.currentWeek,
        lockedStreamingFunding: {
            id: fundingId,
            platformId: 'OWNED_STREAMING',
            platformName: platform.identity?.name || 'EMPIRE+',
            amount: draft.productionBudgetCap,
            sourceProjectId: commissionId,
            sourceTitle: cleanTitle(draft.title),
            projectType: draft.projectType,
            createdWeek: saved.currentWeek,
            createdYear: saved.age,
            reason: draft.parentCommissionId ? `Original continuation season ${draft.seasonNumber || 2}` : 'Platform Original production mandate',
            ownedStreamingCommissionId: commissionId,
            fundingSource: 'OWNED_STREAMING_PLATFORM',
        },
    };
    const concept: ProjectConcept = {
        id: createDeterministicId('streaming_concept', platform.simulationSeed, mandateKey),
        scriptId,
        lastUpdated: absoluteWeek,
        crewModes: {},
        selectedCrew: {},
        castList: [],
        selectedLocations: [],
        tone: 50,
        reservedMarketingBudget: 0,
        marketingBudgetSpent: 0,
        marketingBudgetRemaining: 0,
        lockedStreamingFunding: script.lockedStreamingFunding,
        lastStep: 'DIRECTOR',
    };
    const commission: OwnedStreamingOriginalCommission = {
        id: commissionId,
        scriptId,
        canonicalProjectId: null,
        title: script.title,
        gapId: draft.gapId,
        projectType: draft.projectType,
        genre: draft.genre,
        episodes: draft.projectType === 'SERIES' ? draft.episodes : 1,
        producerStudioId: studio.id,
        producerStudioName: studio.name,
        commissionedByPlatformName: platform.identity?.name || 'EMPIRE+',
        productionBudgetCap: draft.productionBudgetCap,
        productionFundingApplied: 0,
        status: 'READY_FOR_GREENLIGHT',
        commissionedAtAbsoluteWeek: absoluteWeek,
        greenlitAtAbsoluteWeek: null,
        strategy: draft.strategy || defaultStrategyForGap(draft.gapId),
        parentCommissionId: draft.parentCommissionId || null,
        lineageId: draft.lineageId || commissionId,
        seasonNumber: Math.max(1, Math.round(draft.seasonNumber || 1)),
        contract: {
            platformRightsPercent: Math.max(51, Math.min(100, Math.round(draft.platformRightsPercent || 85))),
            producerBackendPercent: 100 - Math.max(51, Math.min(100, Math.round(draft.platformRightsPercent || 85))),
            exclusiveWindowWeeks: Math.max(4, Math.min(104, Math.round(draft.exclusiveWindowWeeks || 24))),
            sequelRightsIncluded: draft.sequelRightsIncluded !== false,
        },
        localization: null,
        releasePlan: null,
        lifecycleDecision: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, mandateKey),
        idempotencyKey: mandateKey,
        absoluteWeek,
        type: 'ORIGINAL_COMMISSIONED',
        summary: `${commission.commissionedByPlatformName} commissioned ${commission.title} from ${studio.name}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            commissionId,
            scriptId,
            producerStudioId: studio.id,
            productionBudgetCap: draft.productionBudgetCap,
        },
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - draft.productionBudgetCap,
        originalCommissionDraft: null,
        originalCommissions: [...platform.originalCommissions, commission],
        eventLedger: [...platform.eventLedger, ledger],
    }, saved.id);
    return {
        player: {
            ...saved,
            ownedStreamingPlatform: nextPlatform,
            businesses: saved.businesses.map(candidate => candidate.id !== studio.id ? candidate : {
                ...candidate,
                studioState: {
                    ...candidate.studioState!,
                    scripts: [...(candidate.studioState?.scripts || []), script],
                    concepts: [...(candidate.studioState?.concepts || []), concept],
                    lockedStreamingFunds: [...(candidate.studioState?.lockedStreamingFunds || []), script.lockedStreamingFunding!],
                },
            }),
        },
        changed: true,
        target: { studioId: studio.id, scriptId, commissionId },
    };
};

export const finalizeOwnedStreamingOriginalGreenlight = (player: Player): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const target = platform.originalCommissions.find(commission => !commission.canonicalProjectId);
    if (!target) return player;
    const commitment = player.commitments.find(item => (
        item.projectDetails?.hiddenStats?.ownedStreamingCommissionId === target.id
        || item.projectDetails?.sourceScriptId === target.scriptId
    ));
    if (!commitment) return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const applied = Math.max(0, Math.round(Number(commitment.projectDetails?.hiddenStats?.platformProductionFundingApplied || 0)));
    const unused = Math.max(0, target.productionBudgetCap - applied);
    const ledgerKey = `original-greenlit:${target.id}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, ledgerKey),
        idempotencyKey: ledgerKey,
        absoluteWeek,
        type: 'ORIGINAL_GREENLIT',
        summary: `${target.title} entered production at ${target.producerStudioName}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            commissionId: target.id,
            projectId: commitment.id,
            productionFundingApplied: applied,
            unusedFundingReturned: unused,
        },
    };
    const isFirstOriginal = platform.originalCommissions[0]?.id === target.id;
    const cinematicKey = `first-original-announcement:${target.id}`;
    const cinematicId = createDeterministicId('streaming_scene', platform.simulationSeed, cinematicKey);
    const nextLedger = [...platform.eventLedger, ledger];
    const nextCinematics = [...platform.cinematicQueue];
    if (isFirstOriginal) {
        nextLedger.push({
            id: createDeterministicId('streaming_event', platform.simulationSeed, `cinematic:${cinematicKey}`),
            idempotencyKey: `cinematic:${cinematicKey}`,
            absoluteWeek,
            type: 'CINEMATIC_QUEUED',
            summary: 'First Original announcement queued.',
            source: 'SYSTEM',
            metadata: { cinematicId },
        });
        nextCinematics.push({
            id: cinematicId,
            idempotencyKey: cinematicKey,
            type: 'FIRST_ORIGINAL_ANNOUNCEMENT',
            status: 'QUEUED',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: absoluteWeek,
            title: `${target.title} is the first ${target.commissionedByPlatformName} Original`,
            factIds: [ledger.id],
        });
    }
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            treasuryCash: platform.treasuryCash + unused,
            originalCommissions: platform.originalCommissions.map(commission => commission.id === target.id ? {
                ...commission,
                canonicalProjectId: commitment.id,
                productionFundingApplied: applied,
                status: 'GREENLIT',
                greenlitAtAbsoluteWeek: absoluteWeek,
            } : commission),
            milestoneKeys: isFirstOriginal
                ? Array.from(new Set([...platform.milestoneKeys, 'first-original-greenlit']))
                : platform.milestoneKeys,
            eventLedger: nextLedger,
            cinematicQueue: nextCinematics,
        }, player.id),
    };
};

export const getStreamingOriginalLiveStatus = (
    player: Player,
    commission: OwnedStreamingOriginalCommission,
): StreamingOriginalCommissionStatus => {
    if (!commission.canonicalProjectId) return 'READY_FOR_GREENLIGHT';
    if (player.activeReleases.some(project => project.id === commission.canonicalProjectId)
        || player.pastProjects.some(project => project.id === commission.canonicalProjectId)) return 'RELEASED';
    const commitment = player.commitments.find(item => item.id === commission.canonicalProjectId);
    if (!commitment) return commission.status;
    if (commitment.projectPhase === 'AWAITING_RELEASE') return 'DELIVERED';
    if (['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION'].includes(commitment.projectPhase || '')) return 'IN_PRODUCTION';
    return 'GREENLIT';
};

/**
 * The opening slate remains the canonical launch calendar. Phase 15 release
 * authorizations extend that calendar by reference so later Originals can
 * enter the same weekly, analytics and promotion systems without copying a
 * project, cast, budget or release result.
 */
export const getOwnedStreamingProgramEntries = (player: Player): OwnedStreamingSlateEntry[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const launchAbsoluteWeek = platform.launchCommit?.committedAtAbsoluteWeek ?? null;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const activeLicensedProjectIds = new Set(platform.catalogLicenses
        .filter(license => (
            license.status === 'ACTIVE'
            && license.startsAtAbsoluteWeek <= absoluteWeek
            && getStreamingCatalogLicenseStatus(license, absoluteWeek) === 'ACTIVE'
        ))
        .map(license => license.sourceProjectId));
    const openingEntries = (platform.launchSlate?.entries || [])
        .filter(entry => entry.source !== 'LICENSED_WINDOW' || activeLicensedProjectIds.has(entry.projectId))
        .map(entry => {
            if (entry.source !== 'LICENSED_WINDOW') return entry;
            const license = platform.catalogLicenses.find(item => (
                item.sourceProjectId === entry.projectId && item.status === 'ACTIVE'
            ));
            return license ? {
                ...entry,
                projectType: license.projectType || entry.projectType,
                genre: license.genre || entry.genre,
            } : entry;
        });
    const scheduledOriginals = launchAbsoluteWeek === null
        ? []
        : platform.originalCommissions.flatMap((commission): OwnedStreamingSlateEntry[] => {
            if (!commission.canonicalProjectId || !commission.releasePlan) return [];
            const programWeek = Math.max(
                1,
                commission.releasePlan.premiereAtAbsoluteWeek - launchAbsoluteWeek + 1,
            );
            return [{
                id: createDeterministicId(
                    'streaming_slate_entry',
                    platform.simulationSeed,
                    commission.canonicalProjectId,
                    commission.releasePlan.premiereAtAbsoluteWeek,
                ),
                projectId: commission.canonicalProjectId,
                title: commission.title,
                source: 'ORIGINAL',
                projectType: commission.projectType,
                genre: commission.genre,
                launchWeek: programWeek,
                releasePattern: commission.projectType === 'MOVIE'
                    ? 'SINGLE_PREMIERE'
                    : commission.releasePlan.releasePattern,
                marketingPlan: commission.releasePlan.marketingPlan,
            }];
        });
    const laterLicensedEntries = launchAbsoluteWeek === null
        ? []
        : platform.catalogLicenses.flatMap((license): OwnedStreamingSlateEntry[] => {
            if (
                license.origin === 'STARTER'
                ||
                license.status !== 'ACTIVE'
                || license.startsAtAbsoluteWeek > absoluteWeek
                || getStreamingCatalogLicenseStatus(license, absoluteWeek) !== 'ACTIVE'
            ) return [];
            const projectType = license.projectType || 'MOVIE';
            return [{
                id: createDeterministicId(
                    'streaming_slate_entry',
                    platform.simulationSeed,
                    license.sourceProjectId,
                    license.startsAtAbsoluteWeek,
                ),
                projectId: license.sourceProjectId,
                title: license.titleAtSigning,
                source: 'LICENSED_WINDOW',
                projectType,
                genre: license.genre || 'Licensed',
                launchWeek: Math.max(1, license.startsAtAbsoluteWeek - launchAbsoluteWeek + 1),
                releasePattern: projectType === 'SERIES' ? 'FULL_SEASON' : 'SINGLE_PREMIERE',
                marketingPlan: 'LEAN',
            }];
        });
    return [...openingEntries, ...scheduledOriginals, ...laterLicensedEntries].filter((entry, index, all) => (
        all.findIndex(candidate => candidate.projectId === entry.projectId) === index
        && getStreamingContentAvailability(player, entry.projectId).available
    )).sort((left, right) => left.launchWeek - right.launchWeek);
};

export const getStreamingSlateCandidates = (player: Player): StreamingSlateCandidate[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const activeLicensedProjectIds = new Set(
        platform.catalogLicenses
            .filter(license => (
                license.status === 'ACTIVE'
                && license.startsAtAbsoluteWeek <= absoluteWeek
                && getStreamingCatalogLicenseStatus(license, absoluteWeek) === 'ACTIVE'
            ))
            .map(license => license.sourceProjectId),
    );
    const catalog = platform.catalogProjectIds.flatMap(projectId => {
        const title = resolveStreamingCatalogTitle(player, projectId);
        if (!title) return [];
        if (
            title.source === 'EXTERNAL_MARKET'
            && !activeLicensedProjectIds.has(projectId)
        ) return [];
        return [{
            projectId: title.id,
            title: title.title,
            source: title.source === 'OWNED_LIBRARY' ? 'OWNED_LIBRARY' as const : 'LICENSED_WINDOW' as const,
            projectType: title.projectType,
            genre: title.genre,
        }];
    });
    const originals = platform.originalCommissions.flatMap(commission => commission.canonicalProjectId ? [{
        projectId: commission.canonicalProjectId,
        title: commission.title,
        source: 'ORIGINAL' as const,
        projectType: commission.projectType,
        genre: commission.genre,
    }] : []);
    return [...originals, ...catalog].filter((candidate, index, all) => (
        all.findIndex(item => item.projectId === candidate.projectId) === index
    ));
};

const canonicalizeStreamingSlate = (
    player: Player,
    slate: OwnedStreamingLaunchSlate,
): { valid: boolean; slate: OwnedStreamingLaunchSlate } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const candidates = new Map(
        getStreamingSlateCandidates(player).map(candidate => [candidate.projectId, candidate]),
    );
    const seenProjectIds = new Set<string>();
    let valid = true;
    const entries = (Array.isArray(slate.entries) ? slate.entries : []).flatMap(entry => {
        const candidate = entry && candidates.get(String(entry.projectId || ''));
        if (
            !candidate
            || seenProjectIds.has(candidate.projectId)
            || entry.source !== candidate.source
        ) {
            valid = false;
            return [];
        }
        seenProjectIds.add(candidate.projectId);
        const releasePattern = candidate.projectType === 'MOVIE'
            ? 'SINGLE_PREMIERE' as const
            : ['FULL_SEASON', 'WEEKLY', 'SPLIT_VOLUME'].includes(entry.releasePattern)
                ? entry.releasePattern
                : 'WEEKLY';
        const marketingPlan = ['LEAN', 'STANDARD', 'EVENT'].includes(entry.marketingPlan)
            ? entry.marketingPlan
            : candidate.source === 'ORIGINAL'
                ? 'EVENT'
                : 'STANDARD';
        return [{
            id: createDeterministicId(
                'streaming_slate_entry',
                platform.simulationSeed,
                candidate.projectId,
            ),
            ...candidate,
            launchWeek: Math.max(1, Math.min(12, Math.round(Number(entry.launchWeek) || 1))),
            releasePattern,
            marketingPlan,
        } satisfies OwnedStreamingSlateEntry];
    });
    return {
        valid: valid && entries.length === (Array.isArray(slate.entries) ? slate.entries.length : 0),
        slate: {
            entries,
            programmedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
            revision: Math.max(1, Math.round(Number(slate.revision) || 1)),
        },
    };
};

export const createRecommendedStreamingSlate = (player: Player): OwnedStreamingLaunchSlate => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const candidates = getStreamingSlateCandidates(player).slice(0, 7);
    const originalIndex = candidates.findIndex(candidate => candidate.source === 'ORIGINAL');
    if (originalIndex > 0) candidates.unshift(...candidates.splice(originalIndex, 1));
    const entries = candidates.map((candidate, index): OwnedStreamingSlateEntry => {
        const launchWeek = index === 0 ? 1 : Math.min(12, 1 + index * 2);
        return {
            id: createDeterministicId('streaming_slate_entry', platform.simulationSeed, candidate.projectId),
            ...candidate,
            launchWeek,
            releasePattern: candidate.projectType === 'MOVIE'
                ? 'SINGLE_PREMIERE'
                : candidate.source === 'ORIGINAL'
                    ? 'WEEKLY'
                    : 'FULL_SEASON',
            marketingPlan: candidate.source === 'ORIGINAL' ? 'EVENT' : 'STANDARD',
        };
    });
    return {
        entries,
        programmedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        revision: (platform.launchSlate?.revision || 0) + 1,
    };
};

export const getStreamingSlateWarnings = (
    player: Player,
    slate: OwnedStreamingLaunchSlate,
): StreamingSlateWarning[] => {
    const warnings: StreamingSlateWarning[] = [];
    const entries = slate.entries;
    if (!entries.some(entry => entry.source === 'ORIGINAL')) warnings.push({
        id: 'missing-original',
        severity: 'BLOCKER',
        title: 'No Original in the launch window',
        detail: 'The first commissioned Original must have a canonical Greenlight project before the slate can lock.',
    });
    if (entries.length < 3) warnings.push({
        id: 'thin-slate',
        severity: 'BLOCKER',
        title: 'Opening slate is too thin',
        detail: 'Program at least three distinct titles across the twelve-week window.',
    });
    const genreCount = new Set(entries.map(entry => entry.genre)).size;
    if (genreCount < 3) warnings.push({
        id: 'genre-concentration',
        severity: 'WARNING',
        title: 'Narrow genre mix',
        detail: 'Fewer than three genres increases early churn risk after the headline premiere.',
    });
    if (!entries.some(entry => entry.projectType === 'SERIES')) warnings.push({
        id: 'no-series',
        severity: 'WARNING',
        title: 'No return-viewing engine',
        detail: 'A weekly or full-season series gives viewers a reason to build a platform habit.',
    });
    const weeks = [...new Set(entries.map(entry => entry.launchWeek))].sort((a, b) => a - b);
    const boundaries = [1, ...weeks, 12];
    if (boundaries.some((week, index) => index > 0 && week - boundaries[index - 1] > 4)) warnings.push({
        id: 'long-gap',
        severity: 'WARNING',
        title: 'Long premiere drought',
        detail: 'One part of the calendar goes more than four weeks without a fresh programming beat.',
    });
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const original = platform.originalCommissions.find(commission => entries.some(entry => entry.projectId === commission.canonicalProjectId));
    if (original && getStreamingOriginalLiveStatus(player, original) !== 'DELIVERED' && getStreamingOriginalLiveStatus(player, original) !== 'RELEASED') warnings.push({
        id: 'original-in-production',
        severity: 'NOTE',
        title: 'Original delivery is still moving',
        detail: 'The calendar can be programmed now, but Phase 8 launch readiness must verify final delivery.',
    });
    const originalEntry = entries.find(entry => entry.source === 'ORIGINAL');
    if (originalEntry && originalEntry.marketingPlan !== 'EVENT') warnings.push({
        id: 'quiet-original',
        severity: 'WARNING',
        title: 'Original lacks an event campaign',
        detail: 'The platform-defining title should receive announcement, teaser, trailer and premiere beats.',
    });
    return warnings;
};

export const saveStreamingSlateDraft = (player: Player, slate: OwnedStreamingLaunchSlate): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.milestoneKeys.includes('first-original-greenlit')) return player;
    const canonical = canonicalizeStreamingSlate(player, slate);
    if (!canonical.valid) return player;
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            launchSlateDraft: {
                ...canonical.slate,
                programmedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
            },
        }, player.id),
    };
};

export const programStreamingLaunchSlate = (
    player: Player,
    slate: OwnedStreamingLaunchSlate,
): { player: Player; changed: boolean; reason?: 'INVALID_STATE' | 'INVALID_CONTENT' | 'BLOCKERS' } => {
    const sourcePlatform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!sourcePlatform.milestoneKeys.includes('first-original-greenlit')) {
        return { player, changed: false, reason: 'INVALID_STATE' };
    }
    const canonical = canonicalizeStreamingSlate(player, slate);
    if (!canonical.valid) {
        return { player, changed: false, reason: 'INVALID_CONTENT' };
    }
    const saved = saveStreamingSlateDraft(player, canonical.slate);
    const platform = normalizeOwnedStreamingPlatformState(saved.ownedStreamingPlatform, saved.id);
    const draft = platform.launchSlateDraft;
    if (!draft || !platform.milestoneKeys.includes('first-original-greenlit')) {
        return { player: saved, changed: false, reason: 'INVALID_STATE' };
    }
    if (getStreamingSlateWarnings(saved, draft).some(warning => warning.severity === 'BLOCKER')) {
        return { player: saved, changed: false, reason: 'BLOCKERS' };
    }
    const absoluteWeek = getAbsoluteWeek(saved.age, saved.currentWeek);
    const revision = (platform.launchSlate?.revision || 0) + 1;
    const ledgerKey = `launch-slate:${revision}:${absoluteWeek}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, ledgerKey),
        idempotencyKey: ledgerKey,
        absoluteWeek,
        type: 'LAUNCH_SLATE_PROGRAMMED',
        summary: `Twelve-week launch slate programmed with ${draft.entries.length} titles.`,
        source: 'PLAYER_ACTION',
        metadata: {
            revision,
            titleCount: draft.entries.length,
            originalCount: draft.entries.filter(entry => entry.source === 'ORIGINAL').length,
        },
    };
    return {
        player: {
            ...saved,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                launchSlateDraft: null,
                launchSlate: { ...draft, revision, programmedAtAbsoluteWeek: absoluteWeek },
                milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'launch-slate-programmed'])),
                eventLedger: [...platform.eventLedger, ledger],
            }, saved.id),
        },
        changed: true,
    };
};
