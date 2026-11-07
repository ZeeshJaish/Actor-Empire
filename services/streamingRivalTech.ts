/**
 * AI rivals' tech: a style and a pace (plan §9, Phase 5 #69: "Each rival has a style … Ecosystem
 * operators get a tech pace, a steady climb with no year locks").
 *
 * A rival starts from the tree its strength stands for (Phase 1: the steps of the higher of its own
 * researched Playback and its technology less 25). From the week the player's service first ran
 * under this rule, it takes the next step on its style's list every few months, a stronger rival
 * sooner. Nothing is saved but that week: the tree is derived on every read, and until a rival takes
 * its first step it is exactly as before.
 *   PICTURE   (Apple TV+)  the sharpest picture, HDR and sound on the market
 *   FAMILY    (Disney+)    screens, kids profiles, watch parties
 *   VALUE     (Hulu)       codecs and ads: optimised, so its prices drift down
 *   AD_FIRST  (YouTube)    ad targeting and formats, recommendations
 *   BALANCED  (Netflix)    recommendations, apps and playback, then picture
 * Every other rival takes one of PICTURE, FAMILY, VALUE or BALANCED by a stable hash of its id.
 */
import type { OwnedStreamingTechTreeState, StreamingTechId, StreamingTechVersion } from '../types';
import {
    getStreamingTechDefinition,
    getStreamingTechMissingRequirements,
    resolveRivalStreamingTechTree,
    streamingTechVersion,
} from './streamingTechTreeCatalogue';

export type StreamingRivalTechStyle = 'PICTURE' | 'FAMILY' | 'VALUE' | 'AD_FIRST' | 'BALANCED';

const CORE_STYLES: Record<string, StreamingRivalTechStyle> = {
    APPLE_TV: 'PICTURE', DISNEY_PLUS: 'FAMILY', HULU: 'VALUE', YOUTUBE: 'AD_FIRST', NETFLIX: 'BALANCED',
};
const OTHER_STYLES: StreamingRivalTechStyle[] = ['PICTURE', 'FAMILY', 'VALUE', 'BALANCED'];

type Step = [StreamingTechId, StreamingTechVersion?];

/* each style's list, foundations first: a step it already has is passed over without costing time */
const STYLE_STEPS: Record<StreamingRivalTechStyle, Step[]> = {
    PICTURE: [
        ['PICTURE_1080P'], ['HDR_HDR'], ['PICTURE_4K'], ['TRUST_STUDIO_DRM'], ['SOUND_51'], ['SOUND_71'], ['SOUND_SPATIAL'],
        ['HDR_PRO'], ['COLOUR_10BIT'], ['COLOUR_12BIT'], ['PICTURE_4K', 2], ['PICTURE_8K'], ['HDR_PRO', 2], ['SOUND_LOSSLESS'],
        ['PICTURE_4K', 3], ['PICTURE_8K', 2], ['HDR_ULTRA'], ['PICTURE_12K'], ['PICTURE_8K', 3], ['COLOUR_16BIT'], ['PICTURE_16K'], ['PICTURE_24K'],
    ],
    FAMILY: [
        ['FAM_SCREENS'], ['FAM_SCREENS', 2], ['FAM_KIDS'], ['PLAY_DOWNLOADS'], ['APPS_TV'], ['FAM_WATCH_PARTY'], ['FAM_KIDS', 2],
        ['FAM_SCREENS', 3], ['APPS_CONSOLE'], ['AI_BECAUSE'], ['PLAY_ACCESSIBILITY'], ['FAM_KIDS', 3], ['FAM_WATCH_PARTY', 2],
        ['PICTURE_1080P'], ['HDR_HDR'], ['PICTURE_4K'], ['TRUST_STUDIO_DRM'], ['HDR_PRO'], ['AI_AUTOPLAY'], ['PICTURE_8K'],
    ],
    VALUE: [
        ['OPT_HEVC'], ['ADS_CONTEXTUAL'], ['OPT_AV1'], ['ADS_BREAKS'], ['OPT_SMART_ENCODING'], ['ADS_AUDIENCE'], ['OPT_EDGE_CACHE'],
        ['ADS_FORMATS'], ['OPT_VVC'], ['PLAY_DOWNLOADS'], ['APPS_TV'], ['ADS_PRECISION'], ['ADS_BREAKS', 2], ['OPT_NEURAL'],
    ],
    AD_FIRST: [
        ['ADS_CONTEXTUAL'], ['ADS_AUDIENCE'], ['ADS_BREAKS'], ['AI_BECAUSE'], ['ADS_FORMATS'], ['APPS_TV'], ['ADS_PRECISION'],
        ['AI_AUTOPLAY'], ['AI_ARTWORK'], ['ADS_BREAKS', 2], ['AI_CHANNELS'], ['ADS_FORMATS', 2], ['ADS_AI'], ['AI_TASTE'],
    ],
    BALANCED: [
        ['AI_BECAUSE'], ['APPS_TV'], ['PLAY_DOWNLOADS'], ['PLAY_FAST_START'], ['AI_AUTOPLAY'], ['FAM_SCREENS'], ['FAM_SCREENS', 2],
        ['AI_ARTWORK'], ['HDR_PRO'], ['PLAY_ADAPTIVE'], ['APPS_CONSOLE'], ['AI_CHANNELS'], ['PLAY_SKIP_INTRO'], ['PICTURE_8K'],
        ['AI_TASTE'], ['PLAY_LOW_LATENCY'],
    ],
};

/** A rival's style: the five core rivals by name, every other one by a stable hash of its id */
export const streamingRivalTechStyle = (platformId: string): StreamingRivalTechStyle => {
    if (CORE_STYLES[platformId]) return CORE_STYLES[platformId];
    let hash = 2166136261;
    for (const char of `${platformId}:tech-style`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return OTHER_STYLES[(hash >>> 0) % OTHER_STYLES.length];
};

/** How many weeks a rival takes per step: a year at technology 70, nine months for the strongest *(start)* */
export const streamingRivalTechStepWeeks = (technology: number): number => (
    Math.max(30, Math.min(104, Math.round(52 * 70 / Math.max(40, Number(technology) || 0))))
);

export interface StreamingRivalTechGrowth {
    style: StreamingRivalTechStyle;
    /** the tree its strength stands for, as in Phase 1 */
    base: OwnedStreamingTechTreeState;
    /** with the steps it has taken since */
    tree: OwnedStreamingTechTreeState;
    /** those steps, in the order taken */
    steps: Array<{ techId: StreamingTechId; version: StreamingTechVersion }>;
}

/** A rival's tech `weeks` after the player's service first ran under this rule */
export const resolveRivalStreamingTechGrowth = (
    platformId: string,
    technology: number,
    researchedPlayback: number | undefined,
    weeks: number,
): StreamingRivalTechGrowth => {
    const base = resolveRivalStreamingTechTree(technology, researchedPlayback);
    const style = streamingRivalTechStyle(platformId);
    const due = Math.floor(Math.max(0, Number(weeks) || 0) / streamingRivalTechStepWeeks(technology));
    let tree = base;
    const steps: StreamingRivalTechGrowth['steps'] = [];
    for (const [techId, version = 1] of STYLE_STEPS[style]) {
        if (steps.length >= due) break;
        const definition = getStreamingTechDefinition(techId);
        const current = streamingTechVersion(tree, techId);
        if (!definition || current >= version || current !== version - 1) continue;
        if (version === 1 && getStreamingTechMissingRequirements(tree, definition).length) continue;
        tree = { ...tree, techs: { ...tree.techs, [techId]: { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0, granted: true } } };
        steps.push({ techId, version });
    }
    return { style, base, tree, steps };
};
