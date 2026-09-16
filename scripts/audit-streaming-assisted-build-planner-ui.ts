import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sites = readFileSync('components/studio-finance/components/build/StageSites.tsx', 'utf8');
const wizard = readFileSync('components/studio-finance/components/build/BuildWizard.tsx', 'utf8');
const cinematic = readFileSync('components/studio-finance/components/build/TeamPlanningCinematic.tsx', 'utf8');
const buildStyles = readFileSync('components/studio-finance/styles/build.css', 'utf8');

for (const copy of [
  'Build allocation',
  'Custom allocation',
  'Opening markets have not been chosen',
  'Ask the team to prepare a plan',
  'Approve plan',
  'Approval applies the drawing only',
]) assert.ok(sites.includes(copy), `Sites is missing: ${copy}`);

assert.ok(sites.includes('createBuildTeamProposal'), 'Sites must call the canonical assisted planner.');
assert.equal(sites.includes('Quick-start network'), false, 'Hands-On mode must not duplicate the world map with network presets.');
assert.equal(sites.includes('className="lw-regions"'), false, 'Hands-On mode must use the world map as its only region selector.');
assert.ok(sites.includes('showNetworkRoutes'), 'The Build map must connect active infrastructure sites.');
assert.equal(sites.includes('Math.round(racks / picks.length)'), false, 'The lossy legacy rack splitter must remain removed.');

for (const copy of ['Managed by your team', 'Take control']) {
  assert.ok(wizard.includes(copy), `Managed stage shell is missing: ${copy}`);
}
assert.equal(wizard.includes('bw-budget-trail'), false, 'The oversized six-cell budget grid must stay removed.');
assert.equal(wizard.includes('bw-assisted-status'), false, 'The top money card must not duplicate assisted-plan details.');
assert.equal(wizard.includes('money(plan.headroom)'), false, 'The top money card must not add a normal-state headroom sentence.');

for (const copy of ['Mapping the opening', 'Placing the network', 'Racking the rooms', 'Clearing the allocation', 'Rehearsing the crowd', 'Plan ready']) {
  assert.ok(cinematic.includes(copy), `Planning cinematic is missing: ${copy}`);
}
assert.ok(cinematic.includes('<WorldMap'), 'Planning cinematic must reuse the geographical Build world map.');
assert.ok(cinematic.includes('<RackWall'), 'Planning cinematic must reuse the game rack wall.');
assert.ok(cinematic.includes('1_050'), 'Each planning beat must remain visible long enough to read.');
assert.ok(cinematic.includes('6_800'), 'Planning cinematic must hold the full operations sequence and final result on screen.');
assert.ok(buildStyles.includes('.bw-team-cine-map .interactive-region-map'), 'The geographical map must receive a visible cinematic layout.');
assert.equal(cinematic.includes('bw-team-cine-card'), false, 'Planning cinematic must not render a floating card.');
assert.equal(cinematic.toLowerCase().includes('skip'), false, 'The planning cinematic must not expose a skip path.');

console.log('Streaming assisted Build planner UI audit passed.');
