import assert from 'node:assert/strict';

import { normalizeStreamingCanonicalFoundation } from '../services/streamingCanonicalState';

const normalized = normalizeStreamingCanonicalFoundation({
  serviceConfiguration: {
    source: 'PLAYER_ACTION',
    pricing: {
      streams: ['subs'],
      plans: [{
        id: 'PLAN_4',
        name: 'Mobile',
        monthly: 6,
        featureIds: ['downloads'],
        ads: false,
        colorId: 'ocean',
      }],
    },
  },
});

assert.equal(
  normalized.serviceConfiguration.pricing.plans[0].colorId,
  'ocean',
  'A player-selected plan colour must survive canonical save normalization and reload.',
);

const invalidColour = normalizeStreamingCanonicalFoundation({
  serviceConfiguration: {
    source: 'PLAYER_ACTION',
    pricing: {
      streams: ['subs'],
      plans: [{
        id: 'PLAN_5',
        name: 'Invalid colour',
        monthly: 10,
        featureIds: [],
        ads: false,
        colorId: 'javascript:red',
      }],
    },
  },
});

assert.equal(
  invalidColour.serviceConfiguration.pricing.plans[0].colorId,
  undefined,
  'Unknown plan colours must not enter the canonical save.',
);

console.log('Streaming plan colour persistence audit passed.');
