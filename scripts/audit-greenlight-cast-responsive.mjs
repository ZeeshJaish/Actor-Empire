import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wizard = readFileSync('views/lifestyle/business/GreenlightWizard.tsx', 'utf8');
const castStep = readFileSync('views/lifestyle/business/components/GreenlightCastStep.tsx', 'utf8');
const controls = readFileSync('views/lifestyle/business/components/CharacterIdentityControls.tsx', 'utf8');

assert.match(
  castStep,
  /grid-cols-\[56px_minmax\(0,1fr\)\][^"]*sm:grid-cols-\[64px_minmax\(0,1fr\)_8rem\]/,
  'Cast cards should reserve a flexible, non-overflowing content column.',
);
assert.match(
  castStep,
  /col-span-2 min-w-0 sm:col-span-1 sm:col-start-2/,
  'Character profile should use the full card width on phones.',
);
assert.match(
  castStep,
  /pb-\[calc\(13rem\+env\(safe-area-inset-bottom\)\)\]/,
  'Cast content should clear the fixed controls and the iPhone safe area.',
);
assert.match(
  wizard,
  /WebkitOverflowScrolling: 'touch'/,
  'The wizard should keep momentum scrolling on iOS.',
);
assert.match(
  controls,
  /flex flex-wrap items-center justify-between/,
  'The profile header should wrap instead of colliding.',
);
assert.match(
  controls,
  /grid auto-rows-fr grid-cols-2/,
  'Profile choices should stay symmetric.',
);
assert.match(
  controls,
  /min-h-\[5\.75rem\]/,
  'Profile choices should keep equal usable heights.',
);

console.log('Greenlight cast responsive audit passed.');
