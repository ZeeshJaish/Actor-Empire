const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const url = 'http://127.0.0.1:5178/scripts/fixtures/responsive-store-rewards.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const step of [0, 1]) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}?step=${step}`, { waitUntil: 'domcontentloaded' });
        await page.locator('[data-ui="actor-empire-store-overhaul"]').waitFor();
        const action = page.getByRole('button', { name: `Watch Ad ${step + 1} of 2` });
        await action.scrollIntoViewIfNeeded();
        const actionBox = await action.boundingBox();
        assert.ok(actionBox && actionBox.height >= 44, `${viewport.width} ${step}/2: wellness action below 44px`);
        assert.ok(actionBox.y >= 0 && actionBox.y + actionBox.height <= viewport.height + 1, `${viewport.width} ${step}/2: wellness action unreachable`);
        assert.equal(await page.locator('.st-wellness-step.is-done').count(), step, `${viewport.width}: wrong progress`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${viewport.width}: store overflow`);
        assert.deepEqual(errors, [], `${viewport.width} ${step}/2: page errors`);
        if (viewport.width === 320) await page.screenshot({ path: `docs/qa/responsive-after/ae-phase5-store-wellness-${step}-of-2-320x568.png` });

        await page.getByRole('tab', { name: /PREMIUM/ }).click();
        await page.getByRole('button', { name: /^(Add|Unlock) / }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Confirm purchase' });
        await dialog.waitFor();
        if (viewport.width === 320 && step === 0) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-store-confirm-before-320x568.png' });
        for (const name of ['Cancel', 'Continue']) {
          const box = await dialog.getByRole('button', { name }).boundingBox();
          console.log(`${viewport.width} ${name} button: ${JSON.stringify(box)}`);
          assert.ok(box && box.width >= 44 && box.height >= 44, `${viewport.width}: ${name} target below 44px`);
          assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 1, `${viewport.width}: ${name} unreachable`);
        }
        if (viewport.width === 320 && step === 0) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-store-confirm-320x568.png' });
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        assert.equal(await dialog.count(), 0, `${viewport.width}: purchase cancel did not dismiss dialog`);
        assert.deepEqual(errors, [], `${viewport.width}: purchase callback was invoked`);
        console.log(`${viewport.width}×${viewport.height} store ${step}/2 and premium cancellation: pass`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
