/**
 * #221 (plan §24): the estate, paid over time. Zeesh (2026-11-04): "अगर मेरा हेयर उतना इनकम नहीं रखा ... हम लोग शायद ये डाल सकते हैं
 * हेयर को कि एक टाइम ऑफ कुछ, कि इतने टाइम के अंदर तुम्हें पे करना होगा, या अगले साल अगले क्वार्टर में पे करना होगा".
 *
 * Real life allows it: US estate tax on a family business can run up to 14 years (26 U.S.C. § 6166), and the UK takes ten
 * yearly instalments on businesses and some shares. Here: 20 quarters at 4% a year, from the wallet.
 *
 *   - A payment the wallet cannot cover sells shares to cover what is short: a forced sale, under their worth, and the board
 *     marks it. Once listed, the market does too. Selling under 51% loses control, as any sale does.
 *   - The company sold, or no shares left: what is owed falls due at once, from the wallet the sale paid into.
 *   - It can be paid off early, for what is owed then, with no more interest.
 */
import type { OwnedStreamingEstatePlan, OwnedStreamingPlatformState, Player } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { PUBLIC_FLOAT_HOLDER, streamingCapitalAction } from './streamingBuybacks';
import { STREAMING_CONTROL_LINE, streamingFounderHasNoTie, streamingFounderLeaves, streamingLostControl } from './streamingControl';
import { getStreamingEquityValuation } from './streamingPublicMarkets';

export const STREAMING_ESTATE_QUARTERS = 20;
export const STREAMING_ESTATE_RATE = 0.04;
const QUARTER_WEEKS = 13;
const FORCED_DISCOUNT = 0.85;
const FORCED_BOARD = 2;
const FORCED_PRICE = -0.01;
const NO_SHARES = 0.005;
const round2 = (value: number) => Math.round(value * 100) / 100;
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

/** what each quarter costs, interest included */
export const streamingEstateQuarterly = (tax: number) => {
    const rate = STREAMING_ESTATE_RATE / 4;
    return Math.round(tax * rate / (1 - (1 + rate) ** -STREAMING_ESTATE_QUARTERS));
};

export const startStreamingEstatePlan = (tax: number, absoluteWeek: number): OwnedStreamingEstatePlan => ({
    tax: Math.round(tax),
    owed: Math.round(tax),
    quarterly: streamingEstateQuarterly(tax),
    quartersLeft: STREAMING_ESTATE_QUARTERS,
    startedAtAbsoluteWeek: absoluteWeek,
    nextDueAbsoluteWeek: absoluteWeek + QUARTER_WEEKS,
});

export interface StreamingEstatePlanView {
    owed: number;
    quarterly: number;
    quartersLeft: number;
    nextInWeeks: number;
    ratePercent: number;
    /** what the wallet is short of the next payment */
    short: number;
    canPayOff: boolean;
}

export const getStreamingEstatePlanView = (player: Player): StreamingEstatePlanView | null => {
    const plan = player.ownedStreamingPlatform?.governance?.estatePlan;
    if (!plan) return null;
    const wallet = Math.max(0, Math.round(player.money || 0));
    return {
        owed: plan.owed,
        quarterly: plan.quarterly,
        quartersLeft: plan.quartersLeft,
        nextInWeeks: Math.max(0, plan.nextDueAbsoluteWeek - getAbsoluteWeek(player.age, player.currentWeek)),
        ratePercent: STREAMING_ESTATE_RATE * 100,
        short: Math.max(0, plan.quarterly - wallet),
        canPayOff: wallet >= plan.owed,
    };
};

/* out of the wallet, and on the statement */
const charge = (player: Player, amount: number, name: string): Player => (amount <= 0 ? player : {
    ...player,
    money: (player.money || 0) - amount,
    finance: {
        ...player.finance,
        history: [{
            id: `tx_streaming_${getAbsoluteWeek(player.age, player.currentWeek)}_ESTATE_${amount}`,
            week: player.currentWeek, year: player.age, amount: -amount, category: 'OTHER', description: `Estate payment for ${name}`,
        }, ...(player.finance?.history || [])],
    },
});

const save = (player: Player, platform: OwnedStreamingPlatformState): Player => ({ ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platform, player.id) });

/* a forced sale: enough shares to cover what is short, under their worth; none left, and the state takes what there was */
const sellSharesFor = (platform: OwnedStreamingPlatformState, amount: number, absoluteWeek: number): { platform: OwnedStreamingPlatformState; percent: number } => {
    const before = platform.founderOwnershipPercent;
    const worthOfOne = getStreamingEquityValuation(platform) / 100 * FORCED_DISCOUNT;
    const percent = Math.min(before, worthOfOne > 0 ? Math.ceil(amount / worthOfOne * 100) / 100 : before);
    const after = round2(before - percent);
    const listing = platform.publicCompany.lifecycle === 'PUBLIC' ? platform.publicCompany.listing : null;
    const holderName = listing ? PUBLIC_FLOAT_HOLDER : 'Private buyers';
    const existing = platform.finance.equityHolders.find(holder => holder.holderName === holderName);
    const key = `estate-forced-sale:${absoluteWeek}`;
    let next: OwnedStreamingPlatformState = {
        ...platform,
        founderOwnershipPercent: after,
        finance: {
            ...platform.finance,
            equityHolders: existing
                ? platform.finance.equityHolders.map(holder => (holder === existing ? { ...holder, ownershipPercent: round2(holder.ownershipPercent + percent) } : holder))
                : [...platform.finance.equityHolders, {
                    id: createDeterministicId('streaming_equity', platform.simulationSeed, key),
                    holderName, ownershipPercent: round2(percent), investedCapital: Math.round(amount), issuedAtAbsoluteWeek: absoluteWeek,
                }],
            capitalActions: [...platform.finance.capitalActions, streamingCapitalAction(platform, key, 'FOUNDER_SHARE_TRADE', absoluteWeek, Math.round(amount), 0, Math.round(amount), before, after)],
        },
        publicCompany: listing ? { ...platform.publicCompany, listing: { ...listing, publicShares: listing.publicShares + Math.round(listing.sharesOutstanding * percent / 100) } } : platform.publicCompany,
        governance: {
            ...platform.governance,
            boardConfidence: Math.max(0, platform.governance.boardConfidence - FORCED_BOARD),
            ...(listing ? { pendingPriceMoves: [...(platform.governance.pendingPriceMoves || []), { move: FORCED_PRICE, reason: 'Shares sold to pay the estate' }] } : {}),
        },
    };
    if (before >= STREAMING_CONTROL_LINE && after < STREAMING_CONTROL_LINE) next = streamingLostControl(next, absoluteWeek, after);
    if (streamingFounderHasNoTie(after, next)) next = streamingFounderLeaves(next, absoluteWeek, 0);
    return { platform: next, percent };
};

/** the weekly close: a quarter's payment, or what is owed when there is nothing left to pay it from */
export const processStreamingEstatePlanWeek = (player: Player): Player => {
    const plan = player.ownedStreamingPlatform?.governance?.estatePlan;
    if (!plan) return player;
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const name = platform.identity?.name || 'the company';
    const wallet = Math.max(0, Math.round(player.money || 0));
    /* sold, or no shares left: it falls due now, from the wallet the sale paid into */
    if (platform.lifecycle !== 'ACTIVE' || platform.founderOwnershipPercent <= NO_SHARES) {
        const paid = Math.min(wallet, plan.owed);
        return save(charge(player, paid, name), { ...platform, governance: { ...platform.governance, estatePlan: null } });
    }
    if (absoluteWeek < plan.nextDueAbsoluteWeek) return player;
    const interest = Math.round(plan.owed * STREAMING_ESTATE_RATE / 4);
    const due = Math.min(plan.quarterly, plan.owed + interest);
    const fromWallet = Math.min(wallet, due);
    const short = due - fromWallet;
    const sold = short > 0 ? sellSharesFor(platform, short, absoluteWeek) : null;
    const after = sold?.platform || platform;
    const noShares = after.founderOwnershipPercent <= NO_SHARES;
    const owed = noShares ? 0 : Math.max(0, plan.owed + interest - due);
    const estatePlan: OwnedStreamingEstatePlan | null = owed <= 0 ? null : {
        ...plan,
        owed,
        quartersLeft: Math.max(0, plan.quartersLeft - 1),
        nextDueAbsoluteWeek: plan.nextDueAbsoluteWeek + QUARTER_WEEKS,
        ...(sold ? { lastSold: { atAbsoluteWeek: absoluteWeek, percent: round2(sold.percent), amount: short } } : {}),
    };
    return save(charge(player, fromWallet, name), { ...after, governance: { ...after.governance, estatePlan } });
};

export interface StreamingEstatePayOffResult { player: Player; changed: boolean; message: string }

export const payOffStreamingEstate = (player: Player): StreamingEstatePayOffResult => {
    const platform = platformOf(player);
    const plan = platform.governance.estatePlan;
    if (!plan) return { player, changed: false, message: 'The estate is paid.' };
    if ((player.money || 0) < plan.owed) return { player, changed: false, message: `${money(plan.owed)} is owed, more than your wallet holds.` };
    return {
        changed: true,
        message: `The estate is paid: ${money(plan.owed)}.`,
        player: save(charge(player, plan.owed, platform.identity?.name || 'the company'), { ...platform, governance: { ...platform.governance, estatePlan: null } }),
    };
};
