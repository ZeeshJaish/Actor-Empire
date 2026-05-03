
import React, { useMemo, useState } from 'react';
import { Player, XPost, NPCActor, NPCState } from '../../types';
import { generateXFeed, generateTrendingTopics } from '../../services/xLogic';
import { NPC_DATABASE } from '../../services/npcLogic';
import { getEnabledGlobalCreatorSocialProfiles } from '../../services/youtubeLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { ArrowLeft, Home, Search, PenTool, Heart, Repeat, MessageCircle, MoreHorizontal, Check, User, Mail, Calendar, MapPin, Link as LinkIcon, Bell, Star, XCircle, Flame, ShieldCheck, Laugh, Megaphone, Film, Users, MessageSquareQuote } from 'lucide-react';

interface XAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type XTab = 'HOME' | 'SEARCH' | 'NOTIFICATIONS' | 'PROFILE';
type FeedTab = 'FOR_YOU' | 'FOLLOWING';
type XView = 'MAIN' | 'POST_DETAIL';
type XPostType = NonNullable<XPost['postType']>;
type XReplyTone = 'SUPPORT' | 'JOKE' | 'CLAP_BACK' | 'CLARIFY' | 'APOLOGIZE';

const X_POST_TYPES: Record<XPostType, {
    label: string;
    prompt: string;
    icon: React.ElementType;
    reach: number;
    conversion: number;
    controversy: number;
    reputation: number;
    placeholder: string;
}> = {
    CAREER: { label: 'Career', prompt: 'Career Update', icon: Megaphone, reach: 1.25, conversion: 0.026, controversy: 0, reputation: 1, placeholder: 'Share a career update...' },
    HOT_TAKE: { label: 'Hot Take', prompt: 'Hot Take', icon: Flame, reach: 1.65, conversion: 0.018, controversy: 7, reputation: -1, placeholder: 'Say the thing Film Twitter will argue about...' },
    JOKE: { label: 'Joke', prompt: 'Joke', icon: Laugh, reach: 1.35, conversion: 0.024, controversy: 2, reputation: 0, placeholder: 'Post something funny...' },
    FILM_OPINION: { label: 'Film', prompt: 'Film Opinion', icon: Film, reach: 1.2, conversion: 0.02, controversy: 2, reputation: 1, placeholder: 'Share a film opinion...' },
    PR_STATEMENT: { label: 'PR', prompt: 'PR Statement', icon: ShieldCheck, reach: 0.85, conversion: 0.012, controversy: -6, reputation: 2, placeholder: 'Make a clean public statement...' },
    DRAMA_REPLY: { label: 'Drama', prompt: 'Drama Reply', icon: MessageSquareQuote, reach: 1.85, conversion: 0.016, controversy: 10, reputation: -2, placeholder: 'Reply to the discourse...' },
    FAN_THANKS: { label: 'Fans', prompt: 'Fan Thank You', icon: Users, reach: 1.05, conversion: 0.032, controversy: -1, reputation: 1, placeholder: 'Thank the fans...' },
    GENERAL: { label: 'General', prompt: 'General Post', icon: PenTool, reach: 1, conversion: 0.02, controversy: 0, reputation: 0, placeholder: 'What is happening?!' }
};

const X_REPLY_TONES: Record<XReplyTone, { label: string; text: string; controversy: number; reputation: number; reach: number }> = {
    SUPPORT: { label: 'Support', text: 'This is fair. People should actually read the full context.', controversy: -1, reputation: 1, reach: 0.8 },
    JOKE: { label: 'Joke', text: 'The timeline chose chaos today and somehow I respect it.', controversy: 2, reputation: 0, reach: 1.1 },
    CLAP_BACK: { label: 'Clap Back', text: 'Wild take. Loud does not always mean right.', controversy: 8, reputation: -1, reach: 1.65 },
    CLARIFY: { label: 'Clarify', text: 'Quick context before this turns into something it is not.', controversy: -4, reputation: 2, reach: 0.9 },
    APOLOGIZE: { label: 'Apologize', text: 'I hear the criticism. That could have been said better.', controversy: -8, reputation: 2, reach: 0.65 }
};

const X_REPLY_BANK: Record<XPostType, string[]> = {
    CAREER: ['Booked and busy era?', 'This sounds bigger than people realize.', 'Casting directors are watching.', 'The resume is moving.'],
    HOT_TAKE: ['The quotes are about to be a war zone.', 'Honestly? Not completely wrong.', 'Delete this before brunch.', 'Film Twitter found its lunch today.'],
    JOKE: ['Okay this one got me.', 'Rare good celebrity joke.', 'The timing is too clean.', 'I hate that I laughed.'],
    FILM_OPINION: ['Cinema discourse is alive.', 'This is a brave ranking.', 'Respectfully disagree but I see it.', 'You can tell they actually watch movies.'],
    PR_STATEMENT: ['This is the mature version.', 'PR team finally slept tonight.', 'Good clarification.', 'Clean statement, no notes.'],
    DRAMA_REPLY: ['The timeline is awake.', 'This is getting screenshotted.', 'PR is sweating.', 'This reply changed the whole conversation.'],
    FAN_THANKS: ['Day one fans are emotional.', 'This is why people root for you.', 'Simple and sweet.', 'The fanbase needed this.'],
    GENERAL: ['Real.', 'The timeline gets it.', 'Mood.', 'This app is unserious.']
};

export const XApp: React.FC<XAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [tab, setTab] = useState<XTab>('HOME');
    const [view, setView] = useState<XView>('MAIN');
    const [feedTab, setFeedTab] = useState<FeedTab>('FOR_YOU');
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeType, setComposeType] = useState<XPostType>('GENERAL');
    const [tweetContent, setTweetContent] = useState('');
    const [selectedProfile, setSelectedProfile] = useState<NPCActor | null>(null); // Null means viewing own profile
    const [selectedPost, setSelectedPost] = useState<XPost | null>(null);
    
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
    const npcPool = useMemo(() => {
        const creators = getEnabledGlobalCreatorSocialProfiles(player);
        return [...NPC_DATABASE, ...(Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : []), ...creators]
            .filter((npc, index, arr) => arr.findIndex(entry => entry.id === npc.id) === index) as NPCActor[];
    }, [player]);
    const profilePosts = useMemo(() => {
        if (!selectedProfile) return player.x.posts;
        const realPosts = feed.filter(post => post.authorId === selectedProfile.id);
        const syntheticPosts: XPost[] = Array.from({ length: 8 }).map((_, index) => {
            const types: XPostType[] = selectedProfile.occupation === 'DIRECTOR'
                ? ['FILM_OPINION', 'CAREER', 'GENERAL', 'PR_STATEMENT']
                : ['CAREER', 'JOKE', 'FILM_OPINION', 'FAN_THANKS'];
            const postType = types[(selectedProfile.id.charCodeAt(0) + index) % types.length];
            const likes = Math.max(20, Math.floor((selectedProfile.followers || 1000) * (0.001 + ((index + 2) * 0.0007))));
            return {
                id: `x_profile_${selectedProfile.id}_${index}`,
                authorId: selectedProfile.id,
                authorName: selectedProfile.name,
                authorHandle: selectedProfile.handle,
                authorAvatar: selectedProfile.avatar,
                content: [
                    'Long day, good work.',
                    'Every project teaches you something.',
                    'The industry is quieter than people think until it suddenly is not.',
                    'Reading a script that understands silence.',
                    'Grateful for the people still showing up.',
                    'Film discourse is better when people actually watch the film.',
                    'Back on set soon.',
                    'Some rumors are funnier than the truth.'
                ][index],
                timestamp: Math.max(1, player.currentWeek - index),
                likes,
                retweets: Math.floor(likes * 0.18),
                replies: Math.floor(likes * 0.08),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: selectedProfile.tier === 'A_LIST' || selectedProfile.tier === 'ESTABLISHED',
                postType,
                replyList: X_REPLY_BANK[postType].slice(0, 3),
                quoteList: ['Interesting timing.', 'This has layers.', 'The replies are better than the trades.'],
                sentiment: postType === 'JOKE' ? 'FUNNY' : postType === 'HOT_TAKE' ? 'MESSY' : 'NEUTRAL'
            };
        });
        return [...realPosts, ...syntheticPosts].slice(0, 12);
    }, [feed, player.currentWeek, player.x.posts, selectedProfile]);

    // --- ACTIONS ---

    const handlePost = () => {
        if (!tweetContent.trim()) return;
        
        // FIX: Don't duplicate massive avatar strings if custom.
        const avatarToSave = player.avatar.startsWith('data:') ? '' : player.avatar;

        // CALCULATE ENGAGEMENT (Improved Randomized Logic for X)
        const currentXFollowers = Math.max(0, player.x.followers);
        const fameFactor = Math.max(1, player.stats.fame);
        const typeConfig = X_POST_TYPES[composeType];
        
        // Base reach is followers + random fame boost (Twitter algorithm can be volatile)
        // Even with 0 followers, hashtags give reach
        const baseReach = (30 + (currentXFollowers * 0.15) + (fameFactor * 40)) * typeConfig.reach;
        
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
        let conversionRate = typeConfig.conversion + (Math.random() * 0.012);
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
            isVerified: player.stats.fame > 50,
            postType: composeType,
            replyList: X_REPLY_BANK[composeType].sort(() => 0.5 - Math.random()).slice(0, 4),
            quoteList: [
                'This is spreading outside the fandom.',
                'Someone in the industry definitely saw this.',
                'The replies are doing the most.',
                'This is the kind of post that changes the week.'
            ].sort(() => 0.5 - Math.random()).slice(0, 2),
            controversyScore: Math.max(0, typeConfig.controversy + Math.floor(Math.random() * 4)),
            sentiment: typeConfig.controversy >= 7 ? 'MESSY' : composeType === 'JOKE' ? 'FUNNY' : composeType === 'CAREER' ? 'INDUSTRY' : 'NEUTRAL'
        };

        const updatedPosts = [newPost, ...player.x.posts];
        const updatedFeed = [newPost, ...feed];
        const reputationDelta = typeConfig.reputation;
        const controversyDelta = Math.max(-8, typeConfig.controversy);
        const logType = controversyDelta >= 7 ? 'negative' as const : 'positive' as const;
        
        const nextPlayer = {
            ...player,
            stats: {
                ...player.stats,
                reputation: Math.max(0, Math.min(100, player.stats.reputation + reputationDelta)),
                fame: Math.max(0, Math.min(100, player.stats.fame + (likes >= 500 ? 1 : 0)))
            },
            x: {
                ...player.x,
                posts: updatedPosts,
                feed: updatedFeed,
                followers: newXFollowers,
                lastPostWeek: player.currentWeek
            },
            instagram: {
                ...player.instagram,
                controversy: Math.max(0, Math.min(100, (player.instagram.controversy || 0) + Math.max(0, controversyDelta)))
            },
            logs: [{ week: player.currentWeek, year: player.age, message: controversyDelta >= 7 ? `X heated up after your ${typeConfig.label.toLowerCase()} post.` : `Posted a ${typeConfig.label.toLowerCase()} update on X.`, type: logType }, ...player.logs].slice(0, 50)
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

    const openPostDetail = (post: XPost) => {
        setSelectedPost(post);
        setView('POST_DETAIL');
    };

    const handleQuoteOrReply = (post: XPost, tone: XReplyTone, mode: 'QUOTE' | 'REPLY') => {
        const toneConfig = X_REPLY_TONES[tone];
        const sourceReach = Math.max(40, post.likes + post.retweets * 2 + post.replies * 4);
        const reach = Math.floor(sourceReach * toneConfig.reach * (0.2 + Math.random() * 0.25));
        const likes = Math.max(1, Math.floor(reach * (0.08 + Math.random() * 0.08)));
        const retweets = Math.floor(likes * (mode === 'QUOTE' ? 0.35 : 0.18));
        const replies = Math.floor(likes * (toneConfig.controversy > 4 ? 0.28 : 0.1));
        const gainedFollowers = Math.max(0, Math.floor(likes * (toneConfig.controversy > 4 ? 0.012 : 0.018)));
        const newPost: XPost = {
            id: `x_${mode.toLowerCase()}_${Date.now()}`,
            authorId: 'PLAYER',
            authorName: player.name,
            authorHandle: player.x.handle,
            authorAvatar: player.avatar.startsWith('data:') ? '' : player.avatar,
            content: mode === 'QUOTE' ? `${toneConfig.text}\n\nQuote: "${post.content}"` : toneConfig.text,
            timestamp: player.currentWeek,
            likes,
            retweets,
            replies,
            isPlayer: true,
            isLiked: false,
            isRetweeted: false,
            isVerified: player.stats.fame > 50,
            postType: tone === 'CLAP_BACK' ? 'DRAMA_REPLY' : tone === 'JOKE' ? 'JOKE' : tone === 'CLARIFY' || tone === 'APOLOGIZE' ? 'PR_STATEMENT' : 'GENERAL',
            quoteOfId: mode === 'QUOTE' ? post.id : undefined,
            replyList: X_REPLY_BANK[tone === 'CLAP_BACK' ? 'DRAMA_REPLY' : tone === 'JOKE' ? 'JOKE' : 'PR_STATEMENT'].slice(0, 4),
            quoteList: ['This reply changed the tone.', 'The timeline is watching.', 'Smart move.', 'Risky but effective.'],
            controversyScore: Math.max(0, toneConfig.controversy),
            sentiment: toneConfig.controversy >= 6 ? 'MESSY' : tone === 'JOKE' ? 'FUNNY' : 'NEUTRAL'
        };
        const updatedFeed = [newPost, ...feed].slice(0, 80);
        const updatedPosts = [newPost, ...player.x.posts].slice(0, 80);
        const nextPlayer = {
            ...player,
            stats: {
                ...player.stats,
                reputation: Math.max(0, Math.min(100, player.stats.reputation + toneConfig.reputation)),
                fame: Math.max(0, Math.min(100, player.stats.fame + (likes >= 1000 ? 1 : 0)))
            },
            x: {
                ...player.x,
                posts: updatedPosts,
                feed: updatedFeed,
                followers: player.x.followers + gainedFollowers
            },
            instagram: {
                ...player.instagram,
                controversy: Math.max(0, Math.min(100, (player.instagram.controversy || 0) + Math.max(0, toneConfig.controversy)))
            },
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: mode === 'QUOTE'
                    ? `Quoted ${post.authorName} on X.`
                    : `Replied to ${post.authorName} on X.`,
                type: toneConfig.controversy >= 6 ? 'negative' as const : 'positive' as const
            }, ...player.logs].slice(0, 50)
        };
        spendPlayerEnergy(nextPlayer, mode === 'QUOTE' ? 8 : 5);
        setFeed(updatedFeed);
        setSelectedPost(newPost);
        onUpdatePlayer(nextPlayer);
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
            const npc = npcPool.find(n => n.id === npcId);
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
    const activeComposeConfig = X_POST_TYPES[composeType];
    const composeImpact = [
        { label: 'Reach', value: `x${activeComposeConfig.reach.toFixed(1)}`, color: 'text-blue-300' },
        { label: 'Followers', value: activeComposeConfig.conversion >= 0.028 ? 'High' : activeComposeConfig.conversion >= 0.02 ? 'Medium' : 'Low', color: 'text-emerald-300' },
        { label: 'Heat', value: activeComposeConfig.controversy > 6 ? 'Risky' : activeComposeConfig.controversy > 0 ? `+${activeComposeConfig.controversy}` : activeComposeConfig.controversy < 0 ? 'Cools' : 'Low', color: activeComposeConfig.controversy > 0 ? 'text-red-300' : activeComposeConfig.controversy < 0 ? 'text-emerald-300' : 'text-zinc-300' },
        { label: 'Rep', value: activeComposeConfig.reputation > 0 ? `+${activeComposeConfig.reputation}` : activeComposeConfig.reputation < 0 ? `${activeComposeConfig.reputation}` : '0', color: activeComposeConfig.reputation >= 0 ? 'text-emerald-300' : 'text-rose-300' }
    ];

    // --- SUB-COMPONENTS ---

    const TweetCard: React.FC<{ post: XPost }> = ({ post }) => {
        // FIX: Use player avatar directly if it's the player's post
        const avatarSrc = post.isPlayer ? player.avatar : post.authorAvatar;

        return (
            <div onClick={() => openPostDetail(post)} className="p-4 flex gap-3 border-b border-zinc-800 hover:bg-white/5 transition-colors cursor-pointer">
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
                    {post.quoteOfId && (
                        <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                            Quoted post
                        </div>
                    )}
                    
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
            {view === 'POST_DETAIL' && selectedPost && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800 flex items-center gap-4">
                        <button onClick={() => { setView('MAIN'); setSelectedPost(null); }} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="font-black text-lg leading-none">Post</div>
                            <div className="text-[11px] text-zinc-500 uppercase tracking-widest">{X_POST_TYPES[selectedPost.postType || 'GENERAL'].label}</div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex gap-3">
                                <img src={selectedPost.isPlayer ? player.avatar : selectedPost.authorAvatar} className="w-12 h-12 rounded-full object-cover bg-zinc-800" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                        <div className="font-black text-white truncate">{selectedPost.authorName}</div>
                                        {selectedPost.isVerified && <Check size={14} className="text-blue-400" />}
                                    </div>
                                    <div className="text-sm text-zinc-500">{selectedPost.authorHandle}</div>
                                </div>
                            </div>
                            <div className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed text-white">{selectedPost.content}</div>
                            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-widest">
                                <span className="rounded-full bg-zinc-900 px-3 py-1 text-zinc-400">{selectedPost.timestamp === player.currentWeek ? 'This week' : `Week ${selectedPost.timestamp}`}</span>
                                {(selectedPost.controversyScore || 0) > 0 && <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-300">Heat {selectedPost.controversyScore}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 border-b border-zinc-800 text-center">
                            <div className="p-3"><div className="font-black">{formatNumber(selectedPost.replies)}</div><div className="text-[10px] text-zinc-500 uppercase">Replies</div></div>
                            <div className="p-3 border-x border-zinc-800"><div className="font-black">{formatNumber(selectedPost.retweets)}</div><div className="text-[10px] text-zinc-500 uppercase">Reposts</div></div>
                            <div className="p-3"><div className="font-black">{formatNumber(selectedPost.likes)}</div><div className="text-[10px] text-zinc-500 uppercase">Likes</div></div>
                        </div>

                        {!selectedPost.isPlayer && (
                            <div className="p-4 border-b border-zinc-800">
                                <div className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Respond</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(X_REPLY_TONES) as XReplyTone[]).map(tone => (
                                        <button
                                            key={tone}
                                            onClick={() => handleQuoteOrReply(selectedPost, tone, tone === 'SUPPORT' || tone === 'CLARIFY' ? 'REPLY' : 'QUOTE')}
                                            disabled={player.energy.current < 5}
                                            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-left disabled:opacity-40"
                                        >
                                            <div className="text-sm font-black text-white">{X_REPLY_TONES[tone].label}</div>
                                            <div className="mt-1 text-[11px] leading-snug text-zinc-500">{tone === 'CLAP_BACK' ? 'High reach, risky.' : tone === 'APOLOGIZE' ? 'Cools backlash.' : 'Public reply.'}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-4 space-y-4">
                            <div>
                                <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Replies</div>
                                {(selectedPost.replyList && selectedPost.replyList.length > 0 ? selectedPost.replyList : X_REPLY_BANK[selectedPost.postType || 'GENERAL']).map((reply, index) => (
                                    <div key={`${selectedPost.id}_reply_${index}`} className="flex gap-3 border-b border-zinc-900 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-black text-zinc-400">@</div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-zinc-500">@timeline_{index + 1}</div>
                                            <div className="text-sm leading-relaxed text-zinc-200">{reply}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Quotes</div>
                                {(selectedPost.quoteList && selectedPost.quoteList.length > 0 ? selectedPost.quoteList : ['People are watching this one.']).map((quote, index) => (
                                    <div key={`${selectedPost.id}_quote_${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300 mb-2">
                                        <span className="font-bold text-white">@quote_room_{index + 1}</span> {quote}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
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
                                {npcPool.slice(0, 5).map(npc => {
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
                            {profilePosts.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 text-sm">No posts yet.</div>
                            ) : (
                                profilePosts.map(p => <TweetCard key={p.id} post={p} />)
                            )}
                        </div>
                    </div>
                )}

                {/* 4. NOTIFICATIONS */}
                {tab === 'NOTIFICATIONS' && (
                    <div className="divide-y divide-zinc-800">
                        {player.x.posts.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">Post on X to start getting notifications.</div>
                        ) : player.x.posts.slice(0, 6).map((post, index) => {
                            const npc = npcPool[(index * 3) % npcPool.length] || NPC_DATABASE[0];
                            const action = index % 3 === 0 ? 'liked' : index % 3 === 1 ? 'reposted' : 'replied to';
                            return (
                                <button key={`${post.id}_note_${index}`} onClick={() => openPostDetail(post)} className="w-full p-4 flex gap-3 hover:bg-zinc-900 text-left">
                                    {action === 'liked' ? <Star size={24} className="text-purple-500 fill-purple-500 shrink-0" /> : action === 'reposted' ? <Repeat size={24} className="text-green-500 shrink-0" /> : <MessageCircle size={24} className="text-blue-400 shrink-0" />}
                                    <div className="min-w-0">
                                        <div className="mb-1"><img src={npc.avatar} className="w-8 h-8 rounded-full object-cover" /></div>
                                        <div className="text-sm text-zinc-300"><span className="font-bold text-white">{npc.name}</span> {action} your post</div>
                                        <div className="truncate text-zinc-500 text-sm mt-1">"{post.content}"</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* --- FLOATING ACTION BUTTON --- */}
            <button 
                onClick={() => { setComposeType('GENERAL'); setComposeOpen(true); }}
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
                    <div className="px-4 pt-12 pb-3 border-b border-zinc-900 flex items-center justify-between bg-black/95 shrink-0">
                        <button
                            onClick={() => setComposeOpen(false)}
                            className="rounded-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-300 active:scale-95 transition-transform"
                        >
                            Cancel
                        </button>
                        <div className="text-center">
                            <div className="font-black text-lg leading-tight">X Studio</div>
                            <div className="text-[9px] text-blue-400 font-black uppercase tracking-[0.25em]">Create Post</div>
                        </div>
                        <div className="w-[76px]" />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-36">
                        <div className="p-4 space-y-4">
                            <div className="rounded-[1.75rem] border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-4 shadow-2xl">
                                <div className="flex gap-3">
                                    <img src={player.avatar} className="w-11 h-11 rounded-full object-cover border border-zinc-800 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <div className="font-black text-white truncate">{player.name}</div>
                                            {player.stats.fame > 50 && <Check size={14} className="text-blue-400" />}
                                            <div className="text-zinc-500 text-sm truncate">{player.x.handle}</div>
                                        </div>
                                        <div className="mt-2 min-h-[76px] whitespace-pre-wrap text-[17px] leading-relaxed text-white">
                                            {tweetContent || <span className="text-zinc-600">{activeComposeConfig.placeholder}</span>}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                                                {activeComposeConfig.label}
                                            </span>
                                            {activeComposeConfig.controversy > 0 && (
                                                <span className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-300">
                                                    Heat +{activeComposeConfig.controversy}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{activeComposeConfig.prompt}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${tweetContent.trim() ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                        {tweetContent.trim() ? 'Ready' : 'Required'}
                                    </div>
                                </div>
                                <textarea
                                    value={tweetContent}
                                    onChange={(e) => setTweetContent(e.target.value)}
                                    placeholder={activeComposeConfig.placeholder}
                                    className="w-full bg-black text-lg text-white placeholder:text-zinc-600 resize-none focus:outline-none min-h-[132px] rounded-2xl border border-zinc-800 focus:border-blue-500 p-4"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="px-1">
                                    <div className="text-xs font-black text-zinc-400 uppercase tracking-[0.22em]">Public Voice</div>
                                    <div className="text-[11px] text-zinc-600 mt-1">Choose how the timeline reads this post.</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(X_POST_TYPES) as XPostType[]).filter(type => type !== 'DRAMA_REPLY').map(type => {
                                        const config = X_POST_TYPES[type];
                                        const Icon = config.icon;
                                        const isSelected = composeType === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setComposeType(type)}
                                                className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${isSelected ? 'bg-white text-black border-white shadow-[0_0_28px_rgba(255,255,255,0.08)]' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-black text-white' : 'bg-black border border-zinc-800 text-blue-300'}`}>
                                                        <Icon size={15} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-xs uppercase tracking-wide truncate">{config.label}</div>
                                                        <div className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                                            x{config.reach.toFixed(1)} reach
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-zinc-800 bg-gradient-to-br from-zinc-950 to-black p-4">
                                <div className="text-sm font-black text-white">Timeline Forecast</div>
                                <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                    X is volatile. Small accounts can still get discovered, but heat can spill into reputation and future events.
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {composeImpact.map(item => (
                                        <div key={item.label} className="rounded-2xl bg-black border border-zinc-900 p-2">
                                            <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">{item.label}</div>
                                            <div className={`text-xs font-black mt-1 ${item.color}`}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent px-4 pt-10 pb-8">
                        <button
                            onClick={handlePost}
                            disabled={!tweetContent.trim()}
                            className="pointer-events-auto w-full rounded-[1.4rem] bg-gradient-to-r from-blue-600 to-sky-400 py-4 text-white font-black tracking-wide shadow-[0_18px_45px_rgba(37,99,235,0.28)] disabled:opacity-50 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 active:scale-[0.99] transition-transform"
                        >
                            Post to X
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
