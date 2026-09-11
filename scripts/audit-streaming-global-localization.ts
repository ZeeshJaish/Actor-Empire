import assert from 'node:assert/strict';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { linkContentMarketOwnedTitles } from '../services/streamingContentMarket';
import { activateStreamingLanguagePackage, getStreamingGlobalLocalizationView } from '../services/streamingGlobalLocalization';
import { getStreamingTechnologyWeeklyCost } from '../services/streamingTechnologyCampus';

const installed = (capabilityId: string) => ({
    capabilityId,
    branch: 'CONTENT_OPERATIONS' as const,
    status: 'OPERATING' as const,
    installedAtAbsoluteWeek: 1,
    sourceProjectId: null,
    legacyLevelFloor: 0,
});

let player = contentMarketFixture();
const linked = linkContentMarketOwnedTitles(player, ['owned-cm1']);
assert.ok(linked.changed, linked.detail);
player = linked.player;
player.ownedStreamingPlatform.capabilities.installed = [
    installed('LOCALIZATION_FOUNDATION'),
    installed('SUBTITLE_OPERATIONS_L1'),
    installed('LANGUAGE_PACKAGE:INDIA_CORE'),
];
assert.equal(player.ownedStreamingPlatform.localizationOperations.jobs.length, 0);
assert.equal(player.ownedStreamingPlatform.localizationOperations.titleLanguageAssets.length, 0);

const subtitles = getStreamingOpeningCatalogueView(player);
assert.ok(subtitles.titles.length > 0, 'Fixture must contain catalogue titles.');
assert.ok(subtitles.titles.every(title => title.subtitleLanguagesReady.includes('Hindi')),
    'Installing subtitle operations and India languages must cover every catalogue title without title jobs.');
assert.ok(subtitles.titles.every(title => !title.dubLanguagesReady.includes('Hindi')),
    'Subtitle research must not silently grant dubbing.');

player.ownedStreamingPlatform.capabilities.installed.push(
    installed('DUBBING_OPERATIONS_L1'),
    installed('DUBBING_OPERATIONS_L2'),
);
const dubbed = getStreamingOpeningCatalogueView(player);
assert.ok(dubbed.titles.every(title => title.dubLanguagesReady.includes('Hindi')),
    'Installing dubbing operations must cover every catalogue title in an active language package.');
assert.equal(player.ownedStreamingPlatform.localizationOperations.jobs.length, 0,
    'Global localization must not create one job per title.');
assert.equal(player.ownedStreamingPlatform.localizationOperations.titleLanguageAssets.length, 0,
    'Global localization must not duplicate every title-language combination in the save.');

let activationPlayer = contentMarketFixture();
activationPlayer.ownedStreamingPlatform.capabilities.installed = [installed('LOCALIZATION_FOUNDATION')];
const activationCash = activationPlayer.ownedStreamingPlatform.treasuryCash;
const activated = activateStreamingLanguagePackage(activationPlayer, 'INDIA_CORE');
assert.ok(activated.changed, activated.detail);
assert.equal(activated.player.ownedStreamingPlatform.treasuryCash, activationCash - 9_000_000,
    'A language network must charge its one-time activation cost exactly once.');
assert.ok(activated.player.ownedStreamingPlatform.capabilities.installed.some(item => item.capabilityId === 'LANGUAGE_PACKAGE:INDIA_CORE'));
assert.equal(getStreamingTechnologyWeeklyCost(activated.player.ownedStreamingPlatform), 145_000,
    'An active language network must enter the canonical weekly platform cost.');
const localizationView = getStreamingGlobalLocalizationView(activated.player);
assert.equal(localizationView.packages.find(item => item.id === 'INDIA_CORE')?.active, true);
assert.equal(localizationView.activeLanguageCount, 4);
const duplicate = activateStreamingLanguagePackage(activated.player, 'INDIA_CORE');
assert.equal(duplicate.changed, false, 'An active language network cannot be purchased twice.');
assert.equal(duplicate.player.ownedStreamingPlatform.treasuryCash, activated.player.ownedStreamingPlatform.treasuryCash);

player.pastProjects.push({ id: 'owned-cm1-future', name: 'Tomorrow Archive', studioId: 'cm1-studio', projectType: 'MOVIE', genre: 'COMEDY', imdbRating: 7.8 } as any);
const futureLinked = linkContentMarketOwnedTitles(player, ['owned-cm1-future']);
assert.ok(futureLinked.changed, futureLinked.detail);
assert.ok(getStreamingOpeningCatalogueView(futureLinked.player).titles
    .find(title => title.projectId === 'owned-cm1-future')?.dubLanguagesReady.includes('Hindi'),
    'A title added after localization research must inherit the operating language capability.');

console.log('Global research-driven localization covers the catalogue without per-title jobs.');
