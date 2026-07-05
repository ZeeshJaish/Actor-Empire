import { GameLanguage, Genre, GenreMarketTrend, ProjectDetails, Script } from '../types';
import { ALL_GENRES, formatGenreLabel } from './genreCatalog';
import { t } from './i18n';

const TREND_REASON_COUNTS: Record<GenreMarketTrend['label'], number> = {
    Hot: 3,
    Breakout: 3,
    Soft: 3,
    Cold: 3,
    Stable: 3,
};
const STABLE_MARKET_LABEL: GenreMarketTrend['label'] = 'Stable';

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

const getMarketTrendGenreLabel = (genre: Genre, language: GameLanguage) => {
    const key = `services.marketTrends.genre.${genre}`;
    const translated = t(language, key);
    return translated === key ? formatGenreLabel(genre) : translated;
};

const buildMarketTrendReason = (genre: Genre, label: GenreMarketTrend['label'], week: number, language: GameLanguage) => {
    const score = seededScore(genre, week);
    const reasonIndex = score % TREND_REASON_COUNTS[label];
    return t(language, `services.marketTrends.reason.${label}.${reasonIndex}`, {
        genre: getMarketTrendGenreLabel(genre, language),
    });
};

export const createMarketTrends = (week: number, language: GameLanguage = 'en'): GenreMarketTrend[] => ALL_GENRES.map(genre => {
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
    return {
        genre,
        demand,
        label,
        reason: buildMarketTrendReason(genre, label, week, language),
    };
});

export const getGenreMarketTrend = (genre: Genre, week: number, trends?: GenreMarketTrend[], language: GameLanguage = 'en'): GenreMarketTrend => {
    const trend = (trends || createMarketTrends(week, language)).find(item => item.genre === genre);
    if (trend) {
        return {
            ...trend,
            reason: buildMarketTrendReason(trend.genre, trend.label, week, language),
        };
    }
    return {
        genre,
        demand: 1,
        label: STABLE_MARKET_LABEL,
        reason: buildMarketTrendReason(genre, STABLE_MARKET_LABEL, week, language),
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
