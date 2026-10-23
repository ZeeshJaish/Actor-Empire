import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const ts: typeof import('typescript') = createRequire(process.cwd() + '/package.json')('typescript');
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';
import * as legacy from '../services/legacyLogic';
import { handoffOwnedStreamingPlatformToHeir } from '../services/streamingLegacy';
import { migratePlayerSave } from '../services/saveMigration';
import { GLOBAL_ACTOR_PACKS, createGlobalActorPackNPCs } from '../services/npcLogic';
import { getEnabledGlobalCreatorProfiles } from '../services/youtubeLogic';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { makeCinemaFixture } from '../scripts/fixtures/boxOfficeScenarios';
import { prepareCinemaAudienceWorld } from '../services/boxOffice/boxOfficeWeek';
import { quoteCinemaRightsForBuyer, applyCinemaRightsQuoteToBidder } from '../services/boxOffice/boxOfficeRightsAdapter';
import { buildStreamingBiddingRightsLot } from '../services/streamingRightsCompatibility';
import { buildReleaseStreamingBidderMarket } from '../services/releaseStreamingAuction';
import { createStreamingBiddingSession, advanceStreamingBiddingSession } from '../services/streamingBidding';

const results: any = { modSuccession: [], streaming: [] };
const app = readFileSync('App.tsx', 'utf8');
const handler = app.slice(app.indexOf('const handleContinueAsChild ='), app.indexOf('const handleEventComplete ='));
assert(handler.includes('const migratedChildPlayer = migratePlayerSave(newPlayer)'));
const compiled = ts.transpileModule(`${handler}\nhandleContinueAsChild(child); return captured();`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
if (process.argv[2] !== 'series') for (const isDead of [false, true]) for (const gender of ['MALE', 'FEMALE']) {
    const parent = structuredClone(INITIAL_PLAYER);
    parent.age = 60; parent.currentWeek = 20; parent.money = 100_000_000;
    parent.name = 'Mod Succession Parent'; parent.flags.isDead = isDead;
    const pack = GLOBAL_ACTOR_PACKS[0];
    const actors = createGlobalActorPackNPCs(pack.id);
    parent.flags.enabledGlobalActorPacks = [pack.id];
    parent.flags.modHistory = [{ id: 'mod-test', type: 'GLOBAL_ACTOR_PACK', packId: pack.id, enabledAtAge: 50, enabledAtWeek: 1 }];
    parent.flags.extraNPCs = actors;
    parent.businesses = [createBusiness('Family Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20)];
    const child = { id: 'child-test', name: 'Mod Heir', age: 22, gender, relation: 'Child', closeness: 100, image: 'avatar' };
    parent.relationships = [child as any];
    let captured: any;
    const deps = { ...legacy, player: parent, child, INITIAL_PLAYER, handoffOwnedStreamingPlatformToHeir, migratePlayerSave,
        clone: structuredClone, tr: (key: string) => key, syncCurrentSlotSnapshot: () => {}, setPlayer: (p: any) => { captured = p; },
        setGameStatus: () => {}, setActivePage: () => {}, Page: { HOME: 'HOME' }, captured: () => captured };
    new Function(...Object.keys(deps), compiled)(...Object.values(deps));
    assert(captured, 'Actual App succession handler must produce the migrated child');
    assert.deepEqual(captured.flags.enabledGlobalActorPacks, [pack.id], 'Enabled pack selection must survive actual App succession');
    assert.deepEqual(captured.flags.modHistory, parent.flags.modHistory);
    const persisted = prepareVerifiedPlayerForPersistence(captured, 'MANUAL').player;
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(persisted)));
    assert.deepEqual(reloaded.flags.enabledGlobalActorPacks, [pack.id], 'Pack selection must survive save/reload');
    const record = { parentDeceased: isDead, heir: gender === 'MALE' ? 'son' : 'daughter', pack: pack.id,
        parentEnabled: parent.flags.enabledGlobalActorPacks, childEnabled: captured.flags.enabledGlobalActorPacks || [],
        childEnabledAfterReload: reloaded.flags.enabledGlobalActorPacks || [], parentPackActorProfiles: actors.length,
        childPackActorProfiles: captured.flags.extraNPCs.filter((n: any) => actors.some(a => a.id === n.id)).length,
        parentCreatorOptions: getEnabledGlobalCreatorProfiles(parent).length, childCreatorOptions: getEnabledGlobalCreatorProfiles(captured).length,
        parentModHistory: parent.flags.modHistory.length, childModHistory: captured.flags.modHistory?.length || 0 };
    results.modSuccession.push(record); console.log('PASS mod succession', JSON.stringify(record));
}

if (process.argv[2] !== 'series') {
    const pack = GLOBAL_ACTOR_PACKS[0], actors = createGlobalActorPackNPCs(pack.id);
    const affected = structuredClone(INITIAL_PLAYER);
    affected.flags.legacyParent = { actorId: 'parent', playerId: 'old-player' } as any;
    affected.flags.extraNPCs = [{ ...actors[0], stats: { ...actors[0].stats, talent: 97 } }];
    const recovered = migratePlayerSave(affected);
    assert.deepEqual(recovered.flags.enabledGlobalActorPacks, [pack.id], 'Old affected heir recovers proven pack selection');
    assert.equal(recovered.flags.extraNPCs.find(n => n.id === actors[0].id)!.stats.talent, 97);
    const twice = migratePlayerSave(recovered);
    assert.deepEqual(twice.flags.enabledGlobalActorPacks, [pack.id]);
    assert.equal(new Set(twice.flags.extraNPCs.map(n => n.id)).size, twice.flags.extraNPCs.length);
    const snapshotOnly = structuredClone(affected); snapshotOnly.flags.extraNPCs = [];
    snapshotOnly.studio.talentRoster = [{ id: 'saved-contract', npcId: actors[0].id,
        actorSnapshot: { ...actors[0], stats: { ...actors[0].stats, talent: 97 } }, type: 'MOVIE_DEAL', paymentMode: 'UPFRONT',
        totalAmount: 1234, totalMovies: 2, moviesRemaining: 1, maintenanceFee: 0, totalInstallments: 1, installmentsPaid: 1,
        amountPaid: 1234, startWeek: 1, status: 'ACTIVE' }];
    const snapshotRepair = migratePlayerSave(snapshotOnly);
    assert.deepEqual(snapshotRepair.flags.enabledGlobalActorPacks, [pack.id], 'A saved exact contract snapshot repairs pack selection on the first load');
    assert.equal(snapshotRepair.flags.extraNPCs.find(n => n.id === actors[0].id)!.stats.talent, 97, 'Pack hydration cannot overwrite saved actor stats');
    const unrelated = structuredClone(affected); delete unrelated.flags.legacyParent;
    assert.equal(migratePlayerSave(unrelated).flags.enabledGlobalActorPacks?.length || 0, 0, 'No inference in unrelated fresh careers');
    const invalid = structuredClone(affected); invalid.flags.extraNPCs = [{ ...actors[0], id: 'mod_actor_invalid_0' }];
    assert.equal(migratePlayerSave(invalid).flags.enabledGlobalActorPacks?.length || 0, 0, 'Invalid profile cannot enable a pack');
    const deceased = structuredClone(recovered); deceased.flags.extraNPCs = deceased.flags.extraNPCs.filter(n => n.id !== actors[0].id);
    deceased.flags.dynastyCareer = { members: { [actors[0].id]: { npcId: actors[0].id, status: 'DECEASED' } } } as any;
    assert(!migratePlayerSave(deceased).flags.extraNPCs.some(n => n.id === actors[0].id), 'Pack hydration cannot revive a deceased actor');
    console.log('PASS affected heir recovery, current actor stats, idempotence, unrelated careers and deceased actor safety');
}

const f = makeCinemaFixture();
const now = legacy.getAbsoluteWeek(f.player.age, f.player.currentWeek);
f.player = prepareCinemaAudienceWorld(f.player, now);
f.project.cinemaExposure = { version: 1, attentionBasis: 'PACKAGE', attentionPotential: 80,
    events: [{ id: 'campaign', titleId: 'film', absoluteWeek: now, kind: 'PAID_CAMPAIGN', channel: 'TEST', paidCostCents: 100000000, impressions: 2000000000 }] };
const lot = buildStreamingBiddingRightsLot({ world: f.player.world, sourceProjectId: 'film', sellerPartyId: f.project.studioId,
    startsAtAbsoluteWeek: now + 1, maximumDurationWeeks: 52, windowType: 'FIRST_WINDOW' }).lot!;
assert(lot);
const market = buildReleaseStreamingBidderMarket(f.player, { projectId: 'film', title: f.project.title, genre: f.project.genre,
    packageScore: 80, absoluteWeek: now, earliestPremiereAbsoluteWeek: now + 1, studioPlatformRelations: {} });
for (const projectType of ['MOVIE', 'SERIES'] as const) for (const budget of [10_000_000, 1_000_000_000, 1_000_000_000_000]) {
    const details = { ...f.project, type: projectType, estimatedBudget: budget, castList: [{ id: 'role', actorId: 'celeb_act_0', actorName: 'Same Actor', salary: budget - 1000, roleType: 'LEAD' }] } as any;
    const platforms = market.map(p => projectType === 'MOVIE'
        ? applyCinemaRightsQuoteToBidder(p, quoteCinemaRightsForBuyer(f.player, details, 'film', p.id, now + 1, 52, lot.countryIds)) : p);
    let session = createStreamingBiddingSession({ projectId: 'film', title: f.project.title, sellerStudioId: f.project.studioId,
        sellerStudioName: 'Universal', absoluteWeek: now, projectType, genre: f.project.genre, projectBudget: budget,
        packageScore: 80, rightsLot: lot, platforms });
    session = advanceStreamingBiddingSession(session, 45);
    const offers = session.offers.map(o => ({ buyer: o.platformId, minimumGuarantee: o.minimumGuarantee, productionFunding: o.productionFunding,
        futureSeasonFunding: o.futureSeasonFunding, fixedPayout: o.minimumGuarantee + o.productionFunding + o.futureSeasonFunding }));
    const record = { type: projectType, budget, maximumFixedPayout: Math.max(...offers.map(o => o.fixedPayout)),
        maximumExposure: Math.max(...session.platformStates.map(p => p.fixedExposureCeiling)),
        maximumMinimumGuarantee: Math.max(...offers.map(o => o.minimumGuarantee)), offers };
    results.streaming.push(record); console.log('MEASURED streaming', JSON.stringify({ ...record, offers: undefined }));
}
const movies = results.streaming.filter((r: any) => r.type === 'MOVIE');
assert(movies.every((r: any) => JSON.stringify(r.offers) === JSON.stringify(movies[0].offers)), 'Movie salary/budget inflation must not raise live structured bids');
const series = results.streaming.filter((r: any) => r.type === 'SERIES');
assert(series.every((r: any) => JSON.stringify(r.offers) === JSON.stringify(series[0].offers)), 'Series bids must not rise just because actor/production expense rises');
writeFileSync('docs/reports/2026-10-23-series-mod-safety/evidence/results.json', JSON.stringify(results, null, 2) + '\n');
console.log('PASS series budget invariance and inherited mod configuration through the actual production paths.');
