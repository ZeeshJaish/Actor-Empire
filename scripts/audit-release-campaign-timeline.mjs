import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const campaign = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/CampaignStep.tsx', 'utf8');
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
  'timelineWeights',
  'weights: timelineWeights[option.id]',
  'timelines={campaignTimelines}',
  'normalizedChannelMix.allocations, campaignFit, campaignTimeline',
  'campaignTimeline,',
  'campaignForecastSnapshot: campaignForecast'
].forEach(token => mustInclude(source, token));

[
  'CAMPAIGN TIMELINE',
  'timelines.map',
  'onSelectTimeline(item.id)',
  'timeline?.weights',
  'TEASE',
  'OPENING',
  'HOLD'
].forEach(token => mustInclude(campaign, token));

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

const timelineStart = campaign.indexOf('CAMPAIGN TIMELINE');
const forecastStart = campaign.indexOf('STUDIO FORECAST');
if (timelineStart === -1 || forecastStart === -1 || timelineStart > forecastStart) {
  throw new Error('Campaign Timeline selector should appear before Studio Forecast.');
}

if (source.includes('Timeline Cost') || source.includes('timelineSpend')) {
  throw new Error('Campaign Timeline should not cost money directly.');
}

console.log('Release transplanted campaign timeline audit passed.');
