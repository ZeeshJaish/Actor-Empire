import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Commitment, type Relationship } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 448, height: 956 },
] as const;

const commitments: Commitment[] = [
  { id: 'audition-1', name: 'Neon Hearts', type: 'ACTING_GIG', roleType: 'LEAD', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'AUDITION', phaseWeeksLeft: 2, auditionPerformance: 44 },
  { id: 'promo-1', name: 'Last Light', type: 'ACTING_GIG', roleType: 'SUPPORTING', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'POST_PRODUCTION', phaseWeeksLeft: 6, promotionalBuzz: 61, lastPressAbsolute: (27 * 52) + 11 },
  { id: 'slate-1', name: 'Tomorrow City', type: 'ACTING_GIG', roleType: 'CAMEO', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'SCHEDULED', phaseWeeksLeft: 30 },
];
const relationships = [
  { id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: 55, image: '', lastInteractionWeek: 1, age: 64 },
  { id: 'partner', name: 'Sam', relation: 'Partner', closeness: 92, image: '', lastInteractionWeek: 11, age: 29 },
] as Relationship[];

const fixturePlayer = {
  ...INITIAL_PLAYER,
  name: 'Alexandria Catherine Montgomery-Winslow',
  age: 27,
  currentWeek: 12,
  money: 2_450_000,
  energy: { current: 71, max: 100 },
  commitments,
  relationships,
  stats: { ...INITIAL_PLAYER.stats, health: 82, body: 64, happiness: 76, looks: 68 },
};

const surfaceRoot: Record<string, string> = {
  career: '[data-ui="actor-empire-career-overhaul"]',
  improve: '[data-ui="actor-empire-improve-overhaul"]',
  social: '[data-ui="actor-empire-social-overhaul"]',
  lifestyle: '[data-ui="actor-empire-lifestyle-overhaul"]',
  store: '[data-ui="actor-empire-store-overhaul"]',
  settings: '.space-y-5.pb-24.pt-4',
};

type PageMetrics = {
  documentWidth: number;
  viewportWidth: number;
  rootWidth: number;
  rootRight: number;
  scrollHeight: number;
  clientHeight: number;
  scrollReachable: boolean;
  dockGap: number;
  controlRects: Array<{ selector: string; width: number; height: number }>;
  gridColumns: Record<string, number>;
  clippedLabels: string[];
};

const inspect = async (page: any, label: string): Promise<PageMetrics> => page.evaluate(({ selector, surface }: { selector: string; surface: string }) => {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error(`Missing page root ${selector}`);
  const rootRect = root.getBoundingClientRect();
  const scroll = root.querySelector<HTMLElement>('.ae-scroll') || root.closest<HTMLElement>('.ae-game-content') || root;
  const dock = document.querySelector<HTMLElement>('nav[aria-label="Primary game navigation"]');
  const beforeScroll = scroll.scrollTop;
  scroll.scrollTo(0, 100);
  const scrollReachable = scroll.scrollTop > beforeScroll;
  scroll.scrollTo(0, scroll.scrollHeight);
  const lastContent = (scroll.classList.contains('ae-scroll') ? scroll.lastElementChild : root.lastElementChild) as HTMLElement | null;
  const dockGap = dock && lastContent ? Math.round(dock.getBoundingClientRect().top - lastContent.getBoundingClientRect().bottom) : 0;
  scroll.scrollTo(0, beforeScroll);
  const controlSelectors: Record<string, string[]> = {
    career: ['.cr-ready', '.cr-pm', '.cr-task', '.cr-more-l'],
    improve: ['.si-allstats', '.ae-seg-b', '.si-run-x', '.si-tab'],
    social: ['.ae-seg-b', '.cx-q', '.cx-more', '.cx-back', '.cx-move'],
    lifestyle: ['.mc-card', '.lf-row'],
    store: ['.st-back', '.st-tab', '.st-ad', '.st-modal-actions button'],
    settings: ['button:first-child'],
  };
  const controls = (controlSelectors[surface] || []).flatMap(candidate => Array.from(root.querySelectorAll<HTMLElement>(candidate)).map(node => {
    const rect = node.getBoundingClientRect();
    return { selector: candidate, width: Math.round(rect.width), height: Math.round(rect.height) };
  }));
  const gridColumns: Record<string, number> = {};
  for (const candidate of ['.si-cond', '.si-rail', '.si-genres', '.cr-promo', '.cr-grid', '.st-ads', '.cx-duo']) {
    const node = root.querySelector<HTMLElement>(candidate);
    if (node) gridColumns[candidate] = getComputedStyle(node).gridTemplateColumns.split(' ').length;
  }
  const clippedLabels = Array.from(root.querySelectorAll<HTMLElement>('.si-dial-n, .si-gen-n, .cr-pm-n, .cr-slot b, .cr-player, .lf-row-n, .mc-f b, .st-ad-n, .st-item-n, button .truncate')).filter(node => {
    const style = getComputedStyle(node);
    return (style.overflow === 'hidden' || style.textOverflow === 'ellipsis')
      && (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1);
  }).map(node => `${node.className}: ${node.textContent?.trim()}`).slice(0, 12);
  return {
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    rootWidth: Math.round(rootRect.width),
    rootRight: Math.round(rootRect.right),
    scrollHeight: scroll.scrollHeight,
    clientHeight: scroll.clientHeight,
    scrollReachable,
    dockGap,
    controlRects: controls,
    gridColumns,
    clippedLabels,
  };
}, { selector: surfaceRoot[label], surface: label });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures: string[] = [];
  try {
    for (const viewport of VIEWPORTS.filter(item => !process.env.PHASE4_WIDTH || item.width === Number(process.env.PHASE4_WIDTH))) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const runtimeErrors: string[] = [];
      page.on('pageerror', (error: Error) => runtimeErrors.push(error.message));
      await page.addInitScript(({ player }) => {
        localStorage.clear();
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', '1.0.25');
        localStorage.setItem('aeMigrationCarePackageLedgerV1', JSON.stringify({ globalClaimed: true, fingerprints: [] }));
        localStorage.setItem('actorEmpireSave_1', JSON.stringify(player));
        localStorage.setItem('actorEmpireSave_1_meta', JSON.stringify({
          playerName: player.name, age: player.age, week: player.currentWeek,
          fame: player.stats.fame, totalPlayTimeMs: 0, savedAt: Date.now(),
        }));
      }, { player: fixturePlayer });
      await page.goto('http://127.0.0.1:5178/', { waitUntil: 'domcontentloaded' });
      await page.locator('#startBtn').click();
      await page.getByText(fixturePlayer.name, { exact: true }).click();
      await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();

      const visit = async (label: keyof typeof surfaceRoot, navigate: () => Promise<void>) => {
        await navigate();
        await page.locator(surfaceRoot[label]).waitFor();
        await page.waitForTimeout(150);
        const metrics = await inspect(page, label);
        const prefix = `${viewport.width}×${viewport.height} ${label}`;
        if (metrics.documentWidth > metrics.viewportWidth + 1) failures.push(`${prefix}: document overflow ${metrics.documentWidth} > ${metrics.viewportWidth}`);
        if (metrics.rootRight > metrics.viewportWidth + 1) failures.push(`${prefix}: page root exceeds viewport`);
        if (metrics.scrollHeight > metrics.clientHeight + 1 && !metrics.scrollReachable) failures.push(`${prefix}: overflowing content cannot scroll`);
        if (metrics.dockGap < -1) failures.push(`${prefix}: content overlaps the fixed navigation dock by ${-metrics.dockGap}px`);
        for (const control of metrics.controlRects) {
          if (control.width < 44 || control.height < 44) failures.push(`${prefix}: ${control.selector} target ${control.width}×${control.height}`);
        }
        if (metrics.clippedLabels.length) failures.push(`${prefix}: clipped labels ${metrics.clippedLabels.join(', ')}`);
        if (label === 'improve') {
          const expected = viewport.width >= 448 ? 4 : 2;
          if (metrics.gridColumns['.si-cond'] !== expected) failures.push(`${prefix}: Condition has ${metrics.gridColumns['.si-cond']} columns, expected ${expected}`);
        }
        if (label === 'career') {
          const expectedSchedule = viewport.width >= 430 ? 3 : 2;
          if (metrics.gridColumns['.cr-grid'] !== expectedSchedule) failures.push(`${prefix}: schedule has ${metrics.gridColumns['.cr-grid']} columns, expected ${expectedSchedule}`);
          const expectedActions = viewport.width >= 360 ? 2 : 1;
          if (metrics.gridColumns['.cr-promo'] !== expectedActions) failures.push(`${prefix}: promotion actions have ${metrics.gridColumns['.cr-promo']} columns, expected ${expectedActions}`);
        }
        if (viewport.width === 320 || viewport.width === 448) {
          await page.screenshot({ path: `/tmp/ae-phase4-${label}-${viewport.width}x${viewport.height}.png` });
        }
        console.log(`${prefix}: ${JSON.stringify(metrics)}`);
      };

      await visit('career', () => page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Career"]').click());
      await visit('improve', () => page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Improve"]').click());
      await page.locator('.si-allstats').click();
      const improveClose = await page.locator('.ae-sheet-wrap.is-open .ae-sheet-x').boundingBox();
      if (!improveClose || improveClose.width < 44 || improveClose.height < 44) failures.push(`${viewport.width}×${viewport.height} improve: shared sheet close target under 44×44`);
      await page.locator('.ae-sheet-wrap.is-open .ae-sheet-x').click();
      await page.getByRole('tab', { name: /WORKSHOPS/i }).click();
      await page.locator('.si-rail').waitFor();
      await page.getByRole('tab', { name: /GENRE LAB/i }).click();
      await page.locator('.si-genres').waitFor();
      await visit('social', () => page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Social"]').click());
      await page.getByRole('button', { name: 'Open Mom' }).click();
      const socialClose = await page.locator('.ae-sheet-wrap.is-open .ae-sheet-x').boundingBox();
      if (!socialClose || socialClose.width < 44 || socialClose.height < 44) failures.push(`${viewport.width}×${viewport.height} social: shared sheet close target under 44×44`);
      await page.locator('.ae-sheet-wrap.is-open .ae-sheet-x').click();
      await visit('lifestyle', () => page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Lifestyle"]').click());
      await page.locator('.mc-card').click();
      assert.equal(await page.locator('.mc-card.is-back').count(), 1, 'Lifestyle card breakdown should open without replacing the page');
      await page.locator('.mc-card').click();
      assert.equal(await page.locator('.mc-card.is-back').count(), 0, 'Lifestyle card should return to its front face');
      await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Home"]').click();
      await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();
      await visit('store', () => page.locator('.ae-tools button[aria-label="Store"]').click());
      const storeOptionRects = await page.locator('[data-store-tab="REWARDS"] .st-opt').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      if (storeOptionRects.some(rect => rect.width < 44 || rect.height < 44)) failures.push(`${viewport.width}×${viewport.height} store: skill/genre option target under 44×44`);
      await page.getByRole('tab', { name: /PREMIUM/i }).click();
      await page.locator('[data-store-tab="PREMIUM"]').waitFor();
      const storeBuy = page.locator('[data-store-tab="PREMIUM"] .st-buy:not(.is-owned)').first();
      const buyRect = await storeBuy.boundingBox();
      if (!buyRect || buyRect.width < 44 || buyRect.height < 44) failures.push(`${viewport.width}×${viewport.height} store: premium product action under 44×44`);
      await storeBuy.click();
      const modalButtons = await page.locator('.st-modal-actions button').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      if (modalButtons.some(rect => rect.width < 44 || rect.height < 44)) failures.push(`${viewport.width}×${viewport.height} store: purchase confirmation action under 44×44`);
      await page.locator('.st-modal .st-cancel').click();
      assert.equal(await page.locator('.st-modal').count(), 0, 'Cancelling the purchase must close the confirmation without purchasing');
      await page.getByRole('button', { name: 'Back to Home' }).click();
      await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor();
      await visit('settings', () => page.locator('.ae-tools button[aria-label="Settings"]').click());
      await page.getByRole('button', { name: /Performance.*Adaptive visuals/i }).click();
      const settingsSubBack = await page.getByRole('button', { name: 'Back to Settings' }).boundingBox();
      if (!settingsSubBack || settingsSubBack.width < 44 || settingsSubBack.height < 44) failures.push(`${viewport.width}×${viewport.height} settings: subpage back target under 44×44`);
      await page.getByRole('button', { name: 'Back to Settings' }).click();
      await page.getByRole('heading', { name: 'Settings' }).waitFor();

      if (runtimeErrors.length) failures.push(`${viewport.width}×${viewport.height}: runtime errors ${runtimeErrors.join('; ')}`);
      await page.close();
    }
    assert.deepEqual(failures, [], `Phase 4 responsive defects:\n${failures.join('\n')}`);
    console.log('Phase 4 main-page responsive browser audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
