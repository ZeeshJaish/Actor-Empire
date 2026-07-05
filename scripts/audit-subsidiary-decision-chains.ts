import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    processSubsidiaryDecisionEngine,
    resolveSubsidiaryDecision,
} from '../services/subsidiaryDecisions';
import type { Business, Player, SubsidiaryDecisionType, SubsidiaryOperatingModel } from '../types';

const createStudio = ({
    id,
    name,
    model = 'CONTROLLED_SUBSIDIARY',
    focus = 'COMMERCIAL_HITS',
    objective = 'COMMERCIAL_FIRST',
    ipStrategy = 'MIXED',
    releasePace = 'STEADY',
    budgetAppetite = 'STANDARD',
    creativeAppetite = 'CALCULATED',
    weeklyProfit = 2_000_000,
    balance = 300_000_000,
    recentFlopStreak = 0,
    investorConfidence = 68,
}: {
    id: string;
    name: string;
    model?: SubsidiaryOperatingModel;
    focus?: Business['studioState']['operatingMandate']['focus'];
    objective?: Business['studioState']['operatingMandate']['objective'];
    ipStrategy?: Business['studioState']['operatingMandate']['ipStrategy'];
    releasePace?: Business['studioState']['operatingMandate']['releasePace'];
    budgetAppetite?: Business['studioState']['operatingMandate']['budgetAppetite'];
    creativeAppetite?: Business['studioState']['operatingMandate']['creativeAppetite'];
    weeklyProfit?: number;
    balance?: number;
    recentFlopStreak?: number;
    investorConfidence?: number;
}): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: '🏛️',
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
        theme: 'Subsidiary',
        productionType: id === 'hq' ? 'Original Studio' : 'Acquired Studio',
        amenities: [],
    },
    stats: {
        weeklyRevenue: Math.max(0, weeklyProfit + 5_000_000),
        weeklyExpenses: 5_000_000,
        weeklyProfit,
        lifetimeRevenue: 0,
        valuation: balance * 3,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 60,
        studioMomentum: 62,
        investorConfidence,
        recentFlopStreak,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        ...createDefaultStudioState(1),
        acquisitionOrigin: id === 'hq' ? undefined : 'STUDIO_ACQUISITION',
        acquiredWeek: 1,
        acquiredYear: 31,
        operatingModel: model,
        operatingMandate: {
            focus,
            budgetAppetite,
            releasePace,
            ipStrategy,
            talentPolicy: 'MIXED',
            objective,
            creativeAppetite,
            autoProduction: 'BOARD_REVIEW',
        },
    },
});

const makePlayer = (studios: Business[]): Player => ({
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 30,
    businesses: [createStudio({ id: 'hq', name: 'Empire Pictures', model: 'CONTROLLED_SUBSIDIARY' }), ...studios],
    pastProjects: [
        {
            id: 'past_dormant_1',
            name: 'Iron Eclipse',
            studioId: 'franchise_studio',
            genre: 'SUPERHERO',
            projectType: 'MOVIE',
            franchiseId: 'iron_eclipse',
            installmentNumber: 1,
            finalRating: 7.2,
            boxOffice: 420_000_000,
            budget: 160_000_000,
            releaseWeek: 1,
            releaseYear: 29,
        } as any,
    ],
    inbox: [],
    news: [],
    logs: [],
});

const expectDecision = (studio: Business | undefined, type: SubsidiaryDecisionType) => {
    const decision = studio?.studioState?.subsidiaryDecisions?.find(item => item.status === 'PENDING');
    if (!decision) throw new Error(`Expected ${studio?.name} to receive a pending decision.`);
    if (decision.type !== type) {
        throw new Error(`Expected ${studio?.name} decision ${type}, received ${decision.type}.`);
    }
    if (!decision.followUp || !decision.followUp.label || !decision.followUp.effect) {
        throw new Error(`${type} should carry a consequence-chain follow-up preview.`);
    }
    return decision;
};

const studios = [
    createStudio({
        id: 'franchise_studio',
        name: 'Franchise House',
        focus: 'FRANCHISE_EXPANSION',
        ipStrategy: 'SEQUELS_REBOOTS',
        weeklyProfit: 3_000_000,
    }),
    createStudio({
        id: 'streaming_studio',
        name: 'Streaming Label',
        focus: 'SERIES_FIRST',
        objective: 'PROFIT_FIRST',
        weeklyProfit: 3_000_000,
    }),
    createStudio({
        id: 'flop_studio',
        name: 'Flop Factory',
        recentFlopStreak: 3,
        weeklyProfit: 1_000_000,
    }),
    createStudio({
        id: 'independence_studio',
        name: 'Prestige Arm',
        focus: 'PRESTIGE_AWARDS',
        objective: 'PRESTIGE_FIRST',
        investorConfidence: 88,
        weeklyProfit: 4_000_000,
    }),
];

const processed = processSubsidiaryDecisionEngine(makePlayer(studios));

const franchiseDecision = expectDecision(processed.businesses.find(studio => studio.id === 'franchise_studio'), 'DORMANT_FRANCHISE');
expectDecision(processed.businesses.find(studio => studio.id === 'streaming_studio'), 'PARTNERSHIP');
expectDecision(processed.businesses.find(studio => studio.id === 'flop_studio'), 'FLOP_RESPONSE');
expectDecision(processed.businesses.find(studio => studio.id === 'independence_studio'), 'INDEPENDENCE_REQUEST');

const approved = resolveSubsidiaryDecision({
    player: processed,
    studioId: 'franchise_studio',
    decisionId: franchiseDecision.id,
    optionId: 'APPROVE',
});

if (!approved.success) {
    throw new Error('Approving a dormant-franchise decision should succeed.');
}

const approvedStudio = approved.player.businesses.find(studio => studio.id === 'franchise_studio')!;
const resolved = approvedStudio.studioState?.subsidiaryDecisions?.find(decision => decision.id === franchiseDecision.id);
if (!resolved?.outcomeSummary?.includes(franchiseDecision.relatedTitle || '')) {
    throw new Error('Dormant franchise approval should produce a franchise-specific outcome summary.');
}
if ((approvedStudio.stats.studioMomentum || 0) <= (processed.businesses.find(studio => studio.id === 'franchise_studio')?.stats.studioMomentum || 0)) {
    throw new Error('Dormant franchise approval should improve studio momentum.');
}
if (!approved.player.news.some(item => item.subtext.includes(franchiseDecision.followUp?.effect || ''))) {
    throw new Error('Resolved chained decisions should publish a follow-up consequence in news.');
}

console.log('Subsidiary decision chains audit passed.');
