// @ts-nocheck - executable fixtures intentionally exercise malformed save boundaries.
import assert from 'node:assert/strict';
import {
    INDUSTRY_EVENT_LIMIT,
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryEventLedger,
} from '../services/industryWorld/industryEventLedger';

const release = createIndustryEventFact({
    idempotencyKey: 'release:project_glass_horizon',
    absoluteWeek: 701,
    type: 'PROJECT_RELEASED',
    importance: 'HIGH',
    companyId: 'UNIVERSAL',
    companyName: 'Universal',
    projectId: 'project_glass_horizon',
    productionId: 'production_glass_horizon',
    headline: 'Glass Horizon opens worldwide',
    detail: 'Universal released Glass Horizon through its saved theatrical plan.',
    evidence: [{ kind: 'PROJECT', id: 'project_glass_horizon' }],
});

assert.equal(release.id, 'industry_event_1stvr8b');
assert.equal(release.schemaVersion, 1);

const first = appendIndustryEventFacts(undefined, [release, release]);
assert.equal(first.events.length, 1, 'duplicate facts must collapse by idempotency key');
assert.equal(first.events[0].id, release.id);

const replay = appendIndustryEventFacts(first, [release]);
assert.deepEqual(replay, first, 'same-event replay must be an exact no-op');

const correctedRelease = {
    ...release,
    id: 'untrusted_replacement_id',
    headline: 'A later mutation must not replace the original fact',
};
assert.deepEqual(
    appendIndustryEventFacts(first, [correctedRelease]),
    first,
    'an idempotency key is immutable after its first persisted fact',
);

const many = Array.from({ length: INDUSTRY_EVENT_LIMIT + 25 }, (_, index) => createIndustryEventFact({
    idempotencyKey: `event:${index}`,
    absoluteWeek: index,
    type: index % 13 === 0 ? 'AWARD_WON' : 'PROJECT_GREENLIT',
    importance: index % 13 === 0 ? 'HIGH' : 'LOW',
    companyId: 'PARAMOUNT',
    companyName: 'Paramount',
    projectId: `project_${index}`,
    headline: `Event ${index}`,
    detail: `Saved fact ${index}`,
    evidence: [{ kind: 'PROJECT', id: `project_${index}` }],
}));
const bounded = normalizeIndustryEventLedger({
    schemaVersion: 999,
    lastProjectedAbsoluteWeek: 999,
    events: many,
    publishedEventKeys: Array.from({ length: INDUSTRY_EVENT_LIMIT + 50 }, (_, index) => `published:${index}`),
});
assert.equal(bounded.schemaVersion, 1);
assert.equal(bounded.events.length, INDUSTRY_EVENT_LIMIT);
assert.ok(bounded.events.some(event => event.idempotencyKey === 'event:0'), 'high-importance history must survive bounding');
assert.ok(bounded.events.some(event => event.idempotencyKey === `event:${many.length - 1}`), 'recent history must survive bounding');
assert.ok(bounded.publishedEventKeys.length <= INDUSTRY_EVENT_LIMIT * 2);

const malformed = normalizeIndustryEventLedger({
    events: [
        null,
        { ...release, idempotencyKey: '' },
        { ...release, absoluteWeek: Number.NaN },
        release,
    ],
    publishedEventKeys: ['', release.id, release.id],
});
assert.deepEqual(malformed.events, [release]);
assert.deepEqual(malformed.publishedEventKeys, [release.id]);
assert.equal(malformed.lastProjectedAbsoluteWeek, -1);

console.log('Industry world B7 event-ledger audit passed.');
