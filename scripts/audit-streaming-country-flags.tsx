import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CountryFlagSvg, FlagField } from '../components/studio-finance/components/FlagField';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';

const atlas = '/assets/streaming/country-flags.svg';
for (const { id, name } of WORLD_COUNTRY_DEFINITIONS) {
  const icon = renderToStaticMarkup(<FlagField code={id} />);
  const primitive = renderToStaticMarkup(<CountryFlagSvg code={id} />);
  assert.ok(icon.includes(`href="${atlas}"`), `${id} ${name} icon should use its actual atlas flag`);
  assert.ok(primitive.includes(`href="${atlas}"`), `${id} ${name} flag primitive should use the atlas`);
}

// Regression samples from the first six atlas rows, including the screenshot's
// Caribbean countries. They guard against a complete but shifted index.
for (const [code, row, column] of [
  ['AG', 0, 8], ['BS', 1, 5], ['BB', 1, 8], ['BZ', 2, 2],
  ['CA', 3, 7], ['CR', 4, 8], ['CU', 5, 0], ['DM', 5, 7], ['DO', 5, 8],
  ['IN', 9, 8], ['NG', 15, 6], ['RU', 17, 7], ['ZA', 19, 7],
  ['US', 22, 4], ['VN', 23, 1], ['ZW', 23, 6],
] as const) {
  const icon = renderToStaticMarkup(<CountryFlagSvg code={code} />);
  const expectedX = column * 111.474 + 2.538;
  const expectedY = row * 115.875 + 10.152;
  assert.ok(icon.includes(`viewBox="${expectedX} ${expectedY} 76.141 60.913"`), `${code} should crop its correct atlas cell`);
}

console.log(`Country flag audit passed for ${WORLD_COUNTRY_DEFINITIONS.length} game markets.`);
