const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const url = 'http://127.0.0.1:5178/scripts/fixtures/streaming-launch-surface.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const [step, stepIndex] of ['markets', 'clearance', 'ident', 'storefront', 'catalogue', 'pricing', 'blueprint'].map((name, index) => [name, index])) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}?step=blueprint`, { waitUntil: 'domcontentloaded' });
        await page.locator('.sf.lw').waitFor({ timeout: 15000 });
        if (step !== 'blueprint') await page.locator('.lw-stop').nth(stepIndex).click();
        assert.equal(await page.locator('.lw-stop').nth(stepIndex).getAttribute('aria-current'), 'step', `${step}: could not navigate to step`);
        await page.waitForTimeout(350);
        const result = await page.evaluate(() => {
          const root = document.querySelector('.sf.lw');
          const rect = root?.getBoundingClientRect();
          const title = root?.querySelector('.sf-head h1');
          const count = root?.querySelector('.lw-count');
          const active = root?.querySelector('.lw-stop.is-now');
          const activeName = active?.querySelector('.lw-stop-name');
          const titleText = document.createRange();
          if (title) titleText.selectNodeContents(title);
          const buttons = Array.from(root?.querySelectorAll('button') || []).filter(button => !button.disabled && button.offsetWidth > 0 && button.offsetHeight > 0);
          const small = buttons.filter(button => {
            const box = button.getBoundingClientRect();
            return box.width < 44 || box.height < 44;
          }).slice(0, 8).map(button => ({ text: button.textContent?.trim().slice(0, 35), label: button.getAttribute('aria-label'), width: button.offsetWidth, height: button.offsetHeight }));
          return {
            docWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            rootScrollWidth: root?.scrollWidth,
            rootClientWidth: root?.clientWidth,
            bottom: rect?.bottom,
            headerFits: !title || !count || titleText.getBoundingClientRect().right <= count.getBoundingClientRect().left + 1,
            activeLabelFits: !active || !activeName || activeName.getBoundingClientRect().right <= active.getBoundingClientRect().right + 1,
            small,
          };
        });
        console.log(`${viewport.width}×${viewport.height} streaming ${step}: ${JSON.stringify(result)}`);
        assert.ok(result.docWidth <= result.clientWidth + 1, `${step}: document overflow`);
        assert.ok(result.rootScrollWidth <= result.rootClientWidth + 1, `${step}: wizard overflow`);
        assert.ok(result.bottom >= viewport.height - 1, `${step}: wizard short of viewport`);
        assert.equal(result.headerFits, true, `${step}: title overlaps step counter`);
        assert.equal(result.activeLabelFits, true, `${step}: active step label clipped`);
        assert.deepEqual(result.small, [], `${step}: undersized interactive targets`);
        assert.deepEqual(errors, [], `${step}: page errors`);
        if (viewport.width === 320 && (step === 'markets' || step === 'blueprint')) {
          await page.screenshot({ path: `docs/qa/responsive-after/ae-phase5-streaming-${step}-320x568.png` });
        }
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
