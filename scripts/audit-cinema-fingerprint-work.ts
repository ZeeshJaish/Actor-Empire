import assert from 'node:assert/strict';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { cinemaKey } from '../services/boxOffice/boxOfficeMath';
import { makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';

// Frozen issued v2 algorithm. Compatibility matters because fingerprints are
// part of durable receipt identities, even when their source guard is separate.
const issued = (value: any): string => {
    const canonical = (v: any): any => Array.isArray(v)
        ? v.map(canonical).map(value => ({ value, key: JSON.stringify(value) }))
            .sort((a, b) => a.value === undefined ? (b.value === undefined ? 0 : 1)
                : b.value === undefined ? -1 : a.key!.localeCompare(b.key!)).map(row => row.value)
        : v && typeof v === 'object'
            ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)])) : v;
    const { live, ...facts } = value;
    const text = JSON.stringify(canonical({ ...facts, ...(live ? { live: { clockEpoch: live.clockEpoch } } : {}) }));
    return `cinema-input-v2:${cinemaKey(0, 0, text).toString(16)}`;
};
const fingerprint = (globalThis as any).__cinemaFingerprintProbe as typeof issued;
assert.equal(typeof fingerprint, 'function', 'Use the test-only instrumented audit runner');
const fixture = makeCinemaMarketFixture(), proposed = simulateCinemaWeek(fixture);
const cases: any[] = [fixture, { ...fixture, absoluteWeek: fixture.absoluteWeek + 1, marketState: proposed.nextState },
    { entries: [undefined, , null, -0, NaN, Infinity, -Infinity, 'null', '\ud800', '😀', 'é', 'e\u0301'] },
    { entries: [{ '10': 1, '2': 2, '01': 3, '4294967295': 4, '4294967294': 5, '-0': 6, a: undefined, z: false }, new Date(0), /a/], omitted: undefined },
    { live: { clockEpoch: 'issued', sourceSignature: 'must not enter fingerprint' }, unknownFutureField: { '': '', nested: [[undefined], [], [1, '1']] } },
    JSON.parse('{"__proto__":{"safe":1},"constructor":{"prototype":"value"},"toString":"text"}')];
let random = 17;
const next = () => (random = Math.imul(random, 1664525) + 1013904223 >>> 0);
const value = (depth: number): any => {
    if (!depth) return [undefined, null, true, false, 0, -0, 1.25, '😀', '\n"\\', 'é', '2', '10'][next() % 12];
    if (next() % 2) return Array.from({ length: next() % 6 }, () => value(depth - 1));
    const result: any = {};
    for (let i = 0, count = next() % 6; i < count; i++) result[['10', '2', '01', 'a', 'z', 'é', '😀'][next() % 7]] = value(depth - 1);
    return result;
};
for (let i = 0; i < 150; i++) cases.push({ entries: value(4) });
for (const [index, input] of cases.entries()) assert.equal(fingerprint(input), issued(input), 'Exact issued identity case ' + index);
const sample = { ...fixture, marketState: proposed.nextState }, before = JSON.stringify(sample), expected = issued(sample);
const stringify = JSON.stringify; let objectSerializations = 0;
JSON.stringify = ((v: unknown, ...args: any[]) => { if (v && typeof v === 'object') objectSerializations++; return (stringify as any)(v, ...args); }) as typeof stringify;
let actual: string;
try { actual = fingerprint(sample); } finally { JSON.stringify = stringify; }
assert.equal(actual!, expected); assert.equal(JSON.stringify(sample), before, 'Fingerprint must preserve all source data');
assert.equal(objectSerializations, 0, 'Fingerprint must not repeatedly serialize reconstructed nested objects');
console.log(JSON.stringify({ passed: cases.length + 3, issuedFingerprintsExact: true, objectSerializations }));
