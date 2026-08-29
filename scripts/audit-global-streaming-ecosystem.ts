import assert from 'node:assert/strict';
import {
    STREAMING_ECOSYSTEM_SCHEMA_VERSION,
    getVisibleGlobalStreamingCompanies,
    getVisibleStreamingCompaniesForMarket,
    normalizeStreamingPlatformEcosystem,
} from '../services/streamingPlatformEcosystem';
import * as streamingEcosystem from '../services/streamingPlatformEcosystem';
import { INITIAL_PLAYER, type StreamingEcosystemOperator } from '../types';
import {
    createDynamicStreamingOperator,
    processStreamingPlatformEcosystemTurn,
} from '../services/streamingPlatformEcosystemTurn';
import {
    calculateStreamingCompetitionHealth,
    chooseStreamingEcosystemLaunchClass,
} from '../services/streamingPlatformCompetitionHealth';
import { processWorldTurn } from '../services/worldLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';

const normalized = normalizeStreamingPlatformEcosystem(undefined, 1_400);

assert.equal(normalized.schemaVersion, STREAMING_ECOSYSTEM_SCHEMA_VERSION);
assert.equal(normalized.operators.JIOHOTSTAR.name, 'JioHotstar');
assert.equal(normalized.operators.JIOHOTSTAR.homeCountryId, 'IN');
assert.equal(normalized.operators.TVING.homeCountryId, 'KR');
assert.equal(normalized.operators.CRAVE.homeCountryId, 'CA');
assert.equal(normalized.operators.STAN.homeCountryId, 'AU');
assert.equal(normalized.operators.SHOWMAX, undefined, 'A discontinued service must not remain in the active seed roster.');
assert.equal(Object.keys(normalized.markets).length, 24);

for (const market of Object.values(normalized.markets)) {
    const total = market.shares.reduce((sum, item) => sum + item.sharePercent, 0)
        + market.othersSharePercent;
    assert.equal(Math.round(total * 100), 10_000, `${market.countryId} shares must total exactly 100.00%.`);
    assert.ok(market.othersSharePercent >= 0);
    assert.deepEqual(
        market.shares.map(item => item.operatorId),
        [...market.shares].sort((left, right) => (
            right.sharePercent - left.sharePercent || left.operatorId.localeCompare(right.operatorId)
        )).map(item => item.operatorId),
        `${market.countryId} shares must have stable presentation order.`,
    );
}

assert.deepEqual(
    normalizeStreamingPlatformEcosystem(normalized, 1_400),
    normalized,
    'Ecosystem normalization must be idempotent for a canonical save.',
);

const closedSeededOperatorState = structuredClone(normalized);
closedSeededOperatorState.operators.STAN.lifecycle = 'CLOSED';
closedSeededOperatorState.markets.AU.shares = closedSeededOperatorState.markets.AU.shares
    .filter(item => item.operatorId !== 'STAN');
const normalizedClosedSeededOperatorState = normalizeStreamingPlatformEcosystem(closedSeededOperatorState, 1_400);
assert.equal(
    normalizedClosedSeededOperatorState.markets.AU.shares.some(item => item.operatorId === 'STAN'),
    false,
    'A saved closed regional operator must not regain its seed share during normalization.',
);

const player = structuredClone(INITIAL_PLAYER);
player.world.streamingPlatformEcosystem = normalized;
const india = getVisibleStreamingCompaniesForMarket(player, 'IN');
assert.ok(india.some(item => item.name === 'JioHotstar'));
assert.ok(india.some(item => item.name === 'Others' && item.kind === 'OTHERS'));
assert.ok(india.filter(item => item.kind === 'REGIONAL').length <= 3);
assert.equal(
    Math.round(india.reduce((sum, item) => sum + (item.sharePercent || 0), 0) * 100),
    10_000,
    'The visible country read model must preserve the complete 100% market.',
);
assert.ok(getVisibleStreamingCompaniesForMarket(player, 'CA').some(item => item.name === 'Crave'));
assert.ok(getVisibleStreamingCompaniesForMarket(player, 'AU').some(item => item.name === 'Stan'));
assert.ok(
    getVisibleGlobalStreamingCompanies(player).some(item => item.name === 'Prime Video'),
    'A seeded global challenger must be visible without entering the fixed PlatformId simulation.',
);
const getForbesStreamingCompanies = (
    streamingEcosystem as typeof streamingEcosystem & {
        getForbesStreamingCompanies?: (subject: typeof player) => ReturnType<typeof getVisibleGlobalStreamingCompanies>;
    }
).getForbesStreamingCompanies;
assert.equal(
    typeof getForbesStreamingCompanies,
    'function',
    'The Forbes Stream index must have a canonical ecosystem ranking read model.',
);
const forbesCompanies = getForbesStreamingCompanies!(player);
assert.ok(forbesCompanies.some(item => item.id === 'PRIME_VIDEO'));
assert.ok(
    forbesCompanies.some(item => item.id === 'JIOHOTSTAR'),
    'A dominant named regional platform must be visible in Forbes even when it is not globally distributed.',
);
assert.equal(
    forbesCompanies.some(item => item.kind === 'OTHERS'),
    false,
    'Forbes must rank named companies while smaller operators remain represented by Others in their local markets.',
);
assert.deepEqual(
    forbesCompanies.map(item => item.id),
    [...forbesCompanies].sort((left, right) => (
        (right.subscribersMillions || 0) - (left.subscribersMillions || 0)
        || (right.valuationBillions || 0) - (left.valuationBillions || 0)
        || left.id.localeCompare(right.id)
    )).map(item => item.id),
    'The Forbes Stream index must rank companies by subscribers, then valuation.',
);

const challenger: StreamingEcosystemOperator = {
    id: 'NOVA_PLAY', name: 'Nova Play', kind: 'DYNAMIC_FICTIONAL', corePlatformId: null,
    brand: {
        source: 'GENERATED',
        identity: {
            schemaVersion: 1,
            primaryColor: '#6F52E5', secondaryColor: '#21A6A1', surfaceColor: '#111319',
            onPrimaryColor: '#FFFFFF', markId: 'ORBIT', typefaceId: 'GEOMETRIC', lockupId: 'SIDE',
        },
    },
    origin: 'VENTURE_BACKED', startingClass: 'REGIONAL_CHALLENGER', homeCountryId: 'IN', lifecycle: 'ACTIVE', foundedAtAbsoluteWeek: 1_300,
    cashMillions: 800, valuationBillions: 2.2, subscriberMillions: 12,
    technology: 82, cataloguePower: 76, localization: 80, brandPower: 78, prestige: 68,
    efficiency: 75, risk: 58, preferredGenres: ['DRAMA'], languageCapabilities: [],
    activeCountryIds: ['IN', 'ID', 'TH'], marketMomentum: { IN: 8, ID: 6, TH: 5 },
    visibilityQualifyingWeeks: { IN: 4, ID: 4, TH: 4 }, belowVisibilityWeeks: {},
    consecutiveStressWeeks: 0, lastMaterialChangeAtAbsoluteWeek: 1_399,
};
const promotedPlayer = structuredClone(player);
promotedPlayer.world.streamingPlatformEcosystem!.operators[challenger.id] = challenger;
promotedPlayer.world.streamingPlatformEcosystem!.markets.IN.shares.push({ operatorId: challenger.id, sharePercent: 8 });
promotedPlayer.world.streamingPlatformEcosystem = normalizeStreamingPlatformEcosystem(
    promotedPlayer.world.streamingPlatformEcosystem,
    1_400,
);
assert.ok(
    getVisibleStreamingCompaniesForMarket(promotedPlayer, 'IN').some(item => item.id === challenger.id),
    'A qualified dynamic company must leave Others and become named locally.',
);
assert.ok(
    getVisibleGlobalStreamingCompanies(promotedPlayer).some(item => item.id === challenger.id),
    'A three-market, 12M-subscriber dynamic company must become globally visible.',
);
assert.ok(
    getForbesStreamingCompanies!(promotedPlayer).some(item => (
        item.id === challenger.id
        && item.brand.platformId === challenger.id
        && item.brand.displayName === challenger.name
    )),
    'A promoted fictional platform must enter Forbes with its persistent generated identity.',
);
const globalChallenger = getVisibleGlobalStreamingCompanies(promotedPlayer).find(item => item.id === challenger.id)!;
assert.equal(globalChallenger.kind, 'DYNAMIC');
assert.equal('platformId' in globalChallenger, false, 'Non-core challengers must not expose a deep PlatformId action target.');

promotedPlayer.world.streamingPlatformEcosystem!.operators[challenger.id].belowVisibilityWeeks.IN = 12;
promotedPlayer.world.streamingPlatformEcosystem!.markets.IN.shares = promotedPlayer.world.streamingPlatformEcosystem!.markets.IN.shares
    .map(item => item.operatorId === challenger.id ? { ...item, sharePercent: 1 } : item);
assert.ok(
    !getVisibleStreamingCompaniesForMarket(promotedPlayer, 'IN').some(item => item.id === challenger.id),
    'A company below 1.5% for twelve weeks must return to Others.',
);

const creationInput = {
    playerId: player.id,
    state: normalized,
    absoluteWeek: 1_404,
    homeCountryId: 'IN',
    origin: 'TELECOM_BACKED' as const,
    startingClass: 'REGIONAL_CHALLENGER' as const,
};
const wealthyLaunchA = createDynamicStreamingOperator(creationInput);
const wealthyLaunchB = createDynamicStreamingOperator(creationInput);
const bootstrapLaunch = createDynamicStreamingOperator({
    ...creationInput,
    origin: 'BOOTSTRAPPED',
    startingClass: 'LOCAL_STARTUP',
});
assert.deepEqual(wealthyLaunchA, wealthyLaunchB, 'Dynamic company identity and starting state must be replay deterministic.');
assert.equal(wealthyLaunchA.startingClass, 'REGIONAL_CHALLENGER');
assert.ok(wealthyLaunchA.cashMillions > bootstrapLaunch.cashMillions);
assert.ok(wealthyLaunchA.technology > bootstrapLaunch.technology);
assert.ok(wealthyLaunchA.cataloguePower > bootstrapLaunch.cataloguePower);

const healthyCompetition = calculateStreamingCompetitionHealth(player, normalized);
const concentratedState = structuredClone(normalized);
for (const operator of Object.values(concentratedState.operators)) {
    if (operator.id !== 'NETFLIX' && ['CORE_GLOBAL', 'GLOBAL_REAL'].includes(operator.kind)) operator.lifecycle = 'CLOSED';
}
for (const market of Object.values(concentratedState.markets)) {
    market.shares = market.shares
        .filter(share => share.operatorId === 'NETFLIX')
        .map(share => ({ ...share, sharePercent: 88 }));
    if (!market.shares.length && concentratedState.operators.NETFLIX.activeCountryIds.includes(market.countryId)) {
        market.shares = [{ operatorId: 'NETFLIX', sharePercent: 88 }];
    }
    market.othersSharePercent = 12;
    market.visibleOperatorIds = ['NETFLIX'];
}
const concentratedCompetition = calculateStreamingCompetitionHealth(player, concentratedState);
assert.ok(concentratedCompetition.launchPressure > healthyCompetition.launchPressure);
assert.equal(concentratedCompetition.reasons.includes('INSUFFICIENT_GLOBAL_GIANTS'), true);
assert.ok(concentratedCompetition.concentrationScore > healthyCompetition.concentrationScore);

const regionalClass = chooseStreamingEcosystemLaunchClass({
    playerId: player.id,
    state: normalized,
    health: healthyCompetition,
    absoluteWeek: 1_404,
});
assert.notEqual(regionalClass, 'GLOBAL_ENTRANT', 'A healthy competitive world must not manufacture a weekly giant.');
const giantInput = {
    ...creationInput,
    absoluteWeek: 1_430,
    homeCountryId: 'US',
    origin: 'CONGLOMERATE_BACKED' as const,
    startingClass: 'GLOBAL_ENTRANT' as const,
};
const giant = createDynamicStreamingOperator(giantInput);
const replayedGiant = createDynamicStreamingOperator(giantInput);
assert.equal(giant.startingClass, 'GLOBAL_ENTRANT');
assert.ok(giant.activeCountryIds.length >= 3);
assert.ok(giant.cashMillions > wealthyLaunchA.cashMillions);
assert.deepEqual(giant.brand, replayedGiant.brand, 'A future giant must persist one deterministic brand identity.');
const playerWithGiant = structuredClone(player);
playerWithGiant.world.streamingPlatformEcosystem!.operators[giant.id] = giant;
assert.equal(giant.corePlatformId, null, 'A generated giant must not masquerade as a deep PlatformId participant.');
const fictionalGlobalCapState = structuredClone(concentratedState);
for (let index = 0; index < 3; index += 1) {
    const cappedGiant = structuredClone(giant);
    cappedGiant.id = `CAPPED_GLOBAL_${index}`;
    cappedGiant.name = `Capped Global ${index}`;
    fictionalGlobalCapState.operators[cappedGiant.id] = cappedGiant;
}
assert.notEqual(
    chooseStreamingEcosystemLaunchClass({
        playerId: player.id,
        state: fictionalGlobalCapState,
        health: concentratedCompetition,
        absoluteWeek: 1_456,
    }),
    'GLOBAL_ENTRANT',
    'Competition pressure must not bypass the cap of fewer than four active fictional globals.',
);

const generatedOperatorCapState = structuredClone(normalized);
for (let index = 0; index < 23; index += 1) {
    const cappedOperator = structuredClone(bootstrapLaunch);
    cappedOperator.id = `GENERATED_CAP_${index}`;
    cappedOperator.name = `Generated Cap ${index}`;
    cappedOperator.foundedAtAbsoluteWeek = 1_300 + index;
    generatedOperatorCapState.operators[cappedOperator.id] = cappedOperator;
}
generatedOperatorCapState.lastProcessedAbsoluteWeek = 1_499;
generatedOperatorCapState.eventHistory = generatedOperatorCapState.eventHistory
    .filter(event => event.type !== 'LAUNCH');
const generatedCapPlayer = structuredClone(player);
generatedCapPlayer.world.streamingPlatformEcosystem = generatedOperatorCapState;
const generatedCapTurn = processStreamingPlatformEcosystemTurn(
    generatedCapPlayer,
    generatedCapPlayer.world,
    1_500,
);
assert.equal(
    Object.values(generatedCapTurn.world.streamingPlatformEcosystem!.operators)
        .filter(operator => operator.kind === 'DYNAMIC_FICTIONAL' && operator.lifecycle !== 'CLOSED').length,
    23,
    'Launch pressure must not bypass the bounded generated-operator cap.',
);

const weeklyPlayer = structuredClone(player);
weeklyPlayer.world.streamingPlatformEcosystem!.lastProcessedAbsoluteWeek = 1_399;
const firstTurn = processStreamingPlatformEcosystemTurn(weeklyPlayer, weeklyPlayer.world, 1_400);
assert.equal(firstTurn.changed, true);
const replayPlayer = { ...weeklyPlayer, world: structuredClone(firstTurn.world) };
const replayTurn = processStreamingPlatformEcosystemTurn(replayPlayer, replayPlayer.world, 1_400);
assert.equal(replayTurn.changed, false, 'The same ecosystem absolute week must not process twice.');
assert.deepEqual(replayTurn.world.streamingPlatformEcosystem, firstTurn.world.streamingPlatformEcosystem);
for (const market of Object.values(firstTurn.world.streamingPlatformEcosystem!.markets)) {
    const total = market.shares.reduce((sum, item) => sum + item.sharePercent, 0) + market.othersSharePercent;
    assert.equal(Math.round(total * 100), 10_000, `${market.countryId} must remain at 100.00 after a weekly turn.`);
}

const integratedPlayer = structuredClone(player);
const integratedWeek = getAbsoluteWeek(integratedPlayer.age, integratedPlayer.currentWeek);
integratedPlayer.world.streamingPlatformEcosystem!.lastProcessedAbsoluteWeek = integratedWeek - 1;
const integratedWorld = processWorldTurn(integratedPlayer).world;
assert.equal(
    integratedWorld.streamingPlatformEcosystem?.lastProcessedAbsoluteWeek,
    integratedWeek,
    'The canonical weekly world turn must process the ecosystem after Platform AI.',
);

const legacyPlayer = structuredClone(INITIAL_PLAYER);
delete legacyPlayer.world.streamingPlatformEcosystem;
const legacyMoney = legacyPlayer.money;
const legacyPlatformEconomics = Object.fromEntries(Object.entries(legacyPlayer.world.platforms || {}).map(([id, platform]) => [id, {
    name: platform.name, cashReserve: platform.cashReserve, subscribers: platform.subscribers, valuation: platform.valuation,
}]));
const migratedPlayer = migratePlayerSave(legacyPlayer);
assert.ok(migratedPlayer.world.streamingPlatformEcosystem, 'Legacy saves must gain canonical ecosystem state.');
assert.equal(migratedPlayer.money, legacyMoney);
assert.deepEqual(
    Object.fromEntries(Object.entries(migratedPlayer.world.platforms || {}).map(([id, platform]) => [id, {
        name: platform.name, cashReserve: platform.cashReserve, subscribers: platform.subscribers, valuation: platform.valuation,
    }])),
    legacyPlatformEconomics,
    'Ecosystem migration must not rewrite authoritative platform economics.',
);
assert.deepEqual(migratePlayerSave(migratedPlayer).world.streamingPlatformEcosystem, migratedPlayer.world.streamingPlatformEcosystem);

const persistencePlayer = structuredClone(migratedPlayer);
persistencePlayer.world.streamingPlatformEcosystem!.eventHistory = Array.from({ length: 140 }, (_, index) => ({
    id: `event_${index}`, absoluteWeek: 1_000 + index,
    operatorId: 'JIOHOTSTAR', type: 'EXPANSION' as const,
    headline: `Expansion ${index}`, detail: 'Saved history bound fixture.', countryId: 'IN',
}));
const compactedPlayer = compactPlayerForPersistence(persistencePlayer);
assert.ok(compactedPlayer.world.streamingPlatformEcosystem);
assert.ok(compactedPlayer.world.streamingPlatformEcosystem!.eventHistory.length <= 120);
assert.deepEqual(
    compactPlayerForPersistence(compactedPlayer).world.streamingPlatformEcosystem,
    compactedPlayer.world.streamingPlatformEcosystem,
    'Ecosystem persistence compaction must be idempotent.',
);

console.log('Global streaming ecosystem normalization audit passed.');
