const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/phase5-studio-filmography-qa.html', { waitUntil: 'domcontentloaded' });
      const seeMore = page.getByRole('button', { name: /See More/i });
      const seeMoreBox = await seeMore.boundingBox();
      assert.ok(seeMoreBox && seeMoreBox.width >= 44 && seeMoreBox.height >= 44, 'Filmography entry: See More below 44px');
      await seeMore.click();
      await page.locator('h1').waitFor();
      await page.waitForTimeout(400);
      const metrics = await page.evaluate(() => {
        const heading = document.querySelector('h1');
        const header = heading?.parentElement;
        const buttons = Array.from(document.querySelectorAll('button')).filter(button => button.offsetWidth > 0 && button.offsetHeight > 0);
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          headingWidth: heading?.clientWidth,
          headingScrollWidth: heading?.scrollWidth,
          smallButtons: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44)
            .slice(0, 12).map(button => ({ text: button.textContent?.trim().slice(0, 28), width: button.offsetWidth, height: button.offsetHeight })),
        };
      });
      console.log(`${viewport.width}×${viewport.height} studio filmography: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'Filmography: document overflow');
      assert.ok(metrics.headingScrollWidth <= metrics.headingWidth + 1, 'Filmography: long studio name clipped');
      assert.deepEqual(metrics.smallButtons, [], 'Filmography: undersized controls');
      assert.deepEqual(errors, [], 'Filmography: runtime errors');
      await page.getByRole('button', { name: /Rating/i }).first().click();
      await page.getByRole('button', { name: /Movie/i }).first().click();
      if (viewport.width === 320 && viewport.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-filmography-320x400.png' });
      await page.getByRole('button', { name: /Back/i }).first().click();
      await page.close();
    }
    console.log('Studio filmography responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
