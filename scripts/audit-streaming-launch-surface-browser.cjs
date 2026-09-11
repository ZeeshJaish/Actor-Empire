const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const pixels = value => Number.parseFloat(value || '0');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000/scripts/fixtures/streaming-launch-surface.html');
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Define the Launch' }).waitFor();

    const shell = page.locator('.sf.lw');
    const tokens = await shell.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        chip: style.getPropertyValue('--sf-r-chip').trim(),
        card: style.getPropertyValue('--sf-r-card').trim(),
        sheet: style.getPropertyValue('--sf-r-sheet').trim(),
        backgroundImage: style.backgroundImage,
      };
    });
    assert.ok(pixels(tokens.chip) >= 12, 'Shared controls use a soft 12px or larger radius');
    assert.ok(pixels(tokens.card) >= 16, 'Shared cards use a soft 16px or larger radius');
    assert.ok(pixels(tokens.sheet) >= 22, 'Sheets use a soft 22px or larger radius');
    assert.match(tokens.backgroundImage, /radial-gradient/i,
      'The wizard canvas includes a restrained platform-colour projection glow');
    assert.match(tokens.backgroundImage, /linear-gradient/i,
      'The wizard canvas uses layered charcoal rather than a flat black fill');

    const rail = await page.locator('.lw-rail').evaluate(element => {
      const style = getComputedStyle(element);
      return { radius: style.borderRadius, marginLeft: style.marginLeft };
    });
    assert.ok(pixels(rail.radius) >= 16, 'The money rail is a rounded inset surface');
    assert.ok(pixels(rail.marginLeft) >= 10, 'The money rail no longer touches both screen edges');

    const footer = await page.locator('.lw-foot').evaluate(element => {
      const style = getComputedStyle(element);
      return { radius: style.borderRadius, marginLeft: style.marginLeft };
    });
    assert.ok(pixels(footer.radius) >= 16, 'The action dock is a rounded floating surface');
    assert.ok(pixels(footer.marginLeft) >= 10, 'The action dock no longer touches both screen edges');

    assert.ok(pixels(await page.locator('.lw-country').first().evaluate(element => getComputedStyle(element).borderRadius)) >= 16,
      'Country cards inherit the softer card geometry');
    assert.ok(pixels(await page.locator('.sf-btn--primary').last().evaluate(element => getComputedStyle(element).borderRadius)) >= 12,
      'Primary actions inherit the softer control geometry');

    await page.screenshot({ path: '/tmp/streaming-launch-surface-390.png' });

    await page.setViewportSize({ width: 320, height: 740 });
    const narrow = await shell.evaluate(element => ({
      fits: element.scrollWidth <= element.clientWidth,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      offenders: Array.from(element.querySelectorAll('*')).flatMap(node => {
        const rect = node.getBoundingClientRect();
        return rect.right > element.clientWidth + 0.5 || rect.left < -0.5
          ? [{ className: node.className?.baseVal || node.className || node.tagName, left: rect.left, right: rect.right, width: rect.width }]
          : [];
      }).slice(0, 12),
    }));
    if (!narrow.fits) console.error('Narrow viewport overflow evidence:', narrow);
    assert.equal(narrow.fits, true,
      'The polished launch wizard fits a 320px mobile viewport without horizontal overflow');
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/streaming-launch-surface-320.png' });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000/scripts/fixtures/streaming-launch-surface.html?step=pricing');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Edit Essential plan' }).waitFor();
    await page.screenshot({ path: '/tmp/streaming-launch-pricing-top-390.png' });

    const planTabs = page.locator('.pr-plan-tab');
    assert.equal(await planTabs.count(), 3, 'The canonical opening offer keeps its three launch plans together');
    assert.deepEqual(await planTabs.evaluateAll(cards => cards.map(card => card.getAttribute('data-plan-tone'))),
      ['essential', 'standard', 'premiere'],
      'Essential, Standard and Premiere expose stable tier identities for styling');

    const cardMetrics = await planTabs.evaluateAll(cards => cards.map(card => {
      const style = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      return {
        tier: style.getPropertyValue('--pr-tier-rgb').trim(),
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        railBackgroundImage: getComputedStyle(card, '::before').backgroundImage,
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }));
    assert.equal(new Set(cardMetrics.map(card => card.tier)).size, 3,
      'Each launch plan has a distinct restrained colour signal');
    assert.equal(new Set(cardMetrics.map(card => card.backgroundColor)).size, 3,
      'Each launch plan uses a distinct solid tier surface');
    assert.ok(cardMetrics.every(card => card.backgroundImage === 'none'),
      'Plan summaries use solid surfaces instead of gradients');
    assert.ok(cardMetrics.every(card => card.railBackgroundImage === 'none'),
      'Plan summary colour rails stay solid instead of fading into gradients');
    assert.equal(new Set(cardMetrics.map(card => card.top)).size, 1,
      'The three launch plans remain on one comparison row');
    assert.equal(new Set(cardMetrics.map(card => card.width)).size, 1,
      'The three launch plans use equal width');
    assert.equal(new Set(cardMetrics.map(card => card.height)).size, 1,
      'The three launch plans use equal height');
    assert.equal(await page.locator('.pr-plan-editor').count(), 0,
      'Plan editors start collapsed so the comparison remains compact');

    const standardTab = page.getByRole('button', { name: 'Edit Standard plan' });
    await standardTab.click();
    assert.equal(await standardTab.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.pr-plan-editor').count(), 1,
      'Opening a plan reveals one full-width editor');
    const openPlanSurface = await page.locator('.pr-plan-editor').evaluate(element => {
      const style = getComputedStyle(element);
      return {
        backgroundImage: style.backgroundImage,
        railBackgroundImage: getComputedStyle(element, '::before').backgroundImage,
      };
    });
    assert.equal(openPlanSurface.backgroundImage, 'none',
      'The expanded plan editor uses the same solid surface language');
    assert.equal(openPlanSurface.railBackgroundImage, 'none',
      'The expanded plan editor keeps a solid tier rail');
    assert.equal(await page.getByRole('textbox', { name: 'Plan name' }).inputValue(), 'Standard');
    await page.getByRole('button', { name: /1080p locked: Playback Quality level 20/ }).waitFor();

    const standardPrice = page.locator('.pr-plan-editor .pr-price-figure');
    const priceBefore = await standardPrice.innerText();
    await page.locator('.pr-plan-editor .st-step').last().click();
    assert.notEqual(await standardPrice.innerText(), priceBefore,
      'The compact comparison keeps the real plan price control connected');
    await page.screenshot({ path: '/tmp/streaming-launch-pricing-expanded-390.png' });
    await page.getByRole('button', { name: 'No adverts', exact: true }).click();
    assert.match(await standardTab.locator('.pr-plan-tab-features').innerText(), /No adverts/,
      'The compact plan summary immediately reflects a feature selected in the editor');
    await standardTab.click();
    assert.equal(await page.locator('.pr-plan-editor').count(), 0,
      'Tapping the active plan collapses its editor');

    await page.getByRole('button', { name: 'Add a plan' }).click();
    const customTab = page.getByRole('button', { name: 'Edit Plan 4 plan' });
    assert.equal(await customTab.getAttribute('data-plan-tone'), 'custom',
      'Player-created plans use the platform-branded custom tier treatment');
    const assignedCustomColour = await customTab.getAttribute('data-plan-color');
    assert.ok(['emerald', 'ocean', 'teal', 'rose', 'magenta', 'graphite'].includes(assignedCustomColour),
      'A new player-created plan receives one saved colour from the curated palette');
    const customSurface = await customTab.evaluate(element => {
      const style = getComputedStyle(element);
      return { backgroundImage: style.backgroundImage, backgroundColor: style.backgroundColor };
    });
    assert.equal(customSurface.backgroundImage, 'none',
      'Player-created plan summaries also use a solid surface');
    assert.notEqual(customSurface.backgroundColor, cardMetrics[0].backgroundColor,
      'Player-created plans do not masquerade as a canonical tier');
    assert.equal(await page.getByRole('button', { name: /plan colour/ }).count(), 6,
      'The expanded custom plan editor offers the complete restrained colour palette');
    const swatchColours = await page.locator('.pr-plan-colour span').evaluateAll(swatches => (
      swatches.map(swatch => getComputedStyle(swatch).backgroundColor)
    ));
    assert.equal(new Set(swatchColours).size, 6,
      'Every plan-colour swatch visibly represents a different palette colour');
    const customPriceBeforeColourChange = await page.locator('.pr-plan-editor .pr-price-figure').innerText();
    await page.getByRole('button', { name: 'Ocean plan colour' }).click();
    assert.equal(await customTab.getAttribute('data-plan-color'), 'ocean',
      'Choosing a colour immediately updates the compact plan identity');
    assert.equal(await page.locator('.pr-plan-editor').getAttribute('data-plan-color'), 'ocean',
      'Choosing a colour remains attached to the expanded plan editor');
    assert.equal(await page.locator('.pr-plan-editor .pr-price-figure').innerText(), customPriceBeforeColourChange,
      'Changing a plan colour never changes its commercial price');
    await page.screenshot({ path: '/tmp/streaming-launch-custom-plan-colours-390.png' });
    await page.getByRole('button', { name: 'Remove Plan 4' }).click();

    const earningTiles = await page.locator('.pr-pick').evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().height)));
    for (let index = 0; index < earningTiles.length - 1; index += 2) {
      assert.equal(earningTiles[index], earningTiles[index + 1],
        `Revenue choices ${index + 1} and ${index + 2} share a row height`);
    }

    const pricingShell = page.locator('.sf.lw');
    assert.equal(await pricingShell.evaluate(element => element.scrollWidth <= element.clientWidth), true,
      'The pricing step remains inside the mobile viewport');
    await page.screenshot({ path: '/tmp/streaming-launch-pricing-390.png' });

    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await pricingShell.evaluate(element => element.scrollWidth <= element.clientWidth), true,
      'The tier treatment remains inside a narrow Android viewport');
    const narrowTabs = await planTabs.evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect();
      return { top: Math.round(rect.top), width: Math.round(rect.width) };
    }));
    assert.equal(new Set(narrowTabs.map(card => card.top)).size, 1,
      'All three plan summaries remain visible together at 320px');
    assert.equal(new Set(narrowTabs.map(card => card.width)).size, 1,
      'Compact plan summaries remain balanced at 320px');
    await page.screenshot({ path: '/tmp/streaming-launch-pricing-320.png' });
    console.log('Streaming launch soft-surface browser audit passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
