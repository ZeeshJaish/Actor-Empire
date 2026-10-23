import type { NPCState, Player, Relationship } from '../types';

type RelationshipPlayer = Pick<Player, 'relationships' | 'instagram'>;
const boundedScore = (score: number): number => Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

/** hasMet is set by Befriend; an NPC identity or matching name alone is not a link. */
export const getLinkedNpcRelationship = (player: RelationshipPlayer, npcId: string): Relationship | undefined => (
    player.instagram?.npcStates?.[npcId]?.hasMet
        ? player.relationships.find(relationship => relationship.npcId === npcId)
        : undefined
);

/** Once befriended, the Social bond owns both displays and interaction requirements. */
export const getNpcRelationshipScore = (player: RelationshipPlayer, npcId: string): number => boundedScore(
    getLinkedNpcRelationship(player, npcId)?.closeness
        ?? player.instagram?.npcStates?.[npcId]?.relationshipScore
        ?? 0,
);

/** Mirror only proven links. Preserve independent Instagram contacts, follows and chats. */
export const getSyncedNpcStates = (player: RelationshipPlayer): Record<string, NPCState> => {
    const original = player.instagram?.npcStates || {};
    let states = original;
    const seen = new Set<string>();
    for (const relationship of player.relationships) {
        const npcId = relationship.npcId;
        if (!npcId || seen.has(npcId)) continue;
        // Match getLinkedNpcRelationship's first identity without merging legacy contacts.
        seen.add(npcId);
        const state = original[npcId];
        if (!state?.hasMet) continue;
        const score = boundedScore(relationship.closeness);
        if (state.relationshipScore === score && state.lastInteractionWeek === relationship.lastInteractionWeek) continue;
        if (states === original) states = { ...original };
        states[npcId] = { ...state, relationshipScore: score, lastInteractionWeek: relationship.lastInteractionWeek };
    }
    return states;
};

export const syncLinkedNpcRelationships = (player: Player): Player => {
    const npcStates = getSyncedNpcStates(player);
    return npcStates === player.instagram?.npcStates
        ? player
        : { ...player, instagram: { ...player.instagram, npcStates } };
};
