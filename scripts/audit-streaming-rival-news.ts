/** Rivals in the news, #70 (codex-handoff/plans/platform-tech-plan.md §10, Phase 5: "techs unlocked or upgraded,
 *  by the player and by rivals (e.g. … "Rival X brings HDR Pro")", "quality comparisons ("their picture is
 *  better")"; §1: "news and Instagram gossip, such as "unka video quality better hai""). Checks:
 *  - the week a rival takes a step (#69) it is news, worded as the player's launches are; a smaller step
 *    only from the global rivals; nothing before the player's service starts the pace;
 *  - the step that takes a rival's picture past the player's best plan is compared, once;
 *  - the industry pass: "<rival> now streams sharper than <player>" leads its week in News, on X and on
 *    Instagram, in the media's words for it; the rival's launch publishes as its own story. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingRivalTechStepWeeks } from '../services/streamingRivalTech';
import { collectRivalTechFacts } from '../services/streamingRivalNews';
import { processIndustryWorldWeek } from '../services/industryWorld';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Rival News Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

async function main() {
    const started = performance.now();
    const qa = await buildStreamingFullPlatformQa(fresh('rival-news'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const own = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id).identity!;
    const apple = qa.world.platforms?.APPLE_TV?.name || 'Apple TV+';
    const youtube = qa.world.platforms?.YOUTUBE?.name || 'YouTube';
    const withPace = (from: number | undefined): Player => ({ ...qa, ownedStreamingPlatform: { ...qa.ownedStreamingPlatform, rivalTechFromWeek: from } as Player['ownedStreamingPlatform'] });
    const step = streamingRivalTechStepWeeks(98);
    assert.equal(step, 37);

    /* ── a rival's step is news ── */
    assert.deepEqual(collectRivalTechFacts(withPace(undefined), qa.world, week - 1, week), [], 'No pace week: no rival news');
    const first = collectRivalTechFacts(withPace(week - step), qa.world, week - 1, week);
    const lines = first.map(fact => [fact.importance, fact.headline]);
    assert.ok(lines.some(([importance, headline]) => importance === 'HIGH' && headline === `${apple} rolls out HDR Pro`), 'Apple TV+\'s first step');
    assert.ok(lines.some(([importance, headline]) => importance === 'MEDIUM' && headline === `${youtube} rolls out Contextual targeting`), 'YouTube\'s, a smaller one from a global rival');
    assert.ok(first.every(fact => fact.type === 'PLATFORM_TECH_LAUNCHED' && fact.absoluteWeek === week), 'Stamped this week');
    assert.equal(collectRivalTechFacts(withPace(week - step), qa.world, week, week).length, 0, 'Nothing twice in a week');
    const regionalSmall = collectRivalTechFacts(withPace(week - 52 * 6), qa.world, week - 52 * 6, week)
        .filter(fact => fact.importance === 'MEDIUM' && !['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE', 'PRIME_VIDEO'].includes(String(fact.companyId)));
    assert.deepEqual(regionalSmall, [], 'Regional rivals make the news only with a big step');
    console.log(`PASS launch: the week their first step falls due: ${lines.map(([importance, headline]) => `"${headline}" ${importance}`).join(', ')}; regional services only with big steps; none without the pace`);

    /* ── "their picture is better" ── */
    const eightK = collectRivalTechFacts(withPace(week - step * 4), qa.world, week - 1, week);
    const launch8k = eightK.find(fact => fact.headline === `${apple} launches 8K`);
    const gap = eightK.find(fact => fact.type === 'PLATFORM_QUALITY_GAP');
    assert.ok(launch8k && launch8k.importance === 'HIGH', 'Apple TV+ launches 8K on its fourth step');
    assert.ok(gap, 'and goes past the test company\'s best plan (4K)');
    /* 2026-11-09: the gap is written several ways; whichever it is names both services and both pictures */
    assert.equal(gap!.importance, 'HIGH');
    assert.equal(gap!.companyId, own.slug);
    assert.ok(gap!.headline.includes(apple) && gap!.headline.includes(own.name), gap!.headline);
    assert.ok(gap!.detail.includes(apple) && gap!.detail.includes('8K') && gap!.detail.includes('4K'), gap!.detail);
    assert.equal(collectRivalTechFacts(withPace(week - step * 5), qa.world, week - 1, week).filter(fact => fact.type === 'PLATFORM_QUALITY_GAP').length, 0,
        'Its next step is no new comparison');
    console.log(`PASS gap: "${gap!.headline}" — ${gap!.detail}`);

    /* ── the industry pass ── */
    const player = withPace(week + 1 - step * 4);
    const pass = processIndustryWorldWeek(player, player.world, week + 1);
    const ledger = pass.world.industryEvents!;
    const gapFact = ledger.events.find(fact => fact.type === 'PLATFORM_QUALITY_GAP' && fact.absoluteWeek === week + 1);
    const launchFact = ledger.events.find(fact => fact.headline === `${apple} launches 8K` && fact.absoluteWeek === week + 1);
    assert.ok(gapFact && launchFact, 'Both are facts');
    const news = pass.player.news.find(item => item.id === `news_${gapFact!.id}`);
    assert.ok(news, 'The comparison is in the News app');
    assert.ok(pass.player.x.feed.some(item => item.id === `x_${gapFact!.id}`), 'on X');
    assert.ok(pass.player.instagram.feed.some(item => item.id === `instagram_${gapFact!.id}`), 'and on Instagram');
    /* the launch is its own story, and takes the week's other slot unless two industry stories outrank it */
    assert.ok(ledger.publishedEventKeys.includes(`evaluated:${launchFact!.id}`), 'Apple TV+\'s launch is weighed as its own story');
    const launchPublished = pass.player.news.some(item => item.id === `news_${launchFact!.id}`);
    const otherSlot = ledger.events.filter(fact => fact.absoluteWeek === week + 1 && fact.id !== gapFact!.id
        && ledger.publishedEventKeys.includes(`news:${fact.id}`)).map(fact => `${fact.type} "${fact.headline}"`);
    const said = news!.subtext || '';
    const voiced = [
        'Subscribers are paying for a picture a rival now beats.',
        'Picture is not everything; the shows still decide where people watch.',
        'Viewers who care about picture now have a reason to look elsewhere.',
        'Viewers who chase picture weigh the best on offer; the gap will show in who signs up.',
    ];
    assert.ok(voiced.some(line => said.endsWith(line)) || said === gapFact!.detail, 'The media compare the pictures');
    console.log(`PASS week: "${news!.headline}" — News (${news!.sourceName}${news!.byline ? `, ${news!.byline}` : ''}), X and Instagram; "${launchFact!.headline}" weighed as its own story: ${launchPublished ? 'published' : `the week's other slot went to ${otherSlot.join(', ') || 'nothing in the news'}`}`);
    console.log(`  News: "${said}"`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
