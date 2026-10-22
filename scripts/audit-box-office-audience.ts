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
test('private or foreign streaming window cannot invent local waiting',()=>{const f=fixture('streaming-wait'),sameHome=structuredClone(f);delete sameHome.titles[0].market!.streamingWindow;f.titles[0].market!.streamingWindow!.publiclyKnown=false;assert.equal(count(f),count(sameHome));f.titles[0].market!.streamingWindow!.publiclyKnown=true;f.titles[0].market!.streamingWindow!.countryIds=['JP'];assert.equal(count(f),count(sameHome))});
test('actual precursor experience earns event interest',()=>{assert.ok(count(fixture('earned-event'))>count(fixture('unearned-event')))});
test('a reached loyal audience can plan an opening instead of inheriting the casual weekly attendance rate',()=>{
  const casual=fixture('unearned-event'),loyal=structuredClone(casual);
  loyal.history=[{id:'paid-precursor',titleId:'paid-precursor',ownerId:'studio',cohortId:'US:audience',people:800_000,
    satisfaction:95,absoluteWeek:80,cast:structuredClone(loyal.titles[0].cast),universeId:'universe',source:'THEATER'}];
  assert.ok(count(loyal)>=count(casual)*2,'A predominantly satisfied returning audience must have materially stronger intent than the casual segment');
  assert.ok(count(loyal)<=buildCinemaChoices(loyal).find(r=>r.kind==='FIRST')!.reachableUnseenPeople);
});
test('loyalty cannot create awareness or tickets for an unannounced unknown title',()=>{
  const f=fixture('earned-event');f.titles[0].exposure!.events=[];
  assert.equal(count(f),0);
});
test('duplicate prior viewing rows cannot multiply loyal audience intent',()=>{
  const f=fixture('earned-event'),before=buildCinemaChoices(f);
  f.history=[...f.history!,...f.history!.map(h=>({...h,id:'duplicate-source'}))];assert.deepEqual(buildCinemaChoices(f),before);
});
test('catalogue-only missing history earns no universe familiarity',()=>{assert.equal(buildCinemaChoices(fixture('unearned-event')).find(r=>r.kind==='FIRST')!.universeFamiliarity,0)});
test('duplicate cast and overlapping favorite credits cannot add people',()=>{const f=fixture('overlapping-favorites'),before=buildCinemaChoices(f);f.titles[0].cast.push(...structuredClone(f.titles[0].cast));assert.deepEqual(buildCinemaChoices(f),before)});
test('expensive travel and language friction reduce reachable demand',()=>{const f=fixture(),before=count(f);f.cohorts[0].market!.languages=['ja'];f.cohorts[0].market!.travelMinutes=180;assert.ok(count(f)<before)});
test('foreign-language preference reduces conversion once without removing aware people who have cinema access',()=>{
  const native=fixture('unearned-event'),foreign=structuredClone(native);
  foreign.cohorts[0].market!.languages=['ja'];
  const a=buildCinemaChoices(native).find(r=>r.kind==='FIRST')!,b=buildCinemaChoices(foreign).find(r=>r.kind==='FIRST')!;
  assert.equal(b.awarePeople,a.awarePeople);
  assert.equal(b.reachableUnseenPeople,a.reachableUnseenPeople,'Language preference must not be charged as a second loss of physical access');
  assert.ok(Math.abs(b.requestedAdmissions/a.requestedAdmissions-.3)<.001,'The existing 30% foreign-language preference applies once to ticket intent');
});
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
test('an observed weak response informs the reached audience before a large country has all attended',()=>{
  const weak=fixture('satisfied-repeat');weak.titles[0].exposure!.events=[];
  weak.marketState!.titles[0].cells[0].awarePeople=100_000;
  weak.marketState!.titles[0].cells[0].seenBands=[{people:1_000,satisfaction:20,repeatAdmissions:0,lastViewedWeek:99}];
  weak.marketState!.titles[0].cells[0].discoveryContactsUsed=10_000;
  const unviewed=structuredClone(weak);unviewed.marketState!.titles[0].cells[0].seenBands=[];
  assert.ok(count(weak)<count(unviewed)*.5,'A reliable 1% sample of reached people must have a material response effect');
});
test('a reliable excellent paid response can sustain later intent beyond an ordinary response',()=>{
  const excellent=fixture('satisfied-repeat');excellent.absoluteWeek=110;excellent.titles[0].market!.releaseWeek=100;
  const cell=excellent.marketState!.titles[0].cells[0];cell.awarePeople=100_000;
  cell.seenBands=[{people:1_000,satisfaction:96,repeatAdmissions:0,lastViewedWeek:109}];cell.discoveryContactsUsed=100_000;
  const ordinary=structuredClone(excellent);ordinary.marketState!.titles[0].cells[0].seenBands[0].satisfaction=75;
  assert.ok(count(excellent)>count(ordinary)*2,'Excellent observed response must sustain interest, not just inherit the same fixed decay');
  assert.ok(count(excellent)<=buildCinemaChoices(excellent).find(r=>r.kind==='FIRST')!.reachableUnseenPeople);
});
test('unseen final quality cannot buy longer legs, and a tiny observed sample cannot renew a whole market',()=>{
  const unknown=fixture('unearned-event');unknown.absoluteWeek=110;unknown.titles[0].market!.releaseWeek=100;
  const other=structuredClone(unknown);other.titles[0].delivery.deliveredQuality=1;other.titles[0].market!.payoff=1;
  assert.equal(count(unknown),count(other));
  const tiny=fixture('satisfied-repeat');tiny.absoluteWeek=110;tiny.titles[0].market!.releaseWeek=100;
  const cell=tiny.marketState!.titles[0].cells[0];cell.awarePeople=100_000;cell.discoveryContactsUsed=100_000;
  cell.seenBands=[{people:1,satisfaction:100,repeatAdmissions:0,lastViewedWeek:109}];
  const ordinary=structuredClone(tiny);ordinary.marketState!.titles[0].cells[0].seenBands[0].satisfaction=75;
  assert.ok(count(tiny)<=count(ordinary)*1.02+1);
});
test('later awareness cannot erase staying power earned from the same paid review sample',()=>{
  const f=fixture('satisfied-repeat');f.absoluteWeek=120;f.titles[0].market!.releaseWeek=100;
  const cell=f.marketState!.titles[0].cells[0];cell.awarePeople=100_000;cell.discoveryContactsUsed=100_000;
  cell.seenBands=[{people:1_000,satisfaction:96,repeatAdmissions:0,lastViewedWeek:119}];
  const old=count(f);cell.awarePeople=200_000;
  assert.ok(count(f)>=old,'Adding reached people with the same paid response cannot reduce total intent');
});
test('known streaming remains a waiting option after its public start',()=>{
  const f=fixture('streaming-wait');f.titles[0].market!.streamingWindow!.absoluteWeek=99;assert.ok(count(f)<count(fixture('no-streaming-deal')));
});
console.log(`Audience audit: ${passed} groups passed`);
