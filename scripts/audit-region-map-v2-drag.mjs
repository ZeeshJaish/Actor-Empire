import assert from 'node:assert/strict';
import { chromium } from '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const errors = [];
const behaviorFailures = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(error.message));

await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=7`, { waitUntil: 'networkidle' });
const articles = page.locator('.map7-grid article');
const theatrical = articles.nth(0);
const finance = articles.nth(1);

await theatrical.locator('[aria-label^="North America,"]').focus();
await page.keyboard.press('Enter');
await theatrical.getByRole('button', { name: 'Return to world map' }).waitFor();
await theatrical.screenshot({ path: '/tmp/map7-theatrical-region-only.png' });
const theatricalCountryLabelCount = await theatrical.locator('.irm-country-marker-visible').count();
if (theatricalCountryLabelCount !== 0) {
    behaviorFailures.push(`Theatrical Release exposed ${theatricalCountryLabelCount} country labels after focusing a region.`);
}

const map = finance.locator('.interactive-region-map');
const svg = map.locator('svg');
await page.waitForTimeout(850);

const readPanState = async () => map.evaluate(element => {
    const svgElement = element.querySelector('svg');
    const geography = svgElement?.querySelector('g[clip-path] > g');
    const svgRect = svgElement?.getBoundingClientRect();
    const labels = [...element.querySelectorAll('.irm-country-marker-visible .irm-country-lbl')].map(text => {
        const rect = text.getBoundingClientRect();
        return {
            name: text.textContent ?? '',
            centreX: rect.left + rect.width / 2,
            left: rect.left,
            right: rect.right,
        };
    });
    return {
        geographyX: geography?.getScreenCTM()?.e ?? 0,
        svgLeft: svgRect?.left ?? 0,
        svgRight: svgRect?.right ?? 0,
        labels,
    };
});

await finance.screenshot({ path: '/tmp/map7-finance-drag-test-before.png' });
const before = await readPanState();
const box = await svg.boundingBox();
assert.ok(box, 'Studio Finance map SVG should be measurable.');
const startX = box.x + box.width * 0.72;
const dragY = box.y + box.height * 0.55;
await page.mouse.move(startX, dragY);
await page.mouse.down();
await page.mouse.move(startX - 125, dragY, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(120);
const after = await readPanState();
await finance.screenshot({ path: '/tmp/map7-finance-drag-test-after.png' });

for (const state of [before, after]) {
    assert.equal(
        state.labels.every(label => label.left >= state.svgLeft - 0.5 && label.right <= state.svgRight + 0.5),
        true,
        'Visible country labels should stay inside the map instead of clipping at an edge.',
    );
}

const mapDelta = after.geographyX - before.geographyX;
const beforeLabels = new Map(before.labels.map(label => [label.name, label]));
const anchoredLabels = after.labels.filter(label => beforeLabels.has(label.name));
assert.ok(anchoredLabels.length >= 4, 'The regional map should retain enough readable labels during a pan.');
for (const label of anchoredLabels) {
    const textDelta = label.centreX - beforeLabels.get(label.name).centreX;
    if (Math.abs(textDelta - mapDelta) > 0.75) {
        behaviorFailures.push(`${label.name} moved ${textDelta.toFixed(2)}px while its geography moved ${mapDelta.toFixed(2)}px.`);
    }
}

assert.deepEqual(errors, []);
assert.deepEqual(behaviorFailures, [], behaviorFailures.join(' '));
await browser.close();
console.log('Region map mobile drag anchoring audit passed.');
