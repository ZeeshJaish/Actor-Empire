/* One door for the Streaming+ Pack's sheet and its level-up moment: any screen calls these,
   the app's host (components/streamingPlus/StreamingPlusHost.tsx) answers. */
export const STREAMING_PLUS_SHEET_EVENT = 'ae:streaming-plus-sheet';
export const STREAMING_PLUS_UNLOCKED_EVENT = 'ae:streaming-plus-unlocked';

export interface StreamingPlusSheetRequest {
    /** where it was opened from (for analytics), e.g. 'network-city' */
    source: string;
    /** the one line the sheet shows first, about what was tapped: "New York is a Streaming+ city." */
    line?: string;
    /** the item the player tapped, shown first */
    focus?: 'cities' | 'servers' | 'tech' | 'company' | 'campaigns' | 'brand' | 'products';
}

export const openStreamingPlusSheet = (request: StreamingPlusSheetRequest) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<StreamingPlusSheetRequest>(STREAMING_PLUS_SHEET_EVENT, { detail: request }));
};

export const announceStreamingPlusUnlocked = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(STREAMING_PLUS_UNLOCKED_EVENT));
};

/* Whether the player owns the pack, for screens far from the player (Products, the Deal Room).
   The app sets it; components read it with useStreamingPlusOwned (StreamingPlusParts). */
let ownedNow = false;
const ownedListeners = new Set<() => void>();
export const setStreamingPlusOwnedNow = (owned: boolean) => {
    if (owned === ownedNow) return;
    ownedNow = owned;
    ownedListeners.forEach(listener => listener());
};
export const getStreamingPlusOwnedNow = () => ownedNow;
export const subscribeStreamingPlusOwned = (listener: () => void) => {
    ownedListeners.add(listener);
    return () => { ownedListeners.delete(listener); };
};
