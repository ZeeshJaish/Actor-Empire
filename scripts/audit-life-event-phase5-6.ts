import assert from 'node:assert/strict';
import {
    INITIAL_PLAYER,
    type LifeEvent,
    type Player,
    type ScheduledEvent,
} from '../types';
import { resolveLifeEventChoice } from '../services/lifeEventResolver';
import { commitLifeEventResolutionTransaction } from '../services/lifeEventResolutionTransaction';

const playerFixture = (id: string): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = id;
    player.money = 500_000;
    player.logs = [];
    player.pendingEvents = [];
    return player;
};

const eventFixture = (id: string, lifeEvent: LifeEvent, data: Record<string, unknown> = {}): ScheduledEvent => ({
    id,
    week: 1,
    type: 'LIFE_EVENT',
    title: lifeEvent.title,
    data: { ...data, lifeEvent },
});

// Break caught: legacy audits with structured penalty data must not lose their exact money effect.
const auditPlayer = playerFixture('legacy-audit-player');
const legacyAudit: LifeEvent = {
    id: 'audit_legacy_1700000000000',
    type: 'SCANDAL',
    title: 'Government Audit',
    description: 'Legacy callback was stripped.',
    options: [{
        label: 'Pay the penalty',
        labelKey: 'life.event.audit.government.pay.label',
        textVars: { penalty: '$175,432' },
    }],
};
const legacyAuditEvent = eventFixture('audit_legacy_1700000000000', legacyAudit);
const auditResult = resolveLifeEventChoice(auditPlayer, legacyAuditEvent, legacyAudit, legacyAudit.options[0], 0);
assert(auditResult);
assert.equal(auditResult.resolutionKind, 'LEGACY_RECONSTRUCTED');
assert.equal(auditResult.updatedPlayer.money, 324_568);
assert.equal(auditResult.logKey, 'life.event.audit.government.pay.log');

const resolveTaggedLegacyChoice = (
    player: Player,
    tagData: Record<string, unknown>,
    optionId: string,
) => {
    const lifeEvent: LifeEvent = {
        id: `legacy-${optionId.toLowerCase()}`,
        type: 'LEGAL',
        title: 'Recoverable legacy event',
        description: 'Structured identifiers are still available.',
        options: [{ id: optionId, label: optionId }],
    };
    const event = eventFixture(`event-${optionId.toLowerCase()}`, lifeEvent, tagData);
    return resolveLifeEventChoice(player, event, lifeEvent, lifeEvent.options[0], 0);
};

// Break caught: tagged acquisition-world events must be rebuilt from IDs, never display text.
const worldPlayer = playerFixture('legacy-world-player');
worldPlayer.flags.worldReactionState = {
    lastProcessedWeek: 1,
    controlledStudioCount: 2,
    controlledMajorStudioCount: 1,
    antiMonopolyPressure: 60,
    rivalRetaliationRisk: 10,
    employeeDepartureRisk: 10,
    investorConfidence: 50,
    acquisitionDebtPressure: 0,
    valuationPressure: 0,
    franchiseValuePressure: 0,
};
const worldResult = resolveTaggedLegacyChoice(
    worldPlayer,
    { worldReactionEventType: 'ANTI_MONOPOLY_PRESSURE' },
    'FIGHT_PUBLICLY',
);
assert(worldResult);
assert.equal(worldResult.resolutionKind, 'LEGACY_RECONSTRUCTED');
assert.equal(worldResult.updatedPlayer.stats.fame, 2);
assert.equal(worldResult.updatedPlayer.flags.worldReactionState.antiMonopolyPressure, 66);

const regulatorPlayer = playerFixture('legacy-regulator-player');
regulatorPlayer.flags.regulatorPressureState = {
    lastProcessedWeek: 1,
    pressureScore: 70,
    status: 'FORMAL_REVIEW',
    controlledStudioCount: 2,
    controlledMajorStudioCount: 1,
    controlledTakeoverCount: 1,
    acquisitionMoratoriumWeeksRemaining: 0,
    reviewCooldownWeeksRemaining: 0,
    conductAgreementWeeksRemaining: 0,
    acquisitionCostMultiplier: 1,
    investorConfidencePenalty: 0,
    reviewCount: 1,
    finesPaidToDate: 0,
};
const regulatorResult = resolveTaggedLegacyChoice(
    regulatorPlayer,
    { regulatorPressureEventType: 'REGULATOR_REVIEW' },
    'FIGHT_REVIEW',
);
assert(regulatorResult);
assert.equal(regulatorResult.resolutionKind, 'LEGACY_RECONSTRUCTED');
assert.equal(regulatorResult.updatedPlayer.money, 0);
assert.equal(regulatorResult.updatedPlayer.stats.fame, 2);
assert.equal(regulatorResult.updatedPlayer.flags.regulatorPressureState.pressureScore, 8);

const talentPlayer = playerFixture('legacy-talent-player');
talentPlayer.flags.talentInstabilityState = {
    lastProcessedWeek: 1,
    pressureScore: 60,
    departureRisk: 70,
    controlledStudioCount: 2,
    acquiredStudioCount: 2,
    averageMorale: 45,
    retentionShieldWeeksRemaining: 0,
    departures: [],
};
const talentResult = resolveTaggedLegacyChoice(
    talentPlayer,
    { talentInstabilityEventType: 'RETENTION_CRISIS' },
    'RETENTION_PACKAGE',
);
assert(talentResult);
assert.equal(talentResult.resolutionKind, 'LEGACY_RECONSTRUCTED');
assert.equal(talentResult.updatedPlayer.money, 0);
assert.equal(talentResult.updatedPlayer.flags.talentInstabilityState.departureRisk, 0);

const rivalPlayer = playerFixture('legacy-rival-player');
rivalPlayer.flags.rivalRetaliationState = {
    lastProcessedWeek: 1,
    retaliationScore: 60,
    activeCounterBidCount: 0,
    negativePressHeat: 50,
    dealChallengeWeeksRemaining: 0,
    defensiveAllianceCount: 0,
    pressureShieldWeeksRemaining: 0,
    actions: [],
};
const rivalResult = resolveTaggedLegacyChoice(
    rivalPlayer,
    { rivalRetaliationEventType: 'NEGATIVE_PRESS_LEAK' },
    'PUBLIC_COUNTERMOVE',
);
assert(rivalResult);
assert.equal(rivalResult.resolutionKind, 'LEGACY_RECONSTRUCTED');
assert.equal(rivalResult.updatedPlayer.stats.fame, 2);
assert.equal(rivalResult.updatedPlayer.heat, 5);
assert.equal(rivalResult.updatedPlayer.flags.rivalRetaliationState.retaliationScore, 8);

const shareholderPlayer = playerFixture('legacy-shareholder-player');
shareholderPlayer.stocks = [{
    id: 'stock-legacy',
    symbol: 'LEG',
    name: 'Legacy Pictures',
    sector: 'MEDIA',
    price: 100,
    volatility: 0.2,
    dividendYield: 0,
    priceHistory: [100],
    lastDividendPayoutWeek: 0,
}];
shareholderPlayer.shareholderVotes = [{
    id: 'vote-legacy',
    stockId: 'stock-legacy',
    stockSymbol: 'LEG',
    companyName: 'Legacy Pictures',
    type: 'CEO_CONFIDENCE',
    title: 'Board confidence vote',
    summary: 'Board proposal',
    stakes: ['Leadership stability'],
    status: 'OPEN',
    expectedSupport: 55,
    playerVotingPower: 10,
    createdWeek: shareholderPlayer.currentWeek,
    createdYear: shareholderPlayer.age,
    dueWeek: shareholderPlayer.currentWeek + 4,
    dueYear: shareholderPlayer.age,
} as Player['shareholderVotes'][number]];
const shareholderResult = resolveTaggedLegacyChoice(
    shareholderPlayer,
    { stockDecisionType: 'SHAREHOLDER_VOTE', voteId: 'vote-legacy' },
    'VOTE_FOR',
);
assert(shareholderResult);
assert.equal(shareholderResult.resolutionKind, 'LEGACY_RECONSTRUCTED');
assert.equal(shareholderResult.updatedPlayer.shareholderVotes[0].status, 'RESOLVED');
assert.equal(shareholderResult.updatedPlayer.shareholderVotes[0].selectedVote, 'FOR');

// Break caught: unknown old events must never receive guessed financial/stat mutations.
const unknownPlayer = playerFixture('legacy-unknown-player');
unknownPlayer.relationships = [{
    id: 'partner-1',
    npcId: 'npc-1',
    name: 'Alex',
    relation: 'Partner',
    closeness: 80,
    image: '',
    lastInteractionWeek: 0,
    age: 30,
    gender: 'NON_BINARY',
}];
const unknownBefore = structuredClone(unknownPlayer);
const unknownLifeEvent: LifeEvent = {
    id: 'relationship_jealousy_legacy',
    type: 'CONFLICT',
    title: 'A Lost Legacy Choice',
    description: 'The target identifier was never saved.',
    options: [{ label: 'Choose carefully' }],
};
const unknownEvent = eventFixture('relationship_jealousy_legacy', unknownLifeEvent);
const unknownResult = resolveLifeEventChoice(unknownPlayer, unknownEvent, unknownLifeEvent, unknownLifeEvent.options[0], 0);
assert(unknownResult);
assert.equal(unknownResult.resolutionKind, 'LEGACY_UNRESOLVABLE');
assert.equal(unknownResult.logKey, 'life.modal.legacy.unresolvable.log');
assert.equal(unknownResult.updatedPlayer.money, unknownBefore.money);
assert.deepEqual(unknownResult.updatedPlayer.stats, unknownBefore.stats);
assert.deepEqual(unknownResult.updatedPlayer.relationships, unknownBefore.relationships);

// Break caught: a successful choice must be persisted with event removal and a receipt before UI commit.
const source = playerFixture('transaction-player');
const transactionLifeEvent: LifeEvent = {
    id: 'transaction-life-event',
    type: 'LIFE',
    title: 'Transactional Choice',
    description: 'Exercises exactly-once persistence.',
    options: [{ id: 'PAY', label: 'Pay' }],
};
const transactionEvent = eventFixture('transaction-event', transactionLifeEvent);
source.pendingEvents = [transactionEvent];
const proposed = structuredClone(source);
proposed.money -= 125_000;
source.totalPlayTimeMs = 9_000;
let persistCalls = 0;
let persistedCandidate: Player | null = null;
const persist = async (candidate: Player): Promise<Player> => {
    persistCalls += 1;
    persistedCandidate = structuredClone(candidate);
    return structuredClone(candidate);
};
const committed = await commitLifeEventResolutionTransaction({
    sourcePlayer: source,
    proposedPlayer: proposed,
    event: transactionEvent,
    optionId: 'PAY',
    impactId: 'MATERIALIZED_PATCH_V1',
    resolutionSeed: 'transaction-event:PAY:v1',
    resolutionKind: 'SERIALIZED',
    log: 'The exact payment was applied.',
    resolvedAt: 1_700_000_000_000,
    persist,
});
assert.equal(committed.status, 'COMMITTED');
assert.equal(persistCalls, 1);
assert.equal(source.money, 500_000, 'The original runtime player must remain untouched until persistence succeeds.');
assert.equal(source.pendingEvents?.length, 1);
assert.equal(committed.player.money, 375_000);
assert.equal(committed.player.totalPlayTimeMs, 9_000, 'Background playtime accrued while feedback is open must not be lost.');
assert.equal(committed.player.pendingEvents?.length, 0);
assert.equal(persistedCandidate?.pendingEvents?.length, 0);
assert.equal(committed.receipt.eventId, transactionEvent.id);
assert.equal(committed.receipt.optionId, 'PAY');
assert.equal(committed.receipt.resolutionSeed, 'transaction-event:PAY:v1');
assert.equal(committed.player.flags.lifeEventResolutionReceipts.length, 1);
assert.equal(committed.player.logs[0]?.message, 'The exact payment was applied.');

// Break caught: retrying a committed event must not apply the effect or write a second time.
const duplicateProposal = structuredClone(committed.player);
duplicateProposal.money -= 125_000;
const duplicate = await commitLifeEventResolutionTransaction({
    sourcePlayer: committed.player,
    proposedPlayer: duplicateProposal,
    event: transactionEvent,
    optionId: 'PAY',
    resolutionKind: 'SERIALIZED',
    log: 'This must not be applied twice.',
    persist,
});
assert.equal(duplicate.status, 'ALREADY_COMMITTED');
assert.equal(duplicate.player.money, 375_000);
assert.equal(persistCalls, 1);

// Break caught: a receipt/event mismatch must repair the queue without reapplying the effect.
const inconsistent = structuredClone(committed.player);
inconsistent.pendingEvents = [transactionEvent];
const inconsistentProposal = structuredClone(inconsistent);
inconsistentProposal.money -= 125_000;
const repaired = await commitLifeEventResolutionTransaction({
    sourcePlayer: inconsistent,
    proposedPlayer: inconsistentProposal,
    event: transactionEvent,
    optionId: 'PAY',
    resolutionKind: 'SERIALIZED',
    log: 'This must still not be applied twice.',
    persist,
});
assert.equal(repaired.status, 'COMMITTED');
assert.equal(repaired.player.money, 375_000);
assert.equal(repaired.player.pendingEvents?.length, 0);
assert.equal(persistCalls, 2);

// Break caught: concurrent double taps must share one transaction and one physical save.
const doubleTapSource = playerFixture('double-tap-player');
const doubleTapEvent = eventFixture('double-tap-event', transactionLifeEvent);
doubleTapSource.pendingEvents = [doubleTapEvent];
const doubleTapProposal = structuredClone(doubleTapSource);
doubleTapProposal.stats.fame += 9;
let doubleTapPersists = 0;
const slowPersist = async (candidate: Player): Promise<Player> => {
    doubleTapPersists += 1;
    await new Promise(resolve => setTimeout(resolve, 10));
    return structuredClone(candidate);
};
const doubleTapInput = {
    sourcePlayer: doubleTapSource,
    proposedPlayer: doubleTapProposal,
    event: doubleTapEvent,
    optionId: 'PAY',
    resolutionKind: 'SERIALIZED' as const,
    log: 'Applied once.',
    persist: slowPersist,
};
const [firstTap, secondTap] = await Promise.all([
    commitLifeEventResolutionTransaction(doubleTapInput),
    commitLifeEventResolutionTransaction(doubleTapInput),
]);
assert.equal(doubleTapPersists, 1);
assert.equal(firstTap.player.stats.fame, 9);
assert.equal(secondTap.player.stats.fame, 9);
assert.equal(firstTap.receipt.id, secondTap.receipt.id);

// Break caught: persistence failure must preserve the original event and all original balances.
const failedSource = playerFixture('failed-persist-player');
const failedEvent = eventFixture('failed-persist-event', transactionLifeEvent);
failedSource.pendingEvents = [failedEvent];
const failedProposal = structuredClone(failedSource);
failedProposal.money = 1;
await assert.rejects(
    commitLifeEventResolutionTransaction({
        sourcePlayer: failedSource,
        proposedPlayer: failedProposal,
        event: failedEvent,
        optionId: 'PAY',
        resolutionKind: 'SERIALIZED',
        log: 'Must roll back.',
        persist: async () => { throw new Error('disk unavailable'); },
    }),
    /disk unavailable/,
);
assert.equal(failedSource.money, 500_000);
assert.equal(failedSource.pendingEvents?.length, 1);
assert.equal(failedSource.flags.lifeEventResolutionReceipts, undefined);

// Break caught: invalid economic state must be rejected before touching persistence.
const invalidProposal = structuredClone(failedSource);
invalidProposal.money = Number.NaN;
let invalidPersistCalls = 0;
await assert.rejects(
    commitLifeEventResolutionTransaction({
        sourcePlayer: failedSource,
        proposedPlayer: invalidProposal,
        event: failedEvent,
        optionId: 'PAY',
        resolutionKind: 'SERIALIZED',
        log: 'Invalid.',
        persist: async candidate => {
            invalidPersistCalls += 1;
            return candidate;
        },
    }),
    /money/i,
);
assert.equal(invalidPersistCalls, 0);

console.log('Life-event Phase 5 legacy recovery and Phase 6 transaction audit passed.');
