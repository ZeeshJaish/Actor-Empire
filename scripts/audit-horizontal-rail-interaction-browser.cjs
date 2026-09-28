const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
    await page.goto('http://127.0.0.1:5178/phase5-studio-dashboard-qa.html', { waitUntil: 'domcontentloaded' });
    await page.getByText('Active Slate').waitFor();

    const rail = page.locator('.no-scrollbar').nth(1);
    await rail.evaluate((element) => {
      for (let index = 0; index < 3; index += 1) {
        const card = document.createElement('div');
        card.style.cssText = 'flex: 0 0 140px; height: 210px';
        element.appendChild(card);
      }
    });
    await rail.scrollIntoViewIfNeeded();
    const before = await rail.evaluate((element) => ({
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
    }));
    assert.ok(before.scrollWidth > before.clientWidth, 'Active Slate must have horizontal content to test');
    const projectTile = rail.locator('button').first();
    await projectTile.evaluate((element) => {
      window.__railClickCount = 0;
      element.addEventListener('click', () => { window.__railClickCount += 1; });
    });
    const box = await projectTile.boundingBox();
    assert.ok(box, 'New Project tile must be visible for drag testing');
    const startX = box.x + Math.min(100, box.width - 10);
    const y = box.y + box.height / 2;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX - 85, y, { steps: 8 });
    await page.mouse.up();
    const after = await rail.evaluate((element) => element.scrollLeft);
    assert.ok(after > before.scrollLeft + 20, 'Dragging a project card must scroll the Active Slate without using a scrollbar');
    assert.equal(before.scrollbarWidth, 'none', 'Shared horizontal rails must not show a visible scrollbar track');
    assert.equal(await page.evaluate(() => window.__railClickCount), 0, 'Dragging must not activate the project tile');
    await page.getByText('Active Slate').waitFor();
    await projectTile.click();
    assert.equal(await page.evaluate(() => window.__railClickCount), 1, 'A normal tap after dragging must still activate the tile');

    for (const className of ['hide-scrollbar', 'custom-scrollbar']) {
      const extraRail = await page.evaluate((name) => {
        const element = document.createElement('div');
        element.className = name;
        element.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;width:200px;height:60px;overflow-x:auto;display:flex;background:#111';
        const card = document.createElement('button');
        card.style.cssText = 'flex:0 0 500px;height:60px';
        card.textContent = 'Rail test';
        element.appendChild(card);
        document.body.appendChild(element);
        return name;
      }, className);
      const locator = page.locator(`.${extraRail}`).last();
      const extraBox = await locator.boundingBox();
      assert.ok(extraBox);
      await page.mouse.move(extraBox.x + 150, extraBox.y + 30);
      await page.mouse.down();
      await page.mouse.move(extraBox.x + 50, extraBox.y + 30, { steps: 8 });
      await page.mouse.up();
      assert.ok(await locator.evaluate((element) => element.scrollLeft) > 20, `${className} rail must drag`);
      if (className === 'hide-scrollbar') {
        assert.equal(await locator.evaluate((element) => getComputedStyle(element).scrollbarWidth), 'none');
      }
      await locator.evaluate((element) => element.remove());
    }

    const touchContext = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
    const touchPage = await touchContext.newPage();
    await touchPage.goto('http://127.0.0.1:5178/phase5-studio-dashboard-qa.html', { waitUntil: 'domcontentloaded' });
    await touchPage.getByText('Active Slate').waitFor();
    const touchRail = touchPage.locator('.no-scrollbar').nth(1);
    await touchRail.evaluate((element) => {
      for (let index = 0; index < 3; index += 1) {
        const card = document.createElement('div');
        card.style.cssText = 'flex: 0 0 140px; height: 210px';
        element.appendChild(card);
      }
    });
    await touchRail.scrollIntoViewIfNeeded();
    const touchBox = await touchRail.locator('button').first().boundingBox();
    assert.ok(touchBox, 'Touch target must be visible');
    const touchX = touchBox.x + Math.min(100, touchBox.width - 10);
    const touchY = touchBox.y + touchBox.height / 2;
    const cdp = await touchContext.newCDPSession(touchPage);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchX, y: touchY }] });
    for (let offset = 10; offset <= 100; offset += 10) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchX - offset, y: touchY }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const touchAfter = await touchRail.evaluate((element) => element.scrollLeft);
    assert.ok(touchAfter > 20, 'Finger swipe must scroll the Active Slate natively');
    const visibleTracks = await touchPage.locator('.no-scrollbar').evaluateAll((elements) => elements.filter(
      (element) => element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).scrollbarWidth !== 'none',
    ).length);
    assert.equal(visibleTracks, 0, 'Every shared rail on this screen must hide its scrollbar track');
    await touchContext.close();
    console.log(`Horizontal rail audit passed: mouse drag ${Math.round(after - before.scrollLeft)}px, finger swipe ${Math.round(touchAfter)}px, no visible tracks.`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
