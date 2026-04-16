
import React, { useEffect, useMemo, useState } from 'react';
import { Player, ActorSkills, Genre, Stats } from '../types';
import { formatMoney } from '../services/formatUtils';
import { ArrowLeft, Zap, DollarSign, Heart, Brain, Clapperboard, PlayCircle, ShieldAlert, Crown, Gem, Home, CarFront, Plane, CheckCircle2 } from 'lucide-react';
import { hasPremiumProduct, PREMIUM_PRODUCTS, PremiumProductId } from '../services/premiumLogic';
import { getPremiumCatalogProducts } from '../services/iapService';

const PREMIUM_STORE_ENABLED = true;

interface StorePageProps {
    player: Player;
    onBack: () => void;
    onWatchAd: (type: 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE', data?: any) => void;
    onPremiumPurchase: (productId: PremiumProductId) => void;
    onRestorePurchases: () => void;
}

export const StorePage: React.FC<StorePageProps> = ({ player, onBack, onWatchAd, onPremiumPurchase, onRestorePurchases }) => {
    const [selectedSkill, setSelectedSkill] = useState<keyof ActorSkills>('delivery');
    const [selectedGenre, setSelectedGenre] = useState<Genre>('ACTION');
    const [activeTab, setActiveTab] = useState<'REWARDS' | 'PREMIUM'>('REWARDS');
    const [pendingProduct, setPendingProduct] = useState<PremiumProductId | null>(null);
    const [catalogPrices, setCatalogPrices] = useState<Record<PremiumProductId, string>>({} as Record<PremiumProductId, string>);
    const isIOSDevice = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    const showPremiumStore = PREMIUM_STORE_ENABLED && (isIOSDevice || import.meta.env.DEV);

    const GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO'];
    const SKILLS: (keyof ActorSkills)[] = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'];
    const bonusEnergy = player.flags?.bonusEnergyBank || 0;
    useEffect(() => {
        if (!showPremiumStore) return;

        getPremiumCatalogProducts().then(products => {
            if (products.length === 0) return;
            const nextPrices = {} as Record<PremiumProductId, string>;
            products.forEach(product => {
                nextPrices[product.premiumProductId] = product.priceLabel;
            });
            setCatalogPrices(nextPrices);
        });
    }, [showPremiumStore]);

    const premiumProductsById = useMemo(() => {
        const map = new Map<PremiumProductId, typeof PREMIUM_PRODUCTS[number]>();
        PREMIUM_PRODUCTS.forEach(product => {
            map.set(product.id, product);
        });
        return map;
    }, []);

    const premiumSections = [
        {
            title: 'Ad-Free',
            icon: ShieldAlert,
            products: PREMIUM_PRODUCTS.filter(product => product.category === 'ad_free')
        },
        {
            title: 'Energy Boosts',
            icon: Zap,
            products: PREMIUM_PRODUCTS.filter(product => product.category === 'energy')
        },
        {
            title: 'Cash Boosts',
            icon: DollarSign,
            products: PREMIUM_PRODUCTS.filter(product => product.category === 'cash')
        },
        {
            title: 'Collections',
            icon: Crown,
            products: PREMIUM_PRODUCTS.filter(product => product.category === 'collection')
        }
    ];

    const getProductAccent = (productId: PremiumProductId) => {
        if (productId.includes('energy')) return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
        if (productId.includes('cash')) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
        if (productId === 'no_ads') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
        if (productId.includes('home')) return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
        if (productId.includes('vehicle')) return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300';
        if (productId.includes('sky') || productId.includes('vault') || productId.includes('ultimate')) return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
        return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    };

    const getProductIcon = (productId: PremiumProductId) => {
        if (productId === 'no_ads') return ShieldAlert;
        if (productId.includes('energy')) return Zap;
        if (productId.includes('cash')) return DollarSign;
        if (productId.includes('home')) return Home;
        if (productId.includes('vehicle')) return CarFront;
        if (productId.includes('sky')) return Plane;
        return Gem;
    };


    return (
        <div className="space-y-6 pb-24 pt-4 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <h2 className="text-3xl font-bold text-white">Store</h2>
                <div className="ml-auto bg-amber-500/20 px-3 py-1 rounded-full text-amber-400 font-mono text-sm font-bold border border-amber-500/30 whitespace-nowrap">
                    {formatMoney(player.money)}
                </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Energy Reserve</div>
                    <div className="text-sm text-white font-semibold">Bonus Bank: {bonusEnergy}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">Bought energy carries over week to week until fully used.</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-black text-sm">
                    {player.energy.current} Ready
                </div>
            </div>

            {showPremiumStore && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <button
                            onClick={() => setActiveTab('REWARDS')}
                            className={`py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'REWARDS' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Rewards
                        </button>
                        <button
                            onClick={() => setActiveTab('PREMIUM')}
                            className={`py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'PREMIUM' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Premium
                        </button>
                    </div>

                    <button
                        onClick={onRestorePurchases}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                        <CheckCircle2 size={16}/>
                        Restore Purchases
                    </button>
                </div>
            )}

            {showPremiumStore && activeTab === 'PREMIUM' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl text-amber-300">
                            <Crown size={20}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Premium</h3>
                            <p className="text-xs text-zinc-500">
                                {isIOSDevice ? 'iOS-only purchase catalog.' : 'Developer preview of the iOS purchase catalog.'}
                            </p>
                        </div>
                        <button
                            onClick={onRestorePurchases}
                            className="ml-auto px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            Restore Purchases
                        </button>
                    </div>

                    {premiumSections.map(section => {
                        const SectionIcon = section.icon;
                        return (
                            <div key={section.title} className="glass-card p-5 rounded-2xl border border-zinc-800 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/5 rounded-xl text-zinc-300"><SectionIcon size={18}/></div>
                                    <div className="font-bold text-white">{section.title}</div>
                                </div>

                                <div className="space-y-3">
                                    {section.products.map(product => {
                                        const owned = hasPremiumProduct(player, product.id);
                                        const ProductIcon = getProductIcon(product.id);
                                        return (
                                            <div key={product.id} className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-xl border ${getProductAccent(product.id)}`}>
                                                        <ProductIcon size={18}/>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="font-bold text-white">{product.title}</div>
                                                            {product.kind === 'non_consumable' && owned && (
                                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    <CheckCircle2 size={12}/> Owned
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{product.description}</div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-white font-black">{catalogPrices[product.id] || product.priceLabel}</div>
                                                        <button
                                                            onClick={() => setPendingProduct(product.id)}
                                                            disabled={product.kind === 'non_consumable' && owned}
                                                            className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                                product.kind === 'non_consumable' && owned
                                                                    ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800'
                                                                    : 'bg-white text-black hover:bg-zinc-200'
                                                            }`}
                                                        >
                                                            {product.kind === 'consumable' ? 'Add' : owned ? 'Unlocked' : 'Unlock'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {(!showPremiumStore || activeTab === 'REWARDS') && (
            <>
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                {/* Cash Ad */}
                <button 
                    onClick={() => onWatchAd('REWARDED_CASH')}
                    className="glass-card p-4 rounded-2xl text-left hover:bg-white/5 transition-all group border-emerald-500/30"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform"><DollarSign size={24}/></div>
                        <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ad</div>
                    </div>
                    <div className="font-bold text-lg text-white">Get $5,000</div>
                    <div className="text-xs text-zinc-400">Small instant cash injection</div>
                </button>

                {/* Energy Ad */}
                <button 
                    onClick={() => onWatchAd('REWARDED_ENERGY')}
                    className="glass-card p-4 rounded-2xl text-left hover:bg-white/5 transition-all group border-amber-500/30"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 group-hover:scale-110 transition-transform"><Zap size={24} fill="currentColor"/></div>
                        <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ad</div>
                    </div>
                    <div className="font-bold text-lg text-white">Refill 25 Energy</div>
                    <div className="text-xs text-zinc-400">Keep working longer</div>
                </button>
            </div>

            {/* Wellbeing Package */}
            <button 
                onClick={() => onWatchAd('REWARDED_STATS')}
                className="w-full glass-card p-5 rounded-2xl flex items-center justify-between group border-rose-500/30 hover:bg-rose-900/10 transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400 group-hover:scale-110 transition-transform"><Heart size={28}/></div>
                    <div className="text-left">
                        <div className="font-bold text-lg text-white">Wellness Package</div>
                        <div className="text-xs text-zinc-400">Boost Health, Mood, Looks & Body to 90+</div>
                    </div>
                </div>
                <PlayCircle className="text-zinc-500 group-hover:text-rose-400 transition-colors" />
            </button>

            {/* Skill Boost */}
            <div className="glass-card p-5 rounded-2xl space-y-4 border-indigo-500/30">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Brain size={20}/></div>
                    <h3 className="font-bold text-white">Skill Master</h3>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {SKILLS.map(skill => (
                        <button
                            key={skill}
                            onClick={() => setSelectedSkill(skill)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap capitalize transition-colors ${selectedSkill === skill ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}
                        >
                            {skill}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => onWatchAd('REWARDED_SKILL', selectedSkill)}
                    className="w-full py-3 bg-indigo-600/20 border border-indigo-500/50 rounded-xl text-indigo-300 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <PlayCircle size={16}/> Boost {selectedSkill} (+10)
                </button>
            </div>

            {/* Genre Study */}
            <div className="glass-card p-5 rounded-2xl space-y-4 border-purple-500/30">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Clapperboard size={20}/></div>
                    <h3 className="font-bold text-white">Genre Study</h3>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {GENRES.map(g => (
                        <button
                            key={g}
                            onClick={() => setSelectedGenre(g)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap capitalize transition-colors ${selectedGenre === g ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => onWatchAd('REWARDED_GENRE', selectedGenre)}
                    className="w-full py-3 bg-purple-600/20 border border-purple-500/50 rounded-xl text-purple-300 font-bold text-sm hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <PlayCircle size={16}/> Study {selectedGenre} (+10 XP)
                </button>
            </div>

            <div className="text-center text-xs text-zinc-600 mt-4">
                Watch ads to support the game and get rewards.
            </div>
            </>
            )}

            {pendingProduct && (
                <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
                        <div className="text-xl font-black text-white">Confirm Purchase</div>
                        <div className="text-sm text-zinc-400 leading-relaxed">
                            Buy <span className="text-white font-bold">{PREMIUM_PRODUCTS.find(product => product.id === pendingProduct)?.title}</span>?
                            {(pendingProduct && (catalogPrices[pendingProduct] || premiumProductsById.get(pendingProduct)?.priceLabel)) ? (
                                <> Apple will charge <span className="text-white font-bold">{catalogPrices[pendingProduct] || premiumProductsById.get(pendingProduct)?.priceLabel}</span> if the purchase is approved.</>
                            ) : null}
                            Your reward will only be granted after iOS confirms the purchase.
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingProduct(null)}
                                className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onPremiumPurchase(pendingProduct);
                                    setPendingProduct(null);
                                }}
                                className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
