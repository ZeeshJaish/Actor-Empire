import assert from 'node:assert/strict';
import { mixedCinemaFixture } from './audit-box-office-integration';
import { processCinemaMarketWeek, processUnexposedOwnedCinemaMarketWeek } from '../services/boxOffice/boxOfficeWeek';
import { commitCinemaWeek } from '../services/boxOffice/boxOfficeLiveSettlement';
import { clonePlayerForWeekProcessing } from '../services/gameLoopClone';

const fixture = mixedCinemaFixture(), durable = JSON.stringify(fixture.player);
const publicSource = clonePlayerForWeekProcessing(fixture.player);
const ownedSource = clonePlayerForWeekProcessing(fixture.player);
const clone = globalThis.structuredClone;
let marketCopies = 0;
const instrument = () => {
    globalThis.structuredClone = ((v: any, ...args: any[]) => {
        if (v?.schemaVersion === 1 && v.lastProcessedAbsoluteWeek === fixture.week && Array.isArray(v.titles) && Array.isArray(v.affinities)) marketCopies++;
        return (clone as any)(v, ...args);
    }) as typeof clone;
};
let exposed: ReturnType<typeof processCinemaMarketWeek>;
instrument();
try { exposed = processCinemaMarketWeek(publicSource, fixture.week, undefined, { reuseDetachedWeekCandidate: true }); }
finally { globalThis.structuredClone = clone; }
assert.equal(marketCopies, 1, 'A diagnostic proposal that can escape must retain its detached settlement copy');
const settled = JSON.stringify(exposed!.player);
const proposal = exposed!.result;
assert.equal(commitCinemaWeek(exposed!.player, proposal).applied, false, 'Replays pay nothing');
proposal.nextState.titles[0].cells[0].awarePeople++;
proposal.nextState.runs[0].closed = !proposal.nextState.runs[0].closed;
assert.equal(JSON.stringify(exposed!.player), settled, 'Changing an exposed proposal must not alter settled state');

marketCopies = 0; instrument();
let owned: ReturnType<typeof processUnexposedOwnedCinemaMarketWeek>;
try { owned = processUnexposedOwnedCinemaMarketWeek(ownedSource, fixture.week); }
finally { globalThis.structuredClone = clone; }
assert.equal(JSON.stringify(owned!), settled, 'Private ownership must retain every full player/receipt value and key order');
assert.equal(JSON.stringify(fixture.player), durable, 'The entire durable prior player is immutable');
assert.equal(marketCopies, 0, 'A player-only synchronous owner must not deep-copy its private detached next market again');
console.log(JSON.stringify({ passed: 6, privateMarketCopies: marketCopies, fullPlayerExact: true, publicProposalStillDetached: true, replayPaysNothing: true }));
