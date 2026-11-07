/**
 * What a viewer meets while an incident is open (codex-handoff/plans/platform-tech-plan.md §8,
 * Phase 3 #58): "an outage banner ("We're fixing an issue") while an incident is open; buffering
 * when load is high; a downloads icon."
 *
 * One banner: the open incident viewers would notice, a crisis or a server incident, in the app's
 * words, and what it does in the app:
 *   - stall: titles stall once and drop to 480p (an outage, slow streams, a server incident);
 *   - downloads: Downloads is what broke, so the Download button pauses;
 *   - app: the screen whose app keeps closing.
 * A title on pirate sites, a recommendation backlash, a rights problem or a staff allegation is
 * the operator's business: no banner. While a fix is under way it reads "A fix is rolling out".
 * None open: null, and the app is as it was. Pure: reads the save, writes nothing.
 */
import type {
    OwnedStreamingCrisis,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingPlatformState,
    StreamingCrisisSeverity,
    StreamingInfrastructureIncidentType,
} from '../types';
import { getStreamingTechDefinition } from './streamingTechTreeCatalogue';
import { STREAMING_APP_SCREEN_NAMES } from './streamingCrisisSecurity';
import { getStreamingServerSite } from './streamingServerSites';
import { STREAMING_DAY_ONE_REGION_LABELS } from './streamingDayOneMarkets';
import type { StreamingViewerPlan } from './streamingViewerQuality';

export interface StreamingViewerOutage {
    /** "We're fixing an issue" while nobody has answered it; "A fix is rolling out" while it is repaired */
    headline: string;
    /** what viewers notice, in the app's words */
    line: string;
    /** titles stall: the player buffers once and drops to 480p */
    stall: boolean;
    /** Downloads is what broke: the Download button pauses */
    downloadsDown: boolean;
}

const SEVERITY_RANK: Record<StreamingCrisisSeverity, number> = { MINOR: 0, SERIOUS: 1, MAJOR: 2, CRITICAL: 3 };

/** A crisis as viewers meet it; null when viewers would not notice it. */
const crisisWords = (crisis: OwnedStreamingCrisis): Omit<StreamingViewerOutage, 'headline'> | null => {
    if (crisis.type === 'PLATFORM_OUTAGE') return { line: 'Some titles may not start, or may stop part way. We\'re on it.', stall: true, downloadsDown: false };
    if (crisis.type === 'SLOW_STREAMING') return { line: 'Titles may be slow to start at busy times.', stall: true, downloadsDown: false };
    if (crisis.type === 'ACCOUNT_BREACH') return { line: 'We\'ve reset some passwords to keep accounts safe. Sign in again if we ask you to.', stall: false, downloadsDown: false };
    if (crisis.type === 'APP_CRASH') {
        const screen = (crisis.techId && STREAMING_APP_SCREEN_NAMES[crisis.techId]) || 'one of our';
        return { line: `The ${screen} app may close while you watch. Your other screens work as usual.`, stall: false, downloadsDown: false };
    }
    if (crisis.type === 'FEATURE_BROKEN') {
        if (crisis.techId === 'PLAY_DOWNLOADS') return { line: 'Downloads aren\'t working right now. Streaming works as usual.', stall: false, downloadsDown: true };
        const name = (crisis.techId && getStreamingTechDefinition(crisis.techId)?.name) || 'A feature';
        return { line: `${name} isn't working right now. Everything else works as usual.`, stall: false, downloadsDown: false };
    }
    return null;
};

const SERVER_LINES: Record<StreamingInfrastructureIncidentType, (region: string) => string> = {
    POWER_FAILURE: region => `Some viewers in ${region} can't start titles right now.`,
    REGIONAL_OUTAGE: region => `Some viewers in ${region} can't start titles right now.`,
    COOLING_INCIDENT: region => `Titles may be slow to start in ${region}.`,
    FIBRE_CUT: region => `Titles may be slow to start in ${region}.`,
    TRAFFIC_SPIKE: region => `So many people are watching in ${region} that some titles are slow to start.`,
    CYBERATTACK: () => 'We\'re blocking an attack on our service. Some titles may be slow to start.',
    DDOS_ATTACK: () => 'We\'re blocking an attack on our service. Some titles may be slow to start.',
    RIVAL_SABOTAGE: () => 'We\'re fixing a fault. Some titles may be slow to start.',
};

/** The banner the viewer app shows, or null when nothing viewers would notice is open. */
export const getStreamingViewerOutage = (
    platform: Pick<OwnedStreamingPlatformState, 'crisisSecurity'>,
): StreamingViewerOutage | null => {
    const crises = (platform.crisisSecurity?.crises || []).filter(item => item.stage !== 'RESOLVED');
    const incidents: OwnedStreamingInfrastructureIncident[] = (platform.crisisSecurity?.infrastructureOperations?.incidents || [])
        .filter(item => item.stage !== 'RESOLVED');
    const rows = [
        ...crises.flatMap(crisis => {
            const words = crisisWords(crisis);
            return words ? [{ words, repairing: crisis.stage === 'RECOVERING', severity: crisis.severity }] : [];
        }),
        ...incidents.map(incident => {
            const region = getStreamingServerSite(incident.cityId)?.regionId;
            const name = (region && STREAMING_DAY_ONE_REGION_LABELS[region as keyof typeof STREAMING_DAY_ONE_REGION_LABELS]) || 'your area';
            return { words: { line: SERVER_LINES[incident.type](name), stall: true, downloadsDown: false },
                repairing: incident.stage === 'RECOVERING', severity: incident.severity };
        }),
    ];
    if (!rows.length) return null;
    // the one viewers feel most: titles stalling first, then the worst, then one nobody has answered
    const top = [...rows].sort((left, right) => Number(right.words.stall) - Number(left.words.stall)
        || SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
        || Number(left.repairing) - Number(right.repairing))[0];
    return { headline: top.repairing ? 'A fix is rolling out' : 'We\'re fixing an issue', ...top.words,
        // a broken Downloads pauses the button whichever banner shows
        downloadsDown: rows.some(row => row.words.downloadsDown) };
};

/** The Download button on a title (#58): ON on a plan with downloads, PAUSED while an incident has
 *  broken them, PLAN on a plan without them (it opens the plans that have them); null where no plan
 *  sells downloads, or the app has no plans (the prototype's state). */
export type StreamingViewerDownloadState = 'ON' | 'PAUSED' | 'PLAN';
export const streamingViewerDownloadState = (
    plan: Pick<StreamingViewerPlan, 'features'> | null,
    plans: ReadonlyArray<Pick<StreamingViewerPlan, 'features'>>,
    outage: Pick<StreamingViewerOutage, 'downloadsDown'> | null | undefined,
): StreamingViewerDownloadState | null => {
    const has = (item: Pick<StreamingViewerPlan, 'features'>) => item.features.includes('Downloads');
    if (!plan || !plans.some(has)) return null;
    if (!has(plan)) return 'PLAN';
    return outage?.downloadsDown ? 'PAUSED' : 'ON';
};
