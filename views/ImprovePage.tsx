
import React, { useState } from 'react';
import { Player, Commitment, ActorSkills, Stats, Genre, ImprovementActivity, ImprovementOption, WriterStats, DirectorStats } from '../types';
import { WORKSHOP_CATALOG, IMPROVEMENT_CATALOG, ImproveCategory, GENRE_TRAINING_CATALOG } from '../services/lifestyleLogic';
import { rewardGenreExperience, calculateGlobalTalent } from '../services/roleLogic';
import { Dumbbell, BookOpen, Brain, Drama, Check, ChevronDown, ChevronUp, Zap, DollarSign, Activity, Smile, Heart, Lock, Sparkles, HeartPulse, X, Clapperboard, Monitor, Skull, Ghost, Sword, Rocket, Map, Shield, Mic, Camera, FlaskConical, Award, Users } from 'lucide-react';

interface ImprovePageProps {
  player: Player;
  onTrain: (stat: string, cost: number, gain: number) => void;
  onEnroll: (commitment: Commitment) => void;
  onCancel: (id: string) => void;
  onPerformAction?: (category: string, activityName: string, option: ImprovementOption) => void;
}

export const ImprovePage: React.FC<ImprovePageProps> = ({ player, onEnroll, onCancel, onTrain, onPerformAction }) => {
  const [isTalentExpanded, setIsTalentExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'WELLBEING' | 'WORKSHOPS' | 'GENRE'>('WELLBEING');
  const [workshopFilter, setWorkshopFilter] = useState<'ALL' | 'ACTING' | 'WRITING' | 'DIRECTING'>('ALL');
  
  // Wellbeing State
  const [selectedCategory, setSelectedCategory] = useState<ImproveCategory>('BODY');
  const [selectedActivity, setSelectedActivity] = useState<ImprovementActivity | null>(null);

  const renderSkillBar = (label: string, value: number, color: string) => {
      const safeValue = isNaN(value) || value === undefined ? 0 : value;
      return (
          <div className="mb-3">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  <span>{label}</span>
                  <span className="opacity-50">{Math.round(safeValue)}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, safeValue)}%` }}></div>
              </div>
          </div>
      );
  };

  const currentEnergyDrain = player.commitments.reduce((sum, c) => {
      // Movies (Acting Gigs) do not drain weekly energy passively.
      if (c.type === 'ACTING_GIG') return sum;
      return sum + c.energyCost;
  }, 0); // Business drain removed
  
  const remainingEnergyCapacity = 100 - currentEnergyDrain;

  // Categories Config
  const CATEGORIES: { id: ImproveCategory, label: string, icon: any, color: string, stat: number }[] = [
      { id: 'BODY', label: 'Physique', icon: Dumbbell, color: 'text-amber-500', stat: player.stats.body },
      { id: 'HEALTH', label: 'Health', icon: HeartPulse, color: 'text-rose-500', stat: player.stats.health },
      { id: 'LOOKS', label: 'Looks', icon: Sparkles, color: 'text-purple-500', stat: player.stats.looks },
      { id: 'MOOD', label: 'Mood', icon: Smile, color: 'text-teal-400', stat: player.stats.happiness },
  ];

  // Helper for genre icons
  const getGenreIcon = (genre: Genre) => {
      switch(genre) {
          case 'ACTION': return <Sword size={18} className="text-orange-500" />;
          case 'DRAMA': return <Drama size={18} className="text-purple-500" />;
          case 'COMEDY': return <Smile size={18} className="text-yellow-400" />;
          case 'ROMANCE': return <Heart size={18} className="text-pink-500" />;
          case 'THRILLER': return <Activity size={18} className="text-blue-500" />;
          case 'HORROR': return <Ghost size={18} className="text-zinc-400" />;
          case 'SCI_FI': return <Monitor size={18} className="text-cyan-400" />;
          case 'ADVENTURE': return <Map size={18} className="text-emerald-500" />;
          case 'SUPERHERO': return <Shield size={18} className="text-red-500" />;
          default: return <Clapperboard size={18} />;
      }
  };

  const getWorkshopIcon = (id: string) => {
      if (id.includes('vocal')) return <Mic size={24} className="text-pink-400" />;
      if (id.includes('dialogue') || id.includes('scene')) return <Users size={24} className="text-blue-400" />;
      if (id.includes('media')) return <Camera size={24} className="text-purple-400" />;
      if (id.includes('improv')) return <Sparkles size={24} className="text-yellow-400" />;
      if (id.includes('advanced') || id.includes('lab')) return <FlaskConical size={24} className="text-emerald-400" />;
      if (id.includes('masterclass')) return <Award size={24} className="text-amber-400" />;
      if (id.includes('method')) return <Brain size={24} className="text-rose-400" />;
      if (id.includes('writing') || id.includes('story')) return <BookOpen size={24} className="text-indigo-400" />;
      if (id.includes('directing') || id.includes('cinematography') || id.includes('auteur') || id.includes('leadership')) return <Clapperboard size={24} className="text-emerald-400" />;
      return <BookOpen size={24} className="text-zinc-400" />;
  };

  const handleGenreTrain = (genre: Genre, cost: number, energy: number, gain: number) => {
      if (onPerformAction) {
          const option: ImprovementOption = {
              id: `genre_train_${genre}`,
              label: `${genre} Training`,
              energyCost: energy,
              moneyCost: cost,
              gains: { }, 
              risk: 0,
              description: `Training ${genre}`
          };
          onPerformAction('GENRE', genre, option);
      }
  };

  return (
    <div className="space-y-6 pb-24 pt-4">
      <h2 className="text-3xl font-bold text-white mb-2">Self Improvement</h2>

      {/* SECTION 1: ACTOR SKILL PROFILE (ACCORDION) */}
      <div className="glass-card rounded-3xl overflow-hidden transition-all duration-300">
          <button 
            onClick={() => setIsTalentExpanded(!isTalentExpanded)}
            className="w-full p-5 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
          >
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                      <Brain size={20} />
                  </div>
                  <div className="text-left">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Overall Talent</div>
                      <div className="text-2xl font-bold text-white leading-none">{Math.round(calculateGlobalTalent(player.stats.skills, player.writerStats, player.directorStats))}<span className="text-zinc-500 text-sm">/100</span></div>
                  </div>
              </div>
              {isTalentExpanded ? <ChevronUp size={20} className="text-zinc-500"/> : <ChevronDown size={20} className="text-zinc-500"/>}
          </button>
          
          {/* Main Talent Bar (Always Visible) */}
          <div className="px-5 pb-5">
             <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-2">
                 <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: `${calculateGlobalTalent(player.stats.skills, player.writerStats, player.directorStats)}%` }}></div>
             </div>
          </div>

          {/* Expanded Detail View */}
          {isTalentExpanded && (
              <div className="px-5 pb-6 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                      <div className="col-span-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Acting Skills</div>
                      {renderSkillBar("Charisma", player.stats.skills.charisma, "bg-pink-500")}
                      {renderSkillBar("Presence", player.stats.skills.presence, "bg-orange-500")}
                      {renderSkillBar("Delivery", player.stats.skills.delivery, "bg-amber-500")}
                      {renderSkillBar("Memorization", player.stats.skills.memorization, "bg-blue-500")}
                      {renderSkillBar("Expression", player.stats.skills.expression, "bg-rose-500")}
                      {renderSkillBar("Improv", player.stats.skills.improvisation, "bg-purple-500")}
                      {renderSkillBar("Discipline", player.stats.skills.discipline, "bg-emerald-500")}
                  </div>
                  
                  {player.writerStats && (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4 border-t border-white/5">
                          <div className="col-span-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Writer Stats</div>
                          {renderSkillBar("Creativity", player.writerStats.creativity, "bg-indigo-500")}
                          {renderSkillBar("Dialogue", player.writerStats.dialogue, "bg-cyan-500")}
                          {renderSkillBar("Structure", player.writerStats.structure, "bg-violet-500")}
                          {renderSkillBar("Pacing", player.writerStats.pacing, "bg-blue-400")}
                      </div>
                  )}

                  {player.directorStats && (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4 border-t border-white/5">
                          <div className="col-span-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Director Stats</div>
                          {renderSkillBar("Vision", player.directorStats.vision, "bg-emerald-500")}
                          {renderSkillBar("Technical", player.directorStats.technical, "bg-teal-500")}
                          {renderSkillBar("Leadership", player.directorStats.leadership, "bg-green-500")}
                          {renderSkillBar("Style", player.directorStats.style, "bg-lime-500")}
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* SECTION 2: TABS */}
      <div className="flex p-1 bg-zinc-900/50 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('WELLBEING')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'WELLBEING' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
              Wellbeing
          </button>
          <button 
            onClick={() => setActiveTab('WORKSHOPS')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'WORKSHOPS' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
              Workshops
          </button>
          <button 
            onClick={() => setActiveTab('GENRE')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'GENRE' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
              Genre Lab
          </button>
      </div>

      {/* TAB CONTENT: WELLBEING */}
      {activeTab === 'WELLBEING' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              
              {/* Category Selectors */}
              <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                          <button 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex flex-col items-center p-3 rounded-2xl transition-all border ${isSelected ? 'bg-zinc-800 border-white/20 shadow-lg scale-[1.02]' : 'bg-zinc-900 border-transparent hover:bg-zinc-800'}`}
                          >
                              <Icon size={20} className={`${cat.color} mb-2`} />
                              <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{cat.label}</span>
                              <div className="w-full h-1 bg-zinc-700 rounded-full mt-2 overflow-hidden">
                                  <div className={`h-full ${cat.color.replace('text-', 'bg-')}`} style={{ width: `${cat.stat}%` }}></div>
                              </div>
                          </button>
                      );
                  })}
              </div>

              {/* Activities List */}
              <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      {CATEGORIES.find(c => c.id === selectedCategory)?.label} Activities
                  </h3>
                  
                  {IMPROVEMENT_CATALOG[selectedCategory].map(act => (
                      <div key={act.id} onClick={() => setSelectedActivity(act)} className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group">
                          <div>
                              <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{act.name}</div>
                              <div className="text-xs text-zinc-500">{act.description}</div>
                          </div>
                          <div className="bg-zinc-800 p-2 rounded-full text-zinc-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                              <ChevronDown size={16} />
                          </div>
                      </div>
                  ))}
              </div>

              {/* ACTIVITY MODAL (Centered Dialog) */}
              {selectedActivity && (
                  <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedActivity(null)}>
                      <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                          
                          {/* Header */}
                          <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50 shrink-0">
                              <div>
                                  <h3 className="font-bold text-xl text-white">{selectedActivity.name}</h3>
                                  <p className="text-xs text-zinc-400">{selectedActivity.description}</p>
                              </div>
                              <button onClick={() => setSelectedActivity(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><X size={20}/></button>
                          </div>

                          {/* Options List */}
                          <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar">
                              {selectedActivity.options.map(opt => {
                                  const canAffordMoney = player.money >= opt.moneyCost;
                                  const canAffordEnergy = player.energy.current >= opt.energyCost;
                                  
                                  return (
                                      <div key={opt.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="font-bold text-white">{opt.label}</div>
                                              <div className="flex gap-2 text-xs font-mono">
                                                  <span className={canAffordMoney ? "text-emerald-400" : "text-rose-500"}>${opt.moneyCost}</span>
                                                  <span className={canAffordEnergy ? "text-amber-400" : "text-rose-500"}>{opt.energyCost}E</span>
                                              </div>
                                          </div>
                                          <p className="text-xs text-zinc-500 mb-3 italic">{opt.description}</p>
                                          
                                          {/* Stats Badge */}
                                          <div className="flex gap-2 mb-4">
                                              {Object.entries(opt.gains).map(([stat, val]) => {
                                                  if (typeof val !== 'number') return null;
                                                  return (
                                                      <span key={stat} className="text-[10px] font-bold uppercase px-2 py-1 bg-zinc-800 rounded text-indigo-300">
                                                          +{val} {stat}
                                                      </span>
                                                  );
                                              })}
                                              {opt.risk > 0 && (
                                                  <span className="text-[10px] font-bold uppercase px-2 py-1 bg-rose-900/30 text-rose-400 rounded">
                                                      {opt.risk}% Risk
                                                  </span>
                                              )}
                                          </div>

                                          <button 
                                              onClick={() => {
                                                  if(onPerformAction) {
                                                      onPerformAction(selectedCategory, selectedActivity.name, opt);
                                                      setSelectedActivity(null);
                                                  }
                                              }}
                                              disabled={!canAffordMoney || !canAffordEnergy}
                                              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                                  !canAffordMoney ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' :
                                                  !canAffordEnergy ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' :
                                                  'bg-white text-black hover:bg-zinc-200 shadow-lg'
                                              }`}
                                          >
                                              {!canAffordMoney ? 'Too Expensive' : !canAffordEnergy ? 'Too Tired' : 'Perform Activity'}
                                          </button>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              )}

          </div>
      )}

      {/* TAB CONTENT: WORKSHOPS (REDESIGNED) */}
      {activeTab === 'WORKSHOPS' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center text-xs text-zinc-500 px-2 mb-2">
                  <span>Professional Training</span>
                  <div className="flex items-center gap-1">
                    <Zap size={10} className="text-amber-500"/>
                    <span>Available: {remainingEnergyCapacity}E / wk</span>
                  </div>
              </div>

              {/* Workshop Filters */}
              <div className="flex gap-2 px-1 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                  {(['ALL', 'ACTING', 'WRITING', 'DIRECTING'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setWorkshopFilter(f)}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            workshopFilter === f 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                        }`}
                      >
                          {f}
                      </button>
                  ))}
              </div>
              
              <div className="space-y-3">
                  {WORKSHOP_CATALOG.filter(course => {
                      if (workshopFilter === 'ALL') return true;
                      if (workshopFilter === 'ACTING') return !!course.skillGains;
                      if (workshopFilter === 'WRITING') return !!course.writerGains;
                      if (workshopFilter === 'DIRECTING') return !!course.directorGains;
                      return true;
                  }).map(course => {
                      const enrolledCourse = player.commitments.find(c => c.name === course.name && c.type === 'COURSE'); 
                      const isEnrolled = !!enrolledCourse;
                      const canAfford = player.money >= (course.upfrontCost || 0);
                      const hasEnergySpace = remainingEnergyCapacity >= course.energyCost;
                      const isComplete = isEnrolled && enrolledCourse.weeksCompleted === enrolledCourse.totalDuration;

                      return (
                          <div 
                            key={course.id} 
                            className={`
                                relative overflow-hidden rounded-3xl border transition-all duration-300
                                ${isEnrolled 
                                    ? 'bg-gradient-to-r from-zinc-900 to-black border-indigo-500/30' 
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
                            `}
                          >
                              {/* Background Icon/Watermark */}
                              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                                  {getWorkshopIcon(course.id)}
                              </div>

                              <div className="p-5 relative z-10">
                                  <div className="flex items-start gap-4 mb-3">
                                      <div className={`p-3 rounded-2xl ${isEnrolled ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                                          {getWorkshopIcon(course.id)}
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex justify-between items-start">
                                              <h3 className="font-bold text-white text-lg leading-tight">{course.name}</h3>
                                              {isEnrolled && (
                                                  <div className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                                      Active
                                                  </div>
                                              )}
                                          </div>
                                          <div className="flex flex-wrap gap-2 mt-2">
                                              {Object.keys(course.skillGains || {}).map(skill => (
                                                  <span key={skill} className="text-[10px] text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded border border-white/5 capitalize">
                                                      +{skill}
                                                  </span>
                                              ))}
                                              {Object.keys(course.writerGains || {}).map(stat => (
                                                  <span key={stat} className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 capitalize">
                                                      +{stat}
                                                  </span>
                                              ))}
                                              {Object.keys(course.directorGains || {}).map(stat => (
                                                  <span key={stat} className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 capitalize">
                                                      +{stat}
                                                  </span>
                                              ))}
                                          </div>
                                      </div>
                                  </div>

                                  {!isEnrolled ? (
                                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                          <div className="flex gap-4 text-xs font-mono">
                                              <div className={canAfford ? 'text-emerald-400' : 'text-rose-500'}>
                                                  ${course.upfrontCost?.toLocaleString()}
                                              </div>
                                              <div className={hasEnergySpace ? 'text-amber-400' : 'text-rose-500'}>
                                                  -{course.energyCost}E/wk
                                              </div>
                                              <div className="text-zinc-500">{course.totalDuration} wks</div>
                                          </div>
                                          <button 
                                              onClick={() => onEnroll(course)}
                                              disabled={!canAfford || !hasEnergySpace}
                                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                                  !canAfford || !hasEnergySpace 
                                                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                                  : 'bg-white text-black hover:bg-zinc-200'
                                              }`}
                                          >
                                              Enroll
                                          </button>
                                      </div>
                                  ) : (
                                      <div className="mt-2">
                                          <div className="flex justify-between text-[10px] text-zinc-500 uppercase mb-1">
                                              <span>Progress</span>
                                              <span>{enrolledCourse?.weeksCompleted || 0} / {course.totalDuration} Weeks</span>
                                          </div>
                                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                                              <div 
                                                className="h-full bg-indigo-500 transition-all duration-500 relative" 
                                                style={{ width: `${((enrolledCourse?.weeksCompleted || 0) / (course.totalDuration || 1)) * 100}%` }}
                                              >
                                                  <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                                              </div>
                                          </div>
                                          <button 
                                            onClick={() => onCancel(enrolledCourse!.id)} 
                                            className="w-full py-2 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                                          >
                                              Cancel Course
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* TAB CONTENT: GENRE LAB (NEW GRID UI) */}
      {activeTab === 'GENRE' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-zinc-500 px-2 text-xs mb-2">
                  <Monitor size={12}/>
                  <p>Master specific genres to unlock roles. (10 Energy = +1 Point)</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                  {GENRE_TRAINING_CATALOG.map(training => {
                      const currentXP = player.stats.genreXP[training.genre] || 0;
                      const isMastered = currentXP >= 100;
                      const canAffordMoney = player.money >= training.cost;
                      const canAffordEnergy = player.energy.current >= training.energy;
                      const canTrain = !isMastered && canAffordMoney && canAffordEnergy;

                      return (
                          <button 
                              key={training.genre}
                              onClick={() => {
                                  if (canTrain) {
                                      handleGenreTrain(training.genre, training.cost, training.energy, training.gain);
                                  }
                              }}
                              disabled={isMastered || !canTrain}
                              className={`
                                relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 group
                                ${isMastered 
                                    ? 'bg-amber-900/10 border-amber-500/50 cursor-default shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                                    : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800 active:scale-[0.98]'
                                }
                              `}
                          >
                              {/* Icon Badge */}
                              <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform
                                ${isMastered ? 'bg-amber-500 text-black scale-110' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white'}
                              `}>
                                  {isMastered ? <Check size={20} strokeWidth={3}/> : getGenreIcon(training.genre)}
                              </div>

                              {/* Label */}
                              <div className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${isMastered ? 'text-amber-400' : 'text-zinc-300'}`}>
                                  {training.genre.replace('_', ' ')}
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden mb-2 relative">
                                  <div 
                                    className={`h-full transition-all duration-500 ${isMastered ? 'bg-amber-500' : 'bg-indigo-500'} `}
                                    style={{ width: `${currentXP}%` }}
                                  ></div>
                              </div>

                              {/* Cost / Mastered Text */}
                              <div className="text-[9px] font-mono opacity-80">
                                  {isMastered ? (
                                      <span className="text-amber-500 font-bold uppercase">Mastered</span>
                                  ) : (
                                      <div className="flex flex-col items-center gap-0.5 text-zinc-500">
                                          <span className={canAffordEnergy ? 'text-amber-400' : 'text-rose-500'}>{training.energy}E</span>
                                          <span className={canAffordMoney ? 'text-emerald-400' : 'text-rose-500'}>${training.cost}</span>
                                      </div>
                                  )}
                              </div>
                          </button>
                      );
                  })}
              </div>
          </div>
      )}

    </div>
  );
};
