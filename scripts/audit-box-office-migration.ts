import assert from 'node:assert/strict';
import { CinemaMemorySaveStore, cinemaLegacyIntegrityHash } from './fixtures/cinemaSaveStore';
import { saveVerifiedGameData, loadVerifiedGameData, recoverPreviousGameData } from '../services/saveGenerations';
import { compactCinemaMarketState } from '../services/boxOffice/boxOfficeHistory';
import { rebaseCinemaSavedState } from '../services/boxOffice/boxOfficeClock';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';
import { migratePlayerSave } from '../services/saveMigration';
import { migrateCinemaState } from '../services/boxOffice/boxOfficeMigration';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import type { ActiveRelease } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { compareProtectedSaveState } from '../services/saveIntegrity';
import { buildLegacyStudioInheritance, getAbsoluteWeek } from '../services/legacyLogic';
let passed=0;
const test=(name:string,run:()=>void)=>{run();passed++;console.log(`PASS ${name}`)};
const fixture=()=>{const {player,project}=makeCinemaFixture(4);player.activeReleases=[{id:'old-active',name:'Old Active',type:'MOVIE',roleType:'LEAD',projectDetails:project,
  distributionPhase:'THEATRICAL',status:'RUNNING',weekNum:5,weeklyGross:[100_000_000,50_000_000],totalGross:150_000_000,totalStudioReceipts:60_000_000,budget:50_000_000,productionPerformance:80} as ActiveRelease];return player};
test('absent state activates the next unprocessed week without changing cash or historical gross',()=>{
 const p=fixture(),before=structuredClone(p),week=getAbsoluteWeek(p.age,p.currentWeek),r=migrateCinemaState(p,week);
 assert.ok(r.player.world.cinemaMarket);assert.equal(r.status,'MIGRATED');assert.equal(r.player.world.cinemaMarket.activationWeek,week+1);
 assert.equal(r.player.money,p.money);assert.equal(r.player.activeReleases[0].totalGross,150_000_000);assert.equal(r.player.activeReleases[0].totalStudioReceipts,60_000_000);assert.deepEqual(p,before);
});
test('active legacy audience is bounded estimated history without historical payout',()=>{
 const p=fixture(),r=migrateCinemaState(p,1000),state=r.player.world.cinemaMarket!;
 assert.equal(state.titles['old-active'].basis,'LEGACY_ACTIVE');assert.equal(state.titles['old-active'].legacyGrossCents,15_000_000_000);assert.equal(state.titles['old-active'].grossCents,0);
 assert.equal(r.player.activeReleases[0].cinema!.audienceBasis,'LEGACY_ESTIMATE');assert.equal(state.weeks.length,0);
});
test('migration is idempotent and survives JSON reload',()=>{const r=migrateCinemaState(fixture(),1000);assert.deepEqual(migrateCinemaState(r.player,1000).player,r.player);const json=JSON.parse(JSON.stringify(r.player));assert.deepEqual(migrateCinemaState(json,1000).player,json)});
test('fully settled NPC gross is preserved and cannot enter new payouts',()=>{
 const p=fixture();p.world.projects=[{id:'old-npc',title:'Old NPC',genre:'ACTION',studioId:'UNIVERSAL',budgetTier:'HIGH',quality:80,boxOffice:900_000_000,year:29,weekReleased:20,leadActorId:'actor',leadActorName:'Actor',directorName:'Director',reviews:'Good'}];
 const r=migrateCinemaState(p,1000);assert.equal(r.player.world.projects[0].boxOffice,900_000_000);assert.equal(r.player.world.cinemaMarket!.titles['old-npc'].basis,'LEGACY_FULLY_SETTLED');assert.ok(r.player.world.cinemaMarket!.titles['old-npc'].closed);
});
test('unsupported future schema is rejected without overwriting input',()=>{const p=fixture();p.world.cinemaMarket={schemaVersion:99,secret:'future-paid-record'} as never;const before=structuredClone(p);const r=migrateCinemaState(p,1000);assert.equal(r.status,'REJECTED');assert.deepEqual(r.player,before);assert.ok(r.diagnostics.some(d=>d.code==='CINEMA_FUTURE_SCHEMA'))});
test('ambiguous partial paid state is recoverably rejected instead of reset',()=>{const p=fixture();p.world.cinemaMarket={schemaVersion:1,titles:{paid:{grossCents:100}}} as never;const r=migrateCinemaState(p,1000);assert.equal(r.status,'REJECTED');assert.equal(r.player,p)});
test('corrupt money and historical gross are never silently normalized into a migration',()=>{for(const bad of [-1,NaN,Infinity]){const p=fixture();p.activeReleases[0].totalGross=bad;const r=migrateCinemaState(p,1000);assert.equal(r.status,'REJECTED');assert.equal(r.player,p)}});
test('actual loader refuses corrupt raw legacy money before defaults',()=>{for(const bad of [-1,NaN,Infinity]){const p=fixture();p.activeReleases[0].totalGross=bad;assert.throws(()=>migratePlayerSave(p),/Cinema.*recovery/)}});
test('actual inheritance remaps parent cinema identity',()=>{const p=migrateCinemaState(fixture(),1000).player;p.world.cinemaMarket!.market.titles[0].cast=[{personId:'PLAYER_SELF',name:p.name,roleType:'LEAD',roleWeight:1,fame:80,isPlayer:true,characterIds:[]}];const inherited=buildLegacyStudioInheritance(p,{heirAge:20,heirWeek:1});const world=(inherited as any).inheritedWorld || (inherited as any).world;assert.ok(world);assert.notEqual(world.cinemaMarket.market.titles[0].cast[0].personId,'PLAYER_SELF');assert.equal(world.cinemaMarket.market.titles[0].cast[0].isPlayer,false)});
test('settled legacy display history can compact while financial truth stays protected',()=>{const p=fixture();p.world.projects=Array.from({length:901},(_,i)=>({id:`legacy-${i}`,title:`Legacy ${i}`,genre:'ACTION',studioId:'UNIVERSAL',budgetTier:'HIGH',quality:80,boxOffice:100,year:1,weekReleased:1,leadActorId:'actor',leadActorName:'Actor',directorName:'Director',reviews:'Good'}));const migrated=migrateCinemaState(p,1000).player;const compacted=compactPlayerForPersistence(migrated);assert.ok(compacted.world.projects.length<901);assert.deepEqual(compareProtectedSaveState(migrated,compacted),{ok:true});assert.equal(Object.keys(compacted.world.cinemaMarket!.titles).length,902)});
test('partial receipts and malformed audience memory require recovery before signing',()=>{for(const change of [(s:any)=>s.weeks=[{id:'claimed-paid-week',titles:[]}],(s:any)=>s.market.affinities=[null],(s:any)=>s.market.titles=[{titleId:'partial-title',cells:[],appliedExposureIds:[]}]]){const p=migrateCinemaState(fixture(),1000).player;change(p.world.cinemaMarket);assert.equal(migrateCinemaState(p,1000).status,'REJECTED');assert.throws(()=>migratePlayerSave(p),/Cinema.*recovery/);assert.equal(verifySaveIntegrity(p,createSaveIntegrityManifest(p,'MIGRATION')).ok,false)}});
test('legacy catalogue with missing theatrical facts stays unknown and already settled',()=>{const p=fixture();p.world.projects=[{id:'legacy-stream-catalogue',title:'Library',mediaType:'MOVIE',genre:'DRAMA',quality:80,year:25,weekReleased:1} as never];const r=migratePlayerSave(p);assert.equal(r.world.projects[0].boxOffice,undefined);assert.equal(r.world.cinemaMarket!.titles['legacy-stream-catalogue'].legacyGrossKnown,false);assert.equal(r.world.cinemaMarket!.titles['legacy-stream-catalogue'].basis,'LEGACY_FULLY_SETTLED')});
test('signed streaming agreements survive unchanged',()=>{const p=fixture();p.activeReleases[0].streaming={platformId:'NETFLIX',weekOnPlatform:0,totalViews:0,weeklyViews:[],isLeaving:false,startWeekAbsolute:1052};const before=structuredClone(p.activeReleases[0].streaming);assert.deepEqual(migrateCinemaState(p,1000).player.activeReleases[0].streaming,before)});
test('load migration rejects future cinema state before generic defaults can overwrite it',()=>{
 const p=fixture();p.world.cinemaMarket={schemaVersion:99} as never;assert.throws(()=>migratePlayerSave(p),/Cinema.*recovery/);
});
test('cinema audience and receipt checkpoints are protected by save integrity',()=>{
 const p=migrateCinemaState(fixture(),1000).player,manifest=createSaveIntegrityManifest(p,'MIGRATION');assert.ok(verifySaveIntegrity(p,manifest).ok);
 const changed=structuredClone(p);changed.world.cinemaMarket!.lastProcessedAbsoluteWeek++;assert.equal(verifySaveIntegrity(changed,manifest).ok,false);
});
test('issued digest schema 2 still verifies its exact pre-cinema projection',()=>{
 const p=migrateCinemaState(fixture(),1000).player,latest=createSaveIntegrityManifest(p,'MIGRATION',123);
 const {digest:_digest,createdAt:_createdAt,...core}=latest;const protectedV2={...core.protected};delete protectedV2.cinemaState;
 const oldCore={...core,digestSchemaVersion:2,protected:protectedV2};const old={...oldCore,createdAt:123,digest:cinemaLegacyIntegrityHash(oldCore)};
 assert.ok(verifySaveIntegrity(p,old).ok);const changed=structuredClone(p);changed.money++;assert.equal(verifySaveIntegrity(changed,old).ok,false);
});
test('closed audience matrices retire into compact earned universe/actor memory',()=>{
 const p=migrateCinemaState(fixture(),1000).player,state=p.world.cinemaMarket!.market;state.titles[0].universeId='earned-universe';
 const next=compactCinemaMarketState(state,new Set());assert.equal(next.titles.length,0);assert.ok(next.affinities.some(a=>a.kind==='UNIVERSE' && a.id==='earned-universe'));
 assert.equal(p.activeReleases[0].totalGross,150000000);
});
test('inheritance changes the cinema clock without changing paid source identities',()=>{
 const p=migrateCinemaState(fixture(),1000).player,state=p.world.cinemaMarket!;state.weeks=[{id:'paid-original',absoluteWeek:1000,clockEpoch:0,inputFingerprint:'frozen',receiptSignature:'paid',titles:[]}];
 const before=structuredClone(state),next=rebaseCinemaSavedState(state,-200);assert.equal(next.clockEpoch,1);assert.equal(next.lastProcessedAbsoluteWeek,800);assert.equal(next.market.lastProcessedAbsoluteWeek,800);assert.deepEqual(next.weeks,before.weeks);assert.deepEqual(state,before);
});
const store=new CinemaMemorySaveStore(),original=migrateCinemaState(fixture(),1000).player;
await saveVerifiedGameData(store,'cinema',original,createSaveIntegrityManifest(original,'MIGRATION'));
const next=structuredClone(original);next.world.cinemaMarket!.lastProcessedAbsoluteWeek++;next.world.cinemaMarket!.market.lastProcessedAbsoluteWeek++;
store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,'cinema',next,createSaveIntegrityManifest(next,'PROCESS_WEEK')),/promotion/);
assert.equal((await loadVerifiedGameData(store,'cinema')).status,'CURRENT');assert.deepEqual(store.records.get('cinema'),original);
store.failPromotion=false;await saveVerifiedGameData(store,'cinema',next,createSaveIntegrityManifest(next,'PROCESS_WEEK'));
const damaged=store.records.get('cinema') as typeof original;damaged.world.cinemaMarket!.titles['old-active'].grossCents=100;
assert.equal((await loadVerifiedGameData(store,'cinema')).status,'RECOVERY_AVAILABLE');
assert.deepEqual(await recoverPreviousGameData(store,'cinema'),original);passed++;
console.log('PASS actual save-generation failure and previous-generation recovery retain cinema money/history');
console.log(`Migration audit: ${passed} groups passed`);
