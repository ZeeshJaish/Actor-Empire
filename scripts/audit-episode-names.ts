import assert from 'node:assert/strict';
import { buildEpisodeNames, getProjectEpisodeNames } from '../services/episodeNames';
import { generateRenewalOffer } from '../services/roleLogic';
import { ALL_GENRES } from '../services/genreCatalog';

for (const genre of ALL_GENRES) {
    for (const episodes of [4, 8, 12, 16, 24]) {
        for (const season of [1, 2, 5]) {
            for (const set of [0, 1, 7]) {
                const names = buildEpisodeNames({ seed: `show_${genre}`, genre, episodes, season, set });
                assert.equal(names.length, episodes);
                assert.equal(new Set(names).size, episodes, `no repeats in a season: ${genre} ${episodes}`);
                assert.ok(names.every(name => name.length > 0 && name.length <= 28), `${genre}: a name too long for its row`);
                assert.deepEqual(names, buildEpisodeNames({ seed: `show_${genre}`, genre, episodes, season, set }), 'the same seed gives the same names');
            }
        }
    }
}

const base = { seed: 'harrow', genre: 'MYSTERY', episodes: 8 };
const first = buildEpisodeNames(base);
assert.notDeepEqual(first, buildEpisodeNames({ ...base, set: 1 }), 'Auto-name all gives a new set');
assert.notDeepEqual(first, buildEpisodeNames({ ...base, season: 2 }), 'each season has its own names');
assert.notEqual(buildEpisodeNames({ ...base, season: 2 })[0], 'Pilot', 'a later season never opens on Pilot');
for (let i = 0; i < 200; i += 1) assert.notEqual(buildEpisodeNames({ ...base, seed: `s${i}`, season: 3 })[0], 'Pilot');

const typed = buildEpisodeNames({ ...base, custom: { 3: 'The Long Way Round' } });
assert.equal(typed[2], 'The Long Way Round');
assert.equal(typed[3], first[3], 'a typed name leaves the others alone');
assert.equal(buildEpisodeNames({ ...base, custom: { 3: '   ' } })[2], first[2], 'a blank name falls back');

/* a release and its archive give the same names */
const details: any = { title: 'Harrow Lane', type: 'SERIES', episodes: 8, genre: 'MYSTERY', sourceScriptId: 'script_1', episodeNameSeed: 'script_1', episodeNameSet: 2, customEpisodeNames: { 1: 'Mine' }, hiddenStats: { rawHype: 40 }, budgetTier: 'MID', estimatedBudget: 4e7 };
const release: any = { id: 'r1', name: 'Harrow Lane', type: 'SERIES', roleType: 'LEAD', projectDetails: details };
const fromRelease = getProjectEpisodeNames(release);
assert.equal(fromRelease[0], 'Mine');
assert.deepEqual(fromRelease, getProjectEpisodeNames({ id: 'r1', name: 'Harrow Lane', genre: 'MYSTERY', episodeNameSeed: 'script_1', episodeNameSet: 2, customEpisodeNames: { 1: 'Mine' } }, 8));

/* a renewal does not inherit them */
const player: any = { age: 30, currentWeek: 10, stats: { fame: 40, talent: 60 }, flags: {}, settings: {}, world: {}, relationships: [], commitments: [], activeReleases: [], pastProjects: [], businesses: [] };
const offer: any = generateRenewalOffer(release, player);
const next = offer.project || offer.opportunity?.project || offer.projectDetails;
assert.equal(next.customEpisodeNames, undefined);
assert.equal(next.episodeNameSet, undefined);
assert.equal(next.episodeNameSeed, undefined);
assert.notDeepEqual(getProjectEpisodeNames({ id: 'r2', name: next.title, projectDetails: next }), fromRelease);

/* an old record with no script still gets stable names */
const old = getProjectEpisodeNames({ id: 'o', name: 'Old Show: Season 2', genre: 'DRAMA', installmentNumber: 2 }, 6);
assert.equal(old.length, 6);
assert.deepEqual(old, getProjectEpisodeNames({ id: 'o', name: 'Old Show: Season 2', genre: 'DRAMA', installmentNumber: 2 }, 6));

console.log('episode names audit passed');
