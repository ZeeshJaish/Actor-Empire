import { valueOwnedStreamingPlatform } from './valuation/streamingValuation';
import { nextSharePrice } from './valuation/sharePrice';
import { settleStreamingBuybackWeek, streamingBuybackTranche } from './streamingBuybacks';
import type {
    OwnedStreamingActivistCampaign,
    OwnedStreamingEarningsRecord,
    OwnedStreamingHostileTakeover,
    OwnedStreamingIpoJourney,
    OwnedStreamingLedgerEntry,
    OwnedStreamingMarketQuote,
    OwnedStreamingPlatformState,
    OwnedStreamingPublicGuidance,
    OwnedStreamingShareholderVote,
    OwnedStreamingWeeklySnapshot,
    Player,
    StreamingActivistDemand,
    StreamingGuidanceTone,
    StreamingIpoNarrative,
    StreamingTakeoverDefence,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';

const clamp = (value: number, minimum: number, maximum: number) => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const roundMoney = (value: number) => Math.round(value);
const roundPercent = (value: number) => Math.round(value * 100) / 100;
const roundPrice = (value: number) => Math.max(0.25, Math.round(value * 100) / 100);
const formatPublicMoney = (value: number) => Math.abs(value) >= 1_000_000_000
    ? `$${(value / 1_000_000_000).toFixed(2)}B`
    : `$${(value / 1_000_000).toFixed(1)}M`;

/* ── #173 (plan §21.17): the IPO in this update ── */
/** activists and hostile bids come back with M&A */
export const STREAMING_ACTIVISM_ENABLED = false;
/** ringing the bell starts the listing *(start)* */
export const STREAMING_IPO_BELL_ENERGY = 25;
/** an optional earnings call on a quarter's report *(start)* */
export const STREAMING_EARNINGS_CALL_ENERGY = 10;
/** weeks after a report that a call can still be held */
export const STREAMING_EARNINGS_CALL_WEEKS = 2;
/** a resolution's result: the share price (percent) and the board's confidence */
const VOTE_EFFECTS: Record<OwnedStreamingShareholderVote['type'], Record<'passed' | 'failed', { price: number; board: number; words: string }>> = {
    DIRECTOR_MANDATE: {
        passed: { price: 0.5, board: 3, words: 'Independent directors gain a mandate: the market reads better oversight.' },
        failed: { price: -0.5, board: -2, words: 'The director mandate failed: oversight stays as it was.' },
    },
    EXECUTIVE_PAY: {
        passed: { price: -0.5, board: 1, words: "Executive pay rises 5%: the team's salaries go up." },
        failed: { price: 0.5, board: -2, words: 'Executive pay stays where it is; the team notices.' },
    },
    CAPITAL_AUTHORITY: {
        passed: { price: -1, board: 2, words: 'The board may issue new shares: the market prices in some dilution.' },
        failed: { price: 0.5, board: -1, words: 'No new capital authority: any raise comes back to shareholders.' },
    },
    STRATEGIC_REVIEW: {
        passed: { price: 1, board: -2, words: 'A strategic review begins: the market likes the scrutiny, the board less so.' },
        failed: { price: -1, board: 1, words: 'No strategic review: the current plan stands.' },
    },
};

/**
 * #173: a resolution decided, by the founder's vote or, unanswered by its due week, by the public alone. Its result
 * moves the board's confidence now and the share price at the next quote; "Executive pay" passed raises every
 * executive's salary 5%.
 */
const settleShareholderVote = (
    platform: OwnedStreamingPlatformState,
    vote: OwnedStreamingShareholderVote,
    founderVote: 'FOR' | 'AGAINST' | null,
    absoluteWeek: number,
): OwnedStreamingPlatformState => {
    const founderWeight = platform.founderOwnershipPercent;
    const publicWeight = 100 - founderWeight;
    const finalSupport = founderVote === null
        ? roundPercent(vote.institutionalSupport)
        : roundPercent((founderVote === 'FOR' ? founderWeight : 0) + publicWeight * vote.institutionalSupport / 100);
    const approved = finalSupport >= 50;
    const effect = VOTE_EFFECTS[vote.type][approved ? 'passed' : 'failed'];
    const founderDelta = founderVote === null ? -2 : approved === (founderVote === 'FOR') ? 2 : -3;
    const settled: OwnedStreamingShareholderVote = {
        ...vote,
        founderVote,
        finalSupport,
        status: approved ? 'APPROVED' : 'REJECTED',
        consequence: effect.words,
        decidedBy: founderVote === null ? 'PUBLIC' : 'FOUNDER',
        priceEffectPercent: effect.price,
        priceAppliedAtAbsoluteWeek: null,
    };
    const raisePay = vote.type === 'EXECUTIVE_PAY' && approved;
    const ledger = publicLedger(platform, absoluteWeek, `shareholder-vote:${vote.id}`, 'SHAREHOLDER_VOTE_RESOLVED',
        `${vote.title} ${approved ? 'passed' : 'failed'} with ${finalSupport.toFixed(1)}% support${founderVote === null ? ': the public decided' : ''}.`, { finalSupport });
    return {
        ...platform,
        governance: { ...platform.governance, boardConfidence: Math.round(clamp(platform.governance.boardConfidence + effect.board + founderDelta, 0, 100)) },
        leadership: raisePay ? {
            ...platform.leadership,
            appointments: platform.leadership.appointments.map(item => (item.status === 'ACTIVE' ? { ...item, weeklyCompensation: Math.round(item.weeklyCompensation * 1.05) } : item)),
        } : platform.leadership,
        publicCompany: { ...platform.publicCompany, shareholderVotes: platform.publicCompany.shareholderVotes.map(item => (item.id === vote.id ? settled : item)) },
        eventLedger: platform.eventLedger.some(entry => entry.idempotencyKey === ledger.idempotencyKey) ? platform.eventLedger : [...platform.eventLedger, ledger],
    };
};

/** #173: an earnings call on the latest report (10⚡): it softens a miss, or lifts a beat, at the next quote */
export const holdStreamingEarningsCall = (player: Player): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.publicCompany.lifecycle !== 'PUBLIC') return { changed: false, player, reason: 'The company is not listed.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const latest = platform.publicCompany.earnings.at(-1);
    if (!latest || absoluteWeek - latest.reportedAtAbsoluteWeek > STREAMING_EARNINGS_CALL_WEEKS) return { changed: false, player, reason: 'There is no fresh report to speak to.' };
    if (latest.callHeldAtAbsoluteWeek !== undefined && latest.callHeldAtAbsoluteWeek !== null) return { changed: false, player, reason: 'You already held this quarter\'s call.' };
    if ((player.energy?.current ?? 0) < STREAMING_EARNINGS_CALL_ENERGY) return { changed: false, player, reason: `An earnings call takes ${STREAMING_EARNINGS_CALL_ENERGY} energy.` };
    const effect = latest.outcome === 'MISS'
        ? roundPercent(Math.min(6, Math.abs(latest.stockReactionPercent) * 0.4))
        : latest.outcome === 'BEAT' ? 2 : 1;
    const ledger = publicLedger(platform, absoluteWeek, `earnings-call:${latest.id}`, 'PUBLIC_EARNINGS_REPORTED',
        latest.outcome === 'MISS' ? 'The earnings call explained the miss.' : latest.outcome === 'BEAT' ? 'The earnings call sold the beat.' : 'The earnings call steadied a mixed quarter.', { cycleNumber: latest.cycleNumber });
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        publicCompany: {
            ...platform.publicCompany,
            earnings: platform.publicCompany.earnings.map(item => (item.id === latest.id ? { ...item, callHeldAtAbsoluteWeek: absoluteWeek, callEffectPercent: effect, callAppliedAtAbsoluteWeek: null } : item)),
        },
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    const nextPlayer: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags }, ownedStreamingPlatform: nextPlatform };
    spendPlayerEnergy(nextPlayer, STREAMING_EARNINGS_CALL_ENERGY, 'Earnings call');
    return { changed: true, player: nextPlayer };
};

export interface StreamingIpoReadinessItem {
    id: 'LIVE_HISTORY' | 'CFO' | 'GOVERNANCE' | 'SCALE' | 'RELIABILITY' | 'FINANCE';
    label: string;
    passed: boolean;
    hardGate: boolean;
    value: string;
    requirement: string;
}

export interface StreamingPublicMarketsView {
    lifecycle: OwnedStreamingPlatformState['publicCompany']['lifecycle'];
    readiness: StreamingIpoReadinessItem[];
    readinessScore: number;
    canStartRoadshow: boolean;
    valuation: number;
    suggestedTicker: string;
    activeGuidance: OwnedStreamingPublicGuidance | null;
    openVote: OwnedStreamingShareholderVote | null;
    activeActivist: OwnedStreamingActivistCampaign | null;
    activeTakeover: OwnedStreamingHostileTakeover | null;
    latestQuote: OwnedStreamingMarketQuote | null;
    latestEarnings: OwnedStreamingEarningsRecord | null;
    boardIsBinding: boolean;
}

export interface StreamingPublicMarketActionResult {
    changed: boolean;
    player: Player;
    reason?: string;
}

export interface StreamingCinematicIpoCommitInput {
    ticker: string;
    narrative: StreamingIpoNarrative;
    price: number;
    preIpoShares: number;
    newShares: number;
    employeeQuotaPercent: number;
    underwriterId: string;
    underwriterName: string;
    firmBook: boolean;
    bookCoverage: number;
    anchorDiscountAccepted: boolean;
    governanceMarks: string[];
    diligenceWeeks: number;
    regulatorAttempts: number;
}

export type StreamingIpoJourneyCheckpoint = Omit<
    OwnedStreamingIpoJourney,
    'id' | 'idempotencyKey' | 'status' | 'startedAtAbsoluteWeek' | 'updatedAtAbsoluteWeek' | 'lastProcessedAbsoluteWeek'
>;

export const startStreamingCinematicIpoJourney = (
    player: Player,
    input: { ticker: string; ask: number; shares: number },
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.publicCompany.ipoJourney?.status === 'ACTIVE') {
        return { changed: false, player: { ...player, ownedStreamingPlatform: platform }, reason: 'The saved listing process is ready to resume.' };
    }
    const view = getStreamingPublicMarkets({ ...player, ownedStreamingPlatform: platform });
    if (!view.canStartRoadshow) return { changed: false, player, reason: 'IPO readiness requirements are not complete.' };
    /* #173: ringing the bell takes 25 energy; resuming a saved listing takes none */
    if ((player.energy?.current ?? 0) < STREAMING_IPO_BELL_ENERGY) return { changed: false, player, reason: `Ringing the bell takes ${STREAMING_IPO_BELL_ENERGY} energy.` };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const ticker = input.ticker.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || view.suggestedTicker;
    const idempotencyKey = `ipo-cinematic-journey:${ticker}:${absoluteWeek}`;
    const journey: OwnedStreamingIpoJourney = {
        id: createDeterministicId('streaming_ipo_journey', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        status: 'ACTIVE',
        startedAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        /* #189: the listing opens on the ask */
        scene: 'ASK',
        ask: Math.round(clamp(input.ask, 1, Number.MAX_SAFE_INTEGER)),
        /* #189: the float is a % of the company now, so a big company sells more than 40M shares */
        shares: Math.round(clamp(input.shares, 250_000, 500_000_000)),
        revision: 1,
        bankId: null,
        marks: [],
        omit: {},
        answers: {},
        attempt: 1,
        diligenceWeeks: 0,
        cut: 0,
        lowPrice: 0,
        highPrice: 0,
        anchorDiscountAccepted: null,
        employeeQuotaPercent: 2,
        interviewMove: 0,
        book: null,
        closePrice: 0,
        ticker,
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        publicCompany: { ...platform.publicCompany, lifecycle: 'IPO_PREPARATION', ipoJourney: journey },
    }, player.id);
    const nextPlayer: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags }, ownedStreamingPlatform: nextPlatform };
    spendPlayerEnergy(nextPlayer, STREAMING_IPO_BELL_ENERGY, 'Ring the bell');
    return { changed: true, player: nextPlayer };
};

export const checkpointStreamingCinematicIpoJourney = (
    player: Player,
    checkpoint: StreamingIpoJourneyCheckpoint,
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.publicCompany.ipoJourney;
    if (!current || current.status !== 'ACTIVE' || platform.publicCompany.listing) {
        return { changed: false, player, reason: 'There is no active listing process to save.' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextJourney: OwnedStreamingIpoJourney = {
        ...current,
        ...checkpoint,
        status: 'ACTIVE',
        updatedAtAbsoluteWeek: absoluteWeek,
        lastProcessedAbsoluteWeek: Math.max(current.lastProcessedAbsoluteWeek, absoluteWeek),
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        publicCompany: { ...platform.publicCompany, ipoJourney: nextJourney },
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

const hasActiveRole = (platform: OwnedStreamingPlatformState, role: string) => (
    platform.leadership.appointments.some(appointment => appointment.status === 'ACTIVE' && appointment.role === role)
);

const getTrailingOperations = (platform: OwnedStreamingPlatformState, weeks = 12) => (
    platform.weeklyHistory.slice(-weeks).flatMap(snapshot => snapshot.operations ? [snapshot.operations] : [])
);

/**
 * What the company is worth: #184, the valuation engine's equity value (services/valuation), the same number on every
 * screen (OWNERSHIP, MARKETS, the listing, investors, options, Forbes).
 */
export const getStreamingEquityValuation = (platform: OwnedStreamingPlatformState): number => valueOwnedStreamingPlatform(platform).equityValue;

/** #185: our listed company as a ticker in the Stocks app */
export interface StreamingOwnTicker {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    /** the offer price, then each week's close (the last 20) */
    closes: number[];
    marketCap: number;
    sharesOutstanding: number;
    founderPercent: number;
    publicPercent: number;
    /** what a share is worth by the valuation engine */
    valuePerShare: number;
    listedAtAbsoluteWeek: number;
}

export const getStreamingOwnTicker = (player: Player): StreamingOwnTicker | null => {
    const source = player.ownedStreamingPlatform;
    /* #190: a sold company is no longer ours to trade */
    if (!source?.identity || source.lifecycle === 'SOLD' || source.publicCompany?.lifecycle !== 'PUBLIC' || !source.publicCompany.listing) return null;
    const platform = normalizeOwnedStreamingPlatformState(source, player.id);
    const listing = platform.publicCompany.listing!;
    const quotes = platform.publicCompany.quoteHistory;
    const price = quotes.at(-1)?.close || listing.offerPrice;
    const floatHolder = platform.finance.equityHolders.find(holder => holder.holderName === 'Public shareholder float');
    return {
        symbol: listing.ticker,
        name: platform.identity!.name,
        price,
        changePercent: quotes.at(-1)?.changePercent || 0,
        closes: [listing.offerPrice, ...quotes.map(quote => quote.close)].slice(-20),
        marketCap: roundMoney(price * listing.sharesOutstanding),
        sharesOutstanding: listing.sharesOutstanding,
        founderPercent: platform.founderOwnershipPercent,
        publicPercent: floatHolder ? floatHolder.ownershipPercent : roundPercent(listing.publicShares / Math.max(1, listing.sharesOutstanding) * 100),
        valuePerShare: getStreamingEquityValuation(platform) / Math.max(1, listing.sharesOutstanding),
        listedAtAbsoluteWeek: listing.listedAtAbsoluteWeek,
    };
};

const suggestTicker = (name: string) => {
    const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (letters.slice(0, 4) || 'STRM').padEnd(3, 'X').slice(0, 5);
};

export const getStreamingPublicMarkets = (player: Player): StreamingPublicMarketsView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const seasonReviews = platform.cycleReviews.filter(review => review.kind === 'TWELVE_WEEK_REVIEW');
    const activeDirectors = platform.governance.directors.filter(director => director.status === 'ACTIVE');
    const trailing = getTrailingOperations(platform);
    const averagePlayback = trailing.length
        ? trailing.reduce((sum, item) => sum + item.playbackSuccessRate, 0) / trailing.length
        : 0;
    const trailingCash = trailing.reduce((sum, item) => sum + item.netCashContribution, 0);
    const valuation = getStreamingEquityValuation(platform);
    const debtRatio = platform.debtPrincipal / Math.max(1, valuation);
    const readiness: StreamingIpoReadinessItem[] = [
        {
            id: 'LIVE_HISTORY',
            label: 'Audited operating history',
            passed: Boolean(platform.launchCommit && seasonReviews.length >= 1),
            hardGate: true,
            value: `${seasonReviews.length} complete 12-week report${seasonReviews.length === 1 ? '' : 's'}`,
            requirement: 'Launch the service and complete one 12-week review.',
        },
        {
            id: 'CFO',
            label: 'Finance leadership',
            passed: hasActiveRole(platform, 'CFO'),
            hardGate: true,
            value: hasActiveRole(platform, 'CFO') ? 'CFO in office' : 'CFO seat vacant',
            requirement: 'Appoint a CFO before filing.',
        },
        {
            id: 'GOVERNANCE',
            label: 'Public-company governance',
            passed: activeDirectors.length >= 1 && platform.governance.boardConfidence >= 55,
            hardGate: false,
            value: `${activeDirectors.length} director${activeDirectors.length === 1 ? '' : 's'} • ${platform.governance.boardConfidence}/100 confidence`,
            requirement: 'At least one director and 55 board confidence.',
        },
        {
            id: 'SCALE',
            label: 'Investable audience scale',
            passed: platform.metrics.subscribers >= 500_000,
            hardGate: false,
            value: `${platform.metrics.subscribers.toLocaleString()} subscribers`,
            requirement: 'Reach 500,000 subscribers.',
        },
        {
            id: 'RELIABILITY',
            label: 'Delivery track record',
            passed: averagePlayback >= 97,
            hardGate: false,
            value: trailing.length ? `${averagePlayback.toFixed(2)}% trailing playback` : 'No live evidence',
            requirement: 'Maintain at least 97% trailing playback success.',
        },
        {
            id: 'FINANCE',
            label: 'Financeable balance sheet',
            passed: debtRatio <= 0.35 && (trailingCash >= 0 || platform.metrics.cashRunwayWeeks >= 16),
            hardGate: false,
            value: `${(debtRatio * 100).toFixed(1)}% debt / equity value`,
            requirement: 'Debt below 35% of equity value and a credible runway.',
        },
    ];
    const readinessScore = Math.round(readiness.filter(item => item.passed).length / readiness.length * 100);
    const hardGatesPassed = readiness.filter(item => item.hardGate).every(item => item.passed);
    const latestQuote = platform.publicCompany.quoteHistory.at(-1) || null;
    return {
        lifecycle: platform.publicCompany.lifecycle,
        readiness,
        readinessScore,
        canStartRoadshow: platform.publicCompany.lifecycle === 'PRIVATE' && hardGatesPassed && readinessScore >= 67,
        valuation,
        suggestedTicker: suggestTicker(platform.identity?.name || 'Streaming'),
        activeGuidance: [...platform.publicCompany.guidance].reverse().find(item => item.status === 'ACTIVE') || null,
        openVote: [...platform.publicCompany.shareholderVotes].reverse().find(item => item.status === 'OPEN') || null,
        activeActivist: [...platform.publicCompany.activistCampaigns].reverse().find(item => item.status === 'ACTIVE') || null,
        activeTakeover: [...platform.publicCompany.hostileTakeovers].reverse().find(item => item.status === 'ACTIVE') || null,
        latestQuote,
        latestEarnings: platform.publicCompany.earnings.at(-1) || null,
        boardIsBinding: platform.founderOwnershipPercent < 100,
    };
};

const publicLedger = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    key: string,
    type: OwnedStreamingLedgerEntry['type'],
    summary: string,
    metadata?: OwnedStreamingLedgerEntry['metadata'],
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type,
    summary,
    source: 'PLAYER_ACTION',
    metadata,
});

/* #189 (plan §22.4): the old roadshow (`startStreamingIpoRoadshow`, `listStreamingPlatform`) is gone: a company lists
   only through the listing's own commit below. The dev tools and audits list through `listStreamingCompanyForQa`. */

/**
 * Commits the graphics-first listing experience into the canonical company
 * ledger. The presentation may animate indicative values, but this boundary
 * owns the actual share issue, fees, dilution, treasury movement and first
 * quote. Replaying the last scene cannot mint the shares twice.
 */
export const commitStreamingCinematicIpo = (
    player: Player,
    input: StreamingCinematicIpoCommitInput,
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const view = getStreamingPublicMarkets({ ...player, ownedStreamingPlatform: platform });
    if (platform.publicCompany.lifecycle === 'PUBLIC' && platform.publicCompany.listing) {
        return { changed: false, player, reason: 'This platform is already public.' };
    }
    const activeJourney = platform.publicCompany.ipoJourney?.status === 'ACTIVE'
        ? platform.publicCompany.ipoJourney
        : null;
    if (!view.canStartRoadshow && !activeJourney) {
        return { changed: false, player, reason: 'IPO readiness requirements are not complete.' };
    }

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const ticker = input.ticker.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || view.suggestedTicker;
    const idempotencyKey = `ipo-cinematic-listing:${ticker}:${absoluteWeek}`;
    if (platform.finance.capitalActions.some(action => action.idempotencyKey === idempotencyKey)
        || platform.eventLedger.some(entry => entry.idempotencyKey === idempotencyKey)) {
        return { changed: false, player, reason: 'This listing was already committed.' };
    }

    const preIpoShares = Math.round(clamp(input.preIpoShares, 1_000_000, 1_000_000_000));
    /* #189: up to as many new shares as there were (a 50% float); the ask's dial offers 10–30% */
    const newShares = Math.round(clamp(input.newShares, 250_000, preIpoShares));
    const sharesOutstanding = preIpoShares + newShares;
    const offerPercent = roundPercent(newShares / sharesOutstanding * 100);
    const canonicalPrice = view.valuation / sharesOutstanding;
    const offerPrice = roundPrice(clamp(input.price, canonicalPrice * 0.5, canonicalPrice * 1.75));
    const employeeQuotaPercent = roundPercent(clamp(input.employeeQuotaPercent, 0, 8));
    const employeeShares = Math.round(newShares * employeeQuotaPercent / 100);
    const anchorShares = input.anchorDiscountAccepted ? Math.round(newShares * 0.1) : 0;
    const regularShares = Math.max(0, newShares - employeeShares - anchorShares);
    const grossProceeds = roundMoney(
        regularShares * offerPrice
        + employeeShares * offerPrice * 0.9
        + anchorShares * offerPrice * 0.96,
    );
    const feePercent = input.underwriterId === 'mc' ? 7 : input.underwriterId === 'hf' ? 3.5 : 5;
    const netProceeds = roundMoney(grossProceeds * (1 - feePercent / 100));
    const ownershipMultiplier = preIpoShares / sharesOutstanding;
    const founderOwnershipAfter = roundPercent(platform.founderOwnershipPercent * ownershipMultiplier);
    const marks = Array.from(new Set(input.governanceMarks.map(mark => mark.trim()).filter(Boolean))).slice(0, 8);
    const bookCoverage = Math.round(clamp(input.bookCoverage, 0.2, 12) * 100) / 100;
    const demandScore = roundPercent(clamp(38 + bookCoverage * 19 - marks.length * 4 + (input.firmBook ? 5 : -7), 15, 99));
    const rng = createDeterministicRng(`${platform.simulationSeed}:cinematic-ipo:${absoluteWeek}:${ticker}`);
    const markPenalty = marks.length * 0.018;
    const coverageMove = clamp((bookCoverage - 1) * 0.055, -0.09, 0.16);
    const shoeFloor = input.firmBook ? -0.035 : -0.12;
    const closeMove = clamp(coverageMove - markPenalty + (rng() - 0.5) * 0.025, shoeFloor, 0.24);
    const firstClose = roundPrice(offerPrice * (1 + closeMove));

    const plan = {
        ticker,
        venueName: 'Empire Exchange',
        narrative: input.narrative,
        offerPercent,
        targetCapital: grossProceeds,
        lowPrice: roundPrice(offerPrice * 0.92),
        highPrice: roundPrice(offerPrice * 1.08),
        institutionalDemandScore: demandScore,
        retailDemandScore: roundPercent(clamp(demandScore + (rng() - 0.5) * 12, 10, 99)),
        roadshowStops: ['Valuation Committee', 'Regulatory Review', 'Anchor Book', 'Investor Interview'],
        startedAtAbsoluteWeek: activeJourney?.startedAtAbsoluteWeek
            ?? Math.max(0, absoluteWeek - Math.max(0, Math.round(input.diligenceWeeks))),
    };
    const listing = {
        listedAtAbsoluteWeek: absoluteWeek,
        ticker,
        venueName: plan.venueName,
        offerPercent,
        sharesOutstanding,
        publicShares: newShares,
        offerPrice,
        capitalRaised: netProceeds,
        founderOwnershipBefore: platform.founderOwnershipPercent,
        founderOwnershipAfter,
        preIpoShares,
        newShares,
        employeeQuotaPercent,
        underwriterId: input.underwriterId,
        underwriterName: input.underwriterName,
        firmBook: input.firmBook,
        bookCoverage,
        anchorDiscountAccepted: input.anchorDiscountAccepted,
        governanceMarks: marks,
        diligenceWeeks: Math.max(0, Math.round(input.diligenceWeeks)),
        regulatorAttempts: Math.max(1, Math.round(input.regulatorAttempts)),
    };
    const quote: OwnedStreamingMarketQuote = {
        id: createDeterministicId('streaming_quote', platform.simulationSeed, absoluteWeek),
        absoluteWeek,
        open: offerPrice,
        high: roundPrice(Math.max(offerPrice, firstClose) * (1.01 + rng() * 0.018)),
        low: roundPrice(Math.min(offerPrice, firstClose) * (0.975 + rng() * 0.015)),
        close: firstClose,
        volume: Math.round(newShares * clamp(0.2 + bookCoverage * 0.09, 0.2, 0.8)),
        marketCap: roundMoney(firstClose * sharesOutstanding),
        changePercent: roundPercent((firstClose / offerPrice - 1) * 100),
        drivers: [
            `${bookCoverage.toFixed(2)}x book coverage`,
            input.firmBook ? 'Firm underwriting and greenshoe' : 'Best-efforts underwriting',
            ...(marks.length ? [`${marks.length} governance mark${marks.length === 1 ? '' : 's'}`] : ['Clean governance record']),
            ...(input.anchorDiscountAccepted ? ['Discounted anchor order'] : []),
        ].slice(0, 4),
    };
    const roadshowLedger = publicLedger(
        platform,
        absoluteWeek,
        `ipo-cinematic-roadshow:${ticker}:${absoluteWeek}`,
        'IPO_ROADSHOW_STARTED',
        `${platform.identity?.name || 'The platform'} took a ${formatPublicMoney(offerPrice * sharesOutstanding)} valuation through the public process.`,
        { ticker, sharesOutstanding, newShares, marks: marks.length },
    );
    const listingLedger = publicLedger(
        platform,
        absoluteWeek,
        idempotencyKey,
        'IPO_LISTED',
        `${platform.identity?.name || 'The platform'} listed as ${ticker} at $${offerPrice.toFixed(2)} and raised ${formatPublicMoney(netProceeds)} after fees.`,
        { ticker, offerPrice, netProceeds, founderOwnershipAfter, bookCoverage },
    );
    let nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        founderOwnershipPercent: founderOwnershipAfter,
        treasuryCash: platform.treasuryCash + netProceeds,
        governance: {
            ...platform.governance,
            boardConfidence: Math.round(clamp(platform.governance.boardConfidence + (marks.length ? -marks.length * 5 : 4), 0, 100)),
        },
        finance: {
            ...platform.finance,
            equityHolders: [
                ...platform.finance.equityHolders.map(holder => ({
                    ...holder,
                    ownershipPercent: roundPercent(holder.ownershipPercent * ownershipMultiplier),
                })),
                {
                    id: createDeterministicId('streaming_equity', platform.simulationSeed, 'public-float'),
                    holderName: 'Public shareholder float',
                    ownershipPercent: offerPercent,
                    investedCapital: netProceeds,
                    issuedAtAbsoluteWeek: absoluteWeek,
                },
            ],
            capitalActions: [
                ...platform.finance.capitalActions,
                {
                    id: createDeterministicId('streaming_capital', platform.simulationSeed, idempotencyKey),
                    idempotencyKey,
                    type: 'EQUITY_ISSUANCE',
                    absoluteWeek,
                    amount: netProceeds,
                    treasuryDelta: netProceeds,
                    personalCashDelta: 0,
                    debtDelta: 0,
                    ownershipBefore: platform.founderOwnershipPercent,
                    ownershipAfter: founderOwnershipAfter,
                },
            ],
        },
        publicCompany: {
            ...platform.publicCompany,
            lifecycle: 'PUBLIC',
            ipoPlan: plan,
            ipoJourney: activeJourney ? { ...activeJourney, status: 'COMPLETED', updatedAtAbsoluteWeek: absoluteWeek, lastProcessedAbsoluteWeek: absoluteWeek } : null,
            listing,
            quoteHistory: [...platform.publicCompany.quoteHistory, quote],
        },
        eventLedger: [...platform.eventLedger, roadshowLedger, listingLedger],
        milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'streaming-ipo-listed'])),
    }, player.id);
    nextPlatform = queueOwnedStreamingCinematic(nextPlatform, {
        idempotencyKey: `ipo-listing:${ticker}:${absoluteWeek}`,
        type: 'IPO_LISTING',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: absoluteWeek,
        title: `${ticker} Listing Day`,
        factIds: [roadshowLedger.id, listingLedger.id],
    });
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

/** #188: what a promise of each kind would set, from the last 12 weeks (MARKETS shows it before you promise). The
 *  revenue is the plans' alone, as the report measures it (product revenue no longer inflates the target). */
export const previewStreamingGuidance = (platform: OwnedStreamingPlatformState, tone: StreamingGuidanceTone) => {
    const multiplier = tone === 'CONSERVATIVE' ? 0.96 : tone === 'AMBITIOUS' ? 1.12 : 1.04;
    const operations = getTrailingOperations(platform);
    const trailingRevenue = operations.reduce((sum, item) => sum + item.subscriptionRevenue, 0);
    const trailingCash = operations.reduce((sum, item) => sum + item.netCashContribution, 0);
    const playback = operations.length ? operations.reduce((sum, item) => sum + item.playbackSuccessRate, 0) / operations.length : 97;
    return {
        subscriberTarget: Math.round(platform.metrics.subscribers * multiplier),
        revenueTarget: Math.round(Math.max(1, trailingRevenue) * multiplier),
        cashContributionTarget: Math.round(trailingCash >= 0 ? trailingCash * multiplier : trailingCash * (2 - multiplier)),
        playbackTarget: roundPercent(clamp(playback + (tone === 'AMBITIOUS' ? 0.3 : tone === 'CONSERVATIVE' ? -0.2 : 0), 95, 99.95)),
    };
};

export const issueStreamingPublicGuidance = (
    player: Player,
    tone: StreamingGuidanceTone,
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.publicCompany.lifecycle !== 'PUBLIC') return { changed: false, player, reason: 'The platform is still private.' };
    if (platform.publicCompany.guidance.some(item => item.status === 'ACTIVE')) return { changed: false, player, reason: 'Active guidance already covers the next report.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextCycle = (platform.cycleReviews.filter(item => item.kind === 'TWELVE_WEEK_REVIEW').at(-1)?.cycleNumber || 0) + 1;
    const guidance: OwnedStreamingPublicGuidance = {
        id: createDeterministicId('streaming_guidance', platform.simulationSeed, nextCycle),
        cycleNumber: nextCycle,
        tone,
        issuedAtAbsoluteWeek: absoluteWeek,
        ...previewStreamingGuidance(platform, tone),
        status: 'ACTIVE',
    };
    const ledger = publicLedger(platform, absoluteWeek, `public-guidance:${guidance.id}`, 'PUBLIC_GUIDANCE_ISSUED', `${tone.toLowerCase()} guidance issued for public quarter ${nextCycle}.`, { cycleNumber: nextCycle });
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        publicCompany: { ...platform.publicCompany, guidance: [...platform.publicCompany.guidance, guidance] },
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

export const castStreamingShareholderVote = (
    player: Player,
    voteId: string,
    founderVote: 'FOR' | 'AGAINST',
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const vote = platform.publicCompany.shareholderVotes.find(item => item.id === voteId && item.status === 'OPEN');
    if (!vote) return { changed: false, player, reason: 'That vote is no longer open.' };
    /* #173: the same settlement as the public's: the board's confidence, the price at the next quote, executive pay */
    const nextPlatform = compactOwnedStreamingPlatformForPersistence(
        settleShareholderVote(platform, vote, founderVote, getAbsoluteWeek(player.age, player.currentWeek)), player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

export const respondToStreamingActivist = (
    player: Player,
    campaignId: string,
    response: 'ENGAGE' | 'REFUSE' | 'ACCEPT',
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const campaign = platform.publicCompany.activistCampaigns.find(item => item.id === campaignId && item.status === 'ACTIVE');
    if (!campaign) return { changed: false, player, reason: 'No active campaign matches this decision.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const cost = response === 'ENGAGE' ? 2_500_000 : response === 'ACCEPT' ? 7_500_000 : 1_000_000;
    if (platform.treasuryCash < cost) return { changed: false, player, reason: 'The company treasury cannot fund that response.' };
    const status = response === 'ENGAGE' ? 'NEGOTIATED' : response === 'ACCEPT' ? 'ACCEPTED' : 'DEFEATED';
    const consequence = response === 'ENGAGE'
        ? 'A negotiated operating review lowers pressure without surrendering the company strategy.'
        : response === 'ACCEPT'
            ? 'The activist demand becomes a board mandate; confidence improves but founder freedom narrows.'
            : 'The board backs the founder, but unresolved shareholders remain more willing to hear a bidder.';
    const ledger = publicLedger(platform, absoluteWeek, `activist-response:${campaign.id}`, 'ACTIVIST_CAMPAIGN_RESOLVED', consequence, { response, cost });
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        governance: { ...platform.governance, boardConfidence: Math.round(clamp(platform.governance.boardConfidence + (response === 'ACCEPT' ? 5 : response === 'ENGAGE' ? 2 : -4), 0, 100)) },
        publicCompany: {
            ...platform.publicCompany,
            activistCampaigns: platform.publicCompany.activistCampaigns.map(item => item.id === campaign.id ? {
                ...item, response, status, resolvedAtAbsoluteWeek: absoluteWeek, consequence,
            } : item),
        },
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

export const resolveStreamingHostileTakeover = (
    player: Player,
    takeoverId: string,
    defence: StreamingTakeoverDefence,
): StreamingPublicMarketActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const takeover = platform.publicCompany.hostileTakeovers.find(item => item.id === takeoverId && item.status === 'ACTIVE');
    if (!takeover) return { changed: false, player, reason: 'There is no active tender battle to resolve.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const costs: Record<StreamingTakeoverDefence, number> = {
        INDEPENDENCE_CAMPAIGN: 12_000_000,
        WHITE_KNIGHT: 6_000_000,
        RIGHTS_PLAN: 9_000_000,
        NEGOTIATE: 2_000_000,
    };
    const cost = costs[defence];
    if (platform.treasuryCash < cost) return { changed: false, player, reason: 'The company treasury cannot fund this defence.' };
    const defenceScore = platform.governance.boardConfidence * 0.45
        + platform.founderOwnershipPercent * 0.35
        + (defence === 'RIGHTS_PLAN' ? 18 : defence === 'INDEPENDENCE_CAMPAIGN' ? 14 : defence === 'WHITE_KNIGHT' ? 10 : 2);
    const defended = defence !== 'NEGOTIATE' && defenceScore >= takeover.bidderSupportPercent;
    const status = defence === 'NEGOTIATE' ? 'SETTLED' : defended ? 'DEFENDED' : 'SETTLED';
    const ownershipAfter = status === 'SETTLED'
        ? roundPercent(Math.max(20, platform.founderOwnershipPercent * 0.78))
        : platform.founderOwnershipPercent;
    const consequence = status === 'DEFENDED'
        ? 'The bid is defeated. Independence survives, with the board demanding a credible next quarter.'
        : 'A strategic settlement prevents game-over: the founder remains CEO, but loses voting control under a binding recovery mandate.';
    const ledger = publicLedger(platform, absoluteWeek, `takeover-defence:${takeover.id}`, 'HOSTILE_TAKEOVER_DEFENDED', consequence, { defence, status, cost });
    let nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        founderOwnershipPercent: ownershipAfter,
        governance: { ...platform.governance, boardConfidence: Math.round(clamp(platform.governance.boardConfidence + (status === 'DEFENDED' ? 6 : -10), 0, 100)) },
        publicCompany: {
            ...platform.publicCompany,
            hostileTakeovers: platform.publicCompany.hostileTakeovers.map(item => item.id === takeover.id ? {
                ...item, defence, status, resolvedAtAbsoluteWeek: absoluteWeek, consequence,
            } : item),
        },
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    nextPlatform = queueOwnedStreamingCinematic(nextPlatform, {
        idempotencyKey: `hostile-defence:${takeover.id}`,
        type: 'HOSTILE_TAKEOVER_DEFENCE',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: absoluteWeek,
        title: `${takeover.bidderName} Tender Battle`,
        factIds: [ledger.id],
    });
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

/**
 * A quarter's score against what the market expected: the guidance when there is one; otherwise (#185) the trend
 * carried on (the last quarter's growth and cash), or a small step up for a first quarter. So a quarter that only
 * stays in the black is not a free BEAT.
 */
export const scoreStreamingQuarter = (
    platform: OwnedStreamingPlatformState,
    review: OwnedStreamingPlatformState['cycleReviews'][number],
) => {
    const publicCompany = platform.publicCompany;
    const guidance = publicCompany.guidance.find(item => item.status === 'ACTIVE' && item.cycleNumber === review.cycleNumber) || null;
    /* #185: without guidance the market expects the trend to carry on (the last quarter's growth and cash), so a quarter
       that only stays in the black is no longer a free BEAT; with no quarter before it, it expects a small step up */
    const previousQuarter = [...platform.cycleReviews].reverse().find(item => item.kind === 'TWELVE_WEEK_REVIEW' && item.cycleNumber < review.cycleNumber) || null;
    const trend = previousQuarter ? clamp(previousQuarter.subscriberEnd / Math.max(1, previousQuarter.subscriberStart), 0.8, 1.5) : 1.03;
    const subscriberTarget = guidance?.subscriberTarget || Math.max(1, Math.round(review.subscriberStart * trend));
    const revenueTarget = guidance?.revenueTarget || Math.max(1, previousQuarter ? Math.round(previousQuarter.totalSubscriptionRevenue * trend) : review.totalSubscriptionRevenue);
    const cashTarget = guidance?.cashContributionTarget ?? (previousQuarter ? previousQuarter.totalCashContribution : review.totalCashContribution);
    const playbackTarget = guidance?.playbackTarget || 97;
    const subscriberScore = clamp(review.subscriberEnd / subscriberTarget, 0, 1.4);
    const revenueScore = clamp(review.totalSubscriptionRevenue / revenueTarget, 0, 1.4);
    const cashScore = cashTarget >= 0
        ? clamp((review.totalCashContribution + Math.max(1, cashTarget)) / (Math.max(1, cashTarget) * 2), 0, 1.4)
        : review.totalCashContribution >= cashTarget ? 1 : 0.65;
    const playbackScore = clamp(review.averagePlaybackSuccessRate / playbackTarget, 0, 1.1);
    const score = roundPercent((subscriberScore * 28 + revenueScore * 28 + cashScore * 24 + playbackScore * 20));
    const outcome: OwnedStreamingEarningsRecord['outcome'] = score >= 103 ? 'BEAT' : score < 88 ? 'MISS' : 'MIXED';
    const stockReactionPercent = roundPercent(clamp((score - 95) * 0.22, -12, 12));
    return {
        guidance,
        targets: { subscribers: subscriberTarget, revenue: revenueTarget, cash: cashTarget, playback: playbackTarget },
        score,
        outcome,
        stockReactionPercent,
    };
};

const buildQuarterEvents = (
    platform: OwnedStreamingPlatformState,
    review: OwnedStreamingPlatformState['cycleReviews'][number],
): Pick<OwnedStreamingPlatformState['publicCompany'], 'guidance' | 'earnings' | 'shareholderVotes' | 'activistCampaigns' | 'hostileTakeovers'> & { ledger: OwnedStreamingLedgerEntry[] } => {
    const publicCompany = platform.publicCompany;
    if (review.kind !== 'TWELVE_WEEK_REVIEW' || publicCompany.earnings.some(item => item.cycleNumber === review.cycleNumber)) {
        return { ...publicCompany, ledger: [] };
    }
    const { guidance, score, outcome, stockReactionPercent } = scoreStreamingQuarter(platform, review);
    const earnings: OwnedStreamingEarningsRecord = {
        id: createDeterministicId('streaming_earnings', platform.simulationSeed, review.cycleNumber),
        cycleNumber: review.cycleNumber,
        reportedAtAbsoluteWeek: review.endAbsoluteWeek,
        guidanceId: guidance?.id || null,
        outcome,
        score,
        subscriberActual: review.subscriberEnd,
        revenueActual: review.totalSubscriptionRevenue,
        cashContributionActual: review.totalCashContribution,
        playbackActual: review.averagePlaybackSuccessRate,
        stockReactionPercent,
        headline: outcome === 'BEAT' ? 'The quarter cleared expectations.' : outcome === 'MISS' ? 'The quarter missed its public promise.' : 'The quarter split the verdict.',
    };
    const voteTypes = ['DIRECTOR_MANDATE', 'EXECUTIVE_PAY', 'CAPITAL_AUTHORITY', 'STRATEGIC_REVIEW'] as const;
    const type = voteTypes[(review.cycleNumber - 1) % voteTypes.length];
    const vote: OwnedStreamingShareholderVote = {
        id: createDeterministicId('streaming_vote', platform.simulationSeed, review.cycleNumber),
        cycleNumber: review.cycleNumber,
        type,
        title: type === 'DIRECTOR_MANDATE' ? 'Independent director mandate' : type === 'EXECUTIVE_PAY' ? 'Executive compensation resolution' : type === 'CAPITAL_AUTHORITY' ? 'New capital authority' : 'Strategic performance review',
        summary: 'Public holders vote on the next company mandate; founder voting power follows actual ownership.',
        status: 'OPEN',
        createdAtAbsoluteWeek: review.endAbsoluteWeek,
        dueAtAbsoluteWeek: review.endAbsoluteWeek + 3,
        institutionalSupport: roundPercent(clamp(48 + (score - 90) * 0.45 + platform.governance.boardConfidence * 0.12, 20, 86)),
        founderVote: null,
        finalSupport: null,
        consequence: null,
    };
    const hasActiveActivist = publicCompany.activistCampaigns.some(item => item.status === 'ACTIVE');
    const demandOptions: StreamingActivistDemand[] = ['MARGIN_DISCIPLINE', 'SLATE_REFRESH', 'BOARD_SEAT', 'ASSET_REVIEW'];
    const activist = STREAMING_ACTIVISM_ENABLED && outcome === 'MISS' && !hasActiveActivist ? {
        id: createDeterministicId('streaming_activist', platform.simulationSeed, review.cycleNumber),
        investorName: ['Northstar Capital', 'Aperture Partners', 'Beacon Value Fund'][review.cycleNumber % 3],
        ownershipPercent: roundPercent(clamp(3.2 + (100 - score) / 8, 3, 9.5)),
        demand: demandOptions[review.cycleNumber % demandOptions.length],
        status: 'ACTIVE' as const,
        pressure: roundPercent(clamp(52 + (90 - score), 40, 92)),
        openedAtAbsoluteWeek: review.endAbsoluteWeek,
        resolvedAtAbsoluteWeek: null,
        response: null,
        consequence: null,
    } : null;
    const latestQuote = publicCompany.quoteHistory.at(-1);
    const hasActiveTakeover = publicCompany.hostileTakeovers.some(item => item.status === 'ACTIVE');
    const rival = [...platform.competitiveWorld.rivals].sort((a, b) => b.aggression - a.aggression)[0];
    const takeover = activist && platform.founderOwnershipPercent < 51 && rival && !hasActiveTakeover ? {
        id: createDeterministicId('streaming_takeover', platform.simulationSeed, review.cycleNumber),
        bidderPlatformId: rival.platformId,
        bidderName: rival.platformName,
        offerPrice: roundPrice((latestQuote?.close || platform.publicCompany.listing?.offerPrice || 10) * 1.28),
        premiumPercent: 28,
        bidderSupportPercent: roundPercent(clamp(42 + activist.pressure * 0.22 + rival.aggression * 0.18, 42, 78)),
        status: 'ACTIVE' as const,
        openedAtAbsoluteWeek: review.endAbsoluteWeek,
        resolvedAtAbsoluteWeek: null,
        defence: null,
        consequence: null,
    } : null;
    const ledger: OwnedStreamingLedgerEntry[] = [{
        ...publicLedger(platform, review.endAbsoluteWeek, `public-earnings:${earnings.id}`, 'PUBLIC_EARNINGS_REPORTED', earnings.headline, { cycleNumber: review.cycleNumber, score, outcome }),
        source: 'WEEK_PROCESSOR',
    }];
    if (takeover) ledger.push({
        ...publicLedger(platform, review.endAbsoluteWeek, `hostile-opened:${takeover.id}`, 'HOSTILE_TAKEOVER_OPENED', `${takeover.bidderName} opened a hostile tender at a ${takeover.premiumPercent}% premium.`, { bidderSupportPercent: takeover.bidderSupportPercent }),
        source: 'WEEK_PROCESSOR',
    });
    return {
        guidance: publicCompany.guidance.map(item => item.id === guidance?.id ? { ...item, status: 'RESOLVED' as const } : item),
        earnings: [...publicCompany.earnings, earnings],
        shareholderVotes: [...publicCompany.shareholderVotes, vote],
        activistCampaigns: activist ? [...publicCompany.activistCampaigns, activist] : publicCompany.activistCampaigns,
        hostileTakeovers: takeover ? [...publicCompany.hostileTakeovers, takeover] : publicCompany.hostileTakeovers,
        ledger,
    };
};

export const commitStreamingPublicMarketWeek = (
    value: OwnedStreamingPlatformState,
    player: Player,
    snapshot: OwnedStreamingWeeklySnapshot,
): OwnedStreamingPlatformState => {
    let platform = normalizeOwnedStreamingPlatformState(value, player.id);
    const activeJourney = platform.publicCompany.ipoJourney?.status === 'ACTIVE'
        ? platform.publicCompany.ipoJourney
        : null;
    if (activeJourney && snapshot.absoluteWeek > activeJourney.lastProcessedAbsoluteWeek) {
        platform = compactOwnedStreamingPlatformForPersistence({
            ...platform,
            publicCompany: {
                ...platform.publicCompany,
                ipoJourney: {
                    ...activeJourney,
                    updatedAtAbsoluteWeek: snapshot.absoluteWeek,
                    lastProcessedAbsoluteWeek: snapshot.absoluteWeek,
                },
            },
        }, player.id);
    }
    if (platform.publicCompany.lifecycle !== 'PUBLIC' || !platform.publicCompany.listing) return platform;
    const listing = platform.publicCompany.listing;
    if (platform.publicCompany.quoteHistory.some(item => item.absoluteWeek === snapshot.absoluteWeek)) return platform;
    /* #173: a resolution past its due week closes: unanswered, the public decides */
    platform.publicCompany.shareholderVotes
        .filter(vote => vote.status === 'OPEN' && vote.dueAtAbsoluteWeek < snapshot.absoluteWeek)
        .forEach(vote => { platform = settleShareholderVote(platform, vote, null, snapshot.absoluteWeek); });
    /* #173: what decided votes and earnings calls move reaches this week's quote */
    const voteNudge = platform.publicCompany.shareholderVotes
        .filter(vote => vote.status !== 'OPEN' && typeof vote.priceEffectPercent === 'number' && vote.priceAppliedAtAbsoluteWeek === null)
        .reduce((sum, vote) => sum + (vote.priceEffectPercent || 0), 0);
    const callNudge = platform.publicCompany.earnings
        .filter(item => typeof item.callHeldAtAbsoluteWeek === 'number' && (item.callAppliedAtAbsoluteWeek === null || item.callAppliedAtAbsoluteWeek === undefined))
        .reduce((sum, item) => sum + (item.callEffectPercent || 0), 0);
    platform = {
        ...platform,
        publicCompany: {
            ...platform.publicCompany,
            shareholderVotes: platform.publicCompany.shareholderVotes.map(vote => (vote.status !== 'OPEN' && typeof vote.priceEffectPercent === 'number' && vote.priceAppliedAtAbsoluteWeek === null
                ? { ...vote, priceAppliedAtAbsoluteWeek: snapshot.absoluteWeek } : vote)),
            earnings: platform.publicCompany.earnings.map(item => (typeof item.callHeldAtAbsoluteWeek === 'number' && (item.callAppliedAtAbsoluteWeek === null || item.callAppliedAtAbsoluteWeek === undefined)
                ? { ...item, callAppliedAtAbsoluteWeek: snapshot.absoluteWeek } : item)),
        },
    };
    const previous = platform.publicCompany.quoteHistory.at(-1);
    const previousClose = previous?.close || listing.offerPrice;
    const operations = snapshot.operations;
    /* #185: members, cash and debt reach the price through the company's value (the valuation engine); what is left here
       are the week's events: reliability, incidents, trust, oversight, governance, results, votes and calls */
    const reliabilitySignal = operations ? clamp((operations.playbackSuccessRate - 97.5) / 100, -0.04, 0.02) : 0;
    const crisis = [...platform.crisisSecurity.crises].reverse().find(item => item.stage !== 'RESOLVED') || null;
    const crisisSignal = crisis
        ? -(crisis.severity === 'CRITICAL' ? 0.09 : crisis.severity === 'MAJOR' ? 0.065 : crisis.severity === 'SERIOUS' ? 0.04 : 0.02)
        : 0;
    const trustSignal = clamp((platform.crisisSecurity.publicTrust - 70) / 900, -0.035, 0.025);
    const oversightSignal = -clamp(
        (platform.crisisSecurity.regulatoryScrutiny + platform.crisisSecurity.evidenceTrail) / 3_500,
        0,
        0.05,
    );
    const governanceMarkSignal = -clamp((listing.governanceMarks?.length || 0) * 0.006, 0, 0.04);
    const latestReview = platform.cycleReviews.find(item => item.endAbsoluteWeek === snapshot.absoluteWeek && item.kind === 'TWELVE_WEEK_REVIEW');
    const quarterEvents = latestReview ? buildQuarterEvents(platform, latestReview) : null;
    /* #173: only in a review's week (with no review both sides were undefined and the close threw every other week) */
    const earningsReaction = latestReview && quarterEvents && quarterEvents.earnings.at(-1)?.cycleNumber === latestReview.cycleNumber
        ? quarterEvents.earnings.at(-1)!.stockReactionPercent / 100
        : 0;
    const rng = createDeterministicRng(`${platform.simulationSeed}:public-quote:${snapshot.absoluteWeek}`);
    /* the standing signals (reliability, an open incident, trust, oversight, governance marks) price the share above or
       below its value for as long as they last; the one-off events (results, votes, calls) move it in their week */
    const standing = reliabilitySignal + crisisSignal + trustSignal + oversightSignal + governanceMarkSignal;
    /* #187: a running buyback is a buyer in the market: a small lift in each of its weeks */
    const buyback = streamingBuybackTranche(platform);
    /* #191: a new chief executive since the last quote: the market's view of them, −5% to +5% by their skill */
    const lastQuoteWeek = previous?.absoluteWeek ?? -1;
    const successorFact = [...platform.eventLedger].reverse().find(entry => entry.type === 'SUCCESSOR_APPOINTED'
        && entry.absoluteWeek > lastQuoteWeek && entry.absoluteWeek <= snapshot.absoluteWeek);
    const successor = successorFact ? platform.leadership.appointments.find(item => item.executiveId === successorFact.metadata?.executiveId) : null;
    const successorMove = successor ? clamp((successor.skill - 60) / 800, -0.05, 0.05) : 0;
    const fairPerShare = getStreamingEquityValuation(platform) / Math.max(1, listing.sharesOutstanding) * (1 + standing);
    const step = nextSharePrice({
        previous: previousClose,
        fair: fairPerShare,
        lastMove: (previous?.changePercent || 0) / 100,
        sector: 'MEDIA',
        absoluteWeek: snapshot.absoluteWeek,
        events: earningsReaction + (voteNudge + callNudge) / 100 + (buyback ? 0.004 * buyback.percent : 0) + successorMove,
        volatility: 0.03,
        seed: `${platform.simulationSeed}:public-quote`,
    });
    const move = step.move;
    const close = roundPrice(step.price);
    const open = roundPrice(previousClose * (1 + (rng() - 0.5) * 0.018));
    const quote: OwnedStreamingMarketQuote = {
        id: createDeterministicId('streaming_quote', platform.simulationSeed, snapshot.absoluteWeek),
        absoluteWeek: snapshot.absoluteWeek,
        open,
        high: roundPrice(Math.max(open, close) * (1.01 + rng() * 0.02)),
        low: roundPrice(Math.min(open, close) * (0.97 + rng() * 0.02)),
        close,
        volume: Math.round(listing.publicShares * (0.025 + rng() * 0.08 + Math.abs(move) * 0.4)),
        marketCap: roundMoney(close * listing.sharesOutstanding),
        changePercent: roundPercent((close / previousClose - 1) * 100),
        drivers: [
            /* #173: what moved this week in particular comes first */
            ...(callNudge ? ['The earnings call'] : []),
            ...(voteNudge ? ['A shareholder vote'] : []),
            ...(buyback ? ['The company buying back shares'] : []),
            ...(successor ? ['A new chief executive'] : []),
            /* #185: the pull towards what the company is worth */
            ...(step.pull >= 0.01 ? ['Priced below its value'] : step.pull <= -0.01 ? ['Priced above its value'] : []),
            snapshot.netSubscriberMovement >= 0 ? 'Subscriber momentum' : 'Subscriber pressure',
            operations && operations.netCashContribution >= 0 ? 'Cash contribution' : 'Cash burn',
            operations && operations.playbackSuccessRate >= 98 ? 'Playback trust' : 'Reliability watch',
            ...(crisis ? [`Incident: ${crisis.severity.toLowerCase()}`] : []),
            ...(platform.crisisSecurity.regulatoryScrutiny >= 45 ? ['Regulatory pressure'] : []),
            ...(platform.crisisSecurity.publicTrust >= 80 ? ['Public trust advantage'] : []),
            ...(listing.governanceMarks?.length ? ['Governance marks remain priced'] : []),
            ...(earningsReaction ? ['Performance versus guidance'] : []),
        ].slice(0, 4),
    };
    const quarterState = quarterEvents ? {
        guidance: quarterEvents.guidance,
        earnings: quarterEvents.earnings,
        shareholderVotes: quarterEvents.shareholderVotes,
        activistCampaigns: quarterEvents.activistCampaigns,
        hostileTakeovers: quarterEvents.hostileTakeovers,
    } : {};
    platform = {
        ...platform,
        publicCompany: {
            ...platform.publicCompany,
            quoteHistory: [...platform.publicCompany.quoteHistory, quote],
            ...quarterState,
        },
        eventLedger: [...platform.eventLedger, ...(quarterEvents?.ledger || [])],
    };
    /* #187: this week's part of a buyback, bought at the week's close */
    platform = settleStreamingBuybackWeek(platform, snapshot.absoluteWeek, close);
    return compactOwnedStreamingPlatformForPersistence(platform, player.id);
};
