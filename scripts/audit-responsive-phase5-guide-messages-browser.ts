import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = 'http://127.0.0.1:5178/';

async function checkPhone(page: any, label: string, viewport: { width: number; height: number }) {
  await page.locator('[data-ui="actor-empire-guide"], [data-tutorial-id="mobile-inbox"]').first()
    .evaluate(async (surface: Element) => {
      await Promise.all(surface.getAnimations().map(animation => animation.finished.catch(() => undefined)));
    });
  const metrics = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[data-ui="actor-empire-guide"]')
      || document.querySelector<HTMLElement>('[data-tutorial-id="mobile-inbox"]');
    const visibleButtons = Array.from(surface?.querySelectorAll<HTMLButtonElement>('button') || [])
      .filter(button => !button.disabled && button.offsetWidth > 0 && button.offsetHeight > 0);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      surfaceWidth: surface?.getBoundingClientRect().width || 0,
      smallButtons: visibleButtons.filter(button => button.offsetWidth < 44 || button.offsetHeight < 44)
        .map(button => ({ label: button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 36), width: button.offsetWidth, height: button.offsetHeight })),
    };
  });
  console.log(`${viewport.width}×${viewport.height} ${label}: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.surfaceWidth > 0, `${label}: active surface missing`);
  assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `${label}: document overflow`);
  assert.deepEqual(metrics.smallButtons, [], `${label}: undersized controls`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      const player = {
        ...INITIAL_PLAYER,
        name: 'Deep Phone Tester',
        age: 27,
        currentWeek: 12,
        inbox: [{
          id: 'responsive-message',
          sender: 'Very Long Studio Correspondence Department',
          subject: 'A long but important message that a player needs to read in full',
          text: 'This information stays available when the phone viewport changes height. '.repeat(5),
          type: 'TEXT' as const,
          isRead: true,
          weekSent: 12,
        }],
      };
      await page.addInitScript(({ player }) => {
        localStorage.clear();
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
        localStorage.setItem('aeMigrationCarePackageLedgerV1', JSON.stringify({ globalClaimed: true, fingerprints: [] }));
        localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
        localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({ playerName: player.name, age: player.age, week: player.currentWeek, fame: player.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now() }));
      }, { player });
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await page.locator('#startBtn').click();
      await page.getByText(player.name, { exact: true }).click();
      const mobileNav = page.locator('nav[aria-label="Primary game navigation"]').getByRole('button', { name: 'Mobile' });
      await mobileNav.click();

      await page.locator('[data-tutorial-id="mobile-guide-app"]').click();
      await checkPhone(page, 'Guide menu', viewport);
      await page.getByRole('button', { name: /Quick Start/i }).first().click();
      await checkPhone(page, 'Guide wizard', viewport);
      const wizardClose = page.locator('button:has(svg.lucide-x)').last();
      const wizardCloseBox = await wizardClose.boundingBox();
      assert.ok(wizardCloseBox && wizardCloseBox.width >= 44 && wizardCloseBox.height >= 44, 'Guide wizard Close below 44px');
      await wizardClose.click();
      const search = page.locator('input[placeholder]').last();
      await search.fill('energy');
      await checkPhone(page, 'Guide search results', viewport);
      await page.setViewportSize({ width: viewport.width, height: Math.min(viewport.height, 400) });
      assert.equal(await search.inputValue(), 'energy', 'Guide search draft lost on keyboard-sized viewport');
      await checkPhone(page, 'Guide search short-height', { width: viewport.width, height: Math.min(viewport.height, 400) });
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: 'Clear guide search' }).click();
      for (const guideSection of ['Handbook', 'Playbooks', 'FAQ']) {
        await page.getByRole('button', { name: new RegExp(guideSection, 'i') }).first().click();
        const articleButtons = page.locator('div.custom-scrollbar.space-y-3 > div > button');
        const articleCount = await articleButtons.count();
        assert.ok(articleCount > 0, `${guideSection}: no articles`);
        for (let article = 0; article < articleCount; article++) {
          await articleButtons.nth(article).click();
          await checkPhone(page, `${guideSection} article ${article + 1}`, viewport);
        }
        await page.getByRole('button', { name: 'Back', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Back to phone' }).click();
      await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();

      await page.locator('[data-tutorial-id="mobile-messages-app"]').click();
      await checkPhone(page, 'Messages list', viewport);
      await page.getByRole('button', { name: /Very Long Studio Correspondence Department/ }).click();
      await checkPhone(page, 'Messages detail', viewport);
      assert.ok(await page.getByText(/This information stays available/).isVisible(), 'Message body hidden');
      await page.locator('[data-tutorial-id="mobile-inbox"] button:has(svg.lucide-arrow-left)').first().click();
      await checkPhone(page, 'Messages return list', viewport);
      await page.locator('[data-tutorial-id="mobile-inbox"] button:has(svg.lucide-arrow-left)').first().click();
      await page.locator('[data-tutorial-id="mobile-phone-home"]').waitFor();
      assert.deepEqual(errors, [], `${viewport.width}: runtime errors`);
      await page.close();
    }
    console.log('Guide and Messages deep responsive audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
