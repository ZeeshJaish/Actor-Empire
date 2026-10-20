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
const sameValueFields = (left: object, right: object) => {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => Object.prototype.hasOwnProperty.call(right, key)
        && sameValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
};

const platformInputs = (player: Player, mode: StreamingPresentationMode) => {
    const { launchProgram, ...platform } = player.ownedStreamingPlatform;
    const { defineCurrentStep: _step, defineDraft: _draft, ...program } = launchProgram;
    if (mode === 'WIZARD') return { platform, program };
    if (mode === 'BUILD_FORECAST') {
        // Customer choice reads commissioned delivery, pricing, catalogue and
        // rights. An uncommissioned network drawing is not an economy input.
        const { infrastructureSetupDraft: _networkDraft, ...forecast } = platform;
        return { platform: forecast, program };
    }
    const { contentMarketDraft: _marketDraft, buyerAuctionSessions, ...hq } = platform;
    return { platform: { ...hq,
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
    }, program };
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
    const left = platformInputs(previous, mode);
    const right = platformInputs(current, mode);
    if (!sameValueFields(left.platform, right.platform) || !sameValueFields(left.program, right.program)) return current;
    // Draft contents do not affect the audience baseline. Only introducing or
    // removing its presence can expose a legacy pre-filing footprint. Avoid
    // normalizing every licence just to compare ordinary step/rack edits.
    if (mode === 'BUILD_FORECAST'
        && Boolean(previous.ownedStreamingPlatform.infrastructureSetupDraft) !== Boolean(current.ownedStreamingPlatform.infrastructureSetupDraft)
        && !sameValue(getStreamingBuildMarketAccess(previous).countryIds, getStreamingBuildMarketAccess(current).countryIds)) return current;
    return previous;
};
