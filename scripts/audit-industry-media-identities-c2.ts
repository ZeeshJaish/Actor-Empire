// @ts-nocheck - executable deterministic and malformed-save fixtures.
import assert from 'node:assert/strict';
import {
    INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT,
    INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT,
    INDUSTRY_MEDIA_STANCE_LIMIT,
    INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT,
    createDefaultIndustryMediaIdentities,
    getIndustryMediaSocialProfiles,
} from '../services/industryWorld/industryMediaIdentities';
import { normalizeIndustryMediaWorld } from '../services/industryWorld/industryMediaLedger';

const defaults = createDefaultIndustryMediaIdentities();
const normalized = normalizeIndustryMediaWorld(undefined);

assert.equal(normalized.schemaVersion, 7);
assert.ok(normalized.institutions.some(item => item.kind === 'TRADE'));
assert.ok(normalized.institutions.some(item => item.kind === 'BUSINESS'));
assert.ok(normalized.institutions.some(item => item.kind === 'PRESTIGE'));
assert.ok(normalized.institutions.some(item => item.kind === 'REGIONAL'));
assert.ok(normalized.institutions.some(item => item.kind === 'FANDOM'));
assert.ok(normalized.institutions.some(item => item.coveredRegionIds.includes('INDIA')));
assert.equal(normalized.personalities.filter(item => item.signatureRole === 'ANTAGONIST').length, 1);
assert.equal(normalized.personalities.filter(item => item.signatureRole === 'SUPPORTER').length, 1);
assert.ok(normalized.personalities.some(item => item.role === 'THEORY_CREATOR'));
assert.ok(normalized.personalities.every(item => !/^https?:/i.test(item.avatar)));
assert.ok(normalized.personalities.every(item => (
    !item.institutionId || normalized.institutions.some(institution => institution.id === item.institutionId)
)));

const profiles = getIndustryMediaSocialProfiles(normalized);
assert.equal(profiles.length, normalized.personalities.length);
assert.ok(profiles.every(profile => profile.handle.startsWith('@')));
assert.ok(profiles.every(profile => !/^https?:/i.test(profile.avatar)));

const baseInstitution = defaults.institutions[0];
const basePersonality = defaults.personalities.find(item => !item.signatureRole) || defaults.personalities[0];
const generatedInstitutions = Array.from(
    { length: INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT + 8 },
    (_unused, index) => ({
        ...baseInstitution,
        id: `generated_institution_${index}`,
        name: `Generated Institution ${index}`,
        shortName: `GI ${index}`,
        handles: { X: `@generatedinstitution${index}` },
        isAnchor: false,
    }),
);
const generatedPersonalities = Array.from(
    { length: INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT + 12 },
    (_unused, index) => ({
        ...basePersonality,
        id: `generated_personality_${index}`,
        name: `Generated Personality ${index}`,
        handle: `@generatedpersonality${index}`,
        institutionId: generatedInstitutions[index % generatedInstitutions.length].id,
        isAnchor: false,
        signatureRole: undefined,
        recentStoryIds: Array.from({ length: 20 }, (__, storyIndex) => `story_${storyIndex}`),
    }),
);
const oversized = normalizeIndustryMediaWorld({
    institutions: [
        ...defaults.institutions,
        ...generatedInstitutions,
        { ...baseInstitution, id: '', name: '' },
        { ...baseInstitution },
    ],
    personalities: [
        ...defaults.personalities,
        ...generatedPersonalities,
        { ...basePersonality, id: '', name: '' },
        { ...basePersonality, id: 'orphan_personality', institutionId: 'missing_institution' },
    ],
    subjectStances: Array.from({ length: INDUSTRY_MEDIA_STANCE_LIMIT + 20 }, (_unused, index) => ({
        personalityId: generatedPersonalities[index % generatedPersonalities.length].id,
        subjectKey: `company:${index}`,
        affinity: index % 2 === 0 ? 999 : -999,
        lastUpdatedAbsoluteWeek: index,
    })),
    storyAssignments: Array.from(
        { length: INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT + 20 },
        (_unused, index) => ({
            id: `assignment_${index}`,
            storyId: `story_${index}`,
            industryEventId: `event_${index}`,
            channel: 'X',
            institutionId: generatedInstitutions[index % generatedInstitutions.length].id,
            personalityId: generatedPersonalities[index % generatedPersonalities.length].id,
            angle: 'ANALYSIS',
            assignedAbsoluteWeek: index,
            lastUsedAbsoluteWeek: index,
        }),
    ),
});

assert.ok(oversized.institutions.filter(item => !item.isAnchor).length <= INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT);
assert.ok(oversized.personalities.filter(item => !item.isAnchor).length <= INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT);
assert.ok(oversized.personalities.every(item => item.recentStoryIds.length <= 12));
assert.ok(oversized.subjectStances.length <= INDUSTRY_MEDIA_STANCE_LIMIT);
assert.ok(oversized.storyAssignments.length <= INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT);
assert.ok(oversized.subjectStances.every(item => item.affinity >= -100 && item.affinity <= 100));
assert.equal(oversized.personalities.some(item => item.id === 'orphan_personality'), false);
assert.deepEqual(normalizeIndustryMediaWorld(oversized), oversized, 'C2 media state must normalize idempotently');

console.log('Industry media C2 identity audit passed.');
