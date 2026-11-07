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
assert.throws(() => Reflect.apply(processAndCommitCinemaWeek, undefined,
    [failedCandidate, broken.week, undefined, { reuseDetachedWeekCandidate: true }]), /Missing canonical cinema producer/);
assert.notEqual(failedCandidate.world.studios!.UNIVERSAL.cashReserve, durable.world.studios!.UNIVERSAL.cashReserve,
    'The injected error must occur after an earlier producer settlement, not before all mutation');
assert.deepEqual(broken.player, durable, 'Discarding a partially settled detached candidate preserves the entire durable prior player');
// The integration cases above separately verify committed JSON replay pays once.
console.log(JSON.stringify({ ownedWeekChecks: 9, exactPlayerAndResult: true, lateFailurePreservesPrior: true, coldArchiveReadsBeforeObservation: coldArchiveReads - 1 }));
