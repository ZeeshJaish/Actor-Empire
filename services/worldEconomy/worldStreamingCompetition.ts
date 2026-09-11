import type {
    Player,
    WorldAudienceCohortState,
    WorldAudienceParticipationCohortState,
    WorldStreamingCompetitionCountryState,
    WorldStreamingCompetitionGlobalSummary,
    WorldStreamingCompetitionSnapshot,
    WorldStreamingCompetitionState,
    WorldStreamingPlanAllocation,
    WorldStreamingPlatformAllocation,
    WorldStreamingPlatformOffer,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { getWorldStreamingOffers } from './worldStreamingOffers';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { normalizeWorldPopulationState } from './worldPopulation';

export const WORLD_STREAMING_COMPETITION_SCHEMA_VERSION = 1 as const;
const MAX_SNAPSHOTS = 32;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round2 = (value: number): number => Math.round(value * 100) / 100;

const distributeInteger = (total: number, weights: number[], caps?: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length || safeTotal === 0) return weights.map(() => 0);
    const result = weights.map(() => 0);
    let remaining = safeTotal;
    let available = weights.map((_, index) => index);
    while (remaining > 0 && available.length) {
        const weightTotal = available.reduce((sum, index) => sum + Math.max(.0001, weights[index] || 0), 0);
        const exact = available.map(index => ({
            index,
            exact: remaining * Math.max(.0001, weights[index] || 0) / weightTotal,
        }));
        let granted = 0;
        exact.forEach(item => {
            const capacity = Math.max(0, (caps?.[item.index] ?? safeTotal) - result[item.index]);
            const value = Math.min(capacity, Math.floor(item.exact));
            result[item.index] += value;
            granted += value;
        });
        remaining -= granted;
        if (remaining <= 0) break;
        const order = exact
            .filter(item => result[item.index] < (caps?.[item.index] ?? safeTotal))
            .sort((left, right) => (right.exact - Math.floor(right.exact)) - (left.exact - Math.floor(left.exact)) || left.index - right.index);
        if (!order.length) break;
        order.forEach(item => {
            if (remaining <= 0) return;
            result[item.index] += 1;
            remaining -= 1;
        });
        available = available.filter(index => result[index] < (caps?.[index] ?? safeTotal));
        if (granted === 0 && !order.length) break;
    }
    return result;
};

interface Candidate {
    offer: WorldStreamingPlatformOffer;
    plan: WorldStreamingPlatformOffer['plans'][number];
    utility: number;
    weight: number;
    driver: string;
}

interface CohortAllocation {
    reachableHouseholds: number;
    subscribingHouseholds: number;
    totalSubscriptions: number;
    totalBudget: number;
    totalSpend: number;
    allocations: Array<Candidate & { households: number; primaryHouseholds: number }>;
}

const planUtility = (
    cohort: WorldAudienceCohortState,
    participation: WorldAudienceParticipationCohortState,
    offer: WorldStreamingPlatformOffer,
    plan: WorldStreamingPlatformOffer['plans'][number],
    countryId: string,
    budgetPerHousehold: number,
): { utility: number; driver: string } => {
    const affordability = clamp(100 - plan.effectiveMonthlyPrice / Math.max(.5, budgetPerHousehold) * 62, -80, 95);
    const featureFit = plan.appealIndex
        + (cohort.lifeStageId === 'FAMILY' && plan.featureIds.includes('streams4') ? 16 : 0)
        + (cohort.primaryPersonaId === 'HABIT_STREAMERS' && plan.featureIds.includes('downloads') ? 10 : 0)
        + (cohort.primaryPersonaId === 'PRESTIGE_EXPLORERS' && plan.featureIds.includes('uhd') ? 13 : 0)
        + (cohort.primaryPersonaId === 'VALUE_SEEKERS' && plan.ads ? 7 : 0)
        - (plan.ads ? (100 - cohort.priceSensitivityIndex) * .09 : 0);
    const catalogueFit = offer.catalogueStrengthIndex
        + (cohort.primaryPersonaId === 'FANDOM_LOYALISTS' ? offer.catalogueStrengthIndex * .16 : 0);
    const localizationFit = offer.localizationStrengthIndex
        + (cohort.primaryPersonaId === 'LOCAL_FIRST' ? offer.localizationStrengthIndex * .22 : 0);
    const trustFit = offer.reliabilityIndex
        + (cohort.primaryPersonaId === 'HABIT_STREAMERS' ? offer.loyaltyIndex * .16 : 0);
    const momentum = clamp(offer.countryMomentum[countryId] || 0, -20, 20);
    const utility = round2(
        affordability * (.18 + cohort.priceSensitivityIndex / 500)
        + featureFit * .19
        + catalogueFit * .21
        + localizationFit * .13
        + offer.reputationIndex * .1
        + trustFit * .1
        + offer.marketingIndex * .05
        + offer.loyaltyIndex * .04
        + momentum
        + participation.streamingInterestIndex * .08,
    );
    const drivers = [
        { id: 'PRICE_FIT', value: affordability * (.18 + cohort.priceSensitivityIndex / 500) },
        { id: 'PLAN_FIT', value: featureFit * .19 },
        { id: 'CATALOGUE_FIT', value: catalogueFit * .21 },
        { id: 'LOCALIZATION_FIT', value: localizationFit * .13 },
        { id: 'TRUST', value: trustFit * .1 },
    ];
    return { utility, driver: drivers.sort((left, right) => right.value - left.value || left.id.localeCompare(right.id))[0].id };
};

export const allocateWorldStreamingCohort = (
    countryId: string,
    cohort: WorldAudienceCohortState,
    participation: WorldAudienceParticipationCohortState,
    offers: WorldStreamingPlatformOffer[],
): CohortAllocation => {
    const reachableHouseholds = participation.streamingOnlyHouseholds + participation.dualParticipantHouseholds;
    const totalBudget = Math.max(0, participation.totalMonthlyStreamingBudget);
    if (!reachableHouseholds || !totalBudget || !offers.length) {
        return { reachableHouseholds, subscribingHouseholds: 0, totalSubscriptions: 0, totalBudget, totalSpend: 0, allocations: [] };
    }
    const budgetPerHousehold = totalBudget / reachableHouseholds;
    const candidates = offers.flatMap(offer => {
        const affordablePlans = offer.plans.filter(plan => plan.effectiveMonthlyPrice <= budgetPerHousehold + .001);
        if (!affordablePlans.length) return [];
        const ranked = affordablePlans.map(plan => ({ plan, ...planUtility(cohort, participation, offer, plan, countryId, budgetPerHousehold) }))
            .sort((left, right) => right.utility - left.utility || left.plan.id.localeCompare(right.plan.id));
        const best = ranked[0];
        return [{ offer, plan: best.plan, utility: best.utility, weight: Math.max(.05, Math.exp(clamp((best.utility - 45) / 24, -3, 3))), driver: best.driver }];
    }).sort((left, right) => right.utility - left.utility || left.offer.platformId.localeCompare(right.offer.platformId));
    if (!candidates.length) {
        return { reachableHouseholds, subscribingHouseholds: 0, totalSubscriptions: 0, totalBudget, totalSpend: 0, allocations: [] };
    }
    const willingnessRate = clamp(
        .12 + participation.streamingEligibilityIndex / 260 + participation.streamingInterestIndex / 210
        + cohort.entertainmentAppetiteIndex / 620 - cohort.piracyTendencyIndex / 1500,
        .08,
        .94,
    );
    const subscribingHouseholds = Math.min(reachableHouseholds, Math.round(reachableHouseholds * willingnessRate));
    const sortedPrices = candidates.map(candidate => candidate.plan.effectiveMonthlyPrice).sort((left, right) => left - right);
    let affordableServices = 0;
    let cumulativePrice = 0;
    for (const price of sortedPrices) {
        if (affordableServices >= 3 || cumulativePrice + price > budgetPerHousehold + .001) break;
        cumulativePrice += price;
        affordableServices += 1;
    }
    affordableServices = Math.max(1, affordableServices);
    const secondaryRate = affordableServices >= 2
        ? clamp(.08 + cohort.entertainmentAppetiteIndex / 420 + (budgetPerHousehold - sortedPrices[0]) / Math.max(1, budgetPerHousehold) * .18, .05, .48)
        : 0;
    const tertiaryRate = affordableServices >= 3 ? clamp((cohort.entertainmentAppetiteIndex - 55) / 500, 0, .12) : 0;
    const desiredSlots = subscribingHouseholds
        + Math.round(subscribingHouseholds * secondaryRate)
        + Math.round(subscribingHouseholds * tertiaryRate);
    const counts = distributeInteger(desiredSlots, candidates.map(candidate => candidate.weight), candidates.map(() => subscribingHouseholds));
    let spendCents = counts.reduce((sum, count, index) => sum + count * Math.round(candidates[index].plan.effectiveMonthlyPrice * 100), 0);
    const budgetCents = Math.round(totalBudget * 100);
    const removalOrder = candidates.map((candidate, index) => ({ candidate, index }))
        .sort((left, right) => right.candidate.plan.effectiveMonthlyPrice - left.candidate.plan.effectiveMonthlyPrice
            || left.candidate.utility - right.candidate.utility || left.index - right.index);
    for (const { candidate, index } of removalOrder) {
        if (spendCents <= budgetCents) break;
        const priceCents = Math.max(1, Math.round(candidate.plan.effectiveMonthlyPrice * 100));
        const remove = Math.min(counts[index], Math.ceil((spendCents - budgetCents) / priceCents));
        counts[index] -= remove;
        spendCents -= remove * priceCents;
    }
    const totalSubscriptions = counts.reduce((sum, count) => sum + count, 0);
    const actualSubscribingHouseholds = Math.min(subscribingHouseholds, totalSubscriptions);
    const primaryCounts = distributeInteger(actualSubscribingHouseholds, candidates.map(candidate => candidate.weight), counts);
    return {
        reachableHouseholds,
        subscribingHouseholds: actualSubscribingHouseholds,
        totalSubscriptions,
        totalBudget,
        totalSpend: round2(spendCents / 100),
        allocations: candidates.flatMap((candidate, index) => counts[index] > 0 ? [{
            ...candidate,
            households: counts[index],
            primaryHouseholds: primaryCounts[index],
        }] : []),
    };
};

const createCountry = (
    countryId: string,
    player: Player,
    offersById: Map<string, WorldStreamingPlatformOffer>,
    offerIds: string[],
): WorldStreamingCompetitionCountryState => {
    const audience = player.world.worldAudienceEconomy!.countries[countryId];
    const participation = player.world.worldAudienceParticipation!.countries[countryId];
    const offers = offerIds.map(id => offersById.get(id)).filter((offer): offer is WorldStreamingPlatformOffer => Boolean(offer));
    const platformRows = new Map<string, WorldStreamingPlatformAllocation>();
    let subscribingHouseholds = 0;
    let totalSubscriptions = 0;
    let totalSpend = 0;
    audience.cohorts.forEach(cohort => {
        const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
        if (!overlay) return;
        const result = allocateWorldStreamingCohort(countryId, cohort, overlay, offers);
        subscribingHouseholds += result.subscribingHouseholds;
        totalSubscriptions += result.totalSubscriptions;
        totalSpend = round2(totalSpend + result.totalSpend);
        result.allocations.forEach(allocation => {
            const current = platformRows.get(allocation.offer.platformId) || {
                platformId: allocation.offer.platformId,
                platformName: allocation.offer.name,
                households: 0,
                primaryHouseholds: 0,
                monthlySubscriptionRevenue: 0,
                planAllocations: [],
                strongestDriver: allocation.driver,
            };
            current.households += allocation.households;
            current.primaryHouseholds += allocation.primaryHouseholds;
            const revenue = round2(allocation.households * allocation.plan.effectiveMonthlyPrice);
            current.monthlySubscriptionRevenue = round2(current.monthlySubscriptionRevenue + revenue);
            const planRow = current.planAllocations.find(row => row.planId === allocation.plan.id);
            if (planRow) {
                planRow.households += allocation.households;
                planRow.monthlySubscriptionRevenue = round2(planRow.monthlySubscriptionRevenue + revenue);
            } else {
                current.planAllocations.push({
                    planId: allocation.plan.id,
                    planName: allocation.plan.name,
                    households: allocation.households,
                    effectiveMonthlyPrice: allocation.plan.effectiveMonthlyPrice,
                    monthlySubscriptionRevenue: revenue,
                });
            }
            platformRows.set(current.platformId, current);
        });
    });
    const platformAllocations = [...platformRows.values()]
        .map(row => ({ ...row, planAllocations: row.planAllocations.sort((left, right) => left.planId.localeCompare(right.planId)) }))
        .sort((left, right) => right.households - left.households || left.platformId.localeCompare(right.platformId));
    return {
        countryId,
        streamingReachableHouseholds: participation.streamingReachableHouseholds,
        subscribingHouseholds,
        unclaimedHouseholds: participation.streamingReachableHouseholds - subscribingHouseholds,
        totalSubscriptions,
        totalMonthlyStreamingBudget: participation.totalMonthlyStreamingBudget,
        totalMonthlySubscriptionSpend: round2(totalSpend),
        evaluatedCohortCount: audience.cohorts.length,
        eligiblePlatformCount: offers.length,
        platformAllocations,
    };
};

const mergePlans = (rows: WorldStreamingPlatformAllocation[]): WorldStreamingPlanAllocation[] => {
    const plans = new Map<string, WorldStreamingPlanAllocation>();
    rows.flatMap(row => row.planAllocations).forEach(row => {
        const current = plans.get(row.planId);
        if (current) {
            current.households += row.households;
            current.monthlySubscriptionRevenue = round2(current.monthlySubscriptionRevenue + row.monthlySubscriptionRevenue);
        } else plans.set(row.planId, { ...row });
    });
    return [...plans.values()].sort((left, right) => left.planId.localeCompare(right.planId));
};

const createGlobal = (
    countries: Record<string, WorldStreamingCompetitionCountryState>,
    offerCount: number,
    playerOfferPresent: boolean,
): WorldStreamingCompetitionGlobalSummary => {
    const values = Object.values(countries);
    const playerRows = values.flatMap(country => country.platformAllocations.filter(row => row.platformId === 'PLAYER'));
    return {
        streamingReachableHouseholds: values.reduce((sum, row) => sum + row.streamingReachableHouseholds, 0),
        subscribingHouseholds: values.reduce((sum, row) => sum + row.subscribingHouseholds, 0),
        unclaimedHouseholds: values.reduce((sum, row) => sum + row.unclaimedHouseholds, 0),
        totalSubscriptions: values.reduce((sum, row) => sum + row.totalSubscriptions, 0),
        totalMonthlyStreamingBudget: values.reduce((sum, row) => sum + row.totalMonthlyStreamingBudget, 0),
        totalMonthlySubscriptionSpend: round2(values.reduce((sum, row) => sum + row.totalMonthlySubscriptionSpend, 0)),
        playerHouseholds: playerRows.reduce((sum, row) => sum + row.households, 0),
        playerPrimaryHouseholds: playerRows.reduce((sum, row) => sum + row.primaryHouseholds, 0),
        playerMonthlySubscriptionRevenue: round2(playerRows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
        playerPlanAllocations: mergePlans(playerRows),
        playerOfferPresent,
        countryCount: values.length,
        offerCount,
    };
};

const snapshot = (absoluteWeek: number, global: WorldStreamingCompetitionGlobalSummary): WorldStreamingCompetitionSnapshot => ({
    absoluteWeek,
    subscribingHouseholds: global.subscribingHouseholds,
    totalSubscriptions: global.totalSubscriptions,
    playerHouseholds: global.playerHouseholds,
    playerMonthlySubscriptionRevenue: global.playerMonthlySubscriptionRevenue,
});

const preparePlayer = (player: Player, absoluteWeek: number): Player => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
    return { ...player, world: { ...player.world, worldPopulation: population, worldAudienceEconomy: audience, worldAudienceParticipation: participation } };
};

const buildState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingCompetitionSnapshot[],
): WorldStreamingCompetitionState => {
    const prepared = preparePlayer(player, absoluteWeek);
    const offers = getWorldStreamingOffers(prepared, absoluteWeek);
    const offerMap = new Map(offers.offers.map(offer => [offer.platformId, offer]));
    const countries = Object.fromEntries(Object.keys(prepared.world.worldAudienceParticipation!.countries).sort().map(countryId => [
        countryId,
        createCountry(countryId, prepared, offerMap, offers.byCountry[countryId] || []),
    ]));
    const global = createGlobal(countries, offers.offers.length, offers.offers.some(offer => offer.isPlayer));
    return {
        schemaVersion: WORLD_STREAMING_COMPETITION_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('world-streaming-competition-source',
            absoluteWeek, prepared.world.worldPopulation!.lastProcessedAbsoluteWeek,
            prepared.world.worldAudienceEconomy!.lastProcessedAbsoluteWeek,
            prepared.world.worldAudienceParticipation!.lastProcessedAbsoluteWeek, offers.fingerprint),
        countries,
        global,
        snapshots,
    };
};

export const createWorldStreamingCompetitionState = (player: Player, absoluteWeek: number): WorldStreamingCompetitionState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const state = buildState(player, week, week, []);
    return { ...state, snapshots: [snapshot(week, state.global)] };
};

const structurallyValid = (state: unknown): state is WorldStreamingCompetitionState => {
    if (!state || typeof state !== 'object') return false;
    const input = state as Partial<WorldStreamingCompetitionState>;
    if (input.schemaVersion !== 1 || !input.countries || !input.global || typeof input.global.playerOfferPresent !== 'boolean' || !Array.isArray(input.snapshots) || input.snapshots.length > MAX_SNAPSHOTS) return false;
    const countries = Object.values(input.countries);
    if (!countries.length || input.global.countryCount !== countries.length) return false;
    const validCountries = countries.every(country => {
        if (!country || !Array.isArray(country.platformAllocations)) return false;
        if (country.subscribingHouseholds + country.unclaimedHouseholds !== country.streamingReachableHouseholds) return false;
        if (country.totalMonthlySubscriptionSpend < 0 || country.totalMonthlySubscriptionSpend > country.totalMonthlyStreamingBudget + .01) return false;
        if (country.totalSubscriptions !== country.platformAllocations.reduce((sum, row) => sum + row.households, 0)) return false;
        return country.platformAllocations.every(row => row.households === row.planAllocations.reduce((sum, plan) => sum + plan.households, 0)
            && Math.abs(row.monthlySubscriptionRevenue - row.planAllocations.reduce((sum, plan) => sum + plan.monthlySubscriptionRevenue, 0)) < .011);
    });
    if (!validCountries) return false;
    const playerRows = countries.flatMap(country => country.platformAllocations.filter(row => row.platformId === 'PLAYER'));
    const playerPlans = mergePlans(playerRows);
    return input.global.streamingReachableHouseholds === countries.reduce((sum, country) => sum + country.streamingReachableHouseholds, 0)
        && input.global.subscribingHouseholds === countries.reduce((sum, country) => sum + country.subscribingHouseholds, 0)
        && input.global.unclaimedHouseholds === countries.reduce((sum, country) => sum + country.unclaimedHouseholds, 0)
        && input.global.totalSubscriptions === countries.reduce((sum, country) => sum + country.totalSubscriptions, 0)
        && Math.abs(input.global.totalMonthlySubscriptionSpend - round2(countries.reduce((sum, country) => sum + country.totalMonthlySubscriptionSpend, 0))) < .011
        && input.global.playerHouseholds === playerRows.reduce((sum, row) => sum + row.households, 0)
        && input.global.playerPrimaryHouseholds === playerRows.reduce((sum, row) => sum + row.primaryHouseholds, 0)
        && Math.abs(input.global.playerMonthlySubscriptionRevenue - round2(playerRows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0))) < .011
        && JSON.stringify(input.global.playerPlanAllocations) === JSON.stringify(playerPlans);
};

export const normalizeWorldStreamingCompetitionState = (
    input: unknown,
    player: Player,
    absoluteWeek: number,
): WorldStreamingCompetitionState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const rebuilt = createWorldStreamingCompetitionState(player, week);
    if (!structurallyValid(input)) return rebuilt;
    if (input.lastProcessedAbsoluteWeek === week && input.sourceFingerprint === rebuilt.sourceFingerprint) return input;
    const crossedYear = Math.floor(week / 52) > Math.floor(input.lastProcessedAbsoluteWeek / 52);
    const snapshots = crossedYear
        ? [...input.snapshots, snapshot(week, rebuilt.global)].slice(-MAX_SNAPSHOTS)
        : input.snapshots.slice(-MAX_SNAPSHOTS);
    return { ...rebuilt, initializedAtAbsoluteWeek: input.initializedAtAbsoluteWeek, snapshots };
};

export const advanceWorldStreamingCompetitionToWeek = normalizeWorldStreamingCompetitionState;

export const getWorldStreamingPlayerOutcome = (
    state: WorldStreamingCompetitionState | undefined,
): (Pick<WorldStreamingCompetitionGlobalSummary, 'playerHouseholds' | 'playerPrimaryHouseholds' | 'playerMonthlySubscriptionRevenue' | 'playerPlanAllocations'> & {
    households: number;
    planAllocations: WorldStreamingPlanAllocation[];
    monthlySubscriptionRevenue: number;
}) | null => {
    if (!state || !structurallyValid(state) || !state.global.playerOfferPresent) return null;
    return {
        households: state.global.playerHouseholds,
        playerHouseholds: state.global.playerHouseholds,
        playerPrimaryHouseholds: state.global.playerPrimaryHouseholds,
        playerMonthlySubscriptionRevenue: state.global.playerMonthlySubscriptionRevenue,
        playerPlanAllocations: state.global.playerPlanAllocations,
        // Compact consumer alias used by weekly and UI adapters.
        planAllocations: state.global.playerPlanAllocations,
        monthlySubscriptionRevenue: state.global.playerMonthlySubscriptionRevenue,
    };
};
