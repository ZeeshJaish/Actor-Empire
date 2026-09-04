import type {
    IndustryProject,
    IndustryProductionCommitment,
    NewsItem,
    Player,
    WorldState,
} from '../../types';

const toAbsoluteWeek = (year: number, week: number) => ((Math.max(1, year) - 1) * 52) + (Math.max(1, week) - 1);
const toYearWeek = (absoluteWeek: number) => ({
    year: Math.floor(Math.max(0, absoluteWeek) / 52) + 1,
    week: (Math.max(0, absoluteWeek) % 52) + 1,
});

const budgetTier = (budgetMillions: number): IndustryProject['budgetTier'] => (
    budgetMillions >= 150 ? 'BLOCKBUSTER' : budgetMillions >= 80 ? 'HIGH' : budgetMillions >= 30 ? 'MID' : 'LOW'
);

const getScheduledRelease = (production: IndustryProductionCommitment) => {
    const execution = production.studioAiExecution;
    if (!execution?.plannedReleaseAbsoluteWeek || execution.publicReleaseStrategy !== 'THEATRICAL') return null;
    if (production.status === 'CANCELLED' || production.status === 'RELEASED') return null;
    return execution.plannedReleaseAbsoluteWeek;
};

/**
 * Adapts the canonical B6 production schedule to the old Release Wizard card
 * shape. It does not create a second schedule or mutate the source records.
 */
export const getCanonicalScheduledRivals = (
    world: WorldState,
    currentAbsoluteWeek: number,
    horizonWeeks = 12,
): IndustryProject[] => Object.values(world.industryProductions || {})
    .map(production => ({ production, releaseWeek: getScheduledRelease(production) }))
    .filter((entry): entry is { production: IndustryProductionCommitment; releaseWeek: number } => (
        entry.releaseWeek !== null
        && entry.releaseWeek > currentAbsoluteWeek
        && entry.releaseWeek <= currentAbsoluteWeek + Math.max(1, horizonWeeks)
    ))
    .sort((left, right) => left.releaseWeek - right.releaseWeek || left.production.id.localeCompare(right.production.id))
    .map(({ production, releaseWeek }) => {
        const calendar = toYearWeek(releaseWeek);
        const visibleWizardWeek = toYearWeek(currentAbsoluteWeek).week + (releaseWeek - currentAbsoluteWeek);
        const quality = production.studioAiExecution?.finalQuality;
        const talent = production.studioAiExecution?.talent;
        return {
            id: production.canonicalProjectId,
            title: production.title,
            genre: production.genre,
            mediaType: production.projectType,
            studioId: production.producerStudioId,
            physicalProducerStudioId: production.producerStudioId,
            budgetTier: budgetTier(production.budgetMillions),
            quality: Math.round(quality?.creativeQuality || 60),
            boxOffice: 0,
            year: calendar.year,
            weekReleased: visibleWizardWeek,
            leadActorId: talent?.leadActorId || '',
            leadActorName: talent?.leadActorName || 'Cast not announced',
            directorId: talent?.directorId,
            directorName: talent?.directorName || 'Director not announced',
            reviews: 'Scheduled release',
            universeId: production.universeId,
            releaseStrategy: 'THEATRICAL',
            studioAiSlateCommitmentId: production.studioAiSlateCommitmentId,
            industryContentFingerprintId: production.industryContentFingerprintId,
        };
    });

/** Canonical released rival titles that are still inside a theatrical chart run. */
export const getCanonicalReleasedMarketProjects = (
    world: WorldState,
    currentAbsoluteWeek: number,
    chartRunWeeks = 8,
): IndustryProject[] => (world.projects || [])
    .filter(project => project.releaseStrategy !== 'STREAMING_ONLY' && project.boxOffice > 0)
    .filter(project => {
        const releasedAt = toAbsoluteWeek(project.year, project.weekReleased);
        return releasedAt <= currentAbsoluteWeek && releasedAt >= currentAbsoluteWeek - Math.max(1, chartRunWeeks) + 1;
    })
    .sort((left, right) => right.boxOffice - left.boxOffice || left.id.localeCompare(right.id));

export interface PublicIndustryProjection {
    projectId: string;
    productionId: string | null;
    imdb: { projectId: string; project: IndustryProject } | null;
    boxOffice: { projectId: string; project: IndustryProject } | null;
    awards: { projectId: string; project: IndustryProject } | null;
    news: Array<NewsItem & { projectId: string }>;
}

/** One read model for every public surface; all IDs remain canonical. */
export const buildPublicIndustryProjection = (player: Player, projectId: string): PublicIndustryProjection => {
    const project = (player.world.projects || []).find(candidate => candidate.id === projectId) || null;
    const production = Object.values(player.world.industryProductions || {})
        .find(candidate => candidate.canonicalProjectId === projectId) || null;
    const news = (player.news || [])
        .filter((item): item is NewsItem & { projectId: string } => item.projectId === projectId)
        .sort((left, right) => (right.year - left.year) || (right.week - left.week) || left.id.localeCompare(right.id));
    const isTheatrical = Boolean(project && project.releaseStrategy !== 'STREAMING_ONLY' && project.boxOffice > 0);
    return {
        projectId,
        productionId: production?.id || null,
        imdb: project ? { projectId, project } : null,
        boxOffice: isTheatrical && project ? { projectId, project } : null,
        awards: project?.awardProfile ? { projectId, project } : null,
        news,
    };
};
