/**
 * #187 (plan §22.7): your own shares, buybacks and buyouts. Zeesh, 2026-11-03 (dictated): once listed, buying our own
 * shares in the Stocks app makes them his; the company can buy back its shares from OWNERSHIP.
 *
 *   - Listed, the Stocks app: buy our own shares from the public float with your own money, at the market price plus
 *     the impact of the size (the average is half the share of the float taken above the price); sell them after the
 *     26-week lock-up, below the price the same way, with a warning before you go under 51%. The trade moves the price.
 *   - Listed, OWNERSHIP › Buy back shares: 1–10% of the shares a year, bought over 4 weeks at each week's close with
 *     treasury cash, never under the cash floor (held there); the shares are retired, so every holder's % rises.
 *   - Private, OWNERSHIP › an investor › Buy out: their stake at the valuation engine's value × their premium
 *     (1.05–1.25), from the treasury, never under the cash floor; the stake is retired, so every holder's % rises; their
 *     board seat and their share of profit end.
 */
import type { OwnedStreamingBuybackProgram, OwnedStreamingPlatformState, Player } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getStreamingEquityValuation } from './streamingPublicMarkets';
import {
    BUYBACK_WEEKS,
    PUBLIC_FLOAT_HOLDER,
    getStreamingBuybackState,
    retireStreamingStake,
    streamingCapitalAction,
} from './streamingBuybacks';
import { TEAM_OPTIONS_HOLDER } from './team/teamHiring';
import { getStreamingTeamCashFloor } from './team/teamState';

/** your shares stay locked up this long after listing */
export const OWN_SHARES_LOCKUP_WEEKS = 26;
const CONTROL_FLOOR = 51;

const round2 = (value: number) => Math.round(value * 100) / 100;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;
const floatOf = (platform: OwnedStreamingPlatformState) => platform.finance.equityHolders.find(holder => holder.holderName === PUBLIC_FLOAT_HOLDER) || null;

/* ── your own shares (listed) ── */

export interface OwnShareTradeQuote {
    side: 'BUY' | 'SELL';
    percent: number;
    shares: number;
    /** the average a share, with the size's impact */
    pricePerShare: number;
    total: number;
    founderAfter: number;
    /** the price after the trade */
    priceAfter: number;
    blocked: string | null;
    /** selling under 51% */
    warning: string | null;
}

export const quoteOwnShareTrade = (player: Player, side: 'BUY' | 'SELL', percent: number): OwnShareTradeQuote | null => {
    const source = player.ownedStreamingPlatform;
    if (!source?.identity || source.publicCompany?.lifecycle !== 'PUBLIC' || !source.publicCompany.listing) return null;
    const platform = normalizeOwnedStreamingPlatformState(source, player.id);
    const listing = platform.publicCompany.listing!;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const price = platform.publicCompany.quoteHistory.at(-1)?.close || listing.offerPrice;
    const floatPercent = floatOf(platform)?.ownershipPercent ?? 0;
    const shares = Math.round(listing.sharesOutstanding * percent / 100);
    const impact = Math.min(0.25, 0.5 * percent / Math.max(1, floatPercent));
    const pricePerShare = price * (side === 'BUY' ? 1 + impact / 2 : 1 - impact / 2);
    const total = Math.round(shares * pricePerShare);
    const founderAfter = round2(platform.founderOwnershipPercent + (side === 'BUY' ? percent : -percent));
    const lockedFor = listing.listedAtAbsoluteWeek + OWN_SHARES_LOCKUP_WEEKS - absoluteWeek;
    const blocked = percent <= 0 ? 'Choose an amount'
        : side === 'BUY' && percent > floatPercent + 1e-9 ? 'More than the public holds'
            : side === 'BUY' && total > (player.money || 0) ? 'Not enough cash'
                : side === 'SELL' && lockedFor > 0 ? `Locked up for ${lockedFor} more week${lockedFor === 1 ? '' : 's'}`
                    : side === 'SELL' && percent > platform.founderOwnershipPercent + 1e-9 ? 'More than you hold' : null;
    return {
        side, percent, shares, pricePerShare, total, founderAfter,
        priceAfter: price * (side === 'BUY' ? 1 + impact : 1 - impact),
        blocked,
        warning: side === 'SELL' && founderAfter < CONTROL_FLOOR && platform.founderOwnershipPercent >= CONTROL_FLOOR
            ? 'You would lose control: the board could outvote you.' : null,
    };
};

export interface OwnShareTradeResult { player: Player; changed: boolean; message: string }

export const tradeOwnStreamingShares = (player: Player, side: 'BUY' | 'SELL', percent: number): OwnShareTradeResult => {
    const quote = quoteOwnShareTrade(player, side, percent);
    if (!quote) return { player, changed: false, message: 'The company is not listed.' };
    if (quote.blocked) return { player, changed: false, message: quote.blocked };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const listing = platform.publicCompany.listing!;
    const quotes = platform.publicCompany.quoteHistory;
    const last = quotes.at(-1);
    const before = platform.founderOwnershipPercent;
    const key = `own-shares:${side}:${absoluteWeek}:${platform.finance.capitalActions.length}`;
    const next: OwnedStreamingPlatformState = {
        ...platform,
        founderOwnershipPercent: quote.founderAfter,
        finance: {
            ...platform.finance,
            equityHolders: platform.finance.equityHolders.map(holder => (holder.holderName === PUBLIC_FLOAT_HOLDER
                ? { ...holder, ownershipPercent: round4(holder.ownershipPercent + (side === 'BUY' ? -percent : percent)) } : holder)),
            capitalActions: [...platform.finance.capitalActions, streamingCapitalAction(platform, key, 'FOUNDER_SHARE_TRADE', absoluteWeek, quote.total, 0,
                side === 'BUY' ? -quote.total : quote.total, before, quote.founderAfter)],
        },
        publicCompany: {
            ...platform.publicCompany,
            /* #188: the public's share count follows the trade (the register and the weekly volume read it) */
            listing: { ...listing, publicShares: Math.max(0, listing.publicShares + (side === 'BUY' ? -quote.shares : quote.shares)) },
            /* the trade moves the price */
            quoteHistory: last ? [...quotes.slice(0, -1), {
                ...last,
                close: round2(quote.priceAfter),
                high: Math.max(last.high, round2(quote.priceAfter)),
                low: Math.min(last.low, round2(quote.priceAfter)),
                marketCap: Math.round(quote.priceAfter * listing.sharesOutstanding),
            }] : quotes,
        },
    };
    return {
        changed: true,
        message: side === 'BUY'
            ? `You bought ${quote.shares.toLocaleString()} shares; you hold ${quote.founderAfter}%.`
            : `You sold ${quote.shares.toLocaleString()} shares; you hold ${quote.founderAfter}%.`,
        player: {
            ...player,
            money: (player.money || 0) + (side === 'BUY' ? -quote.total : quote.total),
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(next, player.id),
        },
    };
};

/* ── buybacks (listed): started here, bought in the weekly close (streamingBuybacks.ts) ── */

const programsOf = (platform: OwnedStreamingPlatformState) => platform.publicCompany.buybacks || [];

export const startStreamingBuyback = (player: Player, percent: number): OwnShareTradeResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.publicCompany.lifecycle !== 'PUBLIC' || !platform.publicCompany.listing) return { player, changed: false, message: 'Buybacks are for a listed company.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const state = getStreamingBuybackState(platform, absoluteWeek);
    if (state.running) return { player, changed: false, message: 'A buyback is already running.' };
    const size = Math.round(percent);
    if (size < 1 || size > state.allowance) return { player, changed: false, message: state.allowance < 1 ? 'This year\'s buybacks are used up.' : `Up to ${state.allowance}% this year.` };
    const price = platform.publicCompany.quoteHistory.at(-1)?.close || platform.publicCompany.listing.offerPrice;
    const cost = price * platform.publicCompany.listing.sharesOutstanding * size / 100;
    if (platform.treasuryCash - cost < getStreamingTeamCashFloor(platform).amount) return { player, changed: false, message: 'It would take the treasury under the cash floor.' };
    const program: OwnedStreamingBuybackProgram = {
        id: createDeterministicId('streaming_buyback', platform.simulationSeed, `${absoluteWeek}:${size}`),
        startedAtAbsoluteWeek: absoluteWeek,
        percent: size,
        weeksLeft: BUYBACK_WEEKS,
        boughtPercent: 0,
        spent: 0,
        status: 'RUNNING',
    };
    return {
        changed: true,
        message: `The company buys back ${size}% over ${BUYBACK_WEEKS} weeks.`,
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, publicCompany: { ...platform.publicCompany, buybacks: [...programsOf(platform), program].slice(-12) } }, player.id) },
    };
};

/* ── buyouts (private) ── */

export interface StreamingBuyoutQuote { holderId: string; name: string; percent: number; price: number; premium: number; founderAfter: number; blocked: string | null }

export const getStreamingBuyoutQuote = (platform: OwnedStreamingPlatformState, holderId: string): StreamingBuyoutQuote | null => {
    const holder = platform.finance.equityHolders.find(item => item.id === holderId);
    if (!holder || holder.holderName === PUBLIC_FLOAT_HOLDER || holder.holderName === TEAM_OPTIONS_HOLDER) return null;
    /* an investor wants a premium over what the stake is worth, its own (1.05–1.25) */
    const premium = round2(1.05 + 0.2 * createDeterministicRng(`${platform.simulationSeed}:buyout:${holder.id}`)());
    const price = Math.round(getStreamingEquityValuation(platform) * holder.ownershipPercent / 100 * premium / 1_000_000) * 1_000_000;
    const founderAfter = round2(platform.founderOwnershipPercent * 100 / (100 - holder.ownershipPercent));
    const blocked = platform.publicCompany.lifecycle === 'PUBLIC' ? 'Listed: buy back shares instead'
        : platform.treasuryCash - price < getStreamingTeamCashFloor(platform).amount ? 'It would take the treasury under the cash floor' : null;
    return { holderId, name: holder.holderName, percent: holder.ownershipPercent, price, premium, founderAfter, blocked };
};

export const buyOutStreamingInvestor = (player: Player, holderId: string): OwnShareTradeResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const quote = getStreamingBuyoutQuote(platform, holderId);
    if (!quote) return { player, changed: false, message: 'Only an investor can be bought out.' };
    if (quote.blocked) return { player, changed: false, message: quote.blocked };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const before = platform.founderOwnershipPercent;
    let next = retireStreamingStake(platform, holder => holder.id === holderId, quote.percent);
    const investor = platform.governance.celebrityInvestors.find(item => item.status === 'ACCEPTED' && item.name === quote.name);
    next = {
        ...next,
        treasuryCash: next.treasuryCash - quote.price,
        finance: { ...next.finance, capitalActions: [...next.finance.capitalActions, streamingCapitalAction(platform, `buyout:${holderId}`, 'SHARE_BUYBACK', absoluteWeek, quote.price, -quote.price, 0, before, next.founderOwnershipPercent)] },
        governance: {
            ...next.governance,
            /* their share of profit and their board seat end */
            celebrityInvestors: next.governance.celebrityInvestors.map(item => (item === investor || (investor && item.id === investor.id)
                ? { ...item, status: 'BOUGHT_OUT' as const, boughtOutAtAbsoluteWeek: absoluteWeek, buyoutPrice: quote.price } : item)),
            directors: next.governance.directors.map(item => (investor && item.linkedInvestorId === investor.id && item.status === 'ACTIVE'
                ? { ...item, status: 'DEPARTED' as const, endedAtAbsoluteWeek: absoluteWeek } : item)),
        },
    };
    return {
        changed: true,
        message: `You bought out ${quote.name} for ${quote.price >= 1e9 ? `$${(quote.price / 1e9).toFixed(1)}B` : `$${Math.round(quote.price / 1e6)}M`}: you hold ${quote.founderAfter}%.`,
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(next, player.id) },
    };
};
