import assert from 'node:assert/strict';
import { SCRIPT_TEMPLATES } from '../src/data/scriptTemplates';
import { calculateConceptAttributes, suggestScriptPremise } from '../services/scriptConcept';
import { inferStoryCompass } from '../services/characterIdentityLogic';
import legacy from './fixtures/scriptDnaLegacy.json';
import { createHash } from 'node:crypto';
import type { Genre, ProjectFormat, ScriptOption } from '../types';

// Removing nautical options must make the reported pirate-story path fail.
const goal = SCRIPT_TEMPLATES.ADVENTURE.find(q => q.id === 'goal')!;
const location = SCRIPT_TEMPLATES.ADVENTURE.find(q => q.id === 'location')!;
assert.ok(goal.options.some(o => o.id === 'cursed-treasure'), 'A pirate crew must be able to seek cursed treasure.');
assert.ok(location.options.some(o => o.id === 'high-seas'), 'The adventure must be set at sea without choosing a jungle.');
assert.ok(location.options.some(o => o.id === 'island-chain'), 'An island adventure must be selectable.');
// Old selections must retain their saved meaning and scoring in all formats.
let legacyProfiles = 0;
for (const [genre, baseline] of Object.entries(legacy)) {
    const current = SCRIPT_TEMPLATES[genre as Genre];
    assert.deepEqual(current.map(q => q.id), baseline.questions.map(q => q.id));
    for (const question of baseline.questions) {
        assert.deepEqual(current.find(q => q.id === question.id)!.options.slice(0, question.choices.length).map(o => o.id), question.choices);
    }
    const profiles = (['LIVE_ACTION', 'ANIMATED', 'ANIME'] as ProjectFormat[]).flatMap(format => [false, true].flatMap(hybrid => baseline.questions.flatMap(question => question.choices.map(choiceId => {
        const options = baseline.questions.map(q => ({ questionId: q.id, choiceId: q.id === question.id ? choiceId : q.choices[0] }));
        return { format, hybrid, options, attributes: calculateConceptAttributes(genre as Genre, format, 'PUBLIC_FIGURE', options, hybrid) };
    }))));
    assert.equal(profiles.length, baseline.profileCount);
    assert.equal(createHash('sha256').update(JSON.stringify(profiles)).digest('hex'), baseline.profileHash, `${genre}: old concept scores changed`);
    legacyProfiles += profiles.length;
}
console.log(`PASS ${legacyProfiles} pre-expansion DNA profiles retain their scoring and selectable IDs.`);

const pirateOptions: ScriptOption[] = [{ questionId: 'goal', choiceId: 'cursed-treasure' }, { questionId: 'location', choiceId: 'high-seas' }];
assert.deepEqual(calculateConceptAttributes('ADVENTURE', 'LIVE_ACTION', 'PUBLIC_FIGURE', pirateOptions, false), {
    plot: 55, characters: 45, pacing: 50, dialogue: 45, action: 55, originality: 50,
}, 'Pirate spectacle should trade dialogue/character emphasis for plot/action rather than grant a flat bonus.');
const pirateCompass = inferStoryCompass({ genres: ['ADVENTURE'], options: pirateOptions, isOriginal: true });
assert.equal(pirateCompass.worldRule, 'SUPERNATURAL');
assert.equal(pirateCompass.conflictSource, 'ANTAGONIST');
assert.equal(pirateCompass.perspective, 'ENSEMBLE');
assert.equal(pirateCompass.castShape, 'ENSEMBLE');
assert.equal(inferStoryCompass({ genres: ['ADVENTURE', 'FANTASY'], options: [{ questionId: 'location', choiceId: 'high-seas' }] }).worldRule, 'MAGIC', 'A fantasy hybrid at sea must not silently become grounded.');
assert.equal(suggestScriptPremise(['ADVENTURE', 'FANTASY'], pirateOptions, 'Unrelated random story'), 'Adventure/fantasy: a pirate crew seeks cursed treasure; across the high seas and pirate ports.');
assert.equal(suggestScriptPremise(['ADVENTURE'], [{questionId: 'future-question', choiceId: 'future-answer'}], 'Saved premise'), 'Saved premise');
assert.match(suggestScriptPremise(['BIOPIC'], [{questionId: 'subject-angle', choiceId: 'pivotal-week'}], 'Fallback', 'Maya Stone'), /Maya Stone.*pivotal week/);

const savedCompass = { ...pirateCompass, worldRule: 'GROUNDED' as const, perspective: 'DUAL' as const, source: 'CANON' as const };
assert.deepEqual(inferStoryCompass({ genres: ['ADVENTURE', 'FANTASY'], options: pirateOptions, storyCompass: savedCompass }), savedCompass, 'Persisted canon/intent must win over expanded-library inference.');
assert.deepEqual(calculateConceptAttributes('ADVENTURE', 'LIVE_ACTION', 'PUBLIC_FIGURE', [...pirateOptions, ...pirateOptions], false), calculateConceptAttributes('ADVENTURE', 'LIVE_ACTION', 'PUBLIC_FIGURE', pirateOptions, false), 'Repeated new answer IDs must not stack free stat effects.');
assert.equal(inferStoryCompass({ genres: ['SCI_FI'], options: [{ questionId: 'setting', choiceId: 'ghost-ship' }] }).worldRule, 'TECHNOLOGY', 'A horror-only setting ID cannot change a sci-fi script.');
assert.deepEqual(calculateConceptAttributes('HORROR', 'LIVE_ACTION', 'PUBLIC_FIGURE', [{questionId: 'animation-world', choiceId: 'clockwork-world'}], false), {plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50}, 'A new answer from another genre must not fall through into legacy keyword boosts.');

let additions = 0;
for (const [genre, questions] of Object.entries(SCRIPT_TEMPLATES)) {
    let genreAdditions = 0;
    for (const question of questions) {
        assert.equal(new Set(question.options.map(o => o.id)).size, question.options.length);
        const oldIds = legacy[genre as Genre].questions.find(q => q.id === question.id)!.choices;
        for (const choice of question.options.filter(o => !oldIds.includes(o.id))) {
            genreAdditions++; additions++;
            assert.ok(choice.premise && choice.reviewSnippet && choice.newsHeadline);
            assert.equal(Object.values(choice.dna!).reduce((n, delta) => n + delta, 0), 0, `${genre}/${choice.id} must trade strengths instead of grant a flat upgrade`);
            for (const format of ['LIVE_ACTION', 'ANIMATED', 'ANIME'] as ProjectFormat[]) {
                const options = questions.map(q => ({ questionId: q.id, choiceId: q === question ? choice.id : q.options[0].id }));
                const attrs = calculateConceptAttributes(genre as Genre, format, 'PUBLIC_FIGURE', options, true);
                assert.ok(Object.values(attrs).every(v => Number.isFinite(v) && v >= 10 && v <= 100));
                assert.ok(suggestScriptPremise([genre as Genre], options, '').length <= 180);
            }
        }
    }
    assert.ok(genreAdditions > 0, `${genre} should gain usable variation`);
}
console.log(`PASS ${additions} new answers across 17 genres: bounded DNA, genre-scoped identity, deterministic premise, protected canon.`);
console.log('Script variation content and DNA path passed.');
