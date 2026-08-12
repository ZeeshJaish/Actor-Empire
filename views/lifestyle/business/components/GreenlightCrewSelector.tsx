import React from 'react';
import { Crown, Users } from 'lucide-react';
import { type Player } from '../../../../types';
import { getDirectorTalent } from '../../../../services/roleLogic';

export interface GreenlightCrewSelectorProps {
    title: string;
    icon: React.ReactNode;
    role: string;
    candidates: any[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    mode: 'HIRE' | 'SELF' | 'IN_HOUSE';
    onModeChange: (mode: 'HIRE' | 'SELF' | 'IN_HOUSE') => void;
    player: Player;
    hiredIds: string[];
    inHouseQuality: number;
    inHouseFame: number;
    inHouseLevel: number;
    returningTalent?: any[];
    onNegotiate?: (talentId: string, returningData: any) => void;
    formatMoney: (value: number) => string;
}

const normalizeCrewReturningRole = (role?: string) => {
    if (!role) return role;
    if (role === 'VFX') return 'VFX_SUPERVISOR';
    return role;
};

export const GreenlightCrewSelector: React.FC<GreenlightCrewSelectorProps> = ({
    title,
    icon,
    role,
    candidates,
    selectedId,
    onSelect,
    mode,
    onModeChange,
    player,
    hiredIds,
    inHouseQuality,
    inHouseFame,
    inHouseLevel,
    returningTalent,
    onNegotiate,
    formatMoney,
}) => {
    const canonicalRole = normalizeCrewReturningRole(role);
    const directorConnections = role === 'DIRECTOR'
        ? (player.relationships || []).flatMap(relationship => {
            if (relationship.relation !== 'Director' && relationship.relation !== 'Connection') return [];
            const npcId = relationship.npcId || relationship.id;
            const candidate = candidates.find(candidateEntry => candidateEntry.id === npcId && candidateEntry.occupation === 'DIRECTOR');
            if (!candidate || (hiredIds.includes(npcId) && npcId !== selectedId)) return [];
            return [{ relationship, candidate }];
        }).filter((entry, index, entries) => (
            entries.findIndex(other => other.candidate.id === entry.candidate.id) === index
        ))
        : [];
    const directorConnectionIds = new Set(directorConnections.map(({ candidate }) => candidate.id));

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">{icon} {title}</h3>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => onModeChange('HIRE')}
                    className={`min-h-11 p-2 rounded-lg border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${mode === 'HIRE' ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}
                >
                    <div className="text-[10px] font-bold uppercase">Hire Talent</div>
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('IN_HOUSE')}
                    disabled={inHouseLevel === 0}
                    className={`min-h-11 p-2 rounded-lg border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                        inHouseLevel === 0 ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' :
                        mode === 'IN_HOUSE' ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                    }`}
                    title={inHouseLevel === 0 ? 'Upgrade department in Facilities to unlock In-House talent' : ''}
                >
                    <div className="text-[10px] font-bold uppercase">In-House</div>
                </button>
                {role === 'DIRECTOR' && (
                    <button
                        type="button"
                        onClick={() => onModeChange('SELF')}
                        className={`min-h-11 p-2 rounded-lg border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${mode === 'SELF' ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}
                    >
                        <div className="text-[10px] font-bold uppercase">Direct Self</div>
                    </button>
                )}
            </div>

            {mode === 'HIRE' && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {directorConnections.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Close Connections</div>
                                <div className="text-[9px] font-bold text-zinc-600 uppercase">{directorConnections.length} available</div>
                            </div>
                            {directorConnections.map(({ relationship: rel, candidate: npc }) => {
                                const salary = npc.salary || 0;
                                const standardSalary = npc.standardSalary || salary;
                                const discount = npc.connectionDiscount || 0;
                                const isSelected = selectedId === npc.id;

                                return (
                                    <button
                                        type="button"
                                        key={rel.id}
                                        onClick={() => onSelect(npc.id)}
                                        className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all duration-300 group relative overflow-hidden ${
                                            isSelected
                                                ? 'bg-purple-900/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                                : 'bg-zinc-900/80 border-purple-900/30 text-zinc-400 hover:bg-zinc-800 hover:border-purple-500/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <img src={rel.image || npc.avatar} alt={npc.name} className="w-10 h-10 rounded-full border border-purple-500/30 object-cover" referrerPolicy="no-referrer" />
                                            <div className="text-left">
                                                <div className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'group-hover:text-white transition-colors'}`}>
                                                    {npc.name}
                                                </div>
                                                <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">
                                                    Trusted connection • {Math.round(rel.closeness)} closeness
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            {discount > 0 && (
                                                <div className="text-[10px] text-zinc-500 line-through">{formatMoney(standardSalary)}</div>
                                            )}
                                            <div className="text-sm font-mono font-bold text-emerald-400">{formatMoney(salary)}</div>
                                            <div className="text-[8px] text-purple-400 uppercase font-bold">
                                                {discount > 0 ? `${Math.round(discount * 100)}% connection deal` : 'Connection offer'}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            <div className="h-px bg-zinc-800 my-4 mx-2"></div>
                        </div>
                    )}

                    {candidates
                        .filter(candidate => (!hiredIds.includes(candidate.id) || candidate.id === selectedId) && !directorConnectionIds.has(candidate.id))
                        .map(candidate => {
                            let salary = candidate.salary;
                            let isReturning = false;
                            let returningData = null;
                            if (returningTalent) {
                                returningData = returningTalent.find(talent => talent.id === candidate.id && talent.role === canonicalRole);
                                if (returningData) {
                                    salary = returningData.newDemand;
                                    isReturning = true;
                                }
                            }

                            if (!salary) {
                                if (role === 'DIRECTOR') {
                                    if (candidate.tier === 'A_LIST') salary = 150_000_000 + Math.random() * 150_000_000;
                                    else if (candidate.tier === 'ESTABLISHED') salary = 50_000_000 + Math.random() * 50_000_000;
                                    else if (candidate.tier === 'RISING') salary = 10_000_000 + Math.random() * 20_000_000;
                                    else salary = 1_000_000 + Math.random() * 4_000_000;
                                } else {
                                    if (candidate.tier === 'A_LIST') salary = 15_000_000;
                                    else if (candidate.tier === 'ESTABLISHED') salary = 5_000_000;
                                    else if (candidate.tier === 'RISING') salary = 1_000_000;
                                    else salary = 250_000;
                                }
                            }

                            let talentDisplay = 'Talent: 50';
                            let fameDisplay = 'Fame: 10';

                            if (candidate.stats) {
                                if ('talent' in candidate.stats) {
                                    talentDisplay = `Talent: ${Math.floor((candidate.stats as any).talent || 0)}`;
                                } else if ('vision' in candidate.stats) {
                                    talentDisplay = `Vision: ${Math.floor((candidate.stats as any).vision || 0)}`;
                                }

                                if ('fame' in candidate.stats) {
                                    fameDisplay = `Fame: ${Math.floor((candidate.stats as any).fame || 0)}`;
                                }
                            }

                            const isSelected = selectedId === candidate.id;

                            return (
                                <button
                                    type="button"
                                    key={candidate.id}
                                    onClick={() => {
                                        if (isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0) return;
                                        onSelect(candidate.id);
                                    }}
                                    className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all duration-300 group relative overflow-hidden ${
                                        isSelected
                                            ? 'bg-zinc-800 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                            : isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0
                                                ? 'bg-red-900/10 border-red-900/30 opacity-50 cursor-not-allowed'
                                                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                                    }`}
                                >
                                    {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent animate-pulse"></div>}

                                    <div className="flex items-center gap-3 relative z-10">
                                        {candidate.avatar && (
                                            <img src={candidate.avatar} alt={candidate.name} className="w-10 h-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                                        )}
                                        <div className="text-left">
                                            <div className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 ${isSelected ? 'text-white' : 'group-hover:text-white transition-colors'}`}>
                                                {candidate.name}
                                                {isReturning && (
                                                    <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                                        Returning
                                                    </span>
                                                )}
                                                {candidate.isHeldForProject && (
                                                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-full border border-emerald-500/25">
                                                        Held
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] opacity-80 flex flex-col gap-1 mt-0.5">
                                                <div className="flex gap-2 items-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                        candidate.tier === 'A_LIST' || candidate.tier === 'LEGEND' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        candidate.tier === 'ESTABLISHED' || candidate.tier === 'PROFESSIONAL' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                        candidate.tier === 'RISING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                        'bg-zinc-700 text-zinc-400 border border-zinc-600'
                                                    }`}>
                                                        {candidate.tier.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-zinc-500 flex gap-2">
                                                        <span className="text-emerald-400">{talentDisplay}</span>
                                                        <span className="text-rose-400">{fameDisplay}</span>
                                                    </span>
                                                </div>
                                                {Array.isArray(candidate.specialties) && candidate.specialties.length > 0 && (
                                                    <p className="text-[9px] text-zinc-500 truncate max-w-[190px]">
                                                        {candidate.specialties.slice(0, 2).join(' · ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <div className={`text-sm font-mono font-bold ${isSelected ? 'text-white' : 'text-emerald-400'}`}>
                                            {isReturning && !returningData?.accepted && returningData?.attemptsLeft > 0 && onNegotiate ? (
                                                <button
                                                    type="button"
                                                    onClick={event => {
                                                        event.stopPropagation();
                                                        onNegotiate(candidate.id, returningData);
                                                    }}
                                                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/40 transition-colors"
                                                >
                                                    Negotiate
                                                </button>
                                            ) : isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0 ? (
                                                <span className="text-red-500 text-xs uppercase tracking-wider">Walked Away</span>
                                            ) : (
                                                `$${(salary / 1_000_000).toFixed(1)}M`
                                            )}
                                        </div>
                                        <div className="text-[9px] opacity-60 uppercase font-bold tracking-wider">Fee</div>
                                    </div>
                                </button>
                            );
                        })}
                </div>
            )}

            {mode === 'IN_HOUSE' && (
                <div className="p-6 bg-emerald-900/10 border border-emerald-500/20 rounded-xl text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
                        <Users size={24} />
                    </div>
                    <div className="text-emerald-400 font-bold text-sm mb-1 uppercase tracking-wider">Studio Staff</div>
                    <div className="text-[10px] font-mono text-zinc-500 flex gap-2 justify-center mb-2">
                        <span className="text-emerald-400">Talent: {inHouseQuality}</span>
                        <span className="text-rose-400">Fame: {inHouseFame}</span>
                    </div>
                    <p className="text-xs text-zinc-400 max-w-[200px] mx-auto leading-relaxed">Reliable, salaried employees. No upfront fee, but average creative output.</p>
                </div>
            )}

            {mode === 'SELF' && (
                <div className="p-6 bg-amber-900/10 border border-amber-500/20 rounded-xl text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-400">
                        <Crown size={24} />
                    </div>
                    <div className="text-amber-400 font-bold text-sm mb-1 uppercase tracking-wider">{player.name}</div>
                    <div className="text-[10px] font-mono text-zinc-500 flex gap-2 justify-center mb-2">
                        <span className="text-emerald-400">Talent: {role === 'DIRECTOR' ? Math.round(getDirectorTalent(player.directorStats || { vision: 0, technical: 0, leadership: 0, style: 0 })) : 50}</span>
                        <span className="text-rose-400">Fame: {player.stats?.fame || 0}</span>
                    </div>
                    <p className="text-xs text-zinc-400 max-w-[200px] mx-auto leading-relaxed">Take the helm yourself. Gain XP and creative control. Free.</p>
                </div>
            )}
        </div>
    );
};
