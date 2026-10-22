import assert from 'node:assert/strict';
import { makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';
import { forecastCinemaWeek } from '../services/boxOffice/boxOfficeForecast';
import { toCinemaPresentation, getCinemaAudienceInsights } from '../services/boxOffice/boxOfficePresentation';
import { migrateCinemaState } from '../services/boxOffice/boxOfficeMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildCinemaWeekInput } from '../services/boxOffice/boxOfficeWeek';
import { commitCinemaReleaseExposure } from '../services/boxOffice/boxOfficeExposureAdapters';
import { forecastCinemaProject } from '../services/boxOffice/boxOfficeForecastAdapter';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { projectCinemaForecastInput } from '../services/boxOffice/boxOfficeAwareness';
import type { CinemaKnownInputs } from '../services/boxOffice/boxOfficeTypes';
let count=0;const test=(name:string,fn:()=>void)=>{fn();console.log('PASS',name);count++};
const f=makeCinemaMarketFixture();
const known:CinemaKnownInputs={cohorts:structuredClone(f.cohorts),titles:f.titles.map(t=>({...t,delivery:{estimatedQuality:70,qualityRange:[50,90],scriptQuality:70,directorQuality:70,castingStrength:70}}))};
test('forecast is pure, ordered, deterministic and creates no live receipt',()=>{
 const before=structuredClone(f),k=structuredClone(known),a=forecastCinemaWeek(f,known);
 assert.deepEqual(f,before);assert.deepEqual(known,k);assert.deepEqual(a,forecastCinemaWeek(f,known));
 for(const r of [a.titles[0].grossCents,a.titles[0].admissions,a.titles[0].producerReceiptsCents])assert.ok(r.low<=r.mid&&r.mid<=r.high);
 assert.equal(a.knowledge,'FORECAST');assert.equal('nextState' in a,false);
});
test('hidden final delivery and unknown observed fields cannot alter preview',()=>{
 const a=forecastCinemaWeek(f,known); const changed=structuredClone(f);changed.titles[0].delivery.deliveredQuality=1;(changed as any).secret=100;
 assert.deepEqual(a,forecastCinemaWeek(changed,known));
});
test('mid scenario equals the same known-input market kernel',()=>{
 const result=simulateCinemaWeek(projectCinemaForecastInput(f,known));const a=forecastCinemaWeek(f,known).titles[0];
 assert.equal(a.grossCents.mid,result.titles[0].grossCents);assert.equal(a.producerReceiptsCents.mid,result.titles[0].producerReceiptsCents);
});
test('presentation preserves every cent and labels shadow results',()=>{
 const r=simulateCinemaWeek(f),p=toCinemaPresentation(r,'film');
 assert.equal(p.grossCents,r.titles[0].grossCents);assert.equal(p.producerReceiptsCents,r.titles[0].producerReceiptsCents);
 assert.equal(p.grossCents,p.producerReceiptsCents+p.exhibitorReceiptsCents+p.distributionDeductionsCents);assert.equal(p.evidence,'FORECAST');
 assert.throws(()=>toCinemaPresentation(r,'missing'));
});
test('no attendance-derived tags without settled evidence; legacy repeats are never invented',()=>{
 const {player}=requireFixture();assert.deepEqual(getCinemaAudienceInsights(player,'film').tags,[]);
});
function requireFixture(){return {player:{world:{cinemaMarket:undefined}} as any}}
test('real release forecast is pure and hides final quality including payoff',()=>{
 const f=makeCinemaFixture(51);f.player.activeReleases=[];f.player.commitments=[];
 f.project.hiddenStats.estimatedQualityScore=70;
 const before=structuredClone(f.player),p=structuredClone(f.project),a=forecastCinemaProject(f.player,f.project,'preview');
 f.project.hiddenStats.qualityScore=1;f.project.hiddenStats.scriptQuality=1;f.project.hiddenStats.directorQuality=1;
 assert.deepEqual(a,forecastCinemaProject(f.player,f.project,'preview'));assert.deepEqual(f.player,before);
 assert.ok(a.titles.some(t=>t.titleId==='preview'));f.project=p;
});
test('generic unconverted demand is never called a known streaming wait',()=>{
 const r=simulateCinemaWeek(makeCinemaMarketFixture('no-streaming-deal'));
 assert.equal(r.titles[0].audienceSignals!.homeWaitingPeople,0);
 const paid={basis:'UNSETTLED_WEEKLY',firstAdmissions:50000,repeatAdmissions:5000,audienceSignals:r.titles[0].audienceSignals};
 const player={world:{cinemaMarket:{titles:{film:paid},market:r.nextState,weeks:[]}}} as any;
 assert.ok(!getCinemaAudienceInsights(player,'film').tags.includes('Audience waiting for home viewing'));
 assert.ok(getCinemaAudienceInsights(player,'film').tags.includes('Paid repeat interest'));
 paid.basis='LEGACY_FULLY_SETTLED';assert.equal(getCinemaAudienceInsights(player,'film').firstAdmissions,null);
});
test('nonzero release preview matches live mid with country-specific chains and paid campaign',()=>{
 const f=makeCinemaFixture(77);const now=getAbsoluteWeek(f.player.age,f.player.currentWeek);f.player.activeReleases=[];
 f.project.hiddenStats={...f.project.hiddenStats,estimatedQualityScore:75,qualityScore:75,scriptQuality:75,directorQuality:75,castingStrength:75};
 f.project.castList=[{id:'PLAYER_SELF',actorId:'PLAYER_SELF',name:f.player.name,type:'ACTOR',role:'Lead',roleType:'LEAD',isPlayer:true,image:''}];
 f.project.releaseRegionIds=['NORTH_AMERICA','ASIA'];f.project.releaseChainSelections={NORTH_AMERICA:['EMPIRE_CINEMAS'],ASIA:['PRISM_HALLS']};
 f.project.marketingBudgetSpent=1e6;f.project.marketingChannelAllocations={SOCIAL_MEDIA:1e6} as any;
 f.project=commitCinemaReleaseExposure({player:f.player,project:f.project,titleId:'preview',absoluteWeek:now,allocations:f.project.marketingChannelAllocations});
 f.player=migrateCinemaState(f.player,now).player;
 const a=forecastCinemaProject(f.player,f.project,'preview',now+1).titles.find(t=>t.titleId==='preview')!;
 f.player.activeReleases=[{id:'preview',name:'Preview',type:'MOVIE',roleType:'LEAD',projectDetails:f.project,weekNum:1,weeklyGross:[],totalGross:0,budget:f.project.estimatedBudget,status:'RUNNING',distributionPhase:'THEATRICAL',releasedAtAbsoluteWeek:now+1} as any];
 const result=simulateCinemaWeek(buildCinemaWeekInput(f.player,now+1)),r=result.titles.find(t=>t.titleId==='preview')!;
 assert.ok(r.grossCents>0);assert.equal(a.grossCents.mid,r.grossCents);assert.equal(a.producerReceiptsCents.mid,r.producerReceiptsCents);
 assert.equal(a.admissions.mid,r.firstAdmissions+r.repeatAdmissions);assert.equal(a.bookingCostCents.mid,result.costEvents.filter(c=>c.titleId==='preview').reduce((n,c)=>n+c.amountCents,0));
});
console.log(`Cinema presentation: ${count} groups passed`);
