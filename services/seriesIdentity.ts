import type { SeasonEpisodeRatings } from '../types';
import { generateEpisodeRatings, inferSeasonNumber } from './episodeRatings';

/**
 * #272: one series, one key, one season number.
 * Each season is its own record. What makes them one show: a later season carries the franchise's id,
 * or the first season's own id, as franchiseId. A spin-off or a reboot shares the franchise but is its own show.
 */

const detailsOf = (row: any) => row?.projectDetails || row || {};
const idOf = (row: any): string => String(row?.id || detailsOf(row)?.id || row?.name || detailsOf(row)?.title || '');
const franchiseOf = (row: any): string => String(detailsOf(row)?.franchiseId || row?.franchiseId || '');
const titleOf = (row: any): string => String(row?.name || row?.title || detailsOf(row)?.title || '');
const ratingsOf = (row: any): SeasonEpisodeRatings[] => {
    const ratings = detailsOf(row)?.episodeRatings ?? row?.episodeRatings;
    return Array.isArray(ratings) ? ratings : [];
};

/** The show's name, without the season: "Harrow Lane: Season 2", "Harrow Lane Season 2" and "Harrow Lane S2" are "Harrow Lane" */
export const getSeriesBaseTitle = (title: unknown): string => String(title || '')
    .replace(/\s*[:\-\u2013]?\s*\bseason\s+\d+\b/gi, '')
    .replace(/\s+s\d+\s*$/gi, '')
    .replace(/[\s:\-\u2013]+$/g, '')
    .trim();

const titleKeyOf = (row: any) => getSeriesBaseTitle(titleOf(row)).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();

const startsItsOwnShow = (row: any): boolean => {
    const subtype = detailsOf(row)?.subtype || row?.subtype;
    return subtype === 'SPINOFF' || subtype === 'REBOOT' || subtype === 'UNIVERSE_CROSSOVER';
};

const seasonFromRow = (row: any): number => inferSeasonNumber({ ...detailsOf(row), title: titleOf(row) });

const releaseOrder = (row: any): number => {
    const details = detailsOf(row);
    const exact = Number(row?.releasedAtAbsoluteWeek ?? details?.releasedAtAbsoluteWeek);
    if (Number.isFinite(exact) && exact > 0) return exact;
    return (Number(row?.releaseYear ?? row?.year ?? details?.releaseYear) || 0) * 52 + (Number(row?.releaseWeek ?? details?.releaseWeek) || 0);
};

export interface SeriesSeason<T> { season: number; row: T }
export interface SeriesGroup<T> { key: string; name: string; seasons: SeriesSeason<T>[] }

/** Series rows into shows, each with its seasons in order and one number each. `rawOf` reaches the saved record behind a display row. */
export const groupSeriesRows = <T,>(rows: T[], rawOf: (row: T) => any = row => row): SeriesGroup<T>[] => {
    const raw = rows.map(rawOf);
    const ownShows = new Map<string, string>();
    raw.forEach(row => {
        if (franchiseOf(row) && startsItsOwnShow(row)) ownShows.set(`${franchiseOf(row)}|${titleKeyOf(row)}`, `series:${idOf(row)}`);
    });
    const keys = new Map<number, string>();
    const franchiseTitles = new Map<string, string>();
    raw.forEach((row, index) => {
        const franchise = franchiseOf(row);
        if (!franchise) return;
        const own = ownShows.get(`${franchise}|${titleKeyOf(row)}`);
        const key = own || `series:${franchise}`;
        keys.set(index, key);
        if (!own && !franchiseTitles.has(titleKeyOf(row))) franchiseTitles.set(titleKeyOf(row), key);
    });
    /* an old record with no link: a plain title is its own show, and "X Season 2" joins X */
    const plainTitles = new Map<string, string>();
    const unlinked = raw
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => !franchiseOf(row))
        .sort((a, b) => seasonFromRow(a.row) - seasonFromRow(b.row));
    unlinked.forEach(({ row, index }) => {
        const title = titleKeyOf(row);
        const key = seasonFromRow(row) > 1
            ? franchiseTitles.get(title) || plainTitles.get(title) || `series:${idOf(row)}`
            : franchiseTitles.get(title) || `series:${idOf(row)}`;
        keys.set(index, key);
        if (!plainTitles.has(title)) plainTitles.set(title, key);
    });

    const byKey = new Map<string, number[]>();
    keys.forEach((key, index) => byKey.set(key, [...(byKey.get(key) || []), index]));
    return [...byKey.entries()].map(([key, indexes]) => {
        const ordered = [...indexes].sort((a, b) => (
            seasonFromRow(raw[a]) - seasonFromRow(raw[b]) || releaseOrder(raw[a]) - releaseOrder(raw[b])
        ));
        let last = 0;
        const seasons = ordered.map(index => {
            const season = Math.max(last + 1, seasonFromRow(raw[index]));
            last = season;
            return { season, row: rows[index] };
        });
        return { key, name: getSeriesBaseTitle(titleOf(raw[ordered[0]])) || titleOf(raw[ordered[0]]), seasons };
    });
};

const generateFor = (row: any, episodes: number): SeasonEpisodeRatings[] => (
    row?.projectDetails
        ? generateEpisodeRatings({ ...row, type: 'SERIES', projectDetails: { ...row.projectDetails, type: 'SERIES', episodes: row.projectDetails.episodes || episodes, episodeRatings: undefined } })
        : generateEpisodeRatings({ ...row, type: 'SERIES', episodes: row?.episodes || episodes, episodeRatings: undefined })
);

/** This season's own ratings. Older saves copied the last season's into a renewal; those are never this season's. */
export const getSeasonRatings = (row: any): SeasonEpisodeRatings[] => {
    const ratings = ratingsOf(row);
    if (!ratings.length) return [];
    const own = seasonFromRow(row);
    const mine = ratings.filter(rating => Number(rating.season) === own);
    return mine.length ? mine : generateFor(row, ratings[0]?.episodes?.length || 8);
};

/** The whole show's ratings, season by season, for the one grid on its page */
export const getSeriesEpisodeRatings = <T,>(group: SeriesGroup<T> | null | undefined, rawOf: (row: T) => any = row => row): SeasonEpisodeRatings[] => (
    (group?.seasons || [])
        .flatMap(({ season, row }) => getSeasonRatings(rawOf(row)).slice(0, 1).map(rating => ({ ...rating, season })))
        .sort((a, b) => a.season - b.season)
);

/** A show's rating: its seasons' ratings averaged, the unrated left out */
export const getSeriesRating = (ratings: number[]): number => {
    const rated = ratings.filter(rating => Number(rating) > 0);
    return rated.length ? Math.round((rated.reduce((sum, rating) => sum + rating, 0) / rated.length) * 10) / 10 : 0;
};

/** Old saves: a renewal carried its first season's ratings. The first season keeps its numbers, the later ones get their own, and a season not yet out has none. Safe to run again. */
export const healCopiedEpisodeRatings = <P extends { commitments?: any[]; activeReleases?: any[]; pastProjects?: any[] }>(player: P): P => {
    const copied = (row: any) => {
        const ratings = ratingsOf(row);
        if (!ratings.length) return false;
        const own = seasonFromRow(row);
        return !ratings.some(rating => Number(rating.season) === own);
    };
    let changed = false;
    const commitments = (player.commitments || []).map(job => {
        if (!copied(job)) return job;
        changed = true;
        return { ...job, projectDetails: { ...job.projectDetails, episodeRatings: undefined } };
    });
    const activeReleases = (player.activeReleases || []).map(release => {
        if (!copied(release)) return release;
        changed = true;
        return { ...release, projectDetails: { ...release.projectDetails, episodeRatings: getSeasonRatings(release) } };
    });
    const pastProjects = (player.pastProjects || []).map(project => {
        if (!copied(project)) return project;
        changed = true;
        return { ...project, episodeRatings: getSeasonRatings(project) };
    });
    return changed ? { ...player, commitments, activeReleases, pastProjects } : player;
};
