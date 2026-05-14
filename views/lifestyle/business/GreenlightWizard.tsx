import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Player, BudgetTier, Genre, ProjectDetails, ActiveRelease, Commitment, Business, LocationDetails, NewsItem, XPost, StudioEquipment, CrewMember, Universe, UniverseId } from '../../../types';
import { ArrowLeft, Film, DollarSign, Users, TrendingUp, Calendar, Check, Plus, Star, Award, Zap, Briefcase, LayoutGrid, MapPin, PenTool, Globe, Camera, Clapperboard, ChevronRight, Lock, Building2, BarChart3, ShieldAlert, Crown, LogOut, AlertTriangle, Sparkles, BookOpen, Video, X, Clock, Palette, Lightbulb, Mic, Box, Info, CheckCircle, XCircle, Layers, Loader2 } from 'lucide-react';
import { NPC_DATABASE, getAvailableTalent, calculateProjectFameMultiplier } from '../../../services/npcLogic';
import { calculateCastDepthScore, getDirectorTalent } from '../../../services/roleLogic';
import { buildUniverseRoster, getFallbackCharacterName, getUniverseCharacterKeyAliases, getUniverseDashboardProjects, normalizeUniverseCharacterKey, normalizeUniverseForSave, normalizeUniverseMap } from '../../../services/universeLogic';
import { getEquipmentStageName } from './FacilitiesView';
import { showAd } from '../../../services/adLogic';
import { hasNoAds } from '../../../services/premiumLogic';
import { formatProjectFormatLabel } from '../../../services/genreCatalog';

type ConnectedProjectIntent = 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';

export const formatMoney = (val: number) => {
    if (val >= 1_000_000_000_000) return `${(val/1_000_000_000_000).toFixed(1)}T`;
    if (val >= 1_000_000_000) return `${(val/1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val/1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val/1_000).toFixed(0)}k`;
    return `${val}`;
};

const clampStat = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const returningCrewRoleToStateKey = (role?: string): 'director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx' | null => {
    if (!role) return null;
    if (role === 'DIRECTOR') return 'director';
    if (role === 'CINEMATOGRAPHER') return 'cinematographer';
    if (role === 'COMPOSER') return 'composer';
    if (role === 'LINE_PRODUCER') return 'lineProducer';
    if (role === 'VFX_SUPERVISOR') return 'vfx';
    return null;
};

const normalizeCrewReturningRole = (role?: string) => {
    if (!role) return role;
    if (role === 'VFX') return 'VFX_SUPERVISOR';
    return role;
};

const formatReturningRoleLabel = (role?: string) => {
    if (!role) return 'Talent';
    const labels: Record<string, string> = {
        DIRECTOR: 'Director',
        CINEMATOGRAPHER: 'Cinematographer',
        COMPOSER: 'Composer',
        LINE_PRODUCER: 'Line Producer',
        VFX_SUPERVISOR: 'VFX Supervisor',
        LEAD_ACTOR: 'Lead Actor',
        SUPPORTING_ACTOR: 'Supporting Actor',
    };
    return labels[role] || role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

const getUniversePhaseLabel = (phase?: Universe['currentPhase']) => {
    if (typeof phase === 'number') return `Phase ${phase}`;
    if (typeof phase === 'string') {
        const phaseNumber = phase.match(/(\d+)/)?.[1];
        if (phaseNumber) return `Phase ${phaseNumber}`;
        return phase.replace(/_/g, ' ');
    }
    return 'Phase 1';
};

const toUniverseCharacterId = (universeId: UniverseId | 'NEW' | null, characterName?: string) => {
    const trimmed = characterName?.trim();
    if (!trimmed || !universeId || universeId === 'NEW') return undefined;
    return normalizeUniverseCharacterKey(trimmed);
};

export const GEAR_TIERS: Record<string, { name: string, desc: string, cost: number, quality: number }> = {
    'TIER_1': { name: 'Indie Kit', desc: 'Basic DSLR and mirrorless setup.', cost: 10000, quality: 2 },
    'TIER_2': { name: 'Prosumer Setup', desc: 'Mid-tier professional equipment.', cost: 100000, quality: 5 },
    'TIER_3': { name: 'Standard Industry', desc: 'Industry standard digital cinema gear.', cost: 500000, quality: 8 },
    'TIER_4': { name: 'High-End Premium', desc: 'Custom large-format rigs and lenses.', cost: 2500000, quality: 15 },
    'TIER_5': { name: 'Cutting-Edge', desc: 'Experimental tech and massive setups.', cost: 8500000, quality: 30 }
};

export interface GreenlightWizardProps {
    player: Player;
    studio: Business;
    initialConcept?: any;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onComplete: () => void;
}

const CrewSelector: React.FC<{
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
}> = ({ title, icon, role, candidates, selectedId, onSelect, mode, onModeChange, player, hiredIds, inHouseQuality, inHouseFame, inHouseLevel, returningTalent, onNegotiate }) => {
    const canonicalRole = normalizeCrewReturningRole(role);
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">{icon} {title}</h3>

            {/* Mode Selection */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                    onClick={() => onModeChange('HIRE')}
                    className={`p-2 rounded-lg border text-center transition-all ${mode === 'HIRE' ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}
                >
                    <div className="text-[10px] font-bold uppercase">Hire Talent</div>
                </button>
                <button
                    onClick={() => onModeChange('IN_HOUSE')}
                    disabled={inHouseLevel === 0}
                    className={`p-2 rounded-lg border text-center transition-all ${
                        inHouseLevel === 0 ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' :
                        mode === 'IN_HOUSE' ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                    }`}
                    title={inHouseLevel === 0 ? "Upgrade department in Facilities to unlock In-House talent" : ""}
                >
                    <div className="text-[10px] font-bold uppercase">In-House</div>
                </button>
                {role === 'DIRECTOR' && (
                    <button
                        onClick={() => onModeChange('SELF')}
                        className={`p-2 rounded-lg border text-center transition-all ${mode === 'SELF' ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}
                    >
                        <div className="text-[10px] font-bold uppercase">Direct Self</div>
                    </button>
                )}
            </div>

            {/* Candidates List */}
            {mode === 'HIRE' && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {/* Connections Section */}
                    {role === 'DIRECTOR' && player.relationships.filter(r => r.relation === 'Director' || r.relation === 'Connection').length > 0 && (
                        <div className="space-y-2 mb-4">
                            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest px-2">Network Connections</div>
                            {player.relationships
                                .filter(r => (r.relation === 'Director' || r.relation === 'Connection') && (!hiredIds.includes(r.npcId || r.id) || (r.npcId || r.id) === selectedId))
                                .map(rel => {
                                    const npc = candidates.find(c => c.id === (rel.npcId || rel.id));
                                    if (!npc) return null;

                                    let salary = npc.salary;
                                    if (!salary) {
                                        // Use same logic as below but with discount
                                        if (npc.tier === 'A_LIST') salary = 150000000 + Math.random() * 150000000;
                                        else if (npc.tier === 'ESTABLISHED') salary = 50000000 + Math.random() * 50000000;
                                        else if (npc.tier === 'RISING') salary = 10000000 + Math.random() * 20000000;
                                        else salary = 1000000 + Math.random() * 4000000;
                                    }

                                    let discount = 0;
                                    if (rel.closeness > 50) discount = Math.min(0.6, (rel.closeness - 50) / 100 + 0.1);
                                    salary = Math.floor(salary * (1 - discount));

                                    const isSelected = selectedId === npc.id;

                                    return (
                                        <button
                                            key={rel.id}
                                            onClick={() => onSelect(npc.id)}
                                            className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all duration-300 group relative overflow-hidden ${
                                                isSelected
                                                ? 'bg-purple-900/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                                : 'bg-zinc-900/80 border-purple-900/30 text-zinc-400 hover:bg-zinc-800 hover:border-purple-500/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                <img src={rel.image} alt={rel.name} className="w-10 h-10 rounded-full border border-purple-500/30 object-cover" referrerPolicy="no-referrer" />
                                                <div className="text-left">
                                                    <div className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'group-hover:text-white transition-colors'}`}>
                                                        {rel.name}
                                                    </div>
                                                    <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">
                                                        {rel.relation} • Closeness: {rel.closeness}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right relative z-10">
                                                <div className="text-[10px] text-zinc-500 line-through">{formatMoney(npc.salary || salary / (1-discount))}</div>
                                                <div className="text-sm font-mono font-bold text-emerald-400">{formatMoney(salary)}</div>
                                            </div>
                                        </button>
                                    );
                                })
                            }
                            <div className="h-px bg-zinc-800 my-4 mx-2"></div>
                        </div>
                    )}

                    {candidates
                        .filter(c => !hiredIds.includes(c.id) || c.id === selectedId)
                        .map(c => {
                        // Dynamic Salary Calculation if not present
                        let salary = c.salary;
                        let isReturning = false;
                        let returningData = null;
                        if (returningTalent) {
                            returningData = returningTalent.find(t => t.id === c.id && t.role === canonicalRole);
                            if (returningData) {
                                salary = returningData.newDemand;
                                isReturning = true;
                            }
                        }

                        if (!salary) {
                            if (role === 'DIRECTOR') {
                                // INFLATED DIRECTOR SALARIES (User Request: Max 250-300M)
                                if (c.tier === 'A_LIST') salary = 150000000 + Math.random() * 150000000; // 150M - 300M
                                else if (c.tier === 'ESTABLISHED') salary = 50000000 + Math.random() * 50000000; // 50M - 100M
                                else if (c.tier === 'RISING') salary = 10000000 + Math.random() * 20000000; // 10M - 30M
                                else salary = 1000000 + Math.random() * 4000000; // 1M - 5M (Indie)
                            } else {
                                // Standard Actor Salaries
                                if (c.tier === 'A_LIST') salary = 15000000;
                                else if (c.tier === 'ESTABLISHED') salary = 5000000;
                                else if (c.tier === 'RISING') salary = 1000000;
                                else salary = 250000; // Indie/Unknown
                            }
                        }

                        // Stats Display
                        let talentDisplay = 'Talent: 50';
                        let fameDisplay = 'Fame: 10';

                        if (c.stats) {
                            if ('talent' in c.stats) {
                                talentDisplay = `Talent: ${Math.floor((c.stats as any).talent || 0)}`;
                            } else if ('vision' in c.stats) {
                                talentDisplay = `Vision: ${Math.floor((c.stats as any).vision || 0)}`;
                            }

                            if ('fame' in c.stats) {
                                fameDisplay = `Fame: ${Math.floor((c.stats as any).fame || 0)}`;
                            }
                        }

                        const isSelected = selectedId === c.id;
                        // Check if already hired in another role (for this movie)
                        // Note: We need to pass 'castList' or similar to check availability if we want to block double-hiring
                        // For now, we just rely on the list being filtered before passed here if needed, or visual indicators.

                        return (
                            <button
                                key={c.id}
                                onClick={() => {
                                    if (isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0) return;
                                    onSelect(c.id);
                                }}
                                className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all duration-300 group relative overflow-hidden ${
                                    isSelected
                                    ? 'bg-zinc-800 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                    : isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0
                                        ? 'bg-red-900/10 border-red-900/30 opacity-50 cursor-not-allowed'
                                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                                }`}
                            >
                                {/* Selection Glow Effect */}
                                {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent animate-pulse"></div>}

                                <div className="flex items-center gap-3 relative z-10">
                                    {c.avatar && (
                                        <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                                    )}
                                    <div className="text-left">
                                        <div className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 ${isSelected ? 'text-white' : 'group-hover:text-white transition-colors'}`}>
                                            {c.name}
                                            {isReturning && (
                                                <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                                    Returning
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] opacity-80 flex flex-col gap-1 mt-0.5">
                                            <div className="flex gap-2 items-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    c.tier === 'A_LIST' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    c.tier === 'ESTABLISHED' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                    c.tier === 'RISING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-zinc-700 text-zinc-400 border border-zinc-600'
                                                }`}>
                                                    {c.tier.replace('_', ' ')}
                                                </span>
                                                {/* Explicit Stats Display */}
                                                <span className="text-[9px] font-mono text-zinc-500 flex gap-2">
                                                    <span className="text-emerald-400">{talentDisplay}</span>
                                                    <span className="text-rose-400">{fameDisplay}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right relative z-10">
                                    <div className={`text-sm font-mono font-bold ${isSelected ? 'text-white' : 'text-emerald-400'}`}>
                                        {isReturning && !returningData?.accepted && returningData?.attemptsLeft > 0 && onNegotiate ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onNegotiate(c.id, returningData);
                                                }}
                                                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/40 transition-colors"
                                            >
                                                Negotiate
                                            </button>
                                        ) : isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0 ? (
                                            <span className="text-red-500 text-xs uppercase tracking-wider">Walked Away</span>
                                        ) : (
                                            `$${(salary/1000000).toFixed(1)}M`
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

const LocationSelector: React.FC<{
    selectedIds: string[];
    onSelect: (id: string) => void;
    locations: Record<string, any[]>;
    findLocation: (id: string | null) => any;
}> = ({ selectedIds, onSelect, locations, findLocation }) => {
    const [selectedContinent, setSelectedContinent] = useState<string | null>(null);

    const continents = [
        { id: 'NA', name: 'North America', x: 20, y: 30 },
        { id: 'EU', name: 'Europe', x: 52, y: 25 },
        { id: 'AS', name: 'Asia', x: 75, y: 35 },
        { id: 'SA', name: 'South America', x: 28, y: 65 },
        { id: 'AF', name: 'Africa', x: 52, y: 55 },
        { id: 'OC', name: 'Oceania', x: 85, y: 75 },
    ];

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
            {/* Map View */}
            <div className="bg-[#0077be] border border-zinc-800 rounded-xl overflow-hidden relative h-72 w-full group flex items-center justify-center shadow-2xl">
                {/* 2D Flat Map SVG */}
                <div className="relative w-full h-full bg-[#0077be]/30">
                    <svg viewBox="0 0 1000 500" className="w-full h-full drop-shadow-2xl" style={{ filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.4))' }}>
                        {/* Simplified World Map Paths */}
                        <path d="M150,50 L250,50 L280,150 L200,200 L100,150 Z" fill="#4ade80" opacity="0.4" /> {/* NA */}
                        <path d="M220,220 L280,220 L300,350 L250,450 L200,350 Z" fill="#4ade80" opacity="0.4" /> {/* SA */}
                        <path d="M450,50 L550,50 L550,120 L450,120 Z" fill="#4ade80" opacity="0.4" /> {/* EU */}
                        <path d="M450,150 L580,150 L600,300 L500,400 L420,250 Z" fill="#4ade80" opacity="0.4" /> {/* AF */}
                        <path d="M600,50 L850,50 L900,200 L750,250 L600,150 Z" fill="#4ade80" opacity="0.4" /> {/* AS */}
                        <path d="M750,300 L900,300 L900,450 L750,450 Z" fill="#4ade80" opacity="0.4" /> {/* OC */}

                        {/* Location Dots */}
                        {Object.entries(locations).map(([continent, locs]) => (
                            (locs as any[]).map(loc => {
                                const isSelected = selectedIds.includes(loc.id);
                                return (
                                    <g key={loc.id} className="cursor-pointer group/loc" onClick={() => { onSelect(loc.id); setSelectedContinent(continent); }}>
                                        <circle
                                            cx={loc.x * 10}
                                            cy={loc.y * 5}
                                            r={isSelected ? 8 : 4}
                                            fill={isSelected ? '#fbbf24' : '#ffffff'}
                                            className="transition-all duration-300 group-hover/loc:r-10"
                                        />
                                        {isSelected && (
                                            <circle
                                                cx={loc.x * 10}
                                                cy={loc.y * 5}
                                                r={12}
                                                fill="none"
                                                stroke="#fbbf24"
                                                strokeWidth="2"
                                                className="animate-ping"
                                            />
                                        )}
                                        <text
                                            x={loc.x * 10}
                                            y={loc.y * 5 - 12}
                                            textAnchor="middle"
                                            className={`text-[10px] font-bold fill-white pointer-events-none transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/loc:opacity-100'}`}
                                            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                                        >
                                            {loc.name}
                                        </text>
                                    </g>
                                );
                            })
                        ))}
                    </svg>

                    {/* Continent Labels (Overlay) */}
                    {continents.map(c => (
                        <button
                            key={c.id}
                            className={`absolute px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all duration-300 z-10 ${
                                selectedContinent === c.id
                                ? 'bg-amber-500 text-black scale-110 shadow-lg'
                                : 'bg-black/40 text-white/60 hover:bg-black/60 hover:text-white'
                            }`}
                            style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContinent(c.id);
                            }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black text-white flex items-center gap-2 shadow-xl">
                    <Globe size={14} className="text-emerald-400 animate-pulse" />
                    <span className="tracking-widest">GLOBAL PRODUCTION NETWORK</span>
                </div>

                {selectedIds.length > 0 && (
                    <div className="absolute bottom-4 right-4 bg-emerald-500 text-black px-4 py-2 rounded-xl text-[10px] font-black shadow-2xl animate-in fade-in slide-in-from-right-4">
                        SELECTED: {selectedIds.length} LOCATIONS
                    </div>
                )}
            </div>

            {/* Location List for Selected Continent */}
            {selectedContinent && (
                <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-bottom-4 pb-28">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Sites in {continents.find(c => c.id === selectedContinent)?.name}
                    </div>
                    {(locations[selectedContinent] || []).map(loc => {
                        const isSelected = selectedIds.includes(loc.id);
                        return (
                        <button
                            key={loc.id}
                            onClick={() => onSelect(loc.id)}
                            className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                                isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 text-white'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                        >
                            <div>
                                <div className="text-sm font-bold uppercase flex items-center gap-2">
                                    {loc.name}
                                    {isSelected && <Check size={14} className="text-emerald-500" />}
                                </div>
                                <div className="text-[10px] opacity-70 mt-0.5">{loc.desc}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-bold ${loc.cost > 1000000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    +{formatMoney(loc.cost)}
                                </div>
                                <div className="text-[10px] font-mono text-amber-500">
                                    +{loc.quality} Qual
                                </div>
                            </div>
                        </button>
                    );
                    })}
                </div>
            )}
        </div>
    );
};

export const GreenlightWizard: React.FC<GreenlightWizardProps> = ({ player, studio, initialConcept, onBack, onUpdatePlayer, onComplete }) => {
    const [selectedScriptId, setSelectedScriptId] = useState<string | null>(initialConcept?.scriptId || null);
    const [step, setStep] = useState<'SELECT_SCRIPT' | 'DIRECTOR' | 'CAST' | 'CREW' | 'EQUIPMENT' | 'LOCATION' | 'TONE' | 'CONFIRM' | 'BUZZ'>(initialConcept?.lastStep || (initialConcept ? 'DIRECTOR' : 'SELECT_SCRIPT'));
    const isInternallyControlledTalent = (id?: string | null) => id === 'PLAYER_SELF' || id === 'STUDIO_STAFF';

    // Setup State
    const [tone, setTone] = useState(initialConcept?.tone || 50); // 0 = Practical, 100 = CGI
    const [visualStyle, setVisualStyle] = useState<'REALISTIC' | 'STYLISTIC' | 'GRITTY' | 'VIBRANT'>('REALISTIC');
    const [pacing, setPacing] = useState<'SLOW' | 'MODERATE' | 'FAST' | 'FRENETIC'>('MODERATE');

    // Crew State
    const [crewModes, setCrewModes] = useState<Record<string, 'HIRE' | 'SELF' | 'IN_HOUSE'>>(initialConcept?.crewModes || {
        director: 'HIRE',
        cinematographer: 'HIRE',
        composer: 'HIRE',
        lineProducer: 'HIRE',
        vfx: 'HIRE'
    });
    const [selectedCrew, setSelectedCrew] = useState<Record<string, string | null>>(initialConcept?.selectedCrew || {
        director: null,
        cinematographer: null,
        composer: null,
        lineProducer: null,
        vfx: null
    });

    // Cast State
    const [castList, setCastList] = useState<{
        id: string,
        role: string,
        roleType: 'LEAD' | 'SUPPORTING' | 'CAMEO' | 'EXTRA',
        actorId: string | null,
        actorName?: string,
        salary?: number,
        characterId?: string,
        characterName?: string,
        sourceUniverseId?: UniverseId
    }[]>(initialConcept?.castList || [
        { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null },
        { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null }
    ]);

    const [selectedLocations, setSelectedLocations] = useState<string[]>(initialConcept?.selectedLocations || []);
    const [selectedUniverseId, setSelectedUniverseId] = useState<UniverseId | 'NEW' | null>(initialConcept?.universeId || null);
    const [newUniverseName, setNewUniverseName] = useState<string>("");
    const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | 'NEW' | null>(initialConcept?.franchiseId || null);
    const [previousInstallmentCost, setPreviousInstallmentCost] = useState<number | null>(null);
    const [connectedProjectIntent, setConnectedProjectIntent] = useState<ConnectedProjectIntent>(initialConcept?.connectedProjectIntent || 'AUTO');
    const [showStoryConnectionInfo, setShowStoryConnectionInfo] = useState(false);
    const [showCharacterFlowInfo, setShowCharacterFlowInfo] = useState(false);

    // Equipment State
    const [equipmentChoices, setEquipmentChoices] = useState<Record<string, string>>(initialConcept?.equipmentChoices || {
        cameras: 'TIER_3',
        lighting: 'TIER_3',
        sound: 'TIER_3',
        practicalEffects: 'TIER_3'
    });

    const contractedTalentIds = useMemo(() => {
        const roster = [
            ...((player.studio?.talentRoster as any[]) || []),
            ...((studio.studioState?.talentRoster as any[]) || [])
        ];
        return new Set(
            roster
                .filter(contract => contract?.status === 'ACTIVE' && contract?.type === 'MOVIE_DEAL' && (contract?.moviesRemaining ?? 0) > 0 && contract?.npcId)
                .map(contract => contract.npcId)
        );
    }, [player.studio?.talentRoster, studio.studioState?.talentRoster]);

    const getReturningTalentKey = (talent: any) => [
        talent?.role || 'UNKNOWN_ROLE',
        talent?.id || 'UNKNOWN_TALENT',
        talent?.characterId || talent?.characterName || ''
    ].join(':');

    const dedupeReturningTalent = (talentList: any[] = []) => {
        const byKey = new Map<string, any>();
        talentList.forEach((talent: any) => {
            if (!talent?.id || !talent?.role) return;
            const key = getReturningTalentKey(talent);
            const existing = byKey.get(key);
            if (!existing) {
                byKey.set(key, talent);
                return;
            }

            // Preserve the most progressed negotiation state if duplicate sources collide.
            byKey.set(key, {
                ...existing,
                ...talent,
                accepted: !!existing.accepted || !!talent.accepted,
                negotiated: !!existing.negotiated || !!talent.negotiated,
                attemptsLeft: Math.min(
                    typeof existing.attemptsLeft === 'number' ? existing.attemptsLeft : 3,
                    typeof talent.attemptsLeft === 'number' ? talent.attemptsLeft : 3
                ),
                newDemand: Math.max(Number(existing.newDemand || 0), Number(talent.newDemand || 0)),
                originalSalary: Math.max(Number(existing.originalSalary || 0), Number(talent.originalSalary || 0))
            });
        });
        return Array.from(byKey.values());
    };

    const normalizeReturningTalentEntries = (script: any) => {
        if (!script?.returningTalent || !Array.isArray(script.returningTalent)) return script;
        return {
            ...script,
            returningTalent: dedupeReturningTalent(script.returningTalent.map((talent: any) => {
                const isContractedReturningActor = talent && talent.role !== 'DIRECTOR' && contractedTalentIds.has(talent.id);
                const isInternalReturnee = isInternallyControlledTalent(talent?.id);
                return {
                    ...talent,
                    attemptsLeft: isInternalReturnee ? 0 : (typeof talent?.attemptsLeft === 'number' ? talent.attemptsLeft : 3),
                    accepted: isContractedReturningActor || isInternalReturnee ? true : !!talent?.accepted,
                    negotiated: isInternalReturnee ? true : !!talent?.negotiated
                };
            }))
        };
    };

    // Save Draft Helper
    const saveDraft = () => {
        if (!selectedScriptId) return;

        const existingConcept = studio.studioState?.concepts?.find(c => c.scriptId === selectedScriptId);

        const draft: any = { // Use ProjectConcept type if imported, else any
            id: initialConcept?.id || existingConcept?.id || `concept_${selectedScriptId}`, // Deterministic ID per script
            scriptId: selectedScriptId,
            lastUpdated: Date.now(),
            crewModes,
            selectedCrew,
            castList,
            selectedLocations,
            equipmentChoices,
            tone,
            visualStyle,
            pacing,
            universeId: selectedUniverseId,
            lockedStreamingFunding: selectedScript?.lockedStreamingFunding || initialConcept?.lockedStreamingFunding,
            newUniverseName: selectedUniverseId === 'NEW' ? newUniverseName : undefined,
            franchiseId: selectedFranchiseId,
            connectedProjectIntent,
            lastStep: step
        };

        const updatedStudio = { ...studio };
        if (!updatedStudio.studioState) updatedStudio.studioState = { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 };
        else updatedStudio.studioState = { ...updatedStudio.studioState }; // Shallow copy to trigger re-render

        if (!updatedStudio.studioState.concepts) updatedStudio.studioState.concepts = [];
        else updatedStudio.studioState.concepts = [...updatedStudio.studioState.concepts];

        const existingIndex = updatedStudio.studioState.concepts.findIndex(c => c.id === draft.id);
        if (existingIndex >= 0) {
            updatedStudio.studioState.concepts[existingIndex] = draft;
        } else {
            updatedStudio.studioState.concepts.push(draft);
        }

        // Also ensure the script is saved if returningTalent was modified
        if (selectedScript) {
            if (!updatedStudio.studioState.scripts) updatedStudio.studioState.scripts = [];
            else updatedStudio.studioState.scripts = [...updatedStudio.studioState.scripts];

            const scriptIndex = updatedStudio.studioState.scripts.findIndex(s => s.id === selectedScript.id);
            if (scriptIndex >= 0) {
                updatedStudio.studioState.scripts[scriptIndex] = { ...selectedScript, returningTalent: dedupeReturningTalent(currentReturningTalent) };
            }
        }

        // Update player
        const updatedPlayer = { ...player };
        updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer(updatedPlayer);
    };

    // Auto-save when leaving (Back button)
    const handleBack = () => {
        if (selectedScriptId) saveDraft();
        onBack();
    };

    const conceptByScriptId = useMemo(() => {
        const map = new Map<string, any>();
        (studio.studioState?.concepts || []).forEach((concept: any) => {
            if (concept?.scriptId) {
                map.set(concept.scriptId, concept);
            }
        });
        return map;
    }, [studio.studioState?.concepts]);

    // Filter scripts that are already in active concepts (unless it's the current one being edited)
    const scripts = useMemo(() => {
        const existingConceptScriptIds = new Set((studio.studioState?.concepts || []).map((c: any) => c.scriptId));
        return (studio.studioState?.scripts || [])
            .map(script => normalizeReturningTalentEntries(script))
            .filter((s: any) => {
                if (s.status !== 'READY') return false;
                const hasExistingConcept = existingConceptScriptIds.has(s.id);
                const isResumableScript = s.sourceMaterial === 'SEQUEL' || s.sourceMaterial === 'SPINOFF';
                return !hasExistingConcept || isResumableScript || s.id === initialConcept?.scriptId || s.id === selectedScriptId;
            });
    }, [studio.studioState?.scripts, studio.studioState?.concepts, initialConcept?.scriptId, selectedScriptId, contractedTalentIds]);

    const selectedScript = useMemo(() => {
        return scripts.find(s => s.id === selectedScriptId)
            || (selectedScriptId ? normalizeReturningTalentEntries(studio.studioState?.scripts?.find(s => s.id === selectedScriptId)) : null)
            || (initialConcept ? normalizeReturningTalentEntries(studio.studioState?.scripts?.find(s => s.id === initialConcept.scriptId)) : null);
    }, [scripts, selectedScriptId, studio.studioState?.scripts, initialConcept?.scriptId, contractedTalentIds]);

    const lockedStreamingFunding = useMemo(() => {
        return selectedScript?.lockedStreamingFunding || initialConcept?.lockedStreamingFunding || null;
    }, [selectedScript?.lockedStreamingFunding, initialConcept?.lockedStreamingFunding]);

    const lockedStreamingFundingAmount = useMemo(() => {
        return Math.max(0, Math.floor(Number(lockedStreamingFunding?.amount || 0)));
    }, [lockedStreamingFunding?.amount]);

    const [currentReturningTalent, setCurrentReturningTalent] = useState<any[]>([]);

    useEffect(() => {
        setCurrentReturningTalent(dedupeReturningTalent(selectedScript?.returningTalent || []));
    }, [selectedScript?.id, selectedScript?.returningTalent]);

    const activeUniverseId = useMemo(() => {
        const id = selectedUniverseId || selectedScript?.universeId || null;
        return id && id !== 'NEW' ? id as UniverseId : null;
    }, [selectedUniverseId, selectedScript?.universeId]);

    const universeCharacterOptions = useMemo(() => {
        if (!activeUniverseId) return [];
        const universe = normalizeUniverseMap(player.world?.universes || {})[activeUniverseId];
        if (!universe) return [];
        const projects = getUniverseDashboardProjects(player, activeUniverseId, player.activeReleases || []);
        return buildUniverseRoster(universe, projects, player.name)
            .filter(character => character.status !== 'RETIRED')
            .map(character => ({
                ...character,
                normalizedId: toUniverseCharacterId(activeUniverseId, character.name) || character.characterId || character.id
            }));
    }, [activeUniverseId, player]);

    const isKnownConnectedRole = (role: { characterId?: string; characterName?: string; sourceUniverseId?: UniverseId }) => {
        if (role.sourceUniverseId) return true;
        const roleKey = normalizeUniverseCharacterKey(role.characterId || role.characterName || '');
        if (!roleKey) return false;
        return linkedCharacterOptions.some(character => {
            if (character.sourceUniverseId) {
                return getUniverseCharacterKeyAliases(character.sourceUniverseId, character.characterId || character.id, character.name)
                    .includes(roleKey);
            }
            return normalizeUniverseCharacterKey(character.characterId || character.id || character.name) === roleKey;
        });
    };

    const getDefaultCharacterName = (role: any, index: number) => {
        const projectTitle = selectedScript?.title || 'Project';
        return getFallbackCharacterName(
            {
                ...role,
                roleName: role.role,
                characterName: role.characterName
            },
            projectTitle,
            index
        );
    };

    // Identify studio franchises (for selection)
    const studioFranchises = useMemo(() => {
        const studioProjects = [
            ...player.pastProjects.filter(p => p.studioId === studio.id),
            ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({ ...r.projectDetails, id: r.id }))
        ];

        const establishedFranchiseIds = new Set<string>();
        studioProjects.forEach(p => {
            if (p.franchiseId) establishedFranchiseIds.add(p.franchiseId);
            if (studioProjects.some(other => other.franchiseId === p.id)) {
                establishedFranchiseIds.add(p.id);
            }
        });

        const franchisesMap = new Map<string, any[]>();
        studioProjects.forEach(p => {
            const fid = p.franchiseId || p.id;
            if (establishedFranchiseIds.has(fid)) {
                if (!franchisesMap.has(fid)) franchisesMap.set(fid, []);
                franchisesMap.get(fid)!.push(p);
            }
        });

        return Array.from(franchisesMap.entries()).map(([id, projects]) => {
            const sorted = [...projects].sort((a, b) => (a.installmentNumber || 1) - (b.installmentNumber || 1));
            const root = sorted[0];
            return {
                id,
                name: root.name || root.title,
                lastInstallment: sorted[sorted.length - 1].installmentNumber || 1,
                genre: root.genre,
                projects: sorted
            };
        });
    }, [player.pastProjects, player.activeReleases, studio.id]);

    const previousFranchiseInstallments = useMemo(() => {
        if (!selectedScript?.franchiseId) return [];
        const franchiseId = selectedScript.franchiseId;
        return [
            ...(player.pastProjects || []),
            ...(player.activeReleases || [])
        ]
            .filter((project: any) => {
                const details = project.projectDetails || project;
                return project.franchiseId === franchiseId
                    || details.franchiseId === franchiseId
                    || project.id === franchiseId
                    || details.id === franchiseId;
            })
            .sort((a: any, b: any) => {
                const aDetails = a.projectDetails || a;
                const bDetails = b.projectDetails || b;
                return (bDetails.installmentNumber || b.installmentNumber || 0) - (aDetails.installmentNumber || a.installmentNumber || 0)
                    || (b.year || b.releaseYear || 0) - (a.year || a.releaseYear || 0);
            });
    }, [selectedScript?.franchiseId, player.pastProjects, player.activeReleases]);

    const previousCharacterOptions = useMemo(() => {
        if (!selectedScript?.franchiseId || previousFranchiseInstallments.length === 0) return [];
        const sourceName = studioFranchises.find(franchise => franchise.id === selectedScript.franchiseId)?.name || selectedScript.title || 'Previous Movie';
        const seen = new Set<string>();
        const options: any[] = [];

        previousFranchiseInstallments.forEach((project: any) => {
            const details = project.projectDetails || project;
            (details.castList || []).forEach((member: any, index: number) => {
                if (!member || String(member.roleType || 'SUPPORTING') === 'EXTRA') return;
                const name = member.characterName || member.roleName || member.role || (index === 0 ? details.name || details.title || project.name : `${details.name || details.title || project.name} Role ${index + 1}`);
                const characterId = member.characterId || normalizeUniverseCharacterKey(name);
                const key = `${member.sourceUniverseId || selectedScript.franchiseId}:${normalizeUniverseCharacterKey(characterId || name)}`;
                if (seen.has(key)) return;
                seen.add(key);
                options.push({
                    id: characterId,
                    characterId,
                    name,
                    actorId: member.actorId || 'UNKNOWN',
                    actorName: member.actorName || member.name || 'Actor open',
                    status: 'ACTIVE',
                    fanApproval: 62,
                    roleType: member.roleType,
                    appearances: 1,
                    latestAppearanceTitle: details.name || details.title || project.name,
                    sourceName,
                    sourceType: 'FRANCHISE',
                    sourceFranchiseId: selectedScript.franchiseId,
                    sourceUniverseId: member.sourceUniverseId
                });
            });
        });

        return options;
    }, [previousFranchiseInstallments, selectedScript?.franchiseId, selectedScript?.title, studioFranchises]);

    const allowsOutsideConnectedCharacters = useMemo(() => {
        const intent = connectedProjectIntent !== 'AUTO' ? connectedProjectIntent : selectedScript?.connectedProjectIntent;
        return intent === 'CROSSOVER' || intent === 'EVENT' || selectedScript?.tags?.includes('UNIVERSE_EVENT');
    }, [connectedProjectIntent, selectedScript?.connectedProjectIntent, selectedScript?.tags]);

    const linkedCharacterOptions = useMemo(() => {
        const options: any[] = [...previousCharacterOptions];
        const seen = new Set<string>();
        previousCharacterOptions.forEach(character => {
            seen.add(`${character.sourceUniverseId || character.sourceFranchiseId || 'LOCAL'}:${normalizeUniverseCharacterKey(character.characterId || character.name)}`);
        });
        const normalizedUniverses = normalizeUniverseMap(player.world?.universes || {});

        Object.values(normalizedUniverses)
            .filter((universe) => universe.studioId === studio.id && (universe.id === activeUniverseId || allowsOutsideConnectedCharacters))
            .forEach((universe) => {
                const projects = getUniverseDashboardProjects(player, universe.id, player.activeReleases || []);
                buildUniverseRoster(universe, projects, player.name)
                    .filter(character => character.status !== 'RETIRED')
                    .forEach(character => {
                        const characterId = character.characterId || character.id || normalizeUniverseCharacterKey(character.name);
                        const key = `${universe.id}:${characterId}`;
                        if (seen.has(key)) return;
                        seen.add(key);
                        options.push({
                            ...character,
                            characterId,
                            sourceUniverseId: universe.id,
                            sourceName: universe.name,
                            sourceType: 'UNIVERSE'
                        });
                    });
            });

        if (selectedFranchiseId && selectedFranchiseId !== 'NEW' && previousCharacterOptions.length === 0) {
            const franchise = studioFranchises.find(f => f.id === selectedFranchiseId);
            franchise?.projects?.forEach((project: any) => {
                (project.castList || []).forEach((member: any, index: number) => {
                    if (!member || String(member.roleType || 'SUPPORTING') === 'EXTRA') return;
                    const name = member.characterName || member.roleName || member.role || (index === 0 ? project.name : `${project.name} Role ${index + 1}`);
                    const characterId = member.characterId || normalizeUniverseCharacterKey(name);
                    const key = `FRANCHISE:${selectedFranchiseId}:${characterId}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    options.push({
                        id: characterId,
                        characterId,
                        name,
                        actorId: member.actorId || 'UNKNOWN',
                        actorName: member.name || member.actorName || 'Unknown Actor',
                        status: 'ACTIVE',
                        fanApproval: 55,
                        roleType: member.roleType,
                        appearances: 1,
                        latestAppearanceTitle: project.name,
                        sourceName: franchise.name,
                        sourceType: 'FRANCHISE'
                    });
                });
            });
        }

        const projectIsConnected = previousCharacterOptions.length > 0 || !!activeUniverseId || !!selectedFranchiseId || !!selectedScript?.universeId || !!selectedScript?.franchiseId || allowsOutsideConnectedCharacters;
        return projectIsConnected
            ? options.sort((a, b) => {
                const aPrevious = a.sourceType === 'FRANCHISE' && a.sourceFranchiseId === selectedScript?.franchiseId ? 0 : 1;
                const bPrevious = b.sourceType === 'FRANCHISE' && b.sourceFranchiseId === selectedScript?.franchiseId ? 0 : 1;
                if (aPrevious !== bPrevious) return aPrevious - bPrevious;
                const aSameUniverse = activeUniverseId && a.sourceUniverseId === activeUniverseId ? 0 : 1;
                const bSameUniverse = activeUniverseId && b.sourceUniverseId === activeUniverseId ? 0 : 1;
                if (aSameUniverse !== bSameUniverse) return aSameUniverse - bSameUniverse;
                return String(a.name).localeCompare(String(b.name));
            })
            : [];
    }, [activeUniverseId, player, selectedFranchiseId, selectedScript?.universeId, selectedScript?.franchiseId, studio.id, studioFranchises, previousCharacterOptions, allowsOutsideConnectedCharacters]);

    const getCharacterOptionValue = (character: any) => {
        const characterKey = normalizeUniverseCharacterKey(character.characterId || character.id || character.name || '');
        if (character.sourceUniverseId) return `UNIVERSE:${character.sourceUniverseId}:${characterKey}`;
        return `${character.sourceType || 'FRANCHISE'}:${character.sourceFranchiseId || selectedFranchiseId || selectedScript?.franchiseId || 'franchise'}:${characterKey}`;
    };

    const getRoleCharacterOption = (role: { characterId?: string; characterName?: string; sourceUniverseId?: UniverseId }) => {
        const roleKey = normalizeUniverseCharacterKey(role.characterId || role.characterName || '');
        if (!roleKey) return null;
        return linkedCharacterOptions.find(character => {
            if (role.sourceUniverseId || character.sourceUniverseId) {
                if (role.sourceUniverseId && character.sourceUniverseId && role.sourceUniverseId !== character.sourceUniverseId) return false;
                return getUniverseCharacterKeyAliases(character.sourceUniverseId || role.sourceUniverseId, character.characterId || character.id, character.name)
                    .includes(roleKey);
            }
            return normalizeUniverseCharacterKey(character.characterId || character.id || character.name) === roleKey;
        }) || null;
    };

    const getRoleCharacterOptionValue = (role: { characterId?: string; characterName?: string; sourceUniverseId?: UniverseId }) => {
        const option = getRoleCharacterOption(role);
        return option ? getCharacterOptionValue(option) : '';
    };

    const studioPrestigeScore = useMemo(() => {
        const studioProjects = [
            ...player.pastProjects.filter(p => p.studioId === studio.id),
            ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({
                rating: r.imdbRating,
                gross: r.totalGross + (r.streamingRevenue || 0),
                awards: [],
            }))
        ];
        if (studioProjects.length === 0) return 0;
        const avgRating = studioProjects.reduce((sum, project: any) => sum + (project.rating || project.imdbRating || 0), 0) / studioProjects.length;
        const awardsWon = studioProjects.reduce((sum, project: any) => sum + (project.awards?.filter((award: any) => award.outcome === 'WON').length || 0), 0);
        const hitBonus = studioProjects.filter((project: any) => (project.gross || project.boxOffice || 0) > 200_000_000).length * 1.2;
        return Math.min(100, Math.round((avgRating * 6) + (awardsWon * 2.5) + (studioProjects.length * 0.8) + hitBonus));
    }, [player.pastProjects, player.activeReleases, studio.id]);

    // Track previous installment cost for comparison
    useEffect(() => {
        if (selectedScript?.franchiseId) {
            if (previousFranchiseInstallments.length > 0) {
                const lastInstallment = previousFranchiseInstallments[0];
                const details = lastInstallment.projectDetails || lastInstallment;
                setPreviousInstallmentCost(details.budget || details.estimatedBudget || lastInstallment.budget || null);
            } else {
                setPreviousInstallmentCost(null);
            }
        } else {
            setPreviousInstallmentCost(null);
        }
    }, [selectedScript?.id, selectedScript?.franchiseId, previousFranchiseInstallments]);

    // Reset state when script changes
    useEffect(() => {
        if (selectedScriptId && (!initialConcept || selectedScriptId !== initialConcept.scriptId)) {
            const existingConcept = conceptByScriptId.get(selectedScriptId);
            if (existingConcept) {
                setCrewModes(existingConcept.crewModes || {
                    director: 'HIRE',
                    cinematographer: 'HIRE',
                    composer: 'HIRE',
                    lineProducer: 'HIRE',
                    vfx: 'HIRE'
                });
                setSelectedCrew(existingConcept.selectedCrew || {
                    director: null,
                    cinematographer: null,
                    composer: null,
                    lineProducer: null,
                    vfx: null
                });
                setCastList(existingConcept.castList || [
                    { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null },
                    { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null }
                ]);
                setSelectedLocations(existingConcept.selectedLocations || []);
                setEquipmentChoices(existingConcept.equipmentChoices || {
                    cameras: 'TIER_3',
                    lighting: 'TIER_3',
                    sound: 'TIER_3',
                    practicalEffects: 'TIER_3'
                });
                setSelectedUniverseId(existingConcept.universeId || selectedScript?.universeId || null);
                setNewUniverseName(existingConcept.newUniverseName || "");
                setSelectedFranchiseId(existingConcept.franchiseId || selectedScript?.franchiseId || null);
                setConnectedProjectIntent(existingConcept.connectedProjectIntent || selectedScript?.connectedProjectIntent || (selectedScript?.tags?.includes('UNIVERSE_EVENT') ? 'EVENT' : selectedScript?.tags?.includes('REBOOT') ? 'REBOOT' : 'AUTO'));
                setTone(existingConcept.tone ?? 50);
                setVisualStyle(existingConcept.visualStyle || 'REALISTIC');
                setPacing(existingConcept.pacing || 'MODERATE');
            } else {
                // Reset to default
                setCrewModes({
                    director: 'HIRE',
                    cinematographer: 'HIRE',
                    composer: 'HIRE',
                    lineProducer: 'HIRE',
                    vfx: 'HIRE'
                });
                setSelectedCrew({
                    director: null,
                    cinematographer: null,
                    composer: null,
                    lineProducer: null,
                    vfx: null
                });
                setCastList([
                    { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null },
                    { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null }
                ]);
                setSelectedLocations([]);
                setEquipmentChoices({
                    cameras: 'TIER_3',
                    lighting: 'TIER_3',
                    sound: 'TIER_3',
                    practicalEffects: 'TIER_3'
                });
                setSelectedUniverseId(selectedScript?.universeId || null);
                setNewUniverseName("");
                setSelectedFranchiseId(selectedScript?.franchiseId || null);
                setConnectedProjectIntent(selectedScript?.connectedProjectIntent || (selectedScript?.tags?.includes('UNIVERSE_EVENT') ? 'EVENT' : selectedScript?.tags?.includes('REBOOT') ? 'REBOOT' : 'AUTO'));
                setTone(50);
                setVisualStyle('REALISTIC');
                setPacing('MODERATE');
            }
        }
    }, [selectedScriptId, conceptByScriptId, initialConcept?.scriptId]);

    // Pre-fill sequel cast and crew
    useEffect(() => {
        if (selectedScript?.franchiseId && previousFranchiseInstallments.length > 0) {
            let directorToSet = selectedCrew.director;
            let directorModeToSet = crewModes.director;

            // Check if we need to pre-fill (no director selected yet)
            if (!directorToSet) {
                // 1. Check returning talent list in the script itself (most direct source)
                const returningDirector = currentReturningTalent.find(t => t.role === 'DIRECTOR');
                if (returningDirector) {
                    directorToSet = returningDirector.id;
                    directorModeToSet = returningDirector.id === 'PLAYER_SELF' ? 'SELF' : (returningDirector.id === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                }
            }

            // Find the most recent installment of this franchise to pre-fill other details
            if (previousFranchiseInstallments.length > 0) {
                const lastInstallment = previousFranchiseInstallments[0];
                const details = lastInstallment.projectDetails || lastInstallment;

                // Pre-fill director if not already set by returningTalent logic above
                if (details.directorId && !directorToSet) {
                    directorToSet = details.directorId!;
                    directorModeToSet = details.directorId === 'PLAYER_SELF' ? 'SELF' : (details.directorId === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                }

                if (details.directorId) {
                    const directorSalary = details.crewList?.find((crew: any) => crew.role === 'DIRECTOR')?.salary || details.directorSalary || Math.max(100_000, Math.floor((details.budget || lastInstallment.budget || 5_000_000) * 0.05));
                    setCurrentReturningTalent(prev => {
                        const merged = [...(selectedScript.returningTalent || []), ...prev];
                        if (merged.some((talent: any) => talent.id === details.directorId && talent.role === 'DIRECTOR')) {
                            return dedupeReturningTalent(merged);
                        }
                        return dedupeReturningTalent([
                            ...merged,
                            {
                                role: 'DIRECTOR',
                                id: details.directorId,
                                name: details.directorName || 'Returning Director',
                                originalSalary: directorSalary,
                                newDemand: Math.floor(directorSalary * 1.2),
                                negotiated: isInternallyControlledTalent(details.directorId),
                                accepted: isInternallyControlledTalent(details.directorId),
                                attemptsLeft: isInternallyControlledTalent(details.directorId) ? 0 : 3
                            }
                        ]);
                    });
                }

                // Apply director changes if any
                if (directorToSet !== selectedCrew.director) {
                    setSelectedCrew(prev => ({ ...prev, director: directorToSet }));
                    setCrewModes(prev => ({ ...prev, director: directorModeToSet }));
                }

                // Pre-fill other crew
                if (details.crewList && details.crewList.length > 0 && !selectedCrew.cinematographer) {
                    const newSelectedCrew = { ...selectedCrew, director: directorToSet };
                    const newCrewModes = { ...crewModes, director: directorModeToSet };
                    details.crewList.forEach((c: any) => {
                        const roleKey = c.role.toLowerCase();
                        if (roleKey === 'cinematographer' || roleKey === 'composer' || roleKey === 'line_producer' || roleKey === 'vfx_supervisor') {
                            const stateKey = roleKey === 'line_producer' ? 'lineProducer' : (roleKey === 'vfx_supervisor' ? 'vfx' : roleKey);
                            if (!newSelectedCrew[stateKey]) {
                                newSelectedCrew[stateKey] = c.id;
                                newCrewModes[stateKey] = c.id === 'PLAYER_SELF' ? 'SELF' : (c.id === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                            }
                        }
                    });
                    setSelectedCrew(newSelectedCrew);
                    setCrewModes(newCrewModes);
                }

                // Pre-fill cast (only if castList is still default)
                const isCastDefault = castList.length === 2 && castList.every(c => !c.actorId);
                if (details.castList && details.castList.length > 0 && isCastDefault) {
                    const returningBase = selectedScript.returningTalent || currentReturningTalent || [];
                    const newCastList = details.castList.map((c: any) => {
                        let salary = c.salary || 0;
                        // Check if this actor is in the returning talent list to get their new demand
                        const returning = returningBase.find((t: any) => t.id === c.actorId);
                        if (returning) {
                            salary = returning.newDemand;
                        }

                        return {
                            id: c.roleId || c.id,
                            role: c.roleName || c.role,
                            roleType: c.roleType,
                            actorId: c.actorId === 'UNKNOWN' ? null : c.actorId,
                            actorName: c.name || c.actorName,
                            salary: salary,
                            characterId: c.characterId,
                            characterName: c.characterName,
                            sourceUniverseId: c.sourceUniverseId
                        };
                    });
                    setCastList(newCastList);
                    setCurrentReturningTalent(prev => {
                        const merged = [...(selectedScript.returningTalent || []), ...prev];
                        const existingKeys = new Set(merged.map((talent: any) => `${talent.id}:${talent.role}`));
                        const additions = details.castList
                            .filter((c: any) => c.actorId && c.actorId !== 'UNKNOWN')
                            .map((c: any) => {
                                const role = c.roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR';
                                const originalSalary = Math.max(100_000, Math.floor(c.salary || lastInstallment.budget * (c.roleType === 'LEAD' ? 0.08 : 0.03) || 100_000));
                                return {
                                    role,
                                    id: c.actorId,
                                    originalSalary,
                                    newDemand: Math.floor(originalSalary * 1.2),
                                    negotiated: isInternallyControlledTalent(c.actorId),
                                    accepted: isInternallyControlledTalent(c.actorId),
                                    attemptsLeft: isInternallyControlledTalent(c.actorId) ? 0 : 3,
                                    characterId: c.characterId,
                                    characterName: c.characterName,
                                    sourceUniverseId: c.sourceUniverseId
                                };
                            })
                            .filter((talent: any) => {
                                const key = `${talent.id}:${talent.role}`;
                                if (existingKeys.has(key)) return false;
                                existingKeys.add(key);
                                return true;
                            });
                        return dedupeReturningTalent([...merged, ...additions]);
                    });
                }

                // Pre-fill equipment
                if (details.equipmentChoices) {
                    setEquipmentChoices(details.equipmentChoices);
                }

                // Pre-fill tone and style
                if (details.tone !== undefined) setTone(details.tone);
                if (details.visualStyle) setVisualStyle(details.visualStyle);
                if (details.pacing) setPacing(details.pacing);
            }
        }
    }, [selectedScript?.id, selectedScript?.franchiseId, previousFranchiseInstallments]);

    // Real NPC Data Integration
    const availableDirectors = useMemo(() => {
        // Refresh every 3 weeks
        const seedWeek = Math.floor(player.currentWeek / 3);
        const talent = getAvailableTalent(player.currentWeek, 'DIRECTOR', player.flags.extraNPCs || []);
        const lastInstallment = previousFranchiseInstallments[0];
        const lastDetails = lastInstallment ? (lastInstallment.projectDetails || lastInstallment) : null;
        const returningDirector = currentReturningTalent.find(talentEntry => talentEntry.role === 'DIRECTOR');
        const requiredDirectorId = selectedCrew.director || returningDirector?.id || lastDetails?.directorId;

        // Ensure selected director is always in the list
        const selectedId = requiredDirectorId;
        if (selectedId && !talent.some(t => t.id === selectedId)) {
            const selectedNPC = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === selectedId);
            if (selectedNPC) talent.unshift(selectedNPC);
            else {
                const salary = returningDirector?.newDemand || lastDetails?.directorSalary || Math.max(100_000, Math.floor((lastDetails?.budget || lastInstallment?.budget || 5_000_000) * 0.06));
                talent.unshift({
                    id: selectedId,
                    name: returningDirector?.name || lastDetails?.directorName || 'Returning Director',
                    occupation: 'DIRECTOR',
                    tier: 'ESTABLISHED',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(returningDirector?.name || lastDetails?.directorName || 'Returning Director')}&background=18181b&color=ffffff`,
                    salary,
                    stats: { vision: 82, technical: 78, leadership: 80, style: 76, fame: 55, talent: 80 }
                } as any);
            }
        }

        return talent.map(t => {
            // Deterministic salary based on ID hash
            const seed = t.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const rand = (seed % 100) / 100; // 0.00 to 0.99

            let salary = 0;
            if (t.tier === 'A_LIST') salary = 150000000 + (rand * 150000000); // 150M - 300M
            else if (t.tier === 'ESTABLISHED') salary = 50000000 + (rand * 50000000); // 50M - 100M
            else if (t.tier === 'RISING') salary = 10000000 + (rand * 20000000); // 10M - 30M
            else salary = 1000000 + (rand * 4000000); // 1M - 5M (Indie)

            // Dynamic Fame & Talent (Fluctuation based on 3-week cycle)
            const fluctuation = Math.sin(seedWeek * 0.5 + seed) * 10; // +/- 10 fluctuation
            const baseFame = t.stats?.fame || 50;
            const currentFame = Math.max(0, Math.min(100, baseFame + fluctuation));

            const baseTalent = (t.stats as any)?.talent || (t.stats as any)?.vision || 50;
            const currentTalent = Math.max(0, Math.min(100, baseTalent + (fluctuation * 0.5)));

            return { ...t, salary, stats: { ...t.stats, fame: currentFame, talent: currentTalent } };
        });
    }, [Math.floor(player.currentWeek / 3), player.flags.extraNPCs, selectedCrew.director, previousFranchiseInstallments, currentReturningTalent]);

    const availableActors = useMemo(() => {
        const seedWeek = Math.floor(player.currentWeek / 3);
        const talent = getAvailableTalent(player.currentWeek, 'ACTOR', player.flags.extraNPCs || []);

        // Ensure all selected actors are in the list
        const selectedActorIds = castList.map(c => c.actorId).filter(id => id && id !== 'PLAYER_SELF');
        selectedActorIds.forEach(id => {
            if (!talent.some(t => t.id === id)) {
                const selectedNPC = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === id);
                if (selectedNPC) talent.unshift(selectedNPC);
            }
        });

        // Ensure contracted actors are in the list
        const contracts = player.studio?.talentRoster?.filter(c => c.type === 'MOVIE_DEAL' && c.moviesRemaining > 0) || [];
        contracts.forEach(c => {
            if (!talent.some(t => t.id === c.npcId)) {
                const selectedNPC = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === c.npcId);
                if (selectedNPC) talent.unshift(selectedNPC);
            }
        });

        return talent.map(t => {
            const seed = t.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const rand = (seed % 100) / 100;

            let salary = 0;
            if (t.tier === 'A_LIST') salary = 15000000 + (rand * 5000000); // 15M - 20M
            else if (t.tier === 'ESTABLISHED') salary = 5000000 + (rand * 3000000); // 5M - 8M
            else if (t.tier === 'RISING') salary = 1000000 + (rand * 1000000); // 1M - 2M
            else salary = 250000 + (rand * 250000); // 250k - 500k

            // Dynamic Fame & Talent (Fluctuation based on 3-week cycle)
            const fluctuation = Math.sin(seedWeek * 0.5 + seed) * 10;
            const baseFame = t.stats?.fame || 50;
            const currentFame = Math.max(0, Math.min(100, baseFame + fluctuation));

            const baseTalent = t.stats?.talent || 50;
            const currentTalent = Math.max(0, Math.min(100, baseTalent + (fluctuation * 0.5)));

            return { ...t, salary, stats: { ...t.stats, fame: currentFame, talent: currentTalent } };
        });
    }, [Math.floor(player.currentWeek / 3), castList, player.studio?.talentRoster, player.flags.extraNPCs]);

    const contractedActors = useMemo(() => {
        return Array.from(contractedTalentIds)
            .map(id => availableActors.find(actor => actor.id === id))
            .filter(Boolean) as any[];
    }, [contractedTalentIds, availableActors]);

    const requiresReturningTalentNegotiation = (talent: any) => {
        if (!talent || talent.accepted || (talent.attemptsLeft ?? 0) <= 0) return false;
        if (isInternallyControlledTalent(talent.id)) return false;
        if (talent.role === 'DIRECTOR') return true;
        return !contractedTalentIds.has(talent.id);
    };

    const getReturningTalentDisplay = (talent: any) => {
        const crewStateKey = returningCrewRoleToStateKey(talent.role);
        const castRole = castList.find(role => role.actorId === talent.id && (
            (talent.role === 'LEAD_ACTOR' && role.roleType === 'LEAD') ||
            (talent.role === 'SUPPORTING_ACTOR' && role.roleType === 'SUPPORTING') ||
            role.actorId === talent.id
        ));
        let source: any = null;

        if (crewStateKey === 'director') source = availableDirectors.find(d => d.id === talent.id);
        if (crewStateKey === 'cinematographer') source = mockCrew.cinematographers.find(c => c.id === talent.id);
        if (crewStateKey === 'composer') source = mockCrew.composers.find(c => c.id === talent.id);
        if (crewStateKey === 'lineProducer') source = mockCrew.producers.find(c => c.id === talent.id);
        if (crewStateKey === 'vfx') source = mockCrew.vfxTeams.find(c => c.id === talent.id);
        if (!source) source = availableActors.find(actor => actor.id === talent.id);
        if (!source) source = player.relationships.find(rel => (rel.npcId || rel.id) === talent.id);

        return {
            name: source?.name || talent.name || castRole?.actorName || 'Returning Talent',
            roleLabel: formatReturningRoleLabel(talent.role),
            roleId: castRole?.id,
            image: source?.avatar || source?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(source?.name || talent.name || 'Returning Talent')}&background=18181b&color=ffffff`,
            demand: Math.round(talent.newDemand || 0),
            attemptsLeft: Math.max(0, talent.attemptsLeft ?? 3),
            selected: crewStateKey ? selectedCrew[crewStateKey] === talent.id : !!castRole,
        };
    };

    // Mock Data Generators (Refreshes every 3 weeks)
    const mockCrew = useMemo(() => {
        const seedWeek = Math.floor(player.currentWeek / 3);

        // Helper to generate deterministic stats based on seed and index
        const getStats = (base: number, idx: number) => {
            const fluctuation = Math.sin(seedWeek * 0.5 + idx) * 10;
            return Math.max(10, Math.min(100, Math.floor(base + fluctuation)));
        };

        return {
            cinematographers: [
                { id: 'dp_1', name: 'Roger Deakins', tier: 'LEGEND', salary: 5000000, stats: { lighting: getStats(99, 1), composition: getStats(98, 2), fame: getStats(95, 3), talent: getStats(99, 4) } },
                { id: 'dp_2', name: 'Hoyte van Hoytema', tier: 'PROFESSIONAL', salary: 3000000, stats: { lighting: getStats(95, 5), composition: getStats(94, 6), fame: getStats(85, 7), talent: getStats(94, 8) } },
                { id: 'dp_3', name: 'Greig Fraser', tier: 'PROFESSIONAL', salary: 2500000, stats: { lighting: getStats(92, 9), composition: getStats(90, 10), fame: getStats(80, 11), talent: getStats(91, 12) } },
                { id: 'dp_4', name: 'Indie DP', tier: 'INDIE', salary: 150000, stats: { lighting: getStats(65, 13), composition: getStats(70, 14), fame: getStats(10, 15), talent: getStats(68, 16) } },
            ],
            composers: [
                { id: 'mus_1', name: 'Hans Zimmer', tier: 'LEGEND', salary: 4000000, stats: { melody: getStats(95, 17), atmosphere: getStats(99, 18), fame: getStats(98, 19), talent: getStats(97, 20) } },
                { id: 'mus_2', name: 'Ludwig Göransson', tier: 'PROFESSIONAL', salary: 2000000, stats: { melody: getStats(92, 21), atmosphere: getStats(94, 22), fame: getStats(88, 23), talent: getStats(93, 24) } },
                { id: 'mus_3', name: 'Hildur Guðnadóttir', tier: 'PROFESSIONAL', salary: 1800000, stats: { melody: getStats(88, 25), atmosphere: getStats(96, 26), fame: getStats(82, 27), talent: getStats(92, 28) } },
                { id: 'mus_4', name: 'Synth Wave Artist', tier: 'INDIE', salary: 100000, stats: { melody: getStats(75, 29), atmosphere: getStats(60, 30), fame: getStats(15, 31), talent: getStats(65, 32) } },
            ],
            producers: [
                { id: 'lp_1', name: 'Kevin Feige', tier: 'LEGEND', salary: 10000000, stats: { logistics: getStats(99, 33), thrift: getStats(80, 34), fame: getStats(95, 35), talent: getStats(90, 36) } },
                { id: 'lp_2', name: 'Efficient Producer', tier: 'PROFESSIONAL', salary: 1000000, stats: { logistics: getStats(85, 37), thrift: getStats(95, 38), fame: getStats(40, 39), talent: getStats(80, 40) } },
                { id: 'lp_3', name: 'Line Manager', tier: 'INDIE', salary: 150000, stats: { logistics: getStats(60, 41), thrift: getStats(70, 42), fame: getStats(5, 43), talent: getStats(65, 44) } },
            ],
            vfxTeams: [
                { id: 'vfx_1', name: 'Industrial Light & Magic', tier: 'LEGEND', salary: 8000000, stats: { realism: getStats(99, 45), spectacle: getStats(98, 46), fame: getStats(99, 47), talent: getStats(99, 48) } },
                { id: 'vfx_2', name: 'Weta Digital', tier: 'LEGEND', salary: 7500000, stats: { realism: getStats(98, 49), spectacle: getStats(99, 50), fame: getStats(98, 51), talent: getStats(98, 52) } },
                { id: 'vfx_3', name: 'Framestore', tier: 'PROFESSIONAL', salary: 4000000, stats: { realism: getStats(90, 53), spectacle: getStats(92, 54), fame: getStats(85, 55), talent: getStats(91, 56) } },
                { id: 'vfx_4', name: 'Boutique VFX', tier: 'INDIE', salary: 500000, stats: { realism: getStats(70, 57), spectacle: getStats(60, 58), fame: getStats(10, 59), talent: getStats(65, 60) } },
            ]
        };
    }, [Math.floor(player.currentWeek / 3)]);

    const mockLocations = useMemo<Record<string, any[]>>(() => ({
        'NA': [
            { id: 'LA', name: 'Los Angeles', desc: 'The heart of Hollywood. Expensive but high quality.', cost: 15000000, quality: 10, x: 15, y: 35 },
            { id: 'ATL', name: 'Atlanta', desc: 'Generous tax credits. Good facilities.', cost: 5000000, quality: 5, x: 22, y: 38 },
            { id: 'NYC', name: 'New York', desc: 'Iconic urban scenery. Very expensive.', cost: 20000000, quality: 9, x: 25, y: 32 },
            { id: 'VAN', name: 'Vancouver', desc: 'Versatile and budget friendly.', cost: 3000000, quality: 6, x: 12, y: 28 },
            { id: 'MEX', name: 'Mexico City', desc: 'Vibrant culture and unique architecture.', cost: 4000000, quality: 7, x: 18, y: 45 },
            { id: 'TOR', name: 'Toronto', desc: 'Urban double for NYC/Chicago.', cost: 3500000, quality: 6, x: 20, y: 30 },
        ],
        'EU': [
            { id: 'LDN', name: 'London', desc: 'World-class studios and talent.', cost: 12000000, quality: 9, x: 48, y: 28 },
            { id: 'PAR', name: 'Paris', desc: 'Romantic and historic.', cost: 10000000, quality: 8, x: 50, y: 32 },
            { id: 'PRG', name: 'Prague', desc: 'Old world charm on a budget.', cost: 2000000, quality: 7, x: 54, y: 30 },
            { id: 'ROM', name: 'Rome', desc: 'Eternal city with epic scale.', cost: 9000000, quality: 9, x: 53, y: 36 },
            { id: 'BER', name: 'Berlin', desc: 'Gritty urban and modern tech.', cost: 7000000, quality: 8, x: 53, y: 28 },
            { id: 'MAD', name: 'Madrid', desc: 'Sunny and historic.', cost: 5000000, quality: 7, x: 46, y: 38 },
        ],
        'AS': [
            { id: 'TOK', name: 'Tokyo', desc: 'Neon futuristic vibes.', cost: 14000000, quality: 9, x: 88, y: 35 },
            { id: 'SEO', name: 'Seoul', desc: 'Modern and efficient.', cost: 8000000, quality: 8, x: 84, y: 34 },
            { id: 'BOM', name: 'Mumbai', desc: 'The home of Bollywood.', cost: 6000000, quality: 7, x: 72, y: 48 },
            { id: 'HKG', name: 'Hong Kong', desc: 'Dense urban neon.', cost: 11000000, quality: 9, x: 80, y: 42 },
            { id: 'BEI', name: 'Beijing', desc: 'Grand scale and history.', cost: 12000000, quality: 8, x: 78, y: 32 },
            { id: 'BKK', name: 'Bangkok', desc: 'Chaotic energy and temples.', cost: 3000000, quality: 6, x: 75, y: 45 },
        ],
        'SA': [
            { id: 'RIO', name: 'Rio de Janeiro', desc: 'Stunning natural beauty.', cost: 5000000, quality: 8, x: 32, y: 72 },
            { id: 'BUE', name: 'Buenos Aires', desc: 'European flair in South America.', cost: 4000000, quality: 7, x: 30, y: 85 },
            { id: 'BOG', name: 'Bogota', desc: 'High altitude urban grit.', cost: 2000000, quality: 6, x: 25, y: 58 },
            { id: 'LIM', name: 'Lima', desc: 'Coastal desert city.', cost: 2500000, quality: 6, x: 22, y: 65 },
        ],
        'AF': [
            { id: 'CPT', name: 'Cape Town', desc: 'Diverse landscapes and great light.', cost: 4000000, quality: 8, x: 53, y: 82 },
            { id: 'CAI', name: 'Cairo', desc: 'Ancient wonders and desert heat.', cost: 7000000, quality: 7, x: 56, y: 42 },
            { id: 'MAR', name: 'Marrakesh', desc: 'Exotic colors and textures.', cost: 3000000, quality: 8, x: 46, y: 42 },
            { id: 'LAG', name: 'Lagos', desc: 'Bustling energy.', cost: 2000000, quality: 5, x: 48, y: 55 },
        ],
        'OC': [
            { id: 'SYD', name: 'Sydney', desc: 'Modern harbor and coastal beauty.', cost: 10000000, quality: 9, x: 88, y: 82 },
            { id: 'MEL', name: 'Melbourne', desc: 'Arts and culture hub.', cost: 8000000, quality: 8, x: 86, y: 86 },
            { id: 'AKL', name: 'Auckland', desc: 'Middle-earth landscapes.', cost: 6000000, quality: 10, x: 94, y: 88 },
        ]
    }), []);

    const findLocation = (id: string | null) => {
        if (!id) return null;
        let found: any = null;
        Object.values(mockLocations).forEach((list: any[]) => {
            const item = list.find(l => l.id === id);
            if (item) found = item;
        });
        return found;
    };

    const [selectingActorFor, setSelectingActorFor] = useState<string | null>(null);
    const [negotiationModal, setNegotiationModal] = useState<{
        talentId: string;
        roleType: string;
        roleId?: string; // For cast
        originalSalary: number;
        currentDemand: number;
        attemptsLeft: number;
        talentName: string;
        talentImage: string;
        talentTier: string;
        feedback?: {
            message: string;
            type: 'SUCCESS' | 'FAILURE' | 'FINAL_FAILURE';
        };
    } | null>(null);

    const [counterOfferInput, setCounterOfferInput] = useState<string>("");

    const handleNegotiate = (talentId: string, returningData: any, roleId?: string) => {
        let talentName = 'Unknown Talent';
        let talentImage = '';
        let talentTier = 'INDIE';

        const crewStateKey = returningCrewRoleToStateKey(returningData.role);
        if (crewStateKey) {
            let crewCandidate: any = null;
            if (crewStateKey === 'director') crewCandidate = availableDirectors.find(d => d.id === talentId);
            else if (crewStateKey === 'cinematographer') crewCandidate = mockCrew.cinematographers.find(c => c.id === talentId);
            else if (crewStateKey === 'composer') crewCandidate = mockCrew.composers.find(c => c.id === talentId);
            else if (crewStateKey === 'lineProducer') crewCandidate = mockCrew.producers.find(c => c.id === talentId);
            else if (crewStateKey === 'vfx') crewCandidate = mockCrew.vfxTeams.find(c => c.id === talentId);

            if (crewCandidate) {
                talentName = crewCandidate.name;
                talentImage = crewCandidate.avatar || '';
                talentTier = crewCandidate.tier || 'INDIE';
            }
        } else {
            let act = availableActors.find(a => a.id === talentId);
            if (!act) {
                const rel = player.relationships.find(r => (r.npcId || r.id) === talentId);
                if (rel) act = rel;
            }
            if (act) {
                talentName = act.name;
                talentImage = act.avatar || '';
                talentTier = act.tier || 'INDIE';
            } else {
                const castRole = castList.find(role => role.id === roleId || role.actorId === talentId);
                if (castRole?.actorName) {
                    talentName = castRole.actorName;
                    talentTier = 'ESTABLISHED';
                }
            }
        }

        setCounterOfferInput(Math.round(returningData.originalSalary + (returningData.newDemand - returningData.originalSalary) * 0.5).toString());
        setNegotiationModal({
            talentId,
            roleType: returningData.role,
            roleId,
            originalSalary: returningData.originalSalary,
            currentDemand: returningData.newDemand,
            attemptsLeft: returningData.negotiated ? 0 : (returningData.attemptsLeft ?? 3),
            talentName,
            talentImage,
            talentTier
        });
    };

    const updateReturningTalentState = (
        talentId: string,
        roleType: string,
        updater: (talent: any) => any
    ) => {
        const normalizedReturningTalent = dedupeReturningTalent(currentReturningTalent);
        const talentIndex = normalizedReturningTalent.findIndex(t => t.id === talentId && t.role === roleType);
        if (talentIndex === -1) return false;

        const updatedReturningTalent = normalizedReturningTalent.map((talent, index) =>
            index === talentIndex ? updater(talent) : talent
        );
        setCurrentReturningTalent(updatedReturningTalent);

        const updatedScripts = (studio.studioState?.scripts || []).map(s =>
            s.id === selectedScript?.id ? { ...s, returningTalent: updatedReturningTalent } : s
        );

        const updatedPlayer = { ...player };
        const studioIndex = updatedPlayer.businesses.findIndex(b => b.id === studio.id);
        if (studioIndex !== -1) {
            updatedPlayer.businesses[studioIndex] = {
                ...studio,
                studioState: {
                    ...studio.studioState!,
                    scripts: updatedScripts
                }
            };
        }
        onUpdatePlayer(updatedPlayer);
        return true;
    };

    const assignNegotiatedTalent = (talentId: string, talentName: string, salary: number, roleType: string, roleId?: string) => {
        const crewStateKey = returningCrewRoleToStateKey(roleType);
        if (crewStateKey) {
            setSelectedCrew(prev => ({ ...prev, [crewStateKey]: talentId }));
            setCrewModes(prev => ({ ...prev, [crewStateKey]: talentId === 'PLAYER_SELF' ? 'SELF' : (talentId === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE') }));
            return;
        }

        if (roleId) {
            setCastList(prev => prev.map(r => r.id === roleId ? {
                ...r,
                actorId: talentId,
                actorName: talentName,
                salary
            } : r));
        }
        setSelectingActorFor(null);
    };

    const clearNegotiatedTalent = (talentId: string, roleType: string, roleId?: string) => {
        const crewStateKey = returningCrewRoleToStateKey(roleType);
        if (crewStateKey) {
            if (selectedCrew[crewStateKey] === talentId) {
                setSelectedCrew(prev => ({ ...prev, [crewStateKey]: null }));
            }
            return;
        }

        if (roleId) {
            setCastList(prev => prev.map(r => r.id === roleId && r.actorId === talentId ? {
                ...r,
                actorId: null,
                actorName: undefined,
                salary: 0
            } : r));
        }
    };


    const calculateActorSalary = (actor: any, roleType: string, closeness: number = 0) => {
        if (currentReturningTalent.length > 0) {
            const returning = currentReturningTalent.find(t => t.id === actor.id);
            if (returning) {
                return returning.newDemand;
            }
        }

        let baseSalary = 100000;
        if (actor.tier === 'A_LIST') baseSalary = 20000000;
        else if (actor.tier === 'ESTABLISHED') baseSalary = 8000000;
        else if (actor.tier === 'RISING') baseSalary = 2000000;

        // Fame multiplier (fame is 0-100)
        const fameMultiplier = 0.5 + (actor.stats.fame / 100);

        // Role multiplier
        let roleMultiplier = 1;
        if (roleType === 'LEAD') roleMultiplier = 1;
        else if (roleType === 'SUPPORTING') roleMultiplier = 0.4;
        else if (roleType === 'CAMEO') roleMultiplier = 0.15;
        else if (roleType === 'EXTRA') roleMultiplier = 0.05;

        const base = Math.floor(baseSalary * fameMultiplier * roleMultiplier);

        // Relationship Discount
        let discount = 0;
        if (closeness > 50) {
            discount = Math.min(0.7, (closeness - 50) / 100 + 0.2); // Up to 70% discount
        }

        return Math.floor(base * (1 - discount));
    };

    const estimateLinkedCharacterSalary = (character: any, roleType: string) => {
        const actorId = character.actorId && character.actorId !== 'UNKNOWN' ? character.actorId : null;
        const actor = actorId ? availableActors.find(a => a.id === actorId) : null;
        if (actor) return calculateActorSalary(actor, roleType);

        const fame = Math.max(20, Math.min(100, Number(character.fame ?? character.appeal ?? character.fanApproval ?? 55)));
        const baseSalary = fame >= 85 ? 18_000_000 : fame >= 70 ? 9_000_000 : fame >= 50 ? 3_000_000 : 750_000;
        const roleMultiplier = roleType === 'LEAD' ? 1 : roleType === 'SUPPORTING' ? 0.42 : roleType === 'CAMEO' ? 0.18 : 0.06;
        return Math.floor(baseSalary * roleMultiplier * (0.85 + fame / 180));
    };

    const attachLinkedCharacterToRole = (roleId: string, character: any) => {
        const currentRole = castList.find(role => role.id === roleId);
        const roleType = currentRole?.roleType || 'SUPPORTING';
        const actorId = character.actorId && character.actorId !== 'UNKNOWN' ? character.actorId : null;
        const actor = actorId ? availableActors.find(a => a.id === actorId) : null;
        const salary = estimateLinkedCharacterSalary(character, roleType);
        const returningRole = roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR';

        setCastList(prev => prev.map(role => role.id === roleId ? {
            ...role,
            characterId: character.characterId || normalizeUniverseCharacterKey(character.name),
            characterName: character.name,
            sourceUniverseId: character.sourceUniverseId || activeUniverseId || undefined,
            actorId: actorId || role.actorId,
            actorName: character.actorName || actor?.name || role.actorName,
            salary: actorId ? salary : role.salary
        } : role));

        if (actorId && !contractedTalentIds.has(actorId) && !isInternallyControlledTalent(actorId)) {
            setCurrentReturningTalent(prev => {
                const normalized = dedupeReturningTalent(prev);
                if (normalized.some(talent => talent.id === actorId && talent.role === returningRole)) return normalized;
                return dedupeReturningTalent([
                    ...prev,
                    {
                        role: returningRole,
                        id: actorId,
                        originalSalary: Math.max(100_000, Math.floor(salary * 0.82)),
                        newDemand: Math.max(150_000, salary),
                        negotiated: false,
                        accepted: false,
                        attemptsLeft: 3,
                        characterId: character.characterId || normalizeUniverseCharacterKey(character.name),
                        characterName: character.name,
                        sourceUniverseId: character.sourceUniverseId || activeUniverseId
                    }
                ]);
            });
        }
    };

    const linkedUniverseCastCount = useMemo(() => {
        return castList.filter(role => isKnownConnectedRole(role)).length;
    }, [castList, linkedCharacterOptions]);

    const effectiveConnectedIntent = useMemo<ConnectedProjectIntent>(() => {
        if (connectedProjectIntent !== 'AUTO') return connectedProjectIntent;
        if (selectedScript?.connectedProjectIntent && selectedScript.connectedProjectIntent !== 'AUTO') return selectedScript.connectedProjectIntent;
        if (selectedScript?.tags?.includes('UNIVERSE_EVENT')) return 'EVENT';
        if (selectedScript?.tags?.includes('REBOOT')) return 'REBOOT';
        if (linkedUniverseCastCount >= 3) return 'EVENT';
        if (linkedUniverseCastCount >= 1) return 'CROSSOVER';
        if (selectedScript?.sourceMaterial === 'SEQUEL' || selectedFranchiseId) return 'SOLO';
        return 'SOLO';
    }, [connectedProjectIntent, selectedScript, linkedUniverseCastCount, selectedFranchiseId]);

    const getInHouseQuality = (role: string) => {
        const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        let level = 0;
        if (role === 'DIRECTOR' || role === 'director') level = depts.directing || 0;
        else if (role === 'CINEMATOGRAPHER' || role === 'cinematographer' || role === 'LINE_PRODUCER' || role === 'lineProducer') level = depts.production || 0;
        else if (role === 'COMPOSER' || role === 'composer' || role === 'VFX' || role === 'vfx') level = depts.postProduction || 0;
        else if (role === 'ACTOR') level = depts.casting || 0;

        if (level === 0) return 0;
        return 10 + ((level - 1) * 9); // Level 1 = 10, Level 10 = 91
    };

    const getInHouseFame = (role: string) => {
        const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        let level = 0;
        if (role === 'DIRECTOR' || role === 'director') level = depts.directing || 0;
        else if (role === 'CINEMATOGRAPHER' || role === 'cinematographer' || role === 'LINE_PRODUCER' || role === 'lineProducer') level = depts.production || 0;
        else if (role === 'COMPOSER' || role === 'composer' || role === 'VFX' || role === 'vfx') level = depts.postProduction || 0;
        else if (role === 'ACTOR') level = depts.casting || 0;

        return 10 + (level * 2); // Base 10, max 30
    };

    const getInHouseLevel = (role: string) => {
        const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        if (role === 'DIRECTOR' || role === 'director') return depts.directing || 0;
        if (role === 'CINEMATOGRAPHER' || role === 'cinematographer' || role === 'LINE_PRODUCER' || role === 'lineProducer') return depts.production || 0;
        if (role === 'COMPOSER' || role === 'composer' || role === 'VFX' || role === 'vfx') return depts.postProduction || 0;
        if (role === 'ACTOR') return depts.casting || 0;
        return 0;
    };

    // Helper to get crew stats
    const getCrewData = (role: 'director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx') => {
        const mode = crewModes[role];
        const id = selectedCrew[role];

        if (mode === 'SELF') {
            const quality = role === 'director' ? getDirectorTalent(player.directorStats) : 70;
            return { name: player.name, tier: 'Indie', quality, cost: 0 };
        }
        if (mode === 'IN_HOUSE') return { name: 'Studio Staff', tier: 'In-House', quality: getInHouseQuality(role), fame: getInHouseFame(role), cost: 0 };

        // Find hired crew
        let candidate: any = null;
        if (role === 'director') candidate = availableDirectors.find(c => c.id === id);
        else if (role === 'cinematographer') candidate = mockCrew.cinematographers.find(c => c.id === id);
        else if (role === 'composer') candidate = mockCrew.composers.find(c => c.id === id);
        else if (role === 'lineProducer') candidate = mockCrew.producers.find(c => c.id === id);
        else if (role === 'vfx') candidate = mockCrew.vfxTeams.find(c => c.id === id);

        // Estimate salary for NPCs if not present (simple logic based on tier)
        let cost = 0;
        if (candidate) {
            if (currentReturningTalent.length > 0) {
                const returning = currentReturningTalent.find(t => t.id === candidate.id && t.role === role.toUpperCase());
                if (returning && returning.newDemand) {
                    cost = returning.newDemand;
                }
            }

            if (!cost) {
                if (candidate.salary) cost = candidate.salary;
                else {
                    // Dynamic salary for NPCs
                    if (role === 'director') {
                        // INFLATED DIRECTOR SALARIES (Max 250-300M)
                        // Note: We use a deterministic "random" based on ID char codes to ensure price stays consistent between views
                        const seed = candidate.id.charCodeAt(0) + candidate.id.charCodeAt(candidate.id.length - 1);
                        const rand = (seed % 100) / 100;

                        if (candidate.tier === 'A_LIST') cost = 150000000 + rand * 150000000;
                        else if (candidate.tier === 'ESTABLISHED') cost = 50000000 + rand * 50000000;
                        else if (candidate.tier === 'RISING') cost = 10000000 + rand * 20000000;
                        else cost = 1000000 + rand * 4000000;
                    } else {
                        // Standard Actor/Crew Salaries
                        if (candidate.tier === 'A_LIST') cost = 15000000;
                        else if (candidate.tier === 'ESTABLISHED') cost = 5000000;
                        else if (candidate.tier === 'RISING') cost = 1000000;
                        else cost = 200000;
                    }
                }
            }
        }

        return candidate
            ? { name: candidate.name, tier: candidate.tier, quality: candidate.stats?.talent || candidate.stats?.vision || 85, fame: candidate.stats?.fame || 0, cost }
            : { name: 'Unknown', tier: 'Unknown', quality: 50, fame: 0, cost: 0 };
    };

    const budgetBreakdown = useMemo(() => {
        let estimatedBudget = 5000000; // Base production cost
        const baseCost = 5000000;

        const scriptCost = selectedScript?.developmentCost || 0;
        estimatedBudget += scriptCost;

        const directorData = getCrewData('director');
        const dpData = getCrewData('cinematographer');
        const composerData = getCrewData('composer');
        const lpData = getCrewData('lineProducer');
        const vfxData = getCrewData('vfx');

        estimatedBudget += (directorData.cost || 0);
        estimatedBudget += (dpData.cost || 0);
        estimatedBudget += (composerData.cost || 0);
        estimatedBudget += (lpData.cost || 0);
        estimatedBudget += (vfxData.cost || 0);

        // Add Cast Costs
        let castCost = 0;
        castList.forEach(role => {
            if (role.actorId) {
                if (role.actorId === 'PLAYER_SELF' || role.actorId === 'STUDIO_STAFF') {
                    // No upfront cost for self or studio staff
                } else if (contractedActors.some(a => a.id === role.actorId)) {
                    // No upfront cost for contracted actors
                } else {
                    const actor = availableActors.find(a => a.id === role.actorId);
                    if (actor || role.salary) {
                        // Use the salary already stored in the role, including linked universe actors who may not be in the weekly pool.
                        castCost += (role.salary || 0);
                    }
                }
            }
        });
        estimatedBudget += castCost;

        // Location Cost & Stats
        let locationCost = 0;

        if (selectedLocations.length > 0) {
            selectedLocations.forEach(lid => {
                const locData = findLocation(lid);
                if (locData) {
                    locationCost += Number(locData.cost) || 0;
                }
            });
            estimatedBudget += locationCost;
        }

        // Equipment Cost
        let equipmentCost = 0;
        Object.values(equipmentChoices).forEach(choice => {
            const choiceStr = choice as string;
            if (choiceStr !== 'OWNED' && GEAR_TIERS[choiceStr]) {
                equipmentCost += GEAR_TIERS[choiceStr].cost;
            }
        });
        estimatedBudget += equipmentCost;

        return {
            total: Number(estimatedBudget) || 0,
            baseCost,
            scriptCost,
            cast: Number(castCost) || 0,
            director: Number(directorData.cost) || 0,
            crew: (Number(dpData.cost) || 0) + (Number(composerData.cost) || 0) + (Number(lpData.cost) || 0) + (Number(vfxData.cost) || 0),
            locationCost,
            equipmentCost
        };
    }, [selectedCrew, crewModes, castList, selectedLocations, availableActors, availableDirectors, player, equipmentChoices, studio, mockLocations, mockCrew]);

    const unresolvedReturningTalent = useMemo(() => {
        if (currentReturningTalent.length === 0) return [];

        return dedupeReturningTalent(currentReturningTalent).filter(talent => {
            if (!requiresReturningTalentNegotiation(talent)) return false;

            const crewStateKey = returningCrewRoleToStateKey(talent.role);
            if (crewStateKey) {
                return selectedCrew[crewStateKey] === talent.id;
            }

            if (talent.role === 'LEAD_ACTOR') {
                return castList.some(role => role.actorId === talent.id && role.roleType === 'LEAD');
            }

            if (talent.role === 'SUPPORTING_ACTOR') {
                return castList.some(role => role.actorId === talent.id && role.roleType === 'SUPPORTING');
            }

        return castList.some(role => role.actorId === talent.id);
        });
    }, [currentReturningTalent, selectedCrew, castList, contractedActors]);

    const linkedCastSummary = useMemo(() => {
        return castList
            .filter(role => isKnownConnectedRole(role))
            .map(role => {
                const negotiation = currentReturningTalent.find(talent => talent.id === role.actorId && (talent.role === 'LEAD_ACTOR' || talent.role === 'SUPPORTING_ACTOR'));
                return {
                    ...role,
                    negotiationStatus: negotiation
                        ? negotiation.accepted
                            ? 'Locked'
                            : negotiation.attemptsLeft <= 0
                                ? 'Declined'
                                : 'Negotiating'
                        : role.actorId
                            ? 'Locked'
                            : 'Uncast'
                };
            });
    }, [castList, currentReturningTalent, linkedCharacterOptions]);

    // Buzz State
    const [buzzItems, setBuzzItems] = useState<any[]>([]);

    const greenlightStatus = useMemo(() => {
        const errors: string[] = [];
        if (!selectedScript) return { can: false, errors: ["No script selected"] };
        if (selectedScript.status === 'IN_DEVELOPMENT') errors.push("Scripting is still in progress");
        if (selectedLocations.length === 0) errors.push("No filming locations selected");

        const roles = ['director', 'cinematographer', 'composer', 'lineProducer', 'vfx'] as const;
        for (const role of roles) {
            if (crewModes[role] === 'HIRE' && !selectedCrew[role]) {
                const roleName = role === 'lineProducer' ? 'Line Producer' : (role === 'vfx' ? 'VFX Supervisor' : role.charAt(0).toUpperCase() + role.slice(1));
                errors.push(`${roleName} is required`);
            }
        }

        if (!castList.some(c => c.roleType === 'LEAD' && (c.actorId || c.actorId === 'PLAYER_SELF' || c.actorId === 'STUDIO_STAFF'))) {
            errors.push("At least one lead actor is required");
        }

        if (effectiveConnectedIntent === 'CROSSOVER' && linkedUniverseCastCount < 1) {
            errors.push("Crossover needs at least one known character");
        }

        if (effectiveConnectedIntent === 'EVENT' && linkedUniverseCastCount < 3) {
            errors.push("Event film needs at least three known characters");
        }

        if (effectiveConnectedIntent === 'REBOOT' && !selectedUniverseId && !selectedFranchiseId && !selectedScript.universeId && !selectedScript.franchiseId) {
            errors.push("Reboot needs a universe or franchise connection");
        }

        if (unresolvedReturningTalent.length > 0) {
            const names = unresolvedReturningTalent
                .map(talent => getReturningTalentDisplay(talent).name)
                .filter(Boolean)
                .slice(0, 3);
            const suffix = unresolvedReturningTalent.length > 3 ? ` +${unresolvedReturningTalent.length - 3} more` : '';
            errors.push(`Returning talent negotiations pending: ${names.join(', ')}${suffix}`);
        }

        const productionFund = studio.studioState?.productionFund || 0;
        if (studio.balance + productionFund + lockedStreamingFundingAmount < budgetBreakdown.total) {
            errors.push("Insufficient studio funds for production");
        }

        return { can: errors.length === 0, errors };
    }, [selectedScript, selectedLocations, crewModes, selectedCrew, castList, studio.balance, studio.studioState?.productionFund, lockedStreamingFundingAmount, budgetBreakdown.total, unresolvedReturningTalent, effectiveConnectedIntent, linkedUniverseCastCount, selectedUniverseId, selectedFranchiseId]);

    const canGreenlight = greenlightStatus.can;
    const hiredIds = useMemo(() => {
        const ids = new Set<string>();
        Object.values(selectedCrew).forEach(id => { if (id) ids.add(id as string); });
        castList.forEach(c => { if (c.actorId && c.actorId !== 'PLAYER_SELF' && c.actorId !== 'STUDIO_STAFF') ids.add(c.actorId); });
        return Array.from(ids);
    }, [selectedCrew, castList]);

    const [isProcessingAd, setIsProcessingAd] = useState(false);

    const handleGreenlight = async () => {
        if (!canGreenlight) return;

        // --- SHOW INTERSTITIAL AD BEFORE GREENLIGHT ---
        if (!hasNoAds(player)) {
            setIsProcessingAd(true);
            try {
                await showAd('INTERSTITIAL');
            } catch (e) {
                console.error("Ad failed", e);
            } finally {
                setIsProcessingAd(false);
            }
        }

        const directorData = getCrewData('director');

        // Calculate Budget
        const estimatedBudget = budgetBreakdown.total;

        // Location Cost & Stats
        let locationQualityBonus = 0;
        let locationName = 'Multiple Locations';

        if (selectedLocations.length > 0) {
            let totalQuality = 0;
            selectedLocations.forEach(lid => {
                const locData = findLocation(lid);
                if (locData) totalQuality += locData.quality;
            });
            locationQualityBonus = Math.round(totalQuality / selectedLocations.length);

            if (selectedLocations.length === 1) {
                const loc = findLocation(selectedLocations[0]);
                if (loc) locationName = loc.name;
            }
        }

        // Calculate Fame Multiplier
        let extraFame = 0;
        const castIds = castList.map(c => {
             if (c.actorId === 'PLAYER_SELF') return 'player';
             if (c.actorId === 'STUDIO_STAFF') {
                 extraFame += getInHouseFame('ACTOR');
                 return null;
             }
             const rel = player.relationships.find(r => r.id === c.actorId);
             if (rel) return rel.npcId || rel.id;
             return c.actorId;
        }).filter(Boolean) as string[];

        if (directorData.tier === 'In-House') {
            extraFame += (directorData as any).fame || 0;
        }

        const fameMultiplier = calculateProjectFameMultiplier(castIds, directorData.name as string, player.stats.fame, player.stats.talent, extraFame);
        const finalBudgetTier = estimatedBudget > 50000000 ? 'BLOCKBUSTER' : estimatedBudget > 10000000 ? 'HIGH' : 'MID';
        const castDepth = calculateCastDepthScore(castList.length, selectedScript.genres[0], finalBudgetTier, currentCastingStrength);

        // Calculate Actual Quality (Hidden)
        // User request: "movie perfomed more good if movie quality is good as oer iuts est quaity but also its not neccesaary that what est quality its there movie actucal quality remain that"
        // We introduce variance.
        const qualityVariance = (Math.random() * 20) - 10; // +/- 10 points
        // User request: "there is no need of safety net." -> Removed baseQuality boost

        const actualQuality = Math.max(1, Math.min(100, currentEstimatedQuality + qualityVariance));

        // Random Pre-Production Duration (4-10 weeks)
        const preProdDuration = Math.floor(Math.random() * 7) + 4;
        const isCreatingNewUniverse = selectedUniverseId === 'NEW' && !!newUniverseName.trim();
        const primaryCastUniverseId = castList.find(c => c.sourceUniverseId)?.sourceUniverseId;
        const finalUniverseId = isCreatingNewUniverse ? `universe_${Date.now()}` : (selectedUniverseId || selectedScript.universeId || primaryCastUniverseId || undefined);
        const normalizedWorldUniverses = normalizeUniverseMap(player.world?.universes || {});
        const universeColors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
        const randomUniverseColor = universeColors[Math.floor(Math.random() * universeColors.length)];

        // --- CHECK RECASTING ---
        let isRecast = false;
        if (selectedScript.franchiseId && previousFranchiseInstallments.length > 0) {
            const lastInstallment = previousFranchiseInstallments[0];
            const lastDetails = lastInstallment.projectDetails || lastInstallment;
            // Check if any lead actor changed
            if (lastDetails.castList) {
                const oldLeads = lastDetails.castList.filter(c => c.roleType === 'LEAD').map(c => c.actorId);
                const newLeads = castList.filter(c => c.roleType === 'LEAD').map(c => c.actorId);

                // Simple check: if a new lead wasn't in the old leads, it's a recast
                for (const newLead of newLeads) {
                    if (newLead && !oldLeads.includes(newLead)) {
                        isRecast = true;
                        break;
                    }
                }
            }
        }

        const fullCrewList: CrewMember[] = [];
        const roles: ('director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx')[] = ['director', 'cinematographer', 'composer', 'lineProducer', 'vfx'];

        roles.forEach(role => {
            const mode = crewModes[role];
            const id = selectedCrew[role];
            if (mode === 'HIRE' && !id) return;

            const data = getCrewData(role);
            let roleEnum: CrewMember['role'] = 'DIRECTOR';
            if (role === 'cinematographer') roleEnum = 'CINEMATOGRAPHER';
            else if (role === 'composer') roleEnum = 'COMPOSER';
            else if (role === 'lineProducer') roleEnum = 'LINE_PRODUCER';
            else if (role === 'vfx') roleEnum = 'VFX_SUPERVISOR';

            let tierEnum: CrewMember['tier'] = 'INDIE';
            if (data.tier === 'LEGEND' || data.tier === 'AUTEUR' || data.tier === 'PROFESSIONAL' || data.tier === 'INDIE') tierEnum = data.tier as any;
            else if (data.tier === 'In-House') tierEnum = 'PROFESSIONAL';

            fullCrewList.push({
                id: mode === 'SELF' ? 'PLAYER_SELF' : mode === 'IN_HOUSE' ? 'STUDIO_STAFF' : (id as string) || `unknown_${role}`,
                name: data.name,
                role: roleEnum,
                stats: { technical: data.quality },
                salary: data.cost,
                status: 'SIGNED',
                tier: tierEnum,
                isPlayer: mode === 'SELF'
            });
        });

        const finalizedCastList = castList.map((c, index) => {
            const characterName = (c.characterName || '').trim() || getDefaultCharacterName(c, index);
            const normalizedCharacterId = c.characterId
                || (finalUniverseId ? toUniverseCharacterId(finalUniverseId as any, characterName) : undefined)
                || normalizeUniverseCharacterKey(`${selectedScript.title}_${characterName}`);

            return {
                roleId: c.id,
                roleName: c.role,
                roleType: c.roleType,
                actorId: c.actorId || 'UNKNOWN',
                name: c.actorName || 'Unknown Actor',
                characterId: normalizedCharacterId,
                characterName,
                salary: c.salary,
                sourceUniverseId: c.sourceUniverseId,
                status: 'CONFIRMED' as const,
                isReturning: currentReturningTalent.some(t => t.id === c.actorId) || false
            };
        });
        const hasLinkedUniverseCast = finalizedCastList.some(c => c.sourceUniverseId);
        const projectSubtype = effectiveConnectedIntent === 'EVENT'
            ? 'UNIVERSE_EVENT'
            : effectiveConnectedIntent === 'CROSSOVER'
                ? 'UNIVERSE_CROSSOVER'
                : effectiveConnectedIntent === 'REBOOT'
                    ? 'REBOOT'
                    : selectedScript.tags?.includes('UNIVERSE_EVENT')
                        ? 'UNIVERSE_EVENT'
                        : hasLinkedUniverseCast && selectedScript.sourceMaterial !== 'SEQUEL'
                            ? 'UNIVERSE_CROSSOVER'
                            : selectedScript.sourceMaterial === 'SEQUEL'
                                ? 'SEQUEL'
                                : selectedScript.sourceMaterial === 'SPINOFF'
                                    ? 'SPINOFF'
                                    : 'STANDALONE';

        const newCommitmentId = `proj_${Date.now()}`;
        const newCommitment: Commitment = {
            id: newCommitmentId,
            name: selectedScript.title,
            type: 'JOB',
            roleType: castList.find(c => c.actorId === 'PLAYER_SELF')?.roleType as any,
            energyCost: 0,
            income: 0,
            payoutType: 'LUMPSUM',
            projectPhase: 'PRE_PRODUCTION',
            phaseWeeksLeft: preProdDuration,
            totalPhaseDuration: preProdDuration,
            projectDetails: {
                title: selectedScript.title,
                type: selectedScript.projectType,
                format: selectedScript.format || 'LIVE_ACTION',
                episodes: selectedScript.episodes,
                description: `A ${selectedScript.genres.join('/')} ${formatProjectFormatLabel(selectedScript.format)} ${selectedScript.projectType === 'SERIES' ? 'series' : 'film'} produced by ${studio.name}${selectedScript.subjectName ? ` about ${selectedScript.subjectName}` : ''}.`,
                studioId: studio.id as any,
                subtype: projectSubtype,
                universeId: finalUniverseId,
                universeSagaName: isCreatingNewUniverse
                    ? 'Saga 1'
                    : selectedScript.universeSagaName || ((selectedUniverseId && selectedUniverseId !== 'NEW') ? String(normalizedWorldUniverses[selectedUniverseId]?.currentSagaName || normalizedWorldUniverses[selectedUniverseId]?.saga || 'Saga 1') : undefined),
                universePhaseName: isCreatingNewUniverse
                    ? 'Phase 1'
                    : selectedScript.universePhaseName || ((selectedUniverseId && selectedUniverseId !== 'NEW') ? String(normalizedWorldUniverses[selectedUniverseId]?.currentPhaseName || normalizedWorldUniverses[selectedUniverseId]?.currentPhase || 'Phase 1') : undefined),
                newUniverseName: isCreatingNewUniverse ? newUniverseName.trim() : undefined,
                franchiseId: selectedFranchiseId === 'NEW' ? `fran_${Date.now()}` : (selectedFranchiseId || undefined),
                installmentNumber: (selectedFranchiseId && selectedFranchiseId !== 'NEW') ? (studioFranchises.find(f => f.id === selectedFranchiseId)?.lastInstallment || 0) + 1 : 1,
                genre: selectedScript.genres[0],
                subjectName: selectedScript.subjectName,
                subjectType: selectedScript.subjectType,
                connectedProjectIntent: effectiveConnectedIntent,
                targetAudience: selectedScript.targetAudience || 'PG-13',
                budgetTier: finalBudgetTier,
                estimatedBudget: estimatedBudget,
                visibleHype: 'LOW',
                hiddenStats: {
                    scriptQuality: selectedScript.quality,
                    directorQuality: directorData.quality,
                    castingStrength: currentCastingStrength,
                    distributionPower: Math.min(100, 50 + Math.floor(studioPrestigeScore / 8)),
                    rawHype: currentEstimatedBuzz,
                    qualityScore: actualQuality, // Store the ACTUAL quality here for future reference
                    prestigeBonus: (tone < 30 ? 20 : 0) + Math.floor(studioPrestigeScore / 25),
                    fameMultiplier: fameMultiplier,
                    castDepthScore: castDepth.score,
                    castDepthNote: castDepth.note,
                    studioPrestigeScore,
                    isRecast: isRecast,
                    connectedProjectIntent: effectiveConnectedIntent,
                    linkedUniverseCastCount,
                    ...(lockedStreamingFunding ? {
                        platformId: lockedStreamingFunding.platformId,
                        nextSeasonFundingAmount: lockedStreamingFunding.amount,
                        nextSeasonFundingPlatformId: lockedStreamingFunding.platformId,
                        nextSeasonFundingSourceProjectId: lockedStreamingFunding.sourceProjectId,
                        nextSeasonFundingUsedByProjectId: newCommitmentId
                    } : {})
                },
                director: {
                    id: selectedCrew.director || (crewModes.director === 'SELF' ? 'PLAYER_SELF' : 'STUDIO_STAFF'),
                    name: directorData.name,
                    tier: directorData.tier,
                    quality: directorData.quality
                },
                directorName: directorData.name,
                directorId: selectedCrew.director || undefined,
                visibleDirectorTier: directorData.tier,
                visibleScriptBuzz: 'High',
                visibleCastStrength: currentCastingStrength > 80 ? 'Star-Studded' : currentCastingStrength > 62 ? 'Solid' : 'Thin',
                castList: finalizedCastList,
                crewList: fullCrewList,
                location: selectedLocations.length > 0 ? { id: selectedLocations[0], name: locationName, region: 'Global', costModifier: 1, qualityBonus: locationQualityBonus, status: 'PENDING', description: `${selectedLocations.length} locations`, coordinates: {x:0,y:0} } : undefined,
                tone: tone,
                visualStyle: visualStyle,
                pacing: pacing,
                equipmentChoices: equipmentChoices
            }
        };

        const updatedScripts = studio.studioState!.scripts.map(s =>
            s.id === selectedScriptId ? { ...s, status: 'PRODUCED' as const, producedAtWeek: player.currentWeek } : s
        );

        // Remove the concept from the studio state to prevent duplicates in Active Slate
        const updatedConcepts = studio.studioState!.concepts.filter(c => c.scriptId !== selectedScriptId);

        // Update talent roster to decrement moviesRemaining for contracted actors
        const usedActorIds = castList.map(c => c.actorId).filter(Boolean);

        // Update both player.studio.talentRoster and studio.studioState.talentRoster for consistency
        const updateRoster = (roster: any[]) => {
            return roster?.map(contract => {
                if (usedActorIds.includes(contract.npcId) && contract.moviesRemaining > 0) {
                    return { ...contract, moviesRemaining: contract.moviesRemaining - 1 };
                }
                return contract;
            }).filter(c => c.moviesRemaining > 0) || [];
        };

        const updatedPlayerTalentRoster = updateRoster(player.studio?.talentRoster || []);
        const updatedStudioTalentRoster = updateRoster(studio.studioState?.talentRoster || []);

        // --- GENERATE BUZZ ITEMS ---
        const generatedBuzz: any[] = [];
        // Use the ESTIMATED quality for initial buzz, as the public doesn't know the actual quality yet
        const buzzQuality = currentEstimatedQuality;
        const isBlockbuster = estimatedBudget > 100000000;
        const isHighQuality = buzzQuality > 85;
        const isLowQuality = buzzQuality < 45;

        // 1. HEADLINE (Always 1)
        let headlineText = `${studio.name} Greenlights "${selectedScript.title}"`;
        let headlineSub = `Production set to begin immediately.`;

        if (isHighQuality) {
            headlineText = `Must-See: ${studio.name} Bets Big on "${selectedScript.title}"`;
            headlineSub = `Insiders are calling the script a "masterpiece". ${directorData.name} attached to direct.`;
        } else if (isLowQuality) {
            headlineText = `Risky Move? ${studio.name} Proceeds with "${selectedScript.title}"`;
            headlineSub = `Industry analysts question the viability of this project.`;
        }

        // Check for Premium Equipment in News
        const premiumEquip = Object.entries(equipmentChoices).filter(([_, choice]) => choice === 'TIER_4' || choice === 'TIER_5');
        if (premiumEquip.length > 0) {
            const equipNames = premiumEquip.map(([id]) => id === 'cameras' ? 'custom IMAX rigs' : id === 'lighting' ? 'stadium-grade lighting' : id === 'sound' ? 'Dolby Atmos gear' : 'massive practical sets');
            headlineSub += ` Studio is sparing no expense, renting ${equipNames.join(' and ')}.`;
        }

        const newsItem: NewsItem = {
            id: `news_${Date.now()}`,
            headline: headlineText,
            subtext: headlineSub,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: Math.floor(player.currentWeek / 52) + 2024,
            impactLevel: isHighQuality ? 'HIGH' : 'MEDIUM'
        };
        generatedBuzz.push({ type: 'HEADLINE', data: newsItem });

        const characterNewsItems: NewsItem[] = [];
        if (finalUniverseId && !isCreatingNewUniverse) {
            const universe = normalizedWorldUniverses[finalUniverseId as UniverseId];
            if (universe) {
                const existingProjects = getUniverseDashboardProjects(player, finalUniverseId as UniverseId, player.activeReleases || []);
                const existingRoster = buildUniverseRoster(universe, existingProjects, player.name);
                const existingById = new Map<string, any>();
                existingRoster.forEach(character => {
                    getUniverseCharacterKeyAliases(finalUniverseId as UniverseId, character.characterId || character.id, character.name)
                        .forEach(alias => existingById.set(alias, character));
                });

                const returningCharacters = finalizedCastList
                    .map(cast => {
                        const existing = getUniverseCharacterKeyAliases(finalUniverseId as UniverseId, cast.characterId, cast.characterName)
                            .map(alias => existingById.get(alias))
                            .find(Boolean);
                        if (!existing) return null;
                        return {
                            cast,
                            existing,
                            isRecast: existing.actorId !== cast.actorId
                        };
                    })
                    .filter(Boolean) as { cast: typeof finalizedCastList[number], existing: any, isRecast: boolean }[];

                const recast = returningCharacters.find(item => item.isRecast);
                const returnee = returningCharacters.find(item => !item.isRecast);
                const story = recast || returnee;

                if (story) {
                    const actorName = story.cast.name || 'Unknown Actor';
                    const oldActorName = story.existing.actorId === 'PLAYER_SELF' ? player.name : (story.existing.actorName || 'Unknown Actor');
                    const headline = story.isRecast
                        ? `${actorName} takes over as ${story.cast.characterName} in "${selectedScript.title}"`
                        : `${story.cast.characterName} returns in "${selectedScript.title}"`;
                    const subtext = story.isRecast
                        ? `The universe is keeping ${story.cast.characterName} alive, but fans will be watching the recast closely after ${oldActorName}'s run.`
                        : `${actorName} is back as ${story.cast.characterName}, giving the universe another connected chapter.`;

                    const characterNews: NewsItem = {
                        id: `news_character_${Date.now()}`,
                        headline,
                        subtext,
                        category: 'UNIVERSE',
                        week: player.currentWeek,
                        year: Math.floor(player.currentWeek / 52) + 2024,
                        impactLevel: story.isRecast ? 'HIGH' : 'MEDIUM'
                    };
                    characterNewsItems.push(characterNews);
                    generatedBuzz.push({ type: 'HEADLINE', data: characterNews });

                    generatedBuzz.push({
                        type: 'TWEET',
                        data: {
                            id: `x_character_${Date.now()}`,
                            authorId: 'npc_fandom_wire',
                            authorName: story.isRecast ? 'FandomWire' : 'Universe Updates',
                            authorHandle: story.isRecast ? '@FandomWire' : '@UniverseUpdates',
                            authorAvatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${story.isRecast ? 'FandomWire' : 'UniverseUpdates'}`,
                            content: story.isRecast
                                ? `Big swing. ${actorName} as ${story.cast.characterName} could either refresh the whole universe or split the fandom.`
                                : `${story.cast.characterName} coming back in "${selectedScript.title}" is exactly the connected-universe energy fans wanted.`,
                            timestamp: Date.now(),
                            likes: story.isRecast ? 18000 : 12000,
                            retweets: story.isRecast ? 4200 : 2600,
                            replies: story.isRecast ? 1900 : 600,
                            isPlayer: false,
                            isLiked: false,
                            isRetweeted: false,
                            isVerified: true
                        } as XPost
                    });
                }
            }
        }

        // 2. SOCIAL POSTS (Increased Count)
        // User request: "push not just one but more tweets"
        const socialCount = isHighQuality ? 8 : isLowQuality ? 6 : 5;

        for (let i = 0; i < socialCount; i++) {
            const isPositive = isHighQuality ? Math.random() > 0.2 : isLowQuality ? Math.random() > 0.8 : Math.random() > 0.4;
            const isHater = !isPositive && Math.random() > 0.5;

            let content = '';
            let author = '';
            let handle = '';

            if (i === 0) {
                // Industry Account
                author = 'FilmUpdates';
                handle = '@FilmUpdates';
                content = `BREAKING: ${directorData.name} to direct "${selectedScript.title}". ${castList.length > 0 ? 'Cast includes top talent.' : ''} #${selectedScript.genres[0]} #Cinema`;
            } else if (i === 1) {
                 // Another Industry Account
                author = 'Deadline';
                handle = '@Deadline';
                content = `EXCLUSIVE: ${studio.name} moves forward with ${selectedScript.genres[0]} project "${selectedScript.title}". Budget estimated at $${(estimatedBudget/1000000).toFixed(0)}M.`;
            } else {
                // Random User
                const users = [
                    { name: 'MovieBuff99', handle: '@MovieBuff99' },
                    { name: 'CinemaSinsFan', handle: '@SinsFan' },
                    { name: 'PopCultureStan', handle: '@PopStan' },
                    { name: 'TheCritic', handle: '@RealCritic' },
                    { name: 'BoxOfficePro', handle: '@BoxOffice' },
                    { name: 'IndieLover', handle: '@IndieFilmz' },
                    { name: 'BlockbusterKing', handle: '@ActionFan' }
                ];
                const user = users[i % users.length];
                author = user.name;
                handle = user.handle;

                if (isHighQuality) {
                    if (isHater) content = `Unpopular opinion: ${directorData.name} is overrated. "${selectedScript.title}" sounds generic. 🤷‍♂️`;
                    else {
                        const praises = [
                            `OMG YES! ${directorData.name} doing a ${selectedScript.genres[0]} movie? Take my money! 🔥🔥🔥`,
                            `The concept for "${selectedScript.title}" is insane. Oscar contender?`,
                            `Finally some good news. ${studio.name} is cooking.`,
                            `I need a trailer NOW.`,
                            `Cast looks stacked. This is going to be huge.`
                        ];
                        content = praises[Math.floor(Math.random() * praises.length)];
                    }
                } else if (isLowQuality) {
                    if (isPositive) content = `Actually, I kinda like the sound of "${selectedScript.title}". Could be a cult classic?`;
                    else {
                        const hates = [
                            `Who asked for this? ${studio.name} is burning money. 🗑️`,
                            `Another flop incoming.`,
                            `Why are they making this?`,
                            `Looks cheap. Pass.`,
                            `My interest is zero.`
                        ];
                        content = hates[Math.floor(Math.random() * hates.length)];
                    }
                } else {
                    const mixed = [
                        `Interested to see how "${selectedScript.title}" turns out. The cast looks okay.`,
                        `Could be good, could be bad. We'll see.`,
                        `Not sure about this one chief.`,
                        `I'll wait for reviews.`,
                        `Decent director choice.`
                    ];
                    content = mixed[Math.floor(Math.random() * mixed.length)];
                }
            }

            const xPost: XPost = {
                id: `x_${Date.now()}_${i}`,
                authorId: 'npc_random',
                authorName: author,
                authorHandle: handle,
                authorAvatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${handle}`,
                content: content,
                timestamp: Date.now(),
                likes: Math.floor(Math.random() * 5000) + 100,
                retweets: Math.floor(Math.random() * 1000) + 10,
                replies: Math.floor(Math.random() * 200),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: i === 0
            };
            generatedBuzz.push({ type: 'TWEET', data: xPost });
        }

        setBuzzItems(generatedBuzz);

        // --- UPDATE PLAYER STATE ---
        const newNews = [newsItem, ...characterNewsItems, ...player.news];
        const newXFeed = generatedBuzz
            .filter(b => b.type === 'TWEET')
            .map(b => b.data)
            .concat(player.x.feed);

        // Deduct budget
        let remainingBudgetToPay = estimatedBudget;
        let lockedFundApplied = 0;
        let updatedLockedStreamingFunds = [...(studio.studioState?.lockedStreamingFunds || [])];

        if (lockedStreamingFunding && lockedStreamingFundingAmount > 0) {
            lockedFundApplied = Math.min(remainingBudgetToPay, lockedStreamingFundingAmount);
            remainingBudgetToPay -= lockedFundApplied;

            // A renewal cap is project-specific. Once the next season is greenlit,
            // unused cap expires instead of becoming free studio money.
            updatedLockedStreamingFunds = updatedLockedStreamingFunds
                .map(fund => fund.id === lockedStreamingFunding.id ? { ...fund, usedByProjectId: newCommitment.id } : fund)
                .filter(fund => fund.id !== lockedStreamingFunding.id);
        }

        let newProductionFund = studio.studioState?.productionFund || 0;

        if (newProductionFund >= remainingBudgetToPay) {
            newProductionFund -= remainingBudgetToPay;
            remainingBudgetToPay = 0;
        } else {
            remainingBudgetToPay -= newProductionFund;
            newProductionFund = 0;
        }

        const newStudioBalance = studio.balance - remainingBudgetToPay;
        const updatedWorldUniverses = isCreatingNewUniverse
            ? {
                ...normalizedWorldUniverses,
                [finalUniverseId!]: normalizeUniverseForSave({
                    id: finalUniverseId!,
                    name: newUniverseName.trim(),
                    description: `${studio.name}'s new cinematic universe.`,
                    studioId: studio.id,
                    currentPhase: 'PHASE_1_ORIGINS',
                    saga: 1,
                    currentSagaName: 'Saga 1',
                    currentPhaseName: 'Phase 1',
                    sagas: [],
                    momentum: 5,
                    brandPower: 5,
                    marketShare: 0,
                    color: randomUniverseColor,
                    roster: [],
                    slate: [newCommitment.projectDetails],
                    weeksUntilNextPhase: 104
                }, finalUniverseId!)
            }
            : normalizedWorldUniverses;

        onUpdatePlayer({
            ...player,
            news: newNews,
            x: { ...player.x, feed: newXFeed },
            commitments: [...player.commitments, newCommitment],
            world: {
                ...player.world,
                universes: updatedWorldUniverses
            },
            studio: {
                ...player.studio,
                talentRoster: updatedPlayerTalentRoster
            },
            businesses: player.businesses.map(b => b.id === studio.id ? {
                ...b,
                balance: newStudioBalance,
                studioState: {
                    ...studio.studioState!,
                    scripts: updatedScripts,
                    concepts: updatedConcepts,
                    talentRoster: updatedStudioTalentRoster,
                    productionFund: newProductionFund,
                    lockedStreamingFunds: updatedLockedStreamingFunds,
                    financeLedger: [{
                        id: `studio_ledger_greenlight_${newCommitment.id}_${player.age}_${player.currentWeek}`,
                        week: player.currentWeek,
                        year: player.age,
                        amount: -remainingBudgetToPay,
                        type: 'PRODUCTION_SPEND',
                        label: lockedFundApplied > 0
                            ? `${newCommitment.name} greenlight spend (${formatMoney(lockedFundApplied)} renewal cap used)`
                            : `${newCommitment.name} greenlight spend`,
                        projectId: newCommitment.id
                    }, ...((studio.studioState?.financeLedger || []))].slice(0, 200)
                }
            } : b)
        });
        setStep('BUZZ');
    };

    // Real-time Budget Calculation for UI
    const currentEstimatedBudget = budgetBreakdown.total;

    const currentEstimatedBuzz = useMemo(() => {
        let buzz = 0;
        if (selectedScript) {
            buzz += selectedScript.hype || 20;
            if (selectedScript.sourceMaterial === 'SEQUEL') buzz += 20;
        }

        // Add Director Fame
        const dirData = getCrewData('director');
        if (dirData.fame) buzz += (dirData.fame * 0.2);

        // Add Cast Fame
        const castFames = castList.map(c => {
            if (!c.actorId) return 0;
            if (c.actorId === 'PLAYER_SELF') return player.stats.fame || 0;
            if (c.actorId === 'STUDIO_STAFF') return 10;
            const actor = availableActors.find(a => a.id === c.actorId);
            return actor?.stats?.fame || 0;
        });
        if (castFames.length > 0) {
            const maxFame = Math.max(...castFames, 0);
            buzz += (maxFame * 0.3);
        }

        return Math.min(100, Math.max(0, Math.floor(buzz || 0)));
    }, [selectedScript, selectedCrew, castList, player, availableActors]);

    const currentCastingStrength = useMemo(() => {
        const assignedCast = castList.filter(c => c.actorId);
        if (assignedCast.length === 0) return 35;

        const weightedScores = assignedCast.map(c => {
            let talent = 50;
            let fame = 10;

            if (c.actorId === 'PLAYER_SELF') {
                talent = player.stats.talent || 50;
                fame = player.stats.fame || 0;
            } else if (c.actorId === 'STUDIO_STAFF') {
                talent = getInHouseQuality('ACTOR') || 40;
                fame = getInHouseFame('ACTOR') || 10;
            } else {
                const actor = availableActors.find(a => a.id === c.actorId);
                talent = actor?.stats?.talent || 50;
                fame = actor?.stats?.fame || 10;
            }

            const roleWeight = c.roleType === 'LEAD' ? 1.2 : c.roleType === 'SUPPORTING' ? 0.8 : c.roleType === 'CAMEO' ? 0.35 : 0.15;
            return { score: (talent * 0.72) + (fame * 0.28), weight: roleWeight };
        });

        const totalWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0) || 1;
        const weightedAverage = weightedScores.reduce((sum, item) => sum + (item.score * item.weight), 0) / totalWeight;

        const requiredCastCount = selectedScript?.projectType === 'SERIES'
            ? 4
            : currentEstimatedBudget > 100000000
                ? 6
                : currentEstimatedBudget > 25000000
                    ? 4
                    : 3;

        const completenessRatio = Math.min(1, assignedCast.length / requiredCastCount);
        const completenessPenalty = (1 - completenessRatio) * 18;
        const ensembleBonus = assignedCast.length >= requiredCastCount ? Math.min(6, (assignedCast.length - requiredCastCount) * 1.5) : 0;

        return Math.round(clampStat(weightedAverage - completenessPenalty + ensembleBonus, 20, 98));
    }, [castList, availableActors, player, selectedScript, currentEstimatedBudget, studio]);

    const currentEstimatedQuality = useMemo(() => {
        let score = 50;
        // Script
        if (selectedScript) score += ((selectedScript.quality || 50) - 50) * 0.5;
        // Director
        const dirData = getCrewData('director');
        score += ((dirData.quality || 50) - 50) * 0.4;
        // Cast
        score += (currentCastingStrength - 50) * 0.3;
        // Crew
        const crewRoles = ['cinematographer', 'composer', 'lineProducer', 'vfx'] as const;
        const crewQualities = crewRoles.map(r => getCrewData(r).quality || 50);
        const avgCrew = crewQualities.reduce((a,b) => a+b, 0) / crewQualities.length;
        score += (avgCrew - 50) * 0.2;

        // Equipment
        let equipmentScore = 0;
        Object.entries(equipmentChoices).forEach(([key, choice]) => {
            const choiceStr = choice as string;
            if (choiceStr === 'OWNED') {
                const ownedLevel = studio.studioState?.equipment?.[key as keyof StudioEquipment] || 0;
                equipmentScore += ownedLevel * 3;
            } else if (GEAR_TIERS[choiceStr]) {
                equipmentScore += GEAR_TIERS[choiceStr].quality || 0;
            }
        });
        score += equipmentScore / 4; // Average bonus per gear type

        // Location
        if (selectedLocations.length > 0) {
             const allLocs = Object.values(mockLocations).flat() as any[];
             let locScore = 0;
             selectedLocations.forEach(locId => {
                 const loc = allLocs.find(l => l.id === locId);
                 if (loc) locScore += ((loc.quality || 5) - 5) * 2;
             });
             score += locScore / selectedLocations.length;
        }
        return Math.max(1, Math.min(100, Math.round(score || 50)));
    }, [selectedScript, selectedCrew, selectedLocations, availableDirectors, mockLocations, crewModes, equipmentChoices, studio, mockCrew, currentCastingStrength]);

    return (
        <div className="fixed inset-0 z-[70] bg-[#020a05] text-white flex flex-col font-sans overflow-hidden">
            {/* GRID BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'linear-gradient(to right, rgba(16, 185, 129, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.15) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-black/10 to-black/80 pointer-events-none z-0"></div>

            {isProcessingAd && (
                <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">Securing Production Permits...</h3>
                    <p className="text-zinc-400 text-sm">Finalizing the greenlight protocol.</p>
                </div>
            )}

            {/* NEW GAMIFIED HEADER */}
            <div className="relative shrink-0 z-20 bg-emerald-950/40 backdrop-blur-2xl border-b border-emerald-500/20 shadow-2xl">
                <div className="max-w-5xl mx-auto w-full px-4 pt-safe-top pb-6">
                    <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6">
                        {/* Left: Back */}
                        <button onClick={onBack} className="p-2 sm:p-2.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all border border-zinc-800 shadow-lg group shrink-0">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform sm:w-5 sm:h-5" />
                        </button>

                        {/* Center: Title & Phase */}
                        <div className="flex flex-col items-center text-center shrink">
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <Clapperboard className="text-emerald-500 hidden sm:block" size={18} />
                                <h1 className="text-base sm:text-xl font-black tracking-tighter text-white uppercase italic">GREENLIGHT</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] sm:text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-3 sm:px-4 py-1 rounded-full uppercase tracking-[0.2em] border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    {step.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Right: Budget & Quality Combined */}
                        <div className="flex items-center shrink-0 gap-2">
                            <div className="bg-black/60 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl border border-amber-500/20 backdrop-blur-xl flex flex-col items-center justify-center shadow-2xl h-full">
                                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Buzz</span>
                                <div className="flex items-center gap-1">
                                    <div className="relative inline-block w-[14px] h-[14px]">
                                        <Star size={14} className="absolute inset-0 text-zinc-700" />
                                        <div
                                            className="absolute inset-0 overflow-hidden"
                                            style={{ width: `${Math.min(100, Math.max(0, currentEstimatedBuzz))}%` }}
                                        >
                                            <Star size={14} className={`fill-amber-400 text-amber-400 ${currentEstimatedBuzz >= 100 ? 'animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''}`} />
                                        </div>
                                    </div>
                                    <span className="text-sm sm:text-lg font-mono font-black text-amber-400">{currentEstimatedBuzz}</span>
                                </div>
                            </div>

                            <div className="bg-black/60 px-3 py-2 sm:px-5 sm:py-3 rounded-2xl border border-emerald-500/20 backdrop-blur-xl flex flex-col items-end shadow-2xl min-w-[110px] sm:min-w-[160px]">
                                <div className="flex flex-col items-end mb-1 sm:mb-2">
                                    <div className="flex items-center gap-1 group/budget relative">
                                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Est. Budget</span>
                                        <Info size={8} className="text-zinc-600 cursor-help" />

                                        {/* Tooltip */}
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl z-50 opacity-0 group-hover/budget:opacity-100 pointer-events-none transition-opacity">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[9px]">
                                                    <span className="text-zinc-500 uppercase">Base Production</span>
                                                    <span className="text-white font-mono">{formatMoney(budgetBreakdown.baseCost)}</span>
                                                </div>
                                                <div className="flex justify-between text-[9px]">
                                                    <span className="text-zinc-500 uppercase">Script & IP</span>
                                                    <span className="text-white font-mono">{formatMoney(budgetBreakdown.scriptCost)}</span>
                                                </div>
                                                <div className="flex justify-between text-[9px]">
                                                    <span className="text-zinc-500 uppercase">Equipment</span>
                                                    <span className="text-white font-mono">{formatMoney(budgetBreakdown.equipmentCost)}</span>
                                                </div>
                                                <div className="pt-1.5 border-t border-zinc-800 flex justify-between text-[10px] font-bold">
                                                    <span className="text-zinc-400 uppercase">Current Total</span>
                                                    <span className="text-emerald-400 font-mono">{formatMoney(budgetBreakdown.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-sm sm:text-xl font-mono font-black tracking-tighter ${currentEstimatedBudget > (studio.balance + (studio.studioState?.productionFund || 0) + lockedStreamingFundingAmount) ? 'text-rose-500' : 'text-emerald-400'}`}>
                                        {formatMoney(currentEstimatedBudget)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 w-full justify-end border-t border-white/5 pt-1 sm:pt-2">
                                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-zinc-600">Est. Quality</span>
                                    <span className={`text-[10px] sm:text-xs font-mono font-black ${currentEstimatedQuality > 80 ? 'text-amber-400' : currentEstimatedQuality > 60 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                        {currentEstimatedQuality}/100
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VISUAL PROGRESS TRACKER */}
                    <div className="relative px-2">
                        <div className="flex justify-between items-start relative">
                            {/* Track Line */}
                            <div className="absolute left-0 right-0 top-[14px] h-0.5 bg-zinc-900/50 -z-10 rounded-full"></div>
                            <div className="absolute left-0 top-[14px] h-0.5 bg-emerald-500 -z-10 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                style={{ width: `${(['SELECT_SCRIPT', 'DIRECTOR', 'CAST', 'CREW', 'EQUIPMENT', 'LOCATION', 'TONE', 'CONFIRM', 'BUZZ'].indexOf(step) / 7) * 100}%` }}>
                            </div>

                            {['Script', 'Director', 'Cast', 'Crew', 'Gear', 'Loc', 'Tone', 'Go'].map((s, idx) => {
                                const stepIdx = ['SELECT_SCRIPT', 'DIRECTOR', 'CAST', 'CREW', 'EQUIPMENT', 'LOCATION', 'TONE', 'CONFIRM', 'BUZZ'].indexOf(step);
                                const isActive = idx === stepIdx;
                                const isCompleted = idx < stepIdx;
                                const canNavigate = selectedScriptId !== null && step !== 'BUZZ'; // Lock nav during BUZZ

                                return (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            if (canNavigate) {
                                                const steps = ['SELECT_SCRIPT', 'DIRECTOR', 'CAST', 'CREW', 'EQUIPMENT', 'LOCATION', 'TONE', 'CONFIRM'];
                                                setStep(steps[idx] as any);
                                            }
                                        }}
                                        disabled={!canNavigate}
                                        className={`flex flex-col items-center gap-1.5 relative group ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                    >
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all duration-500 ${
                                            isActive
                                            ? 'bg-emerald-500 border-emerald-300 text-black scale-110 shadow-[0_0_15px_rgba(16,185,129,0.6)] z-10'
                                            : isCompleted
                                            ? 'bg-emerald-900 border-emerald-600 text-emerald-400 group-hover:bg-emerald-800'
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-700 group-hover:border-zinc-600'
                                        }`}>
                                            {isCompleted ? <Check size={12} strokeWidth={4} /> : idx + 1}
                                        </div>
                                        <span className={`text-[7px] font-bold uppercase tracking-tighter transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                            {s}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                {step === 'SELECT_SCRIPT' && (
                    <div className="space-y-6 max-w-5xl mx-auto px-4 pt-6 pb-44">
                        {scripts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 animate-in fade-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <BookOpen size={48} className="opacity-20" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">No Scripts Available</h2>
                                <p className="text-sm max-w-xs text-center leading-relaxed">Your development lab is empty. Head back to the studio to develop new IP.</p>
                                <button onClick={onBack} className="mt-8 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 shadow-lg">Return to Studio</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                                {scripts.map(script => (
                                    <button
                                        key={script.id}
                                        onClick={() => setSelectedScriptId(script.id)}
                                        className={`relative group text-left transition-all duration-500 hover:-translate-y-2 ${selectedScriptId === script.id ? 'scale-105 z-10' : 'hover:scale-105'}`}
                                    >
                                        {/* Script Dossier Visual */}
                                        <div className={`h-[320px] rounded-xl border-2 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl ${
                                            selectedScriptId === script.id
                                            ? 'bg-zinc-900 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                                        }`}>
                                            {/* Background Pattern */}
                                            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                                            {/* Top Section */}
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                        script.projectType === 'MOVIE'
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                                    }`}>
                                                        {script.projectType}
                                                    </div>
                                                    {selectedScriptId === script.id && <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-in zoom-in"><Check size={14} strokeWidth={3} /></div>}
                                                </div>

                                                <h3 className={`text-2xl font-black uppercase leading-none mb-2 ${selectedScriptId === script.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                                    {script.title}
                                                </h3>
                                                <div className="flex flex-wrap gap-1 mb-4">
                                                    {script.genres.map(g => (
                                                        <span key={g} className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">#{g}</span>
                                                    ))}
                                                </div>

		                                                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed italic">
		                                                    "{script.logline || "A compelling story waiting to be told..."}"
		                                                </p>
		                                            </div>

                                            {/* Bottom Stats */}
                                            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold uppercase text-zinc-600">Script Quality</span>
                                                    <div className="flex items-center gap-1">
                                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                                        <span className="text-sm font-mono font-bold text-white">{script.quality}/100</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold uppercase text-zinc-600">Dev Time</span>
                                                    <span className="text-xs font-mono text-zinc-400">{script.weeksInDevelopment} Weeks</span>
                                                </div>
                                            </div>
		                                        </div>
		                                    </button>
		                                ))}
                            </div>
                        )}

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={onBack}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold py-4 rounded-xl transition-colors border border-zinc-700 backdrop-blur-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => selectedScriptId && setStep('DIRECTOR')}
                                    disabled={!selectedScriptId}
                                    className={`flex-[2] font-black uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 ${
                                        selectedScriptId
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    }`}
                                >
                                    Next: Director
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DIRECTOR STEP */}
                {step === 'DIRECTOR' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto px-4 pt-6 pb-44">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-6 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Hire a Director</h2>
                            <p className="text-zinc-400 text-sm">The visionary who will lead your project. Choose wisely—their style affects the movie's outcome.</p>
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                                <Clock size={12} />
                                Roster refreshes every 3 weeks
                            </div>
                        </div>

                        <CrewSelector
                                title="Director"
                                icon={<Video size={16} />}
                                role="DIRECTOR"
                                candidates={availableDirectors}
                                selectedId={selectedCrew.director}
                                onSelect={(id) => setSelectedCrew({ ...selectedCrew, director: id })}
                                mode={crewModes.director}
                                onModeChange={(m) => setCrewModes({ ...crewModes, director: m })}
                                player={player}
                                hiredIds={hiredIds}
                                inHouseQuality={getInHouseQuality('DIRECTOR')}
                                inHouseFame={getInHouseFame('DIRECTOR')}
                                inHouseLevel={getInHouseLevel('DIRECTOR')}
                                returningTalent={currentReturningTalent}
                                onNegotiate={(talentId, returningData) => handleNegotiate(talentId, returningData)}
                            />

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => initialConcept ? onBack() : setStep('SELECT_SCRIPT')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                                >
                                    {initialConcept ? 'Exit' : 'Back'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (crewModes.director === 'HIRE' && !selectedCrew.director) return;
                                        saveDraft();
                                        setStep('CAST');
                                    }}
                                    disabled={crewModes.director === 'HIRE' && !selectedCrew.director}
                                    className={`flex-[2] font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 ${
                                        (crewModes.director === 'HIRE' && !selectedCrew.director)
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                    }`}
                                >
                                    Next: Casting
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CAST STEP */}
                {step === 'CAST' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto px-4 pt-6 pb-44">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-6 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Assemble The Cast</h2>
                            <p className="text-zinc-400 text-sm">Star power drives box office, but talent drives reviews. Name the characters too, even for standalone projects.</p>
                        </div>

                        {/* Actor Selection Overlay moved to end of file */}

                        <div className="space-y-3">
	                            {castList.map((role, idx) => {
	                                const assignedActor = role.actorId && role.actorId !== 'STUDIO_STAFF' ? availableActors.find(a => a.id === role.actorId) : null;
	                                const isSelf = role.actorId === 'PLAYER_SELF';
	                                const isStudio = role.actorId === 'STUDIO_STAFF';
	                                const isConnection = role.actorId && !assignedActor && !isSelf && !isStudio;
	                                const connection = isConnection ? player.relationships.find(r => (r.npcId || r.id) === role.actorId) : null;
                                    const selectedCharacterOption = getRoleCharacterOption(role);
                                    const selectedCharacterValue = getRoleCharacterOptionValue(role);
                                    const isKnownRole = !!selectedCharacterOption || isKnownConnectedRole(role);
                                    const usedCharacterValues = new Set(
                                        castList
                                            .filter(otherRole => otherRole.id !== role.id)
                                            .map(otherRole => getRoleCharacterOptionValue(otherRole))
                                            .filter(Boolean)
                                    );
                                    const availableCharacterOptions = linkedCharacterOptions.filter(character => {
                                        const value = getCharacterOptionValue(character);
                                        return value === selectedCharacterValue || !usedCharacterValues.has(value);
                                    });
                                    const characterFlowHelp = allowsOutsideConnectedCharacters
                                        ? 'Crossover/Event: choose from this project plus other owned connected IP.'
                                        : previousCharacterOptions.length > 0
                                            ? 'Sequel: continuing characters from the previous movie or franchise.'
                                            : activeUniverseId
                                                ? 'Universe: choose characters from the selected universe.'
                                                : 'Standalone: name a new character for this movie.';
                                    const returningData = role.actorId
                                        ? currentReturningTalent.find(t => t.id === role.actorId && (t.role === 'LEAD_ACTOR' || t.role === 'SUPPORTING_ACTOR'))
                                        : null;
                                    const talentScore = isSelf
                                        ? Math.round(player.stats.talent || 0)
                                        : isStudio
                                            ? getInHouseQuality('ACTOR')
                                            : assignedActor
                                                ? Math.round(assignedActor.stats.talent || 50)
                                                : role.actorId
                                                    ? 45
                                                    : null;
                                    const fameScore = isSelf
                                        ? Math.round(player.stats.fame || 0)
                                        : isStudio
                                            ? getInHouseFame('ACTOR')
                                            : assignedActor
                                                ? Math.round(assignedActor.stats.fame || 0)
                                                : role.actorId
                                                    ? 15
                                                    : null;
                                    const feeDisplay = isSelf || isStudio
                                        ? 'Free'
                                        : (role.actorId && contractedActors.some(a => a.id === role.actorId))
                                            ? 'Contracted'
                                            : returningData && requiresReturningTalentNegotiation(returningData)
                                                ? 'Needs Deal'
                                                : returningData && !returningData.accepted && (returningData.attemptsLeft ?? 0) === 0
                                                    ? 'Walked Away'
                                                    : formatMoney(role.salary || 0);

	                                return (
	                                    <div key={role.id} className="relative overflow-hidden bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 animate-in slide-in-from-bottom-2 hover:border-zinc-700 transition-all">
	                                        <button
	                                            onClick={() => setCastList(prev => prev.filter(r => r.id !== role.id))}
	                                            className="absolute top-3 right-3 p-2 text-zinc-600 hover:text-rose-500 transition-colors z-10 bg-black/40 rounded-full"
	                                            title="Remove Role"
	                                        >
	                                            <X size={16} />
	                                        </button>

                                        <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr_auto] gap-4 items-start pr-10 sm:pr-0">
	                                            <div className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border overflow-hidden ${assignedActor || isSelf || isStudio || connection ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
	                                                {isSelf ? (
	                                                    <div className="w-full h-full bg-amber-500/10 flex items-center justify-center overflow-hidden">
	                                                        {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Crown size={20} className="text-amber-500" />}
                                                    </div>
                                                ) : isStudio ? (
                                                    <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                                                        <Users size={20} className="text-emerald-500" />
                                                    </div>
                                                ) : connection ? (
                                                    <img src={connection.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : assignedActor ? (
                                                    <img src={assignedActor.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
	                                                    <Users size={20} />
	                                                )}
	                                            </div>
	                                            <div className="min-w-0 space-y-3">
	                                                <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
	                                                    <select
	                                                        value={role.roleType || 'SUPPORTING'}
	                                                        onChange={(e) => {
	                                                            const newType = e.target.value as any;
	                                                            setCastList(prev => prev.map(r => r.id === role.id ? { ...r, roleType: newType, role: newType === 'LEAD' ? 'Lead Actor' : newType === 'SUPPORTING' ? 'Supporting Actor' : newType === 'CAMEO' ? 'Cameo Appearance' : 'Extra' } : r));
	                                                        }}
	                                                        className="bg-black/50 border border-zinc-800 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-emerald-500 hover:border-zinc-700 transition-colors cursor-pointer"
	                                                        onClick={(e) => e.stopPropagation()}
	                                                    >
	                                                        <option value="LEAD">Lead Role</option>
	                                                        <option value="SUPPORTING">Supporting</option>
                                                        <option value="CAMEO">Cameo</option>
	                                                        <option value="EXTRA">Extra</option>
	                                                    </select>
                                                            {returningData && <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-[9px] font-black uppercase tracking-widest">Returning</span>}
                                                            {isKnownRole && <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-[9px] font-black uppercase tracking-widest">Known Character</span>}
                                                            </div>
	                                                    {role.actorId ? (
	                                                        <div className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
	                                                            {role.actorName || 'Selected Actor'}
	                                                        </div>
	                                                    ) : (
	                                                        <div className="text-base sm:text-xl font-black text-zinc-500 italic">Pending Audition</div>
	                                                    )}
                                                        </div>
	                                                </div>

	                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {linkedCharacterOptions.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <label className="block text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                                                        Playing Character
                                                                    </label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowCharacterFlowInfo(prev => !prev)}
                                                                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                                            showCharacterFlowInfo
                                                                                ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                                                                : 'border-zinc-700 bg-black/30 text-zinc-500 hover:text-white'
                                                                        }`}
                                                                        aria-label="Explain playing character"
                                                                    >
                                                                        <Info size={11} />
                                                                    </button>
                                                                </div>
                                                                <select
                                                                    value={selectedCharacterValue}
                                                                    onChange={(e) => {
                                                                        const selectedValue = e.target.value;
                                                                        const selectedCharacter = linkedCharacterOptions.find(character => getCharacterOptionValue(character) === selectedValue);
                                                                        if (selectedCharacter) {
                                                                            attachLinkedCharacterToRole(role.id, selectedCharacter);
                                                                        } else {
                                                                            setCastList(prev => prev.map(r => r.id === role.id ? {
                                                                                ...r,
                                                                                characterId: undefined,
                                                                                characterName: '',
                                                                                sourceUniverseId: undefined
                                                                            } : r));
                                                                        }
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                                                >
                                                                    <option value="">Create New Character</option>
                                                                    {availableCharacterOptions.map(character => (
                                                                        <option key={getCharacterOptionValue(character)} value={getCharacterOptionValue(character)}>
                                                                            {character.name} {character.actorName ? `(${character.actorName})` : ''} - {character.sourceName}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <p className="mt-1 text-[9px] text-zinc-600 leading-snug">{characterFlowHelp}</p>
                                                            </div>
                                                        )}
	                                                    <div className={linkedCharacterOptions.length > 0 ? '' : 'sm:col-span-2'}>
	                                                        <label className="block text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
	                                                            {selectedCharacterOption ? 'Character Identity' : 'New Character Name'}
	                                                        </label>
                                                            {selectedCharacterOption ? (
                                                                <div className="min-h-[42px] flex items-center justify-between gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2.5">
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-black text-blue-100 truncate">{role.characterName || selectedCharacterOption.name}</p>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-300/70 truncate">{selectedCharacterOption.sourceName}</p>
                                                                    </div>
                                                                    <CheckCircle size={15} className="text-blue-300 shrink-0" />
                                                                </div>
                                                            ) : (
	                                                        <input
	                                                            value={role.characterName || ''}
	                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setCastList(prev => prev.map(r => r.id === role.id ? {
                                                                    ...r,
                                                                    characterName: value,
                                                                    characterId: activeUniverseId ? toUniverseCharacterId(activeUniverseId, value) : undefined,
                                                                    sourceUniverseId: undefined
                                                                } : r));
                                                            }}
                                                            onBlur={() => {
                                                                setCastList(prev => prev.map((r, roleIndex) => r.id === role.id && !r.characterName?.trim() ? {
                                                                    ...r,
                                                                    characterName: getDefaultCharacterName(r, roleIndex),
                                                                    characterId: activeUniverseId ? toUniverseCharacterId(activeUniverseId, getDefaultCharacterName(r, roleIndex)) : undefined,
                                                                    sourceUniverseId: undefined
                                                                } : r));
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
	                                                            placeholder={role.roleType === 'LEAD' ? `e.g. ${selectedScript?.title || 'Iron Man'}` : getDefaultCharacterName(role, idx)}
	                                                            className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
	                                                        />
                                                            )}
	                                                    </div>
	                                                </div>
                                                    {showCharacterFlowInfo && (
                                                        <div className="bg-black/35 border border-blue-500/20 rounded-xl p-3">
                                                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                                                Existing characters can only be used once in this cast. Sequels continue the last movie's characters, universe projects use that universe roster, and outside owned IP appears only for crossover or event plans.
                                                            </p>
                                                        </div>
                                                    )}

	                                                {role.actorId && (
	                                                    <div className="grid grid-cols-3 gap-2">
	                                                        {[
                                                                ['Talent', talentScore, 'text-emerald-300'],
                                                                ['Fame', fameScore, 'text-rose-300'],
                                                                ['Fee', feeDisplay, returningData && requiresReturningTalentNegotiation(returningData) ? 'text-purple-300' : 'text-amber-300']
                                                            ].map(([label, value, color]) => (
                                                                <div key={String(label)} className="bg-black/30 border border-zinc-800 rounded-xl px-3 py-2 min-w-0">
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                                                                    <p className={`text-xs font-black font-mono truncate ${color}`}>{value}</p>
                                                                </div>
                                                            ))}
	                                                    </div>
	                                                )}
	                                            </div>
	                                        <div className="sm:w-32 flex sm:flex-col gap-2 w-full col-span-2 sm:col-span-1">
                                                {returningData && requiresReturningTalentNegotiation(returningData) && role.actorId ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleNegotiate(role.actorId!, returningData, role.id);
                                                        }}
                                                        className="flex-1 sm:flex-none text-[10px] px-4 py-3 rounded-xl uppercase font-black tracking-widest bg-purple-500/15 text-purple-200 border border-purple-500/25 hover:bg-purple-500/25 transition-all"
                                                    >
                                                        Negotiate
                                                    </button>
                                                ) : null}
	                                            <button
	                                                onClick={() => setSelectingActorFor(role.id)}
	                                                className={`flex-1 sm:flex-none text-[10px] px-4 py-3 rounded-xl border uppercase font-black tracking-widest transition-all ${
	                                                    assignedActor || isSelf || isStudio || connection
	                                                    ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
	                                                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-white'
	                                                }`}
	                                            >
	                                                {assignedActor || isSelf || isStudio || connection ? 'Change' : 'Select'}
	                                            </button>
	                                        </div>
                                        </div>
	                                    </div>
	                                );
                            })}
                            <button
                                onClick={() => setCastList([...castList, { id: `role_${Date.now()}`, role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null }])}
                                className="w-full py-5 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-3 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors shadow-inner"><Plus size={16} /></div>
                                Add Another Role
                            </button>
                        </div>

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => setStep('DIRECTOR')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-black uppercase tracking-widest py-5 rounded-2xl border border-zinc-700 backdrop-blur-md transition-all active:scale-95"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        if (castList.some(c => !c.actorId)) return;
                                        saveDraft();
                                        setStep('CREW');
                                    }}
                                    disabled={castList.some(c => !c.actorId)}
                                    className={`flex-[2] font-black uppercase tracking-widest py-5 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                                        castList.some(c => !c.actorId)
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                    }`}
                                >
                                    Next: Crew
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CREW STEP */}
                {step === 'CREW' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto px-4 pt-6 pb-44">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-6 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Build Your Team</h2>
                            <p className="text-zinc-400 text-sm">Great movies are made by great teams. Hire the best or save money with in-house staff.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CrewSelector
                                title="Cinematographer"
                                icon={<Camera size={16} />}
                                role="CINEMATOGRAPHER"
                                candidates={mockCrew.cinematographers}
                                selectedId={selectedCrew.cinematographer}
                                onSelect={(id) => setSelectedCrew({ ...selectedCrew, cinematographer: id })}
                                mode={crewModes.cinematographer}
                                onModeChange={(m) => setCrewModes({ ...crewModes, cinematographer: m })}
                                player={player}
                                hiredIds={hiredIds}
                                inHouseQuality={getInHouseQuality('CINEMATOGRAPHER')}
                                inHouseFame={getInHouseFame('CINEMATOGRAPHER')}
                                inHouseLevel={getInHouseLevel('CINEMATOGRAPHER')}
                                returningTalent={currentReturningTalent}
                                onNegotiate={(talentId, returningData) => handleNegotiate(talentId, returningData)}
                            />
                            <CrewSelector
                                title="Composer"
                                icon={<Mic size={16} />}
                                role="COMPOSER"
                                candidates={mockCrew.composers}
                                selectedId={selectedCrew.composer}
                                onSelect={(id) => setSelectedCrew({ ...selectedCrew, composer: id })}
                                mode={crewModes.composer}
                                onModeChange={(m) => setCrewModes({ ...crewModes, composer: m })}
                                player={player}
                                hiredIds={hiredIds}
                                inHouseQuality={getInHouseQuality('COMPOSER')}
                                inHouseFame={getInHouseFame('COMPOSER')}
                                inHouseLevel={getInHouseLevel('COMPOSER')}
                                returningTalent={currentReturningTalent}
                                onNegotiate={(talentId, returningData) => handleNegotiate(talentId, returningData)}
                            />
                            <CrewSelector
                                title="Line Producer"
                                icon={<Briefcase size={16} />}
                                role="LINE_PRODUCER"
                                candidates={mockCrew.producers}
                                selectedId={selectedCrew.lineProducer}
                                onSelect={(id) => setSelectedCrew({ ...selectedCrew, lineProducer: id })}
                                mode={crewModes.lineProducer}
                                onModeChange={(m) => setCrewModes({ ...crewModes, lineProducer: m })}
                                player={player}
                                hiredIds={hiredIds}
                                inHouseQuality={getInHouseQuality('LINE_PRODUCER')}
                                inHouseFame={getInHouseFame('LINE_PRODUCER')}
                                inHouseLevel={getInHouseLevel('LINE_PRODUCER')}
                                returningTalent={currentReturningTalent}
                                onNegotiate={(talentId, returningData) => handleNegotiate(talentId, returningData)}
                            />
                            <CrewSelector
                                title="VFX & Post"
                                icon={<Zap size={16} className="text-cyan-400"/>}
                                role="VFX"
                                candidates={mockCrew.vfxTeams}
                                selectedId={selectedCrew.vfx}
                                onSelect={(id) => setSelectedCrew({ ...selectedCrew, vfx: id })}
                                mode={crewModes.vfx}
                                onModeChange={(m) => setCrewModes({ ...crewModes, vfx: m })}
                                player={player}
                                hiredIds={hiredIds}
                                inHouseQuality={getInHouseQuality('VFX')}
                                inHouseFame={getInHouseFame('VFX')}
                                inHouseLevel={getInHouseLevel('VFX')}
                                returningTalent={currentReturningTalent}
                                onNegotiate={(talentId, returningData) => handleNegotiate(talentId, returningData)}
                            />
                        </div>

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => setStep('CAST')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep('EQUIPMENT')}
                                    className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
                                >
                                    Next: Equipment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EQUIPMENT STEP */}
                {step === 'EQUIPMENT' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto px-4 pt-6 pb-44">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-6 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Equipment & Gear</h2>
                            <p className="text-zinc-400 text-sm">Rent gear or use your studio's owned equipment to boost quality.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                {
                                    id: 'cameras', name: 'Camera Rigs', icon: '🎥', color: 'text-purple-400',
                                    tiers: {
                                        'TIER_1': { name: 'Indie Kit', desc: 'Basic DSLR and mirrorless setup.' },
                                        'TIER_2': { name: 'Prosumer Setup', desc: 'RED Komodo or similar mid-tier.' },
                                        'TIER_3': { name: 'Panavision Standard', desc: 'Industry standard digital cinema cameras.' },
                                        'TIER_4': { name: 'IMAX & Arri Rental', desc: 'Custom large-format rigs and lenses.' },
                                        'TIER_5': { name: 'Experimental Tech', desc: 'Cutting-edge prototypes.' }
                                    }
                                },
                                {
                                    id: 'lighting', name: 'Lighting & Grip', icon: '💡', color: 'text-amber-400',
                                    tiers: {
                                        'TIER_1': { name: 'Basic Reflectors', desc: 'Natural light and bounce boards.' },
                                        'TIER_2': { name: 'LED Panel Kit', desc: 'Portable LED lighting setup.' },
                                        'TIER_3': { name: 'CineGrip Co.', desc: 'Standard LED panels and grip trucks.' },
                                        'TIER_4': { name: 'Luminance Pro', desc: 'Stadium arrays and specialized rigs.' },
                                        'TIER_5': { name: 'Sun-Sync Tech', desc: 'Massive artificial sunlight arrays.' }
                                    }
                                },
                                {
                                    id: 'sound', name: 'Sound Engineering', icon: '🎙️', color: 'text-emerald-400',
                                    tiers: {
                                        'TIER_1': { name: 'Zoom Recorder', desc: 'Basic field recorder and lavs.' },
                                        'TIER_2': { name: 'Pro Boom Kit', desc: 'High-quality shotgun mics.' },
                                        'TIER_3': { name: 'ClearAudio Rentals', desc: 'Professional boom mics and recorders.' },
                                        'TIER_4': { name: 'Dolby Atmos Stage', desc: 'Full spatial audio capture setup.' },
                                        'TIER_5': { name: 'Neural Audio Lab', desc: 'AI-enhanced perfect isolation.' }
                                    }
                                },
                                {
                                    id: 'practicalEffects', name: 'Practical Sets', icon: '📦', color: 'text-blue-400',
                                    tiers: {
                                        'TIER_1': { name: 'Garage Studio', desc: 'DIY sets and basic props.' },
                                        'TIER_2': { name: 'Indie Warehouse', desc: 'Rented space with modular walls.' },
                                        'TIER_3': { name: 'Studio B Backlot', desc: 'Standard warehouse and basic sets.' },
                                        'TIER_4': { name: 'Pinewood Stages', desc: 'Massive soundstages and custom builds.' },
                                        'TIER_5': { name: 'Volume Stage', desc: 'Massive LED volume for virtual production.' }
                                    }
                                }
                            ].map(gear => {
                                const ownedLevel = studio.studioState?.equipment?.[gear.id as keyof StudioEquipment] || 0;
                                const choice = equipmentChoices[gear.id];

                                return (
                                    <div key={gear.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                            <span className="text-lg">{gear.icon}</span> {gear.name}
                                        </h3>

                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setEquipmentChoices(prev => ({ ...prev, [gear.id]: 'OWNED' }))}
                                                disabled={ownedLevel === 0}
                                                className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${
                                                    choice === 'OWNED' ? 'bg-emerald-500/10 border-emerald-500 text-white' :
                                                    ownedLevel === 0 ? 'bg-zinc-950 border-zinc-800/50 text-zinc-600 cursor-not-allowed' :
                                                    'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-bold text-sm">Use Owned Gear</div>
                                                    <div className="text-[10px] opacity-80">Level {ownedLevel} ({getEquipmentStageName(gear.id, ownedLevel)})</div>
                                                    <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Quality +{ownedLevel * 3}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-emerald-400">$0</div>
                                                    <div className="text-[9px] uppercase">Cost</div>
                                                </div>
                                            </button>

                                            {Object.entries(GEAR_TIERS).map(([tierKey, tierData]) => {
                                                const specificData = gear.tiers[tierKey as keyof typeof gear.tiers];
                                                const isSelected = choice === tierKey;

                                                // Determine color based on tier
                                                let colorClass = 'text-blue-400';
                                                let bgClass = 'bg-blue-500/10 border-blue-500';
                                                if (tierKey === 'TIER_1') { colorClass = 'text-zinc-400'; bgClass = 'bg-zinc-500/10 border-zinc-500'; }
                                                if (tierKey === 'TIER_2') { colorClass = 'text-green-400'; bgClass = 'bg-green-500/10 border-green-500'; }
                                                if (tierKey === 'TIER_4') { colorClass = 'text-purple-400'; bgClass = 'bg-purple-500/10 border-purple-500'; }
                                                if (tierKey === 'TIER_5') { colorClass = 'text-amber-400'; bgClass = 'bg-amber-500/10 border-amber-500'; }

                                                return (
                                                    <button
                                                        key={tierKey}
                                                        onClick={() => setEquipmentChoices(prev => ({ ...prev, [gear.id]: tierKey }))}
                                                        className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${
                                                            isSelected ? `${bgClass} text-white` :
                                                            'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm">{specificData.name}</div>
                                                            <div className="text-[10px] opacity-80">{specificData.desc}</div>
                                                            <div className={`text-[10px] ${colorClass} font-bold mt-0.5`}>Quality +{tierData.quality}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`font-mono font-bold ${colorClass}`}>{formatMoney(tierData.cost)}</div>
                                                            <div className="text-[9px] uppercase">Cost</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => setStep('CREW')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep('LOCATION')}
                                    className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
                                >
                                    Next: Location
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOCATION STEP */}
                {step === 'LOCATION' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full max-w-4xl mx-auto px-4 pt-6 pb-56">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-2 shrink-0 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Scout Location</h2>
                            <p className="text-zinc-400 text-sm">Where will your story be told? Locations affect budget and visual quality.</p>
                        </div>

                        <div className="flex-1 min-h-[400px] relative">
                             <LocationSelector
                                selectedIds={selectedLocations}
                                onSelect={(id) => {
                                    setSelectedLocations(prev =>
                                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                    );
                                }}
                                locations={mockLocations}
                                findLocation={findLocation}
                            />
                        </div>

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => setStep('EQUIPMENT')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedLocations.length === 0) return;
                                        saveDraft();
                                        setStep('TONE');
                                    }}
                                    disabled={selectedLocations.length === 0}
                                    className={`flex-[2] font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 ${
                                        selectedLocations.length === 0
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                    }`}
                                >
                                    Next: Tone & Style
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TONE STEP */}
                {step === 'TONE' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full max-w-4xl mx-auto px-4 pt-6 pb-44 overflow-y-auto custom-scrollbar">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-2 shrink-0 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Tone & Style</h2>
                            <p className="text-zinc-400 text-sm">Define the artistic vision for your project.</p>
                        </div>

                        <div className="space-y-8 pb-20">
                            {/* Visual Style Selection */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                    <Palette size={16} className="text-emerald-400" /> Visual Style
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'REALISTIC', name: 'Realistic', desc: 'Grounded and authentic.', icon: '🎥' },
                                        { id: 'STYLISTIC', name: 'Stylistic', desc: 'Bold and artistic.', icon: '🎨' },
                                        { id: 'GRITTY', name: 'Gritty', desc: 'Dark and raw.', icon: '🌑' },
                                        { id: 'VIBRANT', name: 'Vibrant', desc: 'Colorful and energetic.', icon: '🌈' },
                                        { id: 'MINIMALIST', name: 'Minimalist', desc: 'Clean and simple.', icon: '⚪' },
                                        { id: 'NOIR', name: 'Noir', desc: 'High contrast and moody.', icon: '🕶️' },
                                    ].map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setVisualStyle(style.id as any)}
                                            className={`p-4 rounded-xl border text-left transition-all group ${
                                                visualStyle === style.id
                                                ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{style.icon}</div>
                                            <div className="font-black text-xs uppercase tracking-wider mb-1">{style.name}</div>
                                            <div className="text-[10px] opacity-60 leading-tight">{style.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pacing Selection */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={16} className="text-amber-400" /> Pacing
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { id: 'SLOW', name: 'Slow Burn', desc: 'Patient and atmospheric.', icon: '🕯️' },
                                        { id: 'MODERATE', name: 'Moderate', desc: 'Balanced and steady.', icon: '⚖️' },
                                        { id: 'FAST', name: 'Fast-Paced', desc: 'Quick and engaging.', icon: '⚡' },
                                        { id: 'FRENETIC', name: 'Frenetic', desc: 'High energy and chaotic.', icon: '🌪️' },
                                    ].map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPacing(p.id as any)}
                                            className={`p-4 rounded-xl border text-center transition-all group ${
                                                pacing === p.id
                                                ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="text-2xl mb-2 group-hover:rotate-12 transition-transform">{p.icon}</div>
                                            <div className="font-black text-[10px] uppercase tracking-wider mb-1">{p.name}</div>
                                            <div className="text-[9px] opacity-60 leading-tight">{p.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tone Slider */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <div className="flex justify-between text-sm font-bold mb-4">
                                    <span className={tone < 50 ? 'text-emerald-400' : 'text-zinc-500'}>Practical Effects</span>
                                    <span className={tone > 50 ? 'text-purple-400' : 'text-zinc-500'}>CGI Heavy</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={tone}
                                    onChange={(e) => setTone(parseInt(e.target.value))}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="mt-4 text-center text-xs text-zinc-400">
                                    {tone < 30 ? 'Focus on practical sets and stunts.' :
                                     tone > 70 ? 'Heavy reliance on visual effects.' :
                                     'Balanced approach.'}
                                </div>
                            </div>

                            {/* Universe & Franchise Connection */}
                            <div className="space-y-6">
                                <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                <Clapperboard size={16} className="text-emerald-400" /> Story Connection
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setShowStoryConnectionInfo(prev => !prev)}
                                                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                                                    showStoryConnectionInfo
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                                        : 'border-zinc-700 bg-black/30 text-zinc-500 hover:text-white hover:border-zinc-500'
                                                }`}
                                                aria-label="Explain story connection"
                                            >
                                                <Info size={13} />
                                            </button>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                            {linkedUniverseCastCount} known cast
                                        </span>
                                    </div>
                                    {showStoryConnectionInfo && (
                                        <div className="bg-black/35 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                                            <p className="text-xs text-zinc-300 leading-relaxed">
                                                This tells the game what kind of IP movie you are making, so it can set validation, subtype, continuity risk, and fan expectations.
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {[
                                                    ['Auto', 'Game picks the best plan from your cast and script.'],
                                                    ['Solo', 'A normal franchise or universe chapter with its own main story.'],
                                                    ['Crossover', 'Needs 1 known character pulled into the cast.'],
                                                    ['Event', 'Needs 3 known characters, like a major universe team-up.'],
                                                    ['Reboot', 'Starts a new era for an existing universe or franchise.']
                                                ].map(([label, body]) => (
                                                    <div key={label} className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">{label}</p>
                                                        <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">{body}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                        {[
                                            { id: 'AUTO', label: 'Auto', hint: 'Best fit' },
                                            { id: 'SOLO', label: 'Solo', hint: 'Own story' },
                                            { id: 'CROSSOVER', label: 'Crossover', hint: '1+ known role' },
                                            { id: 'EVENT', label: 'Event', hint: '3+ known roles' },
                                            { id: 'REBOOT', label: 'Reboot', hint: 'New era' }
                                        ].map(option => {
                                            const isSelected = connectedProjectIntent === option.id;
                                            const isEffective = effectiveConnectedIntent === option.id || (connectedProjectIntent === 'AUTO' && option.id === effectiveConnectedIntent);
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => setConnectedProjectIntent(option.id as ConnectedProjectIntent)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                        isSelected
                                                            ? 'bg-emerald-500/10 border-emerald-500 text-white'
                                                            : isEffective
                                                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-100'
                                                                : 'bg-black/25 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="text-[10px] font-black uppercase tracking-widest">{option.label}</div>
                                                    <div className="mt-1 text-[9px] opacity-60 leading-tight">{option.hint}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                        Current plan: <span className="text-emerald-300">{effectiveConnectedIntent}</span>
                                        {effectiveConnectedIntent === 'EVENT' ? ' • needs three known characters' : effectiveConnectedIntent === 'CROSSOVER' ? ' • needs one known character' : ''}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <Globe size={16} className="text-blue-400" /> Universe Connection
                                    </h3>
                                    {selectedUniverseId && (
                                        <button
                                            onClick={() => setSelectedUniverseId(null)}
                                            className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest"
                                        >
                                            Disconnect
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(Object.values(normalizeUniverseMap(player.world?.universes || {})) as Universe[]).filter(u => u.studioId === studio.id).map((universe) => (
                                        <button
                                            key={universe.id}
                                            onClick={() => setSelectedUniverseId(universe.id)}
                                            className={`p-4 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                                selectedUniverseId === universe.id
                                                ? 'bg-zinc-900 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div
                                                className="absolute top-0 right-0 w-16 h-16 opacity-10 blur-xl pointer-events-none"
                                                style={{ backgroundColor: universe.color }}
                                            />
                                            <div className="flex items-center gap-2 mb-2">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: universe.color }}
                                                />
                                                <div className="font-black text-xs uppercase tracking-tight">{universe.name}</div>
                                            </div>
                                            <div className="text-[10px] opacity-60 leading-tight mb-3 line-clamp-2">{universe.description}</div>
                                            <div className="flex justify-between items-center mt-auto">
                                                <div className="text-[9px] font-bold text-blue-400 uppercase">{getUniversePhaseLabel(universe.currentPhase)}</div>
                                                <div className="text-[9px] font-mono text-zinc-500">MOM: {universe.momentum}%</div>
                                            </div>
                                        </button>
                                    ))}

                                    {/* Create New Universe Option */}
                                    <button
                                        onClick={() => setSelectedUniverseId(selectedUniverseId === 'NEW' ? null : 'NEW')}
                                        className={`p-4 rounded-xl border text-left transition-all group relative overflow-hidden ${
                                            selectedUniverseId === 'NEW'
                                            ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-400">
                                                <Plus size={16} />
                                            </div>
                                            <div>
                                                <div className="font-black text-xs uppercase tracking-tight">Create New Universe</div>
                                                <div className="text-[10px] text-zinc-500">Found a new cinematic universe.</div>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {selectedUniverseId === 'NEW' && (
                                    <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Universe Name</label>
                                        <input
                                            type="text"
                                            value={newUniverseName}
                                            onChange={(e) => setNewUniverseName(e.target.value)}
                                            placeholder="e.g. The Cosmic Saga"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                        <p className="text-[10px] text-zinc-500 italic">This will establish a new IP owned by your studio.</p>
                                    </div>
                                )}

                                {/* Franchise Selection */}
                                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <Layers size={16} className="text-amber-400" /> Franchise Connection
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Existing Franchises */}
                                        {studioFranchises.map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => setSelectedFranchiseId(f.id)}
                                                className={`p-4 rounded-xl border text-left transition-all ${
                                                    selectedFranchiseId === f.id
                                                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-black text-xs uppercase tracking-tight">{f.name}</div>
                                                    <div className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase">{f.genre}</div>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    <div className="text-[10px] text-zinc-500">Part {f.lastInstallment + 1}</div>
                                                    <div className="text-[10px] text-amber-400 font-bold uppercase">Established</div>
                                                </div>
                                            </button>
                                        ))}

                                        {/* New Franchise Option */}
                                        <button
                                            onClick={() => setSelectedFranchiseId(selectedFranchiseId === 'NEW' ? null : 'NEW')}
                                            className={`p-4 rounded-xl border text-left transition-all ${
                                                selectedFranchiseId === 'NEW'
                                                ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400">
                                                    <Plus size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-xs uppercase tracking-tight">Start New Franchise</div>
                                                    <div className="text-[10px] text-zinc-500">Establish this project as a series starter.</div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Standalone Option */}
                                        <button
                                            onClick={() => setSelectedFranchiseId(null)}
                                            className={`p-4 rounded-xl border text-left transition-all ${
                                                selectedFranchiseId === null
                                                ? 'bg-zinc-800 border-zinc-600 text-white'
                                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                                                    <X size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-xs uppercase tracking-tight">Standalone Project</div>
                                                    <div className="text-[10px] text-zinc-500">No franchise or universe connection.</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => setStep('LOCATION')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        saveDraft();
                                        setStep('CONFIRM');
                                    }}
                                    className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
                                >
                                    Review Package
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONFIRM STEP */}
                {step === 'CONFIRM' && selectedScript && (
                    <div className="max-w-2xl mx-auto px-4 pt-10 pb-nav-safe-lg animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                        {/* Production Budget Approval Document */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Production Approval</div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{selectedScript.title}</h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-mono text-zinc-500">REF: {Date.now().toString().slice(-8)}</div>
                                    <div className="text-emerald-500 font-bold text-xs uppercase">Ready for Greenlight</div>
                                </div>
                            </div>

                            {/* Universe & Franchise Summary */}
                            {(selectedUniverseId || selectedFranchiseId || effectiveConnectedIntent !== 'SOLO') && (
                                <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <Clapperboard size={12} className="text-emerald-400" />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                            Type: <span className="text-white">{effectiveConnectedIntent}</span>
                                        </span>
                                    </div>
                                    {selectedUniverseId && (
                                        <div className="flex items-center gap-2">
                                            <Globe size={12} className="text-blue-400" />
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                Universe: <span className="text-white">
                                                    {selectedUniverseId === 'NEW' ? newUniverseName : normalizeUniverseMap(player.world?.universes || {})[selectedUniverseId]?.name}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                    {selectedFranchiseId && (
                                        <div className="flex items-center gap-2">
                                            <Layers size={12} className="text-amber-400" />
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                Franchise: <span className="text-white">
                                                    {selectedFranchiseId === 'NEW' ? 'New Franchise' : studioFranchises.find(f => f.id === selectedFranchiseId)?.name}
                                                    {selectedFranchiseId !== 'NEW' && ` (Part ${(studioFranchises.find(f => f.id === selectedFranchiseId)?.lastInstallment || 0) + 1})`}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

	                            {/* Body */}
	                            <div className="p-6 space-y-6">
                                {linkedCastSummary.length > 0 && (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <div>
                                                <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Connected Cast</h3>
                                                <p className="text-[10px] text-zinc-500 mt-1">
                                                    {linkedCastSummary.length} universe character{linkedCastSummary.length === 1 ? '' : 's'} attached • {effectiveConnectedIntent}
                                                </p>
                                            </div>
                                            {unresolvedReturningTalent.length > 0 && (
                                                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest">
                                                    {unresolvedReturningTalent.length} Pending
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {linkedCastSummary.slice(0, 4).map(role => (
                                                <div key={role.id} className="flex items-center justify-between gap-3 bg-black/25 border border-white/5 rounded-lg px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-white truncate">{role.characterName || role.roleName}</p>
                                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">
                                                            {role.actorName || 'Casting needed'} • {role.roleType}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-mono font-bold text-zinc-200">{formatMoney(role.salary || 0)}</p>
                                                        <p className={`text-[8px] font-black uppercase tracking-widest ${
                                                            role.negotiationStatus === 'Negotiating' ? 'text-amber-300' :
                                                            role.negotiationStatus === 'Declined' ? 'text-rose-300' :
                                                            role.negotiationStatus === 'Uncast' ? 'text-zinc-500' :
                                                            'text-emerald-300'
                                                        }`}>
                                                            {role.negotiationStatus}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {linkedCastSummary.length > 4 && (
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                                    +{linkedCastSummary.length - 4} more connected role{linkedCastSummary.length - 4 === 1 ? '' : 's'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

	                                {/* Above the Line */}
	                                <div>
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Above The Line</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Script Rights</span>
                                            <span className="font-mono text-white">Included</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Director ({getCrewData('director').name})</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.director)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Principal Cast</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.cast)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Below the Line */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Below The Line</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Production Crew</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.crew)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Locations ({selectedLocations.length})</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.locationCost)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Equipment & Gear</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.equipmentCost)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Script & IP Rights</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.scriptCost)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-300">Base Production Costs</span>
                                            <span className="font-mono text-white">{formatMoney(budgetBreakdown.baseCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="bg-zinc-950 rounded-lg p-4 flex justify-between items-center border border-zinc-800 mt-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Estimated Budget</div>
                                        <div className="text-xs text-zinc-600">Subject to variance during production</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-black font-mono ${budgetBreakdown.total > (studio.balance + (studio.studioState?.productionFund || 0) + lockedStreamingFundingAmount) ? 'text-rose-500' : 'text-emerald-400'}`}>
                                            {formatMoney(budgetBreakdown.total)}
                                        </div>
                                        {previousInstallmentCost && (
                                            <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">
                                                Last Part: {formatMoney(previousInstallmentCost)}
                                                <span className={`ml-2 ${budgetBreakdown.total > previousInstallmentCost ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    ({budgetBreakdown.total > previousInstallmentCost ? '+' : ''}{(((budgetBreakdown.total - previousInstallmentCost) / previousInstallmentCost) * 100).toFixed(1)}%)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Production Fund */}
                                {(studio.studioState?.productionFund || 0) > 0 && (
                                    <div className="bg-emerald-950/30 rounded-lg p-4 flex justify-between items-center border border-emerald-500/30 mt-2">
                                        <div>
                                            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Available Production Fund</div>
                                            <div className="text-xs text-emerald-600/70">From previous streaming deals</div>
                                        </div>
                                        <div className="text-xl font-black font-mono text-emerald-400">
                                            - {formatMoney(studio.studioState!.productionFund!)}
                                        </div>
                                    </div>
                                )}

                                {lockedStreamingFundingAmount > 0 && (
                                    <div className="bg-sky-950/30 rounded-lg p-4 flex justify-between items-center border border-sky-500/30 mt-2">
                                        <div>
                                            <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Locked Next Season Cap</div>
                                            <div className="text-xs text-sky-300/70">
                                                {lockedStreamingFunding?.platformName || 'Streaming platform'} funds this season first. Unused cap expires.
                                            </div>
                                        </div>
                                        <div className="text-xl font-black font-mono text-sky-300">
                                            - {formatMoney(lockedStreamingFundingAmount)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Signature */}
                            <div className="bg-zinc-950 p-4 border-t border-zinc-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                                        <Users size={14} />
                                    </div>
                                    <div className="text-xs">
                                        <div className="text-zinc-500 uppercase text-[9px] font-bold">Authorized By</div>
                                        <div className="text-white font-bold">{player.name}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-600">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Greenlight Action */}
                        <div className="space-y-4">
                            {!canGreenlight && greenlightStatus.errors.length > 0 && (
                                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">
                                        <AlertTriangle size={14} /> Missing Requirements
                                    </div>
                                    <ul className="space-y-1">
                                        {greenlightStatus.errors.map((err, i) => (
                                            <li key={i} className="text-[11px] text-rose-200/70 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-rose-500"></div>
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                    {unresolvedReturningTalent.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-rose-500/20 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80">
                                                    Pending Return Deals
                                                </div>
                                                <div className="text-[10px] font-black text-white/70">
                                                    {unresolvedReturningTalent.length} left
                                                </div>
                                            </div>
                                            {unresolvedReturningTalent.map((talent) => {
                                                const info = getReturningTalentDisplay(talent);
                                                return (
                                                    <div key={`${talent.id}_${talent.role}`} className="rounded-xl border border-rose-500/20 bg-black/25 p-3 flex items-center gap-3">
                                                        <img
                                                            src={info.image}
                                                            alt={info.name}
                                                            className="w-10 h-10 rounded-xl object-cover border border-white/10 bg-zinc-900"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-black text-white truncate">{info.name}</div>
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                                {info.roleLabel} • Demand {formatMoney(info.demand)} • {info.attemptsLeft} tries
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleNegotiate(talent.id, talent, info.roleId)}
                                                            className="shrink-0 px-3 py-2 rounded-lg bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-400 transition-colors"
                                                        >
                                                            Negotiate
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleGreenlight}
                                disabled={!canGreenlight}
                                className={`w-full font-black text-xl py-6 rounded-xl transition-all flex items-center justify-center gap-3 ${
                                    canGreenlight
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] hover:scale-105'
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                }`}
                            >
                                <Zap size={24} fill={canGreenlight ? "black" : "none"} />
                                {selectedScript?.status === 'IN_DEVELOPMENT' ? "SCRIPTING IN PROGRESS..." : (canGreenlight ? "GREENLIGHT PROJECT" : "MISSING REQUIREMENTS")}
                            </button>
                        </div>
                    </div>
                )}

                {/* BUZZ STEP (Post-Greenlight) */}
                {step === 'BUZZ' && (
                    <div className="max-w-2xl mx-auto px-4 pt-10 pb-nav-safe-lg animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 animate-bounce">
                                <Sparkles size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Project Greenlit!</h2>
                            <p className="text-zinc-400">Production has officially begun. The industry is already talking.</p>
                        </div>

                        {/* Buzz Feed */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <TrendingUp size={14} className="text-amber-500" /> Early Buzz
                            </h3>

                            {buzzItems.map((item, idx) => {
                                if (item.type === 'HEADLINE') {
                                    const news = item.data as NewsItem;
                                    return (
                                        <div key={idx} className="bg-zinc-900 border-l-4 border-emerald-500 p-5 rounded-r-xl shadow-lg transform hover:scale-[1.02] transition-transform">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-[10px] text-emerald-500 font-bold uppercase">Variety • Breaking News</div>
                                                <div className="text-[10px] text-zinc-600">Just now</div>
                                            </div>
                                            <div className="text-white font-bold text-lg leading-tight mb-2">
                                                {news.headline}
                                            </div>
                                            <div className="text-zinc-400 text-xs">
                                                {news.subtext}
                                            </div>
                                        </div>
                                    );
                                } else if (item.type === 'TWEET') {
                                    const tweet = item.data as XPost;
                                    return (
                                        <div key={idx} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg transform hover:scale-[1.02] transition-transform">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tweet.isVerified ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    {tweet.isVerified ? <Film size={14} /> : <Users size={14} />}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-white flex items-center gap-1">
                                                        {tweet.authorName}
                                                        {tweet.isVerified && <span className="text-blue-400 text-[10px]">✓</span>}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500">{tweet.authorHandle} • Just now</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-zinc-200 mb-3">
                                                {tweet.content}
                                            </div>
                                            <div className="flex gap-6 text-xs text-zinc-500 font-mono">
                                                <span className="flex items-center gap-1">💬 {tweet.replies}</span>
                                                <span className="flex items-center gap-1">🔁 {tweet.retweets}</span>
                                                <span className="flex items-center gap-1">❤️ {tweet.likes}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={onComplete}
                            className="w-full mt-8 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all border border-zinc-700 hover:border-zinc-600 shadow-lg"
                        >
                            Return to Studio
                        </button>
                    </div>
                )}
            </div>

            {/* Actor Selection Overlay */}
            {selectingActorFor && (
                <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-950 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white">Select Actor</h3>
                            <button onClick={() => setSelectingActorFor(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">

                            {/* 1. SELF OPTION */}
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">You</div>
                                <button
                                    onClick={() => {
                                        setCastList(prev => prev.map(r => r.id === selectingActorFor ? {
                                            ...r,
                                            actorId: 'PLAYER_SELF',
                                            actorName: player.name,
                                            salary: 0
                                        } : r));
                                        setSelectingActorFor(null);
                                    }}
                                    className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-left flex justify-between items-center transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
                                            <Crown size={20} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-amber-400 transition-colors">{player.name}</div>
                                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Acting Talent: {Math.round(player.stats.talent || 0)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-emerald-400">Free</div>
                                    </div>
                                </button>
                            </div>

                            {/* 2. STUDIO ROSTER OPTION */}
                            {contractedActors.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">Studio Roster</div>
                                    {contractedActors
                                        .filter(actor => {
                                            const currentActorId = castList.find(c => c.id === selectingActorFor)?.actorId;
                                            return !hiredIds.includes(actor.id) || actor.id === currentActorId;
                                        })
                                        .map(actor => (
                                            <button
                                                key={actor.id}
                                                onClick={() => {
                                                    setCastList(prev => prev.map(r => r.id === selectingActorFor ? {
                                                        ...r,
                                                        actorId: actor.id,
                                                        actorName: actor.name,
                                                        salary: 0
                                                    } : r));
                                                    setSelectingActorFor(null);
                                                }}
                                                className="w-full p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-left flex justify-between items-center transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-emerald-500/50">
                                                        <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{actor.name}</div>
                                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                            {actor.tier} • Talent: {Math.round(actor.stats?.talent || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-emerald-400">Contracted</div>
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            )}

                            {/* 3. CONNECTIONS OPTION */}
                            {player.relationships.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">Connections (Nepotism)</div>
                                    {player.relationships
                                        .filter(rel => {
                                            const npcId = rel.npcId || rel.id;
                                            const currentActorId = castList.find(c => c.id === selectingActorFor)?.actorId;
                                            return !hiredIds.includes(npcId) || npcId === currentActorId;
                                        })
                                        .map(rel => {
                                            const connectedActor = availableActors.find(a => a.id === (rel.npcId || rel.id));

                                            let isReturning = false;
                                            let returningData = null;
                                            if (currentReturningTalent.length > 0) {
                                                returningData = currentReturningTalent.find(t => t.id === (rel.npcId || rel.id) && (t.role === 'LEAD_ACTOR' || t.role === 'SUPPORTING_ACTOR'));
                                                if (returningData) {
                                                    isReturning = true;
                                                }
                                            }

                                            return (
                                                <button
                                                    key={rel.id}
                                                    onClick={() => {
                                                        if (isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0) return;
                                                        const currentRole = castList.find(c => c.id === selectingActorFor);
                                                        const salary = connectedActor ? calculateActorSalary(connectedActor, currentRole?.roleType || 'SUPPORTING', rel.closeness) : 0;
                                                        setCastList(prev => prev.map(r => r.id === selectingActorFor ? {
                                                            ...r,
                                                            actorId: rel.npcId || rel.id,
                                                            actorName: rel.name,
                                                            salary: salary
                                                        } : r));
                                                        setSelectingActorFor(null);
                                                    }}
                                                    className={`w-full p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-left flex justify-between items-center transition-all group ${
                                                        isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0
                                                            ? 'opacity-50 cursor-not-allowed bg-red-900/10 border-red-900/30'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-purple-500/50">
                                                            <img src={rel.image} alt={rel.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                                                {rel.name}
                                                                {isReturning && (
                                                                    <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                                                        Returning
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                {rel.relation} • Closeness: {rel.closeness}
                                                                {connectedActor && ` • Talent: ${Math.round(connectedActor.stats?.talent || 0)}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {isReturning && !returningData?.accepted && returningData?.attemptsLeft > 0 ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNegotiate(rel.npcId || rel.id, returningData, selectingActorFor || undefined);
                                                                }}
                                                                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/40 transition-colors"
                                                            >
                                                                Negotiate
                                                            </button>
                                                        ) : isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0 ? (
                                                            <span className="text-red-500 text-xs uppercase tracking-wider">Walked Away</span>
                                                        ) : (
                                                            <div className="font-mono font-bold text-emerald-400">Discounted</div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            )}

                            {/* 4. TALENT POOL */}
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">Talent Pool</div>
                                {availableActors
                                    .filter(actor => {
                                        const currentActorId = castList.find(c => c.id === selectingActorFor)?.actorId;
                                        const isContracted = contractedActors.some(a => a.id === actor.id);
                                        return (!hiredIds.includes(actor.id) || actor.id === currentActorId) && !isContracted;
                                    })
                                    .map(actor => {
                                        // Calculate dynamic salary for display
                                        const currentRole = castList.find(c => c.id === selectingActorFor);
                                        const roleType = currentRole?.roleType || 'SUPPORTING';
                                        const salary = calculateActorSalary(actor, roleType);

                                        let isReturning = false;
                                        let returningData = null;
                                        if (currentReturningTalent.length > 0) {
                                            returningData = currentReturningTalent.find(t => t.id === actor.id && (t.role === 'LEAD_ACTOR' || t.role === 'SUPPORTING_ACTOR'));
                                            if (returningData) {
                                                isReturning = true;
                                            }
                                        }

                                        return (
                                            <button
                                                key={actor.id}
                                                onClick={() => {
                                                    if (isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0) return;
                                                    const currentRole = castList.find(c => c.id === selectingActorFor);
                                                    const roleType = currentRole?.roleType || 'SUPPORTING';
                                                    const salary = calculateActorSalary(actor, roleType);
                                                    setCastList(prev => prev.map(r => r.id === selectingActorFor ? {
                                                        ...r,
                                                        actorId: actor.id,
                                                        actorName: actor.name,
                                                        salary: salary
                                                    } : r));
                                                    setSelectingActorFor(null);
                                                }}
                                                className={`w-full p-3 bg-black/20 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left flex justify-between items-center transition-all group ${
                                                    isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0
                                                        ? 'opacity-50 cursor-not-allowed bg-red-900/10 border-red-900/30'
                                                        : 'hover:border-emerald-500/30'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 group-hover:border-emerald-500/50 transition-colors">
                                                        <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                                            {actor.name}
                                                            {currentReturningTalent.some(t => t.id === actor.id) && (
                                                                <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                                                    Returning
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                            {actor.tier.replace('_', ' ')} • Fame: {Math.round(actor.stats?.fame || 0)} • Talent: {Math.round(actor.stats?.talent || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-emerald-400 font-mono text-sm font-bold">
                                                    {isReturning && !returningData?.accepted && returningData?.attemptsLeft > 0 ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNegotiate(actor.id, returningData, selectingActorFor || undefined);
                                                            }}
                                                            className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/40 transition-colors"
                                                        >
                                                            Negotiate
                                                        </button>
                                                    ) : isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0 ? (
                                                        <span className="text-red-500 text-xs uppercase tracking-wider">Walked Away</span>
                                                    ) : (
                                                        formatMoney(salary)
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Negotiation Modal */}
            {negotiationModal && (
                <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-950 w-full max-w-md max-h-[90vh] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Briefcase size={18} className="text-purple-400" />
                                </div>
                                <span className="uppercase tracking-widest text-xs font-black">Contract Negotiation</span>
                            </h3>
                            <button onClick={() => setNegotiationModal(null)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <img src={negotiationModal.talentImage} alt={negotiationModal.talentName} className="w-20 h-20 rounded-2xl border-2 border-purple-500/30 object-cover shadow-xl" referrerPolicy="no-referrer" />
                                    <div className="absolute -bottom-2 -right-2 bg-purple-500 text-black text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">Returning</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-white tracking-tight">{negotiationModal.talentName}</div>
                                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">{negotiationModal.talentTier.replace('_', ' ')}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Previous Salary</div>
                                    <div className="text-xl font-mono text-zinc-300 font-bold">{formatMoney(negotiationModal.originalSalary)}</div>
                                </div>
                                <div className="bg-purple-500/5 p-5 rounded-3xl border border-purple-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500/20 text-purple-300 text-[9px] font-black rounded-bl-xl">
                                        +{Math.round(((negotiationModal.currentDemand - negotiationModal.originalSalary) / negotiationModal.originalSalary) * 100)}%
                                    </div>
                                    <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2">New Demand</div>
                                    <div className="text-xl font-mono text-purple-300 font-bold">{formatMoney(negotiationModal.currentDemand)}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-4 h-[1px] bg-zinc-800"></div>
                                    Propose Counter-Offer
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-mono font-bold text-lg">$</div>
                                    <input
                                        type="number"
                                        value={counterOfferInput}
                                        onChange={(e) => setCounterOfferInput(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all"
                                        placeholder="Enter amount..."
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 uppercase tracking-widest pointer-events-none">USD</div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold px-2">
                                    <button onClick={() => setCounterOfferInput(negotiationModal.originalSalary.toString())} className="text-zinc-500 hover:text-white transition-colors">Match Previous</button>
                                    <button onClick={() => setCounterOfferInput(Math.round(negotiationModal.originalSalary + (negotiationModal.currentDemand - negotiationModal.originalSalary) * 0.5).toString())} className="text-zinc-500 hover:text-white transition-colors">Split Difference</button>
                                </div>
                            </div>

                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
                                <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                                <div className="text-xs text-amber-200/70 leading-relaxed">
                                    You have <strong className="text-amber-400">{negotiationModal.attemptsLeft}</strong> negotiation attempts remaining. If they reject your final offer, they will <span className="text-rose-400 font-bold">walk away</span> from the project.
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                    <button
                                        onClick={() => {
                                            // Accept Demand
                                            const finalDemand = negotiationModal.currentDemand;
                                            updateReturningTalentState(
                                                negotiationModal.talentId,
                                                negotiationModal.roleType,
                                                talent => ({
                                                    ...talent,
                                                    accepted: true,
                                                    negotiated: true,
                                                    newDemand: finalDemand
                                                })
                                            );

                                            assignNegotiatedTalent(
                                                negotiationModal.talentId,
                                                negotiationModal.talentName,
                                                finalDemand,
                                                negotiationModal.roleType,
                                                negotiationModal.roleId
                                            );

                                            setNegotiationModal(prev => prev ? {
                                                ...prev,
                                                feedback: {
                                                    message: `${negotiationModal.talentName} has signed the contract!`,
                                                    type: 'SUCCESS'
                                                }
                                            } : null);

                                            setTimeout(() => setNegotiationModal(null), 1500);
                                        }}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 active:scale-95"
                                    >
                                        Accept Demand ({formatMoney(negotiationModal.currentDemand)})
                                    </button>

                                <button
                                    onClick={() => {
                                        const counterOffer = parseInt(counterOfferInput) || 0;
                                        if (counterOffer <= 0) return;

                                        // Logic for counter offer
                                        // Probability of acceptance depends on how close it is to their demand
                                        const demandDiff = negotiationModal.currentDemand - negotiationModal.originalSalary;
                                        const offerDiff = counterOffer - negotiationModal.originalSalary;

                                        // Ratio of offer to demand (0 to 1+)
                                        const ratio = demandDiff > 0 ? offerDiff / demandDiff : 1;

                                        // Base chance: 10% if matching original, 90% if matching demand
                                        let chance = 0.1 + (ratio * 0.8);

                                        // Adjust for tier
                                        if (negotiationModal.talentTier === 'A_LIST') chance *= 0.8;
                                        if (negotiationModal.talentTier === 'ESTABLISHED') chance *= 0.9;

                                        // Cap chance
                                        chance = Math.max(0.05, Math.min(0.95, chance));

                                        const accepted = Math.random() < chance;

                                        if (accepted) {
                                            updateReturningTalentState(
                                                negotiationModal.talentId,
                                                negotiationModal.roleType,
                                                talent => ({
                                                    ...talent,
                                                    accepted: true,
                                                    negotiated: true,
                                                    newDemand: counterOffer
                                                })
                                            );

                                            assignNegotiatedTalent(
                                                negotiationModal.talentId,
                                                negotiationModal.talentName,
                                                counterOffer,
                                                negotiationModal.roleType,
                                                negotiationModal.roleId
                                            );

                                            setNegotiationModal(prev => prev ? {
                                                ...prev,
                                                feedback: {
                                                    message: `Success! ${negotiationModal.talentName} accepted the counter-offer of ${formatMoney(counterOffer)}!`,
                                                    type: 'SUCCESS'
                                                }
                                            } : null);

                                            setTimeout(() => setNegotiationModal(null), 2000);
                                        } else {
                                            const newAttempts = negotiationModal.attemptsLeft - 1;

                                            updateReturningTalentState(
                                                negotiationModal.talentId,
                                                negotiationModal.roleType,
                                                talent => {
                                                    const updatedTalent = {
                                                        ...talent,
                                                        attemptsLeft: newAttempts
                                                    };
                                                    if (newAttempts <= 0) {
                                                        updatedTalent.negotiated = true;
                                                        updatedTalent.accepted = false;
                                                    }
                                                    return updatedTalent;
                                                }
                                            );

                                            if (newAttempts <= 0) {
                                                // Walked away
                                                clearNegotiatedTalent(
                                                    negotiationModal.talentId,
                                                    negotiationModal.roleType,
                                                    negotiationModal.roleId
                                                );

                                                setNegotiationModal(prev => prev ? {
                                                    ...prev,
                                                    attemptsLeft: 0,
                                                    feedback: {
                                                        message: `${negotiationModal.talentName} has walked away from the negotiations.`,
                                                        type: 'FINAL_FAILURE'
                                                    }
                                                } : null);
                                                setTimeout(() => setNegotiationModal(null), 2000);
                                            } else {
                                                setNegotiationModal(prev => prev ? {
                                                    ...prev,
                                                    attemptsLeft: newAttempts,
                                                    feedback: {
                                                        message: `${negotiationModal.talentName} rejected the offer. They are standing firm on their demand.`,
                                                        type: 'FAILURE'
                                                    }
                                                } : null);
                                                setTimeout(() => {
                                                    setNegotiationModal(prev => prev ? { ...prev, feedback: undefined } : null);
                                                }, 2000);
                                            }
                                        }
                                    }}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    Send Counter-Offer
                                </button>

                                <button
                                    disabled={!!negotiationModal.feedback}
                                    onClick={() => {
                                        updateReturningTalentState(
                                            negotiationModal.talentId,
                                            negotiationModal.roleType,
                                            talent => ({
                                                ...talent,
                                                attemptsLeft: 0,
                                                negotiated: true,
                                                accepted: false
                                            })
                                        );
                                        clearNegotiatedTalent(
                                            negotiationModal.talentId,
                                            negotiationModal.roleType,
                                            negotiationModal.roleId
                                        );

                                        setNegotiationModal(prev => prev ? {
                                            ...prev,
                                            attemptsLeft: 0,
                                            feedback: {
                                                message: `You walked away from the negotiation. ${negotiationModal.talentName} is no longer available for this project.`,
                                                type: 'FINAL_FAILURE'
                                            }
                                        } : null);

                                        setTimeout(() => setNegotiationModal(null), 2000);
                                    }}
                                    className="w-full py-4 text-zinc-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    End Negotiations (Recast)
                                </button>
                            </div>

                            {/* Feedback Overlay */}
                            {negotiationModal.feedback && (
                                <div className="absolute inset-0 z-10 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
                                            negotiationModal.feedback.type === 'SUCCESS'
                                            ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 shadow-emerald-500/20'
                                            : 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/50 shadow-rose-500/20'
                                        }`}
                                    >
                                        {negotiationModal.feedback.type === 'SUCCESS' ? <CheckCircle size={40} /> : <XCircle size={40} />}
                                    </motion.div>
                                    <motion.h4
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className={`text-2xl font-black uppercase tracking-tight mb-2 ${
                                            negotiationModal.feedback.type === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                    >
                                        {negotiationModal.feedback.type === 'SUCCESS' ? 'Offer Accepted!' :
                                         negotiationModal.feedback.type === 'FINAL_FAILURE' ? 'Negotiation Failed' : 'Offer Rejected'}
                                    </motion.h4>
                                    <motion.p
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-zinc-400 text-sm leading-relaxed max-w-[280px]"
                                    >
                                        {negotiationModal.feedback.message}
                                    </motion.p>
                                    {negotiationModal.feedback.type === 'FAILURE' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="mt-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5"
                                        >
                                            Attempts remaining: {negotiationModal.attemptsLeft}
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
