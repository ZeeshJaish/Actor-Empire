const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const URL = 'http://127.0.0.1:3000/scripts/fixtures/content-desk-responsive.html';
const labels = ['LIBRARY', 'RIGHTS', 'SLATE', 'LOCALIZATION'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(URL);
    await page.waitForLoadState('networkidle');

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const label of labels) {
        const measurement = await page.getByRole('button', { name: label, exact: true }).evaluate(button => ({
          clientWidth: button.clientWidth,
          scrollWidth: button.scrollWidth,
          left: button.getBoundingClientRect().left,
          right: button.getBoundingClientRect().right,
        }));
        assert.ok(measurement.scrollWidth <= measurement.clientWidth,
          `${label} text must stay inside its ${width}px tab (scroll ${measurement.scrollWidth}, client ${measurement.clientWidth})`);
        assert.ok(measurement.left >= 0 && measurement.right <= width,
          `${label} tab must stay inside the ${width}px viewport`);
      }
    }
    console.log('Content Desk tabs fit at 390px and 320px.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
