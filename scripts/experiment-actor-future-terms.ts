/** Quote-only candidate experiment; never used by production or saved gameplay. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {INITIAL_PLAYER,type Player,type RoleType} from '../types';
import {createFamousOpportunity,FAMOUS_MOVIE_DB,FAMOUS_SERIES_DB} from '../services/famousMovieLogic';
import {generateRandomUniverseOpportunity} from '../services/universeLogic';
import {getCareerEvidence} from '../services/actorCareerBalance';
import {interpolateProductionBudget} from '../services/studioProductionEconomy';
import {cinemaAuditRandom} from './fixtures/cinemaAuditCheckpoint';

const out=process.env.TERMS_EXPERIMENT_OUT||'/tmp/ae-future-terms-experiment';mkdirSync(out,{recursive:true});
assert.ok(!existsSync(out+'/quotes.json'),'Preserve existing evidence; use a new output directory');
assert.ok(readFileSync('services/famousMovieLogic.ts','utf8').includes('royaltyPercentage: isTV ? 1.5 : 2.5'),
 'Baseline-only experiment requires the legacy generator snapshot. Replay its pinned executable; do not relabel current terms as baseline.');
const seeds=[0,7,19,31,43,59,71,97];
const roles:RoleType[]=['MINOR','CAMEO','SUPPORTING','ENSEMBLE','LEAD'];
const roleBackend={MINOR:0,CAMEO:.025,SUPPORTING:.45,ENSEMBLE:.65,LEAD:1};
const roleSalary={MINOR:.05,CAMEO:.1,SUPPORTING:.3,ENSEMBLE:.4,LEAD:1};
const candidates={light:{points:.8,franchisePremium:2},balanced:{points:.6,franchisePremium:1.5},strict:{points:.4,franchisePremium:1}};
const clamp=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const leverage=(p:Player)=>{const e=getCareerEvidence(p);return clamp(clamp(p.stats.fame/100)*.3+clamp(p.stats.reputation/100)*.2+e.workSignal*.35+e.audience*.15)};
const records:any[]=[];
for(const route of ['entry','free','boosted']){
 const p:Player=route==='entry'?structuredClone(INITIAL_PLAYER):JSON.parse(gunzipSync(readFileSync(`/tmp/ae-lifetime-repaired-${route}/${route}/career-0.json.gz`)).toString()).player;
 const before=createHash('sha256').update(JSON.stringify(p)).digest('hex');
 for(const seed of seeds){
  for(const type of ['MOVIE','SERIES'] as const)for(const role of roles){
   Math.random=cinemaAuditRandom(`terms:${seed}:${type}:${role}`).next;
   const def=(type==='MOVIE'?FAMOUS_MOVIE_DB:FAMOUS_SERIES_DB)[seed%(type==='MOVIE'?FAMOUS_MOVIE_DB:FAMOUS_SERIES_DB).length];
   const offer=createFamousOpportunity(def,role,'DIRECT');
   const alternatives=Object.fromEntries(Object.entries(candidates).map(([name,c])=>[name,{salary:offer.estimatedIncome,points:Math.floor((type==='MOVIE'?2.5:1.5)*roleBackend[role]*(.3+.7*leverage(p))*c.points*100)/100}]));
   records.push({route,seed,kind:'FAMOUS',type,role,salary:offer.estimatedIncome,points:offer.royaltyPercentage,alternatives});
  }
  Math.random=cinemaAuditRandom(`terms:${seed}:universe`).next;
  // Quote an available *future* package. Clearing exclusivity here is a quotation
  // fixture only; no gameplay acceptance, money or signed commitment is modified.
  const offer=generateRandomUniverseOpportunity({...p,activeUniverseContract:undefined},'DIRECT');
  if(offer?.universeContract){
   const films=offer.universeContract.films,budget=offer.project.estimatedBudget;
   const roleUnits=films.reduce((n,f)=>n+roleSalary[f.role],0);
   const pointUnits=films.reduce((n,f)=>n+roleBackend[f.role],0)/films.length;
   const leadBase=12000*interpolateProductionBudget(budget,{LOW:1,MID:20,HIGH:120,BLOCKBUSTER:300});
   records.push({route,seed,kind:'FRANCHISE',role:offer.roleType,films:films.length,roleUnits,budget,salary:offer.estimatedIncome,points:offer.royaltyPercentage,
    alternatives:Object.fromEntries(Object.entries(candidates).map(([name,c])=>[name,{salary:Math.floor(leadBase*roleUnits*(.85+.4*leverage(p))*c.franchisePremium),points:Math.floor(2*pointUnits*(.3+.7*leverage(p))*c.points*100)/100}]))});
  }
 }
 assert.equal(createHash('sha256').update(JSON.stringify(p)).digest('hex'),before,'No source player mutation');
}
const summaries:any[]=[];
for(const route of ['entry','free','boosted'])for(const kind of ['FAMOUS','FRANCHISE'])for(const variant of ['baseline',...Object.keys(candidates)]){
 const rows=records.filter(r=>r.route===route&&r.kind===kind);
 const terms=rows.map(r=>variant==='baseline'?r:r.alternatives[variant]);
 summaries.push({route,kind,variant,count:rows.length,meanSalary:terms.reduce((n,t)=>n+t.salary,0)/terms.length,meanPoints:terms.reduce((n,t)=>n+(t.points||0),0)/terms.length,
  meanBackendOn250MContractualProfit:terms.reduce((n,t)=>n+250000000*(t.points||0)/100,0)/terms.length,
  maxPoints:Math.max(...terms.map(t=>t.points||0))});
}
writeFileSync(out+'/quotes.json',JSON.stringify({scope:'Counterfactual quotation comparisons, not simulated hit rates or earned career income',seeds,candidates,records,summaries},null,2));
console.log(JSON.stringify(summaries.filter(r=>r.route!=='entry'),null,2));
