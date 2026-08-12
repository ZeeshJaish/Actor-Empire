import { NPCActor, Relationship } from '../types';

const isDirectorRelationship = (relationship: Relationship): boolean => (
    relationship.relation === 'Director' || relationship.relation === 'Connection'
);

const getRelationshipNpcId = (relationship: Relationship): string => (
    relationship.npcId || relationship.id
);

const createLegacyDirectorCandidate = (relationship: Relationship): NPCActor => {
    const closeness = Math.max(0, Math.min(100, Number(relationship.closeness) || 0));
    const safeName = relationship.name?.trim() || 'Trusted Director';
    const handleName = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'trusted';

    return {
        id: getRelationshipNpcId(relationship),
        name: safeName,
        handle: `@${handleName}_director`,
        gender: relationship.gender || 'NON_BINARY',
        avatar: relationship.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=18181b&color=ffffff`,
        tier: closeness >= 85 ? 'ESTABLISHED' : closeness >= 60 ? 'RISING' : 'INDIE',
        prestigeBias: 'MIXED',
        openness: Math.round(Math.min(95, 40 + closeness * 0.5)),
        followers: Math.round(25_000 + closeness * 12_500),
        netWorth: Math.round(500_000 + closeness * 75_000),
        occupation: 'DIRECTOR',
        bio: 'A trusted directing connection from your professional network.',
        stats: {
            talent: Math.round(48 + closeness * 0.35),
            fame: Math.round(15 + closeness * 0.35)
        }
    };
};

/**
 * Resolves every director in the player's professional network.
 *
 * Old saves can contain a dedicated Director relationship whose NPC is no
 * longer present in the current database. Those records receive a safe,
 * deterministic candidate so the connection remains usable after migration.
 * A generic Connection is only accepted when its source NPC is known to be a
 * director, preventing actor connections from leaking into the director list.
 */
export const getConnectedDirectorCandidates = (
    relationships: Relationship[] = [],
    candidatePool: NPCActor[] = []
): NPCActor[] => {
    const candidatesById = new Map(candidatePool.map(candidate => [candidate.id, candidate]));
    const seenIds = new Set<string>();
    const connectedDirectors: NPCActor[] = [];

    relationships.filter(isDirectorRelationship).forEach(relationship => {
        const npcId = getRelationshipNpcId(relationship);
        if (!npcId || seenIds.has(npcId)) return;

        const sourceCandidate = candidatesById.get(npcId);
        const director = sourceCandidate?.occupation === 'DIRECTOR'
            ? sourceCandidate
            : (!sourceCandidate && relationship.relation === 'Director'
                ? createLegacyDirectorCandidate(relationship)
                : null);

        if (!director) return;
        seenIds.add(npcId);
        connectedDirectors.push(director);
    });

    return connectedDirectors;
};

export const getDirectorConnectionDiscount = (closeness: number): number => {
    const safeCloseness = Math.max(0, Math.min(100, Number(closeness) || 0));
    if (safeCloseness <= 50) return 0;
    return Math.min(0.6, (safeCloseness - 50) / 100 + 0.1);
};
