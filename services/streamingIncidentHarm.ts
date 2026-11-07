/**
 * What an open incident does to the player's viewers (codex-handoff/plans/platform-tech-plan.md
 * §7, Phase 3 #51): "While an incident is open: quality drops for the affected viewers, so …
 * churn, viewing hours and revenue suffer, scaled by severity and reach."
 *
 * Each open incident hits its reach (the share of subscribers it touched when it opened) with
 * its kind's harm: the share of their viewing lost and the extra share who cancel each week.
 * A repair under way halves it (×0.48, as the engines' other effects). The world engines apply
 * the total to the player: viewing through the delivered share (worldStreamingViewing), churn
 * through the weekly churn rate (worldStreamingOffers). Revenue follows from both.
 *
 * No incident open: no harm, and the engines run exactly as before. Pure: nothing here saves.
 */
import type {
    OwnedStreamingCrisis,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingPlatformState,
    StreamingCrisisType,
    StreamingInfrastructureIncidentType,
} from '../types';

/** For the viewers an incident reaches: the share of their viewing it takes, and the extra share of them who cancel a week. Start numbers (Phase 5 tunes them). */
export const STREAMING_INCIDENT_HARM: Record<StreamingCrisisType | StreamingInfrastructureIncidentType, { viewing: number; churn: number }> = {
    /* crises */
    PLATFORM_OUTAGE: { viewing: .7, churn: .12 },
    ACCOUNT_BREACH: { viewing: .15, churn: .1 },
    /* a title on pirate sites (#55): the people it reaches watch the pirated copy instead */
    CONTENT_LEAK: { viewing: .35, churn: .02 },
    RECOMMENDATION_BACKLASH: { viewing: .2, churn: .05 },
    RIGHTS_COMPLIANCE: { viewing: .25, churn: .04 },
    EMPLOYEE_ALLEGATION: { viewing: 0, churn: .02 },
    /* what Playback and Apps can break (#53): an app that will not play, a feature that fails, streams slow at peak */
    APP_CRASH: { viewing: .6, churn: .06 },
    FEATURE_BROKEN: { viewing: .1, churn: .03 },
    SLOW_STREAMING: { viewing: .25, churn: .04 },
    /* server incidents */
    POWER_FAILURE: { viewing: .8, churn: .1 },
    REGIONAL_OUTAGE: { viewing: .8, churn: .1 },
    COOLING_INCIDENT: { viewing: .5, churn: .06 },
    FIBRE_CUT: { viewing: .5, churn: .06 },
    TRAFFIC_SPIKE: { viewing: .5, churn: .06 },
    CYBERATTACK: { viewing: .6, churn: .08 },
    DDOS_ATTACK: { viewing: .6, churn: .08 },
    RIVAL_SABOTAGE: { viewing: .6, churn: .08 },
};
const REPAIRING = .48;
/** the most an incident can reach, and the most all of them together can take */
const MAX_REACH = .5;
const MAX_VIEWING_LOSS = .6;
const MAX_EXTRA_CHURN = .05;

export interface StreamingIncidentHarmRow {
    id: string;
    source: 'CRISIS' | 'INFRASTRUCTURE';
    /** the share of subscribers it reaches */
    reach: number;
    /** of all the player's viewing, the share it takes this week */
    viewingLoss: number;
    /** of all the player's subscribers, the extra share who cancel this week */
    extraChurn: number;
}

export interface StreamingIncidentHarm {
    viewingLoss: number;
    extraChurn: number;
    rows: StreamingIncidentHarmRow[];
}

const NO_HARM: StreamingIncidentHarm = { viewingLoss: 0, extraChurn: 0, rows: [] };

/** The open incidents' harm this week, from the save alone (cheap: the world engines read it every close). */
export const getStreamingIncidentHarm = (
    platform: Pick<OwnedStreamingPlatformState, 'crisisSecurity' | 'weeklyHistory' | 'metrics'>,
): StreamingIncidentHarm => {
    const crises: OwnedStreamingCrisis[] = platform.crisisSecurity?.crises || [];
    const incidents: OwnedStreamingInfrastructureIncident[] = platform.crisisSecurity?.infrastructureOperations?.incidents || [];
    const open = [
        ...crises.filter(item => item.stage !== 'RESOLVED').map(item => ({ item, source: 'CRISIS' as const })),
        ...incidents.filter(item => item.stage !== 'RESOLVED').map(item => ({ item, source: 'INFRASTRUCTURE' as const })),
    ];
    if (!open.length) return NO_HARM;
    const subscribers = Math.max(1, platform.weeklyHistory?.at(-1)?.subscribers ?? platform.metrics?.subscribers ?? 1);
    const rows = open.map(({ item, source }) => {
        const profile = STREAMING_INCIDENT_HARM[item.type] || { viewing: 0, churn: 0 };
        const reach = Math.min(MAX_REACH, Math.max(0, item.affectedSubscribers / subscribers));
        const stage = item.stage === 'RECOVERING' ? REPAIRING : 1;
        return { id: item.id, source, reach, viewingLoss: reach * profile.viewing * stage, extraChurn: reach * profile.churn * stage };
    });
    return {
        viewingLoss: Math.min(MAX_VIEWING_LOSS, rows.reduce((sum, row) => sum + row.viewingLoss, 0)),
        extraChurn: Math.min(MAX_EXTRA_CHURN, rows.reduce((sum, row) => sum + row.extraChurn, 0)),
        rows,
    };
};
