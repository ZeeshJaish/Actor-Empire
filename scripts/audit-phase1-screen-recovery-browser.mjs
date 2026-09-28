import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let failures = 0;
  await page.route('**/views/mobile/MobilePage.tsx*', async route => {
    if (failures++ === 0) await route.abort('failed');
    else await route.continue();
  });
  await page.goto(process.env.AE_PHASE1_URL || 'http://127.0.0.1:5174/', { waitUntil: 'commit' });
  await page.getByText('Startup paused', { exact: true }).waitFor({ timeout: 30_000 });
  assert.equal(await page.locator('#startBtn').count(), 0, 'Start Career opened despite a missing UI module.');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.locator('#startBtn').waitFor({ timeout: 30_000 });
  console.log('Phase 1 UI-module failure and retry browser audit passed.');
} finally {
  await browser.close();
}
