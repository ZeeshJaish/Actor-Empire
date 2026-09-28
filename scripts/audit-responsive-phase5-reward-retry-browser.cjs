const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/scripts/fixtures/responsive-reward-save-retry.html', { waitUntil: 'domcontentloaded' });
      const dialog = page.getByRole('alertdialog');
      await dialog.waitFor();
      const action = dialog.getByRole('button', { name: 'Retry Saving Reward' });
      await action.scrollIntoViewIfNeeded();
      const metrics = await page.evaluate(() => {
        const dialog = document.querySelector('[role="alertdialog"]');
        const rect = dialog.getBoundingClientRect();
        const action = dialog.querySelector('button').getBoundingClientRect();
        return {
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          dialog: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
          action: { top: action.top, bottom: action.bottom, width: action.width, height: action.height },
          scrollHeight: dialog.scrollHeight,
          clientHeight: dialog.clientHeight,
        };
      });
      console.log(`${viewport.width}×${viewport.height} reward save retry: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'Reward retry: document overflow');
      assert.ok(metrics.dialog.top >= -1 && metrics.dialog.bottom <= viewport.height + 1, 'Reward retry: clipped dialog');
      assert.ok(metrics.action.width >= 44 && metrics.action.height >= 44, 'Reward retry: small action');
      assert.ok(metrics.action.top >= -1 && metrics.action.bottom <= viewport.height + 1, 'Reward retry: action unreachable');
      assert.deepEqual(errors, [], 'Reward retry: runtime errors');
      if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-reward-save-retry-320x400.png' });
      await page.close();
    }
    console.log('Reward save retry responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
