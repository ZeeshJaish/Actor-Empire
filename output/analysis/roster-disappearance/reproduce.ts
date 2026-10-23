import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../../../types';
import { NPC_DATABASE, generateNewUnknowns } from '../../../services/npcLogic';
import { createBusiness } from '../../../services/businessLogic';
import { negotiateTalentContract } from '../../../services/talentNegotiation';
import { processLivingEnsembleWeek } from '../../../services/livingEnsemble';
import { consumeTalentUses, hasTalentUses, talentAmountOutstanding, mergeParentStudioTalentRosters } from '../../../services/talentRoster';
import { compactPlayerForPersistence } from '../../../services/saveCompaction';
import { processGameWeek } from '../../../services/gameLoop';
import { isCastableMovieRoleId } from '../../../views/lifestyle/business/greenlightUtils';
import { prepareVerifiedPlayerForPersistence } from '../../../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../../../services/saveGenerations';
import { CinemaMemorySaveStore } from '../../../scripts/fixtures/cinemaSaveStore';

const actor = {...generateNewUnknowns(1)[0], id:'qa-hired-generated-actor',name:'QA Hired Actor',tier:'UNKNOWN' as const,traits:[],isIndependent:false};
let p=structuredClone(INITIAL_PLAYER);
Object.assign(p,{id:'roster-analysis-only',name:'Roster QA',age:30,currentWeek:20,money:2_000_000_000});
p.stats.fame=100;
const studio=createBusiness('Roster QA Studio','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',p.currentWeek);
studio.balance=1_000_000_000;p.businesses=[studio];
const signed=negotiateTalentContract(p,studio.id,actor,3,100_000_000,'UPFRONT');
assert.equal(signed.result.success,true,signed.result.message);p=signed.player;
assert.ok(p.flags.extraNPCs.some(n=>n.id===actor.id));
assert.equal(p.studio.talentRoster[0].moviesRemaining,3);
const originalMoney=p.money;
const roster=(player:Player)=>mergeParentStudioTalentRosters(studio.id,player.studio.talentRoster,player.businesses[0].studioState!.talentRoster);
const resolve=(player:Player,id:string)=>[...NPC_DATABASE,...(player.flags.extraNPCs||[])].find(n=>n.id===id);
const describe=(player:Player)=>({contractCount:roster(player).length,remaining:roster(player)[0]?.moviesRemaining,actorProfilePresent:Boolean(resolve(player,actor.id)),sequelCastEligible:isCastableMovieRoleId(actor.id,player.flags.extraNPCs),extraNpcCount:player.flags.extraNPCs.length});
console.log('CONTROL hire:',JSON.stringify(describe(p)));
const crowded=structuredClone(p);
crowded.flags.extraNPCs=[...crowded.flags.extraNPCs,...Array.from({length:240},(_,i)=>({...actor,id:`qa-fill-${i}`,name:`Filler ${i}`}))];
const quarter=processLivingEnsembleWeek(crowded);
assert.equal(roster(quarter).length,1);assert.equal(roster(quarter)[0].moviesRemaining,3);
assert.equal(resolve(quarter,actor.id),undefined);assert.equal(quarter.money,originalMoney);
console.log('REPRO quarterly cleanup:',JSON.stringify(describe(quarter)));
const afterWeek=(await processGameWeek(crowded)).player;
assert.equal(roster(afterWeek).length,1);assert.equal(roster(afterWeek)[0].moviesRemaining,3);
assert.equal(resolve(afterWeek,actor.id),undefined);
console.log('REPRO actual game week:',JSON.stringify(describe(afterWeek)));
const prepared=prepareVerifiedPlayerForPersistence(afterWeek,'MANUAL');
const store=new CinemaMemorySaveStore();
await saveVerifiedGameData(store,'isolated-roster-analysis',prepared.player,prepared.manifest);
const loaded=await loadVerifiedGameData(store,'isolated-roster-analysis');
assert.equal(loaded.status,'CURRENT');assert.equal(loaded.player!.money,prepared.player.money);
assert.equal(resolve(loaded.player!,actor.id),undefined);
console.log('REPRO verified save/reload:',JSON.stringify({status:loaded.status,...describe(loaded.player!)}));

for(const reference of ['PAST_PROJECT','RETURNING_SCRIPT','ACTIVE_CONTRACT','ACTIVE_PRODUCTION'] as const){
 const source=structuredClone(p);source.studio.talentRoster=[];source.businesses[0].studioState!.talentRoster=[];
 source.flags.extraNPCs=[actor,...Array.from({length:360},(_,i)=>({...actor,id:`qa-recent-${i}`}))];
 if(reference==='PAST_PROJECT')source.pastProjects=[{id:'qa-original-movie',name:'QA Original',castList:[{actorId:actor.id,name:actor.name,roleType:'LEAD'}]} as any];
 if(reference==='RETURNING_SCRIPT')source.businesses[0].studioState!.scripts=[{id:'qa-sequel',title:'QA Sequel',status:'CONCEPT',genres:['DRAMA'],returningTalent:[{id:actor.id,role:'LEAD_ACTOR',name:actor.name}]} as any];
 if(reference==='ACTIVE_CONTRACT'){source.studio.talentRoster=p.studio.talentRoster;source.businesses[0].studioState!.talentRoster=p.businesses[0].studioState!.talentRoster;}
 if(reference==='ACTIVE_PRODUCTION')source.commitments=[{id:'qa-production',type:'JOB',projectDetails:{castList:[{actorId:actor.id,name:actor.name,roleType:'LEAD'}]}} as any];
 const compacted=compactPlayerForPersistence(source);
 const retained=Boolean(resolve(compacted,actor.id));
 assert.equal(retained,reference==='ACTIVE_CONTRACT'||reference==='ACTIVE_PRODUCTION');
 console.log('COMPACTION reference:',JSON.stringify({reference,actorRetained:retained,sequelCastEligible:isCastableMovieRoleId(actor.id,compacted.flags.extraNPCs)}));
}
let contracts=roster(p);
for(let i=1;i<=3;i++){contracts=consumeTalentUses(contracts,[actor.id],`movie-${i}`);console.log('EXPECTED contract usage:',JSON.stringify({movie:i,remaining:contracts[0].moviesRemaining,status:contracts[0].status}));}
assert.equal(contracts.filter(c=>hasTalentUses(c)||talentAmountOutstanding(c)>0).length,0);
console.log('PASS all diagnostic expectations reproduced. Production code unchanged; no real save read.');
