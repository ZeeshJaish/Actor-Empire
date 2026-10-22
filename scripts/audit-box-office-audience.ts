import assert from 'node:assert/strict';
import { readCinemaWorldAudience } from '../services/boxOffice/boxOfficeAudienceAdapters';
import { createWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { createWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { createWorldStreamingViewingState } from '../services/worldEconomy/worldStreamingViewing';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { projectCinemaForecastInput } from '../services/boxOffice/boxOfficeAwareness';
import { buildCinemaAudienceSnapshot, buildCinemaChoices } from '../services/boxOffice/boxOfficeAudience';
import { makeCinemaMarketFixture as fixture } from './fixtures/boxOfficeScenarios';
import type { CinemaWeekInput } from '../services/boxOffice/boxOfficeTypes';
let passed=0;
const test=(name:string,run:()=>void)=>{run();passed++;console.log(`PASS ${name}`)};
const count=(f:CinemaWeekInput,kind='FIRST')=>buildCinemaChoices(f).filter(r=>r.kind===kind).reduce((n,r)=>n+r.requestedAdmissions,0);
test('real exposure creates bounded first intent',()=>{const f=fixture();assert.ok(count(f)>0);assert.ok(count(f)<800_000)});
test('quality without exposure produces no first admissions',()=>assert.equal(count(fixture('no-exposure')),0));
test('satisfied seen audience can request a paid repeat',()=>assert.ok(count(fixture('satisfied-repeat'),'REPEAT')>0));
test('weak delivered experience suppresses repeats',()=>assert.ok(count(fixture('weak-repeat'),'REPEAT')<count(fixture('satisfied-repeat'),'REPEAT')));
test('recent repeated visits reduce repeat requests',()=>{const f=fixture('satisfied-repeat');const before=count(f,'REPEAT');f.marketState!.titles[0].cells[0].seenBands[0].repeatAdmissions=400_000;assert.ok(count(f,'REPEAT')<before)});
test('real satisfied exposure enables bounded local discovery',()=>{const f=fixture('indie-discovery');const r=buildCinemaChoices(f).find(r=>r.kind==='FIRST')!;assert.ok(r.discoveryPeople>0);assert.ok(r.discoveryPeople<=100_000*1.8);assert.ok(r.discoveryPeople<900_000)});
test('discovery source cannot replay in the same week',()=>{const f=fixture('indie-discovery');f.marketState!.titles[0].cells[0].lastDiscoveryWeek=100;assert.equal(buildCinemaChoices(f).find(r=>r.kind==='FIRST')!.discoveryPeople,0)});
test('known nearby streaming window increases zero-admission defer',()=>{const wait=fixture('streaming-wait'),no=fixture('no-streaming-deal');assert.ok(count(wait)<count(no));const d=buildCinemaChoices(wait).find(r=>r.kind==='DEFER')!;assert.ok(d.interestedPeople>0);assert.equal(d.requestedAdmissions,0)});
test('private or foreign streaming window cannot invent local waiting',()=>{const f=fixture('streaming-wait');f.titles[0].market!.streamingWindow!.publiclyKnown=false;assert.equal(count(f),count(fixture('no-streaming-deal')));f.titles[0].market!.streamingWindow!.publiclyKnown=true;f.titles[0].market!.streamingWindow!.countryIds=['JP'];assert.equal(count(f),count(fixture('no-streaming-deal')))});
test('actual precursor experience earns event interest',()=>{assert.ok(count(fixture('earned-event'))>count(fixture('unearned-event')))});
test('catalogue-only missing history earns no universe familiarity',()=>{assert.equal(buildCinemaChoices(fixture('unearned-event')).find(r=>r.kind==='FIRST')!.universeFamiliarity,0)});
test('duplicate cast and overlapping favorite credits cannot add people',()=>{const f=fixture('overlapping-favorites'),before=buildCinemaChoices(f);f.titles[0].cast.push(...structuredClone(f.titles[0].cast));assert.deepEqual(buildCinemaChoices(f),before)});
test('expensive travel and language friction reduce reachable demand',()=>{const f=fixture(),before=count(f);f.cohorts[0].market!.languages=['ja'];f.cohorts[0].market!.travelMinutes=180;assert.ok(count(f)<before)});
test('missing participation does not fabricate paying audience',()=>{const f=fixture();delete f.cohorts[0].market;assert.equal(count(f),0)});
test('future release has no current tickets',()=>{const f=fixture();f.titles[0].market!.releaseWeek=101;assert.equal(count(f),0)});
test('choices are pure and order independent',()=>{const f=fixture('earned-event'),copy=structuredClone(f);buildCinemaChoices(f);assert.deepEqual(f,copy);assert.deepEqual(buildCinemaChoices({...f,cohorts:[...f.cohorts].reverse(),titles:[...f.titles].reverse()}),buildCinemaChoices(f))});
test('canonical population and participation supply cinema-only wallets',()=>{
  const {player}=makeCinemaFixture();const pop=createWorldPopulationState(1000),aud=createWorldAudienceEconomyState(pop,1000);
  player.world.worldPopulation=pop;player.world.worldAudienceEconomy=aud;player.world.worldAudienceParticipation=createWorldAudienceParticipationState(pop,aud,1000);
  const before=structuredClone(player),adapted=readCinemaWorldAudience(player);
  assert.ok(adapted.cohorts.length>0);assert.ok(adapted.countries!.length>0);
  const c=adapted.cohorts[0],raw=player.world.worldAudienceParticipation.countries[c.countryId].cohorts.find(x=>`${c.countryId}:${x.cohortId}`===c.id)!;
  assert.equal(c.market!.monthlyCinemaBudgetCents,raw.totalMonthlyCinemaBudget*100);assert.deepEqual(player,before);
});
test('canonical player and NPC history require actual viewing evidence',()=>{
  const {player}=makeCinemaFixture();const pop=createWorldPopulationState(1000),aud=createWorldAudienceEconomyState(pop,1000);
  player.world.worldPopulation=pop;player.world.worldAudienceEconomy=aud;player.world.worldAudienceParticipation=createWorldAudienceParticipationState(pop,aud,1000);
  const source={id:'npc-precursor',title:'NPC Precursor',genre:'ACTION' as const,studioId:'UNIVERSAL',budgetTier:'HIGH' as const,quality:95,boxOffice:1_000_000_000,year:20,weekReleased:1,leadActorId:'actor-a',leadActorName:'Actor A',directorName:'Director',reviews:'Good',universeId:'NPC_UNIVERSE',mediaType:'MOVIE' as const};
  player.world.projects=[source];
  assert.equal(readCinemaWorldAudience(player).history!.length,0,'gross and catalogue facts cannot mint viewers');
  const viewing=createWorldStreamingViewingState(player,1000);
  viewing.countries.US={countryId:'US',accessibleAccounts:100_000,totalViewingAccounts:100_000,estimatedViewers:150_000,totalStarts:100_000,totalHoursViewed:200_000,unmetDemandAccounts:0,
    accessMix:{...viewing.global.accessMix},revenue:{...viewing.global.revenue},titlePerformance:[{projectId:source.id,title:source.title,countryId:'US',viewingAccounts:100_000,estimatedViewers:150_000,starts:110_000,hoursViewed:200_000,completionRate:.9,repeatViewingRate:.1,abandonmentRate:.1,accessMix:{...viewing.global.accessMix},revenue:{...viewing.global.revenue}}]};
  player.world.worldStreamingViewing=viewing;
  const adapted=readCinemaWorldAudience(player),history=adapted.history!;
  assert.ok(history.length>0);assert.ok(history.every(h=>h.universeId==='NPC_UNIVERSE'));assert.ok(history.reduce((n,h)=>n+h.people,0)<=150_000);
  const f=fixture('unearned-event');f.absoluteWeek=1001;f.titles[0].market!.releaseWeek=1001;f.titles[0].market!.universeId='NPC_UNIVERSE';
  f.history=history.map(h=>({...h,cohortId:'US:audience',people:300_000}));assert.ok(buildCinemaChoices(f).find(r=>r.kind==='FIRST')!.universeFamiliarity>0);
  const npcHistory=history.map(h=>h.titleId);
  player.pastProjects=[{...makeCinemaFixture().opportunity.project,id:source.id,name:source.title,type:'ACTING_GIG',roleType:'LEAD',year:20,earnings:0,rating:8,reception:'Good',projectQuality:95,boxOfficeResult:'HIT',outcomeTier:'SUCCESS',futurePotential:{sequelChance:0,franchiseChance:0,rebootChance:0,renewalChance:0,isFranchiseStarter:false,isSequelGreenlit:false,isRenewed:false,seriesStatus:'N/A'},studioId:'UNIVERSAL',budget:50_000_000,gross:1_000_000_000,projectType:'MOVIE',universeId:'PLAYER_UNIVERSE',castList:[{id:'actor-a',name:'Actor A',role:'Lead',roleType:'LEAD',actorId:'actor-a',characterId:'hero',isPlayer:false,image:'',type:'ACTOR'}]}];
  assert.ok(readCinemaWorldAudience(player).history!.every(h=>h.universeId==='PLAYER_UNIVERSE'));assert.deepEqual(readCinemaWorldAudience(player).history!.map(h=>h.titleId),npcHistory);
});
test('forecast retains access and visible intent without hidden delivery',()=>{
  const f=fixture(),known={titles:f.titles.map(t=>({...t,delivery:{estimatedQuality:60,qualityRange:[40,80] as const,scriptQuality:60,directorQuality:60,castingStrength:60}})),cohorts:f.cohorts};
  const safe=projectCinemaForecastInput(f,known);assert.ok(count(safe)>0);assert.equal(safe.titles[0].delivery.deliveredQuality,undefined);
  f.titles[0].delivery.deliveredQuality=1;assert.deepEqual(projectCinemaForecastInput(f,known),safe);
});
test('historical cameo earns less attachment than historical lead',()=>{
  const lead=fixture('earned-event'),cameo=structuredClone(lead);cameo.history=cameo.history!.map(h=>({...h,cast:h.cast.map(c=>({...c,roleType:'CAMEO',roleWeight:.25}))}));
  assert.ok(buildCinemaChoices(cameo).find(r=>r.kind==='FIRST')!.attachment<buildCinemaChoices(lead).find(r=>r.kind==='FIRST')!.attachment);
});
test('repeated disappointing experience can erode favorites',()=>{
  const f=fixture('earned-event'),before=buildCinemaChoices(f).find(r=>r.kind==='FIRST')!.attachment;
  const good=f.history![0];f.history=[good,...Array.from({length:10},(_,i)=>({...good,id:`bad-${i}`,titleId:`bad-${i}`,universeId:undefined,satisfaction:0}))];
  assert.ok(buildCinemaChoices(f).find(r=>r.kind==='FIRST')!.attachment<before*.5);
});
test('the same satisfied people cannot regenerate an unlimited WOM contact budget',()=>{
  const f=fixture('indie-discovery');let state=f.marketState!;
  for(let i=0;i<52;i++){const snapshot=buildCinemaAudienceSnapshot({...f,absoluteWeek:100+i,marketState:state});state={...state,lastProcessedAbsoluteWeek:100+i,titles:snapshot.titles}}
  assert.ok(state.titles[0].cells[0].awarePeople<=280_000);
});
test('compacted earned universe history retains bounded familiarity',()=>{
  const f=fixture('unearned-event');f.marketState!.affinities=[{cohortId:'US:audience',kind:'UNIVERSE',id:'universe',people:300_000,strength:95,lastWeek:70}];
  const r=buildCinemaChoices(f).find(r=>r.kind==='FIRST')!;assert.ok(r.universeFamiliarity>0);assert.ok(r.universeFamiliarity<=.3);
});
test('duplicate character credits union independently of order',()=>{
  const f=fixture('earned-event');f.titles[0].cast.push({...f.titles[0].cast[0],characterIds:['other-hero']});
  const a=buildCinemaAudienceSnapshot(f);f.titles[0].cast.reverse();assert.deepEqual(buildCinemaAudienceSnapshot(f),a);
  assert.deepEqual(a.titles[0].cast[0].characterIds,['hero','other-hero']);
});
test('canonical language labels match normalized language IDs',()=>{
  const f=fixture();f.titles[0].market!.languages=['english'];f.cohorts[0].market!.languages=['english'];const before=count(f);f.cohorts[0].market!.languages=['English'];assert.equal(count(f),before);
});
test('known streaming remains a waiting option after its public start',()=>{
  const f=fixture('streaming-wait');f.titles[0].market!.streamingWindow!.absoluteWeek=99;assert.ok(count(f)<count(fixture('no-streaming-deal')));
});
console.log(`Audience audit: ${passed} groups passed`);
