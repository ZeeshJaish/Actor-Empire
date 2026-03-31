
import React, { useState } from 'react';
import { Player, Agent, Manager, SponsorshipActionType, TeamMember } from '../../types';
import { ArrowLeft, Send, Camera, Clock, DollarSign, XCircle, AlertTriangle, Dumbbell, Sparkles, Megaphone, HeartPulse, CheckCircle } from 'lucide-react';

interface TeamAppProps {
  player: Player;
  onBack: () => void;
  onHireAgent: (agent: Agent) => void;
  onFireAgent: () => void;
  onHireManager: (manager: Manager) => void;
  onFireManager: () => void;
  onPerformSponsorship: (id: string, action: SponsorshipActionType) => void;
  onUpdatePlayer?: (player: Player) => void;
  onShowToast?: (msg: string, color?: string) => void;
}

type Tab = 'OVERVIEW' | 'AGENT' | 'MANAGER' | 'TRAINER' | 'STYLIST' | 'THERAPIST' | 'PUBLICIST';

export const TeamApp: React.FC<TeamAppProps> = ({ player, onBack, onHireAgent, onFireAgent, onHireManager, onFireManager, onPerformSponsorship, onUpdatePlayer, onShowToast }) => {
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  
  // Generic Selection for Lifestyle Team
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Pool Helpers
  const availableAgents = player.team.availableAgents || [];
  const availableManagers = player.team.availableManagers || [];
  const availableTrainers = player.team.availableTrainers || [];
  const availableStylists = player.team.availableStylists || [];
  const availableTherapists = player.team.availableTherapists || [];
  const availablePublicists = player.team.availablePublicists || [];

  const safeShowToast = (msg: string, color: string) => {
      if (onShowToast) onShowToast(msg, color);
      else alert(msg);
  };

  // --- GENERIC HIRE/FIRE HANDLERS FOR LIFESTYLE TEAM ---
  const handleHireMember = (member: TeamMember) => {
      if (!onUpdatePlayer) return;
      if (player.flags.teamChangeLocked) {
          safeShowToast("Team changes locked for this week.", "bg-zinc-700");
          return;
      }
      
      // NEW CHECK: Can afford first week?
      if (player.money < member.weeklyCost) {
          safeShowToast(`Need $${member.weeklyCost.toLocaleString()} for first week.`, "bg-rose-500");
          return;
      }

      const updatedTeam = { ...player.team };
      if (member.type === 'TRAINER') updatedTeam.personalTrainer = member;
      else if (member.type === 'STYLIST') updatedTeam.stylist = member;
      else if (member.type === 'THERAPIST') updatedTeam.therapist = member;
      else if (member.type === 'PUBLICIST') updatedTeam.publicist = member;

      const updatedFlags = { ...player.flags, teamChangeLocked: true };
      
      // DEDUCT MONEY (First week payment upfront)
      const newMoney = player.money - member.weeklyCost;
      
      const newLogs = [...player.logs, {
          week: player.currentWeek, 
          year: player.age, 
          message: `Hired ${member.name}. Paid initial week: $${member.weeklyCost.toLocaleString()}`, 
          type: 'neutral' as const
      }];
      
      onUpdatePlayer({ ...player, team: updatedTeam, flags: updatedFlags, money: newMoney, logs: newLogs });
      setSelectedMember(null);
      safeShowToast(`${member.name} hired!`, "bg-emerald-500");
  };

  const handleFireMember = (type: string) => {
      if (!onUpdatePlayer) return;
      if (player.flags.teamChangeLocked) {
          safeShowToast("Team changes locked for this week.", "bg-zinc-700");
          return;
      }

      const updatedTeam = { ...player.team };
      if (type === 'TRAINER') updatedTeam.personalTrainer = null;
      else if (type === 'STYLIST') updatedTeam.stylist = null;
      else if (type === 'THERAPIST') updatedTeam.therapist = null;
      else if (type === 'PUBLICIST') updatedTeam.publicist = null;

      const updatedFlags = { ...player.flags, teamChangeLocked: true };
      
      onUpdatePlayer({ ...player, team: updatedTeam, flags: updatedFlags });
      safeShowToast("Staff member fired.", "bg-zinc-700");
  };

  const renderLifestyleTab = (
      roleType: 'TRAINER' | 'STYLIST' | 'THERAPIST' | 'PUBLICIST', 
      current: TeamMember | null, 
      pool: TeamMember[]
  ) => (
      <div>
          {current && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      {roleType === 'TRAINER' ? <Dumbbell size={64}/> : roleType === 'STYLIST' ? <Sparkles size={64}/> : roleType === 'PUBLICIST' ? <Megaphone size={64}/> : <HeartPulse size={64}/>}
                  </div>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                      <div>
                          <div className="text-xs text-blue-500 font-bold uppercase mb-1">Current {roleType === 'TRAINER' ? 'Trainer' : roleType === 'STYLIST' ? 'Stylist' : roleType === 'PUBLICIST' ? 'Publicist' : 'Therapist'}</div>
                          <div className="font-bold text-xl">{current.name}</div>
                      </div>
                      <button onClick={() => handleFireMember(roleType)} className="text-rose-500 text-xs font-bold px-3 py-1 bg-rose-50 rounded-lg border border-rose-100">Fire</button>
                  </div>
                  <div className="text-sm text-slate-600 mb-4 relative z-10">{current.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl relative z-10">
                      <div>Cost: <strong>${current.weeklyCost.toLocaleString()}/wk</strong></div>
                      <div>Perk: <strong>{current.perks}</strong></div>
                  </div>
              </div>
          )}
          
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">Available Professionals</h3>
          <div className="space-y-3">
              {pool.map(member => (
                  <div key={member.id} onClick={() => setSelectedMember(member)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 active:scale-[0.99] transition-transform">
                      <div className="flex justify-between items-center mb-1">
                          <div className="font-bold text-slate-900">{member.name}</div>
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${member.tier === 'ELITE' || member.tier === 'LEGEND' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>{member.tier}</div>
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1 mb-2">{member.description}</div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-2">
                          <span className="font-bold text-emerald-600">${member.weeklyCost.toLocaleString()}/wk</span>
                          <span>{member.perks}</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="absolute inset-0 bg-slate-100 flex flex-col z-40 text-slate-900 animate-in slide-in-from-right duration-300">
        <div className="bg-blue-600 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 text-white z-10">
            <button onClick={() => { if(selectedAgent || selectedManager || selectedMember) { setSelectedAgent(null); setSelectedManager(null); setSelectedMember(null); } else onBack(); }} className="flex items-center gap-1 font-medium text-white/90"><ArrowLeft size={18} /> Back</button>
            <div className="font-bold text-lg">My Team</div>
            <div className="w-10"></div>
        </div>

        {/* Scrollable Tabs */}
        {!selectedAgent && !selectedManager && !selectedMember && (
            <div className="flex bg-white border-b border-slate-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'OVERVIEW', label: 'Overview' },
                    { id: 'AGENT', label: 'Agent' },
                    { id: 'MANAGER', label: 'Manager' },
                    { id: 'TRAINER', label: 'Trainer' },
                    { id: 'STYLIST', label: 'Stylist' },
                    { id: 'THERAPIST', label: 'Therapist' },
                    { id: 'PUBLICIST', label: 'Publicist' },
                ].map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setTab(item.id as Tab)} 
                        className={`flex-none px-6 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${tab === item.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-20">
            
            {/* OVERVIEW TAB */}
            {tab === 'OVERVIEW' && !selectedAgent && !selectedManager && !selectedMember && (
                <div className="space-y-6">
                    {/* Core Team Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div onClick={() => setTab('AGENT')} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 active:scale-95 transition-transform">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-2">Agent</div>
                            {player.team.agent ? <><div className="font-bold text-slate-900 text-lg mb-1">{player.team.agent.name}</div><div className="text-xs text-blue-600">{player.team.agent.tier} Tier</div></> : <div className="text-slate-400 italic text-sm">None hired</div>}
                        </div>
                        <div onClick={() => setTab('MANAGER')} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 active:scale-95 transition-transform">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-2">Manager</div>
                            {player.team.manager ? <><div className="font-bold text-slate-900 text-lg mb-1">{player.team.manager.name}</div><div className="text-xs text-blue-600">{player.team.manager.tier} Tier</div></> : <div className="text-slate-400 italic text-sm">None hired</div>}
                        </div>
                    </div>

                    {/* Lifestyle List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">Lifestyle Team</div>
                        <div className="divide-y divide-slate-100">
                            {[
                                { label: 'Personal Trainer', icon: Dumbbell, member: player.team.personalTrainer, tab: 'TRAINER' },
                                { label: 'Stylist', icon: Sparkles, member: player.team.stylist, tab: 'STYLIST' },
                                { label: 'Therapist', icon: HeartPulse, member: player.team.therapist, tab: 'THERAPIST' },
                                { label: 'Publicist', icon: Megaphone, member: player.team.publicist, tab: 'PUBLICIST' },
                            ].map(role => (
                                <div key={role.label} onClick={() => setTab(role.tab as Tab)} className="p-4 flex items-center justify-between active:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${role.member ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <role.icon size={18}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">{role.member ? role.member.name : 'Vacancy'}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">{role.label}</div>
                                        </div>
                                    </div>
                                    {role.member && <div className="text-xs font-mono text-slate-400">-${role.member.weeklyCost}/wk</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sponsorships */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 pl-2">Active Contracts</h3>
                        {(player.activeSponsorships?.length || 0) === 0 ? <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-sm">No active sponsorships. Hire a manager!</div> : (
                            <div className="space-y-3">
                                {player.activeSponsorships?.map(spon => {
                                    const req = spon.requirements;
                                    // NEW: Cumulative Logic
                                    const progress = req.progress || 0;
                                    const total = req.totalRequired || 1;
                                    const isDone = progress >= total;
                                    const pct = Math.min(100, (progress / total) * 100);
                                    
                                    return (
                                        <div key={spon.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                                            {/* Progress Bar Background */}
                                            <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full">
                                                <div className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${pct}%`}}></div>
                                            </div>
                                            
                                            <div className="flex justify-between items-start mb-2 mt-2">
                                                <div>
                                                    <div className="font-bold text-slate-900">{spon.brandName}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{spon.category}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">+${spon.weeklyPay}/wk</div>
                                                    <div className="text-[9px] text-slate-400 mt-1 font-bold">{spon.durationWeeks} Wks Left</div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg">
                                                <span>Task: {req.type === 'POST' ? 'Social Post' : 'Photoshoot'}</span>
                                                <span className={isDone ? 'text-emerald-600 font-bold' : 'text-slate-600 font-bold'}>{progress}/{total} Completed</span>
                                            </div>
                                            
                                            <button 
                                                onClick={() => onPerformSponsorship(spon.id, spon.requirements.type)} 
                                                disabled={isDone || player.energy.current < spon.requirements.energyCost} 
                                                className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                                    isDone ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                                                    player.energy.current < spon.requirements.energyCost ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 
                                                    'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                                }`}
                                            >
                                                {isDone ? <><CheckCircle size={14}/> Contract Fulfilled</> : 
                                                <>{spon.requirements.type === 'POST' ? <Send size={14}/> : <Camera size={14}/>} {spon.requirements.type === 'POST' ? 'Post Ad' : 'Go to Shoot'} <span className="opacity-70 font-normal">(-{spon.requirements.energyCost}E)</span></>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ROLE TABS */}
            {tab === 'AGENT' && !selectedAgent && (
                <div>
                    {player.team.agent && <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 mb-6"><div className="flex justify-between items-start mb-2"><div><div className="text-xs text-blue-500 font-bold uppercase mb-1">Current Agent</div><div className="font-bold text-xl">{player.team.agent.name}</div></div><button onClick={onFireAgent} className="text-rose-500 text-xs font-bold px-3 py-1 bg-rose-50 rounded-lg">Fire</button></div><div className="text-sm text-slate-600 mb-4">{player.team.agent.description}</div><div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl"><div>Commission: <strong>{player.team.agent.commission * 100}%</strong></div><div>Annual Fee: <strong>${player.team.agent.annualFee.toLocaleString()}</strong></div><div>Specialty: <strong>{player.team.agent.specialty}</strong></div><div>Access: <strong>{player.team.agent.studioAccess}</strong></div></div></div>}
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">Available Agents</h3>
                    <div className="space-y-3">{availableAgents.map(agent => <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 active:scale-[0.99] transition-transform"><div className="flex justify-between items-center mb-1"><div className="font-bold text-slate-900">{agent.name}</div><div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{agent.tier}</div></div><div className="text-xs text-slate-500 line-clamp-1 mb-2">{agent.description}</div><div className="flex gap-4 text-[10px] text-slate-400 font-mono"><span>${agent.annualFee.toLocaleString()}/yr</span><span>{(agent.commission * 100).toFixed(0)}% Comm</span></div></div>)}</div>
                </div>
            )}

            {tab === 'MANAGER' && !selectedManager && (
                <div>
                    {player.team.manager && <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 mb-6"><div className="flex justify-between items-start mb-2"><div><div className="text-xs text-blue-500 font-bold uppercase mb-1">Current Manager</div><div className="font-bold text-xl">{player.team.manager.name}</div></div><button onClick={onFireManager} className="text-rose-500 text-xs font-bold px-3 py-1 bg-rose-50 rounded-lg">Fire</button></div><div className="text-sm text-slate-600 mb-4">{player.team.manager.description}</div><div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl"><div>Power: <strong>{player.team.manager.sponsorshipPower}/10</strong></div><div>Annual Fee: <strong>${player.team.manager.annualFee.toLocaleString()}</strong></div></div></div>}
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">Available Managers</h3>
                    <div className="space-y-3">{availableManagers.map(mgr => <div key={mgr.id} onClick={() => setSelectedManager(mgr)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 active:scale-[0.99] transition-transform"><div className="flex justify-between items-center mb-1"><div className="font-bold text-slate-900">{mgr.name}</div><div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{mgr.tier}</div></div><div className="text-xs text-slate-500 line-clamp-1 mb-2">{mgr.description}</div><div className="flex gap-4 text-[10px] text-slate-400 font-mono"><span>${mgr.annualFee.toLocaleString()}/yr</span><span>Power: {mgr.sponsorshipPower}</span></div></div>)}</div>
                </div>
            )}

            {tab === 'TRAINER' && !selectedMember && renderLifestyleTab('TRAINER', player.team.personalTrainer, availableTrainers)}
            {tab === 'STYLIST' && !selectedMember && renderLifestyleTab('STYLIST', player.team.stylist, availableStylists)}
            {tab === 'THERAPIST' && !selectedMember && renderLifestyleTab('THERAPIST', player.team.therapist, availableTherapists)}
            {tab === 'PUBLICIST' && !selectedMember && renderLifestyleTab('PUBLICIST', player.team.publicist, availablePublicists)}

            {/* HIRE MODALS */}
            {selectedAgent && <div className="space-y-4 animate-in slide-in-from-bottom"><div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center"><h2 className="text-xl font-bold text-slate-900">{selectedAgent.name}</h2><button onClick={() => { onHireAgent(selectedAgent); setSelectedAgent(null); }} className="w-full py-4 rounded-xl font-bold text-white shadow-lg bg-blue-600 hover:bg-blue-700 mt-4">Hire Agent</button></div></div>}
            {selectedManager && <div className="space-y-4 animate-in slide-in-from-bottom"><div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center"><h2 className="text-xl font-bold text-slate-900">{selectedManager.name}</h2><button onClick={() => { onHireManager(selectedManager); setSelectedManager(null); }} className="w-full py-4 rounded-xl font-bold text-white shadow-lg bg-purple-600 hover:bg-purple-700 mt-4">Hire Manager</button></div></div>}
            
            {/* Generic Lifestyle Hire Modal */}
            {selectedMember && (
                <div className="space-y-4 animate-in slide-in-from-bottom">
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">{selectedMember.type}</div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedMember.name}</h2>
                        <p className="text-sm text-slate-600 mb-6">{selectedMember.description}</p>
                        
                        <div className="bg-slate-50 p-4 rounded-xl mb-6 text-left space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Weekly Cost</span>
                                <span className="font-mono font-bold text-rose-500">-${selectedMember.weeklyCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Perks</span>
                                <span className="font-bold text-emerald-600">{selectedMember.perks}</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleHireMember(selectedMember)} 
                            className="w-full py-4 rounded-xl font-bold text-white shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            Hire {selectedMember.name.split(' ')[0]}
                        </button>
                    </div>
                </div>
            )}
        </div>
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none"><div className="w-32 h-1 bg-black/10 rounded-full"></div></div>
    </div>
  );
};
