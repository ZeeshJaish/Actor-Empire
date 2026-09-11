import assert from 'node:assert/strict';
import {
    buildStreamingPlatformLaunchCalendar,
    findStreamingPlatformPremiereWeek,
    getStreamingPlatformAvailablePremiereWeeks,
    getStreamingWeeklyPremiereCapacity,
} from '../services/streamingReleaseCalendar';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { INITIAL_PLAYER, type Player } from '../types';

assert.equal(getStreamingWeeklyPremiereCapacity(10), 1);
assert.equal(getStreamingWeeklyPremiereCapacity(25), 2);
assert.equal(getStreamingWeeklyPremiereCapacity(75), 3);
assert.equal(getStreamingWeeklyPremiereCapacity(150), 4);

const player = structuredClone(INITIAL_PLAYER) as Player;
player.world.streamingPlatformEcosystem = normalizeStreamingPlatformEcosystem(undefined, 2_000);
const platform = Object.values(player.world.streamingPlatformEcosystem.operators)
    .find(operator => operator.lifecycle === 'ACTIVE');
assert.ok(platform, 'fixture needs an active non-player streaming company');

const capacity = getStreamingWeeklyPremiereCapacity(platform.subscriberMillions);
player.world.streamingRightsContracts = Object.fromEntries(
    Array.from({ length: capacity }, (_, index) => [
        `occupied-${index}`,
        {
            id: `occupied-${index}`,
            status: 'ACTIVE',
            buyer: { platformId: platform.id },
            startsAtAbsoluteWeek: 2_001,
        },
    ]),
) as Player['world']['streamingRightsContracts'];

const calendar = buildStreamingPlatformLaunchCalendar(player, 2_000);
assert.ok(calendar.platforms[platform.id], 'every active ecosystem company needs a launch calendar');
assert.equal(calendar.platforms[platform.id].weeklyCapacity, capacity);
assert.equal(calendar.platforms[platform.id].occupiedByWeek[2_001], capacity);
assert.equal(
    findStreamingPlatformPremiereWeek(calendar, platform.id, 2_001),
    2_002,
    'a full platform slate must delay the release instead of excluding the platform',
);
assert.deepEqual(
    getStreamingPlatformAvailablePremiereWeeks(calendar, platform.id, 2_001, 3),
    [2_002, 2_003],
    'shared licensing needs the complete set of compatible premiere weeks',
);

console.log('Streaming release calendar audit passed.');
