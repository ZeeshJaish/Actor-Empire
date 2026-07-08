import type {
    Commitment,
    OwnedProductionActionId,
    OwnedProductionTrackType,
    Player,
    PlayerProductionFocus,
} from '../types';

type ProductionPhase = NonNullable<Commitment['projectPhase']>;
type FocusProgressKey = Exclude<keyof PlayerProductionFocus, 'isPlayerActor' | 'isPlayerDirector' | 'isPlayerProducer' | 'qualityLift'>;

interface OwnedProductionActionConfig {
    id: OwnedProductionActionId;
    track: OwnedProductionTrackType;
    label: string;
    shortLabel: string;
    phase: ProductionPhase;
    energyCost: number;
    progressKey: FocusProgressKey;
    progressGain: number;
    auditionGain?: number;
    performanceGain?: number;
    buzzGain?: number;
}

export interface OwnedProductionActionState extends OwnedProductionActionConfig {
    progress: number;
    isMaxed: boolean;
}

export interface OwnedProductionTrack {
    type: OwnedProductionTrackType;
    label: string;
    progress: number;
    actions: OwnedProductionActionState[];
}

export interface OwnedProductionCareerItem {
    commitment: Commitment;
    studioName: string;
    phase: ProductionPhase;
    weeksLeft: number;
    phaseDurationWeeks: number;
    focusLoadWeeks: number;
    tracks: OwnedProductionTrack[];
    focus: PlayerProductionFocus;
    qualityLift: number;
    qualityScore: number;
}

export interface OwnedProductionFocusResult {
    commitment: Commitment;
    action: OwnedProductionActionConfig;
    focus: PlayerProductionFocus;
    qualityLiftDelta: number;
    logMessage: string;
}

export const OWNED_PRODUCTION_QUALITY_LIFT_CAP = 15;
export const OWNED_PRODUCTION_FOCUS_ENERGY_PER_WEEK = 25;

export const OWNED_PRODUCTION_ACTIONS: Record<OwnedProductionActionId, OwnedProductionActionConfig> = {
    ACTOR_PREP: {
        id: 'ACTOR_PREP',
        track: 'ACTING',
        label: 'Table Read',
        shortLabel: 'Table Read',
        phase: 'PRE_PRODUCTION',
        energyCost: 8,
        progressKey: 'actorPrep',
        progressGain: 100,
        auditionGain: 10,
    },
    ACTOR_SCENE: {
        id: 'ACTOR_SCENE',
        track: 'ACTING',
        label: 'Scene Rehearsal',
        shortLabel: 'Scene Rehearsal',
        phase: 'PRODUCTION',
        energyCost: 12,
        progressKey: 'actorSceneRehearsal',
        progressGain: 100,
        performanceGain: 9,
    },
    ACTOR_BIG_PUSH: {
        id: 'ACTOR_BIG_PUSH',
        track: 'ACTING',
        label: 'Big Performance Push',
        shortLabel: 'Big Perform.',
        phase: 'PRODUCTION',
        energyCost: 15,
        progressKey: 'actorBigPerformance',
        progressGain: 100,
        performanceGain: 12,
    },
    DIRECTOR_PLAN: {
        id: 'DIRECTOR_PLAN',
        track: 'DIRECTING',
        label: 'Director Prep',
        shortLabel: 'Director Prep',
        phase: 'PRE_PRODUCTION',
        energyCost: 10,
        progressKey: 'directorPrep',
        progressGain: 100,
    },
    DIRECTOR_SHOT_DECISION: {
        id: 'DIRECTOR_SHOT_DECISION',
        track: 'DIRECTING',
        label: 'Shot/Set Decision',
        shortLabel: 'Shot/Set',
        phase: 'PRODUCTION',
        energyCost: 12,
        progressKey: 'directorShotDecision',
        progressGain: 100,
        performanceGain: 5,
    },
    DIRECTOR_MAJOR_PUSH: {
        id: 'DIRECTOR_MAJOR_PUSH',
        track: 'DIRECTING',
        label: 'Major Creative Push',
        shortLabel: 'Creative Push',
        phase: 'PRODUCTION',
        energyCost: 18,
        progressKey: 'directorMajorCreativePush',
        progressGain: 100,
        performanceGain: 8,
    },
    DIRECTOR_RISKY_DECISION: {
        id: 'DIRECTOR_RISKY_DECISION',
        track: 'DIRECTING',
        label: 'Risky High-Pressure Decision',
        shortLabel: 'Risky Decision',
        phase: 'PRODUCTION',
        energyCost: 25,
        progressKey: 'directorRiskyDecision',
        progressGain: 100,
        performanceGain: 12,
    },
    DIRECTOR_CUT: {
        id: 'DIRECTOR_CUT',
        track: 'DIRECTING',
        label: 'Cut Review',
        shortLabel: 'Cut Review',
        phase: 'POST_PRODUCTION',
        energyCost: 10,
        progressKey: 'directorPost',
        progressGain: 100,
    },
    PRODUCER_SCRIPT_REVIEW: {
        id: 'PRODUCER_SCRIPT_REVIEW',
        track: 'PRODUCING',
        label: 'Script Polish Review',
        shortLabel: 'Script Polish',
        phase: 'PRE_PRODUCTION',
        energyCost: 8,
        progressKey: 'producerScriptPolish',
        progressGain: 100,
    },
    PRODUCER_CAST_CREW_PREP: {
        id: 'PRODUCER_CAST_CREW_PREP',
        track: 'PRODUCING',
        label: 'Cast/Crew Prep',
        shortLabel: 'Cast Prep',
        phase: 'PRE_PRODUCTION',
        energyCost: 10,
        progressKey: 'producerCastCrewPrep',
        progressGain: 100,
    },
    PRODUCER_SET_QUALITY: {
        id: 'PRODUCER_SET_QUALITY',
        track: 'PRODUCING',
        label: 'Set Quality Check',
        shortLabel: 'Set Check',
        phase: 'PRODUCTION',
        energyCost: 10,
        progressKey: 'producerSetQuality',
        progressGain: 100,
    },
    PRODUCER_EDIT_NOTES: {
        id: 'PRODUCER_EDIT_NOTES',
        track: 'PRODUCING',
        label: 'Edit Notes',
        shortLabel: 'Edit',
        phase: 'POST_PRODUCTION',
        energyCost: 10,
        progressKey: 'producerEditNotes',
        progressGain: 100,
    },
    PRODUCER_RELEASE_POSITIONING: {
        id: 'PRODUCER_RELEASE_POSITIONING',
        track: 'PRODUCING',
        label: 'Release Positioning',
        shortLabel: 'Release',
        phase: 'POST_PRODUCTION',
        energyCost: 12,
        progressKey: 'producerReleasePositioning',
        progressGain: 100,
        buzzGain: 2,
    },
};

const TRACK_LABELS: Record<OwnedProductionTrackType, string> = {
    ACTING: 'Acting',
    DIRECTING: 'Directing',
    PRODUCING: 'Producing',
};

const ACTIVE_OWNED_PRODUCTION_PHASES = new Set<ProductionPhase>(['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION']);

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

const average = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + clamp(value), 0) / values.length;
};

export const isPlayerCastInProject = (commitment: Commitment): boolean => {
    if (commitment.roleType) return true;
    return Boolean(commitment.projectDetails?.castList?.some(member => member.actorId === 'PLAYER_SELF' || member.isPlayer));
};

export const isPlayerDirectingProject = (commitment: Commitment): boolean => {
    const details = commitment.projectDetails;
    if (!details) return false;
    return details.directorId === 'PLAYER_SELF'
        || details.director?.id === 'PLAYER_SELF'
        || Boolean(details.crewList?.some(member => member.role === 'DIRECTOR' && (member.id === 'PLAYER_SELF' || member.isPlayer)));
};

export const normalizePlayerProductionFocus = (
    commitment: Commitment,
    fallback: Pick<PlayerProductionFocus, 'isPlayerActor' | 'isPlayerDirector' | 'isPlayerProducer'>
): PlayerProductionFocus => {
    const focus = commitment.projectDetails?.playerProductionFocus || {};
    const legacyActorPerformance = clamp(focus.actorPerformance || commitment.productionPerformance);
    const legacyDirectorPerformance = clamp(focus.directorPerformance);
    const legacyProducerPrep = clamp(focus.producerPrep);
    const legacyProducerPerformance = clamp(focus.producerPerformance);
    const legacyProducerPost = clamp(focus.producerPost);
    return {
        isPlayerActor: focus.isPlayerActor ?? fallback.isPlayerActor,
        isPlayerDirector: focus.isPlayerDirector ?? fallback.isPlayerDirector,
        isPlayerProducer: focus.isPlayerProducer ?? fallback.isPlayerProducer,
        actorPrep: clamp(focus.actorPrep),
        actorSceneRehearsal: clamp(focus.actorSceneRehearsal ?? legacyActorPerformance),
        actorBigPerformance: clamp(focus.actorBigPerformance ?? legacyActorPerformance),
        actorPerformance: legacyActorPerformance,
        actorPromotion: clamp(focus.actorPromotion),
        directorPrep: clamp(focus.directorPrep),
        directorShotDecision: clamp(focus.directorShotDecision ?? legacyDirectorPerformance),
        directorMajorCreativePush: clamp(focus.directorMajorCreativePush ?? legacyDirectorPerformance),
        directorRiskyDecision: clamp(focus.directorRiskyDecision ?? legacyDirectorPerformance),
        directorPerformance: legacyDirectorPerformance,
        directorPost: clamp(focus.directorPost),
        producerScriptPolish: clamp(focus.producerScriptPolish ?? legacyProducerPrep),
        producerCastCrewPrep: clamp(focus.producerCastCrewPrep ?? legacyProducerPrep),
        producerSetQuality: clamp(focus.producerSetQuality ?? legacyProducerPerformance),
        producerEditNotes: clamp(focus.producerEditNotes ?? legacyProducerPost),
        producerReleasePositioning: clamp(focus.producerReleasePositioning ?? legacyProducerPost),
        producerPrep: legacyProducerPrep,
        producerPerformance: legacyProducerPerformance,
        producerPost: legacyProducerPost,
        qualityLift: clamp(focus.qualityLift, 0, OWNED_PRODUCTION_QUALITY_LIFT_CAP),
    };
};

const getProducerPolishScores = (focus: PlayerProductionFocus) => [
    focus.producerScriptPolish || 0,
    focus.producerCastCrewPrep || 0,
    focus.producerSetQuality || 0,
    focus.producerEditNotes || 0,
    focus.producerReleasePositioning || 0,
];

const getDirectorFocusScores = (focus: PlayerProductionFocus) => [
    focus.directorPrep || 0,
    focus.directorShotDecision || 0,
    focus.directorMajorCreativePush || 0,
    focus.directorRiskyDecision || 0,
    focus.directorPost || 0,
];

export const calculateOwnedProductionQualityLift = (focus: PlayerProductionFocus): number => {
    const producerScore = focus.isPlayerProducer
        ? average(getProducerPolishScores(focus))
        : 0;
    const directorScore = focus.isPlayerDirector
        ? average(getDirectorFocusScores(focus))
        : 0;
    const combinedScore = focus.isPlayerDirector
        ? (producerScore * 0.55) + (directorScore * 0.45)
        : producerScore;
    return clamp(combinedScore * (OWNED_PRODUCTION_QUALITY_LIFT_CAP / 100), 0, OWNED_PRODUCTION_QUALITY_LIFT_CAP);
};

const getOwnedStudioIds = (player: Player) => new Set(
    (player.businesses || [])
        .filter(business => business.type === 'PRODUCTION_HOUSE')
        .map(business => business.id)
);

const getStudioName = (player: Player, studioId?: string) => (
    (player.businesses || []).find(business => business.id === studioId)?.name || 'Your Studio'
);

const getTrackProgress = (track: OwnedProductionTrackType, phase: ProductionPhase, commitment: Commitment, focus: PlayerProductionFocus) => {
    if (track === 'ACTING') {
        if (phase === 'PRE_PRODUCTION') return Math.max(clamp(focus.actorPrep), clamp(commitment.auditionPerformance));
        if (phase === 'PRODUCTION') return average([focus.actorSceneRehearsal || 0, focus.actorBigPerformance || 0]);
        return 0;
    }
    if (track === 'DIRECTING') {
        if (phase === 'PRE_PRODUCTION') return clamp(focus.directorPrep);
        if (phase === 'PRODUCTION') return average([
            focus.directorShotDecision || 0,
            focus.directorMajorCreativePush || 0,
            focus.directorRiskyDecision || 0,
        ]);
        return clamp(focus.directorPost);
    }
    if (phase === 'PRE_PRODUCTION') return average([focus.producerScriptPolish || 0, focus.producerCastCrewPrep || 0]);
    if (phase === 'PRODUCTION') return clamp(focus.producerSetQuality);
    return average([focus.producerEditNotes || 0, focus.producerReleasePositioning || 0]);
};

const getActionProgress = (action: OwnedProductionActionConfig, commitment: Commitment, focus: PlayerProductionFocus) => {
    if (action.id === 'ACTOR_PREP') return Math.max(clamp(focus.actorPrep), clamp(commitment.auditionPerformance));
    return clamp(focus[action.progressKey] || 0);
};

export const getOwnedProductionActionProgress = (
    commitment: Commitment,
    actionId: OwnedProductionActionId,
    focusOverride?: PlayerProductionFocus
): number => {
    const action = OWNED_PRODUCTION_ACTIONS[actionId];
    if (!action) return 0;
    const focus = focusOverride || normalizePlayerProductionFocus(commitment, {
        isPlayerActor: isPlayerCastInProject(commitment),
        isPlayerDirector: isPlayerDirectingProject(commitment),
        isPlayerProducer: Boolean(commitment.projectDetails?.studioId),
    });
    return getActionProgress(action, commitment, focus);
};

const getTrackActionIds = (track: OwnedProductionTrackType, phase: ProductionPhase): OwnedProductionActionId[] => (
    (Object.values(OWNED_PRODUCTION_ACTIONS) as OwnedProductionActionConfig[])
        .filter(action => action.track === track && action.phase === phase)
        .map(action => action.id)
);

export const getOwnedProductionFocusLoadWeeks = (tracks: OwnedProductionTrack[]): number => {
    const remainingEnergy = tracks.reduce((total, track) => (
        total + track.actions.reduce((trackTotal, action) => (
            action.isMaxed ? trackTotal : trackTotal + action.energyCost
        ), 0)
    ), 0);
    if (remainingEnergy <= 0) return 0;
    return Math.ceil((remainingEnergy / OWNED_PRODUCTION_FOCUS_ENERGY_PER_WEEK) * 2) / 2;
};

export const deriveOwnedProductionCareerItems = (
    player: Player,
    commitments: Commitment[] = player.commitments || []
): OwnedProductionCareerItem[] => {
    const ownedStudioIds = getOwnedStudioIds(player);

    return commitments.flatMap(commitment => {
        const details = commitment.projectDetails;
        const phase = commitment.projectPhase;
        if (!details?.studioId || !phase || !ACTIVE_OWNED_PRODUCTION_PHASES.has(phase)) return [];
        if (commitment.type !== 'JOB' || !ownedStudioIds.has(String(details.studioId))) return [];

        const focus = normalizePlayerProductionFocus(commitment, {
            isPlayerActor: isPlayerCastInProject(commitment),
            isPlayerDirector: isPlayerDirectingProject(commitment),
            isPlayerProducer: true,
        });

        const trackTypes: OwnedProductionTrackType[] = [
            ...(focus.isPlayerActor ? ['ACTING' as const] : []),
            ...(focus.isPlayerDirector ? ['DIRECTING' as const] : []),
            'PRODUCING',
        ];

        const tracks = trackTypes.map(type => {
            const actions = getTrackActionIds(type, phase).map(actionId => {
                const action = OWNED_PRODUCTION_ACTIONS[actionId];
                const progress = getOwnedProductionActionProgress(commitment, actionId, focus);
                return {
                    ...action,
                    progress,
                    isMaxed: progress >= 100,
                };
            });

            return {
                type,
                label: TRACK_LABELS[type],
                progress: getTrackProgress(type, phase, commitment, focus),
                actions,
            };
        }).filter(track => track.actions.length > 0);

        if (tracks.length === 0) return [];
        const phaseDurationWeeks = Math.max(1, Number(commitment.totalPhaseDuration || commitment.phaseWeeksLeft || 1));

        return [{
            commitment,
            studioName: getStudioName(player, String(details.studioId)),
            phase,
            weeksLeft: Math.max(0, Number(commitment.phaseWeeksLeft || 0)),
            phaseDurationWeeks,
            focusLoadWeeks: getOwnedProductionFocusLoadWeeks(tracks),
            tracks,
            focus,
            qualityLift: clamp(focus.qualityLift, 0, OWNED_PRODUCTION_QUALITY_LIFT_CAP),
            qualityScore: clamp(details.hiddenStats?.qualityScore || 50),
        }];
    });
};

const buildActionLog = (commitment: Commitment, action: OwnedProductionActionConfig, qualityLiftDelta: number) => {
    const liftText = qualityLiftDelta > 0 ? ` Quality polish +${qualityLiftDelta}.` : '';
    return `${action.label} completed for "${commitment.name}".${liftText}`;
};

export const applyOwnedProductionFocusAction = (
    player: Player,
    commitment: Commitment,
    actionId: OwnedProductionActionId
): OwnedProductionFocusResult => {
    const action = OWNED_PRODUCTION_ACTIONS[actionId];
    const details = commitment.projectDetails;
    if (!details) {
        return {
            commitment,
            action,
            focus: {},
            qualityLiftDelta: 0,
            logMessage: `No production details found for "${commitment.name}".`,
        };
    }

    const focus = normalizePlayerProductionFocus(commitment, {
        isPlayerActor: isPlayerCastInProject(commitment),
        isPlayerDirector: isPlayerDirectingProject(commitment),
        isPlayerProducer: getOwnedStudioIds(player).has(String(details.studioId)),
    });
    const previousLift = clamp(focus.qualityLift, 0, OWNED_PRODUCTION_QUALITY_LIFT_CAP);
    const nextFocus: PlayerProductionFocus = {
        ...focus,
        [action.progressKey]: clamp((focus[action.progressKey] || 0) + action.progressGain),
    };
    const nextLift = calculateOwnedProductionQualityLift(nextFocus);
    const qualityLiftDelta = Math.max(0, nextLift - previousLift);
    nextFocus.qualityLift = nextLift;

    const nextCommitment: Commitment = {
        ...commitment,
        auditionPerformance: action.auditionGain
            ? clamp((commitment.auditionPerformance || 0) + action.auditionGain)
            : commitment.auditionPerformance,
        productionPerformance: action.performanceGain
            ? clamp((commitment.productionPerformance || 0) + action.performanceGain)
            : commitment.productionPerformance,
        promotionalBuzz: action.buzzGain
            ? clamp((commitment.promotionalBuzz || 0) + action.buzzGain, -50, 50)
            : commitment.promotionalBuzz,
        projectDetails: {
            ...details,
            playerProductionFocus: nextFocus,
            hiddenStats: {
                ...details.hiddenStats,
                qualityScore: clamp((details.hiddenStats?.qualityScore || 50) + qualityLiftDelta),
            },
        },
    };

    return {
        commitment: nextCommitment,
        action,
        focus: nextFocus,
        qualityLiftDelta,
        logMessage: buildActionLog(nextCommitment, action, qualityLiftDelta),
    };
};
