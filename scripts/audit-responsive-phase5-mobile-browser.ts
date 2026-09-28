import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const VIEWPORTS = [{ width: 320, height: 568 }, { width: 448, height: 956 }] as const;
const APP_IDS = [
  'mobile-messages-app', 'mobile-castlink-app', 'mobile-social-folder',
  'mobile-news-app', 'mobile-imdb-app', 'mobile-boxoffice-app',
  'mobile-team-app', 'mobile-bank-app', 'mobile-forbes-app',
  'mobile-stocks-app', 'mobile-dating-folder', 'mobile-guide-app',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const player = { ...INITIAL_PLAYER, name: 'Phone Layout Tester', age: 27, currentWeek: 12 };
      await page.addInitScript(({ player }) => {
        localStorage.clear();
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
        localStorage.setItem('aeMigrationCarePackageLedgerV1', JSON.stringify({ globalClaimed: true, fingerprints: [] }));
        localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
        localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({ playerName: player.name, age: player.age, week: player.currentWeek, fame: player.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now() }));
      }, { player });
      await page.goto('http://127.0.0.1:5178/', { waitUntil: 'domcontentloaded' });
      await page.locator('#startBtn').click();
      await page.getByText(player.name, { exact: true }).click();
      await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Mobile"]').click();
      await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();

      const metrics = await page.evaluate((ids: string[]) => {
        const phone = document.querySelector<HTMLElement>('[data-tutorial-id="mobile-phone-home"]');
        if (!phone) throw new Error('Phone launcher missing');
        const phoneRect = phone.getBoundingClientRect();
        const grid = phone.querySelector<HTMLElement>('.grid');
        if (!grid) throw new Error('Phone launcher grid missing');
        const gridStyle = getComputedStyle(grid);
        const icons = ids.map(id => {
          const node = document.querySelector<HTMLElement>(`[data-tutorial-id="${id}"]`);
          if (!node) throw new Error(`Missing phone app ${id}`);
          const rect = node.getBoundingClientRect();
          const label = node.querySelector<HTMLElement>('span:last-child');
          return { id, role: node.tagName.toLowerCase(), left: rect.left, right: rect.right,
            width: rect.width, height: rect.height,
            clippedLabel: !!label && (label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1),
          };
        });
        const scroll = phone;
        return { viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth,
          phoneLeft: phoneRect.left, phoneRight: phoneRect.right,
          columns: gridStyle.gridTemplateColumns.split(' ').length,
          columnGap: Number.parseFloat(gridStyle.columnGap),
          rowGap: Number.parseFloat(gridStyle.rowGap),
          contentScrollHeight: scroll.scrollHeight, contentClientHeight: scroll.clientHeight,
          scrollable: scroll.scrollHeight <= scroll.clientHeight + 1 || getComputedStyle(scroll).overflowY === 'auto', icons };
      }, APP_IDS);
      assert.equal(metrics.columns, 4, 'Phone launcher must keep four apps side by side');
      assert.ok(metrics.columnGap <= 8 && metrics.rowGap <= 20, 'Phone launcher spacing must stay compact');
      assert.equal(metrics.documentWidth, metrics.viewport, 'Phone must not create document-level horizontal overflow');
      assert.ok(metrics.icons.every(icon => icon.role === 'button'), 'Launcher icons must be semantic buttons');
      assert.ok(metrics.icons.every(icon => icon.left >= metrics.phoneLeft - 1 && icon.right <= metrics.phoneRight + 1), 'All launcher icons must fit inside the phone display');
      assert.ok(metrics.icons.every(icon => icon.width >= 44 && icon.height >= 44 && !icon.clippedLabel), 'Launcher buttons and labels must be usable');
      assert.ok(metrics.scrollable, 'Short phone launcher must scroll when its icons exceed the visible height');

      await page.locator('[data-tutorial-id="mobile-social-folder"]').click();
      const socialBack = page.getByRole('button', { name: 'Close Social folder' });
      const socialBackRect = await socialBack.boundingBox();
      assert.ok(socialBackRect && socialBackRect.width >= 44 && socialBackRect.height >= 44, 'Social folder needs a visible 44px close target');
      await socialBack.click();
      await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();
      await page.locator('[data-tutorial-id="mobile-dating-folder"]').click();
      const datingBack = page.getByRole('button', { name: 'Close Dating folder' });
      const datingBackRect = await datingBack.boundingBox();
      assert.ok(datingBackRect && datingBackRect.width >= 44 && datingBackRect.height >= 44, 'Dating folder needs a visible 44px close target');
      await datingBack.click();
      await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();

      if (viewport.width === 320 || viewport.width === 448) {
        await page.screenshot({ path: `/tmp/ae-phase5-mobile-launcher-${viewport.width}x${viewport.height}.png` });
      }
      console.log(`${viewport.width}×${viewport.height} phone launcher: ${JSON.stringify(metrics)}`);
      await page.close();
    }
    console.log('Phase 5 mobile launcher audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
