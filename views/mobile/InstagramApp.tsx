
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, InstaPost, InstaPostType, NPCActor, NPCState, InteractionType } from '../../types';
import { NPC_DATABASE } from '../../services/npcLogic';
import { getEnabledGlobalCreatorSocialProfiles } from '../../services/youtubeLogic';
import { getInstagramPostComments, getInstagramPresetCaption, INSTAGRAM_POST_CONFIGS } from '../../services/instagramLogic';
import { loadMediaBlob, pruneMediaStore, saveMediaBlob } from '../../services/mediaStorage';
import { Camera, Heart, MessageCircle, Send, Search, User, Grid, ArrowLeft, Video, Sparkles, Popcorn, Zap, XCircle, Check, Briefcase, Handshake, Smile, Lock, Coffee, Images, Clapperboard, Flame, Shirt, Bookmark, BarChart3, ImagePlus } from 'lucide-react';

type InstagramFitMode = 'cover' | 'contain';
const INSTAGRAM_IMAGE_SIZE = 1080;

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Could not encode Instagram image.'));
        }, type, quality);
    });

const createFittedInstagramBlob = async (
    sourceUrl: string,
    zoom: number,
    offsetX: number,
    offsetY: number,
    fitMode: InstagramFitMode
): Promise<Blob> => {
    const image = await loadImageElement(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = INSTAGRAM_IMAGE_SIZE;
    canvas.height = INSTAGRAM_IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable.');

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, INSTAGRAM_IMAGE_SIZE, INSTAGRAM_IMAGE_SIZE);

    const baseScale = fitMode === 'contain'
        ? Math.min(INSTAGRAM_IMAGE_SIZE / image.naturalWidth, INSTAGRAM_IMAGE_SIZE / image.naturalHeight)
        : Math.max(INSTAGRAM_IMAGE_SIZE / image.naturalWidth, INSTAGRAM_IMAGE_SIZE / image.naturalHeight);
    const finalScale = baseScale * zoom;
    const drawWidth = image.naturalWidth * finalScale;
    const drawHeight = image.naturalHeight * finalScale;
    const maxPanX = Math.max(0, (drawWidth - INSTAGRAM_IMAGE_SIZE) / 2);
    const maxPanY = Math.max(0, (drawHeight - INSTAGRAM_IMAGE_SIZE) / 2);
    const panX = Math.max(-maxPanX, Math.min(maxPanX, offsetX));
    const panY = Math.max(-maxPanY, Math.min(maxPanY, offsetY));

    ctx.drawImage(
        image,
        (INSTAGRAM_IMAGE_SIZE - drawWidth) / 2 + panX,
        (INSTAGRAM_IMAGE_SIZE - drawHeight) / 2 + panY,
        drawWidth,
        drawHeight
    );

    return canvasToBlob(canvas, 'image/webp', 0.78);
};

const InstagramPostVisual: React.FC<{
    post: InstaPost;
    getPostStyle: (type: InstaPostType) => string;
    className?: string;
    children?: React.ReactNode;
}> = ({ post, getPostStyle, className = '', children }) => {
    const [src, setSrc] = useState<string | null>(post.contentImage || null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        if (!post.contentMediaId) {
            setSrc(post.contentImage || null);
            return undefined;
        }

        loadMediaBlob(post.contentMediaId)
            .then(blob => {
                if (!blob || cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setSrc(post.contentImage || null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [post.contentMediaId, post.contentImage]);

    return (
        <div className={`aspect-square w-full flex items-center justify-center relative overflow-hidden ${src ? 'bg-black' : getPostStyle(post.type)} ${className}`}>
            {src ? (
                <img src={src} className="w-full h-full object-cover" />
            ) : (
                <div className="relative z-10 text-center transform -rotate-6">
                    <span className="block text-white/90 font-black text-5xl uppercase tracking-tighter drop-shadow-lg scale-y-110">
                        {post.type.replace(/_/g, ' ')}
                    </span>
                </div>
            )}
            {!src && <div className="absolute inset-0 bg-black/10"></div>}
            {children}
        </div>
    );
};

interface InstagramAppProps {
  player: Player;
  onBack: () => void;
  onPost: (type: InstaPostType, caption: string, image?: string) => void;
  onReactPost: (postId: string, action: 'LIKE' | 'SAVE') => void;
  onRespondDM: (npc: NPCActor, actionId: string, accepted: boolean) => void;
  onFollow: (npc: NPCActor) => void;
  onInteract: (npc: NPCActor, type: InteractionType) => void;
}

export const InstagramApp: React.FC<InstagramAppProps> = ({ player, onBack, onPost, onReactPost, onRespondDM, onFollow, onInteract }) => {
  const [tab, setTab] = useState<'FEED' | 'SEARCH' | 'PROFILE'>('FEED');
  const [view, setView] = useState<'MAIN' | 'NPC_PROFILE' | 'DM_LIST' | 'DM' | 'POST_DETAIL'>('MAIN');
  const [dmReturnView, setDmReturnView] = useState<'DM_LIST' | 'NPC_PROFILE'>('DM_LIST');
  const [selectedNPC, setSelectedNPC] = useState<NPCActor | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstaPost | null>(null);
  
  // Post Creation State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedPresetType, setSelectedPresetType] = useState<InstaPostType>('LIFESTYLE');
  const [imageSourceUrl, setImageSourceUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [imageFitMode, setImageFitMode] = useState<InstagramFitMode>('cover');
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageError, setImageError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageSourceUrlRef = useRef<string | null>(null);
  
  // Safe Access
  const feed = player.instagram?.feed || [];
  const posts = player.instagram?.posts || [];
  const npcStates = (player.instagram?.npcStates || {}) as Record<string, NPCState>;
  const creatorProfiles = getEnabledGlobalCreatorSocialProfiles(player);
  const npcPool = [...NPC_DATABASE, ...(Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : []), ...creatorProfiles]
    .filter((npc, idx, arr) => arr.findIndex(entry => entry.id === npc.id) === idx);

  // Post Conditions
  const hasActiveRole = player.commitments.some(c => c.type === 'ACTING_GIG');
  const hasFilmingRole = player.commitments.some(c => c.type === 'ACTING_GIG' && c.projectPhase === 'PRODUCTION');
  const hasReleasedMovie = player.activeReleases.some(r => r.status === 'RUNNING' || r.status === 'BLOCKBUSTER_TRACK' || r.status === 'FLOP_WARNING');
  const hasRomance = player.relationships.some(r => r.status === 'DATING' || r.status === 'MARRIED');
  const publicFollowers = Math.max(player.stats.followers || 0, player.instagram?.followers || 0);
  const selectedConfig = INSTAGRAM_POST_CONFIGS[selectedPresetType];
  const dmContacts = npcPool
      .map(npc => ({ npc, state: npcStates[npc.id] }))
      .filter(entry => (entry.state?.chatHistory || []).length > 0)
      .sort((a, b) => {
          const aLast = a.state.chatHistory[a.state.chatHistory.length - 1]?.timestamp || 0;
          const bLast = b.state.chatHistory[b.state.chatHistory.length - 1]?.timestamp || 0;
          return bLast - aLast;
      });
  const selectedNpcState = selectedNPC ? npcStates[selectedNPC.id] : undefined;
  const selectedPendingDmAction = selectedNpcState?.chatHistory?.find(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING')?.action;

  const getDmActionTitle = (kind?: string) => {
      if (kind === 'IG_REFERRAL') return 'Referral Lead';
      if (kind === 'IG_BRAND_OFFER') return 'Paid Brand Deal';
      return 'Drama DM';
  };

  const getDmActionDetails = (action?: NPCState['chatHistory'][number]['action']) => {
      if (!action) return '';
      const payload = action.payload || {};
      if (action.kind === 'IG_BRAND_OFFER' && payload.offer) {
          const offer = payload.offer;
          return `$${Math.round(offer.weeklyPay || 0).toLocaleString()}/week • ${offer.durationWeeks || 4} weeks • ${offer.requirements?.totalRequired || 2} posts • expires in ${payload.expiresWeeks || offer.expiresIn || 3} weeks`;
      }
      if (action.kind === 'IG_REFERRAL') {
          const weeks = Math.max(1, Math.round(payload.weeksLeft || 2));
          return `Casting may respond in ${weeks}-${weeks + 1} weeks • expires in ${payload.expiresWeeks || 3} weeks`;
      }
      return 'Your reply can affect reputation and relationships.';
  };
  const selectedNpcProfilePosts = useMemo(() => {
      if (!selectedNPC) return [];
      const realPosts = feed
          .filter(post => post.authorId === selectedNPC.id || post.authorHandle === selectedNPC.handle)
          .sort((a, b) => ((b.year || 0) * 52 + (b.week || 0)) - ((a.year || 0) * 52 + (a.week || 0)));
      const accountSeed = selectedNPC.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const isBrandAccount = selectedNPC.id.startsWith('ig_brand_account_') || selectedNPC.forbesCategory === 'Brand';
      const typeCycle: InstaPostType[] = isBrandAccount
          ? ['BRAND_FIT', 'CAROUSEL', 'REEL', 'LIFESTYLE', 'BRAND_FIT', 'INDUSTRY_NEWS']
          : selectedNPC.occupation === 'DIRECTOR'
              ? ['BTS', 'INDUSTRY_NEWS', 'ANNOUNCEMENT', 'CAROUSEL', 'RED_CARPET', 'LIFESTYLE']
              : ['RED_CARPET', 'BTS', 'SELFIE', 'CAROUSEL', 'ANNOUNCEMENT', 'LIFESTYLE'];
      const captions = isBrandAccount
          ? ['New drop energy.', 'Built for the feed.', 'Creator campaign board is open.', 'Styled, shot, shipped.', 'Tiny brand, loud taste.', 'The brief is clean.']
          : selectedNPC.occupation === 'DIRECTOR'
              ? ['Back on set.', 'Frames from prep.', 'Casting week energy.', 'Quietly building something.', 'The work continues.', 'One more scene.']
              : ['Set life lately.', 'Premiere night.', 'Between takes.', 'Keeping it moving.', 'New chapter loading.', 'Grateful for the work.'];
      const syntheticPosts: InstaPost[] = Array.from({ length: 9 }).map((_, index) => {
          const type = typeCycle[(accountSeed + index) % typeCycle.length];
          const followerBase = Math.max(1000, selectedNPC.followers || 1000);
          const likes = Math.floor(followerBase * (0.012 + (((accountSeed + index * 7) % 18) / 1000)));
          return {
              id: `npc_profile_${selectedNPC.id}_${index}`,
              authorId: selectedNPC.id,
              authorName: selectedNPC.name,
              authorHandle: selectedNPC.handle,
              authorAvatar: selectedNPC.avatar,
              type,
              caption: captions[index % captions.length],
              week: Math.max(1, player.currentWeek - index),
              year: player.age,
              likes,
              comments: Math.max(4, Math.floor(likes * 0.045)),
              shares: Math.max(1, Math.floor(likes * 0.018)),
              saves: Math.max(1, Math.floor(likes * 0.03)),
              commentList: getInstagramPostComments(type, 5),
              isPlayer: false
          };
      });
      return [...realPosts, ...syntheticPosts.filter(post => !realPosts.some(real => real.id === post.id))].slice(0, 9);
  }, [selectedNPC, feed, player.age, player.currentWeek]);
  const selectedNpcPostCount = selectedNPC
      ? Math.max(
          selectedNpcProfilePosts.length,
          (selectedNPC.id.startsWith('ig_brand_account_') || selectedNPC.forbesCategory === 'Brand')
              ? 24 + (selectedNPC.followers % 40)
              : selectedNPC.tier === 'A_LIST' || selectedNPC.tier === 'ICON'
                  ? 120 + (selectedNPC.followers % 80)
                  : 45 + (selectedNPC.followers % 55)
      )
      : 0;
  const selectedNpcFollowingCount = selectedNPC
      ? Math.max(20, Math.floor(Math.sqrt(Math.max(1, selectedNPC.followers || 1)) * (selectedNPC.id.startsWith('ig_brand_account_') ? 0.9 : 1.7)))
      : 0;

  useEffect(() => {
      if (view === 'DM') {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [view, npcStates, selectedNPC]);

  useEffect(() => {
      imageSourceUrlRef.current = imageSourceUrl;
  }, [imageSourceUrl]);

  useEffect(() => {
      return () => {
          if (imageSourceUrlRef.current) URL.revokeObjectURL(imageSourceUrlRef.current);
      };
  }, []);

  const handleNPCClick = (npc: NPCActor) => {
      setSelectedNPC(npc);
      setView('NPC_PROFILE');
  };

  const handleOpenDM = () => {
      setDmReturnView('NPC_PROFILE');
      setView('DM');
  };

  const handleOpenDMInbox = () => {
      setSelectedNPC(null);
      setView('DM_LIST');
  };

  const handleOpenDMThread = (npc: NPCActor) => {
      setSelectedNPC(npc);
      setDmReturnView('DM_LIST');
      setView('DM');
  };

  const handleBackNav = () => {
      if (view === 'DM') {
          setView(dmReturnView);
      } else if (view === 'DM_LIST') {
          setView('MAIN');
      } else if (view === 'POST_DETAIL') {
          setView('MAIN');
          setSelectedPost(null);
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

  const getPostAvatar = (post: InstaPost) => {
      if (post.isPlayer) return player.avatar;
      const npc = npcPool.find(entry => entry.id === post.authorId || entry.handle === post.authorHandle);
      return post.authorAvatar || npc?.avatar || `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(post.authorHandle || post.authorName || 'IG')}`;
  };

  const getCommentAuthor = (type: InstaPostType, idx: number) => {
      const pools: Record<InstaPostType, string[]> = {
          LIFESTYLE: ['@quietfancam', '@softresetclub', '@dailycinema', '@offdaydiary', '@vibesarchive'],
          SELFIE: ['@facecardfiles', '@goldenhourfan', '@glamwatch', '@portraitclub', '@screencrushie'],
          REEL: ['@reelwatcher', '@clipculture', '@algorithmfoundme', '@editdetective', '@scrollstopper'],
          CAROUSEL: ['@slidethree', '@photodumpdaily', '@moodboardfiles', '@tinyframeclub', '@candidcorner'],
          BTS: ['@setlifeupdates', '@calltimecrew', '@filmsetwatch', '@trailerdoor', '@crewappreciation'],
          ANNOUNCEMENT: ['@castingroom', '@tradegirlie', '@franchisewatch', '@alreadyseated', '@projecttracker'],
          CELEBRATION: ['@dayonefan', '@awardseasonwatch', '@winarchive', '@careerarc', '@proudviewer'],
          RED_CARPET: ['@bestdressedwatch', '@stylistfiles', '@runwayrecap', '@lookbreakdown', '@tailoringnerd'],
          COUPLE_POST: ['@softlaunchunit', '@chemistrywatch', '@timelinecouple', '@romancearchive', '@datingdetective'],
          BRAND_FIT: ['@adwatcher', '@fitcheckdaily', '@brandbrief', '@productplacement', '@stylecommerce'],
          CONTROVERSIAL: ['@prwatchdog', '@screenshotclub', '@messyfeeds', '@quotechaos', '@damagecontrol'],
          INDUSTRY_NEWS: ['@tradepaper', '@rumorledger', '@studiohallway', '@industryplant', '@castingtea']
      };
      const pool = pools[type] || pools.LIFESTYLE;
      return pool[idx % pool.length];
  };

  const openPostDetail = (post: InstaPost) => {
      setSelectedPost(post);
      setView('POST_DETAIL');
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
      return INSTAGRAM_POST_CONFIGS[type]?.colorClass || 'bg-zinc-800';
  };

  const imageImageClass = (fitMode: InstagramFitMode) =>
      fitMode === 'contain' ? 'w-full h-full object-contain' : 'w-full h-full object-cover';

  const imageImageStyle = (zoom: number, offsetX: number, offsetY: number) => ({
      transform: `translate(${offsetX / 8}px, ${offsetY / 8}px) scale(${zoom})`,
      transformOrigin: 'center',
  });

  const resetImageDraft = () => {
      if (imageSourceUrl) URL.revokeObjectURL(imageSourceUrl);
      setImageSourceUrl(null);
      setImageZoom(1);
      setImageOffsetX(0);
      setImageOffsetY(0);
      setImageFitMode('cover');
      setImageError('');
      if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const closeCreator = () => {
      setIsCreatingPost(false);
      setPostCaption('');
      setSelectedPresetType('LIFESTYLE');
      resetImageDraft();
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          setImageError('Choose an image file for the post.');
          return;
      }
      if (file.size > 12 * 1024 * 1024) {
          setImageError('That image is too large. Try one under 12MB.');
          return;
      }
      if (imageSourceUrl) URL.revokeObjectURL(imageSourceUrl);
      setImageSourceUrl(URL.createObjectURL(file));
      setImageZoom(1);
      setImageOffsetX(0);
      setImageOffsetY(0);
      setImageFitMode('cover');
      setImageError('');
  };

  const handleCreatePost = async () => {
      if (isImageProcessing) return;
      let finalCaption = postCaption.trim();
      
      // If user didn't write anything, pick a random preset
      if (!finalCaption) {
          finalCaption = getInstagramPresetCaption(selectedPresetType);
      }

      setIsImageProcessing(true);
      let contentMediaId: string | undefined;
      try {
          if (imageSourceUrl) {
              contentMediaId = `ig_post_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const imageBlob = await createFittedInstagramBlob(imageSourceUrl, imageZoom, imageOffsetX, imageOffsetY, imageFitMode);
              await saveMediaBlob(contentMediaId, imageBlob, {
                  kind: 'instagram_post',
                  width: INSTAGRAM_IMAGE_SIZE,
                  height: INSTAGRAM_IMAGE_SIZE
              });
              await pruneMediaStore('instagram_post', { maxItems: 160, maxBytes: 80 * 1024 * 1024 });
          }
      } catch (err) {
          console.error('Instagram image processing failed', err);
          setImageError('Could not save that image. Try another photo.');
          setIsImageProcessing(false);
          return;
      }
      
      onPost(selectedPresetType, finalCaption, contentMediaId);
      setIsImageProcessing(false);
      closeCreator();
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
                            <div className="flex items-center gap-4">
                                <button onClick={handleOpenDMInbox} className="relative">
                                    <Send size={21} />
                                    {dmContacts.some(entry => entry.state.chatHistory.some(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING')) && (
                                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-black"></span>
                                    )}
                                </button>
                                <button onClick={() => setIsCreatingPost(true)}><Camera size={22} /></button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="font-bold text-lg">{tab === 'SEARCH' ? 'Search' : player.instagram.handle}</div>
                            <div className="flex items-center gap-4">
                                <button onClick={handleOpenDMInbox} className="relative">
                                    <Send size={21} />
                                    {dmContacts.some(entry => entry.state.chatHistory.some(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING')) && (
                                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-black"></span>
                                    )}
                                </button>
                                <button onClick={() => setIsCreatingPost(true)}><Camera size={22} /></button>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    <button onClick={handleBackNav} className="p-1 -ml-2"><ArrowLeft size={22}/></button>
                    <div className="font-bold text-sm truncate flex-1 text-center pr-6">
                        {view === 'POST_DETAIL' ? selectedPost?.authorHandle : view === 'DM_LIST' ? 'Messages' : selectedNPC?.handle}
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
                            {npcPool.slice(0, 6).map(npc => (
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
                                    const authorNPC = npcPool.find(n => n.id === post.authorId);
                                    
                                    // Fix: Use player avatar directly if it's the player's post, to avoid large base64 strings in post object
                                    const avatarSrc = getPostAvatar(post);

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
                                            <button onClick={() => openPostDetail(post)} className="w-full block">
                                                <InstagramPostVisual post={post} getPostStyle={getPostStyle} />
                                            </button>

                                            <div className="px-3 mt-3">
                                                <div className="flex gap-4 mb-2">
                                                    <Heart
                                                        size={22}
                                                        fill={post.hasLiked ? 'currentColor' : 'none'}
                                                        className={`cursor-pointer transition-colors ${post.hasLiked ? 'text-red-500' : 'hover:text-red-500'}`}
                                                        onClick={() => onReactPost(post.id, 'LIKE')}
                                                    />
                                                    <MessageCircle size={22} className="cursor-pointer" onClick={() => openPostDetail(post)} />
                                                    <Send size={22} />
                                                </div>
                                                <div className="font-bold text-sm mb-1">{formatFollowers(post.likes)} likes</div>
                                                <div className="text-xs text-zinc-200">
                                                    <span className="font-bold mr-2">{post.authorHandle}</span>
                                                    {post.caption}
                                                </div>
                                                <button onClick={() => openPostDetail(post)} className="text-[11px] text-zinc-500 mt-2">
                                                    View all {formatFollowers(post.comments)} comments
                                                </button>
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
                            {npcPool.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase())).map(npc => {
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
                                        <div className="font-bold text-sm">{formatFollowers(publicFollowers)}</div>
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
                                    <div key={post.id} onClick={() => openPostDetail(post)} className="relative group cursor-pointer overflow-hidden">
                                        <InstagramPostVisual post={post} getPostStyle={getPostStyle}>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                {!post.contentMediaId && !post.contentImage && (
                                                    <span className="text-[10px] font-black uppercase text-white/50 transform -rotate-12 scale-150">
                                                        {post.type.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </InstagramPostVisual>
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

        {/* --- DM INBOX VIEW --- */}
        {view === 'DM_LIST' && (
            <div className="flex-1 overflow-y-auto bg-black custom-scrollbar animate-in slide-in-from-right duration-300 p-4 pb-28">
                <div className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500 mb-1">Instagram DMs</div>
                    <div className="text-sm text-zinc-300 leading-relaxed">
                        Referrals, brand pings, and celebrity messages show up here.
                    </div>
                </div>

                {dmContacts.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-500">
                            <Send size={26} />
                        </div>
                        <div className="text-sm font-black text-zinc-300">No DMs yet</div>
                        <div className="mt-2 text-xs text-zinc-600 leading-relaxed">
                            As your Instagram grows, celebrities, directors, and small brands can message you.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dmContacts.map(({ npc, state }) => {
                            const lastMessage = state.chatHistory[state.chatHistory.length - 1];
                            const hasPending = state.chatHistory.some(msg => msg.sender === 'NPC' && msg.action?.status === 'PENDING');
                            return (
                                <button
                                    key={npc.id}
                                    onClick={() => handleOpenDMThread(npc)}
                                    className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-3 text-left active:scale-[0.99] transition-transform"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <img src={npc.avatar} className="h-12 w-12 rounded-2xl object-cover" />
                                            {hasPending && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 border-2 border-zinc-950"></span>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="truncate text-sm font-black text-white">{npc.name}</div>
                                                {npc.tier === 'A_LIST' && <Check size={12} className="text-blue-400 shrink-0" strokeWidth={4} />}
                                            </div>
                                            <div className="truncate text-xs text-zinc-500">{npc.handle}</div>
                                            <div className="mt-1 truncate text-xs text-zinc-300">
                                                {lastMessage?.sender === 'PLAYER' ? 'You: ' : ''}{lastMessage?.text || 'Open conversation'}
                                            </div>
                                        </div>
                                        <div className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${hasPending ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                                            {hasPending ? 'Action' : 'Open'}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {/* --- POST DETAIL VIEW --- */}
        {view === 'POST_DETAIL' && selectedPost && (
            <div className="flex-1 overflow-y-auto bg-black custom-scrollbar animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-3 p-4 border-b border-zinc-900">
                    <img
                        src={getPostAvatar(selectedPost)}
                        className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{selectedPost.authorName || selectedPost.authorHandle}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                            {selectedPost.authorHandle} • {INSTAGRAM_POST_CONFIGS[selectedPost.type]?.label || selectedPost.type}
                        </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-zinc-900 text-[10px] font-black text-zinc-300">
                        Week {selectedPost.week}
                    </div>
                </div>

                <InstagramPostVisual post={selectedPost} getPostStyle={getPostStyle}>
                    {!selectedPost.contentMediaId && !selectedPost.contentImage && (
                        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/25 text-[10px] font-black uppercase tracking-widest">
                            {INSTAGRAM_POST_CONFIGS[selectedPost.type]?.iconLabel || 'Post'}
                        </span>
                    )}
                </InstagramPostVisual>

                <div className="p-4 space-y-4 pb-32">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-4">
                            <Heart
                                size={24}
                                className={selectedPost.hasLiked ? 'text-red-500' : 'text-white'}
                                fill={selectedPost.hasLiked ? 'currentColor' : 'none'}
                                onClick={() => {
                                    onReactPost(selectedPost.id, 'LIKE');
                                    setSelectedPost({ ...selectedPost, hasLiked: !selectedPost.hasLiked, likes: Math.max(0, selectedPost.likes + (selectedPost.hasLiked ? -1 : 1)) });
                                }}
                            />
                            <MessageCircle size={24} />
                            <Send size={24} />
                        </div>
                        <Bookmark
                            size={23}
                            className={selectedPost.hasSaved ? 'text-yellow-400' : 'text-white'}
                            fill={selectedPost.hasSaved ? 'currentColor' : 'none'}
                            onClick={() => {
                                onReactPost(selectedPost.id, 'SAVE');
                                setSelectedPost({ ...selectedPost, hasSaved: !selectedPost.hasSaved, saves: Math.max(0, (selectedPost.saves || 0) + (selectedPost.hasSaved ? -1 : 1)) });
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 bg-zinc-950 border border-zinc-900 rounded-2xl p-3">
                            <div className="truncate text-lg font-black">{formatFollowers(selectedPost.likes)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase font-bold">Likes</div>
                        </div>
                        <div className="min-w-0 bg-zinc-950 border border-zinc-900 rounded-2xl p-3">
                            <div className="truncate text-lg font-black">{formatFollowers(selectedPost.comments)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase font-bold">Comments</div>
                        </div>
                        <div className="min-w-0 bg-zinc-950 border border-zinc-900 rounded-2xl p-3">
                            <div className="truncate text-lg font-black">{formatFollowers(selectedPost.shares || 0)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase font-bold">Shares</div>
                        </div>
                        <div className="min-w-0 bg-zinc-950 border border-zinc-900 rounded-2xl p-3">
                            <div className="truncate text-lg font-black">{formatFollowers(selectedPost.saves || 0)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase font-bold">Saves</div>
                        </div>
                    </div>

                    {selectedPost.isPlayer && selectedPost.engagementScore !== undefined && (
                        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-zinc-900 text-pink-400"><BarChart3 size={18}/></div>
                                <div className="flex-1 min-w-0">
                                <div className="text-xs font-black uppercase tracking-widest text-zinc-400">Engagement Score</div>
                                <div className="h-2 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400" style={{ width: `${selectedPost.engagementScore}%` }}></div>
                                </div>
                            </div>
                            <div className="text-xl font-black">{selectedPost.engagementScore}</div>
                        </div>
                    )}

                    <div className="text-sm text-zinc-200 leading-relaxed break-words">
                        <span className="font-black mr-2">{selectedPost.authorHandle}</span>
                        {selectedPost.caption}
                    </div>

                    <div className="space-y-3 pb-8">
                        <div className="text-xs font-black uppercase tracking-widest text-zinc-500">Comments</div>
                        {(selectedPost.commentList && selectedPost.commentList.length > 0 ? selectedPost.commentList : ['Love this.', 'Need more posts like this.', 'The feed is alive.']).map((comment, idx) => (
                            <div key={`${selectedPost.id}_comment_${idx}`} className="flex gap-3 items-start">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 via-zinc-800 to-black border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                                    {getCommentAuthor(selectedPost.type, idx).slice(1, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 bg-zinc-950 border border-zinc-900 rounded-2xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                    <div className="text-[10px] font-bold text-zinc-500 mb-1 truncate">{getCommentAuthor(selectedPost.type, idx)}</div>
                                    <div className="text-xs text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">{comment}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
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
                                <div className="font-bold text-sm">{formatFollowers(selectedNpcPostCount)}</div>
                                <div className="text-[10px] text-zinc-400">Posts</div>
                            </div>
                            <div>
                                <div className="font-bold text-sm">{formatFollowers(selectedNPC.followers)}</div>
                                <div className="text-[10px] text-zinc-400">Followers</div>
                            </div>
                            <div>
                                <div className="font-bold text-sm">{formatFollowers(selectedNpcFollowingCount)}</div>
                                <div className="text-[10px] text-zinc-400">Following</div>
                            </div>
                        </div>
                    </div>
                    <div className="font-bold text-sm flex items-center gap-1">
                        {selectedNPC.name} 
                        {selectedNPC.tier === 'A_LIST' && <Check size={12} className="text-blue-500 bg-white rounded-full p-0.5" strokeWidth={4} />}
                    </div>
                    <div className="text-xs text-zinc-400 mb-2">
                        {(selectedNPC.id.startsWith('ig_brand_account_') || selectedNPC.forbesCategory === 'Brand') ? 'BRAND' : selectedNPC.occupation} • {selectedNPC.tier.replace('_', ' ')}
                    </div>
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
                    {selectedNpcProfilePosts.map(post => (
                        <button key={post.id} onClick={() => openPostDetail(post)} className="relative block overflow-hidden active:opacity-80">
                            <InstagramPostVisual post={post} getPostStyle={getPostStyle}>
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/35 transition-colors"></div>
                                {!post.contentMediaId && !post.contentImage && (
                                    <span className="absolute bottom-2 left-2 right-2 truncate text-[8px] font-black uppercase tracking-widest text-white/70">
                                        {INSTAGRAM_POST_CONFIGS[post.type]?.shortLabel || post.type}
                                    </span>
                                )}
                            </InstagramPostVisual>
                        </button>
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
                                <div className={`max-w-[86%] p-3 rounded-2xl text-sm break-words ${msg.sender === 'PLAYER' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
                                    <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                                    {msg.sender === 'NPC' && msg.action && (
                                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-2">
                                                {getDmActionTitle(msg.action.kind)}
                                            </div>
                                            <div className="mb-3 rounded-xl bg-zinc-950/70 p-2 text-[11px] leading-relaxed text-zinc-300">
                                                {getDmActionDetails(msg.action)}
                                            </div>
                                            {msg.action.status === 'PENDING' ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => onRespondDM(selectedNPC, msg.action!.id, true)}
                                                        className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-black text-black"
                                                    >
                                                        {msg.action.kind === 'IG_BRAND_OFFER' ? 'Accept Deal' : msg.action.kind === 'IG_REFERRAL' ? 'Accept Referral' : 'Reply'}
                                                    </button>
                                                    <button
                                                        onClick={() => onRespondDM(selectedNPC, msg.action!.id, false)}
                                                        className="rounded-xl bg-zinc-700 px-3 py-2 text-[11px] font-black text-white"
                                                    >
                                                        Pass
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`text-[11px] font-black uppercase tracking-widest ${msg.action.status === 'ACCEPTED' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                    {msg.action.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>

                <div className="p-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 pl-1">Actions</div>
                    {selectedPendingDmAction ? (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                            Reply to the pending {getDmActionTitle(selectedPendingDmAction.kind).toLowerCase()} first. Quick chat is paused so you do not accidentally dodge an offer or referral.
                        </div>
                    ) : (
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
                    )}
                    {!selectedPendingDmAction && (npcStates[selectedNPC.id]?.relationshipScore || 0) >= 80 && !(npcStates[selectedNPC.id]?.hasMet) && (
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
                    <button onClick={closeCreator}><XCircle size={24} className="text-zinc-500"/></button>
                    <h3 className="text-white font-bold text-lg">New Post</h3>
                    <button onClick={handleCreatePost} disabled={isImageProcessing} className="text-blue-500 font-bold text-sm disabled:opacity-40">
                        {isImageProcessing ? 'Saving...' : 'Share'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black">
                    {/* Visual Preview (Preset based) */}
                    <div className="mb-4">
                        <div className={`w-full aspect-square bg-zinc-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-zinc-800 ${getPostStyle(selectedPresetType)}`}>
                            {imageSourceUrl ? (
                                <img
                                    src={imageSourceUrl}
                                    alt="Selected Instagram post"
                                    className={imageImageClass(imageFitMode)}
                                    style={imageImageStyle(imageZoom, imageOffsetX, imageOffsetY)}
                                />
                            ) : (
                                <div className="text-center">
                                    <div className="text-white/80 font-black text-4xl uppercase tracking-tighter transform -rotate-6">
                                        {selectedPresetType.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-[10px] text-white/50 mt-2 font-bold uppercase tracking-widest">Preview</div>
                                </div>
                            )}
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="absolute right-3 top-3 rounded-full bg-black/70 border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                            >
                                <ImagePlus size={13} /> {imageSourceUrl ? 'Change' : 'Image'}
                            </button>
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelected}
                        />
                    </div>

                    {imageSourceUrl && (
                        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setImageFitMode('cover')}
                                    className={`rounded-xl p-3 text-left border ${imageFitMode === 'cover' ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                                >
                                    <div className="font-black text-xs uppercase tracking-widest">Cover</div>
                                    <div className="text-[10px] opacity-70 mt-1">Fill square, crop edges.</div>
                                </button>
                                <button
                                    onClick={() => setImageFitMode('contain')}
                                    className={`rounded-xl p-3 text-left border ${imageFitMode === 'contain' ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                                >
                                    <div className="font-black text-xs uppercase tracking-widest">Fit Full</div>
                                    <div className="text-[10px] opacity-70 mt-1">Show whole image.</div>
                                </button>
                            </div>

                            <label className="block">
                                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Zoom</div>
                                <input type="range" min="1" max="2.4" step="0.05" value={imageZoom} onChange={(e) => setImageZoom(Number(e.target.value))} className="w-full accent-pink-500" />
                            </label>
                            <label className="block">
                                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Move Left / Right</div>
                                <input type="range" min="-320" max="320" step="5" value={imageOffsetX} onChange={(e) => setImageOffsetX(Number(e.target.value))} className="w-full accent-pink-500" />
                            </label>
                            <label className="block">
                                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Move Up / Down</div>
                                <input type="range" min="-320" max="320" step="5" value={imageOffsetY} onChange={(e) => setImageOffsetY(Number(e.target.value))} className="w-full accent-pink-500" />
                            </label>
                            <button onClick={resetImageDraft} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-black uppercase tracking-widest text-zinc-300">
                                Remove Image
                            </button>
                        </div>
                    )}

                    {imageError && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">{imageError}</div>}

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

                            <button 
                                onClick={() => setSelectedPresetType('REEL')}
                                className={`p-3 rounded-xl text-left border transition-all ${selectedPresetType === 'REEL' ? 'bg-fuchsia-900/30 border-fuchsia-500/50' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-fuchsia-400 mb-1"><Clapperboard size={18}/></div>
                                <div className="font-bold text-xs">Reel</div>
                            </button>

                            <button 
                                onClick={() => setSelectedPresetType('CAROUSEL')}
                                className={`p-3 rounded-xl text-left border transition-all ${selectedPresetType === 'CAROUSEL' ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-cyan-400 mb-1"><Images size={18}/></div>
                                <div className="font-bold text-xs">Photo Dump</div>
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

                            <button 
                                onClick={() => { if(hasReleasedMovie || player.stats.fame >= 20) setSelectedPresetType('RED_CARPET'); }}
                                disabled={!hasReleasedMovie && player.stats.fame < 20}
                                className={`p-3 rounded-xl text-left border transition-all relative ${selectedPresetType === 'RED_CARPET' ? 'bg-rose-900/30 border-rose-500/50' : (!hasReleasedMovie && player.stats.fame < 20) ? 'bg-zinc-950 border-zinc-900 opacity-30 cursor-not-allowed' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-rose-400 mb-1"><Sparkles size={18}/></div>
                                <div className="font-bold text-xs">Red Carpet</div>
                                {!hasReleasedMovie && player.stats.fame < 20 && <div className="absolute top-2 right-2 text-zinc-600"><Lock size={12}/></div>}
                            </button>

                            <button 
                                onClick={() => { if(hasRomance) setSelectedPresetType('COUPLE_POST'); }}
                                disabled={!hasRomance}
                                className={`p-3 rounded-xl text-left border transition-all relative ${selectedPresetType === 'COUPLE_POST' ? 'bg-red-900/30 border-red-500/50' : !hasRomance ? 'bg-zinc-950 border-zinc-900 opacity-30 cursor-not-allowed' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-red-400 mb-1"><Heart size={18}/></div>
                                <div className="font-bold text-xs">Couple Post</div>
                                {!hasRomance && <div className="absolute top-2 right-2 text-zinc-600"><Lock size={12}/></div>}
                            </button>

                            <button 
                                onClick={() => { if(publicFollowers >= 1000 || player.stats.fame >= 15) setSelectedPresetType('BRAND_FIT'); }}
                                disabled={publicFollowers < 1000 && player.stats.fame < 15}
                                className={`p-3 rounded-xl text-left border transition-all relative ${selectedPresetType === 'BRAND_FIT' ? 'bg-lime-900/30 border-lime-500/50' : (publicFollowers < 1000 && player.stats.fame < 15) ? 'bg-zinc-950 border-zinc-900 opacity-30 cursor-not-allowed' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-lime-400 mb-1"><Shirt size={18}/></div>
                                <div className="font-bold text-xs">Brand Fit</div>
                                {publicFollowers < 1000 && player.stats.fame < 15 && <div className="absolute top-2 right-2 text-zinc-600"><Lock size={12}/></div>}
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

                            <button 
                                onClick={() => setSelectedPresetType('CONTROVERSIAL')}
                                className={`p-3 rounded-xl text-left border transition-all relative col-span-2 ${selectedPresetType === 'CONTROVERSIAL' ? 'bg-red-950/50 border-red-500/60' : 'bg-zinc-900 border-transparent opacity-60'}`}
                            >
                                <div className="text-red-400 mb-1"><Flame size={18}/></div>
                                <div className="font-bold text-xs">Hot Take</div>
                                <div className="text-[10px] text-zinc-500 mt-1">High reach, backlash risk.</div>
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <span className="flex items-center gap-1"><Zap size={12} className="text-amber-500"/> Cost: {selectedConfig.energy} Energy</span>
                        <span>{player.instagram.weeklyPostCount}/3 Weekly</span>
                    </div>
                    <div className="mt-3 text-[11px] text-zinc-400 bg-zinc-950 border border-zinc-900 p-3 rounded-xl leading-relaxed">
                        <span className={`font-black ${selectedConfig.accentClass}`}>{selectedConfig.label}: </span>
                        {selectedConfig.description}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
