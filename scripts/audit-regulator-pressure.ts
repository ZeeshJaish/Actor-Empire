import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { calculateDueDiligenceFee, runDueDiligence, submitOpeningOffer } from '../services/studioAcquisition';
import {
    getRegulatorAcquisitionControls,
    getRegulatorPressureState,
    processRegulatorPressure,
} from '../services/regulatorPressure';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (id: string, name: string, valuation: number): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
    logo: 'REG',
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance: 250_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
    },
    stats: {
        weeklyRevenue: 30_000_000,
        weeklyExpenses: 18_000_000,
        weeklyProfit: 12_000_000,
        lifetimeRevenue: 1_500_000_000,
        valuation,
        brandHealth: 78,
        customerSatisfaction: 72,
        riskLevel: 30,
        hype: 70,
        studioMomentum: 72,
        investorConfidence: 76,
    },
    staff: [
        { id: `${id}_chair`, name: `${name} Chair`, role: 'Chair', skill: 82, salary: 900_000, morale: 74 },
    ],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [{ week: 1, profit: 12_000_000 }],
});

const acquisitionProfile: any = {
    id: 'ARTISAN_PICTURES',
    name: 'Artisan Pictures',
    isPlayerOwned: false,
    acquisitionState: 'OPEN_TO_OFFERS',
    valuation: 420_000_000,
    capital: 55_000_000,
    debt: 20_000_000,
    profitability: 34_000_000,
    reputation: 78,
    hits: 4,
    flops: 1,
    rightsCount: 7,
    franchiseCount: 1,
    universeCount: 0,
    facilities: ['Boutique Soundstage'],
    keyTalent: [{ name: 'Ava Chair', role: 'Chair' }],
    ownershipStructure: 'Privately held · Strategic ownership group',
    archetype: 'PRESTIGE',
};

const makePlayer = (): Player => ({
    ...INITIAL_PLAYER,
    id: 'regulator_audit_player',
    name: 'Regulator Player',
    age: 44,
    currentWeek: 140,
    money: 8_000_000_000,
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
        makeStudio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
        makeStudio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
        makeStudio('UNIVERSAL', 'Universal Pictures', 65_000_000_000),
    ],
    stockTakeovers: [{
        id: 'takeover_wbd_controlled',
        stockId: 'stk_wbd',
        stockSymbol: 'WBD',
        companyName: 'Warner Bros. Discovery',
        relatedStudioId: 'WARNER_BROS',
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 52,
        alliedSupportPercent: 0,
        effectiveControlPercent: 52,
        supportScore: 100,
        rivalDefenceRisk: 0,
        cost: 0,
        summary: 'Warner Bros. control transferred into the studio group.',
        createdWeek: 130,
        createdYear: 44,
        resolvedWeek: 130,
        resolvedYear: 44,
        acquiredBusinessId: 'WARNER_BROS',
    }],
    flags: {
        ...INITIAL_PLAYER.flags,
        studioAcquisitionCases: [{
            studioId: 'PARAMOUNT',
            studioName: 'Paramount Pictures',
            acquisitionState: 'PUBLICLY_TRADED',
            publicValuation: 22_000_000_000,
            approachedWeek: 132,
            approachedYear: 44,
            status: 'ACQUIRED',
            closing: {
                finalPrice: 0,
                acquiredBusinessId: 'PARAMOUNT',
                signedWeek: 132,
                signedYear: 44,
                funding: { source: 'PERSONAL' },
                verifiedDebt: 4_000_000_000,
                hiddenLiabilities: 1_000_000_000,
                expectedAnnualIncome: 1_500_000_000,
                assetSummary: 'public-market control transfer',
            },
        }],
    },
    news: [],
    logs: [],
    pendingEvents: [],
});

const state = getRegulatorPressureState(makePlayer());
assert(state.pressureScore >= 60, 'Large studio groups should create high regulator pressure.');
assert(state.status === 'REVIEW' || state.status === 'MORATORIUM', 'High pressure should enter formal review status.');
assert(state.acquisitionCostMultiplier > 1, 'High pressure should increase acquisition compliance costs.');

const processed = processRegulatorPressure(makePlayer());
const processedState = processed.flags.regulatorPressureState;
assert(processedState.lastProcessedWeek === 140, 'Regulator pressure should record the processed week.');
assert(processedState.acquisitionMoratoriumWeeksRemaining > 0, 'High regulator review should delay new acquisition offers.');
assert(processed.news.some(item => /regulator|antitrust|review/i.test(item.headline)), 'Regulator pressure should create industry news.');
assert(processed.pendingEvents?.some(event => event.data?.regulatorPressureEventType), 'Regulator pressure should queue a popup decision.');
assert(processed.logs.some(log => /Regulator/i.test(log.message)), 'Regulator pressure should create a readable log.');

const event = processed.pendingEvents!.find(item => item.data?.regulatorPressureEventType)!;
assert(event.type === 'LIFE_EVENT', 'Regulator decisions should use the existing LifeEvent popup.');
assert(event.data.lifeEvent.options.length >= 3, 'Regulator popup should offer multiple strategic choices.');
assert(event.data.lifeEvent.options.some((option: any) => option.isGolden), 'Regulator popup should include a golden safest option.');
const choiceResult = event.data.lifeEvent.options[0].impact(processed);
assert(choiceResult.updatedPlayer.flags.regulatorPressureState.lastRegulatorChoiceWeek === 140, 'Choosing regulator option should stamp the choice week.');

const blockedOffer = submitOpeningOffer({
    player: processed,
    profile: acquisitionProfile,
    offerType: 'FAIR',
    funding: { source: 'PERSONAL' },
});
assert(!blockedOffer.success && blockedOffer.reason === 'REGULATOR_REVIEW_ACTIVE', 'Active regulator review should block new acquisition offers.');

const diligencePlayer: Player = {
    ...makePlayer(),
    flags: {
        ...makePlayer().flags,
        regulatorPressureState: {
            ...processedState,
            acquisitionMoratoriumWeeksRemaining: 0,
            acquisitionCostMultiplier: 1.35,
        },
    },
};
const baseFee = calculateDueDiligenceFee(acquisitionProfile);
const diligence = runDueDiligence({
    player: diligencePlayer,
    profile: acquisitionProfile,
    funding: { source: 'PERSONAL' },
});
assert(diligence.success, 'Diligence should still be allowed when review has no active moratorium.');
assert(diligencePlayer.money - diligence.player.money > baseFee, 'Regulator pressure should add compliance cost to diligence.');

const second = processRegulatorPressure(processed);
assert((second.pendingEvents || []).filter(item => item.data?.regulatorPressureEventType).length === 1, 'Same-week processing should not duplicate regulator events.');

const reviewReadyPlayer: Player = {
    ...processed,
    currentWeek: 141,
    flags: {
        ...processed.flags,
        regulatorPressureState: {
            ...processedState,
            acquisitionMoratoriumWeeksRemaining: 1,
            reviewCooldownWeeksRemaining: 1,
        },
    },
};
const reviewCleared = processRegulatorPressure(reviewReadyPlayer);
const reviewControls = getRegulatorAcquisitionControls(reviewCleared);
assert(!reviewControls.isOfferBlocked, 'A completed review should reopen acquisition offers.');
assert(reviewCleared.inbox?.some(message => message.data?.decision === 'REVIEW_CLEARED'), 'A completed review should send one clear acquisition inbox notice.');
assert(reviewCleared.news.some(item => /review.*clear|clear.*review/i.test(`${item.headline} ${item.subtext || ''}`)), 'A completed review should publish a clear industry notice.');
assert(reviewCleared.logs.some(log => /review.*clear|clear.*review/i.test(log.message)), 'A completed review should create a readable clearance log.');

const cooldownWeek = processRegulatorPressure({ ...reviewCleared, currentWeek: 142 });
assert(!getRegulatorAcquisitionControls(cooldownWeek).isOfferBlocked, 'A just-cleared review should not immediately restart while its cooling-off period is active.');

console.log('Regulator pressure audit passed.');
