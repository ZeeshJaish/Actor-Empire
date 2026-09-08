// @ts-nocheck - executable deterministic coverage fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import { createIndustryEventFact } from '../services/industryWorld/industryEventLedger';
import { normalizeIndustryMediaWorld } from '../services/industryWorld/industryMediaLedger';
import { assignIndustryMediaCoverage } from '../services/industryWorld/industryMediaCoverage';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_empire';
player.name = 'Empire Studios';
player.businesses = [{ id: 'empire_studios', name: 'Empire Studios' } as any];

const story = (id: string, category: IndustryMediaStory['category'], projectId?: string): IndustryMediaStory => ({
    schemaVersion: 1,
    id,
    subjectKey: projectId ? `project:${projectId}` : `company:${id}`,
    category,
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: `event_${id}`,
    industryEventIds: [`event_${id}`],
    firstAbsoluteWeek: 500,
    lastAdvancedAbsoluteWeek: 500,
    headline: `${id} advances`,
    detail: 'The canonical industry record advanced this week.',
    channelEligibility: ['NEWS', 'X', 'INSTAGRAM'],
    publishedChannels: [],
    ...(projectId ? { projectId } : {}),
});
const linkedStory = (value: IndustryMediaStory, eventId: string): IndustryMediaStory => ({
    ...value,
    primaryIndustryEventId: eventId,
    industryEventIds: [eventId],
});

const baseWorld = normalizeIndustryMediaWorld(undefined);
const playerEvent = createIndustryEventFact({
    idempotencyKey: 'c2:coverage:player',
    absoluteWeek: 500,
    type: 'PROJECT_GREENLIT',
    importance: 'HIGH',
    companyId: 'empire_studios',
    companyName: 'Empire Studios',
    projectId: 'empire_project',
    headline: 'Empire Studios greenlights a major science-fiction production',
    detail: 'The saved production package is now approved.',
    evidence: [{ kind: 'PROJECT', id: 'empire_project' }],
});
const playerStory = linkedStory(story('player_story', 'PROJECT_DEVELOPMENT', 'empire_project'), playerEvent.id);

const first = assignIndustryMediaCoverage({
    state: baseWorld,
    story: playerStory,
    event: playerEvent,
    channel: 'X',
    player,
    absoluteWeek: 500,
});
const replay = assignIndustryMediaCoverage({
    state: baseWorld,
    story: playerStory,
    event: playerEvent,
    channel: 'X',
    player,
    absoluteWeek: 500,
});
assert.equal(first.institution.id, replay.institution.id);
assert.equal(first.personality?.id, replay.personality?.id);
assert.equal(first.assignment.id, replay.assignment.id);
assert.deepEqual(first.state, replay.state, 'coverage selection must replay byte-for-byte');
assert.ok(first.institution.channels.includes('X'));
assert.ok(first.personality?.channels.includes('X'));

const signatureRoles = new Set<string>();
for (let index = 0; index < 16; index += 1) {
    const id = `player_signature_${index}`;
    const currentStory = story(id, 'PROJECT_DEVELOPMENT', `player_project_${index}`);
    const currentEvent = createIndustryEventFact({
        idempotencyKey: `c2:coverage:signature:${index}`,
        absoluteWeek: 510 + index,
        type: index % 2 === 0 ? 'PROJECT_GREENLIT' : 'PROJECT_HIT',
        importance: 'HIGH',
        companyId: 'empire_studios',
        companyName: 'Empire Studios',
        projectId: `player_project_${index}`,
        headline: `Empire Studios development ${index}`,
        detail: 'A canonical player-company development was recorded.',
        evidence: [{ kind: 'PROJECT', id: `player_project_${index}` }],
    });
    const selected = assignIndustryMediaCoverage({
        state: baseWorld,
        story: linkedStory(currentStory, currentEvent.id),
        event: currentEvent,
        channel: 'X',
        player,
        absoluteWeek: 510 + index,
    });
    if (selected.personality?.signatureRole) signatureRoles.add(selected.personality.signatureRole);
}
assert.deepEqual([...signatureRoles].sort(), ['ANTAGONIST', 'SUPPORTER']);

const indiaEvent = createIndustryEventFact({
    idempotencyKey: 'c2:coverage:india',
    absoluteWeek: 600,
    type: 'RIGHTS_DEAL',
    importance: 'MEDIUM',
    companyId: 'riverlight_pictures',
    companyName: 'Riverlight Pictures',
    projectId: 'monsoon_archive',
    headline: 'Monsoon Archive secures its India streaming window',
    detail: 'The saved rights agreement covers India.',
    evidence: [{ kind: 'PROJECT', id: 'monsoon_archive' }],
});
const indiaCoverage = assignIndustryMediaCoverage({
    state: baseWorld,
    story: linkedStory(story('india_rights', 'RIGHTS', 'monsoon_archive'), indiaEvent.id),
    event: indiaEvent,
    channel: 'NEWS',
    player,
    absoluteWeek: 600,
});
assert.equal(indiaCoverage.institution.homeRegionId, 'INDIA');
assert.ok(indiaCoverage.institution.coveredRegionIds.includes('INDIA'));

const neutralEvent = createIndustryEventFact({
    idempotencyKey: 'c2:coverage:fatigue:one',
    absoluteWeek: 700,
    type: 'PROJECT_RELEASED',
    importance: 'MEDIUM',
    companyId: 'northstar_films',
    companyName: 'Northstar Films',
    projectId: 'northstar_one',
    headline: 'Northstar One reaches theatres',
    detail: 'The canonical release opened this week.',
    evidence: [{ kind: 'PROJECT', id: 'northstar_one' }],
});
const neutralFirst = assignIndustryMediaCoverage({
    state: baseWorld,
    story: linkedStory(story('fatigue_one', 'PROJECT_RELEASE', 'northstar_one'), neutralEvent.id),
    event: neutralEvent,
    channel: 'NEWS',
    player,
    absoluteWeek: 700,
});
const nextEvent = createIndustryEventFact({
    idempotencyKey: 'c2:coverage:fatigue:two',
    absoluteWeek: 701,
    type: 'PROJECT_RELEASED',
    importance: 'MEDIUM',
    companyId: 'secondlight_films',
    companyName: 'Secondlight Films',
    projectId: 'secondlight_one',
    headline: 'Secondlight One reaches theatres',
    detail: 'Another canonical release opened this week.',
    evidence: [{ kind: 'PROJECT', id: 'secondlight_one' }],
});
const neutralSecond = assignIndustryMediaCoverage({
    state: neutralFirst.state,
    story: linkedStory(story('fatigue_two', 'PROJECT_RELEASE', 'secondlight_one'), nextEvent.id),
    event: nextEvent,
    channel: 'NEWS',
    player,
    absoluteWeek: 701,
});
assert.notEqual(neutralSecond.personality?.id, neutralFirst.personality?.id,
    'recent-appearance fatigue must rotate ordinary primary voices when peers are eligible');

assert.ok(neutralSecond.state.storyAssignments.length >= 2);
assert.ok(neutralSecond.state.personalities.every(item => item.recentStoryIds.length <= 12));
assert.ok(neutralSecond.state.subjectStances.every(item => item.affinity >= -100 && item.affinity <= 100));
assert.deepEqual(normalizeIndustryMediaWorld(neutralSecond.state), neutralSecond.state);

console.log('Industry media C2 coverage audit passed.');
