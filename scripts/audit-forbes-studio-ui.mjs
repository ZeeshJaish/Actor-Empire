import { existsSync, readFileSync } from 'node:fs';

const app = readFileSync('views/mobile/ForbesApp.tsx', 'utf8');
const mobileShell = readFileSync('views/mobile/MobilePage.tsx', 'utf8');
const legacyMobileShell = readFileSync('views/MobilePage.tsx', 'utf8');
const profilePath = 'views/mobile/components/ForbesStudioProfile.tsx';
const profile = existsSync(profilePath) ? readFileSync(profilePath, 'utf8') : '';
const positionPath = 'views/mobile/components/ForbesCompanyPosition.tsx';
const position = existsSync(positionPath) ? readFileSync(positionPath, 'utf8') : '';
const ownership = readFileSync('services/forbesOwnershipDiscovery.ts', 'utf8');
const failures = [];

for (const required of [
  'selectedStudioProfile',
  'buildForbesStudioProfile',
  'Open studio profile',
  'ForbesStudioProfile',
]) {
  if (!app.includes(required)) failures.push(`Forbes studio selection is missing: ${required}`);
}

for (const required of [
  'role="dialog"',
  'Company Intelligence',
  'Studio Intelligence',
  'Company Profile',
  'Market Rank',
  'max-w-full',
  'Strategic Assets',
  'Rights &amp; IP',
  'Franchises',
  'Universes',
  'Facilities',
  'Key Talent',
  'Forbes estimate',
  'Save data',
  'Ownership Command',
  'Monitor Studio',
  'Express Interest',
  'View Investment Opportunity',
  'Prepare Acquisition',
  'ownershipCommandFeedback',
  'onOwnershipCommand',
  'Financial Command',
  'Performance Record',
  'Catalog Intelligence',
  'Management Style',
  'Ownership',
  'Acquisition State',
  'Close studio profile',
  'Approach Studio',
]) {
  if (!`${profile}\n${ownership}\n${position}`.includes(required)) failures.push(`Forbes studio profile is missing: ${required}`);
}

if (!app.includes('applyForbesOwnershipDiscovery')) failures.push('Forbes ownership discovery service is not wired into ForbesApp.');
for (const required of [
  'Your Position',
  'No Current Stake',
  'Financial Stake',
  'Strategic Stake',
  'Controlling Owner',
  'Strategic Target',
  'No shares or negotiated equity held',
  'Open Stocks',
]) {
  if (!position.includes(required)) failures.push(`Forbes company position is missing: ${required}`);
}
if (position.includes('You hold no public shares or negotiated equity in this company.')) {
  failures.push('Forbes company position still uses the verbose nested empty-state message.');
}
if (position.includes('min-h-11 w-full')) {
  failures.push('Forbes company position still uses the tall full-width Stocks action.');
}
if (!app.includes('StudioAcquisitionDesk')) failures.push('Forbes does not wire the Acquisition Desk.');
if (!app.includes('getCompanyPosition')) failures.push('Forbes does not derive the player company position.');
if (!app.includes('onOpenStocks')) failures.push('Forbes does not expose the existing Stocks route.');
if (!mobileShell.includes('onOpenStocks={() => setAppMode(\'STOCKS\')}')) failures.push('Primary mobile shell does not route Forbes to Stocks.');
if (!legacyMobileShell.includes('onOpenStocks={() => setAppMode(\'STOCKS\')}')) failures.push('Legacy mobile shell does not route Forbes to Stocks.');
if (!mobileShell.includes('onUpdatePlayer={handleUpdatePlayer}')) failures.push('Primary mobile shell does not pass player updates into Forbes.');
if (!legacyMobileShell.includes('onUpdatePlayer={handleUpdatePlayer}')) failures.push('Legacy mobile shell does not pass player updates into Forbes.');

if (profile.includes('text-[clamp(2.1rem,10vw,3.25rem)]')) {
  failures.push('Forbes profile still uses the oversized studio-name header treatment.');
}

if (failures.length) {
  console.error('Forbes studio UI audit failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Forbes studio UI audit passed.');
