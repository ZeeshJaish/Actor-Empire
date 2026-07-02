import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');

const mustInclude = token => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'legacyCampaignBudgetCeiling',
  'channel-minimal-row',
  'channel-mini-meter',
  'channel-control-dock',
  'channel-amount-input',
  'Math.min(Math.max(0, player.money), legacyCampaignBudgetCeiling)'
].forEach(mustInclude);

if (source.includes('type="range"')) {
  throw new Error('Large channel sliders should not render in the minimal channel UI.');
}

if (source.includes('channel-spend-slider')) {
  throw new Error('Old channel slider class is still present.');
}

if (source.includes('spend slider')) {
  throw new Error('Old slider aria label is still present.');
}

console.log('Release minimal channel controls audit passed.');
