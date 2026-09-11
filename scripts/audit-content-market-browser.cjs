// End-to-end smoke test for the exact ZIP transplant. The fixture is isolated
// from real save slots; its catalogue and transactions still use game services.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const URL = 'http://127.0.0.1:3000/scripts/fixtures/content-market-cm1.html';

async function enterMarket(page) {
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Explore on my own', exact: true }).click();
  await page.getByRole('button', { name: 'CONTENT MARKET', exact: true }).click();
  await page.locator('[data-content-market-scene="gate"]').waitFor();
  await page.getByRole('button', { name: /THE MARKET/ }).click();
  await page.locator('[data-content-market-scene="market"]').waitFor();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => errors.push(error.message));
    await enterMarket(page);

    assert.ok(await page.locator('[data-content-market-scene="market"][data-content-market-design="zip-exact"]').count() >= 1);
    await page.getByRole('textbox', { name: 'Search the market' }).fill('Harbour 1');
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('cm1-isolated-player') || '{}')
      .ownedStreamingPlatform?.contentMarketDraft?.search === 'Harbour 1');
    await page.getByRole('button', { name: /The Harbour 1 ·/ }).click();
    await page.locator('[data-content-market-scene="detail"]').waitFor();
    await page.getByRole('button', { name: 'Deal', exact: true }).click();
    assert.match(await page.locator('body').innerText(), /GUARANTEE/);
    await page.getByRole('button', { name: /BUY ·/ }).click();
    await page.getByText('ACQUIRED', { exact: true }).waitFor();

    const privatePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    privatePage.on('pageerror', error => errors.push(error.message));
    await privatePage.goto(`${URL}?private=1`);
    await privatePage.getByRole('button', { name: 'Explore on my own', exact: true }).click();
    await privatePage.getByRole('button', { name: 'CONTENT MARKET', exact: true }).click();
    await privatePage.getByRole('button', { name: /THE MARKET/ }).click();
    await privatePage.getByRole('textbox', { name: 'Search the market' }).fill('Harbour 1');
    await privatePage.getByRole('button', { name: /The Harbour 1 ·/ }).click();
    await privatePage.getByRole('button', { name: 'Make private offer' }).click();
    await privatePage.locator('[data-content-market-scene="offer"]').waitFor();
    assert.match(await privatePage.locator('body').innerText(), /YOUR OFFER/);
    await privatePage.getByRole('button', { name: 'SEND IT', exact: true }).click();
    await privatePage.getByText('OFFER SENT', { exact: true }).waitFor();

    const studioPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    studioPage.on('pageerror', error => errors.push(error.message));
    await studioPage.goto(URL);
    await studioPage.getByRole('button', { name: 'Explore on my own', exact: true }).click();
    await studioPage.getByRole('button', { name: 'CONTENT MARKET', exact: true }).click();
    await studioPage.getByRole('button', { name: /FROM YOUR STUDIO/ }).click();
    await studioPage.locator('[data-content-market-scene="studio"]').waitFor();
    await studioPage.getByRole('button', { name: /The Last Light ·/ }).click();
    await studioPage.getByText('ACQUIRED', { exact: true }).waitFor();

    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.locator('[data-content-market-design="zip-exact"]').first().evaluate(el => el.scrollWidth <= el.clientWidth), true,
      'Exact Content Market fits a 320px viewport without page overflow');
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Exact Content Market browser passed: gate, live catalogue, detail, purchase, private offer, studio import and 320px layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
