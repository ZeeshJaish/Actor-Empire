import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const url = `${baseUrl.replace(/\/$/, '')}/scripts/fixtures/streaming-commission-cutscene.html`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  page.setDefaultTimeout(5_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('heading', { name: 'You sign it' }).waitFor();

  assert.equal(await page.locator('.cine-rail').count(), 0, 'Commissioning must not show page-progress chrome.');
  assert.equal(await page.getByRole('button', { name: 'Skip' }).count(), 0, 'Commissioning must not offer a Skip action.');
  assert.equal(await page.getByRole('button', { name: 'Next' }).count(), 0, 'Commissioning must advance on its authored timing rather than offer a hidden skip target.');
  const signature = page.locator('.cs-signature-script');
  assert.equal(await signature.count(), 1, 'The contract must render a named player signature.');
  assert.equal(await signature.textContent(), 'Zeeshan Jaish', 'The contract must carry the real player signature, not a generic squiggle.');
  assert.match(
    await signature.evaluate(element => getComputedStyle(element).fontFamily),
    /Snell Roundhand|Savoye LET|Segoe Script|Brush Script MT|Dancing Script|cursive/,
    'The contract signature must reuse the established cursive game treatment.',
  );
  assert.equal(
    await signature.evaluate(element => element.scrollWidth <= element.clientWidth),
    true,
    'The complete player name must fit on the phone-sized signature line.',
  );
  assert.deepEqual(errors, []);
  await page.waitForTimeout(2_800);
  await page.screenshot({ path: '/tmp/streaming-commission-cutscene.png' });
  console.log('Streaming commission cutscene browser audit passed.');
} finally {
  await browser.close();
}
