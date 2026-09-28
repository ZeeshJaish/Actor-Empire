import assert from 'node:assert/strict';

const playwrightPath = process.env.PLAYWRIGHT_MODULE
  || '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chromium }: { chromium: any } = require(playwrightPath);
const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    await page.goto(`${baseUrl}/lab.html?markets=US&state=empty&bare=1`, { waitUntil: 'networkidle' });
    const slider = page.getByRole('slider', { name: /Cloud compute in North America/i });
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    assert.ok(box, 'cloud slider must be visible');
    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .75, box.y + box.height / 2, { steps: 2 });
    await page.waitForFunction(() => {
      const cores = [...document.querySelectorAll('.bw-atlas-field:not(.bw-atlas-halos) circle.bw-atlas-reach')];
      return cores.length >= 10 && cores.some(node => Number(node.getAttribute('r')) > 0);
    });
    await page.waitForTimeout(50);
    const motion = await page.evaluate(() => {
      const cores = [...document.querySelectorAll('.bw-atlas-field:not(.bw-atlas-halos) circle.bw-atlas-reach')];
      const delay = (node: Element) => parseFloat(getComputedStyle(node).transitionDelay) * 1000;
      const market = document.querySelector('.bw-atlas-market.is-served');
      return {
        first: delay(cores[0]),
        last: delay(cores[cores.length - 1]),
        market: market ? delay(market) : 0,
        dragging: Boolean(document.querySelector('.bw-rg.is-cloud-dragging')),
      };
    });
    assert.equal(motion.dragging, true, 'the map is measured during an active slider gesture');
    assert.ok(motion.last >= motion.first + 70,
      `new coverage should arrive over time, not all at once: ${JSON.stringify(motion)}`);
    assert.ok(motion.market >= 150,
      `whole-country completion should wait for the coverage field: ${JSON.stringify(motion)}`);
    await page.mouse.up();
    await page.waitForTimeout(700);
    const exact = Number(await slider.inputValue());
    const total = Number((await page.locator('.bw-cloud-read').first().innerText()).split('\n')[0]);
    assert.equal(total, exact, 'the visual transition must settle on the exact saved compute count');
    await page.close();
    console.log('PASS cloud map stages new coverage and country completion, then settles on exact compute');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
