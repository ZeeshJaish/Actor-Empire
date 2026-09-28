const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const state of ['verifying', 'cancelling']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:5178/scripts/fixtures/responsive-save-transfer-overlay.html?state=${state}`, { waitUntil: 'domcontentloaded' });
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await dialog.getByRole('button').scrollIntoViewIfNeeded();
        const metrics = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const action = dialog.querySelector('button');
          const rect = dialog.getBoundingClientRect();
          const button = action.getBoundingClientRect();
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            dialog: { top: rect.top, bottom: rect.bottom, width: rect.width },
            button: { top: button.top, bottom: button.bottom, width: button.width, height: button.height },
            scrollHeight: dialog.scrollHeight,
            clientHeight: dialog.clientHeight,
          };
        });
        console.log(`${viewport.width}×${viewport.height} ${state}: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'Save transfer: document overflow');
        assert.ok(metrics.dialog.top >= -1 && metrics.dialog.bottom <= viewport.height + 1, 'Save transfer: dialog clipped by viewport');
        assert.ok(metrics.scrollHeight >= metrics.clientHeight, 'Save transfer: dialog content cannot scroll');
        assert.ok(metrics.button.width >= 44 && metrics.button.height >= 44, 'Save transfer: action target below 44px');
        assert.ok(metrics.button.top >= -1 && metrics.button.bottom <= viewport.height + 1, 'Save transfer: action not visible');
        assert.deepEqual(errors, [], 'Save transfer: runtime error');
        if (viewport.width === 320 && viewport.height === 400) {
          await page.screenshot({ path: `docs/qa/responsive-after/ae-phase5-save-transfer-${state}-320x400.png` });
        }
        await page.close();
      }
    }
    console.log('Save transfer overlay responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
