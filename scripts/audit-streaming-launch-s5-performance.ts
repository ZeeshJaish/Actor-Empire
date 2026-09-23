import { performance } from 'node:perf_hooks';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLabBuildData, createLabDraft } from '../lab/buildLabData';
import { StageNetwork } from '../components/studio-finance/components/build/StageNetwork';
import { buildTotals, moneyPlan, serviceForecast } from '../components/studio-finance/finance/build';
import { placeRegion } from '../components/studio-finance/finance/placer';

const data = createLabBuildData(['US', 'CA', 'MX', 'BR', 'GB', 'DE']);
const base = placeRegion(data, createLabDraft(), 'NORTH_AMERICA', {
  servers: { SCOUT: 0, WORKHORSE: 1, TITAN: 3 },
  cloud: { provider: 'ATLAS', compute: 2 },
}).draft;
const samples: number[] = [];
for (let iteration = 0; iteration < 8; iteration += 1) {
  const started = performance.now();
  const draft = placeRegion(data, base, 'NORTH_AMERICA', {
    servers: { SCOUT: 0, WORKHORSE: 1, TITAN: 4 },
    cloud: { provider: 'ATLAS', compute: 2 },
  }).draft;
  renderToStaticMarkup(React.createElement(StageNetwork, {
    data, draft, patch: () => undefined,
    totals: buildTotals(data, draft),
    plan: moneyPlan(data, draft),
    services: serviceForecast(data, draft),
    handlers: {}, managed: false, teamProposal: null,
    setTeamProposal: () => undefined,
  }));
  if (iteration > 0) samples.push(performance.now() - started);
}
samples.sort((a, b) => a - b);
console.log(`S5 increment-sized render: median ${samples[3].toFixed(1)} ms, range ${samples[0].toFixed(1)}–${samples.at(-1)!.toFixed(1)} ms; seven warm Node rounds, same six-market lab fixture.`);
