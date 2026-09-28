import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getImagePixelRatioBudget,
  resolvePerformanceCapabilities,
  shouldMountOffscreenContent,
  toPerformanceCapabilityAttributes,
} from '../services/performanceCapabilities';
import {
  PerformanceCapabilitiesRoot,
  usePerformanceCapabilities,
} from '../components/PerformanceCapabilitiesRoot';

const full = resolvePerformanceCapabilities({ legacySmoothMode: false });
assert.deepEqual(full, {
  schemaVersion: 1,
  profile: 'FULL',
  blur: 'FULL',
  shadows: 'FULL',
  animationDensity: 'FULL',
  backgroundMotion: 'FULL',
  particleDensity: 'FULL',
  imageQualityBudget: 'FULL',
  offscreenMounting: 'KEEP_MOUNTED',
});
assert.equal(getImagePixelRatioBudget(3, full), 3);
assert.equal(shouldMountOffscreenContent(full, false), true);

const optimized = resolvePerformanceCapabilities({ legacySmoothMode: true });
assert.deepEqual(optimized, {
  schemaVersion: 1,
  profile: 'OPTIMIZED',
  blur: 'OFF',
  shadows: 'REDUCED',
  animationDensity: 'REDUCED',
  backgroundMotion: 'PAUSED',
  particleDensity: 'REDUCED',
  imageQualityBudget: 'BALANCED',
  offscreenMounting: 'UNMOUNT_INACTIVE',
});
assert.equal(getImagePixelRatioBudget(3, optimized), 1.5);
assert.equal(getImagePixelRatioBudget(1, optimized), 1);
assert.equal(shouldMountOffscreenContent(optimized, true), true);
assert.equal(shouldMountOffscreenContent(optimized, false), false);

assert.deepEqual(toPerformanceCapabilityAttributes(optimized), {
  'data-ae-performance-schema': '1',
  'data-ae-performance-profile': 'optimized',
  'data-ae-perf-blur': 'off',
  'data-ae-perf-shadows': 'reduced',
  'data-ae-perf-animation-density': 'reduced',
  'data-ae-perf-background-motion': 'paused',
  'data-ae-perf-particle-density': 'reduced',
  'data-ae-perf-image-quality': 'balanced',
  'data-ae-perf-offscreen-mounting': 'unmount-inactive',
});

const CapabilityProbe = () => {
  const capabilities = usePerformanceCapabilities();
  return <span>{capabilities.profile}:{capabilities.blur}:{capabilities.offscreenMounting}</span>;
};

const optimizedMarkup = renderToStaticMarkup(
  <PerformanceCapabilitiesRoot capabilities={optimized} className="game-shell">
    <CapabilityProbe />
  </PerformanceCapabilitiesRoot>
);
assert.match(optimizedMarkup, /class="game-shell ae-performance-root"/);
assert.match(optimizedMarkup, /data-ae-performance-profile="optimized"/);
assert.match(optimizedMarkup, /data-ae-perf-animation-density="reduced"/);
assert.match(optimizedMarkup, />OPTIMIZED:OFF:UNMOUNT_INACTIVE</);
assert.doesNotMatch(optimizedMarkup, /smooth-mode/);

const fullMarkup = renderToStaticMarkup(
  <PerformanceCapabilitiesRoot capabilities={full} className="game-shell">
    <CapabilityProbe />
  </PerformanceCapabilitiesRoot>
);
assert.match(fullMarkup, /data-ae-performance-profile="full"/);
assert.match(fullMarkup, /--ae-perf-glass-blur:8px/);
assert.match(fullMarkup, />FULL:FULL:KEEP_MOUNTED</);

console.log('performance capabilities phase 4 audit passed');
