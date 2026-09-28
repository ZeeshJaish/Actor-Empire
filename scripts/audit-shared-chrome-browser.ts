import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const viewports = [
  { width: 320, height: 568 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
] as const;

const fixturePlayer = {
  ...INITIAL_PLAYER,
  name: 'Shell QA',
  age: 27,
  currentWeek: 12,
  money: 250_000,
  energy: { current: 71, max: 100 },
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
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
      await page.getByText('Shell QA', { exact: true }).click();
      await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();
      await page.locator('.ae-cta').waitFor();

      const geometry = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>('[data-shell-nav-visible]');
        const content = document.querySelector<HTMLElement>('.ae-game-content');
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]');
        const cta = document.querySelector<HTMLElement>('.ae-cta');
        if (!shell || !content || !nav || !cta) return null;
        const navRect = nav.getBoundingClientRect();
        const ctaRect = cta.getBoundingClientRect();
        return {
          navVisible: shell.dataset.shellNavVisible,
          clearance: getComputedStyle(shell).getPropertyValue('--ae-shell-nav-clearance').trim(),
          contentPaddingBottom: Number.parseFloat(getComputedStyle(content).paddingBottom),
          navTop: navRect.top,
          ctaBottom: ctaRect.bottom,
          viewportHeight: document.documentElement.clientHeight,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          navButtons: Array.from(nav.querySelectorAll<HTMLButtonElement>('button')).map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
        };
      });
      assert.ok(geometry, `${viewport.width}×${viewport.height}: shared shell contract missing`);
      assert.equal(geometry!.navVisible, 'true');
      assert.ok(geometry!.clearance.length > 0, 'shell clearance custom property missing');
      assert.equal(geometry!.contentPaddingBottom, 92, 'playable content must reserve the measured nav height, edge, and gap once');
      assert.equal(geometry!.documentWidth, geometry!.viewportWidth, 'document must not scroll horizontally');
      assert.ok(geometry!.ctaBottom <= geometry!.navTop + 1, 'Home week action must not sit behind fixed navigation');
      assert.ok(geometry!.navButtons.length === 6 && geometry!.navButtons.every(button => button.width >= 44 && button.height >= 44), 'six navigation targets must be at least 44×44');

      await page.getByRole('button', { name: 'Open energy ledger' }).click();
      const sheet = page.getByRole('dialog', { name: 'Energy ledger' });
      await sheet.waitFor();
      const close = sheet.getByRole('button', { name: 'Close' });
      const closeBounds = await close.boundingBox();
      assert.ok(closeBounds && closeBounds.width >= 44 && closeBounds.height >= 44, 'sheet close target must be at least 44×44');
      await close.click();
      if (viewport.width === 320) {
        await page.evaluate(() => {
          const visual = window.visualViewport;
          if (!visual) throw new Error('VisualViewport unavailable in browser audit');
          Object.defineProperty(visual, 'height', { configurable: true, value: window.innerHeight - 300 });
          visual.dispatchEvent(new Event('resize'));
        });
        const keyboardDebug = await page.evaluate(() => ({ inner: window.innerHeight, visual: window.visualViewport?.height, state: document.querySelector('.ae-game-shell')?.getAttribute('data-keyboard-open') }));
        assert.equal(keyboardDebug.state, 'true', `keyboard viewport observer did not update: ${JSON.stringify(keyboardDebug)}`);
        await page.waitForFunction(() => document.querySelector('.ae-game-shell')?.getAttribute('data-keyboard-open') === 'true', undefined, { timeout: 2000 });
        assert.equal(await page.locator('.ae-live-dock').evaluate((node: HTMLElement) => getComputedStyle(node).display), 'none', 'keyboard should hide fixed navigation');
        await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>('.ae-game-content')!).paddingBottom) < 0.5, undefined, { timeout: 2000 });
        const keyboardPadding = await page.locator('.ae-game-content').evaluate((node: HTMLElement) => ({
          padding: Number.parseFloat(getComputedStyle(node).paddingBottom),
          className: node.className,
          style: node.getAttribute('style'),
          contentVar: getComputedStyle(node).getPropertyValue('--ae-shell-nav-clearance'),
          shellVar: getComputedStyle(node.closest('.ae-game-shell')!).getPropertyValue('--ae-shell-nav-clearance'),
        }));
        assert.equal(keyboardPadding.padding, 0, `keyboard state must remove nav clearance: ${JSON.stringify(keyboardPadding)}`);
        await page.evaluate(() => {
          const visual = window.visualViewport;
          if (!visual) return;
          delete (visual as unknown as { height?: number }).height;
          visual.dispatchEvent(new Event('resize'));
        });
        await page.waitForFunction(() => document.querySelector('.ae-game-shell')?.getAttribute('data-keyboard-open') === 'false', undefined, { timeout: 2000 });
      }
      assert.deepEqual(errors, [], `runtime errors at ${viewport.width}×${viewport.height}`);
      await page.close();
    }
    console.log('Shared chrome browser audit passed across 3 viewports.');
  } finally { await browser.close(); }
})().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
