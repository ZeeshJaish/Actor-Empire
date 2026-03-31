
import React, { useState } from 'react';
import { Player, AuditionOpportunity, Commitment } from '../../types';
import { ArrowLeft, Star, Briefcase, ChevronRight, Zap, DollarSign, XCircle, Crown, CheckCircle, Film, Tv } from 'lucide-react';
import { ProjectDetailView } from '../../components/ProjectDetailView';

interface CastLinkAppProps {
  player: Player;
  onBack: () => void;
  onAudition: (opp: AuditionOpportunity) => void;
  onTakeJob: (job: Commitment) => void;
  onQuitJob: (id: string) => void;
}

export const CastLinkApp: React.FC<CastLinkAppProps> = ({ player, onBack, onAudition, onTakeJob, onQuitJob }) => {
  const [view, setView] = useState<'MENU' | 'AUDITIONS' | 'JOBS'>('MENU');
  const [auditionFilter, setAuditionFilter] = useState<'ALL' | 'MOVIE' | 'TV'>('ALL'); // NEW FILTER
  const [selectedAudition, setSelectedAudition] = useState<AuditionOpportunity | null>(null);

  const currentAuditions = player.weeklyOpportunities?.auditions || [];
  const currentJobs = player.weeklyOpportunities?.jobs || [];
  const activeJob = player.commitments.find(c => c.type === 'JOB');

  const isApplied = (name: string) => player.applications.some(app => app.name === name);

  const filteredAuditions = currentAuditions.filter(a => {
      if (auditionFilter === 'ALL') return true;
      if (auditionFilter === 'MOVIE') return a.project.type === 'MOVIE';
      if (auditionFilter === 'TV') return a.project.type === 'SERIES';
      return true;
  });

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-40 text-black animate-in slide-in-from-right duration-300">
        
        {/* Render Project Details Overlay if active */}
        {selectedAudition && (
            <ProjectDetailView 
                opportunity={selectedAudition}
                onBack={() => setSelectedAudition(null)}
                onAction={() => {
                    if (!isApplied(selectedAudition.projectName)) {
                        onAudition(selectedAudition);
                    }
                }}
                actionLabel={
                    isApplied(selectedAudition.projectName) 
                        ? 'Applied' 
                        : player.energy.current < 25 
                            ? 'Too Tired (Need 25E)' 
                            : (
                                <span className="flex items-center gap-2">Apply for Role <Zap size={16} className="text-orange-300 fill-orange-300"/> -25 Energy</span>
                            )
                }
                actionDisabled={isApplied(selectedAudition.projectName) || player.energy.current < 25}
                actionColorClass={isApplied(selectedAudition.projectName) || player.energy.current < 25 ? 'bg-slate-300 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700'}
                headerTitle="Role Details"
                actionIcon={isApplied(selectedAudition.projectName) ? <CheckCircle size={20}/> : undefined}
            />
        )}

        {/* HEADER */}
        <div className="bg-indigo-700 p-4 pt-12 pb-4 shadow-lg flex items-center gap-3 shrink-0 text-white">
            <button onClick={() => { if(view !== 'MENU') setView('MENU'); else onBack(); }} className="hover:bg-white/10 p-1 rounded-full">
                <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
                <h2 className="font-bold text-lg leading-none">CastLink</h2>
                <p className="text-indigo-200 text-[10px]">Professional Network</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 custom-scrollbar relative">
            
            {/* MENU */}
            {view === 'MENU' && (
                <div className="space-y-4 pt-4">
                    <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-200">
                        <h2 className="text-2xl font-bold mb-1">Find Work</h2>
                        <p className="text-indigo-100 text-sm mb-4">Browse roles tailored to your profile.</p>
                        <div className="flex gap-3">
                            <div className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{currentAuditions.length} Auditions</div>
                            <div className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{currentJobs.length} Jobs</div>
                        </div>
                    </div>
                    <button onClick={() => setView('AUDITIONS')} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center"><Star size={24} /></div>
                            <div className="text-left"><div className="font-bold text-slate-900">Auditions</div><div className="text-xs text-slate-500">Film & TV Roles</div></div>
                        </div>
                        <ChevronRight className="text-slate-400" />
                    </button>
                    <button onClick={() => setView('JOBS')} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center"><Briefcase size={24} /></div>
                            <div className="text-left"><div className="font-bold text-slate-900">Part-Time Jobs</div><div className="text-xs text-slate-500">Steady Income</div></div>
                        </div>
                        <ChevronRight className="text-slate-400" />
                    </button>
                </div>
            )}

            {/* AUDITIONS LIST */}
            {view === 'AUDITIONS' && (
                <div className="space-y-3 pb-24">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Available Roles</h3>
                        
                        {/* FILTER PILLS */}
                        <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                             {(['ALL', 'MOVIE', 'TV'] as const).map(type => (
                                 <button 
                                    key={type}
                                    onClick={() => setAuditionFilter(type)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${auditionFilter === type ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                 >
                                     {type === 'ALL' ? 'All' : type === 'MOVIE' ? 'Films' : 'Series'}
                                 </button>
                             ))}
                        </div>
                    </div>

                    {filteredAuditions.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            {currentAuditions.length === 0 ? "No auditions currently." : "No results for this filter."}
                        </div>
                    ) : (
                        filteredAuditions.map(audition => {
                            const applied = isApplied(audition.projectName);
                            const isFamous = audition.project.isFamous;
                            const isTV = audition.project.type === 'SERIES';
                            
                            return (
                                <div 
                                    key={audition.id} 
                                    onClick={() => setSelectedAudition(audition)} 
                                    className={`
                                        bg-white p-4 rounded-2xl shadow-sm border active:scale-[0.98] transition-all relative overflow-hidden
                                        ${isFamous ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}
                                    `}
                                >
                                    {applied && <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl">APPLIED</div>}
                                    {isFamous && !applied && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl flex items-center gap-1"><Crown size={10} fill="currentColor"/> LEGENDARY</div>}
                                    
                                    <div className="flex justify-between items-start mb-2 pr-12">
                                        <div className="font-bold text-slate-900 text-lg leading-tight">{audition.projectName}</div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{audition.genre}</div>
                                        <div className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                            {isTV ? <Tv size={10}/> : <Film size={10}/>} {isTV ? `Series (${audition.project.episodes || 8} eps)` : 'Movie'}
                                        </div>
                                    </div>

                                    <div className="text-xs font-bold text-indigo-600 mb-2">{audition.roleType} Role</div>
                                    <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-2">
                                        <span className="font-mono text-emerald-600 font-bold">${audition.estimatedIncome.toLocaleString()}</span>
                                        <span className="flex items-center gap-1 text-rose-400 font-bold"><Zap size={10}/> 25E</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* JOBS VIEW */}
            {view === 'JOBS' && (
                <div className="space-y-4 pb-24">
                    {activeJob && (
                        <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Current Job</div>
                                <div className="text-xl font-bold mb-1">{activeJob.name}</div>
                                <div className="flex items-center gap-3 text-xs text-indigo-200 mb-4"><span className="flex items-center gap-1"><DollarSign size={12} /> ${activeJob.income}/wk</span></div>
                                <button onClick={() => onQuitJob(activeJob.id)} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><XCircle size={14} /> Quit Job</button>
                            </div>
                        </div>
                    )}
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-2">Available Shifts</h3>
                    {currentJobs.map(job => (
                        <div key={job.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center ${activeJob ? 'opacity-60' : ''}`}>
                            <div>
                                <div className="font-bold text-slate-800">{job.name}</div>
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2"><span className="text-emerald-600 font-bold">${job.income}/wk</span><span className="text-rose-400 font-bold">-{job.energyCost}E</span></div>
                            </div>
                            <button onClick={() => !activeJob && onTakeJob(job)} disabled={!!activeJob} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeJob ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'}`}>{activeJob ? 'Locked' : 'Start'}</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none"><div className="w-32 h-1 bg-black/10 rounded-full"></div></div>
    </div>
  );
};
