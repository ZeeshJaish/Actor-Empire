/**
 * #129 (plan §20.8, L2): the weekly Top 10 of every streaming service, films and series.
 *
 * Views = hours watched ÷ the title's runtime, as real charts count them.
 *  - The player's titles: their hours from the week's viewing settlement
 *    (`worldStreamingViewing.platforms.PLAYER.titlePerformance`).
 *  - A rival's titles: the settlement keeps each rival service's real weekly hours but not its titles', so a
 *    service's hours are shared among the titles it streams that week: the titles the settlement plays for it
 *    (its rights contracts, released originals and library, `getAiCataloguePositions`) and the world's projects
 *    streaming on it (`IndustryProject.streamingWindows`). A featured share of its week (the rest is its long-tail
 *    library), by each title's pull (a window's `performance.viewsMillions`, else the title's quality and reach),
 *    halving every four weeks after the title arrived on the service, no title above a cap. The starting-library
 *    placeholders ("<Service> Archive N") have no title of their own and stay in the long tail.
 *
 * The weekly loop stores the top 10 films and top 10 series of each settled week, 12 weeks kept, so a title's
 * move, NEW and weeks in the Top 10 are read from real past charts. Nothing here touches money or the economy.
 * Schema 2 (#135): rival titles from the services' catalogues and each row's genre; a schema-1 chart (rivals from
 * project windows only) is dropped, and the current week is worked out again.
 * Schema 3 (#142): each week also keeps the player's own Top 10 (`own`), counted on the player's own hours only, the
 * "Top 10 on NORTHSTAR+" row of a real app. A schema-2 chart keeps its weeks without it; the current week's own list
 * is worked out from its settled viewing, so the own chart shows at once and its moves start the next week.
 */
import type {
    CampaignBook,
    PlatformAiContentPlan,
    Player,
    ProjectType,
    StreamingWeeklyChartRow,
    StreamingWeeklyChartState,
    StreamingWeeklyChartWeek,
} from '../types';
import { getHistoricalCatalogueTitles } from './historicalCatalogue';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';
import { getAiCataloguePositions } from './worldEconomy/worldStreamingAiCatalogue';
import { streamingCampaignTitleFitAnywhere } from './campaigns/streamingCampaignEffects';

export const STREAMING_WEEKLY_CHART_WEEKS = 12;
export const STREAMING_WEEKLY_CHART_SIZE = 10;
/** The share of a rival service's week its current titles compete for; the rest is its long-tail library. */
export const STREAMING_CHART_RIVAL_FEATURED_SHARE = .45;
/** No single rival title takes more than this share of its service's week (a real service's biggest title
    takes a few percent of its week, a record one about a tenth). */
export const STREAMING_CHART_RIVAL_TITLE_CAP = .1;
/** A rival title's pull halves every this many weeks after it arrives on the service. */
export const STREAMING_CHART_RIVAL_HALF_LIFE_WEEKS = 4;
/** After this many weeks on a service a title is library: its pull stops falling, so old titles keep their order. */
const RIVAL_LIBRARY_AFTER_WEEKS = 104;

const kindOf = (type: ProjectType | string | undefined): StreamingWeeklyChartRow['kind'] => (type === 'SERIES' ? 'SERIES' : 'FILM');

/** A rival's commissioned Original can carry its working name, "<Service> <GENRE> Original"
    (platformAiContentSourcing.ts); the chart sets the genre in title case rather than shouting it. */
export const streamingChartDisplayTitle = (title: string): string => title.replace(
    /\b([A-Z][A-Z_]+(?: [A-Z][A-Z_]+)*) Original$/,
    (_, genre: string) => `${genre.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())} Original`,
);

/** The runtime rule of `resolveStreamingViewingProjectFacts` (worldStreamingViewing.ts): a film's minutes or two
    hours; a series' episodes × episode minutes, or eight 45-minute episodes. */
export const streamingChartRuntimeHours = (player: Player, projectId: string, kind: StreamingWeeklyChartRow['kind']): number => {
    const raw = ((player.pastProjects || []).find(project => String(project.id) === projectId)
        || (player.world.projects || []).find(project => String(project.id) === projectId)
        || {}) as Record<string, any>;
    const commission = (player.ownedStreamingPlatform?.originalCommissions || []).find(item => item.canonicalProjectId === projectId);
    const runtimeMinutes = Number(raw.runtimeMinutes || raw.projectDetails?.runtimeMinutes || 0);
    const episodeMinutes = Number(raw.episodeRuntimeMinutes || raw.projectDetails?.episodeRuntimeMinutes || 0);
    const episodes = Number(raw.episodes || commission?.episodes || 8);
    const hours = runtimeMinutes > 0
        ? runtimeMinutes / 60
        : kind === 'SERIES' ? Math.max(1, episodes) * (episodeMinutes || 45) / 60 : 2;
    return Math.max(.25, hours);
};

const byViews = (left: StreamingWeeklyChartRow, right: StreamingWeeklyChartRow) => (
    right.views - left.views || right.hours - left.hours || left.id.localeCompare(right.id)
);

/** One settled week's Top 10s, from the week's viewing settlement. */
export const buildStreamingWeeklyChartWeek = (player: Player, absoluteWeek: number): StreamingWeeklyChartWeek => {
    const viewing = player.world.worldStreamingViewing;
    /* every title's hours by service; a title streamed on two services counts both */
    type Facts = { title: string; kind: StreamingWeeklyChartRow['kind']; genre: string };
    const titles = new Map<string, Facts & { byPlatform: Map<string, number> }>();
    const add = (id: string, facts: Facts, platformId: string, hours: number) => {
        if (!(hours > 0)) return;
        const entry = titles.get(id) || { ...facts, byPlatform: new Map<string, number>() };
        entry.byPlatform.set(platformId, (entry.byPlatform.get(platformId) || 0) + hours);
        titles.set(id, entry);
    };

    (viewing?.platforms?.PLAYER?.titlePerformance || []).forEach(row => add(String(row.projectId),
        { title: row.title, kind: kindOf(row.projectType), genre: String(row.genre || 'DRAMA') }, 'PLAYER', row.hoursViewed));

    const projects = new Map((player.world.projects || []).map(project => [String(project.id), project]));
    const historical = new Map(getHistoricalCatalogueTitles(player).map(title => [title.id, title]));
    const catalogue = viewing?.aiCatalogue || [];
    const slateOf = (platformId: string): PlatformAiContentPlan[] => {
        const coreId = player.world.streamingPlatformEcosystem?.operators?.[platformId]?.corePlatformId || platformId;
        return (player.world.platforms as Record<string, { ai?: { slate?: PlatformAiContentPlan[] } }> | undefined)?.[coreId]?.ai?.slate || [];
    };
    /* #152: what a rival's campaigns built, so a title it pushed pulls harder */
    const bookOf = (platformId: string): CampaignBook | undefined => {
        const coreId = player.world.streamingPlatformEcosystem?.operators?.[platformId]?.corePlatformId || platformId;
        return (player.world.platforms as Record<string, { ai?: { campaignBook?: CampaignBook } }> | undefined)?.[coreId]?.ai?.campaignBook;
    };
    Object.entries(viewing?.platforms || {}).forEach(([platformId, platform]) => {
        const serviceHours = platform?.totalHoursViewed || 0;
        if (platformId === 'PLAYER' || !(serviceHours > 0)) return;
        const book = bookOf(platformId);
        const pulls = new Map<string, Facts & { pull: number }>();
        /* one title on this service: a world project, a catalogue title, or a released original known only by its plan */
        const consider = (id: string, startsAt: number, contractId: string | null, viewsMillions?: number) => {
            const project = projects.get(id);
            const source = project ? undefined : historical.get(id);
            const plan = project || source || !contractId?.startsWith('ai-original:') ? undefined
                : slateOf(platformId).find(item => item.id === contractId.slice('ai-original:'.length));
            const facts: (Facts & { base: number }) | null = project
                ? { title: project.title, kind: kindOf(project.mediaType), genre: String(project.genre || 'DRAMA'),
                    base: Number(viewsMillions) || (project.quality || 50) / 25 }
                : source ? { title: source.title, kind: kindOf(source.projectType), genre: String(source.genre),
                    base: ((source.quality || 50) * .4 + (source.reach || 50) * .6) / 25 }
                    : plan ? { title: plan.title, kind: kindOf(plan.projectType), genre: String(plan.genre), base: 2 } : null;
            if (!facts) return;
            const age = Math.min(RIVAL_LIBRARY_AFTER_WEEKS, Math.max(0, absoluteWeek - startsAt));
            const pull = Math.max(.05, facts.base) * Math.pow(.5, age / STREAMING_CHART_RIVAL_HALF_LIFE_WEEKS)
                * (book ? streamingCampaignTitleFitAnywhere({ campaignBook: book }, id) : 1);
            if ((pulls.get(id)?.pull ?? -1) >= pull) return;
            pulls.set(id, { title: streamingChartDisplayTitle(facts.title), kind: facts.kind, genre: facts.genre, pull });
        };
        (player.world.projects || []).forEach(project => (project.streamingWindows || []).forEach(window => {
            if (window.platformId !== platformId || window.startsAtAbsoluteWeek > absoluteWeek || window.expiresAtAbsoluteWeek <= absoluteWeek) return;
            consider(String(project.id), window.startsAtAbsoluteWeek, null, window.performance?.viewsMillions);
        }));
        getAiCataloguePositions(player, platformId, catalogue).forEach(position => {
            if (position.status !== 'ACTIVE' || position.startsAtAbsoluteWeek > absoluteWeek || position.expiresAtAbsoluteWeek <= absoluteWeek) return;
            consider(String(position.titleId), position.startsAtAbsoluteWeek, position.contractId);
        });
        const total = [...pulls.values()].reduce((sum, item) => sum + item.pull, 0);
        if (!(total > 0)) return;
        pulls.forEach(({ pull, ...facts }, id) => add(id, facts, platformId,
            Math.round(serviceHours * Math.min(STREAMING_CHART_RIVAL_TITLE_CAP, STREAMING_CHART_RIVAL_FEATURED_SHARE * pull / total))));
    });

    const rows: StreamingWeeklyChartRow[] = [...titles.entries()].map(([id, entry]) => {
        const [platformId] = [...entry.byPlatform.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
        const hours = Math.round([...entry.byPlatform.values()].reduce((sum, value) => sum + value, 0));
        return { id, title: entry.title, platformId, kind: entry.kind, genre: entry.genre, hours,
            views: Math.round(hours / streamingChartRuntimeHours(player, id, entry.kind)) };
    }).filter(row => row.views > 0).sort(byViews);
    return {
        absoluteWeek,
        films: rows.filter(row => row.kind === 'FILM').slice(0, STREAMING_WEEKLY_CHART_SIZE),
        series: rows.filter(row => row.kind === 'SERIES').slice(0, STREAMING_WEEKLY_CHART_SIZE),
        own: buildOwnTopTen(player),
    };
};

/** #142: the player's own service's Top 10 this week, on its own hours only (a title the world also streams elsewhere
    counts just what it did here). */
const buildOwnTopTen = (player: Player): NonNullable<StreamingWeeklyChartWeek['own']> => {
    const hours = new Map<string, { title: string; kind: StreamingWeeklyChartRow['kind']; genre: string; hours: number }>();
    (player.world.worldStreamingViewing?.platforms?.PLAYER?.titlePerformance || []).forEach(row => {
        if (!(row.hoursViewed > 0)) return;
        const id = String(row.projectId);
        const entry = hours.get(id) || { title: row.title, kind: kindOf(row.projectType), genre: String(row.genre || 'DRAMA'), hours: 0 };
        entry.hours += row.hoursViewed;
        hours.set(id, entry);
    });
    const rows: StreamingWeeklyChartRow[] = [...hours.entries()].map(([id, entry]) => ({
        id, title: entry.title, platformId: 'PLAYER', kind: entry.kind, genre: entry.genre, hours: Math.round(entry.hours),
        views: Math.round(entry.hours / streamingChartRuntimeHours(player, id, entry.kind)),
    })).filter(row => row.views > 0).sort(byViews);
    return {
        films: rows.filter(row => row.kind === 'FILM').slice(0, STREAMING_WEEKLY_CHART_SIZE),
        series: rows.filter(row => row.kind === 'SERIES').slice(0, STREAMING_WEEKLY_CHART_SIZE),
    };
};

const validRow = (row: any): row is StreamingWeeklyChartRow => Boolean(row) && typeof row.id === 'string' && typeof row.title === 'string'
    && typeof row.platformId === 'string' && (row.kind === 'FILM' || row.kind === 'SERIES') && typeof row.genre === 'string'
    && Number.isFinite(row.hours) && Number.isFinite(row.views);

const validLists = (lists: any): StreamingWeeklyChartWeek['own'] => (lists && Array.isArray(lists.films) && Array.isArray(lists.series)
    ? { films: lists.films.filter(validRow).slice(0, STREAMING_WEEKLY_CHART_SIZE), series: lists.series.filter(validRow).slice(0, STREAMING_WEEKLY_CHART_SIZE) }
    : undefined);

/** A saved chart, checked; anything malformed is dropped rather than repaired. #142: a schema-2 chart is kept (its
    weeks simply have no own Top 10); it is saved back as schema 3. */
export const normalizeStreamingWeeklyChartState = (input: unknown): StreamingWeeklyChartState | undefined => {
    const state = input as { schemaVersion?: unknown; weeks?: unknown } | undefined;
    if (!state || (state.schemaVersion !== 2 && state.schemaVersion !== 3) || !Array.isArray(state.weeks)) return undefined;
    const weeks = (state.weeks as StreamingWeeklyChartWeek[])
        .filter(week => week && Number.isFinite(week.absoluteWeek) && Array.isArray(week.films) && Array.isArray(week.series))
        .map(week => {
            const own = validLists(week.own);
            return {
                absoluteWeek: week.absoluteWeek,
                films: week.films.filter(validRow).slice(0, STREAMING_WEEKLY_CHART_SIZE),
                series: week.series.filter(validRow).slice(0, STREAMING_WEEKLY_CHART_SIZE),
                ...(own ? { own } : {}),
            };
        })
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek)
        .filter((week, index, list) => !index || list[index - 1].absoluteWeek !== week.absoluteWeek)
        .slice(-STREAMING_WEEKLY_CHART_WEEKS);
    return { schemaVersion: 3, weeks };
};

/** The weekly loop's step, after the viewing settlement: this week's chart is added once and never redone. */
export const advanceStreamingWeeklyChart = (player: Player, absoluteWeek: number): StreamingWeeklyChartState | undefined => {
    const saved = normalizeStreamingWeeklyChartState(player.world.streamingWeeklyChart);
    if (!player.ownedStreamingPlatform?.identity || player.world.worldStreamingViewing?.lastProcessedAbsoluteWeek !== absoluteWeek) return saved;
    const current = saved ?? { schemaVersion: 3 as const, weeks: [] };
    if (current.weeks.some(week => week.absoluteWeek === absoluteWeek)) return current;
    return {
        schemaVersion: 3,
        weeks: [...current.weeks.filter(week => week.absoluteWeek < absoluteWeek), buildStreamingWeeklyChartWeek(player, absoluteWeek)]
            .slice(-STREAMING_WEEKLY_CHART_WEEKS),
    };
};

/* ── what the Audience room shows ─────────────────────────────────────── */

export type StreamingChartList = 'ALL' | 'FILM' | 'SERIES';

export interface StreamingChartEntryView extends StreamingWeeklyChartRow {
    rank: number;
    /** Last week's rank in the same list; null when it was not in it, or there was no last week. */
    previousRank: number | null;
    move: 'UP' | 'DOWN' | 'SAME' | 'NEW' | null;
    /** Weeks in this list's Top 10 among the stored weeks, this one included. */
    weeksInChart: number;
    bestRank: number;
    /** #142: weeks at #1 of this list among the stored weeks, this one included. */
    weeksAtTop: number;
    platformName: string;
    platformColor: string;
    mine: boolean;
}

/** One chart's lists with the history they were read from. */
export interface StreamingChartBoard {
    available: boolean;
    /** True when last week's chart is stored, so moves and NEW are real. */
    hasPrevious: boolean;
    /** Settled weeks the chart has counted (moves start after the first). */
    weeksCounted: number;
    lists: Record<StreamingChartList, StreamingChartEntryView[]>;
}

export interface StreamingWeeklyChartView extends StreamingChartBoard {
    absoluteWeek: number | null;
    /** #142: the player's own service's Top 10 ("Top 10 on NORTHSTAR+"); its moves count from the weeks that kept it. */
    own: StreamingChartBoard;
}

type ChartLists = Pick<StreamingWeeklyChartWeek, 'absoluteWeek' | 'films' | 'series'>;

const listOf = (week: ChartLists, list: StreamingChartList): StreamingWeeklyChartRow[] => (
    list === 'FILM' ? week.films
        : list === 'SERIES' ? week.series
            : [...week.films, ...week.series].sort(byViews).slice(0, STREAMING_WEEKLY_CHART_SIZE)
);

/** #143: a week's every-service Top 10 (films and series together), as TOP 10 shows it. */
export const streamingChartAllList = (week: ChartLists): StreamingWeeklyChartRow[] => listOf(week, 'ALL');

/* a week worked out on the fly, kept per settled viewing so the room does not redo it on every change */
const liveWeeks = new WeakMap<object, StreamingWeeklyChartWeek>();

/** The chart as the Audience room reads it. A save from before #129 (or with a schema-1 chart) has no stored week
    yet: the current week is worked out from its settled viewing (and stored when the next week settles). */
export const getStreamingWeeklyChartView = (player: Player): StreamingWeeklyChartView => {
    const saved = normalizeStreamingWeeklyChartState(player.world.streamingWeeklyChart)?.weeks ?? [];
    const viewing = player.world.worldStreamingViewing;
    const settledWeek = viewing?.lastProcessedAbsoluteWeek;
    const live = () => {
        const cached = liveWeeks.get(viewing!);
        if (cached?.absoluteWeek === settledWeek) return cached;
        const built = buildStreamingWeeklyChartWeek(player, settledWeek as number);
        liveWeeks.set(viewing!, built);
        return built;
    };
    const weeks = viewing && Number.isFinite(settledWeek) && !saved.some(week => week.absoluteWeek === settledWeek) && (saved.at(-1)?.absoluteWeek ?? -1) < (settledWeek as number)
        ? [...saved, live()].slice(-STREAMING_WEEKLY_CHART_WEEKS)
        : saved;
    const current = weeks.at(-1);
    const empty = { ALL: [], FILM: [], SERIES: [] } as Record<StreamingChartList, StreamingChartEntryView[]>;
    const none: StreamingChartBoard = { available: false, hasPrevious: false, weeksCounted: 0, lists: empty };
    /* #136: a new world's first viewing week has no titles yet; that is no chart, not an empty one */
    if (!current || current.films.length + current.series.length === 0) {
        return { ...none, absoluteWeek: null, own: none };
    }
    const platform = player.ownedStreamingPlatform;
    const nameOf = (platformId: string) => (platformId === 'PLAYER'
        ? { name: platform?.identity?.name || 'Your service', color: platform?.identity?.primaryColor || '#3b82f6' }
        : (() => { const brand = resolveStreamingPlatformBrandById(platformId); return { name: brand.displayName, color: brand.primaryColor }; })());
    const board = (history: ChartLists[]): StreamingChartBoard => {
        const now = history.at(-1);
        if (!now || now.absoluteWeek !== current.absoluteWeek || now.films.length + now.series.length === 0) return none;
        const previous = history.find(week => week.absoluteWeek === now.absoluteWeek - 1) ?? null;
        const view = (list: StreamingChartList): StreamingChartEntryView[] => {
            const before = previous ? listOf(previous, list) : null;
            const past = history.map(week => listOf(week, list));
            return listOf(now, list).map((row, index) => {
                const previousIndex = before ? before.findIndex(item => item.id === row.id) : -1;
                const previousRank = previousIndex >= 0 ? previousIndex + 1 : null;
                const ranks = past.map(rows => rows.findIndex(item => item.id === row.id)).filter(at => at >= 0).map(at => at + 1);
                const { name, color } = nameOf(row.platformId);
                return {
                    ...row,
                    rank: index + 1,
                    previousRank,
                    move: !before ? null : previousRank === null ? 'NEW' : previousRank > index + 1 ? 'UP' : previousRank < index + 1 ? 'DOWN' : 'SAME',
                    weeksInChart: ranks.length,
                    bestRank: Math.min(...ranks),
                    weeksAtTop: ranks.filter(rank => rank === 1).length,
                    platformName: name,
                    platformColor: color,
                    mine: row.platformId === 'PLAYER',
                };
            });
        };
        return { available: true, hasPrevious: Boolean(previous), weeksCounted: history.length, lists: { ALL: view('ALL'), FILM: view('FILM'), SERIES: view('SERIES') } };
    };
    /* #142: your own chart, from the weeks that kept it; a stored week from before schema 3 that is the settled week
       gets its own list worked out from the settlement */
    const ownWeeks = weeks.flatMap((week): ChartLists[] => {
        const own = week.own ?? (week.absoluteWeek === settledWeek ? live().own : undefined);
        return own ? [{ absoluteWeek: week.absoluteWeek, ...own }] : [];
    });
    return { ...board(weeks), absoluteWeek: current.absoluteWeek, own: board(ownWeeks) };
};
