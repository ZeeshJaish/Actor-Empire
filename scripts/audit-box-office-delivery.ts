import assert from 'node:assert/strict';
import { calculateGreenlightEstimatedQuality, calculateGreenlightCastingStrength } from '../views/lifestyle/business/greenlightCalculations';
import { calculateWeeklyBoxOffice, calculateDynamicBoxOfficeTotalCap, getEstimatedBudget, generateCastList } from '../services/roleLogic';
import { calculateProductionRiskProfile } from '../services/productionRisk';
import { getProductionBudgetTier } from '../services/studioProductionEconomy';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
const cases: Array<[string,()=>void]>=[];
const test=(name:string,run:()=>void)=>cases.push([name,run]);
const quality = (level:number, overrides:Record<string,unknown>={}) => calculateGreenlightEstimatedQuality({
 scriptQuality:70,directorQuality:70,castingStrength:70,crewQualities:[70,70,70,70],
 equipmentChoices:{cameras:'OWNED',lighting:'OWNED',sound:'OWNED',practicalEffects:'OWNED'},
 ownedEquipmentLevels:{cameras:level,lighting:level,sound:level,practicalEffects:level},gearTiers:{},
 locationQualities:[8],storyFitQualityAdjustment:0,backgroundAuthenticity:50,backgroundReliability:50,backgroundSetCare:50,...overrides,
});
test('max equipment cannot turn ordinary craft into a perfect film',()=>{
 assert.ok(quality(10)<85,`ordinary craft plus maximum gear must remain ordinary/good, got ${quality(10)}`);
 assert.ok(quality(10)>quality(0),'Real equipment still has a useful bounded benefit');
});
test('equipment has diminishing returns',()=>{
 assert.ok(quality(2)-quality(0)>quality(10)-quality(8));
});
test('zero craft is not silently replaced with average craft',()=>{
 assert.ok(quality(0,{scriptQuality:0,directorQuality:0,castingStrength:0,crewQualities:[0],locationQualities:[]})<10);
 assert.ok(Number.isFinite(quality(10,{scriptQuality:NaN,directorQuality:Infinity})));
});
test('fame does not substitute for acting craft',()=>{
 const cast=[{roleType:'LEAD' as const,talent:20,fame:0},{roleType:'SUPPORTING' as const,talent:40,fame:0}];
 assert.equal(calculateGreenlightCastingStrength({cast,estimatedBudget:50e6}),
  calculateGreenlightCastingStrength({cast:cast.map(c=>({...c,fame:100})),estimatedBudget:50e6}));
});
test('generated cash budgets match every declared tier including blockbuster',()=>{
 for(const tier of ['LOW','MID','HIGH','BLOCKBUSTER'] as const)for(const roll of [0,0.5,1]){
  const budget=getEstimatedBudget(tier,()=>roll);assert.ok(Number.isFinite(budget));
  assert.equal(getProductionBudgetTier(budget),tier,`${tier} budget ${budget} has inconsistent scale`);
 }
});
test('identical cash/package cannot change risk when only a tier label changes',()=>{
 const f=makeCinemaFixture();const a=calculateProductionRiskProfile(f.project);
 const b=calculateProductionRiskProfile({...f.project,budgetTier:'BLOCKBUSTER'});
 assert.deepEqual(a,b);
});
test('one dollar across $120M does not create a ticket-earnings cliff',()=>{
 const f=makeCinemaFixture(); const before=Math.random; Math.random=()=>0.5;
 try {const values=[120_000_000,120_000_001].map(budget=>calculateWeeklyBoxOffice(1,budget,
  {...f.project.hiddenStats,qualityScore:95,fameMultiplier:4},0,80,getProductionBudgetTier(budget),'ACTION'));
 assert.ok(Math.abs(values[1]-values[0])<20,`one dollar created a ${values[1]-values[0]} opening jump`);
 }finally{Math.random=before;}
});
test('legacy dynamic ceiling uses continuous cash inputs instead of labels',()=>{
 const f=makeCinemaFixture();
 const common={genre:f.project.genre,hiddenStats:f.project.hiddenStats,estimatedBudget:120_000_000,capRoll:0.5};
 assert.equal(calculateDynamicBoxOfficeTotalCap({...common,budgetTier:'HIGH'}).totalCap,
  calculateDynamicBoxOfficeTotalCap({...common,budgetTier:'BLOCKBUSTER'}).totalCap);
});
test('blockbuster fallback has the actual offered ensemble and stable credits',()=>{
 const f=makeCinemaFixture(14);f.project.budgetTier='BLOCKBUSTER';
 const first=generateCastList(f.player,f.project,'LEAD');
 assert.ok(first.filter(c=>c.type==='ACTOR').length>=7);
 assert.deepEqual(generateCastList(f.player,f.project,'LEAD'),first);
});
let failures=0;for(const[name,run]of cases){try{run();console.log('PASS',name)}catch(error){failures++;console.error('FAIL',name,error instanceof Error?error.message:error)}}
assert.equal(failures,0,`${failures} cinema delivery regressions`);
