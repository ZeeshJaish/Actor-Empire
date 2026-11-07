import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {CinemaFileSaveStore} from './fixtures/cinemaFileSaveStore';
import {migratePlayerSave} from '../services/saveMigration';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import type {Player} from '../types';

const file=process.env.CINEMA_FINAL_CHECKPOINT!,output=process.env.CINEMA_FINAL_SAFETY_OUTPUT!;assert.ok(file&&output);
const checkpoint=readCinemaAuditCheckpoint<any>(file);assert.ok(checkpoint?.player);
const player:Player=checkpoint.player;delete checkpoint.player;delete checkpoint.npcDatabase;
const facts=(p:Player)=>({age:p.age,week:p.currentWeek,health:p.stats.health,isDead:p.flags.isDead,cash:p.money,skills:p.stats.skills,fame:p.stats.fame,reputation:p.stats.reputation,followers:p.stats.followers,
 businesses:p.businesses.map(b=>({id:b.id,balance:b.balance,ledger:b.studioState?.financeLedger,scripts:b.studioState?.scripts.map(s=>({id:s.id,status:s.status,developmentCost:s.developmentCost,developmentPayment:s.developmentPayment}))})),
 cinema:{titles:p.world.cinemaMarket?.titles,weeks:p.world.cinemaMarket?.weeks,bookingContracts:p.world.cinemaMarket?.bookingContracts,lastProcessed:p.world.cinemaMarket?.lastProcessedAbsoluteWeek,epoch:p.world.cinemaMarket?.clockEpoch},
 rights:p.world.streamingRightsContracts,portfolio:p.portfolio,team:{agent:p.team.agent,manager:p.team.manager,publicist:p.team.publicist,agentFee:p.team.lastAgentFeePaidWeek,managerFee:p.team.lastManagerFeePaidWeek},sponsors:p.activeSponsorships,
 roles:p.commitments.map(c=>({id:c.id,name:c.name,pay:c.lumpSum,agentCommission:c.agentCommission,royaltyPercentage:c.royaltyPercentage,
  prepaidDevelopmentCash:c.projectDetails?.hiddenStats?.prepaidDevelopmentCash,cast:c.projectDetails?.castList?.map(m=>({id:m.id,actorId:m.actorId,npcId:m.npcId,salary:m.salary,characterId:m.characterId,recognition:m.cinemaRecognition}))})),
 releases:p.activeReleases.map(r=>({id:r.id,name:r.name,gross:r.totalGross,receipts:r.totalStudioReceipts})),
 history:p.pastProjects.map(p=>({id:p.id,name:p.name,gross:p.gross}))});
const hash=(p:Player)=>createHash('sha256').update(JSON.stringify(facts(p))).digest('hex');
const before=hash(player),migrated=migratePlayerSave(player);assert.equal(hash(migrated),before,'Current migration cannot rewrite earned facts');
const prepared=prepareVerifiedPlayerForPersistence(migrated,'MIGRATION');assert.equal(hash(prepared.player),before,'Persistence preparation cannot rewrite earned facts');
const directory=mkdtempSync(join(tmpdir(),'cinema-mature-final-safety-')),store=new CinemaFileSaveStore(directory),key='earned-final';
try{
 const assertCurrent=async(remigrate=false)=>{const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');assert.equal(hash(remigrate?migratePlayerSave(loaded.player!):loaded.player!),before)};
 await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);
 await assertCurrent();
 store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,prepared.player,prepared.manifest),/promotion/);store.failPromotion=false;
 await assertCurrent();
 await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);
 await assertCurrent(true);
 const result={passed:5,failures:0,weeks:checkpoint.weeks,executable:checkpoint.executable,paidFactsSha256:before,cash:player.money,newGameWeeksProcessed:0,personalSaveStorageAccessed:false};
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{rmSync(directory,{recursive:true,force:true})}
