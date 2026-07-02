import { readFileSync } from 'node:fs';

const service = readFileSync('services/saveMigration.ts', 'utf8');
const app = readFileSync('App.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [service, 'migratePlayerSave', 'save migration entrypoint'],
    [service, 'initializeStocks', 'week-1 stock bootstrap'],
    [service, 'saveMigrationVersion', 'migration version stamp'],
    [service, 'worldReactionState', 'world reaction defaults'],
    [service, 'regulatorPressureState', 'regulator pressure defaults'],
    [service, 'rivalRetaliationState', 'rival retaliation defaults'],
    [service, 'acquisitionMarketPulseState', 'market pulse defaults'],
    [app, "import { migratePlayerSave } from './services/saveMigration';", 'App migration import'],
    [app, 'migratePlayerSave(INITIAL_PLAYER', 'fresh game stock bootstrap'],
    [app, 'migratePlayerSave(existingSave', 'slot load migration'],
    [app, 'migratePlayerSave(savedData', 'stored save migration'],
    [packageJson, 'audit:save-migration', 'logic audit script'],
    [packageJson, 'audit:save-migration-ui', 'UI audit script'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Save migration UI audit missing ${description}: ${needle}`);
    }
}

console.log('Save migration UI audit passed.');
