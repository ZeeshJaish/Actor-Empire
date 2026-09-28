const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = 'http://127.0.0.1:5178/phase5-studio-dashboard-qa.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const discovery = await browser.newPage({ viewport });
      await discovery.goto(url, { waitUntil: 'domcontentloaded' });
      await discovery.locator('.division-command-card').first().waitFor();
      const cardNames = await discovery.locator('.division-command-card').allTextContents();
      await discovery.close();
      for (let index = 0; index < cardNames.length; index++) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.locator('.division-command-card').nth(index).click();
        await page.waitForTimeout(350);
        const result = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button')).filter(button => button.offsetWidth > 0 && button.offsetHeight > 0);
          const back = buttons.filter(button => button.getAttribute('aria-label')?.toLowerCase().includes('back') || button.querySelector('svg.lucide-arrow-left'));
          return {
            docWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            back: back.slice(0, 4).map(button => ({ label: button.getAttribute('aria-label') || button.textContent?.trim(), width: button.offsetWidth, height: button.offsetHeight })),
            small: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44).slice(0, 8).map(button => ({ label: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 30), width: button.offsetWidth, height: button.offsetHeight })),
          };
        });
        console.log(`${viewport.width} studio ${index} ${cardNames[index].trim().replace(/\s+/g, ' ').slice(0, 35)}: ${JSON.stringify(result)}`);
        assert.ok(result.docWidth <= result.viewportWidth + 1, `${viewport.width} studio ${index}: document overflow`);
        assert.ok(result.back.some(button => button.width >= 44 && button.height >= 44), `${viewport.width} studio ${index}: no full-size Back/Close`);
        assert.deepEqual(result.small, [], `${viewport.width} studio ${index}: undersized visible buttons`);
        assert.deepEqual(errors, [], `${viewport.width} studio ${index}: render errors`);
        const nextScreens = index === 0
          ? ['VAULT', 'NEW_CONCEPT', 'IP_MARKET', 'FRANCHISES', 'UNIVERSE'].map((name, position) => ({ name, locator: page.locator('.no-scrollbar button').nth(position) }))
          : index === 1 ? [{ name: 'Equipment', locator: page.getByRole('button', { name: 'Equipment', exact: true }) }]
          : index === 2 ? [{ name: 'Market', locator: page.getByRole('button', { name: 'Market', exact: true }) }]
          : index === 3 ? [{ name: 'Manage Funds', locator: page.getByRole('button', { name: /Manage Funds/i }) }]
          : index === 4 ? ['Portfolio', 'Mandate', 'Relationships', 'Statements', 'Packages'].map(name => ({ name, locator: page.getByRole('tab', { name }) }))
          : [];
        for (const next of nextScreens) {
          await next.locator.click();
          await page.waitForTimeout(100);
          const nested = await page.evaluate(() => ({
            docWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            small: Array.from(document.querySelectorAll('button')).filter(button => button.offsetWidth > 0 && button.offsetHeight > 0 && (button.offsetWidth < 44 || button.offsetHeight < 44)).slice(0, 8).map(button => ({ name: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 30), width: button.offsetWidth, height: button.offsetHeight })),
          }));
          console.log(`${viewport.width} studio ${index} ${next.name}: ${JSON.stringify(nested)}`);
          assert.ok(nested.docWidth <= nested.clientWidth + 1, `${viewport.width} studio ${index} ${next.name}: document overflow`);
          assert.deepEqual(nested.small, [], `${viewport.width} studio ${index} ${next.name}: undersized visible buttons`);
          assert.deepEqual(errors, [], `${viewport.width} studio ${index} ${next.name}: render errors`);
        }
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
