/** Local, synthetic-only CPU attribution for Phase 2 Market interactions. */
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { initializeHistoricalCatalogue } from '../services/historicalCatalogue';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.AE_PHASE2_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });

try {
  const player = initializeHistoricalCatalogue(contentMarketFixture());
  player.id = 'phase2-profile-synthetic';
  player.name = 'Phase Two Profile Actor';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript((fixture: typeof player) => {
    sessionStorage.setItem('cm1-isolated-player', JSON.stringify(fixture));
  }, player);
  await page.goto(`${baseUrl}/scripts/fixtures/content-market-cm1.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Explore on my own', exact: true }).click();
  await page.locator('button').filter({ hasText: 'Catalogue, Content Market & Originals' }).first().click();

  const cdp = await context.newCDPSession(page);
  await cdp.send('Profiler.enable');
  const actions = [
    { label: 'Add Content', selector: 'button[class*="cdadd"]', target: '[data-content-market-scene="gate"]' },
    { label: 'Gate to Market', selector: '[data-content-market-scene="gate"] button', contains: 'THE MARKET', target: '[data-content-market-scene="market"]' },
    { label: 'Open title', selector: '[data-content-market-scene="market"] button[class*="mkcard"]', contains: 'LIVE BIDDING', target: '[data-content-market-scene="detail"]' },
    { label: 'Enter live room', selector: '[data-content-market-scene="detail"] button', contains: 'ENTER LIVE BID', target: '[data-content-market-scene="room"]' },
    { label: 'Place bid', selector: '[data-content-market-scene="room"] button[class*="mkbid"]', target: '[data-content-market-scene="room"] [role="status"]' },
  ];

  for (const action of actions) {
    await cdp.send('Profiler.start');
    const durationMs = await page.evaluate(async ({ selector, contains, target }: typeof action) => {
      const button = Array.from(document.querySelectorAll<HTMLElement>(selector))
        .find(candidate => !contains || candidate.textContent?.includes(contains));
      if (!button) throw new Error(`Missing action: ${selector}`);
      const started = performance.now();
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error(`Missing target: ${target}`)), 25_000);
        const observer = new MutationObserver(() => {
          if (!document.querySelector(target)) return;
          observer.disconnect();
          window.clearTimeout(timer);
          resolve();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        button.click();
      });
      return Math.round(performance.now() - started);
    }, action);
    const { profile } = await cdp.send('Profiler.stop');
    const frames = new Map(profile.nodes.map((node: any) => [node.id, node.callFrame]));
    const totals = new Map<string, number>();
    profile.samples?.forEach((nodeId: number, index: number) => {
      const frame: any = frames.get(nodeId);
      if (!frame || !frame.url.includes('127.0.0.1')) return;
      const key = `${frame.functionName || '(anonymous)'} ${frame.url.split('?')[0].replace(baseUrl, '')}:${frame.lineNumber + 1}`;
      totals.set(key, (totals.get(key) || 0) + (profile.timeDeltas?.[index] || 0) / 1_000);
    });
    console.log(JSON.stringify({ label: action.label, durationMs, topSelfMs: [...totals.entries()]
      .sort((left, right) => right[1] - left[1]).slice(0, 12).map(([frame, ms]) => ({ frame, ms: Math.round(ms) })) }));
  }
  await context.close();
} finally {
  await browser.close();
}
