import React, { useEffect, useMemo, useState } from 'react';
import { Player, Business, Script, Writer, Genre, ProjectType, ScriptAttributes, TargetAudience, Universe, ProjectFormat, ScriptSubjectType, OwnedRight, OwnedRightDevelopmentChoice } from '../../../types';
import { ArrowLeft, PenTool, BookOpen, ShoppingCart, Users, Star, Clock, DollarSign, Sparkles, ChevronRight, Layers, Globe, RefreshCw, Plus, History, Film, Tv, Edit2, ShoppingBag, Palmtree, Flame, Gauge, Trophy, AlertTriangle, RotateCcw, Info, Trash2, Archive, Clapperboard, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getWriterTalent } from '../../../services/roleLogic';
import { generateWriters, generateIPMarket, generateProceduralLogline } from '../../../src/data/generators';
import { SCRIPT_TEMPLATES, ScriptQuestion } from '../../../src/data/scriptTemplates';
import { normalizeStudioState, resolveProjectType } from '../../../services/businessLogic';
import { buildUniverseRoster, calculateUniverseProductWeeklyRevenue, getUniverseDashboardProjects, getUniverseLifecycleRevenueMultiplier, getUniverseReleaseActivity, isUniverseRetired, normalizeUniverseForSave, normalizeUniverseMap, rebootRetiredUniverse, retireUniverseForArchive } from '../../../services/universeLogic';
import { ALL_GENRES, PROJECT_FORMATS, formatGenreLabel, formatProjectFormatLabel, isSubjectDrivenGenre } from '../../../services/genreCatalog';
import { createMarketTrends, getGenreMarketTrend, getScriptMarketDemand } from '../../../services/marketTrends';
import { canManageWorkingTitle, discardUnreleasedScript, renameScriptWorkingTitle } from '../../../services/projectNaming';
import { DiscardScriptDialog } from './components/DiscardScriptDialog';
import { WorkingTitleDialog } from './components/WorkingTitleDialog';
import { UniverseRetirementDialog } from './components/UniverseRetirementDialog';
import { createContinuationScript, getContinuationEligibility } from '../../../services/sequelFlow';
import { getStudioMarketScripts, StudioMarketLane } from '../../../services/studioMarket';
import { RightsMarket } from './components/RightsMarket';
import { developOwnedRight, renewOwnedRight } from '../../../services/rightsNegotiation';
import { OwnedRightDevelopmentBrief } from './components/OwnedRightDevelopmentBrief';
import { OwnedIpDossier } from './components/OwnedIpDossier';
import { getOwnedIpPerformance } from '../../../services/ownedIpPerformance';
import { deriveStudioOriginalRights } from '../../../services/studioOriginalIp';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { getInheritedStudioProjects } from '../../../services/legacyLogic';
import { getReleaseDisplayPhase } from '../../../services/releasePresentation';

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
}

export type DevelopmentLabInitialTab = 'VAULT' | 'NEW_CONCEPT' | 'IP_MARKET' | 'FRANCHISES' | 'UNIVERSE';
type DevTab = DevelopmentLabInitialTab;
type FranchiseCommissionMode = 'SEQUEL' | 'SPINOFF' | 'FINALE' | 'REBOOT';

// --- Helpers ---
const clampScriptStat = (value: number) => Math.max(10, Math.min(100, Math.round(value)));
const CUSTOM_PREMISE_MAX_LENGTH = 180;

const sanitizeCustomPremise = (value: string) => value.replace(/\s+/g, ' ').trimStart().slice(0, CUSTOM_PREMISE_MAX_LENGTH);

const getSubjectTypeLabel = (subjectType?: ScriptSubjectType) => (subjectType || 'PUBLIC_FIGURE').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const getSourceMaterialLabel = (source?: string) => {
    if (!source) return 'Original';
    if (source === 'LIFE_RIGHTS') return 'Life Rights';
    if (source === 'DOCUMENTARY_SUBJECT') return 'Doc Access';
    if (source === 'SPEC_SCRIPT') return 'Spec Script';
    return source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const getFormatQuestions = (format: ProjectFormat): ScriptQuestion[] => {
    if (format === 'ANIMATED') {
        return [{
            id: 'format-animation-style',
            question: 'What animation identity does it have?',
            options: [
                { id: 'family-spectacle', text: 'Family Spectacle', reviewSnippet: 'bright, emotional, and built for all ages', newsHeadline: 'Families are already responding to the animation concept.' },
                { id: 'stylized-art-film', text: 'Stylized Art Film', reviewSnippet: 'visually daring and emotionally precise', newsHeadline: 'The animation style is being called bold and distinctive.' },
                { id: 'voice-comedy', text: 'Voice-Driven Comedy', reviewSnippet: 'powered by funny, expressive performances', newsHeadline: 'The voice performances are expected to be the selling point.' }
            ]
        }];
    }
    if (format === 'ANIME') {
        return [{
            id: 'format-anime-lane',
            question: 'Which anime lane does it follow?',
            options: [
                { id: 'shonen-event', text: 'Shonen Event Film', reviewSnippet: 'big emotion, rivalries, and explosive action', newsHeadline: 'Anime fans are circling the event-film energy.' },
                { id: 'dark-fantasy', text: 'Dark Fantasy Anime', reviewSnippet: 'mythic, intense, and visually sharp', newsHeadline: 'The dark fantasy anime angle is building serious buzz.' },
                { id: 'slice-of-life', text: 'Slice-of-Life Drama', reviewSnippet: 'quiet, heartfelt, and character-driven', newsHeadline: 'The intimate anime drama could be a sleeper hit.' }
            ]
        }];
    }
    return [];
};

const getSubjectQuestions = (genre: Genre, subjectName: string, subjectType: ScriptSubjectType): ScriptQuestion[] => {
    if (!isSubjectDrivenGenre(genre)) return [];
    const label = subjectName || 'the subject';
    if (genre === 'BIOPIC') {
        return [{
            id: 'subject-biopic-focus',
            question: `What part of ${label}'s story anchors the movie?`,
            options: [
                { id: 'private-cost', text: 'Private Cost of Fame', reviewSnippet: 'finding pain beneath the public image', newsHeadline: `${label}'s private life gives the biopic emotional weight.` },
                { id: 'defining-victory', text: 'Defining Victory', reviewSnippet: 'building toward the moment that changed everything', newsHeadline: `${label}'s defining win gives the film a strong spine.` },
                { id: 'messy-truth', text: 'Messy Truth', reviewSnippet: 'refusing to sand down the contradictions', newsHeadline: `The ${getSubjectTypeLabel(subjectType)} angle is being treated with unusual honesty.` }
            ]
        }];
    }
    return [{
        id: 'subject-doc-access',
        question: `What access do we have to ${label}?`,
        options: [
            { id: 'exclusive-footage', text: 'Exclusive Footage', reviewSnippet: 'driven by material nobody has seen before', newsHeadline: `Exclusive footage makes the ${label} documentary feel urgent.` },
            { id: 'key-witnesses', text: 'Key Witnesses', reviewSnippet: 'built around firsthand testimony', newsHeadline: `Witness interviews are giving the documentary real authority.` },
            { id: 'open-question', text: 'Unresolved Question', reviewSnippet: 'following a mystery without easy answers', newsHeadline: `The unresolved question at the center of ${label} is grabbing attention.` }
        ]
    }];
};

const getScriptQuestions = (genre: Genre, format: ProjectFormat, subjectName: string, subjectType: ScriptSubjectType): ScriptQuestion[] => [
    ...getFormatQuestions(format),
    ...getSubjectQuestions(genre, subjectName, subjectType),
    ...(SCRIPT_TEMPLATES[genre] || []),
];

const calculateConceptAttributes = (
    genre: Genre,
    format: ProjectFormat,
    subjectType: ScriptSubjectType,
    selectedOptions: { questionId: string; choiceId: string }[],
    hasSecondaryGenre: boolean
): ScriptAttributes => {
    const attrs: ScriptAttributes = { plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50 };
    const boost = (stat: keyof ScriptAttributes, amount: number) => {
        attrs[stat] = clampScriptStat((attrs[stat] || 50) + amount);
    };

    if (hasSecondaryGenre) boost('originality', 4);
    if (format === 'ANIMATED') {
        boost('originality', 8);
        boost('characters', 5);
        if (genre === 'ANIMATION' || genre === 'FANTASY') boost('action', 5);
    }
    if (format === 'ANIME') {
        boost('originality', 10);
        boost('action', 7);
        boost('pacing', 4);
    }
    if (genre === 'BIOPIC') {
        boost('characters', 10);
        boost('dialogue', 4);
        boost('originality', subjectType === 'ATHLETE' || subjectType === 'MUSICIAN' ? 5 : 2);
    }
    if (genre === 'DOCUMENTARY') {
        boost('originality', 12);
        boost('plot', 6);
        boost('dialogue', 3);
        boost('action', -8);
    }
    if (genre === 'MUSICAL') {
        boost('originality', 8);
        boost('dialogue', 5);
        boost('pacing', 5);
    }
    if (genre === 'SPORTS') {
        boost('action', 8);
        boost('pacing', 6);
        boost('characters', 4);
    }
    if (genre === 'CRIME') {
        boost('plot', 8);
        boost('pacing', 5);
    }
    if (genre === 'MYSTERY') {
        boost('plot', 10);
        boost('originality', 4);
        boost('pacing', 3);
        boost('dialogue', 2);
    }
    if (genre === 'FANTASY') {
        boost('plot', 8);
        boost('originality', 7);
    }

    selectedOptions.forEach(option => {
        const id = option.choiceId;
        if (/archive|exclusive|original|forbidden|lost-heir|world|mature|stylized|messy/.test(id)) boost('originality', 5);
        if (/authorized|private|intimate|character|slice|family|community|mob/.test(id)) boost('characters', 5);
        if (/investigative|detective|mystery|case|truth|open-question/.test(id)) boost('plot', 5);
        if (/shonen|rivalry|final|breakneck|sports|action|monster/.test(id)) boost('action', 5);
        if (/jukebox|voice|comedy|dialogue|interviews|witnesses/.test(id)) boost('dialogue', 5);
        if (/comeback|underdog|cultural|backstage|fame|dark-fantasy/.test(id)) boost('pacing', 4);
    });

    return attrs;
};

const calculateConceptQuality = (attrs: ScriptAttributes) => {
    const weighted = ((attrs.plot || 50) * 1.2) + ((attrs.characters || 50) * 1.1) + (attrs.pacing || 50) + (attrs.dialogue || 50) + ((attrs.action || 50) * 0.85) + ((attrs.originality || 50) * 1.1);
    return clampScriptStat(weighted / 6.25);
};

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

const getOwnedIpTypePresentation = (type: OwnedRight['propertyType'], language: ReturnType<typeof getPlayerLanguage>) => {
    switch (type) {
        case 'CHARACTER':
            return { label: t(language, 'developmentLab.ipType.CHARACTER'), Icon: Users, tone: 'border-sky-400/35 bg-sky-400/10 text-sky-300' };
        case 'STORY_WORLD':
            return { label: t(language, 'developmentLab.ipType.STORY_WORLD'), Icon: Globe, tone: 'border-violet-400/35 bg-violet-400/10 text-violet-300' };
        case 'FRANCHISE':
            return { label: t(language, 'developmentLab.ipType.FRANCHISE'), Icon: Layers, tone: 'border-amber-400/35 bg-amber-400/10 text-amber-300' };
        case 'CATALOG':
            return { label: t(language, 'developmentLab.ipType.CATALOG'), Icon: Archive, tone: 'border-teal-400/35 bg-teal-400/10 text-teal-300' };
    }
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const getUniverseCharacterTimelineText = (char: any) => {
    const first = typeof char?.firstAppearanceTitle === 'string' && char.firstAppearanceTitle.trim()
        ? char.firstAppearanceTitle.trim()
        : '';
    const latest = typeof char?.latestAppearanceTitle === 'string' && char.latestAppearanceTitle.trim()
        ? char.latestAppearanceTitle.trim()
        : '';
    if (first && latest) return `First: ${first} • Latest: ${latest}`;
    if (first) return `Introduced in ${first}`;
    return 'Not introduced on-screen yet';
};

const getUniverseCharacterTimelineParts = (char: any) => {
    const first = typeof char?.firstAppearanceTitle === 'string' && char.firstAppearanceTitle.trim()
        ? char.firstAppearanceTitle.trim()
        : '';
    const latest = typeof char?.latestAppearanceTitle === 'string' && char.latestAppearanceTitle.trim()
        ? char.latestAppearanceTitle.trim()
        : '';
    return {
        first: first && !/^unknown$/i.test(first) ? first : '',
        latest: latest && !/^unknown$/i.test(latest) ? latest : ''
    };
};

export const DevelopmentLab: React.FC<DevelopmentLabProps> = ({ player, studio, onBack, onUpdatePlayer, onOpenProject, initialRightsMarketOpportunityId, onRightsMarketTargetConsumed, initialTab, initialProjectType }) => {
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
                    lastWriterRefreshWeek: player.currentWeek
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
        const currentBlock = Math.floor(player.currentWeek / 3);
        const lastBlock = Math.floor((studioState.lastMarketRefreshWeek || 0) / 3);
        
        let updatedState: Partial<typeof studioState> = {};
        let needsUpdate = false;

        // 1. Refresh market only on 3-week cycle or if state is completely missing (initialization)
        if (currentBlock > lastBlock || !studio.studioState) {
            const newMarket = generateIPMarket(6, studioState.purchasedIPTitles || [], player.currentWeek);
            const newWriters = generateWriters(10);
            updatedState = { 
                ...updatedState,
                ipMarket: newMarket,
                marketTrends: createMarketTrends(player.currentWeek, language),
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
                {activeTab === 'VAULT' && <ScriptVault 
                    scripts={studioState.scripts} 
                    writers={studioState.writers}
                    studioBalance={studio.balance}
                    studioId={studio.id}
                    player={player}
                    ownedRights={unifiedOwnedRights}
                    onOpenProject={onOpenProject}
                    onOpenFranchise={() => setActiveTab('FRANCHISES')}
                    onOpenUniverse={() => setActiveTab('UNIVERSE')}
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
                {activeTab === 'NEW_CONCEPT' && <ScriptWizard key={`${studio.id}_${initialProjectType || 'ANY'}`} language={language} initialProjectType={initialProjectType} onComplete={(script) => {
                    handleUpdateStudioState({ scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }] });
                    setActiveTab('VAULT');
                }} />}
                {activeTab === 'IP_MARKET' && <IPMarket 
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

const ScriptVault: React.FC<{ 
    scripts: Script[], 
    writers: Writer[],
    studioBalance: number,
    studioId: string,
    player: Player,
    ownedRights: OwnedRight[],
    onOpenProject?: (projectId: string) => void,
    onOpenFranchise: () => void,
    onOpenUniverse: () => void,
    onRenewRight: (rightId: string) => { changed: boolean; message: string },
    onDevelopRight: (rightId: string, choice: OwnedRightDevelopmentChoice) => string | null,
    onAssign: (scriptId: string, writerId: string, cost: number, skill: number, speed: number) => void,
    onUpdateScript: (script: Script, costType?: 'ENERGY' | 'MONEY', costAmount?: number) => void,
    onDelete: (id: string) => void,
    onRename: (id: string, title: string) => void,
    onDeductEnergy: (amount: number) => void,
    onDeductMoney: (amount: number) => void
}> = ({ scripts, writers, studioBalance, studioId, player, ownedRights, onOpenProject, onOpenFranchise, onOpenUniverse, onRenewRight, onDevelopRight, onAssign, onUpdateScript, onDelete, onRename, onDeductEnergy, onDeductMoney }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const [selectedScriptForAssignment, setSelectedScriptForAssignment] = useState<string | null>(null);
    const [assignmentMode, setAssignmentMode] = useState<'CHOICE' | 'HIRE' | 'WIZARD' | 'DOCTOR'>('CHOICE');
    const [confirmation, setConfirmation] = useState<string | null>(null);
    const [discardScript, setDiscardScript] = useState<Script | null>(null);
    const [renameScript, setRenameScript] = useState<Script | null>(null);
    const [developmentRight, setDevelopmentRight] = useState<OwnedRight | null>(null);
    const [dossierRight, setDossierRight] = useState<OwnedRight | null>(null);
    const [vaultLane, setVaultLane] = useState<'SCRIPTS' | 'RIGHTS'>('SCRIPTS');
    const [ipSourceFilter, setIpSourceFilter] = useState<'ALL' | 'ACQUIRED' | 'STUDIO_ORIGINAL'>('ALL');
    const scriptStatusPriority: Record<Script['status'], number> = {
        READY: 0,
        CONCEPT: 1,
        IN_DEVELOPMENT: 2,
        PRODUCED: 3
    };

    const sortScriptsForVault = (items: Script[]) => [...items].sort((a, b) => {
        const statusDelta = scriptStatusPriority[a.status] - scriptStatusPriority[b.status];
        if (statusDelta !== 0) return statusDelta;
        const aWeek = a.status === 'PRODUCED' ? (a.producedAtWeek ?? a.createdAtWeek ?? 0) : (a.createdAtWeek ?? 0);
        const bWeek = b.status === 'PRODUCED' ? (b.producedAtWeek ?? b.createdAtWeek ?? 0) : (b.createdAtWeek ?? 0);
        return bWeek - aWeek;
    });

    const activeScripts = sortScriptsForVault(scripts.filter(script => script.status !== 'PRODUCED'));
    const producedScripts = sortScriptsForVault(scripts.filter(script => script.status === 'PRODUCED'));
    const shouldCollapseProducedArchive = producedScripts.length > 5;
    const [isProducedArchiveExpanded, setIsProducedArchiveExpanded] = useState(false);
    const visibleProducedScripts = shouldCollapseProducedArchive && !isProducedArchiveExpanded ? [] : producedScripts;
    const ownedIpPerformanceById = useMemo(() => new Map(ownedRights.map(right => [
        right.id,
        getOwnedIpPerformance({
            ownedRight: right,
            studioId,
            scripts,
            activeReleases: player.activeReleases,
            pastProjects: player.pastProjects,
        }),
    ])), [ownedRights, studioId, scripts, player.activeReleases, player.pastProjects]);
    const visibleOwnedRights = ownedRights.filter(right => ipSourceFilter === 'ALL'
        || (right.ownershipSource || 'ACQUIRED') === ipSourceFilter);

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
                        language={language}
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

    const renderScriptCard = (script: Script, variant: 'active' | 'archive' = 'active') => (
                <div key={script.id} className={`border rounded-xl p-4 ${variant === 'archive' ? 'bg-zinc-950/70 border-zinc-800/70' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 pr-3">
                            <h3 className="min-w-0 break-words font-bold text-lg leading-tight">{script.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
	                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${resolveProjectType(script.projectType, (script as any).type, (script as any).projectDetails?.type) === 'SERIES' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
	                                    {resolveProjectType(script.projectType, (script as any).type, (script as any).projectDetails?.type)} {resolveProjectType(script.projectType, (script as any).type, (script as any).projectDetails?.type) === 'SERIES' && `(${script.episodes || 8} eps)`}
                                </span>
                                {script.genres.map(g => (
                                    <span key={g} className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-wider">{formatGenreLabel(g)}</span>
                                ))}
                                {script.format && (
                                    <span className="text-[9px] bg-sky-500/10 text-sky-300 px-1.5 py-0.5 rounded uppercase tracking-wider border border-sky-500/20">{formatProjectFormatLabel(script.format)}</span>
                                )}
                                {script.subjectName && (
                                    <span className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-500/20">Subject: {script.subjectName}</span>
                                )}
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
                                    className={`col-span-2 font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                                        script.isOriginal 
                                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
                                            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                    }`}
                                    title={!script.isOriginal ? "Cannot rewrite acquired IP" : ""}
                                >
                                    <PenTool size={12} />
                                    Page One Rewrite
                                </button>
                            </div>
                        </div>
                    )}

                    {script.status === 'PRODUCED' && (
                        <div className="mt-4 flex items-center gap-2">
                            <Star size={14} className={script.quality >= 80 ? 'text-amber-400' : script.quality >= 50 ? 'text-zinc-400' : 'text-red-400'} />
                            <span className="text-sm font-bold">Quality: {script.quality}/100</span>
                            {script.producedAtWeek !== undefined && (
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold ml-auto">Produced W{script.producedAtWeek}</span>
                            )}
                        </div>
                    )}

                    {canManageWorkingTitle(script.status) && (
                        <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                            <p className="text-[10px] text-zinc-600">Unreleased project</p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setRenameScript(script)}
                                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                                    title="Rename working title"
                                >
                                    <Edit2 size={13} />
                                    Rename
                                </button>
                                <button
                                    onClick={() => setDiscardScript(script)}
                                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                                    title="Discard unfinished project"
                                >
                                    <Trash2 size={13} />
                                    Discard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
    );

    const renderScriptSection = (
        title: string,
        subtitle: string,
        items: Script[],
        variant: 'active' | 'archive' = 'active'
    ) => {
        if (items.length === 0) return null;

        return (
            <section className="space-y-3">
                <div className="flex items-end justify-between gap-3 px-1">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">{title}</h3>
                        <p className="text-[11px] text-zinc-600 mt-1">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">{items.length} {items.length === 1 ? 'script' : 'scripts'}</span>
                    </div>
                </div>
                <div className="space-y-3">
                    {items.map(script => renderScriptCard(script, variant))}
                </div>
            </section>
        );
    };

    const renderProducedArchive = () => {
        if (producedScripts.length === 0) return null;

        const toggleLabel = isProducedArchiveExpanded ? 'Collapse' : 'Show archive';

        return (
            <section className="space-y-3">
                <div className="flex items-end justify-between gap-3 px-1">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Produced Archive</h3>
                        <p className="text-[11px] text-zinc-600 mt-1">Completed projects stay here for reference and studio history.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                            {producedScripts.length} {producedScripts.length === 1 ? 'script' : 'scripts'}
                        </span>
                        {shouldCollapseProducedArchive && (
                            <button
                                onClick={() => setIsProducedArchiveExpanded(prev => !prev)}
                                className="text-[10px] font-black uppercase tracking-wider text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-3 py-1 transition-colors"
                            >
                                {toggleLabel}
                            </button>
                        )}
                    </div>
                </div>

                {shouldCollapseProducedArchive && !isProducedArchiveExpanded ? (
                    <button
                        onClick={() => setIsProducedArchiveExpanded(true)}
                        className="w-full border border-zinc-800/70 bg-zinc-950/70 hover:bg-zinc-900 rounded-xl p-4 text-left transition-colors"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-black text-zinc-300">Archive collapsed</p>
                                <p className="text-xs text-zinc-500 mt-1">Produced scripts are hidden so unfinished work stays easy to reach.</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Show</span>
                        </div>
                    </button>
                ) : (
                    <div className="space-y-3">
                        {visibleProducedScripts.map(script => renderScriptCard(script, 'archive'))}
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                {[
                    { id: 'SCRIPTS', labelKey: 'developmentLab.vault.scripts', icon: <BookOpen size={14} /> },
                        { id: 'RIGHTS', labelKey: 'developmentLab.vault.ip', icon: <Archive size={14} /> },
                ].map(lane => (
                    <button
                        key={lane.id}
                        onClick={() => setVaultLane(lane.id as 'SCRIPTS' | 'RIGHTS')}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                            vaultLane === lane.id
                                ? 'bg-zinc-800 text-white'
                                : 'text-zinc-600 hover:text-zinc-300'
                        }`}
                    >
                        {lane.icon}
                        {tr(lane.labelKey)}
                    </button>
                ))}
            </div>

            {vaultLane === 'RIGHTS' ? ownedRights.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 px-6 text-center">
                    <Archive size={42} className="mb-4 text-amber-400/35" />
                    <p className="text-sm font-black uppercase tracking-wider text-zinc-300">{tr('developmentLab.vault.noOwnedIp')}</p>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
                        {tr('developmentLab.vault.noOwnedIpBody')}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="border-l-2 border-amber-400 pl-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-400">{tr('developmentLab.vault.ownedIp')}</p>
                        <h3 className="mt-1 text-xl font-black uppercase text-white">{tr('developmentLab.vault.ipLibrary')}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                            {tr('developmentLab.vault.ipLibraryBody')}
                        </p>
                    </div>
                    <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-zinc-950 p-1">
                        {[
                            { id: 'ALL', labelKey: 'developmentLab.vault.filter.allIp', count: ownedRights.length },
                            { id: 'ACQUIRED', labelKey: 'developmentLab.vault.filter.acquired', count: ownedRights.filter(right => right.ownershipSource !== 'STUDIO_ORIGINAL').length },
                            { id: 'STUDIO_ORIGINAL', labelKey: 'developmentLab.vault.filter.originals', count: ownedRights.filter(right => right.ownershipSource === 'STUDIO_ORIGINAL').length },
                        ].map(filter => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setIpSourceFilter(filter.id as typeof ipSourceFilter)}
                                className={`min-h-9 rounded-lg text-[7px] font-black uppercase tracking-[0.13em] transition-colors ${ipSourceFilter === filter.id ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-300'}`}
                            >
                                {tr(filter.labelKey)} <span className="ml-1 font-mono text-[7px] text-amber-300">{filter.count}</span>
                            </button>
                        ))}
                    </div>
                    {visibleOwnedRights.map(right => {
                        const expired = right.expiresAtWeek !== undefined && player.currentWeek > right.expiresAtWeek;
                        const atLimit = right.projectsAllowed !== undefined && right.projectsUsed >= right.projectsAllowed;
                        const permanent = right.expiresAtWeek === undefined;
                        const isStudioOriginal = right.ownershipSource === 'STUDIO_ORIGINAL';
                        const lifetimeGross = ownedIpPerformanceById.get(right.id)?.lifetimeGross || 0;
                        const ipType = getOwnedIpTypePresentation(right.propertyType, language);
                        const IpTypeIcon = ipType.Icon;
                        return (
                            <article
                                key={right.id}
                                className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-[#09090c] to-black p-4 shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
                                style={{ boxShadow: `inset 3px 0 0 ${right.accent}, 0 12px 32px rgba(0,0,0,0.22)` }}
                            >
                                <div className="pointer-events-none absolute right-[-26px] top-[-34px] h-32 w-32 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: right.accent }} />
                                <button
                                    type="button"
                                    aria-label={`Open ${right.title} IP dossier`}
                                    onClick={() => setDossierRight(right)}
                                    className="absolute inset-0 z-10"
                                />
                                <div className="pointer-events-none relative z-20 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-amber-300">
                                                {isStudioOriginal ? 'Studio Original' : right.dealType.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600">{right.rarity}</span>
                                        </div>
                                        <h4 className="mt-2 text-xl font-black uppercase leading-none text-white">{right.title}</h4>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600">
                                                {right.primaryGenre.replace(/_/g, ' ')}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] ${ipType.tone}`}>
                                                <IpTypeIcon size={10} /> {ipType.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.13em] ${expired ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300'}`}>
                                        <ShieldCheck size={11} /> {expired ? 'Expired' : 'Owned'}
                                    </div>
                                </div>
                                <div className="pointer-events-none relative z-20 mt-2.5 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 bg-white/[0.025] py-2.5">
                                    <div className="min-w-0 px-2 first:pl-0">
                                        <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">{isStudioOriginal ? 'Created' : 'Acquired'}</p>
                                        <p className="mt-1 truncate font-mono text-[10px] font-black text-zinc-300">{isStudioOriginal ? 'In House' : formatCurrency(right.purchasePrice)}</p>
                                    </div>
                                    <div className="min-w-0 px-2">
                                        <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">{isStudioOriginal ? 'Releases' : right.projectsAllowed === undefined ? 'Projects Made' : 'Projects Left'}</p>
                                        <p className="mt-1 font-mono text-[10px] font-black text-zinc-300">
                                            {right.projectsAllowed === undefined ? right.projectsUsed : Math.max(0, right.projectsAllowed - right.projectsUsed)}
                                        </p>
                                    </div>
                                    <div className="min-w-0 px-2 pr-0">
                                        <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">Lifetime Gross</p>
                                        <p className={`mt-1 truncate font-mono text-[10px] font-black ${lifetimeGross > 0 ? 'text-emerald-300' : 'text-zinc-500'}`}>
                                            {lifetimeGross > 0 ? formatCurrency(lifetimeGross) : 'Unproven'}
                                        </p>
                                    </div>
                                </div>
                                {right.creativeGuarantee && (
                                    <div className="pointer-events-none relative z-20 mt-3 border-l-2 border-violet-400 bg-violet-400/[0.06] px-3 py-2">
                                        <p className="text-[7px] font-black uppercase tracking-[0.15em] text-violet-300">{right.creativeGuarantee.title}</p>
                                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{right.creativeGuarantee.description}</p>
                                    </div>
                                )}
                                <button
                                    onClick={() => isStudioOriginal ? setDossierRight(right) : setDevelopmentRight(right)}
                                    disabled={!isStudioOriginal && (expired || atLimit)}
                                    className="relative z-20 mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 px-4 text-[8px] font-black uppercase tracking-[0.16em] text-black shadow-[0_8px_22px_rgba(245,158,11,0.1)] transition-colors hover:from-amber-300 hover:to-yellow-200 disabled:cursor-not-allowed disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600"
                                >
                                    <Clapperboard size={14} />
                                    {isStudioOriginal ? 'Manage IP' : expired ? 'Rights Expired' : atLimit ? 'Project Allowance Used' : 'Develop IP'}
                                </button>
                            </article>
                        );
                    })}
                </div>
            ) : scripts.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-zinc-500">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Your script vault is empty.</p>
                    <p className="mt-1 text-xs">Develop a new concept or buy a market script to get started.</p>
                </div>
            ) : (
                <>
                    {renderScriptSection(
                        'Active Scripts',
                        'Scripts that can still be developed, polished, or prepared for greenlight.',
                        activeScripts
                    )}
                    {renderProducedArchive()}
                </>
            )}
            <AnimatePresence>
                {dossierRight ? (
                    <OwnedIpDossier
                        ownedRight={dossierRight}
                        player={player}
                        studioId={studioId}
                        scripts={scripts}
                        currentWeek={player.currentWeek}
                        onClose={() => setDossierRight(null)}
                        onDevelop={() => {
                            setDossierRight(null);
                            setDevelopmentRight(dossierRight);
                        }}
                        onOpenProject={projectId => {
                            setDossierRight(null);
                            onOpenProject?.(projectId);
                        }}
                        onOpenFranchise={() => {
                            setDossierRight(null);
                            onOpenFranchise();
                        }}
                        onOpenUniverse={() => {
                            setDossierRight(null);
                            onOpenUniverse();
                        }}
                        onRenew={() => onRenewRight(dossierRight.id)}
                    />
                ) : null}
                {developmentRight ? (
                    <OwnedRightDevelopmentBrief
                        ownedRight={developmentRight}
                        currentWeek={player.currentWeek}
                        onClose={() => setDevelopmentRight(null)}
                        onAuthorize={choice => onDevelopRight(developmentRight.id, choice)}
                        onAuthorized={(destination, createdScriptId) => {
                            setDevelopmentRight(null);
                            if (destination === 'RIGHTS_LIBRARY') return;
                            setVaultLane('SCRIPTS');
                            if (destination === 'ASSIGN_WRITER') {
                                setAssignmentMode('CHOICE');
                                setSelectedScriptForAssignment(createdScriptId);
                            }
                        }}
                    />
                ) : null}
            </AnimatePresence>
            {discardScript && (
                <DiscardScriptDialog
                    script={discardScript}
                    onClose={() => setDiscardScript(null)}
                    onConfirm={() => {
                        onDelete(discardScript.id);
                        setDiscardScript(null);
                    }}
                />
            )}
            {renameScript && (
                <WorkingTitleDialog
                    initialTitle={renameScript.title}
                    contextLabel="Script Vault"
                    helperText="Rename scripts while they are still unreleased. Once a project enters production, the title locks for continuity."
                    infoText="Linked pre-production project pages update automatically, and a small industry buzz item is created."
                    onClose={() => setRenameScript(null)}
                    onConfirm={(title) => {
                        onRename(renameScript.id, title);
                        setRenameScript(null);
                    }}
                />
            )}
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

type ScriptBuilderStep = 'IDEA' | 'IDENTITY' | 'STORY' | 'DRAFT';

const ScriptWizard: React.FC<{ onComplete: (script: Script) => void, language: ReturnType<typeof getPlayerLanguage>, initialScript?: Script, initialProjectType?: ProjectType }> = ({ onComplete, language, initialScript, initialProjectType }) => {
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const [step, setStep] = useState<ScriptBuilderStep>(initialScript ? 'STORY' : 'IDEA');
    const [storyIndex, setStoryIndex] = useState(0);
    const [title, setTitle] = useState(initialScript?.title || '');
    const [projectType, setProjectType] = useState<ProjectType>(resolveProjectType(initialScript?.projectType, (initialScript as any)?.type, (initialScript as any)?.projectDetails?.type, initialProjectType));
    const [format, setFormat] = useState<ProjectFormat>(initialScript?.format || 'LIVE_ACTION');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>(initialScript?.targetAudience || 'PG-13');
    const [episodes, setEpisodes] = useState(initialScript?.episodes || 8);
    const [primaryGenre, setPrimaryGenre] = useState<Genre | ''>(initialScript?.genres[0] || '');
    const [secondaryGenre, setSecondaryGenre] = useState<Genre | ''>(initialScript?.genres[1] || '');
    const [subjectName, setSubjectName] = useState(initialScript?.subjectName || '');
    const [subjectType, setSubjectType] = useState<ScriptSubjectType>(initialScript?.subjectType || 'PUBLIC_FIGURE');
    const [showStatInfo, setShowStatInfo] = useState(false);
    const [draftPremise, setDraftPremise] = useState(initialScript?.logline || '');
    const [premiseEdited, setPremiseEdited] = useState(Boolean(initialScript?.logline));
    
    // Initialize options from initialScript if available
    const initialOptions: Record<string, string> = {};
    if (initialScript?.options) {
        initialScript.options.forEach(opt => {
            initialOptions[opt.questionId] = opt.choiceId;
        });
    }
    const [options, setOptions] = useState<Record<string, string>>(initialOptions);
    const [seedLogline] = useState(initialScript?.logline || generateProceduralLogline());

    const genres: Genre[] = ALL_GENRES;
    const needsSubject = isSubjectDrivenGenre(primaryGenre);
    const questions = primaryGenre ? getScriptQuestions(primaryGenre as Genre, format, subjectName, subjectType) : [];
    const selectedScriptOptions = questions.map(q => ({
        questionId: q.id,
        choiceId: options[q.id] || q.options[0].id
    }));
    const previewAttributes = primaryGenre
        ? calculateConceptAttributes(primaryGenre as Genre, format, subjectType, selectedScriptOptions, Boolean(secondaryGenre))
        : { plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50 };
    const previewQuality = calculateConceptQuality(previewAttributes);
    const selectedOptionLabels = questions
        .map(q => q.options.find(opt => opt.id === (options[q.id] || q.options[0].id))?.text)
        .filter(Boolean);
    const suggestedPremise = needsSubject && subjectName.trim()
        ? `${primaryGenre === 'BIOPIC' ? 'A dramatic portrait' : 'A documentary investigation'} of ${subjectName.trim()}, built around the public story and private cost behind the headlines.`
        : seedLogline;
    const displayedPremise = premiseEdited ? draftPremise : suggestedPremise;
    const finalPremise = (displayedPremise.trim() || suggestedPremise).slice(0, CUSTOM_PREMISE_MAX_LENGTH);
    const builderSteps: { id: ScriptBuilderStep; label: string; short: string }[] = [
        { id: 'IDEA', label: tr('developmentLab.builder.step.idea.label'), short: tr('developmentLab.builder.step.idea.short') },
        { id: 'IDENTITY', label: tr('developmentLab.builder.step.identity.label'), short: tr('developmentLab.builder.step.identity.short') },
        { id: 'STORY', label: tr('developmentLab.builder.step.story.label'), short: tr('developmentLab.builder.step.story.short') },
        { id: 'DRAFT', label: tr('developmentLab.builder.step.draft.label'), short: tr('developmentLab.builder.step.draft.short') }
    ];
    const stepIndex = builderSteps.findIndex(s => s.id === step);
    const safeStoryIndex = Math.min(storyIndex, Math.max(questions.length - 1, 0));
    const currentQuestion = questions[safeStoryIndex];
    const selectedQuestionChoice = currentQuestion ? options[currentQuestion.id] : undefined;
    const canLeaveIdea = Boolean(title.trim());
    const canLeaveIdentity = Boolean(primaryGenre && (!needsSubject || subjectName.trim()));
    const canLeaveStory = !currentQuestion || Boolean(selectedQuestionChoice);
    const currentStepLabel = builderSteps[stepIndex]?.label || tr('developmentLab.builder.scriptBuilder');
    const audienceTone: Record<TargetAudience, string> = {
        G: 'bg-emerald-400 text-black border-emerald-300 shadow-[0_10px_24px_rgba(52,211,153,0.15)]',
        PG: 'bg-lime-300 text-black border-lime-200 shadow-[0_10px_24px_rgba(190,242,100,0.13)]',
        'PG-13': 'bg-amber-400 text-black border-amber-300 shadow-[0_10px_24px_rgba(251,191,36,0.15)]',
        R: 'bg-rose-500 text-white border-rose-400 shadow-[0_10px_24px_rgba(244,63,94,0.16)]',
        'NC-17': 'bg-red-700 text-white border-red-500 shadow-[0_10px_24px_rgba(185,28,28,0.18)]'
    };
    const statInfo = [
        ['Plot', 'Raised by mystery, investigation, crime, fantasy world-building, documentary access, and choices about truth or cases.'],
        ['Characters', 'Raised by biopic subjects, private stories, family/community choices, intimate tones, animation, sports, and character-led options.'],
        ['Pacing', 'Raised by anime, sports, crime, comeback stories, underdog arcs, backstage pressure, and darker fantasy lanes.'],
        ['Dialogue', 'Raised by biopics, documentaries, musicals, interviews, witnesses, comedy, voice-driven choices, and dialogue-heavy options.'],
        ['Action', 'Raised by anime, sports, action-heavy set pieces, monster/rivalry/final-battle choices, and some animated fantasy concepts.'],
        ['Originality', 'Raised by animated/anime formats, secondary genre hybrids, documentaries, fantasy, musicals, exclusive access, forbidden/messy/world-building choices.']
    ];

    const buildScript = (): Script => ({
        ...(initialScript || {}),
        id: initialScript?.id || `script_${Date.now()}`,
        title,
        projectType,
        format,
        targetAudience,
        episodes: projectType === 'SERIES' ? episodes : undefined,
        genres: secondaryGenre ? [primaryGenre as Genre, secondaryGenre as Genre] : [primaryGenre as Genre],
        status: 'CONCEPT',
        quality: initialScript?.quality || previewQuality,
        options: selectedScriptOptions,
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: initialScript ? initialScript.isOriginal : true,
        // Script DNA still drives gameplay calculations; this premise is player-facing flavor.
        logline: finalPremise,
        subjectName: needsSubject ? subjectName.trim() : undefined,
        subjectType: needsSubject ? subjectType : undefined,
        sourceMaterial: needsSubject ? 'ADAPTATION' : initialScript?.sourceMaterial,
        sourceMaterialType: primaryGenre === 'BIOPIC' ? 'LIFE_RIGHTS' : primaryGenre === 'DOCUMENTARY' ? 'DOCUMENTARY_SUBJECT' : initialScript?.sourceMaterialType,
        attributes: previewAttributes,
        baseQuality: initialScript?.baseQuality || previewQuality,
        developmentCost: initialScript?.developmentCost || 0
    });

    const goForward = () => {
        if (step === 'IDEA' && canLeaveIdea) {
            setStep('IDENTITY');
            return;
        }
        if (step === 'IDENTITY' && canLeaveIdentity) {
            setStoryIndex(0);
            setStep(questions.length ? 'STORY' : 'DRAFT');
            return;
        }
        if (step === 'STORY' && canLeaveStory) {
            if (safeStoryIndex < questions.length - 1) {
                setStoryIndex(safeStoryIndex + 1);
            } else {
                setStep('DRAFT');
            }
            return;
        }
        if (step === 'DRAFT') {
            onComplete(buildScript());
        }
    };

    const goBack = () => {
        if (step === 'IDENTITY') setStep('IDEA');
        if (step === 'STORY') {
            if (safeStoryIndex > 0) setStoryIndex(safeStoryIndex - 1);
            else setStep('IDENTITY');
        }
        if (step === 'DRAFT') setStep(questions.length ? 'STORY' : 'IDENTITY');
    };

    const continueDisabled =
        (step === 'IDEA' && !canLeaveIdea) ||
        (step === 'IDENTITY' && !canLeaveIdentity) ||
        (step === 'STORY' && !canLeaveStory);

    const continueLabel = step === 'IDEA'
        ? 'Next: Genre'
        : step === 'IDENTITY'
            ? 'Next: Story'
            : step === 'STORY'
                ? (safeStoryIndex < questions.length - 1 ? 'Next Choice' : 'Review Script')
                : 'Add To Vault';

    const ProgressRail = () => (
        <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                        <PenTool size={13} />
                        Script Concept
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mt-2">{currentStepLabel}</h2>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-right shrink-0">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Quality</div>
                    <div className="text-2xl font-black text-white leading-none mt-1">{previewQuality}</div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {builderSteps.map((item, idx) => {
                    const isActive = item.id === step;
                    const isDone = idx < stepIndex;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (idx <= stepIndex) setStep(item.id);
                            }}
                            className={`group relative rounded-2xl border px-2 py-3 text-center transition-all ${
                                isActive
                                    ? 'border-amber-400 bg-amber-400 text-black shadow-[0_10px_28px_rgba(251,191,36,0.18)]'
                                    : isDone
                                        ? 'border-teal-400/25 bg-teal-400/10 text-teal-200'
                                        : 'border-zinc-800 bg-zinc-950/80 text-zinc-600 hover:text-zinc-300'
                            }`}
                        >
                            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-[10px] font-black">
                                {idx + 1}
                            </div>
                            <div className="text-[9px] sm:text-[10px] font-black uppercase leading-tight">{item.short}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const WizardFooter = () => (
        <div className="mt-7 pt-5 border-t border-zinc-800/80 grid grid-cols-[minmax(96px,0.34fr)_1fr] gap-3 sm:grid-cols-[140px_1fr]">
            <button
                onClick={goBack}
                disabled={step === 'IDEA'}
                className="min-h-[58px] px-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-300 disabled:text-zinc-700 disabled:opacity-50 font-black uppercase text-sm transition-colors hover:border-zinc-600"
            >
                Back
            </button>
            <button
                onClick={goForward}
                disabled={continueDisabled}
                className="min-h-[58px] rounded-2xl bg-amber-400 px-4 text-black disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed font-black uppercase text-sm tracking-wide shadow-[0_12px_34px_rgba(251,191,36,0.18)] transition-transform active:scale-[0.98]"
            >
                {continueLabel}
            </button>
        </div>
    );

    const SurfaceHeader: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
        <div className="mb-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-[0_10px_24px_rgba(251,191,36,0.16)]">
                {icon}
            </div>
            <div>
                <h3 className="text-2xl font-black leading-tight tracking-tight">{title}</h3>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{description}</p>
            </div>
        </div>
    );

    const OptionTile: React.FC<{
        active: boolean;
        onClick: () => void;
        children: React.ReactNode;
        className?: string;
    }> = ({ active, onClick, children, className = '' }) => (
        <button
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                active
                    ? 'bg-white text-black border-white shadow-[0_16px_35px_rgba(255,255,255,0.08)]'
                    : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-amber-400/50 hover:bg-zinc-900'
            } ${className}`}
        >
            {active && <div className="absolute inset-y-0 left-0 w-1 bg-amber-400" />}
            {children}
        </button>
    );

    return (
        <div className="min-h-full pb-20">
            <div className="max-w-3xl mx-auto">
                <div className="rounded-[2rem] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(5,5,6,0.98))] p-4 sm:p-6 shadow-2xl">
                    <ProgressRail />
                    <div className="mb-6 rounded-2xl border border-zinc-800 bg-black/45 p-3">
                        <div className="min-w-0">
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Concept</div>
                            <div className="mt-1 text-base font-black leading-snug text-zinc-100 break-words">{title.trim() || 'Untitled'}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{projectType}</span>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{formatProjectFormatLabel(format)}</span>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{primaryGenre ? formatGenreLabel(primaryGenre as Genre) : 'Genre Not Set'}</span>
                            {secondaryGenre && (
                                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{formatGenreLabel(secondaryGenre as Genre)}</span>
                            )}
                        </div>
                    </div>
                {step === 'IDEA' && (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_32%),#070708] p-5 sm:p-7">
                        <SurfaceHeader
                            title="Start the concept"
                            description="Name the project and lock the basic production shape before choosing the creative lane."
                            icon={<PenTool size={20} />}
                        />
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. The Last Stand"
                            className="w-full bg-black/70 border border-zinc-800 rounded-[1.4rem] px-5 py-5 text-2xl font-black text-white placeholder:text-zinc-700 focus:outline-none focus:border-white transition-colors"
                        />
                        <div className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Format</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {PROJECT_FORMATS.map(t => (
                                        <OptionTile key={t} onClick={() => setFormat(t)} active={format === t} className="min-h-[74px]">
                                            <div className="text-xs font-black uppercase">{formatProjectFormatLabel(t)}</div>
                                        </OptionTile>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {['MOVIE', 'SERIES'].map(t => (
                                    <OptionTile key={t} onClick={() => setProjectType(t as ProjectType)} active={projectType === t}>
                                        <div className="text-sm font-black uppercase">{t}</div>
                                    </OptionTile>
                                ))}
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Audience</div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {['G', 'PG', 'PG-13', 'R', 'NC-17'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTargetAudience(t as TargetAudience)}
                                            className={`shrink-0 min-w-[64px] px-4 py-3 rounded-2xl border text-xs font-black transition-colors ${
                                                targetAudience === t ? audienceTone[t as TargetAudience] : 'bg-black border-zinc-800 text-zinc-400'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {projectType === 'SERIES' && (
                                <div className="rounded-[1.4rem] bg-black/60 border border-zinc-800 p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-[10px] font-black uppercase text-zinc-500">Episodes</div>
                                        <span className="text-teal-300 font-mono font-black text-sm">{episodes}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="4"
                                        max="24"
                                        step="1"
                                        value={episodes}
                                        onChange={e => setEpisodes(parseInt(e.target.value))}
                                        className="w-full accent-teal-300 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'IDENTITY' && (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.10),transparent_32%),#070708] p-5 sm:p-7">
                        <SurfaceHeader
                            title="Choose the lane"
                            description="Pick the primary movie type first. Add a secondary genre only when the idea is clearly a hybrid."
                            icon={<Sparkles size={20} />}
                        />
                        <div className="space-y-5">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Primary Genre</div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {genres.map(g => (
                                        <OptionTile
                                            key={g}
                                            onClick={() => {
                                                setPrimaryGenre(g);
                                                if (g === 'ANIMATION') setFormat('ANIMATED');
                                                if (!isSubjectDrivenGenre(g)) setSubjectName('');
                                            }}
                                            active={primaryGenre === g}
                                            className="min-h-[54px] p-3"
                                        >
                                            <div className="text-[10px] sm:text-xs font-black uppercase leading-tight break-words">{formatGenreLabel(g)}</div>
                                        </OptionTile>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Secondary Genre</div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {genres.filter(g => g !== primaryGenre).map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setSecondaryGenre(secondaryGenre === g ? '' : g)}
                                            className={`shrink-0 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-colors ${
                                                secondaryGenre === g ? 'bg-white text-black' : 'bg-black border border-zinc-800 text-zinc-500'
                                            }`}
                                        >
                                            {formatGenreLabel(g)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {needsSubject && (
                                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="text-sm font-black text-white mb-4">{primaryGenre === 'BIOPIC' ? 'Biopic Focus' : 'Documentary Focus'}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">
                                                {primaryGenre === 'BIOPIC' ? 'Who is it about?' : 'What is it about?'}
                                            </label>
                                            <input
                                                type="text"
                                                value={subjectName}
                                                onChange={e => setSubjectName(e.target.value)}
                                                placeholder={primaryGenre === 'BIOPIC' ? 'e.g. Maya Stone, football legend' : 'e.g. The Westbridge Case'}
                                                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Subject Lane</label>
                                            <select
                                                value={subjectType}
                                                onChange={e => setSubjectType(e.target.value as ScriptSubjectType)}
                                                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-white transition-colors"
                                            >
                                                {['PUBLIC_FIGURE', 'ATHLETE', 'MUSICIAN', 'CRIMINAL_CASE', 'HISTORICAL_EVENT', 'COMPANY', 'TEAM', 'FANDOM'].map(type => (
                                                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'STORY' && (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),#070708] p-5 sm:p-7">
                        <SurfaceHeader
                            title="Shape the story"
                            description={`${safeStoryIndex + 1} of ${Math.max(questions.length, 1)} choices. Keep the old step flow, but make each choice feel decisive.`}
                            icon={<BookOpen size={20} />}
                        />
                        {currentQuestion ? (
                            <div>
                                <div className="flex gap-1 mb-5">
                                    {questions.map((q, idx) => (
                                        <div key={q.id} className={`h-1 flex-1 rounded-full ${idx <= safeStoryIndex ? 'bg-white' : 'bg-zinc-800'}`} />
                                    ))}
                                </div>
                                <h3 className="text-2xl font-black leading-tight mb-5 tracking-tight">{currentQuestion.question}</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {currentQuestion.options.map(opt => (
                                        <OptionTile
                                            key={opt.id}
                                            active={options[currentQuestion.id] === opt.id}
                                            onClick={() => setOptions({ ...options, [currentQuestion.id]: opt.id })}
                                            className="min-h-[116px]"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="text-lg font-black leading-tight">{opt.text}</div>
                                                    <div className="text-xs opacity-70 mt-3 italic leading-relaxed">"{opt.reviewSnippet}"</div>
                                                </div>
                                                {options[currentQuestion.id] === opt.id && (
                                                    <Star size={16} className="shrink-0 fill-current" />
                                                )}
                                            </div>
                                        </OptionTile>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] bg-black border border-zinc-800 p-5 text-zinc-400 text-sm">
                                This concept has no extra story questions yet. You can review the draft now.
                            </div>
                        )}
                    </div>
                )}

                {step === 'DRAFT' && (
                    <div className="rounded-[1.5rem] overflow-hidden border border-zinc-800 bg-[#070708]">
                        <div className="p-6 sm:p-8 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_35%),linear-gradient(145deg,#111113,#050505)] border-b border-zinc-800">
                            <div className="text-[10px] font-black uppercase text-teal-300 mb-4">Final Draft Review</div>
                            <h2 className="text-3xl sm:text-4xl font-black leading-tight break-words">{title}</h2>
                            <div className="flex flex-wrap gap-2 mt-5">
                                {[projectType, formatProjectFormatLabel(format), primaryGenre ? formatGenreLabel(primaryGenre as Genre) : null, secondaryGenre ? formatGenreLabel(secondaryGenre as Genre) : null].filter(Boolean).map(chip => (
                                    <span key={chip} className="text-[10px] font-black uppercase bg-white/10 text-white border border-white/10 rounded-full px-3 py-1">
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 sm:p-6 space-y-5">
                            <div className="rounded-[1.4rem] border border-zinc-800 bg-black/55 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Player Premise</div>
                                        <div className="mt-1 text-[11px] font-bold text-zinc-500">The one-line pitch the town repeats.</div>
                                    </div>
                                    <div className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black ${
                                        finalPremise.length >= CUSTOM_PREMISE_MAX_LENGTH
                                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                                            : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                                    }`}>
                                        {finalPremise.length}/{CUSTOM_PREMISE_MAX_LENGTH}
                                    </div>
                                </div>
                                <textarea
                                    value={displayedPremise}
                                    onChange={e => {
                                        setPremiseEdited(true);
                                        setDraftPremise(sanitizeCustomPremise(e.target.value));
                                    }}
                                    rows={3}
                                    placeholder="A sharp one-line pitch for this project..."
                                    className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-100 placeholder:text-zinc-700 focus:border-amber-300 focus:outline-none"
                                />
                                {premiseEdited && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPremiseEdited(false);
                                            setDraftPremise('');
                                        }}
                                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-amber-300"
                                    >
                                        Use DNA Suggestion
                                    </button>
                                )}
                            </div>
                            {needsSubject && subjectName && (
                                <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="text-[10px] font-black uppercase text-amber-300 mb-1">Subject</div>
                                    <div className="text-sm font-black text-white">{subjectName}</div>
                                    <div className="text-xs text-zinc-500 mt-1">{getSubjectTypeLabel(subjectType)}</div>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Script DNA</div>
                                <button
                                    onClick={() => setShowStatInfo(!showStatInfo)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                                        showStatInfo ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-800 bg-black text-zinc-400'
                                    }`}
                                    aria-label="Explain script DNA stats"
                                >
                                    <Info size={15} />
                                </button>
                            </div>
                            {showStatInfo && (
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="text-sm font-black text-white">How these stats are calculated</div>
                                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                        Every concept starts at 50. Format, genre, subject type, secondary genre, and your story choices add small boosts. Final quality weighs Plot, Characters, and Originality slightly more than Action.
                                    </p>
                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {statInfo.map(([label, description]) => (
                                            <div key={label}>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">{label}</div>
                                                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    ['Plot', previewAttributes.plot],
                                    ['Characters', previewAttributes.characters],
                                    ['Pacing', previewAttributes.pacing],
                                    ['Dialogue', previewAttributes.dialogue],
                                    ['Action', previewAttributes.action],
                                    ['Originality', previewAttributes.originality],
                                ].map(([label, value]) => (
                                    <div key={label as string} className="bg-black rounded-2xl p-3 border border-zinc-800">
                                        <div className="text-[8px] text-zinc-500 font-black uppercase">{label}</div>
                                        <div className="text-base text-white font-mono font-black">{value}</div>
                                    </div>
                                ))}
                            </div>
                            {selectedOptionLabels.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black uppercase text-zinc-500 mb-2">Chosen Angles</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOptionLabels.map(label => (
                                            <span key={label} className="text-[10px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">{label}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between rounded-[1.4rem] bg-teal-300 text-black p-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase opacity-70">Draft Quality</div>
                                    <div className="text-xs font-bold opacity-70 mt-1">Ready for the vault</div>
                                </div>
                                <div className="text-4xl font-black">{previewQuality}</div>
                            </div>
                        </div>
                    </div>
                )}
                    <WizardFooter />
                </div>
            </div>
        </div>
    );
};

const IPMarket: React.FC<{
    market: Script[],
    player: Player,
    studio: Business,
    onUpdatePlayer: (player: Player) => void,
    playerMoney: number,
    onBuy: (s: Script, cost: number) => void,
    onRefresh: () => void,
    weeksUntilRefresh: number,
    currentWeek: number,
    marketTrends: ReturnType<typeof createMarketTrends>,
    language: ReturnType<typeof getPlayerLanguage>,
    initialRightsMarketOpportunityId?: string,
    onRightsMarketTargetConsumed?: () => void,
}> = ({ market, player, studio, onUpdatePlayer, playerMoney, onBuy, onRefresh, weeksUntilRefresh, currentWeek, marketTrends, language, initialRightsMarketOpportunityId, onRightsMarketTargetConsumed }) => {
    const [marketLane, setMarketLane] = useState<StudioMarketLane>('SCRIPTS');
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    useEffect(() => {
        if (initialRightsMarketOpportunityId) setMarketLane('PROPERTIES');
    }, [initialRightsMarketOpportunityId]);

    return (
        <div className="space-y-5 pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-400">Studio Exchange</div>
                    <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">Market</h2>
                    <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
                        Acquire scripts and adaptable source material, or track valuable entertainment IP.
                    </p>
                </div>
                <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left sm:w-auto sm:shrink-0 sm:text-right">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-600">Funds</span>
                    <span className="font-mono text-sm font-black text-emerald-300">{formatCurrency(playerMoney)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                {[
                    { id: 'SCRIPTS', labelKey: 'developmentLab.vault.scripts', icon: <PenTool size={13} /> },
                    { id: 'PROPERTIES', labelKey: 'developmentLab.market.ipRights', icon: <Globe size={13} /> },
                ].map(lane => (
                    <button
                        key={lane.id}
                        onClick={() => setMarketLane(lane.id as StudioMarketLane)}
                        className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-black uppercase tracking-[0.12em] transition-all ${
                            marketLane === lane.id
                                ? 'bg-amber-500 text-black shadow-[0_0_18px_rgba(245,158,11,0.18)]'
                                : 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300'
                        }`}
                    >
                        {lane.icon}
                        {tr(lane.labelKey)}
                    </button>
                ))}
            </div>

            {marketLane === 'PROPERTIES' ? (
                <RightsMarket player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} embedded initialOpportunityId={initialRightsMarketOpportunityId} onInitialOpportunityConsumed={onRightsMarketTargetConsumed} />
            ) : (
                <SourceMaterialMarket
                    market={getStudioMarketScripts(market || [])}
                    playerMoney={playerMoney}
                    onBuy={onBuy}
                    onRefresh={onRefresh}
                    weeksUntilRefresh={weeksUntilRefresh}
                    currentWeek={currentWeek}
                    marketTrends={marketTrends}
                    language={language}
                />
            )}
        </div>
    );
};

const SourceMaterialMarket: React.FC<{
    market: Script[],
    playerMoney: number,
    onBuy: (s: Script, cost: number) => void,
    onRefresh: () => void,
    weeksUntilRefresh: number,
    currentWeek: number,
    marketTrends: ReturnType<typeof createMarketTrends>,
    language: ReturnType<typeof getPlayerLanguage>
}> = ({ market, playerMoney, onBuy, onRefresh, weeksUntilRefresh, currentWeek, marketTrends, language }) => {
    const [filter, setFilter] = useState<'ALL' | 'TRENDING' | 'MOVIE' | 'SERIES'>('ALL');
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    const filteredMarket = (market || []).filter(s => {
        if (filter === 'ALL') return true;
        if (filter === 'TRENDING') return getScriptMarketDemand(s, currentWeek, marketTrends) >= 1.08;
        return resolveProjectType(s.projectType, (s as any).type, (s as any).projectDetails?.type) === filter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div className="flex-1">
                    <h3 className="text-xl font-black tracking-tight uppercase leading-none">
                        {tr('developmentLab.market.sourceTitle')}
                    </h3>
                    <div className="mt-4 space-y-2 max-w-2xl">
	                        <p className="text-sm text-zinc-400 leading-relaxed">
                                {tr('developmentLab.market.sourceSubtitle')}
	                        </p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500/80 bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10 w-fit">
                                <Clock size={12} />
                                {tr(weeksUntilRefresh === 1 ? 'developmentLab.market.refreshesInWeek' : 'developmentLab.market.refreshesInWeeks', { weeks: weeksUntilRefresh })}
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
                                {tr('developmentLab.market.refreshNow', { amount: formatCurrency(250000) })}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* E-commerce Filters */}
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar border-b border-zinc-800/20">
	                {[
	                    { id: 'ALL', labelKey: 'developmentLab.market.filter.all' },
	                    { id: 'TRENDING', labelKey: 'developmentLab.market.filter.trending' },
	                    { id: 'MOVIE', labelKey: 'developmentLab.market.filter.movie' },
	                    { id: 'SERIES', labelKey: 'developmentLab.market.filter.series' }
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
                        {tr(f.labelKey)}
                        {filter === f.id && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white" />
                        )}
                    </button>
                ))}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
	                {filteredMarket.map((script, idx) => {
	                    const demand = getScriptMarketDemand(script, currentWeek, marketTrends);
	                    const trend = getGenreMarketTrend(script.genres[0] || 'DRAMA', currentWeek, marketTrends, language);
	                    const cost = script.purchaseCost || Math.floor((script.baseQuality || 50) * 15000 * demand);
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
                                            {getSourceMaterialLabel(script.sourceMaterialType)}
                                        </span>
                                        {isBook && (
                                            <div className="flex items-center gap-1 bg-amber-500/90 text-black text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                                <BookOpen size={8} />
                                                {tr('developmentLab.market.novel')}
                                            </div>
                                        )}
                                    </div>
	                                    {script.hype && script.hype > 70 && (
	                                        <div className="bg-white text-black text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-xl animate-pulse">
	                                            {trend.label}
	                                        </div>
	                                    )}
                                </div>
                                
                                <div className="relative z-10">
                                    <h3 className="font-black text-2xl leading-[0.9] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase italic">
                                        {script.title}
                                    </h3>
                                    {script.author && (
                                        <p className="text-[10px] font-bold text-white/70 mt-2 uppercase tracking-widest italic">
                                            {tr('developmentLab.market.byAuthor', { author: script.author })}
                                        </p>
                                    )}
                                    <div className="flex gap-1 mt-4 flex-wrap">
                                        {script.genres.map(g => (
                                            <span key={g} className="text-[7px] bg-white/10 backdrop-blur-sm text-white px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10 font-bold">{formatGenreLabel(g)}</span>
                                        ))}
                                        {script.format && (
                                            <span className="text-[7px] bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded-full uppercase tracking-widest border border-sky-500/30 font-bold">{formatProjectFormatLabel(script.format)}</span>
                                        )}
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
	                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">{tr('developmentLab.market.demandLabel', { label: trend.label })}</span>
	                                        <div className="flex items-center gap-1">
	                                            <Star size={10} className="text-amber-500 fill-amber-500" />
	                                            <span className="text-xs font-mono font-black text-white">{Math.round(demand * 100)}%</span>
	                                        </div>
	                                    </div>
	                                    <p className="text-[10px] text-zinc-500 leading-relaxed">{trend.reason}</p>
                                    {script.logline && (
                                        <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed font-medium">
                                            {script.logline}
                                        </p>
                                    )}
                                            {script.subjectName && (
                                        <p className="text-[10px] text-amber-300 font-black uppercase tracking-widest">
                                            {tr('developmentLab.market.subject', { subject: script.subjectName })}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">{tr('developmentLab.market.rightsCost')}</span>
                                            <span className={`text-xl font-mono font-black tracking-tighter ${canAfford ? 'text-white' : 'text-rose-500'}`}>
                                                {formatCurrency(cost)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">{tr('developmentLab.market.potential')}</span>
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
                                        {canAfford ? tr('developmentLab.market.acquireRights') : tr('developmentLab.market.insufficientFunds')}
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
                    <p className="font-bold uppercase tracking-widest text-xs">{tr('developmentLab.market.noItems')}</p>
                    <button 
                        onClick={onRefresh}
                        disabled={playerMoney < 250000}
                        className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 px-6 py-3 rounded-xl border border-amber-500/20 transition-all active:scale-95"
                    >
                        <RefreshCw size={14} />
                        {tr('developmentLab.market.forceRefresh', { amount: formatCurrency(250000) })}
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
    const [franchiseCommissionDraft, setFranchiseCommissionDraft] = useState<{
        mode: FranchiseCommissionMode;
        suggestedTitle: string;
    } | null>(null);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const franchiseMove = (key: string) => tr(`developmentLab.franchise.move.${key}`);
    const franchiseModeLabel = (mode: FranchiseCommissionMode) => tr(`developmentLab.franchise.mode.${mode}`);
    const projectTypeLabel = (type: string) => tr(`developmentLab.franchise.projectType.${type.toLowerCase()}`);

    const getFranchiseLifecycle = (franchiseId: string, projects: any[]) => {
        const pendingScripts = (studio.studioState?.scripts || []).filter(script => script.franchiseId === franchiseId && script.status !== 'PRODUCED');
        const hasPendingFinale = pendingScripts.some(script => script.tags?.includes('FINALE') || /final chapter|finale|closing chapter/i.test(`${script.title} ${script.logline || ''}`));
        const hasProducedFinale = projects.some(project => /final chapter|finale|last chapter|the end/i.test(project.name || ''));
        const hasPendingReboot = pendingScripts.some(script => script.tags?.includes('REBOOT') || /new blood|reboot|fresh entry|new era/i.test(`${script.title} ${script.logline || ''}`));
        const rebootProjects = projects.filter(project => /new blood|reboot|new era|legacy reborn/i.test(project.name || ''));
        const latestYear = Math.max(...projects.map(project => Number(project.year) || player.age));
        const yearsSinceLatest = Math.max(0, player.age - latestYear);

        if (hasPendingReboot) {
            return {
                state: 'REBOOT_PENDING' as const,
                label: tr('developmentLab.franchise.lifecycle.rebootPending.label'),
                description: tr('developmentLab.franchise.lifecycle.rebootPending.description'),
                lockMainline: true,
                lockFinale: true,
                lockSpinoff: false,
                recommendedMove: franchiseMove('finishReboot'),
                recommendedMoveKey: 'finishReboot'
            };
        }

        if (rebootProjects.length > 0) {
            return {
                state: 'REBOOTED' as const,
                label: tr('developmentLab.franchise.lifecycle.rebooted.label'),
                description: tr('developmentLab.franchise.lifecycle.rebooted.description'),
                lockMainline: false,
                lockFinale: projects.length < 2,
                lockSpinoff: false,
                recommendedMove: franchiseMove('buildNewEra'),
                recommendedMoveKey: 'buildNewEra'
            };
        }

        if (hasPendingFinale) {
            return {
                state: 'FINALE_PENDING' as const,
                label: tr('developmentLab.franchise.lifecycle.finalePending.label'),
                description: tr('developmentLab.franchise.lifecycle.finalePending.description'),
                lockMainline: true,
                lockFinale: true,
                lockSpinoff: false,
                recommendedMove: franchiseMove('finishFinale'),
                recommendedMoveKey: 'finishFinale'
            };
        }

        if (hasProducedFinale) {
            return {
                state: 'CONCLUDED' as const,
                label: tr('developmentLab.franchise.lifecycle.concluded.label'),
                description: tr('developmentLab.franchise.lifecycle.concluded.description'),
                lockMainline: true,
                lockFinale: true,
                lockSpinoff: false,
                recommendedMove: yearsSinceLatest >= 2 ? franchiseMove('softReboot') : franchiseMove('letItRest'),
                recommendedMoveKey: yearsSinceLatest >= 2 ? 'softReboot' : 'letItRest'
            };
        }

        return {
            state: yearsSinceLatest >= 4 ? 'RESTING' as const : 'ACTIVE' as const,
            label: yearsSinceLatest >= 4 ? tr('developmentLab.franchise.lifecycle.resting.label') : tr('developmentLab.franchise.lifecycle.active.label'),
            description: yearsSinceLatest >= 4
                ? tr('developmentLab.franchise.lifecycle.resting.description')
                : tr('developmentLab.franchise.lifecycle.active.description'),
            lockMainline: false,
            lockFinale: false,
            lockSpinoff: false,
            recommendedMove: '',
            recommendedMoveKey: ''
        };
    };

    const getFranchisePulse = (projects: any[], totalGross: number, avgRating: number, franchiseId?: string) => {
        const installmentCount = projects.length;
        const latestYear = Math.max(...projects.map(p => Number(p.year) || player.age));
        const yearsSinceLatest = Math.max(0, player.age - latestYear);
        const billionScale = clamp(totalGross / 1_000_000_000 * 30, 0, 35);
        const ratingScale = clamp(avgRating * 8, 0, 80);
        const hitStreak = projects.slice(-2).filter(p => (p.rating || 0) >= 7 || (p.gross || 0) >= 150_000_000).length * 5;
        const health = Math.round(clamp(ratingScale + billionScale + hitStreak - Math.max(0, installmentCount - 4) * 5));
        const fatigue = Math.round(clamp((installmentCount - 1) * 14 + (yearsSinceLatest <= 1 ? 18 : 0) - Math.max(0, (avgRating - 7) * 8)));
        const demand = Math.round(clamp((totalGross / 250_000_000) * 16 + avgRating * 6 + Math.max(0, 18 - yearsSinceLatest * 4) - fatigue * 0.25));

        let verdict = tr('developmentLab.franchise.pulse.default.verdict');
        let bestMove = franchiseMove('pauseFranchise');
        let demandLabel = tr('developmentLab.franchise.pulse.demand.cult');
        let riskLabel = tr('developmentLab.franchise.pulse.risk.medium');
        let tone = 'text-amber-300';

        if (demand >= 75 && fatigue < 55) {
            verdict = tr('developmentLab.franchise.pulse.hot.verdict');
            bestMove = franchiseMove('commissionSequel');
            demandLabel = tr('developmentLab.franchise.pulse.demand.hot');
            riskLabel = tr('developmentLab.franchise.pulse.risk.low');
            tone = 'text-emerald-300';
        } else if (fatigue >= 70) {
            verdict = tr('developmentLab.franchise.pulse.tired.verdict');
            bestMove = franchiseMove('pauseOrSpinoff');
            demandLabel = tr('developmentLab.franchise.pulse.demand.tired');
            riskLabel = tr('developmentLab.franchise.pulse.risk.high');
            tone = 'text-rose-300';
        } else if (health >= 78 && installmentCount >= 3) {
            verdict = tr('developmentLab.franchise.pulse.premium.verdict');
            bestMove = franchiseMove('eventFinale');
            demandLabel = tr('developmentLab.franchise.pulse.demand.premium');
            riskLabel = tr('developmentLab.franchise.pulse.risk.medium');
            tone = 'text-sky-300';
        } else if (demand >= 55) {
            verdict = tr('developmentLab.franchise.pulse.expansion.verdict');
            bestMove = franchiseMove('developSpinoff');
            demandLabel = tr('developmentLab.franchise.pulse.demand.rising');
            riskLabel = tr('developmentLab.franchise.pulse.risk.medium');
            tone = 'text-violet-300';
        } else if (health < 48 && installmentCount >= 2) {
            verdict = tr('developmentLab.franchise.pulse.reset.verdict');
            bestMove = franchiseMove('softReboot');
            demandLabel = tr('developmentLab.franchise.pulse.demand.cold');
            riskLabel = tr('developmentLab.franchise.pulse.risk.high');
            tone = 'text-orange-300';
        }

        if (franchiseId) {
            const lifecycle = getFranchiseLifecycle(franchiseId, projects);
            if (lifecycle.state === 'CONCLUDED') {
                verdict = tr('developmentLab.franchise.pulse.concluded.verdict');
                bestMove = lifecycle.recommendedMove;
                demandLabel = tr('developmentLab.franchise.pulse.demand.closed');
                riskLabel = lifecycle.recommendedMoveKey === 'softReboot' ? tr('developmentLab.franchise.pulse.risk.rebootWindow') : franchiseMove('letItRest');
                tone = 'text-blue-300';
            } else if (lifecycle.state === 'FINALE_PENDING') {
                verdict = tr('developmentLab.franchise.pulse.finalePending.verdict');
                bestMove = franchiseMove('finishFinale');
                demandLabel = tr('developmentLab.franchise.pulse.demand.pending');
                riskLabel = tr('developmentLab.franchise.pulse.risk.doNotStack');
                tone = 'text-blue-300';
            } else if (lifecycle.state === 'REBOOT_PENDING') {
                verdict = tr('developmentLab.franchise.pulse.rebootPending.verdict');
                bestMove = franchiseMove('finishReboot');
                demandLabel = tr('developmentLab.franchise.pulse.demand.resetting');
                riskLabel = tr('developmentLab.franchise.pulse.risk.transition');
                tone = 'text-rose-300';
            } else if (lifecycle.state === 'REBOOTED') {
                verdict = tr('developmentLab.franchise.pulse.rebooted.verdict');
                bestMove = demand >= 60 ? franchiseMove('commissionSequel') : franchiseMove('buildNewEra');
                demandLabel = tr('developmentLab.franchise.pulse.demand.rebooted');
                riskLabel = tr('developmentLab.franchise.pulse.risk.trustRebuild');
                tone = 'text-violet-300';
            }
        }

        return { health, fatigue, demand, verdict, bestMove, demandLabel, riskLabel, tone, yearsSinceLatest };
    };

    const getFranchiseCharacters = (projects: any[]) => {
        const characterMap = new Map<string, { name: string; actorName: string; appearances: number; latestProject: string; isRecast: boolean; actors: Set<string>; roleType: string; cameoCount: number }>();
        projects.forEach(project => {
            (project.castList || []).forEach((member: any, index: number) => {
                if (!member || String(member.roleType || 'SUPPORTING') === 'EXTRA') return;
                const characterName = member.characterName || member.roleName || (index === 0 ? project.name : `${project.name} Role ${index + 1}`);
                const key = member.characterId || characterName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                const actorName = member.actorName || member.name || 'Unknown Actor';
                const roleType = String(member.roleType || (index === 0 ? 'LEAD' : 'SUPPORTING'));
                const existing = characterMap.get(key);
                if (existing) {
                    existing.appearances += 1;
                    existing.latestProject = project.name;
                    existing.isRecast = existing.isRecast || (!!actorName && !existing.actors.has(actorName));
                    existing.actors.add(actorName);
                    existing.actorName = actorName;
                    existing.cameoCount += roleType === 'CAMEO' ? 1 : 0;
                    if (existing.roleType !== 'LEAD' && roleType === 'LEAD') existing.roleType = 'LEAD';
                } else {
                    characterMap.set(key, {
                        name: characterName,
                        actorName,
                        appearances: 1,
                        latestProject: project.name,
                        isRecast: false,
                        actors: new Set([actorName]),
                        roleType,
                        cameoCount: roleType === 'CAMEO' ? 1 : 0
                    });
                }
            });
        });
        const allCharacters = Array.from(characterMap.values());
        const summary = allCharacters.reduce((acc, character) => {
            if (character.roleType === 'LEAD') acc.leads += 1;
            else if (character.roleType === 'CAMEO') acc.cameos += 1;
            else if (character.roleType === 'MINOR') acc.minor += 1;
            else acc.supporting += 1;
            if (character.appearances > 1) acc.recurring += 1;
            if (character.isRecast) acc.recast += 1;
            return acc;
        }, { total: allCharacters.length, leads: 0, supporting: 0, cameos: 0, minor: 0, recurring: 0, recast: 0 });

        return {
            summary,
            featured: allCharacters
            .sort((a, b) => b.appearances - a.appearances)
                .slice(0, 4)
        };
    };

    // Identify studio projects
    const inheritedStudioProjects = getInheritedStudioProjects(player, studio.id).map((p: any) => ({
        id: p.id,
        name: p.name || p.title,
        franchiseId: p.franchiseId,
        universeId: p.universeId,
        year: p.year || p.releaseYear,
        gross: p.gross || p.totalGross || 0,
        rating: p.rating || p.imdbRating || 0,
        type: resolveProjectType(p.projectType, p.type, p.projectDetails?.type),
        subtype: p.subtype,
        genre: p.genre,
        installmentNumber: p.installmentNumber || 1,
        castList: p.castList || [],
        releaseWeek: p.releaseWeek,
        releaseYear: p.releaseYear,
        releasedAtAbsoluteWeek: p.releasedAtAbsoluteWeek,
        phase: 'RELEASED'
    }));
    const studioProjects = [
        ...player.pastProjects.filter(p => p.studioId === studio.id).map(p => ({ 
            id: p.id, 
            name: p.name, 
            franchiseId: p.franchiseId, 
            universeId: p.universeId, 
            year: p.year, 
            gross: p.gross || 0, 
            rating: p.imdbRating || 0,
            type: resolveProjectType(p.projectType, (p as any).type, (p as any).projectDetails?.type),
            subtype: p.subtype,
            genre: p.genre,
            installmentNumber: p.installmentNumber || 1,
            castList: p.castList || [],
            releaseWeek: p.releaseWeek,
            releaseYear: p.releaseYear,
            releasedAtAbsoluteWeek: p.releasedAtAbsoluteWeek,
            phase: 'RELEASED'
        })),
        ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({ 
            id: r.id, 
            name: r.name, 
            franchiseId: r.projectDetails.franchiseId, 
            universeId: r.projectDetails.universeId, 
            year: r.releaseYear || player.age,
            gross: r.totalGross || 0, 
            rating: r.imdbRating || 0,
            type: resolveProjectType(r.type, r.projectDetails?.type),
            subtype: r.projectDetails.subtype,
            genre: r.projectDetails.genre,
            installmentNumber: r.projectDetails.installmentNumber || 1,
            castList: r.projectDetails.castList || [],
            releaseWeek: r.releaseWeek,
            releaseYear: r.releaseYear,
            releasedAtAbsoluteWeek: r.releasedAtAbsoluteWeek,
            weekNum: r.weekNum,
            phase: getReleaseDisplayPhase(r)
        })),
        ...inheritedStudioProjects
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
            genre: root.genre,
            pulse: getFranchisePulse(sorted, totalGross, avgRating, id)
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
            genre: franchise.genre,
            pulse: getFranchisePulse([franchise], franchise.gross, franchise.rating, franchise.id)
        } : franchise;
        const lifecycle = getFranchiseLifecycle(displayFranchise.id, displayFranchise.projects);
        const pulse = displayFranchise.pulse || getFranchisePulse(displayFranchise.projects, displayFranchise.totalGross, displayFranchise.avgRating, displayFranchise.id);
        const characterFocus = getFranchiseCharacters(displayFranchise.projects);
        const characters = characterFocus.featured;
        const continuationProject = displayFranchise.projects[displayFranchise.projects.length - 1];
        const studioScripts = studio.studioState?.scripts || [];
        const continuationEligibility = {
            SEQUEL: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'SEQUEL' }),
            SPINOFF: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'SPINOFF' }),
            FINALE: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'FINALE' }),
            REBOOT: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'REBOOT' })
        };

        const getSuggestedFranchiseTitle = (mode: FranchiseCommissionMode) => {
            const last = displayFranchise.projects[displayFranchise.projects.length - 1];
            const nextNum = (last.installmentNumber || displayFranchise.lastInstallment || 1) + 1;
            return {
                SEQUEL: `${displayFranchise.name} ${nextNum}`,
                SPINOFF: `${displayFranchise.name}: A New Story`,
                FINALE: `${displayFranchise.name}: Final Chapter`,
                REBOOT: `${displayFranchise.name}: New Blood`
            }[mode];
        };

        const requestFranchiseCommission = (mode: FranchiseCommissionMode) => {
            if ((mode === 'SEQUEL' && lifecycle.lockMainline) || (mode === 'FINALE' && lifecycle.lockFinale) || (mode === 'SPINOFF' && lifecycle.lockSpinoff)) {
                return;
            }
            if (!continuationEligibility[mode].eligible) return;
            setFranchiseCommissionDraft({ mode, suggestedTitle: getSuggestedFranchiseTitle(mode) });
        };

        const commissionScript = (mode: FranchiseCommissionMode, title: string) => {
            const result = createContinuationScript({
                player,
                studioScripts,
                project: continuationProject,
                mode,
                title,
	                overrides: {
	                    genres: [displayFranchise.genre],
	                    projectType: mode === 'SPINOFF' ? (displayFranchise.type === 'MOVIE' ? 'SERIES' : 'MOVIE') : displayFranchise.type,
	                    franchiseId: displayFranchise.id,
	                    logline: mode === 'FINALE'
	                    ? tr('developmentLab.franchise.logline.finale', { name: displayFranchise.name })
	                    : mode === 'REBOOT'
	                        ? tr('developmentLab.franchise.logline.reboot', { name: displayFranchise.name })
	                        : mode === 'SPINOFF'
	                            ? tr('developmentLab.franchise.logline.spinoff', { name: displayFranchise.name })
	                            : tr('developmentLab.franchise.logline.sequel', { name: displayFranchise.name })
	                }
	            });
            if (!result.ok || !result.script) return;
            onCommission(result.script);
        };

        const sequelLocked = lifecycle.lockMainline || !continuationEligibility.SEQUEL.eligible;
        const finaleLocked = lifecycle.lockFinale || !continuationEligibility.FINALE.eligible;
        const spinoffLocked = lifecycle.lockSpinoff || !continuationEligibility.SPINOFF.eligible;
        const rebootLocked = !continuationEligibility.REBOOT.eligible;
        const lockedButtonClass = 'opacity-45 cursor-not-allowed grayscale hover:bg-zinc-900 active:scale-100';

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,rgba(24,24,27,0.96),rgba(3,7,18,0.96))] p-5 shadow-[0_0_45px_rgba(245,158,11,0.08)]">
                    <div className="absolute right-4 top-4 text-[88px] font-black italic text-white/[0.03] leading-none">{pulse.health}</div>
                    <div className="flex items-center gap-3 mb-5 relative">
                    <button onClick={() => setSelectedFranchiseId(null)} className="p-2 bg-black/40 border border-white/10 rounded-full hover:bg-zinc-800">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="min-w-0">
	                        <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${pulse.tone}`}>{isCandidate ? tr('developmentLab.franchise.candidate') : pulse.verdict}</p>
	                        <h2 className="text-3xl font-black uppercase tracking-tight text-white truncate">{displayFranchise.name}</h2>
	                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{tr('developmentLab.franchise.meta', { count: displayFranchise.projects.length, genre: formatGenreLabel(displayFranchise.genre), lifecycle: lifecycle.label })}</p>
	                    </div>
	                    </div>

	                    <div className="grid grid-cols-3 gap-3 relative">
	                        {[
	                            { label: tr('developmentLab.franchise.metric.health'), value: pulse.health, icon: <Gauge size={15} />, color: 'bg-emerald-400' },
	                            { label: tr('developmentLab.franchise.metric.demand'), value: pulse.demand, icon: <Flame size={15} />, color: 'bg-amber-400' },
	                            { label: tr('developmentLab.franchise.metric.fatigue'), value: pulse.fatigue, icon: <AlertTriangle size={15} />, color: pulse.fatigue > 68 ? 'bg-rose-500' : 'bg-sky-400' }
	                        ].map(metric => (
                            <div key={metric.label} className="bg-black/35 border border-white/10 p-3 rounded-2xl">
                                <div className="flex items-center justify-between text-zinc-400 mb-2">
                                    {metric.icon}
                                    <span className="text-lg font-black text-white">{metric.value}</span>
                                </div>
                                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-2">{metric.label}</p>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

	                    <div className="mt-4 grid grid-cols-3 gap-3 relative">
	                        <div className="bg-black/25 border border-white/10 p-3 rounded-2xl">
	                            <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.gross')}</p>
	                            <p className="text-sm font-mono font-bold text-emerald-300">{formatCurrency(displayFranchise.totalGross)}</p>
	                        </div>
	                        <div className="bg-black/25 border border-white/10 p-3 rounded-2xl">
	                            <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.avgRating')}</p>
	                            <p className="text-sm font-mono font-bold text-amber-300">{displayFranchise.avgRating.toFixed(1)}/10</p>
	                        </div>
	                        <div className="bg-black/25 border border-white/10 p-3 rounded-2xl">
	                            <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.bestMove')}</p>
	                            <p className="text-[11px] font-black text-white uppercase leading-tight">{pulse.bestMove}</p>
	                        </div>
	                    </div>
	                    <div className="mt-4 bg-black/35 border border-white/10 rounded-2xl p-3 relative">
	                        <div className="flex items-center justify-between gap-3 mb-2">
	                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">{tr('developmentLab.franchise.lifecycle.title')}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                                lifecycle.state === 'CONCLUDED' ? 'bg-blue-500/10 text-blue-300' :
                                lifecycle.state === 'REBOOTED' || lifecycle.state === 'REBOOT_PENDING' ? 'bg-violet-500/10 text-violet-300' :
                                lifecycle.state === 'FINALE_PENDING' ? 'bg-sky-500/10 text-sky-300' :
                                lifecycle.state === 'RESTING' ? 'bg-zinc-500/10 text-zinc-300' :
                                'bg-emerald-500/10 text-emerald-300'
                            }`}>{lifecycle.label}</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{lifecycle.description}</p>
                    </div>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-3xl">
	                    <div className="flex items-center gap-2 mb-2">
	                        <Sparkles size={16} className="text-amber-400" />
	                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{tr('developmentLab.franchise.audiencePulse')}</h3>
	                    </div>
	                    <p className="text-sm text-zinc-200 font-bold leading-relaxed">
	                        {lifecycle.state === 'CONCLUDED'
	                            ? tr('developmentLab.franchise.audience.concluded', { name: displayFranchise.name })
	                            : lifecycle.state === 'FINALE_PENDING'
	                                ? tr('developmentLab.franchise.audience.finalePending')
	                                : lifecycle.state === 'REBOOT_PENDING'
	                                    ? tr('developmentLab.franchise.audience.rebootPending')
	                                    : pulse.fatigue > 70
	                            ? tr('developmentLab.franchise.audience.fatigue', { name: displayFranchise.name })
	                            : pulse.demand > 75
	                                ? tr('developmentLab.franchise.audience.hot', { name: displayFranchise.name })
	                                : pulse.health > 78
	                                    ? tr('developmentLab.franchise.audience.prestige')
	                                    : tr('developmentLab.franchise.audience.growth', { name: displayFranchise.name })}
	                    </p>
	                </div>

                {/* History */}
                <div className="space-y-3">
	                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">{tr('developmentLab.franchise.releaseHistory')}</h3>
                    <div className="space-y-2">
                        {displayFranchise.projects.map((p: any) => (
                            <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
                                        {p.type === 'SERIES' ? <Tv size={16} /> : <Film size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{p.name}</p>
	                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{p.year} • {projectTypeLabel(p.type)}</p>
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

                {characters.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3 px-1">
                            <div>
	                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('developmentLab.franchise.castPreview')}</h3>
	                                <p className="text-[10px] text-zinc-600 mt-1">
	                                    {tr('developmentLab.franchise.castSummary', { total: characterFocus.summary.total, recurring: characterFocus.summary.recurring, recast: characterFocus.summary.recast })}
	                                </p>
	                            </div>
	                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 px-2 py-1 rounded-full">
	                                {tr('developmentLab.franchise.leadCount', { count: characterFocus.summary.leads })}
	                            </span>
	                        </div>
	                        <div className="grid grid-cols-4 gap-2">
	                            {[
	                                [tr('developmentLab.franchise.role.supporting'), characterFocus.summary.supporting],
	                                [tr('developmentLab.franchise.role.cameos'), characterFocus.summary.cameos],
	                                [tr('developmentLab.franchise.role.minor'), characterFocus.summary.minor],
	                                [tr('developmentLab.franchise.role.recurring'), characterFocus.summary.recurring]
	                            ].map(([label, value]) => (
                                <div key={label} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2 text-center">
                                    <p className="text-sm font-black text-white">{value}</p>
                                    <p className="text-[7px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {characters.map(char => (
                                <div key={`${char.name}_${char.latestProject}`} className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-base font-black text-white leading-tight">{char.name}</p>
	                                            <p className="text-[10px] text-zinc-500 mt-1">{tr('developmentLab.franchise.playedBy', { actor: char.actorName })}</p>
	                                        </div>
	                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${char.isRecast ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
	                                            {char.isRecast ? tr('developmentLab.franchise.recast') : tr('developmentLab.franchise.appearancesShort', { count: char.appearances })}
	                                        </span>
	                                    </div>
	                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-3">
	                                        {tr('developmentLab.franchise.characterMeta', { role: tr(`developmentLab.franchise.roleType.${String(char.roleType).toLowerCase()}`), project: char.latestProject })}
	                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
	                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">{tr('developmentLab.franchise.action.nextMove')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => requestFranchiseCommission('SEQUEL')}
                            disabled={sequelLocked}
                            className={`bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(245,158,11,0.18)] ${sequelLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Plus size={20} />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{isCandidate ? tr('developmentLab.franchise.action.startSequel') : sequelLocked ? tr('developmentLab.franchise.action.mainlineLocked') : franchiseMove('commissionSequel')}</p>
	                                    <p className="text-[10px] opacity-70 font-bold">{sequelLocked ? (lifecycle.lockMainline ? lifecycle.label : continuationEligibility.SEQUEL.message) : tr('developmentLab.franchise.action.developNumbered', { name: displayFranchise.name, number: displayFranchise.lastInstallment + 1 })}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>

                        <button
                            onClick={() => requestFranchiseCommission('SPINOFF')}
                            disabled={spinoffLocked}
                            className={`bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-2xl flex items-center justify-between transition-all border border-zinc-700 active:scale-[0.98] ${spinoffLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles size={20} className="text-amber-500" />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{franchiseMove('developSpinoff')}</p>
	                                    <p className="text-[10px] text-zinc-400 font-bold">{spinoffLocked ? (lifecycle.lockSpinoff ? lifecycle.label : continuationEligibility.SPINOFF.message) : tr('developmentLab.franchise.action.spinoffDescription')}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={() => requestFranchiseCommission('FINALE')}
                            disabled={finaleLocked}
                            className={`bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-2xl flex items-center justify-between transition-all border border-blue-500/20 active:scale-[0.98] ${finaleLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Trophy size={20} className="text-blue-400" />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{finaleLocked ? tr('developmentLab.franchise.action.finaleLocked') : franchiseMove('eventFinale')}</p>
	                                    <p className="text-[10px] text-zinc-400 font-bold">{finaleLocked ? (lifecycle.lockFinale ? lifecycle.label : continuationEligibility.FINALE.message) : tr('developmentLab.franchise.action.finaleDescription')}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={() => requestFranchiseCommission('REBOOT')}
                            disabled={rebootLocked}
                            className={`bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-2xl flex items-center justify-between transition-all border border-rose-500/20 active:scale-[0.98] ${rebootLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <RotateCcw size={20} className="text-rose-400" />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{franchiseMove('softReboot')}</p>
	                                    <p className="text-[10px] text-zinc-400 font-bold">{rebootLocked ? continuationEligibility.REBOOT.message : tr('developmentLab.franchise.action.rebootDescription')}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                {franchiseCommissionDraft && (
                    <WorkingTitleDialog
                        mode="COMMISSION"
	                        title={tr('developmentLab.franchise.dialog.title', { mode: franchiseModeLabel(franchiseCommissionDraft.mode) })}
	                        description={tr('developmentLab.franchise.dialog.description', { name: displayFranchise.name })}
                        initialTitle={franchiseCommissionDraft.suggestedTitle}
                        onClose={() => setFranchiseCommissionDraft(null)}
                        onConfirm={(title) => {
                            commissionScript(franchiseCommissionDraft.mode, title);
                            setFranchiseCommissionDraft(null);
                        }}
                    />
                )}
            </div>
        );
    }

	    return (
	        <div className="space-y-6 pb-20">
	            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
	                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">{tr('developmentLab.franchise.title')}</h2>
	                <p className="text-xs text-zinc-400">{tr('developmentLab.franchise.subtitle')}</p>
	            </div>

            {franchises.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {franchises.map(f => (
                        <div 
                            key={f.id} 
                            onClick={() => setSelectedFranchiseId(f.id)}
                            className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(39,39,42,0.92),rgba(9,9,11,0.98))] border border-zinc-800 rounded-3xl p-5 hover:border-amber-500/50 transition-all cursor-pointer group shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                        >
                            <div className="absolute -right-8 -top-10 w-36 h-36 bg-amber-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-amber-500 transition-colors">
                                        {f.type === 'SERIES' ? <Tv size={20} /> : <Film size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/40 ${f.pulse.tone}`}>{f.pulse.demandLabel}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{f.pulse.riskLabel}</span>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-amber-500 transition-colors">{f.name}</h3>
	                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{tr('developmentLab.franchise.listMeta', { count: f.projects.length, type: projectTypeLabel(f.type) })}</p>
	                                    </div>
                                </div>
                                <div className="bg-zinc-800 p-2 rounded-lg text-zinc-400 group-hover:text-amber-500 transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800/50 relative">
                                <div>
	                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.gross')}</p>
                                    <p className="text-sm font-mono font-bold text-white">{formatCurrency(f.totalGross)}</p>
                                </div>
                                <div>
	                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.health')}</p>
                                    <p className="text-sm font-mono font-bold text-emerald-300">{f.pulse.health}</p>
                                </div>
                                <div>
	                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.bestMove')}</p>
                                    <p className="text-[10px] font-black text-amber-300 uppercase leading-tight">{f.pulse.bestMove}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

	            {candidates.length > 0 && (
	                <div className="space-y-4">
	                    <div className="px-1">
	                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('developmentLab.franchise.candidatesTitle')}</h3>
	                        <p className="text-[9px] text-zinc-600 mt-1">{tr('developmentLab.franchise.candidatesSubtitle')}</p>
	                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {candidates.map(c => {
                            const pulse = getFranchisePulse([c], c.gross, c.rating, c.id);
                            return (
                            <div 
                                key={c.id} 
                                onClick={() => setSelectedFranchiseId(c.id)}
                                className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex justify-between items-center hover:border-amber-500/30 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 group-hover:text-amber-500 transition-colors">
                                        {c.type === 'SERIES' ? <Tv size={16} /> : <Film size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{c.name}</p>
	                                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{tr('developmentLab.franchise.candidateMeta', { gross: formatCurrency(c.gross), rating: c.rating.toFixed(1), demand: pulse.demand })}</p>
                                    </div>
                                </div>
                                <Plus size={14} className="text-zinc-700 group-hover:text-amber-500 transition-colors" />
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

	            {franchises.length === 0 && candidates.length === 0 && (
	                <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center">
	                    <Layers size={48} className="text-zinc-800 mb-4" />
	                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{tr('developmentLab.franchise.empty.title')}</p>
	                    <p className="text-[9px] text-zinc-700 mt-2 max-w-[200px]">{tr('developmentLab.franchise.empty.subtitle')}</p>
	                </div>
	            )}
	        </div>
	    );
};

const UNIVERSE_PRODUCT_BLUEPRINTS = [
    { id: 'merch_apparel', type: 'MERCH', cost: 500000, baseAppeal: 20, baseRevenue: 50000 },
    { id: 'merch_toys', type: 'MERCH', cost: 1000000, baseAppeal: 35, baseRevenue: 120000 },
    { id: 'merch_collectibles', type: 'MERCH', cost: 2500000, baseAppeal: 50, baseRevenue: 350000 },
    { id: 'park_land', type: 'PARK', cost: 50000000, baseAppeal: 85, baseRevenue: 6000000 },
    { id: 'park_ride', type: 'PARK', cost: 15000000, baseAppeal: 65, baseRevenue: 1800000 },
];

const UniverseMerchView: React.FC<{
    universe: Universe;
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
}> = ({ universe, player, studio, onUpdatePlayer }) => {
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

const UniverseDashboard: React.FC<{
    universe: Universe;
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
    onCommission: (script: Script) => void;
    onBack: () => void;
}> = ({ universe, player, studio, onUpdatePlayer, onCommission, onBack }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const getSagaLabel = (saga: number) => tr('services.business.universeLifecycle.sagaLabel', { saga });
    const getPhaseLabel = (phase: number) => tr('services.business.universeLifecycle.phaseLabel', { phase });
    const getCharacterStatusLabel = (char: ReturnType<typeof buildUniverseRoster>[number]) => {
        if (char.status === 'RECAST') return tr('services.business.universeRoster.status.recast');
        if (char.status === 'RETIRED') return tr('services.business.universeRoster.status.retired');
        return char.roleType || tr('services.business.universeRoster.status.active');
    };
    const [activeTab, setActiveTab] = useState<'TIMELINE' | 'ROSTER' | 'MERCH'>('TIMELINE');
    const [editingSaga, setEditingSaga] = useState(false);
    const [editingPhase, setEditingPhase] = useState(false);
    const [sagaName, setSagaName] = useState(universe.currentSagaName || getSagaLabel(typeof universe.saga === 'number' ? universe.saga : parseInt(String(universe.saga).replace(/\D/g, '')) || 1));
    const [phaseName, setPhaseName] = useState(universe.currentPhaseName || getPhaseLabel(typeof universe.currentPhase === 'number' ? universe.currentPhase : parseInt(String(universe.currentPhase).replace(/\D/g, '')) || 1));
    const [eventFilmTitle, setEventFilmTitle] = useState<string | null>(null);
    const [showRetirementDialog, setShowRetirementDialog] = useState(false);
    const [rebootTitle, setRebootTitle] = useState<string | null>(null);
    const retired = isUniverseRetired(universe);
    const currentSagaNumber = typeof universe.saga === 'number' ? universe.saga : parseInt(String(universe.saga).replace(/\D/g, '')) || 1;

    const syncStudioUniverse = (updatedUniverse: Universe, extraStudioState: Record<string, any> = {}) => {
        const existingUniverses = studio.studioState?.universes || [];
        const hasUniverse = existingUniverses.some(u => u.id === updatedUniverse.id);
        return {
            ...studio,
            studioState: {
                ...studio.studioState,
                ...extraStudioState,
                universes: hasUniverse
                    ? existingUniverses.map(u => u.id === updatedUniverse.id ? updatedUniverse : u)
                    : [...existingUniverses, updatedUniverse]
            }
        };
    };

    const buildPlayerWithUniverse = (
        updatedUniverse: Universe,
        extraPlayerUpdates: Partial<Player> = {},
        extraStudioState: Record<string, any> = {}
    ) => {
        const normalizedUniverse = normalizeUniverseForSave(updatedUniverse, updatedUniverse.id);
        const updatedStudio = syncStudioUniverse(normalizedUniverse, extraStudioState);
        return {
            ...player,
            ...extraPlayerUpdates,
            world: {
                ...player.world,
                universes: {
                    ...normalizeUniverseMap(player.world?.universes || {}),
                    [normalizedUniverse.id]: normalizedUniverse
                }
            },
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        };
    };

    const updateUniverse = (updates: Partial<Universe>) => {
        const updatedUniverse = normalizeUniverseForSave({ ...universe, ...updates }, universe.id);
        onUpdatePlayer(buildPlayerWithUniverse(updatedUniverse));
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
        if (retired) return;
        const currentPhaseNum = typeof universe.currentPhase === 'number' ? universe.currentPhase : parseInt(String(universe.currentPhase).replace(/\D/g, '')) || 1;
        const nextPhaseNum = currentPhaseNum + 1;
        const nextPhaseLabel = getPhaseLabel(nextPhaseNum);
        
        const newsItem = {
            id: `news_phase_${Date.now()}`,
            headline: tr('services.business.universeLifecycle.news.phaseHeadline', { universeName: universe.name, phase: nextPhaseNum }),
            subtext: tr('services.business.universeLifecycle.news.phaseSubtext'),
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
                    ...normalizeUniverseMap(player.world?.universes || {}),
                    [universe.id]: {
                        ...universe,
                        currentPhase: nextPhaseLabel,
                        currentPhaseName: nextPhaseLabel
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
                        currentPhase: nextPhaseLabel,
                        currentPhaseName: nextPhaseLabel
                    } : u)
                }
            };
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        }

        onUpdatePlayer(updatedPlayer);
        setPhaseName(nextPhaseLabel);
    };

    const handleConcludeSaga = () => {
        if (retired) return;
        const currentSagaNum = typeof universe.saga === 'number' ? universe.saga : parseInt(String(universe.saga).replace(/\D/g, '')) || 1;
        const nextSagaNum = currentSagaNum + 1;
        const nextSagaLabel = getSagaLabel(nextSagaNum);
        const firstPhaseLabel = getPhaseLabel(1);
        
        const newsItem = {
            id: `news_saga_${Date.now()}`,
            headline: tr('services.business.universeLifecycle.news.sagaHeadline', { universeName: universe.name, saga: nextSagaNum }),
            subtext: tr('services.business.universeLifecycle.news.sagaSubtext'),
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
                    ...normalizeUniverseMap(player.world?.universes || {}),
                    [universe.id]: {
                        ...universe,
                        saga: nextSagaNum,
                        currentSagaName: nextSagaLabel,
                        currentPhase: firstPhaseLabel,
                        currentPhaseName: firstPhaseLabel
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
                        currentSagaName: nextSagaLabel,
                        currentPhase: firstPhaseLabel,
                        currentPhaseName: firstPhaseLabel
                    } : u)
                }
            };
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        }

        onUpdatePlayer(updatedPlayer);
        setSagaName(nextSagaLabel);
        setPhaseName(firstPhaseLabel);
    };

    const universeProjects = getUniverseDashboardProjects(player, universe.id, player.activeReleases || []);
    const normalizedRoster = buildUniverseRoster(universe, universeProjects, player.name);
    const releasedProjects = universeProjects.filter(project => !project.isActive);
    const upcomingProjects = universeProjects.filter(project => project.isActive);
    const linkedUnfinishedScripts = (studio.studioState?.scripts || []).filter(script => script.universeId === universe.id && script.status !== 'PRODUCED');
    const linkedConcepts = (studio.studioState?.concepts || []).filter(concept => (concept as any).universeId === universe.id);
    const linkedCommitments = (player.commitments || []).filter(commitment => {
        const details = commitment.projectDetails as any;
        return details?.universeId === universe.id || (commitment as any).universeId === universe.id;
    });
    const retirementBlockers = [
        releasedProjects.length === 0 ? tr('services.business.universeDashboard.blocker.releaseCanon') : '',
        upcomingProjects.length > 0 ? tr(upcomingProjects.length === 1 ? 'services.business.universeDashboard.blocker.activeCanonOne' : 'services.business.universeDashboard.blocker.activeCanonMany', { count: upcomingProjects.length }) : '',
        linkedUnfinishedScripts.length > 0 ? tr(linkedUnfinishedScripts.length === 1 ? 'services.business.universeDashboard.blocker.attachedScriptOne' : 'services.business.universeDashboard.blocker.attachedScriptMany', { count: linkedUnfinishedScripts.length }) : '',
        linkedConcepts.length > 0 ? tr(linkedConcepts.length === 1 ? 'services.business.universeDashboard.blocker.attachedConceptOne' : 'services.business.universeDashboard.blocker.attachedConceptMany', { count: linkedConcepts.length }) : '',
        linkedCommitments.length > 0 ? tr(linkedCommitments.length === 1 ? 'services.business.universeDashboard.blocker.productionCommitmentOne' : 'services.business.universeDashboard.blocker.productionCommitmentMany', { count: linkedCommitments.length }) : ''
    ].filter(Boolean);
    const canRetireUniverse = !retired && retirementBlockers.length === 0;
    const lastReleasedGenre = (releasedProjects[0]?.genre || releasedProjects[releasedProjects.length - 1]?.genre || 'ACTION') as Genre;
    const averageRating = releasedProjects.length > 0
        ? releasedProjects.reduce((sum, project) => sum + (project.rating || 0), 0) / releasedProjects.length
        : 0;
    const totalGross = releasedProjects.reduce((sum, project) => sum + (project.gross || 0), 0);
    const activeProducts = (universe.products || []).filter(product => product.active !== false);
    const releaseActivity = getUniverseReleaseActivity(player, universe, player.activeReleases || []);
    const projectedLicensing = activeProducts.reduce((sum, product) => sum + Math.floor(calculateUniverseProductWeeklyRevenue(universe, product) * releaseActivity.multiplier * getUniverseLifecycleRevenueMultiplier(universe)), 0);
    const recastCount = normalizedRoster.filter(character => character.status === 'RECAST').length;
    const recurringCount = normalizedRoster.filter(character => (character.appearances || 0) >= 2).length;
    const continuityScore = clamp(
        70
        + Math.min(20, recurringCount * 4)
        - recastCount * 8
        - Math.max(0, upcomingProjects.length - 4) * 5
    );
    const fanTrust = clamp(
        45
        + averageRating * 6
        + Math.min(15, (universe.momentum || 0) / 8)
        - Math.max(0, universeProjects.length - 8) * 3
    );
    const fatigue = clamp(
        Math.max(0, universeProjects.length - 2) * 9
        + Math.max(0, upcomingProjects.length - 2) * 12
        - Math.max(0, averageRating - 7) * 7
    );
    const eventReadiness = clamp(
        normalizedRoster.filter(character => character.status !== 'RETIRED').length * 10
        + (universe.momentum || 0) * 0.35
        + fanTrust * 0.25
        - fatigue * 0.35
    );
    const continuityRisk = clamp(
        recastCount * 16
        + Math.max(0, upcomingProjects.length - 3) * 10
        + fatigue * 0.35
        - recurringCount * 3
    );
    const continuityRiskLabel = continuityRisk >= 70 ? tr('services.business.universeDashboard.risk.high') : continuityRisk >= 38 ? tr('services.business.universeDashboard.risk.watch') : tr('services.business.universeDashboard.risk.stable');
    const continuityRiskTone = continuityRisk >= 70 ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : continuityRisk >= 38 ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
    const healthLabel = retired
        ? tr('services.business.universeDashboard.health.legacyArchive')
        : fatigue >= 75
        ? tr('services.business.universeDashboard.health.overheated')
        : eventReadiness >= 75
            ? tr('services.business.universeDashboard.health.eventReady')
            : fanTrust >= 70
                ? tr('services.business.universeDashboard.health.stableCanon')
                : tr('services.business.universeDashboard.health.needsBuildUp');
    const audiencePulse = retired
        ? tr('services.business.universeDashboard.audiencePulse.retired', { universeName: universe.name })
        : eventReadiness >= 70
        ? tr('services.business.universeDashboard.audiencePulse.eventReady', { universeName: universe.name })
        : fatigue >= 70
            ? tr('services.business.universeDashboard.audiencePulse.overheated', { universeName: universe.name })
            : tr('services.business.universeDashboard.audiencePulse.needsBuildUp', { universeName: universe.name });

    const getUniverseEventTitle = () => {
        const eventNumber = universeProjects.filter(project => project.subtype === 'UNIVERSE_EVENT' || /event|crossover|finale|war|crisis/i.test(project.title)).length + 1;
        return `${universe.name}: Event ${eventNumber}`;
    };

    const createUniverseEventScript = (title: string) => {
        if (retired) return;
        const currentSagaName = universe.currentSagaName || `Saga ${universe.saga || 1}`;
        const currentPhaseName = universe.currentPhaseName || `Phase ${universe.currentPhase || 1}`;
        const topCharacters = normalizedRoster
            .filter(character => character.status !== 'RETIRED')
            .sort((a, b) => ((b.fanApproval || 0) + (b.appearances || 0) * 10) - ((a.fanApproval || 0) + (a.appearances || 0) * 10))
            .slice(0, 4)
            .map(character => character.name);
        const newScript: Script = {
            id: `script_universe_event_${Date.now()}`,
            title,
            genres: ['ACTION'],
            status: 'CONCEPT',
            quality: 0,
            options: [],
            writerId: null,
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: 0,
            isOriginal: false,
            projectType: 'MOVIE',
            sourceMaterial: 'SPINOFF',
            universeId: universe.id,
            universeSagaName: currentSagaName,
            universePhaseName: currentPhaseName,
            connectedProjectIntent: 'EVENT',
            logline: topCharacters.length > 0
                ? `${topCharacters.join(', ')} collide in a high-stakes ${currentPhaseName} crossover for ${universe.name}.`
                : `A major crossover event that defines the next chapter of ${universe.name}.`,
            tags: ['UNIVERSE_EVENT', currentSagaName, currentPhaseName],
            hype: Math.round(eventReadiness)
        };
        onCommission(newScript);
    };

    const handleRetireUniverse = () => {
        if (!canRetireUniverse) return;
        const updatedUniverse = retireUniverseForArchive(universe, player.age, player.currentWeek);
        const newsItem = {
            id: `news_universe_retired_${updatedUniverse.id}_${Date.now()}`,
            headline: tr('services.business.universeLifecycle.news.archiveHeadline', { universeName: updatedUniverse.name }),
            subtext: tr('services.business.universeLifecycle.news.archiveSubtext'),
            category: 'UNIVERSE' as const,
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'MEDIUM' as const
        };
        onUpdatePlayer(buildPlayerWithUniverse(updatedUniverse, {
            news: [newsItem, ...player.news].slice(0, 50),
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: tr('services.business.universeLifecycle.log.archive', { universeName: updatedUniverse.name }),
                    type: 'neutral' as const
                },
                ...(player.logs || [])
            ].slice(0, 50)
        }));
        setShowRetirementDialog(false);
    };

    const handleLaunchReboot = (title: string) => {
        if (!retired) return;
        const { universe: rebootedUniverse, script } = rebootRetiredUniverse(universe, title, lastReleasedGenre, player.age, player.currentWeek);
        const updatedScripts = [...(studio.studioState?.scripts || []), script];
        const newsItem = {
            id: `news_universe_reboot_${rebootedUniverse.id}_${Date.now()}`,
            headline: tr('services.business.universeLifecycle.news.rebootHeadline', { universeName: rebootedUniverse.name }),
            subtext: tr('services.business.universeLifecycle.news.rebootSubtext', { title }),
            category: 'UNIVERSE' as const,
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH' as const
        };
        onUpdatePlayer(buildPlayerWithUniverse(rebootedUniverse, {
            news: [newsItem, ...player.news].slice(0, 50),
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: tr('services.business.universeLifecycle.log.reboot', { title, universeName: rebootedUniverse.name }),
                    type: 'positive' as const
                },
                ...(player.logs || [])
            ].slice(0, 50)
        }, { scripts: updatedScripts }));
        setSagaName(rebootedUniverse.currentSagaName || tr('services.business.universeLifecycle.rebootEra'));
        setPhaseName(rebootedUniverse.currentPhaseName || tr('services.business.universeLifecycle.rebootPhase'));
        setRebootTitle(null);
    };

    const timeline = universeProjects.reduce((acc, p) => {
        const sName = p?.universeSagaName || getSagaLabel(1);
        const pName = p?.universePhaseName || getPhaseLabel(1);
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
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{tr('services.business.universeDashboard.subtitle')}</p>
                </div>
            </div>

            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                <button 
                    onClick={() => setActiveTab('TIMELINE')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'TIMELINE' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    {tr('services.business.universeDashboard.tab.timeline')}
                </button>
                <button 
                    onClick={() => setActiveTab('ROSTER')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'ROSTER' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    {tr('services.business.universeDashboard.tab.roster')}
                </button>
                <button 
                    onClick={() => setActiveTab('MERCH')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'MERCH' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    {tr('services.business.universeDashboard.tab.merch')}
                </button>
            </div>

            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_38%),linear-gradient(135deg,rgba(39,39,42,0.92),rgba(9,9,11,0.98))] border border-amber-500/20 rounded-3xl p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">{healthLabel}</p>
                        <h3 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none">{universe.name}</h3>
                        <p className="text-xs text-zinc-400 mt-2 uppercase tracking-widest">
                            {tr('services.business.universeDashboard.heroSummary', { projectCount: universeProjects.length, characterCount: normalizedRoster.length, sagaName: universe.currentSagaName || getSagaLabel(currentSagaNumber) })}
                        </p>
                    </div>
                    <button
                        onClick={() => setEventFilmTitle(getUniverseEventTitle())}
                        disabled={retired || normalizedRoster.length < 2}
                        className="bg-white text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {retired ? tr('services.business.universeDashboard.action.archiveLocked') : tr('services.business.universeDashboard.action.commissionEventFilm')}
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { labelKey: 'services.business.universeDashboard.metric.fanTrust', value: fanTrust, color: 'bg-emerald-400' },
                        { labelKey: 'services.business.universeDashboard.metric.continuity', value: continuityScore, color: 'bg-blue-400' },
                        { labelKey: 'services.business.universeDashboard.metric.fatigue', value: fatigue, color: fatigue >= 70 ? 'bg-rose-500' : 'bg-zinc-500' },
                        { labelKey: 'services.business.universeDashboard.metric.eventReady', value: eventReadiness, color: 'bg-amber-400' }
                    ].map(metric => (
                        <div key={metric.labelKey} className="bg-black/35 border border-white/10 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr(metric.labelKey)}</p>
                                <p className="text-sm font-black text-white">{Math.round(metric.value)}</p>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full ${metric.color}`} style={{ width: `${Math.round(metric.value)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div className="bg-black/25 border border-white/10 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.universeDashboard.metric.canonProjects')}</p>
                        <p className="text-xl font-black text-white">{universeProjects.length}</p>
                    </div>
                    <div className="bg-black/25 border border-white/10 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.universeDashboard.metric.avgImdb')}</p>
                        <p className="text-xl font-black text-white">{averageRating > 0 ? averageRating.toFixed(1) : '-'}</p>
                    </div>
                    <div className="bg-black/25 border border-white/10 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.universeDashboard.metric.totalGross')}</p>
                        <p className="text-xl font-black text-emerald-300">{formatCurrency(totalGross)}</p>
                    </div>
                    <div className="bg-black/25 border border-white/10 rounded-2xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.universeDashboard.metric.licensing')}</p>
                        <p className="text-xl font-black text-amber-300">{formatCurrency(projectedLicensing)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-1">{releaseActivity.label}</p>
                    </div>
                </div>

                <div className="mt-3 bg-black/30 border border-white/10 rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className={continuityRisk >= 70 ? 'text-rose-300' : continuityRisk >= 38 ? 'text-amber-300' : 'text-emerald-300'} />
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.universeDashboard.continuityRisk')}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${continuityRiskTone}`}>
                            {continuityRiskLabel}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <p className="text-lg font-black text-white">{recastCount}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{tr('services.business.universeDashboard.metric.recasts')}</p>
                        </div>
                        <div>
                            <p className="text-lg font-black text-white">{recurringCount}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{tr('services.business.universeDashboard.metric.returning')}</p>
                        </div>
                        <div>
                            <p className="text-lg font-black text-white">{upcomingProjects.length}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{tr('services.business.universeDashboard.metric.inFlight')}</p>
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${continuityRisk >= 70 ? 'bg-rose-500' : continuityRisk >= 38 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.round(continuityRisk)}%` }} />
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-3 text-amber-300">
                    <Sparkles size={18} />
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">{tr('services.business.universeDashboard.audiencePulse.title')}</p>
                </div>
                <p className="text-xl font-black text-white leading-snug">{audiencePulse}</p>
            </div>

            <div className={`border rounded-3xl p-5 ${retired ? 'bg-amber-500/10 border-amber-500/25' : 'bg-zinc-950/70 border-zinc-800'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${retired ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-900 text-zinc-400'}`}>
                            {retired ? <Archive size={20} /> : <History size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{tr('services.business.universeDashboard.lifecycle.title')}</p>
                            <h3 className="text-lg font-black text-white">{retired ? tr('services.business.universeDashboard.lifecycle.legacyArchive') : tr('services.business.universeDashboard.lifecycle.activeCanon')}</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                                {retired
                                    ? tr('services.business.universeDashboard.lifecycle.retiredBody', { age: universe.retiredAt?.year || player.age, week: universe.retiredAt?.week || player.currentWeek })
                                    : tr('services.business.universeDashboard.lifecycle.activeBody')}
                            </p>
                            {!retired && retirementBlockers.length > 0 && (
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">{retirementBlockers[0]}</p>
                            )}
                        </div>
                    </div>
                    {retired ? (
                        <button
                            onClick={() => setRebootTitle(`${universe.name}: Reborn`)}
                            className="bg-white text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-300 transition-all active:scale-[0.98]"
                        >
                            <span className="flex items-center justify-center gap-2"><Clapperboard size={15} /> {tr('services.business.universeDashboard.action.launchReboot')}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowRetirementDialog(true)}
                            disabled={!canRetireUniverse}
                            className="bg-zinc-900 text-zinc-300 border border-zinc-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 disabled:hover:text-zinc-300 transition-all"
                        >
                            <span className="flex items-center justify-center gap-2"><Archive size={15} /> {tr('services.business.universeDashboard.action.retireUniverse')}</span>
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'TIMELINE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Saga Control */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('services.business.universeTimeline.currentSaga')}</h3>
                        <button disabled={retired} onClick={handleConcludeSaga} className="text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 px-2 py-1 rounded hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                            {retired ? tr('services.business.universeTimeline.archived') : tr('services.business.universeTimeline.concludeSaga')}
                        </button>
                    </div>
                    {editingSaga ? (
                        <div className="flex gap-2">
                            <input 
                                value={sagaName} 
                                onChange={e => setSagaName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                            <button onClick={handleSaveSaga} className="bg-amber-500 text-black px-3 rounded text-xs font-bold">{tr('services.business.universeTimeline.save')}</button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center group">
                            <p className="text-xl font-black text-white">{universe.currentSagaName || getSagaLabel(currentSagaNumber)}</p>
                            <button disabled={retired} onClick={() => setEditingSaga(true)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity disabled:opacity-20 disabled:cursor-not-allowed">
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Phase Control */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('services.business.universeTimeline.currentPhase')}</h3>
                        <button disabled={retired} onClick={handleConcludePhase} className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-2 py-1 rounded hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                            {retired ? tr('services.business.universeTimeline.archived') : tr('services.business.universeTimeline.concludePhase')}
                        </button>
                    </div>
                    {editingPhase ? (
                        <div className="flex gap-2">
                            <input 
                                value={phaseName} 
                                onChange={e => setPhaseName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                            <button onClick={handleSavePhase} className="bg-amber-500 text-black px-3 rounded text-xs font-bold">{tr('services.business.universeTimeline.save')}</button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center group">
                            <p className="text-xl font-black text-white">{universe.currentPhaseName || getPhaseLabel(typeof universe.currentPhase === 'number' ? universe.currentPhase : parseInt(String(universe.currentPhase).replace(/\D/g, '')) || 1)}</p>
                            <button disabled={retired} onClick={() => setEditingPhase(true)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity disabled:opacity-20 disabled:cursor-not-allowed">
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {activeTab === 'TIMELINE' && (
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">{tr('services.business.universeTimeline.title')}</h3>
                    {Object.keys(timeline).length === 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
                            <p className="text-zinc-500 text-sm">{tr('services.business.universeTimeline.emptyTitle')}</p>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">{tr('services.business.universeTimeline.emptySubtext')}</p>
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
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">{tr('services.business.universeRoster.title')}</h3>
                    {normalizedRoster.length === 0 ? (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
                            <p className="text-zinc-500 text-sm">{tr('services.business.universeRoster.empty')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {normalizedRoster.map((char, idx) => {
                                const timeline = getUniverseCharacterTimelineParts(char);
                                return (
                                <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="text-lg font-black text-white truncate">{char.name}</p>
                                            <p className="text-xs text-zinc-500 truncate">
                                                {tr('services.business.universeRoster.playedBy', { actorName: char.actorId === 'PLAYER_SELF' ? tr('services.business.universeRoster.you') : char.actorName })}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                                            char.status === 'RECAST'
                                                ? 'bg-rose-500/10 text-rose-300'
                                                : char.status === 'RETIRED'
                                                    ? 'bg-zinc-500/10 text-zinc-400'
                                                    : 'bg-amber-500/10 text-amber-500'
                                        }`}>
                                            {getCharacterStatusLabel(char)}
                                        </div>
                                    </div>
                                    <div className="bg-black/25 rounded-xl p-2 space-y-1">
                                        <div className="flex gap-2 min-w-0 text-[9px] uppercase tracking-widest">
                                            <span className="text-zinc-600 shrink-0">{tr('services.business.universeRoster.first')}</span>
                                            <span className="text-zinc-400 truncate">{timeline.first || tr('services.business.universeRoster.notIntroduced')}</span>
                                        </div>
                                        <div className="flex gap-2 min-w-0 text-[9px] uppercase tracking-widest">
                                            <span className="text-zinc-600 shrink-0">{tr('services.business.universeRoster.latest')}</span>
                                            <span className="text-zinc-400 truncate">{timeline.latest || timeline.first || tr('services.business.universeRoster.noRelease')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                                <span>{tr('services.business.universeRoster.approval')}</span>
                                                <span>{Math.round(char.fanApproval || 0)}%</span>
                                            </div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${Math.round(char.fanApproval || 0)}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                                <span>{tr('services.business.universeRoster.appearances')}</span>
                                                <span>{Math.max(0, char.appearances || 0)}</span>
                                            </div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, char.appearances || 0) * 18)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
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
            {eventFilmTitle && (
                <WorkingTitleDialog
                    mode="COMMISSION"
                    title={tr('services.business.universeDashboard.dialog.eventTitle')}
                    description={tr('services.business.universeDashboard.dialog.eventDescription', { universeName: universe.name })}
                    initialTitle={eventFilmTitle}
                    confirmLabel={tr('services.business.universeDashboard.dialog.eventConfirm')}
                    onClose={() => setEventFilmTitle(null)}
                    onConfirm={(title) => {
                        createUniverseEventScript(title);
                        setEventFilmTitle(null);
                    }}
                />
            )}
            {rebootTitle && (
                <WorkingTitleDialog
                    mode="COMMISSION"
                    title={tr('services.business.universeDashboard.dialog.rebootTitle')}
                    description={tr('services.business.universeDashboard.dialog.rebootDescription', { universeName: universe.name })}
                    initialTitle={rebootTitle}
                    confirmLabel={tr('services.business.universeDashboard.dialog.rebootConfirm')}
                    onClose={() => setRebootTitle(null)}
                    onConfirm={handleLaunchReboot}
                />
            )}
            {showRetirementDialog && (
                <UniverseRetirementDialog
                    universe={universe}
                    onClose={() => setShowRetirementDialog(false)}
                    onConfirm={handleRetireUniverse}
                />
            )}
        </div>
    );
};

const UniverseManager: React.FC<{
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
    onCommission: (script: Script) => void;
}> = ({ player, studio, onUpdatePlayer, onCommission }) => {
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
                                    <h4 className="text-sm font-black text-white uppercase group-hover:text-amber-400 transition-colors">{u.name}</h4>
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
