import assert from 'node:assert/strict';
import test from 'node:test';
import { STREAMING_MARKET_SUB_REGIONS } from '../services/streamingMarketSubRegions';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';
import { buildStreamingGroupMarketMap } from '../components/studio-finance/finance/groupMarketMap';
import { summarize, type Country } from '../components/studio-finance/finance/launch';

test('all six regions and 197 markets appear in exactly one group', () => {
  assert.equal(STREAMING_MARKET_SUB_REGIONS.length, 24);
  const ids = STREAMING_MARKET_SUB_REGIONS.flatMap(group => group.countryIds);
  assert.equal(ids.length, WORLD_COUNTRY_DEFINITIONS.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(STREAMING_MARKET_SUB_REGIONS.map(group => group.regionId)).size, 6);
});

test('every group market has a finite map position, shape or marker, and a visible viewport', () => {
  STREAMING_MARKET_SUB_REGIONS.forEach(group => {
    const model = buildStreamingGroupMarketMap(group.countryIds, new Set(group.countryIds.slice(0, 1)));
    assert.equal(model.countries.length, group.countryIds.length, group.id);
    const [x, y, width, height] = model.viewBox;
    assert.ok([x, y, width, height].every(Number.isFinite), group.id);
    assert.ok(width > 0 && height > 0, group.id);
    model.countries.forEach(country => {
      assert.ok(country.path || country.markerOnly, `${group.id}/${country.id}`);
      assert.ok([country.x, country.y].every(Number.isFinite), `${group.id}/${country.id}`);
      assert.ok(country.x >= x && country.x <= x + width, `${group.id}/${country.id} horizontal`);
      assert.ok(country.y >= y && country.y <= y + height, `${group.id}/${country.id} vertical`);
    });
    assert.equal(model.countries[0].selected, true, group.id);
  });
});

test('small countries missing an atlas silhouette remain represented by selectable markers', () => {
  for (const countryId of ['VC', 'XK', 'TV']) {
    const model = buildStreamingGroupMarketMap([countryId], new Set([countryId]));
    assert.equal(model.countries[0].markerOnly, true);
    assert.equal(model.countries[0].selected, true);
  }
});

test('group totals use country cash and audience-weighted growth and rivalry', () => {
  const ids = STREAMING_MARKET_SUB_REGIONS.find(group => group.id === 'CARIBBEAN')!.countryIds;
  const countries = ids.map((id, index) => ({
    id, region: 'North America', audience: (index + 1) * 10_000,
    growth: index % 2 === 0 ? 10 : 20,
    rightsEstimate: (index + 1) * 1_000, complianceCost: (index + 1) * 300,
    languages: [{ name: index % 2 === 0 ? 'English' : 'Spanish', share: 100 }],
    competition: 'OPEN', difficulty: 'LOW',
    rivals: [{ name: 'Rival', share: index % 2 === 0 ? 20 : 40 }],
  } as Country));
  const summary = summarize(countries);
  const audience = countries.reduce((sum, country) => sum + country.audience, 0);
  assert.equal(summary.countries, 13);
  assert.equal(summary.audience, audience);
  assert.equal(summary.rights, countries.reduce((sum, country) => sum + country.rightsEstimate, 0));
  assert.equal(summary.compliance, countries.reduce((sum, country) => sum + country.complianceCost, 0));
  assert.equal(summary.growth, countries.reduce((sum, country) => sum + country.growth * country.audience, 0) / audience);
  assert.equal(summary.rivals[0].share, countries.reduce((sum, country) => sum + country.rivals[0].share * country.audience, 0) / audience);
});
