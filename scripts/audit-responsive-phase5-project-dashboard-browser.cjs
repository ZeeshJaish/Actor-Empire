const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const phase of ['PRE-PRODUCTION', 'PRODUCTION', 'POST-PRODUCTION', 'AWAITING RELEASE', 'RELEASED']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:5178/phase5-project-dashboard-qa.html?phase=${encodeURIComponent(phase)}`, { waitUntil: 'domcontentloaded' });
        await page.locator('h1:visible').first().waitFor();
        const metrics = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button')).filter(button => !button.disabled && button.offsetWidth > 0 && button.offsetHeight > 0);
          const heading = document.querySelector('h1:not(.hidden)');
          const headingBox = heading?.getBoundingClientRect();
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            heading: headingBox && { top: headingBox.top, bottom: headingBox.bottom },
            smallButtons: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44).slice(0, 12)
              .map(button => ({ label: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 30), width: button.offsetWidth, height: button.offsetHeight })),
          };
        });
        console.log(`${viewport.width}×${viewport.height} project ${phase}: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `Project ${phase}: document overflow`);
        assert.ok(metrics.heading && metrics.heading.top >= 0 && metrics.heading.bottom <= viewport.height + 1, `Project ${phase}: mobile title initially clipped`);
        assert.deepEqual(metrics.smallButtons, [], `Project ${phase}: undersized controls`);
        assert.deepEqual(errors, [], `Project ${phase}: runtime errors`);
        if (viewport.width === 320 && viewport.height === 400 && phase === 'PRODUCTION') await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-project-production-320x400.png' });
        await page.close();
      }
    }
    console.log('Studio project phase responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
