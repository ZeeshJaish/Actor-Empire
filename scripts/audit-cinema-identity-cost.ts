import assert from 'node:assert/strict';
import { serializeCinemaFacts, issueCinemaResult, assertIssuedCinemaResult } from '../services/boxOffice/boxOfficeIdentity';

// Frozen pre-optimization oracle: identity bytes protect live source and result mutations.
const issued = (value: unknown): string => {
    if (value === undefined || value === null) return 'null';
    if (Array.isArray(value)) return `[${value.map(issued).join(',')}]`;
    if (typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${issued(v)}`).join(',')}}`;
    return JSON.stringify(value);
};
const holes = new Array(4); holes[2] = undefined; holes[3] = 'tail';
const values: unknown[] = [null, undefined, false, true, 0, -0, Infinity, NaN, '', '\ud800', '\udc00', '😀', '\u0000\n\\"',
    {}, [], holes, new Date(0), { '10': 'ten', '2': 'two', b: undefined, a: null },
    [() => 1, Symbol('value'), undefined], { f: () => 1, s: Symbol('value') }, () => 1, Symbol('root')];
let seed = 31;
const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const make = (depth: number): unknown => {
    if (!depth || random() < .4) return values[Math.floor(random() * 16)];
    if (random() < .5) return Array.from({ length: Math.floor(random() * 8) }, () => make(depth - 1));
    return Object.fromEntries(Array.from({ length: Math.floor(random() * 8) }, (_, i) => [String(i % 2 ? i : 'field-' + i), make(depth - 1)]));
};
for (let i = 0; i < 1000; i++) values.push(make(4));
for (const value of values) assert.equal(serializeCinemaFacts(value), issued(value));
assert.throws(() => serializeCinemaFacts(1n), TypeError);
// Source signatures are immutable strings: retaining and comparing the exact string
// avoids encoding tens of MB again inside the private issued-result guard.
const original = JSON.stringify;
let largeQuotes = 0;
JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
    if (typeof args[0] === 'string' && args[0].length >= 1_000_000) largeQuotes++;
    return original(...args);
}) as typeof JSON.stringify;
const fresh = () => ({ mode: 'LIVE', live: { clockEpoch: 1, sourceSignature: 'x'.repeat(1_000_000) },
    titles: [{ titleId: 'movie', grossCents: 100 }], nextState: { week: 3 }, inputFingerprint: 'input' }) as any;
try {
    const result = issueCinemaResult(fresh());
    assertIssuedCinemaResult(result);
    assert.ok(largeQuotes === 0, `Do not re-encode the immutable source string inside the issued-result guard: ${largeQuotes}`);
    result.live.sourceSignature += 'changed';
    assert.throws(() => assertIssuedCinemaResult(result), /changed after simulation/);
    for (const mutate of [
        (r: any) => r.titles[0].grossCents++,
        (r: any) => r.live.clockEpoch++,
        (r: any) => r.nextState.week++,
        (r: any) => r.extra = 1,
        (r: any) => r.live.sourceSignature = undefined,
        (r: any) => r.live = null,
        (r: any) => r.live = Object.assign([], r.live),
        (r: any) => Object.defineProperty(r, 'live', { enumerable: false }),
        (r: any) => Object.defineProperty(r.live, 'sourceSignature', { enumerable: false }),
        (r: any) => { const sourceSignature = r.live.sourceSignature; delete r.live.sourceSignature; Object.setPrototypeOf(r.live, { sourceSignature }); },
    ]) { const r = issueCinemaResult(fresh()); mutate(r); assert.throws(() => assertIssuedCinemaResult(r), /changed after simulation/); }
    const nonString = fresh(); nonString.live.sourceSignature = { value: 'legacy-malformed' };
    issueCinemaResult(nonString); nonString.live.sourceSignature.value = 'mutated';
    assert.throws(() => assertIssuedCinemaResult(nonString), /changed after simulation/);
    assert.throws(() => assertIssuedCinemaResult(fresh()), /not issued/);
    const callable = Object.assign(() => null, { mode: 'LIVE', live: { sourceSignature: 'not-an-object-result' } }) as any;
    issueCinemaResult(callable); assert.throws(() => assertIssuedCinemaResult(callable), /not issued|changed after simulation/);
} finally { JSON.stringify = original; }
console.log(JSON.stringify({ passed: values.length + 16, identicalIssuedBytes: true, immutableSourceReencodings: largeQuotes }));
