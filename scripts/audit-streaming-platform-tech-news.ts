/** The player's tech launches become stories, #66 (codex-handoff/plans/platform-tech-plan.md §10, Phase 5:
 *  "techs unlocked or upgraded, by the player and by rivals (e.g. "NORTHSTAR+ launches 8K")"; "the
 *  player's own events are appended after the platform week (they publish the following week)"). Checks:
 *  - what is news: a picture, HDR or futuristic step is big news, any other step a smaller story, and a
 *    picture or HDR step's third version a smaller one; starters, other versions, given steps, entries
 *    outside the window and a service not yet live make none;
 *  - one real week on the test company: 8K unlocked → the next week "<name> launches 8K" in News (a top
 *    story), on X and on Instagram, voiced by the media, stamped with the week it publishes;
 *  - a smaller step → an X post only; nothing publishes twice. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingLedgerEntry, type Player, type StreamingTechId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { STREAMING_TECH_DEFINITIONS, getStreamingTechMissingRequirements, resolveStreamingTechTree, streamingTechVersion } from '../services/streamingTechTreeCatalogue';
import { unlockStreamingTech } from '../services/streamingTechTree';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Tech News Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const entry = (key: string, absoluteWeek: number, metadata: OwnedStreamingLedgerEntry['metadata'], source: OwnedStreamingLedgerEntry['source'] = 'PLAYER_ACTION'): OwnedStreamingLedgerEntry => ({
    id: `entry-${key}-${absoluteWeek}`, idempotencyKey: key, absoluteWeek, type: 'TECHNOLOGY_PROJECT_STARTED', summary: key, source, metadata,
});

async function main() {
    const started = performance.now();
    const qa = await buildStreamingFullPlatformQa(fresh('platform-tech-news'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const platform = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const name = platform.identity!.name;
    const slug = platform.identity!.slug;
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    /* the ledger alone: the test company's incidents (more of them since #73) are #67's news, not this check's */
    const quiet = { ...platform.crisisSecurity, crises: [],
        infrastructureOperations: { ...platform.crisisSecurity.infrastructureOperations, incidents: [] } };
    const withLedger = (ledger: OwnedStreamingLedgerEntry[], extra: Record<string, unknown> = {}): Player => ({
        ...qa, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, crisisSecurity: quiet, eventLedger: ledger, ...extra } as typeof platform),
    });

    /* ── what is news ── */
    const ledger = [
        entry('streaming-tech-unlock:picture_8k', week, { kind: 'TECH_UNLOCKED', techId: 'PICTURE_8K' }),
        entry('streaming-tech-unlock:play_skip_intro', week, { kind: 'TECH_UNLOCKED', techId: 'PLAY_SKIP_INTRO' }),
        entry('streaming-tech-version:picture_4k:3', week, { kind: 'TECH_VERSION_REACHED', techId: 'PICTURE_4K', version: 3 }),
        entry('streaming-tech-version:picture_4k:2', week, { kind: 'TECH_VERSION_REACHED', techId: 'PICTURE_4K', version: 2 }),
        entry('streaming-tech-version:sound_51:3', week, { kind: 'TECH_VERSION_REACHED', techId: 'SOUND_51', version: 3 }),
        entry('streaming-tech-unlock:picture_480p', week, { kind: 'TECH_UNLOCKED', techId: 'PICTURE_480P' }),
        entry('streaming-tech-unlock:hdr_pro', week, { kind: 'TECH_UNLOCKED', techId: 'HDR_PRO' }, 'MIGRATION'),
        entry('streaming-tech-unlock:picture_12k', week - 5, { kind: 'TECH_UNLOCKED', techId: 'PICTURE_12K' }),
        entry('streaming-tech-unlock:picture_16k', week + 1, { kind: 'TECH_UNLOCKED', techId: 'PICTURE_16K' }),
    ];
    const facts = collectOwnedStreamingPlatformFacts(withLedger(ledger), week, week + 1);
    assert.deepEqual(facts.map(fact => [fact.type, fact.importance, fact.headline, fact.absoluteWeek, fact.companyId]), [
        ['PLATFORM_TECH_LAUNCHED', 'HIGH', `${name} launches 8K`, week + 1, slug],
        ['PLATFORM_TECH_LAUNCHED', 'MEDIUM', `${name} rolls out Skip intro and recap`, week + 1, slug],
        ['PLATFORM_TECH_LAUNCHED', 'MEDIUM', `${name}'s 4K reaches reference quality`, week + 1, slug],
    ], 'A new picture is big news, a side line and a picture\'s third version smaller ones; a second version, a sound version, a starter, a given step and entries outside the week make none');
    assert.equal(facts[0].detail, 'Detail beyond most screens today. Plans that include it stream in 8K from this week.');
    const futuristic = collectOwnedStreamingPlatformFacts(withLedger([entry('streaming-tech-unlock:ai_taste', week, { kind: 'TECH_UNLOCKED', techId: 'AI_TASTE' })]), week, week + 1);
    assert.deepEqual(futuristic.map(fact => [fact.importance, fact.headline]), [['HIGH', `${name} rolls out Taste engine`]], 'A futuristic step is big news');
    assert.deepEqual(collectOwnedStreamingPlatformFacts(withLedger(ledger, { launchCommit: null }), week, week + 1), [], 'A service not yet live makes no news');
    assert.deepEqual(collectOwnedStreamingPlatformFacts(withLedger(ledger), week - 40, week + 1).map(fact => fact.headline).includes(`${name} launches 12K`), false,
        'The first pass after an update looks back two weeks at most');
    console.log(`PASS rule: "${facts[0].headline}" HIGH, "${facts[1].headline}" and "${facts[2].headline}" MEDIUM; a futuristic step HIGH; second versions, starters, given steps, old entries and a service not yet live make none`);

    /* ── one real week: 8K ── */
    const tree = resolveStreamingTechTree(platform);
    assert.ok(streamingTechVersion(tree, 'PICTURE_4K') >= 1 && streamingTechVersion(tree, 'PICTURE_8K') === 0, 'The test company has 4K and not 8K');
    const unlocked = unlockStreamingTech(qa, 'PICTURE_8K');
    assert.ok(unlocked.changed, '8K unlocks');
    const next = (await processGameWeek(unlocked.player)).player;
    const entered = getAbsoluteWeek(next.age, next.currentWeek);
    const fact = next.world.industryEvents!.events.find(item => item.idempotencyKey === `owned-platform:${slug}:streaming-tech-unlock:picture_8k`);
    assert.ok(fact, 'The launch is a fact');
    assert.deepEqual([fact!.type, fact!.importance, fact!.absoluteWeek], ['PLATFORM_TECH_LAUNCHED', 'HIGH', entered], 'Stamped with the week it publishes');
    const news = next.news.find(item => item.id === `news_${fact!.id}`);
    assert.ok(news, 'In the News app');
    assert.deepEqual([news!.headline, news!.category], [`${name} launches 8K`, 'TOP_STORY']);
    assert.ok(news!.sourceName, 'Voiced by an outlet');
    const xPost = next.x.feed.find(item => item.id === `x_${fact!.id}`);
    assert.ok(xPost && xPost.content.startsWith(`${name} launches 8K`), 'On X');
    const instagram = next.instagram.feed.find(item => item.id === `instagram_${fact!.id}`);
    assert.ok(instagram, 'On Instagram');
    console.log(`PASS week: "${news!.headline}" — News (top story, ${news!.sourceName}${news!.byline ? `, ${news!.byline}` : ''}), X (${xPost!.authorName}) and Instagram, the week after the unlock`);
    console.log(`  News: "${news!.subtext}"`);
    console.log(`  X: "${xPost!.content}"`);
    console.log(`  Instagram: "${instagram!.caption}"`);

    /* ── a smaller step: X only; nothing twice ── */
    const nextTree = resolveStreamingTechTree(normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, next.id));
    const side = STREAMING_TECH_DEFINITIONS.find(item => item.sideLine && !item.futuristic && item.group !== 'PICTURE' && item.group !== 'HDR'
        && streamingTechVersion(nextTree, item.id) === 0 && !getStreamingTechMissingRequirements(nextTree, item).length);
    assert.ok(side, 'A side line the test company can unlock');
    const sideUnlocked = unlockStreamingTech(next, side!.id as StreamingTechId);
    assert.ok(sideUnlocked.changed);
    const after = (await processGameWeek(sideUnlocked.player)).player;
    const sideFact = after.world.industryEvents!.events.find(item => item.idempotencyKey === `owned-platform:${slug}:streaming-tech-unlock:${side!.id.toLowerCase()}`);
    assert.ok(sideFact && sideFact.importance === 'MEDIUM', 'A smaller story');
    assert.ok(after.x.feed.some(item => item.id === `x_${sideFact!.id}`), 'On X');
    assert.ok(!after.news.some(item => item.id === `news_${sideFact!.id}`), 'Not in the News app');
    assert.equal(after.world.industryEvents!.events.filter(item => item.idempotencyKey === fact!.idempotencyKey).length, 1, '8K is one fact');
    assert.equal(after.news.filter(item => item.headline === `${name} launches 8K`).length, 1, 'and one story');
    console.log(`PASS smaller: "${sideFact!.headline}" on X only; 8K stays one fact and one story`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
