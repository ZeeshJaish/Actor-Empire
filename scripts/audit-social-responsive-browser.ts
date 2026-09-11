import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Relationship } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const VIEWPORTS = [
  { label: 'narrow Android', width: 320, height: 740 },
  { label: 'Tecno-class', width: 360, height: 800 },
  { label: 'reference', width: 393, height: 852 },
  { label: 'Android Ultra', width: 412, height: 915 },
  { label: 'iPhone 15 Pro Max', width: 430, height: 932 },
] as const;

const relationship = (overrides: Partial<Relationship>): Relationship => ({
  id: 'contact', name: 'Contact', relation: 'Friend', closeness: 50, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=LegacyContact', lastInteractionWeek: 1, ...overrides,
} as Relationship);
const currentAbsoluteWeek = getAbsoluteWeek(40, 20);

const fixturePlayer = {
  ...INITIAL_PLAYER,
  name: 'Social Browser Tester',
  age: 40,
  currentWeek: 20,
  money: 20_000,
  energy: { current: 70, max: 100 },
  flags: { ...INITIAL_PLAYER.flags, weeklyBaseEnergyRemaining: 70, bonusEnergyBank: 0 },
  relationships: [
    relationship({ id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: 55, lastInteractionWeek: 1, lastInteractionAbsolute: currentAbsoluteWeek - 19, age: 64 }),
    relationship({ id: 'partner', name: 'Sam', relation: 'Partner', closeness: 92, lastInteractionWeek: 19, lastInteractionAbsolute: currentAbsoluteWeek - 1, age: 39 }),
    relationship({ id: 'child', name: 'Ari', relation: 'Child', closeness: 80, lastInteractionWeek: 18, lastInteractionAbsolute: currentAbsoluteWeek - 2, age: 20 }),
    relationship({ id: 'pet', name: 'Pixel', relation: 'Pet', closeness: 71, lastInteractionWeek: 17, lastInteractionAbsolute: currentAbsoluteWeek - 3, petSpecies: 'Dog', petEmoji: '🐕', petRarity: 'common' }),
  ],
};

const sameRow = (tops: number[], count: number) => tops.length === count && Math.max(...tops) - Math.min(...tops) <= 1;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const selected = process.env.SOCIAL_VIEWPORT ? VIEWPORTS.filter(viewport => viewport.label === process.env.SOCIAL_VIEWPORT) : VIEWPORTS;
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
      await page.getByText('Social Browser Tester', { exact: true }).click();
      await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Social"]').click();
      await page.locator('[data-ui="actor-empire-social-overhaul"]').waitFor();
      await page.waitForTimeout(250);

      const layout = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('[data-ui="actor-empire-social-overhaul"]')!;
        const scroll = root.querySelector<HTMLElement>('.ae-scroll')!;
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]')!;
        const rect = root.getBoundingClientRect();
        const tabTops = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).map(item => Number(item.getBoundingClientRect().top.toFixed(1)));
        return {
          viewportWidth: document.documentElement.clientWidth,
          rootLeft: Number(rect.left.toFixed(1)), rootRight: Number(rect.right.toFixed(1)), rootTop: Number(rect.top.toFixed(1)),
          documentScrollWidth: document.documentElement.scrollWidth,
          paddingTop: Number.parseFloat(getComputedStyle(scroll).paddingTop),
          navGap: Number((nav.getBoundingClientRect().top - rect.bottom).toFixed(1)),
          tabTops,
        };
      });
      assert.ok(layout.rootLeft <= .5, `${viewport.label}: Social must reach the left viewport edge`);
      assert.ok(layout.rootRight >= layout.viewportWidth - .5, `${viewport.label}: Social must reach the right viewport edge`);
      assert.ok(layout.rootTop <= .5, `${viewport.label}: Social background must reach the top viewport edge`);
      assert.equal(layout.documentScrollWidth, layout.viewportWidth, `${viewport.label}: Social must not overflow horizontally`);
      assert.ok(layout.paddingTop >= 20, `${viewport.label}: Social must keep at least 20px top clearance`);
      assert.ok(layout.navGap >= 0 && layout.navGap <= 24, `${viewport.label}: Social must meet the navigation dock without an odd gap`);
      assert.equal(sameRow(layout.tabTops, 2), true, `${viewport.label}: both Social destinations must stay on one row`);
      const momAvatarSrc = await page.getByRole('button', { name: 'Open Mom' }).locator('.cx-face img').getAttribute('src');
      assert.ok(momAvatarSrc?.startsWith('data:image/'), `${viewport.label}: Mom must render through the shared local profile system`);
      assert.ok(!momAvatarSrc?.includes('api.dicebear.com'), `${viewport.label}: Mom must not render the retired DiceBear portrait`);

      if (viewport.label === 'reference') {
        await page.getByRole('button', { name: 'Open Mom' }).click();
        const moveTops = await page.locator('.ae-sheet-wrap.is-open .cx-move').evaluateAll(nodes => nodes.slice(0, 2).map(node => Number(node.getBoundingClientRect().top.toFixed(1))));
        assert.equal(sameRow(moveTops, 2), true, 'Social action sheet must keep two action columns.');
        await page.getByRole('button', { name: 'Check In', exact: true }).click();
        await page.waitForTimeout(250);
        const momRow = page.locator('.cx-row').filter({ hasText: 'Mom' });
        assert.equal(await momRow.locator('.cx-row-v').textContent(), '56', 'Social action must update the real relationship bond.');
        await momRow.click();
        assert.match(await page.locator('.ae-sheet-wrap.is-open .ae-sec').last().textContent() || '', /67E/, 'Social action must spend real player energy.');
        await page.locator('.ae-sheet-wrap.is-open').getByRole('button', { name: 'Close' }).click();
        await page.getByRole('tab', { name: /LEGACY/ }).click();
        await page.getByRole('button', { name: 'Continue as Ari' }).click();
        await page.getByRole('button', { name: /Confirm legacy shift/ }).waitFor();
        await page.locator('.ae-sheet-wrap.is-open').getByRole('button', { name: 'Close' }).click();
      }

      assert.deepEqual(errors, [], `${viewport.label}: browser must have no runtime errors`);
      const connectionsTab = page.getByRole('tab', { name: /CONNECTIONS/ });
      if (await connectionsTab.getAttribute('aria-selected') !== 'true') await connectionsTab.click();
      await page.locator('[data-ui="actor-empire-social-overhaul"] .ae-scroll').evaluate(node => { node.scrollTop = 0; });
      await page.waitForTimeout(450);
      await page.screenshot({ path: `/tmp/actor-empire-social-${viewport.width}x${viewport.height}.png` });
      await page.close();
    }
    console.log(`Social responsive browser audit passed across ${selected.length} phone viewport${selected.length === 1 ? '' : 's'}.`);
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
