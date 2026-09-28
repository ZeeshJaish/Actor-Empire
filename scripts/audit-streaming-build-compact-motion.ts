import assert from 'node:assert/strict';

const playwrightPath = process.env.PLAYWRIGHT_MODULE
  || '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chromium }: { chromium: any } = require(playwrightPath);

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [393, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 852 } });
      await page.goto(`${baseUrl}/lab.html?markets=US&state=empty&bare=1`, { waitUntil: 'networkidle' });
      const provider = page.locator('[data-cloud-provider-card]').first();
      await provider.waitFor();
      const appearance = await provider.evaluate((node: HTMLElement) => ({
        height: node.getBoundingClientRect().height,
        image: getComputedStyle(node).backgroundImage,
      }));
      assert.equal(appearance.image, 'none', 'provider choices use a solid fill, not a gradient');
      assert.ok(appearance.height <= 132, `provider card should be compact, got ${appearance.height}px`);
      const type = await provider.evaluate((node: HTMLElement) => ({
        crest: parseFloat(getComputedStyle(node.querySelector('.bw-rg-prov-crest em')!).fontSize),
        ceiling: parseFloat(getComputedStyle(node.querySelector('.bw-rg-prov-ceiling')!).fontSize),
        rate: parseFloat(getComputedStyle(node.querySelector('.bw-rg-prov-rate')!).fontSize),
      }));
      assert.ok(type.crest >= 8 && type.ceiling >= 10 && type.rate >= 11,
        `compact provider facts must remain legible: ${JSON.stringify(type)}`);
      const serverHeight = await page.locator('.bw-rg-tiers .bw-net-duty').first()
        .evaluate((node: HTMLElement) => node.getBoundingClientRect().height);
      console.log(`${width}px cards: provider ${appearance.height}px, server ${serverHeight}px`);
      assert.ok(serverHeight <= 155, `server choice should be shorter, got ${serverHeight}px`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `${width}px layout must not create page overflow`);

      if (width === 393) {
        const slider = page.getByRole('slider', { name: /Cloud compute in North America/i });
        await slider.fill('40');
        await page.waitForTimeout(700);
        const header = page.locator('.sf-head-titles p');
        const estate = page.locator('.bw-rg-estate em');
        const mapCost = page.locator('.bw-place-risk s');
        const before = await Promise.all([header.innerText(), estate.innerText(), mapCost.innerText()]);
        await slider.fill('120');
        await page.waitForFunction(() => [...document.querySelectorAll('.bw-rg-block-head em')]
          .some(node => node.textContent?.includes('120 of')));
        const during = await Promise.all([header.innerText(), estate.innerText(), mapCost.innerText()]);
        await page.waitForTimeout(650);
        const after = await Promise.all([header.innerText(), estate.innerText(), mapCost.innerText()]);
        for (let index = 0; index < before.length; index += 1) {
          assert.notEqual(before[index], after[index], `build figure ${index} should reflect changed compute`);
          assert.notEqual(during[index], after[index], `build figure ${index} should animate between slider values`);
        }
      }
      await page.close();
    }
    console.log('PASS Build cards are compact and flat; header and weekly totals animate during cloud changes');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
