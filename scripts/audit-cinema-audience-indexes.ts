import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type Player} from '../types';
import {readCinemaWorldAudience} from '../services/boxOffice/boxOfficeAudienceAdapters';
import {readIssuedCinemaWorldAudience} from './fixtures/issuedCinemaAudienceAdapter';
const make=()=>{
 const p=structuredClone(INITIAL_PLAYER) as Player;
 p.pastProjects=[{id:'t1',name:'First',studioId:'STUDIO_A',castList:[]},{id:'t2',name:'Second',studioId:'STUDIO_B',castList:[]}] as any;p.activeReleases=[];
 p.world={...p.world,projects:[],industryProductions:{},worldPopulation:{lastProcessedAbsoluteWeek:10,countries:{US:{id:'US',regionId:'NORTH_AMERICA',population:100,cinemaAccessPercent:100,macro:{purchasingPowerIndex:100,inflationPressure:0},languages:['english'],urbanPercent:100}}},
 worldAudienceEconomy:{countries:{US:{id:'US',cohorts:[{id:'adult',people:100,households:50,lifeStageId:'ADULT',priceSensitivityIndex:50,primaryPersonaId:'GENERAL'}]}}},
 worldAudienceParticipation:{countries:{US:{cohorts:[{cohortId:'adult',cinemaOnlyHouseholds:50,dualParticipantHouseholds:0,totalMonthlyCinemaBudget:100,cinemaInterestIndex:50}]}}},
 worldStreamingViewing:{lastProcessedAbsoluteWeek:10,countries:{US:{countryId:'US',titlePerformance:[{projectId:'t1',viewingAccounts:10,estimatedViewers:20,completionRate:.8},{projectId:'t2',viewingAccounts:8,estimatedViewers:10,completionRate:.6}]}},platforms:{a:{titlePerformance:[{projectId:'t1',satisfactionScore:70}]},b:{titlePerformance:[{projectId:'t1',satisfactionScore:20},{projectId:'t2',satisfactionScore:60}]}}},
 cinemaMarket:{streamingSeen:{t1:{countries:{US:20},lastWeek:10}}}} as any;
 return p;
};
const p=make(),expected=readIssuedCinemaWorldAudience(p,{includeStreamingAlternatives:false}),actual=readCinemaWorldAudience(p,{includeStreamingAlternatives:false});assert.deepEqual(actual,expected);assert.equal(actual.history.length,2);assert.equal(actual.history[0].satisfaction,70);assert.equal(actual.history[0].people,10);
const changed=make();(changed.world.worldStreamingViewing as any).platforms.a.titlePerformance[0].satisfactionScore=88;assert.equal(readCinemaWorldAudience(changed,{includeStreamingAlternatives:false}).history[0].satisfaction,88,'A new snapshot must not reuse stale cached evidence');
let accesses=0;const fixture=make(),platform=(fixture.world.worldStreamingViewing as any).platforms.a,values=platform.titlePerformance;Object.defineProperty(platform,'titlePerformance',{get(){accesses++;return values}});readCinemaWorldAudience(fixture,{includeStreamingAlternatives:false});assert.equal(accesses,1,'Each platform performance collection should be indexed once, not flattened again per observed title');
const missing=make();(missing.world.worldStreamingViewing as any).countries={};(missing.world.worldStreamingViewing as any).platforms={unknown:{}};(missing.world.cinemaMarket as any).streamingSeen={};assert.equal(readCinemaWorldAudience(missing,{includeStreamingAlternatives:false}).history.length,0,'Missing viewing evidence stays unknown without throwing');
console.log(JSON.stringify({passed:5,firstMatchAndSnapshotParity:true}));
