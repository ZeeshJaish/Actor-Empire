import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingOriginalPitch, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { advanceOriginalPitches, getLiveOriginalPitches, passOriginalPitch } from '../services/originalsPitches';
import { runOriginalPitchRivalsWeek } from '../services/originalsRivals';
import { getPitchFee } from '../services/originalsDeal';
import { estimatePitchAsk, getOriginalsDeskView } from '../services/originalsDesk';
import { getOriginalsStudios } from '../services/originalsStudios';
import { getOriginalTitleDetail } from '../services/originalsTitleDetail';
import { originalOnTheShelf, scheduleStreamingSlateTitle } from '../services/streamingSlateProgramming';
import { getOriginalFutureView } from '../services/originalsRenewal';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { processGameWeek } from '../services/gameLoop';

/* #294: rivals read the same pitches; the ones you passed on have a life of their own; a bid-room order is a title like the rest. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-rivals-audit', name: 'Audit', age: 30, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const base = advanceOriginalPitches(prepareStreamingFullPlatformQa(fresh()));
const now = getAbsoluteWeek(base.age, base.currentWeek);
const later = (player: Player, weeks: number): Player => ({ ...player, currentWeek: player.currentWeek + weeks });
const pitchesOf = (player: Player) => player.ownedStreamingPlatform.originalPitches!.pitches;
const stateOf = (player: Player) => player.ownedStreamingPlatform.originalPitches!;

/* --- interest: real, for some, more for a good script */
const seen: OwnedStreamingOriginalPitch[] = [];
for (let index = 0; index < 400; index += 1) {
    const pitch = pitchesOf(base)[index % pitchesOf(base).length];
    const quality = index % 2 ? 90 : 40;
    const made: OwnedStreamingOriginalPitch = { ...pitch, id: `p${index}`, seed: `seed${index}`, script: { ...pitch.script, quality }, createdAtAbsoluteWeek: now, answerByAbsoluteWeek: now + 4 };
    const week: Player = { ...later(base, 1), ownedStreamingPlatform: { ...base.ownedStreamingPlatform, originalPitches: { ...stateOf(base), pitches: [made] } } };
    seen.push(pitchesOf(runOriginalPitchRivalsWeek(week))[0]);
}
const chased = seen.filter(pitch => pitch?.chasedByPlatformName);
const good = chased.filter(pitch => pitch.script.quality === 90).length;
const poor = chased.filter(pitch => pitch.script.quality === 40).length;
assert.ok(good > poor, `a good script draws more: ${good} and ${poor}`);
assert.ok(chased.length > 40 && chased.length < 200, `some, not all: ${chased.length} of 400`);
chased.forEach(pitch => {
    assert.ok(pitch.priceClimbPercent! >= 8 && pitch.priceClimbPercent! <= 20);
    assert.equal(pitch.answerByAbsoluteWeek, now + 3, 'less time to answer');
});
assert.ok(new Set(chased.map(pitch => pitch.chasedByPlatformName)).size >= 3, 'more than one rival');

/* the price follows */
const example = chased[0];
const studio = getOriginalsStudios(base).find(card => card.id === example.studioId) || getOriginalsStudios(base)[0];
const calm: OwnedStreamingOriginalPitch = { ...example, chasedByPlatformName: undefined, priceClimbPercent: undefined };
assert.equal(getPitchFee(studio, example).percent, getPitchFee(studio, calm).percent + example.priceClimbPercent!);
assert.match(getPitchFee(studio, example).why, /after it too/);
assert.ok(estimatePitchAsk(base, example, studio, 8).total > estimatePitchAsk(base, calm, studio, 8).total, 'the ask climbs on the Desk');

/* once decided, it stays decided */
const chasedWorld: Player = { ...later(base, 1), ownedStreamingPlatform: { ...base.ownedStreamingPlatform, originalPitches: { ...stateOf(base), pitches: [example] } } };
assert.equal(pitchesOf(runOriginalPitchRivalsWeek(chasedWorld))[0].priceClimbPercent, example.priceClimbPercent);

/* --- run out with a rival at the door */
const expired: OwnedStreamingOriginalPitch = { ...example, answerByAbsoluteWeek: now };
const taken = runOriginalPitchRivalsWeek({ ...later(base, 1), ownedStreamingPlatform: { ...base.ownedStreamingPlatform, originalPitches: { ...stateOf(base), pitches: [expired] } } });
assert.equal(pitchesOf(taken).length, 0);
assert.equal(stateOf(taken).passed.at(-1)!.madeByPlatformName, example.chasedByPlatformName);
assert.equal(stateOf(taken).passed.at(-1)!.lostToRival, true);
assert.ok(taken.logs.at(-1)!.message.includes('picked up'), 'the activity log, no popup');
assert.equal((taken.pendingEvents || []).length, (base.pendingEvents || []).length);

/* --- the one you passed on */
const firstPitch = getLiveOriginalPitches(base)[0];
const passed = passOriginalPitch(base, firstPitch.id);
const record = stateOf(passed).passed.at(-1)!;
assert.equal(record.title, firstPitch.script.title);
assert.equal(record.quality, firstPitch.script.quality);
assert.ok(record.leadName, 'who it had');
assert.ok(record.directorName, 'and who was to direct');
/* across many: some are picked up, the rest are not */
let pickedUp = 0;
let hits = 0;
let flops = 0;
for (let index = 0; index < 120; index += 1) {
    const item = { ...record, id: `passed${index}`, passedAtAbsoluteWeek: now, quality: 30 + (index % 60) };
    const one: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, originalPitches: { ...stateOf(base), pitches: [], passed: [item] } } };
    const week6 = runOriginalPitchRivalsWeek(later(one, 6));
    const six = stateOf(week6).passed[0];
    assert.equal(six.rivalChecked, true);
    if (!six.madeByPlatformName) {
        assert.equal(stateOf(runOriginalPitchRivalsWeek(later(week6, 40))).passed[0].madeByPlatformName, undefined, 'asked once');
        continue;
    }
    pickedUp += 1;
    assert.equal(six.rating, undefined, 'being made');
    const logsBefore = week6.logs.length;
    const opened = runOriginalPitchRivalsWeek(later(week6, 30));
    const done = stateOf(opened).passed[0];
    assert.ok(done.rating! >= 3 && done.rating! <= 9.4);
    assert.ok(opened.world.projects.some(project => project.id === `passed_${item.id}`), 'it is a real title in the world');
    assert.equal(opened.world.projects.filter(project => project.id === `passed_${item.id}`).length, 1);
    if (done.rating! >= 7.6) { hits += 1; assert.match(opened.logs.at(-1)!.message, /hit on/); }
    else if (done.rating! < 6) { flops += 1; assert.match(opened.logs.at(-1)!.message, /flopped/); }
    else assert.equal(opened.logs.length, logsBefore, 'nothing to say about a middling one');
    assert.deepEqual(stateOf(runOriginalPitchRivalsWeek(later(opened, 1))).passed[0], done, 'decided once');
}
assert.ok(pickedUp > 25 && pickedUp < 80, `about 40%: ${pickedUp} of 120`);
assert.ok(hits > 0 && flops > 0, `both ways: ${hits} hits, ${flops} flops`);

/* on the Desk */
const away: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, originalPitches: { ...stateOf(base), passed: [{ ...record, madeByPlatformName: 'Netflix', rating: 8.1 }] } } };
assert.equal(getOriginalsDeskView(away).gotAway[0].title, record.title);
assert.equal(getOriginalsDeskView(base).gotAway.length, 0);

/* quiet weeks change nothing */
const quiet: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, originalPitches: { ...stateOf(base), pitches: [], passed: [] } } };
assert.equal(runOriginalPitchRivalsWeek(quiet), quiet);

/* --- a bid-room order is a title like the rest */
const run = async () => {
const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
const company = ('player' in built ? built.player : built) as Player;
const nowLive = getAbsoluteWeek(company.age, company.currentWeek);
const ORDER = 'order_project';
const commission = {
    id: 'order_commission', scriptId: 'order_script', canonicalProjectId: ORDER, title: 'Salt and Iron', gapId: 'SERIES_RETENTION', projectType: 'SERIES', genre: 'DRAMA', episodes: 8,
    producerStudioId: 'WARNER_BROS', producerStudioName: 'Warner Bros.', commissionedByPlatformName: 'Test', productionBudgetCap: 40_000_000, productionFundingApplied: 40_000_000,
    status: 'IN_PRODUCTION', commissionedAtAbsoluteWeek: nowLive - 40, greenlitAtAbsoluteWeek: nowLive - 40, lineageId: ORDER, seasonNumber: 1, parentCommissionId: null,
    contract: { platformRightsPercent: 85, producerBackendPercent: 15, exclusiveWindowWeeks: 104, sequelRightsIncluded: false }, localization: null, releasePlan: null, lifecycleDecision: null,
} as any;
const production = (status: string) => ({
    id: 'order_production', canonicalProjectId: ORDER, title: 'Salt and Iron', projectType: 'SERIES', genre: 'DRAMA', producerStudioId: 'WARNER_BROS', source: 'PLATFORM_COMMISSION', status,
    productionCalendar: { preProductionWeeks: 10, productionWeeks: 26, postProductionWeeks: 16, totalWeeks: 52, focusWindowWeeks: 39, elapsedWeeks: status === 'DELIVERED' ? 52 : 20, startedAbsoluteWeek: nowLive - 20 },
    budgetMillions: 40, paidMillions: 20, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Story Department', writerSkill: 65, createdAtAbsoluteWeek: nowLive - 20, updatedAtAbsoluteWeek: nowLive,
    aiExecution: { leadActorId: 'a', leadActorName: 'Mara Quill', directorId: 'b', directorName: 'Ada Penn', qualityForecast: 70 },
}) as any;
const withOrder = (status: string, extra: any = {}): Player => ({
    ...company,
    world: { ...company.world, industryProductions: { ...company.world.industryProductions, order_production: production(status) } },
    ownedStreamingPlatform: {
        ...company.ownedStreamingPlatform,
        treasuryCash: 900_000_000,
        originalCommissions: [...company.ownedStreamingPlatform.originalCommissions, { ...commission, ...extra }],
    },
});
const inMaking = withOrder('PRODUCTION');
const desk = getOriginalsDeskView(inMaking).making.find(item => item.commission.id === 'order_commission')!;
assert.equal(desk.phaseLabel, 'PRODUCTION');
assert.equal(desk.weeksLeft, 32);
const page = getOriginalTitleDetail(inMaking, 'order_commission')!;
assert.equal(page.stage, 'MAKING');
assert.equal(page.journeyAt, 1);
assert.deepEqual(page.team.map(person => person.name), ['Ada Penn', 'Mara Quill']);
assert.equal(page.weeksLeft, 32);
assert.equal(originalOnTheShelf(inMaking, ORDER), null);
assert.equal(scheduleStreamingSlateTitle(inMaking, { projectId: ORDER, absoluteWeek: nowLive + 2, marketingPlan: 'STANDARD' }).reason, 'ORIGINAL_NOT_READY');

const deliveredOrder = withOrder('DELIVERED');
assert.equal(getOriginalTitleDetail(deliveredOrder, 'order_commission')!.stage, 'READY');
assert.equal(getOriginalsDeskView(deliveredOrder).making.find(item => item.commission.id === 'order_commission')!.phaseLabel, 'READY');
assert.ok(originalOnTheShelf(deliveredOrder, ORDER));
const booked = scheduleStreamingSlateTitle(deliveredOrder, { projectId: ORDER, absoluteWeek: nowLive + 2, marketingPlan: 'STANDARD' });
assert.ok(booked.changed, String(booked.reason));
assert.equal(getOriginalTitleDetail(booked.player, 'order_commission')!.stage, 'ON_SLATE');

/* and it can be renewed from what it became */
const wentLive: Player = {
    ...withOrder('RELEASED', { status: 'RELEASED', releasePlan: { scope: 'GLOBAL', releasePattern: 'FULL_SEASON', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: nowLive - 8, authorizedAtAbsoluteWeek: nowLive - 8 } }),
};
const lived: Player = { ...wentLive, world: { ...wentLive.world, projects: [...wentLive.world.projects, { id: ORDER, title: 'Salt and Iron', genre: 'DRAMA', mediaType: 'SERIES', studioId: 'WARNER_BROS', budgetTier: 'MID', quality: 74, rating: 7.8, boxOffice: 0, year: company.age, weekReleased: 1, leadActorId: 'a', leadActorName: 'Mara Quill', directorId: 'b', directorName: 'Ada Penn', reviews: 'x' } as any] } };
assert.equal(getOriginalTitleDetail(lived, 'order_commission')!.stage, 'LIVE');
const quote = getOriginalFutureView(lived, 'order_commission')!;
assert.ok(quote.next && quote.next.total > 0, 'a price for the next one');

console.log('original rivals audit passed');
};
run().catch(error => { console.error(error); process.exit(1); });
