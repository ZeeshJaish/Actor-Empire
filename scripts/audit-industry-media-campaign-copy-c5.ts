// @ts-nocheck - executable C5 campaign type and factual-copy fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryEventType, type IndustryMediaStory, type Player } from '../types';
import {
    createIndustryEventFact,
    createIndustryMediaCampaignDraft,
    selectIndustryMediaCampaignType,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'empire_studios';
player.name = 'Empire Studios';
const baseStory: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_copy', subjectKey: 'project:night_signal', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: 'placeholder', industryEventIds: ['placeholder'],
    firstAbsoluteWeek: 2_500, lastAdvancedAbsoluteWeek: 2_500, headline: 'Night Signal update',
    detail: 'Empire Studios confirmed a public Night Signal update.', channelEligibility: ['INSTAGRAM'],
    publishedChannels: [], companyId: player.id, companyName: player.name, projectId: 'night_signal',
};

const cases: Array<[IndustryEventType, boolean, boolean, boolean, string]> = [
    ['PROJECT_RELEASE_PLANNED', false, false, false, 'COUNTDOWN'],
    ['PROJECT_RELEASED', false, false, false, 'WATCH_PARTY'],
    ['AWARD_NOMINATED', false, false, false, 'AWARD_DRIVE'],
    ['PROJECT_CANCELLED', false, false, false, 'SAVE_THE_PROJECT'],
    ['FRANCHISE_DECISION', false, false, false, 'CONTINUE_THE_UNIVERSE'],
    ['PROJECT_DELAYED', false, true, false, 'DEFEND_SUBJECT'],
    ['PROJECT_HIT', false, false, false, 'CELEBRATE'],
    ['PROJECT_GREENLIT', false, false, false, 'CASTING_WISH'],
    ['PROJECT_CAST', true, false, false, 'FAN_EDIT'],
    ['PROJECT_RELEASED', true, false, false, 'WATCH_PARTY'],
    ['PROJECT_RELEASED', false, false, true, 'HASHTAG_CLASH'],
];
cases.forEach(([eventType, hasHitVideo, hasResponse, hasRival, expected]) => {
    assert.equal(selectIndustryMediaCampaignType(eventType, { hasHitVideo, hasResponse, hasRival }), expected);
});

const event = createIndustryEventFact({
    idempotencyKey: 'c5:copy:casting-wish', absoluteWeek: 2_500, type: 'PROJECT_GREENLIT', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
    headline: 'Night Signal enters development', detail: 'Empire Studios confirmed that Night Signal entered development.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story = { ...baseStory, primaryIndustryEventId: event.id, industryEventIds: [event.id], headline: event.headline, detail: event.detail };
const draft = createIndustryMediaCampaignDraft({
    player,
    fandom: {
        id: 'fandom_copy', name: 'Night Signal Archive', handle: '@NightSignalArchive', subjectName: 'Night Signal',
        subjectKey: story.subjectKey, archetype: 'CREATIVE',
    } as any,
    story,
    event,
    type: 'CASTING_WISH',
    absoluteWeek: 2_500,
});
assert.match(draft.purpose, /fan wish/i);
assert.match(draft.context, /no casting decision/i);
assert.doesNotMatch(`${draft.headline} ${draft.purpose} ${draft.context}`, /confirmed cast|insider|leak/i);
assert.match(draft.hashtag, /^#[A-Za-z0-9]{1,36}$/);

console.log('Industry media C5 campaign copy audit passed.');
