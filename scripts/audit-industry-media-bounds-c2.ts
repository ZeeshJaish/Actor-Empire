// @ts-nocheck - executable focused multi-year fixture, not a device performance test.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    INDUSTRY_MEDIA_ANCHOR_INSTITUTION_LIMIT,
    INDUSTRY_MEDIA_ANCHOR_PERSONALITY_LIMIT,
    INDUSTRY_MEDIA_ASSIGNMENTS_PER_STORY_LIMIT,
    INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT,
    INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT,
    INDUSTRY_MEDIA_RECENT_STORY_LIMIT,
    INDUSTRY_MEDIA_STANCE_LIMIT,
    INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT,
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryEventLedger,
    normalizeIndustryMediaWorld,
    projectIndustryEvents,
} from '../services/industryWorld';

const defaultMedia = normalizeIndustryMediaWorld(undefined);
const oldSignatureMemory = normalizeIndustryMediaWorld({
    ...defaultMedia,
    subjectStances: [{
        personalityId: 'gideon_price',
        subjectKey: 'company:empire_studios',
        affinity: -72,
        lastUpdatedAbsoluteWeek: 1,
    }, ...Array.from({ length: INDUSTRY_MEDIA_STANCE_LIMIT + 20 }, (_unused, index) => ({
        personalityId: 'mara_voss',
        subjectKey: `company:ordinary_${index}`,
        affinity: index % 7,
        lastUpdatedAbsoluteWeek: index + 2,
    }))],
});
assert.ok(oldSignatureMemory.subjectStances.some(item => (
    item.personalityId === 'gideon_price' && item.subjectKey === 'company:empire_studios'
)), 'bounded stance memory must retain the signature antagonist relationship');
assert.ok(oldSignatureMemory.subjectStances.length <= INDUSTRY_MEDIA_STANCE_LIMIT);

let player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_c2_bounds';
player.name = 'Empire Studios';
player.businesses = [{ id: 'empire_studios', name: 'Empire Studios', type: 'PRODUCTION_HOUSE' } as any];
let ledger = normalizeIndustryEventLedger(undefined);
let mediaWorld = normalizeIndustryMediaWorld(undefined);
const startWeek = 3_000;

for (let index = 0; index < 156; index += 1) {
    const absoluteWeek = startWeek + index;
    player.currentWeek = (index % 52) + 1;
    player.age = 30 + Math.floor(index / 52);
    if (index % 3 === 0) {
        const storyIndex = Math.floor(index / 3);
        const mode = storyIndex % 4;
        const projectId = `c2_bounds_project_${storyIndex}`;
        const event = createIndustryEventFact({
            idempotencyKey: `c2:bounds:${storyIndex}`,
            absoluteWeek,
            type: mode === 0 ? 'RIGHTS_DEAL'
                : mode === 1 ? 'PROJECT_GREENLIT'
                    : mode === 2 ? 'PROJECT_RELEASED'
                        : 'PROJECT_HIT',
            importance: 'HIGH',
            companyId: mode === 1 || mode === 3 ? 'empire_studios' : `company_${storyIndex}`,
            companyName: mode === 1 || mode === 3 ? 'Empire Studios' : `Studio ${storyIndex}`,
            projectId,
            rightsContractId: mode === 0 ? `rights_${storyIndex}` : undefined,
            headline: mode === 0
                ? `${projectId} closes an India streaming rights deal`
                : mode === 1
                    ? `Empire Studios greenlights ${projectId}`
                    : mode === 2
                        ? `${projectId} begins its Japanese release`
                        : `Empire Studios records a hit with ${projectId}`,
            detail: mode === 0
                ? 'The canonical agreement covers India.'
                : mode === 2
                    ? 'The canonical release opened in Japan.'
                    : 'The canonical industry result was recorded this week.',
            evidence: [{ kind: 'PROJECT', id: projectId }],
        });
        ledger = appendIndustryEventFacts(ledger, [event]);
    }
    const projection = projectIndustryEvents(player, ledger, absoluteWeek, mediaWorld);
    player = projection.player;
    ledger = projection.ledger;
    mediaWorld = projection.mediaWorld;
}

const c2News = player.news.filter(item => item.mediaInstitutionId);
const c2X = player.x.feed.filter(item => item.mediaInstitutionId);
const c2Instagram = player.instagram.feed.filter(item => item.mediaInstitutionId);
const personalityIds = new Set([...c2News, ...c2X, ...c2Instagram]
    .map(item => item.mediaPersonalityId)
    .filter(Boolean));
const institutionIds = new Set([...c2News, ...c2X, ...c2Instagram]
    .map(item => item.mediaInstitutionId)
    .filter(Boolean));

assert.ok(mediaWorld.institutions.filter(item => item.isAnchor).length <= INDUSTRY_MEDIA_ANCHOR_INSTITUTION_LIMIT);
assert.ok(mediaWorld.institutions.filter(item => !item.isAnchor).length <= INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT);
assert.ok(mediaWorld.personalities.filter(item => item.isAnchor).length <= INDUSTRY_MEDIA_ANCHOR_PERSONALITY_LIMIT);
assert.ok(mediaWorld.personalities.filter(item => !item.isAnchor).length <= INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT);
assert.ok(mediaWorld.storyAssignments.length <= INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT);
assert.ok(mediaWorld.subjectStances.length <= INDUSTRY_MEDIA_STANCE_LIMIT);
assert.ok(mediaWorld.personalities.every(item => item.recentStoryIds.length <= INDUSTRY_MEDIA_RECENT_STORY_LIMIT));
assert.ok(mediaWorld.stories.every(story => (
    mediaWorld.storyAssignments.filter(item => item.storyId === story.id).length
        <= INDUSTRY_MEDIA_ASSIGNMENTS_PER_STORY_LIMIT
)));
assert.ok(personalityIds.size >= 6, 'focused multi-year coverage should rotate among ordinary media voices');
assert.ok(personalityIds.has('gideon_price') && personalityIds.has('celeste_monroe'),
    'both signature player-facing voices should remain recognizable');
assert.ok(institutionIds.has('cinema_bharat'), 'India stories should reach the India-focused outlet');
assert.ok(institutionIds.has('han_river_screen'), 'Japan stories should reach the East Asia-focused outlet');
assert.ok([...c2X, ...c2Instagram].every(item => !/^https?:/i.test(item.authorAvatar || '')),
    'C2 social avatars must remain local/offline-safe');

// Allow expected delayed discussion and fading beats to settle before measuring a truly inactive span.
for (let offset = 0; offset < 12; offset += 1) {
    const projection = projectIndustryEvents(player, ledger, startWeek + 156 + offset, mediaWorld);
    player = projection.player;
    ledger = projection.ledger;
    mediaWorld = projection.mediaWorld;
}
const inactiveFeedCounts = [player.news.length, player.x.feed.length, player.instagram.feed.length];
const inactiveAssignmentCount = mediaWorld.storyAssignments.length;
for (let offset = 12; offset < 32; offset += 1) {
    const projection = projectIndustryEvents(player, ledger, startWeek + 156 + offset, mediaWorld);
    assert.equal(projection.news.length + projection.xPosts.length + projection.instaPosts.length, 0);
    player = projection.player;
    ledger = projection.ledger;
    mediaWorld = projection.mediaWorld;
}
assert.deepEqual([player.news.length, player.x.feed.length, player.instagram.feed.length], inactiveFeedCounts);
assert.equal(mediaWorld.storyAssignments.length, inactiveAssignmentCount,
    'inactive weeks must not manufacture identity assignments');

console.log('Industry media C2 focused bounds audit passed.', JSON.stringify({
    simulatedWeeks: 188,
    institutions: mediaWorld.institutions.length,
    personalities: mediaWorld.personalities.length,
    distinctPresentedPersonalities: personalityIds.size,
    retainedStories: mediaWorld.stories.length,
    storyAssignments: mediaWorld.storyAssignments.length,
    subjectStances: mediaWorld.subjectStances.length,
    feedItems: player.news.length + player.x.feed.length + player.instagram.feed.length,
}));
