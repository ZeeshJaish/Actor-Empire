// @ts-nocheck - executable C7 narrative, relationship, and publicist UI fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import { normalizeIndustryMediaWorld } from '../services/industryWorld';
import { IndustryNarrativeContext } from '../views/mobile/IndustryNarrativeContext';

const base = normalizeIndustryMediaWorld(undefined);
const personality = base.personalities.find(item => item.id === 'gideon_price');
const story = { schemaVersion: 1, id: 'story_c7_ui', subjectKey: 'company:empire_studios', category: 'COMPANY', stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: 'event_c7_ui', industryEventIds: ['event_c7_ui'], firstAbsoluteWeek: 100, lastAdvancedAbsoluteWeek: 104, headline: 'Empire expands', detail: 'Empire Studios expanded after a run of ambitious projects.', channelEligibility: ['NEWS', 'X'], publishedChannels: ['NEWS'], companyId: 'empire_studios', companyName: 'Empire Studios' };
const player = structuredClone(INITIAL_PLAYER);
player.world.industryMedia = normalizeIndustryMediaWorld({
    stories: [story],
    narratives: [{ schemaVersion: 1, id: 'narrative_ui', narrativeKey: 'company:empire_studios:AMBITIOUS_RISK_TAKER', subjectKey: story.subjectKey, subjectName: 'Empire Studios', theme: 'AMBITIOUS_RISK_TAKER', polarity: 'MIXED', stage: 'ESTABLISHED', strength: 64, confidence: 70, supportingEvidence: 3, contradictingEvidence: 1, primaryStoryId: story.id, primaryIndustryEventId: 'event_c7_ui', firstAbsoluteWeek: 100, lastAdvancedAbsoluteWeek: 104, nextEligiblePublicationAbsoluteWeek: 112, landmarks: [{ id: 'landmark_ui', kind: 'LATEST', industryEventIds: ['event_c7_ui'], absoluteWeek: 104, summary: story.detail, impact: 12 }], playerRelated: true }],
    mediaRelationships: [{ schemaVersion: 1, id: 'relationship_ui', relationshipKey: `${personality.id}:${story.subjectKey}`, personalityId: personality.id, subjectKey: story.subjectKey, subjectName: 'Empire Studios', affinity: -55, respect: 48, trust: 34, tension: 72, familiarity: 80, direction: 'WORSENING', feudState: 'ACTIVE', conflictEventIds: ['e1', 'e2', 'e3'], conflictAbsoluteWeeks: [90, 97, 104], landmarkInteractionIds: ['i1', 'i2', 'i3'], firstInteractionAbsoluteWeek: 90, lastMeaningfulInteractionAbsoluteWeek: 104, playerRelated: true }],
});
const html = renderToStaticMarkup(<IndustryNarrativeContext player={player} subjectKey={story.subjectKey} />);
assert.match(html, /Ambitious risk-taker/i);
assert.match(html, /Established/i);
assert.match(html, /active public feud|hostile media rivalry/i);
assert.match(html, /Empire Studios expanded/i);

const read = path => fs.readFileSync(`${process.cwd()}/${path}`, 'utf8');
assert.match(read('views/mobile/NewsApp.tsx'), /IndustryNarrativeContext/);
assert.match(read('views/mobile/XApp.tsx'), /IndustryNarrativeContext/);
assert.match(read('views/mobile/InstagramApp.tsx'), /IndustryNarrativeContext/);
assert.match(read('views/mobile/YoutubeApp.tsx'), /IndustryNarrativeContext/);
assert.doesNotMatch(read('views/mobile/XApp.tsx'), /getIndustryMediaResponseAdvice|advice\.summary/);
assert.match(read('views/mobile/TeamApp.tsx'), /getPublicistWeekSummary/);

console.log('Industry media C7 UI audit passed.');
