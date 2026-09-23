const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:3000';
const fixtureUrl = `${base}/scripts/fixtures/streaming-launch-s3.html`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[393, 600], [393, 852], [1280, 800]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const failures = [];
      page.on('pageerror', error => failures.push(error.message));
      await page.goto(fixtureUrl, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: /North America/i }).waitFor();
      assert.match(await page.locator('.lw-regionhead').innerText(), /23 chosen/i);
      assert.match(await page.locator('.lw-regionhead').innerText(), /30E to file together/i);
      const tab = page.getByRole('tab', { name: /North America/i });
      assert.match(await tab.innerText(), /23/);
      await page.screenshot({ path: `/tmp/streaming-launch-s3-markets-${width}x${height}.png` });
      await page.locator('.lw-group').filter({ hasText: 'Caribbean' }).getByRole('button', { name: 'Full report' }).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('group', { name: 'Group market map' }).waitFor();
      assert.equal(await page.locator('.lw-group-map-country').count(), 13);
      assert.equal(await page.locator('.lw-group-map-country[aria-pressed="true"]').count(), 13);
      assert.match(await page.locator('.lw-group-foot').innerText(), /25 energy to file together/);
      assert.equal(await page.locator('.lw-group-list li').count(), 13);
      assert.match(await page.locator('.lw-group-list').innerText(), /access[\s\S]*compliance[\s\S]*4–6 weeks review[\s\S]*5E alone/i);
      const geometry = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        viewport: document.documentElement.clientWidth,
        sheet: document.querySelector('.sf-sheet')?.getBoundingClientRect().toJSON(),
        map: document.querySelector('.lw-group-map')?.getBoundingClientRect().toJSON(),
      }));
      assert.ok(geometry.body <= geometry.viewport + 1, `${width}x${height} horizontal overflow ${JSON.stringify(geometry)}`);
      assert.ok(geometry.sheet.left >= -1 && geometry.sheet.right <= width + 1, `${width}x${height} sheet clipped`);
      assert.ok(geometry.sheet.top >= -1 && geometry.sheet.bottom <= height + 1, `${width}x${height} sheet height clipped`);
      assert.ok(geometry.map.width > 100, `${width}x${height} group map too small`);
      assert.deepEqual(failures, []);
      await page.locator('.lw-group-map').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/streaming-launch-s3-${width}x${height}.png` });
      const islandMarker = page.locator('.lw-group-map-country[aria-label*="Saint Vincent"]');
      assert.match(await islandMarker.getAttribute('aria-label'), /Saint Vincent/i);
      await islandMarker.focus();
      await islandMarker.press('Enter');
      assert.equal(await islandMarker.getAttribute('aria-pressed'), 'false');
      assert.match(await page.locator('.lw-group-foot').innerText(), /12 chosen.*24 energy to file together/i);
      console.log(`PASS ${width}x${height}: group map, 23 selection, batch energy, no horizontal overflow`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
