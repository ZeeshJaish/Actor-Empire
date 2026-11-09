#!/usr/bin/env node
// Perf plan (2026-11-08): the pieces a big Android export is sent in rebuild the text exactly, never split
// a character in two (emoji in names and titles are two UTF-16 units), and stay small.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({ entryPoints: [path.join(root, 'services/bridgeChunks.ts')], bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'error' });
const { splitForBridge, BRIDGE_CHUNK_CHARS } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

const failures = [];
const check = (ok, message) => { if (ok) console.log(`PASS ${message}`); else { failures.push(message); console.log(`FAIL ${message}`); } };
const isHigh = (code) => code >= 0xd800 && code <= 0xdbff;
const isLow = (code) => code >= 0xdc00 && code <= 0xdfff;
const wellFormed = (piece) => {
  for (let i = 0; i < piece.length; i += 1) {
    const c = piece.charCodeAt(i);
    if (isHigh(c)) { if (!isLow(piece.charCodeAt(i + 1))) return false; i += 1; } else if (isLow(c)) return false;
  }
  return true;
};

const career = JSON.stringify({ name: 'Zoë 🎬 Stàr', titles: Array.from({ length: 60000 }, (_, i) => ({ id: i, title: `Film ${i} ${i % 7 === 0 ? '🌟🎥' : 'plain'}`, note: 'नमस्ते' })) });
check(career.length > BRIDGE_CHUNK_CHARS * 4, `the sample career is big (${(career.length / 1048576).toFixed(1)}M characters)`);
const pieces = splitForBridge(career);
check(pieces.join('') === career, `${pieces.length} pieces rebuild the text exactly`);
check(pieces.every(wellFormed), 'no piece ends or starts inside a character');
check(pieces.every(p => p.length <= BRIDGE_CHUNK_CHARS && p.length > 0), `every piece is at most ${BRIDGE_CHUNK_CHARS} characters`);
check(new TextEncoder().encode(pieces.join('')).length === new TextEncoder().encode(career).length, 'the UTF-8 file the pieces make has the original size');

// a split point that falls exactly between the two halves of an emoji
const edge = 'a'.repeat(9) + '😀' + 'b'.repeat(5);
const tiny = splitForBridge(edge, 10);
check(tiny.join('') === edge && tiny.every(wellFormed), 'a piece that would end on half an emoji ends before it');
check(splitForBridge('').length === 0 && splitForBridge('x').join('') === 'x', 'empty and one-character texts');

if (failures.length) { console.error(`FAIL bridge chunks: ${failures.length}`); process.exit(1); }
console.log('PASS bridge chunks');
