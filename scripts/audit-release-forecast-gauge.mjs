import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/CampaignStep.tsx', 'utf8');

const mustInclude = (token) => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'className={css.dial}',
  '<svg viewBox="0 0 80 48">',
  'forecast.score',
  'forecast.label.toUpperCase()',
  'strokeDasharray',
  'pathLength="100"',
  'STUDIO FORECAST'
].forEach(mustInclude);

const forecastPanelStart = source.indexOf('STUDIO FORECAST');
const forecastPanelEnd = source.indexOf('SOUNDTRACK IMPACT');
if (forecastPanelStart === -1 || forecastPanelEnd === -1 || forecastPanelEnd <= forecastPanelStart) {
  throw new Error('Could not isolate Studio Forecast panel.');
}

const forecastPanel = source.slice(forecastPanelStart, forecastPanelEnd);
if (!forecastPanel.includes('className={css.dial}')) {
  throw new Error('Speedometer must live inside Studio Forecast, not campaign position or channel mix.');
}

if (forecastPanel.includes('forecast-gauge-needle') || forecastPanel.includes('forecast-gauge-tick')) {
  throw new Error('Forecast gauge should be a clean semi-ring badge, not a needle/tick speedometer.');
}

const campaignMeaningStart = source.indexOf('THE PROMISE');
const campaignMeaningEnd = source.indexOf('STUDIO FORECAST');
if (campaignMeaningStart !== -1 && campaignMeaningEnd > campaignMeaningStart) {
  const campaignMeaning = source.slice(campaignMeaningStart, campaignMeaningEnd);
  if (campaignMeaning.includes('className={css.dial}')) {
    throw new Error('Campaign meaning should stay text-only.');
  }
}

const channelMixStart = source.indexOf('CHANNEL MIX');
if (channelMixStart !== -1) {
  const channelMix = source.slice(channelMixStart);
  if (channelMix.includes('className={css.dial}')) {
    throw new Error('Channel mix should not contain the forecast gauge.');
  }
}

if (source.includes('Guaranteed Forecast') || source.includes('guaranteed revenue')) {
  throw new Error('Forecast gauge must not imply guaranteed results.');
}

console.log('Release transplanted forecast gauge audit passed.');
