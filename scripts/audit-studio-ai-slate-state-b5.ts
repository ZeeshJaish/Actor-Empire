import assert from 'node:assert/strict';
import {
    STUDIO_AI_SLATE_COMMITMENT_LIMIT,
    STUDIO_AI_SLATE_KEY_LIMIT,
    createInitialStudioAiSlateState,
    normalizeStudioAiSlateState,
} from '../services/studioAi/studioAiSlateState';

const initial = createInitialStudioAiSlateState(88);
assert.equal(initial.activatedAtAbsoluteWeek, 88);
assert.equal(initial.legacyProjectOriginRetiredAtAbsoluteWeek, 88);
assert.deepEqual(initial.commitments, []);
assert.deepEqual(initial.processedProposalKeys, []);
assert.deepEqual(initial.processedReviewKeys, []);

const active = Array.from({ length: 30 }, (_, index) => ({
    id: `active_${index}`,
    proposalId: `proposal_${index}`,
    proposalKey: `proposal_key_${index}`,
    fingerprintId: `fingerprint_${index}`,
    source: 'INDEPENDENT',
    status: index % 2 ? 'DEVELOPING' : 'GREENLIT',
    createdAtAbsoluteWeek: index,
    updatedAtAbsoluteWeek: index,
    nextReviewAbsoluteWeek: index + 2,
    developmentSpendMillions: 1,
    rewriteCount: 0,
    proposedBudgetMillions: 20,
    greenlightBudgetMillions: index % 2 ? undefined : 22,
}));
const terminal = Array.from({ length: 40 }, (_, index) => ({
    ...active[0],
    id: `terminal_${index}`,
    proposalId: `terminal_proposal_${index}`,
    proposalKey: `terminal_key_${index}`,
    fingerprintId: `terminal_fingerprint_${index}`,
    status: 'ABANDONED',
    updatedAtAbsoluteWeek: 100 + index,
}));
const normalized = normalizeStudioAiSlateState({
    schemaVersion: 99,
    activatedAtAbsoluteWeek: -5,
    legacyProjectOriginRetiredAtAbsoluteWeek: Number.NaN,
    commitments: [...terminal, ...active],
    processedProposalKeys: Array.from({ length: 90 }, (_, index) => `proposal_${index}`),
    processedReviewKeys: Array.from({ length: 90 }, (_, index) => `review_${index}`),
}, 120);

assert.equal(normalized.schemaVersion, 1);
assert.equal(normalized.activatedAtAbsoluteWeek, 0);
assert.equal(normalized.legacyProjectOriginRetiredAtAbsoluteWeek, 120);
assert.equal(normalized.commitments.filter(item => item.status === 'DEVELOPING').length, 15);
assert.equal(normalized.commitments.filter(item => item.status === 'GREENLIT').length, 15);
assert.ok(normalized.commitments.length >= STUDIO_AI_SLATE_COMMITMENT_LIMIT, 'active work must never be evicted by the history cap');
assert.equal(normalized.processedProposalKeys.length, STUDIO_AI_SLATE_KEY_LIMIT);
assert.equal(normalized.processedReviewKeys.length, STUDIO_AI_SLATE_KEY_LIMIT);
assert.equal(new Set(normalized.processedProposalKeys).size, normalized.processedProposalKeys.length);

const malformed = normalizeStudioAiSlateState({
    commitments: [{ id: '', status: 'BROKEN' }, null, { ...active[1], developmentSpendMillions: Number.NaN }],
}, 8);
assert.equal(malformed.commitments.length, 1);
assert.ok(Number.isFinite(malformed.commitments[0].developmentSpendMillions));

console.log('Studio AI B5 slate state audit passed.');
