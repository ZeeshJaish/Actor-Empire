import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const packageJson = fs.readFileSync('package.json', 'utf8');

[
  'WeeklyChartEntry',
  'getCommittedCinemaChartRows',
  'getRankMovementLabel',
  'getWeeklyStatusTag',
  "tr('box.top10Gross')",
  "tr('box.marketRank'",
  "tr('box.metric.studioReceipts')",
  "tr('box.runWeekShort')",
  "tr('box.rankHold')",
  "tr('box.status.breakout')",
  "tr('box.status.heavyDrop')",
  "tr('box.status.sleeper')",
  "tr('box.status.blockbuster')",
  "tr('box.status.flopWatch')"
].forEach(token => {
  assert(source.includes(token), `Weekly market chart should include ${token}.`);
});

assert(
  /slice\(0,\s*10\)/.test(source),
  'Weekly market chart should cap the visible market to the top 10.'
);

assert(
  source.includes('committed.rows') && source.includes('committed.previousRanks'),
  'Weekly chart uses committed owner rows and the entire previous committed slate.'
);

assert(
  packageJson.includes('audit:box-office-weekly-chart'),
  'package.json should expose the weekly chart audit.'
);

assert(!source.includes('getSimulatedMarketEntries') && !source.includes('getOutsideProducerWeeklyEntries'),'Invented NPC or investment ticket curves cannot return.');
console.log('Box Office committed weekly chart audit passed.');
