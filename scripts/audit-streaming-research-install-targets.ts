/** Research installs that the platform finishes on its own (localization capabilities and
 * fibre generations) must keep their install target through normalisation, and a
 * programme whose target an older load rewrote to TECHNOLOGY_PROJECT must recover it
 * and finish. Before #7/#8 Localization Foundation stayed "Installing" forever. */
import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type OwnedStreamingResearchProgram} from '../types';
import {normalizeOwnedStreamingPlatformState} from '../services/ownedStreamingPlatform';
import {STREAMING_RESEARCH_DEFINITIONS,advanceDueStreamingResearchPrograms} from '../services/streamingResearchLifecycle';

const WEEK=1_200;
const program=(definitionId:string,installationTargetType:string,stage='INSTALLING'):OwnedStreamingResearchProgram=>({
 id:`audit-${definitionId}`,idempotencyKey:`audit-${definitionId}`,definitionId,stage,buildMode:'BALANCED',ipStrategy:'LICENSE',
 researchCost:1,patentCost:1,installationCost:1,weeklyOperatingCost:1,licenseWeeklyCost:1,staffRequired:1,
 researchWeeks:1,prototypeWeeks:1,testWeeks:1,installationWeeks:2,startedAtAbsoluteWeek:WEEK-10,stageStartedAtAbsoluteWeek:WEEK-3,
 stageReadyAtAbsoluteWeek:WEEK-1,installationTargetType,installationTargetId:null,installationTargetLabel:null,rivalInterestPercent:0,completedAtAbsoluteWeek:null,
} as unknown as OwnedStreamingResearchProgram);
const platformWith=(programs:OwnedStreamingResearchProgram[])=>normalizeOwnedStreamingPlatformState({...structuredClone(INITIAL_PLAYER.ownedStreamingPlatform),researchPrograms:programs},'audit-player');

// 1. Every definition keeps its own install target, even when the stored one was damaged.
for(const definition of STREAMING_RESEARCH_DEFINITIONS) {
 const intrinsic=definition.installTargetType==='LOCALIZATION_CAPABILITY'||definition.installTargetType==='NETWORK_FIBRE';
 const kept=platformWith([program(definition.id,definition.installTargetType)]).researchPrograms[0];
 assert.equal(kept.installationTargetType,definition.installTargetType,`${definition.id} keeps ${definition.installTargetType}`);
 const damaged=platformWith([program(definition.id,'TECHNOLOGY_PROJECT')]).researchPrograms[0];
 assert.equal(damaged.installationTargetType,intrinsic?definition.installTargetType:'TECHNOLOGY_PROJECT',`${definition.id} after a damaged load`);
}
console.log(`PASS ${STREAMING_RESEARCH_DEFINITIONS.length} definitions keep their install target; damaged localization/fibre targets are repaired`);

// 2. A damaged, overdue Localization Foundation install finishes and installs its capability.
const repaired=platformWith([program('localization-foundation','TECHNOLOGY_PROJECT')]);
const advanced=advanceDueStreamingResearchPrograms(repaired,WEEK);
assert.equal(advanced.platform.researchPrograms[0].stage,'OPERATING');
assert.ok(advanced.platform.capabilities.installed.some(row=>row.capabilityId==='LOCALIZATION_FOUNDATION'&&row.status==='OPERATING'));
// Not yet due: stays installing, nothing installed.
const early=advanceDueStreamingResearchPrograms(platformWith([{...program('localization-foundation','LOCALIZATION_CAPABILITY'),stageReadyAtAbsoluteWeek:WEEK+1}]),WEEK);
assert.equal(early.platform.researchPrograms[0].stage,'INSTALLING');
assert.equal(early.platform.capabilities.installed.length,0);
console.log('PASS Localization Foundation finishes installing when due, not before');

// 3. Normalising twice changes nothing (idempotent), and money and time are untouched.
const once=platformWith([program('subtitle-operations-l1','TECHNOLOGY_PROJECT'),program('fibre-hollow-core','TECHNOLOGY_PROJECT')]);
const twice=normalizeOwnedStreamingPlatformState(once,'audit-player');
assert.deepEqual(twice.researchPrograms,once.researchPrograms);
assert.equal(twice.treasuryCash,once.treasuryCash);
console.log('PASS repair is idempotent and touches nothing else');
