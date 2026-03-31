import { Studio, StudioId, StudioArchetype, BudgetTier, Player } from '../types';

export const STUDIO_CATALOG: Record<StudioId, Studio> = {
    PARAMOUNT: {
        id: 'PARAMOUNT', name: 'Paramount Pictures', archetype: 'LEGACY',
        valuation: 22, // Billion
        castingBias: { reputation: 1.2, followers: 0.8, experience: 1.1 },
        qualityBias: { script: 1.0, hype: 1.0, distribution: 1.2 },
        payMultiplier: 1.1, budgetComfort: ['MID', 'HIGH'],
    },
    WARNER_BROS: {
        id: 'WARNER_BROS', name: 'Warner Bros.', archetype: 'LEGACY',
        valuation: 74, // Billion
        castingBias: { reputation: 1.3, followers: 0.9, experience: 1.0 },
        qualityBias: { script: 1.0, hype: 1.1, distribution: 1.3 },
        payMultiplier: 1.2, budgetComfort: ['MID', 'HIGH'],
    },
    UNIVERSAL: {
        id: 'UNIVERSAL', name: 'Universal Pictures', archetype: 'LEGACY',
        valuation: 65, // Billion
        castingBias: { reputation: 1.1, followers: 1.0, experience: 1.1 },
        qualityBias: { script: 1.1, hype: 1.1, distribution: 1.1 },
        payMultiplier: 1.0, budgetComfort: ['LOW', 'MID', 'HIGH'],
    },
    ARTISAN_PICTURES: {
        id: 'ARTISAN_PICTURES', name: 'Artisan Pictures', archetype: 'PRESTIGE',
        valuation: 3, // Billion (Indie/A24 style)
        castingBias: { reputation: 1.1, followers: 0.6, experience: 1.3 },
        qualityBias: { script: 1.4, hype: 0.7, distribution: 0.8 },
        payMultiplier: 0.8, budgetComfort: ['LOW', 'MID'],
    },
    NETFLIX: {
        id: 'NETFLIX', name: 'Netflix', archetype: 'PLATFORM',
        valuation: 260, // Billion
        castingBias: { reputation: 0.8, followers: 1.4, experience: 0.9 },
        qualityBias: { script: 0.9, hype: 1.3, distribution: 1.0 },
        payMultiplier: 1.1, budgetComfort: ['LOW', 'MID', 'HIGH'],
    },
    APPLE_TV: {
        id: 'APPLE_TV', name: 'Apple TV+', archetype: 'PLATFORM',
        valuation: 2900, // Tech Giant backing
        castingBias: { reputation: 1.2, followers: 1.1, experience: 1.0 },
        qualityBias: { script: 1.2, hype: 1.0, distribution: 0.9 },
        payMultiplier: 1.3, budgetComfort: ['MID', 'HIGH'],
    },
    DISNEY_PLUS: {
        id: 'DISNEY_PLUS', name: 'Disney+', archetype: 'PLATFORM',
        valuation: 180, // Billion
        castingBias: { reputation: 1.0, followers: 1.2, experience: 1.0 },
        qualityBias: { script: 1.0, hype: 1.2, distribution: 1.2 },
        payMultiplier: 1.4, budgetComfort: ['HIGH'],
    },
    HULU: {
        id: 'HULU', name: 'Hulu', archetype: 'PLATFORM',
        valuation: 27,
        castingBias: { reputation: 0.9, followers: 1.1, experience: 1.0 },
        qualityBias: { script: 1.0, hype: 1.0, distribution: 1.0 },
        payMultiplier: 1.0, budgetComfort: ['LOW', 'MID']
    },
    YOUTUBE: {
        id: 'YOUTUBE', name: 'YouTube Originals', archetype: 'PLATFORM',
        valuation: 350,
        castingBias: { reputation: 0.5, followers: 2.0, experience: 0.5 },
        qualityBias: { script: 0.7, hype: 1.5, distribution: 2.0 },
        payMultiplier: 0.8, budgetComfort: ['LOW']
    },
    // --- NEW UNIVERSE STUDIOS ---
    MARVEL_STUDIOS: {
        id: 'MARVEL_STUDIOS', name: 'Marvel Studios', archetype: 'UNIVERSE_ARCHITECT',
        valuation: 50,
        castingBias: { reputation: 1.0, followers: 1.5, experience: 0.8 },
        qualityBias: { script: 0.8, hype: 1.5, distribution: 1.5 },
        payMultiplier: 1.5, budgetComfort: ['HIGH']
    },
    DC_STUDIOS: {
        id: 'DC_STUDIOS', name: 'DC Studios', archetype: 'UNIVERSE_ARCHITECT',
        valuation: 35,
        castingBias: { reputation: 1.2, followers: 1.3, experience: 1.0 },
        qualityBias: { script: 1.0, hype: 1.4, distribution: 1.4 },
        payMultiplier: 1.4, budgetComfort: ['HIGH']
    },
    LUCASFILM: {
        id: 'LUCASFILM', name: 'Lucasfilm', archetype: 'UNIVERSE_ARCHITECT',
        valuation: 60,
        castingBias: { reputation: 1.3, followers: 1.0, experience: 1.0 },
        qualityBias: { script: 1.1, hype: 1.5, distribution: 1.3 },
        payMultiplier: 1.3, budgetComfort: ['HIGH']
    }
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const selectStudioForProject = (budget: BudgetTier, player: Player): Studio => {
    const scores: Record<string, number> = {};
    const studioIds = Object.keys(STUDIO_CATALOG) as StudioId[];

    studioIds.forEach(id => {
        const studio = STUDIO_CATALOG[id];
        
        // Exclude Universe Architects from standard random selection unless budget is HIGH
        if (studio.archetype === 'UNIVERSE_ARCHITECT' && budget !== 'HIGH') {
            scores[id] = 0;
            return;
        }

        let score = 10;

        // Budget comfort
        if (studio.budgetComfort.includes(budget)) {
            score += 30;
        } else {
            score -= 20; // Penalize if budget is not ideal
        }

        // Player memory bias
        const memory = player.studioMemory[id];
        if (memory && memory.projectOutcomes.length > 0) {
            const avgOutcome = memory.projectOutcomes.reduce((a, b) => a + b, 0) / memory.projectOutcomes.length;
            if (avgOutcome > 70) score += 20; // Good history
            else if (avgOutcome < 50) score -= 15; // Bad history
        }
        scores[id] = Math.max(1, score);
    });

    let pool: StudioId[] = [];
    Object.entries(scores).forEach(([id, score]) => {
        for (let i = 0; i < score; i++) {
            pool.push(id as StudioId);
        }
    });

    if (pool.length === 0) { // Fallback
        const compatibleStudios = studioIds.filter(id => STUDIO_CATALOG[id].budgetComfort.includes(budget));
        return STUDIO_CATALOG[pick(compatibleStudios.length > 0 ? compatibleStudios : studioIds)];
    }

    const selectedId = pick(pool);
    return STUDIO_CATALOG[selectedId];
};