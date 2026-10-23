import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import type {Player,Script,Commitment} from '../types';
import {scriptVariationProjectInput} from './fixtures/scriptVariationProject';
import {buildGreenlightProject,prepareGreenlightFunding} from '../views/lifestyle/business/greenlightProjectBuilder';
import {processGameWeek} from '../services/gameLoop';
import {getCareerPassivePreparation,ensureActorCareerBalance,getCareerFinalPerformance,getCareerEvidence} from '../services/actorCareerBalance';
import {careerActionHarness,normalizeCareerCommitmentsThroughApp} from './fixtures/actorCareerActions';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {migratePlayerSave} from '../services/saveMigration';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {createContinuationScript} from '../services/sequelFlow';
import {processBusinessWeek} from '../services/businessLogic';
import {resolveLifeEventFallback} from '../services/lifeEventFallback';
import {applyCrisisImpact} from '../services/productionService';
import {initializeStocks} from '../services/stockLogic';
const out=process.env.ACTOR_ESTABLISHED_OUTPUT||'/tmp/ae-career-established';mkdirSync(out,{recursive:true});
const script:Script={id:'career-slate',title:'Attention Test',genres:['DRAMA'],options:[],quality:80,baseQuality:80,status:'READY',writerId:null,weeksInDevelopment:0,totalDevelopmentWeeks:0,isOriginal:true,projectType:'MOVIE'};
let player=ensureActorCareerBalance(scriptVariationProjectInput(script).player);player.money=50_000_000.25;player.businesses[0].balance=500_000_000;
for(const key of Object.keys(player.stats.skills))(player.stats.skills as any)[key]=80;player.stats.genreXP.DRAMA=80;player.stats.fame=70;
player.stocks=initializeStocks();player.portfolio=[{stockId:'stk_nke',shares:57,averageCost:23.5,totalInvested:1339.5}];
const studioId=player.businesses[0].id,store=new CinemaMemorySaveStore();let weeks=0,saves=0,serial=0;const deliveries=new Map<string,any>();
function greenlight(s:Script){const studio=player.businesses[0];studio.studioState!.scripts.push(s);const input=scriptVariationProjectInput(s);input.player=player;input.studio=studio;input.now=()=>9100000+serial++;input.isPrimaryStudio=true;const built=buildGreenlightProject(input);
 const funded=prepareGreenlightFunding({player,studio,studioCashRequirement:built.studioCashRequirement,newCommitment:built.newCommitment,finalInvestorRaised:0,greenlightPackageBudget:built.greenlightPackageBudget,isCreatingNewUniverse:false,normalizedWorldUniverses:{},newUniverseName:'',randomUniverseColor:'#123456'});
 studio.balance=funded.newStudioBalance;studio.studioState!.scripts=built.updatedScripts;studio.studioState!.concepts=built.updatedConcepts;player.commitments=[...funded.updatedCommitments,funded.fundedCommitment];assert.equal(funded.fundedCommitment.careerBalanceVersion,1);return funded.fundedCommitment.id;
}
async function reload(label:string){const before={money:player.money,skills:structuredClone(player.stats.skills),xp:structuredClone(player.stats.genreXP),shares:structuredClone(player.portfolio),business:player.businesses.map(b=>[b.id,b.balance]),contracts:structuredClone(player.world.streamingRightsContracts),fields:player.commitments.map(c=>[c.id,c.lumpSum,c.careerBalanceVersion,c.careerPreparationScore,c.careerPerformanceFinalized,c.productionPerformance])};
 const prepared=prepareVerifiedPlayerForPersistence(player,'MANUAL');assert.deepEqual(prepared.comparison,{ok:true});await saveVerifiedGameData(store,'established',prepared.player,prepared.manifest);
 const loaded=await loadVerifiedGameData(store,'established');assert.equal(loaded.status,'CURRENT');player=migratePlayerSave(loaded.player!);player.commitments=normalizeCareerCommitmentsThroughApp(player.commitments);
 assert.equal(player.money,before.money,label);assert.deepEqual(player.stats.skills,before.skills,label);assert.deepEqual(player.stats.genreXP,before.xp,label);assert.deepEqual(player.portfolio,before.shares,label);assert.deepEqual(player.businesses.map(b=>[b.id,b.balance]),before.business,label);assert.deepEqual(JSON.parse(JSON.stringify(player.world.streamingRightsContracts)),JSON.parse(JSON.stringify(before.contracts)),label);assert.deepEqual(player.commitments.map(c=>[c.id,c.lumpSum,c.careerBalanceVersion,c.careerPreparationScore,c.careerPerformanceFinalized,c.productionPerformance]),before.fields,label);saves++;
}
function assertFrozen(){for(const c of player.commitments){const d=deliveries.get(c.id);if(d)assert.equal(c.productionPerformance,d.performance,'Delivered acting cannot change after wrap: '+c.id)}}
function resolveChoices(){assertFrozen();let n=0;while(player.pendingEvents.length){assert(n++<100);const e=player.pendingEvents[0],queue=player.pendingEvents;if(e.data?.lifeEvent){const l=e.data.lifeEvent,i=l.options.findIndex((o:any)=>!o.isGolden),o=l.options[i];player=(typeof o.impact==='function'?o.impact(player):resolveLifeEventFallback(player,l,i,o)).updatedPlayer}else if(['PRODUCTION_CRISIS','DIRECTOR_DECISION'].includes(e.type)){const i=(e.data.options||[]).findIndex((o:any)=>!o.isGolden&&!/\$|pr\.label|cgi\.label|\.money\.label/.test([o.label,o.labelKey].join(' ')));assert(i>=0);player=applyCrisisImpact(player,e,i).updatedPlayer}else throw Error('Missing actual event action '+e.type);player.pendingEvents=queue.filter(x=>x.id!==e.id);assertFrozen()}}
const ids=[0,1,2,3,4].map(i=>greenlight({...script,id:'script-'+i,title:'Attention Film '+i}));
const focused=ids[0];
await reload('five-real-greenlights');
const allProducing={...player,commitments:player.commitments.map(c=>({...c,projectPhase:'PRODUCTION' as const}))};
const pendingBudget=allProducing.commitments.reduce((sum,c)=>sum+getCareerPassivePreparation(allProducing,c),0);
const one={...player,commitments:[{...player.commitments[0],projectPhase:'PRODUCTION' as const}]};assert(pendingBudget<=getCareerPassivePreparation(one,one.commitments[0])+1e-6);
while(ids.some(id=>player.commitments.find(c=>c.id===id)?.projectPhase!=='AWAITING_RELEASE')){
 resolveChoices();const target=player.commitments.find(c=>c.id===focused);
 if(target&&['PRE_PRODUCTION','PRODUCTION'].includes(target.projectPhase||'')){for(const action of target.projectPhase==='PRE_PRODUCTION'?['ACTOR_PREP'] as const:['ACTOR_SCENE','ACTOR_BIG_PUSH'] as const)player=careerActionHarness(player).ownedFocus(focused,action);let n=0;while(player.energy.current>=20&&n++<20){const prior=player;player=careerActionHarness(player).rehearse(focused);if(prior===player)break}}
 player=(await processGameWeek(player)).player;weeks++;assertFrozen();if(weeks%8===0)console.log(JSON.stringify({kind:'prepared-established',weeks,deliveries:deliveries.size,stage:player.commitments.find(c=>c.id===focused)?.projectPhase}));assert(weeks<90);
 for(const c of player.commitments)if(c.careerPerformanceFinalized&&!deliveries.has(c.id))deliveries.set(c.id,{performance:c.productionPerformance,preparation:c.careerPreparationScore,quality:c.projectDetails!.hiddenStats.qualityScore,elapsed:c.productionCalendar?.elapsedWeeks});
 if(weeks%8===0)await reload('slate-week-'+weeks);
}
assert.equal(deliveries.size,5);assert(deliveries.get(focused).performance>deliveries.get(ids[1]).performance+10,'Attention spent on one title must produce different acting outcomes');
await reload('all-five-delivered');
const frozen=player.commitments.map(c=>[c.id,c.productionPerformance,c.projectDetails!.hiddenStats.qualityScore]);
for(const c of player.commitments)assert.equal(getCareerFinalPerformance(player,c),c.productionPerformance);
for(const id of ids){const c=player.commitments.find(c=>c.id===id)!;c.projectDetails={...c.projectDetails!,releaseStrategy:'THEATRICAL',releaseRegionIds:['NORTH_AMERICA'],releaseChainSelections:{NORTH_AMERICA:['NOVA_CIRCUIT']}};}
for(let n=0;n<8;n++){resolveChoices();player=(await processGameWeek(player)).player;weeks++;assertFrozen();if(n%2===0)await reload('release-week-'+n)}
for(const id of ids)assert(player.activeReleases.some(r=>r.id===id)||player.pastProjects.some(r=>r.id===id),'Every delivered film must premiere through the weekly engine');
const source=player.activeReleases.find(r=>r.id===focused)||player.pastProjects.find(r=>r.id===focused);assert(source);
const continuation=createContinuationScript({player,studioScripts:player.businesses[0].studioState!.scripts,project:source,mode:'SEQUEL',title:'Attention Returns'});assert(continuation.ok,continuation.eligibility.message);
const work=structuredClone(player.businesses[0]);work.studioState!.writers=[{id:'writer',name:'Writer',skill:70,fee:0,speed:1,tier:'COMMON',stats:{creativity:70,dialogue:70,structure:70,pacing:70}}];work.studioState!.scripts=[{...continuation.script!,status:'IN_DEVELOPMENT',writerId:'writer',totalDevelopmentWeeks:1}];
const ready=processBusinessWeek(work,100,player.currentWeek+1,'en',player.age).updated.studioState!.scripts[0];assert.equal(ready.status,'READY');const sequel=greenlight(ready);await reload('sequel-greenlight');
while(player.commitments.find(c=>c.id===sequel)?.projectPhase!=='AWAITING_RELEASE'){
 resolveChoices();let n=0;while(player.energy.current>=20&&n++<20){const prior=player;player=careerActionHarness(player).rehearse(sequel);if(prior===player)break}
 player=(await processGameWeek(player)).player;weeks++;assertFrozen();if(weeks%8===0)console.log(JSON.stringify({kind:'prepared-established',weeks,deliveries:deliveries.size,stage:player.commitments.find(c=>c.id===focused)?.projectPhase}));assert(weeks<170);if(weeks%8===0)await reload('sequel-week-'+weeks);
}
const sequelProject=player.commitments.find(c=>c.id===sequel)!;assert(sequelProject.careerPerformanceFinalized);sequelProject.projectDetails={...sequelProject.projectDetails!,releaseStrategy:'THEATRICAL',releaseRegionIds:['NORTH_AMERICA'],releaseChainSelections:{NORTH_AMERICA:['NOVA_CIRCUIT']}};
for(let n=0;n<5;n++){resolveChoices();player=(await processGameWeek(player)).player;weeks++;assertFrozen();await reload('final-next-week-'+n)}
assert(player.activeReleases.some(r=>r.id===sequel)||player.pastProjects.some(r=>r.id===sequel));assert(getCareerEvidence(player).credits>=6);
writeFileSync(out+'/results.json',JSON.stringify({kind:'Prepared funded established actor; not a fresh earned career',weeks,saves,deliveries:[...deliveries],frozenAtWrap:frozen,careerCredits:getCareerEvidence(player),money:player.money,studioBalance:player.businesses[0].balance,shares:player.portfolio},null,2));
console.log(`PASS five real concurrent Greenlights → selected paid attention → full production → five premieres → actual continuation development → new Greenlight/full sequel production → premiere → five next weeks; ${weeks} actual weeks, ${saves} verified save/reloads.`);
