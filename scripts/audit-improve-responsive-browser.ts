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
  name: 'Improve Browser Tester',
  money: 12_345,
  energy: { current: 58, max: 58 },
  flags: { ...INITIAL_PLAYER.flags, weeklyBaseEnergyRemaining: 58, bonusEnergyBank: 0 },
  stats: {
    ...INITIAL_PLAYER.stats,
    health: 77,
    body: 63,
    happiness: 73,
    looks: 61,
    skills: { ...INITIAL_PLAYER.stats.skills, charisma: 44, presence: 52, delivery: 37, memorization: 68, expression: 49, improvisation: 31, discipline: 56 },
    genreXP: { ...INITIAL_PLAYER.stats.genreXP, ACTION: 17, DRAMA: 92 },
  },
  writerStats: { creativity: 32, dialogue: 41, structure: 55, pacing: 38 },
  directorStats: { vision: 61, technical: 47, leadership: 53, style: 66 },
  commitments: [{
    id: 'course-live-1', name: 'Intro to Acting', nameKey: 'improve.workshop.ws_intro_acting', type: 'COURSE',
    energyCost: 15, income: 0, weeklyCost: 0, upfrontCost: 400, totalDuration: 4, weeksCompleted: 2,
    skillGains: { discipline: 0.2, memorization: 0.2 }, payoutType: 'WEEKLY',
  }],
};

const sameRow = (tops: number[], count: number) => tops.length === count && Math.max(...tops) - Math.min(...tops) <= 1;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const selectedViewports = process.env.IMPROVE_VIEWPORT
      ? VIEWPORTS.filter(viewport => viewport.label === process.env.IMPROVE_VIEWPORT)
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
      await page.getByText('Improve Browser Tester', { exact: true }).click();
      await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Improve"]').click();
      await page.locator('[data-ui="actor-empire-improve-overhaul"]').waitFor();
      await page.waitForTimeout(250);

      const base = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('[data-ui="actor-empire-improve-overhaul"]')!;
        const scroll = root.querySelector<HTMLElement>('.ae-scroll')!;
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]')!;
        const rect = root.getBoundingClientRect();
        const titleRect = root.querySelector<HTMLElement>('.ae-h1')!.getBoundingClientRect();
        const tabTops = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).map(item => Number(item.getBoundingClientRect().top.toFixed(1)));
        const conditionTops = Array.from(root.querySelectorAll<HTMLElement>('.si-cond .si-dial')).map(item => Number(item.getBoundingClientRect().top.toFixed(1)));
        return {
          viewportWidth: document.documentElement.clientWidth,
          rootLeft: Number(rect.left.toFixed(1)), rootRight: Number(rect.right.toFixed(1)), rootTop: Number(rect.top.toFixed(1)),
          documentScrollWidth: document.documentElement.scrollWidth,
          paddingTop: Number.parseFloat(getComputedStyle(scroll).paddingTop),
          navGap: Number((nav.getBoundingClientRect().top - rect.bottom).toFixed(1)),
          titleHeight: Number(titleRect.height.toFixed(1)),
          tabTops, conditionTops,
        };
      });
      assert.ok(base.rootLeft <= .5, `${viewport.label}: Improve must reach the left viewport edge`);
      assert.ok(base.rootRight >= base.viewportWidth - .5, `${viewport.label}: Improve must reach the right viewport edge`);
      assert.ok(base.rootTop <= .5, `${viewport.label}: Improve background must reach the top viewport edge`);
      assert.equal(base.documentScrollWidth, base.viewportWidth, `${viewport.label}: Improve must not overflow horizontally`);
      assert.ok(base.paddingTop >= 20, `${viewport.label}: Improve must keep at least 20px top clearance`);
      assert.ok(base.navGap >= 0 && base.navGap <= 24, `${viewport.label}: Improve must meet the navigation dock without an odd gap`);
      assert.ok(base.titleHeight <= 32, `${viewport.label}: Improve title must remain on one line`);
      assert.equal(sameRow(base.tabTops, 3), true, `${viewport.label}: all three destination tabs must remain on one row`);
      assert.equal(sameRow(base.conditionTops, 4), true, `${viewport.label}: all four condition dials must remain on one row`);

      await page.getByRole('tab', { name: /WORKSHOPS/ }).click();
      const disciplineTops = await page.locator('.si-rail .si-disc').evaluateAll(nodes => nodes.map(node => Number(node.getBoundingClientRect().top.toFixed(1))));
      assert.equal(sameRow(disciplineTops, 3), true, `${viewport.label}: all three disciplines must remain on one row`);
      await page.getByRole('tab', { name: /GENRE LAB/ }).click();
      const genreTops = await page.locator('.si-gen').evaluateAll(nodes => nodes.slice(0, 3).map(node => Number(node.getBoundingClientRect().top.toFixed(1))));
      assert.equal(sameRow(genreTops, 3), true, `${viewport.label}: genre board must remain three columns`);

      if (viewport.label === 'reference') {
        await page.getByRole('tab', { name: /WELLBEING/ }).click();
        assert.equal(await page.locator('.si-week-v').textContent(), '58Eavailable15E committed');
        await page.getByRole('button', { name: 'Cardio Session' }).click();
        assert.equal(await page.locator('.ae-sheet-wrap.is-open .si-scene').count(), 0, 'Improve action sheets must not render a stickman scene.');
        await page.getByRole('button', { name: 'Do it' }).click();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('.si-week-v').textContent(), '43Eavailable15E committed', 'Wellbeing must spend real player energy.');

        await page.getByRole('button', { name: 'Cancel Intro to Acting' }).click();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('.si-week-v').textContent(), '58Eavailable0E committed', 'Cancellation must restore real commitment capacity.');

        await page.getByRole('tab', { name: /WORKSHOPS/ }).click();
        await page.getByRole('button', { name: /ACTING/ }).click();
        await page.getByRole('button', { name: /Vocal Control/ }).click();
        await page.getByRole('button', { name: 'Enroll' }).click();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('.si-week-v').textContent(), '43Eavailable15E committed', 'Enrollment must reserve real weekly energy.');

        await page.getByRole('tab', { name: /GENRE LAB/ }).click();
        await page.getByRole('button', { name: /ACTION Stunt Choreography/ }).click();
        await page.getByRole('button', { name: 'Train genre' }).click();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('.si-week-v').textContent(), '33Eavailable15E committed', 'Genre training must spend real player energy.');
        await page.getByRole('button', { name: /ACTION Stunt Choreography/ }).scrollIntoViewIfNeeded();
        assert.match(await page.getByRole('button', { name: /ACTION Stunt Choreography/ }).textContent() || '', /18\/100/, 'Genre XP must update through the existing game handler.');
      }

      assert.deepEqual(errors, [], `${viewport.label}: browser must have no runtime errors`);
      await page.getByRole('tab', { name: /WELLBEING/ }).click();
      await page.waitForTimeout(650);
      await page.screenshot({ path: `/tmp/actor-empire-improve-${viewport.width}x${viewport.height}.png` });
      await page.close();
    }
    console.log(`Improve responsive browser audit passed across ${selectedViewports.length} phone viewport${selectedViewports.length === 1 ? '' : 's'}.`);
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
