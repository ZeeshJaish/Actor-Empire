
import React, { useState } from 'react';
import { Player, XPost, NPCActor, NPCState } from '../../types';
import { generateXFeed, generateTrendingTopics } from '../../services/xLogic';
import { NPC_DATABASE } from '../../services/npcLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { ArrowLeft, Home, Search, PenTool, Heart, Repeat, MessageCircle, MoreHorizontal, Check, User, Mail, Calendar, MapPin, Link as LinkIcon, Bell, Star } from 'lucide-react';

interface XAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type XTab = 'HOME' | 'SEARCH' | 'NOTIFICATIONS' | 'PROFILE';
type FeedTab = 'FOR_YOU' | 'FOLLOWING';

export const XApp: React.FC<XAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [tab, setTab] = useState<XTab>('HOME');
    const [feedTab, setFeedTab] = useState<FeedTab>('FOR_YOU');
    const [composeOpen, setComposeOpen] = useState(false);
    const [tweetContent, setTweetContent] = useState('');
    const [selectedProfile, setSelectedProfile] = useState<NPCActor | null>(null); // Null means viewing own profile
    
    // Initialize feed if empty or outdated
    const [feed, setFeed] = useState<XPost[]>(() => {
        if (player.x.feed.length === 0 || player.x.lastPostWeek !== player.currentWeek) {
            const newFeed = generateXFeed(player);
            // Side effect: update player logic would normally be higher up, but for sim we do it on action
            return newFeed;
        }
        return player.x.feed;
    });

    const trending = generateTrendingTopics(player);
    const npcStates = (player.instagram?.npcStates || {}) as Record<string, NPCState>;

    // --- ACTIONS ---

    const handlePost = () => {
        if (!tweetContent.trim()) return;
        
        // FIX: Don't duplicate massive avatar strings if custom.
        const avatarToSave = player.avatar.startsWith('data:') ? '' : player.avatar;

        // CALCULATE ENGAGEMENT (Improved Randomized Logic for X)
        const currentXFollowers = Math.max(0, player.x.followers);
        const fameFactor = Math.max(1, player.stats.fame);
        
        // Base reach is followers + random fame boost (Twitter algorithm can be volatile)
        // Even with 0 followers, hashtags give reach
        const baseReach = 30 + (currentXFollowers * 0.15) + (fameFactor * 40);
        
        // Quality/Timing Roll (0.5x to 2.5x - Twitter is more volatile)
        const qualityMultiplier = 0.5 + (Math.random() * 2.0);
        
        // Engagement Rate: X generally has lower engagement rate than IG (1% - 4%)
        const engagementRate = 0.01 + (Math.random() * 0.04); 
        
        let likes = Math.floor(baseReach * engagementRate * qualityMultiplier);
        
        // Pity likes for new accounts so it's not 0
        if (likes <= 0) likes = Math.floor(Math.random() * 3) + 1;

        // Viral Mechanic (Specific to X - "The Ratio" or Retweet storm)
        // Small chance to explode based on controversy/humor (Simulated)
        if (Math.random() < 0.02) {
            likes *= 8; // Viral storm
        } else if (Math.random() < 0.1) {
            likes *= 3; // Mini viral
        }

        const retweets = Math.floor(likes * (0.15 + Math.random() * 0.25)); // Higher RT ratio on X
        const replies = Math.floor(likes * (0.05 + Math.random() * 0.15));

        // CALCULATE GROWTH (Specific to X)
        // Gain ~1 follower per 20-30 likes usually, harder than IG
        // New user boost
        let conversionRate = 0.01 + (Math.random() * 0.02);
        if (currentXFollowers < 500) conversionRate += 0.05;

        let organicGain = Math.floor(likes * conversionRate);
        
        // Minimum gain for active users
        if (organicGain === 0 && likes > 10) organicGain = 1;

        const newXFollowers = currentXFollowers + organicGain;

        const newPost: XPost = {
            id: `x_post_player_${Date.now()}`,
            authorId: 'PLAYER',
            authorName: player.name,
            authorHandle: player.x.handle,
            authorAvatar: avatarToSave,
            content: tweetContent,
            timestamp: player.currentWeek,
            likes: likes,
            retweets: retweets,
            replies: replies,
            isPlayer: true,
            isLiked: false,
            isRetweeted: false,
            isVerified: player.stats.fame > 50
        };

        const updatedPosts = [newPost, ...player.x.posts];
        const updatedFeed = [newPost, ...feed];
        
        const nextPlayer = {
            ...player,
            x: {
                ...player.x,
                posts: updatedPosts,
                feed: updatedFeed,
                followers: newXFollowers,
                lastPostWeek: player.currentWeek
            }
        };
        spendPlayerEnergy(nextPlayer, 5);
        onUpdatePlayer(nextPlayer);
        
        setFeed(updatedFeed);
        setTweetContent('');
        setComposeOpen(false);
    };

    const toggleLike = (postId: string) => {
        const updatedFeed = feed.map(p => {
            if (p.id === postId) {
                return { 
                    ...p, 
                    isLiked: !p.isLiked, 
                    likes: p.isLiked ? p.likes - 1 : p.likes + 1 
                };
            }
            return p;
        });
        setFeed(updatedFeed);
        onUpdatePlayer({ ...player, x: { ...player.x, feed: updatedFeed } });
    };

    const toggleRetweet = (postId: string) => {
        const updatedFeed = feed.map(p => {
            if (p.id === postId) {
                return { 
                    ...p, 
                    isRetweeted: !p.isRetweeted, 
                    retweets: p.isRetweeted ? p.retweets - 1 : p.retweets + 1 
                };
            }
            return p;
        });
        setFeed(updatedFeed);
        onUpdatePlayer({ ...player, x: { ...player.x, feed: updatedFeed } });
    };

    const handleFollowToggle = (npc: NPCActor) => {
        const currentState = npcStates[npc.id] || {
            npcId: npc.id,
            isFollowing: false,
            isFollowedBy: false,
            relationshipScore: 0,
            relationshipLevel: 'STRANGER',
            lastInteractionWeek: 0,
            hasMet: false,
            chatHistory: []
        };

        onUpdatePlayer({
            ...player,
            instagram: {
                ...player.instagram,
                npcStates: {
                    ...player.instagram.npcStates,
                    [npc.id]: { ...currentState, isFollowing: !currentState.isFollowing }
                }
            }
        });
    };

    const handleProfileClick = (npcId: string) => {
        if (npcId === 'PLAYER') {
            setSelectedProfile(null);
            setTab('PROFILE');
        } else {
            const npc = NPC_DATABASE.find(n => n.id === npcId);
            if (npc) {
                setSelectedProfile(npc);
                setTab('PROFILE');
            }
        }
    };

    // --- HELPERS ---

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const filteredFeed = feedTab === 'FOR_YOU' 
        ? feed 
        : feed.filter(p => {
            if (p.isPlayer) return true;
            return npcStates[p.authorId]?.isFollowing;
        });

    // --- SUB-COMPONENTS ---

    const TweetCard: React.FC<{ post: XPost }> = ({ post }) => {
        // FIX: Use player avatar directly if it's the player's post
        const avatarSrc = post.isPlayer ? player.avatar : post.authorAvatar;

        return (
            <div className="p-4 flex gap-3 border-b border-zinc-800 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="shrink-0" onClick={(e) => { e.stopPropagation(); handleProfileClick(post.authorId); }}>
                    <img src={avatarSrc} className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-zinc-800" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-white truncate max-w-[140px] hover:underline" onClick={(e) => { e.stopPropagation(); handleProfileClick(post.authorId); }}>{post.authorName}</span>
                        {post.isVerified && <div className="text-blue-400"><Check size={14} className="bg-white rounded-full text-blue-500 fill-blue-500" /></div>}
                        <span className="text-zinc-500 text-sm truncate">{post.authorHandle} · {post.timestamp === player.currentWeek ? '2h' : '1d'}</span>
                    </div>
                    <div className="text-sm text-zinc-200 leading-normal mb-3 whitespace-pre-wrap">
                        {post.content}
                    </div>
                    
                    {/* Action Bar */}
                    <div className="flex justify-between text-zinc-500 max-w-xs pr-2">
                        <button className="flex items-center gap-1 group hover:text-blue-400 transition-colors">
                            <MessageCircle size={16} className="group-hover:bg-blue-500/10 rounded-full p-1 box-content transition-colors"/>
                            <span className="text-xs">{formatNumber(post.replies)}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleRetweet(post.id); }} className={`flex items-center gap-1 group transition-colors ${post.isRetweeted ? 'text-green-500' : 'hover:text-green-400'}`}>
                            <Repeat size={16} className="group-hover:bg-green-500/10 rounded-full p-1 box-content transition-colors"/>
                            <span className="text-xs">{formatNumber(post.retweets)}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }} className={`flex items-center gap-1 group transition-colors ${post.isLiked ? 'text-pink-500' : 'hover:text-pink-400'}`}>
                            <Heart size={16} fill={post.isLiked ? "currentColor" : "none"} className="group-hover:bg-pink-500/10 rounded-full p-1 box-content transition-colors"/>
                            <span className="text-xs">{formatNumber(post.likes)}</span>
                        </button>
                        <button className="flex items-center gap-1 group hover:text-blue-400">
                            <MoreHorizontal size={16} className="group-hover:bg-blue-500/10 rounded-full p-1 box-content"/>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans overflow-hidden">
            
            {/* --- HEADER --- */}
            {tab === 'HOME' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800">
                    <div className="flex justify-between items-center px-4 pt-10 pb-2">
                        <div onClick={() => { setSelectedProfile(null); setTab('PROFILE'); }} className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 cursor-pointer">
                            <img src={player.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xl font-bold">X</div>
                        <div onClick={onBack} className="p-2 -mr-2"><ArrowLeft size={20} /></div>
                    </div>
                    <div className="flex text-sm font-bold text-zinc-500">
                        <button onClick={() => setFeedTab('FOR_YOU')} className={`flex-1 py-3 text-center hover:bg-white/5 relative ${feedTab === 'FOR_YOU' ? 'text-white' : ''}`}>
                            For you
                            {feedTab === 'FOR_YOU' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full"></div>}
                        </button>
                        <button onClick={() => setFeedTab('FOLLOWING')} className={`flex-1 py-3 text-center hover:bg-white/5 relative ${feedTab === 'FOLLOWING' ? 'text-white' : ''}`}>
                            Following
                            {feedTab === 'FOLLOWING' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>}
                        </button>
                    </div>
                </div>
            ) : tab === 'SEARCH' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16}/>
                        <input type="text" placeholder="Search X" className="w-full bg-zinc-900 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:bg-black border border-zinc-800 focus:border-blue-500 transition-colors" />
                    </div>
                </div>
            ) : tab === 'PROFILE' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-2 flex items-center gap-6 border-b border-zinc-800">
                    <button onClick={() => { if(selectedProfile) setSelectedProfile(null); setTab('HOME'); }} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
                    <div>
                        <div className="font-bold text-lg leading-none">{selectedProfile ? selectedProfile.name : player.name}</div>
                        <div className="text-xs text-zinc-500">{selectedProfile ? '24' : player.x.posts.length} posts</div>
                    </div>
                </div>
            ) : (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800 font-bold text-lg">Notifications</div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* 1. HOME FEED */}
                {tab === 'HOME' && (
                    <div className="pb-20">
                        {filteredFeed.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                <div className="font-bold text-lg text-white mb-2">Welcome to X!</div>
                                <p>This is the best place to see what's happening in your world. Find some people and topics to follow now.</p>
                                <button onClick={() => setTab('SEARCH')} className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm">Let's go</button>
                            </div>
                        ) : (
                            filteredFeed.map(post => <TweetCard key={post.id} post={post} />)
                        )}
                    </div>
                )}

                {/* 2. SEARCH / EXPLORE */}
                {tab === 'SEARCH' && (
                    <div>
                        <div className="p-4 border-b border-zinc-800">
                            <h3 className="font-extrabold text-lg mb-4">Trends for you</h3>
                            <div className="space-y-5">
                                {trending.map((t, i) => (
                                    <div key={i} className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs text-zinc-500 font-bold">{t.category} · Trending</div>
                                            <div className="font-bold text-white text-base mt-0.5">{t.tag}</div>
                                            <div className="text-xs text-zinc-500 mt-0.5">{t.posts}</div>
                                        </div>
                                        <MoreHorizontal size={16} className="text-zinc-600"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 pb-20">
                            <h3 className="font-extrabold text-lg mb-4">Who to follow</h3>
                            <div className="space-y-4">
                                {NPC_DATABASE.slice(0, 5).map(npc => {
                                    const isFollowing = npcStates[npc.id]?.isFollowing;
                                    return (
                                        <div key={npc.id} onClick={() => handleProfileClick(npc.id)} className="flex items-center gap-3">
                                            <img src={npc.avatar} className="w-10 h-10 rounded-full object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white truncate flex items-center gap-1">
                                                    {npc.name} 
                                                    {(npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED') && <Check size={12} className="bg-white rounded-full text-black p-0.5" strokeWidth={4}/>}
                                                </div>
                                                <div className="text-zinc-500 text-sm truncate">{npc.handle}</div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleFollowToggle(npc); }}
                                                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${isFollowing ? 'bg-transparent border-zinc-600 text-white' : 'bg-white text-black border-white'}`}
                                            >
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PROFILE VIEW */}
                {tab === 'PROFILE' && (
                    <div className="pb-20">
                        {/* Banner */}
                        <div className="h-32 bg-zinc-800 relative">
                            {/* Ideally a banner image here */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-zinc-900 opacity-50"></div>
                        </div>
                        {/* Profile Header */}
                        <div className="px-4 relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-black absolute -top-10 bg-black overflow-hidden">
                                <img src={selectedProfile ? selectedProfile.avatar : player.avatar} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex justify-end py-3">
                                {selectedProfile ? (
                                    <div className="flex gap-2">
                                        <button className="w-9 h-9 rounded-full border border-zinc-600 flex items-center justify-center text-white"><Mail size={16}/></button>
                                        <button 
                                            onClick={() => handleFollowToggle(selectedProfile)}
                                            className={`px-5 py-1.5 rounded-full text-sm font-bold border ${npcStates[selectedProfile.id]?.isFollowing ? 'border-zinc-600 text-white' : 'bg-white text-black border-white'}`}
                                        >
                                            {npcStates[selectedProfile.id]?.isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                ) : (
                                    <button className="px-4 py-1.5 rounded-full text-sm font-bold border border-zinc-600 text-white">Edit profile</button>
                                )}
                            </div>
                            <div className="mt-1">
                                <div className="font-black text-xl text-white flex items-center gap-1">
                                    {selectedProfile ? selectedProfile.name : player.name}
                                    {((!selectedProfile && player.stats.fame > 50) || (selectedProfile && (selectedProfile.tier === 'A_LIST' || selectedProfile.tier === 'ESTABLISHED'))) && (
                                        <Check size={16} className="bg-blue-500 rounded-full text-white p-0.5" strokeWidth={4}/>
                                    )}
                                </div>
                                <div className="text-zinc-500 text-sm mb-3">{selectedProfile ? selectedProfile.handle : player.x.handle}</div>
                                <div className="text-sm text-white mb-3">
                                    {selectedProfile ? selectedProfile.bio : `Actor based in Los Angeles. Living the dream. 🎬`}
                                </div>
                                
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-zinc-500 text-sm mb-3">
                                    <div className="flex items-center gap-1"><MapPin size={14}/> Los Angeles, CA</div>
                                    <div className="flex items-center gap-1"><LinkIcon size={14}/> <span className="text-blue-400">imdb.com/name</span></div>
                                    <div className="flex items-center gap-1"><Calendar size={14}/> Joined {selectedProfile ? 'March 2018' : 'September 2024'}</div>
                                </div>

                                <div className="flex gap-4 text-sm">
                                    <div><span className="font-bold text-white">{selectedProfile ? '450' : '12'}</span> <span className="text-zinc-500">Following</span></div>
                                    {/* USE X SPECIFIC FOLLOWERS FOR PLAYER */}
                                    <div>
                                        <span className="font-bold text-white">
                                            {formatNumber(selectedProfile ? selectedProfile.followers : (player.x.followers || 0))}
                                        </span> 
                                        <span className="text-zinc-500">Followers</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Tabs */}
                        <div className="flex border-b border-zinc-800 mt-2 font-bold text-sm text-zinc-500">
                            <button className="flex-1 py-3 text-white border-b-2 border-blue-500 relative">Posts</button>
                            <button className="flex-1 py-3 hover:bg-white/5">Replies</button>
                            <button className="flex-1 py-3 hover:bg-white/5">Media</button>
                            <button className="flex-1 py-3 hover:bg-white/5">Likes</button>
                        </div>

                        {/* Profile Feed */}
                        <div>
                            {selectedProfile ? (
                                <div className="p-8 text-center text-zinc-500 text-sm">NPC posts coming soon to profile view.</div>
                            ) : (
                                player.x.posts.map(p => <TweetCard key={p.id} post={p} />)
                            )}
                        </div>
                    </div>
                )}

                {/* 4. NOTIFICATIONS */}
                {tab === 'NOTIFICATIONS' && (
                    <div className="divide-y divide-zinc-800">
                        <div className="p-4 flex gap-3 hover:bg-zinc-900">
                            <Star size={24} className="text-purple-500 fill-purple-500" />
                            <div>
                                <div className="mb-1"><img src={NPC_DATABASE[0].avatar} className="w-8 h-8 rounded-full" /></div>
                                <div className="text-sm text-zinc-300"><span className="font-bold text-white">{NPC_DATABASE[0].name}</span> liked your post</div>
                                <div className="text-zinc-500 text-sm mt-1">"Just watched a masterpiece..."</div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* --- FLOATING ACTION BUTTON --- */}
            <button 
                onClick={() => setComposeOpen(true)}
                className="absolute bottom-20 right-4 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 active:scale-90 transition-transform z-30"
            >
                <PenTool size={24} className="text-white" />
            </button>

            {/* --- BOTTOM NAV --- */}
            <div className="h-14 border-t border-zinc-800 bg-black flex justify-around items-center px-2 pb-2 shrink-0 z-30">
                <button onClick={() => setTab('HOME')} className={`p-3 rounded-full ${tab === 'HOME' ? 'text-white' : 'text-zinc-500'}`}>
                    <Home size={26} fill={tab === 'HOME' ? "currentColor" : "none"}/>
                </button>
                <button onClick={() => setTab('SEARCH')} className={`p-3 rounded-full ${tab === 'SEARCH' ? 'text-white' : 'text-zinc-500'}`}>
                    <Search size={26} strokeWidth={tab === 'SEARCH' ? 3 : 2}/>
                </button>
                <button onClick={() => setTab('NOTIFICATIONS')} className={`p-3 rounded-full ${tab === 'NOTIFICATIONS' ? 'text-white' : 'text-zinc-500'}`}>
                    <Bell size={26} fill={tab === 'NOTIFICATIONS' ? "currentColor" : "none"}/>
                </button>
                <button onClick={() => setTab('PROFILE')} className="p-3 rounded-full text-zinc-500">
                    <User size={26} fill={tab === 'PROFILE' ? "currentColor" : "none"}/>
                </button>
            </div>

            {/* --- COMPOSE MODAL --- */}
            {composeOpen && (
                <div className="absolute inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-200">
                    <div className="flex justify-between items-center p-4 pt-12">
                        <button onClick={() => setComposeOpen(false)} className="text-white text-sm">Cancel</button>
                        <button 
                            onClick={handlePost} 
                            disabled={!tweetContent.trim()}
                            className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-bold disabled:opacity-50"
                        >
                            Post
                        </button>
                    </div>
                    <div className="flex gap-3 p-4">
                        <img src={player.avatar} className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                        <textarea 
                            value={tweetContent}
                            onChange={(e) => setTweetContent(e.target.value)}
                            placeholder="What is happening?!"
                            className="flex-1 bg-transparent text-lg text-white placeholder:text-zinc-500 resize-none focus:outline-none h-40"
                            autoFocus
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
