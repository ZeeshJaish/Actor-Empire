import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { preparePlatformAiLaunchMarketingWeek } from '../services/platformAi/platformAiLaunchMarketing';
import {
  getPlatformAiNormalizationDiagnostics,
  normalizePlatformAiState,
  resetPlatformAiNormalizationDiagnostics,
} from '../services/platformAi/platformAiState';
import { settlePlatformAiEconomy } from '../services/platformAi/platformAiEconomy';
import { processPlatformAiWorldTurn } from '../services/platformAi/platformAiTurn';

const absoluteWeek = 240;
const player = structuredClone(INITIAL_PLAYER);
const source = player.world.platforms?.NETFLIX;
assert.ok(source, 'Netflix fixture must exist.');

const platform = normalizePlatformAiState(source, player.id, absoluteWeek);
const prepared = preparePlatformAiLaunchMarketingWeek({ player, platform, absoluteWeek });

assert.equal(prepared.changed, true, 'An uncovered active market should receive one launch campaign.');
assert.ok(prepared.discretionaryCostMillions > 0, 'A paid AI campaign must enter the economy ledger.');
assert.ok(prepared.platform.ai?.launchMarketingHistory?.length, 'The AI campaign must persist its forecast evidence.');
assert.deepEqual(
  prepared.coveredCountryIds,
  [...prepared.coveredCountryIds].sort(),
  'Campaign country coverage must be canonical and deterministic.',
);
const roundTripped = normalizePlatformAiState(
  JSON.parse(JSON.stringify(prepared.platform)),
  player.id,
  absoluteWeek,
);
assert.deepEqual(
  roundTripped.ai?.launchMarketingHistory,
  prepared.platform.ai?.launchMarketingHistory,
  'AI campaign history must survive a JSON save and normalization round trip.',
);

const settled = settlePlatformAiEconomy({
  player,
  platform: prepared.platform,
  absoluteWeek,
  discretionaryCostMillions: prepared.discretionaryCostMillions,
});
assert.ok(
  settled.platform.ai?.pendingAudienceSettlements.some(item => item.status === 'PENDING'),
  'A funded AI campaign must queue its acquisition through the canonical audience-settlement ledger.',
);
assert.equal(
  settled.snapshot?.discretionaryCostAccruedMillions,
  prepared.discretionaryCostMillions,
  'AI marketing must be accrued through the canonical discretionary-cost ledger.',
);
const nextWeekPrepared = preparePlatformAiLaunchMarketingWeek({
  player,
  platform: settled.platform,
  absoluteWeek: absoluteWeek + 1,
});
const nextWeekSettled = settlePlatformAiEconomy({
  player,
  platform: nextWeekPrepared.platform,
  absoluteWeek: absoluteWeek + 1,
  discretionaryCostMillions: nextWeekPrepared.discretionaryCostMillions,
});
assert.ok(
  nextWeekSettled.platform.subscribers > platform.subscribers,
  'Queued campaign acquisition must settle into the platform audience on the following canonical week.',
);

const replay = preparePlatformAiLaunchMarketingWeek({
  player,
  platform: prepared.platform,
  absoluteWeek,
});
assert.equal(replay.changed, false, 'The same campaign week must be idempotent.');
assert.equal(replay.discretionaryCostMillions, 0);

let completedPlatform = prepared.platform;
const scheduledWeeks = prepared.platform.ai!.launchMarketingHistory[0].weeklyScheduleMillions.length;
for (let offset = 1; offset < scheduledWeeks; offset += 1) {
  completedPlatform = preparePlatformAiLaunchMarketingWeek({
    player,
    platform: completedPlatform,
    absoluteWeek: absoluteWeek + offset,
  }).platform;
}
const afterCompletion = preparePlatformAiLaunchMarketingWeek({
  player,
  platform: completedPlatform,
  absoluteWeek: absoluteWeek + scheduledWeeks,
});
assert.equal(afterCompletion.changed, false, 'Covered countries must not receive a second launch campaign.');
assert.equal(afterCompletion.discretionaryCostMillions, 0);

const turnPlayer = structuredClone(INITIAL_PLAYER);
resetPlatformAiNormalizationDiagnostics();
const worldTurn = processPlatformAiWorldTurn(turnPlayer, turnPlayer.world, absoluteWeek);
const netflixAfterTurn = worldTurn.world.platforms?.NETFLIX;
assert.ok(netflixAfterTurn?.ai?.launchMarketingHistory.length, 'The canonical AI world turn must invoke launch marketing.');
assert.ok(
  (netflixAfterTurn.ai.financeHistory.at(-1)?.discretionaryCostAccruedMillions || 0) > 0,
  'The canonical AI world turn must put this week marketing instalment into finance history.',
);
processPlatformAiWorldTurn(
  { ...turnPlayer, world: worldTurn.world },
  worldTurn.world,
  absoluteWeek + 1,
);
const turnDiagnostics = getPlatformAiNormalizationDiagnostics();
assert.ok(
  turnDiagnostics.deepValidationCount <= 5,
  `Marketing must preserve the trusted in-memory AI platform handoff across consecutive turns: ${JSON.stringify(turnDiagnostics)}`,
);

console.log('Platform AI launch marketing integration audit passed.');
