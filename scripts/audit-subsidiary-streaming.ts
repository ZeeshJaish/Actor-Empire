import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import { processGameWeek } from '../services/gameLoop';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const studio: Business = {
    id: 'qa_autorun_label',
    name: 'QA Autonomous Label',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: 'FILM',
    color: 'bg-emerald-500',
    foundedWeek: 1,
    balance: 400_000_000,
    isActive: true,
    config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM', marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 } },
    stats: {
        weeklyRevenue: 0,
        weeklyExpenses: 0,
        weeklyProfit: 0,
        lifetimeRevenue: 0,
        valuation: 720_000_000,
        brandHealth: 72,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 65,
        studioMomentum: 65,
        investorConfidence: 68,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        ...createDefaultStudioState(20),
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 1,
        acquiredYear: 31,
        operatingModel: 'INDEPENDENT_LABEL',
    },
};

const player = clone(INITIAL_PLAYER) as Player;
player.age = 31;
player.currentWeek = 20;
player.businesses = [studio];
player.commitments = [];
player.activeReleases = [{
    id: 'qa_autorun_series',
    name: 'Signal Room',
    type: 'SERIES',
    roleType: 'LEAD',
    projectDetails: {
        title: 'Signal Room',
        sourceScriptId: 'qa_autorun_script',
        isOriginal: true,
        type: 'SERIES',
        format: 'LIVE_ACTION',
        episodes: 8,
        description: 'Autonomous series streaming QA.',
        studioId: studio.id,
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        targetAudience: 'PG-13',
        budgetTier: 'MID',
        estimatedBudget: 60_000_000,
        releaseScale: 'MASS',
        releaseStrategy: 'STREAMING_ONLY',
        visibleHype: 'MID',
        hiddenStats: {
            scriptQuality: 77,
            directorQuality: 75,
            castingStrength: 70,
            distributionPower: 72,
            rawHype: 65,
            qualityScore: 76,
            prestigeBonus: 0,
            backendPct: 10,
            subsidiaryStreamingContract: true,
        },
        directorName: 'QA Director',
        visibleDirectorTier: 'Established',
        visibleScriptBuzz: 'Good',
        visibleCastStrength: 'Solid',
    },
    distributionPhase: 'STREAMING',
    weekNum: 1,
    weeklyGross: [],
    totalGross: 0,
    budget: 60_000_000,
    status: 'RUNNING',
    productionPerformance: 76,
    imdbRating: 7.8,
    promotionalBuzz: 65,
    studioRoyaltyPercentage: 10,
    streamingRevenue: 48_000_000,
    streamingUpfrontFee: 48_000_000,
    streamingRoyaltyRevenue: 0,
    streaming: { platformId: 'NETFLIX', weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false },
}];

const firstWeek = await processGameWeek(player);
const firstStudio = firstWeek.player.businesses.find(business => business.id === studio.id)!;
const firstRelease = firstWeek.player.activeReleases.find(release => release.id === 'qa_autorun_series');
const firstDealEntries = firstStudio.studioState?.financeLedger?.filter(entry => entry.type === 'STREAMING_DEAL' && entry.projectId === 'qa_autorun_series') || [];
const firstRoyaltyEntries = firstStudio.studioState?.financeLedger?.filter(entry => entry.type === 'STREAMING_ROYALTY' && entry.projectId === 'qa_autorun_series') || [];
assert(
    firstDealEntries.length === 1
    && firstDealEntries[0].amount > 0
    && firstDealEntries[0].amount === firstRelease?.streamingUpfrontFee,
    'Autonomous streaming releases must credit their upfront deal exactly once.'
);
assert(firstRoyaltyEntries.length === 1 && firstRoyaltyEntries[0].amount > 0, 'Autonomous streaming releases must generate view-based studio royalties.');
assert(firstRelease?.projectDetails.hiddenStats.subsidiaryStreamingUpfrontPaid, 'The release must persist its paid-upfront marker after the first streaming week.');

const secondWeek = await processGameWeek(firstWeek.player);
const secondStudio = secondWeek.player.businesses.find(business => business.id === studio.id)!;
const secondDealEntries = secondStudio.studioState?.financeLedger?.filter(entry => entry.type === 'STREAMING_DEAL' && entry.projectId === 'qa_autorun_series') || [];
const secondRoyaltyEntries = secondStudio.studioState?.financeLedger?.filter(entry => entry.type === 'STREAMING_ROYALTY' && entry.projectId === 'qa_autorun_series') || [];
assert(secondDealEntries.length === 1, 'Retrying later streaming weeks must not duplicate an autonomous upfront payment.');
assert(secondRoyaltyEntries.length >= 2, 'Autonomous streaming releases must keep collecting royalties after the upfront week.');

const makePostTheatricalBidPlayer = (
    operatingModel: 'INDEPENDENT_LABEL' | 'CONTROLLED_SUBSIDIARY',
    suffix: string,
) => {
    const biddingPlayer = clone(INITIAL_PLAYER) as Player;
    const biddingStudio = clone(studio);
    biddingStudio.id = `qa_${suffix}_label`;
    biddingStudio.name = operatingModel === 'INDEPENDENT_LABEL' ? 'QA Independent Label' : 'QA Controlled Label';
    biddingStudio.studioState!.operatingModel = operatingModel;
    const biddingRelease = clone(player.activeReleases[0]);
    biddingRelease.id = `qa_${suffix}_movie`;
    biddingRelease.name = operatingModel === 'INDEPENDENT_LABEL' ? 'Independent Run' : 'Controlled Run';
    biddingRelease.type = 'MOVIE';
    biddingRelease.projectDetails = {
        ...biddingRelease.projectDetails,
        title: biddingRelease.name,
        type: 'MOVIE',
        studioId: biddingStudio.id,
        releaseStrategy: 'THEATRICAL',
        hiddenStats: {
            ...biddingRelease.projectDetails.hiddenStats,
            subsidiaryStreamingContract: false,
            subsidiaryStreamingUpfrontPaid: false,
        },
    };
    biddingRelease.distributionPhase = 'STREAMING_BIDDING';
    biddingRelease.status = 'FINISHED';
    biddingRelease.streaming = undefined;
    biddingRelease.streamingRevenue = 0;
    biddingRelease.streamingUpfrontFee = 0;
    biddingRelease.streamingRoyaltyRevenue = 0;
    biddingRelease.bids = [
        { platformId: 'NETFLIX', upfront: 31_000_000, royalty: 7, duration: 52 },
        { platformId: 'APPLE_TV', upfront: 42_000_000, royalty: 9, duration: 52 },
        { platformId: 'HULU', upfront: 36_000_000, royalty: 8, duration: 52 },
    ];
    biddingPlayer.age = 31;
    biddingPlayer.currentWeek = 24;
    biddingPlayer.businesses = [biddingStudio];
    biddingPlayer.commitments = [];
    biddingPlayer.activeReleases = [biddingRelease];
    return biddingPlayer;
};

const independentBidWeek = await processGameWeek(makePostTheatricalBidPlayer('INDEPENDENT_LABEL', 'independent'));
const independentBidStudio = independentBidWeek.player.businesses.find(business => business.id === 'qa_independent_label')!;
const independentBidRelease = independentBidWeek.player.activeReleases.find(release => release.id === 'qa_independent_movie');
const independentDealEntries = independentBidStudio.studioState?.financeLedger?.filter(entry => (
    entry.type === 'STREAMING_DEAL'
    && entry.projectId === 'qa_independent_movie'
)) || [];
assert(independentBidRelease?.distributionPhase === 'STREAMING', 'Independent subsidiaries must close their own post-theatrical streaming deal.');
assert(independentBidRelease?.streaming?.platformId === 'APPLE_TV', 'Independent subsidiaries must automatically choose the strongest available upfront offer.');
assert(independentBidRelease?.bids === undefined, 'An automatically closed independent-label deal must clear its pending bids.');
assert(
    independentDealEntries.length === 1 && independentDealEntries[0].amount === 42_000_000,
    'The automatic independent-label deal must credit the winning upfront payment exactly once.',
);

const controlledBidWeek = await processGameWeek(makePostTheatricalBidPlayer('CONTROLLED_SUBSIDIARY', 'controlled'));
const controlledBidStudio = controlledBidWeek.player.businesses.find(business => business.id === 'qa_controlled_label')!;
const controlledBidRelease = controlledBidWeek.player.activeReleases.find(release => release.id === 'qa_controlled_movie');
const controlledDealEntries = controlledBidStudio.studioState?.financeLedger?.filter(entry => (
    entry.type === 'STREAMING_DEAL'
    && entry.projectId === 'qa_controlled_movie'
)) || [];
assert(controlledBidRelease?.distributionPhase === 'STREAMING_BIDDING', 'Controlled subsidiaries must leave platform selection to the player.');
assert(controlledBidRelease?.bids?.length === 3, 'Controlled subsidiary offers must remain available for the Release Wizard.');
assert(controlledDealEntries.length === 0, 'Controlled subsidiaries must not auto-credit a deal before the player accepts it.');

console.log('Subsidiary streaming audit passed.');
