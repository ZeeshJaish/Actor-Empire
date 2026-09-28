import assert from 'node:assert/strict';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { initializeHistoricalCatalogue } from '../services/historicalCatalogue';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.AE_PHASE1_URL || 'http://127.0.0.1:5174/';
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors: string[] = [];
  const lateUiModules: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  const fixture = initializeHistoricalCatalogue(contentMarketFixture());
  fixture.name = 'Phase One Navigation Actor';
  fixture.id = 'phase-one-synthetic-career';
  await page.addInitScript((player: typeof fixture) => {
    localStorage.clear();
    localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
    localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
    localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({
      playerName: player.name, age: player.age, week: player.currentWeek,
      fame: player.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now(),
    }));
  }, fixture);

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#startBtn').click({ timeout: 45_000 });
  await page.getByText(fixture.name, { exact: true }).waitFor({ timeout: 15_000 });
  const careerOpening = await page.evaluate(async (actorName: string) => {
    const actor = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .find(element => element.textContent === actorName && element.closest('.slot-card'));
    const card = actor?.closest<HTMLElement>('.slot-card');
    if (!card) throw new Error('Synthetic career slot was not clickable.');
    let seen = false;
    let decorativeActorsSeen = false;
    let sceneDeckSeen = false;
    let tipCardSeen = false;
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes('OPENING YOUR CAREER')) {
        seen = true;
        decorativeActorsSeen ||= Boolean(document.querySelector('[role="status"] [aria-hidden="true"] svg'));
        sceneDeckSeen ||= Boolean(document.querySelector('[data-ui="career-opening-deck"]'));
        tipCardSeen ||= Boolean(document.querySelector('[role="note"][aria-label="Career tip"]'));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    card.click();
    await new Promise(resolve => setTimeout(resolve, 250));
    observer.disconnect();
    return { seen, decorativeActorsSeen, sceneDeckSeen, tipCardSeen };
  }, fixture.name);
  assert.ok(careerOpening.seen, 'Selected career did not show its separate loading scene.');
  assert.equal(careerOpening.decorativeActorsSeen, false, 'Career opening must not render decorative people artwork.');
  assert.equal(careerOpening.sceneDeckSeen, true, 'Career opening must display the scene-card animation.');
  assert.equal(careerOpening.tipCardSeen, true, 'Career opening must display a concise tip card.');
  await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({ timeout: 45_000 });

  page.on('request', (request: { url: () => string }) => {
    const url = request.url();
    if (/\/(views|components)\/.*\.(tsx|jsx)(\?|$)/.test(url)) lateUiModules.push(url);
  });

  for (const name of ['Career', 'Home', 'Improve', 'Home', 'Social', 'Home']) {
    await page.locator(`nav[aria-label="Primary game navigation"] button[aria-label="${name}"]`).click();
    await page.locator(`nav[aria-label="Primary game navigation"] button[aria-label="${name}"][aria-current="page"]`).waitFor({ timeout: 15_000 });
    assert.doesNotMatch(await page.locator('body').innerText(), /Loading screen…|Preparing screen…/);
  }
  await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Mobile"]').click();
  await page.waitForTimeout(300);
  assert.doesNotMatch(await page.locator('body').innerText(), /Loading screen…|Preparing screen…/);
  assert.deepEqual(lateUiModules, [], 'Career/Phone navigation requested UI code after Start Career.');

  // Phone and Lifestyle intentionally own full-bleed chrome and can hide the dock.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#startBtn').click({ timeout: 45_000 });
  await page.getByText(fixture.name, { exact: true }).click({ timeout: 15_000 });
  await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({ timeout: 45_000 });
  lateUiModules.length = 0;
  await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Lifestyle"]').click();
  await page.waitForTimeout(300);
  assert.doesNotMatch(await page.locator('body').innerText(), /Loading screen…|Preparing screen…/);
  assert.deepEqual(lateUiModules, [], 'Navigation requested UI code after Start Career.');
  assert.deepEqual(errors, [], 'Browser raised uncaught errors.');
  console.log('Phase 1 career-opening and navigation browser audit passed.');
  await context.close();
} finally {
  await browser.close();
}
