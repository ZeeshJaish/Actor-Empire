import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipe, enumerateRecipes, encodeRecipe, decodeRecipe } from './appearance.mjs';

const example = { version: 1, face: 'tapered', hair: 'swept', brows: 'arched' };

test('saved appearance survives JSON round trip without losing selected parts', () => {
  assert.deepEqual(decodeRecipe(encodeRecipe(example)), example);
});

test('malformed or future appearance saves are rejected instead of silently replacing identity', () => {
  for (const bad of ['no json', 'null', '[]', '{"version":2}', '{"version":1,"face":"missing","hair":"bald","brows":"straight"}']) {
    assert.throws(() => decodeRecipe(bad));
  }
});

test('partial UI selection fills missing parts but preserves valid choices', () => {
  assert.deepEqual(normalizeRecipe({ hair: 'swept' }), { version: 1, face: 'square', hair: 'swept', brows: 'straight' });
});

test('every independent face, hair and brow choice can be selected exactly once', () => {
  const recipes = enumerateRecipes();
  assert.equal(recipes.length, 27);
  const found = new Set(recipes.map(r => `${r.face}/${r.hair}/${r.brows}`));
  assert.equal(found.size, 27);
  for (const face of ['square', 'round', 'tapered'])
    for (const hair of ['bald', 'crop', 'swept'])
      for (const brows of ['straight', 'angled', 'arched'])
        assert.ok(found.has(`${face}/${hair}/${brows}`), `${face}/${hair}/${brows} missing`);
});
