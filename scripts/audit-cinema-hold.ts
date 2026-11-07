/**
 * #243 (plan §25.4 Q6): a deal signed during a cinema run starts the week after cinemas really close. Early or late, no dark weeks, and never on
 * the platform and in cinemas at once.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player, type StreamingRightsContract } from '../types';
import { holdStreamingWindowForCinema, keepStreamingWindowsBehindCinema, openStreamingWindowsAfterCinema } from '../services/streamingCinemaHold';
import { getStreamingPremiereStatus } from '../services/streamingPremiereStatus';
import { getAbsoluteWeek } from '../services/legacyLogic';
import type { ActiveRelease } from '../types';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { createBusiness } from '../services/businessLogic';
import { migrateCinemaState } from '../services/boxOffice/boxOfficeMigration';
import { buildCinemaWeekInput } from '../services/boxOffice/boxOfficeWeek';
import { quoteCinemaSupply } from '../services/boxOffice/boxOfficeSupply';
import { processGameWeek } from '../services/gameLoop';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';

const pass = (label: string) => console.log(`✓ ${label}`);
const NOW = getAbsoluteWeek(40, 10);
const contract = {
    id: 'deal', sourceProjectId: 'film', titleAtSigning: 'A Film', status: 'ACTIVE', signedAtAbsoluteWeek: NOW, startsAtAbsoluteWeek: NOW + 8, expiresAtAbsoluteWeek: NOW + 60,
    seller: { type: 'PLAYER_STUDIO', id: 'studio', name: 'Studio', platformId: null }, buyer: { type: 'PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
} as unknown as StreamingRightsContract;
const player = { ...structuredClone(INITIAL_PLAYER), id: 'hold', age: 40, currentWeek: 10, world: { ...INITIAL_PLAYER.world, streamingRightsContracts: { deal: contract } } } as unknown as Player;
const held = holdStreamingWindowForCinema(player, 'deal');
const of = (next: Player) => next.world.streamingRightsContracts!.deal;

assert.equal(of(held).holdsForCinemaClose, true);
assert.equal(of(held).startsAtAbsoluteWeek, NOW + 8, 'signing moves nothing yet');
assert.equal(getStreamingPremiereStatus(held, 'film')!.label, 'With Netflix · after cinemas close');
pass('signed during a run, it says it waits for the cinemas');

const earlyClose = openStreamingWindowsAfterCinema(held, 'film', NOW + 2);
assert.equal(earlyClose.startsAt, NOW + 3);
assert.equal(of(earlyClose.player).startsAtAbsoluteWeek, NOW + 3, 'no dark weeks: it was going to wait until week +8');
assert.equal(of(earlyClose.player).expiresAtAbsoluteWeek - of(earlyClose.player).startsAtAbsoluteWeek, 52, 'the term stays the term');
assert.equal(of(earlyClose.player).holdsForCinemaClose, undefined, 'no longer held');
pass('the cinemas close early: it starts next week, and its term is intact');

let running = held;
for (let week = NOW + 1; week <= NOW + 20; week += 1) {
    running = keepStreamingWindowsBehindCinema(running, 'film', week);
    assert.ok(of(running).startsAtAbsoluteWeek > week + 1, `never on both at week ${week}`);
}
const lateClose = openStreamingWindowsAfterCinema(running, 'film', NOW + 21);
assert.equal(of(lateClose.player).startsAtAbsoluteWeek, NOW + 22, 'the run lasted longer: it starts after it');
assert.equal(of(lateClose.player).expiresAtAbsoluteWeek - of(lateClose.player).startsAtAbsoluteWeek, 52);
pass('the run lasts long: the window keeps moving, and it is never on both at once');

assert.equal(openStreamingWindowsAfterCinema(player, 'film', NOW).startsAt, null, 'a deal not held is not touched');
assert.equal(of(keepStreamingWindowsBehindCinema(player, 'film', NOW + 7)).startsAtAbsoluteWeek, NOW + 8);
pass('a deal that is not held is not touched');

const wizard = readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
assert.ok(/holdStreamingWindowForCinema\(/.test(wizard), 'the wizard holds it when signed during a run');
assert.ok(/SECOND_WINDOW/.test(wizard), 'and it is not called the first window');
pass('the wizard holds it, and the window has its true name');
/* #244: the first version of this audit called the functions, and the game loop called them from a branch a movie never reaches. So: the real week. */
const realWeek = async () => {
    const f = makeCinemaFixture(31);
    f.player.money = 1e9;
    f.player.commitments = []; f.player.scheduledEvents = []; f.player.pendingEvents = []; f.player.world.projects = [];
    const studio = createBusiness('Hold Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20);
    studio.balance = 1e9;
    f.player.businesses = [studio];
    const week = getAbsoluteWeek(f.player.age, f.player.currentWeek) + 1;
    f.player = migrateCinemaState({ ...f.player, activeReleases: [] }, week - 1).player;
    const release = {
        id: 'film', name: 'Held Film', type: 'MOVIE', roleType: 'LEAD',
        projectDetails: { ...structuredClone(f.project), studioId: studio.id as never, castList: [], estimatedBudget: 1e12, releaseRegionIds: ['NORTH_AMERICA'], releaseChainSelections: { NORTH_AMERICA: ['NOVA_CIRCUIT'] }, cinemaExposure: { version: 1, attentionBasis: 'PACKAGE', attentionPotential: 0, events: [] } },
        weekNum: 11, weeklyGross: [], totalGross: 0, budget: 1e12, status: 'RUNNING', productionPerformance: 80, imdbRating: 8, distributionPhase: 'THEATRICAL', sequelDecisionMade: true, releasedAtAbsoluteWeek: week - 10,
        streaming: { platformId: 'NETFLIX', weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false, startWeekAbsolute: week + 8, startWeek: 1 },
    } as unknown as ActiveRelease;
    f.player.activeReleases = [release];
    const registered = registerProductionStreamingRightsContract(f.player, {
        sourceProjectId: 'film', title: 'Held Film', projectType: 'MOVIE', genre: 'ACTION', sellerStudioId: studio.id, sellerStudioName: studio.name, sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: 'NETFLIX', minimumGuarantee: 1_000_000, platformRevenueShare: 100, signedAtAbsoluteWeek: week - 1, startsAtAbsoluteWeek: week + 8, durationWeeks: 52,
    });
    assert.ok(registered.contract, 'the deal registers');
    const dealId = registered.contract!.id;
    f.player = holdStreamingWindowForCinema(registered.player, dealId);
    f.player.activeReleases[0].streamingRuns = [{ platformId: 'NETFLIX', contractId: dealId, startWeekAbsolute: week + 8, weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false }] as never;
    /* a run with audience left this week, and a run about to go quiet */
    const input = buildCinemaWeekInput(f.player, week);
    f.player.world.cinemaMarket!.market.runs = quoteCinemaSupply(input).offers.map(offer => ({ ...offer, quietWeeks: 2, closed: false }));
    const closed = await processGameWeek(f.player);
    const row = closed.player.world.streamingRightsContracts![dealId];
    assert.equal(closed.player.activeReleases.find(item => item.id === 'film')?.distributionPhase, 'STREAMING', 'the run closed this week');
    assert.equal(row.holdsForCinemaClose, undefined, 'no longer held');
    assert.equal(row.startsAtAbsoluteWeek, week + 1, 'the week after it closed, not eight weeks on');
    assert.equal(row.expiresAtAbsoluteWeek - row.startsAtAbsoluteWeek, 52, 'the term is intact');
    assert.equal(closed.player.activeReleases.find(item => item.id === 'film')?.streaming?.startWeekAbsolute, week + 1);
    assert.ok(closed.player.logs.some(log => log.message.includes('Held Film') && log.message.includes('next week')), 'a line in the activity log');
    pass('the real week: the cinemas close, and the window opens the week after');

    /* it stays in cinemas: the run has weeks left, and a window due next week moves */
    const open = structuredClone(f.player);
    open.world.streamingRightsContracts![dealId] = { ...open.world.streamingRightsContracts![dealId], startsAtAbsoluteWeek: week + 1, expiresAtAbsoluteWeek: week + 53 };
    open.world.cinemaMarket!.market.runs = quoteCinemaSupply(buildCinemaWeekInput(open, week)).offers.map(offer => ({ ...offer, quietWeeks: 0, closed: false }));
    open.activeReleases[0].projectDetails.cinemaExposure = { version: 1, attentionPotential: 80, attentionBasis: 'PACKAGE', events: [{ id: 'paid-film', titleId: 'film', absoluteWeek: week, kind: 'PAID_CAMPAIGN', channel: 'TEST_CAMPAIGN', paidCostCents: 100000000, impressions: 2000000000 }] } as never;
    open.activeReleases[0].budget = 50e6;
    open.activeReleases[0].projectDetails.estimatedBudget = 50e6;
    const running = await processGameWeek(open);
    const stillRunning = running.player.activeReleases.find(item => item.id === 'film');
    assert.equal(stillRunning?.distributionPhase, 'THEATRICAL', 'the run goes on');
    const moved = running.player.world.streamingRightsContracts![dealId];
    assert.equal(moved.startsAtAbsoluteWeek, week + 2, 'never on both: it moved on');
    assert.equal(moved.expiresAtAbsoluteWeek - moved.startsAtAbsoluteWeek, 52);
    assert.equal(moved.holdsForCinemaClose, true);
    pass('the real week: the run goes on, and the window moves on with it');
};
realWeek().then(() => console.log('cinema-hold audit passed'), error => { console.error(error); process.exit(1); });
