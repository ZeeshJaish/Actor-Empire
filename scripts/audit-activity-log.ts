/**
 * #247: Zeesh (2026-11-05): "jaruri nahi har notification ke liye pop up use kare, movie release and kafi kuch ke liye hm log gave ka activity log use karte
 * hai jo main screen me hai". A popup only where the player must decide; what only tells goes to the activity log. And a line that goes in the log stays there.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { addActivityLog, inActivityOrder, inFeedOrder, isOldWorldLine } from '../services/activityLog';
import { industryRoundupOf, isAboutThePlayer, withIndustryRoundup } from '../services/industryRoundup';
import { queueStreamingDecisionEvents, streamingDecisionEventData } from '../services/streamingDecisionEvent';

const pass = (label: string) => console.log(`PASS ${label}`);
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'activity-log-audit', name: 'Activity Log', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const decisions = (player: Player) => (player.pendingEvents || []).map(event => streamingDecisionEventData(event)?.kind).filter(Boolean);

async function main() {
    /* ---- the order */
    const base = { logs: [] as Player['logs'], currentWeek: 5, age: 30 };
    const once = addActivityLog(base, 'first', 'neutral');
    const twice = addActivityLog(once, 'second', 'positive');
    assert.deepEqual(twice.logs.map(log => log.message), ['first', 'second'], 'a new line goes at the end');
    const mixed = [{ week: 5, year: 30, message: 'late' }, { week: 1, year: 30, message: 'early' }, { week: 5, year: 30, message: 'late too' }, { week: 50, year: 29, message: 'last year' }];
    assert.deepEqual(inActivityOrder(mixed).map(log => log.message), ['last year', 'early', 'late', 'late too'], 'oldest first; a week keeps its order');
    pass('the log reads oldest first, and a new line goes at the end');

    /* the feed shows three lines: yours come first */
    const feed = inFeedOrder([
        { week: 4, year: 30, message: 'last week', type: 'positive' },
        { week: 5, year: 30, message: '📅 Rights Desk: 1 decision required.', type: 'neutral' },
        { week: 5, year: 30, message: 'Your studio paid its bills.', type: 'neutral' },
        { week: 5, year: 30, message: 'Netflix dated "A Film" for Week 14.', type: 'positive' },
        { week: 5, year: 30, message: '3% of your shares were sold.', type: 'negative' },
    ]).map(log => log.message);
    assert.deepEqual(feed, ['3% of your shares were sold.', 'Netflix dated "A Film" for Week 14.', 'Your studio paid its bills.', '📅 Rights Desk: 1 decision required.', 'last week'], feed.join(' | '));
    pass('the feed: newest week first, your own lines before the industry\'s');

    /* no writer puts its line in front, where the close throws it away */
    const frontWriters = ['services/worldReactions.ts', 'services/talentInstability.ts', 'services/rivalRetaliation.ts', 'services/acquisitionMarketPulse.ts', 'services/subsidiaryOperations.ts', 'services/subsidiaryDecisions.ts', 'services/studioSale.ts', 'services/studioAcquisition.ts']
        .filter(path => /\.\.\.\(player\.logs \|\| \[\]\)\]\.slice\(0/.test(readFileSync(path, 'utf8')));
    assert.deepEqual(frontWriters, []);
    pass('no week-time writer puts its line in front');

    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    const company: Player = { ...built, pendingEvents: [] };
    const now = getAbsoluteWeek(company.age, company.currentWeek);

    /* ---- a real week keeps the line: the log is full, and a line is added before the close */
    const full: Player = { ...company, logs: Array.from({ length: 50 }, (_, index) => ({ week: 1, year: company.age - 1, message: `old ${index}`, type: 'neutral' as const })) };
    const closed = (await processGameWeek(addActivityLog(full, 'a film opened this week', 'positive'))).player;
    assert.ok(closed.logs.some(log => log.message === 'a film opened this week'), 'the line survives the close');
    assert.equal(closed.logs.length, 50, 'and the log still keeps 50');
    assert.ok(closed.logs.slice(-1)[0].year >= company.age - 1);
    assert.ok(!closed.logs.some(log => log.message === 'old 0'), 'the oldest went');
    pass('a real week with a full log: this week\'s line stays, the oldest goes');

    /* ---- what only tells goes to the log */
    const withPlatform = (change: (platform: OwnedStreamingPlatformState) => OwnedStreamingPlatformState): Player => ({ ...company, pendingEvents: [], ownedStreamingPlatform: change(company.ownedStreamingPlatform) });
    const estate = { lastSold: { atAbsoluteWeek: now, percent: 3, amount: 9_000_000 }, nextDueAbsoluteWeek: now + 13, quarterly: 1_000_000 } as never;
    const sold = queueStreamingDecisionEvents(withPlatform(platform => ({ ...platform, governance: { ...platform.governance, estatePlan: estate } })), now);
    assert.deepEqual(decisions(sold), [], 'shares sold: nothing to decide, no popup');
    assert.ok(sold.logs.at(-1)?.message.startsWith('3% of your shares were sold.'), sold.logs.at(-1)?.message);
    const again = queueStreamingDecisionEvents(sold, now);
    assert.equal(again.logs.filter(log => log.message === sold.logs.at(-1)!.message).length, 1, 'once');
    pass('shares sold for the estate: a line in the log, no popup');

    const short = queueStreamingDecisionEvents({ ...withPlatform(platform => ({ ...platform, governance: { ...platform.governance, estatePlan: { nextDueAbsoluteWeek: now + 2, quarterly: 5_000_000 } as never } })), money: 1_000 }, now);
    assert.deepEqual(decisions(short), []);
    assert.ok(short.logs.at(-1)?.message.includes('is due in 2 weeks'), short.logs.at(-1)?.message);
    pass('an estate payment coming: a line in the log, no popup');

    /* ---- what needs an answer stays a popup */
    const stake = { status: 'OFFER', offerAtAbsoluteWeek: now, startedAtAbsoluteWeek: now - 2, price: 80_000_000, percent: 5, buyerName: 'A Buyer', standsUntilAbsoluteWeek: now + 4 } as never;
    const offered = queueStreamingDecisionEvents(withPlatform(platform => ({ ...platform, governance: { ...platform.governance, stakeSale: stake } })), now);
    assert.deepEqual(decisions(offered), ['STAKE_OFFER'], 'a buyer needs an answer');
    pass('a buyer\'s offer stays a popup');

    /* both at once: the told one does not use up a slot */
    const both = queueStreamingDecisionEvents(withPlatform(platform => ({ ...platform, governance: { ...platform.governance, estatePlan: estate, stakeSale: stake } })), now);
    assert.deepEqual(decisions(both), ['STAKE_OFFER']);
    assert.ok(both.logs.at(-1)?.message.startsWith('3% of your shares were sold.'));
    const fullWeek = queueStreamingDecisionEvents({ ...withPlatform(platform => ({ ...platform, governance: { ...platform.governance, estatePlan: estate, stakeSale: stake } })), pendingEvents: [
        { id: 'a', week: company.currentWeek, type: 'STREAMING_INCIDENT', title: 'a' }, { id: 'b', week: company.currentWeek, type: 'STREAMING_INCIDENT', title: 'b' },
    ] }, now);
    assert.deepEqual(decisions(fullWeek), [], 'two popups this week already');
    assert.ok(fullWeek.logs.at(-1)?.message.startsWith('3% of your shares were sold.'), 'and the line still goes in');
    pass('a line does not use up a popup slot, and a full week still logs');

    /* ---- #254: the feed is about the player; the other companies are in the News app */
    const weeks = (await processGameWeek(company)).player;
    assert.ok(!weeks.logs.some(log => isOldWorldLine(log.message) && log.week === weeks.currentWeek && log.year === weeks.age), 'nothing new about other companies goes in the log');
    assert.ok(isOldWorldLine('🏢 Hulu: Hulu commissioned Gentle Forest.') && isOldWorldLine('🌟 New talent has emerged in the industry.') && !isOldWorldLine('📅 Rights Desk: 1 decision required.'), 'an older save\'s lines are hidden');
    const home = readFileSync('views/HomePage.tsx', 'utf8');
    assert.ok(/if \(isOldWorldLine\(message\)\) return false;/.test(home), 'the feed hides them');
    const when = { week: 31, year: 15, absoluteWeek: 759 };
    const roundup = industryRoundupOf([
        'HBO moved 1 greenlit project into physical production.', 'Hulu moved 2 greenlit projects into physical production.',
        'MGM committed 1 project to development.', 'Pixar reviewed 1 active slate project.', 'Lionsgate\'s finances changed materially this week.',
        'Hulu: Hulu commissioned Gentle Forest.', 'Hulu: Golden World opened as a flop.', 'Night Rain was released.',
    ], [{ headline: 'Hulu commissioned Gentle Forest.' }, { headline: 'Golden World opened as a flop.' }], when);
    assert.equal(roundup?.headline, 'Two studios started production this week');
    assert.equal(roundup?.subtext, 'Into production: HBO and Hulu. In development: MGM. Night Rain was released.', roundup?.subtext);
    assert.equal(roundup?.category, 'INDUSTRY');
    assert.equal(industryRoundupOf(['Pixar reviewed 1 active slate project.'], [], when), null, 'a week with nothing to tell has no story');
    assert.equal(industryRoundupOf(['Warner Bros. moved 1 greenlit project into physical production.'], [], when)?.subtext, 'Into production: Warner Bros.');
    const ours = { name: 'Zee', businesses: [], ownedStreamingPlatform: { identity: { name: 'EMPIRE+' } } as never };
    assert.ok(isAboutThePlayer('Hulu lost a bid to EMPIRE+.', ours), 'a line naming the service stays in the feed');
    assert.ok(!isAboutThePlayer('Hulu commissioned Gentle Forest.', ours));
    const placed = withIndustryRoundup([{ id: 'a', week: 31, year: 15 }, { id: 'b', week: 30, year: 15 }] as never, roundup);
    assert.deepEqual(placed.map(item => item.id), ['a', 'production-weekly:759', 'b'], 'behind the week\'s own stories');
    const stories = weeks.news.filter(item => item.id.startsWith('production-weekly:')).map(item => item.id);
    assert.equal(new Set(stories).size, stories.length, 'one story a week');
    pass('the other companies left the feed, and are one story a week in the News app');
    console.log('activity-log audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
