const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000/scripts/fixtures/content-market-cm1.html?auction=1');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Explore on my own', exact: true }).click();
    await page.getByRole('button', { name: 'CONTENT MARKET', exact: true }).click();
    await page.getByRole('button', { name: /Live auctions/ }).click();
    await page.locator('.cm-auction-row').first().click();
    await page.getByRole('button', { name: 'Enter live auction', exact: true }).click();
    await page.getByRole('dialog', { name: 'Live rights auction' }).waitFor();
    await page.getByRole('region', { name: 'Auction offer console' }).waitFor();
    await page.getByRole('button', { name: /Place bid/ }).click();
    await page.getByText(/Current commitment/i).waitFor();
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.locator('.cm-auction-room').evaluate(el => el.scrollWidth <= el.clientWidth), true,
      'The live buyer auction fits a 320px mobile screen without horizontal overflow');
    await page.screenshot({ path: '/tmp/cm3-live-auction-mobile.png' });
    const messagePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    messagePage.on('pageerror', error => errors.push(error.message));
    await messagePage.goto('http://127.0.0.1:3000/scripts/fixtures/content-market-cm1.html?auctionMessage=1');
    await messagePage.getByText(/won The Harbour/i).first().click();
    await messagePage.getByRole('button', { name: 'Open Auction Result', exact: true }).click();
    await messagePage.getByRole('dialog', { name: 'Live rights auction' }).waitFor();
    await messagePage.getByText('Rights secured.', { exact: true }).waitFor();
    assert.ok((await messagePage.locator('.cm-auction-verdict').innerText()).includes('The Harbour 2'),
      'The auction outcome Message opens the exact persisted room');
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    console.log('CM3 live buyer auction mobile browser passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
