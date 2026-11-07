/**
 * #242 (plan §25.4 Q2): the platform decides when a title shows. The offer says "Netflix decides, by Week X". After signing: "With Netflix ·
 * date not set". Four weeks before the premiere it names the date: a line in the activity log and news, once, no popup. A commission reads the same.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    STREAMING_PREMIERE_NOTICE_WEEKS,
    STREAMING_PREMIERE_OUTSIDE_WEEKS,
    announceStreamingPremieres,
    getStreamingPremiereStatus,
    streamingOfferPremiereWords,
    streamingPremiereNoticeWeek,
} from '../services/streamingPremiereStatus';

const pass = (label: string) => console.log(`✓ ${label}`);
const AGE = 40;
const WEEK = 10;
const NOW = getAbsoluteWeek(AGE, WEEK);
const contract = (id: string, signed: number, starts: number, overrides = {}) => ({
    id, sourceProjectId: `project-${id}`, titleAtSigning: `Title ${id}`, status: 'ACTIVE', signedAtAbsoluteWeek: signed, startsAtAbsoluteWeek: starts,
    seller: { type: 'PLAYER_STUDIO', id: 'studio', name: 'Studio', platformId: null },
    buyer: { type: 'PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    ...overrides,
});
const at = (absolute: number, base: Player): Player => ({ ...base, age: Math.floor(absolute / 52) + 1, currentWeek: (absolute % 52) + 1 });
const player = {
    ...structuredClone(INITIAL_PLAYER), id: 'date', age: AGE, currentWeek: WEEK, logs: [], news: [],
    world: {
        ...INITIAL_PLAYER.world,
        streamingRightsContracts: {
            a: contract('a', NOW, NOW + 10),
            near: contract('near', NOW, NOW + 2),
            ai: contract('ai', NOW, NOW + 4, { seller: { type: 'AI_STUDIO', id: 's', name: 'S', platformId: null } }),
        },
        platformAiPlayerCommissionOffers: {
            waiting: { id: 'waiting', canonicalProductionId: 'commission-1', status: 'DELIVERED', platformId: 'HULU', platformName: 'Hulu', platformContentPlanId: 'plan-none', title: 'Waiting' },
            picked: { id: 'picked', canonicalProductionId: 'commission-2', status: 'DELIVERED', platformId: 'HULU', platformName: 'Hulu', platformContentPlanId: 'plan-1', title: 'Picked' },
        },
        platforms: { HULU: { ai: { slate: [{ id: 'plan-1', releaseEntries: [{ premiereAtAbsoluteWeek: NOW + 8 }] }] } } },
    },
} as unknown as Player;

assert.equal(streamingOfferPremiereWords('Netflix', NOW + 3, NOW), `Netflix decides, by Week ${(NOW + 3 + STREAMING_PREMIERE_OUTSIDE_WEEKS) % 52 + 1}`);
assert.equal(streamingOfferPremiereWords('Netflix', null), 'Netflix decides');
pass('the offer says who decides and the latest it can be');

const before = getStreamingPremiereStatus(player, 'project-a')!;
assert.equal(before.stage, 'DATE_NOT_SET');
assert.equal(before.label, 'With Netflix · date not set');
assert.equal(before.premiereWeek, null, 'the date stays hidden');
assert.equal(before.outsideWeek, NOW + 10 + STREAMING_PREMIERE_OUTSIDE_WEEKS);
const notice = streamingPremiereNoticeWeek(NOW, NOW + 10);
assert.equal(notice, NOW + 10 - STREAMING_PREMIERE_NOTICE_WEEKS);
const after = getStreamingPremiereStatus(at(notice, player), 'project-a')!;
assert.equal(after.stage, 'DATED');
assert.equal(after.weeksLeft, STREAMING_PREMIERE_NOTICE_WEEKS);
assert.equal(getStreamingPremiereStatus(at(NOW + 10, player), 'project-a')!.stage, 'LIVE');
assert.equal(getStreamingPremiereStatus(player, 'project-ai'), null, 'not your title');
assert.equal(getStreamingPremiereStatus(player, 'nothing'), null);
assert.equal(streamingPremiereNoticeWeek(NOW, NOW + 2), NOW + 1, 'a date inside the notice is named next week');
pass('date not set, then dated 4 weeks ahead, then live');

let told = 0;
let week = player;
const pendingBefore = (player.pendingEvents || []).length;
for (let absolute = NOW + 1; absolute <= NOW + 12; absolute += 1) {
    week = announceStreamingPremieres(at(absolute, week), absolute);
    told = week.logs.filter(row => /Netflix dated "Title a"/.test(row.message)).length;
}
assert.equal(told, 1, 'once');
assert.ok(week.news.some(row => /Netflix dates Title a/.test(row.headline)), 'and news');
assert.ok(!week.logs.some(row => /Title ai/.test(row.message)), 'only your own titles');
assert.equal((week.pendingEvents || []).length, pendingBefore, 'no popup');
pass('the date arrives once: a line in the activity log and news, no popup');

assert.equal(getStreamingPremiereStatus(player, 'commission-1')!.label, 'With Hulu · date not set');
const picked = getStreamingPremiereStatus(player, 'commission-2')!;
assert.equal(picked.stage, 'DATED');
assert.equal(picked.premiereWeek, NOW + 8);
const once = announceStreamingPremieres(player, NOW);
assert.ok(once.logs.some(row => /Hulu dated "Picked"/.test(row.message)));
assert.equal(announceStreamingPremieres(once, NOW + 1).logs.filter(row => /Hulu dated "Picked"/.test(row.message)).length, 1, 'a commission is told once too');
pass('a commission reads the same');

const auction = readFileSync('services/releaseStreamingAuction.ts', 'utf8');
assert.ok(/calendarWait/.test(auction), 'the calendar picks a week');
const wizard = readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
assert.ok(!/phaseWeeksLeft: 1, \/\/ Streaming releases happen quickly/.test(wizard), 'sign and leave no longer releases next week');
pass('sign and leave waits for the week the platform picked');
console.log('platform-decides-date audit passed');
