/**
 * #171 (plan §21.13, §21.17): the Money (CFO) and Trust seats' jobs.
 *
 * Money:
 *   - The cash floor follows the CFO's strategy (8–16 weeks of costs; 12 without a CFO): `getStreamingTeamCashFloor`
 *     (#164) holds every seat's spending under it.
 *   - OFFERS (Ask me only): each investor's offer still open, with the CFO's read: what it values the company at against
 *     what it is worth by our numbers (`getStreamingEquityValuation`), the stake, the seat, the profit share, and
 *     whether it keeps you over 51%. Approving opens the term sheet in OWNERSHIP; signing stays yours.
 *     #186: with no round under way and under half a year of runway, the CFO proposes calling a growth round
 *     (approving opens Raise money; calling it stays yours).
 *   - PRICE_IDEAS (Ask me only): once a quarter, a dollar up or down on the entry plan when the Offer tab's own forecast
 *     (`forecastWorldStreamingLaunchPricing`) says it earns more (keeping nearly every home), or for a growth head keeps
 *     more homes, read against the rivals' median entry price. Approving saves it through the Offer tab's own save; it
 *     applies at the next weekly settlement.
 *   - GUIDANCE (public only): each quarter's promise to the market (`issueStreamingPublicGuidance`), its tone from the
 *     CFO's strategy and the last twelve weeks' members.
 *
 * Trust:
 *   - LEAKS: a title on pirate sites taken down with STATUS's own takedowns: requests filed for cash, or an all-hands
 *     takedown inside the energy allowance; a major leak asks.
 *   - TRUST_INCIDENTS: an account breach, a recommendation backlash, a rights problem or a staff allegation answered the
 *     same way; a major one asks.
 */
import type { OwnedStreamingPlatformState, StreamingCrisisType, StreamingGuidanceTone } from '../../types';
import { saveStreamingPricingPlan } from '../streamingLaunchProgram';
import {
    STREAMING_ROUND_SIZES,
    founderAfterNewShares,
    getStreamingOpenInvestorOffers,
    getStreamingRoundState,
    readStreamingInvestorOffer,
    roomAboveControl,
} from '../streamingInvestorOffers';
import { getStreamingCashSummary } from '../streamingStudioFinance';
import { setStreamingPlanPrice } from '../streamingPlanBuilder';
import { getStreamingEquityValuation, issueStreamingPublicGuidance } from '../streamingPublicMarkets';
import { getOwnedPlatformPackageCountryIds } from '../streamingContentAvailability';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { forecastWorldStreamingLaunchPricing } from '../worldEconomy/worldStreamingPricingForecast';
import { openStreamingIncidents, proposeStreamingIncidentAnswer } from './teamTechnology';
import type { StreamingTeamExecutor, StreamingTeamJobRunner, StreamingTeamProposal } from './teamJobs';

const QUARTER_WEEKS = 13;
const money = (value: number) => {
    const abs = Math.abs(value);
    const text = abs >= 1e9 ? `$${(abs / 1e9).toFixed(1)}B` : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(abs / 1e3)}K`;
    return value < 0 ? `−${text}` : text;
};
const price = (value: number) => `$${value.toFixed(2)}`;
const first = (name: string) => name.split(' ')[0] || name;
const pct = (value: number) => `${Math.round(value * 100)}%`;
const people = (value: number) => (Math.abs(value) >= 1e6 ? `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(value / 1e3)}K`);
const signed = (value: number, words: (abs: number) => string) => `${value >= 0 ? '+' : '−'}${words(Math.abs(value))}`;
const quarterOf = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => Math.floor((absoluteWeek - (platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek)) / QUARTER_WEEKS);

/* ── investors' offers ── */

export const runInvestorOffers: StreamingTeamJobRunner = (context) => {
    const { player, platform, absoluteWeek, executive } = context;
    const worth = getStreamingEquityValuation(platform);
    /* #186: no round under way, under half a year of runway: call a growth round */
    const round = getStreamingRoundState(platform, absoluteWeek);
    const runway = round.status === 'NONE' && platform.publicCompany.lifecycle !== 'PUBLIC' ? getStreamingCashSummary(player).runwayWeeks : null;
    const growth = STREAMING_ROUND_SIZES.GROWTH;
    const call: StreamingTeamProposal[] = runway !== null && runway < 26 && roomAboveControl(platform.founderOwnershipPercent) >= 1 ? [{
        jobId: 'OFFERS',
        dedupeKey: `round-call:${Math.floor(absoluteWeek / 13)}`,
        title: 'Call a growth round',
        detail: `${runway} weeks of runway left · up to ${growth.upToPercent}% · ⚡${growth.energy} · offers in 3 weeks`,
        reason: `${executive.nameAtAppointment.split(' ')[0]}: at this pace the treasury lasts ${runway} weeks. A round now brings the industry's offers before it is urgent.`,
        cost: 0,
        energy: 0,
        action: { kind: 'OPEN_ROOM', room: 'OWNERSHIP', focusId: 'raise' },
        askOnly: true,
        priority: 11,
    }] : [];
    return [...call, ...getStreamingOpenInvestorOffers(platform, absoluteWeek).map((offer): StreamingTeamProposal => {
        /* #186: new shares dilute every holder, the founder included */
        const after = Math.round(founderAfterNewShares(platform.founderOwnershipPercent, offer.ownershipPercent) * 10) / 10;
        const read = readStreamingInvestorOffer(worth, offer, after, executive.nameAtAppointment);
        const implied = read.implied;
        return {
            jobId: 'OFFERS',
            dedupeKey: `offer:${offer.id}`,
            title: `${offer.name} offers ${money(offer.investedCapital)} for ${offer.ownershipPercent}%`,
            detail: `Values you at ${money(implied)} · you keep ${after}%${offer.boardSeat ? ' · a board seat' : ''} · ${offer.profitParticipationPercent}% of profit`,
            reason: read.text,
            cost: 0,
            energy: 0,
            action: { kind: 'OPEN_ROOM', room: 'OWNERSHIP', focusId: offer.id },
            askOnly: true,
            priority: 12,
        };
    })];
};

/* ── a price idea a quarter ── */

/** the entry plan: the cheapest paid plan without ads (or the cheapest paid plan) */
const entryPlanOf = (platform: OwnedStreamingPlatformState) => {
    const paid = platform.serviceConfiguration.pricing.plans.filter(plan => plan.monthly > 0).sort((left, right) => left.monthly - right.monthly);
    return paid.find(plan => !plan.ads) || paid[0] || null;
};

export const runPriceIdeas: StreamingTeamJobRunner = (context) => {
    const { player, platform, absoluteWeek, executive } = context;
    if (!platform.launchCommit) return [];
    const quarter = quarterOf(platform, absoluteWeek);
    const weekInQuarter = (absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek) % QUARTER_WEEKS;
    const key = `price:${quarter}`;
    /* once a quarter, read in its first four weeks */
    if (quarter < 1 || weekInQuarter > 3 || platform.leadership.team?.tray.some(card => card.dedupeKey === key)) return [];
    const pricing = platform.serviceConfiguration.pricing;
    const entry = entryPlanOf(platform);
    const countries = getOwnedPlatformPackageCountryIds(platform);
    if (!entry || !pricing.streams.includes('subs') || !countries.length) return [];
    const revenueOf = (forecast: ReturnType<typeof forecastWorldStreamingLaunchPricing>) => forecast.monthlySubscriptionRevenue + forecast.estimatedWeeklyAdRevenueIfPlayable * 52 / 12;
    const now = forecastWorldStreamingLaunchPricing(player, pricing, countries);
    const tried = [entry.monthly + 1, entry.monthly - 1]
        .map(monthly => setStreamingPlanPrice(pricing, entry.id, monthly))
        .map(next => ({ next, monthly: next.plans.find(plan => plan.id === entry.id)!.monthly, forecast: forecastWorldStreamingLaunchPricing(player, next, countries) }))
        .filter(item => item.monthly !== entry.monthly)
        .map(item => ({ ...item, revenue: revenueOf(item.forecast) - revenueOf(now), homes: item.forecast.subscribers - now.subscribers }));
    const growth = executive.preferredStrategy === 'GROWTH_FIRST';
    const margin = executive.preferredStrategy === 'MARGIN_FIRST';
    const nowRevenue = Math.max(1, revenueOf(now));
    const worth = tried.filter(item => (growth
        ? item.homes >= now.subscribers * 0.02 && item.revenue >= -nowRevenue * 0.05
        : item.revenue >= nowRevenue * 0.01 && (margin || item.homes >= -now.subscribers * 0.03)))
        .sort((left, right) => (growth ? right.homes - left.homes : right.revenue - left.revenue));
    const idea = worth[0];
    if (!idea) return [];
    const up = idea.monthly > entry.monthly;
    const rivals = now.rivalMedianEntryPrice;
    const name = first(executive.nameAtAppointment);
    return [{
        jobId: 'PRICE_IDEAS',
        dedupeKey: key,
        title: `${up ? 'Raise' : 'Cut'} ${entry.name} to ${price(idea.monthly)}`,
        detail: `Now ${price(entry.monthly)} · rivals' median entry ${price(rivals)} · forecast ${signed(idea.homes, people)} homes, ${signed(idea.revenue, money)} a month`,
        reason: up
            ? `${entry.name} is ${entry.monthly < rivals ? `${pct(1 - entry.monthly / Math.max(0.01, rivals))} under` : 'level with'} what rivals charge to start${idea.monthly > rivals ? `; at ${price(idea.monthly)} it is ${pct(idea.monthly / Math.max(0.01, rivals) - 1)} over` : ''}. The Offer tab's forecast keeps ${pct(idea.forecast.subscribers / Math.max(1, now.subscribers))} of homes for ${money(idea.revenue)} more a month. ${name}'s idea; the price is yours.`
            : `${entry.name} is ${entry.monthly > rivals ? `${pct(entry.monthly / Math.max(0.01, rivals) - 1)} over` : 'level with'} what rivals charge to start; a dollar less brings ${people(idea.homes)} more homes${idea.revenue >= 0 ? ` and ${money(idea.revenue)} more a month` : ` for ${money(-idea.revenue)} less a month`}. ${name}'s idea; the price is yours.`,
        cost: 0,
        energy: 0,
        action: { kind: 'PRICE_CHANGE', planId: entry.id, monthly: idea.monthly },
        askOnly: true,
        priority: 8,
    }];
};

/** the Offer tab's own save, on the pricing as it stands now */
export const executePriceChange: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'PRICE_CHANGE') return { player, changed: false };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const pricing = platform.serviceConfiguration.pricing;
    if (!pricing.plans.some(plan => plan.id === action.planId)) return { player, changed: false, reason: 'That plan is no longer offered.' };
    const result = saveStreamingPricingPlan(player, setStreamingPlanPrice(pricing, action.planId, action.monthly), 'OPERATIONS');
    return result.changed ? { player: result.player, changed: true } : { player, changed: false, reason: 'The price could not be changed now.' };
};

/* ── guidance, once public ── */

const TONES: StreamingGuidanceTone[] = ['CONSERVATIVE', 'BALANCED', 'AMBITIOUS'];
const GUIDANCE_RISE: Record<StreamingGuidanceTone, number> = { CONSERVATIVE: -0.04, BALANCED: 0.04, AMBITIOUS: 0.12 };

export const runGuidance: StreamingTeamJobRunner = (context) => {
    const { platform, executive } = context;
    if (platform.publicCompany.lifecycle !== 'PUBLIC' || platform.publicCompany.guidance.some(item => item.status === 'ACTIVE')) return [];
    const history = platform.weeklyHistory;
    const then = history.at(-13)?.subscribers ?? history[0]?.subscribers ?? platform.metrics.subscribers;
    const growth = then > 0 ? platform.metrics.subscribers / then - 1 : 0;
    const base = executive.preferredStrategy === 'MARGIN_FIRST' || executive.preferredStrategy === 'TRUST_FIRST' ? 0
        : executive.preferredStrategy === 'GROWTH_FIRST' ? 2 : 1;
    const step = growth >= 0.08 ? 1 : growth <= 0 ? -1 : 0;
    const tone = TONES[Math.max(0, Math.min(2, base + step))];
    const target = Math.round(platform.metrics.subscribers * (1 + GUIDANCE_RISE[tone]));
    const name = first(executive.nameAtAppointment);
    const quarter = (platform.cycleReviews.filter(item => item.kind === 'TWELVE_WEEK_REVIEW').at(-1)?.cycleNumber || 0) + 1;
    return [{
        jobId: 'GUIDANCE',
        dedupeKey: `guidance:${quarter}`,
        title: `${tone.charAt(0)}${tone.slice(1).toLowerCase()} guidance for quarter ${quarter}`,
        detail: `Promise about ${people(target)} members by the next report (${signed(GUIDANCE_RISE[tone], value => pct(value))})`,
        reason: `Members ${growth >= 0 ? 'grew' : 'fell'} ${pct(Math.abs(growth))} over the last twelve weeks. ${name} ${tone === 'AMBITIOUS' ? 'promises more: the price rises if we beat it, and falls harder if we miss.' : tone === 'CONSERVATIVE' ? 'promises less, to beat it.' : 'promises what the trend gives.'}`,
        cost: 0,
        energy: 0,
        action: { kind: 'GUIDANCE', posture: tone },
        priority: 40,
    }];
};

export const executeGuidance: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'GUIDANCE') return { player, changed: false };
    const tone = TONES.includes(action.posture as StreamingGuidanceTone) ? action.posture as StreamingGuidanceTone : 'BALANCED';
    const result = issueStreamingPublicGuidance(player, tone);
    return result.changed ? { player: result.player, changed: true } : { player, changed: false, reason: result.reason };
};

/* ── Trust ── */

const LEAK_TYPES = new Set<StreamingCrisisType>(['CONTENT_LEAK']);
const TRUST_TYPES = new Set<StreamingCrisisType>(['ACCOUNT_BREACH', 'RECOMMENDATION_BACKLASH', 'RIGHTS_COMPLIANCE', 'EMPLOYEE_ALLEGATION']);

export const runLeaks: StreamingTeamJobRunner = (context) => openStreamingIncidents(context.platform, LEAK_TYPES, false).flatMap(open => {
    const proposal = proposeStreamingIncidentAnswer(context, 'LEAKS', open, { now: 'Take down', fix: 'File takedowns', nowPick: 'the all-hands takedown', fixPick: 'takedown requests filed for cash' });
    return proposal ? [proposal] : [];
});

export const runTrustIncidents: StreamingTeamJobRunner = (context) => openStreamingIncidents(context.platform, TRUST_TYPES, false).flatMap(open => {
    const proposal = proposeStreamingIncidentAnswer(context, 'TRUST_INCIDENTS', open);
    return proposal ? [proposal] : [];
});
