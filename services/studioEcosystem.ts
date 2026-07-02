import type { IndustryProject, NPCStudioState, Player, Stock, StudioId, WorldState } from '../types';
import { getEstimatedBudget } from './roleLogic';
import { STUDIO_CATALOG } from './studioLogic';

export type StudioReleaseOutcome = 'HIT' | 'SOLID' | 'FLOP';

export interface StudioProjectOutcome {
    studioId: StudioId;
    projectId: string;
    title: string;
    outcome: StudioReleaseOutcome;
    budget: number;
    boxOffice: number;
    profit: number;
    profitMillions: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const clampMoneyMillions = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
const roundOne = (value: number) => Math.round(value * 10) / 10;
const roundThree = (value: number) => Math.round(value * 1000) / 1000;

const SUSTAINED_ARCHETYPES = new Set(['LEGACY', 'PRESTIGE', 'FRANCHISE', 'UNIVERSE_ARCHITECT']);
const PLATFORM_ARCHETYPES = new Set(['PLATFORM']);

const getCatalogStudio = (studioId: string) => STUDIO_CATALOG[studioId as StudioId];

const getDefaultStudioState = (studioId: StudioId): NPCStudioState => {
    const catalog = getCatalogStudio(studioId);
    if (catalog) {
        return {
            id: catalog.id,
            name: catalog.name,
            valuation: catalog.valuation,
            reputation: Math.round(clamp(72 + (catalog.qualityBias.script * 8) + (catalog.qualityBias.distribution * 5), 35, 98)),
            cashReserve: Math.round(catalog.valuation * 120),
            recentHits: 0,
            archetype: catalog.archetype === 'UNIVERSE_ARCHITECT' ? 'FRANCHISE' : catalog.archetype,
            projectsReleased: 0,
            hits: 0,
            flops: 0,
            slateMomentum: 50,
            lifetimeBoxOffice: 0,
            lifetimeProfit: 0,
        };
    }

    return {
        id: studioId,
        name: String(studioId).replace(/_/g, ' '),
        valuation: 0.2,
        reputation: 45,
        cashReserve: 40,
        recentHits: 0,
        archetype: 'EMERGENT',
        projectsReleased: 0,
        hits: 0,
        flops: 0,
        slateMomentum: 45,
        lifetimeBoxOffice: 0,
        lifetimeProfit: 0,
    };
};

export const getLegacyStudioValuationFloor = (studioId: StudioId): number => {
    const catalog = getCatalogStudio(studioId);
    if (!catalog) return 0.01;
    const archetype = catalog.archetype === 'UNIVERSE_ARCHITECT' ? 'FRANCHISE' : catalog.archetype;
    if (PLATFORM_ARCHETYPES.has(archetype)) return Math.max(1, catalog.valuation * 0.25);
    if (SUSTAINED_ARCHETYPES.has(archetype)) return Math.max(1, catalog.valuation * 0.32);
    return Math.max(0.2, catalog.valuation * 0.18);
};

const normalizeStudioState = (studio: NPCStudioState): NPCStudioState => ({
    ...studio,
    valuation: Math.max(getLegacyStudioValuationFloor(studio.id), Number(studio.valuation) || 0),
    reputation: clamp(Number(studio.reputation) || 50),
    cashReserve: clampMoneyMillions(Number(studio.cashReserve) || 0),
    recentHits: Math.max(0, Math.round(Number(studio.recentHits) || 0)),
    projectsReleased: Math.max(0, Math.round(Number(studio.projectsReleased) || 0)),
    hits: Math.max(0, Math.round(Number(studio.hits) || 0)),
    flops: Math.max(0, Math.round(Number(studio.flops) || 0)),
    slateMomentum: clamp(Number(studio.slateMomentum ?? 50), 0, 100),
    lifetimeBoxOffice: Math.max(0, Math.round(Number(studio.lifetimeBoxOffice) || 0)),
    lifetimeProfit: Number.isFinite(studio.lifetimeProfit) ? Math.round(studio.lifetimeProfit || 0) : 0,
});

export const ensureStudioEcosystem = (world: WorldState): WorldState => {
    const nextWorld: WorldState = {
        ...world,
        studios: { ...(world.studios || {}) },
        projects: Array.isArray(world.projects) ? world.projects : [],
    };

    Object.values(STUDIO_CATALOG).forEach(catalog => {
        if (!nextWorld.studios![catalog.id]) {
            nextWorld.studios![catalog.id] = getDefaultStudioState(catalog.id);
        }
    });

    Object.entries(nextWorld.studios || {}).forEach(([studioId, studio]) => {
        nextWorld.studios![studioId] = normalizeStudioState({
            ...getDefaultStudioState(studioId),
            ...studio,
            id: studio.id || studioId,
        });
    });

    return nextWorld;
};

const classifyOutcome = (project: IndustryProject, budget: number): StudioReleaseOutcome => {
    const review = (project.reviews || '').toUpperCase();
    const profit = Math.max(0, Number(project.boxOffice) || 0) - budget;
    if (review.includes('HIT') || review.includes('SUCCESS') || review.includes('BLOCKBUSTER')) return 'HIT';
    if (review.includes('FLOP') || review.includes('BOMB') || review.includes('DISASTER')) return 'FLOP';
    if (profit >= budget * 0.8 || (project.quality || 0) >= 82) return 'HIT';
    if (profit <= -budget * 0.35 || (project.quality || 0) <= 38) return 'FLOP';
    return 'SOLID';
};

export const evaluateStudioProjectOutcome = (project: IndustryProject): StudioProjectOutcome => {
    const budget = getEstimatedBudget(project.budgetTier);
    const boxOffice = Math.max(0, Math.round(Number(project.boxOffice) || 0));
    const profit = boxOffice - budget;
    return {
        studioId: project.studioId,
        projectId: project.id,
        title: project.title,
        outcome: classifyOutcome(project, budget),
        budget,
        boxOffice,
        profit,
        profitMillions: profit / 1_000_000,
    };
};

export const applyStudioProjectOutcome = (
    world: WorldState,
    project: IndustryProject,
): { world: WorldState; outcome: StudioProjectOutcome } => {
    const nextWorld = ensureStudioEcosystem(world);
    const outcome = evaluateStudioProjectOutcome(project);
    const studio = normalizeStudioState(nextWorld.studios![project.studioId] || getDefaultStudioState(project.studioId));
    const qualitySignal = ((project.quality || 50) - 55) / 90;
    const profitValuationSignal = Math.max(-0.18, Math.min(0.28, outcome.profitMillions / Math.max(550, studio.valuation * 160)));
    const outcomeSignal = outcome.outcome === 'HIT' ? 0.045 : outcome.outcome === 'FLOP' ? -0.06 : 0.012;
    const budgetSignal = project.budgetTier === 'HIGH' || project.budgetTier === 'BLOCKBUSTER' ? 1.15 : project.budgetTier === 'MID' ? 0.85 : 0.55;
    const valuationMultiplier = 1 + ((outcomeSignal + profitValuationSignal + qualitySignal * 0.025) * budgetSignal);
    const valuationFloor = getLegacyStudioValuationFloor(studio.id);
    const profitCashShare = outcome.profitMillions >= 0 ? 0.46 : 0.68;
    const nextCash = studio.cashReserve + (outcome.profitMillions * profitCashShare);
    const momentumDelta = outcome.outcome === 'HIT'
        ? 12 + Math.min(8, outcome.profitMillions / 120)
        : outcome.outcome === 'FLOP'
            ? -14 + Math.max(-10, outcome.profitMillions / 80)
            : 3 + Math.min(4, outcome.profitMillions / 200);
    const reputationDelta = outcome.outcome === 'HIT' ? 3 : outcome.outcome === 'FLOP' ? -4 : 1;

    nextWorld.studios![project.studioId] = normalizeStudioState({
        ...studio,
        valuation: Math.max(valuationFloor, roundThree(studio.valuation * valuationMultiplier)),
        cashReserve: roundOne(Math.max(studio.isNpcVenture ? -30 : 0, nextCash)),
        reputation: clamp(studio.reputation + reputationDelta + qualitySignal * 4, 5, 100),
        recentHits: outcome.outcome === 'HIT'
            ? (studio.recentHits || 0) + 1
            : Math.max(0, (studio.recentHits || 0) - (outcome.outcome === 'FLOP' ? 1 : 0)),
        projectsReleased: (studio.projectsReleased || 0) + 1,
        hits: (studio.hits || 0) + (outcome.outcome === 'HIT' ? 1 : 0),
        flops: (studio.flops || 0) + (outcome.outcome === 'FLOP' ? 1 : 0),
        slateMomentum: clamp((studio.slateMomentum ?? 50) + momentumDelta, 0, 100),
        lastReleaseTitle: project.title,
        lastReleaseWeek: project.weekReleased,
        lastReleaseYear: project.year,
        lifetimeBoxOffice: (studio.lifetimeBoxOffice || 0) + outcome.boxOffice,
        lifetimeProfit: (studio.lifetimeProfit || 0) + outcome.profit,
    });

    return { world: nextWorld, outcome };
};

export const applyPassiveStudioEcosystemTurn = (
    world: WorldState,
    currentWeek: number,
    currentYear: number,
): { world: WorldState } => {
    const nextWorld = ensureStudioEcosystem(world);
    Object.values(nextWorld.studios || {}).forEach(studio => {
        if (studio.isNpcVenture) return;
        const normalized = normalizeStudioState(studio);
        const catalog = getCatalogStudio(normalized.id);
        const archetype = catalog?.archetype === 'UNIVERSE_ARCHITECT' ? 'FRANCHISE' : (catalog?.archetype || normalized.archetype);
        const momentum = normalized.slateMomentum ?? 50;
        const reputation = normalized.reputation || 50;
        const hitBoost = Math.min(0.012, (normalized.recentHits || 0) * 0.0016);
        const confidenceDrift = ((momentum - 50) * 0.00018) + ((reputation - 55) * 0.00008);
        const annualSeasonPulse = ((currentWeek % 13) === 0 ? 0.002 : 0) + ((currentYear % 5) === 0 && currentWeek === 1 ? 0.003 : 0);
        const passiveMultiplier = 1 + hitBoost + confidenceDrift + annualSeasonPulse;
        const valuationFloor = getLegacyStudioValuationFloor(normalized.id);
        const cashFlow = Math.max(0.15, normalized.valuation * (PLATFORM_ARCHETYPES.has(archetype) ? 0.18 : 0.42));

        nextWorld.studios![normalized.id] = normalizeStudioState({
            ...normalized,
            valuation: Math.max(valuationFloor, roundThree(normalized.valuation * passiveMultiplier)),
            cashReserve: roundOne(normalized.cashReserve + cashFlow),
            recentHits: Math.random() < 0.08 ? Math.max(0, (normalized.recentHits || 0) - 1) : normalized.recentHits,
            slateMomentum: clamp(momentum + (momentum > 50 ? -0.45 : 0.2), 0, 100),
        });
    });

    return { world: nextWorld };
};

const getRecentStudioProjects = (player: Pick<Player, 'world'>, studioId?: string) => {
    if (!studioId) return [];
    return [...(player.world.projects || [])]
        .filter(project => project.studioId === studioId)
        .sort((a, b) => (b.year - a.year) || (b.weekReleased - a.weekReleased))
        .slice(0, 5);
};

export const getStudioStockPerformanceMultiplier = (
    player: Pick<Player, 'world'> | undefined,
    stock: Pick<Stock, 'relatedStudioId' | 'sector'>,
): number => {
    if (!player || stock.sector !== 'MEDIA' || !stock.relatedStudioId) return 1;
    const studio = player.world.studios?.[stock.relatedStudioId];
    const recentProjects = getRecentStudioProjects(player, stock.relatedStudioId);
    const projectSignal = recentProjects.reduce((score, project) => {
        const outcome = evaluateStudioProjectOutcome(project);
        if (outcome.outcome === 'HIT') return score + 0.07;
        if (outcome.outcome === 'FLOP') return score - 0.045;
        return score + 0.008;
    }, 0);
    const momentumSignal = studio ? Math.max(-0.032, Math.min(0.036, ((studio.slateMomentum || 50) - 50) * 0.00055)) : 0;
    const reputationSignal = studio ? Math.max(-0.018, Math.min(0.024, ((studio.reputation || 50) - 55) * 0.00032)) : 0;

    return Math.max(0.86, Math.min(1.16, 1 + projectSignal + momentumSignal + reputationSignal));
};
