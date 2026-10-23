import assert from 'node:assert/strict';
import { type Script, type Player, type NPCActor } from '../types';
import { scriptVariationProjectInput } from './fixtures/scriptVariationProject';
import { createBusiness, processBusinessWeek } from '../services/businessLogic';
import { calculateNPCAsk } from '../services/talentService';
import { negotiateTalentContract } from '../services/talentNegotiation';
import { NPC_DATABASE, generateNewUnknowns, isCastableActor } from '../services/npcLogic';
import { buildGreenlightProject, prepareGreenlightFunding } from '../views/lifestyle/business/greenlightProjectBuilder';
import { mergeParentStudioTalentRosters, consumeTalentUses } from '../services/talentRoster';
import { processGameWeek } from '../services/gameLoop';
import { createContinuationScript } from '../services/sequelFlow';
import { isCastableMovieRoleId, shouldPreserveReturningMovieRole } from '../views/lifestyle/business/greenlightUtils';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { migratePlayerSave } from '../services/saveMigration';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { initializeStocks } from '../services/stockLogic';

const original:Script={id:'roster-original',title:'The Returning Crew',genres:['DRAMA'],options:[],quality:75,baseQuality:75,status:'READY',writerId:null,weeksInDevelopment:0,totalDevelopmentWeeks:0,isOriginal:true,projectType:'MOVIE',logline:'A crew returns to save its workshop.'};
let player=scriptVariationProjectInput(original).player;
player.money=1e12+0.25;player.businesses[0].balance=1e12;
const parentId=player.businesses[0].id;
const child=createBusiness('Subsidiary Retention QA','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',player.currentWeek);
child.balance=1e12;child.studioState!.acquisitionOrigin='STUDIO_ACQUISITION';player.businesses.push(child);
player.stocks=initializeStocks();player.portfolio=[{stockId:'stk_nke',shares:1357,averageCost:23.5,totalInvested:31889.5}];
const oldScript={...original,id:'existing-ready',title:'Existing Saved Story',quality:87,developmentCost:123456,purchaseCost:654321};
player.businesses[0].studioState!.scripts=[oldScript];
const generated=generateNewUnknowns(2).map((a,i)=>({...a,id:`roster-flow-generated-${i}`,name:`Returning Generated ${i}`}));
const builtIn=NPC_DATABASE.filter(isCastableActor).slice(0,2);
const cases=[{studioId:parentId,actors:[generated[0],builtIn[0]]},{studioId:child.id,actors:[generated[1],builtIn[1]]}];
for(const scenario of cases)for(const [index,actor] of scenario.actors.entries()){
 const mode=index===0?'UPFRONT':'WEEKLY_INSTALLMENTS';const ask=calculateNPCAsk(actor,3);
 const beforeMoney=player.money, beforeBalance=player.businesses.find(b=>b.id===scenario.studioId)!.balance;
 const outcome=negotiateTalentContract(player,scenario.studioId,actor,3,Math.ceil((index===0?ask.totalAmount:ask.weeklyInstallment)*2),mode);
 assert.equal(outcome.result.success,true,outcome.result.message);player=outcome.player;
 const payment=index===0?outcome.result.totalContractValue:0;
 assert.equal(player.money,beforeMoney-(scenario.studioId===parentId?payment:0));
 assert.equal(player.businesses.find(b=>b.id===scenario.studioId)!.balance,beforeBalance-(scenario.studioId===parentId?0:payment));
}
const allActors=cases.flatMap(c=>c.actors);
const contracts=(p:Player,studioId:string)=>studioId===parentId?mergeParentStudioTalentRosters(parentId,p.studio.talentRoster,p.businesses.find(b=>b.id===studioId)!.studioState!.talentRoster):p.businesses.find(b=>b.id===studioId)!.studioState!.talentRoster;
const assertActors=()=>{
 for(const actor of allActors){const saved=player.flags.extraNPCs.find(n=>n.id===actor.id);assert.ok(saved,`Missing ${actor.name}`);assert.equal(saved.name,actor.name);assert.equal(isCastableMovieRoleId(actor.id,player.flags.extraNPCs),true);}
 for(const scenario of cases){assert.equal(contracts(player,scenario.studioId).length,2);for(const c of contracts(player,scenario.studioId)){assert.equal(c.studioId,scenario.studioId);assert.equal(c.actorSnapshot!.id,c.npcId);}}
 const old=player.businesses[0].studioState!.scripts.find(s=>s.id===oldScript.id)!;assert.equal(old.quality,87);assert.equal(old.developmentCost,123456);assert.equal(old.purchaseCost,654321);
};
const crowd=()=>{player.flags.extraNPCs=[...player.flags.extraNPCs.filter(a=>allActors.some(actor=>actor.id===a.id)),...Array.from({length:410},(_,i)=>({...generated[0],id:`fresh-filler-${i}`}))];};
const store=new CinemaMemorySaveStore();let saves=0;
async function reload(label:string){
 const money=player.money,balance=player.businesses.map(b=>({id:b.id,balance:b.balance})),shares=structuredClone(player.portfolio);
 const before=cases.map(c=>structuredClone(contracts(player,c.studioId)));
 const prepared=prepareVerifiedPlayerForPersistence(player,'MANUAL');await saveVerifiedGameData(store,'talent-flow-isolated',prepared.player,prepared.manifest);
 const loaded=await loadVerifiedGameData(store,'talent-flow-isolated');assert.equal(loaded.status,'CURRENT');player=migratePlayerSave(loaded.player!);
 assert.equal(player.money,money,label);assert.deepEqual(player.businesses.map(b=>({id:b.id,balance:b.balance})),balance,label);assert.deepEqual(player.portfolio,shares);
 for(const [i,scenario] of cases.entries())for(const previous of before[i]){const current=contracts(player,scenario.studioId).find(c=>c.id===previous.id)!;for(const key of ['npcId','moviesRemaining','totalMovies','totalAmount','amountPaid','paymentMode','installmentsPaid','lastPaymentAbsoluteWeek','consumedProjectIds'] as const)assert.deepEqual(current[key],previous[key],`${label}/${key}`);}
 assertActors();saves++;
}
let serial=0;
function greenlight(script:Script,scenario:typeof cases[number],previous:any[]=[]){
 const studio=player.businesses.find(b=>b.id===scenario.studioId)!;studio.studioState!.scripts.push(script);
 const input=scriptVariationProjectInput(script);input.player=player;input.studio=studio;input.isPrimaryStudio=scenario.studioId===parentId;input.studioTalentRoster=contracts(player,scenario.studioId);input.now=()=>900000+(serial++);
 input.castList=scenario.actors.map((actor,i)=>({id:`role-${i}`,role:i===0?'Lead':'Partner',roleType:i===0?'LEAD':'SUPPORTING',actorId:actor.id,actorName:actor.name,salary:0}));
 input.crewModes.director='IN_HOUSE';input.getCrewData=role=>({name:`In-House ${role}`,tier:'In-House',quality:65,fame:0,cost:0});input.getCastableActorById=id=>player.flags.extraNPCs.find(a=>a.id===id)||NPC_DATABASE.find(a=>a.id===id);input.previousFranchiseInstallments=previous;
 const before=structuredClone(player);const built=buildGreenlightProject(input);assert.deepEqual(player,before);
 assert.equal(built.newCommitment.projectDetails!.castList!.length,2);
 assert.deepEqual(consumeTalentUses(built.updatedStudioTalentRoster,scenario.actors.map(a=>a.id),built.newCommitment.id),built.updatedStudioTalentRoster,'Retry cannot consume twice');
 const funding=prepareGreenlightFunding({player,studio,studioCashRequirement:built.studioCashRequirement,newCommitment:built.newCommitment,finalInvestorRaised:0,greenlightPackageBudget:built.greenlightPackageBudget,isCreatingNewUniverse:false,normalizedWorldUniverses:{},newUniverseName:'',randomUniverseColor:'#2563eb'});
 studio.balance=funding.newStudioBalance;studio.studioState!.scripts=built.updatedScripts;studio.studioState!.concepts=built.updatedConcepts;studio.studioState!.talentRoster=built.updatedStudioTalentRoster;
 player.studio.talentRoster=built.updatedPlayerTalentRoster;player.commitments=[...funding.updatedCommitments,funding.fundedCommitment];return funding.fundedCommitment.id;
}
let weeks=0;
async function tick(){player=(await processGameWeek(player)).player;weeks++;assertActors();}
const released=(id:string)=>player.activeReleases.some(r=>r.id===id)||player.pastProjects.some(r=>r.id===id);
async function deliver(ids:string[],stage:string){
 let duration=0;const seen=new Set<string>();
 while(ids.some(id=>!released(id)&&player.commitments.find(c=>c.id===id)?.projectPhase!=='AWAITING_RELEASE')){
  await tick();duration++;assert.ok(duration<80);
  const phases=ids.map(id=>{const c=player.commitments.find(c=>c.id===id);assert.ok(c||released(id));return c?.projectPhase||'DELIVERED';});
  const key=phases.join(',');if(!seen.has(key)||duration%8===0){seen.add(key);await reload(`${stage}-${duration}`);console.log(`PASS ${stage} week ${duration}: ${key}`);}
 }
 for(const id of ids){const c=player.commitments.find(c=>c.id===id);if(c)assert.equal(c.productionCalendar!.elapsedWeeks,c.productionCalendar!.totalWeeks);else assert.ok(released(id));}
}
crowd();await reload('after-four-hires');
const originals=cases.map((scenario,i)=>greenlight({...original,id:`original-${i}`,title:`The Returning Crew ${i}`},scenario));
for(const scenario of cases)assert.ok(contracts(player,scenario.studioId).every(c=>c.moviesRemaining===2));
await reload('original-greenlight');await deliver(originals,'original-production');
// Choose a normal theatrical release plan on delivered projects; the actual
// game engine performs premiere, settlement and archival. No phase is skipped.
for(const id of originals){const c=player.commitments.find(c=>c.id===id);if(!c){assert.ok(released(id));continue;}c.phaseWeeksLeft=0;c.projectDetails={...c.projectDetails!,releaseStrategy:'THEATRICAL',releaseRegionIds:['NORTH_AMERICA'],releaseChainSelections:{NORTH_AMERICA:['NOVA_CIRCUIT']}};}
for(let i=0;i<6;i++)await tick();await reload('original-released');
const sources=originals.map(id=>{const source=player.activeReleases.find(r=>r.id===id)||player.pastProjects.find(r=>r.id===id);assert.ok(source,`Original ${id} must premiere through engine`);return source;});
const sequelIds=cases.map((scenario,i)=>{
 const studio=player.businesses.find(b=>b.id===scenario.studioId)!;
 const result=createContinuationScript({player,studioScripts:studio.studioState!.scripts,project:sources[i],mode:'SEQUEL',title:`The Returning Crew ${i} II`});assert.equal(result.ok,true,result.eligibility.message);
 const inherited=(sources[i] as any).projectDetails?.castList||(sources[i] as any).castList;
 assert.deepEqual(inherited.filter((c:any)=>shouldPreserveReturningMovieRole(c.actorId,player.flags.extraNPCs)).map((c:any)=>c.actorId),scenario.actors.map(a=>a.id));
 const draft=structuredClone(studio);draft.studioState!.writers=[{id:'writer',name:'QA Writer',skill:70,fee:0,speed:1,tier:'COMMON',stats:{creativity:70,dialogue:70,structure:70,pacing:70}}];
 draft.studioState!.scripts=[{...result.script!,status:'IN_DEVELOPMENT',writerId:'writer',totalDevelopmentWeeks:1,returningTalent:scenario.actors.map(a=>({id:a.id,name:a.name,role:'LEAD_ACTOR',accepted:true,negotiated:true,newDemand:0,originalSalary:0,attemptsLeft:0}))}];
 const ready=processBusinessWeek(draft,100,player.currentWeek+1,'en',player.age).updated.studioState!.scripts[0];assert.equal(ready.status,'READY');
 return greenlight(ready,scenario,[sources[i]]);
});
for(const scenario of cases)assert.ok(contracts(player,scenario.studioId).every(c=>c.moviesRemaining===1));
crowd();await reload('sequel-greenlight');await deliver(sequelIds,'sequel-production');
for(let i=0;i<5;i++){await tick();await reload(`next-week-${i+1}`);}
for(const scenario of cases)for(const c of contracts(player,scenario.studioId)){assert.equal(c.moviesRemaining,1);assert.equal(c.consumedProjectIds!.length,2);assert.ok((c.amountPaid||0)<=c.totalAmount);}
console.log(`PASS four hires (generated + built-in; parent + subsidiary; upfront + installments) → two original movies → real premieres → two sequels → full production → five next weeks; ${weeks} actual weeks and ${saves} verified save/reloads. Actors, contracts, cash, shares and ownership preserved.`);
