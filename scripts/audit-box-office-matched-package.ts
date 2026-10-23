import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { makeFullWorldFixture, FULL_WORLD_START } from './fixtures/boxOfficeFullWorld';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { addDueCinemaNpc } from './fixtures/cinemaLiveNpc';
import { completeOfferedCinemaCast, normalizeCinemaTitle } from '../services/boxOffice/boxOfficeInputs';
import { fundOfferedCinemaLaunch } from '../services/boxOffice/boxOfficeOfferedLaunch';
import { commitCinemaAnnouncement } from '../services/boxOffice/boxOfficeExposureAdapters';
import { normalizeLiveTitle } from '../services/boxOffice/boxOfficeWeek';
import { studioAiCinemaCountries } from '../services/studioAi/studioAiCinemaRelease';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { getCinemaRecognitionShare } from '../services/boxOffice/boxOfficeAwareness';
import { NPC_DATABASE } from '../services/npcLogic';
import { CINEMA_CHAINS } from '../services/cinemaChains';
import type { CinemaTitleInput, CinemaWeekInput } from '../services/boxOffice/boxOfficeTypes';
import type { IndustryContentFingerprint } from '../types';

const out=process.env.CINEMA_MATCHED_OUTPUT || '/private/tmp/actor-cinema-fair-packages-20261023/matched.json';
const rows:any[]=[];
const sourceHash=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const run=(input:CinemaWeekInput,slate:CinemaTitleInput[],name:string,seed:number,campaignCents:number)=>{
 let gross=0,receipts=0,cost=0,closed=false,week95=0;const weekly:number[]=[],retired=new Set<string>();
 for(let w=0;w<104;w++){
  input={...input,absoluteWeek:FULL_WORLD_START+w,titles:[input.titles[0],...slate.filter(t=>t.market!.releaseWeek<=FULL_WORLD_START+w&&!retired.has(t.id))]};
  const result=simulateCinemaWeek(input),paid=result.titles.find(t=>t.titleId==='film')!;
  for(const t of result.titles)assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
  for(const c of result.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
  gross+=paid.grossCents;receipts+=paid.producerReceiptsCents;cost+=result.costEvents.filter(e=>e.titleId==='film').reduce((n,e)=>n+e.amountCents,0);weekly.push(paid.grossCents);
  for(const t of result.titles){const runs=result.nextState.runs.filter(r=>r.titleId===t.titleId);if(runs.length&&runs.every(r=>r.closed))retired.add(t.titleId)}
  input={...input,marketState:result.nextState};closed=retired.has('film');if(closed)break;
 }
 let sum=0;weekly.forEach((g,i)=>{sum+=g;if(!week95&&sum>=gross*.95)week95=i+1});
 const row={name,seed,grossCents:gross,receiptsCents:receipts,campaignCents,budgetCents:input.titles[0].budgetCents,profitCents:receipts-cost-campaignCents-input.titles[0].budgetCents,weeks:weekly.length,week95,censored:!closed,countryIds:input.titles[0].market!.countryIds};
 rows.push(row);writeFileSync(out,JSON.stringify({kind:'MATCHED_PACKAGE_REPAIRS_FULL_WORLD',sourceHash,rows,limitations:['Controlled matched packages with real 197-country cohorts, rivals and home alternatives; not normal-career hit probabilities','Kernel run after premiere construction; evolving whole careers verified separately','No forced closure: horizon survivors censored; no future media added to profit']},null,2));
 console.log(JSON.stringify({...row,grossM:gross/1e8,profitM:row.profitCents/1e8,peakRssMiB:process.resourceUsage().maxRSS/1024}));return row;
};

for(const seed of [0,1,2]){
 const {input,slate}=makeFullWorldFixture('focused-small',seed),f=makeCinemaFixture(806);
 f.player.stats.fame=0;f.player.stats.followers=0;f.player.activeReleases=[];f.player.pastProjects=[];
 const {studio}=addDueCinemaNpc(f.player,FULL_WORLD_START);studio.ai!.finance.committedSpendMillions=0;
 f.project={...f.project,title:'Fair Offered Comedy',genre:'COMEDY',studioId:studio.id,estimatedBudget:17e6,releaseScale:'MASS',originalLanguageId:'english',castPackageSource:'OFFER_GENERATED',castList:[
  {id:'player',actorId:'PLAYER_SELF',name:f.player.name,type:'ACTOR',role:'Cast',roleType:'MINOR',isPlayer:true,image:''},
  {id:'unknown-co-star',actorId:'unknown-co-star',name:'Unrecognized co-star',type:'ACTOR',role:'Co-Star',roleType:'SUPPORTING',isPlayer:false,image:'',cinemaRecognition:{version:1,personId:'unknown-co-star',fame:4,stature:0}},
 ],hiddenStats:{...f.project.hiddenStats,qualityScore:65,scriptQuality:65,directorQuality:65,castingStrength:65}};
 const repaired=completeOfferedCinemaCast(f.project,f.player);
 const funded=fundOfferedCinemaLaunch(f.player,repaired,'film').project;
 // Date the controlled premiere consistently with its authored world clock.
 const prepare=(project:typeof f.project)=>{
  project=commitCinemaAnnouncement(f.player,project,'film',FULL_WORLD_START);
  if(project.cinemaExposure)project={...project,cinemaExposure:{...project.cinemaExposure,events:project.cinemaExposure.events.map(e=>({...e,absoluteWeek:FULL_WORLD_START}))}};
  return normalizeLiveTitle(f.player,'film',project,FULL_WORLD_START,'ACCEPTED_ROLE',input);
 };
 const base=prepare(f.project),fixed=prepare(funded),weak=structuredClone(fixed);
 weak.delivery.deliveredQuality=30;weak.delivery.scriptQuality=30;weak.delivery.directorQuality=30;weak.delivery.castingStrength=30;
 const old=run({...input,titles:[base]},slate,'offer-before',seed,0);
 const improved=run({...input,titles:[fixed]},slate,'offer-fixed-q65',seed,funded.offeredCinemaLaunch!.campaignCostCents);
 const poor=run({...input,titles:[weak]},slate,'offer-fixed-q30',seed,funded.offeredCinemaLaunch!.campaignCostCents);
 assert.ok(improved.grossCents>old.grossCents);assert.ok(poor.grossCents<improved.grossCents);
 const opening={...input,titles:[fixed,...slate.filter(t=>t.market!.releaseWeek<=FULL_WORLD_START)]};
 const paid=simulateCinemaWeek(opening).titles.find(t=>t.titleId==='film');
 for(const route of ['PLAYER_STUDIO','NPC_STUDIO'] as const)assert.deepEqual(simulateCinemaWeek({...opening,titles:opening.titles.map(t=>t.id==='film'?{...t,owner:{...t.owner,route}}:t)}).titles.find(t=>t.titleId==='film'),paid,'Matched owner routes must not change ticket demand');
 const narrow=structuredClone(fixed);narrow.cast=[];narrow.exposure!.events=narrow.exposure!.events.filter(e=>e.kind==='PAID_CAMPAIGN');
 const wide=structuredClone(narrow);wide.market!.countryIds=input.countries!.map(c=>c.id);wide.market!.chainIds=CINEMA_CHAINS.map(c=>c.id);delete wide.market!.chainIdsByCountry;
 // Additional access may discover local footfall later; with identical nonbinding capacity and zero local exposure, opening demand cannot be multiplied by coverage.
 const narrowOpening=simulateCinemaWeek({...input,titles:[narrow]}).titles[0],wideOpening=simulateCinemaWeek({...input,titles:[wide]}).titles[0];
 assert.equal(wideOpening.grossCents,narrowOpening.grossCents);

 const actor=NPC_DATABASE.find(n=>n.stats?.fame>=80)!;
 for(const language of ['German','Spanish']){
  const local=structuredClone(input.titles[0]);local.genre='SPORTS';local.budgetCents=17e8;
  local.delivery={estimatedQuality:70,deliveredQuality:81,scriptQuality:81,directorQuality:81,castingStrength:81};
  local.cast=[{personId:actor.id,name:actor.name,roleType:'LEAD',roleWeight:1,fame:actor.stats.fame,isPlayer:false,characterIds:[]}];
  const fingerprint={originalLanguage:language,priorityMarket:'AFRICA'} as IndustryContentFingerprint;
  const target=studioAiCinemaCountries('LIMITED_THEATRICAL',fingerprint,undefined,1.36e6);
  const campaignCents=136e6;
  for(const repair of [false,true]){
   const title=structuredClone(local),countries=repair?target:input.countries!.filter(c=>c.regionId==='AFRICA').map(c=>c.id);
   title.market={...title.market!,countryIds:countries,languages:[language.toLowerCase()],chainIds:['NOVA_CIRCUIT','ARCLIGHT_GRID'],releaseWeek:FULL_WORLD_START,universeId:undefined,returningCharacterIds:[],payoff:81,accessibility:81,urgency:45};
   title.exposure={version:1,attentionBasis:'PACKAGE',attentionPotential:65,events:[{id:'campaign',titleId:'film',absoluteWeek:FULL_WORLD_START,kind:'PAID_CAMPAIGN',channel:'RELEASE_CAMPAIGN',paidCostCents:campaignCents,impressions:40_800_000,countryIds:countries},{id:'announcement',titleId:'film',absoluteWeek:FULL_WORLD_START,kind:'ANNOUNCEMENT',channel:'STUDIO_RELEASE',impressions:0,recognitionShare:getCinemaRecognitionShare(title.cast,{releasedTitleCount:0,prestige:0})}]};
   run({...input,titles:[title]},slate,`${language.toLowerCase()}-${repair?'targeted':'before'}`,seed,campaignCents);
  }
 }
}
console.log('PASS matched route equality, worldwide opening access, paid costs and quality response');
