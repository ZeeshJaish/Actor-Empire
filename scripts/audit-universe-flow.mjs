#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  greenlight: read('views/lifestyle/business/GreenlightWizard.tsx'),
  developmentLab: read('views/lifestyle/business/DevelopmentLab.tsx'),
  productionHouse: read('views/lifestyle/business/ProductionHouseGame.tsx'),
  releaseWizard: read('views/lifestyle/business/ReleaseWizard.tsx'),
  universeLogic: read('services/universeLogic.ts'),
  gameLoop: read('services/gameLoop.ts'),
  homePage: read('views/HomePage.tsx'),
  types: read('types.ts'),
};

const failures = [];
let checks = 0;

const check = (name, condition) => {
  checks += 1;
  if (!condition) failures.push(name);
};

const has = (file, text) => files[file].includes(text);
const matches = (file, pattern) => pattern.test(files[file]);

const normalizeKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const getCharacterOptionValue = (character, fallbackFranchise = 'franchise') => {
  const characterKey = normalizeKey(character.characterId || character.id || character.name || '');
  if (character.sourceUniverseId) return `UNIVERSE:${character.sourceUniverseId}:${characterKey}`;
  return `${character.sourceType || 'FRANCHISE'}:${character.sourceFranchiseId || fallbackFranchise}:${characterKey}`;
};

const visibleCharacterOptions = ({ previous = [], activeUniverse = [], otherOwned = [], intent = 'SOLO', selectedValues = [], currentValue = '' }) => {
  const allowsOutsideConnectedCharacters = intent === 'CROSSOVER' || intent === 'EVENT';
  const linked = [...previous, ...activeUniverse, ...(allowsOutsideConnectedCharacters ? otherOwned : [])];
  const used = new Set(selectedValues.filter(Boolean));
  return linked.filter((character) => {
    const value = getCharacterOptionValue(character);
    return value === currentValue || !used.has(value);
  }).map(getCharacterOptionValue);
};

const previous = [
  { characterId: 'sultan', name: 'Sultan', sourceType: 'FRANCHISE', sourceFranchiseId: 'midnight' },
  { characterId: 'anushka', name: 'Anushka', sourceType: 'FRANCHISE', sourceFranchiseId: 'midnight' },
];
const activeUniverse = [
  { characterId: 'chani', name: 'Chani', sourceUniverseId: 'arrakis_saga', sourceType: 'UNIVERSE' },
];
const otherOwned = [
  { characterId: 'batman', name: 'Batman', sourceUniverseId: 'dc_universe', sourceType: 'UNIVERSE' },
];

const soloOptions = visibleCharacterOptions({
  previous,
  activeUniverse: [],
  otherOwned,
  intent: 'SOLO',
  selectedValues: ['FRANCHISE:midnight:anushka'],
});
check('fixture: sequel solo keeps previous franchise characters available', soloOptions.includes('FRANCHISE:midnight:sultan'));
check('fixture: sequel solo hides characters already selected in another cast slot', !soloOptions.includes('FRANCHISE:midnight:anushka'));
check('fixture: sequel solo does not expose other owned universes', !soloOptions.includes('UNIVERSE:dc_universe:batman'));

const ownSlotOptions = visibleCharacterOptions({
  previous,
  intent: 'SOLO',
  selectedValues: ['FRANCHISE:midnight:anushka'],
  currentValue: 'FRANCHISE:midnight:anushka',
});
check('fixture: selected character remains visible in its own cast slot', ownSlotOptions.includes('FRANCHISE:midnight:anushka'));

const crossoverOptions = visibleCharacterOptions({
  previous,
  activeUniverse,
  otherOwned,
  intent: 'CROSSOVER',
});
check('fixture: crossover exposes other owned connected IP characters', crossoverOptions.includes('UNIVERSE:dc_universe:batman'));
check('fixture: crossover still keeps current franchise continuity characters', crossoverOptions.includes('FRANCHISE:midnight:sultan'));

const universeSoloOptions = visibleCharacterOptions({
  activeUniverse,
  otherOwned,
  intent: 'SOLO',
});
check('fixture: universe solo exposes selected universe roster', universeSoloOptions.includes('UNIVERSE:arrakis_saga:chani'));
check('fixture: universe solo blocks unrelated owned universes', !universeSoloOptions.includes('UNIVERSE:dc_universe:batman'));

check('types: scripts store connected project intent', has('types', "connectedProjectIntent?: 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';"));
check('types: project details store franchise id', has('types', 'franchiseId?: string;'));
check('types: project details store returning talent', has('types', 'returningTalent?: {'));

check('greenlight: story connection info state exists', has('greenlight', 'showStoryConnectionInfo'));
check('greenlight: character flow info state exists', has('greenlight', 'showCharacterFlowInfo'));
check('greenlight: previous franchise installments are detected', has('greenlight', 'previousFranchiseInstallments'));
check('greenlight: previous movie characters become options', has('greenlight', 'previousCharacterOptions'));
check('greenlight: outside owned IP is gated to crossover/event', has('greenlight', "return intent === 'CROSSOVER' || intent === 'EVENT'"));
check('greenlight: linked options only include active universe unless crossover/event', has('greenlight', 'universe.id === activeUniverseId || allowsOutsideConnectedCharacters'));
check('greenlight: character option values include universe source', has('greenlight', 'UNIVERSE:${character.sourceUniverseId}:${characterKey}'));
check('greenlight: cast slot filters already-used known characters', has('greenlight', 'usedCharacterValues'));
check('greenlight: selected character remains selectable in its own slot', has('greenlight', 'value === selectedCharacterValue || !usedCharacterValues.has(value)'));
check('greenlight: attach linked character writes actor and salary', matches('greenlight', /actorId: actorId \|\| role\.actorId[\s\S]+salary: actorId \? salary : role\.salary/));
check('greenlight: linked character negotiation is added when needed', has('greenlight', 'setCurrentReturningTalent(prev =>'));
check('greenlight: sequel prefill restores director from previous installment', has('greenlight', 'details.directorId && !directorToSet'));
check('greenlight: returning director is inserted into negotiation list', has('greenlight', "role: 'DIRECTOR'"));
check('greenlight: available directors includes selected or returning director', has('greenlight', 'requiredDirectorId'));
check('greenlight: sequel cast prefill preserves character ids', has('greenlight', 'characterId: c.characterId'));
check('greenlight: sequel cast prefill preserves source universe ids', has('greenlight', 'sourceUniverseId: c.sourceUniverseId'));
check('greenlight: crossover requires known cast', has('greenlight', "effectiveConnectedIntent === 'CROSSOVER' && linkedUniverseCastCount < 1"));
check('greenlight: event requires three known cast', has('greenlight', "effectiveConnectedIntent === 'EVENT' && linkedUniverseCastCount < 3"));
check('greenlight: final project stores connected intent', has('greenlight', 'connectedProjectIntent: effectiveConnectedIntent'));
check('greenlight: final project stores linked known cast count', has('greenlight', 'linkedUniverseCastCount'));

check('production house: sequel script stores franchise id', has('productionHouse', 'franchiseId: project.franchiseId || project.id'));
check('production house: sequel script stores returning talent', has('productionHouse', 'returningTalent,'));
check('production house: sequel script marks sequel source material', has('productionHouse', "sourceMaterial: isSpinoff ? 'SPINOFF' : 'SEQUEL'"));
check('production house: sequel concept pre-fills cast', has('productionHouse', 'newConcept.castList = details.castList.map'));
check('production house: sequel prefill preserves character id', has('productionHouse', 'characterId: c.characterId'));
check('production house: sequel prefill preserves source universe id', has('productionHouse', 'sourceUniverseId: c.sourceUniverseId'));

check('release: release normalizes universe map before roster merge', has('releaseWizard', 'normalizeUniverseMap(updatedPlayer.world?.universes || {})'));
check('release: release merges final cast into universe roster', has('releaseWizard', 'mergeUniverseRosterWithProject('));
check('game loop: weekly simulation normalizes universes', has('gameLoop', 'normalizeUniverseMap(nextPlayer.world.universes)'));
check('game loop: weekly simulation updates universe release activity', has('gameLoop', 'getUniverseReleaseActivity'));

check('universe logic: alias keys support legacy and current ids', has('universeLogic', 'getUniverseCharacterKeyAliases'));
check('universe logic: roster lookup uses aliases', has('universeLogic', 'findUniverseRosterMatch'));
check('universe logic: roster builder detects recasts', has('universeLogic', 'wasRecast'));
check('universe logic: roster merge builds from project cast', has('universeLogic', 'mergeUniverseRosterWithProject'));
check('universe logic: market share changes over time', has('universeLogic', 'updated.marketShare = Math.min'));

check('development lab: universe reads are normalized', has('developmentLab', 'normalizeUniverseMap(player.world?.universes || {})'));
check('development lab: dashboard builds normalized roster', has('developmentLab', 'buildUniverseRoster(universe, universeProjects, player.name)'));
check('development lab: continuity risk is shown', has('developmentLab', 'continuityRisk'));
check('development lab: franchise/universe market share is calculated', has('developmentLab', 'marketShare'));

check('cheat menu: naming flow kit exists', has('homePage', 'Naming Flow Kit'));
check('cheat menu: arrakis universe fixture exists', has('homePage', 'Arrakis Saga'));
check('cheat menu: sequel script fixture exists', has('homePage', 'Dune: Part Three'));

if (failures.length > 0) {
  console.error(`Universe flow audit failed (${failures.length}/${checks} failed):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Universe flow audit passed (${checks} checks).`);
