import type {
    WorldCountryDevelopmentProfile,
    WorldPopulationAgeBandId,
    WorldPopulationCountryState,
    WorldPopulationGlobalSummary,
    WorldPopulationIncomeBandId,
    WorldPopulationRegionId,
    WorldPopulationRegionSummary,
    WorldPopulationSnapshot,
    WorldPopulationState,
} from '../../types';
import {
    WORLD_COUNTRY_DEFINITIONS,
    WORLD_COUNTRY_DEFINITIONS_BY_ID,
    type WorldCountryDefinition,
} from './worldCountryRegistry';

export const WORLD_POPULATION_SCHEMA_VERSION = 1 as const;
export const WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK = 728;
const WORLD_POPULATION_MAX_SNAPSHOTS = 32;

const REGION_IDS: WorldPopulationRegionId[] = [
    'NORTH_AMERICA',
    'SOUTH_AMERICA',
    'EUROPE',
    'AFRICA',
    'ASIA',
    'OCEANIA',
];

interface DevelopmentProfile {
    householdSize: number;
    ageShares: Record<WorldPopulationAgeBandId, number>;
    incomeShares: Record<WorldPopulationIncomeBandId, number>;
    urbanPercent: number;
    reliableInternetPercent: number;
    smartphoneAccessPercent: number;
    homeScreenAccessPercent: number;
    digitalPaymentAccessPercent: number;
    cinemaAccessPercent: number;
    purchasingPowerIndex: number;
    inflationPressure: number;
    unemploymentPressure: number;
    consumerConfidence: number;
    inequalityIndex: number;
    initialGrowthPercent: number;
    longTermGrowthPercent: number;
    transitionYears: number;
}

const DEVELOPMENT_PROFILES: Record<WorldCountryDevelopmentProfile, DevelopmentProfile> = {
    LOW: {
        householdSize: 4.8,
        ageShares: { CHILD: .31, TEEN: .12, YOUNG_ADULT: .27, ADULT: .22, OLDER: .08 },
        incomeShares: { SUBSISTENCE: .46, WORKING: .35, MIDDLE: .14, AFFLUENT: .04, WEALTHY: .009, ULTRA_WEALTHY: .001 },
        urbanPercent: 38,
        reliableInternetPercent: 28,
        smartphoneAccessPercent: 49,
        homeScreenAccessPercent: 24,
        digitalPaymentAccessPercent: 19,
        cinemaAccessPercent: 21,
        purchasingPowerIndex: 27,
        inflationPressure: 57,
        unemploymentPressure: 54,
        consumerConfidence: 49,
        inequalityIndex: 63,
        initialGrowthPercent: 2.2,
        longTermGrowthPercent: -.15,
        transitionYears: 72,
    },
    EMERGING: {
        householdSize: 3.8,
        ageShares: { CHILD: .24, TEEN: .10, YOUNG_ADULT: .29, ADULT: .27, OLDER: .10 },
        incomeShares: { SUBSISTENCE: .22, WORKING: .40, MIDDLE: .27, AFFLUENT: .085, WEALTHY: .023, ULTRA_WEALTHY: .002 },
        urbanPercent: 57,
        reliableInternetPercent: 53,
        smartphoneAccessPercent: 71,
        homeScreenAccessPercent: 47,
        digitalPaymentAccessPercent: 48,
        cinemaAccessPercent: 43,
        purchasingPowerIndex: 47,
        inflationPressure: 48,
        unemploymentPressure: 46,
        consumerConfidence: 55,
        inequalityIndex: 57,
        initialGrowthPercent: 1.15,
        longTermGrowthPercent: -.2,
        transitionYears: 62,
    },
    DEVELOPED: {
        householdSize: 2.75,
        ageShares: { CHILD: .18, TEEN: .07, YOUNG_ADULT: .24, ADULT: .32, OLDER: .19 },
        incomeShares: { SUBSISTENCE: .07, WORKING: .31, MIDDLE: .39, AFFLUENT: .17, WEALTHY: .055, ULTRA_WEALTHY: .005 },
        urbanPercent: 75,
        reliableInternetPercent: 78,
        smartphoneAccessPercent: 86,
        homeScreenAccessPercent: 76,
        digitalPaymentAccessPercent: 79,
        cinemaAccessPercent: 68,
        purchasingPowerIndex: 70,
        inflationPressure: 36,
        unemploymentPressure: 35,
        consumerConfidence: 60,
        inequalityIndex: 45,
        initialGrowthPercent: .35,
        longTermGrowthPercent: -.3,
        transitionYears: 48,
    },
    ADVANCED: {
        householdSize: 2.35,
        ageShares: { CHILD: .15, TEEN: .06, YOUNG_ADULT: .21, ADULT: .34, OLDER: .24 },
        incomeShares: { SUBSISTENCE: .035, WORKING: .22, MIDDLE: .43, AFFLUENT: .225, WEALTHY: .08, ULTRA_WEALTHY: .01 },
        urbanPercent: 84,
        reliableInternetPercent: 91,
        smartphoneAccessPercent: 94,
        homeScreenAccessPercent: 89,
        digitalPaymentAccessPercent: 92,
        cinemaAccessPercent: 79,
        purchasingPowerIndex: 88,
        inflationPressure: 27,
        unemploymentPressure: 27,
        consumerConfidence: 64,
        inequalityIndex: 38,
        initialGrowthPercent: -.08,
        longTermGrowthPercent: -.38,
        transitionYears: 42,
    },
};

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

const round1 = (value: number): number => Math.round(value * 10) / 10;

const stableUnit = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0xffffffff;
};

const distributeInteger = <T extends string>(
    total: number,
    shares: Record<T, number>,
): Record<T, number> => {
    const keys = Object.keys(shares) as T[];
    const safeTotal = Math.max(0, Math.round(total));
    const positiveShares = keys.map(key => Math.max(0, Number(shares[key]) || 0));
    const shareTotal = positiveShares.reduce((sum, share) => sum + share, 0) || 1;
    const exact = positiveShares.map(share => safeTotal * share / shareTotal);
    const values = exact.map(value => Math.floor(value));
    let remaining = safeTotal - values.reduce((sum, value) => sum + value, 0);
    const order = exact
        .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
    for (let index = 0; index < remaining; index += 1) values[order[index % order.length].index] += 1;
    return Object.fromEntries(keys.map((key, index) => [key, values[index]])) as Record<T, number>;
};

const projectPopulation = (definition: WorldCountryDefinition, years: number): {
    population: number;
    annualGrowthPercent: number;
} => {
    const profile = DEVELOPMENT_PROFILES[definition.developmentProfile];
    const countryShift = (stableUnit(`${definition.id}:growth`) - .5) * .28;
    let initialGrowth = profile.initialGrowthPercent + countryShift;
    let longTermGrowth = profile.longTermGrowthPercent + countryShift * .25;
    if (definition.id === 'JP') {
        initialGrowth = -.52;
        longTermGrowth = -.58;
    } else if (definition.id === 'NG') {
        initialGrowth = 2.45;
        longTermGrowth = -.08;
    }
    const transitionYears = profile.transitionYears;
    const transition = 1 - Math.exp(-Math.max(0, years) / transitionYears);
    const annualGrowthPercent = initialGrowth + (longTermGrowth - initialGrowth) * transition;
    const accumulatedGrowth = longTermGrowth * years
        + (initialGrowth - longTermGrowth) * transitionYears * transition;
    const population = definition.baselinePopulation * Math.exp(accumulatedGrowth / 100);
    return {
        population: Math.max(1, Math.round(population)),
        annualGrowthPercent: round1(clamp(annualGrowthPercent, -1.2, 3.2)),
    };
};

const shiftAgeShares = (
    profile: DevelopmentProfile,
    years: number,
): Record<WorldPopulationAgeBandId, number> => {
    const ageing = clamp(1 - Math.exp(-Math.max(0, years) / 90), 0, 1);
    return {
        CHILD: profile.ageShares.CHILD * (1 - ageing * .34),
        TEEN: profile.ageShares.TEEN * (1 - ageing * .24),
        YOUNG_ADULT: profile.ageShares.YOUNG_ADULT * (1 - ageing * .13),
        ADULT: profile.ageShares.ADULT * (1 + ageing * .08),
        OLDER: profile.ageShares.OLDER * (1 + ageing * 1.15),
    };
};

const shiftIncomeShares = (
    profile: DevelopmentProfile,
    years: number,
): Record<WorldPopulationIncomeBandId, number> => {
    const development = clamp(1 - Math.exp(-Math.max(0, years) / 115), 0, .82);
    return {
        SUBSISTENCE: profile.incomeShares.SUBSISTENCE * (1 - development * .72),
        WORKING: profile.incomeShares.WORKING * (1 - development * .26),
        MIDDLE: profile.incomeShares.MIDDLE * (1 + development * .44),
        AFFLUENT: profile.incomeShares.AFFLUENT * (1 + development * .78),
        WEALTHY: profile.incomeShares.WEALTHY * (1 + development * .92),
        ULTRA_WEALTHY: profile.incomeShares.ULTRA_WEALTHY * (1 + development * 1.05),
    };
};

const projectCountry = (
    definition: WorldCountryDefinition,
    absoluteWeek: number,
): WorldPopulationCountryState => {
    const years = Math.max(0, (absoluteWeek - WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK) / 52);
    const demographicYear = Math.max(0, Math.floor(years));
    const macroPeriod = Math.max(0, Math.floor((absoluteWeek - WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK) / 13));
    const profile = DEVELOPMENT_PROFILES[definition.developmentProfile];
    const jitter = (stableUnit(`${definition.id}:profile`) - .5) * 8;
    const progress = clamp(1 - Math.exp(-years / 85), 0, 1);
    const projected = projectPopulation(definition, years);
    const householdSize = clamp(profile.householdSize - progress * (profile.householdSize - 2.15), 1.8, 5.5);
    const households = Math.max(1, Math.round(projected.population / householdSize));
    const periodicWave = Math.sin((macroPeriod + stableUnit(definition.id) * 12) / 7) * 2.2;
    const accessGain = progress * (100 - profile.reliableInternetPercent) * .72;
    return {
        id: definition.id,
        name: definition.name,
        regionId: definition.regionId,
        developmentProfile: definition.developmentProfile,
        languages: [...definition.languages],
        population: projected.population,
        households,
        averageHouseholdSize: round1(projected.population / households),
        ageBands: distributeInteger(projected.population, shiftAgeShares(profile, years)),
        incomeBands: distributeInteger(households, shiftIncomeShares(profile, years)),
        urbanPercent: round1(clamp(profile.urbanPercent + progress * (96 - profile.urbanPercent) * .62 + jitter * .25, 8, 98)),
        reliableInternetPercent: round1(clamp(profile.reliableInternetPercent + accessGain + jitter * .3, 3, 99)),
        smartphoneAccessPercent: round1(clamp(profile.smartphoneAccessPercent + progress * (99 - profile.smartphoneAccessPercent) * .76 + jitter * .25, 4, 99)),
        homeScreenAccessPercent: round1(clamp(profile.homeScreenAccessPercent + progress * (96 - profile.homeScreenAccessPercent) * .58 + jitter * .35, 3, 98)),
        digitalPaymentAccessPercent: round1(clamp(profile.digitalPaymentAccessPercent + progress * (98 - profile.digitalPaymentAccessPercent) * .74 + jitter * .3, 2, 99)),
        cinemaAccessPercent: round1(clamp(profile.cinemaAccessPercent + progress * (88 - profile.cinemaAccessPercent) * .55 + jitter * .32, 2, 96)),
        macro: {
            purchasingPowerIndex: round1(clamp(profile.purchasingPowerIndex + progress * (92 - profile.purchasingPowerIndex) * .62 + periodicWave + jitter * .2, 5, 100)),
            inflationPressure: round1(clamp(profile.inflationPressure - progress * 12 + periodicWave * 1.5 - jitter * .1, 5, 95)),
            unemploymentPressure: round1(clamp(profile.unemploymentPressure - progress * 9 - periodicWave * .6 + jitter * .15, 5, 90)),
            consumerConfidence: round1(clamp(profile.consumerConfidence + progress * 8 + periodicWave * 1.8 + jitter * .15, 5, 95)),
            inequalityIndex: round1(clamp(profile.inequalityIndex - progress * 7 + jitter * .3, 10, 90)),
            annualPopulationGrowthPercent: projected.annualGrowthPercent,
        },
        lastDemographicYear: demographicYear,
        lastMacroPeriod: macroPeriod,
    };
};

const buildSummaries = (countries: Record<string, WorldPopulationCountryState>): {
    regions: Record<WorldPopulationRegionId, WorldPopulationRegionSummary>;
    global: WorldPopulationGlobalSummary;
} => {
    const regions = Object.fromEntries(REGION_IDS.map(id => [id, {
        id,
        population: 0,
        households: 0,
        countryCount: 0,
    }])) as Record<WorldPopulationRegionId, WorldPopulationRegionSummary>;
    let population = 0;
    let households = 0;
    let weightedUrban = 0;
    let weightedInternet = 0;
    let weightedPayments = 0;
    let weightedCinema = 0;
    Object.values(countries).forEach(country => {
        const region = regions[country.regionId];
        region.population += country.population;
        region.households += country.households;
        region.countryCount += 1;
        population += country.population;
        households += country.households;
        weightedUrban += country.population * country.urbanPercent;
        weightedInternet += country.population * country.reliableInternetPercent;
        weightedPayments += country.population * country.digitalPaymentAccessPercent;
        weightedCinema += country.population * country.cinemaAccessPercent;
    });
    return {
        regions,
        global: {
            population,
            households,
            countryCount: Object.keys(countries).length,
            weightedUrbanPercent: round1(weightedUrban / Math.max(1, population)),
            weightedReliableInternetPercent: round1(weightedInternet / Math.max(1, population)),
            weightedDigitalPaymentAccessPercent: round1(weightedPayments / Math.max(1, population)),
            weightedCinemaAccessPercent: round1(weightedCinema / Math.max(1, population)),
        },
    };
};

const createSnapshot = (
    absoluteWeek: number,
    countries: Record<string, WorldPopulationCountryState>,
    global: WorldPopulationGlobalSummary,
): WorldPopulationSnapshot => {
    let purchasingPower = 0;
    let confidence = 0;
    Object.values(countries).forEach(country => {
        purchasingPower += country.population * country.macro.purchasingPowerIndex;
        confidence += country.population * country.macro.consumerConfidence;
    });
    return {
        absoluteWeek,
        population: global.population,
        households: global.households,
        weightedPurchasingPowerIndex: round1(purchasingPower / Math.max(1, global.population)),
        weightedConsumerConfidence: round1(confidence / Math.max(1, global.population)),
    };
};

export const createWorldPopulationState = (absoluteWeek: number): WorldPopulationState => {
    const targetWeek = Math.max(WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK, Math.round(Number(absoluteWeek) || 0));
    const countries = Object.fromEntries(WORLD_COUNTRY_DEFINITIONS.map(definition => [
        definition.id,
        projectCountry(definition, targetWeek),
    ]));
    const { regions, global } = buildSummaries(countries);
    return {
        schemaVersion: WORLD_POPULATION_SCHEMA_VERSION,
        epochAbsoluteWeek: WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK,
        initializedAtAbsoluteWeek: targetWeek,
        lastProcessedAbsoluteWeek: targetWeek,
        countries,
        regions,
        global,
        snapshots: [createSnapshot(targetWeek, countries, global)],
    };
};

const isUsableState = (input: unknown): input is WorldPopulationState => {
    if (!input || typeof input !== 'object') return false;
    const state = input as Partial<WorldPopulationState>;
    if (state.schemaVersion !== WORLD_POPULATION_SCHEMA_VERSION) return false;
    if (!Number.isFinite(state.initializedAtAbsoluteWeek) || !Number.isFinite(state.lastProcessedAbsoluteWeek)) return false;
    if (!state.countries || Object.keys(state.countries).length !== WORLD_COUNTRY_DEFINITIONS.length) return false;
    const countriesAreValid = WORLD_COUNTRY_DEFINITIONS.every(definition => {
        const country = state.countries?.[definition.id];
        if (!country || !Number.isFinite(country.population) || country.population <= 0) return false;
        if (!Number.isFinite(country.households) || country.households <= 0) return false;
        const ageValues = Object.values(country.ageBands || {});
        const incomeValues = Object.values(country.incomeBands || {});
        if (ageValues.length !== 5 || incomeValues.length !== 6) return false;
        if (ageValues.some(value => !Number.isFinite(value) || value < 0)) return false;
        if (incomeValues.some(value => !Number.isFinite(value) || value < 0)) return false;
        if (ageValues.reduce((sum, value) => sum + value, 0) !== country.population) return false;
        if (incomeValues.reduce((sum, value) => sum + value, 0) !== country.households) return false;
        const percentages = [
            country.urbanPercent,
            country.reliableInternetPercent,
            country.smartphoneAccessPercent,
            country.homeScreenAccessPercent,
            country.digitalPaymentAccessPercent,
            country.cinemaAccessPercent,
            country.macro?.inflationPressure,
            country.macro?.unemploymentPressure,
            country.macro?.consumerConfidence,
            country.macro?.inequalityIndex,
        ];
        return percentages.every(value => Number.isFinite(value) && value >= 0 && value <= 100);
    });
    if (!countriesAreValid || !state.global || !state.regions) return false;
    const countryPopulation = Object.values(state.countries).reduce((sum, country) => sum + country.population, 0);
    const countryHouseholds = Object.values(state.countries).reduce((sum, country) => sum + country.households, 0);
    const regionPopulation = REGION_IDS.reduce((sum, regionId) => sum + Number(state.regions?.[regionId]?.population || 0), 0);
    return state.global.population === countryPopulation
        && state.global.households === countryHouseholds
        && state.global.countryCount === WORLD_COUNTRY_DEFINITIONS.length
        && regionPopulation === countryPopulation;
};

export const advanceWorldPopulationToWeek = (
    input: WorldPopulationState,
    absoluteWeek: number,
): WorldPopulationState => {
    const targetWeek = Math.max(WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK, Math.round(Number(absoluteWeek) || 0));
    if (!isUsableState(input)) return createWorldPopulationState(targetWeek);
    if (targetWeek <= input.lastProcessedAbsoluteWeek) return input;
    const countries = Object.fromEntries(WORLD_COUNTRY_DEFINITIONS.map(definition => [
        definition.id,
        projectCountry(definition, targetWeek),
    ]));
    const { regions, global } = buildSummaries(countries);
    const crossedYear = Math.floor((targetWeek - WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK) / 52)
        > Math.floor((input.lastProcessedAbsoluteWeek - WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK) / 52);
    const snapshots = crossedYear
        ? [...(Array.isArray(input.snapshots) ? input.snapshots : []), createSnapshot(targetWeek, countries, global)]
            .slice(-WORLD_POPULATION_MAX_SNAPSHOTS)
        : Array.isArray(input.snapshots) ? input.snapshots.slice(-WORLD_POPULATION_MAX_SNAPSHOTS) : [];
    return {
        schemaVersion: WORLD_POPULATION_SCHEMA_VERSION,
        epochAbsoluteWeek: WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK,
        initializedAtAbsoluteWeek: Math.max(WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK, Math.round(input.initializedAtAbsoluteWeek)),
        lastProcessedAbsoluteWeek: targetWeek,
        countries,
        regions,
        global,
        snapshots,
    };
};

export const normalizeWorldPopulationState = (
    input: unknown,
    absoluteWeek: number,
): WorldPopulationState => {
    const targetWeek = Math.max(WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK, Math.round(Number(absoluteWeek) || 0));
    if (!isUsableState(input)) return createWorldPopulationState(targetWeek);
    return advanceWorldPopulationToWeek(input, targetWeek);
};

export const getWorldPopulationCountry = (
    state: WorldPopulationState | undefined,
    countryId: string,
): WorldPopulationCountryState | null => {
    const normalizedId = String(countryId || '').trim().toUpperCase();
    if (!normalizedId || !WORLD_COUNTRY_DEFINITIONS_BY_ID[normalizedId]) return null;
    return state?.countries?.[normalizedId] || null;
};

export const getWorldPopulationSummary = (
    state: WorldPopulationState,
): WorldPopulationGlobalSummary => state.global;
