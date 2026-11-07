import type { OwnedStreamingPlatformState } from '../types';
import { streamingLaunchUnlockLock, type StreamingLaunchUnlockLock } from './streamingLaunchUnlocks';
import { resolveStreamingTechTree } from './streamingTechTreeCatalogue';

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

export interface StreamingStorefrontLayoutDefinition {
    id: string;
    name: string;
    line: string;
    effects: [string, string, string];
    family: StreamingStorefrontFamily;
    composition: StreamingStorefrontComposition;
    category: StreamingStorefrontCategory;
    experimental?: boolean;
}


export const STREAMING_STOREFRONT_LAYOUTS: readonly StreamingStorefrontLayoutDefinition[] = [
    // Permanent, content-neutral ways to arrange the same catalogue. Product
    // features, recommendation systems and campaign takeovers live elsewhere.
    { id: 'cinema', name: 'Cinema', line: 'One premiere commands the room, with the library waiting below.', effects: ['Strong premium signal', 'Makes one title feel important', 'Needs a dependable headline'], family: 'cinema', composition: 'hero', category: 'CORE' },
    { id: 'spotlight', name: 'Spotlight', line: 'A restrained hero and one decisive row keep the next choice obvious.', effects: ['Fastest path to play', 'Works with a small catalogue', 'Offers less browsing depth'], family: 'cinema', composition: 'hero', category: 'CORE' },
    { id: 'wall', name: 'Wall', line: 'Everything at once, arranged as one visual field of taste.', effects: ['Whole catalogue is visible', 'Rewards library depth', 'Can overwhelm a thin slate'], family: 'wall', composition: 'wall', category: 'CORE' },
    { id: 'shelves', name: 'Shelves', line: 'Horizontal rows divide the catalogue into clear browsing lanes.', effects: ['Familiar browsing rhythm', 'Scales with catalogue depth', 'Can feel repetitive without varied artwork'], family: 'discovery', composition: 'shelves', category: 'CORE' },
    { id: 'timeline', name: 'Timeline', line: 'Dated rows stack releases into a clear vertical chronology.', effects: ['Clear release rhythm', 'Simple to scan', 'Shows fewer titles at once'], family: 'timeline', composition: 'timeline', category: 'CORE' },
    { id: 'quiet-shelf', name: 'Quiet Shelf', line: 'A calm, low-choice front page built around a few confident selections.', effects: ['Low decision fatigue', 'Feels deliberate and premium', 'Browsing moves more slowly'], family: 'cinema', composition: 'vault', category: 'CORE' },

    // More authored arrangements. Marquee, Split Hero, Mosaic, Vertical Feed and Freeform Canvas are unlocked by a
    // Tech step each (#109, streamingLaunchUnlocks.ts); they do not smuggle platform features into this list.
    { id: 'marquee', name: 'Marquee', line: 'Wide theatrical banners sell the service as a sequence of premieres.', effects: ['Big campaign moments', 'Excellent trailer placement', 'Requires frequent art refreshes'], family: 'cinema', composition: 'split', category: 'EDITORIAL' },
    { id: 'editorial-index', name: 'Editorial Index', line: 'A numbered index pairs one focused title with a navigable catalogue.', effects: ['Clear editorial hierarchy', 'Gives every title useful context', 'Needs steady curation'], family: 'rooms', composition: 'vault', category: 'EDITORIAL' },
    { id: 'chapters', name: 'Chapters', line: 'The front page reads as hand-built editorial chapters, not generic rails.', effects: ['Creates a clear voice', 'Surfaces unexpected titles', 'Editorial work repeats weekly'], family: 'rooms', composition: 'rooms', category: 'EDITORIAL' },
    { id: 'split-hero', name: 'Split Hero', line: 'Two equal headline spaces divide the opening screen.', effects: ['Balances two priorities', 'Creates immediate contrast', 'Divides attention between anchors'], family: 'cinema', composition: 'split', category: 'EDITORIAL' },
    { id: 'mosaic', name: 'Mosaic', line: 'Mixed poster sizes create an asymmetric visual field.', effects: ['Makes browsing visually energetic', 'Highlights titles at different weights', 'Needs strong artwork coverage'], family: 'wall', composition: 'wall', category: 'EDITORIAL' },
    { id: 'vertical-feed', name: 'Vertical Feed', line: 'Full-width cards move vertically, one strong title at a time.', effects: ['Designed for one-handed browsing', 'Keeps every title legible', 'Shows fewer titles at once'], family: 'feed', composition: 'feed', category: 'FRONTIER' },
    { id: 'freeform-canvas', name: 'Freeform Canvas', line: 'Poster tiles occupy a freeform spatial canvas instead of fixed rows.', effects: ['Creates a distinctive browsing rhythm', 'Uses mixed tile scale well', 'Demands advanced navigation controls'], family: 'wall', composition: 'canvas', category: 'FRONTIER', experimental: true },
    // #122 (Zeesh, 2026-11-01: "हो सके तो मैं तो कहूँगा तुम अपने आइडिया से कुछ और ढेर सारे डाल दो पेजेस"): twelve more
    // arrangements of the same catalogue, each with its own home in the app (StreamingViewerHomes). Coverflow, Bento and
    // Orbit are unlocked by a Tech step (streamingLaunchUnlocks.ts); The Deck comes with the starter Phone and web apps.
    { id: 'cover-story', name: 'Cover Story', line: 'One title as a magazine cover, the rest of the slate as its cover lines.', effects: ['Makes one title an event', 'Sells the slate at a glance', 'Needs a strong cover title'], family: 'rooms', composition: 'vault', category: 'EDITORIAL' },
    { id: 'the-chart', name: 'The Chart', line: 'The top ten as a ladder of giant numbers, new entries marked.', effects: ['Turns popularity into a reason to watch', 'Quick to scan', 'Favours what is already big'], family: 'discovery', composition: 'shelves', category: 'CORE' },
    { id: 'coverflow', name: 'Coverflow', line: 'Posters stand in a row with depth, the centre one large and lit.', effects: ['A premium, tactile browse', 'Shows artwork at its best', 'Fewer titles in view'], family: 'cinema', composition: 'hero', category: 'EDITORIAL' },
    { id: 'the-deck', name: 'The Deck', line: 'Titles dealt as a stack of cards: keep one or skip to the next.', effects: ['Fast, playful choosing', 'Made for one hand', 'Little overview of the catalogue'], family: 'feed', composition: 'feed', category: 'FRONTIER' },
    { id: 'gallery', name: 'Gallery', line: 'Framed posters on a gallery wall, each with its own plaque.', effects: ['Treats every title as a work', 'Rewards strong artwork', 'Slower to browse'], family: 'wall', composition: 'wall', category: 'EDITORIAL' },
    { id: 'bento', name: 'Bento', line: 'A boxed grid of big and small tiles, each sized to how much it matters.', effects: ['Clear hierarchy at a glance', 'Fits many titles neatly', 'Needs artwork cut to many shapes'], family: 'wall', composition: 'wall', category: 'EDITORIAL' },
    { id: 'film-strip', name: 'Film Strip', line: 'Titles run along a strip of film, frame after frame.', effects: ['A cinematic sense of what is on', 'A clear order', 'Shows fewer titles at once'], family: 'timeline', composition: 'timeline', category: 'CORE' },
    { id: 'broadsheet', name: 'Broadsheet', line: 'The front page as a newspaper: a headline story, then the briefs.', effects: ['Gives every title context', 'A distinctive voice', 'Needs a weekly edit'], family: 'rooms', composition: 'vault', category: 'EDITORIAL' },
    { id: 'orbit', name: 'Orbit', line: 'One title at the centre, the rest circling it like planets.', effects: ['Feels like a new kind of app', 'Shows titles around one idea', 'Needs room and new habits'], family: 'wall', composition: 'canvas', category: 'FRONTIER' },
    { id: 'library', name: 'Library', line: 'Titles stand as spines on a lit bookshelf; pull one out to watch.', effects: ['Warm and collectible', 'The whole catalogue in little space', 'Spines show less artwork'], family: 'discovery', composition: 'shelves', category: 'EDITORIAL' },
    { id: 'box-office', name: 'Box Office', line: 'Each title a ticket for tonight, with a tear-off to play.', effects: ['Every title feels like a night out', 'Playful and clear', 'Tickets show less artwork'], family: 'event', composition: 'event', category: 'CORE' },
    { id: 'scrapbook', name: 'Scrapbook', line: 'Polaroids pinned at angles, each with a handwritten note.', effects: ['Personal and warm', 'Memorable at a glance', 'Less orderly to browse'], family: 'wall', composition: 'wall', category: 'DISCOVERY' },
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

/** #109 (plan §18.5): the Tech step a locked front page needs, or null when it can be chosen. */
export const getStreamingStorefrontLock = (
    platform: Partial<Pick<OwnedStreamingPlatformState, 'techTree' | 'technologyLevels'>>,
    layoutId: string,
): StreamingLaunchUnlockLock | null => {
    const definition = getStreamingStorefrontDefinition(layoutId);
    return definition ? streamingLaunchUnlockLock(resolveStreamingTechTree(platform), `storefront:${definition.id}`) : null;
};

/** Why a front page cannot be chosen yet ("Unlock Smart TV apps in Tech"), or null. */
export const getStreamingStorefrontLockReason = (
    platform: Partial<Pick<OwnedStreamingPlatformState, 'techTree' | 'technologyLevels'>>,
    layoutId: string,
): string | null => {
    if (!getStreamingStorefrontDefinition(layoutId)) return 'Unknown storefront layout';
    return getStreamingStorefrontLock(platform, layoutId)?.needs ?? null;
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
