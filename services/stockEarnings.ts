/**
 * Stocks follow performance (Zeesh, 2026-11-08: prices must rise and fall on the companies' real performance, realistically,
 * not on code that just pushes them up or down).
 *
 * Every listed company reports quarterly results every 13 weeks, on its own week. A quarter's revenue growth (as a yearly
 * rate) is the growth the market expected, plus a surprise drawn from the career's seed and the company's own spread, plus a
 * small lift when the player runs a campaign for the company's brand. Earnings follow revenue with operating leverage. The
 * market then expects a little more or a little less, and a company expected to grow faster is worth more per dollar earned.
 *
 * A share is worth:
 *   anchorFair x dilution x [ (1 - segment weights) x earnings index x multiple + sum(weight x segment value / value at the anchor) ]
 * Segments are the parts of a company that live in the game's world (Netflix, Disney+, Hulu, Warner Bros., HBO, Paramount,
 * Universal, Apple TV+, YouTube) and keep moving with their studio's valuation. Apple TV+ is a few percent of Apple, so a hit
 * there no longer drives the whole of Apple.
 *
 * anchorFair is the value the previous engine gave on the week a stock moved to this model, so no saved price jumps.
 * The price reaction to results uses only the random surprise: the player's own campaign lift is known to the player, so
 * it reaches the price slowly through earnings and never as a jump to trade on.
 */
import type { NewsItem, Player, Stock } from '../types';
import { createDeterministicRng } from './deterministicRandom';
import { valueWorldStudio } from './valuation/studioValuation';

export const RESULTS_EVERY_WEEKS = 13;
const MAX_PRICE_REACTION = 0.12;
const PRICE_REACTION_PER_SURPRISE = 1.2;

export interface StockEarningsReport {
    absoluteWeek: number;
    quarter: number;
    /** the quarter's revenue growth, as a yearly rate */
    revenueGrowth: number;
    /** what the market expected, as a yearly rate */
    expectedGrowth: number;
    /** the random part of the result, against expectations */
    surprise: number;
    verdict: 'BEAT' | 'INLINE' | 'MISS';
    /** the player's brand campaign's part of the growth */
    brandLift: number;
    /** the share price's jump on the news (a fraction of the price) */
    priceReaction: number;
}

export interface StockEarningsState {
    version: 1;
    startedAbsoluteWeek: number;
    /** a share's value on the first week of this model (the previous engine's value), before any dilution since */
    anchorFair: number;
    anchorShares: number;
    /** each segment's studio value on the first week */
    segmentAnchors: Record<string, number>;
    nextResultsAbsoluteWeek: number;
    quarters: number;
    /** trailing earnings and revenue, 1 on the first week */
    earningsIndex: number;
    revenueIndex: number;
    /** the yearly growth the market now expects */
    expectedGrowth: number;
    last?: StockEarningsReport;
}

export type StockWithEarnings = Stock & { earnings?: StockEarningsState };

interface CompanyProfile {
    /** long-run yearly revenue growth */
    growth: number;
    /** how far a quarter's growth wanders from expectations (one standard deviation, yearly rate) */
    spread: number;
    /** how much more earnings swing than revenue */
    leverage: number;
    segments: Array<{ studioId: string; weight: number }>;
}

const SECTOR_PROFILE: Record<Stock['sector'], Omit<CompanyProfile, 'segments'>> = {
    TECH: { growth: 0.08, spread: 0.03, leverage: 1.6 },
    MEDIA: { growth: 0.03, spread: 0.04, leverage: 2.2 },
    FASHION: { growth: 0.05, spread: 0.03, leverage: 1.8 },
    BEVERAGE: { growth: 0.04, spread: 0.015, leverage: 1.3 },
    AUTOMOTIVE: { growth: 0.04, spread: 0.035, leverage: 2.4 },
};

/* Rough, real-world shapes: long-run growth, how jumpy results are, and the parts that live in the game's world. */
const COMPANY_PROFILE: Record<string, Partial<CompanyProfile>> = {
    stk_apple: { growth: 0.06, spread: 0.025, leverage: 1.4, segments: [{ studioId: 'APPLE_TV', weight: 0.03 }] },
    stk_amzn: { growth: 0.10, spread: 0.035, leverage: 2.2 },
    stk_goog: { growth: 0.10, spread: 0.03, leverage: 1.5, segments: [{ studioId: 'YOUTUBE', weight: 0.12 }] },
    stk_nflx: { growth: 0.12, spread: 0.045, leverage: 1.8, segments: [{ studioId: 'NETFLIX', weight: 0.8 }] },
    stk_dis: { growth: 0.04, spread: 0.03, leverage: 2, segments: [{ studioId: 'DISNEY_PLUS', weight: 0.25 }, { studioId: 'HULU', weight: 0.08 }] },
    stk_wbd: { growth: 0, spread: 0.05, leverage: 2.8, segments: [{ studioId: 'WARNER_BROS', weight: 0.6 }, { studioId: 'HBO', weight: 0.15 }] },
    stk_para: { growth: -0.01, spread: 0.05, leverage: 2.8, segments: [{ studioId: 'PARAMOUNT', weight: 0.7 }] },
    stk_cmcsa: { growth: 0.02, spread: 0.02, leverage: 1.6, segments: [{ studioId: 'UNIVERSAL', weight: 0.2 }] },
    stk_nke: { growth: 0.04, spread: 0.03, leverage: 1.8 },
    stk_ker: { growth: 0.02, spread: 0.04, leverage: 2.2 },
    stk_lvmh: { growth: 0.06, spread: 0.03, leverage: 1.7 },
    stk_ko: { growth: 0.04, spread: 0.015, leverage: 1.2 },
    stk_pep: { growth: 0.04, spread: 0.015, leverage: 1.3 },
    stk_tsla: { growth: 0.15, spread: 0.08, leverage: 3 },
    stk_tm: { growth: 0.03, spread: 0.025, leverage: 2.2 },
    stk_race: { growth: 0.09, spread: 0.03, leverage: 1.5 },
};

export const getCompanyProfile = (stock: Pick<Stock, 'id' | 'sector' | 'relatedStudioId'>): CompanyProfile => {
    const sector = SECTOR_PROFILE[stock.sector] || SECTOR_PROFILE.TECH;
    const own = COMPANY_PROFILE[stock.id] || {};
    const segments = own.segments
        || (stock.relatedStudioId ? [{ studioId: stock.relatedStudioId, weight: 0.5 }] : []);
    return {
        growth: own.growth ?? sector.growth,
        spread: own.spread ?? sector.spread,
        leverage: own.leverage ?? sector.leverage,
        segments,
    };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const stableHash = (value: string) => Array.from(value).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);

/** about a standard normal: four uniforms summed (Irwin-Hall), centred and scaled to variance 1 */
const seededNormal = (seed: string) => {
    const rng = createDeterministicRng(seed);
    return (rng() + rng() + rng() + rng() - 2) * Math.sqrt(3);
};

type MarketPlayer = (Pick<Player, 'world'> & Partial<Pick<Player, 'activeSponsorships' | 'stats' | 'name'>>) | undefined;

const segmentValue = (player: MarketPlayer, studioId: string, absoluteWeek: number): number | undefined => {
    const studio = player?.world?.studios?.[studioId];
    if (!studio) return undefined;
    const value = valueWorldStudio(studio, absoluteWeek).equityValue;
    return Number.isFinite(value) && value > 0 ? value : undefined;
};

export const isValidEarningsState = (state: unknown): state is StockEarningsState => {
    const s = state as StockEarningsState | undefined;
    return Boolean(s) && s!.version === 1
        && Number.isFinite(s!.anchorFair) && s!.anchorFair > 0
        && Number.isFinite(s!.anchorShares) && s!.anchorShares > 0
        && Number.isFinite(s!.earningsIndex) && s!.earningsIndex > 0
        && Number.isFinite(s!.expectedGrowth)
        && Number.isFinite(s!.nextResultsAbsoluteWeek)
        && Boolean(s!.segmentAnchors) && typeof s!.segmentAnchors === 'object';
};

export const initStockEarnings = (
    stock: Pick<Stock, 'id' | 'sector' | 'relatedStudioId'>,
    player: MarketPlayer,
    absoluteWeek: number,
    currentFair: number,
    currentShares: number,
): StockEarningsState => {
    const profile = getCompanyProfile(stock);
    const segmentAnchors: Record<string, number> = {};
    for (const segment of profile.segments) {
        const value = segmentValue(player, segment.studioId, absoluteWeek);
        if (value) segmentAnchors[segment.studioId] = value;
    }
    return {
        version: 1,
        startedAbsoluteWeek: absoluteWeek,
        anchorFair: Math.max(0.01, currentFair),
        anchorShares: Math.max(1, currentShares),
        segmentAnchors,
        nextResultsAbsoluteWeek: absoluteWeek + 1 + (stableHash(`${stock.id}:results-week`) % RESULTS_EVERY_WEEKS),
        quarters: 0,
        earningsIndex: 1,
        revenueIndex: 1,
        expectedGrowth: profile.growth,
    };
};

/** a company expected to grow faster is worth more per dollar earned, and less when expectations fall */
const valuationMultiple = (expectedGrowth: number, baseGrowth: number) => clamp(1 + 3 * (expectedGrowth - baseGrowth), 0.75, 1.35);

export const getEarningsFairValue = (
    stock: Pick<Stock, 'id' | 'sector' | 'relatedStudioId'>,
    state: StockEarningsState,
    player: MarketPlayer,
    absoluteWeek: number,
    currentShares: number,
): number => {
    const profile = getCompanyProfile(stock);
    let segmentWeight = 0;
    let segmentPart = 0;
    for (const segment of profile.segments) {
        const anchor = state.segmentAnchors[segment.studioId];
        const value = anchor ? segmentValue(player, segment.studioId, absoluteWeek) : undefined;
        if (!anchor || !value) continue; // a segment the world does not hold leaves its weight with the core business
        segmentWeight += segment.weight;
        segmentPart += segment.weight * (value / anchor);
    }
    const core = state.earningsIndex * valuationMultiple(state.expectedGrowth, profile.growth);
    const dilution = state.anchorShares / Math.max(1, currentShares);
    return Math.max(0.01, state.anchorFair * ((1 - segmentWeight) * core + segmentPart) * dilution);
};

/** a campaign the player runs for the company's brand helps sales a little (a famous face helps more); never a lever */
const getBrandLift = (stock: Pick<Stock, 'relatedBrandName'>, player: MarketPlayer) => {
    const brand = stock.relatedBrandName;
    if (!brand || !player?.activeSponsorships?.some(sponsorship => sponsorship.brandName === brand)) return 0;
    const fame = clamp(Number(player.stats?.fame ?? 0), 0, 100);
    return 0.002 + 0.006 * (fame / 100);
};

export const reportStockQuarter = (
    stock: Pick<Stock, 'id' | 'sector' | 'relatedStudioId' | 'relatedBrandName'>,
    state: StockEarningsState,
    player: MarketPlayer,
    absoluteWeek: number,
    seed: string,
): { state: StockEarningsState; report: StockEarningsReport } => {
    const profile = getCompanyProfile(stock);
    const quarter = state.quarters + 1;
    const surprise = seededNormal(`${seed}:${stock.id}:results:${quarter}`) * profile.spread;
    const brandLift = getBrandLift(stock, player);
    const revenueGrowth = state.expectedGrowth + surprise + brandLift;
    const quarterGrowth = Math.pow(Math.max(0.2, 1 + revenueGrowth), 0.25);
    const earningsGrowth = Math.max(0.6, quarterGrowth * (1 + profile.leverage * (surprise + brandLift) / 4));
    const verdict: StockEarningsReport['verdict'] = surprise > profile.spread * 0.4
        ? 'BEAT'
        : surprise < -profile.spread * 0.4 ? 'MISS' : 'INLINE';
    const priceReaction = clamp(surprise * PRICE_REACTION_PER_SURPRISE, -MAX_PRICE_REACTION, MAX_PRICE_REACTION);
    // the market expects a little of the surprise to last, and over time drifts back to the company's long-run growth
    const updatedExpectation = state.expectedGrowth + 0.3 * (revenueGrowth - state.expectedGrowth);
    const expectedGrowth = updatedExpectation + 0.15 * (profile.growth - updatedExpectation);
    const report: StockEarningsReport = {
        absoluteWeek,
        quarter,
        revenueGrowth,
        expectedGrowth: state.expectedGrowth,
        surprise,
        verdict,
        brandLift,
        priceReaction,
    };
    return {
        report,
        state: {
            ...state,
            quarters: quarter,
            revenueIndex: clamp(state.revenueIndex * quarterGrowth, 0.05, 200),
            earningsIndex: clamp(state.earningsIndex * earningsGrowth, 0.1, 200),
            expectedGrowth: clamp(expectedGrowth, -0.3, 0.6),
            nextResultsAbsoluteWeek: absoluteWeek + RESULTS_EVERY_WEEKS,
            last: report,
        },
    };
};

const percent = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

export const describeEarningsReport = (
    stock: Pick<Stock, 'name' | 'symbol'>,
    report: StockEarningsReport,
    playerName?: string,
) => {
    const headline = report.verdict === 'BEAT'
        ? `${stock.name} beats estimates`
        : report.verdict === 'MISS'
            ? `${stock.name} misses estimates`
            : `${stock.name} results come in as expected`;
    const campaign = report.brandLift > 0 && playerName ? `, helped by ${playerName}'s campaign` : '';
    const move = Math.abs(report.priceReaction) >= 0.005
        ? ` The results push ${stock.symbol} ${report.priceReaction > 0 ? 'up' : 'down'} about ${Math.abs(report.priceReaction * 100).toFixed(1)}%.`
        : '';
    const detail = `Sales grew at ${percent(report.revenueGrowth)} a year against ${percent(report.expectedGrowth)} expected${campaign}.${move}`;
    return { headline, detail };
};

export const createEarningsNews = (
    stock: Pick<Stock, 'id' | 'name' | 'symbol' | 'sector' | 'relatedStudioId'>,
    report: StockEarningsReport,
    week: number,
    year: number,
    playerName?: string,
): NewsItem => {
    const text = describeEarningsReport(stock, report, playerName);
    return {
        id: `news_stock_results_${stock.id}_${report.absoluteWeek}`,
        headline: text.headline,
        subtext: text.detail,
        category: 'INDUSTRY',
        week,
        year,
        impactLevel: Math.abs(report.surprise) > getCompanyProfile(stock).spread ? 'HIGH' : 'MEDIUM',
    };
};
