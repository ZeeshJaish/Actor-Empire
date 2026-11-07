import assert from 'node:assert/strict';
import { stableSaveHash } from '../services/stableSaveHash';
import { issuedSaveHash } from './fixtures/issuedSaveHashReference';
const rows = Array.from({ length: 2000 }, (_, i) => ({ z: i, aware: 17, seen: [1, undefined, -0], name: 'Archive 🦊\ud800' }));
const expected = issuedSaveHash(rows), originalSort = Array.prototype.sort;
let sorts = 0;
Array.prototype.sort = function (...args: any[]) { sorts++; return (originalSort as any).apply(this, args); } as typeof originalSort;
let actual: string;
try { actual = stableSaveHash(rows); } finally { Array.prototype.sort = originalSort; }
assert.equal(actual!, expected, 'Every issued UTF-16 hash remains exact');
assert.ok(sorts <= 2, 'Repeated identical field layouts should sort their keys once per hash, observed ' + sorts);
const cases: any[] = [undefined, null, -0, NaN, Infinity, '\ud800\udfff🦊\n', [1, , undefined, null],
    { a: 1, 'b\u0000c': 2 }, { 'a\u0000b': 1, c: 2 }, { '10': 1, '2': 2, '01': 3, __test: undefined },
    { date: new Date(0), map: new Map([['x', 1]]) }, Object.assign(Object.create({ inherited: 9 }), { own: 2 })];
let random = 71;
const next = () => (random = Math.imul(random, 1664525) + 1013904223 >>> 0);
for (let i = 0; i < 150; i++) {
    const result: any = {};
    for (let j = 0; j < 8; j++) result[['a', 'z', '1', '02', 'é', 'a\u0000b', '\ud800'][next() % 7]] = [undefined, NaN, next() / 3, ['🦊', , i], { b: i, a: -0 }][next() % 5];
    cases.push(result);
}
for (const value of cases) assert.equal(stableSaveHash(value), issuedSaveHash(value));
const many = Array.from({ length: 3500 }, (_, i) => ({ ['unique' + i]: i, common: 'same' }));
assert.equal(stableSaveHash(many), issuedSaveHash(many));
assert.ok((globalThis as any).__hashSortKeyNodes <= 2048, 'Invocation-local key metadata must stay bounded');
const mutable: any = { z: 1, a: 2 }; const before = stableSaveHash(mutable);
mutable.a = 3; assert.notEqual(stableSaveHash(mutable), before, 'Actual values are always hashed freshly');
mutable.newField = 7; assert.equal(stableSaveHash(mutable), issuedSaveHash(mutable));
delete mutable.z; assert.equal(stableSaveHash(mutable), issuedSaveHash(mutable));
console.log(JSON.stringify({ passed: cases.length + 7, issuedHashesExact: true, boundedKeyMetadata: true, repeatedSorts: sorts, freshMutationsDetected: true }));
