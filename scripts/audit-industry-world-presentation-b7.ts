// @ts-nocheck - executable deterministic presentation fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    appendIndustryEventFacts,
    collectIndustryEventFacts,
    createIndustryEventFact,
    projectIndustryEvents,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.age = 34;
player.currentWeek = 25;
player.news = [];
player.x.feed = [];
player.instagram.feed = [];

const release = createIndustryEventFact({
    idempotencyKey: 'release:project_midnight_signal',
    absoluteWeek: 1_792,
    type: 'PROJECT_RELEASED',
    importance: 'HIGH',
    companyId: 'WARNER_BROS',
    companyName: 'Warner Bros.',
    projectId: 'project_midnight_signal',
    productionId: 'production_midnight_signal',
    headline: 'Midnight Signal reaches theatres',
    detail: 'Warner Bros. opened the saved theatrical release this week.',
    evidence: [
        { kind: 'PROJECT', id: 'project_midnight_signal' },
        { kind: 'PRODUCTION', id: 'production_midnight_signal' },
    ],
});
const low = createIndustryEventFact({
    idempotencyKey: 'greenlight:project_quiet_room',
    absoluteWeek: 1_792,
    type: 'PROJECT_GREENLIT',
    importance: 'LOW',
    companyId: 'PARAMOUNT',
    companyName: 'Paramount',
    projectId: 'project_quiet_room',
    headline: 'Paramount quietly advances a project',
    detail: 'The project entered development without material public attention.',
    evidence: [{ kind: 'PROJECT', id: 'project_quiet_room' }],
});
const ledger = appendIndustryEventFacts(undefined, [release, low]);

const first = projectIndustryEvents(player, ledger, 1_792);
assert.equal(first.news.filter(item => item.industryEventId === release.id).length, 1);
assert.equal(first.xPosts.filter(post => post.industryEventId === release.id).length, 1);
assert.equal(first.instaPosts.filter(post => post.industryEventId === release.id).length, 0);
assert.equal(first.news.some(item => item.industryEventId === low.id), false, 'low facts should update evidence without feed spam');
assert.equal(first.xPosts.some(item => item.industryEventId === low.id), false);
assert.equal(first.player.news[0].projectId, 'project_midnight_signal');
assert.equal(first.player.x.feed[0].companyId, 'WARNER_BROS');

const replay = projectIndustryEvents(first.player, first.ledger, 1_792);
assert.equal(replay.news.length, 0);
assert.equal(replay.xPosts.length, 0);
assert.equal(replay.instaPosts.length, 0);
assert.deepEqual(replay.player, first.player, 'same-week projection replay must be an exact no-op');

const award = createIndustryEventFact({
    idempotencyKey: 'award:project_midnight_signal:oscar_picture',
    absoluteWeek: 1_793,
    type: 'AWARD_WON',
    importance: 'HIGH',
    companyId: 'WARNER_BROS',
    companyName: 'Warner Bros.',
    projectId: 'project_midnight_signal',
    awardEventId: 'oscar_picture',
    headline: 'Midnight Signal wins Best Picture',
    detail: 'The canonical awards record names Midnight Signal as the winner.',
    evidence: [{ kind: 'AWARD', id: 'oscar_picture' }],
});
const withAward = appendIndustryEventFacts(first.ledger, [award]);
const second = projectIndustryEvents(first.player, withAward, 1_793);
assert.equal(second.instaPosts.filter(post => post.industryEventId === award.id).length, 1);
assert.equal(new Set(second.player.news.map(item => item.industryEventId).filter(Boolean)).size,
    second.player.news.filter(item => item.industryEventId).length);

const crowdedWeek = appendIndustryEventFacts(second.ledger, [
    createIndustryEventFact({
        idempotencyKey: 'crowded:hit:a', absoluteWeek: 1_794, type: 'PROJECT_HIT', importance: 'HIGH',
        projectId: 'project_a', headline: 'Project A breaks out', detail: 'A became a material hit.', evidence: [{ kind: 'PROJECT', id: 'project_a' }],
    }),
    createIndustryEventFact({
        idempotencyKey: 'crowded:flop:b', absoluteWeek: 1_794, type: 'PROJECT_FLOP', importance: 'HIGH',
        projectId: 'project_b', headline: 'Project B falls short', detail: 'B became a material flop.', evidence: [{ kind: 'PROJECT', id: 'project_b' }],
    }),
    createIndustryEventFact({
        idempotencyKey: 'crowded:release:c', absoluteWeek: 1_794, type: 'PROJECT_RELEASED', importance: 'HIGH',
        projectId: 'project_c', headline: 'Project C opens', detail: 'C reached audiences.', evidence: [{ kind: 'PROJECT', id: 'project_c' }],
    }),
]);
const crowdedProjection = projectIndustryEvents(second.player, crowdedWeek, 1_794);
assert.equal(
    new Set([
        ...crowdedProjection.news.map(item => item.industryEventId),
        ...crowdedProjection.xPosts.map(item => item.industryEventId),
        ...crowdedProjection.instaPosts.map(item => item.industryEventId),
    ].filter(Boolean)).size,
    2,
    'A busy AI industry week must surface only the two strongest stories instead of flooding every public feed.',
);
const crowdedReplay = projectIndustryEvents(crowdedProjection.player, crowdedProjection.ledger, 1_794);
assert.equal(crowdedReplay.news.length + crowdedReplay.xPosts.length + crowdedReplay.instaPosts.length, 0,
    'stories below the weekly editorial cut must be evaluated once, not leak out as a later backlog');

const beforeWorld = {
    projects: [],
    awardHistory: [],
    platforms: {
        NETFLIX: {
            id: 'NETFLIX',
            name: 'Netflix',
            ai: { decisionHistory: [] },
        },
    },
    studios: {
        PARAMOUNT: {
            id: 'PARAMOUNT',
            name: 'Paramount',
            ai: { events: [] },
        },
    },
    industryProductions: {},
    streamingPlatformEcosystem: { eventHistory: [] },
};
const afterWorld = structuredClone(beforeWorld);
afterWorld.platforms.NETFLIX.ai.decisionHistory.push({
    id: 'platform_decision_hit',
    absoluteWeek: 1_794,
    type: 'RELEASE_HIT',
    summary: 'Netflix lands a breakout release',
    reason: 'Audience results exceeded the saved forecast.',
    cashImpactMillions: 85,
});
afterWorld.studios.PARAMOUNT.ai.events.push({
    id: 'studio_status_change',
    absoluteWeek: 1_794,
    type: 'STATUS_CHANGED',
    summary: 'Paramount entered restructuring after sustained losses.',
});
afterWorld.streamingPlatformEcosystem.eventHistory.push({
    id: 'ecosystem_launch',
    absoluteWeek: 1_794,
    operatorId: 'LOTUS_PLAY',
    type: 'LAUNCH',
    headline: 'Lotus Play enters the streaming race.',
    detail: 'A broadcaster-backed regional challenger launched in India.',
    countryId: 'IN',
});
afterWorld.industryProductions.production_glass = {
    id: 'production_glass',
    canonicalProjectId: 'project_glass',
    title: 'Glass Harbour',
    producerStudioId: 'PARAMOUNT',
    status: 'PLANNED',
    source: 'STUDIO_INDEPENDENT',
    studioAiExecution: { talentSelected: false, problems: [] },
};
const collected = collectIndustryEventFacts(beforeWorld, afterWorld, 1_794);
assert.deepEqual(collected.map(item => item.type).sort(), [
    'COMPANY_LAUNCHED',
    'COMPANY_RESTRUCTURED',
    'PROJECT_GREENLIT',
    'PROJECT_HIT',
].sort());
assert.equal(new Set(collected.map(item => item.idempotencyKey)).size, collected.length);
assert.ok(collected.every(item => item.absoluteWeek === 1_794));

console.log('Industry world B7 presentation audit passed.');
