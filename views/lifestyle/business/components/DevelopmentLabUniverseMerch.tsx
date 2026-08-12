import React from 'react';
import { Palmtree, ShoppingBag } from 'lucide-react';
import { Business, Player, Universe } from '../../../../types';
import { calculateUniverseProductWeeklyRevenue, getUniverseLifecycleRevenueMultiplier, getUniverseReleaseActivity, isUniverseRetired, normalizeUniverseForSave, normalizeUniverseMap } from '../../../../services/universeLogic';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { formatCurrency } from '../developmentLabFormatting';

const UNIVERSE_PRODUCT_BLUEPRINTS = [
    { id: 'merch_apparel', type: 'MERCH', cost: 500000, baseAppeal: 20, baseRevenue: 50000 },
    { id: 'merch_toys', type: 'MERCH', cost: 1000000, baseAppeal: 35, baseRevenue: 120000 },
    { id: 'merch_collectibles', type: 'MERCH', cost: 2500000, baseAppeal: 50, baseRevenue: 350000 },
    { id: 'park_land', type: 'PARK', cost: 50000000, baseAppeal: 85, baseRevenue: 6000000 },
    { id: 'park_ride', type: 'PARK', cost: 15000000, baseAppeal: 65, baseRevenue: 1800000 },
];

export interface UniverseMerchViewProps {
    universe: Universe;
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
}

export const UniverseMerchView: React.FC<UniverseMerchViewProps> = ({ universe, player, studio, onUpdatePlayer }) => {
    const activeProducts = (universe.products || []).filter(product => product.active !== false);
    const releaseActivity = getUniverseReleaseActivity(player, universe, player.activeReleases || []);
    const lifecycleRevenueMultiplier = getUniverseLifecycleRevenueMultiplier(universe);
    const effectivePayoutRate = releaseActivity.multiplier * lifecycleRevenueMultiplier;
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const getUniverseProductName = (id: string) => tr(`services.business.universeMerch.product.${id}.name`);
    const getUniverseProductDescription = (id: string) => tr(`services.business.universeMerch.product.${id}.description`);
    const activityNote = isUniverseRetired(universe)
        ? tr('services.business.universeMerch.activity.legacy')
        : releaseActivity.weeksSinceLatestRelease === null
            ? tr('services.business.universeMerch.activity.needsRelease')
            : releaseActivity.multiplier <= 0
                ? tr('services.business.universeMerch.activity.paused')
                : tr('services.business.universeMerch.activity.yearsSinceRelease', { years: Math.max(0, Math.floor(releaseActivity.weeksSinceLatestRelease / 52)) });
    const projectedWeeklyRevenue = activeProducts.reduce(
        (sum, product) => sum + Math.floor(calculateUniverseProductWeeklyRevenue(universe, product) * effectivePayoutRate),
        0
    );

    const handleLaunchProduct = (blueprint: typeof UNIVERSE_PRODUCT_BLUEPRINTS[0]) => {
        if (isUniverseRetired(universe)) return;
        if (studio.balance < blueprint.cost) return;

        const newProduct = {
            id: `up_${Date.now()}_${Math.random()}`,
            catalogId: blueprint.id,
            name: getUniverseProductName(blueprint.id),
            quality: 70 + Math.random() * 30,
            productionCost: blueprint.cost,
            sellingPrice: blueprint.baseRevenue, // Using this as base weekly revenue for now
            appeal: blueprint.baseAppeal + (universe.brandPower / 10),
            unitsSold: 0,
            inventory: 0,
            active: true
        };

        const updatedUniverse = {
            ...universe,
            products: [...(universe.products || []), newProduct]
        };

        const updatedStudio = {
            ...studio,
            balance: studio.balance - blueprint.cost,
            studioState: {
                ...studio.studioState,
                universes: (studio.studioState?.universes || []).map(u => u.id === universe.id ? updatedUniverse : u)
            }
        };

        const updatedPlayer = {
            ...player,
            world: {
                ...player.world,
                universes: {
                    ...normalizeUniverseMap(player.world?.universes || {}),
                    [universe.id]: normalizeUniverseForSave(updatedUniverse, universe.id)
                }
            },
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b),
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: tr('services.business.universeMerch.log.launched', { productName: getUniverseProductName(blueprint.id), universeName: universe.name }),
                    type: 'positive' as const
                },
                ...(player.logs || [])
            ].slice(0, 50)
        };

        onUpdatePlayer(updatedPlayer);
    };

    return (
        <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.studioCapitalPayout')}</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                    {tr('services.business.universeMerch.studioCapitalBody')}
                </p>
            </div>

            <div className={`border rounded-2xl p-4 ${effectivePayoutRate > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.catalogHeat')}</p>
                        <p className="text-xl font-black text-white">{releaseActivity.label}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.payoutRate')}</p>
                        <p className={`text-xl font-black ${effectivePayoutRate > 0 ? 'text-amber-300' : 'text-rose-300'}`}>{Math.round(effectivePayoutRate * 100)}%</p>
                    </div>
                </div>
                <p className="text-xs text-zinc-400 mt-2">{activityNote}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.lastPaid')}</p>
                    <p className="text-xl font-black text-emerald-400">{formatCurrency(universe.stats?.weeklyRevenue || 0)}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.nextWeek')}</p>
                    <p className="text-xl font-black text-amber-300">{formatCurrency(projectedWeeklyRevenue)}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.lifetimeRevenue')}</p>
                    <p className="text-xl font-black text-white">{formatCurrency(universe.stats?.lifetimeRevenue || 0)}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{tr('services.business.universeMerch.activeLicenses')}</p>
                    <p className="text-xl font-black text-white">{activeProducts.length}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">{tr('services.business.universeMerch.activeProducts')}</h3>
                {(universe.products || []).length === 0 ? (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
                        <p className="text-zinc-500 text-sm">{tr('services.business.universeMerch.noActiveProducts')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {universe.products.map((prod, idx) => {
                            const projectedRevenue = Math.floor(calculateUniverseProductWeeklyRevenue(universe, prod) * effectivePayoutRate);
                            return (
                            <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-amber-500">
                                        {prod.catalogId.startsWith('park') ? <Palmtree size={20} /> : <ShoppingBag size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{getUniverseProductName(prod.catalogId)}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{tr('services.business.universeMerch.basePerWeek', { amount: formatCurrency(prod.sellingPrice) })}</p>
                                        <p className="text-[10px] text-emerald-400 uppercase tracking-widest">{tr('services.business.universeMerch.projectedPerWeek', { amount: formatCurrency(projectedRevenue) })}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('services.business.universeMerch.appeal')}</p>
                                    <p className="text-sm font-black text-white">{Math.floor(prod.appeal)}%</p>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">{tr('services.business.universeMerch.launchNewVenture')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {UNIVERSE_PRODUCT_BLUEPRINTS.map(bp => {
                        const isOwned = (universe.products || []).some(p => p.catalogId === bp.id);
                        const canAfford = studio.balance >= bp.cost;
                        const archiveLocked = isUniverseRetired(universe);
                        
                        return (
                            <div key={bp.id} className={`bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-3 flex flex-col ${isOwned || archiveLocked ? 'opacity-50' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                                        {bp.type === 'PARK' ? <Palmtree size={20} /> : <ShoppingBag size={20} />}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('services.business.universeMerch.cost')}</p>
                                        <p className="text-sm font-black text-white">{formatCurrency(bp.cost)}</p>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white">{getUniverseProductName(bp.id)}</p>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">{getUniverseProductDescription(bp.id)}</p>
                                </div>
                                <button 
                                    disabled={archiveLocked || isOwned || !canAfford}
                                    onClick={() => handleLaunchProduct(bp)}
                                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${archiveLocked || isOwned ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : canAfford ? 'bg-amber-500 text-black hover:scale-[1.02]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                                >
                                    {archiveLocked ? tr('services.business.universeMerch.status.archiveLocked') : isOwned ? tr('services.business.universeMerch.status.alreadyLaunched') : canAfford ? tr('services.business.universeMerch.status.launchVenture') : tr('services.business.universeMerch.status.insufficientFunds')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
