/* Run against lab/stockAcquisitionSafetyVite.config.mjs. New browser context = isolated synthetic save; no user slot is accessed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = process.env.STOCK_FLOW_OUTPUT || '/private/tmp/stock-acquisition-flow';
const base = process.env.STOCK_FLOW_URL || 'http://127.0.0.1:5196/stockAcquisitionSafety.html';
const studio = process.env.STOCK_FLOW_STUDIO || 'PARAMOUNT';
const scenario = process.env.STOCK_FLOW_SCENARIO || 'fresh';
const percent = Number(process.env.STOCK_FLOW_PERCENT || 51);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 448, height: 956 } });
  const page = await context.newPage();
  const errors = [];
  const report = { kind: 'PRODUCTION_COMPONENTS_REAL_WEEK_AND_VERIFIED_INDEXEDDB', studio, scenario, percent, steps: [], console: [] };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (['error','warning'].includes(message.type())) report.console.push({type:message.type(),text:message.text().slice(0,500)})});
  page.setDefaultTimeout(60000);
  const write = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ...report, errors }, null, 2));
  const read = async label => {
    await page.waitForFunction(() => Boolean(window.__stockFlow?.snapshot()));
    await page.evaluate(() => window.__stockFlow.idle());
    const state = await page.evaluate(() => window.__stockFlow.snapshot());
    report.steps.push({ label, ...state }); write(); return state;
  };
  const buyTarget = async target => {
    await page.getByRole('button', { name: 'Target %', exact: true }).click();
    await page.locator('input[type=number]').fill(String(target));
    await page.getByRole('button', { name: 'Buy', exact: true }).click();
  };
  const openRoom = async () => {
    await page.getByRole('dialog', { name: /acquisition deal room/ }).waitFor();
  };
  try {
    const url = new URL(base); url.searchParams.set('studio', studio); url.searchParams.set('scenario', scenario); url.searchParams.set('pct', String(percent));
    if (process.env.STOCK_FLOW_DEBT_MILLIONS) url.searchParams.set('debtMillions', process.env.STOCK_FLOW_DEBT_MILLIONS);
    if (process.env.STOCK_FLOW_ENERGY) url.searchParams.set('energy', process.env.STOCK_FLOW_ENERGY);
    await page.goto(url.href);
    await page.getByRole('button', { name: 'Target %', exact: true }).waitFor({ timeout: 120000 });
    const initial = await read('loaded synthetic fixture through real migration');
    if (process.env.STOCK_FLOW_INSPECT) { console.log(await page.locator('body').innerText()); return; }
    if (scenario === 'repairedQuote') {
      assert.equal(initial.money,2e12);assert.equal(initial.holdings[0].shares,100);assert.equal(initial.holdings[0].averageCost,0);assert.equal(initial.holdings[0].totalInvested,0);
      assert.equal(initial.repairs[initial.stock.id].originalPrice,String(10.6e21));
      const disclosure=page.getByRole('note',{name:'Saved stock quote correction'});await disclosure.waitFor();report.repairDisclosure=await disclosure.innerText();
      assert.match(report.repairDisclosure,/cash.*shares.*purchase costs/i);
      await page.screenshot({path:path.join(out,'repaired-quote.png')});
      await page.getByRole('button',{name:'Verified Save / Reload',exact:true}).click();
      const reload=await read('repaired quote verified reload preserves archived source and zero cost basis');assert.deepEqual(reload.repairs,initial.repairs);assert.deepEqual(reload.holdings,initial.holdings);assert.equal(reload.money,initial.money);
      report.status='PASSED';console.log('Quote repair disclosure and verified reload preserve cash, quantity and zero cost basis.');return;
    }
    if (scenario === 'sxWallet') {
      await page.locator('input[type=number]').fill('1'); await page.getByRole('button', { name: 'Buy', exact: true }).click();
      await page.getByRole('alert').waitFor(); const failed = await read('SX purchase rejected atomically');
      assert.equal(failed.money, initial.money); assert.deepEqual(failed.holdings, initial.holdings); assert.equal(failed.businesses.length, initial.businesses.length);
      report.status = 'PASSED'; console.log('SX browser transaction failure preserves money and shares.'); return;
    }
    if (scenario === 'fresh') {
      assert.equal(initial.holdings.length, 0);
      await buyTarget(49); const below = await read('actual Stocks purchase below control');
      assert.equal(below.holdings[0].shares, Math.ceil(initial.stock.outstandingShares * .49));
      await buyTarget(percent); const bought = await read('actual Stocks purchase to control');
      assert.equal(bought.holdings[0].shares, Math.ceil(initial.stock.outstandingShares * percent / 100));
      assert.ok(Math.abs((initial.money - bought.money) - bought.holdings[0].totalInvested) <= .01, 'wallet debit equals share purchase basis');
      await page.getByRole('button', { name: 'Advance Real Week', exact: true }).click();
      await page.getByRole('button', { name: /Open Acquisition Desk/ }).waitFor({ timeout: 120000 });
      await read('actual week engine generated control notice');
      await page.getByRole('button', { name: /Open Acquisition Desk/ }).click(); await openRoom();
      await page.getByRole('button', { name: /Run Due Diligence/ }).click();
      await page.locator('.sa-sheet').getByRole('button').filter({ hasText: /Personal Wealth/ }).click();
      await page.getByRole('button', { name: /Open the War Room/ }).waitFor();
      await read('actual paid diligence produced DRAFT');
    } else {
      await page.getByRole('button', { name: 'Open Acquisition', exact: true }).click(); await openRoom();
      await read('legacy majority case opened actual Forbes route');
    }
    const openWar = page.getByRole('button', { name: /Open the War Room/ });
    if (await openWar.count()) {
      await openWar.click(); await page.getByRole('button', { name: /File Majority Control Notice/ }).click();
    }
    await page.getByRole('button', { name: 'Review the Board Decision', exact: true }).click();
    assert.ok(await page.getByRole('button', { name: /Proceed to Closing/ }).count(), 'majority overrides old counter/rejection');
    await page.getByRole('button', { name: /Proceed to Closing/ }).click(); await page.locator('.sa-closing').waitFor();
    report.closingText = await page.locator('.sa-closing').innerText();
    assert.match(report.closingText, /Tender Agreement\n\$0/, 'majority has zero additional share price, including stale accepted offers');
    await read('closing reached without dossier reset');
    for (const button of await page.locator('.sa-closedoc').all()) await button.click();
    await page.getByRole('button', { name: /Enter the Signing Room/ }).click();
    if (process.env.STOCK_FLOW_STALE_SIGNING) {
      const original = await read('entered signing with reviewed quote');
      await page.evaluate(()=>window.__stockFlow.authorFixtureDebt(500));
      await page.getByRole('button', { name: 'Verified Save / Reload', exact: true }).click();
      await page.getByRole('button', { name: 'Open Acquisition', exact: true }).click(); await openRoom();
      await page.locator('.sa-closing').waitFor();
      const stale = await read('changed live debt and reload require closing documents again');
      assert.equal(stale.money, original.money); assert.deepEqual(stale.holdings, original.holdings); assert.equal(stale.businesses.length,0);
      assert.equal(await page.getByRole('button',{name:/Sign the Transfer/}).count(),0);
      report.staleQuoteText=await page.locator('.sa-closing').innerText();
      assert.match(report.staleQuoteText,/500/);
      report.status='PASSED'; console.log('Changed signing quote reload returns to closing review without touching assets.'); return;
    }
    for (let index = 0; index < 3; index++) await page.getByRole('button', { name: /Confirm Clause.*Next/ }).click();
    const pre = await read('before actual final signature');
    if(process.env.STOCK_FLOW_DOUBLE_SIGN){report.doubleSign=true;await page.getByRole('button',{name:/Sign the Transfer/}).evaluate(button=>{button.click();button.click()});}else await page.getByRole('button', { name: /Sign the Transfer/ }).click();
    if (process.env.STOCK_FLOW_ENERGY === '0') {
      await page.getByRole('alertdialog').waitFor(); const failed = await read('low energy signing rejected atomically');
      assert.equal(failed.money, pre.money); assert.deepEqual(failed.holdings, pre.holdings); assert.equal(failed.businesses.length, 0); assert.equal(failed.energy, pre.energy);
      report.status = 'PASSED'; console.log('Low-energy browser signing rejection preserves assets.'); return;
    }
    await page.locator('.sa-acquired').waitFor(); const acquired = await read('actual signature acquired studio');
    report.acquiredPaid=await page.locator('.sa-acq-stats > div').first().locator('b').innerText();assert.equal(report.acquiredPaid,'$0','existing-control transfer receipt remains zero');
    assert.equal(acquired.money, pre.money, 'no second purchase debit'); assert.deepEqual(acquired.holdings, pre.holdings, 'signing preserves quantity/basis/funding');
    assert.equal(pre.energy - acquired.energy, 25, 'one signing energy debit');
    assert.equal(acquired.businesses.filter(b => b.id === studio).length, 1); assert.equal(acquired.case.status, 'ACQUIRED'); assert.equal(acquired.case.closing.finalPrice, 0);
    const principal = acquired.case.closing.verifiedDebt + acquired.case.closing.hiddenLiabilities;
    const expectedDebtEntries = principal > 0 ? 1 : 0;
    assert.equal(acquired.debt.entries.filter(e => e.studioId === studio).length, expectedDebtEntries, 'exactly one entry for actual debt; no fabricated zero-debt entry');
    assert.equal(acquired.case.closing.verifiedDebt, pre.case.diligence.report.verifiedDebt);
    assert.equal(acquired.case.closing.hiddenLiabilities, pre.case.diligence.report.hiddenLiabilities);
    await page.waitForTimeout(1000); await page.screenshot({ path: path.join(out, 'acquired.png') });
    await page.getByRole('button', { name: 'Verified Save / Reload', exact: true }).click();
    await page.getByRole('button', { name: 'Target %', exact: true }).waitFor({ timeout: 120000 });
    const reloaded = await read('actual verified IndexedDB reload');
    assert.equal(reloaded.loadStatus, 'CURRENT', 'reload uses a verified current generation');
    assert.equal(reloaded.money, acquired.money); assert.deepEqual(reloaded.holdings, acquired.holdings); assert.equal(reloaded.energy, acquired.energy);
    assert.equal(reloaded.case.status, 'ACQUIRED'); assert.deepEqual(reloaded.debt.entries, acquired.debt.entries);
    for (let index = 0; index < 3; index++) {
      const prior = await read('before actual next week ' + index);
      await page.getByRole('button', { name: 'Advance Real Week', exact: true }).click();
      await page.waitForFunction(week => window.__stockFlow.snapshot()?.week !== week, prior.week, { timeout: 120000 });
      const next = await read('actual next week ' + index);
      assert.equal(next.businesses.filter(b => b.id === studio).length, 1);
      assert.equal(next.reminders.filter(e => e.data.relatedStudioId === studio).length, 0);
      assert.deepEqual(next.holdings, acquired.holdings, 'next weeks preserve shares and historical basis');
      assert.equal(next.debt.entries.filter(e => e.studioId === studio).length, expectedDebtEntries);
    }
    await page.setViewportSize({ width: 320, height: 568 });
    report.smallViewport = await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert.ok(report.smallViewport.scrollWidth <= report.smallViewport.width, 'small mobile viewport has no document overflow');
    await page.screenshot({ path: path.join(out, 'after-weeks-320.png') });
    assert.deepEqual(errors, []); report.status = 'PASSED'; console.log(`Stock acquisition full browser flow passed: ${studio} ${percent}% ${scenario}.`);
  } catch (error) {
    report.status = 'FAILED'; report.failure = String(error); report.body = (await page.locator('body').innerText()).slice(-7000);
    await page.screenshot({ path: path.join(out, 'failure.png') }); throw error;
  } finally { write(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
