import assert from 'node:assert/strict';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/phase5-studio-dashboard-qa.html', { waitUntil: 'domcontentloaded' });
      await page.getByText('A Very Long International Production House').first().waitFor();
      await page.waitForTimeout(450);
      const layout = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).map(button => {
          const rect = button.getBoundingClientRect();
          return { name: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 50),
            left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        });
        return { documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
          buttons: buttons.filter(button => button.width > 0) };
      });
      console.log(`${viewport.width}×${viewport.height} studio dashboard: ${JSON.stringify(layout)}`);
      assert.equal(layout.documentWidth, layout.viewportWidth, 'Studio dashboard must not overflow document width');
      assert.ok(layout.buttons.every(button => button.width >= 44 && button.height >= 44), 'Studio dashboard controls must meet the 44px target floor');
      const divisionLayout = await page.locator('.division-command-card').evaluateAll((nodes: HTMLElement[]) => nodes.map(node => {
        const [title, subtitle] = Array.from(node.querySelectorAll<HTMLElement>('div.break-words'));
        const rect = node.getBoundingClientRect();
        return { width: rect.width, titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
          subtitleSize: Number.parseFloat(getComputedStyle(subtitle).fontSize) };
      }));
      console.log(`${viewport.width}×${viewport.height} studio divisions: ${JSON.stringify(divisionLayout)}`);
      assert.ok(divisionLayout.every(card => card.titleSize >= 11 && card.subtitleSize >= 10), 'Division labels must remain readable');
      if (viewport.width === 320) assert.ok(divisionLayout.every(card => card.width >= 230), 'Compact studio divisions must use one full-width column');
      assert.deepEqual(errors, [], 'Studio dashboard must not throw');
      await page.screenshot({ path: `/tmp/ae-phase5-studio-dashboard-${viewport.width}x${viewport.height}.png` });
      await page.locator('.division-command-card').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/ae-phase5-studio-divisions-${viewport.width}x${viewport.height}.png` });
      await page.close();
    }
    console.log('Phase 5 studio dashboard baseline passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
