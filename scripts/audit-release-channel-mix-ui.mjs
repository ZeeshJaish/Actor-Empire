import fs from 'node:fs';

const releaseSource = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const typesSource = fs.readFileSync('types.ts', 'utf8');

const mustInclude = (source, token) => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'MARKETING_CHANNEL_OPTIONS',
  'normalizeMarketingChannelAllocations',
  'channelAllocations',
  'Marketing Channel Mix',
  'Pool Used',
  'Pool Remaining',
  'returnedMarketingBudget',
  'marketingChannelAllocations',
  'marketingBudgetRemaining: 0',
  'hasReservedMarketingPool',
  'unusedCampaignReserve'
].forEach(token => mustInclude(releaseSource, token));

[
  'MarketingChannelId',
  'MarketingChannelAllocations',
  'marketingChannelAllocations?: MarketingChannelAllocations',
  'returnedMarketingBudget?: number'
].forEach(token => mustInclude(typesSource, token));

if (!/if\s*\(\s*!hasReservedMarketingPool\s*\)\s*\{[\s\S]*updatedPlayer\.money\s*-=/m.test(releaseSource)) {
  throw new Error('Release campaign cash deduction must only happen for legacy projects without a reserved pool.');
}

if (!/b\.balance\s*\+=\s*unusedCampaignReserve/.test(releaseSource)) {
  throw new Error('Unused reserved campaign budget must return to studio balance.');
}

if (/grid-cols-1 md:grid-cols-5/.test(releaseSource)) {
  throw new Error('Campaign positioning controls are still using the large mobile card stack.');
}

console.log('Release channel mix UI audit passed.');
