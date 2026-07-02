import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { processRivalRetaliation } from '../services/rivalRetaliation';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (id: string, name: string, valuation: number): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
    logo: 'RIV',
    color: 'bg-rose-500',
    foundedWeek: 1,
    balance: 220_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'HIGH',
    },
    stats: {
        weeklyRevenue: 24_000_000,
        weeklyExpenses: 16_000_000,
        weeklyProfit: 8_000_000,
        lifetimeRevenue: 1_200_000_000,
        valuation,
        brandHealth: 78,
        customerSatisfaction: 74,
        riskLevel: 34,
        hype: 70,
        studioMomentum: 68,
        investorConfidence: 72,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [{ week: 1, profit: 8_000_000 }],
});

const makePlayer = (): Player => ({
    ...INITIAL_PLAYER,
    id: 'rival_retaliation_audit_player',
    name: 'Rival Auditor',
    age: 46,
    currentWeek: 166,
    money: 4_000_000_000,
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
        makeStudio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
        makeStudio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
    ],
    flags: {
        ...INITIAL_PLAYER.flags,
        worldReactionState: {
            lastProcessedWeek: 165,
            controlledStudioCount: 3,
            controlledMajorStudioCount: 3,
            antiMonopolyPressure: 76,
            rivalRetaliationRisk: 74,
            employeeDepartureRisk: 0,
            investorConfidence: 56,
            acquisitionDebtPressure: 22,
            valuationPressure: 40,
            franchiseValuePressure: 38,
        },
        regulatorPressureState: {
            lastProcessedWeek: 165,
            pressureScore: 68,
            status: 'REVIEW',
            controlledStudioCount: 3,
            controlledMajorStudioCount: 3,
            controlledTakeoverCount: 1,
            acquisitionMoratoriumWeeksRemaining: 0,
            conductAgreementWeeksRemaining: 0,
            acquisitionCostMultiplier: 1.2,
            investorConfidencePenalty: 3,
            reviewCount: 1,
            finesPaidToDate: 0,
        },
        studioAcquisitionCases: [{
            studioId: 'ARTISAN_PICTURES',
            studioName: 'Artisan Pictures',
            acquisitionState: 'OPEN_TO_OFFERS',
            publicValuation: 420_000_000,
            approachedWeek: 165,
            approachedYear: 46,
            status: 'COUNTERED',
            offer: {
                type: 'FAIR',
                amount: 435_000_000,
                funding: { source: 'PERSONAL' },
                complianceRisk: 16,
                complianceBand: 'ROUTINE',
                submittedWeek: 165,
                submittedYear: 46,
                round: 1,
            },
            sellerResponse: {
                decision: 'COUNTERED',
                counterAmount: 465_000_000,
                round: 1,
                respondedWeek: 165,
                respondedYear: 46,
                summary: 'The board wants stronger terms.',
            },
        }],
        rivalRetaliationState: {
            lastProcessedWeek: -1,
        },
    },
    news: [],
    logs: [],
    pendingEvents: [],
    inbox: [],
});

const processed = processRivalRetaliation(makePlayer());
const state = processed.flags.rivalRetaliationState;

assert(state, 'Rival retaliation state should be persisted.');
assert(state.lastProcessedWeek === 166, 'Rival retaliation should record processed week.');
assert(state.retaliationScore >= 55, 'High world rival risk should create a retaliation score.');
assert(state.activeCounterBidCount >= 1, 'Active acquisition cases should create counter-bid pressure.');
assert(state.defensiveAllianceCount >= 1, 'High pressure should create defensive alliance pressure.');
assert(processed.pendingEvents?.some(event => event.data?.rivalRetaliationEventType), 'Rival retaliation should queue a popup decision.');
assert(processed.news.some(item => /rival|alliance|leak|challenge/i.test(item.headline)), 'Rival retaliation should publish news.');
assert(processed.x.feed.some(post => /rival|deal|alliance|leak/i.test(post.content)), 'Rival retaliation should create social reaction.');
assert(processed.logs.some(log => /Rival Retaliation/i.test(log.message)), 'Rival retaliation should create a readable log.');

const rivalCase = processed.flags.studioAcquisitionCases.find((entry: any) => entry?.studioId === 'ARTISAN_PICTURES');
assert(rivalCase.status === 'RIVAL_BID', 'Rival retaliation should convert an active countered deal into a rival bid.');
assert(rivalCase.sellerResponse?.rivalStudioName, 'Rival bid should name the rival studio.');
assert(rivalCase.sellerResponse?.requiredBidAmount > rivalCase.offer.amount, 'Rival bid should require a higher bid.');
assert(processed.inbox.some(message => message.type === 'STUDIO_ACQUISITION' && message.data?.decision === 'RIVAL_BID'), 'Rival retaliation should notify the player through acquisition inbox.');

const event = processed.pendingEvents!.find(item => item.data?.rivalRetaliationEventType)!;
assert(event.type === 'LIFE_EVENT', 'Rival retaliation decisions should use LifeEvent popups.');
assert(event.data.lifeEvent.options.length === 3, 'Rival retaliation should expose two choices plus one golden option.');
assert(event.data.lifeEvent.options[2].isGolden, 'Rival retaliation third option should be golden.');

const quietChoice = event.data.lifeEvent.options.find((option: any) => option.id === 'QUIET_BACKCHANNEL');
assert(quietChoice, 'Rival retaliation popup should include a quiet backchannel option.');
const quietResult = quietChoice.impact(processed);
assert(quietResult.updatedPlayer.flags.rivalRetaliationState.lastRivalRetaliationChoiceWeek === 166, 'Choosing a rival option should stamp the choice week.');
assert(quietResult.log.includes('Rival Retaliation'), 'Rival option should return readable feedback.');

const second = processRivalRetaliation(processed);
assert((second.pendingEvents || []).filter(event => event.data?.rivalRetaliationEventType).length === 1, 'Same-week processing should not duplicate rival retaliation events.');

console.log('Rival retaliation audit passed.');
