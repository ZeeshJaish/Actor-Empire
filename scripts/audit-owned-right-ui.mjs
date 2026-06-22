import { existsSync, readFileSync } from 'node:fs';

const brief = readFileSync('views/lifestyle/business/components/OwnedRightDevelopmentBrief.tsx', 'utf8');
const lab = readFileSync('views/lifestyle/business/DevelopmentLab.tsx', 'utf8');
const market = readFileSync('views/lifestyle/business/components/RightsMarket.tsx', 'utf8');
const dealRoom = readFileSync('views/lifestyle/business/components/RightsDealRoom.tsx', 'utf8');
const dossierPath = 'views/lifestyle/business/components/OwnedIpDossier.tsx';
const dossier = existsSync(dossierPath) ? readFileSync(dossierPath, 'utf8') : '';
const productionHouse = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const failures = [];

for (const required of [
  'Movie Selected',
  'Series Selected',
  'Assign Writer',
  'Go to Active Scripts',
  'Stay in IP Library',
  'bg-sky-500',
  'bg-rose-600',
]) {
  if (!brief.includes(required)) failures.push(`Development Brief is missing: ${required}`);
}

for (const [source, forbidden] of [
  [lab, ['No owned properties yet', 'Owned Properties', 'Develop Property', "label: 'Properties'"]],
  [brief, ['Release this property on screen', 'Stay in Rights Library']],
  [market, ['Unknown property', 'This property is no longer', 'That property file']],
  [dealRoom, ['The property is ready', 'The property is being contested', 'The property belongs']],
]) {
  for (const phrase of forbidden) {
    if (source.includes(phrase)) failures.push(`Player-facing property terminology remains: ${phrase}`);
  }
}

for (const required of [
  'IP Performance Dossier',
  'Performance Pulse',
  'Screen History',
  'Development Pipeline',
  'Open Project',
  'Develop IP',
  'bg-[#060608]',
  'Studio Original',
  'Expansion Command',
  'Franchise Command',
  'Universe Command',
  'Hold IP',
  'Renew Licence',
]) {
  if (!dossier.includes(required)) failures.push(`Owned IP dossier is missing: ${required}`);
}

if (dossier.includes('bg-[#060608]/98')) failures.push('Owned IP dossier uses an unsupported translucent arbitrary background utility.');
if (dossier.includes('bg-[#08080b]/95')) failures.push('Owned IP dossier chrome uses an unsupported translucent arbitrary background utility.');
if (!dossier.includes('<div\n            role="dialog"')) failures.push('Owned IP dossier must use a static viewport shell outside its animated content.');

if (!lab.includes('onOpenProject')) failures.push('Development Lab does not expose the existing Project Dashboard handoff.');
if (!productionHouse.includes('onOpenProject')) failures.push('Production House does not wire the existing Project Dashboard handoff.');
for (const required of ['All IP', 'Originals', 'ipSourceFilter']) {
  if (!lab.includes(required)) failures.push(`Unified IP Library filter is missing: ${required}`);
}

if (brief.includes('window.setTimeout(onAuthorized')) {
  failures.push('Development authorization still auto-dismisses instead of waiting for a player choice');
}

for (const required of [
  'Owned',
  'Owned IP',
  'IP Library',
  'Develop IP',
  'Projects Made',
  'Lifetime Gross',
  'Unproven',
  'Character IP',
  'Story World IP',
  'Franchise IP',
  'Catalog IP',
  'activeReleases',
  'pastProjects',
  'subjectName',
  'setSelectedScriptForAssignment(createdScriptId)',
]) {
  if (!lab.includes(required)) failures.push(`Rights Library integration is missing: ${required}`);
}

if (failures.length) {
  console.error('Owned-right UI audit failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Owned-right UI audit passed.');
