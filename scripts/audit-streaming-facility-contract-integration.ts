import assert from 'node:assert/strict';
import {
  createStreamingFacilityFromListing,
  getStreamingFacilityMarketplace,
} from '../services/streamingFacilityMarketplace';
import * as FacilityContracts from '../services/streamingFacilities';
import { getStreamingFacilityPhysicalView } from '../services/streamingInfrastructurePhysical';

const baseListing = getStreamingFacilityMarketplace('LA')[0];
assert(baseListing, 'Los Angeles must expose at least one facility contract.');

const legacyPhysical = FacilityContracts.getDefaultStreamingFacilityPhysical('RENTED_CABINET', 2);
assert.equal(legacyPhysical.bandwidthMbps, 6_400, 'A pre-contract save must retain its historical 3,200Mbps-per-rack bandwidth.');
assert.equal(legacyPhysical.burstBandwidthMbps, 9_600, 'A pre-contract save must retain its historical 4,800Mbps-per-rack burst bandwidth.');

const metroFacility = createStreamingFacilityFromListing({
  ...baseListing,
  listingId: `${baseListing.listingId}-metro`,
  fibreGrade: 'METRO',
}, [], 'CORE_ORIGIN', Math.min(2, baseListing.rackPositions));
const backboneFacility = createStreamingFacilityFromListing({
  ...baseListing,
  listingId: `${baseListing.listingId}-backbone`,
  fibreGrade: 'GLOBAL_BACKBONE',
}, [], 'CORE_ORIGIN', Math.min(2, baseListing.rackPositions));

assert(
  backboneFacility.physical!.bandwidthMbps > metroFacility.physical!.bandwidthMbps,
  'A global-backbone lease must create more committed bandwidth than a metro-fibre lease.',
);
assert(
  backboneFacility.physical!.burstBandwidthMbps > metroFacility.physical!.burstBandwidthMbps,
  'A global-backbone lease must create more premiere burst bandwidth than a metro-fibre lease.',
);

const standardFacility = createStreamingFacilityFromListing({
  ...baseListing,
  listingId: `${baseListing.listingId}-standard`,
  securityGrade: 'STANDARD',
}, [], 'CORE_ORIGIN', 1);
const fortifiedFacility = createStreamingFacilityFromListing({
  ...baseListing,
  listingId: `${baseListing.listingId}-fortified`,
  securityGrade: 'FORTIFIED',
}, [], 'CORE_ORIGIN', 1);
const standardView = getStreamingFacilityPhysicalView(standardFacility) as ReturnType<typeof getStreamingFacilityPhysicalView> & {
  securityIncidentRiskMultiplier?: number;
  securityIncidentSeverityMultiplier?: number;
  securityRecoveryMultiplier?: number;
};
const fortifiedView = getStreamingFacilityPhysicalView(fortifiedFacility) as typeof standardView;
assert(
  Number(fortifiedView.securityIncidentRiskMultiplier) < Number(standardView.securityIncidentRiskMultiplier),
  'Fortified physical security must reduce infrastructure incident probability.',
);
assert(
  Number(fortifiedView.securityIncidentSeverityMultiplier) < Number(standardView.securityIncidentSeverityMultiplier),
  'Fortified physical security must reduce incident severity and affected viewers.',
);
assert(
  Number(fortifiedView.securityRecoveryMultiplier) < Number(standardView.securityRecoveryMultiplier),
  'Fortified physical security must shorten recovery time.',
);

const marketContext = {
  absoluteWeek: 130,
  purchasingPowerIndex: 74,
  inflationPressure: 32,
  consumerConfidence: 68,
  reliableInternetPercent: 91,
  commercialHouseholds: 48_000_000,
};
const contextualA = getStreamingFacilityMarketplace('LA', marketContext)[0];
const contextualB = getStreamingFacilityMarketplace('LA', marketContext)[0];
const pressured = getStreamingFacilityMarketplace('LA', {
  ...marketContext,
  inflationPressure: 82,
  reliableInternetPercent: 58,
})[0];
assert.deepEqual(contextualA, contextualB, 'The same city, week, and country economy must produce the same contract.');
assert.notEqual(contextualA.weeklyRent, pressured.weeklyRent, 'Country inflation must reach quoted facility rent.');
assert.notEqual(contextualA.electricityRatePerKwh, pressured.electricityRatePerKwh, 'Country inflation must reach quoted electricity.');
assert.notEqual(contextualA.reliabilityPercent, pressured.reliabilityPercent, 'Country internet conditions must reach the facility SLA.');
assert.equal(contextualA.listingId, pressured.listingId, 'Market movement must not break an already selected listing identity.');
const signedFacility = createStreamingFacilityFromListing(contextualA, [], 'CORE_ORIGIN', 1);
assert.equal(
  signedFacility.lease!.weeklyRent,
  contextualA.weeklyRent,
  'A commissioned facility must snapshot the exact accepted rent instead of following later market quotes.',
);
assert.notEqual(
  signedFacility.lease!.weeklyRent,
  pressured.weeklyRent,
  'Later macro movement must not silently rewrite a signed facility contract.',
);

const securityProfile = (FacilityContracts as unknown as {
  getStreamingFacilitySecurityProfile?: (grade: 'STANDARD' | 'FORTIFIED') => { incidentRiskMultiplier: number };
}).getStreamingFacilitySecurityProfile;
assert.equal(typeof securityProfile, 'function', 'The canonical facility contract must expose security behavior to operations.');

console.log('Streaming facility contract integration audit passed.');
