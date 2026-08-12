import React, { useState } from 'react';
import { AlertTriangle, Archive, ArrowLeft, Clapperboard, Edit2, Film, History, Sparkles, Tv } from 'lucide-react';
import { Business, Genre, Player, Script, Universe } from '../../../../types';
import { buildUniverseRoster, calculateUniverseProductWeeklyRevenue, getDefaultCharacterStoryFunction, getUniverseDashboardProjects, getUniverseLifecycleRevenueMultiplier, getUniverseReleaseActivity, isUniverseRetired, normalizeCharacterAbilityType, normalizeCharacterNature, normalizeCharacterStoryFunction, normalizeCharacterStoryRole, normalizeUniverseForSave, normalizeUniverseMap, rebootRetiredUniverse, retireUniverseForArchive } from '../../../../services/universeLogic';
import { getCharacterIdentityOption } from '../../../../services/characterStoryFit';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { UniverseRetirementDialog } from './UniverseRetirementDialog';
import { WorkingTitleDialog } from './WorkingTitleDialog';
import { UniverseMerchView } from './DevelopmentLabUniverseMerch';
import { clamp, formatCurrency } from '../developmentLabFormatting';

const getUniverseCharacterTimelineParts = (character: any) => {
    const first = typeof character?.firstAppearanceTitle === 'string' && character.firstAppearanceTitle.trim()
        ? character.firstAppearanceTitle.trim()
        : '';
    const latest = typeof character?.latestAppearanceTitle === 'string' && character.latestAppearanceTitle.trim()
        ? character.latestAppearanceTitle.trim()
        : '';
    return {
        first: first && !/^unknown$/i.test(first) ? first : '',
        latest: latest && !/^unknown$/i.test(latest) ? latest : '',
    };
};

export interface UniverseDashboardProps {
    universe: Universe;
    player: Player;
    studio: Business;
    onUpdatePlayer: (p: Player) => void;
    onCommission: (script: Script) => void;
    onBack: () => void;
}

export const UniverseDashboard: React.FC<UniverseDashboardProps> = ({ universe, player, studio, onUpdatePlayer, onCommission, onBack }) => {
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
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {[
                                            {
                                                label: getCharacterIdentityOption('storyFunction', normalizeCharacterStoryFunction(
                                                    char.storyFunction,
                                                    getDefaultCharacterStoryFunction(char.roleType, normalizeCharacterStoryRole(char.storyRole))
                                                )).label,
                                                tone: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-200',
                                            },
                                            {
                                                label: getCharacterIdentityOption('storyRole', normalizeCharacterStoryRole(char.storyRole)).label,
                                                tone: 'border-violet-400/20 bg-violet-400/5 text-violet-200',
                                            },
                                            {
                                                label: getCharacterIdentityOption('abilityType', normalizeCharacterAbilityType(char.abilityType)).label,
                                                tone: 'border-sky-400/20 bg-sky-400/5 text-sky-200',
                                            },
                                            {
                                                label: getCharacterIdentityOption('nature', normalizeCharacterNature(char.nature)).label,
                                                tone: 'border-zinc-700 bg-black/20 text-zinc-400',
                                            },
                                        ].map(item => (
                                            <span
                                                key={`${char.characterId || char.name}_${item.label}`}
                                                className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-widest ${item.tone}`}
                                            >
                                                {item.label}
                                            </span>
                                        ))}
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
