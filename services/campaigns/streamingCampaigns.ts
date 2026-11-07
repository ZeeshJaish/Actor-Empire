/**
 * The campaign engine's streaming adapter (#145; plan §20.10 point 3).
 *  - What: the service itself, a title on it, a universe or a franchise (every title of it the service carries).
 *  - Where: the service's live countries, one region of them, or picked countries.
 *  - Money: the platform's treasury, spent week by week as the campaign runs (the week's spend is an operating cost
 *    in the weekly close); energy: a big moment's, paid when it starts. #154 (plan §20.13): the builder's campaigns
 *    run on weeks (the picks' rate card × how hard), a big moment is one night at one place, and commissioning costs
 *    5 energy plus each big moment's once, at most 20; a running campaign can be extended by weeks. #160 (plan §20.14,
 *    Zeesh: "jaise hi start button press karenge … hamara paisa sara deduct ho jayega"): a weeks campaign is paid in
 *    full when it is commissioned and cannot start without all of it; an extension is paid when it is made; stopping
 *    early gives back the weeks not run, and what is left at its end comes back too. Campaigns started before #160
 *    keep paying week by week.
 *  - Effects: the service's awareness in a country raises its marketing index there (11 × √awareness points, at most
 *    10), which the world's audience reads in how many homes know the service and choose it; a title's awareness
 *    raises its pull in that country's viewing (1 + 0.55 × √awareness).
 *  - Results: after the week settles, each campaign is credited with the joins its marketing lift brought in its
 *    countries (that week's joins × the lift's share of the service's choice, ×3: see CAMPAIGN_CREDIT_SCALE) and,
 *    for titles, the viewers its pull brought.
 * The effects themselves live in streamingCampaignEffects.ts, which the world's simulation reads.
 * The old pushes (the War Room's growth actions) stay as they were and remain the history before the engine.
 */
import type { Campaign, CampaignBook, CampaignBudget, CampaignFormatId, CampaignSubjectKind, OwnedStreamingPlatformState, Player } from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { getAbsoluteWeek } from '../legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { spendPlayerEnergy } from '../premiumLogic';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { STREAMING_DAY_ONE_REGION_LABELS, getStreamingDayOneMarket, type StreamingDayOneRegionId } from '../streamingDayOneMarkets';
import { CAMPAIGN_FORMATS, campaignCommissionEnergy, campaignFormatIn } from './campaignFormats';
import { normalizeCampaignBook } from './campaignBook';
import { campaignMarketOf } from './campaignMarkets';
import { streamingCampaignMarketingBoost, streamingCampaignTitleFit } from './streamingCampaignEffects';
import {
    CAMPAIGN_AWARENESS_DECAY,
    CAMPAIGN_EXTENDED_WEEKS,
    CAMPAIGN_MAX_WEEKS,
    CAMPAIGN_STRENGTHS,
    campaignAwarenessGain,
    campaignMomentPlace,
    campaignRateCardOf,
    campaignReach,
    type CampaignRate,
    campaignWeekBudget,
    emptyCampaignBook,
    runCampaignBookWeek,
    type CampaignMarket,
} from './campaignEngine';

/* ── reading the platform ─────────────────────────────────────────────── */

export const streamingCampaignBook = (platform: Pick<OwnedStreamingPlatformState, 'campaignBook'> | undefined): CampaignBook => (
    platform?.campaignBook ? normalizeCampaignBook(platform.campaignBook) : emptyCampaignBook()
);

/* ── the world, as campaigns see it ───────────────────────────────────── */

const liveCountryIds = (platform: OwnedStreamingPlatformState): string[] => [...new Set(platform.marketOperations
    .filter(operation => operation.scope === 'COUNTRY' && operation.status === 'ACTIVE' && operation.countryId)
    .map(operation => operation.countryId!))].sort();

/** The live countries with their homes and how dear their ads are (their homes' entertainment budget against $30). */
export const streamingCampaignMarkets = (player: Player): Map<string, CampaignMarket> => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return new Map(liveCountryIds(platform).flatMap(countryId => {
        const market = campaignMarketOf(player, countryId);
        return market ? [[countryId, market] as const] : [];
    }));
};

export interface StreamingCampaignSubject {
    kind: CampaignSubjectKind;
    id: string;
    name: string;
    projectIds: string[];
    genre?: string;
}

/** What a campaign can be about: the service, each title it streams now, and the universes and franchises among them. */
export const streamingCampaignSubjects = (player: Player): StreamingCampaignSubject[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const programWeek = platform.launchCommit ? Math.max(1, absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek + 1) : 0;
    const entries = getOwnedStreamingProgramEntries(player).filter(entry => entry.launchWeek <= programWeek);
    const links = new Map<string, { universeId?: string; franchiseId?: string }>();
    const link = (id: string, universeId?: unknown, franchiseId?: unknown) => {
        if (typeof universeId === 'string' || typeof franchiseId === 'string') {
            links.set(String(id), { ...(typeof universeId === 'string' ? { universeId } : {}), ...(typeof franchiseId === 'string' ? { franchiseId } : {}) });
        }
    };
    (player.pastProjects || []).forEach((project: any) => link(project.id, project.universeId ?? project.projectDetails?.universeId, project.franchiseId ?? project.projectDetails?.franchiseId));
    (player.activeReleases || []).forEach((project: any) => link(project.id, project.projectDetails?.universeId, project.projectDetails?.franchiseId));
    (player.world.projects || []).forEach((project: any) => link(project.id, project.universeId, project.franchiseId));
    const universes = new Map<string, string[]>();
    const franchises = new Map<string, string[]>();
    entries.forEach(entry => {
        const known = links.get(String(entry.projectId));
        if (known?.universeId) universes.set(known.universeId, [...(universes.get(known.universeId) || []), entry.projectId]);
        if (known?.franchiseId) franchises.set(known.franchiseId, [...(franchises.get(known.franchiseId) || []), entry.projectId]);
    });
    const titleOf = (projectId: string) => entries.find(entry => entry.projectId === projectId)?.title || 'Untitled';
    return [
        { kind: 'SERVICE', id: platform.identity?.slug || 'service', name: platform.identity?.name || 'Your service', projectIds: [] },
        ...entries.map(entry => ({ kind: 'TITLE' as const, id: entry.projectId, name: entry.title, projectIds: [entry.projectId], genre: entry.genre })),
        ...[...universes.entries()].map(([id, projectIds]) => ({
            kind: 'UNIVERSE' as const, id, name: player.world.universes?.[id]?.name || `${titleOf(projectIds[0])} universe`, projectIds,
        })),
        ...[...franchises.entries()].filter(([, projectIds]) => projectIds.length > 1).map(([id, projectIds]) => ({
            kind: 'FRANCHISE' as const, id, name: `${titleOf(projectIds[0])} franchise`, projectIds,
        })),
    ];
};

/** The regions among the live countries. */
export const streamingCampaignRegions = (player: Player): Array<{ id: StreamingDayOneRegionId; name: string; countryIds: string[] }> => {
    const byRegion = new Map<StreamingDayOneRegionId, string[]>();
    streamingCampaignMarkets(player).forEach((market, countryId) => {
        const region = getStreamingDayOneMarket(countryId)?.regionId;
        if (region) byRegion.set(region, [...(byRegion.get(region) || []), countryId]);
    });
    return [...byRegion.entries()].map(([id, countryIds]) => ({ id, name: STREAMING_DAY_ONE_REGION_LABELS[id], countryIds }));
};

/* ── a campaign before it starts ──────────────────────────────────────── */

export interface StreamingCampaignDraft {
    name?: string;
    subject: { kind: CampaignSubjectKind; id: string };
    where: { kind: 'LIVE' | 'REGION' | 'COUNTRIES'; regionId?: string; countryIds?: string[] };
    formats: CampaignFormatId[];
    budget: CampaignBudget;
    /** #148: an uploaded creative per format, by media id (a format with no image keeps none) */
    creativeIds?: Partial<Record<CampaignFormatId, string>>;
    /** #149: the media id its picture will be kept under (drawn after launch) */
    pictureMediaId?: string;
    /** #154: where each big moment happens (a country id); default: the biggest ad market that has it */
    places?: Partial<Record<CampaignFormatId, string>>;
}

export type StreamingCampaignProblem =
    | 'NOT_LIVE' | 'NO_SUBJECT' | 'NO_COUNTRIES' | 'NO_FORMATS' | 'BUDGET_NOT_ALLOWED' | 'FORMAT_NOWHERE'
    | 'TOO_SMALL' | 'TREASURY' | 'ENERGY';

export interface StreamingCampaignQuote {
    subject: StreamingCampaignSubject | null;
    countryIds: string[];
    /** the money the first week takes, a big moment's shows included */
    firstWeek: number;
    /** a running week's money */
    weekly: number;
    /** a burst's or pot's whole; always-on: a month */
    total: number;
    energy: number;
    /** people reached in the first week */
    reach: number;
    /** the subject's awareness across its countries after a month at this pace, by homes, 0–1 */
    awarenessAfterMonth: number;
    /** the marketing points that awareness is worth in the service's choice */
    marketingPoints: number;
    /** the big moments' sites: "Burj Khalifa" for the light show in the UAE */
    sites: Array<{ formatId: CampaignFormatId; countryId: string; site: string }>;
    /** #154: where each big moment happens */
    places: Partial<Record<CampaignFormatId, string>>;
    /** #154: the big moments' money (one night each, in the first week) */
    moments: number;
    /** #160: the treasury now; a weeks campaign is paid in full from it when it starts */
    treasury: number;
    problems: StreamingCampaignProblem[];
}

/** #154: a format's price in a campaign's countries: a week at Normal (its rate card), or one night of a big moment. */
export type StreamingCampaignRate = CampaignRate;

/** #154: every format's price in these countries, so HOW can show what each costs before it is picked. */
export const streamingCampaignRateCard = (player: Player, countryIds: string[], places?: Partial<Record<CampaignFormatId, string>>): Record<CampaignFormatId, StreamingCampaignRate> => {
    const all = streamingCampaignMarkets(player);
    return campaignRateCardOf(countryIds.map(id => all.get(id)).filter((market): market is CampaignMarket => Boolean(market)), places);
};

/** #154: a weeks budget as the builder may make it: 1–12 weeks, how hard one of 1, 1.5 and 2. */
const builtBudget = (budget: CampaignBudget): CampaignBudget => (budget.kind === 'WEEKS' ? {
    kind: 'WEEKS', weeks: Math.round(Math.min(CAMPAIGN_MAX_WEEKS, Math.max(1, budget.weeks || 1))),
    strength: (CAMPAIGN_STRENGTHS as readonly number[]).includes(budget.strength) ? budget.strength : 1,
} : budget);

const resolveCountries = (player: Player, where: StreamingCampaignDraft['where']): string[] => {
    const markets = streamingCampaignMarkets(player);
    const live = [...markets.keys()];
    if (where.kind === 'LIVE') return live;
    if (where.kind === 'REGION') return live.filter(countryId => getStreamingDayOneMarket(countryId)?.regionId === where.regionId);
    return [...new Set(where.countryIds || [])].filter(countryId => markets.has(countryId)).sort();
};

/** What a draft would cost, take in energy and do in a month, and what stops it. */
export const quoteStreamingCampaign = (player: Player, draft: StreamingCampaignDraft): StreamingCampaignQuote => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const subject = streamingCampaignSubjects(player).find(item => item.kind === draft.subject.kind && item.id === draft.subject.id) || null;
    const countryIds = resolveCountries(player, draft.where);
    const allMarkets = streamingCampaignMarkets(player);
    const markets = countryIds.map(id => allMarkets.get(id)!).filter(Boolean);
    const formats = [...new Set(draft.formats)].filter(id => id in CAMPAIGN_FORMATS);
    const problems: StreamingCampaignProblem[] = [];
    if (!platform.launchCommit) problems.push('NOT_LIVE');
    if (!subject) problems.push('NO_SUBJECT');
    if (!countryIds.length) problems.push('NO_COUNTRIES');
    if (!formats.length) problems.push('NO_FORMATS');
    if (formats.some(id => !CAMPAIGN_FORMATS[id].budgets.includes(draft.budget.kind))) problems.push('BUDGET_NOT_ALLOWED');
    if (formats.some(id => !markets.some(market => campaignFormatIn(CAMPAIGN_FORMATS[id], market.countryId)))) problems.push('FORMAT_NOWHERE');
    /* #154: every new campaign's big moments happen at one place each */
    const places = Object.fromEntries(formats.filter(id => CAMPAIGN_FORMATS[id].group === 'BIG_MOMENT')
        .map(id => [id, campaignMomentPlace(CAMPAIGN_FORMATS[id], markets, draft.places?.[id])?.countryId] as const)
        .filter((entry): entry is readonly [CampaignFormatId, string] => Boolean(entry[1]))) as Partial<Record<CampaignFormatId, string>>;
    const budget = builtBudget(draft.budget);
    const probe = { budget, spent: 0, toppedUp: 0, formats, places };
    const first = campaignWeekBudget(probe, 0, markets);
    const second = campaignWeekBudget({ ...probe, spent: first.total }, 1, markets);
    const momentMoney = first.lines.filter(line => CAMPAIGN_FORMATS[line.formatId].group === 'BIG_MOMENT').reduce((sum, line) => sum + line.spend, 0);
    /* weeks: the rate card for its weeks and the moments once; the others as they were */
    const runWeeks = budget.kind === 'WEEKS' ? Array.from({ length: budget.weeks }, (_, index) => (index === 0 ? first : index === 1 ? second : campaignWeekBudget(probe, index, markets))) : [];
    const total = budget.kind === 'WEEKS' ? runWeeks.reduce((sum, week) => sum + week.total, 0)
        : budget.kind === 'ALWAYS_ON' ? Math.round(budget.monthly) : Math.round(budget.total);
    if (budget.kind === 'BURST' && momentMoney > total) problems.push('TOO_SMALL');
    if (first.total <= 0 && formats.length && countryIds.length) problems.push('TOO_SMALL');
    /* #154: 5 to commission and each big moment's own once, at most 20 */
    const energy = formats.length ? campaignCommissionEnergy(formats) : 0;
    /* #160: a weeks campaign is paid in full when it starts, so the treasury must hold all of it */
    if ((budget.kind === 'WEEKS' ? total : first.total) > platform.treasuryCash) problems.push('TREASURY');
    if (energy > (player.energy?.current ?? 0)) problems.push('ENERGY');
    /* a month at this pace, from today's awareness */
    const spread = subject && subject.kind !== 'SERVICE' ? subject.projectIds : null;
    const book = streamingCampaignBook(platform);
    const homes = markets.reduce((sum, market) => sum + market.homes, 0);
    let weighted = 0;
    let serviceWeighted = 0;
    markets.forEach(market => {
        let level = spread ? Math.max(0, ...spread.map(id => book.titleAwareness[id]?.[market.countryId] ?? 0)) : book.serviceAwareness[market.countryId] ?? 0;
        let service = book.serviceAwareness[market.countryId] ?? 0;
        const month = budget.kind === 'WEEKS' ? [0, 1, 2, 3].map(index => runWeeks[index] ?? { lines: [], total: 0 }) : [first, second, second, second];
        month.forEach(week => {
            level = level * CAMPAIGN_AWARENESS_DECAY;
            service = service * CAMPAIGN_AWARENESS_DECAY;
            const gain = campaignAwarenessGain(level, week.lines, market);
            level = Math.min(1, level + gain);
            service = Math.min(1, service + campaignAwarenessGain(service, week.lines, market) * (spread ? 0.4 : 1));
        });
        weighted += level * market.homes;
        serviceWeighted += service * market.homes;
    });
    const awarenessAfterMonth = homes > 0 ? weighted / homes : 0;
    const sites = first.lines.filter(line => line.spend > 0 && CAMPAIGN_FORMATS[line.formatId].sites?.[line.countryId])
        .map(line => ({ formatId: line.formatId, countryId: line.countryId, site: CAMPAIGN_FORMATS[line.formatId].sites![line.countryId] }))
        .filter((item, index, list) => list.findIndex(other => other.formatId === item.formatId && other.countryId === item.countryId) === index);
    return {
        subject, countryIds, firstWeek: first.total,
        /* a running week: weeks' rate card × how hard; the others' second week (0 when nothing is left to flow) */
        weekly: budget.kind === 'WEEKS' ? Math.round(first.total - momentMoney) : second.total, total, energy,
        reach: campaignReach(first.lines, markets),
        awarenessAfterMonth: Math.round(awarenessAfterMonth * 1000) / 1000,
        marketingPoints: Math.round(streamingCampaignMarketingBoost(homes > 0 ? serviceWeighted / homes : 0) * 10) / 10,
        sites, places, moments: momentMoney, treasury: Math.round(platform.treasuryCash), problems: [...new Set(problems)],
    };
};

export interface StreamingCampaignResult {
    player: Player;
    ok: boolean;
    campaignId?: string;
    problems: StreamingCampaignProblem[];
}

const withBook = (player: Player, platform: OwnedStreamingPlatformState, book: CampaignBook): Player => ({
    ...player,
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, campaignBook: book }, player.id),
});

/** #160: money between the treasury and a campaign (paid at commission or for an extension, or given back), on the
    platform's record. */
const withMoney = (platform: OwnedStreamingPlatformState, amount: number, key: string, absoluteWeek: number, summary: string, campaignId: string): OwnedStreamingPlatformState => (
    amount === 0 ? platform : {
        ...platform,
        treasuryCash: platform.treasuryCash + amount,
        eventLedger: [...platform.eventLedger, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key), idempotencyKey: key, absoluteWeek,
            type: 'GROWTH_ACTION_APPLIED' as const, summary, source: 'PLAYER_ACTION' as const, metadata: { campaignId, amount: Math.round(amount) },
        }],
    });
const moneyWords = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);

/** Starts a campaign: it runs from the next week to settle; a big moment's energy is paid now. */
/* the creatives a campaign keeps: only for its own formats that show an image */
const creativesOf = (draft: StreamingCampaignDraft): Pick<Campaign, 'creativeIds'> => {
    const ids = Object.fromEntries(Object.entries(draft.creativeIds || {}).filter(([formatId, mediaId]) => draft.formats.includes(formatId as CampaignFormatId)
        && (CAMPAIGN_FORMATS[formatId as CampaignFormatId]?.frame ?? 0) > 0 && typeof mediaId === 'string' && mediaId.length > 0));
    return Object.keys(ids).length ? { creativeIds: ids as Campaign['creativeIds'] } : {};
};

export const startStreamingCampaign = (player: Player, draft: StreamingCampaignDraft): StreamingCampaignResult => {
    const quote = quoteStreamingCampaign(player, draft);
    if (quote.problems.length || !quote.subject) return { player, ok: false, problems: quote.problems };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const book = streamingCampaignBook(platform);
    const id = createDeterministicId('streaming_campaign', platform.simulationSeed, `campaign:${absoluteWeek}:${book.campaigns.length}:${draft.subject.kind}:${draft.subject.id}`);
    const campaign: Campaign = {
        id,
        name: draft.name?.trim() || `${quote.subject.name}${quote.subject.kind === 'SERVICE' ? '' : ''}`,
        subject: { kind: quote.subject.kind, id: quote.subject.id, name: quote.subject.name, projectIds: quote.subject.projectIds },
        where: { kind: draft.where.kind, ...(draft.where.kind === 'REGION' && draft.where.regionId ? { regionId: draft.where.regionId } : {}) },
        countryIds: quote.countryIds,
        formats: [...new Set(draft.formats)],
        budget: builtBudget(draft.budget),
        ...(Object.keys(quote.places).length ? { places: quote.places } : {}),
        energy: quote.energy,
        status: 'RUNNING',
        startedAtAbsoluteWeek: absoluteWeek + 1,
        endedAtAbsoluteWeek: null,
        spent: 0,
        toppedUp: 0,
        weeks: [],
        ...creativesOf(draft),
        ...(draft.pictureMediaId ? { pictureMediaId: draft.pictureMediaId } : {}),
        /* #160: a weeks campaign is paid in full now */
        ...(draft.budget.kind === 'WEEKS' ? { paid: Math.round(quote.total) } : {}),
    };
    const paidNow = campaign.paid ?? 0;
    const paying = withMoney(platform, -paidNow, `campaign:${id}:paid`, absoluteWeek,
        `${campaign.name}: ${moneyWords(paidNow)} paid in full for ${campaign.budget.kind === 'WEEKS' ? campaign.budget.weeks : 0} weeks`, id);
    const next = { ...withBook(player, paying, { ...book, campaigns: [...book.campaigns, campaign] }), energy: { ...player.energy }, flags: { ...player.flags } };
    if (quote.energy > 0) spendPlayerEnergy(next, quote.energy, `Campaign: ${campaign.name}`);
    return { player: next, ok: true, campaignId: id, problems: [] };
};

const updateCampaign = (player: Player, campaignId: string, update: (campaign: Campaign, absoluteWeek: number) => Campaign | null): StreamingCampaignResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const book = streamingCampaignBook(platform);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const campaign = book.campaigns.find(item => item.id === campaignId);
    const next = campaign ? update(campaign, absoluteWeek) : null;
    if (!campaign || !next) return { player, ok: false, problems: [] };
    return { player: withBook(player, platform, { ...book, campaigns: book.campaigns.map(item => (item.id === campaignId ? next : item)) }), ok: true, campaignId, problems: [] };
};

/** Stops a running or waiting campaign; what it built fades as usual. #160: a campaign paid in full gives back what it
    has not run. */
export const stopStreamingCampaign = (player: Player, campaignId: string): StreamingCampaignResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const book = streamingCampaignBook(platform);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const campaign = book.campaigns.find(item => item.id === campaignId);
    if (!campaign || (campaign.status !== 'RUNNING' && campaign.status !== 'PAUSED')) return { player, ok: false, problems: [] };
    const back = typeof campaign.paid === 'number' ? Math.max(0, Math.round(campaign.paid - campaign.spent)) : 0;
    const stopped: Campaign = { ...campaign, status: 'STOPPED', endedAtAbsoluteWeek: absoluteWeek, endReason: 'STOPPED', ...(back > 0 ? { refunded: (campaign.refunded || 0) + back } : {}) };
    const paying = withMoney(platform, back, `campaign:${campaignId}:stopped:${absoluteWeek}`, absoluteWeek, `${campaign.name} stopped: ${moneyWords(back)} of its weeks not run came back`, campaignId);
    return { player: withBook(player, paying, { ...book, campaigns: book.campaigns.map(item => (item.id === campaignId ? stopped : item)) }), ok: true, campaignId, problems: [] };
};

/** #160: what more weeks of a running weeks campaign cost, at its rate card in its countries today. */
export const streamingCampaignExtensionPrice = (player: Player, campaign: Campaign, weeks: number): number => {
    if (campaign.budget.kind !== 'WEEKS' || weeks <= 0) return 0;
    const all = streamingCampaignMarkets(player);
    const markets = campaign.countryIds.map(id => all.get(id)).filter((market): market is CampaignMarket => Boolean(market));
    /* a later week's: the rate card × how hard, no big moment (priced as a week the campaign still has to run) */
    return Math.round(campaignWeekBudget({ ...campaign, budget: { ...campaign.budget, weeks: CAMPAIGN_EXTENDED_WEEKS } }, 1, markets).total * Math.round(weeks));
};

/** #154: adds weeks to a running weeks campaign (at most 52 in all); no energy. #160: a campaign paid in full pays for
    the new weeks now, and cannot without the money; one from before #160 pays each week as it runs. */
export const extendStreamingCampaign = (player: Player, campaignId: string, weeks: number): StreamingCampaignResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const book = streamingCampaignBook(platform);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const campaign = book.campaigns.find(item => item.id === campaignId);
    if (!campaign || campaign.budget.kind !== 'WEEKS' || weeks <= 0 || (campaign.status !== 'RUNNING' && campaign.status !== 'PAUSED')
        || campaign.budget.weeks >= CAMPAIGN_EXTENDED_WEEKS) return { player, ok: false, problems: [] };
    const added = Math.min(CAMPAIGN_EXTENDED_WEEKS, campaign.budget.weeks + Math.round(weeks)) - campaign.budget.weeks;
    const price = typeof campaign.paid === 'number' ? streamingCampaignExtensionPrice(player, campaign, added) : 0;
    if (price > platform.treasuryCash) return { player, ok: false, problems: ['TREASURY'] };
    const extended: Campaign = { ...campaign, budget: { ...campaign.budget, weeks: campaign.budget.weeks + added }, ...(typeof campaign.paid === 'number' ? { paid: campaign.paid + price } : {}) };
    const paying = withMoney(platform, -price, `campaign:${campaignId}:extended:${absoluteWeek}:${extended.budget.kind === 'WEEKS' ? extended.budget.weeks : 0}`, absoluteWeek,
        `${campaign.name}: ${added} more ${added === 1 ? 'week' : 'weeks'}, ${moneyWords(price)} paid`, campaignId);
    return { player: withBook(player, paying, { ...book, campaigns: book.campaigns.map(item => (item.id === campaignId ? extended : item)) }), ok: true, campaignId, problems: [] };
};

/** Adds money to a pot; a finished pot starts again from the next week. */
export const topUpStreamingCampaign = (player: Player, campaignId: string, amount: number): StreamingCampaignResult => updateCampaign(player, campaignId, campaign => (
    campaign.budget.kind === 'POT' && amount > 0 && campaign.status !== 'STOPPED'
        ? { ...campaign, toppedUp: campaign.toppedUp + Math.round(amount), status: 'RUNNING', endedAtAbsoluteWeek: null, endReason: undefined } : null
));

/* ── the week ─────────────────────────────────────────────────────────── */

/** The campaigns' week, run before the world chooses (so this week's awareness counts this week). */
export const runStreamingCampaignsWeek = (player: Player, absoluteWeek: number): Player => {
    const platform = player.ownedStreamingPlatform;
    if (!platform?.campaignBook || !platform.launchCommit) return player;
    const normalized = normalizeOwnedStreamingPlatformState(platform, player.id);
    const { book } = runCampaignBookWeek(streamingCampaignBook(normalized), {
        absoluteWeek, markets: streamingCampaignMarkets(player), cash: normalized.treasuryCash,
    });
    /* #160: a campaign paid in full that ended under its price gives the rest back (its countries' prices drift a little) */
    let paying = normalized;
    const campaigns = book.campaigns.map(campaign => {
        const back = campaign.status === 'FINISHED' && campaign.endedAtAbsoluteWeek === absoluteWeek && typeof campaign.paid === 'number' && !campaign.refunded
            ? Math.round(campaign.paid - campaign.spent) : 0;
        if (back < 1) return campaign;
        paying = withMoney(paying, back, `campaign:${campaign.id}:ended`, absoluteWeek, `${campaign.name} ended: ${moneyWords(back)} left over came back`, campaign.id);
        return { ...campaign, refunded: back };
    });
    return withBook(player, paying, { ...book, campaigns });
};

/**
 * #153: the share of the choice alone undercounts what a lift brings: the world also answers it with homes new to
 * streaming finding the service and fewer leaving. Against the same company without campaigns, the homes a campaign
 * really added were about three times its share's credit, for every budget and format measured, so the credit is
 * scaled by 3 (at most 90% of a country's new homes).
 */
export const CAMPAIGN_CREDIT_SCALE = 3;

/**
 * After the world settled: each campaign that spent this week is credited with its share of the joins the service's
 * lift brought in its countries, and a title campaign with the viewers its pull brought.
 */
export const settleStreamingCampaignResults = (player: Player, absoluteWeek: number): Player => {
    const platform = player.ownedStreamingPlatform;
    if (!platform?.campaignBook) return player;
    const normalized = normalizeOwnedStreamingPlatformState(platform, player.id);
    const book = streamingCampaignBook(normalized);
    const ran = book.campaigns.filter(campaign => (campaign.weeks.find(week => week.absoluteWeek === absoluteWeek)?.spend || 0) > 0);
    if (!ran.length) return player;
    const customers = player.world.worldStreamingCustomers?.countries || {};
    const viewing = player.world.worldStreamingViewing;
    const base = (marketing: number) => Math.min(1, Math.max(0.45, 0.45 + marketing / 180));
    const baseMarketing = 35 + (normalized.competitiveWorld.rivalryHeat || 0);
    /* the lift's share of the service's choice in a country: exposure and quality both read the marketing index */
    const liftShare = (countryId: string) => {
        const boost = streamingCampaignMarketingBoost(book.serviceAwareness[countryId] ?? 0);
        if (boost <= 0) return 0;
        const ratio = base(baseMarketing + boost) / base(baseMarketing) * (1 + 0.11 * boost / 100 / 0.6);
        return Math.min(0.9, CAMPAIGN_CREDIT_SCALE * Math.max(0, 1 - 1 / ratio));
    };
    /* campaigns sharing a country share its credit by the spend each put there this week */
    const spendIn = new Map<string, number>();
    ran.forEach(campaign => campaign.countryIds.forEach(countryId => spendIn.set(countryId, (spendIn.get(countryId) || 0) + 1)));
    const campaigns = book.campaigns.map(campaign => {
        if (!ran.includes(campaign)) return campaign;
        /* #149: each country's share is kept too, so a campaign's page can say where it worked */
        let joins = 0;
        let viewers = 0;
        const byCountry = { ...(campaign.byCountry || {}) };
        campaign.countryIds.forEach(countryId => {
            const summary = customers[countryId]?.platformSummaries?.find(row => row.platformId === 'PLAYER');
            const newHomes = summary ? summary.joins + summary.reactivations + summary.switchIns : 0;
            const countryJoins = Math.round(newHomes * liftShare(countryId) / (spendIn.get(countryId) || 1));
            let countryViewers = 0;
            if (campaign.subject.kind !== 'SERVICE') {
                campaign.subject.projectIds.forEach(projectId => {
                    const fit = streamingCampaignTitleFit({ ...normalized, campaignBook: book }, projectId, countryId);
                    const watched = viewing?.countries?.[countryId]?.titlePerformance?.find(row => String(row.projectId) === projectId)?.viewingAccounts || 0;
                    countryViewers += watched * (fit - 1) / fit;
                });
            }
            countryViewers = Math.round(countryViewers);
            joins += countryJoins;
            viewers += countryViewers;
            if (countryJoins > 0 || countryViewers > 0) {
                const before = byCountry[countryId] || { joins: 0, viewers: 0 };
                byCountry[countryId] = { joins: before.joins + countryJoins, viewers: before.viewers + countryViewers };
            }
        });
        return {
            ...campaign,
            ...(Object.keys(byCountry).length ? { byCountry } : {}),
            weeks: campaign.weeks.map(week => (week.absoluteWeek === absoluteWeek ? { ...week, joins, viewers } : week)),
        };
    });
    return withBook(player, normalized, { ...book, campaigns });
};
