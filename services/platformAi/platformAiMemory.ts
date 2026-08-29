import type {
    Genre,
    IndustryProductionCommitment,
    IndustryProject,
    PlatformAiDecisionRecord,
    PlatformAiReleaseMemory,
    PlatformAiContentPlan,
    PlatformAiStreamingPerformance,
    PlatformId,
    PlatformState,
    Player,
    TargetAudience,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import {
    appendPlatformAiDecisions,
    normalizePlatformAiState,
    resolvePlatformController,
} from './platformAiState';

const RELEASE_MEMORY_LIMIT = 12;
const PRODUCTION_MEMORY_LIMIT = 24;
const BELIEF_MAX_STEP = 20;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, value))
);

const round = (value: number, precision = 100): number => Math.round(value * precision) / precision;

const boundedBelief = (next: number, previous: number | undefined): number => (
    previous === undefined ? clamp(round(next), 0, 100) : clamp(round(next), previous - BELIEF_MAX_STEP, previous + BELIEF_MAX_STEP)
);

const releaseMemoryKey = (memory: PlatformAiReleaseMemory): string => (
    `${memory.projectId}:${memory.releasedAtAbsoluteWeek}`
);

const newestReleaseMemory = (memories: PlatformAiReleaseMemory[]): PlatformAiReleaseMemory[] => {
    const byKey = new Map<string, PlatformAiReleaseMemory>();
    for (const memory of memories) {
        const key = releaseMemoryKey(memory);
        byKey.delete(key);
        byKey.set(key, memory);
    }
    return Array.from(byKey.values())
        .sort((left, right) => left.releasedAtAbsoluteWeek - right.releasedAtAbsoluteWeek || left.projectId.localeCompare(right.projectId))
        .slice(-RELEASE_MEMORY_LIMIT);
};

const average = (values: number[]): number => (
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

const rebuildGenreMemory = (
    memories: PlatformAiReleaseMemory[],
    previous: NonNullable<PlatformState['ai']>['genreMemory'],
): NonNullable<PlatformState['ai']>['genreMemory'] => {
    const genres = [...new Set(memories.map(memory => memory.genre))].sort();
    return genres.reduce<NonNullable<PlatformState['ai']>['genreMemory']>((result, genre) => {
        const rows = memories.filter(memory => memory.genre === genre);
        result[genre] = {
            releases: rows.length,
            averageQuality: boundedBelief(average(rows.map(row => row.quality)), previous[genre]?.averageQuality),
            averageCommercialScore: boundedBelief(
                average(rows.map(row => row.commercialScore)),
                previous[genre]?.averageCommercialScore,
            ),
        };
        return result;
    }, {});
};

const rebuildAudienceMemory = (
    memories: PlatformAiReleaseMemory[],
    previous: NonNullable<PlatformState['ai']>['audienceMemory'],
): NonNullable<PlatformState['ai']>['audienceMemory'] => {
    const audiences = [...new Set(memories.map(memory => memory.targetAudience))].sort();
    return audiences.reduce<NonNullable<PlatformState['ai']>['audienceMemory']>((result, audience) => {
        const rows = memories.filter(memory => memory.targetAudience === audience);
        result[audience] = {
            releases: rows.length,
            averageCommercialScore: boundedBelief(
                average(rows.map(row => row.commercialScore)),
                previous[audience]?.averageCommercialScore,
            ),
            averageSubscriberImpact: round(average(rows.map(row => row.subscriberImpactMillions)), 1_000),
        };
        return result;
    }, {});
};

const rebuildRegionalMemory = (
    memories: PlatformAiReleaseMemory[],
    previous: NonNullable<PlatformState['ai']>['regionalMemory'],
): NonNullable<PlatformState['ai']>['regionalMemory'] => {
    const countries = [...new Set(memories.flatMap(memory => (
        memory.regionalResults || []
    ).map(row => row.countryId)))].sort();
    return Object.fromEntries(countries.map(countryId => {
        const rows = memories.flatMap(memory => memory.regionalResults || [])
            .filter(row => row.countryId === countryId);
        return [countryId, {
            releases: rows.length,
            averageCommercialScore: boundedBelief(
                average(rows.map(row => row.commercialScore)),
                previous[countryId]?.averageCommercialScore,
            ),
            averageSubscriberImpact: round(average(rows.map(row => row.subscriberImpactMillions)), 1_000),
        }];
    }));
};

const rebuildLocalizationMemory = (
    memories: PlatformAiReleaseMemory[],
    previous: NonNullable<PlatformState['ai']>['localizationMemory'],
): NonNullable<PlatformState['ai']>['localizationMemory'] => {
    const levels = [...new Set(memories.map(memory => memory.localizationLevel).filter(Boolean))].sort();
    return levels.reduce<NonNullable<PlatformState['ai']>['localizationMemory']>((result, level) => {
        const rows = memories.filter(memory => memory.localizationLevel === level);
        const regionalRows = rows.flatMap(memory => memory.regionalResults || []);
        result[level!] = {
            releases: rows.length,
            averageCommercialScore: boundedBelief(
                average(rows.map(row => row.commercialScore)),
                previous[level!]?.averageCommercialScore,
            ),
            averageReachMultiplier: round(average(regionalRows.map(row => row.reachMultiplier)), 1_000),
        };
        return result;
    }, {});
};

const talentPairKey = (memory: PlatformAiReleaseMemory): string | null => (
    memory.leadActorId && memory.directorId ? `${memory.leadActorId}:${memory.directorId}` : null
);

const rebuildTalentPairMemory = (
    memories: PlatformAiReleaseMemory[],
    previous: NonNullable<PlatformState['ai']>['talentPairMemory'],
): NonNullable<PlatformState['ai']>['talentPairMemory'] => {
    const keys = [...new Set(memories.map(talentPairKey).filter(Boolean))].sort();
    return Object.fromEntries(keys.map(key => {
        const rows = memories.filter(memory => talentPairKey(memory) === key);
        return [key!, {
            releases: rows.length,
            averageCommercialScore: boundedBelief(
                average(rows.map(row => row.commercialScore)),
                previous[key!]?.averageCommercialScore,
            ),
            averagePrestigeScore: boundedBelief(
                average(rows.map(row => row.prestigeScore)),
                previous[key!]?.averagePrestigeScore,
            ),
        }];
    }));
};

const rebuildReleasePatternMemory = (
    memories: PlatformAiReleaseMemory[],
    previous: NonNullable<PlatformState['ai']>['releasePatternMemory'],
): NonNullable<PlatformState['ai']>['releasePatternMemory'] => {
    const patterns = [...new Set(memories.map(memory => memory.releasePattern).filter(Boolean))].sort();
    return patterns.reduce<NonNullable<PlatformState['ai']>['releasePatternMemory']>((result, pattern) => {
        const rows = memories.filter(memory => memory.releasePattern === pattern);
        result[pattern!] = {
            releases: rows.length,
            averageCommercialScore: boundedBelief(
                average(rows.map(row => row.commercialScore)),
                previous[pattern!]?.averageCommercialScore,
            ),
            averageEngagementDelta: round(average(rows.map(row => (
                row.regionalResults?.length
                    ? average(row.regionalResults.map(region => (region.commercialScore - 55) / 7))
                    : 0
            ))), 100),
        };
        return result;
    }, {});
};

const learnedCompetence = (
    platformId: PlatformId,
    delta: number,
): NonNullable<PlatformState['ai']>['competence'] => {
    const base = PLATFORM_AI_PROFILES[platformId].competence;
    const learned = (value: number): number => round(clamp(value + delta, 7, 10), 1_000);
    return {
        strategy: learned(base.strategy),
        creative: learned(base.creative),
        production: learned(base.production),
        commercial: learned(base.commercial),
        prestige: learned(base.prestige),
        finance: learned(base.finance),
        technology: learned(base.technology),
        negotiation: learned(base.negotiation),
    };
};

const releaseLearningStep = (performance: PlatformAiStreamingPerformance): number => (
    performance.outcome === 'HIT' ? 0.05 : performance.outcome === 'FLOP' ? -0.05 : 0.01
);

export interface DerivePlatformAiProductionOutcomeMemoryInput {
    platformId: PlatformId;
    productions: Array<Partial<IndustryProductionCommitment> & {
        id: string;
        status: IndustryProductionCommitment['status'];
        updatedAtAbsoluteWeek: number;
    }>;
}

export const derivePlatformAiProductionOutcomeMemory = (
    input: DerivePlatformAiProductionOutcomeMemoryInput,
): NonNullable<PlatformState['ai']>['productionOutcomeMemory'] => {
    const observed = input.productions
        .filter(production => production.commissioningPlatformId === input.platformId)
        .filter(production => production.status === 'DELIVERED' || production.status === 'CANCELLED')
        .sort((left, right) => left.updatedAtAbsoluteWeek - right.updatedAtAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(-PRODUCTION_MEMORY_LIMIT);
    const delays = observed.map(production => Math.max(0, production.aiExecution?.delayWeeks || 0));
    return {
        observedProductions: observed.length,
        deliveredProductions: observed.filter(production => production.status === 'DELIVERED').length,
        delayedProductions: delays.filter(delay => delay > 0).length,
        cancelledProductions: observed.filter(production => production.status === 'CANCELLED').length,
        averageDelayWeeks: round(average(delays), 100),
        observedProductionIds: observed.map(production => production.id),
    };
};

export interface PlatformAiMemoryMutationResult {
    world: WorldState;
    changed: boolean;
    reason?: 'PLATFORM_NOT_FOUND' | 'PLAYER_CONTROLLED' | 'DUPLICATE';
}

export interface RecordPlatformAiReleaseMemoryInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    project: IndustryProject;
    plan?: PlatformAiContentPlan;
    performance: PlatformAiStreamingPerformance;
    absoluteWeek: number;
}

export const recordPlatformAiReleaseMemory = (
    input: RecordPlatformAiReleaseMemoryInput,
): PlatformAiMemoryMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    const key = `${input.project.id}:${input.absoluteWeek}`;
    if (ai.releaseMemory.some(memory => releaseMemoryKey(memory) === key)) {
        return { world: input.world, changed: false, reason: 'DUPLICATE' };
    }
    const releaseMemory: PlatformAiReleaseMemory = {
        projectId: input.project.id,
        releasedAtAbsoluteWeek: input.absoluteWeek,
        genre: input.project.genre as Genre,
        targetAudience: input.project.targetAudience || 'PG-13' as TargetAudience,
        leadActorId: input.project.leadActorId || null,
        directorId: input.project.directorId || null,
        quality: clamp(round(input.project.quality), 0, 100),
        commercialScore: clamp(round(input.performance.commercialScore), 0, 100),
        prestigeScore: clamp(round(input.performance.prestigeScore), 0, 100),
        subscriberImpactMillions: round(input.performance.subscriberImpactMillions, 1_000),
        outcome: input.performance.outcome,
        awardWins: 0,
        observedAwardKeys: [],
        regionalResults: [...(input.performance.regionalResults || [])],
        localizationLevel: input.plan?.localizationLevel || 'NONE',
        releasePattern: input.plan?.releasePattern || null,
        productionDelayWeeks: input.plan?.industryProductionId
            ? Math.max(0, input.world.industryProductions?.[input.plan.industryProductionId]?.aiExecution?.delayWeeks || 0)
            : 0,
    };
    const releaseMemoryRows = newestReleaseMemory([...ai.releaseMemory, releaseMemory]);
    const effectiveCompetenceDelta = round(clamp(
        ai.effectiveCompetenceDelta + releaseLearningStep(input.performance),
        -0.5,
        0.5,
    ), 1_000);
    const decisionType = input.performance.outcome === 'HIT'
        ? 'RELEASE_HIT'
        : input.performance.outcome === 'FLOP'
            ? 'RELEASE_FLOP'
            : 'RELEASE_RESULT';
    const decision: PlatformAiDecisionRecord = {
        id: createDeterministicId('platform_ai_decision', input.platformId, input.project.id, input.absoluteWeek, decisionType),
        absoluteWeek: input.absoluteWeek,
        type: decisionType,
        summary: `${input.project.title} opened as a ${input.performance.outcome.toLowerCase()}.`,
        reason: `${input.performance.viewsMillions}M viewers produced a ${input.performance.commercialScore} commercial score.`,
        cashImpactMillions: 0,
    };
    const reputationDelta = input.performance.outcome === 'HIT' ? 2 : input.performance.outcome === 'FLOP' ? -1 : 0.25;
    const nextPlatform: PlatformState = {
        ...platform,
        recentHits: input.performance.outcome === 'HIT'
            ? platform.recentHits + 1
            : input.performance.outcome === 'FLOP'
                ? Math.max(0, platform.recentHits - 1)
                : platform.recentHits,
        reputation: round(clamp(platform.reputation + reputationDelta, 0, 100)),
        ai: {
            ...ai,
            effectiveCompetenceDelta,
            competence: learnedCompetence(input.platformId, effectiveCompetenceDelta),
            releaseMemory: releaseMemoryRows,
            genreMemory: rebuildGenreMemory(releaseMemoryRows, ai.genreMemory),
            audienceMemory: rebuildAudienceMemory(releaseMemoryRows, ai.audienceMemory),
            regionalMemory: rebuildRegionalMemory(releaseMemoryRows, ai.regionalMemory),
            localizationMemory: rebuildLocalizationMemory(releaseMemoryRows, ai.localizationMemory),
            talentPairMemory: rebuildTalentPairMemory(releaseMemoryRows, ai.talentPairMemory),
            releasePatternMemory: rebuildReleasePatternMemory(releaseMemoryRows, ai.releasePatternMemory),
            decisionHistory: appendPlatformAiDecisions(ai.decisionHistory, [decision]),
        },
    };
    return {
        world: {
            ...input.world,
            platforms: { ...input.world.platforms!, [input.platformId]: nextPlatform },
        },
        changed: true,
    };
};

export interface UpdatePlatformAiMemoryInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}

export const updatePlatformAiMemory = (
    input: UpdatePlatformAiMemoryInput,
): PlatformAiMemoryMutationResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    const productionOutcomeMemory = derivePlatformAiProductionOutcomeMemory({
        platformId: input.platformId,
        productions: Object.values(input.world.industryProductions || {}),
    });
    let changed = JSON.stringify(productionOutcomeMemory) !== JSON.stringify(ai.productionOutcomeMemory);
    const decisions: PlatformAiDecisionRecord[] = [];
    const releaseMemory = ai.releaseMemory.map(memory => {
        const observed = new Set(memory.observedAwardKeys || []);
        const newWins = input.world.awardHistory.flatMap(entry => entry.winners.map(winner => ({ entry, winner })))
            .filter(({ winner }) => winner.projectId === memory.projectId)
            .filter(({ entry, winner }) => !observed.has(`${entry.year}:${entry.type}:${winner.category}:${memory.projectId}`));
        if (!newWins.length) return memory;
        changed = true;
        for (const { entry, winner } of newWins) {
            const key = `${entry.year}:${entry.type}:${winner.category}:${memory.projectId}`;
            observed.add(key);
            decisions.push({
                id: createDeterministicId('platform_ai_decision', input.platformId, key, 'AWARDS_PUSH'),
                absoluteWeek: input.absoluteWeek,
                type: 'AWARDS_PUSH',
                summary: `${winner.projectName} won ${winner.category}.`,
                reason: `${entry.type} confirmed a measurable prestige result for the release.`,
                cashImpactMillions: 0,
            });
        }
        return {
            ...memory,
            awardWins: memory.awardWins + newWins.length,
            observedAwardKeys: [...observed].sort(),
            prestigeScore: clamp(memory.prestigeScore + newWins.length * 2, 0, 100),
        };
    });
    if (!changed) return { world: input.world, changed: false };
    const nextPlatform: PlatformState = {
        ...platform,
        reputation: round(clamp(platform.reputation + decisions.length * 0.5, 0, 100)),
        ai: {
            ...ai,
            releaseMemory,
            genreMemory: rebuildGenreMemory(releaseMemory, ai.genreMemory),
            audienceMemory: rebuildAudienceMemory(releaseMemory, ai.audienceMemory),
            regionalMemory: rebuildRegionalMemory(releaseMemory, ai.regionalMemory),
            localizationMemory: rebuildLocalizationMemory(releaseMemory, ai.localizationMemory),
            talentPairMemory: rebuildTalentPairMemory(releaseMemory, ai.talentPairMemory),
            releasePatternMemory: rebuildReleasePatternMemory(releaseMemory, ai.releasePatternMemory),
            productionOutcomeMemory,
            decisionHistory: appendPlatformAiDecisions(ai.decisionHistory, decisions),
        },
    };
    return {
        world: {
            ...input.world,
            platforms: { ...input.world.platforms!, [input.platformId]: nextPlatform },
        },
        changed: true,
    };
};

const SIGNIFICANT_TYPES = new Set([
    'MAJOR_GREENLIGHT',
    'ORIGINAL_COMMISSION',
    'CAST_COMPETITION',
    'CANCELLATION',
    'PRODUCTION_CANCELLED',
    'PRODUCTION_DELIVERY',
    'MAJOR_RELEASE',
    'RELEASE_HIT',
    'RELEASE_FLOP',
    'AWARDS_PUSH',
    'REGION_WITHDRAWAL',
    'RESTRUCTURING',
    'PARENT_RESCUE',
]);

const SIGNIFICANT_ACTIONS = new Set(['WITHDRAW_REGION', 'RESTRUCTURE', 'PARENT_RESCUE']);

export interface PlatformAiPresentationEvent {
    id: string;
    type: string;
    summary: string;
    reason: string;
    cashImpactMillions: number;
    timing: string;
    playerConsequence: string;
}

const consequenceFor = (decision: PlatformAiDecisionRecord): string => {
    if (decision.type === 'RELEASE_HIT') return 'A stronger rival title can raise the bar for audience attention and awards.';
    if (decision.type === 'RELEASE_FLOP') return 'A rival setback may open a short competitive window.';
    if (decision.type === 'AWARDS_PUSH') return 'Prestige momentum can improve the rival platform\'s talent access.';
    if (decision.action === 'WITHDRAW_REGION') return 'One market becomes less contested.';
    if (decision.action === 'RESTRUCTURE' || decision.type === 'RESTRUCTURING') return 'The rival may reduce spending while it repairs its balance sheet.';
    if (decision.action === 'PARENT_RESCUE' || decision.type === 'PARENT_RESCUE') return 'Fresh backing keeps the rival active.';
    return 'This changes the rival platform\'s competitive position.';
};

export const getPlatformAiPresentationEvents = (
    platform: PlatformState,
): PlatformAiPresentationEvent[] => (platform.ai?.decisionHistory || [])
    .filter(decision => SIGNIFICANT_TYPES.has(decision.type) || Boolean(decision.action && SIGNIFICANT_ACTIONS.has(decision.action)))
    .map(decision => ({
        id: decision.id,
        type: decision.type,
        summary: decision.summary,
        reason: decision.reason,
        cashImpactMillions: decision.cashImpactMillions,
        timing: `Absolute week ${decision.absoluteWeek}`,
        playerConsequence: consequenceFor(decision),
    }))
    .slice(-20);
