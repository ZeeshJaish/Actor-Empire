import assert from 'node:assert/strict';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 480, height: 740 } });
    const errors: string[] = [];
    page.on('pageerror', (error: Error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5178/scripts/fixtures/responsive-layout-qa.html');
    await page.locator('#stat-container [data-layout-columns]').waitFor();
    for (const [width, expected] of [[199, 1], [200, 2], [407, 2], [408, 4]] as const) {
      await page.locator('#stat-container').evaluate((node: HTMLElement, w: number) => { node.style.width = `${w}px`; }, width);
      await page.waitForFunction((columns: number) => document.querySelector('#stat-container [data-layout-columns]')?.getAttribute('data-layout-columns') === String(columns), expected);
      assert.equal(await page.locator('#stat-container [data-layout-columns]').getAttribute('data-layout-columns'), String(expected));
    }
    for (const [width, expected] of [[295, 1], [296, 2]] as const) {
      await page.locator('#action-container').evaluate((node: HTMLElement, w: number) => { node.style.width = `${w}px`; }, width);
      await page.waitForFunction((columns: number) => document.querySelector('#action-container [data-layout-columns]')?.getAttribute('data-layout-columns') === String(columns), expected);
    }
    assert.equal(await page.evaluate(() => window.qaMounts), 4, 'resizing must not remount cards');
    await page.locator('#stat-container').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
    await page.locator('#action-container').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
    for (const [width, height] of [[320, 740], [393, 852], [430, 932], [430, 600]] as const) {
      await page.setViewportSize({ width, height });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `horizontal overflow at ${width}×${height}`);
    }
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      buttons: Array.from(document.querySelectorAll<HTMLElement>('#action-container button, .ae-layout-footer button')).map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
    }));
    assert.ok(geometry.scrollWidth <= geometry.clientWidth, `horizontal overflow: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.buttons.every(button => button.width >= 44 && button.height >= 44), `undersized action: ${JSON.stringify(geometry.buttons)}`);
    await page.waitForFunction(() => document.querySelector('#native-layout-status')?.getAttribute('data-result') === 'pass');
    const nativeStatus = await page.evaluate(() => {
      const node = document.querySelector('#native-layout-status');
      return { result: node?.getAttribute('data-result'), text: node?.textContent };
    });
    assert.equal(nativeStatus.result, 'pass', `native fixture must expose measured pass/fail result: ${nativeStatus.text}`);

    const initialIssues = await page.evaluate(() => window.auditQaLayout());
    assert.deepEqual(initialIssues, []);
    await page.locator('[data-layout-id="diagnostics-chrome"]').evaluate((node: HTMLElement) => { node.style.top = '100px'; });
    const chromeIssues = await page.evaluate(() => window.auditQaLayout());
    assert.deepEqual(chromeIssues, [{ kind: 'content-behind-fixed-chrome', id: 'diagnostics-primary' }]);
    await page.locator('[data-layout-id="diagnostics-chrome"]').evaluate((node: HTMLElement) => { node.style.top = '160px'; });
    await page.locator('[data-layout-id="diagnostics-button"]').evaluate((node: HTMLElement) => { node.style.width = '30px'; node.style.height = '30px'; });
    await page.locator('[data-layout-id="diagnostics-label"]').evaluate((node: HTMLElement) => { node.style.width = '20px'; node.style.overflow = 'hidden'; });
    await page.locator('[data-layout-id="diagnostics-region"]').evaluate((node: HTMLElement) => { node.style.width = '20px'; node.style.overflow = 'visible'; node.firstElementChild!.textContent = 'A very wide unbreakable overflow region'; });
    const issueKinds = await page.evaluate(() => window.auditQaLayout().map(issue => issue.kind));
    assert.deepEqual(issueKinds.sort(), ['clipped-primary-label', 'horizontal-overflow', 'undersized-touch-target'].sort());
    assert.deepEqual(errors, []);
    await page.close();
    console.log('Responsive layout browser audit passed.');
  } finally { await browser.close(); }
})().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
