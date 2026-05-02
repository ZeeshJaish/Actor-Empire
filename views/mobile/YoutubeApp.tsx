
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, YoutubeBrandDeal, YoutubeCollabOffer, YoutubeCreatorIdentity, YoutubeMerchTier, YoutubeUploadPlan, YoutubeVideo, YoutubeVideoType } from '../../types';
import { calculateYoutubeCreatorScore, generateYoutubeFeed, getWeeksSinceYoutubeUpload, getYoutubePublicImageLabel, YOUTUBE_MONETIZATION_SUBS, YOUTUBE_MONETIZATION_VIEWS } from '../../services/youtubeLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { loadMediaBlob, pruneMediaStore, saveMediaBlob } from '../../services/mediaStorage';
import { ArrowLeft, Play, TrendingUp, DollarSign, Users, Plus, Lock, Home, Layout, Search, Bell, MonitorPlay, Sparkles, Handshake, ShieldCheck, Flame, MessageCircle, Trophy, ShoppingBag, Radio, ImagePlus, ThumbsUp, ThumbsDown, Share2, MoreHorizontal } from 'lucide-react';

interface YoutubeAppProps {
  player: Player;
  onBack: () => void;
  onUpdatePlayer: (p: Player) => void;
}

const VIDEO_TYPES: { type: YoutubeVideoType, label: string, cost: number, energy: number }[] = [
    { type: 'VLOG', label: 'Daily Vlog', cost: 0, energy: 15 },
    { type: 'SKIT', label: 'Comedy Skit', cost: 50, energy: 25 },
    { type: 'Q_AND_A', label: 'Q&A', cost: 0, energy: 10 },
    { type: 'TRAILER', label: 'Project Teaser', cost: 0, energy: 20 },
    { type: 'COVER', label: 'Song Cover', cost: 20, energy: 20 },
    { type: 'STORYTIME', label: 'Storytime', cost: 0, energy: 15 },
];

const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_HEIGHT = 720;
const MAX_THUMBNAIL_SOURCE_SIZE = 12 * 1024 * 1024;
type ThumbnailFitMode = 'cover' | 'contain';
type YoutubeVideoReaction = 'LIKE' | 'DISLIKE';

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
            else reject(new Error('Could not encode thumbnail.'));
        }, type, quality);
    });

const createFittedThumbnailBlob = async (
    sourceUrl: string,
    zoom: number,
    offsetX: number,
    offsetY: number,
    fitMode: ThumbnailFitMode
): Promise<Blob> => {
    const image = await loadImageElement(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable.');

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    const baseScale = fitMode === 'contain'
        ? Math.min(THUMBNAIL_WIDTH / image.naturalWidth, THUMBNAIL_HEIGHT / image.naturalHeight)
        : Math.max(THUMBNAIL_WIDTH / image.naturalWidth, THUMBNAIL_HEIGHT / image.naturalHeight);
    const finalScale = baseScale * zoom;
    const drawWidth = image.naturalWidth * finalScale;
    const drawHeight = image.naturalHeight * finalScale;
    const maxPanX = Math.max(0, (drawWidth - THUMBNAIL_WIDTH) / 2);
    const maxPanY = Math.max(0, (drawHeight - THUMBNAIL_HEIGHT) / 2);
    const panX = Math.max(-maxPanX, Math.min(maxPanX, offsetX));
    const panY = Math.max(-maxPanY, Math.min(maxPanY, offsetY));

    ctx.drawImage(
        image,
        (THUMBNAIL_WIDTH - drawWidth) / 2 + panX,
        (THUMBNAIL_HEIGHT - drawHeight) / 2 + panY,
        drawWidth,
        drawHeight
    );

    return canvasToBlob(canvas, 'image/webp', 0.78);
};

const YoutubeThumbnail: React.FC<{ video: YoutubeVideo; className?: string; children?: React.ReactNode }> = ({ video, className = '', children }) => {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        if (!video.thumbnailMediaId) {
            setSrc(null);
            return undefined;
        }

        loadMediaBlob(video.thumbnailMediaId)
            .then(blob => {
                if (!blob || cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setSrc(null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [video.thumbnailMediaId]);

    return (
        <div className={`relative overflow-hidden ${className} ${src ? 'bg-zinc-900' : video.thumbnailColor || 'bg-zinc-800'}`}>
            {src && <img src={src} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />}
            <div className={src ? 'absolute inset-0 bg-black/15' : ''}></div>
            <div className="relative z-10 w-full h-full flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

const UPLOAD_PLANS: Record<YoutubeUploadPlan, {
    label: string;
    description: string;
    viewBoost: number;
    qualityBoost: number;
    trust: number;
    mood: number;
    controversy: number;
    comments: string[];
}> = {
    SAFE: {
        label: 'Safe Upload',
        description: 'Reliable, polished, and brand-friendly.',
        viewBoost: 0,
        qualityBoost: 5,
        trust: 4,
        mood: 1,
        controversy: -2,
        comments: ['This felt polished.', 'Reliable upload week.', 'Clean content, no drama.']
    },
    VIRAL_BAIT: {
        label: 'Viral Bait',
        description: 'Bigger spike chance, bigger backlash risk.',
        viewBoost: 900,
        qualityBoost: -2,
        trust: -5,
        mood: 4,
        controversy: 10,
        comments: ['This title is wild.', 'I clicked so fast.', 'This better not be staged.']
    },
    BTS: {
        label: 'Behind Scenes',
        description: 'Intimate career access fans love.',
        viewBoost: 450,
        qualityBoost: 4,
        trust: 3,
        mood: 3,
        controversy: 0,
        comments: ['More set life please.', 'This made me root for you.', 'Love seeing the work behind it.']
    },
    PROJECT_PROMO: {
        label: 'Project Promo',
        description: 'Turns movie/series buzz into channel growth.',
        viewBoost: 650,
        qualityBoost: 2,
        trust: 0,
        mood: 2,
        controversy: 2,
        comments: ['Now I want to watch the project.', 'Trailer energy is strong.', 'This promo actually worked.']
    },
    SPONSOR_HEAVY: {
        label: 'Sponsor Heavy',
        description: 'More money energy, lower audience patience.',
        viewBoost: 300,
        qualityBoost: -1,
        trust: -6,
        mood: -2,
        controversy: 5,
        comments: ['Feels like an ad but okay.', 'Secure the bag, I guess.', 'Too much sponsor talk today.']
    }
};

const CREATOR_MILESTONES = [
    { id: 'subs_10000', label: '10K Breakout', target: 10000, type: 'subs' },
    { id: 'subs_100000', label: 'Silver Play Button', target: 100000, type: 'subs' },
    { id: 'views_1000000', label: '1M Channel Views', target: 1000000, type: 'views' },
    { id: 'subs_1000000', label: 'Gold Play Button', target: 1000000, type: 'subs' },
];

const MERCH_TIERS: Record<YoutubeMerchTier, { label: string; cost: number; energy: number; trustReq: number; margin: number; heat: number }> = {
    BASIC: { label: 'Basic Merch', cost: 5000, energy: 14, trustReq: 35, margin: 0.28, heat: 1 },
    PREMIUM: { label: 'Premium Drop', cost: 25000, energy: 22, trustReq: 50, margin: 0.42, heat: 4 },
    LUXURY: { label: 'Luxury Capsule', cost: 100000, energy: 34, trustReq: 68, margin: 0.62, heat: 8 },
};

const VIDEO_COMMENT_BANKS: Record<YoutubeVideoType, string[]> = {
    VLOG: [
        'This felt weirdly real, like I was actually there.',
        'The chill parts are better than the dramatic parts.',
        'Daily life content hits when it feels this honest.',
        'The editing is getting smoother every upload.',
        'I came for the title but stayed for the personality.'
    ],
    SKIT: [
        'The timing on that joke was actually perfect.',
        'This should become a recurring series.',
        'That punchline caught me off guard.',
        'The acting in a comedy skit matters and you nailed it.',
        'Lowkey funnier than half the big channels.'
    ],
    Q_AND_A: [
        'Finally someone asked the question I had.',
        'Respect for answering this honestly.',
        'This made the channel feel more personal.',
        'The casual format works for you.',
        'Need a part two with spicier questions.'
    ],
    TRAILER: [
        'This actually made me want to watch the project.',
        'The hype is real if the final thing looks like this.',
        'That last shot sold the whole trailer.',
        'This promo feels way bigger than the channel size.',
        'Smart move dropping this before release.'
    ],
    COVER: [
        'Your voice fits this song better than expected.',
        'The emotion carried the rough parts.',
        'Acoustic version next please.',
        'This needs cleaner audio but the talent is there.',
        'I did not know you could sing like this.'
    ],
    STORYTIME: [
        'I stayed for the whole story.',
        'This absolutely needs a part two.',
        'The way you told this made it feel cinematic.',
        'Not me getting invested in channel lore.',
        'The pacing made this easy to watch.'
    ]
};

const QUALITY_COMMENT_BANKS = {
    high: [
        'This is the upload where the channel leveled up.',
        'Production quality jumped a lot here.',
        'You can tell real effort went into this.',
        'This deserves more attention than it is getting.'
    ],
    mid: [
        'Solid upload, just needs a tighter edit.',
        'Good idea, a few slow moments.',
        'The concept is stronger than the execution, but I liked it.',
        'Keep going, the channel is finding its lane.'
    ],
    low: [
        'Audio is rough but the idea is there.',
        'This needed one more editing pass.',
        'Not the best upload, but I respect the attempt.',
        'The pacing lost me a little.'
    ],
    heated: [
        'The comments are about to be a war zone.',
        'I get why people are mad, but this was entertaining.',
        'This title is doing too much.',
        'Views are views, I guess.'
    ],
    small: [
        'Here before this channel blows up.',
        'Underrated channel honestly.',
        'Algorithm is hiding this from people.',
        'Small creator energy, but in a good way.'
    ],
    big: [
        'Every upload feels like an event now.',
        'The fanbase showed up fast.',
        'Brands are definitely watching this channel.',
        'Here before trending.'
    ]
};

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const CREATOR_IDENTITIES: Record<YoutubeCreatorIdentity, {
    label: string;
    description: string;
    uploadNote: string;
    qualityBoost: number;
    viewMultiplier: number;
    trust: number;
    mood: number;
    heat: number;
    memberBoost: number;
    merchBoost: number;
    liveRisk: number;
    accent: string;
}> = {
    ACTOR_VLOGGER: {
        label: 'Actor Vlogger',
        description: 'Clean fame, set access, and reliable fan trust.',
        uploadNote: 'Balanced creator growth',
        qualityBoost: 2,
        viewMultiplier: 1.02,
        trust: 1,
        mood: 1,
        heat: -1,
        memberBoost: 0.08,
        merchBoost: 0,
        liveRisk: -0.04,
        accent: 'text-blue-300 border-blue-500/30 bg-blue-500/10'
    },
    CHAOS_CREATOR: {
        label: 'Chaos Creator',
        description: 'Huge spikes, messy clips, and higher backlash risk.',
        uploadNote: 'Viral spikes, risky trust',
        qualityBoost: -1,
        viewMultiplier: 1.14,
        trust: -1,
        mood: 2,
        heat: 3,
        memberBoost: -0.03,
        merchBoost: 0,
        liveRisk: 0.1,
        accent: 'text-red-300 border-red-500/30 bg-red-500/10'
    },
    PRESTIGE_FILMMAKER: {
        label: 'Prestige Filmmaker',
        description: 'Slower channel growth, stronger reputation, better trust.',
        uploadNote: 'Quality and reputation',
        qualityBoost: 5,
        viewMultiplier: 0.92,
        trust: 2,
        mood: -1,
        heat: -2,
        memberBoost: 0.02,
        merchBoost: -0.03,
        liveRisk: -0.06,
        accent: 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    },
    LIFESTYLE_ICON: {
        label: 'Lifestyle Icon',
        description: 'Stronger memberships, merch, and luxury-audience pull.',
        uploadNote: 'Members and merch magnet',
        qualityBoost: 1,
        viewMultiplier: 1.03,
        trust: 1,
        mood: 2,
        heat: 0,
        memberBoost: 0.12,
        merchBoost: 0.18,
        liveRisk: -0.02,
        accent: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    },
    CONTROVERSY_MAGNET: {
        label: 'Controversy Magnet',
        description: 'Maximum attention, fragile trust, constant heat.',
        uploadNote: 'Attention at a cost',
        qualityBoost: -2,
        viewMultiplier: 1.2,
        trust: -2,
        mood: 3,
        heat: 5,
        memberBoost: -0.08,
        merchBoost: -0.04,
        liveRisk: 0.16,
        accent: 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10'
    },
};

export const YoutubeApp: React.FC<YoutubeAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [activeTab, setActiveTab] = useState<'HOME' | 'STUDIO'>('HOME');
    const [studioSection, setStudioSection] = useState<'OVERVIEW' | 'IDENTITY' | 'MONETIZE' | 'DEALS' | 'CONTENT'>('OVERVIEW');
    const [view, setView] = useState<'MAIN' | 'UPLOAD' | 'WATCH'>('MAIN');
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    
    // Upload State
    const [title, setTitle] = useState('');
    const [selectedType, setSelectedType] = useState<YoutubeVideoType>('VLOG');
    const [selectedPlan, setSelectedPlan] = useState<YoutubeUploadPlan>('SAFE');
    const [thumbnailSourceUrl, setThumbnailSourceUrl] = useState<string | null>(null);
    const [thumbnailZoom, setThumbnailZoom] = useState(1);
    const [thumbnailOffsetX, setThumbnailOffsetX] = useState(0);
    const [thumbnailOffsetY, setThumbnailOffsetY] = useState(0);
    const [thumbnailFitMode, setThumbnailFitMode] = useState<ThumbnailFitMode>('cover');
    const [draftThumbnailSourceUrl, setDraftThumbnailSourceUrl] = useState<string | null>(null);
    const [draftThumbnailZoom, setDraftThumbnailZoom] = useState(1);
    const [draftThumbnailOffsetX, setDraftThumbnailOffsetX] = useState(0);
    const [draftThumbnailOffsetY, setDraftThumbnailOffsetY] = useState(0);
    const [draftThumbnailFitMode, setDraftThumbnailFitMode] = useState<ThumbnailFitMode>('cover');
    const [isThumbnailEditorOpen, setIsThumbnailEditorOpen] = useState(false);
    const [thumbnailError, setThumbnailError] = useState('');
    const [isThumbnailProcessing, setIsThumbnailProcessing] = useState(false);
    const [youtubeActionInProgress, setYoutubeActionInProgress] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
    const thumbnailSourceUrlRef = useRef<string | null>(null);
    const draftThumbnailSourceUrlRef = useRef<string | null>(null);
    const youtubeActionLockRef = useRef<string | null>(null);

    const channel = player.youtube;
    const videoReactions = (player.flags?.youtubeVideoReactions || {}) as Record<string, YoutubeVideoReaction>;

    useEffect(() => {
        thumbnailSourceUrlRef.current = thumbnailSourceUrl;
    }, [thumbnailSourceUrl]);

    useEffect(() => {
        draftThumbnailSourceUrlRef.current = draftThumbnailSourceUrl;
    }, [draftThumbnailSourceUrl]);

    useEffect(() => () => {
        if (thumbnailSourceUrlRef.current) URL.revokeObjectURL(thumbnailSourceUrlRef.current);
        if (draftThumbnailSourceUrlRef.current) URL.revokeObjectURL(draftThumbnailSourceUrlRef.current);
    }, []);

    // Generate feed once on mount
    const homeFeed = useMemo(() => generateYoutubeFeed(player), []);

    const formatNumber = (num: number) => {
        if (!isFinite(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toLocaleString();
    };

    const unlockedMilestones = Array.isArray(player.flags?.youtubeMilestonesUnlocked)
        ? player.flags.youtubeMilestonesUnlocked
        : [];
    const absoluteWeek = player.age * 52 + player.currentWeek;
    const canLivestream = absoluteWeek - (channel.lastLivestreamWeek || 0) >= 1;
    const canMerchDrop = absoluteWeek - (channel.lastMerchDropWeek || 0) >= 6;
    const canEarnLivestreamDonations = channel.isMonetized && channel.subscribers >= 1000;
    const currentIdentityKey = channel.creatorIdentity || 'ACTOR_VLOGGER';
    const currentIdentity = CREATOR_IDENTITIES[currentIdentityKey];
    const identityCooldownWeeks = 12;
    const identityWeeksRemaining = Math.max(0, identityCooldownWeeks - (absoluteWeek - (channel.lastIdentityChangeWeek || 0)));
    const canChangeIdentity = identityWeeksRemaining === 0 || !channel.lastIdentityChangeWeek;
    const creatorScore = calculateYoutubeCreatorScore(player);
    const publicImage = getYoutubePublicImageLabel(player);
    const studioSections: { key: typeof studioSection; label: string; hint: string; metric?: string }[] = [
        { key: 'OVERVIEW', label: 'Overview', hint: 'Score + analytics', metric: `${creatorScore}` },
        { key: 'IDENTITY', label: 'Identity', hint: 'Creator lane', metric: canChangeIdentity ? 'Ready' : `${identityWeeksRemaining}w` },
        { key: 'MONETIZE', label: 'Money', hint: 'Members + merch', metric: `$${formatNumber(channel.lifetimeEarnings)}` },
        { key: 'DEALS', label: 'Offers', hint: 'Collabs + brands', metric: `${channel.activeCollabs.length + channel.activeBrandDeals.length}` },
        { key: 'CONTENT', label: 'Content', hint: 'Uploads', metric: `${channel.videos.length}` }
    ];
    const watchableVideos = useMemo(() => {
        const playerIds = new Set(channel.videos.map(video => video.id));
        return [...channel.videos, ...homeFeed.filter(video => !playerIds.has(video.id))];
    }, [channel.videos, homeFeed]);
    const selectedVideo = watchableVideos.find(video => video.id === selectedVideoId) || null;

    const getVideoAgeLabel = (video: YoutubeVideo) => {
        const weeksAgo = getWeeksSinceYoutubeUpload(player.age, player.currentWeek, video.weekUploaded, video.yearUploaded);
        return weeksAgo === 0 ? 'Just now' : `${weeksAgo}w ago`;
    };

    const getWatchComments = (video: YoutubeVideo) => {
        const seed = hashString(`${video.id}_${Math.floor(video.views)}_${video.likes}`);
        const qualityKey = video.controversyScore && video.controversyScore >= 12
            ? 'heated'
            : video.qualityScore >= 78
                ? 'high'
                : video.qualityScore < 45
                    ? 'low'
                    : 'mid';
        const sizeKey = video.views >= 100000 || channel.subscribers >= 100000 ? 'big' : 'small';
        const rawComments = [
            ...(video.comments || []),
            ...VIDEO_COMMENT_BANKS[video.type],
            ...QUALITY_COMMENT_BANKS[qualityKey],
            ...QUALITY_COMMENT_BANKS[sizeKey],
            ...(video.uploadPlan ? UPLOAD_PLANS[video.uploadPlan]?.comments || [] : [])
        ];
        const uniqueComments = Array.from(new Set(rawComments.filter(Boolean)));
        const commentCount = Math.min(14, Math.max(7, uniqueComments.length));

        return Array.from({ length: commentCount }, (_, index) => {
            const text = uniqueComments[(seed + index * 5) % uniqueComments.length];
            const likes = Math.max(0, Math.floor((video.views / (index + 15)) * (0.004 + ((seed + index) % 5) * 0.001)));
            const avatarSeed = `${video.id}_${index}_${text}`;
            return {
                id: `${video.id}_comment_${index}`,
                author: ['clipwatcher', 'filmnerd', 'tinyfan', 'uploadregular', 'commentarykid', 'nightviewer', 'setlife', 'algorithmghost'][(seed + index) % 8],
                text,
                likes,
                age: index < 2 ? 'now' : `${Math.max(1, ((seed + index) % 9) + 1)}w ago`,
                avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(avatarSeed)}`
            };
        });
    };

    const getBaseDislikes = (video: YoutubeVideo) =>
        Math.max(0, Math.floor(video.views * (video.controversyScore && video.controversyScore > 10 ? 0.018 : 0.006)));

    const getDisplayedLikes = (video: YoutubeVideo) =>
        Math.max(0, Math.floor(Number.isFinite(video.likes) ? video.likes : 0)) + (videoReactions[video.id] === 'LIKE' ? 1 : 0);

    const getDisplayedDislikes = (video: YoutubeVideo) =>
        getBaseDislikes(video) + (videoReactions[video.id] === 'DISLIKE' ? 1 : 0);

    const handleVideoReaction = (video: YoutubeVideo, reaction: YoutubeVideoReaction) => {
        if (video.isPlayer) return;
        const nextReactions = { ...videoReactions };
        if (nextReactions[video.id] === reaction) {
            delete nextReactions[video.id];
        } else {
            nextReactions[video.id] = reaction;
        }

        onUpdatePlayer({
            ...player,
            flags: {
                ...player.flags,
                youtubeVideoReactions: nextReactions
            }
        });
    };

    const openWatchPage = (video: YoutubeVideo) => {
        setSelectedVideoId(video.id);
        setView('WATCH');
    };

    const thumbnailImageClass = (fitMode: ThumbnailFitMode) =>
        fitMode === 'contain'
            ? 'absolute left-1/2 top-1/2 max-w-full max-h-full object-contain'
            : 'absolute left-1/2 top-1/2 min-w-full min-h-full max-w-none object-cover';

    const thumbnailImageStyle = (zoom: number, offsetX: number, offsetY: number) => ({
        transform: `translate(calc(-50% + ${offsetX / 5}px), calc(-50% + ${offsetY / 5}px)) scale(${zoom})`
    });

    useEffect(() => {
        youtubeActionLockRef.current = null;
        setYoutubeActionInProgress(null);
    }, [player]);

    const beginYoutubeMoneyAction = (key: string) => {
        if (youtubeActionLockRef.current) return false;
        youtubeActionLockRef.current = key;
        setYoutubeActionInProgress(key);
        return true;
    };

    const resetThumbnailEditor = () => {
        if (thumbnailSourceUrl) URL.revokeObjectURL(thumbnailSourceUrl);
        setThumbnailSourceUrl(null);
        setThumbnailZoom(1);
        setThumbnailOffsetX(0);
        setThumbnailOffsetY(0);
        setThumbnailFitMode('cover');
        setThumbnailError('');
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    };

    const closeDraftThumbnailEditor = (discardDraft: boolean) => {
        if (discardDraft && draftThumbnailSourceUrl) URL.revokeObjectURL(draftThumbnailSourceUrl);
        setDraftThumbnailSourceUrl(null);
        setDraftThumbnailZoom(1);
        setDraftThumbnailOffsetX(0);
        setDraftThumbnailOffsetY(0);
        setDraftThumbnailFitMode('cover');
        setIsThumbnailEditorOpen(false);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    };

    const applyDraftThumbnail = () => {
        if (!draftThumbnailSourceUrl) return;
        if (thumbnailSourceUrl) URL.revokeObjectURL(thumbnailSourceUrl);
        setThumbnailSourceUrl(draftThumbnailSourceUrl);
        setThumbnailZoom(draftThumbnailZoom);
        setThumbnailOffsetX(draftThumbnailOffsetX);
        setThumbnailOffsetY(draftThumbnailOffsetY);
        setThumbnailFitMode(draftThumbnailFitMode);
        setDraftThumbnailSourceUrl(null);
        setIsThumbnailEditorOpen(false);
        setThumbnailError('');
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    };

    const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setThumbnailError('Please choose an image file.');
            return;
        }
        if (file.size > MAX_THUMBNAIL_SOURCE_SIZE) {
            setThumbnailError('That image is too large. Please choose one under 12MB.');
            return;
        }

        if (draftThumbnailSourceUrl) URL.revokeObjectURL(draftThumbnailSourceUrl);
        setDraftThumbnailSourceUrl(URL.createObjectURL(file));
        setDraftThumbnailZoom(1);
        setDraftThumbnailOffsetX(0);
        setDraftThumbnailOffsetY(0);
        setDraftThumbnailFitMode('cover');
        setIsThumbnailEditorOpen(true);
        setThumbnailError('');
    };

    const createYoutubeVideo = (
        videoTitle: string,
        videoType: YoutubeVideoType,
        qualityBoost = 0,
        seededViews = 0,
        uploadPlan: YoutubeUploadPlan = 'SAFE',
        extraComments: string[] = [],
        thumbnailMediaId?: string
    ): YoutubeVideo => {
        const plan = UPLOAD_PLANS[uploadPlan];
        const identity = CREATOR_IDENTITIES[currentIdentityKey];
        const improv = player.stats.skills.improvisation || 0;
        const charisma = player.stats.skills.charisma || 0;
        const baseQuality = (improv + charisma) / 2;
        const variance = Math.random() * 20;
        const qualityScore = Math.min(100, baseQuality + variance + qualityBoost + plan.qualityBoost + identity.qualityBoost);
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
        const thumbnailColor = colors[Math.floor(Math.random() * colors.length)];
        const finalSeededViews = Math.floor((seededViews + Math.floor(plan.viewBoost * (0.75 + Math.random() * 0.6))) * identity.viewMultiplier);

        return {
            id: `vid_${Date.now()}_${Math.random()}`,
            title: videoTitle,
            type: videoType,
            thumbnailColor,
            views: finalSeededViews,
            likes: Math.floor(finalSeededViews * 0.05),
            earnings: 0,
            weekUploaded: player.currentWeek,
            yearUploaded: player.age,
            isPlayer: true,
            authorName: player.name,
            qualityScore,
            thumbnailMediaId,
            uploadPlan,
            controversyScore: Math.max(0, plan.controversy + identity.heat),
            trustImpact: plan.trust + identity.trust,
            weeklyHistory: finalSeededViews > 0 ? [finalSeededViews] : [],
            comments: [identity.uploadNote, ...plan.comments, ...extraComments].slice(0, 5)
        };
    };

    const createXPost = (content: string, reach: number) => ({
        id: `x_yt_${Date.now()}_${Math.random()}`,
        authorId: 'creator_pulse',
        authorName: 'Creator Pulse',
        authorHandle: '@creatorpulse',
        authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=CreatorPulse',
        content,
        timestamp: Date.now(),
        likes: Math.max(20, Math.floor(reach * 0.04)),
        retweets: Math.max(4, Math.floor(reach * 0.009)),
        replies: Math.max(2, Math.floor(reach * 0.006)),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true
    });

    const getCollabOutcome = (video: YoutubeVideo, collab: YoutubeCollabOffer) => {
        const chemistryRoll = video.qualityScore + Math.random() * 28;
        if (chemistryRoll >= 105) {
            return {
                label: 'Breakout Collab',
                bonusViews: Math.floor(collab.bonusViews * 0.55),
                bonusSubs: Math.floor(collab.bonusSubscribers * 0.65),
                fame: 2,
                reputation: 2,
                logType: 'positive' as const,
                log: `${collab.creatorName} collab became a breakout creator moment.`,
                social: `The chemistry between ${player.name} and ${collab.creatorName} is carrying timelines today. That collab did not feel forced.`,
                news: `${player.name} and ${collab.creatorName} turn a YouTube collab into a viral industry moment.`
            };
        }
        if (chemistryRoll < 58) {
            return {
                label: 'Awkward Collab',
                bonusViews: 0,
                bonusSubs: -Math.floor(collab.bonusSubscribers * 0.25),
                fame: 0,
                reputation: -2,
                logType: 'negative' as const,
                log: `${collab.creatorName} collab felt awkward and viewers noticed.`,
                social: `${player.name}'s collab with ${collab.creatorName} has people asking if creators should rehearse chemistry first.`,
                news: `${player.name}'s latest creator collab divides viewers.`
            };
        }
        return {
            label: 'Solid Collab',
            bonusViews: Math.floor(collab.bonusViews * 0.18),
            bonusSubs: Math.floor(collab.bonusSubscribers * 0.22),
            fame: 1,
            reputation: 1,
            logType: 'positive' as const,
            log: `${collab.creatorName} collab landed well with both audiences.`,
            social: `${player.name} and ${collab.creatorName} just dropped an easy creator win.`,
            news: ''
        };
    };

    const getBrandOutcome = (video: YoutubeVideo, deal: YoutubeBrandDeal) => {
        const audienceTrust = (video.qualityScore * 0.55) + (player.stats.reputation * 0.35) + Math.random() * 25;
        if (audienceTrust >= 88) {
            return {
                label: 'Clean Integration',
                payoutMultiplier: 1.18,
                bonusViews: Math.floor(deal.bonusViews * 0.3),
                reputation: 2,
                logType: 'positive' as const,
                log: `${deal.brandName} integration felt natural and the brand wants another call.`,
                social: `${player.name} made a ${deal.brandName} ad feel like content. Rare creator skill.`,
                news: ''
            };
        }
        if (audienceTrust < 45) {
            return {
                label: 'Sponsor Backlash',
                payoutMultiplier: 0.85,
                bonusViews: 0,
                reputation: -4,
                logType: 'negative' as const,
                log: `${deal.brandName} integration was called too forced by viewers.`,
                social: `${player.name}'s ${deal.brandName} integration is getting roasted for feeling too scripted.`,
                news: `${player.name} faces creator backlash after a heavy-handed brand integration.`
            };
        }
        return {
            label: 'Paid Upload',
            payoutMultiplier: 1,
            bonusViews: Math.floor(deal.bonusViews * 0.12),
            reputation: 0,
            logType: 'positive' as const,
            log: `${deal.brandName} integration performed cleanly.`,
            social: `${player.name} posted a ${deal.brandName} integration and the audience mostly bought in.`,
            news: ''
        };
    };

    const handleChangeIdentity = (identityKey: YoutubeCreatorIdentity) => {
        if (identityKey === currentIdentityKey) return;
        if (!canChangeIdentity) {
            alert(`Creator identity can change again in ${identityWeeksRemaining} weeks.`);
            return;
        }

        const identity = CREATOR_IDENTITIES[identityKey];
        const nextTrust = Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + identity.trust));
        const nextMood = Math.max(0, Math.min(100, (channel.fanMood ?? 55) + identity.mood));
        const nextHeat = Math.max(0, Math.min(100, (channel.controversy ?? 0) + identity.heat));

        onUpdatePlayer({
            ...player,
            youtube: {
                ...channel,
                creatorIdentity: identityKey,
                lastIdentityChangeWeek: absoluteWeek,
                audienceTrust: nextTrust,
                fanMood: nextMood,
                controversy: nextHeat
            },
            logs: [...player.logs, {
                week: player.currentWeek,
                year: player.age,
                message: `You repositioned the channel as ${identity.label}.`,
                type: identity.heat > 2 ? 'neutral' : 'positive'
            }]
        });
    };

    const handleEnableMemberships = () => {
        if (!channel.isMonetized || channel.subscribers < 10000) {
            alert("Memberships unlock at 10K subscribers after monetization.");
            return;
        }
        if (!beginYoutubeMoneyAction('memberships')) return;

        const startingMembers = Math.max(25, Math.floor(channel.subscribers * 0.004 * (1 + currentIdentity.memberBoost)));
        onUpdatePlayer({
            ...player,
            youtube: {
                ...channel,
                membershipsActive: true,
                members: Math.max(channel.members || 0, startingMembers),
                audienceTrust: Math.min(100, (channel.audienceTrust ?? 55) + 2)
            },
            logs: [...player.logs, { week: player.currentWeek, year: player.age, message: `You launched channel memberships with ${startingMembers.toLocaleString()} founding members.`, type: 'positive' }]
        });
    };

    const handleLivestream = () => {
        const energyCost = 18;
        if (!canLivestream) {
            alert("You already streamed this week.");
            return;
        }
        if (player.energy.current < energyCost) {
            alert("Not enough energy!");
            return;
        }
        if (!canEarnLivestreamDonations) {
            alert("Livestream donations unlock after YouTube monetization and 1K subscribers.");
            return;
        }
        if (!beginYoutubeMoneyAction('livestream')) return;

        const trust = channel.audienceTrust ?? 55;
        const mood = channel.fanMood ?? 55;
        const heat = channel.controversy ?? 0;
        const liveViews = Math.floor(Math.max(1200, channel.subscribers * (0.08 + Math.random() * 0.14) * currentIdentity.viewMultiplier));
        const donations = Math.floor(liveViews * (0.08 + mood / 700) * (1 + currentIdentity.memberBoost));
        const subs = Math.floor(liveViews / (trust >= 65 ? 95 : 130));
        const messy = Math.random() < Math.max(0.05, Math.min(0.62, (heat > 55 ? 0.32 : 0.12) + currentIdentity.liveRisk));

        const nextPlayer = {
            ...player,
            money: player.money + donations,
            youtube: {
                ...channel,
                subscribers: channel.subscribers + subs,
                totalChannelViews: (channel.totalChannelViews || 0) + liveViews,
                lifetimeEarnings: channel.lifetimeEarnings + donations,
                fanMood: Math.min(100, mood + (messy ? -3 : 5) + currentIdentity.mood),
                audienceTrust: Math.max(0, Math.min(100, trust + (messy ? -5 : 2) + currentIdentity.trust)),
                controversy: Math.max(0, Math.min(100, heat + (messy ? 12 : -2) + currentIdentity.heat)),
                lastLivestreamWeek: absoluteWeek
            },
            x: {
                ...player.x,
                followers: player.x.followers + Math.floor(liveViews * 0.01),
                feed: [createXPost(messy
                    ? `${player.name}'s livestream got clipped instantly. Fans are debating every sentence.`
                    : `${player.name}'s livestream felt intimate, generous, and weirdly addictive.`,
                    liveViews
                ), ...player.x.feed].slice(0, 50)
            },
            logs: [...player.logs, {
                week: player.currentWeek,
                year: player.age,
                message: messy
                    ? `Livestream got messy: +${formatNumber(liveViews)} views, $${donations.toLocaleString()} donations, but controversy rose.`
                    : `Livestream win: +${formatNumber(liveViews)} views, +${subs.toLocaleString()} subs, $${donations.toLocaleString()} donations.`,
                type: messy ? 'negative' as const : 'positive' as const
            }]
        };
        spendPlayerEnergy(nextPlayer, energyCost);
        onUpdatePlayer(nextPlayer);
    };

    const handleMerchDrop = (tierKey: YoutubeMerchTier) => {
        const tier = MERCH_TIERS[tierKey];
        const trust = channel.audienceTrust ?? 55;
        const mood = channel.fanMood ?? 55;
        if (!canMerchDrop) {
            alert("Merch drops need a 6 week cooldown.");
            return;
        }
        if (trust < tier.trustReq) {
            alert(`Audience trust must be ${tier.trustReq}+ for this drop.`);
            return;
        }
        if (player.energy.current < tier.energy) {
            alert("Not enough energy!");
            return;
        }
        if (player.money < tier.cost) {
            alert("Not enough money!");
            return;
        }
        if (!beginYoutubeMoneyAction(`merch_${tierKey}`)) return;

        const demand = Math.max(0.25, (mood / 100) + (trust / 180) + (channel.subscribers >= 100000 ? 0.25 : 0) - ((channel.controversy ?? 0) / 180) + currentIdentity.merchBoost);
        const gross = Math.floor(channel.subscribers * tier.margin * demand * (0.7 + Math.random() * 0.65));
        const profit = gross - tier.cost;
        const soldOut = profit > tier.cost * 1.2;
        const flop = profit < 0;
        const result = soldOut ? `${tier.label} sold out` : flop ? `${tier.label} underperformed` : `${tier.label} turned a profit`;

        const nextPlayer = {
            ...player,
            money: player.money - tier.cost + gross,
            youtube: {
                ...channel,
                lifetimeEarnings: channel.lifetimeEarnings + Math.max(0, profit),
                fanMood: Math.max(0, Math.min(100, mood + (soldOut ? 6 : flop ? -5 : 2) + currentIdentity.mood)),
                audienceTrust: Math.max(0, Math.min(100, trust + (flop ? -4 : 1) + currentIdentity.trust)),
                controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + tier.heat + (flop ? 5 : 0) + currentIdentity.heat)),
                lastMerchDropWeek: absoluteWeek,
                lastMerchResult: result
            },
            logs: [...player.logs, {
                week: player.currentWeek,
                year: player.age,
                message: `${result}: gross $${gross.toLocaleString()}, profit $${profit.toLocaleString()}.`,
                type: flop ? 'negative' as const : 'positive' as const
            }]
        };
        spendPlayerEnergy(nextPlayer, tier.energy);
        onUpdatePlayer(nextPlayer);
    };

    const handleUpload = async () => {
        if (isThumbnailProcessing) return;
        if (!title.trim()) return;
        
        const typeConfig = VIDEO_TYPES.find(t => t.type === selectedType);
        if (!typeConfig) return;

        if (player.energy.current < typeConfig.energy) {
            alert("Not enough energy!");
            return;
        }
        if (player.money < typeConfig.cost) {
            alert("Not enough money!");
            return;
        }

        setIsThumbnailProcessing(true);
        let thumbnailMediaId: string | undefined;
        try {
            if (thumbnailSourceUrl) {
                thumbnailMediaId = `yt_thumb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const thumbnailBlob = await createFittedThumbnailBlob(thumbnailSourceUrl, thumbnailZoom, thumbnailOffsetX, thumbnailOffsetY, thumbnailFitMode);
                await saveMediaBlob(thumbnailMediaId, thumbnailBlob, {
                    kind: 'youtube_thumbnail',
                    width: THUMBNAIL_WIDTH,
                    height: THUMBNAIL_HEIGHT
                });
                await pruneMediaStore('youtube_thumbnail', { maxItems: 120, maxBytes: 60 * 1024 * 1024 });
            }
        } catch (err) {
            console.error('Thumbnail processing failed', err);
            setThumbnailError('Could not save that thumbnail. Try another image.');
            setIsThumbnailProcessing(false);
            return;
        }

        const newVideo = createYoutubeVideo(title, selectedType, 0, 0, selectedPlan, [], thumbnailMediaId);
        const plan = UPLOAD_PLANS[selectedPlan];

        const updatedChannel = {
            ...channel,
            totalChannelViews: (channel.totalChannelViews || 0) + newVideo.views,
            audienceTrust: Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + plan.trust + currentIdentity.trust)),
            fanMood: Math.max(0, Math.min(100, (channel.fanMood ?? 55) + plan.mood + currentIdentity.mood)),
            controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + plan.controversy + currentIdentity.heat)),
            videos: [newVideo, ...channel.videos]
        };

        const nextPlayer = {
            ...player,
            money: player.money - typeConfig.cost,
            youtube: updatedChannel,
            logs: [...player.logs, { week: player.currentWeek, year: player.age, message: `Uploaded ${plan.label}: ${title}`, type: selectedPlan === 'VIRAL_BAIT' || selectedPlan === 'SPONSOR_HEAVY' ? 'neutral' : 'positive' }]
        };
        spendPlayerEnergy(nextPlayer, typeConfig.energy);
        onUpdatePlayer(nextPlayer);

        setView('MAIN');
        setTitle('');
        setSelectedPlan('SAFE');
        resetThumbnailEditor();
        setIsThumbnailProcessing(false);
        setActiveTab('STUDIO'); // Switch to studio to see new video
    };

    const handleCompleteCollab = (collab: YoutubeCollabOffer) => {
        if (!channel.activeCollabs.some(item => item.id === collab.id)) return;
        if (player.energy.current < collab.energyCost) {
            alert("Not enough energy!");
            return;
        }
        if (!beginYoutubeMoneyAction(`collab_${collab.id}`)) return;

        const realizedBaseViews = Math.floor(collab.bonusViews * (0.85 + Math.random() * 0.35));
        const realizedBaseSubscribers = Math.floor(collab.bonusSubscribers * (0.85 + Math.random() * 0.35));
        const newVideo = createYoutubeVideo(collab.conceptTitle, collab.requiredType, collab.qualityBonus, realizedBaseViews, 'BTS', [`${collab.creatorName} carried this too.`, 'This duo needs another episode.']);
        const outcome = getCollabOutcome(newVideo, collab);
        const finalBonusViews = Math.max(0, outcome.bonusViews);
        const finalBonusSubscribers = outcome.bonusSubs;
        newVideo.views += finalBonusViews;
        newVideo.likes += Math.floor(finalBonusViews * 0.06);
        newVideo.weeklyHistory = [...newVideo.weeklyHistory, finalBonusViews];

        const updatedChannel = {
            ...channel,
            subscribers: Math.max(0, channel.subscribers + realizedBaseSubscribers + finalBonusSubscribers),
            totalChannelViews: (channel.totalChannelViews || 0) + realizedBaseViews + finalBonusViews,
            audienceTrust: Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + outcome.reputation + 1)),
            fanMood: Math.max(0, Math.min(100, (channel.fanMood ?? 55) + outcome.fame + 2)),
            controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + (outcome.logType === 'negative' ? 5 : -2))),
            videos: [newVideo, ...channel.videos],
            activeCollabs: channel.activeCollabs.filter(item => item.id !== collab.id)
        };

        const nextNews = outcome.news
            ? [{
                id: `news_yt_collab_${Date.now()}`,
                headline: outcome.news,
                subtext: outcome.log,
                category: 'YOU' as const,
                week: player.currentWeek,
                year: player.age,
                impactLevel: outcome.logType === 'negative' ? 'MEDIUM' as const : 'LOW' as const
            }, ...player.news].slice(0, 50)
            : player.news;

        const nextPlayer = {
            ...player,
            stats: {
                ...player.stats,
                fame: Math.max(0, Math.min(100, player.stats.fame + outcome.fame)),
                reputation: Math.max(0, Math.min(100, player.stats.reputation + outcome.reputation)),
            },
            x: {
                ...player.x,
                followers: Math.max(0, player.x.followers + Math.floor((realizedBaseViews + finalBonusViews) * 0.01)),
                feed: [createXPost(outcome.social, realizedBaseViews + finalBonusViews), ...player.x.feed].slice(0, 50)
            },
            youtube: updatedChannel,
            news: nextNews,
            logs: [...player.logs, { week: player.currentWeek, year: player.age, message: `${outcome.label}: ${outcome.log}`, type: outcome.logType }]
        };
        spendPlayerEnergy(nextPlayer, collab.energyCost);
        onUpdatePlayer(nextPlayer);
    };

    const handleCompleteBrandDeal = (deal: YoutubeBrandDeal) => {
        if (!channel.activeBrandDeals.some(item => item.id === deal.id)) return;
        if (player.energy.current < deal.energyCost) {
            alert("Not enough energy!");
            return;
        }
        if (!beginYoutubeMoneyAction(`brand_${deal.id}`)) return;

        const titleForVideo = `${deal.brandName} x ${player.name} - ${deal.requiredType.replace(/_/g, ' ')}`;
        const realizedBaseViews = Math.floor(deal.bonusViews * (0.85 + Math.random() * 0.35));
        const newVideo = createYoutubeVideo(titleForVideo, deal.requiredType, 6, realizedBaseViews, 'SPONSOR_HEAVY', [`${deal.brandName} placement was loud.`, 'The production value is there though.']);
        const outcome = getBrandOutcome(newVideo, deal);
        const finalPayout = Math.floor(deal.payout * outcome.payoutMultiplier);
        newVideo.views += outcome.bonusViews;
        newVideo.likes += Math.floor(outcome.bonusViews * 0.045);
        newVideo.weeklyHistory = [...newVideo.weeklyHistory, outcome.bonusViews];

        const updatedChannel = {
            ...channel,
            totalChannelViews: (channel.totalChannelViews || 0) + realizedBaseViews + outcome.bonusViews,
            lifetimeEarnings: channel.lifetimeEarnings + finalPayout,
            audienceTrust: Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + outcome.reputation - 1)),
            fanMood: Math.max(0, Math.min(100, (channel.fanMood ?? 55) + (outcome.logType === 'negative' ? -4 : 1))),
            controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + (outcome.logType === 'negative' ? 8 : 2))),
            videos: [newVideo, ...channel.videos],
            activeBrandDeals: channel.activeBrandDeals.filter(item => item.id !== deal.id)
        };

        const nextNews = outcome.news
            ? [{
                id: `news_yt_brand_${Date.now()}`,
                headline: outcome.news,
                subtext: outcome.log,
                category: 'YOU' as const,
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM' as const
            }, ...player.news].slice(0, 50)
            : player.news;

        const nextPlayer = {
            ...player,
            money: player.money + finalPayout,
            stats: {
                ...player.stats,
                reputation: Math.max(0, Math.min(100, player.stats.reputation + outcome.reputation)),
            },
            x: {
                ...player.x,
                feed: [createXPost(outcome.social, realizedBaseViews + outcome.bonusViews), ...player.x.feed].slice(0, 50)
            },
            youtube: updatedChannel,
            news: nextNews,
            logs: [...player.logs, { week: player.currentWeek, year: player.age, message: `${outcome.label}: ${outcome.log} Payout: $${finalPayout.toLocaleString()}.`, type: outcome.logType }]
        };
        spendPlayerEnergy(nextPlayer, deal.energyCost);
        onUpdatePlayer(nextPlayer);
    };

    const VideoCard: React.FC<{ video: YoutubeVideo }> = ({ video }) => (
        <button type="button" onClick={() => openWatchPage(video)} className="mb-6 group cursor-pointer w-full text-left block">
            {/* Thumbnail */}
            <YoutubeThumbnail video={video} className="w-full aspect-video rounded-xl mb-3 shadow-sm">
                {/* Center Format Text */}
                <div className="relative z-10 text-center transform group-hover:scale-105 transition-transform duration-300">
                    <span className="block text-white/90 font-black text-3xl uppercase tracking-tighter drop-shadow-lg scale-y-110">
                        {video.type.replace(/_/g, ' ')}
                    </span>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">12:34</div>
            </YoutubeThumbnail>
            {/* Meta */}
            <div className="flex gap-3 px-1">
                <div className={`w-10 h-10 rounded-full ${video.isPlayer ? 'bg-indigo-500' : 'bg-zinc-700'} flex items-center justify-center font-bold text-white text-sm border-2 border-zinc-900`}>
                    {video.authorName[0]}
                </div>
                <div className="flex-1">
                    {(() => {
                        const timeLabel = getVideoAgeLabel(video);
                        return (
                            <>
                    <div className="font-bold text-sm text-white leading-tight mb-1 line-clamp-2 group-hover:text-red-500 transition-colors">{video.title}</div>
                    <div className="text-xs text-zinc-400">
                        {video.authorName} • {formatNumber(video.views)} views • {timeLabel}
                    </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </button>
    );

    return (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans">
            
            {/* Header */}
            {view === 'MAIN' && (
                <div className="p-4 pt-12 border-b border-zinc-900 bg-zinc-950 flex justify-between items-center z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-600 p-1.5 rounded-lg"><Play size={16} fill="white" className="text-white"/></div>
                        <span className="font-bold text-lg tracking-tight font-sans">YouTube</span>
                    </div>
                    <div className="flex gap-4 text-white">
                        <Search size={20}/>
                        <Bell size={20}/>
                        <button onClick={onBack} className="bg-zinc-800 p-1 rounded-full"><ArrowLeft size={16}/></button>
                    </div>
                </div>
            )}

            {/* UPLOAD VIEW (Overlay) */}
            {view === 'UPLOAD' && (
                <div className="absolute inset-0 flex flex-col bg-zinc-900 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="p-4 pt-12 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900 shrink-0">
                        <button onClick={() => setView('MAIN')} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full"><ArrowLeft size={20}/></button>
                        <h2 className="font-bold text-lg">Upload Video</h2>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        
                        {/* Preview Section */}
                        <div className="mb-8">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-3">Preview</label>
                            <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className="w-full aspect-video bg-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden shadow-lg border border-zinc-700 text-left group focus:outline-none focus:border-red-500 transition-all"
                            >
                                {thumbnailSourceUrl ? (
                                    <img
                                        src={thumbnailSourceUrl}
                                        alt="Selected thumbnail preview"
                                        className={thumbnailImageClass(thumbnailFitMode)}
                                        style={thumbnailImageStyle(thumbnailZoom, thumbnailOffsetX, thumbnailOffsetY)}
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-red-600 to-orange-600 opacity-80"></div>
                                )}
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                                {!thumbnailSourceUrl && (
                                    <div className="relative z-10 text-center">
                                        <span className="block text-white font-black text-4xl uppercase tracking-tighter drop-shadow-xl scale-y-110">
                                            {selectedType.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                )}
                                <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-black/75 backdrop-blur px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                    <ImagePlus size={14} />
                                    {thumbnailSourceUrl ? 'Change' : 'Upload'}
                                </div>
                                <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded">12:34</div>
                            </button>
                            <div className="mt-3 px-1">
                                <div className="font-bold text-white text-base leading-tight">{title || "Your Video Title Here..."}</div>
                                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                    <div className="w-4 h-4 bg-indigo-500 rounded-full"></div> {player.name}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Video Title</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a catchy title..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:border-red-600 focus:outline-none text-lg font-bold placeholder:font-normal placeholder:text-zinc-700"
                            />
                        </div>

                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                        />
                        {thumbnailError && <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">{thumbnailError}</div>}

                        <div className="mb-8">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-3">Content Format</label>
                            <div className="grid grid-cols-2 gap-3">
                                {VIDEO_TYPES.map(vt => (
                                    <button 
                                        key={vt.type}
                                        onClick={() => setSelectedType(vt.type)}
                                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${selectedType === vt.type ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                                    >
                                        <div className="relative z-10">
                                            <div className="font-black text-sm uppercase tracking-wide mb-1">{vt.label}</div>
                                            <div className={`text-[10px] font-mono ${selectedType === vt.type ? 'text-zinc-500' : 'opacity-50'}`}>-{vt.energy}E • ${vt.cost}</div>
                                        </div>
                                        {selectedType === vt.type && <div className="absolute right-3 top-3 text-emerald-500"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-3">Upload Angle</label>
                            <div className="space-y-2">
                                {(Object.keys(UPLOAD_PLANS) as YoutubeUploadPlan[]).map(planKey => {
                                    const plan = UPLOAD_PLANS[planKey];
                                    const isSelected = selectedPlan === planKey;
                                    return (
                                        <button
                                            key={planKey}
                                            onClick={() => setSelectedPlan(planKey)}
                                            className={`w-full p-4 rounded-2xl border text-left transition-all ${isSelected ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/40' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-black text-sm uppercase tracking-wide">{plan.label}</div>
                                                    <div className={`text-xs mt-1 ${isSelected ? 'text-red-100' : 'text-zinc-500'}`}>{plan.description}</div>
                                                </div>
                                                <div className={`text-[10px] font-mono shrink-0 ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                                                    {plan.trust >= 0 ? '+' : ''}{plan.trust} trust
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 flex items-start gap-3">
                            <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400"><TrendingUp size={16}/></div>
                            <div>
                                <div className="text-xs font-bold text-white mb-1">Projected Growth</div>
                                <div className="text-[10px] text-zinc-500">Video performance scales with your <span className="text-indigo-400">Improv</span> & <span className="text-indigo-400">Charisma</span> skills. High quality videos gain more passive views over time.</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 pb-8 border-t border-zinc-800 bg-zinc-950 shrink-0">
                        <button 
                            onClick={handleUpload}
                            disabled={!title.trim() || isThumbnailProcessing}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                        >
                            <MonitorPlay size={20} /> {isThumbnailProcessing ? 'Saving Thumbnail...' : 'Publish Video'}
                        </button>
                    </div>
                </div>
            )}

            {/* WATCH VIEW */}
            {view === 'WATCH' && selectedVideo && (
                <div className="absolute inset-0 flex flex-col bg-zinc-950 z-50 animate-in slide-in-from-right duration-200">
                    <div className="p-4 pt-12 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur flex items-center gap-4 shrink-0">
                        <button onClick={() => setView('MAIN')} className="p-2 -ml-2 hover:bg-zinc-900 rounded-full" aria-label="Back to YouTube">
                            <ArrowLeft size={20}/>
                        </button>
                        <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-red-400 font-black">Now Watching</div>
                            <div className="text-sm font-black text-white truncate">{selectedVideo.authorName}</div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                        <YoutubeThumbnail video={selectedVideo} className="w-full aspect-video bg-black">
                            <div className="h-16 w-16 rounded-full bg-black/65 backdrop-blur border border-white/15 flex items-center justify-center shadow-2xl">
                                <Play size={30} fill="white" className="text-white ml-1"/>
                            </div>
                            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-1 rounded">12:34</div>
                        </YoutubeThumbnail>

                        <div className="p-4 border-b border-zinc-900">
                            <h2 className="text-xl font-black leading-tight text-white">{selectedVideo.title}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                                <span>{formatNumber(selectedVideo.views)} views</span>
                                <span>•</span>
                                <span>{getVideoAgeLabel(selectedVideo)}</span>
                                <span>•</span>
                                <span>{selectedVideo.type.replace(/_/g, ' ')}</span>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <div className={`h-11 w-11 rounded-full ${selectedVideo.isPlayer ? 'bg-indigo-500' : 'bg-zinc-700'} flex items-center justify-center font-black text-white border border-zinc-800 overflow-hidden`}>
                                    {selectedVideo.isPlayer && player.avatar ? (
                                        <img src={player.avatar} alt={player.name} className="h-full w-full object-cover"/>
                                    ) : (
                                        selectedVideo.authorName[0]
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-black text-white truncate">{selectedVideo.authorName}</div>
                                    <div className="text-xs text-zinc-500">
                                        {selectedVideo.isPlayer ? `${formatNumber(channel.subscribers)} subscribers` : 'Recommended creator'}
                                    </div>
                                </div>
                                {selectedVideo.isPlayer && (
                                    <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-black">
                                        Your Video
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleVideoReaction(selectedVideo, 'LIKE')}
                                    disabled={selectedVideo.isPlayer}
                                    className={`rounded-2xl border p-3 text-center transition-colors disabled:cursor-default ${videoReactions[selectedVideo.id] === 'LIKE' ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-200'} ${selectedVideo.isPlayer ? 'opacity-90' : 'hover:bg-zinc-800'}`}
                                >
                                    <ThumbsUp size={17} className={`mx-auto mb-1 ${videoReactions[selectedVideo.id] === 'LIKE' ? 'text-black' : 'text-zinc-200'}`}/>
                                    <div className="text-[11px] font-black">{formatNumber(getDisplayedLikes(selectedVideo))}</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleVideoReaction(selectedVideo, 'DISLIKE')}
                                    disabled={selectedVideo.isPlayer}
                                    className={`rounded-2xl border p-3 text-center transition-colors disabled:cursor-default ${videoReactions[selectedVideo.id] === 'DISLIKE' ? 'bg-red-600 text-white border-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400'} ${selectedVideo.isPlayer ? 'opacity-90' : 'hover:bg-zinc-800'}`}
                                >
                                    <ThumbsDown size={17} className={`mx-auto mb-1 ${videoReactions[selectedVideo.id] === 'DISLIKE' ? 'text-white' : 'text-zinc-400'}`}/>
                                    <div className="text-[11px] font-black">{formatNumber(getDisplayedDislikes(selectedVideo))}</div>
                                </button>
                                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                                    <MessageCircle size={17} className="mx-auto mb-1 text-zinc-200"/>
                                    <div className="text-[11px] font-black">{formatNumber(Math.max(selectedVideo.comments?.length || 0, Math.floor(selectedVideo.views * 0.012)))}</div>
                                </div>
                                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                                    <Share2 size={17} className="mx-auto mb-1 text-zinc-200"/>
                                    <div className="text-[11px] font-black">Share</div>
                                </div>
                            </div>

                            {selectedVideo.isPlayer && (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl bg-red-600/10 border border-red-500/20 p-3">
                                        <div className="text-[9px] uppercase tracking-[0.16em] text-red-300 font-black">Quality</div>
                                        <div className="mt-1 text-lg font-black">{Math.floor(selectedVideo.qualityScore)}</div>
                                    </div>
                                    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3">
                                        <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-500 font-black">Earned</div>
                                        <div className="mt-1 text-lg font-black">${formatNumber(selectedVideo.earnings)}</div>
                                    </div>
                                    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3">
                                        <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-500 font-black">Angle</div>
                                        <div className="mt-1 text-[11px] font-black leading-4">{selectedVideo.uploadPlan ? UPLOAD_PLANS[selectedVideo.uploadPlan]?.label : 'Upload'}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <div className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-black text-white">Comments</div>
                                        <div className="text-xs text-zinc-500 mt-1">Audience reaction to this upload</div>
                                    </div>
                                    <MoreHorizontal size={20} className="text-zinc-500"/>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {getWatchComments(selectedVideo).map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <img src={comment.avatar} alt="" className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-800 shrink-0"/>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-zinc-300">@{comment.author}</span>
                                                <span className="text-[10px] text-zinc-600">{comment.age}</span>
                                            </div>
                                            <p className="mt-1 text-sm leading-5 text-zinc-100">{comment.text}</p>
                                            <div className="mt-2 flex items-center gap-4 text-[11px] text-zinc-500">
                                                <span className="flex items-center gap-1"><ThumbsUp size={12}/> {formatNumber(comment.likes)}</span>
                                                <span className="flex items-center gap-1"><ThumbsDown size={12}/></span>
                                                <span>Reply</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            {view === 'MAIN' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-20 bg-zinc-950">
                    
                    {/* --- HOME TAB --- */}
                    {activeTab === 'HOME' && (
                        <div>
                            {/* Categories */}
                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                                <button className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">All</button>
                                <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">Acting</button>
                                <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">Vlogs</button>
                                <button className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">Gaming</button>
                            </div>

                            {/* Feed */}
                            <div className="space-y-2">
                                {homeFeed.map(v => <VideoCard key={v.id} video={v} />)}
                            </div>
                        </div>
                    )}

                    {/* --- STUDIO TAB --- */}
                    {activeTab === 'STUDIO' && (
                        <div>
                            {/* Channel Header */}
                            <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-3 mb-4 overflow-hidden relative">
                                <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-red-600/10 blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-start gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700 relative shrink-0">
                                            <img src={player.avatar} className="w-full h-full object-cover"/>
                                            <div className="absolute inset-0 bg-black/10"></div>
                                        </div>
                                        <div className="min-w-0 flex-1 pr-12">
                                            <div className="font-black text-lg leading-tight truncate">{channel.handle}</div>
                                            <div className="text-zinc-400 text-[11px] mt-1 leading-4">
                                                {formatNumber(channel.subscribers)} subs • {publicImage}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setView('UPLOAD')}
                                            className="absolute right-0 top-0 h-11 w-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-950/40"
                                            aria-label="Create content"
                                        >
                                            <Plus size={20}/>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        <div className="rounded-2xl bg-red-600/12 border border-red-500/25 px-3 py-2 min-w-0">
                                            <div className="text-[9px] font-black text-red-200 uppercase tracking-[0.18em]">Score</div>
                                            <div className="text-lg font-black text-white leading-none mt-1">{creatorScore}</div>
                                        </div>
                                        <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 px-3 py-2 min-w-0">
                                            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.18em]">Lane</div>
                                            <div className="text-[11px] font-black text-zinc-200 leading-4 mt-1">{currentIdentity.label}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {studioSections.map(section => (
                                    <button
                                        key={section.key}
                                        onClick={() => setStudioSection(section.key)}
                                        className={`rounded-2xl border px-3 py-2.5 text-left transition-all min-w-0 ${studioSection === section.key ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-black">{section.label}</span>
                                            <span className={`text-[9px] font-mono shrink-0 ${studioSection === section.key ? 'text-black/60' : 'text-zinc-500'}`}>{section.metric}</span>
                                        </div>
                                        <div className={`text-[9px] mt-1 leading-3 ${studioSection === section.key ? 'text-black/55' : 'text-zinc-500'}`}>{section.hint}</div>
                                    </button>
                                ))}
                            </div>

                            {studioSection === 'OVERVIEW' && (
                            <>
                            {/* Dashboard Stats */}
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
                                <h3 className="font-bold text-sm mb-3">Analytics (Lifetime)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Views</div>
                                        <div className="text-lg font-mono font-bold">{formatNumber(channel.totalChannelViews || 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">Revenue</div>
                                        <div className="text-lg font-mono font-bold text-emerald-400">${formatNumber(channel.lifetimeEarnings)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold mb-1"><ShieldCheck size={12}/> Trust</div>
                                        <div className="text-lg font-black">{Math.round(channel.audienceTrust ?? 55)}</div>
                                    </div>
                                    <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold mb-1"><MessageCircle size={12}/> Mood</div>
                                        <div className="text-lg font-black">{Math.round(channel.fanMood ?? 55)}</div>
                                    </div>
                                    <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold mb-1"><Flame size={12}/> Heat</div>
                                        <div className="text-lg font-black">{Math.round(channel.controversy ?? 0)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-6 relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-28 h-28 bg-red-600/10 rounded-full blur-2xl"></div>
                                <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="font-bold text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-red-400"/> Public Image</h3>
                                        <div className="text-[11px] text-zinc-500 mt-1">This affects sponsors, collabs, casting rooms, and creator-world events.</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-black">Score</div>
                                        <div className="text-2xl font-black text-white">{creatorScore}</div>
                                    </div>
                                </div>
                                <div className="relative z-10 rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.22em] text-red-300 font-black">{publicImage}</div>
                                            <div className="text-[11px] text-zinc-500 mt-1">{currentIdentity.label} identity is shaping how the industry reads you.</div>
                                        </div>
                                        <div className="h-12 w-12 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center">
                                            <TrendingUp size={18} className="text-red-300"/>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-black rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-red-600 via-yellow-400 to-emerald-400" style={{ width: `${creatorScore}%` }}></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-zinc-400">
                                        <div className="bg-zinc-900 rounded-lg p-2">Sponsors <strong className="text-white">{creatorScore >= 65 ? 'Warmer' : creatorScore < 40 ? 'Cautious' : 'Neutral'}</strong></div>
                                        <div className="bg-zinc-900 rounded-lg p-2">Casting <strong className="text-white">{publicImage === 'Volatile' ? 'Risky' : creatorScore >= 76 ? 'Boosted' : 'Normal'}</strong></div>
                                        <div className="bg-zinc-900 rounded-lg p-2">Drama <strong className="text-white">{(channel.controversy ?? 0) >= 60 ? 'High' : 'Managed'}</strong></div>
                                    </div>
                                </div>
                            </div>
                            </>
                            )}

                            {studioSection === 'IDENTITY' && (
                            <>
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-6">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="font-bold text-sm flex items-center gap-2"><Sparkles size={16} className="text-red-400"/> Creator Identity</h3>
                                        <div className="text-[11px] text-zinc-500 mt-1">Your channel personality changes growth, trust, heat, merch, and event risk.</div>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.14em] rounded-full border px-2 py-1 ${currentIdentity.accent}`}>
                                        {canChangeIdentity ? 'Ready' : `${identityWeeksRemaining}w`}
                                    </div>
                                </div>

                                <div className={`rounded-2xl border p-4 mb-3 ${currentIdentity.accent}`}>
                                    <div className="text-xs uppercase tracking-[0.2em] font-black opacity-80">Current Lane</div>
                                    <div className="text-lg font-black text-white mt-1">{currentIdentity.label}</div>
                                    <div className="text-xs text-zinc-300 mt-1">{currentIdentity.description}</div>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {(Object.keys(CREATOR_IDENTITIES) as YoutubeCreatorIdentity[]).map(identityKey => {
                                        const identity = CREATOR_IDENTITIES[identityKey];
                                        const selected = identityKey === currentIdentityKey;
                                        return (
                                            <button
                                                key={identityKey}
                                                onClick={() => handleChangeIdentity(identityKey)}
                                                disabled={selected || !canChangeIdentity}
                                                className={`p-3 rounded-xl border text-left transition-all ${selected ? identity.accent : 'bg-zinc-950 border-zinc-800 text-zinc-300 disabled:opacity-40'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-black text-sm">{identity.label}</div>
                                                        <div className="text-[11px] text-zinc-500 mt-1">{identity.uploadNote}</div>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-zinc-400">
                                                        {identity.viewMultiplier > 1 ? '+' : ''}{Math.round((identity.viewMultiplier - 1) * 100)}% views
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Trophy size={16} className="text-yellow-400"/> Creator Milestones</h3>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase">{unlockedMilestones.length}/{CREATOR_MILESTONES.length}</div>
                                </div>
                                <div className="space-y-2">
                                    {CREATOR_MILESTONES.map(milestone => {
                                        const value = milestone.type === 'subs' ? channel.subscribers : (channel.totalChannelViews || 0);
                                        const progress = Math.min(100, (value / milestone.target) * 100);
                                        const isUnlocked = unlockedMilestones.includes(milestone.id);
                                        return (
                                            <div key={milestone.id} className={`rounded-xl p-3 border ${isUnlocked ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-zinc-950 border-zinc-800'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className={`text-xs font-black ${isUnlocked ? 'text-yellow-300' : 'text-zinc-300'}`}>{milestone.label}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">{formatNumber(value)} / {formatNumber(milestone.target)}</div>
                                                </div>
                                                <div className="h-1.5 bg-black rounded-full overflow-hidden">
                                                    <div className={`h-full ${isUnlocked ? 'bg-yellow-400' : 'bg-red-600'}`} style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            </>
                            )}

                            {studioSection === 'MONETIZE' && (
                            <>
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-6">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="font-bold text-sm flex items-center gap-2"><DollarSign size={16} className="text-emerald-400"/> Creator Monetization</h3>
                                        <div className="text-[11px] text-zinc-500 mt-1">Memberships, livestream donations, and merch drops.</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Members</div>
                                        <div className="font-black text-emerald-400">{formatNumber(channel.members || 0)}</div>
                                    </div>
                                </div>

                                {!channel.membershipsActive ? (
                                    <button
                                        onClick={handleEnableMemberships}
                                        disabled={!channel.isMonetized || channel.subscribers < 10000 || !!youtubeActionInProgress}
                                        className="w-full py-3 rounded-xl bg-emerald-500 text-black font-black text-sm disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors mb-3"
                                    >
                                        Enable Memberships
                                    </button>
                                ) : (
                                    <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                                        <div className="text-xs font-bold text-emerald-300">Memberships Active</div>
                                        <div className="text-[11px] text-zinc-400 mt-1">Weekly income scales with trust, fan mood, and subscriber base.</div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        onClick={handleLivestream}
                                        disabled={!canLivestream || !canEarnLivestreamDonations || !!youtubeActionInProgress}
                                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2 text-sm font-black"><Radio size={15} className="text-red-400"/> Go Live</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">{canEarnLivestreamDonations ? '18E • donations + subs' : 'Needs monetization + 1K subs'}</div>
                                    </button>
                                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                                        <div className="flex items-center gap-2 text-sm font-black"><ShoppingBag size={15} className="text-yellow-400"/> Merch</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">{canMerchDrop ? 'Drop available' : 'Cooling down'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(MERCH_TIERS) as YoutubeMerchTier[]).map(tierKey => {
                                        const tier = MERCH_TIERS[tierKey];
                                        const disabled = !canMerchDrop || !!youtubeActionInProgress || player.money < tier.cost || player.energy.current < tier.energy || (channel.audienceTrust ?? 55) < tier.trustReq;
                                        return (
                                            <button
                                                key={tierKey}
                                                onClick={() => handleMerchDrop(tierKey)}
                                                disabled={disabled}
                                                className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 disabled:opacity-40 text-left"
                                            >
                                                <div className="text-[10px] font-black text-white">{tier.label}</div>
                                                <div className="text-[9px] text-zinc-500 mt-1">${formatNumber(tier.cost)} • {tier.energy}E</div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {channel.lastMerchResult && (
                                    <div className="mt-3 text-[11px] text-zinc-400">Last drop: {channel.lastMerchResult}</div>
                                )}
                            </div>
                            </>
                            )}

                            {studioSection === 'DEALS' && (
                            <>
                            {(channel.activeCollabs.length > 0 || channel.activeBrandDeals.length > 0) && (
                                <div className="space-y-4 mb-6">
                                    {channel.activeCollabs.map(collab => (
                                        <div key={collab.id} className="bg-zinc-900 rounded-xl p-4 border border-red-800/40">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.22em] text-red-300 font-bold mb-1 flex items-center gap-2">
                                                        <Handshake size={12}/> Active Collab
                                                    </div>
                                                    <div className="font-bold text-white">{collab.conceptTitle}</div>
                                                    <div className="text-xs text-zinc-400">{collab.creatorName} • {collab.creatorHandle}</div>
                                                    <div className="text-[11px] text-red-200/80 mt-2">Chemistry can create a viral wave, but awkward energy can cost reputation.</div>
                                                </div>
                                                <div className="text-right text-[10px] text-zinc-400">
                                                    <div>{collab.requiredType.replace(/_/g, ' ')}</div>
                                                    <div>{collab.expiresInWeeks}w left</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-300 mb-3">
                                                <div className="bg-zinc-950 rounded-lg p-2">Energy <strong>{collab.energyCost}E</strong></div>
                                                <div className="bg-zinc-950 rounded-lg p-2">Views <strong>~+{formatNumber(collab.bonusViews)}</strong></div>
                                                <div className="bg-zinc-950 rounded-lg p-2">Subs <strong>~+{formatNumber(collab.bonusSubscribers)}</strong></div>
                                            </div>
                                            <button
                                                onClick={() => handleCompleteCollab(collab)}
                                                disabled={!!youtubeActionInProgress || player.energy.current < collab.energyCost}
                                                className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-red-600"
                                            >
                                                <MonitorPlay size={16}/> Film Collab
                                            </button>
                                        </div>
                                    ))}

                                    {channel.activeBrandDeals.map(deal => (
                                        <div key={deal.id} className="bg-zinc-900 rounded-xl p-4 border border-amber-800/40">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300 font-bold mb-1 flex items-center gap-2">
                                                        <Sparkles size={12}/> Creator Deal
                                                    </div>
                                                    <div className="font-bold text-white">{deal.brandName}</div>
                                                    <div className="text-xs text-zinc-400">{deal.description}</div>
                                                    <div className="text-[11px] text-amber-100/80 mt-2">Clean integrations can unlock bonus payout. Forced ones can spark backlash.</div>
                                                </div>
                                                <div className="text-right text-[10px] text-zinc-400">
                                                    <div>{deal.requiredType.replace(/_/g, ' ')}</div>
                                                    <div>{deal.expiresInWeeks}w left</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-300 mb-3">
                                                <div className="bg-zinc-950 rounded-lg p-2">Energy <strong>{deal.energyCost}E</strong></div>
                                                <div className="bg-zinc-950 rounded-lg p-2">Views <strong>~+{formatNumber(deal.bonusViews)}</strong></div>
                                                <div className="bg-zinc-950 rounded-lg p-2">Cash <strong>${formatNumber(deal.payout)}</strong></div>
                                            </div>
                                            <button
                                                onClick={() => handleCompleteBrandDeal(deal)}
                                                disabled={!!youtubeActionInProgress || player.energy.current < deal.energyCost}
                                                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-amber-500"
                                            >
                                                <DollarSign size={16}/> Publish Integration
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {channel.activeCollabs.length === 0 && channel.activeBrandDeals.length === 0 && (
                                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center mb-6">
                                    <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                                        <Handshake size={20} className="text-zinc-500"/>
                                    </div>
                                    <div className="font-black text-white">No creator offers right now</div>
                                    <div className="text-xs text-zinc-500 mt-2">Weekly messages can bring collabs and brand deals when your channel has enough pull.</div>
                                </div>
                            )}
                            </>
                            )}

                            {/* Monetization Status */}
                            {studioSection === 'MONETIZE' && !channel.isMonetized && (
                                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign size={40}/></div>
                                    <div className="flex items-center gap-2 text-white font-bold mb-3 relative z-10">
                                        <TrendingUp size={16} className="text-yellow-500"/> Partner Program
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-zinc-400">Subscribers</span>
                                                <span>{formatNumber(channel.subscribers)} / {formatNumber(YOUTUBE_MONETIZATION_SUBS)}</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (channel.subscribers / YOUTUBE_MONETIZATION_SUBS) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-zinc-400">Channel Views</span>
                                                <span>{formatNumber(channel.totalChannelViews || 0)} / {formatNumber(YOUTUBE_MONETIZATION_VIEWS)}</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((channel.totalChannelViews || 0) / YOUTUBE_MONETIZATION_VIEWS) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Create Button */}
                            {studioSection === 'CONTENT' && (
                            <>
                            <button 
                                onClick={() => setView('UPLOAD')}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 mb-8 shadow-lg shadow-red-900/20"
                            >
                                <Plus size={20}/> Create Content
                            </button>

                            {/* Recent Videos */}
                            <h3 className="font-bold text-white text-sm mb-4">Your Content</h3>
                            <div className="space-y-3">
                                {channel.videos.length === 0 ? (
                                    <div className="text-center text-zinc-600 py-8 text-sm italic">You haven't uploaded any videos yet.</div>
                                ) : (
                                    channel.videos.map(video => (
                                        <button key={video.id} type="button" onClick={() => openWatchPage(video)} className="flex w-full gap-3 bg-zinc-900/50 hover:bg-zinc-900 p-2 rounded-xl text-left transition-colors">
                                            <YoutubeThumbnail video={video} className="w-28 h-16 shrink-0 rounded-xl">
                                                <span className="text-[10px] font-black uppercase text-white/50">{video.type.replace(/_/g, ' ')}</span>
                                            </YoutubeThumbnail>
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="font-bold text-sm truncate text-zinc-200">{video.title}</div>
                                                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                                                    <span className="flex items-center gap-1"><Users size={10}/> {formatNumber(video.views)}</span>
                                                    <span className="flex items-center gap-1"><DollarSign size={10}/> ${formatNumber(video.earnings)}</span>
                                                </div>
                                                {video.uploadPlan && (
                                                    <div className="mt-2 inline-flex text-[9px] uppercase tracking-[0.18em] font-bold text-red-300 bg-red-950/30 border border-red-900/40 rounded-full px-2 py-1">
                                                        {UPLOAD_PLANS[video.uploadPlan]?.label || video.uploadPlan}
                                                    </div>
                                                )}
                                                {video.comments?.[0] && (
                                                    <div className="mt-2 text-[11px] text-zinc-400 line-clamp-1">"{video.comments[0]}"</div>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            </>
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* --- BOTTOM NAVIGATION --- */}
            {view === 'MAIN' && (
                <div className="flex bg-zinc-950 border-t border-zinc-900 pb-safe">
                    <button 
                        onClick={() => setActiveTab('HOME')}
                        className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === 'HOME' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        {activeTab === 'HOME' ? <Home size={22} fill="white"/> : <Home size={22}/>}
                        <span className="text-[10px] font-bold">Home</span>
                    </button>
                    <button 
                        onClick={() => setView('UPLOAD')}
                        className="flex-1 py-3 flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
                    >
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-500 flex items-center justify-center">
                            <Plus size={18}/>
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('STUDIO')}
                        className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === 'STUDIO' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        {activeTab === 'STUDIO' ? <Layout size={22} fill="white"/> : <Layout size={22}/>}
                        <span className="text-[10px] font-bold">Studio</span>
                    </button>
                </div>
            )}

            {isThumbnailEditorOpen && draftThumbnailSourceUrl && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto custom-scrollbar px-3 pt-16 pb-24 sm:p-4">
                    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                        <div className="bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[9px] text-red-300 font-black uppercase tracking-[0.24em]">Thumbnail Fit</div>
                                <div className="text-lg font-black text-white truncate">Position image</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => closeDraftThumbnailEditor(true)}
                                className="shrink-0 px-3 py-2 rounded-xl bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <div className="aspect-video rounded-2xl overflow-hidden bg-black relative border border-zinc-800 shadow-inner max-h-[30vh]">
                                <img
                                    src={draftThumbnailSourceUrl}
                                    alt="Draft thumbnail"
                                    className={thumbnailImageClass(draftThumbnailFitMode)}
                                    style={thumbnailImageStyle(draftThumbnailZoom, draftThumbnailOffsetX, draftThumbnailOffsetY)}
                                />
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                                <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded">16:9</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {(['cover', 'contain'] as ThumbnailFitMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => {
                                            setDraftThumbnailFitMode(mode);
                                            setDraftThumbnailZoom(1);
                                            setDraftThumbnailOffsetX(0);
                                            setDraftThumbnailOffsetY(0);
                                        }}
                                        className={`rounded-2xl border p-3 text-left transition-all min-h-[86px] ${draftThumbnailFitMode === mode ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}
                                    >
                                        <div className="text-[11px] font-black uppercase tracking-widest">{mode === 'cover' ? 'Cover' : 'Fit Full'}</div>
                                        <div className={`text-[10px] mt-1 leading-4 ${draftThumbnailFitMode === mode ? 'text-black/55' : 'text-zinc-500'}`}>
                                            {mode === 'cover' ? 'Fill frame, crop edges.' : 'Show full image with bars.'}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                                Zoom
                                <input
                                    type="range"
                                    min="1"
                                    max="2.5"
                                    step="0.05"
                                    value={draftThumbnailZoom}
                                    onChange={(e) => setDraftThumbnailZoom(Number(e.target.value))}
                                    className="w-full accent-red-600 mt-2"
                                />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                                    Move Left / Right
                                    <input
                                        type="range"
                                        min="-420"
                                        max="420"
                                        step="5"
                                        value={draftThumbnailOffsetX}
                                        onChange={(e) => setDraftThumbnailOffsetX(Number(e.target.value))}
                                        className="w-full accent-red-600 mt-2"
                                    />
                                </label>
                                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                                    Move Up / Down
                                    <input
                                        type="range"
                                        min="-240"
                                        max="240"
                                        step="5"
                                        value={draftThumbnailOffsetY}
                                        onChange={(e) => setDraftThumbnailOffsetY(Number(e.target.value))}
                                        className="w-full accent-red-600 mt-2"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[0.9fr_1.2fr] gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                    className="py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-[11px] font-black uppercase tracking-widest border border-zinc-800"
                                >
                                    Choose Another
                                </button>
                                <button
                                    type="button"
                                    onClick={applyDraftThumbnail}
                                    className="py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-950/30"
                                >
                                    Apply Thumbnail
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
