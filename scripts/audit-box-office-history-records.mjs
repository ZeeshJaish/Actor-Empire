import fs from 'node:fs';

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');

const required = [
  'BoxOfficeAllTimeMode',
  'ALL_TIME_MODES',
  'allTimeMode, setAllTimeMode',
  'getBoxOfficeArchiveEntries',
  'getAllTimeEntries(allTimeMode)',
  'ALL_TIME_PAGE_SIZE = 10',
  'allTimeVisibleCount, setAllTimeVisibleCount',
  'visibleEntries = entries.slice(0, allTimeVisibleCount)',
  "setAllTimeVisibleCount(ALL_TIME_PAGE_SIZE)",
  "setAllTimeVisibleCount(current => Math.min(entries.length, current + ALL_TIME_PAGE_SIZE))",
  "box.allTime.showMore",
  'box.records.topWorldwide',
  'box.metric.studioReceipts',
  'box.records.bestRoi',
  'box.records.biggestOpening',
  'box.records.streamingHits',
  'box.records.historyIncluded',
  'box.records.sleeperHit',
  'box.records.weekTwoHold',
  'box.records.topRegion',
  'box.records.bestPartner',
  'box.records.biggestFlop'
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

if (!source.includes("handleSectionChange(item.id)") || !source.includes("nextSection === 'ALL_TIME'")) {
  throw new Error('Returning to All-Time should reset progressive reveal to the first page.');
}

if (!pkg.includes('audit:box-office-history-records')) {
  throw new Error('package.json missing audit:box-office-history-records script.');
}

console.log('BoxOffice history and records audit passed.');
