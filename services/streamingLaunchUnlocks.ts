/**
 * What unlocks the locked front pages and ident kits (#109; Zeesh, 2026-11-01: "विज़ार्ड में … स्टोर फ्रंट डिज़ाइन या
 * प्लेबैक इंटेंट ऐसे थे जो लॉक्ड रहे रिसर्च से खुले गए … वो सारी चीज़ हमने अच्छा टेक में डाल दे"; plan §18.5).
 *
 * Each names the Tech step that unlocks it, with Tech's prices unchanged, and each step lists what it unlocks. They
 * read Product Experience and Recommendations levels before, numbers the Tech tab never showed (front pages: Marquee
 * 10, Split Hero 18, Mosaic 24, Vertical Feed 28, Freeform Canvas 55; idents: Genre 20, Adaptive 35, Living 60 with
 * Recommendations 40), behind a "Research locked" mark and a Research button that opened Tech with no target.
 *
 *   Marquee, Split Hero   Apps: Smart TV apps           (the big screen)
 *   Vertical Feed         Apps: Phone and web apps      (a starter: open from the start)
 *   Freeform Canvas       Apps: VR and holo screens ✦
 *   #122: Coverflow (Apps: Smart TV apps), Bento (Smart AI: Personal artwork and trailers), Orbit (Apps: VR and holo
 *   screens ✦), The Deck (Apps: Phone and web apps, a starter)
 *   Mosaic                Smart AI: Personal artwork and trailers
 *   Genre worlds ident    Smart AI: Because you watched
 *   Adaptive ident        Smart AI: Personal artwork and trailers
 *   Living ident          Smart AI: Taste engine ✦
 *
 * Pure: nothing here saves.
 */
import type { OwnedStreamingTechTreeState, StreamingTechId } from '../types';
import { getStreamingTechDefinition, streamingTechVersion } from './streamingTechTreeCatalogue';

/** keyed as the launch wizard keys its locks: `storefront:<layout id>`, `ident:<kit id>` (lower case) */
export const STREAMING_LAUNCH_UNLOCKS: Readonly<Record<string, { techId: StreamingTechId; label: string }>> = {
    'storefront:marquee': { techId: 'APPS_TV', label: 'the Marquee front page' },
    'storefront:split-hero': { techId: 'APPS_TV', label: 'the Split Hero front page' },
    'storefront:mosaic': { techId: 'AI_ARTWORK', label: 'the Mosaic front page' },
    'storefront:vertical-feed': { techId: 'APPS_PHONE', label: 'the Vertical Feed front page' },
    'storefront:freeform-canvas': { techId: 'APPS_HOLO', label: 'the Freeform Canvas front page' },
    /* #122: the new front pages that need a Tech step */
    'storefront:coverflow': { techId: 'APPS_TV', label: 'the Coverflow front page' },
    'storefront:bento': { techId: 'AI_ARTWORK', label: 'the Bento front page' },
    'storefront:orbit': { techId: 'APPS_HOLO', label: 'the Orbit front page' },
    'storefront:the-deck': { techId: 'APPS_PHONE', label: 'The Deck front page' },
    'ident:genre': { techId: 'AI_BECAUSE', label: 'the Genre worlds ident' },
    'ident:adaptive': { techId: 'AI_ARTWORK', label: 'the Adaptive ident' },
    'ident:living': { techId: 'AI_TASTE', label: 'the Living ident' },
};

export interface StreamingLaunchUnlockLock {
    techId: StreamingTechId;
    /** the step's name: "Smart TV apps" */
    tech: string;
    /** in words: "Unlock Smart TV apps in Tech" */
    needs: string;
}

/** Why a front page or ident kit cannot be chosen yet, with the Tech step that unlocks it; null when it can. */
export const streamingLaunchUnlockLock = (tree: OwnedStreamingTechTreeState, key: string): StreamingLaunchUnlockLock | null => {
    const unlock = STREAMING_LAUNCH_UNLOCKS[key];
    if (!unlock || streamingTechVersion(tree, unlock.techId) >= 1) return null;
    const tech = getStreamingTechDefinition(unlock.techId)?.name || unlock.techId;
    return { techId: unlock.techId, tech, needs: `Unlock ${tech} in Tech` };
};

/** What a Tech step unlocks at launch and in the brand: "the Marquee front page", "the Adaptive ident". */
export const streamingTechUnlocks = (techId: StreamingTechId): string[] => (
    Object.values(STREAMING_LAUNCH_UNLOCKS).filter(unlock => unlock.techId === techId).map(unlock => unlock.label)
);
