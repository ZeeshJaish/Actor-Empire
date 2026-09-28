const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = 'http://127.0.0.1:5178/phase5-imdb-detail-qa.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.getByRole('button', { name: /Credits/i }).last().click();
      await page.getByText('The Remarkably Long International Motion Picture Project').last().click();
      const metrics = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
        small: [...document.querySelectorAll('button')].filter(button => !button.disabled && button.offsetWidth > 0 && (button.offsetWidth < 44 || button.offsetHeight < 44))
          .map(button => ({ label: button.getAttribute('aria-label') || button.textContent.trim().slice(0, 30), width: button.offsetWidth, height: button.offsetHeight })),
      }));
      console.log(`${size.width}x${size.height} IMDb detail: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.width <= metrics.viewport + 1, 'document overflow');
      assert.deepEqual(metrics.small, [], 'undersized detail buttons');
      if (size.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-imdb-detail-320x400.png' });
      await page.locator('button:has(svg.lucide-arrow-left)').first().click();
      assert.ok(await page.getByText('The Remarkably Long International Motion Picture Project').count(), 'credit disappeared after Back');
      assert.deepEqual(errors, [], 'runtime errors');
      await page.close();
    }
    console.log('IMDb project-detail responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
