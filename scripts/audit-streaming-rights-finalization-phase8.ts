import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import StreamingRightsCalendar, {
    STREAMING_RIGHTS_DESK_TABS,
    getNextStreamingRightsDeskTab,
    getStreamingRightsCaseDisclosureOpen,
} from '../components/StreamingRightsCalendar';
import { buildStreamingRightsPhase8QaFixture } from '../services/streamingRightsQa';
import { getStreamingRightsOffice, processStreamingRightsOfficeWeek } from '../services/streamingRightsOffice';
import {
    processStreamingRightsCalendarWeek,
    updateStreamingRightsStudioMandate,
} from '../services/streamingRightsCalendar';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactPlayerForPersistence, FULL_LOCAL_MIRROR_BUDGET_BYTES } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { normalizeStreamingRightsContractRegistry } from '../services/streamingRightsCore';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.businesses = [{
    id: 'empire-studios',
    name: 'Empire Studios',
    type: 'PRODUCTION_HOUSE',
    balance: 500_000_000,
    stats: { weeklyRevenue: 0, weeklyProfit: 0, lifetimeRevenue: 0 },
    studioState: { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 },
}] as Player['businesses'];

assert.deepEqual(STREAMING_RIGHTS_DESK_TABS, ['PORTFOLIO', 'MANDATE', 'RELATIONSHIPS', 'STATEMENTS', 'PACKAGES']);
assert.equal(getNextStreamingRightsDeskTab('PORTFOLIO', 'ArrowRight'), 'MANDATE');
assert.equal(getNextStreamingRightsDeskTab('PORTFOLIO', 'ArrowLeft'), 'PACKAGES');
assert.equal(getNextStreamingRightsDeskTab('RELATIONSHIPS', 'Home'), 'PORTFOLIO');
assert.equal(getNextStreamingRightsDeskTab('RELATIONSHIPS', 'End'), 'PACKAGES');
assert.equal(getNextStreamingRightsDeskTab('STATEMENTS', 'Enter'), 'STATEMENTS');
assert.equal(getStreamingRightsCaseDisclosureOpen({ status: 'ACTION_REQUIRED', outcome: 'PENDING' }), true);
assert.equal(getStreamingRightsCaseDisclosureOpen({ status: 'OFFER_AVAILABLE', outcome: 'PENDING' }), true);
assert.equal(getStreamingRightsCaseDisclosureOpen({ status: 'WATCHING', outcome: 'PENDING' }), false);
assert.equal(getStreamingRightsCaseDisclosureOpen({ status: 'RENEWAL_SECURED', outcome: 'DELEGATED_ACCEPTED' }), false);

const markup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
    player,
    context: 'STUDIO',
    studioId: 'empire-studios',
    onUpdatePlayer: () => undefined,
    initialDeskTab: 'PORTFOLIO',
}));

assert.match(markup, /role="tablist"/);
assert.match(markup, /role="tab"/);
assert.match(markup, /aria-selected="true"/);
assert.match(markup, /aria-controls="streaming-rights-panel-portfolio"/);
assert.match(markup, /id="streaming-rights-panel-portfolio"/);
assert.match(markup, /role="tabpanel"/);
assert.match(markup, /aria-labelledby="streaming-rights-tab-portfolio"/);

const qaFixture = buildStreamingRightsPhase8QaFixture(player, 'empire-studios');
const repeatedQaFixture = buildStreamingRightsPhase8QaFixture(player, 'empire-studios');
const qaTitles = qaFixture.pastProjects.filter(project => String(project.id).startsWith('qa_rights_a8_title_'));
assert.equal(qaTitles.length, 40, 'the QA fixture must exercise a realistic large studio catalogue');
assert.deepEqual(qaFixture, repeatedQaFixture, 'the QA fixture must be deterministic for the same saved facts');
assert.ok(Object.values(qaFixture.world.streamingRightsContracts || {}).filter(contract => contract.id.startsWith('qa_rights_a8_contract_')).length >= 10);
assert.ok(Object.values(qaFixture.world.streamingRightsCalendar?.renewalCases || {}).filter(renewal => renewal.id.startsWith('qa_rights_a8_renewal_')).length >= 5);
const qaAbsoluteWeek = getAbsoluteWeek(qaFixture.age, qaFixture.currentWeek);
const qaOffice = getStreamingRightsOffice(qaFixture, 'empire-studios', qaAbsoluteWeek);
assert.equal(qaOffice.totalTitles, 40);
assert.ok(qaOffice.groups.ACTION_REQUIRED.length >= 1);
assert.ok(qaOffice.groups.DELEGATED_DECISIONS.length >= 1);
assert.ok(qaOffice.actionRail.length <= 7);

const homeSource = readFileSync(join(process.cwd(), 'views/HomePage.tsx'), 'utf8');
assert.match(homeSource, /Rights Market A8 QA/);
assert.match(homeSource, /buildStreamingRightsPhase8QaFixture/);

const contractUniverse = JSON.stringify(qaFixture.world.streamingRightsContracts);
const offerUniverse = JSON.stringify(Object.values(qaFixture.world.streamingRightsCalendar?.renewalCases || {}).map(renewal => ({
    sourceContractId: renewal.sourceContractId,
    offerDisposition: renewal.offerDisposition,
    proposedEconomics: renewal.proposedEconomics,
})));
(['STRATEGY', 'CUSTOM', 'FULL'] as const).forEach(controlMode => {
    const modePlayer = updateStreamingRightsStudioMandate(qaFixture, {
        studioId: 'empire-studios',
        absoluteWeek: qaAbsoluteWeek,
        patch: { controlMode },
    });
    assert.equal(JSON.stringify(modePlayer.world.streamingRightsContracts), contractUniverse, `${controlMode} must not alter signed contracts`);
    assert.equal(JSON.stringify(Object.values(modePlayer.world.streamingRightsCalendar?.renewalCases || {}).map(renewal => ({
        sourceContractId: renewal.sourceContractId,
        offerDisposition: renewal.offerDisposition,
        proposedEconomics: renewal.proposedEconomics,
    }))), offerUniverse, `${controlMode} must not receive hidden offer economics`);
    const nextWeek = processStreamingRightsCalendarWeek(modePlayer, qaAbsoluteWeek + 1).player;
    const protectedRenewal = nextWeek.world.streamingRightsCalendar?.renewalCases[`${'qa_rights_a8_'}renewal_00`];
    assert.equal(protectedRenewal?.outcome, 'PENDING', `${controlMode} must never auto-sign a protected decision`);
    const replay = processStreamingRightsCalendarWeek(nextWeek, qaAbsoluteWeek + 1).player;
    assert.deepEqual(replay, nextWeek, `${controlMode} same-week processing must be idempotent`);
});

const assertUnique = (values: string[], label: string) => {
    assert.equal(new Set(values).size, values.length, `${label} must not contain duplicate identifiers`);
};
assertUnique(Object.values(qaFixture.world.streamingRightsContracts || {}).map(contract => contract.id), 'rights contracts');
assertUnique(Object.values(qaFixture.world.streamingRightsContracts || {}).map(contract => contract.idempotencyKey), 'rights contract idempotency keys');
assertUnique(Object.values(qaFixture.world.streamingRightsCalendar?.renewalCases || {}).map(renewal => renewal.id), 'renewal cases');
assertUnique(Object.values(qaFixture.world.streamingCataloguePackages || {}).map(item => item.id), 'catalogue packages');
assertUnique((qaFixture.finance?.history || []).map(entry => entry.id), 'finance ledger');

const migrationFixtures: Array<{ name: string; player: Player }> = [
    { name: 'legacy-without-rights', player: (() => {
        const fixture = structuredClone(player) as Player;
        delete fixture.world.streamingRightsContracts;
        delete fixture.world.streamingRightsCalendar;
        delete fixture.world.streamingCataloguePackages;
        return fixture;
    })() },
    { name: 'a1-contracts', player: { ...qaFixture, world: { ...qaFixture.world, streamingRightsCalendar: undefined } } },
    { name: 'a2-schema-v2', player: qaFixture },
    { name: 'malformed', player: (() => {
        const fixture = structuredClone(qaFixture) as Player;
        fixture.world.streamingRightsContracts = { broken: { id: '', minimumGuarantee: Number.NaN } } as unknown as Player['world']['streamingRightsContracts'];
        fixture.world.streamingRightsCalendar = { schemaVersion: 2, renewalCases: { broken: { id: '' } }, digests: [{ id: '', absoluteWeek: -90 }], urgentNoticeKeys: ['', ''], lastProcessedAbsoluteWeek: Number.POSITIVE_INFINITY } as unknown as Player['world']['streamingRightsCalendar'];
        fixture.world.streamingCataloguePackages = { broken: { id: '' } } as unknown as Player['world']['streamingCataloguePackages'];
        return fixture;
    })() },
];
migrationFixtures.forEach(({ name, player: fixture }) => {
    const once = migratePlayerSave(compactPlayerForPersistence(fixture));
    const twice = migratePlayerSave(compactPlayerForPersistence(structuredClone(once)));
    assert.deepEqual(twice.world.streamingRightsContracts, once.world.streamingRightsContracts, `${name} contracts must normalize once`);
    assert.deepEqual(twice.world.streamingRightsCalendar, once.world.streamingRightsCalendar, `${name} calendar must normalize once`);
    assert.deepEqual(twice.world.streamingCataloguePackages, once.world.streamingCataloguePackages, `${name} packages must normalize once`);
});

const compactedQa = compactPlayerForPersistence(qaFixture);
assert.strictEqual(
    normalizeStreamingRightsContractRegistry(compactedQa.world.streamingRightsContracts),
    compactedQa.world.streamingRightsContracts,
    'Save compaction must return a registry that is already recognized as canonical in memory.',
);
const compactedQaBytes = Buffer.byteLength(JSON.stringify(compactedQa), 'utf8');
assert.ok(compactedQaBytes < FULL_LOCAL_MIRROR_BUDGET_BYTES, `40-title QA save must remain below ${FULL_LOCAL_MIRROR_BUDGET_BYTES} bytes (received ${compactedQaBytes})`);
const reloadedQa = migratePlayerSave(JSON.parse(JSON.stringify(compactedQa)) as Player);
assert.equal(reloadedQa.businesses.find(business => business.id === 'empire-studios')?.name, 'Empire Studios');
assert.equal(reloadedQa.pastProjects.filter(project => String(project.id).startsWith('qa_rights_a8_title_')).length, 40);
assert.equal(JSON.stringify(reloadedQa.world.streamingRightsContracts), contractUniverse);

const runRightsHorizon = (input: Player, weeks: number): Player => {
    let branch = structuredClone(input) as Player;
    const startWeek = getAbsoluteWeek(branch.age, branch.currentWeek);
    for (let offset = 1; offset <= weeks; offset += 1) {
        const absoluteWeek = startWeek + offset;
        branch = processStreamingRightsCalendarWeek(branch, absoluteWeek).player;
        branch = processStreamingRightsOfficeWeek(branch, absoluteWeek).player;
        if (offset % 520 === 0) branch = migratePlayerSave(compactPlayerForPersistence(branch));
    }
    return branch;
};

const FOUR_HUNDRED_YEARS_IN_WEEKS = 400 * 52;
const horizonA = runRightsHorizon(qaFixture, FOUR_HUNDRED_YEARS_IN_WEEKS);
const horizonB = runRightsHorizon(qaFixture, FOUR_HUNDRED_YEARS_IN_WEEKS);
assert.deepEqual(horizonB.world.streamingRightsContracts, horizonA.world.streamingRightsContracts, '400-year contract state must be deterministic');
assert.deepEqual(horizonB.world.streamingRightsCalendar, horizonA.world.streamingRightsCalendar, '400-year calendar state must be deterministic');
assert.deepEqual(horizonB.world.streamingRightsOffice, horizonA.world.streamingRightsOffice, '400-year office state must be deterministic');
assert.ok(Object.keys(horizonA.world.streamingRightsContracts || {}).length <= 240, 'terminal rights contracts must remain bounded');
assert.ok(Object.keys(horizonA.world.streamingRightsCalendar?.renewalCases || {}).length <= 240, 'terminal renewal cases must remain bounded');
assert.ok((horizonA.world.streamingRightsCalendar?.digests || []).length <= 20, 'calendar digests must remain bounded');
assert.ok((horizonA.world.streamingRightsOffice?.digests || []).length <= 52, 'office digests must remain bounded');
assert.ok(Buffer.byteLength(JSON.stringify(compactPlayerForPersistence(horizonA)), 'utf8') < FULL_LOCAL_MIRROR_BUDGET_BYTES, '400-year compacted save must remain within the local mirror budget');

console.log('Streaming Rights Phase A8 accessibility contract audit passed.');
