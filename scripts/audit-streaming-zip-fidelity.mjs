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
  ['StreamingAudienceExperience.tsx', 'AudienceDesk/AudienceDesk.module.css', 'css', 'adf03c78cebf082ac4d76cf52e020194464d81b5d12db397634eb7a2619345b2'],
  ['StreamingBoardroomExperience.tsx', 'Boardroom/Boardroom.module.css', 'css', '4018be34345f52806f7635d01aa56c654eca4c5d4cfc02aaf816efb1edd993ce'],
  ['StreamingBuildoutExperience.tsx', 'Buildout/Buildout.module.css', 'css', '1fe7bbd37256959b4b8711b2b3bcc2f933651af5075cae03f5429ef677e86b7a'],
  ['StreamingRaiseExperience.tsx', 'CapitalRaise/CapitalRaise.module.css', 'css', '79040a688789f35383c0a598467fe01c67994f1b901f34478cf210814e56d237'],
  ['StreamingCinematicsExperience.tsx', 'Cinematics/Cinematics.module.css', 'css', '081729cb462dcc01261ee508139a227c9f69cdfea6489bf01e55df66e68d8b20'],
  ['StreamingPlatformCommandDeck.tsx', 'CommandDesk/CommandDesk.module.css', 'css', '48a807b437c19a46a503b5222eaaddaee76d37bbb160399bc0c1a0c6fea9512f'],
  ['StreamingContentExperience.tsx', 'ContentDesk/ContentDesk.module.css', 's', 'bc098e4e858c310c5b66dc4cbd9744c057b41d06f50da96929a4061275313f96'],
  ['StreamingStockExperience.tsx', 'LiveQuote/LiveQuote.module.css', 'css', '6a6b4970b35abb398c53e0b6c308f71acf1035a027bfbb2ad5e5e98d18f8262e'],
  ['StreamingMarketDesk.tsx', 'MarketDesk/MarketDesk.module.css', 'css', 'eb158ed6b61a99b8bb7d82a7b48165199b6a09190328864027ee4afe656da482'],
  ['StreamingNetworkExperience.tsx', 'NetworkDesk/NetworkDesk.module.css', 's', 'a8586a6f159044192a00a55074877df6bb3e51082ad983e0967144b57d3a967d'],
  ['StreamingPremiereExperience.tsx', 'PremiereNight/PremiereNight.module.css', 'css', '71fdcfa6219abd4909284f61f02c950fd3d70c937d830ca4a5c4ca105ea6e251'],
  ['StreamingPricingExperience.tsx', 'Pricing/Pricing.module.css', 'css', '9f0b3d0a8b9e48f965ef99bb999bca1fdb4b3983e83c70da70cb7e86dc47214e'],
  ['StreamingPrototypeOrchestrator.tsx', 'Shell/Shell.module.css', 'css', 'ec2ef091b92ae74dfa75ebea01a89b3f83e622737dbc42a251343c41eb66c529'],
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

const shell = read(`${transplantRoot}/StreamingPrototypeOrchestrator.tsx`);
assert(shell.includes('showPreview={false}'), 'The generic region-preview footer must stay removed from Day-One Markets.');
assert(shell.includes('activeRegionId={activeMarketRegion}'), 'The map must visually separate the viewed region from selected launch regions.');
assert(!shell.includes('if (!ids.some(id => marketIds.includes(id)))'), 'Browsing a map region must never auto-select every country.');
assert(shell.includes('StreamingCountryFlagArt'), 'Day-One Markets must render cross-platform SVG flags instead of emoji.');
assert(shell.includes('getStreamingMarketEntryProfile'), 'Day-One Markets must expose stable game-world entry consequences.');

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
  'StreamingNetworkDesk',
  'StreamingAudienceDesk',
  'StreamingBoardroom',
  'StreamingViewerApp',
  'StreamingBuildExperience',
  'StreamingPricingExperience',
  'StreamingRaiseExperience',
  'StreamingPremiereExperience',
  'StreamingDossierExperience',
].forEach(fragment => assert(hq.includes(fragment), `HQ must route through ${fragment}.`));

assert(!hq.includes('StreamingMarketCommand'), 'Audience market intelligence must stay inside the ZIP Audience Desk instead of opening a parallel dashboard.');
assert(!hq.includes('showMarketCommand'), 'Audience market intelligence must not keep a duplicate navigation state.');

const audience = read(`${transplantRoot}/StreamingAudienceExperience.tsx`);
assert(audience.includes('STREAMING MARKET'), 'The ZIP Audience Desk must expose industry intelligence inside Analytics.');
assert(audience.includes('market.personas'), 'The ZIP Audience Desk must render canonical audience personas.');
assert(audience.includes('market.switching'), 'The ZIP Audience Desk must render canonical churn and switching pressure.');
assert(audience.includes('market.platforms'), 'The ZIP Audience Desk must render canonical global and regional rivals.');
assert(audience.includes('market.countries'), 'The ZIP Audience Regions tab must retain country-level market intelligence.');

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
