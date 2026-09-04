import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { generateWeeklyEvent } from '../services/geminiService';

const originalRandom = Math.random;
Math.random = () => 0.25;
const startedAt = performance.now();
const event = await generateWeeklyEvent(82, 'Actor', 95);
const elapsedMs = performance.now() - startedAt;
Math.random = originalRandom;

assert.equal(typeof event, 'string');
assert.ok(event.length > 0);
assert.ok(elapsedMs < 50, `Local weekly flavor text added ${elapsedMs.toFixed(2)}ms of artificial delay.`);
console.log(`Weekly event performance audit passed (${elapsedMs.toFixed(2)}ms).`);
