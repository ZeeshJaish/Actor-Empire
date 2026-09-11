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
  name: 'Career Browser Tester',
  age: 27,
  currentWeek: 12,
  energy: { current: 64, max: 100 },
  flags: { ...INITIAL_PLAYER.flags, weeklyBaseEnergyRemaining: 64, bonusEnergyBank: 0 },
  commitments: [
    { id: 'audition-1', name: 'Neon Hearts', type: 'ACTING_GIG', roleType: 'LEAD', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'AUDITION', phaseWeeksLeft: 2, auditionPerformance: 44 },
    { id: 'promo-1', name: 'Last Light', type: 'ACTING_GIG', roleType: 'SUPPORTING', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'POST_PRODUCTION', phaseWeeksLeft: 6, promotionalBuzz: 61, lastPressAbsolute: (27 * 52) + 11 },
    { id: 'slate-1', name: 'Tomorrow City', type: 'ACTING_GIG', roleType: 'CAMEO', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'SCHEDULED', phaseWeeksLeft: 30, projectDetails: { subtype: 'FEATURE_FILM' } },
  ],
  applications: [{ id: 'app-1', type: 'AUDITION', name: 'Blue Hour', weeksRemaining: 3, data: {} }],
};

const sameRow = (tops: number[], count: number) => tops.length === count && Math.max(...tops) - Math.min(...tops) <= 1;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const selectedViewports = process.env.CAREER_VIEWPORT
      ? VIEWPORTS.filter(viewport => viewport.label === process.env.CAREER_VIEWPORT)
      : VIEWPORTS;
    for (const viewport of selectedViewports) {
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
      await page.getByText('Career Browser Tester', { exact: true }).click();
      await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Career"]').click();
      await page.locator('[data-ui="actor-empire-career-overhaul"]').waitFor();
      await page.waitForTimeout(300);
      if (viewport.label === 'reference') {
        const beforeEnergy = await page.locator('.cr-budget-v').textContent();
        await page.locator('.cr-ready').first().click();
        await page.waitForTimeout(800);
        const afterEnergy = await page.locator('.cr-budget-v').textContent();
        assert.equal(beforeEnergy, '64Eavailable this week', 'Reference fixture must begin with 64E.');
        assert.equal(afterEnergy, '44Eavailable this week', 'Rehearsal must spend 20E through the existing game handler.');
      }

      const metrics = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('[data-ui="actor-empire-career-overhaul"]')!;
        const scroll = root.querySelector<HTMLElement>('.ae-scroll')!;
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]')!;
        const rect = root.getBoundingClientRect();
        const slateTops = Array.from(root.querySelectorAll<HTMLElement>('.cr-fld')).slice(0, 3).map(item => Number(item.getBoundingClientRect().top.toFixed(1)));
        const promoTops = Array.from(root.querySelectorAll<HTMLElement>('.cr-pm')).map(item => Number(item.getBoundingClientRect().top.toFixed(1)));
        const before = scroll.scrollTop;
        scroll.scrollTo(0, 150);
        const after = scroll.scrollTop;
        return {
          viewportWidth: document.documentElement.clientWidth,
          rootLeft: Number(rect.left.toFixed(1)),
          rootRight: Number(rect.right.toFixed(1)),
          rootTop: Number(rect.top.toFixed(1)),
          documentScrollWidth: document.documentElement.scrollWidth,
          paddingTop: Number.parseFloat(getComputedStyle(scroll).paddingTop),
          navGap: Number((nav.getBoundingClientRect().top - rect.bottom).toFixed(1)),
          slateTops,
          promoTops,
          scrollBefore: before,
          scrollAfter: after,
        };
      });

      assert.ok(metrics.rootLeft <= 0.5, `${viewport.label}: Career must reach the left viewport edge`);
      assert.ok(metrics.rootRight >= metrics.viewportWidth - 0.5, `${viewport.label}: Career must reach the right viewport edge`);
      assert.ok(metrics.rootTop <= 0.5, `${viewport.label}: Career background must reach the top viewport edge`);
      assert.equal(metrics.documentScrollWidth, metrics.viewportWidth, `${viewport.label}: Career must not overflow horizontally`);
      assert.ok(metrics.paddingTop >= 20, `${viewport.label}: Career must keep at least 20px top clearance`);
      assert.ok(metrics.navGap >= 0 && metrics.navGap <= 24, `${viewport.label}: Career must meet the navigation dock without an odd gap`);
      assert.equal(sameRow(metrics.slateTops, 3), true, `${viewport.label}: schedule must remain three columns`);
      assert.equal(sameRow(metrics.promoTops, 3), true, `${viewport.label}: promo actions must remain three columns`);
      assert.ok(metrics.scrollAfter > metrics.scrollBefore, `${viewport.label}: Career content must scroll inside its surface`);
      assert.deepEqual(errors, [], `${viewport.label}: browser must have no runtime errors`);
      await page.locator('[data-ui="actor-empire-career-overhaul"] .ae-scroll').evaluate((element: HTMLElement) => element.scrollTo(0, 0));
      await page.screenshot({ path: `/tmp/actor-empire-career-${viewport.width}x${viewport.height}.png` });
      await page.close();
    }
    console.log(`Career responsive browser audit passed across ${selectedViewports.length} phone viewport${selectedViewports.length === 1 ? '' : 's'}.`);
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
