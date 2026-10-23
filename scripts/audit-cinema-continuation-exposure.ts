import assert from 'node:assert/strict';
import { generateSequelOffer, generateRenewalOffer } from '../services/roleLogic';
import { readCinemaExposureRecord, buildCinemaExposure } from '../services/boxOffice/boxOfficeAwareness';
import { normalizeCinemaTitle } from '../services/boxOffice/boxOfficeInputs';
import { buildCinemaAwarenessSnapshot, commitCinemaReleaseExposure } from '../services/boxOffice/boxOfficeExposureAdapters';
import { prepareCinemaAudienceWorld, normalizeLiveTitle } from '../services/boxOffice/boxOfficeWeek';
import { readCinemaWorldAudience } from '../services/boxOffice/boxOfficeAudienceAdapters';
import { fundOfferedCinemaLaunch } from '../services/boxOffice/boxOfficeOfferedLaunch';
import { makeCinemaFixture, makeCinemaExposureFixture } from './fixtures/boxOfficeScenarios';
import type { ActiveRelease } from '../types';

const fixture = makeCinemaFixture(71);
const parentId = 'parent-film', childId = 'new-sequel';
const parentProject = {
    ...fixture.project,
    marketingBudgetSpent: 10000, totalCampaignSpend: 10000, reservedMarketingBudget: 10000,
    marketingChannelAllocations: { SOCIAL_DIGITAL: 10000 },
    offeredCinemaLaunch: { version: 1 as const, absoluteWeek: 100, studioId: fixture.project.studioId, campaignCostCents: 1_000_000 },
    cinemaExposure: { version: 1 as const, attentionBasis: 'PACKAGE' as const, attentionPotential: 60, events: [
        { id: 'parent-announcement', titleId: parentId, absoluteWeek: 100, kind: 'ANNOUNCEMENT' as const, channel: 'ANNOUNCEMENT', impressions: 0 },
        { id: 'parent-campaign', titleId: parentId, absoluteWeek: 100, kind: 'PAID_CAMPAIGN' as const, channel: 'SOCIAL_DIGITAL', impressions: 300000, paidCostCents: 1_000_000 },
    ] },
};
const original: ActiveRelease = {
    id: parentId, name: 'Parent', type: 'MOVIE', roleType: 'LEAD', projectDetails: parentProject,
    royaltyPercentage: 2.5, distributionPhase: 'THEATRICAL', weekNum: 10, weeklyGross: [],
    totalGross: 400_000_000, budget: parentProject.estimatedBudget, status: 'FINISHED', productionPerformance: 80,
};
const before = JSON.stringify({ original, player: fixture.player });
const failures: string[] = [];
function test(name: string, run: () => void) {
    try { run(); console.log('PASS', name); }
    catch (error) { failures.push(name + ': ' + String(error)); console.error('FAIL', name, String(error)); }
}

for (const [name, create] of [['sequel', generateSequelOffer], ['renewal', generateRenewalOffer]] as const) {
    test(name + ' starts without another installment\'s paid campaign or launch marker', () => {
        const offer = create(original, fixture.player), project = offer.opportunity.project;
        assert.equal(project.cinemaExposure, undefined);
        assert.equal(project.offeredCinemaLaunch, undefined);
        assert.equal(project.marketingBudgetSpent || 0, 0);
        assert.equal(project.totalCampaignSpend || 0, 0);
        assert.equal(project.reservedMarketingBudget || 0, 0);
        assert.equal(project.marketingChannelAllocations, undefined);
        assert.equal(project.franchiseId, parentId);
        assert.equal(JSON.stringify({ original, player: fixture.player }), before);
    });
}

const ownEvent = { id: 'child-press', titleId: childId, absoluteWeek: 101, kind: 'PROMOTION' as const, channel: 'PRESS', impressions: 1000 };
const savedChild = { ...parentProject, title: 'Parent 2', cinemaExposure: { ...parentProject.cinemaExposure, events: [...parentProject.cinemaExposure.events, ownEvent] } };
const savedBefore = JSON.stringify(savedChild);
test('scoped legacy read preserves own evidence without reassigning parent spend', () => {
    assert.deepEqual(readCinemaExposureRecord(savedChild, childId).events, [ownEvent]);
    assert.equal(readCinemaExposureRecord(savedChild).events.length, 3, 'Unscoped forensic history stays readable');
    assert.equal(JSON.stringify(savedChild), savedBefore);
});
test('canonical title adapter does not mint a child campaign from a parent event', () => {
    const title = normalizeCinemaTitle({ player: fixture.player, project: savedChild, titleId: childId, owner: { id: savedChild.studioId, route: 'ACCEPTED_ROLE' } });
    assert.deepEqual(title.exposure!.events, [ownEvent]);
});
const player = prepareCinemaAudienceWorld(fixture.player, 1527);
test('legacy awareness/rights read no longer crashes and does not edit cash or contracts', () => {
    const state = JSON.stringify(player);
    const snapshot = buildCinemaAwarenessSnapshot(player, savedChild, childId);
    assert.equal(snapshot.sources.some(s => s.eventId === 'parent-campaign'), false);
    assert.equal(JSON.stringify(player), state);
    assert.equal(JSON.stringify(savedChild), savedBefore);
});
test('live title does not silently retitle parent paid events', () => {
    const title = normalizeLiveTitle(player, childId, savedChild, 1527, 'ACCEPTED_ROLE', readCinemaWorldAudience(player));
    assert.deepEqual(title.exposure!.events, [ownEvent]);
});
test('a new sequel campaign is funded by the real NPC treasury once, with its own title', () => {
    const child = generateSequelOffer(original, player).opportunity.project;
    const oldCash = player.money, oldTreasury = player.world.studios[child.studioId].cashReserve;
    const funded = fundOfferedCinemaLaunch(player, child, childId);
    assert.ok(funded.project.offeredCinemaLaunch!.campaignCostCents > 0);
    assert.ok(funded.world.studios[child.studioId].cashReserve < oldTreasury);
    assert.ok(funded.project.cinemaExposure!.events.every(e => e.titleId === childId));
    assert.equal(player.money, oldCash);
    const repeated = fundOfferedCinemaLaunch({ ...player, world: funded.world }, funded.project, childId);
    assert.equal(repeated.world.studios[child.studioId].cashReserve, funded.world.studios[child.studioId].cashReserve);
});
test('new own campaigns remain idempotent and JSON-reload safe', () => {
    const clean = { ...savedChild, marketingBudgetSpent: 200, totalCampaignSpend: 200 };
    const first = commitCinemaReleaseExposure({ player, project: clean, titleId: childId, absoluteWeek: 1527, allocations: { SOCIAL_DIGITAL: 200 } });
    assert.ok(first.cinemaExposure!.events.every(e => e.titleId === childId));
    assert.equal(first.cinemaExposure!.events.filter(e => e.kind === 'PAID_CAMPAIGN').reduce((n, e) => n + (e.paidCostCents || 0), 0), 20000);
    const again = commitCinemaReleaseExposure({ player, project: JSON.parse(JSON.stringify(first)), titleId: childId, absoluteWeek: 1527, allocations: { SOCIAL_DIGITAL: 200 } });
    assert.deepEqual(again, first);
});
const legacyDraft = { ...savedChild, subtype: 'SEQUEL' as const, franchiseId: parentId, reservedMarketingBudget: 0 };
test('an unambiguous unreleased legacy clone funds its own NPC campaign once', () => {
    const old = JSON.stringify(legacyDraft), treasury = player.world.studios[legacyDraft.studioId].cashReserve;
    const funded = fundOfferedCinemaLaunch(player, legacyDraft, childId);
    assert.ok(funded.world.studios[legacyDraft.studioId].cashReserve < treasury);
    assert.ok(funded.project.cinemaExposure!.events.every(e => e.titleId === childId));
    assert.ok(funded.project.cinemaExposure!.events.some(e => e.id === ownEvent.id), 'Keep genuine child promotion');
    assert.equal(JSON.stringify(legacyDraft), old, 'Do not mutate parent/copy history in the caller');
    const again = fundOfferedCinemaLaunch({ ...player, world: funded.world }, funded.project, childId);
    assert.equal(again.world.studios[legacyDraft.studioId].cashReserve, funded.world.studios[legacyDraft.studioId].cashReserve);
});
test('already released legacy clones do not receive a historical campaign charge', () => {
    const oldPlayer = { ...player, activeReleases: [{ ...original, id: childId, projectDetails: legacyDraft }] };
    const result = fundOfferedCinemaLaunch(oldPlayer, legacyDraft, childId);
    assert.equal(result.project, legacyDraft);
    assert.equal(result.world, oldPlayer.world);
});
test('own paid evidence and explicit reserved budgets prevent a legacy repair charge', () => {
    const paid = { ...legacyDraft, cinemaExposure: { ...legacyDraft.cinemaExposure, events: [...legacyDraft.cinemaExposure.events, { ...legacyDraft.cinemaExposure.events[1], id: 'own-paid', titleId: childId }] } };
    for (const project of [paid, { ...legacyDraft, reservedMarketingBudget: 5000 }]) {
        const result = fundOfferedCinemaLaunch(player, project, childId);
        assert.equal(result.project, project);
        assert.equal(result.world, player.world);
    }
});
test('strict core still rejects foreign exposure instead of silently rewriting identity', () => {
    const input = makeCinemaExposureFixture();
    assert.throws(() => buildCinemaExposure({ ...input, events: [ownEvent] }), /different cinema title/);
});
assert.equal(failures.length, 0, failures.join('\n'));
console.log('Continuation exposure regression passed');
