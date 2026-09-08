// @ts-nocheck - executable server-rendered C3 X presentation fixtures.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player, type XPost } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    ensureIndustryMediaDiscussion,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';
import { IndustryMediaDiscussionPanel, XApp } from '../views/mobile/XApp';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_empire';
player.name = 'Empire Studios';
player.currentWeek = 13;
player.age = 20;
player.team.publicist = {
    id: 'pub', name: 'Avery Cole', type: 'PUBLICIST', tier: 'STANDARD', weeklyCost: 1_000,
    description: '', perks: '',
};
const absoluteWeek = (player.age - 1) * 52 + (player.currentWeek - 1);
const event = createIndustryEventFact({
    idempotencyKey: 'c3:ui', absoluteWeek, type: 'PROJECT_GREENLIT', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
    headline: 'Empire Studios greenlights Night Signal', detail: 'The production package is approved.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_ui_c3', subjectKey: 'project:night_signal', category: 'PROJECT_DEVELOPMENT',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['NEWS', 'X'], publishedChannels: ['X'], companyId: player.id,
    companyName: player.name, projectId: 'night_signal',
};
let media = normalizeIndustryMediaWorld({ stories: [story], eventStoryIndex: { [event.id]: story.id } });
const antagonist = media.personalities.find(item => item.signatureRole === 'ANTAGONIST')!;
const post: XPost = {
    id: `x_${event.id}`, authorId: antagonist.id, authorName: antagonist.name, authorHandle: antagonist.handle,
    authorAvatar: antagonist.avatar, content: `${event.headline} The decision still has to prove itself.`,
    timestamp: player.currentWeek, likes: 2_000, retweets: 400, replies: 220, isPlayer: false, isLiked: false,
    isRetweeted: false, isVerified: true, industryEventId: event.id, mediaStoryId: story.id,
    mediaPersonalityId: antagonist.id,
};
const created = ensureIndustryMediaDiscussion({ state: media, story, event, post, player, absoluteWeek });
media = created.state;
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = media;
player.x.lastPostWeek = player.currentWeek;
player.x.feed = [created.post];

const noop = () => undefined;
const appMarkup = renderToStaticMarkup(<XApp player={player} onBack={noop} onUpdatePlayer={noop} />);
assert.match(appMarkup, /Discussion/);
assert.match(appMarkup, /4 voices|3 voices|2 voices/);

const panelMarkup = renderToStaticMarkup(
    <IndustryMediaDiscussionPanel player={player} sourcePost={created.post} absoluteWeek={absoluteWeek} onUpdatePlayer={noop} />,
);
assert.match(panelMarkup, /Public discussion/);
assert.match(panelMarkup, /Gideon Price/);
assert.match(panelMarkup, /Respond in your own voice/i);
assert.match(panelMarkup, /Clarify/);
assert.match(panelMarkup, /Acknowledge/);
assert.match(panelMarkup, /Formal statement/);
assert.match(panelMarkup, /Publish response/);
assert.match(panelMarkup, /Silence has no penalty/);
assert.match(panelMarkup, /That is the confirmed position/);

const legacy = structuredClone(player) as Player;
legacy.x.feed[0] = { ...legacy.x.feed[0], mediaDiscussionId: undefined };
const legacyMarkup = renderToStaticMarkup(<XApp player={legacy} onBack={noop} onUpdatePlayer={noop} />);
assert.doesNotMatch(legacyMarkup, /Discussion ·/);
assert.match(legacyMarkup, /Empire Studios greenlights Night Signal/);

console.log('Industry media C3 UI audit passed.');
