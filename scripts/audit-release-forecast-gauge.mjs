import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');

const mustInclude = (token) => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'forecastGaugeScore',
  'forecastGaugeLabel',
  'forecastGaugeTone',
  'forecastGaugeAccent',
  'forecastGaugeWord',
  'forecastGaugeRingOffset',
  'forecast-speedometer',
  'forecast-gauge-shell',
  'forecast-gauge-track',
  'forecast-gauge-fill',
  'strokeDasharray',
  'strokeDashoffset',
  'pathLength="100"',
  'STRONG',
  'EARLY',
  'VOLATILE',
  'Strong Read',
  'Early Read',
  'Volatile',
  'Studio Forecast'
].forEach(mustInclude);

const forecastPanelStart = source.indexOf('Studio Forecast');
const forecastPanelEnd = source.indexOf('Marketing Channel Mix');
if (forecastPanelStart === -1 || forecastPanelEnd === -1 || forecastPanelEnd <= forecastPanelStart) {
  throw new Error('Could not isolate Studio Forecast panel.');
}

const forecastPanel = source.slice(forecastPanelStart, forecastPanelEnd);
if (!forecastPanel.includes('forecast-speedometer')) {
  throw new Error('Speedometer must live inside Studio Forecast, not campaign position or channel mix.');
}

if (forecastPanel.includes('forecast-gauge-needle') || forecastPanel.includes('forecast-gauge-tick')) {
  throw new Error('Forecast gauge should be a clean semi-ring badge, not a needle/tick speedometer.');
}

const campaignMeaningStart = source.indexOf('Campaign Meaning');
const campaignMeaningEnd = source.indexOf('Studio Forecast');
if (campaignMeaningStart !== -1 && campaignMeaningEnd > campaignMeaningStart) {
  const campaignMeaning = source.slice(campaignMeaningStart, campaignMeaningEnd);
  if (campaignMeaning.includes('forecast-speedometer')) {
    throw new Error('Campaign meaning should stay text-only.');
  }
}

const channelMixStart = source.indexOf('Marketing Channel Mix');
if (channelMixStart !== -1) {
  const channelMix = source.slice(channelMixStart);
  if (channelMix.includes('forecast-speedometer')) {
    throw new Error('Channel mix should not contain the forecast gauge.');
  }
}

if (source.includes('Guaranteed Forecast') || source.includes('guaranteed revenue')) {
  throw new Error('Forecast gauge must not imply guaranteed results.');
}

console.log('Release forecast gauge audit passed.');
