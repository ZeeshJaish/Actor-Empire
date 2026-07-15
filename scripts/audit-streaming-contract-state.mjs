import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const types = fs.readFileSync('types.ts', 'utf8');
const gameLoop = fs.readFileSync('services/gameLoop.ts', 'utf8');
const releaseWizard = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const boxOffice = fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
const releasePresentation = fs.readFileSync('services/releasePresentation.ts', 'utf8');
const productionHouse = fs.readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const ownedStudio = fs.readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const developmentLab = fs.readFileSync('views/lifestyle/business/DevelopmentLab.tsx', 'utf8');

[
  'streamingUpfrontFee?: number;',
  'streamingRoyaltyRevenue?: number;',
  'streamingFundingAmount?: number;'
].forEach(token => assert(types.includes(token), `ActiveRelease should persist ${token}`));

assert(
  gameLoop.includes('const newStreamingRoyaltyRevenue = inferredRoyaltyRevenue + weeklyStreamingRevenue;') &&
    gameLoop.includes('const newStreamingRevenue = inferredUpfrontFee + newStreamingRoyaltyRevenue;'),
  'Weekly streaming income must add to royalties without overwriting the upfront license fee.'
);

assert(
  releaseWizard.includes('streamingUpfrontFee:') &&
    releaseWizard.includes('streamingFundingAmount:'),
  'Accepted streaming deals must preserve their upfront fee and platform funding separately.'
);

[
  'getStreamingContract',
  "tr('box.streamingUpfront')",
  "tr('box.streamingRoyalty')",
  "tr('box.streamingFunding')",
  "tr('box.streamingNoBackend')"
].forEach(token => assert(boxOffice.includes(token), `Box Office must explain ${token}.`));

assert(
  releasePresentation.includes("release.distributionPhase === 'STREAMING_BIDDING'") &&
    releasePresentation.includes("return 'BIDDING';"),
  'Streaming bidding must have its own display state rather than falling back to In Theaters.'
);

[productionHouse, ownedStudio, developmentLab].forEach((source, index) => {
  assert(source.includes('getReleaseDisplayPhase'), `Release slate surface ${index + 1} must use the shared display phase.`);
});

console.log('Streaming contract and release-state audit passed.');
