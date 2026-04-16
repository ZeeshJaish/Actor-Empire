
import React, { useState } from 'react';
import { Player, Commitment, InstaPostType, NPCActor, InteractionType, Agent, Manager, Message, SponsorshipActionType, AuditionOpportunity, DatingMatch, Relationship } from '../types';
import { MessageSquare, Search, BarChart3, Camera, Users, Newspaper, TrendingUp, Activity, Heart, Folder, Flame, Gem, Landmark, X } from 'lucide-react';

// Import sub-apps
import { InstagramApp } from './mobile/InstagramApp';
import { BoxOfficeApp } from './mobile/BoxOfficeApp';
import { CastLinkApp } from './mobile/CastLinkApp';
import { MessagesApp } from './mobile/MessagesApp';
import { TeamApp } from './mobile/TeamApp';
import { NewsApp } from './mobile/NewsApp';
import { ImdbApp } from './mobile/ImdbApp';
import { ForbesApp } from './mobile/ForbesApp';
import { StocksApp } from './mobile/StocksApp';
import { DatingFolder } from './mobile/DatingFolder';
import { SocialFolder } from './mobile/SocialFolder';
import { TinderApp } from './mobile/TinderApp';
import { LuxeApp } from './mobile/LuxeApp';
import { BankApp } from './mobile/BankApp';
import { XApp } from './mobile/XApp';
import { YoutubeApp } from './mobile/YoutubeApp';

interface MobilePageProps {
  player?: Player;
  onAudition?: (opportunity: AuditionOpportunity) => void;
  onTakeJob?: (job: Commitment) => void;
  onQuitJob?: (id: string) => void;
  onPost?: (type: InstaPostType, caption: string) => void;
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
  const [appMode, setAppMode] = useState<'HOME' | 'CASTLINK' | 'IMDB' | 'BOXOFFICE' | 'INSTAGRAM' | 'X' | 'YOUTUBE' | 'NEWS' | 'TEAM' | 'MESSAGES' | 'FORBES' | 'STOCKS' | 'DATING_FOLDER' | 'SOCIAL_FOLDER' | 'TINDER' | 'LUXE' | 'BANK'>('HOME');
  
  if (!props.player) return null; 

  const unreadMessages = props.player.inbox?.filter(m => !m.isRead).length || 0;
  const handleUpdatePlayer = props.onUpdatePlayer || ((p: Player) => {});

  const handleTinderDateSuccess = (match: DatingMatch) => {
      // Logic to move match to relationship
      const newMatches = props.player!.dating.matches.filter(m => m.id !== match.id);
      const newRel: Relationship = {
          id: `rel_${match.id}`,
          name: match.name,
          relation: 'Partner',
          closeness: 40 + Math.floor(Math.random() * 20),
          image: match.image,
          lastInteractionWeek: props.player!.currentWeek,
          npcId: match.npcId
      };
      
      handleUpdatePlayer({
          ...props.player!,
          dating: { ...props.player!.dating, matches: newMatches },
          relationships: [...props.player!.relationships, newRel],
          logs: [...props.player!.logs, { week: props.player!.currentWeek, year: props.player!.age, message: `You started dating ${match.name}!`, type: 'positive' }]
      });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center pt-4">
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
                                    <div className="w-full h-full bg-white rounded-[5px] flex items-center justify-center shadow-sm">
                                        {/* Tiny YouTube Icon */}
                                        <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-red-600 border-b-[3px] border-b-transparent ml-0.5"></div>
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
                        onAccept={props.onAcceptMessage!} 
                        onDelete={props.onDeleteMessage!} 
                    />
                )}
                {appMode === 'TEAM' && (
                    <TeamApp 
                        player={props.player} 
                        onBack={() => setAppMode('HOME')} 
                        onHireAgent={props.onHireAgent!} 
                        onFireAgent={props.onFireAgent!} 
                        onHireManager={props.onHireManager!} 
                        onFireManager={props.onFireManager!} 
                        onPerformSponsorship={props.onPerformSponsorship!} 
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
                    <BankApp player={props.player} onBack={() => setAppMode('HOME')} onUpdatePlayer={handleUpdatePlayer} />
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

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none">
                     <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
  );
};

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
