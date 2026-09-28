import assert from 'node:assert/strict';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const viewports = [{ width: 320, height: 568 }, { width: 448, height: 956 }];

const measure = async (page: any) => page.evaluate(() => {
  const stage = document.querySelector<HTMLElement>('.sa-stage')!;
  const back = stage.querySelector<HTMLButtonElement>('.sa-backbtn');
  const rect = stage.getBoundingClientRect();
  const backRect = back?.getBoundingClientRect();
  return {
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    stageLeft: rect.left, stageRight: rect.right, stageTop: rect.top, stageBottom: rect.bottom,
    back: backRect ? { width: backRect.width, height: backRect.height, top: backRect.top } : null,
    horizontalScroll: Array.from(stage.querySelectorAll<HTMLElement>('*')).filter(node => {
      const style = getComputedStyle(node);
      return node.scrollWidth > node.clientWidth + 2 && !['auto', 'scroll'].includes(style.overflowX);
    }).slice(0, 4).map(node => ({ className: node.className, text: node.textContent?.trim().slice(0, 45) })),
  };
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on('pageerror', (error: Error) => errors.push(error.message));
      await page.goto('http://127.0.0.1:5178/phase5-acquisition-qa.html', { waitUntil: 'domcontentloaded' });
      await page.getByRole('dialog', { name: /acquisition deal room/i }).waitFor();
      const dossier = await measure(page);
      console.log(`${viewport.width}×${viewport.height} acquisition dossier: ${JSON.stringify(dossier)}`);
      assert.equal(dossier.documentWidth, dossier.viewportWidth, 'Acquisition dossier must not overflow the document');
      assert.ok(dossier.stageLeft >= 0 && dossier.stageRight <= viewport.width, 'Acquisition stage must fit horizontally');
      assert.ok(dossier.back && dossier.back.width >= 44 && dossier.back.height >= 44, 'Acquisition Back target must be at least 44px');
      await page.getByRole('button', { name: /run due diligence/i }).click();
      await page.waitForTimeout(400);
      const sheet = await page.locator('.sa-sheet').evaluate((node: HTMLElement) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight };
      });
      console.log(`${viewport.width}×${viewport.height} acquisition diligence sheet: ${JSON.stringify(sheet)}`);
      assert.ok(sheet.top >= 0 && sheet.bottom <= viewport.height, 'Diligence sheet must fit visible height');
      await page.locator('.sa-veil').click({ position: { x: 5, y: 5 } });
      await page.getByRole('button', { name: /bid blind/i }).click();
      const warRoom = await measure(page);
      console.log(`${viewport.width}×${viewport.height} acquisition war room: ${JSON.stringify(warRoom)}`);
      assert.equal(warRoom.documentWidth, warRoom.viewportWidth, 'War room must not overflow the document');
      assert.ok(warRoom.back && warRoom.back.width >= 44 && warRoom.back.height >= 44, 'War room Back target must be at least 44px');
      const warRoomButtons = await page.locator('.sa-warroom button').evaluateAll((nodes: HTMLButtonElement[]) => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { name: node.textContent?.trim().slice(0, 45), width: rect.width, height: rect.height };
      }));
      console.log(`${viewport.width}×${viewport.height} war-room buttons: ${JSON.stringify(warRoomButtons)}`);
      assert.ok(warRoomButtons.every((button: { width: number; height: number }) => button.width >= 44 && button.height >= 44), 'War-room controls must meet the 44px target floor');
      await page.getByRole('button', { name: /minority stake/i }).click();
      await page.locator('.sa-warroom .sa-backbtn').click();
      await page.locator('.sa-dossier').waitFor();
      await page.getByRole('button', { name: /bid blind/i }).click();
      assert.match(await page.locator('.sa-struct.on').textContent() || '', /Minority Stake/, 'Unsubmitted deal structure must survive Back and return');
      await page.locator('.sa-warroom .sa-backbtn').click();
      await page.locator('.sa-dossier').waitFor();
      assert.deepEqual(errors, [], 'No runtime errors');
      await page.screenshot({ path: `/tmp/ae-phase5-acquisition-dossier-${viewport.width}x${viewport.height}.png` });
      await page.close();

      const signingPage = await browser.newPage({ viewport });
      const signingErrors: string[] = [];
      signingPage.on('pageerror', (error: Error) => signingErrors.push(error.message));
      await signingPage.goto('http://127.0.0.1:5178/phase5-acquisition-qa.html?mode=signing', { waitUntil: 'domcontentloaded' });
      await signingPage.locator('.sa-signing').waitFor();
      for (let clause = 0; clause < 3; clause++) {
        const bounds = await measure(signingPage);
        console.log(`${viewport.width}×${viewport.height} acquisition clause ${clause + 1}: ${JSON.stringify(bounds)}`);
        assert.equal(bounds.documentWidth, bounds.viewportWidth, 'Contract clause must not overflow the document');
        assert.ok(bounds.back && bounds.back.width >= 44 && bounds.back.height >= 44, 'Signing Back target must be at least 44px');
        await signingPage.getByRole('button', { name: /confirm clause.*next/i }).click();
      }
      const signature = signingPage.getByRole('button', { name: /tap to sign/i });
      await signature.scrollIntoViewIfNeeded();
      const signatureRect = await signature.evaluate((node: HTMLElement) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
      console.log(`${viewport.width}×${viewport.height} acquisition signature reachability: ${JSON.stringify(signatureRect)}`);
      assert.ok(signatureRect.top >= 0 && signatureRect.bottom <= viewport.height, 'Signature line must be reachable without signing');
      assert.ok(signatureRect.width >= 44 && signatureRect.height >= 44, 'Signature line must meet the 44px target floor');
      await signingPage.screenshot({ path: `/tmp/ae-phase5-acquisition-signing-${viewport.width}x${viewport.height}.png` });
      assert.deepEqual(signingErrors, [], 'Signing scene must have no runtime errors');
      await signingPage.close();
    }
    console.log('Phase 5 acquisition dossier and war-room audit passed.');
  } finally {
    await browser.close();
  }
})().catch((error: Error) => { console.error(error); process.exitCode = 1; });
