import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type LifeEvent, type Player, type ScheduledEvent } from '../types';
import { generateLifeEvent, generateLuxeLifeEvent } from '../services/lifeEventLogic';
import {
    getLifeEventResolutionContractViolations,
    materializePlayerLifeEventImpacts,
    resolveLifeEventChoice,
} from '../services/lifeEventResolver';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'life-event-factory-matrix-player';
player.money = 250_000_000;
player.stats = { ...player.stats, fame: 78, reputation: 64, happiness: 72, followers: 2_000_000 };
player.flags = { ...player.flags, heat: 72 };
player.relationships = [
    { id: 'partner', name: 'Jordan Vale', relation: 'Partner', closeness: 74, image: '', lastInteractionWeek: 1, npcId: 'npc_001' },
    { id: 'parent', name: 'Morgan Vale', relation: 'Parent', closeness: 68, image: '', lastInteractionWeek: 1 },
    { id: 'ex', name: 'Alex Stone', relation: 'Ex-Partner', closeness: 40, image: '', lastInteractionWeek: 1 },
];
player.dating = {
    ...player.dating,
    matches: [
        { id: 'match-premium', name: 'Riley Star', age: 31, job: 'Producer', image: '', type: 'RANDOM', chemistry: 82, isPremium: true, officialStatus: 'SEEING', scandalHeat: 30 },
        { id: 'match-standard', name: 'Casey North', age: 30, job: 'Actor', image: '', type: 'RANDOM', chemistry: 68, isPremium: false, tinderStage: 'TALKING', scandalHeat: 18 },
    ],
};
player.businesses = [{
    id: 'matrix-business',
    name: 'Matrix Pictures',
    balance: 80_000_000,
    stats: { investorConfidence: 70 },
    staff: [],
}] as Player['businesses'];

const originalRandom = Math.random;
const originalNow = Date.now;
let eventCounter = 0;
Date.now = () => 1_900_000_000_000 + eventCounter++;

const generated = new Map<string, LifeEvent>();
try {
    for (let step = 0; step <= 100; step += 1) {
        const roll = step / 100;
        Math.random = () => Math.min(0.999999, roll);
        const standard = generateLifeEvent(player);
        if (standard) generated.set(standard.id.replace(/_\d+$/, ''), standard);
        const luxe = generateLuxeLifeEvent(player);
        if (luxe) generated.set(luxe.id.replace(/_\d+$/, ''), luxe);
    }
} finally {
    Math.random = originalRandom;
    Date.now = originalNow;
}

assert(generated.size >= 10, `Expected broad standard/luxe coverage, generated ${generated.size} event variants.`);

for (const lifeEvent of generated.values()) {
    const event: ScheduledEvent = {
        id: `scheduled_${lifeEvent.id}`,
        week: player.currentWeek,
        type: 'LIFE_EVENT',
        title: lifeEvent.title,
        data: { lifeEvent },
    };
    const eventPlayer: Player = { ...player, pendingEvents: [event], scheduledEvents: [] };
    const materialized = materializePlayerLifeEventImpacts(eventPlayer, { strict: true });
    assert.deepEqual(
        getLifeEventResolutionContractViolations(materialized),
        [],
        `${lifeEvent.id} must have a complete resolver contract.`,
    );

    const reloaded = JSON.parse(JSON.stringify(materialized)) as Player;
    const reloadedEvent = reloaded.pendingEvents![0];
    const reloadedLifeEvent = reloadedEvent.data.lifeEvent as LifeEvent;
    reloadedLifeEvent.options.forEach((option, optionIndex) => {
        const result = resolveLifeEventChoice(reloaded, reloadedEvent, reloadedLifeEvent, option, optionIndex);
        assert(result, `${lifeEvent.id}/${option.id || optionIndex} must resolve after reload.`);
        assert(result.updatedPlayer, `${lifeEvent.id}/${option.id || optionIndex} must return player state.`);
    });
}

console.log(`Life-event factory matrix passed for ${generated.size} standard/luxe variants.`);
