import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type Player} from '../types';
import {quoteSponsorshipValue,type SponsorshipQuoteInput} from '../services/sponsorshipEconomy';
import {createWorldPopulationState} from '../services/worldEconomy/worldPopulation';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {generateManagerOffer,MANAGER_CATALOG} from '../services/teamLogic';
import {createDeterministicRng} from '../services/deterministicRandom';
import {migratePlayerSave} from '../services/saveMigration';

// Controlled quote cases, excluded from all earned career/box-office results.
const base=migratePlayerSave(structuredClone(INITIAL_PLAYER));
base.age=30;base.currentWeek=12;base.stats.fame=90;base.stats.reputation=80;
base.team.manager=MANAGER_CATALOG.at(-1)!;
base.instagram.posts=[0,1,2].map(i=>({id:'observed-'+i,authorId:base.id,authorName:base.name,authorHandle:'@quote-case',authorAvatar:'',type:'REEL',caption:'Observed case',week:11-i,year:30,likes:10000,comments:1000,shares:500,isPlayer:true}));
const quote=(followers:number)=>{
 const p:Player=structuredClone(base);p.stats.followers=followers;p.instagram.followers=followers;
 const before=JSON.stringify(p);
 for(let seed=0;seed<100;seed++){
  Math.random=createDeterministicRng('sponsor-audience-value:'+seed);
  const result=generateManagerOffer(p);
  if(result){assert.equal(JSON.stringify(p),before,'Quoting cannot rewrite paid terms or player state');return result;}
 }
 throw Error('No actual manager offer generated');
};
const established=quote(1_000_000),inflated=quote(1_000_000_000);
assert.ok(inflated.weeklyPay<=established.weeklyPay*2,
 `Unchanged delivered engagement cannot become a thousand-fold paid audience: ${established.weeklyPay} -> ${inflated.weeklyPay}`);
let passed=1;
const q:SponsorshipQuoteInput={source:'MANAGER',brandName:'Fair campaign',category:'FASHION',type:'POST',durationWeeks:8,totalRequired:8,isExclusive:false,commercialMultiplier:1};
const value=(p=base,changes:Partial<SponsorshipQuoteInput>={})=>quoteSponsorshipValue(p,{...q,...changes});
const ordinary=value();assert.ok(ordinary.weeklyPay>0);passed++;
const paper=structuredClone(base);paper.stats.followers=1e12;paper.instagram.followers=1e12;
assert.equal(value(paper).weeklyPay,ordinary.weeklyPay);passed++;
const duplicates=structuredClone(base);duplicates.instagram.posts.push(...structuredClone(base.instagram.posts));
assert.deepEqual(value(duplicates),ordinary);passed++;
const overlapping=structuredClone(base);overlapping.instagram.posts=[];overlapping.stats.followers=1e6;overlapping.instagram.followers=1e6;overlapping.youtube.subscribers=1e6;
const single=structuredClone(overlapping);single.youtube.subscribers=0;
assert.deepEqual(value(overlapping),value(single));passed++;
const short=value(base,{totalRequired:2,durationWeeks:4}),long=value(base,{totalRequired:2,durationWeeks:8});
assert.ok(Math.abs(short.weeklyPay*4-long.weeklyPay*8)<=8,'Stretching the same deliveries cannot create new contract value');passed++;
const more=value(base,{totalRequired:4,durationWeeks:8});assert.ok(more.weeklyPay>=long.weeklyPay&&more.weeklyPay<=long.weeklyPay*2+2);passed++;
const poor=structuredClone(base);poor.world.worldPopulation=createWorldPopulationState(getAbsoluteWeek(poor.age,poor.currentWeek));
for(const country of Object.values(poor.world.worldPopulation.countries)){country.developmentProfile='LOW';country.macro.purchasingPowerIndex=0;country.macro.consumerConfidence=0;}
assert.ok(value(poor).weeklyPay<ordinary.weeklyPay);passed++;
const micro=value(base,{source:'INSTAGRAM_DM',brandFollowers:5000}),bigger=value(base,{source:'INSTAGRAM_DM',brandFollowers:500000});
assert.ok(micro.weeklyPay>0&&micro.weeklyPay<=bigger.weeklyPay&&bigger.weeklyPay<ordinary.weeklyPay);passed++;
const rookie=structuredClone(base);rookie.instagram.posts=[];rookie.stats.followers=1000;rookie.instagram.followers=1000;rookie.stats.fame=5;rookie.youtube.subscribers=0;
assert.ok(value(rookie,{source:'INSTAGRAM_DM',brandFollowers:5000,totalRequired:2,durationWeeks:4}).weeklyPay>0,'An affordable micro-brand can pay a first small creator fee');passed++;
const saturated=structuredClone(base);saturated.instagram.posts=[];saturated.stats.followers=1e30;saturated.instagram.followers=1e30;
const extreme=value(saturated);assert.ok(Number.isFinite(extreme.weeklyPay)&&extreme.valueBasis.reachablePeople<=extreme.valueBasis.eligiblePeople);passed++;
assert.equal(value(base,{totalRequired:0}).weeklyPay,0);assert.equal(value(base,{durationWeeks:0}).weeklyPay,0);passed++;
const signed={...established,id:'legacy-signed',brandName:q.brandName,weeklyPay:10_000_000,durationWeeks:2,weeksCompleted:18};delete signed.valueBasis;
const legacy=structuredClone(base);legacy.activeSponsorships=[signed];const protectedTerms=JSON.stringify(signed);
const normalized=migratePlayerSave(structuredClone(legacy));assert.equal(JSON.stringify(normalized.activeSponsorships[0]),protectedTerms);passed++;
assert.equal(value(legacy).weeklyPay,0,'Existing same-brand remaining obligations consume buyer budget, including the second half of a deal');passed++;
assert.equal(JSON.stringify(legacy.activeSponsorships[0]),protectedTerms);passed++;
assert.equal(ordinary.valueBasis.estimatedContractValue,ordinary.weeklyPay*q.durationWeeks);assert.equal(ordinary.valueBasis.audienceBasis,'OBSERVED_ENGAGEMENT');passed++;
assert.equal(established.valueBasis?.version,1);assert.equal(inflated.valueBasis?.source,'MANAGER');passed++;
console.log(JSON.stringify({passed,establishedWeekly:established.weeklyPay,inflatedFollowerWeekly:inflated.weeklyPay,observedQuote:ordinary,microWeekly:micro.weeklyPay,kind:'CONTROLLED_QUOTE_CASES_NOT_CAREER_RESULTS'}));
