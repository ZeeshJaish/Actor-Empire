import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const MODES = [
  { name: 'MESSAGES', launcher: 'mobile-messages-app' },
  { name: 'CASTLINK', launcher: 'mobile-castlink-app' },
  { name: 'NEWS', launcher: 'mobile-news-app' },
  { name: 'IMDB', launcher: 'mobile-imdb-app' },
  { name: 'BOXOFFICE', launcher: 'mobile-boxoffice-app' },
  { name: 'TEAM', launcher: 'mobile-team-app' },
  { name: 'BANK', launcher: 'mobile-bank-app' },
  { name: 'FORBES', launcher: 'mobile-forbes-app' },
  { name: 'STOCKS', launcher: 'mobile-stocks-app' },
  { name: 'X', launcher: 'mobile-social-folder', folderButton: 'X' },
  { name: 'INSTAGRAM', launcher: 'mobile-social-folder', folderButton: 'Instagram' },
  { name: 'YOUTUBE', launcher: 'mobile-social-folder', folderButton: 'YouTube' },
  { name: 'TINDER', launcher: 'mobile-dating-folder', folderButton: 'Tinder' },
  { name: 'LUXE', launcher: 'mobile-dating-folder', folderButton: 'Luxe' },
  { name: 'GUIDE', launcher: 'mobile-guide-app' },
] as const;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const issues: string[] = [];
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }].filter(item => !process.env.PHASE5_MODE_WIDTH || item.width === Number(process.env.PHASE5_MODE_WIDTH))) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      const player = { ...INITIAL_PLAYER, name: 'Phone Mode Tester', age: 27, currentWeek: 12 };
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
      const nav = page.locator('nav[aria-label="Primary game navigation"]');
      await nav.getByRole('button', { name: 'Mobile' }).click();
      const selectedModes = MODES.filter(item => !process.env.PHASE5_MODE_NAME || item.name === process.env.PHASE5_MODE_NAME);
      for (const [index, mode] of selectedModes.entries()) {
        await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();
        await page.locator(`[data-tutorial-id="${mode.launcher}"]`).click();
        if ('folderButton' in mode) await page.getByRole('button', { name: mode.folderButton, exact: true }).click();
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => {
          const shell = document.querySelector<HTMLElement>('[class*="max-w-xs"][class*="rounded-"]');
          const shellRect = shell?.getBoundingClientRect();
          const horizontal = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(node => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.position !== 'fixed' && rect.width > 0 && rect.height > 0
              && shellRect && node.closest('[class*="max-w-xs"][class*="rounded-"]') === shell
              && (rect.left < shellRect.left - 2 || rect.right > shellRect.right + 2);
          }).slice(0, 6).map(node => ({ tag: node.tagName, className: String(node.className).slice(0, 100), text: node.textContent?.trim().slice(0, 35) }));
          const backControls = Array.from(document.querySelectorAll<HTMLElement>('button:has(svg.lucide-arrow-left), [role="button"]:has(svg.lucide-arrow-left)'))
            .filter(node => shell && node.closest('[class*="max-w-xs"][class*="rounded-"]') === shell && getComputedStyle(node).visibility !== 'hidden')
            .map(node => ({ width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height), label: node.getAttribute('aria-label') || node.textContent?.trim() || '' }));
          const smallButtons = Array.from(shell?.querySelectorAll<HTMLButtonElement>('button') || [])
            .filter(node => !node.disabled && node.offsetWidth > 0 && node.offsetHeight > 0 && (node.offsetWidth < 44 || node.offsetHeight < 44))
            .slice(0, 12).map(node => ({ label: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 36), width: node.offsetWidth, height: node.offsetHeight }));
          return { documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
            shellWidth: shellRect?.width, shellScrollWidth: shell?.scrollWidth, shellClientWidth: shell?.clientWidth, horizontal, backControls, smallButtons };
        });
        console.log(`${viewport.width}×${viewport.height} ${mode.name}: ${JSON.stringify(metrics)}`);
        if (viewport.width === 320 && viewport.height === 568) await page.screenshot({ path: `/tmp/ae-phase5-mode-${mode.name.toLowerCase()}-320x568.png` });
        if (metrics.documentWidth > metrics.viewportWidth + 1) issues.push(`${viewport.width} ${mode.name}: document horizontal overflow`);
        if (!metrics.backControls.some(control => control.width >= 44 && control.height >= 44)) issues.push(`${viewport.width} ${mode.name}: no 44px in-app Back control`);
        if (metrics.smallButtons.length) issues.push(`${viewport.width} ${mode.name}: undersized buttons ${JSON.stringify(metrics.smallButtons)}`);
        if (mode.name === 'TINDER') {
          const flame = await page.locator('.drop-shadow-md svg.lucide-flame').first().boundingBox();
          const phone = await page.locator('[class*="max-w-xs"][class*="rounded-"]').first().boundingBox();
          if (flame && phone && flame.y < phone.y + 40) issues.push(`${viewport.width} TINDER: setup illustration intrudes into phone notch`);
        }
        const safeNestedTabs: Partial<Record<typeof mode.name, string>> = {
          CASTLINK: 'Auditions',
          IMDB: 'Credits',
          BOXOFFICE: 'Streaming',
          TEAM: 'Manager',
          STOCKS: 'Portfolio',
          X: 'Following',
          INSTAGRAM: 'Instagram profile',
          YOUTUBE: 'Film & TV',
          TINDER: 'Women',
        };
        const nestedTab = safeNestedTabs[mode.name];
        if (nestedTab) {
          if (mode.name === 'X' && viewport.height === 400) await page.screenshot({ path: '/tmp/ae-phase5-x-320x400-before-tab.png' });
          const target = page.getByRole('button', { name: nestedTab }).first();
          await target.click({ timeout: 5000 });
          const nested = await page.evaluate(() => {
            const shell = document.querySelector<HTMLElement>('[class*="max-w-xs"][class*="rounded-"]');
            const small = Array.from(shell?.querySelectorAll<HTMLButtonElement>('button') || [])
              .filter(node => !node.disabled && node.offsetWidth > 0 && node.offsetHeight > 0 && (node.offsetWidth < 44 || node.offsetHeight < 44))
              .slice(0, 12).map(node => ({ label: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 36), width: node.offsetWidth, height: node.offsetHeight }));
            return { documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth, small };
          });
          console.log(`${viewport.width}×${viewport.height} ${mode.name} ${nestedTab}: ${JSON.stringify(nested)}`);
          if (nested.documentWidth > nested.viewportWidth + 1) issues.push(`${viewport.width} ${mode.name} ${nestedTab}: document horizontal overflow`);
          if (nested.small.length) issues.push(`${viewport.width} ${mode.name} ${nestedTab}: undersized buttons ${JSON.stringify(nested.small)}`);
          if (mode.name === 'CASTLINK') await page.locator('[class*="max-w-xs"][class*="rounded-"] button:has(svg.lucide-arrow-left)').first().click();
          if (mode.name === 'INSTAGRAM') await page.getByRole('button', { name: 'Instagram feed' }).click();
          if (mode.name === 'X' && viewport.height === 400) {
            await page.getByRole('button', { name: 'Compose post' }).first().click();
            await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          }
        }
        if (errors.length) issues.push(`${viewport.width} ${mode.name}: ${errors.splice(0).join('; ')}`);
        const back = page.locator('[class*="max-w-xs"][class*="rounded-"] button:has(svg.lucide-arrow-left)').first();
        await back.click();
        if ('folderButton' in mode) {
          await page.getByRole('button', { name: mode.launcher === 'mobile-social-folder' ? 'Close Social folder' : 'Close Dating folder' }).click();
        }
        await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();
        if (index < selectedModes.length - 1) {
          await nav.getByRole('button', { name: 'Home' }).click();
          await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();
          await nav.getByRole('button', { name: 'Mobile' }).click();
        }
      }
      await page.close();
    }
    assert.deepEqual(issues, [], `Phase 5 mobile-mode blockers:\n${issues.join('\n')}`);
    console.log('Phase 5 mobile mode baseline completed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
