/**
 * #167 (plan §21.13, §21.17): the Marketing seat's jobs, the way the rivals' planner runs theirs
 * (`planPlatformAiCampaign`: its newest release first, a brand campaign each quarter), on the player's own service
 * and inside the player's limits.
 *
 *   - PREMIERE_PUSH: a title that premiered this week or last gets a campaign: its formats by the executive's
 *     strategy, its countries the biggest live markets (cheaper ones first for a sharper executive), three weeks,
 *     sized down to the most-for-one-action limit when it can be.
 *   - BRAND_CAMPAIGN: one service campaign a quarter (none in the last 13 weeks), four weeks.
 *   - CAMPAIGN_RESULTS: stop a running campaign that costs over twice the service's average a join (the weeks not
 *     run come back, #160); extend a strong one by a week in its last week.
 *
 * Big moments are never picked: they stay the player's.
 */
import type { Campaign, CampaignFormatId, Player, StreamingExecutiveStrategy } from '../../types';
import { CAMPAIGN_FORMATS } from '../campaigns/campaignFormats';
import {
    extendStreamingCampaign,
    quoteStreamingCampaign,
    startStreamingCampaign,
    stopStreamingCampaign,
    streamingCampaignBook,
    streamingCampaignExtensionPrice,
    streamingCampaignMarkets,
    streamingCampaignSubjects,
    type StreamingCampaignDraft,
} from '../campaigns/streamingCampaigns';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import type { StreamingTeamExecutor, StreamingTeamJobContext, StreamingTeamJobRunner, StreamingTeamProposal } from './teamJobs';

const PREMIERE_WEEKS = 3;
const BRAND_WEEKS = 4;
const BRAND_EVERY_WEEKS = 13;

const PREMIERE_FORMATS: Record<StreamingExecutiveStrategy, CampaignFormatId[]> = {
    GROWTH_FIRST: ['SHORT_VIDEO', 'SOCIAL_FEED', 'TV_SPOTS'],
    CREATIVE_FIRST: ['CREATORS', 'SHORT_VIDEO'],
    MARGIN_FIRST: ['SOCIAL_FEED', 'SHORT_VIDEO'],
    TECHNOLOGY_FIRST: ['CTV', 'SOCIAL_FEED'],
    TRUST_FIRST: ['SOCIAL_FEED', 'CREATORS'],
    GLOBAL_FIRST: ['SOCIAL_FEED', 'SHORT_VIDEO', 'CREATORS'],
    BALANCED: ['SOCIAL_FEED', 'SHORT_VIDEO', 'CREATORS'],
};
const BRAND_FORMATS: Record<StreamingExecutiveStrategy, CampaignFormatId[]> = {
    GROWTH_FIRST: ['TV_SPOTS', 'SOCIAL_FEED'],
    CREATIVE_FIRST: ['BILLBOARD', 'SHORT_VIDEO'],
    MARGIN_FIRST: ['SOCIAL_FEED', 'SEARCH'],
    TECHNOLOGY_FIRST: ['CTV', 'SEARCH'],
    TRUST_FIRST: ['SOCIAL_FEED', 'CTV'],
    GLOBAL_FIRST: ['SOCIAL_FEED', 'SHORT_VIDEO'],
    BALANCED: ['SOCIAL_FEED', 'CTV'],
};

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const formatWords = (formats: CampaignFormatId[]) => formats.map(id => CAMPAIGN_FORMATS[id].name).join(' + ');
const first = (name: string) => name.split(' ')[0] || name;
const joinsOf = (campaign: Campaign) => campaign.weeks.reduce((sum, week) => sum + week.joins, 0);

/** The live markets the executive would pick: the biggest by homes; a sharp one (skill 80+) weighs their price too. */
const pickCountries = (player: Player, skill: number, count: number): string[] => {
    const markets = [...streamingCampaignMarkets(player).values()];
    const score = (homes: number, costIndex: number) => (skill >= 80 ? homes / Math.max(0.2, costIndex) : homes);
    return markets.sort((left, right) => score(right.homes, right.costIndex) - score(left.homes, left.costIndex) || left.countryId.localeCompare(right.countryId))
        .slice(0, count).map(market => market.countryId);
};

/**
 * A draft sized to the limit when it can be: fewer countries, then fewer weeks, then the dearest format dropped.
 * If even the smallest is over the limit, the smallest is proposed (it becomes a card with its reason).
 */
const fitDraft = (player: Player, base: StreamingCampaignDraft, limit: number) => {
    let draft = base;
    let quote = quoteStreamingCampaign(player, draft);
    const shrink = (): StreamingCampaignDraft | null => {
        const countries = draft.where.countryIds || [];
        if (countries.length > 3) return { ...draft, where: { kind: 'COUNTRIES', countryIds: countries.slice(0, Math.max(3, Math.floor(countries.length * 0.7))) } };
        if (draft.budget.kind === 'WEEKS' && draft.budget.weeks > 1) return { ...draft, budget: { ...draft.budget, weeks: draft.budget.weeks - 1 } };
        if (draft.budget.kind === 'WEEKS' && draft.budget.strength > 1) return { ...draft, budget: { ...draft.budget, strength: 1 } };
        if (draft.formats.length > 1) return { ...draft, formats: draft.formats.slice(0, -1) };
        return null;
    };
    for (let step = 0; step < 12 && quote.total > limit; step += 1) {
        const next = shrink();
        if (!next) break;
        draft = next;
        quote = quoteStreamingCampaign(player, draft);
    }
    return { draft, quote };
};

const countriesFor = (context: StreamingTeamJobContext) => pickCountries(context.player, context.executive.skill, 4 + Math.floor(context.executive.skill / 20));

/* ── the premiere push ── */
export const runPremierePush: StreamingTeamJobRunner = (context) => {
    const { player, platform, absoluteWeek, executive } = context;
    if (!platform.launchCommit) return [];
    const programWeek = absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek + 1;
    const book = streamingCampaignBook(platform);
    const subjects = new Set(streamingCampaignSubjects(player).filter(subject => subject.kind === 'TITLE').map(subject => subject.id));
    const pushed = new Set(book.campaigns.filter(campaign => campaign.startedAtAbsoluteWeek > absoluteWeek - 8).flatMap(campaign => campaign.subject.projectIds));
    const fresh = getOwnedStreamingProgramEntries(player)
        .filter(entry => entry.launchWeek >= programWeek - 1 && entry.launchWeek <= programWeek && entry.launchWeek > 1
            && subjects.has(entry.projectId) && !pushed.has(entry.projectId))
        .sort((left, right) => Number(right.source === 'ORIGINAL') - Number(left.source === 'ORIGINAL') || right.launchWeek - left.launchWeek || left.title.localeCompare(right.title));
    const lead = fresh[0];
    if (!lead) return [];
    const formats = PREMIERE_FORMATS[executive.preferredStrategy];
    const { draft, quote } = fitDraft(player, {
        name: `${lead.title} premiere`,
        subject: { kind: 'TITLE', id: lead.projectId },
        where: { kind: 'COUNTRIES', countryIds: countriesFor(context) },
        formats,
        budget: { kind: 'WEEKS', weeks: PREMIERE_WEEKS, strength: executive.preferredStrategy === 'GROWTH_FIRST' ? 1.5 : 1 },
    }, context.seat.actionMoney);
    if (quote.problems.some(problem => problem !== 'TREASURY' && problem !== 'ENERGY')) return [];
    const weeks = draft.budget.kind === 'WEEKS' ? draft.budget.weeks : PREMIERE_WEEKS;
    const proposal: StreamingTeamProposal = {
        jobId: 'PREMIERE_PUSH',
        dedupeKey: `premiere:${lead.projectId}`,
        title: `Push ${lead.title}'s premiere`,
        detail: `${formatWords(draft.formats)} · ${quote.countryIds.length} countries · ${weeks} week${weeks === 1 ? '' : 's'}`,
        reason: `${lead.source === 'ORIGINAL' ? 'Your Original' : 'It'} premiered ${lead.launchWeek === programWeek ? 'this week' : 'last week'}; ${first(executive.nameAtAppointment)}'s pick: your ${quote.countryIds.length} ${executive.skill >= 80 ? 'best-value' : 'biggest'} markets.`,
        cost: quote.total,
        energy: quote.energy,
        action: { kind: 'CAMPAIGN_START', draft: { ...draft, projectId: lead.projectId } as unknown as Record<string, unknown> },
        priority: 30,
    };
    return [proposal];
};

/* ── the brand campaign ── */
export const runBrandCampaign: StreamingTeamJobRunner = (context) => {
    const { player, platform, absoluteWeek, executive } = context;
    if (!platform.launchCommit || absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek < 4) return [];
    const book = streamingCampaignBook(platform);
    const recent = book.campaigns.some(campaign => campaign.subject.kind === 'SERVICE'
        && (campaign.status === 'RUNNING' || campaign.status === 'PAUSED' || campaign.startedAtAbsoluteWeek > absoluteWeek - BRAND_EVERY_WEEKS));
    if (recent) return [];
    const service = streamingCampaignSubjects(player).find(subject => subject.kind === 'SERVICE');
    if (!service) return [];
    const { draft, quote } = fitDraft(player, {
        name: `${service.name} brand`,
        subject: { kind: 'SERVICE', id: service.id },
        where: { kind: 'COUNTRIES', countryIds: countriesFor(context) },
        formats: BRAND_FORMATS[executive.preferredStrategy],
        budget: { kind: 'WEEKS', weeks: BRAND_WEEKS, strength: 1 },
    }, context.seat.actionMoney);
    if (quote.problems.some(problem => problem !== 'TREASURY' && problem !== 'ENERGY')) return [];
    const weeks = draft.budget.kind === 'WEEKS' ? draft.budget.weeks : BRAND_WEEKS;
    const last = book.campaigns.filter(campaign => campaign.subject.kind === 'SERVICE').sort((left, right) => right.startedAtAbsoluteWeek - left.startedAtAbsoluteWeek)[0];
    return [{
        jobId: 'BRAND_CAMPAIGN',
        dedupeKey: `brand:${Math.floor(absoluteWeek / BRAND_EVERY_WEEKS)}`,
        title: `Brand campaign for ${service.name}`,
        detail: `${formatWords(draft.formats)} · ${quote.countryIds.length} countries · ${weeks} week${weeks === 1 ? '' : 's'}`,
        reason: last ? `${absoluteWeek - last.startedAtAbsoluteWeek} weeks since the last one; a brand campaign each quarter keeps the service in mind.` : 'No brand campaign yet; one a quarter keeps the service in mind.',
        cost: quote.total,
        energy: quote.energy,
        action: { kind: 'CAMPAIGN_START', draft: draft as unknown as Record<string, unknown> },
        priority: 10,
    }];
};

/* ── stop or extend ── */
export const runCampaignResults: StreamingTeamJobRunner = (context) => {
    const { player, platform } = context;
    const book = streamingCampaignBook(platform);
    const withJoins = book.campaigns.filter(campaign => campaign.spent > 0 && joinsOf(campaign) > 0);
    if (!withJoins.length) return [];
    const average = withJoins.reduce((sum, campaign) => sum + campaign.spent, 0) / Math.max(1, withJoins.reduce((sum, campaign) => sum + joinsOf(campaign), 0));
    const proposals: StreamingTeamProposal[] = [];
    book.campaigns.filter(campaign => campaign.status === 'RUNNING' && campaign.budget.kind === 'WEEKS').forEach(campaign => {
        const ran = campaign.weeks.filter(week => week.spend > 0).length;
        const joins = joinsOf(campaign);
        const perJoin = joins > 0 ? campaign.spent / joins : Infinity;
        const totalWeeks = campaign.budget.kind === 'WEEKS' ? campaign.budget.weeks : 0;
        if (ran >= 2 && perJoin > average * 2) {
            const back = typeof campaign.paid === 'number' ? Math.max(0, campaign.paid - campaign.spent) : 0;
            proposals.push({
                jobId: 'CAMPAIGN_RESULTS',
                dedupeKey: `stop:${campaign.id}`,
                title: `Stop ${campaign.name}`,
                detail: back > 0 ? `${money(back)} of its weeks not run comes back` : 'It stops at the end of this week',
                reason: joins > 0
                    ? `${money(perJoin)} a join after ${ran} weeks, over twice your average (${money(average)}).`
                    : `No joins after ${ran} weeks; your average is ${money(average)} a join.`,
                cost: 0,
                energy: 0,
                action: { kind: 'CAMPAIGN_STOP', campaignId: campaign.id },
                priority: 40,
            });
        } else if (ran >= 1 && totalWeeks - ran <= 1 && perJoin < average * 0.6 && totalWeeks < 12) {
            proposals.push({
                jobId: 'CAMPAIGN_RESULTS',
                dedupeKey: `extend:${campaign.id}:${totalWeeks}`,
                title: `Extend ${campaign.name} by a week`,
                detail: `Week ${totalWeeks + 1}, at today's prices`,
                reason: `${money(perJoin)} a join, well under your average (${money(average)}).`,
                cost: streamingCampaignExtensionPrice(player, campaign, 1),
                energy: 0,
                action: { kind: 'CAMPAIGN_EXTEND', campaignId: campaign.id, weeks: 1 },
                priority: 20,
            });
        }
    });
    return proposals;
};

/* ── doing it: the same services as the Campaign Studio's buttons ── */

/** #167: a campaign the team started carries who ran it, for the Campaign Studio's "Run by …" */
const markRunBy = (player: Player, campaignId: string | undefined, name: string): Player => {
    if (!campaignId) return player;
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const book = streamingCampaignBook(platform);
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            campaignBook: { ...book, campaigns: book.campaigns.map(campaign => (campaign.id === campaignId ? { ...campaign, runBy: { name, seatId: 'MARKETING' } } : campaign)) },
        }, player.id),
    };
};

const problemWords = (problems: string[]) => (problems.includes('TREASURY') ? 'The treasury cannot pay for it in full.'
    : problems.includes('ENERGY') ? 'Not enough energy.' : problems.length ? `Refused: ${problems.join(', ').toLowerCase().replaceAll('_', ' ')}.` : 'It could not start.');

export const executeCampaignStart: StreamingTeamExecutor = (player, action, context) => {
    if (action.kind !== 'CAMPAIGN_START') return { player, changed: false };
    const { projectId: _projectId, ...draft } = action.draft as unknown as StreamingCampaignDraft & { projectId?: string };
    const result = startStreamingCampaign(player, draft);
    if (!result.ok) return { player, changed: false, reason: problemWords(result.problems) };
    return { player: markRunBy(result.player, result.campaignId, context.executiveName), changed: true };
};

export const executeCampaignStop: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'CAMPAIGN_STOP') return { player, changed: false };
    const result = stopStreamingCampaign(player, action.campaignId);
    return result.ok ? { player: result.player, changed: true } : { player, changed: false, reason: 'It is no longer running.' };
};

export const executeCampaignExtend: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'CAMPAIGN_EXTEND') return { player, changed: false };
    const result = extendStreamingCampaign(player, action.campaignId, action.weeks);
    return result.ok ? { player: result.player, changed: true } : { player, changed: false, reason: problemWords(result.problems) };
};
