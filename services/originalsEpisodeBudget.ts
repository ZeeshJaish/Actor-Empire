import type { OriginalsSeasonStyle } from './originalsStudios';

/**
 * #286: a season's money, episode by episode. The player drags bars, the total never moves, and the game names the season from what they did.
 * Start pulls viewers in, the middle keeps them, the finale builds Season 2. Money does not buy the top rating (see #274).
 */

/** No bar goes under a tenth of an even share. There is no upper limit. */
const FLOOR_OF_EVEN = 0.1;

export const evenEpisodeShares = (episodes: number): number[] => {
    const count = Math.max(1, Math.round(episodes));
    return Array.from({ length: count }, () => 1 / count);
};

/** Start is the first 35%, finale the last 25%, the middle is the rest: 8 episodes are 3, 3, 2; 12 are 4, 5, 3; 16 are 6, 6, 4 */
export const getSeasonZones = (episodes: number): { start: number; middle: number; finale: number } => {
    const count = Math.max(1, Math.round(episodes));
    if (count === 1) return { start: 1, middle: 0, finale: 0 };
    if (count === 2) return { start: 1, middle: 0, finale: 1 };
    const start = Math.max(1, Math.round(count * 0.35));
    const finale = Math.max(1, Math.round(count * 0.25));
    return { start, middle: Math.max(0, count - start - finale), finale };
};

export type EpisodeZone = 'START' | 'MIDDLE' | 'FINALE';

export const getEpisodeZone = (index: number, episodes: number): EpisodeZone => {
    const zones = getSeasonZones(episodes);
    if (index < zones.start) return 'START';
    if (index >= episodes - zones.finale) return 'FINALE';
    return 'MIDDLE';
};

const normalize = (shares: number[]): number[] => {
    const total = shares.reduce((sum, share) => sum + Math.max(0, share), 0);
    return total > 0 ? shares.map(share => Math.max(0, share) / total) : evenEpisodeShares(shares.length);
};

/** How each zone is funded against an even season: 1 is even, 1.3 is 30% over */
const zoneTilts = (input: number[]) => {
    const shares = normalize(input);
    const count = shares.length;
    const zones = getSeasonZones(count);
    const even = 1 / count;
    const mean = (from: number, length: number) => (length > 0 ? shares.slice(from, from + length).reduce((sum, share) => sum + share, 0) / length / even : 1);
    return {
        start: mean(0, zones.start),
        middle: mean(zones.start, zones.middle),
        finale: mean(count - zones.finale, zones.finale),
    };
};

export type SeasonShapeId = 'EVEN' | 'BIG_OPENING' | 'STRONG_MIDDLE' | 'BIG_FINALE' | 'BIG_START_BIG_END' | 'BIG_EPISODE';

export const SEASON_SHAPE_NAMES: Record<SeasonShapeId, string> = {
    EVEN: 'Even Season',
    BIG_OPENING: 'Big Opening',
    STRONG_MIDDLE: 'Strong Middle',
    BIG_FINALE: 'Big Finale',
    BIG_START_BIG_END: 'Big Start, Big End',
    BIG_EPISODE: 'Big Episode',
};

/** The game names the season from the bars */
export const getSeasonShape = (input: number[]): SeasonShapeId => {
    const shares = normalize(input);
    const count = shares.length;
    const even = 1 / count;
    const { start, middle, finale } = zoneTilts(shares);
    const zones = getSeasonZones(count);
    const middleEpisodes = shares.slice(zones.start, count - zones.finale);
    if (middleEpisodes.some(share => share >= even * 2)) return 'BIG_EPISODE';
    if ([start, middle, finale].every(tilt => Math.abs(tilt - 1) <= 0.1)) return 'EVEN';
    if (start >= 1.15 && finale >= 1.15 && middle < 1) return 'BIG_START_BIG_END';
    if (start >= middle && start >= finale) return 'BIG_OPENING';
    if (finale >= middle) return 'BIG_FINALE';
    return 'STRONG_MIDDLE';
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export interface SeasonEffects {
    /** The first four weeks' viewers */
    pull: number;
    /** How many finish it */
    keep: number;
    /** The next season's first four weeks */
    hype: number;
}

export const getSeasonEffects = (input: number[] | null | undefined): SeasonEffects => {
    if (!input?.length) return { pull: 0, keep: 0, hype: 0 };
    const { start, middle, finale } = zoneTilts(input);
    const round = (value: number) => Math.round(value * 1000) / 1000;
    return {
        pull: round(clamp((start - 1) * 0.3, -0.15, 0.15)),
        keep: round(clamp((middle - 1) * 0.3, -0.15, 0.15)),
        hype: round(clamp((finale - 1) * 0.4, -0.1, 0.2)),
    };
};

/** One bar moved. The others share what is left, so the total never moves, and nothing falls under the floor. */
export const moveEpisodeBar = (input: number[], index: number, nextValue: number): number[] => {
    const shares = normalize(input);
    const count = shares.length;
    const floor = (1 / count) * FLOOR_OF_EVEN;
    const value = clamp(nextValue, floor, 1 - floor * (count - 1));
    const others = shares.reduce((sum, share, i) => (i === index ? sum : sum + share), 0);
    const room = 1 - value;
    const spare = others - floor * (count - 1);
    const roomOverFloor = room - floor * (count - 1);
    return shares.map((share, i) => {
        if (i === index) return value;
        if (spare <= 0) return room / (count - 1);
        return floor + ((share - floor) / spare) * roomOverFloor;
    });
};

/** Each kind of studio spends a season its own way */
export const getStudioSeasonShares = (style: OriginalsSeasonStyle, episodes: number): number[] => {
    const count = Math.max(1, Math.round(episodes));
    const zones = getSeasonZones(count);
    const tilt = style === 'BIG_OPENING'
        ? { start: 1.45, middle: 0.75, finale: 0.85 }
        : style === 'SLOW_BURN'
            ? { start: 0.85, middle: 1.3, finale: 0.9 }
            : style === 'BIG_FINALE'
                ? { start: 0.85, middle: 0.85, finale: 1.5 }
                : { start: 1, middle: 1, finale: 1 };
    return normalize(Array.from({ length: count }, (_, index) => {
        if (index < zones.start) return tilt.start;
        if (index >= count - zones.finale) return tilt.finale;
        return tilt.middle;
    }));
};

/** What gets saved: short numbers */
export const compactEpisodeShares = (shares: number[]): number[] => normalize(shares).map(share => Math.round(share * 10000) / 10000);
