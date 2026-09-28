const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/phase5-cinema-qa.html', { waitUntil: 'domcontentloaded' });
      await page.locator('.cinema-lock').waitFor();
      await page.waitForTimeout(1600);
      const result = await page.evaluate(() => ({
        docWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        pitchBottom: document.querySelector('.cinema-lock .pitch')?.getBoundingClientRect().bottom,
        ctaTop: document.querySelector('.cinema-lock .cta-zone')?.getBoundingClientRect().top,
        buttons: Array.from(document.querySelectorAll('.cinema-lock button')).map(button => {
          const r = button.getBoundingClientRect();
          return { text: button.textContent?.trim(), width: r.width, height: r.height, top: r.top, bottom: r.bottom };
        }),
      }));
      console.log(`${viewport.width}×${viewport.height} cinema teaser: ${JSON.stringify(result)}`);
      assert.ok(result.docWidth <= result.clientWidth + 1, `${viewport.width}: document overflow`);
      assert.ok(result.pitchBottom <= result.ctaTop - 4, `${viewport.width}: pitch obscured by CTA`);
      assert.ok(result.buttons.every(button => button.width >= 44 && button.height >= 44), `${viewport.width}: undersized controls`);
      await page.locator('.btn-notify').scrollIntoViewIfNeeded();
      const notify = await page.locator('.btn-notify').boundingBox();
      assert.ok(notify && notify.y >= 0 && notify.y + notify.height <= viewport.height + 1, `${viewport.width}: notify action unreachable`);
      assert.deepEqual(errors, [], `${viewport.width}: render errors`);
      if (viewport.width === 320) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-cinema-teaser-320x568.png' });
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
