import React, { useState, useMemo } from 'react';
import { Player, Business, Universe, Script } from '../../../types';
import { Globe, Layers, ShoppingCart, Sparkles, Star, ChevronRight, Check, TrendingUp, RefreshCw } from 'lucide-react';
import { generateIPMarket } from '../../../src/data/generators';

interface IPManagementProps {
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
    onBack?: () => void;
}

type IPTab = 'UNIVERSES' | 'FRANCHISES' | 'MARKETPLACE';

const formatCurrency = (amount: number): string => {
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
    return `$${amount}`;
};

export const IPManagement: React.FC<IPManagementProps> = ({ player, studio, onUpdatePlayer, onBack }) => {
    const [activeTab, setActiveTab] = useState<IPTab>('UNIVERSES');

    return (
        <div className="h-full flex flex-col bg-black text-white overflow-hidden">
            {/* Header */}
            <div className="flex-none p-8 pb-0">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        {onBack && (
                            <button onClick={onBack} className="mb-4 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                                <ChevronRight className="rotate-180" size={16} /> Back to Dashboard
                            </button>
                        )}
                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">IP & Universes</h1>
                        <p className="text-zinc-400 text-sm">Manage your franchises, cinematic universes, and acquire new intellectual property.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 border-b border-zinc-800">
                    {[
                        { id: 'UNIVERSES', label: 'Universes', icon: <Globe size={14} /> },
                        { id: 'FRANCHISES', label: 'My Franchises', icon: <Layers size={14} /> },
                        { id: 'MARKETPLACE', label: 'Acquisitions', icon: <ShoppingCart size={14} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as IPTab)}
                            className={`px-4 py-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                                activeTab === tab.id 
                                    ? 'border-amber-500 text-amber-500' 
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'UNIVERSES' && <UniverseManager player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} />}
                {activeTab === 'FRANCHISES' && <FranchiseManager player={player} studio={studio} />}
                {activeTab === 'MARKETPLACE' && <FranchiseMarketplace player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} />}
            </div>
        </div>
    );
};

// --- Subcomponents ---

const UniverseManager: React.FC<{ player: Player; studio: Business; onUpdatePlayer: (p: Player) => void; }> = ({ player, studio, onUpdatePlayer }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const studioUniverses = (Object.values(player.world.universes || {}) as Universe[]).filter(u => u.studioId === studio.id);
    const allUniverses = Object.values(player.world.universes || {}) as Universe[];
    const totalPower = allUniverses.reduce((acc, u) => acc + (u.brandPower * 0.7 + u.momentum * 0.3), 0);
    
    const universesWithShare = allUniverses.map(u => ({
        ...u,
        marketShare: totalPower > 0 ? ((u.brandPower * 0.7 + u.momentum * 0.3) / totalPower) * 100 : 0
    })).sort((a, b) => b.marketShare - a.marketShare);

    const handleCreate = () => {
        if (studio.balance < 5000000) return;

        const newUniverseId = `universe_${Date.now()}`;
        const colors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUniverse: any = {
            id: newUniverseId,
            name,
            description,
            studioId: studio.id,
            currentPhase: 'PHASE_1_ORIGINS',
            saga: 1,
            momentum: 0,
            brandPower: 0,
            marketShare: 0,
            color: randomColor,
            roster: [],
            slate: [],
            weeksUntilNextPhase: 104
        };

        const updatedStudio = { ...studio, balance: studio.balance - 5000000 };
        const updatedPlayer = {
            ...player,
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b),
            world: {
                ...player.world,
                universes: {
                    ...(player.world.universes || {}),
                    [newUniverseId]: newUniverse
                }
            }
        };

        onUpdatePlayer(updatedPlayer);
        setIsCreating(false);
        setName('');
        setDescription('');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Cinematic Universes</h2>
                    <p className="text-zinc-400 text-sm mt-1">Interconnected worlds that share characters and storylines.</p>
                </div>
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Start New Universe ($5M)
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Universe Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. The MonsterVerse"
                                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                            <textarea 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What is this world about?"
                                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white h-24 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={handleCreate}
                            disabled={!name || studio.balance < 5000000}
                            className="flex-1 bg-white text-black py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50 transition-colors"
                        >
                            Register Universe ($5M)
                        </button>
                        <button 
                            onClick={() => setIsCreating(false)}
                            className="px-8 py-4 bg-zinc-800 text-zinc-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Market Share Battle</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex h-12 w-full rounded-full overflow-hidden mb-8 border border-zinc-800">
                            {universesWithShare.map((u: any) => (
                                <div 
                                    key={u.id}
                                    style={{ width: `${u.marketShare}%`, backgroundColor: u.color }}
                                    className="h-full transition-all duration-1000 relative group"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            {universesWithShare.map((u: any) => (
                                <div key={u.id} className="flex items-center justify-between group p-3 hover:bg-zinc-800/50 rounded-xl transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: u.color, boxShadow: `0 0 10px ${u.color}` }} />
                                        <div>
                                            <span className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">{u.name}</span>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.studioId.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-mono font-black text-white">{u.marketShare.toFixed(1)}%</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Brand Power: {u.brandPower}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Your Universes</h3>
                    {studioUniverses.length === 0 ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-48">
                            <Globe size={32} className="text-zinc-700 mb-4" />
                            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">No Universes Registered</p>
                        </div>
                    ) : (
                        studioUniverses.map((u: any) => (
                            <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 hover:border-amber-500/30 transition-colors">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-lg font-black text-white uppercase">{u.name}</h4>
                                    <span className="text-[9px] font-black px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        {u.currentPhase.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500 uppercase font-bold">Momentum</span>
                                        <span className="text-white font-mono">{u.momentum}/100</span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${u.momentum}%` }} />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-zinc-800 grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                        <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Saga</p>
                                        <p className="text-xs font-mono text-white">{u.saga}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Movies</p>
                                        <p className="text-xs font-mono text-white">{u.slate?.length || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Chars</p>
                                        <p className="text-xs font-mono text-white">{u.roster?.length || 0}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const FranchiseManager: React.FC<{ player: Player; studio: Business; }> = ({ player, studio }) => {
    // Group past projects by franchiseId
    const franchises = useMemo(() => {
        const groups: Record<string, any[]> = {};
        (player.pastProjects || []).forEach(p => {
            if (p.projectType !== 'MOVIE') return;
            const fId = p.franchiseId || p.id;
            if (!groups[fId]) groups[fId] = [];
            groups[fId].push(p);
        });

        // Add purchased IPs that don't have movies yet
        (studio.studioState?.purchasedIPTitles || []).forEach(title => {
            const fId = `purchased_${title.replace(/\s+/g, '_').toLowerCase()}`;
            if (!groups[fId]) {
                groups[fId] = [{
                    id: fId,
                    title: title,
                    isPurchasedIP: true,
                    budget: 0,
                    gross: 0,
                    rating: 0,
                    installmentNumber: 0
                }];
            }
        });

        return Object.entries(groups).map(([id, movies]) => {
            if (!movies || movies.length === 0) return null;
            
            movies.sort((a, b) => (a.installmentNumber || 1) - (b.installmentNumber || 1));
            const totalGross = movies.reduce((sum, m) => sum + (m.gross || 0), 0);
            const avgRating = movies.reduce((sum, m) => sum + (m.rating || 0), 0) / movies.length;
            const isPurchased = movies[0].isPurchasedIP;
            const title = movies[0].title || 'Untitled Project';
            const name = isPurchased ? title : (title.split(':')[0].split('-')[0].trim());

            return { id, name, movies, totalGross, avgRating, isPurchased };
        }).filter(Boolean).sort((a: any, b: any) => b.totalGross - a.totalGross);
    }, [player.pastProjects, studio.studioState?.purchasedIPTitles]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">My Franchises</h2>
                <p className="text-zinc-400 text-sm mt-1">Manage your active IP and track their lifetime performance.</p>
            </div>

            {franchises.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <Layers size={48} className="text-zinc-700 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">No Franchises Yet</h3>
                    <p className="text-sm text-zinc-500 max-w-md">Release a movie or acquire an IP from the marketplace to start building your franchise empire.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {franchises.map(f => (
                        <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-colors flex flex-col">
                            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-black text-white uppercase truncate pr-4">{f.name}</h3>
                                    {f.isPurchased && (
                                        <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest whitespace-nowrap">
                                            Acquired IP
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-4 mt-4">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Total Gross</p>
                                        <p className="text-sm font-mono text-emerald-400 font-bold">{formatCurrency(f.totalGross)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Avg Rating</p>
                                        <p className="text-sm font-mono text-white flex items-center gap-1">
                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                            {f.avgRating.toFixed(1)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 flex-1 bg-zinc-900">
                                <p className="text-[10px] text-zinc-500 uppercase font-black mb-3 px-2">Installments ({f.isPurchased ? 0 : f.movies.length})</p>
                                <div className="space-y-2">
                                    {!f.isPurchased && f.movies.map((m, idx) => (
                                        <div key={m.id || idx} className="flex justify-between items-center p-2 rounded-lg bg-black/20">
                                            <span className="text-xs text-zinc-300 truncate pr-2">{m.title}</span>
                                            <span className="text-xs font-mono text-emerald-500 shrink-0">{formatCurrency(m.gross || 0)}</span>
                                        </div>
                                    ))}
                                    {f.isPurchased && (
                                        <div className="p-4 text-center text-xs text-zinc-500 italic">
                                            Ready for development. Go to the Greenlight Wizard to produce the first installment.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FranchiseMarketplace: React.FC<{ player: Player; studio: Business; onUpdatePlayer: (p: Player) => void; }> = ({ player, studio, onUpdatePlayer }) => {
    const studioState = studio.studioState || { scripts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0, purchasedIPTitles: [] };
    
    // Use the market from studio state if available, otherwise use a fallback
    const availableIPs = useMemo(() => {
        const market = studioState.ipMarket || [];
        if (market.length > 0) return market;

        // Fallback if market is empty
        return [
            { id: 'ip_1', title: 'Galactic Frontiers', genre: 'SCI_FI', developmentCost: 150000000, quality: 85, logline: 'A massive sci-fi space opera franchise whose original studio went bankrupt.' },
            { id: 'ip_2', title: 'The Shadow Knight', genre: 'SUPERHERO', developmentCost: 450000000, quality: 95, logline: 'A gritty superhero IP. The current owners are looking for a quick cash injection.' },
            { id: 'ip_3', title: 'Dino Park', genre: 'ADVENTURE', developmentCost: 200000000, quality: 70, logline: 'Classic monster adventure franchise that hasn\'t had a movie in 15 years.' }
        ];
    }, [studioState.ipMarket]);

    const handleRefresh = () => {
        if (studio.balance < 250000) return;

        const newMarket = generateIPMarket(6, studioState.purchasedIPTitles || []);
        const updatedStudio = {
            ...studio,
            balance: studio.balance - 250000,
            studioState: {
                ...studioState,
                ipMarket: newMarket,
                lastMarketRefreshWeek: player.currentWeek
            }
        };

        onUpdatePlayer({
            ...player,
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        });
    };

    const handleBuy = (ip: any) => {
        if (studio.balance < ip.developmentCost) return;

        const updatedStudio = { ...studio, balance: studio.balance - ip.developmentCost };
        const purchased = [...(studioState.purchasedIPTitles || []), ip.title];
        
        updatedStudio.studioState = {
            ...studioState,
            scripts: [...(studioState.scripts || []), { ...ip, status: 'READY', createdAtWeek: player.currentWeek }],
            ipMarket: (studioState.ipMarket || []).filter(s => s.id !== ip.id),
            purchasedIPTitles: purchased
        };

        onUpdatePlayer({
            ...player,
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-amber-500">IP Acquisitions</h2>
                    <p className="text-zinc-400 text-sm mt-1">Buy out rival franchises and add them to your studio's portfolio.</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    disabled={studio.balance < 250000}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={studio.balance < 250000 ? '' : 'text-amber-500'} />
                    Refresh Market ($250k)
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {availableIPs.map(ip => {
                    const cost = ip.developmentCost || 0;
                    const canAfford = studio.balance >= cost;
                    return (
                        <div key={ip.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center hover:border-amber-500/50 transition-colors">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-black text-white uppercase">{ip.title}</h3>
                                    <span className="bg-zinc-800 text-zinc-300 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                        {ip.genres?.[0] || ip.genre || 'DRAMA'}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-400">{ip.logline || ip.desc}</p>
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase">
                                        <TrendingUp size={14} className="text-amber-500" />
                                        Market Hype: <span className="text-white">{ip.quality || 50}/100</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full md:w-64 flex flex-col gap-3 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Acquisition Cost</p>
                                    <p className={`text-2xl font-mono font-black ${canAfford ? 'text-white' : 'text-rose-500'}`}>
                                        {formatCurrency(cost)}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleBuy(ip)}
                                    disabled={!canAfford}
                                    className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        canAfford 
                                            ? 'bg-white text-black hover:bg-amber-500 hover:scale-[1.02] active:scale-95' 
                                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                    }`}
                                >
                                    <ShoppingCart size={14} />
                                    {canAfford ? 'Buyout IP' : 'Insufficient Funds'}
                                </button>
                            </div>
                        </div>
                    );
                })}
                {availableIPs.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                        No new IPs available on the market right now. Check back later.
                    </div>
                )}
            </div>
        </div>
    );
};
