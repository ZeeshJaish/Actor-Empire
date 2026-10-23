import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {INITIAL_PLAYER,type Player,type Commitment} from '../types';
import {applyCareerRehearsal,getCareerPublicityGain,getCareerLearningGain} from '../services/actorCareerBalance';
import {restoreWeeklyEnergy} from '../services/premiumLogic';
import {getActorTalent} from '../services/roleLogic';
const out=process.env.REWARD_EXPERIMENT_OUTPUT||'/tmp/ae-reward-experiments';mkdirSync(out,{recursive:true});
const initial=()=>{const p=structuredClone(INITIAL_PLAYER);p.flags.careerBalanceVersion=1;return p};
const decay=(rule:'flat'|'proportional',fame:number)=>rule==='flat'?.18:Math.min(.18,Math.max(0,fame)*.01);
const fameCases=[0,.021,.1225,1,10,50,94].map(start=>{
 const result:any={start};for(const rule of ['flat','proportional'] as const){let fame=start;for(let w=0;w<13;w++)fame=Math.max(0,fame-decay(rule,fame));result[rule]=fame}return result;
});
assert(fameCases.find(r=>r.start===1)!.proportional>.8);
assert.equal(fameCases.find(r=>r.start===50)!.flat,fameCases.find(r=>r.start===50)!.proportional);
const publicist=initial();publicist.team.publicist={id:'test',tier:'ROOKIE',weeklyCost:300} as any;
const prGain=getCareerPublicityGain(publicist);assert(prGain>0);
const film:Commitment={id:'paid-film',name:'Paid film',type:'ACTING_GIG',roleType:'MINOR',energyCost:0,income:0,payoutType:'LUMPSUM',lumpSum:500,careerBalanceVersion:1,projectPhase:'PRODUCTION',productionPerformance:0,projectDetails:{genre:'DRAMA',castList:[{actorId:'PLAYER_SELF',isPlayer:true,roleType:'MINOR'}]} as any};
let p=initial();p.commitments=[film];const rehearsal=[];
for(let week=0;week<20;week++){
 p.currentWeek=week+1;restoreWeeklyEnergy(p,100);
 let changes=0;for(let click=0;click<5;click++){const r=applyCareerRehearsal(p,film.id);if(!r.changed)break;p=r.player;changes++}
 rehearsal.push({week,changes,craft:getActorTalent(p.stats.skills),learned:p.commitments[0].careerLearningActions,preparation:p.commitments[0].productionPerformance});
}
const first=rehearsal.find(r=>r.learned===8)!.week;assert(rehearsal.at(-1)!.craft===rehearsal[first].craft);
// Audit-only alternatives: lifetime learning remains bounded and every unit costs a real rehearsal.
const learningCandidates=[8,16,24,40].map(limit=>{
 let skill=0,spent=0;const curve=[];for(let week=0;week<20;week++){
  const actions=Math.min(2,limit-spent);for(let n=0;n<actions;n++)skill=Math.min(100,skill+getCareerLearningGain(skill,.35));spent+=actions;curve.push(skill);
 }return {limit,actions:spent,energyCost:spent*20,targetSkill:skill,distinctGrowthWeeks:curve.filter((v,i)=>i===0?v>0:v>curve[i-1]).length};
});
const summary={kind:'Controlled audit-only candidates before production changes',fameCases,prGainAtZero:prGain,currentZeroFameGuardBlocksPR:true,currentRehearsal:rehearsal,learningCandidates,unchanged:['No cash grants','No film outcomes or contracts changed','No base course/genre multipliers changed'],limits:['Candidate learning rows are arithmetic experiments, not full engine careers','No revenue or retention prediction']};
writeFileSync(out+'/results.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
