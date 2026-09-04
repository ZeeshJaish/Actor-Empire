import { createDefaultStudioState } from '../services/businessLogic';
import { processSubsidiaryAutonomousOperations } from '../services/subsidiaryOperations';
import { INITIAL_PLAYER } from '../types';
import type { Business, IndustryContentFingerprint, Player, StudioOperatingMandate } from '../types';

const absoluteWeek = 32 * 52 + 30;
const mandate = (autoProduction: StudioOperatingMandate['autoProduction']): StudioOperatingMandate => ({
    focus: 'MOVIES_FIRST',
    budgetAppetite: 'STANDARD',
    releasePace: 'AGGRESSIVE',
    ipStrategy: 'ORIGINALS',
    talentPolicy: 'MIXED',
    objective: 'BALANCED',
    creativeAppetite: 'CALCULATED',
    autoProduction,
    updatedWeek: 1,
    updatedYear: 32,
});

const fingerprint = (studioId: string): IndustryContentFingerprint => ({
    id: `fingerprint_${studioId}`,
    seed: `seed_${studioId}`,
    ownerCompanyId: studioId,
    ownerCompanyKind: 'PRODUCTION_STUDIO',
    format: 'MOVIE',
    primaryGenre: 'SCI_FI',
    secondaryGenre: 'DRAMA',
    subgenre: 'corporate-space-thriller',
    tone: 'tense',
    theme: 'loyalty',
    setting: 'orbital city',
    period: 'near future',
    targetAudience: 'adult genre fans',
    originalLanguage: 'English',
    priorityMarket: 'GLOBAL',
    commercialIntent: 82,
    prestigeIntent: 61,
    creativeRisk: 54,
    starPowerTarget: 70,
    releasePath: 'THEATRICAL_FIRST',
    sourceIntent: 'ORIGINAL',
    relationship: 'STANDALONE',
    budgetSuitability: {
        minimumMillions: 35,
        idealLowMillions: 60,
        idealHighMillions: 95,
        ambitiousMaximumMillions: 130,
    },
    noveltySignature: `novelty_${studioId}`,
    noveltyScore: 78,
    createdAtAbsoluteWeek: absoluteWeek - 30,
    decisionCycle: 2,
    lifecycle: 'SELECTED',
});

const studio = (id: string, autoProduction: StudioOperatingMandate['autoProduction']): Business => {
    const selected = fingerprint(id);
    const state = createDefaultStudioState(1);
    return {
        id,
        name: `${id} Pictures`,
        type: 'PRODUCTION_HOUSE',
        subtype: 'MAJOR_STUDIO',
        logo: '🎬',
        color: 'bg-slate-800',
        foundedWeek: 1,
        balance: 400_000_000,
        isActive: true,
        config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' },
        stats: {
            weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0,
            valuation: 900_000_000, brandHealth: 75, customerSatisfaction: 72,
            riskLevel: 25, hype: 68, studioMomentum: 72, investorConfidence: 70,
        },
        staff: [], products: [], hiringPool: [], lastHiringRefreshWeek: 1, history: [],
        studioState: {
            ...state,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            acquiredWeek: 1,
            acquiredYear: 32,
            operatingModel: 'CONTROLLED_SUBSIDIARY',
            operatingMandate: mandate(autoProduction),
            lastSubsidiaryOperationWeek: 1,
            lastSubsidiaryOperationYear: 32,
            industryHandoffSnapshot: {
                schemaVersion: 1,
                sourceStudioId: id,
                materializedAtAbsoluteWeek: absoluteWeek - 20,
                activeIndustryProductionIds: [],
                ai: {
                    schemaVersion: 1,
                    studioId: id,
                    origin: 'ESTABLISHED',
                    controller: 'AI',
                    status: 'ACTIVE',
                    seed: id,
                    profile: {} as any,
                    competence: {} as any,
                    finance: {} as any,
                    capacity: {} as any,
                    ledger: [], decisions: [], events: [], migrationKeys: [], handoffKeys: [],
                    lastProcessedAbsoluteWeek: absoluteWeek - 20,
                    intelligence: {
                        schemaVersion: 1,
                        companyId: id,
                        companyKind: 'PRODUCTION_STUDIO',
                        seed: id,
                        lastProcessedAbsoluteWeek: absoluteWeek - 20,
                        nextDueAbsoluteWeek: {
                            CONTENT_STRATEGY: null, PRODUCTION_REVIEW: null, RELEASE_REVIEW: null,
                            FINANCE_REVIEW: null, MARKET_EXPANSION: null, CAPABILITY_GROWTH: null,
                        },
                        decisionCycleByLane: {
                            CONTENT_STRATEGY: 2, PRODUCTION_REVIEW: 0, RELEASE_REVIEW: 0,
                            FINANCE_REVIEW: 0, MARKET_EXPANSION: 0, CAPABILITY_GROWTH: 0,
                        },
                        momentum: 60,
                        learning: {
                            averageOutcomeByLane: {}, capabilityProgress: {}, repetitionFatigue: 0,
                            franchiseFatigue: 0, samples: [], processedEvidenceIds: [],
                        },
                        proposals: [{
                            id: `decision_${id}`,
                            idempotencyKey: `decision_key_${id}`,
                            companyId: id,
                            companyKind: 'PRODUCTION_STUDIO',
                            lane: 'CONTENT_STRATEGY',
                            decisionCycle: 2,
                            absoluteWeek: absoluteWeek - 30,
                            actionFamily: 'DEVELOP_CONTENT',
                            optionId: 'SCI_FI_MOVIE',
                            urgency: 74,
                            confidence: 81,
                            expectedExposureMillions: 75,
                            affordabilityCeilingMillions: 110,
                            score: {
                                total: 84, need: 75, strategyFit: 90, expectedUpside: 86,
                                relationshipValue: 50, competitiveValue: 78, financialRisk: 22,
                                capacityPressure: 18, fatigue: 4, executionRisk: 20,
                            },
                            reasonCodes: ['STRATEGIC_NEED'],
                            uncertaintyKey: `uncertainty_${id}`,
                            contentFingerprintId: selected.id,
                            status: 'EXECUTED',
                            nextReviewAbsoluteWeek: absoluteWeek - 10,
                        }],
                        shadowComparisons: [], processedKeys: [],
                        content: {
                            selectedFingerprints: [selected],
                            universeBlueprints: [], recentNoveltySignatures: [], materializationKeys: [],
                        },
                    },
                },
            },
        },
    };
};

const manual = studio('manual', 'PAUSED');
const review = studio('review', 'BOARD_REVIEW');
const automatic = studio('automatic', 'APPROVED');
const player: Player = {
    ...INITIAL_PLAYER,
    age: 32,
    currentWeek: 30,
    businesses: [manual, review, automatic],
    commitments: [],
    pastProjects: [],
    activeReleases: [],
    news: [], inbox: [], logs: [],
    x: { ...INITIAL_PLAYER.x, feed: [] },
};

const result = processSubsidiaryAutonomousOperations(player);
const manualAfter = result.businesses.find(item => item.id === manual.id)!;
const reviewAfter = result.businesses.find(item => item.id === review.id)!;
const automaticAfter = result.businesses.find(item => item.id === automatic.id)!;
const reviewProposal = reviewAfter.studioState?.subsidiaryProjectProposals?.find(item => item.status === 'PENDING');
const automaticProposal = automaticAfter.studioState?.subsidiaryProjectProposals?.find(item => item.status === 'AUTO_STARTED');

if ((manualAfter.studioState?.subsidiaryProjectProposals || []).length !== 0 || result.commitments.some(item => item.projectDetails?.studioId === manual.id)) {
    throw new Error('Manual/paused control must never create a proposal or automatic commitment.');
}
if (!reviewProposal || result.commitments.some(item => item.projectDetails?.studioId === review.id)) {
    throw new Error('Board review must create one pending proposal without starting production.');
}
if (!automaticProposal?.startedCommitmentId) {
    throw new Error('Approved automatic control must start one real player production commitment.');
}
if (reviewProposal.industryContentFingerprintId !== `fingerprint_${review.id}` || automaticProposal.industryContentFingerprintId !== `fingerprint_${automatic.id}`) {
    throw new Error('Acquired subsidiaries must reuse their saved B3 content fingerprint instead of forgetting private intelligence.');
}
if (reviewProposal.genre !== 'SCI_FI' || automaticProposal.genre !== 'SCI_FI') {
    throw new Error('The inherited fingerprint must drive the proposed content genre.');
}
const commitment = result.commitments.find(item => item.id === automaticProposal.startedCommitmentId)!;
if (commitment.projectDetails?.industryContentFingerprintId !== automaticProposal.industryContentFingerprintId) {
    throw new Error('Fingerprint lineage must survive into the real player commitment.');
}
if (automatic.balance - automaticAfter.balance !== automaticProposal.estimatedBudget || commitment.upfrontCost !== automaticProposal.estimatedBudget) {
    throw new Error('Player-owned automatic subsidiaries must pay the exact player budget with no AI cost discount.');
}
if (!commitment.productionCalendar || commitment.productionCalendar.totalWeeks < 24 || commitment.productionCalendar.totalWeeks > 36) {
    throw new Error('Player-owned automatic subsidiaries must use the normal player production calendar, not AI speed bias.');
}

console.log('B7 subsidiary control audit passed.');
