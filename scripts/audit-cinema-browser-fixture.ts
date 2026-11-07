/** Prepare a copy of a retained real earned save for an ephemeral browser only.
 * No authored cash, craft, projects or readiness and no personal save access. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {migratePlayerSave} from '../services/saveMigration';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {getCinemaProjectFinance} from '../services/boxOffice/boxOfficeSettlement';
import {APP_DISPLAY_VERSION} from '../services/appVersion';
import {NPC_DATABASE} from '../services/npcLogic';
const origin=process.env.CINEMA_BROWSER_CHECKPOINT||'cinema-verification.local/owned-studio-20261029/earned-owned-prefix/career-0.json.gz';
const output=process.env.CINEMA_BROWSER_FIXTURE;assert.ok(output);
const saved=readCinemaAuditCheckpoint<any>(origin);assert.ok(saved?.player);if(saved.npcDatabase){NPC_DATABASE.length=0;NPC_DATABASE.push(...saved.npcDatabase);delete saved.npcDatabase;}
const p=saved.player;delete saved.player;
const facts=(v:typeof p)=>JSON.stringify({money:v.money,businesses:v.businesses.map((b:any)=>[b.id,b.balance]),cinema:v.world.cinemaMarket,rights:v.world.streamingRightsContracts,sponsors:v.activeSponsorships});
const before=facts(p),migrated=migratePlayerSave(p);assert.equal(facts(migrated),before);
const prepared=prepareVerifiedPlayerForPersistence(migrated,'MIGRATION');assert.equal(facts(prepared.player),before);
const owned=prepared.player.activeReleases.filter(r=>r.projectDetails?.studioId===saved.studioId);
const mode=process.env.CINEMA_BROWSER_MODE||'LIVE_THEATRICAL';
if(mode==='READY_SCRIPT')assert.ok(prepared.player.businesses.some(b=>b.studioState?.scripts.some(s=>s.status==='READY'&&s.developmentPayment?.cashPaid)), 'Use an actual paid developed script');
else if(mode==='AWAITING_RELEASE')assert.ok(prepared.player.commitments.some(c=>c.projectPhase==='AWAITING_RELEASE'),'Use actual finished production');
else assert.ok(owned.some(r=>r.distributionPhase==='THEATRICAL'),'Use an actual retained live film, not an authored readiness fixture');
writeFileSync(output,JSON.stringify({player:prepared.player,manifest:prepared.manifest,version:APP_DISPLAY_VERSION,slot:3,mode,origin,originSha256:createHash('sha256').update(readFileSync(origin)).digest('hex'),method:'Actual retained earned profile. Rendering/action/safety test only; funding provenance belongs to the source career report, not this browser check.',expected:owned.map(r=>({id:r.id,name:r.name,...getCinemaProjectFinance(r)}))}));
writeFileSync(output+'.facts.json',JSON.stringify({name:prepared.player.name,cash:prepared.player.money,age:prepared.player.age,week:prepared.player.currentWeek,slot:3,version:APP_DISPLAY_VERSION,expected:owned.map(r=>({id:r.id,name:r.name,...getCinemaProjectFinance(r)}))},null,2));
console.log(JSON.stringify({passed:3,output,personalSaveStorageAccessed:false,originWeeks:saved.weeks,liveOwned:owned.length}));
