import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { FAMOUS_MOVIE_DB, FAMOUS_SERIES_DB } from '../services/famousMovieLogic';
import { STUDIO_CATALOG } from '../services/studioLogic';

const famousSource = readFileSync('services/famousMovieLogic.ts', 'utf8');
const studioSource = readFileSync('services/studioLogic.ts', 'utf8');
const typesSource = readFileSync('types.ts', 'utf8');

const expandedMovieTitles = [
  'The Prestige',
  'Memento',
  'Alien',
  'Aliens',
  'The Terminator',
  'Terminator 2: Judgment Day',
  'The Breakfast Club',
  'Back to the Future',
  'E.T. the Extra-Terrestrial',
  'Jaws',
  'The Green Mile',
  'Saving Private Ryan',
  'Heat',
  'Casino Royale',
  'Skyfall',
  'The Hunger Games',
  'Twilight',
  'Frozen',
  'Toy Story',
  'Coco',
  'Inside Out',
  'The Incredibles',
  'Shrek',
  'How to Train Your Dragon',
  'Mamma Mia!',
  'Bohemian Rhapsody',
  'A Beautiful Mind',
];

const expandedSeriesTitles = [
  'The X-Files',
  'The West Wing',
  'The Marvelous Mrs. Maisel',
];

const expandedStudioIds = [
  'SONY_PICTURES',
  'LIONSGATE',
  'MGM',
  'DREAMWORKS',
  'PIXAR',
  'SEARCHLIGHT',
  'AMAZON_STUDIOS',
];

const allFamousTitles = [...FAMOUS_MOVIE_DB, ...FAMOUS_SERIES_DB].map(project => project.title);
assert.equal(new Set(allFamousTitles).size, allFamousTitles.length, 'Famous project titles should remain unique.');

for (const title of expandedMovieTitles) {
  assert(FAMOUS_MOVIE_DB.some(project => project.title === title), `Famous movie expansion should include ${title}.`);
}

for (const title of expandedSeriesTitles) {
  assert(FAMOUS_SERIES_DB.some(project => project.title === title), `Famous series expansion should include ${title}.`);
}

assert(expandedMovieTitles.length + expandedSeriesTitles.length >= 20, 'Famous expansion should add at least 20 projects.');
assert(expandedMovieTitles.length + expandedSeriesTitles.length <= 30, 'Famous expansion should stay within the requested 20-30 project slice.');

for (const studioId of expandedStudioIds) {
  assert(STUDIO_CATALOG[studioId], `Studio catalog should include ${studioId}.`);
  assert(studioSource.includes(`${studioId}:`), `Studio source should define ${studioId}.`);
  assert(typesSource.includes(`${studioId}: { id: '${studioId}'`), `Initial world studios should include ${studioId}.`);
  assert(
    famousSource.includes(`studioId: "${studioId}"`) || famousSource.includes(`studioId: '${studioId}'`),
    `Famous project expansion should use ${studioId}.`,
  );
}

assert(expandedStudioIds.length >= 5 && expandedStudioIds.length <= 8, 'Studio expansion should add 5-8 unique famous studios.');

console.log('Famous catalog expansion audit passed.');
