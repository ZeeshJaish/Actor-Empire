import {
    advanceRightsMarket,
    commissionRightsScouting,
    createInitialRightsMarket,
    getFeaturedRightsOpportunity,
    normalizeRightsMarketState,
    toggleTrackedOpportunity,
} from '../services/rightsMarket';
import { normalizeStudioState } from '../services/businessLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const context = {
    currentWeek: 20,
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
};

const initial = createInitialRightsMarket(context);

assert(initial.opportunities.length === 6, 'initial market must contain six leads');
assert(new Set(initial.opportunities.map(item => item.id)).size === 6, 'lead ids must be unique');
assert(new Set(initial.opportunities.map(item => item.title)).size === 6, 'lead titles must be unique');
assert(initial.opportunities.every(item => item.expiresAtWeek > 20), 'all leads must start active');

const repeated = createInitialRightsMarket(context);
assert(
    JSON.stringify(initial.opportunities) === JSON.stringify(repeated.opportunities),
    'same studio and week must generate the same initial market',
);

let trackedOpportunities = toggleTrackedOpportunity(initial.opportunities, initial.opportunities[0].id).opportunities;
trackedOpportunities = toggleTrackedOpportunity(trackedOpportunities, initial.opportunities[1].id).opportunities;
trackedOpportunities = toggleTrackedOpportunity(trackedOpportunities, initial.opportunities[2].id).opportunities;
const fourthTrack = toggleTrackedOpportunity(trackedOpportunities, initial.opportunities[3].id);
assert(!fourthTrack.changed, 'fourth tracked lead must be rejected');
assert(fourthTrack.reason === 'TRACK_LIMIT', 'fourth tracked lead must explain the limit');

const advanced = advanceRightsMarket({
    opportunities: trackedOpportunities,
    notices: [],
    currentWeek: Math.max(...trackedOpportunities.map(item => item.expiresAtWeek)),
    studioId: context.studioId,
    studioBalance: context.studioBalance,
    studioPrestige: context.studioPrestige,
    previousCycle: initial.cycle,
});
assert(advanced.opportunities.length === 6, 'advance must refill market to six leads');
assert(advanced.notices.some(notice => notice.kind === 'EXPIRED'), 'tracked expiry must create a notice');

const scouting = commissionRightsScouting({
    opportunities: advanced.opportunities,
    currentWeek: 24,
    studioId: context.studioId,
    studioBalance: context.studioBalance,
    studioPrestige: context.studioPrestige,
    currentCycle: 6,
    lastScoutingCycle: -1,
});
assert(scouting.changed, 'first scouting action in a cycle must succeed');
assert(scouting.cost === 250_000, 'scouting must cost $250k');
assert(scouting.addedIds.length <= 2, 'scouting must add at most two leads');
assert(
    !scouting.opportunities.some(item => item.rarity === 'LEGENDARY' && scouting.addedIds.includes(item.id)),
    'scouting cannot force legendary leads',
);

const repeatedScouting = commissionRightsScouting({
    opportunities: scouting.opportunities,
    currentWeek: 24,
    studioId: context.studioId,
    studioBalance: context.studioBalance,
    studioPrestige: context.studioPrestige,
    currentCycle: 6,
    lastScoutingCycle: 6,
});
assert(!repeatedScouting.changed, 'scouting must be limited to once per cycle');
assert(repeatedScouting.reason === 'ALREADY_SCOUTED', 'repeat scouting must explain its lock');

const normalized = normalizeRightsMarketState(undefined, context);
assert(normalized.opportunities.length === 6, 'old saves must initialize safely');
assert(getFeaturedRightsOpportunity(normalized.opportunities) !== undefined, 'market must select a featured lead');

const oldSaveIpMarket = [{
    id: 'source_market_sentinel',
    title: 'Do Not Replace',
    genres: ['DRAMA'],
    status: 'READY',
    quality: 50,
    options: [],
    writerId: null,
    weeksInDevelopment: 0,
    totalDevelopmentWeeks: 0,
    isOriginal: false,
    projectType: 'MOVIE',
}] as any;
const migratedStudioState = normalizeStudioState({ ipMarket: oldSaveIpMarket }, 20);
assert(migratedStudioState.ipMarket[0]?.id === 'source_market_sentinel', 'migration must preserve the source-material market');
assert(Array.isArray(migratedStudioState.rightsMarket), 'migration must add a safe rights-market collection');
assert(migratedStudioState.rightsMarket?.length === 0, 'generic save normalization must wait for the real studio context');

console.log('Rights Market audit passed');
