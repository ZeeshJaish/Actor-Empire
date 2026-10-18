const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'actor-budget-flow-'));
  const artifacts = process.env.BROWSER_ARTIFACT_DIR || path.resolve('output/playwright/project-cost');
  fs.mkdirSync(artifacts, { recursive: true });
  execFileSync('node_modules/.bin/esbuild', ['scripts/fixtures/project-cost-flow.tsx', '--bundle', '--platform=browser', '--format=esm', '--loader:.csv=text', '--loader:.css=css', '--define:process.env.NODE_ENV="development"', `--outfile=${temp}/main.js`], { stdio: 'pipe' });
  execFileSync('node_modules/.bin/tailwindcss', ['-i', 'index.css', '-o', `${temp}/style.css`, '--minify'], { stdio: 'pipe' });
  fs.writeFileSync(`${temp}/index.html`, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actor Empire Budget Flow Verification</title><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="main.css"></head><body style="background:#090909"><div id="root"></div><script type="module" src="main.js"></script></body></html>');
  const server = http.createServer((req, res) => {
    const name = (req.url || '/').split('?')[0];
    const file = path.join(temp, name === '/' ? 'index.html' : path.basename(name));
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
  try {
    const layoutOnly = process.argv.includes('--layout-only');
    const widths = process.env.BUDGET_VIEWPORTS ? process.env.BUDGET_VIEWPORTS.split(',').map(Number) : layoutOnly ? [320, 360, 390, 768, 1280] : [320, 390, 1280];
    for (const width of widths) {
      console.log('START', width);
      const mobile = width < 600;
      const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR', error.message); });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Actor Empire budget flow verification' }).waitFor();
      await page.getByRole('button', { name: 'Plan project', exact: true }).click();
      const input = page.getByRole('spinbutton', { name: 'Exact marketing amount ($)' });
      await input.waitFor();
      assert.equal(await input.getAttribute('inputmode'), 'numeric');
      const presetOverflow = await page.getByRole('button', { name: /^(LEAN|STANDARD|HEAVY|EVENT)/i }).evaluateAll(buttons => buttons.flatMap(button => {
        const box = button.getBoundingClientRect();
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        const failures = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          for (const rect of range.getClientRects()) if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.bottom > box.bottom + 1) failures.push(node.textContent.trim());
        }
        return failures;
      }));
      assert.deepEqual(presetOverflow, [], 'Every preset label, amount and note must fit inside its card');
      const max = Number(await input.getAttribute('max'));
      await input.fill('-1'); assert.equal(await input.inputValue(), '0');
      await input.fill(String(max + 1_000_000)); assert.equal(Number(await input.inputValue()), max);
      await page.getByRole('button', { name: /^LEAN/i }).click();
      assert.notEqual(Number(await input.inputValue()), max);
      await input.fill('12345678'); assert.equal(await input.inputValue(), '12345678');
      const planning = page.getByTestId('planning-cost-card');
      await planning.scrollIntoViewIfNeeded();
      if (mobile) await planning.tap(); else await planning.hover();
      assert.equal(await planning.getAttribute('aria-expanded'), 'true');
      assert.ok((await planning.innerText()).includes('Marketing Reserved'));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid=planning-cost-card] > span:last-child')).opacity === '1');
      assert.equal(await planning.locator(':scope > span:last-child > span:last-child').evaluate(row => {
        const box = row.getBoundingClientRect();
        return !!document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('[data-testid=planning-cost-card]');
      }), true, 'Planning breakdown total must remain above the step navigation');
      assert.equal(await planning.evaluate(button => {
        const outer = button.getBoundingClientRect();
        const detail = button.lastElementChild.getBoundingClientRect();
        return detail.left >= outer.left - 1 && detail.right <= outer.right + 1 && detail.top >= outer.top - 1 && detail.bottom <= outer.bottom + 1;
      }), true, 'Planning breakdown must stay inside its own cost card');
      const clippedDetailText = await planning.evaluate(button => {
        const box = button.getBoundingClientRect();
        const walker = document.createTreeWalker(button.lastElementChild, NodeFilter.SHOW_TEXT);
        const clipped = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          for (const rect of range.getClientRects()) if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) clipped.push(node.textContent.trim());
        }
        return clipped;
      });
      assert.deepEqual(clippedDetailText, [], 'Contained details must fit their text, not hide overflowing rows');
      await page.screenshot({ path: path.join(artifacts, `planning-breakdown-${width}.png`) });
      if (mobile) await planning.tap(); else { await page.mouse.move(0, 400); await planning.press('Escape'); }
      assert.equal(await planning.getAttribute('aria-expanded'), 'false');
      if (layoutOnly) {
        await input.evaluate(element => element.scrollIntoView({ block: 'center' }));
        await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid=planning-cost-card] > span:first-child')).opacity === '1');
        assert.equal(await input.evaluate(element => {
          const box = element.getBoundingClientRect();
          return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
        }), true, 'Custom keypad field must be reachable above the fixed action bar');
        await page.screenshot({ path: path.join(artifacts, `marketing-input-${width}.png`) });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
        assert.deepEqual(errors, []);
        console.log(`PASS ${width}px: preset text containment, in-card breakdown, tap/hover close, keypad and page width`);
        await context.close();
        continue;
      }
      await page.getByRole('button', { name: 'Review Project', exact: true }).click();
      // Draft persistence goes through the real wizard's saveDraft/onUpdatePlayer.
      await page.evaluate(() => window.budgetSaveFinished);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Actor Empire budget flow verification' }).waitFor();
      await page.getByRole('button', { name: 'Plan project', exact: true }).click();
      assert.equal(await input.inputValue(), '12345678');
      assert.equal((await page.evaluate(() => window.budgetSnapshot())).player.businesses[0].balance, 1_000_000_000);
      await page.getByRole('button', { name: 'Review Project', exact: true }).click();
      console.log('PASS draft resume', width);
      await page.getByRole('button', { name: /^GREENLIGHT PROJECT/i }).click();
      await page.getByRole('button', { name: 'Return to Studio', exact: true }).click();
      let snapshot = await page.evaluate(() => window.budgetSnapshot());
      const production = snapshot.player.commitments[0].projectDetails.estimatedBudget;
      const studioAfterGreenlight = snapshot.player.businesses[0].balance;
      assert.equal(snapshot.summary.marketing, 12_345_678);
      assert.equal(studioAfterGreenlight, 1_000_000_000 - production - 12_345_678);
      await page.getByRole('button', { name: 'Open project dashboard', exact: true }).click();
      const card = page.getByTestId('project-cost-card');
      if (mobile) await card.tap(); else await card.hover();
      assert.equal(await card.getAttribute('aria-expanded'), 'true');
      assert.match(await card.getAttribute('aria-label'), /Total Project Budget: \$33\.4M/);
      assert.ok(await card.getAttribute('aria-describedby'));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid=project-cost-card] > span:last-child')).opacity === '1');
      await card.screenshot({ path: path.join(artifacts, `project-breakdown-${width}.png`) });
      if (mobile) await card.tap(); else { await page.mouse.move(0, 400); await card.press('Escape'); }
      assert.equal(await card.getAttribute('aria-expanded'), 'false');
      if (!mobile) {
        await card.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        assert.equal(await card.getAttribute('aria-expanded'), 'true', 'Keyboard focus must expose the same detail');
        await card.press('Escape'); assert.equal(await card.getAttribute('aria-expanded'), 'false');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await page.evaluate(() => window.budgetSaveFinished);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Actor Empire budget flow verification' }).waitFor();
      snapshot = await page.evaluate(() => window.budgetSnapshot());
      assert.equal(snapshot.summary.marketing, 12_345_678);
      assert.equal(snapshot.player.businesses[0].balance, studioAfterGreenlight);
      // Real weekly processing advances production. The fixture only accelerates repeated clicks.
      await page.getByRole('button', { name: 'Advance production to release', exact: true }).click();
      await page.waitForFunction(() => window.budgetSnapshot().player.commitments[0]?.projectPhase === 'AWAITING_RELEASE', null, { timeout: 60000 });
      snapshot = await page.evaluate(() => window.budgetSnapshot());
      assert.equal(snapshot.summary.production, production);
      const beforeRelease = snapshot.player.businesses[0].balance;
      const beforeCash = snapshot.player.money;
      await page.getByRole('button', { name: 'Configure release', exact: true }).click();
      await page.getByRole('button', { name: /Theatrical/ }).click();
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
      await page.getByRole('button', { name: 'AUTO-BUILD FOOTPRINT', exact: true }).click();
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
      await page.getByRole('button', { name: 'Increase Trailer Launch', exact: true }).click();
      await page.getByRole('button', { name: 'Increase Social / Digital', exact: true }).click();
      assert.equal((await page.getByTestId('channel-TRAILER_LAUNCH-value').innerText()).trim(), '$1.3M');
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
      await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
      await page.getByRole('button', { name: 'REVIEW', exact: true }).click();
      await page.getByRole('button', { name: /LOCK STRATEGY/ }).click();
      await page.getByRole('button', { name: 'Open project dashboard', exact: true }).waitFor();
      snapshot = await page.evaluate(() => window.budgetSnapshot());
      const settled = snapshot.player.commitments[0].projectDetails;
      assert.equal(settled.marketingBudgetSpent, 2_500_000);
      assert.equal(settled.returnedMarketingBudget, 9_845_678);
      assert.equal(snapshot.player.businesses[0].balance, beforeRelease + 9_845_678);
      assert.equal(snapshot.player.money, beforeCash, 'Reserved campaign must not charge personal cash again');
      assert.equal(snapshot.summary.total, 23_507_000);
      assert.equal(snapshot.summary.marketingKind, 'SPENT');
      await page.getByRole('button', { name: 'Open project dashboard', exact: true }).click();
      if (mobile) await card.tap(); else await card.hover();
      assert.ok((await card.innerText()).includes('Marketing Spent'));
      assert.ok((await card.innerText()).includes('Reserve Returned'));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid=project-cost-card] > span:last-child')).opacity === '1');
      await card.screenshot({ path: path.join(artifacts, `settled-breakdown-${width}.png`) });
      const settledCash = snapshot.player.businesses[0].balance;
      await page.evaluate(() => window.budgetSaveFinished);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Actor Empire budget flow verification' }).waitFor();
      snapshot = await page.evaluate(() => window.budgetSnapshot());
      assert.equal(snapshot.player.businesses[0].balance, settledCash, 'Reload must not replay the reserve refund');
      assert.equal(snapshot.summary.total, 23_507_000);
      assert.equal(snapshot.summary.returned, 9_845_678);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: exact input, funds cap, preset, draft/reload, Greenlight debit, cost card interaction, weekly production, release spend/refund, reload without duplicate payment`, { production, studioAfterGreenlight, beforeRelease, beforeCash });
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
