import { NPC_DATABASE } from '../services/npcLogic';
import assert from 'node:assert/strict';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { processGameWeek } from '../services/gameLoop';
const f=makeCinemaFixture(612);f.player.stats.fame=0;f.player.activeReleases=[];f.player.commitments=[];f.player.pendingEvents=[];f.player.scheduledEvents=[];f.player.world.projects=[];
// Isolate organic recognition: no producing-studio treasury can fund this launch.
if(f.player.world.studios?.[f.project.studioId])f.player.world.studios[f.project.studioId].cashReserve=0;
f.project.castList=[{id:'PLAYER_SELF',actorId:'PLAYER_SELF',name:f.player.name,type:'ACTOR',role:'Cameo',roleType:'CAMEO',isPlayer:true,image:''},{id:'star',actorId:NPC_DATABASE.find(n=>n.stats.fame>=80)!.id,name:'Established co-star',type:'ACTOR',role:'Lead',roleType:'LEAD',isPlayer:false,image:'',fame:90} as any];
f.player.commitments=[{id:'regular-offer',name:'Normal offered film',type:'ACTING_GIG',roleType:'CAMEO',energyCost:0,income:0,lumpSum:1000,payoutType:'LUMPSUM',projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:1,totalPhaseDuration:1,productionPerformance:70,projectDetails:f.project}];
const before=structuredClone(f.player),one=await processGameWeek(f.player);assert.deepEqual(f.player,before);const release=one.player.activeReleases.find(t=>t.id==='regular-offer')!;assert.ok(release,'Actual post-production should release the offered movie');
assert.equal(release.projectDetails.cinemaExposure?.events.filter(e=>e.kind==='ANNOUNCEMENT').length,1,'Real offered cinema premiere must announce its credited package once');
assert.equal(release.projectDetails.cinemaExposure?.events.filter(e=>e.kind==='PAID_CAMPAIGN').length,0,'An announcement must not invent paid studio marketing');
const two=await processGameWeek(JSON.parse(JSON.stringify(one.player)));const current=two.player.activeReleases.find(t=>t.id==='regular-offer')!;assert.equal(current.projectDetails.cinemaExposure?.events.filter(e=>e.kind==='ANNOUNCEMENT').length,1);
assert.ok(two.player.world.cinemaMarket!.titles['regular-offer'].firstAdmissions>0,'Credited co-star recognition should reach an actual paid audience');console.log('PASS actual offered premiere announces credited package once without free paid marketing');
