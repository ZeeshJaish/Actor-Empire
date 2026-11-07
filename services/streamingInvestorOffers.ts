/**
 * #186 (plan §22.4): investor rounds the founder calls (#172's calls at each 5M subscribers, and the three founding
 * offers that stood forever, are gone). Zeesh, 2026-11-03: "hm log call kare investor round rather than wo log khud
 * approch kare and jab hm log call kare toyk energy le 5-10 and fir 3 hafta ka time le fir humara backend se offer
 * curate hoke aaye different different logo ke and may be 6 week ka deadline they wo exprice hone ka , and jo offers
 * banenge wo humare sare stats and numbers leke banenge".
 *
 *   - OWNERSHIP › Raise money: Small (up to 5%, ⚡5), Growth (up to 10%, ⚡8), Big (up to 20%, ⚡10). It needs a CFO;
 *     a listed company raises on the market instead; the next round can be called 13 weeks after the last.
 *   - 3 weeks later the bankers bring 2–6 offers from the industry's investors: how many, and how good, by our growth,
 *     cash, reputation, playback and readiness for a listing. Each prices the company at the valuation engine's value ×
 *     the investor's own factor (0.78–0.98), harsher on weak numbers, a little better on strong growth; each asks a
 *     stake in its own range, never more than the round's size or what keeps the founder at 51%; a board seat from 8%.
 *   - The offers stand 6 weeks. Several may be signed, up to the round's size. Signing issues new shares: every holder
 *     is diluted, not the founder alone (`acceptStreamingCelebrityInvestment`).
 */
import { getStreamingStakeView, type StreamingStakeView } from './streamingControl';
import { getStreamingBoardView, type StreamingBoardView } from './streamingBoard';
import type { Gender, OwnedStreamingInvestorOffer, OwnedStreamingPlatformState, Player, StreamingExecutiveStrategy } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { STREAMING_CELEBRITY_INVESTOR_OFFERS, type StreamingCelebrityInvestorOffer } from './streamingLeadershipGovernance';
import { getStreamingEquityValuation } from './streamingPublicMarkets';
import { findIndustryInvestor, getIndustryPeople } from './industry/industryPeople';
import { spendPlayerEnergy } from './premiumLogic';
import { PUBLIC_FLOAT_HOLDER, getStreamingBuybackState } from './streamingBuybacks';
import { getStreamingBuyoutQuote, type StreamingBuyoutQuote } from './streamingOwnShares';
import type { OwnedStreamingInvestorRound, StreamingInvestorRoundSize } from '../types';
import { TEAM_OPTIONS_HOLDER } from './team/teamHiring';
import { getStreamingTeamCashFloor } from './team/teamState';

/** the founder keeps a majority */
const CONTROL_FLOOR = 51;

interface StreamingInvestorProfile {
    id: string;
    name: string;
    initials: string;
    publicIdentity: string;
    kind: OwnedStreamingInvestorOffer['kind'];
    stake: number;
    /** what they pay against what we are worth */
    price: number;
    profitParticipationPercent: number;
    preferredStrategy: StreamingExecutiveStrategy;
    influenceDemand: string;
    attentionEffect: string;
    caution: string;
}

export const STREAMING_INVESTOR_POOL: StreamingInvestorProfile[] = [
    { id: 'marisol-vega', name: 'Marisol Vega', initials: 'MV', publicIdentity: 'Pop superstar', kind: 'CELEBRITY', stake: 4, price: 0.92, profitParticipationPercent: 1.5, preferredStrategy: 'GROWTH_FIRST', influenceDemand: 'A concert special each year and her face on one launch campaign.', attentionEffect: 'Her fans follow her money: a burst of attention in Latin America.', caution: 'She will say in public what she thinks of your choices.' },
    { id: 'northgate-growth', name: 'Northgate Growth Partners', initials: 'NG', publicIdentity: 'Growth fund', kind: 'FUND', stake: 8, price: 0.85, profitParticipationPercent: 0.5, preferredStrategy: 'MARGIN_FIRST', influenceDemand: 'A board seat and a quarterly operating review.', attentionEffect: 'Other funds read the valuation it sets.', caution: 'A fund wants its money back: it will push for a listing within a few years.' },
    { id: 'kenji-arakawa', name: 'Kenji Arakawa', initials: 'KA', publicIdentity: 'Animation studio founder', kind: 'FOUNDER', stake: 5, price: 0.9, profitParticipationPercent: 1, preferredStrategy: 'CREATIVE_FIRST', influenceDemand: 'First look at two animated Originals a year.', attentionEffect: 'Animators and fans in Japan take notice.', caution: 'He expects the animation shelf to grow.' },
    { id: 'halden-rowe', name: 'Halden & Rowe', initials: 'HR', publicIdentity: 'Family office', kind: 'FAMILY', stake: 6, price: 0.82, profitParticipationPercent: 1, preferredStrategy: 'TRUST_FIRST', influenceDemand: 'A quiet seat at the annual review; no seat on the board.', attentionEffect: 'Patient money: bankers read it as a sign of stability.', caution: 'It pays less than a fund and expects steady profit.' },
    { id: 'atlas-sovereign', name: 'Atlas Sovereign Fund', initials: 'AS', publicIdentity: 'Sovereign wealth fund', kind: 'SOVEREIGN', stake: 10, price: 0.95, profitParticipationPercent: 0, preferredStrategy: 'GLOBAL_FIRST', influenceDemand: 'A board seat and a regional headquarters in the Gulf.', attentionEffect: 'Governments take your filings more seriously.', caution: 'Its politics become part of your headlines.' },
    { id: 'priya-raman', name: 'Priya Raman', initials: 'PR', publicIdentity: 'Payments founder', kind: 'FOUNDER', stake: 3, price: 0.9, profitParticipationPercent: 0.5, preferredStrategy: 'TECHNOLOGY_FIRST', influenceDemand: 'An advisory role on billing and apps.', attentionEffect: 'Engineers want to work where she invests.', caution: 'She will ask hard questions about your tech debt.' },
    { id: 'lucas-mbeki', name: 'Lucas Mbeki', initials: 'LM', publicIdentity: 'Football icon', kind: 'CELEBRITY', stake: 4, price: 0.9, profitParticipationPercent: 1.5, preferredStrategy: 'GROWTH_FIRST', influenceDemand: 'A documentary series about his last season.', attentionEffect: 'Sports fans across Africa and Europe hear your name.', caution: 'His documentary becomes your problem if it goes over budget.' },
    { id: 'bluewater-capital', name: 'Bluewater Capital', initials: 'BC', publicIdentity: 'Media private-equity firm', kind: 'FUND', stake: 12, price: 0.8, profitParticipationPercent: 1, preferredStrategy: 'MARGIN_FIRST', influenceDemand: 'A board seat and a cost review of every room.', attentionEffect: 'Its name says you are a serious business.', caution: 'The largest discount on the table, and the hardest voice on the board.' },
    { id: 'elodie-marchand', name: 'Élodie Marchand', initials: 'EM', publicIdentity: 'Fashion house heir', kind: 'FAMILY', stake: 5, price: 0.88, profitParticipationPercent: 1, preferredStrategy: 'CREATIVE_FIRST', influenceDemand: 'Costume and premiere partnerships with her house.', attentionEffect: 'Premieres look like fashion weeks.', caution: 'Her house expects to be seen on your biggest titles.' },
    { id: 'saffron-partners', name: 'Saffron Partners', initials: 'SP', publicIdentity: 'Emerging-markets fund', kind: 'FUND', stake: 7, price: 0.86, profitParticipationPercent: 0.5, preferredStrategy: 'GLOBAL_FIRST', influenceDemand: 'A plan to reach South and Southeast Asia within two years.', attentionEffect: 'Partners in India and Indonesia return your calls.', caution: 'It measures you by your growth in its markets.' },
];

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

/** every offer the company has had: the first three investors (only those already decided still matter), then the rest */
export const getStreamingInvestorOfferCatalogue = (platform: OwnedStreamingPlatformState): Array<StreamingCelebrityInvestorOffer & Partial<Pick<OwnedStreamingInvestorOffer, 'kind' | 'createdAtAbsoluteWeek' | 'expiresAtAbsoluteWeek' | 'milestoneSubscribers' | 'roundId'>>> => [
    ...STREAMING_CELEBRITY_INVESTOR_OFFERS,
    ...(platform.governance.investorOffers || []),
];

/** offers the founder can still sign or decline this week: a round's, while it stands (#186: the founding three no
 *  longer stand forever) */
export const getStreamingOpenInvestorOffers = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => {
    /* #174: a listed company raises on the market; a private term sheet does not stand after the bell */
    if (platform.publicCompany.lifecycle === 'PUBLIC') return [];
    const decided = new Set(platform.governance.celebrityInvestors.map(item => item.candidateId));
    return (platform.governance.investorOffers || [])
        .filter(offer => !decided.has(offer.id) && offer.expiresAtAbsoluteWeek >= absoluteWeek);
};

/** one of the open offers, or null (signed, declined, lapsed or unknown) */
export const findStreamingInvestorOffer = (platform: OwnedStreamingPlatformState, offerId: string, absoluteWeek: number) => (
    getStreamingOpenInvestorOffers(platform, absoluteWeek).find(offer => offer.id === offerId) || null
);

/* ── #186: rounds ── */

export const STREAMING_ROUND_SIZES: Record<StreamingInvestorRoundSize, { label: string; upToPercent: number; energy: number }> = {
    SMALL: { label: 'Small', upToPercent: 5, energy: 5 },
    GROWTH: { label: 'Growth', upToPercent: 10, energy: 8 },
    BIG: { label: 'Big', upToPercent: 20, energy: 10 },
};
/** the bankers take this long to bring the offers */
export const STREAMING_ROUND_WEEKS = 3;
/** the offers stand this long */
export const STREAMING_ROUND_OFFER_WEEKS = 6;
/** the next round can be called this long after the last */
export const STREAMING_ROUND_GAP_WEEKS = 13;

/** after a signing of `stake`% (new shares), what the founder keeps */
export const founderAfterNewShares = (founderPercent: number, stake: number) => Math.round(founderPercent * (1 - stake / 100) * 100) / 100;
/** the most a new holder can take (new shares) while the founder keeps 51% */
export const roomAboveControl = (founderPercent: number) => Math.max(0, Math.floor((1 - CONTROL_FLOOR / Math.max(CONTROL_FLOOR, founderPercent)) * 1000) / 10);

/** what investors will read before they offer: five things, each passed or not */
export const getStreamingRoundStanding = (platform: OwnedStreamingPlatformState) => {
    const weeks = platform.weeklyHistory.filter(item => item.operations);
    const now = weeks.at(-1);
    const then = weeks.at(-13) || weeks[0];
    const growth = now && then && then.subscribers > 0 ? now.subscribers / then.subscribers - 1 : 0;
    const lastFour = weeks.slice(-4);
    const cash = lastFour.length ? lastFour.reduce((sum, item) => sum + (item.operations!.netCashContribution || 0), 0) / lastFour.length : 0;
    const playback = lastFour.length ? lastFour.reduce((sum, item) => sum + (item.operations!.playbackSuccessRate || 0), 0) / lastFour.length : 0;
    const cfo = platform.leadership.appointments.some(item => item.status === 'ACTIVE' && item.role === 'CFO');
    const reviewed = platform.cycleReviews.some(item => item.kind === 'TWELVE_WEEK_REVIEW');
    const checks = [
        { id: 'GROWTH', label: 'Members growing', passed: growth > 0.02 },
        { id: 'CASH', label: 'Cash coming in', passed: cash > 0 },
        { id: 'REPUTATION', label: 'A trusted name', passed: platform.competitiveWorld.globalPrestige >= 40 || platform.crisisSecurity.publicTrust >= 70 },
        { id: 'PLAYBACK', label: 'Streams that work', passed: playback >= 99 },
        { id: 'READY', label: 'Ready for a listing', passed: reviewed && cfo },
    ];
    return { score: checks.filter(item => item.passed).length, growth, checks };
};

/** the round as OWNERSHIP shows it */
export const getStreamingRoundState = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => {
    const round = platform.governance.investorRound || null;
    const status: 'NONE' | 'RUNNING' | 'OPEN' | 'GAP' = !round ? 'NONE'
        : absoluteWeek < round.offersAtAbsoluteWeek || round.closesAtAbsoluteWeek === null ? 'RUNNING'
            : absoluteWeek <= round.closesAtAbsoluteWeek ? 'OPEN'
                : absoluteWeek < round.calledAtAbsoluteWeek + STREAMING_ROUND_GAP_WEEKS ? 'GAP' : 'NONE';
    return {
        round,
        status,
        offersInWeeks: round ? Math.max(0, round.offersAtAbsoluteWeek - absoluteWeek) : 0,
        standsWeeks: round?.closesAtAbsoluteWeek !== null && round ? Math.max(0, round.closesAtAbsoluteWeek - absoluteWeek) : 0,
        nextInWeeks: round ? Math.max(0, round.calledAtAbsoluteWeek + STREAMING_ROUND_GAP_WEEKS - absoluteWeek) : 0,
    };
};

export interface StreamingRoundCallResult { player: Player; changed: boolean; reason?: string; message?: string }

/** #202: a round can sell any 1–20% of the company */
export const STREAMING_ROUND_MIN_PERCENT = 1;
export const STREAMING_ROUND_MAX_PERCENT = 20;
/** #202: the band a round's size falls in, and so its energy: ⚡5 up to 5%, ⚡8 up to 10%, ⚡10 above */
export const streamingRoundSizeFor = (percent: number): StreamingInvestorRoundSize => (percent <= 5 ? 'SMALL' : percent <= 10 ? 'GROWTH' : 'BIG');
export const streamingRoundEnergy = (percent: number) => STREAMING_ROUND_SIZES[streamingRoundSizeFor(percent)].energy;

/** OWNERSHIP › Raise money › Call a round: the energy is spent now, the offers come in 3 weeks. #202: any size you choose */
export const callStreamingInvestorRound = (player: Player, ask: StreamingInvestorRoundSize | number): StreamingRoundCallResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const percent = typeof ask === 'number'
        ? Math.max(STREAMING_ROUND_MIN_PERCENT, Math.min(STREAMING_ROUND_MAX_PERCENT, Math.round(ask * 10) / 10))
        : STREAMING_ROUND_SIZES[ask].upToPercent;
    const size = streamingRoundSizeFor(percent);
    const terms = STREAMING_ROUND_SIZES[size];
    if (!platform.identity || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return { player, changed: false, reason: 'NOT_LIVE', message: 'Investors wait until the service is live.' };
    if (platform.publicCompany.lifecycle === 'PUBLIC') return { player, changed: false, reason: 'LISTED', message: 'You are listed: new money comes from the market.' };
    if (!platform.leadership.appointments.some(item => item.status === 'ACTIVE' && item.role === 'CFO')) return { player, changed: false, reason: 'CFO', message: 'A round needs a CFO at the table.' };
    const state = getStreamingRoundState(platform, absoluteWeek);
    if (state.status === 'RUNNING' || state.status === 'OPEN') return { player, changed: false, reason: 'RUNNING', message: 'A round is already under way.' };
    if (state.status === 'GAP') return { player, changed: false, reason: 'GAP', message: `The next round can be called in ${state.nextInWeeks} week${state.nextInWeeks === 1 ? '' : 's'}.` };
    if (roomAboveControl(platform.founderOwnershipPercent) < 1) return { player, changed: false, reason: 'CONTROL', message: 'Selling any more would take you under 51%.' };
    if ((player.energy?.current || 0) < terms.energy) return { player, changed: false, reason: 'ENERGY', message: `A ${terms.label.toLowerCase()} round takes ⚡${terms.energy}.` };
    const round: OwnedStreamingInvestorRound = {
        id: createDeterministicId('streaming_round', platform.simulationSeed, `${size}:${absoluteWeek}`),
        size,
        upToPercent: Math.min(percent, roomAboveControl(platform.founderOwnershipPercent)),
        calledAtAbsoluteWeek: absoluteWeek,
        offersAtAbsoluteWeek: absoluteWeek + STREAMING_ROUND_WEEKS,
        closesAtAbsoluteWeek: null,
        offerCount: 0,
        soldPercent: 0,
    };
    const next: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags } };
    spendPlayerEnergy(next, terms.energy, `OWNERSHIP: a ${terms.label.toLowerCase()} round`);
    const after = normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, next.id);
    return {
        changed: true,
        message: `Your bankers are calling investors: offers in ${STREAMING_ROUND_WEEKS} weeks.`,
        player: { ...next, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...after, governance: { ...after.governance, investorRound: round } }, next.id) },
    };
};

/**
 * The weekly close: when a round's 3 weeks are up, the industry's investors make their offers (2–6, by our standing),
 * each standing 6 weeks; offers older than half a year leave the list.
 */
export const processStreamingInvestorRoundsWeek = (player: Player): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit || platform.publicCompany.lifecycle === 'PUBLIC') return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const decided = new Set(platform.governance.celebrityInvestors.map(item => item.candidateId));
    const kept = (platform.governance.investorOffers || []).filter(offer => offer.expiresAtAbsoluteWeek >= absoluteWeek - 26 || decided.has(offer.id));
    const round = platform.governance.investorRound;
    if (!round || round.closesAtAbsoluteWeek !== null || absoluteWeek < round.offersAtAbsoluteWeek) {
        if (kept.length === (platform.governance.investorOffers || []).length) return player;
        return { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, governance: { ...platform.governance, investorOffers: kept } }, player.id) };
    }
    const standing = getStreamingRoundStanding(platform);
    const worth = getStreamingEquityValuation(platform);
    const room = Math.min(round.upToPercent, roomAboveControl(platform.founderOwnershipPercent));
    /* who will not offer: our holders, and anyone who has an offer open or declined us in the last half year */
    const holders = new Set(platform.finance.equityHolders.map(holder => holder.holderName));
    const recent = new Set(platform.governance.celebrityInvestors.filter(item => item.status === 'DECLINED' && item.decisionAtAbsoluteWeek > absoluteWeek - 26).map(item => item.name));
    const open = new Set(getStreamingOpenInvestorOffers(platform, absoluteWeek).map(offer => offer.name));
    const rng = createDeterministicRng(`${platform.simulationSeed}:round:${round.id}`);
    const pool = getIndustryPeople(player)
        .filter(person => person.kind === 'INVESTOR' && person.investorKind && !holders.has(person.name) && !recent.has(person.name) && !open.has(person.name))
        .map(person => ({ person, order: rng() }))
        .sort((left, right) => left.order - right.order)
        .map(item => item.person);
    const count = 2 + Math.round(4 * standing.score / 5);
    /* weak numbers make every offer harsher; strong growth a little better */
    const harsh = 1 - 0.025 * (5 - standing.score);
    const momentum = Math.max(0.92, Math.min(1.08, 1 + standing.growth * 0.5));
    const offers: OwnedStreamingInvestorOffer[] = room < 1 ? [] : pool.slice(0, count).flatMap(person => {
        const [low, high] = person.stakeRange || [2, 6];
        const stake = Math.round(Math.min(room, low + (high - low) * rng()) * 10) / 10;
        if (stake < 1) return [];
        const valuation = roundTo(worth * (person.priceFactor || 0.85) * harsh * momentum, 50_000_000);
        return [{
            id: createDeterministicId('streaming_investor_offer', platform.simulationSeed, `${round.id}:${person.id}`),
            name: person.name,
            initials: person.name.split(/\s+/).map(word => word[0] || '').join('').slice(0, 2).toUpperCase(),
            publicIdentity: person.publicIdentity || 'Investor',
            kind: person.investorKind!,
            investedCapital: roundTo(valuation * stake / 100, 5_000_000),
            ownershipPercent: stake,
            boardSeat: stake >= 8,
            profitParticipationPercent: person.profitSharePercent ?? 0,
            preferredStrategy: person.preferredStrategy,
            influenceDemand: person.influenceDemand || '',
            attentionEffect: person.attentionEffect || '',
            caution: person.caution,
            milestoneSubscribers: platform.metrics.subscribers,
            createdAtAbsoluteWeek: absoluteWeek,
            expiresAtAbsoluteWeek: absoluteWeek + STREAMING_ROUND_OFFER_WEEKS,
            roundId: round.id,
        }];
    });
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            governance: {
                ...platform.governance,
                investorOffers: [...kept, ...offers].slice(-12),
                investorRound: { ...round, closesAtAbsoluteWeek: absoluteWeek + STREAMING_ROUND_OFFER_WEEKS, offerCount: offers.length },
            },
        }, player.id),
    };
};

/* ── OWNERSHIP: who owns the company, and the term sheets on the table ── */

export interface StreamingOwnershipHolder {
    id: string;
    name: string;
    initials: string;
    identity: string;
    /** #180: TEAM is the options granted to our executives */
    kind: 'YOU' | 'PUBLIC' | 'TEAM' | OwnedStreamingInvestorOffer['kind'];
    percent: number;
    invested: number;
    boardSeat: boolean;
    profitSharePercent: number;
    /** the company week they came in */
    sinceWeek: number;
    /** #179: a person's portrait (the founder's own picture, or an investor of the industry); firms have none */
    gender?: Gender | null;
    avatar?: string | null;
    /** #187: a private company can buy an investor out */
    buyout?: StreamingBuyoutQuote | null;
}

export interface StreamingTermSheet {
    id: string;
    name: string;
    initials: string;
    /** #179: the investor's portrait when they are a person */
    gender?: Gender | null;
    identity: string;
    kind: OwnedStreamingInvestorOffer['kind'];
    capital: number;
    percent: number;
    /** what the offer values the company at */
    valuation: number;
    boardSeat: boolean;
    profitSharePercent: number;
    asks: string;
    brings: string;
    watch: string;
    /** weeks the term sheet still stands; null: it does not lapse */
    standsWeeks: number | null;
    founderAfter: number;
    canSign: boolean;
    blocked: string | null;
    /** the CFO's read: against what we are worth */
    read: string;
}

/** #186: OWNERSHIP › Raise money */
export interface StreamingRoundView {
    status: 'NONE' | 'RUNNING' | 'OPEN' | 'GAP';
    label: string | null;
    upToPercent: number;
    soldPercent: number;
    offerCount: number;
    offersInWeeks: number;
    standsWeeks: number;
    nextInWeeks: number;
    /** what investors read before they offer */
    standing: { score: number; checks: Array<{ id: string; label: string; passed: boolean }> };
    /** #202: your own size: from 1% up to the most the 51% line and 20% allow; why you cannot call one now */
    custom: { maxPercent: number; worth: number; founder: number; blocked: string | null };
}

export interface StreamingOwnershipView {
    worth: number;
    founderPercent: number;
    listed: boolean;
    cfoName: string | null;
    holders: StreamingOwnershipHolder[];
    offers: StreamingTermSheet[];
    /** the founder's own money, to put in without giving a stake */
    founderCash: number;
    round: StreamingRoundView;
    /** #201: the board */
    board: StreamingBoardView;
    /** #205: selling your own stake, once you have stepped down */
    stake: StreamingStakeView | null;
    /** #187: a listed company's buybacks */
    buyback: {
        allowance: number;
        running: { percent: number; bought: number; spent: number; weeksLeft: number } | null;
        last: { percent: number; bought: number; spent: number; status: 'RUNNING' | 'DONE' | 'HELD' } | null;
        options: Array<{ percent: number; cost: number; blocked: string | null }>;
    } | null;
}

const FIRST_INVESTOR_KIND: Record<string, OwnedStreamingInvestorOffer['kind']> = {
    'investor-aarav-kapoor': 'CELEBRITY', 'investor-sofia-laurent': 'CELEBRITY', 'investor-dante-cole': 'CELEBRITY',
};
/* the holder the listing (`commitStreamingCinematicIpo`) writes for the shares it sold: PUBLIC_FLOAT_HOLDER */
const initialsOf = (name: string) => name.split(/\s+/).map(word => word[0] || '').join('').slice(0, 2).toUpperCase();
const percentWords = (value: number) => `${Math.round(value * 100)}%`;
const moneyWords = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : `$${Math.round(value / 1e6)}M`);

/** the CFO's read of an offer: what it values us at against what we are worth by our numbers */
export const readStreamingInvestorOffer = (worth: number, offer: Pick<StreamingCelebrityInvestorOffer, 'investedCapital' | 'ownershipPercent' | 'boardSeat'>, founderAfter: number, cfoName: string | null) => {
    const implied = offer.investedCapital / (offer.ownershipPercent / 100);
    const ratio = implied / Math.max(1, worth);
    /* an investor always asks for a discount: up to 15% is the market's usual price, up to 30% a hard bargain */
    const price = ratio >= 0.85 ? `a fair price (${percentWords(Math.max(0, 1 - ratio))} under what we are worth, the usual discount)` : `${percentWords(1 - ratio)} under what we are worth`;
    const who = cfoName ? cfoName.split(' ')[0] : 'Finance';
    const view = founderAfter < CONTROL_FLOOR ? 'It would take you under 51%, so it cannot be signed.'
        : ratio >= 0.85 ? `${who}'s view: worth signing if you want the cash${offer.boardSeat ? ' and can share the board' : ''}.`
            : ratio >= 0.7 ? `${who}'s view: a hard bargain; sign only if we need the cash now.`
                : `${who}'s view: I would wait; the stake costs more than the cash is worth to us.`;
    return { implied, ratio, text: `By our numbers the company is worth about ${moneyWords(worth)}: this is ${price}. ${view}` };
};

/** #179: an investor of the industry's gender, when they are a person (firms have no face) */
const investorGender = (player: Player, ...keys: string[]): Gender | null => {
    for (const key of keys) {
        const person = findIndustryInvestor(player, key);
        if (person) return person.person ? person.gender : null;
    }
    return null;
};

export const getStreamingOwnershipView = (player: Player): StreamingOwnershipView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const foundedAt = platform.identity?.foundedAtAbsoluteWeek ?? absoluteWeek;
    const worth = getStreamingEquityValuation(platform);
    const cfo = platform.leadership.appointments.find(item => item.status === 'ACTIVE' && item.role === 'CFO') || null;
    const catalogue = getStreamingInvestorOfferCatalogue(platform);
    const signed = platform.governance.celebrityInvestors.filter(item => item.status === 'ACCEPTED');
    const listing = platform.publicCompany.listing;
    const holders: StreamingOwnershipHolder[] = [
        { id: 'FOUNDER', name: player.name, initials: initialsOf(player.name), identity: 'Founder', kind: 'YOU', percent: platform.founderOwnershipPercent,
            invested: 0, boardSeat: true, profitSharePercent: 0, sinceWeek: 1, gender: player.gender, avatar: player.avatar || null },
        ...platform.finance.equityHolders.map((holder): StreamingOwnershipHolder => {
            /* #180: the options granted to our executives, as one row */
            if (holder.holderName === TEAM_OPTIONS_HOLDER) {
                return { id: 'TEAM', name: 'Team options', initials: 'TO', identity: 'Granted to your executives, vesting over 4 years', kind: 'TEAM',
                    percent: holder.ownershipPercent, invested: 0, boardSeat: false, profitSharePercent: 0,
                    sinceWeek: Math.max(1, holder.issuedAtAbsoluteWeek - foundedAt + 1) };
            }
            /* the listing writes the shares it sold as one holder: on the cap table they are the public's */
            if (listing && holder.holderName === PUBLIC_FLOAT_HOLDER) {
                return { id: 'PUBLIC', name: 'Public shareholders', initials: listing.ticker, identity: `${listing.ticker} on the exchange`, kind: 'PUBLIC',
                    percent: holder.ownershipPercent, invested: holder.investedCapital, boardSeat: false, profitSharePercent: 0,
                    sinceWeek: Math.max(1, listing.listedAtAbsoluteWeek - foundedAt + 1) };
            }
            const investor = signed.find(item => item.name === holder.holderName);
            const offer = catalogue.find(item => item.name === holder.holderName);
            return {
                id: holder.id,
                name: holder.holderName,
                initials: offer?.initials || initialsOf(holder.holderName),
                identity: offer?.publicIdentity || 'Investor',
                kind: offer?.kind || FIRST_INVESTOR_KIND[offer?.id || ''] || 'FUND',
                percent: holder.ownershipPercent,
                invested: holder.investedCapital,
                boardSeat: Boolean(investor?.boardSeatGranted),
                profitSharePercent: investor?.profitParticipationPercent ?? 0,
                sinceWeek: Math.max(1, holder.issuedAtAbsoluteWeek - foundedAt + 1),
                gender: investorGender(player, offer?.id || '', holder.holderName),
            };
        }),
    ];
    if (listing && !holders.some(holder => holder.kind === 'PUBLIC')) {
        const held = holders.reduce((sum, holder) => sum + holder.percent, 0);
        holders.push({ id: 'PUBLIC', name: 'Public shareholders', initials: listing.ticker, identity: `${listing.ticker} on the exchange`, kind: 'PUBLIC',
            percent: Math.max(0, 100 - held), invested: 0, boardSeat: false, profitSharePercent: 0, sinceWeek: Math.max(1, listing.listedAtAbsoluteWeek - foundedAt + 1) });
    }
    /* #187: while private, an investor can be bought out */
    if (platform.publicCompany.lifecycle !== 'PUBLIC') holders.forEach(holder => {
        if (holder.kind !== 'YOU' && holder.kind !== 'PUBLIC' && holder.kind !== 'TEAM') holder.buyout = getStreamingBuyoutQuote(platform, holder.id);
    });
    holders.sort((left, right) => Number(right.kind === 'YOU') - Number(left.kind === 'YOU') || right.percent - left.percent);
    const roundState = getStreamingRoundState(platform, absoluteWeek);
    const round = roundState.round;
    const offers = getStreamingOpenInvestorOffers(platform, absoluteWeek).map((offer): StreamingTermSheet => {
        /* #186: new shares dilute every holder, the founder included */
        const founderAfter = Math.round(founderAfterNewShares(platform.founderOwnershipPercent, offer.ownershipPercent) * 10) / 10;
        const read = readStreamingInvestorOffer(worth, offer, founderAfter, cfo?.nameAtAppointment || null);
        const roundLeft = round && offer.roundId === round.id ? Math.round((round.upToPercent - round.soldPercent) * 10) / 10 : null;
        const blocked = !cfo ? 'Signing needs a CFO at the table.'
            : founderAfter < CONTROL_FLOOR ? 'It would take you under 51%.'
                : roundLeft !== null && offer.ownershipPercent > roundLeft + 1e-9 ? `This round can sell ${roundLeft}% more.` : null;
        return {
            id: offer.id,
            name: offer.name,
            initials: offer.initials,
            identity: offer.publicIdentity,
            kind: offer.kind || FIRST_INVESTOR_KIND[offer.id] || 'CELEBRITY',
            capital: offer.investedCapital,
            percent: offer.ownershipPercent,
            valuation: Math.round(read.implied),
            boardSeat: offer.boardSeat,
            profitSharePercent: offer.profitParticipationPercent,
            asks: offer.influenceDemand,
            brings: offer.attentionEffect,
            watch: offer.caution,
            standsWeeks: offer.expiresAtAbsoluteWeek === undefined ? null : Math.max(0, offer.expiresAtAbsoluteWeek - absoluteWeek),
            founderAfter,
            canSign: !blocked,
            blocked,
            read: read.text,
            gender: investorGender(player, offer.id, offer.name),
        };
    });
    /* #186: the round, and the three sizes that can be called */
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    const room = roomAboveControl(platform.founderOwnershipPercent);
    const energy = Math.max(0, Math.round(player.energy?.current || 0));
    /* #202: your own size */
    const customBlocked = listed ? 'Listed: the market is your investor'
        : !cfo ? 'Calling a round needs a CFO at the table.'
            : roundState.status === 'RUNNING' || roundState.status === 'OPEN' ? 'A round is under way.'
                : roundState.status === 'GAP' ? `The next round can be called in ${roundState.nextInWeeks} week${roundState.nextInWeeks === 1 ? '' : 's'}.`
                    : room < STREAMING_ROUND_MIN_PERCENT ? 'Selling any more would take you under 51%.' : null;
    const custom = { maxPercent: Math.round(Math.min(STREAMING_ROUND_MAX_PERCENT, room) * 10) / 10, worth, founder: platform.founderOwnershipPercent, blocked: customBlocked };
    /* #187: a listed company's buybacks: 1, 2, 5 or 10% within this year's 10% */
    const buybackState = listed ? getStreamingBuybackState(platform, absoluteWeek) : null;
    const price = platform.publicCompany.quoteHistory.at(-1)?.close || listing?.offerPrice || 0;
    const floorAmount = getStreamingTeamCashFloor(platform).amount;
    const buyback = buybackState && listing ? {
        allowance: buybackState.allowance,
        running: buybackState.running ? { percent: buybackState.running.percent, bought: buybackState.running.boughtPercent, spent: buybackState.running.spent, weeksLeft: buybackState.running.weeksLeft } : null,
        last: buybackState.last ? { percent: buybackState.last.percent, bought: buybackState.last.boughtPercent, spent: buybackState.last.spent, status: buybackState.last.status } : null,
        options: [1, 2, 5, 10].map(percent => {
            const cost = Math.round(price * listing.sharesOutstanding * percent / 100);
            const blocked = buybackState.running ? 'One is running'
                : percent > buybackState.allowance ? `${buybackState.allowance}% left this year`
                    : platform.treasuryCash - cost < floorAmount ? 'Under the cash floor' : null;
            return { percent, cost, blocked };
        }),
    } : null;
    return {
        board: getStreamingBoardView(player),
        stake: getStreamingStakeView(player),
        worth,
        founderPercent: platform.founderOwnershipPercent,
        listed,
        cfoName: cfo?.nameAtAppointment || null,
        holders,
        offers,
        founderCash: Math.max(0, Math.round(player.money || 0)),
        buyback,
        round: {
            custom,
            status: roundState.status,
            label: round ? STREAMING_ROUND_SIZES[round.size].label : null,
            upToPercent: round?.upToPercent || 0,
            soldPercent: round?.soldPercent || 0,
            offerCount: round?.offerCount || 0,
            offersInWeeks: roundState.offersInWeeks,
            standsWeeks: roundState.standsWeeks,
            nextInWeeks: roundState.nextInWeeks,
            standing: (() => { const standing = getStreamingRoundStanding(platform); return { score: standing.score, checks: standing.checks }; })(),
        },
    };
};
