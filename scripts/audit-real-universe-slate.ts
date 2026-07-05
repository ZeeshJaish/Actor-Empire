import assert from 'node:assert/strict';
import { generateDirectEntryOffer, initUniverses } from '../services/universeLogic';
import { Player, UniverseId } from '../types';

const player = {
    gender: 'MALE',
    currentWeek: 12,
    stats: { fame: 82 }
} as unknown as Player;

const requiredUniverses: Array<{
    id: UniverseId;
    name: string;
    expectedTitle: string;
}> = [
    { id: 'AVATAR', name: 'Avatar', expectedTitle: 'Avatar: Fire and Ash' },
    { id: 'MONSTERVERSE', name: 'Monsterverse', expectedTitle: 'Godzilla x Kong: Supernova' },
    { id: 'JURASSIC', name: 'Jurassic World', expectedTitle: 'Jurassic World Rebirth' },
    { id: 'SPIDER_VERSE', name: 'Spider-Verse', expectedTitle: 'Spider-Man: Beyond the Spider-Verse' },
    { id: 'FAST_SAGA', name: 'Fast Saga', expectedTitle: 'Fast X: Part 2' }
];

const universes = initUniverses('en');

for (const universeConfig of requiredUniverses) {
    const universe = universes[universeConfig.id];
    assert.ok(universe, `${universeConfig.id} should be seeded for new and migrated saves`);
    assert.equal(universe.name, universeConfig.name);
    assert.ok(universe.roster.length >= 3, `${universeConfig.id} should have enough roles for offers`);
    assert.ok(universe.brandPower > 0, `${universeConfig.id} should have franchise weight`);

    const offer = generateDirectEntryOffer(player, universeConfig.id);
    assert.equal(offer.universeId, universeConfig.id);
    assert.ok(offer.films.length >= 2, `${universeConfig.id} should produce a multi-film roadmap`);
    assert.ok(
        offer.films.some(film => film.title === universeConfig.expectedTitle),
        `${universeConfig.id} offer should include ${universeConfig.expectedTitle}`
    );
}

console.log('Real universe slate audit passed.');
