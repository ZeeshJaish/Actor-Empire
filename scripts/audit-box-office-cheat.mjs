import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const home = fs.readFileSync('views/HomePage.tsx', 'utf8');
const app = fs.readFileSync('App.tsx', 'utf8');
const mobile = fs.readFileSync('views/mobile/MobilePage.tsx', 'utf8');

assert(
  home.includes('triggerBoxOfficeDepthQa'),
  'HomePage should expose a dedicated Box Office QA cheat action.'
);
assert(
  home.includes('calculateTheatricalDistributionBreakdown') &&
    home.includes('calculateStreamingDistributionBreakdown'),
  'Box Office QA cheat should seed releases through the real distribution calculators.'
);
assert(
  home.includes('weeklyDistributionBreakdowns') &&
    home.includes('weeklyStreamingBreakdowns') &&
    home.includes('totalStudioReceipts') &&
    home.includes('totalExhibitorReceipts'),
  'Box Office QA cheat should prefill detailed theatrical and streaming receipt data.'
);
assert(
  home.includes('releaseRegionIds') &&
    home.includes('releaseChainSelections') &&
    home.includes('BOX OFFICE DETAIL QA'),
  'Box Office QA cheat should include region and cinema partner data for detail testing.'
);
assert(
  home.includes('onOpenBoxOfficeCheat?.()') &&
    app.includes('initialMobileAppMode') &&
    mobile.includes("props.initialAppMode === 'BOXOFFICE'"),
  'Box Office QA cheat should navigate directly into the Box Office app.'
);

console.log('Box Office cheat audit passed.');
