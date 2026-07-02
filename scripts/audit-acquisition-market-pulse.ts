import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { processAcquisitionMarketPulse } from '../services/acquisitionMarketPulse';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (id: string, name: string, valuation: number, investorConfidence = 70): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
    logo: 'MRK',
    color: 'bg-emerald-500',
    foundedWeek: 1,
    balance: 300_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'HIGH',
    },
    stats: {
        weeklyRevenue: 30_000_000,
        weeklyExpenses: 20_000_000,
        weeklyProfit: 10_000_000,
        lifetimeRevenue: 1_800_000_000,
        valuation,
        brandHealth: 80,
        customerSatisfaction: 76,
        riskLevel: 34,
        hype: 76,
        studioMomentum: 72,
        investorConfidence,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [{ week: 1, profit: 10_000_000 }],
});

const makePlayer = (): Player => ({
    ...INITIAL_PLAYER,
    id: 'market_pulse_audit_player',
    name: 'Market Pulse',
    age: 47,
    currentWeek: 180,
    money: 5_000_000_000,
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000, 74),
        makeStudio('WARNER_BROS', 'Warner Bros.', 74_000_000_000, 68),
        makeStudio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000, 70),
    ],
    flags: {
        ...INITIAL_PLAYER.flags,
        worldReactionState: {
            lastProcessedWeek: 179,
            controlledStudioCount: 3,
            controlledMajorStudioCount: 3,
            antiMonopolyPressure: 62,
            rivalRetaliationRisk: 54,
            employeeDepartureRisk: 0,
            investorConfidence: 65,
            acquisitionDebtPressure: 18,
            valuationPressure: 30,
            franchiseValuePressure: 34,
        },
        regulatorPressureState: {
            lastProcessedWeek: 179,
            pressureScore: 45,
            status: 'MONITORING',
            controlledStudioCount: 3,
            controlledMajorStudioCount: 3,
            controlledTakeoverCount: 1,
            acquisitionMoratoriumWeeksRemaining: 0,
            conductAgreementWeeksRemaining: 0,
            acquisitionCostMultiplier: 1.15,
            investorConfidencePenalty: 1,
            reviewCount: 0,
            finesPaidToDate: 0,
        },
        studioAcquisitionCases: [
            {
                studioId: 'WARNER_BROS',
                studioName: 'Warner Bros.',
                acquisitionState: 'PUBLICLY_TRADED',
                publicValuation: 74_000_000_000,
                approachedWeek: 176,
                approachedYear: 47,
                status: 'ACQUIRED',
                closing: {
                    finalPrice: 0,
                    acquiredBusinessId: 'WARNER_BROS',
                    signedWeek: 179,
                    signedYear: 47,
                    funding: { source: 'PERSONAL' },
                    verifiedDebt: 2_500_000_000,
                    hiddenLiabilities: 400_000_000,
                    expectedAnnualIncome: 2_200_000_000,
                    assetSummary: 'public-market control transfer with franchise catalog',
                },
            },
            {
                studioId: 'PARAMOUNT',
                studioName: 'Paramount Pictures',
                acquisitionState: 'PUBLICLY_TRADED',
                publicValuation: 22_000_000_000,
                approachedWeek: 177,
                approachedYear: 47,
                status: 'ACQUIRED',
                closing: {
                    finalPrice: 0,
                    acquiredBusinessId: 'PARAMOUNT',
                    signedWeek: 179,
                    signedYear: 47,
                    funding: { source: 'PERSONAL' },
                    verifiedDebt: 1_400_000_000,
                    hiddenLiabilities: 200_000_000,
                    expectedAnnualIncome: 900_000_000,
                    assetSummary: 'public-market control transfer with library rights',
                },
            },
        ],
        acquisitionMarketPulseState: {
            lastProcessedWeek: -1,
            processedCaseIds: [],
        },
    },
    news: [],
    logs: [],
});

const beforeWarnerValuation = makePlayer().businesses.find(studio => studio.id === 'WARNER_BROS')!.stats.valuation;
const processed = processAcquisitionMarketPulse(makePlayer());
const state = processed.flags.acquisitionMarketPulseState;

assert(state, 'Acquisition market pulse state should be persisted.');
assert(state.lastProcessedWeek === 180, 'Market pulse should record processed week.');
assert(state.marketMood, 'Market pulse should store readable market mood.');
assert(state.acquisitionStoryCount >= 2, 'Market pulse should count acquired studio stories.');
assert(state.processedCaseIds.includes('WARNER_BROS') && state.processedCaseIds.includes('PARAMOUNT'), 'Market pulse should mark acquired cases as processed.');
assert(state.fanSentiment !== 0, 'Market pulse should calculate fan sentiment.');
assert(state.investorConfidenceDelta !== 0, 'Market pulse should calculate investor confidence delta.');
assert(state.franchiseValueDelta !== 0, 'Market pulse should calculate franchise value delta.');
assert(processed.news.filter(item => /acquisition|merger|market|franchise|investor/i.test(item.headline)).length >= 3, 'Market pulse should create a richer acquisition news chain.');
assert(processed.x.feed.some(post => /fans|franchise|market|deal/i.test(post.content)), 'Market pulse should create fan/investor social reaction.');
assert(processed.logs.some(log => /Acquisition Market Pulse/i.test(log.message)), 'Market pulse should add a readable log.');
assert(processed.flags.worldReactionState.franchiseValuePressure > 34, 'Market pulse should raise franchise value pressure after major acquisitions.');
assert((processed.businesses.find(studio => studio.id === 'WARNER_BROS')?.stats.valuation || 0) !== beforeWarnerValuation, 'Market pulse should move acquired studio valuation.');
assert((processed.businesses.find(studio => studio.id === 'WARNER_BROS')?.stats.investorConfidence || 0) !== 68, 'Market pulse should move acquired studio investor confidence.');

const second = processAcquisitionMarketPulse(processed);
const secondStoryCount = second.news.filter(item => /acquisition|merger|market|franchise|investor/i.test(item.headline)).length;
assert(secondStoryCount === processed.news.filter(item => /acquisition|merger|market|franchise|investor/i.test(item.headline)).length, 'Same-week processing should not duplicate acquisition market news.');

console.log('Acquisition market pulse audit passed.');
