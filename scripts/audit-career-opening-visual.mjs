import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.AE_CAREER_PREVIEW_URL || 'http://127.0.0.1:5174/scripts/fixtures/career-opening-loader.html';
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('[data-ui="career-opening-deck"]').waitFor();
    const flashcard = page.locator('[data-ui="career-opening-deck"] [role="note"][aria-label="Career tip"]');
    await flashcard.waitFor();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      tip: document.querySelector('[data-ui="career-opening-deck"] [aria-label="Career tip"]')?.textContent || '',
    }));
    assert.ok(dimensions.scrollWidth <= dimensions.viewportWidth, `Career opening overflows at ${width}px.`);
    assert.ok(dimensions.tip.trim().length > 20, 'The front flashcard should show a readable gameplay tip.');
    assert.equal(await page.getByText('On the call sheet', { exact: true }).count(), 0, 'The lower call-sheet panel should be removed.');
    assert.deepEqual(errors, [], `Career opening raised a page error at ${width}px.`);
    if (width === 390) {
      await page.screenshot({ path: '/tmp/actor-empire-career-opening.png' });
      const firstTip = dimensions.tip;
      await page.waitForTimeout(6_250);
      const nextTip = await flashcard.innerText();
      assert.notEqual(nextTip, firstTip, 'Career tip should rotate during a longer save open.');
    }
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: 'networkidle' });
  const duration = await reducedPage.locator('[data-ui="career-opening-deck"] .ae-intro-motion').first().evaluate(
    element => getComputedStyle(element).animationDuration,
  );
  assert.equal(duration, '0.01s', 'Reduced-motion preference must suppress continuous deck motion.');
  await reducedContext.close();
  console.log('Career opening visual audit passed at 320px, 390px, and reduced motion.');
} finally {
  await browser.close();
}
