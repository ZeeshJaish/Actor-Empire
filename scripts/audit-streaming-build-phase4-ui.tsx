import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BUILD_STAGES } from '../components/studio-finance/finance/build';

assert.deepEqual(
  BUILD_STAGES.map(stage => stage.id),
  ['network', 'money', 'test', 'launch'],
  'Build must expose one region-first four-stage flow.',
);

const buildContract = readFileSync('components/studio-finance/finance/build.ts', 'utf8');
const adapter = readFileSync('components/streaming-transplant/StreamingBuildWizardExperience.tsx', 'utf8');
const moneyStage = readFileSync('components/studio-finance/components/build/StageMoney.tsx', 'utf8');
const motion = readFileSync('components/studio-finance/components/build/motion.ts', 'utf8');
const regionBoard = readFileSync('components/studio-finance/components/build/RegionBoard.tsx', 'utf8');
const testStage = readFileSync('components/studio-finance/components/build/StageTest.tsx', 'utf8');
const launchStage = readFileSync('components/studio-finance/components/build/StageLaunch.tsx', 'utf8');

assert.match(buildContract, /quote\?: \(draft: BuildDraft\) => StreamingNetworkQuote/,
  'The imported UI contract must expose the canonical network quote.');
assert.match(adapter, /quote: \(draft: BuildDraft\) => projectionFor\(draft\)\.build\.quote/,
  'The career adapter must supply the canonical quote for every draft.');
assert.match(moneyStage, /data\.canonical\?\.quote\?\.\(build\)/,
  'The Money comparison must read the canonical quote rather than maintaining a second bill.');
assert.match(motion, /Math\.max\(0, Math\.min\(1,/,
  'Animated Build figures must clamp their first frame so counters never flash below zero.');
assert.match(regionBoard, /OPEN_TIERS/,
  'The Network stage must expose all canonical server-tier controls.');
assert.match(regionBoard, /Cloud provider/,
  'The Network stage must expose canonical cloud-provider controls.');
assert.match(regionBoard, /Where they landed/i,
  'Deterministic city and facility placement must remain inspectable.');
assert.match(testStage, /Test the load/i,
  'The player-run rehearsal CTA must remain present.');
assert.match(launchStage, /Before you sign/i,
  'Launch must expose one commissioning-readiness record.');

for (const deleted of [
  'StageSites.tsx',
  'StagePlans.tsx',
  'TeamPlanningCinematic.tsx',
  'RackWall.tsx',
  'CityScene.tsx',
]) {
  assert.equal(
    existsSync(`components/studio-finance/components/build/${deleted}`),
    false,
    `${deleted} is superseded and must not leave a hidden second Build flow.`,
  );
}

console.log('Streaming Build Phase 4 UI audit passed.');
