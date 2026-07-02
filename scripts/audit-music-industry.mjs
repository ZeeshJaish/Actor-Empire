import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        process.exitCode = 1;
    } else {
        console.log(`PASS: ${message}`);
    }
};

const csv = read('services/data/music_artists_database.csv');
const csvRows = csv.trim().split(/\r?\n/);
assert(csvRows.length >= 51, 'music artist CSV includes at least 50 artists');
assert(csv.includes('Ed Sheerwood'), 'fictional/parody artist names are present');

const types = read('types.ts');
assert(types.includes('export interface MusicArtist'), 'MusicArtist type exists');
assert(types.includes("export type MusicArtistGender"), 'MusicArtist gender type exists');
assert(types.includes("'MUSIC_ARTIST'"), 'NPC actors can represent music artists');
assert(types.includes('musicPlan?: ProjectMusicPlan'), 'ProjectDetails/PastProject can carry music plans');
assert(types.includes('selectedMusicArtistTargetCount?: number'), 'Greenlight drafts persist selected music artist count');
assert(types.includes('selectedMusicCreditRoles?: MusicCreditRole[]'), 'Greenlight drafts persist selected music deliverables');
assert(types.includes('musicIndustry?: MusicIndustryState'), 'WorldState can persist music industry state');
assert(types.includes('generatedArtists?: MusicArtist[]'), 'Music industry can persist generated artists');
assert(types.includes('export interface MusicReleaseRecord') && types.includes('youtubeViews') && types.includes('socialGrowthPct'), 'Music industry persists release and social growth records');
assert(types.includes('export interface MusicRivalryRecord') && types.includes('export interface MusicScandalRecord'), 'Music industry persists rivalries and scandals');
assert(types.includes('export interface MusicCultureMomentRecord') && types.includes('cultureMoments?: MusicCultureMomentRecord[]'), 'Music industry persists rivalry and soundtrack culture moments');
assert(types.includes("'FANBASE_WAR'") && types.includes("'SONG_BIGGER_THAN_MOVIE'"), 'Music culture moment types cover fan wars and movie soundtrack moments');
assert(types.includes('chartMovement?: number') && types.includes('peakRank?: number'), 'Music artist world state tracks chart movement and peak rank');
assert(types.includes("'MUSIC_VIDEO'") && types.includes('YoutubeMusicVideoFeatureOffer'), 'YouTube supports music videos and music artist feature offers');
assert(types.includes('export interface ProjectMusicImpact'), 'Project music impact type exists');
assert(types.includes('musicOpeningLiftPct?: number') && types.includes('musicAwardChanceLift?: number'), 'Project hidden stats persist music performance impact');
assert(types.includes('export interface ProjectSoundtrackRevenueBreakdown'), 'Project soundtrack revenue breakdown type exists');
assert(types.includes('soundtrackRevenue?: number') && types.includes('weeklySoundtrackRevenue?: number[]'), 'Active and archived projects can persist soundtrack revenue');
assert(types.includes("'SOUNDTRACK'"), 'Studio finance ledger supports soundtrack revenue entries');

const musicService = read('services/musicIndustry.ts');
assert(musicService.includes('export const MUSIC_ARTISTS'), 'music catalog is exported');
assert(musicService.includes('getMusicArtistCatalog'), 'music catalog can merge generated artists with CSV artists');
assert(musicService.includes('buildAutomaticProjectMusicPlan'), 'automatic project music plan builder exists');
assert(musicService.includes('inferArtistGender'), 'artist gender is inferred when CSV has no gender column');
assert(musicService.includes('buildProjectMusicPlanFromArtists'), 'custom Greenlight music plans can be built from selected artists');
assert(musicService.includes('selectedCreditRoles'), 'custom Greenlight music plans preserve selected deliverables');
assert(musicService.includes('fillMissingArtists'), 'custom Greenlight music plans can avoid auto-filling manual artist rows');
assert(musicService.includes('artistsByRole'), 'custom Greenlight music plans keep artist choices attached to their role');
assert(musicService.includes('getMusicArtistCountBounds'), 'music strategies expose artist count bounds');
assert(musicService.includes('getDefaultMusicArtistCount'), 'music strategies expose default artist counts');
assert(musicService.includes('getMusicStrategyCreditCount'), 'music strategies expose required artist slot counts');
assert(musicService.includes('calculateProjectMusicImpact'), 'music plans can calculate movie performance impact');
assert(musicService.includes('applyMusicImpactToHiddenStats'), 'music impact can be stored in project hidden stats');
assert(musicService.includes('calculateWeeklySoundtrackRevenue'), 'music plans can calculate weekly soundtrack revenue');
assert(musicService.includes('albumRevenue') && musicService.includes('leadSingleRevenue') && musicService.includes('viralSongRevenue'), 'soundtrack revenue tracks source breakdowns');
assert(musicService.includes('processMusicIndustryWeek'), 'weekly music world processor exists');
assert(musicService.includes('generateEmergingMusicArtist'), 'weekly music world can generate new artists');
assert(musicService.includes('getReleaseKind') && musicService.includes('estimateYoutubeViews'), 'music releases track content type and YouTube-scale reach');
assert(musicService.includes('recentReleases.unshift') && musicService.includes('socialGrowthPct'), 'music releases store recent release history and social growth');
assert(musicService.includes('heatActiveRivalry') && musicService.includes('chart rivalry'), 'music world can create chart rivalries');
assert(musicService.includes('buildMusicScandal') && musicService.includes('scandalHeat'), 'music world can create rare scandals with momentum impact');
assert(musicService.includes('createMusicCultureMoment') && musicService.includes('addMusicCultureMoment'), 'music world exposes culture moment helpers');
assert(musicService.includes("'FANBASE_WAR'") && musicService.includes("'SONG_BEATS_SONG'") && musicService.includes("'ARTIST_BREAKOUT'"), 'music world creates rivalry, chart battle, and breakout culture moments');

const npcLogic = read('services/npcLogic.ts');
assert(npcLogic.includes('createNPCFromMusicArtist'), 'music artists can be converted into existing NPC records');
assert(npcLogic.includes("occupation: 'MUSIC_ARTIST'"), 'music artist NPC records use MUSIC_ARTIST occupation');
assert(npcLogic.includes('MUSIC_ARTISTS.forEach'), 'base music artists are added to NPC_DATABASE');

const roleLogic = read('services/roleLogic.ts');
assert(roleLogic.includes('buildAutomaticProjectMusicPlan'), 'generated offers receive music plans');

const greenlight = read('views/lifestyle/business/GreenlightWizard.tsx');
assert(greenlight.includes('buildProjectMusicPlanFromArtists'), 'Greenlight-created projects receive selected music plans');
assert(greenlight.includes('getMusicArtistCatalog(player.world)'), 'Greenlight artist picker can include generated music artists');
assert(greenlight.includes('Soundtrack Desk'), 'Greenlight setup exposes soundtrack desk controls');
assert(greenlight.includes('Content Types') && greenlight.includes('Let Studio Decide'), 'Greenlight soundtrack desk exposes direct music content choices');
assert(greenlight.includes('Toggle on to add artist') && greenlight.includes('Search artist for'), 'Greenlight content rows clearly connect toggles to inline artist assignment');
assert(greenlight.includes('musicRoleSearchQueries') && greenlight.includes('assignMusicArtistToRole'), 'Greenlight soundtrack desk assigns artists per music content type');
assert(greenlight.includes('All music content is off'), 'Greenlight soundtrack desk supports turning every music content type off');
assert(greenlight.includes('overflow-x-auto') && greenlight.includes('Rating'), 'Greenlight artist picker uses a horizontal rated artist rail');
assert(greenlight.includes('musicRoleSortOptions') && greenlight.includes('MUSIC_ARTIST_SORT_OPTIONS'), 'Greenlight artist rails expose per-row sorting');
assert(greenlight.includes('Cost Low') && greenlight.includes('Followers') && greenlight.includes('Available'), 'Greenlight artist sorting includes cost, reach, and availability options');
assert(greenlight.includes('selectedMusicCreditRoles'), 'Greenlight persists selected music deliverables in drafts');
assert(greenlight.includes('selectedMusicArtistTargetCount'), 'Greenlight persists selected music artist count in drafts');
assert(greenlight.includes('selectedMusicArtistIds'), 'Greenlight persists selected music artists in drafts');
assert(greenlight.includes('getMusicArtistSearchMatches'), 'Greenlight inline artist search filters the full catalog');
assert(greenlight.includes('musicBudget'), 'Greenlight package budget includes soundtrack artist cost');
assert(greenlight.includes('selectedMusicImpact') && greenlight.includes('Opening') && greenlight.includes('Backlash'), 'Greenlight shows practical soundtrack impact chips');

const detailView = read('components/ProjectDetailView.tsx');
assert(detailView.includes('Music by'), 'contract detail view shows Music by');
assert(detailView.includes('calculateProjectMusicImpact') && detailView.includes('musicImpact.openingWeekendLiftPct'), 'contract detail view shows soundtrack impact');

const messages = read('views/mobile/MessagesApp.tsx');
assert(messages.includes('formatProjectMusicByline'), 'message offer cards show project music byline');

const imdb = read('views/mobile/ImdbApp.tsx');
assert(imdb.includes('Soundtrack Desk') && imdb.includes('getArchivedProjectMusicPlan'), 'IMDb project detail shows active and archived music credits');
assert(imdb.includes('selectedProjectMusicImpact') && imdb.includes('awardChanceLift') && imdb.includes('Soundtrack Desk'), 'IMDb project detail shows soundtrack performance impact');
assert(imdb.includes('Soundtrack Desk') && imdb.includes('selectedProjectMusicMoments'), 'IMDb project detail has compact soundtrack desk with culture moments');
assert(imdb.includes('selectedProjectSoundtrackRevenue') && imdb.includes('getMusicCreditRoleLabel(credit.role)'), 'IMDb soundtrack desk shows revenue and role-based artist assignments');

const awardLogic = read('services/awardLogic.ts');
assert(awardLogic.includes('Best Original Song') && awardLogic.includes('Best Music Video Tie-In'), 'awards include music and campaign categories');
assert(awardLogic.includes('getPlayerMusicAwardCategory') && awardLogic.includes('calculateProjectMusicImpact'), 'award eligibility scores music campaign categories');
assert(awardLogic.includes('getNomineeNameForMusicCategory') && awardLogic.includes("occupation === 'MUSIC_ARTIST'"), 'award ballots use music artists for music categories');

const redCarpet = read('views/RedCarpetEvent.tsx');
assert(redCarpet.includes('boostMusicAwardPeople') && redCarpet.includes('isMusicAwardCategory'), 'music award wins boost credited artists');

const gameLoop = read('services/gameLoop.ts');
assert(gameLoop.includes('processMusicIndustryWeek'), 'game loop processes artist releases and chart changes');
assert(gameLoop.includes('musicResult.newArtists') && gameLoop.includes('createNPCFromMusicArtist'), 'game loop mirrors newly generated artists into extra NPCs');
assert(gameLoop.includes('recentReleases') && gameLoop.includes('rivalries') && gameLoop.includes('scandals'), 'game loop guards persisted music world arrays for older saves');
assert(gameLoop.includes('generateMusicVideoFeatureOffer') && gameLoop.includes('OFFER_MUSIC_VIDEO_FEATURE'), 'game loop sends music video feature offers through messages');
assert(gameLoop.includes('Soundtrack Pulse') && gameLoop.includes('x.feed'), 'music world moments feed existing social surfaces');
assert(gameLoop.includes('calculateProjectMusicImpact') && gameLoop.includes('applyMusicImpactToHiddenStats'), 'game loop applies music impact to releases');
assert(gameLoop.includes('music_campaign_') && gameLoop.includes('music_backlash_'), 'music impact can create release-day news and social reactions');
assert(gameLoop.includes('calculateWeeklySoundtrackRevenue') && gameLoop.includes("type: 'SOUNDTRACK'"), 'game loop accrues soundtrack revenue into studio ledger');
assert(gameLoop.includes('soundtrackRevenue: newSoundtrackRevenue'), 'game loop persists cumulative soundtrack revenue on releases');
assert(gameLoop.includes('buildSoundtrackCultureOutcomes') && gameLoop.includes("'SOUNDTRACK_TREND'"), 'game loop can turn strong movie soundtracks into culture trends');
assert(gameLoop.includes("'CONTROVERSIAL_CAMPAIGN'") && gameLoop.includes("'SONG_BIGGER_THAN_MOVIE'"), 'game loop can create soundtrack backlash and song-bigger-than-movie moments');
assert(gameLoop.includes('addMusicCultureMoment') && gameLoop.includes('soundtrackCulture.artistEarnings'), 'soundtrack culture moments persist and boost attached artist NPCs');

const releaseWizard = read('views/lifestyle/business/ReleaseWizard.tsx');
assert(releaseWizard.includes('Soundtrack Impact') && releaseWizard.includes('musicImpact.openingWeekendLiftPct'), 'Release strategy shows soundtrack impact forecast');
assert(releaseWizard.includes('applyMusicImpactToHiddenStats'), 'Release strategy persists music impact before release');

const marketingStrategy = read('services/marketingStrategy.ts');
assert(marketingStrategy.includes('calculateProjectMusicImpact') && marketingStrategy.includes('musicImpact.streamingInterestLiftPct'), 'Campaign forecast includes music impact');

assert(roleLogic.includes('musicOpeningLiftPct') && roleLogic.includes('musicLegsMod'), 'Box office math uses music impact');

const boxOffice = read('views/mobile/BoxOfficeApp.tsx');
assert(boxOffice.includes('Soundtrack Revenue') && boxOffice.includes('albumRevenue') && boxOffice.includes('viralSongRevenue'), 'Box Office financial detail shows soundtrack revenue breakdown');

const youtubeLogic = read('services/youtubeLogic.ts');
assert(youtubeLogic.includes('generateMusicVideoFeatureOffer') && youtubeLogic.includes("type: 'MUSIC_VIDEO'"), 'YouTube feed and offer logic includes music videos');

const youtubeApp = read('views/mobile/YoutubeApp.tsx');
assert(youtubeApp.includes('MUSIC_VIDEO:') && !youtubeApp.includes('handleCompleteMusicVideoFeature'), 'YouTube shows artist music videos without player feature upload jobs');

const mobilePage = read('views/mobile/MobilePage.tsx');
assert(mobilePage.includes('OFFER_MUSIC_VIDEO_FEATURE') && mobilePage.includes('appearanceFee') && !mobilePage.includes('activeMusicVideoFeatures'), 'message acceptance resolves music video cameo directly');

const forbes = read('views/mobile/ForbesApp.tsx');
assert(!forbes.includes("'MUSIC'") && !forbes.includes('Richest Artists') && forbes.includes('actorPool'), 'Forbes keeps music artists inside the existing celeb ranking');

const newsApp = read('views/mobile/NewsApp.tsx');
assert(!newsApp.includes("setTab('MUSIC')") && !newsApp.includes("NewsCategory | 'MUSIC'"), 'News does not use a separate music tab');
assert(newsApp.includes('isMusicStory') && newsApp.includes('Music Desk'), 'Music news merges into Top Stories and Industry with source labeling');

const instagram = read('views/mobile/InstagramApp.tsx');
assert(!instagram.includes('Music Profile') && !instagram.includes('selectedMusicLatestRelease'), 'Instagram profiles do not show music analytics panels');

const messagesApp = read('views/mobile/MessagesApp.tsx');
assert(messagesApp.includes('Music Video Feature') && messagesApp.includes('YoutubeMusicVideoFeatureOffer'), 'Messages shows music video feature offers');

const productionHouse = read('views/lifestyle/business/ProductionHouseGame.tsx');
assert(productionHouse.includes('totalSoundtrackRevenue') && productionHouse.includes('soundtrackRevenue'), 'Production House totals include soundtrack revenue');

const projectDashboard = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
assert(projectDashboard.includes('Soundtrack') && projectDashboard.includes('soundtrackRevenue'), 'Project dashboard financial breakdown includes soundtrack revenue');

const migration = read('services/saveMigration.ts');
assert(migration.includes('normalizeSoundtrackBreakdown') && migration.includes('weeklySoundtrackRevenue'), 'save migration normalizes soundtrack revenue fields');

if (process.exitCode) {
    console.error('Music industry audit failed.');
    process.exit(process.exitCode);
}

console.log('Music industry audit passed.');
