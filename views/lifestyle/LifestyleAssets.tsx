import React, { useEffect, useMemo, useState } from 'react';
import { Player, Property, Vehicle, ClothingItem } from '../../types';
import { PROPERTY_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from '../../services/lifestyleLogic';
import {
    ArrowLeft,
    Car,
    ChevronRight,
    Crown,
    Home,
    KeyRound,
    Lock,
    MapPin,
    Palette,
    Shirt,
    Share2,
    ShoppingBag,
    Store,
    Wrench,
    Check,
    X,
} from 'lucide-react';
import { getPremiumCollectionGateForAsset, getPremiumProduct, hasPremiumAccessForAsset, PremiumProductId } from '../../services/premiumLogic';
import { getPlayerLanguage, t } from '../../services/i18n';
import { getRealEstateInvestorIdentity, getRealEstateMarketSnapshot, quoteRealEstateWeeklyRent } from '../../services/realEstateLogic';
import { getLifestyleAssetImageInfo } from '../../services/lifestyleAssetImages';
import { AssetShareModal } from './components/AssetShareModal';

type AssetCategory = 'PROPERTY' | 'VEHICLE' | 'CLOTHING';
type AssetMode = 'HUB' | 'DETAILS' | 'MARKET' | 'ASSET_DETAIL';
type OwnedAsset = Property | Vehicle | ClothingItem;

interface LifestyleAssetsProps {
    player: Player;
    onBack: () => void;
    onBuy: (item: Property | Vehicle | ClothingItem) => void;
    onSell: (id: string) => void;
    onSetResidence: (id: string) => void;
    onInitiateCustomization: (item: Property | Vehicle) => void;
    onPremiumPurchase: (productId: PremiumProductId) => void;
    onUpdatePlayer?: (player: Player) => void;
}

const vehicleCatalog = [...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG];
const marketCatalog = [...PROPERTY_CATALOG, ...vehicleCatalog, ...CLOTHING_CATALOG];

const LifestyleAssetImageTile: React.FC<{ item: OwnedAsset; className?: string; imageClassName?: string }> = ({
    item,
    className = 'h-14 w-14 rounded-2xl',
    imageClassName = '',
}) => {
    const imageInfo = getLifestyleAssetImageInfo(item);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [item.id]);

    return (
        <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-black ${className}`}>
            <img
                src={failed ? imageInfo.fallbackSrc : imageInfo.src}
                alt={imageInfo.alt}
                onError={() => setFailed(true)}
                className={`h-full w-full object-cover [image-rendering:pixelated] ${imageClassName}`}
                draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />
        </div>
    );
};

export const LifestyleAssets: React.FC<LifestyleAssetsProps> = ({
    player,
    onBack,
    onBuy,
    onSell,
    onSetResidence,
    onInitiateCustomization,
    onPremiumPurchase,
    onUpdatePlayer,
}) => {
    const [mode, setMode] = useState<AssetMode>('HUB');
    const [category, setCategory] = useState<AssetCategory>('PROPERTY');
    const [filter, setFilter] = useState<string>('ALL');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [pendingPremiumAssetId, setPendingPremiumAssetId] = useState<string | null>(null);
    const [sharePickerOpen, setSharePickerOpen] = useState(false);
    const [portfolioShareOpen, setPortfolioShareOpen] = useState(false);
    const [selectedShareAssetIds, setSelectedShareAssetIds] = useState<string[]>([]);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const trFallback = (key: string, fallback: string) => {
        const translated = tr(key);
        return translated === key ? fallback : translated;
    };

    const pendingPremiumGate = useMemo(() => pendingPremiumAssetId ? getPremiumCollectionGateForAsset(pendingPremiumAssetId, language) : null, [pendingPremiumAssetId, language]);
    const pendingPremiumProduct = pendingPremiumGate ? getPremiumProduct(pendingPremiumGate.productId, language) : null;

    const getAssetById = (id: string): OwnedAsset | undefined => (
        player.customItems.find(item => item.id === id) || marketCatalog.find(item => item.id === id)
    );

    const ownedItems = useMemo(() => (
        player.assets
            .map(id => getAssetById(id))
            .filter(Boolean) as OwnedAsset[]
    ), [player.assets, player.customItems]);

    const categoryItems = (isMarket: boolean) => {
        let items: OwnedAsset[] = [];
        if (category === 'PROPERTY') items = isMarket ? PROPERTY_CATALOG : ownedItems.filter(item => item.type === 'Property');
        if (category === 'VEHICLE') {
            items = isMarket ? vehicleCatalog : ownedItems.filter(item => item.type === 'Vehicle');
            if (filter !== 'ALL') items = items.filter(item => item.type === 'Vehicle' && item.vehicleType === filter);
        }
        if (category === 'CLOTHING') {
            items = isMarket ? CLOTHING_CATALOG : ownedItems.filter(item => item.type === 'Clothing');
            if (filter !== 'ALL') {
                if (['EYEWEAR', 'WATCH', 'BAG', 'JEWELRY'].includes(filter)) {
                    items = items.filter(item => item.type === 'Clothing' && item.category === 'ACCESSORY' && item.subCategory === filter);
                } else {
                    items = items.filter(item => item.type === 'Clothing' && item.category === filter);
                }
            }
        }
        return isMarket ? items.filter(item => !player.assets.includes(item.id)) : items;
    };

    const getAssetState = (assetId: string) => (
        (player.assetStates || []).find(state => state.assetId === assetId) || {
            assetId,
            condition: 100,
            rentalListed: false,
            weeklyRent: 0,
            lifetimeRevenue: 0,
            listedWeek: 0,
            lastMaintainedWeek: 0,
        }
    );

    const moneyShort = (value: number) => {
        const abs = Math.abs(value);
        const formatUnit = (divisor: number, suffix: string) => {
            const scaled = value / divisor;
            const decimals = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
            return `$${scaled.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${suffix}`;
        };
        if (abs >= 1_000_000_000_000) return formatUnit(1_000_000_000_000, 'T');
        if (abs >= 1_000_000_000) return formatUnit(1_000_000_000, 'B');
        if (abs >= 1_000_000) return formatUnit(1_000_000, 'M');
        if (abs >= 1_000) return formatUnit(1_000, 'K');
        return `$${Math.round(value).toLocaleString()}`;
    };

    const getAssetDisplayName = (item: OwnedAsset) => trFallback(`lifestyle.asset.${item.id}.name`, item.name);
    const getAssetTypeLabel = (item: OwnedAsset) => trFallback(`lifestyle.assetType.${item.type}`, item.type);
    const getVehicleTypeLabel = (item: Vehicle) => trFallback(`lifestyle.filter.${item.vehicleType}`, item.vehicleType);
    const getClothingCategoryLabel = (item: ClothingItem) => trFallback(`lifestyle.filter.${item.subCategory || item.category}`, item.subCategory || item.category);
    const getClothingStyleLabel = (style: ClothingItem['style']) => trFallback(`lifestyle.clothingStyle.${style}`, style);

    const canAssetBeRented = (item: OwnedAsset) => item.type === 'Property' && player.residenceId !== item.id;

    const quoteWeeklyRent = (item: OwnedAsset) => {
        if (item.type !== 'Property') return 0;
        const state = getAssetState(item.id);
        return quoteRealEstateWeeklyRent(item, state, player);
    };

    const getAssetValue = (item: OwnedAsset) => {
        const state = getAssetState(item.id);
        if (item.type !== 'Property') return item.price;
        return Math.max(item.price, Math.round(Number(state.currentValue || item.price)));
    };

    const maintainCost = (item: OwnedAsset) => {
        if (item.type === 'Clothing') return 0;
        const condition = getAssetState(item.id).condition ?? 100;
        if (condition >= 96) return 0;
        const wear = (100 - condition) / 100;
        return Math.max(250, Math.round(item.price * 0.01 * wear));
    };

    const updateAssetState = (assetId: string, updater: (state: ReturnType<typeof getAssetState>) => ReturnType<typeof getAssetState>) => {
        if (!onUpdatePlayer) return;
        const existing = getAssetState(assetId);
        const nextState = updater(existing);
        const nextStates = [
            ...(player.assetStates || []).filter(state => state.assetId !== assetId),
            nextState,
        ];
        onUpdatePlayer({ ...player, assetStates: nextStates });
    };

    const maintainAsset = (item: OwnedAsset) => {
        if (item.type === 'Clothing') return;
        const cost = maintainCost(item);
        if (cost <= 0 || player.money < cost || !onUpdatePlayer) return;
        const nextStates = [
            ...(player.assetStates || []).filter(state => state.assetId !== item.id),
            {
                ...getAssetState(item.id),
                condition: 100,
                lastMaintainedWeek: player.currentWeek,
            },
        ];
        onUpdatePlayer({ ...player, money: player.money - cost, assetStates: nextStates });
    };

    const setResidence = (item: OwnedAsset) => {
        if (item.type !== 'Property') return;
        if (!onUpdatePlayer) {
            onSetResidence(item.id);
            return;
        }
        const nextStates = [
            ...(player.assetStates || []).filter(state => state.assetId !== item.id),
            {
                ...getAssetState(item.id),
                rentalListed: false,
                weeklyRent: 0,
            },
        ];
        onUpdatePlayer({ ...player, residenceId: item.id, assetStates: nextStates });
    };

    const openOwnedAsset = (item: OwnedAsset) => {
        setSelectedAssetId(item.id);
        setMode('ASSET_DETAIL');
    };

    const backFromCurrent = () => {
        if (mode === 'ASSET_DETAIL') {
            setMode('DETAILS');
            setSelectedAssetId(null);
        } else if (mode === 'MARKET') {
            setMode('DETAILS');
        } else if (mode === 'DETAILS') {
            setMode('HUB');
        } else {
            onBack();
        }
    };

    const ownershipValue = ownedItems.reduce((sum, item) => sum + getAssetValue(item), 0);
    const rentableAssetIds = new Set(ownedItems.filter(item => canAssetBeRented(item)).map(item => item.id));
    const weeklyRental = (player.assetStates || []).reduce((sum, state) => sum + (state.rentalListed && rentableAssetIds.has(state.assetId) ? (state.weeklyRent || 0) : 0), 0);
    const rentedCount = (player.assetStates || []).filter(state => state.rentalListed && rentableAssetIds.has(state.assetId)).length;
    const ownedProperties = ownedItems.filter((item): item is Property => item.type === 'Property');
    const ownedVehicles = ownedItems.filter((item): item is Vehicle => item.type === 'Vehicle');
    const ownedClothing = ownedItems.filter((item): item is ClothingItem => item.type === 'Clothing');
    const propertyPortfolioValue = ownedProperties.reduce((sum, property) => sum + getAssetValue(property), 0);
    const vehiclePortfolioValue = ownedVehicles.reduce((sum, vehicle) => sum + getAssetValue(vehicle), 0);
    const clothingPortfolioValue = ownedClothing.reduce((sum, clothing) => sum + getAssetValue(clothing), 0);
    const realEstateIdentity = getRealEstateInvestorIdentity(ownedProperties, propertyPortfolioValue);
    const averageRentDemand = ownedProperties.length
        ? Math.round(ownedProperties.reduce((sum, property) => sum + getRealEstateMarketSnapshot(property, getAssetState(property.id), player).rentDemand, 0) / ownedProperties.length)
        : 0;
    const vehicleTypeCount = ownedVehicles.reduce<Record<Vehicle['vehicleType'], number>>((counts, vehicle) => {
        counts[vehicle.vehicleType] += 1;
        return counts;
    }, { Car: 0, Motorcycle: 0, Boat: 0, Aircraft: 0 });
    const vehicleTypeValue = ownedVehicles.reduce<Record<Vehicle['vehicleType'], number>>((values, vehicle) => {
        values[vehicle.vehicleType] += getAssetValue(vehicle);
        return values;
    }, { Car: 0, Motorcycle: 0, Boat: 0, Aircraft: 0 });
    const assetIdentity = (() => {
        const propertyCount = ownedProperties.length;
        const vehicleCount = ownedVehicles.length;
        const clothingCount = ownedClothing.length;
        const carCount = vehicleTypeCount.Car;
        const motorcycleCount = vehicleTypeCount.Motorcycle;
        const boatCount = vehicleTypeCount.Boat;
        const aircraftCount = vehicleTypeCount.Aircraft;
        const carAverageValue = carCount ? vehicleTypeValue.Car / carCount : 0;
        const mixedPortfolio = [propertyCount > 0, vehicleCount > 0, clothingCount > 0].filter(Boolean).length >= 2;

        if (!ownedItems.length) {
            return {
                eyebrow: trFallback('lifestyle.identity.ownership', 'Ownership Identity'),
                title: trFallback('lifestyle.identity.newCollector', 'New Collector'),
                badge: trFallback('lifestyle.identity.start', 'Start'),
                primaryTitle: trFallback('lifestyle.identity.tile.firstMove', 'First Move'),
                primarySub: trFallback('lifestyle.identity.tile.firstMoveSub', 'Buy assets to unlock lifestyle uses.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.share', 'Share'),
                secondarySub: trFallback('lifestyle.identity.tile.shareSub', 'Build a portfolio worth posting.'),
            };
        }

        if (aircraftCount > 0) {
            return {
                eyebrow: trFallback('lifestyle.identity.aviation', 'Aviation Identity'),
                title: aircraftCount >= 2
                    ? trFallback('lifestyle.identity.aircraftCollector', 'Aircraft Collector')
                    : trFallback('lifestyle.identity.privateAviation', 'Private Aviation Owner'),
                badge: `${trFallback('lifestyle.identity.aircraftBadge', 'Aircraft')} ${aircraftCount}`,
                primaryTitle: trFallback('lifestyle.identity.tile.travel', 'Travel'),
                primarySub: trFallback('lifestyle.identity.tile.travelAircraftSub', 'Private trips and elite arrivals.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.image', 'Image'),
                secondarySub: trFallback('lifestyle.identity.tile.aircraftImageSub', 'High-status lifestyle signal.'),
            };
        }

        if (boatCount > 0 && (boatCount >= 2 || vehicleTypeValue.Boat >= Math.max(vehicleTypeValue.Car, propertyPortfolioValue * 0.25))) {
            return {
                eyebrow: trFallback('lifestyle.identity.marina', 'Marina Identity'),
                title: boatCount >= 2
                    ? trFallback('lifestyle.identity.yachtCollector', 'Yacht Collector')
                    : trFallback('lifestyle.identity.boatOwner', 'Boat Owner'),
                badge: `${trFallback('lifestyle.identity.fleetBadge', 'Fleet')} ${boatCount}`,
                primaryTitle: trFallback('lifestyle.identity.tile.events', 'Events'),
                primarySub: trFallback('lifestyle.identity.tile.boatEventsSub', 'Luxury weekends and water-side hosting.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.content', 'Content'),
                secondarySub: trFallback('lifestyle.identity.tile.boatContentSub', 'Lifestyle shoots with a rich backdrop.'),
            };
        }

        if (carCount >= 2 && (carCount >= propertyCount || vehicleTypeValue.Car >= propertyPortfolioValue * 0.35)) {
            return {
                eyebrow: trFallback('lifestyle.identity.garage', 'Garage Identity'),
                title: carCount >= 4 || carAverageValue >= 250_000
                    ? trFallback('lifestyle.identity.carCollector', 'Car Collector')
                    : trFallback('lifestyle.identity.carHead', 'Car Head'),
                badge: `${trFallback('lifestyle.identity.garageBadge', 'Garage')} ${vehicleCount}`,
                primaryTitle: trFallback('lifestyle.identity.tile.arrivals', 'Arrivals'),
                primarySub: trFallback('lifestyle.identity.tile.vehicleArrivalsSub', 'Red carpets, clubs, premieres.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.content', 'Content'),
                secondarySub: trFallback('lifestyle.identity.tile.vehicleContentSub', 'Featured vehicle flex.'),
            };
        }

        if (motorcycleCount >= 2 && motorcycleCount >= carCount) {
            return {
                eyebrow: trFallback('lifestyle.identity.rider', 'Rider Identity'),
                title: trFallback('lifestyle.identity.bikeCollector', 'Bike Collector'),
                badge: `${trFallback('lifestyle.identity.bikesBadge', 'Bikes')} ${motorcycleCount}`,
                primaryTitle: trFallback('lifestyle.identity.tile.arrivals', 'Arrivals'),
                primarySub: trFallback('lifestyle.identity.tile.bikeArrivalsSub', 'Sharper entrances and street energy.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.content', 'Content'),
                secondarySub: trFallback('lifestyle.identity.tile.vehicleContentSub', 'Featured vehicle flex.'),
            };
        }

        if (vehicleCount > propertyCount && vehicleCount >= clothingCount) {
            return {
                eyebrow: trFallback('lifestyle.identity.garage', 'Garage Identity'),
                title: trFallback('lifestyle.identity.garageBuilder', 'Garage Builder'),
                badge: `${trFallback('lifestyle.identity.garageBadge', 'Garage')} ${vehicleCount}`,
                primaryTitle: trFallback('lifestyle.identity.tile.arrivals', 'Arrivals'),
                primarySub: trFallback('lifestyle.identity.tile.vehicleArrivalsSub', 'Red carpets, clubs, premieres.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.content', 'Content'),
                secondarySub: trFallback('lifestyle.identity.tile.vehicleContentSub', 'Featured vehicle flex.'),
            };
        }

        if (clothingCount >= 3 && (clothingCount >= propertyCount || clothingPortfolioValue >= vehiclePortfolioValue * 0.45)) {
            return {
                eyebrow: trFallback('lifestyle.identity.fashion', 'Fashion Identity'),
                title: clothingCount >= 6
                    ? trFallback('lifestyle.identity.styleCollector', 'Style Collector')
                    : trFallback('lifestyle.identity.styleBuilder', 'Style Builder'),
                badge: `${trFallback('lifestyle.identity.looksBadge', 'Looks')} ${clothingCount}`,
                primaryTitle: trFallback('lifestyle.identity.tile.events', 'Events'),
                primarySub: trFallback('lifestyle.identity.tile.fashionEventsSub', 'Red carpets and press days.'),
                secondaryTitle: trFallback('lifestyle.identity.tile.image', 'Image'),
                secondarySub: trFallback('lifestyle.identity.tile.fashionImageSub', 'Style, taste, public polish.'),
            };
        }

        if (propertyCount > 0 && (!mixedPortfolio || propertyCount >= Math.max(vehicleCount, clothingCount))) {
            return {
                eyebrow: trFallback('lifestyle.identity.realEstate', 'Real Estate Identity'),
                title: realEstateIdentity,
                badge: '',
                primaryTitle: trFallback('lifestyle.activitiesHook', 'Activities'),
                primarySub: trFallback('lifestyle.activitiesHookShort', 'Parties, trips, family time.'),
                secondaryTitle: trFallback('lifestyle.contentHook', 'Content'),
                secondarySub: trFallback('lifestyle.contentHookShort', 'Shoot locations and props.'),
            };
        }

        return {
            eyebrow: trFallback('lifestyle.identity.mixed', 'Lifestyle Identity'),
            title: ownershipValue >= 25_000_000 || ownedItems.length >= 8
                ? trFallback('lifestyle.identity.assetMogul', 'Asset Mogul')
                : trFallback('lifestyle.identity.lifestyleCollector', 'Lifestyle Collector'),
            badge: `${trFallback('lifestyle.identity.assetsBadge', 'Assets')} ${ownedItems.length}`,
            primaryTitle: trFallback('lifestyle.identity.tile.lifestyle', 'Lifestyle'),
            primarySub: trFallback('lifestyle.identity.tile.lifestyleSub', 'Events, trips, content scenes.'),
            secondaryTitle: trFallback('lifestyle.identity.tile.flex', 'Flex'),
            secondarySub: trFallback('lifestyle.identity.tile.flexSub', 'Portfolio moments and share posts.'),
        };
    })();
    const selectedAsset = selectedAssetId ? getAssetById(selectedAssetId) : null;
    const shareCandidateItems = useMemo(
        () => [...ownedItems].sort((a, b) => getAssetValue(b) - getAssetValue(a)),
        [ownedItems, player.assetStates],
    );
    const selectedShareAssets = selectedShareAssetIds
        .map(id => getAssetById(id))
        .filter(Boolean) as OwnedAsset[];

    const openPortfolioShare = () => {
        const defaults = shareCandidateItems.slice(0, Math.min(4, Math.max(1, shareCandidateItems.length))).map(item => item.id);
        setSelectedShareAssetIds(defaults);
        setSharePickerOpen(true);
    };

    const toggleShareAsset = (assetId: string) => {
        setSelectedShareAssetIds(prev => {
            if (prev.includes(assetId)) return prev.filter(id => id !== assetId);
            if (prev.length >= 8) return prev;
            return [...prev, assetId];
        });
    };

    const autoPickShareAssets = (count: number) => {
        setSelectedShareAssetIds(shareCandidateItems.slice(0, Math.min(count, shareCandidateItems.length)).map(item => item.id));
    };

    const categoryMeta = [
        { id: 'PROPERTY' as const, label: tr('lifestyle.realEstate'), sub: tr('lifestyle.properties'), icon: Home, tone: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
        { id: 'VEHICLE' as const, label: tr('lifestyle.vehicles'), sub: tr('lifestyle.garage'), icon: Car, tone: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
        { id: 'CLOTHING' as const, label: tr('lifestyle.wardrobe'), sub: tr('lifestyle.fashion'), icon: Shirt, tone: 'text-pink-300 bg-pink-500/10 border-pink-500/20' },
    ];

    const getCategoryPortfolioSnapshot = (targetCategory: AssetCategory) => {
        const items = targetCategory === 'PROPERTY' ? ownedProperties : targetCategory === 'VEHICLE' ? ownedVehicles : ownedClothing;
        const value = items.reduce((sum, item) => sum + getAssetValue(item), 0);
        const rent = targetCategory === 'PROPERTY'
            ? (player.assetStates || []).reduce((sum, state) => sum + (state.rentalListed && items.some(item => item.id === state.assetId) ? (state.weeklyRent || 0) : 0), 0)
            : 0;
        const activeCount = targetCategory === 'PROPERTY'
            ? items.filter(item => player.residenceId === item.id || getAssetState(item.id).rentalListed).length
            : items.length;
        const feature = [...items].sort((a, b) => getAssetValue(b) - getAssetValue(a))[0];
        const tone = targetCategory === 'PROPERTY'
            ? {
                eyebrow: trFallback('lifestyle.identity.realEstate', 'Real Estate Desk'),
                accent: 'text-emerald-200',
                ring: 'border-emerald-300/20',
                glow: 'from-emerald-500/20 via-cyan-500/10 to-black',
                action: 'Shop Homes',
            }
            : targetCategory === 'VEHICLE'
                ? {
                    eyebrow: trFallback('lifestyle.identity.garage', 'Garage Desk'),
                    accent: 'text-amber-200',
                    ring: 'border-amber-300/20',
                    glow: 'from-amber-500/20 via-rose-500/10 to-black',
                    action: 'Shop Rides',
                }
                : {
                    eyebrow: trFallback('lifestyle.identity.fashion', 'Wardrobe Desk'),
                    accent: 'text-pink-200',
                    ring: 'border-pink-300/20',
                    glow: 'from-pink-500/20 via-indigo-500/10 to-black',
                    action: 'Shop Looks',
                };

        return {
            items,
            value,
            rent,
            activeCount,
            feature,
            tone,
        };
    };

    const renderCategoryCommandHeader = () => {
        const snapshot = getCategoryPortfolioSnapshot(category);
        const meta = categoryMeta.find(candidate => candidate.id === category) || categoryMeta[0];
        const Icon = meta.icon;
        const feature = snapshot.feature;
        const featureState = feature ? getAssetState(feature.id) : null;
        const featureStatus = feature
            ? feature.type === 'Property' && player.residenceId === feature.id
                ? tr('lifestyle.activeResidence')
                : feature.type === 'Property' && featureState?.rentalListed
                    ? tr('lifestyle.rentedOut')
                    : tr('lifestyle.available')
            : tr('lifestyle.noItems');

        return (
            <div className={`portfolio-rail overflow-hidden rounded-[2rem] border ${snapshot.tone.ring} bg-gradient-to-br ${snapshot.tone.glow}`}>
                <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className={`text-[10px] font-black uppercase tracking-[0.28em] ${snapshot.tone.accent}`}>{snapshot.tone.eyebrow}</div>
                            <h1 className="mt-2 text-4xl font-black leading-[0.92] text-white">{meta.label}</h1>
                            <div className="mt-2 text-sm font-bold text-zinc-400">{snapshot.items.length} {tr('lifestyle.owned')} • {moneyShort(snapshot.value)}</div>
                        </div>
                        <button onClick={() => setMode('MARKET')} className="asset-file-action-pill inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-black shadow-xl shadow-black/30">
                            <ShoppingBag size={16} /> {tr('lifestyle.shop')}
                        </button>
                    </div>

                    <div className="asset-file-stat-grid mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-black/55 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.owned')}</div>
                            <div className="mt-1 text-2xl font-black text-white">{snapshot.items.length}</div>
                        </div>
                        <div className="rounded-2xl bg-black/55 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.value')}</div>
                            <div className="mt-1 truncate text-xl font-black text-emerald-300">{moneyShort(snapshot.value)}</div>
                        </div>
                        <div className="rounded-2xl bg-black/55 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{category === 'PROPERTY' ? tr('lifestyle.rent') : trFallback('lifestyle.activeAssets', 'Active')}</div>
                            <div className="mt-1 truncate text-xl font-black text-cyan-300">{category === 'PROPERTY' ? moneyShort(snapshot.rent) : snapshot.activeCount}</div>
                        </div>
                    </div>
                </div>

                <div className="asset-file-hero border-t border-white/10 bg-black/35 p-4">
                    {feature ? (
                        <button onClick={() => openOwnedAsset(feature)} className="flex w-full items-center gap-4 text-left">
                            <LifestyleAssetImageTile item={feature} className="h-20 w-20 rounded-3xl shadow-2xl shadow-black/40" imageClassName={feature.type === 'Vehicle' ? 'object-[center_68%]' : ''} />
                            <div className="min-w-0 flex-1">
                                <div className="asset-file-status-strip flex flex-wrap gap-2">
                                    <span className="rounded-full bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200">{featureStatus}</span>
                                    <span className="rounded-full bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300">{moneyShort(getAssetValue(feature))}</span>
                                </div>
                                <div className="mt-2 truncate text-2xl font-black text-white">{getAssetDisplayName(feature)}</div>
                                <div className="mt-1 text-xs font-bold text-zinc-500">{feature.type === 'Property' ? feature.location : feature.type === 'Vehicle' ? getVehicleTypeLabel(feature) : getClothingCategoryLabel(feature)}</div>
                            </div>
                            <ChevronRight className="shrink-0 text-zinc-500" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border ${meta.tone}`}>
                                <Icon size={28} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">{tr('lifestyle.noItems')}</div>
                                <div className="mt-1 text-sm font-bold text-zinc-500">{tr('lifestyle.assetSystemNote')}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFilters = () => (
        <>
            {category === 'CLOTHING' && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['ALL', 'OUTFIT', 'TOP', 'BOTTOM', 'SHOES', 'EYEWEAR', 'WATCH', 'BAG', 'JEWELRY'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${filter === f ? 'bg-indigo-500 text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>{trFallback(`lifestyle.filter.${f}`, f)}</button>
                    ))}
                </div>
            )}
            {category === 'VEHICLE' && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['ALL', 'Car', 'Motorcycle', 'Boat', 'Aircraft'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${filter === f ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>{trFallback(`lifestyle.filter.${f}`, f)}</button>
                    ))}
                </div>
            )}
        </>
    );

    const renderOwnedCard = (item: OwnedAsset) => {
        const state = getAssetState(item.id);
        const assetValue = getAssetValue(item);
        const isResidence = item.type === 'Property' && player.residenceId === item.id;
        const isRentListed = state.rentalListed && canAssetBeRented(item);
        const realEstateSnapshot = item.type === 'Property' ? getRealEstateMarketSnapshot(item, state, player) : null;
        const status = isResidence ? tr('lifestyle.activeResidence') : isRentListed ? tr('lifestyle.rentedOut') : tr('lifestyle.available');
        const condition = Math.round(state.condition ?? 100);
        const rentQuote = item.type === 'Property' ? quoteWeeklyRent(item) : 0;
        const cardMeta = item.type === 'Property'
            ? {
                eyebrow: item.location || tr('lifestyle.realEstate'),
                accent: 'text-emerald-200',
                chip: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
                statOneLabel: tr('lifestyle.marketValue'),
                statOneValue: moneyShort(assetValue),
                statTwoLabel: trFallback('lifestyle.demand', 'Demand'),
                statTwoValue: realEstateSnapshot ? `${realEstateSnapshot.rentDemand}/100` : '--',
                statThreeLabel: tr('lifestyle.rentQuote'),
                statThreeValue: `${moneyShort(rentQuote)}/w`,
            }
            : item.type === 'Vehicle'
                ? {
                    eyebrow: getVehicleTypeLabel(item),
                    accent: 'text-amber-200',
                    chip: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
                    statOneLabel: tr('lifestyle.value'),
                    statOneValue: moneyShort(assetValue),
                    statTwoLabel: tr('lifestyle.condition'),
                    statTwoValue: `${condition}%`,
                    statThreeLabel: tr('lifestyle.rep'),
                    statThreeValue: `+${item.reputationBonus}`,
                }
                : {
                    eyebrow: getClothingCategoryLabel(item),
                    accent: 'text-pink-200',
                    chip: 'border-pink-300/25 bg-pink-300/10 text-pink-100',
                    statOneLabel: tr('lifestyle.value'),
                    statOneValue: moneyShort(assetValue),
                    statTwoLabel: trFallback('lifestyle.style', 'Style'),
                    statTwoValue: getClothingStyleLabel(item.style),
                    statThreeLabel: tr('lifestyle.audition'),
                    statThreeValue: `+${item.auditionBonus}`,
                };

        return (
            <button key={item.id} onClick={() => openOwnedAsset(item)} className="asset-file-card group w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#09090b] text-left shadow-2xl shadow-black/20 transition-all hover:border-white/20">
                <div className="relative p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.055),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_55%)]" />
                    <div className="relative flex items-start gap-4">
                        <LifestyleAssetImageTile item={item} className="h-24 w-24 rounded-[1.6rem] shadow-2xl shadow-black/40" imageClassName={item.type === 'Vehicle' ? 'object-[center_68%]' : ''} />
                        <div className="min-w-0 flex-1 pt-1">
                            <div className="asset-file-status-strip flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${cardMeta.chip}`}>{status}</span>
                                <span className="rounded-full bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300">{cardMeta.eyebrow}</span>
                            </div>
                            <div className="mt-3 line-clamp-2 text-3xl font-black leading-[0.95] text-white">{getAssetDisplayName(item)}</div>
                            <div className={`mt-2 text-[10px] font-black uppercase tracking-[0.18em] ${cardMeta.accent}`}>
                                {item.type === 'Property' && realEstateSnapshot ? realEstateSnapshot.neighborhoodLabel : getAssetTypeLabel(item)}
                            </div>
                        </div>
                        <div className="mt-8 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/30 transition-transform group-hover:translate-x-1">
                            <ChevronRight size={22} />
                        </div>
                    </div>
                </div>

                <div className="asset-file-stat-grid grid grid-cols-3 gap-2 border-t border-white/10 bg-black/45 p-3">
                    {[
                        [cardMeta.statOneLabel, cardMeta.statOneValue],
                        [cardMeta.statTwoLabel, cardMeta.statTwoValue],
                        [cardMeta.statThreeLabel, cardMeta.statThreeValue],
                    ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-2xl bg-black/55 p-3">
                            <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
                            <div className="mt-1 truncate text-lg font-black text-white">{value}</div>
                        </div>
                    ))}
                </div>
            </button>
        );
    };

    const renderMarketCard = (item: OwnedAsset) => {
        const premiumGate = getPremiumCollectionGateForAsset(item.id);
        const hasPremiumAccess = hasPremiumAccessForAsset(player, item.id);
        const isLockedPremium = !!premiumGate && !hasPremiumAccess;
        const effectMeta = item.type === 'Clothing'
            ? getClothingStyleLabel(item.style)
            : item.type === 'Vehicle'
                ? `+${item.reputationBonus} ${tr('lifestyle.rep')}`
                : `+${item.moodBonus} ${tr('lifestyle.mood')}`;
        const actionLabel = isLockedPremium ? tr('lifestyle.unlockCollection') : item.type === 'Clothing' ? tr('lifestyle.buy') : tr('lifestyle.customize');
        const handleAction = () => {
            if (isLockedPremium) {
                setPendingPremiumAssetId(item.id);
                return;
            }
            item.type === 'Clothing' ? onBuy(item) : onInitiateCustomization(item);
        };

        const isVehicle = item.type === 'Vehicle';
        const isProperty = item.type === 'Property';
        const typeLabel = isVehicle
            ? getVehicleTypeLabel(item)
            : isProperty
                ? tr('lifestyle.market')
                : getClothingCategoryLabel(item);
        const secondaryMeta = isVehicle ? getAssetTypeLabel(item) : isProperty ? item.location : undefined;
        const cardHeight = item.type === 'Clothing' ? 'min-h-[270px]' : isVehicle ? 'min-h-[360px]' : 'min-h-[330px]';
        const titleSize = item.type === 'Clothing' ? 'text-2xl' : 'text-3xl';
        const imageFitClass = isVehicle ? 'object-cover object-[center_68%]' : 'object-cover';

        return (
            <div key={item.id} className={`relative ${cardHeight} overflow-hidden rounded-3xl border border-zinc-800 bg-black shadow-2xl shadow-black/25`}>
                <div className="absolute inset-0">
                    <LifestyleAssetImageTile
                        item={item}
                        className="h-full w-full rounded-none border-0"
                        imageClassName={imageFitClass}
                    />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/55 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                    {premiumGate ? (
                        <div className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider backdrop-blur ${hasPremiumAccess ? 'border-amber-500/30 bg-black/55 text-amber-200' : 'border-fuchsia-500/30 bg-black/55 text-fuchsia-200'}`}>
                            <Crown size={10} /> {tr('lifestyle.premium')}
                        </div>
                    ) : (
                        <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur">
                            {typeLabel}
                        </div>
                    )}
                    <div className="ml-auto rounded-2xl border border-emerald-300/20 bg-black/65 px-4 py-3 text-right backdrop-blur">
                        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100/70">{tr('lifestyle.total')}</div>
                        <div className="font-mono text-xl font-black leading-none text-emerald-300">{moneyShort(item.price)}</div>
                    </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                    <div className={`line-clamp-2 max-w-[92%] ${titleSize} font-black leading-[0.92] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]`}>
                        {getAssetDisplayName(item)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-100">
                        {secondaryMeta && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur">
                                {isProperty && <MapPin size={10} />} {secondaryMeta}
                            </span>
                        )}
                        <span className="rounded-full bg-emerald-300/20 px-2.5 py-1 text-emerald-100 backdrop-blur">{effectMeta}</span>
                    </div>
                    <button
                        onClick={handleAction}
                        disabled={!isLockedPremium && player.money < item.price}
                        className={`mt-3 inline-flex min-h-11 max-w-full items-center justify-center rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] shadow-xl disabled:opacity-50 ${isLockedPremium ? 'bg-fuchsia-500 text-white shadow-fuchsia-500/20' : 'bg-white text-black shadow-black/35'}`}
                    >
                        <span className="truncate">{actionLabel}</span>
                    </button>
                </div>
            </div>
        );
    };

    if (mode === 'HUB') {
        return (
            <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <button onClick={onBack} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-white"><ArrowLeft size={20}/></button>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">{tr('lifestyle.ownershipDesk')}</div>
                            <h2 className="truncate text-3xl font-black text-white">{tr('lifestyle.myAssets')}</h2>
                        </div>
                    </div>
                    <button
                        onClick={openPortfolioShare}
                        disabled={ownedItems.length === 0}
                        className="flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-40"
                    >
                        <Share2 size={15} /> Share
                    </button>
                </div>

                <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-950 to-black p-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="min-w-0 rounded-2xl bg-black/50 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{tr('lifestyle.owned')}</div>
                            <div className="mt-1 text-2xl font-black text-white">{ownedItems.length}</div>
                        </div>
                        <div className="min-w-0 rounded-2xl bg-black/50 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{tr('lifestyle.value')}</div>
                            <div className="mt-1 whitespace-nowrap font-mono text-xl font-black leading-none tracking-tight text-emerald-300">{moneyShort(ownershipValue)}</div>
                        </div>
                        <div className="min-w-0 rounded-2xl bg-black/50 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{tr('lifestyle.rent')}</div>
                            <div className="mt-1 whitespace-nowrap font-mono text-xl font-black leading-none tracking-tight text-cyan-300">{moneyShort(weeklyRental)}</div>
                        </div>
                    </div>
                    <div className="mt-3 rounded-2xl border border-emerald-500/15 bg-black/35 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200/70">{assetIdentity.eyebrow}</div>
                                <div className="mt-1 truncate text-sm font-black text-white">{assetIdentity.title}</div>
                            </div>
                            {assetIdentity.badge && (
                                <div className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-200">
                                    {assetIdentity.badge}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-zinc-800/80 bg-black/35 p-3">
                            <div className="text-xs font-black text-white">{assetIdentity.primaryTitle}</div>
                            <div className="mt-0.5 text-[11px] font-bold leading-snug text-zinc-500">{assetIdentity.primarySub}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-800/80 bg-black/35 p-3">
                            <div className="text-xs font-black text-white">{assetIdentity.secondaryTitle}</div>
                            <div className="mt-0.5 text-[11px] font-bold leading-snug text-zinc-500">{assetIdentity.secondarySub}</div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3">
                    {categoryMeta.map(meta => {
                        const Icon = meta.icon;
                        return (
                            <button key={meta.id} onClick={() => { setCategory(meta.id); setFilter('ALL'); setMode('DETAILS'); }} className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-white/20">
                                <div className="flex items-center gap-4">
                                    <div className={`rounded-2xl border p-3 ${meta.tone}`}><Icon size={22}/></div>
                                    <div className="text-left">
                                        <div className="text-lg font-black text-white">{meta.label}</div>
                                        <div className="text-xs font-bold text-zinc-500">{meta.sub}</div>
                                    </div>
                                </div>
                                <ChevronRight className="text-zinc-600"/>
                            </button>
                        );
                    })}
                </div>

                {sharePickerOpen && (
                    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="max-h-[88vh] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black animate-in slide-in-from-bottom duration-200">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Social Card</div>
                                    <div className="text-xl font-black text-white">Choose Assets</div>
                                </div>
                                <button onClick={() => setSharePickerOpen(false)} className="rounded-2xl border border-white/10 bg-black/35 p-2 text-zinc-300">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="max-h-[58vh] overflow-y-auto p-4">
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 3, 4, 8].map(count => (
                                        <button
                                            key={count}
                                            onClick={() => autoPickShareAssets(count)}
                                            className="rounded-2xl border border-zinc-800 bg-black px-2 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300"
                                        >
                                            Best {count}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {shareCandidateItems.map(item => {
                                        const isSelected = selectedShareAssetIds.includes(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => toggleShareAsset(item.id)}
                                                className={`relative min-h-[150px] overflow-hidden rounded-3xl border text-left transition-all ${isSelected ? 'border-emerald-300 bg-emerald-300/10' : 'border-zinc-800 bg-black'}`}
                                            >
                                                <LifestyleAssetImageTile item={item} className="absolute inset-0 h-full w-full rounded-none border-0" imageClassName={item.type === 'Vehicle' ? 'object-cover object-[center_68%]' : 'object-cover'} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
                                                <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                                                    <span className="rounded-full bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-200">{item.type}</span>
                                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${isSelected ? 'border-emerald-200 bg-emerald-300 text-black' : 'border-white/15 bg-black/45 text-transparent'}`}>
                                                        <Check size={15} />
                                                    </span>
                                                </div>
                                                <div className="absolute bottom-3 left-3 right-3">
                                                    <div className="line-clamp-2 text-base font-black leading-tight text-white">{getAssetDisplayName(item)}</div>
                                                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">{moneyShort(getAssetValue(item))}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="border-t border-white/10 bg-black/35 p-4">
                                <button
                                    onClick={() => { setSharePickerOpen(false); setPortfolioShareOpen(true); }}
                                    disabled={selectedShareAssetIds.length === 0}
                                    className="w-full rounded-2xl bg-emerald-300 py-4 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-40"
                                >
                                    Preview {selectedShareAssetIds.length || 0} Asset Post
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {portfolioShareOpen && (
                    <AssetShareModal
                        player={player}
                        assets={selectedShareAssets.length > 0 ? selectedShareAssets : shareCandidateItems.slice(0, 1)}
                        mode="portfolio"
                        onClose={() => setPortfolioShareOpen(false)}
                        onChangeAssets={() => { setPortfolioShareOpen(false); setSharePickerOpen(true); }}
                        resolveAssetValue={getAssetValue}
                        portfolioValue={selectedShareAssets.reduce((sum, item) => sum + getAssetValue(item), 0)}
                        weeklyRent={weeklyRental}
                    />
                )}
            </div>
        );
    }

    if (mode === 'ASSET_DETAIL' && selectedAsset) {
        const item = selectedAsset;
        const state = getAssetState(item.id);
        const condition = Math.round(state.condition ?? 100);
        const assetValue = getAssetValue(item);
        const trend = Number(state.valueTrend || 0);
        const rentQuote = quoteWeeklyRent(item);
        const repairCost = maintainCost(item);
        const canRent = canAssetBeRented(item);
        const isRentListed = state.rentalListed && canRent;
        const realEstateSnapshot = item.type === 'Property' ? getRealEstateMarketSnapshot(item, state, player) : null;
        const statusLabel = item.type === 'Property' && player.residenceId === item.id ? tr('lifestyle.activeResidence') : isRentListed ? tr('lifestyle.rentedOut') : tr('lifestyle.available');

        return (
            <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4">
                    <button onClick={backFromCurrent} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-white"><ArrowLeft size={20}/></button>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">{tr('lifestyle.assetFile')}</div>
                        <h2 className="truncate text-2xl font-black text-white">{getAssetDisplayName(item)}</h2>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                    <div className="bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-indigo-500/10 p-5">
                        <div className="flex items-start gap-4">
                            <LifestyleAssetImageTile item={item} className="h-20 w-20 rounded-3xl shadow-2xl shadow-black/40" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">{statusLabel}</span>
                                    {realEstateSnapshot && <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{realEstateSnapshot.neighborhoodLabel}</span>}
                                    {Array.isArray((item as any).customizations) && (item as any).customizations.length > 0 && <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{(item as any).customizations.length} {tr('lifestyle.upgrades')}</span>}
                                </div>
                                <h1 className="mt-3 text-4xl font-black leading-[0.95] text-white">{getAssetDisplayName(item)}</h1>
                                <div className="mt-1 text-sm font-bold text-zinc-400">
                                    {item.type === 'Property' ? `${item.location || tr('lifestyle.realEstate')} • +${item.moodBonus} ${tr('lifestyle.mood')}` : item.type === 'Vehicle' ? `${getVehicleTypeLabel(item)} • +${item.reputationBonus} ${tr('lifestyle.rep')}` : `${getClothingStyleLabel(item.style)} • +${item.auditionBonus} ${tr('lifestyle.audition')}`}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-4">
                        <div className="rounded-2xl bg-black/60 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{item.type === 'Property' ? tr('lifestyle.marketValue') : tr('lifestyle.value')}</div>
                            <div className="mt-1 truncate text-xl font-black text-white">{moneyShort(assetValue)}</div>
                        </div>
                        <div className="rounded-2xl bg-black/60 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.condition')}</div>
                            <div className="mt-1 text-xl font-black text-white">{item.type === 'Clothing' ? '--' : `${condition}%`}</div>
                        </div>
                        <div className="rounded-2xl bg-black/60 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.rentQuote')}</div>
                            <div className="mt-1 truncate text-xl font-black text-cyan-300">{item.type === 'Property' ? `${moneyShort(rentQuote)}/w` : '--'}</div>
                        </div>
                    </div>
                    {realEstateSnapshot && (
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
                                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{trFallback('lifestyle.marketCycle', 'Cycle')}</div>
                                    <div className="mt-1 truncate text-sm font-black text-white">{realEstateSnapshot.cycleLabel}</div>
                                </div>
                                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
                                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{trFallback('lifestyle.demand', 'Demand')}</div>
                                    <div className="mt-1 text-sm font-black text-emerald-300">{realEstateSnapshot.rentDemand}/100</div>
                                </div>
                                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
                                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{trFallback('lifestyle.vacancy', 'Vacancy')}</div>
                                    <div className="mt-1 text-sm font-black text-amber-200">{Math.round(realEstateSnapshot.vacancyChance * 100)}%</div>
                                </div>
                            </div>
                            <div className="mt-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs font-bold leading-relaxed text-zinc-400">
                                {realEstateSnapshot.marketNote}
                            </div>
                        </div>
                    )}
                    <div className="px-4 pb-4">
                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{tr('lifestyle.earned')}</div>
                                    <div className="mt-1 text-sm font-black text-white">{moneyShort(state.lifetimeRevenue || 0)}</div>
                                </div>
                                {item.type === 'Property' && (
                                    <div>
                                        <div className="text-right text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{tr('lifestyle.valueTrend')}</div>
                                        <div className={`mt-1 text-right text-sm font-black ${trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</div>
                                    </div>
                                )}
                                <div className="text-right text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    {item.type === 'Property' ? tr('lifestyle.propertyRentOnly') : tr('lifestyle.useOnlyAsset')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        <Store size={14}/> {tr('lifestyle.usedElsewhere')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-black/60 p-3">
                            <div className="font-black text-white">{tr('lifestyle.activitiesHook')}</div>
                            <div className="mt-1 text-xs font-bold text-zinc-500">{tr('lifestyle.activitiesHookSub')}</div>
                        </div>
                        <div className="rounded-2xl bg-black/60 p-3">
                            <div className="font-black text-white">{tr('lifestyle.contentHook')}</div>
                            <div className="mt-1 text-xs font-bold text-zinc-500">{tr('lifestyle.contentHookSub')}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {item.type === 'Property' && (
                        <button onClick={() => setResidence(item)} disabled={player.residenceId === item.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left disabled:opacity-60">
                            <KeyRound className="mb-3 text-emerald-300" size={20}/>
                            <div className="text-sm font-black text-white">{player.residenceId === item.id ? tr('lifestyle.currentHome') : tr('lifestyle.moveIn')}</div>
                        </button>
                    )}
                    <button onClick={() => maintainAsset(item)} disabled={repairCost <= 0 || player.money < repairCost || item.type === 'Clothing'} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-left disabled:opacity-40">
                        <Wrench className="mb-3 text-zinc-300" size={20}/>
                        <div className="text-sm font-black text-white">{tr('lifestyle.maintenance')}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{repairCost > 0 ? moneyShort(repairCost) : tr('lifestyle.noWorkNeeded')}</div>
                    </button>
                    {item.type !== 'Clothing' && (
                        <button onClick={() => onInitiateCustomization(item)} className={`rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-left ${item.type === 'Property' ? 'col-span-2' : ''}`}>
                            <Palette className="mb-3 text-indigo-300" size={20}/>
                            <div className="text-sm font-black text-white">{tr('lifestyle.customize')}</div>
                        </button>
                    )}
                </div>

                <button onClick={() => onSell(item.id)} className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 py-4 text-sm font-black uppercase tracking-[0.18em] text-rose-200">
                    {tr('lifestyle.sell')} • {moneyShort(assetValue * 0.5)}
                </button>
            </div>
        );
    }

    const listItems = categoryItems(mode === 'MARKET');

    return (
        <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                    <button onClick={backFromCurrent} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-white"><ArrowLeft size={20}/></button>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{mode === 'MARKET' ? tr('lifestyle.market') : tr('lifestyle.ownershipDesk')}</div>
                        <h2 className="truncate text-2xl font-black text-white">{mode === 'MARKET' ? tr('lifestyle.shop') : trFallback(`lifestyle.category.${category}`, category)}</h2>
                    </div>
                </div>
                {mode === 'DETAILS' && (
                    <button onClick={() => setMode('MARKET')} className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-black">
                        <ShoppingBag size={14}/> {tr('lifestyle.shop')}
                    </button>
                )}
            </div>

            {mode === 'DETAILS' && renderCategoryCommandHeader()}

            {renderFilters()}

            <div className="space-y-3">
                {listItems.map(item => mode === 'MARKET' ? renderMarketCard(item) : renderOwnedCard(item))}
                {listItems.length === 0 && (
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                        <div className="text-sm font-bold text-zinc-500">{tr('lifestyle.noItems')}</div>
                    </div>
                )}
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 text-sm font-bold leading-relaxed text-zinc-500">
                {rentedCount > 0 ? tr('lifestyle.rentalSummary', { count: rentedCount.toString(), amount: moneyShort(weeklyRental) }) : tr('lifestyle.assetSystemNote')}
            </div>

            {pendingPremiumGate && pendingPremiumProduct && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3 text-fuchsia-300">
                                <Lock size={20} />
                            </div>
                            <div>
                                <div className="text-xl font-black text-white">{tr('lifestyle.premiumAsset')}</div>
                                <div className="text-sm leading-relaxed text-zinc-400">{tr('lifestyle.premiumAssetSub', { title: pendingPremiumGate.title })}</div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">{tr('lifestyle.unlockPerk')}</div>
                            <div className="mt-1 font-bold text-white">{pendingPremiumGate.title}</div>
                            <div className="mt-1 text-sm text-zinc-400">{pendingPremiumGate.teaser}</div>
                            <div className="mt-3 font-black text-amber-200">{pendingPremiumProduct.priceLabel}</div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setPendingPremiumAssetId(null)} className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 font-bold text-zinc-300">{tr('lifestyle.maybeLater')}</button>
                            <button onClick={() => { onPremiumPurchase(pendingPremiumGate.productId); setPendingPremiumAssetId(null); }} className="flex-1 rounded-2xl bg-white py-3 font-black text-black">{tr('lifestyle.unlockNow')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
