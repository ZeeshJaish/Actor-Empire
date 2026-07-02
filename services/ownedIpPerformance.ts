import { ActiveRelease, OwnedRight, PastProject, ProjectType, Script } from '../types';

export type OwnedIpAudienceStrength = 'UNPROVEN' | 'NICHE' | 'GROWING' | 'STRONG' | 'MASSIVE';
export type OwnedIpMomentum = 'UNPROVEN' | 'HOT' | 'RISING' | 'STEADY' | 'COOLING';

export interface OwnedIpReleaseSummary {
    id: string;
    title: string;
    projectType: ProjectType;
    state: 'IN THEATERS' | 'STREAMING BIDDING' | 'STREAMING' | 'RELEASED';
    gross: number;
    rating: number | null;
    totalViews: number;
    awardsWon: number;
    releasedAtAbsoluteWeek: number;
    source: 'ACTIVE' | 'COMPLETED';
}

export interface OwnedIpPerformance {
    linkedScripts: Script[];
    releases: OwnedIpReleaseSummary[];
    lifetimeGross: number;
    averageRating: number | null;
    awardsWon: number;
    audienceStrength: OwnedIpAudienceStrength;
    momentum: OwnedIpMomentum;
}

interface GetOwnedIpPerformanceInput {
    ownedRight: OwnedRight;
    studioId: string;
    scripts: Script[];
    activeReleases: ActiveRelease[];
    pastProjects: PastProject[];
}

const normalizeSubject = (value?: string) => (value || '').trim().toLocaleLowerCase();

const getReleaseSortValue = (item: {
    releasedAtAbsoluteWeek?: number;
    releaseYear?: number;
    releaseWeek?: number;
    year?: number;
}) => item.releasedAtAbsoluteWeek
    ?? ((item.releaseYear ?? item.year ?? 0) * 52) + (item.releaseWeek ?? 0);

const getActiveReleaseState = (release: ActiveRelease): OwnedIpReleaseSummary['state'] => {
    if (release.distributionPhase === 'STREAMING') return 'STREAMING';
    if (release.distributionPhase === 'STREAMING_BIDDING') return 'STREAMING BIDDING';
    return 'IN THEATERS';
};

const getAudienceStrength = (releases: OwnedIpReleaseSummary[]): OwnedIpAudienceStrength => {
    if (releases.length === 0) return 'UNPROVEN';

    const totalGross = releases.reduce((sum, release) => sum + release.gross, 0);
    const grossPerRelease = totalGross / releases.length;
    const ratings = releases.flatMap(release => release.rating === null ? [] : [release.rating]);
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    const totalViews = releases.reduce((sum, release) => sum + release.totalViews, 0);

    let score = grossPerRelease >= 500_000_000 ? 4
        : grossPerRelease >= 200_000_000 ? 3
            : grossPerRelease >= 75_000_000 ? 2
                : grossPerRelease > 0 ? 1 : 0;
    score += averageRating >= 8 ? 3 : averageRating >= 7.2 ? 2 : averageRating >= 6.5 ? 1 : 0;
    score += totalViews >= 100_000_000 ? 2 : totalViews >= 25_000_000 ? 1 : 0;
    if (releases.length >= 3) score += 1;

    if (score >= 7) return 'MASSIVE';
    if (score >= 5) return 'STRONG';
    if (score >= 3) return 'GROWING';
    return 'NICHE';
};

const getMomentum = (
    matchedActiveReleases: ActiveRelease[],
    matchedPastProjects: PastProject[],
): OwnedIpMomentum => {
    const newestActive = [...matchedActiveReleases].sort((a, b) => getReleaseSortValue(b) - getReleaseSortValue(a))[0];
    if (newestActive) {
        if (newestActive.status === 'BLOCKBUSTER_TRACK') return 'HOT';
        if (newestActive.status === 'RUNNING') return 'RISING';
        if (newestActive.status === 'FLOP_WARNING') return 'COOLING';
        return 'STEADY';
    }

    const newestCompleted = [...matchedPastProjects].sort((a, b) => getReleaseSortValue(b) - getReleaseSortValue(a))[0];
    if (!newestCompleted) return 'UNPROVEN';
    if (newestCompleted.outcomeTier === 'MASSIVE_SUCCESS') return 'HOT';
    if (newestCompleted.outcomeTier === 'SUCCESS') return 'RISING';
    if (newestCompleted.outcomeTier === 'FAILURE' || newestCompleted.outcomeTier === 'MAJOR_FAILURE') return 'COOLING';
    return 'STEADY';
};

export const getOwnedIpPerformance = ({
    ownedRight,
    studioId,
    scripts,
    activeReleases,
    pastProjects,
}: GetOwnedIpPerformanceInput): OwnedIpPerformance => {
    const tag = `OWNED_RIGHT:${ownedRight.id}`;
    const subject = normalizeSubject(ownedRight.title);
    const matchesSubject = (value?: string) => normalizeSubject(value) === subject;
    const isStudioOriginal = ownedRight.ownershipSource === 'STUDIO_ORIGINAL';
    const matchesOriginalProject = (project: { id: string; franchiseId?: string }) => ownedRight.franchiseId
        ? project.franchiseId === ownedRight.franchiseId
        : project.id === ownedRight.sourceProjectId;

    const linkedScripts = scripts.filter(script => isStudioOriginal
        ? Boolean(ownedRight.franchiseId && script.franchiseId === ownedRight.franchiseId)
        : script.tags?.includes(tag));
    const matchedActiveReleases = activeReleases.filter(release => (
        release.projectDetails.studioId === studioId
        && (isStudioOriginal
            ? matchesOriginalProject({ id: release.id, franchiseId: release.projectDetails.franchiseId })
            : matchesSubject(release.projectDetails.subjectName))
    ));
    const matchedPastProjects = pastProjects.filter(project => (
        project.studioId === studioId
        && (isStudioOriginal
            ? matchesOriginalProject({ id: project.id, franchiseId: project.franchiseId })
            : matchesSubject(project.subjectName))
    ));

    const releases: OwnedIpReleaseSummary[] = [
        ...matchedActiveReleases.map(release => ({
            id: release.id,
            title: release.name,
            projectType: release.type,
            state: getActiveReleaseState(release),
            gross: Math.max(0, Number(release.totalGross || 0)) + Math.max(0, Number(release.streamingRevenue || 0)) + Math.max(0, Number(release.soundtrackRevenue || 0)),
            rating: typeof release.imdbRating === 'number' ? release.imdbRating : null,
            totalViews: Math.max(0, Number(release.streaming?.totalViews || 0)),
            awardsWon: 0,
            releasedAtAbsoluteWeek: getReleaseSortValue(release),
            source: 'ACTIVE' as const,
        })),
        ...matchedPastProjects.map(project => ({
            id: project.id,
            title: project.name,
            projectType: project.projectType,
            state: 'RELEASED' as const,
            gross: Math.max(0, Number(project.gross || 0)) + Math.max(0, Number(project.streamingRevenue || 0)) + Math.max(0, Number(project.soundtrackRevenue || 0)),
            rating: typeof project.imdbRating === 'number'
                ? project.imdbRating
                : typeof project.rating === 'number' ? project.rating : null,
            totalViews: Math.max(0, Number(project.totalViews || 0)),
            awardsWon: project.awards?.filter(award => award.outcome === 'WON').length || 0,
            releasedAtAbsoluteWeek: getReleaseSortValue(project),
            source: 'COMPLETED' as const,
        })),
    ].sort((a, b) => b.releasedAtAbsoluteWeek - a.releasedAtAbsoluteWeek);

    const lifetimeGross = releases.reduce((sum, release) => sum + release.gross, 0);
    const ratings = releases.flatMap(release => release.rating === null ? [] : [release.rating]);
    const averageRating = ratings.length > 0
        ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100
        : null;
    const awardsWon = releases.reduce((sum, release) => sum + release.awardsWon, 0);

    return {
        linkedScripts,
        releases,
        lifetimeGross,
        averageRating,
        awardsWon,
        audienceStrength: getAudienceStrength(releases),
        momentum: getMomentum(matchedActiveReleases, matchedPastProjects),
    };
};
