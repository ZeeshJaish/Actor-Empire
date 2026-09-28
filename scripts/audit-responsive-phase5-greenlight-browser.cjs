const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = 'http://127.0.0.1:5178/phase5-greenlight-qa.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'GREENLIGHT' }).waitFor();
      await page.waitForTimeout(350);
      const result = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).filter(button => button.offsetWidth > 0 && button.offsetHeight > 0);
        const budget = document.querySelector('[data-greenlight-budget]')?.getBoundingClientRect();
        const metrics = document.querySelector('[data-greenlight-metrics]')?.getBoundingClientRect();
        return { docWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
          budgetRight: budget?.right, metricsRight: metrics?.right,
          small: buttons.filter(button => !button.disabled && (button.offsetWidth < 44 || button.offsetHeight < 44)).slice(0, 12).map(button => ({ text: button.textContent?.trim().slice(0, 30), width: button.offsetWidth, height: button.offsetHeight })) };
      });
      console.log(`${viewport.width}×${viewport.height} greenlight script entry: ${JSON.stringify(result)}`);
      assert.ok(result.docWidth <= result.clientWidth + 1, `${viewport.width}: document overflow`);
      assert.ok(result.budgetRight <= viewport.width + 1 && result.metricsRight <= viewport.width + 1, `${viewport.width}: header metrics clipped`);
      assert.deepEqual(result.small, [], `${viewport.width}: undersized controls`);
      assert.deepEqual(errors, [], `${viewport.width}: render errors`);
      const market = page.getByRole('button', { name: 'Open Script Market' });
      await market.scrollIntoViewIfNeeded();
      await market.evaluate(button => {
        let ancestor = button.parentElement;
        while (ancestor) {
          if (ancestor.scrollHeight > ancestor.clientHeight && getComputedStyle(ancestor).overflowY === 'auto') {
            ancestor.scrollTop = ancestor.scrollHeight;
            break;
          }
          ancestor = ancestor.parentElement;
        }
      });
      const marketBox = await market.boundingBox();
      const footerBox = await page.getByRole('button', { name: /Next: Director/ }).boundingBox();
      console.log(`${viewport.width} greenlight market=${JSON.stringify(marketBox)} footer=${JSON.stringify(footerBox)}`);
      assert.ok(marketBox && marketBox.y >= 0 && marketBox.y + marketBox.height <= viewport.height, `${viewport.width}: script market action unreachable`);
      assert.ok(footerBox && marketBox.y + marketBox.height <= footerBox.y, `${viewport.width}: script market action obscured by footer`);
      if (viewport.width === 320) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-greenlight-entry-320x568.png' });
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
