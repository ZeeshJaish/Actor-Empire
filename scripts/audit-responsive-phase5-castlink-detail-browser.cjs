const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:5178/phase5-castlink-detail-qa.html';

async function audit(page, state, size) {
  const result = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(node => !node.disabled && node.getBoundingClientRect().width > 0);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      smallButtons: buttons.filter(node => node.getBoundingClientRect().width < 44 || node.getBoundingClientRect().height < 44)
        .map(node => ({ text: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 30),
          width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height) })),
    };
  });
  console.log(`${size.width}x${size.height} ${state}: ${JSON.stringify(result)}`);
  assert.ok(result.documentWidth <= result.viewportWidth + 1, `${state} document overflow`);
  assert.deepEqual(result.smallButtons, [], `${state} undersized buttons`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.getByRole('button', { name: 'Auditions' }).click();
      await page.getByText('The Remarkably Long International Motion Picture Project').click();
      await audit(page, 'audition detail', size);
      if (size.height === 400) await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-castlink-detail-320x400.png' });
      await page.getByRole('button', { name: 'Back to auditions' }).click();
      await audit(page, 'audition list returned', size);
      await page.getByRole('button', { name: 'Back to phone' }).click();
      await page.getByRole('button', { name: 'Part-Time Jobs' }).click();
      await audit(page, 'available jobs', size);
      await page.goto(`${base}?mode=active-job`);
      await page.getByRole('button', { name: 'Part-Time Jobs' }).click();
      await audit(page, 'active job', size);
      await page.goto(`${base}?mode=negotiation`);
      await audit(page, 'negotiation', size);
      await page.getByRole('button', { name: 'Increase salary' }).click();
      assert.ok(await page.getByText('$2,000,000').count(), 'salary draft did not update');
      await page.setViewportSize({ width: size.width, height: Math.max(400, size.height - 180) });
      assert.ok(await page.getByText('$2,000,000').count(), 'salary draft lost on viewport resize');
      await page.setViewportSize(size);
      const action = page.getByRole('button', { name: /Review the complete offer/ });
      await action.scrollIntoViewIfNeeded();
      const box = await action.boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= size.height, 'offer action not reachable by scrolling');
      assert.deepEqual(errors, [], `runtime errors ${size.width}x${size.height}`);
      await page.close();
    }
    console.log('CastLink audition and negotiation responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
