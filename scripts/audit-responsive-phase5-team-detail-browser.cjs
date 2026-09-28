const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = 'http://127.0.0.1:5178/phase5-team-detail-qa.html';
const sizes = [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }];

async function check(page, label) {
  const result = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
    small: [...document.querySelectorAll('button')].filter(button => !button.disabled && button.offsetWidth > 0 && (button.offsetWidth < 44 || button.offsetHeight < 44))
      .map(button => ({ label: button.getAttribute('aria-label') || button.textContent.trim().slice(0, 36), width: button.offsetWidth, height: button.offsetHeight })),
  }));
  console.log(`${label}: ${JSON.stringify(result)}`);
  assert.ok(result.width <= result.viewport + 1, `${label} document overflow`);
  assert.deepEqual(result.small, [], `${label} undersized button`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of sizes) {
      const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      for (const [tab, candidate] of [
        ['Agent', 'Alexandra Very Long International Agency Name'],
        ['Manager', 'Morgan International Talent Management'],
        ['Trainer', 'Another Long-Named Trainer'],
        ['Stylist', 'Very Long Celebrity Stylist Name'],
        ['Therapist', 'Very Long Wellness Therapist Name'],
        ['Publicist', 'Very Long Public Relations Specialist Name'],
        ['Care Team', 'Very Long Wellness Coaching Specialist Name'],
      ]) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        await check(page, `${size.width}x${size.height} ${tab} roster`);
        if (size.height === 400 && tab === 'Agent') await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-team-agent-roster-320x400.png' });
        await page.getByText(candidate, { exact: true }).click();
        await check(page, `${size.width}x${size.height} ${tab} detail`);
        if (tab === 'Agent') {
          await page.setViewportSize({ width: size.width, height: 400 });
          assert.ok(await page.getByRole('button', { name: 'Hire Agent' }).isVisible(), 'Agent detail lost on resize');
          await page.setViewportSize(size);
        }
        const hire = page.getByRole('button', { name: /^Hire / });
        await hire.scrollIntoViewIfNeeded();
        const box = await hire.boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= size.height + 1, `${tab} hire action not reachable`);
        if (size.height === 400 && tab === 'Agent') await page.screenshot({ path: 'docs/qa/responsive-after/ae-phase5-team-agent-detail-320x400.png' });
        await page.getByRole('button', { name: /^Back/i }).click();
        assert.ok(await page.getByText(candidate, { exact: true }).count(), `${tab} candidate lost on Back`);
      }
      assert.deepEqual(errors, [], 'Team runtime errors');
      await page.close();
    }
    console.log('Team populated roster/detail responsive audit passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
