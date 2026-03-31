
import React from 'react';
import { Player, Commitment } from '../types';
import { getBuzzLabel } from '../services/roleLogic';
import { getAbsoluteWeek, getElapsedWeeks } from '../services/legacyLogic';
import { Film, Clapperboard, Trophy, Mic2, Video, Zap, PenTool, Coffee, TrendingUp, Twitter, Camera, Hourglass, CheckCircle2, Calendar } from 'lucide-react';

interface CareerPageProps {
  player: Player;
  onQuitJob: (id: string) => void;
  onRehearse: (id: string) => void;
}

export const CareerPage: React.FC<CareerPageProps> = ({ player, onQuitJob, onRehearse }) => {
  const pendingApps = player.applications || [];
  const actingCommitments = player.commitments.filter(c => c.type === 'ACTING_GIG');
  const pastProjects = player.pastProjects || [];

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
            <h2 className="text-3xl font-bold text-white">Career Profile</h2>
            <div className="flex gap-3 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1"><Trophy size={12} className="text-blue-500"/> Reputation: {Math.round(player.stats.reputation || 0)}</span>
                <span className="flex items-center gap-1"><Clapperboard size={12} /> Credits: {pastProjects.filter(p => p.type === 'ACTING_GIG').length}</span>
            </div>
         </div>
      </div>

      {/* 1. AUDITION ROOM */}
      {auditionPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-300">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Mic2 size={12} className="text-pink-500"/> Audition Room
            </h3>
            {auditionPhase.map(gig => {
                const isMaxed = (gig.auditionPerformance || 0) >= 100;
                return (
                    <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-pink-500 relative">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="font-bold text-white text-lg">{gig.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                    Role: <span className="text-pink-400 font-bold">{gig.roleType}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] text-zinc-600 uppercase">Selection In</div>
                                 <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} wks</div>
                            </div>
                         </div>
                         
                         <div className="bg-zinc-900/50 rounded-xl p-3 mb-3 border border-white/5">
                            <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
                                <span>Preparation Level</span>
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
                             {isMaxed ? <><CheckCircle2 size={12}/> Ready for Audition</> : <><Zap size={12} className="text-amber-400 fill-amber-400" /> Rehearse (-20 Energy)</>}
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
                <PenTool size={12} className="text-yellow-500"/> Development
            </h3>
            {planningPhase.map(gig => (
                <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-yellow-500 relative opacity-80">
                     <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="font-bold text-white text-lg">{gig.name}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                Status: <span className="text-yellow-400 font-bold">Scripting</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] text-zinc-600 uppercase">Pre-Prod In</div>
                             <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} wks</div>
                        </div>
                     </div>
                     <div className="bg-zinc-900/30 p-3 rounded-xl text-center">
                         <p className="text-[10px] text-zinc-500 italic">"Writers are working. Sit tight."</p>
                     </div>
                </div>
            ))}
          </div>
      )}

      {/* 3. PRE-PRODUCTION */}
      {preProductionPhase.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-left duration-300">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Coffee size={12} className="text-orange-500"/> Pre-Production
            </h3>
            {preProductionPhase.map(gig => {
                const isMaxed = (gig.auditionPerformance || 0) >= 100; // Using auditionPerf variable for 'Readiness' in pre-prod
                return (
                    <div key={gig.id} className="glass-card p-5 rounded-3xl border-l-4 border-l-orange-500 relative">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="font-bold text-white text-lg">{gig.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                    Status: <span className="text-orange-400 font-bold">Prep Phase</span>
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] text-zinc-600 uppercase">Shooting In</div>
                                 <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} wks</div>
                            </div>
                         </div>
                         
                         <div className="bg-zinc-900/50 rounded-xl p-3 mb-3 border border-white/5">
                            <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
                                <span>Readiness</span>
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
                             {isMaxed ? <><CheckCircle2 size={12}/> Ready to Film</> : <><Coffee size={12} className="text-amber-200" /> Table Read (-10 Energy)</>}
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
                <Video size={12} className="text-emerald-500"/> On Set
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
                                    Shooting Phase
                                </div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] text-zinc-600 uppercase">Wrap In</div>
                                 <div className="font-mono font-bold text-white">{gig.phaseWeeksLeft} wks</div>
                            </div>
                         </div>
                         
                         <div className="bg-zinc-900/80 rounded-xl p-3 mb-3 border border-white/5 relative z-10">
                            <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
                                <span>Scene Performance</span>
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
                             {isMaxed ? <><CheckCircle2 size={12}/> Scene Perfected</> : <><Zap size={12} className="text-yellow-300 fill-yellow-300" /> Rehearse Scene (-20 Energy)</>}
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
                <TrendingUp size={12} className="text-blue-500"/> Promotion & Buzz
            </h3>
            {postPhase.map(gig => {
                const buzz = gig.promotionalBuzz || 0;
                const buzzLabel = getBuzzLabel(buzz);
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
                                    Releases in: <span className="text-blue-400 font-bold">{gig.phaseWeeksLeft} wks</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hype Level</div>
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
                                <span className="text-[10px] font-bold text-zinc-300">Post</span>
                                <span className="text-[9px] text-zinc-500">-10E</span>
                            </button>

                            {/* X Hype */}
                            <button 
                                onClick={() => onRehearse(`PROMO_X_${gig.id}`)}
                                disabled={player.energy.current < 15}
                                className="flex flex-col items-center justify-center p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl gap-1 transition-colors border border-white/5 disabled:opacity-50"
                            >
                                <Twitter size={18} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-zinc-300">Hype</span>
                                <span className="text-[9px] text-zinc-500">-15E</span>
                            </button>

                            {/* Press Conference */}
                            <button 
                                onClick={() => onRehearse(`PROMO_PRESS_${gig.id}`)}
                                disabled={!canPress || player.energy.current < 25}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl gap-1 transition-colors border border-white/5 disabled:opacity-50 ${!canPress ? 'bg-zinc-900 cursor-not-allowed' : 'bg-blue-900/30 hover:bg-blue-900/50 border-blue-500/30'}`}
                            >
                                <Mic2 size={18} className={canPress ? "text-blue-300" : "text-zinc-600"} />
                                <span className={`text-[10px] font-bold ${canPress ? 'text-blue-200' : 'text-zinc-500'}`}>Press</span>
                                <span className="text-[9px] text-zinc-500">{!canPress ? `${4 - weeksSincePress}w Cool` : '-25E'}</span>
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
                <Calendar size={12} className="text-indigo-500"/> Upcoming Slate
            </h3>
            {scheduledPhase.map((gig, idx) => (
                <div key={gig.id} className="glass-card p-4 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-zinc-300 text-base">{gig.name}</div>
                        <div className="text-[10px] text-zinc-500">{gig.projectDetails?.subtype.replace('_', ' ')} • {gig.roleType}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-600 uppercase font-bold">Starts In</div>
                        <div className="text-indigo-400 font-mono font-bold text-sm">~{gig.phaseWeeksLeft}w</div>
                    </div>
                </div>
            ))}
          </div>
      )}

      {/* 7. PENDING APPLICATIONS */}
      {pendingApps.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Applications Sent</h3>
            <div className="grid grid-cols-1 gap-2">
                {pendingApps.map(app => (
                    <div key={app.id} className="glass-card p-3 rounded-xl flex items-center justify-between border-dashed border-zinc-700">
                         <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                                 <Hourglass size={14} className="animate-pulse" />
                             </div>
                             <div>
                                 <div className="font-bold text-zinc-200 text-sm">{app.name}</div>
                                 <div className="text-[10px] text-zinc-500">Casting review...</div>
                             </div>
                         </div>
                         <div className="text-xs text-zinc-500 font-mono">
                             ~{app.weeksRemaining}w
                         </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* EMPTY STATE */}
      {auditionPhase.length === 0 && planningPhase.length === 0 && preProductionPhase.length === 0 && productionPhase.length === 0 && postPhase.length === 0 && pendingApps.length === 0 && scheduledPhase.length === 0 && (
          <div className="border border-dashed border-zinc-800 rounded-3xl p-8 text-center bg-zinc-900/30 mt-8">
               <p className="text-zinc-500 text-sm">No active projects. Check CastLink to find work!</p>
          </div>
      )}
    </div>
  );
};
