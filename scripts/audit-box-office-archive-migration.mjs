import fs from 'node:fs';

const gameLoop = fs.readFileSync('services/gameLoop.ts', 'utf8');
const migration = fs.readFileSync('services/saveMigration.ts', 'utf8');
const types = fs.readFileSync('types.ts', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');

const gameLoopTokens = [
  'createPastProjectArchiveSnapshot',
  'boxOfficeArchiveVersion',
  'weeklyDistributionBreakdowns',
  'weeklyStreamingBreakdowns',
  'weeklySoundtrackRevenue',
  'soundtrackRevenueBreakdown',
  'weeklySoundtrackBreakdowns',
  'marketingChannelAllocations',
  'campaignForecastSnapshot',
  'campaignRealitySnapshot',
  'releaseRegionIds',
  'releaseChainSelections',
  'weeklyStudioReceipts',
  'totalStudioReceipts',
  'weeklyExhibitorReceipts',
  'totalExhibitorReceipts',
  'weeklyViews'
];

const migrationTokens = [
  'SAVE_MIGRATION_VERSION = 12',
  'migrateActiveRelease',
  'migratePastProject',
  'weeklyDistributionBreakdowns',
  'weeklyStreamingBreakdowns',
  'weeklySoundtrackRevenue',
  'soundtrackRevenueBreakdown',
  'weeklySoundtrackBreakdowns',
  'marketingChannelAllocations',
  'releaseRegionIds',
  'releaseChainSelections',
  'boxOfficeArchiveVersion',
  'pastProjects:'
];

const typeTokens = [
  'boxOfficeArchiveVersion?: number',
  'weeklyGross?: number[]',
  'weeklyStudioReceipts?: number[]',
  'totalStudioReceipts?: number',
  'weeklyExhibitorReceipts?: number[]',
  'totalExhibitorReceipts?: number',
  'weeklyDistributionBreakdowns?: TheatricalDistributionBreakdown[]',
  'weeklyViews?: number[]',
  'weeklyStreamingBreakdowns?: StreamingDistributionBreakdown[]',
  'soundtrackRevenue?: number',
  'weeklySoundtrackRevenue?: number[]',
  'soundtrackRevenueBreakdown?: ProjectSoundtrackRevenueBreakdown',
  'weeklySoundtrackBreakdowns?: ProjectSoundtrackRevenueBreakdown[]',
  'marketingChannelAllocations?: MarketingChannelAllocations',
  'releaseRegionIds?: BoxOfficeRegionId[]',
  'releaseChainSelections?: Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>'
];

const missingGameLoop = gameLoopTokens.filter(token => !gameLoop.includes(token));
if (missingGameLoop.length) throw new Error(`gameLoop archive snapshot missing: ${missingGameLoop.join(', ')}`);

const missingMigration = migrationTokens.filter(token => !migration.includes(token));
if (missingMigration.length) throw new Error(`save migration missing: ${missingMigration.join(', ')}`);

const missingTypes = typeTokens.filter(token => !types.includes(token));
if (missingTypes.length) throw new Error(`PastProject type missing archive fields: ${missingTypes.join(', ')}`);

if (!pkg.includes('audit:box-office-archive-migration')) {
  throw new Error('package.json missing audit:box-office-archive-migration script.');
}

console.log('BoxOffice archive migration audit passed.');
