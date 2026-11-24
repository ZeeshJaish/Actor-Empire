/* Browser audit (24 Nov 2026): the project dashboard of a show the player made for another platform (a commission).
   Player report (X, Red): a Disney+ commission showed a red "Substantial loss" and -$176.9M. Disney+ pays for the
   production (up to its cap) and pays the studio a producer fee, so the studio has no loss; the page treated the show as a
   film the studio paid for and released in cinemas. Same page also said "Box Office Flop", "ROI -100%", "Run Week 1",
   "Released" and "struggles at the box office" about a show that had not premiered.
   The dashboard of a commission now says what it is: Made for <platform>, the cap, the producer fee, your cash at risk $0,
   and where it stands with the platform (Awaiting Release, Planned Release or Streaming). Films and your own platform-funded
   shows keep their financial pages.

   Needs a dev server for the repo (default http://127.0.0.1:3600, vite) and Playwright:
     PLAYWRIGHT_MODULE=/path/to/playwright-core BASE_URL=http://127.0.0.1:3600 node scripts/audit-commission-dashboard.cjs
   SHOTS_DIR=<dir> SHOTS_LABEL=<name> also saves every case at 390 and 1280 wide as <dir>/<name>-<case>-<width>.png
   (the audit still runs and reports). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3600';
const pageUrl = id => `${BASE_URL}/scripts/fixtures/commission-dashboard.html?case=${id}`;

const CREDITS = ['credit-waiting', 'credit-dated', 'credit-live', 'credit-big-deal'];
const CONTROLS = ['film-flop', 'own-funded-series'];
const WIDTHS = [320, 390, 430, 1280];
const SHOT_WIDTHS = [390, 1280];
const HEIGHT = { 320: 3800, 390: 3300, 430: 3100, 1280: 2700 };

/* what a commission must never say: it is not a film the studio paid for, and it has not run in cinemas */
const FALSE_ON_A_COMMISSION = [
  ['a loss verdict', /substantial loss|loss to date|collected project profit|project financial report/],
  ['a box-office verdict', /box office flop|box office hit|blockbuster|average performer/],
  ['studio ROI', /\broi\b/],
  ['the whole cost as studio cash at risk', /studio cash at risk/],
  ['a cinema run or cinema news', /run week|cinema audience insights|struggles at the box office|receives mixed reviews/],
  ['film revenue tiles', /project revenue|studio receipts/],
];

const EXPECT = {
  'credit-waiting': { platform: 'disney+', cap: /\$176\.9m/, fee: /\$12\.0m/, phase: 'awaiting release', caption: 'date not set', journey: '7 / 11' },
  'credit-dated': { platform: 'disney+', cap: /\$176\.9m/, fee: /\$12\.0m/, phase: 'planned release', caption: /^in 4 weeks$/, journey: '8 / 11' },
  'credit-live': { platform: 'disney+', cap: /\$176\.9m/, fee: /\$12\.0m/, phase: 'streaming', caption: 'on disney+', journey: '11 / 11' },
  'credit-big-deal': { platform: 'paramount+', cap: /\$412\.5m/, fee: /\$61\.\d+m/, phase: 'awaiting release', caption: 'date not set', journey: '7 / 11' },
};

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, why: String(error.message || error).split('\n')[0] }); }
};
const matches = (value, expected) => (expected instanceof RegExp ? expected.test(value) : value === expected);

/* runs in the page */
const readPage = () => {
  const norm = value => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const leaves = [...document.querySelectorAll('body *')].filter(el => el.children.length === 0 && el.textContent.trim());
  const leafTexts = leaves.map(el => norm(el.textContent));
  const briefing = document.querySelector('[data-commission-briefing]');
  const clippedIn = root => (root ? [...root.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent.trim()) : []);
  /* the words this change puts in the stage tiles. "Production cap" is left out: it is the old "Production Cost" label, whose
     first word (PRODUCTION) is 7px wider than a 320px phone's half-width tile in every dashboard; it spills into the tile's padding, not out of it. */
  const watched = /^(awaiting release|planned release|streaming|date not set|delivered|in \d+ weeks?|on [a-z+ ]+)$/;
  const tileClipped = leaves.filter(el => watched.test(norm(el.textContent)) && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent.trim());
  /* the money in the tiles and the briefing. On a phone (320 to 430) none of it may be cut; on a 1024+ screen the four-up tiles of
     every dashboard cut a $100M+ number ($176.9M shows as "$176.9..."), which this change leaves alone (the briefing shows it in full). */
  const moneyClipped = leaves.filter(el => /^\$[\d.,]+[kmbt]$/.test(norm(el.textContent)) && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent.trim());
  const scroller = document.querySelector('.custom-scrollbar');
  return {
    text: norm(document.body.innerText),
    leafTexts,
    hasBriefing: Boolean(briefing),
    briefingText: briefing ? norm(briefing.innerText) : '',
    briefingClipped: clippedIn(briefing),
    tileClipped,
    moneyClipped,
    pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    scrollerOverflow: scroller ? scroller.scrollWidth - scroller.clientWidth : 0,
    bottom: Math.max(0, ...leaves.map(el => el.getBoundingClientRect().bottom)),
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const pages = {};
  try {
    for (const id of [...CREDITS, ...CONTROLS]) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: SHOT_WIDTHS.includes(width) ? 1.5 : 1, reducedMotion: 'reduce' });
        page.on('pageerror', error => errors.push(`${id}@${width}: ${error.message}`));
        await page.goto(pageUrl(id), { waitUntil: 'domcontentloaded', timeout: 90000 });
        /* the wrapper has no size of its own (the dashboard is position: fixed), so wait for it to exist, not to be visible */
        await page.locator('[data-case]').waitFor({ state: 'attached', timeout: 90000 });
        await page.waitForFunction(() => document.body.innerText.length > 300, null, { timeout: 90000 });
        await page.waitForTimeout(700);
        const data = await page.evaluate(readPage);
        pages[`${id}@${width}`] = data;
        if (process.env.SHOTS_DIR && SHOT_WIDTHS.includes(width)) {
          fs.mkdirSync(process.env.SHOTS_DIR, { recursive: true });
          await page.screenshot({
            path: `${process.env.SHOTS_DIR}/${process.env.SHOTS_LABEL || 'shot'}-${id}-${width}.png`,
            clip: { x: 0, y: 0, width, height: Math.min(HEIGHT[width], Math.ceil(data.bottom) + 70) },
          });
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  for (const id of CREDITS) {
    const want = EXPECT[id];
    for (const width of WIDTHS) {
      const page = pages[`${id}@${width}`];
      const at = `${id} @${width}`;
      for (const [label, pattern] of FALSE_ON_A_COMMISSION) {
        check(`${at}: does not show ${label}`, () => assert.ok(!pattern.test(page.text), `page says "${(page.text.match(pattern) || [''])[0]}"`));
      }
      check(`${at}: says Made for ${want.platform} with its cap, producer fee and $0 cash at risk`, () => {
        assert.ok(page.hasBriefing, 'no commission briefing on the page');
        assert.ok(page.briefingText.includes(`made for ${want.platform}`), `briefing says: ${page.briefingText.slice(0, 80)}`);
        assert.match(page.briefingText, want.cap, 'cap missing');
        assert.match(page.briefingText, want.fee, 'producer fee missing');
        assert.match(page.briefingText, /your cash at risk \$0(?![\d.,])/, 'cash at risk is not $0');
      });
      check(`${at}: stage reads ${want.phase} / ${want.caption}`, () => {
        assert.ok(page.leafTexts.includes(want.phase), `no "${want.phase}" on the page`);
        assert.ok(page.leafTexts.some(item => matches(item, want.caption)), `no "${want.caption}" on the page`);
      });
      check(`${at}: the tile says Delivered, not Release`, () => {
        assert.ok(page.leafTexts.includes('delivered'), 'no Delivered label');
        assert.ok(!page.leafTexts.includes('release'), 'a "Release" tile label is still there');
      });
      check(`${at}: production journey counter is ${want.journey}`, () => assert.ok(page.text.includes(want.journey), `journey says ${(page.text.match(/\d+ \/ 11/) || ['none'])[0]}`));
      check(`${at}: no clipped text in the briefing or the stage tiles`, () => { assert.deepEqual(page.briefingClipped, []); assert.deepEqual(page.tileClipped, []); });
      if (width <= 430) check(`${at}: no cut money figure on a phone`, () => assert.deepEqual(page.moneyClipped, []));
      check(`${at}: no sideways scroll`, () => { assert.ok(page.pageOverflow <= 1, `page ${page.pageOverflow}px wider`); assert.ok(page.scrollerOverflow <= 1, `content ${page.scrollerOverflow}px wider`); });
    }
  }
  for (const width of WIDTHS) {
    const flop = pages[`film-flop@${width}`];
    check(`film-flop @${width}: a film that lost money keeps its verdict, report and ROI`, () => {
      assert.ok(flop.text.includes('box office flop'), 'no Box Office Flop');
      assert.ok(flop.text.includes('project financial report'), 'no financial report');
      assert.match(flop.text, /\broi\b/);
      assert.ok(!flop.hasBriefing && !flop.text.includes('made for'), 'a film shows the commission briefing');
    });
    for (const id of CONTROLS) {
      const control = pages[`${id}@${width}`];
      check(`${id} @${width}: no sideways scroll`, () => { assert.ok(control.pageOverflow <= 1, `page ${control.pageOverflow}px wider`); assert.ok(control.scrollerOverflow <= 1, `content ${control.scrollerOverflow}px wider`); });
    }
    const own = pages[`own-funded-series@${width}`];
    check(`own-funded-series @${width}: your own platform-funded show keeps its deal briefing`, () => {
      assert.ok(own.text.includes('deal briefing'), 'no deal briefing');
      assert.ok(own.text.includes('no cash at risk'), 'no "No cash at risk"');
      assert.ok(!own.hasBriefing && !own.text.includes('made for'), 'it shows the commission briefing');
    });
  }
  check('no page errors', () => assert.deepEqual(errors, []));

  checks.forEach(item => console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.ok ? '' : `  (${item.why})`}`));
  const failed = checks.filter(item => !item.ok).length;
  console.log(failed ? `\n${failed} of ${checks.length} checks failed` : `\nCommission dashboard audit passed (${checks.length} checks).`);
  process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
