import assert from 'node:assert/strict';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const checkBounds = async (page: any, label: string, viewport: { width: number; height: number }) => {
  const metrics = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .filter(button => getComputedStyle(button).display !== 'none' && button.getBoundingClientRect().width > 0);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      buttons: buttons.map(button => ({ text: button.textContent?.trim(), width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height, top: button.getBoundingClientRect().top,
        bottom: button.getBoundingClientRect().bottom })),
    };
  });
  console.log(`${viewport.width}×${viewport.height} ${label}: ${JSON.stringify(metrics)}`);
  assert.equal(metrics.documentWidth, metrics.viewportWidth, `${label}: no horizontal document overflow`);
  assert.ok(metrics.buttons.every((button: any) => button.width >= 44 && button.height >= 44), `${label}: all visible controls must be at least 44px`);
  return metrics;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      await page.clock.install();
      await page.goto('http://127.0.0.1:5178/phase5-production-wizard-qa.html', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /initialize setup/i }).waitFor();
      await checkBounds(page, 'studio gate', viewport);
      await page.getByRole('button', { name: /initialize setup/i }).click();
      const confirm = page.getByText(/major investment/i).locator('..').locator('..');
      const confirmBounds = await confirm.evaluate((node: HTMLElement) => {
        const rect = node.getBoundingClientRect();
        const last = node.querySelector('button:last-of-type')?.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight,
          overflowY: getComputedStyle(node).overflowY, lastButtonBottom: last?.bottom };
      });
      console.log(`${viewport.width}×${viewport.height} studio confirmation: ${JSON.stringify(confirmBounds)}`);
      assert.ok(confirmBounds.top >= 0 && confirmBounds.bottom <= viewport.height, 'Studio confirmation must fit the short viewport');
      await page.getByRole('button', { name: /sign the check/i }).click();
      await page.clock.runFor(14000);
      await page.getByPlaceholder(/enter name here/i).waitFor();
      await checkBounds(page, 'studio document name', viewport);
      await page.getByPlaceholder(/enter name here/i).fill('Long-Running International Production House');
      await page.getByRole('button', { name: /proceed to schedule/i }).click();
      const metrics = await checkBounds(page, 'studio document executive', viewport);
      assert.ok(metrics.buttons.some((button: any) => /ratify|need \d+e/i.test(button.text || '')), 'Executive signing action must exist');
      const amountBounds = await page.getByText('$50,000,000', { exact: true }).evaluate((node: HTMLElement) => {
        const amount = node.getBoundingClientRect();
        const documentCard = node.closest('.max-w-sm')!.getBoundingClientRect();
        return { amountLeft: amount.left, amountRight: amount.right, cardLeft: documentCard.left, cardRight: documentCard.right };
      });
      console.log(`${viewport.width}×${viewport.height} studio document capital: ${JSON.stringify(amountBounds)}`);
      assert.ok(amountBounds.amountLeft >= amountBounds.cardLeft && amountBounds.amountRight <= amountBounds.cardRight,
        'Capital commitment must remain within the document card');
      const signing = page.getByRole('button', { name: /sign.*ratify/i });
      await signing.scrollIntoViewIfNeeded();
      const signingBounds = await signing.evaluate((node: HTMLElement) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
      console.log(`${viewport.width}×${viewport.height} studio signing reachability: ${JSON.stringify(signingBounds)}`);
      assert.ok(signingBounds.top >= 0 && signingBounds.bottom <= viewport.height, 'Signing control must be reachable after scrolling');
      await page.screenshot({ path: `/tmp/ae-phase5-production-wizard-${viewport.width}x${viewport.height}.png` });
      assert.deepEqual(errors, [], 'No runtime errors');
      await page.close();
    }
    console.log('Phase 5 production wizard layout audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
