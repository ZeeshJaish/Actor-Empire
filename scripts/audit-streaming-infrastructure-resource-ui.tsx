import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StagePlans } from '../components/studio-finance/components/build/StagePlans';
import { StageTest } from '../components/studio-finance/components/build/StageTest';
import { getFacilityEngineeringExplanations, SpecMeters } from '../components/studio-finance/components/build/SpecMeters';
import * as StageSitesModule from '../components/studio-finance/components/build/StageSites';
import type { FacilityListing } from '../components/studio-finance/finance/build';

const facility = {
  id: 'facility-delhi',
  listingId: 'listing-delhi',
  cityId: 'DELHI',
  built: false,
  groups: [{ id: 'origin', name: 'Origin', duty: 'ORIGIN', racks: 2, capacity: 280_000 }],
  power: { used: 24, contracted: 48 },
  cooling: { used: 22, available: 44 },
  bandwidth: { used: 80, available: 180 },
  condition: 0.94,
  uptime: 0.999,
  backup: 'Diesel',
  backupCoverage: 0.7,
  energyPerWeek: 28,
  waterPerWeek: 52,
  opCost: 22_000,
  sustainability: 74,
  reputation: 70,
};

const data = {
  cities: [{ id: 'DELHI', name: 'Delhi' }],
  listings: [{ id: 'listing-delhi', name: 'Delhi Exchange', provider: 'Empire Facilities', rackPositions: 8 }],
  repairs: [],
};

const draft = {
  facilities: [
    facility,
    {
      ...facility,
      id: 'facility-delhi-2',
      groups: [{ id: 'edge', name: 'Edge', duty: 'EDGE', racks: 1, capacity: 120_000 }],
    },
  ],
  architecture: 'HYBRID',
  ownedShare: 0.6,
  doctrine: 'STANDARD',
  repairIds: [],
};

const markup = renderToStaticMarkup(
  <StagePlans
    data={data as never}
    draft={draft as never}
    patch={() => undefined}
    totals={{
      racks: 2,
      capacity: 280_000,
      burst: 80_000,
      buildCost: 16_000_000,
      weeklyCost: 22_000,
      weeks: 4,
      energy: 28,
      water: 52,
      sustainability: 74,
      reputation: 70,
    } as never}
    plan={undefined as never}
    services={undefined as never}
    handlers={{}}
    managed={false}
    teamProposal={null}
    setTeamProposal={() => undefined}
  />,
);

assert.match(markup, /class="sf-metric-card is-energy"/);
assert.match(markup, /class="sf-metric-card is-water"/);
assert.match(markup, /class="sf-resource-unit">MWh<\/small>/);
assert.match(markup, /class="sf-resource-unit">m³<\/small>/);
assert.doesNotMatch(markup, /<s>MWh<\/s>/);
assert.doesNotMatch(markup, /<s>m³<\/s>/);
assert.match(markup, /class="is-power sf-resource-line is-energy"/);
assert.match(markup, /class="is-cool sf-resource-line is-water"/);
assert.match(markup, /class="is-fibre sf-resource-line is-network"/);
assert.doesNotMatch(markup, />Build pace</);
assert.doesNotMatch(markup, />Careful<\/button>/);
assert.doesNotMatch(markup, />Balanced<\/button>/);
assert.doesNotMatch(markup, />Fast<\/button>/);
assert.match(markup, /aria-label="About ownership mix"/);
assert.match(markup, /4 weeks to build/);
assert.match(markup, /\$16M build cost/);
assert.match(markup, />Delhi · Room 01</);
assert.match(markup, /data-room-picker="facility-delhi-2"/);
assert.equal((markup.match(/data-room-workbench=/g) ?? []).length, 1, 'Plans should expand one room at a time.');
assert.match(markup, /aria-label="Explain Running cost"/);
assert.doesNotMatch(markup, /aria-label="Explain Surge capacity"/);
assert.doesNotMatch(markup, /Burst held/);
assert.doesNotMatch(markup, /Normal time/);
assert.doesNotMatch(markup, /Normal cost/);

const testMarkup = renderToStaticMarkup(
  <StageTest
    data={{} as never}
    draft={{ rehearsal: null } as never}
    totals={{ racks: 2, capacity: 280_000 } as never}
    plan={undefined as never}
    services={[{ marketId: 'IN', name: 'India', code: 'IN', peak: 180_000, startupMs: 32, buffering: .01, state: 'READY' }] as never}
    handlers={{ onOpenRehearsal: () => undefined }}
    managed={false}
    teamProposal={null}
    setTeamProposal={() => undefined}
    patch={() => undefined}
  />,
);
assert.doesNotMatch(testMarkup, /<s>ms<\/s>/, 'Time units must not use semantic strike-through markup.');
assert.match(testMarkup, /class="sf-unit">ms<\/small>/);

const buildCss = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/build.css'), 'utf8');

const meterListing: FacilityListing = {
    id: 'listing-delhi',
    cityId: 'DELHI',
    provider: 'Empire Facilities',
    name: 'Delhi Exchange',
    type: 'Carrier room',
    description: 'Opening room.',
    rackPositions: 8,
    moveIn: 1_800_000,
    weeklyRent: 40_000,
    powerPrice: '6.1¢/kWh',
    localTax: '4% local',
    uptime: 0.999,
    fibre: 'Carrier hotel',
    security: 'Vault',
    provisioningWeeks: 3,
    contractMonths: 12,
    expansion: 16,
    note: 'Ready.',
    availability: 'AVAILABLE',
    engineering: {
      powerContractKw: 112,
      backupPowerKw: 84,
      backupPowerMode: 'N_PLUS_ONE',
      coolingCapacityKw: 77,
      coolingMode: 'Direct liquid',
      committedBandwidthMbps: 35_200,
      burstBandwidthMbps: 52_800,
      securityRiskReductionPercent: 55,
      securityRecoveryImprovementPercent: 30,
    },
  };
const meters = renderToStaticMarkup(
  <SpecMeters listing={meterListing} />,
);

const meterMarkup = (markup: string, label: string): string => {
  const match = markup.match(new RegExp(`<button[^>]*aria-label="Explain ${label}"[\\s\\S]*?<\\/button>`));
  assert.ok(match, `${label} meter should render.`);
  return match[0];
};

assert.equal((meters.match(/aria-label="Explain /g) ?? []).length, 8);
assert.match(meters, /class="spec-cell is-good sf-metric-card is-energy"/);
assert.match(meters, /class="spec-cell is-good sf-metric-card is-money"/);
assert.match(meters, /class="spec-cell is-good sf-metric-card is-network"/);
assert.match(meters, /class="spec-cell is-warn sf-metric-card is-water"/);
assert.match(meters, /class="spec-cell is-flat sf-metric-card is-infrastructure"/);
for (const motion of ['power', 'fibre', 'cooling', 'uptime', 'security', 'rack']) {
  assert.match(meters, new RegExp(`data-motion="${motion}"`), `${motion} should expose its semantic motion treatment.`);
}
assert.equal((meters.match(/data-motion="static"/g) ?? []).length, 2, 'Rent and setup time should remain visually quiet.');
assert.match(meters, /class="spec is-motion-paused"/, 'Facility motion should begin paused until the grid is visible.');
assert.match(meters, />Carrier<\/b>/);
assert.doesNotMatch(meters, />Carrier hotel<\/b>/);
assert.match(meters, />77kW<\/b>/);
const excellentPower = meterMarkup(meters, 'Power');
assert.match(excellentPower, /data-quality-level="5"/);
assert.equal((excellentPower.match(/class="is-on"/g) ?? []).length, 5, 'Excellent-value power should fill every amber bar.');
const excellentFibre = meterMarkup(meters, 'Fibre');
assert.match(excellentFibre, /data-quality-level="4"/);
assert.equal((excellentFibre.match(/class="is-on"/g) ?? []).length, 4, 'Carrier fibre should fill every green signal bar.');
const balancedCooling = meterMarkup(meters, 'Cooling');
assert.match(balancedCooling, /class="spec-cell is-warn/, 'Balanced cooling should read as a caution rather than an ungraded stat.');
assert.match(balancedCooling, /data-quality-level="3"/);
assert.match(balancedCooling, /style="height:60%"/, 'Cooling should visualize capacity per rack rather than raw rack count.');

const constrainedMeters = renderToStaticMarkup(
  <SpecMeters listing={{
    ...meterListing,
    powerPrice: '24.5¢/kWh',
    engineering: {
      ...meterListing.engineering!,
      coolingCapacityKw: 128,
    },
  }} />,
);
const constrainedPower = meterMarkup(constrainedMeters, 'Power');
assert.match(constrainedPower, /data-quality-level="1"/);
assert.equal((constrainedPower.match(/class="is-on"/g) ?? []).length, 1, 'Expensive power should not look stronger than cheap power.');
const excellentCooling = meterMarkup(constrainedMeters, 'Cooling');
assert.match(excellentCooling, /class="spec-cell is-good/, 'Strong cooling headroom should carry a positive status.');
assert.match(excellentCooling, /data-quality-level="5"/);
assert.match(excellentCooling, /style="height:100%"/, 'High cooling headroom should fill its blue gauge.');
const engineeringExplanations = getFacilityEngineeringExplanations(meterListing);
assert.match(engineeringExplanations.fibreImpact, /35\.2 Gbps committed/);
assert.match(engineeringExplanations.fibreImpact, /52\.8 Gbps burst/);
assert.match(engineeringExplanations.securityImpact, /55% lower incident risk/);

for (const keyframe of ['spec-power-flow', 'spec-fibre-rise', 'spec-cooling-breathe', 'spec-uptime-sweep', 'spec-security-sequence', 'spec-rack-activate']) {
  assert.match(buildCss, new RegExp(`@keyframes ${keyframe}`), `${keyframe} should define a distinct infrastructure motion cue.`);
}
assert.match(buildCss, /\.spec-cell\[data-motion="static"\]/, 'Static meters should have an explicit quiet treatment.');
assert.match(buildCss, /\.spec\.is-motion-paused[\s\S]*animation-play-state:\s*paused/, 'Offscreen facility motion should pause.');
assert.match(buildCss, /\.spec\.is-motion-visible[\s\S]*animation-play-state:\s*running/, 'Visible facility motion should resume.');
assert.match(buildCss, /\.spec-cell:active[\s\S]*background:\s*var\(--sf-metric-press\)/, 'Pressing a metric should give a brief solid resource-colour response.');
assert.match(buildCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.spec-cell\[data-motion\]/, 'Facility motion should respect reduced-motion preferences.');

const FacilityIdentity = (StageSitesModule as unknown as {
  FacilityIdentity?: ComponentType<{ listing: FacilityListing }>;
}).FacilityIdentity;
assert.equal(typeof FacilityIdentity, 'function', 'Facility listings must expose their operating identity without relying on paragraph copy.');
const Identity = FacilityIdentity as ComponentType<{ listing: FacilityListing }>;

const identityBase: FacilityListing = {
  id: 'listing-identity',
  cityId: 'DELHI',
  provider: 'Empire Facilities',
  name: 'Identity fixture',
  type: 'Facility',
  description: 'Fixture.',
  rackPositions: 4,
  moveIn: 1_000_000,
  weeklyRent: 40_000,
  powerPrice: '6.1¢/kWh',
  localTax: '4% local',
  uptime: 0.999,
  fibre: 'Excellent',
  security: 'High',
  provisioningWeeks: 3,
  contractMonths: 12,
  expansion: 8,
  note: 'Ready.',
  availability: 'AVAILABLE',
};

const identities = renderToStaticMarkup(
  <>
    <Identity listing={{ ...identityBase, facilityType: 'CLOUD_ALLOCATION', rackPositions: 4 }} />
    <Identity listing={{ ...identityBase, facilityType: 'RENTED_CABINET', rackPositions: 2 }} />
    <Identity listing={{ ...identityBase, facilityType: 'PRIVATE_CAGE', rackPositions: 11 }} />
    <Identity listing={{ ...identityBase, facilityType: 'PRIVATE_SUITE', rackPositions: 16 }} />
    <Identity listing={{ ...identityBase, facilityType: 'DEDICATED_DATA_HALL', rackPositions: 32 }} />
    <Identity listing={{ ...identityBase, facilityType: 'OWNED_DATA_CENTRE', rackPositions: 96, availability: 'RESEARCH' }} />
  </>,
);

for (const kind of ['cloud', 'cabinet', 'cage', 'suite', 'hall', 'campus']) {
  assert.match(identities, new RegExp(`class="bw-facility-mark is-${kind}"`));
}
for (const label of ['Provider operated', 'Shared facility', 'Private zone', 'Private room', 'Dedicated hall', 'Owned campus']) {
  assert.match(identities, new RegExp(label));
}
assert.match(identities, /Private zone<\/b><em>11 racks<\/em>/);
assert.match(identities, /RESEARCH REQUIRED/);
assert.match(identities, /Owned infrastructure research required/);

console.log('Streaming infrastructure resource UI audit passed.');
