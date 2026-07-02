import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const packageJson = fs.readFileSync('package.json', 'utf8');

[
  'WeeklyChartEntry',
  'SIMULATED_WEEKLY_MARKET',
  'getSimulatedMarketEntries',
  'getRankMovementLabel',
  'getWeeklyStatusTag',
  'Top 10',
  'Market Rank',
  'Studio Receipts',
  'Run W',
  'HOLD',
  'Breakout',
  'Heavy Drop',
  'Sleeper',
  'Blockbuster',
  'Flop Watch'
].forEach(token => {
  assert(source.includes(token), `Weekly market chart should include ${token}.`);
});

assert(
  /slice\(0,\s*10\)/.test(source),
  'Weekly market chart should cap the visible market to the top 10.'
);

assert(
  source.includes("source: 'PLAYER'") && source.includes("source: 'MARKET'"),
  'Weekly market chart should mix player releases with simulated market releases.'
);

assert(
  packageJson.includes('audit:box-office-weekly-chart'),
  'package.json should expose the weekly chart audit.'
);

console.log('Box Office weekly chart audit passed.');
