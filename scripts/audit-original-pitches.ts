import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStudioUsualBudget, advanceOriginalPitches, getLiveOriginalPitches, getOriginalPitchRefreshInWeeks, getOriginalPitchState, getOriginalScoutQuote, getPitchStory, passOriginalPitch, scoutOriginalPitches } from '../services/originalsPitches';
import { getPitchLeadGender, PITCH_STORY_FRAMES, fillPitchStory } from '../services/originalsPitchStories';
import { getOriginalsStudios } from '../services/originalsStudios';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getBuiltinUnknownId, NPC_DATABASE } from '../services/npcLogic';
import { collectReferencedNpcIds } from '../services/npcRetention';

/* #279: studios pitch the platform: a new set every 3 weeks, real scripts and teams, an answer-by date, Scout, by company size. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-pitches-audit', name: 'Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const base = prepareStreamingFullPlatformQa(fresh());
const setTreasury = (player: Player, treasuryCash: number, subscribers = 0): Player => ({
    ...player,
    ownedStreamingPlatform: {
        ...player.ownedStreamingPlatform,
        treasuryCash,
        metrics: { ...player.ownedStreamingPlatform.metrics, subscribers },
        originalPitches: undefined,
    },
});
const atWeek = (player: Player, weeks: number): Player => {
    const total = player.currentWeek + weeks;
    return { ...player, age: player.age + Math.floor((total - 1) / 52), currentWeek: ((total - 1) % 52) + 1 };
};

/* --- a set */
const rich = setTreasury(base, 900_000_000, 5_000_000);
const opened = advanceOriginalPitches(rich);
const pitches = getLiveOriginalPitches(opened);
assert.ok(pitches.length >= 3 && pitches.length <= 5, `3 to 5 pitches, got ${pitches.length}`);
assert.equal(new Set(pitches.map(pitch => pitch.studioId)).size, pitches.length, 'one pitch a studio');
assert.equal(new Set(pitches.map(pitch => pitch.script.title)).size, pitches.length, 'each its own title');
const allowed = new Set(getOriginalsStudios(opened).map(studio => studio.id));
const npc = new Map(NPC_DATABASE.map(person => [person.id, person]));
for (const pitch of pitches) {
    assert.ok(allowed.has(pitch.studioId), `${pitch.studioId} may pitch`);
    const { script, concept } = pitch;
    assert.equal(script.status, 'READY');
    assert.ok(script.quality >= 35 && script.quality <= 92, String(script.quality));
    assert.equal(script.id, concept.scriptId);
    assert.ok(script.logline && !script.logline.includes('{'), script.logline);
    assert.ok(script.storyCompass, 'it has Script DNA');
    assert.ok(script.attributes?.plot);
    if (script.projectType === 'SERIES') assert.ok((script.episodes || 0) >= 6 && (script.episodes || 0) <= 12);
    else assert.equal(script.episodes, undefined);
    assert.equal(concept.crewModes.director, 'HIRE');
    assert.ok(concept.selectedCrew.director, 'a director');
    assert.ok(npc.get(concept.selectedCrew.director!) || (base.flags.extraNPCs || []).find((person: any) => person.id === concept.selectedCrew.director), 'a real director');
    for (const key of ['cinematographer', 'composer', 'lineProducer', 'vfx']) assert.ok(concept.selectedCrew[key], `a ${key}`);
    assert.ok(concept.castList.length >= 2 && concept.castList.length <= 7);
    assert.equal(concept.castList[0].roleType, 'LEAD');
    assert.equal(concept.castList[0].storyFunction, 'PROTAGONIST', 'roles come from the Script DNA');
    assert.equal(concept.castList[0].characterName, pitch.heroName);
    assert.equal(new Set(concept.castList.map(role => role.actorId)).size, concept.castList.length, 'nobody plays two roles');
    assert.ok(concept.castList.every(role => role.actorId && role.salary! > 0 && role.characterName));
    assert.ok(concept.selectedLocations.length >= 1 && concept.selectedLocations.length <= 3);
    assert.ok(Object.values(concept.equipmentChoices || {}).every(tier => /^TIER_[1-5]$/.test(tier)));
    const answer = pitch.answerByAbsoluteWeek - pitch.createdAtAbsoluteWeek;
    assert.ok(answer >= 2 && answer <= 4, `2 to 4 weeks to answer, got ${answer}`);
    assert.ok(JSON.stringify(pitch).length < 7000, `a pitch stays small: ${JSON.stringify(pitch).length}`);
    const lead = npc.get(concept.castList[0].actorId!);
    const story = getPitchStory(pitch, lead?.gender);
    assert.ok(story.story.includes(pitch.heroName), story.story);
    assert.ok(!story.story.includes('{'), story.story);
    assert.ok(story.tone && story.world && story.focus);
}
console.log(pitches.map(pitch => `${pitch.studioName}: "${pitch.script.title}" ${pitch.script.genres[0]} q${pitch.script.quality}`).join('\n'));
const total = JSON.stringify(getOriginalPitchState(opened)).length;
assert.ok(total < 40_000, `the whole room stays small: ${total}`);

/* --- nothing changes until something should */
assert.equal(advanceOriginalPitches(opened), opened, 'the same week does nothing');
const refresh = getOriginalPitchRefreshInWeeks(opened);
assert.ok(refresh >= 1 && refresh <= 3);

/* --- run out, and the next set */
const later = advanceOriginalPitches(atWeek(opened, 3));
const liveLater = getLiveOriginalPitches(later);
assert.ok(liveLater.length >= 3 && liveLater.length <= 5, String(liveLater.length));
assert.ok(liveLater.some(pitch => !pitches.some(old => old.id === pitch.id)), 'a new set arrives every 3 weeks');
assert.notEqual(getOriginalPitchState(later).cycle, getOriginalPitchState(opened).cycle);
assert.ok(getOriginalPitchState(later).pitches.every(pitch => pitch.answerByAbsoluteWeek >= getAbsoluteWeek(later.age, later.currentWeek)), 'what ran out has gone');
const muchLater = advanceOriginalPitches(atWeek(later, 3));
assert.ok(getLiveOriginalPitches(muchLater).length <= 5, 'never more than 5');

/* --- same save, same pitches */
assert.deepEqual(getLiveOriginalPitches(advanceOriginalPitches(rich)).map(pitch => pitch.id), pitches.map(pitch => pitch.id));

/* --- Scout */
const quote = getOriginalScoutQuote(opened);
assert.equal(quote.price, 450_000);
const scouted = scoutOriginalPitches(opened);
assert.equal(scouted.changed, true, scouted.detail);
assert.equal(scouted.player.ownedStreamingPlatform.treasuryCash, opened.ownedStreamingPlatform.treasuryCash - 450_000, 'it costs what it said');
assert.ok(getLiveOriginalPitches(scouted.player).length <= 5);
assert.ok(getLiveOriginalPitches(scouted.player).some(pitch => !pitches.some(old => old.id === pitch.id)), 'new ones came in at once');
assert.equal(getOriginalScoutQuote(scouted.player).price, 900_000, 'the next one costs more');
const broke = setTreasury(opened, 1000, 0);
const refused = scoutOriginalPitches(broke);
assert.equal(refused.changed, false);
assert.equal(refused.player.ownedStreamingPlatform.treasuryCash, 1000, 'no charge when refused');

/* --- passing */
const target = pitches[0];
const passed = passOriginalPitch(opened, target.id);
assert.ok(!getLiveOriginalPitches(passed).some(pitch => pitch.id === target.id));
assert.equal(getOriginalPitchState(passed).passed.at(-1)?.title, target.script.title, 'it is remembered');
assert.equal(passOriginalPitch(passed, target.id), passed, 'passing twice does nothing');

/* --- company size */
const small = advanceOriginalPitches(setTreasury(base, 40_000_000, 10_000));
const smallPitches = getLiveOriginalPitches(small);
const cards = new Map(getOriginalsStudios(small).map(studio => [studio.id, studio]));
assert.ok(smallPitches.length >= 3);
assert.ok(smallPitches.every(pitch => cards.get(pitch.studioId)!.typeLabel !== 'Major studio'), 'a small service gets the smaller studios');
const salaries = (list: typeof pitches) => list.reduce((sum, pitch) => sum + pitch.concept.castList.reduce((inner, role) => inner + (role.salary || 0), 0), 0) / Math.max(1, list.length);
console.log(`cast cost per pitch: small $${Math.round(salaries(smallPitches) / 1e5) / 10}M, big $${Math.round(salaries(pitches) / 1e5) / 10}M`);

/* --- the locked and pre-launch states */
assert.equal(advanceOriginalPitches(fresh()).ownedStreamingPlatform.originalPitches, undefined, 'no platform, no pitches');

/* --- every story reads properly for any lead */
for (const [genre, frames] of Object.entries(PITCH_STORY_FRAMES)) {
    assert.equal(frames.length, 3, genre);
    for (const frame of frames) {
        for (const gender of ['MALE', 'FEMALE', 'NON_BINARY']) {
            if (getPitchLeadGender(frame) === 'FEMALE' && gender !== 'FEMALE') continue;
            for (const text of [frame.logline, frame.story, frame.seriesEnd, frame.movieEnd]) {
                const filled = fillPitchStory(text, 'Test Name', gender);
                assert.ok(!filled.includes('{') && !filled.includes('}'), filled);
                if (gender === 'MALE') assert.ok(!/\b(she|her|hers)\b/i.test(filled), `${genre}: ${filled}`);
            }
        }
    }
}

/* #311: a pitch survives a reload. The built-in unknowns are the same people every session, an old session's id gets recast, and the save keeps a pitch's people. */
{
    const unknowns = NPC_DATABASE.filter(npc => npc.id.startsWith('npc_rnd_'));
    assert.equal(unknowns.length, 50);
    assert.ok(unknowns.every((npc, index) => npc.id === getBuiltinUnknownId(index)), 'no id from the clock');
    assert.ok(new Set(unknowns.map(npc => npc.name)).size > 25, 'real different people, not one name 50 times');
    const player = opened;
    const state = getOriginalPitchState(player);
    assert.ok(state.pitches.length > 0);
    const pitch = state.pitches[0];
    const stale = 'npc_rnd_36_1794044252193';
    const broken: Player = {
        ...player,
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            originalPitches: {
                ...state,
                pitches: [{
                    ...pitch,
                    concept: { ...pitch.concept, castList: pitch.concept.castList.map((role, index) => (index === 0 ? { ...role, actorId: stale, actorName: 'Leo Snow' } : role)) },
                }, ...state.pitches.slice(1)],
            },
        },
    };
    const recast = getOriginalPitchState(broken).pitches[0].concept.castList[0];
    assert.notEqual(recast.actorId, stale, 'recast');
    assert.ok(NPC_DATABASE.some(npc => npc.id === recast.actorId && npc.occupation === 'ACTOR' && npc.name === recast.actorName), 'someone real');
    assert.ok(Number(recast.salary) > 0, 'with a real fee');
    assert.strictEqual(getOriginalPitchState(player), player.ownedStreamingPlatform.originalPitches, 'a healthy state is not copied');
    const referenced = collectReferencedNpcIds(player);
    assert.ok(pitch.concept.castList.every(role => !role.actorId || referenced.has(role.actorId)), 'the save keeps the people a pitch needs');
    assert.ok(!pitch.concept.selectedCrew.director || referenced.has(pitch.concept.selectedCrew.director as string));
}

/* #313: a pitch is logical. The studio budgets first from its money and the story, then fills it. Everyone is a person of the NPC world in the right trade. */
{
    const directors = new Set(NPC_DATABASE.filter(person => person.occupation === 'DIRECTOR').map(person => person.id));
    const actors = new Set(NPC_DATABASE.filter(person => person.occupation === 'ACTOR').map(person => person.id));
    const extraIds = new Set(((opened.flags?.extraNPCs || []) as Array<{ id: string }>).map(person => person.id));
    const all = getOriginalPitchState(opened).pitches;
    for (const pitch of all) {
        const genre = pitch.script.genres[0];
        const cast = pitch.concept.castList;
        assert.ok(cast.length >= (genre === 'DOCUMENTARY' ? 2 : 3), `${pitch.script.title}: ${cast.length} parts`);
        assert.ok(cast.length <= 7);
        assert.equal(new Set(cast.map(role => role.actorId)).size, cast.length, 'nobody plays two parts');
        cast.forEach(role => assert.ok(role.actorId && (actors.has(role.actorId) || extraIds.has(role.actorId)), `${role.actorName} is an actor of the NPC world`));
        const director = pitch.concept.selectedCrew.director as string;
        assert.ok(directors.has(director) || extraIds.has(director), 'its director is a director of the NPC world');
        assert.ok(NPC_DATABASE.some(person => person.id === pitch.script.writerId), 'its writer is a person of the NPC world');
        assert.ok(pitch.concept.selectedLocations.length >= 1);
    }
    const people = all.flatMap(pitch => pitch.concept.castList.map(role => role.actorId));
    assert.equal(new Set(people).size, people.length, 'nobody is attached to two pitches at once');
    assert.ok(getStudioUsualBudget(18) < 12 && getStudioUsualBudget(700) > 50 && getStudioUsualBudget(700) < 70 && getStudioUsualBudget(6500) > 170, 'a studio pitches what its money can carry');
}
/* #313: the filler directors are the same people every session too */
assert.ok(NPC_DATABASE.filter(person => person.id.startsWith('rnd_dir_')).length === 40);

console.log('original pitches audit passed');
