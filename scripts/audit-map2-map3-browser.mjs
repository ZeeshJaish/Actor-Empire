import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:5180';
const map23OutputRoot = 'artifacts/map-v2/map2-map3-after';
const outputRoot = 'artifacts/map-v2/map4-map5-after';
const closureOutputRoot = 'artifacts/map-v2/map6-map7-after';
mkdirSync(`${map23OutputRoot}/greenlight`, { recursive: true });
mkdirSync(`${map23OutputRoot}/release`, { recursive: true });
mkdirSync(`${outputRoot}/finance`, { recursive: true });
mkdirSync(`${outputRoot}/network`, { recursive: true });
mkdirSync(`${closureOutputRoot}/cinematic`, { recursive: true });
mkdirSync(`${closureOutputRoot}/closure`, { recursive: true });

const browser = await chromium.launch({ headless: true });

const assertWorldLabelTracksZoomOut = async (map, labelText, context, snapshotName) => {
    await map.locator('svg.irm-svg.irm-zoomed').waitFor({ timeout: 1200 });
    const label = map.locator('.irm-region-label-hit').filter({ hasText: labelText }).first();
    await label.waitFor();
    const movingTransform = await label.getAttribute('transform');
    if (snapshotName) await map.screenshot({ path: `/tmp/${snapshotName}.png` });
    await map.locator('svg.irm-svg:not(.irm-zoomed)').waitFor({ timeout: 1800 });
    const settledTransform = await label.getAttribute('transform');
    assert.notEqual(
        movingTransform,
        settledTransform,
        `${context} world label should move with the geography while the map zooms out.`,
    );
};

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=2`, { waitUntil: 'networkidle' });
    await page.locator('svg.irm-svg.irm-drilldown').waitFor();
    const next = page.getByRole('button', { name: 'Next: Movie Setup' });
    assert.equal(await next.isDisabled(), true);
    await page.locator('[aria-label^="North America,"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[aria-label="Toronto"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[aria-label="Vancouver"]').focus();
    await page.keyboard.press('Enter');
    const selectedBadge = page.locator('[data-greenlight-map-toolbar]').getByText('2 selected', { exact: true });
    await selectedBadge.waitFor();
    assert.equal(await next.isEnabled(), true);
    assert.equal(await page.locator('[aria-label="Toronto"][aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('[aria-label="Vancouver"][aria-pressed="true"]').count(), 1);
    assert.match(await page.locator('body').innerText(), /Production cities in North America/i);
    assert.equal(await page.locator('[data-greenlight-location-catalogue]').getByRole('button').count(), 6);
    assert.equal(await page.locator('[data-greenlight-location-catalogue]').getByRole('button').filter({ hasText: 'MUMBAI' }).count(), 0);
    const selectedBadgeBox = await selectedBadge.boundingBox();
    const actionBarBox = await page.locator('.fixed.bottom-0').boundingBox();
    assert.ok(selectedBadgeBox && actionBarBox && selectedBadgeBox.y + selectedBadgeBox.height <= actionBarBox.y);
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${map23OutputRoot}/greenlight/map2-canada-${height}.png` });
    await page.getByRole('button', { name: 'Change production region' }).click();
    await assertWorldLabelTracksZoomOut(page.locator('.interactive-region-map'), 'ASIA', 'Greenlight', `greenlight-zoom-out-${height}`);
    assert.deepEqual(errors, []);
    await context.close();
}

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
        const realNow = Date.now.bind(Date);
        let offsetMs = 0;
        Date.now = () => realNow() + offsetMs;
        window.__advanceMapClock = (ms) => { offsetMs += ms; };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=6`, { waitUntil: 'networkidle' });
    const cinematic = page.locator('.irm-cinematic').first();
    await page.locator('svg.irm-cinematic-svg').waitFor();
    await page.locator('[data-cinematic-frame="0"]').waitFor();
    assert.equal(await cinematic.locator('[role="button"]').count(), 0);
    assert.equal(await cinematic.locator('[tabindex]').count(), 0);
    assert.equal(await cinematic.getAttribute('data-visible-pin-count'), '0');

    await page.evaluate(() => {
        window.__advanceMapClock(2_500);
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.locator('[data-cinematic-frame="2"][data-visible-pin-count="2"][data-visible-route-count="1"]').waitFor();
    assert.equal(await cinematic.getAttribute('data-cinematic-complete'), 'false');

    await page.evaluate(() => {
        window.__advanceMapClock(2_000);
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.locator('[data-cinematic-complete="true"][data-visible-pin-count="2"][data-visible-route-count="1"]').waitFor();
    assert.equal(await cinematic.locator('.irm-pin-built').count(), 1);
    assert.equal(await cinematic.locator('.irm-pin-planned').count(), 1);
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${closureOutputRoot}/cinematic/map6-complete-${height}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    assert.deepEqual(errors, []);
    await context.close();
}

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=6`, { waitUntil: 'networkidle' });
    const cinematic = page.locator('[data-cinematic-complete="true"][data-visible-pin-count="2"][data-visible-route-count="1"]');
    await cinematic.waitFor();
    assert.equal(await cinematic.locator('animateMotion').count(), 0);
    assert.equal(await cinematic.locator('[role="button"]').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
}

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=7`, { waitUntil: 'networkidle' });
    await page.locator('.map7-grid svg.irm-svg').first().waitFor();
    assert.equal(await page.locator('.map7-grid svg.irm-svg').count(), 3);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    const financeMap = page.locator('.map7-grid article').nth(1).locator('.interactive-region-map');
    assert.equal(await financeMap.locator('.irm-pin').count(), 2);
    const networkMap = page.locator('.map7-grid article').nth(2).locator('.interactive-region-map');
    const networkPinCount = await networkMap.locator('.irm-pin').count();
    const networkLabelCount = Number(await networkMap.getAttribute('data-pin-label-count'));
    assert.equal(networkPinCount, 5);
    assert.ok(networkLabelCount < networkPinCount, 'World-level dense facility labels should be collision-pruned.');
    const hitBoxes = await page.locator('.map7-grid .irm-pin-hit').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
    }));
    assert.ok(hitBoxes.length >= 7);
    assert.equal(hitBoxes.every(box => box.width >= 24 && box.height >= 24), true);

    const releaseMap = page.locator('.map7-grid article').first();
    await releaseMap.locator('[aria-label^="North America,"]').focus();
    await page.keyboard.press('Enter');
    await releaseMap.getByRole('button', { name: 'Return to world map' }).waitFor();
    await releaseMap.getByRole('button', { name: 'Return to world map' }).click();
    await page.locator('.map7-grid').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${closureOutputRoot}/closure/map7-three-maps-${height}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
}

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=4`, { waitUntil: 'networkidle' });
    await page.locator('svg.irm-svg.irm-drilldown').waitFor();
    const financeToolbar = page.locator('[data-map-navigation-toolbar="finance"]');
    assert.equal(await financeToolbar.count(), 1);
    const financeToolbarIcon = await financeToolbar.locator('svg').boundingBox();
    assert.ok(financeToolbarIcon && financeToolbarIcon.width <= 20 && financeToolbarIcon.height <= 20, 'Finance toolbar globe must stay compact.');
    assert.equal(await page.locator('.irm-breadcrumb').count(), 0, 'Finance toolbar should replace the duplicate map breadcrumb.');
    await page.locator('[aria-label^="North America,"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('.irm-pin-built[aria-label="Los Angeles"]').waitFor();
    await page.locator('.irm-pin-planned[aria-label="Toronto"]').waitFor();
    await financeToolbar.getByRole('button', { name: 'Show whole world' }).waitFor();
    assert.equal(await page.locator('.irm-breadcrumb').count(), 0, 'Finance toolbar should replace the duplicate map breadcrumb while focused.');
    assert.equal(await page.locator('.irm-route-planned').count(), 1);
    await page.waitForTimeout(700);
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outputRoot}/finance/map4-north-america-${height}.png` });
    await page.getByRole('button', { name: 'Canada, mapped location' }).focus();
    await page.keyboard.press('Enter');
    await page.locator('[aria-label="Toronto"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-map4-selected="TOR"]').waitFor();
    assert.match(await page.locator('[data-map4-selected="TOR"]').innerText(), /Selected city: TOR · Toronto/);
    const activeTorontoPin = page.locator('.irm-pin-active[aria-label="Toronto"][aria-pressed="true"]');
    assert.equal(await activeTorontoPin.count(), 1);
    await page.waitForTimeout(700);
    const activeTorontoBox = await activeTorontoPin.boundingBox();
    assert.ok(activeTorontoBox && activeTorontoBox.width >= 24, 'Country-level facility pins must remain a readable tap size.');
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outputRoot}/finance/map4-toronto-${height}.png` });
    await financeToolbar.getByRole('button', { name: 'Show whole world' }).click();
    await page.locator('[data-map4-selected="TOR"]').waitFor();
    await assertWorldLabelTracksZoomOut(page.locator('.interactive-region-map'), 'NORTH AMERICA', 'Studio Finance', `finance-zoom-out-${height}`);
    const worldTorontoLocator = page.locator('.irm-pin-world-locator[aria-label="Toronto"][aria-pressed="true"]');
    assert.equal(await worldTorontoLocator.count(), 1, 'World view should retain the selected Studio Finance city as a compact locator.');
    assert.equal(await worldTorontoLocator.locator('.irm-pin-lbl, .irm-pin-badge, .irm-pin-ring').count(), 0, 'Studio Finance world locator should not add city text or a pulse ring.');
    assert.equal(await worldTorontoLocator.locator('.irm-pin-dot').getAttribute('r'), '4');
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/map4-world-selected-${height}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    assert.deepEqual(errors, []);
    await context.close();
}

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=5`, { waitUntil: 'networkidle' });
    await page.locator('svg.irm-svg.irm-drilldown').waitFor();
    const streamingToolbar = page.locator('[data-map-navigation-toolbar="streaming"]');
    assert.equal(await streamingToolbar.count(), 1);
    const streamingToolbarIcon = await streamingToolbar.locator('svg').boundingBox();
    assert.ok(streamingToolbarIcon && streamingToolbarIcon.width <= 20 && streamingToolbarIcon.height <= 20, 'Streaming toolbar globe must stay compact.');
    assert.equal(await page.locator('.irm-breadcrumb').count(), 0, 'Streaming toolbar should replace the duplicate map breadcrumb.');
    assert.equal(await page.locator('.irm-pin-origin').count(), 1);
    assert.equal(await page.locator('.irm-pin-relay').count(), 1);
    assert.equal(await page.locator('.irm-pin-cache').count(), 1);
    assert.equal(await page.locator('.irm-pin-load').count(), 3);
    assert.equal(await page.locator('.irm-region-warning').count(), 1);
    await page.locator('[aria-label="London, 8 racks, 64% of capacity"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-map5-selected="facility-ldn"]').waitFor();
    await streamingToolbar.getByRole('button', { name: 'Show whole world' }).waitFor();
    assert.equal(await page.locator('.irm-breadcrumb').count(), 0, 'Streaming toolbar should replace the duplicate map breadcrumb while focused.');
    assert.equal(await page.locator('.irm-pin-active[aria-pressed="true"]').count(), 1);
    await streamingToolbar.getByRole('button', { name: 'Show whole world' }).click();
    await page.locator('[aria-label="London, 8 racks, 64% of capacity"][aria-pressed="true"]').waitFor();
    await page.locator('svg.irm-svg:not(.irm-zoomed)').waitFor({ timeout: 1800 });
    assert.match(await page.locator('[data-map5-selected="facility-ldn"]').innerText(), /Selected facility: facility-ldn/);
    assert.match(await page.locator('body').innerText(), /Origin\s+Relay\s+Cache\s+Drawn/i);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outputRoot}/network/map5-london-${height}.png` });
    assert.deepEqual(errors, []);
    await context.close();
}

for (const height of [600, 852]) {
    const context = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=3`, { waitUntil: 'networkidle' });
    await page.locator('svg.irm-svg.irm-drilldown').waitFor();
    const theatricalToolbar = page.locator('[data-map-navigation-toolbar="theatrical"]');
    assert.equal(await theatricalToolbar.count(), 1);
    const theatricalToolbarIcon = await theatricalToolbar.locator('svg').boundingBox();
    assert.ok(theatricalToolbarIcon && theatricalToolbarIcon.width <= 20 && theatricalToolbarIcon.height <= 20, 'Theatrical toolbar globe must stay compact.');
    assert.equal(await page.locator('.irm-breadcrumb').count(), 0, 'Theatrical toolbar should replace the duplicate map breadcrumb.');
    assert.match(await theatricalToolbar.innerText(), /THEATRICAL WORLD[\s\S]*0 SELECTED/i);
    assert.match(await page.locator('[class*="splitbar"]').innerText(), /%/);
    assert.doesNotMatch(await page.locator('[class*="splitbar"]').innerText(), /¢/);
    const continueButton = page.getByRole('button', { name: 'CONTINUE' });
    assert.equal(await continueButton.isDisabled(), true);
    await page.locator('[aria-label^="Europe,"]').focus();
    await page.keyboard.press('Enter');
    const theatricalWorldButton = theatricalToolbar.getByRole('button', { name: 'Show whole world' });
    await theatricalWorldButton.waitFor();
    assert.equal(await page.locator('.irm-breadcrumb').count(), 0, 'Theatrical toolbar should replace the duplicate map breadcrumb while focused.');
    assert.equal(await page.locator('svg .irm-country[role="button"]').count(), 0);
    assert.equal(await page.locator('.irm-region-base[aria-pressed="true"]').count(), 1);
    assert.match(await theatricalToolbar.innerText(), /EUROPE[\s\S]*1 SELECTED/i);
    await page.locator('svg.irm-svg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${map23OutputRoot}/release/map3-europe-${height}.png` });
    await theatricalWorldButton.waitFor({ state: 'detached', timeout: 2500 });
    await assertWorldLabelTracksZoomOut(page.locator('.interactive-region-map'), 'NORTH AMERICA', 'Theatrical Release', `theatrical-zoom-out-${height}`);
    await page.locator('[aria-label^="Europe,"][aria-pressed="true"]').waitFor();
    assert.match(await theatricalToolbar.innerText(), /THEATRICAL WORLD[\s\S]*1 SELECTED/i);
    await page.locator('[aria-label^="Europe,"]').focus();
    await page.keyboard.press('Enter');
    await theatricalWorldButton.waitFor();
    assert.equal(await page.locator('.irm-region-base[aria-pressed="true"]').count(), 0);
    await theatricalWorldButton.waitFor({ state: 'detached', timeout: 2500 });
    assert.match(await theatricalToolbar.innerText(), /THEATRICAL WORLD[\s\S]*0 SELECTED/i);
    assert.equal(await continueButton.isDisabled(), true);
    assert.deepEqual(errors, []);
    await context.close();
}

await browser.close();
console.log('MAP2–MAP7 browser audit passed at 393x600 and 393x852.');
