
import { DatingMatch, DatingPreferences, Player } from '../types';
import { NPC_DATABASE } from './npcLogic';

const RANDOM_JOBS = [
    'Barista', 'Model', 'Student', 'Influencer', 'Writer', 'Stylist', 'Musician', 'Dancer', 'Photographer', 'Artist',
    'Nurse', 'Teacher', 'Trainer', 'Chef', 'Assistant', 'Producer', 'Designer', 'Engineer', 'Lawyer', 'Doctor'
];

const RANDOM_BIOS = [
    "Just looking for fun.", "Here for a good time, not a long time.", "Aspiring artist.", "Love to travel.", "Coffee addict.",
    "Swipe right if you have a dog.", "Not actually 25.", "IG: @...", "New to the city.", "Let's grab a drink."
];

// Helper to get random item
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateTinderProfile = (prefs: DatingPreferences): DatingMatch => {
    // Generate age within range
    const age = Math.floor(Math.random() * (prefs.maxAge - prefs.minAge + 1)) + prefs.minAge;
    
    // Determine gender based on preference (Visuals only via avatar seed)
    const seed = Math.random().toString(36).substring(7);
    
    // Simple job picker
    const job = pick(RANDOM_JOBS);

    return {
        id: `tinder_rnd_${Date.now()}_${Math.random()}`,
        name: pick(['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Morgan']) + ' ' + pick(['Smith', 'Doe', 'Brown', 'Wilson', 'Lee', 'Kim']),
        age,
        job,
        image: `https://api.dicebear.com/8.x/avataaars/svg?seed=${seed}`,
        type: 'RANDOM',
        chemistry: Math.floor(Math.random() * 100),
        isPremium: false
    };
};

export const getLuxeCandidates = (player: Player): DatingMatch[] => {
    // Filter NPC Database for Elite
    const elites = NPC_DATABASE.filter(npc => 
        (npc.netWorth > 1000000 || npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED') &&
        // Basic filter to ensure we don't show existing relationships too weirdly (optional)
        !player.relationships.some(r => r.npcId === npc.id && r.relation !== 'Connection') 
    );

    return elites.map(npc => ({
        id: `luxe_${npc.id}`,
        name: npc.name,
        age: 25 + Math.floor(Math.random() * 20), // Placeholder age as NPC DB doesn't have age yet
        job: npc.occupation === 'ACTOR' ? 'Actor' : 'Director',
        image: npc.avatar,
        type: 'NPC',
        npcId: npc.id,
        chemistry: Math.floor(Math.random() * 100),
        isPremium: true
    }));
};

export const calculateSwipeSuccess = (player: Player, match: DatingMatch): boolean => {
    // Randoms are easy to match if you have decent looks
    if (match.type === 'RANDOM') {
        const attractiveness = player.stats.looks;
        const chance = 30 + (attractiveness * 0.7); // 30% base + up to 70% from looks
        return Math.random() * 100 < chance;
    } 
    
    // Premium/NPCs care about Fame & Status
    else {
        const fame = player.stats.fame;
        const looks = player.stats.looks;
        const money = player.money;
        
        let score = (fame * 0.5) + (looks * 0.3);
        if (money > 1000000) score += 20; // Millionaire bonus
        
        return Math.random() * 100 < score;
    }
};
