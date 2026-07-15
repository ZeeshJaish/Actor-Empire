import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { generateLegalHearing } from '../services/lifeEventLogic';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { processGameWeek } from '../services/gameLoop';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const player = JSON.parse(JSON.stringify(INITIAL_PLAYER)) as Player;
player.age = 27;
player.currentWeek = 34;
player.flags = {
  ...(player.flags || {}),
  activeCases: [{
    id: 'case_week_save_qa',
    title: 'Studio Contract Review',
    description: 'A routine legal hearing.',
    currentHearing: 1,
    totalHearings: 2,
    nextHearingWeek: 35,
    evidenceStrength: 52,
    playerDefense: 58,
    status: 'ACTIVE',
    history: [],
  }],
};

const hearing = generateLegalHearing(player, 'case_week_save_qa');
assert(hearing, 'Legal hearing generator should create an event for an active case.');
assert(typeof hearing!.options[0]?.impact === 'function', 'Live legal hearing must retain its choice impacts before persistence.');

player.scheduledEvents = [{
  id: 'hearing_case_week_save_qa_1',
  week: 35,
  type: 'LEGAL_HEARING',
  title: hearing!.title,
  data: { caseId: 'case_week_save_qa', lifeEvent: hearing },
}];

const compacted = compactPlayerForPersistence(player);
const savedHearing = compacted.scheduledEvents[0];
assert(savedHearing?.data?.caseId === 'case_week_save_qa', 'Persistence must keep the legal case id.');
assert(
  typeof savedHearing?.data?.lifeEvent?.options?.[0]?.impact === 'undefined',
  'Persistence must strip event callbacks before IndexedDB writes.'
);
assert(typeof structuredClone === 'function', 'Node structuredClone is required for this audit.');
structuredClone(compacted);

const scheduledPlayer = JSON.parse(JSON.stringify(INITIAL_PLAYER)) as Player;
scheduledPlayer.age = 27;
scheduledPlayer.currentWeek = 34;
scheduledPlayer.flags = {
  ...(scheduledPlayer.flags || {}),
  activeCases: [{
    id: 'case_scheduled_week_qa',
    title: 'Release Contract Hearing',
    description: 'A hearing scheduled through Age Up Week.',
    currentHearing: 1,
    totalHearings: 2,
    nextHearingWeek: 35,
    evidenceStrength: 45,
    playerDefense: 60,
    status: 'ACTIVE',
    history: [],
  }],
};

const weeklyResult = await processGameWeek(scheduledPlayer);
const scheduledHearing = weeklyResult.player.scheduledEvents.find(event => event.id === 'hearing_case_scheduled_week_qa_1');
assert(scheduledHearing, 'Age Up Week should schedule the legal hearing.');
assert(scheduledHearing?.data?.caseId === 'case_scheduled_week_qa', 'Scheduled legal hearing must preserve its case id.');
assert(!scheduledHearing?.data?.lifeEvent, 'Scheduled legal hearing must not carry a live callback event.');

const persistedWeek = compactPlayerForPersistence(weeklyResult.player);
structuredClone(persistedWeek);

const rebuiltHearing = generateLegalHearing(persistedWeek, scheduledHearing!.data.caseId);
assert(typeof rebuiltHearing?.options[0]?.impact === 'function', 'Opening the saved hearing must rebuild its real choice behavior.');
const resolvedHearing = rebuiltHearing!.options[0].impact!(structuredClone(persistedWeek));
assert(resolvedHearing.updatedPlayer.flags.activeCases?.[0]?.playerDefense === 70, 'Legal choice should retain its original player-defense effect.');
structuredClone(compactPlayerForPersistence(resolvedHearing.updatedPlayer));

let multiWeekPlayer = JSON.parse(JSON.stringify(INITIAL_PLAYER)) as Player;
multiWeekPlayer.age = 33;
multiWeekPlayer.currentWeek = 14;
multiWeekPlayer.flags = {
  ...(multiWeekPlayer.flags || {}),
  pendingFeedback: [{ type: 'GOVT_AUDIT', weeksLeft: 1 }],
  activeCases: [{
    id: 'case_multi_week_qa',
    title: 'Multi-week Hearing',
    description: 'Persistence coverage for queued event systems.',
    currentHearing: 1,
    totalHearings: 2,
    nextHearingWeek: 15,
    evidenceStrength: 48,
    playerDefense: 55,
    status: 'ACTIVE',
    history: [],
  }],
};

for (let tick = 0; tick < 8; tick += 1) {
  const result = await processGameWeek(multiWeekPlayer);
  const persistedTick = compactPlayerForPersistence(result.player);
  structuredClone(persistedTick);
  assert(
    persistedTick.currentWeek !== multiWeekPlayer.currentWeek || persistedTick.age !== multiWeekPlayer.age,
    `Week ${tick + 1} should advance before its persistence check.`
  );
  multiWeekPlayer = persistedTick;
}

const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const modal = readFileSync('components/LifeEventModal.tsx', 'utf8');
assert(
  gameLoop.includes('data: { caseId: c.id, hearing: c.currentHearing }'),
  'Legal hearings must schedule plain data instead of a live event callback.'
);
assert(
  modal.includes('generateLegalHearing(player, legalCaseId)'),
  'Legal hearing actions must be rebuilt when the modal opens.'
);

console.log('Week processing save safety audit passed.');
