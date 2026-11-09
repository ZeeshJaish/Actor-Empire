/**
 * #143 (plan §20.9 F): the weekly Top 10 in the news, on notable weeks only.
 *  - your title becomes the world's #1 (HIGH: News, X and Instagram);
 *  - a title holds the world's #1 for a fourth week running (MEDIUM; HIGH when it is yours);
 *  - your titles enter the world's Top 10 for the first time in the weeks the chart keeps (MEDIUM, one story a week
 *    naming up to two; not the one that went to #1). A title slipping out at #10 and back in is not news again;
 *  - a rival holds 6 or more of the world's ten, the week it gets there (MEDIUM).
 * Read from the stored weekly chart (#129, `world.streamingWeeklyChart`): every week settled since the last industry
 * pass, each against the week before it. A quiet week makes no story. Pure: reads the player, returns facts.
 */
import { gameWeekText } from './gameWeek';
import type { IndustryEventFact, Player, StreamingWeeklyChartRow, StreamingWeeklyChartWeek } from '../types';
import { createIndustryEventFact } from './industryWorld/industryEventLedger';
import { normalizeStreamingWeeklyChartState, streamingChartAllList } from './streamingWeeklyChart';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';
import { fillCopy, pickCopy, pickFreshCopy, sentenceStart, type CopyVars } from './industryWorld/mediaCopyVariety';

/* how far back a pass looks, so a save from before the news makes no stories of its history */
const LOOKBACK_WEEKS = 2;
const HOLD_WEEKS = 4;
const DOMINANCE = 6;

const ordinal = (n: number) => (n === 4 ? 'fourth' : `${n}th`);
const short = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/* 2026-11-09 (Zeesh: news should feel new each time): each chart moment is written several ways; a headline frame used
   in the last half year waits its turn. The numbers in the details are the chart's own. */
type ChartFamily = { headlines: readonly string[]; details: readonly string[] };
const CHART_TOP: ChartFamily = {
    headlines: ['{title} is the most-watched title in the world', "{title} is now the world's #1", '{title} takes the top spot worldwide', 'Nothing is watched more than {title} right now', 'The whole world is watching {title}', '{title} climbs to #1 on the world chart'],
    details: ["{title} on {service} took the world's #1 with {views} views in {when}, ahead of every service.", '{views} views in {when} put {title} on {service} above every other title, on any service.', 'With {views} views in {when}, {title} is the most-watched title anywhere. It streams on {service}.'],
};
const CHART_HOLD: ChartFamily = {
    headlines: ['{title} holds #1 for a {nth} week', '{title} stays on top for a {nth} week', 'Still #1: {title}', '{title} will not give up the top spot', 'A {nth} week at #1 for {title}'],
    details: ["{title} on {service} has been the world's most-watched title for {weeks} weeks running.", 'For {weeks} weeks running, nothing has beaten {title} on {service}.', '{title} has led the world chart for {weeks} straight weeks, on {service}.'],
};
const CHART_ENTER: ChartFamily = {
    headlines: ["{names} {enters} the world's Top 10", 'Top 10 debut: {names}', '{names} {breaks} into the global Top 10', "New in the world's Top 10: {names}", "{names} {joins} the world's most-watched"],
    details: ["{service}'s {titleIs} now among the ten most-watched on any service, at {ranks}.", "At {ranks}, {service} now has {count} in the world's ten most-watched titles."],
};
const CHART_DOMINANCE: ChartFamily = {
    headlines: ["{service} holds {held} of the world's Top 10", '{service} owns the world chart: {held} of the Top 10', "{held} of the world's Top 10 belong to {service}", '{service} crowds the Top 10 with {held} titles'],
    details: ["{held} of the ten most-watched titles on any service this week are {service}'s.", 'This week {service} has {held} of the ten most-watched titles anywhere.'],
};

/** The world's chart in the news since the last industry pass, as facts stamped with this week */
export const collectStreamingChartFacts = (player: Player, sinceWeek: number, absoluteWeek: number): IndustryEventFact[] => {
    const platform = player.ownedStreamingPlatform;
    const slug = platform?.identity?.slug;
    const name = platform?.identity?.name?.trim();
    if (!platform?.launchCommit || !slug || !name) return [];
    const weeks = normalizeStreamingWeeklyChartState(player.world.streamingWeeklyChart)?.weeks ?? [];
    const from = Math.max(sinceWeek, absoluteWeek - LOOKBACK_WEEKS);
    const byWeek = new Map(weeks.map(week => [week.absoluteWeek, week]));
    const all = (week: StreamingWeeklyChartWeek | undefined): StreamingWeeklyChartRow[] => (week ? streamingChartAllList(week) : []);
    const serviceName = (platformId: string) => (platformId === 'PLAYER' ? name : resolveStreamingPlatformBrandById(platformId).displayName);
    const facts: IndustryEventFact[] = [];
    const recent = (player.world?.industryEvents?.events || []).filter(event => absoluteWeek - event.absoluteWeek <= 26).map(event => event.headline);
    const chartCopy = (key: string, family: ChartFamily, vars: CopyVars) => {
        const headline = sentenceStart(fillCopy(pickFreshCopy(`streaming-chart:${slug}:${key}`, family.headlines, recent), vars));
        recent.push(headline);
        return { headline, detail: sentenceStart(fillCopy(pickCopy(`streaming-chart-detail:${slug}:${key}`, family.details), vars)) };
    };
    const push = (key: string, platformId: string, importance: IndustryEventFact['importance'], headline: string, detail: string, projectId?: string) => {
        const id = platformId === 'PLAYER' ? slug : platformId;
        facts.push(createIndustryEventFact({
            idempotencyKey: `streaming-chart:${slug}:${key}`,
            absoluteWeek, type: 'PLATFORM_CHART_MOMENT', importance,
            companyId: id, companyName: serviceName(platformId), platformId: id,
            headline, detail,
            evidence: [{ kind: 'PLATFORM', id }, ...(projectId ? [{ kind: 'PROJECT' as const, id: projectId }] : [])],
        }));
    };

    weeks.filter(week => week.absoluteWeek >= from && week.absoluteWeek < absoluteWeek).forEach(week => {
        const before = byWeek.get(week.absoluteWeek - 1);
        if (!before) return;
        const now = all(week);
        const was = all(before);
        const top = now[0];
        if (!top) return;
        /* your title becomes the world's #1 */
        if (top.platformId === 'PLAYER' && was[0]?.id !== top.id) {
            const copy = chartCopy(`top:${week.absoluteWeek}`, CHART_TOP, { title: top.title, service: name, views: short(top.views), when: gameWeekText(week.absoluteWeek) });
            push(`top:${week.absoluteWeek}`, 'PLAYER', 'HIGH', copy.headline, copy.detail, top.id);
        }
        /* a title holds #1 for a fourth week running */
        let streak = 0;
        for (let at = week.absoluteWeek; all(byWeek.get(at))[0]?.id === top.id; at -= 1) streak += 1;
        if (streak === HOLD_WEEKS) {
            const copy = chartCopy(`hold:${top.id}:${week.absoluteWeek}`, CHART_HOLD, { title: top.title, service: serviceName(top.platformId), nth: ordinal(HOLD_WEEKS), weeks: String(HOLD_WEEKS) });
            push(`hold:${top.id}:${week.absoluteWeek}`, top.platformId, top.platformId === 'PLAYER' ? 'HIGH' : 'MEDIUM', copy.headline, copy.detail, top.id);
        }
        /* your titles enter the world's Top 10, the first time in the weeks the chart keeps */
        const earlier = new Set(weeks.filter(item => item.absoluteWeek < week.absoluteWeek).flatMap(item => all(item).map(row => row.id)));
        const entered = now.filter(row => row.platformId === 'PLAYER' && row.id !== (top.platformId === 'PLAYER' ? top.id : '') && !earlier.has(row.id));
        if (entered.length) {
            const names = entered.slice(0, 2).map(row => row.title);
            const more = entered.length > 2 ? ` and ${entered.length - 2} more` : '';
            const one = entered.length === 1;
            const copy = chartCopy(`enter:${week.absoluteWeek}`, CHART_ENTER, {
                names: `${names.join(' and ')}${more}`, enters: one ? 'enters' : 'enter', breaks: one ? 'breaks' : 'break', joins: one ? 'joins' : 'join',
                service: name, titleIs: one ? 'title is' : 'titles are', count: one ? 'one title' : `${entered.length} titles`,
                ranks: `#${entered.map(row => now.indexOf(row) + 1).join(', #')}`,
            });
            push(`enter:${week.absoluteWeek}`, 'PLAYER', 'MEDIUM', copy.headline, copy.detail, entered[0].id);
        }
        /* a rival holds 6 or more of the world's ten, the week it gets there */
        const count = (rows: StreamingWeeklyChartRow[], platformId: string) => rows.filter(row => row.platformId === platformId).length;
        [...new Set(now.map(row => row.platformId))].filter(platformId => platformId !== 'PLAYER').sort().forEach(platformId => {
            const held = count(now, platformId);
            if (held < DOMINANCE || count(was, platformId) >= DOMINANCE) return;
            const copy = chartCopy(`dominance:${platformId}:${week.absoluteWeek}`, CHART_DOMINANCE, { service: serviceName(platformId), held: String(held) });
            push(`dominance:${platformId}:${week.absoluteWeek}`, platformId, 'MEDIUM', copy.headline, copy.detail);
        });
    });
    return facts;
};
