/**
 * #113 Define the Launch: Catalogue and Blueprint (plan §18.11; Zeesh, 2026-11-01: "थोड़ा गेम वाला भी फील आना चाहिए" …
 * "सारा सब कुछ एक ही साथ करना है … एक ही साथ कर दो"):
 *  - Catalogue: the titles and hours in Anton, the depth gauge lit, the posters on a lit shelf (no empty shelf drawn),
 *    the four counts a readout tile each, the coverage meters lit, anchor titles as item rows;
 *  - Blueprint, under the mission briefing (#110): the dossier — each decision a card, ticked once settled — and the
 *    projected result, each stream in its offer's colour (#104: Members sky, Open doors violet, Box office amber) and
 *    named under the bar with its money.
 * Renders with react-dom/server. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LaunchData, PricingForecast } from '../components/studio-finance/finance/launch';
import type { StepProps } from '../components/studio-finance/components/launch/LaunchWizard';
import { StepCatalogue } from '../components/studio-finance/components/launch/StepCatalogue';
import { StepBlueprint } from '../components/studio-finance/components/launch/StepBlueprint';
import { shellData, shellDraft, type ShellScenario } from './fixtures/streaming-launch-shell-data';

const props = (scenario: ShellScenario, data: Partial<LaunchData> = {}): StepProps => {
    const full = { ...shellData(scenario), ...data } as LaunchData;
    return {
        data: full, draft: shellDraft(scenario), patch: () => undefined,
        chosen: full.countries.filter(c => full.selectedCountryIds.includes(c.id)),
        treasury: full.treasury, free: 100_000_000, gap: 0, handlers: {},
    };
};

/* ── Catalogue ── */
const empty = renderToStaticMarkup(createElement(StepCatalogue, props('fresh')));
assert.doesNotMatch(empty, /class="cat-rail"/, 'No titles: no empty shelf');
assert.equal((empty.match(/<span><b>\d+<\/b><em>(linked|owned|licensed|deals)<\/em><\/span>/g) ?? []).length, 4, 'Four counts, a tile each');
const stocked = renderToStaticMarkup(createElement(StepCatalogue, props('ready', {
    catalogue: { ...shellData('ready').catalogue, anchors: [{ id: 'a', name: 'Opening Signal', format: 'Film', linked: true }] } as LaunchData['catalogue'],
})));
assert.match(stocked, /class="cat-rail"><span class="cat-railitem">/, 'Titles stand on the shelf');
assert.match(stocked, /<p class="cat-shelf-figure">1\.2K<i>titles<\/i><\/p>/);
const css = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/launch.css'), 'utf8');
assert.match(css, /\.cat-shelf-figure \{\s*font-family: var\(--sf-font-display\);/, 'The titles figure in Anton');
assert.match(css, /\.cat-rail \{[^}]*background: linear-gradient\(0deg, rgba\(var\(--sf-brand-on-rgb\), 0\.5\) 0 2px/, 'the lit shelf');
assert.match(css, /\.cat-strip \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/, 'four readout tiles');
console.log('PASS catalogue: Anton figures, the posters on a lit shelf (none drawn when empty), four readout tiles');

/* ── Blueprint ── */
const forecast = {
    households: 1_200_000, monthlyRevenue: 10_000_000, yearlyRevenue: 120_000_000, position: 'At market',
    streams: [
        { id: 'subs', name: 'Subscriptions', monthly: 6_000_000 },
        { id: 'ads', name: 'Advertising', monthly: 3_000_000 },
        { id: 'rentals', name: 'Rentals & purchases', monthly: 1_000_000 },
    ],
} as unknown as PricingForecast;
const blueprint = renderToStaticMarkup(createElement(StepBlueprint, {
    ...props('ready'), onJump: () => undefined,
    pricingPreview: { forecast, worldForecast: {} as never, updating: false },
}));
assert.match(blueprint, /aria-label="Projected result"/);
assert.match(blueprint, /<i style="width:60%;background:#45b5de" title="Subscriptions"><\/i><i style="width:30%;background:#ab94ff" title="Advertising"><\/i><i style="width:10%;background:#eeac43" title="Rentals &amp; purchases"><\/i>/,
    'Each stream in its offer\'s colour, sized by its money');
assert.match(blueprint, /<li style="--k:#45b5de"><i aria-hidden="true"><\/i>Subscriptions<b>\$6M<\/b><\/li>/, 'and named under the bar with its money');
assert.equal((blueprint.match(/class="bl-tile is-ok"/g) ?? []).length, (blueprint.match(/class="bl-tile-tick"/g) ?? []).length, 'A settled decision carries a tick');
assert.ok((blueprint.match(/class="bl-tile-tick"/g) ?? []).length >= 4, 'the ready plan\'s settled cards are ticked');
assert.match(css, /\.sf \.bl-tile \{[^}]*border-radius: 14px;/);
assert.match(css, /\.bl-money-figure \{\s*font-family: var\(--sf-font-display\);/, 'The projected figures in Anton');
console.log('PASS blueprint: the dossier ticked when settled; the projected result in the offers\' colours, named with their money');
console.log('done');
