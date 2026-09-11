import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const VIEWPORTS = [
  { label: 'narrow Android', width: 320, height: 740 },
  { label: 'Tecno-class', width: 360, height: 800 },
  { label: 'reference', width: 393, height: 852 },
  { label: 'Android Ultra', width: 412, height: 915 },
  { label: 'iPhone 15 Pro Max', width: 430, height: 932 },
] as const;

const fixturePlayer = {
  ...INITIAL_PLAYER,
  name: 'Lifestyle Browser Tester',
  money: 123_456,
  assets: [],
  businesses: [],
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const selected = process.env.LIFESTYLE_VIEWPORT
      ? VIEWPORTS.filter(viewport => viewport.label === process.env.LIFESTYLE_VIEWPORT)
      : VIEWPORTS;

    for (const viewport of selected) {
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      await page.addInitScript(({ player }) => {
        localStorage.clear();
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
        localStorage.setItem('aeMigrationCarePackageLedgerV1', JSON.stringify({ globalClaimed: true, fingerprints: [] }));
        localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
        localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({ playerName: player.name, age: player.age, week: player.currentWeek, fame: player.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now() }));
      }, { player: fixturePlayer });
      await page.goto('http://127.0.0.1:5178/', { waitUntil: 'domcontentloaded' });
      await page.locator('#startBtn').click();
      await page.getByText('Lifestyle Browser Tester', { exact: true }).click();
      await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Lifestyle"]').click();
      await page.locator('[data-ui="actor-empire-lifestyle-overhaul"]').waitFor();
      await page.waitForTimeout(250);

      const layout = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('[data-ui="actor-empire-lifestyle-overhaul"]')!;
        const scroll = root.querySelector<HTMLElement>('.ae-scroll')!;
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]')!;
        const card = root.querySelector<HTMLElement>('.mc-card')!;
        const rect = root.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const rows = Array.from(root.querySelectorAll<HTMLElement>('.lf-row')).map(row => {
          const rowRect = row.getBoundingClientRect();
          return { left: rowRect.left, right: rowRect.right, width: rowRect.width };
        });
        return {
          viewportWidth: document.documentElement.clientWidth,
          rootLeft: Number(rect.left.toFixed(1)),
          rootRight: Number(rect.right.toFixed(1)),
          rootTop: Number(rect.top.toFixed(1)),
          documentScrollWidth: document.documentElement.scrollWidth,
          paddingTop: Number.parseFloat(getComputedStyle(scroll).paddingTop),
          navGap: Number((nav.getBoundingClientRect().top - rect.bottom).toFixed(1)),
          cardRatio: cardRect.width / cardRect.height,
          rows,
        };
      });

      assert.ok(layout.rootLeft <= .5, `${viewport.label}: Lifestyle must reach the left viewport edge`);
      assert.ok(layout.rootRight >= layout.viewportWidth - .5, `${viewport.label}: Lifestyle must reach the right viewport edge`);
      assert.ok(layout.rootTop <= .5, `${viewport.label}: Lifestyle background must reach the top viewport edge`);
      assert.equal(layout.documentScrollWidth, layout.viewportWidth, `${viewport.label}: Lifestyle must not overflow horizontally`);
      assert.ok(layout.paddingTop >= 20, `${viewport.label}: Lifestyle must keep at least 20px top clearance`);
      assert.ok(layout.navGap >= 0 && layout.navGap <= 24, `${viewport.label}: Lifestyle must meet the navigation dock without an odd gap`);
      assert.ok(Math.abs(layout.cardRatio - 1.586) <= .03, `${viewport.label}: finance card must preserve its design ratio`);
      assert.equal(layout.rows.length, 6, `${viewport.label}: all six Lifestyle destinations must render`);
      assert.ok(layout.rows.every(row => row.left >= 0 && row.right <= layout.viewportWidth && row.width > 250), `${viewport.label}: destination rows must remain full-width and inside the viewport`);

      await page.getByRole('button', { name: 'Show the breakdown on the back' }).click();
      await page.locator('.mc-card.is-back').waitFor();
      assert.match(await page.locator('.mc-card.is-back').textContent() || '', /ASSETS.*EQUITY/s, `${viewport.label}: finance breakdown must remain available`);

      await page.getByRole('button', { name: 'Show the front of the card' }).click();
      await page.locator('.mc-card:not(.is-back)').waitFor();
      await page.locator('[data-ui="actor-empire-lifestyle-overhaul"] .ae-scroll').evaluate(node => { node.scrollTop = 0; });
      await page.waitForTimeout(450);
      await page.screenshot({ path: `/tmp/actor-empire-lifestyle-${viewport.width}x${viewport.height}.png` });

      if (viewport.label === 'reference') {
        await page.getByRole('button', { name: 'Assets', exact: true }).click();
        await page.getByRole('heading', { name: /My Assets/i }).waitFor();
        assert.equal(await page.locator('[data-ui="actor-empire-lifestyle-overhaul"]').count(), 0, 'Assets must open the existing real Lifestyle flow.');
        assert.equal(await page.locator('nav[aria-label="Primary game navigation"]').count(), 0, 'Deep Lifestyle flows must hide the app navigation.');
      }

      assert.deepEqual(errors, [], `${viewport.label}: browser must have no runtime errors`);
      await page.close();
    }
    console.log(`Lifestyle responsive browser audit passed across ${selected.length} phone viewport${selected.length === 1 ? '' : 's'}.`);
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
