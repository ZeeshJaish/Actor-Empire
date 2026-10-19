import assert from 'node:assert/strict';
import {getStreamingCountryServedAudience} from '../services/streamingMarketEconomics';
import {createPlatformAiFixture} from './helpers/platformAiFixture';
import {normalizePlatformAiState} from '../services/platformAi/platformAiState';
import {calculatePlatformAiWeeklyEconomy} from '../services/platformAi/platformAiEconomy';
import {createStreamingCountryMarketOperation,startStreamingMarketOperation} from '../services/streamingMarketsCore';
import {calculateStreamingMarketOperatingCosts} from '../services/streamingMarkets';
const planned=createStreamingCountryMarketOperation({seed:'usage-cost-audit',countryId:'US',entryKind:'OPENING',absoluteWeek:2000,source:'PLAYER_ACTION'})!;
const filed=startStreamingMarketOperation(planned,2000),active={...filed,status:'ACTIVE' as const};
const platform={marketOperations:[active]};let checks=0;const failures:string[]=[];
function check(name:string,fn:()=>void){checks++;try{fn();console.log('PASS',name)}catch(e){failures.push(name);console.error('FAIL',name,e)}}
const costs=(audience:number|undefined)=>calculateStreamingMarketOperatingCosts(platform,0,{countryActiveAudience:audience===undefined?undefined:{US:audience}} as any);
check('country entry cash and full-reach budget remain real and unchanged',()=>{assert.equal(filed.committedCosts.total,53_000_000);assert.equal(active.weeklyOperatingCost,1_080_000);});
check('an active empty market still pays the existing country minimum',()=>assert.equal(costs(0).marketOperatingCost,55_000));
check('small active audience pays fixed country overhead, not all potential residents',()=>assert.equal(costs(1_000_000).marketOperatingCost,55_000));
check('larger served audience scales at existing strict privacy rate',()=>assert.equal(costs(15_000_000).marketOperatingCost,72_000));
check('actual charge cannot exceed the quoted country budget',()=>assert.equal(costs(1_000_000_000).marketOperatingCost,active.weeklyOperatingCost));
check('missing legacy usage proof does not invent a cheaper bill',()=>assert.equal(costs(undefined).marketOperatingCost,active.weeklyOperatingCost));
check('suspension stops active country operating charges',()=>assert.equal(calculateStreamingMarketOperatingCosts({marketOperations:[{...active,status:'SUSPENDED'}]},0,{countryActiveAudience:{US:1_000_000}} as any).total,0));
const p=createPlatformAiFixture();
const week=2092;
p.world.worldPopulation={countries:{US:{households:100_000_000,averageHouseholdSize:2}},lastProcessedAbsoluteWeek:week} as any;
p.world.worldStreamingCustomers={lastProcessedAbsoluteWeek:week,countries:{US:{platformSummaries:[{platformId:'HULU',endingPaidAccounts:10_000_000},{platformId:'PLAYER',endingPaidAccounts:10_000_000}]}}} as any;
p.world.worldStreamingViewing={lastProcessedAbsoluteWeek:week,platforms:{},countries:{US:{platformPerformance:{
 HULU:{revenue:{totalIncrementalRevenue:0},accessMix:{paidViewingAccounts:5_000_000,freeViewingAccounts:5_000_000,sharedViewingAccounts:0,storeViewingAccounts:0,piracyViewingAccounts:80_000_000}},
 PLAYER:{revenue:{totalIncrementalRevenue:0},accessMix:{paidViewingAccounts:5_000_000,freeViewingAccounts:5_000_000,sharedViewingAccounts:0,storeViewingAccounts:2_000_000,piracyViewingAccounts:80_000_000}}
}}},commercialTransactions:[{countryId:'US',buyerPlanId:'CORE',households:2_000_000}]} as any;
check('inactive paid stock cannot conceal disjoint free audience or charge member store twice',()=>{
 assert.equal(getStreamingCountryServedAudience(p,'HULU','US',week),30_000_000);
 assert.equal(getStreamingCountryServedAudience(p,'PLAYER','US',week),30_000_000);
});
check('AI preceding-week settlement uses real observed usage without accepting future or stale data',()=>{
 assert.equal(getStreamingCountryServedAudience(p,'HULU','US',week+1,1),30_000_000);
 assert.equal(getStreamingCountryServedAudience(p,'HULU','US',week+1),undefined);
 assert.equal(getStreamingCountryServedAudience(p,'HULU','US',week+2,1),undefined);
 assert.equal(getStreamingCountryServedAudience(p,'HULU','US',week-1,1),undefined);
 const rival=normalizePlatformAiState(p.world.platforms!.HULU,p.id,week+1);
 rival.ai!.marketOperations=[active];
 // The ordinary AI economy call runs before the next customer/viewing stage.
 const result=calculatePlatformAiWeeklyEconomy({player:p,platform:rival,absoluteWeek:week+1});
 assert.equal(result.snapshot!.marketOperatingCostMillions,.144);
});
check('legacy missing population or usage fields cannot invent a cheaper country bill',()=>{
 const old=structuredClone(p);old.world.worldPopulation={} as any;
 assert.equal(getStreamingCountryServedAudience(old,'HULU','US',week),undefined);
 old.world.worldPopulation={countries:{US:{}}} as any;
 assert.equal(getStreamingCountryServedAudience(old,'HULU','US',week),undefined);
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
