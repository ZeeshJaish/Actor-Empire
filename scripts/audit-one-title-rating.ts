/**
 * #238 (plan §25.4 Q7): one rating per title. One formula from quality; one function every screen reads; a series' episodes average to
 * its rating; satisfaction never stands in for a rating.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { INITIAL_PLAYER, type Player } from '../types';
import { generateEpisodeRatings } from '../services/episodeRatings';
import { getTitleRating, ratingFromQuality } from '../services/titleRating';

const pass = (label: string) => console.log(`✓ ${label}`);

assert.equal(ratingFromQuality(30), 4.5);
assert.equal(ratingFromQuality(70), 7.2);
assert.equal(ratingFromQuality(90), 8.4);
for (let quality = 1; quality <= 100; quality += 1) assert.ok(ratingFromQuality(quality) >= ratingFromQuality(quality - 1), `quality ${quality}`);
pass('one formula: 30 is 4.5, 70 is 7.2, 90 is 8.4, and it only rises');

for (const imdbRating of [8.5, 7.4, 5.2]) {
    const seasons = generateEpisodeRatings({ id: `s-${imdbRating}`, name: 'A Series', type: 'SERIES', imdbRating, projectDetails: { type: 'SERIES', episodes: 10, hiddenStats: { qualityScore: 40 } } } as never);
    const episodes = seasons[0].episodes;
    const average = episodes.reduce((sum, row) => sum + row.rating, 0) / episodes.length;
    assert.ok(Math.abs(average - imdbRating) <= 0.15, `the episodes of a ${imdbRating} average ${average.toFixed(2)}`);
    assert.ok(new Set(episodes.map(row => row.rating)).size > 1, 'they still differ from each other');
}
pass('a series reads the same on its hero and by its episodes');

const base = { ...structuredClone(INITIAL_PLAYER), world: { ...INITIAL_PLAYER.world, projects: [{ id: 'world-1', rating: 6.4, quality: 70 }, { id: 'world-2', rating: 0, quality: 70 }] } } as unknown as Player;
const player = {
    ...base,
    pastProjects: [{ id: 'past-1', imdbRating: 7.7, rating: 2 }],
    activeReleases: [{ id: 'active-1', imdbRating: 8.1 }],
    world: { ...base.world, platformAiPlayerCommissionOffers: { offer: { canonicalProductionId: 'commission-1', deliveredImdbRating: 6.9 } } },
} as unknown as Player;
assert.equal(getTitleRating(player, 'past-1'), 7.7, 'your filmography');
assert.equal(getTitleRating(player, 'active-1'), 8.1, 'a running release');
assert.equal(getTitleRating(player, 'commission-1'), 6.9, 'what you delivered to a platform');
assert.equal(getTitleRating(player, 'world-1'), 6.4, 'the world record');
assert.equal(getTitleRating(player, 'world-2'), 7.2, 'no rating yet: from its quality');
assert.equal(getTitleRating(player, 'nothing'), null, 'nothing known: no number at all');
pass('one function, for a title wherever it came from');

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
});
const bad = files('components').concat(files('views')).filter(path => /satisfactionScore\s*\/\s*10/.test(readFileSync(path, 'utf8')));
assert.deepEqual(bad, [], 'satisfaction shown as stars');
pass('satisfaction is never shown as stars');
console.log('one-title-rating audit passed');
