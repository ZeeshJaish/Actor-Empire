import assert from 'node:assert/strict';
import { createIndustryBudgetSuitability, evaluateIndustryBudgetSuitability } from '../services/industryIntelligence';

const smallMovie = createIndustryBudgetSuitability({ format: 'MOVIE', primaryGenre: 'DRAMA', creativeRisk: 35, starPowerTarget: 30, commercialIntent: 45, affordabilityCeilingMillions: 100 });
const largeSeries = createIndustryBudgetSuitability({ format: 'SERIES', primaryGenre: 'SCI_FI', creativeRisk: 70, starPowerTarget: 85, commercialIntent: 85, affordabilityCeilingMillions: 300 });
const plannedMovie=(genre:string,stars:number)=>createIndustryBudgetSuitability({format:'MOVIE',primaryGenre:genre,
 creativeRisk:35,starPowerTarget:stars,commercialIntent:65,affordabilityCeilingMillions:500,theatricalPlanning:true} as any);
const modestDrama=plannedMovie('DRAMA',30),starDrama=plannedMovie('DRAMA',90),effectsFilm=plannedMovie('SCI_FI',90);
assert.ok(modestDrama.idealHighMillions<15,'A modest movie is not budgeted like a tentpole');
assert.ok(starDrama.idealHighMillions<65,'One strong star target does not automatically make every drama a $100M production');
assert.ok(effectsFilm.idealHighMillions>starDrama.idealHighMillions*1.5,'Effects scope retains real production cost');

for (const curve of [smallMovie, largeSeries]) {
    assert.ok(Number.isFinite(curve.minimumMillions) && curve.minimumMillions > 0);
    assert.ok(curve.minimumMillions < curve.idealLowMillions);
    assert.ok(curve.idealLowMillions <= curve.idealHighMillions);
    assert.ok(curve.idealHighMillions < curve.ambitiousMaximumMillions);
}
assert.ok(largeSeries.idealLowMillions > smallMovie.idealLowMillions, 'scale, stars and production load must increase suitable spend');

const under = evaluateIndustryBudgetSuitability(smallMovie, smallMovie.minimumMillions * 0.5);
const ideal = evaluateIndustryBudgetSuitability(smallMovie, (smallMovie.idealLowMillions + smallMovie.idealHighMillions) / 2);
const excess = evaluateIndustryBudgetSuitability(smallMovie, smallMovie.ambitiousMaximumMillions * 1.5);
assert.ok(under.executionEfficiency < 55, 'funding below minimum must sharply reduce execution efficiency');
assert.ok(ideal.executionEfficiency >= 95, 'the ideal range must be operationally efficient');
assert.ok(excess.executionEfficiency <= ideal.executionEfficiency, 'overspending cannot guarantee better execution');
assert.ok(excess.downsideRisk > ideal.downsideRisk, 'overspending beyond the ambitious maximum increases downside');
assert.ok(excess.qualityBonus <= 8, 'money above the curve has strictly diminishing creative benefit');

console.log('Industry Content B3 budget suitability audit passed.');
