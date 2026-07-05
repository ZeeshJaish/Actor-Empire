import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);

const mustExist = (file) => {
  if (!exists(file)) throw new Error(`Missing ${file}`);
};

const mustInclude = (source, token, label = token) => {
  if (!source.includes(token)) throw new Error(`Missing ${label}`);
};

[
  'components/IntroFlow.tsx',
  'components/EmpireStudiozIntro.tsx',
  'components/ActorEmpireLoading.tsx',
  'components/ActorEmpireStart.tsx',
  'components/SaveSlotScreen.tsx',
  'components/CreateStarScreen.tsx',
  'components/StreamingLockedScreen.tsx',
  'components/CinemaLockedScreen.tsx',
  'styles/intro.css',
  'styles/streaming-lock.css',
  'styles/cinema-lock.css',
  'styles/fonts.css',
  'assets/logo.ts',
].forEach(mustExist);

const startMenu = read('views/StartMenu.tsx');
mustInclude(startMenu, "import IntroFlow from '../components/IntroFlow'", 'StartMenu mounts IntroFlow');
mustInclude(startMenu, 'toIntroSlots', 'StartMenu adapts save data for package slots');
mustInclude(startMenu, 'onBeginCareer', 'StartMenu handles package create-star completion');
mustInclude(startMenu, 'onPlaySlot={(slotIndex) => onSelectSlot(slotIndex + 1)}', 'StartMenu maps zero-based package slots to game slots');
mustInclude(startMenu, 'skipIntro={skipIntro}', 'StartMenu passes skipIntro into IntroFlow');
mustInclude(startMenu, 'onDeleteSlot={(slotIndex) => onDeleteSlot(slotIndex + 1)}', 'StartMenu maps package delete slots to game slots');

const introFlow = read('components/IntroFlow.tsx');
mustInclude(introFlow, 'skipIntro?: boolean', 'IntroFlow supports direct title entry');
mustInclude(introFlow, "useState<ActState>(skipIntro ? 'on lit' : '')", 'IntroFlow skips duplicate boot when requested');
mustInclude(introFlow, 'if (skipIntro) return;', 'IntroFlow does not schedule boot timers while skipped');
mustInclude(introFlow, 'pendingCreateSlot', 'IntroFlow remembers the selected empty slot');
mustInclude(introFlow, 'setPendingCreateSlot(i)', 'IntroFlow stores selected create slot');
mustInclude(introFlow, 'onDeleteSlot={onDeleteSlot}', 'IntroFlow forwards delete handler to save slots');

const saveSlotScreen = read('components/SaveSlotScreen.tsx');
mustInclude(saveSlotScreen, 'onDeleteSlot?: (slotIndex: number) => void', 'SaveSlotScreen accepts delete callback');
mustInclude(saveSlotScreen, 'slot-delete', 'SaveSlotScreen renders delete controls');
mustInclude(saveSlotScreen, 'setConfirmDeleteSlot', 'SaveSlotScreen confirms before deleting');

const lifestyle = read('views/LifestylePage.tsx');
mustInclude(lifestyle, "import StreamingLockedScreen from '../components/StreamingLockedScreen'", 'Lifestyle uses package streaming lock');
mustInclude(lifestyle, "import CinemaLockedScreen from '../components/CinemaLockedScreen'", 'Lifestyle uses package cinema lock');
mustInclude(lifestyle, "'CINEMA_CHAIN'", 'Lifestyle exposes cinema-chain view');
mustInclude(lifestyle, "setView('CINEMA_CHAIN')", 'Lifestyle routes cinema-chain card');
mustInclude(lifestyle, '<CinemaLockedScreen onBack={() => setView', 'Lifestyle renders cinema lock screen');

console.log('Actor Empire intro and locked-screen audit passed.');
