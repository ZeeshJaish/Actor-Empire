import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    getSubsidiaryPersonality,
    processSubsidiaryDecisionEngine,
    resolveSubsidiaryDecision,
} from '../services/subsidiaryDecisions';
import type { Business, Player } from '../types';

const createStudio = (id: string, name: string, model: Business['studioState']['operatingModel'], balance = 240_000_000): Business => ({
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
        productionType: id === 'parent_studio' ? 'Original Studio' : 'Acquired Studio',
        amenities: [],
    },
    stats: {
        weeklyRevenue: 4_000_000,
        weeklyExpenses: 3_000_000,
        weeklyProfit: 1_000_000,
        lifetimeRevenue: 0,
        valuation: balance * 2,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 60,
        studioMomentum: 62,
        investorConfidence: 66,
        recentFlopStreak: 0,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        ...createDefaultStudioState(1),
        acquisitionOrigin: id === 'parent_studio' ? undefined : 'STUDIO_ACQUISITION',
        acquiredWeek: 1,
        acquiredYear: 31,
        operatingModel: model,
        operatingMandate: {
            focus: 'COMMERCIAL_HITS',
            budgetAppetite: 'PREMIUM',
            releasePace: 'AGGRESSIVE',
            ipStrategy: 'MIXED',
            talentPolicy: 'STAR_POWER',
            objective: 'COMMERCIAL_FIRST',
            creativeAppetite: 'BOLD',
            autoProduction: 'BOARD_REVIEW',
        },
    },
});

const parentStudio = createStudio('parent_studio', 'Empire Pictures', undefined, 900_000_000);
const controlledStudio = createStudio('controlled_studio', 'Artisan Pictures', 'CONTROLLED_SUBSIDIARY');
const independentStudio = {
    ...createStudio('independent_studio', 'Velvet Pictures', 'INDEPENDENT_LABEL', 20_000_000),
    stats: {
        ...createStudio('independent_studio', 'Velvet Pictures', 'INDEPENDENT_LABEL', 20_000_000).stats,
        weeklyProfit: -4_000_000,
    },
};
const cashRichLossStudio = {
    ...createStudio('cash_rich_loss_studio', 'Searchlight Vault', 'INDEPENDENT_LABEL', 5_000_000_000),
    stats: {
        ...createStudio('cash_rich_loss_studio', 'Searchlight Vault', 'INDEPENDENT_LABEL', 5_000_000_000).stats,
        weeklyRevenue: 10_000_000,
        weeklyExpenses: 16_000_000,
        weeklyProfit: -6_000_000,
    },
};
const mergedStudio = createStudio('merged_studio', 'Merged Banner', 'FULL_MERGER');

const player: Player = {
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 24,
    businesses: [parentStudio, controlledStudio, independentStudio, cashRichLossStudio, mergedStudio],
    inbox: [],
    news: [],
    logs: [],
};

if (getSubsidiaryPersonality(controlledStudio) !== 'Aggressive') {
    throw new Error('Aggressive mandates should produce an Aggressive subsidiary personality.');
}

const processed = processSubsidiaryDecisionEngine(player);
const processedControlled = processed.businesses.find(business => business.id === controlledStudio.id)!;
const processedIndependent = processed.businesses.find(business => business.id === independentStudio.id)!;
const processedCashRichLoss = processed.businesses.find(business => business.id === cashRichLossStudio.id)!;
const processedMerged = processed.businesses.find(business => business.id === mergedStudio.id)!;

const controlledDecision = processedControlled.studioState?.subsidiaryDecisions?.find(decision => decision.status === 'PENDING');
if (!controlledDecision) {
    throw new Error('Eligible controlled subsidiaries should create pending board decisions.');
}
if (!controlledDecision.logic.length || controlledDecision.options.length < 2) {
    throw new Error('Subsidiary decisions should explain the logic and offer at least two choices.');
}
if (!processed.inbox.some(message => message.data?.decisionId === controlledDecision.id && message.subject.includes(controlledDecision.title))) {
    throw new Error('New subsidiary decisions should notify the player inbox.');
}
if (processedMerged.studioState?.subsidiaryDecisions?.length) {
    throw new Error('Merged studios should not generate separate subsidiary decisions.');
}

const emergencyDecision = processedIndependent.studioState?.subsidiaryDecisions?.find(decision => decision.type === 'EMERGENCY_CAPITAL');
if (!emergencyDecision) {
    throw new Error('Underfunded loss-making subsidiaries should prefer emergency capital decisions.');
}
const cashRichEmergency = processedCashRichLoss.studioState?.subsidiaryDecisions?.find(decision => decision.type === 'EMERGENCY_CAPITAL');
if (cashRichEmergency) {
    throw new Error('Cash-rich subsidiaries with long runway should not spam headquarters for emergency capital.');
}

const approvedRisk = resolveSubsidiaryDecision({
    player: processed,
    studioId: controlledStudio.id,
    decisionId: controlledDecision.id,
    optionId: 'APPROVE',
});
if (!approvedRisk.success) {
    throw new Error('Approving a pending subsidiary decision should succeed.');
}
const approvedStudio = approvedRisk.player.businesses.find(business => business.id === controlledStudio.id)!;
const resolvedDecision = approvedStudio.studioState?.subsidiaryDecisions?.find(decision => decision.id === controlledDecision.id);
if (resolvedDecision?.status !== 'RESOLVED' || resolvedDecision.selectedOptionId !== 'APPROVE') {
    throw new Error('Resolved decisions should record the chosen option.');
}
if (controlledDecision.type === 'RISKY_PRODUCTION' && !approvedStudio.studioState?.subsidiaryProjectProposals?.length) {
    throw new Error('Approving risky production should create a real project proposal.');
}
if (!approvedRisk.player.news.some(item => item.headline.includes(controlledDecision.title) || item.subtext.includes(resolvedDecision?.outcomeSummary || ''))) {
    throw new Error('Resolving subsidiary decisions should generate industry news.');
}

const declinedEmergency = resolveSubsidiaryDecision({
    player: processed,
    studioId: independentStudio.id,
    decisionId: emergencyDecision.id,
    optionId: 'DECLINE',
});
if (!declinedEmergency.success) {
    throw new Error('Declining an emergency capital decision should succeed.');
}
const declinedStudio = declinedEmergency.player.businesses.find(business => business.id === independentStudio.id)!;
if ((declinedStudio.stats.investorConfidence || 0) >= (processedIndependent.stats.investorConfidence || 0)) {
    throw new Error('Declining emergency capital should reduce investor confidence.');
}

console.log('Subsidiary decisions audit passed.');
