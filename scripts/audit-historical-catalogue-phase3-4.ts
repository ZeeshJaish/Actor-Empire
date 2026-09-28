import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getHistoricalCatalogueTitles, getSavedReleasedHistoricalTitleIds, resolveHistoricalCatalogueTitle } from '../services/historicalCatalogue';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingLicenseCandidatePool, resolveStreamingCatalogTitle } from '../services/streamingCatalog';
import { generateFullBallot, resolveCanonicalAwardSeason } from '../services/awardLogic';
import { processGameWeek } from '../services/gameLoop';
import { compareProtectedSaveState, createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';

const localValues = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => localValues.get(key) ?? null,
        setItem: (key: string, value: string) => localValues.set(key, value),
        removeItem: (key: string) => localValues.delete(key),
        clear: () => localValues.clear(),
    },
});

const fresh = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.id = 'historical-catalogue-fixture';
    player.age = 30;
    player.currentWeek = 12;
    player.money = 765_432_100;
    return player;
};

const raw = fresh();
const migrated = migratePlayerSave(raw);
assert.equal(migrated.world.historicalCatalogue?.seededCount, 2_000,
    'a new save needs a stable recipe for 2,000 historical titles');
assert.equal(migrated.world.projects.length, raw.world.projects.length,
    'the historical library must not be written into the hot world-project array');
assert.equal(migrated.money, raw.money, 'initializing history must not charge the player');
assert.deepEqual(migrated.world.awardHistory, raw.world.awardHistory,
    'initializing history must not invent prior awards');

const resolvedTitles = getHistoricalCatalogueTitles(migrated);
const originalBatch = resolvedTitles.filter(title => title.id.startsWith('historical_v1_'));
assert.equal(originalBatch.length, 2_000, 'the original v1 recipe must still resolve all 2,000 titles');
assert.equal(new Set(resolvedTitles.map((title: any) => title.id)).size, resolvedTitles.length,
    'every historical title needs a stable distinct identity');
assert.equal(originalBatch.filter((title: any) => title.projectType === 'SERIES').length, 300,
    'the initial seed mix should contain fifteen percent series');
assert.ok(resolvedTitles.every((title: any) => getAbsoluteWeek(title.year, title.weekReleased)
    <= migrated.world.historicalCatalogue!.initializedAtAbsoluteWeek),
    'a generated historical title cannot be released in the future');
assert.ok(resolvedTitles.every((title: any) => title.rating >= 1 && title.rating <= 10
    && title.quality >= 0 && title.quality <= 100),
    'seeded public ratings and quality must stay inside game bounds');
assert.ok(resolvedTitles.every(title => title.rightsHolderId === title.studioId),
    'seeded producer/rights-holder identity must be explicit without creating a licence');
assert.ok(new Set(resolvedTitles.map((title: any) => title.studioId)).size > 8,
    'historical production should be distributed among many producers');
assert.ok(resolvedTitles.every(title => {
    const producer = migrated.world.historicalCatalogue!.producerRoster
        .find(candidate => candidate.id === title.studioId);
    return !producer?.earliestYear || title.year >= producer.earliestYear;
}), 'a producer must not receive titles from before its in-world history');
assert.ok(resolvedTitles.filter(title => title.provenance === 'SEEDED_HISTORY'
    && migrated.world.historicalCatalogue!.producerRoster.some(producer =>
        producer.id === title.studioId && producer.archetype === 'PLATFORM'))
    .every(title => title.year >= 22),
    'platform studios in an age-30 save should not own decades-old seed productions');
const firstSeededTitle = resolvedTitles[0];
const firstSeededName = firstSeededTitle.title;
try { (firstSeededTitle as any).title = 'Tampered outside resolver'; } catch { /* immutable record */ }
assert.equal(resolveHistoricalCatalogueTitle(migrated, firstSeededTitle.id)?.title, firstSeededName,
    'a consumer must not be able to mutate the shared fictional baseline');

const savedRaw = fresh();
savedRaw.world.projects = [{
    id: 'saved-world-title', title: 'The Same Name', year: 29, weekReleased: 8,
    mediaType: 'MOVIE', genre: 'DRAMA', studioId: 'PARAMOUNT', budgetTier: 'MID',
    quality: 88, rating: 8.7, boxOffice: 82_000_000,
    originalLanguageId: 'english', rightsHolderId: 'saved-underlying-rights-holder',
    leadActorId: 'saved-actor',
    leadActorName: 'Saved Actor', directorName: 'Saved Director', reviews: 'Saved result',
} as any];
savedRaw.pastProjects = [{
    id: 'saved-world-title', name: 'An Old Duplicate Projection', year: 29,
    releaseYear: 29, releaseWeek: 8, type: 'ACTING_GIG', projectType: 'MOVIE',
    studioId: 'PARAMOUNT', genre: 'DRAMA', rating: 5.2,
}, {
    id: 'different-saved-title', name: 'The Same Name', year: 28,
    releaseYear: 28, releaseWeek: 12, type: 'ACTING_GIG', projectType: 'MOVIE',
    studioId: 'UNIVERSAL', genre: 'DRAMA', rating: 7.2,
} as any] as any;
const savedMigrated = migratePlayerSave(savedRaw);
assert.equal(savedMigrated.world.historicalCatalogue?.savedTitleCountAtInitialization, 2,
    'duplicate IDs merge, but equal names do not');
assert.equal(savedMigrated.world.historicalCatalogue?.seededCount, 1_998);
const savedTitles = getHistoricalCatalogueTitles(savedMigrated);
assert.equal(savedTitles.filter(title => !title.catalogueTier).length, 2_000);
const worldTitle = resolveHistoricalCatalogueTitle(savedMigrated, 'saved-world-title');
assert.equal(worldTitle?.title, 'The Same Name', 'the canonical saved world result wins');
assert.equal(worldTitle?.rating, 8.7, 'a stored public rating cannot be overwritten by inference');
assert.equal(worldTitle?.rightsHolderId, 'saved-underlying-rights-holder',
    'recorded underlying ownership must stay distinct from the producer');
assert.equal(worldTitle?.provenance, 'SAVED_RELEASE');
assert.equal(worldTitle?.inferredFields.includes('budgetTier'), false,
    'an explicitly saved budget tier is not inferred');
const olderPastTitle = resolveHistoricalCatalogueTitle(savedMigrated, 'different-saved-title');
assert.ok(olderPastTitle?.inferredFields.includes('budgetTier')
    && olderPastTitle.inferredFields.includes('reach')
    && olderPastTitle.inferredFields.includes('prestige')
    && olderPastTitle.inferredFields.includes('regionId'),
    'an old saved result must label derived metadata instead of implying it was recorded');
assert.equal(resolveHistoricalCatalogueTitle(savedMigrated, 'different-saved-title')?.id,
    'different-saved-title');

const seedId = savedTitles.find(title => title.provenance === 'SEEDED_HISTORY')!.id;
assert.equal(resolveStreamingCatalogTitle(savedMigrated, seedId)?.id, seedId,
    'the existing title lookup should resolve a seed identity for downstream consumers');
assert.equal(getStreamingLicenseCandidatePool(savedMigrated)
    .some(title => title.id === seedId), true,
    'Phase 5 makes the immutable seed identity eligible for rights-aware market selection');
assert.ok(JSON.stringify(savedMigrated.world.historicalCatalogue).length < 15_000,
    'the persisted recipe must stay compact instead of saving 2,000 full title records');

const replay = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(savedMigrated))));
assert.deepEqual(replay.world.historicalCatalogue, savedMigrated.world.historicalCatalogue,
    'save/reopen and compaction must retain the exact recipe');
assert.equal(verifySaveIntegrity(savedMigrated,
    createSaveIntegrityManifest(savedMigrated, 'MIGRATION')).ok, true);
const recipeDropped = structuredClone(savedMigrated);
delete recipeDropped.world.historicalCatalogue;
assert.equal(compareProtectedSaveState(savedMigrated, recipeDropped).ok, false,
    'compaction must not silently discard the versioned catalogue recipe');
assert.throws(() => migratePlayerSave(recipeDropped), /historical catalogue/i,
    'a new-format save missing its recipe must fail instead of rerolling it');
assert.deepEqual(getHistoricalCatalogueTitles(replay), savedTitles,
    'the resolved fictional library must be identical after reopen');
const prunedSave = structuredClone(savedMigrated);
prunedSave.world.projects = [];
prunedSave.pastProjects = prunedSave.pastProjects.filter(project => project.id !== 'saved-world-title');
const prunedMigrated = migratePlayerSave(prunedSave);
assert.equal(prunedMigrated.world.historicalCatalogue?.seededCount, 1_999,
    'retention of old world projects must not shrink the resolved library below 2,000');
assert.equal(getHistoricalCatalogueTitles(prunedMigrated).filter(title => !title.catalogueTier).length, 2_000);
assert.deepEqual(getHistoricalCatalogueTitles(prunedMigrated)
    .filter(title => title.id.startsWith('historical_v1_')).slice(0, 1_998),
    savedTitles.filter(title => title.id.startsWith('historical_v1_')),
    'a later appended seed must not reroll previously generated titles');
const later = structuredClone(savedMigrated);
later.currentWeek += 1;
later.world.studios!.PARAMOUNT.name = 'Renamed Paramount';
assert.deepEqual(getHistoricalCatalogueTitles(later)
    .filter(title => title.id.startsWith('historical_v1_')),
    savedTitles.filter(title => title.id.startsWith('historical_v1_')),
    'week progression and studio renames must not reroll old seed records');

const unsupported = structuredClone(savedMigrated);
(unsupported.world.historicalCatalogue as any).generatorVersion = 999;
assert.throws(() => migratePlayerSave(unsupported), /historical catalogue/i,
    'unknown generator versions must fail visibly, not erase the library');

const futureProduction = fresh();
futureProduction.world.industryProductions = {
    'future-production': {
        id: 'future-production', canonicalProjectId: 'not-released-yet',
        title: 'Future Production', status: 'RELEASED',
        updatedAtAbsoluteWeek: getAbsoluteWeek(futureProduction.age, futureProduction.currentWeek) + 4,
        productionCalendar: { startedAbsoluteWeek: 1_400 },
    } as any,
};
assert.equal(getSavedReleasedHistoricalTitleIds(futureProduction).has('not-released-yet'), false,
    'a future-dated production cannot count as a released saved title');

const awardsFixture = migrated;
const currentBallot = generateFullBallot(awardsFixture, 'GOLDEN_GLOBE', [], 31);
const currentNominees = Object.values(currentBallot).flat();
const seededNominees = currentNominees.filter(nomination =>
    nomination.project.id.startsWith('historical_v1_'));
assert.ok(seededNominees.length > 0,
    'a new unresolved ballot should be able to nominate eligible seeded releases');
seededNominees.forEach(nomination => {
    const title = resolveHistoricalCatalogueTitle(awardsFixture, nomination.project.id);
    assert.equal(title?.year, 30, 'film awards in age-year 31 must use prior-year releases');
    assert.ok(title && getAbsoluteWeek(title.year, title.weekReleased)
        <= getAbsoluteWeek(awardsFixture.age, awardsFixture.currentWeek));
});

const emmyBallot = generateFullBallot(awardsFixture, 'EMMY', [], 30);
const emmySeedIds = Object.values(emmyBallot).flat()
    .map(nomination => nomination.project.id)
    .filter(id => id.startsWith('historical_v1_'));
assert.ok(emmySeedIds.length > 0, 'an unresolved Emmy ballot should see eligible seeded series');
emmySeedIds.forEach(id => {
    const title = resolveHistoricalCatalogueTitle(awardsFixture, id)!;
    assert.equal(title.projectType, 'SERIES');
    assert.ok(title.year === 29 || title.year === 30);
    assert.ok(getAbsoluteWeek(title.year, title.weekReleased)
        <= getAbsoluteWeek(awardsFixture.age, awardsFixture.currentWeek));
});

const resolvedHistory = {
    year: 30, type: 'GOLDEN_GLOBE' as const,
    winners: [{ category: 'Best Motion Picture', winnerName: 'Saved Winner',
        projectName: 'Saved Picture', projectId: 'saved-winner', isPlayer: false }],
};
const alreadyResolved = structuredClone(awardsFixture);
alreadyResolved.world.awardHistory.push(resolvedHistory);
assert.deepEqual(resolveCanonicalAwardSeason(alreadyResolved, 'GOLDEN_GLOBE', 30), resolvedHistory,
    'an already-resolved ceremony must retain its saved result exactly');
assert.equal(Object.values(generateFullBallot(alreadyResolved, 'GOLDEN_GLOBE', [], 30)).flat()
    .some(nomination => nomination.project.id.startsWith('historical_v1_')), false,
    'a resolved ceremony cannot receive new seeded nominees');

const frozenSeedNominee = seededNominees[0];
const ceremonyWithFrozenBallot = structuredClone(awardsFixture);
ceremonyWithFrozenBallot.age = 31;
ceremonyWithFrozenBallot.currentWeek = 2;
ceremonyWithFrozenBallot.scheduledEvents.push({
    id: 'frozen-historical-ceremony', week: 2, type: 'AWARD_CEREMONY',
    title: 'Golden Globes', description: '',
    data: { awardDef: { type: 'GOLDEN_GLOBE' }, awardYear: 31,
        fullBallot: { [frozenSeedNominee.category]: [{ ...frozenSeedNominee, score: 100 }] } },
} as any);
const frozenHistory = resolveCanonicalAwardSeason(ceremonyWithFrozenBallot, 'GOLDEN_GLOBE', 31);
assert.equal(frozenHistory.winners.find(winner => winner.category === frozenSeedNominee.category)?.projectId,
    frozenSeedNominee.project.id,
    'a frozen eligible seed nomination must remain able to win when the ceremony is resolved');
const broadcastResult = await processGameWeek(ceremonyWithFrozenBallot);
assert.equal(broadcastResult.player.world.awardHistory
    .find(entry => entry.type === 'GOLDEN_GLOBE' && entry.year === 31)?.winners
    .find(winner => winner.category === frozenSeedNominee.category)?.projectId,
    frozenSeedNominee.project.id,
    'a non-player ceremony must retain its invitation ballot through week processing');

assert.equal(Object.values(generateFullBallot(awardsFixture, 'GOLDEN_GLOBE', [], 29)).flat()
    .some(nomination => nomination.project.id.startsWith('historical_v1_')), false,
    'seeded history must not retroactively enter earlier award years');
assert.equal(Object.values(generateFullBallot(awardsFixture, 'GOLDEN_GLOBE', [], 30)).flat()
    .some(nomination => nomination.project.id.startsWith('historical_v1_')), false,
    'a ceremony whose invitation passed before library initialization stays closed');

console.log('Historical catalogue Phase 3–4 audit passed.');
