import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    processSubsidiaryDecisionEngine,
    resolveSubsidiaryDecision,
} from '../services/subsidiaryDecisions';
import type { Business, Player } from '../types';

const createStreamingStudio = (): Business => ({
    id: 'streaming_arc_studio',
    name: 'Streaming Arc Label',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: '📡',
    color: 'bg-sky-500',
    foundedWeek: 1,
    balance: 380_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
        theme: 'Streaming',
        productionType: 'Acquired Studio',
        amenities: [],
    },
    stats: {
        weeklyRevenue: 11_000_000,
        weeklyExpenses: 7_000_000,
        weeklyProfit: 4_000_000,
        lifetimeRevenue: 0,
        valuation: 1_140_000_000,
        brandHealth: 72,
        customerSatisfaction: 70,
        riskLevel: 18,
        hype: 61,
        studioMomentum: 64,
        investorConfidence: 69,
        recentFlopStreak: 0,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        ...createDefaultStudioState(1),
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 1,
        acquiredYear: 31,
        operatingModel: 'CONTROLLED_SUBSIDIARY',
        operatingMandate: {
            focus: 'SERIES_FIRST',
            budgetAppetite: 'STANDARD',
            releasePace: 'STEADY',
            ipStrategy: 'MIXED',
            talentPolicy: 'MIXED',
            objective: 'PROFIT_FIRST',
            creativeAppetite: 'CALCULATED',
            autoProduction: 'BOARD_REVIEW',
        },
    },
});

const makePlayer = (): Player => ({
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 30,
    businesses: [createStreamingStudio()],
    inbox: [],
    news: [],
    logs: [],
});

const processed = processSubsidiaryDecisionEngine(makePlayer());
const studio = processed.businesses.find(business => business.id === 'streaming_arc_studio')!;
const decision = studio.studioState?.subsidiaryDecisions?.find(item => item.status === 'PENDING');

if (!decision || decision.type !== 'PARTNERSHIP') {
    throw new Error(`Expected a partnership decision, received ${decision?.type || 'none'}.`);
}

const approved = resolveSubsidiaryDecision({
    player: processed,
    studioId: studio.id,
    decisionId: decision.id,
    optionId: 'APPROVE',
});

if (!approved.success) {
    throw new Error(`Partnership decision should resolve successfully, got ${approved.reason || 'unknown'}.`);
}

const approvedStudio = approved.player.businesses.find(business => business.id === studio.id)!;
const activeArc = approvedStudio.studioState?.activeDecisionArcs?.find(arc => arc.sourceDecisionId === decision.id);

if (!activeArc) {
    throw new Error('Resolving a chained decision should create an active decision storyline.');
}
if (activeArc.status !== 'ACTIVE') {
    throw new Error(`New decision arc should start ACTIVE, received ${activeArc.status}.`);
}
if (!activeArc.nextPulseWeek || activeArc.nextPulseWeek <= approved.player.currentWeek) {
    throw new Error('Decision arc should schedule a future pulse week.');
}
if (!activeArc.beats.length || !activeArc.beats[0].effect) {
    throw new Error('Decision arc should describe upcoming consequences.');
}

const advancedPlayer = {
    ...approved.player,
    currentWeek: activeArc.nextPulseWeek,
};
const advanced = processSubsidiaryDecisionEngine(advancedPlayer);
const advancedStudio = advanced.businesses.find(business => business.id === studio.id)!;
const advancedArc = advancedStudio.studioState?.activeDecisionArcs?.find(arc => arc.id === activeArc.id);

if (!advancedArc || advancedArc.beatsResolved < 1) {
    throw new Error('Weekly decision engine should advance active decision storylines.');
}
if (!advanced.news.some(item => item.headline.includes(activeArc.title) || item.subtext.includes(activeArc.beats[0]?.label || ''))) {
    throw new Error('Advancing a decision storyline should publish world/news feedback.');
}
if (!advanced.logs.some(log => log.message.includes(activeArc.title))) {
    throw new Error('Advancing a decision storyline should add a studio log entry.');
}

console.log('Subsidiary decision arcs audit passed.');
