/**
 * #105 The plan table as tier columns (Zeesh, 2026-11-01: "I LIKE THE concept of attached layut but rest all of the
 * stuffs" … the comparison table stays; "480p 720p 1080p को गोल्डन करती है, वो काफ़ी बढ़िया है"; plan §18.4, §18.10):
 *  - each column opens with its colour band, its name and a big price (the price row is gone); the free column
 *    "Free · ads pay", the store its rental with the purchase under it, and a tap on a price opens its picker;
 *  - cells are chips, ad pips (Light 1, Standard 2, Heavy 3; the free tier's cadence is the Standard), screens,
 *    ticks and a download arrow; the best picture in the table is the golden chip;
 *  - a row the service cannot sell yet shows a lock in each cell, and its name an "Unlock ›" that opens that exact
 *    step in Tech; a locked option in the picker says "Unlock in Tech ›".
 * Renders the table with react-dom/server; class names from the CSS module (esbuild local-css). (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { OwnedStreamingPricingConfiguration, StreamingTechId } from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { applyStreamingPlanBuilderChoice, getStreamingPlanBuilderView, replaceWithStreamingStarterPlans } from '../services/streamingPlanBuilder';
import { PlanBuilder } from '../components/streaming-transplant/PlanBuilder';
import css from '../components/streaming-transplant/presentation/screens/NetworkDesk/PlanBuilder.module.css';

const cls = css as unknown as Record<string, string>;
const count = (html: string, needle: RegExp) => (html.match(needle) ?? []).length;
const base = normalizeOwnedStreamingPlatformState(undefined, 'plan-tiers-audit').serviceConfiguration.pricing;
const subscription = (pricing: OwnedStreamingPricingConfiguration) => configureStreamingPricingOffer(pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
/* one cell's markup, found by its words */
const cellOf = (html: string, words: string) => {
    const at = html.indexOf(`aria-label="${words}`);
    assert.ok(at >= 0, `A cell reads "${words}…"`);
    return html.slice(at, html.indexOf('</td>', at));
};

/* ── a new service: the free tier and the starter plans, most rows still locked in Tech ── */
const fresh = getStreamingPlanBuilderView(null);
const newService = configureStreamingPricingOffer(replaceWithStreamingStarterPlans(subscription(base), fresh), { kind: 'TOGGLE', offer: 'ADS', enabled: true });
const went: StreamingTechId[] = [];
const editable = renderToStaticMarkup(createElement(PlanBuilder, { pricing: newService, builder: fresh, onChange: () => undefined, onGoToTech: id => went.push(id) }));
const [basic] = newService.plans;
assert.ok(basic, 'The starter plans are there');
const money = (value: number) => `$${value.toFixed(2)}`;

assert.match(editable, new RegExp(`aria-label="${basic.name} price: \\${money(basic.monthly)} a month\\. Change"><b>\\${money(basic.monthly)}</b><small>a month</small>`),
    'A plan\'s big price sits in its column\'s head and opens its picker');
assert.match(editable, /Free with ads<\/span><span class="[^"]*"><b>Free<\/b><small>ads pay<\/small>/, 'The free column: "Free · ads pay" under its name');
assert.doesNotMatch(editable, />Price a month</, 'No price row');
assert.ok(editable.includes(`${cls.freeHead}" style="--pc:#ab94ff"`), 'The free column wears Free with ads\' violet (#104)');
console.log('PASS heads: a band, the name and a big price; the free column "Free · ads pay"; no price row');

const adPips = (words: string) => count(cellOf(editable, words), new RegExp(`class="${cls.pipOn}"`, 'g'));
assert.equal(adPips(`${basic.name} Ads: Standard`), 2, 'Standard ads: two pips of three');
assert.equal(adPips('Free with ads Ads:'), 2, 'The free tier runs the service\'s cadence, the Standard');
assert.match(cellOf(editable, 'Free with ads Ads:'), /<small>4 min\/h<\/small>|<small>Every \d+ min<\/small>/, 'with its cadence under the pips');
assert.match(cellOf(editable, `${basic.name} Picture: 480p`), new RegExp(`class="${cls.chip} ${cls.gold}">480p<`), 'Every plan sells 480p here, so 480p is the best: golden');
assert.equal(count(cellOf(editable, `${basic.name} Screens: 1`), /viewBox="0 0 12 10"/g), 1, 'One screen, one screen icon');
console.log('PASS cells: ad pips (the free tier\'s cadence the Standard), chips, the best picture golden, screens as icons');

assert.match(editable, /<th scope="row" class="[^"]*">HDR<button type="button" class="[^"]*" aria-label="Unlock HDR in Tech">[\s\S]*?Unlock ›<\/button><\/th>/,
    'HDR, locked for every column: its name opens HDR in Tech');
assert.match(cellOf(editable, `${basic.name} HDR: none, Unlock HDR in Tech`), new RegExp(`class="[^"]*${cls.slotLock}`), 'Each of its cells shows a lock');
for (const [row, needs] of [['Downloads', 'Unlock Downloads in Tech'], ['Kids profiles', 'Unlock Kids profiles and parental controls in Tech'], ['Extra member', 'Unlock Paid extra member in Tech']] as const) {
    assert.match(editable, new RegExp(`>${row}<button type="button" class="[^"]*" aria-label="${needs}">`), `${row}: Unlock › in its name`);
}
assert.doesNotMatch(editable, />Live events<button/, 'Live events need a product, not a tech: no Unlock ›');
assert.doesNotMatch(editable, />Picture<button|>Screens<button/, 'Rows the service can sell have none');
const quiet = renderToStaticMarkup(createElement(PlanBuilder, { pricing: newService, builder: fresh, onChange: () => undefined }));
assert.doesNotMatch(quiet, /Unlock ›/, 'With no way to Tech, no Unlock ›');
console.log('PASS locks: a row no column can sell shows a lock in each cell and "Unlock ›" in its name, to that exact step; Live events and open rows none');

/* ── more tech, Rent or buy on, read-only: the best picture is the top plan's 4K ── */
const grown = getStreamingPlanBuilderView({ technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 10 } });
let bigger = configureStreamingPricingOffer(replaceWithStreamingStarterPlans(subscription(base), grown), { kind: 'TOGGLE', offer: 'STORE', enabled: true });
const top = bigger.plans[bigger.plans.length - 1];
bigger = applyStreamingPlanBuilderChoice(applyStreamingPlanBuilderChoice(bigger, top.id, 'picture', 'PICTURE_4K', grown), top.id, 'downloads', 'on', grown);
const readOnly = renderToStaticMarkup(createElement(PlanBuilder, { pricing: bigger, builder: grown, onGoToTech: () => undefined }));
assert.equal(count(readOnly, new RegExp(`${cls.gold}">`, 'g')), 1, 'One golden chip: the best picture in the table');
assert.match(readOnly, new RegExp(`${top.name} Picture: 4K"><span class="${cls.chip} ${cls.gold}">4K<`), 'It is the top plan\'s 4K');
assert.match(cellOf(readOnly, `${top.name} Downloads: ✓`), /M8 2\.6v7\.2/, 'Downloads: a download arrow');
assert.match(readOnly, /Rent or buy<\/span><span class="[^"]*"><b>\$\d+\.\d\d<\/b><small>rent · buy \$\d+\.\d\d<\/small>/, 'The store: its rental big, the purchase under it');
assert.doesNotMatch(readOnly, /\. Change"/, 'Read-only: no cell and no price is a tap');
console.log('PASS read-only: one golden chip (the top plan\'s 4K), a download arrow, the store\'s prices in its head, nothing to tap');

/* ── the picker ── */
const source = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/PlanBuilder.tsx'), 'utf8');
assert.ok(source.includes('onGoToTech(techId); }}>Unlock in Tech ›</button>') && !source.includes('Go to Tech →'), 'A locked option: "Unlock in Tech ›"');
console.log('PASS picker: a locked option says "Unlock in Tech ›"');
assert.deepEqual(went, [], 'Rendering opens nothing');
console.log('done');
