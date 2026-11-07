import assert from 'node:assert/strict';
import { generateEpisodeRatings } from '../services/episodeRatings';
import { generateRenewalOffer } from '../services/roleLogic';
import {
    getSeasonRatings,
    getSeriesBaseTitle,
    getSeriesEpisodeRatings,
    getSeriesRating,
    groupSeriesRows,
    healCopiedEpisodeRatings,
} from '../services/seriesIdentity';

const player: any = {
    age: 30, currentWeek: 10, stats: { fame: 40, talent: 60 }, flags: {}, settings: {}, world: {},
    relationships: [], commitments: [], activeReleases: [], pastProjects: [], businesses: [],
};

const details = (extra: any = {}) => ({
    title: 'Harrow Lane', type: 'SERIES', episodes: 8, budgetTier: 'MID', estimatedBudget: 40_000_000, genre: 'MYSTERY',
    castList: [], reviews: [], hiddenStats: { qualityScore: 74, scriptQuality: 74, directorQuality: 70, castingStrength: 60, rawHype: 50 },
    ...extra,
});
const release = (id: string, name: string, rating: number, extra: any = {}) => {
    const row: any = { id, name, type: 'SERIES', roleType: 'LEAD', imdbRating: rating, budget: 40_000_000, projectDetails: details({ title: name, ...extra }) };
    row.projectDetails.episodeRatings = generateEpisodeRatings(row);
    return row;
};
const past = (id: string, name: string, rating: number, extra: any = {}) => ({
    id, name, type: 'ACTING_GIG', projectType: 'SERIES', roleType: 'LEAD', imdbRating: rating, year: 30, ...extra,
});

/* --- a renewal starts clean */
const s1 = release('release_s1', 'Harrow Lane', 7.4);
const offeredProject = (offer: any) => offer.project || offer.opportunity?.project || offer.projectDetails;
const p2 = offeredProject(generateRenewalOffer(s1, player));
assert.equal(p2.title, 'Harrow Lane: Season 2');
assert.equal(p2.installmentNumber, 2);
assert.equal(p2.franchiseId, 'release_s1');
assert.equal(p2.episodeRatings, undefined, 'a renewal must not carry the last season\'s ratings');

const s2: any = { id: 'release_s2', name: p2.title, type: 'SERIES', roleType: 'LEAD', imdbRating: 8.6, budget: 40_000_000, projectDetails: p2 };
s2.projectDetails = { ...p2, episodeRatings: generateEpisodeRatings(s2) };
assert.equal(s2.projectDetails.episodeRatings[0].season, 2);
assert.notDeepEqual(s2.projectDetails.episodeRatings[0].episodes, s1.projectDetails.episodeRatings[0].episodes);

const p3 = offeredProject(generateRenewalOffer(s2, player));
assert.equal(p3.title, 'Harrow Lane: Season 3');
assert.equal(p3.installmentNumber, 3);
assert.equal(p3.franchiseId, 'release_s1');
assert.equal(p3.episodeRatings, undefined);

/* the producer's title form, renewed from the acting side */
const producerForm = release('producer_s2', 'Oak Hill Season 2', 7, { franchiseId: 'oak', installmentNumber: 2 });
assert.equal(offeredProject(generateRenewalOffer(producerForm, player)).title, 'Oak Hill: Season 3');

/* --- one show, three seasons, S1 has no franchise id and S2+ point at it */
const s3: any = { id: 'release_s3', name: p3.title, type: 'SERIES', roleType: 'LEAD', imdbRating: 8.1, budget: 40_000_000, projectDetails: p3 };
s3.projectDetails = { ...p3, episodeRatings: generateEpisodeRatings(s3) };
{
    const groups = groupSeriesRows([s3, s1, s2]);
    assert.equal(groups.length, 1, 'three seasons, one page');
    assert.equal(groups[0].name, 'Harrow Lane');
    assert.deepEqual(groups[0].seasons.map(season => [season.season, season.row.id]), [[1, 'release_s1'], [2, 'release_s2'], [3, 'release_s3']]);
    const grid = getSeriesEpisodeRatings(groups[0]);
    assert.deepEqual(grid.map(season => season.season), [1, 2, 3]);
    assert.deepEqual(grid[0].episodes, s1.projectDetails.episodeRatings[0].episodes, 'season 1 keeps its numbers');
    assert.notDeepEqual(grid[1].episodes, grid[0].episodes);
    assert.notDeepEqual(grid[2].episodes, grid[1].episodes);
    assert.ok(Math.abs(grid[1].averageRating - 8.6) <= 0.1, 'a season averages to its own rating');
    assert.equal(getSeriesRating([7.4, 8.6, 8.1, 0]), 8);
}

/* --- every way a season gets named */
assert.equal(getSeriesBaseTitle('Harrow Lane: Season 12'), 'Harrow Lane');
assert.equal(getSeriesBaseTitle('Harrow Lane Season 2'), 'Harrow Lane');
assert.equal(getSeriesBaseTitle('Harrow Lane - Season 2'), 'Harrow Lane');
assert.equal(getSeriesBaseTitle('Harrow Lane S2'), 'Harrow Lane');
assert.equal(getSeriesBaseTitle('Season of the Witch'), 'Season of the Witch');
{
    const typed = release('typed_s2', 'Harrow Lane Returns', 8, { franchiseId: 'fran_1', installmentNumber: 2 });
    const plain = release('typed_s1', 'Harrow Lane', 7, { franchiseId: 'fran_1', installmentNumber: 1 });
    const numbered = release('typed_s3', 'Harrow Lane 3', 7, { franchiseId: 'fran_1', installmentNumber: 3 });
    const groups = groupSeriesRows([plain, typed, numbered]);
    assert.equal(groups.length, 1, 'a typed title and "Name 3" stay in the show');
    assert.equal(groups[0].name, 'Harrow Lane');
    assert.deepEqual(groups[0].seasons.map(season => season.season), [1, 2, 3]);
}

/* --- a spin-off is its own show, and its next season goes with it */
{
    const parent = release('p1', 'Harrow Lane', 7);
    const parent2 = release('p2', 'Harrow Lane: Season 2', 7.2, { franchiseId: 'p1', installmentNumber: 2, subtype: 'SEQUEL' });
    const spin = release('sp1', 'Blackwater', 7.5, { franchiseId: 'p1', installmentNumber: 1, subtype: 'SPINOFF' });
    const spin2 = release('sp2', 'Blackwater Season 2', 7.9, { franchiseId: 'p1', installmentNumber: 2, subtype: 'SEQUEL' });
    const groups = groupSeriesRows([parent, parent2, spin, spin2]);
    assert.equal(groups.length, 2, 'a spin-off stays separate');
    const main = groups.find(group => group.name === 'Harrow Lane')!;
    const side = groups.find(group => group.name === 'Blackwater')!;
    assert.deepEqual(main.seasons.map(season => season.row.id), ['p1', 'p2']);
    assert.deepEqual(side.seasons.map(season => [season.season, season.row.id]), [[1, 'sp1'], [2, 'sp2']]);
}

/* --- old records with no link */
{
    const groups = groupSeriesRows([past('o2', 'Old Show: Season 2', 8), past('o1', 'Old Show', 7), past('o3', 'Old Show Season 3', 6)]);
    assert.equal(groups.length, 1, '"X Season 2" joins X');
    assert.deepEqual(groups[0].seasons.map(season => [season.season, season.row.id]), [[1, 'o1'], [2, 'o2'], [3, 'o3']]);
    assert.equal(groupSeriesRows([past('a', 'Same Name', 7), past('b', 'Same Name', 8)]).length, 2, 'two plain rows with one title are two shows');
    const broken = groupSeriesRows([past('b1', 'Broken', 7), past('b2', 'Broken: Season 2', 8, { franchiseId: 'gone', installmentNumber: 2 })]);
    assert.equal(broken.length, 1, 'a first season joins by title when its id was lost');
    const missing = groupSeriesRows([past('m2', 'Joined Late: Season 2', 8, { franchiseId: 'x', installmentNumber: 2 }), past('m3', 'Joined Late: Season 3', 8, { franchiseId: 'x', installmentNumber: 3 })]);
    assert.deepEqual(missing[0].seasons.map(season => season.season), [2, 3], 'a player who joined at season 2 keeps the real numbers');
}

/* --- old saves */
{
    const realS1 = release('h1', 'Harrow Lane', 7.4);
    const copiedS2 = release('h2', 'Harrow Lane: Season 2', 8.6, { franchiseId: 'h1', installmentNumber: 2 });
    copiedS2.projectDetails.episodeRatings = realS1.projectDetails.episodeRatings;
    const pastS1 = past('h0', 'Old One', 8, { episodeRatings: realS1.projectDetails.episodeRatings });
    const pastS2 = past('h00', 'Old One: Season 2', 6.5, { franchiseId: 'h0', installmentNumber: 2, episodeRatings: realS1.projectDetails.episodeRatings });
    const inProduction = { id: 'job', name: 'Harrow Lane: Season 3', type: 'JOB', projectDetails: details({ title: 'Harrow Lane: Season 3', franchiseId: 'h1', installmentNumber: 3, episodeRatings: realS1.projectDetails.episodeRatings }) };
    const save: any = { commitments: [inProduction], activeReleases: [realS1, copiedS2], pastProjects: [pastS1, pastS2] };
    const healed = healCopiedEpisodeRatings(save);
    assert.notEqual(healed, save);
    assert.equal(healed.activeReleases[0], realS1, 'season 1 is not touched');
    assert.equal(healed.activeReleases[1].projectDetails.episodeRatings[0].season, 2);
    assert.ok(Math.abs(healed.activeReleases[1].projectDetails.episodeRatings[0].averageRating - 8.6) <= 0.1);
    assert.equal(healed.pastProjects[0], pastS1);
    assert.equal(healed.pastProjects[1].episodeRatings[0].season, 2);
    assert.ok(Math.abs(healed.pastProjects[1].episodeRatings[0].averageRating - 6.5) <= 0.1);
    assert.equal(healed.commitments[0].projectDetails.episodeRatings, undefined, 'a season not yet out has no ratings');
    assert.equal(healCopiedEpisodeRatings(healed), healed, 'running it again changes nothing');
    const legacyRow = past('l2', 'Legacy: Season 2', 7, { franchiseId: 'l1', installmentNumber: 2, episodeRatings: realS1.projectDetails.episodeRatings });
    assert.equal(getSeasonRatings(legacyRow)[0].season, 2, 'an old career archive shows the right season too');
    assert.equal(getSeasonRatings(past('l3', 'No Ratings Yet', 7)).length, 0);
}

console.log('series identity audit passed');
