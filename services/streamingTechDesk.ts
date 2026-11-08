/**
 * The Platform room's Tech tab, as data (codex-handoff/plans/platform-tech-plan.md, Phases 1–2).
 *
 * Six groups (Picture, HDR, Colour, Sound, Optimisation, Stabilization), every step on their
 * ladders with what the player can do with it, what the plans can offer because of it, the
 * tech debt it adds or pays down, and the energy and cash to hand. Pure: nothing here saves.
 * The actions are in streamingTechTree.ts.
 */
import { streamingPlusLocks } from './streamingPlusPack';
import type { OwnedStreamingTechTreeState, Player, StreamingTechGroupId, StreamingTechId, StreamingTechVersion } from '../types';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { streamingTechRowAppeal } from './streamingPlanOffer';
import {
    STREAMING_TECH_FEATURE_REQUIREMENTS,
    STREAMING_TECH_GROUPS,
    getStreamingTechDefinition,
    getStreamingTechGroupLadder,
    getStreamingTechMissingRequirements,
    getStreamingTechTreeWeeklyUpkeep,
    resolveStreamingPlatformTechDebt,
    resolveStreamingTechTree,
    deriveStreamingTechEngineLevel,
    deriveStreamingTechPlaybackLevel,
    FRAGILITY,
    streamingTechCostFactor,
    streamingTechDebtFor,
    streamingTechDebtPaydown,
    streamingTechLoadFactor,
    streamingTechFeatureAllowed,
    streamingTechFeatureQuality,
    streamingTechNextVersionEnergy,
    streamingTechVersionCost,
    streamingTechBreachFactor,
    streamingTechChurnCut,
    streamingTechDeviceReach,
    streamingTechHabitAppeal,
    streamingTechLeakFactor,
    streamingTechPlaybackBoost,
    streamingTechScrutinyFactor,
    streamingTechTakedownSpeed,
    streamingTechCrackdownFactor,
    streamingTechSmartAiEffects,
    streamingTechFamilyAppeal,
    streamingTechScreens,
    streamingTechAdEffects,
    getStreamingTechVersionNames,
    STREAMING_SHARING_CONTROL_IDS,
    streamingTechExtraMemberAllowed,
    streamingTechExtraMemberShare,
    streamingTechSharingFactor,
    streamingTechVersion,
    type StreamingTechGatedFeature,
} from './streamingTechTreeCatalogue';

/** A press of the energy button, as in localization. */
export const STREAMING_TECH_ENERGY_STEP = 5;

/* Validated in this order on the room's dark surface (dataviz validator: lightness band, chroma,
   adjacent CVD ΔE ≥ 9, normal vision ≥ 26): Picture blue, HDR gold, Colour violet, Sound green,
   Optimisation orange, Stabilization cyan; then (#52) Playback pink and Apps and devices lime, which
   keep every adjacent pair passing. Eight hues do not all part from each other on a dark surface
   (lime and green, blue and violet), so every tile also carries its name and icon. */
export const STREAMING_TECH_GROUP_ACCENT: Record<StreamingTechGroupId, string> = {
    PICTURE: '#3b82f6',
    HDR: '#c98500',
    COLOUR: '#a855f7',
    SOUND: '#199e70',
    OPTIMISATION: '#d95926',
    STABILIZATION: '#0891b2',
    PLAYBACK: '#db2777',
    APPS: '#65a30d',
    /* #54: steel, a neutral rather than a ninth hue (eight hues are all a dark surface can keep apart);
       the tile's name and shield icon carry it */
    TRUST: '#94a3b8',
    /* #59: indigo; passes the palette validator against its neighbours, steel included */
    SMART_AI: '#6366f1',
    /* #60: peach, a lamp-lit living room; the most apart from all ten (normal ΔE ≥ 16.9, colour-blind ≥ 13.5),
       lighter than the band like steel, so the tile's name and house icon carry it */
    FAMILY: '#fdba74',
    /* #61: teal, money green on the dark surface; apart from its neighbours peach (ΔE 21.7) and indigo (32.2) */
    ADS: '#2dd4bf',
};

/** OWNED unlocked · OPEN can be unlocked now · LOCKED needs an earlier step first */
export type StreamingTechDeskStepState = 'OWNED' | 'OPEN' | 'LOCKED';

export interface StreamingTechDeskStep {
    id: StreamingTechId;
    group: StreamingTechGroupId;
    name: string;
    detail: string;
    state: StreamingTechDeskStepState;
    /** 0 while not unlocked */
    version: 0 | StreamingTechVersion;
    /** the current version's name in its group ("Sharp"), null while not unlocked */
    versionName: string | null;
    /** its names for versions 1–3: the group's, or its own (Profiles and screens: "2 screens", #60) */
    versionNames: [string, string, string];
    /** the version energy raises it to next, null at version 3 or while not unlocked */
    nextVersion: StreamingTechVersion | null;
    nextVersionName: string | null;
    /** energy already put toward the next version */
    progress: number;
    /** energy the next version needs in all */
    nextEnergy: number | null;
    /** what the next version costs from the treasury (#84), 0 when there is none */
    nextCost: number;
    /** the treasury covers the next version's price */
    nextAffordable: boolean;
    /** its energy is full: the version waits for its price (#84) */
    ready: boolean;
    unlockCost: number;
    weeklyUpkeep: number;
    /** names of the steps still needed (LOCKED) */
    needs: string[];
    /** and their ids, in the same order (a need can be in another group: HDR needs 1080p) */
    needIds: StreamingTechId[];
    affordable: boolean;
    starter: boolean;
    futuristic: boolean;
    /** one of the Streaming+ Pack's 10 steps, not yet unlocked, and the player has no pack: shown whole, with a chip */
    streamingPlus: boolean;
    sideLine: boolean;
    /** the plan features this step is part of ("4K HDR") */
    feeds: string[];
    /** tech debt its next move adds (unlock, or the next version) */
    debtNext: number;
    /** Optimisation and Stabilization: the tree's figure now and after this step's next move */
    effect: { kind: 'LOAD'; now: number; next: number; costNow: number; costNext: number }
        | { kind: 'PAYDOWN'; now: number; next: number }
        /* Playback (#52): points of playback success the tree adds, now and after this move */
        | { kind: 'PLAYBACK'; now: number; next: number }
        /* Playback's side lines and Apps (#52): the Product Experience level the tree stands for */
        | { kind: 'PRODUCT'; now: number; next: number }
        /* Trust and safety (#54): the Security level the engines read, and how likely a title leaks */
        | { kind: 'SECURITY'; now: number; next: number; leakNow: number; leakNext: number }
        /* Sharing control (#56): what the tree does to sharing now and after this move */
        | { kind: 'SHARING'; now: StreamingTechSharingLook; next: StreamingTechSharingLook }
        /* Smart AI (#59): the Recommendations level and what the tree does to watching */
        | { kind: 'AI'; now: StreamingTechAiLook; next: StreamingTechAiLook }
        /* Profiles and family (#60): screens a plan can sell, kids profiles, watch parties, family appeal */
        | { kind: 'FAMILY'; now: StreamingTechFamilyLook; next: StreamingTechFamilyLook }
        /* Ads tech (#61): the Commerce level, the best targeting step, slots, breaks */
        | { kind: 'ADS'; now: StreamingTechAdsLook; next: StreamingTechAdsLook }
        | null;
    /** what the next move does for viewers (#53): "Churn −0.07% a week", "+4 appeal with habit streamers", "3% more homes can watch" */
    more: string[];
    /** what the next move puts at risk (#59): Recommendations running 20+ ahead of Security invite a backlash */
    risks: string[];
}

export interface StreamingTechDeskGroup {
    id: StreamingTechGroupId;
    name: string;
    detail: string;
    accent: string;
    versionNames: [string, string, string];
    /** ladder order, side lines last */
    steps: StreamingTechDeskStep[];
    /** the highest unlocked main-ladder step */
    best: StreamingTechDeskStep | null;
    /** where the next move is: the next step to unlock, else the best step still below version 3 */
    focus: StreamingTechId;
    owned: number;
    total: number;
}

export interface StreamingTechDeskFeature {
    id: StreamingTechGatedFeature;
    name: string;
    allowed: boolean;
    /** what is still to unlock, in words ("4K and HDR"), empty when allowed */
    needs: string;
    /** the first step still to unlock, to jump to */
    needsStep: StreamingTechId | null;
    /** 1, 1.2 or 1.4: how much more a plan offering it is worth */
    quality: number;
}

export interface StreamingTechDeskView {
    founded: boolean;
    live: boolean;
    groups: StreamingTechDeskGroup[];
    /** what the plans can offer because of the tree */
    features: StreamingTechDeskFeature[];
    energy: { available: number; weekly: number; bank: number; step: number };
    treasury: number;
    weeklyUpkeep: number;
    owned: number;
    total: number;
    /** the platform's tech debt now (the infrastructure's plus the tree's) and what Stabilization pays down a week */
    debt: number;
    debtPaydown: number;
    /** what Optimisation multiplies a viewer's load and streaming cost by */
    loadFactor: number;
    /** Trust and safety (#54): the Security level the engines read, and how likely a title leaks against DRM alone */
    securityLevel: number;
    leakFactor: number;
    costFactor: number;
    /** last week's bandwidth bill at its full rate, and peak load units (0 before the first week under load units) */
    deliveryCost: number;
    peakLoadUnits: number;
}

const FEATURE_NAMES: Record<StreamingTechGatedFeature, string> = {
    hd: '1080p HD',
    uhd: '4K HDR',
    spatial: 'Spatial audio',
};

const FEATURE_ORDER: StreamingTechGatedFeature[] = ['hd', 'uhd', 'spatial'];

/** The tree as it would be after a step's next move (unlocked at version 1, or one version up). */
/** "4K", "4K and HDR", "4K, HDR and Studio DRM" */
const wordList = (words: string[]): string => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0] || '');

/* What a Playback, Apps or Trust move does for viewers (#53, #54), from the whole tree now and after
   it: the churn cut (Playback, Safe payments), appeal to habit streamers, the extra homes the best app
   reaches, how much rarer leaks and breaches get and how much less scrutiny reaches the regulator.
   #55: Content protection cuts home piracy of your titles by the same share as leaks, and the
   Takedown network and AI hunter shorten a takedown. #56: Sharing control's crackdown
   cancellations, outside homes and paying extra members. */
const trimNumber = (value: number, digits: number) => value.toFixed(digits).replace(/\.?0+$/, '');
/** #59: the crisis engine opens a recommendation backlash when Recommendations run 20+ ahead of Security,
 *  so a move that raises Recommendations that far says so. `levels` are the saved levels the engines read. */
const backlashRisks = (
    tree: OwnedStreamingTechTreeState,
    after: OwnedStreamingTechTreeState,
    levels: { recommendations: number; security: number },
): string[] => {
    if (deriveStreamingTechEngineLevel(after, 'DATA_RECOMMENDATIONS') <= deriveStreamingTechEngineLevel(tree, 'DATA_RECOMMENDATIONS')) return [];
    const recommendations = Math.max(levels.recommendations, deriveStreamingTechEngineLevel(after, 'DATA_RECOMMENDATIONS'));
    const security = Math.max(levels.security, deriveStreamingTechEngineLevel(after, 'SECURITY'));
    return recommendations > security + 20 ? [`Recommendations ${recommendations} would run more than 20 ahead of Security ${security}: backlash risk`] : [];
};
/* #85 (Zeesh: "koi upgrade bekaar na ho … jo dikhe"): what a version adds, shown on the step */
const PICTURE_GROUPS: StreamingTechGroupId[] = ['PICTURE', 'HDR', 'COLOUR', 'SOUND'];
const playbackLine = (tree: OwnedStreamingTechTreeState, after: OwnedStreamingTechTreeState): string[] => {
    const now = deriveStreamingTechPlaybackLevel(tree);
    const next = deriveStreamingTechPlaybackLevel(after);
    return next > now ? [`Playback Quality ${now} → ${next}`] : [];
};
/** the best main step's name when this owned main step is below it (an older step keeps a job), else null */
const olderThanBest = (tree: OwnedStreamingTechTreeState, group: StreamingTechGroupId, id: StreamingTechId): string | null => {
    const ladder = getStreamingTechGroupLadder(group).filter(item => !item.sideLine);
    const best = [...ladder].reverse().find(item => streamingTechVersion(tree, item.id) >= 1);
    return best && best.id !== id && ladder.some(item => item.id === id) ? best.name : null;
};
const OLDER_REASON: Partial<Record<StreamingTechGroupId, (step: string, best: string) => string>> = {
    PICTURE: step => `Phones on mobile data still get ${step}`,
    HDR: step => `Older TVs still show ${step}`,
    COLOUR: step => `Older TVs still show ${step}`,
    SOUND: step => `Phones and older TVs still play ${step}`,
    OPTIMISATION: (step, best) => `TVs that cannot play ${best} still stream ${step}`,
    STABILIZATION: (step, best) => `${step} still catches what ${best} misses`,
    APPS: step => `${step} keep their own viewers`,
    TRUST: step => `${step} still stops some copies`,
    SMART_AI: (_step, best) => `Its row stays on the home screen under ${best}`,
    ADS: step => `${step} still sells the cheaper ad slots`,
};

const viewerEffects = (
    tree: OwnedStreamingTechTreeState,
    after: OwnedStreamingTechTreeState,
): string[] => {
    const churn = streamingTechChurnCut(after) - streamingTechChurnCut(tree);
    const habit = streamingTechHabitAppeal(after) - streamingTechHabitAppeal(tree);
    const reach = streamingTechDeviceReach(after) - streamingTechDeviceReach(tree);
    const fewer = (now: number, next: number) => (now > 0 ? 1 - next / now : 0);
    const leak = fewer(streamingTechLeakFactor(tree), streamingTechLeakFactor(after));
    const breach = fewer(streamingTechBreachFactor(tree), streamingTechBreachFactor(after));
    const scrutiny = fewer(streamingTechScrutinyFactor(tree), streamingTechScrutinyFactor(after));
    const takedown = fewer(streamingTechTakedownSpeed(tree), streamingTechTakedownSpeed(after));
    const crackdown = fewer(streamingTechCrackdownFactor(tree), streamingTechCrackdownFactor(after));
    const sharing = fewer(streamingTechSharingFactor(tree), streamingTechSharingFactor(after));
    const members = streamingTechExtraMemberShare(after) - streamingTechExtraMemberShare(tree);
    const aiNow = streamingTechSmartAiEffects(tree);
    const aiNext = streamingTechSmartAiEffects(after);
    const lift = aiNext.engagementLift - aiNow.engagementLift;
    const finish = aiNext.completionLift - aiNow.completionLift;
    const rewatch = aiNext.repeatLift - aiNow.repeatLift;
    const points = (share: number) => `${trimNumber(share * 100, 1)} point${trimNumber(share * 100, 1) === '1' ? '' : 's'}`;
    const screens = streamingTechScreens(after);
    const family = streamingTechFamilyAppeal(after) - streamingTechFamilyAppeal(tree);
    const adsNow = streamingTechAdEffects(tree);
    const adsNext = streamingTechAdEffects(after);
    const slots = adsNext.slots / adsNow.slots - 1;
    const keep = fewer(adsNow.breakSlope, adsNext.breakSlope);
    const annoyance = fewer(adsNow.annoyance, adsNext.annoyance);
    return [
        ...(slots > .005 ? [`+${Math.round(slots * 100)}% ad slots an hour, same ad minutes`] : []),
        ...(keep > .005 ? [`Long ad breaks lose ${Math.round(keep * 100)}% fewer viewers`] : []),
        ...(annoyance > .005 ? [`Viewers mind ads ${Math.round(annoyance * 100)}% less`] : []),
        ...(screens > streamingTechScreens(tree) ? [`Plans can sell ${screens} screens at once`] : []),
        ...(family > .005 ? [`+${trimNumber(family, 1)} appeal with families`] : []),
        ...(lift > .0005 ? [`${trimNumber(lift * 100, 1)}% more viewers find something to watch`] : []),
        ...(finish > .0005 ? [`Viewers finish ${points(finish)} more of each title`] : []),
        ...(rewatch > .0005 ? [`Rewatching +${points(rewatch)}`] : []),
        ...(crackdown > .005 ? [`Crackdown cancellations ${Math.round(crackdown * 100)}% lower`] : []),
        ...(sharing > .005 ? [`${Math.round(sharing * 100)}% fewer homes on shared passwords`] : []),
        ...(!streamingTechExtraMemberAllowed(tree) && streamingTechExtraMemberAllowed(after) ? ['Plans can sell Extra member'] : []),
        ...(members > .005 ? [`${Math.round(streamingTechExtraMemberShare(after) * 100)}% of turned-away sharers pay to stay`] : []),
        ...(leak > .005 ? [`Leaks and piracy ${Math.round(leak * 100)}% lower`] : []),
        ...(takedown > .005 ? [`Takedowns take ${Math.round(takedown * 100)}% less time`] : []),
        ...(breach > .005 ? [`Breaches ${Math.round(breach * 100)}% less likely`] : []),
        ...(churn > .000005 ? [`Churn −${trimNumber(churn * 100, 2)}% a week`] : []),
        ...(habit > .005 ? [`+${trimNumber(habit, 1)} appeal with habit streamers`] : []),
        ...(reach > .00005 ? [`${trimNumber(reach * 100, 1)}% more homes can watch`] : []),
        ...(scrutiny > .005 ? [`${Math.round(scrutiny * 100)}% less scrutiny reaches the regulator`] : []),
    ];
};

/** Sharing control (#56) in one look: outside homes per account (Device check), the share of turned-away
 *  sharers who pay to stay (Paid extra member), and the share of a crackdown's cancellations left (Household detection). */
export interface StreamingTechSharingLook { check: number; share: number; crackdown: number }
const sharingLook = (tree: OwnedStreamingTechTreeState): StreamingTechSharingLook => ({
    check: streamingTechSharingFactor(tree), share: streamingTechExtraMemberShare(tree), crackdown: streamingTechCrackdownFactor(tree),
});

/** Smart AI (#59) in one look: the Recommendations level the engines read, the share more of
 *  viewers who find something to watch, completion points added, the best recommendations step
 *  (0 Trending rows … 3 Taste engine) and which side lines run. */
export interface StreamingTechAiLook {
    level: number; lift: number; completion: number; rank: number; autoplay: boolean; channels: boolean; voice: boolean;
}
const aiLook = (tree: OwnedStreamingTechTreeState, savedLevel: number): StreamingTechAiLook => {
    const effects = streamingTechSmartAiEffects(tree);
    const ladder = getStreamingTechGroupLadder('SMART_AI').filter(item => !item.sideLine);
    const best = [...ladder].reverse().find(item => streamingTechVersion(tree, item.id) >= 1);
    return {
        level: Math.max(savedLevel, deriveStreamingTechEngineLevel(tree, 'DATA_RECOMMENDATIONS')),
        lift: effects.engagementLift,
        completion: effects.completionLift,
        rank: best ? ladder.indexOf(best) : 0,
        autoplay: streamingTechVersion(tree, 'AI_AUTOPLAY') >= 1,
        channels: streamingTechVersion(tree, 'AI_CHANNELS') >= 1,
        voice: streamingTechVersion(tree, 'AI_VOICE') >= 1,
    };
};

/** Profiles and family (#60) in one look: screens a plan can sell, whether kids profiles and watch
 *  parties run, the family appeal they add and the Product Experience level the engines read. */
export interface StreamingTechFamilyLook { screens: number; kids: boolean; party: boolean; appeal: number; product: number }
const familyLook = (tree: OwnedStreamingTechTreeState, savedProduct: number): StreamingTechFamilyLook => ({
    screens: streamingTechScreens(tree),
    kids: streamingTechVersion(tree, 'FAM_KIDS') >= 1,
    party: streamingTechVersion(tree, 'FAM_WATCH_PARTY') >= 1,
    appeal: streamingTechFamilyAppeal(tree),
    // the level the engines read: the bridge only ever raises it
    product: Math.max(savedProduct, deriveStreamingTechEngineLevel(tree, 'PRODUCT_EXPERIENCE')),
});

/** Ads tech (#61) in one look: the Commerce level the ad market reads, the best targeting step
 *  (0 Basic ad server … 4 AI ad matching), ad slots an hour, the break slope and what ads cost with viewers. */
export interface StreamingTechAdsLook { commerce: number; rank: number; slots: number; breakSlope: number; annoyance: number }
const adsLook = (tree: OwnedStreamingTechTreeState, savedCommerce: number): StreamingTechAdsLook => {
    const ladder = getStreamingTechGroupLadder('ADS').filter(item => !item.sideLine);
    const best = [...ladder].reverse().find(item => streamingTechVersion(tree, item.id) >= 1);
    const effects = streamingTechAdEffects(tree);
    return {
        commerce: Math.max(savedCommerce, deriveStreamingTechEngineLevel(tree, 'ADVERTISING_COMMERCE')),
        rank: best ? ladder.indexOf(best) : 0,
        slots: effects.slots, breakSlope: effects.breakSlope, annoyance: effects.annoyance,
    };
};

const afterNextMove = (tree: OwnedStreamingTechTreeState, id: StreamingTechId, version: 0 | StreamingTechVersion): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, [id]: { version: Math.min(3, version + 1) as StreamingTechVersion, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 } },
});

export const getStreamingTechDesk = (player: Player): StreamingTechDeskView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const tree = resolveStreamingTechTree(platform);
    const treasury = Math.max(0, platform.treasuryCash);
    const productLevel = Math.max(0, Number(platform.technologyLevels.PRODUCT_EXPERIENCE) || 0);
    const securityLevel = Math.max(0, Number(platform.technologyLevels.SECURITY) || 0);
    const recommendationLevel = Math.max(0, Number(platform.technologyLevels.DATA_RECOMMENDATIONS) || 0);
    const commerceLevel = Math.max(0, Number(platform.technologyLevels.ADVERTISING_COMMERCE) || 0);
    const feedsOf =(id: StreamingTechId): string[] => [
        ...FEATURE_ORDER.filter(feature => STREAMING_TECH_FEATURE_REQUIREMENTS[feature].includes(id)).map(feature => FEATURE_NAMES[feature]),
        /* the plan feature Playback's Downloads opens (#52), and the plan rows of #62 */
        ...(id === 'PLAY_DOWNLOADS' ? ['Downloads'] : []),
        ...(id === 'FAM_KIDS' ? ['Kids profiles'] : id === 'AI_CHANNELS' ? ['AI channels'] : id === 'AI_AUTOPLAY' ? ['Autoplay'] : []),
    ];

    const groups: StreamingTechDeskGroup[] = STREAMING_TECH_GROUPS.map(group => {
        const steps: StreamingTechDeskStep[] = getStreamingTechGroupLadder(group.id).map(definition => {
            const version = streamingTechVersion(tree, definition.id);
            const missing = getStreamingTechMissingRequirements(tree, definition);
            const state: StreamingTechDeskStepState = version >= 1 ? 'OWNED' : missing.length ? 'LOCKED' : 'OPEN';
            const nextEnergy = version >= 1 ? streamingTechNextVersionEnergy(definition, version) : null;
            const nextVersion = nextEnergy === null ? null : (version + 1) as StreamingTechVersion;
            return {
                id: definition.id,
                group: group.id,
                name: definition.name,
                detail: definition.detail,
                state,
                version,
                versionName: version >= 1 ? getStreamingTechVersionNames(definition.id)[version - 1] : null,
                versionNames: getStreamingTechVersionNames(definition.id),
                nextVersion,
                nextVersionName: nextVersion ? getStreamingTechVersionNames(definition.id)[nextVersion - 1] : null,
                progress: version >= 1 ? tree.techs[definition.id]?.progress ?? 0 : 0,
                nextEnergy,
                nextCost: streamingTechVersionCost(definition, nextVersion),
                nextAffordable: treasury >= streamingTechVersionCost(definition, nextVersion),
                ready: nextEnergy !== null && (tree.techs[definition.id]?.progress ?? 0) >= nextEnergy,
                unlockCost: definition.unlockCost,
                weeklyUpkeep: definition.weeklyUpkeep,
                needs: missing.map(item => item.name),
                needIds: missing.map(item => item.id),
                affordable: treasury >= definition.unlockCost,
                starter: Boolean(definition.starter),
                futuristic: Boolean(definition.futuristic),
                streamingPlus: streamingTechVersion(tree, definition.id) < 1 && streamingPlusLocks(player, { kind: 'TECH', id: definition.id }),
                sideLine: Boolean(definition.sideLine),
                feeds: feedsOf(definition.id),
                debtNext: version >= 3 ? 0 : streamingTechDebtFor(definition, Math.min(3, version + 1) as StreamingTechVersion),
                effect: version >= 3 ? null
                    : group.id === 'OPTIMISATION' ? {
                        kind: 'LOAD' as const,
                        now: streamingTechLoadFactor(tree),
                        next: streamingTechLoadFactor(afterNextMove(tree, definition.id, version)),
                        costNow: streamingTechCostFactor(tree),
                        costNext: streamingTechCostFactor(afterNextMove(tree, definition.id, version)),
                    }
                    : group.id === 'STABILIZATION' ? {
                        kind: 'PAYDOWN' as const,
                        now: streamingTechDebtPaydown(tree),
                        next: streamingTechDebtPaydown(afterNextMove(tree, definition.id, version)),
                    }
                    : definition.playbackBoost ? {
                        kind: 'PLAYBACK' as const,
                        now: streamingTechPlaybackBoost(tree),
                        next: streamingTechPlaybackBoost(afterNextMove(tree, definition.id, version)),
                    }
                    : group.id === 'SMART_AI' ? {
                        kind: 'AI' as const,
                        now: aiLook(tree, recommendationLevel),
                        next: aiLook(afterNextMove(tree, definition.id, version), recommendationLevel),
                    }
                    : group.id === 'FAMILY' ? {
                        kind: 'FAMILY' as const,
                        now: familyLook(tree, productLevel),
                        next: familyLook(afterNextMove(tree, definition.id, version), productLevel),
                    }
                    : group.id === 'ADS' ? {
                        kind: 'ADS' as const,
                        now: adsLook(tree, commerceLevel),
                        next: adsLook(afterNextMove(tree, definition.id, version), commerceLevel),
                    }
                    : STREAMING_SHARING_CONTROL_IDS.includes(definition.id) ? {
                        kind: 'SHARING' as const,
                        now: sharingLook(tree),
                        next: sharingLook(afterNextMove(tree, definition.id, version)),
                    }
                    : definition.engine?.branch === 'SECURITY' ? {
                        kind: 'SECURITY' as const,
                        // the level the engines read, as Product Experience: the bridge only raises it
                        now: Math.max(securityLevel, deriveStreamingTechEngineLevel(tree, 'SECURITY')),
                        next: Math.max(securityLevel, deriveStreamingTechEngineLevel(afterNextMove(tree, definition.id, version), 'SECURITY')),
                        leakNow: streamingTechLeakFactor(tree),
                        leakNext: streamingTechLeakFactor(afterNextMove(tree, definition.id, version)),
                    }
                    : definition.engine?.branch === 'PRODUCT_EXPERIENCE' ? {
                        kind: 'PRODUCT' as const,
                        // the level the engines read: the bridge only ever raises it, so an old save
                        // keeps a level above what its given techs stand for until the tree passes it
                        now: Math.max(productLevel, deriveStreamingTechEngineLevel(tree, 'PRODUCT_EXPERIENCE')),
                        next: Math.max(productLevel, deriveStreamingTechEngineLevel(afterNextMove(tree, definition.id, version), 'PRODUCT_EXPERIENCE')),
                    }
                    : null,
                more: version >= 3 ? [] : [
                    /* #85: every version of Picture, HDR, Colour and Sound shows the Playback Quality it adds */
                    ...(PICTURE_GROUPS.includes(group.id) && version >= 1 ? playbackLine(tree, afterNextMove(tree, definition.id, version)) : []),
                    /* #85: the plans that offer it, a fifth of its appeal more a version */
                    ...(version >= 1 && streamingTechRowAppeal(definition.id) > 0
                        ? [`Plans with ${definition.name}: +${trimNumber(streamingTechRowAppeal(definition.id) * .2, 1)} appeal`] : []),
                    /* #85: each app (every one owned, not only the best) and each Playback feature breaks less at each version */
                    ...(version >= 1 && ((group.id === 'APPS' && !definition.sideLine) || (group.id === 'PLAYBACK' && definition.sideLine))
                        ? [`${group.id === 'APPS' ? 'Its app crashes' : 'It breaks'} ${Math.round((1 - FRAGILITY[version as 1 | 2] / FRAGILITY[version - 1]) * 100)}% less often`] : []),
                    /* #85: an older step's job, once a better one owns its group */
                    ...(version >= 1 && OLDER_REASON[group.id] && olderThanBest(tree, group.id, definition.id)
                        ? [OLDER_REASON[group.id]!(definition.name, olderThanBest(tree, group.id, definition.id)!)] : []),
                    ...(group.id !== 'PLAYBACK' && group.id !== 'APPS' && group.id !== 'TRUST' && group.id !== 'SMART_AI' && group.id !== 'FAMILY' && group.id !== 'ADS' ? []
                        : viewerEffects(tree, afterNextMove(tree, definition.id, version))),
                ],
                risks: version >= 3 || group.id !== 'SMART_AI' ? []
                    : backlashRisks(tree, afterNextMove(tree, definition.id, version), { recommendations: recommendationLevel, security: securityLevel }),
            };
        });
        const ladder = steps.filter(step => !step.sideLine);
        const ownedLadder = ladder.filter(step => step.state === 'OWNED');
        const best = ownedLadder.length ? ownedLadder[ownedLadder.length - 1] : null;
        const nextOpen = ladder.find(step => step.state === 'OPEN') || steps.find(step => step.state === 'OPEN');
        const raising = best && best.nextVersion ? best : steps.find(step => step.state === 'OWNED' && step.nextVersion);
        return {
            id: group.id,
            name: group.name,
            detail: group.detail,
            accent: STREAMING_TECH_GROUP_ACCENT[group.id],
            versionNames: group.versionNames,
            steps,
            best,
            focus: (nextOpen || raising || best || ladder[0] || steps[0]).id,
            owned: steps.filter(step => step.state === 'OWNED').length,
            total: steps.length,
        };
    });

    const features: StreamingTechDeskFeature[] = FEATURE_ORDER.map(feature => {
        const missing = STREAMING_TECH_FEATURE_REQUIREMENTS[feature].filter(id => streamingTechVersion(tree, id) < 1);
        return {
            id: feature,
            name: FEATURE_NAMES[feature],
            allowed: streamingTechFeatureAllowed(tree, feature),
            needs: wordList(missing.map(id => getStreamingTechDefinition(id)?.name || id)),
            needsStep: missing[0] || null,
            quality: streamingTechFeatureQuality(tree, feature),
        };
    });

    const flags = player.flags || {};
    const steps = groups.flatMap(group => group.steps);
    const latest = platform.weeklyHistory.at(-1)?.operations;
    return {
        founded: Boolean(platform.identity) && (platform.lifecycle === 'FOUNDING' || platform.lifecycle === 'ACTIVE'),
        live: platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit),
        groups,
        features,
        energy: {
            available: Math.max(0, Math.floor(Number(player.energy?.current) || 0)),
            weekly: Math.max(0, Math.floor(Number(flags.weeklyBaseEnergyRemaining) || 0)),
            bank: Math.max(0, Math.floor(Number(flags.bonusEnergyBank) || 0)),
            step: STREAMING_TECH_ENERGY_STEP,
        },
        treasury,
        weeklyUpkeep: getStreamingTechTreeWeeklyUpkeep(tree),
        owned: steps.filter(step => step.state === 'OWNED').length,
        total: steps.length,
        debt: resolveStreamingPlatformTechDebt(platform),
        debtPaydown: streamingTechDebtPaydown(tree),
        loadFactor: streamingTechLoadFactor(tree),
        securityLevel: Math.max(securityLevel, deriveStreamingTechEngineLevel(tree, 'SECURITY')),
        leakFactor: streamingTechLeakFactor(tree),
        costFactor: streamingTechCostFactor(tree),
        // at the full rate: a save still phasing the bill in would see a saving eight times too small
        deliveryCost: (latest?.streamingDeliveryCost ?? 0) / Math.max(1 / 8, latest?.streamingDeliveryPhaseIn ?? 1),
        peakLoadUnits: latest?.peakLoadUnits ?? 0,
    };
};
