import fs from 'node:fs';

const source = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');

const requiredTokens = [
  'BoxOfficeDetailTab',
  'DETAIL_TABS',
  'detailTab, setDetailTab',
  'renderDetailTabs',
  'renderOverviewTab',
  'renderWeeklyTab',
  'renderRegionsTab',
  'renderPartnersTab',
  'Overview',
  'Weekly',
  'Regions',
  'Partners'
];

const missing = requiredTokens.filter(token => !source.includes(token));
if (missing.length > 0) {
  throw new Error(`BoxOffice detail tabs missing: ${missing.join(', ')}`);
}

const openResetCount = (source.match(/setDetailTab\('OVERVIEW'\)/g) || []).length;
if (openResetCount < 3) {
  throw new Error('Opening BoxOffice releases should reset the detail tabs to Overview from live and weekly entries.');
}

if (!source.includes('detailTab === item.id')) {
  throw new Error('Detail tab buttons must render active state from detailTab.');
}

if (!source.includes("detailTab === 'OVERVIEW'") || !source.includes("detailTab === 'WEEKLY'") || !source.includes("detailTab === 'REGIONS'") || !source.includes("detailTab === 'PARTNERS'")) {
  throw new Error('Detail view must conditionally render every detail tab.');
}

if (!pkg.includes('audit:box-office-detail-tabs')) {
  throw new Error('package.json missing audit:box-office-detail-tabs script.');
}

console.log('BoxOffice detail tabs audit passed.');
