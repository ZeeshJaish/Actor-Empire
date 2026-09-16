import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const url = `${baseUrl.replace(/\/$/, '')}/scripts/fixtures/streaming-build-money.html`;
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 393, height: 600 }, { width: 393, height: 852 }]) {
    const errors = [];
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.getByRole('heading', { name: 'The Build' }).waitFor();
    await page.getByText('Launch allocation', { exact: true }).waitFor();
    await page.getByText('Before campaign', { exact: true }).waitFor();
    await page.getByText('With this plan', { exact: true }).waitFor();
    const shell = page.locator('.sf.lw.bw');
    assert.equal(await shell.evaluate(element => element.scrollWidth <= element.clientWidth), true, `${viewport.height}px shell must not overflow horizontally.`);
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);

    const custom = page.getByRole('spinbutton', { name: 'Custom marketing allocation' });
    await custom.fill('0');
    await page.getByText('Organic launch', { exact: true }).waitFor();
    const confidenceSelector = '.bw-country-forecast .bw-section-head small';
    const organicConfidence = await page.locator(confidenceSelector).textContent();
    await page.getByRole('group', { name: 'Recommended marketing ceilings' }).getByRole('button', { name: /Balanced/ }).click();
    assert.notEqual(await custom.inputValue(), '0');
    await page.waitForFunction(
      ({ selector, before }) => document.querySelector(selector)?.textContent !== before,
      { selector: confidenceSelector, before: organicConfidence },
    );
    assert.notEqual(await page.locator(confidenceSelector).textContent(), organicConfidence, 'Funded coverage must update the visible confidence score.');
    await custom.fill('1000000000000');
    await page.getByText('Market saturated', { exact: true }).waitFor();
    await custom.fill('250000000');
    await page.getByText(/short\. The value is preserved, but commissioning is blocked\./).waitFor();

    await page.getByRole('button', { name: /Lead with an original/ }).click();
    await page.getByRole('button', { name: /Last-week push/ }).click();
    const advanced = page.locator('.bw-advanced');
    await advanced.locator('summary').click();
    await page.getByRole('button', { name: 'Manual' }).click();
    assert.equal(await page.getByRole('spinbutton', { name: 'United States allocation weight' }).count(), 1);
    assert.equal(await shell.evaluate(element => element.scrollWidth <= element.clientWidth), true, `${viewport.height}px expanded controls must not overflow horizontally.`);

    await page.screenshot({ path: `/tmp/streaming-build-money-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.locator('.sf-scroll').evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: `/tmp/streaming-build-money-top-${viewport.width}x${viewport.height}.png` });
    await page.close();
  }
  console.log('Streaming launch marketing browser audit passed at 393x600 and 393x852.');
} finally {
  await browser.close();
}
