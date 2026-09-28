import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/App.tsx*', async route => {
    await new Promise(resolve => setTimeout(resolve, 4_000));
    await route.continue();
  });
  await page.goto(process.env.AE_PHASE1_URL || 'http://127.0.0.1:5174/', { waitUntil: 'commit' });
  await page.waitForTimeout(2_000);
  const text = await page.locator('#root').innerText();
  assert.match(text, /ACTOR\s+EMPIRE/);
  assert.match(text, /Loading game screens/i);
  assert.doesNotMatch(text, /Starting Actor Empire/i);
  assert.equal(await page.getByText('Loading', { exact: true }).count(), 0, 'Generic Loading must not duplicate the stage label.');
  assert.equal(await page.locator('#root [aria-hidden="true"] svg').count(), 0, 'Startup must not render decorative people artwork.');
  const stage = await page.getByText('Loading game screens…', { exact: true }).boundingBox();
  const percentage = await page.getByText('0%', { exact: true }).boundingBox();
  assert.ok(stage && percentage && Math.abs(stage.y + stage.height / 2 - percentage.y - percentage.height / 2) < 14,
    'Current loading stage must share the percentage row.');
  await page.waitForTimeout(850);
  assert.match(await page.locator('#root').innerText(), /Taking a moment\. Your careers are safe\./);
  if (process.env.AE_PHASE1_SCREENSHOT) {
    await page.screenshot({ path: process.env.AE_PHASE1_SCREENSHOT });
  }
  console.log('Phase 1 bootstrap audit passed.');
} finally {
  await browser.close();
}
