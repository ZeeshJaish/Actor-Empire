/** The programming slate after launch (Content Desk → Slate). Builds the developer test
 * company (~30 s), then checks:
 *  - no title the service streams is labelled "Ready to schedule";
 *  - the test company's three shelf titles (setup licences the cheat leaves off the
 *    opening slate) are offered; one premieres in the week the player picks, keeps that
 *    week through a save, can be moved, re-campaigned and taken off, and is really
 *    streamed from its week (two processed weeks);
 *  - a licence whose window starts later can be planned from its start, not before;
 *  - refusals leave the save untouched.
 * Fixtures add a shelf licence that ends inside the year and a licence that starts later. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getOwnedStreamingProgramEntries, getStreamingSlateCandidates } from '../services/streamingOriginals';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    autoFillStreamingSlate, clearStreamingSlatePlans, getStreamingSlateFallback, planStreamingSlateAutoFill, scheduleStreamingSlateTitle, unscheduleStreamingSlateTitle,
    STREAMING_SLATE_HORIZON_WEEKS,
} from '../services/streamingSlateProgramming';
import { createCanonicalContentDeskState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Slate Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const status = (player: Player, projectId: string) => getStreamingContentAvailability(player, projectId).status;
const entryOf = (player: Player, projectId: string) => player.ownedStreamingPlatform.launchSlate?.entries.find(entry => entry.projectId === projectId);
const deskTitle = (player: Player, projectId: string) => createCanonicalContentDeskState(player).titles.find(title => title.id === projectId);
const refused = (label: string, result: ReturnType<typeof scheduleStreamingSlateTitle>, reason: string, player: Player) => {
    assert.equal(result.changed, false, `${label} is refused`);
    assert.equal(result.reason, reason, `${label}: ${reason}`);
    assert.equal(result.player, player, `${label}: the save is untouched`);
};

async function main() {
    const started = performance.now();
    const base = await buildStreamingFullPlatformQa(fresh('slate-programming-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    const launchAt = base.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek;
    const now = weekOf(base);
    console.log(`company built in ${Math.round((performance.now() - started) / 1000)} s · programme week ${now - launchAt + 1}`);

    /* The label fix: everything the programme streams reads Live or Scheduled. */
    const programmeIds = new Set(getOwnedStreamingProgramEntries(base).map(entry => entry.projectId));
    const desk = createCanonicalContentDeskState(base);
    assert.equal(desk.titles.filter(title => title.status === 'READY TO SCHEDULE' && programmeIds.has(title.id)).length, 0, 'No title on the programme reads Ready to schedule');
    const mislabelled = base.ownedStreamingPlatform.catalogProjectIds.filter(id => programmeIds.has(id) && status(base, id) === 'READY').length;
    assert.equal(desk.slate.length, 52, 'Once live the desk plans a year of weeks');
    assert.equal(desk.scheduleFrom, now + 1, 'Premieres can be set from next week');
    console.log(`PASS the desk labels all ${programmeIds.size} programme titles Live/Scheduled (the shared availability label still says Ready for ${mislabelled})`);

    /* The cheat leaves three setup (STARTER) titles off the opening slate. */
    const cheatShelf = desk.titles.filter(row => row.schedulable);
    assert.equal(cheatShelf.length, 3, 'The test company has three titles on its shelves');
    cheatShelf.forEach(row => assert.ok(!programmeIds.has(row.id) && row.status === 'READY TO SCHEDULE', `${row.title} is on the shelves, not the service`));
    console.log(`PASS the test company's shelves hold ${cheatShelf.map(row => row.title).join(', ')}`);

    /* Auto-fill: the whole shelf, one premiere per free week inside each title's
       rights, closing silent stretches; applying it empties the shelf. */
    const premiereWeeks = (player: Player) => {
        const weeks = new Set<number>();
        getOwnedStreamingProgramEntries(player).forEach(entry => weeks.add(launchAt + entry.launchWeek - 1));
        player.ownedStreamingPlatform.originalCommissions.forEach(commission => { if (commission.releasePlan) weeks.add(commission.releasePlan.premiereAtAbsoluteWeek); });
        return weeks;
    };
    const silentWeeks = (player: Player) => {
        const weeks = premiereWeeks(player);
        let silent = 0;
        for (let week = now + 1; week <= now + STREAMING_SLATE_HORIZON_WEEKS - 2; week += 1) if (![week, week + 1, week + 2].some(item => weeks.has(item))) silent += 1;
        return silent;
    };
    const plan = planStreamingSlateAutoFill(base);
    assert.equal(plan.length, 3, 'Auto-fill places all three shelf titles');
    assert.deepEqual(createCanonicalContentDeskState(base).autoFill, plan, 'The desk shows the same plan');
    const taken = premiereWeeks(base);
    assert.equal(new Set(plan.map(item => item.absoluteWeek)).size, plan.length, 'One auto-filled premiere per week');
    plan.forEach(item => {
        assert.ok(item.absoluteWeek >= now + 1 && item.absoluteWeek <= now + STREAMING_SLATE_HORIZON_WEEKS, `${item.title} is inside the year`);
        assert.ok(!taken.has(item.absoluteWeek), `${item.title} goes in a week with no premiere`);
        assert.equal(item.marketingPlan, 'STANDARD');
    });
    const filled = autoFillStreamingSlate(base);
    assert.equal(filled.scheduled.length, 3, 'Every planned premiere is scheduled');
    assert.equal(createCanonicalContentDeskState(filled.player).titles.filter(row => row.schedulable).length, 0, 'The shelf is empty after');
    assert.equal(planStreamingSlateAutoFill(filled.player).length, 0, 'A second auto-fill has nothing to place');
    const silentBefore = silentWeeks(base);
    const silentAfter = silentWeeks(filled.player);
    assert.ok(silentAfter < silentBefore, 'Auto-fill closes silent weeks');
    console.log(`PASS auto-fill premieres ${plan.map(item => `${item.title} in W${(item.absoluteWeek % 52) + 1}`).join(', ')}; silent weeks in the year ${silentBefore} → ${silentAfter}`);

    /* Remove all and Auto-fill's two ways. A hand-planned Event premiere stays when
       Auto-fill keeps the plan and is replaced when it starts fresh; Remove all
       empties the slate of everything planned. */
    const hand = cheatShelf[0].id;
    const handPlanned = scheduleStreamingSlateTitle(base, { projectId: hand, absoluteWeek: now + 10, marketingPlan: 'EVENT' });
    assert.ok(handPlanned.changed);
    const keep = planStreamingSlateAutoFill(handPlanned.player);
    assert.equal(keep.length, 2, 'Keeping the plan, Auto-fill places the other two');
    assert.ok(!keep.some(item => item.projectId === hand), 'The hand-planned title is left where it is');
    const kept = autoFillStreamingSlate(handPlanned.player);
    assert.equal(entryOf(kept.player, hand)!.marketingPlan, 'EVENT');
    assert.equal(launchAt + entryOf(kept.player, hand)!.launchWeek - 1, now + 10, 'Its week and campaign survive');
    const freshPlan = planStreamingSlateAutoFill(handPlanned.player, { fresh: true });
    assert.equal(freshPlan.length, 3, 'Starting fresh, Auto-fill plans all three again');
    assert.deepEqual(freshPlan, plan, 'A fresh plan is the plan of an empty slate');
    const replanned = autoFillStreamingSlate(handPlanned.player, { fresh: true });
    assert.equal(replanned.scheduled.length, 3);
    assert.equal(entryOf(replanned.player, hand)!.marketingPlan, 'STANDARD', 'Starting fresh replaces the hand-planned premiere');
    const cleared = clearStreamingSlatePlans(kept.player);
    assert.ok(cleared.changed);
    assert.equal(cleared.removed.length, 3, 'Remove all takes every planned premiere off');
    assert.equal(createCanonicalContentDeskState(cleared.player).titles.filter(row => row.schedulable).length, 3, 'All three are back on the shelves');
    assert.ok(!createCanonicalContentDeskState(cleared.player).slate.some(week => week.releases.some(release => release.editable)), 'Nothing planned is left');
    assert.equal(clearStreamingSlatePlans(cleared.player).changed, false, 'A second Remove all has nothing to do');
    assert.ok(createCanonicalContentDeskState(cleared.player).slate.some(week => week.releases.some(release => release.kind === 'ORIGINAL')), 'Originals are not touched');
    console.log('PASS Auto-fill keeps a hand plan or starts fresh; Remove all empties the slate and leaves Originals');

    /* Fixtures: a setup licence that ends inside the year, and a licence whose window starts later. */
    const onSlate = new Set(base.ownedStreamingPlatform.launchSlate!.entries.map(entry => entry.projectId));
    const plain = base.ownedStreamingPlatform.catalogLicenses.filter(licence => licence.status === 'ACTIVE' && licence.origin !== 'STARTER'
        && !onSlate.has(licence.sourceProjectId) && licence.startsAtAbsoluteWeek <= now);
    const long = base.ownedStreamingPlatform.catalogLicenses.find(licence => licence.sourceProjectId === cheatShelf[0].id && licence.status === 'ACTIVE')!;
    const short = plain.find(licence => licence.windowType !== 'PERMANENT' && !licence.permanentPurchase
        && licence.expiresAtAbsoluteWeek > now + 2 && licence.expiresAtAbsoluteWeek <= now + STREAMING_SLATE_HORIZON_WEEKS);
    const later = plain.find(licence => licence !== short && licence.expiresAtAbsoluteWeek > now + 30)!;
    assert.ok(long && later, 'The test company has licences for the fixtures');
    const shelf: Player = {
        ...base,
        ownedStreamingPlatform: {
            ...base.ownedStreamingPlatform,
            catalogLicenses: base.ownedStreamingPlatform.catalogLicenses.map(licence => (licence === short ? { ...licence, origin: 'STARTER' as const } : licence)),
        },
    };
    const upcoming: Player = {
        ...base,
        world: {
            ...base.world,
            streamingRightsContracts: Object.fromEntries(Object.entries(base.world.streamingRightsContracts || {})
                .map(([id, contract]) => [id, id === later.id ? { ...contract, startsAtAbsoluteWeek: now + 4 } : contract])),
        },
        ownedStreamingPlatform: {
            ...base.ownedStreamingPlatform,
            catalogLicenses: base.ownedStreamingPlatform.catalogLicenses.map(licence => (licence === later ? { ...licence, startsAtAbsoluteWeek: now + 4 } : licence)),
        },
    };

    /* The shelves. */
    const title = getStreamingSlateCandidates(shelf).find(candidate => candidate.projectId === long.sourceProjectId)!;
    assert.equal(status(shelf, title.projectId), 'READY');
    assert.ok(!getOwnedStreamingProgramEntries(shelf).some(entry => entry.projectId === title.projectId), 'A setup licence off the slate is not streamed');
    const shelfDesk = createCanonicalContentDeskState(shelf);
    assert.ok(shelfDesk.titles.find(row => row.id === title.projectId)!.schedulable, 'The desk offers it');
    assert.equal(shelfDesk.titles.filter(row => row.schedulable).length, short ? 4 : 3, 'Only the shelf titles are offered');
    console.log(`PASS ${title.title} sits on the shelves, unstreamed, and is offered`);

    /* Refusals. */
    const original = getStreamingSlateCandidates(shelf).find(candidate => candidate.source === 'ORIGINAL')!;
    const live = getOwnedStreamingProgramEntries(shelf).find(entry => entry.source !== 'ORIGINAL' && launchAt + entry.launchWeek - 1 <= now)!;
    refused('an Original', scheduleStreamingSlateTitle(shelf, { projectId: original.projectId, absoluteWeek: now + 2, marketingPlan: 'EVENT' }), 'ORIGINAL_USES_RELEASE', shelf);
    refused('this week', scheduleStreamingSlateTitle(shelf, { projectId: title.projectId, absoluteWeek: now, marketingPlan: 'STANDARD' }), 'WEEK_OUT_OF_RANGE', shelf);
    refused('past the horizon', scheduleStreamingSlateTitle(shelf, { projectId: title.projectId, absoluteWeek: now + STREAMING_SLATE_HORIZON_WEEKS + 1, marketingPlan: 'STANDARD' }), 'WEEK_OUT_OF_RANGE', shelf);
    refused('a title already live', scheduleStreamingSlateTitle(shelf, { projectId: live.projectId, absoluteWeek: now + 2, marketingPlan: 'STANDARD' }), 'ALREADY_PREMIERED', shelf);
    refused('an unknown title', scheduleStreamingSlateTitle(shelf, { projectId: 'nope', absoluteWeek: now + 2, marketingPlan: 'STANDARD' }), 'UNKNOWN_TITLE', shelf);
    if (short) refused('a week after its rights end', scheduleStreamingSlateTitle(shelf, { projectId: short.sourceProjectId, absoluteWeek: short.expiresAtAbsoluteWeek, marketingPlan: 'STANDARD' }), 'RIGHTS_END_FIRST', shelf);
    refused('taking off a live title', unscheduleStreamingSlateTitle(shelf, live.projectId), 'ALREADY_PREMIERED', shelf);
    console.log(`PASS refuses ${short ? 7 : 6} bad requests and leaves the save untouched`);

    /* Schedule, round trip, move, campaign, take off. */
    let result = scheduleStreamingSlateTitle(shelf, { projectId: title.projectId, absoluteWeek: now + 3, marketingPlan: 'EVENT' });
    assert.ok(result.changed);
    const scheduled = result.player;
    const entry = entryOf(scheduled, title.projectId)!;
    assert.equal(launchAt + entry.launchWeek - 1, now + 3, 'It premieres in the chosen calendar week');
    assert.ok(entry.launchWeek > 12, 'A premiere after the opening programme keeps its week beyond twelve');
    assert.equal(entry.marketingPlan, 'EVENT');
    assert.equal(status(scheduled, title.projectId), 'SCHEDULED');
    const roundTrip = normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(scheduled.ownedStreamingPlatform)), scheduled.id);
    assert.equal(roundTrip.launchSlate!.entries.find(row => row.projectId === title.projectId)!.launchWeek, entry.launchWeek, 'The week survives a save round trip');
    assert.ok(createCanonicalContentDeskState(scheduled).slate.find(row => row.week === now + 3)!.releases.some(release => release.projectId === title.projectId && release.editable), 'The desk shows it in its week, editable');
    assert.equal(deskTitle(scheduled, title.projectId)!.status, 'SCHEDULED');
    assert.equal(deskTitle(scheduled, title.projectId)!.schedulable, false);
    result = scheduleStreamingSlateTitle(scheduled, { projectId: title.projectId, absoluteWeek: now + 5, marketingPlan: 'STANDARD' });
    assert.ok(result.changed);
    assert.equal(entryOf(result.player, title.projectId)!.id, entry.id, 'A move keeps the same entry');
    assert.equal(entryOf(result.player, title.projectId)!.marketingPlan, 'STANDARD');
    assert.equal(result.player.ownedStreamingPlatform.launchSlate!.entries.length, scheduled.ownedStreamingPlatform.launchSlate!.entries.length);
    assert.equal(launchAt + entryOf(result.player, title.projectId)!.launchWeek - 1, now + 5);
    assert.equal(getStreamingSlateFallback(result.player, title.projectId), 'SHELF');
    result = unscheduleStreamingSlateTitle(result.player, title.projectId);
    assert.ok(result.changed);
    assert.equal(entryOf(result.player, title.projectId), undefined);
    assert.equal(status(result.player, title.projectId), 'READY', 'Taken off, it is back on the shelves');
    assert.equal(deskTitle(result.player, title.projectId)!.schedulable, true);
    console.log('PASS schedules, keeps the week through a save, moves, re-campaigns and takes off');

    /* A licence whose window starts later. */
    const desk4 = createCanonicalContentDeskState(upcoming).slate.find(row => row.week === now + 4)!;
    assert.ok(desk4.releases.some(release => release.projectId === later.sourceProjectId && release.auto && release.rightsFrom === now + 4), 'Its start shows on the calendar as a premiere of its own');
    assert.equal(status(upcoming, later.sourceProjectId), 'AWAITING_AVAILABILITY');
    refused('a week before its rights start', scheduleStreamingSlateTitle(upcoming, { projectId: later.sourceProjectId, absoluteWeek: now + 3, marketingPlan: 'EVENT' }), 'BEFORE_RIGHTS_START', upcoming);
    result = scheduleStreamingSlateTitle(upcoming, { projectId: later.sourceProjectId, absoluteWeek: now + 6, marketingPlan: 'EVENT' });
    assert.ok(result.changed, 'Planned for a week after its rights start');
    assert.ok(createCanonicalContentDeskState(result.player).slate.find(row => row.week === now + 6)!.releases.some(release => release.projectId === later.sourceProjectId && release.editable), 'The plan replaces the automatic premiere');
    assert.ok(!createCanonicalContentDeskState(result.player).slate.find(row => row.week === now + 4)!.releases.some(release => release.projectId === later.sourceProjectId), 'Its start week no longer shows it');
    assert.equal(getStreamingSlateFallback(result.player, later.sourceProjectId), 'LICENCE_START');
    result = unscheduleStreamingSlateTitle(result.player, later.sourceProjectId);
    assert.ok(result.changed);
    assert.ok(createCanonicalContentDeskState(result.player).slate.find(row => row.week === now + 4)!.releases.some(release => release.projectId === later.sourceProjectId && release.auto), 'Taken off, it goes back to premiering at its rights start');
    console.log(`PASS ${later.titleAtSigning} (rights from week +4) is planned from its start, not before, and falls back to its start`);

    /* The premiere is real: scheduled two weeks out, it is not streamed in the
       processed weeks before its premiere week and is streamed in it. (A processed
       week's snapshot is the week the game moves into.) */
    const premiereWeek = now + 2;
    result = scheduleStreamingSlateTitle(shelf, { projectId: title.projectId, absoluteWeek: premiereWeek, marketingPlan: 'EVENT' });
    assert.ok(result.changed);
    let player = result.player;
    let watched = 0;
    for (let step = 0; step < 4 && !watched; step += 1) {
        player = (await processGameWeek(player)).player;
        const snapshot = player.ownedStreamingPlatform.weeklyHistory.at(-1)!;
        const row = snapshot.operations!.titlePerformance.find(item => item.projectId === title.projectId);
        if (snapshot.absoluteWeek < premiereWeek) {
            assert.ok(!row || row.viewingAccounts === 0, `Not streamed in week ${snapshot.absoluteWeek}, before its premiere week ${premiereWeek}`);
            assert.equal(status(player, title.projectId), 'SCHEDULED');
        } else {
            assert.equal(snapshot.absoluteWeek, premiereWeek, 'The first week it can be streamed is its premiere week');
            assert.ok(row && row.viewingAccounts > 0, `${title.title} was watched in its premiere week`);
            assert.equal(status(player, title.projectId), 'LIVE');
            assert.equal(unscheduleStreamingSlateTitle(player, title.projectId).reason, 'ALREADY_PREMIERED');
            watched = row!.viewingAccounts;
        }
    }
    assert.ok(watched > 0, 'The premiere week was reached and watched');
    console.log(`PASS ${title.title} was not streamed before week ${premiereWeek} and was watched by ${watched.toLocaleString()} accounts in it`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
