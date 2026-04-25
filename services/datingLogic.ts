import { DatingMatch, DatingPreferences, NPCActor, Player } from '../types';
import { NPC_DATABASE, getGenderedAvatar } from './npcLogic';
import { getEstimatedNetWorth } from './loanLogic';
import { getAbsoluteWeek } from './legacyLogic';

const RANDOM_JOBS = [
    'Barista', 'Model', 'Student', 'Influencer', 'Writer', 'Stylist', 'Musician', 'Dancer', 'Photographer', 'Artist',
    'Nurse', 'Teacher', 'Trainer', 'Chef', 'Assistant', 'Producer', 'Designer', 'Engineer', 'Lawyer', 'Doctor'
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const LAST_ACTIVE_LABELS = ['Active now', 'Seen at a gala tonight', 'Online 1h ago', 'Private profile', 'Recently active'];
const POWER_TRAITS = ['Collector', 'Discreet', 'Jet-setter', 'Investor', 'Philanthropist', 'Fashion fixture', 'Festival regular'];
const INTENTS: DatingMatch['relationshipIntent'][] = ['CASUAL', 'PRIVATE_ROMANCE', 'POWER_COUPLE', 'LONG_TERM', 'DISCREET'];
const PRIVACY_STYLES: DatingMatch['privacyStyle'][] = ['LOW_KEY', 'PUBLIC_FACING', 'MEDIA_MAGNET'];
const RANDOM_TINDER_NAMES: Record<'MALE' | 'FEMALE' | 'NON_BINARY', string[]> = {
    MALE: ['Alex', 'Sam', 'Jordan', 'Taylor', 'Jamie', 'Mason', 'Logan', 'Theo', 'Noah', 'Ethan'],
    FEMALE: ['Avery', 'Morgan', 'Riley', 'Quinn', 'Chloe', 'Mia', 'Luna', 'Nora', 'Zoe', 'Ella'],
    NON_BINARY: ['Casey', 'Rowan', 'Sage', 'Ari', 'Phoenix', 'Emery', 'River', 'Harper', 'Kai', 'Dakota'],
};
const RANDOM_TINDER_SURNAMES = ['Smith', 'Doe', 'Brown', 'Wilson', 'Lee', 'Kim', 'Patel', 'Clark', 'Stone', 'Parker'];

export const LUXE_REFRESH_COST = 85000;
export const LUXE_REFRESH_CYCLE_WEEKS = 3;
export const LUXE_INVITE_COSTS = {
    PRIVATE_DINNER: 18000,
    ART_GALA: 45000,
    YACHT_ESCAPE: 160000,
    RED_CARPET: 70000,
    FASHION_WEEK: 95000,
} as const;

const getPreferredGenders = (prefs: DatingPreferences) => {
    if (prefs.gender === 'ALL') return ['MALE', 'FEMALE', 'NON_BINARY'];
    return [prefs.gender];
};

const getPlayerPublicHeat = (player: Player) =>
    clamp(
        player.stats.fame * 0.45 +
        player.stats.reputation * 0.25 +
        Math.min(25, Math.log10(Math.max(100, player.stats.followers || 0)) * 8),
        0,
        100
    );

const getLuxeStageModifier = (status?: DatingMatch['officialStatus']) => {
    switch (status) {
        case 'SEEING':
            return 8;
        case 'COOLDOWN':
            return -10;
        case 'GHOSTED':
            return -18;
        default:
            return 0;
    }
};

const getEliteDesirabilityScore = (player: Player) => {
    const netWorth = getEstimatedNetWorth(player);
    const wealthScore = clamp(Math.log10(Math.max(10000, netWorth)) * 13 - 40, 0, 40);
    const fameScore = clamp(player.stats.fame * 0.42, 0, 35);
    const looksScore = clamp(player.stats.looks * 0.18, 0, 18);
    const repScore = clamp(player.stats.reputation * 0.14, -10, 12);
    const businessScore = clamp((player.businesses?.length || 0) * 3, 0, 12);
    return clamp(wealthScore + fameScore + looksScore + repScore + businessScore, 5, 100);
};

const getPrestigeTier = (npc: NPCActor): DatingMatch['prestigeTier'] => {
    if (npc.tier === 'A_LIST' && npc.prestigeBias === 'PRESTIGE') return 'Industry Royalty';
    if (npc.netWorth >= 250000000) return 'Old Money';
    if (npc.followers >= 15000000) return 'Celebrity';
    if (npc.tier === 'ESTABLISHED' || npc.prestigeBias === 'COMMERCIAL') return 'Power Player';
    return 'Rising Elite';
};

const getRelationshipIntent = (npc: NPCActor): DatingMatch['relationshipIntent'] => {
    if (npc.tier === 'A_LIST' && npc.followers > 20000000) return 'POWER_COUPLE';
    if (npc.prestigeBias === 'PRESTIGE') return Math.random() > 0.5 ? 'PRIVATE_ROMANCE' : 'LONG_TERM';
    if ((npc.traits || []).includes('DIVA')) return 'CASUAL';
    if ((npc.traits || []).includes('PROFESSIONAL')) return 'LONG_TERM';
    return pick(INTENTS);
};

const getPrivacyStyle = (npc: NPCActor): DatingMatch['privacyStyle'] => {
    if ((npc.traits || []).includes('DIVA')) return 'MEDIA_MAGNET';
    if ((npc.traits || []).includes('METHOD')) return 'LOW_KEY';
    if (npc.followers > 15000000) return 'PUBLIC_FACING';
    return pick(PRIVACY_STYLES);
};

const getEliteCompatibility = (player: Player, npc: NPCActor) => {
    const desirability = getEliteDesirabilityScore(player);
    const targetStatus = clamp(
        (npc.tier === 'A_LIST' ? 26 : npc.tier === 'ESTABLISHED' ? 18 : 12) +
        Math.log10(Math.max(100000, npc.netWorth)) * 4.5,
        20,
        70
    );

    const statusFit = 100 - clamp(Math.abs(desirability - targetStatus) * 1.4, 0, 60);
    const reputationFit = 100 - clamp(Math.max(0, 55 - player.stats.reputation) * 1.1, 0, 45);
    const attractionFit = clamp(player.stats.looks * 0.55 + player.stats.fame * 0.35 + player.stats.happiness * 0.1, 10, 100);
    const privacyFit =
        getPlayerPublicHeat(player) > 72 && ((npc.traits || []).includes('METHOD') || npc.prestigeBias === 'PRESTIGE')
            ? -10
            : 0;
    const score = clamp(statusFit * 0.42 + reputationFit * 0.2 + attractionFit * 0.28 + privacyFit + Math.random() * 12, 25, 98);
    return Math.round(score);
};

const getMatchReason = (player: Player, npc: NPCActor, compatibility: number) => {
    if (compatibility >= 88) return `${npc.name.split(' ')[0]} sees power-couple potential in your rise.`;
    if (player.stats.fame >= 70) return `${npc.name.split(' ')[0]} is drawn to your current buzz and visibility.`;
    if (getEstimatedNetWorth(player) >= 50000000) return `${npc.name.split(' ')[0]} respects your money, ambition, and discretion.`;
    if (npc.prestigeBias === 'PRESTIGE') return `${npc.name.split(' ')[0]} likes your reputation more than your headlines.`;
    return `${npc.name.split(' ')[0]} thinks you could be a fun high-status distraction.`;
};

const estimateNpcAge = (npc: NPCActor) => {
    if (npc.tier === 'A_LIST') return 32 + Math.floor(Math.random() * 20);
    if (npc.tier === 'ESTABLISHED') return 27 + Math.floor(Math.random() * 18);
    return 22 + Math.floor(Math.random() * 12);
};

const npcMatchesPrefs = (npc: NPCActor, prefs: DatingPreferences) => {
    const preferredGenders = getPreferredGenders(prefs);
    const age = estimateNpcAge(npc);
    return preferredGenders.includes(npc.gender) && age >= prefs.minAge && age <= prefs.maxAge;
};

export const generateTinderProfile = (prefs: DatingPreferences): DatingMatch => {
    const age = Math.floor(Math.random() * (prefs.maxAge - prefs.minAge + 1)) + prefs.minAge;
    const availableGenders = getPreferredGenders(prefs).filter((gender): gender is 'MALE' | 'FEMALE' | 'NON_BINARY' => gender !== 'ALL');
    const gender = availableGenders.length ? pick(availableGenders) : 'NON_BINARY';
    const firstName = pick(RANDOM_TINDER_NAMES[gender]);
    const lastName = pick(RANDOM_TINDER_SURNAMES);
    const fullName = `${firstName} ${lastName}`;
    const job = pick(RANDOM_JOBS);

    return {
        id: `tinder_rnd_${Date.now()}_${Math.random()}`,
        name: fullName,
        age,
        gender,
        job,
        image: getGenderedAvatar(gender, fullName),
        type: 'RANDOM',
        chemistry: Math.floor(Math.random() * 100),
        isPremium: false
    };
};

export const getLuxeCandidates = (player: Player, limit = 5, rotationSeed = 0): DatingMatch[] => {
    const elites = NPC_DATABASE.filter(npc =>
        (npc.netWorth > 1000000 || npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED') &&
        !player.relationships.some(r => r.npcId === npc.id && r.relation !== 'Connection') &&
        !player.dating.matches.some(m => m.npcId === npc.id) &&
        npcMatchesPrefs(npc, player.dating.preferences)
    );

    const ranked = elites
        .map(npc => {
            const compatibility = getEliteCompatibility(player, npc);
            const luxeTraits = Array.from(
                new Set([
                    ...(npc.traits || []).slice(0, 2),
                    pick(POWER_TRAITS),
                    npc.prestigeBias === 'PRESTIGE' ? 'Tasteful' : 'Headline-worthy',
                ])
            ).slice(0, 3);

            const age = estimateNpcAge(npc);
            const prestigeTier = getPrestigeTier(npc);
            const relationshipIntent = getRelationshipIntent(npc);
            const privacyStyle = getPrivacyStyle(npc);

            return {
                id: `luxe_${npc.id}`,
                name: npc.name,
                age,
                gender: npc.gender,
                job: npc.occupation === 'ACTOR' ? 'Actor' : 'Director',
                image: npc.avatar,
                type: 'NPC' as const,
                npcId: npc.id,
                chemistry: compatibility,
                compatibility,
                isPremium: true,
                bio: npc.bio,
                handle: npc.handle,
                netWorth: npc.netWorth,
                followers: npc.followers,
                prestigeBias: npc.prestigeBias,
                prestigeTier,
                luxeTraits,
                relationshipIntent,
                privacyStyle,
                matchReason: getMatchReason(player, npc, compatibility),
                lastActiveLabel: pick(LAST_ACTIVE_LABELS),
                inviteHistory: [],
                officialStatus: 'MATCHED',
                dateCount: 0,
                intimacyCount: 0,
                scandalHeat: 0,
                rankingScore:
                    compatibility * 0.62 +
                    (npc.tier === 'A_LIST' ? 18 : npc.tier === 'ESTABLISHED' ? 12 : 4) +
                    Math.log10(Math.max(100000, npc.followers)) * 4,
            };
        })
        .sort((a, b) => (b as any).rankingScore - (a as any).rankingScore);

    if (ranked.length === 0) return [];

    const listSize = Math.max(3, limit);
    const startIndex = Math.abs(rotationSeed) % ranked.length;
    const rotated = Array.from({ length: Math.min(listSize, ranked.length) }, (_, index) => ranked[(startIndex + index) % ranked.length]);

    return rotated.map(({ rankingScore, ...match }) => match as DatingMatch);
};

export const calculateSwipeSuccess = (player: Player, match: DatingMatch): boolean => {
    if (match.type === 'RANDOM') {
        const attractiveness = player.stats.looks;
        const chance = 30 + (attractiveness * 0.7);
        return Math.random() * 100 < chance;
    }

    const desirability = getEliteDesirabilityScore(player);
    const chemistry = match.compatibility ?? match.chemistry;
    const privacyPenalty =
        match.privacyStyle === 'LOW_KEY' && getPlayerPublicHeat(player) > 78
            ? 12
            : match.privacyStyle === 'MEDIA_MAGNET' && player.stats.fame < 20
                ? 8
                : 0;
    const reputationPenalty = Math.max(0, 45 - player.stats.reputation) * 0.35;
    const wealthBonus = getEstimatedNetWorth(player) >= 10000000 ? 8 : getEstimatedNetWorth(player) >= 1000000 ? 3 : 0;

    const chance = clamp(chemistry * 0.48 + desirability * 0.38 + wealthBonus - privacyPenalty - reputationPenalty, 18, 96);
    return Math.random() * 100 < chance;
};

export const advanceTinderConnections = (player: Player): Player => {
    const tinderMatches = player.dating.matches.filter(match => !match.isPremium);
    if (tinderMatches.length === 0) return player;

    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const logsToAdd = [...player.logs];

    const updatedMatches = player.dating.matches.map(match => {
        if (match.isPremium) return match;

        const lastInteractionAbsolute = match.lastInteractionAbsolute ?? currentAbsoluteWeek - 1;
        const weeksIdle = Math.max(0, currentAbsoluteWeek - lastInteractionAbsolute);
        let updated = { ...match };

        if (weeksIdle >= 2) {
            updated.chemistry = Math.max(5, updated.chemistry - Math.min(8, weeksIdle * 2));
        }

        if (weeksIdle >= 2 && updated.tinderStage === 'MATCHED' && Math.random() < 0.24) {
            updated.tinderStage = 'GHOSTED';
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: `👻 ${updated.name} from Tinder has gone quiet.`,
                type: 'neutral',
            });
        } else if (weeksIdle >= 4 && updated.tinderStage !== 'DATING' && Math.random() < 0.16) {
            updated.tinderStage = 'GHOSTED';
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: `📵 ${updated.name} faded out of your Tinder orbit.`,
                type: 'neutral',
            });
        } else if (weeksIdle <= 1 && (updated.tinderStage === 'CASUAL' || updated.tinderStage === 'FWB') && Math.random() < 0.14) {
            updated.chemistry = Math.min(100, updated.chemistry + 1);
        }

        return updated;
    });

    return {
        ...player,
        dating: {
            ...player.dating,
            matches: updatedMatches,
        },
        logs: logsToAdd.slice(0, 80),
    };
};

export const getLuxeInviteOutcome = (
    player: Player,
    match: DatingMatch,
    inviteKind: 'PRIVATE_DINNER' | 'ART_GALA' | 'YACHT_ESCAPE' | 'RED_CARPET' | 'FASHION_WEEK',
    mode: 'PRIVATE' | 'PUBLIC'
) => {
    const baseChemistry = match.chemistry + (match.compatibility || 0) * 0.4;
    const publicHeat = getPlayerPublicHeat(player);
    const stageModifier = getLuxeStageModifier(match.officialStatus);
    const intentBoost =
        match.relationshipIntent === 'POWER_COUPLE' && mode === 'PUBLIC'
            ? 14
            : (match.relationshipIntent === 'PRIVATE_ROMANCE' || match.relationshipIntent === 'DISCREET') && mode === 'PRIVATE'
                ? 12
                : match.relationshipIntent === 'LONG_TERM' && inviteKind === 'PRIVATE_DINNER'
                    ? 10
                    : 0;
    const privacyPenalty =
        match.privacyStyle === 'LOW_KEY' && mode === 'PUBLIC'
            ? 16
            : match.privacyStyle === 'MEDIA_MAGNET' && mode === 'PRIVATE'
                ? 4
                : 0;
    const prestigeBoost =
        inviteKind === 'ART_GALA' && match.prestigeBias === 'PRESTIGE'
            ? 10
            : inviteKind === 'RED_CARPET' && match.privacyStyle !== 'LOW_KEY'
                ? 8
                : inviteKind === 'YACHT_ESCAPE' && (match.prestigeTier === 'Old Money' || match.prestigeTier === 'Power Player')
                    ? 12
                    : 0;

    const successScore = clamp(baseChemistry * 0.45 + player.stats.looks * 0.25 + player.stats.fame * 0.18 + intentBoost + prestigeBoost + stageModifier - privacyPenalty - Math.max(0, 55 - player.stats.reputation) * 0.25, 15, 98);
    const success = Math.random() * 100 < successScore;

    let chemistryGain = success ? 8 + Math.floor(successScore / 14) : -4;
    if (mode === 'PUBLIC' && success) chemistryGain += 3;
    if (mode === 'PRIVATE' && match.relationshipIntent === 'PRIVATE_ROMANCE') chemistryGain += 4;

    const followerDelta =
        mode === 'PUBLIC'
            ? success
                ? 1200 + Math.floor(publicHeat * 40 + (match.followers || 0) * 0.00008)
                : 0
            : success && match.privacyStyle === 'MEDIA_MAGNET'
                ? 300 + Math.floor((match.followers || 0) * 0.00002)
                : 0;
    const reputationDelta =
        mode === 'PUBLIC'
            ? success
                ? (match.prestigeBias === 'PRESTIGE' ? 2 : 1)
                : -1
            : success && match.prestigeBias === 'PRESTIGE'
                ? 1
                : 0;

    return {
        success,
        chemistryGain,
        followerDelta,
        reputationDelta,
        headline:
            mode === 'PUBLIC'
                ? success
                    ? `${match.name.split(' ')[0]} and you are suddenly all over the town chatter.`
                    : `${match.name.split(' ')[0]} leaves you on read after the public invite.`
                : success
                    ? `${match.name.split(' ')[0]} agrees to keep things intimate and exclusive.`
                : `${match.name.split(' ')[0]} wants more mystery before meeting off-grid.`,
    };
};

export const advanceLuxeConnections = (player: Player): Player => {
    const premiumMatches = player.dating.matches.filter(match => match.isPremium);
    if (premiumMatches.length === 0) return player;

    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const newsToAdd = [...player.news];
    const xFeedToAdd = [...player.x.feed];
    const logsToAdd = [...player.logs];

    const updatedMatches = player.dating.matches.map(match => {
        if (!match.isPremium) return match;

        const lastInteractionAbsolute = match.lastInteractionAbsolute ?? currentAbsoluteWeek - 1;
        const weeksIdle = Math.max(0, currentAbsoluteWeek - lastInteractionAbsolute);
        let updated = { ...match };

        if (weeksIdle >= 2) {
            updated.chemistry = Math.max(8, updated.chemistry - Math.min(6, weeksIdle));
        }

        if (weeksIdle >= 3 && updated.officialStatus === 'MATCHED' && Math.random() < 0.18) {
            updated.officialStatus = 'COOLDOWN';
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: `❄️ ${updated.name} has gone a little cold. Luxe chemistry is cooling off.`,
                type: 'neutral',
            });
        }

        if (weeksIdle >= 5 && (updated.officialStatus === 'MATCHED' || updated.officialStatus === 'COOLDOWN') && Math.random() < 0.12) {
            updated.officialStatus = 'GHOSTED';
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: `👻 ${updated.name} has gone ghost for now. You may need something bigger to revive this.`,
                type: 'negative',
            });
        }

        if ((updated.officialStatus === 'SEEING' || updated.dateCount) && weeksIdle <= 1 && Math.random() < 0.12) {
            updated.chemistry = Math.min(100, updated.chemistry + 1);
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: `💬 ${updated.name} dropped back into your orbit this week.`,
                type: 'positive',
            });
        }

        if ((updated.scandalHeat || 0) > 0 && Math.random() < Math.min(0.35, (updated.scandalHeat || 0) / 100)) {
            newsToAdd.unshift({
                id: `news_luxe_heat_${updated.id}_${Date.now()}`,
                headline: `${player.name} and ${updated.name} spark fresh Luxe whispers`,
                subtext: 'The gossip cycle is picking up on the chemistry, secrecy, and strange timing of this connection.',
                category: 'YOU',
                week: player.currentWeek,
                year: player.age,
                impactLevel: (updated.scandalHeat || 0) > 50 ? 'HIGH' : 'MEDIUM',
            });
            xFeedToAdd.unshift({
                id: `x_luxe_heat_${updated.id}_${Date.now()}`,
                authorId: 'fanwire',
                authorName: 'FanWire',
                authorHandle: '@fanwire',
                authorAvatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=luxeheat',
                content: `${player.name} and ${updated.name} are back in rumor circulation. Luxe watchers think something is definitely happening.`,
                timestamp: Date.now(),
                likes: 800 + Math.floor((updated.followers || 0) * 0.00005),
                retweets: 120 + Math.floor((updated.followers || 0) * 0.00001),
                replies: 180 + Math.floor((updated.followers || 0) * 0.00002),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: true,
            });
            updated.scandalHeat = Math.max(0, (updated.scandalHeat || 0) - 14);
        } else if ((updated.scandalHeat || 0) > 0) {
            updated.scandalHeat = Math.max(0, (updated.scandalHeat || 0) - 4);
        }

        return updated;
    });

    return {
        ...player,
        dating: {
            ...player.dating,
            matches: updatedMatches,
        },
        news: newsToAdd.slice(0, 80),
        x: {
            ...player.x,
            feed: xFeedToAdd.slice(0, 100),
        },
        logs: logsToAdd.slice(0, 80),
    };
};
