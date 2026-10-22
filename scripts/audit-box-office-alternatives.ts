import assert from 'node:assert/strict';
import { buildCinemaChoices } from '../services/boxOffice/boxOfficeAudience';
import { projectCinemaForecastInput } from '../services/boxOffice/boxOfficeAwareness';
import { readCinemaWorldAudience } from '../services/boxOffice/boxOfficeAudienceAdapters';
import { createWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { createWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { makeCinemaFixture, makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';
import type { CinemaWeekInput } from '../services/boxOffice/boxOfficeTypes';

let passed=0,failed=0;
const test=(name:string,run:()=>void)=>{try{run();passed++;console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${(e as Error).message}`)}};
const home={platformId:'streamer',countryId:'US',cohortId:'US:audience',accessiblePeople:600_000,catalogueStrength:90,serviceQuality:90,localization:90,freshness:90,preferredGenres:['ACTION'],evidenceWeek:99};
const withHome=(rows:unknown[]=[home])=>Object.assign(makeCinemaMarketFixture(),{streamingAlternatives:rows}) as CinemaWeekInput;
const count=(f:CinemaWeekInput)=>buildCinemaChoices(f).filter(r=>r.kind==='FIRST').reduce((n,r)=>n+r.requestedAdmissions,0);
test('an accessible relevant home catalogue competes for theater willingness',()=>assert.ok(count(withHome())<count(withHome([]))));
test('a foreign unplayable or future-observed platform cannot reduce local demand',()=>{
    const plain=count(withHome([]));
    for(const row of [{...home,countryId:'JP'},{...home,cohortId:'US:other'},{...home,catalogueStrength:0},{...home,evidenceWeek:100},{...home,accessiblePeople:0}])assert.equal(count(withHome([row])),plain);
});
test('duplicate subscriptions and completely overlapping platform audiences are not extra people',()=>{
    assert.equal(count(withHome([home,home])),count(withHome()));
    assert.equal(count(withHome([home,{...home,platformId:'second'}])),count(withHome()));
});
test('relevant streaming genre competes more than an unrelated catalogue',()=>assert.ok(count(withHome([{...home,preferredGenres:['ROMANCE']}]))>count(withHome())));
test('cinematic event urgency retains more theater willingness',()=>{
    const event=withHome(),ordinary=withHome();event.titles[0].market!.urgency=100;ordinary.titles[0].market!.urgency=0;
    const eventPlain=structuredClone(event),ordinaryPlain=structuredClone(ordinary);Object.assign(eventPlain,{streamingAlternatives:[]});Object.assign(ordinaryPlain,{streamingAlternatives:[]});
    assert.ok(count(event)/count(eventPlain)>count(ordinary)/count(ordinaryPlain));
});
test('a signed date alone cannot invent locally accessible home viewers',()=>{
    const f=withHome([]);f.titles[0].market!.streamingWindow={platformId:'streamer',countryIds:['US'],absoluteWeek:101,publiclyKnown:true};assert.equal(count(f),count(withHome([])));
});
test('waiting for this film and another home title use one outside-choice effect',()=>{
    const f=withHome(),before=count(f);f.titles[0].market!.streamingWindow={platformId:'streamer',countryIds:['US'],absoluteWeek:101,publiclyKnown:true};
    assert.ok(count(f)<=before);const once=count(f);f.titles[0].market!.streamingWindows=[f.titles[0].market!.streamingWindow!,{...f.titles[0].market!.streamingWindow!,platformId:'second'}];
    Object.assign(f,{streamingAlternatives:[home,{...home,platformId:'second'}]});assert.equal(count(f),once);
});
test('forecasts retain public alternative evidence without altering or charging the world',()=>{
    const f=withHome(),known={cohorts:f.cohorts,titles:f.titles.map(t=>({...t,delivery:{estimatedQuality:60,qualityRange:[40,80] as const,scriptQuality:60,directorQuality:60,castingStrength:60}}))};
    const safe=projectCinemaForecastInput(f,known) as CinemaWeekInput&{streamingAlternatives?:unknown[]};
    assert.deepEqual(safe.streamingAlternatives,(f as typeof safe).streamingAlternatives);assert.ok(count(safe)<count({...safe,...{streamingAlternatives:[]}}));
});
test('canonical adapter is neutral without actual funded or observed home access',()=>{
    const {player}=makeCinemaFixture(),pop=createWorldPopulationState(100),aud=createWorldAudienceEconomyState(pop,100);
    player.world.worldPopulation=pop;player.world.worldAudienceEconomy=aud;player.world.worldAudienceParticipation=createWorldAudienceParticipationState(pop,aud,100);
    const before=structuredClone(player),world=readCinemaWorldAudience(player) as ReturnType<typeof readCinemaWorldAudience>&{streamingAlternatives?:unknown[]};
    assert.deepEqual(world.streamingAlternatives,[]);assert.deepEqual(player,before);
});
console.log(`Alternatives audit: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
