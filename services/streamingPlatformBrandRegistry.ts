import type {
    StreamingOperatorBrand,
    StreamingPlatformBrandPresentation,
    StreamingPlatformBrandMarkKind,
    StreamingTypefaceId,
    StreamingWordmarkStyleId,
} from '../types';

interface RealBrandInput {
    displayName: string;
    primaryColor: string;
    secondaryColor?: string;
    accentColors?: string[];
    surfaceColor?: string;
    onSurfaceColor?: string;
    markKind?: StreamingPlatformBrandMarkKind;
    markKey?: string;
    typefaceId?: StreamingTypefaceId;
    lockupId?: StreamingWordmarkStyleId;
}

const HEX = /^#[0-9A-F]{6}$/;

export const normalizeStreamingBrandHex = (value: string, fallback: string): string => {
    const normalized = String(value || '').trim().toUpperCase();
    return HEX.test(normalized) ? normalized : fallback;
};

const channel = (hex: string, offset: number): number => Number.parseInt(hex.slice(offset, offset + 2), 16);

const relativeLuminance = (hex: string): number => {
    const normalized = normalizeStreamingBrandHex(hex, '#000000');
    const linear = (value: number): number => {
        const srgb = value / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(channel(normalized, 1))
        + 0.7152 * linear(channel(normalized, 3))
        + 0.0722 * linear(channel(normalized, 5));
};

const contrastRatio = (left: string, right: string): number => {
    const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
    const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
    return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableStreamingBrandInk = (background: string): string => {
    const darkInk = '#07090D';
    const lightInk = '#FFFFFF';
    return contrastRatio(background, darkInk) >= contrastRatio(background, lightInk) ? darkInk : lightInk;
};

const buildRealBrand = (platformId: string, input: RealBrandInput): StreamingPlatformBrandPresentation => {
    const primaryColor = normalizeStreamingBrandHex(input.primaryColor, '#8A8F98');
    const secondaryColor = normalizeStreamingBrandHex(input.secondaryColor || primaryColor, primaryColor);
    const accentColors = Array.from(new Set(
        [primaryColor, secondaryColor, ...(input.accentColors || [])]
            .map(color => normalizeStreamingBrandHex(color, primaryColor)),
    )).slice(0, 4);
    const surfaceColor = normalizeStreamingBrandHex(input.surfaceColor || '#0A0B0E', '#0A0B0E');
    return {
        platformId,
        displayName: input.displayName,
        primaryColor,
        secondaryColor,
        accentColors,
        surfaceColor,
        onPrimaryColor: getReadableStreamingBrandInk(primaryColor),
        onSurfaceColor: normalizeStreamingBrandHex(input.onSurfaceColor || getReadableStreamingBrandInk(surfaceColor), '#FFFFFF'),
        markKind: input.markKind || 'WORDMARK',
        markKey: input.markKey || `${platformId}_WORDMARK`,
        typefaceId: input.typefaceId || 'GROTESK',
        lockupId: input.lockupId || 'WORDMARK',
    };
};

const REAL_BRAND_INPUTS: Record<string, RealBrandInput> = {
    NETFLIX: { displayName: 'Netflix', primaryColor: '#E50914', secondaryColor: '#B20710', markKind: 'VECTOR_MARK', markKey: 'NETFLIX_N', typefaceId: 'CONDENSED', lockupId: 'SIDE' },
    APPLE_TV: { displayName: 'Apple TV+', primaryColor: '#F5F5F7', secondaryColor: '#A1A1A6', surfaceColor: '#050505', markKey: 'APPLE_TV_WORDMARK', typefaceId: 'GROTESK' },
    DISNEY_PLUS: { displayName: 'Disney+', primaryColor: '#113CCF', secondaryColor: '#64B5F6', markKey: 'DISNEY_PLUS_WORDMARK', typefaceId: 'SERIF' },
    HULU: { displayName: 'Hulu', primaryColor: '#1CE783', secondaryColor: '#0B6B3A', surfaceColor: '#071B11', markKey: 'HULU_WORDMARK', typefaceId: 'GROTESK' },
    YOUTUBE: { displayName: 'YouTube', primaryColor: '#FF0000', secondaryColor: '#282828', markKind: 'VECTOR_MARK', markKey: 'YOUTUBE_PLAY', lockupId: 'SIDE' },
    PRIME_VIDEO: { displayName: 'Prime Video', primaryColor: '#00A8E1', secondaryColor: '#146EB4', markKind: 'VECTOR_MARK', markKey: 'PRIME_SMILE', lockupId: 'SIDE' },
    CRAVE: { displayName: 'Crave', primaryColor: '#00AEEF', secondaryColor: '#0066B3', markKey: 'CRAVE_WORDMARK', typefaceId: 'GROTESK' },
    VIX: { displayName: 'ViX', primaryColor: '#FF5A36', secondaryColor: '#7A2CF6', accentColors: ['#FFB800'], markKey: 'VIX_WORDMARK', typefaceId: 'GEOMETRIC' },
    GLOBOPLAY: { displayName: 'Globoplay', primaryColor: '#E11D48', secondaryColor: '#7C3AED', accentColors: ['#F97316'], markKey: 'GLOBOPLAY_WORDMARK' },
    NOW: { displayName: 'NOW', primaryColor: '#00E6A8', secondaryColor: '#0066FF', accentColors: ['#F5EF3B'], markKey: 'NOW_WORDMARK', typefaceId: 'GEOMETRIC' },
    ITVX: { displayName: 'ITVX', primaryColor: '#DE00FF', secondaryColor: '#00D9FF', accentColors: ['#FFD400'], markKey: 'ITVX_WORDMARK', typefaceId: 'GEOMETRIC' },
    RTL_PLUS: { displayName: 'RTL+', primaryColor: '#E6007E', secondaryColor: '#FA6400', accentColors: ['#00AEEF'], markKey: 'RTL_PLUS_WORDMARK' },
    CANAL_PLUS: { displayName: 'CANAL+', primaryColor: '#FFFFFF', secondaryColor: '#1E1E1E', surfaceColor: '#050505', markKey: 'CANAL_PLUS_WORDMARK', typefaceId: 'GROTESK' },
    MOVISTAR_PLUS: { displayName: 'Movistar Plus+', primaryColor: '#019BE1', secondaryColor: '#7B2CBF', markKey: 'MOVISTAR_PLUS_WORDMARK' },
    RAIPLAY: { displayName: 'RaiPlay', primaryColor: '#6539B4', secondaryColor: '#9B5DE5', markKey: 'RAIPLAY_WORDMARK' },
    DSTV_STREAM: { displayName: 'DStv Stream', primaryColor: '#0B73CE', secondaryColor: '#00AEEF', markKey: 'DSTV_STREAM_WORDMARK' },
    SHAHID: { displayName: 'Shahid', primaryColor: '#00B894', secondaryColor: '#007A66', markKey: 'SHAHID_WORDMARK', typefaceId: 'GEOMETRIC' },
    JIOHOTSTAR: { displayName: 'JioHotstar', primaryColor: '#FF6B00', secondaryColor: '#066CFF', accentColors: ['#7B2CFF'], markKey: 'JIOHOTSTAR_WORDMARK', typefaceId: 'GROTESK' },
    ZEE5: { displayName: 'ZEE5', primaryColor: '#9500FF', secondaryColor: '#00FFFF', accentColors: ['#FF5500', '#00FFAA'], surfaceColor: '#111116', markKey: 'ZEE5_WORDMARK', typefaceId: 'GEOMETRIC' },
    SONY_LIV: { displayName: 'Sony LIV', primaryColor: '#7B2FF7', secondaryColor: '#F107A3', accentColors: ['#00C9FF'], markKey: 'SONY_LIV_WORDMARK' },
    U_NEXT: { displayName: 'U-NEXT', primaryColor: '#00A1E9', secondaryColor: '#005BAC', markKey: 'U_NEXT_WORDMARK', typefaceId: 'GROTESK' },
    ABEMA: { displayName: 'ABEMA', primaryColor: '#00D95F', secondaryColor: '#00AEEF', markKey: 'ABEMA_WORDMARK', typefaceId: 'GEOMETRIC' },
    TVING: { displayName: 'TVING', primaryColor: '#FF153C', secondaryColor: '#FF4B8B', markKey: 'TVING_WORDMARK', typefaceId: 'GROTESK' },
    WAVVE: { displayName: 'Wavve', primaryColor: '#1351F9', secondaryColor: '#00C2FF', markKey: 'WAVVE_WORDMARK', typefaceId: 'GROTESK' },
    COUPANG_PLAY: { displayName: 'Coupang Play', primaryColor: '#3478F6', secondaryColor: '#8B5CF6', markKey: 'COUPANG_PLAY_WORDMARK' },
    VIU: { displayName: 'Viu', primaryColor: '#FFBF00', secondaryColor: '#F26A00', surfaceColor: '#17120A', markKey: 'VIU_WORDMARK', typefaceId: 'GEOMETRIC' },
    VIDIO: { displayName: 'Vidio', primaryColor: '#EA1265', secondaryColor: '#9F0A50', markKey: 'VIDIO_WORDMARK' },
    TRUE_ID: { displayName: 'TrueID', primaryColor: '#E51B23', secondaryColor: '#7A1218', markKey: 'TRUE_ID_WORDMARK' },
    IWANT_TFC: { displayName: 'iWantTFC', primaryColor: '#00AEEF', secondaryColor: '#ED1C24', markKey: 'IWANT_TFC_WORDMARK' },
    STAN: { displayName: 'Stan', primaryColor: '#00E6B8', secondaryColor: '#009FE3', markKey: 'STAN_WORDMARK', typefaceId: 'GROTESK' },
    BINGE: { displayName: 'Binge', primaryColor: '#00D9C0', secondaryColor: '#183B8C', markKey: 'BINGE_WORDMARK' },
    NEON: { displayName: 'Neon', primaryColor: '#FF5A36', secondaryColor: '#FFB000', markKey: 'NEON_WORDMARK', typefaceId: 'GROTESK' },
    TVNZ_PLUS: { displayName: 'TVNZ+', primaryColor: '#00B8A9', secondaryColor: '#0057B8', markKey: 'TVNZ_PLUS_WORDMARK' },
    HBO_MAX: { displayName: 'HBO Max', primaryColor: '#002BE7', secondaryColor: '#11131A', markKey: 'HBO_MAX_WORDMARK', typefaceId: 'GROTESK' },
    PARAMOUNT_PLUS: { displayName: 'Paramount+', primaryColor: '#0064FF', secondaryColor: '#003C96', markKey: 'PARAMOUNT_PLUS_WORDMARK', typefaceId: 'SERIF' },
    PEACOCK: { displayName: 'Peacock', primaryColor: '#FFFFFF', secondaryColor: '#F5B71D', accentColors: ['#E91E63', '#00AEEF'], surfaceColor: '#050505', markKey: 'PEACOCK_WORDMARK', typefaceId: 'GROTESK' },
    SKY: { displayName: 'Sky', primaryColor: '#19A0FF', secondaryColor: '#000FF5', accentColors: ['#00E6FF'], markKey: 'SKY_WORDMARK', typefaceId: 'GROTESK' },
    SHOWMAX: { displayName: 'Showmax', primaryColor: '#FF0049', secondaryColor: '#8C0028', markKey: 'SHOWMAX_WORDMARK', typefaceId: 'GROTESK' },
    FLOW: { displayName: 'Flow', primaryColor: '#6C2BD9', secondaryColor: '#321275', markKey: 'FLOW_WORDMARK', typefaceId: 'GEOMETRIC' },
};

export const REAL_STREAMING_PLATFORM_BRANDS: Readonly<Record<string, StreamingPlatformBrandPresentation>> = Object.freeze(
    Object.fromEntries(Object.entries(REAL_BRAND_INPUTS).map(([id, input]) => [id, buildRealBrand(id, input)])),
);

export const LEGACY_STREAMING_PLATFORM_ALIASES: Readonly<Record<string, string>> = Object.freeze({
    AMAZON_PRIME: 'PRIME_VIDEO',
    PRIME: 'PRIME_VIDEO',
    PRIME_VIDEO: 'PRIME_VIDEO',
    NETFLIX: 'NETFLIX',
    APPLE_TV: 'APPLE_TV',
    DISNEY_PLUS: 'DISNEY_PLUS',
    HULU: 'HULU',
    YOUTUBE: 'YOUTUBE',
    HBO_MAX: 'HBO_MAX',
    MAX: 'HBO_MAX',
    PARAMOUNT_PLUS: 'PARAMOUNT_PLUS',
    PARAMOUNT: 'PARAMOUNT_PLUS',
    PEACOCK: 'PEACOCK',
    SKY: 'SKY',
    SHOWMAX: 'SHOWMAX',
    FLOW: 'FLOW',
});

export const LEGACY_STREAMING_PLATFORM_NAME_ALIASES: Readonly<Record<string, string>> = Object.freeze({
    netflix: 'NETFLIX',
    'prime video': 'PRIME_VIDEO',
    'amazon prime': 'PRIME_VIDEO',
    amazon: 'PRIME_VIDEO',
    'disney+': 'DISNEY_PLUS',
    disney: 'DISNEY_PLUS',
    hulu: 'HULU',
    max: 'HBO_MAX',
    'hbo max': 'HBO_MAX',
    hbo: 'HBO_MAX',
    'apple tv+': 'APPLE_TV',
    'apple tv': 'APPLE_TV',
    'paramount+': 'PARAMOUNT_PLUS',
    paramount: 'PARAMOUNT_PLUS',
    peacock: 'PEACOCK',
    sky: 'SKY',
    crave: 'CRAVE',
    stan: 'STAN',
    globoplay: 'GLOBOPLAY',
    vix: 'VIX',
    jiohotstar: 'JIOHOTSTAR',
    'jio hotstar': 'JIOHOTSTAR',
    'u-next': 'U_NEXT',
    'movistar+': 'MOVISTAR_PLUS',
    showmax: 'SHOWMAX',
    dstv: 'DSTV_STREAM',
    'dstv stream': 'DSTV_STREAM',
    'rtl+': 'RTL_PLUS',
    'canal+': 'CANAL_PLUS',
    flow: 'FLOW',
});

const cleanId = (value: string): string => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

const hashText = (value: string): number => {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

export const streamingBrandHslToHex = (hue: number, saturation: number, lightness: number): string => {
    const saturationUnit = saturation / 100;
    const lightnessUnit = lightness / 100;
    const chroma = (1 - Math.abs(2 * lightnessUnit - 1)) * saturationUnit;
    const sector = ((hue % 360) + 360) % 360 / 60;
    const x = chroma * (1 - Math.abs(sector % 2 - 1));
    const [red, green, blue] = sector < 1 ? [chroma, x, 0]
        : sector < 2 ? [x, chroma, 0]
            : sector < 3 ? [0, chroma, x]
                : sector < 4 ? [0, x, chroma]
                    : sector < 5 ? [x, 0, chroma]
                        : [chroma, 0, x];
    const match = lightnessUnit - chroma / 2;
    const hex = (value: number): string => Math.round((value + match) * 255).toString(16).padStart(2, '0');
    return `#${hex(red)}${hex(green)}${hex(blue)}`.toUpperCase();
};

export const getRealStreamingPlatformBrand = (registryKey: string): StreamingPlatformBrandPresentation | null => (
    REAL_STREAMING_PLATFORM_BRANDS[cleanId(registryKey)] || null
);

export const resolveStreamingPlatformBrandByName = (
    platformName: string,
): StreamingPlatformBrandPresentation | null => {
    const normalizedName = String(platformName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const registryKey = LEGACY_STREAMING_PLATFORM_NAME_ALIASES[normalizedName];
    return registryKey ? getRealStreamingPlatformBrand(registryKey) : null;
};

export const resolveStreamingPlatformBrandById = (
    platformId: string,
    displayName?: string,
): StreamingPlatformBrandPresentation => {
    const id = cleanId(platformId) || 'UNKNOWN_PLATFORM';
    const aliasedId = LEGACY_STREAMING_PLATFORM_ALIASES[id] || id;
    const real = getRealStreamingPlatformBrand(aliasedId);
    if (real) return displayName && displayName !== real.displayName ? { ...real, displayName } : real;
    const name = String(displayName || platformId || 'Streaming platform').trim() || 'Streaming platform';
    const hash = hashText(`${id}:${name}`);
    const primaryColor = streamingBrandHslToHex(hash % 360, 56, 54);
    const secondaryColor = streamingBrandHslToHex((hash + 47) % 360, 48, 40);
    return {
        platformId: id,
        displayName: name,
        primaryColor,
        secondaryColor,
        accentColors: [primaryColor, secondaryColor],
        surfaceColor: '#111319',
        onPrimaryColor: getReadableStreamingBrandInk(primaryColor),
        onSurfaceColor: '#FFFFFF',
        markKind: 'MONOGRAM',
        markKey: 'LETTER_SOLID',
        typefaceId: 'GROTESK',
        lockupId: 'SIDE',
    };
};

export const resolveStreamingOperatorBrand = (
    platformId: string,
    displayName: string,
    brand: StreamingOperatorBrand,
): StreamingPlatformBrandPresentation => {
    if (brand.source === 'REAL_REGISTRY') {
        return resolveStreamingPlatformBrandById(brand.registryKey, displayName);
    }
    const identity = brand.identity;
    const primaryColor = normalizeStreamingBrandHex(identity.primaryColor, '#8A8F98');
    const secondaryColor = normalizeStreamingBrandHex(identity.secondaryColor, primaryColor);
    const surfaceColor = normalizeStreamingBrandHex(identity.surfaceColor, '#111319');
    return {
        platformId: cleanId(platformId),
        displayName,
        primaryColor,
        secondaryColor,
        accentColors: [primaryColor, secondaryColor],
        surfaceColor,
        onPrimaryColor: normalizeStreamingBrandHex(identity.onPrimaryColor, getReadableStreamingBrandInk(primaryColor)),
        onSurfaceColor: getReadableStreamingBrandInk(surfaceColor),
        markKind: identity.markId.startsWith('LETTER_') ? 'MONOGRAM' : 'VECTOR_MARK',
        markKey: identity.markId,
        typefaceId: identity.typefaceId,
        lockupId: identity.lockupId,
    };
};

export const getStreamingOthersBrand = (platformId = 'OTHERS'): StreamingPlatformBrandPresentation => ({
    platformId: cleanId(platformId) || 'OTHERS',
    displayName: 'Others',
    primaryColor: '#858B96',
    secondaryColor: '#4E5561',
    accentColors: ['#858B96', '#4E5561'],
    surfaceColor: '#111319',
    onPrimaryColor: '#07090D',
    onSurfaceColor: '#FFFFFF',
    markKind: 'MONOGRAM',
    markKey: 'LETTER_OUTLINE',
    typefaceId: 'GROTESK',
    lockupId: 'SIDE',
});

export const getStreamingPlatformBrandCssVars = (
    brand: StreamingPlatformBrandPresentation,
): Record<string, string> => ({
    '--platform-brand-primary': brand.primaryColor,
    '--platform-brand-secondary': brand.secondaryColor,
    '--platform-brand-surface': brand.surfaceColor,
    '--platform-brand-on-primary': brand.onPrimaryColor,
    '--platform-brand-on-surface': brand.onSurfaceColor,
});
