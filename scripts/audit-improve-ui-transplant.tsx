import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Commitment } from '../types';
import { buildImproveUiModel } from '../services/improveUiAdapter';
import { ImprovePage } from '../views/ImprovePage';
import { BASE_CSS } from '../components/ui-overhaul/theme';

const activeCourse: Commitment = {
  id: 'course-live-1',
  name: 'Intro to Acting',
  nameKey: 'improve.workshop.ws_intro_acting',
  type: 'COURSE',
  energyCost: 15,
  income: 0,
  weeklyCost: 0,
  upfrontCost: 400,
  totalDuration: 4,
  weeksCompleted: 2,
  skillGains: { discipline: 0.2, memorization: 0.2 },
  payoutType: 'WEEKLY',
};

const player = {
  ...INITIAL_PLAYER,
  name: 'Improve Tester',
  money: 12_345,
  energy: { current: 58, max: 58 },
  flags: {
    ...INITIAL_PLAYER.flags,
    weeklyBaseEnergyRemaining: 58,
    bonusEnergyBank: 0,
  },
  stats: {
    ...INITIAL_PLAYER.stats,
    health: 77,
    body: 63,
    happiness: 73,
    looks: 61,
    skills: {
      ...INITIAL_PLAYER.stats.skills,
      charisma: 44,
      presence: 52,
      delivery: 37,
      memorization: 68,
      expression: 49,
      improvisation: 31,
      discipline: 56,
    },
    genreXP: { ...INITIAL_PLAYER.stats.genreXP, ACTION: 17, DRAMA: 92 },
  },
  writerStats: { creativity: 32, dialogue: 41, structure: 55, pacing: 38 },
  directorStats: { vision: 61, technical: 47, leadership: 53, style: 66 },
  commitments: [
    activeCourse,
    {
      id: 'acting-gig', name: 'A Movie', type: 'ACTING_GIG' as const,
      energyCost: 80, income: 0, payoutType: 'LUMPSUM' as const,
    },
  ],
};

const model = buildImproveUiModel(player);
assert.equal(model.title, 'Self Improvement');
assert.equal(model.availableEnergy, 58);
assert.equal(model.committedEnergy, 15, 'Acting gigs must not consume passive weekly capacity.');
assert.equal(model.capacityFree, 85);
assert.equal(model.money, 12_345);
assert.deepEqual(model.condition.map(item => [item.key, item.value]), [
  ['health', 77], ['physique', 63], ['mood', 73], ['looks', 61],
]);
assert.equal(model.disciplines.length, 3);
assert.equal(model.skillGroups.length, 3);
assert.equal(model.venues[0].actions[0].request.category, 'BODY');
assert.equal(model.venues[0].actions[0].request.option.energyCost, 15);
assert.equal(model.courses.find(course => course.catalogId === 'ws_intro_acting')?.activeCommitmentId, 'course-live-1');
assert.equal(model.courses.find(course => course.catalogId === 'ws_intro_acting')?.weeksCompleted, 2);
assert.equal(model.genres.find(genre => genre.genre === 'ACTION')?.points, 17);
assert.equal(model.genres.find(genre => genre.genre === 'DRAMA')?.points, 92);
assert.equal(model.genres.length, 17, 'The overhaul must render the complete real genre catalog.');

const html = renderToStaticMarkup(
  <ImprovePage
    player={player}
    onTrain={() => undefined}
    onEnroll={() => undefined}
    onCancel={() => undefined}
    onPerformAction={() => undefined}
  />,
);

assert.match(html, /data-ui="actor-empire-improve-overhaul"/);
assert.match(html, />Self Improvement</);
assert.match(html, />58E/);
assert.match(html, />15E committed/);
assert.match(html, />Intro to Acting</);
assert.match(html, />2 \/ 4 weeks/);
assert.doesNotMatch(html, /Primary game navigation/, 'Improve must use the app-level bottom navigation only.');
assert.match(BASE_CSS, /padding:max\(20px,calc\(15px \+ env\(safe-area-inset-top\)\)\)/);

console.log('Improve UI transplant audit passed.');
