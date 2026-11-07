import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    buyOriginalAudienceReport,
    getActiveAudienceReport,
    getOriginalAudienceGaps,
    getOriginalAudienceReportPrice,
    getScriptGapFit,
    ORIGINAL_AUDIENCE_REPORT_WEEKS,
} from '../services/originalsAudienceReport';

/* #280: a paid look at what is missing, from the audience the viewing engine really reads. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'audience-report-audit', name: 'Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const base = prepareStreamingFullPlatformQa(fresh());

/* --- what it finds */
const gaps = getOriginalAudienceGaps(base);
assert.ok(gaps.length >= 1 && gaps.length <= 3, `up to 3 gaps, got ${gaps.length}`);
assert.equal(new Set(gaps.map(gap => gap.countryId)).size, gaps.length, 'one a country');
for (const gap of gaps) {
    assert.ok(gap.wantPercent > gap.havePercent, `${gap.title}: they want more than you have`);
    assert.ok(gap.homes > 0);
    assert.ok(gap.countryName && gap.title);
    assert.ok(gap.genre || gap.language);
}
console.log(gaps.map(gap => `${gap.title}, ${gap.countryName}: want ${gap.wantPercent}%, have ${gap.havePercent}%, ${(gap.homes / 1e6).toFixed(1)}M homes`).join('\n'));

/* --- the price follows the company */
const withSize = (treasuryCash: number, subscribers: number): Player => ({ ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, treasuryCash, metrics: { ...base.ownedStreamingPlatform.metrics, subscribers } } });
const small = getOriginalAudienceReportPrice(withSize(30_000_000, 10_000));
const middle = getOriginalAudienceReportPrice(withSize(300_000_000, 1_500_000));
const big = getOriginalAudienceReportPrice(withSize(5_000_000_000, 40_000_000));
assert.ok(small >= 250_000 && small < middle && middle < big && big <= 2_000_000, `${small} ${middle} ${big}`);
assert.ok(middle >= 400_000 && middle <= 600_000, `about $500K in the middle, got ${middle}`);

/* --- buying it: money only, and it lasts */
const rich = withSize(300_000_000, 1_500_000);
assert.equal(getActiveAudienceReport(rich), null);
const energyBefore = rich.energy.current;
const bought = buyOriginalAudienceReport(rich);
assert.equal(bought.changed, true);
assert.equal(bought.player.ownedStreamingPlatform.treasuryCash, 300_000_000 - middle);
assert.equal(bought.player.energy.current, energyBefore, 'no energy');
const report = getActiveAudienceReport(bought.player)!;
assert.ok(report && report.gaps.length === gaps.length);
assert.equal(report.expiresAtAbsoluteWeek - report.boughtAtAbsoluteWeek, ORIGINAL_AUDIENCE_REPORT_WEEKS);
assert.equal(buyOriginalAudienceReport(bought.player).changed, false, 'one at a time');
const later: Player = { ...bought.player, currentWeek: bought.player.currentWeek + ORIGINAL_AUDIENCE_REPORT_WEEKS };
assert.equal(getActiveAudienceReport(later), null, 'it runs out');
const refused = buyOriginalAudienceReport(withSize(10, 0));
assert.equal(refused.changed, false);
assert.equal(refused.player.ownedStreamingPlatform.treasuryCash, 10);

/* --- the tag */
const genreGap = report.gaps.find(gap => gap.genre);
if (genreGap) {
    assert.equal(getScriptGapFit(bought.player, [genreGap.genre!])?.id, genreGap.id);
    assert.equal(getScriptGapFit(rich, [genreGap.genre!]), null, 'no report, no tag');
    assert.equal(getScriptGapFit(later, [genreGap.genre!]), null, 'run out, no tag');
}
assert.equal(getScriptGapFit(bought.player, ['NOT_A_GENRE']), null);

/* --- the catalogue moves the gap */
const allGenre = (genre: string): Player => ({
    ...rich,
    ownedStreamingPlatform: { ...rich.ownedStreamingPlatform, catalogProjectIds: [] },
    world: { ...rich.world },
});
const emptyCatalogue = getOriginalAudienceGaps(allGenre('DRAMA'));
assert.ok(emptyCatalogue.every(gap => gap.havePercent === 0), 'with nothing on the shelf you have 0%');

console.log('audience report audit passed');
