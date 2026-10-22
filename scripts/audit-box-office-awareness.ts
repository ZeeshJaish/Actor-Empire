import { CINEMA_MARKET_TUNING_VERSION } from '../services/boxOffice/boxOfficeProfiles';
import assert from 'node:assert/strict';
import { buildCinemaExposure, appendCinemaExposureEvent, readCinemaExposureRecord, projectCinemaForecastInput } from '../services/boxOffice/boxOfficeAwareness';
import { makeCinemaExposureFixture, makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { normalizeCinemaTitle } from '../services/boxOffice/boxOfficeInputs';
import type { CinemaExposureEvent, CinemaExposureInput, CinemaWeekInput, CinemaKnownInputs } from '../services/boxOffice/boxOfficeTypes';
const tests:Array<[string,()=>void]>=[];const test=(name:string,run:()=>void)=>tests.push([name,run]);
const event=(overrides:Partial<CinemaExposureEvent>={}):CinemaExposureEvent=>({id:'paid-1',titleId:'exposure-fixture',absoluteWeek:100,
 kind:'PAID_CAMPAIGN',channel:'TRAILER',impressions:1_000_000,paidCostCents:100_000,...overrides});
test('private unknown packages have no audience and footprint alone changes nothing',()=>{
 const a=buildCinemaExposure(makeCinemaExposureFixture('narrow-unknown'));
 const b=buildCinemaExposure({...makeCinemaExposureFixture('wide-unknown'),screens:1e9,releaseCountries:['US','IN','GB']} as CinemaExposureInput);
 assert.deepEqual(a,b);assert.equal(a.awarePeople,0);assert.ok(a.attentionPotential>0);
});
test('a public star announcement creates bounded organic awareness with no paid campaign',()=>{
 const f=makeCinemaExposureFixture('two-stars-weak');assert.equal(buildCinemaExposure(f).awarePeople,0);
 const actual=buildCinemaExposure({...f,events:[event({kind:'ANNOUNCEMENT',impressions:0,paidCostCents:0})]});
 assert.ok(actual.awarePeople>0 && actual.awarePeople<500_000);assert.equal(actual.recognitionEstimated,true);
});
test('healthy new-studio scores cannot create established recognition',()=>{
 const a=makeCinemaExposureFixture('narrow-unknown'),b=makeCinemaExposureFixture('healthy-new-studio');
 a.events=b.events=[event({kind:'ANNOUNCEMENT',impressions:0})];assert.deepEqual(buildCinemaExposure(a),buildCinemaExposure(b));
});
test('paid reach saturates the existing audience with declining marginal growth',()=>{
 const f=makeCinemaExposureFixture();
 const counts=[1,2,3].map(n=>buildCinemaExposure({...f,events:[event({impressions:n*1_000_000})]}).awarePeople);
 assert.ok(counts[0]>0);assert.ok(counts[2]<1_000_000);assert.ok(counts[1]-counts[0]>counts[2]-counts[1]);
});
test('duplicate events apply once and conflicting duplicate identities are rejected',()=>{
 const f=makeCinemaExposureFixture();assert.deepEqual(buildCinemaExposure({...f,events:[event(),event()]}),buildCinemaExposure({...f,events:[event()]}));
 assert.throws(()=>buildCinemaExposure({...f,events:[event(),event({impressions:10})]}));
});
test('source order is stable and new sources only reach the still-unaware population',()=>{
 const f=makeCinemaExposureFixture();const a=event(),b=event({id:'paid-2'});
 const whole=buildCinemaExposure({...f,events:[a,b]});assert.deepEqual(whole,buildCinemaExposure({...f,events:[b,a]}));
 const first=buildCinemaExposure({...f,events:[a]});
 const next=buildCinemaExposure({...f,cohorts:[{...f.cohorts[0],priorAwarePeople:first.awarePeople}],events:[a,b],appliedEventIds:[a.id]});
 assert.equal(next.awarePeople,whole.awarePeople);assert.ok(next.newlyAwarePeople<first.newlyAwarePeople);
});
test('many duplicate actor credits never create extra fans',()=>{
 const f=makeCinemaExposureFixture('overlapping-fans');f.events=[event({kind:'ANNOUNCEMENT',impressions:0})];
 assert.deepEqual(buildCinemaExposure({...f,cast:[...f.cast,...f.cast,...f.cast]}),buildCinemaExposure(f));
 const one=buildCinemaExposure({...f,cast:[f.cast[0]]});const two=buildCinemaExposure(f);
 assert.ok(two.awarePeople>one.awarePeople && two.awarePeople<2*one.awarePeople);
});
test('cameo recognition is smaller than a meaningful lead credit',()=>{
 const f=makeCinemaExposureFixture('two-stars-weak');f.cast=[f.cast[0]];f.events=[event({kind:'ANNOUNCEMENT',impressions:0})];
 assert.ok(buildCinemaExposure({...f,cast:[{...f.cast[0],roleType:'CAMEO',roleWeight:.25}]}).awarePeople<buildCinemaExposure(f).awarePeople);
});
test('favorites and studio trust require actual experience evidence',()=>{
 const f=makeCinemaExposureFixture('two-stars-weak');f.events=[event({kind:'ANNOUNCEMENT',impressions:0})];
 const unearned={...f,cohorts:[{...f.cohorts[0],actors:{'actor-a':{recognition:.2,favoriteFraction:1,experiencedPeople:0}},studioTrust:{strength:1,experiencedPeople:0}}]};
 const noLove={...unearned,cohorts:[{...unearned.cohorts[0],actors:{'actor-a':{recognition:.2}},studioTrust:{strength:0,experiencedPeople:0}}]};
 assert.deepEqual(buildCinemaExposure(unearned),buildCinemaExposure(noLove));
 const earned={...unearned,cohorts:[{...unearned.cohorts[0],actors:{'actor-a':{recognition:.2,favoriteFraction:.2,experiencedPeople:200_000}},studioTrust:{strength:1,experiencedPeople:200_000}}]};
 assert.ok(buildCinemaExposure(earned).awarePeople>buildCinemaExposure(unearned).awarePeople);
});
test('repeat announcements do not pay out the same actor recognition again',()=>{
 const f=makeCinemaExposureFixture('two-stars-weak');const a=event({kind:'ANNOUNCEMENT',impressions:0});
 assert.equal(buildCinemaExposure({...f,events:[a,event({...a,id:'announced-again'})]}).awarePeople,buildCinemaExposure({...f,events:[a]}).awarePeople);
});
test('a real announcement can reach a new country once without re-paying recognition elsewhere',()=>{
 const f=makeCinemaExposureFixture('two-stars-weak');f.cohorts=[...f.cohorts,{id:'IN:audience',countryId:'IN',people:1e6}];
 const us=event({id:'announce-us',kind:'ANNOUNCEMENT',impressions:0,countryIds:['US']});
 const india=event({id:'announce-in',kind:'ANNOUNCEMENT',impressions:0,countryIds:['IN']});
 const r=buildCinemaExposure({...f,events:[us,india]});assert.ok(r.cohorts.every(c=>c.awarePeople>0));
 assert.equal(r.cohorts[0].awarePeople,r.cohorts[1].awarePeople);
});
test('committed announcement recognition is frozen rather than re-valued from later fame',()=>{
 const f=makeCinemaExposureFixture('two-stars-weak');f.events=[event({kind:'ANNOUNCEMENT',impressions:0,recognitionShare:.1})];
 const before=buildCinemaExposure(f).awarePeople;f.cast=f.cast.map(c=>({...c,fame:1}));
 assert.equal(buildCinemaExposure(f).awarePeople,before);
});
test('local discovery requires real local footfall, independent of screens',()=>{
 const f=makeCinemaExposureFixture();f.cohorts=[...f.cohorts,{id:'IN:audience',countryId:'IN',people:1e6}];
 const local=event({kind:'LOCAL_DISCOVERY',impressions:1e9,actualFootfall:1000,countryIds:['US']});
 const r=buildCinemaExposure({...f,events:[local]});assert.ok(r.awarePeople>0 && r.awarePeople<=1000);
 assert.equal(r.cohorts.find(c=>c.countryId==='IN')!.awarePeople,0);
 assert.equal(buildCinemaExposure({...f,events:[{...local,actualFootfall:0}]}).awarePeople,0);
});
test('future events, unpaid campaigns and legacy hype do not become actual exposure',()=>{
 const f=makeCinemaExposureFixture();
 for(const e of [event({absoluteWeek:101}),event({paidCostCents:0}),event({kind:'LEGACY_ESTIMATE',impressions:1e12})]) assert.equal(buildCinemaExposure({...f,events:[e]}).awarePeople,0);
 const legacy=readCinemaExposureRecord({hiddenStats:{rawHype:100}});assert.equal(legacy.attentionBasis,'LEGACY_ESTIMATE');assert.equal(legacy.events.length,0);
});
test('streaming promotion is bounded by actual accessible reach, not subscribers',()=>{
 const f=makeCinemaExposureFixture();const e=event({kind:'STREAMING_CHANNEL',impressions:1e9,accessiblePeople:100});
 assert.ok(buildCinemaExposure({...f,events:[e]}).awarePeople<=100);
 assert.equal(buildCinemaExposure({...f,events:[{...e,accessiblePeople:0}]}).awarePeople,0);
});
test('exposure event commits are immutable, idempotent and survive JSON reload',()=>{
 const before={hiddenStats:{rawHype:75}},source=JSON.stringify(before);const first=appendCinemaExposureEvent(before,event());
 assert.equal(JSON.stringify(before),source);assert.equal(first.events.length,1);
 assert.deepEqual(appendCinemaExposureEvent({cinemaExposure:JSON.parse(JSON.stringify(first))},event()),first);
});
test('malformed counts and duplicate cohort identities cannot mint people',()=>{
 const f=makeCinemaExposureFixture();
 assert.throws(()=>buildCinemaExposure({...f,cohorts:[...f.cohorts,...f.cohorts]}));
 assert.throws(()=>buildCinemaExposure({...f,events:[event({impressions:Infinity})]}));
 assert.throws(()=>buildCinemaExposure({...f,cohorts:[{...f.cohorts[0],people:-1}]}));
});
test('forecast projection uses only known quality and creates no history',()=>{
 const f=makeCinemaFixture();const title=normalizeCinemaTitle({titleId:'forecast',owner:{id:'studio',route:'PLAYER_STUDIO'},project:f.project,player:f.player});
 const input:CinemaWeekInput={absoluteWeek:100,seed:1,tuningVersion:CINEMA_MARKET_TUNING_VERSION,knowledge:'OBSERVED',titles:[title],cohorts:makeCinemaExposureFixture().cohorts};
 const known:CinemaKnownInputs={titles:[{...title,delivery:{estimatedQuality:70,qualityRange:[60,80],scriptQuality:70,directorQuality:70,castingStrength:70}}],cohorts:input.cohorts};
 const before=JSON.stringify({input,known});const a=projectCinemaForecastInput(input,known);
 assert.equal(a.knowledge,'FORECAST');assert.equal(a.titles[0].delivery.deliveredQuality,undefined);
 const changed=structuredClone(input);changed.titles[0].delivery.deliveredQuality=1;changed.titles[0].delivery.scriptQuality=1;
 assert.deepEqual(projectCinemaForecastInput(changed,known),a);assert.equal(JSON.stringify({input,known}),before);
 assert.deepEqual(a.titles[0].delivery.qualityRange,[60,80]);
});
let failures=0;for(const[name,run]of tests){try{run();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e instanceof Error?e.message:e)}}
assert.equal(failures,0,`${failures} cinema awareness regressions`);
