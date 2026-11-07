import assert from 'node:assert/strict';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { createInitialIndustryIntelligenceState } from '../services/industryIntelligence/industryIntelligenceState';
import { issuedIndustryIntegrityProjection } from './fixtures/issuedIndustryIntegrityProjection';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';
const project = (globalThis as any).__industryIntegrityProbe as typeof issuedIndustryIntegrityProjection;
assert.equal(typeof project, 'function', 'Use the test-only save-projection runner');
const p = createPlatformAiFixture(), base = Object.values(p.world.platforms!)[0];
p.world.studios = {}; p.world.platforms = { [base.id]: base } as typeof p.world.platforms;
p.ownedStreamingPlatform = { ...p.ownedStreamingPlatform, corporateDevelopment: { ...p.ownedStreamingPlatform?.corporateDevelopment, acquiredPlatformIds: [base.id] } } as any;
base.ai = { ...base.ai } as any;
const state: any = createInitialIndustryIntelligenceState(base.id, 'STREAMING_PLATFORM', 'projection-work', 52);
const lane = Object.keys(state.nextDueAbsoluteWeek)[0];
state.proposals = Array.from({ length: 650 }, (_, i) => ({ id: ` proposal-${i} `, lane, status: i % 7 ? 'SHADOW' : 'ACCEPTED', score: { score: 17 }, reasonCodes: ['COST'], future: { keep: i } }));
state.proposals.push(null, { id: ' invalid ', lane: 'INVALID', status: 'ACCEPTED' }, { id: '   ', lane, status: 'ACCEPTED' });
state.shadowComparisons = Array.from({ length: 80 }, (_, i) => ({ id: `compare-${i}`, proposalId: 'proposal', lane, divergence: 'MATCH' }));
state.processedKeys = ['paid-key', 'keep-history']; state.learning.samples = [{ id: 'sample', evidenceId: 'evidence', lane, outcomeScore: 88 }];
state.learning.processedEvidenceIds = ['evidence']; base.ai!.intelligence = state;
const before = JSON.stringify(p), expected = issuedIndustryIntegrityProjection(p);
assert.equal(project(p), expected, 'Full issued projection must remain exact with invalid rows, shadow truncation and history');
for (const acquired of [[base.id], []]) {
    p.ownedStreamingPlatform!.corporateDevelopment!.acquiredPlatformIds = acquired;
    for (const mutation of [() => {}, () => { state.nextDueAbsoluteWeek[lane] = null; }, () => { state.content.future = { preserved: 5 }; }, () => { state.learning.capabilityProgress[lane] = 74; }, () => { state.proposals.find((p: any) => p?.id === ' proposal-649 ').status = 'EXECUTED'; }, () => { state.proposals.unshift({ id: 'too-old-material', lane, status: 'EXECUTED' }); }]) {
        mutation(); assert.equal(project(p), issuedIndustryIntegrityProjection(p));
    }
}
const manifest = createSaveIntegrityManifest(p, 'MANUAL', 17);
assert.equal(verifySaveIntegrity(p, manifest).ok, true);
state.learning.franchiseFatigue += 1;
assert.equal(verifySaveIntegrity(p, manifest).ok, false, 'Actual protected learning changes must still be detected freshly');
state.learning.franchiseFatigue -= 1;
const durable = JSON.stringify(p), expectedFinal = issuedIndustryIntegrityProjection(p);
(globalThis as any).__industryWork = { ignoredRows: 0, extraProposalFields: 0 }; (globalThis as any).__captureIndustryWork = true;
try { assert.equal(project(p), expectedFinal); } finally { (globalThis as any).__captureIndustryWork = false; }
assert.equal(JSON.stringify(p), durable, 'Signing must not trim or mutate actual stored diagnostics/content');
assert.equal((globalThis as any).__industryWork.ignoredRows, 0, 'Digest-only reading must not reconstruct ignored comparison/evidence/key histories');
assert.equal((globalThis as any).__industryWork.extraProposalFields, 0, 'Only id/lane/status are needed for the issued material-ID projection');
assert.notEqual(before.length, 0);
console.log(JSON.stringify({ passed: 18, issuedProjectionExact: true, sourceUnchanged: true, freshTamperingRejected: true, ignoredWork: (globalThis as any).__industryWork }));
