import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');

const mustInclude = (haystack, token) => {
  if (!haystack.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'calculateCampaignForecast',
  'campaignForecast',
  'Studio Forecast',
  'Opening Weekend',
  'Total Revenue',
  'Break-even',
  'Week-two Drop',
  'Streaming Bid',
  'Awards',
  'Franchise',
  'Audience reaction can rewrite this after week one',
  'campaignForecastSnapshot: campaignForecast'
].forEach(token => mustInclude(source, token));

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

if (source.includes('Guaranteed Forecast') || source.includes('guaranteed revenue')) {
  throw new Error('Forecast UI must not promise guaranteed results.');
}

console.log('Release forecast panel audit passed.');
