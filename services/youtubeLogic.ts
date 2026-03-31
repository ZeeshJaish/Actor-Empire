
import { Player, YoutubeChannel, YoutubeVideo } from '../types';
import { NPC_DATABASE } from './npcLogic';

const VIDEO_TEMPLATES = [
    "My Morning Routine ☀️", 
    "I ATE ONLY PURPLE FOOD FOR 24 HOURS", 
    "Room Tour 2024", 
    "Reacting to my old videos (CRINGE)", 
    "Storytime: My Worst Audition", 
    "Vlog: A Day in Los Angeles", 
    "Makeup Tutorial - Red Carpet Look", 
    "Q&A - Answering your assumptions", 
    "Try not to laugh challenge", 
    "Gaming Setup Tour",
    "How I got my agent",
    "What's in my bag?",
    "Day in the life of an Actor",
    "Spicy Noodle Challenge 🌶️",
    "Visiting the Hollywood Sign"
];

export const generateYoutubeFeed = (player: Player): YoutubeVideo[] => {
    const feed: YoutubeVideo[] = [];
    
    // Generate 10 random videos from NPCs
    for(let i=0; i<10; i++) {
        const npc = NPC_DATABASE[Math.floor(Math.random() * NPC_DATABASE.length)];
        const views = Math.floor(Math.random() * 500000) + 1000;
        const weeksAgo = Math.floor(Math.random() * 4);
        
        // Handle year wrap for fake feed
        let uploadWeek = player.currentWeek - weeksAgo;
        let uploadYear = player.age;
        if (uploadWeek < 1) {
             uploadWeek += 52;
             uploadYear -= 1;
        }
        
        feed.push({
            id: `yt_feed_${i}_${Date.now()}`,
            title: VIDEO_TEMPLATES[Math.floor(Math.random() * VIDEO_TEMPLATES.length)],
            type: 'VLOG',
            thumbnailColor: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'][Math.floor(Math.random()*7)],
            views: views,
            likes: Math.floor(views * 0.05),
            earnings: 0,
            weekUploaded: uploadWeek,
            yearUploaded: uploadYear,
            isPlayer: false,
            authorName: npc.name,
            qualityScore: 50,
            weeklyHistory: [],
            comments: []
        });
    }
    
    // Sort by views (Popularity)
    return feed.sort((a,b) => b.views - a.views);
};

export const processYoutubeChannel = (player: Player): { channel: YoutubeChannel, weeklyRevenue: number, newSubs: number, notifications: string[] } => {
    let channel = { ...player.youtube };
    let weeklyRevenue = 0;
    let newSubsTotal = 0;
    const notifications: string[] = [];

    // 1. Process Videos
    const updatedVideos = channel.videos.map(video => {
        // Absolute week calculation to handle year wrap correctly
        const currentAbs = player.age * 52 + player.currentWeek;
        const videoYear = video.yearUploaded || player.age; // Fallback for legacy data
        const videoAbs = videoYear * 52 + video.weekUploaded;
        
        // Ensure age is never negative (future/bug) or NaN
        const age = Math.max(0, currentAbs - videoAbs);
        
        // Base growth factor decays over time (Viral curve)
        // Week 0: 1.0, Week 1: 0.4, Week 4: 0.05
        let growthFactor = Math.max(0.01, 1 / ((age * 2) + 1));
        
        // Quality bonus (hidden stat 0-100) -> 0.5 to 2.5 multiplier
        const qualityBonus = 0.5 + ((video.qualityScore || 50) / 25); 
        
        // Subscriber bonus (more subs = more initial push)
        // FIX: Ensure minimum push for 0 subs is roughly 500-1000 views for algorithm discovery
        const subPush = Math.max(1000, channel.subscribers * 0.15); 
        
        // Calculate new views for this week
        // Random variance
        const variance = 0.8 + Math.random() * 0.4;
        
        let newViews = Math.floor(subPush * growthFactor * qualityBonus * variance);
        
        // CRITICAL: Prevent Infinity/NaN propagation
        if (!isFinite(newViews)) newViews = 0;
        
        // Earnings (RPM approx $2.00)
        let earnings = 0;
        if (channel.isMonetized) {
            earnings = (newViews / 1000) * 2.0;
        }
        if (!isFinite(earnings)) earnings = 0;
        
        // FIX: Force integer earnings to prevent decimal overflow in display
        earnings = Math.floor(earnings);

        weeklyRevenue += earnings;

        // Subs gained from this video this week
        // FIX: Improved Conversion rate
        // Base: 1 sub per ~100 views for small channels, harder for large channels
        // Quality increases conversion
        let conversionRate = 150; // 1 sub per 150 views baseline
        if (video.qualityScore > 80) conversionRate = 80; // High quality converts better (1 per 80)
        
        let subsGained = Math.floor(newViews / conversionRate);
        
        // "Viral Hit" mechanic: Random chance to double subs if quality is high
        if (video.qualityScore > 75 && Math.random() < 0.1) {
            subsGained *= 2;
        }

        if (!isFinite(subsGained)) subsGained = 0;
        
        newSubsTotal += subsGained;

        return {
            ...video,
            yearUploaded: videoYear, // Ensure field is populated if it was missing
            views: video.views + newViews,
            earnings: video.earnings + earnings,
            weeklyHistory: [...(video.weeklyHistory || []), newViews]
        };
    });

    channel.videos = updatedVideos;
    channel.subscribers += newSubsTotal;
    channel.lifetimeEarnings += weeklyRevenue;
    
    // Safety checks for channel totals
    if (!isFinite(channel.subscribers)) channel.subscribers = 0;
    if (!isFinite(channel.lifetimeEarnings)) channel.lifetimeEarnings = 0;
    
    // Recalculate total views
    const totalViews = channel.videos.reduce((sum, v) => sum + v.views, 0);
    channel.totalChannelViews = totalViews;

    // 2. Monetization Check
    if (!channel.isMonetized) {
        if (channel.subscribers >= 1000 && totalViews >= 4000) { // Lowered threshold slightly for realism/gameplay balance
            channel.isMonetized = true;
            notifications.push("🎉 You are now eligible for YouTube Monetization! Revenue enabled.");
        }
    }

    return { channel, weeklyRevenue, newSubs: newSubsTotal, notifications };
};
