/**
 * #152 (plan §20.10, "Rival AI platforms … run title, brand and franchise campaigns from their own budgets and
 * strategies. Their pull rises and the news reports them"): a rival AI platform runs campaigns through the campaign
 * engine, as the player does, once the player's service is open.
 *  - Who: an AI platform that is ACTIVE, open in countries, and under no spending restrictions.
 *  - What: a title it released in the last two weeks (its Originals first, then the best of the rest), or that title's
 *    universe when it carries more of it; the service itself about twice a year. At most two run at once, and a title
 *    is pushed once.
 *  - Where: its biggest open markets by homes, up to eight (a title: where it released).
 *  - How: formats by its strengths: the feeds always, connected TV when it sells well, billboards (and metro wraps for
 *    the service); for its best (a title of quality 75 or more, a universe, the service) a famous screen when it is
 *    prestigious, and a big moment when the budget carries it (a light show where a landmark is, a building reveal, a
 *    drone show; a fan festival for a universe; #154: one night at its biggest ad market that has it). So only its big
 *    pushes make the news.
 *  - How much: a share of a week's revenue, more for a bolder rival and a better title; a one-time burst of 2–4 weeks,
 *    started only when it can spare twice the total.
 *  - The week: the engine spends from what it can spare beyond twelve weeks of running costs (after its launch
 *    marketing); what it spends is a discretionary cost in its economy, like its launch marketing. Finished campaigns
 *    are kept 12 weeks (6 at most), and an empty book is dropped.
 * The effects are the player's: its service's awareness raises its marketing index where it ran (its offer), a title's
 * awareness raises the title's pull in the weekly chart, and its big nights make the news (streamingCampaignNews.ts).
 */
import type { Campaign, CampaignBook, CampaignFormatId, PlatformState, Player } from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { CAMPAIGN_FORMATS, campaignFormatIn } from '../campaigns/campaignFormats';
import { normalizeCampaignBook } from '../campaigns/campaignBook';
import { campaignMomentLines, campaignMomentPlace, emptyCampaignBook, runCampaignBookWeek, type CampaignMarket } from '../campaigns/campaignEngine';
import { campaignMarketOf } from '../campaigns/campaignMarkets';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';

export const PLATFORM_AI_CAMPAIGNS_RUNNING = 2;
export const PLATFORM_AI_CAMPAIGN_COUNTRIES = 8;
/* a share of a week's revenue per campaign, before its boldness and the title */
export const PLATFORM_AI_CAMPAIGN_REVENUE_SHARE = 0.03;
const MIN_BUDGET = 1_000_000;
const MAX_BUDGET = 80_000_000;
/* the service itself, about twice a year: a half-year since the last, on one of its two beats */
const BRAND_EVERY_WEEKS = 26;
const FINISHED_KEPT_WEEKS = 12;
const FINISHED_KEPT = 6;
/* a big moment for a title this good, when it costs at most this share of the budget */
const BIG_MOMENT_QUALITY = 75;
const BIG_MOMENT_SHARE = 0.45;

const roundMillions = (value: number) => Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export interface PreparePlatformAiCampaignsWeekInput {
    player: Player;
    platform: PlatformState;
    absoluteWeek: number;
    /** what its launch marketing already spends this week, in millions */
    alreadySpentMillions?: number;
}

export interface PreparePlatformAiCampaignsWeekResult {
    platform: PlatformState;
    changed: boolean;
    discretionaryCostMillions: number;
    /** the campaign it started this week, if any */
    started: Campaign | null;
}

const openCountryIds = (platform: PlatformState): string[] => {
    const ai = platform.ai!;
    return [...new Set([
        ...ai.capabilities.activeCountryIds,
        ...ai.marketOperations.filter(operation => operation.status === 'ACTIVE' && operation.countryId).map(operation => operation.countryId!),
    ])].sort();
};

/** What it can spend this week: its cash beyond twelve weeks of running costs and its launch marketing's share. */
export const platformAiCampaignCash = (platform: PlatformState, alreadySpentMillions = 0): number => {
    const ai = platform.ai!;
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const recent = ai.financeHistory.slice(-13).map(snapshot => Math.max(0, snapshot.operatingCostMillions));
    const weekly = recent.length ? sum(recent) / recent.length
        : profile.baseWeeklyOperationsMillions + openCountryIds(platform).length * profile.regionWeeklyCostMillions;
    return Math.max(0, platform.cashReserve - Math.max(0, alreadySpentMillions) - weekly * 12) * 1_000_000;
};

/** A week's revenue, from its last month (or its subscribers at its price, before it has a month). */
const weeklyRevenue = (platform: PlatformState): number => {
    const recent = platform.ai!.financeHistory.slice(-4).map(snapshot => Math.max(0, snapshot.revenueMillions));
    if (recent.length) return sum(recent) / recent.length * 1_000_000;
    return Math.max(0, platform.subscribers) * 1_000_000 * PLATFORM_AI_PROFILES[platform.id].monthlyArpu / 4.33;
};

/** The campaign it starts this week, if any. */
export const planPlatformAiCampaign = (player: Player, platform: PlatformState, book: CampaignBook, absoluteWeek: number, cash: number): Campaign | null => {
    const ai = platform.ai;
    if (!ai || ai.status !== 'ACTIVE' || ai.spendingRestrictions.source !== 'NONE') return null;
    if (book.campaigns.filter(campaign => campaign.status === 'RUNNING' || campaign.status === 'PAUSED').length >= PLATFORM_AI_CAMPAIGNS_RUNNING) return null;
    const markets = new Map(openCountryIds(platform).flatMap(countryId => {
        const market = campaignMarketOf(player, countryId);
        return market ? [[countryId, market] as const] : [];
    }));
    if (!markets.size) return null;
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const projects = new Map((player.world.projects || []).map(project => [String(project.id), project]));
    const pushed = new Set(book.campaigns.flatMap(campaign => campaign.subject.projectIds));
    const biggest = (countryIds: string[]) => countryIds.filter(countryId => markets.has(countryId))
        .sort((left, right) => markets.get(right)!.homes - markets.get(left)!.homes || left.localeCompare(right))
        .slice(0, PLATFORM_AI_CAMPAIGN_COUNTRIES);

    /* its newest releases: its Originals first, then the best */
    const fresh = ai.slate.flatMap(plan => plan.releaseEntries
        .filter(entry => entry.status === 'RELEASED' && entry.releasedAtAbsoluteWeek !== null
            && entry.releasedAtAbsoluteWeek >= absoluteWeek - 2 && entry.releasedAtAbsoluteWeek <= absoluteWeek && !pushed.has(entry.canonicalProjectId))
        .map(entry => ({ original: plan.source === 'COMMISSIONED_ORIGINAL', entry, title: projects.get(entry.canonicalProjectId)?.title || plan.title,
            quality: projects.get(entry.canonicalProjectId)?.quality ?? 50, universeId: projects.get(entry.canonicalProjectId)?.universeId })))
        .sort((left, right) => Number(right.original) - Number(left.original) || right.quality - left.quality
            || left.entry.canonicalProjectId.localeCompare(right.entry.canonicalProjectId));
    const lead = fresh[0];
    const beat = Math.floor(createDeterministicRng(`platform-ai-campaign-beat:${platform.id}`)() * 13);
    const brandDue = !book.campaigns.some(campaign => campaign.subject.kind === 'SERVICE' && campaign.startedAtAbsoluteWeek > absoluteWeek - BRAND_EVERY_WEEKS)
        && (absoluteWeek + beat) % 13 === 0;

    let subject: Campaign['subject'];
    let countryIds: string[];
    if (lead) {
        /* a title, or its universe when the service carries more of it */
        const carried = lead.universeId ? (player.world.projects || []).filter(project => project.universeId === lead.universeId
            && (project.streamingWindows || []).some(window => window.platformId === platform.id
                && window.startsAtAbsoluteWeek <= absoluteWeek && window.expiresAtAbsoluteWeek > absoluteWeek)).map(project => String(project.id)) : [];
        const universe = lead.universeId && carried.length > 1 ? lead.universeId : null;
        subject = universe
            ? { kind: 'UNIVERSE', id: universe, name: player.world.universes?.[universe]?.name || `${lead.title} universe`,
                projectIds: [...new Set([lead.entry.canonicalProjectId, ...carried])] }
            : { kind: 'TITLE', id: lead.entry.canonicalProjectId, name: lead.title, projectIds: [lead.entry.canonicalProjectId] };
        countryIds = biggest(lead.entry.countryIds.length ? lead.entry.countryIds : [...markets.keys()]);
    } else if (brandDue) {
        subject = { kind: 'SERVICE', id: platform.id, name: platform.name, projectIds: [] };
        countryIds = biggest([...markets.keys()]);
    } else {
        return null;
    }
    if (!countryIds.length) return null;

    /* how much: a share of a week's revenue, bolder rivals and better titles more */
    const weight = subject.kind === 'SERVICE' ? 1.4 : subject.kind === 'UNIVERSE' ? 1.2 : Math.max(0.6, (lead?.quality ?? 50) / 70);
    const total = Math.round(Math.min(MAX_BUDGET, Math.max(MIN_BUDGET,
        weeklyRevenue(platform) * PLATFORM_AI_CAMPAIGN_REVENUE_SHARE * (0.7 + profile.riskTolerance) * weight)));
    if (total * 2 > cash) return null;

    /* how: by its strengths */
    const rng = createDeterministicRng(`platform-ai-campaign:${platform.id}:${absoluteWeek}`);
    const formats: CampaignFormatId[] = ['SOCIAL_FEED', 'SHORT_VIDEO'];
    const places: Partial<Record<CampaignFormatId, string>> = {};
    if (ai.competence.commercial >= 8) formats.push('CTV');
    formats.push('BILLBOARD');
    if (subject.kind === 'SERVICE') formats.push('METRO_WRAP');
    const worthy = subject.kind !== 'TITLE' || (lead?.quality ?? 0) >= BIG_MOMENT_QUALITY;
    if (worthy && ai.competence.prestige >= 8.5 && countryIds.some(countryId => campaignFormatIn(CAMPAIGN_FORMATS.CITY_SCREEN, countryId))) formats.push('CITY_SCREEN');
    if (worthy && rng() < ai.competence.creative / 10 * 0.6) {
        const candidates: CampaignFormatId[] = subject.kind === 'UNIVERSE' ? ['FAN_FESTIVAL', 'LANDMARK_LIGHT_SHOW', 'DRONE_SHOW']
            : subject.kind === 'SERVICE' ? ['DRONE_SHOW', 'LANDMARK_LIGHT_SHOW', 'LIVE_SHOW'] : ['LANDMARK_LIGHT_SHOW', 'BUILDING_REVEAL', 'DRONE_SHOW'];
        const here = candidates.filter(id => countryIds.some(countryId => campaignFormatIn(CAMPAIGN_FORMATS[id], countryId)));
        const moment = here.length ? here[Math.floor(rng() * here.length)] : null;
        /* #154: one night at one place, its biggest ad market that has it */
        const where = countryIds.map(countryId => markets.get(countryId)!);
        const place = moment ? campaignMomentPlace(CAMPAIGN_FORMATS[moment], where) : null;
        const cost = moment && place ? sum(campaignMomentLines([moment], where, { [moment]: place.countryId }).map(line => line.spend)) : 0;
        if (moment && place && cost <= total * BIG_MOMENT_SHARE) { formats.push(moment); places[moment] = place.countryId; }
    }
    const weeks = total >= 25_000_000 ? 4 : total >= 6_000_000 ? 3 : 2;
    return {
        id: createDeterministicId('platform_ai_campaign', platform.id, absoluteWeek, subject.kind, subject.id),
        name: subject.name,
        subject,
        where: { kind: 'COUNTRIES' },
        countryIds,
        formats,
        budget: { kind: 'BURST', total, weeks },
        ...(Object.keys(places).length ? { places } : {}),
        energy: 0,
        status: 'RUNNING',
        startedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        spent: 0,
        toppedUp: 0,
        weeks: [],
    };
};

/* finished campaigns are kept 12 weeks, 6 at most; a book with nothing running, nothing kept and no awareness is dropped */
const pruned = (book: CampaignBook, absoluteWeek: number): CampaignBook | undefined => {
    const finished = book.campaigns.filter(campaign => (campaign.status === 'FINISHED' || campaign.status === 'STOPPED')
        && (campaign.endedAtAbsoluteWeek ?? absoluteWeek) > absoluteWeek - FINISHED_KEPT_WEEKS).slice(-FINISHED_KEPT);
    const campaigns = book.campaigns.filter(campaign => (campaign.status !== 'FINISHED' && campaign.status !== 'STOPPED') || finished.includes(campaign));
    const next = { ...book, campaigns };
    return campaigns.length || Object.keys(next.serviceAwareness).length || Object.keys(next.titleAwareness).length ? next : undefined;
};

/** Its campaigns' week: it may start one, then every running one spends from what it can spare. */
export const preparePlatformAiCampaignsWeek = ({
    player,
    platform,
    absoluteWeek,
    alreadySpentMillions = 0,
}: PreparePlatformAiCampaignsWeekInput): PreparePlatformAiCampaignsWeekResult => {
    const ai = platform.ai;
    const idle = { platform, changed: false, discretionaryCostMillions: 0, started: null };
    if (!ai) return idle;
    const before = ai.campaignBook ? normalizeCampaignBook(ai.campaignBook) : null;
    if (before?.lastRunAbsoluteWeek === absoluteWeek) return idle;
    /* rivals push only once the player's service is open, as their tech pace does */
    const open = Boolean(player.ownedStreamingPlatform?.launchCommit);
    const cash = platformAiCampaignCash(platform, alreadySpentMillions);
    const started = open ? planPlatformAiCampaign(player, platform, before ?? emptyCampaignBook(), absoluteWeek, cash) : null;
    if (!before && !started) return idle;
    const book: CampaignBook = started ? { ...(before ?? emptyCampaignBook()), campaigns: [...(before?.campaigns ?? []), started] } : before!;
    const markets = new Map<string, CampaignMarket>();
    book.campaigns.flatMap(campaign => campaign.countryIds).forEach(countryId => {
        const market = markets.has(countryId) ? null : campaignMarketOf(player, countryId);
        if (market) markets.set(countryId, market);
    });
    const ran = runCampaignBookWeek(book, { absoluteWeek, markets, cash });
    const kept = pruned(ran.book, absoluteWeek);
    const { campaignBook: _dropped, ...rest } = ai;
    return {
        platform: { ...platform, ai: kept ? { ...rest, campaignBook: kept } : rest },
        changed: true,
        discretionaryCostMillions: roundMillions(ran.spent / 1_000_000),
        started,
    };
};
