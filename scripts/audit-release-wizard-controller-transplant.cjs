const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.RELEASE_WIZARD_FIXTURE_URL
  || 'http://127.0.0.1:5178/scripts/fixtures/release-wizard-transplant.html?mode=controller';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const capture = async (page, route, phase) => {
      await page.waitForTimeout(550);
      await page.screenshot({ path: `/private/tmp/actor-empire-release-wizard-${route}-${phase}-393x852.png` });
    };
    const assertNoHorizontalOverflow = async (page, label) => {
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      assert.equal(dimensions.scrollWidth, dimensions.clientWidth, `${label} horizontally overflows`);
    };
    const assertPhaseStartsAtTop = async (page, label) => {
      const scrollTop = await page.locator('[data-ui="release-strategy-transplant"] main').evaluate(element => element.scrollTop);
      assert.ok(scrollTop <= 1, `${label} inherited ${scrollTop}px of scroll from the previous phase`);
    };
    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    const theatricalErrors = [];
    page.on('pageerror', error => theatricalErrors.push(error.message));
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('[data-ui="release-strategy-transplant"]').count(), 1);
    assert.equal(await page.getByText('CHEAT STUDIO MOVIE (RELEASE READY)', { exact: true }).count(), 1);
    await capture(page, 'theatrical', 'distribution');
    await page.getByRole('button', { name: 'Theatrical distribution' }).click();
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await assertPhaseStartsAtTop(page, 'Theatrical Desk');
    assert.equal(await page.getByRole('img', { name: 'Interactive theatrical release map' }).count(), 1);
    await capture(page, 'theatrical', 'desk');
    await page.getByRole('button', { name: 'AUTO-BUILD FOOTPRINT' }).click();
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await assertPhaseStartsAtTop(page, 'Theatrical Campaign');
    await capture(page, 'theatrical', 'campaign');
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await assertPhaseStartsAtTop(page, 'Theatrical Festivals');
    await capture(page, 'theatrical', 'festivals');
    await page.getByRole('button', { name: 'Skip Festivals' }).click();
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await assertPhaseStartsAtTop(page, 'Theatrical Calendar');
    await capture(page, 'theatrical', 'calendar');
    await page.getByRole('button', { name: 'REVIEW' }).click();
    await assertPhaseStartsAtTop(page, 'Theatrical Finalize');
    await capture(page, 'theatrical', 'finalize');
    const lock = page.getByRole('button', { name: /LOCK STRATEGY/ });
    await lock.dblclick();
    await page.waitForFunction(() => window.__releaseFixture.completeCount === 1);
    const outcome = await page.evaluate(() => ({
      project: window.__releaseFixture.player.commitments[0],
      completeCount: window.__releaseFixture.completeCount,
      energy: window.__releaseFixture.player.energy.current,
      initialEnergy: window.__releaseFixture.initialEnergy,
    }));
    assert.equal(outcome.project.projectDetails.releaseStrategy, 'THEATRICAL');
    assert.equal(outcome.project.projectDetails.releasePlanningDraft, undefined);
    assert.equal(outcome.completeCount, 1);
    assert.equal(outcome.initialEnergy - outcome.energy, 15);
    assert.deepEqual(theatricalErrors, []);

    const restored = await browser.newPage({ viewport: { width: 393, height: 852 } });
    for (const [step, heading] of [[2, 'Theatrical Desk'], [3, 'Campaign'], [4, 'Festivals'], [5, 'Calendar'], [6, 'Finalize']]) {
      await restored.goto(`${URL}&draftStep=${step}`);
      await restored.waitForLoadState('networkidle');
      assert.equal(await restored.getByRole('heading', { name: heading }).count(), 1, `saved step ${step} should restore ${heading}`);
    }
    assert.equal(await restored.getByText(/Nova Circuit/).count() > 0, true);
    await restored.close();

    const postTheatrical = await browser.newPage({ viewport: { width: 393, height: 852 } });
    await postTheatrical.goto(`${URL}&postTheatrical=1`);
    await postTheatrical.waitForLoadState('networkidle');
    assert.equal(await postTheatrical.getByRole('heading', { name: 'The War Room' }).count(), 0);
    assert.equal(await postTheatrical.getByText('LOT 01 · ON OFFER', { exact: true }).count(), 1);
    assert.equal(await postTheatrical.getByText('OUTSIDE THE DOOR', { exact: true }).count(), 1);
    assert.equal(await postTheatrical.getByText('THE CLOCK', { exact: true }).count(), 1);
    assert.ok(await postTheatrical.getByText('Netflix', { exact: true }).count() > 0, 'War Room gate should use the real in-game platform market');
    assert.ok(await postTheatrical.getByText('Prime Video', { exact: true }).count() > 0, 'War Room gate should include ecosystem platforms beyond the five bidding constants');
    assert.equal(await postTheatrical.getByRole('button', { name: /OPEN THE ROOM|NO ELIGIBLE MARKET/ }).count(), 1);
    await postTheatrical.close();

    const walkout = await browser.newPage({ viewport: { width: 393, height: 852 } });
    await walkout.goto(URL);
    await walkout.waitForLoadState('networkidle');
    await walkout.getByRole('button', { name: 'Streaming distribution' }).click();
    await walkout.getByRole('button', { name: 'CONTINUE' }).click();
    await walkout.getByRole('button', { name: 'OPEN THE ROOM' }).click();
    await walkout.getByRole('button', { name: 'Leave the room' }).waitFor({ state: 'visible', timeout: 8_000 });
    await walkout.getByRole('button', { name: 'Leave the room' }).click();
    await walkout.getByRole('button', { name: 'WALK OUT', exact: true }).click();
    await walkout.getByRole('button', { name: 'Theatrical distribution' }).waitFor({ state: 'visible', timeout: 8_000 });
    const walkoutOutcome = await walkout.evaluate(() => Object.values(window.__releaseFixture.player.world.streamingBiddingSessions || {}).map(session => session.status));
    assert.ok(walkoutOutcome.includes('LEFT'), 'Walking out should persist the unsigned room as LEFT');
    await walkout.getByRole('button', { name: 'CONTINUE' }).click();
    assert.equal(await walkout.getByRole('button', { name: 'OPEN THE ROOM' }).count(), 1, 'Walking out should return to a fresh War Room gate');
    await walkout.close();

    const sharedFlow = await browser.newPage({ viewport: { width: 393, height: 852 } });
    await sharedFlow.goto(URL);
    await sharedFlow.waitForLoadState('networkidle');
    await sharedFlow.getByRole('button', { name: 'Streaming distribution' }).click();
    await sharedFlow.getByRole('button', { name: 'CONTINUE' }).click();
    await sharedFlow.getByRole('button', { name: 'OPEN THE ROOM' }).click();
    await sharedFlow.waitForFunction(() => Object.values(window.__releaseFixture.player.world.streamingBiddingSessions || {}).some(session => (
      session.offers.some(offer => (offer.status === 'ACTIVE' || offer.status === 'FINAL') && offer.exclusivity === 'NON_EXCLUSIVE')
    )), undefined, { timeout: 50_000 });
    const sharedCandidate = await sharedFlow.evaluate(() => {
      const session = Object.values(window.__releaseFixture.player.world.streamingBiddingSessions || {}).find(candidate => candidate.status === 'LIVE' || candidate.status === 'CLOSING');
      const offer = session.offers.find(candidate => (candidate.status === 'ACTIVE' || candidate.status === 'FINAL') && candidate.exclusivity === 'NON_EXCLUSIVE');
      return { platformName: offer.platformName, offerId: offer.id };
    });
    const sharedRow = sharedFlow.locator('article').filter({ has: sharedFlow.getByRole('button', { name: `${sharedCandidate.platformName} offer details` }) });
    await sharedRow.getByRole('button', { name: /TAKE/ }).click();
    await sharedFlow.getByRole('button', { name: 'FINISH LICENSING' }).waitFor({ state: 'visible', timeout: 8_000 });
    assert.equal(await sharedFlow.getByRole('heading', { name: 'Campaign' }).count(), 0, 'A shared signing must not leave the room immediately');
    const firstSharedSettlement = await sharedFlow.evaluate(() => ({
      contracts: Object.values(window.__releaseFixture.player.world.streamingRightsContracts || {}),
      draft: window.__releaseFixture.player.commitments[0].projectDetails.releasePlanningDraft,
      energy: window.__releaseFixture.player.energy.current,
      initialEnergy: window.__releaseFixture.initialEnergy,
    }));
    assert.equal(firstSharedSettlement.contracts.filter(contract => contract.sourceOfferId === sharedCandidate.offerId).length, 1, 'Shared offer should settle exactly one contract');
    assert.ok(firstSharedSettlement.draft.selectedStreamingContractIds.includes(firstSharedSettlement.contracts.find(contract => contract.sourceOfferId === sharedCandidate.offerId).id));
    assert.equal(firstSharedSettlement.initialEnergy - firstSharedSettlement.energy, 10);
    await sharedFlow.getByRole('button', { name: 'FINISH LICENSING' }).click();
    await sharedFlow.getByRole('heading', { name: 'Campaign' }).waitFor({ state: 'visible', timeout: 8_000 });
    await sharedFlow.getByRole('button', { name: 'BACK', exact: true }).click();
    await sharedFlow.getByText('SIGNED STREAMING DEALS', { exact: true }).waitFor({ state: 'visible', timeout: 8_000 });
    await sharedFlow.screenshot({ path: '/private/tmp/actor-empire-release-wizard-streaming-signed-summary-393x852.png' });
    assert.equal(await sharedFlow.getByText('STANDING OFFERS', { exact: false }).count(), 0, 'Campaign Back must not restore an exhausted offer table');
    await sharedFlow.getByRole('button', { name: 'RETURN TO CAMPAIGN' }).click();
    await sharedFlow.getByRole('heading', { name: 'Campaign' }).waitFor({ state: 'visible', timeout: 8_000 });
    await sharedFlow.close();

    const streaming = await browser.newPage({ viewport: { width: 393, height: 852 } });
    const streamingErrors = [];
    streaming.on('pageerror', error => streamingErrors.push(error.message));
    await streaming.goto(URL);
    await streaming.waitForLoadState('networkidle');
    await capture(streaming, 'streaming', 'distribution');
    await streaming.getByRole('button', { name: 'Streaming distribution' }).click();
    await streaming.getByRole('button', { name: 'CONTINUE' }).click();
    await capture(streaming, 'streaming', 'war-room');
    await streaming.getByRole('button', { name: 'OPEN THE ROOM' }).click();
    await streaming.waitForFunction(() => Object.values(window.__releaseFixture.player.world.streamingBiddingSessions || {}).some(session => session.status === 'LIVE'));
    const bidderIds = await streaming.evaluate(() => Object.values(window.__releaseFixture.player.world.streamingBiddingSessions || {}).find(session => session.status === 'LIVE').platformStates.map(state => state.platformId));
    assert.ok(bidderIds.length >= 5 && bidderIds.length <= 8, `Expected 5-8 ecosystem bidders, received ${bidderIds.length}`);
    assert.ok(bidderIds.some(id => !['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'].includes(id)), 'Real Release Wizard auction should include non-core ecosystem bidders');
    const accept = streaming.getByRole('button', { name: /TAKE/ }).first();
    await accept.waitFor({ state: 'visible', timeout: 20_000 });
    await accept.click();
    await streaming.waitForFunction(() => document.body.textContent.includes('Campaign') || document.body.textContent.includes('FINISH LICENSING'), undefined, { timeout: 8_000 });
    if (await streaming.getByRole('button', { name: 'FINISH LICENSING' }).count()) {
      await streaming.getByRole('button', { name: 'FINISH LICENSING' }).click();
    }
    await streaming.getByRole('heading', { name: 'Campaign' }).waitFor({ state: 'visible', timeout: 8_000 }).catch(async () => {
      throw new Error(`Streaming accept did not advance to Campaign. Page errors: ${streamingErrors.join(' | ') || 'none'}\n${(await streaming.locator('body').innerText()).slice(0, 4000)}`);
    });
    await assertPhaseStartsAtTop(streaming, 'Streaming Campaign');
    await capture(streaming, 'streaming', 'campaign');
    await streaming.getByRole('button', { name: 'CONTINUE' }).click();
    await assertPhaseStartsAtTop(streaming, 'Streaming Festivals');
    await capture(streaming, 'streaming', 'festivals');
    await streaming.getByRole('button', { name: 'Skip Festivals' }).click();
    await streaming.getByRole('button', { name: 'CONTINUE' }).click();
    await assertPhaseStartsAtTop(streaming, 'Streaming Calendar');
    await capture(streaming, 'streaming', 'calendar');
    await streaming.getByRole('button', { name: 'REVIEW' }).click();
    await assertPhaseStartsAtTop(streaming, 'Streaming Finalize');
    const expectedBuyerName = await streaming.evaluate(() => {
      const selectedBuyerId = window.__releaseFixture.player.commitments[0].projectDetails.releasePlanningDraft.selectedPlatform;
      const sessions = Object.values(window.__releaseFixture.player.world.streamingBiddingSessions || {});
      return sessions.flatMap(session => session.offers).find(offer => offer.status === 'ACCEPTED' && offer.platformId === selectedBuyerId)?.platformName || selectedBuyerId;
    });
    assert.ok(expectedBuyerName, 'Accepted streaming buyer should have a player-facing name');
    assert.equal(await streaming.getByText(expectedBuyerName, { exact: true }).count(), 1, 'Finalize should show the player-facing streaming buyer brand');
    await capture(streaming, 'streaming', 'finalize');
    await streaming.getByRole('button', { name: /LOCK STRATEGY/ }).click();
    await streaming.waitForFunction(() => window.__releaseFixture.completeCount === 1);
    const streamingOutcome = await streaming.evaluate(() => ({
      project: window.__releaseFixture.player.commitments[0],
      contracts: window.__releaseFixture.player.world.streamingRightsContracts,
      energy: window.__releaseFixture.player.energy.current,
      initialEnergy: window.__releaseFixture.initialEnergy,
    }));
    assert.equal(streamingOutcome.project.projectDetails.releaseStrategy, 'STREAMING_ONLY');
    assert.equal(streamingOutcome.project.projectDetails.releasePlanningDraft, undefined);
    assert.ok(Object.keys(streamingOutcome.contracts || {}).length > 0);
    assert.ok(streamingOutcome.energy < streamingOutcome.initialEnergy);
    assert.deepEqual(streamingErrors, []);
    await streaming.close();

    const runJourney = async (viewport, route) => {
      const journey = await browser.newPage({ viewport });
      const journeyErrors = [];
      journey.on('pageerror', error => journeyErrors.push(error.message));
      try {
        await journey.goto(URL);
        await journey.waitForLoadState('networkidle');
        await assertNoHorizontalOverflow(journey, `${route} ${viewport.width}x${viewport.height} Distribution`);
        await journey.getByRole('button', { name: route === 'THEATRICAL' ? 'Theatrical distribution' : 'Streaming distribution' }).click();
        await journey.getByRole('button', { name: 'CONTINUE' }).click();
        if (route === 'THEATRICAL') {
          await journey.getByRole('button', { name: 'AUTO-BUILD FOOTPRINT' }).click();
          await journey.getByRole('button', { name: 'CONTINUE' }).click();
        } else {
          await journey.getByRole('button', { name: 'OPEN THE ROOM' }).click();
          const terms = journey.getByRole('button', { name: /TAKE/ }).first();
          await terms.waitFor({ state: 'visible', timeout: 20_000 });
          await terms.click();
          await journey.waitForFunction(() => document.body.textContent.includes('Campaign') || document.body.textContent.includes('FINISH LICENSING'), undefined, { timeout: 8_000 });
          if (await journey.getByRole('button', { name: 'FINISH LICENSING' }).count()) {
            await journey.getByRole('button', { name: 'FINISH LICENSING' }).click();
          }
          await journey.getByRole('heading', { name: 'Campaign' }).waitFor({ state: 'visible', timeout: 8_000 });
        }
        await journey.getByRole('button', { name: 'CONTINUE' }).click();
        await journey.getByRole('button', { name: 'Skip Festivals' }).click();
        await journey.getByRole('button', { name: 'CONTINUE' }).click();
        assert.equal(await journey.locator('[data-release-week]').count(), 52);
        await journey.getByRole('button', { name: 'REVIEW' }).click();
        await journey.getByRole('button', { name: /LOCK STRATEGY/ }).click();
        await journey.waitForFunction(() => window.__releaseFixture.completeCount === 1);
        const result = await journey.evaluate(() => ({ project: window.__releaseFixture.player.commitments[0], completeCount: window.__releaseFixture.completeCount }));
        assert.equal(result.completeCount, 1);
        assert.equal(result.project.projectDetails.releaseStrategy, route === 'THEATRICAL' ? 'THEATRICAL' : 'STREAMING_ONLY');
        assert.deepEqual(journeyErrors, [], `${route} ${viewport.width}x${viewport.height} emitted page errors`);
      } finally {
        await journey.close();
      }
    };

    for (const viewport of [{ width: 320, height: 740 }, { width: 360, height: 800 }, { width: 412, height: 915 }, { width: 430, height: 932 }]) {
      await runJourney(viewport, 'THEATRICAL');
      await runJourney(viewport, 'STREAMING');
    }
    console.log('Release Wizard real-controller theatrical and streaming journeys passed at all five target viewports.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
