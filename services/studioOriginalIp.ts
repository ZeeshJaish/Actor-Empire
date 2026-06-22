import { ActiveRelease, OwnedRight, PastProject, Script } from '../types';

interface DeriveStudioOriginalRightsInput {
    studioId: string;
    scripts: Script[];
    activeReleases: ActiveRelease[];
    pastProjects: PastProject[];
    acquiredRights: OwnedRight[];
    purchasedIPTitles?: string[];
}

interface OriginalReleaseCandidate {
    id: string;
    name: string;
    genre: PastProject['genre'];
    franchiseId?: string;
    universeId?: string;
    sourceScriptId?: string;
    isOriginal?: boolean;
    subjectName?: string;
    gross: number;
    rating: number;
    releaseYear: number;
    releaseWeek: number;
    releaseSortValue: number;
}

const normalize = (value?: string) => (value || '').trim().toLocaleLowerCase();

const getRarity = (gross: number, rating: number): OwnedRight['rarity'] => {
    if (gross >= 750_000_000 || rating >= 8.5) return 'LEGENDARY';
    if (gross >= 300_000_000 || rating >= 7.8) return 'RARE';
    if (gross >= 100_000_000 || rating >= 7) return 'UNCOMMON';
    return 'COMMON';
};

const getAccent = (genre: PastProject['genre']) => {
    if (genre === 'SUPERHERO' || genre === 'SCI_FI') return '#6d5dfc';
    if (genre === 'HORROR' || genre === 'THRILLER') return '#ef4444';
    if (genre === 'FANTASY' || genre === 'ANIMATION') return '#a855f7';
    if (genre === 'COMEDY' || genre === 'ROMANCE') return '#f59e0b';
    return '#38bdf8';
};

export const deriveStudioOriginalRights = ({
    studioId,
    scripts,
    activeReleases,
    pastProjects,
    acquiredRights,
    purchasedIPTitles = [],
}: DeriveStudioOriginalRightsInput): OwnedRight[] => {
    const scriptsById = new Map(scripts.map(script => [script.id, script]));
    const originalScriptTitles = new Set(scripts.filter(script => script.isOriginal).map(script => normalize(script.title)));
    const acquiredTitles = new Set(acquiredRights.map(right => normalize(right.title)));
    const purchasedTitles = new Set(purchasedIPTitles.map(normalize));

    const candidates: OriginalReleaseCandidate[] = [
        ...activeReleases
            .filter(release => release.projectDetails.studioId === studioId)
            .map(release => ({
                id: release.id,
                name: release.name,
                genre: release.projectDetails.genre,
                franchiseId: release.projectDetails.franchiseId,
                universeId: release.projectDetails.universeId,
                sourceScriptId: release.projectDetails.sourceScriptId,
                isOriginal: release.projectDetails.isOriginal,
                subjectName: release.projectDetails.subjectName,
                gross: Math.max(0, Number(release.totalGross || 0)) + Math.max(0, Number(release.streamingRevenue || 0)),
                rating: Number(release.imdbRating || 0),
                releaseYear: release.releaseYear || 1,
                releaseWeek: release.releaseWeek || 1,
                releaseSortValue: release.releasedAtAbsoluteWeek || ((release.releaseYear || 1) * 52) + (release.releaseWeek || 1),
            })),
        ...pastProjects
            .filter(project => project.studioId === studioId)
            .map(project => ({
                id: project.id,
                name: project.name,
                genre: project.genre,
                franchiseId: project.franchiseId,
                universeId: project.universeId,
                sourceScriptId: project.sourceScriptId,
                isOriginal: project.isOriginal,
                subjectName: project.subjectName,
                gross: Math.max(0, Number(project.gross || 0)) + Math.max(0, Number(project.streamingRevenue || 0)),
                rating: Number(project.imdbRating || project.rating || 0),
                releaseYear: project.releaseYear || project.year || 1,
                releaseWeek: project.releaseWeek || 1,
                releaseSortValue: project.releasedAtAbsoluteWeek || ((project.releaseYear || project.year || 1) * 52) + (project.releaseWeek || 1),
            })),
    ].filter(candidate => {
        if (candidate.subjectName && acquiredTitles.has(normalize(candidate.subjectName))) return false;
        if (candidate.isOriginal === true) return true;
        const sourceScript = candidate.sourceScriptId ? scriptsById.get(candidate.sourceScriptId) : undefined;
        if (sourceScript) return sourceScript.isOriginal;
        if (originalScriptTitles.has(normalize(candidate.name))) return true;
        return !candidate.subjectName && !purchasedTitles.has(normalize(candidate.name));
    });

    const groups = new Map<string, OriginalReleaseCandidate[]>();
    candidates.forEach(candidate => {
        const key = candidate.franchiseId || candidate.id;
        groups.set(key, [...(groups.get(key) || []), candidate]);
    });

    return [...groups.entries()].map(([groupId, releases]) => {
        const ordered = [...releases].sort((a, b) => a.releaseSortValue - b.releaseSortValue);
        const first = ordered[0];
        const totalGross = releases.reduce((sum, release) => sum + release.gross, 0);
        const bestRating = Math.max(0, ...releases.map(release => release.rating));
        const franchiseId = first.franchiseId || (releases.length > 1 ? groupId : undefined);
        return {
            id: `studio_original_${groupId}`,
            sourceOpportunityId: `studio_original_${groupId}`,
            sourceProjectId: first.id,
            title: first.name,
            sellerName: 'Created In-House',
            propertyType: franchiseId ? 'FRANCHISE' : 'STORY_WORLD',
            archetype: 'PRESTIGE_PROPERTY',
            primaryGenre: first.genre,
            rarity: getRarity(totalGross, bestRating),
            accent: getAccent(first.genre),
            emblemKey: franchiseId ? 'SHIELD' : 'BOOK',
            dealType: 'BUYOUT',
            purchasePrice: 0,
            acquiredWeek: first.releaseWeek,
            acquiredYear: first.releaseYear,
            projectsUsed: releases.length,
            status: 'ACTIVE',
            ownershipSource: 'STUDIO_ORIGINAL',
            franchiseId,
            universeId: releases.find(release => release.universeId)?.universeId,
        } satisfies OwnedRight;
    }).sort((a, b) => b.acquiredYear - a.acquiredYear || b.acquiredWeek - a.acquiredWeek);
};
