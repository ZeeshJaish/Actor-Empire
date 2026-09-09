import type {
    WorldAudienceCohortState,
    WorldAudienceCountryState,
    WorldAudienceEconomyState,
    WorldAudienceParticipationBarrierId,
    WorldAudienceParticipationCohortState,
    WorldAudienceParticipationCountryState,
    WorldAudienceParticipationGlobalSummary,
    WorldAudienceParticipationSnapshot,
    WorldAudienceParticipationState,
    WorldPopulationCountryState,
    WorldPopulationState,
} from '../../types';

export const WORLD_AUDIENCE_PARTICIPATION_SCHEMA_VERSION = 1 as const;
const WORLD_AUDIENCE_PARTICIPATION_MAX_SNAPSHOTS = 32;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round1 = (value: number): number => Math.round(value * 10) / 10;
const isNonNegativeInteger = (value: unknown): value is number => (
    Number.isSafeInteger(value) && (value as number) >= 0
);
const isBoundedIndex = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
);

const PARTICIPATION_BARRIERS = new Set<WorldAudienceParticipationBarrierId>([
    'CONNECTIVITY',
    'DEVICE_ACCESS',
    'PAYMENT_ACCESS',
    'AFFORDABILITY',
    'CINEMA_ACCESS',
    'TRAVEL_ACCESS',
    'LANGUAGE_ACCESS',
    'LEISURE_TIME',
    'LOW_INTEREST',
    'NONE',
]);

const distributeInteger = (total: number, weights: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length) return [];
    const positive = weights.map(value => Math.max(0, Number(value) || 0));
    const weightTotal = positive.reduce((sum, value) => sum + value, 0);
    const usable = weightTotal > 0 ? positive : weights.map(() => 1);
    const usableTotal = usable.reduce((sum, value) => sum + value, 0);
    const exact = usable.map(value => safeTotal * value / usableTotal);
    const values = exact.map(value => Math.floor(value));
    let remaining = safeTotal - values.reduce((sum, value) => sum + value, 0);
    const order = exact
        .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
    while (remaining > 0) {
        values[order[(safeTotal - remaining) % order.length].index] += 1;
        remaining -= 1;
    }
    return values;
};

const budgetAccessIndex = (cohort: WorldAudienceCohortState): number => round1(clamp(
    12 + Math.log2(cohort.monthlyEntertainmentBudgetPerHousehold + 1) * 14,
    0,
    100,
));

const chooseBarrier = (
    candidates: Array<[WorldAudienceParticipationBarrierId, number]>,
): { id: WorldAudienceParticipationBarrierId; index: number } => {
    const [id, rawIndex] = candidates.reduce((worst, candidate) => (
        candidate[1] > worst[1] ? candidate : worst
    ), ['NONE', 0] as [WorldAudienceParticipationBarrierId, number]);
    const index = round1(clamp(rawIndex, 0, 100));
    return index < 12 ? { id: 'NONE', index } : { id, index };
};

const createCohortOverlay = (
    population: WorldPopulationCountryState,
    audienceCountry: WorldAudienceCountryState,
    cohort: WorldAudienceCohortState,
): WorldAudienceParticipationCohortState => {
    const affordability = budgetAccessIndex(cohort);
    const bestDeviceAccess = Math.max(population.smartphoneAccessPercent, population.homeScreenAccessPercent);
    const streamingEligibilityIndex = round1(clamp(
        population.reliableInternetPercent * .32
        + bestDeviceAccess * .18
        + population.digitalPaymentAccessPercent * .16
        + cohort.accessReadinessIndex * .2
        + affordability * .14,
        0,
        100,
    ));
    const cinemaEligibilityIndex = round1(clamp(
        population.cinemaAccessPercent * .46
        + population.urbanPercent * .14
        + population.digitalPaymentAccessPercent * .05
        + cohort.accessReadinessIndex * .09
        + affordability * .26,
        0,
        100,
    ));
    const streamingInterestIndex = round1(clamp(
        cohort.entertainmentAppetiteIndex * .4
        + cohort.personaAffinity[5] * .21
        + cohort.personaAffinity[2] * .12
        + cohort.personaAffinity[0] * .08
        + cohort.localLanguageAffinityIndex * .1
        + cohort.legalConsumptionIndex * .09,
        0,
        100,
    ));
    const cinemaInterestIndex = round1(clamp(
        cohort.entertainmentAppetiteIndex * .35
        + cohort.personaAffinity[2] * .24
        + cohort.personaAffinity[3] * .15
        + cohort.personaAffinity[0] * .08
        + cohort.localLanguageAffinityIndex * .1
        + cohort.legalConsumptionIndex * .08,
        0,
        100,
    ));

    const streamingRate = clamp(
        streamingEligibilityIndex / 100 * (.22 + streamingInterestIndex / 100 * .82),
        0,
        .97,
    );
    const cinemaRate = clamp(
        cinemaEligibilityIndex / 100 * (.16 + cinemaInterestIndex / 100 * .76),
        0,
        .9,
    );
    const overlapAffinity = clamp(
        .3 + cohort.entertainmentAppetiteIndex / 230 + affordability / 520,
        .32,
        .82,
    );
    const dualRate = Math.min(streamingRate, cinemaRate) * overlapAffinity;
    const streamingOnlyRate = Math.max(0, streamingRate - dualRate);
    const cinemaOnlyRate = Math.max(0, cinemaRate - dualRate);
    const neitherRate = Math.max(0, 1 - streamingOnlyRate - cinemaOnlyRate - dualRate);
    const [streamingOnlyHouseholds, cinemaOnlyHouseholds, dualParticipantHouseholds, neitherHouseholds] = distributeInteger(
        cohort.households,
        [streamingOnlyRate, cinemaOnlyRate, dualRate, neitherRate],
    );

    const streamingPotential = (streamingOnlyHouseholds + dualParticipantHouseholds) / Math.max(1, cohort.households);
    const cinemaPotential = (cinemaOnlyHouseholds + dualParticipantHouseholds) / Math.max(1, cohort.households);
    const uncommittedWeight = 18 + cohort.priceSensitivityIndex * .22 + audienceCountry.budgetPressureIndex * .18;
    const [totalMonthlyStreamingBudget, totalMonthlyCinemaBudget, totalMonthlyOtherEntertainmentBudget, totalMonthlyUncommittedBudget] = distributeInteger(
        cohort.totalMonthlyEntertainmentBudget,
        [
            streamingPotential * streamingInterestIndex * 1.05,
            cinemaPotential * cinemaInterestIndex,
            12 + cohort.entertainmentAppetiteIndex * .15,
            uncommittedWeight,
        ],
    );

    const languageComplexity = clamp((population.languages.length - 1) * 9, 0, 45);
    const streamingBarrier = chooseBarrier([
        ['CONNECTIVITY', 100 - population.reliableInternetPercent],
        ['DEVICE_ACCESS', 100 - bestDeviceAccess],
        ['PAYMENT_ACCESS', 100 - population.digitalPaymentAccessPercent],
        ['AFFORDABILITY', (100 - affordability) * .9 + cohort.priceSensitivityIndex * .1],
        ['LANGUAGE_ACCESS', languageComplexity * cohort.localLanguageAffinityIndex / 100],
        ['LOW_INTEREST', 100 - streamingInterestIndex],
    ]);
    const cinemaBarrier = chooseBarrier([
        ['CINEMA_ACCESS', 100 - population.cinemaAccessPercent],
        ['TRAVEL_ACCESS', (100 - population.urbanPercent) * .8],
        ['AFFORDABILITY', (100 - affordability) * .82 + cohort.priceSensitivityIndex * .18],
        ['LEISURE_TIME', cohort.lifeStageId === 'FAMILY' ? 42 : cohort.lifeStageId === 'ADULT' ? 34 : 22],
        ['LANGUAGE_ACCESS', languageComplexity * cohort.localLanguageAffinityIndex / 100],
        ['LOW_INTEREST', 100 - cinemaInterestIndex],
    ]);

    return {
        cohortId: cohort.id,
        streamingEligibilityIndex,
        streamingInterestIndex,
        cinemaEligibilityIndex,
        cinemaInterestIndex,
        streamingOnlyHouseholds,
        cinemaOnlyHouseholds,
        dualParticipantHouseholds,
        neitherHouseholds,
        totalMonthlyStreamingBudget,
        totalMonthlyCinemaBudget,
        totalMonthlyOtherEntertainmentBudget,
        totalMonthlyUncommittedBudget,
        streamingBarrierId: streamingBarrier.id,
        streamingBarrierIndex: streamingBarrier.index,
        cinemaBarrierId: cinemaBarrier.id,
        cinemaBarrierIndex: cinemaBarrier.index,
    };
};

const weightedTopBarrier = (
    cohorts: WorldAudienceParticipationCohortState[],
    industry: 'STREAMING' | 'CINEMA',
): WorldAudienceParticipationBarrierId => {
    const weights = new Map<WorldAudienceParticipationBarrierId, number>();
    cohorts.forEach(cohort => {
        const id = industry === 'STREAMING' ? cohort.streamingBarrierId : cohort.cinemaBarrierId;
        const index = industry === 'STREAMING' ? cohort.streamingBarrierIndex : cohort.cinemaBarrierIndex;
        const households = cohort.streamingOnlyHouseholds + cohort.cinemaOnlyHouseholds + cohort.dualParticipantHouseholds + cohort.neitherHouseholds;
        weights.set(id, (weights.get(id) || 0) + households * index);
    });
    return [...weights.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || 'NONE';
};

const createCountry = (
    population: WorldPopulationCountryState,
    audience: WorldAudienceCountryState,
): WorldAudienceParticipationCountryState => {
    const cohorts = audience.cohorts.map(cohort => createCohortOverlay(population, audience, cohort));
    const streamingOnlyHouseholds = cohorts.reduce((sum, cohort) => sum + cohort.streamingOnlyHouseholds, 0);
    const cinemaOnlyHouseholds = cohorts.reduce((sum, cohort) => sum + cohort.cinemaOnlyHouseholds, 0);
    const dualParticipantHouseholds = cohorts.reduce((sum, cohort) => sum + cohort.dualParticipantHouseholds, 0);
    const commercialNeitherHouseholds = cohorts.reduce((sum, cohort) => sum + cohort.neitherHouseholds, 0);
    return {
        id: population.id,
        population: population.population,
        households: population.households,
        commercialHouseholds: audience.commercialHouseholds,
        nonParticipantHouseholds: audience.nonParticipantHouseholds,
        streamingOnlyHouseholds,
        cinemaOnlyHouseholds,
        dualParticipantHouseholds,
        commercialNeitherHouseholds,
        neitherHouseholds: commercialNeitherHouseholds + audience.nonParticipantHouseholds,
        streamingReachableHouseholds: streamingOnlyHouseholds + dualParticipantHouseholds,
        cinemaReachableHouseholds: cinemaOnlyHouseholds + dualParticipantHouseholds,
        totalMonthlyStreamingBudget: cohorts.reduce((sum, cohort) => sum + cohort.totalMonthlyStreamingBudget, 0),
        totalMonthlyCinemaBudget: cohorts.reduce((sum, cohort) => sum + cohort.totalMonthlyCinemaBudget, 0),
        totalMonthlyOtherEntertainmentBudget: cohorts.reduce((sum, cohort) => sum + cohort.totalMonthlyOtherEntertainmentBudget, 0),
        totalMonthlyUncommittedBudget: cohorts.reduce((sum, cohort) => sum + cohort.totalMonthlyUncommittedBudget, 0),
        topStreamingBarrierId: weightedTopBarrier(cohorts, 'STREAMING'),
        topCinemaBarrierId: weightedTopBarrier(cohorts, 'CINEMA'),
        cohorts,
        lastMacroPeriod: population.lastMacroPeriod,
    };
};

const createGlobalSummary = (
    countries: Record<string, WorldAudienceParticipationCountryState>,
): WorldAudienceParticipationGlobalSummary => {
    const values = Object.values(countries);
    const totals = values.reduce((result, country) => ({
        population: result.population + country.population,
        households: result.households + country.households,
        commercialHouseholds: result.commercialHouseholds + country.commercialHouseholds,
        nonParticipantHouseholds: result.nonParticipantHouseholds + country.nonParticipantHouseholds,
        streamingOnlyHouseholds: result.streamingOnlyHouseholds + country.streamingOnlyHouseholds,
        cinemaOnlyHouseholds: result.cinemaOnlyHouseholds + country.cinemaOnlyHouseholds,
        dualParticipantHouseholds: result.dualParticipantHouseholds + country.dualParticipantHouseholds,
        commercialNeitherHouseholds: result.commercialNeitherHouseholds + country.commercialNeitherHouseholds,
        neitherHouseholds: result.neitherHouseholds + country.neitherHouseholds,
        streamingReachableHouseholds: result.streamingReachableHouseholds + country.streamingReachableHouseholds,
        cinemaReachableHouseholds: result.cinemaReachableHouseholds + country.cinemaReachableHouseholds,
        totalMonthlyStreamingBudget: result.totalMonthlyStreamingBudget + country.totalMonthlyStreamingBudget,
        totalMonthlyCinemaBudget: result.totalMonthlyCinemaBudget + country.totalMonthlyCinemaBudget,
        totalMonthlyOtherEntertainmentBudget: result.totalMonthlyOtherEntertainmentBudget + country.totalMonthlyOtherEntertainmentBudget,
        totalMonthlyUncommittedBudget: result.totalMonthlyUncommittedBudget + country.totalMonthlyUncommittedBudget,
        cohortCount: result.cohortCount + country.cohorts.length,
    }), {
        population: 0,
        households: 0,
        commercialHouseholds: 0,
        nonParticipantHouseholds: 0,
        streamingOnlyHouseholds: 0,
        cinemaOnlyHouseholds: 0,
        dualParticipantHouseholds: 0,
        commercialNeitherHouseholds: 0,
        neitherHouseholds: 0,
        streamingReachableHouseholds: 0,
        cinemaReachableHouseholds: 0,
        totalMonthlyStreamingBudget: 0,
        totalMonthlyCinemaBudget: 0,
        totalMonthlyOtherEntertainmentBudget: 0,
        totalMonthlyUncommittedBudget: 0,
        cohortCount: 0,
    });
    return { ...totals, countryCount: values.length };
};

const createSnapshot = (
    absoluteWeek: number,
    global: WorldAudienceParticipationGlobalSummary,
): WorldAudienceParticipationSnapshot => ({
    absoluteWeek,
    streamingReachableHouseholds: global.streamingReachableHouseholds,
    cinemaReachableHouseholds: global.cinemaReachableHouseholds,
    dualParticipantHouseholds: global.dualParticipantHouseholds,
    neitherHouseholds: global.neitherHouseholds,
});

const buildState = (
    population: WorldPopulationState,
    audience: WorldAudienceEconomyState,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldAudienceParticipationSnapshot[],
): WorldAudienceParticipationState => {
    const targetWeek = Math.max(population.epochAbsoluteWeek, Math.round(Number(absoluteWeek) || 0));
    const countries = Object.fromEntries(Object.values(population.countries).map(country => [
        country.id,
        createCountry(country, audience.countries[country.id]),
    ]));
    return {
        schemaVersion: WORLD_AUDIENCE_PARTICIPATION_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: targetWeek,
        countries,
        global: createGlobalSummary(countries),
        snapshots,
    };
};

export const createWorldAudienceParticipationState = (
    population: WorldPopulationState,
    audience: WorldAudienceEconomyState,
    absoluteWeek: number,
): WorldAudienceParticipationState => {
    const targetWeek = Math.max(population.epochAbsoluteWeek, Math.round(Number(absoluteWeek) || 0));
    const state = buildState(population, audience, targetWeek, targetWeek, []);
    return { ...state, snapshots: [createSnapshot(targetWeek, state.global)] };
};

const isStructurallyUsableState = (
    input: unknown,
    population: WorldPopulationState,
): input is WorldAudienceParticipationState => {
    if (!input || typeof input !== 'object') return false;
    const state = input as Partial<WorldAudienceParticipationState>;
    if (state.schemaVersion !== WORLD_AUDIENCE_PARTICIPATION_SCHEMA_VERSION) return false;
    if (!Number.isFinite(state.initializedAtAbsoluteWeek) || !Number.isFinite(state.lastProcessedAbsoluteWeek)) return false;
    if (!state.countries || !state.global || !Array.isArray(state.snapshots)) return false;
    if (state.snapshots.length > WORLD_AUDIENCE_PARTICIPATION_MAX_SNAPSHOTS) return false;
    if (!state.snapshots.every(snapshot => (
        isNonNegativeInteger(snapshot.absoluteWeek)
        && isNonNegativeInteger(snapshot.streamingReachableHouseholds)
        && isNonNegativeInteger(snapshot.cinemaReachableHouseholds)
        && isNonNegativeInteger(snapshot.dualParticipantHouseholds)
        && isNonNegativeInteger(snapshot.neitherHouseholds)
    ))) return false;
    const populationCountries = Object.values(population.countries);
    if (Object.keys(state.countries).length !== populationCountries.length) return false;
    if (!populationCountries.every(canonicalPopulation => {
        const country = state.countries?.[canonicalPopulation.id];
        if (!country || !Array.isArray(country.cohorts) || country.cohorts.length < 1 || country.cohorts.length > 18) return false;
        if (country.id !== canonicalPopulation.id) return false;
        if (![
            country.population,
            country.households,
            country.commercialHouseholds,
            country.nonParticipantHouseholds,
            country.streamingOnlyHouseholds,
            country.cinemaOnlyHouseholds,
            country.dualParticipantHouseholds,
            country.commercialNeitherHouseholds,
            country.neitherHouseholds,
            country.streamingReachableHouseholds,
            country.cinemaReachableHouseholds,
            country.totalMonthlyStreamingBudget,
            country.totalMonthlyCinemaBudget,
            country.totalMonthlyOtherEntertainmentBudget,
            country.totalMonthlyUncommittedBudget,
            country.lastMacroPeriod,
        ].every(isNonNegativeInteger)) return false;
        if (!PARTICIPATION_BARRIERS.has(country.topStreamingBarrierId)
            || !PARTICIPATION_BARRIERS.has(country.topCinemaBarrierId)) return false;
        const cohortIds = new Set(country.cohorts.map(overlay => overlay.cohortId));
        if (cohortIds.size !== country.cohorts.length) return false;
        const overlaysValid = country.cohorts.every(overlay => {
            if (!overlay.cohortId.startsWith(`${country.id}:`)) return false;
            if (![
                overlay.streamingEligibilityIndex,
                overlay.streamingInterestIndex,
                overlay.cinemaEligibilityIndex,
                overlay.cinemaInterestIndex,
                overlay.streamingBarrierIndex,
                overlay.cinemaBarrierIndex,
            ].every(isBoundedIndex)) return false;
            if (![
                overlay.streamingOnlyHouseholds,
                overlay.cinemaOnlyHouseholds,
                overlay.dualParticipantHouseholds,
                overlay.neitherHouseholds,
                overlay.totalMonthlyStreamingBudget,
                overlay.totalMonthlyCinemaBudget,
                overlay.totalMonthlyOtherEntertainmentBudget,
                overlay.totalMonthlyUncommittedBudget,
            ].every(isNonNegativeInteger)) return false;
            if (!PARTICIPATION_BARRIERS.has(overlay.streamingBarrierId)
                || !PARTICIPATION_BARRIERS.has(overlay.cinemaBarrierId)) return false;
            const partitions = overlay.streamingOnlyHouseholds + overlay.cinemaOnlyHouseholds + overlay.dualParticipantHouseholds + overlay.neitherHouseholds;
            return partitions > 0;
        });
        if (!overlaysValid) return false;
        const overlayTotals = country.cohorts.reduce((totals, overlay) => ({
            streamingOnlyHouseholds: totals.streamingOnlyHouseholds + overlay.streamingOnlyHouseholds,
            cinemaOnlyHouseholds: totals.cinemaOnlyHouseholds + overlay.cinemaOnlyHouseholds,
            dualParticipantHouseholds: totals.dualParticipantHouseholds + overlay.dualParticipantHouseholds,
            commercialNeitherHouseholds: totals.commercialNeitherHouseholds + overlay.neitherHouseholds,
            totalMonthlyStreamingBudget: totals.totalMonthlyStreamingBudget + overlay.totalMonthlyStreamingBudget,
            totalMonthlyCinemaBudget: totals.totalMonthlyCinemaBudget + overlay.totalMonthlyCinemaBudget,
            totalMonthlyOtherEntertainmentBudget: totals.totalMonthlyOtherEntertainmentBudget + overlay.totalMonthlyOtherEntertainmentBudget,
            totalMonthlyUncommittedBudget: totals.totalMonthlyUncommittedBudget + overlay.totalMonthlyUncommittedBudget,
        }), {
            streamingOnlyHouseholds: 0,
            cinemaOnlyHouseholds: 0,
            dualParticipantHouseholds: 0,
            commercialNeitherHouseholds: 0,
            totalMonthlyStreamingBudget: 0,
            totalMonthlyCinemaBudget: 0,
            totalMonthlyOtherEntertainmentBudget: 0,
            totalMonthlyUncommittedBudget: 0,
        });
        const overlayHouseholds = overlayTotals.streamingOnlyHouseholds
            + overlayTotals.cinemaOnlyHouseholds
            + overlayTotals.dualParticipantHouseholds
            + overlayTotals.commercialNeitherHouseholds;
        return overlayHouseholds === country.commercialHouseholds
            && country.commercialHouseholds + country.nonParticipantHouseholds === country.households
            && country.streamingOnlyHouseholds === overlayTotals.streamingOnlyHouseholds
            && country.cinemaOnlyHouseholds === overlayTotals.cinemaOnlyHouseholds
            && country.dualParticipantHouseholds === overlayTotals.dualParticipantHouseholds
            && country.commercialNeitherHouseholds === overlayTotals.commercialNeitherHouseholds
            && country.neitherHouseholds === overlayTotals.commercialNeitherHouseholds + country.nonParticipantHouseholds
            && country.streamingReachableHouseholds === overlayTotals.streamingOnlyHouseholds + overlayTotals.dualParticipantHouseholds
            && country.cinemaReachableHouseholds === overlayTotals.cinemaOnlyHouseholds + overlayTotals.dualParticipantHouseholds
            && country.totalMonthlyStreamingBudget === overlayTotals.totalMonthlyStreamingBudget
            && country.totalMonthlyCinemaBudget === overlayTotals.totalMonthlyCinemaBudget
            && country.totalMonthlyOtherEntertainmentBudget === overlayTotals.totalMonthlyOtherEntertainmentBudget
            && country.totalMonthlyUncommittedBudget === overlayTotals.totalMonthlyUncommittedBudget;
    })) return false;
    const values = Object.values(state.countries);
    const canonicalGlobal = createGlobalSummary(state.countries);
    return Object.entries(canonicalGlobal).every(([key, value]) => (
        state.global?.[key as keyof WorldAudienceParticipationGlobalSummary] === value
    ))
        && state.global.population === values.reduce((sum, country) => sum + country.population, 0)
        && state.global.households === values.reduce((sum, country) => sum + country.households, 0)
        && state.global.streamingOnlyHouseholds + state.global.cinemaOnlyHouseholds + state.global.dualParticipantHouseholds + state.global.neitherHouseholds === state.global.households;
};

const matchesSources = (
    state: WorldAudienceParticipationState,
    population: WorldPopulationState,
    audience: WorldAudienceEconomyState,
): boolean => state.global.population === population.global.population
    && state.global.households === population.global.households
    && state.global.commercialHouseholds === audience.global.commercialHouseholds
    && Object.values(audience.countries).every(country => (
        state.countries[country.id]?.commercialHouseholds === country.commercialHouseholds
        && state.countries[country.id]?.cohorts.length === country.cohorts.length
        && state.countries[country.id]?.cohorts.every((overlay, index) => (
            overlay.cohortId === country.cohorts[index]?.id
            && overlay.streamingOnlyHouseholds
                + overlay.cinemaOnlyHouseholds
                + overlay.dualParticipantHouseholds
                + overlay.neitherHouseholds
                === country.cohorts[index]?.households
            && overlay.totalMonthlyStreamingBudget
                + overlay.totalMonthlyCinemaBudget
                + overlay.totalMonthlyOtherEntertainmentBudget
                + overlay.totalMonthlyUncommittedBudget
                === country.cohorts[index]?.totalMonthlyEntertainmentBudget
        ))
    ));

export const advanceWorldAudienceParticipationToWeek = (
    input: WorldAudienceParticipationState,
    population: WorldPopulationState,
    audience: WorldAudienceEconomyState,
    absoluteWeek: number,
): WorldAudienceParticipationState => {
    const targetWeek = Math.max(population.epochAbsoluteWeek, Math.round(Number(absoluteWeek) || 0));
    if (!isStructurallyUsableState(input, population)) {
        return createWorldAudienceParticipationState(population, audience, targetWeek);
    }
    if (input.lastProcessedAbsoluteWeek === targetWeek && matchesSources(input, population, audience)) return input;
    const crossedYear = Math.floor((targetWeek - population.epochAbsoluteWeek) / 52)
        > Math.floor((input.lastProcessedAbsoluteWeek - population.epochAbsoluteWeek) / 52);
    const rebuilt = buildState(population, audience, targetWeek, input.initializedAtAbsoluteWeek, []);
    const snapshots = crossedYear
        ? [...input.snapshots, createSnapshot(targetWeek, rebuilt.global)].slice(-WORLD_AUDIENCE_PARTICIPATION_MAX_SNAPSHOTS)
        : input.snapshots.slice(-WORLD_AUDIENCE_PARTICIPATION_MAX_SNAPSHOTS);
    return { ...rebuilt, snapshots };
};

export const normalizeWorldAudienceParticipationState = (
    input: unknown,
    population: WorldPopulationState,
    audience: WorldAudienceEconomyState,
    absoluteWeek: number,
): WorldAudienceParticipationState => {
    if (!isStructurallyUsableState(input, population)) {
        return createWorldAudienceParticipationState(population, audience, absoluteWeek);
    }
    return advanceWorldAudienceParticipationToWeek(input, population, audience, absoluteWeek);
};

export const getWorldAudienceParticipationCountry = (
    state: WorldAudienceParticipationState | undefined,
    countryId: string,
): WorldAudienceParticipationCountryState | null => {
    const id = String(countryId || '').trim().toUpperCase();
    return id && state?.countries[id] ? state.countries[id] : null;
};

export const getWorldAudienceParticipationSummary = (
    state: WorldAudienceParticipationState | undefined,
): WorldAudienceParticipationGlobalSummary | null => state?.global || null;
