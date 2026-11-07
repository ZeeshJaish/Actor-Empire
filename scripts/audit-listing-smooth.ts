/**
 * #253: what made the listing slow must not come back. Measured in the real game on the test company: a tick of the ask's dial 285 → 17 ms, Ring the bell
 * 617 → 25 ms. The browser runs measured it; this holds the three causes, because a fixture cannot see what App.tsx adds.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');
const pass = (label: string) => console.log(`PASS ${label}`);

const hq = source('components/StreamingPlatformHQ.tsx');
assert.ok(/const persist = \(nextPlayer: Player\) => \{\s*if \(nextPlayer !== player\) \(onTrustedMarketUpdate \|\| onUpdatePlayer\)\?\.\(nextPlayer\);/.test(hq),
    'HQ passes service results through the trusted door: the other runs the whole save migration, about 200 ms on a big company');
const app = source('App.tsx');
assert.ok(/onTrustedMarketUpdate=\{handleTrustedMarketUpdate\}/.test(app), 'the App hands the trusted door down');
assert.ok(/const prepareExternal|prepareExternalPlayerUpdateForUi/.test(app) && /prepareTrustedMarketUpdateForUi\(updatedPlayer\)/.test(app), 'and that door skips the migration');
pass('HQ updates do not run the whole save migration');

assert.ok(hq.includes('{!showListing && !showContentMarket'), 'the room does not render under the listing');
pass('the Boardroom does not run underneath the listing');

const listing = source('components/streaming-transplant/StreamingListingExperience.tsx');
assert.ok(/saveTimer\.current = window\.setTimeout\(saveNow\.current, 400\)/.test(listing), 'saved when the hand stops');
assert.ok(/if \(!entered\.current\) \{ entered\.current = true; return; \}/.test(listing), 'nothing to save on the way in');
assert.ok(/useEffect\(\(\) => \(\) => saveNow\.current\(\), \[\]\)/.test(listing), 'the last move is saved on the way out');
const finish = listing.slice(listing.indexOf('const finishReal'), listing.indexOf('const finishReal') + 400);
assert.ok(/unsaved\.current = null/.test(finish), 'a waiting save cannot land on top of the listing when the bell rings');
pass('the listing saves when the hand stops, and never on top of the bell');

const host = source('components/StreamingListingHost.tsx');
assert.ok(host.includes('[player.age, player.currentWeek]'), 'it reads the company once a week, not on every save of the dial');
pass('the listing reads the company once a week');
console.log('listing-smooth audit passed');
