import React, { useMemo, useState } from 'react';
import { Player, Relationship, BloodlineMember } from '../types';
import { MessageCircle, Phone, Coffee, Gift, Users, X, Zap, Heart, Baby, Gem, Crown, Flame, Music, Plane, Briefcase, Trophy, Film, DollarSign, Skull, Sparkles } from 'lucide-react';
import { calculateLegacyScore, getGenerationNumber, getInteractionAgeInWeeks, getLegacyInheritancePreview, getRelationshipAge, LEGACY_INHERITANCE_TAX_RATE, LEGACY_MIN_PLAYABLE_AGE } from '../services/legacyLogic';
import { getDivorceLawyerCost, isChildAbandoned } from '../services/familyLogic';

interface SocialPageProps {
  player: Player;
  onInteract: (id: string, type: 'CALL' | 'HANGOUT' | 'GIFT' | 'NETWORK' | 'DATE' | 'PROPOSE' | 'INTIMACY' | 'CLUBBING' | 'TRIP' | 'ABANDON_CHILD' | 'RECONNECT_CHILD' | 'BREAK_UP' | 'DIVORCE_SETTLE' | 'DIVORCE_FIGHT_BUDGET' | 'DIVORCE_FIGHT_ESTABLISHED' | 'DIVORCE_FIGHT_ELITE') => void;
  onContinueAsChild: (child: Relationship) => void;
}

type SocialTab = 'connections' | 'legacy';

const formatWealth = (amount: number) => {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
};

export const SocialPage: React.FC<SocialPageProps> = ({ player, onInteract, onContinueAsChild }) => {
  const [selectedContact, setSelectedContact] = useState<Relationship | null>(null);
  const [activeTab, setActiveTab] = useState<SocialTab>('connections');
  const [legacyCandidate, setLegacyCandidate] = useState<Relationship | null>(null);
  const [showDivorceOptions, setShowDivorceOptions] = useState(false);

  const getHangoutCost = () => {
      if (player.stats.fame > 75) return 500;
      if (player.stats.fame > 40) return 200;
      return 50;
  };

  const getGiftCost = () => {
      if (player.stats.fame > 75) return 2000;
      return 250;
  };

  const handleInteraction = (type: 'CALL' | 'HANGOUT' | 'GIFT' | 'NETWORK' | 'DATE' | 'PROPOSE' | 'INTIMACY' | 'CLUBBING' | 'TRIP' | 'ABANDON_CHILD' | 'RECONNECT_CHILD' | 'BREAK_UP' | 'DIVORCE_SETTLE' | 'DIVORCE_FIGHT_BUDGET' | 'DIVORCE_FIGHT_ESTABLISHED' | 'DIVORCE_FIGHT_ELITE') => {
      if (selectedContact) {
          onInteract(selectedContact.id, type);
          setShowDivorceOptions(false);
          setSelectedContact(null);
      }
  };

  const sortedRelationships = useMemo(() => {
      return [...player.relationships].sort((a, b) => {
          const getPriority = (rel: Relationship) => {
              if (['Parent', 'Deceased Parent', 'Sibling', 'Partner', 'Spouse', 'Ex-Partner', 'Ex-Spouse', 'Child'].includes(rel.relation)) return 3;
              if (rel.relation === 'Connection') return 1;
              return 2;
          };
          const pA = getPriority(a);
          const pB = getPriority(b);
          if (pA !== pB) return pB - pA;
          return b.closeness - a.closeness;
      });
  }, [player.relationships]);

  const innerCircle = sortedRelationships.filter(rel =>
      ['Parent', 'Deceased Parent', 'Partner', 'Spouse', 'Ex-Partner', 'Ex-Spouse', 'Child', 'Friend', 'Sibling'].includes(rel.relation)
  );

  const professionalNetwork = sortedRelationships.filter(rel =>
      ['Connection', 'Director', 'Agent', 'Manager', 'Colleague', 'Networking'].includes(rel.relation)
  );

  const children = useMemo(() => {
      return sortedRelationships
          .filter(rel => rel.relation === 'Child')
          .map(rel => ({
              ...rel,
              age: getRelationshipAge(rel, player.age, player.currentWeek),
          }));
  }, [player.age, player.currentWeek, sortedRelationships]);

  const siblings = sortedRelationships.filter(rel => rel.relation === 'Sibling');
  const legacyHistory = player.bloodline || [];
  const currentGeneration = getGenerationNumber(player);
  const currentLegacyScore = calculateLegacyScore({
      netWorth: player.money,
      awards: player.awards?.length || 0,
      moviesMade: player.pastProjects.length,
      peakFame: player.stats.fame,
      businessCount: player.businesses?.length || 0,
  });
  const dynastyScore = legacyHistory.reduce((sum, member) => sum + (member.legacyScore || calculateLegacyScore(member)), 0) + currentLegacyScore;
  const inheritancePreview = useMemo(() => getLegacyInheritancePreview(player), [player]);

  const generationRows = useMemo(() => {
      const rows: Array<{
          generation: number;
          title: string;
          subtitle: string;
          members: Array<{
              id: string;
              name: string;
              avatar: string;
              caption: string;
              secondary: string;
              accent: string;
              score?: number;
          }>;
      }> = [];

      legacyHistory.forEach((ancestor: BloodlineMember) => {
          rows.push({
              generation: ancestor.generation,
              title: `Generation ${ancestor.generation}`,
              subtitle: `Legacy ruler of the ${ancestor.generation === 1 ? 'founding' : 'previous'} era`,
              members: [{
                  id: ancestor.id,
                  name: ancestor.name,
                  avatar: ancestor.avatar,
                  caption: `${formatWealth(ancestor.netWorth)} • ${ancestor.moviesMade} projects • ${ancestor.awards} awards`,
                  secondary: `Fame ${ancestor.peakFame || 0} • Businesses ${ancestor.businessCount || 0}`,
                  accent: 'amber',
                  score: ancestor.legacyScore || calculateLegacyScore(ancestor),
              }],
          });
      });

      rows.push({
          generation: currentGeneration,
          title: `Generation ${currentGeneration}`,
          subtitle: siblings.length > 0 ? 'Current ruler and same-generation family' : 'Current ruler of the family empire',
          members: [
              {
                  id: player.id,
                  name: player.name,
                  avatar: player.avatar,
                  caption: `${formatWealth(player.money)} • ${player.pastProjects.length} projects • ${player.awards?.length || 0} awards`,
                  secondary: `Fame ${Math.floor(player.stats.fame)} • Businesses ${player.businesses?.length || 0}`,
                  accent: 'emerald',
                  score: currentLegacyScore,
              },
              ...siblings.map(sibling => ({
                  id: sibling.id,
                  name: sibling.name,
                  avatar: sibling.image,
                  caption: `Sibling • Age ${getRelationshipAge(sibling, player.age, player.currentWeek)}`,
                  secondary: `Bond ${Math.floor(sibling.closeness)}/100`,
                  accent: 'zinc',
              })),
          ],
      });

      if (children.length > 0) {
          rows.push({
              generation: currentGeneration + 1,
              title: `Generation ${currentGeneration + 1}`,
              subtitle: 'Heirs waiting to carry the dynasty forward',
              members: children.map(child => ({
                  id: child.id,
                  name: child.name,
                  avatar: child.image,
                  caption: `Heir • Age ${child.age || 0}`,
                  secondary: `Bond ${Math.floor(child.closeness)}/100`,
                  accent: 'blue',
              })),
          });
      }

      return rows;
  }, [children, currentGeneration, currentLegacyScore, legacyHistory, player, siblings]);

  React.useEffect(() => {
      setShowDivorceOptions(false);
  }, [selectedContact?.id]);

  const renderRelationshipCard = (rel: Relationship) => {
      const weeksSince = getInteractionAgeInWeeks(rel, player.age, player.currentWeek);
      const isCritical = weeksSince >= 8;
      
      return (
          <div key={rel.id} onClick={() => setSelectedContact(rel)} className={`glass-card p-4 rounded-3xl flex items-center gap-4 group cursor-pointer transition-transform active:scale-[0.98] ${rel.relation === 'Partner' || rel.relation === 'Spouse' ? 'border-pink-500/30 bg-pink-900/5' : ''} ${rel.relation === 'Ex-Partner' || rel.relation === 'Ex-Spouse' ? 'border-rose-500/20 bg-rose-900/5' : ''}`}>
              <div className="relative">
                  <img
                      src={rel.image}
                      alt={rel.name}
                      className={`w-14 h-14 rounded-full object-cover border-2 transition-colors ${isCritical ? 'border-rose-500' : 'border-zinc-800 group-hover:border-zinc-600'}`}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-800 shadow-md">
                      {rel.relation === 'Partner' || rel.relation === 'Spouse' ? <Heart size={10} className="text-rose-500 fill-rose-500"/> :
                      rel.relation === 'Ex-Partner' || rel.relation === 'Ex-Spouse' ? <Heart size={10} className="text-rose-300"/> :
                      rel.relation === 'Parent' ? <span className="text-blue-500 text-[10px]">🏠</span> :
                      rel.relation === 'Deceased Parent' ? <Skull size={12} className="text-zinc-500"/> :
                      rel.relation === 'Child' ? <Baby size={12} className="text-yellow-400"/> :
                      rel.relation === 'Sibling' ? <Users size={12} className="text-cyan-400"/> :
                      rel.relation === 'Director' ? <Crown size={12} className="text-amber-400"/> :
                      rel.relation === 'Agent' ? <Briefcase size={12} className="text-blue-400"/> :
                      rel.relation === 'Manager' ? <Crown size={12} className="text-purple-400"/> :
                      rel.relation === 'Colleague' ? <Users size={12} className="text-emerald-400"/> :
                      rel.relation === 'Networking' ? <Zap size={12} className="text-amber-500"/> :
                      <span className="text-zinc-500 text-[10px]">👋</span>}
                  </div>
              </div>
              
              <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-white text-lg truncate">{rel.name}</div>
                      {isCritical && <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">Estranged</div>}
                  </div>
                  
                  <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-500 uppercase mb-0.5">
                          <span>{rel.relation}</span>
                          <span className={(rel.closeness || 0) > 80 ? 'text-emerald-400 font-bold' : ''}>{Math.round(rel.closeness || 0)}/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${(rel.closeness || 0) > 80 ? 'bg-emerald-500' : (rel.closeness || 0) < 30 ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${rel.closeness || 0}%` }}></div>
                      </div>
                  </div>
              </div>
              <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors"><MessageCircle size={20} /></div>
          </div>
      );
  };

  const ActionCard = ({ label, icon: Icon, costMoney, costEnergy, color, onClick, disabled, subtext }: any) => (
      <button
          onClick={onClick}
          disabled={disabled}
          className={`relative p-4 rounded-2xl border transition-all flex flex-col items-start gap-2 h-full text-left group ${
              disabled
              ? 'bg-zinc-900/50 border-zinc-800 opacity-50 cursor-not-allowed'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98]'
          }`}
      >
          <div className={`p-2.5 rounded-xl ${disabled ? 'bg-zinc-800 text-zinc-600' : `${color} bg-opacity-10 text-${color.split('-')[1]}-400`}`}>
              <Icon size={20} />
          </div>
          <div>
              <div className={`font-bold text-sm ${disabled ? 'text-zinc-600' : 'text-zinc-200'}`}>{label}</div>
              <div className="flex gap-2 text-[10px] font-mono mt-1 text-zinc-500">
                  <span className="flex items-center gap-0.5"><Zap size={10}/> -{costEnergy}</span>
                  <span className={`flex items-center gap-0.5 ${costMoney > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                      {costMoney > 0 ? `-$${costMoney}` : 'Free'}
                  </span>
              </div>
          </div>
          {subtext && <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{subtext}</div>}
      </button>
  );

  const closeLegacyConfirmation = () => setLegacyCandidate(null);

  return (
    <div className="space-y-6 pb-24 pt-4 relative">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">{activeTab === 'connections' ? 'Connections' : 'Legacy'}</h2>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mt-1">
            {activeTab === 'connections' ? 'Manage family and industry bonds' : 'Track your bloodline generation by generation'}
          </p>
        </div>
        <div className="px-3 py-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-right shrink-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">Dynasty Score</div>
          <div className="text-lg font-black text-white">{dynastyScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-zinc-900/70 border border-zinc-800">
        <button
          onClick={() => setActiveTab('connections')}
          className={`py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'connections' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
        >
          Connections
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'legacy' ? 'bg-amber-500 text-black shadow-lg' : 'text-amber-400 hover:bg-amber-500/10'}`}
        >
          <Crown size={14} /> Legacy
        </button>
      </div>

      {activeTab === 'connections' ? (
        <div className="space-y-8">
          {innerCircle.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Inner Circle</h3>
                  <div className="space-y-3">
                      {innerCircle.map(renderRelationshipCard)}
                  </div>
              </div>
          )}

          {professionalNetwork.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Networking & Connections</h3>
                  <div className="space-y-3">
                      {professionalNetwork.map(renderRelationshipCard)}
                  </div>
              </div>
          )}

          {sortedRelationships.length === 0 && (
              <div className="text-center py-12 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                  <Users className="mx-auto text-zinc-700 mb-2" size={32} />
                  <p className="text-zinc-500 text-sm">No connections yet. Go out and meet people!</p>
              </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Current Generation</div>
              <div className="text-3xl font-black text-white">{currentGeneration}</div>
              <div className="text-sm text-zinc-400 mt-1">{player.name} leads the family right now.</div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Heirs In Line</div>
              <div className="text-3xl font-black text-white">{children.length}</div>
              <div className="text-sm text-zinc-400 mt-1">{children.length > 0 ? 'Your dynasty can continue.' : 'No child heir yet.'}</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),rgba(24,24,27,0.92)_38%,rgba(9,9,11,1)_100%)] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-500 mb-1">Family Tree</div>
                <h3 className="text-2xl font-black text-white">Bloodline Timeline</h3>
              </div>
              <Sparkles className="text-amber-400" size={20} />
            </div>

            {generationRows.map((row, index) => (
              <div key={`${row.generation}-${row.title}`} className="relative">
                {index !== generationRows.length - 1 && (
                  <div className="absolute left-6 top-20 bottom-[-24px] w-px bg-gradient-to-b from-amber-500/50 to-transparent" />
                )}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl border border-amber-500/30 bg-black/40 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                    G{row.generation}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-white">{row.title}</div>
                      <div className="text-xs text-zinc-400">{row.subtitle}</div>
                    </div>
                    <div className="grid gap-3">
                      {row.members.map(member => (
                        <div key={member.id} className="rounded-3xl border border-white/5 bg-black/35 p-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl overflow-hidden border ${member.accent === 'emerald' ? 'border-emerald-500/40' : member.accent === 'amber' ? 'border-amber-500/40' : member.accent === 'blue' ? 'border-blue-500/40' : 'border-zinc-700'}`}>
                              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-bold text-white truncate">{member.name}</div>
                                {typeof member.score === 'number' && (
                                  <div className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Score {member.score}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-zinc-300 mt-1">{member.caption}</div>
                              <div className="text-xs text-zinc-500 mt-1">{member.secondary}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {children.length === 0 && (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <Baby className="mx-auto text-zinc-600 mb-3" size={28} />
              <div className="font-bold text-white">No next generation yet</div>
              <div className="text-sm text-zinc-500 mt-1">Have a child and they will appear here as the next branch of your family empire.</div>
            </div>
          )}
        </div>
      )}

      {selectedContact && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-black w-full max-w-sm h-[85vh] sm:h-auto sm:rounded-3xl border-t sm:border border-zinc-800 overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 relative">
                  <button onClick={() => { setShowDivorceOptions(false); setSelectedContact(null); }} className="absolute top-4 right-4 z-20 p-2 bg-zinc-900/80 rounded-full text-zinc-400 hover:text-white transition-colors backdrop-blur-md"><X size={18} /></button>

                  <div className="relative pt-12 pb-6 px-6 bg-zinc-900 border-b border-zinc-800 flex flex-col items-center shrink-0">
                      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-zinc-700 to-zinc-900 shadow-xl mb-3">
                          <img src={selectedContact.image} className="w-full h-full rounded-full object-cover border-4 border-black" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">{selectedContact.name}</h3>
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">{selectedContact.relation}</div>
                      {(selectedContact.relation === 'Child' || selectedContact.relation === 'Sibling' || selectedContact.relation === 'Parent' || selectedContact.relation === 'Deceased Parent') && (
                        <div className="text-xs text-zinc-400 mb-4">Age {getRelationshipAge(selectedContact, player.age, player.currentWeek)}</div>
                      )}
                      
                      <div className="w-full max-w-[200px] flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Bond</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                               <div className={`h-full rounded-full ${selectedContact.closeness > 80 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${selectedContact.closeness}%` }}/>
                          </div>
                          <span className="text-xs font-mono text-zinc-300">{selectedContact.closeness}</span>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 pb-12 custom-scrollbar bg-black">
                      {(selectedContact.relation === 'Partner' || selectedContact.relation === 'Spouse') && (
                          <div className="mb-6">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-1">Romance</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <ActionCard label="Date Night" icon={Heart} color="bg-pink-500" costMoney={200} costEnergy={20} disabled={player.money < 200 || player.energy.current < 20} onClick={() => handleInteraction('DATE')} />
                                  <ActionCard label="Clubbing" icon={Music} color="bg-purple-500" costMoney={500} costEnergy={40} disabled={player.money < 500 || player.energy.current < 40} onClick={() => handleInteraction('CLUBBING')} />
                                  <ActionCard label="Luxury Trip" icon={Plane} color="bg-blue-500" costMoney={5000} costEnergy={0} subtext="Vacation" disabled={player.money < 5000} onClick={() => handleInteraction('TRIP')} />
                                  <ActionCard label="Intimacy" icon={Flame} color="bg-rose-500" costMoney={0} costEnergy={30} disabled={player.energy.current < 30} onClick={() => handleInteraction('INTIMACY')} />
                              </div>
                              
                              {selectedContact.relation !== 'Spouse' && (
                                  <button
                                      onClick={() => handleInteraction('PROPOSE')}
                                      disabled={player.money < 5000}
                                      className="w-full mt-3 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg opacity-90 hover:opacity-100 disabled:opacity-50"
                                  >
                                      <Gem size={16}/> Propose Marriage <span className="opacity-60 text-xs font-normal">($5k Ring)</span>
                                  </button>
                              )}

                              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-rose-300">Relationship Exit</div>
                                  {selectedContact.relation === 'Partner' ? (
                                      <>
                                          <p className="mb-3 text-xs text-zinc-400">
                                              A breakup can still trigger child support and public fallout if your life together is messy enough.
                                          </p>
                                          <button
                                              onClick={() => handleInteraction('BREAK_UP')}
                                              className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-4 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
                                          >
                                              Break Up
                                          </button>
                                      </>
                                  ) : (
                                      <>
                                          <p className="mb-3 text-xs text-zinc-400">
                                              Divorce can become a full wealth event. Settle quietly or fight in court and risk a brutal split.
                                          </p>
                                          {!showDivorceOptions ? (
                                              <button
                                                  onClick={() => setShowDivorceOptions(true)}
                                                  className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-4 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
                                              >
                                                  Start Divorce
                                              </button>
                                          ) : (
                                              <div className="space-y-3">
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_SETTLE')}
                                                      className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left hover:bg-amber-500/20"
                                                  >
                                                      <div className="text-sm font-bold text-amber-200">Peaceful Settlement</div>
                                                      <div className="mt-1 text-xs text-zinc-400">Lower legal burn, but you still concede cash and ongoing support.</div>
                                                  </button>
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_FIGHT_BUDGET')}
                                                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-left hover:bg-zinc-900"
                                                  >
                                                      <div className="text-sm font-bold text-white">Fight With Budget Lawyer</div>
                                                      <div className="mt-1 text-xs text-zinc-400">Fee: {formatWealth(getDivorceLawyerCost('BUDGET'))} • cheap, volatile, dangerous.</div>
                                                  </button>
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_FIGHT_ESTABLISHED')}
                                                      className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-left hover:bg-blue-500/15"
                                                  >
                                                      <div className="text-sm font-bold text-blue-200">Fight With Established Counsel</div>
                                                      <div className="mt-1 text-xs text-zinc-400">Fee: {formatWealth(getDivorceLawyerCost('ESTABLISHED'))} • balanced protection.</div>
                                                  </button>
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_FIGHT_ELITE')}
                                                      className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15"
                                                  >
                                                      <div className="text-sm font-bold text-emerald-200">Fight With Elite Counsel</div>
                                                      <div className="mt-1 text-xs text-zinc-400">Fee: {formatWealth(getDivorceLawyerCost('ELITE'))} • best odds, still no guarantees.</div>
                                                  </button>
                                                  <button
                                                      onClick={() => setShowDivorceOptions(false)}
                                                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400"
                                                  >
                                                      Cancel
                                                  </button>
                                              </div>
                                          )}
                                      </>
                                  )}
                              </div>
                          </div>
                      )}

                      <div className="mb-6">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-1">Social</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <ActionCard label="Call / Text" icon={Phone} color="bg-blue-500" costMoney={0} costEnergy={5} disabled={player.energy.current < 5} onClick={() => handleInteraction('CALL')} />
                              <ActionCard label="Hang Out" icon={Coffee} color="bg-orange-500" costMoney={getHangoutCost()} costEnergy={15} disabled={player.energy.current < 15 || player.money < getHangoutCost()} onClick={() => handleInteraction('HANGOUT')} />
                              <ActionCard label="Send Gift" icon={Gift} color="bg-purple-500" costMoney={getGiftCost()} costEnergy={0} disabled={player.money < getGiftCost()} onClick={() => handleInteraction('GIFT')} />
                              
                              {['Agent', 'Director', 'Connection', 'Manager', 'Colleague', 'Networking'].includes(selectedContact.relation) ? (
                                  <ActionCard label="Network" icon={Users} color="bg-emerald-500" costMoney={0} costEnergy={25} disabled={player.energy.current < 25} onClick={() => handleInteraction('NETWORK')} />
                              ) : (
                                  <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-zinc-700 text-xs font-bold uppercase tracking-wider">
                                      No Network Action
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="text-center pb-6">
                           <p className="text-[10px] text-zinc-600 font-mono">
                              Last Interaction: {getInteractionAgeInWeeks(selectedContact, player.age, player.currentWeek) === 0 ? 'This Week' : `${getInteractionAgeInWeeks(selectedContact, player.age, player.currentWeek)} weeks ago`}
                           </p>
                      </div>

                      {selectedContact.relation === 'Child' && (
                          <div className="px-4 pb-6">
                              {isChildAbandoned(player, selectedContact.id) ? (
                                  <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs text-rose-200">
                                      You are currently an absent parent here. Weekly child support can still drag you into debt until you rebuild this relationship.
                                  </div>
                              ) : (
                                  <div className="mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center text-xs text-amber-200">
                                      Walking away from this child can trigger custody fallout, scandal news, and weekly support pressure.
                                  </div>
                              )}
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                  <button
                                      onClick={() => handleInteraction(isChildAbandoned(player, selectedContact.id) ? 'RECONNECT_CHILD' : 'ABANDON_CHILD')}
                                      className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                          isChildAbandoned(player, selectedContact.id)
                                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                      }`}
                                  >
                                      {isChildAbandoned(player, selectedContact.id) ? (
                                          <>
                                              <Heart size={16} /> Reconnect
                                          </>
                                      ) : (
                                          <>
                                              <Skull size={16} /> Abandon Child
                                          </>
                                      )}
                                  </button>
                                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-3 py-4 text-center">
                                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
                                      <div className={`mt-1 text-xs font-bold ${isChildAbandoned(player, selectedContact.id) ? 'text-rose-300' : 'text-emerald-300'}`}>
                                          {isChildAbandoned(player, selectedContact.id) ? 'Absent Parent' : 'Active Parent'}
                                      </div>
                                  </div>
                              </div>
                              {getRelationshipAge(selectedContact, player.age, player.currentWeek) < LEGACY_MIN_PLAYABLE_AGE && (
                                  <div className="mb-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-center text-xs text-blue-300">
                                      This heir is still too young. If you continue, the game will safely skip forward until they turn {LEGACY_MIN_PLAYABLE_AGE}.
                                  </div>
                              )}
                              <button
                                  onClick={() => setLegacyCandidate(selectedContact)}
                                  className="w-full py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
                              >
                                  <Crown size={16} /> Continue as Child (Retire)
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {legacyCandidate && (
          <div className="fixed inset-0 z-[220] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-[2rem] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),rgba(24,24,27,0.96)_38%,rgba(9,9,11,1)_100%)] shadow-2xl overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-amber-500/30 bg-black/30">
                              <img src={legacyCandidate.image} alt={legacyCandidate.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                              <div className="text-[10px] uppercase tracking-[0.25em] text-amber-500 mb-1">Legacy Transfer</div>
                              <h3 className="text-xl font-black text-white">Continue as {legacyCandidate.name}?</h3>
                              <div className="text-sm text-zinc-400 mt-1">
                                  Heir age {getRelationshipAge(legacyCandidate, player.age, player.currentWeek)}
                              </div>
                          </div>
                      </div>
                      <button onClick={closeLegacyConfirmation} className="p-2 rounded-full bg-black/30 text-zinc-400 hover:text-white transition-colors">
                          <X size={18} />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      <div className="rounded-2xl border border-amber-500/15 bg-black/25 p-4">
                          <div className="text-sm text-zinc-200 leading-relaxed">
                              You will retire from this generation and place the family empire in your child&apos;s hands.
                          </div>
                          {getRelationshipAge(legacyCandidate, player.age, player.currentWeek) < LEGACY_MIN_PLAYABLE_AGE && (
                              <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
                                  This heir is still young, so the game will safely move time forward until they turn {LEGACY_MIN_PLAYABLE_AGE}.
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Cash After Tax</div>
                              <div className="text-xl font-black text-white">{formatWealth(inheritancePreview.inheritedMoney)}</div>
                              <div className="text-xs text-rose-400 mt-1">
                                  Govt takes {formatWealth(inheritancePreview.moneyTaxPaid)}
                              </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Shares After Tax</div>
                              <div className="text-xl font-black text-white">{inheritancePreview.inheritedShares.toLocaleString()}</div>
                              <div className="text-xs text-rose-400 mt-1">
                                  {inheritancePreview.sharesTaxPaid.toLocaleString()} shares taxed
                              </div>
                          </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 space-y-2">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Transfers Free Of Cost</div>
                          <div className="text-sm text-zinc-200">
                              Cars, homes, luxury items, businesses, and the rest of your empire stay with the family.
                          </div>
                          <div className="text-xs text-zinc-400">
                              {inheritancePreview.untaxedAssetCount} personal assets and {inheritancePreview.businessCount} businesses pass over with no inheritance tax.
                          </div>
                      </div>

                      <div className="text-[11px] text-zinc-500 text-center">
                          Inheritance tax rate: {Math.round(LEGACY_INHERITANCE_TAX_RATE * 100)}% on cash and shares only.
                      </div>
                  </div>

                  <div className="p-6 pt-0 grid grid-cols-2 gap-3">
                      <button
                          onClick={closeLegacyConfirmation}
                          className="py-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 font-bold text-sm hover:bg-zinc-800 transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={() => {
                              onContinueAsChild(legacyCandidate);
                              setLegacyCandidate(null);
                              setSelectedContact(null);
                          }}
                          className="py-3 rounded-2xl bg-amber-500 text-black font-black text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                      >
                          <Crown size={16} /> Confirm Legacy Shift
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
