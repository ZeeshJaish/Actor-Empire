const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/phase5-stock-detail-qa.html', { waitUntil: 'domcontentloaded' });
      await page.getByText('A Very Long International Entertainment Company').waitFor();
      await page.waitForTimeout(350);
      const metrics = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).filter(button => !button.disabled && button.offsetWidth > 0 && button.offsetHeight > 0);
        const company = Array.from(document.querySelectorAll('div')).find(node => node.textContent?.trim() === 'A Very Long International Entertainment Company');
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          companyClipped: company ? company.scrollWidth > company.clientWidth + 1 : true,
          smallButtons: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44)
            .map(button => ({ name: button.getAttribute('aria-label') || button.textContent?.trim(), width: button.offsetWidth, height: button.offsetHeight })),
        };
      });
      console.log(`${viewport.width}×${viewport.height} stock detail: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'Stock detail: document overflow');
      assert.equal(metrics.companyClipped, false, 'Stock detail: full company name clipped');
      assert.deepEqual(metrics.smallButtons, [], 'Stock detail: undersized controls');
      if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: '/tmp/ae-phase5-stock-before-tab.png' });
      await page.getByRole('button', { name: 'Cash', exact: true }).click({ timeout: 5000 });
      const input = page.locator('input[type="number"]');
      await input.fill('1000');
      await page.setViewportSize({ width: viewport.width, height: 400 });
      assert.equal(await input.inputValue(), '1000', 'Stock order draft lost on keyboard-sized viewport');
      await page.setViewportSize(viewport);
      assert.deepEqual(errors, [], 'Stock detail: runtime errors');
      if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-stock-detail-320x400.png' });
      await page.close();
    }
    console.log('Stock detail responsive audit passed without trading.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
