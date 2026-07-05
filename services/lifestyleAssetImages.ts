import { ClothingItem, Property, Vehicle } from '../types';
import { AIRCRAFT_CATALOG, BOAT_CATALOG, CAR_CATALOG, CLOTHING_CATALOG, MOTORCYCLE_CATALOG, PROPERTY_CATALOG } from './lifestyleLogic';

export type LifestyleAssetWithImage = Property | Vehicle | ClothingItem;

export interface LifestyleAssetImageInfo {
    src: string;
    fallbackSrc: string;
    alt: string;
    prompt: string;
}

const ASSET_IMAGE_ROOT = '/assets/lifestyle';
const ASSET_CATALOG = [...PROPERTY_CATALOG, ...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG, ...CLOTHING_CATALOG];

const hashString = (value: string): number => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
};

const encodeSvg = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const getAssetFolder = (asset: LifestyleAssetWithImage): string => {
    if (asset.type === 'Property') return 'properties';
    if (asset.type === 'Vehicle') return 'vehicles';
    return 'clothing';
};

const normalizeAssetName = (name: string): string => (
    name
        .replace(/\s+\(Custom\)$/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
);

const getImageAssetId = (asset: LifestyleAssetWithImage): string => {
    const explicitBaseAssetId = (asset as LifestyleAssetWithImage & { baseAssetId?: string }).baseAssetId;
    if (explicitBaseAssetId) return explicitBaseAssetId;
    if (asset.id.includes('_cust_')) return asset.id.split('_cust_')[0];

    const normalizedName = normalizeAssetName(asset.name);
    const matchingCatalogAsset = ASSET_CATALOG.find(catalogAsset => (
        catalogAsset.type === asset.type && normalizeAssetName(catalogAsset.name) === normalizedName
    ));

    return matchingCatalogAsset?.id || asset.id;
};

const getAssetKind = (asset: LifestyleAssetWithImage): string => {
    if (asset.type === 'Property') return 'property';
    if (asset.type === 'Vehicle') return asset.vehicleType.toLowerCase();
    return asset.subCategory?.toLowerCase() || asset.category.toLowerCase();
};

const getPalette = (asset: LifestyleAssetWithImage) => {
    const palettes = asset.type === 'Property'
        ? [
            ['#0f172a', '#38bdf8', '#a7f3d0', '#f8fafc'],
            ['#111827', '#f59e0b', '#fde68a', '#fef3c7'],
            ['#1f1235', '#a78bfa', '#f0abfc', '#f8fafc'],
            ['#06241f', '#34d399', '#99f6e4', '#ecfeff'],
        ]
        : asset.type === 'Vehicle'
            ? [
                ['#09090b', '#60a5fa', '#e0f2fe', '#f8fafc'],
                ['#111827', '#f97316', '#fed7aa', '#fafafa'],
                ['#031014', '#22d3ee', '#a5f3fc', '#f0fdfa'],
                ['#1f0f18', '#f43f5e', '#fecdd3', '#fff1f2'],
            ]
            : [
                ['#120817', '#f0abfc', '#f5d0fe', '#fff7ed'],
                ['#111827', '#a78bfa', '#ddd6fe', '#fafafa'],
                ['#190b0b', '#fb7185', '#fecdd3', '#fff1f2'],
                ['#10140c', '#bef264', '#ecfccb', '#f7fee7'],
            ];
    return palettes[hashString(asset.id) % palettes.length];
};

const getPropertyPixels = (accent: string, mid: string, light: string, seed: number) => {
    const roof = seed % 2 === 0 ? `<polygon points="28,88 128,36 228,88" fill="${accent}"/>` : `<rect x="52" y="38" width="152" height="42" fill="${accent}"/>`;
    const tower = seed % 3 === 0 ? `<rect x="164" y="62" width="36" height="90" fill="${mid}"/><rect x="174" y="76" width="12" height="18" fill="${light}"/><rect x="174" y="106" width="12" height="18" fill="${light}"/>` : '';
    return `
        <rect x="44" y="84" width="168" height="86" fill="${mid}"/>
        ${roof}
        ${tower}
        <rect x="68" y="108" width="24" height="22" fill="${light}"/>
        <rect x="116" y="108" width="24" height="22" fill="${light}"/>
        <rect x="162" y="108" width="24" height="22" fill="${light}"/>
        <rect x="112" y="136" width="32" height="34" fill="#050505"/>
        <rect x="28" y="170" width="200" height="14" fill="${accent}"/>
    `;
};

const getVehiclePixels = (asset: Vehicle, accent: string, mid: string, light: string) => {
    if (asset.vehicleType === 'Aircraft') {
        return `
            <rect x="58" y="104" width="142" height="24" fill="${mid}"/>
            <rect x="100" y="72" width="62" height="32" fill="${light}"/>
            <rect x="32" y="112" width="72" height="14" fill="${accent}"/>
            <rect x="154" y="112" width="70" height="14" fill="${accent}"/>
            <rect x="178" y="82" width="22" height="32" fill="${accent}"/>
            <rect x="72" y="132" width="24" height="8" fill="#050505"/>
            <rect x="164" y="132" width="24" height="8" fill="#050505"/>
        `;
    }
    if (asset.vehicleType === 'Boat') {
        return `
            <rect x="46" y="124" width="166" height="26" fill="${mid}"/>
            <polygon points="28,150 228,150 198,178 58,178" fill="${accent}"/>
            <rect x="92" y="84" width="76" height="40" fill="${light}"/>
            <rect x="110" y="96" width="18" height="16" fill="#050505"/>
            <rect x="138" y="96" width="18" height="16" fill="#050505"/>
        `;
    }
    if (asset.vehicleType === 'Motorcycle') {
        return `
            <rect x="80" y="112" width="92" height="20" fill="${accent}"/>
            <rect x="118" y="86" width="38" height="28" fill="${mid}"/>
            <rect x="94" y="98" width="32" height="12" fill="${light}"/>
            <circle cx="76" cy="148" r="26" fill="#050505"/><circle cx="76" cy="148" r="13" fill="${light}"/>
            <circle cx="178" cy="148" r="26" fill="#050505"/><circle cx="178" cy="148" r="13" fill="${light}"/>
            <rect x="156" y="74" width="34" height="10" fill="${accent}"/>
        `;
    }
    return `
        <rect x="48" y="104" width="160" height="50" fill="${accent}"/>
        <rect x="84" y="76" width="86" height="36" fill="${mid}"/>
        <rect x="96" y="86" width="24" height="18" fill="${light}"/>
        <rect x="134" y="86" width="24" height="18" fill="${light}"/>
        <rect x="34" y="128" width="28" height="26" fill="${accent}"/>
        <rect x="194" y="128" width="28" height="26" fill="${accent}"/>
        <circle cx="78" cy="162" r="22" fill="#050505"/><circle cx="78" cy="162" r="10" fill="${light}"/>
        <circle cx="178" cy="162" r="22" fill="#050505"/><circle cx="178" cy="162" r="10" fill="${light}"/>
    `;
};

const getClothingPixels = (asset: ClothingItem, accent: string, mid: string, light: string) => {
    if (asset.subCategory === 'WATCH' || /watch|daytona|royal oak|nautilus|speedmaster|tank|monaco/i.test(asset.name)) {
        return `
            <rect x="108" y="34" width="42" height="58" fill="${mid}"/>
            <rect x="108" y="164" width="42" height="58" fill="${mid}"/>
            <rect x="82" y="78" width="94" height="94" fill="${accent}"/>
            <rect x="98" y="94" width="62" height="62" fill="${light}"/>
            <rect x="124" y="108" width="8" height="30" fill="#050505"/>
            <rect x="126" y="132" width="26" height="8" fill="#050505"/>
        `;
    }
    if (asset.subCategory === 'JEWELRY') {
        return `
            <rect x="76" y="72" width="28" height="28" fill="${light}"/>
            <rect x="116" y="58" width="28" height="28" fill="${light}"/>
            <rect x="156" y="72" width="28" height="28" fill="${light}"/>
            <rect x="64" y="102" width="136" height="18" fill="${accent}"/>
            <rect x="84" y="120" width="96" height="48" fill="${mid}"/>
            <rect x="112" y="132" width="40" height="24" fill="${light}"/>
        `;
    }
    if (asset.category === 'SHOES') {
        return `
            <rect x="46" y="126" width="78" height="30" fill="${accent}"/>
            <rect x="34" y="150" width="104" height="22" fill="${mid}"/>
            <rect x="138" y="126" width="78" height="30" fill="${accent}"/>
            <rect x="126" y="150" width="104" height="22" fill="${mid}"/>
            <rect x="54" y="116" width="42" height="14" fill="${light}"/>
            <rect x="146" y="116" width="42" height="14" fill="${light}"/>
        `;
    }
    if (asset.subCategory === 'BAG') {
        return `
            <rect x="72" y="92" width="112" height="90" fill="${accent}"/>
            <rect x="88" y="72" width="80" height="34" fill="none" stroke="${mid}" stroke-width="14"/>
            <rect x="92" y="118" width="72" height="12" fill="${light}"/>
            <rect x="106" y="142" width="44" height="20" fill="${mid}"/>
        `;
    }
    return `
        <rect x="96" y="62" width="64" height="34" fill="${mid}"/>
        <polygon points="74,88 182,88 204,136 170,150 160,124 160,190 96,190 96,124 86,150 52,136" fill="${accent}"/>
        <rect x="108" y="100" width="40" height="70" fill="${light}" opacity="0.55"/>
        <rect x="104" y="188" width="48" height="14" fill="${mid}"/>
    `;
};

const getFallbackSvg = (asset: LifestyleAssetWithImage): string => {
    const [background, accent, mid, light] = getPalette(asset);
    const seed = hashString(asset.id);
    const pixelScene = asset.type === 'Property'
        ? getPropertyPixels(accent, mid, light, seed)
        : asset.type === 'Vehicle'
            ? getVehiclePixels(asset, accent, mid, light)
            : getClothingPixels(asset, accent, mid, light);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" shape-rendering="crispEdges">
            <rect width="256" height="256" fill="${background}"/>
            <rect x="16" y="16" width="224" height="224" fill="#000000" opacity="0.22"/>
            <rect x="28" y="28" width="200" height="200" fill="#ffffff" opacity="0.035"/>
            ${pixelScene}
            <rect x="18" y="18" width="220" height="220" fill="none" stroke="${accent}" stroke-width="4" opacity="0.55"/>
            <rect x="28" y="212" width="200" height="12" fill="${accent}" opacity="0.35"/>
        </svg>
    `.trim();
    return encodeSvg(svg);
};

export const getLifestyleAssetImagePath = (asset: LifestyleAssetWithImage): string => (
    `${ASSET_IMAGE_ROOT}/${getAssetFolder(asset)}/${getImageAssetId(asset)}.webp`
);

export const getLifestyleAssetImagePrompt = (asset: LifestyleAssetWithImage): string => {
    const kind = getAssetKind(asset);
    if (asset.type === 'Property') {
        return `Retro pixel-art game asset image of ${asset.name}, ${asset.location || 'luxury real estate'}, exterior hero view, cinematic lighting, clean isometric-ish catalog composition, no text, no watermark.`;
    }
    if (asset.type === 'Vehicle') {
        return `Retro pixel-art game asset image of ${asset.name}, ${kind}, three-quarter showroom view, premium game inventory icon, no text, no watermark.`;
    }
    return `Retro pixel-art game asset image of ${asset.name}, ${kind} fashion item, centered product inventory icon, premium styling, no text, no watermark.`;
};

export const getLifestyleAssetImageInfo = (asset: LifestyleAssetWithImage): LifestyleAssetImageInfo => ({
    src: getLifestyleAssetImagePath(asset),
    fallbackSrc: getFallbackSvg(asset),
    alt: asset.name,
    prompt: getLifestyleAssetImagePrompt(asset),
});
