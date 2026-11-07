/**
 * #190 (plan §22.4, §22.7 Q4): selling the company.
 *
 * OWNERSHIP › Sell the company › Hire bankers (⚡10). Four weeks later, 3–5 bids for the whole company (more, the
 * better our numbers): rival platforms (for the members), media groups and tech giants from the exchange, and private
 * equity from the industry's investors. Each bid is our value (the valuation engine's) × a premium of 1.10–1.45,
 * higher with strategic fit and with more bidders; it never anchors on an asking price. The bids stand 4 weeks.
 *
 * Approval: at 51% or more it is yours to give (the other holders are dragged along at the same price); under 51%
 * the board votes; once listed, it is a tender at a premium over the share price, and the shareholders vote.
 * Closing takes 3 weeks; then every holder is paid their share of the price, you in cash, and the company goes to
 * the buyer: SOLD. Rejecting every bid (or letting them lapse) costs the board's confidence, the share price if
 * listed, and 26 weeks before the bankers can be called again. Two years after a sale, a new company can be founded.
 */
import type { OwnedStreamingCompanySale, OwnedStreamingPlatformState, OwnedStreamingSaleBid, Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getStreamingEquityValuation } from './streamingPublicMarkets';
import { valueOwnedStreamingPlatform } from './valuation/streamingValuation';
import { getStreamingRoundStanding } from './streamingInvestorOffers';
import { getIndustryPeople } from './industry/industryPeople';
import { spendPlayerEnergy } from './premiumLogic';
import { streamingCapitalAction } from './streamingBuybacks';

export const STREAMING_SALE_BANKERS_ENERGY = 10;
export const STREAMING_SALE_BANKER_WEEKS = 4;
export const STREAMING_SALE_BIDS_WEEKS = 4;
export const STREAMING_SALE_CLOSING_WEEKS = 3;
export const STREAMING_SALE_COOLDOWN_WEEKS = 26;
/** §22.7 Q4: a new company may be founded two years after a sale */
export const STREAMING_NEW_COMPANY_WEEKS = 104;

const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const save = (player: Player, platform: OwnedStreamingPlatformState): Player => ({
    ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platform, player.id),
});
const withSale = (platform: OwnedStreamingPlatformState, sale: OwnedStreamingCompanySale): OwnedStreamingPlatformState => ({
    ...platform, governance: { ...platform.governance, sale },
});
const moneyWords = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B` : `$${Math.round(value / 1e6)}M`);

/** how each kind of buyer values us: the fit adds to the premium, and sets the usual terms */
const KINDS: Record<OwnedStreamingSaleBid['buyerKind'], { fit: number; payment: OwnedStreamingSaleBid['payment'][]; brand: OwnedStreamingSaleBid['brand'][]; team: OwnedStreamingSaleBid['team'][] }> = {
    RIVAL: { fit: 0.12, payment: ['SHARES', 'MIXED'], brand: ['MERGE'], team: ['REPLACE', 'KEEP'] },
    MEDIA: { fit: 0.1, payment: ['MIXED', 'CASH'], brand: ['KEEP', 'MERGE'], team: ['KEEP', 'REPLACE'] },
    TECH: { fit: 0.08, payment: ['CASH'], brand: ['KEEP', 'MERGE'], team: ['KEEP'] },
    PRIVATE_EQUITY: { fit: 0.03, payment: ['CASH'], brand: ['KEEP'], team: ['KEEP'] },
};

/** the buyers the bankers can bring: the rival platforms, the exchange's media and tech names, the industry's funds */
const buyersOf = (player: Player, platform: OwnedStreamingPlatformState) => {
    const rivals = (platform.competitiveWorld.rivals || []).map(rival => ({ name: rival.platformName, kind: 'RIVAL' as const }));
    const exchange = (player.stocks || [])
        .filter(stock => stock.sector === 'MEDIA' || stock.sector === 'TECH')
        .map(stock => ({ name: stock.name, kind: stock.sector === 'MEDIA' ? 'MEDIA' as const : 'TECH' as const }));
    const funds = getIndustryPeople(player)
        .filter(person => person.kind === 'INVESTOR' && !person.person)
        .map(person => ({ name: person.name, kind: 'PRIVATE_EQUITY' as const }));
    return { rivals, exchange, funds };
};

/** the bids, when the bankers' 4 weeks are up: 3–5 by our standing, each from a different kind of buyer first */
export const makeStreamingSaleBids = (player: Player, platform: OwnedStreamingPlatformState, sale: OwnedStreamingCompanySale, absoluteWeek: number): OwnedStreamingSaleBid[] => {
    const rng = createDeterministicRng(`${platform.simulationSeed}:sale:${sale.id}`);
    const pick = <T,>(list: T[]) => (list.length ? list[Math.floor(rng() * list.length)] : null);
    const standing = getStreamingRoundStanding(platform);
    const passed = standing.checks.filter(check => check.passed).length;
    const count = 3 + Math.floor(passed / 2);
    const { rivals, exchange, funds } = buyersOf(player, platform);
    const pools = [rivals, exchange.filter(item => item.kind === 'MEDIA'), exchange.filter(item => item.kind === 'TECH'), funds];
    const chosen: Array<{ name: string; kind: OwnedStreamingSaleBid['buyerKind'] }> = [];
    for (let round = 0; chosen.length < count && round < 6; round += 1) {
        for (const pool of pools) {
            if (chosen.length >= count) break;
            const left = pool.filter(item => !chosen.some(taken => taken.name === item.name));
            const buyer = pick(left);
            if (buyer) chosen.push(buyer);
        }
    }
    /* #192: the premium is paid on the business; the treasury's cash (less debt) is bought at face, so cash parked in
       the company before a sale earns no premium */
    const valuation = valueOwnedStreamingPlatform(platform);
    const worth = valuation.equityValue;
    const net = worth - valuation.enterpriseValue;
    return chosen.map((buyer, index) => {
        const kind = KINDS[buyer.kind];
        /* the premium: a floor, the buyer's fit, the competition between bidders, and the buyer's own view */
        const premium = clamp(1.1 + kind.fit + 0.03 * (chosen.length - 3) + (rng() - 0.35) * 0.12, 1.1, 1.45);
        const price = Math.round((valuation.enterpriseValue * premium + net) / 10_000_000) * 10_000_000;
        return {
            id: createDeterministicId('streaming_sale_bid', platform.simulationSeed, `${sale.id}:${index}`),
            buyerName: buyer.name,
            buyerKind: buyer.kind,
            price,
            /* over our value, as a whole */
            premium: round2(price / Math.max(1, worth)),
            payment: pick(kind.payment) || 'CASH',
            brand: pick(kind.brand) || 'KEEP',
            team: pick(kind.team) || 'KEEP',
            status: 'OPEN' as const,
        };
    }).sort((a, b) => b.price - a.price);
};

export type StreamingSaleApproval = 'YOURS' | 'BOARD' | 'SHAREHOLDERS';

/** who has to say yes to a bid, and how likely they are to (0–100) */
export const getStreamingSaleApproval = (platform: OwnedStreamingPlatformState, bid: OwnedStreamingSaleBid): { by: StreamingSaleApproval; support: number } => {
    const founder = platform.founderOwnershipPercent;
    const listing = platform.publicCompany.lifecycle === 'PUBLIC' ? platform.publicCompany.listing : null;
    if (listing) {
        /* a tender: the public weighs the price a share against today's */
        const price = platform.publicCompany.quoteHistory.at(-1)?.close || listing.offerPrice;
        const tender = bid.price / Math.max(1, listing.sharesOutstanding);
        const lift = tender / Math.max(0.01, price) - 1;
        const others = clamp(0.3 + lift * 1.5, 0, 1);
        return { by: 'SHAREHOLDERS', support: Math.round(founder + (100 - founder) * others) };
    }
    if (founder >= 51) return { by: 'YOURS', support: 100 };
    return { by: 'BOARD', support: Math.round(clamp(40 + (bid.premium - 1.1) * 100 + (platform.governance.boardConfidence - 50) * 0.4, 0, 100)) };
};

export interface StreamingSaleResult { player: Player; changed: boolean; message: string }

/** OWNERSHIP › Sell the company › Hire bankers: ⚡10 now, the bids in 4 weeks */
export const hireStreamingSaleBankers = (player: Player): StreamingSaleResult => {
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const state = getStreamingSaleState(platform, absoluteWeek);
    if (!platform.identity || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return { player, changed: false, message: 'Buyers wait until the service is live.' };
    if (state.status === 'BANKERS' || state.status === 'BIDS' || state.status === 'CLOSING') return { player, changed: false, message: 'A sale is already under way.' };
    if (state.status === 'COOLDOWN') return { player, changed: false, message: `After the last bids were turned down, the bankers can be called again in ${state.weeksLeft} week${state.weeksLeft === 1 ? '' : 's'}.` };
    if ((player.energy?.current || 0) < STREAMING_SALE_BANKERS_ENERGY) return { player, changed: false, message: `Hiring the bankers takes ⚡${STREAMING_SALE_BANKERS_ENERGY}.` };
    const sale: OwnedStreamingCompanySale = {
        id: createDeterministicId('streaming_sale', platform.simulationSeed, `sale:${absoluteWeek}`),
        status: 'BANKERS',
        startedAtAbsoluteWeek: absoluteWeek,
        bidsAtAbsoluteWeek: absoluteWeek + STREAMING_SALE_BANKER_WEEKS,
        bidsCloseAtAbsoluteWeek: null,
        bids: [],
        acceptedBidId: null,
        closesAtAbsoluteWeek: null,
        soldAtAbsoluteWeek: null,
        rejectedAtAbsoluteWeek: null,
        founderCash: null,
        founderPercentAtSale: null,
    };
    const next: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags } };
    spendPlayerEnergy(next, STREAMING_SALE_BANKERS_ENERGY, 'OWNERSHIP: bankers to sell the company');
    return { changed: true, message: `Your bankers are calling buyers: bids in ${STREAMING_SALE_BANKER_WEEKS} weeks.`, player: save(next, withSale(platformOf(next), sale)) };
};

/** a bid accepted: approval, then 3 weeks of closing */
export const acceptStreamingSaleBid = (player: Player, bidId: string): StreamingSaleResult => {
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const sale = platform.governance.sale;
    const bid = sale?.status === 'BIDS' ? sale.bids.find(item => item.id === bidId && item.status === 'OPEN') : null;
    if (!sale || !bid) return { player, changed: false, message: 'That bid is no longer on the table.' };
    const approval = getStreamingSaleApproval(platform, bid);
    if (approval.support < 50) {
        const voted: OwnedStreamingCompanySale = { ...sale, bids: sale.bids.map(item => (item.id === bid.id ? { ...item, status: 'VOTED_DOWN' as const } : item)) };
        return {
            changed: true,
            message: approval.by === 'BOARD' ? `The board voted it down (${approval.support}% for).` : `The shareholders voted it down (${approval.support}% for).`,
            player: save(player, withSale(platform, voted)),
        };
    }
    const closing: OwnedStreamingCompanySale = {
        ...sale,
        status: 'CLOSING',
        acceptedBidId: bid.id,
        closesAtAbsoluteWeek: absoluteWeek + STREAMING_SALE_CLOSING_WEEKS,
        bids: sale.bids.map(item => (item.id === bid.id ? { ...item, status: 'ACCEPTED' as const } : item.status === 'OPEN' ? { ...item, status: 'LAPSED' as const } : item)),
    };
    const by = approval.by === 'YOURS' ? 'You hold the control' : approval.by === 'BOARD' ? `The board approved it (${approval.support}% for)` : `The shareholders approved the tender (${approval.support}% for)`;
    return { changed: true, message: `${by}: ${bid.buyerName} buys the company for ${moneyWords(bid.price)}. Closing in ${STREAMING_SALE_CLOSING_WEEKS} weeks.`, player: save(player, withSale(platform, closing)) };
};

/** every bid turned down: the board's confidence falls, and the bankers wait 26 weeks */
const rejected = (platform: OwnedStreamingPlatformState, sale: OwnedStreamingCompanySale, absoluteWeek: number): OwnedStreamingPlatformState => ({
    ...platform,
    governance: {
        ...platform.governance,
        boardConfidence: Math.max(0, platform.governance.boardConfidence - 6),
        sale: { ...sale, status: 'REJECTED', rejectedAtAbsoluteWeek: absoluteWeek, bids: sale.bids.map(item => (item.status === 'OPEN' ? { ...item, status: 'LAPSED' as const } : item)) },
    },
});

export const rejectStreamingSaleBids = (player: Player): StreamingSaleResult => {
    const platform = platformOf(player);
    const sale = platform.governance.sale;
    if (!sale || sale.status !== 'BIDS') return { player, changed: false, message: 'There are no bids to turn down.' };
    return { changed: true, message: `Every bid turned down. The bankers can be called again in ${STREAMING_SALE_COOLDOWN_WEEKS} weeks.`, player: save(player, rejected(platform, sale, getAbsoluteWeek(player.age, player.currentWeek))) };
};

/** the state of the sale this week */
export const getStreamingSaleState = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => {
    const sale = platform.governance.sale || null;
    if (!sale) return { status: 'IDLE' as const, sale, weeksLeft: 0 };
    if (sale.status === 'REJECTED') {
        const weeksLeft = (sale.rejectedAtAbsoluteWeek || 0) + STREAMING_SALE_COOLDOWN_WEEKS - absoluteWeek;
        return weeksLeft > 0 ? { status: 'COOLDOWN' as const, sale, weeksLeft } : { status: 'IDLE' as const, sale, weeksLeft: 0 };
    }
    const weeksLeft = sale.status === 'BANKERS' ? Math.max(0, sale.bidsAtAbsoluteWeek - absoluteWeek)
        : sale.status === 'BIDS' ? Math.max(0, (sale.bidsCloseAtAbsoluteWeek || absoluteWeek) - absoluteWeek)
            : sale.status === 'CLOSING' ? Math.max(0, (sale.closesAtAbsoluteWeek || absoluteWeek) - absoluteWeek) : 0;
    return { status: sale.status, sale, weeksLeft };
};

/** the weekly close: the bids come in; unanswered bids lapse; a closing completes */
export const processStreamingCompanySaleWeek = (player: Player): Player => {
    const platform = platformOf(player);
    const sale = platform.governance.sale;
    if (!sale || platform.lifecycle !== 'ACTIVE') return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (sale.status === 'BANKERS' && absoluteWeek >= sale.bidsAtAbsoluteWeek) {
        const bids = makeStreamingSaleBids(player, platform, sale, absoluteWeek);
        return save(player, withSale(platform, { ...sale, status: 'BIDS', bids, bidsCloseAtAbsoluteWeek: absoluteWeek + STREAMING_SALE_BIDS_WEEKS }));
    }
    if (sale.status === 'BIDS' && absoluteWeek >= (sale.bidsCloseAtAbsoluteWeek || absoluteWeek)) {
        return save(player, rejected(platform, sale, absoluteWeek));
    }
    if (sale.status === 'CLOSING' && absoluteWeek >= (sale.closesAtAbsoluteWeek || absoluteWeek)) {
        const bid = sale.bids.find(item => item.id === sale.acceptedBidId);
        if (!bid) return player;
        /* every holder is paid their share of the price; you, in cash */
        const founderPercent = platform.founderOwnershipPercent;
        const founderCash = Math.round(bid.price * founderPercent / 100);
        const sold: OwnedStreamingPlatformState = {
            ...platform,
            lifecycle: 'SOLD',
            founderOwnershipPercent: 0,
            finance: {
                ...platform.finance,
                capitalActions: [...platform.finance.capitalActions, streamingCapitalAction(platform, `company-sale:${sale.id}`, 'COMPANY_SALE', absoluteWeek, bid.price, 0, founderCash, founderPercent, 0)],
            },
            governance: { ...platform.governance, sale: { ...sale, status: 'SOLD', soldAtAbsoluteWeek: absoluteWeek, founderCash, founderPercentAtSale: founderPercent } },
        };
        return { ...save(player, sold), money: (player.money || 0) + founderCash };
    }
    return player;
};

/** §22.7 Q4: two years after the sale, the founding starts again; the sold company is kept on record */
export const getStreamingNewCompanyWait = (player: Player): number | null => {
    const platform = platformOf(player);
    const soldAt = platform.governance.sale?.soldAtAbsoluteWeek;
    if (platform.lifecycle !== 'SOLD' || soldAt === null || soldAt === undefined) return null;
    return Math.max(0, soldAt + STREAMING_NEW_COMPANY_WEEKS - getAbsoluteWeek(player.age, player.currentWeek));
};

export const startNewStreamingCompany = (player: Player): StreamingSaleResult => {
    const platform = platformOf(player);
    const wait = getStreamingNewCompanyWait(player);
    const sale = platform.governance.sale;
    if (wait === null || !sale) return { player, changed: false, message: 'There is no sold company.' };
    if (wait > 0) return { player, changed: false, message: `A new company can be founded in ${wait} week${wait === 1 ? '' : 's'}.` };
    const bid = sale.bids.find(item => item.id === sale.acceptedBidId);
    const record = {
        name: platform.identity?.name || 'EMPIRE+',
        soldAtAbsoluteWeek: sale.soldAtAbsoluteWeek || 0,
        buyerName: bid?.buyerName || 'A buyer',
        price: bid?.price || 0,
        founderCash: sale.founderCash || 0,
    };
    const fresh = normalizeOwnedStreamingPlatformState(undefined, player.id);
    return {
        changed: true,
        message: 'A new company: the founding starts again.',
        player: {
            ...player,
            soldStreamingCompanies: [...(player.soldStreamingCompanies || []), record],
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...fresh, lifecycle: 'ELIGIBLE' }, player.id),
        },
    };
};

/** OWNERSHIP's "Sell the company": where the sale stands, the bids with your share of each, and who must approve */
export interface StreamingSaleView {
    status: 'IDLE' | 'COOLDOWN' | 'BANKERS' | 'BIDS' | 'CLOSING';
    worth: number;
    founderPercent: number;
    listed: boolean;
    energy: number;
    weeksLeft: number;
    /** who approves a bid at today's stake */
    approvalBy: StreamingSaleApproval;
    bids: Array<OwnedStreamingSaleBid & { founderCash: number; approval: { by: StreamingSaleApproval; support: number } }>;
    closing: null | { buyerName: string; price: number; founderCash: number };
}

export const getStreamingSaleView = (player: Player): StreamingSaleView | null => {
    const platform = platformOf(player);
    if (!platform.identity || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return null;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const state = getStreamingSaleState(platform, absoluteWeek);
    const founderPercent = platform.founderOwnershipPercent;
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    const accepted = state.sale?.bids.find(item => item.id === state.sale?.acceptedBidId) || null;
    return {
        status: state.status === 'SOLD' ? 'IDLE' : state.status,
        worth: getStreamingEquityValuation(platform),
        founderPercent,
        listed,
        energy: STREAMING_SALE_BANKERS_ENERGY,
        weeksLeft: state.weeksLeft,
        approvalBy: listed ? 'SHAREHOLDERS' : founderPercent >= 51 ? 'YOURS' : 'BOARD',
        bids: state.status === 'BIDS' ? state.sale!.bids.map(bid => ({ ...bid, founderCash: Math.round(bid.price * founderPercent / 100), approval: getStreamingSaleApproval(platform, bid) })) : [],
        closing: state.status === 'CLOSING' && accepted ? { buyerName: accepted.buyerName, price: accepted.price, founderCash: Math.round(accepted.price * founderPercent / 100) } : null,
    };
};
