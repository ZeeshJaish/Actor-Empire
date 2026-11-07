/** Developer cheat "Full streaming company · test everything": a fresh career becomes a
 * launched company with real catalogue, Originals, offer, leadership, investors and
 * sixteen processed live weeks. Refuses saves that already have their own platform,
 * publishes only completed steps, and resumes after an interrupted run. ~2 minutes. */
import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type Player} from '../types';
import {migratePlayerSave} from '../services/saveMigration';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {normalizeStreamingRightsCalendarState} from '../services/streamingRightsCalendar';
import {buildStreamingFullPlatformQa,getStreamingFullPlatformQaState,STREAMING_FULL_PLATFORM_QA_LIVE_WEEKS,STREAMING_FULL_PLATFORM_QA_MARKER} from '../services/streamingFullPlatformQa';

// A new career as the game creates it: 100 weekly energy, an empty bonus bank (the
// first browser run failed on exactly this when filings left nothing for signing).
const fresh=(id:string):Player=>{
 const player=migratePlayerSave({...structuredClone(INITIAL_PLAYER),id,name:'Full QA Audit',age:15,currentWeek:1});
 return {...player,energy:{current:100,max:100},flags:{...player.flags,weeklyBaseEnergyRemaining:100,bonusEnergyBank:0}};
};
const week=(player:Player)=>getAbsoluteWeek(player.age,player.currentWeek);

async function main() {
 // Refusals: a live platform that this action did not build is never touched.
 const source=fresh('full-qa-refusal');
 const foreign={...source,ownedStreamingPlatform:{...source.ownedStreamingPlatform,launchCommit:{committedAtAbsoluteWeek:week(source)} as Player['ownedStreamingPlatform']['launchCommit']}};
 const before=JSON.stringify(foreign);
 assert.equal(getStreamingFullPlatformQaState(foreign).stage,'BLOCKED');
 await assert.rejects(buildStreamingFullPlatformQa(foreign,{processWeek:processGameWeek,persistWeek:async p=>p}),/already live/);
 assert.equal(JSON.stringify(foreign),before,'A refused save stays byte-identical');
 console.log('PASS refuses a platform it did not build');

 // Interruption: a failed save stops the run; the last published step resumes it.
 let published:Player|null=null;
 let saves=0;
 await assert.rejects(buildStreamingFullPlatformQa(fresh('full-qa-resume'),{processWeek:processGameWeek,persistWeek:async p=>{
  if(++saves===3) throw Error('save unavailable');
  published=JSON.parse(JSON.stringify(p));return published!;
 }}),/save unavailable/);
 assert.ok(published,'Preparation and the first build week were published');
 assert.equal(getStreamingFullPlatformQaState(published!).stage,'BUILD');
 console.log('PASS stops at a failed save and keeps the last published week');

 // The full run, resumed from that week, through every stage.
 let last=week(published!);
 const started=performance.now();
 const player=await buildStreamingFullPlatformQa(published!,{processWeek:processGameWeek,persistWeek:async p=>{
  const next=week(p);
  assert.ok(next===last||next===last+1,'Every publish is the same week (launch) or exactly the next one');
  last=next;
  return JSON.parse(JSON.stringify(p));
 }});
 const seconds=Math.round((performance.now()-started)/1000);
 const platform=player.ownedStreamingPlatform;
 const state=getStreamingFullPlatformQaState(player);
 assert.equal(state.stage,'DONE');
 assert.ok(platform.milestoneKeys.includes(STREAMING_FULL_PLATFORM_QA_MARKER));
 assert.ok(platform.launchCommit&&platform.lifecycle==='ACTIVE');
 assert.equal(platform.weeklyHistory.length,STREAMING_FULL_PLATFORM_QA_LIVE_WEEKS,'One snapshot per live week');
 assert.ok(platform.marketOperations.filter(row=>row.status==='ACTIVE').length>=20,'A multi-region footprint');
 assert.ok(platform.catalogProjectIds.length>=50,`A real catalogue (${platform.catalogProjectIds.length} titles)`);
 assert.equal(platform.originalCommissions.length,6);
 assert.ok(platform.catalogLicenses.some(row=>row.windowType==='PERMANENT'),'Kept-for-good licences');
 assert.ok(platform.catalogLicenses.some(row=>row.status==='ACTIVE'&&row.windowType!=='PERMANENT'&&row.expiresAtAbsoluteWeek-week(player)<=8),'Licences near their end');
 const cases=Object.values(normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar).renewalCases).filter(row=>row.incumbentBuyer.type==='PLAYER_PLATFORM');
 assert.ok(cases.length>0,'Renewal cases opened on the rights calendar');
 const ops=platform.weeklyHistory.at(-1)!.operations;
 assert.ok(ops.subscriptionRevenue>0&&(ops.worldViewingAdvertisingRevenue||0)>0&&(ops.worldViewingTransactionRevenue||0)>0,'Subscriptions, advertising and store all earn');
 const roles=new Set(platform.leadership.appointments.map(row=>row.role));
 assert.ok(roles.has('CFO')&&roles.size>=6,'A leadership team with a CFO');
 assert.ok(platform.finance.equityHolders.length>=2&&platform.founderOwnershipPercent>=51,'Outside investors, founder keeps control');
 assert.ok(platform.finance.capitalActions.some(row=>row.type==='FOUNDER_CONTRIBUTION'),'Founder capital through the real service');
 // Localization by region in the Content Desk (#23, #24): three regions set up, levels
 // reached along the run, two levels part-filled with energy.
 assert.equal(platform.capabilities.installed.filter(row=>row.capabilityId.startsWith('LANGUAGE_PACKAGE:')).length,3,'Three language regions set up');
 const regions=new Map((platform.localizationOperations.regions||[]).map(row=>[row.packageId,row]));
 assert.equal(regions.get('WESTERN_EUROPE_CORE')?.subtitleLevel,2,'Europe & English subtitles 2');
 assert.equal(regions.get('WESTERN_EUROPE_CORE')?.dubbingLevel,1,'Europe & English dubbing 1');
 assert.equal(regions.get('LATIN_AMERICA_CORE')?.subtitleLevel,2,'Latin America subtitles 2');
 assert.equal(regions.get('LATIN_AMERICA_CORE')?.dubbingProgress,10,'Latin America dubbing 1 at 10 of 20');
 assert.equal(regions.get('INDIA_CORE')?.subtitleProgress,5,'India subtitles 1 at 5 of 10');
 assert.ok((player.world.worldStreamingViewing?.snapshots.at(-1)?.localization?.localizedViewingAccounts||0)>0,'Viewers watched in their own language');
 // #86: Content operations, the last line the campus still built, is no longer needed, so the campus starts no new
 // step and the full company has no engineering project to finish; it builds in the tech tree
 assert.ok(!platform.technologyProjects.some(row=>row.branch==='CONTENT_OPERATIONS'),'No Content operations build: nothing needs it (#86)');
 assert.ok(Object.values(platform.techTree?.techs||{}).filter(row=>(row?.version||0)>=1).length>=20,'The company builds in the tech tree');
 assert.ok(platform.growthActions.length>=3,'Campaigns ran');
 assert.ok(platform.cycleReviews.some(row=>row.kind==='TWELVE_WEEK_REVIEW'),'The twelve-week review exists');
 assert.ok(JSON.stringify(player).length<45_000_000,'The save stays within reach of a phone');
 console.log(JSON.stringify({result:'PASS full company',seconds,saveMb:+(JSON.stringify(player).length/1e6).toFixed(1),titles:platform.catalogProjectIds.length,
  markets:platform.marketOperations.filter(row=>row.status==='ACTIVE').length,subscribers:platform.weeklyHistory.at(-1)!.subscribers,
  weeklyRevenue:Math.round(ops.subscriptionRevenue+ops.worldViewingIncrementalRevenue),treasury:Math.round(platform.treasuryCash),renewalCases:cases.length}));

 // Pressing it again on a finished company changes nothing.
 let reruns=0;
 const again=await buildStreamingFullPlatformQa(player,{processWeek:async p=>{reruns++;return processGameWeek(p);},persistWeek:async p=>p});
 assert.equal(reruns,0);
 assert.equal(again,player);
 console.log('PASS a finished company is left alone');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
