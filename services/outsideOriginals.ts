import type { BudgetTier, IndustryProject, PastProject, Player, ProjectDetails } from '../types';

/**
 * #288: an Original made by an outside studio runs through the ordinary project engine, but it is not the player's work. These say so wherever
 * the game reads a project as the player's career: credits, role history, heirs. It is the platform's title, so it stays on its shelves.
 */
export const isOutsideOriginal = (row: unknown): boolean => {
    const source = row as { outsideOriginal?: boolean; projectDetails?: { hiddenStats?: { outsideOriginal?: boolean } } } | null | undefined;
    return Boolean(source?.outsideOriginal || source?.projectDetails?.hiddenStats?.outsideOriginal);
};

/** The player's own filmography: everything archived but what another studio made for the platform */
export const getCareerProjects = (player: Pick<Player, 'pastProjects'>): PastProject[] => (
    (player.pastProjects || []).filter(project => !isOutsideOriginal(project))
);

/** Whose name the reviews praise: its lead, or the studio when there is no one to name */
export const getOutsideReviewName = (details: ProjectDetails, studioName: string): string => {
    const cast = details.castList || [];
    return (cast.find(member => member.roleType === 'LEAD') || cast[0])?.name || studioName;
};

const tierFor = (budget: number): BudgetTier => (budget < 25_000_000 ? 'LOW' : budget < 80_000_000 ? 'MID' : budget < 180_000_000 ? 'HIGH' : 'BLOCKBUSTER');

/**
 * #293: to the award shows these titles are the studio's, like anything else in the world: they compete for Best Series and their people for their categories.
 * They are not world projects: a world row is what other services license, and these are exclusive.
 */
export const getOutsideOriginalAwardRows = (player: Pick<Player, 'pastProjects'>): IndustryProject[] => (
    (player.pastProjects || []).filter(isOutsideOriginal).map((row: any): IndustryProject => {
        const lead = (row.castList || []).find((member: any) => member.roleType === 'LEAD') || row.castList?.[0];
        return {
            id: String(row.id),
            title: String(row.name),
            genre: row.genre,
            mediaType: row.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
            studioId: row.studioId,
            budgetTier: tierFor(Number(row.budget || 0)),
            quality: Number(row.projectQuality || 0),
            rating: Number(row.imdbRating || row.rating || 0),
            boxOffice: 0,
            year: Number(row.releaseYear ?? row.year),
            weekReleased: Number(row.releaseWeek || 1),
            leadActorId: String(lead?.actorId || ''),
            leadActorName: String(lead?.name || ''),
            directorId: row.directorId,
            directorName: String(row.directorName || ''),
            writerId: row.writerId,
            writerName: row.writerName,
            reviews: 'A platform Original',
        } as IndustryProject;
    })
);
