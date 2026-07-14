import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assertIncludes = (content, needle, label) => {
  if (!content.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
};
const assertNotIncludes = (content, needle, label) => {
  if (content.includes(needle)) {
    throw new Error(`${label}: should not include ${needle}`);
  }
};

const types = read('types.ts');
const service = read('services/studioSale.ts');
const stockLogic = read('services/stockLogic.ts');
const panel = read('views/lifestyle/business/components/StudioSaleDeckPanel.tsx');
const commandCenter = read('views/lifestyle/business/OwnedStudioCommandCenter.tsx');
const productionHouse = read('views/lifestyle/business/ProductionHouseGame.tsx');
const gameLoop = read('services/gameLoop.ts');
const packageJson = read('package.json');

[
  'StudioSaleDeckStatus',
  'StudioSaleBuyerType',
  'StudioSaleTransferTerms',
  'StudioSaleOffer',
  'StudioSaleDeck',
  'saleDeck?: StudioSaleDeck',
  "'STUDIO_SALE'",
].forEach(needle => assertIncludes(types, needle, 'types'));

[
  'export const getStudioSaleValuation',
  'export const getStudioSaleReadiness',
  'export const getStudioSaleEffectiveTransferTerms',
  'export const getStudioSalePricingBounds',
  'export const normalizeStudioSalePricing',
  'export const getStudioSalePricingIssue',
  'export const getStudioSaleWindowState',
  'export const createStudioSaleDeck',
  'export const counterStudioSaleOffer',
  'export const counterAllStudioSaleOffers',
  'export const acceptStudioSaleOffer',
  'export const completeStudioSaleTransfer',
  'export const processStudioSaleRoyalties',
  'recalculateBusinessValuation',
  'closeDebtForStudios',
  'getIncludedStudioIds',
  'includedStudios',
  'moveRetainedCatalogToParent',
  'retainedCatalogTargetName',
  'debtAtListing',
  'getOfferPackageValue',
  'getOfferRoyaltyPitch',
  'Distress pricing',
  'Group package includes',
  'Buyer may rebrand after transfer',
  'Buyer assumes all listed acquisition debt',
  'escrow pays',
  'stockTakeovers:',
  'stocks:',
  'portfolio:',
  'studioSaleRoyalties',
  'studioSaleHistory',
  'soldStudioIds',
].forEach(needle => assertIncludes(service, needle, 'studioSale service'));

[
  'getSoldStudioIds',
  'isStockRetiredBySale',
  'soldStudioIds',
  'getTradableStocks',
].forEach(needle => assertIncludes(stockLogic, needle, 'stock logic sold studio filter'));

[
  'StudioSaleEntryCard',
  'StudioSaleRoom',
  'Open For Offers',
  'Market Window',
  'Counter All',
  'Choose Buyer',
  'Close The Sale',
  'Name & Banner Rights',
  'IP & Catalog Transfer',
  'Staff Shield',
  'Walk-Away Floor',
  'getSignerName',
  'signerName',
  'safeVibrate',
  'normalizeStudioSalePricing',
  'getStudioSaleEffectiveTransferTerms',
  'Package Includes',
  'Parent sale transfers the full library',
  'grid-cols-[repeat(3,minmax(0,1fr))]',
].forEach(needle => assertIncludes(panel, needle, 'studio sale panel'));

[
  'Process Week',
  'process week',
  'processWeek',
  'advanceWeek',
  '✒',
  '🔨',
  '⏳',
].forEach(needle => assertNotIncludes(panel, needle, 'studio sale panel'));

assertIncludes(commandCenter, 'StudioSaleEntryCard', 'owned command center');
assertIncludes(commandCenter, 'StudioSaleRoom', 'owned command center');
assertIncludes(productionHouse, 'StudioSaleEntryCard', 'production house finance');
assertIncludes(productionHouse, 'StudioSaleRoom', 'production house finance');
assertIncludes(gameLoop, 'processStudioSaleRoyalties', 'game loop royalty collection');

if (productionHouse.includes('sellBusiness(') || productionHouse.includes("setShowExitModal('SELL')")) {
  throw new Error('Production finance should not use the old instant sell path.');
}

assertIncludes(packageJson, '"audit:studio-sale-deck"', 'package scripts');

console.log('studio sale deck audit passed');
