/**
 * #187 (plan §22.7): a listed company's buybacks, the part the weekly close runs. OWNERSHIP starts one
 * (`startStreamingBuyback`, in streamingOwnShares.ts): 1–10% of the shares a year, bought over 4 weeks at each week's
 * close with treasury cash, never under the cash floor (held there). The shares are retired, so every holder's % rises.
 *
 * Kept apart from the actions so the public market's weekly close can read it without an import loop.
 */
import type { OwnedStreamingBuybackProgram, OwnedStreamingCapitalAction, OwnedStreamingPlatformState } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getStreamingTeamCashFloor } from './team/teamState';

/** the holder the listing writes for the shares it sold to the public */
export const PUBLIC_FLOAT_HOLDER = 'Public shareholder float';
/** a buyback runs over this many weeks */
export const BUYBACK_WEEKS = 4;
/** the most a company buys back in a year, in % of its shares */
export const BUYBACK_YEAR_LIMIT = 10;

const round2 = (value: number) => Math.round(value * 100) / 100;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/** a stake retired: it leaves its holder, and every holder's % (the founder's too) grows to fill the gap */
export const retireStreamingStake = (
    platform: OwnedStreamingPlatformState,
    match: (holder: OwnedStreamingPlatformState['finance']['equityHolders'][number]) => boolean,
    percent: number,
): OwnedStreamingPlatformState => {
    const factor = 100 / (100 - percent);
    return {
        ...platform,
        founderOwnershipPercent: round2(platform.founderOwnershipPercent * factor),
        finance: {
            ...platform.finance,
            equityHolders: platform.finance.equityHolders
                .map(holder => (match(holder) ? { ...holder, ownershipPercent: holder.ownershipPercent - percent } : holder))
                .filter(holder => holder.ownershipPercent > 1e-6)
                .map(holder => ({ ...holder, ownershipPercent: round4(holder.ownershipPercent * factor) })),
        },
    };
};

export const streamingCapitalAction = (
    platform: OwnedStreamingPlatformState, key: string, type: OwnedStreamingCapitalAction['type'], absoluteWeek: number,
    amount: number, treasuryDelta: number, personalCashDelta: number, before: number, after: number,
): OwnedStreamingCapitalAction => ({
    id: createDeterministicId('streaming_capital', platform.simulationSeed, key),
    idempotencyKey: key,
    type,
    absoluteWeek,
    amount: Math.round(amount),
    treasuryDelta: Math.round(treasuryDelta),
    personalCashDelta: Math.round(personalCashDelta),
    debtDelta: 0,
    ownershipBefore: before,
    ownershipAfter: after,
});

const programsOf = (platform: OwnedStreamingPlatformState) => platform.publicCompany.buybacks || [];

/** the running programme, the latest, and what is left of this year's 10% */
export const getStreamingBuybackState = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => {
    const programs = programsOf(platform);
    /* a running programme counts in full; one that finished or stopped counts what it bought */
    const thisYear = programs.filter(program => program.startedAtAbsoluteWeek > absoluteWeek - 52)
        .reduce((sum, program) => sum + (program.status === 'RUNNING' ? program.percent : program.boughtPercent), 0);
    return {
        running: programs.find(program => program.status === 'RUNNING') || null,
        last: programs.at(-1) || null,
        allowance: Math.max(0, Math.floor((BUYBACK_YEAR_LIMIT - thisYear) * 100 + 1e-6) / 100),
    };
};

/** this week's part of the running programme: `percent` of the shares it started with, `ofNow` of today's (fewer, as it retires them) */
export const streamingBuybackTranche = (platform: OwnedStreamingPlatformState) => {
    const running = programsOf(platform).find(program => program.status === 'RUNNING');
    if (!running) return null;
    const percent = Math.min(running.percent / BUYBACK_WEEKS, running.percent - running.boughtPercent);
    return { program: running, percent, ofNow: percent / (1 - running.boughtPercent / 100) };
};

/** the weekly close: buy this week's part at the week's close, unless it would take the treasury under the cash floor */
export const settleStreamingBuybackWeek = (platform: OwnedStreamingPlatformState, absoluteWeek: number, close: number): OwnedStreamingPlatformState => {
    const tranche = streamingBuybackTranche(platform);
    const listing = platform.publicCompany.listing;
    if (!tranche || !listing || tranche.percent <= 0) return platform;
    const save = (program: OwnedStreamingBuybackProgram, next: OwnedStreamingPlatformState): OwnedStreamingPlatformState => ({
        ...next, publicCompany: { ...next.publicCompany, buybacks: programsOf(next).map(item => (item.id === program.id ? program : item)) },
    });
    const cost = Math.round(close * listing.sharesOutstanding * tranche.ofNow / 100);
    if (platform.treasuryCash - cost < getStreamingTeamCashFloor(platform).amount) return save({ ...tranche.program, status: 'HELD' }, platform);
    const before = platform.founderOwnershipPercent;
    const retired = Math.round(listing.sharesOutstanding * tranche.ofNow / 100);
    let next = retireStreamingStake(platform, holder => holder.holderName === PUBLIC_FLOAT_HOLDER, tranche.ofNow);
    next = {
        ...next,
        treasuryCash: next.treasuryCash - cost,
        finance: {
            ...next.finance,
            capitalActions: [...next.finance.capitalActions, streamingCapitalAction(platform, `buyback:${tranche.program.id}:${absoluteWeek}`, 'SHARE_BUYBACK', absoluteWeek, cost, -cost, 0, before, next.founderOwnershipPercent)],
        },
        publicCompany: {
            ...next.publicCompany,
            listing: { ...listing, sharesOutstanding: listing.sharesOutstanding - retired, publicShares: Math.max(0, listing.publicShares - retired) },
        },
    };
    const bought = round4(tranche.program.boughtPercent + tranche.percent);
    const weeksLeft = tranche.program.weeksLeft - 1;
    return save({
        ...tranche.program,
        boughtPercent: bought,
        spent: tranche.program.spent + cost,
        weeksLeft,
        status: weeksLeft <= 0 || bought >= tranche.program.percent - 1e-9 ? 'DONE' : 'RUNNING',
    }, next);
};
