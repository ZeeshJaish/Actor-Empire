
import React, { useState } from 'react';
import { Player, Commitment, InstaPostType, NPCActor, InteractionType, Agent, Manager, Message, SponsorshipActionType, AuditionOpportunity, DatingMatch, InstaPost, Relationship, SponsorshipOffer, NegotiationData, ContractFilm } from '../../types';
import { MessageSquare, Search, BarChart3, Camera, Users, Newspaper, TrendingUp, Activity, Heart, Folder, Flame, Gem, Landmark, X, CheckCircle, AlertCircle, BookOpen, Map } from 'lucide-react';
import { getPhaseDuration } from '../../services/roleLogic';

// Import sub-apps
import { InstagramApp } from './InstagramApp';
import { BoxOfficeApp } from './BoxOfficeApp';
import { CastLinkApp } from './CastLinkApp';
import { MessagesApp } from './MessagesApp';
import { TeamApp } from './TeamApp';
import { NewsApp } from './NewsApp';
import { ImdbApp } from './ImdbApp';
import { ForbesApp } from './ForbesApp';
import { StocksApp } from './StocksApp';
import { DatingFolder } from './DatingFolder';
import { SocialFolder } from './SocialFolder';
import { TinderApp } from './TinderApp';
import { LuxeApp } from './LuxeApp';
import { BankApp } from './BankApp';
import { XApp } from './XApp';
import { YoutubeApp } from './YoutubeApp';
import { GuideView } from '../../components/GuideView'; // Imported GuideView
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';

// Helper Component for App Icon
const AppIcon = ({ icon, color, label, onClick, badge, customContent, customBg }: any) => (
    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onClick}>
        <div className={`w-14 h-14 ${customBg || color} rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform relative overflow-hidden`}>
            {customContent ? customContent : icon}
            {badge > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold">
                    {badge}
                </div>
            )}
        </div>
        <span className="text-[10px] text-white font-medium drop-shadow-md">{label}</span>
    </div>
);

interface MobilePageProps {
  player?: Player;
  onAudition?: (opportunity: AuditionOpportunity) => void;
  onTakeJob?: (job: Commitment) => void;
  onQuitJob?: (id: string) => void;
  onPost?: (type: InstaPostType, caption: string, image?: string) => void;
  onFollowNPC?: (npc: NPCActor) => void;
  onInteractNPC?: (npc: NPCActor, type: InteractionType) => void;
  onBefriendNPC?: (npc: NPCActor) => void;
  onHireAgent?: (agent: Agent) => void;
  onFireAgent?: () => void;
  onHireManager?: (manager: Manager) => void;
  onFireManager?: () => void;
  onAcceptMessage?: (msg: Message) => void;
  onPerformSponsorship?: (sponId: string, action: SponsorshipActionType) => void;
  onDeleteMessage?: (id: string) => void;
  onTradeStock?: (stockId: string, amount: number) => void;
  onUpdatePlayer?: (player: Player) => void; 
}

export const MobilePage: React.FC<MobilePageProps> = (props) => {
  const [appMode, setAppMode] = useState<'HOME' | 'CASTLINK' | 'IMDB' | 'BOXOFFICE' | 'INSTAGRAM' | 'X' | 'YOUTUBE' | 'NEWS' | 'TEAM' | 'MESSAGES' | 'FORBES' | 'STOCKS' | 'DATING_FOLDER' | 'SOCIAL_FOLDER' | 'TINDER' | 'LUXE' | 'BANK' | 'GUIDE'>('HOME');
  const [toast, setToast] = useState<{msg: string, color: string} | null>(null);

  if (!props.player) return null; 

  const unreadMessages = props.player.inbox?.filter(m => !m.isRead).length || 0;
  const handleUpdatePlayer = props.onUpdatePlayer || ((p: Player) => {});

  const showToast = (msg: string, color: string = 'bg-emerald-500') => {
      setToast({ msg, color });
      setTimeout(() => setToast(null), 3000);
  };

  // --- HANDLER: Accept Offers (Modified for Multi-Film) ---
  const handleAcceptMessage = (msg: Message) => {
      // 1. Remove message from inbox
      const newInbox = props.player!.inbox.filter(m => m.id !== msg.id);
      let updatedPlayer = { ...props.player!, inbox: newInbox };

      // 2. Process Logic based on Type
      if (msg.type === 'OFFER_ROLE' || msg.type === 'OFFER_NEGOTIATION') {
          let opp: AuditionOpportunity;
          let salary = 0;
          let royalty = 0;

          if (msg.type === 'OFFER_NEGOTIATION') {
              const data = msg.data as NegotiationData;
              opp = data.opportunity;
              salary = data.currentOffer;
              royalty = data.royaltyPercentage || 0;
          } else {
              opp = msg.data as AuditionOpportunity;
              salary = opp.estimatedIncome;
              royalty = opp.royaltyPercentage || 0;
          }

          // FIX: Register Famous Movie to prevent duplicate offers
          if (opp.project.isFamous) {
              if (!updatedPlayer.world.famousMoviesReleased.includes(opp.projectName)) {
                  updatedPlayer.world.famousMoviesReleased.push(opp.projectName);
              }
          }

          const newCommitments: Commitment[] = [];

          // CHECK FOR UNIVERSE CONTRACT (Multi-Film)
          if (opp.universeContract) {
              const contract = opp.universeContract;
              
              // We split the salary across the films for simplicity, or give signing bonus now
              // Let's give 20% signing bonus now, rest per film
              const signingBonus = Math.floor(salary * 0.2);
              const perFilmSalary = Math.floor((salary - signingBonus) / contract.films.length);
              
              // Immediate payout
              updatedPlayer.money += signingBonus;
              updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Signed Multi-Picture Deal! Bonus: $${signingBonus.toLocaleString()}`, type: 'positive' });
              updatedPlayer.activeUniverseContract = contract;

              // --- NEW: UPDATE ROSTER IN WORLD STATE ---
              if (updatedPlayer.world && updatedPlayer.world.universes) {
                  const uniId = contract.universeId;
                  const newUniverses = { ...updatedPlayer.world.universes };
                  if (newUniverses[uniId]) {
                      const newRoster = newUniverses[uniId].roster.map(char => {
                          if (char.name === contract.characterName) {
                              return { ...char, actorId: props.player!.id, actorName: props.player!.name };
                          }
                          return char;
                      });
                      newUniverses[uniId] = { ...newUniverses[uniId], roster: newRoster };
                      updatedPlayer.world = { ...updatedPlayer.world, universes: newUniverses };
                  }
              }
              // -----------------------------------------

              contract.films.forEach((film, index) => {
                  const isFirst = index === 0;
                  
                  // Clone project details but update title/role for specific film
                  const filmDetails = { 
                      ...opp.project, 
                      title: film.title, 
                      subtype: film.type 
                  };

                  const newComm: Commitment = {
                      id: `uni_job_${Date.now()}_${index}`,
                      name: film.title,
                      type: 'ACTING_GIG',
                      roleType: film.role,
                      energyCost: 0, 
                      income: 0,
                      lumpSum: perFilmSalary,
                      payoutType: 'LUMPSUM',
                      projectDetails: filmDetails,
                      // First movie starts now, others are SCHEDULED
                      projectPhase: isFirst ? 'PRE_PRODUCTION' : 'SCHEDULED', 
                      phaseWeeksLeft: isFirst ? getPhaseDuration('PRE_PRODUCTION') : film.weeksOffset, // Use offset as waiting time
                      totalPhaseDuration: isFirst ? getPhaseDuration('PRE_PRODUCTION') : film.weeksOffset,
                      auditionPerformance: 100, 
                      productionPerformance: 50,
                      agentCommission: props.player!.team.agent?.commission || 0,
                      royaltyPercentage: royalty
                  };
                  newCommitments.push(newComm);
              });

          } else {
              // STANDARD SINGLE FILM
              const newCommitment: Commitment = {
                  id: `job_${Date.now()}`,
                  name: opp.projectName,
                  type: 'ACTING_GIG',
                  roleType: opp.roleType,
                  energyCost: 0,
                  income: 0,
                  lumpSum: salary,
                  payoutType: 'LUMPSUM',
                  projectDetails: opp.project,
                  projectPhase: 'PRE_PRODUCTION', 
                  phaseWeeksLeft: getPhaseDuration('PRE_PRODUCTION'),
                  totalPhaseDuration: getPhaseDuration('PRE_PRODUCTION'),
                  auditionPerformance: 100,
                  productionPerformance: 50,
                  agentCommission: props.player!.team.agent?.commission || 0,
                  royaltyPercentage: royalty
              };
              newCommitments.push(newCommitment);
              updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Accepted role in "${opp.projectName}"!`, type: 'positive' });
          }

          updatedPlayer.commitments = [...updatedPlayer.commitments, ...newCommitments];
      } 
      else if (msg.type === 'OFFER_SPONSORSHIP') {
          const offer = msg.data as SponsorshipOffer;
          // Add to active sponsorships
          updatedPlayer.activeSponsorships = [...updatedPlayer.activeSponsorships, { ...offer, weeksCompleted: 0 }];
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Signed sponsorship deal with ${offer.brandName}.`, type: 'positive' });
      }

      // 3. Update Player
      handleUpdatePlayer(updatedPlayer);
      showToast("Offer Accepted");
  };

  // --- HANDLER: Perform Sponsorship ---
  const handlePerformSponsorship = (sponId: string, action: SponsorshipActionType) => {
      const sponIndex = props.player!.activeSponsorships.findIndex(s => s.id === sponId);
      if (sponIndex === -1) return;
      
      const spon = props.player!.activeSponsorships[sponIndex];
      
      // Energy Check
      if (props.player!.energy.current < spon.requirements.energyCost) {
          showToast("Not enough energy!", "bg-rose-500");
          return;
      }

      // Update Logic - Increment PROGRESS, not just period count
      const updatedSpon = { ...spon };
      updatedSpon.requirements = {
          ...spon.requirements,
          progress: (spon.requirements.progress || 0) + 1
      };

      const updatedSponsorships = [...props.player!.activeSponsorships];
      updatedSponsorships[sponIndex] = updatedSpon;

      const updatedPlayer = {
          ...props.player!,
          activeSponsorships: updatedSponsorships
      };
      spendPlayerEnergy(updatedPlayer, spon.requirements.energyCost);

      handleUpdatePlayer(updatedPlayer);
      showToast(`${action === 'POST' ? 'Post' : 'Shoot'} Complete!`, 'bg-blue-500');
  };

  const handleTinderDateSuccess = (match: DatingMatch) => {
      const newMatches = props.player!.dating.matches.filter(m => m.id !== match.id);
      const newRel: Relationship = {
          id: `rel_${match.id}`,
          name: match.name,
          relation: 'Partner',
          closeness: 40 + Math.floor(Math.random() * 20),
          image: match.image,
          lastInteractionWeek: props.player!.currentWeek,
          lastInteractionAbsolute: getAbsoluteWeek(props.player!.age, props.player!.currentWeek),
          npcId: match.npcId,
          age: match.age
      };
      
      handleUpdatePlayer({
          ...props.player!,
          dating: { ...props.player!.dating, matches: newMatches },
          relationships: [...props.player!.relationships, newRel],
          logs: [...props.player!.logs, { week: props.player!.currentWeek, year: props.player!.age, message: `You started dating ${match.name}!`, type: 'positive' }]
      });
  };

  // --- NEW HANDLERS: HIRE AGENT/MANAGER (Strict Money Check) ---
  const handleHireAgent = (agent: Agent) => {
      if (props.player!.money < agent.annualFee) {
          showToast("Insufficient Funds for Annual Fee", "bg-rose-500");
          return;
      }
      handleUpdatePlayer({
          ...props.player!,
          money: props.player!.money - agent.annualFee,
          team: { ...props.player!.team, agent },
          logs: [...props.player!.logs, { 
              week: props.player!.currentWeek, 
              year: props.player!.age, 
              message: `Hired ${agent.name}. Paid annual fee of $${agent.annualFee.toLocaleString()}.`, 
              type: 'neutral' 
          }]
      });
      showToast("Agent Hired", "bg-emerald-500");
  };

  const handleHireManager = (manager: Manager) => {
      if (props.player!.money < manager.annualFee) {
          showToast("Insufficient Funds for Annual Fee", "bg-rose-500");
          return;
      }
      handleUpdatePlayer({
          ...props.player!,
          money: props.player!.money - manager.annualFee,
          team: { ...props.player!.team, manager },
          logs: [...props.player!.logs, { 
              week: props.player!.currentWeek, 
              year: props.player!.age, 
              message: `Hired ${manager.name}. Paid annual fee of $${manager.annualFee.toLocaleString()}.`, 
              type: 'neutral' 
          }]
      });
      showToast("Manager Hired", "bg-emerald-500");
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center pt-4 relative">
        <div className="w-full max-w-xs h-full max-h-[650px] bg-black border-[6px] border-zinc-800 rounded-[3rem] overflow-hidden relative shadow-2xl ring-1 ring-zinc-700">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-xl z-50"></div>
            
            <div className="w-full h-full bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(to bottom, #1e1b4b, #312e81)' }}>
                {/* Status Bar */}
                <div className="h-8 w-full flex justify-between items-center px-6 pt-2 text-[10px] text-white font-medium z-20 relative">
                    <span>12:45</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                        <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                </div>

                {/* TOAST NOTIFICATION (Inside Phone Screen for better Z-index/Visibility) */}
                {toast && (
                    <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[100] ${toast.color} text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top fade-in w-max max-w-[90%] justify-center border border-white/10`}>
                        {toast.color.includes('rose') ? <AlertCircle size={16} /> : <CheckCircle size={16} />} 
                        {toast.msg}
                    </div>
                )}

                {/* HOME SCREEN */}
                {appMode === 'HOME' && (
                    <div className="h-full w-full p-4 pt-10 flex flex-col animate-in fade-in duration-300">
                        <div className="grid grid-cols-4 gap-x-4 gap-y-8 mt-4">
                            <AppIcon 
                                icon={<MessageSquare size={26} fill="white" />} 
                                color="bg-green-500" 
                                label="Messages" 
                                onClick={() => setAppMode('MESSAGES')} 
                                badge={unreadMessages} 
                            />
                            <AppIcon 
                                icon={<Search size={26} />} 
                                color="bg-indigo-600" 
                                label="CastLink" 
                                onClick={() => setAppMode('CASTLINK')} 
                            />
                            
                            {/* SOCIAL FOLDER */}
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setAppMode('SOCIAL_FOLDER')}>
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-2 grid grid-cols-2 gap-1 shadow-lg group-active:scale-95 transition-transform overflow-hidden">
                                    <div className="w-full h-full bg-black flex items-center justify-center rounded-[5px] shadow-sm border border-zinc-700">
                                        <X size={12} strokeWidth={3} className="text-white"/>
                                    </div>
                                    <div className="w-full h-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-[5px] flex items-center justify-center shadow-sm">
                                        <Camera size={12} className="text-white"/>
                                    </div>
                                    <div className="w-full h-full bg-[#FF0000] rounded-[5px] flex items-center justify-center shadow-sm">
                                        <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
                                    </div>
                                    <div className="w-full h-full"></div>
                                </div>
                                <span className="text-[10px] text-white font-medium drop-shadow-md">Social</span>
                            </div>

                            <AppIcon 
                                icon={<Newspaper size={26} />} 
                                color="bg-red-600" 
                                label="News" 
                                onClick={() => setAppMode('NEWS')} 
                            />
                            <AppIcon 
                                label="IMDb" 
                                color="bg-yellow-400" 
                                onClick={() => setAppMode('IMDB')} 
                                customContent={<span className="font-black text-xs tracking-tighter border-2 border-black px-1 rounded text-black">IMDb</span>}
                            />
                            <AppIcon 
                                icon={<BarChart3 size={26} />} 
                                color="bg-emerald-600" 
                                label="BoxOffice" 
                                onClick={() => setAppMode('BOXOFFICE')} 
                            />
                            <AppIcon 
                                icon={<Users size={26} />} 
                                color="bg-blue-500" 
                                label="Team" 
                                onClick={() => setAppMode('TEAM')} 
                            />
                            <AppIcon 
                                icon={<Landmark size={26} />} 
                                color="bg-[#004b87]" 
                                label="Bank" 
                                onClick={() => setAppMode('BANK')} 
                            />
                            <AppIcon 
                                icon={<TrendingUp size={26} />} 
                                color="bg-black" 
                                label="Forbes" 
                                onClick={() => setAppMode('FORBES')}
                                customContent={<span className="font-serif font-black text-xs tracking-tighter text-white">FORBES</span>} 
                            />
                            <AppIcon 
                                icon={<Activity size={26} />} 
                                color="bg-zinc-800" 
                                label="Stocks" 
                                onClick={() => setAppMode('STOCKS')} 
                            />
                            
                            {/* DATING FOLDER */}
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setAppMode('DATING_FOLDER')}>
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-2 grid grid-cols-2 gap-1 shadow-lg group-active:scale-95 transition-transform overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-tr from-pink-500 to-orange-500 rounded-[5px] flex items-center justify-center shadow-sm">
                                        <Flame size={12} fill="white" className="text-white" />
                                    </div>
                                    <div className="w-full h-full bg-black border border-amber-500/50 rounded-[5px] flex items-center justify-center relative overflow-hidden shadow-sm">
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"></div>
                                        <Gem size={10} className="text-amber-500" />
                                    </div>
                                    <div className="w-full h-full"></div>
                                    <div className="w-full h-full"></div>
                                </div>
                                <span className="text-[10px] text-white font-medium drop-shadow-md">Dating</span>
                            </div>

                            {/* GUIDE APP (Updated Icon) */}
                            <AppIcon 
                                icon={<Map size={26} />} 
                                color="bg-zinc-800" 
                                label="Guide" 
                                onClick={() => setAppMode('GUIDE')} 
                            />

                        </div>
                    </div>
                )}

                {/* APPS */}
                {appMode === 'INSTAGRAM' && (
                    <InstagramApp 
                        player={props.player} 
                        onBack={() => setAppMode('SOCIAL_FOLDER')} 
                        onPost={props.onPost!} 
                        onFollow={props.onFollowNPC!} 
                        onInteract={props.onInteractNPC!} 
                    />
                )}
                {appMode === 'X' && (
                    <XApp 
                        player={props.player} 
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer} 
                    />
                )}
                {appMode === 'YOUTUBE' && (
                    <YoutubeApp 
                        player={props.player} 
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer} 
                    />
                )}
                {appMode === 'BOXOFFICE' && (
                    <BoxOfficeApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'CASTLINK' && (
                    <CastLinkApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onAudition={props.onAudition!} 
                        onTakeJob={props.onTakeJob!} 
                        onQuitJob={props.onQuitJob!} 
                    />
                )}
                {appMode === 'MESSAGES' && (
                    <MessagesApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onAccept={handleAcceptMessage} // Use local smart handler
                        onDelete={props.onDeleteMessage!} 
                    />
                )}
                {appMode === 'TEAM' && (
                    <TeamApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onHireAgent={handleHireAgent} 
                        onFireAgent={props.onFireAgent!} 
                        onHireManager={handleHireManager} 
                        onFireManager={props.onFireManager!} 
                        onPerformSponsorship={handlePerformSponsorship} // New Handler
                        onUpdatePlayer={handleUpdatePlayer}
                        onShowToast={showToast}
                    />
                )}
                {appMode === 'NEWS' && (
                    <NewsApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'IMDB' && (
                    <ImdbApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'FORBES' && (
                    <ForbesApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'STOCKS' && (
                    <StocksApp player={props.player} onBack={() => setAppMode('HOME')} onTrade={props.onTradeStock!} />
                )}
                {appMode === 'BANK' && (
                    <BankApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                
                {/* DATING GROUP */}
                {appMode === 'DATING_FOLDER' && (
                    <DatingFolder 
                        onBack={() => setAppMode('HOME')}
                        onOpenTinder={() => setAppMode('TINDER')}
                        onOpenLuxe={() => setAppMode('LUXE')}
                    />
                )}
                {appMode === 'TINDER' && (
                    <TinderApp 
                        player={props.player} 
                        onBack={() => setAppMode('DATING_FOLDER')} 
                        onUpdatePlayer={handleUpdatePlayer}
                        onDateSuccess={handleTinderDateSuccess}
                    />
                )}
                {appMode === 'LUXE' && (
                    <LuxeApp player={props.player} onBack={() => setAppMode('DATING_FOLDER')} onUpdatePlayer={handleUpdatePlayer}/>
                )}

                {/* SOCIAL GROUP */}
                {appMode === 'SOCIAL_FOLDER' && (
                    <SocialFolder 
                        onBack={() => setAppMode('HOME')}
                        onOpenX={() => setAppMode('X')}
                        onOpenInsta={() => setAppMode('INSTAGRAM')}
                        onOpenYoutube={() => setAppMode('YOUTUBE')}
                    />
                )}

                {/* GUIDE APP */}
                {appMode === 'GUIDE' && (
                    <GuideView onBack={() => setAppMode('HOME')} />
                )}

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none">
                     <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
  );
};
