const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const errors = [];
    const announced = await browser.newPage({ viewport: { width: 390, height: 844 } });
    announced.on('pageerror', error => errors.push(error.message));
    await announced.goto('http://127.0.0.1:3000/scripts/fixtures/content-market-cm1.html?upcoming=1');
    await announced.waitForLoadState('networkidle');
    await announced.getByRole('button', { name: 'Explore on my own', exact: true }).click();
    await announced.getByRole('button', { name: 'CONTENT MARKET', exact: true }).click();
    await announced.getByRole('button', { name: /THE MARKET/ }).click();
    await announced.getByRole('button', { name: /The Celestial War/i }).first().click();
    await announced.getByRole('button', { name: 'FOLLOW THIS SALE', exact: true }).click();
    await announced.getByText('FOLLOWING', { exact: true }).waitFor();
    await announced.setViewportSize({ width: 320, height: 740 });
    assert.equal(await announced.locator('[data-content-market-design="zip-exact"]').first().evaluate(el => el.scrollWidth <= el.clientWidth), true,
      'The Upcoming detail fits a 320px mobile screen without horizontal overflow');
    await announced.screenshot({ path: '/tmp/cm4-upcoming-mobile.png' });

    const live = await browser.newPage({ viewport: { width: 390, height: 844 } });
    live.on('pageerror', error => errors.push(error.message));
    await live.goto('http://127.0.0.1:3000/scripts/fixtures/content-market-cm1.html?upcomingOpen=1');
    await live.waitForLoadState('networkidle');
    await live.getByRole('button', { name: 'Explore on my own', exact: true }).click();
    await live.getByRole('button', { name: 'CONTENT MARKET', exact: true }).click();
    await live.getByRole('button', { name: /THE MARKET/ }).click();
    await live.getByRole('button', { name: /The Celestial War/i }).first().click();
    await live.getByRole('button', { name: 'ENTER THE ROOM', exact: true }).click();
    await live.getByRole('dialog', { name: 'Live rights auction' }).waitFor();
    await live.getByText(/cannot be scheduled or played until/i).waitFor();
    assert.equal(await live.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    console.log('CM4 Upcoming calendar and future-rights auction mobile browser passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
