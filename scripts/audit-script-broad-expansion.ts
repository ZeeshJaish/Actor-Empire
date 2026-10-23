import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SCRIPT_TEMPLATES } from '../src/data/scriptTemplates';
import { calculateConceptAttributes, suggestScriptPremise } from '../services/scriptConcept';
import { inferStoryCompass } from '../services/characterIdentityLogic';
import { SCRIPT_STORY_VARIATIONS } from '../src/data/scriptStoryVariations';
import { SCRIPT_STORY_CASES, storyCaseOptions } from './fixtures/scriptStoryCombinations';
import baseline from './fixtures/scriptDnaPreBroad.json';
import type { Genre, ProjectFormat } from '../types';

// Catch removed/reinterpreted pre-existing answers, including the first 68 additions.
let profilesChecked = 0;
for (const [genre, saved] of Object.entries(baseline)) {
    const questions = SCRIPT_TEMPLATES[genre as Genre];
    assert.deepEqual(questions.map(q => q.id), saved.questions.map(q => q.id), 'Expansion must not add wizard questions.');
    for (const question of saved.questions) {
        const prefix = questions.find(q => q.id === question.id)!.options.slice(0, question.choices.length);
        assert.deepEqual(prefix.map(c => c.id), question.choices);
        assert.equal(createHash('sha256').update(JSON.stringify(prefix)).digest('hex'), question.choiceHash, `${genre}/${question.id}: existing answer metadata changed`);
    }
    const profiles = (['LIVE_ACTION', 'ANIMATED', 'ANIME'] as ProjectFormat[]).flatMap(format => [false, true].flatMap(hybrid => saved.questions.flatMap(question => question.choices.map(choiceId => {
        const options = saved.questions.map(q => ({ questionId: q.id, choiceId: q.id === question.id ? choiceId : q.choices[0] }));
        return { format, hybrid, options, attributes: calculateConceptAttributes(genre as Genre, format, 'PUBLIC_FIGURE', options, hybrid) };
    }))));
    assert.equal(createHash('sha256').update(JSON.stringify(profiles)).digest('hex'), saved.profileHash, `${genre}: saved answer scores changed`);
    profilesChecked += profiles.length;
}
console.log(`PASS ${profilesChecked} existing concept profiles and all existing question/answer metadata remain unchanged.`);

for (const [genre, questionId, choiceId] of [
    ['ACTION', 'protagonist', 'professional-thief'],
    ['ACTION', 'protagonist', 'street-racer'],
    ['ACTION', 'protagonist', 'car-dealer'],
    ['CRIME', 'crime-focus', 'criminal-transformation'],
    ['CRIME', 'crime-focus', 'dealership-front'],
    ['SCI_FI', 'concept', 'time-loop'],
    ['SCI_FI', 'concept', 'shared-dream-heist'],
    ['MYSTERY', 'mystery-engine', 'unreliable-investigator'],
    ['THRILLER', 'mystery', 'unreliable-investigation'],
    ['SUPERHERO', 'origin', 'recruited-hero-team'],
    ['SPORTS', 'sports-arc', 'driver-engineer-partnership'],
    ['COMEDY', 'premise', 'dealership-rivals'],
    ['DRAMA', 'conflict', 'ambition-vs-integrity'],
] as const) {
    assert.ok(SCRIPT_TEMPLATES[genre].find(q => q.id === questionId)?.options.some(c => c.id === choiceId), `${genre}/${questionId}: ${choiceId} must be selectable in the existing question`);
}
console.log('PASS broad story families are selectable in the existing questions.');

let newAnswers = 0;
for (const [genre, groups] of Object.entries(SCRIPT_STORY_VARIATIONS)) {
    for (const [questionId, choices] of Object.entries(groups)) {
        const question = SCRIPT_TEMPLATES[genre as Genre].find(q => q.id === questionId);
        assert.ok(question, `${genre}/${questionId}: additions must target an existing question`);
        assert.equal(new Set(question.options.map(c => c.id)).size, question.options.length);
        for (const answer of choices) {
            newAnswers++;
            assert.ok(!baseline[genre as Genre].questions.find(q => q.id === questionId)!.choices.includes(answer.id));
            assert.ok(answer.text && answer.premise && answer.reviewSnippet && answer.newsHeadline);
            assert.equal(Object.values(answer.dna!).reduce((sum, value) => sum + value, 0), 0, `${answer.id} cannot give a flat quality upgrade`);
        }
    }
}
for (const story of SCRIPT_STORY_CASES) {
    const options = storyCaseOptions(story);
    for (const option of options) assert.ok(SCRIPT_TEMPLATES[story.genres[0]].find(q => q.id === option.questionId)?.options.some(c => c.id === option.choiceId), `${story.id}: unknown answer`);
    const premise = suggestScriptPremise(story.genres, options, 'Unrelated default');
    for (const term of story.premiseTerms) assert.ok(premise.toLowerCase().includes(term.toLowerCase()), `${story.id}: selected premise lost ${term}: ${premise}`);
    const compass = inferStoryCompass({ genres: story.genres, options, logline: premise, isOriginal: true });
    for (const [field, want] of Object.entries(story.compass)) assert.equal(compass[field], want, `${story.id}/${field}`);
    for (const format of ['LIVE_ACTION', 'ANIMATED', 'ANIME'] as ProjectFormat[]) {
        const attrs = calculateConceptAttributes(story.genres[0], format, 'PUBLIC_FIGURE', options, story.genres.length > 1);
        assert.ok(Object.values(attrs).every(value => Number.isFinite(value) && value >= 10 && value <= 100));
    }
    const protectedCompass = { ...compass, source: 'CANON' as const, flexibility: 'PROTECTED' as const };
    assert.deepEqual(inferStoryCompass({ genres: story.genres, options, logline: premise, storyCompass: protectedCompass }), protectedCompass);
}
console.log(`PASS ${newAnswers} additional answers and ${SCRIPT_STORY_CASES.length} broad combinations: coherent premise/identity, bounded stats, unchanged canon.`);
