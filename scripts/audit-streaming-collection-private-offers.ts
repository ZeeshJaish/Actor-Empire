import { initializeHistoricalCatalogue } from '../services/historicalCatalogue';
import { PHASE_ONE_ENERGY_COSTS } from '../services/energyCosts';
import { processGameWeek } from '../services/gameLoop';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import * as market from '../services/streamingContentMarket';
import { processStreamingPrivateOffersWeek, reviseStreamingRightsNegotiation, acceptStreamingRightsCounter, signStreamingRightsDeal, openStreamingCollectionPrivateOffer } from '../services/streamingRightsMarketplace';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';
const fixture = () => {
    const p = contentMarketFixture();
    p.businesses = [];
    p.pastProjects = [];
    p.ownedStreamingPlatform.treasuryCash = 50000000000;
    p.world.projects = Array.from({ length: 9 }, (_, i) => ({
        ...p.world.projects[i % 6], id: `private-${i}`, studioId: `seller-${Math.floor(i / 3)}`, rating: 3, boxOffice: 1000000
    }));
    return p;
};
const collection = (p: Player) => {
    const auctions = market.getContentMarketAuctionAssignments(p);
    const c = market.getContentMarketCollections(p).find(c => !auctions.collectionIds.has(c.id));
    assert.ok(c, 'non-auction collection');
    return c;
};
const defaults = (p: Player, id: string) => {
    const fn = (market as any).getContentMarketPrivateOfferDefaults;
    assert.equal(typeof fn, 'function', 'canonical defaults API exists');
    const t = fn(p, id);
    assert.ok(t);
    return t;
};
const reload = (p: Player): Player => {
    const q = JSON.parse(JSON.stringify(p));
    q.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(q.ownedStreamingPlatform, q.id);
    return q;
};
const respond = (p: Player, id: string) => {
    const due = p.ownedStreamingPlatform.rightsNegotiations.find(n => n.id === id)!.responseDueAbsoluteWeek!;
    p = { ...p, age: Math.floor(due / 52) + 1, currentWeek: due % 52 + 1 };
    return processStreamingPrivateOffersWeek(p, due).player;
};
const send = () => {
    const p = fixture(), c = collection(p), t = {
        ...defaults(p, c.id), minimumGuarantee: 123456789, durationWeeks: 52, renewalOption: false, sublicensingAllowed: false, changeOfControl: 'CONSENT_REQUIRED', cancellationPenalty: 1234567
    };
    const s = market.submitContentMarketPrivateOffer(p, c.id, t);
    assert.ok(s.changed, s.detail || s.reason);
    return {
        p, c, t, s
    };
};
let checks = 0;
const failures: string[] = [];
const check = (name: string, fn: () => void) => {
    try {
        fn();
        checks++;
        console.log('PASS', name);
    }
    catch (e) {
        failures.push(`${name}: ${(e as Error).message}`);
        console.error('FAIL', failures.at(-1));
    }
};
check('collection submit exists without defaults helper', () => {
    const p = fixture(), c = collection(p);
    const s = market.submitContentMarketPrivateOffer(p, c.id, {
        territory: 'MULTI_REGION', countryIds: c.package.requestedCountryIds, durationWeeks: 104, exclusivity: 'NON_EXCLUSIVE', windowType: 'FIRST_WINDOW', minimumGuarantee: c.totalGuarantee, platformRevenueShare: 100, marketingGuarantee: 0, viewershipBonusThreshold: 0, viewershipBonusAmount: 0, renewalOption: false, sublicensingAllowed: false, sequelRightsIncluded: false, changeOfControl: 'NONE', cancellationPenalty: 0
    });
    assert.ok(s.changed, s.reason);
});
check('exact custom collection terms survive pending reload, delayed reply and atomic signature', () => {
    const { p, c, t, s } = send();
    assert.equal(s.player.ownedStreamingPlatform.treasuryCash, p.ownedStreamingPlatform.treasuryCash);
    assert.equal(s.player.energy.current, p.energy.current);
    assert.equal(s.negotiation!.minimumGuarantee, t.minimumGuarantee);
    const pending = reload(s.player);
    assert.equal(signStreamingRightsDeal(pending, s.negotiation!.id).changed, false);
    assert.equal(processStreamingPrivateOffersWeek(pending, s.negotiation!.responseDueAbsoluteWeek! - 1).resolvedOfferIds.length, 0);
    const ready = respond(pending, s.negotiation!.id);
    assert.equal(ready.ownedStreamingPlatform.rightsNegotiations[0].status, 'READY_TO_SIGN');
    const signed = signStreamingRightsDeal(ready, s.negotiation!.id);
    assert.ok(signed.changed, signed.detail || signed.reason);
    const licenses = signed.player.ownedStreamingPlatform.catalogLicenses;
    assert.equal(licenses.length, c.rows.length);
    assert.equal(licenses.reduce((v, l) => v + l.minimumGuarantee, 0), 123456789);
    assert.equal(licenses.reduce((v, l) => v + l.cancellationPenalty, 0), 1234567);
    assert.ok(licenses.every(l => l.durationWeeks === 52 && l.changeOfControl === 'CONSENT_REQUIRED' && !l.renewalOption && !l.sublicensingAllowed && l.marketingGuarantee === 0));
    assert.equal(signed.player.ownedStreamingPlatform.treasuryCash, p.ownedStreamingPlatform.treasuryCash - 123456789);
    assert.equal(signed.player.energy.current, p.energy.current - PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT);
    const replay = signStreamingRightsDeal(reload(signed.player), s.negotiation!.id);
    assert.equal(replay.changed, false);
    assert.equal(replay.player.energy.current, signed.player.energy.current);
    assert.equal(replay.player.ownedStreamingPlatform.treasuryCash, signed.player.ownedStreamingPlatform.treasuryCash);
});
for (const amount of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1, 5000000000001, 1.5])
    check(`invalid exact money ${amount} fails without charge`, () => {
        const p = fixture(), c = collection(p);
        const s = market.submitContentMarketPrivateOffer(p, c.id, { ...defaults(p, c.id), minimumGuarantee: amount });
        assert.equal(s.changed, false);
        assert.equal(s.reason, 'INVALID_TERMS');
        assert.equal(s.player, p);
    });
check('one conflicting component refuses complete pending package without grants or charge', () => {
    const { p, c, s } = send();
    const ready = respond(s.player, s.negotiation!.id);
    const w = getAbsoluteWeek(ready.age, ready.currentWeek);
    const blocked = registerProductionStreamingRightsContract(ready, {
        sourceProjectId: c.rows[1].componentProjectId, title: 'Conflict', projectType: 'MOVIE', genre: 'DRAMA', sellerStudioId: c.package.seller.id, sellerStudioName: c.sellerName, sellerPartyType: 'NPC_STUDIO', buyerPlatformId: 'NETFLIX', buyerPlatformName: 'Netflix', minimumGuarantee: 20000000, platformRevenueShare: 100, territory: 'MULTI_REGION', countryIds: c.package.requestedCountryIds, exclusivity: 'EXCLUSIVE', signedAtAbsoluteWeek: w, startsAtAbsoluteWeek: w, durationWeeks: 104, windowType: 'FIRST_WINDOW'
    });
    assert.ok(blocked.changed);
    const result = signStreamingRightsDeal(blocked.player, s.negotiation!.id);
    assert.equal(result.changed, false);
    assert.equal(result.player, blocked.player);
    assert.equal(result.player.ownedStreamingPlatform.catalogLicenses.length, 0);
    assert.equal(Object.keys(result.player.world.streamingRightsContracts).length, 1);
    assert.equal(result.player.ownedStreamingPlatform.treasuryCash, p.ownedStreamingPlatform.treasuryCash);
});
check('cash and energy rechecked at signature', () => {
    const { s } = send();
    const ready = respond(s.player, s.negotiation!.id);
    for (const field of ['cash', 'energy']) {
        const q = reload(ready);
        if (field === 'cash')
            q.ownedStreamingPlatform.treasuryCash = 1;
        else
            q.energy.current = 0;
        const r = signStreamingRightsDeal(q, s.negotiation!.id);
        assert.equal(r.changed, false);
        assert.equal(r.player, q);
        assert.equal(q.ownedStreamingPlatform.catalogLicenses.length, 0);
    }
});
check('new marketing and unsupported countries/windows/modes are refused', () => {
    for (const patch of [{ marketingGuarantee: 1 }, { countryIds: ['JP'] }, { windowType: 'PERMANENT' }, { accessGrant: {
                schemaVersion: 1, modes: ['PURCHASE'], earlyWindowWeeks: 0, purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT'
            } }]) {
        const p = fixture(), c = collection(p);
        const r = market.submitContentMarketPrivateOffer(p, c.id, { ...defaults(p, c.id), ...patch });
        assert.equal(r.changed, false, JSON.stringify(patch));
    }
});
check('revision invalidates advertised acceptance and counter terms can settle', () => {
    const p = fixture(), c = collection(p);
    const t = defaults(p, c.id);
    const s = market.submitContentMarketPrivateOffer(p, c.id, t);
    assert.ok(s.changed);
    const revised = reviseStreamingRightsNegotiation(s.player, s.negotiation!.id, { ...t, minimumGuarantee: Math.ceil(c.totalGuarantee * .99) });
    assert.ok(revised.changed, revised.detail);
    assert.equal(revised.negotiation!.proposalVersion, 2);
    const ready = respond(reload(revised.player), s.negotiation!.id);
    const n = ready.ownedStreamingPlatform.rightsNegotiations[0];
    assert.equal(n.status, 'COUNTERED');
    const accepted = acceptStreamingRightsCounter(ready, n.id);
    assert.ok(accepted.changed);
    const signed = signStreamingRightsDeal(accepted.player, n.id);
    assert.ok(signed.changed, signed.detail);
    assert.equal(signed.player.ownedStreamingPlatform.catalogLicenses.reduce((v, l) => v + l.minimumGuarantee, 0), n.counterMinimumGuarantee);
});
check('collection aggregate above old five-billion cap remains exact', () => {
    const p = fixture(), c = collection(p), amount = 5123456789;
    const sent = market.submitContentMarketPrivateOffer(p, c.id, { ...defaults(p, c.id), minimumGuarantee: amount });
    assert.ok(sent.changed);
    assert.equal(reload(sent.player).ownedStreamingPlatform.rightsNegotiations[0].minimumGuarantee, amount);
    const signed = signStreamingRightsDeal(respond(sent.player, sent.negotiation!.id), sent.negotiation!.id);
    assert.ok(signed.changed, signed.detail);
    assert.equal(signed.player.ownedStreamingPlatform.catalogLicenses.reduce((v, l) => v + l.minimumGuarantee, 0), amount);
    assert.equal(signed.player.world.streamingCataloguePackages[c.id].totalExpectedExposure, amount, 'zero backend exposure equals exact guarantee');
});
check('missing component, lost country and expired snapshot fail closed at response', () => {
    for (const mode of ['component', 'country', 'window']) {
        const { s, c } = send();
        const p = reload(s.player);
        if (mode === 'component')
            p.world.projects = p.world.projects.filter(item => item.id !== c.rows[0].componentProjectId);
        if (mode === 'country') {
            p.ownedStreamingPlatform.identity!.dayOneMarketIds = ['JP'];
            p.ownedStreamingPlatform.marketOperations = [];
        }
        if (mode === 'window')
            p.ownedStreamingPlatform.rightsNegotiations[0].responseDueAbsoluteWeek = getAbsoluteWeek(p.age, p.currentWeek) + 105;
        const replied = respond(p, s.negotiation!.id);
        assert.equal(replied.ownedStreamingPlatform.rightsNegotiations[0].responseStatus, 'RIGHTS_SOLD', mode);
        assert.equal(replied.ownedStreamingPlatform.catalogLicenses.length, 0);
    }
});
check('pending snapshot does not acquire a later producer release', () => {
    const { s, c } = send();
    s.player.world.projects.push({ ...s.player.world.projects.find(p => p.id === c.rows[0].componentProjectId)!, id: 'new-producer-film' });
    const signed = signStreamingRightsDeal(respond(s.player, s.negotiation!.id), s.negotiation!.id);
    assert.ok(signed.changed, signed.detail);
    assert.deepEqual(signed.player.ownedStreamingPlatform.catalogProjectIds.slice().sort(), c.rows.map(r => r.componentProjectId).sort());
});
check('individual proposals preserve exact money and reject invalid money and marketing', () => {
    const p = fixture(), a = market.getContentMarketAuctionAssignments(p), l = market.getContentMarketListings(p).find(l => !a.listingIds.has(l.id))!;
    const t = defaults(p, l.id);
    const sent = market.submitContentMarketPrivateOffer(p, l.id, {
        ...t, minimumGuarantee: 123456789, cancellationPenalty: 1234567, changeOfControl: 'NOTICE'
    });
    assert.ok(sent.changed, sent.detail);
    assert.equal(sent.negotiation!.minimumGuarantee, 123456789);
    assert.equal(sent.negotiation!.cancellationPenalty, 1234567);
    assert.equal(sent.negotiation!.changeOfControl, 'NOTICE');
    for (const patch of [{ minimumGuarantee: NaN }, { minimumGuarantee: 5000000001 }, { marketingGuarantee: 1 }])
        assert.equal(market.submitContentMarketPrivateOffer(p, l.id, { ...t, ...patch }).changed, false);
});
check('individual private proposal rejects overbroad modes and countries instead of silently changing them', () => {
    const p = fixture(), a = market.getContentMarketAuctionAssignments(p), l = market.getContentMarketListings(p).find(l => !a.listingIds.has(l.id))!;
    for (const patch of [{ countryIds: ['JP'] }, { accessGrant: {
                schemaVersion: 1, modes: ['PURCHASE'], earlyWindowWeeks: 0, purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT'
            } }])
        assert.equal(market.submitContentMarketPrivateOffer(p, l.id, { ...defaults(p, l.id), ...patch }).changed, false);
});
check('counter cannot be accepted after its signing deadline', () => {
    const p = fixture(), c = collection(p), t = defaults(p, c.id);
    const sent = market.submitContentMarketPrivateOffer(p, c.id, { ...t, minimumGuarantee: Math.ceil(c.totalGuarantee * .99) });
    const replied = respond(sent.player, sent.negotiation!.id);
    const n = replied.ownedStreamingPlatform.rightsNegotiations[0];
    assert.equal(n.status, 'COUNTERED');
    const late = n.signingDeadlineAbsoluteWeek! + 1;
    replied.age = Math.floor(late / 52) + 1;
    replied.currentWeek = late % 52 + 1;
    assert.equal(acceptStreamingRightsCounter(replied, n.id).changed, false);
});
check('malformed persisted collection snapshots refuse without throwing or granting a component', () => {
    for (const mutate of [() => ({}), () => ({ schemaVersion: 1, package: null }), (v: any) => ({ ...v, package: { ...v.package, components: null } }), (v: any) => ({ ...v, package: { ...v.package, acceptedTerms: [null] } }), (v: any) => ({ ...v, package: { ...v.package, acceptedTerms: v.package.acceptedTerms.map((r: any) => ({ ...r, minimumGuarantee: 0 })) } }), (v: any) => ({ ...v, package: { ...v.package, acceptedTerms: v.package.acceptedTerms.map((r: any) => ({ ...r, minimumGuarantee: Number.MAX_SAFE_INTEGER + 1 })) } })]) {
        const { s } = send();
        const ready = respond(s.player, s.negotiation!.id);
        ready.ownedStreamingPlatform.rightsNegotiations[0].collectionSnapshot = mutate(ready.ownedStreamingPlatform.rightsNegotiations[0].collectionSnapshot) as any;
        const loaded = reload(ready);
        const result = signStreamingRightsDeal(loaded, s.negotiation!.id);
        assert.equal(result.changed, false);
        assert.equal(result.player, loaded);
        assert.equal(loaded.ownedStreamingPlatform.catalogLicenses.length, 0);
    }
});
check('changed inherited component mode grant refuses the entire original-studio package', () => {
    const { s, c } = send();
    const ready = respond(s.player, s.negotiation!.id);
    const w = getAbsoluteWeek(ready.age, ready.currentWeek);
    const granted = registerProductionStreamingRightsContract(ready, {
        sourceProjectId: c.rows[0].componentProjectId, title: 'Inherited component', projectType: 'MOVIE', genre: 'DRAMA', sellerStudioId: 'original-studio', sellerStudioName: 'Original Studio', sellerPartyType: 'NPC_STUDIO', buyerPlatformId: 'NETFLIX', buyerPlatformName: 'Netflix', minimumGuarantee: 20000000, platformRevenueShare: 100, territory: 'MULTI_REGION', countryIds: c.package.requestedCountryIds, exclusivity: 'NON_EXCLUSIVE', signedAtAbsoluteWeek: w, startsAtAbsoluteWeek: w, durationWeeks: 104, windowType: 'FIRST_WINDOW'
    });
    assert.ok(granted.changed);
    const contract = Object.values(granted.player.world.streamingRightsContracts)[0];
    contract.buyer = {
        type: 'NPC_STUDIO', id: c.package.seller.id, name: c.sellerName, platformId: null
    };
    contract.accessGrant = {
        schemaVersion: 1, modes: ['RENTAL'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT'
    };
    const refused = signStreamingRightsDeal(granted.player, s.negotiation!.id);
    assert.equal(refused.changed, false);
    assert.equal(refused.player, granted.player);
    assert.equal(refused.player.ownedStreamingPlatform.catalogLicenses.length, 0);
    assert.equal(Object.keys(refused.player.world.streamingRightsContracts).length, 1);
});
check('original-owner agreed duration remains exact after private review delay', () => {
    const p = fixture(), c = collection(p);
    const sent = market.submitContentMarketPrivateOffer(p, c.id, defaults(p, c.id));
    const signed = signStreamingRightsDeal(respond(sent.player, sent.negotiation!.id), sent.negotiation!.id);
    assert.ok(signed.changed);
    assert.ok(signed.player.ownedStreamingPlatform.catalogLicenses.every(l => l.durationWeeks === 104 && l.expiresAtAbsoluteWeek === l.startsAtAbsoluteWeek + 104));
});
check('future grant overlapping the end of the exact signature term refuses the whole package', () => {
    const p = fixture(), c = collection(p);
    const sent = market.submitContentMarketPrivateOffer(p, c.id, defaults(p, c.id));
    const ready = respond(sent.player, sent.negotiation!.id);
    const start = c.package.startsAtAbsoluteWeek + 104;
    const blocked = registerProductionStreamingRightsContract(ready, {
        sourceProjectId: c.rows[0].componentProjectId, title: 'Future conflict', projectType: 'MOVIE', genre: 'DRAMA', sellerStudioId: c.package.seller.id, sellerStudioName: c.sellerName, sellerPartyType: 'NPC_STUDIO', buyerPlatformId: 'NETFLIX', buyerPlatformName: 'Netflix', minimumGuarantee: 20000000, platformRevenueShare: 100, territory: 'MULTI_REGION', countryIds: c.package.requestedCountryIds, exclusivity: 'EXCLUSIVE', signedAtAbsoluteWeek: getAbsoluteWeek(ready.age, ready.currentWeek), startsAtAbsoluteWeek: start, durationWeeks: 104, windowType: 'FIRST_WINDOW'
    });
    assert.ok(blocked.changed);
    const refused = signStreamingRightsDeal(blocked.player, sent.negotiation!.id);
    assert.equal(refused.changed, false);
    assert.equal(refused.player, blocked.player);
    assert.equal(refused.player.ownedStreamingPlatform.catalogLicenses.length, 0);
});
check('prelaunch opening countries awaiting clearance can negotiate and sign', () => {
    const p = fixture();
    p.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(p.ownedStreamingPlatform, p.id);
    p.ownedStreamingPlatform.marketOperations = p.ownedStreamingPlatform.marketOperations.map(m => ({ ...m, status: 'CLEARANCE', entryKind: 'OPENING' }));
    assert.equal(p.ownedStreamingPlatform.marketOperations.filter(m => m.status === 'ACTIVE').length, 0);
    const c = collection(p), sent = market.submitContentMarketPrivateOffer(p, c.id, defaults(p, c.id));
    assert.ok(sent.changed, sent.detail);
    const signed = signStreamingRightsDeal(respond(sent.player, sent.negotiation!.id), sent.negotiation!.id);
    assert.ok(signed.changed, signed.detail);
});
const changedOriginalSource = (p: Player, sourceId: string, change: string): Player => {
    const next = reload(p);
    if (change === 'removed-source')
        next.world.projects = next.world.projects.filter(project => project.id !== sourceId);
    if (change === 'changed-seller')
        next.world.projects = next.world.projects.map(project => project.id === sourceId ? { ...project, studioId: 'other-seller' } : project);
    if (change === 'lost-countries') {
        next.ownedStreamingPlatform.identity!.dayOneMarketIds = ['JP'];
        next.ownedStreamingPlatform.marketOperations = [];
    }
    return next;
};
for (const change of ['removed-source', 'changed-seller', 'lost-countries']) {
    check(`individual ${change} refuses response, revision, counter and signature`, () => {
        const p = fixture();
        const auctionIds = market.getContentMarketAuctionAssignments(p).listingIds;
        const listing = market.getContentMarketListings(p).find(item => !auctionIds.has(item.id))!;
        const terms = defaults(p, listing.id);
        const sent = market.submitContentMarketPrivateOffer(p, listing.id, { ...terms, minimumGuarantee: 123456789 });
        assert.ok(sent.changed, sent.detail);
        const pending = changedOriginalSource(sent.player, listing.title.id, change);
        const revised = reviseStreamingRightsNegotiation(pending, sent.negotiation!.id, { ...terms, minimumGuarantee: 123456789 });
        assert.equal(revised.changed, false, 'stale revision');
        assert.equal(revised.player, pending);
        const lost = respond(pending, sent.negotiation!.id);
        assert.equal(lost.ownedStreamingPlatform.rightsNegotiations[0].responseStatus, 'RIGHTS_SOLD', 'stale response');
        const ready = changedOriginalSource(respond(sent.player, sent.negotiation!.id), listing.title.id, change);
        const signed = signStreamingRightsDeal(ready, sent.negotiation!.id);
        assert.equal(signed.changed, false, 'stale signature');
        assert.equal(signed.player, ready);
        assert.equal(ready.ownedStreamingPlatform.catalogLicenses.length, 0);
        const counterSent = market.submitContentMarketPrivateOffer(p, listing.id, { ...terms, minimumGuarantee: Math.round(listing.rivalBidAmount * .99) });
        assert.ok(counterSent.changed, counterSent.detail);
        const counter = respond(counterSent.player, counterSent.negotiation!.id);
        assert.equal(counter.ownedStreamingPlatform.rightsNegotiations[0].status, 'COUNTERED');
        const staleCounter = changedOriginalSource(counter, listing.title.id, change);
        const accepted = acceptStreamingRightsCounter(staleCounter, counterSent.negotiation!.id);
        assert.equal(accepted.changed, false, 'stale counter');
        assert.equal(accepted.player, staleCounter);
    });
}
check('direct collection opener refuses auction and fabricated sources', () => {
    const p = fixture();
    const auctions = market.getContentMarketAuctionAssignments(p).collectionIds;
    const auction = market.getContentMarketCollections(p).find(item => auctions.has(item.id))!;
    const plain = collection(p);
    const terms = { ...defaults(p, plain.id), countryIds: auction.package.requestedCountryIds, minimumGuarantee: auction.totalGuarantee };
    assert.equal(market.submitContentMarketPrivateOffer(p, auction.id, terms).changed, false);
    assert.equal(openStreamingCollectionPrivateOffer(p, auction, terms).changed, false, 'public direct auction bypass');
    const fabricated = { ...plain, id: 'fabricated-package', package: { ...plain.package, id: 'fabricated-package' } };
    assert.equal(openStreamingCollectionPrivateOffer(p, fabricated, defaults(p, plain.id)).changed, false, 'fabricated source');
});
check('direct collection opener refuses a stale or already reserved package', () => {
    const p = fixture(), c = collection(p), terms = defaults(p, c.id);
    const later = reload(p);
    later.currentWeek += 3;
    assert.equal(openStreamingCollectionPrivateOffer(later, c, terms).changed, false, 'old rotating offer');
    const sent = market.submitContentMarketPrivateOffer(p, c.id, terms);
    assert.ok(sent.changed);
    assert.equal(openStreamingCollectionPrivateOffer(sent.player, c, terms).changed, false, 'reserved source');
});
check('legitimate historical and career original sources survive private review and signature', () => {
    for (const kind of ['historical', 'career']) {
        let p = fixture();
        if (kind === 'historical')
            p = initializeHistoricalCatalogue(p);
        else {
            p.pastProjects = p.world.projects.map(project => ({
                id: project.id, name: project.title, studioId: project.studioId, projectType: 'MOVIE', genre: 'DRAMA', year: 24, releaseYear: 24, releaseWeek: 1, rating: 3, imdbRating: 3, gross: 1000000
            } as any));
            p.world.projects = [];
        }
        const auctions = market.getContentMarketAuctionAssignments(p).listingIds;
        const listing = market.getContentMarketListings(p).find(item => !auctions.has(item.id)
            && (kind !== 'historical' || item.title.id.startsWith('historical_')))!;
        assert.ok(listing, `${kind} private listing exists`);
        const sent = market.submitContentMarketPrivateOffer(p, listing.id, defaults(p, listing.id));
        assert.ok(sent.changed, sent.detail);
        const ready = respond(sent.player, sent.negotiation!.id);
        assert.equal(ready.ownedStreamingPlatform.rightsNegotiations[0].status, 'READY_TO_SIGN');
        const signed = signStreamingRightsDeal(ready, sent.negotiation!.id);
        assert.ok(signed.changed, signed.detail);
        assert.equal(signed.player.ownedStreamingPlatform.catalogLicenses[0].sourceProjectId, listing.title.id);
    }
});
check('direct collection opener derives current payload instead of trusting caller data', () => {
    const p = fixture(), c = collection(p), terms = defaults(p, c.id);
    const forged = {
        ...c, totalGuarantee: 1, rows: [], package: {
            ...c.package, components: [], totalGuarantee: 1, acceptedTerms: []
        }
    };
    const opened = openStreamingCollectionPrivateOffer(p, forged, terms);
    assert.ok(opened.changed, opened.detail);
    assert.equal(opened.negotiation!.collectionSnapshot!.package.totalGuarantee, c.totalGuarantee);
    assert.deepEqual(opened.negotiation!.collectionSnapshot!.package.components, c.package.components);
});
try {
    const p = fixture();
    p.currentWeek = 12;
    const c = collection(p), sent = market.submitContentMarketPrivateOffer(p, c.id, defaults(p, c.id));
    assert.ok(sent.changed, sent.detail);
    let current = reload(sent.player);
    const originalIds = c.rows.map(r => r.componentProjectId).sort();
    const due = sent.negotiation!.responseDueAbsoluteWeek!;
    const originalCash = current.ownedStreamingPlatform.treasuryCash;
    while (getAbsoluteWeek(current.age, current.currentWeek) < due) {
        current = (await processGameWeek(current)).player;
        current = reload(current);
    }
    const n = current.ownedStreamingPlatform.rightsNegotiations.find(n => n.id === sent.negotiation!.id)!;
    assert.equal(n.responseStatus, 'SELLER_ACCEPTED');
    assert.equal(current.ownedStreamingPlatform.catalogLicenses.length, 0);
    const signed = signStreamingRightsDeal(current, n.id);
    assert.ok(signed.changed, signed.detail || signed.reason);
    assert.deepEqual(signed.player.ownedStreamingPlatform.catalogProjectIds.slice().sort(), originalIds);
    assert.equal(current.ownedStreamingPlatform.treasuryCash - signed.player.ownedStreamingPlatform.treasuryCash, n.minimumGuarantee);
    checks++;
    console.log('PASS actual processed weeks cross market rotation, preserve pending prelaunch offer and settle frozen IDs', JSON.stringify({
        due, originalCash, preSignatureCash: current.ownedStreamingPlatform.treasuryCash, fee: n.minimumGuarantee
    }));
}
catch (e) {
    failures.push(`actual weekly lifecycle: ${(e as Error).message}`);
    console.error('FAIL', failures.at(-1));
}
console.log(JSON.stringify({ checks, failures }, null, 2));
if (failures.length)
    process.exitCode = 1;
