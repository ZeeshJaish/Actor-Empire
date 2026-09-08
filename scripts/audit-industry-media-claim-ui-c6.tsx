// @ts-nocheck - server-rendered C6 claim visual-language fixture.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IndustryMediaClaim, IndustryMediaSourceRecord } from '../types';
import {
    IndustryClaimBadge,
    IndustryClaimContextPanel,
    IndustryClaimResolutionStrip,
    IndustrySourceTrackRecord,
} from '../views/mobile/IndustryClaimContext';

const base: IndustryMediaClaim = {
    schemaVersion: 1, id: 'claim_ui', claimKey: 'c6:ui', kind: 'RUMOUR', status: 'OPEN', category: 'CASTING',
    confidence: 'CREDIBLE_CHATTER', subjectKey: 'project:night_signal', subjectName: 'Night Signal',
    anchorIndustryEventId: 'event_ui', anchorStoryId: 'story_ui', evidenceEventIds: ['event_ui'],
    institutionId: 'screenline_trade', personalityId: 'mara_voss', publicationChannel: 'X', importance: 'HIGH',
    headline: 'Industry chatter: Night Signal', summary: 'A new lead may be circling the film. The report remains unconfirmed.',
    knownEvidence: 'Confirmed context: the project has been greenlit.',
    interpretation: 'What is being claimed: Priya Shah is being considered for the lead role.',
    target: { expectedEventTypes: ['PROJECT_CAST'], projectId: 'night_signal', talentId: 'talent_priya' },
    createdAbsoluteWeek: 2_900, earliestResolutionAbsoluteWeek: 2_901, expiryAbsoluteWeek: 2_912,
    lastEvaluatedAbsoluteWeek: 2_900, playerRelated: true,
};
const source: IndustryMediaSourceRecord = {
    schemaVersion: 1, id: 'record_ui', sourceId: 'mara_voss', institutionId: 'screenline_trade',
    personalityId: 'mara_voss', category: 'CASTING', calls: 9, confirmed: 5, partlyConfirmed: 1,
    refuted: 2, expired: 1, reliability: 82, currentStreak: 2, lastResolvedAbsoluteWeek: 2_899,
    recentClaimIds: ['older_claim'],
};

for (const kind of ['RUMOUR', 'LEAK', 'PREDICTION'] as const) {
    const markup = renderToStaticMarkup(<IndustryClaimBadge claim={{ ...base, kind }} />);
    assert.match(markup, new RegExp(kind === 'RUMOUR' ? 'Rumour' : kind === 'LEAK' ? 'Leak' : 'Prediction'));
}
const open = renderToStaticMarkup(
    <IndustryClaimContextPanel claim={base} sourceName="Screenline" byline="Mara Voss" sourceRecord={source} />,
);
assert.match(open, /Unconfirmed/);
assert.match(open, /What we know/);
assert.match(open, /What is being claimed/);
assert.match(open, /Screenline/);
assert.match(open, /Mara Voss/);
assert.match(open, /5 confirmed/);
assert.match(open, /2 missed/);
assert.doesNotMatch(open, /reliability|82|undefined|null|https?:\/\//i);

for (const status of ['CONFIRMED', 'PARTLY_CONFIRMED', 'REFUTED', 'EXPIRED_UNVERIFIED', 'SUPERSEDED'] as const) {
    const claim = {
        ...base, status,
        resolution: {
            status, absoluteWeek: 2_906, eventIds: ['event_result'],
            explanation: `Canonical evidence resolved the ${status.toLowerCase()} report.`, sourceReliabilityDelta: 2,
        },
    };
    const markup = renderToStaticMarkup(<IndustryClaimResolutionStrip claim={claim} />);
    assert.match(markup, /What happened next/);
    assert.doesNotMatch(markup, /undefined|null|https?:\/\//i);
}

const track = renderToStaticMarkup(<IndustrySourceTrackRecord record={source} />);
assert.match(track, /Source track record/);
assert.match(track, /9 resolved calls/);
assert.doesNotMatch(track, /reliability|82|undefined|null/i);

console.log('Industry media C6 claim UI audit passed.');
