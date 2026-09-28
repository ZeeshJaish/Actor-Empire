import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const PLAYWRIGHT_VIEWPORTS = [
  { label: 'narrow Android', width: 320, height: 740 },
  { label: 'Tecno-class', width: 360, height: 800 },
  { label: 'reference', width: 393, height: 852 },
  { label: 'Android Ultra', width: 412, height: 915 },
  { label: 'iPhone 15 Pro Max', width: 430, height: 932 },
  { label: 'wide phone', width: 448, height: 956 },
] as const;

const fixturePlayer = {
  ...INITIAL_PLAYER,
  name: 'Responsive Tester',
  avatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Felix',
  age: 27,
  currentWeek: 12,
  money: 2_450_000,
  energy: { current: 71, max: 100 },
  stats: {
    ...INITIAL_PLAYER.stats,
    health: 82,
    body: 64,
    happiness: 76,
    looks: 68,
    talent: 43,
    experience: 37,
    reputation: 55,
    fame: 49,
  },
  logs: [
    { week: 12, year: 27, message: 'Signed a new lead role.', type: 'positive' },
    { week: 11, year: 27, message: 'Wrapped a supporting role.', type: 'neutral' },
  ],
};

const sameRow = (tops: number[], expectedCount: number) => (
  tops.length === expectedCount && Math.max(...tops) - Math.min(...tops) <= 1
);
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const selectedViewports = process.env.HOME_VIEWPORT
      ? PLAYWRIGHT_VIEWPORTS.filter(viewport => viewport.label === process.env.HOME_VIEWPORT)
      : PLAYWRIGHT_VIEWPORTS;
    for (const viewport of selectedViewports) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));

      const playerForViewport = viewport.width === 320
        ? { ...fixturePlayer, name: 'Alexandria Catherine Montgomery-Winslow' }
        : fixturePlayer;

      await page.addInitScript(({ player }) => {
        localStorage.clear();
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
        localStorage.setItem('aeMigrationCarePackageLedgerV1', JSON.stringify({ globalClaimed: true, fingerprints: [] }));
        localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
        localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({
          playerName: player.name,
          age: player.age,
          week: player.currentWeek,
          fame: player.stats.fame,
          totalPlayTimeMs: 0,
          savedAt: Date.now(),
        }));
      }, { player: playerForViewport });

      await page.goto('http://127.0.0.1:5178/', { waitUntil: 'domcontentloaded' });
      await page.locator('#startBtn').click();
      await page.getByText(playerForViewport.name, { exact: true }).click();
      await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();
      await page.waitForTimeout(900);

      const metrics = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('[data-ui="actor-empire-home-overhaul"]');
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]');
        const scroll = document.querySelector<HTMLElement>('.ae-scroll');
        const sections = Array.from(document.querySelectorAll<HTMLElement>('.ae-sec'));
        if (!root || !nav || !scroll || sections.length < 3) {
          throw new Error('Required Home layout elements are missing.');
        }

        const rect = root.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        const tileTops = sections.map(section => (
          Array.from(section.querySelectorAll<HTMLElement>('.ae-tile'))
            .map(tile => Number(tile.getBoundingClientRect().top.toFixed(1)))
        ));
        const before = scroll.scrollTop;
        scroll.scrollTo(0, 100);
        const after = scroll.scrollTop;
        scroll.scrollTo(0, 0);

        return {
          viewportWidth: document.documentElement.clientWidth,
          rootLeft: Number(rect.left.toFixed(1)),
          rootRight: Number(rect.right.toFixed(1)),
          rootWidth: Number(rect.width.toFixed(1)),
          rootTop: Number(rect.top.toFixed(1)),
          rootScrollWidth: root.scrollWidth,
          rootClientWidth: root.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          paddingTop: Number.parseFloat(getComputedStyle(scroll).paddingTop),
          navGap: Number((navRect.top - rect.bottom).toFixed(1)),
          tileTops,
          conditionColumns: (() => {
            const condition = root.querySelector<HTMLElement>('.ae-sec .ae-tiles');
            return condition ? getComputedStyle(condition).gridTemplateColumns.split(' ').length : 0;
          })(),
          wrappedConditionLabels: Array.from(sections[0].querySelectorAll<HTMLElement>('.ae-tile-n'))
            .filter(label => label.getBoundingClientRect().height > Number.parseFloat(getComputedStyle(label).lineHeight) + 1)
            .map(label => label.textContent),
          clippedLabels: Array.from(root.querySelectorAll<HTMLElement>('.ae-tile-n')).filter(label => label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1).map(label => label.textContent),
          nameClipped: (() => {
            const name = root.querySelector<HTMLElement>('.ae-name');
            return !!name && (name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1);
          })(),
          toolBounds: Array.from(root.querySelectorAll<HTMLElement>('.ae-tools button')).map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
          avatarBounds: (() => {
            const avatar = root.querySelector<HTMLElement>('.ae-port');
            const avatarRect = avatar?.getBoundingClientRect();
            return avatarRect ? { width: avatarRect.width, height: avatarRect.height } : null;
          })(),
          scrollBefore: before,
          scrollAfter: after,
          scrollContentHeight: scroll.scrollHeight,
          scrollClientHeight: scroll.clientHeight,
          overflowers: Array.from(root.querySelectorAll<HTMLElement>('*')).flatMap(element => {
            const elementRect = element.getBoundingClientRect();
            return elementRect.left < rect.left - 0.5 || elementRect.right > rect.right + 0.5
              ? [{
                  className: element.className || element.tagName,
                  left: Number(elementRect.left.toFixed(1)),
                  right: Number(elementRect.right.toFixed(1)),
                  width: Number(elementRect.width.toFixed(1)),
                }]
              : [];
          }).slice(0, 12),
          avatarSrc: root.querySelector<HTMLImageElement>('.ae-port-art img')?.src || '',
        };
      });

      assert.equal(metrics.conditionColumns, 4, `${viewport.label}: signature Condition group must remain four-across`);
      assert.equal(sameRow(metrics.tileTops[0], 4), true, `${viewport.label}: all four Condition tiles must stay in one row`);
      assert.deepEqual(metrics.wrappedConditionLabels, [], `${viewport.label}: Condition labels must remain on one line`);
      assert.ok(metrics.rootLeft <= 0.5, `${viewport.label}: Home must reach the left viewport edge`);
      assert.ok(metrics.rootRight >= metrics.viewportWidth - 0.5, `${viewport.label}: Home must reach the right viewport edge`);
      assert.ok(metrics.rootTop <= 0.5, `${viewport.label}: Home background must reach the top viewport edge`);
      if (metrics.documentScrollWidth !== metrics.viewportWidth) {
        console.error(`${viewport.label} overflow evidence:`, metrics.overflowers);
      }
      assert.equal(metrics.documentScrollWidth, metrics.viewportWidth, `${viewport.label}: Home must not overflow horizontally`);
      assert.ok(metrics.paddingTop >= 20, `${viewport.label}: Home must keep at least 20px top clearance`);
      assert.ok(metrics.navGap >= 0 && metrics.navGap <= 24, `${viewport.label}: Home must meet the navigation dock without an odd gap`);
      assert.equal(sameRow(metrics.tileTops[1], 2), true, `${viewport.label}: Skills must remain two columns`);
      assert.equal(sameRow(metrics.tileTops[2], 2), true, `${viewport.label}: Status must remain two columns`);
      assert.deepEqual(metrics.clippedLabels, [], `${viewport.label}: stat labels must remain readable`);
      assert.equal(metrics.nameClipped, false, `${viewport.label}: player name must not be truncated`);
      assert.ok(metrics.toolBounds.length === 2 && metrics.toolBounds.every(button => button.width >= 44 && button.height >= 44), `${viewport.label}: Store and Settings targets must be at least 44×44`);
      assert.ok(metrics.avatarBounds && metrics.avatarBounds.width >= 44 && metrics.avatarBounds.height >= 44, `${viewport.label}: avatar target must be at least 44×44`);
      if (metrics.scrollContentHeight > metrics.scrollClientHeight + 1) {
        assert.ok(metrics.scrollAfter > metrics.scrollBefore, `${viewport.label}: overflowing content must retain vertical scrolling`);
      }
      assert.ok(metrics.avatarSrc.startsWith('data:image/'), `${viewport.label}: Home must render the shared local profile portrait`);
      assert.ok(!metrics.avatarSrc.includes('api.dicebear.com'), `${viewport.label}: Home must not render the retired DiceBear portrait`);
      assert.deepEqual(errors, [], `${viewport.label}: browser console must have no runtime errors`);

      await page.screenshot({ path: `/tmp/actor-empire-home-${viewport.width}x${viewport.height}.png` });

      if (viewport.label === 'reference') {
        await page.locator('.ae-tools button[aria-label="Store"]').click();
        await page.locator('[data-ui="actor-empire-store-overhaul"]').waitFor();
        await page.getByRole('button', { name: 'Back to Home' }).click();
        await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();
        await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Mobile"]').click();
        await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();
        await page.locator('[data-tutorial-id="mobile-forbes-app"]').click();
        await page.getByRole('heading', { name: 'FORBES' }).waitFor();
        const playerRow = page.locator('div.flex.items-center.gap-4.p-4', { hasText: fixturePlayer.name });
        const forbesAvatarSrc = await playerRow.locator('img').first().getAttribute('src');
        assert.ok(forbesAvatarSrc?.startsWith('data:image/'), 'Forbes must render the shared local player profile portrait');
        assert.ok(!forbesAvatarSrc?.includes('api.dicebear.com'), 'Forbes must not render the retired DiceBear portrait');
        await page.screenshot({ path: '/tmp/actor-empire-forbes-profile-migration.png' });
      }
      await page.close();
    }

    console.log(`Home responsive browser audit passed across ${selectedViewports.length} phone viewport${selectedViewports.length === 1 ? '' : 's'}.`);
  } finally {
    await browser.close();
  }
})().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
