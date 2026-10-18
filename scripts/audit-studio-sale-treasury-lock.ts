import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Business, type Player, type StudioSaleDeck } from '../types';
import { createBusiness } from '../services/businessLogic';
import { performStudioTreasuryTransfer, executeFullStudioMerger, reverseFullStudioMerger, getStudioLiquidationBlocker, getStudioFullMergerBlocker, DEFAULT_STUDIO_OPERATING_MANDATE, setStudioOperatingMandate, setSubsidiaryOperatingModel } from '../services/studioGroup';

const hq = createBusiness('Home Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {
    quality: 'PREMIUM', pricing: 'MARKET', marketing: 'LOW', productionType: 'Original Studio',
}, '🎬', 1);
hq.id = 'treasury_hq'; hq.balance = 900_000_000;
const subsidiary = structuredClone(hq);
subsidiary.id = 'treasury_sub'; subsidiary.name = 'Bought Pictures';
subsidiary.config.productionType = 'Acquired Studio';
subsidiary.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION';
subsidiary.studioState!.operatingModel = 'CONTROLLED_SUBSIDIARY';
subsidiary.balance = 800_000_000;
const base: Player = { ...structuredClone(INITIAL_PLAYER), age: 36, currentWeek: 22, money: 2_000_000_000, businesses: [hq, subsidiary] };
const deck = (studio: Business, status: StudioSaleDeck['status']): StudioSaleDeck => ({
    id: `sale_${studio.id}`, studioId: studio.id, studioName: studio.name, status,
    askPrice: 1_000_000_000, minimumPrice: 800_000_000, indicativeValuation: 1_000_000_000,
    listedWeek: 22, listedYear: 36, offerWindowWeeks: 3, offersCloseWeek: 25, offersCloseYear: 36,
    offers: [], transferTerms: { nameRights: 'BUYER_KEEPS_NAME', catalogRights: 'FULL_LIBRARY', sellerCredit: true, staffProtectionWeeks: 12, royaltyPercent: 0, royaltyWeeks: 0 },
});
let checks = 0;
const transfer = (player: Player, studioId: string, action: 'INJECT'|'WITHDRAW', counterparty: 'PERSONAL'|'HQ') => performStudioTreasuryTransfer({ player, studioId, action, counterparty, amount: 1_000_000 });
for (const studioId of [hq.id, subsidiary.id]) {
    for (const action of ['INJECT', 'WITHDRAW'] as const) {
        const result = transfer(base, studioId, action, 'PERSONAL');
        assert.equal(result.success, true, `ordinary ${studioId} ${action} succeeds`); checks++;
    }
}
for (const status of ['DRAFT', 'LISTED', 'NEGOTIATING', 'SIGNING'] as const) {
    for (const listedId of [hq.id, subsidiary.id]) {
        const listed = structuredClone(base);
        const studio = listed.businesses.find(item => item.id === listedId)!;
        studio.studioState!.saleDeck = deck(studio, status);
        const restored = JSON.parse(JSON.stringify(listed)) as Player;
        for (const action of ['INJECT', 'WITHDRAW'] as const) {
            for (const counterparty of ['PERSONAL', 'HQ'] as const) {
                const result = transfer(restored, subsidiary.id, action, counterparty);
                assert.equal(result.success, false, `${status} ${listedId} blocks ${action}/${counterparty}`);
                assert.equal(result.reason, 'LIVE_SALE_LISTING');
                assert.deepEqual(result.player, restored, 'rejection changes no balances or save fields'); checks++;
            }
            const directHq = transfer(restored, hq.id, action, 'PERSONAL');
            assert.equal(directHq.success, listedId !== hq.id, 'only packaged HQ cash is frozen'); checks++;
        }
    }
}
for (const status of ['CLOSED', 'WITHDRAWN'] as const) {
    const ended = structuredClone(base);
    ended.businesses[0].studioState!.saleDeck = deck(ended.businesses[0], status);
    for (const action of ['INJECT', 'WITHDRAW'] as const) {
        assert.equal(transfer(ended, subsidiary.id, action, 'HQ').success, true, `${status} releases treasury`); checks++;
    }
}
assert.equal(setStudioOperatingMandate({ player: base, studioId: hq.id, mandate: DEFAULT_STUDIO_OPERATING_MANDATE }).success, false, 'HQ cannot receive subsidiary mandate'); checks++;
assert.equal(setSubsidiaryOperatingModel({ player: base, studioId: hq.id, model: 'CONTROLLED_SUBSIDIARY' }).success, false, 'HQ cannot become acquired via operating-model UI'); checks++;
const listedGroup = structuredClone(base);
listedGroup.businesses[0].studioState!.saleDeck = deck(listedGroup.businesses[0], 'LISTED');
assert.equal(executeFullStudioMerger({ player: listedGroup, studioId: subsidiary.id }).success, false, 'merger cannot move listed package capital'); checks++;
const mergedGroup = structuredClone(listedGroup);
mergedGroup.businesses[1].studioState!.operatingModel = 'FULL_MERGER';
assert.equal(reverseFullStudioMerger({ player: mergedGroup, studioId: subsidiary.id }).success, false, 'carve-out cannot move listed HQ capital'); checks++;
assert.ok(getStudioLiquidationBlocker(listedGroup, listedGroup.businesses[0]), 'listed group liquidation blocked'); checks++;
assert.ok(getStudioLiquidationBlocker(base, subsidiary), 'acquired studio must use ownership-aware sale'); checks++;
assert.ok(getStudioLiquidationBlocker(base, hq), 'group liquidation cannot orphan subsidiary assets'); checks++;
assert.equal(getStudioLiquidationBlocker({ businesses: [hq] }, hq), null, 'unlisted standalone HQ liquidation remains available'); checks++;
const minorityOwner = structuredClone(base);
minorityOwner.stockTakeovers = [{ acquiredBusinessId: subsidiary.id, relatedStudioId: subsidiary.id, ownershipPercent: 52 }] as Player['stockTakeovers'];
const minorityMerger = executeFullStudioMerger({ player: minorityOwner, studioId: subsidiary.id });
assert.equal(minorityMerger.success, false, 'prelisting merger cannot turn minority equity into wholly owned HQ cash'); checks++;
assert.equal(minorityMerger.reason, 'MINORITY_OWNERSHIP'); checks++;
assert.deepEqual(minorityMerger.player, minorityOwner, 'minority merger rejection preserves all save balances'); checks++;
assert.ok(getStudioFullMergerBlocker(minorityOwner, minorityOwner.businesses[1])?.includes('100% ownership'), 'merger UI has actionable ownership reason'); checks++;
assert.equal(getStudioFullMergerBlocker(base, subsidiary), null, 'fully owned unlisted merger remains available'); checks++;
const financeSource = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const financeModal = financeSource.slice(financeSource.indexOf('const FinanceModal:'), financeSource.indexOf('const StudioFinanceView:'));
assert.ok(financeModal.includes('performStudioTreasuryTransfer'), 'HQ finance modal uses guarded service'); checks++;
assert.ok(!financeModal.includes('balance: studio.balance - amount'), 'HQ finance modal cannot directly strip cash'); checks++;
assert.ok(financeSource.includes('getStudioLiquidationBlocker'), 'liquidation shortcut uses live package/ownership guard'); checks++;
const salePanel = readFileSync('views/lifestyle/business/components/StudioSaleDeckPanel.tsx', 'utf8');
assert.ok(salePanel.includes('refreshStudioSaleDeck') && salePanel.includes('getStudioSaleRevalidationIssue'), 'legacy sale UI uses real revalidation and refresh services'); checks++;
assert.ok(salePanel.includes('Refresh buyer terms'), 'stale listing has an actionable refresh control'); checks++;
const groupUi = readFileSync('views/lifestyle/business/StudioGroupView.tsx', 'utf8');
assert.ok(groupUi.includes('disabled={!selectedModel || !!mergerLock}') && groupUi.includes('disabled={!canAfford || !!saleLock}'), 'merger and carve-out UI show and enforce treasury locks'); checks++;
assert.ok(salePanel.includes('Your proceeds') && salePanel.includes('sellerOwnershipPercent') && salePanel.includes('Total package'), 'sale UI distinguishes company value and owner proceeds'); checks++;
assert.ok(salePanel.includes('Retaining the full library requires 100% ownership') && salePanel.includes('catalogRetentionAllowed'), 'partial-owned sale cannot offer whole-library retention'); checks++;
console.log(`PASS studio sale treasury locks (${checks} checks)`);
