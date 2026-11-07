import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildCinemaAudienceSnapshot } from '../services/boxOffice/boxOfficeAudience';
import { cinemaLanguageScenarios } from './fixtures/cinemaLanguageScenarios';
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const expected = JSON.parse(readFileSync('scripts/fixtures/cinema-language-reference.json', 'utf8'));
const cases = cinemaLanguageScenarios();
assert.equal(expected.hashes.length, cases.length);
for (const [index, input] of cases.entries()) {
    const before = JSON.stringify(input), actual = buildCinemaAudienceSnapshot(input);
    assert.equal(hash(actual), expected.hashes[index], 'Entire issued audience snapshot case ' + index);
    assert.equal(JSON.stringify(input), before, 'Language matching must not mutate source data');
}
const mutable = cases[0]; mutable.cohorts[0].market!.languages = ['Hindi'];
assert.equal(hash(buildCinemaAudienceSnapshot(mutable)), expected.hashes[6], 'A later call must see changed languages freshly');
(globalThis as any).__cinemaLanguageCalls = 0; (globalThis as any).__captureCinemaLanguage = true;
try { assert.equal(hash(buildCinemaAudienceSnapshot(cases[1])), expected.hashes[1]); }
finally { (globalThis as any).__captureCinemaLanguage = false; }
const count = (globalThis as any).__cinemaLanguageCalls;
assert.ok(count <= 184, 'Each title/cohort language list should normalize once per snapshot, observed ' + count);
console.log(JSON.stringify({ passed: 17, fullSnapshotsExact: true, sourceUnchanged: true, freshLanguagesObserved: true, languageNormalizations: count }));
