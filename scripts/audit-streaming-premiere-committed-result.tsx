import assert from 'node:assert/strict';
import * as premiere from '../components/streaming-transplant/StreamingPremiereExperience';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { commitOwnedStreamingLaunch } from '../services/streamingLaunch';
const resolve = (premiere as any).premiereResultFromCommit;
assert.equal(typeof resolve, 'function', 'Premiere needs a committed-result adapter instead of a second subscriber simulation.');
const launched = commitOwnedStreamingLaunch(createC6QaCareer(), 'STANDARD');
assert.ok(launched.launchCommit);
for (const subscribers of [0, 1, 365700]) {
    const commit = { ...launched.launchCommit!, initialSubscribers: subscribers };
    const result = resolve(commit);
    assert.equal(result.subsGained, subscribers);
    assert.equal(result.peak, commit.forecastLikelyConcurrentStreams);
    assert.equal(result.failedPct, Math.round((100 - commit.playbackSuccessRate) * 100) / 100);
    assert.deepEqual(resolve(commit), result, 'Replaying the same launch cannot change the displayed facts.');
}
console.log('Premiere committed-result audit passed.');
