import type {
    OwnedStreamingPlatformState,
    StreamingTechnologyBranch,
} from '../types';

/**
 * The permanent storefront catalogue used by founding, the viewer app and
 * Opening Night, and ready for the dashboard customizer. A layout is a lasting
 * presentation choice, not a one-off wizard illustration, so IDs and unlock
 * rules live here.
 */
export type StreamingStorefrontFamily =
    | 'cinema'
    | 'discovery'
    | 'event'
    | 'channel'
    | 'wall'
    | 'feed'
    | 'rooms'
    | 'timeline'
    | 'concierge'
    | 'lobby';

export type StreamingStorefrontComposition =
    | 'hero'
    | 'shelves'
    | 'event'
    | 'channel'
    | 'wall'
    | 'feed'
    | 'rooms'
    | 'timeline'
    | 'concierge'
    | 'lobby'
    | 'split'
    | 'vault'
    | 'map'
    | 'binge'
    | 'canvas';

export type StreamingStorefrontCategory =
    | 'CORE'
    | 'EDITORIAL'
    | 'DISCOVERY'
    | 'LIVE'
    | 'COMMUNITY'
    | 'FRONTIER';

type StorefrontRequirement =
    { kind: 'TECH'; branch: StreamingTechnologyBranch; level: number; label: string };

export interface StreamingStorefrontLayoutDefinition {
    id: string;
    name: string;
    line: string;
    effects: [string, string, string];
    family: StreamingStorefrontFamily;
    composition: StreamingStorefrontComposition;
    category: StreamingStorefrontCategory;
    experimental?: boolean;
    requirements?: StorefrontRequirement[];
}

const tech = (
    branch: StreamingTechnologyBranch,
    level: number,
    label: string,
): StorefrontRequirement => ({ kind: 'TECH', branch, level, label });

export const STREAMING_STOREFRONT_LAYOUTS: readonly StreamingStorefrontLayoutDefinition[] = [
    // Permanent, content-neutral ways to arrange the same catalogue. Product
    // features, recommendation systems and campaign takeovers live elsewhere.
    { id: 'cinema', name: 'Cinema', line: 'One premiere commands the room, with the library waiting below.', effects: ['Strong premium signal', 'Makes one title feel important', 'Needs a dependable headline'], family: 'cinema', composition: 'hero', category: 'CORE' },
    { id: 'spotlight', name: 'Spotlight', line: 'A restrained hero and one decisive row keep the next choice obvious.', effects: ['Fastest path to play', 'Works with a small catalogue', 'Offers less browsing depth'], family: 'cinema', composition: 'hero', category: 'CORE' },
    { id: 'wall', name: 'Wall', line: 'Everything at once, arranged as one visual field of taste.', effects: ['Whole catalogue is visible', 'Rewards library depth', 'Can overwhelm a thin slate'], family: 'wall', composition: 'wall', category: 'CORE' },
    { id: 'shelves', name: 'Shelves', line: 'Horizontal rows divide the catalogue into clear browsing lanes.', effects: ['Familiar browsing rhythm', 'Scales with catalogue depth', 'Can feel repetitive without varied artwork'], family: 'discovery', composition: 'shelves', category: 'CORE' },
    { id: 'timeline', name: 'Timeline', line: 'Dated rows stack releases into a clear vertical chronology.', effects: ['Clear release rhythm', 'Simple to scan', 'Shows fewer titles at once'], family: 'timeline', composition: 'timeline', category: 'CORE' },
    { id: 'quiet-shelf', name: 'Quiet Shelf', line: 'A calm, low-choice front page built around a few confident selections.', effects: ['Low decision fatigue', 'Feels deliberate and premium', 'Browsing moves more slowly'], family: 'cinema', composition: 'vault', category: 'CORE' },

    // More authored arrangements. Their unlocks represent layout-production
    // complexity only; they do not smuggle platform features into this list.
    { id: 'marquee', name: 'Marquee', line: 'Wide theatrical banners sell the service as a sequence of premieres.', effects: ['Big campaign moments', 'Excellent trailer placement', 'Requires frequent art refreshes'], family: 'cinema', composition: 'split', category: 'EDITORIAL', requirements: [tech('PRODUCT_EXPERIENCE', 10, 'Product Experience 10')] },
    { id: 'editorial-index', name: 'Editorial Index', line: 'A numbered index pairs one focused title with a navigable catalogue.', effects: ['Clear editorial hierarchy', 'Gives every title useful context', 'Needs steady curation'], family: 'rooms', composition: 'vault', category: 'EDITORIAL', requirements: [tech('CONTENT_OPERATIONS', 12, 'Content Operations 12')] },
    { id: 'chapters', name: 'Chapters', line: 'The front page reads as hand-built editorial chapters, not generic rails.', effects: ['Creates a clear voice', 'Surfaces unexpected titles', 'Editorial work repeats weekly'], family: 'rooms', composition: 'rooms', category: 'EDITORIAL', requirements: [tech('CONTENT_OPERATIONS', 18, 'Content Operations 18')] },
    { id: 'split-hero', name: 'Split Hero', line: 'Two equal headline spaces divide the opening screen.', effects: ['Balances two priorities', 'Creates immediate contrast', 'Divides attention between anchors'], family: 'cinema', composition: 'split', category: 'EDITORIAL', requirements: [tech('PRODUCT_EXPERIENCE', 18, 'Product Experience 18')] },
    { id: 'mosaic', name: 'Mosaic', line: 'Mixed poster sizes create an asymmetric visual field.', effects: ['Makes browsing visually energetic', 'Highlights titles at different weights', 'Needs strong artwork coverage'], family: 'wall', composition: 'wall', category: 'EDITORIAL', requirements: [tech('PRODUCT_EXPERIENCE', 24, 'Product Experience 24')] },
    { id: 'vertical-feed', name: 'Vertical Feed', line: 'Full-width cards move vertically, one strong title at a time.', effects: ['Designed for one-handed browsing', 'Keeps every title legible', 'Shows fewer titles at once'], family: 'feed', composition: 'feed', category: 'FRONTIER', requirements: [tech('PRODUCT_EXPERIENCE', 28, 'Product Experience 28')] },
    { id: 'freeform-canvas', name: 'Freeform Canvas', line: 'Poster tiles occupy a freeform spatial canvas instead of fixed rows.', effects: ['Creates a distinctive browsing rhythm', 'Uses mixed tile scale well', 'Demands advanced navigation controls'], family: 'wall', composition: 'canvas', category: 'FRONTIER', experimental: true, requirements: [tech('PRODUCT_EXPERIENCE', 55, 'Product Experience 55')] },
] as const;

const LEGACY_STOREFRONT_LAYOUT_ALIASES: Readonly<Record<string, string>> = {
    vault: 'editorial-index',
    'double-feature': 'split-hero',
    'local-lens': 'chapters',
    discovery: 'shelves',
    pulse: 'shelves',
    'binge-path': 'timeline',
    concierge: 'spotlight',
    event: 'cinema',
    channel: 'cinema',
    'premiere-lane': 'timeline',
    'live-arena': 'cinema',
    'party-mode': 'cinema',
    feed: 'vertical-feed',
    rooms: 'chapters',
    'fandom-hub': 'chapters',
    'creator-channels': 'shelves',
    'family-house': 'chapters',
    'shop-window': 'shelves',
    lobby: 'cinema',
    'ai-guide': 'spotlight',
    'story-map': 'freeform-canvas',
    'infinite-canvas': 'freeform-canvas',
};

const resolveStreamingStorefrontLayoutId = (layoutId?: string | null): string => {
    const normalized = String(layoutId || '').trim().toLowerCase();
    return LEGACY_STOREFRONT_LAYOUT_ALIASES[normalized] || normalized;
};

export const normalizeStreamingStorefrontLayoutId = (layoutId?: string | null): string | null => {
    const resolved = resolveStreamingStorefrontLayoutId(layoutId);
    if (!resolved) return null;
    return STREAMING_STOREFRONT_LAYOUTS.some(layout => layout.id === resolved) ? resolved : 'cinema';
};

export const getStreamingStorefrontDefinition = (
    layoutId?: string | null,
): StreamingStorefrontLayoutDefinition | null => {
    const resolved = resolveStreamingStorefrontLayoutId(layoutId);
    return STREAMING_STOREFRONT_LAYOUTS.find(layout => layout.id === resolved) || null;
};

export const getStreamingStorefrontLockReason = (
    platform: Pick<OwnedStreamingPlatformState, 'technologyLevels'>,
    layoutId: string,
): string | null => {
    const definition = getStreamingStorefrontDefinition(layoutId);
    if (!definition) return 'Unknown storefront layout';
    const missing = (definition.requirements || []).flatMap(requirement => {
        return (platform.technologyLevels[requirement.branch] || 0) >= requirement.level
            ? []
            : [requirement.label];
    });
    return missing.length ? missing.join(' + ') : null;
};

export const getStreamingStorefrontFamily = (layoutId?: string | null): StreamingStorefrontFamily => (
    getStreamingStorefrontDefinition(layoutId)?.family || 'cinema'
);

/** Coarse runtime mode for the existing viewer app while each base layout
 * keeps its full authored preview in the Store designer. */
export const getStreamingStorefrontRuntimeMode = (
    layoutId?: string | null,
): 'HERO' | 'GRID' | 'ROWS' | 'RESUME' => {
    const composition = getStreamingStorefrontDefinition(layoutId)?.composition;
    if (composition === 'wall' || composition === 'canvas') return 'GRID';
    if (composition === 'timeline' || composition === 'binge') return 'RESUME';
    if (composition === 'shelves' || composition === 'rooms') return 'ROWS';
    return 'HERO';
};
