const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const url = 'http://127.0.0.1:5178/scripts/fixtures/release-wizard-transplant.html';
const modes = ['distribution', 'desk', 'war', 'campaign', 'festivals', 'finalize'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const mode of modes) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}?mode=${mode}`, { waitUntil: 'domcontentloaded' });
        await page.locator('[data-ui="release-strategy-transplant"]').waitFor({ timeout: 15000 });
        const layout = await page.evaluate(() => {
          const root = document.querySelector('[data-ui="release-strategy-transplant"]');
          const body = root?.querySelector('main') || root?.querySelector('[data-war-room]');
          const r = root?.getBoundingClientRect();
          return {
            docWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyWidth: body?.scrollWidth,
            bodyClientWidth: body?.clientWidth,
            root: r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null,
          };
        });
        assert.ok(layout.root, `${mode}: no root`);
        assert.ok(layout.docWidth <= layout.clientWidth + 1, `${mode} ${viewport.width}: document overflow`);
        assert.ok(!layout.bodyWidth || layout.bodyWidth <= layout.bodyClientWidth + 1, `${mode} ${viewport.width}: body overflow`);
        assert.ok(layout.root.bottom >= viewport.height - 1, `${mode} ${viewport.width}: root short of viewport`);
        const primary = page.getByRole('button', { name: /CONTINUE|TAKE|LOCK STRATEGY/ }).last();
        await primary.scrollIntoViewIfNeeded();
        const box = await primary.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, `${mode} ${viewport.width}: undersized primary action`);
        assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, `${mode} ${viewport.width}: unreachable primary action`);
        assert.deepEqual(errors, [], `${mode} ${viewport.width}: render errors`);
        if (mode === 'war' && viewport.width === 320) {
          await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-release-war-320x568.png' });
        }
        console.log(`${viewport.width}×${viewport.height} release ${mode}: pass`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
