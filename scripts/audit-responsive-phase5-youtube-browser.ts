import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      const player = {
        ...INITIAL_PLAYER,
        name: 'Video Layout Tester', age: 27, currentWeek: 12,
        youtube: {
          ...INITIAL_PLAYER.youtube,
          videos: [{
            id: 'responsive-video', title: 'A Long Film and Television Interview for Compact Phone Review',
            type: 'VLOG' as const, thumbnailColor: '#991b1b', views: 125000, likes: 5200,
            earnings: 0, weekUploaded: 10, yearUploaded: 2026, isPlayer: true,
            authorName: 'Video Layout Tester', qualityScore: 80, weeklyHistory: [10000],
            comments: ['This interview is readable on a compact screen.'],
          }],
        },
      };
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
      await page.locator('nav[aria-label="Primary game navigation"]').getByRole('button', { name: 'Mobile' }).click();
      await page.locator('[data-tutorial-id="mobile-social-folder"]').click();
      await page.getByRole('button', { name: 'YouTube', exact: true }).click();
      await page.locator('button:has(svg.lucide-plus)').last().click();
      const title = page.locator('input[type="text"]').last();
      await title.fill('An unsent video draft with a longer title');
      const metrics = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('[class*="max-w-xs"][class*="rounded-"]');
        const buttons = Array.from(shell?.querySelectorAll<HTMLButtonElement>('button') || [])
          .filter(button => !button.disabled && button.offsetWidth > 0 && button.offsetHeight > 0);
        const back = buttons.find(button => button.querySelector('svg.lucide-arrow-left'));
        const backBox = back?.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          smallButtons: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44)
            .slice(0, 8).map(button => ({ text: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 24), width: button.offsetWidth, height: button.offsetHeight })),
          back: backBox && { width: backBox.width, height: backBox.height },
        };
      });
      console.log(`${viewport.width}×${viewport.height} YouTube upload: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, 'YouTube upload: document overflow');
      assert.ok(metrics.back && metrics.back.width >= 44 && metrics.back.height >= 44, 'YouTube upload: Back below 44px');
      assert.deepEqual(metrics.smallButtons, [], 'YouTube upload: undersized controls');
      const publish = page.getByRole('button', { name: /Publish Video/i });
      const publishBox = await publish.boundingBox();
      assert.ok(publishBox && publishBox.height >= 44 && publishBox.y >= 0 && publishBox.y + publishBox.height <= viewport.height + 1, 'YouTube upload: Publish action obstructed');
      await page.setViewportSize({ width: viewport.width, height: 400 });
      assert.equal(await title.inputValue(), 'An unsent video draft with a longer title', 'YouTube upload: draft lost on keyboard-sized viewport');
      await page.setViewportSize(viewport);
      await page.locator('button:has(svg.lucide-arrow-left)').last().click();
      await page.getByRole('button', { name: 'Studio', exact: true }).click();
      await page.getByText('Content', { exact: true }).click();
      await page.getByRole('button', { name: /A Long Film and Television Interview/ }).last().click();
      const watchMetrics = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('[class*="max-w-xs"][class*="rounded-"]');
        const buttons = Array.from(shell?.querySelectorAll<HTMLButtonElement>('button') || [])
          .filter(button => !button.disabled && button.offsetWidth > 0 && button.offsetHeight > 0);
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          smallButtons: buttons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44)
            .slice(0, 10).map(button => ({ text: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 24), width: button.offsetWidth, height: button.offsetHeight })),
        };
      });
      console.log(`${viewport.width}×${viewport.height} YouTube watch: ${JSON.stringify(watchMetrics)}`);
      assert.ok(watchMetrics.documentWidth <= watchMetrics.viewportWidth + 1, 'YouTube watch: document overflow');
      assert.deepEqual(watchMetrics.smallButtons, [], 'YouTube watch: undersized controls');
      await page.getByRole('button', { name: /Back to YouTube/i }).click();
      assert.deepEqual(errors, [], 'YouTube upload: runtime errors');
      await page.close();
    }
    console.log('YouTube upload responsive audit passed.');
  } finally { await browser.close(); }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
