import React, { useState } from 'react';
import { Player, Business, Script, Writer, Genre, ProjectType, ScriptAttributes, TargetAudience, Universe } from '../../../types';
import { ArrowLeft, PenTool, BookOpen, ShoppingCart, Users, Star, Clock, DollarSign, Sparkles, ChevronRight, Layers, Globe, RefreshCw, Plus, History, Film, Tv, Edit2, ShoppingBag, Palmtree } from 'lucide-react';
import { motion } from 'motion/react';
import { getWriterTalent } from '../../../services/roleLogic';
import { generateWriters, generateIPMarket, generateProceduralLogline } from '../../../src/data/generators';
import { SCRIPT_TEMPLATES } from '../../../src/data/scriptTemplates';
import { normalizeStudioState } from '../../../services/businessLogic';
import { buildUniverseRoster, getUniverseDashboardProjects } from '../../../services/universeLogic';

interface DevelopmentLabProps {
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type DevTab = 'VAULT' | 'NEW_CONCEPT' | 'IP_MARKET' | 'FRANCHISES' | 'UNIVERSE';

// --- Helpers ---
const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
        const millions = amount / 1000000;
        return `$${millions >= 10 ? millions.toFixed(1) : millions.toFixed(2)}M`.replace('.00', '').replace('.0', '');
    }
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
};

export const DevelopmentLab: React.FC<DevelopmentLabProps> = ({ player, studio, onBack, onUpdatePlayer }) => {
    const [activeTab, setActiveTab] = useState<DevTab>('VAULT');
    
    // Initialize Studio State if missing
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek) as typeof studio.studioState & {
        universes?: Universe[];
        activeReleases?: any[];
    };

    // Make sure we update the player if we just initialized the state
    if (!studio.studioState) {
        const updatedStudio = { ...studio, studioState };
        const updatedPlayer = {
            ...player,
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        };
        // We shouldn't call onUpdatePlayer during render, so we'll just use the local studioState for now
        // and it will get saved on the next actual action.
    }

    const handleUpdateStudioState = (newState: Partial<typeof studioState>) => {
        const updatedStudio = {
            ...studio,
            studioState: { ...studioState, ...newState }
        };
        onUpdatePlayer({
            ...player,
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        });
    };

    const handleRefreshMarket = () => {
        if (studio.balance >= 250000) {
            const newMarket = generateIPMarket(6, studioState.purchasedIPTitles || []);
            const newWriters = generateWriters(10);
            
            const updatedStudio = { 
                ...studio, 
                balance: studio.balance - 250000,
                studioState: {
                    ...studioState,
                    ipMarket: newMarket,
                    writers: newWriters,
                    lastMarketRefreshWeek: player.currentWeek,
                    lastWriterRefreshWeek: player.currentWeek
                }
            };
            
            onUpdatePlayer({
                ...player,
                businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
            });
        }
    };

    // Handle automatic market refresh and script cleanup
    React.useEffect(() => {
        const currentBlock = Math.floor(player.currentWeek / 3);
        const lastBlock = Math.floor((studioState.lastMarketRefreshWeek || 0) / 3);
        
        let updatedState: Partial<typeof studioState> = {};
        let needsUpdate = false;

        // 1. Refresh market only on 3-week cycle or if state is completely missing (initialization)
        if (currentBlock > lastBlock || !studio.studioState) {
            const newMarket = generateIPMarket(6, studioState.purchasedIPTitles || []);
            const newWriters = generateWriters(10);
            updatedState = { 
                ...updatedState,
                ipMarket: newMarket,
                writers: newWriters,
                lastMarketRefreshWeek: player.currentWeek,
                lastWriterRefreshWeek: player.currentWeek
            };
            needsUpdate = true;
        }

        // 2. Cleanup old produced scripts (older than 1 year / 52 weeks)
        const ONE_YEAR = 52;
        const oldScripts = studioState.scripts.filter(s => 
            s.status === 'PRODUCED' && 
            s.producedAtWeek !== undefined && 
            (player.currentWeek - s.producedAtWeek) >= ONE_YEAR
        );

        if (oldScripts.length > 0) {
            updatedState.scripts = studioState.scripts.filter(s => 
                !(s.status === 'PRODUCED' && 
                  s.producedAtWeek !== undefined && 
                  (player.currentWeek - s.producedAtWeek) >= ONE_YEAR)
            );
            needsUpdate = true;
        }

        if (needsUpdate) {
            handleUpdateStudioState(updatedState);
        }
    }, [player.currentWeek, studioState.lastMarketRefreshWeek, studioState.purchasedIPTitles?.length]);

    return (
        <div className="fixed inset-0 z-[70] bg-[#050505] text-white flex flex-col font-sans animate-in fade-in duration-300">
            {/* Header */}
            <div className="relative shrink-0 z-20 bg-zinc-950 border-b border-zinc-800">
                <div className="flex items-center justify-between px-4 pt-12 pb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-zinc-800/50 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none">Development Lab</h1>
                            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">Where ideas become scripts</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/30 bg-zinc-950/50 px-2">
                    {[
                        { id: 'VAULT', label: 'Vault', icon: <BookOpen size={14} /> },
                        { id: 'NEW_CONCEPT', label: 'Concept', icon: <Sparkles size={14} /> },
                        { id: 'IP_MARKET', label: 'Market', icon: <ShoppingCart size={14} /> },
                        { id: 'FRANCHISES', label: 'Franchise', icon: <Layers size={14} /> },
                        { id: 'UNIVERSE', label: 'Universe', icon: <Globe size={14} /> }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as DevTab)}
                                className={`flex-shrink-0 px-6 flex flex-col items-center justify-center py-4 border-b transition-all relative group ${
                                    isActive ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-400'
                                }`}
                            >
                                <div className={`mb-1.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-50'}`}>
                                    {tab.icon}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTab"
                                        className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" 
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 pb-nav-safe-lg">
                {activeTab === 'VAULT' && <ScriptVault 
                    scripts={studioState.scripts} 
                    writers={studioState.writers}
                    studioBalance={studio.balance}
                    player={player}
                    onAssign={(scriptId, writerId, cost, skill, speed) => {
                        if (studio.balance >= cost) {
                            const writer = studioState.writers.find(w => w.id === writerId);
                            const updatedScripts = studioState.scripts.map(s => {
                                if (s.id === scriptId) {
                                    return {
                                        ...s,
                                        status: 'IN_DEVELOPMENT' as const,
                                        writerId,
                                        assignedSkill: skill,
                                        assignedSpeed: speed,
                                        weeksInDevelopment: 0,
                                        totalDevelopmentWeeks: Math.floor((Math.random() * 23 + 12) * speed), // 12-35 weeks modified by speed
                                        developmentCost: (s.developmentCost || 0) + cost,
                                        attributes: writer?.stats ? {
                                            plot: writer.stats.creativity,
                                            characters: writer.stats.dialogue,
                                            pacing: writer.stats.structure
                                        } : undefined
                                    };
                                }
                                return s;
                            });
                            const updatedStudio = { ...studio, balance: studio.balance - cost };
                            updatedStudio.studioState = { ...studioState, scripts: updatedScripts };
                            onUpdatePlayer({
                                ...player,
                                businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
                            });
                        }
                    }}
                    onUpdateScript={(updatedScript, costType, costAmount) => {
                        const updatedScripts = studioState.scripts.map(s => s.id === updatedScript.id ? updatedScript : s);
                        const updatedStudio = { ...studio, studioState: { ...studioState, scripts: updatedScripts } };
                        
                        let updatedPlayer = { ...player };
                        
                        if (costType === 'ENERGY' && costAmount) {
                            updatedPlayer.energy = {
                                ...updatedPlayer.energy,
                                current: Math.max(0, updatedPlayer.energy.current - costAmount)
                            };
                        } else if (costType === 'MONEY' && costAmount) {
                            updatedStudio.balance -= costAmount;
                        }
                        
                        updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
                        onUpdatePlayer(updatedPlayer);
                    }}
                    onDelete={(scriptId) => {
                        const updatedScripts = studioState.scripts.filter(s => s.id !== scriptId);
                        handleUpdateStudioState({ scripts: updatedScripts });
                    }}
                    onDeductEnergy={(amount) => {
                        onUpdatePlayer({
                            ...player,
                            energy: {
                                ...player.energy,
                                current: Math.max(0, player.energy.current - amount)
                            }
                        });
                    }}
                    onDeductMoney={(amount) => {
                        const updatedStudio = { ...studio, balance: studio.balance - amount };
                        onUpdatePlayer({
                            ...player,
                            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
                        });
                    }}
                />}
                {activeTab === 'NEW_CONCEPT' && <ScriptWizard onComplete={(script) => {
                    handleUpdateStudioState({ scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }] });
                    setActiveTab('VAULT');
                }} />}
                {activeTab === 'IP_MARKET' && <IPMarket 
                    market={studioState.ipMarket} 
                    playerMoney={studio.balance}
                    weeksUntilRefresh={3 - (player.currentWeek % 3)}
                    onRefresh={handleRefreshMarket}
                    onBuy={(script, cost) => {
                        if (studio.balance >= cost) {
                            const updatedStudio = { ...studio, balance: studio.balance - cost };
                            const updatedPurchasedTitles = [...(studioState.purchasedIPTitles || []), script.title];
                            const updatedState = {
                                ...studioState,
                                scripts: [...studioState.scripts, { ...script, status: 'READY' as const, developmentCost: cost, createdAtWeek: player.currentWeek }],
                                ipMarket: studioState.ipMarket.filter(s => s.id !== script.id),
                                purchasedIPTitles: updatedPurchasedTitles
                            };
                            updatedStudio.studioState = updatedState;
                            onUpdatePlayer({
                                ...player,
                                businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
                            });
                        }
                    }}
                />}
                {activeTab === 'FRANCHISES' && <FranchiseManager 
                    player={player}
                    studio={studio}
                    onCommission={(script) => {
                        handleUpdateStudioState({ scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }] });
                        setActiveTab('VAULT');
                    }}
                />}
                {activeTab === 'UNIVERSE' && <UniverseManager 
                    player={player}
                    studio={studio}
                    onUpdatePlayer={onUpdatePlayer}
                />}
            </div>
        </div>
    );
};

// --- Subcomponents ---

const ScriptVault: React.FC<{ 
    scripts: Script[], 
    writers: Writer[],
    studioBalance: number,
    player: Player,
    onAssign: (scriptId: string, writerId: string, cost: number, skill: number, speed: number) => void,
    onUpdateScript: (script: Script, costType?: 'ENERGY' | 'MONEY', costAmount?: number) => void,
    onDelete: (id: string) => void,
    onDeductEnergy: (amount: number) => void,
    onDeductMoney: (amount: number) => void
}> = ({ scripts, writers, studioBalance, player, onAssign, onUpdateScript, onDelete, onDeductEnergy, onDeductMoney }) => {
    const [selectedScriptForAssignment, setSelectedScriptForAssignment] = useState<string | null>(null);
    const [assignmentMode, setAssignmentMode] = useState<'CHOICE' | 'HIRE' | 'WIZARD' | 'DOCTOR'>('CHOICE');
    const [confirmation, setConfirmation] = useState<string | null>(null);

    const handleAssign = (scriptId: string, writerId: string, cost: number, skill: number, speed: number) => {
        onAssign(scriptId, writerId, cost, skill, speed);
        setConfirmation('Writer assigned successfully!');
        setTimeout(() => {
            setConfirmation(null);
            setSelectedScriptForAssignment(null);
            setAssignmentMode('CHOICE');
        }, 2000);
    };

    if (selectedScriptForAssignment) {
        const script = scripts.find(s => s.id === selectedScriptForAssignment);
        if (!script) {
            setSelectedScriptForAssignment(null);
            return null;
        }

        if (confirmation) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-emerald-500 animate-in fade-in zoom-in duration-300">
                    <Sparkles size={48} className="mb-4" />
                    <p className="text-lg font-bold">{confirmation}</p>
                </div>
            );
        }

        if (assignmentMode === 'WIZARD') {
            return (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setAssignmentMode('CHOICE')} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold">Rewrite "{script.title}"</h2>
                            <p className="text-xs text-zinc-400">Refine the story DNA</p>
                        </div>
                    </div>
                    <ScriptWizard 
                        initialScript={script}
                        onComplete={(updatedScript) => {
                            onUpdateScript(updatedScript);
                            setAssignmentMode('CHOICE'); // Go back to assignment choice after rewrite
                        }} 
                    />
                </div>
            );
        }

        if (assignmentMode === 'DOCTOR') {
            return (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setSelectedScriptForAssignment(null)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold">Script Doctor: "{script.title}"</h2>
                            <p className="text-xs text-zinc-400">Polish the script before production</p>
                        </div>
                    </div>
                    <ScriptDoctorPanel 
                        script={script} 
                        player={player}
                        studioBalance={studioBalance}
                        onUpdateScript={(updatedScript, costType, costAmount) => {
                            onUpdateScript(updatedScript, costType, costAmount);
                        }}
                    />
                </div>
            );
        }

        if (assignmentMode === 'CHOICE') {
            return (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setSelectedScriptForAssignment(null)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold">Develop "{script.title}"</h2>
                            <p className="text-xs text-zinc-400">Choose how to write this script</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {/* Write Myself */}
                        <button 
                            onClick={() => {
                                const skill = player.writerStats ? getWriterTalent(player.writerStats) : player.stats.skills.writing;
                                handleAssign(script.id, 'player', 0, skill, 1.2);
                            }}
                            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
                                    <PenTool size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold">Write Myself</h3>
                                    <p className="text-xs text-zinc-500">Skill: {player.writerStats ? Math.floor(getWriterTalent(player.writerStats) || 0) : (player.stats?.skills?.writing || 0)} | Cost: $0</p>
                                </div>
                            </div>
                            <ChevronRight className="text-zinc-600" />
                        </button>

                        {/* In-House Team */}
                        <button 
                            onClick={() => handleAssign(script.id, 'in-house', 5000, 45, 1.0)}
                            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                                    <Users size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold">In-House Team</h3>
                                    <p className="text-xs text-zinc-500">Skill: 45 | Cost: $5,000</p>
                                </div>
                            </div>
                            <ChevronRight className="text-zinc-600" />
                        </button>

                        {/* Hire Professional */}
                        <button 
                            onClick={() => setAssignmentMode('HIRE')}
                            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                                    <Star size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold">Hire Professional</h3>
                                    <p className="text-xs text-zinc-500">Choose from top industry talent</p>
                                </div>
                            </div>
                            <ChevronRight className="text-zinc-600" />
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setAssignmentMode('CHOICE')} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold">Hire a Writer</h2>
                        <p className="text-xs text-zinc-400">For "{script.title}"</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {writers.map(writer => {
                        const canAfford = studioBalance >= writer.fee;
                        const tier = writer.tier || 'COMMON';
                        
                        const isAList = tier === 'A_LIST';
                        const isAspiring = tier === 'ASPIRING';
                        
                        const tierColor = isAList ? 'text-amber-400' : isAspiring ? 'text-blue-400' : 'text-zinc-400';
                        const tierBg = isAList ? 'bg-amber-500/10 border-amber-500/20' : isAspiring ? 'bg-blue-500/10 border-blue-500/20' : 'bg-zinc-800 border-zinc-700';
                        const skillColor = writer.skill >= 80 ? 'bg-amber-500' : writer.skill >= 50 ? 'bg-emerald-500' : 'bg-blue-500';

                        return (
                            <div key={writer.id} className={`group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden transition-all duration-300`}>
                                {/* Top Section: Identity */}
                                <div className="p-4 pb-3">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-black text-white leading-tight mb-1 break-words">{writer.name}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${tierBg} ${tierColor}`}>
                                                    {tier.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {writer.speed < 0.8 ? 'Fast' : writer.speed > 1.2 ? 'Methodical' : 'Steady'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center text-sm font-black border ${tierBg} ${tierColor}`}>
                                            {writer.name.charAt(0)}
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Section: Stats */}
                                <div className="px-4 pb-4 space-y-3">
                                    {/* Main Skill */}
                                    <div>
                                        <div className="flex items-end justify-between mb-1">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Overall Skill</span>
                                            <span className="text-xs font-bold text-white">{writer.skill}/100</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${skillColor}`} 
                                                style={{ width: `${writer.skill}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Detailed Stats */}
                                    {writer.stats && (
                                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                                            <div>
                                                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Creativity</div>
                                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${writer.stats.creativity}%` }} />
                                                </div>
                                                <div className="text-[10px] font-mono text-zinc-400">{writer.stats.creativity}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Dialogue</div>
                                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${writer.stats.dialogue}%` }} />
                                                </div>
                                                <div className="text-[10px] font-mono text-zinc-400">{writer.stats.dialogue}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Structure</div>
                                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${writer.stats.structure}%` }} />
                                                </div>
                                                <div className="text-[10px] font-mono text-zinc-400">{writer.stats.structure}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Pacing</div>
                                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${writer.stats.pacing}%` }} />
                                                </div>
                                                <div className="text-[10px] font-mono text-zinc-400">{writer.stats.pacing}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Section: Action */}
                                <div className="bg-black/20 border-t border-white/5 p-3 flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Hiring Fee</div>
                                        <div className={`font-mono text-base font-bold ${canAfford ? 'text-white' : 'text-red-500'}`}>
                                            {formatCurrency(writer.fee)}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAssign(script.id, writer.id, writer.fee, writer.skill, writer.speed)}
                                        disabled={!canAfford}
                                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                            canAfford 
                                            ? 'bg-white text-black hover:bg-amber-400 hover:scale-105' 
                                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                        }`}
                                    >
                                        {canAfford ? 'Hire Writer' : 'Insufficient Funds'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (scripts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                <BookOpen size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Your vault is empty.</p>
                <p className="text-xs mt-1">Develop a new concept or buy IP to get started.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {scripts.map(script => (
                <div key={script.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg">{script.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${script.projectType === 'SERIES' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                    {script.projectType} {script.projectType === 'SERIES' && `(${script.episodes} eps)`}
                                </span>
                                {script.genres.map(g => (
                                    <span key={g} className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-wider">{g}</span>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                                script.status === 'READY' ? 'bg-emerald-500/20 text-emerald-400' :
                                script.status === 'IN_DEVELOPMENT' ? 'bg-amber-500/20 text-amber-400' :
                                script.status === 'PRODUCED' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-zinc-800 text-zinc-400'
                            }`}>
                                {script.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {script.logline && (
                        <p className="text-xs text-zinc-400 mt-2 italic line-clamp-2">"{script.logline}"</p>
                    )}
                    
                    {script.status === 'CONCEPT' && (
                        <div className="mt-4">
                            <button 
                                onClick={() => {
                                    setSelectedScriptForAssignment(script.id);
                                    setAssignmentMode('CHOICE');
                                }}
                                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                            >
                                <PenTool size={14} />
                                Develop Script
                            </button>
                        </div>
                    )}

                    {script.status === 'IN_DEVELOPMENT' && (
                        <div className="mt-4">
                            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                                <span>Development Progress</span>
                                <span>{script.weeksInDevelopment} / {script.totalDevelopmentWeeks} Wks</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 rounded-full" 
                                    style={{ width: `${(script.weeksInDevelopment / script.totalDevelopmentWeeks) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {script.status === 'READY' && (
                        <div className="mt-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Star size={14} className={script.quality >= 80 ? 'text-amber-400' : script.quality >= 50 ? 'text-zinc-400' : 'text-red-400'} />
                                <span className="text-sm font-bold">Quality: {script.quality}/100</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => {
                                        setSelectedScriptForAssignment(script.id);
                                        setAssignmentMode('DOCTOR');
                                    }}
                                    className="col-span-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={12} />
                                    Script Doctor / Polish
                                </button>
                                <button 
                                    onClick={() => {
                                        if (!script.isOriginal) return;
                                        setSelectedScriptForAssignment(script.id);
                                        setAssignmentMode('WIZARD'); // Go to wizard first for rewrite
                                    }}
                                    disabled={!script.isOriginal}
                                    className={`font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                                        script.isOriginal 
                                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
                                            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                    }`}
                                    title={!script.isOriginal ? "Cannot rewrite acquired IP" : ""}
                                >
                                    <PenTool size={12} />
                                    Page One Rewrite
                                </button>
                                <button 
                                    onClick={() => onDelete(script.id)}
                                    className="bg-rose-950/30 hover:bg-rose-900/40 text-rose-500 font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {script.status === 'PRODUCED' && (
                        <div className="mt-4 flex items-center gap-2">
                            <Star size={14} className={script.quality >= 80 ? 'text-amber-400' : script.quality >= 50 ? 'text-zinc-400' : 'text-red-400'} />
                            <span className="text-sm font-bold">Quality: {script.quality}/100</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const ScriptDoctorPanel: React.FC<{
    script: Script;
    player: Player;
    studioBalance: number;
    onUpdateScript: (script: Script, costType?: 'ENERGY' | 'MONEY', costAmount?: number) => void;
}> = ({ script, player, studioBalance, onUpdateScript }) => {
    const attrs = script.attributes || { plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50 };

    const handleImprove = (stat: keyof ScriptAttributes, costType: 'ENERGY' | 'MONEY', costAmount: number, boost: number) => {
        if (costType === 'ENERGY' && player.energy.current < costAmount) return;
        if (costType === 'MONEY' && studioBalance < costAmount) return;

        const newAttrs = { ...attrs, [stat]: Math.min(100, (attrs[stat] || 50) + boost) };
        const values = Object.values(newAttrs).filter(v => typeof v === 'number') as number[];
        const newQuality = Math.floor(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length));

        onUpdateScript({
            ...script,
            attributes: newAttrs,
            quality: newQuality,
            developmentCost: (script.developmentCost || 0) + (costType === 'MONEY' ? costAmount : 0)
        }, costType, costAmount);
    };

    const StatBar = ({ label, value }: { label: string, value: number }) => (
        <div className="mb-3">
            <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400 mb-1">
                <span>{label}</span>
                <span className={value >= 80 ? 'text-amber-400' : value >= 50 ? 'text-emerald-400' : 'text-red-400'}>{value}/100</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full ${value >= 80 ? 'bg-amber-500' : value >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-zinc-500">Current Draft Stats</h3>
                <div className="grid grid-cols-2 gap-x-6">
                    <StatBar label="Dialogue" value={attrs.dialogue || 50} />
                    <StatBar label="Action" value={attrs.action || 50} />
                    <StatBar label="Characters" value={attrs.characters || 50} />
                    <StatBar label="Pacing" value={attrs.pacing || 50} />
                    <StatBar label="Plot" value={attrs.plot || 50} />
                    <StatBar label="Originality" value={attrs.originality || 50} />
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-zinc-400">Overall Quality</span>
                    <span className="text-xl font-black text-white">{script.quality}/100</span>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Doctoring Actions</h3>
                
                <button 
                    onClick={() => handleImprove('dialogue', 'ENERGY', 15, 10)}
                    disabled={player.energy.current < 15 || (attrs.dialogue || 50) >= 100}
                    className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="text-left">
                        <h4 className="font-bold text-sm">Punch Up Dialogue</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">+10 Dialogue</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-blue-400">-15 Energy</span>
                    </div>
                </button>

                <button 
                    onClick={() => handleImprove('action', 'MONEY', 100000, 15)}
                    disabled={studioBalance < 100000 || (attrs.action || 50) >= 100}
                    className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="text-left">
                        <h4 className="font-bold text-sm">Add Action Set-Pieces</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">+15 Action (Increases Budget)</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-rose-400">-$100k</span>
                    </div>
                </button>

                <button 
                    onClick={() => handleImprove('characters', 'ENERGY', 20, 10)}
                    disabled={player.energy.current < 20 || (attrs.characters || 50) >= 100}
                    className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="text-left">
                        <h4 className="font-bold text-sm">Flesh Out Characters</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">+10 Characters</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-blue-400">-20 Energy</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

const ScriptWizard: React.FC<{ onComplete: (script: Script) => void, initialScript?: Script }> = ({ onComplete, initialScript }) => {
    const [step, setStep] = useState(initialScript ? 2 : 1);
    const [title, setTitle] = useState(initialScript?.title || '');
    const [projectType, setProjectType] = useState<ProjectType>(initialScript?.projectType || 'MOVIE');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>(initialScript?.targetAudience || 'PG-13');
    const [episodes, setEpisodes] = useState(initialScript?.episodes || 8);
    const [primaryGenre, setPrimaryGenre] = useState<Genre | ''>(initialScript?.genres[0] || '');
    const [secondaryGenre, setSecondaryGenre] = useState<Genre | ''>(initialScript?.genres[1] || '');
    
    // Initialize options from initialScript if available
    const initialOptions: Record<string, string> = {};
    if (initialScript?.options) {
        initialScript.options.forEach(opt => {
            initialOptions[opt.questionId] = opt.choiceId;
        });
    }
    const [options, setOptions] = useState<Record<string, string>>(initialOptions);

    const genres: Genre[] = ['ACTION', 'HORROR', 'COMEDY', 'SCI_FI', 'DRAMA', 'THRILLER', 'ROMANCE', 'ADVENTURE', 'SUPERHERO'];

    const handleNext = () => {
        if (step === 1 && title && primaryGenre) {
            setStep(2);
        } else if (step === 2) {
            // Finish
            const questions = SCRIPT_TEMPLATES[primaryGenre as Genre] || [];
            const scriptOptions = questions.map(q => ({
                questionId: q.id,
                choiceId: options[q.id] || q.options[0].id
            }));

            const newScript: Script = {
                ...(initialScript || {}),
                id: initialScript?.id || `script_${Date.now()}`,
                title,
                projectType,
                targetAudience,
                episodes: projectType === 'SERIES' ? episodes : undefined,
                genres: secondaryGenre ? [primaryGenre as Genre, secondaryGenre as Genre] : [primaryGenre as Genre],
                status: 'CONCEPT', // Reset to concept if rewriting? Or keep current status? Usually rewrite -> concept -> dev
                quality: initialScript?.quality || 0,
                options: scriptOptions,
                writerId: null,
                weeksInDevelopment: 0,
                totalDevelopmentWeeks: 0,
                isOriginal: initialScript ? initialScript.isOriginal : true,
                logline: initialScript?.logline || generateProceduralLogline(),
                baseQuality: initialScript?.baseQuality, // Preserve base quality if it exists
                developmentCost: initialScript?.developmentCost || 0
            };
            onComplete(newScript);
        }
    };

    if (step === 1) {
        return (
            <div className="space-y-6 pb-nav-safe">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Working Title</label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. The Last Stand"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Project Type</label>
                    <div className="flex gap-2">
                        {['MOVIE', 'SERIES'].map(t => (
                            <button
                                key={t}
                                onClick={() => setProjectType(t as ProjectType)}
                                className={`flex-1 p-3 rounded-xl text-xs font-bold tracking-wider transition-colors ${
                                    projectType === t ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Audience</label>
                    <div className="flex gap-2 flex-wrap">
                        {['G', 'PG', 'PG-13', 'R', 'NC-17'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTargetAudience(t as TargetAudience)}
                                className={`flex-1 min-w-[60px] p-2 rounded-xl text-xs font-bold tracking-wider transition-colors ${
                                    targetAudience === t ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {projectType === 'SERIES' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Number of Episodes</label>
                            <span className="text-amber-500 font-mono font-bold text-sm">{episodes}</span>
                        </div>
                        <input 
                            type="range" 
                            min="4" 
                            max="24" 
                            step="1"
                            value={episodes}
                            onChange={e => setEpisodes(parseInt(e.target.value))}
                            className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-1 px-1">
                            <span className="text-[9px] text-zinc-600">Min: 4</span>
                            <span className="text-[9px] text-zinc-600">Max: 24</span>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Primary Genre</label>
                    <div className="grid grid-cols-3 gap-2">
                        {genres.map(g => (
                            <button
                                key={g}
                                onClick={() => setPrimaryGenre(g)}
                                className={`p-3 rounded-xl text-xs font-bold tracking-wider transition-colors ${
                                    primaryGenre === g ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Secondary Genre (Optional)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {genres.filter(g => g !== primaryGenre).map(g => (
                            <button
                                key={g}
                                onClick={() => setSecondaryGenre(secondaryGenre === g ? '' : g)}
                                className={`p-3 rounded-xl text-xs font-bold tracking-wider transition-colors ${
                                    secondaryGenre === g ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleNext}
                    disabled={!title || !primaryGenre}
                    className="w-full bg-amber-500 text-black font-black uppercase tracking-wider py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next: Story DNA
                </button>
            </div>
        );
    }

    const questions = SCRIPT_TEMPLATES[primaryGenre as Genre] || [];

    return (
        <div className="space-y-8 pb-nav-safe">
            <div className="mb-6">
                <h2 className="text-xl font-black">{title}</h2>
                <p className="text-zinc-400 text-sm">Define the core DNA of your {primaryGenre.toLowerCase()} script.</p>
            </div>

            {questions.map((q, idx) => (
                <div key={q.id} className="space-y-3">
                    <h3 className="text-sm font-bold text-amber-400">
                        <span className="opacity-50 mr-2">{idx + 1}.</span>
                        {q.question}
                    </h3>
                    <div className="space-y-2">
                        {q.options.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setOptions({ ...options, [q.id]: opt.id })}
                                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                                    options[q.id] === opt.id 
                                        ? 'bg-amber-500/10 border-amber-500/50 text-white' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                }`}
                            >
                                <div className="font-bold text-sm">{opt.text}</div>
                                <div className="text-[10px] opacity-70 mt-1 italic">"{opt.reviewSnippet}"</div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <button 
                onClick={handleNext}
                disabled={questions.some(q => !options[q.id])}
                className="w-full bg-amber-500 text-black font-black uppercase tracking-wider py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed sticky bottom-4 shadow-2xl"
            >
                Finalize Concept
            </button>
        </div>
    );
};

const IPMarket: React.FC<{ 
    market: Script[], 
    playerMoney: number, 
    onBuy: (s: Script, cost: number) => void,
    onRefresh: () => void,
    weeksUntilRefresh: number
}> = ({ market, playerMoney, onBuy, onRefresh, weeksUntilRefresh }) => {
    const [filter, setFilter] = useState<'ALL' | 'BOOK' | 'SCREENPLAY' | 'SPEC_SCRIPT'>('ALL');

    const filteredMarket = (market || []).filter(s => {
        if (filter === 'ALL') return true;
        return s.sourceMaterialType === filter;
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div className="flex-1">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">IP Marketplace</h2>
                    <div className="mt-4 space-y-2 max-w-2xl">
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Acquire the rights to existing stories to adapt into your next big production. 
                            Browse through best-selling novels, professional screenplays, and unique spec scripts.
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500/80 bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10 w-fit">
                                <Clock size={12} />
                                Market refreshes in {weeksUntilRefresh} {weeksUntilRefresh === 1 ? 'week' : 'weeks'}
                            </div>
                            <button 
                                onClick={onRefresh}
                                disabled={playerMoney < 250000}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                                    playerMoney >= 250000
                                        ? 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800'
                                        : 'text-zinc-600 bg-zinc-900/20 border-zinc-900 cursor-not-allowed opacity-50'
                                }`}
                            >
                                <RefreshCw size={12} className={playerMoney >= 250000 ? 'animate-spin' : ''} />
                                Refresh Now ($250,000)
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-2xl flex flex-col gap-1 min-w-[120px]">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Available Funds</span>
                        <span className="text-xl text-emerald-400 font-mono font-black leading-none">{formatCurrency(playerMoney)}</span>
                    </div>
                </div>
            </div>

            {/* E-commerce Filters */}
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar border-b border-zinc-800/20">
                {[
                    { id: 'ALL', label: 'All' },
                    { id: 'BOOK', label: 'Novels' },
                    { id: 'SCREENPLAY', label: 'Screenplays' },
                    { id: 'SPEC_SCRIPT', label: 'Spec Scripts' }
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`pb-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
                            filter === f.id 
                                ? 'text-white' 
                                : 'text-zinc-500 hover:text-zinc-400'
                        }`}
                    >
                        {f.label}
                        {filter === f.id && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white" />
                        )}
                    </button>
                ))}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarket.map((script, idx) => {
                    const cost = (script.baseQuality || 50) * 15000;
                    const canAfford = playerMoney >= cost;
                    
                    const colors = [
                        'from-blue-600 to-blue-900', 
                        'from-emerald-600 to-emerald-900', 
                        'from-rose-600 to-rose-900', 
                        'from-amber-600 to-amber-900', 
                        'from-purple-600 to-purple-900', 
                        'from-indigo-600 to-indigo-900'
                    ];
                    const coverGradient = colors[idx % colors.length];
                    const isBook = script.sourceMaterialType === 'BOOK';

                    return (
                        <div key={script.id} className="group flex flex-col bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:-translate-y-2">
                            {/* "Cover" Art - More Book-like for books */}
                            <div className={`relative aspect-[3/4.5] bg-gradient-to-br ${coverGradient} p-6 flex flex-col justify-between overflow-hidden`}>
                                {/* Texture Overlay */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
                                
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="flex flex-col gap-1">
                                        <span className="bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest border border-white/10">
                                            {script.sourceMaterialType || 'ORIGINAL'}
                                        </span>
                                        {isBook && (
                                            <div className="flex items-center gap-1 bg-amber-500/90 text-black text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                                <BookOpen size={8} />
                                                Novel
                                            </div>
                                        )}
                                    </div>
                                    {script.hype && script.hype > 70 && (
                                        <div className="bg-white text-black text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-xl animate-pulse">
                                            Trending
                                        </div>
                                    )}
                                </div>
                                
                                <div className="relative z-10">
                                    <h3 className="font-black text-2xl leading-[0.9] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase italic">
                                        {script.title}
                                    </h3>
                                    {script.author && (
                                        <p className="text-[10px] font-bold text-white/70 mt-2 uppercase tracking-widest italic">
                                            By {script.author}
                                        </p>
                                    )}
                                    <div className="flex gap-1 mt-4 flex-wrap">
                                        {script.genres.map(g => (
                                            <span key={g} className="text-[7px] bg-white/10 backdrop-blur-sm text-white px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10 font-bold">{g}</span>
                                        ))}
                                        {script.tags?.map(tag => (
                                            <span key={tag} className="text-[7px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-500/30 font-bold">{tag}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Book Spine Detail */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20" />
                            </div>

                            {/* Details & Buy Action */}
                            <div className="p-5 flex flex-col flex-1 justify-between bg-zinc-900/50">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Market Value</span>
                                        <div className="flex items-center gap-1">
                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                            <span className="text-xs font-mono font-black text-white">{script.baseQuality}</span>
                                        </div>
                                    </div>
                                    {script.logline && (
                                        <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed font-medium">
                                            {script.logline}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">Rights Cost</span>
                                            <span className={`text-xl font-mono font-black tracking-tighter ${canAfford ? 'text-white' : 'text-rose-500'}`}>
                                                {formatCurrency(cost)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">Potential</span>
                                            <div className="flex gap-1 mt-1 justify-end">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= Math.ceil((script.baseQuality || 0) / 20) ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onBuy(script, cost)}
                                        disabled={!canAfford}
                                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                                            canAfford 
                                                ? 'bg-white text-black hover:bg-amber-500 hover:scale-[1.02] active:scale-95' 
                                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                        }`}
                                    >
                                        <ShoppingCart size={12} />
                                        {canAfford ? 'Acquire Rights' : 'Insufficient Funds'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredMarket.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-600 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No items found in this category</p>
                    <button 
                        onClick={onRefresh}
                        disabled={playerMoney < 250000}
                        className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 px-6 py-3 rounded-xl border border-amber-500/20 transition-all active:scale-95"
                    >
                        <RefreshCw size={14} />
                        Force Refresh Market ($250,000)
                    </button>
                </div>
            )}
        </div>
    );
};

const FranchiseManager: React.FC<{
    player: Player;
    studio: Business;
    onCommission: (script: Script) => void;
}> = ({ player, studio, onCommission }) => {
    const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(null);

    // Identify studio projects
    const studioProjects = [
        ...player.pastProjects.filter(p => p.studioId === studio.id).map(p => ({ 
            id: p.id, 
            name: p.name, 
            franchiseId: p.franchiseId, 
            universeId: p.universeId, 
            year: p.year, 
            gross: p.gross || 0, 
            rating: p.imdbRating || 0,
            type: p.projectType || 'MOVIE',
            subtype: p.subtype,
            genre: p.genre,
            installmentNumber: p.installmentNumber || 1
        })),
        ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({ 
            id: r.id, 
            name: r.name, 
            franchiseId: r.projectDetails.franchiseId, 
            universeId: r.projectDetails.universeId, 
            year: player.age, 
            gross: r.totalGross || 0, 
            rating: r.imdbRating || 0,
            type: r.type,
            subtype: r.projectDetails.subtype,
            genre: r.projectDetails.genre,
            installmentNumber: r.projectDetails.installmentNumber || 1
        }))
    ];

    // Identify which IDs are actually franchises (have sequels or are part of one)
    const establishedFranchiseIds = new Set<string>();
    studioProjects.forEach(p => {
        if (p.franchiseId) establishedFranchiseIds.add(p.franchiseId);
        if (studioProjects.some(other => other.franchiseId === p.id)) {
            establishedFranchiseIds.add(p.id);
        }
    });

    // Identify candidates (standalone movies with high gross/rating)
    const candidates = studioProjects.filter(p => 
        !establishedFranchiseIds.has(p.id) && 
        !p.franchiseId && 
        (p.gross > 100000000 || p.rating > 7.5)
    ).sort((a, b) => b.gross - a.gross);

    // Group by Franchise
    const franchisesMap = new Map<string, any[]>();
    studioProjects.forEach(p => {
        const fid = p.franchiseId || p.id;
        if (establishedFranchiseIds.has(fid)) {
            if (!franchisesMap.has(fid)) franchisesMap.set(fid, []);
            franchisesMap.get(fid)!.push(p);
        }
    });

    // Filter only those that are actually franchises
    const franchises = Array.from(franchisesMap.entries()).map(([id, projects]) => {
        const sorted = [...projects].sort((a, b) => a.installmentNumber - b.installmentNumber || a.year - b.year);
        const root = sorted[0];
        const totalGross = projects.reduce((sum, p) => sum + p.gross, 0);
        const avgRating = projects.reduce((sum, p) => sum + p.rating, 0) / projects.length;
        
        return {
            id,
            name: root.name,
            projects: sorted,
            totalGross,
            avgRating,
            lastInstallment: sorted[sorted.length - 1].installmentNumber,
            type: root.type,
            genre: root.genre
        };
    }).sort((a, b) => b.totalGross - a.totalGross);

    if (selectedFranchiseId) {
        const franchise = franchises.find(f => f.id === selectedFranchiseId) || 
                         candidates.find(c => c.id === selectedFranchiseId) as any;
        
        if (!franchise) {
            setSelectedFranchiseId(null);
            return null;
        }

        // If it's a candidate, it's a "virtual" franchise with 1 project
        const isCandidate = !franchises.some(f => f.id === selectedFranchiseId);
        const displayFranchise = isCandidate ? {
            id: franchise.id,
            name: franchise.name,
            projects: [franchise],
            totalGross: franchise.gross,
            avgRating: franchise.rating,
            lastInstallment: 1,
            type: franchise.type,
            genre: franchise.genre
        } : franchise;

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setSelectedFranchiseId(null)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">{displayFranchise.name}</h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{isCandidate ? 'Franchise Candidate' : 'Franchise Overview'}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
                        <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Total Gross</p>
                        <p className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(displayFranchise.totalGross)}</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
                        <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Avg Rating</p>
                        <p className="text-sm font-mono font-bold text-amber-400">{displayFranchise.avgRating.toFixed(1)}/10</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
                        <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Installments</p>
                        <p className="text-sm font-mono font-bold text-blue-400">{displayFranchise.projects.length}</p>
                    </div>
                </div>

                {/* History */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Release History</h3>
                    <div className="space-y-2">
                        {displayFranchise.projects.map((p: any) => (
                            <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-zinc-500">
                                        {p.type === 'SERIES' ? <Tv size={16} /> : <Film size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{p.name}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{p.year} • {p.type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono font-bold text-zinc-300">{p.rating.toFixed(1)}</p>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{formatCurrency(p.gross)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Development Options</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={() => {
                                const last = displayFranchise.projects[displayFranchise.projects.length - 1];
                                const nextNum = last.installmentNumber + 1;
                                const newScript: Script = {
                                    id: `script_seq_${Date.now()}`,
                                    title: `${displayFranchise.name} ${nextNum}`,
                                    genres: [displayFranchise.genre],
                                    status: 'CONCEPT',
                                    quality: 0,
                                    options: [],
                                    writerId: null,
                                    weeksInDevelopment: 0,
                                    totalDevelopmentWeeks: 0,
                                    isOriginal: false,
                                    projectType: displayFranchise.type,
                                    sourceMaterial: 'SEQUEL',
                                    franchiseId: displayFranchise.id,
                                    installmentNumber: nextNum,
                                    logline: `The next chapter in the ${displayFranchise.name} saga.`
                                };
                                onCommission(newScript);
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-xl flex items-center justify-between transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Plus size={20} />
                                <div className="text-left">
                                    <p className="font-black uppercase tracking-tight text-sm">{isCandidate ? 'Start Franchise (Sequel)' : 'Commission Sequel'}</p>
                                    <p className="text-[10px] opacity-70 font-bold">Develop {displayFranchise.name} {displayFranchise.lastInstallment + 1}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>

                        <button 
                            onClick={() => {
                                const newScript: Script = {
                                    id: `script_spin_${Date.now()}`,
                                    title: `Untitled ${displayFranchise.name} Spinoff`,
                                    genres: [displayFranchise.genre],
                                    status: 'CONCEPT',
                                    quality: 0,
                                    options: [],
                                    writerId: null,
                                    weeksInDevelopment: 0,
                                    totalDevelopmentWeeks: 0,
                                    isOriginal: false,
                                    projectType: displayFranchise.type === 'MOVIE' ? 'SERIES' : 'MOVIE',
                                    sourceMaterial: 'SPINOFF',
                                    franchiseId: displayFranchise.id,
                                    installmentNumber: 1,
                                    logline: `A new story set in the world of ${displayFranchise.name}.`
                                };
                                onCommission(newScript);
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-xl flex items-center justify-between transition-all border border-zinc-700"
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles size={20} className="text-amber-500" />
                                <div className="text-left">
                                    <p className="font-black uppercase tracking-tight text-sm">Develop Spinoff</p>
                                    <p className="text-[10px] text-zinc-400 font-bold">Expand the universe with a new perspective</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Studio Franchises</h2>
                <p className="text-xs text-zinc-400">Track and expand your most successful properties.</p>
            </div>

            {franchises.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {franchises.map(f => (
                        <div 
                            key={f.id} 
                            onClick={() => setSelectedFranchiseId(f.id)}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-amber-500 transition-colors">
                                        {f.type === 'SERIES' ? <Tv size={20} /> : <Film size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-amber-500 transition-colors">{f.name}</h3>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{f.projects.length} Installments • {f.type}</p>
                                    </div>
                                </div>
                                <div className="bg-zinc-800 p-2 rounded-lg text-zinc-400 group-hover:text-amber-500 transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                                <div>
                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Total Gross</p>
                                    <p className="text-sm font-mono font-bold text-white">{formatCurrency(f.totalGross)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">Avg Rating</p>
                                    <p className="text-sm font-mono font-bold text-white">{f.avgRating.toFixed(1)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {candidates.length > 0 && (
                <div className="space-y-4">
                    <div className="px-1">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Franchise Candidates</h3>
                        <p className="text-[9px] text-zinc-600 mt-1">Successful standalone projects ready for expansion.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {candidates.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => setSelectedFranchiseId(c.id)}
                                className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex justify-between items-center hover:border-amber-500/30 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 group-hover:text-amber-500 transition-colors">
                                        {c.type === 'SERIES' ? <Tv size={16} /> : <Film size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{c.name}</p>
                                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{formatCurrency(c.gross)} • {c.rating.toFixed(1)} Rating</p>
                                    </div>
                                </div>
                                <Plus size={14} className="text-zinc-700 group-hover:text-amber-500 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {franchises.length === 0 && candidates.length === 0 && (
                <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center">
                    <Layers size={48} className="text-zinc-800 mb-4" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No Franchises Established</p>
                    <p className="text-[9px] text-zinc-700 mt-2 max-w-[200px]">Produce sequels or spinoffs to start building a franchise.</p>
                </div>
            )}
        </div>
    );
};

const UNIVERSE_PRODUCT_BLUEPRINTS = [
    { id: 'merch_apparel', name: 'Apparel & Fashion', type: 'MERCH', cost: 500000, baseAppeal: 20, baseRevenue: 50000, description: 'T-shirts, hoodies, and accessories.' },
    { id: 'merch_toys', name: 'Action Figures & Toys', type: 'MERCH', cost: 1000000, baseAppeal: 35, baseRevenue: 120000, description: 'High-quality figures and playsets.' },
    { id: 'merch_collectibles', name: 'Premium Collectibles', type: 'MERCH', cost: 2500000, baseAppeal: 50, baseRevenue: 350000, description: 'Limited edition statues and replicas.' },
    { id: 'park_land', name: 'Themed Land (Park)', type: 'PARK', cost: 50000000, baseAppeal: 85, baseRevenue: 6000000, description: 'A dedicated area in a major theme park.' },
    { id: 'park_ride', name: 'Signature Attraction', type: 'PARK', cost: 15000000, baseAppeal: 65, baseRevenue: 1800000, description: 'A state-of-the-art immersive ride.' },
];

const UniverseMerchView: React.FC<{
    universe: Universe;
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
}> = ({ universe, player, studio, onUpdatePlayer }) => {
    const handleLaunchProduct = (blueprint: typeof UNIVERSE_PRODUCT_BLUEPRINTS[0]) => {
        if (studio.balance < blueprint.cost) return;

        const newProduct = {
            id: `up_${Date.now()}_${Math.random()}`,
            catalogId: blueprint.id,
            name: blueprint.name,
            quality: 70 + Math.random() * 30,
            productionCost: blueprint.cost,
            sellingPrice: blueprint.baseRevenue, // Using this as base weekly revenue for now
            appeal: blueprint.baseAppeal + (universe.brandPower / 10),
            unitsSold: 0,
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
                    ...player.world.universes,
                    [universe.id]: updatedUniverse
                }
            },
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        };

        onUpdatePlayer(updatedPlayer);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Weekly Income</p>
                    <p className="text-xl font-black text-emerald-400">{formatCurrency(universe.stats?.weeklyRevenue || 0)}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Lifetime Revenue</p>
                    <p className="text-xl font-black text-white">{formatCurrency(universe.stats?.lifetimeRevenue || 0)}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Active Licenses</p>
                    <p className="text-xl font-black text-white">{(universe.products || []).length}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Active Products & Lands</h3>
                {(universe.products || []).length === 0 ? (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
                        <p className="text-zinc-500 text-sm">No active merchandising or theme park licenses.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {universe.products.map((prod, idx) => (
                            <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-amber-500">
                                        {prod.catalogId.startsWith('park') ? <Palmtree size={20} /> : <ShoppingBag size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{prod.name}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Revenue: {formatCurrency(prod.sellingPrice)} / wk</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Appeal</p>
                                    <p className="text-sm font-black text-white">{Math.floor(prod.appeal)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Launch New Venture</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {UNIVERSE_PRODUCT_BLUEPRINTS.map(bp => {
                        const isOwned = (universe.products || []).some(p => p.catalogId === bp.id);
                        const canAfford = studio.balance >= bp.cost;
                        
                        return (
                            <div key={bp.id} className={`bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-3 flex flex-col ${isOwned ? 'opacity-50' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                                        {bp.type === 'PARK' ? <Palmtree size={20} /> : <ShoppingBag size={20} />}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cost</p>
                                        <p className="text-sm font-black text-white">{formatCurrency(bp.cost)}</p>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white">{bp.name}</p>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">{bp.description}</p>
                                </div>
                                <button 
                                    disabled={isOwned || !canAfford}
                                    onClick={() => handleLaunchProduct(bp)}
                                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isOwned ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : canAfford ? 'bg-amber-500 text-black hover:scale-[1.02]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                                >
                                    {isOwned ? 'Already Launched' : canAfford ? 'Launch Venture' : 'Insufficient Funds'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const UniverseDashboard: React.FC<{
    universe: Universe;
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
    onBack: () => void;
}> = ({ universe, player, studio, onUpdatePlayer, onBack }) => {
    const [activeTab, setActiveTab] = useState<'TIMELINE' | 'ROSTER' | 'MERCH'>('TIMELINE');
    const [editingSaga, setEditingSaga] = useState(false);
    const [editingPhase, setEditingPhase] = useState(false);
    const [sagaName, setSagaName] = useState(universe.currentSagaName || `Saga ${universe.saga}`);
    const [phaseName, setPhaseName] = useState(universe.currentPhaseName || `Phase ${universe.currentPhase}`);

    const updateUniverse = (updates: Partial<Universe>) => {
        const updatedUniverse = { ...universe, ...updates };
        const updatedPlayer = {
            ...player,
            world: {
                ...player.world,
                universes: {
                    ...player.world.universes,
                    [universe.id]: updatedUniverse
                }
            }
        };
        onUpdatePlayer(updatedPlayer);
    };

    const handleSaveSaga = () => {
        updateUniverse({ currentSagaName: sagaName });
        setEditingSaga(false);
    };

    const handleSavePhase = () => {
        updateUniverse({ currentPhaseName: phaseName });
        setEditingPhase(false);
    };

    const handleConcludePhase = () => {
        const currentPhaseNum = typeof universe.currentPhase === 'number' ? universe.currentPhase : parseInt(String(universe.currentPhase).replace(/\D/g, '')) || 1;
        const nextPhaseNum = currentPhaseNum + 1;
        
        const newsItem = {
            id: `news_phase_${Date.now()}`,
            headline: `${universe.name} announces Phase ${nextPhaseNum}!`,
            subtext: `The studio reveals the next chapter of their cinematic universe.`,
            category: 'UNIVERSE' as const,
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH' as const
        };

        const updatedPlayer = {
            ...player,
            news: [newsItem, ...player.news].slice(0, 50),
            world: {
                ...player.world,
                universes: {
                    ...player.world.universes,
                    [universe.id]: {
                        ...universe,
                        currentPhase: `Phase ${nextPhaseNum}`,
                        currentPhaseName: `Phase ${nextPhaseNum}`
                    }
                }
            }
        };
        
        if (studio.studioState) {
            const updatedStudio = {
                ...studio,
                studioState: {
                    ...studio.studioState,
                    universes: (studio.studioState?.universes || []).map(u => u.id === universe.id ? {
                        ...u,
                        currentPhase: `Phase ${nextPhaseNum}`,
                        currentPhaseName: `Phase ${nextPhaseNum}`
                    } : u)
                }
            };
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        }

        onUpdatePlayer(updatedPlayer);
        setPhaseName(`Phase ${nextPhaseNum}`);
    };

    const handleConcludeSaga = () => {
        const currentSagaNum = typeof universe.saga === 'number' ? universe.saga : parseInt(String(universe.saga).replace(/\D/g, '')) || 1;
        const nextSagaNum = currentSagaNum + 1;
        
        const newsItem = {
            id: `news_saga_${Date.now()}`,
            headline: `${universe.name} concludes, announces Saga ${nextSagaNum}!`,
            subtext: `An era ends, and a new one begins for the massive franchise.`,
            category: 'UNIVERSE' as const,
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH' as const
        };

        const updatedPlayer = {
            ...player,
            news: [newsItem, ...player.news].slice(0, 50),
            world: {
                ...player.world,
                universes: {
                    ...player.world.universes,
                    [universe.id]: {
                        ...universe,
                        saga: nextSagaNum,
                        currentSagaName: `Saga ${nextSagaNum}`,
                        currentPhase: 'Phase 1',
                        currentPhaseName: `Phase 1`
                    }
                }
            }
        };

        if (studio.studioState) {
            const updatedStudio = {
                ...studio,
                studioState: {
                    ...studio.studioState,
                    universes: (studio.studioState?.universes || []).map(u => u.id === universe.id ? {
                        ...u,
                        saga: nextSagaNum,
                        currentSagaName: `Saga ${nextSagaNum}`,
                        currentPhase: 'Phase 1',
                        currentPhaseName: `Phase 1`
                    } : u)
                }
            };
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        }

        onUpdatePlayer(updatedPlayer);
        setSagaName(`Saga ${nextSagaNum}`);
        setPhaseName(`Phase 1`);
    };

    const universeProjects = getUniverseDashboardProjects(player, universe.id, player.activeReleases || []);
    const normalizedRoster = buildUniverseRoster(universe, universeProjects, player.name);

    const timeline = universeProjects.reduce((acc, p) => {
        const sName = p?.universeSagaName || 'Saga 1';
        const pName = p?.universePhaseName || 'Phase 1';
        if (!acc[sName]) acc[sName] = {};
        if (!acc[sName][pName]) acc[sName][pName] = [];
        acc[sName][pName].push(p);
        return acc;
    }, {} as Record<string, Record<string, typeof universeProjects>>);

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white">{universe.name}</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Universe Dashboard</p>
                </div>
            </div>

            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                <button 
                    onClick={() => setActiveTab('TIMELINE')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'TIMELINE' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    Timeline
                </button>
                <button 
                    onClick={() => setActiveTab('ROSTER')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'ROSTER' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    Roster
                </button>
                <button 
                    onClick={() => setActiveTab('MERCH')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'MERCH' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    Merch & Licensing
                </button>
            </div>

            {activeTab === 'TIMELINE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Saga Control */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current Saga</h3>
                        <button onClick={handleConcludeSaga} className="text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 px-2 py-1 rounded hover:bg-rose-500/20">
                            Conclude Saga
                        </button>
                    </div>
                    {editingSaga ? (
                        <div className="flex gap-2">
                            <input 
                                value={sagaName} 
                                onChange={e => setSagaName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                            <button onClick={handleSaveSaga} className="bg-amber-500 text-black px-3 rounded text-xs font-bold">Save</button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center group">
                            <p className="text-xl font-black text-white">{universe.currentSagaName || `Saga ${universe.saga}`}</p>
                            <button onClick={() => setEditingSaga(true)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity">
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Phase Control */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current Phase</h3>
                        <button onClick={handleConcludePhase} className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-2 py-1 rounded hover:bg-blue-500/20">
                            Conclude Phase
                        </button>
                    </div>
                    {editingPhase ? (
                        <div className="flex gap-2">
                            <input 
                                value={phaseName} 
                                onChange={e => setPhaseName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                            <button onClick={handleSavePhase} className="bg-amber-500 text-black px-3 rounded text-xs font-bold">Save</button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center group">
                            <p className="text-xl font-black text-white">{universe.currentPhaseName || `Phase ${universe.currentPhase}`}</p>
                            <button onClick={() => setEditingPhase(true)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity">
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {activeTab === 'TIMELINE' && (
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Universe Timeline</h3>
                    {Object.keys(timeline).length === 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
                            <p className="text-zinc-500 text-sm">No projects released in this universe yet.</p>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Greenlight a project and attach it to this universe to begin.</p>
                        </div>
                    ) : (
                        Object.entries(timeline).map(([sName, phases]) => (
                            <div key={sName} className="space-y-4">
                                <h4 className="text-lg font-black text-amber-500 uppercase tracking-tight border-b border-zinc-800 pb-2">{sName}</h4>
                                <div className="pl-4 border-l-2 border-zinc-800 space-y-6">
                                    {Object.entries(phases).map(([pName, projects]) => (
                                        <div key={pName} className="space-y-3">
                                            <h5 className="text-sm font-bold text-white uppercase tracking-widest">{pName}</h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {projects.map((p, idx) => (
                                                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-zinc-500 shrink-0">
                                                            {p.type === 'SERIES' ? <Tv size={14} /> : <Film size={14} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{p.title}</p>
                                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">{p.genre} • {p.budgetTier}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'ROSTER' && (
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Character Roster</h3>
                    {normalizedRoster.length === 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
                            <p className="text-zinc-500 text-sm">No characters in this universe yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {normalizedRoster.map((char, idx) => (
                                <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="text-lg font-black text-white">{char.name}</p>
                                        <div className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                            {char.roleType || 'ACTIVE'}
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Played by <span className="text-zinc-300">{char.actorId === 'PLAYER_SELF' ? 'You' : char.actorName}</span>
                                    </p>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                                        First: {char.firstAppearanceTitle || 'Unknown'} • Latest: {char.latestAppearanceTitle || 'Unknown'}
                                    </p>
                                    <div className="flex items-center gap-4 pt-2">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                                <span>Approval</span>
                                                <span>{Math.round(char.fanApproval || 0)}%</span>
                                            </div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${Math.round(char.fanApproval || 0)}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                                <span>Appearances</span>
                                                <span>{char.appearances || 1}</span>
                                            </div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (char.appearances || 1) * 18)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'MERCH' && (
                <UniverseMerchView 
                    universe={universe} 
                    player={player} 
                    studio={studio}
                    onUpdatePlayer={onUpdatePlayer} 
                />
            )}
        </div>
    );
};

const UniverseManager: React.FC<{
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
}> = ({ player, studio, onUpdatePlayer }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null);

    const worldUniverses = player.world?.universes || {};
    const studioUniverses = (Object.values(worldUniverses) as Universe[]).filter(u => u.studioId === studio.id);
    const rivalUniverses = (Object.values(worldUniverses) as Universe[]).filter(u => u.studioId !== studio.id);

    // Dynamic Market Share Calculation
    const allUniverses = Object.values(worldUniverses) as Universe[];
    const totalPower = allUniverses.reduce((acc, u) => acc + (u.brandPower * 0.7 + u.momentum * 0.3), 0);
    
    const universesWithShare = allUniverses.map(u => ({
        ...u,
        marketShare: totalPower > 0 ? ((u.brandPower * 0.7 + u.momentum * 0.3) / totalPower) * 100 : 0
    })).sort((a, b) => b.marketShare - a.marketShare);

    const handleCreate = () => {
        if (studio.balance < 5000000) return; // Costs $5M to start a universe

        const newUniverseId = name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now();
        const colors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUniverse: any = {
            id: newUniverseId,
            name,
            description,
            studioId: studio.id,
            currentPhase: 1,
            currentPhaseName: 'Phase 1',
            saga: 1,
            currentSagaName: 'Saga 1',
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
            return <UniverseDashboard universe={universe} player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} onBack={() => setSelectedUniverseId(null)} />;
        }
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Cinematic Universes</h2>
                        <p className="text-xs text-zinc-400 mt-1">Build interconnected worlds. Universes compete for market share and audience attention.</p>
                    </div>
                    {!isCreating && (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Start New Universe
                        </button>
                    )}
                </div>

                {isCreating && (
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Universe Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. The MonsterVerse"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="What is this world about?"
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
                                Register Universe ($5M)
                            </button>
                            <button 
                                onClick={() => setIsCreating(false)}
                                className="px-6 py-3 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Market Share Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Market Share Battle</h3>
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
                                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Brand Power: {u.brandPower}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Your Universes</h3>
                    {studioUniverses.length === 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <Sparkles size={32} className="text-zinc-700 mb-3" />
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No Studio Universes</p>
                        </div>
                    ) : (
                        studioUniverses.map((u: any) => (
                            <div 
                                key={u.id} 
                                onClick={() => setSelectedUniverseId(u.id)}
                                className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 space-y-4 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-black text-white uppercase group-hover:text-amber-400 transition-colors">{u.name}</h4>
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        {u.currentPhaseName || `Phase ${u.currentPhase}`}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-zinc-500 uppercase font-bold">Momentum</span>
                                        <span className="text-white font-mono">{u.momentum}/100</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${u.momentum}%` }} />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[8px] text-zinc-500 uppercase font-black">Saga</p>
                                        <p className="text-xs font-mono text-white">{u.currentSagaName || `Saga ${u.saga}`}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-zinc-500 uppercase font-black">Roster</p>
                                        <p className="text-xs font-mono text-white">{u.roster.length} Heroes</p>
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
