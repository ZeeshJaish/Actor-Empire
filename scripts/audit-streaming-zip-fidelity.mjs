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
 *
 * Baseline moved again 2026-11-07: Zeesh approved live entries #6 to #320 in the
 * transplant request, and these stylesheets changed under them: AudienceDesk, Boardroom, Buildout, CommandDesk, ContentDesk, NetworkDesk, PremiereNight, TheListing, TitleDossier, ViewerApp.
 * Each file here is byte-identical to live's checkpoint; the screens are in the transplant's browser evidence.
 */
const contracts = [
  ['StreamingAudienceExperience.tsx', 'AudienceDesk/AudienceDesk.module.css', 'css', '6e3b804b4f1b17ddacd98fe11e9fa93ef9c06c9e5d99c17d988ad4a4241ff204'],
  ['StreamingBoardroomExperience.tsx', 'Boardroom/Boardroom.module.css', 'css', 'de6f46f66a67da4473b7fbaa122d0c80102a2f73013f9e97ee304a7991ea4a89'],
  ['StreamingBuildoutExperience.tsx', 'Buildout/Buildout.module.css', 'css', 'cc688c03fa665abf5a40bad4ae906253ef62e6a0a2bee9ab154f17a4dde66910'],
  ['StreamingRaiseExperience.tsx', 'CapitalRaise/CapitalRaise.module.css', 'css', '79040a688789f35383c0a598467fe01c67994f1b901f34478cf210814e56d237'],
  ['StreamingCinematicsExperience.tsx', 'Cinematics/Cinematics.module.css', 'css', '83cbb4bd10c9c542eee5dae809ae7132fcae84765835bb039b4d00ec0361a441'],
  ['StreamingPlatformCommandDeck.tsx', 'CommandDesk/CommandDesk.module.css', 'css', '285a2529c72b4472c95d9afa94775567e97b59e33a9fc51bb49c34083012d327'],
  ['StreamingContentExperience.tsx', 'ContentDesk/ContentDesk.module.css', 's', '90680831a26ed26dd95cfa0ee1b4c3df402ccc04ce2ce0b77235e66e47e91878'],
  ['StreamingStockExperience.tsx', 'LiveQuote/LiveQuote.module.css', 'css', '6a6b4970b35abb398c53e0b6c308f71acf1035a027bfbb2ad5e5e98d18f8262e'],
  ['StreamingMarketDesk.tsx', 'MarketDesk/MarketDesk.module.css', 'css', 'eb158ed6b61a99b8bb7d82a7b48165199b6a09190328864027ee4afe656da482'],
  ['StreamingNetworkExperience.tsx', 'NetworkDesk/NetworkDesk.module.css', 's', 'f8cf672808490725ffbb7b3aae20fdb63b27a63ef46ea71b25386acc36f66fdc'],
  ['StreamingPremiereExperience.tsx', 'PremiereNight/PremiereNight.module.css', 'css', '4065cf3dd71b321a46e4a11cb7345a065b49b006559b582e70b22426f9997bd6'],
  ['StreamingPricingExperience.tsx', 'Pricing/Pricing.module.css', 'css', '9f0b3d0a8b9e48f965ef99bb999bca1fdb4b3983e83c70da70cb7e86dc47214e'],
  ['StreamingPrototypeOrchestrator.tsx', 'Shell/Shell.module.css', 'css', 'e368a2d6f8921a5181935ff46ec50c15748dda9ba61f1520e8c172b331cdd66a'],
  ['StreamingListingExperience.tsx', 'TheListing/TheListing.module.css', 'css', 'eb1e32cfc71133d1e5fcc9599bee78bb5e36396ba6bdfe8ff584865be5d6bcd0'],
  ['StreamingDossierExperience.tsx', 'TitleDossier/TitleDossier.module.css', 'css', '3c7e82c2bda5ea011ad3e8317ef46a92ed1fdda5009e5ae675bffcdf43f39957'],
  ['StreamingViewerExperience.tsx', 'ViewerApp/ViewerApp.module.css', 'css', '319e1dfceb65bd64df2decd56117632645d3d214065b19869a6160a9f095fc42'],
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
/* #210: the money in goes through the chair's check first, then the same canonical transaction */
assert(hq.includes('onInjectCapital={amount =>') && hq.includes('result = injectFinanceCapital(amount)') && hq.includes('onAcceptInvestment={acceptFinanceInvestment}'), 'Studio Finance must retain canonical capital and investment transactions.');

assert(!hq.includes('StreamingMarketCommand'), 'Audience market intelligence must stay inside the ZIP Audience Desk instead of opening a parallel dashboard.');
assert(!hq.includes('showMarketCommand'), 'Audience market intelligence must not keep a duplicate navigation state.');

const audience = read(`${transplantRoot}/StreamingAudienceExperience.tsx`);
/* #128 to #136: the room became five tabs, so the same promises are read across its files */
const worldTab = read(`${transplantRoot}/AudienceWorldTab.tsx`);
const atlasModel = read(`${transplantRoot}/audienceRoomModel.ts`);
assert(audience.includes('AudienceWorldTab') && audience.includes('AudienceMarketsTab') && audience.includes('AudienceAnalyticsTab'), 'The Audience room must hold its analytics, market and world tabs.');
assert(worldTab.includes('market.personas'), 'The ZIP Audience Desk must render canonical audience personas.');
assert(worldTab.includes('market.streamingCompetition'), 'The ZIP Audience Desk must render canonical global and regional rivals.');
assert(audience.includes('buildAtlasCountries(market?.worldCountries, marketOperations)') && atlasModel.includes('buildAtlasCountries(market.worldCountries, operations)'), 'The Audience atlas and region rows must retain canonical all-country market intelligence.');

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
assert(premiere.includes('premiereResultFromCommit'), 'Premiere Night must remain deterministic in the real game: it presents the saved launch.');
assert(!premiere.includes('Math.random()'), 'Premiere Night must not reroll on replay.');
/* #257 moved the go-live control into Launch Control: a blocked launch cannot press it */
const launchControl = read(`${transplantRoot}/opening-night/LaunchControl.tsx`);
assert(launchControl.includes('const allowed = inputs.launchAllowed !== false') && launchControl.includes('disabled={!allowed || !pollDone || blockers > 0}'), 'Canonical launch blockers must disable the transplanted go-live control.');

console.log(`EMPIRE+ scoped ZIP fidelity audit passed (${contracts.length} visual contracts).`);
