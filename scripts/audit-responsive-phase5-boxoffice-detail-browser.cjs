const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = 'http://127.0.0.1:5178/phase5-boxoffice-detail-qa.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const mode of ['theatrical', 'streaming', 'archive']) {
      const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${url}?mode=${mode}`);
      if (mode === 'streaming') await page.getByRole('button', { name: /Streaming/i }).first().click();
      if (mode === 'archive') await page.getByRole('button', { name: /All.Time/i }).first().click();
      if (mode === 'archive')
        await page.getByRole('button', { name: /Open permanent box-office record for The Remarkably Long International Motion Picture Project/ }).click();
      else
        await page.getByRole('button', { name: /The Remarkably Long International Motion Picture Project/ }).first().click();
      const metrics = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
        small: [...document.querySelectorAll('button')].filter(button => !button.disabled && button.offsetWidth > 0 && (button.offsetWidth < 44 || button.offsetHeight < 44))
          .map(button => ({ label: button.getAttribute('aria-label') || button.textContent.trim().slice(0, 30), width: button.offsetWidth, height: button.offsetHeight })),
      }));
      console.log(`${size.width}x${size.height} ${mode} BoxOffice detail: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.width <= metrics.viewport + 1, `${mode} document overflow`);
      assert.deepEqual(metrics.small, [], `${mode} undersized detail buttons`);
      const clippedTabs = await page.evaluate(() => [...document.querySelectorAll('button')]
        .filter(button => /^(Overview|Weekly|Regions|Partners)$/i.test(button.textContent.trim()) && button.scrollWidth > button.clientWidth + 1)
        .map(button => button.textContent.trim()));
      assert.deepEqual(clippedTabs, [], 'release detail tab labels clipped');
      if (size.height === 400 && !process.env.NO_SCREENSHOTS) await page.screenshot({ path: `docs/qa/responsive-after/ae-phase5-boxoffice-${mode}-detail-320x400.png` });
      for (const tab of ['Weekly', 'Regions', 'Partners']) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        const tabMetrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          small: [...document.querySelectorAll('button')].filter(button => !button.disabled && button.offsetWidth > 0 && (button.offsetWidth < 44 || button.offsetHeight < 44))
            .map(button => button.getAttribute('aria-label') || button.textContent.trim().slice(0, 30)),
        }));
        assert.ok(tabMetrics.overflow <= 1, `${mode} ${tab} document overflow`);
        assert.deepEqual(tabMetrics.small, [], `${mode} ${tab} undersized buttons`);
      }
      await page.getByRole('button', { name: 'Back to box office' }).click();
      assert.ok(await page.getByRole('button', { name: /The Remarkably Long International Motion Picture Project/ }).count(), `${mode} release missing after Back`);
      assert.deepEqual(errors, [], 'runtime errors');
      await page.close();
      }
    }
    console.log('BoxOffice release-detail responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
