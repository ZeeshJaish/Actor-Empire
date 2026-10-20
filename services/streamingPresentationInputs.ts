import type { Player } from '../types';
import { getStreamingBuildMarketAccess } from './streamingBuildMarketAccess';

const sameFieldsExcept = (left: object, right: object, excluded: readonly string[]) => {
    const keys = Object.keys(left).filter(key => !excluded.includes(key));
    return keys.length === Object.keys(right).filter(key => !excluded.includes(key)).length
        && keys.every(key => Object.is((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
};
const sameValue = (left: unknown, right: unknown) => Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);

const sameProjectInputs = (left: Player['pastProjects'], right: Player['pastProjects']) => left === right
    || left.length === right.length && left.every((project, index) => (
        sameFieldsExcept(project, right[index], ['awards']) && sameValue(project.awards, right[index].awards)
    ));

type StreamingPresentationMode = 'HQ' | 'WIZARD' | 'BUILD_FORECAST';
const platformInputs = (player: Player, mode: StreamingPresentationMode) => {
    const { launchProgram, ...platform } = player.ownedStreamingPlatform;
    const { defineCurrentStep: _step, defineDraft: _draft, ...program } = launchProgram;
    if (mode === 'WIZARD') return JSON.stringify({ ...platform, launchProgram: program });
    if (mode === 'BUILD_FORECAST') {
        // Customer choice reads commissioned delivery, pricing, catalogue and
        // rights. An uncommissioned network drawing is not an economy input.
        const { infrastructureSetupDraft: _networkDraft, ...forecast } = platform;
        return JSON.stringify({ ...forecast, launchProgram: program,
            // A draft exposes inherited countries only for legacy pre-filing
            // careers. Filed markets keep the same footprint on their first edit.
            buildCountryIds: getStreamingBuildMarketAccess(player).countryIds,
        });
    }
    const { contentMarketDraft: _marketDraft, buyerAuctionSessions, ...hq } = platform;
    return JSON.stringify({ ...hq, launchProgram: program,
        // Clock/AI offers do not change catalogue reads. Player reservations,
        // settlement and lot terms can affect finances/eligibility and remain inputs.
        buyerAuctionSessions: buyerAuctionSessions.map(session => {
            const { roomSecondsRemaining: _remaining, activeSecondsElapsed: _elapsed,
                hardClosesAtSecond: _close, lastExtensionSeconds: _extension,
                lastExtensionAtSecond: _extendedAt, materialEventCount: _eventsCount,
                lastRealtimeAtMs: _time, rivals: _rivals, events: _events,
                leaderBidId: _leader, bids, ...canonical } = session;
            return { ...canonical, bids: bids.filter(bid => bid.bidderId === session.playerBidderId) };
        }),
    });
};

/** Read-only projection reuse for immutable canonical players. Actual actions
 * always receive the current player. Unknown canonical fields fail closed by
 * invalidating; this never caches authorization or skips transaction validation.
 * Trusted UI preparation clones universes/projects/awards without changing them. */
export const reuseStreamingPresentationSource = (
    previous: Player, current: Player, mode: StreamingPresentationMode = 'HQ',
): Player => {
    if (previous === current) return previous;
    if (!sameFieldsExcept(previous, current, ['ownedStreamingPlatform', 'world', 'pastProjects', 'awards'])
        || !sameFieldsExcept(previous.world, current.world, ['universes'])
        || !sameValue(previous.world.universes, current.world.universes)
        || !sameValue(previous.awards, current.awards)
        || !sameProjectInputs(previous.pastProjects, current.pastProjects)) return current;
    return platformInputs(previous, mode) === platformInputs(current, mode) ? previous : current;
};
