
import React from 'react';
import { Player, Commitment, OwnedProductionActionId, OwnedProductionTrackType } from '../types';
import { getBuzzLabel } from '../services/roleLogic';
import { getAbsoluteWeek, getElapsedWeeks } from '../services/legacyLogic';
import { getPlayerLanguage, t } from '../services/i18n';
import { deriveOwnedProductionCareerItems } from '../services/ownedProductionCareer';
import { Film, Clapperboard, Trophy, Mic2, Video, Zap, PenTool, Coffee, TrendingUp, Twitter, Camera, Hourglass, CheckCircle2, Calendar } from 'lucide-react';

interface CareerPageProps {
  player: Player;
  onQuitJob: (id: string) => void;
  onRehearse: (id: string) => void;
  onOwnedProductionFocus: (id: string, action: OwnedProductionActionId) => void;
}

const OWNED_TRACK_STYLES: Record<OwnedProductionTrackType, { dot: string; bar: string; text: string; border: string; panel: string; icon: string }> = {
  ACTING: { dot: 'bg-pink-400', bar: 'bg-pink-500', text: 'text-pink-200', border: 'border-pink-400/20', panel: 'bg-pink-950/10', icon: 'text-pink-200' },
  DIRECTING: { dot: 'bg-sky-400', bar: 'bg-sky-500', text: 'text-sky-200', border: 'border-sky-400/20', panel: 'bg-sky-950/10', icon: 'text-sky-200' },
  PRODUCING: { dot: 'bg-amber-400', bar: 'bg-amber-500', text: 'text-amber-200', border: 'border-amber-400/20', panel: 'bg-amber-950/10', icon: 'text-amber-200' },
};

const getOwnedPhaseLabel = (phase: Commitment['projectPhase']) => {
  if (phase === 'PRE_PRODUCTION') return 'Prep';
  if (phase === 'PRODUCTION') return 'On Set';
  if (phase === 'POST_PRODUCTION') return 'Post';
  return 'Production';
};

const getOwnedTrackIcon = (type: OwnedProductionTrackType, className: string) => {
  if (type === 'ACTING') return <Camera size={14} className={className} />;
  if (type === 'DIRECTING') return <Video size={14} className={className} />;
  return <Clapperboard size={14} className={className} />;
};

export const CareerPage: React.FC<CareerPageProps> = ({ player, onQuitJob, onRehearse, onOwnedProductionFocus }) => {
  const pendingApps = player.applications || [];
  const actingCommitments = player.commitments.filter(c => c.type === 'ACTING_GIG');
  const ownedProductionItems = deriveOwnedProductionCareerItems(player);
  const pastProjects = player.pastProjects || [];
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

  const auditionPhase = actingCommitments.filter(c => c.projectPhase === 'AUDITION');
  const planningPhase = actingCommitments.filter(c => c.projectPhase === 'PLANNING');
  const preProductionPhase = actingCommitments.filter(c => c.projectPhase === 'PRE_PRODUCTION');
  const productionPhase = actingCommitments.filter(c => c.projectPhase === 'PRODUCTION');
  const postPhase = actingCommitments.filter(c => c.projectPhase === 'POST_PRODUCTION');
  const scheduledPhase = actingCommitments.filter(c => c.projectPhase === 'SCHEDULED');

  return (
    <div className="space-y-8 pb-24 pt-4 relative">
      {/* Header Stats */}
      <div className="flex items-center gap-3 mb-2">
         <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
            <Film size={28} />
         </div>
         <div>
            <h2 className="text-3xl font-bold text-white">{tr('career.title')}</h2>
            <div className="flex gap-3 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1"><Trophy size={12} className="text-blue-500"/> {tr('home.reputation')}: {Math.round(player.stats.reputation || 0)}</span>
                <span className="flex items-center gap-1"><Clapperboard size={12} /> {tr('career.credits')}: {pastProjects.filter(p => p.type === 'ACTING_GIG').length}</span>
            </div>
         </div>
      </div>

      {/* 1. AUDITION ROOM */}
      {auditionPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-300">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Mic2 size={12} className="text-pink-500"/> {tr('career.auditionRoom')}
            </h3>
            {auditionPhase.map(gig => {
                const isMaxed = (gig.auditionPerformance || 0) >= 100;
                return (
                    <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-pink-500 relative">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="font-bold text-white text-lg">{gig.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                    {tr('career.role')}: <span className="text-pink-400 font-bold">{gig.roleType}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] text-zinc-600 uppercase">{tr('career.selectionIn')}</div>
                                 <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} {tr('career.weeksShort')}</div>
                            </div>
                         </div>
                         
                         <div className="bg-zinc-900/50 rounded-xl p-3 mb-3 border border-white/5">
                            <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
                                <span>{tr('career.preparationLevel')}</span>
                                <span>{Math.round(gig.auditionPerformance || 0)}/100</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${Math.min(100, gig.auditionPerformance || 0)}%` }}></div>
                            </div>
                         </div>

                         <button 
                            onClick={() => !isMaxed && onRehearse(gig.id)}
                            disabled={player.energy.current < 20 || isMaxed}
                            className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors border border-white/5 ${
                                isMaxed 
                                ? 'bg-emerald-900/30 text-emerald-400 cursor-default' 
                                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            }`}
                         >
                             {isMaxed ? <><CheckCircle2 size={12}/> {tr('career.readyForAudition')}</> : <><Zap size={12} className="text-amber-400 fill-amber-400" /> {tr('career.rehearseEnergy')}</>}
                         </button>
                    </div>
                );
            })}
          </div>
      )}

      {/* 2. DEVELOPMENT HELL (PLANNING) */}
      {planningPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-300">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <PenTool size={12} className="text-yellow-500"/> {tr('career.development')}
            </h3>
            {planningPhase.map(gig => (
                <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-yellow-500 relative opacity-80">
                     <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="font-bold text-white text-lg">{gig.name}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                {tr('home.status')}: <span className="text-yellow-400 font-bold">{tr('career.scripting')}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] text-zinc-600 uppercase">{tr('career.preProdIn')}</div>
                             <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} {tr('career.weeksShort')}</div>
                        </div>
                     </div>
                     <div className="bg-zinc-900/30 p-3 rounded-xl text-center">
                         <p className="text-[10px] text-zinc-500 italic">"{tr('career.writersWorking')}"</p>
                     </div>
                </div>
            ))}
          </div>
      )}

      {/* 3. PRE-PRODUCTION */}
      {preProductionPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-300">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Coffee size={12} className="text-orange-500"/> {tr('career.preProduction')}
            </h3>
            {preProductionPhase.map(gig => {
                const isMaxed = (gig.auditionPerformance || 0) >= 100; // Using auditionPerf variable for 'Readiness' in pre-prod
                return (
                    <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-orange-500 relative">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="font-bold text-white text-lg">{gig.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                    {tr('home.status')}: <span className="text-orange-400 font-bold">{tr('career.prepPhase')}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] text-zinc-600 uppercase">{tr('career.shootingIn')}</div>
                                 <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} {tr('career.weeksShort')}</div>
                            </div>
                         </div>
                         
                         <div className="bg-zinc-900/50 rounded-xl p-3 mb-3 border border-white/5">
                            <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
                                <span>{tr('career.readiness')}</span>
                                <span>{Math.round(gig.auditionPerformance || 0)}/100</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(100, gig.auditionPerformance || 0)}%` }}></div>
                            </div>
                         </div>

                         <button 
                            onClick={() => !isMaxed && onRehearse(gig.id)}
                            disabled={player.energy.current < 10 || isMaxed}
                            className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors border border-white/5 ${
                                isMaxed 
                                ? 'bg-emerald-900/30 text-emerald-400 cursor-default' 
                                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            }`}
                         >
                             {isMaxed ? <><CheckCircle2 size={12}/> {tr('career.readyToFilm')}</> : <><Coffee size={12} className="text-amber-200" /> {tr('career.tableRead')}</>}
                         </button>
                    </div>
                );
            })}
          </div>
      )}

      {/* 4. ON SET (PRODUCTION) */}
      {productionPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-500">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Video size={12} className="text-emerald-500"/> {tr('career.onSet')}
            </h3>
            {productionPhase.map(gig => {
                const isMaxed = (gig.productionPerformance || 0) >= 100;
                return (
                    <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-emerald-500 bg-emerald-900/10 relative">
                         <div className="absolute right-0 top-0 p-3 opacity-10">
                             <Clapperboard size={60} className="text-white" />
                         </div>
                         <div className="flex justify-between items-start mb-2 relative z-10">
                            <div>
                                <div className="font-bold text-white text-lg">{gig.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                    {tr('career.shootingPhase')}
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] text-zinc-600 uppercase">{tr('career.wrapIn')}</div>
                                 <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} {tr('career.weeksShort')}</div>
                            </div>
                         </div>
                         
                         <div className="bg-zinc-900/80 rounded-xl p-3 mb-3 border border-white/5 relative z-10">
                            <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
                                <span>{tr('career.scenePerformance')}</span>
                                <span>{Math.round(gig.productionPerformance || 0)}/100</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, gig.productionPerformance || 0)}%` }}></div>
                            </div>
                         </div>

                         <button 
                            onClick={() => !isMaxed && onRehearse(gig.id)}
                            disabled={player.energy.current < 20 || isMaxed}
                            className={`relative z-10 w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors shadow-lg ${
                                isMaxed 
                                ? 'bg-emerald-800 text-emerald-200 cursor-default border border-emerald-500/30' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                            }`}
                         >
                             {isMaxed ? <><CheckCircle2 size={12}/> {tr('career.scenePerfected')}</> : <><Zap size={12} className="text-yellow-300 fill-yellow-300" /> {tr('career.rehearseScene')}</>}
                         </button>
                    </div>
                );
            })}
          </div>
      )}

      {/* 5. POST PRODUCTION (PROMOTION PHASE) */}
      {postPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-700">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <TrendingUp size={12} className="text-blue-500"/> {tr('career.promotionBuzz')}
            </h3>
            {postPhase.map(gig => {
                const buzz = gig.promotionalBuzz || 0;
                const buzzLabel = getBuzzLabel(buzz, language);
                const weeksSincePress = typeof gig.lastPressAbsolute === 'number'
                  ? Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - gig.lastPressAbsolute)
                  : getElapsedWeeks(
                      player.age,
                      gig.lastPressWeek || Math.max(1, player.currentWeek - 10),
                      player.age,
                      player.currentWeek
                    );
                const canPress = weeksSincePress >= 4;

                return (
                    <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-blue-500 relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="font-bold text-white text-lg">{gig.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                    {tr('career.releasesIn')}: <span className="text-blue-400 font-bold">{gig.phaseWeeksLeft} {tr('career.weeksShort')}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{tr('career.hypeLevel')}</div>
                                <div className={`font-bold text-sm ${buzzLabel.color} px-2 py-0.5 bg-zinc-900 rounded border border-white/5`}>
                                    {buzzLabel.label}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {/* Instagram Promo */}
                            <button 
                                onClick={() => onRehearse(`PROMO_IG_${gig.id}`)}
                                disabled={player.energy.current < 10}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl gap-1 transition-colors border border-white/5 disabled:opacity-50"
                            >
                                <Camera size={18} className="text-pink-500" />
                                <span className="text-[10px] font-bold text-zinc-300">{tr('career.post')}</span>
                                <span className="text-[9px] text-zinc-500">-10E</span>
                            </button>

                            {/* X Hype */}
                            <button 
                                onClick={() => onRehearse(`PROMO_X_${gig.id}`)}
                                disabled={player.energy.current < 15}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl gap-1 transition-colors border border-white/5 disabled:opacity-50"
                            >
                                <Twitter size={18} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-zinc-300">{tr('career.hype')}</span>
                                <span className="text-[9px] text-zinc-500">-15E</span>
                            </button>

                            {/* Press Conference */}
                            <button 
                                onClick={() => onRehearse(`PROMO_PRESS_${gig.id}`)}
                                disabled={!canPress || player.energy.current < 25}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl gap-1 transition-colors border border-white/5 disabled:opacity-50 ${!canPress ? 'bg-zinc-900 cursor-not-allowed' : 'bg-blue-900/30 hover:bg-blue-900/50 border-blue-500/30'}`}
                            >
                                <Mic2 size={18} className={canPress ? "text-blue-300" : "text-zinc-600"} />
                                <span className={`text-[10px] font-bold ${canPress ? 'text-blue-200' : 'text-zinc-500'}`}>{tr('career.press')}</span>
                                <span className="text-[9px] text-zinc-500">{!canPress ? tr('career.cooldown', { count: 4 - weeksSincePress }) : '-25E'}</span>
                            </button>
                        </div>
                    </div>
                );
            })}
          </div>
      )}

      {/* 6. UPCOMING SCHEDULE (NEW) */}
      {scheduledPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-700">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Calendar size={12} className="text-indigo-500"/> {tr('career.upcomingSlate')}
            </h3>
            {scheduledPhase.map((gig, idx) => (
                <div key={gig.id} className="glass-card p-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-zinc-300 text-base">{gig.name}</div>
                        <div className="text-[10px] text-zinc-500">{gig.projectDetails?.subtype.replace('_', ' ')} • {gig.roleType}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-600 uppercase font-bold">{tr('career.startsIn')}</div>
                        <div className="text-indigo-400 font-mono font-bold text-sm">~{gig.phaseWeeksLeft}{tr('career.weeksShort')}</div>
                    </div>
                </div>
            ))}
          </div>
      )}

      {/* 7. MY PRODUCTIONS */}
      {ownedProductionItems.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-left duration-700">
            <div className="flex flex-col gap-2 pl-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Clapperboard size={12} className="text-amber-400"/> My Productions
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {ownedProductionItems.length} active
                    </span>
                    <span className="flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100">
                        <Zap size={11} fill="currentColor" /> Available Energy {player.energy.current}E
                    </span>
                </div>
            </div>
            <div className="space-y-2.5">
                {ownedProductionItems.map(item => (
                    <div key={item.commitment.id} data-owned-production-card="compact" className="glass-card rounded-2xl border-l-4 border-l-amber-500 bg-amber-950/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-zinc-300">
                                        Owned Work
                                    </span>
                                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-100">
                                        {getOwnedPhaseLabel(item.phase)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                                        {item.studioName}
                                    </span>
                                </div>
                                <div className="break-words text-base font-black leading-tight text-white">{item.commitment.name}</div>
                                <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    <span>Project W{item.projectWeek}/{item.totalProjectWeeks}w</span>
                                    <span>Phase {item.weeksLeft}/{item.phaseDurationWeeks}w</span>
                                    <span className={item.focusLoadWeeks > item.focusWeeksRemaining ? 'text-rose-300' : 'text-cyan-200'}>
                                        Focus {item.focusLoadWeeks}w load/{item.focusWeeksRemaining}w left
                                    </span>
                                    <span className="text-amber-300">Polish +{item.qualityLift}/15</span>
                                    <span>Quality {item.qualityScore}/100</span>
                                </div>
                            </div>
                            <Clapperboard size={20} className="shrink-0 text-amber-500/35" />
                        </div>

                        <div className="mt-3 space-y-2">
                            {item.tracks.map(track => {
                                const style = OWNED_TRACK_STYLES[track.type];
                                return (
                                    <div key={`${item.commitment.id}_${track.type}`} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 ${style.icon}`}>
                                                    {getOwnedTrackIcon(track.type, style.icon)}
                                                </span>
                                                <span className={`shrink-0 text-[9px] font-black uppercase tracking-[0.16em] ${style.text}`}>{track.label}</span>
                                                <div className="h-1.5 min-w-14 flex-1 overflow-hidden rounded-full bg-zinc-900">
                                                    <div className={`h-full ${style.bar} transition-all duration-500`} style={{ width: `${Math.min(100, track.progress)}%` }} />
                                                </div>
                                            </div>
                                            <span className="shrink-0 font-mono text-[10px] font-bold text-zinc-400">{Math.round(track.progress)}/100</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {track.actions.map(action => {
                                                const enoughEnergy = player.energy.current >= action.energyCost;
                                                const disabled = action.isMaxed || !enoughEnergy;
                                                return (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => !disabled && onOwnedProductionFocus(item.commitment.id, action.id)}
                                                        disabled={disabled}
                                                        aria-label={`Owned production ${track.label} ${action.label}`}
                                                        className={`flex min-h-8 min-w-[8.25rem] flex-1 items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[8px] font-black uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 ${
                                                            action.isMaxed
                                                                ? 'cursor-default border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                                                                : enoughEnergy
                                                                    ? 'cursor-pointer border-white/10 bg-zinc-800 text-white hover:bg-zinc-700'
                                                                    : 'cursor-not-allowed border-rose-400/20 bg-rose-400/10 text-rose-200'
                                                        }`}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            {action.isMaxed ? <CheckCircle2 size={13} className="shrink-0" /> : <Zap size={13} className={`shrink-0 ${enoughEnergy ? 'text-amber-300 fill-amber-300' : 'text-rose-200'}`} />}
                                                            <span className="whitespace-normal leading-tight">{action.shortLabel}</span>
                                                        </span>
                                                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[8px] ${
                                                            action.isMaxed
                                                                ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                                                                : enoughEnergy
                                                                    ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
                                                                    : 'border-rose-300/20 bg-rose-300/10 text-rose-100'
                                                        }`}>
                                                            {action.isMaxed ? 'Complete' : enoughEnergy ? `${action.energyCost}E` : `Need ${action.energyCost}E`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* 8. PENDING APPLICATIONS */}
      {pendingApps.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('career.applicationsSent')}</h3>
            <div className="grid grid-cols-1 gap-2">
                {pendingApps.map(app => (
                    <div key={app.id} className="glass-card p-3 rounded-xl flex items-center justify-between border-dashed border-zinc-700">
                         <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                                 <Hourglass size={14} className="animate-pulse" />
                             </div>
                             <div>
                                 <div className="font-bold text-zinc-200 text-sm">{app.name}</div>
                                 <div className="text-[10px] text-zinc-500">{tr('career.castingReview')}</div>
                             </div>
                         </div>
                         <div className="text-xs text-zinc-500 font-mono">
                             ~{app.weeksRemaining}{tr('career.weeksShort')}
                         </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* EMPTY STATE */}
      {auditionPhase.length === 0 && planningPhase.length === 0 && preProductionPhase.length === 0 && productionPhase.length === 0 && postPhase.length === 0 && pendingApps.length === 0 && scheduledPhase.length === 0 && ownedProductionItems.length === 0 && (
          <div className="border border-dashed border-zinc-800 rounded-3xl p-8 text-center bg-zinc-900/30 mt-8">
               <p className="text-zinc-500 text-sm">{tr('career.noActiveProjects')}</p>
          </div>
      )}
    </div>
  );
};
