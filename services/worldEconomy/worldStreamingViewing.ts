import type {
    OwnedStreamingSlateEntry,
    Player,
    WorldAudienceCohortState,
    WorldStreamingCustomerCohortState,
    WorldStreamingCustomerPlatformSummary,
    WorldStreamingViewingCountryState,
    WorldStreamingViewingCountryPlatformSummary,
    WorldStreamingViewingCountryTitleState,
    WorldStreamingViewingDiscoveryMix,
    WorldStreamingViewingAccessMix,
    WorldStreamingViewingGlobalSummary,
    WorldStreamingViewingPlatformSummary,
    WorldStreamingViewingRevenue,
    WorldStreamingViewingSnapshot,
    WorldStreamingViewingState,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { getStreamingContentAvailability } from '../streamingContentAvailability';
import { normalizeStreamingLanguageId, resolveStreamingGlobalLocalizationCapability } from '../streamingLocalizationCapabilities';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldPopulationState } from './worldPopulation';
import {
    getWorldStreamingPlayerCustomerOutcome,
    normalizeWorldStreamingCustomerState,
} from './worldStreamingCustomers';
import { getWorldStreamingOffers } from './worldStreamingOffers';

export const WORLD_STREAMING_VIEWING_SCHEMA_VERSION = 1 as const;
const MAX_SNAPSHOTS = 52;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round2 = (value: number): number => Math.round(value * 100) / 100;
const roundRate = (value: number): number => Math.round(clamp(value, 0, 1) * 10_000) / 10_000;

const hasOnlyFiniteNonNegativeNumbers = (value: unknown): boolean => {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
    if (Array.isArray(value)) return value.every(hasOnlyFiniteNonNegativeNumbers);
    if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).every(hasOnlyFiniteNonNegativeNumbers);
    }
    return true;
};

const isValidViewingState = (input: WorldStreamingViewingState | undefined, absoluteWeek: number): boolean => {
    if (!input
        || input.schemaVersion !== WORLD_STREAMING_VIEWING_SCHEMA_VERSION
        || input.lastProcessedAbsoluteWeek !== absoluteWeek
        || typeof input.sourceFingerprint !== 'string'
        || !input.global
        || !input.countries
        || !input.platforms
        || !Array.isArray(input.snapshots)
        || input.snapshots.length > MAX_SNAPSHOTS
        || !hasOnlyFiniteNonNegativeNumbers(input)) return false;
    return Object.values(input.platforms).every(platform => (
        Array.isArray(platform.titlePerformance)
        && platform.titlePerformance.every(title => {
            const discoveryTotal = Object.values(title.discoveryMix).reduce((sum, value) => sum + value, 0);
            return Math.round(discoveryTotal) === 100
                && title.completionRate >= 0 && title.completionRate <= 1
                && title.repeatViewingRate >= 0 && title.repeatViewingRate <= 1
                && title.abandonmentRate >= 0 && title.abandonmentRate <= 1;
        })
    ));
};

const distributeInteger = (total: number, weights: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length) return [];
    const safeWeights = weights.map(value => Math.max(0, Number(value) || 0));
    const weightTotal = safeWeights.reduce((sum, value) => sum + value, 0);
    if (!safeTotal || weightTotal <= 0) return weights.map(() => 0);
    const exact = safeWeights.map((weight, index) => ({ index, value: safeTotal * weight / weightTotal }));
    const result = exact.map(item => Math.floor(item.value));
    let remaining = safeTotal - result.reduce((sum, value) => sum + value, 0);
    exact.slice().sort((left, right) => (
        (right.value - Math.floor(right.value)) - (left.value - Math.floor(left.value)) || left.index - right.index
    )).forEach(item => {
        if (remaining <= 0) return;
        result[item.index] += 1;
        remaining -= 1;
    });
    return result;
};

const emptyAccessMix = (): WorldStreamingViewingAccessMix => ({
    paidViewingAccounts: 0,
    sharedViewingAccounts: 0,
    piracyViewingAccounts: 0,
});

const emptyRevenue = (): WorldStreamingViewingRevenue => ({
    attributedSubscriptionRevenue: 0,
    advertisingImpressions: 0,
    advertisingRevenue: 0,
    premiumTransactions: 0,
    premiumRevenue: 0,
    rentalTransactions: 0,
    rentalRevenue: 0,
    purchaseTransactions: 0,
    purchaseRevenue: 0,
    sponsorshipImpressions: 0,
    sponsorshipRevenue: 0,
    totalIncrementalRevenue: 0,
});

const sumRevenue = (rows: WorldStreamingViewingRevenue[]): WorldStreamingViewingRevenue => {
    const result = emptyRevenue();
    rows.forEach(row => {
        result.attributedSubscriptionRevenue += row.attributedSubscriptionRevenue;
        result.advertisingImpressions += row.advertisingImpressions;
        result.advertisingRevenue += row.advertisingRevenue;
        result.premiumTransactions += row.premiumTransactions;
        result.premiumRevenue += row.premiumRevenue;
        result.rentalTransactions += row.rentalTransactions;
        result.rentalRevenue += row.rentalRevenue;
        result.purchaseTransactions += row.purchaseTransactions;
        result.purchaseRevenue += row.purchaseRevenue;
        result.sponsorshipImpressions += row.sponsorshipImpressions;
        result.sponsorshipRevenue += row.sponsorshipRevenue;
        result.totalIncrementalRevenue += row.totalIncrementalRevenue;
    });
    return result;
};

const emptyGlobal = (): WorldStreamingViewingGlobalSummary => ({
    totalViewingAccounts: 0,
    estimatedViewers: 0,
    totalStarts: 0,
    totalHoursViewed: 0,
    unmetDemandAccounts: 0,
    accessMix: emptyAccessMix(),
    revenue: emptyRevenue(),
    platformCount: 0,
    countryCount: 0,
    titleCount: 0,
});

interface RivalViewingProjection {
    platforms: Record<string, WorldStreamingViewingPlatformSummary>;
    countries: Record<string, Record<string, WorldStreamingViewingCountryPlatformSummary>>;
}

const projectRivalViewing = (
    player: Player,
    absoluteWeek: number,
    customers: ReturnType<typeof normalizeWorldStreamingCustomerState>,
): RivalViewingProjection => {
    const offers = new Map(getWorldStreamingOffers(player, absoluteWeek).offers.map(offer => [offer.platformId, offer]));
    const countries: RivalViewingProjection['countries'] = {};
    const rowsByPlatform = new Map<string, WorldStreamingViewingCountryPlatformSummary[]>();

    Object.values(customers.countries).forEach(country => {
        const platformRows: Record<string, WorldStreamingViewingCountryPlatformSummary> = {};
        country.platformSummaries.forEach((customer: WorldStreamingCustomerPlatformSummary) => {
            if (customer.platformId === 'PLAYER') return;
            const offer = offers.get(customer.platformId);
            if (!offer) return;
            const valueStrength = offer.catalogueStrengthIndex * .34
                + offer.localizationStrengthIndex * .18
                + offer.reliabilityIndex * .18
                + offer.reputationIndex * .12
                + offer.marketingIndex * .1
                + offer.loyaltyIndex * .08;
            const engagementRate = clamp(.22 + valueStrength / 175, .24, .86);
            const paidViewingAccounts = Math.min(customer.endingPaidAccounts, Math.round(customer.endingPaidAccounts * engagementRate));
            const sharedViewingAccounts = Math.min(customer.sharedActiveViewers, Math.round(customer.sharedActiveViewers * clamp(engagementRate * 1.04, 0, .9)));
            const piracyViewingAccounts = Math.min(customer.piracyReach, Math.round(customer.piracyReach * clamp(.18 + offer.catalogueStrengthIndex / 250, .15, .58)));
            const totalViewingAccounts = paidViewingAccounts + sharedViewingAccounts;
            const totalStarts = Math.round(totalViewingAccounts * (1.08 + offer.catalogueStrengthIndex / 300));
            const totalHoursViewed = Math.round(totalStarts * (1.2 + offer.catalogueStrengthIndex / 125));
            const estimatedViewers = Math.max(totalViewingAccounts, Math.round(totalViewingAccounts * 1.42));
            const adSupportedAccounts = customer.planAllocations.reduce((sum, allocation) => (
                sum + (offer.plans.find(plan => plan.id === allocation.planId)?.ads ? allocation.paidAccounts : 0)
            ), 0);
            const adShare = customer.endingPaidAccounts > 0 ? clamp(adSupportedAccounts / customer.endingPaidAccounts, 0, 1) : 0;
            const advertisingImpressions = Math.round(totalHoursViewed * adShare * clamp(7 + offer.marketingIndex / 25, 7, 11));
            const advertisingRevenue = Math.round(advertisingImpressions / 1_000 * (7 + offer.reputationIndex * .05));
            const revenue: WorldStreamingViewingRevenue = {
                ...emptyRevenue(),
                attributedSubscriptionRevenue: Math.max(0, Math.round(customer.monthlySubscriptionRevenue / 4.33)),
                advertisingImpressions,
                advertisingRevenue,
                totalIncrementalRevenue: advertisingRevenue,
            };
            const row: WorldStreamingViewingCountryPlatformSummary = {
                platformId: customer.platformId,
                platformName: customer.platformName,
                totalViewingAccounts,
                estimatedViewers,
                totalStarts,
                totalHoursViewed,
                unmetDemandAccounts: Math.max(0, customer.accessLoadAccounts - totalViewingAccounts),
                accessMix: { paidViewingAccounts, sharedViewingAccounts, piracyViewingAccounts },
                revenue,
            };
            platformRows[customer.platformId] = row;
            rowsByPlatform.set(customer.platformId, [...(rowsByPlatform.get(customer.platformId) || []), row]);
        });
        countries[country.countryId] = platformRows;
    });

    const platforms = Object.fromEntries([...rowsByPlatform.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([platformId, rows]) => {
            const totalViewingAccounts = rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0);
            const accessMix = rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
                paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
                sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
                piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
            }), emptyAccessMix());
            const summary: WorldStreamingViewingPlatformSummary = {
                platformId,
                platformName: rows[0]?.platformName || platformId,
                totalViewingAccounts,
                estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
                totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
                totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
                averageCompletionRate: roundRate(.48 + (offers.get(platformId)?.catalogueStrengthIndex || 50) / 250),
                averageRepeatViewingRate: roundRate(.05 + (offers.get(platformId)?.loyaltyIndex || 50) / 700),
                unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
                accessMix,
                revenue: sumRevenue(rows.map(row => row.revenue)),
                streamLoadAccounts: totalViewingAccounts,
                titlePerformance: [],
            };
            return [platformId, summary];
        }));
    return { platforms, countries };
};

const summarizeAllPlatforms = (
    platforms: Record<string, WorldStreamingViewingPlatformSummary>,
    countryCount: number,
): WorldStreamingViewingGlobalSummary => {
    const rows = Object.values(platforms);
    return {
        totalViewingAccounts: rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0),
        estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
        totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
        totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
        unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
        accessMix: rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
            paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
            sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
            piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
        }), emptyAccessMix()),
        revenue: sumRevenue(rows.map(row => row.revenue)),
        platformCount: rows.length,
        countryCount,
        titleCount: rows.reduce((sum, row) => sum + row.titlePerformance.length, 0),
    };
};

const PERSONA_GENRE_AFFINITY: Record<string, string[]> = {
    FAMILY_HOUSEHOLDS: ['ANIMATION', 'ADVENTURE', 'COMEDY', 'FANTASY'],
    VALUE_SEEKERS: ['ACTION', 'COMEDY', 'CRIME', 'THRILLER'],
    FANDOM_LOYALISTS: ['SUPERHERO', 'SCI_FI', 'FANTASY', 'ACTION'],
    PRESTIGE_EXPLORERS: ['DRAMA', 'BIOPIC', 'DOCUMENTARY', 'MYSTERY'],
    LOCAL_FIRST: ['DRAMA', 'ROMANCE', 'COMEDY', 'CRIME'],
    HABIT_STREAMERS: ['MYSTERY', 'CRIME', 'COMEDY', 'DRAMA'],
};

interface ViewingCandidate {
    entry: OwnedStreamingSlateEntry;
    quality: number;
    rating: number;
    originalLanguageId: string;
    isFamous: boolean;
    hasUniverse: boolean;
    runtimeHours: number;
    weeksAvailable: number;
}

const resolveProjectFacts = (player: Player, entry: OwnedStreamingSlateEntry, programWeek: number): ViewingCandidate => {
    const raw = (player.world.projects || []).find(project => String(project.id) === entry.projectId) as any
        || (player.pastProjects || []).find(project => String(project.id) === entry.projectId) as any
        || {};
    const availability = getStreamingContentAvailability(player, entry.projectId);
    const rawQuality = Number(raw.quality ?? raw.finalQuality);
    const rawRating = Number(raw.rating ?? raw.imdbRating);
    const quality = clamp(
        Number.isFinite(rawQuality) ? rawQuality : Number.isFinite(rawRating) ? rawRating * 10 : 60,
        0,
        100,
    );
    const rating = clamp(Number.isFinite(rawRating) ? rawRating : quality / 10, 0, 10);
    return {
        entry,
        quality,
        rating,
        originalLanguageId: normalizeStreamingLanguageId(raw.originalLanguageId || raw.language || 'english'),
        isFamous: Boolean(raw.isFamous || Number(raw.boxOffice || raw.gross || 0) >= 150_000_000),
        hasUniverse: Boolean(raw.universeId || raw.franchiseId),
        runtimeHours: Math.max(.25, availability.hours),
        weeksAvailable: Math.max(1, programWeek - entry.launchWeek + 1),
    };
};

const getProgramWeek = (player: Player, absoluteWeek: number): number => {
    const launchWeek = player.ownedStreamingPlatform.launchCommit?.committedAtAbsoluteWeek;
    if (Number.isFinite(launchWeek)) return Math.max(1, absoluteWeek - Number(launchWeek) + 1);
    return Math.max(1, Number(player.ownedStreamingPlatform.weeklyHistory.at(-1)?.operations?.programWeek || 0) + 1);
};

const resolveLanguageFit = (
    candidate: ViewingCandidate,
    countryLanguages: string[],
    cohort: WorldAudienceCohortState,
    localization: ReturnType<typeof resolveStreamingGlobalLocalizationCapability>,
): number => {
    const normalizedCountryLanguages = countryLanguages.map(normalizeStreamingLanguageId);
    if (normalizedCountryLanguages.includes(candidate.originalLanguageId)) {
        return 1.05 + cohort.localLanguageAffinityIndex / 260;
    }
    const coveredLanguage = normalizedCountryLanguages.some(language => localization.activeLanguageIds.includes(language));
    if (!coveredLanguage) return .42 - cohort.localLanguageAffinityIndex / 500;
    return clamp(.58 + localization.subtitleLevel * .08 + localization.dubbingLevel * .115, .55, 1.02);
};

const scoreCandidate = (
    player: Player,
    candidate: ViewingCandidate,
    countryId: string,
    cohort: WorldAudienceCohortState,
    absoluteWeek: number,
): { score: number; languageFit: number } => {
    const platform = player.ownedStreamingPlatform;
    const population = player.world.worldPopulation!.countries[countryId];
    const localization = resolveStreamingGlobalLocalizationCapability(platform);
    const languageFit = resolveLanguageFit(candidate, population.languages, cohort, localization);
    const affinityGenres = PERSONA_GENRE_AFFINITY[cohort.primaryPersonaId] || [];
    const genreFit = affinityGenres.includes(candidate.entry.genre) ? 1.22 : .88;
    const qualityFit = .45 + candidate.quality / 100;
    const prestigeFit = candidate.rating >= 7.5 && cohort.primaryPersonaId === 'PRESTIGE_EXPLORERS' ? 1.22 : 1;
    const fandomFit = candidate.hasUniverse && cohort.primaryPersonaId === 'FANDOM_LOYALISTS' ? 1.32 : candidate.isFamous ? 1.08 : 1;
    const marketingFit = candidate.entry.marketingPlan === 'EVENT' ? 1.22 : candidate.entry.marketingPlan === 'STANDARD' ? 1.1 : 1;
    const freshness = clamp(1.28 - Math.max(0, candidate.weeksAvailable - 1) * .055, .58, 1.28);
    const weeklyLift = candidate.entry.releasePattern === 'WEEKLY' && candidate.weeksAvailable <= 8 ? 1.14 : 1;
    const recommendationLevel = clamp(platform.technologyLevels.DATA_RECOMMENDATIONS || 0, 0, 10);
    const recommendationFit = 1 + recommendationLevel * .018;
    const growthAction = platform.growthActions.find(action => action.status === 'LOCKED'
        && action.targetAbsoluteWeek === absoluteWeek && action.projectId === candidate.entry.projectId);
    const growthFit = growthAction ? 1.28 : 1;
    const reliability = clamp((platform.infrastructureSetup?.reliabilityTarget || platform.metrics.technologyHealth || 75) / 100, .65, 1);
    const rng = createDeterministicRng(`${platform.simulationSeed}:we6-score:${absoluteWeek}:${countryId}:${cohort.id}:${candidate.entry.projectId}`);
    const variance = .94 + rng() * .12;
    return {
        score: Math.max(.01, qualityFit * genreFit * languageFit * prestigeFit * fandomFit * marketingFit
            * freshness * weeklyLift * recommendationFit * growthFit * reliability * variance),
        languageFit,
    };
};

const titleDiscoveryMix = (
    candidate: ViewingCandidate,
    recommendationLevel: number,
    hasGrowthAction: boolean,
): WorldStreamingViewingDiscoveryMix => {
    const allocation = distributeInteger(100, [
        24 + (candidate.weeksAvailable === 1 ? 16 : 0) + (candidate.entry.marketingPlan === 'EVENT' ? 8 : 0),
        27 + recommendationLevel * 2 + candidate.weeksAvailable,
        12 + candidate.rating,
        12 + (candidate.hasUniverse || candidate.isFamous ? 9 : 0),
        8 + (candidate.entry.marketingPlan === 'EVENT' ? 14 : candidate.entry.marketingPlan === 'STANDARD' ? 7 : 2) + (hasGrowthAction ? 10 : 0),
        7 + (candidate.isFamous ? 5 : 0),
    ]);
    return {
        homepagePercent: allocation[0],
        recommendationsPercent: allocation[1],
        searchPercent: allocation[2],
        directPercent: allocation[3],
        marketingPercent: allocation[4],
        externalBuzzPercent: allocation[5],
    };
};

const buildViewingState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingViewingSnapshot[],
): WorldStreamingViewingState => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const preparedPlayer: Player = {
        ...player,
        world: { ...player.world, worldPopulation: population, worldAudienceEconomy: audience },
    };
    const customers = normalizeWorldStreamingCustomerState(preparedPlayer.world.worldStreamingCustomers, preparedPlayer, absoluteWeek);
    const rivalViewing = projectRivalViewing(preparedPlayer, absoluteWeek, customers);
    const playerCustomers = getWorldStreamingPlayerCustomerOutcome(customers);
    const platform = normalizeOwnedStreamingPlatformState(preparedPlayer.ownedStreamingPlatform, preparedPlayer.id);
    const playerActive = platform.lifecycle === 'ACTIVE' && Boolean(platform.identity) && Boolean(playerCustomers);
    if (!playerActive || !playerCustomers) {
        const platforms = rivalViewing.platforms;
        const global = summarizeAllPlatforms(platforms, Object.keys(customers.countries).length);
        const countries: Record<string, WorldStreamingViewingCountryState> = Object.fromEntries(
            Object.entries(rivalViewing.countries).map(([countryId, platformPerformance]) => {
                const rows = Object.values(platformPerformance);
                return [countryId, {
                    countryId,
                    accessibleAccounts: customers.countries[countryId]?.platformSummaries.reduce((sum, row) => sum + row.accessLoadAccounts, 0) || 0,
                    totalViewingAccounts: rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0),
                    estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
                    totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
                    totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
                    unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
                    accessMix: rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
                        paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
                        sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
                        piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
                    }), emptyAccessMix()),
                    revenue: sumRevenue(rows.map(row => row.revenue)),
                    titlePerformance: [],
                    platformPerformance,
                }];
            }),
        );
        return {
            schemaVersion: WORLD_STREAMING_VIEWING_SCHEMA_VERSION,
            initializedAtAbsoluteWeek,
            lastProcessedAbsoluteWeek: absoluteWeek,
            sourceFingerprint: createDeterministicId('world-streaming-viewing', absoluteWeek, customers.sourceFingerprint, 'AI_PLATFORM_FIELD'),
            countries, platforms, global,
            snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), {
                absoluteWeek,
                totalViewingAccounts: global.totalViewingAccounts,
                totalHoursViewed: global.totalHoursViewed,
                unmetDemandAccounts: global.unmetDemandAccounts,
                incrementalRevenue: global.revenue.totalIncrementalRevenue,
            }].slice(-MAX_SNAPSHOTS),
        };
    }

    const programWeek = getProgramWeek({ ...preparedPlayer, ownedStreamingPlatform: platform }, absoluteWeek);
    const entries = getOwnedStreamingProgramEntries({ ...preparedPlayer, ownedStreamingPlatform: platform })
        .filter(entry => entry.launchWeek <= programWeek);
    const candidates = entries.map(entry => resolveProjectFacts(preparedPlayer, entry, programWeek));
    const countryStates: Record<string, WorldStreamingViewingCountryState> = {};
    const titleCountryRows = new Map<string, WorldStreamingViewingCountryTitleState[]>();

    Object.keys(customers.countries).sort().forEach(countryId => {
        const customerCountry = customers.countries[countryId];
        const audienceCountry = preparedPlayer.world.worldAudienceEconomy?.countries[countryId];
        const populationCountry = preparedPlayer.world.worldPopulation?.countries[countryId];
        if (!audienceCountry || !populationCountry) return;
        const playerCohorts = customerCountry.cohorts.flatMap(customerCohort => {
            const planCells = customerCohort.planCells.filter(cell => cell.platformId === 'PLAYER');
            if (!planCells.length) return [];
            const audienceCohort = audienceCountry.cohorts.find(item => item.id === customerCohort.cohortId);
            return audienceCohort ? [{ customerCohort, audienceCohort, planCells }] : [];
        });
        if (!playerCohorts.length) return;
        const eligible = candidates.filter(candidate => {
            const availability = getStreamingContentAvailability(preparedPlayer, candidate.entry.projectId, [countryId]);
            return availability.available && availability.status === 'LIVE' && availability.coveredCountryIds.includes(countryId);
        });
        const countryTitle = new Map<string, WorldStreamingViewingCountryTitleState>();
        let accessibleAccounts = 0;
        let unmetDemandAccounts = 0;

        playerCohorts.forEach(({ customerCohort, audienceCohort, planCells }) => {
            const paidAccounts = planCells.reduce((sum, cell) => sum + cell.paidAccounts, 0);
            const sharedAccounts = Math.max(0, Math.round(planCells.reduce((sum, cell) => sum + cell.externalSharedHouseholds, 0) * .72));
            const piracyAudience = planCells.reduce((sum, cell) => sum + cell.piracyReach, 0);
            const cohortAccessible = paidAccounts + sharedAccounts;
            accessibleAccounts += cohortAccessible;
            if (!eligible.length || cohortAccessible <= 0) {
                unmetDemandAccounts += cohortAccessible;
                return;
            }
            const scored = eligible.map(candidate => scoreCandidate(preparedPlayer, candidate, countryId, audienceCohort, absoluteWeek));
            const meanScore = scored.reduce((sum, row) => sum + row.score, 0) / Math.max(1, scored.length);
            const engagementRate = clamp(.24 + audienceCohort.entertainmentAppetiteIndex * .0042
                + Math.min(.16, eligible.length * .018) + Math.min(.1, meanScore * .055), .22, .88);
            const paidViewingTotal = Math.min(paidAccounts, Math.round(paidAccounts * engagementRate));
            const sharedViewingTotal = Math.min(sharedAccounts, Math.round(sharedAccounts * clamp(engagementRate * 1.06, 0, .92)));
            const piracyViewingTotal = Math.min(piracyAudience, Math.round(piracyAudience * clamp(.22 + meanScore * .09, .12, .72)));
            unmetDemandAccounts += cohortAccessible - paidViewingTotal - sharedViewingTotal;
            const weights = scored.map(row => row.score);
            const paidByTitle = distributeInteger(paidViewingTotal, weights);
            const sharedByTitle = distributeInteger(sharedViewingTotal, weights);
            const piracyByTitle = distributeInteger(piracyViewingTotal, weights);
            eligible.forEach((candidate, index) => {
                const paidViewingAccounts = paidByTitle[index] || 0;
                const sharedViewingAccounts = sharedByTitle[index] || 0;
                const piracyViewingAccounts = piracyByTitle[index] || 0;
                const viewingAccounts = paidViewingAccounts + sharedViewingAccounts;
                if (viewingAccounts <= 0 && piracyViewingAccounts <= 0) return;
                const score = scored[index];
                const rng = createDeterministicRng(`${platform.simulationSeed}:we6-engagement:${absoluteWeek}:${countryId}:${audienceCohort.id}:${candidate.entry.projectId}`);
                const completionRate = roundRate(clamp(
                    .3 + candidate.quality * .005 + score.languageFit * .13
                    + (candidate.entry.projectType === 'MOVIE' ? .04 : 0)
                    - Math.max(0, candidate.runtimeHours - 3) * .02 + (rng() - .5) * .06,
                    .2,
                    .96,
                ));
                const repeatViewingRate = roundRate(clamp(
                    .025 + (candidate.entry.releasePattern === 'WEEKLY' ? .075 : .025)
                    + (candidate.hasUniverse ? .055 : 0) + candidate.quality * .00065 + (rng() - .5) * .025,
                    .01,
                    .32,
                ));
                const repeatStarts = Math.round(viewingAccounts * repeatViewingRate);
                const starts = viewingAccounts + repeatStarts;
                const averageHours = candidate.runtimeHours * (.22 + completionRate * .78);
                const hoursViewed = Math.max(0, Math.round((viewingAccounts + repeatStarts * .7) * averageHours));
                const estimatedViewers = Math.max(viewingAccounts, Math.round(viewingAccounts * clamp(populationCountry.averageHouseholdSize * .7, 1, 2.8)));
                const current = countryTitle.get(candidate.entry.projectId);
                const next: WorldStreamingViewingCountryTitleState = {
                    projectId: candidate.entry.projectId,
                    title: candidate.entry.title,
                    countryId,
                    viewingAccounts: (current?.viewingAccounts || 0) + viewingAccounts,
                    estimatedViewers: (current?.estimatedViewers || 0) + estimatedViewers,
                    starts: (current?.starts || 0) + starts,
                    hoursViewed: (current?.hoursViewed || 0) + hoursViewed,
                    completionRate,
                    repeatViewingRate,
                    abandonmentRate: roundRate(1 - completionRate),
                    accessMix: {
                        paidViewingAccounts: (current?.accessMix.paidViewingAccounts || 0) + paidViewingAccounts,
                        sharedViewingAccounts: (current?.accessMix.sharedViewingAccounts || 0) + sharedViewingAccounts,
                        piracyViewingAccounts: (current?.accessMix.piracyViewingAccounts || 0) + piracyViewingAccounts,
                    },
                    revenue: emptyRevenue(),
                };
                countryTitle.set(candidate.entry.projectId, next);
            });
        });

        const titlePerformance = [...countryTitle.values()].sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.projectId.localeCompare(right.projectId));
        titlePerformance.forEach(row => titleCountryRows.set(row.projectId, [...(titleCountryRows.get(row.projectId) || []), row]));
        const totalViewingAccounts = titlePerformance.reduce((sum, row) => sum + row.viewingAccounts, 0);
        const accessMix = titlePerformance.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
            paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
            sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
            piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
        }), emptyAccessMix());
        countryStates[countryId] = {
            countryId,
            accessibleAccounts,
            totalViewingAccounts,
            estimatedViewers: titlePerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
            totalStarts: titlePerformance.reduce((sum, row) => sum + row.starts, 0),
            totalHoursViewed: titlePerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
            unmetDemandAccounts,
            accessMix,
            revenue: emptyRevenue(),
            titlePerformance,
        };
    });

    const baseTitlePerformance = candidates.flatMap(candidate => {
        const countryPerformance = titleCountryRows.get(candidate.entry.projectId) || [];
        if (!countryPerformance.length) return [];
        const viewingAccounts = countryPerformance.reduce((sum, row) => sum + row.viewingAccounts, 0);
        const weight = Math.max(1, viewingAccounts);
        const weighted = (getValue: (row: WorldStreamingViewingCountryTitleState) => number) => (
            countryPerformance.reduce((sum, row) => sum + getValue(row) * Math.max(1, row.viewingAccounts), 0) / weight
        );
        const completionRate = roundRate(weighted(row => row.completionRate));
        const repeatViewingRate = roundRate(weighted(row => row.repeatViewingRate));
        const accessMix = countryPerformance.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
            paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
            sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
            piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
        }), emptyAccessMix());
        const topCountry = countryPerformance.slice().sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.countryId.localeCompare(right.countryId))[0];
        const growthAction = platform.growthActions.find(action => action.status === 'LOCKED'
            && action.targetAbsoluteWeek === absoluteWeek && action.projectId === candidate.entry.projectId);
        return [{
            projectId: candidate.entry.projectId,
            title: candidate.entry.title,
            source: candidate.entry.source,
            projectType: candidate.entry.projectType,
            genre: candidate.entry.genre,
            weeksAvailable: candidate.weeksAvailable,
            viewingAccounts,
            estimatedViewers: countryPerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
            starts: countryPerformance.reduce((sum, row) => sum + row.starts, 0),
            hoursViewed: countryPerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
            completionRate,
            repeatViewingRate,
            abandonmentRate: roundRate(1 - completionRate),
            satisfactionScore: round2(clamp(38 + completionRate * 52 + repeatViewingRate * 24 + candidate.rating * 1.2, 30, 98)),
            acquisitionAttributedAccounts: 0,
            retentionAttributedAccounts: Math.round(viewingAccounts * completionRate * .08),
            accessMix,
            discoveryMix: titleDiscoveryMix(candidate, platform.technologyLevels.DATA_RECOMMENDATIONS || 0, Boolean(growthAction)),
            revenue: emptyRevenue(),
            topCountryId: topCountry?.countryId || null,
            countryPerformance,
        }];
    }).sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.projectId.localeCompare(right.projectId));
    const pricing = platform.serviceConfiguration.pricing;
    const streams = new Set(pricing.streams);
    const canonicalWeeklySubscriptionRevenue = streams.has('subs')
        ? Math.max(0, Math.round(playerCustomers.monthlySubscriptionRevenue / 4.33))
        : 0;
    const subscriptionAllocation = distributeInteger(canonicalWeeklySubscriptionRevenue, baseTitlePerformance.map(title => (
        Math.max(1, title.accessMix.paidViewingAccounts) * (.45 + title.completionRate * .42 + title.repeatViewingRate * .55)
    )));
    const acquisitionPool = Math.max(0, playerCustomers.joins + playerCustomers.reactivations);
    const acquisitionAllocation = distributeInteger(acquisitionPool, baseTitlePerformance.map(title => {
        const candidate = candidates.find(item => item.entry.projectId === title.projectId)!;
        return Math.max(1, title.viewingAccounts) * (candidate.weeksAvailable <= 2 ? 1.4 : 1)
            * (candidate.entry.marketingPlan === 'EVENT' ? 1.25 : 1);
    }));
    const configuredAdAccounts = playerCustomers.planAllocations.reduce((sum, allocation) => {
        const plan = pricing.plans.find(item => item.id === allocation.planId);
        return sum + (plan?.ads ? allocation.paidAccounts : 0);
    }, 0);
    const adEligibleShare = playerCustomers.endingPaidAccounts > 0
        ? clamp(configuredAdAccounts / playerCustomers.endingPaidAccounts, 0, 1) : 0;
    const advertisingLevel = clamp(platform.technologyLevels.ADVERTISING_COMMERCE || 0, 0, 10);
    const adFillRate = clamp(.52 + advertisingLevel * .035 + platform.competitiveWorld.globalPrestige / 500, .45, .94);
    const sponsoredTitleIds = new Set(baseTitlePerformance.slice(0, Math.max(0, Math.round(pricing.sponsor.titles))).map(title => title.projectId));
    const titlePerformance = baseTitlePerformance.map((title, index) => {
        const candidate = candidates.find(item => item.entry.projectId === title.projectId)!;
        const legitimateAccessTotal = Math.max(1, title.accessMix.paidViewingAccounts + title.accessMix.sharedViewingAccounts);
        const eligibleAdHours = streams.has('ads')
            ? title.hoursViewed * adEligibleShare * (title.accessMix.paidViewingAccounts / legitimateAccessTotal) : 0;
        const advertisingImpressions = Math.max(0, Math.round(
            eligibleAdHours * clamp(pricing.ads.minutesPerHour, 0, 30) * 2 * adFillRate,
        ));
        const advertisingRevenue = Math.max(0, Math.round(advertisingImpressions / 1_000 * Math.max(0, pricing.ads.cpm)));
        const freshMovie = title.projectType === 'MOVIE' && candidate.weeksAvailable <= 2;
        const rentalEligible = title.projectType === 'MOVIE' && candidate.weeksAvailable <= Math.max(1, pricing.rentals.windowWeeks);
        const affordability = clamp(1.08 - Math.max(0, pricing.premium.price - 20) / 80, .35, 1.08);
        const premiumTransactions = streams.has('premium') && freshMovie
            ? Math.max(0, Math.round(title.accessMix.paidViewingAccounts * (.012 + title.completionRate * .012) * affordability)) : 0;
        const rentalTransactions = streams.has('rentals') && rentalEligible
            ? Math.max(0, Math.round(title.accessMix.paidViewingAccounts * (.018 + title.completionRate * .012))) : 0;
        const purchaseTransactions = streams.has('rentals') && rentalEligible
            ? Math.max(0, Math.round(title.accessMix.paidViewingAccounts * (.003 + title.repeatViewingRate * .015))) : 0;
        const sponsorshipImpressions = streams.has('sponsor') && sponsoredTitleIds.has(title.projectId)
            ? Math.max(0, title.estimatedViewers) : 0;
        const sponsorshipCap = Math.max(0, pricing.sponsor.perTitle) / 52;
        const sponsorshipDelivery = clamp(sponsorshipImpressions / Math.max(50_000, title.estimatedViewers * 1.15), 0, 1);
        const sponsorshipRevenue = Math.max(0, Math.round(sponsorshipCap * sponsorshipDelivery));
        const premiumRevenue = Math.max(0, Math.round(premiumTransactions * Math.max(0, pricing.premium.price)));
        const rentalRevenue = Math.max(0, Math.round(rentalTransactions * Math.max(0, pricing.rentals.rent)));
        const purchaseRevenue = Math.max(0, Math.round(purchaseTransactions * Math.max(0, pricing.rentals.buy)));
        const revenue: WorldStreamingViewingRevenue = {
            attributedSubscriptionRevenue: subscriptionAllocation[index] || 0,
            advertisingImpressions,
            advertisingRevenue,
            premiumTransactions,
            premiumRevenue,
            rentalTransactions,
            rentalRevenue,
            purchaseTransactions,
            purchaseRevenue,
            sponsorshipImpressions,
            sponsorshipRevenue,
            totalIncrementalRevenue: advertisingRevenue + premiumRevenue + rentalRevenue + purchaseRevenue + sponsorshipRevenue,
        };
        const countryWeights = title.countryPerformance.map(country => Math.max(0, country.accessMix.paidViewingAccounts));
        const allocations = {
            attributedSubscriptionRevenue: distributeInteger(revenue.attributedSubscriptionRevenue, countryWeights),
            advertisingImpressions: distributeInteger(revenue.advertisingImpressions, countryWeights),
            advertisingRevenue: distributeInteger(revenue.advertisingRevenue, countryWeights),
            premiumTransactions: distributeInteger(revenue.premiumTransactions, countryWeights),
            premiumRevenue: distributeInteger(revenue.premiumRevenue, countryWeights),
            rentalTransactions: distributeInteger(revenue.rentalTransactions, countryWeights),
            rentalRevenue: distributeInteger(revenue.rentalRevenue, countryWeights),
            purchaseTransactions: distributeInteger(revenue.purchaseTransactions, countryWeights),
            purchaseRevenue: distributeInteger(revenue.purchaseRevenue, countryWeights),
            sponsorshipImpressions: distributeInteger(revenue.sponsorshipImpressions, countryWeights),
            sponsorshipRevenue: distributeInteger(revenue.sponsorshipRevenue, countryWeights),
            totalIncrementalRevenue: distributeInteger(revenue.totalIncrementalRevenue, countryWeights),
        };
        title.countryPerformance.forEach((country, countryIndex) => {
            country.revenue = {
                attributedSubscriptionRevenue: allocations.attributedSubscriptionRevenue[countryIndex] || 0,
                advertisingImpressions: allocations.advertisingImpressions[countryIndex] || 0,
                advertisingRevenue: allocations.advertisingRevenue[countryIndex] || 0,
                premiumTransactions: allocations.premiumTransactions[countryIndex] || 0,
                premiumRevenue: allocations.premiumRevenue[countryIndex] || 0,
                rentalTransactions: allocations.rentalTransactions[countryIndex] || 0,
                rentalRevenue: allocations.rentalRevenue[countryIndex] || 0,
                purchaseTransactions: allocations.purchaseTransactions[countryIndex] || 0,
                purchaseRevenue: allocations.purchaseRevenue[countryIndex] || 0,
                sponsorshipImpressions: allocations.sponsorshipImpressions[countryIndex] || 0,
                sponsorshipRevenue: allocations.sponsorshipRevenue[countryIndex] || 0,
                totalIncrementalRevenue: allocations.totalIncrementalRevenue[countryIndex] || 0,
            };
        });
        return {
            ...title,
            acquisitionAttributedAccounts: acquisitionAllocation[index] || 0,
            revenue,
        };
    });
    Object.values(countryStates).forEach(country => {
        country.revenue = sumRevenue(country.titlePerformance.map(title => title.revenue));
    });
    const totalViewingAccounts = titlePerformance.reduce((sum, row) => sum + row.viewingAccounts, 0);
    const accessMix = titlePerformance.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
        paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
        sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
        piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
    }), emptyAccessMix());
    const platformSummary: WorldStreamingViewingPlatformSummary = {
        platformId: 'PLAYER',
        platformName: platform.identity!.name,
        totalViewingAccounts,
        estimatedViewers: titlePerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
        totalStarts: titlePerformance.reduce((sum, row) => sum + row.starts, 0),
        totalHoursViewed: titlePerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
        averageCompletionRate: totalViewingAccounts > 0
            ? roundRate(titlePerformance.reduce((sum, row) => sum + row.completionRate * row.viewingAccounts, 0) / totalViewingAccounts) : 0,
        averageRepeatViewingRate: totalViewingAccounts > 0
            ? roundRate(titlePerformance.reduce((sum, row) => sum + row.repeatViewingRate * row.viewingAccounts, 0) / totalViewingAccounts) : 0,
        unmetDemandAccounts: Object.values(countryStates).reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
        accessMix,
        revenue: sumRevenue(titlePerformance.map(row => row.revenue)),
        streamLoadAccounts: totalViewingAccounts,
        titlePerformance,
    };
    const platforms = { ...rivalViewing.platforms, PLAYER: platformSummary };
    const allCountryIds = new Set([...Object.keys(rivalViewing.countries), ...Object.keys(countryStates)]);
    allCountryIds.forEach(countryId => {
        const playerCountry = countryStates[countryId];
        const platformPerformance: Record<string, WorldStreamingViewingCountryPlatformSummary> = {
            ...(rivalViewing.countries[countryId] || {}),
        };
        if (playerCountry) {
            platformPerformance.PLAYER = {
                platformId: 'PLAYER',
                platformName: platform.identity!.name,
                totalViewingAccounts: playerCountry.titlePerformance.reduce((sum, row) => sum + row.viewingAccounts, 0),
                estimatedViewers: playerCountry.titlePerformance.reduce((sum, row) => sum + row.estimatedViewers, 0),
                totalStarts: playerCountry.titlePerformance.reduce((sum, row) => sum + row.starts, 0),
                totalHoursViewed: playerCountry.titlePerformance.reduce((sum, row) => sum + row.hoursViewed, 0),
                unmetDemandAccounts: playerCountry.unmetDemandAccounts,
                accessMix: { ...playerCountry.accessMix },
                revenue: { ...playerCountry.revenue },
            };
        }
        const rows = Object.values(platformPerformance);
        countryStates[countryId] = {
            countryId,
            accessibleAccounts: customers.countries[countryId]?.platformSummaries.reduce((sum, row) => sum + row.accessLoadAccounts, 0) || 0,
            totalViewingAccounts: rows.reduce((sum, row) => sum + row.totalViewingAccounts, 0),
            estimatedViewers: rows.reduce((sum, row) => sum + row.estimatedViewers, 0),
            totalStarts: rows.reduce((sum, row) => sum + row.totalStarts, 0),
            totalHoursViewed: rows.reduce((sum, row) => sum + row.totalHoursViewed, 0),
            unmetDemandAccounts: rows.reduce((sum, row) => sum + row.unmetDemandAccounts, 0),
            accessMix: rows.reduce<WorldStreamingViewingAccessMix>((sum, row) => ({
                paidViewingAccounts: sum.paidViewingAccounts + row.accessMix.paidViewingAccounts,
                sharedViewingAccounts: sum.sharedViewingAccounts + row.accessMix.sharedViewingAccounts,
                piracyViewingAccounts: sum.piracyViewingAccounts + row.accessMix.piracyViewingAccounts,
            }), emptyAccessMix()),
            revenue: sumRevenue(rows.map(row => row.revenue)),
            titlePerformance: playerCountry?.titlePerformance || [],
            platformPerformance,
        };
    });
    const global = summarizeAllPlatforms(platforms, Object.keys(countryStates).length);
    const nextSnapshot: WorldStreamingViewingSnapshot = {
        absoluteWeek,
        totalViewingAccounts: global.totalViewingAccounts,
        totalHoursViewed: global.totalHoursViewed,
        unmetDemandAccounts: global.unmetDemandAccounts,
        incrementalRevenue: global.revenue.totalIncrementalRevenue,
    };
    return {
        schemaVersion: WORLD_STREAMING_VIEWING_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('world-streaming-viewing', absoluteWeek, customers.sourceFingerprint,
            platform.serviceConfiguration.revision, entries.map(entry => `${entry.projectId}:${entry.launchWeek}`).join('|')),
        countries: countryStates,
        platforms,
        global,
        snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), nextSnapshot].slice(-MAX_SNAPSHOTS),
    };
};

const buildState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingViewingSnapshot[],
): WorldStreamingViewingState => {
    return buildViewingState(player, absoluteWeek, initializedAtAbsoluteWeek, snapshots);
};

export const createWorldStreamingViewingState = (
    player: Player,
    absoluteWeek: number,
): WorldStreamingViewingState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    return buildState(player, week, week, []);
};

export const normalizeWorldStreamingViewingState = (
    input: WorldStreamingViewingState | undefined,
    player: Player,
    absoluteWeek: number,
): WorldStreamingViewingState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    if (isValidViewingState(input, week)) return input;
    return buildState(
        player,
        week,
        Math.max(0, Math.round(Number(input?.initializedAtAbsoluteWeek) || week)),
        Array.isArray(input?.snapshots) ? input.snapshots : [],
    );
};

export const advanceWorldStreamingViewingToWeek = (
    input: WorldStreamingViewingState | undefined,
    player: Player,
    absoluteWeek: number,
): WorldStreamingViewingState => normalizeWorldStreamingViewingState(input, player, absoluteWeek);

export const getWorldStreamingPlayerViewingOutcome = (
    state: WorldStreamingViewingState | undefined,
): WorldStreamingViewingPlatformSummary | null => state?.platforms?.PLAYER || null;
