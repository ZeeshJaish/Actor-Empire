/* Browser audit (23 Nov 2026): the Production House "Past projects" card.
   Player report: an Original ordered from the player's own studio read Average or Flop although it earns on the platform.
   The platform pays the whole production bill and the studio keeps no share of the viewing money, so the studio's own
   verdict on it is meaningless. An Original made for the player's own platform now shows an ORIGINAL badge and the
   studio's number is what the service paid. Every other card keeps its verdict.

   Needs a dev server for the repo (default http://127.0.0.1:3600, vite) and Playwright:
     PLAYWRIGHT_MODULE=/path/to/playwright-core BASE_URL=http://127.0.0.1:3600 node scripts/audit-studio-archive-original-verdict.cjs
   SHOTS_DIR=<dir> SHOTS_LABEL=<name> also saves the cards as <dir>/<name>-cards.png (the audit still runs and reports). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3600';
const URL = `${BASE_URL}/scripts/fixtures/studio-archive-card.html`;
const VERDICTS = ['BLOCKBUSTER', 'HIT', 'FLOP', 'AVERAGE'];

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, why: String(error.message || error).split('\n')[0] }); }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-case="own-full"]').waitFor({ timeout: 30000 });
    await page.waitForTimeout(600);
    const cards = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-case]')].map(cell => {
      const card = cell.querySelector('[role="button"]');
      const text = (card ? card.innerText : '').replace(/\s+/g, ' ').trim();
      const clipped = card ? [...card.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent.trim()) : [];
      const label = card ? card.getAttribute('aria-label') : null;
      return [cell.getAttribute('data-case'), { text, clipped, label }];
    })));

    for (const id of ['own-full', 'own-short', 'own-long']) {
      check(`${id}: shows ORIGINAL`, () => assert.match(cards[id].text, /ORIGINAL/));
      check(`${id}: no studio verdict`, () => VERDICTS.forEach(word => assert.ok(!cards[id].text.includes(word), `still says ${word}`)));
      check(`${id}: right tile is what the service paid`, () => { assert.match(cards[id].text, /Paid by service/i); assert.ok(!/Project Revenue/i.test(cards[id].text)); });
    }
    check('own-full: the paid amount is the budget ($40.0M)', () => assert.match(cards['own-full'].text, /Paid by service \$40\.0M/i));
    check('own-short: the paid amount is what the service paid ($36.0M), not the budget', () => assert.match(cards['own-short'].text, /Paid by service \$36\.0M/i));
    check('film-flop still says FLOP', () => assert.match(cards['film-flop'].text, /FLOP/));
    check('film-average still says AVERAGE', () => assert.match(cards['film-average'].text, /AVERAGE/));
    check('film-hit still says HIT', () => assert.match(cards['film-hit'].text, /\bHIT\b/));
    check('film-blockbuster still says BLOCKBUSTER', () => assert.match(cards['film-blockbuster'].text, /BLOCKBUSTER/));
    check('films keep Project Revenue and no ORIGINAL badge', () => ['film-flop', 'film-average', 'film-hit', 'film-blockbuster'].forEach(id => {
      assert.match(cards[id].text, /Project Revenue/i); assert.ok(!/ORIGINAL/.test(cards[id].text), `${id} shows ORIGINAL`);
    }));
    check('commission credit keeps Production Cap / Producer Fee and has no verdict', () => {
      assert.match(cards['ai-credit'].text, /Production Cap/i); assert.match(cards['ai-credit'].text, /Producer Fee/i);
      [...VERDICTS, 'ORIGINAL'].forEach(word => assert.ok(!cards['ai-credit'].text.includes(word), `shows ${word}`));
    });
    check('own cards: the button label names the badge, not a verdict', () => assert.match(cards['own-full'].label || '', /ORIGINAL/));
    check('no clipped text on any card', () => Object.entries(cards).forEach(([id, card]) => assert.deepEqual(card.clipped, [], `${id}: ${card.clipped.join(' | ')}`)));
    check('no page errors', () => assert.deepEqual(errors, []));

    if (process.env.SHOTS_DIR) {
      fs.mkdirSync(process.env.SHOTS_DIR, { recursive: true });
      await page.screenshot({ path: `${process.env.SHOTS_DIR}/${process.env.SHOTS_LABEL || 'cards'}-cards.png`, fullPage: true });
    }
    await page.close();
  } finally {
    await browser.close();
  }
  checks.forEach(item => console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.ok ? '' : `  (${item.why})`}`));
  const failed = checks.filter(item => !item.ok).length;
  console.log(failed ? `\n${failed} of ${checks.length} checks failed` : `\nStudio archive verdict audit passed (${checks.length} checks).`);
  process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
