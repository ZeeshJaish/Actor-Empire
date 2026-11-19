import assert from 'node:assert/strict';
import { mixedCinemaFixture } from './audit-box-office-integration';
import { processAndCommitCinemaWeek } from '../services/boxOffice/boxOfficeLiveSettlement';
import { clonePlayerForWeekProcessing } from '../services/gameLoopClone';

const fixture = mixedCinemaFixture();
const original = structuredClone(fixture.player);
const normal = processAndCommitCinemaWeek(fixture.player, fixture.week);
assert.deepEqual(fixture.player, original, 'Public settlement keeps the caller unchanged');
const owned = clonePlayerForWeekProcessing(fixture.player);
let coldArchiveReads = 0;
Object.defineProperty(owned.world, 'qaColdArchive', { configurable: true, enumerable: true, get: () => { coldArchiveReads++; return 'retained-data'; } });
const fast = Reflect.apply(processAndCommitCinemaWeek, undefined, [owned, fixture.week, undefined, { reuseDetachedWeekCandidate: true }]);
assert.equal(coldArchiveReads, 1, 'Only the existing audience snapshot may read a cold archive; the detached candidate must not clone the entire world again');
const observedWorld = fast.player.world as typeof fast.player.world & { qaColdArchive?: string };
assert.equal(observedWorld.qaColdArchive, 'retained-data');
delete observedWorld.qaColdArchive;
assert.deepEqual(fast.player, normal.player, 'Owned and public paths produce identical complete settled players');
assert.deepEqual(fast.result, normal.result);
assert.deepEqual(fixture.player, original, 'Reusing the detached candidate cannot mutate the durable prior player');
const broken = mixedCinemaFixture();
broken.player.activeReleases.find(r => r.id === 'owned')!.projectDetails.studioId = 'missing-owner' as never;
const durable = structuredClone(broken.player), failedCandidate = clonePlayerForWeekProcessing(broken.player);
// 2026-11-15 (B2): a missing producer no longer stops the week; it settles into the external producer ledger.
const settledCandidate = Reflect.apply(processAndCommitCinemaWeek, undefined,
    [failedCandidate, broken.week, undefined, { reuseDetachedWeekCandidate: true }]) as any;
assert.ok(Object.hasOwn((settledCandidate.player ?? settledCandidate).world.cinemaMarket.externalProducerBalancesCents || {}, 'missing-owner'),
    'B2: the missing producer\'s receipts land in the external ledger');
assert.deepEqual(broken.player, durable, 'Settling a detached candidate preserves the entire durable prior player');
/* Phase 1 of the week-speed plan (2026-11-17), its Phase H item 9: the late-failure test, restored. B2 turned the old
   injected fault (a missing producer) into a settled week, so nothing tested a failure late in the settlement any more.
   The titles settle in id order (new-npc, offered, owned): 'owned' now asks for a signed actor share far above its
   receipts, so it throws after 'offered' has already settled on the reused detached candidate. */
const late = mixedCinemaFixture();
const lateRelease = late.player.activeReleases.find(r => r.id === 'owned')!;
lateRelease.budget = 0;
lateRelease.royaltyPercentage = 1e7;
const lateDurable = structuredClone(late.player), lateCandidate = clonePlayerForWeekProcessing(late.player);
const offeredBefore = structuredClone(lateCandidate.activeReleases.find(r => r.id === 'offered')!.weeklyGross);
assert.throws(() => Reflect.apply(processAndCommitCinemaWeek, undefined, [lateCandidate, late.week, undefined, { reuseDetachedWeekCandidate: true }]),
    /Signed actor\/backend shares exceed current collected receipts/, 'The injected late fault stops the settlement');
assert.notDeepEqual(lateCandidate.activeReleases.find(r => r.id === 'offered')!.weeklyGross, offeredBefore,
    'The fault comes late: an earlier title had already settled on the reused detached candidate');
assert.deepEqual(late.player, lateDurable, 'A late settlement failure leaves the entire durable prior player untouched');
const lateFailurePreservesPrior = true; // printed only after the three asserts above
// The integration cases above separately verify committed JSON replay pays once.
console.log(JSON.stringify({ ownedWeekChecks: 12, exactPlayerAndResult: true, lateFailurePreservesPrior, coldArchiveReadsBeforeObservation: coldArchiveReads - 1 }));
