import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    compareProtectedSaveState,
    createSaveIntegrityManifest,
    verifySaveIntegrity,
} from '../services/saveIntegrity';

const fixture = structuredClone(INITIAL_PLAYER) as Player;
fixture.id = 'integrity-player';
fixture.name = 'Empire Studios';
fixture.age = 82;
fixture.currentWeek = 41;
fixture.money = 987_654_321;
fixture.flags = {
    ...fixture.flags,
    premiumPurchases: ['empire_plus'],
};
fixture.pastProjects = [
    { id: 'project-legacy-hit', title: 'Legacy Hit' } as unknown as Player['pastProjects'][number],
    { id: 'project-modern-hit', title: 'Modern Hit' } as unknown as Player['pastProjects'][number],
];
fixture.commitments = [{ id: 'commitment-live', title: 'Live Film' } as unknown as Player['commitments'][number]];
fixture.activeReleases = [{ id: 'release-live', projectId: 'project-modern-hit' } as unknown as Player['activeReleases'][number]];
fixture.businesses = [{ id: 'business-studio', name: 'Empire Studios', balance: 444_000_000 } as Player['businesses'][number]];
fixture.portfolio = [{ stockId: 'stock-media', shares: 12, averageCost: 50, totalInvested: 600 }];
fixture.finance.loans = [{ id: 'loan-active', principal: 10_000, status: 'ACTIVE' } as Player['finance']['loans'][number]];
fixture.studio.talentRoster = [{ id: 'talent-contract', npcId: 'actor-one', status: 'ACTIVE' } as Player['studio']['talentRoster'][number]];
fixture.awards = [{ id: 'award-oscar', name: 'The Oscars' } as Player['awards'][number]];
fixture.relationships = [{ id: 'relationship-family', name: 'Ari Empire' } as Player['relationships'][number]];
fixture.bloodline = [{ id: 'child-1', name: 'Nova Empire' } as NonNullable<Player['bloodline']>[number]];
fixture.world.universes = { universe_one: { id: 'universe-one', name: 'Empire Saga' } } as unknown as Player['world']['universes'];
fixture.world.industryProductions = {
    production_live: { id: 'production-live', status: 'IN_PRODUCTION' },
    production_done: { id: 'production-done', status: 'DELIVERED' },
} as unknown as Player['world']['industryProductions'];
fixture.world.streamingRightsContracts = {
    right_live: { id: 'right-live', status: 'ACTIVE' },
    right_old: { id: 'right-old', status: 'EXPIRED' },
} as unknown as Player['world']['streamingRightsContracts'];
fixture.ownedStreamingPlatform = {
    ...fixture.ownedStreamingPlatform,
    id: 'empire-stream',
    name: 'Empire+',
    lifecycle: 'ACTIVE',
    catalogLicenses: [{ id: 'owned-license-1' }],
} as unknown as Player['ownedStreamingPlatform'];

const manifest = createSaveIntegrityManifest(fixture, 'PROCESS_WEEK');
assert.equal(manifest.playerId, 'integrity-player');
assert.equal(manifest.reason, 'PROCESS_WEEK');
assert.equal(manifest.protected.pastProjects.count, 2);
assert.equal(manifest.protected.activeRights.count, 1, 'Only active canonical rights are protected forever.');
assert.equal(manifest.protected.activeProductions.count, 1, 'Only unresolved productions are protected forever.');
assert.equal(manifest.protected.portfolio.count, 1);
assert.equal(manifest.protected.activeLoans.count, 1);
assert.equal(manifest.protected.studioTalent.count, 1);
assert.equal(verifySaveIntegrity(fixture, manifest).ok, true);

const boundedHistory = structuredClone(fixture) as Player;
boundedHistory.news = [];
boundedHistory.logs = [];
boundedHistory.instagram.feed = [];
delete (boundedHistory.world.streamingRightsContracts as Record<string, unknown>).right_old;
delete (boundedHistory.world.industryProductions as Record<string, unknown>).production_done;
assert.deepEqual(compareProtectedSaveState(fixture, boundedHistory), { ok: true });

const lostProject = structuredClone(fixture) as Player;
lostProject.pastProjects = lostProject.pastProjects.slice(1);
const projectComparison = compareProtectedSaveState(fixture, lostProject);
assert.equal(projectComparison.ok, false);
assert.ok(!projectComparison.ok && projectComparison.violations.includes('pastProjects identities changed'));

const changedMoney = structuredClone(fixture) as Player;
changedMoney.money -= 1;
const moneyComparison = compareProtectedSaveState(fixture, changedMoney);
assert.equal(moneyComparison.ok, false);
assert.ok(!moneyComparison.ok && moneyComparison.violations.includes('player money changed'));

const corrupt = structuredClone(fixture) as Player;
corrupt.money = Number.NaN;
assert.equal(verifySaveIntegrity(corrupt, manifest).ok, false, 'Non-finite canonical money must fail integrity.');

const corruptBusiness = structuredClone(fixture) as Player;
corruptBusiness.businesses[0].balance = Number.NaN;
const corruptBusinessManifest = createSaveIntegrityManifest(corruptBusiness, 'AUTOSAVE');
assert.equal(verifySaveIntegrity(corruptBusiness, corruptBusinessManifest).ok, false, 'Non-finite business money must fail even with a matching digest.');

const wrongManifest = { ...manifest, digest: 'tampered' };
assert.equal(verifySaveIntegrity(fixture, wrongManifest).ok, false, 'A manifest digest mismatch must fail integrity.');

console.log('Save integrity audit passed.');
