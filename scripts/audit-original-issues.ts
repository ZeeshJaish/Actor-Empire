import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Commitment, type OwnedStreamingOriginalCommission, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    answerOriginalIssue, getOriginalBudgetFit, getOriginalIssueView, originalIssueEventData, planOriginalIssues, queueOriginalIssueEvents,
} from '../services/originalsIssues';

/* #289: a studio comes back for money, 0 to 3 times. Pay, watch an ad, or compromise. */

const calendar = { preProductionWeeks: 6, productionWeeks: 10, postProductionWeeks: 12, totalWeeks: 28, focusWindowWeeks: 21, elapsedWeeks: 0 };
const plan = (id: string, budgetControl: number, onSet: number, making = 40_000_000, genre = 'DRAMA') => planOriginalIssues({
    card: { id: 'studio', budgetControl, onSet }, commissionId: id, genre, making, episodes: 8, isSeries: true, calendar,
});

/* --- how many, and how much */
const average = (budgetControl: number, onSet: number, making?: number, genre?: string) => {
    let total = 0;
    for (let i = 0; i < 400; i += 1) total += plan(`c${i}`, budgetControl, onSet, making, genre).length;
    return total / 400;
};
for (let i = 0; i < 400; i += 1) {
    const issues = plan(`c${i}`, 20 + (i % 70), 30 + (i % 60), 20_000_000 + i * 200_000);
    assert.ok(issues.length <= 3, '0 to 3');
    let last = '';
    issues.forEach(issue => {
        const percent = issue.amount / (20_000_000 + i * 200_000);
        assert.ok(percent >= 0.029 && percent <= 0.121, `3 to 12% of the making, got ${percent}`);
        assert.ok(issue.qualityRisk >= 2 && issue.qualityRisk <= 6);
        assert.ok(issue.atElapsedWeek >= 7 && issue.atElapsedWeek < 28, 'after pre-production, before it is done');
        assert.notEqual(issue.kind, last, 'not the same trouble twice in a row');
        assert.equal(issue.status, 'UPCOMING');
        last = issue.kind;
    });
}
const careful = average(90, 90, 40_000_000);
const middling = average(55, 70, 40_000_000);
const reckless = average(20, 40, 40_000_000);
assert.ok(careful < middling && middling < reckless, `poor control and crew bring more: ${careful}, ${middling}, ${reckless}`);
assert.ok(careful >= 0.2 && careful <= 1, `a careful studio: ${careful}`);
assert.ok(middling >= 0.9 && middling <= 2, `about what the production side feels like: ${middling}`);
assert.ok(reckless >= 1.5 && reckless <= 3, `a reckless studio: ${reckless}`);
assert.ok(average(55, 70, 20_000_000, 'SCI_FI') > average(55, 70, 120_000_000, 'SCI_FI'), 'a thin budget brings more');
assert.ok(getOriginalBudgetFit('SCI_FI', 45_000_000, 8, true) < 1 && getOriginalBudgetFit('DOCUMENTARY', 45_000_000, 8, true) > 1);
assert.deepEqual(plan('same', 50, 60), plan('same', 50, 60), 'the same on a reload');

/* --- a title being made */
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-issues-audit', name: 'Audit', age: 30, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const base = prepareStreamingFullPlatformQa(fresh());
const job = (elapsedWeeks: number): Commitment => ({
    id: 'job_issue', name: 'Harrow Lane', type: 'JOB', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'PRODUCTION', phaseWeeksLeft: 8, totalPhaseDuration: 10,
    productionCalendar: { ...calendar, elapsedWeeks },
    projectDetails: {
        title: 'Harrow Lane', type: 'SERIES', genre: 'DRAMA', budgetTier: 'MID', estimatedBudget: 40_000_000, studioId: 'WARNER',
        location: { id: 'x', name: 'Lisbon, Portugal' },
        castList: [{ id: 'a', name: 'Mara Quill', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', roleType: 'LEAD', actorId: 'a' }],
        hiddenStats: { qualityScore: 70, rawHype: 40, outsideOriginal: true, ownedStreamingOriginal: true },
    },
} as unknown as Commitment);
const commission = (issues: OwnedStreamingOriginalCommission['issues']): OwnedStreamingOriginalCommission => ({
    id: 'commission_issue', scriptId: 'script', canonicalProjectId: 'job_issue', title: 'Harrow Lane', gapId: 'SERIES_RETENTION', projectType: 'SERIES', genre: 'DRAMA', episodes: 8,
    producerStudioId: 'WARNER', producerStudioName: 'Warner Bros.', commissionedByPlatformName: 'Test', productionBudgetCap: 50_000_000, productionFundingApplied: 50_000_000,
    status: 'GREENLIT', commissionedAtAbsoluteWeek: 1, greenlitAtAbsoluteWeek: 1, lineageId: 'commission_issue', seasonNumber: 1,
    contract: { platformRightsPercent: 100, producerBackendPercent: 0, exclusiveWindowWeeks: 104, sequelRightsIncluded: true },
    localization: null, releasePlan: null, lifecycleDecision: null, way: 'PITCH', deal: 'BUY', making: 40_000_000, fee: 10_000_000, feePercent: 25, issues,
} as OwnedStreamingOriginalCommission);
const withIssue = (elapsed: number, kind: 'QUALITY' | 'LOCATION' | 'BUDGET' = 'QUALITY', treasury = 90_000_000): Player => ({
    ...base,
    commitments: [...base.commitments, job(elapsed)],
    ownedStreamingPlatform: {
        ...base.ownedStreamingPlatform,
        treasuryCash: treasury,
        originalCommissions: [...base.ownedStreamingPlatform.originalCommissions, commission([
            { id: 'first', kind, atElapsedWeek: 8, amount: 3_000_000, qualityRisk: 4, status: 'UPCOMING' },
            { id: 'second', kind: 'BUDGET', atElapsedWeek: 12, amount: 2_000_000, qualityRisk: 3, status: 'UPCOMING' },
        ])],
    },
});
const data = { commissionId: 'commission_issue', issueId: 'first' };
const issueOf = (player: Player, id = 'first') => player.ownedStreamingPlatform.originalCommissions.find(item => item.id === 'commission_issue')!.issues!.find(item => item.id === id)!;
const events = (player: Player) => (player.pendingEvents || []).filter(event => event.type === 'ORIGINAL_ISSUE');

/* not yet */
assert.equal(events(queueOriginalIssueEvents(withIssue(7))).length, 0, 'not before its week');
/* due */
const raised = queueOriginalIssueEvents(withIssue(8));
assert.equal(events(raised).length, 1);
assert.deepEqual(originalIssueEventData(events(raised)[0]), data);
assert.equal(issueOf(raised).status, 'WAITING');
assert.equal(events(queueOriginalIssueEvents(raised)).length, 1, 'one popup at a time');
assert.equal(issueOf(queueOriginalIssueEvents(withIssue(20)), 'second').status, 'UPCOMING', 'the next waits its turn');
/* a popup that was lost comes back */
assert.equal(events(queueOriginalIssueEvents({ ...raised, pendingEvents: [] })).length, 1);
/* past the making, nothing */
const released: Player = { ...withIssue(30), commitments: base.commitments };
assert.equal(events(queueOriginalIssueEvents(released)).length, 0, 'a title that has left production asks for nothing');

/* the words: every kind reads as a sentence */
for (const kind of ['QUALITY', 'LOCATION', 'BUDGET'] as const) {
    const player = queueOriginalIssueEvents(withIssue(8, kind));
    const view = getOriginalIssueView(player, data)!;
    assert.ok(view.open);
    assert.ok(view.title && view.payLabel && view.compromiseLabel);
    assert.ok(!/[{}]/.test(view.line), view.line);
    assert.ok(view.line.includes('Harrow Lane'), view.line);
}

/* --- the three answers */
const before = raised.ownedStreamingPlatform.treasuryCash;
const paid = answerOriginalIssue(raised, data, 'PAY');
assert.ok(paid.changed);
assert.equal(paid.player.ownedStreamingPlatform.treasuryCash, before - 3_000_000, 'paid from the platform');
assert.equal(paid.player.money, raised.money, 'never the player\'s wallet');
assert.equal(issueOf(paid.player).status, 'PAID');
assert.equal(paid.player.commitments.find(item => item.id === 'job_issue')!.projectDetails!.hiddenStats.qualityScore, 70, 'nothing lost');
assert.ok(paid.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'ORIGINAL_ISSUE_PAID'));
assert.equal(answerOriginalIssue(paid.player, data, 'PAY').changed, false, 'once only');

const ad = answerOriginalIssue(raised, data, 'AD');
assert.equal(ad.player.ownedStreamingPlatform.treasuryCash, before, 'an ad costs nothing');
assert.equal(issueOf(ad.player).status, 'AD');
assert.equal(ad.player.commitments.find(item => item.id === 'job_issue')!.projectDetails!.hiddenStats.qualityScore, 70, 'and loses nothing');

const cut = answerOriginalIssue(raised, data, 'COMPROMISE');
assert.equal(cut.player.ownedStreamingPlatform.treasuryCash, before, 'compromise saves the money');
assert.equal(issueOf(cut.player).status, 'COMPROMISED');
assert.equal(cut.player.commitments.find(item => item.id === 'job_issue')!.projectDetails!.hiddenStats.qualityScore, 66, 'and quality falls');

const broke = queueOriginalIssueEvents(withIssue(8, 'QUALITY', 1_000_000));
assert.equal(getOriginalIssueView(broke, data)!.canPay, false);
assert.equal(answerOriginalIssue(broke, data, 'PAY').changed, false, 'cannot pay without the money');
assert.ok(answerOriginalIssue(broke, data, 'AD').changed && answerOriginalIssue(broke, data, 'COMPROMISE').changed, 'the other two still work');

/* a save keeps it */
const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(cut.player)));
assert.equal(issueOf(reloaded).status, 'COMPROMISED');
assert.equal(issueOf(reloaded, 'second').status, 'UPCOMING');

/* --- through the week itself */
const run = async () => {
    const week = (await processGameWeek(withIssue(8))).player;
    assert.equal(events(week).length, 1, 'the weekly loop brings it up');
    console.log('original issues audit passed');
};
run().catch(error => { console.error(error); process.exit(1); });
