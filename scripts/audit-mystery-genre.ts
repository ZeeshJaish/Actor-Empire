import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { INITIAL_PLAYER } from '../types';
import { ALL_GENRES, GENRE_LABELS, createDefaultGenreXP, formatGenreLabel, hydrateGenreXP } from '../services/genreCatalog';
import { GENRE_SYNERGIES, generateReviews } from '../services/roleLogic';
import { createMarketTrends } from '../services/marketTrends';
import { GENRE_TRAINING_CATALOG } from '../services/lifestyleLogic';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

assert.ok(ALL_GENRES.includes('MYSTERY' as any), 'Mystery should be in the shared genre catalog');
assert.equal(GENRE_LABELS.MYSTERY, 'Mystery', 'Mystery should have a display label');
assert.equal(formatGenreLabel('MYSTERY'), 'Mystery', 'Mystery should format cleanly');
assert.equal(createDefaultGenreXP().MYSTERY, 0, 'New saves should start with Mystery XP');
assert.equal(hydrateGenreXP({ ACTION: 5 }).MYSTERY, 0, 'Old saves should hydrate Mystery XP');
assert.equal(INITIAL_PLAYER.stats.genreXP.MYSTERY, 0, 'Initial player should include Mystery XP');

assert.ok(GENRE_SYNERGIES.MYSTERY.includes('THRILLER'), 'Mystery should share XP with Thriller');
assert.ok(GENRE_SYNERGIES.MYSTERY.includes('CRIME'), 'Mystery should share XP with Crime');
assert.ok(createMarketTrends(12).some(trend => trend.genre === 'MYSTERY'), 'Market demand should include Mystery');
assert.ok(GENRE_TRAINING_CATALOG.some(training => training.genre === 'MYSTERY'), 'Training should include Mystery');
assert.ok(generateReviews(82, 'MYSTERY', 'Player').some(review => /mystery|clue|suspect|reveal|twist/i.test(review.text)), 'Mystery reviews should have genre flavor');

const roleLogic = read('services/roleLogic.ts');
assert.match(roleLogic, /'MYSTERY':\s*0\.(7|75|8)/, 'Mystery should have a box office multiplier');
assert.match(roleLogic, /NETFLIX:[^\n]+MYSTERY/, 'Netflix should recognize Mystery platform fit');
assert.match(roleLogic, /HULU:[^\n]+MYSTERY/, 'Hulu should recognize Mystery platform fit');

const streamingFunding = read('services/streamingFundingLogic.ts');
assert.match(streamingFunding, /NETFLIX:[^\n]+MYSTERY/, 'Streaming funding should consider Netflix Mystery fit');
assert.match(streamingFunding, /HULU:[^\n]+MYSTERY/, 'Streaming funding should consider Hulu Mystery fit');

assert.match(read('services/awardLogic.ts'), /MYSTERY/, 'Awards logic should consider Mystery');
assert.match(read('services/famousMovieLogic.ts'), /genre:\s*"MYSTERY"/, 'Famous project generator should include Mystery examples');
assert.match(read('services/productionEvents.ts'), /MYSTERY:/, 'Production crisis generator should include Mystery events');
assert.match(read('services/youtubeLogic.ts'), /MYSTERY:/, 'Creator NPC defaults should include Mystery XP');
assert.match(read('views/ImprovePage.tsx'), /case 'MYSTERY'/, 'Improve UI should have a Mystery icon');

console.log('Mystery genre audit passed.');
