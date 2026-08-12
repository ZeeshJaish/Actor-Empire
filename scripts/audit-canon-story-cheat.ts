import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCanonStoryQaFixture, CANON_STORY_QA_PREFIX } from '../services/canonStoryQa';

const studio = {
    id: 'qa_studio',
    name: 'QA Pictures',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    balance: 500_000_000,
    stats: { valuation: 750_000_000 },
    studioState: {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: 1,
        lastWriterRefreshWeek: 1,
    },
} as any;
const player = {
    name: 'QA Star',
    avatar: '',
    age: 30,
    currentWeek: 12,
    money: 200_000_000,
    stats: { fame: 85, talent: 86, skills: { acting: 90 } },
    businesses: [studio],
    pastProjects: [],
    activeReleases: [],
    world: { universes: {} },
    news: [],
    logs: [],
} as any;
const actors = [
    { id: 'hero_actor', name: 'Known Hero', talent: 89, fame: 94 },
    { id: 'mentor_actor', name: 'Mentor Actor', talent: 82, fame: 65 },
    { id: 'rival_actor', name: 'Rival Actor', talent: 84, fame: 58 },
    { id: 'villain_actor', name: 'Unknown Villain', talent: 91, fame: 12 },
];

const first = buildCanonStoryQaFixture(player, studio, actors);
const updatedStudio = first.businesses.find((business: any) => business.id === studio.id)!;
const universe = Object.values(first.world.universes).find((entry: any) => (
    String(entry.id).startsWith(CANON_STORY_QA_PREFIX)
)) as any;
const script = updatedStudio.studioState.scripts.find((entry: any) => (
    String(entry.id).startsWith(CANON_STORY_QA_PREFIX)
));
const release = first.activeReleases.find((entry: any) => (
    String(entry.id).startsWith(CANON_STORY_QA_PREFIX)
));
const project = first.pastProjects.find((entry: any) => (
    String(entry.id).startsWith(CANON_STORY_QA_PREFIX)
));

assert.ok(universe, 'cheat should create a universe');
assert.equal(universe.roster.length, 5, 'cheat universe should have a complete five-character canon roster');
universe.roster.forEach((character: any) => {
    assert.ok(character.storyFunction, `${character.name} should have a plot function`);
    assert.ok(character.storyRole, `${character.name} should have an audience view`);
    assert.ok(character.abilityType, `${character.name} should have an ability source`);
    assert.ok(character.nature, `${character.name} should have a character type`);
});
assert.ok(project.franchiseId && project.universeId, 'released history should belong to both the franchise and universe');
assert.equal(script.franchiseId, project.franchiseId, 'ready sequel script should preserve franchise continuity');
assert.equal(script.universeId, project.universeId, 'ready sequel script should preserve universe continuity');
assert.equal(script.storyCompass.source, 'CANON', 'ready script should carry protected canon story intent');
assert.equal(release.weekNum, 1, 'opening release should be ready for next-week news testing');
assert.equal(release.projectDetails.hiddenStats.castStoryArchetype, 'HERO_TEAM_VS_VILLAIN', 'release should test a hero team versus one villain');
assert.match(release.projectDetails.hiddenStats.castStoryHeadline, /Heroes assemble/i, 'release should carry the saved cast-story headline');

const second = buildCanonStoryQaFixture(first, updatedStudio, actors);
assert.equal(
    second.activeReleases.filter((entry: any) => String(entry.id).startsWith(CANON_STORY_QA_PREFIX)).length,
    1,
    'reloading the cheat should replace its active release instead of duplicating it',
);
assert.equal(
    second.pastProjects.filter((entry: any) => String(entry.id).startsWith(CANON_STORY_QA_PREFIX)).length,
    1,
    'reloading the cheat should replace its project history instead of duplicating it',
);

const homeSource = fs.readFileSync('views/HomePage.tsx', 'utf8');
assert.match(homeSource, /Canon Cast \+ News Kit/, 'Dev Tools should expose one clearly named canon test action');
assert.match(homeSource, /Franchise · Universe · Greenlight · News\/X/, 'the cheat action should explain its complete test scope');
assert.match(homeSource, /aria-label="Load canon cast, franchise, universe, Greenlight, news and social testing kit"/, 'the cheat action should be accessible');

console.log('Canon story cheat audit passed: universe, franchise, Greenlight, cast story, and news fixture are ready.');
