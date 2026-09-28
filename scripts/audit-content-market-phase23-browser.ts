/** Isolated visual/interaction contract for the Phase 2–3 Content Market. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { initializeHistoricalCatalogue } from '../services/historicalCatalogue';

const playwrightModule = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { chromium } = playwrightModule.default || playwrightModule;
const baseUrl = process.env.AE_MARKET_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });
const player = initializeHistoricalCatalogue(contentMarketFixture());
player.id = 'phase23-visual-synthetic';
player.name = 'Phase 23 Visual Actor';
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (error: Error) => errors.push(error.message));
await page.addInitScript((fixture: typeof player) => {
  sessionStorage.setItem('cm1-isolated-player', JSON.stringify(fixture));
}, player);

try {
  await page.goto(`${baseUrl}/scripts/fixtures/content-market-cm1.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Explore on my own', exact: true }).click();
  await page.locator('button').filter({ hasText: 'Catalogue, Content Market & Originals' }).first().click();
  await page.locator('button[class*="cdadd"]').first().click();
  await page.locator('[data-content-market-scene="gate"]').waitFor();
  await page.locator('[data-content-market-scene="gate"] button').filter({ hasText: 'THE MARKET' }).click();
  await page.locator('[data-content-market-scene="market"]').waitFor();
  mkdirSync('output/playwright', { recursive: true });
  const widths = [390, 320];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    const contract = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-content-market-scene="market"] section[class*="mkrail"] button[class*="mkcard"]')];
      const labels = cards.map(card => card.getAttribute('aria-label'));
      const badgesInsidePoster = cards.every(card => {
        const art = card.querySelector<HTMLElement>('[class*="mkcardart"]');
        const flags = card.querySelector<HTMLElement>('[class*="mkcardflags"]');
        if (!art || !flags || !art.contains(flags)) return false;
        const frame = art.getBoundingClientRect();
        return [...flags.children].every((badge) => {
          const rect = badge.getBoundingClientRect();
          return rect.left >= frame.left - 1 && rect.right <= frame.right + 1
            && rect.top >= frame.top - 1 && rect.bottom <= frame.bottom + 1;
        });
      });
      const touchTargets = [...document.querySelectorAll<HTMLElement>('[data-content-market-scene="market"] button[class*="mkback"], [data-content-market-scene="market"] [class*="mklenses"] button, [data-content-market-scene="market"] button[class*="mktool"]')];
      return {
        width: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        cardCount: cards.length,
        duplicateLeads: labels.length - new Set(labels).size,
        badgesInsidePoster,
        shortTouchTargets: touchTargets.filter(node => node.getBoundingClientRect().height < 43).map(node => node.textContent?.trim()),
        fixedPriceShown: document.body.textContent?.includes('FIXED-PRICE LICENCE'),
        liveShown: document.body.textContent?.includes('LIVE BIDDING'),
        buyingPower: document.querySelector<HTMLElement>('[class*="mkpwbig"]')?.textContent,
      };
    });
    assert.ok(contract.cardCount > 0, 'Market rails need playable cards');
    assert.equal(contract.duplicateLeads, 0, 'Leading poster cards should not repeat across rails');
    assert.ok(contract.badgesInsidePoster, 'Status, rating and Marquee markers must sit within the poster frame');
    assert.equal(contract.shortTouchTargets.length, 0, 'Market navigation and filter controls need 44px touch height');
    assert.ok(contract.documentWidth <= width + 1, 'The phone page must not scroll horizontally');
    assert.ok(contract.fixedPriceShown && contract.liveShown, 'Both licence and bidding routes must be clear');
    assert.equal(contract.buyingPower, '$500M', 'Market buying power should use the shared compact money display');
    await page.screenshot({ path: `output/playwright/market-phase23-${width}.png`, fullPage: true });
    console.log(JSON.stringify({ scene: 'market', ...contract }));
  }

  await page.locator('[data-content-market-scene="market"] button[class*="mkcard"]')
    .filter({ hasText: 'FIXED-PRICE LICENCE' }).first().click();
  await page.locator('[data-content-market-scene="detail"]').waitFor();
  const detail = await page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('[class*="mkbar2"]');
    const buttons = [...(bar?.querySelectorAll<HTMLElement>('button') || [])];
    const rectangles = buttons.map(button => button.getBoundingClientRect());
    return {
      rightsSummary: Boolean(document.querySelector('[aria-label="Rights terms before signing"]')),
      ipCopy: document.body.textContent?.includes('film IP remains with'),
      actions: buttons.map(button => button.textContent?.trim()),
      horizontalCollision: rectangles.some((rect, index) => index > 0 && rect.left < rectangles[index - 1].right),
      overflow: rectangles.some(rect => rect.left < 0 || rect.right > window.innerWidth),
    };
  });
  assert.ok(detail.rightsSummary && detail.ipCopy, 'Terms and IP scope must be visible before signing');
  assert.ok(!detail.horizontalCollision && !detail.overflow, 'Phone action buttons must fit without overlap');
  await page.waitForTimeout(850); // Wait only in this screenshot audit for the detail entrance animation.
  await page.screenshot({ path: 'output/playwright/market-phase23-detail-320.png', fullPage: true });
  await page.locator('[aria-label="Rights terms before signing"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/market-phase23-terms-320.png', fullPage: true });

  const richContext = await browser.newContext({ viewport: { width: 320, height: 844 } });
  const richPage = await richContext.newPage();
  const richPlayer = structuredClone(player);
  richPlayer.ownedStreamingPlatform.treasuryCash = 1_999_835_274_319;
  await richPage.addInitScript((fixture: typeof richPlayer) => {
    sessionStorage.setItem('cm1-isolated-player', JSON.stringify(fixture));
  }, richPlayer);
  await richPage.goto(`${baseUrl}/scripts/fixtures/content-market-cm1.html`, { waitUntil: 'networkidle' });
  await richPage.getByRole('button', { name: 'Explore on my own', exact: true }).click();
  await richPage.locator('button').filter({ hasText: 'Catalogue, Content Market & Originals' }).first().click();
  await richPage.locator('button[class*="cdadd"]').first().click();
  await richPage.locator('[data-content-market-scene="gate"] button').filter({ hasText: 'THE MARKET' }).click();
  assert.equal(await richPage.locator('[class*="mkpwbig"]').textContent(), '$2T',
    'Trillion-scale Market funds should use a T suffix rather than millions of M');
  await richContext.close();
  assert.deepEqual(errors, [], 'The synthetic Market browser flow should have no uncaught page errors');
  console.log(JSON.stringify({ scene: 'detail', ...detail, errors }));
} finally {
  await context.close();
  await browser.close();
}
