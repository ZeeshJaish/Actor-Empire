// @ts-nocheck - executable server-rendered presentation fixtures.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { normalizeIndustryMediaWorld } from '../services/industryWorld';
import { NewsApp } from '../views/mobile/NewsApp';
import { XApp } from '../views/mobile/XApp';
import { InstagramApp } from '../views/mobile/InstagramApp';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.currentWeek = 18;
player.age = 31;
player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
const personality = player.world.industryMedia.personalities.find(item => item.id === 'mara_voss')!;
const institution = player.world.industryMedia.institutions.find(item => item.id === personality.institutionId)!;

player.news = [{
    id: 'news_c2_ui',
    headline: 'Empire Studios begins a new production',
    subtext: 'The canonical project has been greenlit.',
    category: 'TOP_STORY',
    week: 18,
    year: 31,
    impactLevel: 'HIGH',
    industryEventId: 'industry_event_ui',
    mediaStoryId: 'media_story_ui',
    mediaInstitutionId: institution.id,
    mediaPersonalityId: personality.id,
    sourceName: institution.name,
    byline: personality.name,
}];
player.x.lastPostWeek = player.currentWeek;
player.x.feed = [{
    id: 'x_c2_ui',
    authorId: personality.id,
    authorName: personality.name,
    authorHandle: personality.handle,
    authorAvatar: '',
    content: 'Empire Studios begins a new production. The finished work still has to prove the decision right.',
    timestamp: 18,
    likes: 800,
    retweets: 120,
    replies: 54,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'FILM_OPINION',
    sentiment: 'INDUSTRY',
    industryEventId: 'industry_event_ui',
    mediaStoryId: 'media_story_ui',
    mediaInstitutionId: institution.id,
    mediaPersonalityId: personality.id,
}];
player.instagram.feed = [{
    id: 'instagram_c2_ui',
    authorId: personality.id,
    authorName: personality.name,
    authorHandle: personality.handle,
    authorAvatar: '',
    type: 'ANNOUNCEMENT',
    caption: 'Empire Studios begins a new production.',
    week: 18,
    year: 31,
    likes: 1_500,
    comments: 80,
    shares: 40,
    isPlayer: false,
    industryEventId: 'industry_event_ui',
    mediaStoryId: 'media_story_ui',
    mediaInstitutionId: institution.id,
    mediaPersonalityId: personality.id,
}];

const noop = () => undefined;
const newsMarkup = renderToStaticMarkup(<NewsApp player={player} onBack={noop} />);
assert.match(newsMarkup, /Screenline/);
assert.match(newsMarkup, /Mara Voss/);
assert.match(newsMarkup, /Empire Studios begins a new production/);

const xMarkup = renderToStaticMarkup(<XApp player={player} onBack={noop} onUpdatePlayer={noop} />);
assert.match(xMarkup, /Mara Voss/);
assert.match(xMarkup, /@maravoss/);

const instagramMarkup = renderToStaticMarkup(
    <InstagramApp
        player={player}
        onBack={noop}
        onPost={noop}
        onReactPost={noop}
        onRespondDM={noop}
        onFollow={noop}
        onInteract={noop}
    />,
);
assert.match(instagramMarkup, /@maravoss/);
assert.match(instagramMarkup, /Empire Studios begins a new production/);

const legacy = structuredClone(player) as Player;
delete legacy.news[0].sourceName;
delete legacy.news[0].byline;
delete legacy.news[0].mediaInstitutionId;
delete legacy.news[0].mediaPersonalityId;
legacy.x.feed[0] = {
    ...legacy.x.feed[0],
    authorId: 'industry_desk',
    authorName: 'Industry Desk',
    authorHandle: '@industrydesk',
    mediaInstitutionId: undefined,
    mediaPersonalityId: undefined,
};
const legacyNewsMarkup = renderToStaticMarkup(<NewsApp player={legacy} onBack={noop} />);
const legacyXMarkup = renderToStaticMarkup(<XApp player={legacy} onBack={noop} onUpdatePlayer={noop} />);
assert.match(legacyNewsMarkup, /Empire Studios begins a new production/);
assert.match(legacyXMarkup, /Industry Desk/);

console.log('Industry media C2 UI audit passed.');
