import assert from 'node:assert/strict';
import { rankStreamingAnchorCandidates } from '../services/streamingCatalogueAnchors';

const candidates = [
    { id: 'weak-first', title: 'Quiet Shelf', genre: 'Drama', format: 'MOVIE' as const, source: 'LICENSED' as const, rating: 5.1, coveredMarketCount: 1, scheduledWeek: null },
    { id: 'event-original', title: 'Crown of Dust', genre: 'Drama', format: 'SERIES' as const, source: 'ORIGINAL' as const, rating: 8.8, coveredMarketCount: 5, scheduledWeek: 1 },
    { id: 'comedy', title: 'Weekend Switch', genre: 'Comedy', format: 'MOVIE' as const, source: 'OWNED' as const, rating: 8.1, coveredMarketCount: 4, scheduledWeek: 2 },
    { id: 'thriller', title: 'Cold Signal', genre: 'Thriller', format: 'MOVIE' as const, source: 'LICENSED' as const, rating: 8.4, coveredMarketCount: 5, scheduledWeek: 4 },
    { id: 'drama-two', title: 'Second Crown', genre: 'Drama', format: 'MOVIE' as const, source: 'OWNED' as const, rating: 8.3, coveredMarketCount: 4, scheduledWeek: 3 },
];

const ranked = rankStreamingAnchorCandidates(candidates, 4);
assert.equal(ranked[0]?.id, 'event-original', 'The flagship Original should lead the opening anchors.');
assert.ok(!ranked.some(item => item.id === 'weak-first'), 'Import order must not make a weak first title an anchor.');
assert.ok(new Set(ranked.map(item => item.genre)).size >= 3, 'The opening anchors should represent catalogue breadth when strong alternatives exist.');
assert.deepEqual(rankStreamingAnchorCandidates(candidates, 4).map(item => item.id), ranked.map(item => item.id), 'Anchor ranking must be deterministic.');

console.log('Opening anchors rank quality, ownership, reach, timing, and genre breadth deterministically.');
