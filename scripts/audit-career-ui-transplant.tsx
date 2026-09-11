import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Commitment } from '../types';
import { buildCareerUiModel } from '../services/careerUiAdapter';
import { CareerPage } from '../views/CareerPage';
import { BASE_CSS } from '../components/ui-overhaul/theme';
import CareerScreen from '../components/ui-overhaul/CareerScreen';

const commitments: Commitment[] = [
  {
    id: 'audition-1',
    name: 'Neon Hearts',
    type: 'ACTING_GIG',
    roleType: 'LEAD',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectPhase: 'AUDITION',
    phaseWeeksLeft: 2,
    auditionPerformance: 44,
  },
  {
    id: 'promo-1',
    name: 'Last Light',
    type: 'ACTING_GIG',
    roleType: 'SUPPORTING',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectPhase: 'POST_PRODUCTION',
    phaseWeeksLeft: 6,
    promotionalBuzz: 61,
    lastPressAbsolute: (27 * 52) + 11,
  },
  {
    id: 'slate-1',
    name: 'Tomorrow City',
    type: 'ACTING_GIG',
    roleType: 'CAMEO',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectPhase: 'SCHEDULED',
    phaseWeeksLeft: 30,
    projectDetails: { subtype: 'FEATURE_FILM' } as unknown as Commitment['projectDetails'],
  },
];

const player = {
  ...INITIAL_PLAYER,
  name: 'Career Tester',
  age: 27,
  currentWeek: 12,
  energy: { current: 64, max: 100 },
  commitments,
  applications: [{ id: 'app-1', type: 'AUDITION' as const, name: 'Blue Hour', weeksRemaining: 3, data: {} }],
  pastProjects: [{ id: 'credit-1', type: 'ACTING_GIG' } as (typeof INITIAL_PLAYER.pastProjects)[number]],
};

const model = buildCareerUiModel(player);
assert.equal(model.title, 'Career Profile');
assert.equal(model.reputation, player.stats.reputation);
assert.equal(model.credits, 1);
assert.equal(model.energy, 64);
assert.deepEqual(model.projects.map(project => project.stage), ['audition', 'promo', 'upcoming']);
assert.equal(model.projects[0].primaryAction?.handlerId, 'audition-1');
assert.deepEqual(
  model.projects[1].promo?.map(move => move.handlerId),
  ['PROMO_IG_promo-1', 'PROMO_X_promo-1', 'PROMO_PRESS_promo-1'],
);
assert.equal(model.projects[1].promo?.[2].disabled, true, 'Press cooldown must remain enforced.');
assert.deepEqual(model.applications, [{ id: 'app-1', title: 'Blue Hour', weeks: 3 }]);

const html = renderToStaticMarkup(
  <CareerPage
    player={player}
    onQuitJob={() => undefined}
    onRehearse={() => undefined}
    onOwnedProductionFocus={() => undefined}
  />,
);

assert.match(html, /data-ui="actor-empire-career-overhaul"/);
assert.match(html, />Career Tester</);
assert.match(html, />Neon Hearts</);
assert.match(html, />Last Light</);
assert.match(html, />Tomorrow City</);
assert.match(html, />Blue Hour</);
assert.doesNotMatch(html, /Primary game navigation/, 'Career must use the app-level bottom navigation only.');
assert.match(BASE_CSS, /padding:max\(20px,calc\(15px \+ env\(safe-area-inset-top\)\)\)/);

const emptyHtml = renderToStaticMarkup(
  <CareerScreen
    title="Career Profile"
    playerName="Empty Tester"
    reputation={0}
    credits={0}
    energy={100}
    projects={[]}
    applications={[]}
    productions={[]}
    onProjectAction={() => undefined}
    onProductionTask={() => undefined}
  />,
);
assert.match(emptyHtml, /Nothing in the pipeline/);

const ownedHtml = renderToStaticMarkup(
  <CareerScreen
    title="Career Profile"
    playerName="Studio Tester"
    reputation={70}
    credits={4}
    energy={5}
    projects={[]}
    applications={[]}
    productions={[{
      id: 'owned-1', title: 'Midnight Run', studio: 'Player Pictures', phase: 'PREP',
      week: 2, weeks: 20, phaseWeek: 1, phaseWeeks: 3, focusLoad: 1.5, focusLeft: 12,
      polish: 4, polishMax: 15, quality: 62,
      tracks: [{
        type: 'ACTING', label: 'Acting', progress: 44, color: 'var(--health)', icon: 'camera',
        tasks: [{ id: 'ACTOR_PREP', label: 'Table Read', energy: 8, handlerId: 'ACTOR_PREP' }],
      }],
    }]}
    onProjectAction={() => undefined}
    onProductionTask={() => undefined}
  />,
);
assert.match(ownedHtml, /OWNED WORK/);
assert.match(ownedHtml, /NEED 8E/);
assert.match(ownedHtml, /aria-label="Owned production Acting Table Read"/);
assert.match(ownedHtml, /data-owned-production-card="compact"/);

console.log('Career UI transplant audit passed.');
