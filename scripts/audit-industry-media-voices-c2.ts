// @ts-nocheck - executable fact-safety and projection fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    projectIndustryEvents,
} from '../services/industryWorld';
import {
    createIndustryMediaVoice,
    ensureFactSafeIndustryMediaVoice,
    validateIndustryMediaVoice,
} from '../services/industryWorld/industryMediaVoice';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_empire';
player.name = 'Empire Studios';
player.news = [];
player.x.feed = [];
player.instagram.feed = [];

const media = normalizeIndustryMediaWorld(undefined);
const antagonist = media.personalities.find(item => item.signatureRole === 'ANTAGONIST')!;
const supporter = media.personalities.find(item => item.signatureRole === 'SUPPORTER')!;
const theorist = media.personalities.find(item => item.role === 'THEORY_CREATOR')!;
const institutionFor = (personality: typeof antagonist) => media.institutions.find(item => item.id === personality.institutionId)!;
const event = createIndustryEventFact({
    idempotencyKey: 'c2:voice:empire-greenlight',
    absoluteWeek: 800,
    type: 'PROJECT_GREENLIT',
    importance: 'HIGH',
    companyId: 'player_empire',
    companyName: 'Empire Studios',
    projectId: 'project_starfall',
    headline: 'Empire Studios greenlights Starfall',
    detail: 'The canonical production package is approved.',
    evidence: [{ kind: 'PROJECT', id: 'project_starfall' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1,
    id: 'media_story_starfall',
    subjectKey: 'project:project_starfall',
    category: 'FRANCHISE',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: event.id,
    industryEventIds: [event.id],
    firstAbsoluteWeek: 800,
    lastAdvancedAbsoluteWeek: 800,
    headline: event.headline,
    detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'INSTAGRAM'],
    publishedChannels: [],
    companyId: 'player_empire',
    companyName: 'Empire Studios',
    projectId: 'project_starfall',
};
const assignmentFor = (personality: typeof antagonist, angle: 'OPINION' | 'SPECULATION') => ({
    id: `assignment_${personality.id}`,
    storyId: story.id,
    industryEventId: event.id,
    channel: 'X' as const,
    institutionId: institutionFor(personality).id,
    personalityId: personality.id,
    angle,
    assignedAbsoluteWeek: 800,
    lastUsedAbsoluteWeek: 800,
});

const hostileInput = {
    event,
    story,
    institution: institutionFor(antagonist),
    personality: antagonist,
    assignment: assignmentFor(antagonist, 'OPINION'),
    channel: 'X' as const,
};
const hostile = createIndustryMediaVoice(hostileInput);
assert.equal(hostile.mediaPersonalityId, antagonist.id);
assert.equal(hostile.mediaInstitutionId, institutionFor(antagonist).id);
assert.match(hostile.content, /risk|expensive|prove|reckless/i);
assert.equal(hostile.industryEventId, event.id);
assert.equal(hostile.mediaStoryId, story.id);
assert.doesNotMatch(hostile.content, /\$999M|confirmed crossover|inside source/i);
assert.equal(validateIndustryMediaVoice(hostile, hostileInput), true);

const supportive = createIndustryMediaVoice({
    ...hostileInput,
    institution: institutionFor(supporter),
    personality: supporter,
    assignment: assignmentFor(supporter, 'OPINION'),
});
assert.match(supportive.content, /ambition|credit|record|setback/i);
assert.notEqual(supportive.content, hostile.content);

const theoryInput = {
    ...hostileInput,
    institution: institutionFor(theorist),
    personality: theorist,
    assignment: assignmentFor(theorist, 'SPECULATION'),
};
const theory = createIndustryMediaVoice(theoryInput);
assert.match(theory.content, /may|might|could|possibly|theory|suggests/i);
assert.equal(validateIndustryMediaVoice(theory, theoryInput), true);

const invalid = {
    ...hostile,
    content: 'An inside source confirmed a $999M crossover.',
    detail: 'An inside source confirmed a $999M crossover.',
};
assert.equal(validateIndustryMediaVoice(invalid, hostileInput), false);
const fallback = ensureFactSafeIndustryMediaVoice(invalid, hostileInput);
assert.equal(fallback.usedNeutralFallback, true);
assert.equal(fallback.content, `${event.headline} ${event.detail}`);
assert.doesNotMatch(fallback.content, /999|inside source|crossover/i);

const projected = projectIndustryEvents(
    player,
    appendIndustryEventFacts(undefined, [event]),
    800,
    undefined,
);
assert.equal(projected.news.length, 1);
assert.equal(projected.xPosts.length, 1);
assert.ok(projected.news[0].mediaInstitutionId);
assert.ok(projected.news[0].sourceName);
assert.ok(projected.news[0].byline);
assert.ok(projected.xPosts[0].mediaInstitutionId);
assert.ok(projected.xPosts[0].mediaPersonalityId);
assert.notEqual(projected.xPosts[0].authorName, 'Industry Desk');
assert.equal(projected.news[0].industryEventId, event.id);
assert.equal(projected.xPosts[0].mediaStoryId, projected.news[0].mediaStoryId);

const projectedReplay = projectIndustryEvents(
    projected.player,
    projected.ledger,
    800,
    projected.mediaWorld,
);
assert.equal(projectedReplay.news.length + projectedReplay.xPosts.length + projectedReplay.instaPosts.length, 0);
assert.deepEqual(projectedReplay.player, projected.player);

console.log('Industry media C2 voice audit passed.');
