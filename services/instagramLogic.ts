import { GameLanguage, InstaPostType, Player, SponsorshipCategory } from '../types';
import { getPlayerLanguage, t } from './i18n';

export interface InstagramPostConfig {
    labelKey: string;
    shortLabelKey: string;
    iconLabelKey: string;
    descriptionKey: string;
    colorClass: string;
    accentClass: string;
    energy: number;
    baseReach: number;
    followerConversion: number;
    aesthetic: number;
    authenticity: number;
    controversy: number;
    fashionInfluence: number;
    fanLoyalty: number;
}

export interface LocalizedInstagramPostConfig extends InstagramPostConfig {
    label: string;
    shortLabel: string;
    iconLabel: string;
    description: string;
}

export interface InstagramMicroBrand {
    id: string;
    name: string;
    handle: string;
    category: SponsorshipCategory;
    vibe: string;
    followers: number;
    avatarSeed: string;
}

export const INSTAGRAM_MICRO_BRANDS: InstagramMicroBrand[] = [
    { id: 'frame_theory', name: 'FrameTheory', handle: '@frametheory.store', category: 'FASHION', vibe: 'minimal streetwear', followers: 42000, avatarSeed: 'FrameTheory' },
    { id: 'velvet_row', name: 'Velvet Row', handle: '@velvetrow', category: 'FASHION', vibe: 'soft luxury fits', followers: 68000, avatarSeed: 'VelvetRow' },
    { id: 'street_saint', name: 'StreetSaint', handle: '@streetsaint', category: 'FASHION', vibe: 'young actor street style', followers: 35000, avatarSeed: 'StreetSaint' },
    { id: 'pulse_form', name: 'PulseForm', handle: '@pulseform', category: 'FITNESS', vibe: 'clean gym gear', followers: 51000, avatarSeed: 'PulseForm' },
    { id: 'core_fuel', name: 'CoreFuel', handle: '@corefuel', category: 'FITNESS', vibe: 'healthy energy snacks', followers: 58000, avatarSeed: 'CoreFuel' },
    { id: 'mizu_pop', name: 'Mizu Pop', handle: '@drinkmizu', category: 'BEVERAGE', vibe: 'bright sparkling drinks', followers: 73000, avatarSeed: 'MizuPop' },
    { id: 'night_cola', name: 'Night Cola', handle: '@nightcola', category: 'BEVERAGE', vibe: 'late night creator fuel', followers: 39000, avatarSeed: 'NightCola' },
    { id: 'luma_pod', name: 'LumaPod', handle: '@lumapod', category: 'TECH', vibe: 'creator audio gadgets', followers: 62000, avatarSeed: 'LumaPod' },
    { id: 'pixel_forge', name: 'PixelForge', handle: '@pixelforge', category: 'TECH', vibe: 'phone camera accessories', followers: 48000, avatarSeed: 'PixelForge' },
    { id: 'maison_vale', name: 'Maison Vale', handle: '@maisonvale', category: 'LUXURY', vibe: 'quiet red-carpet accessories', followers: 91000, avatarSeed: 'MaisonVale' },
    { id: 'aurum_atelier', name: 'Aurum Atelier', handle: '@aurumatelier', category: 'LUXURY', vibe: 'premium watches and jewelry', followers: 116000, avatarSeed: 'AurumAtelier' },
    { id: 'voltline', name: 'Voltline', handle: '@voltline.auto', category: 'AUTOMOTIVE', vibe: 'electric city cars', followers: 88000, avatarSeed: 'Voltline' }
];

export const pickInstagramMicroBrand = (category?: SponsorshipCategory): InstagramMicroBrand => {
    const pool = category
        ? INSTAGRAM_MICRO_BRANDS.filter(brand => brand.category === category)
        : INSTAGRAM_MICRO_BRANDS;
    const safePool = pool.length > 0 ? pool : INSTAGRAM_MICRO_BRANDS;
    return safePool[Math.floor(Math.random() * safePool.length)];
};

const createInstagramPostConfig = (type: InstaPostType, config: Omit<InstagramPostConfig, 'labelKey' | 'shortLabelKey' | 'iconLabelKey' | 'descriptionKey'>): InstagramPostConfig => ({
    labelKey: `services.instagram.postType.${type}.label`,
    shortLabelKey: `services.instagram.postType.${type}.shortLabel`,
    iconLabelKey: `services.instagram.postType.${type}.iconLabel`,
    descriptionKey: `services.instagram.postType.${type}.description`,
    ...config
});

export const INSTAGRAM_POST_TYPE_CONFIGS: Record<InstaPostType, InstagramPostConfig> = {
    LIFESTYLE: createInstagramPostConfig('LIFESTYLE', {
        colorClass: 'bg-emerald-500',
        accentClass: 'text-emerald-400',
        energy: 8,
        baseReach: 0.12,
        followerConversion: 0.035,
        aesthetic: 2,
        authenticity: 2,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 2
    }),
    SELFIE: createInstagramPostConfig('SELFIE', {
        colorClass: 'bg-pink-500',
        accentClass: 'text-pink-400',
        energy: 6,
        baseReach: 0.1,
        followerConversion: 0.03,
        aesthetic: 2,
        authenticity: 1,
        controversy: 0,
        fashionInfluence: 1,
        fanLoyalty: 1
    }),
    REEL: createInstagramPostConfig('REEL', {
        colorClass: 'bg-fuchsia-600',
        accentClass: 'text-fuchsia-400',
        energy: 12,
        baseReach: 0.2,
        followerConversion: 0.055,
        aesthetic: 1,
        authenticity: 1,
        controversy: 0,
        fashionInfluence: 1,
        fanLoyalty: 1
    }),
    CAROUSEL: createInstagramPostConfig('CAROUSEL', {
        colorClass: 'bg-cyan-600',
        accentClass: 'text-cyan-400',
        energy: 10,
        baseReach: 0.14,
        followerConversion: 0.04,
        aesthetic: 2,
        authenticity: 3,
        controversy: 0,
        fashionInfluence: 1,
        fanLoyalty: 3
    }),
    BTS: createInstagramPostConfig('BTS', {
        colorClass: 'bg-blue-600',
        accentClass: 'text-blue-400',
        energy: 10,
        baseReach: 0.18,
        followerConversion: 0.05,
        aesthetic: 1,
        authenticity: 2,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 3
    }),
    ANNOUNCEMENT: createInstagramPostConfig('ANNOUNCEMENT', {
        colorClass: 'bg-purple-600',
        accentClass: 'text-purple-400',
        energy: 12,
        baseReach: 0.22,
        followerConversion: 0.045,
        aesthetic: 1,
        authenticity: 1,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 2
    }),
    CELEBRATION: createInstagramPostConfig('CELEBRATION', {
        colorClass: 'bg-amber-500',
        accentClass: 'text-amber-400',
        energy: 10,
        baseReach: 0.24,
        followerConversion: 0.05,
        aesthetic: 1,
        authenticity: 2,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 3
    }),
    RED_CARPET: createInstagramPostConfig('RED_CARPET', {
        colorClass: 'bg-rose-600',
        accentClass: 'text-rose-400',
        energy: 14,
        baseReach: 0.26,
        followerConversion: 0.05,
        aesthetic: 4,
        authenticity: 0,
        controversy: 0,
        fashionInfluence: 5,
        fanLoyalty: 1
    }),
    COUPLE_POST: createInstagramPostConfig('COUPLE_POST', {
        colorClass: 'bg-red-500',
        accentClass: 'text-red-400',
        energy: 10,
        baseReach: 0.23,
        followerConversion: 0.05,
        aesthetic: 1,
        authenticity: 2,
        controversy: 1,
        fashionInfluence: 0,
        fanLoyalty: 2
    }),
    BRAND_FIT: createInstagramPostConfig('BRAND_FIT', {
        colorClass: 'bg-lime-600',
        accentClass: 'text-lime-400',
        energy: 12,
        baseReach: 0.16,
        followerConversion: 0.025,
        aesthetic: 3,
        authenticity: -1,
        controversy: 0,
        fashionInfluence: 4,
        fanLoyalty: -1
    }),
    CONTROVERSIAL: createInstagramPostConfig('CONTROVERSIAL', {
        colorClass: 'bg-red-700',
        accentClass: 'text-red-400',
        energy: 16,
        baseReach: 0.35,
        followerConversion: 0.03,
        aesthetic: -1,
        authenticity: -2,
        controversy: 8,
        fashionInfluence: 0,
        fanLoyalty: -3
    }),
    INDUSTRY_NEWS: createInstagramPostConfig('INDUSTRY_NEWS', {
        colorClass: 'bg-zinc-700',
        accentClass: 'text-zinc-300',
        energy: 8,
        baseReach: 0.18,
        followerConversion: 0.025,
        aesthetic: 0,
        authenticity: 0,
        controversy: 1,
        fashionInfluence: 0,
        fanLoyalty: 0
    })
};

export const INSTAGRAM_POST_CONFIGS = INSTAGRAM_POST_TYPE_CONFIGS;

export const getLocalizedInstagramPostConfig = (type: InstaPostType, language: GameLanguage): LocalizedInstagramPostConfig => {
    const config = INSTAGRAM_POST_CONFIGS[type] || INSTAGRAM_POST_CONFIGS.LIFESTYLE;
    return {
        ...config,
        label: t(language, config.labelKey),
        shortLabel: t(language, config.shortLabelKey),
        iconLabel: t(language, config.iconLabelKey),
        description: t(language, config.descriptionKey)
    };
};

const INSTAGRAM_GENERATED_TYPES: InstaPostType[] = ['ANNOUNCEMENT', 'BTS', 'CELEBRATION', 'LIFESTYLE', 'SELFIE', 'INDUSTRY_NEWS', 'REEL', 'CAROUSEL', 'RED_CARPET', 'COUPLE_POST', 'BRAND_FIT', 'CONTROVERSIAL'];

const buildInstagramTextBank = (prefix: string, count: number): Record<InstaPostType, string[]> => (
    Object.fromEntries(
        INSTAGRAM_GENERATED_TYPES.map(type => [
            type,
            Array.from({ length: count }, (_, index) => `services.instagram.${prefix}.${type}.${index}`)
        ])
    ) as Record<InstaPostType, string[]>
);

const COMMENT_BANK_KEYS = buildInstagramTextBank('comment', 8);
const INSTAGRAM_CAPTION_KEYS = buildInstagramTextBank('caption', 5);

const pickLocalizedInstagramText = (keys: string[], language: GameLanguage) => {
    const key = keys[Math.floor(Math.random() * keys.length)];
    return t(language, key);
};

export const getInstagramPresetCaption = (type: InstaPostType, language: GameLanguage = 'en'): string => {
    const captions = INSTAGRAM_CAPTION_KEYS[type] || INSTAGRAM_CAPTION_KEYS.LIFESTYLE;
    return pickLocalizedInstagramText(captions, language);
};

export const getInstagramPostComments = (type: InstaPostType, count = 5, language: GameLanguage = 'en'): string[] => {
    const comments = COMMENT_BANK_KEYS[type] || COMMENT_BANK_KEYS.LIFESTYLE;
    return [...comments]
        .sort(() => 0.5 - Math.random())
        .slice(0, count)
        .map(key => t(language, key));
};

export const clampInstagramStat = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const calculateInstagramPostOutcome = (player: Player, type: InstaPostType, postsThisWeek: number, language: GameLanguage = getPlayerLanguage(player)) => {
    const config = INSTAGRAM_POST_CONFIGS[type];
    const publicFollowers = Math.max(player.stats.followers || 0, player.instagram?.followers || 0);
    const baseAudience = Math.max(80, publicFollowers);
    const fameBoost = 1 + (player.stats.fame / 120);
    const repBoost = 1 + (Math.max(0, player.stats.reputation) / 180);
    const aestheticBoost = 1 + ((player.instagram?.aesthetic ?? 50) - 50) / 250;
    const authenticityBoost = 1 + ((player.instagram?.authenticity ?? 50) - 50) / 300;
    const fatigue = Math.max(0.45, 1 - postsThisWeek * 0.16);
    const newbieLift = publicFollowers < 1000 ? 1.25 : 1;
    const volatileLift = type === 'CONTROVERSIAL' ? 1.25 : 1;
    const randomness = 0.82 + Math.random() * 0.42;
    const reach = Math.floor(baseAudience * config.baseReach * fameBoost * repBoost * aestheticBoost * authenticityBoost * fatigue * newbieLift * volatileLift * randomness);
    const floorReach = publicFollowers < 1000 ? 35 + Math.floor(Math.random() * 70) : 0;
    const visibleReach = Math.max(floorReach, reach);
    const likes = Math.max(3, Math.floor(visibleReach * (0.18 + Math.random() * 0.16)));
    const comments = Math.max(1, Math.floor(likes * (type === 'CONTROVERSIAL' ? 0.16 : 0.06 + Math.random() * 0.04)));
    const shares = Math.max(0, Math.floor(likes * (type === 'REEL' || type === 'CONTROVERSIAL' ? 0.12 : 0.035)));
    const saves = Math.max(0, Math.floor(likes * (type === 'CAROUSEL' || type === 'RED_CARPET' || type === 'BRAND_FIT' ? 0.1 : 0.035)));
    let followerGain = Math.floor(likes * config.followerConversion);

    if (publicFollowers < 1000) {
        followerGain += Math.floor(Math.random() * 8) + 2;
    }
    if (postsThisWeek >= 2) {
        followerGain = Math.floor(followerGain * 0.7);
    }

    const maxOrganicGain = publicFollowers < 1000 ? 120 : Math.max(100, Math.floor(publicFollowers * 0.12));
    followerGain = Math.max(1, Math.min(maxOrganicGain, followerGain));

    const commentCount = type === 'CONTROVERSIAL' ? 7 : 5;
    return {
        likes,
        comments,
        shares,
        saves,
        followerGain,
        commentList: getInstagramPostComments(type, commentCount, language),
        engagementScore: Math.min(100, Math.round((likes + comments * 2 + shares * 3 + saves * 2) / Math.max(1, baseAudience) * 100)),
        statDeltas: {
            aesthetic: config.aesthetic,
            authenticity: config.authenticity,
            controversy: config.controversy,
            fashionInfluence: config.fashionInfluence,
            fanLoyalty: config.fanLoyalty
        }
    };
};
