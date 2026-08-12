import { readFileSync } from 'node:fs';

const source = readFileSync('views/lifestyle/business/components/DevelopmentLabScriptWizard.tsx', 'utf8');

const checks: [string, boolean][] = [
  ['premise length constant exists', source.includes('CUSTOM_PREMISE_MAX_LENGTH')],
  ['script builder has editable premise state', source.includes('draftPremise')],
  ['premise field is labeled for players', source.includes('Player Premise')],
  ['custom premise is saved to Script.logline', source.includes('logline: finalPremise')],
  ['script DNA is explicitly kept mechanical', source.includes('Script DNA still drives gameplay calculations')],
];

const failed = checks.filter(([, passed]) => !passed);

if (failed.length > 0) {
  console.error('Custom premise audit failed:');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log('Custom premise audit passed.');
