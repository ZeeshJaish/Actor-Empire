import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {planStudioCinemaInvestment} from '../services/studioAi/studioAiCinemaInvestment';
import type {Player} from '../types';
import {getAbsoluteWeek} from '../services/legacyLogic';
const checkpoint=process.env.CINEMA_PROFILE_CHECKPOINT!;assert.ok(checkpoint);
const {player}:{player:Player}=JSON.parse(gunzipSync(readFileSync(checkpoint)).toString('utf8'));
const world=player.world,rows:any[]=[];
for(const studio of Object.values(world.studios||{}))for(const f of studio.ai?.intelligence?.content.selectedFingerprints||[]){
 if(f.format!=='MOVIE'||rows.length>=40)continue;
 const target=(f.budgetSuitability.idealLowMillions+f.budgetSuitability.idealHighMillions)/2,start=performance.now();
 const result=planStudioCinemaInvestment({world,studio,fingerprint:f,absoluteWeek:getAbsoluteWeek(player.age,player.currentWeek),targetMillions:target,minimumMillions:f.budgetSuitability.minimumMillions});
 rows.push({studio:studio.id,language:f.originalLanguage,genre:f.primaryGenre,originalTarget:target,minimum:f.budgetSuitability.minimumMillions,result,ms:performance.now()-start});
}
assert.ok(rows.length>0);
const studio=Object.values(world.studios!).find(s=>s.ai?.intelligence?.content.selectedFingerprints.some(f=>f.format==='MOVIE'))!;
const f={...studio.ai!.intelligence!.content.selectedFingerprints.find(f=>f.format==='MOVIE')!,canonicalUniverseId:'benchmark-existing-universe'};
const synthetic={...world,cinemaMarket:{...world.cinemaMarket!,market:{...world.cinemaMarket!.market,affinities:[...world.cinemaMarket!.market.affinities,...Array.from({length:100000},(_,i)=>({kind:'UNIVERSE' as const,id:'other-'+i,cohortId:'US:other',people:1,strength:50,lastWeek:100}))]}}};
const start=performance.now();planStudioCinemaInvestment({world:synthetic,studio,fingerprint:f,absoluteWeek:getAbsoluteWeek(player.age,player.currentWeek),targetMillions:f.budgetSuitability.idealHighMillions,minimumMillions:f.budgetSuitability.minimumMillions});const stressMs=performance.now()-start;
assert.ok(stressMs<1500,'Planner must not repeatedly scan the full affinity ledger per cohort and candidate');
const sorted=rows.map(r=>r.ms).sort((a,b)=>a-b),result={checkpoint,age:player.age,week:player.currentWeek,studios:Object.keys(world.studios!).length,productions:Object.keys(world.industryProductions||{}).length,
 observedAffinityEntries:world.cinemaMarket!.market.affinities.length,cases:rows.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil((sorted.length-1)*.95)],maxMs:sorted.at(-1),stress100kAffinityMs:stressMs,peakRssMiB:process.resourceUsage().maxRSS/1024,rows};
if(process.env.CINEMA_PROFILE_OUTPUT)writeFileSync(process.env.CINEMA_PROFILE_OUTPUT,JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,rows:rows.slice(0,8)},null,2));
