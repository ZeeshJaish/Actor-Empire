/** Read-only analysis harness. No player saves or gameplay source are written.
 * Run from repository root:
 * node docs/reports/2026-10-22-box-office-analysis/run.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type ProjectDetails, type ActiveRelease, type BudgetTier } from '../../../types';
import { calculateWeeklyBoxOffice, calculateDynamicBoxOfficeTotalCap, calculateRunOutcome, generateHiddenStats, getEstimatedBudget, generateCastList, calculateCastDepthScore } from '../../../services/roleLogic';
import { calculateProjectFameMultiplier } from '../../../services/npcLogic';
import { calculateTheatricalDistributionBreakdown } from '../../../services/distributionRevenue';
import { calculateProductionRiskProfile } from '../../../services/productionRisk';
import { evaluateTheatricalExtension, getTheatricalWeekRange } from '../../../services/theatricalRunLogic';
import { getProductionBudgetTier } from '../../../services/studioProductionEconomy';
import { getProjectMarketDemand } from '../../../services/marketTrends';
import { createBusiness } from '../../../services/businessLogic';
import { processGameWeek } from '../../../services/gameLoop';
import { generateRandomUniverseOpportunity } from '../../../services/universeLogic';
import { calculateGreenlightEstimatedQuality } from '../../../views/lifestyle/business/greenlightCalculations';
import { applyOpportunityIdentityToProject } from '../../../services/characterIdentityLogic';

const originalRandom = Math.random;
const rng = (seed: number) => { let s = seed >>> 0; return () => {
  let t = s += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}; };
const fixed = <T>(fn: () => T): T => { const prior = Math.random; Math.random = () => 0.5; try { return fn(); } finally { Math.random = prior; } };
const player = structuredClone(INITIAL_PLAYER);
player.name = 'Analysis Fixture'; player.age = 30; player.currentWeek = 20; player.stats.fame = 50;
const makeProject = (budget = 90e6, tier: BudgetTier = 'HIGH', quality = 75): ProjectDetails => ({
  title: 'Controlled film', type: 'MOVIE', description: 'Prepared analysis fixture', studioId: 'UNIVERSAL',
  subtype: 'STANDALONE', genre: 'ACTION', format: 'LIVE_ACTION', budgetTier: tier, estimatedBudget: budget,
  releaseStrategy: 'THEATRICAL', visibleHype: 'MID', directorName: 'Audit Director',
  visibleDirectorTier: 'Established', visibleScriptBuzz: 'Good', visibleCastStrength: 'Solid',
  hiddenStats: { scriptQuality: quality, directorQuality: quality, castingStrength: quality,
    distributionPower: 80, rawHype: 80, qualityScore: quality, prestigeBonus: 0,
    fameMultiplier: 3, castDepthScore: 85, campaignReachMultiplier: 1, boxOfficeCapRoll: 0.5 },
});
type RunOptions = { demand?: number; reputation?: number; buzz?: number; rating?: number; performance?: number; liveTrends?: boolean; riskBypass?: boolean; budget?: number };
// Mirror the theatrical arithmetic and pull/extension decisions in gameLoop.ts.
// Deliberately excludes soundtrack, charity, marketing-reality edits and other weekly events.
const run = (project: ProjectDetails, opt: RunOptions = {}) => {
  const budget = opt.budget ?? project.estimatedBudget;
  const range = getTheatricalWeekRange(project.budgetTier);
  const baseWeeks = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  let maxWeeks = baseWeeks, extensions = 0, total = 0, receipts = 0, exhibitors = 0, cap = 0;
  const weekly: number[] = [], risks: number[] = [], history: any[] = [];
  const stats = project.hiddenStats;
  stats.boxOfficeCapRoll ??= Math.random();
  for (let week = 1; week <= 22; week++) {
    const demand = opt.liveTrends ? getProjectMarketDemand(project, 20 + week) : (opt.demand ?? 1);
    const risk = calculateProductionRiskProfile(project, { budget, imdbRating: opt.rating ?? 7.5, productionPerformance: opt.performance ?? 75 });
    risks.push(risk.theatricalDemandMultiplier);
    const raw = calculateWeeklyBoxOffice(week, budget, stats, weekly.at(-1) || 0, week === 1 ? (opt.buzz ?? 80) : undefined,
      project.budgetTier, project.genre, project.format, demand, opt.reputation ?? 0);
    const riskAdjusted = Math.floor(raw * (opt.riskBypass ? 1 : risk.theatricalDemandMultiplier));
    const dynamic = calculateDynamicBoxOfficeTotalCap({ budgetTier: project.budgetTier, genre: project.genre,
      format: project.format, hiddenStats: stats, marketDemand: demand, studioGenreReputation: opt.reputation ?? 0, capRoll: stats.boxOfficeCapRoll });
    const thin = ['ACTION','SCI_FI','SUPERHERO','ADVENTURE'].includes(project.genre)
      && ['HIGH','BLOCKBUSTER'].includes(project.budgetTier) && (stats.castDepthScore ?? 70) < 55;
    cap = thin ? Math.floor(dynamic.totalCap * (0.54 + ((stats.castDepthScore ?? 45) / 180))) : dynamic.totalCap;
    const room = Math.max(0, cap - total);
    const dist = calculateTheatricalDistributionBreakdown(project, Math.min(riskAdjusted, room), week);
    const gross = Math.min(dist.gross, room);
    const final = gross === dist.gross ? dist : calculateTheatricalDistributionBreakdown(project, gross, week);
    total += gross; receipts += final.studioReceipts; exhibitors += final.exhibitorReceipts; weekly.push(gross);
    assert.equal(final.gross, final.studioReceipts + final.exhibitorReceipts);
    const ext = evaluateTheatricalExtension({ weekNum: week, baseTheatricalWeeks: baseWeeks, maxTheatricalWeeks: maxWeeks,
      extensionWeeks: extensions, extensionHistory: history, weeklyGross: weekly, budget, imdbRating: opt.rating ?? 7.5,
      marketDemand: demand, remainingBoxOfficeHeadroom: Math.max(0, cap - total) });
    if (ext.decision) history.push(ext.decision);
    const pull = (week >= 3 && gross < budget * 0.05) || (week >= maxWeeks && !ext.shouldExtend);
    maxWeeks = ext.newMaxTheatricalWeeks; extensions = ext.totalExtensionWeeks;
    if (pull) break;
  }
  return { budget, tier: project.budgetTier, gross: total, receipts, exhibitors, netBeforeMarketing: receipts - budget,
    grossMultiple: total / budget, receiptsMultiple: receipts / budget,
    outcome: calculateRunOutcome(total, budget, opt.rating ?? 7.5).tier,
    weeks: weekly.length, weekly, risks, cap, capFraction: total / cap };
};
const percentile = (values: number[], fraction: number) => [...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*fraction)];
const summarize = (runs: ReturnType<typeof run>[]) => ({ n: runs.length,
  medianGross: percentile(runs.map(r=>r.gross),.5), p10Gross: percentile(runs.map(r=>r.gross),.1), p90Gross: percentile(runs.map(r=>r.gross),.9),
  medianGrossMultiple: percentile(runs.map(r=>r.grossMultiple),.5), medianReceiptsMultiple: percentile(runs.map(r=>r.receiptsMultiple),.5),
  medianWeeks: percentile(runs.map(r=>r.weeks),.5), grossFailurePct: runs.filter(r=>['FAILURE','MAJOR_FAILURE'].includes(r.outcome)).length/runs.length*100,
  receiptsBelowBudgetPct: runs.filter(r=>r.receipts<r.budget).length/runs.length*100,
  over3BPct: runs.filter(r=>r.gross>3e9).length/runs.length*100,
  atLeast99PctCap: runs.filter(r=>r.capFraction>=.99).length/runs.length*100,
});
const output: any = { scope: 'Current local source; prepared fixtures, not production telemetry or career frequencies. Rating held fixed as an input; no IMDb audit.', seed: 20261022, samplesPerScenario: 500 };
try {
  Math.random = rng(20261022);
  output.capExamples = ['LOW','MID','HIGH','BLOCKBUSTER'].map(tier => ({ tier,
    ordinary: calculateDynamicBoxOfficeTotalCap({ budgetTier: tier as BudgetTier, genre: 'ACTION', hiddenStats: makeProject().hiddenStats }),
    exceptional: calculateDynamicBoxOfficeTotalCap({ budgetTier: tier as BudgetTier, genre: 'SUPERHERO', hiddenStats: {...makeProject().hiddenStats,
      scriptQuality: 96, directorQuality: 94, castingStrength: 95, distributionPower: 96, qualityScore: 95, rawHype: 97, fameMultiplier: 1.5},
      marketDemand: 1.15, studioGenreReputation: 80, capRoll: .98 }),
  }));
  output.budgetMismatch = ['HIGH','BLOCKBUSTER'].map(tier => fixed(()=>run(makeProject(210e6,tier as BudgetTier))));
  output.budgetBoundaries = [12e6,12e6+1,45e6,45e6+1,120e6,120e6+1].map(budget=>fixed(()=>run(makeProject(budget,getProductionBudgetTier(budget)))));
  output.budgetRiskIsolation = [120e6,210e6,300e6].map(budget=>({budget,...Object.fromEntries(['HIGH','BLOCKBUSTER'].map(tier=>[tier,
    calculateProductionRiskProfile(makeProject(budget,tier as BudgetTier),{budget,imdbRating:7.5,productionPerformance:75})]))}));
  output.footprint = [
    {name:'North America / one chain',regions:['NORTH_AMERICA'],chains:{NORTH_AMERICA:['NOVA_CIRCUIT']}},
    {name:'Six regions / default chain partners',regions:['NORTH_AMERICA','SOUTH_AMERICA','EUROPE','ASIA','AFRICA','OCEANIA'],chains:undefined},
  ].map(c=>{ const p=makeProject();p.releaseRegionIds=c.regions as any;p.releaseChainSelections=c.chains as any;
    return {name:c.name,...calculateTheatricalDistributionBreakdown(p,100e6,1), run:fixed(()=>run(p))}; });
  output.regionalHold = [1,8].map(week=>calculateTheatricalDistributionBreakdown(makeProject(),100e6,week));
  output.fame = [0,50,100].map(fame=>({fame,multiplier:calculateProjectFameMultiplier([], 'Unknown', fame,80)}));
  const duplicateActor=generateCastList(player,makeProject(),'LEAD').find(c=>c.npcId)!;
  output.fameDuplicateIds = [1,2,4].map(count=>({count,multiplier:calculateProjectFameMultiplier(Array(count).fill(duplicateActor.npcId), 'Unknown',50,80)}));
  output.qualitySaturation = [70,80,90].map(q=>({inputQuality:q,estimated:calculateGreenlightEstimatedQuality({scriptQuality:q,directorQuality:q,castingStrength:q,
    crewQualities:[q,q,q,q],equipmentChoices:{cameras:'OWNED',lighting:'OWNED',sound:'OWNED',practicalEffects:'OWNED'},
    ownedEquipmentLevels:{cameras:10,lighting:10,sound:10,practicalEffects:10},gearTiers:{},locationQualities:[8],storyFitQualityAdjustment:0,
    backgroundAuthenticity:50,backgroundReliability:50,backgroundSetCare:50})}));
  output.fixedControls = Object.fromEntries([
    ['ordinary',makeProject(),{}],
    ['hotMarket',makeProject(),{demand:1.28}],
    ['coldMarket',makeProject(),{demand:.78}],
    ['studioSpecialist',makeProject(),{reputation:100}],
    ['elite',makeProject(90e6,'HIGH',95),{}],
    ['eliteHotSpecialist',makeProject(90e6,'HIGH',95),{demand:1.28,reputation:100}],
    ['weak',makeProject(90e6,'HIGH',40),{}],
    ['zeroCampaign',{...makeProject(),hiddenStats:{...makeProject().hiddenStats,campaignReachMultiplier:.42}},{}],
    ['noRiskAdjustment',makeProject(210e6,'HIGH'),{riskBypass:true}],
  ].map(([name,p,opt])=>[name,fixed(()=>run(p as ProjectDetails,opt as RunOptions))]));
  output.genreControls = ['ACTION','SUPERHERO','DRAMA','HORROR','DOCUMENTARY'].map(genre=>({genre,...fixed(()=>run({...makeProject(),genre:genre as any}))}));
  output.ignoredInputs = ['G','NC-17'].map(targetAudience=>({targetAudience,...fixed(()=>run({...makeProject(),targetAudience:targetAudience as any}))}));
  output.distributions = {};
  for (const [name,setup,opt] of [
    ['acceptedHighOfferSingleCast',()=>{let p=makeProject(getEstimatedBudget('HIGH'),'HIGH');p.hiddenStats=generateHiddenStats('HIGH');
      p=applyOpportunityIdentityToProject({project:p,roleType:'LEAD',projectName:p.title,genre:p.genre} as any,player);
      p.hiddenStats.fameMultiplier=calculateProjectFameMultiplier([],p.directorName,50,75);
      p.hiddenStats.castDepthScore=calculateCastDepthScore(p.castList!.length,p.genre,p.budgetTier,p.hiddenStats.castingStrength).score;return p;},{liveTrends:true}],
    ['highOfferWithGeneratedEnsemble',()=>{const p=makeProject(getEstimatedBudget('HIGH'),'HIGH');p.hiddenStats=generateHiddenStats('HIGH');
      p.castList=generateCastList(player,p,'LEAD');p.hiddenStats.fameMultiplier=calculateProjectFameMultiplier(p.castList.map(c=>c.npcId).filter(Boolean) as string[],p.directorName,50,75);
      p.hiddenStats.castDepthScore=calculateCastDepthScore(p.castList.length,p.genre,p.budgetTier,p.hiddenStats.castingStrength).score;return p;},{liveTrends:true}],
    ['ensembleOfferReclassified',()=>{const p=makeProject(getEstimatedBudget('HIGH'),'BLOCKBUSTER');p.hiddenStats=generateHiddenStats('HIGH');
      const cast=generateCastList(player,{...p,budgetTier:'HIGH'},'LEAD');p.hiddenStats.fameMultiplier=calculateProjectFameMultiplier(cast.map(c=>c.npcId).filter(Boolean) as string[],p.directorName,50,75);
      p.hiddenStats.castDepthScore=calculateCastDepthScore(cast.length,p.genre,'HIGH',p.hiddenStats.castingStrength).score;return p;},{liveTrends:true}],
    ['ownWeak90M',()=>makeProject(90e6,'HIGH',40),{liveTrends:true}],
    ['ownOrdinary90M',()=>makeProject(),{liveTrends:true}],
    ['ownElite90M',()=>makeProject(90e6,'HIGH',95),{liveTrends:true}],
    ['ownElite90M_Specialist',()=>makeProject(90e6,'HIGH',95),{liveTrends:true,reputation:100}],
    ['ownElite180M_Specialist',()=>makeProject(180e6,'BLOCKBUSTER',95),{liveTrends:true,reputation:100}],
  ] as const) {
    const runs=[];for(let i=0;i<500;i++){Math.random=rng(20261022+i);const p=setup();p.hiddenStats.boxOfficeCapRoll=Math.random();runs.push(run(p,opt));}
    output.distributions[name]=summarize(runs);
  }
  output.universeOffer = fixed(()=>{const offer=generateRandomUniverseOpportunity(player,'AGENT');assert(offer);return {
    tier:offer.project.budgetTier,budget:offer.project.estimatedBudget,isFamous:offer.project.isFamous,visibleHype:offer.project.visibleHype,
    hidden:offer.project.hiddenStats,studioId:offer.project.studioId,genre:offer.project.genre,universe:offer.project.universeId};});
  output.lossYetHit = { gross:230e6,production:100e6,marketing:30e6,studioReceipts:115e6,
    net:115e6-100e6-30e6,calculatedOutcome:calculateRunOutcome(230e6,100e6,7.5),dashboardBadge:'Hit (>2x gross)',boxOfficeReceiptsMultiple:1.15 };
  // Real weekly loop: no simulation adapter. Inspect actual persisted receipts and transitions.
  let live: Player = structuredClone(INITIAL_PLAYER);
  live.name='Box office audit';live.age=30;live.currentWeek=20;live.money=1e9;live.commitments=[];live.news=[];live.inbox=[];live.logs=[];
  live.pendingEvents=[];live.scheduledEvents=[];
  const studio=createBusiness('Box Office Audit Studio','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);
  studio.balance=1e9;live.businesses=[studio];
  const configs=[{id:'owned_high',owned:true,tier:'HIGH',quality:75,budget:210e6},{id:'owned_blockbuster',owned:true,tier:'BLOCKBUSTER',quality:75,budget:210e6},
    {id:'offered_high',owned:false,tier:'HIGH',quality:75,budget:210e6},{id:'owned_weak',owned:true,tier:'HIGH',quality:40,budget:210e6},
    {id:'owned_elite_high',owned:true,tier:'HIGH',quality:95,budget:90e6},{id:'owned_elite_blockbuster',owned:true,tier:'BLOCKBUSTER',quality:95,budget:180e6}] as const;
  live.activeReleases=configs.map(c=>{const project=makeProject(c.budget,c.tier,c.quality);project.studioId=(c.owned?studio.id:'UNIVERSAL') as any;return {
    id:c.id,name:c.id,type:'MOVIE',roleType:'LEAD',projectDetails:project,weekNum:1,weeklyGross:[],totalGross:0,budget:c.budget,
    status:'RUNNING',imdbRating:7.5,productionPerformance:75,distributionPhase:'THEATRICAL',promotionalBuzz:80,maxTheatricalWeeks:14,
    baseTheatricalWeeks:14,sequelDecisionMade:true,releaseWeek:21,releaseYear:30} as ActiveRelease;});
  const theatricalResults=new Map();let ticks=0;
  Math.random=rng(565656);
  while(ticks<22 && theatricalResults.size<configs.length){
    live=(await processGameWeek(live)).player;ticks++;
    for(const c of configs){const rel=live.activeReleases.find(r=>r.id===c.id);
      if(rel && rel.distributionPhase!=='THEATRICAL' && !theatricalResults.has(c.id)) {
        assert.equal(rel.totalGross,rel.weeklyGross.reduce((a,b)=>a+b,0));
        theatricalResults.set(c.id,{id:c.id,phase:rel.distributionPhase,gross:rel.totalGross,receipts:rel.totalStudioReceipts,
          exhibitors:rel.totalExhibitorReceipts,
          accountingDifference:(rel.totalStudioReceipts||0)+(rel.totalExhibitorReceipts||0)-rel.totalGross,
          weeklyAccountingDifferences:rel.weeklyGross.map((gross,i)=>(rel.weeklyStudioReceipts?.[i]||0)+(rel.weeklyExhibitorReceipts?.[i]||0)-gross),
          weekly:rel.weeklyGross,cap:rel.projectDetails.hiddenStats.boxOfficeTotalCap,bids:rel.bids?.map(b=>({platform:b.platformId,upfront:b.upfront})),
          risk:calculateProductionRiskProfile(rel.projectDetails,{budget:rel.budget,imdbRating:rel.imdbRating,productionPerformance:rel.productionPerformance}),
          outcome:calculateRunOutcome(rel.totalGross,rel.budget,rel.imdbRating||7.5).tier});
      }
    }
  }
  assert.equal(theatricalResults.size,configs.length);
  output.realGameLoop={ticks,results:[...theatricalResults.values()],
    accountingMismatches:[...theatricalResults.values()].filter(r=>r.accountingDifference!==0)};
  // Exercise the real accepted-opportunity identity helper followed by release
  // initialization, not a pre-prepared active-release cast assumption.
  let handoff: Player=structuredClone(INITIAL_PLAYER);
  handoff.name='Accepted offer audit';handoff.age=30;handoff.currentWeek=20;handoff.money=1e9;
  handoff.stats.fame=50;Object.keys(handoff.stats.skills).forEach(k=>(handoff.stats.skills as any)[k]=75);
  handoff.commitments=[];handoff.activeReleases=[];handoff.news=[];handoff.inbox=[];handoff.businesses=[];
  const opportunity=fixed(()=>generateRandomUniverseOpportunity(handoff,'AGENT'))!;
  const accepted=applyOpportunityIdentityToProject(opportunity,handoff);
  const ensemble=structuredClone(accepted);ensemble.castList=fixed(()=>generateCastList(handoff,ensemble,opportunity.roleType));
  handoff.commitments=[['accepted_single_cast',accepted],['counterfactual_full_cast',ensemble]].map(([id,details])=>({
    id,name:id,type:'ACTING_GIG',roleType:opportunity.roleType,energyCost:0,income:0,payoutType:'LUMPSUM',
    projectDetails:details,projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:0,totalPhaseDuration:0,productionPerformance:75,promotionalBuzz:100,
  } as any));
  const handoffResults=new Map();const initialized=new Map();let handoffTicks=0;
  Math.random=rng(737373);
  while(handoffTicks<22 && handoffResults.size<2){handoff=(await processGameWeek(handoff)).player;handoffTicks++;
    for(const id of ['accepted_single_cast','counterfactual_full_cast']){const rel=handoff.activeReleases.find(r=>r.id===id);if(!rel)continue;
      if(!initialized.has(id))initialized.set(id,{castCount:rel.projectDetails.castList?.length,depth:rel.projectDetails.hiddenStats.castDepthScore,
        fame:rel.projectDetails.hiddenStats.fameMultiplier,budget:rel.budget,tier:rel.projectDetails.budgetTier});
      if(rel.distributionPhase!=='THEATRICAL'&&!handoffResults.has(id))handoffResults.set(id,{id,...initialized.get(id),gross:rel.totalGross,
        receipts:rel.totalStudioReceipts,weekly:rel.weeklyGross,outcome:calculateRunOutcome(rel.totalGross,rel.budget,rel.imdbRating||7.5).tier});
    }
  }
  assert.equal(handoffResults.size,2);
  assert.equal(initialized.get('accepted_single_cast').castCount,1);
  assert(initialized.get('accepted_single_cast').depth<55);
  output.acceptedOfferRealHandoff={ticks:handoffTicks,results:[...handoffResults.values()]};
  fs.writeFileSync('docs/reports/2026-10-22-box-office-analysis/results.json',JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({capExamples:output.capExamples,budgetMismatch:output.budgetMismatch.map(({weekly,risks,...rest}:any)=>rest),
    fixedControls:Object.fromEntries(Object.entries(output.fixedControls).map(([k,v]:any)=>[k,{gross:v.gross,receipts:v.receipts,weeks:v.weeks,week2Hold:v.weekly[1]/v.weekly[0]}])),
    distributions:output.distributions,footprint:output.footprint.map((r:any)=>({name:r.name,gross:r.gross,screens:r.totalScreens,modifier:r.distributionModifier})),
    universeOffer:output.universeOffer,qualitySaturation:output.qualitySaturation,realGameLoop:output.realGameLoop},null,2));
} finally { Math.random=originalRandom; }
