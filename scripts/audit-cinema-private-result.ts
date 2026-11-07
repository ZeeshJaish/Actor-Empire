import assert from 'node:assert/strict';
import { mixedCinemaFixture } from './audit-box-office-integration';
import { commitCinemaWeek, processAndCommitCinemaWeek } from '../services/boxOffice/boxOfficeLiveSettlement';
import { clonePlayerForWeekProcessing } from '../services/gameLoopClone';

const events = (globalThis as typeof globalThis & { __cinemaMirrorEvents: string[] }).__cinemaMirrorEvents;
assert.ok(events, 'Run through the instrumented, test-only cost runner');
const { player, week } = mixedCinemaFixture();
const before = structuredClone(player);
const normal = processAndCommitCinemaWeek(player, week);
events.length = 0;
const owned = processAndCommitCinemaWeek(clonePlayerForWeekProcessing(player), week, undefined, { reuseDetachedWeekCandidate: true });
assert.deepEqual(events, [], 'An unexposed owned result needs no detached-proposal mirror');
assert.deepEqual(owned.player, normal.player);
const exposed = owned.result;
assert.deepEqual(events, ['issue'], 'The complete mirror must exist before the first public exposure');
assert.equal(owned.result, exposed);
assert.deepEqual(events, ['issue'], 'Reading again must not mint a replacement signature');
assert.deepEqual(exposed, normal.result, 'All result fields remain unchanged');
assert.deepEqual(commitCinemaWeek(player, exposed).player, normal.player, 'Exposed proposals retain the public commit contract');
exposed.titles[0].grossCents++;
assert.equal(owned.result, exposed);
assert.throws(() => commitCinemaWeek(player, owned.result), /changed|issued|mutation|match/i,
    'Repeated property reads must not bless a mutated proposal');
assert.deepEqual(player, before);
console.log(JSON.stringify({ privateResultChecks: 9, ownedMirrorBeforeExposure: 0, mirrorBeforeExposureToCaller: true, repeatedReadCannotResignTampering: true, completePlayerAndResultUnchanged: true }));
