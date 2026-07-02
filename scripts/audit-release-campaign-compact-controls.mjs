import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');

const mustInclude = token => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'Campaign Meaning',
  'selectedCampaignPosition.label',
  'selectedCampaignPosition.description',
  'selectedCampaignPosition.promise',
  'setChannelAllocationAmount',
  'type="number"',
  'inputMode="decimal"',
  'channel-mini-meter',
  'aria-label={`${channel.label} custom spend in millions`'
].forEach(mustInclude);

[
  'Fit check',
  'Risk {campaignFit',
  'campaignFit.fitScore}/100',
  'Overspend {campaignFit.overspendRisk}'
].forEach(token => {
  if (source.includes(token)) throw new Error(`Visible campaign guidance should not include ${token}`);
});

if (source.includes('type="range"') || source.includes('spend slider')) {
  throw new Error('Campaign controls should use the minimal meter, not big sliders.');
}

[
  'Risk Chips',
  'Audience Match',
  'Critic Match',
  'Support Cap',
  'campaignFit.warning'
].forEach(token => {
  if (source.includes(token)) throw new Error(`Campaign meaning card should not render ${token}`);
});

if (source.includes('campaignFit.strengths.length > 0 || campaignFit.risks.length > 0')) {
  throw new Error('Campaign fit still renders the large strengths/risks section.');
}

if (/channel\.description[\s\S]{0,120}truncate/.test(source) || /truncate[\s\S]{0,120}channel\.description/.test(source)) {
  throw new Error('Marketing channel descriptions are still truncated.');
}

if (/font-serif text-lg text-white\/90 truncate/.test(source)) {
  throw new Error('Marketing channel titles are still forced to truncate.');
}

console.log('Release campaign compact controls audit passed.');
