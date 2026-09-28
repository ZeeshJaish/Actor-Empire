const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/phase5-settings-transfer-qa.html', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Save Transfer/i }).click();
      await page.getByText('Signed save file').waitFor();
      const actions = ['Export Game Data', 'Import Game Data'];
      for (const name of actions) {
        const action = page.getByRole('button', { name: new RegExp(name) });
        await action.scrollIntoViewIfNeeded();
        const box = await action.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, `Settings transfer ${name}: small action`);
        assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 1, `Settings transfer ${name}: action unreachable`);
      }
      const metrics = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth }));
      console.log(`${viewport.width}×${viewport.height} settings transfer: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'Settings transfer: document overflow');
      assert.deepEqual(errors, [], 'Settings transfer: runtime errors');
      if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-settings-transfer-320x400.png' });
      await page.close();
    }
    console.log('Settings save-transfer presentation audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
