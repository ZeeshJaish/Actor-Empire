#!/usr/bin/env node
// Perf plan (2026-11-08): a phone keeps a script at one byte a character only if every character in it
// fits in one byte. The game's 16 MB bundle is almost all ASCII, but a single emoji or Hindi letter makes
// the browser hold all of it at two bytes, about 16 MB more memory from start-up on. The build writes
// non-ASCII text as \u escapes (vite.config.ts: esbuild charset 'ascii'); esbuild leaves regex literals
// alone, so those must use escapes in the source. This audit checks a fresh production build in dist/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist', 'assets');
const config = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
const failures = [];
const check = (ok, message) => { if (ok) console.log(`PASS ${message}`); else { failures.push(message); console.log(`FAIL ${message}`); } };

check(/esbuild:\s*\{\s*charset:\s*'ascii'\s*\}/.test(config), "vite.config.ts writes the bundle as ASCII (esbuild charset 'ascii')");
const files = fs.existsSync(dist) ? fs.readdirSync(dist).filter(f => /\.(js|css)$/.test(f)) : [];
if (!files.length) {
  console.log('note: no production build in dist/, so the bundle was not checked (run npm run build first)');
} else {
  for (const file of files) {
    const text = fs.readFileSync(path.join(dist, file), 'utf8');
    const wide = [];
    for (let i = 0; i < text.length && wide.length < 5; i += 1) {
      if (text.charCodeAt(i) > 0xff) wide.push(`U+${text.codePointAt(i).toString(16).toUpperCase()} near "${text.slice(Math.max(0, i - 40), i).replace(/\s+/g, ' ')}"`);
    }
    check(wide.length === 0, `${file} (${(text.length / 1048576).toFixed(1)} M characters) is one byte a character${wide.length ? `\n  ${wide.join('\n  ')}` : ''}`);
  }
}
if (failures.length) { console.error(`FAIL one-byte bundle: ${failures.length}`); process.exit(1); }
console.log('PASS one-byte bundle');
