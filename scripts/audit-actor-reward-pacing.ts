import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as balance from '../services/actorCareerBalance';
import {INITIAL_PLAYER,type Player,type Commitment} from '../types';
import {restoreWeeklyEnergy} from '../services/premiumLogic';
import {normalizeCareerCommitmentsThroughApp} from './fixtures/actorCareerActions';
import {getActorCareerArc} from '../services/actorCareerArc';
import {buildCareerUiModel} from '../services/careerUiAdapter';
const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
const source=readFileSync('services/gameLoop.ts','utf8');
const body=source.slice(source.indexOf('    const fameBonus = getCareerPublicityGain'),source.indexOf('    const healthConditionsResult ='));
const processFame=(p:Player)=>new Function('nextPlayer','FAME_DECAY',...Object.keys(balance),ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(p,.18,...Object.values(balance));
const base=()=>{const p=structuredClone(INITIAL_PLAYER);p.flags.careerBalanceVersion=1;return p};
const film=(extra:any={}):Commitment=>({id:'new-role',name:'New role',type:'ACTING_GIG',roleType:'MINOR',energyCost:0,income:0,payoutType:'LUMPSUM',lumpSum:500,careerBalanceVersion:1,careerRewardPacingVersion:1,projectPhase:'PRODUCTION',productionPerformance:0,projectDetails:{genre:'DRAMA',hiddenStats:{qualityScore:45},castList:[{actorId:'PLAYER_SELF',isPlayer:true,roleType:'MINOR'}]},...extra} as any);
let passes=0,failures=0;
const test=(name:string,run:()=>void)=>{try{run();passes++;console.log('PASS '+name)}catch(e){failures++;console.error('FAIL '+name+': '+(e as Error).message)}};
test('small earned fame survives a quiet quarter without free growth',()=>{const p=base();p.stats.fame=1;for(let w=0;w<13;w++)processFame(p);assert(p.stats.fame>.8&&p.stats.fame<1)});
test('existing high fame retains its established weekly challenge',()=>{const p=base();p.stats.fame=70;processFame(p);assert(Math.abs(p.stats.fame-69.82)<1e-8)});
test('a paid publicist can start from zero fame without buying celebrity',()=>{const p=base();p.team.publicist={id:'pub_rookie',tier:'ROOKIE',weeklyCost:300} as any;processFame(p);assert(p.stats.fame>0);for(let w=0;w<103;w++)processFame(p);assert(p.stats.fame<15)});
test('no work and no publicist cannot manufacture fame',()=>{const p=base();for(let w=0;w<104;w++)processFame(p);assert.equal(p.stats.fame,0)});
test('new on-set learning continues after eight paid actions but cannot be click farmed',()=>{
 let p=base();p.commitments=[film()];for(let week=0;week<8;week++){p.currentWeek=week+1;restoreWeeklyEnergy(p,100);for(let n=0;n<2;n++)p=balance.applyCareerRehearsal(p,'new-role').player}
 assert(p.commitments[0].careerLearningActions!>8);assert(p.stats.skills.delivery>8);
 const before=structuredClone(p);const after=balance.applyCareerRehearsal(p,'new-role').player;
 assert.deepEqual(after.stats.skills,before.stats.skills);assert(after.energy.current<=before.energy.current);
});
test('new paid learning is capped over a long project and never changes signed money',()=>{
 let p=base();p.money=12345;p.commitments=[film()];for(let w=0;w<40;w++){p.currentWeek=w+1;restoreWeeklyEnergy(p,100);for(let n=0;n<5;n++)p=balance.applyCareerRehearsal(p,'new-role').player}
 assert.equal(p.commitments[0].careerLearningActions,24);assert(p.stats.skills.delivery<25);assert.equal(p.money,12345);assert.equal(p.commitments[0].lumpSum,500);
});
test('preparation already at 100 still permits bounded paid acting practice',()=>{const p=base();p.commitments=[film({productionPerformance:100})];const r=balance.applyCareerRehearsal(p,'new-role');assert(r.changed);assert(r.player.stats.skills.delivery>0);assert.equal(r.player.energy.current,p.energy.current-20);assert.equal(r.player.commitments[0].productionPerformance,100)});
test('the visible career action permits bounded practice at 100 and closes when its budget is spent',()=>{
 const p=base();p.commitments=[film({productionPerformance:100})];let action=buildCareerUiModel(p).projects[0].primaryAction!;assert.equal(action.disabled,false);
 let current=p;for(let n=0;n<2;n++)current=balance.applyCareerRehearsal(current,'new-role').player;
 assert.equal(buildCareerUiModel(current).projects[0].primaryAction!.disabled,true);
 current.currentWeek++;assert.equal(buildCareerUiModel(current).projects[0].primaryAction!.disabled,false);
 for(const phase of ['AUDITION','PRE_PRODUCTION'] as const){p.commitments=[film({projectPhase:phase,auditionPerformance:100})];assert.equal(buildCareerUiModel(p).projects[0].primaryAction!.disabled,false)}
 p.commitments=[film({careerRewardPacingVersion:undefined,productionPerformance:100})];assert.equal(buildCareerUiModel(p).projects[0].primaryAction!.disabled,true);
});
test('old active learning budgets stay at eight actions',()=>{let p=base();p.commitments=[film({careerRewardPacingVersion:undefined})];for(let w=0;w<20;w++){p.currentWeek=w+1;restoreWeeklyEnergy(p,100);for(let n=0;n<5;n++)p=balance.applyCareerRehearsal(p,'new-role').player}assert.equal(p.commitments[0].careerLearningActions,8)});
test('finalized acting cannot be practised or rewritten',()=>{const p=base();p.commitments=[film({careerPerformanceFinalized:true,productionPerformance:75})];assert.equal(balance.applyCareerRehearsal(p,'new-role').player,p)});
test('perfected preparation and mastered role skills cannot waste paid energy',()=>{const p=base();p.stats.skills.delivery=100;p.stats.skills.expression=100;p.commitments=[film({productionPerformance:100})];assert.equal(balance.applyCareerRehearsal(p,'new-role').player,p);assert.equal(buildCareerUiModel(p).projects[0].primaryAction!.disabled,true)});
test('app normalization retains weekly learning budget across reloads',()=>{const c=film({careerLearningActions:10,careerLearningWeek:730,careerLearningActionsThisWeek:2});const r:any=normalizeCareerCommitmentsThroughApp([c])[0];assert.equal(r.careerRewardPacingVersion,1);assert.equal(r.careerLearningWeek,730);assert.equal(r.careerLearningActionsThisWeek,2)});
test('good personal acting earns modest recognition once without creating money or a hit',()=>{
 const apply=(balance as any).applyCareerReleaseRecognition;assert.equal(typeof apply,'function');const p=base(),c=film({productionPerformance:70,careerPerformanceFinalized:true});const before=structuredClone(p);
 const one=apply(p,c);assert(one.player.stats.fame>=.5&&one.player.stats.fame<=1.5);assert(one.player.stats.reputation>0);assert.equal(one.player.money,before.money);assert.equal(one.commitment.lumpSum,c.lumpSum);assert.equal(one.commitment.projectDetails.hiddenStats.qualityScore,45);assert.deepEqual(p,before);
 const two=apply(one.player,one.commitment);assert.deepEqual(two.player.stats,one.player.stats);
});
test('poor acting and uncredited studio ownership cannot farm recognition',()=>{const apply=(balance as any).applyCareerReleaseRecognition;assert.equal(typeof apply,'function');const p=base();for(const c of [film({productionPerformance:30}),film({careerRewardPacingVersion:undefined}),film({projectDetails:{genre:'DRAMA',hiddenStats:{},castList:[{actorId:'npc'}]}})])assert.equal(apply(p,c).player.stats.fame,0)});
test('undisclosed external streaming economics do not invent an actor flop era',()=>{
 const p=base();p.pastProjects=[0,1].map(i=>({id:'stream-'+i,name:'External streaming film',type:'ACTING_GIG',roleType:'MINOR',year:15,rating:6.3,imdbRating:6.3,budget:2000000,gross:0,streamingRevenue:0,totalViews:5000000,streamingPlatform:'HULU',studioId:'HULU',outcomeTier:'MAJOR_FAILURE',castList:[{actorId:'PLAYER_SELF',isPlayer:true}]} as any));
 assert.notEqual(getActorCareerArc(p).id,'FLOP_ERA');
 // Known theatrical losses and badly reviewed films still count.
 p.pastProjects=p.pastProjects.map(c=>({...c,streamingPlatform:undefined,gross:100000}));assert.equal(getActorCareerArc(p).id,'FLOP_ERA');
});
test('recorded streaming losses, owned studios and poor critical reception remain meaningful',()=>{
 const p=base();const c:any={id:'external',studioId:'HULU',streamingPlatform:'HULU',totalViews:10000000,gross:0,streamingRevenue:0,outcomeTier:'MAJOR_FAILURE'};
 assert.equal(balance.getCareerReportedOutcome(c,p),undefined);
 assert.equal(balance.getCareerReportedOutcome({...c,streamingContractId:'real-contract'},p),'MAJOR_FAILURE');
 assert.equal(balance.getCareerReportedOutcome({...c,streamingRevenue:100},p),'MAJOR_FAILURE');
 p.businesses=[{id:'HULU'}] as any;assert.equal(balance.getCareerReportedOutcome(c,p),'MAJOR_FAILURE');
});
test('three verified hits still produce a hit streak without altering their receipts',()=>{
 const p=base();p.pastProjects=[0,1,2].map(i=>({id:'hit-'+i,name:'Hit',type:'ACTING_GIG',year:15,rating:7,budget:1000000,gross:4000000,outcomeTier:'SUCCESS'} as any));
 const before=structuredClone(p.pastProjects);assert.equal(getActorCareerArc(p).id,'HIT_STREAK');assert.deepEqual(p.pastProjects,before);
});
test('hit-streak checks keep the player context for an owned streaming company',()=>{
 const p=base();p.businesses=[{id:'HULU'}] as any;p.pastProjects=[0,1,2].map(i=>({id:'owned-hit-'+i,name:'Owned hit',type:'ACTING_GIG',year:15,rating:6.3,budget:1000000,gross:0,streamingRevenue:0,totalViews:5000000,studioId:'HULU',streamingPlatform:'HULU',outcomeTier:'SUCCESS'} as any));
 assert.equal(getActorCareerArc(p).id,'HIT_STREAK');
});
console.log(JSON.stringify({passes,failures}));if(failures)process.exitCode=1;
