import React, { useEffect, useState } from 'react';
import { Player, Business, Script, ProjectType, Universe } from '../../../types';
import { ArrowLeft, BookOpen, ShoppingCart, Sparkles, Layers, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { generateWriters, generateIPMarket } from '../../../src/data/generators';
import { normalizeStudioState } from '../../../services/businessLogic';
import { createMarketTrends } from '../../../services/marketTrends';
import { discardUnreleasedScript, renameScriptWorkingTitle } from '../../../services/projectNaming';
import { developOwnedRight, renewOwnedRight } from '../../../services/rightsNegotiation';
import { deriveStudioOriginalRights } from '../../../services/studioOriginalIp';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import { DevelopmentLabMarket } from './components/DevelopmentLabMarket';
import { DevelopmentLabScriptWizard } from './components/DevelopmentLabScriptWizard';
import { DevelopmentLabFranchiseManager } from './components/DevelopmentLabFranchiseManager';
import { DevelopmentLabUniverseManager } from './components/DevelopmentLabUniverseManager';
import { DevelopmentLabScriptVault } from './components/DevelopmentLabScriptVault';

interface DevelopmentLabProps {
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onOpenProject?: (projectId: string) => void;
    initialRightsMarketOpportunityId?: string;
    onRightsMarketTargetConsumed?: () => void;
    initialTab?: DevelopmentLabInitialTab;
    initialProjectType?: ProjectType;
    initialScriptId?: string;
}

export type DevelopmentLabInitialTab = 'VAULT' | 'NEW_CONCEPT' | 'IP_MARKET' | 'FRANCHISES' | 'UNIVERSE';
type DevTab = DevelopmentLabInitialTab;

export const DevelopmentLab: React.FC<DevelopmentLabProps> = ({ player, studio, onBack, onUpdatePlayer, onOpenProject, initialRightsMarketOpportunityId, onRightsMarketTargetConsumed, initialTab, initialProjectType, initialScriptId }) => {
    const [activeTab, setActiveTab] = useState<DevTab>(initialRightsMarketOpportunityId ? 'IP_MARKET' : initialTab || 'VAULT');
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    useEffect(() => {
        if (initialRightsMarketOpportunityId) setActiveTab('IP_MARKET');
        else if (initialTab) setActiveTab(initialTab);
    }, [initialRightsMarketOpportunityId, initialTab, studio.id]);
    
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
            const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
            const newMarket = generateIPMarket(6, studioState.purchasedIPTitles || [], player.currentWeek);
            const marketTrends = createMarketTrends(player.currentWeek, language);
            const newWriters = generateWriters(10);
            
            const updatedStudio = { 
                ...studio, 
                balance: studio.balance - 250000,
                studioState: {
                    ...studioState,
                    ipMarket: newMarket,
                    marketTrends,
                    writers: newWriters,
                    lastMarketRefreshWeek: player.currentWeek,
                    lastWriterRefreshWeek: player.currentWeek,
                    lastMarketRefreshAbsoluteWeek: currentAbsoluteWeek,
                    lastWriterRefreshAbsoluteWeek: currentAbsoluteWeek,
                }
            };
            
            onUpdatePlayer({
                ...player,
                businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
            });
        }
    };

    const acquiredRights = studioState.ownedRights || [];
    const studioOriginalRights = deriveStudioOriginalRights({
        studioId: studio.id,
        scripts: studioState.scripts,
        activeReleases: player.activeReleases,
        pastProjects: player.pastProjects,
        acquiredRights,
        purchasedIPTitles: studioState.purchasedIPTitles || [],
    });
    const unifiedOwnedRights = [...acquiredRights, ...studioOriginalRights];

    // Handle automatic market refresh and script cleanup
    React.useEffect(() => {
        const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
        const legacyElapsed = (
            player.currentWeek - Math.min(52, Math.max(1, studioState.lastMarketRefreshWeek || player.currentWeek)) + 52
        ) % 52;
        const lastMarketRefreshAbsoluteWeek = Number.isFinite(Number(studioState.lastMarketRefreshAbsoluteWeek))
            ? Number(studioState.lastMarketRefreshAbsoluteWeek)
            : currentAbsoluteWeek - legacyElapsed;
        
        let updatedState: Partial<typeof studioState> = {};
        let needsUpdate = false;

        // 1. Refresh market only on 3-week cycle or if state is completely missing (initialization)
        if (currentAbsoluteWeek - lastMarketRefreshAbsoluteWeek >= 3 || !studio.studioState) {
            const newMarket = generateIPMarket(6, studioState.purchasedIPTitles || [], player.currentWeek);
            const newWriters = generateWriters(10);
            updatedState = { 
                ...updatedState,
                ipMarket: newMarket,
                marketTrends: createMarketTrends(player.currentWeek, language),
                writers: newWriters,
                lastMarketRefreshWeek: player.currentWeek,
                lastWriterRefreshWeek: player.currentWeek,
                lastMarketRefreshAbsoluteWeek: currentAbsoluteWeek,
                lastWriterRefreshAbsoluteWeek: currentAbsoluteWeek,
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
    }, [
        language,
        player.age,
        player.currentWeek,
        studio.id,
        studio.studioState,
        studioState.lastMarketRefreshAbsoluteWeek,
        studioState.lastMarketRefreshWeek,
        studioState.purchasedIPTitles,
        studioState.scripts,
    ]);

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
                            <h1 className="text-xl font-black tracking-tight leading-none">{tr('developmentLab.title')}</h1>
	                            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">{tr('developmentLab.subtitle')}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/30 bg-zinc-950/50 px-2">
                    {[
                        { id: 'VAULT', labelKey: 'developmentLab.tab.vault', icon: <BookOpen size={14} /> },
                        { id: 'NEW_CONCEPT', labelKey: 'developmentLab.tab.concept', icon: <Sparkles size={14} /> },
                        { id: 'IP_MARKET', labelKey: 'developmentLab.tab.market', icon: <ShoppingCart size={14} /> },
                        { id: 'FRANCHISES', labelKey: 'developmentLab.tab.franchise', icon: <Layers size={14} /> },
                        { id: 'UNIVERSE', labelKey: 'developmentLab.tab.universe', icon: <Globe size={14} /> }
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
                                    {tr(tab.labelKey)}
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
                {activeTab === 'VAULT' && <DevelopmentLabScriptVault
                    scripts={studioState.scripts} 
                    writers={studioState.writers}
                    studioBalance={studio.balance}
                    studioId={studio.id}
                    player={player}
                    ownedRights={unifiedOwnedRights}
                    onOpenProject={onOpenProject}
                    onOpenFranchise={() => setActiveTab('FRANCHISES')}
                    onOpenUniverse={() => setActiveTab('UNIVERSE')}
                    initialScriptId={initialScriptId}
                    onRenewRight={(rightId) => {
                        const ownedRight = acquiredRights.find(right => right.id === rightId);
                        if (!ownedRight) return { changed: false, message: 'Only acquired rights can be renewed.' };
                        const renewal = renewOwnedRight({ ownedRight, currentWeek: player.currentWeek, studioBalance: studio.balance });
                        if (!renewal.changed) {
                            return {
                                changed: false,
                                message: renewal.reason === 'INSUFFICIENT_FUNDS' ? 'Not enough studio capital to renew.' : 'This IP cannot be renewed yet.',
                            };
                        }
                        const updatedStudio = {
                            ...studio,
                            balance: renewal.balance,
                            studioState: {
                                ...studioState,
                                ownedRights: acquiredRights.map(right => right.id === rightId ? renewal.ownedRight : right),
                            },
                        };
                        onUpdatePlayer({
                            ...player,
                            businesses: player.businesses.map(business => business.id === studio.id ? updatedStudio : business),
                        });
                        return { changed: true, message: `Licence renewed for ${renewal.ownedRight.expiresAtWeek! - player.currentWeek} weeks.` };
                    }}
                    onDevelopRight={(rightId, choice) => {
                        const ownedRight = (studioState.ownedRights || []).find(right => right.id === rightId);
                        if (!ownedRight) return null;
                        const development = developOwnedRight({ ownedRight, currentWeek: player.currentWeek, choice });
                        if (!development.changed || !development.script || !development.ownedRight) return null;
                        handleUpdateStudioState({
                            ownedRights: (studioState.ownedRights || []).map(right => right.id === rightId ? development.ownedRight! : right),
                            scripts: [...studioState.scripts, development.script],
                        });
                        return development.script.id;
                    }}
                    onAssign={(scriptId, writerId, cost, skill, speed) => {
                        if (studio.balance >= cost) {
                            const writer = studioState.writers.find(w => w.id === writerId);
                            const updatedScripts = studioState.scripts.map(s => {
                                if (s.id === scriptId) {
                                    return {
                                        ...s,
                                        status: 'IN_DEVELOPMENT' as const,
                                        writerId,
                                        author: writer?.name || s.author,
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
                        const result = discardUnreleasedScript(
                            studioState.scripts,
                            studioState.concepts || [],
                            scriptId
                        );
                        if (result.discarded) {
                            handleUpdateStudioState({
                                scripts: result.scripts,
                                concepts: result.concepts
                            });
                        }
                    }}
                    onRename={(scriptId, title) => {
                        const updatedPlayer = renameScriptWorkingTitle(player, studio.id, scriptId, title);
                        if (updatedPlayer !== player) {
                            onUpdatePlayer(updatedPlayer);
                        }
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
                {activeTab === 'NEW_CONCEPT' && <DevelopmentLabScriptWizard key={`${studio.id}_${initialProjectType || 'ANY'}`} language={language} initialProjectType={initialProjectType} onComplete={(script) => {
                    handleUpdateStudioState({ scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }] });
                    setActiveTab('VAULT');
                }} />}
                {activeTab === 'IP_MARKET' && <DevelopmentLabMarket
	                    market={studioState.ipMarket}
                        player={player}
                        studio={studio}
                        onUpdatePlayer={onUpdatePlayer}
	                    initialRightsMarketOpportunityId={initialRightsMarketOpportunityId}
	                    onRightsMarketTargetConsumed={onRightsMarketTargetConsumed}
	                    playerMoney={studio.balance}
	                    currentWeek={player.currentWeek}
	                    marketTrends={studioState.marketTrends || createMarketTrends(player.currentWeek, language)}
                        language={language}
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
                {activeTab === 'FRANCHISES' && <DevelopmentLabFranchiseManager
                    player={player}
                    studio={studio}
                    onCommission={(script) => {
                        handleUpdateStudioState({ scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }] });
                        setActiveTab('VAULT');
                    }}
                />}
                {activeTab === 'UNIVERSE' && <DevelopmentLabUniverseManager
                    player={player}
                    studio={studio}
                    onUpdatePlayer={onUpdatePlayer}
                    onCommission={(script) => {
                        handleUpdateStudioState({ scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }] });
                        setActiveTab('VAULT');
                    }}
                />}
            </div>
        </div>
    );
};

// --- Subcomponents ---
