import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = path => readFileSync(path, 'utf8');
const sha256 = path => createHash('sha256').update(read(path)).digest('hex');
const transplantRoot = 'components/streaming-transplant';

const contracts = [
  ['StreamingAudienceExperience.tsx', 'AudienceDesk/AudienceDesk.module.css', 'css', '646777ce49ee534427a8de344be5a413657b303ff43779fd323a1ddc39e26531'],
  ['StreamingBoardroomExperience.tsx', 'Boardroom/Boardroom.module.css', 'css', '4018be34345f52806f7635d01aa56c654eca4c5d4cfc02aaf816efb1edd993ce'],
  ['StreamingBuildoutExperience.tsx', 'Buildout/Buildout.module.css', 'css', '4d6c91b56df4fb95384d38321d2c14ddb9cd45d31c87a37ad01415031c677bfd'],
  ['StreamingRaiseExperience.tsx', 'CapitalRaise/CapitalRaise.module.css', 'css', '79040a688789f35383c0a598467fe01c67994f1b901f34478cf210814e56d237'],
  ['StreamingCinematicsExperience.tsx', 'Cinematics/Cinematics.module.css', 'css', '081729cb462dcc01261ee508139a227c9f69cdfea6489bf01e55df66e68d8b20'],
  ['StreamingPlatformCommandDeck.tsx', 'CommandDesk/CommandDesk.module.css', 'css', 'd7983e4b263fb82cd23d04ff45948a109d7c70932c810a5b56781db83ec672a3'],
  ['StreamingContentExperience.tsx', 'ContentDesk/ContentDesk.module.css', 's', 'bc098e4e858c310c5b66dc4cbd9744c057b41d06f50da96929a4061275313f96'],
  ['StreamingStockExperience.tsx', 'LiveQuote/LiveQuote.module.css', 'css', '6a6b4970b35abb398c53e0b6c308f71acf1035a027bfbb2ad5e5e98d18f8262e'],
  ['StreamingMarketDesk.tsx', 'MarketDesk/MarketDesk.module.css', 'css', 'eb158ed6b61a99b8bb7d82a7b48165199b6a09190328864027ee4afe656da482'],
  ['StreamingNetworkExperience.tsx', 'NetworkDesk/NetworkDesk.module.css', 's', 'f5570b3db734cada14ba7b6c7a3938c0245a8eda1f2e3618d33725e3a590aac2'],
  ['StreamingPremiereExperience.tsx', 'PremiereNight/PremiereNight.module.css', 'css', '71fdcfa6219abd4909284f61f02c950fd3d70c937d830ca4a5c4ca105ea6e251'],
  ['StreamingPricingExperience.tsx', 'Pricing/Pricing.module.css', 'css', '9f0b3d0a8b9e48f965ef99bb999bca1fdb4b3983e83c70da70cb7e86dc47214e'],
  ['StreamingPrototypeOrchestrator.tsx', 'Shell/Shell.module.css', 'css', '713ad8b520585fe043248e34f91da2e79944d78a75ab99305b3c7f3ee6176da5'],
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
assert(shellCss.includes('.marketRegionImpact'), 'Country choices must retain their live regional-impact treatment.');
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
assert(buildout.includes('const outcome = onCommit?.'), 'The Build must validate the canonical commit before playing its completion cinematic.');
assert(buildout.includes("commitResult?.next === 'BACK'"), 'A commissioned network must be able to return to HQ for its real construction wait.');
assert(buildout.includes('SHOW WHY'), 'The Build must keep engineering depth behind progressive disclosure.');
assert(buildout.includes('CORE_ORIGIN') && buildout.includes('REGIONAL_HUB') && buildout.includes('EDGE_CACHE'), 'The Build must retain the physical network roles.');
assert(buildout.includes('MAX_RACKS_PER_CAMPUS = 96'), 'A city campus must grow beyond the retired six-rack ceiling.');

const hq = read('components/StreamingPlatformHQ.tsx');
[
  'StreamingPlatformCommandDeck',
  'StreamingContentDesk',
  'StreamingNetworkDesk',
  'StreamingAudienceDesk',
  'StreamingMarketCommand',
  'StreamingBoardroom',
  'StreamingViewerApp',
  'StreamingBuildExperience',
  'StreamingPricingExperience',
  'StreamingRaiseExperience',
  'StreamingPremiereExperience',
  'StreamingDossierExperience',
].forEach(fragment => assert(hq.includes(fragment), `HQ must route through ${fragment}.`));

assert(hq.includes('className="streaming-zip-viewport"'), 'ZIP screens must own the HQ viewport.');
assert(!hq.includes("import '../styles/streaming-transplant-host.css'"), 'The retired global host patch must not override CSS Modules.');
assert(!hq.includes('className="hq-topbar"'), 'The retired HQ header must not overlay ZIP screens.');
assert(!hq.includes('className="hq-bottom-nav"'), 'The retired HQ bottom navigation must not overlay ZIP screens.');
assert(!hq.includes('StreamingLaunchCommand'), 'The legacy Launch Command must not re-enter the transplanted HQ flow.');
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
