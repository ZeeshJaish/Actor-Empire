/**
 * #168 (plan §21.13, §21.17): the Content seat's jobs.
 *
 *   - RENEWALS: the service's licences the Rights calendar left for you (Needs a decision). The Rights control rule
 *     with its own numbers: renew from 62 when the title's recent earnings cover the price (a creative or growth head
 *     accepts half), let go under 35. When the audience and the money disagree, or in between, the executive brings
 *     you a card with their lean. A creative-first head renews a little sooner (58), a margin-first one later (66).
 *     Titles you took into your own hands are never touched.
 *   - MARKET_BUYS: the weakest shelf, read by genre: what the whole market watched last week against how little of
 *     it you carry. Up to three deals a quarter, one card at a time: a whole collection when one fits the
 *     most-for-one-action limit (10⚡, as yours), otherwise one title of that genre through the Content Market's own
 *     Buy, the one inside the limit first.
 *   - ORIGINAL_PITCH: once a quarter, the pitch in the room most worth reading. Ask me only:
 *     taking it marks it on the Originals Desk; the commission stays yours.
 *
 * A renewal the team decided keeps who decided it (`decidedBy`), for the Content room's "Renewed by Nia".
 */
import { getLiveOriginalPitches, markRecommendedOriginalPitch } from '../originalsPitches';
import { getScriptGapFit } from '../originalsAudienceReport';
import type { Genre, OwnedStreamingPlatformState, Player, StreamingExecutiveStrategy, StreamingOriginalGapId } from '../../types';
import { PHASE_ONE_ENERGY_COSTS } from '../energyCosts';
import { getAbsoluteWeek } from '../legacyLogic';
import { releaseSlateHoldOnNewLicences, resolveStreamingCatalogTitle } from '../streamingCatalog';
import {
    evaluateOwnedStreamingRenewalReturn,
    normalizeStreamingRightsCalendarState,
    normalizeStreamingRightsManagementState,
    resolveStreamingRightsRenewal,
} from '../streamingRightsCalendar';
import { normalizeStreamingRightsContractRegistry } from '../streamingRightsCore';
import { getContentMarketListings, isContentMarketAuctionListing, prepareContentMarketDiscovery, purchaseContentMarketListing } from '../streamingContentMarket';
import { getStreamingCataloguePackageOpportunities, signOwnedStreamingCataloguePackage } from '../streamingRightsMarketplace';
import type { StreamingTeamExecutor, StreamingTeamJobRunner, StreamingTeamProposal } from './teamJobs';

const QUARTER_WEEKS = 13;
/** market deals a quarter, at most */
const MARKET_BUYS_PER_QUARTER = 3;
/** after a no on a market card, the executive waits this long before the next */
const MARKET_PAUSE_WEEKS = 4;
/** a shelf is weak when the market watches it this much more than you carry it (percentage points) */
const WEAK_SHELF_GAP = 0.04;
/** a genre the market barely watches is never a shelf to fill */
const WATCHED_FLOOR = 0.03;

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const first = (name: string) => name.split(' ')[0] || name;
const pct = (value: number) => `${Math.round(value * 100)}%`;
export const streamingGenreWord = (genre: string) => (genre === 'SCI_FI' ? 'Sci-fi' : genre.charAt(0) + genre.slice(1).toLowerCase().replaceAll('_', ' '));

/* ── renewals ── */

/** how much sooner (−) or later (+) the executive renews than the Rights control rule */
const RENEW_SHIFT: Record<StreamingExecutiveStrategy, number> = {
    CREATIVE_FIRST: -4, GROWTH_FIRST: -2, BALANCED: 0, GLOBAL_FIRST: 0, TECHNOLOGY_FIRST: 0, TRUST_FIRST: 0, MARGIN_FIRST: 4,
};

export const runRenewals: StreamingTeamJobRunner = (context) => {
    const { player, absoluteWeek, executive } = context;
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const policy = normalizeStreamingRightsManagementState(player.streamingRightsManagement).policy;
    const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const renewAt = Math.max(40, Math.min(95, policy.autoRenewMinimumScore + RENEW_SHIFT[executive.preferredStrategy]));
    const letGoBelow = Math.min(renewAt - 5, policy.letWeakContractsExpireBelowScore);
    const name = first(executive.nameAtAppointment);
    return Object.values(calendar.renewalCases)
        .filter(item => item.incumbentBuyer.type === 'PLAYER_PLATFORM' && item.outcome === 'PENDING' && item.status === 'ACTION_REQUIRED'
            && !item.replacementContractId && item.performance && absoluteWeek <= item.decisionDeadlineAbsoluteWeek
            && !item.protectionReasons.includes('MANUAL_CONTROL') && !item.protectionReasons.includes('PROTECTED_TITLE'))
        .sort((left, right) => left.decisionDeadlineAbsoluteWeek - right.decisionDeadlineAbsoluteWeek || left.title.localeCompare(right.title))
        .flatMap((item): StreamingTeamProposal[] => {
            const score = Math.round(item.performance!.performanceScore);
            const left = Math.max(0, item.sourceExpiresAtAbsoluteWeek - absoluteWeek);
            const leaves = left === 0 ? 'it leaves at the end of this week' : `it leaves in ${left} week${left === 1 ? '' : 's'}`;
            const base = { jobId: 'RENEWALS' as const, dedupeKey: `renewal:${item.id}`, priority: 35 + Math.max(0, 8 - left) };
            if (score < letGoBelow) {
                return [{
                    ...base,
                    title: `Let ${item.title} go`,
                    detail: `Score ${score} · ${leaves}`,
                    reason: `Weak: ${score}, under ${letGoBelow}. ${name}'s rule lets it go; nothing to pay.`,
                    cost: 0, energy: 0,
                    action: { kind: 'RENEWAL', caseId: item.id, decision: 'LET_EXPIRE' },
                }];
            }
            const economics = item.proposedEconomics;
            const source = contracts[item.sourceContractId];
            if (!economics || item.offerDisposition !== 'OFFERED' || !source) return [];
            const payback = evaluateOwnedStreamingRenewalReturn(player, source, economics);
            const covered = payback.requiredRecovery > 0 ? Math.min(9.99, payback.expectedContribution / payback.requiredRecovery) : 0;
            const terms = `${money(economics.minimumGuarantee)} for ${economics.durationWeeks} more weeks · score ${score}`;
            const pays = payback.coversInvestment ? 'its earnings cover the price' : payback.observedWeeks < 4
                ? 'too new to know if it pays back' : `its recent earnings cover ${pct(covered)} of the price`;
            /* strong and paying back (a creative or growth head accepts half paid back): renewed by itself */
            const enough = payback.coversInvestment
                || (covered >= 0.5 && payback.observedWeeks >= 4 && (executive.preferredStrategy === 'CREATIVE_FIRST' || executive.preferredStrategy === 'GROWTH_FIRST'));
            if (score >= renewAt && enough) {
                return [{
                    ...base,
                    title: `Renew ${item.title}`,
                    detail: terms,
                    reason: `Strong: ${score} (${name} renews from ${renewAt}); ${pays}.`,
                    cost: economics.minimumGuarantee, energy: 0,
                    action: { kind: 'RENEWAL', caseId: item.id, decision: 'ACCEPT_RENEWAL' },
                }];
            }
            /* the audience and the money disagree, or it is in between: a card with the executive's lean, never done by
               itself. A creative or growth head leans to renew a strong title that pays back a quarter or more;
               otherwise the money decides. */
            const renew = score >= renewAt && (executive.preferredStrategy === 'CREATIVE_FIRST' || executive.preferredStrategy === 'GROWTH_FIRST')
                ? covered >= 0.25 || payback.coversInvestment
                : payback.coversInvestment;
            return [{
                ...base,
                title: renew ? `Renew ${item.title}?` : `Let ${item.title} go?`,
                detail: renew ? terms : `Score ${score} · ${leaves}`,
                reason: `${score >= renewAt ? `Strong (${score}), but` : `Middling: ${score}, between ${letGoBelow} and ${renewAt};`} ${pays}. ${name} leans ${renew ? 'to renew' : 'to let it go'}; your call.`,
                cost: renew ? economics.minimumGuarantee : 0, energy: 0,
                action: { kind: 'RENEWAL', caseId: item.id, decision: renew ? 'ACCEPT_RENEWAL' : 'LET_EXPIRE' },
                askOnly: true,
            }];
        });
};

/** #168: a renewal the team decided keeps who decided it, for "Renewed by Nia" in the Content room */
const markDecidedBy = (player: Player, caseId: string, name: string, absoluteWeek: number): Player => {
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const item = calendar.renewalCases[caseId];
    if (!item) return player;
    return {
        ...player,
        world: {
            ...player.world,
            streamingRightsCalendar: {
                ...calendar,
                renewalCases: { ...calendar.renewalCases, [caseId]: { ...item, decidedBy: { name, seatId: 'CONTENT', absoluteWeek } } },
            },
        },
    };
};

export const executeRenewal: StreamingTeamExecutor = (player, action, context) => {
    if (action.kind !== 'RENEWAL') return { player, changed: false };
    const result = resolveStreamingRightsRenewal(player, { caseId: action.caseId, action: action.decision, absoluteWeek: context.absoluteWeek });
    if (!result.changed) return { player, changed: false, reason: result.detail || 'The renewal could not be recorded.' };
    return { player: markDecidedBy(result.player, action.caseId, context.executiveName, context.absoluteWeek), changed: true };
};

/* ── market buys ── */

export interface StreamingShelfGap {
    genre: string;
    /** share of the hours the whole market watched last week */
    watchShare: number;
    /** share of the titles on your service */
    shelfShare: number;
    titles: number;
    gap: number;
}

/** Your shelves against what the market watches: the weakest first. */
export const getStreamingShelfGaps = (player: Player, platform: OwnedStreamingPlatformState): StreamingShelfGap[] => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const licensed = new Set(platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE' && license.startsAtAbsoluteWeek <= absoluteWeek && license.expiresAtAbsoluteWeek > absoluteWeek)
        .map(license => license.sourceProjectId));
    const shelves = new Map<string, number>();
    let carried = 0;
    platform.catalogProjectIds.forEach(projectId => {
        const title = resolveStreamingCatalogTitle(player, projectId, platform);
        if (!title || (title.source === 'EXTERNAL_MARKET' && !licensed.has(projectId))) return;
        shelves.set(title.genre, (shelves.get(title.genre) || 0) + 1);
        carried += 1;
    });
    const watched = new Map<string, number>();
    let hours = 0;
    Object.values(player.world.worldStreamingViewing?.platforms || {}).forEach(summary => (summary.titlePerformance || []).forEach(row => {
        const value = Math.max(0, Number(row.hoursViewed) || 0);
        watched.set(row.genre, (watched.get(row.genre) || 0) + value);
        hours += value;
    }));
    if (hours <= 0) return [];
    return [...watched.entries()]
        .map(([genre, value]) => {
            const titles = shelves.get(genre) || 0;
            const watchShare = value / hours;
            const shelfShare = carried > 0 ? titles / carried : 0;
            return { genre, watchShare, shelfShare, titles, gap: watchShare - shelfShare };
        })
        .filter(shelf => shelf.watchShare >= WATCHED_FLOOR)
        .sort((left, right) => right.gap - left.gap || left.genre.localeCompare(right.genre));
};

const quarterOf = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => Math.floor((absoluteWeek - (platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek)) / QUARTER_WEEKS);
/** once a quarter: no card for it this quarter (whatever you answered), and nothing done for it in 13 weeks */
const quarterTaken = (platform: OwnedStreamingPlatformState, jobId: 'MARKET_BUYS' | 'ORIGINAL_PITCH', key: string, absoluteWeek: number) => {
    const team = platform.leadership.team;
    if (!team) return false;
    return team.tray.some(card => card.dedupeKey === key)
        || team.report.some(entry => entry.jobId === jobId && (entry.kind === 'DONE' || entry.kind === 'APPROVED') && entry.absoluteWeek > absoluteWeek - QUARTER_WEEKS);
};

export const runMarketBuys: StreamingTeamJobRunner = (context) => {
    const { player, platform, absoluteWeek, executive, seat } = context;
    if (!platform.launchCommit) return [];
    const team = platform.leadership.team;
    /* up to three deals a quarter, one card at a time, and a pause after a no */
    const done = team?.report.filter(entry => entry.jobId === 'MARKET_BUYS' && (entry.kind === 'DONE' || entry.kind === 'APPROVED')
        && entry.absoluteWeek > absoluteWeek - QUARTER_WEEKS).length ?? 0;
    if (done >= MARKET_BUYS_PER_QUARTER) return [];
    if (team?.tray.some(card => card.jobId === 'MARKET_BUYS' && (card.status === 'WAITING'
        || (card.status === 'DECLINED' && absoluteWeek - (card.resolvedAtAbsoluteWeek ?? card.createdAtAbsoluteWeek) < MARKET_PAUSE_WEEKS)))) return [];
    const weak = getStreamingShelfGaps(player, platform)[0];
    if (!weak || weak.gap < WEAK_SHELF_GAP) return [];
    const name = first(executive.nameAtAppointment);
    const genre = streamingGenreWord(weak.genre).toLowerCase();
    const why = `${streamingGenreWord(weak.genre)} is ${pct(weak.watchShare)} of what the market watches and ${pct(weak.shelfShare)} of your shelves.`;
    /* a sharp executive weighs rating for the price; the rest take the best rated */
    const sharp = executive.skill >= 75;

    /* a whole collection, when one fits the most-for-one-action limit and brings two or more of the genre */
    const collection = getStreamingCataloguePackageOpportunities(player)
        .filter(opportunity => opportunity.totalGuarantee <= seat.actionMoney)
        .map(opportunity => ({ opportunity, fits: opportunity.package.components.filter(component => component.genre === weak.genre).length }))
        .filter(item => item.fits >= 2)
        .sort((left, right) => right.fits - left.fits || left.opportunity.totalGuarantee - right.opportunity.totalGuarantee || left.opportunity.id.localeCompare(right.opportunity.id))[0];
    if (collection) {
        const { opportunity } = collection;
        return [{
            jobId: 'MARKET_BUYS',
            dedupeKey: `market:${opportunity.id}`,
            title: `Sign the ${opportunity.package.name}`,
            detail: `${opportunity.package.components.length} titles, ${collection.fits} ${genre} · ${money(opportunity.totalGuarantee)} · ${opportunity.package.maximumDurationWeeks} weeks, not exclusive`,
            reason: `${why} ${name}'s pick: ${collection.fits} ${genre} titles in one deal.`,
            cost: opportunity.totalGuarantee,
            energy: PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT,
            action: { kind: 'CATALOGUE_SIGN', packageId: opportunity.id },
            priority: 15,
        }];
    }

    /* otherwise one title of the genre from the Content Market, the one inside the limit first */
    const market = prepareContentMarketDiscovery(player);
    const ratingOf = (rating: number | null | undefined) => (typeof rating === 'number' && rating > 0 ? rating : 6);
    const listings = getContentMarketListings(market)
        .filter(listing => listing.title.genre === weak.genre && listing.terms.minimumGuarantee > 0 && !isContentMarketAuctionListing(market, listing.id));
    const pick = listings.sort((left, right) => (
        Number(left.terms.minimumGuarantee > seat.actionMoney) - Number(right.terms.minimumGuarantee > seat.actionMoney)
        || (sharp
            ? ratingOf(right.title.rating) ** 2 / right.terms.minimumGuarantee - ratingOf(left.title.rating) ** 2 / left.terms.minimumGuarantee
            : ratingOf(right.title.rating) - ratingOf(left.title.rating) || left.terms.minimumGuarantee - right.terms.minimumGuarantee)
        || left.id.localeCompare(right.id)
    ))[0];
    if (!pick) return [];
    const rating = typeof pick.title.rating === 'number' && pick.title.rating > 0 ? `rated ${pick.title.rating.toFixed(1)}` : 'new to the market';
    const format = pick.title.projectType === 'SERIES' ? 'series' : 'film';
    return [{
        jobId: 'MARKET_BUYS',
        dedupeKey: `market:${pick.id}`,
        title: `License ${pick.title.title}`,
        detail: `${streamingGenreWord(weak.genre)} ${format} · ${rating} · ${pick.terms.durationWeeks} weeks, ${pick.terms.exclusivity === 'EXCLUSIVE' ? 'exclusive' : 'not exclusive'}`,
        reason: `${why} ${name}'s pick: ${listings.length === 1 ? `the one ${genre} title on the market` : `${sharp ? 'the best value' : 'the best rated'} of ${listings.length} ${genre} titles on the market`}.`,
        cost: pick.terms.minimumGuarantee,
        energy: 0,
        action: { kind: 'TITLE_LICENSE', listingId: pick.id, price: pick.terms.minimumGuarantee },
        priority: 15,
    }];
};

export const executeCatalogueSign: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'CATALOGUE_SIGN') return { player, changed: false };
    const result = signOwnedStreamingCataloguePackage(player, action.packageId);
    /* the team's own buy goes on the service by itself: only the player's purchases wait for the Slate */
    if (result.changed) return { player: releaseSlateHoldOnNewLicences(player, result.player), changed: true };
    return {
        player,
        changed: false,
        reason: result.reason === 'NOT_FOUND' ? 'That collection has left the market.'
            : result.reason === 'INSUFFICIENT_TREASURY' ? 'The treasury cannot pay for it.'
                : result.reason === 'INSUFFICIENT_ENERGY' ? 'Not enough energy.'
                    : result.detail || 'The deal could not be signed.',
    };
};

/** the Content Market's own Buy: the listing as it stands now, never above the price on the card */
export const executeTitleLicense: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'TITLE_LICENSE') return { player, changed: false };
    const listing = getContentMarketListings(prepareContentMarketDiscovery(player)).find(item => item.id === action.listingId);
    if (!listing) return { player, changed: false, reason: 'That title has left the market.' };
    if (listing.terms.minimumGuarantee > action.price) return { player, changed: false, reason: `Its price rose to ${money(listing.terms.minimumGuarantee)}.` };
    const result = purchaseContentMarketListing(player, listing.id, listing.signature);
    /* the team's own buy goes on the service by itself: only the player's purchases wait for the Slate */
    return result.changed ? { player: releaseSlateHoldOnNewLicences(player, result.player), changed: true } : { player, changed: false, reason: result.detail };
};

/* ── the Original pitch ── */

/** the gap an executive's strategy leans to */
const FAVOURITE_GENRE: Partial<Record<StreamingExecutiveStrategy, Genre>> = {
    CREATIVE_FIRST: 'DRAMA',
    GROWTH_FIRST: 'COMEDY',
    TRUST_FIRST: 'ADVENTURE',
    MARGIN_FIRST: 'CRIME',
    GLOBAL_FIRST: 'ACTION',
    TECHNOLOGY_FIRST: 'SCI_FI',
};

/* #280: the studios pitch now, so the Head of Content brings the one worth reading, by what they like and what the Audience report says */
export const runOriginalPitch: StreamingTeamJobRunner = (context) => {
    const { player, platform, absoluteWeek, executive } = context;
    if (!platform.launchCommit || absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek < 6) return [];
    const quarter = quarterOf(platform, absoluteWeek);
    const key = `pitch:${quarter}`;
    if (quarterTaken(platform, 'ORIGINAL_PITCH', key, absoluteWeek)) return [];
    const scored = getLiveOriginalPitches(player).map(pitch => ({
        pitch,
        fit: getScriptGapFit(player, pitch.script.genres),
        score: pitch.script.quality + (getScriptGapFit(player, pitch.script.genres) ? 20 : 0) + (FAVOURITE_GENRE[executive.preferredStrategy] === pitch.script.genres[0] ? 8 : 0),
    })).sort((left, right) => right.score - left.score);
    const best = scored[0];
    if (!best) return [];
    const { pitch, fit } = best;
    const format = pitch.script.projectType === 'SERIES' ? `series, ${pitch.script.episodes || 8} episodes` : 'film';
    return [{
        jobId: 'ORIGINAL_PITCH',
        dedupeKey: key,
        title: `“${pitch.script.title}”`,
        detail: `${streamingGenreWord(pitch.script.genres[0] as Genre)} ${format} · from ${pitch.studioName}`,
        reason: fit ? `It fits your gap: ${fit.title} in ${fit.countryName}.` : `The strongest script in the room this quarter.`,
        cost: 0,
        energy: 0,
        action: { kind: 'ORIGINAL_PITCH', pitchId: pitch.id },
        askOnly: true,
        priority: 5,
    }];
};

/** the commission stays the player's: taking the advice only marks the pitch on the Desk */
export const executeOriginalPitch: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'ORIGINAL_PITCH') return { player, changed: false };
    const pitchId = (action as { pitchId?: string }).pitchId;
    if (!pitchId || !getLiveOriginalPitches(player).some(pitch => pitch.id === pitchId)) return { player, changed: false, reason: 'That pitch has gone.' };
    return { player: markRecommendedOriginalPitch(player, pitchId), changed: true };
};

