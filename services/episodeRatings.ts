import type { ActiveRelease, NewsItem, PastProject, ProjectDetails, SeasonEpisodeRatings } from '../types';

type EpisodeRatingSource = Partial<ActiveRelease> & {
    id?: string;
    name?: string;
    title?: string;
    type?: string;
    projectType?: string;
    imdbRating?: number;
    rating?: number;
    productionPerformance?: number;
    streaming?: ActiveRelease['streaming'];
    totalViews?: number;
    weeklyViews?: number[];
    projectDetails?: Partial<ProjectDetails>;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roundRating = (value: number) => Math.round(clamp(value, 1, 10) * 10) / 10;

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const seededNoise = (seed: string, index: number): number => {
    const hash = hashString(`${seed}:${index}`);
    return ((hash % 1000) / 1000) - 0.5;
};

export const getEpisodeRatingVerdict = (rating: number): SeasonEpisodeRatings['verdict'] => {
    if (rating >= 9.2) return 'AWESOME';
    if (rating >= 8.2) return 'GREAT';
    if (rating >= 7.0) return 'GOOD';
    if (rating >= 5.8) return 'REGULAR';
    if (rating >= 4.5) return 'BAD';
    return 'GARBAGE';
};

export const inferSeasonNumber = (release: EpisodeRatingSource | PastProject | ProjectDetails): number => {
    const directInstallment = Number((release as PastProject).installmentNumber || (release as ProjectDetails).installmentNumber);
    if (Number.isFinite(directInstallment) && directInstallment > 0) return Math.round(directInstallment);

    const title = String((release as EpisodeRatingSource).name || (release as ProjectDetails).title || '');
    const match = title.match(/\bseason\s+(\d+)\b/i);
    if (match) return Math.max(1, Number(match[1]) || 1);
    return 1;
};

export const summarizeEpisodeRatings = (ratings: SeasonEpisodeRatings[]) => {
    const sortedRatings = [...(ratings || [])].sort((a, b) => a.season - b.season);
    const episodes = sortedRatings.flatMap(season =>
        (season.episodes || []).map(episode => ({
            season: season.season,
            episode: episode.episode,
            rating: episode.rating,
        }))
    );

    if (!episodes.length) {
        return {
            averageRating: 0,
            verdict: getEpisodeRatingVerdict(0),
            bestEpisode: null as null | { season: number; episode: number; rating: number },
            weakestEpisode: null as null | { season: number; episode: number; rating: number },
            episodeCount: 0,
            weakEpisodeCount: 0,
            eliteEpisodeCount: 0,
        };
    }

    const averageRating = roundRating(episodes.reduce((sum, item) => sum + item.rating, 0) / episodes.length);
    const bestEpisode = episodes.reduce((best, episode) => episode.rating > best.rating ? episode : best, episodes[0]);
    const weakestEpisode = episodes.reduce((weakest, episode) => episode.rating < weakest.rating ? episode : weakest, episodes[0]);
    return {
        averageRating,
        verdict: getEpisodeRatingVerdict(averageRating),
        bestEpisode,
        weakestEpisode,
        episodeCount: episodes.length,
        weakEpisodeCount: episodes.filter(episode => episode.rating < 6.2).length,
        eliteEpisodeCount: episodes.filter(episode => episode.rating >= 9).length,
    };
};

export const getEpisodeRatingsGameplayImpact = (ratings: SeasonEpisodeRatings[]) => {
    const summary = summarizeEpisodeRatings(ratings);
    const average = summary.averageRating;
    const weakPenalty = Math.min(6, summary.weakEpisodeCount * 2);
    const eliteBonus = Math.min(5, summary.eliteEpisodeCount);

    const base =
        average >= 8.8 ? { renewal: 12, reputation: 2, momentum: 5, franchise: 8, platform: 6, signal: 'Strong' as const } :
        average >= 8.0 ? { renewal: 7, reputation: 1, momentum: 3, franchise: 4, platform: 3, signal: 'Viable' as const } :
        average >= 7.0 ? { renewal: 2, reputation: 0, momentum: 1, franchise: 1, platform: 1, signal: 'Steady' as const } :
        average >= 6.0 ? { renewal: -8, reputation: -1, momentum: -3, franchise: -3, platform: -4, signal: 'Risky' as const } :
        { renewal: -18, reputation: -3, momentum: -7, franchise: -8, platform: -10, signal: 'Weak' as const };

    const finale = ratings
        .flatMap(season => season.episodes.map(episode => ({ ...episode, season: season.season })))
        .sort((a, b) => b.season - a.season || b.episode - a.episode)[0];
    const finaleModifier = finale?.rating >= 8.5 ? 3 : finale?.rating < 6 ? -4 : 0;

    return {
        signal: base.signal,
        averageRating: average,
        renewalModifier: Math.round(base.renewal + eliteBonus + finaleModifier - weakPenalty),
        studioReputationModifier: base.reputation,
        studioMomentumModifier: base.momentum,
        franchiseValueModifier: base.franchise + Math.ceil(eliteBonus / 2) - Math.ceil(weakPenalty / 2),
        platformConfidenceModifier: base.platform + finaleModifier,
        bestEpisode: summary.bestEpisode,
        weakestEpisode: summary.weakestEpisode,
    };
};

export const buildEpisodeRatingsStory = ({
    projectId,
    title,
    ratings,
    week,
    year,
}: {
    projectId: string;
    title: string;
    ratings: SeasonEpisodeRatings[];
    week: number;
    year: number;
}): { news: NewsItem; impact: ReturnType<typeof getEpisodeRatingsGameplayImpact> } | null => {
    const impact = getEpisodeRatingsGameplayImpact(ratings);
    if (!impact.averageRating) return null;

    const isPositive = impact.renewalModifier >= 5;
    const isNegative = impact.renewalModifier <= -6;
    const best = impact.bestEpisode ? `S${impact.bestEpisode.season}E${impact.bestEpisode.episode}` : 'its strongest episode';
    const weakest = impact.weakestEpisode ? `S${impact.weakestEpisode.season}E${impact.weakestEpisode.episode}` : 'its weakest episode';
    const headline = isPositive
        ? `${title} episode scores boost renewal talk`
        : isNegative
            ? `${title} episode scores put renewal in doubt`
            : `${title} episode scores keep renewal talks alive`;
    const subtext = isPositive
        ? `${best} became the standout as the season averaged ${impact.averageRating.toFixed(1)}. Platforms are more confident about another run.`
        : isNegative
            ? `${weakest} dragged the scorecard down to ${impact.averageRating.toFixed(1)}, making the next-season conversation harder.`
            : `The season averaged ${impact.averageRating.toFixed(1)}, enough to keep the property viable but not automatic.`;

    return {
        news: {
            id: `news_episode_scorecard_${projectId}_${week}_${Date.now()}`,
            headline,
            subtext,
            category: isPositive ? 'TOP_STORY' : 'INDUSTRY',
            week,
            year,
            impactLevel: isPositive || isNegative ? 'HIGH' : 'MEDIUM',
        },
        impact,
    };
};

export const generateEpisodeRatings = (release: EpisodeRatingSource): SeasonEpisodeRatings[] => {
    const details = (release.projectDetails || release) as Partial<ProjectDetails> & EpisodeRatingSource;
    const mediaType = release.type || release.projectType || details.type;
    if (mediaType !== 'SERIES') return [];

    const episodeCount = Math.round(clamp(Number(details.episodes || 8), 4, 12));
    const hiddenStats = (details.hiddenStats || {}) as Partial<ProjectDetails['hiddenStats']>;
    const imdbRating = Number(release.imdbRating || release.rating || details.hiddenStats?.qualityScore / 10 || 0);
    const qualityRating = clamp(Number(hiddenStats.qualityScore || 50) / 10, 1, 10);
    const scriptRating = clamp(Number(hiddenStats.scriptQuality || hiddenStats.qualityScore || 50) / 10, 1, 10);
    const directorRating = clamp(Number(hiddenStats.directorQuality || hiddenStats.qualityScore || 50) / 10, 1, 10);
    const castRating = clamp(Number(hiddenStats.castingStrength || 50) / 10, 1, 10);
    const productionRating = clamp(Number(release.productionPerformance || hiddenStats.qualityScore || 50) / 10, 1, 10);
    const weeklyViews = release.streaming?.weeklyViews || release.weeklyViews || [];
    const totalViews = Number(release.streaming?.totalViews || release.totalViews || 0);
    const viewMomentum = weeklyViews.length >= 2
        ? clamp((weeklyViews[weeklyViews.length - 1] - weeklyViews[0]) / Math.max(1, weeklyViews[0]), -0.35, 0.2)
        : 0;
    const viewLift = totalViews > 40_000_000 ? 0.25 : totalViews > 12_000_000 ? 0.1 : totalViews > 0 && totalViews < 6_000_000 ? -0.2 : 0;

    const base = clamp(
        (imdbRating || qualityRating) * 0.45
        + qualityRating * 0.22
        + scriptRating * 0.12
        + directorRating * 0.08
        + castRating * 0.06
        + productionRating * 0.07
        + viewLift
        + viewMomentum,
        1,
        10
    );

    const seed = `${release.id || details.title || release.name || 'series'}:${inferSeasonNumber(release)}`;
    const midpoint = Math.max(1, (episodeCount + 1) / 2);
    const episodes = Array.from({ length: episodeCount }, (_, index) => {
        const episode = index + 1;
        const finaleLift = episode === episodeCount ? 0.28 : 0;
        const pilotLift = episode === 1 ? 0.08 : 0;
        const midSeasonDrift = -Math.abs(episode - midpoint) * 0.035;
        const volatility = base >= 8.2 ? 0.52 : base >= 6.8 ? 0.62 : 0.72;
        const rating = roundRating(base + finaleLift + pilotLift + midSeasonDrift + (seededNoise(seed, episode) * volatility));
        return { episode, rating };
    });

    const averageRating = roundRating(episodes.reduce((sum, item) => sum + item.rating, 0) / episodes.length);

    return [{
        season: inferSeasonNumber(release.projectDetails || release),
        episodes,
        averageRating,
        verdict: getEpisodeRatingVerdict(averageRating),
    }];
};
