import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Player, WorldStreamingCustomerAccessPolicy } from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { saveStreamingPricingPlan, saveStreamingServiceIdent, saveStreamingStorefrontPlan, getStreamingIdentPurchaseView } from '../services/streamingLaunchProgram';
import { STREAMING_STOREFRONT_LAYOUTS, getStreamingStorefrontLockReason } from '../services/streamingStorefront';
import { createDefaultStreamingInfrastructureDraft, validateStreamingInfrastructureDraft, runStreamingInfrastructureLoadTest, commitStreamingInfrastructureSetup } from '../services/streamingInfrastructure';
import { saveStreamingMarketPlan, beginStreamingMarketClearance } from '../services/streamingMarkets';
import { previewStreamingSharingPolicy } from '../services/streamingSharingPolicy';
import { getStreamingPlatformOfferView } from '../services/streamingPlatformOffer';
import { PlatformOffer } from '../components/streaming-transplant/PlatformOffer';
import { SharingPolicyCard } from '../components/streaming-transplant/SharingPolicyCard';

// Disposable external fixtures only: this audit never reads browser storage or writes saves.
const fixture = process.env.AE_STREAMING_LIVE_FIXTURE || '/tmp/streaming-operations-live.json';
assert.ok(existsSync(fixture), `Provide a live disposable career with AE_STREAMING_LIVE_FIXTURE (missing ${fixture}).`);
const live: Player = JSON.parse(readFileSync(fixture, 'utf8'));
// Match the game's load boundary before comparing in-memory canonical objects.
live.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(live.ownedStreamingPlatform, live.id);
assert.ok(live.ownedStreamingPlatform.launchCommit && live.ownedStreamingPlatform.lifecycle === 'ACTIVE');
const original = JSON.stringify(live);
const groups: string[] = [];
const pass = (name: string) => { groups.push(name); console.log(`PASS ${name}`); };
const protectedHistory = (next: Player) => {
  const before = live.ownedStreamingPlatform;
  const after = next.ownedStreamingPlatform;
  assert.deepEqual(after.launchCommit, before.launchCommit, 'Signed launch and its signature remain immutable');
  assert.deepEqual(after.launchProgram, before.launchProgram, 'Operations do not restart launch or rewrite rehearsal history');
  assert.deepEqual(after.catalogLicenses, before.catalogLicenses, 'Operations do not alter content rights');
  assert.deepEqual(after.localizationOperations, before.localizationOperations, 'Paid localization stays intact');
  assert.deepEqual(next.world, live.world, 'Preview/configuration saves do not settle or bill customers');
  const reloaded = normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(after)), next.id);
  assert.deepEqual(reloaded.serviceConfiguration, after.serviceConfiguration, 'Configuration survives save normalization');
};

const pricing = structuredClone(live.ownedStreamingPlatform.serviceConfiguration.pricing);
assert.ok(pricing.plans.length, 'Live fixture needs at least one subscription plan');
pricing.plans[0].monthly = pricing.plans[0].monthly === 11.49 ? 12.49 : 11.49;
assert.equal(saveStreamingPricingPlan(live, pricing).changed, false, 'Opening-only caller remains guarded');
const priceSaved = saveStreamingPricingPlan(live, pricing, 'OPERATIONS');
assert.equal(priceSaved.changed, true);
assert.equal(priceSaved.player.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].monthly, pricing.plans[0].monthly);
assert.equal(priceSaved.player.ownedStreamingPlatform.treasuryCash, live.ownedStreamingPlatform.treasuryCash);
protectedHistory(priceSaved.player);
assert.equal(saveStreamingPricingPlan(priceSaved.player, pricing, 'OPERATIONS').changed, false, 'Repeated Apply is a no-op');
const emptyPricing = { ...pricing, streams: [], plans: [] };
assert.equal(saveStreamingPricingPlan(live, emptyPricing, 'OPERATIONS').reason, 'INCOMPLETE');
pass('live pricing: explicit save, default guard, no duplicate debit, immutable signed history and reload');

const layout = STREAMING_STOREFRONT_LAYOUTS.find(item => item.id !== live.ownedStreamingPlatform.serviceConfiguration.storefrontLayoutId
  && !getStreamingStorefrontLockReason(live.ownedStreamingPlatform, item.id));
assert.ok(layout, 'Fixture needs another unlocked storefront');
const storefront = saveStreamingStorefrontPlan(live, { storefrontLayoutId: layout.id }, 'OPERATIONS');
assert.equal(storefront.changed, true);
protectedHistory(storefront.player);
assert.equal(storefront.player.ownedStreamingPlatform.treasuryCash, live.ownedStreamingPlatform.treasuryCash);
assert.equal(saveStreamingStorefrontPlan(storefront.player, { storefrontLayoutId: layout.id }, 'OPERATIONS').changed, false);
const lockedLayout = STREAMING_STOREFRONT_LAYOUTS.find(item => getStreamingStorefrontLockReason(live.ownedStreamingPlatform, item.id));
assert.ok(lockedLayout, 'Fixture needs a research-locked storefront');
assert.equal(saveStreamingStorefrontPlan(live, { storefrontLayoutId: lockedLayout.id }, 'OPERATIONS').changed, false);
pass('storefront: unlocked save, research refusal, reload and no treasury/rights changes');

const full = { soundIdentKey: 'ASCENT', identPackageId: 'FULL' } as const;
const paidBefore = getStreamingIdentPurchaseView(live).purchasedPackageIds.includes('FULL');
const ident = saveStreamingServiceIdent(live, full, 'OPERATIONS');
assert.equal(ident.player.ownedStreamingPlatform.treasuryCash, live.ownedStreamingPlatform.treasuryCash - (paidBefore ? 0 : 4_500_000));
protectedHistory(ident.player);
assert.equal(saveStreamingServiceIdent(ident.player, full, 'OPERATIONS').changed, false);
if (!paidBefore) {
  const broke = structuredClone(live); broke.ownedStreamingPlatform.treasuryCash = 1;
  assert.equal(saveStreamingServiceIdent(broke, full, 'OPERATIONS').reason, 'INSUFFICIENT_TREASURY');
}
pass('retained ident service: exactly-once package charge and insufficient-cash refusal');

const draft = createDefaultStreamingInfrastructureDraft(priceSaved.player);
const room = draft.facilities.find(item => item.type === 'CLOUD_ALLOCATION' && item.rackGroups?.length)
  || draft.facilities.find(item => item.rackGroups?.length);
assert.ok(room?.rackGroups.length, 'Live fixture needs a room with rack groups');
room.rackGroups[0].rackCount += 1; room.installedRacks += 1;
draft.lastLoadTestSignature = null;
assert.ok(validateStreamingInfrastructureDraft(priceSaved.player, draft).issues.some(item => item.code === 'LOAD_TEST_REQUIRED'));
const rehearsed = runStreamingInfrastructureLoadTest(priceSaved.player, draft);
const revision = commitStreamingInfrastructureSetup(rehearsed.player);
assert.equal(revision.changed, true, JSON.stringify(revision.issues));
assert.ok(revision.player.ownedStreamingPlatform.pendingInfrastructureSetup, 'Paid change waits for construction');
assert.deepEqual(revision.player.ownedStreamingPlatform.infrastructureSetup, priceSaved.player.ownedStreamingPlatform.infrastructureSetup);
assert.deepEqual(revision.player.ownedStreamingPlatform.serviceConfiguration.pricing, priceSaved.player.ownedStreamingPlatform.serviceConfiguration.pricing);
assert.equal(revision.player.ownedStreamingPlatform.treasuryCash, priceSaved.player.ownedStreamingPlatform.treasuryCash - revision.forecast.transactionCost);
assert.equal(commitStreamingInfrastructureSetup(revision.player).changed, false, 'A second revision cannot charge while construction is pending');
const brokeNetwork = structuredClone(rehearsed.player); brokeNetwork.ownedStreamingPlatform.treasuryCash = 0;
assert.equal(commitStreamingInfrastructureSetup(brokeNetwork).reason, 'INSUFFICIENT_TREASURY');
pass('price change then network revision: exact rehearsal, quoted debit, pending construction, duplicate/cash refusal');

const expansionBase = structuredClone(live);
const country = expansionBase.ownedStreamingPlatform.marketOperations.find(item => item.countryId)?.countryId;
assert.ok(country);
expansionBase.ownedStreamingPlatform.marketOperations = expansionBase.ownedStreamingPlatform.marketOperations.map(item => item.countryId === country ? { ...item, status: 'EXITED' } : item);
expansionBase.energy.current = 100;
const planned = saveStreamingMarketPlan(expansionBase, [country], 'EXPANSION');
assert.equal(planned.changed, true, planned.reason);
const tired = structuredClone(planned.player); tired.energy.current = 0;
assert.equal(beginStreamingMarketClearance(tired, [country], 'EXPANSION').reason, 'INSUFFICIENT_ENERGY');
const brokeMarket = structuredClone(planned.player); brokeMarket.ownedStreamingPlatform.treasuryCash = 0;
const refused = beginStreamingMarketClearance(brokeMarket, [country], 'EXPANSION');
assert.equal(refused.reason, 'INSUFFICIENT_TREASURY');
assert.equal(refused.player.ownedStreamingPlatform.treasuryCash, 0);
const filed = beginStreamingMarketClearance(planned.player, [country], 'EXPANSION');
assert.equal(filed.reason, 'STARTED');
assert.equal(filed.player.ownedStreamingPlatform.treasuryCash, planned.player.ownedStreamingPlatform.treasuryCash - filed.amount);
assert.deepEqual(filed.player.ownedStreamingPlatform.launchCommit, live.ownedStreamingPlatform.launchCommit);
assert.deepEqual(filed.player.ownedStreamingPlatform.launchProgram, live.ownedStreamingPlatform.launchProgram);
assert.equal(beginStreamingMarketClearance(filed.player, [country], 'EXPANSION').changed, false);
pass('market filing: exact debit, energy/cash refusal, duplicate payment prevention and signed launch preservation');

const settledPolicy: WorldStreamingCustomerAccessPolicy = { sharingPosture: 'BALANCED', enforcementInvestment: 'STANDARD', source: 'PLAYER_ACTION', updatedAtAbsoluteWeek: 1 };
const selectedPolicy: WorldStreamingCustomerAccessPolicy = { ...settledPolicy, sharingPosture: 'HOUSEHOLD_ONLY', enforcementInvestment: 'AGGRESSIVE', updatedAtAbsoluteWeek: 2 };
const settled = { paidAccounts: 928_000, sharedHomes: 100_000, accessLoadAccounts: 1_000_000, piracyReach: 10_000 };
const outlook = previewStreamingSharingPolicy(settled, settledPolicy, { sharingPosture: 'REACH_FIRST', enforcementInvestment: 'LIGHT' });
assert.equal(outlook.next.sharedHomes, 240_000, 'New preview uses policy that produced settled figures');
const card = renderToStaticMarkup(<SharingPolicyCard accent="#f00" policy={selectedPolicy} settledPolicy={settledPolicy}
  settled={settled} settledAvailable appliesNextWeek onApply={() => { throw Error('Render cannot save'); }} />);
assert.ok(card.includes('$112K'), 'Pending same-week choice must show the actual settled Standard policing cost');
assert.ok(!card.includes('$375K'), 'Saved future Aggressive policy must not relabel settled cost');
let commits = 0;
renderToStaticMarkup(<PlatformOffer accent="#f00" offer={getStreamingPlatformOfferView(live)} actions={{
  applyPricing: () => { commits++; return { ok: true, message: 'unexpected' }; },
  applyStorefront: () => { commits++; return { ok: true, message: 'unexpected' }; },
  forecast: () => { throw Error('Render cannot run an expensive forecast'); },
}} />);
assert.equal(commits, 0);
pass('staged Offer rendering has no save/forecast side effects; sharing preview uses settled policy');

const largeFixture = process.env.AE_STREAMING_5000_FIXTURE || '/tmp/network-suggestion-5000-player.json';
if (existsSync(largeFixture)) {
  const large: Player = JSON.parse(readFileSync(largeFixture, 'utf8'));
  const normalized = normalizeOwnedStreamingPlatformState(large.ownedStreamingPlatform, large.id);
  assert.ok(normalized.catalogProjectIds.length >= 5_000);
  assert.equal(normalized.catalogLicenses.length, large.ownedStreamingPlatform.catalogLicenses.length);
  const assets = structuredClone(normalized);
  const before = assets.localizationOperations.titleLanguageAssets;
  assets.localizationOperations.titleLanguageAssets = [...before, ...Array.from({ length: 5_000 }, (_, index) => ({
    id: `transplant-${index}`, titleId: `transplant-title-${index}`, languageId: 'hindi', subtitleReady: true, dubReady: false, readyAtAbsoluteWeek: 1,
  }))];
  assert.equal(normalizeOwnedStreamingPlatformState(assets, large.id).localizationOperations.titleLanguageAssets.length, before.length + 5_000);
  pass('5,000-title rights and paid localization records survive normalization');
} else console.log(`SKIP optional 5,000-title fixture: ${largeFixture}`);
assert.equal(JSON.stringify(live), original, 'Every audit action leaves the source fixture immutable');
console.log(JSON.stringify({ passed: groups.length, failed: 0, externalFixture: true }));
