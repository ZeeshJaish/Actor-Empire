import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {summarizeCareerFilms} from './fixtures/cinemaCareerCohortMetrics';
import type {Player} from '../types';

const folder=process.env.CAREER_OUTPUT!;
assert.ok(folder);
const seeds=(process.env.CAREER_SEEDS||'0,1,2,3').split(',').map(Number);
const cutoff=Number(process.env.CAREER_RELEASE_CUTOFF||78);
const quantiles=(values:number[])=>{
 if(!values.length)return null;
 const xs=[...values].sort((a,b)=>a-b);
 return {min:xs[0],median:xs[Math.floor(xs.length/2)],p90:xs[Math.ceil((xs.length-1)*.9)],max:xs.at(-1)};
};
const films:any[]=[],plans:any[]=[],careers:any[]=[];
let executable:string|undefined;
for(const seed of seeds){
 const report=JSON.parse(readFileSync(`${folder}/career-${seed}.json`,'utf8'));
 assert.ok(['HORIZON_COMPLETE','CAREER_ENDED','UNFUNDED'].includes(report.status));
 assert.ok(report.failedPromotionChecked);assert.equal(report.replays,report.weeks);
 if(executable)assert.equal(report.executable,executable);else executable=report.executable;
 const {player}:{player:Player}=JSON.parse(gunzipSync(readFileSync(`${folder}/career-${seed}.json.gz`)).toString('utf8'));
 const productionByTitle=new Map(Object.values(player.world.industryProductions||{}).map(p=>[p.canonicalProjectId,p]));
 for(const f of report.films){
  const p=productionByTitle.get(f.id),studio=p&&player.world.studios?.[p.producerStudioId];
  const commitment=studio?.ai?.slate?.commitments.find(c=>c.id===p?.studioAiSlateCommitmentId);
  films.push({...f,id:`world-${seed}:${f.id}`,canonicalId:f.id,seed,
   productionSource:p?.source||f.source,developmentCents:commitment?Math.round(commitment.developmentSpendMillions*1e8):null});
 }
 for(const p of productionByTitle.values())if(p.projectType==='MOVIE'&&p.source==='STUDIO_INDEPENDENT'){
  plans.push({seed,id:p.id,status:p.status,budgetMillions:p.budgetMillions,
   language:p.studioAiExecution?.fingerprintSnapshot?.originalLanguage,
   scoped:p.studioAiExecution?.fingerprintSnapshot?.cinemaScopeVersion===1});
 }
 careers.push({seed,weeks:report.weeks,status:report.status,cash:report.cash,skill:report.skill,
  ownFilmIds:report.ownIds,saves:report.saves,reloads:report.reloads,replays:report.replays,
  failedPromotionChecked:report.failedPromotionChecked,peakRssMiB:report.peakRssBytes/1048576});
 (globalThis as any).gc?.();
}
const summarize=(rows:any[])=>{
 const s=summarizeCareerFilms(rows);
 return {released:s.released,completed:s.completed,open:s.open,unknownCompleted:s.unknownCompleted,
  all:s.all,small:s.small,player:s.player,billionAttainment:s.billionAttainment,
  budgetMillions:quantiles(rows.filter(f=>f.budgetCents!==null).map(f=>f.budgetCents/1e8)),
  publicGrossMillions:quantiles(rows.map(f=>f.grossCents/1e8)),
  theatricalProfitMillions:quantiles(s.rows.map(f=>f.theatricalProfitCents/1e8)),
  knownDevelopment:{completed:s.rows.filter(f=>(f as any).developmentCents!==null).length,
   recouped:s.rows.filter(f=>(f as any).developmentCents!==null&&f.theatricalProfitCents>=(f as any).developmentCents).length}};
};
const sourceGroups=[...new Set(films.map(f=>f.productionSource))].map(source=>({source,all:summarize(films.filter(f=>f.productionSource===source)),
 early:summarize(films.filter(f=>f.productionSource===source&&f.weekly?.[0]?.week<=cutoff))}));
const result={executable,careers,weeks:careers.reduce((n,c)=>n+c.weeks,0),all:summarize(films),
 early:{releaseCutoff:cutoff,...summarize(films.filter(f=>f.weekly?.[0]?.week<=cutoff))},sourceGroups,
 independentPlans:{count:plans.length,released:plans.filter(p=>p.status==='RELEASED').length,scoped:plans.filter(p=>p.scoped).length,
  budgetMillions:quantiles(plans.map(p=>p.budgetMillions)),
  bySeed:seeds.map(seed=>({seed,plans:plans.filter(p=>p.seed===seed).length,released:plans.filter(p=>p.seed===seed&&p.status==='RELEASED').length})),
  byLanguage:[...new Set(plans.map(p=>p.language))].map(language=>({language,count:plans.filter(p=>p.language===language).length}))},
 limitations:['Normal App action policies, no career grants; prepared billion-dollar fixtures excluded',
  'Four seeded worlds can repeat studio/title identities; these are correlated observations, not independent probability estimates',
  'Closed known-cost films only in profit denominators; open titles remain censored',
  'Theatrical profit excludes future media. Known development costs are shown separately because older histories may lack them',
  'Unsigned independent movie investment changes; signed commissions and existing contracts retain their rules']};
writeFileSync(process.env.NPC_MARKET_REPORT_OUTPUT||folder+'/npc-budget-summary.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
