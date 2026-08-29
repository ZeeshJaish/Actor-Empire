import type {
    StreamingEcosystemOrigin,
    StreamingGeneratedBrandIdentity,
    StreamingPlatformBrandPresentation,
    StreamingTypefaceId,
    StreamingWordmarkStyleId,
} from '../types';
import { createDeterministicRng } from './deterministicRandom';
import {
    getReadableStreamingBrandInk,
    normalizeStreamingBrandHex,
    streamingBrandHslToHex,
} from './streamingPlatformBrandRegistry';

export const GENERATED_STREAMING_BRAND_MARK_IDS = [
    'BOLT', 'ORBIT', 'PRISM', 'PULSE', 'APERTURE', 'SIGNALTOWER', 'CROWN',
    'MONOLITH', 'RIFT', 'ECLIPSE', 'LETTER_SOLID', 'LETTER_OUTLINE', 'LETTER_SLAB',
] as const;

const TYPEFACE_IDS: StreamingTypefaceId[] = ['GROTESK', 'GEOMETRIC', 'SERIF', 'CONDENSED', 'MONO', 'SLAB'];
const LOCKUP_IDS: StreamingWordmarkStyleId[] = ['WORDMARK', 'SIDE', 'STACK', 'ICON'];
const MARK_ID_SET = new Set<string>(GENERATED_STREAMING_BRAND_MARK_IDS);
const TYPEFACE_ID_SET = new Set<string>(TYPEFACE_IDS);
const LOCKUP_ID_SET = new Set<string>(LOCKUP_IDS);

interface OriginArtDirection {
    hues: number[];
    marks: string[];
    typefaces: StreamingTypefaceId[];
    lockups: StreamingWordmarkStyleId[];
}

const ORIGIN_ART_DIRECTION: Record<StreamingEcosystemOrigin, OriginArtDirection> = {
    BOOTSTRAPPED: { hues: [28, 48, 186, 212, 332], marks: ['LETTER_SOLID', 'LETTER_OUTLINE', 'PULSE', 'RIFT'], typefaces: ['GROTESK', 'MONO', 'SLAB'], lockups: ['WORDMARK', 'SIDE'] },
    VENTURE_BACKED: { hues: [188, 214, 252, 282, 326], marks: ['BOLT', 'ORBIT', 'PRISM', 'RIFT'], typefaces: ['GEOMETRIC', 'GROTESK', 'MONO'], lockups: ['SIDE', 'STACK'] },
    TELECOM_BACKED: { hues: [176, 194, 210, 232], marks: ['SIGNALTOWER', 'ORBIT', 'PULSE'], typefaces: ['GEOMETRIC', 'GROTESK'], lockups: ['SIDE', 'ICON'] },
    BROADCASTER_BACKED: { hues: [4, 24, 202, 258, 318], marks: ['APERTURE', 'PULSE', 'LETTER_SLAB', 'MONOLITH'], typefaces: ['GROTESK', 'SLAB', 'CONDENSED'], lockups: ['WORDMARK', 'SIDE'] },
    STUDIO_SPINOFF: { hues: [18, 42, 272, 322, 348], marks: ['APERTURE', 'CROWN', 'MONOLITH', 'ECLIPSE'], typefaces: ['SERIF', 'SLAB', 'CONDENSED'], lockups: ['STACK', 'SIDE'] },
    TECH_BACKED: { hues: [168, 188, 218, 252, 286], marks: ['ORBIT', 'PRISM', 'BOLT', 'MONOLITH'], typefaces: ['GEOMETRIC', 'MONO', 'GROTESK'], lockups: ['SIDE', 'ICON'] },
    CONGLOMERATE_BACKED: { hues: [202, 222, 256, 302, 342], marks: ['MONOLITH', 'PRISM', 'CROWN', 'LETTER_SOLID'], typefaces: ['GROTESK', 'GEOMETRIC', 'SERIF'], lockups: ['SIDE', 'WORDMARK'] },
    CELEBRITY_FOUNDED: { hues: [8, 36, 286, 316, 344], marks: ['CROWN', 'ECLIPSE', 'RIFT', 'LETTER_SLAB'], typefaces: ['SERIF', 'SLAB', 'CONDENSED', 'GEOMETRIC'], lockups: ['STACK', 'SIDE'] },
};

const COUNTRY_HUE_NUDGE: Record<string, number> = {
    IN: 18, JP: 338, KR: 350, ID: 16, TH: 290, PH: 204,
    BR: 42, MX: 10, AR: 202, CO: 32, CL: 218,
    GB: 214, DE: 8, FR: 238, ES: 28, IT: 126,
    ZA: 152, NG: 132, EG: 42, KE: 176,
    AU: 192, NZ: 164, US: 222, CA: 206,
};

const pick = <T>(items: T[], rng: () => number): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

const circularHueDistance = (left: number, right: number): number => {
    const distance = Math.abs(left - right) % 360;
    return Math.min(distance, 360 - distance);
};

const hexHue = (hex: string): number => {
    const normalized = normalizeStreamingBrandHex(hex, '#808080');
    const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
    const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    if (delta === 0) return 0;
    const sector = max === red ? ((green - blue) / delta) % 6
        : max === green ? (blue - red) / delta + 2
            : (red - green) / delta + 4;
    return (sector * 60 + 360) % 360;
};

const collides = (
    identity: StreamingGeneratedBrandIdentity,
    occupiedBrands: Array<Pick<StreamingPlatformBrandPresentation, 'primaryColor' | 'markKey' | 'typefaceId'>>,
): boolean => occupiedBrands.some(occupied => (
    circularHueDistance(hexHue(identity.primaryColor), hexHue(occupied.primaryColor)) < 18
    && identity.markId === occupied.markKey
    && identity.typefaceId === occupied.typefaceId
));

export interface GenerateStreamingOperatorBrandInput {
    operatorId: string;
    name: string;
    homeCountryId: string;
    origin: StreamingEcosystemOrigin;
    operatorIndex?: number;
    occupiedBrands?: Array<Pick<StreamingPlatformBrandPresentation, 'primaryColor' | 'markKey' | 'typefaceId'>>;
}

const createCandidate = (
    input: GenerateStreamingOperatorBrandInput,
    rng: () => number,
    attempt: number,
): StreamingGeneratedBrandIdentity => {
    const direction = ORIGIN_ART_DIRECTION[input.origin] || ORIGIN_ART_DIRECTION.BOOTSTRAPPED;
    const baseHue = pick(direction.hues, rng);
    const countryNudge = COUNTRY_HUE_NUDGE[input.homeCountryId] ?? 0;
    const primaryHue = (baseHue + countryNudge * 0.18 + Math.round((rng() - 0.5) * 24) + attempt * 11 + 360) % 360;
    const saturation = 64 + Math.round(rng() * 22);
    const lightness = 48 + Math.round(rng() * 10);
    const secondaryOffsets = [37, 52, 86, 148, 196];
    const secondaryHue = (primaryHue + pick(secondaryOffsets, rng)) % 360;
    const primaryColor = streamingBrandHslToHex(primaryHue, saturation, lightness);
    const secondaryColor = streamingBrandHslToHex(secondaryHue, Math.max(48, saturation - 10), Math.max(38, lightness - 7));
    const surfaceColor = streamingBrandHslToHex(primaryHue, 24, 9);
    const markId = pick(direction.marks, rng);
    return {
        schemaVersion: 1,
        primaryColor,
        secondaryColor,
        surfaceColor,
        onPrimaryColor: getReadableStreamingBrandInk(primaryColor),
        markId,
        typefaceId: pick(direction.typefaces, rng),
        lockupId: pick(direction.lockups, rng),
    };
};

export const generateStreamingOperatorBrand = (
    input: GenerateStreamingOperatorBrandInput,
): StreamingGeneratedBrandIdentity => {
    const brandSeed = `${input.operatorId}:${input.name}:${input.homeCountryId}:${input.origin}:streaming-brand:v1`;
    const rng = createDeterministicRng(brandSeed);
    const occupiedBrands = input.occupiedBrands || [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = createCandidate(input, rng, attempt);
        if (!collides(candidate, occupiedBrands)) return candidate;
    }
    const index = Math.max(0, Math.round(input.operatorIndex || 0));
    const fallbackRng = createDeterministicRng(`${brandSeed}:fallback`);
    const fallbackHue = (Math.round(fallbackRng() * 359) + 47 * index) % 360;
    const primaryColor = streamingBrandHslToHex(fallbackHue, 72, 54);
    const secondaryColor = streamingBrandHslToHex((fallbackHue + 137) % 360, 62, 44);
    return {
        schemaVersion: 1,
        primaryColor,
        secondaryColor,
        surfaceColor: streamingBrandHslToHex(fallbackHue, 24, 9),
        onPrimaryColor: getReadableStreamingBrandInk(primaryColor),
        markId: GENERATED_STREAMING_BRAND_MARK_IDS[index % GENERATED_STREAMING_BRAND_MARK_IDS.length],
        typefaceId: TYPEFACE_IDS[index % TYPEFACE_IDS.length],
        lockupId: 'SIDE',
    };
};

const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

export const normalizeGeneratedStreamingBrand = (
    value: unknown,
    fallbackInput: GenerateStreamingOperatorBrandInput,
): StreamingGeneratedBrandIdentity => {
    const source = asRecord(value);
    const fallback = generateStreamingOperatorBrand(fallbackInput);
    if (Number(source.schemaVersion) !== 1) return fallback;
    const markId = typeof source.markId === 'string' && MARK_ID_SET.has(source.markId) ? source.markId : fallback.markId;
    const typefaceId = typeof source.typefaceId === 'string' && TYPEFACE_ID_SET.has(source.typefaceId)
        ? source.typefaceId as StreamingTypefaceId : fallback.typefaceId;
    const lockupId = typeof source.lockupId === 'string' && LOCKUP_ID_SET.has(source.lockupId)
        ? source.lockupId as StreamingWordmarkStyleId : fallback.lockupId;
    const primaryColor = normalizeStreamingBrandHex(String(source.primaryColor || ''), fallback.primaryColor);
    const secondaryColor = normalizeStreamingBrandHex(String(source.secondaryColor || ''), fallback.secondaryColor);
    const surfaceColor = normalizeStreamingBrandHex(String(source.surfaceColor || ''), fallback.surfaceColor);
    return {
        schemaVersion: 1,
        primaryColor,
        secondaryColor,
        surfaceColor,
        onPrimaryColor: getReadableStreamingBrandInk(primaryColor),
        markId,
        typefaceId,
        lockupId,
    };
};
