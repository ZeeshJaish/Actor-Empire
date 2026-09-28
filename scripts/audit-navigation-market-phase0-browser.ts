/** Read-only Phase 0 browser baseline. Every save lives in a fresh Playwright context. */
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { initializeHistoricalCatalogue } from '../services/historicalCatalogue';
import type { Player } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.AE_PHASE0_BASE_URL || 'http://127.0.0.1:5174';
const cpuSlowdown = Number(process.env.AE_PHASE0_CPU_SLOWDOWN || 1);

type Action = { selector: string; target: string; contains?: string };
type Sample = { label: string; ms: number; firstMutationMs: number | null; loadingSeen: boolean;
  longTaskCount: number; longTaskTotalMs: number; longestTaskMs: number };

const syntheticPlayer = (long: boolean): Player => {
  const source = contentMarketFixture();
  source.id = long ? 'phase0-synthetic-long' : 'phase0-synthetic-fresh';
  source.name = long ? 'Phase Zero Long Save' : 'Phase Zero Fresh Save';
  if (long) {
    source.age = 38;
    source.currentWeek = 12;
    source.world.projects.push(...Array.from({ length: 600 }, (_, index) => ({
      id: `phase0-world-${index}`,
      title: `Phase Zero World Film ${index}`,
      studioId: `phase0-studio-${index % 12}`,
      mediaType: 'MOVIE',
      genre: index % 2 ? 'THRILLER' : 'DRAMA',
      rating: 5.5 + (index % 30) / 10,
      year: 25 + index % 12,
      boxOffice: 12_000_000 + index * 125_000,
    } as any)));
    source.pastProjects.push(...Array.from({ length: 150 }, (_, index) => ({
      id: `phase0-past-${index}`,
      name: `Phase Zero Past Film ${index}`,
      studioId: 'cm1-studio',
      projectType: 'MOVIE',
      genre: 'DRAMA',
      imdbRating: 5.8 + index % 3,
      boxOffice: 10_000_000 + index * 150_000,
    } as any)));
  }
  // Persist only the compact deterministic 2,000-title recipe. Full migration
  // creates a large UI-expanded object that exceeds browser localStorage quota.
  return initializeHistoricalCatalogue(source);
};

const measure = async (page: any, label: string, action: Action): Promise<Sample> => {
  const result = await page.evaluate(async ({ selector, target, contains }: Action) => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const button = buttons.find(candidate => !contains || candidate.textContent?.includes(contains));
    if (!button) throw new Error(`Action button not found: ${selector} ${contains || ''}; current scene: ${document.querySelector('[data-content-market-scene]')?.getAttribute('data-content-market-scene') || 'none'}; synthetic screen: ${document.body.innerText.slice(-600)}`);
    if (document.querySelector(target)) throw new Error(`Target already visible: ${target}`);

    const started = performance.now();
    let firstMutationMs: number | null = null;
    let loadingSeen = false;
    const tasks: number[] = [];
    const performanceObserver = typeof PerformanceObserver !== 'undefined'
      ? new PerformanceObserver(list => {
          list.getEntries().forEach(entry => tasks.push(entry.duration));
        }) : null;
    try { performanceObserver?.observe({ entryTypes: ['longtask'] }); } catch { /* unsupported */ }

    const duration = await new Promise<number>((resolve, reject) => {
      let finished = false;
      const timeout = window.setTimeout(() => finish(new Error(`Timed out waiting for ${target}`)), 25_000);
      const observer = new MutationObserver(() => {
        if (firstMutationMs === null) firstMutationMs = performance.now() - started;
        if (document.body.textContent?.includes('Loading screen…')) loadingSeen = true;
        check();
      });
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        observer.disconnect();
        window.clearTimeout(timeout);
        if (error) reject(error);
        else requestAnimationFrame(() => resolve(performance.now() - started));
      };
      const check = () => { if (document.querySelector(target)) finish(); };
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      button.click();
      check();
    });
    performanceObserver?.disconnect();
    return {
      ms: Math.round(duration),
      firstMutationMs: firstMutationMs === null ? null : Math.round(firstMutationMs),
      loadingSeen,
      longTaskCount: tasks.length,
      longTaskTotalMs: Math.round(tasks.reduce((sum, value) => sum + value, 0)),
      longestTaskMs: Math.round(Math.max(0, ...tasks)),
    };
  }, action);
  return { label, ...result };
};

const gameSample = async (browser: any, player: Player) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  if (cpuSlowdown > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  }
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  await page.addInitScript(({ fixture }: { fixture: Player }) => {
    localStorage.clear();
    localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
    localStorage.setItem('actorEmpireSave_1', JSON.stringify(fixture));
    localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({
      playerName: fixture.name, age: fixture.age, week: fixture.currentWeek,
      fame: fixture.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now(),
    }));
  }, { fixture: player });
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('#startBtn').click({ timeout: 30_000 });
    try {
      await page.getByText(player.name, { exact: true }).click({ timeout: 10_000 });
    } catch (error) {
      console.error(JSON.stringify({ stage: 'save-slot-selection', expected: player.name,
        visibleText: (await page.locator('body').innerText()).slice(0, 1800), errors }));
      throw error;
    }
    await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({ timeout: 30_000 });
    const samples = [
      await measure(page, 'Home → Career cold', { selector: 'nav[aria-label="Primary game navigation"] button[aria-label="Career"]', target: '[data-ui="actor-empire-career-overhaul"]' }),
      await measure(page, 'Career → Home', { selector: 'nav[aria-label="Primary game navigation"] button[aria-label="Home"]', target: '[data-ui="actor-empire-home-overhaul"]' }),
      await measure(page, 'Home → Career warm', { selector: 'nav[aria-label="Primary game navigation"] button[aria-label="Career"]', target: '[data-ui="actor-empire-career-overhaul"]' }),
      await measure(page, 'Career → Home repeat', { selector: 'nav[aria-label="Primary game navigation"] button[aria-label="Home"]', target: '[data-ui="actor-empire-home-overhaul"]' }),
      await measure(page, 'Home → Mobile cold', { selector: 'nav[aria-label="Primary game navigation"] button[aria-label="Mobile"]', target: 'div[class*="max-h-[650px]"]' }),
    ];
    return { samples, errors };
  } finally {
    await context.close();
  }
};

const marketSample = async (browser: any, player: Player) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  if (cpuSlowdown > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  }
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  await page.addInitScript(({ fixture }: { fixture: Player }) => {
    sessionStorage.setItem('cm1-isolated-player', JSON.stringify(fixture));
  }, { fixture: player });
  try {
    await page.goto(`${baseUrl}/scripts/fixtures/content-market-cm1.html`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Explore on my own', exact: true }).click();
    const samples: Sample[] = [];
    samples.push(await measure(page, 'HQ → Content Desk', {
      selector: 'button', contains: 'Catalogue, Content Market & Originals', target: 'button[class*="cdadd"]',
    }));
    samples.push(await measure(page, 'Content Desk Add Content → gate', {
      selector: 'button[class*="cdadd"]', target: '[data-content-market-scene="gate"]',
    }));
    samples.push(await measure(page, 'Gate → Market', {
      selector: '[data-content-market-scene="gate"] button', contains: 'THE MARKET', target: '[data-content-market-scene="market"]',
    }));
    samples.push(await measure(page, 'Market → live title detail', {
      selector: '[data-content-market-scene="market"] button[class*="mkcard"]', contains: 'LIVE BIDDING', target: '[data-content-market-scene="detail"]',
    }));
    samples.push(await measure(page, 'Detail → live bid room', {
      selector: '[data-content-market-scene="detail"] button', contains: 'ENTER LIVE BID', target: '[data-content-market-scene="room"]',
    }));
    await page.waitForTimeout(500);
    const roomPersisted = await page.evaluate(() => {
      const saved = JSON.parse(sessionStorage.getItem('cm1-isolated-player') || '{}');
      const selected = saved.ownedStreamingPlatform?.contentMarketDraft?.selectedId;
      return Boolean(selected && saved.ownedStreamingPlatform?.buyerAuctionSessions
        ?.some((session: { id: string; status: string }) => session.id === selected && session.status === 'LIVE'));
    });
    if (!roomPersisted || !(await page.locator('[data-content-market-scene="room"] button[class*="mkbid"]').count())) {
      throw new Error('The opened live room or its selected draft was lost after the pending draft-autosave window.');
    }
    samples.push(await measure(page, 'Bid → feedback', {
      selector: '[data-content-market-scene="room"] button[class*="mkbid"]',
      target: '[data-content-market-scene="room"] [role="status"]',
    }));
    return { samples, errors };
  } finally {
    await context.close();
  }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const long of [false, true]) {
      const player = syntheticPlayer(long);
      const category = long ? 'synthetic-long' : 'synthetic-fresh';
      const counts = { worldProjects: player.world.projects.length, pastProjects: player.pastProjects.length,
        historicalCatalogue: player.world.historicalCatalogue ? 'seeded' : 'absent' };
      console.log(JSON.stringify({ category, cpuSlowdown, counts,
        game: await gameSample(browser, player), market: await marketSample(browser, player) }));
    }
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
