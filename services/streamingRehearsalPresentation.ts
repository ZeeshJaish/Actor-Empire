import type {
  StreamingLaunchRehearsalResult,
  StreamingRehearsalCountryResult,
} from './streamingLaunchRehearsal';

export interface StreamingRehearsalMarketTally {
  playing: number;
  buffering: number;
  down: number;
  total: number;
}

export const streamingRehearsalPlayback = (country: StreamingRehearsalCountryResult): 'PLAYING' | 'BUFFERING' | 'DOWN' => (
  country.outageResistance === 'UNSERVED' || country.verdict === 'BROKE' || country.startupTimeMs === null
    ? 'DOWN'
    : country.verdict === 'BURST' || country.bufferingRiskPercent >= 15
      ? 'BUFFERING'
      : 'PLAYING'
);

/** Count the complete canonical result, never just the visible monitor wall. */
export const summarizeStreamingRehearsalMarkets = (result: StreamingLaunchRehearsalResult): StreamingRehearsalMarketTally => {
  const tally = { playing: 0, buffering: 0, down: 0, total: result.countries.length };
  for (const country of result.countries) {
    const state = streamingRehearsalPlayback(country);
    if (state === 'DOWN') tally.down += 1;
    else if (state === 'BUFFERING') tally.buffering += 1;
    else tally.playing += 1;
  }
  return tally;
};

export interface StreamingRehearsalMarketDiagnosis {
  reason: string;
  route: string;
  load: string;
  repair: string;
}

/** Explain the selected market using the same routes and facility stresses the rehearsal used. */
export const diagnoseStreamingRehearsalMarket = (
  result: StreamingLaunchRehearsalResult,
  country: StreamingRehearsalCountryResult,
): StreamingRehearsalMarketDiagnosis => {
  const route = result.facilities.filter(facility => facility.affectedMarketIds.includes(country.marketId));
  if (country.outageResistance === 'UNSERVED' || route.length === 0) {
    return {
      reason: result.spareCapacityPercent > 0
        ? 'No regional delivery route. Global spare capacity cannot reach this market.'
        : 'No regional delivery route. Capacity elsewhere cannot reach this market.',
      route: 'None in this market’s region',
      load: 'No local route',
      repair: `Place or rent serving capacity in ${country.regionLabel}, then run rehearsal again.`,
    };
  }

  const worst = [...route].sort((a, b) => b.loadPercent - a.loadPercent)[0];
  const factor = route.find(facility => facility.limitingFactor !== 'NONE');
  const action = result.repairActions.find(item =>
    item.type === 'REPAIR_PHYSICAL' && route.some(facility => facility.facilityId === item.facilityId)
    || item.type === 'ADD_CAPACITY' && route.some(facility => facility.cityId === item.cityId));
  const routeLabels = [...new Set(route.map(facility => facility.cityLabel))];
  const reason = factor
    ? `${factor.cityLabel} is constrained by ${factor.limitingFactor.toLowerCase().replaceAll('_', ' ')}.`
    : worst.verdict === 'BROKE' || worst.loadPercent > 100
      ? `${worst.cityLabel} is overloaded at peak; global spare capacity does not replace this route.`
      : country.bufferingRiskPercent >= 15
        ? `${routeLabels.join(', ')} can reach this market, but playback has ${country.bufferingRiskPercent}% buffering risk.`
        : country.outageResistance === 'SINGLE_POINT'
          ? 'Playback works, but one delivery city is a single point of failure.'
          : 'The regional route carries this market.';
  return {
    reason,
    route: routeLabels.join(', '),
    load: `${worst.loadPercent}% peak load at ${worst.cityLabel}`,
    repair: action?.detail || (country.verdict === 'BROKE'
      ? `Add capacity on the ${country.regionLabel} route, then run rehearsal again.`
      : country.outageResistance === 'SINGLE_POINT'
        ? `Add a second delivery city in ${country.regionLabel} for resilience.`
        : 'No network repair required for this market.'),
  };
};
