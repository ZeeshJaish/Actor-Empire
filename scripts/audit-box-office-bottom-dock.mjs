import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');

[
  'BoxOfficeSection',
  'section, setSection',
  'BOX_OFFICE_SECTIONS',
  'renderBottomDock',
  'renderWeeklyPage',
  'renderAllTimePage',
  'renderPartnersPage',
  'renderRecordsPage',
  "section === 'LIVE'",
  'pb-28'
].forEach(token => {
  assert(source.includes(token), `Box Office bottom dock slice should include ${token}.`);
});

assert(
  source.includes('Live') &&
    source.includes('Weekly') &&
    source.includes('All-Time') &&
    source.includes('Partners') &&
    source.includes('Records'),
  'Bottom dock should expose the five planned Box Office sections.'
);

assert(
  source.includes('aria-label={`Open ${item.label} box office section`}') ||
    source.includes('aria-label={'),
  'Bottom dock buttons should have accessible labels.'
);

console.log('Box Office bottom dock audit passed.');
