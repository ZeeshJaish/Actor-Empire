// @ts-nocheck - executable C6 source accuracy fixture.
import assert from 'node:assert/strict';
import { advanceIndustryMediaSourceRecord, normalizeIndustryMediaWorld } from '../services/industryWorld';

const state = normalizeIndustryMediaWorld(undefined);
const personality = state.personalities.find(item => item.id === 'mara_voss');
const institution = state.institutions.find(item => item.id === 'screenline_trade');
assert.ok(personality && institution);

const base = {
    schemaVersion: 1, id: 'claim_source', claimKey: 'claim-source', kind: 'PREDICTION', status: 'CONFIRMED',
    category: 'PROJECT_OUTCOME', confidence: 'CREDIBLE_CHATTER', subjectKey: 'project:source', subjectName: 'Source',
    anchorIndustryEventId: 'event_source', anchorStoryId: 'story_source', evidenceEventIds: ['event_source'],
    institutionId: institution.id, personalityId: personality.id, publicationChannel: 'X', importance: 'HIGH',
    headline: 'Prediction', summary: 'A prediction may happen.', knownEvidence: 'Confirmed context exists.',
    target: { expectedEventTypes: ['PROJECT_HIT'], projectId: 'source' }, createdAbsoluteWeek: 1,
    earliestResolutionAbsoluteWeek: 2, expiryAbsoluteWeek: 20, lastEvaluatedAbsoluteWeek: 2, playerRelated: false,
};

const confirmed = advanceIndustryMediaSourceRecord(undefined, base, personality, institution, 'CONFIRMED', 5);
assert.equal(confirmed.record.calls, 1);
assert.equal(confirmed.record.confirmed, 1);
assert.ok(confirmed.delta > 0);
assert.ok(confirmed.record.reliability > personality.credibility);

const duplicate = advanceIndustryMediaSourceRecord(confirmed.record, base, personality, institution, 'CONFIRMED', 5);
assert.equal(duplicate.delta, 0);
assert.deepEqual(duplicate.record, confirmed.record);

const refuted = advanceIndustryMediaSourceRecord(undefined, { ...base, id: 'claim_false', kind: 'LEAK' }, personality, institution, 'REFUTED', 6);
assert.equal(refuted.record.refuted, 1);
assert.ok(refuted.delta <= -3);
assert.ok(refuted.record.reliability < personality.credibility);

const expired = advanceIndustryMediaSourceRecord(undefined, { ...base, id: 'claim_expired' }, personality, institution, 'EXPIRED_UNVERIFIED', 20);
assert.equal(expired.record.expired, 1);
assert.equal(expired.delta, 0);
assert.equal(expired.record.reliability, personality.credibility);

const partial = advanceIndustryMediaSourceRecord(undefined, { ...base, id: 'claim_partial' }, personality, institution, 'PARTLY_CONFIRMED', 7);
assert.equal(partial.record.partlyConfirmed, 1);
assert.ok(partial.delta > 0 && partial.delta < confirmed.delta);

console.log('Industry media C6 source record audit passed.');
