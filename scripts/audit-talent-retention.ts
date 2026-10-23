import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import { generateNewUnknowns } from '../services/npcLogic';
import { createBusiness } from '../services/businessLogic';
import { createContract } from '../services/talentService';
import { negotiateTalentContract } from '../services/talentNegotiation';
import { processLivingEnsembleWeek } from '../services/livingEnsemble';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { StudioPage } from '../views/StudioPage';
import { restoreContractActorProfiles, retainReferencedNpcProfiles } from '../services/npcRetention';
import { shouldPreserveReturningMovieRole, isCastableMovieRoleId } from '../views/lifestyle/business/greenlightUtils';
import { buildGreenlightProject } from '../views/lifestyle/business/greenlightProjectBuilder';
import { scriptVariationProjectInput } from './fixtures/scriptVariationProject';
import { mergeParentStudioTalentRosters } from '../services/talentRoster';
import { consumeTalentUses, settleTalentContractWeek } from '../services/talentRoster';

const fixture=()=>{
 const p=structuredClone(INITIAL_PLAYER);p.age=30;p.currentWeek=20;p.money=2e9;p.stats.fame=100;
 const studio=createBusiness('Retention QA','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);
 studio.balance=1e9;p.businesses=[studio];
 const actor={...generateNewUnknowns(1)[0],id:'retention-qa-actor',name:'Mira Retention',traits:[],isIndependent:false,tier:'UNKNOWN' as const};
 const c={...createContract(actor.id,'MOVIE_DEAL','UPFRONT',3,100000,100,20),studioId:studio.id};
 p.studio.talentRoster=[c];studio.studioState!.talentRoster=[c];
 p.flags.extraNPCs=[actor,...Array.from({length:400},(_,i)=>({...actor,id:`filler-${i}`,name:`Filler ${i}`}))];
 return {p,studio,actor,c};
};
const cases:Array<[string,()=>void]>=[];
cases.push(['quarterly cleanup preserves an active hired actor despite 400 newer profiles',()=>{
 const {p,actor,c}=fixture();const next=processLivingEnsembleWeek(p);
 assert.deepEqual(next.flags.extraNPCs.find(n=>n.id===actor.id),actor);
 assert.deepEqual(next.studio.talentRoster,[c]);assert.equal(next.money,p.money);
 assert.ok(next.flags.extraNPCs.length<=241,'Keep referenced profiles plus at most 240 unreferenced profiles');
}]);
for(const reference of ['past cast','sequel draft','subsidiary contract','universe','relationship'] as const){
 cases.push([`save compaction protects ${reference}`,()=>{
  const {p,studio,actor,c}=fixture();p.studio.talentRoster=[];studio.studioState!.talentRoster=[];
  if(reference==='past cast')p.pastProjects=[{id:'original-film',castList:[{actorId:actor.id,name:actor.name}]} as any];
  if(reference==='sequel draft')studio.studioState!.scripts=[{id:'sequel',returningTalent:[{id:actor.id,name:actor.name,role:'LEAD_ACTOR'}]} as any];
  if(reference==='subsidiary contract')studio.studioState!.talentRoster=[c];
  if(reference==='universe')p.world.universes={TEST:{id:'TEST',roster:[{actorId:actor.id,name:'Hero'}]}} as any;
  if(reference==='relationship')p.relationships=[{id:'relationship',npcId:actor.id}] as any;
  const next=compactPlayerForPersistence(p);
  assert.deepEqual(next.flags.extraNPCs.find(n=>n.id===actor.id),actor);
  assert.equal(next.money,p.money);assert.equal(next.businesses[0].balance,studio.balance);
 }]);
}
cases.push(['an unresolved old contract still renders its saved name, terms and recovery state',()=>{
 const {p,studio,actor}=fixture();p.flags.extraNPCs=[];
 p.pastProjects=[{id:'original',castList:[{actorId:actor.id,name:actor.name}]} as any];
 const html=renderToStaticMarkup(React.createElement(StudioPage,{player:p,studioId:studio.id,onBack:()=>{},onUpdatePlayer:()=>{}})).replace(/<!--.*?-->/g,'');
 assert.ok(html.includes('Roster (1)'));assert.ok(html.includes(actor.name));assert.ok(html.includes('Profile unavailable'));
 assert.ok(html.includes('3/3 Movies Left'));assert.ok(!html.includes('0 Fame'));
}]);
cases.push(['newly hired contract preserves an exact actor snapshot through normalization and load',()=>{
 const {p,studio,actor}=fixture();p.studio.talentRoster=[];studio.studioState!.talentRoster=[];p.flags.extraNPCs=[];
 const signed=negotiateTalentContract(p,studio.id,actor,3,100_000_000,'UPFRONT');assert.equal(signed.result.success,true);
 const contract=signed.player.studio.talentRoster[0] as any;
 assert.equal(contract.actorSnapshot?.id,actor.id);
 const old=structuredClone(signed.player);old.flags.extraNPCs=[];
 const restored=migratePlayerSave(old);assert.deepEqual(restored.flags.extraNPCs.find(n=>n.id===actor.id),actor);
 assert.equal(restored.money,old.money);assert.deepEqual(restored.studio.talentRoster[0],contract);
 assert.deepEqual(migratePlayerSave(restored).studio.talentRoster,restored.studio.talentRoster);
}]);
cases.push(['restoring a missing snapshot does not reprice or reset a legacy installment contract',()=>{
 const {p,studio,actor}=fixture();const c={...createContract(actor.id,'MOVIE_DEAL','WEEKLY_INSTALLMENTS',2,123457,101,3),studioId:studio.id,amountPaid:12345,installmentsPaid:7,moviesRemaining:1,consumedProjectIds:['existing-film'],actorSnapshot:actor};
 p.flags.extraNPCs=[];p.studio.talentRoster=[c];studio.studioState!.talentRoster=[c];
 const next=migratePlayerSave(p);assert.deepEqual(next.flags.extraNPCs.find(n=>n.id===actor.id),actor);for(const [key,value] of Object.entries(c))assert.deepEqual(next.studio.talentRoster[0][key],value);assert.equal(next.money,p.money);
}]);
cases.push(['finite film uses and outstanding installments remain separate and idempotent',()=>{
 const {c}=fixture();let rows=consumeTalentUses([c],[c.npcId,c.npcId],'original');assert.equal(rows[0].moviesRemaining,2);
 rows=consumeTalentUses(rows,[c.npcId],'original');assert.equal(rows[0].moviesRemaining,2);
 rows=consumeTalentUses(rows,[c.npcId],'sequel');assert.equal(rows[0].moviesRemaining,1);
 const last={...rows[0],paymentMode:'WEEKLY_INSTALLMENTS' as const,totalAmount:1001,amountPaid:0,installmentsPaid:0,moviesRemaining:1};
 const exhausted=consumeTalentUses([last],[c.npcId],'third')[0];assert.equal(exhausted.status,'EXPIRED');
 const paid=settleTalentContractWeek(exhausted,100);assert.equal(paid.maintenance,0);assert.ok(paid.installment>0);
 assert.equal(settleTalentContractWeek(paid.contract,100).installment,0);
}]);
cases.push(['profile recovery never revives a deceased dynasty actor',()=>{
 const {p,studio,actor,c}=fixture();const withSnapshot={...c,actorSnapshot:actor};
 p.studio.talentRoster=[withSnapshot];studio.studioState!.talentRoster=[withSnapshot];p.flags.extraNPCs=[];
 p.flags.dynastyCareer={members:{[actor.id]:{npcId:actor.id,status:'DECEASED'}}} as any;
 assert.equal(restoreContractActorProfiles(p).flags.extraNPCs.length,0);
 assert.equal(retainReferencedNpcProfiles(p,[],360).length,0);
 const html=renderToStaticMarkup(React.createElement(StudioPage,{player:p,studioId:studio.id,onBack:()=>{},onUpdatePlayer:()=>{}}));
 assert.ok(html.includes('Actor deceased'));assert.ok(html.includes(actor.name));assert.deepEqual(p.studio.talentRoster,[withSnapshot]);
}]);
cases.push(['unknown inherited cast stays visible but cannot be silently funded',()=>{
 assert.equal(shouldPreserveReturningMovieRole('missing-saved-actor',[]),true);
 assert.equal(isCastableMovieRoleId('missing-saved-actor',[]),false);
 const input=scriptVariationProjectInput({id:'script',title:'Sequel',genres:['DRAMA'],status:'READY',quality:70,options:[],writerId:null,weeksInDevelopment:0,totalDevelopmentWeeks:0,isOriginal:false,projectType:'MOVIE'});
 input.castList[0]={...input.castList[0],actorId:'missing-saved-actor',actorName:'Saved actor name'};
 const before=structuredClone(input.player);
 assert.throws(()=>buildGreenlightProject(input),/Actor profile unavailable.*Saved actor name/);
 assert.deepEqual(input.player,before);
}]);
cases.push(['mirror reconciliation keeps a valid snapshot and newer live statistics win',()=>{
 const {p,studio,actor,c}=fixture();
 const merged=mergeParentStudioTalentRosters(studio.id,[c],[{...c,actorSnapshot:actor}]);
 assert.equal(merged[0].actorSnapshot!.id,actor.id);
 p.studio.talentRoster=merged;studio.studioState!.talentRoster=merged;
 const newer={...actor,stats:{...actor.stats,talent:91}};
 const saved=retainReferencedNpcProfiles(p,[newer],360).find(a=>a.id===actor.id)!;assert.equal(saved.stats.talent,91);
 const invalid={...c,actorSnapshot:{...actor,id:'different-person'}};
 p.studio.talentRoster=[invalid];studio.studioState!.talentRoster=[invalid];p.flags.extraNPCs=[];
 assert.equal(restoreContractActorProfiles(p).flags.extraNPCs.length,0);
}]);
let failed=0;for(const [name,test] of cases){try{test();console.log(`PASS ${name}`)}catch(error){failed++;console.error(`FAIL ${name}: ${(error as Error).message.slice(0,200)}`)}}
if(failed)throw new Error(`${failed}/${cases.length} talent retention checks failed`);
console.log(`Talent retention: ${cases.length} groups passed.`);
