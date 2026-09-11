const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.RELEASE_WIZARD_FIXTURE_URL
  || 'http://127.0.0.1:5178/scripts/fixtures/release-wizard-transplant.html';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  try {
    const assertResponsivePhase = async (viewport, mode, options = {}) => {
      const responsive = await browser.newPage({ viewport });
      const phaseErrors = [];
      responsive.on('pageerror', error => phaseErrors.push(error.message));
      try {
        await responsive.goto(`${URL}?mode=${mode}`);
        await responsive.waitForLoadState('networkidle');
        if (options.enterCalendar) {
          await responsive.getByRole('button', { name: 'Skip Festivals' }).click();
          await responsive.getByRole('button', { name: 'CONTINUE' }).click();
        }
        const layout = await responsive.evaluate(() => {
          const root = document.querySelector('[data-ui="release-strategy-transplant"]');
          const progress = document.querySelector('[aria-label="Release strategy progress"]');
          const body = root?.querySelector('main') || root?.querySelector('[data-war-room]');
          if (!root || !body) return null;
          const rootRect = root.getBoundingClientRect();
          body.scrollTop = body.scrollHeight;
          return {
            documentWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            rootLeft: rootRect.left,
            rootRight: rootRect.right,
            rootTop: rootRect.top,
            rootBottom: rootRect.bottom,
            segmentCount: progress?.querySelectorAll('i').length || 0,
            bodyClientWidth: body.clientWidth,
            bodyScrollWidth: body.scrollWidth,
          };
        });
        assert.ok(layout, `${mode} ${viewport.width}x${viewport.height} did not render the release shell`);
        assert.equal(layout.documentWidth, layout.clientWidth, `${mode} ${viewport.width}x${viewport.height} overflows the viewport`);
        assert.ok(layout.rootLeft <= 0.5 && layout.rootRight >= viewport.width - 0.5, `${mode} ${viewport.width}x${viewport.height} does not fill the viewport`);
        assert.ok(layout.rootTop <= 0.5 && layout.rootBottom >= viewport.height - 0.5, `${mode} ${viewport.width}x${viewport.height} does not fill the height`);
        assert.equal(layout.segmentCount, options.takeover ? 0 : 6, `${mode} ${viewport.width}x${viewport.height} has the wrong progress count`);
        assert.ok(layout.bodyScrollWidth <= layout.bodyClientWidth, `${mode} ${viewport.width}x${viewport.height} body overflows horizontally`);

        const primary = responsive.getByRole('button', { name: options.primary || /CONTINUE|TAKE|LOCK STRATEGY/ }).last();
        await primary.scrollIntoViewIfNeeded();
        const buttonRect = await primary.boundingBox();
        assert.ok(buttonRect, `${mode} ${viewport.width}x${viewport.height} primary action is not reachable`);
        assert.ok(buttonRect.x >= -0.5 && buttonRect.x + buttonRect.width <= viewport.width + 0.5, `${mode} ${viewport.width}x${viewport.height} primary action is clipped: ${JSON.stringify(buttonRect)}`);
        assert.ok(buttonRect.y + buttonRect.height <= viewport.height + 0.5, `${mode} ${viewport.width}x${viewport.height} primary action is below the viewport after scrolling`);
        assert.deepEqual(phaseErrors, [], `${mode} ${viewport.width}x${viewport.height} emitted page errors`);
      } finally {
        await responsive.close();
      }
    };

    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(URL);
    await page.waitForLoadState('networkidle');

    assert.equal(await page.locator('[data-ui="release-strategy-transplant"]').count(), 1);
    assert.equal(await page.getByRole('heading', { name: 'Distribution' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: /Theatrical/ }).count(), 1);
    assert.equal(await page.getByRole('button', { name: /Streaming/ }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'CONTINUE' }).isDisabled(), true);
    await page.getByRole('button', { name: /Theatrical/ }).click();
    assert.equal(await page.getByRole('button', { name: 'CONTINUE' }).isEnabled(), true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `Distribution fixture overflows horizontally by ${overflow}px`);
    assert.deepEqual(errors, []);

    await page.goto(`${URL}?mode=desk`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByText('WHERE IT OPENS', { exact: true }).count(), 1);
    assert.equal(await page.getByRole('img', { name: 'Interactive theatrical release map' }).count(), 1);
    await page.locator('.region-map-hit-area').first().click();
    await page.getByRole('button', { name: 'Nova Circuit', exact: true }).click();
    assert.match(await page.getByText(/screens/).first().textContent() || '', /[0-9,]+ screens/);
    assert.equal(await page.getByRole('button', { name: 'CONTINUE' }).isEnabled(), true);
    const continueAppearance = await page.getByRole('button', { name: 'CONTINUE' }).evaluate(button => {
      const style = getComputedStyle(button);
      return { backgroundColor: style.backgroundColor, color: style.color };
    });
    assert.notEqual(continueAppearance.backgroundColor, 'rgba(0, 0, 0, 0)', 'Continue button lost the supplied filled treatment');
    assert.equal(continueAppearance.color, 'rgb(18, 16, 13)', 'Continue button has the wrong ink colour');

    await page.goto(`${URL}?mode=war`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('heading', { name: 'The War Room' }).count(), 0, 'War Room must take over the screen without the wizard heading');
    assert.equal(await page.getByText('BEST ESTIMATED DEAL VALUE', { exact: true }).count(), 1);
    assert.equal(await page.getByText('STANDING OFFERS', { exact: false }).count(), 1);
    await page.getByRole('button', { name: 'Netflix offer details' }).click();
    assert.equal(await page.getByText('$120M', { exact: true }).count(), 1);
    assert.equal(await page.getByText('18%', { exact: true }).count(), 1);
    assert.equal(await page.getByText('104 weeks', { exact: true }).count(), 1);
    assert.equal(await page.getByText('ESTIMATED TOTAL', { exact: true }).count(), 1);
    assert.equal(await page.getByText('FORECAST BACKEND', { exact: true }).count(), 1);
    assert.equal(await page.getByText('$22.0M', { exact: true }).count(), 1);
    const canalRow = page.locator('article').filter({ has: page.getByRole('button', { name: 'CANAL+ offer details' }) });
    const canalLayout = await canalRow.evaluate(row => {
      const buttons = row.querySelectorAll('button');
      const offerHead = buttons[0];
      const action = buttons[1];
      const financialTerms = offerHead?.querySelector('span');
      const scopeStamp = row.querySelector('[data-offer-scope-stamp]');
      const estimatedTotal = row.querySelector('[data-offer-estimated-total]');
      const rowRect = row.getBoundingClientRect();
      const stampRect = scopeStamp?.getBoundingClientRect();
      return {
        actionFirstLine: action?.innerText.split('\n')[0],
        actionWidth: action?.getBoundingClientRect().width || 0,
        termsFit: Boolean(financialTerms && financialTerms.scrollWidth <= financialTerms.clientWidth),
        scopeStamp: scopeStamp?.textContent?.trim(),
        scopeStampOutsideDetailsButton: Boolean(scopeStamp && offerHead && !offerHead.contains(scopeStamp)),
        scopeStampOnTopBorder: Boolean(stampRect && Math.abs(stampRect.top - rowRect.top) <= 2),
        estimatedTotal: estimatedTotal?.innerText?.replace(/\s+/g, ' ').trim(),
      };
    });
    assert.equal(canalLayout.actionFirstLine, 'TAKE', 'deal type belongs in the badge, not the action label');
    assert.ok(canalLayout.actionWidth <= 82, `TAKE action is too wide at 393px: ${canalLayout.actionWidth}px`);
    assert.equal(canalLayout.termsFit, true, 'CANAL+ guarantee and backend terms are clipped');
    assert.equal(canalLayout.scopeStamp, 'SHARED', 'the deal scope stamp is missing');
    assert.equal(canalLayout.scopeStampOutsideDetailsButton, true, 'the scope stamp still consumes offer-detail row width');
    assert.equal(canalLayout.scopeStampOnTopBorder, true, 'the scope stamp is not anchored to the card border');
    assert.match(canalLayout.estimatedTotal || '', /^EST\. TOTAL \$/, 'the projected value is not clearly labelled as an estimate');
    const netflixRow = page.locator('article').filter({ has: page.getByRole('button', { name: 'Netflix offer details' }) });
    await netflixRow.getByRole('button', { name: /TAKE/ }).click();
    assert.deepEqual(await page.evaluate(() => window.__releaseFixture.acceptedOfferIds), ['offer-netflix-r2']);

    await page.goto(`${URL}?mode=campaign`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByText('$141M–$221M', { exact: true }).count(), 1);
    assert.equal(await page.getByText('$88.1M AVAILABLE', { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Increase Trailer Launch' }).click({ clickCount: 3 });
    assert.equal(await page.getByTestId('channel-TRAILER_LAUNCH-value').textContent(), '$26.4M');
    assert.equal(await page.getByTestId('campaign-remaining').textContent(), '$61.7M');

    await page.goto(`${URL}?mode=festivals`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('button', { name: /Cannes/ }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name: /Sundance/ }).isDisabled(), true);
    await page.getByRole('button', { name: 'Skip Festivals' }).click();
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    assert.equal(await page.locator('[data-release-week]').count(), 52);
    await page.getByRole('button', { name: 'Week 2 next year' }).click();
    assert.equal(await page.getByText('NEXT YEAR', { exact: true }).count(), 1);
    assert.equal(await page.getByText('YOUR DATE', { exact: true }).count(), 1);

    const viewports = [
      { width: 320, height: 740 },
      { width: 360, height: 800 },
      { width: 393, height: 852 },
      { width: 412, height: 915 },
      { width: 430, height: 932 },
    ];
    const phases = [
      ['distribution', {}],
      ['desk', {}],
      ['war', { primary: /TAKE/, takeover: true }],
      ['campaign', {}],
      ['festivals', {}],
      ['festivals', { enterCalendar: true, primary: 'REVIEW' }],
      ['finalize', { primary: /LOCK STRATEGY/ }],
    ];
    for (const viewport of viewports) {
      for (const [mode, options] of phases) await assertResponsivePhase(viewport, mode, options);
    }

    assert.deepEqual(errors, []);

    console.log('Release Wizard presentation browser audit passed all seven phases at five target viewports.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
