import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    approveSubsidiaryProjectProposal,
    processSubsidiaryAutonomousOperations,
    rejectSubsidiaryProjectProposal,
} from '../services/subsidiaryOperations';
import type { Business, Player } from '../types';

const createStudio = (id: string, name: string, model: Business['studioState']['operatingModel'], balance = 500_000_000): Business => ({
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
        theme: 'Studio Group',
        productionType: id === 'parent_studio' ? 'Original Studio' : 'Acquired Studio',
        amenities: [],
    },
    stats: {
        weeklyRevenue: 0,
        weeklyExpenses: 0,
        weeklyProfit: 0,
        lifetimeRevenue: 0,
        valuation: balance * 1.8,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 60,
        studioMomentum: 62,
        investorConfidence: 66,
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
        ownedRights: id === 'controlled_studio' ? [{
            id: 'right_stellar_guard',
            sourceOpportunityId: 'market_stellar_guard',
            title: 'Stellar Guard',
            sellerName: 'Old Rights Co.',
            propertyType: 'CHARACTER',
            archetype: 'DORMANT_HERO',
            primaryGenre: 'SUPERHERO',
            rarity: 'RARE',
            accent: 'sky',
            emblemKey: 'SHIELD',
            dealType: 'BUYOUT',
            purchasePrice: 150_000_000,
            acquiredWeek: 1,
            acquiredYear: 31,
            projectsUsed: 0,
            status: 'ACTIVE',
        }] : [],
        operatingMandate: {
            focus: id === 'controlled_studio' ? 'FRANCHISE_EXPANSION' : 'COMMERCIAL_HITS',
            budgetAppetite: id === 'controlled_studio' ? 'PREMIUM' : 'STANDARD',
            releasePace: 'AGGRESSIVE',
            ipStrategy: id === 'controlled_studio' ? 'OWNED_IP' : 'ORIGINALS',
            talentPolicy: 'MIXED',
            objective: 'COMMERCIAL_FIRST',
            creativeAppetite: 'CALCULATED',
            autoProduction: id === 'paused_studio' ? 'PAUSED' : 'BOARD_REVIEW',
        },
    },
});

const parentStudio = createStudio('parent_studio', 'Empire Pictures', undefined);
const controlledStudio = createStudio('controlled_studio', 'Artisan Pictures', 'CONTROLLED_SUBSIDIARY');
const independentStudio = createStudio('independent_studio', 'Velvet Pictures', 'INDEPENDENT_LABEL');
const mergedStudio = createStudio('merged_studio', 'Old Banner', 'FULL_MERGER');
const pausedStudio = createStudio('paused_studio', 'Quiet Label', 'CONTROLLED_SUBSIDIARY');

const player: Player = {
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 20,
    businesses: [parentStudio, controlledStudio, independentStudio, mergedStudio, pausedStudio],
    news: [],
    inbox: [],
    logs: [],
    x: {
        ...INITIAL_PLAYER.x,
        feed: [],
    },
};

const processed = processSubsidiaryAutonomousOperations(player);
const processedControlled = processed.businesses.find(business => business.id === controlledStudio.id)!;
const processedIndependent = processed.businesses.find(business => business.id === independentStudio.id)!;
const processedMerged = processed.businesses.find(business => business.id === mergedStudio.id)!;
const processedPaused = processed.businesses.find(business => business.id === pausedStudio.id)!;

const pendingProposal = processedControlled.studioState?.subsidiaryProjectProposals?.find(proposal => proposal.status === 'PENDING');
if (!pendingProposal) {
    throw new Error('Controlled subsidiaries should create a board-review proposal instead of silently starting a project.');
}
if (processedControlled.studioState?.scripts.length || processedControlled.studioState?.concepts.length) {
    throw new Error('Controlled subsidiaries should not create scripts/concepts before board approval.');
}
if (!pendingProposal.logic.length || pendingProposal.estimatedBudget <= 0) {
    throw new Error('Subsidiary proposals must include mandate logic and a budget recommendation.');
}
if (pendingProposal.source !== 'OWNED_IP' || pendingProposal.sourceLabel !== 'Stellar Guard') {
    throw new Error('Owned IP mandates should prefer available owned rights.');
}

const autoStarted = processedIndependent.studioState?.subsidiaryProjectProposals?.find(proposal => proposal.status === 'AUTO_STARTED');
if (!autoStarted) {
    throw new Error('Independent labels should auto-start mandate projects.');
}
if (!processedIndependent.studioState?.scripts.some(script => script.id === autoStarted.startedScriptId)) {
    throw new Error('Independent auto-start must create a real script in the subsidiary vault.');
}
if (!processedIndependent.studioState?.concepts.some(concept => concept.id === autoStarted.startedConceptId)) {
    throw new Error('Independent auto-start must create a real concept in the subsidiary slate.');
}
if (processedMerged.studioState?.subsidiaryProjectProposals?.length) {
    throw new Error('Full-merger studios should be skipped by autonomous operations.');
}
if (processedPaused.studioState?.subsidiaryProjectProposals?.length) {
    throw new Error('Paused mandates should not create autonomous proposals.');
}

const approved = approveSubsidiaryProjectProposal(processed, controlledStudio.id, pendingProposal.id);
if (!approved.success) {
    throw new Error('Board approval should succeed for a pending controlled-subsidiary proposal.');
}
const approvedStudio = approved.player.businesses.find(business => business.id === controlledStudio.id)!;
const approvedProposal = approvedStudio.studioState?.subsidiaryProjectProposals?.find(proposal => proposal.id === pendingProposal.id);
if (approvedProposal?.status !== 'APPROVED') {
    throw new Error('Approved proposals must be marked approved.');
}
if (!approvedStudio.studioState?.scripts.some(script => script.id === approvedProposal?.startedScriptId)) {
    throw new Error('Approved proposals must create a script in the selected subsidiary.');
}
if (!approvedStudio.studioState?.concepts.some(concept => concept.id === approvedProposal?.startedConceptId)) {
    throw new Error('Approved proposals must create a concept in the selected subsidiary.');
}
if (!approved.player.news.some(item => item.headline.includes('approves'))) {
    throw new Error('Approving a proposal should create industry news.');
}

const rejected = rejectSubsidiaryProjectProposal(processed, controlledStudio.id, pendingProposal.id);
if (!rejected.success) {
    throw new Error('Rejecting a fresh pending proposal should succeed.');
}
const rejectedStudio = rejected.player.businesses.find(business => business.id === controlledStudio.id)!;
if (rejectedStudio.studioState?.subsidiaryProjectProposals?.find(proposal => proposal.id === pendingProposal.id)?.status !== 'REJECTED') {
    throw new Error('Rejected proposals must be marked rejected.');
}

console.log('Subsidiary operations audit passed.');
