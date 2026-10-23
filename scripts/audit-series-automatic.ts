import assert from 'node:assert/strict';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { createBusiness } from '../services/businessLogic';
import { processGameWeek } from '../services/gameLoop';
const f = makeCinemaFixture();
f.player.money = 1e9;
const studio = createBusiness('Independent Series Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO',
    { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', f.player.currentWeek);
studio.balance = 1e9; studio.studioState!.operatingModel = 'INDEPENDENT_LABEL';
f.player.businesses = [studio];
const details = { ...f.project, type: 'SERIES', studioId: studio.id, episodes: 4, estimatedBudget: 1e12 };
f.player.activeReleases = [{ id: 'old-series-auto', name: 'Old Unsigned Series', type: 'SERIES', status: 'FINISHED',
    projectDetails: details, budget: 1e12, totalGross: 0, totalViews: 0, imdbRating: 7, weekNum: 1,
    distributionPhase: 'STREAMING_BIDDING', releaseYear: f.player.age, releaseWeek: f.player.currentWeek,
    weeklyGross: [], weeksInTheaters: 0, maxTheatricalWeeks: 0,
    bids: [{ platformId: 'NETFLIX', upfront: 1e12, royalty: 0, duration: 52 }] }] as any;
const result = (await processGameWeek(f.player)).player;
const contracts = Object.values(result.world.streamingRightsContracts || {}).filter(c => c.sourceProjectId === 'old-series-auto');
assert.equal(contracts.length, 1, 'Old automatic series must replace oversized unsigned bids and complete a safe sale');
assert(contracts[0].minimumGuarantee > 0 && contracts[0].minimumGuarantee < 1e12);
const again = (await processGameWeek(result)).player;
assert.equal(Object.values(again.world.streamingRightsContracts || {}).filter(c => c.sourceProjectId === 'old-series-auto').length, 1);
console.log('PASS legacy automatic series replaces inflated bids, signs within buyer value and remains one contract next week');
