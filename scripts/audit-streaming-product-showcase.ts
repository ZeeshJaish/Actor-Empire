/**
 * #126 (plan §19.13): the Platform room's PRODUCT tab as a showcase of every product coming in a future update.
 * Zeesh, 2026-11-02: 15–20 products listed as "कमिंग ऑन द वे", each like a YouTube thumbnail with a small preview,
 * "सिनेमा … इसको हटाना", names without the service's brand, "यूआई तगड़ा".
 *
 * Checks the catalogue, that every product draws its preview, the tab as rendered (head, chips, the featured card,
 * three sections of cards), a save's launched products with Pause and Resume above it, the old Product Lab gone
 * from the HQ, the Live events extra's lock, and STATUS without an empty Products group.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlatformDesk, type NetworkState, type PlatformProduct } from '../components/streaming-transplant/StreamingNetworkExperience';
import { ProductScene } from '../components/streaming-transplant/ProductScenes';
import { PRODUCT_SHOWCASE, PRODUCT_SHOWCASE_SECTIONS } from '../components/streaming-transplant/productShowcaseCatalogue';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { getStreamingPlanBuilderView } from '../services/streamingPlanBuilder';
import { STREAMING_LIVE_EXTRA_COMING } from '../services/streamingPlanOffer';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/* ── the catalogue ── */
assert.equal(PRODUCT_SHOWCASE.length, 19, 'Nineteen products: §19\'s eleven less Free, plus nine new, less Cinemas');
assert.equal(new Set(PRODUCT_SHOWCASE.map(item => item.id)).size, 19, 'Each product once');
const bySection = Object.fromEntries(PRODUCT_SHOWCASE_SECTIONS.map(section => [section.id, PRODUCT_SHOWCASE.filter(item => item.section === section.id).length]));
assert.deepEqual(bySection, { WATCH: 7, EARN: 6, REACH: 6 });
for (const item of PRODUCT_SHOWCASE) {
    assert.doesNotMatch(item.name, /EMPIRE|NORTHSTAR|\+$/, `${item.name}: the product's own name, no brand`);
    assert.ok(item.line.length > 10 && item.about.length > 20 && item.will.every(line => line.length > 10), `${item.name}: a line, an about and three things it will do`);
    assert.match(item.accent, /^#[0-9a-f]{6}$/i);
}
assert.ok(!PRODUCT_SHOWCASE.some(item => /^Cinemas?$/i.test(item.name)), 'No cinema chain (Zeesh: "सिनेमा … इसको हटाना"); VR Cinema is a headset');
assert.deepEqual(PRODUCT_SHOWCASE.filter(item => item.futuristic).map(item => item.id), ['WORLD', 'VR'], 'World and VR Cinema are the far-future ones (✦)');
assert.ok(PRODUCT_SHOWCASE.some(item => item.id === 'KIDS') && PRODUCT_SHOWCASE.some(item => item.id === 'LIVE' && item.name === 'Live & Sports'), 'Kids and Live & Sports, as Zeesh named them');
console.log(`PASS catalogue: 19 products (${Object.entries(bySection).map(([id, n]) => `${id} ${n}`).join(', ')}), no brand in a name, no Cinemas, two ✦`);

/* ── every preview draws, with no broken numbers ── */
for (const item of PRODUCT_SHOWCASE) {
    const svg = renderToStaticMarkup(createElement(ProductScene, { id: item.id, uid: `audit-${item.id}` }));
    assert.match(svg, new RegExp(`^<svg[^>]*data-scene="${item.id}"`), `${item.name} draws its scene`);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${item.name}: every coordinate is a number`);
    assert.ok(svg.length > 1500, `${item.name}: a real scene, not an empty frame`);
}
console.log('PASS previews: all 19 scenes draw (SVG 320×180), no NaN or undefined');

/* ── the tab ── */
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
};
const state = (products: PlatformProduct[]): NetworkState => ({
    live: true, components: [], cities: [], tech: [], products, incidents: [], peakLoad: 41, headroom: '', technicalDebt: 22,
});
const page = (products: PlatformProduct[]) => renderToStaticMarkup(createElement(PlatformDesk, {
    brand, state: state(products), onBack: () => undefined, initialTab: 'PRODUCTS',
    onPauseProduct: () => ({ ok: true, message: '' }),
}));
const fresh = page([]);
assert.match(fresh, /<h2>Products<\/h2>[\s\S]*19 ON THE WAY[\s\S]*coming in a future update/);
assert.match(fresh, /aria-pressed="true"[^>]*>All<[\s\S]*>Watch more<[\s\S]*>Earn more<[\s\S]*>Reach more</, 'Chips: All, then the three sections');
assert.match(fresh, /FEATURED · COMING SOON[\s\S]*Live &amp; Sports/, 'Live & Sports leads');
assert.match(fresh, /WATCH MORE[\s\S]*EARN MORE[\s\S]*REACH MORE/);
assert.equal((fresh.match(/data-card="/g) || []).length, 18, 'Eighteen cards under the featured one');
assert.equal((fresh.match(/>SOON</g) || []).length, 18, 'Each card says SOON where a video shows its length');
assert.doesNotMatch(fresh, /YOUR PRODUCTS|EMPIRE\+|Product Lab/, 'A new service has no launched products, and nothing names EMPIRE+ or the Lab');
console.log('PASS tab: head, chips, featured Live & Sports, 18 cards in three sections, no Product Lab');

const yours: PlatformProduct[] = [
    { id: 'a', lineId: 'LIVE', name: 'Live', note: '', state: 'ACTIVE', weeklyCost: 1_100_000, load: 28 },
    { id: 'b', lineId: 'FAN', name: 'Fan', note: '', state: 'PAUSED', weeklyCost: 320_000, load: 7 },
    { id: 'c', lineId: 'KIDS', name: 'Kids', note: '', state: 'BUILDING', readyIn: 2, weeklyCost: 260_000, load: 6 },
];
const old = page(yours);
assert.match(old, /YOUR PRODUCTS[\s\S]*Live[\s\S]*Running · \$1\.1M a week · \+28% load[\s\S]*>Pause<[\s\S]*Fan[\s\S]*Paused · \$320K a week[\s\S]*>Resume<[\s\S]*Kids[\s\S]*Ready in 2 weeks/);
assert.equal((old.match(/>(Pause|Resume)</g) || []).length, 2, 'A product still being built has no Pause');
console.log('PASS yours: a running, a paused and a building product from the old Lab, with Pause and Resume');

/* ── the HQ, the Lab, the save's names ── */
const hq = read('components/StreamingPlatformHQ.tsx');
assert.ok(!existsSync(resolve(process.cwd(), 'components/StreamingProductLab.tsx')) && !existsSync(resolve(process.cwd(), 'styles/streaming-product-lab.css')), 'The old Product Lab is removed');
assert.ok(!hq.includes('StreamingProductLab') && !hq.includes('showProductLab'), 'The HQ no longer opens it');
assert.equal((hq.match(/openPlatformTab\('PRODUCTS'\)/g) || []).length, 2, 'The PRODUCTS chip and the campus link open the PRODUCT tab');
assert.ok(hq.includes('onPauseProduct={runProductPause}') && hq.includes('setStreamingProductLinePaused('), 'Pause and Resume run the engine\'s own pause');
const presentation = read('components/streaming-transplant/createCanonicalStreamingPresentation.ts');
assert.ok(presentation.includes("name: product.title.replace(/^EMPIRE\\+\\s*/, '')") && presentation.includes("'BUILDING' as const") && presentation.includes('lineId: product.lineId'),
    'A save\'s products are named as products, carry their line, and one being built says when it is ready');
console.log('PASS HQ: the Lab gone, both openers lead to the tab, Pause runs on the save');

/* ── no dead locks ── */
assert.equal(STREAMING_LIVE_EXTRA_COMING, 'Live & Sports is coming in a future update');
assert.equal(getStreamingPlanBuilderView({ technologyLevels: {}, productLines: [] }).extraLocks.live, STREAMING_LIVE_EXTRA_COMING, 'Before launch');
assert.equal(getStreamingPlanBuilderView({ technologyLevels: {}, productLines: [], launchCommit: {} }).extraLocks.live, STREAMING_LIVE_EXTRA_COMING, 'After launch');
assert.equal(getStreamingPlanBuilderView({ technologyLevels: {}, productLines: [{ lineId: 'LIVE', status: 'ACTIVE' }] }).extraLocks.live, undefined, 'A save running EMPIRE+ Live keeps Live events');
assert.ok(read('components/streaming-transplant/PlatformStatus.tsx').includes("section.id !== 'PRODUCTS' || section.rows.length > 0"), 'STATUS shows Products only once a product runs');
console.log('PASS locks: Live events say Live & Sports is coming; STATUS hides an empty Products group');

/* ── motion: only on screen, and never with reduced motion ── */
const styles = read('components/streaming-transplant/presentation/screens/NetworkDesk/ProductShowcase.module.css');
assert.ok(styles.includes('.scene *{animation-play-state:paused}') && styles.includes('[data-play] .scene *,.scene.live *{animation-play-state:running}'), 'A preview runs only while on screen or open');
assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\s*\.scene \*\{animation:none!important\}/.test(styles), 'Reduced motion stops every preview');
console.log('PASS motion: previews run on screen only; reduced motion shows the still');

console.log('EMPIRE+ product showcase audit passed.');
