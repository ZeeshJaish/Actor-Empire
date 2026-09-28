import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Commitment, type PendingEvent } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const title = 'Urgent Production Decision for a Major International Feature';
const project: Commitment = {
  id: 'crisis-project', name: 'Neon Hearts', type: 'ACTING_GIG', roleType: 'LEAD',
  energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'PRODUCTION', phaseWeeksLeft: 2,
};
const event: PendingEvent = {
  id: 'responsive-crisis', week: 12, type: 'PRODUCTION_CRISIS', title,
  description: 'A production problem requires a careful decision. The team needs a clear answer today, but each approach has meaningful trade-offs for the project and the people involved.',
  data: { projectId: project.id, options: [
    { index: 0, label: 'Pause the shoot and protect everyone working on set' },
    { index: 1, label: 'Rewrite the sequence with the crew and preserve the release date' },
    { index: 2, label: 'Reschedule the production with a carefully negotiated agreement' },
  ] },
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const player = { ...INITIAL_PLAYER, name: 'Crisis Layout Tester', age: 27, currentWeek: 12, commitments: [project], pendingEvents: [event] };
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
      await page.getByRole('heading', { name: title }).waitFor();
      const metrics = await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h2')).find(node => node.textContent?.includes('Urgent Production'));
        const modal = heading?.closest<HTMLElement>('.max-w-md');
        if (!modal) throw new Error('Production crisis dialog missing');
        const rect = modal.getBoundingClientRect();
        const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>('button'));
        const scrollBody = modal.querySelector<HTMLElement>('.custom-scrollbar');
        if (!scrollBody) throw new Error('Production crisis scroll body missing');
        scrollBody.scrollTo(0, scrollBody.scrollHeight);
        const last = buttons.at(-1)?.getBoundingClientRect();
        return { documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
          modal: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          clientHeight: scrollBody.clientHeight, scrollHeight: scrollBody.scrollHeight,
          overflowY: getComputedStyle(scrollBody).overflowY,
          optionCount: buttons.length, lastOptionBottom: last?.bottom ?? 0 };
      });
      console.log(`${viewport.width}×${viewport.height} production crisis: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.documentWidth, metrics.viewportWidth, 'Crisis must not cause horizontal page overflow');
      assert.ok(metrics.modal.left >= 0 && metrics.modal.right <= viewport.width, 'Crisis dialog must fit horizontally');
      assert.ok(metrics.modal.top >= 0 && metrics.modal.bottom <= viewport.height, 'Crisis dialog must fit the visible height');
      assert.equal(metrics.optionCount, 3, 'All three options must render');
      assert.ok(metrics.scrollHeight <= metrics.clientHeight + 1 || metrics.overflowY === 'auto', 'Overflowing crisis choices must scroll within the dialog');
      assert.ok(metrics.lastOptionBottom <= metrics.modal.bottom + 1, 'The final crisis option must be reachable within the visible dialog');
      await page.screenshot({ path: `/tmp/ae-phase5-production-crisis-${viewport.width}x${viewport.height}.png` });
      await page.close();
    }
    console.log('Phase 5 production crisis layout audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
