import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = path => readFileSync(path, 'utf8');
const sha256 = path => createHash('sha256').update(read(path)).digest('hex');
const transplantRoot = 'components/streaming-transplant';

/**
 * Each row pins a transplanted stylesheet by content hash so the reviewed ZIP
 * design cannot drift by accident. A hash is only ever re-recorded for a
 * deliberate, reviewed change — never to make a red audit go green.
 *
 * 2026-10-22: Zeesh approved Claude entries #1–#5 in the transplant request.
 * AudienceDesk, ContentDesk and NetworkDesk now pin the exact approved live
 * copy styles; the old flat-map/operation-controls additions are retired.
 * This deliberately changes the visual baseline, with source hashes and
 * browser evidence in docs/reports/2026-10-22-operations-transplant/.
 *
 * Audit repair, also approved on 2026-10-22: Buildout, Cinematics,
 * CommandDesk and Shell below pin the existing 612efbb checkpoint. Each
 * file was verified byte-identical to that commit AND Claude's live copy;
 * no stylesheet was changed. See the audit-repairs report for the review.
 *
 * Baseline moved twice, both under the EMPIRE+ UI/UX rebuild:
 *   · Shell.module.css    — design-system Phase A. The shell's local
 *     `--epx-line` copy was deleted so it inherits the token of the same
 *     weight from tokens.css instead of holding a near-identical duplicate.
 *   · Buildout.module.css — Build redesign Phases B and C. The four competing
 *     network-placement paths became one; the physical-infrastructure metric
 *     grid became a per-facility room; every font-size in the file now comes
 *     from the type scale (36 raw sizes -> 8 tokens, none under 11px); and
 *     Phase D added the pre-shortfall funding state.
 *   · CommandDesk.module.css — Phase D. The treasury hero became a control,
 *     so it needed the affordances of one.
 */
const contracts = [
  ['StreamingAudienceExperience.tsx', 'AudienceDesk/AudienceDesk.module.css', 'css', '2b93bf8303343ec7c286fe42d4083336af066ad8fb1142a9428ed8eb2ca7dca5'],
  ['StreamingBoardroomExperience.tsx', 'Boardroom/Boardroom.module.css', 'css', '4018be34345f52806f7635d01aa56c654eca4c5d4cfc02aaf816efb1edd993ce'],
  ['StreamingBuildoutExperience.tsx', 'Buildout/Buildout.module.css', 'css', 'c4159e58cc0efe5dd921b6106ded8a1bcb222c3b9cc80f58f0039041e8fa6208'],
  ['StreamingRaiseExperience.tsx', 'CapitalRaise/CapitalRaise.module.css', 'css', '79040a688789f35383c0a598467fe01c67994f1b901f34478cf210814e56d237'],
  ['StreamingCinematicsExperience.tsx', 'Cinematics/Cinematics.module.css', 'css', '83cbb4bd10c9c542eee5dae809ae7132fcae84765835bb039b4d00ec0361a441'],
  ['StreamingPlatformCommandDeck.tsx', 'CommandDesk/CommandDesk.module.css', 'css', 'be15acee07289e706fb96624abc3e19b94c50970bdc753ff033b36604bb3f2aa'],
  ['StreamingContentExperience.tsx', 'ContentDesk/ContentDesk.module.css', 's', '89f86b7687f9cf5c60c4d19a89773cf437025f72ce1bd3798979625598942539'],
  ['StreamingStockExperience.tsx', 'LiveQuote/LiveQuote.module.css', 'css', '6a6b4970b35abb398c53e0b6c308f71acf1035a027bfbb2ad5e5e98d18f8262e'],
  ['StreamingMarketDesk.tsx', 'MarketDesk/MarketDesk.module.css', 'css', 'eb158ed6b61a99b8bb7d82a7b48165199b6a09190328864027ee4afe656da482'],
  ['StreamingNetworkExperience.tsx', 'NetworkDesk/NetworkDesk.module.css', 's', 'feea3483fcf4fc928c63e8c3203d0e8fc76441c27f1cbc84743151cb768c9ed1'],
  ['StreamingPremiereExperience.tsx', 'PremiereNight/PremiereNight.module.css', 'css', '71fdcfa6219abd4909284f61f02c950fd3d70c937d830ca4a5c4ca105ea6e251'],
  ['StreamingPricingExperience.tsx', 'Pricing/Pricing.module.css', 'css', '9f0b3d0a8b9e48f965ef99bb999bca1fdb4b3983e83c70da70cb7e86dc47214e'],
  ['StreamingPrototypeOrchestrator.tsx', 'Shell/Shell.module.css', 'css', 'e368a2d6f8921a5181935ff46ec50c15748dda9ba61f1520e8c172b331cdd66a'],
  ['StreamingListingExperience.tsx', 'TheListing/TheListing.module.css', 'css', '8c2dda2dbfa112f0bac86dde6365979e10a88fcb9ab9f5fa7d32e3e8403bab2c'],
  ['StreamingDossierExperience.tsx', 'TitleDossier/TitleDossier.module.css', 'css', '645da2ec47667cafd90c5ff034b47d5b9a6cda90f88dd26e6295782e9dcda67d'],
  ['StreamingViewerExperience.tsx', 'ViewerApp/ViewerApp.module.css', 'css', 'da71aacac3b074a2f153bb36e9b89b6115dc3508f8b5a9e1b869ad8068279a50'],
  ['StreamingWallExperience.tsx', 'WallOfScreens/WallOfScreens.module.css', 'css', '927b3f28887b65cd0df114ed43d572a5439ea8e1f06cd786a876e53fe6415764'],
];

for (const [component, modulePath, binding, expectedHash] of contracts) {
  const source = read(`${transplantRoot}/${component}`);
  const cssPath = `${transplantRoot}/presentation/screens/${modulePath}`;
  assert(
    source.includes(`import ${binding} from './presentation/screens/${modulePath}'`),
    `${component} must import its scoped ZIP CSS module.`,
  );
  assert(!source.includes('<style>'), `${component} must not inject runtime CSS.`);
  assert(!/(?:export\s+)?const\s+[A-Z_]+CSS\s*=/.test(source), `${component} retains a dead prototype CSS constant.`);
  assert(!/className=(?:"|`)|className=\{`/.test(source), `${component} contains an unscoped runtime class name.`);
  assert(sha256(cssPath) === expectedHash, `${modulePath} has drifted from the reviewed transplant.`);
}

const founding = read('components/StreamingFoundingJourney.tsx');
assert(founding.includes("import shellCss from './streaming-transplant/presentation/screens/Shell/Shell.module.css'"), 'Founding must mount the scoped Shell root.');
assert(founding.includes("className={cx(shellCss.ep2, 'streaming-complete-foundation')}"), 'Founding wizard must stay under the hashed ep2 root.');
assert(founding.includes("'--epx-ep2-brand'"), 'Founding must supply the namespaced brand token.');
assert(!founding.includes('STREAMING_PROTOTYPE_STYLE'), 'Founding must not restore the prototype global stylesheet.');

const cinematicsCss = read(`${transplantRoot}/presentation/screens/Cinematics/Cinematics.module.css`);
assert(cinematicsCss.includes('@property --epx-w2'), 'Founding signature animation must register --epx-w2.');
assert(cinematicsCss.includes('@property --epx-w3'), 'Registrar signature animation must register --epx-w3.');
assert(!cinematicsCss.includes('@property --w2'), 'The obsolete global --w2 registration must not return.');
assert(!cinematicsCss.includes('@property --w3'), 'The obsolete global --w3 registration must not return.');

const shellCss = read(`${transplantRoot}/presentation/screens/Shell/Shell.module.css`);
assert(shellCss.includes('.streamingCanonicalMap'), 'The Day-One Markets map must retain its scoped shell treatment.');
assert(shellCss.includes('.marketCountryDeck'), 'Country drill-down must retain its swipeable market-deck treatment.');
assert(shellCss.includes('.marketRegionPulse'), 'Country choices must retain their compact live regional-impact treatment.');
assert(shellCss.includes('.marketFlagArt'), 'Country cards must retain their proper flag-art treatment.');
assert(shellCss.includes('.marketEntryRulesButton'), 'Country cards must retain progressive rules-and-taxes disclosure.');
assert(shellCss.includes('.marketEntrySheet'), 'Market-entry detail must retain its mobile bottom-sheet treatment.');
assert(shellCss.includes('.candidateAvatar'), 'Canonical NPC candidate portraits must retain their scoped treatment.');
assert(shellCss.includes('@property --epx-ink'), 'The signature animation must register the namespaced --epx-ink property.');
assert(!shellCss.includes('@property --ink'), 'The Shell must not register the host game\'s global --ink color token.');
assert(shellCss.includes('--epx-deck-primary'), 'The live brand deck must retain its isolated player-selected colour contract.');
assert(shellCss.includes('.deckPhone'), 'The live brand deck must retain its streaming lock-screen product preview.');
assert(shellCss.includes('.manifestoEditor'), 'The public manifesto must retain its accessible inline editor treatment.');

// Live opening-market controls moved out of the prototype orchestrator.
// Guard the actual page and its canonical adapter instead of retired markup.
const stepMarkets = read('components/studio-finance/components/launch/StepMarkets.tsx');
const launchBridge = read('components/StreamingDefineLaunchExperience.tsx');
const flagField = read('components/studio-finance/components/FlagField.tsx');
assert(stepMarkets.includes('data.countries.filter((c) => c.region === region)'), 'Opening-market browsing must scope cards to the viewed region.');
const regionHandler = stepMarkets.match(/onClick=\{\(\) => \{\s*(setRegion\(name\)[^}]+)\}\}/)?.[1];
assert(regionHandler && !/patch\(|selectedCountryIds|addAll\(/.test(regionHandler), 'Browsing a region must not select or file its countries.');
assert(stepMarkets.includes('<FlagField') && flagField.includes('<CountryFlagSvg'), 'Opening markets must retain cross-platform SVG flags.');
assert(launchBridge.includes('getStreamingMarketEntryProfile(market.id)') && stepMarkets.includes('<CountryReport country={report}'), 'Country details must retain canonical entry consequences.');

const cinematics = read(`${transplantRoot}/StreamingCinematicsExperience.tsx`);
assert(!cinematics.includes("css['found' +"), 'Cinematic CSS module classes must not be composed into an unmapped key.');
assert(cinematics.includes('css.found') && cinematics.includes('css.rush'), 'Cinematics must apply the mapped found and rush classes independently.');

const buildout = read(`${transplantRoot}/StreamingBuildoutExperience.tsx`);
const facilities = read('services/streamingFacilities.ts');
assert(buildout.includes('const outcome = onCommit?.'), 'The Build must validate the canonical commit before playing its completion cinematic.');
assert(buildout.includes("commitResult?.next === 'BACK'"), 'A commissioned network must be able to return to HQ for its real construction wait.');
assert(buildout.includes('SHOW WHY'), 'The Build must keep engineering depth behind progressive disclosure.');
assert(buildout.includes('CORE_ORIGIN') && buildout.includes('REGIONAL_HUB') && buildout.includes('EDGE_CACHE'), 'The Build must retain the physical network roles.');
assert(facilities.includes('capacityRacks: 96'), 'A city campus must grow beyond the retired six-rack ceiling.');
assert(buildout.includes('const Rack: React.FC') && buildout.includes('<Rack n={n}'), 'Facility rooms must show server hardware instead of an oversized platform mark.');

const hq = read('components/StreamingPlatformHQ.tsx');
[
  'StreamingPlatformCommandDeck',
  'StreamingContentDesk',
  'StreamingPlatformDesk',
  'StreamingAudienceDesk',
  'StreamingBoardroom',
  'StreamingViewerApp',
  'StreamingBuildExperience',
  'StreamingFinanceRoom',
  'StreamingPremiereExperience',
  'StreamingDossierExperience',
].forEach(fragment => assert(hq.includes(`<${fragment}`), `HQ must mount ${fragment}.`));
assert(hq.includes('offer={platformOffer()}'), 'The live Platform room must receive the canonical Offer actions.');
assert(hq.includes('onInjectCapital={injectFinanceCapital}') && hq.includes('onAcceptInvestment={acceptFinanceInvestment}'), 'Studio Finance must retain canonical capital and investment transactions.');

assert(!hq.includes('StreamingMarketCommand'), 'Audience market intelligence must stay inside the ZIP Audience Desk instead of opening a parallel dashboard.');
assert(!hq.includes('showMarketCommand'), 'Audience market intelligence must not keep a duplicate navigation state.');

const audience = read(`${transplantRoot}/StreamingAudienceExperience.tsx`);
assert(audience.includes('STREAMING MARKET'), 'The ZIP Audience Desk must expose industry intelligence inside Analytics.');
assert(audience.includes('market.personas'), 'The ZIP Audience Desk must render canonical audience personas.');
assert(audience.includes('market.switching'), 'The ZIP Audience Desk must render canonical churn and switching pressure.');
assert(audience.includes('market.platforms'), 'The ZIP Audience Desk must render canonical global and regional rivals.');
assert(audience.includes('buildAtlasCountries(market?.worldCountries, marketOperations)') && audience.includes('<CountryRows'), 'The Audience atlas and region rows must retain canonical all-country market intelligence.');

assert(hq.includes('className="streaming-zip-viewport"'), 'ZIP screens must own the HQ viewport.');
assert(!hq.includes("import '../styles/streaming-transplant-host.css'"), 'The retired global host patch must not override CSS Modules.');
assert(!hq.includes('className="hq-topbar"'), 'The retired HQ header must not overlay ZIP screens.');
assert(!hq.includes('className="hq-bottom-nav"'), 'The retired HQ bottom navigation must not overlay ZIP screens.');
assert(!hq.includes('StreamingLaunchCommand'), 'The legacy Launch Command must not re-enter the transplanted HQ flow.');
assert(!hq.includes('THE SIGNAL BEGINS') && !hq.includes('Replay founding reveal'), 'The obsolete founding keynote must stay out of HQ.');
assert(hq.includes('onLaunch={commitCinematicLaunch}'), 'Premiere Night must commit through the canonical launch transaction.');

const listing = read(`${transplantRoot}/StreamingListingExperience.tsx`);
assert(listing.includes('StreamingListingCheckpoint'), 'The listing must preserve canonical resumable checkpoints.');
assert(listing.includes('seededUnit'), 'The listing must preserve deterministic grey-market variation.');
assert(listing.includes('inputs.preIpoShares'), 'The listing must read the canonical cap table instead of a hardcoded share count.');

const premiere = read(`${transplantRoot}/StreamingPremiereExperience.tsx`);
assert(premiere.includes('deterministicUnit'), 'Premiere Night must remain deterministic in the real game.');
assert(!premiere.includes('Math.random()'), 'Premiere Night must not reroll on replay.');
assert(premiere.includes('disabled={!launchAllowed}'), 'Canonical launch blockers must disable the transplanted go-live control.');

console.log(`EMPIRE+ scoped ZIP fidelity audit passed (${contracts.length} visual contracts).`);
