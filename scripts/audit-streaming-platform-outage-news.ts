/** Outages become stories, #67 (codex-handoff/plans/platform-tech-plan.md §10, Phase 5: "outages
 *  ("NORTHSTAR+ down for hours")"; done when "tech launches, outages and price changes create stories").
 *  Checks:
 *  - what is news: what viewers notice going wrong (the service down, a breach, slow streams, an app
 *    crashing, a feature broken, a server incident in a region) and its fix; a pirated title, a
 *    backlash, a rights problem or an allegation is not; nothing outside the window;
 *  - the next week's industry pass on the test company: "<name> down for hours" as a top story and on
 *    X, in the media's own words for an outage; a tech launch the same week publishes too (separate
 *    stories); the fix closes the story. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingInfrastructureIncident, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';
import { processIndustryWorldWeek } from '../services/industryWorld';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Outage News Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const crisis = (type: OwnedStreamingCrisis['type'], detected: number, extra: Partial<OwnedStreamingCrisis> = {}): OwnedStreamingCrisis => ({
    id: `c-${type}-${detected}`, idempotencyKey: `c-${type}-${detected}`, type, severity: 'SERIOUS', stage: 'DETECTED', title: type, detail: '', cause: '',
    detectedAtAbsoluteWeek: detected, affectedSubscribers: 1_234_567, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null,
    communication: null, responseCost: 0, weeklyRecoveryCost: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, outcomeNote: null, ...extra,
});
const server = (type: OwnedStreamingInfrastructureIncident['type'], detected: number, severity: OwnedStreamingInfrastructureIncident['severity']): OwnedStreamingInfrastructureIncident => ({
    id: `s-${type}`, idempotencyKey: `s-${type}`, type, severity, stage: 'DETECTED', title: type, detail: '', cause: '', facilityId: 'f', cityId: 'ASH',
    detectedAtAbsoluteWeek: detected, affectedSubscribers: 84_400, capacityLossPercent: 20, conditionLossPercent: 10, responseAction: null, rerouteFacilityId: null,
    compensation: null, insuranceClaimed: false, responseCost: 0, insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null,
    assistedHandled: false, publicReaction: '', subscriberReaction: '', outcomeNote: null,
});

async function main() {
    const started = performance.now();
    const qa = await buildStreamingFullPlatformQa(fresh('platform-outage-news'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const platform = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const name = platform.identity!.name;
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const withIncidents = (crises: OwnedStreamingCrisis[], incidents: OwnedStreamingInfrastructureIncident[] = [], ledger = platform.eventLedger): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform, eventLedger: ledger,
            crisisSecurity: { ...platform.crisisSecurity, crises, infrastructureOperations: { ...platform.crisisSecurity.infrastructureOperations, incidents } },
        }),
    });

    /* ── what is news ── */
    const facts = collectOwnedStreamingPlatformFacts(withIncidents([
        crisis('PLATFORM_OUTAGE', week),
        crisis('ACCOUNT_BREACH', week, { affectedSubscribers: 84_400 }),
        crisis('SLOW_STREAMING', week, { affectedSubscribers: 999_600 }),
        crisis('APP_CRASH', week, { techId: 'APPS_TV' }),
        crisis('FEATURE_BROKEN', week, { techId: 'PLAY_DOWNLOADS', affectedSubscribers: 420 }),
        crisis('CONTENT_LEAK', week), crisis('RECOMMENDATION_BACKLASH', week), crisis('RIGHTS_COMPLIANCE', week), crisis('EMPLOYEE_ALLEGATION', week),
        crisis('PLATFORM_OUTAGE', week - 3, { id: 'fixed', idempotencyKey: 'fixed', stage: 'RESOLVED', resolvedAtAbsoluteWeek: week }),
        crisis('PLATFORM_OUTAGE', week - 6, { id: 'old', idempotencyKey: 'old' }),
    ], [server('POWER_FAILURE', week, 'MAJOR'), server('TRAFFIC_SPIKE', week, 'MINOR')]), week, week + 1);
    const rows = facts.map(fact => [fact.type, fact.importance, fact.headline, fact.detail]);
    assert.deepEqual(rows, [
        ['PLATFORM_OUTAGE', 'HIGH', `${name} down for hours`, 'Titles would not start, or stopped part way, for about 1.2 million subscribers.'],
        ['PLATFORM_OUTAGE', 'HIGH', `${name} resets passwords after a breach`, 'Some accounts were exposed, and about 84,000 subscribers are asked to sign in again.'],
        ['PLATFORM_OUTAGE', 'MEDIUM', `${name} buffers at busy times`, 'Titles were slow to start for about 1 million subscribers.'],
        ['PLATFORM_OUTAGE', 'MEDIUM', `${name}'s Smart TV app keeps crashing`, 'Viewers on Smart TV screens say the app closes mid-title. Other screens work as usual.'],
        ['PLATFORM_OUTAGE', 'MEDIUM', `${name}'s Downloads feature breaks`, 'The Downloads feature stopped working for 420 subscribers. Streaming works as usual.'],
        ['PLATFORM_RESTORED', 'MEDIUM', `${name} is back to normal`, 'The outage is fixed after 3 weeks.'],
        ['PLATFORM_OUTAGE', 'HIGH', `A power failure knocks ${name} offline in North America`, 'Titles were slow to start or would not start for about 84,000 subscribers in North America.'],
        ['PLATFORM_OUTAGE', 'MEDIUM', `${name} strains under demand in North America`, 'Titles were slow to start or would not start for about 84,000 subscribers in North America.'],
    ], 'What viewers notice, and its fix; leaks, backlash, rights, allegations and old outages make none');
    console.log(`PASS rule: ${rows.length} stories — "${rows[0][2]}" and "${rows[1][2]}" HIGH, a major server incident HIGH ("${rows[6][2]}"), slow streams, an app, a feature and a minor incident MEDIUM, "${rows[5][2]}" (${rows[5][3]}); a leak, a backlash, a rights problem, an allegation and a six-week-old outage none`);

    /* ── the next week's industry pass ── */
    const ledgerWithLaunch = [...platform.eventLedger, {
        id: 'launch-8k', idempotencyKey: 'streaming-tech-unlock:picture_8k', absoluteWeek: week, type: 'TECHNOLOGY_PROJECT_STARTED' as const,
        summary: '8K unlocked', source: 'PLAYER_ACTION' as const, metadata: { kind: 'TECH_UNLOCKED', techId: 'PICTURE_8K' },
    }];
    const down = withIncidents([crisis('PLATFORM_OUTAGE', week)], [], ledgerWithLaunch);
    const pass = processIndustryWorldWeek(down, down.world, week + 1);
    assert.ok(pass.processed, 'The pass runs');
    const ledger = pass.world.industryEvents!;
    /* this pass's facts (the test company's own build already had an outage or two in the news) */
    const outage = ledger.events.find(item => item.type === 'PLATFORM_OUTAGE' && item.absoluteWeek === week + 1);
    const launch = ledger.events.find(item => item.type === 'PLATFORM_TECH_LAUNCHED' && item.absoluteWeek === week + 1);
    const earlier = ledger.events.filter(item => item.type.startsWith('PLATFORM_') && item.absoluteWeek <= week).map(item => item.headline);
    assert.ok(outage && launch, 'Both are facts');
    const news = pass.player.news.find(item => item.id === `news_${outage!.id}`);
    assert.ok(news, 'The outage is in the News app');
    assert.equal(news!.category, 'TOP_STORY');
    assert.ok(pass.player.x.feed.some(item => item.id === `x_${outage!.id}`), 'and on X');
    assert.ok(pass.player.news.some(item => item.id === `news_${launch!.id}`), 'The launch the same week publishes too: separate stories');
    const said = news!.subtext || '';
    const lines = [
        'Subscribers pay for a service that works, and this week it did not.',
        'Every service has a bad night; what matters is how fast this one is fixed.',
        'The real test is how quickly the service is working again.',
        'The number to watch is how many subscribers cancel over it in the weeks ahead.',
    ];
    assert.ok(said.startsWith('Titles would not start') && (lines.some(line => said.endsWith(line)) || said === outage!.detail),
        'The media speak about an outage as an outage');
    assert.ok(!/expensive, risky|finished work|finished result/.test(said), 'not as a launch');
    const media = pass.world.industryMedia!;
    const story = media.stories.find(item => item.id === media.eventStoryIndex[outage!.id]);
    assert.ok(story && story.stage === 'DEVELOPING', 'An outage story stays open');
    console.log(`PASS week: "${news!.headline}" — News top story (${news!.sourceName}${news!.byline ? `, ${news!.byline}` : ''}) and X; "${launch!.headline}" published the same week as its own story`);
    console.log(`  News: "${said}"`);
    console.log(`  The test company's own build had already made: ${earlier.length ? earlier.map(line => `"${line}"`).join(', ') : 'none'}`);

    /* ── the fix closes it ── */
    const fixed = withIncidents([crisis('PLATFORM_OUTAGE', week, { stage: 'RESOLVED', resolvedAtAbsoluteWeek: week + 1 })]);
    const nextPass = processIndustryWorldWeek({ ...fixed, world: pass.world, news: pass.player.news, x: pass.player.x, instagram: pass.player.instagram }, pass.world, week + 2);
    const restored = nextPass.world.industryEvents!.events.find(item => item.type === 'PLATFORM_RESTORED' && item.absoluteWeek === week + 2);
    assert.ok(restored, 'The fix is a fact');
    assert.equal(restored!.detail, 'The outage is fixed after a week.');
    const closed = nextPass.world.industryMedia!.stories.find(item => item.id === story!.id);
    assert.equal(closed?.stage, 'RESOLVED', 'and closes the outage story');
    assert.ok(nextPass.player.x.feed.some(item => item.id === `x_${restored!.id}`), 'On X');
    assert.equal(nextPass.world.industryEvents!.events.filter(item => item.idempotencyKey === outage!.idempotencyKey).length, 1, 'The outage stays one fact');
    console.log(`PASS fix: "${restored!.headline}" (${restored!.detail}) on X; the outage story is resolved; nothing publishes twice`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
