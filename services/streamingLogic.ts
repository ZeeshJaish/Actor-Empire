
import { PlatformId, StreamingState, ActiveRelease, ProjectDetails, ProjectType } from '../types';

export interface PlatformProfile {
    id: PlatformId;
    name: string;
    audienceMult: number; // Reach
    prestigeMult: number; // Reputation impact
    payoutMult: number;   // Money factor
    churnRate: 'FAST' | 'MEDIUM' | 'SLOW';
    genreBias: string[];
    color: string;
    subscribers: number; // Millions
    valuation: number; // Billions
}

export const PLATFORMS: Record<PlatformId, PlatformProfile> = {
    NETFLIX: {
        id: 'NETFLIX',
        name: 'Netflix',
        audienceMult: 1.5, // Huge reach
        prestigeMult: 0.8, // Medium prestige
        payoutMult: 1.2,   // Good money
        churnRate: 'FAST', // Content leaves quickly
        genreBias: ['Thriller', 'Action', 'RomCom', 'Sci-Fi'],
        color: 'text-red-600',
        subscribers: 260,
        valuation: 260
    },
    APPLE_TV: {
        id: 'APPLE_TV',
        name: 'Apple TV+',
        audienceMult: 0.6, // Niche
        prestigeMult: 1.5, // Awards bait
        payoutMult: 1.0,
        churnRate: 'SLOW', // Content stays
        genreBias: ['Drama', 'Indie', 'Sci-Fi'],
        color: 'text-zinc-400',
        subscribers: 45,
        valuation: 2900 // Parent company
    },
    DISNEY_PLUS: {
        id: 'DISNEY_PLUS',
        name: 'Disney+',
        audienceMult: 1.4,
        prestigeMult: 1.0,
        payoutMult: 1.1,
        churnRate: 'SLOW',
        genreBias: ['Fantasy', 'Action', 'Sci-Fi'],
        color: 'text-blue-500',
        subscribers: 150,
        valuation: 180
    },
    HULU: {
        id: 'HULU',
        name: 'Hulu',
        audienceMult: 0.9,
        prestigeMult: 0.9,
        payoutMult: 0.9,
        churnRate: 'MEDIUM',
        genreBias: ['Drama', 'RomCom', 'Thriller'],
        color: 'text-emerald-500',
        subscribers: 48,
        valuation: 27
    },
    YOUTUBE: {
        id: 'YOUTUBE',
        name: 'YouTube',
        audienceMult: 2.0, // Massive potential
        prestigeMult: 0.2, // Low prestige
        payoutMult: 0.4,   // Low pay
        churnRate: 'FAST',
        genreBias: ['Indie', 'Horror'],
        color: 'text-red-500',
        subscribers: 2700, // Users essentially
        valuation: 350 // Parent
    }
};

// --- ACQUISITION LOGIC ---

export const determineStreamingAcquisition = (project: ProjectDetails): PlatformId => {
    // Bias selection based on project details
    const scores: Record<PlatformId, number> = {
        NETFLIX: 10,
        APPLE_TV: 5,
        DISNEY_PLUS: 5,
        HULU: 8,
        YOUTUBE: 0
    };

    const genre = project.genre;
    const budget = project.budgetTier;
    const quality = project.hiddenStats.qualityScore;

    // 1. Genre Fit
    Object.values(PLATFORMS).forEach(plat => {
        if (plat.genreBias.includes(genre)) scores[plat.id] += 20;
    });

    // 2. Budget Fit
    if (budget === 'HIGH') {
        scores['DISNEY_PLUS'] += 40;
        scores['NETFLIX'] += 20;
        scores['YOUTUBE'] -= 100; // Blockbusters dont go to YT usually
    } else if (budget === 'LOW') {
        scores['YOUTUBE'] += 50;
        scores['APPLE_TV'] += (quality > 70) ? 30 : -10; // Apple likes good indies
    }

    // 3. Quality Fit
    if (quality > 80) {
        scores['APPLE_TV'] += 40;
        scores['HULU'] += 10;
    } else if (quality < 40) {
        scores['NETFLIX'] += 20; // Needs content volume
        scores['YOUTUBE'] += 30;
        scores['APPLE_TV'] -= 50;
    }

    // Weighted Random Selection
    let pool: PlatformId[] = [];
    Object.entries(scores).forEach(([id, score]) => {
        const count = Math.max(1, Math.floor(score));
        for(let i=0; i<count; i++) pool.push(id as PlatformId);
    });

    return pool[Math.floor(Math.random() * pool.length)] || 'NETFLIX';
};

// --- VIEWERSHIP LOGIC ---

export const calculateStreamingViewership = (
    platformId: PlatformId,
    weekOnPlatform: number,
    projectQuality: number,
    prevViews: number,
    type: ProjectType
): number => {
    const platform = PLATFORMS[platformId];
    
    // Base Viewership Unit (e.g. 2.5M per "unit" of hype)
    // Scaled up significantly to reflect real world streaming numbers (Millions not thousands)
    let baseUnit = 2500000 * platform.audienceMult; 

    // TV Shows get a Binge Multiplier (Simulates multiple episodes watched per user)
    if (type === 'SERIES') {
        baseUnit *= 2.0;
    }

    if (weekOnPlatform === 1) {
        // Launch week
        const hypeMult = (projectQuality / 50); // 0.5 - 2.0
        return Math.floor(baseUnit * hypeMult * (Math.random() + 0.5));
    } else {
        // Decay
        let decay = 0.85; // Default decay
        if (platform.churnRate === 'FAST') decay = 0.75;
        if (platform.churnRate === 'SLOW') decay = 0.90;
        
        // TV Shows retain viewers better (binge watching over weeks)
        if (type === 'SERIES') decay += 0.05;
        
        // Quality buff
        if (projectQuality > 80) decay += 0.05;

        // Cap decay to prevent infinite runs, but allow good legs
        decay = Math.min(0.98, decay);

        return Math.floor(prevViews * decay * (Math.random() * 0.2 + 0.9));
    }
};

export const checkStreamingExit = (platformId: PlatformId, views: number, weeks: number): boolean => {
    const platform = PLATFORMS[platformId];
    // Threshold scaled up due to higher view counts. ~250k views per week minimum to stay active.
    const threshold = 250000 * platform.audienceMult; 
    
    // Hard caps
    if (weeks > 52) return true; // Max 1 year tracked
    
    // Viewership drop
    if (weeks > 4 && views < threshold) return true;

    return false;
};
