import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import * as CountryShapeModule from '../components/studio-finance/components/build/CountryShape';

const { CountryShape } = CountryShapeModule;

const markup = renderToStaticMarkup(
  <CountryShape
    shape="us"
    countryCode="US"
    countryName="United States"
    pins={[
      { id: 'LA', x: 20, y: 50, longitude: -118.2437, latitude: 34.0522, state: 'picked' },
      { id: 'NYC', x: 75, y: 42, longitude: -74.006, latitude: 40.7128, state: 'built' },
    ]}
    active
    height={96}
  />,
);

assert.match(markup, /aria-label="United States infrastructure map"/);
assert.match(markup, /data-map-source="world-atlas"/);
assert.match(markup, /data-country-geometry="840"/);

const countryPath = markup.match(/class="ctry-land" d="([^"]+)"/)?.[1] || '';
assert.ok(
  countryPath.length > 500,
  `expected a detailed geographic country boundary, received ${countryPath.length} path characters`,
);

assert.doesNotMatch(markup, /cx="20" cy="50"/);
assert.doesNotMatch(markup, /cx="75" cy="42"/);
assert.match(markup, /data-location-id="LA"/);
assert.match(markup, /data-location-id="NYC"/);

type CutoutFactory = (
  countryCode: string,
  countryName: string,
  width?: number,
  height?: number,
) => { id: string; path: string } | null;

const loadDetailedCountryCutoutFactory = (CountryShapeModule as unknown as {
  loadDetailedCountryCutoutFactory?: () => Promise<CutoutFactory>;
}).loadDetailedCountryCutoutFactory;

assert.equal(
  typeof loadDetailedCountryCutoutFactory,
  'function',
  'Build country cards must expose a lazy upgrade to the detailed shared-map geometry.',
);

void loadDetailedCountryCutoutFactory!().then((detailedFactory) => {
  const detailed = detailedFactory('US', 'United States', 128, 100);
  assert.ok(detailed, 'The shared detailed atlas should resolve the United States card.');
  assert.equal(detailed.id, '840');
  assert.ok(
    detailed.path.length > countryPath.length,
    `expected the detailed shared-map path to exceed the ${countryPath.length}-character fallback path`,
  );
  assert.notEqual(detailed.path, countryPath, 'The detailed card geometry must not silently reuse the old fallback path.');
  console.log('Streaming build country map audit passed.');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
