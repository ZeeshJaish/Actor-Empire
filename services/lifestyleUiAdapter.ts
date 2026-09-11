import type { Player } from '../types';
import type { IconName } from '../components/ui-overhaul/ui';
import { getPlayerBusinessEquityValue } from './studioGroupValuation';
import { evaluateStreamingEligibility } from './streamingEligibility';
import {
  AIRCRAFT_CATALOG,
  BOAT_CATALOG,
  CAR_CATALOG,
  CLOTHING_CATALOG,
  MOTORCYCLE_CATALOG,
  PROPERTY_CATALOG,
} from './lifestyleLogic';

export type LifestyleUiDestinationId = 'studio' | 'business' | 'streaming' | 'cinema' | 'assets' | 'activities';

export interface LifestyleUiDestination {
  id: LifestyleUiDestinationId;
  name: string;
  note: string;
  icon: IconName;
  color: string;
  kind: 'venture' | 'spending';
  active?: boolean;
  progress?: number;
  locked?: string;
}

export interface LifestyleUiModel {
  title: string;
  holder: string;
  validThru: string;
  liquidCash: number;
  assets: number;
  equity: number;
  destinations: LifestyleUiDestination[];
}

const LIFESTYLE_ASSET_CATALOG = [
  ...PROPERTY_CATALOG,
  ...CAR_CATALOG,
  ...MOTORCYCLE_CATALOG,
  ...BOAT_CATALOG,
  ...AIRCRAFT_CATALOG,
  ...CLOTHING_CATALOG,
];

const getOwnedAssetValue = (player: Player) => player.assets.reduce((total, assetId) => {
  const item = player.customItems.find(candidate => candidate.id === assetId)
    || LIFESTYLE_ASSET_CATALOG.find(candidate => candidate.id === assetId);
  if (!item) return total;
  const currentValue = item.type === 'Property'
    ? Number(player.assetStates?.find(state => state.assetId === assetId)?.currentValue || item.price)
    : item.price;
  return total + Math.max(0, currentValue);
}, 0);

export const buildLifestyleUiModel = (player: Player): LifestyleUiModel => {
  const productionStudio = player.businesses.find(business => business.type === 'PRODUCTION_HOUSE');
  const streamingEligibility = evaluateStreamingEligibility(player);
  const streamingActive = player.ownedStreamingPlatform.lifecycle !== 'LOCKED';
  return {
    title: 'Lifestyle',
    holder: player.name,
    validThru: 'LIFETIME',
    liquidCash: player.money,
    assets: getOwnedAssetValue(player),
    equity: getPlayerBusinessEquityValue(player),
    destinations: [
      {
        id: 'studio',
        name: productionStudio?.name || 'Production House',
        note: productionStudio ? 'Manage your studio slate.' : 'Build a studio and create blockbusters.',
        icon: 'clapper',
        color: 'var(--gold-hi)',
        kind: 'venture',
        active: Boolean(productionStudio),
      },
      { id: 'business', name: 'Business Empire', note: 'Manage your companies.', icon: 'briefcase', color: 'var(--mood)', kind: 'venture' },
      {
        id: 'streaming',
        name: 'Streaming Platform',
        note: streamingActive ? 'Operate your owned platform.' : 'Build eligibility and launch your platform.',
        icon: 'tv',
        color: 'var(--looks)',
        kind: 'venture',
        active: streamingActive,
        progress: streamingActive ? 100 : Math.round(streamingEligibility.readiness * 100),
      },
      { id: 'cinema', name: 'Cinema Chain', note: 'Build theaters, sell tickets, and own the box office.', icon: 'ticket', color: 'var(--directing)', kind: 'venture', locked: 'PREVIEW' },
      { id: 'assets', name: 'Assets', note: 'Properties, vehicles and wardrobe.', icon: 'building', color: 'var(--acting)', kind: 'spending' },
      { id: 'activities', name: 'Activities', note: 'Trips, nightlife, wellness, family, and legacy memories.', icon: 'calendar', color: 'var(--writing)', kind: 'spending' },
    ],
  };
};
