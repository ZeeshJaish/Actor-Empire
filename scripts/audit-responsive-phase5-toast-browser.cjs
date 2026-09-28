const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      await page.goto('http://127.0.0.1:5178/scripts/fixtures/responsive-game-toast.html', { waitUntil: 'domcontentloaded' });
      const status = page.getByRole('status');
      await status.waitFor();
      const metrics = await page.evaluate(() => {
        const status = document.querySelector('[role="status"]');
        const rect = status.getBoundingClientRect();
        return {
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          textOverflow: status.scrollWidth > status.clientWidth + 1,
        };
      });
      console.log(`${viewport.width}×${viewport.height} ad feedback toast: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'Ad toast: document overflow');
      assert.ok(metrics.left >= 0 && metrics.right <= viewport.width + 1, 'Ad toast: clipped horizontally');
      assert.ok(metrics.top >= 0 && metrics.bottom <= viewport.height + 1, 'Ad toast: clipped vertically');
      assert.equal(metrics.textOverflow, false, 'Ad toast: text clipped');
      if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-ad-feedback-toast-320x400.png' });
      await page.close();
    }
    console.log('Ad feedback toast responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
