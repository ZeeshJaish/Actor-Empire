import React, { useState } from 'react';
import { Archive, Sparkles } from 'lucide-react';
import { Business, Player, Script, Universe } from '../../../../types';
import { buildUniverseRoster, getUniverseDashboardProjects, getUniverseLifecycleRevenueMultiplier, isUniverseRetired, normalizeUniverseForSave, normalizeUniverseMap } from '../../../../services/universeLogic';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { formatCurrency } from '../developmentLabFormatting';
import { UniverseDashboard } from './DevelopmentLabUniverseDashboard';

export interface DevelopmentLabUniverseManagerProps {
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
    onCommission: (script: Script) => void;
}

export const DevelopmentLabUniverseManager: React.FC<DevelopmentLabUniverseManagerProps> = ({ player, studio, onUpdatePlayer, onCommission }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const getSagaLabel = (saga: number) => tr('services.business.universeLifecycle.sagaLabel', { saga });
    const getPhaseLabel = (phase: number) => tr('services.business.universeLifecycle.phaseLabel', { phase });
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null);

    const worldUniverses = normalizeUniverseMap(player.world?.universes || {});
    const studioUniverses = (Object.values(worldUniverses) as Universe[]).filter(u => u.studioId === studio.id);
    const activeStudioUniverses = studioUniverses.filter(u => !isUniverseRetired(u));
    const retiredStudioUniverses = studioUniverses.filter(u => isUniverseRetired(u));
    const inheritedUniverseIds = new Set(studio.studioState?.acquisitionPortfolio?.universeIds || []);
    const getUniverseMarketPower = (u: Universe) => {
        const basePower = (u.brandPower * 0.7 + u.momentum * 0.3);
        return basePower * getUniverseLifecycleRevenueMultiplier(u);
    };

    // Dynamic Market Share Calculation
    const allUniverses = Object.values(worldUniverses) as Universe[];
    const totalPower = allUniverses.reduce((acc, u) => acc + getUniverseMarketPower(u), 0);
    
    const universesWithShare = allUniverses.map(u => ({
        ...u,
        marketShare: totalPower > 0 ? (getUniverseMarketPower(u) / totalPower) * 100 : 0
    })).sort((a, b) => b.marketShare - a.marketShare);

    const handleCreate = () => {
        if (studio.balance < 5000000) return; // Costs $5M to start a universe

        const newUniverseId = name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now();
        const colors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUniverse: any = normalizeUniverseForSave({
            id: newUniverseId,
            name,
            description,
            studioId: studio.id,
            currentPhase: 1,
            currentPhaseName: getPhaseLabel(1),
            saga: 1,
            currentSagaName: getSagaLabel(1),
            momentum: 0,
            brandPower: 0,
            marketShare: 0,
            color: randomColor,
            roster: [],
            slate: [],
            weeksUntilNextPhase: 104
        }, newUniverseId);

        const updatedStudio = { ...studio, balance: studio.balance - 5000000 };
        const updatedPlayer = {
            ...player,
            money: player.money, // player money is separate from studio balance usually
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b),
            world: {
                ...player.world,
                universes: {
                    ...worldUniverses,
                    [newUniverseId]: newUniverse
                }
            }
        };

        onUpdatePlayer(updatedPlayer);
        setIsCreating(false);
        setName('');
        setDescription('');
    };

    if (selectedUniverseId) {
        const universe = worldUniverses[selectedUniverseId];
        if (universe) {
            return <UniverseDashboard universe={universe} player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} onCommission={onCommission} onBack={() => setSelectedUniverseId(null)} />;
        }
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-white">{tr('services.business.universeManager.title')}</h2>
                        <p className="text-xs text-zinc-400 mt-1">{tr('services.business.universeManager.subtitle')}</p>
                    </div>
                    {!isCreating && (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            {tr('services.business.universeManager.startNewUniverse')}
                        </button>
                    )}
                </div>

                {isCreating && (
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{tr('services.business.universeManager.createName')}</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={tr('services.business.universeManager.namePlaceholder')}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{tr('services.business.universeManager.createDescription')}</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={tr('services.business.universeManager.descriptionPlaceholder')}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white h-24 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleCreate}
                                disabled={!name || studio.balance < 5000000}
                                className="flex-1 bg-white text-black py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50"
                            >
                                {tr('services.business.universeManager.registerUniverse', { amount: formatCurrency(5000000) })}
                            </button>
                            <button 
                                onClick={() => setIsCreating(false)}
                                className="px-6 py-3 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700"
                            >
                                {tr('services.business.universeManager.cancel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {inheritedUniverseIds.size > 0 && (
                <div className="flex items-start justify-between gap-4 border-y border-violet-400/20 bg-[linear-gradient(90deg,rgba(139,92,246,0.08),transparent)] px-1 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <Archive size={18} className="mt-0.5 shrink-0 text-violet-300" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Inherited canon</p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">
                                Existing universes stayed with {studio.name}. Their canon, roster, and future projects are managed here.
                            </p>
                        </div>
                    </div>
                    <p className="shrink-0 font-mono text-lg font-black text-white">{inheritedUniverseIds.size}</p>
                </div>
            )}

            {/* Market Share Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">{tr('services.business.universeManager.marketShareBattle')}</h3>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex h-8 w-full rounded-full overflow-hidden mb-6 border border-zinc-800">
                            {universesWithShare.map((u: any) => (
                                <div 
                                    key={u.id}
                                    style={{ 
                                        width: `${u.marketShare}%`,
                                        backgroundColor: u.color 
                                    }}
                                    className="h-full transition-all duration-1000 relative group"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {universesWithShare.map((u: any) => (
                                <div key={u.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
                                        <div>
                                            <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{u.name}</span>
                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                                                {u.studioId === studio.id ? studio.name : u.studioId.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono font-black text-white">{u.marketShare.toFixed(1)}%</div>
                                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{tr('services.business.universeManager.brandPower', { amount: u.brandPower })}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">{tr('services.business.universeManager.yourUniverses')}</h3>
                    {activeStudioUniverses.length === 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <Sparkles size={32} className="text-zinc-700 mb-3" />
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{tr('services.business.universeManager.noActiveUniverses')}</p>
                        </div>
                    ) : (
                        activeStudioUniverses.map((u: any) => {
                            const rosterCount = buildUniverseRoster(
                                u,
                                getUniverseDashboardProjects(player, u.id, player.activeReleases || []),
                                player.name
                            ).filter(character => character.status !== 'RETIRED').length;
                            return (
                            <div 
                                key={u.id} 
                                onClick={() => setSelectedUniverseId(u.id)}
                                className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 space-y-4 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-black text-white uppercase group-hover:text-amber-400 transition-colors">{u.name}</h4>
                                        {inheritedUniverseIds.has(u.id) && (
                                            <p className="mt-1 inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.16em] text-violet-300">
                                                <Archive size={9} /> Acquired canon
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        {u.currentPhaseName || getPhaseLabel(typeof u.currentPhase === 'number' ? u.currentPhase : parseInt(String(u.currentPhase).replace(/\D/g, '')) || 1)}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-zinc-500 uppercase font-bold">{tr('services.business.universeManager.momentum')}</span>
                                        <span className="text-white font-mono">{u.momentum}/100</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${u.momentum}%` }} />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[8px] text-zinc-500 uppercase font-black">{tr('services.business.universeManager.saga')}</p>
                                        <p className="text-xs font-mono text-white">{u.currentSagaName || getSagaLabel(typeof u.saga === 'number' ? u.saga : parseInt(String(u.saga).replace(/\D/g, '')) || 1)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-zinc-500 uppercase font-black">{tr('services.business.universeManager.roster')}</p>
                                        <p className="text-xs font-mono text-white">{tr('services.business.universeManager.rosterCount', { count: rosterCount })}</p>
                                    </div>
                                </div>
                            </div>
                            );
                        })
                    )}

                    {retiredStudioUniverses.length > 0 && (
                        <div className="pt-4 space-y-3">
                            <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest px-2">{tr('services.business.universeManager.legacyArchive')}</h3>
                            {retiredStudioUniverses.map((u: any) => {
                                const canonCount = getUniverseDashboardProjects(player, u.id, player.activeReleases || []).length;
                                const retiredLabel = u.retiredAt ? tr('services.business.universeManager.retiredAt', { age: u.retiredAt.year, week: u.retiredAt.week }) : tr('services.business.universeManager.archived');
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => setSelectedUniverseId(u.id)}
                                        className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4 cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/35 transition-all group"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center shrink-0">
                                                    <Archive size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black text-white uppercase group-hover:text-amber-300 transition-colors truncate">{u.name}</h4>
                                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">{tr('services.business.universeManager.retiredLabel', { retiredLabel })}</p>
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                {tr('services.business.universeManager.legacy')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            {tr('services.business.universeManager.legacyBody')}
                                        </p>
                                        <div className="pt-2 border-t border-amber-500/10 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] text-zinc-500 uppercase font-black">{tr('services.business.universeManager.canon')}</p>
                                                <p className="text-xs font-mono text-white">{tr('services.business.universeManager.projectCount', { count: canonCount })}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-zinc-500 uppercase font-black">{tr('services.business.universeManager.licensing')}</p>
                                                <p className="text-xs font-mono text-amber-300">{tr('services.business.universeManager.legacyRate')}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
