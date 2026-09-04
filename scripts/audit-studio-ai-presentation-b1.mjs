import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const forbesApp = readFileSync('views/mobile/ForbesApp.tsx', 'utf8');
const english = readFileSync('services/localization/locales/en.ts', 'utf8');

assert.equal(
  forbesApp.includes("{plat.lifecycle || 'ACTIVE'}"),
  false,
  'streaming ranking cards must show financial facts, not raw lifecycle labels',
);
assert.equal(
  english.includes("'forbes.studioProfile.acquisitionState.DISTRESSED.label': 'Distressed'"),
  false,
  'studio profiles must describe visible board pressure rather than expose an internal distress enum',
);

console.log('Studio AI B1 presentation audit passed.');
