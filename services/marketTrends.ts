import { Genre, GenreMarketTrend, ProjectDetails, Script } from '../types';
import { ALL_GENRES, formatGenreLabel } from './genreCatalog';

const TREND_REASONS: Record<string, string[]> = {
    Hot: ['audiences are actively seeking this lane', 'streamers are bidding up similar packages', 'recent hits have lifted buyer confidence'],
    Breakout: ['a breakout hit has created a gold rush', 'the market is chasing fresh supply right now', 'fans are making this category noisy online'],
    Soft: ['buyers are being selective this cycle', 'recent misses have made distributors cautious', 'audience interest is cooling for now'],
    Cold: ['the market is oversupplied this cycle', 'buyers want a very strong package before committing', 'audience demand is low this season'],
    Stable: ['demand is steady and predictable', 'buyers are open to strong execution', 'the market is balanced this cycle'],
};

const seededScore = (genre: Genre, week: number) => {
    const season = Math.floor(Math.max(1, week) / 4);
    const seed = `${genre}:${season}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 100);
};

export const createMarketTrends = (week: number): GenreMarketTrend[] => ALL_GENRES.map(genre => {
    const score = seededScore(genre, week);
    const demand = score >= 92 ? 1.28
        : score >= 76 ? 1.14
        : score <= 8 ? 0.78
        : score <= 24 ? 0.9
        : 1;
    const label: GenreMarketTrend['label'] = demand >= 1.24 ? 'Breakout'
        : demand > 1.05 ? 'Hot'
        : demand <= 0.82 ? 'Cold'
        : demand < 0.96 ? 'Soft'
        : 'Stable';
    const reasons = TREND_REASONS[label];
    return {
        genre,
        demand,
        label,
        reason: `${formatGenreLabel(genre)} ${reasons[score % reasons.length]}.`,
    };
});

export const getGenreMarketTrend = (genre: Genre, week: number, trends?: GenreMarketTrend[]): GenreMarketTrend => {
    return (trends || createMarketTrends(week)).find(trend => trend.genre === genre) || {
        genre,
        demand: 1,
        label: 'Stable',
        reason: `${formatGenreLabel(genre)} demand is steady and predictable.`,
    };
};

export const getProjectMarketDemand = (project: Pick<ProjectDetails, 'genre' | 'format'>, week: number, trends?: GenreMarketTrend[]): number => {
    const trend = getGenreMarketTrend(project.genre, week, trends);
    let demand = trend.demand;
    if (project.format === 'ANIMATED') demand += 0.04;
    if (project.format === 'ANIME') demand += trend.label === 'Hot' || trend.label === 'Breakout' ? 0.08 : -0.03;
    return Math.max(0.72, Math.min(1.36, demand));
};

export const getScriptMarketDemand = (script: Script, week: number, trends?: GenreMarketTrend[]): number => {
    const genre = script.genres[0] || 'DRAMA';
    return getProjectMarketDemand({ genre, format: script.format }, week, trends);
};
