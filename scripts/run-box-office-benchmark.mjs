import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Module defaults and generated catalogue IDs consume RNG before the benchmark
// reseeds each week. Match the audit/App bootstrap before importing game code.
if (!process.argv[2]) throw new Error('Pass an already bundled box-office benchmark');
let state = 20261022, tick = 0;
Math.random = () => {
  let value = state += 0x6D2B79F5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};
Date.now = () => 1800000000000 + tick++;
await import(pathToFileURL(resolve(process.argv[2])).href);
