/**
 * The campaign engine's core (#145; plan §20.10 point 3). It knows no business: a campaign is formats, countries and
 * a budget, and each week it spends, reaches people and builds awareness. Adapters (streaming today; the Studio, the
 * Production House and the Cinema later) say what the countries are, what the money is, and what awareness does.
 *
 *  - Money: a burst spreads its total over 1–6 weeks; a pot spends at its pace (or a sixth of what is left) until it
 *    runs out; always-on spends a monthly amount weekly until stopped. A big moment is one show in each country where
 *    it exists, paid in the first week. A week the money is not there, the campaign waits (PAUSED) and picks up again.
 *  - #154 (plan §20.13), weeks: each picked format costs its rate card a week in each of the campaign's countries
 *    (`minWeekly` × the country's homes ÷ 20M × its ad prices, so a week buys the same weight everywhere), × how hard
 *    (1, 1.5 or 2), for its weeks; a big moment is one night at one place (`places`, else the biggest ad market where
 *    it exists), paid in the first week, and the news carries a quarter of its impressions to the campaign's other
 *    countries. Campaigns started before #154 keep their own rules.
 *  - Reach: money buys impressions at the format's price a thousand, scaled by the country's ad prices; each format's
 *    share of a week goes to the countries by their homes, so a campaign reads as evenly across its countries.
 *  - Awareness: a country's people are reached again and again; what one week adds is (1 − awareness) × (1 − e^−x),
 *    x = impressions × impact ÷ people, so it saturates; all awareness fades by 0.84 a week (about half in four).
 * Pure: takes a book and the week's markets, returns the next book.
 */
import type { Campaign, CampaignBook, CampaignFormatId, CampaignWeek } from '../../types';
import { CAMPAIGN_FORMATS, CAMPAIGN_FORMAT_ORDER, campaignFormatIn, type CampaignFormat } from './campaignFormats';

export const CAMPAIGN_AWARENESS_DECAY = 0.84;
export const CAMPAIGN_WEEKS_KEPT = 26;
export const CAMPAIGN_FINISHED_KEPT = 40;
export const CAMPAIGN_PEOPLE_PER_HOME = 2.4;
/* impressions per person reached, to report reach as people */
export const CAMPAIGN_FREQUENCY = 3.5;
/* #154: at most this share of a country's people are reached in a week */
export const CAMPAIGN_REACH_CEILING = 0.9;
/* #154: the homes a format's rate card (`minWeekly`) is priced for; a week costs it × homes ÷ this × ad prices */
export const CAMPAIGN_RATE_HOMES = 20_000_000;
/* #154: how hard a weeks campaign runs (×the rate card): Normal, Strong, All-out */
export const CAMPAIGN_STRENGTHS = [1, 1.5, 2] as const;
/* #154: a weeks campaign is built for 1–12 weeks and may be extended to 52 */
export const CAMPAIGN_MAX_WEEKS = 12;
export const CAMPAIGN_EXTENDED_WEEKS = 52;
/* #154: the share of a big moment's impressions the news carries to the campaign's other countries */
export const CAMPAIGN_MOMENT_SPREAD = 0.25;
const WEEKS_PER_MONTH = 4.33;
const FLOOR = 0.004;

/** A country as a campaign sees it: its homes and how dear its ads are against the reference market. */
export interface CampaignMarket {
    countryId: string;
    homes: number;
    costIndex: number;
}

export interface CampaignLine {
    formatId: CampaignFormatId;
    countryId: string;
    spend: number;
    impressions: number;
}

export const emptyCampaignBook = (): CampaignBook => ({ schemaVersion: 1, campaigns: [], serviceAwareness: {}, titleAwareness: {}, lastRunAbsoluteWeek: null });

const round = (value: number) => Math.round(value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type Places = Partial<Record<CampaignFormatId, string>>;

/** #154: where a big moment happens: its place when that country is in the campaign and has it, else the biggest ad
    market that has it (homes × ad prices: New York before Mumbai), null when none has it. */
export const campaignMomentPlace = (format: CampaignFormat, markets: CampaignMarket[], placed?: string): CampaignMarket | null => {
    const here = markets.filter(market => campaignFormatIn(format, market.countryId));
    const size = (market: CampaignMarket) => market.homes * market.costIndex;
    return here.find(market => market.countryId === placed) ?? here.reduce<CampaignMarket | null>((best, market) => (!best || size(market) > size(best) ? market : best), null);
};

/** #154: a format's rate card in one country: what a week of it costs there at Normal. */
export const campaignRatePrice = (format: CampaignFormat, market: CampaignMarket): number => (
    campaignFormatIn(format, market.countryId) ? format.minWeekly * market.costIndex * market.homes / CAMPAIGN_RATE_HOMES : 0
);

/** #154: a format's price in a set of countries: a week at Normal (its rate card), or one night of a big moment. */
export interface CampaignRate {
    formatId: CampaignFormatId;
    /** a week at Normal in the countries it exists in; 0 for a big moment or where it exists nowhere */
    weekly: number;
    /** how many of the countries have it */
    countries: number;
    /** a big moment: one night at its place */
    show: { countryId: string; site: string | null; price: number } | null;
}

/** #154: every format's price in these countries, so HOW can show what each costs before it is picked (#158: the
    Studio's and the launch builder's). */
export const campaignRateCardOf = (markets: CampaignMarket[], places?: Places): Record<CampaignFormatId, CampaignRate> => Object.fromEntries(CAMPAIGN_FORMAT_ORDER.map(formatId => {
    const format = CAMPAIGN_FORMATS[formatId];
    const here = markets.filter(market => campaignFormatIn(format, market.countryId));
    if (format.group === 'BIG_MOMENT') {
        const place = campaignMomentPlace(format, markets, places?.[formatId]);
        return [formatId, { formatId, weekly: 0, countries: here.length, show: place ? { countryId: place.countryId, site: format.sites?.[place.countryId] ?? null, price: Math.round(format.minWeekly * place.costIndex) } : null }];
    }
    return [formatId, { formatId, weekly: Math.round(here.reduce((sum, market) => sum + campaignRatePrice(format, market), 0)), countries: here.length, show: null }];
})) as Record<CampaignFormatId, CampaignRate>;

/** The big moments' price. Before #154 (no `places`): one show in each of the campaign's countries where the format
    exists. #154: one show at its place, and the news carrying a quarter of its impressions to the other countries (by
    their homes, at no cost). */
export const campaignMomentLines = (formats: CampaignFormatId[], markets: CampaignMarket[], places?: Places): CampaignLine[] => formats
    .map(id => CAMPAIGN_FORMATS[id])
    .filter(format => format.group === 'BIG_MOMENT')
    .flatMap(format => {
        const show = (market: CampaignMarket): CampaignLine => {
            const spend = round(format.minWeekly * market.costIndex);
            return { formatId: format.id, countryId: market.countryId, spend, impressions: spend / (format.cpm * market.costIndex) * 1000 };
        };
        if (!places) return markets.filter(market => campaignFormatIn(format, market.countryId)).map(show);
        const place = campaignMomentPlace(format, markets, places[format.id]);
        if (!place) return [];
        const night = show(place);
        const others = markets.filter(market => market.countryId !== place.countryId);
        const homes = others.reduce((sum, market) => sum + market.homes, 0);
        const spread = homes > 0 ? others.map(market => ({
            formatId: format.id, countryId: market.countryId, spend: 0, impressions: night.impressions * CAMPAIGN_MOMENT_SPREAD * market.homes / homes,
        })) : [];
        return [night, ...spread];
    });

/** #154: a weeks campaign's week of its other formats: each at its rate card × how hard in each country it exists. */
export const campaignRateLines = (formats: CampaignFormatId[], markets: CampaignMarket[], strength: number): CampaignLine[] => formats
    .map(id => CAMPAIGN_FORMATS[id])
    .filter(format => format.group !== 'BIG_MOMENT')
    .flatMap(format => markets.filter(market => campaignFormatIn(format, market.countryId)).map(market => {
        const spend = campaignRatePrice(format, market) * strength;
        return { formatId: format.id, countryId: market.countryId, spend, impressions: spend / (format.cpm * market.costIndex) * 1000 };
    }));

/** #154: the people a week's lines reach: impressions ÷ 3.5 in each country, at most 90% of its people. */
export const campaignReach = (lines: CampaignLine[], markets: CampaignMarket[]): number => round(markets.reduce((sum, market) => {
    const impressions = lines.filter(line => line.countryId === market.countryId).reduce((total, line) => total + line.impressions, 0);
    return sum + Math.min(market.homes * CAMPAIGN_PEOPLE_PER_HOME * CAMPAIGN_REACH_CEILING, impressions / CAMPAIGN_FREQUENCY);
}, 0));

/** The rest of a week's money (online and placed formats), split by format then by country homes. */
export const campaignFlowLines = (formats: CampaignFormatId[], markets: CampaignMarket[], money: number): CampaignLine[] => {
    const flowing = formats.map(id => CAMPAIGN_FORMATS[id]).filter(format => format.group !== 'BIG_MOMENT');
    if (!flowing.length || money <= 0) return [];
    const share = money / flowing.length;
    return flowing.flatMap(format => {
        const where = markets.filter(market => campaignFormatIn(format, market.countryId));
        const homes = where.reduce((sum, market) => sum + market.homes, 0);
        if (!where.length || homes <= 0) return [];
        return where.map(market => {
            const spend = share * market.homes / homes;
            return { formatId: format.id, countryId: market.countryId, spend, impressions: spend / (format.cpm * market.costIndex) * 1000 };
        });
    });
};

/** What a campaign's budget puts into this week (week 0 is its first), before the money is checked. */
export const campaignWeekBudget = (campaign: Pick<Campaign, 'budget' | 'spent' | 'toppedUp' | 'formats' | 'places'>, weekIndex: number, markets: CampaignMarket[]) => {
    const budget = campaign.budget;
    /* #154: weeks are the rate card for their weeks; the big moments' places hold from #154 on, whatever the budget */
    const places = campaign.places ?? (budget.kind === 'WEEKS' ? {} : undefined);
    const moments = weekIndex === 0 ? campaignMomentLines(campaign.formats, markets, places) : [];
    if (budget.kind === 'WEEKS') {
        const lines = weekIndex < budget.weeks ? [...moments, ...campaignRateLines(campaign.formats, markets, budget.strength)] : [];
        return { lines, total: round(lines.reduce((sum, line) => sum + line.spend, 0)) };
    }
    const momentMoney = moments.reduce((sum, line) => sum + line.spend, 0);
    let flow = 0;
    if (budget.kind === 'BURST') {
        const allMoments = campaignMomentLines(campaign.formats, markets, places).reduce((sum, line) => sum + line.spend, 0);
        flow = weekIndex < budget.weeks ? Math.max(0, budget.total - allMoments) / budget.weeks : 0;
    } else if (budget.kind === 'POT') {
        /* its own pace: a sixth of the pot a week, so it lasts about six weeks */
        const left = Math.max(0, budget.total + campaign.toppedUp - campaign.spent - momentMoney);
        flow = Math.min(left, budget.weekly ?? Math.max(100_000, (budget.total + campaign.toppedUp) / 6));
    } else {
        flow = budget.monthly / WEEKS_PER_MONTH;
    }
    const lines = [...moments, ...campaignFlowLines(campaign.formats, markets, flow)];
    return { lines, total: round(lines.reduce((sum, line) => sum + line.spend, 0)) };
};

/** What a week's lines add to a country's awareness: (1 − a) × (1 − e^−x). */
export const campaignAwarenessGain = (current: number, lines: CampaignLine[], market: CampaignMarket): number => {
    const x = lines.filter(line => line.countryId === market.countryId)
        .reduce((sum, line) => sum + line.impressions * CAMPAIGN_FORMATS[line.formatId].impact, 0)
        / Math.max(1, market.homes * CAMPAIGN_PEOPLE_PER_HOME);
    return (1 - clamp01(current)) * (1 - Math.exp(-x));
};

const decayed = (values: Record<string, number>) => Object.fromEntries(Object.entries(values)
    .map(([key, value]) => [key, value * CAMPAIGN_AWARENESS_DECAY] as const)
    .filter(([, value]) => value >= FLOOR));

/** How a subject's awareness spreads: a title campaign also tells people about the service, and so on. */
export interface CampaignSpread {
    /** the share of a week's gain the service gets */
    service: number;
    /** the share each title gets */
    title: number;
}
export const CAMPAIGN_SPREAD: Record<Campaign['subject']['kind'], CampaignSpread> = {
    SERVICE: { service: 1, title: 0 },
    TITLE: { service: 0.4, title: 1 },
    UNIVERSE: { service: 0.4, title: 0.7 },
    FRANCHISE: { service: 0.4, title: 0.7 },
};

export interface CampaignBookWeekInput {
    absoluteWeek: number;
    /** the countries campaigns may run in this week, by id */
    markets: Map<string, CampaignMarket>;
    /** the money campaigns may spend this week */
    cash: number;
}

/** A week of every campaign: awareness fades, then each running campaign spends what its budget and the cash allow. */
export const runCampaignBookWeek = (book: CampaignBook, input: CampaignBookWeekInput): { book: CampaignBook; spent: number } => {
    if (book.lastRunAbsoluteWeek === input.absoluteWeek) return { book, spent: 0 };
    let serviceAwareness = decayed(book.serviceAwareness);
    let titleAwareness = Object.fromEntries(Object.entries(book.titleAwareness)
        .map(([projectId, countries]) => [projectId, decayed(countries)] as const)
        .filter(([, countries]) => Object.keys(countries).length > 0));
    let cash = Math.max(0, input.cash);
    let spent = 0;
    const campaigns = book.campaigns.map((campaign): Campaign => {
        const live = campaign.status === 'RUNNING' || campaign.status === 'PAUSED';
        if (!live || input.absoluteWeek < campaign.startedAtAbsoluteWeek) return campaign;
        const markets = campaign.countryIds.map(id => input.markets.get(id)).filter((market): market is CampaignMarket => Boolean(market));
        const weekIndex = campaign.weeks.filter(week => week.spend > 0).length;
        const plan = campaignWeekBudget(campaign, weekIndex, markets);
        const record = (week: CampaignWeek, patch: Partial<Campaign>): Campaign => ({
            ...campaign, ...patch, weeks: [...campaign.weeks.filter(item => item.absoluteWeek !== week.absoluteWeek), week].slice(-CAMPAIGN_WEEKS_KEPT),
        });
        /* #160: a campaign paid in full runs on what it was paid: it never waits for the treasury */
        const prepaid = typeof campaign.paid === 'number';
        const left = prepaid ? Math.max(0, campaign.paid! - campaign.spent) : Infinity;
        if (plan.total <= 0 || !markets.length || left < 1) {
            return record({ absoluteWeek: input.absoluteWeek, spend: 0, reach: 0, awareness: 0, joins: 0, viewers: 0 },
                { status: 'FINISHED', endedAtAbsoluteWeek: input.absoluteWeek, endReason: campaign.budget.kind === 'POT' ? 'SPENT' : 'DONE' });
        }
        if (!prepaid && plan.total > cash) {
            return record({ absoluteWeek: input.absoluteWeek, spend: 0, reach: 0, awareness: 0, joins: 0, viewers: 0, paused: 'TREASURY' }, { status: 'PAUSED' });
        }
        /* never more than is left of what it was paid (a market's prices drift a little week to week) */
        const share = plan.total > left ? left / plan.total : 1;
        const lines = share < 1 ? plan.lines.map(line => ({ ...line, spend: line.spend * share, impressions: line.impressions * share })) : plan.lines;
        const total = share < 1 ? left : plan.total;
        if (!prepaid) {
            cash -= total;
            spent += total;
        }
        const spread = CAMPAIGN_SPREAD[campaign.subject.kind];
        const after: number[] = [];
        markets.forEach(market => {
            const gain = campaignAwarenessGain(serviceAwareness[market.countryId] ?? 0, lines, market);
            if (spread.service > 0) {
                serviceAwareness = { ...serviceAwareness, [market.countryId]: clamp01((serviceAwareness[market.countryId] ?? 0) + gain * spread.service) };
            }
            if (spread.title > 0) {
                campaign.subject.projectIds.forEach(projectId => {
                    const countries = titleAwareness[projectId] ?? {};
                    const current = countries[market.countryId] ?? 0;
                    const titleGain = campaignAwarenessGain(current, lines, market) * spread.title;
                    titleAwareness = { ...titleAwareness, [projectId]: { ...countries, [market.countryId]: clamp01(current + titleGain) } };
                });
            }
            const subjectAwareness = spread.title > 0
                ? Math.max(...campaign.subject.projectIds.map(projectId => titleAwareness[projectId]?.[market.countryId] ?? 0), 0)
                : serviceAwareness[market.countryId] ?? 0;
            after.push(subjectAwareness * market.homes);
        });
        const homes = markets.reduce((sum, market) => sum + market.homes, 0);
        const week: CampaignWeek = {
            absoluteWeek: input.absoluteWeek, spend: total, reach: campaignReach(lines, markets),
            awareness: homes > 0 ? Math.round(after.reduce((sum, value) => sum + value, 0) / homes * 1000) / 1000 : 0, joins: 0, viewers: 0,
        };
        const nextSpent = campaign.spent + total;
        const done = (campaign.budget.kind === 'BURST' || campaign.budget.kind === 'WEEKS' ? weekIndex + 1 >= campaign.budget.weeks
            : campaign.budget.kind === 'POT' ? nextSpent >= campaign.budget.total + campaign.toppedUp - 1 : false)
            || (prepaid && nextSpent >= campaign.paid! - 1);
        return record(week, {
            spent: nextSpent, status: done ? 'FINISHED' : 'RUNNING',
            ...(done ? { endedAtAbsoluteWeek: input.absoluteWeek, endReason: campaign.budget.kind === 'POT' ? 'SPENT' as const : 'DONE' as const } : {}),
        });
    });
    /* finished campaigns are history: the latest 40 are kept */
    const finished = campaigns.filter(campaign => campaign.status === 'FINISHED' || campaign.status === 'STOPPED');
    const keepFinished = new Set(finished.slice(-CAMPAIGN_FINISHED_KEPT).map(campaign => campaign.id));
    return {
        spent,
        book: {
            ...book,
            campaigns: campaigns.filter(campaign => (campaign.status !== 'FINISHED' && campaign.status !== 'STOPPED') || keepFinished.has(campaign.id)),
            serviceAwareness,
            titleAwareness,
            lastRunAbsoluteWeek: input.absoluteWeek,
        },
    };
};

/** A burst's or pot's money still to spend; always-on: a month's; #154 weeks: its weeks still to run at its rate card
    (with its markets; without them, at its last paid week's pace). */
export const campaignMoneyLeft = (campaign: Pick<Campaign, 'budget' | 'spent' | 'toppedUp' | 'formats' | 'places' | 'weeks' | 'paid'>, markets?: CampaignMarket[]): number => {
    /* #160: paid in full: what is left of it */
    if (typeof campaign.paid === 'number') return Math.max(0, campaign.paid - campaign.spent);
    const budget = campaign.budget;
    if (budget.kind === 'ALWAYS_ON') return budget.monthly;
    if (budget.kind !== 'WEEKS') return Math.max(0, budget.total + campaign.toppedUp - campaign.spent);
    const done = campaign.weeks.filter(week => week.spend > 0).length;
    const left = Math.max(0, budget.weeks - done);
    if (!left) return 0;
    if (markets) return Array.from({ length: left }, (_, index) => campaignWeekBudget(campaign, done + index, markets).total).reduce((sum, value) => sum + value, 0);
    const last = [...campaign.weeks].reverse().find(week => week.spend > 0);
    return round((last?.spend ?? 0) * left);
};
