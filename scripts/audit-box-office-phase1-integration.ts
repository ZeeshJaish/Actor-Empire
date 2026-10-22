import assert from 'node:assert/strict';
import type { Commitment } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { NPC_DATABASE, isCastableActor, calculateProjectFameMultiplier } from '../services/npcLogic';
import { getActorTalent } from '../services/roleLogic';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
const f = makeCinemaFixture(41);
const actor = NPC_DATABASE.find(n => isCastableActor(n) && (n.stats?.fame ?? 0) > 30)!;
f.player.stats.fame = 0;
f.player.money = 1e9; f.player.commitments=[]; f.player.activeReleases=[];
f.player.pendingEvents=[]; f.player.scheduledEvents=[];
f.project.castList=[{id:'lead',actorId:actor.id,name:actor.name,role:'Lead',roleType:'LEAD',type:'ACTOR',isPlayer:false,image:''},
 {id:'self',actorId:'PLAYER_SELF',name:f.player.name,role:'Supporting',roleType:'SUPPORTING',type:'ACTOR',isPlayer:true,image:''}];
f.player.commitments.push({id:'phase1-cast-handoff',name:f.project.title,type:'ACTING_GIG',roleType:'SUPPORTING',energyCost:0,income:0,
 payoutType:'LUMPSUM',lumpSum:0,projectDetails:f.project,projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:0,totalPhaseDuration:0,
 productionPerformance:75,auditionPerformance:75} as Commitment);
const source=JSON.stringify(f.player);
const result=await processGameWeek(f.player);
const released=result.player.activeReleases.find(r=>r.projectDetails.title===f.project.title);
assert.ok(released,'Actual game-week handoff must release the fixture');
assert.equal(released.projectDetails.hiddenStats.fameMultiplier,
 calculateProjectFameMultiplier([actor.id,'PLAYER_SELF'], f.project.directorName, f.player.stats.fame, getActorTalent(f.player.stats.skills)),
 'Release must read authored actorId credits as well as legacy npcId credits');
assert.equal(JSON.stringify(f.player),source,'Actual week leaves the input save unchanged');
console.log('PASS actual release reads both cast ID formats and preserves source save');

// The cap is deliberately almost reached so this exercises the formerly broken
// final-gross branch in processGameWeek, not a copied formula-only calculation.
const { calculateDynamicBoxOfficeTotalCap } = await import('../services/roleLogic');
const { getProjectMarketDemand } = await import('../services/marketTrends');
const { createBusiness } = await import('../services/businessLogic');
const capFixture=makeCinemaFixture(42);
capFixture.player.money=1e9;capFixture.player.commitments=[];capFixture.player.pendingEvents=[];capFixture.player.scheduledEvents=[];
const studio=createBusiness('Cinema ledger fixture','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);
studio.balance=1e9;capFixture.player.businesses=[studio];capFixture.project.studioId=studio.id as typeof capFixture.project.studioId;
capFixture.project.hiddenStats={...capFixture.project.hiddenStats,qualityScore:95,scriptQuality:95,directorQuality:95,castingStrength:95,castDepthScore:95,fameMultiplier:3};
capFixture.project.investorPlan={targetRaise:21e6,totalRaised:21e6,investorEquityPercent:10,studioEquityPercent:90,commitments:[]};
const cap=calculateDynamicBoxOfficeTotalCap({budgetTier:'HIGH',estimatedBudget:capFixture.project.estimatedBudget,genre:'ACTION',hiddenStats:capFixture.project.hiddenStats,
 marketDemand:getProjectMarketDemand(capFixture.project,21,studio.studioState?.marketTrends),capRoll:0.5}).totalCap;
capFixture.player.activeReleases=[{id:'cap-ledger',name:capFixture.project.title,type:'MOVIE',roleType:'LEAD',projectDetails:capFixture.project,
 weekNum:4,weeklyGross:[cap-10001],totalGross:cap-10001,budget:capFixture.project.estimatedBudget,status:'RUNNING',imdbRating:8,
 productionPerformance:95,distributionPhase:'THEATRICAL',baseTheatricalWeeks:20,maxTheatricalWeeks:20,sequelDecisionMade:true,
 releaseWeek:18,releaseYear:30} as typeof capFixture.player.activeReleases[number]];
const tick=await processGameWeek(capFixture.player);
// Load/recovery exercises the persisted JSON payload, including generated event metadata.
tick.player=JSON.parse(JSON.stringify(tick.player));
const capped=tick.player.activeReleases.find(r=>r.id==='cap-ledger')!;
assert.ok(capped,'Owned title remains available for streaming after its theatrical exit');
const gross=capped.weeklyGross.at(-1)!;
assert.ok(gross>0,'Legacy near-cap fixture earns a real new ticket week');
assert.ok(capped.totalGross>cap,'Old lifetime ceiling cannot stop paid audience demand');
const committedCap=tick.player.world.cinemaMarket!.weeks.at(-1)!.titles.find(t=>t.titleId==='cap-ledger')!;
assert.equal(Math.round(capped.weeklyStudioReceipts!.at(-1)!*100)+Math.round(capped.weeklyExhibitorReceipts!.at(-1)!*100)+committedCap.distributionDeductionsCents,Math.round(gross*100),
 'Actual saved receipt shares and explicit distribution deductions conserve every ticket cent');
const projectLedger=tick.player.businesses.find(b=>b.id===studio.id)!.studioState!.financeLedger.filter(row=>row.projectId==='cap-ledger');
const receipts=capped.weeklyStudioReceipts!.at(-1)!;
const soundtrack=capped.weeklySoundtrackRevenue?.at(-1) || 0;
const net=receipts+soundtrack-Math.round(receipts*.1)-Math.round(soundtrack*.1);
assert.equal(Math.round(projectLedger.filter(row=>row.type==='THEATRICAL'||row.type==='SOUNDTRACK'||row.type==='INVESTOR_PAYOUT').reduce((n,row)=>n+row.amount,0)*100),Math.round(net*100),
 'The finance ledger must not subtract an investor split twice');
const { getStudioSaleEarnings } = await import('../services/studioSaleHistory');
const savedStudio=tick.player.businesses.find(b=>b.id===studio.id)!;
const titleOnlyStudio={...savedStudio,history:[],studioState:{...savedStudio.studioState!,saleEarningsHistory:[],financeLedger:projectLedger}};
const saleEarnings=getStudioSaleEarnings(tick.player,titleOnlyStudio);
assert.equal(Math.round(saleEarnings.profit*100),Math.round(net*100)-committedCap.costsCents,'Studio sale earnings include actual booking costs and deduct investors once');
console.log('PASS actual cap-week shares and investor ledger reconciliation');

const directed=makeCinemaFixture(71);
directed.player.stats.fame=0;
for(const key of Object.keys(directed.player.stats.skills)) directed.player.stats.skills[key as keyof typeof directed.player.stats.skills]=100;
directed.player.money=1e9;directed.player.commitments=[];directed.player.activeReleases=[];
directed.player.pendingEvents=[];directed.player.scheduledEvents=[];
directed.project.castPackageSource='AUTHORED';directed.project.directorId='PLAYER_SELF';directed.project.directorName=directed.player.name;
directed.project.castList=[{id:'lead',actorId:actor.id,name:actor.name,role:'Lead',roleType:'LEAD',type:'ACTOR',isPlayer:false,image:''}];
directed.player.commitments=[{id:'director-only-credit',name:directed.project.title,type:'ACTING_GIG',roleType:'MINOR',income:0,energyCost:0,
 payoutType:'LUMPSUM',lumpSum:0,projectDetails:directed.project,projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:0,totalPhaseDuration:0,
 productionPerformance:75,auditionPerformance:75} as Commitment];
const directedResult=await processGameWeek(directed.player);
const directedRelease=directedResult.player.activeReleases.find(r=>r.projectDetails.title===directed.project.title)!;
assert.equal(directedRelease.projectDetails.hiddenStats.fameMultiplier,
 calculateProjectFameMultiplier([actor.id,'PLAYER_SELF'],directed.player.name,0),
 'A self-directing producer without an acting credit cannot add acting talent to audience recognition');
console.log('PASS actual self-director credit does not invent a player acting performance');

const custom=makeCinemaFixture(72);
custom.player.stats.fame=0;custom.player.money=1e9;custom.player.activeReleases=[];custom.player.pendingEvents=[];custom.player.scheduledEvents=[];
custom.player.flags.extraNPCs=[{...actor,id:'custom-cinema-star',name:'Custom Cinema Star',stats:{...actor.stats,fame:80}}];
custom.project.castPackageSource='AUTHORED';
custom.project.castList=[{id:'lead',actorId:'custom-cinema-star',name:'Custom Cinema Star',role:'Lead',roleType:'LEAD',type:'ACTOR',isPlayer:false,image:''}];
custom.player.commitments=[{id:'custom-actor-release',name:custom.project.title,type:'ACTING_GIG',roleType:'MINOR',income:0,energyCost:0,payoutType:'LUMPSUM',lumpSum:0,
 projectDetails:custom.project,projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:0,totalPhaseDuration:0,productionPerformance:75,auditionPerformance:75} as Commitment];
const customResult=await processGameWeek(custom.player);
assert.equal(customResult.player.activeReleases.find(r=>r.projectDetails.title===custom.project.title)!.projectDetails.hiddenStats.fameMultiplier,2.6,
 'Actual handoff must retain canonical custom actor fame');
console.log('PASS actual custom actor fame survives release normalization');

const { prepareGreenlightFunding }=await import('../views/lifestyle/business/greenlightProjectBuilder');
const { getCinemaProjectFinance }=await import('../services/boxOffice/boxOfficeSettlement');
const fundedFixture=makeCinemaFixture(81);
const commitment={id:'reserve-roi',name:'Reserve ROI',projectDetails:{...fundedFixture.project,estimatedBudget:100e6,
 reservedMarketingBudget:30e6,marketingBudgetSpent:30e6}} as Commitment;
const prepared=prepareGreenlightFunding({player:fundedFixture.player,studio,studioCashRequirement:130e6,
 newCommitment:commitment,finalInvestorRaised:0,greenlightPackageBudget:130e6,isCreatingNewUniverse:false,
 normalizedWorldUniverses:{},newUniverseName:'',randomUniverseColor:'#000000'});
assert.equal(prepared.fundedCommitment.projectDetails!.hiddenStats.studioCashAtRisk,130e6);
const fundedSource={budget:100e6,totalStudioReceipts:190e6,projectDetails:prepared.fundedCommitment.projectDetails};
assert.equal(getCinemaProjectFinance(fundedSource).studioReturnPercent,60/130*100,
 'Actual Greenlight reserve funding cannot be charged as marketing a second time');
assert.equal(getCinemaProjectFinance({...fundedSource,projectDetails:{...fundedSource.projectDetails!,
 marketingBudgetSpent:10e6,returnedMarketingBudget:20e6}}).studioReturnPercent,80/110*100,
 'The actual unused reserve refund must reduce paid studio exposure');
console.log('PASS actual Greenlight funding and returned reserve reconcile studio ROI');
const financed=prepareGreenlightFunding({player:fundedFixture.player,
 studio:{...studio,studioState:{...studio.studioState!,productionFund:50e6}},studioCashRequirement:110e6,
 newCommitment:commitment,finalInvestorRaised:20e6,greenlightPackageBudget:130e6,isCreatingNewUniverse:false,
 normalizedWorldUniverses:{},newUniverseName:'',randomUniverseColor:'#000000'});
assert.equal(financed.fundedCommitment.projectDetails!.hiddenStats.studioCashAtRisk,60e6);
assert.equal(getCinemaProjectFinance({budget:100e6,totalStudioReceipts:190e6,projectDetails:{...financed.fundedCommitment.projectDetails!,
 marketingBudgetSpent:10e6,returnedMarketingBudget:20e6}}).studioReturnPercent,150/40*100);
console.log('PASS actual investor and production-fund package financing is charged once after reserve refund');

const { migratePlayerSave }=await import('../services/saveMigration');
const legacyFixture=makeCinemaFixture(82);
legacyFixture.player.pastProjects=[{id:'legacy-receipts',title:'Legacy',type:'MOVIE',budget:100e6,gross:230e6,earnings:2e6} as never,
 {id:'zero-receipts',title:'Recorded zero',type:'MOVIE',budget:100e6,gross:230e6,totalStudioReceipts:0} as never];
const migrated=migratePlayerSave(legacyFixture.player);
const legacyFinance=getCinemaProjectFinance(migrated.pastProjects.find(p=>p.id==='legacy-receipts')!);
assert.equal(legacyFinance.producerReceiptsCents,115e8);assert.equal(legacyFinance.receiptsEstimated,true);
assert.equal(getCinemaProjectFinance(migrated.pastProjects.find(p=>p.id==='zero-receipts')!).producerReceiptsCents,0);
assert.deepEqual(getCinemaProjectFinance(migratePlayerSave(migrated).pastProjects.find(p=>p.id==='legacy-receipts')!),legacyFinance);
console.log('PASS actual save migration preserves missing receipts, explicit zero and repeat-load provenance');

assert.equal(capped.unrecordedTheatricalGross,cap-10001);
const legacyActiveFinance=getCinemaProjectFinance(capped);
assert.equal(legacyActiveFinance.theatricalProducerReceiptsCents,
 (receipts+Math.floor((cap-10001)*.5))*100,'Only the unrecorded older gross is estimated after a new real receipt week');
const ending=migratePlayerSave(tick.player);
const endingRelease=ending.activeReleases.find(r=>r.id==='cap-ledger')!;
endingRelease.distributionPhase='STREAMING';
endingRelease.streaming={platformId:'NETFLIX',weekOnPlatform:52,totalViews:100,weeklyViews:[100],isLeaving:true};
endingRelease.streamingRuns=[];
const archivedTick=await processGameWeek(ending);
const streamingMusicRows=archivedTick.player.businesses.find(b=>b.id===studio.id)!.studioState!.financeLedger
 .filter(row=>row.projectId==='cap-ledger' && row.id.includes('_soundtrack_') && row.week===archivedTick.player.currentWeek-1);
const streamingMusicReceipt=streamingMusicRows.find(row=>row.type==='SOUNDTRACK');
assert.ok(streamingMusicReceipt && streamingMusicReceipt.amount>0,'Actual stream fixture must generate soundtrack receipts');
const archivedMusic=archivedTick.player.pastProjects.find(p=>p.id==='cap-ledger')!.weeklySoundtrackRevenue!.at(-1)!;
assert.equal(streamingMusicReceipt.amount,archivedMusic,'Streaming ledger must record gross music receipts before its separate investor payout');
const archived=archivedTick.player.pastProjects.find(p=>p.id==='cap-ledger')!;
assert.ok(archived,'Actual streaming completion must create the archive snapshot');
assert.equal(archived.unrecordedTheatricalGross,capped.unrecordedTheatricalGross);
assert.equal(getCinemaProjectFinance(archived).theatricalProducerReceiptsCents,legacyActiveFinance.theatricalProducerReceiptsCents);
assert.equal(getCinemaProjectFinance(archived).receiptsEstimated,true);
console.log('PASS legacy active receipts retain their provenance through a real new week, reload and completed archive');

const musicPlayer=structuredClone(tick.player);
const musicRelease=musicPlayer.activeReleases.find(r=>r.id==='cap-ledger')!;
musicRelease.distributionPhase='STREAMING';musicRelease.studioRoyaltyPercentage=20;
musicRelease.streaming={platformId:'NETFLIX',weekOnPlatform:1,totalViews:100e6,weeklyViews:[100e6],isLeaving:false};
musicRelease.streamingRuns=[];
const musicTick=await processGameWeek(musicPlayer);
const musicStudio=musicTick.player.businesses.find(b=>b.id===studio.id)!;
const musicRows=musicStudio.studioState!.financeLedger.filter(row=>row.projectId==='cap-ledger' && row.week===musicPlayer.currentWeek);
assert.ok(musicRows.some(row=>row.type==='STREAMING_ROYALTY'&&row.amount>0),'Fixture must collect actual streaming royalty cash');
assert.ok(musicRows.some(row=>row.type==='SOUNDTRACK'&&row.amount>0),'Fixture must collect music in the same week');
const musicReceiptRows=musicRows.filter(row=>['STREAMING_ROYALTY','SOUNDTRACK','INVESTOR_PAYOUT'].includes(row.type));
const expectedMusicNet=musicReceiptRows.reduce((n,row)=>n+row.amount,0);
const musicSale=getStudioSaleEarnings(musicTick.player,{...musicStudio,history:[],studioState:{...musicStudio.studioState!,
 saleEarningsHistory:[],financeLedger:musicReceiptRows}});
assert.equal(musicSale.profit,expectedMusicNet,'Mixed streaming/music ledger labels cannot disguise real investor deductions');
console.log('PASS actual mixed streaming royalty and soundtrack receipts reconcile investor deductions in studio-sale earnings');
