import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingCycleReview,
    type OwnedStreamingWeeklySnapshot,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    castStreamingShareholderVote,
    checkpointStreamingCinematicIpoJourney,
    commitStreamingCinematicIpo,
    commitStreamingPublicMarketWeek,
    getStreamingPublicMarkets,
    issueStreamingPublicGuidance,
    listStreamingPlatform,
    resolveStreamingHostileTakeover,
    respondToStreamingActivist,
    startStreamingIpoRoadshow,
    startStreamingCinematicIpoJourney,
} from '../services/streamingPublicMarkets';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeSnapshot = (absoluteWeek: number, subscribers: number, netMovement = 80_000): OwnedStreamingWeeklySnapshot => ({
    id: `phase22-week-${absoluteWeek}`,
    absoluteWeek,
    subscribers,
    netSubscriberMovement: netMovement,
    churnRate: 0.012,
    engagementRate: 0.72,
    averageRevenuePerUser: 13,
    cashRunwayWeeks: 80,
    technologyHealth: 91,
    causeMarkers: ['phase22-audit'],
    operations: {
        programWeek: 1,
        releaseTitles: ['Signal Fire'],
        joinedSubscribers: 100_000,
        cancellations: 20_000,
        reactivations: 0,
        subscriptionRevenue: 48_000_000,
        partnerRevenueShareCost: 2_000_000,
        infrastructureCost: 5_000_000,
        leadershipCost: 1_000_000,
        financingCost: 0,
        weeklyPlanCost: 0,
        totalCashCost: 25_000_000,
        netCashContribution: 23_000_000,
        contentAmortization: 4_000_000,
        accountingContribution: 19_000_000,
        peakConcurrentStreams: 8_000_000,
        capacityUtilizationPercent: 52,
        playbackSuccessRate: 99.4,
        appliedDecisionId: null,
        headline: 'The platform held its momentum.',
        summary: 'A healthy operating week.',
        nextWeekHook: 'The next quarter remains investable.',
        causalDrivers: [],
    },
});

const createReview = (
    cycleNumber: number,
    endAbsoluteWeek: number,
    outcome: 'HEALTHY' | 'MISS',
): OwnedStreamingCycleReview => ({
    id: `phase22-review-${cycleNumber}`,
    idempotencyKey: `streaming-season-review:${cycleNumber}`,
    ledgerFactId: `phase22-review-fact-${cycleNumber}`,
    kind: 'TWELVE_WEEK_REVIEW',
    cycleNumber,
    startAbsoluteWeek: endAbsoluteWeek - 11,
    endAbsoluteWeek,
    weeksIncluded: 12,
    strategicIdentity: outcome === 'HEALTHY' ? 'CASH_COMPOUNDER' : 'FRAGILE_MOMENTUM',
    performanceTier: outcome === 'HEALTHY' ? 'BREAKOUT' : 'UNDER_PRESSURE',
    subscriberStart: 2_000_000,
    subscriberEnd: outcome === 'HEALTHY' ? 4_000_000 : 2_100_000,
    subscriberNetMovement: outcome === 'HEALTHY' ? 2_000_000 : 100_000,
    averageChurnRate: outcome === 'HEALTHY' ? 0.012 : 0.038,
    averageEngagementRate: outcome === 'HEALTHY' ? 0.72 : 0.41,
    averagePlaybackSuccessRate: outcome === 'HEALTHY' ? 99.4 : 94.5,
    peakCapacityUtilizationPercent: outcome === 'HEALTHY' ? 52 : 108,
    totalSubscriptionRevenue: outcome === 'HEALTHY' ? 576_000_000 : 120_000_000,
    totalCashContribution: outcome === 'HEALTHY' ? 276_000_000 : -90_000_000,
    totalAccountingContribution: outcome === 'HEALTHY' ? 228_000_000 : -120_000_000,
    technicalVerdict: outcome === 'HEALTHY' ? 'RESILIENT' : 'AT_RISK',
    rivalMovement: {
        platformId: 'NETFLIX',
        platformName: 'StreamFlix',
        pressure: outcome === 'HEALTHY' ? 'LOW' : 'HIGH',
        signal: 'A rival is watching the public tape.',
    },
    hits: ['One canonical hit.'],
    misses: ['One canonical miss.'],
    headline: outcome === 'HEALTHY' ? 'The platform found another gear.' : 'The quarter exposed the next hard decision.',
    boardVerdict: 'The public record follows canonical operating facts.',
    nextMandate: 'Protect the next quarter.',
    acknowledgedAtAbsoluteWeek: null,
});

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase22-player');
    const absoluteWeek = getAbsoluteWeek(50, 20);
    const weeklyHistory = Array.from({ length: 12 }, (_, index) => makeSnapshot(absoluteWeek - 12 + index, 3_000_000 + index * 80_000));
    return {
        ...player,
        id: 'phase22-player',
        name: 'Ari Vale',
        age: 50,
        currentWeek: 20,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#d9b56d',
                secondaryColor: '#07090d',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 80,
                publicManifesto: 'Event stories built for a worldwide audience.',
            },
            launchCommit: {
                id: 'phase22-launch',
                idempotencyKey: 'phase22-launch',
                committedAtAbsoluteWeek: absoluteWeek - 24,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 0,
                readinessScore: 96,
                forecastLikelyConcurrentStreams: 8_000_000,
                forecastHighConcurrentStreams: 14_000_000,
                protectedPeakConcurrentStreams: 30_000_000,
                launchHeadroomPercent: 114,
                initialSubscribers: 2_000_000,
                openingDemandIndex: 88,
                playbackSuccessRate: 99.4,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 8,
                openingOriginalTitle: 'Signal Fire',
            },
            leadership: {
                ...initial.leadership,
                appointments: [{
                    id: 'phase22-cfo-appointment',
                    executiveId: 'phase22-cfo',
                    role: 'CFO',
                    nameAtAppointment: 'Mira Chen',
                    status: 'ACTIVE',
                    origin: 'PLAYER_HIRED',
                    appointedAtAbsoluteWeek: absoluteWeek - 10,
                    endedAtAbsoluteWeek: null,
                    weeklyCompensation: 150_000,
                    skill: 88,
                    loyalty: 78,
                    ambition: 70,
                    ethics: 90,
                    preferredStrategy: 'MARGIN_FIRST',
                    founderRelationship: 74,
                    internalRelationship: 74,
                    performance: 82,
                    level: 3,
                    experience: 200,
                }],
            },
            governance: {
                ...initial.governance,
                boardConfidence: 78,
                directors: [{
                    id: 'phase22-director',
                    candidateId: 'phase22-director',
                    name: 'Leila Stone',
                    seatType: 'INDEPENDENT',
                    status: 'ACTIVE',
                    preferredStrategy: 'BALANCED',
                    independence: 92,
                    founderRelationship: 70,
                    weeklyCompensation: 80_000,
                    appointedAtAbsoluteWeek: absoluteWeek - 10,
                    endedAtAbsoluteWeek: null,
                    linkedInvestorId: null,
                }],
            },
            competitiveWorld: {
                ...initial.competitiveWorld,
                rivals: [{
                    platformId: 'NETFLIX',
                    platformName: 'StreamFlix',
                    ceoName: 'Rhea Kane',
                    ceoPersonality: 'Patient consolidator',
                    strategy: 'SCALE_DOMINANCE',
                    baseMonthlyPrice: 15.99,
                    perceivedValue: 86,
                    activeRegionIds: ['NORTH_AMERICA'],
                    copiedTechnologyBranches: [],
                    cashReserveMillions: 80_000,
                    subscribersMillions: 220,
                    technology: 90,
                    catalogPower: 90,
                    prestige: 88,
                    aggression: 96,
                    preferredGenres: ['DRAMA'],
                    preferredRegions: ['NORTH_AMERICA'],
                    cooldownUntilAbsoluteWeek: 0,
                    lastMoveAbsoluteWeek: null,
                    mistakes: 0,
                    memory: {
                        respect: 40,
                        resentment: 80,
                        encounters: 3,
                        rivalWins: 2,
                        playerDefences: 0,
                        lastMoveType: null,
                    },
                }],
            },
            founderOwnershipPercent: 60,
            finance: {
                ...initial.finance,
                equityHolders: [{
                    id: 'legacy-growth-pool',
                    holderName: 'Growth investor pool',
                    ownershipPercent: 40,
                    investedCapital: 300_000_000,
                    issuedAtAbsoluteWeek: absoluteWeek - 20,
                }],
            },
            treasuryCash: 900_000_000,
            metrics: {
                ...initial.metrics,
                subscribers: 4_000_000,
                technologyHealth: 91,
                engagementRate: 0.72,
                cashRunwayWeeks: 80,
            },
            weeklyHistory,
            cycleReviews: [createReview(1, absoluteWeek - 1, 'HEALTHY')],
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 25, 'The canonical foundation should preserve public markets in schema v25.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 19 }, 'phase22-migration');
assert(migrated.schemaVersion === 25 && migrated.publicCompany.lifecycle === 'PRIVATE', 'Schema v19 saves should migrate to a safe private-company state.');

let player = createFixture();
const privateView = getStreamingPublicMarkets(player);
assert(privateView.canStartRoadshow && privateView.readinessScore === 100, 'A mature platform with a CFO and canonical operating history should be IPO-ready.');
assert(player.ownedStreamingPlatform.publicCompany.lifecycle === 'PRIVATE', 'IPO readiness must not force the player public.');

let cinematicPlayer = createFixture();
let cinematicAction = startStreamingCinematicIpoJourney(cinematicPlayer, { ticker: 'CINE', ask: privateView.valuation, shares: 8_000_000 });
assert(cinematicAction.changed, 'The cinematic listing must create one persistent journey only after canonical readiness passes.');
cinematicPlayer = cinematicAction.player;
const journeyStartWeek = cinematicPlayer.ownedStreamingPlatform.publicCompany.ipoJourney!.startedAtAbsoluteWeek;
const checkpoint = {
    scene: 'DILIGENCE',
    ask: privateView.valuation,
    shares: 8_000_000,
    revision: 2,
    bankId: 'mc',
    marks: [{ id: 'cfo', label: 'CFO declined to certify.', short: 'CFO DECLINED', bookCost: .12 }],
    omit: { tech: false },
    answers: { q1: 'FULL' as const },
    attempt: 1,
    diligenceWeeks: 3,
    cut: .04,
    lowPrice: 10,
    highPrice: 12,
    anchorDiscountAccepted: true,
    employeeQuotaPercent: 4,
    interviewMove: .02,
    book: { cover: 2.2, buckets: [22, 35, 43], price: 11, extended: false },
    closePrice: 0,
    ticker: 'CINE',
};
cinematicAction = checkpointStreamingCinematicIpoJourney(cinematicPlayer, checkpoint);
assert(cinematicAction.changed && cinematicAction.player.ownedStreamingPlatform.publicCompany.ipoJourney?.scene === 'DILIGENCE', 'Every listing chapter must persist enough state to resume after a reload.');
cinematicPlayer = cinematicAction.player;
const journeyProcessedWeek = journeyStartWeek + 1;
cinematicPlayer = {
    ...cinematicPlayer,
    ownedStreamingPlatform: commitStreamingPublicMarketWeek(
        cinematicPlayer.ownedStreamingPlatform,
        cinematicPlayer,
        makeSnapshot(journeyProcessedWeek, cinematicPlayer.ownedStreamingPlatform.metrics.subscribers),
    ),
};
assert(cinematicPlayer.ownedStreamingPlatform.publicCompany.ipoJourney?.lastProcessedAbsoluteWeek === journeyProcessedWeek, 'A listing left open across the normal game loop must process each real week once without issuing shares early.');
const journeyAfterFirstProcess = commitStreamingPublicMarketWeek(
    cinematicPlayer.ownedStreamingPlatform,
    cinematicPlayer,
    makeSnapshot(journeyProcessedWeek, cinematicPlayer.ownedStreamingPlatform.metrics.subscribers),
).publicCompany.ipoJourney;
assert(journeyAfterFirstProcess?.lastProcessedAbsoluteWeek === journeyProcessedWeek, 'Reprocessing the same IPO preparation week must be idempotent.');
const treasuryBeforeCinematicListing = cinematicPlayer.ownedStreamingPlatform.treasuryCash;
const cinematicCommit = commitStreamingCinematicIpo(cinematicPlayer, {
    ticker: 'CINE', narrative: 'TECHNOLOGY_NETWORK', price: 11, preIpoShares: 45_000_001, newShares: 8_000_000,
    employeeQuotaPercent: 4, underwriterId: 'mc', underwriterName: 'Meridian Capital', firmBook: true,
    bookCoverage: 2.2, anchorDiscountAccepted: true, governanceMarks: checkpoint.marks.map(mark => mark.short),
    diligenceWeeks: 3, regulatorAttempts: 1,
});
assert(cinematicCommit.changed, 'A saved cinematic journey should commit once through the canonical listing boundary.');
assert(cinematicCommit.player.ownedStreamingPlatform.publicCompany.ipoJourney?.status === 'COMPLETED', 'The persistent journey should close without being deleted from the audit trail.');
assert(cinematicCommit.player.ownedStreamingPlatform.treasuryCash > treasuryBeforeCinematicListing, 'Cinematic IPO proceeds must enter company treasury through the canonical ledger.');
assert(!commitStreamingCinematicIpo(cinematicCommit.player, {
    ticker: 'CINE', narrative: 'TECHNOLOGY_NETWORK', price: 11, preIpoShares: 45_000_001, newShares: 8_000_000,
    employeeQuotaPercent: 4, underwriterId: 'mc', underwriterName: 'Meridian Capital', firmBook: true,
    bookCoverage: 2.2, anchorDiscountAccepted: true, governanceMarks: [], diligenceWeeks: 3, regulatorAttempts: 1,
}).changed, 'Replaying or reprocessing listing day must never mint a second share issue.');
assert(cinematicCommit.player.ownedStreamingPlatform.publicCompany.ipoPlan?.startedAtAbsoluteWeek === journeyStartWeek, 'The public record must retain the real week the multi-session listing began.');

let action = startStreamingIpoRoadshow(player, { ticker: 'NSTR', narrative: 'TECHNOLOGY_NETWORK', offerPercent: 20 });
assert(action.changed, 'An IPO-ready founder should be able to open a roadshow.');
player = action.player;
const plan = player.ownedStreamingPlatform.publicCompany.ipoPlan!;
assert(plan.institutionalDemandScore > 0 && plan.retailDemandScore > 0, 'Roadshow pricing must be backed by persistent institutional and retail demand.');
assert(!startStreamingIpoRoadshow(player, { ticker: 'NSTR', narrative: 'AUDIENCE_SCALE', offerPercent: 20 }).changed, 'The same company cannot open duplicate IPO roadshows.');

const founderBefore = player.ownedStreamingPlatform.founderOwnershipPercent;
const treasuryBefore = player.ownedStreamingPlatform.treasuryCash;
action = listStreamingPlatform(player, (plan.lowPrice + plan.highPrice) / 2);
assert(action.changed, 'The pricing committee should be able to list inside the disclosed range.');
player = action.player;
const listing = player.ownedStreamingPlatform.publicCompany.listing!;
assert(player.ownedStreamingPlatform.publicCompany.lifecycle === 'PUBLIC', 'Listing should permanently change the issuer to public.');
assert(player.ownedStreamingPlatform.founderOwnershipPercent === Math.round(founderBefore * 0.8 * 100) / 100, 'Primary IPO shares should dilute canonical founder ownership.');
assert(player.ownedStreamingPlatform.treasuryCash === treasuryBefore + listing.capitalRaised, 'IPO capital must enter company treasury rather than player cash.');
assert(player.ownedStreamingPlatform.finance.equityHolders.some(holder => holder.holderName === 'Public shareholder float'), 'The public float should enter the canonical equity holder record.');
assert(player.ownedStreamingPlatform.cinematicQueue.filter(event => event.type === 'IPO_LISTING').length === 1, 'Listing should queue one fact-backed major cinematic.');
assert(!listStreamingPlatform(player, plan.highPrice).changed, 'Listing cannot be committed twice.');

action = issueStreamingPublicGuidance(player, 'AMBITIOUS');
assert(action.changed, 'A public company should be able to issue next-quarter guidance.');
player = action.player;
assert(!issueStreamingPublicGuidance(player, 'CONSERVATIVE').changed, 'Only one active guidance package can cover a quarter.');

const reportWeek = getAbsoluteWeek(player.age, player.currentWeek) + 1;
const missReview = createReview(2, reportWeek, 'MISS');
const reportSnapshot = makeSnapshot(reportWeek, missReview.subscriberEnd, -250_000);
player = {
    ...player,
    ownedStreamingPlatform: {
        ...player.ownedStreamingPlatform,
        cycleReviews: [...player.ownedStreamingPlatform.cycleReviews, missReview],
    },
};
player = {
    ...player,
    ownedStreamingPlatform: commitStreamingPublicMarketWeek(player.ownedStreamingPlatform, player, reportSnapshot),
};
assert(player.ownedStreamingPlatform.publicCompany.quoteHistory.at(-1)?.absoluteWeek === reportWeek, 'Every processed public week should create one deterministic OHLC quote.');
assert(player.ownedStreamingPlatform.publicCompany.earnings.at(-1)?.outcome === 'MISS', 'A weak canonical review should miss ambitious public guidance.');
assert(player.ownedStreamingPlatform.publicCompany.shareholderVotes.some(vote => vote.status === 'OPEN'), 'Public earnings should create a weighted shareholder ballot.');
assert(player.ownedStreamingPlatform.publicCompany.activistCampaigns.some(campaign => campaign.status === 'ACTIVE'), 'A material miss should be able to create persistent activist pressure.');
assert(player.ownedStreamingPlatform.publicCompany.hostileTakeovers.some(takeover => takeover.status === 'ACTIVE'), 'Low founder control, activist pressure and an aggressive funded rival should create a hostile tender.');
const quotesBeforeReplay = player.ownedStreamingPlatform.publicCompany.quoteHistory.length;
assert(commitStreamingPublicMarketWeek(player.ownedStreamingPlatform, player, reportSnapshot).publicCompany.quoteHistory.length === quotesBeforeReplay, 'Public quote processing must be exactly once per game week.');

const openVote = player.ownedStreamingPlatform.publicCompany.shareholderVotes.find(vote => vote.status === 'OPEN')!;
action = castStreamingShareholderVote(player, openVote.id, 'FOR');
assert(action.changed, 'The founder should cast actual voting power into a public resolution.');
player = action.player;
assert(player.ownedStreamingPlatform.publicCompany.shareholderVotes.find(vote => vote.id === openVote.id)?.finalSupport !== null, 'A shareholder result should persist final weighted support.');

const activist = player.ownedStreamingPlatform.publicCompany.activistCampaigns.find(campaign => campaign.status === 'ACTIVE')!;
action = respondToStreamingActivist(player, activist.id, 'ENGAGE');
assert(action.changed, 'The player should be able to negotiate an activist campaign with a real treasury cost.');
player = action.player;
assert(player.ownedStreamingPlatform.publicCompany.activistCampaigns.find(campaign => campaign.id === activist.id)?.status === 'NEGOTIATED', 'The activist response should persist its consequence.');

const takeover = player.ownedStreamingPlatform.publicCompany.hostileTakeovers.find(item => item.status === 'ACTIVE')!;
action = resolveStreamingHostileTakeover(player, takeover.id, 'NEGOTIATE');
assert(action.changed, 'A hostile tender must have a recoverable settlement route.');
player = action.player;
assert(player.ownedStreamingPlatform.publicCompany.hostileTakeovers.find(item => item.id === takeover.id)?.status === 'SETTLED', 'A negotiated tender should resolve without game-over.');
assert(player.ownedStreamingPlatform.leadership.currentCeo.holderType === 'FOUNDER', 'Losing control must keep the player in a recoverable operator role.');
assert(player.ownedStreamingPlatform.cinematicQueue.filter(event => event.type === 'HOSTILE_TAKEOVER_DEFENCE').length === 1, 'Tender resolution should queue one fact-backed defence cinematic.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingPublicMarkets.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-public-markets.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const weekly = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert(component.includes('Remaining private forever') && component.includes('No content is locked'), 'The UI must preserve private-company viability and avoid content monetization gates.');
assert(component.includes('IPO_LISTING') && component.includes('HOSTILE_TAKEOVER_DEFENCE'), 'Both locked Phase 22 cinematics must be presented from committed facts.');
assert(component.includes('PriceChart') && component.includes('INVESTOR RELATIONS') && component.includes('SHAREHOLDER CHAMBER'), 'The public-market command floor should include price history, earnings and issuer voting.');
assert(styles.includes('@media (max-width: 760px)') && styles.includes('@media (prefers-reduced-motion: reduce)'), 'Public Markets must include explicit mobile and reduced-motion treatment.');
assert(hq.includes('StreamingPublicMarkets') && hq.includes('PUBLIC MARKETS'), 'Company HQ should launch the public-market command floor as a first-class room.');
assert(weekly.includes('commitStreamingPublicMarketWeek'), 'The canonical weekly loop should commit public quotes and quarter events.');
assert(!component.includes('server hack') && !component.includes('Buy IPO') && !component.includes('$7 pack'), 'Phase 22 must not leak Phase 23 shadow operations or Phase 25 monetized power.');

console.log('✓ Streaming IPO and Public Company Phase 22 audit passed');
