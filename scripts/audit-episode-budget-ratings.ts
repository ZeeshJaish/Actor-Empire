import assert from 'node:assert/strict';
import { generateEpisodeRatings, getEpisodeMoneyEffect } from '../services/episodeRatings';

/* #274: a season with its money laid out by episode. The episode with the most money must not simply be the top one. */

const release = (id: string, shares: number[] | undefined, episodes = 8, rating = 7.5): any => ({
    id,
    name: `Show ${id}`,
    type: 'SERIES',
    imdbRating: rating,
    projectDetails: {
        title: `Show ${id}`, type: 'SERIES', episodes, genre: 'DRAMA', episodeBudgetShares: shares, sourceScriptId: `script_${id}`,
        hiddenStats: { qualityScore: 75, scriptQuality: 78, directorQuality: 72, castingStrength: 65 },
    },
});

const SHAPES: Record<string, (episodes: number) => number[]> = {
    'Big Opening': n => Array.from({ length: n }, (_, i) => (i < Math.round(n * 0.35) ? 1.7 - i * 0.25 : 0.7)),
    'Strong Middle': n => Array.from({ length: n }, (_, i) => (i >= n * 0.35 && i < n * 0.75 ? 1.7 : 0.6)),
    'Big Finale': n => Array.from({ length: n }, (_, i) => (i >= n - Math.round(n * 0.25) ? 2.1 : 0.65)),
    'One huge episode': n => Array.from({ length: n }, (_, i) => (i === Math.floor(n / 2) ? 4 : 0.6)),
};

const study = (shapeOf: (n: number) => number[]) => {
    const TITLES = 3000;
    let top = 0;
    let thinTop = 0;
    let gap = 0;
    let offBy = 0;
    for (let k = 0; k < TITLES; k += 1) {
        const episodes = [6, 8, 10, 12, 16][k % 5];
        const shares = shapeOf(episodes);
        const row = release(`t${k}`, shares, episodes, 6 + (k % 30) / 10);
        const season = generateEpisodeRatings(row)[0];
        const ratings = season.episodes.map(item => item.rating);
        const most = Math.max(...shares);
        const least = Math.min(...shares);
        const best = Math.max(...ratings);
        const worst = Math.min(...ratings);
        if (ratings.some((value, i) => value === best && shares[i] === most)) top += 1;
        if (ratings.some((value, i) => value === best && shares[i] === least)) thinTop += 1;
        gap += best - worst;
        offBy = Math.max(offBy, Math.abs(season.averageRating - row.imdbRating));
    }
    return { top: top / TITLES, thinTop: thinTop / TITLES, gap: gap / TITLES, offBy };
};

const results = Object.fromEntries(Object.entries(SHAPES).map(([name, shape]) => [name, study(shape)]));
for (const [name, result] of Object.entries(results)) {
    console.log(name.padEnd(18), `most money is the top rating ${(result.top * 100).toFixed(0)}%, least money is the top ${(result.thinTop * 100).toFixed(0)}%, best to worst ${result.gap.toFixed(2)}`);
}
assert.ok(results['Big Opening'].top < 0.4, 'a big opening does not buy the top rating');
assert.ok(results['Strong Middle'].top < 0.6, 'a strong middle does not buy the top rating');
assert.ok(results['One huge episode'].top < 0.4, 'one huge episode does not buy the top rating');
assert.ok(results['Big Finale'].top < 0.75, 'a finale is often the best anyway, but money does not make it certain');
for (const [name, result] of Object.entries(results)) {
    assert.ok(result.thinTop > 0.15, `${name}: an episode with little money can be the best`);
    assert.ok(result.gap > 0.6, `${name}: a season still has highs and lows`);
    assert.ok(result.offBy <= 0.15, `${name}: the episodes still average the title's rating`);
}

/* the money curve itself */
assert.equal(getEpisodeMoneyEffect(1), 0);
assert.ok(getEpisodeMoneyEffect(4) < 0.12, 'four times the money adds about a tenth of a point');
assert.ok(getEpisodeMoneyEffect(0.5) < -0.2, 'half the money hurts');
assert.ok(getEpisodeMoneyEffect(0.1) < -0.55, 'almost no money hurts a lot');
assert.ok(getEpisodeMoneyEffect(0.1) > -0.7);

/* same title, same answer; a different shape changes the numbers a little, the peaks stay */
const evenRow = release('same', Array(8).fill(1));
const again = release('same', Array(8).fill(1));
assert.deepEqual(generateEpisodeRatings(evenRow), generateEpisodeRatings(again));
const shaped = generateEpisodeRatings(release('same', SHAPES['One huge episode'](8)))[0].episodes.map(item => item.rating);
const even = generateEpisodeRatings(evenRow)[0].episodes.map(item => item.rating);
assert.notDeepEqual(shaped, even);
const bestOf = (ratings: number[]) => ratings.indexOf(Math.max(...ratings));
const moved = Array.from({ length: 400 }, (_, k) => {
    const a = generateEpisodeRatings(release(`m${k}`, Array(8).fill(1)))[0].episodes.map(item => item.rating);
    const b = generateEpisodeRatings(release(`m${k}`, SHAPES['One huge episode'](8)))[0].episodes.map(item => item.rating);
    return bestOf(a) === bestOf(b);
}).filter(Boolean).length;
assert.ok(moved > 200, 'the money rarely moves where the best episode is');

/* a title with no episode budget is exactly as it was */
const plain = generateEpisodeRatings(release('plain', undefined));
const wrongLength = generateEpisodeRatings(release('plain', [1, 2, 3]));
assert.deepEqual(plain, wrongLength);
assert.equal(plain[0].episodes.length, 8);

console.log('episode budget ratings audit passed');
