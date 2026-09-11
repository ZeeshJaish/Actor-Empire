import assert from 'node:assert/strict';
import {
  buildReleaseFilmArt,
  getReleaseWizardPhase,
  getReleaseWizardProgress,
  toReleaseWizardRoute,
} from '../views/lifestyle/business/release-strategy-transplant/adapter';
import { getStreamingOfferScopeLabel } from '../views/lifestyle/business/release-strategy-transplant/StreamingWarRoomStep';

assert.equal(toReleaseWizardRoute('STREAMING_ONLY'), 'STREAMING');
assert.equal(toReleaseWizardRoute('THEATRICAL'), 'THEATRICAL');
assert.equal(getReleaseWizardPhase(2, 'THEATRICAL', false), 'DESK');
assert.equal(getReleaseWizardPhase(2, 'STREAMING_ONLY', false), 'WAR');
assert.equal(getReleaseWizardPhase(2, 'STREAMING_ONLY', true), 'WAR');
assert.deepEqual(
  getReleaseWizardProgress(2, 'THEATRICAL').map(item => item.id),
  ['DISTRIBUTION', 'DESK', 'CAMPAIGN', 'FESTIVALS', 'CALENDAR', 'FINALIZE'],
);
assert.deepEqual(
  getReleaseWizardProgress(2, 'STREAMING_ONLY').map(item => item.id),
  ['DISTRIBUTION', 'WAR', 'CAMPAIGN', 'FESTIVALS', 'CALENDAR', 'FINALIZE'],
);
assert.deepEqual(
  buildReleaseFilmArt({ name: 'Glass City', projectDetails: { genre: 'THRILLER' } }),
  {
    title: 'Glass City',
    art: 'thriller',
    hue: 208,
    tagline: 'RELEASE READY',
  },
);
assert.equal(getStreamingOfferScopeLabel('EXCLUSIVE'), 'EXCLUSIVE');
assert.equal(getStreamingOfferScopeLabel('NON_EXCLUSIVE'), 'SHARED');

console.log('Release Wizard UI model audit passed.');
