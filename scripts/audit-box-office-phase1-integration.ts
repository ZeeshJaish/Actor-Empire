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
