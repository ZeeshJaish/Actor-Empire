import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Commitment, type OwnedStreamingOriginalCommission, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getOwnedStreamingProgramEntries, getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import {
    autoFillStreamingSlate, clearStreamingSlatePlans, planStreamingSlateAutoFill, scheduleStreamingSlateTitle, unscheduleStreamingSlateTitle,
} from '../services/streamingSlateProgramming';
import { getOriginalMaking, getOriginalTitleDetail, ORIGINAL_FIRST_LOOK_PULL, takeOriginalExtra, takeOriginalNote } from '../services/originalsTitleDetail';
import { getOriginalsDeskView } from '../services/originalsDesk';
import { createCanonicalContentDeskState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { quoteStreamingCampaign, streamingCampaignSubjects } from '../services/campaigns/streamingCampaigns';

/* #290 and #291: an Original's one page, and its week on the Slate. No localization bay, no free launch weight. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-slate-audit', name: 'Audit', age: 30, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

const PROJECT = 'job_slate';
const COMMISSION = 'commission_slate';
const job = (phase: string, studioId: string): Commitment => ({
    id: PROJECT, name: 'Harrow Lane', type: 'JOB', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: phase, phaseWeeksLeft: phase === 'AWAITING_RELEASE' ? 0 : 5, totalPhaseDuration: 8,
    productionCalendar: { preProductionWeeks: 6, productionWeeks: 10, postProductionWeeks: 12, totalWeeks: 28, focusWindowWeeks: 21, elapsedWeeks: phase === 'AWAITING_RELEASE' ? 28 : 8 },
    projectDetails: {
        title: 'Harrow Lane', sourceScriptId: 'script_slate', type: 'SERIES', subtype: 'STANDALONE', genre: 'DRAMA', budgetTier: 'MID', estimatedBudget: 50_000_000, episodes: 8, studioId,
        description: 'A town keeps a secret.', directorName: 'Ada Penn', directorId: 'npc_director',
        castList: [{ id: 'a', name: 'Mara Quill', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', roleType: 'LEAD', actorId: 'a', characterName: 'Tess' }],
        hiddenStats: { qualityScore: 72, rawHype: 50, scriptQuality: 66, castingStrength: 66, directorQuality: 66, backendPct: 0, outsideOriginal: true, ownedStreamingOriginal: true, ownedStreamingCommissionId: COMMISSION },
    },
} as unknown as Commitment);
const commission = (studioId: string): OwnedStreamingOriginalCommission => ({
    id: COMMISSION, scriptId: 'script_slate', canonicalProjectId: PROJECT, title: 'Harrow Lane', gapId: 'SERIES_RETENTION', projectType: 'SERIES', genre: 'DRAMA', episodes: 8,
    producerStudioId: studioId, producerStudioName: 'Warner Bros.', commissionedByPlatformName: 'Test', productionBudgetCap: 60_000_000, productionFundingApplied: 60_000_000,
    status: 'GREENLIT', commissionedAtAbsoluteWeek: 1, greenlitAtAbsoluteWeek: 1, lineageId: COMMISSION, seasonNumber: 1,
    contract: { platformRightsPercent: 100, producerBackendPercent: 0, exclusiveWindowWeeks: 104, sequelRightsIncluded: true },
    localization: null, releasePlan: null, lifecycleDecision: null, way: 'PITCH', deal: 'BUY', making: 50_000_000, fee: 10_000_000, feePercent: 20,
    issues: [{ id: 'one', kind: 'BUDGET', atElapsedWeek: 7, amount: 2_000_000, qualityRisk: 3, status: 'PAID' }, { id: 'two', kind: 'QUALITY', atElapsedWeek: 40, amount: 1_000_000, qualityRisk: 3, status: 'UPCOMING' }],
} as OwnedStreamingOriginalCommission);

const run = async () => {
    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    const base = ('player' in built ? built.player : built) as Player;
    assert.equal(base.ownedStreamingPlatform.lifecycle, 'ACTIVE');
    const studioId = 'WARNER_BROS';
    const withTitle = (phase: string): Player => ({
        ...base,
        commitments: [...base.commitments, job(phase, studioId)],
        ownedStreamingPlatform: { ...base.ownedStreamingPlatform, treasuryCash: 500_000_000, originalCommissions: [...base.ownedStreamingPlatform.originalCommissions, commission(studioId)] },
    });
    const now = getAbsoluteWeek(base.age, base.currentWeek);
    const titleIn = (player: Player) => createCanonicalContentDeskState(player).titles.find(item => item.id === PROJECT)!;
    const slateItem = (player: Player) => createCanonicalContentDeskState(player).slate.flatMap(week => week.releases.map(release => ({ ...release, week: week.week }))).find(release => release.projectId === PROJECT);
    const planOf = (player: Player) => player.ownedStreamingPlatform.originalCommissions.find(item => item.id === COMMISSION)!.releasePlan;
    const jobOf = (player: Player) => player.commitments.find(item => item.id === PROJECT);

    /* --- while it is being made */
    const making = withTitle('PRODUCTION');
    const madeView = getOriginalTitleDetail(making, COMMISSION)!;
    assert.equal(madeView.stage, 'MAKING');
    assert.equal(madeView.stageChip, 'PRODUCTION');
    assert.equal(madeView.journeyAt, 1);
    assert.equal(madeView.weeksLeft, 20);
    assert.equal(madeView.totalWeeks, 28);
    assert.equal(madeView.paid, 62_000_000, 'the bill and what it has paid since');
    assert.match(madeView.paidLine, /\$50M \+ Warner Bros\.' 20%/);
    assert.deepEqual(madeView.team.map(person => person.name), ['Ada Penn', 'Mara Quill']);
    assert.match(madeView.team[1].role, /Tess/);
    assert.deepEqual(madeView.issues.map(issue => issue.id), ['one'], 'only what has happened');
    assert.equal(titleIn(making).schedulable, false, 'not on the shelves yet');
    assert.equal(scheduleStreamingSlateTitle(making, { projectId: PROJECT, absoluteWeek: now + 3, marketingPlan: 'STANDARD' }).reason, 'ORIGINAL_NOT_READY');

    /* notes: energy for a little quality, once a phase */
    assert.equal(madeView.note?.id, 'SET');
    const noted = takeOriginalNote(making, COMMISSION);
    assert.ok(noted.changed);
    assert.equal(jobOf(noted.player)!.projectDetails!.hiddenStats.qualityScore, 74);
    assert.equal(noted.player.energy.current, making.energy.current - 8);
    assert.equal(making.energy.current, 100, 'the old player is left alone');
    assert.equal(getOriginalTitleDetail(noted.player, COMMISSION)!.note?.taken, true);
    assert.equal(takeOriginalNote(noted.player, COMMISSION).changed, false, 'once a phase');
    const tired = { ...making, energy: { ...making.energy, current: 3 } };
    assert.equal(takeOriginalNote(tired, COMMISSION).changed, false, 'no energy, no note');
    const postPhase: Player = { ...noted.player, commitments: noted.player.commitments.map(item => (item.id === PROJECT ? { ...item, projectPhase: 'POST_PRODUCTION' } : item)) };
    assert.equal(getOriginalTitleDetail(postPhase, COMMISSION)!.note?.id, 'EDIT', 'the next phase has its own');
    assert.equal(getOriginalTitleDetail(postPhase, COMMISSION)!.note?.taken, false);
    /* #306: one more thing in each phase, each with its own effect */
    assert.equal(madeView.extra?.id, 'FIRST_LOOK');
    const looked = takeOriginalExtra(making, COMMISSION);
    assert.ok(looked.changed);
    assert.equal(jobOf(looked.player)!.projectDetails!.hiddenStats.previousSeasonHype, ORIGINAL_FIRST_LOOK_PULL, 'a first look brings people to its first weeks');
    assert.equal(jobOf(looked.player)!.projectDetails!.hiddenStats.qualityScore, 72, 'it is not more quality');
    assert.equal(looked.player.energy.current, making.energy.current - 8);
    assert.equal(takeOriginalExtra(looked.player, COMMISSION).changed, false, 'once');
    assert.equal(getOriginalTitleDetail(looked.player, COMMISSION)!.notesTaken, 0, 'it is not a quality note');
    assert.equal(takeOriginalExtra({ ...making, energy: { ...making.energy, current: 3 } }, COMMISSION).changed, false, 'no energy, nothing');
    const atPhase = (phase: string): Player => ({ ...making, commitments: making.commitments.map(item => (item.id === PROJECT ? { ...item, projectPhase: phase } as any : item)) });
    const postView = getOriginalTitleDetail(atPhase('POST_PRODUCTION'), COMMISSION)!;
    assert.equal(postView.extra?.id, 'TEST_SCREENING');
    assert.equal(postView.testScore, null, 'no score until you have shown it');
    const screened = takeOriginalExtra(atPhase('POST_PRODUCTION'), COMMISSION);
    assert.equal(jobOf(screened.player)!.projectDetails!.hiddenStats.qualityScore, 73);
    assert.equal(getOriginalTitleDetail(screened.player, COMMISSION)!.testScore, 73, 'and now you know');
    const pre = atPhase('PRE_PRODUCTION');
    assert.equal(getOriginalTitleDetail(pre, COMMISSION)!.extra?.id, 'TABLE_READ');
    const issuesBefore = pre.ownedStreamingPlatform.originalCommissions.find(item => item.id === COMMISSION)!.issues!;
    const read = takeOriginalExtra(pre, COMMISSION);
    const issuesAfter = read.player.ownedStreamingPlatform.originalCommissions.find(item => item.id === COMMISSION)!.issues!;
    if (issuesBefore.some(issue => issue.status === 'UPCOMING')) {
        assert.equal(issuesAfter.filter(issue => issue.status === 'UPCOMING').length, issuesBefore.filter(issue => issue.status === 'UPCOMING').length - 1, 'one less problem');
        assert.equal(jobOf(read.player)!.projectDetails!.hiddenStats.qualityScore, 72);
    } else {
        assert.equal(jobOf(read.player)!.projectDetails!.hiddenStats.qualityScore, 73, 'nothing to catch: it still helps');
    }
    /* your own studio has the Career tab instead */
    const house = { id: studioId, type: 'PRODUCTION_HOUSE', name: 'House', balance: 0, stats: {}, studioState: {} } as any;
    const ownJob: Player = { ...making, businesses: [...making.businesses, house], commitments: making.commitments.map(item => (item.id !== PROJECT ? item : { ...item, projectDetails: { ...item.projectDetails!, hiddenStats: { ...item.projectDetails!.hiddenStats, outsideOriginal: undefined } } })) };
    assert.equal(getOriginalTitleDetail(ownJob, COMMISSION)!.note, null);
    assert.equal(getOriginalTitleDetail(ownJob, COMMISSION)!.extra, null);
    assert.equal(getOriginalTitleDetail(ownJob, COMMISSION)!.byLabel, 'BY YOUR STUDIO');

    /* --- delivered: on the shelves */
    const ready = withTitle('AWAITING_RELEASE');
    assert.equal(getOriginalTitleDetail(ready, COMMISSION)!.stage, 'READY');
    assert.equal(getOriginalTitleDetail(ready, COMMISSION)!.note, null, 'nothing to visit now');
    assert.equal(titleIn(ready).schedulable, true, 'on the shelves, with no bay in the way');
    assert.ok(planStreamingSlateAutoFill(ready).some(item => item.projectId === PROJECT), 'Auto-fill can place it');

    /* --- a week on the Slate */
    const scheduled = scheduleStreamingSlateTitle(ready, { projectId: PROJECT, absoluteWeek: now + 3, marketingPlan: 'EVENT' });
    assert.ok(scheduled.changed, String(scheduled.reason));
    const plan = planOf(scheduled.player)!;
    assert.equal(plan.premiereAtAbsoluteWeek, now + 3);
    assert.equal(plan.marketingPlan, 'STANDARD', 'the Campaign Studio is what gives it weight, not the Slate');
    assert.equal(plan.releasePattern, 'FULL_SEASON');
    assert.equal(jobOf(scheduled.player)!.phaseWeeksLeft, 3);
    assert.equal(jobOf(scheduled.player)!.projectDetails!.releaseStrategy, 'STREAMING_ONLY');
    const onSlate = getOriginalTitleDetail(scheduled.player, COMMISSION)!;
    assert.equal(onSlate.stage, 'ON_SLATE');
    assert.equal(onSlate.premiere?.weeksAway, 3);
    const item = slateItem(scheduled.player)!;
    assert.equal(item.week, now + 3);
    assert.equal(item.editable, true);
    assert.equal(item.rhythm, 'ALL');
    assert.equal(titleIn(scheduled.player).schedulable, false, 'off the shelf now');
    assert.ok(!planStreamingSlateAutoFill(scheduled.player).some(row => row.projectId === PROJECT));

    /* a licence's three years run from its premiere, however long it took to make */
    const onLicence: Player = { ...ready, ownedStreamingPlatform: { ...ready.ownedStreamingPlatform, originalCommissions: ready.ownedStreamingPlatform.originalCommissions.map(item => (item.id === COMMISSION ? { ...item, deal: 'LICENCE' as const, licenceEndsAtAbsoluteWeek: now + 100 } : item)) } };
    const bookedLicence = scheduleStreamingSlateTitle(onLicence, { projectId: PROJECT, absoluteWeek: now + 5, marketingPlan: 'STANDARD' });
    assert.equal(bookedLicence.player.ownedStreamingPlatform.originalCommissions.find(item => item.id === COMMISSION)!.licenceEndsAtAbsoluteWeek, now + 5 + 156);

    /* the rhythm */
    const weekly = scheduleStreamingSlateTitle(scheduled.player, { projectId: PROJECT, absoluteWeek: now + 3, marketingPlan: 'STANDARD', releasePattern: 'WEEKLY' });
    assert.equal(planOf(weekly.player)!.releasePattern, 'WEEKLY');
    assert.equal(slateItem(weekly.player)!.rhythm, 'WEEKLY');
    assert.equal(planOf(scheduleStreamingSlateTitle(weekly.player, { projectId: PROJECT, absoluteWeek: now + 4, marketingPlan: 'STANDARD' }).player)!.releasePattern, 'WEEKLY', 'moving it keeps its rhythm');
    assert.equal(planOf(scheduleStreamingSlateTitle(scheduled.player, { projectId: PROJECT, absoluteWeek: now + 3, marketingPlan: 'STANDARD', releasePattern: 'SPLIT_VOLUME' }).player)!.releasePattern, 'FULL_SEASON', 'only what the engine tells apart');

    /* moved */
    const moved = scheduleStreamingSlateTitle(scheduled.player, { projectId: PROJECT, absoluteWeek: now + 6, marketingPlan: 'STANDARD' });
    assert.equal(planOf(moved.player)!.premiereAtAbsoluteWeek, now + 6);
    assert.equal(jobOf(moved.player)!.phaseWeeksLeft, 6);
    assert.equal(slateItem(moved.player)!.week, now + 6);

    /* off */
    const off = unscheduleStreamingSlateTitle(moved.player, PROJECT);
    assert.ok(off.changed, String(off.reason));
    assert.equal(planOf(off.player), null);
    assert.equal(jobOf(off.player)!.projectDetails!.releaseStrategy, undefined);
    assert.equal(jobOf(off.player)!.projectPhase, 'AWAITING_RELEASE');
    assert.equal(getOriginalTitleDetail(off.player, COMMISSION)!.stage, 'READY');
    assert.equal(titleIn(off.player).schedulable, true, 'back on the shelf');

    /* Auto-fill and Remove all */
    const filled = autoFillStreamingSlate(ready);
    assert.ok(planOf(filled.player)?.premiereAtAbsoluteWeek! > now, 'Auto-fill gives it a real week');
    const cleared = clearStreamingSlatePlans(filled.player);
    assert.equal(planOf(cleared.player), null, 'Remove all takes it off');
    assert.ok(cleared.removed.includes('Harrow Lane'));

    /* a title made and archived, with its week still ahead (an old save), reads as on the Slate */
    const archivedAhead: Player = { ...scheduled.player, commitments: scheduled.player.commitments.filter(item => item.id !== PROJECT), pastProjects: [...scheduled.player.pastProjects, { id: PROJECT, name: 'Harrow Lane', studioId, outsideOriginal: true, projectType: 'SERIES', genre: 'DRAMA', castList: [], reviews: [] } as any] };
    assert.equal(getOriginalTitleDetail(archivedAhead, COMMISSION)!.stage, 'ON_SLATE');

    /* an older commission that holds no money reads what it cost from its own record */
    const noMoney: Player = { ...archivedAhead, pastProjects: archivedAhead.pastProjects.map(row => (row.id === PROJECT ? { ...row, budget: 33_000_000 } as any : row)), ownedStreamingPlatform: { ...archivedAhead.ownedStreamingPlatform, originalCommissions: archivedAhead.ownedStreamingPlatform.originalCommissions.map(item => (item.id === COMMISSION ? { ...item, making: 0, productionFundingApplied: 0, productionBudgetCap: 0, issues: [] } : item)) } };
    assert.equal(getOriginalMaking(noMoney, noMoney.ownedStreamingPlatform.originalCommissions.find(item => item.id === COMMISSION)!), 33_000_000);
    assert.equal(getOriginalTitleDetail(noMoney, COMMISSION)!.paid, 33_000_000);
    const tierOnly: Player = { ...noMoney, pastProjects: noMoney.pastProjects.map(row => (row.id === PROJECT ? { ...row, budget: 0, budgetTier: 'HIGH' } as any : row)) };
    assert.equal(getOriginalMaking(tierOnly, tierOnly.ownedStreamingPlatform.originalCommissions.find(item => item.id === COMMISSION)!), 120_000_000, 'never $0');
    /* the Desk: a premiere still ahead is on the Active Slate, not Live */
    const aheadOnDesk = getOriginalsDeskView(archivedAhead);
    assert.ok(aheadOnDesk.making.some(item => item.commission.id === COMMISSION && item.phaseLabel === 'ON SLATE' && item.weeksLeft === 3));
    assert.ok(!aheadOnDesk.live.some(item => item.commission.id === COMMISSION));

    /* on the opening slate: its week is there */
    const launchAt = base.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek;
    const withOpening = (programmeWeek: number): Player => ({ ...ready, ownedStreamingPlatform: { ...ready.ownedStreamingPlatform, launchSlate: { ...ready.ownedStreamingPlatform.launchSlate!, entries: [...ready.ownedStreamingPlatform.launchSlate!.entries, { id: 'opening', projectId: PROJECT, title: 'Harrow Lane', source: 'ORIGINAL', projectType: 'SERIES', genre: 'DRAMA', launchWeek: programmeWeek, releasePattern: 'FULL_SEASON', marketingPlan: 'STANDARD' }] } } });
    assert.equal(getOriginalTitleDetail(withOpening(now - launchAt + 5), COMMISSION)!.stage, 'ON_SLATE');
    assert.equal(getOriginalTitleDetail(withOpening(now - launchAt + 5), COMMISSION)!.premiere?.weeksAway, 4);
    assert.equal(getOriginalTitleDetail(withOpening(1), COMMISSION)!.stage, 'LIVE');

    /* --- a campaign can build the premiere */
    assert.ok(!streamingCampaignSubjects(ready).some(subject => subject.id === PROJECT), 'not before it has a week');
    assert.ok(streamingCampaignSubjects(scheduled.player).some(subject => subject.id === PROJECT), 'once it has a week');
    const quote = quoteStreamingCampaign(scheduled.player, { subject: { kind: 'TITLE', id: PROJECT }, where: { kind: 'WORLD' }, formats: ['SOCIAL'], budget: 2_000_000 } as any);
    assert.ok(!quote.problems.includes('NO_SUBJECT'), JSON.stringify(quote.problems));

    /* --- it opens */
    let current = scheduled.player;
    for (let week = 0; week < 3; week += 1) {
        assert.notEqual(getStreamingContentAvailability(current, PROJECT).status, 'LIVE', `not live ${week} weeks in`);
        current = (await processGameWeek(current)).player;
    }
    assert.ok(!jobOf(current), 'it has left production');
    assert.ok(current.pastProjects.some(row => row.id === PROJECT));
    const commissionNow = current.ownedStreamingPlatform.originalCommissions.find(row => row.id === COMMISSION)!;
    assert.equal(getStreamingOriginalLiveStatus(current, commissionNow), 'RELEASED');
    assert.ok(getOwnedStreamingProgramEntries(current).some(entry => entry.projectId === PROJECT), 'on the programme');
    assert.equal(getStreamingContentAvailability(current, PROJECT).status, 'LIVE');
    current = (await processGameWeek(current)).player;
    const live = getOriginalTitleDetail(current, COMMISSION)!;
    assert.equal(live.stage, 'LIVE');
    assert.equal(live.journeyAt, 5);
    assert.ok(live.live && live.live.viewers > 0, `real viewers, got ${live.live?.viewers}`);
    assert.ok(live.live!.finished > 0 && live.live!.finished <= 100);
    assert.ok(live.rating && live.rating > 0);
    assert.equal(live.episodes.length, 8, 'named episodes');
    assert.ok(live.episodes.every(episode => episode.name && episode.rating), 'with ratings');
    assert.equal(live.episodes.filter(episode => episode.best).length >= 1, true);
    assert.equal(slateItem(current)?.editable, undefined, 'its premiere has come');
    assert.equal(unscheduleStreamingSlateTitle(current, PROJECT).reason, 'ALREADY_PREMIERED');

    console.log('original slate audit passed');
};
run().catch(error => { console.error(error); process.exit(1); });
