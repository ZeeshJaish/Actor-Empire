import type { MarketingChannelAllocations, Player, ProjectDetails } from '../../types';
import { getAbsoluteWeek, getInheritedStudioProjects } from '../legacyLogic';
import { calculateStudioPrestigeScore } from '../studioPrestige';
import { WORLD_COUNTRY_DEFINITIONS } from '../worldEconomy/worldCountryRegistry';
import { normalizeCinemaTitle } from './boxOfficeInputs';
import { appendCinemaExposureEvent, buildCinemaExposure, getCinemaRecognitionShare, projectCinemaForecastInput, readCinemaExposureRecord } from './boxOfficeAwareness';
import { CINEMA_EXPOSURE_PROFILE, CINEMA_EXPOSURE_TUNING_VERSION } from './boxOfficeProfiles';
import type { CinemaExposureCohort, CinemaExposureInput, CinemaExposureRecord, CinemaKnownInputs } from './boxOfficeTypes';

const score = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const money = (value: number): number => {
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) throw new RangeError('Invalid committed cinema campaign cost');
    return Math.round(value * 100);
};
const studioSignals = (player: Player, studioId: string): CinemaExposureInput['studio'] => {
    // A real released career establishes recognition, never affection or default business health.
    const history = [...(player.pastProjects || []), ...getInheritedStudioProjects(player, studioId)]
        .filter(p => p.studioId === studioId && (p.gross > 0 || (p.totalViews || 0) > 0));
    const unique = [...new Map(history.map(p => [p.id, p])).values()];
    return { releasedTitleCount: unique.length, prestige: calculateStudioPrestigeScore(unique),
        brandHealth: player.businesses?.find(b => b.id === studioId)?.stats.brandHealth || 0 };
};
export const getCinemaExposureCohorts = (player: Player): CinemaExposureCohort[] => (
    Object.values(player.world.worldAudienceEconomy?.countries || {}).flatMap(country => country.cohorts.map(cohort => ({
        id: `${country.id}:${cohort.id}`, countryId: country.id, people: cohort.people,
    })))
);
const packageInput = (player: Player, project: ProjectDetails, titleId: string): CinemaExposureInput => {
    const title = normalizeCinemaTitle({ titleId, project, player, owner: { id: project.studioId, route: 'PLAYER_STUDIO' } });
    const record = readCinemaExposureRecord(project);
    return { titleId, absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek), cast: title.cast,
        studio: studioSignals(player, project.studioId), storyAttention: record.storyAttention || 0, musicAttention: record.musicAttention || 0,
        cohorts: getCinemaExposureCohorts(player), events: record.events };
};

/** Private package construction does not create a public source or mutate world audiences. */
export const prepareCinemaPackageExposure = ({ player, project, titleId, storyAttention, musicAttention }: {
    player: Player; project: ProjectDetails; titleId: string; storyAttention: number; musicAttention: number;
}): CinemaExposureRecord => {
    const input = { ...packageInput(player, project, titleId), storyAttention: score(storyAttention), musicAttention: score(musicAttention), events: [] };
    return { version: 1, attentionBasis: 'PACKAGE', attentionPotential: buildCinemaExposure(input).attentionPotential,
        storyAttention: input.storyAttention, musicAttention: input.musicAttention, events: [] };
};

/** Called at a real public Greenlight/release confirmation, never a private estimate. */
export const commitCinemaAnnouncement = (player: Player, project: ProjectDetails, titleId: string, absoluteWeek: number): ProjectDetails => {
    if (project.type !== 'MOVIE') return project;
    const record = readCinemaExposureRecord(project);
    if (record.events.some(event => event.kind === 'ANNOUNCEMENT')) return project;
    const input = packageInput(player, project, titleId);
    return { ...project, cinemaExposure: appendCinemaExposureEvent(project, { id: `cinema-announcement:${titleId}`, titleId,
        absoluteWeek, kind: 'ANNOUNCEMENT', channel: 'PUBLIC_PROJECT_ANNOUNCEMENT', impressions: 0,
        recognitionShare: getCinemaRecognitionShare(input.cast, input.studio), impressionsEstimated: true }) };
};

/** Attach evidence to the already-committed campaign; this never charges money. */
export const commitCinemaReleaseExposure = ({ player, project, titleId, absoluteWeek, allocations }: {
    player: Player; project: ProjectDetails; titleId: string; absoluteWeek: number; allocations: MarketingChannelAllocations;
}): ProjectDetails => {
    if (project.type !== 'MOVIE') return project;
    const committedCost = money(project.marketingBudgetSpent ?? project.totalCampaignSpend ?? 0);
    const requestedCost = Object.values(allocations).reduce((sum, value) => sum + money(value || 0), 0);
    if (!Number.isSafeInteger(requestedCost) || requestedCost > committedCost) throw new Error('Cinema exposure requires recorded paid marketing');
    let next = commitCinemaAnnouncement(player, project, titleId, absoluteWeek);
    const countryIds = project.releaseRegionIds?.length
        ? WORLD_COUNTRY_DEFINITIONS.filter(country => project.releaseRegionIds!.includes(country.regionId)).map(country => country.id) : undefined;
    for (const [channel, amount] of Object.entries(allocations).sort(([a], [b]) => a.localeCompare(b))) {
        const paidCostCents = money(amount || 0);
        if (!paidCostCents) continue;
        const id = `cinema-campaign:${titleId}:${channel}`;
        const existing = next.cinemaExposure?.events.find(event => event.id === id);
        if (existing) {
            if (existing.paidCostCents !== paidCostCents) throw new Error('Committed cinema campaign cost cannot be rewritten');
            continue;
        }
        const impressions = Math.floor(paidCostCents / 100 * CINEMA_EXPOSURE_PROFILE.qualifiedImpressionsPerDollar);
        next = { ...next, cinemaExposure: appendCinemaExposureEvent(next, { id, titleId, absoluteWeek, kind: 'PAID_CAMPAIGN',
            channel, paidCostCents, impressions, countryIds, impressionsEstimated: true }) };
    }
    const recordedCost = (next.cinemaExposure?.events || []).filter(event => event.kind === 'PAID_CAMPAIGN')
        .reduce((sum, event) => sum + (event.paidCostCents || 0), 0);
    if (recordedCost > committedCost) throw new Error('Cinema campaigns exceed recorded paid marketing');
    return next;
};

/** Forecast-safe public package producer. Missing legacy estimates use an explicit broad range. */
export const buildCinemaKnownInputs = (player: Player, project: ProjectDetails, titleId: string): CinemaKnownInputs => {
    const title = normalizeCinemaTitle({ titleId, project, player, owner: { id: project.studioId, route: 'PLAYER_STUDIO' } });
    const estimate = project.hiddenStats.estimatedQualityScore;
    const hasEstimate = typeof estimate === 'number' && Number.isFinite(estimate);
    const center = hasEstimate ? score(estimate) : 55;
    const low = hasEstimate ? Math.max(1, center - 10) : 25, high = hasEstimate ? Math.min(100, center + 10) : 85;
    return { cohorts: getCinemaExposureCohorts(player), titles: [{ ...title, exposure: readCinemaExposureRecord(project), delivery: {
        estimatedQuality: center, qualityRange: [low, high], scriptQuality: center, directorQuality: center, castingStrength: center,
    } }] };
};
export const buildCinemaAwarenessSnapshot = (player: Player, project: ProjectDetails, titleId: string) => {
    const input = packageInput(player, project, titleId), record = readCinemaExposureRecord(project);
    const known = buildCinemaKnownInputs(player, project, titleId);
    const forecastInput = projectCinemaForecastInput({ absoluteWeek: input.absoluteWeek, seed: 0, tuningVersion: CINEMA_EXPOSURE_TUNING_VERSION,
        knowledge: 'OBSERVED', titles: [], cohorts: input.cohorts }, known);
    return { ...buildCinemaExposure(input), attentionPotential: record.attentionPotential, attentionBasis: record.attentionBasis,
        audienceStateAvailable: input.cohorts.length > 0, forecastInput };
};
