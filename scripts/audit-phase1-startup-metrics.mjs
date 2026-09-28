import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const cpuSlowdown = Number(process.env.AE_PHASE1_CPU_SLOWDOWN || 1);
const url = process.env.AE_PHASE1_URL || 'http://127.0.0.1:5176/';
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (cpuSlowdown > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  }

  for (const cache of ['cold', 'warm']) {
    const started = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#startBtn').waitFor({ timeout: 60_000 });
    const menuMs = Date.now() - started;
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const scripts = entries.filter(entry => /\.(js|tsx)(\?|$)/.test(entry.name));
      const styles = entries.filter(entry => /\.css(\?|$)/.test(entry.name));
      return {
        scriptCount: scripts.length,
        scriptTransferBytes: Math.round(scripts.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)),
        styleCount: styles.length,
        styleTransferBytes: Math.round(styles.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)),
        heapBytes: performance.memory?.usedJSHeapSize ?? null,
      };
    });
    assert.deepEqual(errors, [], 'Startup raised uncaught browser errors.');
    console.log(JSON.stringify({ cache, cpuSlowdown, menuMs, ...resources }));
  }
} finally {
  await browser.close();
}
