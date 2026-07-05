import { Player, PlayerAssetState, Property } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

export type RealEstateMarketCycle = 'SLUMP' | 'COOLING' | 'STABLE' | 'GROWTH' | 'BOOM';
export type RealEstateNeighborhoodTier = 'EMERGING' | 'SOLID' | 'PRIME' | 'TROPHY' | 'ULTRA';

export interface RealEstateMarketSnapshot {
    cycle: RealEstateMarketCycle;
    cycleLabel: string;
    neighborhoodTier: RealEstateNeighborhoodTier;
    neighborhoodLabel: string;
    rentDemand: number;
    vacancyChance: number;
    appreciationBias: number;
    marketMove: number;
    marketNote: string;
}

const cycleLabels: Record<RealEstateMarketCycle, string> = {
    SLUMP: 'Slump',
    COOLING: 'Cooling',
    STABLE: 'Stable',
    GROWTH: 'Growth',
    BOOM: 'Boom',
};

const tierLabels: Record<RealEstateNeighborhoodTier, string> = {
    EMERGING: 'Emerging',
    SOLID: 'Solid',
    PRIME: 'Prime',
    TROPHY: 'Trophy',
    ULTRA: 'Ultra Luxury',
};

const cycleValueMove: Record<RealEstateMarketCycle, number> = {
    SLUMP: -0.0018,
    COOLING: -0.00055,
    STABLE: 0.00035,
    GROWTH: 0.00115,
    BOOM: 0.00215,
};

const cycleRentDemand: Record<RealEstateMarketCycle, number> = {
    SLUMP: -12,
    COOLING: -5,
    STABLE: 0,
    GROWTH: 5,
    BOOM: 10,
};

const tierAppreciation: Record<RealEstateNeighborhoodTier, number> = {
    EMERGING: 0.00005,
    SOLID: 0.00025,
    PRIME: 0.0007,
    TROPHY: 0.00105,
    ULTRA: 0.0014,
};

const tierBaseDemand: Record<RealEstateNeighborhoodTier, number> = {
    EMERGING: 48,
    SOLID: 58,
    PRIME: 69,
    TROPHY: 76,
    ULTRA: 82,
};

const tierVacancyBase: Record<RealEstateNeighborhoodTier, number> = {
    EMERGING: 0.16,
    SOLID: 0.12,
    PRIME: 0.085,
    TROPHY: 0.105,
    ULTRA: 0.13,
};

const tierRentYield: Record<RealEstateNeighborhoodTier, number> = {
    EMERGING: 0.00108,
    SOLID: 0.00094,
    PRIME: 0.00078,
    TROPHY: 0.00062,
    ULTRA: 0.00044,
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const clampRate = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const getPropertySearchText = (property: Property) => `${property.name} ${property.location || ''} ${property.address || ''}`.toLowerCase();

export const getPropertyNeighborhoodTier = (property: Property): RealEstateNeighborhoodTier => {
    const text = getPropertySearchText(property);
    if (property.price >= 120_000_000 || /bel air|monaco|private island|central park tower|mayfair|royal atlantis|château|chateau|necker/.test(text)) return 'ULTRA';
    if (property.price >= 25_000_000 || /beverly|malibu|tribeca|palm jumeirah|aspen|eiffel|harbour|tour odéon|odeon/.test(text)) return 'TROPHY';
    if (property.price >= 5_000_000 || /hollywood hills|london|tokyo|seoul|sydney|dubai|miami|paris|manhattan|notting hill/.test(text)) return 'PRIME';
    if (property.price >= 1_000_000 || /venice|atlanta|austin|nashville|lisbon|marrakech|iceland|brooklyn/.test(text)) return 'SOLID';
    return 'EMERGING';
};

export const getRealEstateMarketCycle = (age?: number, currentWeek?: number): RealEstateMarketCycle => {
    const absoluteWeek = getAbsoluteWeek(age || 18, currentWeek || 1);
    const wave = Math.sin(absoluteWeek / 27) + Math.sin(absoluteWeek / 71) * 0.55 + Math.cos(absoluteWeek / 19) * 0.25;
    if (wave <= -1.05) return 'SLUMP';
    if (wave <= -0.38) return 'COOLING';
    if (wave >= 1.05) return 'BOOM';
    if (wave >= 0.38) return 'GROWTH';
    return 'STABLE';
};

export const getRealEstateMarketSnapshot = (
    property: Property,
    state?: Partial<PlayerAssetState>,
    player?: Pick<Player, 'age' | 'currentWeek' | 'stats'>,
): RealEstateMarketSnapshot => {
    const cycle = getRealEstateMarketCycle(player?.age, player?.currentWeek);
    const tier = getPropertyNeighborhoodTier(property);
    const condition = clamp(Number(state?.condition ?? 100), 25, 100);
    const upgradeCount = Array.isArray(property.customizations) ? property.customizations.length : 0;
    const fameDemand = Math.min(5, Math.max(0, Number(player?.stats?.fame || 0) / 18));
    const conditionDemand = (condition - 82) / 6;
    const upgradeDemand = Math.min(7, upgradeCount * 1.5);
    const rentDemand = Math.round(clamp(tierBaseDemand[tier] + cycleRentDemand[cycle] + fameDemand + conditionDemand + upgradeDemand, 8, 98));
    const vacancyChance = clampRate(
        tierVacancyBase[tier]
        + (cycle === 'SLUMP' ? 0.045 : cycle === 'COOLING' ? 0.018 : cycle === 'BOOM' ? -0.018 : 0)
        - (rentDemand - 55) * 0.0015
        + Math.max(0, 70 - condition) * 0.0018
        - Math.min(0.025, upgradeCount * 0.004),
        0.015,
        0.38,
    );
    const appreciationBias = tierAppreciation[tier] + Math.min(0.0014, upgradeCount * 0.00028);
    const marketMove = cycleValueMove[cycle] + appreciationBias;
    const marketNote = `${cycleLabels[cycle]} market in a ${tierLabels[tier].toLowerCase()} area. Demand ${rentDemand}/100, vacancy risk ${Math.round(vacancyChance * 100)}%.`;
    return {
        cycle,
        cycleLabel: cycleLabels[cycle],
        neighborhoodTier: tier,
        neighborhoodLabel: tierLabels[tier],
        rentDemand,
        vacancyChance,
        appreciationBias,
        marketMove,
        marketNote,
    };
};

export const quoteRealEstateWeeklyRent = (
    property: Property,
    state?: Partial<PlayerAssetState>,
    player?: Pick<Player, 'age' | 'currentWeek' | 'stats'>,
): number => {
    const snapshot = getRealEstateMarketSnapshot(property, state, player);
    const condition = clamp(Number(state?.condition ?? 100), 25, 100);
    const currentValue = Math.max(property.price, Math.round(Number(state?.currentValue || property.price)));
    const demandMultiplier = 0.72 + snapshot.rentDemand / 150;
    const conditionMultiplier = 0.62 + condition / 260;
    const fameMultiplier = 1 + Math.min(0.18, Math.max(0, Number(player?.stats?.fame || 0)) / 480);
    const upgradeMultiplier = 1 + Math.min(0.22, (property.customizations?.length || 0) * 0.045);
    const baseYieldRent = currentValue * tierRentYield[snapshot.neighborhoodTier];
    const expenseFloor = property.weeklyExpense * (snapshot.neighborhoodTier === 'ULTRA' ? 1.08 : 1.35);
    const rent = Math.max(expenseFloor, baseYieldRent) * demandMultiplier * conditionMultiplier * fameMultiplier * upgradeMultiplier;
    return Math.max(100, Math.round(rent / 50) * 50);
};

export const calculateRealEstateValueUpdate = (
    property: Property,
    state: PlayerAssetState,
    player: Pick<Player, 'age' | 'currentWeek' | 'stats'>,
): { nextValue: number; valueTrend: number; snapshot: RealEstateMarketSnapshot } => {
    const snapshot = getRealEstateMarketSnapshot(property, state, player);
    const baseValue = Math.max(0, Math.round(Number(property.price || 0)));
    const previousValue = Math.max(baseValue, Math.round(Number(state.currentValue || baseValue)));
    const condition = clamp(Number(state.condition ?? 100), 25, 100);
    const conditionDrag = -Math.max(0, 90 - condition) * 0.000075;
    const rentalDrag = state.rentalListed ? -0.00032 : 0;
    const marketNoise = (Math.random() - 0.48) * 0.0036;
    const weeklyMove = clampRate(snapshot.marketMove + conditionDrag + rentalDrag + marketNoise, -0.012, 0.014);
    const upperCap = snapshot.neighborhoodTier === 'ULTRA' ? 3.35 : snapshot.neighborhoodTier === 'TROPHY' ? 2.85 : snapshot.neighborhoodTier === 'PRIME' ? 2.35 : 1.95;
    const lowerCap = snapshot.neighborhoodTier === 'EMERGING' ? 0.48 : 0.55;
    const nextValue = Math.round(Math.max(baseValue * lowerCap, Math.min(baseValue * upperCap, previousValue * (1 + weeklyMove))));
    const valueTrend = Math.round(((nextValue - previousValue) / Math.max(1, previousValue)) * 1000) / 10;
    return { nextValue, valueTrend, snapshot };
};

export const getRealEstateInvestorIdentity = (properties: Property[], totalValue: number): string => {
    if (properties.length >= 8 || totalValue >= 300_000_000) return 'Real Estate Mogul';
    if (properties.length >= 5 || totalValue >= 80_000_000) return 'Property Investor';
    if (properties.length >= 3 || totalValue >= 15_000_000) return 'Portfolio Builder';
    if (properties.length >= 1) return 'Home Owner';
    return 'No Portfolio';
};
