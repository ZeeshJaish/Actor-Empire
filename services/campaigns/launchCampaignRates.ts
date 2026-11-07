/**
 * The launch campaign's money, the Studio's way (#158; plan §20.13, Zeesh: "money me jau jab the build ke and udahr do
 * cheez hai marketing ceiling and launch cmapign, marketing ceiling ki to need hi nahi na, hm log direct launch campaign
 * me jake setup kare fir jasie build wizard khole to dikh jayega apjna buddget and stuffs"):
 *  - every format costs its rate card a week in the opening countries (#154: `minWeekly` × the country's homes ÷ 20M ×
 *    its ad prices); the two doors only an opening has (app stores, carrier bundles) have a rate card of their own;
 *  - a week of what is picked × how hard (1, 1.5 or 2), for the weeks before opening (1 to the build's weeks);
 *  - a big moment is one night at one place (the biggest ad market where it exists, or where it is put), paid on the
 *    last week, opening night.
 * In all = a week × weeks + the nights: the plan's `budgetCeiling`. The opening numbers still come from the launch
 * engine (streamingLaunchMarketing.ts), from that budget. Pure: the launch builder, the Money stage and the audits share it.
 */
import type { CampaignFormatId, Player, StreamingLaunchMarketingChannelId, StreamingLaunchMarketingTimeline } from '../../types';
import { CAMPAIGN_FORMATS } from './campaignFormats';
import { CAMPAIGN_RATE_HOMES, campaignRateCardOf, type CampaignMarket, type CampaignRate } from './campaignEngine';
import { campaignMarketOf } from './campaignMarkets';

export type LaunchDoorId = Extract<StreamingLaunchMarketingChannelId, 'DEVICE_STORES' | 'TELCO_BUNDLES'>;
/* a week of a door in a country of 20M homes at reference ad prices, as a format's `minWeekly`: store featuring and
   pre-registration ads; a carrier's bundle marketing */
export const LAUNCH_DOOR_RATES: Record<LaunchDoorId, number> = { DEVICE_STORES: 60_000, TELCO_BUNDLES: 100_000 };

type Places = Partial<Record<CampaignFormatId, string>>;

export interface LaunchRateCard {
    /** the opening countries as a campaign sees them */
    markets: CampaignMarket[];
    formats: Record<CampaignFormatId, CampaignRate>;
    /** a week of each door at Normal in the opening countries */
    doors: Record<LaunchDoorId, number>;
}

export const launchRateCardOf = (markets: CampaignMarket[], places?: Places): LaunchRateCard => ({
    markets,
    formats: campaignRateCardOf(markets, places),
    doors: Object.fromEntries((Object.keys(LAUNCH_DOOR_RATES) as LaunchDoorId[]).map(id => [id,
        Math.round(markets.reduce((sum, market) => sum + LAUNCH_DOOR_RATES[id] * market.costIndex * market.homes / CAMPAIGN_RATE_HOMES, 0))])) as Record<LaunchDoorId, number>,
});

/** The rate card in the opening countries: each country's homes and ad prices, as the Studio reads them after opening. */
export const launchRateCard = (player: Player, countryIds: string[], places?: Places): LaunchRateCard => launchRateCardOf(
    countryIds.map(countryId => campaignMarketOf(player, countryId)).filter((market): market is CampaignMarket => Boolean(market)), places);

export interface LaunchCampaignPicks {
    formats: CampaignFormatId[];
    doors: LaunchDoorId[];
    weeks: number;
    strength: number;
}

export interface LaunchCampaignMoney {
    /** a week of what is picked, × how hard */
    weekly: number;
    /** the weeks before opening it runs: 1 when only nights are picked */
    weeks: number;
    /** the big moments, one night each at its place */
    night: number;
    /** a week × weeks + the nights */
    total: number;
    /** where each night happens */
    places: Places;
}

export const launchCampaignMoney = (card: LaunchRateCard, picks: LaunchCampaignPicks, maxWeeks: number): LaunchCampaignMoney => {
    const flowing = picks.formats.filter(id => CAMPAIGN_FORMATS[id].group !== 'BIG_MOMENT');
    const nights = picks.formats.filter(id => CAMPAIGN_FORMATS[id].group === 'BIG_MOMENT');
    const strength = [1, 1.5, 2].includes(picks.strength) ? picks.strength : 1;
    const weekly = Math.round((flowing.reduce((sum, id) => sum + card.formats[id].weekly, 0) + picks.doors.reduce((sum, id) => sum + card.doors[id], 0)) * strength);
    const weeks = weekly > 0 ? Math.max(1, Math.min(Math.max(1, Math.round(maxWeeks)), Math.round(picks.weeks) || 1)) : 1;
    const night = nights.reduce((sum, id) => sum + (card.formats[id].show?.price ?? 0), 0);
    const places = Object.fromEntries(nights.flatMap(id => (card.formats[id].show ? [[id, card.formats[id].show!.countryId]] : []))) as Places;
    return { weekly, weeks, night, total: weekly * weeks + night, places };
};

/** The launch engine's timeline for a campaign of these weeks: an opening-week push for one week, else steady. */
export const launchCampaignTimeline = (weeks: number): StreamingLaunchMarketingTimeline => (weeks <= 1 ? 'LAST_WEEK_PUSH' : 'BALANCED');
