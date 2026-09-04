import assert from 'node:assert/strict';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';
import type { IndustryCompanyKind } from '../types';
import { createDeterministicRng } from '../services/deterministicRandom';
import {
    createIndustryForecast,
    createInitialIndustryIntelligenceState,
    getIndustryIntelligenceFootprint,
    processIndustryIntelligenceShadowCompany,
    recordIndustryLearningOutcome,
} from '../services/industryIntelligence';

const HORIZON = 20_800;

interface SimulationProfile {
    companyId: string;
    companyKind: IndustryCompanyKind;
    competence: number;
    status?: string;
    financialPressure?: number;
    spendingRestricted?: boolean;
}

const simulate = ({
    companyId,
    companyKind,
    competence,
    status = 'ACTIVE',
    financialPressure = 12,
    spendingRestricted = false,
}: SimulationProfile) => {
    let state = createInitialIndustryIntelligenceState(companyId, companyKind, `long_${companyId}`, 1);
    let changedWeeks = 0;
    const forecastErrors: number[] = [];
    const outcomeScores: number[] = [];
    for (let absoluteWeek = 1; absoluteWeek <= HORIZON; absoluteWeek += 1) {
        const context: IndustryIntelligenceContext = {
            companyId, companyKind, absoluteWeek, seed: state.seed,
            controller: 'AI', status,
            identity: { scale: competence, riskTolerance: 62, financialDiscipline: competence, creativePatience: 60, prestigeIntent: 65, commercialIntent: 72, franchiseAppetite: 50, growthIntent: 70, neutralMomentum: 50 },
            capabilities: { DEVELOPMENT: competence, CREATIVE: competence, PRODUCTION: competence, FINANCE: competence, MARKETING_DISCOVERY: competence, DISTRIBUTION_MARKET: competence, NEGOTIATION: competence, TECHNOLOGY: competence, CATALOGUE: competence, LOCALIZATION: competence },
            condition: { cashMillions: spendingRestricted ? 180 : 2_000, debtMillions: spendingRestricted ? 520 : 200, runwayWeeks: spendingRestricted ? 12 : 70, capacityPressure: 28, momentum: state.momentum, recentResultStrength: 60, audienceTrust: 65, catalogueNeed: 52, marketOpportunity: 64, financialPressure, competitivePressure: 58, repetitionFatigue: state.learning.repetitionFatigue, franchiseFatigue: state.learning.franchiseFatigue, overextension: 25, spendingRestricted },
            learning: structuredClone(state.learning), nextDueAbsoluteWeek: { ...state.nextDueAbsoluteWeek },
            decisionCycleByLane: { ...state.decisionCycleByLane }, activeCommitmentIds: [],
        };
        const result = processIndustryIntelligenceShadowCompany({ context, state });
        state = result.state;
        if (result.changed) changedWeeks += 1;
        if (absoluteWeek % 13 === 0) {
            const forecast = createIndustryForecast(context, 'CONTENT_STRATEGY', `sample_${absoluteWeek}`);
            forecastErrors.push(forecast.error);
            const marketShock = createDeterministicRng(`industry-market-outcome:${absoluteWeek}`)() * 90 - 45;
            const outcomeScore = Math.max(0, Math.min(100,
                50 + competence * 0.12 + marketShock - Math.abs(forecast.error) * 0.35 - financialPressure * 0.08,
            ));
            outcomeScores.push(outcomeScore);
            state = recordIndustryLearningOutcome(state, {
                evidenceId: `${companyId}:release:${absoluteWeek}`,
                absoluteWeek,
                lane: 'RELEASE_REVIEW',
                outcomeScore,
                capability: 'CREATIVE',
                capabilityDelta: outcomeScore >= 55 ? 0.4 : 0.05,
                momentumDelta: Math.max(-2, Math.min(2, (outcomeScore - 50) / 20)),
                repetitionDelta: absoluteWeek % 52 === 0 ? 1 : -0.25,
                franchiseDelta: absoluteWeek % 104 === 0 ? 1 : -0.1,
            });
        }
    }
    return { state, changedWeeks, forecastErrors, outcomeScores, footprint: getIndustryIntelligenceFootprint(state) };
};

const strongFirst = simulate({ companyId: 'STRONG_PLATFORM', companyKind: 'STREAMING_PLATFORM', competence: 90 });
const strongReplay = simulate({ companyId: 'STRONG_PLATFORM', companyKind: 'STREAMING_PLATFORM', competence: 90 });
const regional = simulate({ companyId: 'REGIONAL_PLATFORM', companyKind: 'STREAMING_PLATFORM', competence: 55 });
const generated = simulate({ companyId: 'GENERATED_PLATFORM', companyKind: 'STREAMING_PLATFORM', competence: 44 });
const distressed = simulate({ companyId: 'DISTRESSED_PLATFORM', companyKind: 'STREAMING_PLATFORM', competence: 48, status: 'DISTRESSED', financialPressure: 78, spendingRestricted: true });
const matureStudio = simulate({ companyId: 'MATURE_STUDIO', companyKind: 'PRODUCTION_STUDIO', competence: 82 });
const developing = simulate({ companyId: 'DEVELOPING_STUDIO', companyKind: 'PRODUCTION_STUDIO', competence: 28 });
assert.deepEqual(strongReplay, strongFirst, 'the full 400-year kernel result must replay identically');
assert.ok(strongFirst.changedWeeks > 0 && strongFirst.changedWeeks < HORIZON, 'scheduled work must run on due weeks only');
assert.ok(strongFirst.changedWeeks < HORIZON * 0.7, 'a company must avoid material intelligence work in at least 30% of weeks');
assert.ok(matureStudio.changedWeeks < strongFirst.changedWeeks, 'studio-only scheduling must omit the streaming market lane');
assert.ok(distressed.state.proposals.some(proposal => proposal.actionFamily === 'REDUCE_SPEND' || proposal.actionFamily === 'HOLD'));
assert.ok(strongFirst.forecastErrors.some(value => value < 0) && strongFirst.forecastErrors.some(value => value > 0));
const meanAbsolute = (values: number[]) => values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
assert.ok(meanAbsolute(strongFirst.forecastErrors) < meanAbsolute(developing.forecastErrors));
assert.ok(mean(strongFirst.outcomeScores) > mean(developing.outcomeScores), 'strong companies must outperform in aggregate');
assert.ok(strongFirst.outcomeScores.some(value => value < 40), 'strong companies must still suffer failures');
assert.ok(developing.outcomeScores.some(value => value > 70), 'developing companies must retain breakout upside');
[regional, generated, distressed, matureStudio, developing].forEach(result => {
    assert.ok(Number.isFinite(result.state.momentum));
    assert.ok(result.footprint.approximateBytes < 200_000);
});
assert.ok(strongFirst.footprint.proposalCount <= 36);
assert.ok(strongFirst.footprint.learningSampleCount <= 48);
assert.ok(strongFirst.footprint.processedKeyCount <= 104);
assert.ok(strongFirst.footprint.approximateBytes < 200_000, 'one company intelligence state must remain compact after 400 years');
assert.ok(Number.isFinite(strongFirst.state.momentum));
assert.ok(Object.values(strongFirst.state.learning.capabilityProgress).every(value => Number.isFinite(value)));

console.log(JSON.stringify({
    horizonWeeks: HORIZON,
    strongChangedWeeks: strongFirst.changedWeeks,
    developingChangedWeeks: developing.changedWeeks,
    strongMeanAbsoluteForecastError: Math.round(meanAbsolute(strongFirst.forecastErrors) * 1000) / 1000,
    developingMeanAbsoluteForecastError: Math.round(meanAbsolute(developing.forecastErrors) * 1000) / 1000,
    strongMeanOutcome: Math.round(mean(strongFirst.outcomeScores) * 1000) / 1000,
    developingMeanOutcome: Math.round(mean(developing.outcomeScores) * 1000) / 1000,
    representativeCompanies: [regional, generated, distressed, matureStudio, developing].length + 1,
    strongFootprint: strongFirst.footprint,
}, null, 2));
console.log('Industry Intelligence B2 long-run audit passed.');
