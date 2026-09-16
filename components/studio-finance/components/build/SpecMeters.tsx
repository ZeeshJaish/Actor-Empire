/* ============================================================================
   FACILITY SPECS, DRAWN

   A colocation listing is eight numbers, and eight numbers in a grid is a
   spreadsheet nobody reads. Each one here is a small picture first: bolts for
   the power price, bars for the fibre, a thermometer for the cooling headroom,
   blocks for the weeks until it is ready. The number stays — it is just no
   longer the only way in.
   ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import type { FacilityListing } from '../../finance/build';
import { money } from '../../finance/format';
import type { BuildMetricInfo } from './BuildMetricSheet';
import type { BuildMetricFamily } from './ResourceMetric';

const FIBRE_LEVEL: Record<FacilityListing['fibre'], number> = {
  Basic: 1, Good: 2, Excellent: 3, 'Carrier hotel': 4,
};
const SECURITY_LEVEL: Record<FacilityListing['security'], number> = {
  Standard: 1, High: 2, Vault: 3,
};

/** "6.1¢/kWh" → 6.1. Anything unparseable sits mid-scale. */
function priceOf(value: string): number {
  const match = value.match(/([\d.]+)/);
  return match ? Number.parseFloat(match[1]) : 12;
}

const bandwidth = (value: number | undefined): string => {
  if (!value || value < 1_000) return `${Math.max(0, Math.round(value || 0))} Mbps`;
  return `${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2).replace(/\.0$/, '')} Gbps`;
};

export function getFacilityEngineeringExplanations(listing: FacilityListing): {
  coolingValue: string;
  coolingDetail: string;
  fibreImpact: string;
  securityImpact: string;
} {
  const coolingCapacity = listing.engineering?.coolingCapacityKw ?? listing.rackPositions * 10;
  const committedFibre = listing.engineering?.committedBandwidthMbps;
  const burstFibre = listing.engineering?.burstBandwidthMbps;
  return {
    coolingValue: `${coolingCapacity}kW`,
    coolingDetail: `${coolingCapacity}kW${listing.engineering?.coolingMode ? ` · ${listing.engineering.coolingMode}` : ''}`,
    fibreImpact: committedFibre && burstFibre
      ? `${bandwidth(committedFibre)} committed · ${bandwidth(burstFibre)} burst. Stronger fibre raises sustained and premiere capacity.`
      : 'Stronger fibre carries more viewers reliably and gives premieres more room to surge.',
    securityImpact: listing.engineering
      ? `${listing.engineering.securityRiskReductionPercent}% lower incident risk and ${listing.engineering.securityRecoveryImprovementPercent}% faster recovery than standard protection.`
      : 'Stronger physical protection reduces infrastructure incident risk and recovery time.',
  };
}

export function SpecMeters({
  listing,
  rentCeiling = 240_000,
  onExplain,
}: {
  listing: FacilityListing;
  rentCeiling?: number;
  onExplain?: (info: BuildMetricInfo) => void;
}) {
  const power = priceOf(listing.powerPrice);
  /* 5¢ is the cheapest power in the world; 25¢ is London. */
  const powerCostLevel = Math.max(1, Math.min(5, Math.round(((power - 4) / 20) * 5)));
  const powerQualityLevel = 6 - powerCostLevel;
  const rentLevel = Math.max(1, Math.min(5, Math.round((listing.weeklyRent / rentCeiling) * 5)));
  const uptimeNines = Math.round((-Math.log10(1 - listing.uptime)) * 10) / 10;
  const engineering = getFacilityEngineeringExplanations(listing);
  const coolingCapacity = listing.engineering?.coolingCapacityKw ?? listing.rackPositions * 10;
  const coolingPerRack = coolingCapacity / Math.max(1, listing.rackPositions);
  const coolingQualityLevel = Math.max(1, Math.min(5, Math.round(((coolingPerRack - 6) / 8) * 4) + 1));
  const coolingTone = coolingQualityLevel >= 4 ? 'good' : coolingQualityLevel <= 2 ? 'bad' : 'warn';
  const specRef = useRef<HTMLDivElement>(null);
  const [motionVisible, setMotionVisible] = useState(false);

  useEffect(() => {
    const node = specRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setMotionVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setMotionVisible(entry.isIntersecting);
    }, { rootMargin: '80px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const explain = (info: BuildMetricInfo) => () => onExplain?.(info);

  return (
    <div ref={specRef} className={`spec ${motionVisible ? 'is-motion-visible' : 'is-motion-paused'}`}>
      <Meter label="Power" value={listing.powerPrice} tone={powerCostLevel <= 2 ? 'good' : powerCostLevel >= 4 ? 'bad' : 'warn'} resource="energy" motion="power" qualityLevel={powerQualityLevel} onExplain={explain({
        title: 'Power rate', value: listing.powerPrice,
        summary: 'The electricity price this facility charges for every kilowatt-hour your machines consume.',
        impact: 'A lower rate reduces weekly running cost. It does not add capacity unless the room also has enough contracted power.',
        guidance: 'Compare sites, reduce the rack load, or improve the power contract before commissioning.',
        status: powerCostLevel <= 2 ? 'good' : powerCostLevel >= 4 ? 'bad' : 'warn',
      })}>
        <span className="spec-bolts">
          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= powerQualityLevel ? 'is-on' : undefined} style={{ ['--motion-index' as string]: i }} />)}
        </span>
      </Meter>

      <Meter label="Rent" value={`${money(listing.weeklyRent)}/wk`} tone={rentLevel <= 2 ? 'good' : rentLevel >= 4 ? 'bad' : 'warn'} resource="money" motion="static" onExplain={explain({
        title: 'Weekly rent', value: `${money(listing.weeklyRent)}/week`,
        summary: 'The recurring lease payment for keeping this facility available.',
        impact: 'Rent becomes part of the platform’s weekly running cost after the build is commissioned.',
        guidance: 'Choose a cheaper room, own more infrastructure, or accept the higher bill for a stronger location.',
        status: rentLevel <= 2 ? 'good' : rentLevel >= 4 ? 'bad' : 'warn',
      })}>
        <span className="spec-bars">
          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= rentLevel ? 'is-on' : undefined} />)}
        </span>
      </Meter>

      <Meter label="Fibre" value={listing.fibre === 'Carrier hotel' ? 'Carrier' : listing.fibre} tone={FIBRE_LEVEL[listing.fibre] >= 3 ? 'good' : 'warn'} resource="network" motion="fibre" qualityLevel={FIBRE_LEVEL[listing.fibre]} onExplain={explain({
        title: 'Fibre connection', value: listing.fibre,
        summary: 'The quality of the facility’s connection to the wider streaming network.',
        impact: engineering.fibreImpact,
        guidance: 'Prefer carrier hotels or add a second network route when fibre becomes the room’s ceiling.',
        status: FIBRE_LEVEL[listing.fibre] >= 3 ? 'good' : 'warn',
      })}>
        <span className="spec-signal">
          {[1, 2, 3, 4].map((i) => <i key={i} className={i <= FIBRE_LEVEL[listing.fibre] ? 'is-on' : undefined} style={{ height: `${i * 25}%`, ['--motion-index' as string]: i }} />)}
        </span>
      </Meter>

      <Meter label="Cooling" value={engineering.coolingValue} tone={coolingTone} resource="water" motion="cooling" qualityLevel={coolingQualityLevel} onExplain={explain({
        title: 'Cooling capacity', value: engineering.coolingDetail,
        summary: 'How much server heat this room can remove continuously.',
        impact: 'If cooling falls below the machines’ heat load, some racks cannot safely run.',
        guidance: 'Use fewer racks here or add the cooling repair offered on the Plans stage.',
        status: coolingTone,
      })}>
        <span className="spec-therm">
          <i style={{ height: `${coolingQualityLevel * 20}%` }} />
        </span>
      </Meter>

      <Meter label="Uptime" value={`${(listing.uptime * 100).toFixed(2)}%`} tone={listing.uptime >= 0.9998 ? 'good' : 'warn'} resource="network" motion="uptime" onExplain={explain({
        title: 'Expected uptime', value: `${(listing.uptime * 100).toFixed(2)}%`,
        summary: 'The share of time this facility is expected to remain available.',
        impact: 'Higher uptime lowers the chance that viewers lose access because this site goes offline.',
        guidance: 'Use redundant cities and stronger facilities instead of relying on one uptime number.',
        status: listing.uptime >= 0.9998 ? 'good' : 'warn',
      })}>
        <span className="spec-dial" style={{ ['--p' as string]: `${Math.min(100, (uptimeNines / 5) * 100)}%` }} />
      </Meter>

      <Meter label="Ready in" value={`${listing.provisioningWeeks} wk`} tone={listing.provisioningWeeks <= 3 ? 'good' : listing.provisioningWeeks >= 6 ? 'bad' : 'warn'} resource="infrastructure" motion="static" onExplain={explain({
        title: 'Setup time', value: `${listing.provisioningWeeks} weeks`,
        summary: 'How long the facility needs before your first machines can be switched on.',
        impact: 'The slowest chosen facility helps determine the complete network build time.',
        guidance: 'Pick a faster room or reduce the number and size of sites when launch timing matters most.',
        status: listing.provisioningWeeks <= 3 ? 'good' : listing.provisioningWeeks >= 6 ? 'bad' : 'warn',
      })}>
        <span className="spec-weeks">
          {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < listing.provisioningWeeks ? 'is-on' : undefined} />)}
        </span>
      </Meter>

      <Meter label="Security" value={listing.security} tone={SECURITY_LEVEL[listing.security] >= 2 ? 'good' : 'flat'} resource="infrastructure" motion="security" onExplain={explain({
        title: 'Facility security', value: listing.security,
        summary: 'The physical protection, access control, and backup standard around your machines.',
        impact: engineering.securityImpact,
        guidance: 'Use high-security or vault facilities for origin servers and critical regional relays.',
        status: SECURITY_LEVEL[listing.security] >= 2 ? 'good' : 'flat',
      })}>
        <span className="spec-shields">
          {[1, 2, 3].map((i) => <i key={i} className={i <= SECURITY_LEVEL[listing.security] ? 'is-on' : undefined} style={{ ['--motion-index' as string]: i }} />)}
        </span>
      </Meter>

      <Meter label="Rack space" value={`${listing.rackPositions} racks`} tone="flat" resource="infrastructure" motion="rack" onExplain={explain({
        title: 'Rack space', value: `${listing.rackPositions} racks`,
        summary: 'The maximum number of server cabinets this room can physically hold.',
        impact: 'Once every position is occupied, the room cannot accept another rack without expansion.',
        guidance: 'Lease a larger room or spread the next racks into another city.',
        status: 'flat',
      })}>
        <span className="spec-floor">
          {Array.from({ length: Math.min(12, listing.rackPositions) }, (_, i) => <i key={i} style={{ ['--motion-index' as string]: i }} />)}
        </span>
      </Meter>
    </div>
  );
}

type FacilityMetricMotion = 'power' | 'fibre' | 'cooling' | 'uptime' | 'security' | 'rack' | 'static';

function Meter({ label, value, tone, resource, motion, qualityLevel, onExplain, children }: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad' | 'flat';
  resource: BuildMetricFamily;
  motion: FacilityMetricMotion;
  qualityLevel?: number;
  onExplain: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`spec-cell is-${tone} sf-metric-card is-${resource}`} data-motion={motion} data-quality-level={qualityLevel} aria-label={`Explain ${label}`} onClick={onExplain}>
      <span className="spec-art" aria-hidden="true">{children}</span>
      <em>{label}</em>
      <b title={value}>{value}</b>
    </button>
  );
}
