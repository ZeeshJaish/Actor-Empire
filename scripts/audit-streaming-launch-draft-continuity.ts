import assert from 'node:assert/strict';

import type { LaunchDraft } from '../components/studio-finance/finance/launch';
import { resolveLaunchDraftAfterDetour } from '../components/studio-finance/finance/launch';

const canonicalDraft: LaunchDraft = {
  selectedCountryIds: [],
  soundId: 'pulse',
  packageId: 'sting',
  storefrontId: 'hero',
  pricing: {
    streams: ['subs'],
    plans: [{ id: 'basic', name: 'Basic', monthly: 8, featureIds: ['hd'], ads: false }],
    annualDiscount: 10,
    introOffer: 0,
    ads: { minutesPerHour: 0, cpm: 0 },
    rentals: { rent: 4, buy: 12, windowWeeks: 4 },
    premium: { price: 20 },
    daypass: { price: 3 },
    sponsor: { perTitle: 0, titles: 0 },
    metered: { perHour: 0 },
    patron: { monthly: 0 },
  },
};

const workingDraft: LaunchDraft = {
  selectedCountryIds: ['US', 'IN', 'JP'],
  tierPrices: { basic: 9.5 },
  soundId: 'custom',
  packageId: 'cinematic',
  customAudio: {
    dataUrl: 'data:audio/wav;base64,launch',
    originalName: 'launch.wav',
    durationSeconds: 3,
    sampleRate: 48_000,
    byteLength: 480,
    fingerprint: 'launch-ident',
  },
  storefrontId: 'event',
  pricing: {
    ...canonicalDraft.pricing!,
    streams: ['subs', 'ads'],
    plans: [{ id: 'basic', name: 'Opening', monthly: 9.5, featureIds: ['hd', 'downloads'], ads: true }],
    ads: { minutesPerHour: 4, cpm: 24 },
  },
};

const resumed = resolveLaunchDraftAfterDetour(canonicalDraft, workingDraft);
assert.deepEqual(resumed, workingDraft, 'Returning from Finance must restore the complete working launch draft.');
assert.notEqual(resumed, workingDraft, 'The resumed draft must be an independent snapshot.');
assert.notEqual(resumed.selectedCountryIds, workingDraft.selectedCountryIds);
assert.notEqual(resumed.pricing, workingDraft.pricing);
assert.notEqual(resumed.pricing?.plans, workingDraft.pricing?.plans);
assert.notEqual(resumed.pricing?.plans[0].featureIds, workingDraft.pricing?.plans[0].featureIds);

resumed.selectedCountryIds.push('GB');
resumed.pricing!.plans[0].featureIds.push('uhd');
assert.deepEqual(workingDraft.selectedCountryIds, ['US', 'IN', 'JP']);
assert.deepEqual(workingDraft.pricing!.plans[0].featureIds, ['hd', 'downloads']);

const firstVisit = resolveLaunchDraftAfterDetour(canonicalDraft, null);
assert.deepEqual(firstVisit, canonicalDraft, 'A first visit must still start from the canonical saved plan.');
assert.notEqual(firstVisit, canonicalDraft);

console.log('Streaming launch draft continuity audit passed.');
