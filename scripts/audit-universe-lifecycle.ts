import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    getUniverseLifecycleRevenueMultiplier,
    isUniverseRetired,
    normalizeUniverseForSave,
    rebootRetiredUniverse,
    retireUniverseForArchive
} from '../services/universeLogic';
import { Universe } from '../types';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const baseUniverse = normalizeUniverseForSave({
    id: 'AUDIT_UNIVERSE',
    name: 'Audit Universe',
    description: 'Lifecycle audit fixture',
    studioId: 'PLAYER_STUDIO',
    currentPhase: 'PHASE_2_EXPANSION',
    currentPhaseName: 'Phase 2: Expansion',
    saga: 2,
    currentSagaName: 'Second Saga',
    momentum: 74,
    brandPower: 82,
    marketShare: 12,
    color: '#f59e0b',
    roster: [{ id: 'hero', name: 'The Hero', actorId: 'actor_1', actorName: 'Actor One', status: 'ACTIVE' }],
    slate: [{ id: 'film_1', title: 'Audit Origins', status: 'RELEASED' }],
    products: [{ id: 'product_1', name: 'Audit Collectibles', active: true }],
    stats: { weeklyRevenue: 2_000_000, lifetimeRevenue: 90_000_000 },
    weeksUntilNextPhase: 24
} as unknown as Universe, 'AUDIT_UNIVERSE');

assert.equal(baseUniverse.status, 'ACTIVE', 'legacy universes should normalize as active');
assert.equal(isUniverseRetired(baseUniverse), false);
assert.equal(getUniverseLifecycleRevenueMultiplier(baseUniverse), 1);

const retiredUniverse = retireUniverseForArchive(baseUniverse, 31, 18);
assert.equal(retiredUniverse.id, baseUniverse.id, 'retirement must preserve the universe identity');
assert.equal(retiredUniverse.status, 'RETIRED');
assert.deepEqual(retiredUniverse.roster, baseUniverse.roster, 'retirement must preserve the roster');
assert.deepEqual(retiredUniverse.slate, baseUniverse.slate, 'retirement must preserve canon history');
assert.deepEqual(retiredUniverse.products, baseUniverse.products, 'retirement must preserve licensed products');
assert.equal(retiredUniverse.retiredAt?.year, 31);
assert.equal(retiredUniverse.retiredAt?.week, 18);
assert.equal(retiredUniverse.lifecycleHistory?.at(-1)?.type, 'RETIRED');
assert.equal(getUniverseLifecycleRevenueMultiplier(retiredUniverse), 0.35);

const reboot = rebootRetiredUniverse(retiredUniverse, 'Audit Universe: Reborn', 'ACTION', 34, 7);
assert.equal(reboot.universe.id, retiredUniverse.id, 'a reboot must continue the same universe record');
assert.equal(reboot.universe.status, 'ACTIVE');
assert.equal(reboot.universe.rebootCount, 1);
assert.equal(reboot.universe.lifecycleHistory?.at(-1)?.type, 'REBOOTED');
assert.equal(reboot.script.title, 'Audit Universe: Reborn');
assert.equal(reboot.script.connectedProjectIntent, 'REBOOT');
assert.equal(reboot.script.universeId, retiredUniverse.id);

const developmentLab = [
    read('views/lifestyle/business/components/DevelopmentLabUniverseManager.tsx'),
    read('views/lifestyle/business/components/DevelopmentLabUniverseDashboard.tsx'),
    read('views/lifestyle/business/components/DevelopmentLabUniverseMerch.tsx')
].join('\n');
const greenlight = [
    read('views/lifestyle/business/GreenlightWizard.tsx'),
    read('views/lifestyle/business/greenlightProjectBuilder.ts')
].join('\n');
const homePage = read('views/HomePage.tsx');

assert.match(developmentLab, /universeManager\.legacyArchive/, 'universe manager should expose a legacy archive');
assert.match(developmentLab, /universeDashboard\.action\.retireUniverse/, 'active universe dashboard should offer retirement');
assert.match(developmentLab, /universeDashboard\.action\.launchReboot/, 'retired universe dashboard should offer a reboot');
assert.match(developmentLab, /universeDashboard\.action\.archiveLocked/, 'retired universes should block new merchandise ventures');
assert.match(greenlight, /getUniverseCharacterSelectionOptions/, 'Greenlight should use the shared universe character selection guard');
assert.match(greenlight, /showLegacyCharacterArchive/, 'Greenlight should expose retired characters only through an explicit legacy archive opt-in');
assert.match(greenlight, /isUniverseRetired\(normalizedWorldUniverses/, 'Greenlight should avoid attaching new projects to archived universes');
assert.match(homePage, /Lifecycle Archive Kit/, 'cheat menu should expose a universe lifecycle QA shortcut');
assert.match(homePage, /triggerLegacyCharacterPickerQa/, 'cheat menu should expose a focused legacy character picker QA shortcut');
assert.match(homePage, /Legacy Character Picker QA/, 'cheat menu should label the focused legacy character picker QA shortcut');
assert.match(homePage, /triggerUniverseLifecycleQa/, 'cheat menu should seed universe lifecycle states');

console.log('Universe lifecycle audit passed.');
