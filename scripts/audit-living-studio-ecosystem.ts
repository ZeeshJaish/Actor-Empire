import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryProject, type Player, type WorldState } from '../types';
import { initializeStocks, processStockMarket } from '../services/stockLogic';
import {
    applyPassiveStudioEcosystemTurn,
    applyStudioProjectOutcome,
    ensureStudioEcosystem,
    getLegacyStudioValuationFloor,
} from '../services/studioEcosystem';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const makeProject = (
    id: string,
    studioId: string,
    boxOffice: number,
    quality: number,
    reviews: string,
    universeId?: string,
): IndustryProject => ({
    id,
    title: `${id} Feature`,
    genre: universeId === 'MCU' ? 'SUPERHERO' : 'DRAMA',
    studioId,
    budgetTier: 'HIGH',
    quality,
    boxOffice,
    year: 30,
    weekReleased: 20,
    leadActorId: 'npc_actor',
    leadActorName: 'Test Actor',
    directorName: 'Test Director',
    reviews,
    universeId,
});

let world = ensureStudioEcosystem(clone(INITIAL_PLAYER.world));
assert(world.studios?.WARNER_BROS, 'Legacy studios should be present in the live studio map.');
assert(world.studios?.MARVEL_STUDIOS, 'Universe studios should be present in the live studio map.');

const warnerBefore = clone(world.studios!.WARNER_BROS);
const hit = makeProject('living_hit', 'WARNER_BROS', 1_800_000_000, 91, 'HIT');
const hitResult = applyStudioProjectOutcome(world, hit);
world = hitResult.world;
const warnerAfterHit = world.studios!.WARNER_BROS;
assert.equal(hitResult.outcome.outcome, 'HIT', 'A strong high-budget overperformer should be classified as a hit.');
assert(warnerAfterHit.valuation > warnerBefore.valuation, 'A hit should lift studio valuation.');
assert(warnerAfterHit.cashReserve > warnerBefore.cashReserve, 'A hit should add studio cash reserves.');
assert((warnerAfterHit.recentHits || 0) > (warnerBefore.recentHits || 0), 'A hit should increase recentHits.');
assert.equal(warnerAfterHit.lastReleaseTitle, hit.title, 'Studio should remember its latest release title.');
assert((warnerAfterHit.slateMomentum || 0) > 50, 'A hit should push slate momentum above neutral.');
assert((warnerAfterHit.lifetimeBoxOffice || 0) >= hit.boxOffice, 'Studio should accumulate lifetime box office.');

for (let index = 0; index < 24; index++) {
    const flop = makeProject(`living_flop_${index}`, 'WARNER_BROS', 18_000_000, 22, 'FLOP');
    world = applyStudioProjectOutcome(world, flop).world;
    world = applyPassiveStudioEcosystemTurn(world, 20 + index, 30).world;
}
const warnerAfterFlops = world.studios!.WARNER_BROS;
assert(warnerAfterFlops.valuation >= getLegacyStudioValuationFloor('WARNER_BROS'), 'Legacy studios should sustain above their long-term floor after a bad era.');
assert((warnerAfterFlops.flops || 0) >= 24, 'Flops should be tracked on the studio portfolio.');
assert((warnerAfterFlops.projectsReleased || 0) >= 25, 'Studio portfolio count should include all simulated releases.');

const marvelBefore = clone(world.studios!.MARVEL_STUDIOS);
const universeHit = makeProject('living_mcu_release', 'MARVEL_STUDIOS', 2_400_000_000, 88, 'HIT', 'MCU');
world = applyStudioProjectOutcome(world, universeHit).world;
const marvelAfter = world.studios!.MARVEL_STUDIOS;
assert(marvelAfter.valuation > marvelBefore.valuation, 'Universe releases should move the parent studio valuation.');
assert.equal(marvelAfter.lastReleaseTitle, universeHit.title, 'Universe release should become parent studio latest release.');
assert((marvelAfter.hits || 0) > (marvelBefore.hits || 0), 'Universe hit should count in parent studio hit portfolio.');

const playerForStock: Player = {
    ...clone(INITIAL_PLAYER),
    stocks: initializeStocks(),
    world: {
        ...clone(INITIAL_PLAYER.world),
        projects: [hit, universeHit],
        studios: world.studios,
    } as WorldState,
};
const mediaStock = playerForStock.stocks.find(stock => stock.relatedStudioId === 'WARNER_BROS')!;
mediaStock.price = 12.5;
mediaStock.priceHistory = Array(12).fill(12.5);
const originalRandom = Math.random;
Math.random = () => 0.48;
try {
    const stockUpdate = processStockMarket([mediaStock], 20, playerForStock);
    assert(stockUpdate.stocks[0].price > 12.5, 'Studio-linked stocks should react upward to recent studio hits.');
} finally {
    Math.random = originalRandom;
}

console.log('Living studio ecosystem audit passed.');
