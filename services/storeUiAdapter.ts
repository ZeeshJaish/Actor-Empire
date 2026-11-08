import type { GameLanguage, Player } from '../types';
import type { IconName } from '../components/ui-overhaul/ui';
import {
  getPremiumCollectionSizes,
  getLocalizedPremiumProducts,
  hasPremiumProduct,
  type PremiumProduct,
  type PremiumProductId,
} from './premiumLogic';

export type StoreUiGroupId = PremiumProduct['category'];

export interface StoreUiProduct {
  id: PremiumProductId;
  name: string;
  note: string;
  price: string;
  amount?: number;
  kind: PremiumProduct['kind'];
  icon: IconName;
  color: string;
  owned: boolean;
  bestValue: boolean;
  /** false on a device whose store has not given this item's price: it is shown, never sold at a guessed price */
  available: boolean;
  /** what a collection unlocks, counted from the game's own catalogue */
  unlocks?: number;
}

export interface StoreUiGroup {
  id: StoreUiGroupId;
  label: string;
  icon: IconName;
  color: string;
  items: StoreUiProduct[];
}

export interface StoreUiModel {
  bonusBank: number;
  readyEnergy: number;
  groups: StoreUiGroup[];
}

const GROUPS: Array<Omit<StoreUiGroup, 'items'>> = [
  { id: 'ad_free', label: 'Ad-Free', icon: 'shield', color: 'var(--acting)' },
  { id: 'energy', label: 'Energy Boosts', icon: 'bolt', color: 'var(--gold-hi)' },
  { id: 'cash', label: 'Cash Boosts', icon: 'dollar', color: 'var(--money)' },
  { id: 'collection', label: 'Collections', icon: 'crown', color: 'var(--gold-hi)' },
];

const iconFor = (productId: PremiumProductId): IconName => {
  if (productId === 'no_ads') return 'shield';
  if (productId.includes('energy')) return 'bolt';
  if (productId.includes('cash')) return 'dollar';
  if (productId.includes('home')) return 'home';
  if (productId.includes('vehicle')) return 'car';
  if (productId.includes('sky')) return 'plane';
  return 'gem';
};

const colorFor = (productId: PremiumProductId) => {
  if (productId === 'no_ads') return 'var(--acting)';
  if (productId.includes('energy')) return 'var(--gold-hi)';
  if (productId.includes('cash')) return 'var(--money)';
  if (productId.includes('home') || productId.includes('vehicle')) return 'var(--looks)';
  return 'var(--gold-hi)';
};

const numericPrice = (price: string) => {
  const normalized = price.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  return Number.parseFloat(normalized) || 0;
};

export interface StoreUiPriceOptions {
  /** the store's prices as numbers (same currency), for a truthful Best value */
  amounts?: Partial<Record<PremiumProductId, number>>;
  /** on a device only the store's own prices are shown; without one an item cannot be bought */
  requireStorePrices?: boolean;
}

export const buildStoreUiModel = (
  player: Player,
  language: GameLanguage = 'en',
  prices: Partial<Record<PremiumProductId, string>> = {},
  options: StoreUiPriceOptions = {},
): StoreUiModel => {
  const products = getLocalizedPremiumProducts(language);
  const amountOf = (id: PremiumProductId, fallback: string) => options.amounts?.[id] ?? numericPrice(prices[id] || fallback);
  const unlockCounts = getPremiumCollectionSizes();

  return {
    bonusBank: Math.max(0, Number(player.flags?.bonusEnergyBank) || 0),
    readyEnergy: Math.max(0, Number(player.energy.current) || 0),
    groups: GROUPS.map(group => {
      const sourceItems = products.filter(product => product.category === group.id);
      const sellable = (product: typeof sourceItems[number]) => !options.requireStorePrices || Boolean(prices[product.id]);
      const rated = sourceItems.filter(product => typeof product.amount === 'number' && sellable(product) && amountOf(product.id, product.priceLabel) > 0);
      const bestId = rated.length > 1
        ? rated.reduce((best, product) => (
          (product.amount || 0) / amountOf(product.id, product.priceLabel)
            > (best.amount || 0) / amountOf(best.id, best.priceLabel)
            ? product
            : best
        )).id
        : null;

      return {
        ...group,
        items: sourceItems.map(product => ({
          id: product.id,
          name: product.title,
          note: product.description,
          price: prices[product.id] || (options.requireStorePrices ? '—' : product.priceLabel),
          amount: product.amount,
          kind: product.kind,
          icon: iconFor(product.id),
          color: colorFor(product.id),
          owned: product.kind === 'non_consumable' && hasPremiumProduct(player, product.id),
          bestValue: product.id === bestId,
          available: sellable(product),
          ...(unlockCounts[product.id] ? { unlocks: unlockCounts[product.id] } : {}),
        })),
      };
    }),
  };
};
