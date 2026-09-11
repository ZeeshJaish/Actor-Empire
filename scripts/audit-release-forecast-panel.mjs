import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const campaign = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/CampaignStep.tsx', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');

const mustInclude = (haystack, token) => {
  if (!haystack.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'calculateCampaignForecast',
  'campaignForecast',
  'campaignForecastSnapshot: campaignForecast'
].forEach(token => mustInclude(source, token));

[
  'STUDIO FORECAST',
  'OPENING RANGE',
  'forecast.openingRange',
  'BREAK-EVEN',
  'forecast.breakEvenChance',
  'WEEK-TWO DROP',
  'forecast.weekTwoDropRisk',
  'STREAMING BID',
  'forecast.streamingBidBoost',
  'AWARDS VISIBILITY',
  'forecast.awardsVisibility',
  'forecast.note'
].forEach(token => mustInclude(campaign, token));

[
  'export interface CampaignForecastSnapshot',
  'campaignForecastSnapshot?: CampaignForecastSnapshot',
  'openingWeekendLow',
  'totalRevenueHigh',
  'breakEvenChance',
  'weekTwoDropRisk',
  'streamingBidBoost',
  'awardsVisibility',
  'franchiseValueImpact'
].forEach(token => mustInclude(types, token));

if (source.includes('Guaranteed Forecast') || source.includes('guaranteed revenue') || campaign.includes('Guaranteed Forecast') || campaign.includes('guaranteed revenue')) {
  throw new Error('Forecast UI must not promise guaranteed results.');
}

console.log('Release transplanted forecast panel audit passed.');
