import type { Genre, IndustryTalentBooking, NPCActor, Player, ProductionCalendar } from '../types';
import { createDeterministicRng } from './deterministicRandom';
import { evaluateDynastyTalentOffer } from './dynastyCareer';
import { NPC_DATABASE } from './npcLogic';

const TIER_SCORE: Record<NPCActor['tier'], number> = {
    ICON: 100, A_LIST: 92, ESTABLISHED: 78, RISING: 62, INDIE: 54, UNKNOWN: 42,
};

export interface IndustryTalentSelectionInput {
    player: Player;
    companyId: string;
    canonicalProjectId: string;
    genre: Genre;
    productionCalendar: ProductionCalendar;
    bookings: readonly IndustryTalentBooking[] | undefined;
    companyTalentSkill: number;
    budgetMillions: number;
    seedNamespace?: string;
}

export interface IndustryTalentPackage {
    leadActor: NPCActor;
    director: NPCActor;
    packageScore: number;
    estimatedCostMillions: number;
}

export const getCanonicalIndustryTalentPool = (player: Player): NPCActor[] => {
    const extras = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs as NPCActor[] : [];
    const byId = new Map<string, NPCActor>();
    NPC_DATABASE.filter(npc => npc.id.startsWith('celeb_act_') || npc.id.startsWith('celeb_dir_'))
        .forEach(npc => byId.set(npc.id, npc));
    extras.forEach(npc => {
        if (npc?.id && (npc.occupation === 'ACTOR' || npc.occupation === 'DIRECTOR')) byId.set(npc.id, npc);
    });
    return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
};

const prestigeFit = (candidate: NPCActor, genre: Genre): number => {
    if (candidate.prestigeBias === 'MIXED') return 3;
    const prestigeGenre = genre === 'DRAMA' || genre === 'BIOPIC' || genre === 'DOCUMENTARY';
    return prestigeGenre ? candidate.prestigeBias === 'PRESTIGE' ? 7 : 0 : candidate.prestigeBias === 'COMMERCIAL' ? 7 : 1;
};

const rank = (candidates: NPCActor[], input: IndustryTalentSelectionInput, role: 'ACTOR' | 'DIRECTOR'): NPCActor[] => {
    const week = Math.max(0, Math.round(input.productionCalendar.startedAbsoluteWeek || 0));
    return candidates.map(candidate => {
        const decision = evaluateDynastyTalentOffer(input.player, candidate, {
            platformId: input.companyId as never,
            canonicalProjectId: input.canonicalProjectId,
            genre: input.genre,
            absoluteWeek: week,
        });
        const rng = createDeterministicRng(`${input.seedNamespace || 'industry'}:${input.player.id}:${input.companyId}:${input.canonicalProjectId}:${role}:${candidate.id}`);
        const budgetFit = Math.min(8, Math.max(-4, input.budgetMillions / 25 - (TIER_SCORE[candidate.tier] - 50) / 12));
        return { candidate, eligible: decision.eligible !== false, score: TIER_SCORE[candidate.tier] + prestigeFit(candidate, input.genre) + decision.modifier + budgetFit + input.companyTalentSkill * 0.05 + rng() * 8 };
    }).filter(row => row.eligible)
        .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id))
        .map(row => row.candidate);
};

export const selectIndustryTalentPackage = (input: IndustryTalentSelectionInput): IndustryTalentPackage | null => {
    // Canonical bookings record workload; Phase 3 intentionally permits NPC overlap.
    void input.bookings;
    const pool = getCanonicalIndustryTalentPool(input.player);
    const leadActor = rank(pool.filter(candidate => candidate.occupation === 'ACTOR'), input, 'ACTOR')[0];
    const director = rank(pool.filter(candidate => candidate.occupation === 'DIRECTOR'), input, 'DIRECTOR')[0];
    if (!leadActor || !director) return null;
    const packageScore = Math.max(1, Math.min(100, Math.round((TIER_SCORE[leadActor.tier] + TIER_SCORE[director.tier] + input.companyTalentSkill) / 3)));
    const estimatedCostMillions = Math.round(Math.min(input.budgetMillions * 0.22, Math.max(0.5, packageScore * input.budgetMillions / 950)) * 1000) / 1000;
    return { leadActor, director, packageScore, estimatedCostMillions };
};
