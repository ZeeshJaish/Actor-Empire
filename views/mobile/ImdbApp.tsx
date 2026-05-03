
// ... existing imports
import React, { useState } from 'react';
import { Player, PastProject, ActiveRelease, CastMember, Review, Award, Universe, UniverseId, IndustryProject, CustomPoster } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { AWARD_CALENDAR, AWARD_SHOW_DB, AwardShowLore, AwardDefinition, Nomination, sanitizeAwardRecords } from '../../services/awardLogic';
import { ArrowLeft, Star, Film, ChevronRight, User, TrendingUp, DollarSign, Eye, Award as AwardIcon, Calendar, BookOpen, Clock, List, MessageSquare, Users, Globe, Zap, LayoutGrid, Shield, ArrowRight, Tv } from 'lucide-react';
import { buildUniverseRoster, getUniverseDashboardProjects } from '../../services/universeLogic';

interface ImdbAppProps {
  player: Player;
  onBack: () => void;
}

// Unified interface for UI display
interface DisplayProject {
    id: string;
    name: string;
    year: number; // or Release Year
    role: string;
    rating: number; // IMDb
    status: 'ACTIVE' | 'ARCHIVED';
    gross?: number;
    budget?: number;
    description?: string;
    cast?: CastMember[];
    reviews?: Review[];
    streamingViews?: number; // New
    awards?: any[]; // New
    originalObject: PastProject | ActiveRelease;
    mediaType: 'MOVIE' | 'SERIES';
    customPoster?: CustomPoster;
}

type Tab = 'PROFILE' | 'FILMOGRAPHY' | 'AWARDS' | 'FRANCHISES' | 'SEASON'; // Added SEASON
type AwardView = 'HOME' | 'CURRENT' | 'MY_AWARDS' | 'SHOW_DETAIL';

interface SelectedShow extends AwardDefinition {
    year: number;
    isCurrent: boolean;
    hasPassed: boolean; // NEW: Explicit flag passed from list
}

const UNIVERSE_THEMES: Record<UniverseId, { color: string, bg: string, icon: any }> = {
    MCU: { color: 'text-red-500', bg: 'bg-red-600', icon: Zap },
    DCU: { color: 'text-blue-500', bg: 'bg-blue-600', icon: Shield }, // Assuming Shield icon imported or generic
    SW: { color: 'text-yellow-400', bg: 'bg-yellow-500', icon: Globe },
};

const getPosterBg = (title: string = '') => {
    const colors = [
        'from-red-950 via-red-900 to-black',
        'from-blue-950 via-blue-900 to-black',
        'from-emerald-950 via-emerald-900 to-black',
        'from-purple-950 via-purple-900 to-black',
        'from-amber-950 via-amber-900 to-black',
        'from-rose-950 via-rose-900 to-black',
        'from-cyan-950 via-cyan-900 to-black',
        'from-indigo-950 via-indigo-900 to-black',
    ];
    const charCode = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCode % colors.length];
};

const getSafeUniversePhaseLabel = (phase: Universe['currentPhase']) => {
    if (typeof phase === 'number') return `Phase ${phase}`;
    if (typeof phase === 'string') {
        const normalized = phase.replace(/_/g, ' ');
        return normalized.replace('PHASE', 'Phase').replace(/\bORIGINS\b/g, 'Origins').replace(/\bEXPANSION\b/g, 'Expansion').replace(/\bWAR\b/g, 'War').replace(/\bMULTIVERSE\b/g, 'Multiverse');
    }
    return 'Phase 1';
};

const getReturnStatusMeta = (status?: 'RETURNING' | 'WRITTEN_OFF' | 'KILLED_OFF') => {
    switch (status) {
        case 'RETURNING':
            return {
                label: 'Returning',
                tone: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300',
                chip: 'bg-emerald-500/15 text-emerald-300'
            };
        case 'WRITTEN_OFF':
            return {
                label: 'Written Off',
                tone: 'border-amber-500/30 bg-amber-950/30 text-amber-200',
                chip: 'bg-amber-500/15 text-amber-200'
            };
        case 'KILLED_OFF':
            return {
                label: 'Killed Off',
                tone: 'border-rose-500/30 bg-rose-950/30 text-rose-200',
                chip: 'bg-rose-500/15 text-rose-200'
            };
        default:
            return null;
    }
};

export const ImdbApp: React.FC<ImdbAppProps> = ({ player, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('PROFILE');
  const [awardView, setAwardView] = useState<AwardView>('HOME');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'MOVIE' | 'TV'>('ALL');
  const [selectedProject, setSelectedProject] = useState<DisplayProject | null>(null);
  const [selectedShow, setSelectedShow] = useState<SelectedShow | null>(null);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);

  // Check for Active Season (Pending Ceremony)
  const pendingCeremony = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY');

  // Helper to calculate weeks until event handling year wrap
  const getWeeksUntil = (targetWeek: number, currentWeek: number) => {
      if (targetWeek >= currentWeek) return targetWeek - currentWeek;
      return (52 - currentWeek) + targetWeek;
  };

  // --- DATA TRANSFORMATION ---
  const activeList: DisplayProject[] = player.activeReleases.map(r => ({
      id: r.id, name: r.name, year: player.age, role: r.roleType, rating: r.imdbRating || 0, status: 'ACTIVE' as const,
      gross: r.totalGross, budget: r.budget, description: r.projectDetails.description, cast: r.projectDetails.castList,
      reviews: r.projectDetails.reviews, streamingViews: r.streaming?.totalViews, originalObject: r,
      mediaType: r.type, customPoster: r.projectDetails.customPoster
  }));

  const pastList: DisplayProject[] = player.pastProjects.map(p => ({
      id: p.id, name: p.name, year: p.year, role: p.roleType || 'Role', rating: p.imdbRating || 0, status: 'ARCHIVED' as const,
      gross: p.gross, budget: p.budget, description: p.description, cast: p.castList, reviews: p.reviews, streamingViews: p.totalViews, awards: p.awards, originalObject: p,
      mediaType: p.projectType || 'MOVIE', customPoster: p.customPoster
  })).reverse();

  const fullList = [...activeList, ...pastList];
  
  // Calculate Average Rating
  const ratedProjects = fullList.filter(p => p.rating > 0);
  const avgRating = ratedProjects.length > 0 ? ratedProjects.reduce((acc, p) => acc + p.rating, 0) / ratedProjects.length : 0;

  const knownFor = [...fullList].filter(p => p.role === 'LEAD' || p.role === 'SUPPORTING').sort((a, b) => b.rating - a.rating)[0] || fullList[0];
  const totalBoxOffice = fullList.reduce((acc, p) => acc + (p.gross || 0), 0);
  const imdbRank = Math.max(1, Math.round(101 - Math.min(100, Math.max(0, player.stats.fame || 0))));
  const cleanedAwards: Award[] = sanitizeAwardRecords(player.awards || []);
  const awardsWon = cleanedAwards.filter(a => a.outcome === 'WON');
  const awardsNom = cleanedAwards.filter(a => a.outcome === 'NOMINATED');

  const filteredCredits = fullList.filter(p => {
      if (creditFilter === 'ALL') return true;
      if (creditFilter === 'MOVIE') return p.mediaType === 'MOVIE';
      if (creditFilter === 'TV') return p.mediaType === 'SERIES';
      return true;
  });


  const formatViews = (val?: number) => {
      if (!val) return '0';
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      return `${(val / 1000).toFixed(0)}k`;
  }

  const getCriticLabel = (score: number) => {
      if (score >= 9.0) return { label: "Cinema Legend", color: "text-amber-400" };
      if (score >= 8.0) return { label: "Critical Darling", color: "text-emerald-400" };
      if (score >= 6.0) return { label: "Reliable Star", color: "text-blue-400" };
      if (score >= 4.0) return { label: "Hit or Miss", color: "text-zinc-400" };
      return { label: "Box Office Poison", color: "text-rose-500" };
  };

  const criticStatus = getCriticLabel(avgRating);

  // --- RENDERERS ---

  const renderCurrentSeason = () => {
      if (!pendingCeremony || !pendingCeremony.data || !pendingCeremony.data.fullBallot) {
          return (
              <div className="text-center py-12 text-zinc-500">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="font-bold">No Active Season</div>
                  <div className="text-xs mt-1">Wait for nominations to be announced.</div>
                  <button onClick={() => setActiveTab('AWARDS')} className="mt-4 text-amber-400 text-xs font-bold">View History</button>
              </div>
          );
      }

      const ballot = pendingCeremony.data.fullBallot as Record<string, Nomination[]>;
      const weeksAway = getWeeksUntil(pendingCeremony.week, player.currentWeek);

      return (
          <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setActiveTab('AWARDS')}><ArrowLeft size={16} className="text-zinc-500"/></button>
                  <h2 className="text-xl font-bold text-white">Current Nominations</h2>
              </div>
              
              <div className="bg-gradient-to-br from-zinc-900 to-black p-4 rounded-xl border border-zinc-800 mb-6 text-center">
                  <h3 className="font-serif font-black text-2xl text-amber-400 mb-1">{pendingCeremony.title}</h3>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                      {weeksAway === 0 ? "Live Today!" : `Live in ${weeksAway} Weeks`}
                  </div>
              </div>

              {Object.entries(ballot).map(([category, nominees]) => {
                  const isProjectAward = category.includes('Picture') || category.includes('Series') || category.includes('Musical') || category.includes('Film');
                  // Project awards are when the PROJECT ITSELF is the nominee (e.g. Best Picture)
                  // Actor awards are when a PERSON is the nominee
                  const reallyProjectAward = isProjectAward && !category.includes('Actor') && !category.includes('Actress') && !category.includes('Director');

                  return (
                    <div key={category} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="bg-zinc-800/50 p-3 border-b border-zinc-800">
                            <div className="font-bold text-sm text-zinc-200">{category}</div>
                        </div>
                        <div className="divide-y divide-zinc-800">
                            {nominees.map((nom) => (
                                <div key={`${nom.project.id}-${nom.nomineeName || 'player'}`} className={`p-3 flex justify-between items-center ${nom.isPlayer ? 'bg-amber-900/20' : ''}`}>
                                    <div>
                                        {/* TOP LINE: The "Winner" Name (Project Title OR Person Name) */}
                                        <div className={`text-sm ${reallyProjectAward ? 'font-bold italic text-zinc-200' : (nom.isPlayer ? 'font-bold text-amber-400' : 'font-bold text-zinc-300')}`}>
                                            {reallyProjectAward ? nom.project.name : (nom.isPlayer ? player.name : nom.nomineeName)}
                                        </div>
                                        {/* BOTTOM LINE: Context (Producers OR Project Title) */}
                                        <div className="text-[10px] text-zinc-500">
                                            {reallyProjectAward ? 'Producers' : nom.project.name}
                                        </div>
                                    </div>
                                    {nom.isPlayer && <div className="text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold uppercase">You</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                  );
              })}
          </div>
      );
  };

  const renderShowDetail = () => {
      if (!selectedShow) return null;
      
      const lore = AWARD_SHOW_DB[selectedShow.type as keyof typeof AWARD_SHOW_DB];
      const playerResults = player.awards.filter(a => a.type === selectedShow.type && a.year === selectedShow.year);
      // Use the passed flag or fallback to history presence
      const historyEntry = player.world.awardHistory?.find(h => h.year === selectedShow.year && h.type === selectedShow.type);
      
      const isCompleted = selectedShow.hasPassed || !!historyEntry;
      
      const pendingEvent = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY' && e.title === selectedShow.name);
      const ballot = (pendingEvent && pendingEvent.data && pendingEvent.data.fullBallot) ? (pendingEvent.data.fullBallot as Record<string, Nomination[]>) : null;

      return (
          <div className="space-y-6">
              <button onClick={() => setAwardView('HOME')} className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 hover:text-white">
                  <ArrowLeft size={12}/> Back to Awards
              </button>

              <div className="text-center pb-6 border-b border-zinc-800">
                  <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-3 ${lore.color} bg-white/5`}>
                      {lore.focus} Event
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-white mb-1">{selectedShow.name}</h2>
                  <div className="text-sm text-zinc-500 font-mono">{selectedShow.year} Edition</div>
                  {!isCompleted && ballot && <div className="text-[10px] text-amber-500 mt-2 animate-pulse font-bold uppercase tracking-widest">Nominations Revealed</div>}
              </div>

              <div className="space-y-4">
                  {lore.categories.map((cat) => {
                      const playerResult = playerResults.find(r => r.category === cat);
                      const actualWinner = historyEntry?.winners.find(w => w.category === cat);
                      const pendingNominees = ballot ? ballot[cat] : [];
                      
                      const isProjectAward = cat.includes('Picture') || cat.includes('Series') || cat.includes('Musical') || cat.includes('Film');
                      const reallyProjectAward = isProjectAward && !cat.includes('Actor') && !cat.includes('Actress') && !cat.includes('Director');

                      return (
                          <div key={cat} className={`rounded-xl border overflow-hidden ${playerResult ? (playerResult.outcome === 'WON' ? 'bg-amber-900/10 border-amber-500/50' : 'bg-zinc-800 border-zinc-700') : 'bg-zinc-900 border-zinc-800'}`}>
                              <div className="p-4 border-b border-zinc-800/50">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{cat}</div>
                              </div>
                              
                              {isCompleted ? (
                                  <div className="p-4 flex items-center gap-3">
                                      {actualWinner ? (
                                          <>
                                              <AwardIcon size={20} className={actualWinner.isPlayer ? "text-amber-400 fill-amber-400" : "text-zinc-600"}/>
                                              <div>
                                                  <div className={`font-bold text-sm ${actualWinner.isPlayer ? 'text-white' : 'text-zinc-300'}`}>
                                                      {reallyProjectAward ? actualWinner.projectName : actualWinner.winnerName}
                                                      {!reallyProjectAward && <span className="text-zinc-500 font-normal"> - {actualWinner.projectName}</span>}
                                                  </div>
                                                  <div className="text-[10px] text-zinc-500">Winner</div>
                                              </div>
                                          </>
                                      ) : (
                                          <div className="text-xs text-zinc-600 italic">Winners archived.</div>
                                      )}
                                  </div>
                              ) : (
                                  <div>
                                      {pendingNominees && pendingNominees.length > 0 ? (
                                          <div className="divide-y divide-zinc-800/50">
                                              {pendingNominees.map((nom) => (
                                                  <div key={`${nom.project.id}-${nom.nomineeName || 'player'}`} className={`p-3 flex justify-between items-center ${nom.isPlayer ? 'bg-amber-500/10' : ''}`}>
                                                      <div className="text-xs">
                                                          <span className={reallyProjectAward ? 'font-bold italic text-zinc-200' : (nom.isPlayer ? 'text-amber-200 font-bold' : 'text-zinc-300')}>
                                                              {reallyProjectAward ? nom.project.name : (nom.isPlayer ? player.name : nom.nomineeName)}
                                                          </span>
                                                          <span className="text-zinc-500 ml-2 italic">{reallyProjectAward ? 'Producers' : nom.project.name}</span>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <div className="p-4 text-xs text-zinc-600 italic">Nominations pending...</div>
                                      )}
                                  </div>
                              )}

                              {playerResult && playerResult.outcome === 'NOMINATED' && !playerResult.outcome.includes('WON') && isCompleted && (
                                  <div className="p-3 bg-white/5 text-xs text-zinc-400 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div> You were nominated
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderAwardsHome = () => (
      <div className="space-y-6">
          <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs border-l-2 border-yellow-400 pl-2">Current Season</h3>
              
              {pendingCeremony && (
                  <div onClick={() => setActiveTab('SEASON')} className="bg-gradient-to-r from-amber-900/40 to-black p-4 rounded-xl border border-amber-500/30 flex items-center justify-between cursor-pointer mb-4">
                      <div>
                          <div className="font-bold text-amber-400 text-sm flex items-center gap-2"><AwardIcon size={14} fill="currentColor"/> {pendingCeremony.title}</div>
                          <div className="text-[10px] text-zinc-400">
                              Nominations Announced • Ceremony in {getWeeksUntil(pendingCeremony.week, player.currentWeek)} wks
                          </div>
                      </div>
                      <ChevronRight size={16} className="text-amber-400"/>
                  </div>
              )}

              <div className="space-y-2">
                  {Object.entries(AWARD_CALENDAR).map(([weekStr, def]) => {
                      const ceremonyWeek = parseInt(weekStr);
                      const isPending = pendingCeremony && pendingCeremony.title === def.name;
                      
                      // Robust check for passed events, handling year wrap
                      const isWrapAround = def.inviteWeek > ceremonyWeek; 
                      let hasPassed = false;
                      
                      if (isWrapAround) {
                          // e.g. GG (Invite 50, Ceremony 2)
                          // Passed if we are between Wk 3 and Wk 49 (inclusive-ish)
                          if (player.currentWeek > ceremonyWeek && player.currentWeek <= def.inviteWeek) {
                              hasPassed = true;
                          }
                      } else {
                          // e.g. Oscars (Invite 6, Ceremony 10)
                          // Passed if we are > 10 (until reset at year end)
                          if (player.currentWeek > ceremonyWeek) {
                              hasPassed = true;
                          }
                      }
                      
                      return (
                          <div key={def.type} onClick={() => { setSelectedShow({ ...def, year: player.age, isCurrent: true, hasPassed }); setAwardView('SHOW_DETAIL'); }} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between active:bg-zinc-800 transition-colors">
                              <div>
                                  <div className="font-bold text-white text-sm">{def.name}</div>
                                  <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${isPending ? 'text-amber-400' : hasPassed ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                      {isPending ? 'Ceremony Pending' : hasPassed ? 'Completed' : `Upcoming (Wk ${ceremonyWeek})`}
                                  </div>
                              </div>
                              <ChevronRight size={16} className="text-zinc-600"/>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white text-lg">My Awards</h3>
                  <button onClick={() => setAwardView('MY_AWARDS')} className="text-xs text-blue-400 font-bold">View All</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 text-center">
                      <div className="text-2xl font-mono font-bold text-amber-400">{awardsWon.length}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Wins</div>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 text-center">
                      <div className="text-2xl font-mono font-bold text-zinc-400">{awardsWon.length + awardsNom.length}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Nominations</div>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderMyAwards = () => {
      const grouped: Record<string, Award[]> = {};
      cleanedAwards.forEach(a => {
          if (!grouped[a.name]) grouped[a.name] = [];
          grouped[a.name].push(a);
      });

      return (
          <div className="space-y-6">
              <button onClick={() => setAwardView('HOME')} className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 hover:text-white">
                  <ArrowLeft size={12}/> Back
              </button>
              <h2 className="text-2xl font-bold text-white mb-4">Career Achievements</h2>
              
              {Object.keys(grouped).length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">No awards yet. Keep working!</div>
              ) : (
                  Object.entries(grouped).map(([showName, awards]) => (
                      <div key={showName} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                          <h3 className="font-bold text-white border-b border-zinc-800 pb-2 mb-3">{showName}</h3>
                          <div className="space-y-3">
                              {awards.map(award => (
                                  <div key={award.id} className="flex items-start gap-3">
                                      <div className={`mt-0.5 ${award.outcome === 'WON' ? 'text-amber-400' : 'text-zinc-500'}`}>
                                          <AwardIcon size={16} fill={award.outcome === 'WON' ? 'currentColor' : 'none'}/>
                                      </div>
                                      <div>
                                          <div className={`text-sm font-bold ${award.outcome === 'WON' ? 'text-white' : 'text-zinc-400'}`}>
                                              {award.category}
                                          </div>
                                          <div className="text-xs text-zinc-500">
                                              {award.projectName} • Year {award.year}
                                          </div>
                                      </div>
                                      {award.outcome === 'WON' && <div className="ml-auto text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded uppercase">Won</div>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))
              )}
          </div>
      );
  };

  const renderFranchiseList = () => {
      const universes = Object.values(player.world.universes || {}) as Universe[];
      
      const allUniverses = [...universes].sort((a, b) => (b.brandPower || 0) - (a.brandPower || 0));

      return (
          <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4 px-1">Cinematic Universes</h2>
              {allUniverses.map(uni => {
                  const theme = UNIVERSE_THEMES[uni.id] || { color: 'text-zinc-400', bg: 'bg-zinc-700', icon: Film };
                  const Icon = theme.icon;
                  return (
                      <div key={uni.id} onClick={() => setSelectedUniverse(uni)} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 relative group cursor-pointer">
                          <div className={`h-24 ${theme.bg} opacity-20 relative`}><div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div></div>
                          <div className="p-5 relative -mt-10">
                              <div className={`w-14 h-14 rounded-xl ${theme.bg} flex items-center justify-center shadow-lg mb-3 text-white`}><Icon size={28} /></div>
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{uni.name}</h3>
                                      <div className={`text-[10px] font-bold uppercase tracking-widest ${theme.color}`}>
                                          {uni.currentPhaseName || 'N/A'}
                                      </div>
                                  </div>
                                  <div className="bg-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400 border border-zinc-700">
                                      {uni.currentSagaName || 'N/A'}
                                  </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center"><div className="text-xs text-zinc-500"><span className="text-white font-bold">{uni.roster.length}</span> Active Heroes</div><div className="flex items-center gap-1 text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">View Dossier <ArrowRight size={14}/></div></div>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderUniverseDetail = () => {
      if (!selectedUniverse) return null;
      const theme = UNIVERSE_THEMES[selectedUniverse.id] || { color: 'text-white', bg: 'bg-zinc-700', icon: Globe };
      const worldMovies = (player.world?.projects || []).filter(p => p?.universeId === selectedUniverse.id);
      const playerPastMovies = (player.pastProjects || []).filter(p => p?.universeId === selectedUniverse.id);
      const playerActiveMovies = (player.activeReleases || []).filter(p => p?.projectDetails?.universeId === selectedUniverse.id);
      const playerUniverseProjects = getUniverseDashboardProjects(player, selectedUniverse.id, player.activeReleases);
      const normalizedRoster = buildUniverseRoster(selectedUniverse, playerUniverseProjects, player.name);

      const recentMovies = [
          ...worldMovies.map(m => ({ id: m.id, title: m.title, year: m.year, genre: m.genre, boxOffice: m.boxOffice, isPlayer: false })),
          ...playerPastMovies.map(m => ({ id: m.id, title: m.name, year: m.year, genre: m.genre, boxOffice: m.gross, isPlayer: true })),
          ...playerActiveMovies.map(m => ({ id: m.id, title: m.name, year: player.age, genre: m.projectDetails.genre, boxOffice: m.totalGross, isPlayer: true }))
      ].sort((a, b) => b.year - a.year).slice(0, 10);

      return (
          <div className="space-y-6 pb-20">
              <div className="flex items-center justify-between mb-2"><button onClick={() => setSelectedUniverse(null)} className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider hover:text-white"><ArrowLeft size={12}/> All Franchises</button></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bg}`}></div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-1">{selectedUniverse.name}</h2>
                  <div className={`text-xs font-bold uppercase tracking-widest ${theme.color} mb-6`}>{getSafeUniversePhaseLabel(selectedUniverse.currentPhase)}</div>
                  <div className="grid grid-cols-2 gap-4"><div className="bg-black/40 p-3 rounded-xl border border-zinc-800"><div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Momentum</div><div className="text-xl font-mono font-bold text-white">{selectedUniverse.momentum}/100</div></div><div className="bg-black/40 p-3 rounded-xl border border-zinc-800"><div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Next Phase</div><div className="text-xl font-mono font-bold text-zinc-400">{Math.ceil(selectedUniverse.weeksUntilNextPhase || 0)}w</div></div></div>
              </div>
              <div><h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 pl-2">Active Roster</h3><div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">{normalizedRoster.map((char) => (<div key={char.id || char.name} className="p-4 flex justify-between items-center"><div><div className="font-bold text-white text-sm">{char.name}</div><div className="text-xs text-zinc-500">Played by <span className={char.actorId === player.id || char.actorId === 'PLAYER_SELF' ? 'text-amber-400 font-bold' : 'text-zinc-300'}>{char.actorId === player.id || char.actorId === 'PLAYER_SELF' ? 'YOU' : char.actorName}</span></div></div><div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${char.status === 'ACTIVE' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>{char.status}</div></div>))}</div></div>
              <div><h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 pl-2">Recent Releases</h3><div className="space-y-3">{recentMovies.length === 0 ? (<div className="text-center py-8 text-zinc-600 text-xs italic">No recent releases recorded.</div>) : (recentMovies.map(movie => (<div key={movie.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center"><div><div className="font-bold text-white text-sm flex items-center gap-2">{movie.title} {movie.isPlayer && <span className="bg-amber-500/20 text-amber-500 text-[8px] px-1 rounded">YOU</span>}</div><div className="text-xs text-zinc-500">{movie.year} • {movie.genre}</div></div><div className={`font-mono text-xs font-bold ${movie.boxOffice > 500000000 ? 'text-emerald-400' : 'text-zinc-400'}`}>${(movie.boxOffice / 1000000).toFixed(0)}M</div></div>)))}</div></div>
          </div>
      );
  };

  // --- MAIN APP STRUCTURE ---
  if (selectedProject) {
    const futurePotential = (selectedProject.originalObject as ActiveRelease | PastProject).futurePotential;
    const returnStatusMeta = getReturnStatusMeta(futurePotential?.playerReturnStatus);
     return (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col z-50 text-white animate-in slide-in-from-right duration-300">
            <div className="bg-zinc-900 p-4 pt-12 pb-3 shadow-lg flex items-center gap-3 border-b border-zinc-800">
                <button onClick={() => setSelectedProject(null)} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
                <div className="flex-1 truncate font-bold text-lg">{selectedProject.name}</div>
                <div className="bg-yellow-400 text-black px-2 py-1 rounded font-black text-xs">IMDb</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Hero Section */}
                {(() => {
                    const customPoster = selectedProject.customPoster;
                    if (customPoster?.type === 'IMAGE' && customPoster.imageData) {
                        return (
                            <div className="relative h-48 bg-zinc-900 overflow-hidden">
                                <img src={customPoster.imageData} alt={selectedProject.name} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-10">
                                    <h1 className="text-2xl font-bold leading-tight mb-1">{selectedProject.name}</h1>
                                    <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                                        <span>{selectedProject.year}</span>
                                        <span>•</span>
                                        <span className="bg-zinc-800 border border-zinc-700 px-1.5 rounded text-[10px]">PG-13</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            {selectedProject.mediaType === 'SERIES' ? <Tv size={10}/> : <Film size={10}/>}
                                            {selectedProject.mediaType === 'SERIES' ? 'TV Series' : 'Movie'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Star size={20} className="text-yellow-400 fill-yellow-400" />
                                            <span className="text-xl font-bold text-white">{selectedProject.rating > 0 ? selectedProject.rating.toFixed(1) : 'TBD'}</span>
                                            <span className="text-xs text-zinc-500">/10</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    
                    const bgClass = customPoster?.type === 'CONFIG' && customPoster.bgGradient ? customPoster.bgGradient : getPosterBg(selectedProject.name);
                    const textColor = customPoster?.type === 'CONFIG' && customPoster.textColor ? customPoster.textColor : 'text-white';
                    
                    return (
                        <div className={`relative h-48 bg-gradient-to-br ${bgClass} overflow-hidden`}>
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <div className={`text-center font-serif font-black ${textColor} opacity-20 text-5xl leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay`}>
                                    {selectedProject.name}
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-10">
                                <h1 className="text-2xl font-bold leading-tight mb-1">{selectedProject.name}</h1>
                                <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                                    <span>{selectedProject.year}</span>
                                    <span>•</span>
                                    <span className="bg-zinc-800 border border-zinc-700 px-1.5 rounded text-[10px]">PG-13</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        {selectedProject.mediaType === 'SERIES' ? <Tv size={10}/> : <Film size={10}/>}
                                        {selectedProject.mediaType === 'SERIES' ? 'TV Series' : 'Movie'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <Star size={20} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-xl font-bold text-white">{selectedProject.rating > 0 ? selectedProject.rating.toFixed(1) : 'TBD'}</span>
                                        <span className="text-xs text-zinc-500">/10</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Awards Banner */}
                {selectedProject.awards && selectedProject.awards.length > 0 && (
                    <div className="bg-amber-900/20 border-y border-amber-500/20 p-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
                        {selectedProject.awards.map((award: any) => (
                            <div key={award.id} className="flex items-center gap-1.5 shrink-0 bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
                                <AwardIcon size={12} className="text-amber-400"/>
                                <div className="text-xs">
                                    <span className="text-amber-200 font-bold">{award.outcome === 'WON' ? 'Winner' : 'Nominee'}</span>
                                    <span className="text-amber-500/50 mx-1">•</span>
                                    <span className="text-zinc-300">{award.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Plot */}
                <div className="p-4 border-b border-zinc-800">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        {selectedProject.description || "A captivating story about ambition, betrayal, and the cost of dreams in a world that never sleeps."}
                    </p>
                </div>

                {returnStatusMeta && (
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
                        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                            <Clock size={16} className="text-zinc-400"/> Franchise Status
                        </h3>
                        <div className={`rounded-2xl border p-4 ${returnStatusMeta.tone}`}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-400">
                                    {selectedProject.mediaType === 'SERIES' ? 'Season Outcome' : 'Sequel Outcome'}
                                </div>
                                <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${returnStatusMeta.chip}`}>
                                    {returnStatusMeta.label}
                                </div>
                            </div>
                            <div className="text-sm leading-relaxed">
                                {futurePotential?.returnStatusNote || (
                                    futurePotential?.playerReturnStatus === 'RETURNING'
                                        ? 'You are attached to the continuation.'
                                        : futurePotential?.playerReturnStatus === 'KILLED_OFF'
                                            ? 'The story continues after your character is killed off.'
                                            : 'The story continues without your character.'
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Cast */}
                {selectedProject.cast && selectedProject.cast.length > 0 && (
                    <div className="p-4 border-b border-zinc-800">
                        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                            <Users size={16} className="text-zinc-400"/> Top Cast
                        </h3>
                        <div className="space-y-3">
                            {selectedProject.cast.slice(0, 5).map(member => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={member.image} className="w-10 h-10 rounded-full object-cover border border-zinc-700 bg-zinc-800"/>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200">{member.name}</div>
                                            <div className="text-xs text-zinc-500">{member.role}</div>
                                        </div>
                                    </div>
                                    {member.isPlayer && <div className="text-[9px] font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">YOU</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Box Office / Stats */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/> Box Office & Tech Specs</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div><div className="text-zinc-500 text-xs">Budget</div><div className="text-zinc-300 font-mono">{formatMoney(selectedProject.budget)}</div></div>
                        <div><div className="text-zinc-500 text-xs">Gross Worldwide</div><div className={`font-mono font-bold ${(selectedProject.gross || 0) > (selectedProject.budget || 0) ? 'text-emerald-400' : 'text-zinc-300'}`}>{formatMoney(selectedProject.gross)}</div></div>
                        {selectedProject.streamingViews && (<div><div className="text-zinc-500 text-xs">Streaming Views</div><div className="text-indigo-400 font-mono font-bold">{formatViews(selectedProject.streamingViews)}</div></div>)}
                    </div>
                </div>

                {/* Reviews */}
                {selectedProject.reviews && selectedProject.reviews.length > 0 && (
                    <div className="p-4 space-y-4 pb-20">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <MessageSquare size={16} className="text-blue-400"/> Critic Reviews
                        </h3>
                        <div className="space-y-3">
                            {selectedProject.reviews.map((review) => (
                                <div key={review.id} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                review.sentiment === 'POSITIVE' ? 'bg-emerald-900/30 text-emerald-400' : 
                                                review.sentiment === 'NEGATIVE' ? 'bg-rose-900/30 text-rose-400' : 'bg-yellow-900/30 text-yellow-400'
                                            }`}>
                                                {review.sentiment}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">{review.publication}</span>
                                        </div>
                                        {review.rating && <div className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Star size={10} className="fill-zinc-400"/> {review.rating}/5</div>}
                                    </div>
                                    <p className="text-sm text-zinc-300 italic leading-relaxed">"{review.text}"</p>
                                    <div className="text-[10px] text-zinc-600 mt-2 text-right font-serif">- {review.author}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
     );
  }

  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300">
        <div className="bg-yellow-400 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 text-black">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10"><ArrowLeft size={20}/></button>
            <div className="font-black tracking-tighter text-xl bg-black text-yellow-400 px-2 rounded">IMDb</div>
            <div className="w-8"></div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
             
             {/* PROFILE TAB */}
             {activeTab === 'PROFILE' && (
                 <>
                    <div className="p-6 bg-zinc-800 border-b border-zinc-700">
                        <div className="flex gap-4">
                            <div className="relative">
                                <img src={player.avatar} className="w-20 h-20 rounded-full object-cover border-2 border-yellow-400" />
                                <div className="absolute -bottom-2 -right-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-700">#{imdbRank}</div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{player.name}</h2>
                                <div className="text-sm text-zinc-400">Actor | Producer</div>
                                {knownFor && <div className="text-xs text-zinc-500 mt-2">Known for <span className="text-zinc-300 font-medium">{knownFor.name}</span></div>}
                            </div>
                        </div>
                        {/* Awards & Score Dashboard */}
                        <div className="grid grid-cols-3 gap-2 mt-6">
                            <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-700/50 text-center">
                                <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Total Gross</div>
                                <div className="font-mono text-emerald-400 font-bold text-sm truncate">{formatMoney(totalBoxOffice)}</div>
                            </div>
                            <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-700/50 text-center">
                                <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Critic Score</div>
                                <div className={`font-mono font-bold text-lg ${avgRating > 0 ? criticStatus.color : 'text-zinc-500'}`}>
                                    {avgRating > 0 ? avgRating.toFixed(1) : '-'}
                                </div>
                                {avgRating > 0 && <div className={`text-[8px] font-bold ${criticStatus.color} mt-0.5 truncate`}>{criticStatus.label}</div>}
                            </div>
                            <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-700/50 text-center" onClick={() => setActiveTab('AWARDS')}>
                                <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Awards</div>
                                <div className="flex items-center justify-center gap-1 font-bold text-lg text-amber-400">
                                    <AwardIcon size={14} fill="currentColor"/> {awardsWon.length}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Bio / Mini-Filmography */}
                    <div className="p-4">
                        <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs mb-3">Bio</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-6">A rising star in Hollywood known for their versatility and recent breakout performances.</p>
                    </div>
                 </>
             )}

             {/* FILMOGRAPHY TAB */}
             {activeTab === 'FILMOGRAPHY' && (
                 <div className="p-4">
                     <div className="flex items-center justify-between mb-4">
                         <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                            Filmography <span className="bg-zinc-700 text-white px-1.5 py-0.5 rounded-full text-[10px]">{filteredCredits.length}</span>
                         </h3>
                         {/* FILTER PILLS */}
                         <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-700">
                             {(['ALL', 'MOVIE', 'TV'] as const).map(type => (
                                 <button 
                                    key={type}
                                    onClick={() => setCreditFilter(type)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${creditFilter === type ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                 >
                                     {type === 'ALL' ? 'All' : type === 'MOVIE' ? 'Movies' : 'TV'}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="divide-y divide-zinc-800 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                         {filteredCredits.length === 0 ? <div className="text-zinc-600 text-center py-8 text-sm">No credits found.</div> : filteredCredits.map((project) => (
                             <div key={project.id} onClick={() => setSelectedProject(project)} className="flex gap-4 p-4 hover:bg-zinc-800 transition-colors cursor-pointer group">
                                 {project.customPoster?.type === 'IMAGE' && project.customPoster.imageData ? (
                                     <div className={`w-12 h-16 rounded shrink-0 flex items-center justify-center border-2 relative overflow-hidden ${project.mediaType === 'MOVIE' ? 'border-blue-500/60' : project.mediaType === 'SERIES' ? 'border-red-500/60' : 'border-zinc-700'}`}>
                                         <img src={project.customPoster.imageData} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
                                     </div>
                                 ) : (
                                     <div className={`w-12 h-16 rounded shrink-0 flex items-center justify-center border-2 relative overflow-hidden bg-gradient-to-br ${project.customPoster?.type === 'CONFIG' && project.customPoster.bgGradient ? project.customPoster.bgGradient : getPosterBg(project.name)} ${project.mediaType === 'MOVIE' ? 'border-blue-500/60' : project.mediaType === 'SERIES' ? 'border-red-500/60' : 'border-zinc-700'}`}>
                                         <div className="absolute inset-0 flex items-center justify-center p-1">
                                             {project.customPoster?.type === 'CONFIG' && project.customPoster.icon === 'Film' && <Film size={12} className="absolute text-white/10" />}
                                             {project.customPoster?.type === 'CONFIG' && project.customPoster.icon === 'Tv' && <Tv size={12} className="absolute text-white/10" />}
                                             {project.customPoster?.type === 'CONFIG' && project.customPoster.icon === 'Star' && <Star size={12} className="absolute text-white/10" />}
                                             <div className={`text-center font-serif font-black ${project.customPoster?.type === 'CONFIG' && project.customPoster.textColor ? project.customPoster.textColor : 'text-white/30'} text-[8px] leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay relative z-10`}>
                                                 {project.name}
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                     <div className="font-bold text-base text-zinc-100 truncate">{project.name}</div>
                                     <div className="text-xs text-zinc-500 mb-1">{project.year} • {project.role}</div>
                                     <div className="flex items-center gap-3 mt-1.5">
                                         {project.rating > 0 && <span className="flex items-center gap-1 text-zinc-200 text-xs font-bold"><Star size={10} className="text-yellow-400 fill-yellow-400"/> {project.rating.toFixed(1)}</span>}
                                         <span className="text-[10px] text-zinc-600 font-bold uppercase border border-zinc-700 px-1.5 rounded">{project.mediaType === 'SERIES' ? 'TV' : 'Movie'}</span>
                                     </div>
                                 </div>
                                 <ChevronRight size={16} className="text-zinc-600"/>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* AWARDS TAB (NEW) */}
             {activeTab === 'AWARDS' && (
                 <div className="p-4">
                     {awardView === 'HOME' && renderAwardsHome()}
                     {awardView === 'SHOW_DETAIL' && renderShowDetail()}
                     {awardView === 'MY_AWARDS' && renderMyAwards()}
                 </div>
             )}
            
            {/* SEASON TAB (NEW) */}
            {activeTab === 'SEASON' && (
                 <div className="p-4">
                     {renderCurrentSeason()}
                 </div>
             )}

             {/* FRANCHISES TAB */}
             {activeTab === 'FRANCHISES' && (
                 <div className="p-4">
                     {!selectedUniverse ? renderFranchiseList() : renderUniverseDetail()}
                 </div>
             )}

        </div>

        {/* --- BOTTOM TAB BAR --- */}
        <div className="flex border-t border-zinc-800 bg-zinc-950 pb-safe">
            <button onClick={() => setActiveTab('PROFILE')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'PROFILE' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <User size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Profile</span>
            </button>
            <button onClick={() => setActiveTab('FILMOGRAPHY')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'FILMOGRAPHY' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Film size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Credits</span>
            </button>
            <button onClick={() => setActiveTab('AWARDS')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'AWARDS' || activeTab === 'SEASON' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <AwardIcon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Awards</span>
            </button>
            <button onClick={() => setActiveTab('FRANCHISES')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'FRANCHISES' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Globe size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Universe</span>
            </button>
        </div>
    </div>
  );
};
