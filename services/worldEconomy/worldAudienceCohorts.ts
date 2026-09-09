import type {
    WorldAudienceCohortState,
    WorldAudienceCountryState,
    WorldAudienceEconomySnapshot,
    WorldAudienceEconomyState,
    WorldAudienceGlobalSummary,
    WorldAudienceLifeStageId,
    WorldAudiencePersonaAffinity,
    WorldAudiencePersonaId,
    WorldPopulationCountryState,
    WorldPopulationIncomeBandId,
    WorldPopulationState,
} from '../../types';

export const WORLD_AUDIENCE_ECONOMY_SCHEMA_VERSION = 1 as const;
const WORLD_AUDIENCE_MAX_SNAPSHOTS = 32;

export const WORLD_AUDIENCE_PERSONA_IDS: WorldAudiencePersonaId[] = [
    'FAMILY_HOUSEHOLDS',
    'VALUE_SEEKERS',
    'FANDOM_LOYALISTS',
    'PRESTIGE_EXPLORERS',
    'LOCAL_FIRST',
    'HABIT_STREAMERS',
];

const INCOME_BAND_IDS: WorldPopulationIncomeBandId[] = [
    'SUBSISTENCE',
    'WORKING',
    'MIDDLE',
    'AFFLUENT',
    'WEALTHY',
    'ULTRA_WEALTHY',
];

interface PersonaProfile {
    lifeStageId: WorldAudienceLifeStageId;
    appetite: number;
    budgetMultiplier: number;
    localAffinity: number;
    affinity: WorldAudiencePersonaAffinity;
}

const PERSONA_PROFILES: Record<WorldAudiencePersonaId, PersonaProfile> = {
    FAMILY_HOUSEHOLDS: {
        lifeStageId: 'FAMILY', appetite: 68, budgetMultiplier: 1.08, localAffinity: 72,
        affinity: [100, 58, 61, 35, 70, 74],
    },
    VALUE_SEEKERS: {
        lifeStageId: 'YOUNG_ADULT', appetite: 58, budgetMultiplier: .82, localAffinity: 61,
        affinity: [48, 100, 49, 31, 66, 62],
    },
    FANDOM_LOYALISTS: {
        lifeStageId: 'YOUTH', appetite: 91, budgetMultiplier: 1.15, localAffinity: 68,
        affinity: [56, 45, 100, 63, 67, 87],
    },
    PRESTIGE_EXPLORERS: {
        lifeStageId: 'ADULT', appetite: 73, budgetMultiplier: 1.28, localAffinity: 52,
        affinity: [35, 31, 65, 100, 47, 61],
    },
    LOCAL_FIRST: {
        lifeStageId: 'ADULT', appetite: 70, budgetMultiplier: .94, localAffinity: 100,
        affinity: [69, 65, 57, 43, 100, 70],
    },
    HABIT_STREAMERS: {
        lifeStageId: 'MATURE', appetite: 84, budgetMultiplier: 1.12, localAffinity: 64,
        affinity: [72, 61, 83, 62, 67, 100],
    },
};

const INCOME_PERSONAS: Record<WorldPopulationIncomeBandId, [WorldAudiencePersonaId, WorldAudiencePersonaId]> = {
    SUBSISTENCE: ['LOCAL_FIRST', 'VALUE_SEEKERS'],
    WORKING: ['FAMILY_HOUSEHOLDS', 'LOCAL_FIRST'],
    MIDDLE: ['FAMILY_HOUSEHOLDS', 'HABIT_STREAMERS'],
    AFFLUENT: ['PRESTIGE_EXPLORERS', 'FANDOM_LOYALISTS'],
    WEALTHY: ['PRESTIGE_EXPLORERS', 'HABIT_STREAMERS'],
    ULTRA_WEALTHY: ['PRESTIGE_EXPLORERS', 'FANDOM_LOYALISTS'],
};

const BASE_COMMERCIAL_SHARE: Record<WorldPopulationIncomeBandId, number> = {
    SUBSISTENCE: .24,
    WORKING: .58,
    MIDDLE: .82,
    AFFLUENT: .93,
    WEALTHY: .97,
    ULTRA_WEALTHY: .985,
};

const BASE_MONTHLY_ENTERTAINMENT_BUDGET: Record<WorldPopulationIncomeBandId, number> = {
    SUBSISTENCE: 1.5,
    WORKING: 6,
    MIDDLE: 18,
    AFFLUENT: 55,
    WEALTHY: 165,
    ULTRA_WEALTHY: 650,
};

const BASE_PRICE_SENSITIVITY: Record<WorldPopulationIncomeBandId, number> = {
    SUBSISTENCE: 96,
    WORKING: 84,
    MIDDLE: 64,
    AFFLUENT: 39,
    WEALTHY: 20,
    ULTRA_WEALTHY: 8,
};

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

const round1 = (value: number): number => Math.round(value * 10) / 10;
const round2 = (value: number): number => Math.round(value * 100) / 100;

const stableUnit = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0xffffffff;
};

const distributeInteger = (total: number, weights: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length) return [];
    const positiveWeights = weights.map(value => Math.max(0, Number(value) || 0));
    const weightTotal = positiveWeights.reduce((sum, value) => sum + value, 0) || weights.length;
    const exact = positiveWeights.map(value => safeTotal * value / weightTotal);
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

const createPersonaShares = (cohorts: WorldAudienceCohortState[]): Record<WorldAudiencePersonaId, number> => {
    const peopleByPersona = Object.fromEntries(WORLD_AUDIENCE_PERSONA_IDS.map(id => [id, 0])) as Record<WorldAudiencePersonaId, number>;
    cohorts.forEach(cohort => {
        peopleByPersona[cohort.primaryPersonaId] += cohort.people;
    });
    const total = Object.values(peopleByPersona).reduce((sum, value) => sum + value, 0);
    if (total <= 0) return Object.fromEntries(WORLD_AUDIENCE_PERSONA_IDS.map(id => [id, 0])) as Record<WorldAudiencePersonaId, number>;
    const tenths = distributeInteger(1_000, WORLD_AUDIENCE_PERSONA_IDS.map(id => peopleByPersona[id]));
    return Object.fromEntries(WORLD_AUDIENCE_PERSONA_IDS.map((id, index) => [id, tenths[index] / 10])) as Record<WorldAudiencePersonaId, number>;
};

const commercialShareForIncome = (
    country: WorldPopulationCountryState,
    incomeBandId: WorldPopulationIncomeBandId,
): number => {
    const generalReach = (
        country.urbanPercent
        + Math.max(country.reliableInternetPercent, country.cinemaAccessPercent)
        + country.digitalPaymentAccessPercent
    ) / 300;
    const macro = country.macro;
    return clamp(
        BASE_COMMERCIAL_SHARE[incomeBandId]
        + (generalReach - .5) * .18
        + (macro.consumerConfidence - 50) / 500
        - Math.max(0, macro.inflationPressure - 45) / 700
        - Math.max(0, macro.unemploymentPressure - 45) / 850,
        .05,
        .995,
    );
};

interface DraftCohort extends Omit<WorldAudienceCohortState, 'people' | 'totalMonthlyEntertainmentBudget'> {
    peopleWeight: number;
}

const createCountry = (country: WorldPopulationCountryState): WorldAudienceCountryState => {
    const drafts: DraftCohort[] = [];
    let nonParticipantHouseholds = 0;
    INCOME_BAND_IDS.forEach(incomeBandId => {
        const incomeHouseholds = Math.max(0, Math.round(country.incomeBands[incomeBandId] || 0));
        const commercialHouseholds = Math.min(
            incomeHouseholds,
            Math.max(0, Math.round(incomeHouseholds * commercialShareForIncome(country, incomeBandId))),
        );
        nonParticipantHouseholds += incomeHouseholds - commercialHouseholds;
        const personaIds = INCOME_PERSONAS[incomeBandId];
        const split = clamp(.5 + (stableUnit(`${country.id}:${incomeBandId}:split`) - .5) * .24, .38, .62);
        const householdParts = distributeInteger(commercialHouseholds, [split, 1 - split]);
        personaIds.forEach((personaId, index) => {
            const households = householdParts[index];
            if (households <= 0) return;
            const profile = PERSONA_PROFILES[personaId];
            const priceSensitivityIndex = round1(clamp(
                BASE_PRICE_SENSITIVITY[incomeBandId]
                + Math.max(0, country.macro.inflationPressure - 40) * .28
                + (stableUnit(`${country.id}:${incomeBandId}:${personaId}:price`) - .5) * 8,
                1,
                100,
            ));
            const accessReadinessIndex = round1(clamp(
                country.reliableInternetPercent * .28
                + country.smartphoneAccessPercent * .2
                + country.homeScreenAccessPercent * .14
                + country.digitalPaymentAccessPercent * .18
                + country.cinemaAccessPercent * .2,
                0,
                100,
            ));
            const macroBudgetMultiplier = clamp(
                .72
                + country.macro.consumerConfidence / 220
                - country.macro.inflationPressure / 650
                - country.macro.unemploymentPressure / 780,
                .42,
                1.2,
            );
            const purchasingPowerMultiplier = .42 + country.macro.purchasingPowerIndex / 100 * .94;
            const countryJitter = .92 + stableUnit(`${country.id}:${incomeBandId}:budget`) * .16;
            const budget = round2(clamp(
                BASE_MONTHLY_ENTERTAINMENT_BUDGET[incomeBandId]
                * profile.budgetMultiplier
                * purchasingPowerMultiplier
                * macroBudgetMultiplier
                * countryJitter,
                .25,
                2_500,
            ));
            const householdSizeMultiplier = profile.lifeStageId === 'FAMILY'
                ? 1.28
                : profile.lifeStageId === 'YOUTH'
                    ? 1.12
                    : profile.lifeStageId === 'MATURE' ? .72 : .95;
            const languageLift = clamp((country.languages.length - 1) * 4, 0, 16);
            const localLanguageAffinityIndex = round1(clamp(profile.localAffinity + languageLift, 0, 100));
            const legalConsumptionIndex = round1(clamp(
                35 + country.digitalPaymentAccessPercent * .42 + accessReadinessIndex * .2 - priceSensitivityIndex * .14,
                2,
                99,
            ));
            const sharingTendencyIndex = round1(clamp(
                18 + country.averageHouseholdSize * 8.5 + priceSensitivityIndex * .28 - legalConsumptionIndex * .08,
                2,
                96,
            ));
            const piracyTendencyIndex = round1(clamp(
                12 + priceSensitivityIndex * .48 + (100 - legalConsumptionIndex) * .35 - accessReadinessIndex * .12,
                1,
                98,
            ));
            const adjustedAffinity = profile.affinity.map((value, affinityIndex) => round1(clamp(
                value
                + (affinityIndex === 4 ? languageLift : 0)
                + (stableUnit(`${country.id}:${incomeBandId}:${affinityIndex}:affinity`) - .5) * 8,
                0,
                100,
            ))) as WorldAudiencePersonaAffinity;
            drafts.push({
                id: `${country.id}:${incomeBandId}:${personaId}`,
                primaryPersonaId: personaId,
                incomeBandId,
                lifeStageId: profile.lifeStageId,
                households,
                entertainmentAppetiteIndex: profile.appetite,
                priceSensitivityIndex,
                accessReadinessIndex,
                localLanguageAffinityIndex,
                legalConsumptionIndex,
                sharingTendencyIndex,
                piracyTendencyIndex,
                monthlyEntertainmentBudgetPerHousehold: budget,
                personaAffinity: adjustedAffinity,
                peopleWeight: households * householdSizeMultiplier,
            });
        });
    });

    const commercialHouseholds = drafts.reduce((sum, cohort) => sum + cohort.households, 0);
    const groupHouseholds = [...drafts.map(cohort => cohort.peopleWeight), Math.max(.1, nonParticipantHouseholds * 1.08)];
    const peopleDistribution = distributeInteger(country.population, groupHouseholds);
    const cohorts = drafts.map((draft, index): WorldAudienceCohortState => {
        const { peopleWeight: _peopleWeight, ...cohort } = draft;
        return {
            ...cohort,
            people: peopleDistribution[index],
            totalMonthlyEntertainmentBudget: Math.round(cohort.households * cohort.monthlyEntertainmentBudgetPerHousehold),
        };
    });
    const nonParticipantPopulation = peopleDistribution.at(-1) || 0;
    const commercialPopulation = cohorts.reduce((sum, cohort) => sum + cohort.people, 0);
    const totalMonthlyEntertainmentBudget = cohorts.reduce((sum, cohort) => sum + cohort.totalMonthlyEntertainmentBudget, 0);
    const averageMonthlyEntertainmentBudget = round2(totalMonthlyEntertainmentBudget / Math.max(1, commercialHouseholds));
    return {
        id: country.id,
        population: country.population,
        households: country.households,
        commercialPopulation,
        commercialHouseholds,
        nonParticipantPopulation,
        nonParticipantHouseholds,
        averageMonthlyEntertainmentBudget,
        totalMonthlyEntertainmentBudget,
        budgetPressureIndex: round1(clamp(
            country.macro.inflationPressure * .42
            + country.macro.unemploymentPressure * .34
            + (100 - country.macro.consumerConfidence) * .24,
            0,
            100,
        )),
        personaShares: createPersonaShares(cohorts),
        cohorts,
        lastMacroPeriod: country.lastMacroPeriod,
    };
};

const createGlobalSummary = (countries: Record<string, WorldAudienceCountryState>): WorldAudienceGlobalSummary => {
    const values = Object.values(countries);
    const summary = values.reduce((result, country) => ({
        population: result.population + country.population,
        households: result.households + country.households,
        commercialPopulation: result.commercialPopulation + country.commercialPopulation,
        commercialHouseholds: result.commercialHouseholds + country.commercialHouseholds,
        nonParticipantPopulation: result.nonParticipantPopulation + country.nonParticipantPopulation,
        nonParticipantHouseholds: result.nonParticipantHouseholds + country.nonParticipantHouseholds,
        totalMonthlyEntertainmentBudget: result.totalMonthlyEntertainmentBudget + country.totalMonthlyEntertainmentBudget,
        cohortCount: result.cohortCount + country.cohorts.length,
    }), {
        population: 0,
        households: 0,
        commercialPopulation: 0,
        commercialHouseholds: 0,
        nonParticipantPopulation: 0,
        nonParticipantHouseholds: 0,
        totalMonthlyEntertainmentBudget: 0,
        cohortCount: 0,
    });
    return {
        ...summary,
        averageMonthlyEntertainmentBudget: round2(
            summary.totalMonthlyEntertainmentBudget / Math.max(1, summary.commercialHouseholds),
        ),
        countryCount: values.length,
    };
};

const createSnapshot = (
    absoluteWeek: number,
    global: WorldAudienceGlobalSummary,
): WorldAudienceEconomySnapshot => ({
    absoluteWeek,
    commercialHouseholds: global.commercialHouseholds,
    nonParticipantHouseholds: global.nonParticipantHouseholds,
    averageMonthlyEntertainmentBudget: global.averageMonthlyEntertainmentBudget,
    totalMonthlyEntertainmentBudget: global.totalMonthlyEntertainmentBudget,
});

const buildState = (
    population: WorldPopulationState,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    previousSnapshots: WorldAudienceEconomySnapshot[],
): WorldAudienceEconomyState => {
    const targetWeek = Math.max(population.epochAbsoluteWeek, Math.round(Number(absoluteWeek) || 0));
    const countries = Object.fromEntries(Object.values(population.countries).map(country => [country.id, createCountry(country)]));
    const global = createGlobalSummary(countries);
    return {
        schemaVersion: WORLD_AUDIENCE_ECONOMY_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: targetWeek,
        countries,
        global,
        snapshots: previousSnapshots,
    };
};

export const createWorldAudienceEconomyState = (
    population: WorldPopulationState,
    absoluteWeek: number,
): WorldAudienceEconomyState => {
    const targetWeek = Math.max(population.epochAbsoluteWeek, Math.round(Number(absoluteWeek) || 0));
    const state = buildState(population, targetWeek, targetWeek, []);
    return { ...state, snapshots: [createSnapshot(targetWeek, state.global)] };
};

const isStructurallyUsableState = (input: unknown, population: WorldPopulationState): input is WorldAudienceEconomyState => {
    if (!input || typeof input !== 'object') return false;
    const state = input as Partial<WorldAudienceEconomyState>;
    if (state.schemaVersion !== WORLD_AUDIENCE_ECONOMY_SCHEMA_VERSION) return false;
    if (!Number.isFinite(state.initializedAtAbsoluteWeek) || !Number.isFinite(state.lastProcessedAbsoluteWeek)) return false;
    if (!state.countries || !state.global || !Array.isArray(state.snapshots)) return false;
    const populationCountries = Object.values(population.countries);
    if (Object.keys(state.countries).length !== populationCountries.length) return false;
    const countriesValid = populationCountries.every(canonical => {
        const country = state.countries?.[canonical.id];
        if (!country || !Number.isFinite(country.population) || country.population <= 0) return false;
        if (!Number.isFinite(country.households) || country.households <= 0) return false;
        if (!Array.isArray(country.cohorts) || country.cohorts.length < 1 || country.cohorts.length > 18) return false;
        if (country.cohorts.some(cohort => (
            !cohort.id.startsWith(`${canonical.id}:`)
            || !Number.isFinite(cohort.households) || cohort.households <= 0
            || !Number.isFinite(cohort.people) || cohort.people <= 0
            || !Number.isFinite(cohort.monthlyEntertainmentBudgetPerHousehold) || cohort.monthlyEntertainmentBudgetPerHousehold <= 0
            || !Array.isArray(cohort.personaAffinity) || cohort.personaAffinity.length !== WORLD_AUDIENCE_PERSONA_IDS.length
        ))) return false;
        const cohortHouseholds = country.cohorts.reduce((sum, cohort) => sum + cohort.households, 0);
        const cohortPeople = country.cohorts.reduce((sum, cohort) => sum + cohort.people, 0);
        return cohortHouseholds + country.nonParticipantHouseholds === country.households
            && cohortPeople + country.nonParticipantPopulation === country.population;
    });
    if (!countriesValid) return false;
    const values = Object.values(state.countries);
    return state.global.population === values.reduce((sum, country) => sum + country.population, 0)
        && state.global.households === values.reduce((sum, country) => sum + country.households, 0)
        && state.global.commercialHouseholds + state.global.nonParticipantHouseholds === state.global.households
        && state.global.commercialPopulation + state.global.nonParticipantPopulation === state.global.population;
};

const matchesPopulation = (
    state: WorldAudienceEconomyState,
    population: WorldPopulationState,
): boolean => state.global.population === population.global.population
    && state.global.households === population.global.households
    && Object.values(population.countries).every(country => (
        state.countries[country.id]?.population === country.population
        && state.countries[country.id]?.households === country.households
    ));

export const advanceWorldAudienceEconomyToWeek = (
    input: WorldAudienceEconomyState,
    population: WorldPopulationState,
    absoluteWeek: number,
): WorldAudienceEconomyState => {
    const targetWeek = Math.max(population.epochAbsoluteWeek, Math.round(Number(absoluteWeek) || 0));
    if (!isStructurallyUsableState(input, population)) return createWorldAudienceEconomyState(population, targetWeek);
    if (input.lastProcessedAbsoluteWeek === targetWeek && matchesPopulation(input, population)) return input;
    const crossedYear = Math.floor((targetWeek - population.epochAbsoluteWeek) / 52)
        > Math.floor((input.lastProcessedAbsoluteWeek - population.epochAbsoluteWeek) / 52);
    const rebuilt = buildState(population, targetWeek, input.initializedAtAbsoluteWeek, []);
    const snapshots = crossedYear
        ? [...input.snapshots, createSnapshot(targetWeek, rebuilt.global)].slice(-WORLD_AUDIENCE_MAX_SNAPSHOTS)
        : input.snapshots.slice(-WORLD_AUDIENCE_MAX_SNAPSHOTS);
    return { ...rebuilt, snapshots };
};

export const normalizeWorldAudienceEconomyState = (
    input: unknown,
    population: WorldPopulationState,
    absoluteWeek: number,
): WorldAudienceEconomyState => {
    if (!isStructurallyUsableState(input, population)) return createWorldAudienceEconomyState(population, absoluteWeek);
    return advanceWorldAudienceEconomyToWeek(input, population, absoluteWeek);
};

export const getWorldAudienceCountry = (
    state: WorldAudienceEconomyState | undefined,
    countryId: string,
): WorldAudienceCountryState | null => {
    const id = String(countryId || '').trim().toUpperCase();
    return id && state?.countries[id] ? state.countries[id] : null;
};

export const getWorldAudienceSummary = (
    state: WorldAudienceEconomyState | undefined,
): WorldAudienceGlobalSummary | null => state?.global || null;

export interface WorldAudiencePersonaShare {
    id: WorldAudiencePersonaId;
    people: number;
    sharePercent: number;
    averageMonthlyEntertainmentBudget: number;
}

export const getWorldAudiencePersonaShares = (
    state: WorldAudienceEconomyState,
): WorldAudiencePersonaShare[] => {
    const rows = WORLD_AUDIENCE_PERSONA_IDS.map(id => {
        let people = 0;
        let households = 0;
        let budget = 0;
        Object.values(state.countries).forEach(country => {
            country.cohorts.forEach(cohort => {
                if (cohort.primaryPersonaId !== id) return;
                people += cohort.people;
                households += cohort.households;
                budget += cohort.totalMonthlyEntertainmentBudget;
            });
        });
        return { id, people, households, budget };
    });
    const totalPeople = rows.reduce((sum, row) => sum + row.people, 0);
    const shareTenths = distributeInteger(1_000, rows.map(row => row.people));
    return rows.map((row, index) => ({
        id: row.id,
        people: row.people,
        sharePercent: totalPeople > 0 ? shareTenths[index] / 10 : 0,
        averageMonthlyEntertainmentBudget: round2(row.budget / Math.max(1, row.households)),
    }));
};
