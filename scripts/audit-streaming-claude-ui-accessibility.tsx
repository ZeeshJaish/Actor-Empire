import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import StreamingOpeningProgramme from '../components/streaming-transplant/StreamingOpeningProgramme';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import type { StreamingOpeningProgrammeView } from '../services/streamingOpeningProgramme';

const source = (path: string) => readFileSync(path, 'utf8');

const brand: Brand = {
  name: 'EMPIRE+', markId: 'FRAME_PLAY', customMark: null, hue: 250, sat: 90,
  identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
  layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 168, identMode: 'badge',
  identLen: 2, ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
};

const blocked: StreamingOpeningProgrammeView = {
  state: 'EXECUTING', commissioned: true, commission: null, absoluteWeek: 2101,
  earliestOpeningAbsoluteWeek: 2115, dateCertainty: 'ESTIMATE',
  controllingWorkstreamId: 'INFRASTRUCTURE', remainingWeeks: 14,
  cityCount: 6, rackCount: 118, releasedCapital: 465_000_000,
  progress: 0.07, totalWeeks: 15, citiesOnline: 0,
  workstreams: [
    {
      id: 'INFRASTRUCTURE', label: 'Infrastructure', status: 'IN_PROGRESS',
      detail: 'Crews are building 118 racks across 6 cities.', readyAtAbsoluteWeek: 2115,
      elapsedWeeks: 1, remainingWeeks: 14, controlsDate: true, actionLabel: null, operationIds: [],
    },
    {
      id: 'CLEARANCES', label: 'Government clearance', status: 'ACTION_REQUIRED',
      detail: 'One market needs your response.', readyAtAbsoluteWeek: 2105,
      elapsedWeeks: 1, remainingWeeks: 4, controlsDate: false,
      actionLabel: 'Resolve government request', operationIds: ['market-us'],
    },
  ],
};

const markup = renderToStaticMarkup(<StreamingOpeningProgramme
  brand={brand}
  view={blocked}
  network={{ built: true, sites: [], markets: [], reached: 1, served: 1, revision: 1, pending: null, peakStreams: 0, capacityStreams: 0, weeklyOperatingCost: 0 }}
  plan={null}
  focus="CLEARANCES"
  onBack={() => undefined}
  onResolveClearance={() => undefined}
  onOpeningNight={() => undefined}
/>);

assert.match(markup, /aria-describedby="sop-opening-gate-reason"/,
  'A disabled Opening Night action must point to its visible blocking reason.');
assert.match(markup, /id="sop-opening-gate-reason"[^>]*role="status"/,
  'The Opening Night blocker must be an announced status with a stable id.');
assert.match(markup, /The network sets the opening date/,
  'The disabled action must explain which workstream controls the date.');
assert.match(markup, /tabindex="-1"/,
  'A requested workstream must remain programmatically focusable.');

const buildSource = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
const buildStyles = source('components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css');
const canonicalBuildSource = source('components/studio-finance/components/build/BuildWizard.tsx');
const atlasSource = source('components/studio-finance/components/build/NetworkAtlas.tsx');
const sharedStyles = source('components/streaming-transplant/presentation/primitives.css');
const tokens = source('components/streaming-transplant/presentation/tokens.css');

assert.match(buildSource, /aria-label=\{`\$\{stage\.id\} stage,/,
  'Every Build-stage control must announce its stage and completion state, not only a number or checkmark.');
assert.match(buildSource, /aria-label=\{canAdd \? 'Add a rack' : 'Room full/,
  'A full-room rack control must announce why another rack cannot be added.');
assert.match(buildSource, /aria-describedby=\{!ready \? 'build-commission-reason' : undefined\}/,
  'The disabled commission action must be connected to its launch-gate reason.');
assert.match(buildSource, /id="build-commission-reason"[^>]*role="status"/,
  'The Build commission blocker must be a live, visible status.');
/* #157: the rail's buttons, same promise: their name, then current, complete or not complete */
assert.match(canonicalBuildSource, /aria-label=\{`\$\{s\.label\} stage, \$\{i === index \? 'current'/,
  'Canonical Build-stage controls must announce both their names and progress states.');
/* #157 moved the last button into the HUD, which carries the same link */
assert.match(canonicalBuildSource, /describedBy: 'bw-commission-guidance'/,
  'The disabled final Next action must point to commissioning guidance.');
assert.match(atlasSource, /tabIndex=\{0\}[\s\S]*onKeyDown=/,
  'Interactive map geography must be keyboard focusable and keyboard operable.');

const launchCheckRule = buildStyles.match(/\.bld \.launchchecks em\{([^}]*)\}/)?.[1] || '';
assert.doesNotMatch(launchCheckRule, /text-overflow\s*:\s*ellipsis|white-space\s*:\s*nowrap/,
  'Primary launch-readiness explanations must wrap instead of being silently trimmed.');
assert.match(sharedStyles, /\[data-epx-root\][\s\S]*:focus-visible/,
  'Shared Claude-derived surfaces must retain a visible keyboard-focus treatment.');
assert.match(tokens, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration:\s*1ms !important/,
  'The shared motion system must honour reduced-motion preferences.');

console.log('Streaming Claude UI accessibility audit passed.');
