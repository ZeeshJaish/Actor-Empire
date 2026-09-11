import fs from 'node:fs';

const controller = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const source = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/CampaignStep.tsx', 'utf8');

const mustInclude = token => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'className={css.stepbtn}',
  'disabled={channel.amount <= 0}',
  'disabled={remaining < allocationStep}',
  'aria-label={`Decrease ${channel.label}`}',
  'aria-label={`Increase ${channel.label}`}',
  'className={css.pips}',
  'className={css.chanfill}'
].forEach(mustInclude);

[
  'legacyCampaignBudgetCeiling',
  'Math.min(Math.max(0, player.money), legacyCampaignBudgetCeiling)',
  'updateChannelAllocation(id as MarketingChannelId, delta)'
].forEach(token => {
  if (!controller.includes(token)) throw new Error(`Missing ${token}`);
});

if (source.includes('type="range"')) {
  throw new Error('Large channel sliders should not render in the minimal channel UI.');
}

if (source.includes('channel-spend-slider')) {
  throw new Error('Old channel slider class is still present.');
}

if (source.includes('spend slider')) {
  throw new Error('Old slider aria label is still present.');
}

console.log('Release transplanted minimal channel controls audit passed.');
