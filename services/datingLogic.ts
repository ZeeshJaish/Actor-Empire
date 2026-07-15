import { DatingMatch, DatingPreferences, NPCActor, Player } from '../types';
import { NPC_DATABASE, getGenderedAvatar } from './npcLogic';
import { getEstimatedNetWorth } from './loanLogic';
import { getAbsoluteWeek } from './legacyLogic';
import { getPlayerLanguage, t } from './i18n';

const RANDOM_JOBS = [
    'Actor', 'Assistant Director', 'Barista', 'Chef', 'Choreographer', 'Creative Producer', 'Dancer', 'Designer',
    'Doctor', 'Engineer', 'Event Curator', 'Fashion Stylist', 'Fitness Coach', 'Founder', 'Gallery Manager',
    'Indie Musician', 'Influencer', 'Journalist', 'Lawyer', 'Model', 'Music Producer', 'Nurse', 'Photographer',
    'Podcast Host', 'Publicist', 'Screenwriter', 'Social Media Manager', 'Startup Operator', 'Student', 'Teacher',
    'Trainer', 'Travel Creator', 'VFX Artist', 'Writer'
];

const RANDOM_CITIES = [
    'Los Angeles', 'New York', 'London', 'Mumbai', 'Toronto', 'Paris', 'Seoul', 'Dubai', 'Atlanta', 'Austin',
    'Chicago', 'Miami', 'Vancouver', 'Melbourne', 'Berlin', 'Madrid', 'Tokyo', 'Singapore', 'Cape Town', 'Dublin'
];

const RANDOM_TINDER_BIOS = [
    'Knows the best late-night food spots and will judge your playlist.',
    'Mostly here for sharp banter, coffee, and a reason to dress up.',
    'Career-focused, low-drama, surprisingly good at remembering tiny details.',
    'Will say yes to a spontaneous plan if the vibe is convincing.',
    'Soft spot for movies, rooftop views, and people who text like adults.',
    'Looking for chemistry that does not feel like another networking event.',
    'Equal parts ambition, sarcasm, and questionable sleep schedule.',
    'Trying to keep life fun without turning everything into a headline.',
    'Will absolutely ask what your favorite bad movie is.',
    'Busy week, open calendar, curious mood.'
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const LAST_ACTIVE_LABELS = ['Active now', 'Seen at a gala tonight', 'Online 1h ago', 'Private profile', 'Recently active'];
const POWER_TRAITS = ['Collector', 'Discreet', 'Jet-setter', 'Investor', 'Philanthropist', 'Fashion fixture', 'Festival regular'];
const INTENTS: DatingMatch['relationshipIntent'][] = ['CASUAL', 'PRIVATE_ROMANCE', 'POWER_COUPLE', 'LONG_TERM', 'DISCREET'];
const PRIVACY_STYLES: DatingMatch['privacyStyle'][] = ['LOW_KEY', 'PUBLIC_FACING', 'MEDIA_MAGNET'];
const RANDOM_TINDER_NAMES: Record<'MALE' | 'FEMALE' | 'NON_BINARY', string[]> = {
    MALE: [
        'Aarav', 'Adrian', 'Aiden', 'Alex', 'Andre', 'Arjun', 'Asher', 'Ben', 'Caleb', 'Cameron',
        'Dante', 'Dev', 'Elias', 'Ethan', 'Felix', 'Finn', 'Gabriel', 'Hugo', 'Isaac', 'Jayden',
        'Kabir', 'Kai', 'Leo', 'Liam', 'Logan', 'Luca', 'Malik', 'Mason', 'Mateo', 'Miles',
        'Noah', 'Omar', 'Oscar', 'Rafael', 'Reid', 'Rohan', 'Roman', 'Sam', 'Theo', 'Zane'
    ],
    FEMALE: [
        'Aanya', 'Aisha', 'Amara', 'Anika', 'Aria', 'Avery', 'Bella', 'Chloe', 'Clara', 'Daisy',
        'Elena', 'Ella', 'Freya', 'Gia', 'Hana', 'Iris', 'Jade', 'Kiara', 'Layla', 'Leah',
        'Lila', 'Luna', 'Maya', 'Mia', 'Mira', 'Naomi', 'Nora', 'Priya', 'Quinn', 'Riley',
        'Sana', 'Sienna', 'Sofia', 'Tara', 'Valeria', 'Yara', 'Zara', 'Zoe'
    ],
    NON_BINARY: [
        'Ari', 'Ash', 'Blake', 'Casey', 'Dakota', 'Emery', 'Harper', 'Indigo', 'Jules', 'Kai',
        'Kendall', 'Lane', 'Noor', 'Phoenix', 'Reese', 'Remy', 'River', 'Rowan', 'Sage', 'Sky',
        'Tatum', 'Wren'
    ],
};
const RANDOM_TINDER_SURNAMES = [
    'Adams', 'Bennett', 'Brooks', 'Carter', 'Chaudhary', 'Chen', 'Clark', 'Cruz', 'Diaz', 'Ellis',
    'Foster', 'Garcia', 'Green', 'Hayes', 'Hughes', 'Kapoor', 'Khan', 'Kim', 'King', 'Lee',
    'Lewis', 'Martinez', 'Mehra', 'Morgan', 'Nakamura', 'Nguyen', 'Patel', 'Parker', 'Reed', 'Rivera',
    'Roy', 'Santos', 'Shah', 'Stone', 'Taylor', 'Thomas', 'Torres', 'Walker', 'Wilson', 'Young'
];

const LUXE_PLAYER_START_AGE = 15;

interface TinderProfileOptions {
    excludeNames?: string[];
    excludeFirstNames?: string[];
}

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

const getStableNpcAge = (npc: NPCActor): number => {
    if (typeof npc.age === 'number' && Number.isFinite(npc.age)) return npc.age;
    if (npc.tier === 'A_LIST') return 38;
    if (npc.tier === 'ESTABLISHED') return 33;
    return 26;
};

const getNpcLuxeAge = (player: Player, npc: NPCActor): number => {
    const baseAge = getStableNpcAge(npc);
    const careerYearsElapsed = Math.max(0, player.age - LUXE_PLAYER_START_AGE);
    return clamp(baseAge + careerYearsElapsed, 18, 100);
};

const npcMatchesPrefs = (player: Player, npc: NPCActor, prefs: DatingPreferences) => {
    const preferredGenders = getPreferredGenders(prefs);
    const age = getNpcLuxeAge(player, npc);
    return preferredGenders.includes(npc.gender) && age >= prefs.minAge && age <= prefs.maxAge;
};

const normalizeNameKey = (name: string) => name.trim().toLowerCase();

const getFirstName = (name: string) => normalizeNameKey(name).split(/\s+/)[0] || '';

export const generateTinderProfile = (prefs: DatingPreferences, options: TinderProfileOptions = {}): DatingMatch => {
    const minAge = Math.min(prefs.minAge, prefs.maxAge);
    const maxAge = Math.max(prefs.minAge, prefs.maxAge);
    const availableGenders = getPreferredGenders(prefs).filter((gender): gender is 'MALE' | 'FEMALE' | 'NON_BINARY' => gender !== 'ALL');
    const excludedNames = new Set((options.excludeNames || []).map(normalizeNameKey));
    const excludedFirstNames = new Set((options.excludeFirstNames || []).map(getFirstName).filter(Boolean));

    let selected = {
        age: minAge,
        gender: (availableGenders.length ? pick(availableGenders) : 'NON_BINARY') as 'MALE' | 'FEMALE' | 'NON_BINARY',
        firstName: 'Alex',
        lastName: 'Stone',
        fullName: 'Alex Stone',
        job: pick(RANDOM_JOBS),
        city: pick(RANDOM_CITIES),
        bio: pick(RANDOM_TINDER_BIOS),
    };

    for (let attempt = 0; attempt < 80; attempt += 1) {
        const gender = availableGenders.length ? pick(availableGenders) : 'NON_BINARY';
        const firstName = pick(RANDOM_TINDER_NAMES[gender]);
        const lastName = pick(RANDOM_TINDER_SURNAMES);
        const fullName = `${firstName} ${lastName}`;
        const fullNameKey = normalizeNameKey(fullName);
        const firstNameKey = getFirstName(fullName);
        selected = {
            age: Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge,
            gender,
            firstName,
            lastName,
            fullName,
            job: pick(RANDOM_JOBS),
            city: pick(RANDOM_CITIES),
            bio: pick(RANDOM_TINDER_BIOS),
        };

        if (!excludedNames.has(fullNameKey) && !excludedFirstNames.has(firstNameKey)) {
            break;
        }

        if (attempt > 30 && !excludedNames.has(fullNameKey)) {
            break;
        }
    }

    return {
        id: `tinder_rnd_${Date.now()}_${normalizeNameKey(selected.fullName).replace(/\s+/g, '_')}_${Math.random()}`,
        name: selected.fullName,
        age: selected.age,
        gender: selected.gender,
        job: selected.job,
        image: getGenderedAvatar(selected.gender, `${selected.fullName}_${selected.job}_${selected.city}`),
        type: 'RANDOM',
        chemistry: Math.floor(Math.random() * 100),
        isPremium: false,
        bio: `${selected.city} • ${selected.bio}`,
        handle: `@${selected.firstName.toLowerCase()}${selected.lastName.toLowerCase()}${Math.floor(10 + Math.random() * 89)}`,
    };
};

export const getLuxeCandidatePool = (player: Player): DatingMatch[] => {
    const elites = NPC_DATABASE.filter(npc =>
        (npc.netWorth > 1000000 || npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED') &&
        !player.relationships.some(r => r.npcId === npc.id && r.relation !== 'Connection') &&
        !player.dating.matches.some(m => m.npcId === npc.id) &&
        npcMatchesPrefs(player, npc, player.dating.preferences)
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

            const age = getNpcLuxeAge(player, npc);
            const prestigeTier = getPrestigeTier(npc);
            const relationshipIntent = getRelationshipIntent(npc);
            const privacyStyle = getPrivacyStyle(npc);

            return {
                id: `luxe_${npc.id}`,
                name: npc.name,
                age,
                gender: npc.gender,
                job: npc.occupation === 'ACTOR' ? 'Actor' : npc.occupation === 'DIRECTOR' ? 'Director' : 'Music Artist',
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

    return ranked.map(({ rankingScore, ...match }) => match as DatingMatch);
};

export const getLuxeCandidates = (player: Player, limit = 5, rotationSeed = 0): DatingMatch[] => {
    const ranked = getLuxeCandidatePool(player);
    if (ranked.length === 0) return [];

    const listSize = Math.max(3, limit);
    const startIndex = Math.abs(rotationSeed) % ranked.length;
    const rotated = Array.from({ length: Math.min(listSize, ranked.length) }, (_, index) => ranked[(startIndex + index) % ranked.length]);

    return rotated;
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

    const language = getPlayerLanguage(player);
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
                message: t(language, 'services.dating.luxe.cooldown.log', { name: updated.name }),
                type: 'neutral',
            });
        }

        if (weeksIdle >= 5 && (updated.officialStatus === 'MATCHED' || updated.officialStatus === 'COOLDOWN') && Math.random() < 0.12) {
            updated.officialStatus = 'GHOSTED';
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: t(language, 'services.dating.luxe.ghosted.log', { name: updated.name }),
                type: 'negative',
            });
        }

        if ((updated.officialStatus === 'SEEING' || updated.dateCount) && weeksIdle <= 1 && Math.random() < 0.12) {
            updated.chemistry = Math.min(100, updated.chemistry + 1);
            logsToAdd.unshift({
                week: player.currentWeek,
                year: player.age,
                message: t(language, 'services.dating.luxe.orbit.log', { name: updated.name }),
                type: 'positive',
            });
        }

        if ((updated.scandalHeat || 0) > 0 && Math.random() < Math.min(0.35, (updated.scandalHeat || 0) / 100)) {
            newsToAdd.unshift({
                id: `news_luxe_heat_${updated.id}_${Date.now()}`,
                headline: t(language, 'services.dating.luxe.heat.news.headline', { playerName: player.name, name: updated.name }),
                subtext: t(language, 'services.dating.luxe.heat.news.subtext'),
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
                content: t(language, 'services.dating.luxe.heat.x.content', { playerName: player.name, name: updated.name }),
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
