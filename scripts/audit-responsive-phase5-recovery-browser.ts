import assert from 'node:assert/strict';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      for (const mode of ['save', 'week'].filter(item => !process.env.PHASE5_RECOVERY_MODE || item === process.env.PHASE5_RECOVERY_MODE)) {
        const page = await browser.newPage({ viewport });
        await page.goto(`http://127.0.0.1:5178/phase5-recovery-qa.html?mode=${mode}`, { waitUntil: 'domcontentloaded' });
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        const metrics = await dialog.evaluate((node: HTMLElement) => {
          const rect = node.getBoundingClientRect();
          const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>('button'));
          node.scrollTo(0, node.scrollHeight);
          const last = buttons.at(-1)?.getBoundingClientRect();
          const name = node.querySelector<HTMLElement>('.text-lg.font-black');
          return { documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
            left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, overflowY: getComputedStyle(node).overflowY,
            buttons: buttons.map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
            lastButtonBottom: last?.bottom ?? 0,
            nameClipped: !!name && (name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1) };
        });
        console.log(`${viewport.width}×${viewport.height} ${mode} recovery: ${JSON.stringify(metrics)}`);
        assert.equal(metrics.documentWidth, metrics.viewportWidth, 'Recovery dialog must not create horizontal overflow');
        assert.ok(metrics.left >= 0 && metrics.right <= viewport.width && metrics.top >= 0 && metrics.bottom <= viewport.height, 'Recovery dialog must fit the visible area');
        assert.ok(metrics.buttons.every(rect => rect.width >= 44 && rect.height >= 44), 'Recovery actions must meet the 44px target floor');
        assert.ok(metrics.scrollHeight <= metrics.clientHeight + 1 || metrics.overflowY === 'auto', 'Long recovery content must scroll');
        assert.ok(metrics.lastButtonBottom <= metrics.bottom + 1, 'The last recovery action must be reachable');
        if (mode === 'save') assert.equal(metrics.nameClipped, false, 'Full save owner name must remain readable');
        await page.screenshot({ path: `/tmp/ae-phase5-${mode}-recovery-${viewport.width}x${viewport.height}.png` });
        await page.close();
      }
    }
    console.log('Phase 5 recovery-dialog layout audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
