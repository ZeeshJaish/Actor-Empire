import assert from 'node:assert/strict';
import { chromium } from '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ headless: true });
const failures = [];

const overlaps = (a, b) => Boolean(a && b
    && a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y);

const clickWorldRegionLabel = async (page, map, label) => {
    const regionLabel = map.locator('.irm-lbl').filter({ hasText: label });
    await regionLabel.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 180));
    const box = await regionLabel.boundingBox();
    assert.ok(box, `${label} map label should be visible and tappable.`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

for (const height of [600, 852]) {
    const page = await browser.newPage({ viewport: { width: 393, height }, deviceScaleFactor: 1 });
    const runtimeErrors = [];
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto(`${baseUrl}/artifacts/map-v2/review.html?map=2`, { waitUntil: 'networkidle' });

    const map = page.locator('.interactive-region-map').first();
    const svg = map.locator('svg');
    const oceanFill = await svg.locator(':scope > rect').first().getAttribute('fill');
    if (oceanFill === '#080d16') failures.push(`${height}px: Greenlight still uses the black production ocean.`);

    const toolbar = page.locator('[data-greenlight-map-toolbar]');
    if (await toolbar.count() !== 1) failures.push(`${height}px: Greenlight map controls are not in a dedicated toolbar.`);
    const initialWorldToolbarHeight = (await toolbar.boundingBox())?.height ?? 0;
    const catalogue = page.locator('[data-greenlight-location-catalogue]');
    if (await catalogue.count() !== 0) failures.push(`${height}px: World view renders the full city catalogue before a region is chosen.`);
    if (await page.locator('[data-greenlight-region-prompt]').count() !== 1) failures.push(`${height}px: World view does not prompt the player to choose a map region.`);
    if (await page.getByRole('button', { name: 'Show Asia on map' }).count() !== 0) failures.push(`${height}px: regions are duplicated as menu buttons.`);
    if (!/0 selected/i.test(await toolbar.innerText())) failures.push(`${height}px: fresh Greenlight review does not start with zero selections.`);
    if (await page.locator('[data-greenlight-map-toolbar][data-greenlight-selected-locations]').count() !== 1) failures.push(`${height}px: map and selection controls are not merged into one bar.`);

    await clickWorldRegionLabel(page, map, 'ASIA');
    await map.locator('.irm-breadcrumb').filter({ hasText: 'Asia' }).waitFor();
    await page.waitForTimeout(800);
    await catalogue.waitFor();
    if (await catalogue.getByRole('button').count() !== 6) failures.push(`${height}px: Asia does not expose its six production cities in the menu.`);
    if (await map.locator('.irm-pin').count() !== 6) failures.push(`${height}px: Asia does not expose its six production cities on the map.`);
    if (await page.getByRole('button', { name: 'Change production region' }).count() !== 1) failures.push(`${height}px: focused region has no direct Change region control.`);
    if (await map.locator('.irm-country-lbl, .irm-country-content-dot').count() !== 0) failures.push(`${height}px: region view still renders country names or mapped-country markers.`);
    if (await map.locator('.irm-country[role="button"]').count() !== 0) failures.push(`${height}px: country shapes remain selectable in Greenlight.`);
    if (await map.locator('.irm-pin-badge').count() !== 0) failures.push(`${height}px: map pins still display the production-city quality subtitle.`);

    const geography = map.locator('g[clip-path] > g').first();
    const beforePinTransform = await geography.getAttribute('transform');
    await map.locator('.irm-pin[aria-label="Mumbai"]').click();
    await page.waitForTimeout(800);
    const afterPinTransform = await geography.getAttribute('transform');
    const breadcrumb = (await map.locator('.irm-breadcrumb').innerText()).replace(/\s+/g, ' ').trim();
    if (beforePinTransform !== afterPinTransform) failures.push(`${height}px: Mumbai focus abandoned the region-wide camera.`);
    if (!/World \/ Asia \/ Mumbai/i.test(breadcrumb)) failures.push(`${height}px: Mumbai map pin left the map at ${breadcrumb}.`);
    const focusedMumbaiPin = map.locator('.irm-pin[aria-label="Mumbai"]');
    if (await focusedMumbaiPin.count() !== 1 || await focusedMumbaiPin.getAttribute('aria-pressed') !== 'true') {
        failures.push(`${height}px: Mumbai map pin did not select the location.`);
    }
    if (await focusedMumbaiPin.count() !== 1 || await focusedMumbaiPin.locator('.irm-pin-lbl').count() !== 1) {
        failures.push(`${height}px: selected Mumbai label is not visible.`);
    }
    if (await map.locator('.irm-pin').count() !== 6) failures.push(`${height}px: Mumbai focus hides other Asian city pins.`);
    if (!/Mumbai/i.test(await page.locator('[data-greenlight-selected-locations]').innerText())) {
        failures.push(`${height}px: selected Mumbai is not named outside the map.`);
    }
    if (await map.locator('.irm-country-lbl, .irm-country-content-dot').count() !== 0) failures.push(`${height}px: Mumbai focus restored country labels or markers.`);
    if (await catalogue.getByRole('button').count() !== 6) failures.push(`${height}px: Mumbai focus reduced the menu below all six Asian cities.`);

    await catalogue.getByRole('button').filter({ hasText: 'TOKYO' }).click();
    await page.waitForTimeout(800);
    const japanBreadcrumb = (await map.locator('.irm-breadcrumb').innerText()).replace(/\s+/g, ' ').trim();
    if (!/World \/ Asia \/ Tokyo/i.test(japanBreadcrumb)) failures.push(`${height}px: Tokyo menu card left the map at ${japanBreadcrumb}.`);
    if (await catalogue.getByRole('button').count() !== 6) failures.push(`${height}px: Tokyo selection hid other Asian city options.`);
    if (await map.locator('.irm-pin').count() !== 6) failures.push(`${height}px: Tokyo focus hid other Asian map pins.`);

    await page.getByRole('button', { name: 'Change production region' }).click();
    await page.waitForTimeout(800);
    if (await catalogue.count() !== 0) failures.push(`${height}px: Change region did not return to the region-selection state.`);
    const selectedWorldPins = map.locator('.irm-pin');
    if (await selectedWorldPins.count() !== 2) failures.push(`${height}px: World view does not show the two selected cities as locator dots.`);
    if (await selectedWorldPins.locator('.irm-pin-lbl, .irm-pin-badge, .irm-pin-ring').count() !== 0) failures.push(`${height}px: World selected-city locators render labels, badges, or rings.`);
    const worldPinRadii = await selectedWorldPins.locator('.irm-pin-dot').evaluateAll(dots => dots.map(dot => dot.getAttribute('r')));
    if (worldPinRadii.join('|') !== '4|4') failures.push(`${height}px: World selected-city locators are not compact four-pixel dots (${worldPinRadii.join(', ')}).`);
    if (await toolbar.locator('button[aria-label^="Focus map on"]').count() !== 0) failures.push(`${height}px: World toolbar still renders selected-city chips.`);
    if (await toolbar.locator('[data-greenlight-selected-more]').count() !== 0) failures.push(`${height}px: World toolbar renders a city overflow summary.`);
    if (!/2 selected/i.test(await toolbar.innerText())) failures.push(`${height}px: World toolbar lost the global selected count.`);
    const selectedWorldToolbarHeight = (await toolbar.boundingBox())?.height ?? 0;
    if (selectedWorldToolbarHeight > initialWorldToolbarHeight + 2) failures.push(`${height}px: World toolbar grows into a second row when cities are selected.`);

    const worldMumbaiPin = map.locator('.irm-pin[aria-label="Mumbai"]');
    if (await worldMumbaiPin.count() === 1) {
        await worldMumbaiPin.click();
        await page.waitForTimeout(800);
        const worldMumbaiBreadcrumb = (await map.locator('.irm-breadcrumb').innerText()).replace(/\s+/g, ' ').trim();
        if (!/World \/ Asia \/ Mumbai/i.test(worldMumbaiBreadcrumb)) failures.push(`${height}px: selected Mumbai world locator did not open its region focus.`);
        if (!/2 selected/i.test(await toolbar.innerText())) failures.push(`${height}px: opening selected Mumbai from the world map deselected it.`);
        await page.getByRole('button', { name: 'Change production region' }).click();
        await page.waitForTimeout(800);
    }

    await clickWorldRegionLabel(page, map, 'NORTH AMERICA');
    await catalogue.waitFor();
    if (await catalogue.getByRole('button').count() !== 6) failures.push(`${height}px: North America does not expose its six production cities.`);
    await catalogue.getByRole('button').filter({ hasText: 'TORONTO' }).click();
    await page.waitForTimeout(800);
    const torontoBreadcrumb = (await map.locator('.irm-breadcrumb').innerText()).replace(/\s+/g, ' ').trim();
    if (!/World \/ North America \/ Toronto/i.test(torontoBreadcrumb)) {
        failures.push(`${height}px: Toronto card did not fly directly to its city focus; got ${torontoBreadcrumb}.`);
    }
    if (await catalogue.getByRole('button').count() !== 6) {
        failures.push(`${height}px: Toronto focus hid other North American city options.`);
    }
    if (await map.locator('.irm-pin').count() !== 6) failures.push(`${height}px: Toronto focus hides other North American city pins.`);
    if (await map.locator('.irm-pin-focused[aria-label="Toronto"] .irm-pin-lbl').count() !== 1) failures.push(`${height}px: Toronto is not the dominant labeled city.`);
    if (await map.locator('.irm-pin[aria-label="Vancouver"]').count() !== 1 || await map.locator('.irm-pin-context[aria-label="Vancouver"]').count() !== 0) failures.push(`${height}px: Vancouver is not retained in the region-wide city context.`);
    if (await map.locator('.irm-country-lbl, .irm-country-content-dot').count() !== 0) failures.push(`${height}px: Toronto focus renders country UI.`);
    if (!/3 selected/i.test(await toolbar.innerText())) failures.push(`${height}px: map and menu selections did not produce a three-location summary.`);

    await catalogue.getByRole('button').filter({ hasText: 'LOS ANGELES' }).click();
    await page.waitForTimeout(800);
    await catalogue.getByRole('button').filter({ hasText: 'ATLANTA' }).click();
    await page.waitForTimeout(800);
    const atlantaBreadcrumb = (await map.locator('.irm-breadcrumb').innerText()).replace(/\s+/g, ' ').trim();
    if (!/World \/ North America \/ Atlanta/i.test(atlantaBreadcrumb)) failures.push(`${height}px: Atlanta focus left the map at ${atlantaBreadcrumb}.`);
    if (await map.locator('.irm-pin').count() !== 6) failures.push(`${height}px: Atlanta focus hides regional city pins.`);
    const losAngelesPin = map.locator('.irm-pin[aria-label="Los Angeles"]');
    const atlantaPin = map.locator('.irm-pin[aria-label="Atlanta"]');
    if (await losAngelesPin.getAttribute('aria-pressed') !== 'true' || await losAngelesPin.getAttribute('class').then(value => value?.includes('irm-pin-focused'))) {
        failures.push(`${height}px: Los Angeles is not retained as a quieter selected city after Atlanta takes focus.`);
    }
    if (await atlantaPin.getAttribute('aria-pressed') !== 'true' || !(await atlantaPin.getAttribute('class'))?.includes('irm-pin-focused')) {
        failures.push(`${height}px: Atlanta did not become the focused selected city.`);
    }
    const selectedRadius = Number(await losAngelesPin.locator('.irm-pin-dot').getAttribute('r'));
    const focusedRadius = Number(await atlantaPin.locator('.irm-pin-dot').getAttribute('r'));
    if (!(focusedRadius > selectedRadius)) failures.push(`${height}px: focused Atlanta is not visually larger than selected Los Angeles.`);
    const losAngelesLabelBox = await losAngelesPin.locator('.irm-pin-lbl').boundingBox();
    const atlantaLabelBox = await atlantaPin.locator('.irm-pin-lbl').boundingBox();
    if (overlaps(losAngelesLabelBox, atlantaLabelBox)) failures.push(`${height}px: Los Angeles and Atlanta labels overlap after focus changes.`);
    if (!/5 selected/i.test(await toolbar.innerText())) failures.push(`${height}px: multi-city focus did not retain all five selections.`);
    await map.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/greenlight-north-america-focus-${height}.png`, fullPage: false });

    const selectedFocusButtons = page.locator('[data-greenlight-selected-locations] button[aria-label^="Focus map on"]');
    const selectedFocusLabels = await selectedFocusButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
    if (await selectedFocusButtons.count() !== 2 || selectedFocusLabels.join('|') !== 'Focus map on Los Angeles|Focus map on Atlanta') {
        failures.push(`${height}px: North America toolbar does not limit chips to its first two selected cities (${selectedFocusLabels.join(', ')}).`);
    }
    const moreSelected = toolbar.locator('[data-greenlight-selected-more]');
    if (await moreSelected.count() !== 1 || !/\+1 more/i.test(await moreSelected.innerText())) {
        failures.push(`${height}px: North America toolbar does not summarize its remaining selected city.`);
    }

    await page.getByRole('button', { name: 'Change production region' }).click();
    await page.waitForTimeout(800);
    if (await map.locator('.irm-pin').count() !== 5) failures.push(`${height}px: World map does not retain all five selected-city locator dots.`);
    if (await map.locator('.irm-pin-lbl, .irm-pin-badge, .irm-pin-ring').count() !== 0) failures.push(`${height}px: five world locator dots reintroduce city text or rings.`);
    if (await toolbar.locator('button[aria-label^="Focus map on"]').count() !== 0) failures.push(`${height}px: five selections clutter the World toolbar with city chips.`);
    await map.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/greenlight-world-clean-${height}.png`, fullPage: false });

    await clickWorldRegionLabel(page, map, 'ASIA');
    await catalogue.waitFor();
    const asiaFocusButtons = toolbar.locator('button[aria-label^="Focus map on"]');
    if (await asiaFocusButtons.count() !== 2) failures.push(`${height}px: Asia does not show its two selected-city focus chips.`);
    const mumbaiFocusButton = page.locator('[data-greenlight-selected-locations] button[aria-label="Focus map on Mumbai"]');
    if (await mumbaiFocusButton.count() !== 1) {
        failures.push(`${height}px: selected locations lost the Mumbai focus control (${selectedFocusLabels.join(', ')}).`);
    } else {
        await mumbaiFocusButton.click();
        await page.waitForTimeout(800);
        const returnedMumbaiBreadcrumb = (await map.locator('.irm-breadcrumb').innerText()).replace(/\s+/g, ' ').trim();
        if (!/World \/ Asia \/ Mumbai/i.test(returnedMumbaiBreadcrumb)) {
            failures.push(`${height}px: selected Mumbai chip did not return the camera to Mumbai.`);
        }
        if (await catalogue.getByRole('button').count() !== 6) failures.push(`${height}px: selected Mumbai chip did not restore the Asian city menu.`);
    }

    if (await toolbar.count() === 1) {
        const toolbarBox = await toolbar.boundingBox();
        const svgBox = await svg.boundingBox();
        if (overlaps(toolbarBox, svgBox)) failures.push(`${height}px: the Greenlight toolbar overlaps the map canvas.`);
    }

    await map.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/greenlight-location-navigation-${height}.png`, fullPage: false });
    await catalogue.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/greenlight-location-catalogue-${height}.png`, fullPage: false });

    await page.getByRole('button', { name: 'Clear all locations' }).click();
    if (!/0 selected/i.test(await toolbar.innerText())) failures.push(`${height}px: Clear all did not reset the selected count.`);
    if (await map.locator('.irm-pin[aria-pressed="true"]').count() !== 0) failures.push(`${height}px: selected map pins remain after Clear all.`);
    if (runtimeErrors.length) failures.push(`${height}px: runtime errors: ${runtimeErrors.join(' | ')}`);
    await page.close();
}

await browser.close();
assert.deepEqual(failures, [], failures.join(' '));
console.log('Greenlight map colour, focus, labels, and list-sync audit passed at 393x600 and 393x852.');
