/* #316: the Production House's Rights room. What it shows is true, every answer does what it says, and selling is one door. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Player, StreamingRightsContract } from '../types';
import RightsRoom from '../components/rights/RightsRoom';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    estimateRightsPackage,
    getRightsNextStep,
    getRightsPartners,
    getRightsRoom,
    getRightsTitleSheet,
    leaveRightsPackageRoom,
    openRightsPackageRoom,
    signRightsPackage,
} from '../services/rightsRoom';
import { advanceStreamingBiddingSession, getStreamingBiddingClosingOffers } from '../services/streamingBidding';
import { buildStreamingRightsPhase8QaFixture } from '../services/streamingRightsQa';
import { resolveStreamingRightsRenewal, updateStreamingRightsStudioMandate } from '../services/streamingRightsCalendar';
import { INITIAL_PLAYER } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getStreamingCataloguePackageDesk } from '../services/streamingCataloguePackages';

const studioId = 'empire-studios';
const base = structuredClone(INITIAL_PLAYER) as Player;
base.businesses = [{
    id: studioId, name: 'Empire Studios', type: 'PRODUCTION_HOUSE', balance: 500_000_000,
    stats: { weeklyRevenue: 0, weeklyProfit: 0, lifetimeRevenue: 0 },
    studioState: { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 },
}] as Player['businesses'];
const player: Player = buildStreamingRightsPhase8QaFixture(base, studioId);
const week = getAbsoluteWeek(player.age, player.currentWeek);

const view = getRightsRoom(player, studioId);
assert.ok(view.onServices.length >= 5, `titles out on services (${view.onServices.length})`);
assert.ok(view.freeToSell.length >= 5, `titles on the shelf (${view.freeToSell.length})`);
const ids = (rows: Array<{ projectId: string }>) => new Set(rows.map(row => row.projectId));
const onServices = ids(view.onServices);
view.freeToSell.forEach(title => assert.ok(!onServices.has(title.projectId), `${title.title} cannot be both out and free`));
assert.equal(new Set(view.freeToSell.map(title => title.projectId)).size, view.freeToSell.length, 'a title is on the shelf once');
for (let index = 1; index < view.onServices.length; index += 1) {
    const left = view.onServices[index - 1], right = view.onServices[index];
    if (!left.onYourService && !right.onYourService) assert.ok((left.weeksLeft ?? 9999) <= (right.weeksLeft ?? 9999), 'what ends soonest comes first');
}
for (let index = 1; index < view.freeToSell.length; index += 1) assert.ok(view.freeToSell[index - 1].rating >= view.freeToSell[index].rating, 'best first');
view.onServices.forEach(title => {
    assert.ok(title.buyerName, `${title.title} shows who has it`);
    assert.match(title.buyerColor, /^#/, 'in that service\'s own colour');
    assert.ok(title.used >= 0 && title.used <= 1);
});
assert.ok(view.yearIncome >= 0);

/* #316: a title an old save holds off the market is not a tile that leads nowhere */
{
    const held = getRightsRoom(migratePlayerSave(structuredClone(player)) as Player, studioId);
    held.heldBack.forEach(row => assert.ok(row.why.length > 0 && !held.freeToSell.some(title => title.title === row.title), `${row.title} says why, and is not for sale`));
    assert.ok(getStreamingCataloguePackageDesk(player, studioId, week));
}

/* one title, one sheet */
const out = view.onServices.find(title => !title.onYourService)!;
const sheet = getRightsTitleSheet(player, studioId, out.projectId)!;
assert.equal(sheet.title, out.title);
assert.equal(sheet.buyerName, out.buyerName);
assert.equal(sheet.weeksLeft, out.weeksLeft);
assert.ok(sheet.theyPaid > 0, 'it says what they paid');
assert.ok(sheet.earned >= sheet.theyPaid);
assert.ok(sheet.history.some(row => /Sold to|Renewed with|passed it/.test(row.what)), 'and how it got there');
assert.ok(sheet.next.headline.length > 0 && sheet.next.line.length > 0);
assert.equal(getRightsTitleSheet(player, studioId, view.freeToSell[0].projectId), null, 'a title with no deal has no deal sheet');

/* what happens next says what the code will do */
const contract = { buyer: { name: 'Netflix' }, expiresAtAbsoluteWeek: week + 5, renewalOption: true, permanentPurchase: false, windowType: 'FIRST_WINDOW' } as unknown as StreamingRightsContract;
const offered = { id: 'c', outcome: 'PENDING', status: 'OFFER_AVAILABLE', offerDisposition: 'OFFERED', proposedEconomics: { minimumGuarantee: 24e6, durationWeeks: 78 }, protectionReasons: [], decisionDeadlineAbsoluteWeek: week + 3 } as any;
assert.match(getRightsNextStep(contract, null, week).line, /talks open/i);
assert.match(getRightsNextStep({ ...contract, renewalOption: false } as any, null, week).line, /No renewal/);
assert.match(getRightsNextStep({ ...contract, permanentPurchase: true } as any, null, week).headline, /for good/);
const team = getRightsNextStep(contract, offered, week);
assert.match(team.headline, /\$24M/);
assert.match(team.line, /The team decides next week/);
assert.ok(team.canRenew && team.caseId === 'c');
const yours = getRightsNextStep(contract, { ...offered, status: 'ACTION_REQUIRED', protectionReasons: ['FRANCHISE_OR_UNIVERSE'] }, week);
assert.match(yours.line, /Franchises always come to you/);
assert.match(yours.line, /waits for you/);
assert.ok(!getRightsNextStep(contract, { ...offered, status: 'ACTION_REQUIRED', offerDisposition: 'DECLINED', proposedEconomics: null }, week).canRenew, 'no offer: nothing to renew');
assert.equal(getRightsNextStep(contract, { ...offered, outcome: 'ACCEPTED' }, week).caseId, null, 'decided: nothing left to answer');
assert.match(getRightsNextStep(contract, { ...offered, outcome: 'RETURN_TO_MARKET' }, week).headline, /Back to you/);
assert.match(getRightsNextStep(contract, { ...offered, outcome: 'LET_EXPIRE' }, week).headline, /ends/);

/* the answer on the card does what it says */
if (view.waiting.length) {
    const item = view.waiting[0];
    const left = resolveStreamingRightsRenewal(player, { caseId: item.id, action: 'LET_EXPIRE', absoluteWeek: week });
    assert.ok(left.changed);
    const after = getRightsRoom(left.player, studioId);
    assert.equal(after.waiting.length, view.waiting.length - 1, 'answered: it stops waiting');
}

/* the partners are read off the contracts */
const partners = getRightsPartners(player, studioId);
const netflixDeals = Object.values(player.world.streamingRightsContracts || {}).filter(item => item.seller.id === studioId && (item.buyer.platformId || item.buyer.id) === 'NETFLIX');
if (netflixDeals.length) {
    const netflix = partners.find(partner => partner.platformId === 'NETFLIX')!;
    assert.ok(netflix.paid >= netflixDeals.reduce((sum, item) => sum + item.minimumGuarantee, 0), 'what they have paid is the contracts');
    assert.equal(netflix.deals + netflix.renewals, netflixDeals.length);
}
for (let index = 1; index < partners.length; index += 1) assert.ok(partners[index - 1].paid >= partners[index].paid, 'the biggest payer first');

/* selling: a room opens at once, on the asked terms, and the shelf knows */
const picks = view.freeToSell.slice(0, 4).map(title => title.projectId);
const estimate = estimateRightsPackage(picks.map(() => ({ quality: 88, gross: 200e6, budget: 0, streamingRevenue: 0 })), 104, 'EXCLUSIVE');
const shared = estimateRightsPackage(picks.map(() => ({ quality: 88, gross: 200e6, budget: 0, streamingRevenue: 0 })), 104, 'NON_EXCLUSIVE');
const longer = estimateRightsPackage(picks.map(() => ({ quality: 88, gross: 200e6, budget: 0, streamingRevenue: 0 })), 156, 'EXCLUSIVE');
assert.ok(estimate.low < estimate.high);
assert.ok(shared.high < estimate.high && longer.high > estimate.high, 'the estimate answers the choices');
const opened = openRightsPackageRoom(player, { studioId, projectIds: picks, durationWeeks: 104, exclusivity: 'EXCLUSIVE' });
assert.ok(opened.session, opened.message || 'the room opened');
const session = opened.session!;
const whileOpen = getRightsRoom(opened.player, studioId);
assert.equal(whileOpen.openRooms.length, 1, 'an open room has a way back');
picks.forEach(id => assert.ok(!ids(whileOpen.freeToSell).has(id), 'titles in the room are not on the shelf'));
const closed = advanceStreamingBiddingSession(session, 45);
const offers = getStreamingBiddingClosingOffers(closed);
assert.ok(offers.length >= 1);
offers.forEach(offer => { assert.equal(offer.exclusivity, 'EXCLUSIVE'); assert.equal(offer.durationWeeks, 104); });
const best = offers.slice().sort((left, right) => right.minimumGuarantee - left.minimumGuarantee)[0];

/* walking out: everything goes back */
const walked = leaveRightsPackageRoom(opened.player, session);
const backOnShelf = getRightsRoom(walked, studioId);
assert.equal(backOnShelf.openRooms.length, 0);
picks.forEach(id => assert.ok(ids(backOnShelf.freeToSell).has(id), 'walking out puts them back on the shelf'));

/* signing: paid, out on the service, off the shelf */
const signedPlayer = { ...opened.player, energy: { ...opened.player.energy, current: 100 } };
const signed = signRightsPackage(signedPlayer, closed, best);
assert.ok(signed.signed, signed.message);
assert.equal(signed.titles, picks.length);
assert.equal(signed.total, best.minimumGuarantee);
const afterSale = getRightsRoom(signed.player, studioId);
picks.forEach(id => {
    assert.ok(!ids(afterSale.freeToSell).has(id), 'sold: off the shelf');
    assert.ok(ids(afterSale.onServices).has(id), 'sold: out on the service');
});
assert.equal(afterSale.openRooms.length, 0);
assert.ok(afterSale.yearIncome > view.yearIncome, 'and the money is in this year\'s number');

/* the team's rules really change */
const changed = updateStreamingRightsStudioMandate(player, { studioId, absoluteWeek: week, patch: { controlMode: 'FULL', renewalPreference: 'RETEST_MARKET', durationPreference: 'SHORT', exclusivityPolicy: 'RESTRICT', maximumAutomaticGuarantee: 50_000_000, protectFranchises: false } });
const changedMandate = getRightsRoom(changed, studioId).mandate;
assert.equal(changedMandate.controlMode, 'FULL');
assert.equal(changedMandate.renewalPreference, 'RETEST_MARKET');
assert.equal(changedMandate.durationPreference, 'SHORT');
assert.equal(changedMandate.exclusivityPolicy, 'RESTRICT');
assert.equal(changedMandate.maximumAutomaticGuarantee, 50_000_000);
assert.equal(changedMandate.protectFranchises, false);

/* on the screen */
const markup = renderToStaticMarkup(React.createElement(RightsRoom, { player, studioId, onUpdatePlayer: () => undefined, onClose: () => undefined, onSellTitle: () => undefined, onOpenFilm: () => undefined }));
assert.match(markup, /data-rights-room-home/);
assert.match(markup, /Team renews|I decide/);
assert.match(markup, /This year/);
assert.match(markup, /On services/);
assert.match(markup, /Free to sell/);
assert.match(markup, /Partners/);
assert.match(markup, /Money/);
assert.doesNotMatch(markup, /Portfolio|Mandate|Action rail|Licensing portfolio/i, 'the old desk words are gone');

console.log('rights room audit passed');
