import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let releaseMobile;
  const mobileReleased = new Promise(resolve => { releaseMobile = resolve; });
  let markMobileRequested;
  const mobileRequested = new Promise(resolve => { markMobileRequested = resolve; });

  await page.route('**/views/mobile/MobilePage.tsx*', async route => {
    markMobileRequested();
    await mobileReleased;
    await route.continue();
  });

  await page.goto(process.env.AE_PHASE1_URL || 'http://127.0.0.1:5174/', { waitUntil: 'commit' });
  try {
    await Promise.race([
      mobileRequested,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Phone screen was not requested during startup.')), 15_000)),
    ]);
    assert.equal(await page.locator('#startBtn').count(), 0, 'Start Career appeared before Phone code was ready.');
  } finally {
    releaseMobile();
  }

  await page.locator('#startBtn').waitFor({ timeout: 30_000 });
  console.log('Phase 1 screen-readiness gate audit passed.');
} finally {
  await browser.close();
}
