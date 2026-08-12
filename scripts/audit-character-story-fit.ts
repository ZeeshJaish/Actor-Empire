import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    evaluateCastStoryFit,
    evaluateCharacterProfileFit,
    getCastStoryRead,
    getCharacterIdentityOption,
} from '../services/characterStoryFit';
import type { CharacterIdentityProfile, StoryCompass } from '../types';

const grounded: StoryCompass = {
    perspective: 'PROTAGONIST_LED',
    conflictSource: 'ANTAGONIST',
    worldRule: 'GROUNDED',
    tone: 'TRAGIC',
    castShape: 'BALANCED',
    flexibility: 'ADAPTABLE',
    source: 'SCRIPT_DNA',
    confidence: 90,
};

const groundedHero: CharacterIdentityProfile = {
    storyFunction: 'PROTAGONIST',
    storyRole: 'HERO',
    abilityType: 'TRAINED',
    nature: 'HUMAN',
    identitySource: 'AUTO',
};

const unexplainedSpirit: CharacterIdentityProfile = {
    ...groundedHero,
    abilityType: 'SUPERNATURAL',
    nature: 'SPIRIT',
    identitySource: 'PLAYER',
};

const supernaturalCompass: StoryCompass = {
    ...grounded,
    worldRule: 'SUPERNATURAL',
};

const natural = evaluateCharacterProfileFit(grounded, groundedHero, 'LEAD');
const contradiction = evaluateCharacterProfileFit(grounded, unexplainedSpirit, 'LEAD');
const earnedSupernatural = evaluateCharacterProfileFit(supernaturalCompass, unexplainedSpirit, 'LEAD');

assert.equal(natural.label, 'NATURAL_FIT');
assert(natural.qualityAdjustment > 0, 'a coherent profile should receive a small bounded upside');
assert.equal(contradiction.label, 'STORY_CONFLICT');
assert(contradiction.qualityAdjustment >= -7, 'a contradiction must never create a runaway penalty');
assert(contradiction.warnings.some(warning => /not established|needs an explanation/i.test(warning)));
assert.notEqual(earnedSupernatural.label, 'STORY_CONFLICT', 'the same spirit should work when the script establishes supernatural rules');

const boldVillainLead = evaluateCharacterProfileFit(grounded, {
    ...groundedHero,
    storyRole: 'VILLAIN',
    identitySource: 'PLAYER',
}, 'LEAD');
assert.equal(boldVillainLead.label, 'BOLD_INTERPRETATION', 'unexpected moral framing should remain playable rather than being forbidden');
assert(boldVillainLead.qualityAdjustment <= 0 && boldVillainLead.qualityAdjustment >= -3);

const castRead = evaluateCastStoryFit(grounded, [
    { ...groundedHero, roleType: 'LEAD' },
    {
        storyFunction: 'ANTAGONIST',
        storyRole: 'VILLAIN',
        abilityType: 'NONE',
        nature: 'HUMAN',
        identitySource: 'AUTO',
        roleType: 'SUPPORTING',
    },
]);
assert.equal(castRead.label, 'NATURAL_FIT');
assert(castRead.score <= 100 && castRead.score >= 0);

const teamRead = getCastStoryRead({
    ...grounded,
    perspective: 'ENSEMBLE',
    castShape: 'ENSEMBLE',
    worldRule: 'SUPERPOWERED',
}, [
    { ...groundedHero, roleType: 'LEAD', name: 'Lead Hero', talent: 91, fame: 95 },
    { ...groundedHero, storyFunction: 'DEUTERAGONIST', roleType: 'ENSEMBLE', name: 'Second Hero', talent: 82, fame: 76 },
    { ...groundedHero, storyFunction: 'DEUTERAGONIST', roleType: 'ENSEMBLE', name: 'Third Hero', talent: 78, fame: 64 },
    { ...groundedHero, storyFunction: 'ALLY', storyRole: 'ALLY', roleType: 'SUPPORTING', name: 'Team Ally', talent: 72, fame: 40 },
    {
        storyFunction: 'ANTAGONIST',
        storyRole: 'VILLAIN',
        abilityType: 'SUPERPOWERED',
        nature: 'HUMAN',
        identitySource: 'PLAYER',
        roleType: 'SUPPORTING',
        name: 'Unknown Villain',
        talent: 90,
        fame: 12,
    },
]);
assert.equal(teamRead.archetype, 'HERO_TEAM_VS_VILLAIN');
assert.match(teamRead.headline, /Heroes assemble/i);
assert(teamRead.strengths.some(strength => /breakout-villain/i.test(strength)), 'a talented unknown villain should create breakout upside rather than an automatic mismatch');

assert.equal(getCharacterIdentityOption('storyFunction', 'PROTAGONIST').label, 'Main Character');
assert.equal(getCharacterIdentityOption('storyRole', 'OTHER').label, 'Morally Unclear');
assert.equal(getCharacterIdentityOption('abilityType', 'NONE').label, 'No Special Ability');
assert.equal(getCharacterIdentityOption('nature', 'ROBOT').label, 'Robot or AI');

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const controls = readSource('views/lifestyle/business/components/CharacterIdentityControls.tsx');
const compass = readSource('views/lifestyle/business/components/StoryCompassStrip.tsx');
const wizard = readSource('views/lifestyle/business/GreenlightWizard.tsx');
const castLink = readSource('views/mobile/CastLinkApp.tsx');
const gameLoop = readSource('services/gameLoop.ts');
const reactions = readSource('services/reactionTemplateEngine.ts');

assert(!controls.includes('<select'), 'character identity must not use device-dependent native selects');
assert.match(controls, /Restore story suggestions/);
assert.match(controls, /Story suggestion/);
assert.match(controls, /role="dialog"/);
assert.match(controls, /safe-area-inset-bottom/);
assert.match(compass, /Why these suggestions/);
assert.match(compass, /compassSentence/);
assert.match(compass, /Focus/);
assert.match(compass, /Tone/);
assert.match(wizard, /characterStoryFitScore: characterStoryFit\.score/);
assert.match(wizard, /castStoryArchetype: castStoryRead\.archetype/);
assert.match(wizard, /Cast Story Read/);
assert.match(wizard, /score \+= liveCharacterStoryFit\?\.qualityAdjustment \|\| 0/);
assert.match(castLink, /Story read/);
assert.match(gameLoop, /formatCharacterStoryFitLabel/);
assert.match(reactions, /characterStoryFitWarnings/);
assert.match(reactions, /deliberate creative swing/);

console.log('Character story-fit logic and mobile UI audit passed.');
