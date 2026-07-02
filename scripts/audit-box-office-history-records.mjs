import fs from 'node:fs';

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');

const required = [
  'BoxOfficeAllTimeMode',
  'ALL_TIME_MODES',
  'allTimeMode, setAllTimeMode',
  'getBoxOfficeArchiveEntries',
  'getAllTimeEntries(allTimeMode)',
  'Top Worldwide',
  'Studio Receipts',
  'Best ROI',
  'Biggest Opening',
  'Streaming Hits',
  'History Included',
  'Sleeper Hit',
  'Week-Two Hold',
  'Top Region',
  'Best Partner',
  'Biggest Flop'
];

const missing = required.filter(token => !source.includes(token));
if (missing.length > 0) {
  throw new Error(`BoxOffice history/records missing: ${missing.join(', ')}`);
}

if (!source.includes('player.pastProjects') || !source.includes("source: 'HISTORY'")) {
  throw new Error('BoxOffice archive must include completed player history entries.');
}

if (!source.includes('setAllTimeMode(mode.id)')) {
  throw new Error('All-Time page needs selectable category modes.');
}

if (!pkg.includes('audit:box-office-history-records')) {
  throw new Error('package.json missing audit:box-office-history-records script.');
}

console.log('BoxOffice history and records audit passed.');
