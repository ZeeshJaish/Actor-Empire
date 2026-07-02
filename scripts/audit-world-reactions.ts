import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { processWorldReactions } from '../services/worldReactions';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (id: string, name: string, valuation: number, investorConfidence = 72): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
    logo: 'STK',
    color: 'bg-sky-500',
    foundedWeek: 1,
    balance: 150_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
    },
    stats: {
        weeklyRevenue: 12_000_000,
        weeklyExpenses: 8_000_000,
        weeklyProfit: 4_000_000,
        lifetimeRevenue: 500_000_000,
        valuation,
        brandHealth: 78,
        customerSatisfaction: 74,
        riskLevel: 34,
        hype: 64,
        studioMomentum: 68,
        investorConfidence,
    },
    staff: [
        { id: `${id}_chair`, name: `${name} Chair`, role: 'Chair', skill: 80, salary: 900_000, morale: 72 },
        { id: `${id}_prod`, name: `${name} Producer`, role: 'Producer', skill: 74, salary: 500_000, morale: 70 },
    ],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [{ week: 1, profit: 4_000_000 }],
});

const player: Player = {
    ...INITIAL_PLAYER,
    id: 'phase10_reaction_player',
    name: 'Phase Ten',
    age: 42,
    currentWeek: 88,
    money: 2_000_000_000,
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
        makeStudio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
        makeStudio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
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
        summary: 'Disney control transferred into the studio group.',
        createdWeek: 80,
        createdYear: 42,
        resolvedWeek: 80,
        resolvedYear: 42,
        acquiredBusinessId: 'WARNER_BROS',
    }],
    flags: {
        ...INITIAL_PLAYER.flags,
        studioAcquisitionCases: [{
            studioId: 'PARAMOUNT',
            studioName: 'Paramount Pictures',
            acquisitionState: 'PUBLICLY_TRADED',
            publicValuation: 260_000_000_000,
            approachedWeek: 78,
            approachedYear: 42,
            status: 'ACQUIRED',
            closing: {
                finalPrice: 0,
                acquiredBusinessId: 'PARAMOUNT',
                signedWeek: 78,
                signedYear: 42,
                funding: { source: 'PERSONAL' },
                verifiedDebt: 12_000_000_000,
                hiddenLiabilities: 4_000_000_000,
                expectedAnnualIncome: 7_000_000_000,
                assetSummary: 'public-market control transfer',
            },
        }],
    },
    news: [],
    logs: [],
};

const first = processWorldReactions(player);
const state = first.flags?.worldReactionState;

assert(state, 'World reaction state should be migrated and persisted.');
assert(state.lastProcessedWeek === player.currentWeek, 'World reactions should record the processed week.');
assert(state.antiMonopolyPressure > 0, 'Owned major studios should create anti-monopoly pressure.');
assert(state.rivalRetaliationRisk > 0, 'A powerful studio group should create rival retaliation risk.');
assert(state.employeeDepartureRisk > 0, 'Consolidation pressure should create employee departure risk.');
assert(state.acquisitionDebtPressure > 0, 'Acquired studio debt should feed balance pressure.');
assert(state.franchiseValuePressure > 0, 'Major studio ownership should affect franchise value pressure.');
assert(first.news.some(item => /empire|scrutiny|consolidation/i.test(item.headline)), 'World reactions should publish consolidation/acquisition news.');
assert(first.x.feed.some(post => /too much power|empire|Hollywood/i.test(post.content)), 'World reactions should create fan/social reaction.');
assert(first.logs.some(log => /World Reaction/i.test(log.message)), 'World reactions should add a readable log entry.');
const reactionEvent = first.pendingEvents?.find(event => event.data?.worldReactionEventType);
assert(reactionEvent, 'High world pressure should queue a popup decision event.');
assert(reactionEvent?.type === 'LIFE_EVENT', 'World reaction decisions should use the existing LifeEvent popup.');
assert(reactionEvent?.data.lifeEvent.options.length === 3, 'World reaction decision should expose two choices plus one golden option.');
assert(reactionEvent?.data.lifeEvent.options[2].isGolden, 'World reaction decision third option should be golden.');
assert(['ANTI_MONOPOLY_PRESSURE', 'RIVAL_RETALIATION', 'EMPLOYEE_DEPARTURE'].includes(reactionEvent?.data.worldReactionEventType), 'World reaction event should identify its reaction type.');

const eventResult = reactionEvent!.data.lifeEvent.options[0].impact(first);
assert(eventResult.updatedPlayer.flags.worldReactionState.lastWorldReactionChoiceWeek === player.currentWeek, 'Choosing a world reaction option should stamp the decision week.');
assert(eventResult.log.includes('World Reaction'), 'World reaction option should return a readable log.');

const changedStudio = first.businesses.find(business => business.id === 'WARNER_BROS');
assert((changedStudio?.stats.investorConfidence || 100) < 72, 'Pressure should reduce investor confidence on controlled studios.');
assert((changedStudio?.stats.valuation || 0) !== 180_000_000_000, 'World reactions should nudge studio valuations.');

const second = processWorldReactions(first);
const consolidationNewsCount = second.news.filter(item => /empire|scrutiny|consolidation/i.test(item.headline)).length;
assert(consolidationNewsCount === 1, 'Processing the same week should not duplicate world reaction news.');
assert((second.pendingEvents || []).filter(event => event.data?.worldReactionEventType).length === 1, 'Processing the same week should not duplicate world reaction events.');

const smallPlayer = processWorldReactions({
    ...INITIAL_PLAYER,
    currentWeek: 88,
    businesses: [makeStudio('SMALL', 'Small Studio', 250_000_000, 70)],
    news: [],
    logs: [],
});
assert((smallPlayer.flags.worldReactionState?.antiMonopolyPressure ?? 100) < state.antiMonopolyPressure, 'Small studio ownership should have much lower pressure than empire control.');

console.log('World reactions audit passed.');
