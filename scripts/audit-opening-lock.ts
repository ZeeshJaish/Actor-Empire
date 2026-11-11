/**
 * #253: commissioned, the opening is being built: what the wizards approved is locked until opening night, the waiting screen's numbers move with real
 * weeks, and a clearance finishing does not ask anybody to refresh anything. Builds the developer test company's commission (~20 s), then runs real weeks.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { commissionStreamingFullPlatformQa, prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingOpeningLock, STREAMING_OPENING_LOCK_MESSAGE } from '../services/streamingOpeningLock';
import { getStreamingOpeningProgrammeView } from '../services/streamingOpeningProgramme';
import { commitOwnedStreamingLaunch, getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { getContentMarketCollections, getContentMarketListings, linkContentMarketOwnedTitles, purchaseContentMarketCollection, purchaseContentMarketListing, submitContentMarketPrivateOffer } from '../services/streamingContentMarket';
import { openStreamingRightsNegotiation, signStreamingRightsDeal } from '../services/streamingRightsMarketplace';
import { programStreamingLaunchSlate } from '../services/streamingOriginals';
import { autoFillStreamingSlate, clearStreamingSlatePlans, planStreamingSlateAutoFill, scheduleStreamingSlateTitle, unscheduleStreamingSlateTitle } from '../services/streamingSlateProgramming';
import { applyStreamingBrandLook, getStreamingBrandStudioView } from '../services/streamingBrandStudio';
import { resolveStreamingMarketRequirement, resumeStreamingMarketClearance } from '../services/streamingMarkets';
import { getStreamingNetworkMapView } from '../services/streamingNetworkMapView';

const pass = (label: string) => console.log(`PASS ${label}`);
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'opening-lock-audit', name: 'Opening Lock', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

async function main() {
    const started = performance.now();
    const prepared = prepareStreamingFullPlatformQa(fresh());
    assert.equal(getStreamingOpeningLock(prepared).building, false, 'nothing is locked before the commission');
    const built = commissionStreamingFullPlatformQa(prepared);
    console.log(`commissioned in ${Math.round((performance.now() - started) / 1000)} s`);

    /* ---- the lock */
    const lock = getStreamingOpeningLock(built);
    assert.ok(lock.building && lock.catalogueLocked && lock.planLocked, JSON.stringify(lock));
    assert.equal(lock.message, STREAMING_OPENING_LOCK_MESSAGE);
    const refused = (result: { player: Player; changed: boolean; detail?: string; message?: string; reason?: string }, label: string) => {
        assert.equal(result.changed, false, `${label}: refused`);
        assert.equal(result.player, built, `${label}: the save is untouched`);
    };
    const listing = getContentMarketListings(prepared)[0];
    const collection = getContentMarketCollections(prepared)[0];
    const linked = linkContentMarketOwnedTitles(built, ['any-title']);
    refused(linked, 'bring it across');
    assert.equal(linked.detail, STREAMING_OPENING_LOCK_MESSAGE, 'and it says why');
    if (listing) refused(purchaseContentMarketListing(built, listing.id, listing.signature), 'buy a listing');
    if (collection) refused(purchaseContentMarketCollection(built, collection.id, collection.signature), 'buy a collection');
    if (listing) {
        refused(submitContentMarketPrivateOffer(built, listing.id, listing.terms), 'a private offer');
        refused(openStreamingRightsNegotiation(built, listing.id, listing.terms), 'open a negotiation');
    }
    refused(signStreamingRightsDeal(built, 'any-negotiation'), 'sign a deal');
    refused(programStreamingLaunchSlate(built, built.ownedStreamingPlatform.launchSlate!), 'the opening slate');
    /* 2026-11-11: the Content Desk slate plans the opening before launch; while the crews build it refuses too */
    const opening = built.ownedStreamingPlatform.launchSlate!.entries[0];
    const moved = scheduleStreamingSlateTitle(built, { projectId: opening.projectId, absoluteWeek: opening.launchWeek === 1 ? 2 : 1, marketingPlan: 'STANDARD' });
    refused(moved, 'move a title in the opening programme');
    assert.equal(moved.reason, 'OPENING_LOCKED');
    refused(unscheduleStreamingSlateTitle(built, opening.projectId), 'take a title off the opening');
    refused(clearStreamingSlatePlans(built), 'remove all from the opening');
    refused(autoFillStreamingSlate(built, { fresh: true }), 'auto-fill the opening');
    assert.deepEqual(planStreamingSlateAutoFill(built, { fresh: true }), [], 'no auto-fill offer while locked');
    const look = getStreamingBrandStudioView(built).look!;
    const rebrand = applyStreamingBrandLook(built, { ...look, primaryColor: look.primaryColor === '#112233' ? '#223344' : '#112233' });
    refused(rebrand, 'the brand');
    assert.equal(rebrand.message, STREAMING_OPENING_LOCK_MESSAGE);
    pass('commissioned: markets, catalogue, slate and brand refuse, the save is untouched, and they say why');

    /* ---- the way out: a licence runs out and the launch is blocked on the catalogue */
    const platform = built.ownedStreamingPlatform;
    const licences = platform.launchSlate!.entries.filter(entry => entry.source === 'LICENSED_WINDOW')
        .flatMap(entry => platform.catalogLicenses.filter(licence => licence.sourceProjectId === entry.projectId && licence.windowType !== 'PERMANENT' && !licence.permanentPurchase));
    assert.ok(licences.length > 0, 'the test company has a licensed title on its opening slate');
    const lapsesAt = Math.min(...licences.map(licence => licence.expiresAtAbsoluteWeek));
    const yearsOn = Math.ceil((lapsesAt - getAbsoluteWeek(built.age, built.currentWeek)) / 52) + 1;
    const lapsed: Player = { ...built, age: built.age + yearsOn };
    const open = getStreamingOpeningLock(lapsed);
    assert.equal(getStreamingLaunchReadiness(lapsed).items.find(item => item.id === 'rights')?.tone, 'BLOCKED');
    assert.ok(open.building && !open.catalogueLocked && open.planLocked, 'Content opens, and only Content');
    assert.notEqual(linkContentMarketOwnedTitles(lapsed, ['any-title']).detail, STREAMING_OPENING_LOCK_MESSAGE);
    pass('a licence runs out while the crews work: Content opens until it is fixed, so the lock is never a dead end');

    /* ---- the waiting screen's numbers, week by week */
    let player = built;
    const first = getStreamingOpeningProgrammeView(player);
    assert.equal(first.commissioned, true);
    assert.equal(first.progress, 0);
    assert.equal(first.citiesOnline, 0);
    assert.ok(first.totalWeeks >= 1 && first.cityCount > 0, JSON.stringify({ total: first.totalWeeks, cities: first.cityCount }));
    assert.equal(first.remainingWeeks, first.totalWeeks);
    const map = getStreamingNetworkMapView(player);
    assert.ok(map.sites.length > 0 && map.sites.length === first.cityCount, `the map has a light for every city: ${map.sites.length} of ${first.cityCount}`);
    let previous = first;
    let weeks = 0;
    while (getStreamingOpeningProgrammeView(player).state !== 'READY_TO_OPEN') {
        assert.ok(weeks < 80, 'it finishes');
        const view = getStreamingOpeningProgrammeView(player);
        if (view.state === 'ACTION_REQUIRED') {
            const asked = view.workstreams.find(item => item.status === 'ACTION_REQUIRED')!.operationIds[0];
            const operation = player.ownedStreamingPlatform.marketOperations.find(item => item.id === asked)!;
            const answered = operation.clearance?.outcome === 'ADDITIONAL_REQUIREMENT' ? resolveStreamingMarketRequirement(player, asked) : resumeStreamingMarketClearance(player, asked);
            if (answered.changed) player = answered.player;
        }
        player = { ...(await processGameWeek(player)).player, pendingEvents: [] };
        weeks += 1;
        const now = getStreamingOpeningProgrammeView(player);
        assert.ok(now.progress >= previous.progress, 'progress only goes forward');
        assert.ok(now.citiesOnline >= previous.citiesOnline && now.citiesOnline <= now.cityCount, 'cities only come online');
        assert.ok(getStreamingOpeningLock(player).planLocked, 'still locked');
        previous = now;
    }
    assert.ok(weeks > 0);
    const done = getStreamingOpeningProgrammeView(player);
    assert.equal(done.progress, 1);
    assert.equal(done.citiesOnline, done.cityCount);
    assert.equal(done.remainingWeeks, 0);
    pass(`${weeks} real weeks: the bar and the lights only go forward, and end full`);

    /* ---- nothing to refresh: clearances finished, and that is not a change to the plan */
    const readiness = getStreamingLaunchReadiness(player);
    assert.equal(readiness.items.find(item => item.id === 'launch-definition')?.tone, 'READY', 'the blueprint is not out of date');
    assert.equal(readiness.canLaunch, true, readiness.items.filter(item => item.tone === 'BLOCKED').map(item => item.detail).join(' | '));
    assert.ok(getStreamingOpeningLock(player).planLocked, 'locked until opening night itself');
    pass('ready: no blueprint to refresh, opening night can begin');

    /* ---- opening night ends it */
    const launched = commitOwnedStreamingLaunch(player, 'STANDARD');
    assert.ok(launched.changed, launched.reason);
    const after = getStreamingOpeningLock(launched.player);
    assert.ok(!after.building && !after.catalogueLocked && !after.planLocked);
    assert.notEqual(linkContentMarketOwnedTitles(launched.player, ['any-title']).detail, STREAMING_OPENING_LOCK_MESSAGE);
    pass('opening night: the rooms open again');

    /* ---- the doors */
    const hq = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
    for (const door of ['onAddContent={() => whenCatalogueOpen', "chip === 'MARKETPLACE') return whenCatalogueOpen", 'onManageMarkets={() => whenPlanOpen', 'onOpenBrandStudio={() => whenPlanOpen', "editBeforeLaunch: () => whenPlanOpen"]) {
        assert.ok(hq.includes(door), `HQ: ${door}`);
    }
    /* 2026-11-11: the old slate page is gone; the Content Desk's Slate tab is the one planner (it refuses while locked, above) */
    assert.ok(!hq.includes('<StreamingSlatePlanner'), 'HQ: the old slate page is not mounted');
    const deck = readFileSync('components/streaming-transplant/StreamingPlatformCommandDeck.tsx', 'utf8');
    assert.ok(deck.includes('state.launchProgram && !state.openingBuild'), 'the two wizard cards give way to the one card');
    assert.ok(deck.includes('opening-build-card'));
    pass('the doors: the popup instead of the room, and one card on the deck');
    console.log('opening-lock audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
