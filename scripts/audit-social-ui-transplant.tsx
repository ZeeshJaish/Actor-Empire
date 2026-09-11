import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Relationship } from '../types';
import { buildSocialUiModel } from '../services/socialUiAdapter';
import { SocialPage } from '../views/SocialPage';

const relationship = (overrides: Partial<Relationship>): Relationship => ({
  id: 'contact',
  name: 'Contact',
  relation: 'Friend',
  closeness: 50,
  image: '',
  lastInteractionWeek: 1,
  ...overrides,
} as Relationship);

const player = {
  ...INITIAL_PLAYER,
  name: 'Social Tester',
  age: 30,
  currentWeek: 10,
  money: 20_000,
  energy: { current: 70, max: 100 },
  relationships: [
    relationship({ id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: 55, lastInteractionWeek: 2 }),
    relationship({ id: 'partner', name: 'Sam', relation: 'Partner', closeness: 92, lastInteractionWeek: 9 }),
    relationship({ id: 'pet', name: 'Pixel', relation: 'Pet', closeness: 71, petSpecies: 'Dog', petEmoji: '🐕', petRarity: 'common' }),
  ],
};

const model = buildSocialUiModel(player);
assert.equal(model.people.length, 3);
assert.ok(Array.isArray(model.careerMembers), 'The transplant must preserve dynasty career records.');
assert.equal(model.people.find(person => person.id === 'rel_mom')?.lastTouchWeeks, 8);
assert.ok(model.people.find(person => person.id === 'rel_mom')?.moves.some(move => move.action === 'FAMILY_DINNER'));
assert.ok(model.people.find(person => person.id === 'partner')?.moves.some(move => move.action === 'DATE'));
assert.ok(model.people.find(person => person.id === 'partner')?.moves.some(move => move.action === 'BREAK_UP'));
assert.ok(model.people.find(person => person.id === 'pet')?.moves.some(move => move.action === 'PET_FEED'));

const html = renderToStaticMarkup(
  <SocialPage player={player} onInteract={() => undefined} onContinueAsChild={() => undefined} />,
);

assert.match(html, /data-ui="actor-empire-social-overhaul"/);
assert.match(html, />Connections</);
assert.match(html, />Mom</);
assert.match(html, />Sam</);
assert.match(html, />Pixel</);
assert.doesNotMatch(html, /Primary game navigation/, 'Social must use the app-level bottom navigation only.');

console.log('Social UI transplant audit passed.');
