import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {quoteCinemaRightsForBuyer} from '../services/boxOffice/boxOfficeRightsAdapter';
import {migratePlayerSave} from '../services/saveMigration';
import type {Player} from '../types';

const checkpoint=JSON.parse(gunzipSync(readFileSync(process.env.LIFETIME_LEGACY_CHECKPOINT||'/tmp/ae-lifetime-final-boosted/boosted/career-0.json.gz')).toString());
const player=checkpoint.player as Player;
const before=JSON.stringify(player);
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const defective=player.activeReleases.filter(r=>r.projectDetails.cinemaExposure?.events.some(e=>e.titleId!==r.id));
assert.ok(defective.length,'Use the actual retained failing save, not an empty synthetic case');
for(const release of defective){
    const quote=quoteCinemaRightsForBuyer(player,release.projectDetails,release.id,'NETFLIX');
    assert.ok(Number.isFinite(quote.maximumBidCents));
}
assert.equal(hash(player),hash(JSON.parse(before)),'A quote must not erase cash, contracts, events or settlement history');
const imported=migratePlayerSave(JSON.parse(before));
assert.equal(imported.money,player.money,'The original failed-save wallet survives migration');
// Migration can add optional undefined fields; compare their persisted representation.
assert.equal(hash(imported.finance.loans),hash(player.finance.loans));
assert.equal(hash(imported.world.streamingRightsContracts),hash(player.world.streamingRightsContracts));
console.log(JSON.stringify({week:checkpoint.weeks,cash:player.money,repairedReadTitles:defective.map(r=>({id:r.id,name:r.name})),sourceUnchanged:true,contractsAndLoansPreserved:true}));
