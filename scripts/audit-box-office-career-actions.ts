import {checkForProductionCrisis} from '../services/productionService';
import {getMarketingAllocationStep} from '../services/marketingStrategy';
import {applyCareerAuditionApplication,acceptCareerPartTimeJob} from '../services/careerApplicationActions';
import assert from 'node:assert/strict';
import {INITIAL_PLAYER} from '../types';
import {prepareOrdinaryCinemaWeek,type CareerAction} from './fixtures/ordinaryCinemaCareer';
const player=structuredClone(INITIAL_PLAYER);player.stats.genreXP.DRAMA=85;player.pendingEvents=[{id:'earned-life-choice',week:player.currentWeek,type:'LIFE_EVENT',title:'The Side Hustle',data:{lifeEvent:{id:'side-hustle',type:'EARLY_LIFE',title:'The Side Hustle',options:[{label:'Take the Job ($2k)'},{label:'Focus on Auditions'}]}}} as any];
const before=player.stats.experience,actions:CareerAction[]=[];
const next=prepareOrdinaryCinemaWeek(player,actions);
assert.equal(next.pendingEvents.length,0,'A playable career must resolve queued choices before another week');
assert.equal(next.stats.experience,before+5,'Use the actual unmonetized audition choice, not a fabricated training grant');
assert.ok(actions.some(a=>a.action.startsWith('Life choice:')));
assert.ok(actions.every(a=>a.cashAfter>=0));
console.log('PASS ordinary policy resolves persisted choices and keeps actions funded');
const poor=structuredClone(INITIAL_PLAYER);poor.stats.genreXP.DRAMA=85;poor.flags.extraNPCs=[{id:'policy-diva',name:'Policy Diva'} as any];poor.commitments=[{id:'policy-film',name:'Policy Film',type:'ACTING_GIG',projectPhase:'PRODUCTION',roleType:'MINOR',energyCost:0,income:0,projectDetails:{hiddenStats:{},genre:'DRAMA'}} as any];poor.pendingEvents=[{id:'policy-crisis',week:1,type:'PRODUCTION_CRISIS',title:'Diva Demands',data:{projectId:'policy-film',crisisId:'policy-crisis',trait:'DIVA',npcId:'policy-diva',options:[{label:'Give In ($50k)',labelKey:'production.crisis.diva.giveIn.label',index:0},{label:'Refuse (Delay)',labelKey:'production.crisis.diva.refuse.label',index:1}]}} as any];
const choices:CareerAction[]=[];const funded=prepareOrdinaryCinemaWeek(poor,choices);assert.ok(funded.money>=0,'A translation key cannot hide the visible $50k expense from an ordinary action policy');assert.ok(choices.some(a=>a.action==='Production choice: production.crisis.diva.refuse.label'));console.log('PASS visible costs remain visible when translated option keys exist');

{
 const source=structuredClone(poor);source.money=2000;source.energy.current=0;source.commitments[0].productionPerformance=80;
 source.pendingEvents=[{id:'generated-crisis',week:1,type:'PRODUCTION_CRISIS',title:'Generated crisis',data:{projectId:'policy-film',isGenerative:true,options:[
  {label:'',labelKey:'production.crisis.generated.money.label',index:0},
  {label:'',labelKey:'production.crisis.generated.push.label',index:1}
 ]}} as any];
 const decisions:CareerAction[]=[];const result=prepareOrdinaryCinemaWeek(source,decisions);
 assert.ok(result.money>=0,'An untranslated generated choice cannot hide an unaffordable $25k charge');
 assert.ok(decisions.some(a=>a.action==='Production choice: production.crisis.generated.push.label'));
 assert.equal(result.commitments[0].productionPerformance,76,'The free production choice pays its real quality consequence');
 console.log('PASS key-only generated crisis chooses funded option and retains its quality consequence');
}

// Model StrictMode replay against the same immutable React source.
{
 const initial=structuredClone(INITIAL_PLAYER),before=structuredClone(initial);
 const job={id:'current-job',name:'Waiter',type:'JOB',energyCost:30,income:450,payoutType:'WEEKLY'} as any;
 const one=acceptCareerPartTimeJob(initial,job),two=acceptCareerPartTimeJob(initial,job);
 assert.deepEqual(initial,before,'Accepting a job cannot reserve energy in React source state');
 assert.deepEqual(one,two);assert.equal(one.energy.current,70);assert.equal(one.commitments.length,initial.commitments.length+1);
 const offer={id:'current-role',projectName:'Current Film',project:{type:'MOVIE'},roleType:'MINOR'} as any;
 const source=structuredClone(one),a=applyCareerAuditionApplication(one,offer,'application-one'),b=applyCareerAuditionApplication(one,offer,'application-one');
 assert.deepEqual(one,source,'Applying cannot spend energy in React source state');assert.deepEqual(a.energy,b.energy);assert.deepEqual(a.applications,b.applications);
 assert.equal(a.energy.current,45);assert.equal(a.applications.length,one.applications.length+1);
 assert.equal(a.flags.weeklyEnergySpendLog?.filter((e:any)=>e.label==='Audition: Current Film').length,1);
 console.log('PASS updater replay charges one 30E job reservation and one 25E application, source unchanged');
}

{
 const random=Math.random;Math.random=()=>0;
 try{for(const trait of ['PROFESSIONAL','EASY_GOING','AMBITIOUS']){
  const p=structuredClone(INITIAL_PLAYER);p.flags.extraNPCs=[{id:'safe-colleague',name:'Safe Colleague',traits:[trait]} as any];
  const film={id:'normal-production',name:'Normal Production',projectPhase:'PRODUCTION',projectDetails:{genre:'DRAMA',castList:[{npcId:'safe-colleague'}]}} as any;
  assert.equal(checkForProductionCrisis(p,film),null,trait+' deliberately produces no trait crisis');
 }}finally{Math.random=random}
 console.log('PASS benign cast traits cannot crash a real production week');
}

for(const budget of [1,1000,25000,100000,500000]){
 const step=getMarketingAllocationStep(budget);assert.ok(step>0&&step<=budget,'Small funded campaign must permit at least one increment: '+budget);
 if(budget>=1000)assert.ok(step<=budget/2,'Small campaign must support more than a single all-or-nothing channel');
}
assert.ok(getMarketingAllocationStep(0)>0,'Zero budget must leave the increase button disabled');
console.log('PASS small funded campaign supports usable channel increments');

// An audit strategy must train its selected genre using actual costs, without
// silently reusing the DRAMA policy for every purportedly different career.
{
 const p=structuredClone(INITIAL_PLAYER),actions:CareerAction[]=[];
 p.stats.genreXP.DRAMA=100;p.stats.genreXP.COMEDY=0;
 const result=prepareOrdinaryCinemaWeek(p,actions,'COMEDY');
 assert.ok(result.stats.genreXP.COMEDY>0,'COMEDY strategy must actually train COMEDY');
 assert.equal(result.stats.genreXP.DRAMA,100,'Training choice must preserve other genre XP');
 assert.ok(actions.some(a=>a.action==='Train COMEDY'&&a.cashAfter<a.cashBefore),'Training must pay real money');
 console.log('PASS selected career policy trains the chosen genre with actual costs');
}
