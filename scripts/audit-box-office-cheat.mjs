import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const home = fs.readFileSync('views/HomePage.tsx', 'utf8');
const boxOfficeQa = fs.readFileSync('views/home/homeBoxOfficeQaActions.ts', 'utf8');
const homeQaSource = `${home}\n${boxOfficeQa}`;
const app = fs.readFileSync('App.tsx', 'utf8');
const mobile = fs.readFileSync('views/mobile/MobilePage.tsx', 'utf8');

assert(
  homeQaSource.includes('triggerBoxOfficeDepthQa'),
  'HomePage should expose a dedicated Box Office QA cheat action.'
);
assert(
  homeQaSource.includes('calculateTheatricalDistributionBreakdown') &&
    homeQaSource.includes('calculateStreamingDistributionBreakdown'),
  'Box Office QA cheat should seed releases through the real distribution calculators.'
);
assert(
  homeQaSource.includes('weeklyDistributionBreakdowns') &&
    homeQaSource.includes('weeklyStreamingBreakdowns') &&
    homeQaSource.includes('totalStudioReceipts') &&
    homeQaSource.includes('totalExhibitorReceipts'),
  'Box Office QA cheat should prefill detailed theatrical and streaming receipt data.'
);
assert(
    homeQaSource.includes('releaseRegionIds') &&
    homeQaSource.includes('releaseChainSelections') &&
    homeQaSource.includes('Box Office Detail QA'),
  'Box Office QA cheat should include region and cinema partner data for detail testing.'
);
assert(
  homeQaSource.includes('onOpenBoxOfficeCheat?.()') &&
    app.includes('initialMobileAppMode') &&
    mobile.includes("props.initialAppMode === 'BOXOFFICE'"),
  'Box Office QA cheat should navigate directly into the Box Office app.'
);
assert(
  homeQaSource.includes('triggerBoxOfficeArchiveQa') &&
    homeQaSource.includes('Box Office Archive QA (12 Runs)') &&
    homeQaSource.includes("const archiveScenarios = [") &&
    homeQaSource.includes('CHEAT: 12 completed theatrical runs added') &&
    homeQaSource.includes('isQaArchive: true') &&
    homeQaSource.includes('earnings: 0'),
  'Box Office archive QA should seed twelve completed theatrical archive runs.'
);
const archiveQaStart = homeQaSource.indexOf('const archiveScenarios = [');
const archiveQaEnd = homeQaSource.indexOf('const archivedProjects = archiveScenarios.map', archiveQaStart);
const archiveQaScenarioCount = (homeQaSource.slice(archiveQaStart, archiveQaEnd).match(/\{ id: '/g) || []).length;
assert(
  archiveQaScenarioCount === 12,
  `Box Office archive QA should contain exactly 12 completed runs; found ${archiveQaScenarioCount}.`
);
assert(
  homeQaSource.includes('weeklyDistributionBreakdowns') &&
    homeQaSource.includes('theatricalExtensionHistory') &&
    homeQaSource.includes('releaseChainSelections'),
  'Archived QA runs should retain region/chain detail and extension history.'
);

console.log('Box Office cheat audit passed.');
