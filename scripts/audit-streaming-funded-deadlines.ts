import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { processStreamingFundingContracts } from '../services/streamingFundingLogic';
import type { LockedStreamingFunding } from '../types';

const fund: LockedStreamingFunding = {
    id: 'new-player-series', platformId: 'NETFLIX', platformName: 'Netflix',
    amount: 20_000_000, sourceProjectId: 'season-1', sourceTitle: 'Deadline QA',
    projectType: 'SERIES', createdWeek: 1, createdYear: 24,
};
const atAge = (ageWeeks: number, terms: LockedStreamingFunding) => processStreamingFundingContracts({
    lockedStreamingFunds: [terms], currentYear: 24 + Math.floor(ageWeeks / 52),
    currentWeek: ageWeeks % 52 + 1,
});
const playerFund = { ...fund, deadlineWeeks: 26 };
assert.equal(atAge(25, playerFund).lockedStreamingFunds.length, 1, 'new contract survives until its full 26-week allowance');
assert.equal(atAge(26, playerFund).events[0]?.type, 'DEFAULT', 'new player contract defaults after 26 weeks');
assert.equal(atAge(26, playerFund).lockedStreamingFunds.length, 0);
assert.equal(atAge(26, fund).lockedStreamingFunds.length, 1, 'legacy contract retains its original allowance');
assert.equal(atAge(103, fund).events[0]?.type, 'FINAL_WARNING');
assert.equal(atAge(104, fund).events[0]?.type, 'DEFAULT');
assert.equal(atAge(26, { ...playerFund, deadlineExtensionWeeks: 4 }).lockedStreamingFunds.length, 1);
assert.equal(atAge(30, { ...playerFund, deadlineExtensionWeeks: 4 }).events[0]?.type, 'DEFAULT');
assert.equal(atAge(18, playerFund).events[0]?.type, 'FINAL_WARNING', 'final warning remains eight weeks before the actual deadline');
assert.equal(atAge(26, { ...playerFund, usedByProjectId: 'season-2' }).events.length, 0, 'used funds never breach');
for (const deadlineWeeks of [0, -26, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(atAge(26, { ...fund, deadlineWeeks }).lockedStreamingFunds.length, 1, 'invalid optional deadlines fall back to legacy allowance');
}
const wizard = readFileSync(`${process.cwd()}/views/lifestyle/business/ReleaseWizard.tsx`, 'utf8');
assert.match(wizard, /deadlineWeeks:\s*PLAYER_STREAMING_FUNDING_DEADLINE_WEEKS/, 'newly signed player locked funds persist the deadline');
console.log('Streaming funded deadline audit passed: player26, legacy104, extension, warning, consumed funds, invalid legacy values, signing persistence.');
