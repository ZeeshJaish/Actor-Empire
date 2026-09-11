import fs from 'node:fs';

const gameLoop = fs.readFileSync('services/gameLoop.ts', 'utf8');
const imdb = fs.readFileSync('views/mobile/ImdbApp.tsx', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');
const english = fs.readFileSync('services/localization/locales/en.ts', 'utf8');

const mustInclude = (haystack, token, label = token) => {
  if (!haystack.includes(token)) throw new Error(`Missing ${label}`);
};

[
  'processPostReleaseReality',
  'evaluatePostReleaseReality',
  'campaignRealityChecked',
  'campaignRealitySnapshot',
  'reality.newsItem',
  'reality.socialPost',
  'nextPlayer.x.feed',
  'marketing_reality',
  'Reality Check'
].forEach(token => mustInclude(gameLoop, token));

[
  'CampaignRealitySnapshot',
  'CampaignRealityOutcome',
  'campaignRealitySnapshot?: CampaignRealitySnapshot',
  'campaignRealityChecked?: boolean',
  'campaignRealityOutcome?: CampaignRealityOutcome'
].forEach(token => mustInclude(types, token));

[
  "tr('imdb.project.campaignReality')",
  'campaignRealitySnapshot',
  "tr('imdb.project.promise')",
  "tr('imdb.project.audienceRead')",
  "tr('imdb.project.forecastShift')",
  'reality-tone'
].forEach(token => mustInclude(imdb, token));

[
  "'imdb.project.campaignReality': 'Campaign Reality'",
  "'imdb.project.promise': 'Promise'",
  "'imdb.project.audienceRead': 'Audience Read'",
  "'imdb.project.forecastShift': 'Forecast Shift'"
].forEach(token => mustInclude(english, token));

const realityBlockStart = gameLoop.indexOf('processPostReleaseReality');
const realityBlockEnd = gameLoop.indexOf('nextPlayer.activeReleases = processedReleases');
if (realityBlockStart === -1 || realityBlockEnd === -1 || realityBlockEnd <= realityBlockStart) {
  throw new Error('Could not isolate post-release reality processing block.');
}

const realityBlock = gameLoop.slice(realityBlockStart, realityBlockEnd);
if (/pendingEvents?\.push|pendingEvent\s*=/.test(realityBlock)) {
  throw new Error('Post-release reality checks must not create routine popup events.');
}

console.log('Release reality surfaces audit passed.');
