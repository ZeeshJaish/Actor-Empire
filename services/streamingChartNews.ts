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

/* how far back a pass looks, so a save from before the news makes no stories of its history */
const LOOKBACK_WEEKS = 2;
const HOLD_WEEKS = 4;
const DOMINANCE = 6;

const ordinal = (n: number) => (n === 4 ? 'fourth' : `${n}th`);
const short = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

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
            push(`top:${week.absoluteWeek}`, 'PLAYER', 'HIGH', `${top.title} is the most-watched title in the world`,
                `${top.title} on ${name} took the world's #1 with ${short(top.views)} views in ${gameWeekText(week.absoluteWeek)}, ahead of every service.`, top.id);
        }
        /* a title holds #1 for a fourth week running */
        let streak = 0;
        for (let at = week.absoluteWeek; all(byWeek.get(at))[0]?.id === top.id; at -= 1) streak += 1;
        if (streak === HOLD_WEEKS) {
            push(`hold:${top.id}:${week.absoluteWeek}`, top.platformId, top.platformId === 'PLAYER' ? 'HIGH' : 'MEDIUM',
                `${top.title} holds #1 for a ${ordinal(HOLD_WEEKS)} week`,
                `${top.title} on ${serviceName(top.platformId)} has been the world's most-watched title for ${HOLD_WEEKS} weeks running.`, top.id);
        }
        /* your titles enter the world's Top 10, the first time in the weeks the chart keeps */
        const earlier = new Set(weeks.filter(item => item.absoluteWeek < week.absoluteWeek).flatMap(item => all(item).map(row => row.id)));
        const entered = now.filter(row => row.platformId === 'PLAYER' && row.id !== (top.platformId === 'PLAYER' ? top.id : '') && !earlier.has(row.id));
        if (entered.length) {
            const names = entered.slice(0, 2).map(row => row.title);
            const more = entered.length > 2 ? ` and ${entered.length - 2} more` : '';
            push(`enter:${week.absoluteWeek}`, 'PLAYER', 'MEDIUM',
                `${names.join(' and ')}${more} ${entered.length === 1 ? 'enters' : 'enter'} the world's Top 10`,
                `${name}'s ${entered.length === 1 ? 'title is' : 'titles are'} now among the ten most-watched on any service, at #${entered.map(row => now.indexOf(row) + 1).join(', #')}.`,
                entered[0].id);
        }
        /* a rival holds 6 or more of the world's ten, the week it gets there */
        const count = (rows: StreamingWeeklyChartRow[], platformId: string) => rows.filter(row => row.platformId === platformId).length;
        [...new Set(now.map(row => row.platformId))].filter(platformId => platformId !== 'PLAYER').sort().forEach(platformId => {
            const held = count(now, platformId);
            if (held < DOMINANCE || count(was, platformId) >= DOMINANCE) return;
            push(`dominance:${platformId}:${week.absoluteWeek}`, platformId, 'MEDIUM',
                `${serviceName(platformId)} holds ${held} of the world's Top 10`,
                `${held} of the ten most-watched titles on any service this week are ${serviceName(platformId)}'s.`);
        });
    });
    return facts;
};
