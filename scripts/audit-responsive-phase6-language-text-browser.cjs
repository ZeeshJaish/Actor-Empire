const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const languages = ['en', 'pt-BR', 'fr', 'es', 'tr', 'de'];
const screens = [
  { name: 'Team candidate', path: 'phase5-team-detail-qa.html', open: async page => {
    await page.locator('.overflow-x-auto.no-scrollbar button').nth(1).click();
    await page.getByText('Alexandra Very Long International Agency Name', { exact: true }).click();
  } },
  { name: 'BoxOffice detail', path: 'phase5-boxoffice-detail-qa.html?mode=theatrical', open: async page => {
    const release = page.getByRole('button', { name: /The Remarkably Long International Motion Picture Project/ }).first();
    const wordFit = await release.locator('div.font-bold.text-lg').first().evaluate(element => {
      const style = getComputedStyle(element);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = style.font;
      return { available: element.getBoundingClientRect().width, needed: context.measureText('International').width };
    });
    assert.ok(wordFit.available >= wordFit.needed, `BoxOffice release title splits a word: ${JSON.stringify(wordFit)}`);
    await release.click();
  } },
];

async function measure(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(button => !button.disabled && button.offsetWidth && button.offsetHeight);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44).map(button => button.getAttribute('aria-label') || button.textContent.trim().slice(0, 24)),
      clipped: buttons.filter(button => button.scrollWidth > button.clientWidth + 1).map(button => button.getAttribute('aria-label') || button.textContent.trim().slice(0, 24)),
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 448, height: 956 }]) {
      for (const language of languages) {
        for (const screen of screens) {
          const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
          page.setDefaultTimeout(8000);
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          const separator = screen.path.includes('?') ? '&' : '?';
          await page.goto(`http://127.0.0.1:5178/${screen.path}${separator}lang=${encodeURIComponent(language)}`);
          await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });
          await screen.open(page);
          const result = await measure(page);
          if (screen.name === 'BoxOffice detail') {
            const columns = await page.locator('[data-layout-columns]').first().getAttribute('data-layout-columns');
            assert.equal(columns, viewport.width === 320 ? '2' : '4', `${language}: wrong BoxOffice tab columns`);
            if (viewport.width === 320 && (language === 'en' || language === 'pt-BR')) {
              await page.screenshot({ path: `docs/qa/responsive-after/ae-phase6-boxoffice-${language}-125pct-320x400.png` });
            }
          }
          console.log(`${viewport.width}x${viewport.height} ${language} ${screen.name}: ${JSON.stringify(result)}`);
          assert.ok(result.overflow <= 1, `${language} ${screen.name}: document overflow`);
          assert.deepEqual(result.small, [], `${language} ${screen.name}: small buttons`);
          assert.deepEqual(result.clipped, [], `${language} ${screen.name}: clipped button labels`);
          assert.deepEqual(errors, [], `${language} ${screen.name}: runtime errors`);
          await page.close();
        }
      }
    }
    console.log('Phase 6 language/text stress sample passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
