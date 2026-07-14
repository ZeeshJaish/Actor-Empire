import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];

const expectIncludes = (source, needle, label) => {
  checks.push({ pass: source.includes(needle), label });
};

const expectExcludes = (source, needle, label) => {
  checks.push({ pass: !source.includes(needle), label });
};

const types = read('types.ts');
const mediaStorage = read('services/mediaStorage.ts');
const posterMedia = fs.existsSync('services/customPosterMedia.ts') ? read('services/customPosterMedia.ts') : '';
const saveCompaction = fs.existsSync('services/saveCompaction.ts') ? read('services/saveCompaction.ts') : '';
const dashboard = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
const productionHouse = read('views/lifestyle/business/ProductionHouseGame.tsx');
const imdb = read('views/mobile/ImdbApp.tsx');
const app = read('App.tsx');

expectIncludes(types, 'posterMediaId?: string', 'CustomPoster stores lightweight posterMediaId');
expectIncludes(mediaStorage, "'production_poster'", 'media storage supports production poster blobs');
expectIncludes(posterMedia, 'createCustomPosterBlobFromFile', 'poster media service compresses uploads');
expectIncludes(posterMedia, 'externalizeCustomPostersInPlayer', 'legacy base64 posters can be externalized during load');
expectIncludes(posterMedia, 'stripEmbeddedPosterImageDataForPersistence', 'persistence safety strips duplicate embedded image data');
expectExcludes(dashboard, 'readAsDataURL', 'dashboard upload no longer stores base64 data URLs');
expectIncludes(dashboard, 'saveCustomPosterMedia', 'dashboard saves uploaded posters through media storage');
expectIncludes(dashboard, 'CustomPosterImage', 'dashboard renders media-backed posters');
expectIncludes(productionHouse, 'CustomPosterImage', 'production house cards render media-backed posters');
expectIncludes(imdb, 'CustomPosterImage', 'IMDb renders media-backed posters');
expectIncludes(app, 'externalizeCustomPostersInPlayer', 'app migrates legacy base64 posters on load');
expectIncludes(saveCompaction, 'stripEmbeddedPosterImageDataForPersistence', 'save compaction prevents duplicate poster imageData from entering saves');
expectIncludes(app, 'compactPlayerForPersistence', 'app persists through shared save compaction');

const failed = checks.filter(check => !check.pass);
if (failed.length) {
  console.error('Custom poster storage audit failed:');
  failed.forEach(check => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log('Custom poster storage audit passed.');
