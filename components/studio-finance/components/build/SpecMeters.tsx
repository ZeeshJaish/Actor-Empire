/* ============================================================================
   FACILITY SPECS, DRAWN

   A colocation listing is eight numbers, and eight numbers in a grid is a
   spreadsheet nobody reads. Each one here is a small picture first: bolts for
   the power price, bars for the fibre, a thermometer for the cooling headroom,
   blocks for the weeks until it is ready. The number stays — it is just no
   longer the only way in.
   ========================================================================== */

import React from 'react';
import type { FacilityListing } from '../../finance/build';
import { money } from '../../finance/format';

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

export function SpecMeters({ listing, rentCeiling = 240_000 }: { listing: FacilityListing; rentCeiling?: number }) {
  const power = priceOf(listing.powerPrice);
  /* 5¢ is the cheapest power in the world; 25¢ is London. */
  const powerLevel = Math.max(1, Math.min(5, Math.round(((power - 4) / 20) * 5)));
  const rentLevel = Math.max(1, Math.min(5, Math.round((listing.weeklyRent / rentCeiling) * 5)));
  const uptimeNines = Math.round((-Math.log10(1 - listing.uptime)) * 10) / 10;

  return (
    <div className="spec">
      <Meter label="Power" value={listing.powerPrice} tone={powerLevel <= 2 ? 'good' : powerLevel >= 4 ? 'bad' : 'warn'}>
        <span className="spec-bolts">
          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= powerLevel ? 'is-on' : undefined} />)}
        </span>
      </Meter>

      <Meter label="Rent" value={`${money(listing.weeklyRent)}/wk`} tone={rentLevel <= 2 ? 'good' : rentLevel >= 4 ? 'bad' : 'warn'}>
        <span className="spec-bars">
          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= rentLevel ? 'is-on' : undefined} />)}
        </span>
      </Meter>

      <Meter label="Fibre" value={listing.fibre} tone={FIBRE_LEVEL[listing.fibre] >= 3 ? 'good' : 'warn'}>
        <span className="spec-signal">
          {[1, 2, 3, 4].map((i) => <i key={i} className={i <= FIBRE_LEVEL[listing.fibre] ? 'is-on' : undefined} style={{ height: `${i * 25}%` }} />)}
        </span>
      </Meter>

      <Meter label="Cooling" value={`${listing.rackPositions * 10}kW`} tone="flat">
        <span className="spec-therm">
          <i style={{ height: `${Math.min(100, (listing.rackPositions / 12) * 100)}%` }} />
        </span>
      </Meter>

      <Meter label="Uptime" value={`${(listing.uptime * 100).toFixed(2)}%`} tone={listing.uptime >= 0.9998 ? 'good' : 'warn'}>
        <span className="spec-dial" style={{ ['--p' as string]: `${Math.min(100, (uptimeNines / 5) * 100)}%` }} />
      </Meter>

      <Meter label="Ready in" value={`${listing.provisioningWeeks} wk`} tone={listing.provisioningWeeks <= 3 ? 'good' : listing.provisioningWeeks >= 6 ? 'bad' : 'warn'}>
        <span className="spec-weeks">
          {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < listing.provisioningWeeks ? 'is-on' : undefined} />)}
        </span>
      </Meter>

      <Meter label="Security" value={listing.security} tone={SECURITY_LEVEL[listing.security] >= 2 ? 'good' : 'flat'}>
        <span className="spec-shields">
          {[1, 2, 3].map((i) => <i key={i} className={i <= SECURITY_LEVEL[listing.security] ? 'is-on' : undefined} />)}
        </span>
      </Meter>

      <Meter label="Floor" value={`${listing.rackPositions} racks`} tone="flat">
        <span className="spec-floor">
          {Array.from({ length: Math.min(12, listing.rackPositions) }, (_, i) => <i key={i} />)}
        </span>
      </Meter>
    </div>
  );
}

function Meter({ label, value, tone, children }: {
  label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'flat'; children: React.ReactNode;
}) {
  return (
    <div className={`spec-cell is-${tone}`}>
      <span className="spec-art" aria-hidden="true">{children}</span>
      <em>{label}</em>
      <b>{value}</b>
    </div>
  );
}
