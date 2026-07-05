import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { MOD_TALENT_ROWS } from '../services/modTalentData';
import { MOD_TALENT_SUPPLEMENT_ROWS } from '../services/modTalentSupplement';

const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const countries = Array.from(new Set(MOD_TALENT_ROWS.map(row => row.country)));
const baseNames = new Set(MOD_TALENT_ROWS.map(row => normalizeName(row.name)));
const supplementNames = MOD_TALENT_SUPPLEMENT_ROWS.map(row => normalizeName(row.name));
const saveMigrationSource = readFileSync('services/saveMigration.ts', 'utf8');

assert.equal(MOD_TALENT_SUPPLEMENT_ROWS.length, countries.length * 30, 'Supplement should add 30 people per country: 10 actors, 10 directors, 10 creators.');
assert.equal(new Set(supplementNames).size, supplementNames.length, 'Supplement names should be unique within the supplement.');

for (const name of supplementNames) {
  assert(!baseNames.has(name), `Supplement name should not already exist in base mod talent rows: ${name}`);
}

for (const country of countries) {
  for (const category of ['actor', 'director', 'creator'] as const) {
    const count = MOD_TALENT_SUPPLEMENT_ROWS.filter(row => row.country === country && row.category === category).length;
    assert.equal(count, 10, `${country} should add exactly 10 ${category} supplement rows.`);
  }
}

assert(saveMigrationSource.includes('const SAVE_MIGRATION_VERSION = 13'), 'Save migration version should bump for existing enabled country packs.');
assert(saveMigrationSource.includes('createGlobalActorPackNPCs'), 'Save migration should sync missing expanded pack NPCs for existing saves.');
assert(saveMigrationSource.includes('enabledGlobalActorPacks.flatMap'), 'Save migration should inspect already-enabled global actor packs.');

console.log('Mod talent supplement generated data audit passed.');
