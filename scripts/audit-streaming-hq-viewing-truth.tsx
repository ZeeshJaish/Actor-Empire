import assert from 'node:assert/strict';
import * as metrics from '../services/streamingAudienceMetrics';
const summarize=(metrics as any).getStreamingHqViewingSpotlight;
assert.equal(typeof summarize,'function');
assert.equal(summarize([]),undefined,'a launch must wait for measured weekly viewing');
assert.equal(summarize([{title:'Zero',viewingAccounts:0}]),undefined,'zero cannot be displayed as one viewer');
assert.equal(summarize([{title:'Bad',viewingAccounts:Infinity}]),undefined);
assert.deepEqual(summarize([{title:'One',viewingAccounts:1},{title:'Recorded',viewingAccounts:120}]),{
 title:'Recorded',watching:120,periodLabel:'watched this week',headingLabel:'MOST WATCHED THIS WEEK'
},'the weekly count is not divided into an invented realtime estimate');
console.log('HQ recorded-viewing truth audit passed.');
