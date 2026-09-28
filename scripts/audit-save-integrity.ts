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

// A save signed before audience-choice entitlements joined the manifest must
// still verify against its original seven-field world fingerprint.
const legacySerialize = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.map(legacySerialize).join(',')}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${legacySerialize(record[key])}`).join(',')}}`;
};
const legacyHash = (value: unknown): string => {
    const serialized = legacySerialize(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < serialized.length; index += 1) {
        const code = serialized.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 0x01000193);
        second ^= code + index;
        second = Math.imul(second, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
};
const oldWorldStates = [
    fixture.world.worldPopulation, fixture.world.worldAudienceEconomy,
    fixture.world.worldAudienceParticipation, fixture.world.worldStreamingCompetition,
    fixture.world.worldStreamingCustomers, fixture.world.worldStreamingViewing,
    fixture.world.worldStreamingPlatformEconomy,
].map(state => state ? {
    schemaVersion: state.schemaVersion,
    lastProcessedAbsoluteWeek: state.lastProcessedAbsoluteWeek,
    sourceFingerprint: 'sourceFingerprint' in state ? state.sourceFingerprint : undefined,
    global: state.global,
} : null);
const oldProtected = { ...manifest.protected, worldEconomy: legacyHash(oldWorldStates) };
const { digest: _currentDigest, createdAt: _createdAt, digestSchemaVersion: _oldSchema, ...oldDigestSource } = manifest;
const oldManifest = { ...oldDigestSource, createdAt: manifest.createdAt, protected: oldProtected,
    digest: legacyHash({ ...oldDigestSource, protected: oldProtected }) };
assert.equal(verifySaveIntegrity(fixture, oldManifest).ok, true,
    'a previously signed world-economy generation must remain openable after adding audience choice');
const tamperedOldSave = structuredClone(fixture) as Player;
tamperedOldSave.money -= 1;
assert.equal(verifySaveIntegrity(tamperedOldSave, oldManifest).ok, false,
    'legacy compatibility cannot excuse altered protected money');

// A shipped v1 signer did not cover these later additions, even when the
// payload already carried them. Re-sign its original projection, not the
// current one, and verify that no protected money/project data is excused.
const preExpansionPlayer = structuredClone(fixture) as Player;
preExpansionPlayer.flags.careerArchiveRootDigest = 'legacy-archive-root';
preExpansionPlayer.world.historicalCatalogue = { schemaVersion: 1, sample: 'legacy-library' } as unknown as NonNullable<Player['world']['historicalCatalogue']>;
preExpansionPlayer.world.legacyStreamingRightsHolds = {
    legacy_right: { id: 'legacy-right', status: 'ACTIVE' },
} as unknown as NonNullable<Player['world']['legacyStreamingRightsHolds']>;
const expandedManifest = createSaveIntegrityManifest(preExpansionPlayer, 'PROCESS_WEEK', 123);
const {
    archiveRootDigest: _oldArchiveRoot,
    legacyStreamingRightsHolds: _oldHolds,
    historicalCatalogue: _oldCatalogue,
    ...preExpansionProtected
} = expandedManifest.protected;
const { digest: _expandedDigest, createdAt: _expandedAt, digestSchemaVersion: _expandedSchema, ...preExpansionCore } = expandedManifest;
const shippedV1Protected = { ...preExpansionProtected, worldEconomy: legacyHash(oldWorldStates) };
const shippedV1Manifest = {
    ...preExpansionCore,
    createdAt: expandedManifest.createdAt,
    protected: shippedV1Protected,
    digest: legacyHash({ ...preExpansionCore, protected: shippedV1Protected }),
};
assert.equal(verifySaveIntegrity(preExpansionPlayer, shippedV1Manifest).ok, true,
    'a save signed before archive, historical catalogue, and rights protection must still open');
const tamperedPreExpansion = structuredClone(preExpansionPlayer) as Player;
tamperedPreExpansion.pastProjects.pop();
assert.equal(verifySaveIntegrity(tamperedPreExpansion, shippedV1Manifest).ok, false,
    'legacy projection must still reject lost projects');

// The rollout that introduced those fields also signed them as unversioned v1.
// Its saves must stay valid alongside the older v1 projection.
const { digest: _rolloutDigest, createdAt: _rolloutAt, digestSchemaVersion: _rolloutSchema, ...rolloutCore } = expandedManifest;
const rolloutV1Manifest = {
    ...rolloutCore,
    createdAt: expandedManifest.createdAt,
    digest: legacyHash(rolloutCore),
};
assert.equal(verifySaveIntegrity(preExpansionPlayer, rolloutV1Manifest).ok, true,
    'the current rollout v1 signature must remain openable');
const tamperedRollout = structuredClone(preExpansionPlayer) as Player;
(tamperedRollout.world.historicalCatalogue as unknown as Record<string, unknown>).sample = 'changed-library';
assert.equal(verifySaveIntegrity(tamperedRollout, rolloutV1Manifest).ok, false,
    'current-rollout v1 must still protect its historical catalogue');

assert.equal(expandedManifest.digestSchemaVersion, 2,
    'new signatures must identify their projection so future fields cannot silently change it');
const wrongSchema = { ...expandedManifest, digestSchemaVersion: 99 };
assert.equal(verifySaveIntegrity(preExpansionPlayer, wrongSchema).ok, false,
    'unknown future protected schemas must not be treated as legacy saves');

// This fixed payload pins schema 2 independently of INITIAL_PLAYER. If a
// future release changes its protected projection, it must introduce a new
// schema and keep the schema-2 verifier rather than silently rewriting it.
const pinnedV2Player = {
    id: 'pinned-schema-two', name: 'Pinned Career', age: 30, currentWeek: 12,
    money: 1_200, stats: { fame: 2 }, flags: { saveMigrationVersion: 3, careerArchiveRootDigest: 'fixture-root' },
    pastProjects: [{ id: 'film-one' }],
    world: {
        studios: {}, platforms: {}, universes: {}, industryProductions: {}, streamingRightsContracts: {},
        historicalCatalogue: { schemaVersion: 1, sample: 'library' },
        legacyStreamingRightsHolds: { hold_one: { id: 'hold-one', status: 'ACTIVE' } },
    },
    ownedStreamingPlatform: { id: 'stream-one', name: 'Empire+', lifecycle: 'ACTIVE', treasuryCash: 500, catalogLicenses: [] },
} as unknown as Player;
const pinnedV2Manifest = createSaveIntegrityManifest(pinnedV2Player, 'AUTOSAVE', 456);
assert.equal(pinnedV2Manifest.digest, 'a9c2c9234e13ad16',
    'schema 2 signature must stay stable for saves already issued under this schema');
const {
    archiveRootDigest: _pinnedRoot,
    historicalCatalogue: _pinnedCatalogue,
    legacyStreamingRightsHolds: _pinnedHolds,
    ...pinnedV1Base
} = pinnedV2Manifest.protected;
const pinnedV1Protected = { ...pinnedV1Base, worldEconomy: legacyHash(Array(7).fill(null)) };
const { digest: _pinnedDigest, createdAt: _pinnedCreatedAt, digestSchemaVersion: _pinnedSchema, ...pinnedV1Core } = pinnedV2Manifest;
const pinnedV1Manifest = {
    ...pinnedV1Core,
    createdAt: pinnedV2Manifest.createdAt,
    protected: pinnedV1Protected,
    digest: legacyHash({ ...pinnedV1Core, protected: pinnedV1Protected }),
};
assert.equal(pinnedV1Manifest.digest, 'f4797cbb1dd02c95',
    'the shipped v1 protected projection must remain frozen');
assert.equal(verifySaveIntegrity(pinnedV2Player, pinnedV1Manifest).ok, true,
    'a future update must still verify the pinned v1 signature');

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
