import { InstaPostType, Player, SponsorshipCategory } from '../types';

export interface InstagramPostConfig {
    label: string;
    shortLabel: string;
    colorClass: string;
    accentClass: string;
    iconLabel: string;
    energy: number;
    baseReach: number;
    followerConversion: number;
    aesthetic: number;
    authenticity: number;
    controversy: number;
    fashionInfluence: number;
    fanLoyalty: number;
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

export const INSTAGRAM_POST_CONFIGS: Record<InstaPostType, InstagramPostConfig> = {
    LIFESTYLE: {
        label: 'Lifestyle',
        shortLabel: 'Life',
        colorClass: 'bg-emerald-500',
        accentClass: 'text-emerald-400',
        iconLabel: 'Life',
        energy: 8,
        baseReach: 0.12,
        followerConversion: 0.035,
        aesthetic: 2,
        authenticity: 2,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 2,
        description: 'Safe daily-life content. Slow but steady fan loyalty.'
    },
    SELFIE: {
        label: 'Selfie',
        shortLabel: 'Selfie',
        colorClass: 'bg-pink-500',
        accentClass: 'text-pink-400',
        iconLabel: 'Self',
        energy: 6,
        baseReach: 0.1,
        followerConversion: 0.03,
        aesthetic: 2,
        authenticity: 1,
        controversy: 0,
        fashionInfluence: 1,
        fanLoyalty: 1,
        description: 'Easy personal post. Good for keeping the account warm.'
    },
    REEL: {
        label: 'Reel',
        shortLabel: 'Reel',
        colorClass: 'bg-fuchsia-600',
        accentClass: 'text-fuchsia-400',
        iconLabel: 'Reel',
        energy: 12,
        baseReach: 0.2,
        followerConversion: 0.055,
        aesthetic: 1,
        authenticity: 1,
        controversy: 0,
        fashionInfluence: 1,
        fanLoyalty: 1,
        description: 'Higher reach short-form content with better discovery.'
    },
    CAROUSEL: {
        label: 'Photo Dump',
        shortLabel: 'Dump',
        colorClass: 'bg-cyan-600',
        accentClass: 'text-cyan-400',
        iconLabel: 'Dump',
        energy: 10,
        baseReach: 0.14,
        followerConversion: 0.04,
        aesthetic: 2,
        authenticity: 3,
        controversy: 0,
        fashionInfluence: 1,
        fanLoyalty: 3,
        description: 'A softer multi-photo post that builds authenticity.'
    },
    BTS: {
        label: 'On Set BTS',
        shortLabel: 'BTS',
        colorClass: 'bg-blue-600',
        accentClass: 'text-blue-400',
        iconLabel: 'BTS',
        energy: 10,
        baseReach: 0.18,
        followerConversion: 0.05,
        aesthetic: 1,
        authenticity: 2,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 3,
        description: 'Behind-the-scenes content. Best while filming.'
    },
    ANNOUNCEMENT: {
        label: 'Announcement',
        shortLabel: 'News',
        colorClass: 'bg-purple-600',
        accentClass: 'text-purple-400',
        iconLabel: 'News',
        energy: 12,
        baseReach: 0.22,
        followerConversion: 0.045,
        aesthetic: 1,
        authenticity: 1,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 2,
        description: 'Project news. Strong when your career has momentum.'
    },
    CELEBRATION: {
        label: 'Celebrate Release',
        shortLabel: 'Win',
        colorClass: 'bg-amber-500',
        accentClass: 'text-amber-400',
        iconLabel: 'Win',
        energy: 10,
        baseReach: 0.24,
        followerConversion: 0.05,
        aesthetic: 1,
        authenticity: 2,
        controversy: 0,
        fashionInfluence: 0,
        fanLoyalty: 3,
        description: 'Turns releases and wins into fan momentum.'
    },
    RED_CARPET: {
        label: 'Red Carpet',
        shortLabel: 'Carpet',
        colorClass: 'bg-rose-600',
        accentClass: 'text-rose-400',
        iconLabel: 'Gala',
        energy: 14,
        baseReach: 0.26,
        followerConversion: 0.05,
        aesthetic: 4,
        authenticity: 0,
        controversy: 0,
        fashionInfluence: 5,
        fanLoyalty: 1,
        description: 'Fashion-forward prestige content for bigger moments.'
    },
    COUPLE_POST: {
        label: 'Couple Post',
        shortLabel: 'Couple',
        colorClass: 'bg-red-500',
        accentClass: 'text-red-400',
        iconLabel: 'Love',
        energy: 10,
        baseReach: 0.23,
        followerConversion: 0.05,
        aesthetic: 1,
        authenticity: 2,
        controversy: 1,
        fashionInfluence: 0,
        fanLoyalty: 2,
        description: 'Relationship content. Sweet, but the internet watches closely.'
    },
    BRAND_FIT: {
        label: 'Brand Fit',
        shortLabel: 'Brand',
        colorClass: 'bg-lime-600',
        accentClass: 'text-lime-400',
        iconLabel: 'Ad',
        energy: 12,
        baseReach: 0.16,
        followerConversion: 0.025,
        aesthetic: 3,
        authenticity: -1,
        controversy: 0,
        fashionInfluence: 4,
        fanLoyalty: -1,
        description: 'Styled brand-friendly post. Builds influence, less personal.'
    },
    CONTROVERSIAL: {
        label: 'Hot Take',
        shortLabel: 'Drama',
        colorClass: 'bg-red-700',
        accentClass: 'text-red-400',
        iconLabel: 'Drama',
        energy: 16,
        baseReach: 0.35,
        followerConversion: 0.03,
        aesthetic: -1,
        authenticity: -2,
        controversy: 8,
        fashionInfluence: 0,
        fanLoyalty: -3,
        description: 'Big reach, real backlash risk. Not a free growth button.'
    },
    INDUSTRY_NEWS: {
        label: 'Industry News',
        shortLabel: 'Trade',
        colorClass: 'bg-zinc-700',
        accentClass: 'text-zinc-300',
        iconLabel: 'Trade',
        energy: 8,
        baseReach: 0.18,
        followerConversion: 0.025,
        aesthetic: 0,
        authenticity: 0,
        controversy: 1,
        fashionInfluence: 0,
        fanLoyalty: 0,
        description: 'Commentary-style industry chatter.'
    }
};

const COMMENT_BANK: Record<InstaPostType, string[]> = {
    LIFESTYLE: ['This feels peaceful.', 'The reset era is working.', 'Need this energy today.', 'Lowkey my favorite kind of post.', 'You seem happier lately.', 'The off-day content is weirdly comforting.', 'Not everything has to be a premiere. This is nice.', 'Tiny slice-of-life posts always hit harder.'],
    SELFIE: ['Face card did not decline.', 'The lighting chose you.', 'Casual slay honestly.', 'Drop the routine.', 'Main character behavior.', 'This is such a clean profile pic candidate.', 'You knew this one was going to work.', 'The camera clearly has favorites.'],
    REEL: ['Algorithm brought me here and I am staying.', 'This ate harder than expected.', 'Replay value is crazy.', 'Okay this is actually funny.', 'The timing on this is perfect.', 'This is the kind of reel that gets quoted for a week.', 'Short, chaotic, effective.', 'The edit is doing half the acting.'],
    CAROUSEL: ['Slide three is everything.', 'Photo dump supremacy.', 'This feels so real.', 'The tiny details are elite.', 'Saving this for the mood board.', 'The last slide changed the whole vibe.', 'This is a proper week-in-the-life dump.', 'Not the blurry candid being the best one.'],
    BTS: ['Set content finally.', 'Need more behind the scenes.', 'This project looks serious.', 'Crew energy looks immaculate.', 'The costume department cooked.', 'The call sheet must be wild for this one.', 'This makes the project feel real now.', 'BTS posts always expose who is actually working.'],
    ANNOUNCEMENT: ['About time!', 'This casting makes sense.', 'Already seated.', 'Please let this be real.', 'This era is going to be huge.', 'The announcement caption is calm but the fans are not.', 'You can feel the career move here.', 'This is either genius casting or chaos. I support both.'],
    CELEBRATION: ['You earned this.', 'Watching you win is fun.', 'The comeback arc is loading.', 'Proud fan moment.', 'This is only the start.', 'This win feels personal for the day-one fans.', 'The gratitude is loud in a good way.', 'Frame this night, honestly.'],
    RED_CARPET: ['Stylist deserves a raise.', 'Best dressed conversation starts now.', 'The silhouette is insane.', 'Fashion account era?', 'This look has range.', 'This is going straight to outfit breakdown pages.', 'Red carpet posture is a whole skill.', 'The tailoring is doing cinema.'],
    COUPLE_POST: ['Hard launch?', 'The chemistry is loud.', 'Please be normal about this internet.', 'This is cute, I fear.', 'Private but not too private. Iconic.', 'The timeline is already investigating.', 'Soft launch detectives are undefeated.', 'This caption is calm but the comments are not.'],
    BRAND_FIT: ['This ad is too clean.', 'Okay but the styling works.', 'Influencer bag secured.', 'The product placement is placementing.', 'I would buy this unfortunately.', 'At least make the sponsored posts look this good.', 'Brand team knew what they were doing.', 'This is how you do a paid post without making it painful.'],
    CONTROVERSIAL: ['Delete this before the quotes find it.', 'You knew exactly what you were doing.', 'This comment section is about to be wild.', 'Not sure this was the move.', 'The internet never sleeps.', 'PR group chat is definitely awake.', 'This is either brave or avoidable.', 'The screenshots already left the building.'],
    INDUSTRY_NEWS: ['The trades are going to run with this.', 'Hollywood group chat is shaking.', 'This explains a lot.', 'Someone is getting a call from PR.', 'The timeline needed context.', 'This is one of those posts executives pretend not to read.', 'People are connecting dots in real time.', 'The rumor economy is undefeated.']
};

export const getInstagramPresetCaption = (type: InstaPostType): string => {
    const captions = INSTAGRAM_CAPTIONS[type];
    return captions[Math.floor(Math.random() * captions.length)];
};

export const getInstagramPostComments = (type: InstaPostType, count = 5): string[] => {
    const comments = COMMENT_BANK[type] || COMMENT_BANK.LIFESTYLE;
    return [...comments].sort(() => 0.5 - Math.random()).slice(0, count);
};

export const INSTAGRAM_CAPTIONS: Record<InstaPostType, string[]> = {
    ANNOUNCEMENT: ['Excited to share this!', 'Big news coming soon.', 'New character, new world.', 'Officially booked and still processing it.', 'See you all sooner than you think.'],
    BTS: ['Set life. 🎬', 'Behind the scenes.', 'Making magic happen.', 'Running on cold brew and adrenaline.', 'We got the shot. Barely.'],
    CELEBRATION: ['So grateful.', 'What a night!', 'Celebrating small wins.', 'Dreams look loud when they come true.', 'One of those nights you never forget.'],
    LIFESTYLE: ['Current mood.', 'Day off.', 'Sunday reset.', 'A quiet day is still a flex.', 'Resetting the brain, not just the feed.'],
    SELFIE: ['Hi.', 'Me again.', 'Good hair day.', 'Proof I left the house.', 'Face card still employed.'],
    INDUSTRY_NEWS: ['Industry moves.', 'The sequel conversations are getting very real.', 'A casting board somewhere is causing chaos.', 'If the trades knew half of what I know...', 'Hollywood loves a rumor.'],
    REEL: ['Had to make this.', 'Tiny chaos, big mood.', 'Posting before I overthink it.', 'The cut was too clean not to share.', 'One take. Mostly.'],
    CAROUSEL: ['Little moments lately.', 'Photo dump.', 'Life between call sheets.', 'Saving these here.', 'A few frames from the week.'],
    RED_CARPET: ['Premiere night.', 'Dressed up and trying to act calm.', 'Red carpet nerves never get old.', 'Tonight had cinema energy.', 'A look, a night, a memory.'],
    COUPLE_POST: ['Soft launch maybe.', 'Favorite scene partner off screen.', 'Keeping some things sweet.', 'A little personal today.', 'No caption needed, but here we are.'],
    BRAND_FIT: ['Styled for the day.', 'Clean fit, clean energy.', 'Found my new favorite thing.', 'A little brand moment.', 'This one made the day easier.'],
    CONTROVERSIAL: ['Probably should not post this.', 'Someone had to say it.', 'No shade, just observation.', 'Logging on with an opinion.', 'Muting this later maybe.']
};

export const clampInstagramStat = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const calculateInstagramPostOutcome = (player: Player, type: InstaPostType, postsThisWeek: number) => {
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
        commentList: getInstagramPostComments(type, commentCount),
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
