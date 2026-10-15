import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

type Viewport = { width: number; height: number };
const viewports: Viewport[] = [{ width: 320, height: 568 }, { width: 448, height: 956 }];

async function openPhoneApp(page: any, launcher: string, folderApp?: string) {
  await page.locator('nav[aria-label="Primary game navigation"]').getByRole('button', { name: 'Mobile' }).click();
  await page.locator(`[data-tutorial-id="${launcher}"]`).click();
  if (folderApp) await page.getByRole('button', { name: folderApp, exact: true }).click();
}

async function verifySurface(page: any, label: string, viewport: Viewport, action?: any) {
  const metrics = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('[class*="max-w-xs"][class*="rounded-"]');
    const rect = shell?.getBoundingClientRect();
    const target = Array.from(document.querySelectorAll<HTMLElement>('button')).find(node =>
      node.offsetWidth > 0 && node.offsetHeight > 0 && (node.getAttribute('aria-label') === 'Close' || node.textContent?.trim() === 'Close')
    );
    const targetRect = target?.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      shellWidth: rect?.width,
      target: targetRect ? { width: targetRect.width, height: targetRect.height, bottom: targetRect.bottom } : null,
    };
  });
  console.log(`${viewport.width}×${viewport.height} ${label}: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `${label}: document horizontal overflow`);
  if (action) {
    const box = await action.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${label}: primary action below 44px`);
    assert.ok(box.y < viewport.height && box.y + box.height > 0, `${label}: primary action off viewport`);
  }
  return metrics;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const player = {
        ...INITIAL_PLAYER,
        name: 'Nested Phone QA', age: 27, currentWeek: 12,
        news: [{ id: 'responsive-news', headline: 'A very long story headline about a major new studio release', subtext: 'A longer explanation that must stay readable on a compact phone.', category: 'TOP_STORY', week: 12, year: 2026, impactLevel: 'HIGH' }],
      };
      await page.addInitScript(({ player }: { player: typeof INITIAL_PLAYER }) => {
        localStorage.clear();
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
        localStorage.setItem('aeMigrationCarePackageLedgerV1', JSON.stringify({ globalClaimed: true, fingerprints: [] }));
        localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
        localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({ playerName: player.name, age: player.age, week: player.currentWeek, fame: player.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now() }));
      }, { player });
      await page.goto('http://127.0.0.1:5178/', { waitUntil: 'domcontentloaded' });
      await page.locator('#startBtn').click();
      await page.getByText(player.name, { exact: true }).click();
      const nav = page.locator('nav[aria-label="Primary game navigation"]');

      await openPhoneApp(page, 'mobile-news-app');
      await page.getByRole('button', { name: /A very long story headline/ }).click();
      const closeStory = page.getByRole('button', { name: 'Close', exact: true }).last();
      await verifySurface(page, 'News story detail', viewport, closeStory);
      await closeStory.click();
      await page.getByRole('button', { name: 'Back to phone' }).click();
      await nav.getByRole('button', { name: 'Home' }).click();

      await openPhoneApp(page, 'mobile-bank-app');
      for (const tab of ['Overview', 'Breakdown', 'Passbook']) {
        const button = page.getByRole('button', { name: tab, exact: true });
        await button.click();
        await verifySurface(page, `Bank ${tab}`, viewport, button);
      }
      await page.getByRole('button', { name: 'Back to phone' }).click();
      await nav.getByRole('button', { name: 'Home' }).click();

      await openPhoneApp(page, 'mobile-social-folder', 'X');
      await verifySurface(page, 'X feed', viewport);
      await page.locator('button:has(svg.lucide-pen-tool)').last().click();
      const cancelPost = page.getByRole('button', { name: 'Cancel', exact: true });
      await verifySurface(page, 'X composer', viewport, cancelPost);
      await page.locator('textarea').last().fill('Unsent responsive layout draft');
      await page.setViewportSize({ width: viewport.width, height: 400 });
      await verifySurface(page, 'X composer short-height', { width: viewport.width, height: 400 }, page.getByRole('button', { name: 'Post to X' }));
      await page.setViewportSize(viewport);
      await cancelPost.click();
      await verifySurface(page, 'X draft return', viewport);
      await page.getByRole('button', { name: 'Back to phone' }).click();
      await page.getByRole('button', { name: 'Close Social folder' }).click();
      await nav.getByRole('button', { name: 'Home' }).click();

      await openPhoneApp(page, 'mobile-social-folder', 'Instagram');
      await page.locator('button:has(svg.lucide-camera)').first().click();
      const caption = page.getByPlaceholder('Write a caption, or leave blank for an auto caption...');
      await caption.fill('Unsent visual draft');
      await verifySurface(page, 'Instagram composer', viewport, page.getByRole('button', { name: 'Close post editor' }));
      await page.setViewportSize({ width: viewport.width, height: 400 });
      await verifySurface(page, 'Instagram composer short-height', { width: viewport.width, height: 400 }, page.getByRole('button', { name: 'Share Post' }));
      await page.setViewportSize(viewport);
      await page.close();
    }
    console.log('Nested mobile responsive audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
