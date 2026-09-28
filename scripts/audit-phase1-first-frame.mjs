import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let releaseScripts;
  const scriptsReleased = new Promise(resolve => { releaseScripts = resolve; });
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script') await scriptsReleased;
    await route.continue();
  });
  await page.goto(process.env.AE_PHASE1_URL || 'http://127.0.0.1:5174/', { waitUntil: 'commit' });
  await page.locator('#root main').waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector('#root main img');
    return image?.complete && image.naturalWidth > 0;
  });
  const firstFrame = await page.locator('#root').innerText();
  const accessibleLabel = await page.locator('#root main').getAttribute('aria-label');
  const frame = await page.locator('#root main').boundingBox();
  assert.match(`${accessibleLabel} ${firstFrame}`, /Zedbury Studios/i);
  assert.doesNotMatch(firstFrame, /Starting Actor Empire/i);
  assert.equal(frame?.x, 0, 'Branded first frame must start at the viewport edge.');
  assert.equal(frame?.y, 0, 'Branded first frame must start at the viewport edge.');
  if (process.env.AE_PHASE1_SCREENSHOT) await page.screenshot({ path: process.env.AE_PHASE1_SCREENSHOT });
  releaseScripts();
  console.log('Phase 1 first-frame audit passed.');
} finally {
  await browser.close();
}
