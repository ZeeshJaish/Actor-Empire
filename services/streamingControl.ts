/**
 * #205 (plan §23.8): control follows shares. Zeesh (2026-11-04): "aur yeh batao ki agar hm log company selll out kar dete
 * ya step down kar dete to kya hum aage chal ke dusra streamin khol sakte hai ya nahi ?".
 *
 *   - Falling under 51% by selling: the price dips and the board marks it, with a story.
 *   - No shares and no office: you are out, as after a sale: the closed screen, and 2 years later you can found again.
 *     Never two services at once: while you hold shares or a seat, no.
 *   - Private, after stepping down: OWNERSHIP › Sell your stake: bankers (⚡10), a buyer in 4 weeks at your % of the
 *     value × 0.85–1.0; the offer stands 4 weeks. Listed, shares are sold in the Stocks app.
 *   - Under 51% as chief executive: a board under 40 confidence for 13 weeks moves you to chair (streamingTeam.ts).
 */
import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingStakeSale,
    Player,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getIndustryPeople } from './industry/industryPeople';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import { streamingCapitalAction } from './streamingBuybacks';
import { getStreamingEquityValuation } from './streamingPublicMarkets';

export const STREAMING_CONTROL_LINE = 51;
/** the market's read of a founder selling under 51% */
export const STREAMING_LOST_CONTROL_PRICE = 0.97;
export const STREAMING_LOST_CONTROL_BOARD = 8;
export const STREAMING_BOARD_PATIENCE_LOW = 40;
export const STREAMING_BOARD_PATIENCE_WEEKS = 13;
export const STREAMING_BOARD_WARN_WEEKS = 8;
export const STREAMING_STAKE_ENERGY = 10;
export const STREAMING_STAKE_BANKER_WEEKS = 4;
export const STREAMING_STAKE_OFFER_WEEKS = 4;
export const STREAMING_STAKE_RETRY_WEEKS = 13;

const round2 = (value: number) => Math.round(value * 100) / 100;
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B` : `$${Math.round(value / 1e6)}M`);
const NO_SHARES = 0.005;

/** no shares, and no office: nothing ties you to the company any more */
export const streamingFounderHasNoTie = (founderPercent: number, platform: OwnedStreamingPlatformState, role = platform.legacy.founderOfficeRole) => (
    founderPercent <= NO_SHARES && platform.leadership.currentCeo.holderType === 'EXECUTIVE' && role === 'FOUNDER_EMERITUS'
);

/** you are out, as after a sale: the closed screen, then the 2-year wait */
export const streamingFounderLeaves = (platform: OwnedStreamingPlatformState, absoluteWeek: number, proceeds: number): OwnedStreamingPlatformState => ({
    ...platform,
    lifecycle: 'SOLD',
    founderOwnershipPercent: 0,
    governance: { ...platform.governance, departure: { atAbsoluteWeek: absoluteWeek, proceeds: Math.round(proceeds) } },
});

/** the story and the board's mark when a founder sells under 51% */
export const streamingLostControl = (platform: OwnedStreamingPlatformState, absoluteWeek: number, after: number): OwnedStreamingPlatformState => {
    const key = `streaming-founder-lost-control:${absoluteWeek}`;
    const fact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'FOUNDER_ROLE_CHANGED',
        summary: `The founder sold down to ${round2(after)}% and no longer controls the company.`,
        source: 'PLAYER_ACTION',
        metadata: { kind: 'LOST_CONTROL', founderPercent: round2(after) },
    };
    return {
        ...platform,
        governance: { ...platform.governance, boardConfidence: Math.max(0, platform.governance.boardConfidence - STREAMING_LOST_CONTROL_BOARD) },
        eventLedger: [...platform.eventLedger, fact],
    };
};

/* ── Sell your stake (private, after stepping down) ── */

export interface StreamingStakeView {
    status: 'IDLE' | 'WAIT' | 'BANKERS' | 'OFFER';
    founderPercent: number;
    worth: number;
    energy: number;
    weeksLeft: number;
    percent: number;
    buyerName: string | null;
    price: number | null;
    /** selling this would take you under 51% */
    crossesControl: boolean;
    /** selling this would end your last tie */
    endsIt: boolean;
    /** you left the board too */
    offBoard: boolean;
    /** who has what to say */
    line: string;
}

export const getStreamingStakeView = (player: Player): StreamingStakeView | null => {
    const platform = platformOf(player);
    if (platform.lifecycle !== 'ACTIVE' || platform.publicCompany.lifecycle === 'PUBLIC') return null;
    if (platform.leadership.currentCeo.holderType !== 'EXECUTIVE' || platform.founderOwnershipPercent <= NO_SHARES) return null;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const stake = platform.governance.stakeSale || null;
    const founderPercent = platform.founderOwnershipPercent;
    const percent = stake && stake.status !== 'DECLINED' ? stake.percent : founderPercent;
    const crossesControl = founderPercent >= STREAMING_CONTROL_LINE && founderPercent - percent < STREAMING_CONTROL_LINE;
    const endsIt = streamingFounderHasNoTie(founderPercent - percent, platform);
    const base = {
        founderPercent, worth: getStreamingEquityValuation(platform), energy: STREAMING_STAKE_ENERGY, percent, buyerName: null, price: null, crossesControl, endsIt,
        offBoard: platform.legacy.founderOfficeRole === 'FOUNDER_EMERITUS',
        line: 'Bankers find a buyer in 4 weeks, at about what your shares are worth, less up to 15% for selling privately.',
    };
    if (stake?.status === 'BANKERS') return { ...base, status: 'BANKERS', weeksLeft: Math.max(0, stake.offerAtAbsoluteWeek - absoluteWeek) };
    if (stake?.status === 'OFFER') return { ...base, status: 'OFFER', weeksLeft: Math.max(0, (stake.standsUntilAbsoluteWeek ?? absoluteWeek) - absoluteWeek), buyerName: stake.buyerName, price: stake.price };
    if (stake?.status === 'DECLINED') {
        const wait = stake.startedAtAbsoluteWeek + STREAMING_STAKE_RETRY_WEEKS - absoluteWeek;
        if (wait > 0) return { ...base, status: 'WAIT', weeksLeft: wait };
    }
    return { ...base, status: 'IDLE', weeksLeft: 0 };
};

export interface StreamingStakeResult { player: Player; changed: boolean; message: string }

/** bankers for your stake, or part of it: ⚡10 now, a buyer in 4 weeks */
export const hireStreamingStakeBankers = (player: Player, percent: number): StreamingStakeResult => {
    const view = getStreamingStakeView(player);
    if (!view) return { player, changed: false, message: 'You can sell your stake once you have stepped down, while the company is private.' };
    if (view.status === 'BANKERS' || view.status === 'OFFER') return { player, changed: false, message: 'Your bankers are already on it.' };
    /* #218 */
    const sale = platformOf(player).governance.sale?.status;
    if (sale === 'BANKERS' || sale === 'BIDS' || sale === 'CLOSING') return { player, changed: false, message: 'The bankers are selling the whole company.' };
    if (view.status === 'WAIT') return { player, changed: false, message: `You can try again in ${view.weeksLeft} week${view.weeksLeft === 1 ? '' : 's'}.` };
    const size = Math.max(1, Math.min(view.founderPercent, round2(percent)));
    if ((player.energy?.current || 0) < STREAMING_STAKE_ENERGY) return { player, changed: false, message: `Hiring the bankers takes ⚡${STREAMING_STAKE_ENERGY}.` };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const next: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags } };
    spendPlayerEnergy(next, STREAMING_STAKE_ENERGY, 'OWNERSHIP: bankers to sell your stake');
    const platform = platformOf(next);
    const stakeSale: OwnedStreamingStakeSale = {
        status: 'BANKERS', percent: size, startedAtAbsoluteWeek: absoluteWeek, offerAtAbsoluteWeek: absoluteWeek + STREAMING_STAKE_BANKER_WEEKS,
        standsUntilAbsoluteWeek: null, buyerName: null, price: null,
    };
    return {
        changed: true,
        message: `Your bankers are looking for a buyer: an offer in ${STREAMING_STAKE_BANKER_WEEKS} weeks.`,
        player: { ...next, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, governance: { ...platform.governance, stakeSale } }, next.id) },
    };
};

/** the weekly close: the buyer's offer comes in; an unanswered one lapses */
export const processStreamingStakeSaleWeek = (player: Player): Player => {
    const source = player.ownedStreamingPlatform;
    const stake = source?.governance?.stakeSale;
    if (!stake || (stake.status !== 'BANKERS' && stake.status !== 'OFFER')) return player;
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (stake.status === 'BANKERS' && absoluteWeek >= stake.offerAtAbsoluteWeek) {
        const rng = createDeterministicRng(`${platform.simulationSeed}:stake:${stake.startedAtAbsoluteWeek}`);
        const holders = new Set(platform.finance.equityHolders.map(holder => holder.holderName));
        const buyers = getIndustryPeople(player).filter(person => person.kind === 'INVESTOR' && !holders.has(person.name));
        const buyer = buyers[Math.floor(rng() * buyers.length) % Math.max(1, buyers.length)];
        const worth = getStreamingEquityValuation(platform) * stake.percent / 100;
        const price = Math.round(worth * (0.85 + rng() * 0.15) / 1_000_000) * 1_000_000;
        return {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                governance: { ...platform.governance, stakeSale: { ...stake, status: 'OFFER', buyerName: buyer?.name || 'A private buyer', price, standsUntilAbsoluteWeek: absoluteWeek + STREAMING_STAKE_OFFER_WEEKS } },
            }, player.id),
        };
    }
    if (stake.status === 'OFFER' && absoluteWeek >= (stake.standsUntilAbsoluteWeek ?? absoluteWeek)) {
        return { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, governance: { ...platform.governance, stakeSale: { ...stake, status: 'DECLINED' } } }, player.id) };
    }
    return player;
};

export const declineStreamingStakeOffer = (player: Player): StreamingStakeResult => {
    const platform = platformOf(player);
    const stake = platform.governance.stakeSale;
    if (stake?.status !== 'OFFER') return { player, changed: false, message: 'There is no offer on the table.' };
    return {
        changed: true,
        message: `You turned ${stake.buyerName} down. You can try again ${STREAMING_STAKE_RETRY_WEEKS} weeks after you called them.`,
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, governance: { ...platform.governance, stakeSale: { ...stake, status: 'DECLINED' } } }, player.id) },
    };
};

/** the offer taken: the money is yours, the shares are the buyer's; with no shares and no office, you are out */
export const acceptStreamingStakeOffer = (player: Player): StreamingStakeResult => {
    const platform = platformOf(player);
    const stake = platform.governance.stakeSale;
    if (stake?.status !== 'OFFER' || stake.price === null) return { player, changed: false, message: 'There is no offer on the table.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const before = platform.founderOwnershipPercent;
    const after = round2(Math.max(0, before - stake.percent));
    const key = `founder-stake-sale:${stake.startedAtAbsoluteWeek}`;
    let next: OwnedStreamingPlatformState = {
        ...platform,
        founderOwnershipPercent: after,
        finance: {
            ...platform.finance,
            equityHolders: [...platform.finance.equityHolders, {
                id: createDeterministicId('streaming_equity', platform.simulationSeed, key),
                holderName: stake.buyerName || 'A private buyer',
                ownershipPercent: round2(before - after),
                investedCapital: stake.price,
                issuedAtAbsoluteWeek: absoluteWeek,
            }],
            capitalActions: [...platform.finance.capitalActions, streamingCapitalAction(platform, key, 'FOUNDER_SHARE_TRADE', absoluteWeek, stake.price, 0, stake.price, before, after)],
        },
        governance: { ...platform.governance, stakeSale: null },
    };
    if (before >= STREAMING_CONTROL_LINE && after < STREAMING_CONTROL_LINE) next = streamingLostControl(next, absoluteWeek, after);
    const out = streamingFounderHasNoTie(after, next);
    if (out) next = streamingFounderLeaves(next, absoluteWeek, stake.price);
    return {
        changed: true,
        message: out
            ? `You sold your last shares for ${money(stake.price)}. You have left ${platform.identity?.name || 'the company'}.`
            : `You sold ${round2(before - after)}% to ${stake.buyerName} for ${money(stake.price)}; you hold ${after}%.`,
        player: { ...player, money: (player.money || 0) + stake.price, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(next, player.id) },
    };
};
