import { streamingPlusLocks } from './streamingPlusPack';
/**
 * #173 (plan §21.17): the Boardroom's MARKETS, read from the public markets' own state.
 *
 * Before listing: the six gates as steps, each naming the room that clears it; "Your listing" (#189: the proposed
 * ticker, and what a 10–30% float would raise and leave you, as the listing's ask offers); Ring the bell (25⚡) once
 * the gates allow it.
 * After listing: the share price and its line, your stake's value, the quarter's guidance and who set it, the last
 * report with its optional earnings call (10⚡), and the open shareholder vote with its due week.
 *
 * #188 (plan §22.3 point 12): MARKETS is the one home for the stock. From the old Public markets desk: the promise
 * for the next report (three kinds, each showing what it would set), the earlier reports and votes, and the share
 * register; and from #185, what a share is worth and this week's reasons for the price.
 */
import { getStreamingDividendView, type StreamingDividendView } from './streamingYourMoney';
import type { Player, StreamingGuidanceTone } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import {
    STREAMING_EARNINGS_CALL_ENERGY,
    STREAMING_EARNINGS_CALL_WEEKS,
    STREAMING_IPO_BELL_ENERGY,
    getStreamingEquityValuation,
    getStreamingPublicMarkets,
    previewStreamingGuidance,
    type StreamingIpoReadinessItem,
} from './streamingPublicMarkets';
import { getStreamingQuarterSeasonCycle } from './streamingQuarterSeason';

export type StreamingListingRoom = 'MONEY' | 'TEAM' | 'OWNERSHIP' | 'AUDIENCE' | 'STATUS';

/** the room that clears each gate */
const GATE_ROOMS: Record<StreamingIpoReadinessItem['id'], { room: StreamingListingRoom; where: string }> = {
    LIVE_HISTORY: { room: 'MONEY', where: "the board's 12-week review, on MONEY" },
    CFO: { room: 'TEAM', where: 'the Money chair, on TEAM' },
    GOVERNANCE: { room: 'OWNERSHIP', where: 'Find a director, on OWNERSHIP' },
    SCALE: { room: 'AUDIENCE', where: 'campaigns and markets, in Audience' },
    RELIABILITY: { room: 'STATUS', where: 'playback, on Platform › STATUS' },
    FINANCE: { room: 'MONEY', where: 'debt and runway, on MONEY' },
};

/** a listing sells new shares a little under what the company is worth */
const IPO_DISCOUNT = 0.15;
/** #189: the float the listing's ask offers (the float is chosen only there; #215: the ticker on MARKETS too) */
export const STREAMING_LISTING_FLOAT_RANGE = [10, 30] as const;

/** #188: the three promises for the next report */
const GUIDANCE_TONES: Array<{ tone: StreamingGuidanceTone; label: string; risk: string }> = [
    { tone: 'CONSERVATIVE', label: 'Conservative', risk: 'Easy to beat; a small cheer' },
    { tone: 'BALANCED', label: 'Balanced', risk: 'Believable; a fair reward' },
    { tone: 'AMBITIOUS', label: 'Ambitious', risk: 'A big story; a miss hurts' },
];

export interface StreamingListingDeskView {
    listed: boolean;
    /** #209: what a share pays each quarter */
    dividend: StreamingDividendView | null;
    gates: Array<StreamingIpoReadinessItem & { room: StreamingListingRoom; where: string }>;
    cleared: number;
    /** the bell can be rung: the hard gates and two thirds of the rest */
    ready: boolean;
    /** a listing already under way: the bell resumes it, for no energy */
    resume: boolean;
    /** Streaming+: listing is the pack's; the road is shown whole, the bell opens the pack's sheet */
    streamingPlus: boolean;
    bellEnergy: number;
    valuation: number;
    ticker: string;
    /** #215: the company's name, for the symbols it could take, while the symbol is still yours to choose */
    tickerFrom: string | null;
    founderPercent: number;
    /** #189: what a 10% and a 30% float would raise, and the stake each leaves you; the listing's ask picks within */
    range: { low: { percent: number; raise: number; keep: number }; high: { percent: number; raise: number; keep: number } };
    share: null | {
        ticker: string;
        price: number;
        changePercent: number;
        history: number[];
        marketCap: number;
        stakePercent: number;
        stakeValue: number;
        /** #188: what a share is worth by the valuation engine, and this week's reasons for the price */
        valuePerShare: number;
        drivers: string[];
    };
    guidance: null | { cycleNumber: number; tone: string; subscriberTarget: number; revenueTarget: number; cashTarget: number; playbackTarget: number; setBy: string | null };
    /** #188: weeks to the next 12-week report */
    nextReportInWeeks: number;
    /** #188: with no promise yet, the three promises and what each would set */
    guidanceOptions: Array<{ tone: StreamingGuidanceTone; label: string; risk: string; subscriberTarget: number; revenueTarget: number }>;
    /** #188: the reports before the last, newest first */
    history: Array<{ cycleNumber: number; outcome: 'BEAT' | 'MIXED' | 'MISS'; headline: string; reactionPercent: number }>;
    /** #188: the votes before the last, newest first */
    pastVotes: Array<{ title: string; passed: boolean; support: number | null; founderVote: 'FOR' | 'AGAINST' | null }>;
    /** #188: the share register */
    register: null | { sharesOutstanding: number; publicShares: number; publicPercent: number; founderShares: number; founderValue: number; othersPercent: number };
    report: null | {
        cycleNumber: number;
        outcome: 'BEAT' | 'MIXED' | 'MISS';
        score: number;
        headline: string;
        reactionPercent: number;
        weeksAgo: number;
        call: 'AVAILABLE' | 'HELD' | 'CLOSED';
        callEnergy: number;
        callEffectPercent: number | null;
    };
    vote: null | { id: string; title: string; summary: string; type: string; dueInWeeks: number; support: number; founderPercent: number };
    lastVote: null | { title: string; passed: boolean; decidedBy: 'FOUNDER' | 'PUBLIC' | null; consequence: string | null; support: number | null };
}

export const getStreamingListingDesk = (player: Player): StreamingListingDeskView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const markets = getStreamingPublicMarkets({ ...player, ownedStreamingPlatform: platform });
    const listing = platform.publicCompany.listing;
    const latestQuote = platform.publicCompany.quoteHistory.at(-1) || null;
    const founder = platform.founderOwnershipPercent;
    const gates = markets.readiness.map(gate => ({ ...gate, ...GATE_ROOMS[gate.id] }));
    const guidance = markets.activeGuidance;
    /* who set the guidance: the team's report names the CFO when it was them */
    const setByTeam = guidance ? platform.leadership.team?.report.find(entry => entry.jobId === 'GUIDANCE' && entry.absoluteWeek === guidance.issuedAtAbsoluteWeek && (entry.kind === 'DONE' || entry.kind === 'APPROVED')) : null;
    const setBy = guidance ? setByTeam?.kind === 'DONE'
        ? platform.leadership.appointments.find(item => item.id === setByTeam.appointmentId)?.nameAtAppointment || 'Your CFO'
        : 'you' : null;
    const earnings = markets.latestEarnings;
    const weeksAgo = earnings ? Math.max(0, absoluteWeek - earnings.reportedAtAbsoluteWeek) : 0;
    const called = Boolean(earnings && typeof earnings.callHeldAtAbsoluteWeek === 'number');
    const decidedVotes = [...platform.publicCompany.shareholderVotes].reverse().filter(item => item.status !== 'OPEN');
    const decided = decidedVotes[0] || null;
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    const price = latestQuote?.close || listing?.offerPrice || 0;
    /* the register: the public's part as the cap table holds it (own-share trades and buybacks move it) */
    const floatHolder = platform.finance.equityHolders.find(holder => holder.holderName === 'Public shareholder float');
    const publicPercent = listing ? (floatHolder ? floatHolder.ownershipPercent : listing.publicShares / Math.max(1, listing.sharesOutstanding) * 100) : 0;
    const founderShares = listing ? Math.round(listing.sharesOutstanding * founder / 100) : 0;
    return {
        listed,
        dividend: getStreamingDividendView(player),
        gates,
        cleared: gates.filter(gate => gate.passed).length,
        ready: markets.canStartRoadshow || platform.publicCompany.ipoJourney?.status === 'ACTIVE',
        resume: platform.publicCompany.ipoJourney?.status === 'ACTIVE',
        streamingPlus: platform.publicCompany.ipoJourney?.status !== 'ACTIVE' && streamingPlusLocks(player, { kind: 'IPO' }),
        bellEnergy: STREAMING_IPO_BELL_ENERGY,
        valuation: markets.valuation,
        /* a listing under way shows the ticker chosen in it */
        ticker: listing?.ticker || (platform.publicCompany.ipoJourney?.status === 'ACTIVE' && platform.publicCompany.ipoJourney.ticker) || markets.suggestedTicker,
        tickerFrom: !listing ? platform.identity?.name || 'Streaming' : null,
        founderPercent: founder,
        range: (() => {
            const at = (percent: number) => ({
                percent,
                raise: Math.round(markets.valuation * (percent / 100) * (1 - IPO_DISCOUNT) / 1_000_000) * 1_000_000,
                keep: Math.round(founder * (1 - percent / 100) * 10) / 10,
            });
            return { low: at(STREAMING_LISTING_FLOAT_RANGE[0]), high: at(STREAMING_LISTING_FLOAT_RANGE[1]) };
        })(),
        share: listing && latestQuote ? {
            ticker: listing.ticker,
            price: latestQuote.close,
            changePercent: latestQuote.changePercent,
            history: platform.publicCompany.quoteHistory.slice(-24).map(quote => quote.close),
            marketCap: latestQuote.marketCap,
            stakePercent: founder,
            stakeValue: Math.round(latestQuote.marketCap * founder / 100),
            valuePerShare: getStreamingEquityValuation(platform) / Math.max(1, listing.sharesOutstanding),
            drivers: latestQuote.drivers.slice(0, 3),
        } : null,
        guidance: guidance ? {
            cycleNumber: guidance.cycleNumber, tone: guidance.tone, subscriberTarget: guidance.subscriberTarget, revenueTarget: guidance.revenueTarget,
            cashTarget: guidance.cashContributionTarget, playbackTarget: guidance.playbackTarget, setBy,
        } : null,
        nextReportInWeeks: getStreamingQuarterSeasonCycle({ ...player, ownedStreamingPlatform: platform }).weeksUntilSeasonReview,
        guidanceOptions: listed && !guidance ? GUIDANCE_TONES.map(option => {
            const preview = previewStreamingGuidance(platform, option.tone);
            return { ...option, subscriberTarget: preview.subscriberTarget, revenueTarget: preview.revenueTarget };
        }) : [],
        history: [...platform.publicCompany.earnings].reverse().filter(item => item.id !== earnings?.id).map(item => ({
            cycleNumber: item.cycleNumber, outcome: item.outcome, headline: item.headline, reactionPercent: item.stockReactionPercent,
        })),
        pastVotes: decidedVotes.slice(1).map(item => ({
            title: item.title, passed: item.status === 'APPROVED', support: item.finalSupport, founderVote: item.founderVote || null,
        })),
        register: listing && listed ? {
            sharesOutstanding: listing.sharesOutstanding,
            publicShares: Math.round(listing.sharesOutstanding * publicPercent / 100),
            publicPercent: Math.round(publicPercent * 10) / 10,
            founderShares,
            founderValue: Math.round(founderShares * price),
            othersPercent: Math.max(0, Math.round((100 - founder - publicPercent) * 10) / 10),
        } : null,
        report: earnings ? {
            cycleNumber: earnings.cycleNumber,
            outcome: earnings.outcome,
            score: earnings.score,
            headline: earnings.headline,
            reactionPercent: earnings.stockReactionPercent,
            weeksAgo,
            call: called ? 'HELD' : weeksAgo <= STREAMING_EARNINGS_CALL_WEEKS ? 'AVAILABLE' : 'CLOSED',
            callEnergy: STREAMING_EARNINGS_CALL_ENERGY,
            callEffectPercent: called ? earnings.callEffectPercent ?? null : null,
        } : null,
        vote: markets.openVote ? {
            id: markets.openVote.id,
            title: markets.openVote.title,
            summary: markets.openVote.summary,
            type: markets.openVote.type,
            dueInWeeks: Math.max(0, markets.openVote.dueAtAbsoluteWeek - absoluteWeek),
            support: markets.openVote.institutionalSupport,
            founderPercent: founder,
        } : null,
        lastVote: decided ? {
            title: decided.title,
            passed: decided.status === 'APPROVED',
            decidedBy: decided.decidedBy || null,
            consequence: decided.consequence,
            support: decided.finalSupport,
        } : null,
    };
};
