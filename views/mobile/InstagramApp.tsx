
import React, { useState, useRef, useEffect } from 'react';
import { Player, InstaPost, InstaPostType, NPCActor, NPCState, InteractionType } from '../../types';
import { NPC_DATABASE } from '../../services/npcLogic';
import { Camera, Heart, MessageCircle, Send, Search, User, Grid, ArrowLeft, Video, Sparkles, Popcorn, Zap, XCircle, Check, Briefcase, Handshake, Smile, Lock, Coffee } from 'lucide-react';

interface InstagramAppProps {
  player: Player;
  onBack: () => void;
  onPost: (type: InstaPostType, caption: string) => void;
  onFollow: (npc: NPCActor) => void;
  onInteract: (npc: NPCActor, type: InteractionType) => void;
}

const CAPTIONS: Record<InstaPostType, string[]> = {
    'ANNOUNCEMENT': ["Excited to share this!", "Big news coming soon.", "Can't wait to show you all.", "Project update!", "Stay tuned. 👀"],
    'BTS': ["Set life. 🎬", "Behind the scenes.", "Making magic happen.", "Work mode: ON.", "Early call times."],
    'CELEBRATION': ["So grateful.", "What a night!", "Celebrating small wins.", "To new beginnings! 🥂", "Dreams coming true."],
    'LIFESTYLE': ["Current mood.", "Vibes.", "Day off.", "Living my best life.", "Weekend energy."],
    'SELFIE': ["Hi.", "Me again.", "Selfie Sunday.", "Feeling good.", "Just because."],
    'INDUSTRY_NEWS': ["Did you hear?", "Industry moves.", "Hollywood.", "Trending."]
};

export const InstagramApp: React.FC<InstagramAppProps> = ({ player, onBack, onPost, onFollow, onInteract }) => {
  const [tab, setTab] = useState<'FEED' | 'SEARCH' | 'PROFILE'>('FEED');
  const [view, setView] = useState<'MAIN' | 'NPC_PROFILE' | 'DM'>('MAIN');
  const [selectedNPC, setSelectedNPC] = useState<NPCActor | null>(null);
  
  // Post Creation State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedPresetType, setSelectedPresetType] = useState<InstaPostType>('LIFESTYLE');

  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Safe Access
  const feed = player.instagram?.feed || [];
  const posts = player.instagram?.posts || [];
  const npcStates = (player.instagram?.npcStates || {}) as Record<string, NPCState>;

  // Post Conditions
  const hasActiveRole = player.commitments.some(c => c.type === 'ACTING_GIG');
  const hasFilmingRole = player.commitments.some(c => c.type === 'ACTING_GIG' && c.projectPhase === 'PRODUCTION');
  const hasReleasedMovie = player.activeReleases.some(r => r.status === 'RUNNING' || r.status === 'BLOCKBUSTER_TRACK' || r.status === 'FLOP_WARNING');

  useEffect(() => {
      if (view === 'DM') {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [view, npcStates, selectedNPC]);

  const handleNPCClick = (npc: NPCActor) => {
      setSelectedNPC(npc);
      setView('NPC_PROFILE');
  };

  const handleOpenDM = () => {
      setView('DM');
  };

  const handleBackNav = () => {
      if (view === 'DM') {
          setView('NPC_PROFILE');
      } else if (view === 'NPC_PROFILE') {
          setView('MAIN');
          setSelectedNPC(null);
      } else {
          onBack();
      }
  };

  const formatFollowers = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return num.toLocaleString();
  };

  const getRelationshipLabel = (score: number) => {
      if (score >= 80) return { label: 'Inner Circle', color: 'text-emerald-400', bar: 'bg-emerald-500' };
      if (score >= 60) return { label: 'Close Friend', color: 'text-teal-400', bar: 'bg-teal-500' };
      if (score >= 40) return { label: 'Friendly', color: 'text-blue-400', bar: 'bg-blue-500' };
      if (score >= 20) return { label: 'Acquaintance', color: 'text-yellow-400', bar: 'bg-yellow-500' };
      return { label: 'Stranger', color: 'text-zinc-500', bar: 'bg-zinc-600' };
  };

  // Helper for Post Visuals
  const getPostStyle = (type: InstaPostType) => {
      switch(type) {
          case 'SELFIE': return 'bg-pink-500';
          case 'LIFESTYLE': return 'bg-emerald-500';
          case 'BTS': return 'bg-blue-600';
          case 'ANNOUNCEMENT': return 'bg-purple-600';
          case 'CELEBRATION': return 'bg-amber-500';
          case 'INDUSTRY_NEWS': return 'bg-red-600';
          default: return 'bg-zinc-800';
      }
  };

  const handleCreatePost = () => {
      let finalCaption = postCaption.trim();
      
      // If user didn't write anything, pick a random preset
      if (!finalCaption) {
          const caps = CAPTIONS[selectedPresetType];
          finalCaption = caps[Math.floor(Math.random() * caps.length)];
      }
      
      onPost(selectedPresetType, finalCaption);
      setIsCreatingPost(false);
      setPostCaption('');
      setSelectedPresetType('LIFESTYLE');
  };

  return (
    <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="p-4 pt-12 pb-3 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-black z-10">
            {view === 'MAIN' ? (
                <>
                    {tab === 'FEED' ? (
                        <>
                            <button onClick={onBack}><ArrowLeft size={22}/></button>
                            <div className="font-bold text-lg font-serif italic">Instagram</div>
                            <button onClick={() => setIsCreatingPost(true)}><Camera size={22} /></button>
                        </>
                    ) : (
                        <>
                            <div className="font-bold text-lg">{tab === 'SEARCH' ? 'Search' : player.instagram.handle}</div>
                            <button onClick={() => setIsCreatingPost(true)}><Camera size={22} /></button>
                        </>
                    )}
                </>
            ) : (
                <>
                    <button onClick={handleBackNav} className="p-1 -ml-2"><ArrowLeft size={22}/></button>
                    <div className="font-bold text-sm truncate flex-1 text-center pr-6">
                        {selectedNPC?.handle}
                    </div>
                </>
            )}
        </div>

        {/* --- MAIN VIEWS (FEED / SEARCH / PROFILE) --- */}
        {view === 'MAIN' && (
            <>
                {/* FEED TAB */}
                {tab === 'FEED' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
                        {/* Stories Rail */}
                        <div className="flex gap-4 p-4 border-b border-zinc-800 overflow-x-auto no-scrollbar">
                            <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => setIsCreatingPost(true)}>
                                <div className="w-16 h-16 rounded-full p-[2px] bg-zinc-800 border-2 border-zinc-800 relative">
                                    <div className="w-full h-full bg-black rounded-full p-0.5 flex items-center justify-center">
                                        <img src={player.avatar} className="w-full h-full rounded-full object-cover opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-blue-500 rounded-full p-1 border-2 border-black">
                                                <div className="text-white font-bold text-lg leading-none">+</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-zinc-400">Your Story</span>
                            </div>
                            {NPC_DATABASE.slice(0, 6).map(npc => (
                                <div key={npc.id} onClick={() => handleNPCClick(npc)} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-transform">
                                    <div className="w-16 h-16 rounded-full p-[2px] border-2 border-zinc-800">
                                        <img src={npc.avatar} className="w-full h-full rounded-full object-cover" />
                                    </div>
                                    <span className="text-[10px] text-zinc-400 truncate w-14 text-center">{npc.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>

                        {/* Posts Feed */}
                        <div className="pb-20">
                            {feed.length === 0 ? (
                                <div className="p-10 text-center text-zinc-600 text-sm">Feed is empty. Wait a week for updates!</div>
                            ) : (
                                feed.map(post => {
                                    // If author is NPC, find them to link click
                                    const authorNPC = NPC_DATABASE.find(n => n.id === post.authorId);
                                    
                                    // Fix: Use player avatar directly if it's the player's post, to avoid large base64 strings in post object
                                    const avatarSrc = post.isPlayer ? player.avatar : post.authorAvatar;

                                    return (
                                        <div key={post.id} className="mb-6 border-b border-zinc-900 pb-4">
                                            <div className="flex items-center gap-2 px-3 mb-2">
                                                <img 
                                                    src={avatarSrc} 
                                                    className="w-8 h-8 rounded-full object-cover cursor-pointer" 
                                                    onClick={() => authorNPC && handleNPCClick(authorNPC)}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-xs cursor-pointer" onClick={() => authorNPC && handleNPCClick(authorNPC)}>{post.authorHandle}</div>
                                                    {!post.isPlayer && <div className="text-[10px] text-zinc-500">Suggested for you</div>}
                                                </div>
                                            </div>
                                            
                                            {/* VISUAL */}
                                            <div className={`aspect-square w-full flex items-center justify-center relative overflow-hidden ${post.contentImage ? 'bg-black' : getPostStyle(post.type)}`}>
                                                {post.contentImage ? (
                                                    <img src={post.contentImage} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="relative z-10 text-center transform -rotate-6">
                                                        <span className="block text-white/90 font-black text-5xl uppercase tracking-tighter drop-shadow-lg scale-y-110">
                                                            {post.type.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                )}
                                                {!post.contentImage && <div className="absolute inset-0 bg-black/10"></div>}
                                            </div>

                                            <div className="px-3 mt-3">
                                                <div className="flex gap-4 mb-2">
                                                    <Heart size={22} className="hover:text-red-500 cursor-pointer transition-colors" />
                                                    <MessageCircle size={22} />
                                                    <Send size={22} />
                                                </div>
                                                <div className="font-bold text-sm mb-1">{formatFollowers(post.likes)} likes</div>
                                                <div className="text-xs text-zinc-200">
                                                    <span className="font-bold mr-2">{post.authorHandle}</span>
                                                    {post.caption}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-1 uppercase">Week {post.week}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* SEARCH TAB */}
                {tab === 'SEARCH' && (
                    <div className="flex-1 overflow-y-auto bg-black p-4 custom-scrollbar">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none"
                            />
                        </div>
                        <div className="space-y-4">
                            {NPC_DATABASE.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase())).map(npc => {
                                const isFollowing = npcStates[npc.id]?.isFollowing || false;
                                return (
                                    <div key={npc.id} onClick={() => handleNPCClick(npc)} className="flex items-center gap-3 active:bg-zinc-900 p-2 rounded-xl transition-colors cursor-pointer">
                                        <img src={npc.avatar} className="w-12 h-12 rounded-full object-cover" />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm flex items-center gap-1">
                                                {npc.name} 
                                                {npc.tier === 'A_LIST' && <div className="bg-blue-500 rounded-full p-0.5"><Check size={8} strokeWidth={4} /></div>}
                                            </div>
                                            <div className="text-xs text-zinc-500">{npc.handle}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onFollow(npc); }}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${isFollowing ? 'bg-zinc-800 text-zinc-300' : 'bg-blue-600 text-white'}`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* PROFILE TAB */}
                {tab === 'PROFILE' && (
                    <div className="flex-1 overflow-y-auto bg-black p-0 custom-scrollbar">
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                                    <img src={player.avatar} className="w-full h-full rounded-full object-cover border-2 border-black" />
                                </div>
                                <div className="flex flex-1 justify-around text-center ml-2">
                                    <div>
                                        <div className="font-bold text-sm">{posts.length}</div>
                                        <div className="text-[10px] text-zinc-400">Posts</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{formatFollowers(player.stats.followers)}</div>
                                        <div className="text-[10px] text-zinc-400">Followers</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{Object.values(npcStates).filter(s => s.isFollowing).length}</div>
                                        <div className="text-[10px] text-zinc-400">Following</div>
                                    </div>
                                </div>
                            </div>
                            <div className="font-bold text-sm">{player.name}</div>
                            <div className="text-xs text-zinc-300">Actor 🎭 | Dreamer ✨</div>
                        </div>

                        <div className="grid grid-cols-3 gap-0.5">
                            {posts.length === 0 ? (
                                <div className="col-span-3 py-10 text-center text-zinc-600 text-xs">No posts yet.</div>
                            ) : (
                                posts.map(post => (
                                    <div key={post.id} className={`aspect-square ${post.contentImage ? 'bg-black' : getPostStyle(post.type)} relative group cursor-pointer overflow-hidden`}>
                                        {post.contentImage ? (
                                            <img src={post.contentImage} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full w-full">
                                                <span className="text-[10px] font-black uppercase text-white/50 transform -rotate-12 scale-150">
                                                    {post.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1 transition-opacity z-10">
                                            <Heart size={12} fill="white"/> {formatFollowers(post.likes)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom Nav */}
                <div className="flex border-t border-zinc-800 bg-black pb-4 shrink-0">
                    <button onClick={() => setTab('FEED')} className={`flex-1 py-3 flex justify-center ${tab === 'FEED' ? 'text-white' : 'text-zinc-600'}`}><Grid size={24}/></button>
                    <button onClick={() => setTab('SEARCH')} className={`flex-1 py-3 flex justify-center ${tab === 'SEARCH' ? 'text-white' : 'text-zinc-600'}`}><Search size={24}/></button>
                    <button onClick={() => setTab('PROFILE')} className={`flex-1 py-3 flex justify-center ${tab === 'PROFILE' ? 'text-white' : 'text-zinc-600'}`}><User size={24}/></button>
                </div>
            </>
        )}

        {/* --- NPC PROFILE VIEW --- */}
        {view === 'NPC_PROFILE' && selectedNPC && (
            <div className="flex-1 overflow-y-auto bg-black p-0 custom-scrollbar animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-20 h-20 rounded-full p-[2px] border-2 border-zinc-800">
                            <img src={selectedNPC.avatar} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <div className="flex flex-1 justify-around text-center ml-2">
                            <div>
                                <div className="font-bold text-sm">--</div>
                                <div className="text-[10px] text-zinc-400">Posts</div>
                            </div>
                            <div>
                                <div className="font-bold text-sm">{formatFollowers(selectedNPC.followers)}</div>
                                <div className="text-[10px] text-zinc-400">Followers</div>
                            </div>
                            <div>
                                <div className="font-bold text-sm">--</div>
                                <div className="text-[10px] text-zinc-400">Following</div>
                            </div>
                        </div>
                    </div>
                    <div className="font-bold text-sm flex items-center gap-1">
                        {selectedNPC.name} 
                        {selectedNPC.tier === 'A_LIST' && <Check size={12} className="text-blue-500 bg-white rounded-full p-0.5" strokeWidth={4} />}
                    </div>
                    <div className="text-xs text-zinc-400 mb-2">{selectedNPC.occupation} • {selectedNPC.tier.replace('_', ' ')}</div>
                    <div className="text-xs text-zinc-300 mb-4">{selectedNPC.bio}</div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => onFollow(selectedNPC)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${npcStates[selectedNPC.id]?.isFollowing ? 'bg-zinc-800 text-white' : 'bg-blue-600 text-white'}`}
                        >
                            {npcStates[selectedNPC.id]?.isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button 
                            onClick={handleOpenDM}
                            className="flex-1 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold"
                        >
                            Message
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-0.5">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="aspect-square bg-zinc-900 opacity-50"></div>
                    ))}
                </div>
            </div>
        )}

        {view === 'DM' && selectedNPC && (
            <div className="flex-1 flex flex-col bg-black animate-in slide-in-from-right duration-300 min-h-0">
                <div className="p-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
                    <div className="flex items-center gap-4">
                        <img src={selectedNPC.avatar} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1">
                                <span className={`text-xs font-bold ${getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).color}`}>
                                    {getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).label}
                                </span>
                                <span className="text-[10px] text-zinc-500">{(npcStates[selectedNPC.id]?.relationshipScore || 0)}/100</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${getRelationshipLabel(npcStates[selectedNPC.id]?.relationshipScore || 0).bar}`} 
                                    style={{ width: `${(npcStates[selectedNPC.id]?.relationshipScore || 0)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div className="text-center text-xs text-zinc-600 py-4">Start of conversation with {selectedNPC.name}</div>
                    {npcStates[selectedNPC.id]?.chatHistory?.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                            {msg.text === 'Seen' ? (
                                <div className="text-[10px] text-zinc-600 italic px-2 py-1">Seen</div>
                            ) : (
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'PLAYER' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>

                <div className="p-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 pl-1">Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onInteract(selectedNPC, 'GREET')} disabled={player.energy.current < 5} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                            <div className="p-1.5 bg-zinc-700 rounded-full"><MessageCircle size={14} className="text-white"/></div>
                            <div className="text-left"><div className="text-xs font-bold text-white">Greet</div><div className="text-[10px] text-zinc-500">-5 Energy</div></div>
                        </button>
                        <button onClick={() => onInteract(selectedNPC, 'COMPLIMENT')} disabled={player.energy.current < 10 || (npcStates[selectedNPC.id]?.relationshipScore || 0) < 20} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-30">
                            <div className="p-1.5 bg-zinc-700 rounded-full"><Sparkles size={14} className="text-yellow-400"/></div>
                            <div className="text-left"><div className="text-xs font-bold text-white">Compliment</div><div className="text-[10px] text-zinc-500">Rel 20+ • -10E</div></div>
                        </button>
                        <button onClick={() => onInteract(selectedNPC, 'COFFEE')} disabled={player.energy.current < 15 || (npcStates[selectedNPC.id]?.relationshipScore || 0) < 40} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-30">
                            <div className="p-1.5 bg-zinc-700 rounded-full"><Coffee size={14} className="text-orange-400"/></div>
                            <div className="text-left"><div className="text-xs font-bold text-white">Coffee</div><div className="text-[10px] text-zinc-500">Rel 40+ • -15E</div></div>
                        </button>
                        <button onClick={() => onInteract(selectedNPC, 'COLLAB')} disabled={player.energy.current < 20 || (npcStates[selectedNPC.id]?.relationshipScore || 0) < 60} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-30">
                            <div className="p-1.5 bg-zinc-700 rounded-full"><Briefcase size={14} className="text-blue-400"/></div>
                            <div className="text-left"><div className="text-xs font-bold text-white">Collab</div><div className="text-[10px] text-zinc-500">Rel 60+ • -20E</div></div>
                        </button>
                    </div>
                    {(npcStates[selectedNPC.id]?.relationshipScore || 0) >= 80 && !(npcStates[selectedNPC.id]?.hasMet) && (
                        <button onClick={() => onInteract(selectedNPC, 'BEFRIEND')} className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 animate-in slide-in-from-bottom">
                            <Handshake size={16}/> Befriend & Add to Network
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* --- POST CREATOR MODAL (REDESIGNED) --- */}
        {isCreatingPost && (
            <div className="absolute inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center p-4 pt-12 bg-zinc-950 border-b border-zinc-800">
                    <button onClick={() => { setIsCreatingPost(false); setPostCaption(''); }}><XCircle size={24} className="text-zinc-500"/></button>
                    <h3 className="text-white font-bold text-lg">New Post</h3>
                    <button onClick={handleCreatePost} className="text-blue-500 font-bold text-sm">Share</button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black">
                    {/* Visual Preview (Preset based) */}
                    <div className="mb-4">
                        <div className={`w-full aspect-square bg-zinc-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-zinc-800 ${getPostStyle(selectedPresetType)}`}>
                            <div className="text-center">
                                <div className="text-white/80 font-black text-4xl uppercase tracking-tighter transform -rotate-6">
                                    {selectedPresetType.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[10px] text-white/50 mt-2 font-bold uppercase tracking-widest">Preview</div>
                            </div>
                        </div>
                    </div>

                    {/* Caption Input */}
                    <div className="mb-6">
                        <textarea 
                            value={postCaption}
                            onChange={(e) => setPostCaption(e.target.value)}
                            placeholder="Write a caption (optional)..."
                            className="w-full bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-700 min-h-[100px] text-sm"
                        />
                        <div className="text-[10px] text-zinc-500 mt-2 italic px-1">
                            *If left blank, a caption will be auto-generated based on the post type.
                        </div>
                    </div>

                    {/* Preset Types */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Post Type (Visual Theme)</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {/* LIFESTYLE */}
                            <button 
                                onClick={() => setSelectedPresetType('LIFESTYLE')}
                                className={`p-3 rounded-xl text-left border transition-all ${selectedPresetType === 'LIFESTYLE' ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-emerald-400 mb-1"><Camera size={18}/></div>
                                <div className="font-bold text-xs">Lifestyle</div>
                            </button>

                            {/* SELFIE */}
                            <button 
                                onClick={() => setSelectedPresetType('SELFIE')}
                                className={`p-3 rounded-xl text-left border transition-all ${selectedPresetType === 'SELFIE' ? 'bg-pink-900/30 border-pink-500/50' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-pink-400 mb-1"><Smile size={18}/></div>
                                <div className="font-bold text-xs">Selfie</div>
                            </button>

                            {/* BTS */}
                            <button 
                                onClick={() => { if(hasFilmingRole) setSelectedPresetType('BTS'); }}
                                disabled={!hasFilmingRole}
                                className={`p-3 rounded-xl text-left border transition-all relative ${selectedPresetType === 'BTS' ? 'bg-blue-900/30 border-blue-500/50' : !hasFilmingRole ? 'bg-zinc-950 border-zinc-900 opacity-30 cursor-not-allowed' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-blue-400 mb-1"><Video size={18}/></div>
                                <div className="font-bold text-xs">On Set (BTS)</div>
                                {!hasFilmingRole && <div className="absolute top-2 right-2 text-zinc-600"><Lock size={12}/></div>}
                            </button>

                            {/* ANNOUNCEMENT */}
                            <button 
                                onClick={() => { if(hasActiveRole) setSelectedPresetType('ANNOUNCEMENT'); }}
                                disabled={!hasActiveRole}
                                className={`p-3 rounded-xl text-left border transition-all relative ${selectedPresetType === 'ANNOUNCEMENT' ? 'bg-purple-900/30 border-purple-500/50' : !hasActiveRole ? 'bg-zinc-950 border-zinc-900 opacity-30 cursor-not-allowed' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-purple-400 mb-1"><Sparkles size={18}/></div>
                                <div className="font-bold text-xs">Announcement</div>
                                {!hasActiveRole && <div className="absolute top-2 right-2 text-zinc-600"><Lock size={12}/></div>}
                            </button>

                            {/* CELEBRATION */}
                            <button 
                                onClick={() => { if(hasReleasedMovie) setSelectedPresetType('CELEBRATION'); }}
                                disabled={!hasReleasedMovie}
                                className={`p-3 rounded-xl text-left border transition-all relative col-span-2 ${selectedPresetType === 'CELEBRATION' ? 'bg-amber-900/30 border-amber-500/50' : !hasReleasedMovie ? 'bg-zinc-950 border-zinc-900 opacity-30 cursor-not-allowed' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-amber-400 mb-1"><Popcorn size={18}/></div>
                                <div className="font-bold text-xs">Celebrate Release</div>
                                {!hasReleasedMovie && <div className="absolute top-2 right-2 text-zinc-600"><Lock size={12}/></div>}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <span className="flex items-center gap-1"><Zap size={12} className="text-amber-500"/> Cost: 10 Energy</span>
                        <span>{player.instagram.weeklyPostCount}/3 Weekly</span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
