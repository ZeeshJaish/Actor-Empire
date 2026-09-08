// @ts-nocheck - executable server-rendered C4 YouTube culture presentation fixture.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player, type YoutubeVideo } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryMediaYoutube,
} from '../services/industryWorld';
import { getYoutubeCommentAvatar, IndustryYoutubeContextPanel, YoutubeApp } from '../views/mobile/YoutubeApp';
import { generateYoutubeFeed } from '../services/youtubeLogic';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'c4_ui_player';
player.name = 'Empire Studios';
player.age = 36;
player.currentWeek = 20;
const absoluteWeek = player.age * 52 + player.currentWeek;
const event = createIndustryEventFact({
    idempotencyKey: 'c4:ui', absoluteWeek, type: 'FRANCHISE_DECISION', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'night_signal_ui',
    headline: 'Empire Studios confirms the Night Signal universe',
    detail: 'Night Signal is confirmed as part of a connected science-fiction universe.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal_ui' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c4_ui', subjectKey: 'project:night_signal_ui', category: 'FRANCHISE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['YOUTUBE'], publishedChannels: [], companyId: player.id,
    companyName: player.name, projectId: 'night_signal_ui',
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });
const published = processIndustryMediaYoutube(player, absoluteWeek).player;
const noop = () => undefined;

const appMarkup = renderToStaticMarkup(<YoutubeApp player={published} onBack={noop} onUpdatePlayer={noop} />);
assert.match(appMarkup, /Film &amp; TV/);
assert.match(appMarkup, /Theories/);
assert.match(appMarkup, /Industry/);
assert.match(appMarkup, /Empire Studios confirms the Night Signal universe/);
assert.match(appMarkup, /THEORY/);

const industryVideo = generateYoutubeFeed(published).find(video => video.industryContext) as YoutubeVideo;
assert.match(getYoutubeCommentAvatar(industryVideo, 'c4_ui_comment'), /^data:image\/svg\+xml/);
const panelMarkup = renderToStaticMarkup(<IndustryYoutubeContextPanel video={industryVideo} />);
assert.match(panelMarkup, /Confirmed record/);
assert.match(panelMarkup, /Creator interpretation/);
assert.match(panelMarkup, /Speculation/);
assert.match(panelMarkup, /Credibility/);
assert.match(panelMarkup, /Night Signal is confirmed/);
assert.doesNotMatch(panelMarkup, /undefined|NaN/);

console.log('Industry media C4 YouTube UI audit passed.');
