import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requested = new Set();
  page.on('request', request => {
    const url = request.url();
    for (const name of ['InteractiveRegionMapV2', 'GroupMarketMap', 'worldMapDetailedGeometry']) {
      if (url.includes(name)) requested.add(name);
    }
  });
  await page.goto(process.env.AE_PHASE1_URL || 'http://127.0.0.1:5174/', { waitUntil: 'commit' });
  await page.locator('#startBtn').waitFor({ timeout: 45_000 });
  assert.deepEqual([...requested].sort(), ['GroupMarketMap', 'InteractiveRegionMapV2', 'worldMapDetailedGeometry'].sort());
  console.log('Phase 1 detailed-map readiness audit passed.');
} finally {
  await browser.close();
}
