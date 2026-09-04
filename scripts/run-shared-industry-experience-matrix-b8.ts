import { evaluateSharedIndustryB8Experience } from './helpers/sharedIndustryB8Experience';
import { runSharedIndustryB8Scenario } from './helpers/sharedIndustryB8Runner';
import {
    SHARED_INDUSTRY_B8_SCENARIO_SEEDS,
} from './helpers/sharedIndustryB8Scenarios';
import type { SharedIndustryB8Regime } from './helpers/sharedIndustryB8Types';

const allRegimes: SharedIndustryB8Regime[] = ['BASELINE', 'LEAN', 'BOOM', 'CROWDED', 'ADVERSE'];
const requestedRegime = process.env.B8_EXPERIENCE_REGIME as SharedIndustryB8Regime | undefined;
const regimes = requestedRegime && allRegimes.includes(requestedRegime) ? [requestedRegime] : allRegimes;
const measurements = [];
const runtimes: Record<string, unknown> = {};

for (const regime of regimes) {
    const result = await runSharedIndustryB8Scenario({
        regime,
        seed: SHARED_INDUSTRY_B8_SCENARIO_SEEDS[regime],
        horizonWeeks: 520,
        checkpointWeeks: [520],
        progressEveryWeeks: 520,
    });
    if (!result.report.experience) throw new Error(`${regime} did not produce experience metrics.`);
    measurements.push(result.report.experience);
    runtimes[regime] = result.runtime;
    console.log(`B8 ${regime}: 520/520 weeks in ${result.runtime.totalMs}ms`);
    if (requestedRegime) {
        const entrants = Object.values(result.player.world.studios || {}).filter(studio => (
            studio.ai?.origin === 'GENERATED' || studio.ai?.origin === 'REGIONAL' || studio.isNpcVenture
        ));
        console.log(JSON.stringify({
            regime,
            entrantSummary: entrants.map(studio => ({
                id: studio.id,
                origin: studio.ai?.origin,
                launchClass: studio.ai?.profile.launchClass,
                status: studio.ai?.status,
                releases: result.player.world.projects.filter(project => project.studioId === studio.id)
                    .map(project => {
                        const production = Object.values(result.player.world.industryProductions || {})
                            .find(item => item.canonicalProjectId === project.id);
                        return {
                            id: project.id,
                            reviews: project.reviews,
                            boxOffice: project.boxOffice,
                            budgetMillions: production?.budgetMillions,
                            result: production?.studioAiExecution?.result,
                        };
                    }),
                slate: studio.ai?.slate?.commitments.map(item => item.status),
            })),
        }, null, 2));
    }
}

const evaluation = evaluateSharedIndustryB8Experience(measurements);
console.log(JSON.stringify({ measurements, violations: evaluation.violations, runtimes }, null, 2));
