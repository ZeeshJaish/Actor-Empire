/**
 * Platform tech tree: the catalogue and its pure rules (no player, nothing saved).
 *
 * The plan is codex-handoff/plans/platform-tech-plan.md. Phase 1 built the Picture,
 * HDR, Colour and Sound groups; Phase 2 adds Optimisation (less load and cost per viewer)
 * and Stabilization (pays tech debt down), with tech debt itself.
 *
 *   unlock     cash once, from the platform treasury; the tech arrives at version 1
 *   versions   2 and 3 with energy (+5 a press, or the rest at once); energy put in is kept
 *   upkeep     every unlocked tech costs a little each week; starter techs are free
 *
 * A version is the real quality of that tech (Zeesh: "Amazon ka 4K accha hota hai, 1080
 * kharab render hota hai"): Picture v1 basic, v2 sharp, v3 reference. HDR and colour depth
 * are their own ladders. There are no year locks: the futuristic steps are simply further
 * up the ladder and dearer.
 *
 * The engine still reads `technologyLevels` in many places (playback success, reach, Product
 * Lab gates, rivals), so the tree feeds Playback Quality, Delivery and Reliability
 * (`applyStreamingTechBridge`), never lowering them.
 *
 * Tech debt: every unlock and version of Picture, HDR, Colour and Sound adds some (pushing
 * quality fast), and Stabilization pays it down every week, the tree's own first and then
 * what campus builds left in the infrastructure. Debt makes playback shakier.
 */
import type {
    OwnedStreamingTechProgress,
    OwnedStreamingTechTreeState,
    StreamingTechGroupId,
    StreamingTechId,
    StreamingTechVersion,
    StreamingTechnologyBranch,
} from '../types';

export interface StreamingTechGroupDefinition {
    id: StreamingTechGroupId;
    name: string;
    /** one line: what the group is for */
    detail: string;
    /** what versions 1, 2 and 3 are called in this group */
    versionNames: [string, string, string];
}

export interface StreamingTechDefinition {
    id: StreamingTechId;
    group: StreamingTechGroupId;
    /** the step's own name: '4K', 'HDR Pro', '10-bit', 'Spatial 3D' */
    name: string;
    /** one line: what the viewer gets */
    detail: string;
    /** owned from the start at version 1, with no upkeep */
    starter?: boolean;
    /** techs needed (at version 1 or above) before this one can be unlocked */
    requires: StreamingTechId[];
    unlockCost: number;
    /** energy to reach version 2, then version 3 */
    versionEnergy: [number, number];
    weeklyUpkeep: number;
    /** a far-future step: marked as such, never locked to a year */
    futuristic?: boolean;
    /** not on the group's main ladder (Sound's Clear dialogue) */
    sideLine?: boolean;
    /** what this step adds to the engine's Playback Quality level at versions 1, 2 and 3 */
    playbackPoints: [number, number, number];
    /** tech debt this step adds when unlocked; each version reached adds half of it, rounded up */
    debt?: number;
    /** Optimisation: a viewer's load is multiplied by this at versions 1, 2 and 3 */
    loadFactor?: [number, number, number];
    /** Optimisation: a viewer's streaming cost is multiplied by this */
    costFactor?: [number, number, number];
    /** Stabilization: tech debt paid down each week */
    debtPaydown?: [number, number, number];
    /** Stabilization: the share of an overload's harm that is left */
    overloadFactor?: [number, number, number];
    /** the engine level this step stands for besides Playback Quality, at versions 1, 2 and 3 */
    engine?: { branch: StreamingTechEngineBranch; points: [number, number, number] };
    /** Playback: points added to the week's playback success at versions 1, 2 and 3 */
    playbackBoost?: [number, number, number];
    /** Playback (#53): weekly churn taken off the player's rate at versions 1, 2 and 3 (0.001 = 0.1 points) */
    churnCut?: [number, number, number];
    /** Playback (#53): appeal to Habit streamers at versions 1, 2 and 3 */
    habitAppeal?: [number, number, number];
    /** Apps and devices (#53): the extra share of homes that can watch at versions 1, 2 and 3; only the best step counts */
    deviceReach?: [number, number, number];
    /** Content protection (#54): how likely a title leaks against DRM alone, at versions 1, 2 and 3; the best step counts */
    leakFactor?: [number, number, number];
    /** Account security (#54): how likely an account breach is */
    breachFactor?: [number, number, number];
    /** Privacy (#54): the share of a crisis's scrutiny that reaches the regulator */
    scrutinyFactor?: [number, number, number];
    /** Content protection (#55): how long a takedown takes against the usual weeks; the best step counts */
    takedownFactor?: [number, number, number];
    /** Household detection (#56): the share of a sharing crackdown's extra cancellations left */
    crackdownFactor?: [number, number, number];
    /** Device check (#56): outside homes watching on the player's accounts are multiplied by this */
    sharingFactor?: [number, number, number];
    /** Paid extra member (#56): of the sharers the rules turn away, the share who pay to stay (plans with Extra member) */
    extraMemberShare?: [number, number, number];
    /** Smart AI (#59): the share more of a cohort's accounts that find something to watch; the best recommendations step counts, plus each side line's */
    aiLift?: [number, number, number];
    /** Autoplay and previews (#59): points of completion and of repeat viewing added */
    completionLift?: [number, number, number];
    repeatLift?: [number, number, number];
    /** Profiles and screens (#60): its versions are screens, not quality ("2 screens", "4 screens", "6 screens") */
    versionNames?: [string, string, string];
    /** Profiles and screens (#60): the most screens at once a plan can sell at versions 1, 2 and 3 */
    screens?: [number, number, number];
    /** Profiles and family (#60): appeal to family households at versions 1, 2 and 3 */
    familyAppeal?: [number, number, number];
    /** New ad formats (#61): ad slots an hour are multiplied by this, at the same ad minutes */
    adSlots?: [number, number, number];
    /** Smarter ad breaks (#61): the viewers lost per ad minute past six an hour are multiplied by this */
    breakSlope?: [number, number, number];
    /** Smarter ad breaks (#61): what ads cost a plan with viewers is multiplied by this */
    adAnnoyance?: [number, number, number];
}

/** The engine levels a group's steps stand for (§4.3), besides Playback Quality. */
export type StreamingTechEngineBranch = 'DELIVERY_CAPACITY' | 'RELIABILITY' | 'PRODUCT_EXPERIENCE' | 'SECURITY' | 'DATA_RECOMMENDATIONS' | 'ADVERTISING_COMMERCE';

export const STREAMING_TECH_GROUPS: StreamingTechGroupDefinition[] = [
    { id: 'PICTURE', name: 'Picture', detail: 'How sharp your service can look', versionNames: ['Basic', 'Sharp', 'Reference'] },
    { id: 'HDR', name: 'HDR', detail: 'Brighter highlights and deeper shadows', versionNames: ['Basic', 'Bright', 'Precise'] },
    { id: 'COLOUR', name: 'Colour', detail: 'More shades, smoother skies', versionNames: ['Basic', 'Smooth', 'Studio'] },
    { id: 'SOUND', name: 'Sound', detail: 'From stereo to sound all around', versionNames: ['Basic', 'Clear', 'Studio'] },
    { id: 'OPTIMISATION', name: 'Optimisation', detail: 'Less load and cost for every viewer', versionNames: ['Basic', 'Tuned', 'Peak'] },
    { id: 'STABILIZATION', name: 'Stabilization', detail: 'Pays tech debt down and keeps you up', versionNames: ['Basic', 'Steady', 'Bulletproof'] },
    { id: 'PLAYBACK', name: 'Playback', detail: 'How fast titles start and how smoothly they play', versionNames: ['Basic', 'Smooth', 'Instant'] },
    { id: 'APPS', name: 'Apps and devices', detail: 'Every screen your viewers can watch on', versionNames: ['Basic', 'Polished', 'Flagship'] },
    { id: 'TRUST', name: 'Trust and safety', detail: 'Keeps titles, accounts and payments safe', versionNames: ['Basic', 'Hardened', 'Fortress'] },
    { id: 'SMART_AI', name: 'Smart AI', detail: 'Helps every viewer find the next thing to watch', versionNames: ['Basic', 'Smart', 'Uncanny'] },
    { id: 'FAMILY', name: 'Profiles and family', detail: 'Screens, profiles and a safe place for kids', versionNames: ['Basic', 'Plus', 'Max'] },
    { id: 'ADS', name: 'Ads tech', detail: 'More ad money from every hour watched', versionNames: ['Basic', 'Sharp', 'Prime'] },
];

const tech = (
    id: StreamingTechId,
    group: StreamingTechGroupId,
    name: string,
    detail: string,
    requires: StreamingTechId[],
    unlockCost: number,
    versionEnergy: [number, number],
    weeklyUpkeep: number,
    playbackPoints: [number, number, number],
    extra: Partial<Pick<StreamingTechDefinition, 'starter' | 'futuristic' | 'sideLine' | 'debt' | 'loadFactor' | 'costFactor' | 'debtPaydown' | 'overloadFactor' | 'engine' | 'playbackBoost'
        | 'churnCut' | 'habitAppeal' | 'deviceReach' | 'leakFactor' | 'breachFactor' | 'scrutinyFactor' | 'takedownFactor'
        | 'crackdownFactor' | 'sharingFactor' | 'extraMemberShare' | 'aiLift' | 'completionLift' | 'repeatLift'
        | 'versionNames' | 'screens' | 'familyAppeal' | 'adSlots' | 'breakSlope' | 'adAnnoyance'>> = {},
): StreamingTechDefinition => ({ id, group, name, detail, requires, unlockCost, versionEnergy, weeklyUpkeep, playbackPoints, ...extra });

/* Starting numbers from the plan (§4.2), to be tuned in balancing (Phase 5). */
export const STREAMING_TECH_DEFINITIONS: StreamingTechDefinition[] = [
    tech('PICTURE_480P', 'PICTURE', '480p', 'Standard definition: light to stream, soft on a big screen', [], 0, [5, 10], 0, [0, 2, 4], { starter: true }),
    tech('PICTURE_720P', 'PICTURE', '720p', 'The first step into HD', ['PICTURE_480P'], 2_000_000, [10, 15], 20_000, [8, 10, 12], { debt: 2 }),
    tech('PICTURE_1080P', 'PICTURE', '1080p', 'Full HD: what most viewers expect', ['PICTURE_720P'], 6_000_000, [15, 20], 50_000, [20, 23, 26], { debt: 3 }),
    tech('PICTURE_4K', 'PICTURE', '4K', 'Four times the detail of 1080p', ['PICTURE_1080P'], 25_000_000, [40, 60], 120_000, [55, 58, 61], { debt: 5 }),
    tech('PICTURE_8K', 'PICTURE', '8K', 'Detail beyond most screens today', ['PICTURE_4K'], 80_000_000, [120, 160], 300_000, [66, 69, 72], { debt: 8 }),
    tech('PICTURE_12K', 'PICTURE', '12K', 'Wall-sized screens, no visible pixels', ['PICTURE_8K'], 180_000_000, [240, 300], 600_000, [76, 78, 80], { futuristic: true, debt: 11 }),
    tech('PICTURE_16K', 'PICTURE', '16K', 'Built for screens that do not exist yet', ['PICTURE_12K'], 350_000_000, [300, 360], 1_000_000, [84, 86, 88], { futuristic: true, debt: 14 }),
    tech('PICTURE_24K', 'PICTURE', '24K', 'As sharp as looking out of a window', ['PICTURE_16K'], 700_000_000, [360, 480], 1_800_000, [92, 94, 96], { futuristic: true, debt: 18 }),

    tech('HDR_HDR', 'HDR', 'HDR', 'High dynamic range: real brightness and real darkness', ['PICTURE_1080P'], 10_000_000, [10, 20], 50_000, [2, 3, 4], { debt: 3 }),
    tech('HDR_PRO', 'HDR', 'HDR Pro', 'Scene-by-scene HDR, tuned shot by shot', ['HDR_HDR', 'PICTURE_4K'], 40_000_000, [50, 70], 200_000, [4, 5, 6], { debt: 5 }),
    tech('HDR_ULTRA', 'HDR', 'HDR Ultra', 'Light the way the eye sees it', ['HDR_PRO', 'PICTURE_8K'], 150_000_000, [160, 240], 750_000, [6, 7, 8], { futuristic: true, debt: 8 }),

    tech('COLOUR_8BIT', 'COLOUR', '8-bit', '16 million colours: fine, with banding in skies', [], 0, [5, 10], 0, [0, 1, 2], { starter: true }),
    tech('COLOUR_10BIT', 'COLOUR', '10-bit', 'A billion colours: smooth gradients', ['COLOUR_8BIT', 'PICTURE_1080P'], 5_000_000, [10, 15], 25_000, [1, 2, 3], { debt: 2 }),
    tech('COLOUR_12BIT', 'COLOUR', '12-bit', 'Studio-master colour for HDR Pro', ['COLOUR_10BIT', 'HDR_PRO'], 30_000_000, [40, 60], 150_000, [2, 3, 4], { debt: 3 }),
    tech('COLOUR_16BIT', 'COLOUR', '16-bit', 'Colour finer than the eye can tell apart', ['COLOUR_12BIT', 'HDR_ULTRA'], 120_000_000, [160, 200], 600_000, [3, 4, 5], { futuristic: true, debt: 5 }),

    tech('SOUND_STEREO', 'SOUND', 'Stereo', 'Left and right: the starting sound', [], 0, [5, 10], 0, [0, 1, 2], { starter: true }),
    tech('SOUND_51', 'SOUND', '5.1 Surround', 'Sound from all around the room', ['SOUND_STEREO'], 4_000_000, [10, 15], 20_000, [1, 2, 3], { debt: 1 }),
    tech('SOUND_71', 'SOUND', '7.1 Surround', 'Two more channels behind the viewer', ['SOUND_51'], 10_000_000, [15, 20], 50_000, [2, 3, 4], { debt: 2 }),
    tech('SOUND_SPATIAL', 'SOUND', 'Spatial 3D', 'Sound above and around: a full dome', ['SOUND_71'], 30_000_000, [40, 60], 150_000, [3, 4, 5], { debt: 3 }),
    tech('SOUND_LOSSLESS', 'SOUND', 'Lossless', 'The studio master, nothing thrown away', ['SOUND_SPATIAL'], 60_000_000, [120, 160], 300_000, [4, 5, 6], { debt: 4 }),
    tech('SOUND_PERSONAL', 'SOUND', 'Personal sound', 'Tuned to each viewer\'s ears and room', ['SOUND_LOSSLESS'], 150_000_000, [160, 240], 750_000, [5, 6, 7], { futuristic: true, debt: 6 }),
    tech('SOUND_CLEAR_DIALOGUE', 'SOUND', 'Clear dialogue', 'Voices lifted above music and effects', ['SOUND_STEREO'], 3_000_000, [10, 15], 15_000, [0, 1, 2], { sideLine: true, debt: 1 }),

    /* Optimisation (plan §5, prices and energy from §4.2): a viewer's load and streaming cost,
       multiplied down. The best codec owned counts and every side line multiplies on top; fully
       optimised is about ×0.14, so 4K (6 units) ends up costing less than 480p does today.
       Expensive on purpose ("thoda mehnga bhi hona chahiye"). HEVC stands for Delivery 20, AV1
       for 40 and the next-gen codec for 60, as the old Edge Grid builds did. */
    tech('OPT_H264', 'OPTIMISATION', 'H.264', 'The codec every screen plays: where everyone starts', [], 0, [5, 10], 0, [0, 0, 0],
        { starter: true, loadFactor: [1, .97, .94], costFactor: [1, .97, .94], engine: { branch: 'DELIVERY_CAPACITY', points: [0, 2, 4] } }),
    tech('OPT_HEVC', 'OPTIMISATION', 'HEVC', 'The same picture with about a fifth less data', ['OPT_H264'], 15_000_000, [40, 60], 75_000, [0, 0, 0],
        { loadFactor: [.85, .8, .75], costFactor: [.85, .8, .75], engine: { branch: 'DELIVERY_CAPACITY', points: [20, 23, 26] } }),
    tech('OPT_AV1', 'OPTIMISATION', 'AV1', 'An open codec: a third less data again', ['OPT_HEVC'], 50_000_000, [60, 80], 250_000, [0, 0, 0],
        { loadFactor: [.65, .6, .55], costFactor: [.65, .6, .55], engine: { branch: 'DELIVERY_CAPACITY', points: [40, 44, 48] } }),
    tech('OPT_VVC', 'OPTIMISATION', 'Next-gen codec', 'Half of HEVC\'s data for the same frame', ['OPT_AV1'], 150_000_000, [200, 240], 750_000, [0, 0, 0],
        { loadFactor: [.45, .4, .35], costFactor: [.45, .4, .35], engine: { branch: 'DELIVERY_CAPACITY', points: [60, 64, 68] } }),
    tech('OPT_NEURAL', 'OPTIMISATION', 'Neural codec', 'A model rebuilds the picture from a trickle of data', ['OPT_VVC'], 400_000_000, [420, 540], 2_000_000, [0, 0, 0],
        { futuristic: true, loadFactor: [.28, .24, .2], costFactor: [.28, .24, .2], engine: { branch: 'DELIVERY_CAPACITY', points: [80, 85, 90] } }),
    tech('OPT_SMART_ENCODING', 'OPTIMISATION', 'Smart encoding', 'Each title encoded for exactly what it needs', ['OPT_HEVC'], 20_000_000, [30, 40], 100_000, [0, 0, 0],
        { sideLine: true, loadFactor: [.95, .92, .9], costFactor: [.95, .92, .9], engine: { branch: 'DELIVERY_CAPACITY', points: [1, 2, 3] } }),
    tech('OPT_EDGE_CACHE', 'OPTIMISATION', 'Edge cache', 'Popular titles served close to their viewers', ['OPT_H264'], 40_000_000, [40, 60], 200_000, [0, 0, 0],
        { sideLine: true, loadFactor: [.98, .96, .94], costFactor: [.95, .9, .85], engine: { branch: 'DELIVERY_CAPACITY', points: [2, 4, 6] } }),
    tech('OPT_APP', 'OPTIMISATION', 'App optimisation', 'Lighter apps that buffer smarter', ['OPT_H264'], 25_000_000, [30, 40], 125_000, [0, 0, 0],
        { sideLine: true, loadFactor: [.97, .94, .9], costFactor: [.97, .94, .9], engine: { branch: 'DELIVERY_CAPACITY', points: [1, 2, 3] } }),

    /* Stabilization (Zeesh, after Phase 1): pays tech debt down every week and keeps playback
       steady. The best step owned pays its rate and Load testing adds a little and softens overloads.
       Auto-scaling stands for Reliability 10 and Redundancy for 35, the levels two and four screens
       needed until Profiles and screens took them over (#60). */
    tech('STAB_MONITORING', 'STABILIZATION', 'Monitoring', 'See trouble before viewers do', [], 0, [5, 10], 0, [0, 0, 0],
        { starter: true, debtPaydown: [1, 1.5, 2], engine: { branch: 'RELIABILITY', points: [0, 2, 4] } }),
    tech('STAB_AUTOSCALING', 'STABILIZATION', 'Auto-scaling', 'Servers that grow with the evening rush', ['STAB_MONITORING'], 8_000_000, [10, 15], 80_000, [0, 0, 0],
        { debtPaydown: [2, 2.5, 3], engine: { branch: 'RELIABILITY', points: [10, 12, 14] } }),
    tech('STAB_REDUNDANCY', 'STABILIZATION', 'Redundancy', 'A second region takes over when one fails', ['STAB_AUTOSCALING'], 30_000_000, [30, 50], 250_000, [0, 0, 0],
        { debtPaydown: [3, 3.5, 4], engine: { branch: 'RELIABILITY', points: [35, 38, 41] } }),
    tech('STAB_CHAOS', 'STABILIZATION', 'Chaos testing', 'Break things on purpose, fix them first', ['STAB_REDUNDANCY'], 90_000_000, [100, 140], 600_000, [0, 0, 0],
        { debtPaydown: [4, 5, 6], engine: { branch: 'RELIABILITY', points: [50, 54, 58] } }),
    tech('STAB_SELF_HEALING', 'STABILIZATION', 'Self-healing', 'Systems that fix themselves overnight', ['STAB_CHAOS'], 250_000_000, [240, 330], 1_500_000, [0, 0, 0],
        { futuristic: true, debtPaydown: [6, 8, 10], engine: { branch: 'RELIABILITY', points: [70, 75, 80] } }),
    tech('STAB_LOAD_TESTING', 'STABILIZATION', 'Load testing', 'Rehearse the premiere-night rush', ['STAB_MONITORING'], 5_000_000, [10, 15], 50_000, [0, 0, 0],
        { sideLine: true, overloadFactor: [.85, .75, .65], debtPaydown: [.5, .75, 1], engine: { branch: 'RELIABILITY', points: [1, 2, 3] } }),

    /* Playback (Phase 3 #52, plan §4.1 row 6): titles that start fast and never stop. Each main
       step adds to the week's playback success (and No buffering softens an overload), which feeds
       reliability, churn and tech health; it carries no Reliability points, so Reliability stays
       with Stabilization (screens moved to Profiles and screens, #60). The side lines stand for Product Experience: Downloads for 25, the level the
       plan feature needed, so the feature moves here without moving its bar. */
    tech('PLAY_FAST_START', 'PLAYBACK', 'Fast start', 'Titles start in under two seconds', [], 4_000_000, [10, 15], 20_000, [0, 0, 0],
        { debt: 1, playbackBoost: [.15, .2, .25], churnCut: [.0003, .0004, .0005], habitAppeal: [2, 2.4, 2.8] }),
    tech('PLAY_ADAPTIVE', 'PLAYBACK', 'No buffering', 'Adaptive streaming: the picture bends, the film never stops', ['PLAY_FAST_START'], 18_000_000, [30, 50], 90_000, [0, 0, 0],
        { debt: 2, playbackBoost: [.3, .4, .5], overloadFactor: [.8, .7, .6], churnCut: [.0006, .0008, .001], habitAppeal: [3, 3.6, 4.2] }),
    tech('PLAY_LOW_LATENCY', 'PLAYBACK', 'Low-latency streaming', 'Seconds behind live: ready for live events and games', ['PLAY_ADAPTIVE'], 60_000_000, [100, 140], 300_000, [0, 0, 0],
        { debt: 3, playbackBoost: [.1, .15, .2], churnCut: [.0002, .0003, .0004], habitAppeal: [1, 1.2, 1.4] }),
    tech('PLAY_DOWNLOADS', 'PLAYBACK', 'Downloads', 'Titles saved for the plane and the commute', [], 8_000_000, [10, 15], 40_000, [0, 0, 0],
        { sideLine: true, debt: 1, engine: { branch: 'PRODUCT_EXPERIENCE', points: [25, 27, 29] } }),
    tech('PLAY_SKIP_INTRO', 'PLAYBACK', 'Skip intro and recap', 'One tap past the titles and the last-time-on', [], 3_000_000, [5, 10], 15_000, [0, 0, 0],
        { sideLine: true, engine: { branch: 'PRODUCT_EXPERIENCE', points: [3, 4, 5] }, churnCut: [.0004, .0005, .0006], habitAppeal: [2, 2.4, 2.8] }),
    tech('PLAY_CONTINUE', 'PLAYBACK', 'Continue anywhere', 'Stop on the TV, finish on the phone', [], 6_000_000, [10, 15], 30_000, [0, 0, 0],
        { sideLine: true, debt: 1, engine: { branch: 'PRODUCT_EXPERIENCE', points: [5, 6, 7] }, churnCut: [.0007, .0009, .0011], habitAppeal: [4, 4.8, 5.6] }),
    tech('PLAY_ACCESSIBILITY', 'PLAYBACK', 'Subtitles and audio description', 'Every title watchable by everyone', [], 4_000_000, [10, 15], 20_000, [0, 0, 0],
        { sideLine: true, engine: { branch: 'PRODUCT_EXPERIENCE', points: [3, 4, 5] }, churnCut: [.0003, .0004, .0005], habitAppeal: [1, 1.2, 1.4] }),

    /* Apps and devices (Phase 3 #52, plan §4.1 row 7): every screen the service can be watched on,
       standing for Product Experience (Smart TV 15, Consoles 30). Reach and appeal from them are
       the next entry's. */
    tech('APPS_PHONE', 'APPS', 'Phone and web apps', 'Watch on any phone and browser', [], 0, [5, 10], 0, [0, 0, 0],
        { starter: true, engine: { branch: 'PRODUCT_EXPERIENCE', points: [0, 1, 2] } }),
    tech('APPS_TV', 'APPS', 'Smart TV apps', 'The big screen in the living room', ['APPS_PHONE'], 12_000_000, [30, 40], 60_000, [0, 0, 0],
        { debt: 2, engine: { branch: 'PRODUCT_EXPERIENCE', points: [15, 17, 19] }, deviceReach: [.03, .035, .04] }),
    tech('APPS_CONSOLE', 'APPS', 'Consoles', 'Every games console under the TV', ['APPS_TV'], 30_000_000, [40, 60], 150_000, [0, 0, 0],
        { debt: 3, engine: { branch: 'PRODUCT_EXPERIENCE', points: [30, 33, 36] }, deviceReach: [.05, .055, .06] }),
    tech('APPS_CAR', 'APPS', 'Car screens', 'Back-seat screens on every journey', ['APPS_CONSOLE'], 120_000_000, [120, 160], 600_000, [0, 0, 0],
        { futuristic: true, debt: 5, engine: { branch: 'PRODUCT_EXPERIENCE', points: [40, 43, 46] }, deviceReach: [.065, .07, .075] }),
    tech('APPS_HOLO', 'APPS', 'VR and holo screens', 'A cinema in a headset, a screen in the air', ['APPS_CAR'], 250_000_000, [270, 360], 1_250_000, [0, 0, 0],
        { futuristic: true, debt: 8, engine: { branch: 'PRODUCT_EXPERIENCE', points: [50, 54, 58] }, deviceReach: [.08, .085, .09] }),
    /* Trust and safety (Phase 3 #54, plan §4.1 row 8). Content protection is the ladder, from the DRM
       every service starts with to an AI that hunts pirates. It stands for the Security level (the
       crisis engine reads it) and makes leaks rarer; from Studio DRM, plans may sell 4K and above
       (studios license those only with strong DRM). Account security makes breaches rarer, Safe
       payments keeps cards from failing (fewer cancel), Privacy keeps scrutiny from reaching the
       regulator. #55: the Takedown network and AI hunter shorten takedowns. #56: Sharing control, a
       ladder of side lines: Household detection spares paying homes in a crackdown, Device check
       stops passwords travelling, Paid extra member lets a turned-away sharer pay to stay. */
    tech('TRUST_DRM', 'TRUST', 'DRM', 'Titles locked to your apps', [], 0, [5, 10], 0, [0, 0, 0],
        { starter: true, engine: { branch: 'SECURITY', points: [0, 2, 4] }, leakFactor: [1, .95, .9] }),
    tech('TRUST_STUDIO_DRM', 'TRUST', 'Studio DRM', 'The hardware-backed keys studios ask for before they license 4K', ['TRUST_DRM'], 15_000_000, [20, 30], 75_000, [0, 0, 0],
        { debt: 1, engine: { branch: 'SECURITY', points: [15, 17, 19] }, leakFactor: [.8, .75, .7] }),
    tech('TRUST_WATERMARK', 'TRUST', 'Watermarking', 'An invisible mark in every stream, so a leak points home', ['TRUST_STUDIO_DRM'], 40_000_000, [30, 50], 200_000, [0, 0, 0],
        { debt: 2, engine: { branch: 'SECURITY', points: [25, 28, 31] }, leakFactor: [.6, .55, .5] }),
    tech('TRUST_TAKEDOWN', 'TRUST', 'Takedown network', 'Finds pirated copies and has them taken down', ['TRUST_WATERMARK'], 90_000_000, [100, 140], 450_000, [0, 0, 0],
        { debt: 2, engine: { branch: 'SECURITY', points: [45, 49, 53] }, leakFactor: [.45, .4, .35], takedownFactor: [.5, .45, .4] }),
    tech('TRUST_AI_HUNTER', 'TRUST', 'AI piracy hunter', 'Spots a pirated copy before the premiere ends', ['TRUST_TAKEDOWN'], 200_000_000, [240, 330], 1_000_000, [0, 0, 0],
        { futuristic: true, debt: 4, engine: { branch: 'SECURITY', points: [70, 75, 80] }, leakFactor: [.3, .25, .2], takedownFactor: [.3, .25, .2] }),
    tech('TRUST_ACCOUNT', 'TRUST', 'Account security', 'Two-step sign-in and alerts on strange logins', [], 6_000_000, [10, 15], 30_000, [0, 0, 0],
        { sideLine: true, engine: { branch: 'SECURITY', points: [5, 6, 7] }, breachFactor: [.5, .4, .3] }),
    tech('TRUST_PAYMENTS', 'TRUST', 'Safe payments', 'Card updates and retries, so payments do not fail', [], 5_000_000, [10, 15], 25_000, [0, 0, 0],
        { sideLine: true, churnCut: [.0002, .0003, .0004] }),
    tech('TRUST_PRIVACY', 'TRUST', 'Privacy', 'Clear data controls a regulator can check', [], 4_000_000, [10, 15], 20_000, [0, 0, 0],
        { sideLine: true, scrutinyFactor: [.7, .6, .5] }),
    tech('TRUST_HOUSEHOLD', 'TRUST', 'Household detection', "Tells a family's screens from a sharer's, so a crackdown spares paying homes", [], 6_000_000, [10, 15], 30_000, [0, 0, 0],
        { sideLine: true, crackdownFactor: [.5, .4, .3] }),
    tech('TRUST_DEVICE_CHECK', 'TRUST', 'Device check', 'A new screen checks in at home, so passwords stop travelling', ['TRUST_HOUSEHOLD'], 15_000_000, [30, 40], 75_000, [0, 0, 0],
        { sideLine: true, debt: 1, sharingFactor: [.75, .7, .65] }),
    tech('TRUST_EXTRA_MEMBER', 'TRUST', 'Paid extra member', 'A sharer can stay, as a paying member outside the home', ['TRUST_DEVICE_CHECK'], 25_000_000, [20, 30], 125_000, [0, 0, 0],
        { sideLine: true, debt: 1, extraMemberShare: [.35, .4, .45] }),

    /* Phase 4 #59: Smart AI. The recommendations ladder stands for the Recommendations level (the
       Audience Intelligence the crisis engine, Product Lab and promotion read); its best step lifts
       how many of a cohort's accounts find something to watch, and Because you watched onwards keeps
       viewers. Side lines: Autoplay and previews (more of each title, more rewatches), AI channels and
       Voice search (a little more watching each). */
    tech('AI_TRENDING', 'SMART_AI', 'Trending rows', 'Top 10 and new-this-week rows, the same for everyone', [], 0, [5, 10], 0, [0, 0, 0],
        { starter: true, engine: { branch: 'DATA_RECOMMENDATIONS', points: [0, 3, 6] }, aiLift: [0, .01, .02] }),
    tech('AI_BECAUSE', 'SMART_AI', 'Because you watched', 'Rows built from what each viewer finished', ['AI_TRENDING'], 8_000_000, [10, 15], 40_000, [0, 0, 0],
        { debt: 1, engine: { branch: 'DATA_RECOMMENDATIONS', points: [10, 12, 14] }, aiLift: [.04, .05, .06], churnCut: [.0004, .0005, .0006] }),
    tech('AI_ARTWORK', 'SMART_AI', 'Personal artwork and trailers', 'Each viewer sees the poster and trailer most likely to win them over', ['AI_BECAUSE'], 25_000_000, [30, 50], 125_000, [0, 0, 0],
        { debt: 2, engine: { branch: 'DATA_RECOMMENDATIONS', points: [24, 27, 30] }, aiLift: [.07, .08, .09], churnCut: [.0006, .0007, .0008] }),
    tech('AI_TASTE', 'SMART_AI', 'Taste engine', 'Knows what a viewer wants tonight before they do', ['AI_ARTWORK'], 150_000_000, [140, 200], 750_000, [0, 0, 0],
        { futuristic: true, debt: 4, engine: { branch: 'DATA_RECOMMENDATIONS', points: [45, 50, 55] }, aiLift: [.11, .12, .13], churnCut: [.001, .0011, .0012] }),
    tech('AI_AUTOPLAY', 'SMART_AI', 'Autoplay and previews', 'The next episode starts on its own, and previews play while viewers browse', ['AI_TRENDING'], 6_000_000, [10, 15], 30_000, [0, 0, 0],
        { sideLine: true, completionLift: [.04, .05, .06], repeatLift: [.01, .015, .02] }),
    tech('AI_CHANNELS', 'SMART_AI', 'AI channels', 'Always-on channels built from each viewer\'s taste', ['AI_BECAUSE'], 20_000_000, [30, 40], 100_000, [0, 0, 0],
        { sideLine: true, debt: 1, aiLift: [.02, .025, .03] }),
    tech('AI_VOICE', 'SMART_AI', 'Voice search', 'Say a title, an actor or a mood to the remote', ['AI_TRENDING', 'APPS_TV'], 5_000_000, [10, 15], 25_000, [0, 0, 0],
        { sideLine: true, aiLift: [.01, .015, .02] }),

    /* Phase 4 #60: Profiles and family. Profiles and screens is how many screens at once a plan can
       sell: 2, then 4 and 6 with energy (two and four needed Reliability 10 and 35 before). Kids
       profiles and parental controls and Watch party draw family households and stand for Product
       Experience. No starter: a new service sells one screen, as it did. */
    tech('FAM_SCREENS', 'FAMILY', 'Profiles and screens', 'A profile for everyone in the home, and more screens at once', [], 5_000_000, [15, 25], 30_000, [0, 0, 0],
        { debt: 1, versionNames: ['2 screens', '4 screens', '6 screens'], screens: [2, 4, 6] }),
    tech('FAM_KIDS', 'FAMILY', 'Kids profiles and parental controls', 'A safe space for children, with the limits parents set', ['FAM_SCREENS'], 10_000_000, [10, 15], 50_000, [0, 0, 0],
        { sideLine: true, debt: 1, familyAppeal: [8, 10, 12], engine: { branch: 'PRODUCT_EXPERIENCE', points: [5, 6, 7] } }),
    tech('FAM_WATCH_PARTY', 'FAMILY', 'Watch party', 'Watch together from different homes, in sync, with chat', ['FAM_SCREENS'], 6_000_000, [10, 15], 30_000, [0, 0, 0],
        { sideLine: true, familyAppeal: [3, 4, 5], engine: { branch: 'PRODUCT_EXPERIENCE', points: [3, 4, 5] } }),

    /* Phase 4 #61: Ads tech. The targeting ladder stands for Commerce (the audience quality advertisers
       pay for: a bigger share of each market's ad budget, at a better rate); Product Lab launches still
       raise it too. Smarter ad breaks keeps viewers through long breaks and minds them less; New ad
       formats sells more slots an hour at the same ad minutes. */
    tech('ADS_BASIC', 'ADS', 'Basic ad server', 'The same ads for every viewer, in every break', [], 0, [5, 10], 0, [0, 0, 0],
        { starter: true, engine: { branch: 'ADVERTISING_COMMERCE', points: [0, 3, 6] } }),
    tech('ADS_CONTEXTUAL', 'ADS', 'Contextual targeting', 'Ads that fit the title and the moment', ['ADS_BASIC'], 6_000_000, [10, 15], 30_000, [0, 0, 0],
        { debt: 1, engine: { branch: 'ADVERTISING_COMMERCE', points: [12, 15, 18] } }),
    tech('ADS_AUDIENCE', 'ADS', 'Audience targeting', 'Ads chosen for who is watching', ['ADS_CONTEXTUAL'], 20_000_000, [30, 50], 100_000, [0, 0, 0],
        { debt: 2, engine: { branch: 'ADVERTISING_COMMERCE', points: [30, 34, 38] } }),
    tech('ADS_PRECISION', 'ADS', 'Precision targeting', 'Each ad bought for one household, live', ['ADS_AUDIENCE'], 60_000_000, [100, 140], 300_000, [0, 0, 0],
        { debt: 3, engine: { branch: 'ADVERTISING_COMMERCE', points: [50, 55, 60] } }),
    tech('ADS_AI', 'ADS', 'AI ad matching', 'Every break built for the viewer in front of it', ['ADS_PRECISION'], 150_000_000, [140, 200], 750_000, [0, 0, 0],
        { futuristic: true, debt: 4, engine: { branch: 'ADVERTISING_COMMERCE', points: [75, 80, 85] } }),
    tech('ADS_BREAKS', 'ADS', 'Smarter ad breaks', 'Breaks placed at natural pauses, never mid-scene', ['ADS_BASIC'], 8_000_000, [10, 15], 40_000, [0, 0, 0],
        { sideLine: true, breakSlope: [.7, .55, .4], adAnnoyance: [.9, .85, .8] }),
    tech('ADS_FORMATS', 'ADS', 'New ad formats', 'Pause ads, shoppable ads and sponsored moments', ['ADS_CONTEXTUAL'], 15_000_000, [30, 40], 75_000, [0, 0, 0],
        { sideLine: true, debt: 1, adSlots: [1.1, 1.15, 1.2] }),
];

const DEFINITION_BY_ID = new Map(STREAMING_TECH_DEFINITIONS.map(item => [item.id, item]));
const TECH_IDS = new Set<string>(STREAMING_TECH_DEFINITIONS.map(item => item.id));

export const getStreamingTechDefinition = (id: StreamingTechId): StreamingTechDefinition | undefined => DEFINITION_BY_ID.get(id);
export const isStreamingTechId = (value: unknown): value is StreamingTechId => typeof value === 'string' && TECH_IDS.has(value);

/** A group's techs in ladder order: main ladder first, side lines after. */
export const getStreamingTechGroupLadder = (group: StreamingTechGroupId): StreamingTechDefinition[] => {
    const items = STREAMING_TECH_DEFINITIONS.filter(item => item.group === group);
    return [...items.filter(item => !item.sideLine), ...items.filter(item => item.sideLine)];
};

export const getStreamingTechGroup = (group: StreamingTechGroupId): StreamingTechGroupDefinition => (
    STREAMING_TECH_GROUPS.find(item => item.id === group) || STREAMING_TECH_GROUPS[0]
);

/** A step's names for versions 1–3: its own (Profiles and screens: "2 screens" …, #60), else its group's. */
export const getStreamingTechVersionNames = (id: StreamingTechId): [string, string, string] => {
    const definition = DEFINITION_BY_ID.get(id);
    return definition?.versionNames || getStreamingTechGroup(definition?.group || 'PICTURE').versionNames;
};

/** 0 when locked, else the version reached. */
export const streamingTechVersion = (tree: OwnedStreamingTechTreeState | undefined, id: StreamingTechId): 0 | StreamingTechVersion => (
    tree?.techs[id]?.version ?? 0
);

/** Energy needed for the version after `version`; null when version 3 is reached. */
export const streamingTechNextVersionEnergy = (definition: StreamingTechDefinition, version: 0 | StreamingTechVersion): number | null => (
    version === 1 ? definition.versionEnergy[0] : version === 2 ? definition.versionEnergy[1] : null
);

/**
 * What a version costs from the treasury besides its energy (#84; Zeesh 2026-10-30: "version badhate ho sirf energy
 * maangta hai to wo paisa bhi maangna chahiye"): 40% of the step's unlock price for version 2 and 70% for version 3; a
 * starter, free to unlock, $1M and $2M. Version 1 is the unlock itself (0 here).
 */
export const STREAMING_TECH_VERSION_COST_SHARE = { 2: .4, 3: .7 } as const;
export const STREAMING_TECH_STARTER_VERSION_COST = { 2: 1_000_000, 3: 2_000_000 } as const;
export const streamingTechVersionCost = (definition: StreamingTechDefinition, version: 0 | StreamingTechVersion | null): number => {
    if (version !== 2 && version !== 3) return 0;
    return definition.unlockCost > 0
        ? Math.round(definition.unlockCost * STREAMING_TECH_VERSION_COST_SHARE[version])
        : STREAMING_TECH_STARTER_VERSION_COST[version];
};

/** The techs still needed before `definition` can be unlocked. */
export const getStreamingTechMissingRequirements = (
    tree: OwnedStreamingTechTreeState | undefined,
    definition: StreamingTechDefinition,
): StreamingTechDefinition[] => definition.requires
    .filter(id => streamingTechVersion(tree, id) < 1)
    .map(id => DEFINITION_BY_ID.get(id))
    .filter((item): item is StreamingTechDefinition => Boolean(item));

/**
 * The weekly bill for every tech the platform bought. Starters are free, and so are techs it
 * was given (converted from an old save's level or arriving with an acquisition): what runs
 * them is already in what that save pays (its campus projects, the acquisition's costs).
 */
export const getStreamingTechTreeWeeklyUpkeep = (tree: OwnedStreamingTechTreeState | undefined): number => (
    STREAMING_TECH_DEFINITIONS.reduce((sum, item) => {
        const owned = tree?.techs[item.id];
        return sum + (owned && owned.version >= 1 && !owned.granted ? item.weeklyUpkeep : 0);
    }, 0)
);

/** The highest owned step of a ladder (side lines excluded). */
const bestOwned = (tree: OwnedStreamingTechTreeState | undefined, group: StreamingTechGroupId): StreamingTechDefinition | null => {
    const owned = getStreamingTechGroupLadder(group).filter(item => !item.sideLine && streamingTechVersion(tree, item.id) >= 1);
    return owned.length ? owned[owned.length - 1] : null;
};

const pointsOf = (tree: OwnedStreamingTechTreeState | undefined, definition: StreamingTechDefinition | null | undefined): number => {
    if (!definition) return 0;
    const version = streamingTechVersion(tree, definition.id);
    return version >= 1 ? definition.playbackPoints[version - 1] : 0;
};

/**
 * The Playback Quality level the tree stands for: the best picture, plus the best HDR,
 * colour and sound steps, plus Clear dialogue. 1080p v1 alone is 20 and 4K v1 alone is
 * 55, the levels the old plan features needed.
 */
export const deriveStreamingTechPlaybackLevel = (tree: OwnedStreamingTechTreeState | undefined): number => Math.max(0, Math.min(100, Math.round(
    pointsOf(tree, bestOwned(tree, 'PICTURE'))
    + pointsOf(tree, bestOwned(tree, 'HDR'))
    + pointsOf(tree, bestOwned(tree, 'COLOUR'))
    + pointsOf(tree, bestOwned(tree, 'SOUND'))
    + pointsOf(tree, DEFINITION_BY_ID.get('SOUND_CLEAR_DIALOGUE'))
    // #85: phones on mobile data and older TVs still get the older steps, better at each version
    + STREAMING_TECH_OLDER_VERSION.playbackPoints * (['PICTURE', 'HDR', 'COLOUR', 'SOUND'] as StreamingTechGroupId[])
        .reduce((sum, group) => sum + streamingTechOlderVersions(tree, group), 0),
)));

/**
 * The engine levels raised to what the tree stands for (never lowered): Playback Quality from
 * Picture, HDR, Colour and Sound, Delivery from Optimisation, Reliability from Stabilization,
 * Product Experience from Playback's side lines and Apps and devices (#52).
 */
export const applyStreamingTechBridge = (
    levels: Record<StreamingTechnologyBranch, number>,
    tree: OwnedStreamingTechTreeState | undefined,
): Record<StreamingTechnologyBranch, number> => {
    const derived: Partial<Record<StreamingTechnologyBranch, number>> = {
        PLAYBACK_QUALITY: deriveStreamingTechPlaybackLevel(tree),
        DELIVERY_CAPACITY: deriveStreamingTechEngineLevel(tree, 'DELIVERY_CAPACITY'),
        RELIABILITY: deriveStreamingTechEngineLevel(tree, 'RELIABILITY'),
        PRODUCT_EXPERIENCE: deriveStreamingTechEngineLevel(tree, 'PRODUCT_EXPERIENCE'),
        SECURITY: deriveStreamingTechEngineLevel(tree, 'SECURITY'),
        DATA_RECOMMENDATIONS: deriveStreamingTechEngineLevel(tree, 'DATA_RECOMMENDATIONS'),
        ADVERTISING_COMMERCE: deriveStreamingTechEngineLevel(tree, 'ADVERTISING_COMMERCE'),
    };
    const raised = (Object.keys(derived) as StreamingTechnologyBranch[]).filter(branch => (derived[branch] || 0) > (levels[branch] || 0));
    return raised.length ? { ...levels, ...Object.fromEntries(raised.map(branch => [branch, derived[branch]])) } : levels;
};

/* ── Optimisation, Stabilization and tech debt (Phase 2) ── */

const factorOf = (tree: OwnedStreamingTechTreeState | undefined, definition: StreamingTechDefinition, key: 'loadFactor' | 'costFactor' | 'overloadFactor'): number => {
    const version = streamingTechVersion(tree, definition.id);
    const factors = definition[key];
    return version >= 1 && factors ? factors[version - 1] : 1;
};

/** The best owned step of a group's main ladder, and every owned side line. */
const ownedOf = (tree: OwnedStreamingTechTreeState | undefined, group: StreamingTechGroupId) => {
    const ladder = getStreamingTechGroupLadder(group);
    const main = ladder.filter(item => !item.sideLine && streamingTechVersion(tree, item.id) >= 1).at(-1) || null;
    const sides = ladder.filter(item => item.sideLine && streamingTechVersion(tree, item.id) >= 1);
    return { main, sides };
};

/**
 * #85 (Zeesh 2026-10-30: "koi upgrade bekaar na ho to saara jo version up hai wo kuch asar daale, jo dikhe"): the versions
 * past version 1 of a group's main steps below its best one. Those steps keep a job once a better one arrives (phones and
 * older TVs, back-up layers, the cheaper ad slots), so each such version still adds a little (STREAMING_TECH_OLDER_VERSION).
 * At version 1 they add nothing, so a tree that never raised an older step works exactly as before.
 */
export const streamingTechOlderVersions = (tree: OwnedStreamingTechTreeState | undefined, group: StreamingTechGroupId): number => {
    const { main } = ownedOf(tree, group);
    if (!main) return 0;
    return getStreamingTechGroupLadder(group)
        .filter(item => !item.sideLine && item.id !== main.id)
        .reduce((sum, item) => sum + Math.max(0, streamingTechVersion(tree, item.id) - 1), 0);
};
/** What each older version adds (#85). */
export const STREAMING_TECH_OLDER_VERSION = {
    /** Picture, HDR, Colour, Sound: Playback Quality points */
    playbackPoints: 1,
    /** Optimisation: the share of load and of the bandwidth bill it cuts */
    loadCut: .015,
    /** Stabilization: debt paid a week */
    paydown: .5,
    /** Trust and safety: the share of leak risk it cuts */
    leakCut: .02,
    /** Smart AI: viewers who find something to watch */
    aiLift: .005,
    /** Optimisation, Stabilization, Apps, Trust, Smart AI, Ads: points of the engine level the group stands for */
    enginePoints: 1,
    /** Ads tech: the share of how much viewers mind ads it cuts */
    adAnnoyanceCut: .01,
} as const;
/** the groups whose best main step counts, whose older steps get the engine points */
const OLDER_ENGINE_GROUPS: StreamingTechGroupId[] = ['OPTIMISATION', 'STABILIZATION', 'APPS', 'TRUST', 'SMART_AI', 'ADS'];

/** What a viewer's load is multiplied by: the best codec owned times every Optimisation side line. */
export const streamingTechLoadFactor = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main, sides } = ownedOf(tree, 'OPTIMISATION');
    // #85: the TVs that cannot play the best codec still stream an older one, made lighter by its versions
    const older = Math.max(.5, 1 - STREAMING_TECH_OLDER_VERSION.loadCut * streamingTechOlderVersions(tree, 'OPTIMISATION'));
    return [main, ...sides].reduce((product, item) => product * (item ? factorOf(tree, item, 'loadFactor') : 1), older);
};

/** What a viewer's streaming cost is multiplied by (Edge cache cuts cost more than load). */
export const streamingTechCostFactor = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main, sides } = ownedOf(tree, 'OPTIMISATION');
    const older = Math.max(.5, 1 - STREAMING_TECH_OLDER_VERSION.loadCut * streamingTechOlderVersions(tree, 'OPTIMISATION'));
    return [main, ...sides].reduce((product, item) => product * (item ? factorOf(tree, item, 'costFactor') : 1), older);
};

/** The share of an overload's harm that is left (Load testing, and Playback's No buffering since #52). */
export const streamingTechOverloadFactor = (tree: OwnedStreamingTechTreeState | undefined): number => (
    [...getStreamingTechGroupLadder('STABILIZATION'), ...getStreamingTechGroupLadder('PLAYBACK')]
        .reduce((product, item) => product * factorOf(tree, item, 'overloadFactor'), 1)
);

/** Points Playback adds to the week's playback success (#52): every owned step's boost at its version. */
export const streamingTechPlaybackBoost = (tree: OwnedStreamingTechTreeState | undefined): number => (
    Math.round(getStreamingTechGroupLadder('PLAYBACK').reduce((sum, item) => {
        const version = streamingTechVersion(tree, item.id);
        return sum + (version >= 1 && item.playbackBoost ? item.playbackBoost[version - 1] : 0);
    }, 0) * 100) / 100
);

/** Plans can offer downloads once Playback's Downloads is unlocked (#52; it was Product Experience 25). */
export const streamingTechDownloadsAllowed = (tree: OwnedStreamingTechTreeState | undefined): boolean => streamingTechVersion(tree, 'PLAY_DOWNLOADS') >= 1;

/* ── what Playback and Apps do for viewers (#53) ── */

const sumOverGroup = (tree: OwnedStreamingTechTreeState | undefined, group: StreamingTechGroupId, key: 'churnCut' | 'habitAppeal'): number => (
    getStreamingTechGroupLadder(group).reduce((sum, item) => {
        const version = streamingTechVersion(tree, item.id);
        const values = item[key];
        return sum + (version >= 1 && values ? values[version - 1] : 0);
    }, 0)
);

/** Weekly churn the tree takes off the player's rate: Playback's steps (#53), Safe payments (#54) and
 *  Smart AI's best recommendations step (#59). */
export const streamingTechChurnCut = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main } = ownedOf(tree, 'SMART_AI');
    const version = main ? streamingTechVersion(tree, main.id) : 0;
    const smartAi = main?.churnCut && version >= 1 ? main.churnCut[version - 1] : 0;
    return Math.round((sumOverGroup(tree, 'PLAYBACK', 'churnCut') + sumOverGroup(tree, 'TRUST', 'churnCut') + smartAi) * 100_000) / 100_000;
};

/** What Smart AI does to viewing (#59): the share more of a cohort's accounts that find something to
 *  watch (the best recommendations step, plus AI channels and Voice search), and the points of
 *  completion and repeat viewing Autoplay and previews adds. Nothing past the starter: all 0. */
export interface StreamingTechSmartAiEffects { engagementLift: number; completionLift: number; repeatLift: number }
export const streamingTechSmartAiEffects = (
    tree: OwnedStreamingTechTreeState | undefined,
    /** #62: a plan that turns AI channels or Autoplay off gives its viewers neither */
    plan: { aiChannels: boolean; autoplay: boolean } = { aiChannels: true, autoplay: true },
): StreamingTechSmartAiEffects => {
    const { main } = ownedOf(tree, 'SMART_AI');
    const sides = ownedOf(tree, 'SMART_AI').sides.filter(item => (item.id !== 'AI_CHANNELS' || plan.aiChannels) && (item.id !== 'AI_AUTOPLAY' || plan.autoplay));
    const at = (item: StreamingTechDefinition | null, key: 'aiLift' | 'completionLift' | 'repeatLift'): number => {
        const version = item ? streamingTechVersion(tree, item.id) : 0;
        const values = item?.[key];
        return version >= 1 && values ? values[version - 1] : 0;
    };
    const round = (value: number) => Math.round(value * 10_000) / 10_000;
    return {
        // #85: an older recommendations row stays on the home screen under the best one
        engagementLift: round(at(main, 'aiLift') + sides.reduce((sum, item) => sum + at(item, 'aiLift'), 0)
            + STREAMING_TECH_OLDER_VERSION.aiLift * streamingTechOlderVersions(tree, 'SMART_AI')),
        completionLift: round(sides.reduce((sum, item) => sum + at(item, 'completionLift'), 0)),
        repeatLift: round(sides.reduce((sum, item) => sum + at(item, 'repeatLift'), 0)),
    };
};

/** The most screens at once a plan can sell (#60): Profiles and screens' version (2, 4 or 6), else 1. */
export const streamingTechScreens = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const definition = DEFINITION_BY_ID.get('FAM_SCREENS');
    const version = streamingTechVersion(tree, 'FAM_SCREENS');
    return version >= 1 && definition?.screens ? definition.screens[version - 1] : 1;
};

/** What Ads tech does to the player's ad breaks (#61): ad slots an hour (New ad formats), the share of
 *  the viewers lost per ad minute past six that are still lost, and of what ads cost a plan with
 *  viewers (Smarter ad breaks). Neither owned: 1, 1, 1. */
export interface StreamingTechAdEffects { slots: number; breakSlope: number; annoyance: number }
export const streamingTechAdEffects = (tree: OwnedStreamingTechTreeState | undefined): StreamingTechAdEffects => {
    const at = (id: StreamingTechId, key: 'adSlots' | 'breakSlope' | 'adAnnoyance'): number => {
        const version = streamingTechVersion(tree, id);
        const values = DEFINITION_BY_ID.get(id)?.[key];
        return version >= 1 && values ? values[version - 1] : 1;
    };
    // #85: better-matched ads annoy viewers less at each version of the best targeting step, and a little for each version
    // past 1 of an older one (its Commerce points can sit under a level Product Lab launches already raised)
    const { main } = ownedOf(tree, 'ADS');
    const version = main ? streamingTechVersion(tree, main.id) : 0;
    const targeting = (version >= 1 ? STREAMING_TECH_TARGETING_ANNOYANCE[version - 1] : 1)
        * Math.max(.5, 1 - STREAMING_TECH_OLDER_VERSION.adAnnoyanceCut * streamingTechOlderVersions(tree, 'ADS'));
    return { slots: at('ADS_FORMATS', 'adSlots'), breakSlope: at('ADS_BREAKS', 'breakSlope'), annoyance: Math.round(at('ADS_BREAKS', 'adAnnoyance') * targeting * 10_000) / 10_000 };
};
/** #85: what the best ad targeting step's version leaves of how much viewers mind ads (version 1 changes nothing) */
export const STREAMING_TECH_TARGETING_ANNOYANCE: [number, number, number] = [1, .98, .96];

/** Appeal to family households from Kids profiles alone (#62: on the plans that include them). Not owned: 0. */
export const streamingTechKidsAppeal = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const version = streamingTechVersion(tree, 'FAM_KIDS');
    const values = DEFINITION_BY_ID.get('FAM_KIDS')?.familyAppeal;
    return version >= 1 && values ? values[version - 1] : 0;
};

/** Appeal to family households (#60): Kids profiles and Watch party at their versions. None owned: 0. */
export const streamingTechFamilyAppeal = (tree: OwnedStreamingTechTreeState | undefined): number => (
    Math.round(getStreamingTechGroupLadder('FAMILY').reduce((sum, item) => {
        const version = streamingTechVersion(tree, item.id);
        return sum + (version >= 1 && item.familyAppeal ? item.familyAppeal[version - 1] : 0);
    }, 0) * 100) / 100
);

/** How likely a title leaks, against a service with DRM alone (#54): the best Content protection step's factor. */
export const streamingTechLeakFactor = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main } = ownedOf(tree, 'TRUST');
    const version = main ? streamingTechVersion(tree, main.id) : 0;
    // #85: an older protection layer still stops some copies
    const older = Math.max(.5, 1 - STREAMING_TECH_OLDER_VERSION.leakCut * streamingTechOlderVersions(tree, 'TRUST'));
    return (main?.leakFactor && version >= 1 ? main.leakFactor[version - 1] : 1) * older;
};

/** How long a takedown of a pirated title takes against the usual weeks (#55): the Takedown network
 *  halves it, the AI hunter cuts it to under a third; without either, 1. */
export const streamingTechTakedownSpeed = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main } = ownedOf(tree, 'TRUST');
    const version = main ? streamingTechVersion(tree, main.id) : 0;
    return main?.takedownFactor && version >= 1 ? main.takedownFactor[version - 1] : 1;
};

/** The share of household piracy of the player's titles Content protection stops (#55): 1 − its leak
 *  factor, so DRM alone stops none and the AI hunter at Fortress four in five. */
export const streamingTechPiracyProtection = (tree: OwnedStreamingTechTreeState | undefined): number => (
    Math.round((1 - streamingTechLeakFactor(tree)) * 100) / 100
);

/** The best Content protection step owned and its version (#55: a leak's cause names it). */
export const streamingTechTrustMain = (tree: OwnedStreamingTechTreeState | undefined): { id: StreamingTechId; name: string; version: number } | null => {
    const { main } = ownedOf(tree, 'TRUST');
    return main ? { id: main.id, name: main.name, version: streamingTechVersion(tree, main.id) } : null;
};

const sideFactor = (tree: OwnedStreamingTechTreeState | undefined, id: StreamingTechId, key: 'breachFactor' | 'scrutinyFactor' | 'crackdownFactor' | 'sharingFactor'): number => {
    const version = streamingTechVersion(tree, id);
    const values = DEFINITION_BY_ID.get(id)?.[key];
    return version >= 1 && values ? values[version - 1] : 1;
};
/** How likely an account breach is (#54): Account security's factor, 1 without it. */
export const streamingTechBreachFactor = (tree: OwnedStreamingTechTreeState | undefined): number => sideFactor(tree, 'TRUST_ACCOUNT', 'breachFactor');
/** The share of a crisis's scrutiny that reaches the regulator (#54): Privacy's factor, 1 without it. */
export const streamingTechScrutinyFactor = (tree: OwnedStreamingTechTreeState | undefined): number => sideFactor(tree, 'TRUST_PRIVACY', 'scrutinyFactor');

/* Sharing control (#56): what the sharing policy (Offer tab) does is changed by the tree. */
/** The share of a crackdown's extra cancellations (Household only, Aggressive) left: Household detection's factor, 1 without it. */
export const streamingTechCrackdownFactor = (tree: OwnedStreamingTechTreeState | undefined): number => sideFactor(tree, 'TRUST_HOUSEHOLD', 'crackdownFactor');
/** What outside homes watching on the player's accounts are multiplied by: Device check's factor, 1 without it. */
export const streamingTechSharingFactor = (tree: OwnedStreamingTechTreeState | undefined): number => sideFactor(tree, 'TRUST_DEVICE_CHECK', 'sharingFactor');
/** Of the sharers the rules turn away, the share who pay to stay as an extra member: Paid extra member's, 0 without it. */
export const streamingTechExtraMemberShare = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const version = streamingTechVersion(tree, 'TRUST_EXTRA_MEMBER');
    const values = DEFINITION_BY_ID.get('TRUST_EXTRA_MEMBER')?.extraMemberShare;
    return version >= 1 && values ? values[version - 1] : 0;
};
/** A plan may sell Extra member once Paid extra member is unlocked (#56; it needed Commerce level 30). */
export const streamingTechExtraMemberAllowed = (tree: OwnedStreamingTechTreeState | undefined): boolean => streamingTechVersion(tree, 'TRUST_EXTRA_MEMBER') >= 1;
/** The three Sharing control steps, in ladder order. */
export const STREAMING_SHARING_CONTROL_IDS: StreamingTechId[] = ['TRUST_HOUSEHOLD', 'TRUST_DEVICE_CHECK', 'TRUST_EXTRA_MEMBER'];

/** Weekly churn Playback takes off the player's rate: every owned step's cut at its version (0.0025 = 0.25 points). */
export const streamingTechPlaybackChurnCut = (tree: OwnedStreamingTechTreeState | undefined): number => (
    Math.round(sumOverGroup(tree, 'PLAYBACK', 'churnCut') * 100_000) / 100_000
);

/** What Playback adds to a Habit streamer's appeal: every owned step's points at its version. */
export const streamingTechHabitAppeal = (tree: OwnedStreamingTechTreeState | undefined): number => (
    Math.round(sumOverGroup(tree, 'PLAYBACK', 'habitAppeal') * 100) / 100
);

/** The extra share of homes that can watch: the best Apps step's reach at its version (phone and web only: 0). */
export const streamingTechDeviceReach = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main } = ownedOf(tree, 'APPS');
    const version = main ? streamingTechVersion(tree, main.id) : 0;
    return main?.deviceReach && version >= 1 ? main.deviceReach[version - 1] : 0;
};

/** How likely an owned app or Playback feature is to break, by its version: Basic 1, then 0.6, then 0.3. */
export const FRAGILITY: [number, number, number] = [1, .6, .3];

/**
 * What can break, each with its weight (#53): every owned app (all of them, not only the best: each
 * is a separate app viewers use) for an app crash, every owned Playback side line for a broken
 * feature. Higher versions break less.
 */
export const streamingTechIncidentTargets = (
    tree: OwnedStreamingTechTreeState | undefined,
    kind: 'APP_CRASH' | 'FEATURE_BROKEN',
): Array<{ id: StreamingTechId; name: string; version: StreamingTechVersion; weight: number }> => (
    getStreamingTechGroupLadder(kind === 'APP_CRASH' ? 'APPS' : 'PLAYBACK')
        .filter(item => (kind === 'APP_CRASH' ? !item.sideLine : item.sideLine) && streamingTechVersion(tree, item.id) >= 1)
        .map(item => {
            const version = streamingTechVersion(tree, item.id) as StreamingTechVersion;
            return { id: item.id, name: item.name, version, weight: FRAGILITY[version - 1] };
        })
);

/** How far a group's main ladder has climbed (#74): 0 at its start step's version 1, 1 at its last step's
 *  version 3; without a step, 0. */
export const streamingTechLadderProgress = (tree: OwnedStreamingTechTreeState | undefined, group: StreamingTechGroupId): number => {
    const mains = getStreamingTechGroupLadder(group).filter(item => !item.sideLine);
    const { main } = ownedOf(tree, group);
    if (!main || !mains.length) return 0;
    const position = mains.findIndex(item => item.id === main.id) * 3 + streamingTechVersion(tree, main.id) - 1;
    return Math.max(0, Math.min(1, position / Math.max(1, mains.length * 3 - 1)));
};

/** Tech debt paid down a week: the best Stabilization step's rate plus its side line's. */
export const streamingTechDebtPaydown = (tree: OwnedStreamingTechTreeState | undefined): number => {
    const { main, sides } = ownedOf(tree, 'STABILIZATION');
    return [main, ...sides].reduce((sum, item) => {
        if (!item?.debtPaydown) return sum;
        const version = streamingTechVersion(tree, item.id);
        return sum + (version >= 1 ? item.debtPaydown[version - 1] : 0);
    // #85: an older layer still catches what the best one misses
    }, STREAMING_TECH_OLDER_VERSION.paydown * streamingTechOlderVersions(tree, 'STABILIZATION'));
};

/** Debt a step adds: its debt when unlocked, half of it (rounded up) at each version reached. */
export const streamingTechDebtFor = (definition: StreamingTechDefinition, version: StreamingTechVersion): number => {
    const debt = definition.debt || 0;
    return version === 1 ? debt : Math.ceil(debt / 2);
};

/** The tree's own debt never goes past this (campus debt in the infrastructure is separate). */
export const STREAMING_TECH_DEBT_CEILING = 100;
export const resolveStreamingTechDebt = (tree: OwnedStreamingTechTreeState | undefined): number => (
    Math.max(0, Math.min(STREAMING_TECH_DEBT_CEILING, Number(tree?.debt) || 0))
);

const roundDebt = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;

/** The tree after a tech move adds `amount` debt (capped at the ceiling). */
export const addStreamingTechDebt = (tree: OwnedStreamingTechTreeState, amount: number): OwnedStreamingTechTreeState => {
    const debt = roundDebt(Math.min(STREAMING_TECH_DEBT_CEILING, resolveStreamingTechDebt(tree) + Math.max(0, amount)));
    const { debt: _previous, debtPaidAtAbsoluteWeek, ...rest } = tree;
    return {
        ...rest,
        ...(debt > 0 ? { debt } : {}),
        ...(debtPaidAtAbsoluteWeek !== undefined ? { debtPaidAtAbsoluteWeek } : {}),
    };
};

/**
 * A platform's tech debt, the figure the engine and the rooms read: the tree's own debt plus
 * what campus builds and acquisitions left in the infrastructure (`infrastructureSetup.technicalDebt`).
 * A save from before Phase 2 has no tree debt, so its figure is unchanged.
 */
export const resolveStreamingPlatformTechDebt = (platform: unknown): number => {
    const record = (platform && typeof platform === 'object' ? platform : {}) as Record<string, unknown>;
    const setup = (record.infrastructureSetup && typeof record.infrastructureSetup === 'object'
        ? record.infrastructureSetup : {}) as Record<string, unknown>;
    const infrastructure = Math.max(0, Number(setup.technicalDebt) || 0);
    const tree = record.techTree && typeof record.techTree === 'object' ? record.techTree as Record<string, unknown> : {};
    return roundDebt(infrastructure + Math.max(0, Math.min(STREAMING_TECH_DEBT_CEILING, Number(tree.debt) || 0)));
};

/**
 * One week of Stabilization paydown (the weekly close, once a week): the tree's own debt
 * first, then the infrastructure's. Returns both, and what was paid.
 */
export const payDownStreamingTechDebt = (
    tree: OwnedStreamingTechTreeState,
    infrastructureDebt: number,
    absoluteWeek: number,
): { tree: OwnedStreamingTechTreeState; infrastructureDebt: number; paid: number } => {
    const infrastructure = Math.max(0, Number(infrastructureDebt) || 0);
    if (tree.debtPaidAtAbsoluteWeek !== undefined && tree.debtPaidAtAbsoluteWeek >= absoluteWeek) {
        return { tree, infrastructureDebt: infrastructure, paid: 0 };
    }
    const paydown = streamingTechDebtPaydown(tree);
    const owed = resolveStreamingTechDebt(tree);
    const fromTree = Math.min(owed, paydown);
    const fromInfrastructure = Math.min(infrastructure, paydown - fromTree);
    const debt = roundDebt(owed - fromTree);
    const { debt: _previous, debtPaidAtAbsoluteWeek: _paid, ...rest } = tree;
    return {
        tree: { ...rest, ...(debt > 0 ? { debt } : {}), debtPaidAtAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)) },
        infrastructureDebt: roundDebt(infrastructure - fromInfrastructure),
        paid: roundDebt(fromTree + fromInfrastructure),
    };
};

/** The groups an engine level is read from: the best main step of each, plus every owned side line. */
const ENGINE_GROUPS: Record<StreamingTechEngineBranch, StreamingTechGroupId[]> = {
    DELIVERY_CAPACITY: ['OPTIMISATION'],
    RELIABILITY: ['STABILIZATION'],
    PRODUCT_EXPERIENCE: ['PLAYBACK', 'APPS', 'FAMILY'],
    SECURITY: ['TRUST'],
    DATA_RECOMMENDATIONS: ['SMART_AI'],
    ADVERTISING_COMMERCE: ['ADS'],
};

/** The engine level the tree stands for: Delivery from Optimisation, Reliability from Stabilization, Product Experience from Playback and Apps (#52) and Profiles and family's side lines (#60). */
export const deriveStreamingTechEngineLevel = (
    tree: OwnedStreamingTechTreeState | undefined,
    branch: StreamingTechEngineBranch,
): number => {
    const points = ENGINE_GROUPS[branch].reduce((total, group) => {
        const { main, sides } = ownedOf(tree, group);
        // #85: each version past 1 of an older main step still adds a point to the level its group stands for
        const older = OLDER_ENGINE_GROUPS.includes(group) && main?.engine?.branch === branch
            ? STREAMING_TECH_OLDER_VERSION.enginePoints * streamingTechOlderVersions(tree, group) : 0;
        return total + older + [main, ...sides].reduce((sum, item) => {
            if (!item?.engine || item.engine.branch !== branch) return sum;
            const version = streamingTechVersion(tree, item.id);
            return sum + (version >= 1 ? item.engine.points[version - 1] : 0);
        }, 0);
    }, 0);
    return Math.max(0, Math.min(100, Math.round(points)));
};

/* ── plan features the tree gates (the plan builder of Phase 2 will offer every step) ── */

export type StreamingTechGatedFeature = 'hd' | 'uhd' | 'spatial';

export const STREAMING_TECH_FEATURE_REQUIREMENTS: Record<StreamingTechGatedFeature, StreamingTechId[]> = {
    hd: ['PICTURE_1080P'],
    /* studios license 4K and above only with strong DRM (#54) */
    uhd: ['PICTURE_4K', 'HDR_HDR', 'TRUST_STUDIO_DRM'],
    spatial: ['SOUND_SPATIAL'],
};

const isGatedFeature = (featureId: string): featureId is StreamingTechGatedFeature => (
    featureId === 'hd' || featureId === 'uhd' || featureId === 'spatial'
);

/** true when the feature is not tech-gated, or every tech it needs is unlocked. */
export const streamingTechFeatureAllowed = (tree: OwnedStreamingTechTreeState | undefined, featureId: string): boolean => (
    !isGatedFeature(featureId) || STREAMING_TECH_FEATURE_REQUIREMENTS[featureId].every(id => streamingTechVersion(tree, id) >= 1)
);

/** What the player still has to unlock, in words ("Unlock 4K and HDR in Tech"), or null. */
export const streamingTechFeatureLockReason = (tree: OwnedStreamingTechTreeState | undefined, featureId: string): string | null => {
    if (!isGatedFeature(featureId)) return null;
    const missing = STREAMING_TECH_FEATURE_REQUIREMENTS[featureId]
        .filter(id => streamingTechVersion(tree, id) < 1)
        .map(id => DEFINITION_BY_ID.get(id)?.name || id);
    if (!missing.length) return null;
    const words = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0];
    return `Unlock ${words} in Tech`;
};

/**
 * How good a tech-gated feature is at the versions reached: 1 at version 1, 1.2 at 2 and
 * 1.4 at 3, taking the weakest of the techs it needs. Plans offering the feature are worth
 * that much more to viewers.
 */
export const streamingTechFeatureQuality = (tree: OwnedStreamingTechTreeState | undefined, featureId: string): number => {
    if (!isGatedFeature(featureId)) return 1;
    // what the picture and sound are; Studio DRM (#54) gates 4K but does not make it look better
    const versions = STREAMING_TECH_FEATURE_REQUIREMENTS[featureId]
        .filter(id => DEFINITION_BY_ID.get(id)?.group !== 'TRUST')
        .map(id => streamingTechVersion(tree, id));
    const weakest = Math.min(...versions);
    return weakest >= 3 ? 1.4 : weakest === 2 ? 1.2 : 1;
};

/* ── rivals (plan §9) ── */

/**
 * A rival's tech in Phase 1: the steps its Playback level stands for, the level being the
 * higher of what it researched itself (the 5 core rivals) and its technology strength less 25.
 * Rivals at 80+ (Netflix, Disney+, Apple TV, Prime Video, YouTube…) offer 4K HDR; those at
 * 70–79 (Hulu, Crave, ITVX…) HD and Spatial audio. Rival styles and their own pace are Phase 5.
 */
export const resolveRivalStreamingTechTree = (technologyStrength: number, researchedPlayback = 0): OwnedStreamingTechTreeState => (
    convertStreamingTechTreeFromLevels(Math.max(Number(researchedPlayback) || 0, (Number(technologyStrength) || 0) - 25))
);

/** A rival plan's features, keeping only what its tech allows; a premium tier without 4K HDR still streams in HD. */
export const gateRivalStreamingPlanFeatures = (tree: OwnedStreamingTechTreeState, featureIds: string[]): string[] => {
    const kept: string[] = [];
    featureIds.forEach(id => {
        const next = streamingTechFeatureAllowed(tree, id) ? id
            : id === 'uhd' && streamingTechFeatureAllowed(tree, 'hd') ? 'hd' : null;
        if (next && !kept.includes(next)) kept.push(next);
    });
    return kept;
};

/* ── the save: normalising and converting pre-tree saves ── */

const finiteWeek = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const normalizeProgress = (definition: StreamingTechDefinition, raw: unknown): OwnedStreamingTechProgress | null => {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const versionRaw = Math.round(Number(record.version));
    if (!Number.isFinite(versionRaw) || versionRaw < 1) return null;
    const version = Math.min(3, versionRaw) as StreamingTechVersion;
    const nextEnergy = streamingTechNextVersionEnergy(definition, version);
    const progressRaw = Number(record.progress);
    // a full bar is kept: it waits for its version's price (#84), never reached on energy alone
    const progress = nextEnergy === null || !Number.isFinite(progressRaw)
        ? 0
        : Math.max(0, Math.min(nextEnergy, Math.round(progressRaw)));
    const unlockedAtAbsoluteWeek = finiteWeek(record.unlockedAtAbsoluteWeek);
    // A tech at week 0 that is not a starter came from converting an old save (#34 wrote no flag).
    const granted = record.granted === true || (unlockedAtAbsoluteWeek === 0 && !definition.starter);
    return {
        version,
        progress,
        unlockedAtAbsoluteWeek,
        versionReachedAtAbsoluteWeek: Number.isFinite(Number(record.versionReachedAtAbsoluteWeek))
            ? finiteWeek(record.versionReachedAtAbsoluteWeek)
            : unlockedAtAbsoluteWeek,
        ...(granted ? { granted: true as const } : {}),
    };
};

const starterProgress = (): OwnedStreamingTechProgress => ({ version: 1, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 });
const grantedProgress = (week: number, version: StreamingTechVersion = 1): OwnedStreamingTechProgress => (
    { version, progress: 0, unlockedAtAbsoluteWeek: week, versionReachedAtAbsoluteWeek: week, granted: true }
);

/** The engine levels a tree can be built from; a bare number is Playback Quality alone (rivals, a new company). */
export type StreamingTechSourceLevels = number | Partial<Record<'PLAYBACK_QUALITY' | StreamingTechEngineBranch, unknown>>;

const levelOf = (levels: StreamingTechSourceLevels, branch: 'PLAYBACK_QUALITY' | StreamingTechEngineBranch): number => {
    const raw = typeof levels === 'number' ? (branch === 'PLAYBACK_QUALITY' ? levels : 0) : Number(levels?.[branch]);
    return Number.isFinite(raw) ? raw : 0;
};

/**
 * The steps engine levels stand for. The starters always. From Playback Quality: 720p and
 * 1080p from 20; 5.1, 7.1 and Spatial 3D from 45; 4K, HDR and 10-bit from 55, the levels the
 * old plan features needed, so every feature a plan offered stays offered. From Delivery and
 * Reliability: each main Optimisation or Stabilization step whose version 1 the level reaches
 * (HEVC 20, AV1 40, next-gen codec 60; Auto-scaling 10, Redundancy 35, Chaos testing 50), so
 * two and four screens stay offered. From Product Experience (#52): Downloads from 25, the level
 * the plan feature needed, so downloads stay offered, then the best Apps step that fits in what is
 * left (Smart TV 15, Consoles 30), so what the tree stands for never lifts the level above where it
 * was. Playback's main steps are never given: what they add is new. From Security (#54): each main
 * Content protection step its version 1 reaches (Studio DRM 15, Watermarking 25, Takedown network
 * 45), and Studio DRM wherever Playback Quality stands for 4K (55), so a plan selling 4K keeps it.
 * From Reliability again (#60): Profiles and screens from 10, at 4 screens from 35 (`givenVersion`),
 * the levels two and four screens needed, so a plan selling them keeps them. From Recommendations
 * (#59) and Commerce (#61): each main Smart AI or Ad targeting step its version 1 reaches.
 * Futuristic steps are never given.
 */
const stepsForLevels = (levels: StreamingTechSourceLevels): Set<StreamingTechId> => {
    const owned = new Set<StreamingTechId>(STREAMING_TECH_DEFINITIONS.filter(item => item.starter).map(item => item.id));
    const playback = levelOf(levels, 'PLAYBACK_QUALITY');
    if (playback >= 20) ['PICTURE_720P', 'PICTURE_1080P'].forEach(id => owned.add(id as StreamingTechId));
    if (playback >= 45) ['SOUND_51', 'SOUND_71', 'SOUND_SPATIAL'].forEach(id => owned.add(id as StreamingTechId));
    if (playback >= 55) ['PICTURE_4K', 'HDR_HDR', 'COLOUR_10BIT', 'TRUST_STUDIO_DRM'].forEach(id => owned.add(id as StreamingTechId));
    (['DELIVERY_CAPACITY', 'RELIABILITY', 'SECURITY', 'DATA_RECOMMENDATIONS', 'ADVERTISING_COMMERCE'] as const).forEach(branch => {
        const level = levelOf(levels, branch);
        STREAMING_TECH_DEFINITIONS
            .filter(item => item.engine?.branch === branch && !item.sideLine && !item.starter && !item.futuristic && item.engine.points[0] <= level)
            .forEach(item => owned.add(item.id));
    });
    const product = levelOf(levels, 'PRODUCT_EXPERIENCE');
    const downloads = product >= 25;
    if (downloads) owned.add('PLAY_DOWNLOADS');
    const left = product - (downloads ? 25 : 0);
    getStreamingTechGroupLadder('APPS')
        .filter(item => !item.sideLine && !item.starter && !item.futuristic && item.engine && item.engine.points[0] <= left)
        .forEach(item => owned.add(item.id));
    if (levelOf(levels, 'RELIABILITY') >= 10) owned.add('FAM_SCREENS');
    return owned;
};

/** The version a step is given at: Profiles and screens at 4 screens (version 2) from Reliability 35 (#60), else 1. */
const givenVersion = (id: StreamingTechId, levels: StreamingTechSourceLevels): StreamingTechVersion => (
    id === 'FAM_SCREENS' && levelOf(levels, 'RELIABILITY') >= 35 ? 2 : 1
);

/** Trees written before Optimisation and Stabilization are schema 1, before Playback and Apps and
 *  devices schema 2, before Trust and safety schema 3, before Sharing control schema 4, before Smart
 *  AI schema 5, before Profiles and family schema 6, before Ads tech schema 7; normalising gives them
 *  the later steps once, from their levels (and for Sharing control, their plans). */
export const STREAMING_TECH_TREE_SCHEMA = 8;

/**
 * Whether a save sells Extra member (#56): any plan of its live service or of its Define the
 * Launch draft with the `extraseat` feature. Such a save is given Sharing control once, so its
 * plans keep Extra member now that the gate is Paid extra member, not Commerce level 30. Reads
 * plain records, so it works on a save before it is normalised.
 */
export const streamingPlatformSellsExtraMember = (platform: unknown): boolean => {
    const record = (platform && typeof platform === 'object' ? platform : {}) as Record<string, unknown>;
    const plansOf = (pricing: unknown): unknown[] => {
        const plans = pricing && typeof pricing === 'object' ? (pricing as Record<string, unknown>).plans : null;
        return Array.isArray(plans) ? plans : [];
    };
    const service = record.serviceConfiguration && typeof record.serviceConfiguration === 'object' ? record.serviceConfiguration as Record<string, unknown> : {};
    const program = record.launchProgram && typeof record.launchProgram === 'object' ? record.launchProgram as Record<string, unknown> : {};
    const draft = program.defineDraft && typeof program.defineDraft === 'object' ? program.defineDraft as Record<string, unknown> : {};
    return [...plansOf(service.pricing), ...plansOf(draft.pricing)].some(plan => {
        const features = plan && typeof plan === 'object' ? (plan as Record<string, unknown>).featureIds : null;
        return Array.isArray(features) && features.includes('extraseat');
    });
};

/** What a pre-tree save owns, from its engine levels (`stepsForLevels`), as given techs with no upkeep. */
export const convertStreamingTechTreeFromLevels = (levels: StreamingTechSourceLevels): OwnedStreamingTechTreeState => {
    const owned = stepsForLevels(levels);
    return {
        schemaVersion: STREAMING_TECH_TREE_SCHEMA,
        // In catalogue order, as normalising writes it, so a converted save normalises to the same bytes.
        techs: Object.fromEntries(STREAMING_TECH_DEFINITIONS.filter(item => owned.has(item.id))
            .map(item => [item.id, item.starter ? starterProgress() : grantedProgress(0, givenVersion(item.id, levels))])) as OwnedStreamingTechTreeState['techs'],
        convertedFromLegacy: levelOf(levels, 'PLAYBACK_QUALITY') > 0 || levelOf(levels, 'DELIVERY_CAPACITY') > 0 || levelOf(levels, 'RELIABILITY') > 0
            || levelOf(levels, 'PRODUCT_EXPERIENCE') > 0,
    };
};

/**
 * Adds, at version 1, every tech the engine levels stand for that the tree lacks (versions
 * already reached are kept), as given techs (no upkeep). Used where a level is raised from
 * outside the tree: an acquisition's technology, a campus project built before its group
 * arrived, and the developer test company's baseline.
 */
export const grantStreamingTechTreeFromLevels = (
    tree: OwnedStreamingTechTreeState,
    levels: StreamingTechSourceLevels,
    absoluteWeek: number,
): OwnedStreamingTechTreeState => {
    const granted = stepsForLevels(levels);
    if (![...granted].some(id => !tree.techs[id])) return tree;
    const week = Math.max(0, Math.round(absoluteWeek));
    const techs: OwnedStreamingTechTreeState['techs'] = {};
    STREAMING_TECH_DEFINITIONS.forEach(item => {
        const current = tree.techs[item.id];
        if (current) techs[item.id] = current;
        else if (granted.has(item.id)) techs[item.id] = item.starter ? starterProgress() : grantedProgress(week, givenVersion(item.id, levels));
    });
    return { ...tree, techs };
};

/**
 * Normalises a saved tree; a save without one is converted from its technology levels.
 * Idempotent, and it never touches money or time. Starter techs are always owned.
 */
export const normalizeStreamingTechTreeState = (
    raw: unknown,
    technologyLevels: unknown,
    /** #56: a save selling Extra member is given Sharing control once (`streamingPlatformSellsExtraMember`) */
    options: { sellsExtraMember?: boolean } = {},
): OwnedStreamingTechTreeState => {
    const levels = (technologyLevels && typeof technologyLevels === 'object' ? technologyLevels : {}) as Record<string, unknown>;
    const sharingControl = (tree: OwnedStreamingTechTreeState): OwnedStreamingTechTreeState => {
        if (!options.sellsExtraMember || STREAMING_SHARING_CONTROL_IDS.every(id => tree.techs[id])) return tree;
        const techs: OwnedStreamingTechTreeState['techs'] = {};
        STREAMING_TECH_DEFINITIONS.forEach(item => {
            const current = tree.techs[item.id];
            if (current) techs[item.id] = current;
            else if (STREAMING_SHARING_CONTROL_IDS.includes(item.id)) techs[item.id] = grantedProgress(0);
        });
        return { ...tree, techs };
    };
    if (!raw || typeof raw !== 'object' || !(raw as Record<string, unknown>).techs || typeof (raw as Record<string, unknown>).techs !== 'object') {
        return sharingControl(convertStreamingTechTreeFromLevels(levels));
    }
    const record = raw as Record<string, unknown>;
    const sourceTechs = record.techs as Record<string, unknown>;
    // A tree from before Optimisation and Stabilization (schema 1) gets the steps its Delivery and
    // Reliability levels stand for, once; one from before Playback and Apps and devices (schema 2,
    // #52) the steps its Product Experience stands for, once; one from before Trust and safety
    // (schema 3, #54) the steps its Security (and its 4K) stand for, once; one from before Smart AI
    // (schema 5, #59) the steps its Recommendations stand for, once; one from before Profiles and
    // family (schema 6, #60) Profiles and screens at the screens its Reliability allowed, once; one
    // from before Ads tech (schema 7, #61) the targeting steps its Commerce stands for, once.
    // Written back as schema 8.
    const schema = Number.isFinite(Number(record.schemaVersion)) ? Number(record.schemaVersion) : 1;
    const joiningGroups = new Set<StreamingTechGroupId>([
        ...(schema < 2 ? ['OPTIMISATION', 'STABILIZATION'] as const : []),
        ...(schema < 3 ? ['PLAYBACK', 'APPS'] as const : []),
        ...(schema < 4 ? ['TRUST'] as const : []),
        ...(schema < 6 ? ['SMART_AI'] as const : []),
        ...(schema < 7 ? ['FAMILY'] as const : []),
        ...(schema < 8 ? ['ADS'] as const : []),
    ]);
    const joinLevels = {
        DELIVERY_CAPACITY: levels.DELIVERY_CAPACITY, RELIABILITY: levels.RELIABILITY, PRODUCT_EXPERIENCE: levels.PRODUCT_EXPERIENCE,
        // only the joining groups' steps are taken, so Playback Quality here gives Studio DRM, not pictures
        SECURITY: levels.SECURITY, PLAYBACK_QUALITY: levels.PLAYBACK_QUALITY, DATA_RECOMMENDATIONS: levels.DATA_RECOMMENDATIONS,
        ADVERTISING_COMMERCE: levels.ADVERTISING_COMMERCE,
    };
    const joining = joiningGroups.size ? stepsForLevels(joinLevels) : null;
    const techs: OwnedStreamingTechTreeState['techs'] = {};
    STREAMING_TECH_DEFINITIONS.forEach(definition => {
        const progress = normalizeProgress(definition, sourceTechs[definition.id]);
        if (progress) techs[definition.id] = progress;
        else if (definition.starter) techs[definition.id] = starterProgress();
        else if (joining?.has(definition.id) && joiningGroups.has(definition.group)) {
            techs[definition.id] = grantedProgress(0, givenVersion(definition.id, joinLevels));
        }
    });
    const debtRaw = Number(record.debt);
    const debt = Number.isFinite(debtRaw) ? Math.round(Math.max(0, Math.min(STREAMING_TECH_DEBT_CEILING, debtRaw)) * 100) / 100 : 0;
    const paidRaw = Number(record.debtPaidAtAbsoluteWeek);
    // A tree from before Sharing control (schema 4, #56) that sells Extra member is given it, once
    const joined = schema < 5 ? sharingControl({ schemaVersion: STREAMING_TECH_TREE_SCHEMA, techs, convertedFromLegacy: false }).techs : techs;
    return {
        schemaVersion: STREAMING_TECH_TREE_SCHEMA,
        techs: joined,
        convertedFromLegacy: record.convertedFromLegacy === true,
        ...(debt > 0 ? { debt } : {}),
        ...(record.debtPaidAtAbsoluteWeek !== undefined && Number.isFinite(paidRaw) ? { debtPaidAtAbsoluteWeek: Math.max(0, Math.round(paidRaw)) } : {}),
    };
};

/** The tree of any platform-shaped value, converted when the save predates it. */
export const resolveStreamingTechTree = (platform: unknown): OwnedStreamingTechTreeState => {
    const record = (platform && typeof platform === 'object' ? platform : {}) as Record<string, unknown>;
    return normalizeStreamingTechTreeState(record.techTree, record.technologyLevels, { sellsExtraMember: streamingPlatformSellsExtraMember(record) });
};
