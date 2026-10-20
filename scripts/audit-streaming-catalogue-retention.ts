import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { Player } from '../types';
import { normalizeOwnedStreamingPlatformState, compactOwnedStreamingPlatformForPersistence } from '../services/ownedStreamingPlatform';
import { migratePlayerSave } from '../services/saveMigration';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';
import { streamingCatalogueStressFixture } from './helpers/streamingCatalogueStressFixture';
import { advanceStreamingBuyerAuction } from '../services/streamingBuyerAuctions';
import { getStreamingPaidScoutQuote, refreshStreamingPaidScout } from '../services/paidMarketScouting';
import { getStreamingOpportunityCards, purchaseStreamingOpportunityOffer } from '../services/streamingOpportunityMarket';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { getContentMarketListings, isContentMarketAuctionListing, purchaseContentMarketListing } from '../services/streamingContentMarket';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';

const fixturePath = process.argv.find(arg => arg.startsWith('--fixture='))?.slice('--fixture='.length);
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, 'utf8')) as Player : streamingCatalogueStressFixture().player;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const platform = fixture.ownedStreamingPlatform;
const licenseIds = (licenses: typeof platform.catalogLicenses) => licenses.map(license => license.id).sort();
const sourceIds = (licenses: typeof platform.catalogLicenses) => [...new Set(licenses.map(license => license.sourceProjectId))].sort();

for (const count of [1000, 1001, 1040]) {
  test(`${count} valid durable licences and title references survive normalization and compaction`, () => {
    const licenses = platform.catalogLicenses.slice(0, count);
    assert.equal(licenses.length, count);
    const input = { ...platform, catalogLicenses: licenses, catalogProjectIds: sourceIds(licenses),
      starterCatalog: { ...platform.starterCatalog!, ownedProjectIds: [], licensedProjectIds: sourceIds(licenses) } };
    const normalized = normalizeOwnedStreamingPlatformState(input, fixture.id);
    const compacted = compactOwnedStreamingPlatformForPersistence(normalized, fixture.id);
    for (const result of [normalized, compacted]) {
      assert.deepEqual(licenseIds(result.catalogLicenses), licenseIds(licenses), 'normalization must not delete acquired entitlements');
      assert.deepEqual([...result.catalogProjectIds].sort(), sourceIds(licenses));
      assert.deepEqual([...result.starterCatalog!.licensedProjectIds].sort(), sourceIds(licenses));
      assert.equal(result.treasuryCash, platform.treasuryCash);
      for (const license of licenses) {
        const retained = result.catalogLicenses.find(row => row.id === license.id)!;
        assert.equal(retained.minimumGuarantee, license.minimumGuarantee);
        assert.equal(retained.startsAtAbsoluteWeek, license.startsAtAbsoluteWeek);
        assert.equal(retained.expiresAtAbsoluteWeek, license.expiresAtAbsoluteWeek);
        assert.equal(retained.status, license.status);
        assert.deepEqual(retained.accessGrant, license.accessGrant);
      }
    }
  });
}

test('validated local licences restore missing catalogue references without creating grants', () => {
  const source = platform.catalogLicenses.slice(0, 3);
  const input = { ...platform, catalogLicenses: source, catalogProjectIds: [], starterCatalog: null };
  const result = normalizeOwnedStreamingPlatformState(input, fixture.id);
  assert.deepEqual([...result.catalogProjectIds].sort(), sourceIds(source));
  assert.equal(result.catalogLicenses.length, source.length);
  assert.equal(result.catalogLicenses.find(row => row.id === source[0].id)!.expiresAtAbsoluteWeek, source[0].expiresAtAbsoluteWeek);
});

test('durable country scope retains all 197 countries and explicit legacy strings without a count cap', () => {
  const countryIds = WORLD_COUNTRY_DEFINITIONS.map(country => country.id);
  const input = { ...platform, catalogLicenses: [{ ...platform.catalogLicenses[0], countryIds: [...countryIds, 'UNKNOWN', ' us ', null, 5] }],
    catalogProjectIds: [], starterCatalog: null };
  const result = normalizeOwnedStreamingPlatformState(input, fixture.id);
  assert.equal(result.catalogLicenses.length, 1);
  assert.deepEqual([...result.catalogLicenses[0].countryIds].sort(), [...countryIds, 'UNKNOWN', 'us'].sort());
});

test('malformed licence rows without valid local identity cannot become entitlements', () => {
  const valid = platform.catalogLicenses[0];
  const invalid = [null, [], {}, { ...valid, id: '' }, { ...valid, sourceProjectId: ' ' }];
  const result = normalizeOwnedStreamingPlatformState({ ...platform, starterCatalog: null, catalogProjectIds: ['  real-title  ', '', null, 123, {}, 'real-title'],
    catalogLicenses: [...invalid, valid, valid] }, fixture.id);
  assert.deepEqual(licenseIds(result.catalogLicenses), [valid.id]);
  assert.deepEqual([...result.catalogProjectIds].sort(), ['real-title', valid.sourceProjectId].sort());
});

test('legacy unknown or malformed country fields do not discard otherwise valid paid history', () => {
  const valid = platform.catalogLicenses[0];
  const rows = [{ ...valid, id: 'legacy-global-scope', territory: 'GLOBAL', countryIds: ['FUTURE_COUNTRY'] },
    { ...valid, id: 'legacy-malformed-scope', countryIds: { id: 'US' } }];
  const result = normalizeOwnedStreamingPlatformState({ ...platform, catalogLicenses: rows }, fixture.id);
  assert.equal(result.catalogLicenses.length, 2);
  assert.deepEqual(result.catalogLicenses[0].countryIds, ['FUTURE_COUNTRY']);
  assert.deepEqual(result.catalogLicenses[1].countryIds, []);
  for (const license of result.catalogLicenses) {
    assert.equal(license.minimumGuarantee, valid.minimumGuarantee);
    assert.equal(license.status, valid.status);
    assert.equal(license.startsAtAbsoluteWeek, valid.startsAtAbsoluteWeek);
    assert.equal(license.expiresAtAbsoluteWeek, valid.expiresAtAbsoluteWeek);
    assert.deepEqual(license.accessGrant, valid.accessGrant);
  }
});

test('unknown explicit regional scope remains nonempty and grants no registered-country playback', () => {
  const original = { ...platform.catalogLicenses[0], territory: 'MULTI_REGION' as const };
  const withScope = (countryIds: string[]) => ({ ...fixture, world: { ...fixture.world, streamingRightsContracts: {} },
    ownedStreamingPlatform: normalizeOwnedStreamingPlatformState({ ...platform, starterCatalog: null,
      catalogProjectIds: [original.sourceProjectId], catalogLicenses: [{ ...original, countryIds }] }, fixture.id) });
  assert.equal(getStreamingContentAvailability(withScope(['US']), original.sourceProjectId, ['US'], false).available, true);
  const unknown = withScope(['FUTURE_COUNTRY']);
  assert.equal(unknown.ownedStreamingPlatform.catalogLicenses.length, 1, 'An unknown explicit scope must not erase paid history');
  assert.deepEqual(unknown.ownedStreamingPlatform.catalogLicenses[0].countryIds, ['FUTURE_COUNTRY']);
  const access = getStreamingContentAvailability(unknown, original.sourceProjectId, ['US'], false);
  assert.equal(access.available, false);
  assert.deepEqual(access.coveredCountryIds, []);
});

test('expired and transferred entitlements remain inactive rather than being dropped or reactivated', () => {
  const licenses = platform.catalogLicenses.slice(0, 3).map((license, index) => ({ ...license,
    status: (['EXPIRED', 'TERMINATED', 'TRANSFERRED_OUT'] as const)[index] }));
  const result = normalizeOwnedStreamingPlatformState({ ...platform, catalogLicenses: licenses }, fixture.id);
  assert.deepEqual(result.catalogLicenses.map(license => license.status), ['EXPIRED', 'TERMINATED', 'TRANSFERRED_OUT']);
  assert.deepEqual(result.catalogLicenses.map(license => license.expiresAtAbsoluteWeek), licenses.map(license => license.expiresAtAbsoluteWeek));
});

test('expiry and transfer removals stay removed through compaction and reload while licence history remains', () => {
  const licenses = platform.catalogLicenses.slice(0, 3).map((license, index) => ({ ...license,
    status: (['EXPIRED', 'TERMINATED', 'TRANSFERRED_OUT'] as const)[index] }));
  const removed = { ...platform, catalogLicenses: licenses, catalogProjectIds: [], starterCatalog: {
    ...platform.starterCatalog!, ownedProjectIds: [], licensedProjectIds: sourceIds(licenses),
  } };
  const compacted = compactOwnedStreamingPlatformForPersistence(removed, fixture.id);
  assert.deepEqual(compacted.catalogProjectIds, [], 'terminal-only starter history must not relink intentionally removed titles');
  const reloaded = migratePlayerSave(clone({ ...fixture, ownedStreamingPlatform: compacted }));
  assert.deepEqual(reloaded.ownedStreamingPlatform.catalogProjectIds, []);
  assert.deepEqual(licenseIds(reloaded.ownedStreamingPlatform.catalogLicenses), licenseIds(licenses));
  assert.deepEqual(reloaded.ownedStreamingPlatform.catalogLicenses.map(license => license.status), licenses.map(license => license.status));
});

test('a current renewal or explicit owned-library reference survives alongside terminal licence history', () => {
  const expired = { ...platform.catalogLicenses[0], status: 'EXPIRED' as const };
  const transferred = { ...platform.catalogLicenses[1], status: 'TRANSFERRED_OUT' as const };
  const renewed = { ...expired, id: 'active-local-renewal', status: 'ACTIVE' as const };
  const result = normalizeOwnedStreamingPlatformState({ ...platform, catalogLicenses: [expired, transferred, renewed],
    catalogProjectIds: [], starterCatalog: { ...platform.starterCatalog!,
      ownedProjectIds: [transferred.sourceProjectId], licensedProjectIds: [expired.sourceProjectId] } }, fixture.id);
  assert.deepEqual([...result.catalogProjectIds].sort(), [expired.sourceProjectId, transferred.sourceProjectId].sort());
  assert.equal(result.catalogLicenses.length, 3);
});

if (process.argv.includes('--reload')) {
  test('1040 entitlements, economic terms and rights registry survive repeated JSON migration', () => {
    let current = clone(fixture);
    const registry = clone(current.world.streamingRightsContracts);
    const treasury = current.ownedStreamingPlatform.treasuryCash;
    let canonical = normalizeOwnedStreamingPlatformState(platform, fixture.id);
    for (let pass = 0; pass < 3; pass++) {
      current = migratePlayerSave(clone(current));
      assert.deepEqual(licenseIds(current.ownedStreamingPlatform.catalogLicenses), licenseIds(platform.catalogLicenses));
      assert.equal(current.ownedStreamingPlatform.treasuryCash, treasury);
      assert.deepEqual(clone(current.world.streamingRightsContracts), registry);
      assert.deepEqual(current.ownedStreamingPlatform.catalogLicenses, canonical.catalogLicenses);
      canonical = current.ownedStreamingPlatform;
    }
  });

  test('a real auction clock tick retains all 1040 local and canonical rights without spending', () => {
    const session = fixture.ownedStreamingPlatform.buyerAuctionSessions.find(row => row.status === 'LIVE');
    assert.ok(session, 'Expected the real auction session saved by the stress fixture');
    const result = advanceStreamingBuyerAuction(clone(fixture), session.id, 1, 2000);
    assert.deepEqual(licenseIds(result.player.ownedStreamingPlatform.catalogLicenses), licenseIds(platform.catalogLicenses));
    assert.deepEqual([...result.player.ownedStreamingPlatform.catalogProjectIds].sort(), [...platform.catalogProjectIds].sort());
    assert.equal(result.player.ownedStreamingPlatform.treasuryCash, platform.treasuryCash);
    assert.deepEqual(clone(result.player.world.streamingRightsContracts), clone(fixture.world.streamingRightsContracts));
  });
}

if (process.argv.includes('--acquire')) {
  test('a normal 197-country paid acquisition keeps the same local and canonical territory snapshot on reload', () => {
    const before = filedMarketFixture();
    const listing = getContentMarketListings(before).find(row => !row.unavailableReason
      && row.terms.territory !== 'GLOBAL' && !isContentMarketAuctionListing(before, row.id));
    assert.ok(listing, 'Expected a real ordinary multi-country acquisition');
    const result = purchaseContentMarketListing(before, listing.id, listing.signature);
    assert.ok(result.changed, result.detail);
    const license = result.player.ownedStreamingPlatform.catalogLicenses.find(row => row.sourceProjectId === listing.title.id)!;
    assert.equal(license.countryIds.length, 197);
    const canonical = result.player.world.streamingRightsContracts![license.id];
    assert.deepEqual([...license.countryIds].sort(), [...canonical.countryIds].sort());
    const reloaded = migratePlayerSave(clone(result.player));
    const reloadedLicense = reloaded.ownedStreamingPlatform.catalogLicenses.find(row => row.id === license.id)!;
    assert.deepEqual(reloadedLicense.countryIds, license.countryIds);
    assert.equal(reloadedLicense.minimumGuarantee, license.minimumGuarantee);
    assert.equal(reloaded.ownedStreamingPlatform.treasuryCash, before.ownedStreamingPlatform.treasuryCash - listing.terms.minimumGuarantee);
  });

  for (const count of [1000, 1001, 1040]) {
    test(`a normal market purchase reaching ${count} titles keeps prior rights and charges exactly once`, () => {
      const before = clone(fixture);
      const licenses = before.ownedStreamingPlatform.catalogLicenses.slice(0, count - 1);
      before.ownedStreamingPlatform.catalogLicenses = licenses;
      before.ownedStreamingPlatform.catalogProjectIds = sourceIds(licenses);
      before.ownedStreamingPlatform.starterCatalog!.licensedProjectIds = sourceIds(licenses);
      // The fixture has exhausted its current public shelf. Use its real paid
      // scouting and purchase services to acquire a distinct market title.
      const scoutPrice = getStreamingPaidScoutQuote(before).price;
      const scouted = refreshStreamingPaidScout(before);
      assert.ok(scouted.changed, scouted.detail);
      assert.equal(scouted.player.ownedStreamingPlatform.treasuryCash, before.ownedStreamingPlatform.treasuryCash - scoutPrice);
      const offer = getStreamingOpportunityCards(scouted.player, { includeCollections: false }).individuals
        .find(row => !scouted.player.world.projects.some(project => project.id === row.projectId));
      assert.ok(offer, 'Expected a distinct buyable title from the real paid scout');
      const treasury = scouted.player.ownedStreamingPlatform.treasuryCash;
      const energy = before.energy.current;
      const result = purchaseStreamingOpportunityOffer(scouted.player, offer.id);
      assert.ok(result.changed, result.detail);
      assert.equal(result.player.ownedStreamingPlatform.catalogLicenses.length, count);
      for (const license of licenses) assert.ok(result.player.ownedStreamingPlatform.catalogLicenses.some(row => row.id === license.id));
      assert.equal(result.player.ownedStreamingPlatform.treasuryCash, treasury - offer.askingPrice);
      assert.equal(result.player.energy.current, energy);
      const repeated = purchaseStreamingOpportunityOffer(result.player, offer.id);
      assert.equal(repeated.changed, false);
      assert.equal(repeated.player.ownedStreamingPlatform.treasuryCash, result.player.ownedStreamingPlatform.treasuryCash);
      assert.equal(repeated.player.ownedStreamingPlatform.catalogLicenses.length, count);
    });
  }
}
