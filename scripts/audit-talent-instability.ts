import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { processTalentInstability } from '../services/talentInstability';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (id: string, name: string, valuation: number, morale: number): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
    logo: 'TAL',
    color: 'bg-sky-500',
    foundedWeek: 1,
    balance: 180_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
    },
    stats: {
        weeklyRevenue: 18_000_000,
        weeklyExpenses: 12_000_000,
        weeklyProfit: 6_000_000,
        lifetimeRevenue: 900_000_000,
        valuation,
        brandHealth: 78,
        customerSatisfaction: 74,
        riskLevel: 34,
        hype: 64,
        studioMomentum: 68,
        investorConfidence: 70,
    },
    staff: [
        { id: `${id}_chief`, name: `${name} Studio Chief`, role: 'Studio Chief', skill: 84, salary: 1_200_000, morale },
        { id: `${id}_producer`, name: `${name} Producer`, role: 'Producer', skill: 78, salary: 640_000, morale: morale + 4 },
        { id: `${id}_casting`, name: `${name} Casting Lead`, role: 'Casting Lead', skill: 72, salary: 420_000, morale: morale + 8 },
    ],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [{ week: 1, profit: 6_000_000 }],
});

const makePlayer = (): Player => ({
    ...INITIAL_PLAYER,
    id: 'talent_instability_audit_player',
    name: 'Talent Auditor',
    age: 45,
    currentWeek: 151,
    money: 1_250_000_000,
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000, 44),
        makeStudio('WARNER_BROS', 'Warner Bros.', 74_000_000_000, 34),
        makeStudio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000, 39),
    ],
    flags: {
        ...INITIAL_PLAYER.flags,
        worldReactionState: {
            lastProcessedWeek: 150,
            controlledStudioCount: 3,
            controlledMajorStudioCount: 3,
            antiMonopolyPressure: 78,
            rivalRetaliationRisk: 66,
            employeeDepartureRisk: 72,
            investorConfidence: 55,
            acquisitionDebtPressure: 28,
            valuationPressure: 45,
            franchiseValuePressure: 42,
        },
        regulatorPressureState: {
            lastProcessedWeek: 150,
            pressureScore: 74,
            status: 'REVIEW',
            controlledStudioCount: 3,
            controlledMajorStudioCount: 3,
            controlledTakeoverCount: 1,
            acquisitionMoratoriumWeeksRemaining: 2,
            conductAgreementWeeksRemaining: 0,
            acquisitionCostMultiplier: 1.25,
            investorConfidencePenalty: 5,
            reviewCount: 1,
            finesPaidToDate: 0,
        },
        studioAcquisitionCases: [{
            studioId: 'WARNER_BROS',
            studioName: 'Warner Bros.',
            acquisitionState: 'PUBLICLY_TRADED',
            publicValuation: 74_000_000_000,
            approachedWeek: 144,
            approachedYear: 45,
            status: 'ACQUIRED',
            closing: {
                finalPrice: 0,
                acquiredBusinessId: 'WARNER_BROS',
                signedWeek: 144,
                signedYear: 45,
                funding: { source: 'PERSONAL' },
                verifiedDebt: 4_000_000_000,
                hiddenLiabilities: 900_000_000,
                expectedAnnualIncome: 1_500_000_000,
                assetSummary: 'public-market control transfer',
            },
        }],
        talentInstabilityState: {
            lastProcessedWeek: -1,
        },
    },
    news: [],
    logs: [],
    pendingEvents: [],
});

const processed = processTalentInstability(makePlayer());
const state = processed.flags.talentInstabilityState;

assert(state, 'Talent instability state should be persisted.');
assert(state.lastProcessedWeek === 151, 'Talent instability should record processed week.');
assert(state.pressureScore >= 55, 'High acquisition/world pressure should create talent instability pressure.');
assert(state.departureRisk >= 50, 'Low morale acquired studios should create departure risk.');
assert(processed.pendingEvents?.some(event => event.data?.talentInstabilityEventType), 'Talent instability should queue a popup decision.');
assert(processed.news.some(item => /talent|retention|departure|staff/i.test(item.headline)), 'Talent instability should publish industry news.');
assert(processed.x.feed.some(post => /talent|staff|retention|exit/i.test(post.content)), 'Talent instability should create social reaction.');
assert(processed.logs.some(log => /Talent Instability/i.test(log.message)), 'Talent instability should create a readable log.');

const event = processed.pendingEvents!.find(item => item.data?.talentInstabilityEventType)!;
assert(event.type === 'LIFE_EVENT', 'Talent instability decisions should use LifeEvent popups.');
assert(event.data.lifeEvent.options.length === 3, 'Talent instability should expose two choices plus a golden option.');
assert(event.data.lifeEvent.options[2].isGolden, 'Talent instability third option should be golden.');

const aggressiveChoice = event.data.lifeEvent.options.find((option: any) => option.id === 'HOLD_THE_LINE');
assert(aggressiveChoice, 'Talent instability popup should include a risky hold-the-line path.');
const departureResult = aggressiveChoice.impact(processed);
const beforeStaff = processed.businesses.reduce((sum, business) => sum + (business.staff || []).length, 0);
const afterStaff = departureResult.updatedPlayer.businesses.reduce((sum: number, business: Business) => sum + (business.staff || []).length, 0);
assert(afterStaff === beforeStaff - 1, 'Risky talent choice should create one real staff departure.');
assert(departureResult.updatedPlayer.flags.talentInstabilityState.departures.length >= 1, 'Departure record should be stored.');
assert(departureResult.log.includes('Talent Instability'), 'Talent choice should return readable feedback.');

const safeChoice = event.data.lifeEvent.options.find((option: any) => option.id === 'RETENTION_PACKAGE');
assert(safeChoice, 'Talent instability popup should include a retention package path.');
const safeResult = safeChoice.impact(processed);
assert(safeResult.updatedPlayer.flags.talentInstabilityState.retentionShieldWeeksRemaining > 0, 'Retention package should create a temporary shield.');

const second = processTalentInstability(processed);
assert((second.pendingEvents || []).filter(event => event.data?.talentInstabilityEventType).length === 1, 'Same-week processing should not duplicate talent instability events.');

console.log('Talent instability audit passed.');
