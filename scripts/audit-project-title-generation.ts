import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { generateProjectTitle, generateAuditions } from '../services/roleLogic';
import { FAMOUS_MOVIE_DB, getNextFamousMovie, generateFamousMovieOpportunity } from '../services/famousMovieLogic';
import { NPC_DATABASE } from '../services/npcLogic';
import { createDeterministicRng } from '../services/deterministicRandom';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { buildPlatformContentCandidates, commitPlatformContentCandidate } from '../services/platformAi/platformAiContentSourcing';
import { commissionPlatformAiOriginal } from '../services/platformAi/platformAiCommissioning';

const fixture = () => {
    const p = structuredClone(INITIAL_PLAYER);
    p.id = 'project-title-audit'; p.age = 40; p.currentWeek = 12;
    return p;
};
let passed = 0, failed = 0;
const originalRandom = Math.random;
const originalNow = Date.now;
let clock = 1_800_000_000_000;
Date.now = () => clock++;
function check(name: string, run: () => void) {
    try { run(); passed++; console.log('PASS', name); }
    catch (error) { failed++; console.error('FAIL', name, String(error)); }
    finally { Math.random = originalRandom; }
}

check('bounded retries still return a new title when the random source repeats', () => {
    const first = generateProjectTitle([], () => 0);
    let calls = 0;
    const next = generateProjectTitle([first], () => { calls++; return 0; });
    assert.notEqual(next, first);
    assert.ok(calls < 100, 'fallback must not require an unbounded random retry');
});
check('case and whitespace variants reserve the same generated name', () => {
    const first = generateProjectTitle([], () => 0);
    const next = generateProjectTitle([`  ${first.toLowerCase().replaceAll(' ', '   ')}  `], () => 0);
    assert.notEqual(next.toLowerCase().replace(/\s+/g, ' ').trim(), first.toLowerCase());
});
check('one casting batch reserves each name before generating the next offer', () => {
    Math.random = () => 0.5;
    const opportunities = generateAuditions(fixture(), []);
    assert.ok(opportunities.length >= 3);
    assert.equal(new Set(opportunities.map(o => o.project.title)).size, opportunities.length);
    assert.ok(opportunities.every(o => o.projectName === o.project.title));
});
check('director referrals display their actual distinct project titles', () => {
    Math.random = createDeterministicRng('title-director-label');
    const p = fixture(), director = NPC_DATABASE.find(n => n.occupation === 'DIRECTOR')!;
    p.relationships = [{ id: 'director', name: director.name, npcId: director.id, relation: 'Director', closeness: 90, image: director.avatar, lastInteractionWeek: 12 }];
    let referrals = 0;
    for (let i = 0; i < 20; i++) for (const o of generateAuditions(p, [])) {
        if (o.source === 'DIRECT') { referrals++; assert.equal(o.projectName, o.project.title); }
    }
    assert.ok(referrals > 0);
});
check('a fully released famous-film pool does not silently recycle original films', () => {
    const p = fixture(); p.world.famousMoviesReleased = FAMOUS_MOVIE_DB.map(m => m.title);
    assert.equal(getNextFamousMovie(p), null);
});
check('a pending famous-film offer reserves that film without scanning the career archive', () => {
    const p = fixture(); p.world.famousMoviesReleased = FAMOUS_MOVIE_DB.slice(1).map(m => m.title);
    const first = generateFamousMovieOpportunity(p)!;
    assert.ok(first);
    p.inbox = [{ id: 'pending', type: 'OFFER_ROLE', data: first } as any];
    Object.defineProperty(p, 'pastProjects', { get() { throw Error('Do not scan the full career archive during title generation'); } });
    assert.equal(generateFamousMovieOpportunity(p), null);
});
check('five seeded casting cohorts have no duplicates within an individual batch', () => {
    for (let seed = 0; seed < 5; seed++) {
        Math.random = createDeterministicRng(`title-audit:${seed}`);
        const p = fixture();
        for (let i = 0; i < 80; i++) {
            const opportunities = generateAuditions(p, []);
            assert.equal(new Set(opportunities.map(o => o.project.title.toLowerCase())).size, opportunities.length, `seed ${seed} batch ${i}`);
        }
    }
});
check('different streaming movie commissions receive proper unique titles and retain canonical identity', () => {
    const p = fixture();
    let world = normalizeWorldPlatformAi(p, structuredClone(p.world), 2092);
    const productions: { id: string; title: string; canonicalProjectId: string }[] = [];
    for (const cycle of [1, 11]) {
        world = { ...world, platforms: { ...world.platforms, NETFLIX: { ...world.platforms!.NETFLIX, ai: { ...world.platforms!.NETFLIX.ai!, strategyCycle: cycle } } } };
        const input = { player: p, world, platformId: 'NETFLIX' as const, absoluteWeek: 2092 + cycle };
        const a = buildPlatformContentCandidates(input).find(c => c.source === 'COMMISSIONED_ORIGINAL')!;
        const again = buildPlatformContentCandidates(input).find(c => c.source === 'COMMISSIONED_ORIGINAL')!;
        assert.deepEqual(a, again, 'repeated previews must not reserve another name or change the quote');
        const result = commitPlatformContentCandidate({ ...input, candidate: a });
        assert.ok(result.changed, result.reason); world = result.world;
        const commissioned = commissionPlatformAiOriginal({ player: p, world, platformId: 'NETFLIX', planId: result.plan!.id, absoluteWeek: input.absoluteWeek + 1 });
        assert.ok(commissioned.production, commissioned.reason); world = commissioned.world;
        const production = commissioned.production!;
        assert.equal(production.title, result.plan!.title);
        assert.ok(!/Netflix .* Original$/.test(production.title), 'brief labels must not become movie names');
        productions.push(production);
        const repeated = commitPlatformContentCandidate({ ...input, world, candidate: a });
        assert.equal(repeated.changed, false); assert.equal(repeated.plan!.id, result.plan!.id);
        assert.equal(repeated.plan!.title, result.plan!.title);
    }
    assert.notEqual(productions[0].title, productions[1].title);
    assert.notEqual(productions[0].canonicalProjectId, productions[1].canonicalProjectId);
    assert.equal(world.industryProductions![productions[0].id].title, productions[0].title);
});

Math.random = originalRandom; Date.now = originalNow;
console.log(`Project title generation audit: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
