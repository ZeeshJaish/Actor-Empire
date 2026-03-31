
import React, { useState } from 'react';
import { Player, Property, Vehicle, ClothingItem } from '../../types';
import { PROPERTY_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from '../../services/lifestyleLogic';
import { ShoppingBag, ArrowLeft, ChevronRight, Home, Car, Shirt, MapPin } from 'lucide-react';

interface LifestyleAssetsProps {
    player: Player;
    onBack: () => void;
    onBuy: (item: Property | Vehicle | ClothingItem) => void;
    onSell: (id: string) => void;
    onSetResidence: (id: string) => void;
    onInitiateCustomization: (item: Property | Vehicle) => void;
}

export const LifestyleAssets: React.FC<LifestyleAssetsProps> = ({ player, onBack, onBuy, onSell, onSetResidence, onInitiateCustomization }) => {
    const [mode, setMode] = useState<'HUB' | 'DETAILS' | 'MARKET'>('HUB');
    const [category, setCategory] = useState<'PROPERTY' | 'VEHICLE' | 'CLOTHING'>('PROPERTY');
    const [filter, setFilter] = useState<string>('ALL');

    const getItemIcon = (item: any) => {
        if (item.type === 'Vehicle') {
            switch(item.vehicleType) {
                case 'Car': return '🚗';
                case 'Motorcycle': return '🏍️';
                case 'Boat': return '🚤';
                case 'Aircraft': return '✈️';
                default: return '🚗';
            }
        }
        if (item.type === 'Clothing') {
            if (item.category === 'ACCESSORY') {
                switch(item.subCategory) {
                    case 'EYEWEAR': return '🕶️';
                    case 'WATCH': return '⌚';
                    case 'BAG': return '👜';
                    case 'JEWELRY': return '💍';
                    default: return '💍';
                }
            }
            switch(item.category) {
                case 'TOP': return '👕';
                case 'BOTTOM': return '👖';
                case 'SHOES': return '👟';
                case 'OUTFIT': return '🕴️';
                default: return '📦';
            }
        }
        return '🏠'; // Property
    };

    const renderCard = (item: any, isOwned: boolean) => (
        <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="text-2xl bg-black/40 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                    {getItemIcon(item)}
                </div>
                <div>
                    <div className="font-bold text-white text-sm leading-tight">{item.name}</div>
                    
                    {/* Property Specific Location Info */}
                    {item.type === 'Property' && (
                        <>
                            {item.address && <div className="text-[10px] text-zinc-400 italic mb-0.5">{item.address}</div>}
                            {item.location && (
                                <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <MapPin size={8} /> {item.location}
                                </div>
                            )}
                        </>
                    )}

                    {/* Generic Stats */}
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">
                        {item.type === 'Clothing' ? item.style : item.type === 'Vehicle' ? `+${item.reputationBonus} Rep` : `+${item.moodBonus} Mood`}
                    </div>
                </div>
            </div>
            <div className="text-right">
                {isOwned ? (
                    <div className="flex gap-2">
                        {item.type === 'Property' && (
                            <button onClick={() => onSetResidence(item.id)} disabled={player.residenceId === item.id} className={`px-3 py-1 rounded text-[10px] font-bold ${player.residenceId === item.id ? 'bg-emerald-900 text-emerald-400' : 'bg-zinc-800 text-zinc-300'}`}>
                                {player.residenceId === item.id ? 'Home' : 'Move In'}
                            </button>
                        )}
                        <button onClick={() => onSell(item.id)} className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded text-[10px] hover:text-rose-400">Sell</button>
                    </div>
                ) : (
                    <>
                        <div className="font-mono text-emerald-400 font-bold text-sm">${item.price.toLocaleString()}</div>
                        <button 
                            onClick={() => item.type === 'Clothing' ? onBuy(item) : onInitiateCustomization(item)}
                            disabled={player.money < item.price}
                            className="mt-1 bg-white text-black px-3 py-1 rounded text-[10px] font-bold disabled:opacity-50"
                        >
                            {item.type === 'Clothing' ? 'Buy' : 'Customize'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    const getItems = (isMarket: boolean) => {
        let items: any[] = [];
        if (category === 'PROPERTY') items = isMarket ? PROPERTY_CATALOG : player.assets.map(id => player.customItems.find(c => c.id === id) || PROPERTY_CATALOG.find(p => p.id === id)).filter(Boolean);
        else if (category === 'VEHICLE') {
            const all = [...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG];
            items = isMarket ? all : player.assets.map(id => player.customItems.find(c => c.id === id) || all.find(v => v.id === id)).filter(Boolean);
            if (filter !== 'ALL') items = items.filter(i => i.vehicleType === filter);
        } else {
            items = isMarket ? CLOTHING_CATALOG : player.assets.map(id => CLOTHING_CATALOG.find(c => c.id === id)).filter(Boolean);
            if (filter !== 'ALL') {
                if (['EYEWEAR', 'WATCH', 'BAG', 'JEWELRY'].includes(filter)) {
                    // Sub-category filter logic for accessories
                    items = items.filter(i => i.category === 'ACCESSORY' && i.subCategory === filter);
                } else {
                    // Standard category filter
                    items = items.filter(i => i.category === filter);
                }
            }
        }
        return items;
    };

    if (mode === 'HUB') {
        return (
            <div className="space-y-4 animate-in slide-in-from-right duration-300 pb-24">
                <div className="flex items-center gap-4 mb-4"><button onClick={onBack}><ArrowLeft/></button><h2 className="text-2xl font-bold">My Assets</h2></div>
                <button onClick={() => { setCategory('PROPERTY'); setMode('DETAILS'); }} className="w-full glass-card p-5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><Home size={24}/></div><div className="text-left"><div className="font-bold text-lg text-white">Real Estate</div><div className="text-xs text-zinc-400">Properties</div></div></div><ChevronRight className="text-zinc-600 group-hover:text-zinc-400"/>
                </button>
                <button onClick={() => { setCategory('VEHICLE'); setMode('DETAILS'); }} className="w-full glass-card p-5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4"><div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><Car size={24}/></div><div className="text-left"><div className="font-bold text-lg text-white">Vehicles</div><div className="text-xs text-zinc-400">Garage</div></div></div><ChevronRight className="text-zinc-600 group-hover:text-zinc-400"/>
                </button>
                <button onClick={() => { setCategory('CLOTHING'); setMode('DETAILS'); }} className="w-full glass-card p-5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4"><div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl"><Shirt size={24}/></div><div className="text-left"><div className="font-bold text-lg text-white">Wardrobe</div><div className="text-xs text-zinc-400">Fashion</div></div></div><ChevronRight className="text-zinc-600 group-hover:text-zinc-400"/>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300 pb-24">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4"><button onClick={() => { if (mode === 'MARKET') setMode('DETAILS'); else setMode('HUB'); }}><ArrowLeft/></button><h2 className="text-2xl font-bold">{mode === 'MARKET' ? 'Market' : category}</h2></div>
                {mode === 'DETAILS' && <button onClick={() => setMode('MARKET')} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><ShoppingBag size={14}/> Shop</button>}
            </div>
            
            {category === 'CLOTHING' && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['ALL', 'OUTFIT', 'TOP', 'BOTTOM', 'SHOES', 'EYEWEAR', 'WATCH', 'BAG', 'JEWELRY'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>{f}</button>
                    ))}
                </div>
            )}
            {category === 'VEHICLE' && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['ALL', 'Car', 'Motorcycle', 'Boat', 'Aircraft'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>{f}</button>
                    ))}
                </div>
            )}

            <div className="space-y-3">
                {getItems(mode === 'MARKET').map(item => renderCard(item, mode === 'DETAILS'))}
                {getItems(mode === 'MARKET').length === 0 && <div className="text-center text-zinc-500 text-sm py-10">No items found.</div>}
            </div>
        </div>
    );
};
