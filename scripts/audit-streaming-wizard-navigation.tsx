import assert from 'node:assert/strict';
import test from 'node:test';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { saveStreamingDefineLaunchDraft, setStreamingDefineLaunchStep } from '../services/streamingLaunchProgram';
import { prepareExternalPlayerUpdateForUi, prepareTrustedMarketUpdateForUi } from '../services/playerUiState';
import { reuseStreamingLaunchProjectionSource } from '../components/StreamingDefineLaunchExperience';

const player = filedMarketFixture();

test('wizard navigation persists the step without rebuilding canonical rights and markets', () => {
  const next = setStreamingDefineLaunchStep(player, 'PRICING');
  assert.equal(next.ownedStreamingPlatform.launchProgram.defineCurrentStep, 'PRICING');
  assert.equal(next.ownedStreamingPlatform.marketOperations, player.ownedStreamingPlatform.marketOperations,
    'free page navigation must preserve the current country/rights snapshot');
  assert.equal(next.ownedStreamingPlatform.catalogLicenses, player.ownedStreamingPlatform.catalogLicenses);
  assert.equal(next.ownedStreamingPlatform.launchProgram.defineDraft, player.ownedStreamingPlatform.launchProgram.defineDraft);
  assert.equal(next.energy, player.energy);
  assert.equal(next.money, player.money);
  assert.equal(next.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash);
});

test('selecting the already saved wizard page is a no-op', () => {
  const step = player.ownedStreamingPlatform.launchProgram.defineCurrentStep;
  assert.equal(setStreamingDefineLaunchStep(player, step), player);
});

test('the persisted navigation step survives the normal save migration boundary', () => {
  const next = setStreamingDefineLaunchStep(player, 'STOREFRONT');
  const reloaded = prepareExternalPlayerUpdateForUi(JSON.parse(JSON.stringify(next)));
  assert.equal(reloaded.ownedStreamingPlatform.launchProgram.defineCurrentStep, 'STOREFRONT');
  assert.equal(reloaded.ownedStreamingPlatform.marketOperations.length, 197);
  assert.equal(reloaded.ownedStreamingPlatform.marketOperations.filter(operation => Boolean(operation.clearance)).length, 197);
});

test('navigation and draft intent alone retain the existing catalogue projection source', () => {
  const stepped = setStreamingDefineLaunchStep(player, 'PRICING');
  assert.equal(reuseStreamingLaunchProjectionSource(player, stepped), player);
  const drafted = {
    ...stepped,
    ownedStreamingPlatform: {
      ...stepped.ownedStreamingPlatform,
      launchProgram: {
        ...stepped.ownedStreamingPlatform.launchProgram,
        defineDraft: { ...stepped.ownedStreamingPlatform.launchProgram.defineDraft, soundId: 'silent' } as any,
      },
    },
  };
  assert.equal(reuseStreamingLaunchProjectionSource(player, drafted), player);
});

test('a persisted navigation update keeps projections warm through the real trusted UI finalizer', () => {
  const current = prepareTrustedMarketUpdateForUi(player);
  const next = prepareTrustedMarketUpdateForUi(setStreamingDefineLaunchStep(current, 'PRICING'));
  assert.equal(reuseStreamingLaunchProjectionSource(current, next), current,
    'UI-only canonicalization must not discard a warm rights/catalogue projection');
});

test('a persisted free draft keeps projections warm and survives a normal reload', () => {
  const current = prepareTrustedMarketUpdateForUi(player);
  const draft = {
    selectedCountryIds: ['US', 'IN'], soundId: 'silent', packageId: 'sting', customAudio: null,
    storefrontId: null, pricing: current.ownedStreamingPlatform.serviceConfiguration.pricing,
    updatedAtAbsoluteWeek: 1259,
  };
  const saved = saveStreamingDefineLaunchDraft(current, draft);
  assert.ok(saved.changed);
  const next = prepareTrustedMarketUpdateForUi(saved.player);
  assert.equal(reuseStreamingLaunchProjectionSource(current, next), current,
    'saving free intent must not rebuild the unchanged canonical catalogue');
  const reopened = prepareExternalPlayerUpdateForUi(JSON.parse(JSON.stringify(next)));
  assert.deepEqual(reopened.ownedStreamingPlatform.launchProgram.defineDraft?.selectedCountryIds, ['US', 'IN']);
  assert.equal(reopened.ownedStreamingPlatform.launchProgram.defineDraft?.soundId, 'silent');
  assert.equal(reopened.ownedStreamingPlatform.launchProgram.defineDraft?.packageId, 'sting');
});

test('rights, markets, pricing, build, world and week updates each invalidate wizard projections', () => {
  const platform = player.ownedStreamingPlatform;
  const changes = [
    { ...player, currentWeek: player.currentWeek + 1 },
    { ...player, world: { ...player.world, streamingRightsContracts: {} } },
    { ...player, energy: { ...player.energy, current: player.energy.current - 5 } },
    { ...player, ownedStreamingPlatform: { ...platform, catalogLicenses: [...platform.catalogLicenses, { id: 'new-rights' } as any] } },
    { ...player, ownedStreamingPlatform: { ...platform, marketOperations: platform.marketOperations.slice(1) } },
    { ...player, ownedStreamingPlatform: { ...platform, serviceConfiguration: { ...platform.serviceConfiguration,
      pricing: { ...platform.serviceConfiguration.pricing, annualDiscount: 17 } } } },
    { ...player, ownedStreamingPlatform: { ...platform, infrastructureSetupDraft: { facilities: [] } as any } },
    { ...player, ownedStreamingPlatform: { ...platform, launchProgram: { ...platform.launchProgram,
      lastBlueprintSignature: 'new-current-definition' } } },
  ];
  for (const changed of changes) assert.equal(reuseStreamingLaunchProjectionSource(player, changed), changed);
});

test('an unrelated future canonical field defaults to invalidation rather than stale rights data', () => {
  const changed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, futureRightsRevision: 1 } };
  assert.equal(reuseStreamingLaunchProjectionSource(player, changed), changed);
});
