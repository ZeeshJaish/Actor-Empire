import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type {
    OwnedStreamingRivalMove,
    PlatformAiExternalCommitment,
    PlatformId,
    PlatformState,
    Player,
    StreamingRivalMoveStatus,
    StreamingRivalMoveType,
} from '../types';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../types';
import {
    STREAMING_RIVAL_MOVE_COST_MILLIONS,
    getStreamingRivalMoveCostMillions,
} from '../services/streamingCompetitiveWorld';
import {
    commitPlatformAiExternalCommitment,
    normalizePlatformAiExternalCommitments,
    reconcilePlatformAiExternalCommitmentObligations,
} from '../services/platformAi/platformAiExternalCommitments';
import { calculatePlatformAiWeeklyEconomy } from '../services/platformAi/platformAiEconomy';
import { normalizePlatformAiState } from '../services/platformAi/platformAiState';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const WEEK = 2_200;
const PLATFORM_ID: PlatformId = 'NETFLIX';

const fixture = (): Player => createPlatformAiFixture();

const platformFor = (player: Player): PlatformState => normalizePlatformAiState(
    structuredClone(player.world.platforms![PLATFORM_ID]),
    player.id,
    WEEK,
);

const move = (
    id: string,
    type: StreamingRivalMoveType,
    status: StreamingRivalMoveStatus = 'OPEN',
): OwnedStreamingRivalMove => ({
    id,
    idempotencyKey: `rival-move:${PLATFORM_ID}:${id}`,
    platformId: PLATFORM_ID,
    platformName: 'Netflix',
    ceoName: 'Mara Voss',
    type,
    battlefront: 'CONTENT',
    targetRegionId: null,
    targetTechnologyBranch: null,
    strategyReason: 'Canonical audit move.',
    playerImpact: 'Canonical audit pressure.',
    rivalPriceBefore: null,
    rivalPriceAfter: null,
    title: 'Canonical audit move',
    detail: 'The market action has already executed.',
    status,
    cashCostMillions: 999_999,
    rivalCashBeforeMillions: 1_000,
    rivalCashAfterMillions: 1,
    createdAtAbsoluteWeek: WEEK,
    pressureStartsAbsoluteWeek: WEEK + 1,
    expiresAtAbsoluteWeek: WEEK + 4,
    acquisitionRateDelta: status === 'MISFIRED' ? 0 : -0.003,
    churnRateDelta: status === 'MISFIRED' ? 0 : 0.001,
    prestigeDelta: 0,
    targetExecutiveId: null,
    targetExecutiveName: null,
    responseId: null,
    responseCost: 0,
    responseAtAbsoluteWeek: null,
    outcomeNote: status === 'MISFIRED' ? 'Spent, but missed.' : 'The market action is active.',
});

assert.equal(Object.keys(STREAMING_RIVAL_MOVE_COST_MILLIONS).length, 14);
assert.equal(getStreamingRivalMoveCostMillions('COUNTER_PROGRAM'), 38);
assert.equal(getStreamingRivalMoveCostMillions('REGION_EXPANSION'), 67);

const player = fixture();
const sourcePlatform = platformFor(player);
const sourceBefore = structuredClone(sourcePlatform);
const committed = commitPlatformAiExternalCommitment({
    player,
    platform: sourcePlatform,
    move: move('war-cost-1', 'COUNTER_PROGRAM'),
    absoluteWeek: WEEK,
});
assert.deepEqual(sourcePlatform, sourceBefore, 'External commitment ingestion must not mutate its input.');
assert.equal(committed.changed, true);
assert.equal(committed.platform.cashReserve, sourceBefore.cashReserve, 'Move creation must not directly mutate canonical cash.');
assert.equal(committed.platform.ai!.externalCommitments.length, 1);
assert.deepEqual(committed.platform.ai!.externalCommitments[0], {
    id: 'platform-war:war-cost-1',
    moveId: 'war-cost-1',
    obligationId: 'platform-war:war-cost-1',
    platformId: PLATFORM_ID,
    moveType: 'COUNTER_PROGRAM',
    pricingVersion: 1,
    outcome: 'SUCCESS',
    costMillions: 38,
    createdAtAbsoluteWeek: WEEK,
    status: 'PENDING_PAYMENT',
    settledAtAbsoluteWeek: null,
});
assert.deepEqual(
    committed.platform.ai!.pendingOneTimeObligations.find(item => item.id === 'platform-war:war-cost-1'),
    {
        id: 'platform-war:war-cost-1',
        category: 'DISCRETIONARY',
        amountMillions: 38,
        createdWeek: WEEK,
        status: 'HELD',
        settledWeek: null,
    },
);

const replay = commitPlatformAiExternalCommitment({
    player,
    platform: committed.platform,
    move: move('war-cost-1', 'COUNTER_PROGRAM'),
    absoluteWeek: WEEK,
});
assert.equal(replay.changed, false);
assert.deepEqual(replay.platform, committed.platform, 'Replaying one move must be a byte-for-byte no-op.');

const misfire = commitPlatformAiExternalCommitment({
    player,
    platform: sourcePlatform,
    move: move('war-cost-misfire', 'COUNTER_PROGRAM', 'MISFIRED'),
    absoluteWeek: WEEK,
});
assert.equal(misfire.platform.ai!.externalCommitments[0].costMillions, 38);
assert.equal(misfire.platform.ai!.externalCommitments[0].outcome, 'MISFIRED');

const tampered = normalizePlatformAiExternalCommitments([
    {
        ...committed.platform.ai!.externalCommitments[0],
        id: 'forged-id',
        obligationId: 'forged-obligation',
        costMillions: 999_999,
        platformId: 'HULU',
    },
], PLATFORM_ID);
assert.equal(tampered.length, 1);
assert.deepEqual(tampered[0], committed.platform.ai!.externalCommitments[0]);

const forgedSettlement = normalizePlatformAiExternalCommitments([{
    ...committed.platform.ai!.externalCommitments[0],
    status: 'SETTLED',
    settledAtAbsoluteWeek: WEEK + 1,
}], PLATFORM_ID, committed.platform.ai!.pendingOneTimeObligations);
assert.equal(forgedSettlement[0].status, 'PENDING_PAYMENT', 'A commitment cannot certify its own forged settlement.');

const authoritativeMove = move('war-cost-1', 'COUNTER_PROGRAM');
const tamperedMoveType = normalizePlatformAiExternalCommitments([{
    ...committed.platform.ai!.externalCommitments[0],
    moveType: 'REGION_WITHDRAWAL',
    costMillions: 4,
}], PLATFORM_ID, committed.platform.ai!.pendingOneTimeObligations, [authoritativeMove]);
assert.equal(tamperedMoveType[0].moveType, 'COUNTER_PROGRAM');
assert.equal(tamperedMoveType[0].costMillions, 38, 'Saved move type cannot rewrite the authoritative market-action cost.');
assert.equal(
    normalizePlatformAiExternalCommitments(
        committed.platform.ai!.externalCommitments,
        PLATFORM_ID,
        committed.platform.ai!.pendingOneTimeObligations,
        [],
        WEEK,
    ).length,
    0,
    'A saved commitment without an authoritative Platform Wars move must not survive.',
);
assert.equal(
    normalizePlatformAiExternalCommitments([{
        ...committed.platform.ai!.externalCommitments[0],
        pricingVersion: 999,
    }], PLATFORM_ID, committed.platform.ai!.pendingOneTimeObligations).length,
    0,
    'An unknown tariff version cannot be used to forge a historical action cost.',
);
const futureMove = move('war-cost-future', 'PRICE_CUT');
futureMove.createdAtAbsoluteWeek = WEEK + 10;
assert.equal(commitPlatformAiExternalCommitment({
    player,
    platform: sourcePlatform,
    move: futureMove,
    absoluteWeek: WEEK,
}).changed, false, 'A future-dated action cannot create a payable commitment.');

const repairedObligations = reconcilePlatformAiExternalCommitmentObligations(
    [{
        id: 'platform-war:war-cost-1',
        category: 'LOCALIZATION',
        amountMillions: 1,
        createdWeek: 0,
        status: 'SETTLED',
        settledWeek: 0,
    }],
    committed.platform.ai!.externalCommitments,
);
assert.deepEqual(
    repairedObligations.find(item => item.id === 'platform-war:war-cost-1'),
    committed.platform.ai!.pendingOneTimeObligations.find(item => item.id === 'platform-war:war-cost-1'),
    'Invalid saved payment evidence must be replaced by the canonical held obligation.',
);

const acquiredPlayer = fixture();
acquiredPlayer.ownedStreamingPlatform!.corporateDevelopment.acquiredPlatformIds = [PLATFORM_ID];
const acquiredPlatform = platformFor(acquiredPlayer);
const acquiredBefore = structuredClone(acquiredPlatform);
const acquired = commitPlatformAiExternalCommitment({
    player: acquiredPlayer,
    platform: acquiredPlatform,
    move: move('war-cost-acquired', 'PRICE_CUT'),
    absoluteWeek: WEEK,
});
assert.equal(acquired.changed, false);
assert.deepEqual(acquired.platform, acquiredBefore, 'An acquired platform must remain byte-for-byte unchanged.');

const legacy = platformFor(player);
const legacyRaw = structuredClone(legacy) as any;
legacyRaw.ai.schemaVersion = 6;
legacyRaw.ai.externalCommitments = [{
    ...committed.platform.ai!.externalCommitments[0],
    moveId: 'historical-move',
}];
const migrated = normalizePlatformAiState(legacyRaw as PlatformState, player.id, WEEK);
assert.deepEqual(migrated.ai!.externalCommitments, [], 'Schema-6 migration must not retrocharge historical moves.');
const legacyWithNewAction = commitPlatformAiExternalCommitment({
    player,
    platform: legacyRaw as PlatformState,
    move: move('war-cost-post-migration', 'PRICE_CUT'),
    absoluteWeek: WEEK,
});
assert.equal(legacyWithNewAction.platform.ai!.schemaVersion, PLATFORM_AI_RUNTIME_SCHEMA_VERSION);
assert.deepEqual(
    legacyWithNewAction.platform.ai!.externalCommitments.map(item => item.moveId),
    ['war-cost-post-migration'],
    'A new action may advance schema 6 to 7, but must not carry stray historical rows into canonical billing.',
);

const economyPlayer = fixture();
const economyBase = platformFor(economyPlayer);
const economyMove = move('war-cost-settlement', 'COUNTER_PROGRAM');
economyPlayer.ownedStreamingPlatform!.competitiveWorld.moves = [economyMove];
const economyCommit = commitPlatformAiExternalCommitment({
    player: economyPlayer,
    platform: economyBase,
    move: economyMove,
    absoluteWeek: WEEK,
}).platform;
const baseline = calculatePlatformAiWeeklyEconomy({
    player: economyPlayer,
    platform: {
        ...economyCommit,
        ai: {
            ...economyCommit.ai!,
            externalCommitments: [],
            pendingOneTimeObligations: economyCommit.ai!.pendingOneTimeObligations.filter(item => item.id !== 'platform-war:war-cost-settlement'),
        },
    },
    absoluteWeek: WEEK + 1,
});
const paid = calculatePlatformAiWeeklyEconomy({
    player: economyPlayer,
    platform: economyCommit,
    absoluteWeek: WEEK + 1,
});
assert.equal(paid.platform.ai!.externalCommitments[0].status, 'SETTLED');
assert.equal(paid.platform.ai!.externalCommitments[0].settledAtAbsoluteWeek, WEEK + 1);
assert.equal(
    Math.round((baseline.snapshot!.closingCashMillions - paid.snapshot!.closingCashMillions) * 1_000_000) / 1_000_000,
    38,
    'The next economy pass must deduct the exact canonical move cost once.',
);
const paidReplay = calculatePlatformAiWeeklyEconomy({
    player: economyPlayer,
    platform: paid.platform,
    absoluteWeek: WEEK + 2,
});
assert.equal(
    paidReplay.snapshot!.settledObligationCostMillions,
    0,
    'A settled external commitment must not charge again.',
);

const lowCashPlatform = {
    ...economyCommit,
    cashReserve: 0,
    subscribers: 0,
    ai: {
        ...economyCommit.ai!,
        financeHistory: [],
        debtMillions: 0,
        marketOperations: [],
        researchQueue: [],
    },
};
const lowCashBaseline = calculatePlatformAiWeeklyEconomy({
    player: economyPlayer,
    platform: {
        ...lowCashPlatform,
        ai: {
            ...lowCashPlatform.ai,
            externalCommitments: [],
            pendingOneTimeObligations: lowCashPlatform.ai.pendingOneTimeObligations.filter(item => item.id !== 'platform-war:war-cost-settlement'),
        },
    },
    absoluteWeek: WEEK + 1,
});
const debtFunded = calculatePlatformAiWeeklyEconomy({
    player: economyPlayer,
    platform: lowCashPlatform,
    absoluteWeek: WEEK + 1,
});
assert.equal(
    Math.round((debtFunded.snapshot!.closingDebtMillions - lowCashBaseline.snapshot!.closingDebtMillions) * 1_000_000) / 1_000_000,
    38,
    'An executed market action must debt-finance only its exact cash shortfall.',
);
assert.equal(debtFunded.platform.ai!.externalCommitments[0].status, 'SETTLED');

const pressureRows: PlatformAiExternalCommitment[] = Array.from({ length: 140 }, (_, index) => ({
    id: `platform-war:history-${index}`,
    moveId: `history-${index}`,
    obligationId: `platform-war:history-${index}`,
    platformId: PLATFORM_ID,
    moveType: 'COUNTER_PROGRAM',
    pricingVersion: 1,
    outcome: index % 2 ? 'SUCCESS' : 'MISFIRED',
    costMillions: 38,
    createdAtAbsoluteWeek: index,
    status: 'SETTLED',
    settledAtAbsoluteWeek: index + 1,
}));
pressureRows.push({
    ...pressureRows[0],
    id: 'platform-war:pending-pressure',
    moveId: 'pending-pressure',
    obligationId: 'platform-war:pending-pressure',
    createdAtAbsoluteWeek: 500,
    status: 'PENDING_PAYMENT',
    settledAtAbsoluteWeek: null,
});
const pressureObligations = pressureRows.map(commitment => ({
    id: commitment.obligationId,
    category: 'DISCRETIONARY' as const,
    amountMillions: commitment.costMillions,
    createdWeek: commitment.createdAtAbsoluteWeek,
    status: commitment.status === 'SETTLED' ? 'SETTLED' as const : 'HELD' as const,
    settledWeek: commitment.settledAtAbsoluteWeek,
}));
const bounded = normalizePlatformAiExternalCommitments(
    pressureRows,
    PLATFORM_ID,
    pressureObligations,
);
assert.equal(bounded.filter(item => item.status === 'PENDING_PAYMENT').length, 1);
assert.equal(bounded.filter(item => item.status === 'SETTLED').length, 80);
assert.equal(bounded.at(-1)?.moveId, 'pending-pressure');

const compactionFixture = fixture();
compactionFixture.ownedStreamingPlatform!.competitiveWorld.moves = pressureRows.map(commitment => ({
    ...move(
        commitment.moveId,
        commitment.moveType,
        commitment.outcome === 'MISFIRED' ? 'MISFIRED' : 'OPEN',
    ),
    createdAtAbsoluteWeek: commitment.createdAtAbsoluteWeek,
}));
const compactionPlatform = platformFor(compactionFixture);
compactionPlatform.ai!.externalCommitments = pressureRows;
compactionPlatform.ai!.pendingOneTimeObligations = pressureObligations;
compactionFixture.world.platforms![PLATFORM_ID] = compactionPlatform;
const compacted = compactPlayerForPersistence(compactionFixture);
const compactedAi = compacted.world.platforms![PLATFORM_ID].ai!;
assert.equal(compactedAi.externalCommitments.filter(item => item.status === 'PENDING_PAYMENT').length, 1);
assert.equal(compactedAi.externalCommitments.filter(item => item.status === 'SETTLED').length, 80);
assert.ok(
    compactedAi.pendingOneTimeObligations.some(item => item.id === 'platform-war:pending-pressure' && item.status === 'HELD'),
    'Compaction must preserve every pending external commitment obligation.',
);

const acquiredCompactionFixture = fixture();
acquiredCompactionFixture.ownedStreamingPlatform!.corporateDevelopment.acquiredPlatformIds = [PLATFORM_ID];
const acquiredCompactionPlatform = platformFor(acquiredCompactionFixture);
(acquiredCompactionPlatform.ai as any).schemaVersion = 6;
acquiredCompactionFixture.world.platforms![PLATFORM_ID] = acquiredCompactionPlatform;
const acquiredCompacted = compactPlayerForPersistence(acquiredCompactionFixture);
assert.deepEqual(
    acquiredCompacted.world.platforms![PLATFORM_ID],
    acquiredCompactionPlatform,
    'Save compaction must preserve an acquired platform byte-for-byte.',
);
assert.ok(
    compactedAi.externalCommitments
        .filter(item => item.status === 'SETTLED')
        .every(commitment => compactedAi.pendingOneTimeObligations.some(obligation => (
            obligation.id === commitment.obligationId
            && obligation.status === 'SETTLED'
        ))),
    'Compaction must retain matching settlement evidence for bounded commitment history.',
);
const compactedTwice = compactPlayerForPersistence(compacted);
const compactedTwiceMoveIds = new Set(
    compactedTwice.ownedStreamingPlatform!.competitiveWorld.moves.map(item => item.id),
);
assert.ok(
    compactedTwice.world.platforms![PLATFORM_ID].ai!.externalCommitments
        .every(commitment => compactedTwiceMoveIds.has(commitment.moveId)),
    'Second-round compaction must retain every authoritative move referenced by Platform AI commitments.',
);
assert.deepEqual(
    compactedTwice.world.platforms![PLATFORM_ID].ai!.externalCommitments,
    compactedAi.externalCommitments,
    'A second persistence round trip must retain the complete authoritative commitment history.',
);

const readUi = (fileName: string): string => fs.readFileSync(
    path.join(process.cwd(), 'components', fileName),
    'utf8',
);
const platformWarsSource = readUi('StreamingPlatformWars.tsx');
assert.ok(platformWarsSource.includes('StreamingPlatformBrand'), 'Platform Wars must render shared platform identities.');
assert.ok(platformWarsSource.includes('resolveStreamingPlatformBrandById'), 'Core rivals must resolve their identity from stable IDs.');
assert.ok(!platformWarsSource.includes('RIVAL_COLORS'), 'Platform Wars must not maintain a second platform-colour map.');
for (const wizardFile of ['StreamingDefineLaunchWizard.tsx', 'StreamingMarketExpansionWizard.tsx']) {
    const wizardSource = readUi(wizardFile);
    assert.ok(
        wizardSource.includes('StreamingPlatformBrand brand={rival.brand}'),
        `${wizardFile} must render the persisted summary brand for visible rivals.`,
    );
}

console.log('Platform AI Platform Wars audit passed.');
