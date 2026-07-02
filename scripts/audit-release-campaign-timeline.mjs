import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');
const strategy = fs.readFileSync('services/marketingStrategy.ts', 'utf8');

const mustInclude = (haystack, token) => {
  if (!haystack.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'CampaignTimeline',
  'campaignTimeline',
  'setCampaignTimeline',
  'CAMPAIGN_TIMELINE_OPTIONS',
  'Campaign Timeline',
  'timeline-selector',
  'normalizedChannelMix.allocations, campaignFit, campaignTimeline',
  'campaignTimeline,',
  'campaignForecastSnapshot: campaignForecast'
].forEach(token => mustInclude(source, token));

[
  "export type CampaignTimeline",
  "FRONT_LOADED_OPENING",
  "BALANCED_ROLLOUT",
  "SLOW_BURN_WOM",
  "LAST_WEEK_BLITZ",
  "campaignTimeline?: CampaignTimeline",
  "timeline: CampaignTimeline"
].forEach(token => mustInclude(types, token));

[
  'CAMPAIGN_TIMELINE_OPTIONS',
  'timeline: CampaignTimeline',
  'timelineOpeningBonus',
  'timelineLegsBonus',
  'timelineDropRisk',
  'timelineUncertainty',
  'Front-Loaded',
  'Balanced',
  'Slow-Burn',
  'Last-Week Blitz',
  'SLOW_BURN_WOM'
].forEach(token => mustInclude(strategy, token));

const timelineStart = source.indexOf('Campaign Timeline');
const forecastStart = source.indexOf('Studio Forecast');
if (timelineStart === -1 || forecastStart === -1 || timelineStart > forecastStart) {
  throw new Error('Campaign Timeline selector should appear before Studio Forecast.');
}

if (source.includes('Timeline Cost') || source.includes('timelineSpend')) {
  throw new Error('Campaign Timeline should not cost money directly.');
}

console.log('Release campaign timeline audit passed.');
