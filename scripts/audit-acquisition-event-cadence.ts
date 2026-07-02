import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { processRegulatorPressure } from '../services/regulatorPressure';
import { processRivalRetaliation } from '../services/rivalRetaliation';
import { processTalentInstability } from '../services/talentInstability';
import { processWorldReactions } from '../services/worldReactions';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const makeStudio = (id: string, name: string, valuation: number): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    balance: 500_000_000,
    staff: [
        { id: `${id}_producer`, name: `${name} Producer`, role: 'Head of Production', skill: 80, salary: 1_000_000, morale: 42 },
    ],
    products: [],
    config: {
        quality: 'STANDARD',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
    },
    stats: {
        weeklyRevenue: 45_000_000,
        weeklyExpenses: 30_000_000,
        weeklyProfit: 15_000_000,
        lifetimeRevenue: 800_000_000,
        valuation,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 35,
        hype: 60,
        studioMomentum: 58,
        investorConfidence: 48,
    },
    studioState: {
        developmentProjects: [],
        releasedProjects: [],
        originalIps: [],
        rightsLibrary: [],
        financeLedger: [],
        talentRoster: [],
        mandates: [],
    },
} as unknown as Business);

const makePressurePlayer = (): Player => ({
    ...clone(INITIAL_PLAYER),
    age: 32,
    currentWeek: 20,
    money: 900_000_000,
    businesses: [
        makeStudio('PLAYER_STUDIO', 'Player Studios', 1_800_000_000),
        makeStudio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
        makeStudio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
        makeStudio('UNIVERSAL', 'Universal Pictures', 65_000_000_000),
    ],
    stockTakeovers: [{
        id: 'takeover_wbd',
        stockId: 'stk_wbd',
        stockSymbol: 'WBD',
        companyName: 'Warner Bros. Discovery',
        relatedStudioId: 'WARNER_BROS',
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 52,
        alliedSupportPercent: 0,
        effectiveControlPercent: 52,
        supportScore: 52,
        rivalDefenceRisk: 0,
        cost: 0,
        summary: 'Controlled for cadence audit.',
        createdWeek: 18,
        createdYear: 32,
    }],
    flags: {
        ...clone(INITIAL_PLAYER.flags),
        studioAcquisitionCases: [
            { studioId: 'WARNER_BROS', studioName: 'Warner Bros.', status: 'ACQUIRED', acquisitionState: 'PUBLICLY_TRADED' },
            { studioId: 'PARAMOUNT', studioName: 'Paramount Pictures', status: 'ACQUIRED', acquisitionState: 'PUBLICLY_TRADED' },
        ],
    },
    pendingEvents: [],
});

const countAcquisitionPressureEvents = (player: Player) => (
    (player.pendingEvents || []).filter(event => (
        event.data?.worldReactionEventType
        || event.data?.regulatorPressureEventType
        || event.data?.talentInstabilityEventType
        || event.data?.rivalRetaliationEventType
    )).length
);

let player = makePressurePlayer();
player = processWorldReactions(player);
assert(countAcquisitionPressureEvents(player) >= 1, 'First high-pressure week should still surface one acquisition pressure popup.');
player.pendingEvents = [];
player.currentWeek += 1;
player = processRegulatorPressure(player);
player = processRivalRetaliation(player);
player = processTalentInstability(player);
player = processWorldReactions(player);
assert.equal(countAcquisitionPressureEvents(player), 0, 'Acquisition pressure popups should not reappear one week after the player handled one.');

player.currentWeek += 8;
player = processRegulatorPressure(player);
player = processRivalRetaliation(player);
player = processTalentInstability(player);
player = processWorldReactions(player);
assert(countAcquisitionPressureEvents(player) >= 1, 'Acquisition pressure popups should become eligible again after the quiet period.');

console.log('Acquisition event cadence audit passed.');
