import { INITIAL_PLAYER, type Player } from '../types';
import { createDeterministicRng } from '../services/deterministicRandom';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { NPC_DATABASE } from '../services/npcLogic';

const firstDifference = (left: unknown, right: unknown, path = '$'): string | null => {
  if (Object.is(left, right)) return null;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return path;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  for (const key of keys) {
    const difference = firstDifference(leftRecord[key], rightRecord[key], `${path}.${key}`);
    if (difference) return difference;
  }
  return null;
};

const initial = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
initial.id = 'ios-long-session-soak';
initial.age = 18;
initial.currentWeek = 1;
let left = structuredClone(initial);
let right = structuredClone(initial);
const weeks = Math.max(1, Math.round(Number(process.env.IOS_SOAK_DETERMINISM_WEEKS || 104)));

for (let index = 0; index < weeks; index += 1) {
  const run = async (candidate: Player): Promise<Player> => {
    const player = { ...candidate, pendingEvent: null, pendingEvents: [] } as Player;
    const originalRandom = Math.random;
    const originalNow = Date.now;
    Math.random = createDeterministicRng(`ios-long-session:${index}:${player.age}:${player.currentWeek}`);
    Date.now = () => 4_000_000_000_000 + index;
    try { return (await processGameWeek(player)).player; }
    finally { Math.random = originalRandom; Date.now = originalNow; }
  };
  const globalNpcBefore = structuredClone(NPC_DATABASE);
  left = await run(left);
  const globalNpcAfterLeft = structuredClone(NPC_DATABASE);
  NPC_DATABASE.splice(0, NPC_DATABASE.length, ...structuredClone(globalNpcBefore));
  right = await run(right);
  const globalNpcAfterRight = structuredClone(NPC_DATABASE);
  NPC_DATABASE.splice(0, NPC_DATABASE.length, ...globalNpcAfterLeft);
  // Newly scheduled life-event options may contain fresh function closures;
  // they are deliberately absent from persisted JSON and must not count as a
  // save-state or gameplay-output difference here.
  const path = firstDifference(JSON.parse(JSON.stringify(left)), JSON.parse(JSON.stringify(right)));
  const globalNpcDifference = firstDifference(globalNpcAfterLeft, globalNpcAfterRight);
  if (path || globalNpcDifference) {
    console.error(`iOS soak fixture diverged at simulated week ${index + 1}: ${path || `NPC_DATABASE${globalNpcDifference}`}`);
    process.exitCode = 1;
    break;
  }
  if ((index + 1) % 52 === 0) console.log(`iOS soak parity checkpoint ${index + 1}/${weeks}`);
}
if (!process.exitCode) console.log(`iOS soak fixture parity passed for ${weeks} weeks.`);
