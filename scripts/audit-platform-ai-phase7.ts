import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PlatformId } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { processStreamingIndustryWorldWeek } from '../services/platformAi';
import { DISTRESS_STAGE_ORDER } from '../services/platformAi/platformAiDistress';
import { normalizePlatformAiState } from '../services/platformAi/platformAiState';
import { getForbesStreamingCompanies } from '../services/streamingPlatformEcosystem';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const PLATFORM_IDS: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const fixture = createPlatformAiFixture();
const enteredAbsoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek) + 1;

assert.equal(
    getAbsoluteWeek(40, 52) + 1,
    getAbsoluteWeek(41, 1),
    'The entered-week contract must remain continuous across the year boundary.',
);

const inputWorld = structuredClone(fixture.world);
const first = processStreamingIndustryWorldWeek(fixture, inputWorld, enteredAbsoluteWeek);
assert.deepEqual(fixture.world, inputWorld, 'The streaming-industry coordinator must not mutate its input world.');
assert.equal(first.absoluteWeek, enteredAbsoluteWeek);
for (const platformId of PLATFORM_IDS) {
    assert.equal(
        first.world.platforms?.[platformId].ai?.lastProcessedAbsoluteWeek,
        enteredAbsoluteWeek,
        `${platformId} must settle the explicitly entered week.`,
    );
}
assert.equal(
    first.world.streamingPlatformEcosystem?.lastProcessedAbsoluteWeek,
    enteredAbsoluteWeek,
    'The global/regional/generated ecosystem must settle the same entered week.',
);
const indiaOperator = first.world.streamingPlatformEcosystem!.operators.JIOHOTSTAR;
assert.equal(
    (indiaOperator as typeof indiaOperator & { lastProcessedAbsoluteWeek?: number }).lastProcessedAbsoluteWeek,
    enteredAbsoluteWeek,
    'Every eligible non-core operator must expose its own weekly checkpoint.',
);

const forbes = getForbesStreamingCompanies({ ...fixture, world: first.world });
const netflixSummary = forbes.find(company => company.id === 'NETFLIX')! as typeof forbes[number] & Record<string, unknown>;
const indiaSummary = forbes.find(company => company.id === 'JIOHOTSTAR')! as typeof forbes[number] & Record<string, unknown>;
assert.equal(netflixSummary.cashMillions, first.world.platforms!.NETFLIX.cashReserve, 'Core Forbes cash must come from canonical Platform AI state.');
assert.equal(netflixSummary.lastProcessedAbsoluteWeek, enteredAbsoluteWeek, 'Core Forbes checkpoint must come from Platform AI.');
assert.deepEqual(netflixSummary.activeCountryIds, first.world.platforms!.NETFLIX.ai!.capabilities.activeCountryIds, 'Core Forbes markets must come from Platform AI capabilities.');
assert.equal(indiaSummary.cashMillions, indiaOperator.cashMillions, 'Regional Forbes cash must come from its saved ecosystem operator.');
assert.equal(indiaSummary.technology, indiaOperator.technology, 'Regional Forbes technology must come from its saved ecosystem operator.');
assert.equal(indiaSummary.cataloguePower, indiaOperator.cataloguePower, 'Regional Forbes catalogue power must come from its saved ecosystem operator.');
assert.equal(indiaSummary.lastProcessedAbsoluteWeek, enteredAbsoluteWeek, 'Regional Forbes checkpoint must match its operator checkpoint.');

const distressFixture = createPlatformAiFixture();
const distressPlatform = normalizePlatformAiState(
    distressFixture.world.platforms!.NETFLIX,
    distressFixture.id,
    enteredAbsoluteWeek,
);
const distressWorld = structuredClone(distressFixture.world);
distressWorld.platforms!.NETFLIX = {
    ...distressPlatform,
    cashReserve: 5,
    ai: {
        ...distressPlatform.ai!,
        status: 'DISTRESSED',
        debtMillions: 40,
        lastProcessedAbsoluteWeek: enteredAbsoluteWeek - 1,
        decisionHistory: [],
        distressEpisodes: [{
            id: 'phase7-visible-distress',
            platformId: 'NETFLIX',
            status: 'ACTIVE',
            startedAtAbsoluteWeek: enteredAbsoluteWeek - 4,
            completedAtAbsoluteWeek: null,
            currentStageIndex: 4,
            lastAdvancedAtAbsoluteWeek: enteredAbsoluteWeek - 1,
            stageResults: DISTRESS_STAGE_ORDER.slice(0, 4).map((stage, index) => ({
                stage,
                outcome: 'APPLIED' as const,
                enteredAtAbsoluteWeek: enteredAbsoluteWeek - 4 + index,
                resolvedAtAbsoluteWeek: enteredAbsoluteWeek - 4 + index,
                reason: `Prepared ${stage}.`,
                referenceId: null,
            })),
        }],
    },
};
const distressTurn = processStreamingIndustryWorldWeek(
    { ...distressFixture, world: distressWorld },
    distressWorld,
    enteredAbsoluteWeek,
);
const withdrawalDecision = distressTurn.world.platforms!.NETFLIX.ai!.decisionHistory.find(decision => (
    decision.absoluteWeek === enteredAbsoluteWeek && decision.action === 'WITHDRAW_REGION'
));
assert.ok(withdrawalDecision, 'The weekly coordinator must persist the rival distress response.');
assert.equal(
    distressTurn.news.filter(item => item.headline === withdrawalDecision.summary).length,
    1,
    'A major distress response created after economy settlement must become player-visible news exactly once.',
);

const replay = processStreamingIndustryWorldWeek(fixture, first.world, enteredAbsoluteWeek);
assert.deepEqual(replay.world, first.world, 'Replaying one streaming-industry week must be a state no-op.');
assert.deepEqual(replay.news, [], 'Replaying one streaming-industry week must emit no duplicate news.');
assert.deepEqual(replay.logs, [], 'Replaying one streaming-industry week must emit no duplicate logs.');

const acquiredPlayer = structuredClone(fixture);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredBefore = structuredClone(first.world.platforms!.NETFLIX);
const acquiredWeek = processStreamingIndustryWorldWeek(acquiredPlayer, first.world, enteredAbsoluteWeek + 1);
assert.deepEqual(
    acquiredWeek.world.platforms!.NETFLIX,
    acquiredBefore,
    'A player-controlled platform must remain byte-for-byte unchanged during the shared weekly turn.',
);
assert.equal(
    acquiredWeek.world.platforms!.HULU.ai?.lastProcessedAbsoluteWeek,
    enteredAbsoluteWeek + 1,
    'Unacquired rivals must continue processing when another platform is player-controlled.',
);

const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const calendarAdvanceIndex = gameLoopSource.indexOf('nextPlayer.currentWeek += 1');
const industryTurnIndex = gameLoopSource.indexOf('processStreamingIndustryWorldWeek(');
const ownedStreamingIndex = gameLoopSource.indexOf('processOwnedStreamingPlatformWeek(nextPlayer)');
assert.ok(calendarAdvanceIndex >= 0 && industryTurnIndex > calendarAdvanceIndex, 'Rival streaming must settle after the calendar advances.');
assert.ok(ownedStreamingIndex > industryTurnIndex, 'The rival/ecosystem coordinator must settle before the player-owned streaming report for the same entered week.');

const worldLogicSource = readFileSync(resolve(process.cwd(), 'services/worldLogic.ts'), 'utf8');
assert.equal(
    worldLogicSource.includes('processPlatformAiWorldTurn('),
    false,
    'The pre-increment general world turn must no longer run rival streaming.',
);
assert.equal(
    worldLogicSource.includes('processStreamingPlatformEcosystemTurn('),
    false,
    'The pre-increment general world turn must no longer run the streaming ecosystem.',
);

const forbesSource = readFileSync(resolve(process.cwd(), 'views/mobile/ForbesApp.tsx'), 'utf8');
for (const field of ['plat.cashMillions', 'plat.activeCountryIds', 'plat.technology', 'plat.lifecycle', 'plat.lastProcessedAbsoluteWeek']) {
    assert.ok(forbesSource.includes(field), `Forbes Stream cards must render canonical ${field.replace('plat.', '')}.`);
}
const platformWarsSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformWars.tsx'), 'utf8');
for (const field of ['company.cashMillions', 'company.activeCountryIds', 'company.technology', 'company.cataloguePower', 'company.lastProcessedAbsoluteWeek']) {
    assert.ok(platformWarsSource.includes(field), `Platform Wars challengers must render canonical ${field.replace('company.', '')}.`);
}

console.log('Platform AI Phase 7 entered-week integration audit passed.');
