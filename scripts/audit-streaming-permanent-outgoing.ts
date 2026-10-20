import assert from 'node:assert/strict';
import type {Player, StreamingRightsWindowType} from '../types';
import {contentMarketFixture} from './helpers/contentMarketFixture';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {normalizeOwnedStreamingPlatformState} from '../services/ownedStreamingPlatform';
import {createStreamingLicenseContract, createStreamingRightsContractFromLicense, registerStreamingRightsContract} from '../services/streamingRightsCore';
import {settleStreamingRightsSublicense} from '../services/streamingRightsTransactions';
import {
    acceptStreamingRightsCounter, createDefaultStreamingRightsTerms, getStreamingRightsOpportunities,
    openStreamingRightsNegotiation, reviseStreamingRightsNegotiation, signStreamingRightsDeal,
    submitStreamingRightsOffer,
} from '../services/streamingRightsMarketplace';

const SOURCE_ID = 'outgoing-owned-grant';
type Kind = 'SUBLICENSE_OUT' | 'TRANSFER_OUT';
const fixture = (windowType: StreamingRightsWindowType = 'PERMANENT'): Player => {
    const player = contentMarketFixture();
    player.businesses = [];
    player.pastProjects = [];
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const license = createStreamingLicenseContract({
        id: SOURCE_ID, sourceProject: player.world.projects[0], buyerPlatformId: null,
        platformContentPlanId: null, cataloguePackageId: null, licensorName: 'Harbour',
        territory: 'MULTI_REGION', countryIds: ['IN', 'US'], durationWeeks: 104,
        exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 1_000_000, platformRevenueShare: 90,
        signedAtAbsoluteWeek: week - 3, startsAtAbsoluteWeek: week - 3,
        origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null, windowType,
        marketingGuarantee: 123_456, renewalOption: true, sublicensingAllowed: true,
        sequelRightsIncluded: true, changeOfControl: 'CONSENT_REQUIRED', cancellationPenalty: 234_567,
        accessGrant: {schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
            purchaseFulfillment: 'NONE', source: 'EXPLICIT'},
    });
    const contract = createStreamingRightsContractFromLicense({
        license, seller: {type: 'NPC_STUDIO', id: 'seller-cm1', name: 'Harbour', platformId: null},
        buyer: {type: 'PLAYER_PLATFORM', id: 'empire-plus', name: 'Empire+', platformId: null},
        guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week - 3,
    });
    player.world.streamingRightsContracts = registerStreamingRightsContract({}, contract).registry;
    player.world.streamingRightsTransactions = {};
    player.ownedStreamingPlatform.catalogLicenses = [license];
    player.ownedStreamingPlatform.catalogProjectIds = [license.sourceProjectId];
    player.ownedStreamingPlatform.rightsObligations = [{
        id: 'legacy-marketing', licenseId: SOURCE_ID, sourceProjectId: license.sourceProjectId,
        title: license.titleAtSigning, type: 'MARKETING_SPEND', targetAmount: 123_456,
        observedAmount: 12_345, dueAtAbsoluteWeek: week + 4, status: 'PENDING',
        breachPenalty: 234_567, successPayment: 0, resolvedAtAbsoluteWeek: null,
    }];
    return player;
};
const reload = (player: Player): Player => {
    const loaded = JSON.parse(JSON.stringify(player)) as Player;
    loaded.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(loaded.ownedStreamingPlatform, loaded.id);
    return loaded;
};
const opportunity = (player: Player, kind: Kind) => {
    const result = getStreamingRightsOpportunities(player).find(row => row.kind === kind && row.sourceLicenseId === SOURCE_ID);
    assert.ok(result, `Advertised ${kind} opportunity`);
    return result;
};
const ready = (player: Player, kind: Kind) => {
    const opened = openStreamingRightsNegotiation(player, opportunity(player, kind).id);
    assert.ok(opened.changed, `Opening ${kind}: ${opened.reason}: ${opened.detail}`);
    let next = reload(opened.player);
    const id = opened.negotiation!.id;
    const reviewed = submitStreamingRightsOffer(next, id);
    assert.ok(reviewed.changed, reviewed.detail);
    next = reviewed.player;
    if (reviewed.negotiation!.status === 'COUNTERED') {
        const accepted = acceptStreamingRightsCounter(next, id);
        assert.ok(accepted.changed, accepted.detail);
        next = accepted.player;
    }
    const negotiation = next.ownedStreamingPlatform.rightsNegotiations.find(row => row.id === id)!;
    assert.equal(negotiation.status, 'READY_TO_SIGN');
    assert.equal(next.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash);
    assert.equal(next.energy.current, player.energy.current);
    return {player: reload(next), id};
};
let checks = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
    checks++;
    try { run(); console.log('PASS', name); }
    catch (error) { failures.push(name); console.error('FAIL', name, (error as Error).message); }
};

for (const windowType of ['PERMANENT', 'FIRST_WINDOW'] as const) {
    for (const kind of ['SUBLICENSE_OUT', 'TRANSFER_OUT'] as const) {
        check(`${windowType} ${kind}: advertised default, review, settlement, reload and duplicate`, () => {
            const initial = fixture(windowType);
            const week = getAbsoluteWeek(initial.age, initial.currentWeek);
            const source = structuredClone(initial.world.streamingRightsContracts[SOURCE_ID]);
            const expectedExpiry = windowType === 'PERMANENT' ? Number.MAX_SAFE_INTEGER : week + 101;
            assert.equal(source.expiresAtAbsoluteWeek, expectedExpiry);
            const prepared = ready(initial, kind);
            if (windowType === 'PERMANENT') prepared.player.currentWeek += 1;
            const negotiation = prepared.player.ownedStreamingPlatform.rightsNegotiations.find(row => row.id === prepared.id)!;
            const buyer = negotiation.buyerPlatformId!;
            const buyerCash = prepared.player.world.platforms[buyer].cashReserve;
            const signed = signStreamingRightsDeal(prepared.player, prepared.id);
            assert.ok(signed.changed, `Settlement: ${signed.reason}: ${signed.detail}`);
            const after = reload(signed.player);
            const transactions = Object.values(after.world.streamingRightsTransactions);
            assert.equal(transactions.length, 1);
            const transaction = transactions[0];
            const successor = after.world.streamingRightsContracts[transaction.successorContractId!];
            assert.equal(successor.parentContractId, SOURCE_ID);
            assert.equal(successor.rootContractId, source.rootContractId);
            assert.equal(transaction.expiresAtAbsoluteWeek, expectedExpiry, 'Transaction expiry must match canonical scope');
            assert.equal(successor.expiresAtAbsoluteWeek, expectedExpiry);
            assert.equal(successor.windowType, windowType);
            assert.deepEqual(successor.accessGrant, source.accessGrant);
            assert.equal(after.world.streamingRightsContracts[SOURCE_ID].expiresAtAbsoluteWeek, expectedExpiry);
            assert.equal(after.ownedStreamingPlatform.treasuryCash, initial.ownedStreamingPlatform.treasuryCash + negotiation.minimumGuarantee);
            assert.ok(Math.abs(after.world.platforms[buyer].cashReserve - (buyerCash - negotiation.minimumGuarantee / 1_000_000)) < 1e-8);
            assert.equal(after.energy.current, initial.energy.current, 'Existing outgoing settlement has no energy charge');
            if (kind === 'TRANSFER_OUT') {
                assert.equal(after.world.streamingRightsContracts[SOURCE_ID].status, 'TRANSFERRED_OUT');
                for (const field of ['territory', 'countryIds', 'durationWeeks', 'startsAtAbsoluteWeek', 'marketingGuarantee',
                    'minimumGuarantee', 'platformRevenueShare', 'renewalOption', 'sublicensingAllowed',
                    'sequelRightsIncluded', 'changeOfControl', 'cancellationPenalty'] as const)
                    assert.deepEqual(successor[field], source[field], `Inherited ${field}`);
                assert.equal(successor.transferredObligationStates?.length, 1);
                const originalObligation = initial.ownedStreamingPlatform.rightsObligations[0];
                const transferredObligation = successor.transferredObligationStates![0];
                for (const field of Object.keys(originalObligation) as Array<keyof typeof originalObligation>)
                    assert.deepEqual(transferredObligation[field], field === 'licenseId' ? successor.id : originalObligation[field]);
            } else {
                assert.deepEqual(after.world.streamingRightsContracts[SOURCE_ID], JSON.parse(JSON.stringify(source)), 'Upstream grant is untouched');
                assert.deepEqual(successor.countryIds, negotiation.countryIds);
                assert.equal(successor.marketingGuarantee, 0);
                assert.equal(successor.sublicensingAllowed, false);
                assert.equal(successor.renewalOption, false);
                assert.equal(successor.changeOfControl, 'NONE');
                const originalObligation = initial.ownedStreamingPlatform.rightsObligations[0];
                const retainedObligation = after.ownedStreamingPlatform.rightsObligations[0];
                for (const field of Object.keys(originalObligation) as Array<keyof typeof originalObligation>)
                    assert.deepEqual(retainedObligation[field], originalObligation[field]);
                assert.equal(after.ownedStreamingPlatform.sublicenseDeals[0].expiresAtAbsoluteWeek, expectedExpiry);
            }
            const duplicate = signStreamingRightsDeal(after, prepared.id);
            assert.equal(duplicate.changed, false);
            assert.equal(duplicate.player, after);
        });
    }
}

for (const kind of ['SUBLICENSE_OUT', 'TRANSFER_OUT'] as const) {
    check(`${kind}: review, revision and counter acceptance recheck current source`, () => {
        const player = fixture();
        const opened = openStreamingRightsNegotiation(player, opportunity(player, kind).id);
        assert.ok(opened.changed, opened.detail);
        const stale = structuredClone(opened.player);
        delete stale.world.streamingRightsContracts[SOURCE_ID];
        assert.equal(submitStreamingRightsOffer(stale, opened.negotiation!.id).changed, false);
        assert.equal(reviseStreamingRightsNegotiation(stale, opened.negotiation!.id, opened.negotiation!).changed, false);
        const reviewed = submitStreamingRightsOffer(opened.player, opened.negotiation!.id);
        assert.ok(reviewed.changed, reviewed.detail);
        assert.equal(reviewed.negotiation!.status, 'COUNTERED', 'Fixture follows actual counter response');
        const changed = structuredClone(reviewed.player);
        changed.world.streamingRightsContracts[SOURCE_ID].accessGrant!.modes = ['RENTAL'];
        const refused = acceptStreamingRightsCounter(changed, opened.negotiation!.id);
        assert.equal(refused.changed, false);
        assert.equal(refused.player, changed);
    });
    check(`${kind}: stale and changed canonical source refuse settlement atomically`, () => {
        const prepared = ready(fixture(), kind);
        const changes: Array<[string, (player: Player) => void]> = [
            ['removed', p => { delete p.world.streamingRightsContracts[SOURCE_ID]; }],
            ['closed', p => { p.world.streamingRightsContracts[SOURCE_ID].status = 'TRANSFERRED_OUT'; }],
            ['holder changed', p => { p.world.streamingRightsContracts[SOURCE_ID].buyer = {type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX'}; }],
            ['viewing modes changed', p => { p.world.streamingRightsContracts[SOURCE_ID].accessGrant!.modes = ['RENTAL']; }],
            ['countries removed', p => { p.world.streamingRightsContracts[SOURCE_ID].countryIds = ['CA']; }],
            ['permanent authority removed', p => {
                const source = p.world.streamingRightsContracts[SOURCE_ID];
                source.windowType = 'FIRST_WINDOW'; source.permanentPurchase = false;
                source.durationWeeks = 104; source.expiresAtAbsoluteWeek = source.startsAtAbsoluteWeek + 104;
            }],
        ];
        for (const [name, change] of changes) {
            const changed = structuredClone(prepared.player);
            change(changed);
            const before = JSON.stringify(changed);
            const result = signStreamingRightsDeal(changed, prepared.id);
            assert.equal(result.changed, false, `${name} must refuse`);
            assert.equal(result.player, changed);
            assert.equal(JSON.stringify(changed), before, `${name} must not mutate`);
        }
    });
    check(`${kind}: permanent settlement rechecks conflicting grants beyond 520 weeks`, () => {
        const prepared = ready(fixture(), kind);
        const changed = structuredClone(prepared.player);
        const week = getAbsoluteWeek(changed.age, changed.currentWeek);
        const conflict = structuredClone(changed.world.streamingRightsContracts[SOURCE_ID]);
        conflict.id = 'future-exclusive-grant';
        conflict.idempotencyKey = conflict.id;
        conflict.buyer = {type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX'};
        conflict.windowType = 'FIRST_WINDOW';
        conflict.permanentPurchase = false;
        conflict.exclusivity = 'EXCLUSIVE';
        conflict.startsAtAbsoluteWeek = week + 600;
        conflict.signedAtAbsoluteWeek = week;
        conflict.durationWeeks = 104;
        conflict.expiresAtAbsoluteWeek = week + 704;
        changed.world.streamingRightsContracts[conflict.id] = conflict;
        const before = JSON.stringify(changed);
        const refused = signStreamingRightsDeal(changed, prepared.id);
        assert.equal(refused.changed, false);
        assert.equal(refused.player, changed);
        assert.equal(JSON.stringify(changed), before);
        if (kind === 'SUBLICENSE_OUT') {
            const negotiation = changed.ownedStreamingPlatform.rightsNegotiations.find(row => row.id === prepared.id)!;
            const direct = settleStreamingRightsSublicense(changed, {
                sourceContractId: SOURCE_ID, seller: changed.world.streamingRightsContracts[SOURCE_ID].buyer,
                buyer: {type: 'AI_PLATFORM', id: negotiation.buyerPlatformId!, name: negotiation.buyerName!,
                    platformId: negotiation.buyerPlatformId!},
                territory: negotiation.territory, countryIds: negotiation.countryIds, windowType: 'PERMANENT',
                exclusivity: negotiation.exclusivity, durationWeeks: negotiation.durationWeeks,
                price: negotiation.minimumGuarantee, buyerRevenueShare: negotiation.platformRevenueShare,
                absoluteWeek: week, idempotencyKey: 'future-conflict-direct', requestedAccessGrant: negotiation.accessGrant,
                controllerAtCommitment: {seller: 'PLAYER', buyer: 'AI'},
            });
            assert.equal(direct.changed, false, 'Transaction itself must validate the full perpetual interval');
            assert.equal(direct.player, changed);
        }
    });
    check(`${kind}: invalid finite inputs cannot become permanent duration exemptions`, () => {
        for (const windowType of ['PERMANENT', 'FIRST_WINDOW'] as const) {
            const player = fixture(windowType);
            const offer = opportunity(player, kind);
            const defaults = createDefaultStreamingRightsTerms(offer);
            for (const durationWeeks of [0, -1, 0.5, 521, NaN, Infinity, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
                const refused = openStreamingRightsNegotiation(player, offer.id, {...defaults, durationWeeks});
                assert.equal(refused.changed, false, `${windowType}: duration ${durationWeeks}`);
                assert.equal(refused.player, player);
            }
            const opened = openStreamingRightsNegotiation(player, offer.id);
            assert.ok(opened.changed, opened.detail);
            const refusedRevision = reviseStreamingRightsNegotiation(opened.player, opened.negotiation!.id, {...defaults, durationWeeks: 521});
            assert.equal(refusedRevision.changed, false);
            assert.equal(refusedRevision.player, opened.player);
        }
    });
}
console.log(JSON.stringify({checks, failures}));
if (failures.length) process.exitCode = 1;
