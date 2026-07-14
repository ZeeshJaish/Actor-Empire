import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const boxOfficeSource = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const gameLoopSource = fs.readFileSync('services/gameLoop.ts', 'utf8');
const releaseWizardSource = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const packageJson = fs.readFileSync('package.json', 'utf8');

assert(
  /const getStreamingRegionTotals[\s\S]*label:\s*getBoxOfficeRegionLabel\(language,\s*region\.regionId\s+as\s+BoxOfficeRegionId\)/.test(boxOfficeSource) &&
    /const getStreamingRegionTotals[\s\S]*shortLabel:\s*getBoxOfficeRegionShortLabel\(language,\s*region\.regionId\s+as\s+BoxOfficeRegionId\)/.test(boxOfficeSource),
  'Streaming regional rows should use localized region labels instead of raw blank breakdown labels.'
);

assert(
  gameLoopSource.includes('weeksInTheaters: newWeeklyGross.length'),
  'Game loop should keep live theatrical week count current for streaming presales.'
);

assert(
  releaseWizardSource.includes('release.weeklyGross?.length || 0') &&
    releaseWizardSource.includes('Math.max(0, release.weekNum - 1)'),
  'Streaming presales should calculate remaining theatrical weeks from actual recorded run progress.'
);

assert(
  releaseWizardSource.includes('cashReserve = Math.max(0, platformState.cashReserve - totalCost)'),
  'Accepting a streaming deal should not drive platform cash reserve below zero.'
);

assert(
  (gameLoopSource.match(/cashReserve = Math\.max\(0, platform\.cashReserve - cost\)/g) || []).length >= 2,
  'Automatic streaming acquisitions should not drive platform cash reserve below zero.'
);

assert(
  packageJson.includes('audit:streaming-release-path'),
  'package.json should expose the streaming release path audit.'
);

console.log('Streaming release path audit passed.');
