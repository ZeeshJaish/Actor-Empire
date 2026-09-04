import type {
    NPCStudioState,
    StudioAiCapacityState,
    StudioAiCompetence,
    StudioAiLaunchClass,
    StudioAiOrigin,
    StudioAiProfile,
    StudioAiStrategy,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { STUDIO_CATALOG } from '../studioLogic';

const clamp = (value: number, min = 1, max = 100): number => Math.max(min, Math.min(max, Math.round(value)));

const getScale = (studio: NPCStudioState): 1 | 2 | 3 | 4 => {
    if (studio.valuation >= 40) return 4;
    if (studio.valuation >= 10) return 3;
    if (studio.valuation >= 1) return 2;
    return 1;
};

export const getStudioAiOrigin = (studio: NPCStudioState): StudioAiOrigin => {
    if (studio.isNpcVenture) return 'GENERATED';
    if (STUDIO_CATALOG[studio.id]) return STUDIO_CATALOG[studio.id].archetype === 'PLATFORM' ? 'PLATFORM_OWNED' : 'ESTABLISHED';
    return 'REGIONAL';
};

const getStrategy = (studio: NPCStudioState): StudioAiStrategy => {
    const archetype = String(studio.archetype || '').toUpperCase();
    if (/PRESTIGE|AWARD/.test(archetype)) return 'PRESTIGE';
    if (/FRANCHISE|UNIVERSE/.test(archetype)) return 'FRANCHISE';
    if (/GENRE/.test(archetype)) return 'GENRE_SPECIALIST';
    if (/CREATOR/.test(archetype)) return 'CREATOR_LED';
    if (/COMMERCIAL|PLATFORM/.test(archetype)) return 'COMMERCIAL';
    return 'BALANCED';
};

const getLaunchClass = (studio: NPCStudioState, origin: StudioAiOrigin, roll: number): StudioAiLaunchClass => {
    if (origin === 'ESTABLISHED' || origin === 'PLATFORM_OWNED') {
        return studio.valuation >= 10 ? 'ESTABLISHED_MAJOR' : 'ESTABLISHED_LABEL';
    }
    if (origin !== 'GENERATED') return studio.valuation >= 1 ? 'BREAKOUT_COMPANY' : 'BOOTSTRAPPED_BOUTIQUE';
    if (studio.valuation >= 2 || studio.cashReserve >= 500) return 'MAJOR_CHALLENGER';
    if (studio.cashReserve >= 220) return roll > 0.55 ? 'STRATEGIC_SPINOUT' : 'INVESTOR_BACKED';
    if (studio.reputation >= 70) return 'BREAKOUT_COMPANY';
    if (studio.cashReserve >= 70) return 'FOUNDER_BACKED';
    return 'BOOTSTRAPPED_BOUTIQUE';
};

export interface StudioAiSeedProfile {
    origin: StudioAiOrigin;
    profile: StudioAiProfile;
    competence: StudioAiCompetence;
    capacity: StudioAiCapacityState;
    weeklyOperatingCostMillions: number;
}

export const getStudioAiProfileSeed = (studio: NPCStudioState): StudioAiSeedProfile => {
    const rng = createDeterministicRng(`studio-ai-profile:v1:${studio.id}`);
    const origin = getStudioAiOrigin(studio);
    const scale = getScale(studio);
    const strategy = getStrategy(studio);
    const maturityBase = 34 + scale * 12 + Math.min(14, Math.max(0, studio.reputation - 50) * 0.22);
    const variance = () => (rng() - 0.5) * 12;
    const strategyLift = (target: StudioAiStrategy, value = 8) => strategy === target ? value : 0;
    const competence: StudioAiCompetence = {
        development: clamp(maturityBase + variance() + strategyLift('PRESTIGE', 7)),
        creative: clamp(maturityBase + variance() + strategyLift('PRESTIGE', 10) + strategyLift('CREATOR_LED', 8)),
        finance: clamp(maturityBase + variance() + strategyLift('COMMERCIAL', 7)),
        production: clamp(maturityBase + variance() + scale * 2),
        marketing: clamp(maturityBase + variance() + strategyLift('COMMERCIAL', 9)),
        distribution: clamp(maturityBase + variance() + scale * 4),
        negotiation: clamp(maturityBase + variance() + strategyLift('COMMERCIAL', 5)),
        talentRelations: clamp(maturityBase + variance() + strategyLift('PRESTIGE', 5) + strategyLift('CREATOR_LED', 7)),
    };
    const profile: StudioAiProfile = {
        strategy,
        launchClass: getLaunchClass(studio, origin, rng()),
        riskTolerance: clamp(35 + rng() * 45 + (strategy === 'COMMERCIAL' ? 8 : 0)),
        budgetAppetite: clamp(28 + scale * 13 + rng() * 16),
        creativePatience: clamp(35 + rng() * 35 + (strategy === 'PRESTIGE' ? 18 : 0)),
        franchiseDependence: clamp(20 + rng() * 35 + (strategy === 'FRANCHISE' ? 35 : 0)),
        prestigeAmbition: clamp(25 + rng() * 35 + (strategy === 'PRESTIGE' ? 32 : 0)),
        financialDiscipline: clamp(38 + rng() * 42 + (strategy === 'COMMERCIAL' ? 8 : 0)),
    };
    return {
        origin,
        profile,
        competence,
        capacity: {
            developmentSlots: 1 + scale * 2,
            productionSlots: scale,
            releaseSlotsPerQuarter: 1 + scale,
            committedDevelopmentSlots: 0,
            committedProductionSlots: 0,
        },
        weeklyOperatingCostMillions: Math.round((0.18 + scale * 0.22 + Math.sqrt(Math.max(0.01, studio.valuation)) * 0.08) * 100) / 100,
    };
};
