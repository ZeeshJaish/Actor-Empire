import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const gameLoop = fs.readFileSync('services/gameLoop.ts', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');
const distribution = fs.readFileSync('services/distributionRevenue.ts', 'utf8');

[
  'selectedReleaseId',
  'renderDetailView',
  'Box Office Detail',
  'Streaming Detail',
  'Distribution',
  'Regions',
  'Cinema Partners',
  'Weekly Trend',
  'Studio Receipts',
  'Partner Cut',
  'Per Screen',
  'Streaming Regions',
  'getTheatricalRegionTotals',
  'getTheatricalChainTotals',
  'getStreamingRegionTotals',
  'CinemaChainLogo',
  'ChevronRight'
].forEach(token => {
  assert(source.includes(token), `Box Office detail UI should include ${token}.`);
});

assert(
  source.includes('setSelectedReleaseId(rel.id)') &&
    source.includes('setSelectedReleaseId(null)'),
  'Box Office cards should open a detail view and detail view should return to the list.'
);
assert(
  source.includes('weeklyDistributionBreakdowns') &&
    source.includes('weeklyStreamingBreakdowns'),
  'Box Office detail should read persisted theatrical and streaming breakdowns.'
);
assert(
  distribution.includes('calculateStreamingDistributionBreakdown') &&
    gameLoop.includes('calculateStreamingDistributionBreakdown') &&
    gameLoop.includes('weeklyStreamingBreakdowns'),
  'Streaming weekly logic should persist regional streaming breakdowns.'
);
assert(
  /interface StreamingDistributionBreakdown/.test(types) &&
    /weeklyStreamingBreakdowns\?:\s*StreamingDistributionBreakdown\[\]/.test(types),
  'Types should expose streaming regional breakdowns on active releases.'
);

console.log('Box Office depth UI audit passed.');
