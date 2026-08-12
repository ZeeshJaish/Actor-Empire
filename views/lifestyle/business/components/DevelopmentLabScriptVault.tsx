import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, BookOpen, ChevronRight, Clapperboard, Clock, Edit2, Globe, Layers, PenTool, ShieldCheck, Sparkles, Star, Trash2, Users } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { OwnedRight, OwnedRightDevelopmentChoice, Player, Script, ScriptAttributes, Writer } from '../../../../types';
import { getWriterTalent } from '../../../../services/roleLogic';
import { resolveProjectType } from '../../../../services/businessLogic';
import { formatGenreLabel, formatProjectFormatLabel } from '../../../../services/genreCatalog';
import { canManageWorkingTitle, discardUnreleasedScript, renameScriptWorkingTitle } from '../../../../services/projectNaming';
import { getOwnedIpPerformance } from '../../../../services/ownedIpPerformance';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { DiscardScriptDialog } from './DiscardScriptDialog';
import { WorkingTitleDialog } from './WorkingTitleDialog';
import { OwnedRightDevelopmentBrief } from './OwnedRightDevelopmentBrief';
import { OwnedIpDossier } from './OwnedIpDossier';
import { DevelopmentLabScriptWizard } from './DevelopmentLabScriptWizard';
import { formatCurrency } from '../developmentLabFormatting';

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

const SCRIPT_STATUS_PRIORITY: Record<Script['status'], number> = {
    READY: 0,
    CONCEPT: 1,
    IN_DEVELOPMENT: 2,
    PRODUCED: 3,
};

const sortScriptsForVault = (items: Script[]) => [...items].sort((a, b) => {
    const statusDelta = SCRIPT_STATUS_PRIORITY[a.status] - SCRIPT_STATUS_PRIORITY[b.status];
    if (statusDelta !== 0) return statusDelta;
    const aWeek = a.status === 'PRODUCED' ? (a.producedAtWeek ?? a.createdAtWeek ?? 0) : (a.createdAtWeek ?? 0);
    const bWeek = b.status === 'PRODUCED' ? (b.producedAtWeek ?? b.createdAtWeek ?? 0) : (b.createdAtWeek ?? 0);
    return bWeek - aWeek;
});

interface StatBarProps {
    label: string;
    value: number;
}

const StatBar: React.FC<StatBarProps> = ({ label, value }) => (
    <div className="mb-3">
        <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-zinc-400">
            <span>{label}</span>
            <span className={value >= 80 ? 'text-amber-400' : value >= 50 ? 'text-emerald-400' : 'text-red-400'}>{value}/100</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
                className={`h-full rounded-full ${value >= 80 ? 'bg-amber-500' : value >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

export interface DevelopmentLabScriptVaultProps {
    scripts: Script[];
    writers: Writer[];
    studioBalance: number;
    studioId: string;
    player: Player;
    ownedRights: OwnedRight[];
    onOpenProject?: (projectId: string) => void;
    onOpenFranchise: () => void;
    onOpenUniverse: () => void;
    onRenewRight: (rightId: string) => { changed: boolean; message: string };
    onDevelopRight: (rightId: string, choice: OwnedRightDevelopmentChoice) => string | null;
    onAssign: (scriptId: string, writerId: string, cost: number, skill: number, speed: number) => void;
    onUpdateScript: (script: Script, costType?: 'ENERGY' | 'MONEY', costAmount?: number) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, title: string) => void;
    onDeductEnergy: (amount: number) => void;
    onDeductMoney: (amount: number) => void;
    initialScriptId?: string;
}

export const DevelopmentLabScriptVault: React.FC<DevelopmentLabScriptVaultProps> = ({ scripts, writers, studioBalance, studioId, player, ownedRights, onOpenProject, onOpenFranchise, onOpenUniverse, onRenewRight, onDevelopRight, onAssign, onUpdateScript, onDelete, onRename, onDeductEnergy, onDeductMoney, initialScriptId }) => {
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
    const activeScripts = sortScriptsForVault(scripts.filter(script => script.status !== 'PRODUCED'));
    const producedScripts = sortScriptsForVault(scripts.filter(script => script.status === 'PRODUCED'));
    const shouldCollapseProducedArchive = producedScripts.length > 5;
    const [isProducedArchiveExpanded, setIsProducedArchiveExpanded] = useState(false);
    const visibleProducedScripts = shouldCollapseProducedArchive && !isProducedArchiveExpanded ? [] : producedScripts;

    useEffect(() => {
        if (!initialScriptId || !scripts.some(script => script.id === initialScriptId)) return;
        setVaultLane('SCRIPTS');
        setSelectedScriptForAssignment(initialScriptId);
        setAssignmentMode('CHOICE');
    }, [initialScriptId, scripts]);
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
                    <DevelopmentLabScriptWizard
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

interface ScriptDoctorPanelProps {
    script: Script;
    player: Player;
    studioBalance: number;
    onUpdateScript: (script: Script, costType?: 'ENERGY' | 'MONEY', costAmount?: number) => void;
}

const ScriptDoctorPanel: React.FC<ScriptDoctorPanelProps> = ({ script, player, studioBalance, onUpdateScript }) => {
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
