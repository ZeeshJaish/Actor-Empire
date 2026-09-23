import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const playwrightPath = process.env.PLAYWRIGHT_MODULE
  || '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chromium }: { chromium: any } = require(playwrightPath);
type BrowserPage = any;

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const evidenceDir = '/tmp/actor-empire-phase7';
mkdirSync(evidenceDir, { recursive: true });

const viewports = [
  { width: 393, height: 600 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 1440, height: 900 },
] as const;
const buildStates = ['empty', 'configured', 'blocked', 'failed', 'commissioned', 'construction', 'complete'] as const;
const openingStates = ['executing', 'action', 'ready', 'live'] as const;

const duplicateIds = async (page: BrowserPage) => page.evaluate(() => {
  const ids = Array.from(document.querySelectorAll('[id]')).map(node => node.id);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
});

const assertFits = async (page: BrowserPage, label: string) => {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(metrics.document <= metrics.viewport && metrics.body <= metrics.viewport,
    `${label} must not create horizontal overflow: ${JSON.stringify(metrics)}`);
  assert.deepEqual(await duplicateIds(page), [], `${label} must not render duplicate element ids.`);
};

const assertNamedButtons = async (page: BrowserPage, label: string) => {
  const unnamed = await page.locator('button:visible').evaluateAll((buttons: HTMLButtonElement[]) => buttons.flatMap((button: HTMLButtonElement) => {
    const text = (button.textContent || '').trim();
    const name = button.getAttribute('aria-label') || button.getAttribute('title') || text;
    return name ? [] : [button.outerHTML.slice(0, 180)];
  }));
  assert.deepEqual(unnamed, [], `${label} must not expose unnamed visible buttons.`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const errors: string[] = [];
    const page = await browser.newPage();
    page.on('pageerror', (error: Error) => errors.push(error.message));

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const state of buildStates) {
        const url = `${baseUrl}/lab.html?bare=1&state=${state}&stage=${state === 'empty' ? 'SITES' : 'LAUNCH'}&markets=US,GB,DE,IN,BR,AU&fill=NA:2T4W+c40@NORTHWIND,EU:8W+c30@ATLAS,AS:4S2W+c20@MERIDIAN`;
        await page.goto(url, { waitUntil: 'networkidle' });
        const label = `Build ${state} at ${viewport.width}x${viewport.height}`;
        console.log(`Checking ${label}`);
        try {
          await page.locator('.sf.bw').waitFor({ timeout: 8_000 });
        } catch (error) {
          const body = await page.locator('body').innerText().catch(() => 'Body unavailable');
          throw new Error(`${label} did not mount. Page errors: ${errors.join(' | ') || 'none'}; body: ${body.slice(0, 500)}`, { cause: error });
        }
        await assertFits(page, label);
        await assertNamedButtons(page, label);
        if (await page.locator('.sf-scroll').count()) {
          await page.locator('.sf-scroll').evaluate((element: HTMLElement) => { element.scrollTop = element.scrollHeight; });
          const overlap = await page.evaluate(() => {
            const body = document.querySelector('.sf-scroll');
            const footer = document.querySelector('.lw-foot');
            if (!body || !footer) return false;
            const last = body.lastElementChild?.getBoundingClientRect();
            const foot = footer.getBoundingClientRect();
            return Boolean(last && last.bottom > foot.top + 1);
          });
          assert.equal(overlap, false, `${label} must leave the final content reachable above the action dock.`);
        }
        await page.screenshot({ path: `${evidenceDir}/build-${state}-${viewport.width}x${viewport.height}.png`, fullPage: false });
      }

      for (const state of openingStates) {
        await page.goto(`${baseUrl}/scripts/fixtures/streaming-opening-programme.html?state=${state}`, { waitUntil: 'networkidle' });
        const label = `Opening Programme ${state} at ${viewport.width}x${viewport.height}`;
        console.log(`Checking ${label}`);
        await page.locator('.sop').waitFor({ timeout: 8_000 });
        await assertFits(page, label);
        await assertNamedButtons(page, label);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const overlap = await page.evaluate(() => {
          const content = document.querySelector('.sop-workstreams');
          const actions = document.querySelector('.sop-actions');
          if (!content || !actions) return false;
          return content.getBoundingClientRect().bottom > actions.getBoundingClientRect().top + 1;
        });
        assert.equal(overlap, false, `${label} must leave all workstreams reachable above the action dock.`);
        await page.screenshot({ path: `${evidenceDir}/opening-${state}-${viewport.width}x${viewport.height}.png`, fullPage: false });
      }
    }

    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`${baseUrl}/lab.html?bare=1&state=configured&stage=LAUNCH`, { waitUntil: 'networkidle' });
    const trimmedReadiness = await page.locator('.bw-sign-list em').evaluateAll((nodes: HTMLElement[]) => nodes.filter((node: HTMLElement) => {
      const style = getComputedStyle(node);
      return style.textOverflow === 'ellipsis' || node.scrollWidth > node.clientWidth + 1;
    }).map((node: HTMLElement) => node.textContent));
    assert.deepEqual(trimmedReadiness, [], 'Build launch-readiness explanations must be fully readable.');

    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'BODY',
      'Keyboard navigation must enter the Build controls.');

    // The interaction path uses the same controls a player touches in the real
    // Build: map, region disclosure, machines, provider, compute, details and
    // the four-stage navigation. It is intentionally run after screenshots so
    // mutations cannot contaminate the visual-state matrix.
    await page.goto(`${baseUrl}/lab.html?bare=1&state=configured&stage=network&markets=US,GB,DE,IN,BR,AU&fill=NA:2T4W+c40@NORTHWIND,EU:8W+c30@ATLAS,AS:4S2W+c20@MERIDIAN`, { waitUntil: 'networkidle' });
    const europeMapControl = page.getByRole('button', { name: 'Scout EU' });
    await europeMapControl.focus();
    await page.keyboard.press('Enter');
    const mapScope = page.locator('.bw-net-crumb button').last();
    await mapScope.waitFor();
    assert.equal((await mapScope.innerText()).trim(), 'EUROPE',
      'Keyboard activation on the SVG map must move the atlas into that region.');

    const europeRegion = page.getByRole('button', { name: /Europe 2 countries/ });
    if ((await europeRegion.getAttribute('aria-expanded')) !== 'true') await europeRegion.click();
    const buildHeader = page.locator('.sf-head-titles p');
    const rackCountBefore = await buildHeader.innerText();
    await page.getByRole('button', { name: 'One more Workhorse in Europe' }).click();
    const rackCountAfter = await buildHeader.innerText();
    assert.notEqual(rackCountAfter, rackCountBefore, 'Adding a regional server must update the canonical Build total immediately.');
    const northwind = page.getByRole('button', { name: /Northwind/ });
    await northwind.click();
    assert.equal(await northwind.getAttribute('aria-pressed'), 'true',
      'Cloud provider selection must remain connected to the region draft.');
    const compute = page.getByRole('slider', { name: 'Cloud compute in Europe' });
    await compute.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(Number(await compute.inputValue()), 1, 'Cloud compute must respond to keyboard input.');
    const landedRooms = page.locator('summary').filter({ hasText: /Where they landed/i });
    await landedRooms.click();
    assert.equal(await landedRooms.locator('..').getAttribute('open'), '',
      'Room detail disclosure must expose landed-room evidence.');

    await page.getByRole('button', { name: 'NEXT · MONEY' }).click();
    await page.getByRole('heading', { name: 'CAN THE COMPANY AFFORD ALL OF THIS?' }).waitFor();
    await page.getByRole('button', { name: 'NEXT · TEST' }).click();
    const loadButton = page.getByRole('button', { name: 'TEST THE LOAD' });
    assert.equal(await loadButton.isDisabled(), true, 'The lab must represent an unavailable rehearsal handler honestly.');
    await page.getByText(/rehearsal service is unavailable/i).waitFor();
    await page.getByRole('button', { name: 'NEXT · LAUNCH' }).click();
    await page.getByRole('heading', { name: 'IS THIS THE NETWORK YOU WILL PAY FOR?' }).waitFor();
    const commissionBelow = page.getByRole('button', { name: 'COMMISSION BELOW' });
    assert.equal(await commissionBelow.getAttribute('aria-describedby'), 'bw-commission-guidance',
      'The locked commission dock must point to the exact launch blockers.');
    await page.locator('.lw-foot .sf-btn--ghost').click();
    await page.getByRole('heading', { name: 'WHAT WILL OPENING NIGHT ACTUALLY FEEL LIKE?' }).waitFor();

    await page.goto(`${baseUrl}/scripts/fixtures/streaming-opening-programme.html?state=action`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Resolve government request' }).click();
    await page.getByText('The revised application is under review.').waitFor();

    const reduced = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(`${baseUrl}/lab.html?bare=1&state=configured&stage=TEST`, { waitUntil: 'networkidle' });
    const animated = await reducedPage.locator('.sf.bw').evaluate((root: Element) => Array.from(root.querySelectorAll('*')).flatMap((node: Element) => {
      const style = getComputedStyle(node);
      const durations = style.animationDuration.split(',').map(value => Number.parseFloat(value) || 0);
      return durations.some((duration: number) => duration > .001) ? [`${String(node.className)}: ${style.animationDuration}`] : [];
    }).slice(0, 12));
    assert.deepEqual(animated, [], 'Reduced motion must resolve Build animations immediately.');
    await reduced.close();

    assert.equal(errors.length, 0, `Phase 7 browser matrix emitted page errors: ${errors.join(' | ')}`);
    console.log(`Streaming Claude UI responsive audit passed. Evidence: ${evidenceDir}`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
