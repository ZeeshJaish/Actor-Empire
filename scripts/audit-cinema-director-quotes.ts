import assert from 'node:assert/strict';
import {INITIAL_PLAYER} from '../types';
import {quoteOwnedDirector} from './fixtures/cinemaOwnedStudioActions';
const actor={id:'director-101',name:'Professional director',tier:'A_LIST',stats:{talent:90,fame:90},occupation:'DIRECTOR'};
const a=quoteOwnedDirector(INITIAL_PLAYER,actor),b=quoteOwnedDirector(INITIAL_PLAYER,{...actor,id:'director-102'});
assert.equal(a.cost,b.cost,'Changing an internal identifier cannot change a director fee when the visible package is identical');
const explicit=quoteOwnedDirector(INITIAL_PLAYER,{...actor,salary:123456789});assert.equal(explicit.cost,123456789,'A disclosed ask remains binding even above the default estimate');
console.log(JSON.stringify({passed:2,defaultQuote:a.cost,explicitQuote:explicit.cost,kind:'CONTROLLED_QUOTE_CASES_NOT_EARNINGS_PROOF'}));
