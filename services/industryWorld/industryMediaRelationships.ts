import type {
    IndustryMediaFeudState,
    IndustryMediaPersonality,
    IndustryMediaRelationship,
    IndustryMediaWorldState,
    Player,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Math.round(value)))
);

export interface IndustryMediaRelationshipInteraction {
    id: string;
    personalityId: string;
    subjectKey: string;
    subjectName: string;
    absoluteWeek: number;
    sentiment: number;
    hostile?: boolean;
    reconciliation?: boolean;
    industryEventId?: string;
    playerRelated?: boolean;
}

export interface IndustryMediaRelationshipContext {
    interactions?: IndustryMediaRelationshipInteraction[];
}

const relationshipKeyFor = (item: IndustryMediaRelationshipInteraction): string => (
    `${item.personalityId}:${item.subjectKey}`
);

const affinityBounds = (personality: IndustryMediaPersonality): [number, number] => [
    personality.stanceFloor,
    personality.stanceCeiling,
];

const deriveInteractions = (media: IndustryMediaWorldState): IndustryMediaRelationshipInteraction[] => {
    const responseInteractions = media.playerResponses.flatMap(response => {
        if (response.status !== 'RESOLVED' || response.resolvedAbsoluteWeek === undefined) return [];
        const discussion = media.discussions.find(item => item.id === response.discussionId);
        const story = media.stories.find(item => item.id === response.mediaStoryId);
        const personalityId = discussion?.turns.find(turn => turn.mediaPersonalityId)?.mediaPersonalityId
            || media.storyAssignments.find(item => item.storyId === response.mediaStoryId)?.personalityId;
        if (!personalityId || !story) return [];
        const backfired = response.outcome === 'BACKFIRED';
        const landed = response.outcome === 'LANDED';
        return [{
            id: `response:${response.id}`,
            personalityId,
            subjectKey: story.subjectKey,
            subjectName: story.companyName || 'The subject',
            absoluteWeek: response.resolvedAbsoluteWeek,
            sentiment: landed ? 12 : backfired ? -18 : response.outcome === 'MIXED' ? -3 : 0,
            hostile: backfired && ['CHALLENGE', 'DEFEND'].includes(response.tone),
            industryEventId: response.industryEventId,
            playerRelated: discussion?.isPlayerRelated,
        }];
    });
    const claimInteractions = media.claims.flatMap(claim => {
        if (!claim.personalityId || !claim.resolution) return [];
        const sentiment = claim.resolution.status === 'REFUTED' ? -12
            : claim.resolution.status === 'CONFIRMED' ? 8 : claim.resolution.status === 'PARTLY_CONFIRMED' ? 3 : 0;
        return [{
            id: `claim:${claim.id}:${claim.resolution.status}`,
            personalityId: claim.personalityId,
            subjectKey: claim.subjectKey,
            subjectName: claim.subjectName,
            absoluteWeek: claim.resolution.absoluteWeek,
            sentiment,
            hostile: claim.resolution.status === 'REFUTED' && claim.kind !== 'PREDICTION',
            industryEventId: claim.resolution.eventIds[0] || claim.anchorIndustryEventId,
            playerRelated: claim.playerRelated,
        }];
    });
    return [...responseInteractions, ...claimInteractions];
};

const createRelationship = (
    personality: IndustryMediaPersonality,
    interaction: IndustryMediaRelationshipInteraction,
): IndustryMediaRelationship => {
    const key = relationshipKeyFor(interaction);
    return {
        schemaVersion: 1,
        id: createDeterministicId('industry_media_relationship', key),
        relationshipKey: key,
        personalityId: personality.id,
        subjectKey: interaction.subjectKey,
        subjectName: interaction.subjectName,
        affinity: clamp(personality.baselinePlayerAffinity, ...affinityBounds(personality)),
        respect: 50,
        trust: 50,
        tension: 0,
        familiarity: 0,
        direction: 'STABLE',
        feudState: 'NONE',
        conflictEventIds: [],
        conflictAbsoluteWeeks: [],
        landmarkInteractionIds: [],
        firstInteractionAbsoluteWeek: interaction.absoluteWeek,
        lastMeaningfulInteractionAbsoluteWeek: interaction.absoluteWeek,
        playerRelated: Boolean(interaction.playerRelated),
    };
};

const feudStateFor = (
    previous: IndustryMediaFeudState,
    conflictWeeks: number,
    tension: number,
    reconciliation: boolean,
): IndustryMediaFeudState => {
    if (reconciliation && ['ACTIVE', 'COOLING', 'BUILDING'].includes(previous)) return 'RESOLVED';
    if (conflictWeeks >= 3 && tension >= 50) return 'ACTIVE';
    if (conflictWeeks >= 2 && tension >= 28) return 'BUILDING';
    return previous === 'RESOLVED' ? 'RESOLVED' : 'NONE';
};

const applyInteraction = (
    relationship: IndustryMediaRelationship,
    interaction: IndustryMediaRelationshipInteraction,
    personality: IndustryMediaPersonality,
): IndustryMediaRelationship => {
    const sentiment = clamp(interaction.sentiment, -100, 100);
    const [minimumAffinity, maximumAffinity] = affinityBounds(personality);
    const affinity = clamp(relationship.affinity + sentiment * 0.55, minimumAffinity, maximumAffinity);
    const respect = clamp(relationship.respect + (sentiment >= 0 ? Math.max(1, sentiment * 0.2) : sentiment * 0.08), 0, 100);
    const trust = clamp(relationship.trust + sentiment * 0.18, 0, 100);
    const tension = clamp(
        relationship.tension + (interaction.hostile ? Math.max(8, Math.abs(sentiment) * 0.65) : -Math.max(2, sentiment * 0.25)),
        0,
        100,
    );
    const conflictEventId = interaction.hostile ? interaction.industryEventId || interaction.id : undefined;
    const conflictEventIds = conflictEventId
        ? [...new Set([...relationship.conflictEventIds, conflictEventId])].slice(-12)
        : relationship.conflictEventIds;
    const conflictAbsoluteWeeks = interaction.hostile
        ? [...new Set([...relationship.conflictAbsoluteWeeks, interaction.absoluteWeek])].sort((left, right) => left - right).slice(-12)
        : relationship.conflictAbsoluteWeeks;
    const conflictWeeks = conflictAbsoluteWeeks.length;
    const feudState = feudStateFor(relationship.feudState, conflictWeeks, tension, Boolean(interaction.reconciliation));
    return {
        ...relationship,
        subjectName: interaction.subjectName,
        affinity,
        respect,
        trust,
        tension: feudState === 'RESOLVED' ? Math.min(tension, 32) : tension,
        familiarity: clamp(relationship.familiarity + 8, 0, 100),
        direction: sentiment > 2 ? 'IMPROVING' : sentiment < -2 ? 'WORSENING' : 'STABLE',
        feudState,
        conflictEventIds,
        conflictAbsoluteWeeks,
        landmarkInteractionIds: [...new Set([...relationship.landmarkInteractionIds, interaction.id])].slice(-12),
        lastMeaningfulInteractionAbsoluteWeek: Math.max(relationship.lastMeaningfulInteractionAbsoluteWeek, interaction.absoluteWeek),
        ...(interaction.industryEventId ? { lastIndustryEventId: interaction.industryEventId } : {}),
        playerRelated: relationship.playerRelated || Boolean(interaction.playerRelated),
    };
};

export interface IndustryMediaRelationshipResult {
    player: Player;
    relationships: IndustryMediaRelationship[];
    changedRelationshipIds: string[];
}

export const advanceIndustryMediaRelationships = (
    player: Player,
    absoluteWeek: number,
    context: IndustryMediaRelationshipContext = {},
): IndustryMediaRelationshipResult => {
    const media = normalizeIndustryMediaWorld(player.world.industryMedia);
    const personalities = new Map(media.personalities.map(item => [item.id, item]));
    const processed = new Set(media.processedC7Keys);
    const relationships = [...media.mediaRelationships];
    const changed = new Set<string>();

    const interactions = [...(context.interactions || deriveInteractions(media))]
        .filter(item => item.absoluteWeek <= absoluteWeek)
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id));
    interactions.forEach(interaction => {
        const processKey = `relationship:interaction:${interaction.id}`;
        const personality = personalities.get(interaction.personalityId);
        if (processed.has(processKey) || !personality || !interaction.subjectKey || !interaction.subjectName) return;
        const key = relationshipKeyFor(interaction);
        let index = relationships.findIndex(item => item.relationshipKey === key);
        if (index < 0) {
            relationships.push(createRelationship(personality, interaction));
            index = relationships.length - 1;
        }
        relationships[index] = applyInteraction(relationships[index], interaction, personality);
        processed.add(processKey);
        changed.add(relationships[index].id);
    });

    relationships.forEach((relationship, index) => {
        const idleWeeks = absoluteWeek - relationship.lastMeaningfulInteractionAbsoluteWeek;
        if (relationship.feudState === 'ACTIVE' && idleWeeks >= 12) {
            relationships[index] = { ...relationship, feudState: 'COOLING', direction: 'STABLE', tension: clamp(relationship.tension - 12, 0, 100) };
            changed.add(relationship.id);
        } else if (relationship.feudState === 'COOLING' && idleWeeks >= 28) {
            relationships[index] = { ...relationship, feudState: 'RESOLVED', direction: 'STABLE', tension: clamp(relationship.tension - 20, 0, 100) };
            changed.add(relationship.id);
        }
    });

    if (!changed.size) return { player, relationships: media.mediaRelationships, changedRelationshipIds: [] };
    const stanceByKey = new Map(media.subjectStances.map(item => [`${item.personalityId}:${item.subjectKey}`, item]));
    relationships.forEach(relationship => {
        if (!changed.has(relationship.id)) return;
        stanceByKey.set(relationship.relationshipKey, {
            id: createDeterministicId('industry_media_stance', relationship.relationshipKey),
            personalityId: relationship.personalityId,
            subjectKey: relationship.subjectKey,
            affinity: relationship.affinity,
            lastUpdatedAbsoluteWeek: absoluteWeek,
            ...(relationship.lastIndustryEventId ? { lastIndustryEventId: relationship.lastIndustryEventId } : {}),
        });
    });
    const nextMedia = normalizeIndustryMediaWorld({
        ...media,
        mediaRelationships: relationships,
        subjectStances: [...stanceByKey.values()],
        processedC7Keys: [...processed],
    });
    const nextPlayer = { ...player, world: { ...player.world, industryMedia: nextMedia } };
    return {
        player: nextPlayer,
        relationships: nextMedia.mediaRelationships,
        changedRelationshipIds: [...changed],
    };
};

export const describeIndustryMediaRelationship = (relationship: IndustryMediaRelationship): string => {
    if (relationship.feudState === 'ACTIVE') return 'An active public feud is driving a hostile media rivalry.';
    if (relationship.feudState === 'BUILDING') return 'Repeated clashes are building into a recognizable rivalry.';
    if (relationship.feudState === 'COOLING') return 'The public feud is cooling after a quieter period.';
    if (relationship.feudState === 'RESOLVED') return 'The former conflict has settled into guarded professional respect.';
    if (relationship.affinity >= 35) return 'A consistently supportive professional relationship.';
    if (relationship.affinity <= -35) return 'A skeptical and often hostile media relationship.';
    return 'A mixed professional relationship shaped by recent coverage.';
};
