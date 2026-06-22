import {
    advanceRightsInvestigations,
    advanceRightsMarket,
    createInitialRightsMarket,
    getRightsInvestigationQuote,
    normalizeRightsOpportunity,
    resolveRightsInvestigationDecision,
    startRightsInvestigation,
} from '../services/rightsMarket';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const context = {
    currentWeek: 20,
    studioId: 'studio_inside_report',
    studioBalance: 300_000_000,
    studioPrestige: 60,
};

const initial = createInitialRightsMarket(context);
const target = initial.opportunities[0];
const quote = getRightsInvestigationQuote(target);
const repeatedQuote = getRightsInvestigationQuote(target);

assert(JSON.stringify(quote) === JSON.stringify(repeatedQuote), 'investigation quote must be deterministic');
assert(quote.cost > 0, 'investigation must have a cost');
assert(quote.durationWeeks >= 1 && quote.durationWeeks <= 3, 'investigation must take one to three weeks');

const started = startRightsInvestigation({
    opportunities: initial.opportunities,
    opportunityId: target.id,
    currentWeek: context.currentWeek,
    studioBalance: context.studioBalance,
});
assert(started.changed, 'a valid investigation must start');
assert(started.cost === quote.cost, 'start transition must use the quoted cost');
const investigating = started.opportunities.find(item => item.id === target.id)!;
assert(investigating.investigationStatus === 'INVESTIGATING', 'started lead must be investigating');
assert(investigating.isTracked, 'investigation must automatically track the lead');
assert(
    investigating.expiresAtWeek >= (investigating.investigationCompletesWeek || 0) + 1,
    'due diligence must protect the lead through report delivery',
);

const tooPoor = startRightsInvestigation({
    opportunities: initial.opportunities,
    opportunityId: target.id,
    currentWeek: context.currentWeek,
    studioBalance: quote.cost - 1,
});
assert(!tooPoor.changed && tooPoor.reason === 'INSUFFICIENT_FUNDS', 'insufficient funds must block investigation');

let active = started.opportunities;
const secondId = active.find(item => item.id !== target.id)!.id;
active = startRightsInvestigation({
    opportunities: active,
    opportunityId: secondId,
    currentWeek: context.currentWeek,
    studioBalance: context.studioBalance,
}).opportunities;
const thirdId = active.find(item => ![target.id, secondId].includes(item.id))!.id;
const thirdAttempt = startRightsInvestigation({
    opportunities: active,
    opportunityId: thirdId,
    currentWeek: context.currentWeek,
    studioBalance: context.studioBalance,
});
assert(!thirdAttempt.changed && thirdAttempt.reason === 'ACTIVE_LIMIT', 'only two reports may run at once');

const early = advanceRightsInvestigations(started.opportunities, context.currentWeek);
assert(early.newlyReady.length === 0, 'report must not finish early');

const completionWeek = investigating.investigationCompletesWeek!;
const completed = advanceRightsInvestigations(started.opportunities, completionWeek);
const ready = completed.opportunities.find(item => item.id === target.id)!;
assert(completed.newlyReady.length === 1, 'completion must identify one newly ready report');
assert(ready.investigationStatus === 'REPORT_READY', 'completed investigation must become report ready');
assert(ready.insideReport?.estimatedValueLow !== undefined, 'inside report must reveal a value range');
assert(ready.insideReport?.hiddenAdvantage.length, 'inside report must reveal an advantage');
assert(ready.insideReport?.hiddenDanger.length, 'inside report must reveal a danger');

const repeatedCompletion = advanceRightsInvestigations(completed.opportunities, completionWeek + 1);
assert(repeatedCompletion.newlyReady.length === 0, 'ready report must not notify twice');
assert(
    JSON.stringify(repeatedCompletion.opportunities.find(item => item.id === target.id)?.insideReport)
        === JSON.stringify(ready.insideReport),
    'inside report must not reroll',
);

const pursued = resolveRightsInvestigationDecision(completed.opportunities, target.id, 'PURSUE', initial.cycle);
assert(pursued.changed, 'pursue decision must succeed');
assert(
    pursued.opportunities.find(item => item.id === target.id)?.investigationStatus === 'PURSUIT_READY',
    'pursued lead must become pursuit ready',
);

const walked = resolveRightsInvestigationDecision(completed.opportunities, target.id, 'WALK_AWAY', initial.cycle);
assert(walked.changed, 'walk-away decision must succeed');
const dismissed = walked.opportunities.find(item => item.id === target.id)!;
assert(dismissed.investigationStatus === 'DISMISSED' && !dismissed.isTracked, 'walked-away lead must be dismissed');

const oldSave = normalizeRightsOpportunity({
    ...target,
    investigationStatus: undefined,
    insideReport: undefined,
});
assert(oldSave.investigationStatus === 'NONE', 'old listings must normalize to uninvestigated');

const expiryProtected = advanceRightsMarket({
    opportunities: started.opportunities.map(item => item.id === target.id
        ? { ...item, expiresAtWeek: completionWeek - 1 }
        : item),
    notices: [],
    currentWeek: completionWeek,
    studioId: context.studioId,
    studioBalance: context.studioBalance,
    studioPrestige: context.studioPrestige,
    previousCycle: initial.cycle,
});
assert(
    expiryProtected.opportunities.some(item => item.id === target.id),
    'active due diligence must survive market expiry',
);

console.log('Rights investigation audit passed');
