
import { GameLanguage, Gender, NPCActor, NPCPrestige, NPCTier, Player, YoutubeBrandDeal, YoutubeChannel, YoutubeCollabOffer, YoutubeCreatorIdentity, YoutubeMerchResult, YoutubeMerchTier, YoutubeMusicVideoFeatureOffer, YoutubeVideo, YoutubeVideoType } from '../types';
import { getGenderedAvatar, NPC_DATABASE } from './npcLogic';
import { MOD_TALENT_ROWS, ModTalentRow } from './modTalentData';
import { MOD_TALENT_SUPPLEMENT_ROWS } from './modTalentSupplement';
import { hydrateGenreXP } from './genreCatalog';
import { getMusicArtistCatalog } from './musicIndustry';
import { getPlayerLanguage, t } from './i18n';
import { spendPlayerEnergy } from './premiumLogic';

export const YOUTUBE_MONETIZATION_SUBS = 1000;
export const YOUTUBE_MONETIZATION_VIEWS = 4000;
export const YOUTUBE_MERCH_COOLDOWN_WEEKS = 6;

export interface YoutubeMerchTierConfig {
    labelKey: string;
    cost: number;
    energy: number;
    trustReq: number;
    margin: number;
    heat: number;
}

export const YOUTUBE_MERCH_TIERS: Record<YoutubeMerchTier, YoutubeMerchTierConfig> = {
    BASIC: { labelKey: 'youtube.merch.BASIC.label', cost: 5_000, energy: 14, trustReq: 35, margin: 0.28, heat: 1 },
    PREMIUM: { labelKey: 'youtube.merch.PREMIUM.label', cost: 25_000, energy: 22, trustReq: 50, margin: 0.42, heat: 4 },
    LUXURY: { labelKey: 'youtube.merch.LUXURY.label', cost: 100_000, energy: 34, trustReq: 68, margin: 0.62, heat: 8 },
};

export type YoutubeMerchFailureReason =
    | 'COOLDOWN'
    | 'TRUST_REQUIRED'
    | 'NOT_ENOUGH_ENERGY'
    | 'NOT_ENOUGH_MONEY';

export interface YoutubeMerchQuote {
    tier: YoutubeMerchTier;
    grossRevenue: number;
    productionCost: number;
    netProfit: number;
    result: YoutubeMerchResult;
}

export interface YoutubeMerchResolution {
    success: boolean;
    player: Player;
    quote?: YoutubeMerchQuote;
    reason?: YoutubeMerchFailureReason;
}

const YOUTUBE_MERCH_IDENTITY_BOOST: Record<YoutubeCreatorIdentity, number> = {
    ACTOR_VLOGGER: 0,
    CHAOS_CREATOR: 0,
    PRESTIGE_FILMMAKER: -0.03,
    LIFESTYLE_ICON: 0.18,
    CONTROVERSY_MAGNET: -0.04,
};

const YOUTUBE_MERCH_IDENTITY_EFFECTS: Record<YoutubeCreatorIdentity, { mood: number; trust: number; heat: number }> = {
    ACTOR_VLOGGER: { mood: 1, trust: 1, heat: -1 },
    CHAOS_CREATOR: { mood: 2, trust: -1, heat: 3 },
    PRESTIGE_FILMMAKER: { mood: -1, trust: 2, heat: -2 },
    LIFESTYLE_ICON: { mood: 2, trust: 1, heat: 0 },
    CONTROVERSY_MAGNET: { mood: 3, trust: -2, heat: 5 },
};

const YOUTUBE_COLLAB_CONCEPTS = [
    "24 Hours On My Set",
    "Actor Life Unfiltered",
    "We Recreated A Scene With No Script",
    "Celebrity Challenge Gone Wrong",
    "Behind The Trailer Reaction",
    "Chaos Day In Hollywood"
];

const YOUTUBE_BRANDS = {
    FASHION: ['ASOS', 'H&M Studio', 'Zara Select', 'Aritzia'],
    FITNESS: ['Gymshark', 'Whoop', 'Hydro Boost', 'Eight Sleep'],
    TECH: ['Razer', 'Sony Creator Lab', 'Canon Creator', 'Logitech G'],
    BEVERAGE: ['Prime', 'Liquid I.V.', 'Celsius', 'Red Bull Creator'],
    LUXURY: ['Montblanc', 'Rimowa', 'Jacquemus', 'Aman'],
    AUTOMOTIVE: ['Polestar', 'BMW M', 'Porsche Drive', 'Audi Performance']
} as const;

const YOUTUBE_COLLAB_TYPES: YoutubeVideoType[] = ['VLOG', 'SKIT', 'Q_AND_A', 'STORYTIME'];
const YOUTUBE_BRAND_TYPES: YoutubeVideoType[] = ['VLOG', 'TRAILER', 'Q_AND_A', 'STORYTIME'];

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const M = 1000000;

const getYoutubeAbsoluteWeek = (player: Pick<Player, 'age' | 'currentWeek'>) => (
    Math.max(1, Math.round(Number(player.age) || 1)) * 52
    + Math.min(52, Math.max(1, Math.round(Number(player.currentWeek) || 1)))
);

export const getYoutubeMerchDropFailure = (
    player: Player,
    tier: YoutubeMerchTier,
): YoutubeMerchFailureReason | undefined => {
    const config = YOUTUBE_MERCH_TIERS[tier];
    const channel = player.youtube;
    const currentAbsoluteWeek = getYoutubeAbsoluteWeek(player);
    if (currentAbsoluteWeek - Math.max(0, Number(channel.lastMerchDropWeek) || 0) < YOUTUBE_MERCH_COOLDOWN_WEEKS) {
        return 'COOLDOWN';
    }
    if (Math.max(0, Number(channel.audienceTrust) || 0) < config.trustReq) {
        return 'TRUST_REQUIRED';
    }
    if (Math.max(0, Number(player.energy?.current) || 0) < config.energy) {
        return 'NOT_ENOUGH_ENERGY';
    }
    if (Math.max(0, Number(player.money) || 0) < config.cost) {
        return 'NOT_ENOUGH_MONEY';
    }
    return undefined;
};

export const calculateYoutubeMerchQuote = (
    player: Player,
    tier: YoutubeMerchTier,
    random: () => number = Math.random,
): YoutubeMerchQuote => {
    const config = YOUTUBE_MERCH_TIERS[tier];
    const channel = player.youtube;
    const mood = clamp(Number(channel.fanMood) || 55);
    const trust = clamp(Number(channel.audienceTrust) || 55);
    const controversy = clamp(Number(channel.controversy) || 0);
    const subscribers = Math.max(0, Math.floor(Number(channel.subscribers) || 0));
    const identity = channel.creatorIdentity || 'ACTOR_VLOGGER';
    const identityBoost = YOUTUBE_MERCH_IDENTITY_BOOST[identity] || 0;
    const demand = Math.max(
        0.25,
        (mood / 100)
        + (trust / 180)
        + (subscribers >= 100_000 ? 0.25 : 0)
        - (controversy / 180)
        + identityBoost,
    );
    const rawSalesRoll = Number(random());
    const salesRoll = clamp(Number.isFinite(rawSalesRoll) ? rawSalesRoll : 0.5, 0, 1);
    const grossRevenue = Math.max(
        0,
        Math.floor(subscribers * config.margin * demand * (0.7 + salesRoll * 0.65)),
    );
    const netProfit = grossRevenue - config.cost;
    const result: YoutubeMerchResult = netProfit > config.cost * 1.2
        ? 'SOLD_OUT'
        : netProfit < 0
            ? 'UNDERPERFORMED'
            : 'PROFIT';

    return {
        tier,
        grossRevenue,
        productionCost: config.cost,
        netProfit,
        result,
    };
};

const getYoutubeMerchResultLabel = (
    language: GameLanguage,
    quote: YoutubeMerchQuote,
) => {
    const tierLabel = t(language, YOUTUBE_MERCH_TIERS[quote.tier].labelKey);
    if (quote.result === 'SOLD_OUT') {
        return t(language, 'youtube.merch.result.soldOut', { tier: tierLabel });
    }
    if (quote.result === 'UNDERPERFORMED') {
        return t(language, 'youtube.merch.result.underperformed', { tier: tierLabel });
    }
    return t(language, 'youtube.merch.result.profit', { tier: tierLabel });
};

export const resolveYoutubeMerchDrop = (
    player: Player,
    tier: YoutubeMerchTier,
    random: () => number = Math.random,
    language: GameLanguage = getPlayerLanguage(player),
): YoutubeMerchResolution => {
    const reason = getYoutubeMerchDropFailure(player, tier);
    if (reason) return { success: false, player, reason };

    const config = YOUTUBE_MERCH_TIERS[tier];
    const quote = calculateYoutubeMerchQuote(player, tier, random);
    const identityEffects = YOUTUBE_MERCH_IDENTITY_EFFECTS[player.youtube.creatorIdentity || 'ACTOR_VLOGGER'];
    const absoluteWeek = getYoutubeAbsoluteWeek(player);
    const outcomeId = `youtube_merch_${player.age}_${player.currentWeek}_${tier}`;
    const resultLabel = getYoutubeMerchResultLabel(language, quote);
    const cashAfter = Math.max(0, (Number(player.money) || 0) + quote.netProfit);
    const salesTransactionId = `tx_${outcomeId}_sales`;
    const costTransactionId = `tx_${outcomeId}_cost`;
    const existingHistory = Array.isArray(player.finance?.history) ? player.finance.history : [];
    const nextPlayer: Player = {
        ...player,
        money: cashAfter,
        energy: { ...player.energy },
        flags: { ...player.flags },
        youtube: {
            ...player.youtube,
            lifetimeEarnings: Math.max(0, Number(player.youtube.lifetimeEarnings) || 0) + Math.max(0, quote.netProfit),
            fanMood: clamp(
                (Number(player.youtube.fanMood) || 55)
                + (quote.result === 'SOLD_OUT' ? 6 : quote.result === 'UNDERPERFORMED' ? -5 : 2)
                + identityEffects.mood,
            ),
            audienceTrust: clamp(
                (Number(player.youtube.audienceTrust) || 55)
                + (quote.result === 'UNDERPERFORMED' ? -4 : 1)
                + identityEffects.trust,
            ),
            controversy: clamp(
                (Number(player.youtube.controversy) || 0)
                + config.heat
                + (quote.result === 'UNDERPERFORMED' ? 5 : 0)
                + identityEffects.heat,
            ),
            lastMerchDropWeek: absoluteWeek,
            lastMerchResult: resultLabel,
            lastMerchOutcome: {
                id: outcomeId,
                tier,
                result: quote.result,
                grossRevenue: quote.grossRevenue,
                productionCost: quote.productionCost,
                netProfit: quote.netProfit,
                cashAfter,
                week: player.currentWeek,
                year: player.age,
            },
        },
        finance: {
            ...player.finance,
            history: [
                {
                    id: salesTransactionId,
                    week: player.currentWeek,
                    year: player.age,
                    amount: quote.grossRevenue,
                    category: 'BUSINESS' as const,
                    description: t(language, 'youtube.finance.merchSales', {
                        tier: t(language, config.labelKey),
                    }),
                },
                {
                    id: costTransactionId,
                    week: player.currentWeek,
                    year: player.age,
                    amount: -quote.productionCost,
                    category: 'EXPENSE' as const,
                    description: t(language, 'youtube.finance.merchProduction', {
                        tier: t(language, config.labelKey),
                    }),
                },
                ...existingHistory.filter(transaction => (
                    transaction.id !== salesTransactionId
                    && transaction.id !== costTransactionId
                )),
            ].slice(0, 200),
        },
        logs: [
            ...(Array.isArray(player.logs) ? player.logs : []),
            {
                week: player.currentWeek,
                year: player.age,
                message: t(language, 'youtube.log.merchResult', {
                    result: resultLabel,
                    gross: quote.grossRevenue.toLocaleString(),
                    profit: quote.netProfit.toLocaleString(),
                }),
                type: quote.result === 'UNDERPERFORMED' ? 'negative' as const : 'positive' as const,
            },
        ].slice(-50),
    };

    spendPlayerEnergy(nextPlayer, config.energy, `YouTube: Merch ${t(language, config.labelKey)}`);
    return { success: true, player: nextPlayer, quote };
};

interface GlobalCreatorProfile {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    followers: number;
    country: string;
    gender: Exclude<Gender, 'ALL'>;
    netWorth?: number;
    tier?: NPCTier;
    prestigeBias?: NPCPrestige;
    forbesCategory?: string;
    age?: number;
}

const normalizeCreatorName = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const globalCreator = (
    name: string,
    country: string,
    followersM: number,
    gender: Exclude<Gender, 'ALL'> = 'MALE',
    netWorthM?: number,
    tier?: NPCTier,
    prestigeBias?: NPCPrestige,
    forbesCategory?: string,
    age?: number
): GlobalCreatorProfile => ({
    id: `yt_global_${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    name,
    handle: `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    avatar: getGenderedAvatar(gender, `${name} ${country}`),
    followers: Math.max(1000, Math.floor(followersM * M)),
    country,
    gender,
    netWorth: netWorthM === undefined ? undefined : Math.max(1_000_000, Math.floor(netWorthM * M)),
    tier,
    prestigeBias,
    forbesCategory,
    age
});

const BASE_GLOBAL_YOUTUBE_CREATORS = [
    globalCreator('MrBeast', 'United States', 300),
    globalCreator('Mark Rober', 'United States', 50),
    globalCreator('Emma Chamberlain', 'United States', 12, 'FEMALE'),
    globalCreator('KSI', 'United Kingdom', 25),
    globalCreator('Sidemen', 'United Kingdom', 21),
    globalCreator('Morgz', 'United Kingdom', 12),
    globalCreator('Whindersson Nunes', 'Brazil', 44),
    globalCreator('Felipe Neto', 'Brazil', 45),
    globalCreator('Jout Jout', 'Brazil', 3, 'FEMALE'),
    globalCreator('Kurzgesagt', 'Germany', 22),
    globalCreator('Gronkh', 'Germany', 5),
    globalCreator('Dagi Bee', 'Germany', 4, 'FEMALE'),
    globalCreator('Lilly Singh', 'Canada', 14, 'FEMALE'),
    globalCreator('Linus Tech Tips', 'Canada', 16),
    globalCreator('Kallmekris', 'Canada', 11, 'FEMALE'),
    globalCreator('CarryMinati', 'India', 42),
    globalCreator('Bhuvan Bam', 'India', 26),
    globalCreator('Prajakta Koli', 'India', 7, 'FEMALE'),
    globalCreator('Mark Angel', 'Nigeria', 9),
    globalCreator('Taaooma', 'Nigeria', 1, 'FEMALE'),
    globalCreator('Korty EO', 'Nigeria', 1, 'FEMALE'),
    globalCreator('FavijTV', 'Italy', 6),
    globalCreator('Me Contro Te', 'Italy', 7),
    globalCreator('Elisa Maino', 'Italy', 1, 'FEMALE'),
    globalCreator('Cyprien', 'France', 14),
    globalCreator('Squeezie', 'France', 18),
    globalCreator('Natoo', 'France', 5, 'FEMALE'),
    globalCreator('Caspar Lee', 'South Africa', 7),
    globalCreator('Wian', 'South Africa', 3),
    globalCreator('Mihlali Ndamase', 'South Africa', 1, 'FEMALE'),
    globalCreator('El Rubius', 'Spain', 40),
    globalCreator('AuronPlay', 'Spain', 30),
    globalCreator('Patry Jordan', 'Spain', 4, 'FEMALE'),
    globalCreator('LazarBeam', 'Australia', 22),
    globalCreator('HowToBasic', 'Australia', 17),
    globalCreator('Wengie', 'Australia', 13, 'FEMALE'),
    globalCreator('Ranz Kyle', 'Philippines', 15),
    globalCreator('Niana Guerrero', 'Philippines', 15, 'FEMALE'),
    globalCreator('Cong TV', 'Philippines', 12),
    globalCreator('Enzo Knol', 'Netherlands', 3),
    globalCreator('NikkieTutorials', 'Netherlands', 14, 'FEMALE'),
    globalCreator('Dylan Haegens', 'Netherlands', 2),
    globalCreator('Atta Halilintar', 'Indonesia', 31),
    globalCreator('Ria Ricis', 'Indonesia', 34, 'FEMALE'),
    globalCreator('Jess No Limit', 'Indonesia', 50),
    globalCreator('Orkun Isitmak', 'Türkiye', 10),
    globalCreator('Ruhi Cenet', 'Türkiye', 12),
    globalCreator('Duygu Ozaslan', 'Türkiye', 1, 'FEMALE'),
    globalCreator('A4', 'Russia', 50),
    globalCreator('Katya Adushkina', 'Russia', 5, 'FEMALE'),
    globalCreator('Marmok', 'Russia', 18),
    globalCreator('Luisito Comunica', 'Mexico', 43),
    globalCreator('Yuya', 'Mexico', 24, 'FEMALE'),
    globalCreator('Werevertumorro', 'Mexico', 17),
    globalCreator('SA Wardega', 'Poland', 4),
    globalCreator('ReZigiusz', 'Poland', 5),
    globalCreator('Red Lipstick Monster', 'Poland', 2, 'FEMALE'),
    globalCreator('Jacksepticeye', 'Ireland', 30),
    globalCreator('Foil Arms and Hog', 'Ireland', 1),
    globalCreator('Clisare', 'Ireland', 1, 'FEMALE'),
    globalCreator('PewDiePie', 'Sweden', 110),
    globalCreator('RoomieOfficial', 'Sweden', 7),
    globalCreator('Therese Lindgren', 'Sweden', 1, 'FEMALE')
];

const baseCreatorNames = new Set(BASE_GLOBAL_YOUTUBE_CREATORS.map(creator => normalizeCreatorName(creator.name)));

const modTalentCreatorToProfile = (row: ModTalentRow): GlobalCreatorProfile =>
    globalCreator(
        row.name,
        row.country,
        row.followersM,
        row.gender,
        row.netWorthM,
        row.tier,
        row.prestigeBias,
        row.forbesCategory,
        row.age
    );

const GLOBAL_YOUTUBE_CREATORS = [
    ...BASE_GLOBAL_YOUTUBE_CREATORS,
    ...MOD_TALENT_ROWS
        .concat(MOD_TALENT_SUPPLEMENT_ROWS)
        .filter(row => row.category === 'creator')
        .filter(row => !baseCreatorNames.has(normalizeCreatorName(row.name)))
        .map(modTalentCreatorToProfile)
];

const ALWAYS_ON_CREATOR_THRESHOLD = 20 * M;

export const DEFAULT_GLOBAL_CREATOR_PROFILES = GLOBAL_YOUTUBE_CREATORS.filter(
    creator => creator.followers >= ALWAYS_ON_CREATOR_THRESHOLD
);

export const getEnabledGlobalCreatorProfiles = (player: Player) => {
    const enabledPacks = Array.isArray(player.flags?.enabledGlobalActorPacks)
        ? player.flags.enabledGlobalActorPacks as string[]
        : [];

    const enabledCountries = enabledPacks
        .map(packId => packId.replace(/_/g, ' '))
        .map(packName => packName.toLowerCase());

    return GLOBAL_YOUTUBE_CREATORS
        .filter(creator =>
            creator.followers >= ALWAYS_ON_CREATOR_THRESHOLD ||
            enabledCountries.includes(creator.country.toLowerCase())
        )
        .filter((creator, idx, arr) => arr.findIndex(entry => entry.id === creator.id) === idx);
};

export const getGlobalCreatorCountForPack = (packId: string): number => {
    const country = packId.replace(/_/g, ' ').toLowerCase();
    return GLOBAL_YOUTUBE_CREATORS.filter(creator => creator.country.toLowerCase() === country).length;
};

export const getEnabledGlobalCreatorSocialProfiles = (player: Player): NPCActor[] => {
    return getEnabledGlobalCreatorProfiles(player).map((creator): NPCActor => ({
        id: creator.id,
        name: creator.name,
        handle: creator.handle,
        gender: creator.gender,
        avatar: creator.avatar,
        tier: creator.tier || (creator.followers >= 20 * M ? 'A_LIST' : 'ESTABLISHED'),
        prestigeBias: creator.prestigeBias || 'COMMERCIAL',
        openness: creator.followers >= 20 * M ? 12 : 28,
        followers: creator.followers,
        netWorth: creator.netWorth || Math.max(1_000_000, Math.floor(creator.followers * 1.8)),
        occupation: 'ACTOR',
        bio: `${creator.country} creator. Global social presence.`,
        stats: {
            talent: 70,
            fame: creator.followers >= 20 * M ? 88 : 62,
            genreXP: hydrateGenreXP({
                ACTION: 30,
                DRAMA: 35,
                COMEDY: 75,
                ROMANCE: 20,
                THRILLER: 25,
                MYSTERY: 25,
                HORROR: 20,
                SCI_FI: 40,
                ADVENTURE: 65,
                SUPERHERO: 30
            })
        },
        traits: ['AMBITIOUS', 'WORKAHOLIC'],
        potential: 85,
        isIndependent: true,
        age: creator.age,
        forbesCategory: creator.forbesCategory || 'Creator'
    }));
};

export const getYoutubeIdentityLabel = (identity?: YoutubeCreatorIdentity | string): string => {
    switch (identity) {
        case 'CHAOS_CREATOR': return 'Chaos Creator';
        case 'PRESTIGE_FILMMAKER': return 'Prestige Filmmaker';
        case 'LIFESTYLE_ICON': return 'Lifestyle Icon';
        case 'CONTROVERSY_MAGNET': return 'Controversy Magnet';
        case 'ACTOR_VLOGGER':
        default:
            return 'Actor Vlogger';
    }
};

export const calculateYoutubeCreatorScore = (player: Player): number => {
    const channel = player.youtube;
    if (!channel) return 0;

    const subscriberScore = clamp(Math.log10(Math.max(1, channel.subscribers || 0)) * 14, 0, 70);
    const viewScore = clamp(Math.log10(Math.max(1, channel.totalChannelViews || 0)) * 9, 0, 55);
    const trust = clamp(channel.audienceTrust ?? 55);
    const mood = clamp(channel.fanMood ?? 55);
    const heat = clamp(channel.controversy ?? 0);
    const identityBonus = channel.creatorIdentity === 'PRESTIGE_FILMMAKER'
        ? 4
        : channel.creatorIdentity === 'LIFESTYLE_ICON'
            ? 3
            : channel.creatorIdentity === 'CONTROVERSY_MAGNET'
                ? -5
                : channel.creatorIdentity === 'CHAOS_CREATOR'
                    ? -2
                    : 2;

    return Math.round(clamp(
        (subscriberScore * 0.28) +
        (viewScore * 0.18) +
        (trust * 0.28) +
        (mood * 0.16) -
        (heat * 0.18) +
        identityBonus
    ));
};

const getYoutubePublicImageKey = (player: Player): 'volatile' | 'industryDarling' | 'brandSafe' | 'growingCreator' | 'riskyBet' | 'damagedImage' => {
    const score = calculateYoutubeCreatorScore(player);
    const heat = player.youtube?.controversy ?? 0;
    const identity = player.youtube?.creatorIdentity;

    if (heat >= 75 || identity === 'CONTROVERSY_MAGNET') return 'volatile';
    if (score >= 82) return 'industryDarling';
    if (score >= 68) return 'brandSafe';
    if (score >= 52) return 'growingCreator';
    if (score >= 35) return 'riskyBet';
    return 'damagedImage';
};

export const getYoutubePublicImageLabel = (player: Player): string => (
    t('en', `services.youtube.publicImage.${getYoutubePublicImageKey(player)}`)
);

const getLocalizedYoutubePublicImageLabel = (player: Player, language: GameLanguage): string => (
    t(language, `services.youtube.publicImage.${getYoutubePublicImageKey(player)}`)
);

const getYoutubeVideoTypeLabel = (language: GameLanguage, type: YoutubeVideoType): string => (
    t(language, `services.youtube.videoType.${type}`)
);

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
    const recentMusicVideos = (player.world?.musicIndustry?.recentReleases || [])
        .filter(release => ['VIDEO', 'SINGLE', 'EP', 'ALBUM'].includes(release.kind))
        .slice(0, 6)
        .map((release, index): YoutubeVideo => ({
            id: `yt_music_${release.id}_${index}`,
            title: `${release.artistName} - ${release.songTitle}`,
            type: 'MUSIC_VIDEO',
            thumbnailColor: ['bg-cyan-500', 'bg-fuchsia-500', 'bg-emerald-500', 'bg-violet-500'][index % 4],
            views: Math.max(12000, release.youtubeViews || release.score * 12000),
            likes: Math.floor(Math.max(12000, release.youtubeViews || release.score * 12000) * 0.065),
            earnings: 0,
            weekUploaded: release.week,
            yearUploaded: release.year,
            isPlayer: false,
            authorName: release.artistName,
            qualityScore: Math.max(35, Math.min(100, release.score)),
            weeklyHistory: [],
            comments: [
                `${release.genre} fans are replaying this hook.`,
                release.currentRank ? `This is charting around #${release.currentRank}.` : 'The music scene is watching this rollout.',
                release.movement && release.movement > 0 ? `Moved up ${release.movement} spots this week.` : 'The visuals are doing promo work.'
            ],
            sourceArtistId: release.artistId,
            sourceArtistName: release.artistName,
            songTitle: release.songTitle,
            isMusicVideo: true
        }));

    feed.push(...recentMusicVideos);
    
    // Generate 10 random videos from NPCs
    for(let i=0; i<10; i++) {
        const feedCreators = [...NPC_DATABASE, ...getEnabledGlobalCreatorProfiles(player)];
        const npc = feedCreators[Math.floor(Math.random() * feedCreators.length)];
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

export const getWeeksSinceYoutubeUpload = (
    currentYear: number,
    currentWeek: number,
    weekUploaded: number,
    yearUploaded?: number
): number => {
    const safeUploadYear = yearUploaded ?? currentYear;
    const currentAbs = currentYear * 52 + currentWeek;
    const uploadAbs = safeUploadYear * 52 + weekUploaded;
    return Math.max(0, currentAbs - uploadAbs);
};

export const generateYoutubeCollabOffer = (player: Player, language = getPlayerLanguage(player)): YoutubeCollabOffer | null => {
    const channel = player.youtube;
    if (channel.subscribers < 1500 || channel.videos.length < 2) return null;
    if ((channel.activeCollabs?.length || 0) >= 2) return null;

    const creatorScore = calculateYoutubeCreatorScore(player);
    const publicImageKey = getYoutubePublicImageKey(player);
    const publicImage = getLocalizedYoutubePublicImageLabel(player, language);
    const pullMultiplier = creatorScore >= 75 ? 0.38 : creatorScore >= 55 ? 0.5 : 0.65;
    const eligibleCreators = [...NPC_DATABASE, ...getEnabledGlobalCreatorProfiles(player)]
        .filter(npc => npc.followers >= Math.max(3000, channel.subscribers * pullMultiplier));
    if (eligibleCreators.length === 0) return null;

    const creator = pick(eligibleCreators);
    const requiredType = pick(YOUTUBE_COLLAB_TYPES);
    const conceptTitle = `${pick(YOUTUBE_COLLAB_CONCEPTS)} with ${creator.name}`;
    const energyCost = requiredType === 'SKIT' ? 24 : requiredType === 'Q_AND_A' ? 14 : 18;
    const imageBoost = creatorScore >= 70 ? 1.18 : creatorScore < 40 ? 0.82 : 1;
    const bonusViews = Math.max(4000, Math.floor(creator.followers * (0.03 + Math.random() * 0.05) * imageBoost));
    const bonusSubscribers = Math.max(40, Math.floor(bonusViews / 140));
    const qualityBonus = 10 + Math.floor(Math.random() * 10) + (publicImageKey === 'industryDarling' ? 4 : publicImageKey === 'volatile' ? -2 : 0);

    return {
        id: `yt_collab_${Date.now()}`,
        creatorId: creator.id,
        creatorName: creator.name,
        creatorHandle: creator.handle,
        creatorAvatar: creator.avatar,
        conceptTitle,
        requiredType,
        energyCost,
        qualityBonus,
        bonusViews,
        bonusSubscribers,
        description: t(language, 'services.youtube.offer.collab.description', {
            creator: creator.name,
            type: getYoutubeVideoTypeLabel(language, requiredType).toLowerCase(),
            image: publicImage.toLowerCase(),
        }),
        expiresInWeeks: 3
    };
};

export const generateYoutubeBrandDeal = (player: Player, language = getPlayerLanguage(player)): YoutubeBrandDeal | null => {
    const channel = player.youtube;
    if (!channel.isMonetized || channel.subscribers < 5000) return null;
    if ((channel.activeBrandDeals?.length || 0) >= 2) return null;

    const creatorScore = calculateYoutubeCreatorScore(player);
    const publicImage = getLocalizedYoutubePublicImageLabel(player, language);
    const categoryKeys = Object.keys(YOUTUBE_BRANDS) as (keyof typeof YOUTUBE_BRANDS)[];
    const weightedCategories = [...categoryKeys];
    if (channel.creatorIdentity === 'LIFESTYLE_ICON' || creatorScore >= 72) weightedCategories.push('LUXURY', 'FASHION', 'AUTOMOTIVE');
    if (channel.creatorIdentity === 'PRESTIGE_FILMMAKER') weightedCategories.push('TECH', 'LUXURY');
    if ((channel.controversy ?? 0) >= 70 || creatorScore < 38) weightedCategories.push('BEVERAGE', 'FITNESS');
    const category = pick(weightedCategories);
    const brandName = pick(YOUTUBE_BRANDS[category]);
    const requiredType = pick(YOUTUBE_BRAND_TYPES);
    const imageMultiplier = creatorScore >= 80 ? 1.35 : creatorScore >= 65 ? 1.18 : creatorScore < 35 ? 0.72 : 1;
    const lifestyleMultiplier = channel.creatorIdentity === 'LIFESTYLE_ICON' ? 1.15 : channel.creatorIdentity === 'CONTROVERSY_MAGNET' ? 0.84 : 1;
    const payout = Math.max(1500, Math.floor(channel.subscribers * (0.18 + Math.random() * 0.22) * imageMultiplier * lifestyleMultiplier));
    const energyCost = requiredType === 'TRAILER' ? 20 : 16;
    const bonusViews = Math.max(6000, Math.floor(channel.subscribers * (0.12 + Math.random() * 0.18) * Math.max(0.75, imageMultiplier)));
    const penalty = Math.floor(payout * 0.4);

    return {
        id: `yt_brand_${Date.now()}`,
        brandName,
        category,
        description: t(language, 'services.youtube.offer.brand.description', {
            brand: brandName,
            type: getYoutubeVideoTypeLabel(language, requiredType).toLowerCase(),
            image: publicImage.toLowerCase(),
        }),
        payout,
        requiredType,
        energyCost,
        bonusViews,
        penalty,
        expiresInWeeks: 4
    };
};

export const generateMusicVideoFeatureOffer = (player: Player, language = getPlayerLanguage(player)): YoutubeMusicVideoFeatureOffer | null => {
    const channel = player.youtube;
    const creatorScore = calculateYoutubeCreatorScore(player);
    const actingPull = (player.stats.fame || 0) + (player.stats.reputation || 0) * 0.55 + creatorScore * 0.35;
    if (actingPull < 42 && (channel.subscribers || 0) < 2500) return null;
    if ((player.inbox || []).some(message => message.type === 'OFFER_MUSIC_VIDEO_FEATURE')) return null;

    const catalog = getMusicArtistCatalog(player.world)
        .filter(artist => {
            const state = player.world?.musicIndustry?.artists?.[artist.id];
            const artistPull = artist.reputation + Math.log10(Math.max(10, state?.followers || artist.socialFollowers)) * 7;
            return artistPull >= Math.max(32, actingPull * 0.46);
        });
    if (catalog.length === 0) return null;

    const recentReleaseByArtist = new Map((player.world?.musicIndustry?.recentReleases || []).map(release => [release.artistId, release]));
    const artist = pick(catalog);
    const release = recentReleaseByArtist.get(artist.id);
    const songTitle = release?.songTitle || `${pick(['Night Drive', 'Flashback', 'Afterparty', 'Gold Room', 'Final Scene'])} ${pick(['Video', 'Cut', 'Story', 'Premiere'])}`;
    const reach = Math.max(artist.socialFollowers, player.world?.musicIndustry?.artists?.[artist.id]?.followers || 0);
    const fameTierMultiplier = artist.fameTier === 'LEGEND' ? 2.4
        : artist.fameTier === 'SUPERSTAR' ? 1.9
            : artist.fameTier === 'STAR' ? 1.35
                : artist.fameTier === 'KNOWN' ? 0.72
                    : 0.32;
    const imageMultiplier = actingPull >= 80 ? 1.25 : actingPull < 52 ? 0.78 : 1;
    const bonusViews = Math.max(18000, Math.floor(reach * (0.018 + Math.random() * 0.035) * fameTierMultiplier * imageMultiplier));
    const appearanceFee = Math.max(2500, Math.floor((player.stats.fame + player.stats.reputation + creatorScore) * 120 * fameTierMultiplier));
    const followerGain = Math.max(80, Math.floor(bonusViews / (artist.fameTier === 'SUPERSTAR' || artist.fameTier === 'LEGEND' ? 95 : 140)));

    return {
        id: `music_video_feature_${Date.now()}_${artist.id}`,
        artistId: artist.id,
        artistName: artist.stageName,
        artistHandle: `@${artist.stageName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || artist.id}`,
        songTitle,
        genre: artist.genre,
        description: t(language, 'services.youtube.offer.musicFeature.description', {
            artist: artist.stageName,
            song: songTitle,
        }),
        appearanceFee,
        energyCost: artist.fameTier === 'LEGEND' || artist.fameTier === 'SUPERSTAR' ? 24 : 18,
        bonusViews,
        followerGain,
        fameBoost: artist.fameTier === 'LEGEND' || artist.fameTier === 'SUPERSTAR' ? 2 : 1,
        reputationRisk: artist.scandalRisk === 'HIGH' ? 7 : artist.scandalRisk === 'MEDIUM' ? 4 : 2,
        expiresInWeeks: 3
    };
};

export const processYoutubeChannel = (player: Player): { channel: YoutubeChannel, weeklyRevenue: number, newSubs: number, notifications: string[] } => {
    let channel = { ...player.youtube };
    let weeklyRevenue = 0;
    let newSubsTotal = 0;
    const notifications: string[] = [];

    // 1. Process Videos
    const updatedVideos = channel.videos.map(video => {
        // Absolute week calculation to handle year wrap correctly
        const videoYear = video.yearUploaded || player.age; // Fallback for legacy data
        const age = getWeeksSinceYoutubeUpload(player.age, player.currentWeek, video.weekUploaded, videoYear);
        
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
        if (channel.subscribers >= YOUTUBE_MONETIZATION_SUBS && totalViews >= YOUTUBE_MONETIZATION_VIEWS) {
            channel.isMonetized = true;
            notifications.push("🎉 You are now eligible for YouTube Monetization! Revenue enabled.");
        }
    }

    return { channel, weeklyRevenue, newSubs: newSubsTotal, notifications };
};
