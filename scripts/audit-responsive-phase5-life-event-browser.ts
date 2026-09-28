import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type LifeEvent, type PendingEvent } from '../types';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const lifeEvent: LifeEvent = {
  id: 'responsive-life-event', type: 'LIFE', title: 'An Unexpected Invitation From the International Film Community',
  description: 'A cross-border group offers a complex role. Your choice changes the direction of your career and relationships.',
  options: [
    { id: 'safe', label: 'Accept the invitation and protect your creative independence', description: 'A long, deliberate choice with a clear outcome.', noEffect: true },
    { id: 'bold', label: 'Negotiate a stronger deal with a very long role description', description: 'Ask for more creative control before committing.', noEffect: true, isGolden: true },
    { id: 'decline', label: 'Politely decline', description: 'Keep your current commitments intact.', noEffect: true },
  ],
};
const event: PendingEvent = { id: 'responsive-event', week: 12, type: 'LIFE_EVENT', title: lifeEvent.title, data: { lifeEvent } };

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 400 }, { width: 320, height: 568 }, { width: 448, height: 956 }]) {
      const page = await browser.newPage({ viewport });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const player = { ...INITIAL_PLAYER, name: 'Event Layout Tester', age: 27, currentWeek: 12, pendingEvents: [event] };
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
      await page.getByRole('heading', { name: lifeEvent.title }).waitFor();
      const metrics = await page.evaluate(() => {
        const title = Array.from(document.querySelectorAll('h2')).find(node => node.textContent?.includes('Unexpected Invitation'));
        const modal = title?.closest<HTMLElement>('.max-w-md');
        const scroll = modal?.querySelector<HTMLElement>('.overflow-y-auto');
        if (!modal || !scroll) throw new Error('Life event dialog or scroll body missing');
        const modalRect = modal.getBoundingClientRect();
        const labels = Array.from(modal.querySelectorAll<HTMLSpanElement>('button span.text-sm.font-bold'));
        const before = scroll.scrollTop;
        scroll.scrollTo(0, scroll.scrollHeight);
        const reached = scroll.scrollTop > before || scroll.scrollHeight <= scroll.clientHeight + 1;
        return { documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
          modal: { left: modalRect.left, right: modalRect.right, top: modalRect.top, bottom: modalRect.bottom },
          scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight, reached,
          labels: labels.map(label => {
            const rect = label.getBoundingClientRect();
            return { text: label.textContent?.trim(), left: rect.left, right: rect.right,
              clipped: label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1 };
          }) };
      });
      console.log(`${viewport.width}×${viewport.height} life event: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.documentWidth, metrics.viewportWidth, 'Life event must not cause horizontal page overflow');
      assert.ok(metrics.modal.left >= 0 && metrics.modal.right <= viewport.width && metrics.modal.top >= 0 && metrics.modal.bottom <= viewport.height, 'Life event dialog must stay in visible area');
      assert.ok(metrics.reached, 'Life event options must remain reachable on short screen');
      assert.equal(metrics.labels.length, 3, 'All three event options must remain visible in the flow');
      assert.ok(metrics.labels.every(label => !label.clipped && label.left >= metrics.modal.left && label.right <= metrics.modal.right), 'Every option label must fit inside the dialog');
      await page.setViewportSize({ width: viewport.width, height: Math.min(viewport.height, 400) });
      assert.equal(await page.getByRole('heading', { name: lifeEvent.title }).count(), 1, 'Life event lost its pending choice on resize');
      await page.setViewportSize(viewport);
      await page.screenshot({ path: `/tmp/ae-phase5-life-event-${viewport.width}x${viewport.height}.png` });
      await page.close();
    }
    console.log('Phase 5 life-event layout audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
