import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const viewports = [
  { width: 320, height: 400 },
  { width: 320, height: 568 },
  { width: 448, height: 956 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures: string[] = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const player = { ...INITIAL_PLAYER, name: 'Lifestyle Layout QA', age: 27, currentWeek: 12 };
      await page.addInitScript(({ player }: { player: typeof player }) => {
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
      await nav.getByRole('button', { name: 'Lifestyle' }).click();

      for (const destination of ['Assets', 'Activities', 'Business Empire']) {
        await page.getByRole('button', { name: destination, exact: true }).click();
        await page.waitForTimeout(150);
        const inspect = async (label: string) => {
        const metrics = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
          buttons: Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
            .filter(node => !node.disabled && node.offsetWidth && node.offsetHeight && !node.closest('nav[aria-label="Primary game navigation"]'))
            .filter(node => node.offsetWidth < 44 || node.offsetHeight < 44)
            .slice(0, 20)
            .map(node => ({ label: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 35), w: node.offsetWidth, h: node.offsetHeight })),
        }));
        console.log(`${viewport.width}×${viewport.height} ${label}: ${JSON.stringify(metrics)}`);
        if (metrics.width > metrics.viewport + 1) failures.push(`${viewport.width}×${viewport.height} ${label} overflows`);
        if (metrics.buttons.length) failures.push(`${viewport.width}×${viewport.height} ${label} small buttons: ${JSON.stringify(metrics.buttons)}`);
        if (viewport.height === 568) await page.screenshot({ path: `/tmp/ae-phase5-lifestyle-${label.toLowerCase().replaceAll(' ', '-')}-${viewport.width}x568.png` });
        };
        await inspect(destination);
        if (destination === 'Assets') {
          await page.getByRole('button', { name: /Real Estate/ }).first().click();
          await inspect('Assets Real Estate ownership');
          await page.getByRole('button', { name: 'Shop', exact: true }).first().click();
          await inspect('Assets Real Estate dealers');
          await page.locator('button:has(svg.lucide-arrow-left)').first().click();
          await page.locator('button:has(svg.lucide-arrow-left)').first().click();
        } else if (destination === 'Activities') {
          await page.getByRole('button', { name: /Plan a Trip/ }).first().click();
          await inspect('Activities trip builder');
          await page.locator('.fixed.z-\\[120\\] button:has(svg.lucide-arrow-left)').first().click();
        } else {
          await page.getByRole('button', { name: 'Start First Venture' }).click();
          await inspect('Business venture wizard');
          await page.getByRole('button', { name: /Restaurant/ }).first().click();
          await inspect('Business model selection');
          await page.locator('h3:has-text("Business Model")').locator('..').getByRole('button').first().click();
          await page.getByRole('button', { name: /Next Step/ }).click();
          await inspect('Business configuration');
          await page.getByRole('button', { name: /Next Step/ }).click();
          await inspect('Business naming');
          await page.locator('button:has(svg.lucide-arrow-left)').first().click();
          await page.locator('button:has(svg.lucide-arrow-left)').first().click();
          await page.locator('button:has(svg.lucide-arrow-left)').first().click();
          await page.locator('button:has(svg.lucide-arrow-left)').first().click();
        }
        const back = page.locator('button:has(svg.lucide-arrow-left)').first();
        await back.click();
        await page.getByRole('button', { name: destination, exact: true }).waitFor();
      }
      await page.close();
    }
    assert.deepEqual(failures, [], failures.join('\n'));
    console.log('Lifestyle entry audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
