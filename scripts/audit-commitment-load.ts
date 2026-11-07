import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * #300: `App.tsx` rebuilds every commitment field by field when a save loads.
 * A field added to `Commitment` and not listed there is lost on the next load, with no error.
 */
const types = readFileSync('types.ts', 'utf8');
const start = types.search(/export interface Commitment\b[^{]*\{/);
assert.ok(start >= 0, 'Commitment type found');
let index = types.indexOf('{', start) + 1;
let depth = 1;
const open = index;
while (depth > 0) {
    if (types[index] === '{') depth += 1;
    if (types[index] === '}') depth -= 1;
    index += 1;
}
const fields: string[] = [];
let level = 0;
for (const line of types.slice(open, index - 1).split('\n')) {
    if (level === 0) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);
        if (match) fields.push(match[1]);
    }
    level += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
}
assert.ok(fields.length > 30, 'the type was read');

const app = readFileSync('App.tsx', 'utf8');
const from = app.indexOf('const normalizeCommitment = ');
const to = app.indexOf('const normalizeSponsorshipOffer');
assert.ok(from >= 0 && to > from, 'the normalizer was found');
const normalizer = app.slice(from, to);
const dropped = fields.filter(field => !new RegExp(`commitment\\.${field}\\b`).test(normalizer));
assert.deepEqual(dropped, [], `lost on every load: ${dropped.join(', ')}`);

console.log('audit:commitment-load passed:', fields.length, 'fields survive a load');
