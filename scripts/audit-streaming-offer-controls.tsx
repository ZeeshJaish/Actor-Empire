/**
 * #107 Ad breaks, store and deals under the plans; the Pricing step assembled (Zeesh, 2026-11-01: "I LIKE THE concept
 * of attached layut but rest all of the stuffs" … "थोड़ा गेम वाला भी फील"; plan §18.4, and §18.3's one editor each):
 *  - three controls, each a cover in its offer's colour (#104) with what it does now, its editor attached under it:
 *    AD BREAKS (a dial of breaks from few to many and its effect as two meters; passes; the free tier's early access),
 *    STORE (rent and buy to the cent, the top edition, rental length, who can buy, early access), DEALS (Pay yearly and
 *    First three months as the prices they make, the plan the intro is on); closed at first; read-only, no buttons;
 *  - the plans table's free Ads cell and the store's price open their control instead of a second editor;
 *  - the Pricing step reads engine → plans → controls → forecast; the old offer cards are gone.
 * Renders with react-dom/server; class names from the CSS module (esbuild local-css). (~1 s)
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { OwnedStreamingPricingConfiguration } from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { applyStreamingStoreChoice, getStreamingPlanBuilderView, replaceWithStreamingStarterPlans } from '../services/streamingPlanBuilder';
import { OfferControls, type OfferControlId } from '../components/streaming-transplant/OfferControls';
import css from '../components/streaming-transplant/presentation/screens/Pricing/OfferControls.module.css';

const cls = css as unknown as Record<string, string>;
const base = normalizeOwnedStreamingPlatformState(undefined, 'offer-controls-audit').serviceConfiguration.pricing;
const grown = getStreamingPlanBuilderView({ technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 10 } });
let pricing: OwnedStreamingPricingConfiguration = replaceWithStreamingStarterPlans(configureStreamingPricingOffer(base, { kind: 'CORE', coreModel: 'SUBSCRIPTION' }), grown);
pricing = configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
pricing = configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer: 'STORE', enabled: true });
pricing = applyStreamingStoreChoice(pricing, 'picture', 'PICTURE_4K', grown);
const render = (open: OfferControlId | null, editable = true) => renderToStaticMarkup(createElement(OfferControls, {
    pricing, tree: grown.tree, open, onOpen: () => undefined, ...(editable ? { onChange: () => undefined } : {}), adEstimate: { cpm: 12.5, fill: .8 },
}));

/* ── the covers ── */
const closed = render(null);
assert.match(closed, /Breaks, store and deals[\s\S]*aria-label="AD BREAKS"[\s\S]*aria-label="STORE"[\s\S]*aria-label="DEALS"/, 'Three controls, in this order');
for (const [label, colour] of [['AD BREAKS', '#ab94ff'], ['STORE', '#eeac43'], ['DEALS', '#45b5de']] as const) {
    assert.match(closed, new RegExp(`style="--c:${colour}" aria-label="${label}"`), `${label} wears its offer's colour`);
}
assert.equal((closed.match(/aria-expanded="false"/g) ?? []).length, 3, 'All three closed at first');
assert.equal((closed.match(/Edit \+/g) ?? []).length, 3);
assert.doesNotMatch(closed, /Show an ad every|Ad-free passes|Who can rent or buy|First three months/, 'A closed control keeps its editor shut');
assert.match(closed, /aria-label="AD BREAKS"[\s\S]*?Every \d+ min|aria-label="AD BREAKS"[\s\S]*?ad min an hour/, 'The ad breaks cover says the cadence');
assert.match(closed, /Rent \$\d+\.\d\d · Buy \$\d+\.\d\d/, 'The store cover says its prices');
assert.match(closed, /pay yearly · from \$\d+\.\d\d a month|Everyone pays monthly/, 'The deals cover says what yearly makes');
const readOnly = render(null, false);
assert.doesNotMatch(readOnly, /<button|Edit \+/, 'Read-only: covers, no buttons');
console.log('PASS covers: ad breaks, store and deals in their offers\' colours, closed, each saying what it does; read-only without buttons');

/* ── the editors ── */
const ads = render('ADS');
assert.match(ads, /aria-expanded="true" aria-controls="[^"]+" aria-label="Edit ad breaks"/, 'Open: it says so and names its editor');
assert.match(ads, /aria-label="30 minutes"[\s\S]*aria-label="20 minutes"[\s\S]*aria-label="15 minutes"[\s\S]*aria-label="10 minutes"[\s\S]*aria-label="5 minutes"/,
    'The dial runs from few breaks to many');
assert.match(ads, /Fewer breaks · viewers stay[\s\S]*More breaks · more money/, 'with its two ends named');
assert.match(ads, new RegExp(`Ad money</span><i><em style="width:\\d+%"></em></i><span>Viewers put off</span><i class="${cls.cost}">`), 'Its effect: two meters');
assert.match(ads, /Estimated CPM <b>\$12\.50<\/b>[\s\S]*Estimated fill <b>80%<\/b>/, 'The market\'s price and fill');
assert.match(ads, /aria-label="1 hour ad-free: off"[\s\S]*aria-label="24 hours ad-free: off"/, 'The passes, as switches');
assert.match(ads, /The free tier[\s\S]*aria-label="Early access: off"/, 'The free tier\'s early access');
const store = render('STORE');
assert.match(store, /aria-label="Rent"[\s\S]*aria-label="Buy"[\s\S]*aria-label="Rental length"/, 'Rent, buy and rental length');
assert.match(store, /step="0\.01"/, 'Prices to the cent');
assert.match(store, /4K edition[\s\S]*Same as HD[\s\S]*Its own price/, 'A store selling 4K prices its top edition');
assert.match(store, /Who can rent or buy\?[\s\S]*Everyone[\s\S]*Members of plans/, 'Who can buy');
const deals = render('DEALS');
assert.match(deals, /aria-label="Pay yearly"[\s\S]*aria-label="First three months"/, 'Pay yearly and First three months');
assert.match(deals, /aria-label="Which plan the first three months are on"[\s\S]*Every plan/, 'and the plan the intro is on');
console.log('PASS editors: the cadence dial with its ends, meters, CPM and fill, passes, early access; store prices to the cent, the 4K edition, who can buy; the two deals and the intro\'s plan');

/* ── the page ── */
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const step = source('components/studio-finance/components/launch/StepPricing.tsx');
const order = ['{engine}', '{plansTable}', '<OfferControls', '{forecastPanel}'].map(token => step.indexOf(token));
assert.ok(order.every(at => at > 0) && order.every((at, index) => index === 0 || at > order[index - 1]), 'The step: engine → plans → controls → forecast');
assert.ok(step.includes('onOpenControl={openControl}') && !step.includes('PricingOfferCard') && !step.includes('pr-offers'), 'The table opens the controls; the old cards are gone');
assert.ok(!existsSync(resolve(process.cwd(), 'components/studio-finance/components/launch/PricingOfferCard.tsx')), 'The old offer card is deleted');
const table = source('components/streaming-transplant/PlanBuilder.tsx');
assert.ok(table.includes("onOpenControl('STORE')") && table.includes("? onOpenControl('ADS')"), 'The free Ads cell and the store\'s price open their control');
console.log('PASS page: engine → plans → controls → forecast; the table opens the controls; the old cards are gone');

/* ── #118 the steppers' symmetry (Zeesh: "सिमेट्री का इशू") ── */
const priced = renderToStaticMarkup(createElement(OfferControls, {
    pricing: configureStreamingPricingOffer(configureStreamingPricingOffer(pricing, { kind: 'PASS', duration: 'ONE_HOUR', price: .99 }), { kind: 'PASS', duration: 'DAY', price: 2.99 }),
    tree: grown.tree, open: 'ADS', onOpen: () => undefined, onChange: () => undefined,
}));
assert.match(priced, /aria-label="1 hour ad-free price"><span>Price<\/span>[\s\S]*aria-label="24 hours ad-free price"><span>Price<\/span>/,
    'A pass\'s price stepper says "Price" (the pass names it aloud)');
assert.match(priced, /<i aria-hidden="true">\$<\/i><input[^>]*style="width:3\.4ch"/, 'The price input is as wide as its digits ($0.99 → 3.4ch), "$" beside it');
const sheet = source('components/streaming-transplant/presentation/screens/Pricing/OfferControls.module.css');
assert.doesNotMatch(sheet, /\.toggleRow i[{,:]/, 'No bare `.toggleRow i`: it drew the stepper\'s "$" as a second switch');
assert.match(sheet, /\.toggleRow > button > i\{/, 'The switch is the row\'s own <i>');
assert.match(sheet, /\.stepper\{display:grid;grid-template-columns:minmax\(0,1fr\) 36px 80px 36px/, 'A fixed value column: − and + line up row under row');
assert.match(sheet, /\.controls \.stepper button\{display:grid;place-items:center;width:36px;height:36px/, 'Square buttons, the glyph centred');
console.log('PASS #118 steppers: square buttons with centred glyphs, a fixed value column, "$" and the price one unit, no second switch');
console.log('done');
