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

const developmentLab = read('views/lifestyle/business/DevelopmentLab.tsx');
const greenlight = read('views/lifestyle/business/GreenlightWizard.tsx');
const homePage = read('views/HomePage.tsx');

assert.match(developmentLab, /Legacy Archive/, 'universe manager should expose a legacy archive');
assert.match(developmentLab, /Retire Universe/, 'active universe dashboard should offer retirement');
assert.match(developmentLab, /Launch Reboot/, 'retired universe dashboard should offer a reboot');
assert.match(developmentLab, /Archive Locked/, 'retired universes should block new merchandise ventures');
assert.match(greenlight, /universe\.status !== 'RETIRED'/, 'Greenlight should exclude archived universes');
assert.match(homePage, /Lifecycle Archive Kit/, 'cheat menu should expose a universe lifecycle QA shortcut');
assert.match(homePage, /triggerUniverseLifecycleQa/, 'cheat menu should seed universe lifecycle states');

console.log('Universe lifecycle audit passed.');
