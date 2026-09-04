import type {
    Genre,
    IndustryTalentBooking,
    NPCActor,
    PlatformAiReleaseMemory,
    PlatformId,
    Player,
    ProductionCalendar,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { evaluateDynastyTalentOffer } from '../dynastyCareer';
import { getCanonicalIndustryTalentPool } from '../industryTalentSelection';

const TIER_SCORE: Record<NPCActor['tier'], number> = {
    ICON: 100,
    A_LIST: 92,
    ESTABLISHED: 78,
    RISING: 62,
    INDIE: 54,
    UNKNOWN: 42,
};

const rankTalent = (
    candidates: NPCActor[],
    seed: string,
    genre: Genre,
    releaseMemory: readonly PlatformAiReleaseMemory[],
    role: 'ACTOR' | 'DIRECTOR',
    pairedActorId?: string | null,
    candidateModifiers: ReadonlyMap<string, number> = new Map(),
): NPCActor[] => candidates
    .map(candidate => {
        const rng = createDeterministicRng(`${seed}:${candidate.id}`);
        const prestigeFit = candidate.prestigeBias === 'MIXED' ? 3 : genre === 'DRAMA' || genre === 'BIOPIC' || genre === 'DOCUMENTARY'
            ? candidate.prestigeBias === 'PRESTIGE' ? 7 : 0
            : candidate.prestigeBias === 'COMMERCIAL' ? 7 : 1;
        return {
            candidate,
            score: TIER_SCORE[candidate.tier]
                + prestigeFit
                + (candidateModifiers.get(candidate.id) || 0)
                + getPlatformAiTalentMemoryModifier(releaseMemory, candidate.id, role)
                + (role === 'DIRECTOR' && pairedActorId
                    ? getPlatformAiTalentPairMemoryModifier(releaseMemory, pairedActorId, candidate.id)
                    : 0)
                + rng() * 8,
        };
    })
    .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id))
    .map(entry => entry.candidate);

export interface SelectPlatformAiTalentInput {
    player: Player;
    platformId: PlatformId;
    canonicalProjectId: string;
    genre: Genre;
    productionCalendar: ProductionCalendar;
    bookings: readonly IndustryTalentBooking[] | undefined;
    releaseMemory?: readonly PlatformAiReleaseMemory[];
}

export interface PlatformAiTalentSelection {
    leadActor: NPCActor;
    director: NPCActor;
}

export const getPlatformAiTalentMemoryModifier = (
    releaseMemory: readonly PlatformAiReleaseMemory[],
    talentId: string,
    role: 'ACTOR' | 'DIRECTOR',
): number => {
    const ordered = [...releaseMemory]
        .sort((left, right) => right.releasedAtAbsoluteWeek - left.releasedAtAbsoluteWeek || left.projectId.localeCompare(right.projectId));
    const score = ordered.reduce((sum, memory, index) => {
        const rememberedTalentId = role === 'ACTOR' ? memory.leadActorId : memory.directorId;
        if (rememberedTalentId !== talentId) return sum;
        const outcomeScore = memory.outcome === 'HIT' ? 6 : memory.outcome === 'SOLID' ? 2 : -5;
        const awardScore = Math.min(6, Math.max(0, memory.awardWins) * 2);
        return sum + (outcomeScore + awardScore) * Math.max(0.35, 0.85 ** index);
    }, 0);
    return Math.max(-12, Math.min(12, Math.round(score * 100) / 100));
};

export const getPlatformAiTalentPairMemoryModifier = (
    releaseMemory: readonly PlatformAiReleaseMemory[],
    leadActorId: string,
    directorId: string,
): number => {
    const ordered = [...releaseMemory]
        .sort((left, right) => right.releasedAtAbsoluteWeek - left.releasedAtAbsoluteWeek || left.projectId.localeCompare(right.projectId));
    const score = ordered.reduce((sum, memory, index) => {
        if (memory.leadActorId !== leadActorId || memory.directorId !== directorId) return sum;
        const outcomeScore = memory.outcome === 'HIT' ? 5 : memory.outcome === 'SOLID' ? 1.5 : -4;
        const prestigeScore = memory.prestigeScore >= 85 ? 2 : memory.prestigeScore >= 75 ? 1 : 0;
        const awardScore = Math.min(4, Math.max(0, memory.awardWins));
        return sum + (outcomeScore + prestigeScore + awardScore) * Math.max(0.4, 0.82 ** index);
    }, 0);
    return Math.max(-10, Math.min(10, Math.round(score * 100) / 100));
};

export const selectPlatformAiTalent = (
    input: SelectPlatformAiTalentInput,
): PlatformAiTalentSelection | null => {
    // Bookings remain canonical history, but Phase 3 deliberately permits an NPC
    // to carry more than one production at once. The rotating talent market is
    // the gameplay availability rule until a future contracts/lawsuit pack.
    void input.productionCalendar;
    void input.bookings;
    const pool = getCanonicalIndustryTalentPool(input.player);
    const releaseMemory = input.releaseMemory || [];
    const absoluteWeek = Math.max(0, Math.round(input.productionCalendar.startedAbsoluteWeek || 0));
    const offerDecisions = new Map(pool.map(candidate => [candidate.id, evaluateDynastyTalentOffer(input.player, candidate, {
        platformId: input.platformId,
        canonicalProjectId: input.canonicalProjectId,
        genre: input.genre,
        absoluteWeek,
    })]));
    const eligiblePool = pool.filter(candidate => offerDecisions.get(candidate.id)?.eligible !== false);
    const offerModifiers = new Map([...offerDecisions.entries()].map(([id, decision]) => [id, decision.modifier]));
    const actors = rankTalent(
        eligiblePool.filter(npc => npc.occupation === 'ACTOR'),
        `${input.player.id}:${input.platformId}:${input.canonicalProjectId}:ACTOR`,
        input.genre,
        releaseMemory,
        'ACTOR',
        undefined,
        offerModifiers,
    );
    const directors = rankTalent(
        eligiblePool.filter(npc => npc.occupation === 'DIRECTOR'),
        `${input.player.id}:${input.platformId}:${input.canonicalProjectId}:DIRECTOR`,
        input.genre,
        releaseMemory,
        'DIRECTOR',
        actors[0]?.id,
        offerModifiers,
    );
    if (!actors[0] || !directors[0]) return null;
    return { leadActor: actors[0], director: directors[0] };
};
