// @ts-nocheck - executable C6 read-only simulation-boundary fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryMediaClaim,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    publishIndustryMediaClaimBeats,
    resolveIndustryMediaClaims,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryProductions = {};
const absoluteWeek = 2_850;
const event = createIndustryEventFact({
    idempotencyKey: 'c6:isolation:company', absoluteWeek, type: 'COMPANY_DISTRESS', importance: 'HIGH',
    companyId: 'northstar_media', companyName: 'Northstar Media', headline: 'Northstar faces pressure',
    detail: 'The rival company disclosed a difficult quarter.', evidence: [{ kind: 'COMPANY', id: 'northstar_media' }],
});
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
const story = {
    schemaVersion: 1, id: 'story_c6_isolation', subjectKey: 'company:northstar_media', category: 'COMPANY',
    stage: 'DEVELOPING', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: [],
    companyId: 'northstar_media', companyName: 'Northstar Media',
};
player.world.industryMedia = normalizeIndustryMediaWorld({
    stories: [story], eventStoryIndex: { [event.id]: story.id },
});
const before = {
    money: player.money,
    businesses: structuredClone(player.businesses),
    pastProjects: structuredClone(player.pastProjects),
    platforms: structuredClone(player.world.platforms),
    studios: structuredClone(player.world.studios),
    projects: structuredClone(player.world.projects),
    productions: structuredClone(player.world.industryProductions),
    rights: structuredClone(player.world.rightsMarket),
};

const resolution = resolveIndustryMediaClaims(player, absoluteWeek);
const creation = createIndustryMediaClaim(resolution.player, absoluteWeek);
const result = publishIndustryMediaClaimBeats(creation.player, absoluteWeek, creation.claim, resolution.resolvedClaims);
assert.equal(result.player.money, before.money);
assert.deepEqual(result.player.businesses, before.businesses);
assert.deepEqual(result.player.pastProjects, before.pastProjects);
assert.deepEqual(result.player.world.platforms, before.platforms);
assert.deepEqual(result.player.world.studios, before.studios);
assert.deepEqual(result.player.world.projects, before.projects);
assert.deepEqual(result.player.world.industryProductions, before.productions);
assert.deepEqual(result.player.world.rightsMarket, before.rights);

console.log('Industry media C6 simulation-isolation audit passed.');
