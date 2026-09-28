const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const state of ['warning', 'exhausted', 'ruin']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:5178/scripts/fixtures/responsive-debt-recovery.html?state=${state}`, { waitUntil: 'domcontentloaded' });
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        const buttons = dialog.getByRole('button');
        assert.equal(await buttons.count(), state === 'ruin' ? 1 : 2, 'Debt action count changed');
        for (let index = 0; index < await buttons.count(); index++) {
          await buttons.nth(index).scrollIntoViewIfNeeded();
          const box = await buttons.nth(index).boundingBox();
          assert.ok(box && box.width >= 44 && box.height >= 44, `Debt ${state}: action below 44px`);
          assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, `Debt ${state}: action unreachable`);
        }
        const metrics = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const rect = dialog.getBoundingClientRect();
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            top: rect.top,
            bottom: rect.bottom,
            scrollHeight: dialog.scrollHeight,
            clientHeight: dialog.clientHeight,
          };
        });
        console.log(`${viewport.width}×${viewport.height} debt ${state}: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `Debt ${state}: document overflow`);
        assert.ok(metrics.top >= -1 && metrics.bottom <= viewport.height + 1, `Debt ${state}: dialog clipped`);
        assert.deepEqual(errors, [], `Debt ${state}: runtime error`);
        if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: `docs/qa/responsive-after/ae-phase5-debt-${state}-320x400.png` });
        await page.close();
      }
    }
    console.log('Debt recovery responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
