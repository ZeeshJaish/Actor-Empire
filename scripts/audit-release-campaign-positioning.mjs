import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');

const mustInclude = (haystack, needle, label = needle) => {
  if (!haystack.includes(needle)) {
    throw new Error(`Missing ${label}`);
  }
};

[
  'campaignPositioning',
  'CAMPAIGN_POSITIONING_OPTIONS',
  'calculateCampaignFit',
  'Campaign Position',
  'Campaign Meaning',
  'selectedCampaignPosition.description',
  'selectedCampaignPosition.promise',
  'campaignFitSnapshot'
].forEach(token => mustInclude(source, token));

[
  'Fit check',
  'Risk {campaignFit',
  'campaignFit.fitScore}/100',
  'Overspend {campaignFit.overspendRisk}'
].forEach(token => {
  if (source.includes(token)) throw new Error(`Visible campaign guidance should not include ${token}`);
});

[
  'MASS_EVENT',
  'PRESTIGE_PUSH',
  'FANBASE_MOBILIZATION',
  'VIRAL_HEAT',
  'SLEEPER_BUILD'
].forEach(token => mustInclude(source, token));

[
  'export type CampaignPositioning',
  'export type CampaignRiskLevel',
  'export interface CampaignFitSnapshot',
  'campaignPositioning?: CampaignPositioning',
  'campaignFitSnapshot?: CampaignFitSnapshot'
].forEach(token => mustInclude(types, token));

if (!/campaignFitSnapshot:\s*campaignFit/.test(source)) {
  throw new Error('Release lock must save the calculated campaign fit snapshot.');
}

if (!/falseMarketingRisk:\s*campaignFit\.falseMarketingRisk/.test(source)) {
  throw new Error('Hidden stats must preserve false marketing risk for post-release reality checks.');
}

console.log('Release campaign positioning UI audit passed.');
