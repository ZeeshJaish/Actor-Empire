import assert from 'node:assert/strict';
import { ALL_GENRES } from '../services/genreCatalog';
import {
    getEffectsCostShare,
    getEffectsMixQuality,
    getGearLineQuality,
    getGearQuality,
    getPacingEffect,
    getSetupQualityAdjustment,
    getVisualStyleQuality,
    PACING_EFFECTS,
} from '../services/greenlightSetupEffects';
import { calculateGreenlightBudget, calculateGreenlightEstimatedQuality } from '../views/lifestyle/business/greenlightCalculations';
import { GREENLIGHT_GEAR_TIERS } from '../views/lifestyle/business/components/GreenlightEquipmentStep';
import { resolveStreamingViewingProjectFacts } from '../services/worldEconomy/worldStreamingViewing';
import { makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';
import { buildCinemaChoices } from '../services/boxOffice/boxOfficeAudience';

/* --- gear: every tier beats the one under it, and the screen's number is the real one */
const tiers = Object.values(GREENLIGHT_GEAR_TIERS).map(tier => tier.quality);
const gearAt = tiers.map(getGearQuality);
gearAt.forEach((value, index) => { if (index) assert.ok(value > gearAt[index - 1] + 0.3, `tier ${index + 1} must beat tier ${index}`); });
assert.ok(gearAt[4] > gearAt[3] + 1, 'tier 5 really beats tier 4');
assert.ok(gearAt[4] <= 6.1, 'gear stays a small part of quality');
for (const level of [0, 1, 2, 5, 8]) assert.ok(Math.abs(getGearQuality(level) - 4 * (1 - Math.exp(-level / 4))) < 1e-9, 'tiers 1 to 3 are as they were');
assert.deepEqual(tiers.map(getGearLineQuality), [0.4, 0.7, 0.9, 1.1, 1.5]);

const quality = (tier: string, extra: Record<string, unknown> = {}) => calculateGreenlightEstimatedQuality({
    scriptQuality: 70, directorQuality: 70, castingStrength: 70, crewQualities: [70], ownedEquipmentLevels: {}, gearTiers: GREENLIGHT_GEAR_TIERS as any,
    equipmentChoices: { cameras: tier, lighting: tier, sound: tier, practicalEffects: tier },
    locationQualities: [5], storyFitQualityAdjustment: 0, backgroundAuthenticity: 50, backgroundReliability: 50, backgroundSetCare: 50, ...extra,
});
assert.ok(quality('TIER_5') > quality('TIER_4'), 'the estimate moves when all four lines go up a tier');

/* --- the look and the effects mix */
const STYLES = ['REALISTIC', 'STYLISTIC', 'GRITTY', 'VIBRANT', 'MINIMALIST', 'NOIR'];
for (const genre of ALL_GENRES) {
    const fits = STYLES.map(style => getVisualStyleQuality(genre, style));
    assert.ok(Math.max(...fits) >= 1, `${genre} has a look that suits it`);
    assert.ok(fits.every(fit => fit >= -1 && fit <= 2));
    const mixes = [0, 25, 50, 75, 100].map(tone => getEffectsMixQuality(genre, tone));
    assert.ok(Math.max(...mixes) - Math.min(...mixes) >= 1.5, `${genre}: the slider matters`);
}
assert.ok(getEffectsMixQuality('SCI_FI', 100) > getEffectsMixQuality('SCI_FI', 0), 'sci-fi leans to CGI');
assert.ok(getEffectsMixQuality('DRAMA', 0) > getEffectsMixQuality('DRAMA', 100), 'drama leans to practical');
assert.ok(quality('TIER_3', { setupQualityAdjustment: getSetupQualityAdjustment('HORROR', 'GRITTY', 30) }) > quality('TIER_3', { setupQualityAdjustment: getSetupQualityAdjustment('HORROR', 'VIBRANT', 100) }));
assert.equal(quality('TIER_3'), quality('TIER_3', { setupQualityAdjustment: 0 }), 'an old call is unchanged');

/* --- the effects bill */
const bill = (tone?: number) => calculateGreenlightBudget({
    scriptCost: 1_000_000, crewCosts: { director: 4_000_000 }, castRoles: [], contractedActorIds: new Set(), availableActorIds: new Set(), inHouseActorCost: 0,
    backgroundCastingCost: 1_000_000, locationCosts: [], equipmentChoices: {}, ownedEquipmentLevels: {}, gearTiers: GREENLIGHT_GEAR_TIERS as any, tone,
} as any);
assert.equal(bill().effectsCost, 0, 'no tone, no bill');
assert.equal(bill(50).effectsCost, 0, 'an even mix adds nothing');
assert.equal(bill(100).effectsCost, Math.round(10_000_000 * 0.15));
assert.equal(bill(0).effectsCost, Math.round(10_000_000 * 0.06));
assert.equal(bill(100).total, bill(50).total + bill(100).effectsCost);
assert.ok(getEffectsCostShare(100) > getEffectsCostShare(0), 'CGI costs more than sets');

/* --- pacing */
assert.deepEqual(getPacingEffect({ pacing: 'FAST' }), PACING_EFFECTS.MODERATE, 'a project made before this feels nothing');
assert.deepEqual(getPacingEffect({ pacing: 'FAST', pacingLive: true }), PACING_EFFECTS.FAST);
assert.deepEqual(getPacingEffect({ pacing: 'NONSENSE', pacingLive: true }), PACING_EFFECTS.MODERATE);
assert.ok(PACING_EFFECTS.SLOW.pull < 0 && PACING_EFFECTS.SLOW.hold > 0, 'slow pulls fewer and holds them');
assert.ok(PACING_EFFECTS.FAST.pull > 0 && PACING_EFFECTS.FAST.hold < 0, 'fast the reverse');

/* --- the streaming side reads it from the real record */
const player = (details: any) => ({
    world: { projects: [] },
    pastProjects: [],
    activeReleases: [{ id: 't1', projectDetails: details }],
    ownedStreamingPlatform: { originalCommissions: [], launchCommit: { committedAtAbsoluteWeek: 1 }, slate: [], weeklyHistory: [] },
    flags: {},
}) as any;
const entry: any = { projectId: 't1', projectType: 'SERIES', source: 'OWNED_ORIGINAL' };
const facts = (details: any) => { const f = resolveStreamingViewingProjectFacts(player(details), entry, 1); return [f.pacingPull, f.pacingHold]; };
assert.deepEqual(facts({ pacing: 'FRENETIC', pacingLive: true }), [0.1, -0.1]);
assert.deepEqual(facts({ pacing: 'FRENETIC' }), [0, 0]);

/* --- and so does the cinema side */
const admissions = (change: (market: any) => void, weeksLater = 0) => {
    const week = makeCinemaMarketFixture();
    change(week.titles[0].market);
    week.absoluteWeek += weeksLater;
    return buildCinemaChoices(week).filter(choice => choice.kind === 'FIRST').reduce((sum, choice) => sum + choice.requestedAdmissions, 0);
};
assert.ok(admissions(market => { market.urgency += PACING_EFFECTS.FAST.pull * 150; }) > admissions(() => {}), 'fast pacing opens bigger');
assert.ok(admissions(market => { market.urgency += PACING_EFFECTS.SLOW.pull * 150; }) < admissions(() => {}), 'slow pacing opens smaller');
assert.ok(admissions(market => { market.interestHold = 1 + PACING_EFFECTS.SLOW.hold * 1.5; }, 6) > admissions(() => {}, 6), 'slow pacing holds later weeks');
assert.ok(admissions(market => { market.interestHold = 1 + PACING_EFFECTS.FRENETIC.hold * 1.5; }, 6) < admissions(() => {}, 6), 'frenetic pacing fades sooner');

console.log('setup effects audit passed');
