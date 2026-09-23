/* ============================================================================
   DEV HARNESS — the load rehearsal, the screen Test opens.

   StageTest hands `onOpenRehearsal` to its host, and the host answers with
   StreamingLoadRehearsalExperience over canonical data. The Network lab has no
   host, so the rehearsal could only ever be reached by playing a funded career
   to a streaming platform. This assembles the canonical selection the screen
   needs from the same catalogues the game reads, through the same
   `buildSelectionFromDraft` and `derive` the wizard uses.

   Nothing here is imported by the game. It exists for rehearsal-lab.html.
   ========================================================================== */

import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  StreamingLoadRehearsalExperience, derive,
  type BuildInputs, type BuildSel,
} from '../components/streaming-transplant/StreamingBuildoutExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { buildSelectionFromDraft } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { STREAMING_WORLD_MARKETS } from '../services/streamingDayOneMarkets';
import { createLabBuildData } from './buildLabData';
import { bareFromQuery, draftFromQuery, openingFromQuery } from './labQuery';
import './lab.css';

/** A brand in the shape StreamingPlatformHQ builds for the command deck, so the
    screen is tinted the way the game tints it. */
const BRAND: Brand = {
  name: 'Empire+',
  markId: 'ORBIT',
  customMark: null,
  hue: 358,
  sat: 78,
  identId: 'PULSE',
  customIdent: null,
  promiseId: 'WORLD',
  publicManifesto: 'Everything, everywhere, on the night.',
  layoutId: 'cinema',
  typeId: 'GROTESK',
  accentHue: 212,
  identMode: 'badge',
  identLen: 2,
  ratingId: 'MATURE',
  lockupId: 'SIDE',
  serverCity: null,
};

function inputsFor(openingIds: string[]): BuildInputs {
  const opening = new Set(openingIds);
  const markets = STREAMING_WORLD_MARKETS.filter(market => opening.has(market.id));
  return {
    absoluteWeek: 12,
    treasury: 900_000_000,
    catalogueSpend: 240_000_000,
    catalogueTitles: 820,
    originalsSpend: 160_000_000,
    originalsCount: 6,
    premiereTitle: 'The Long Night',
    regions: [...new Set(markets.map(market => market.regionId))],
    hasExplicitOpeningMarkets: true,
    markets: markets.map(market => ({
      id: market.id,
      country: market.country,
      region: market.regionId,
      audience: market.streamingAudience,
      annualGrowthPercent: market.annualGrowthPercent,
      recommendedCityId: market.recommendedCityId,
      localizationNote: market.localizationNote,
    })),
    homeCityId: null,
    audienceMul: 1,
  };
}

/** An empty base. `selectBaseFacility` falls back to the facility marketplace
    for a room it has never seen, which is the same catalogue the lab's listings
    come from, so nothing has to be invented here. */
const EMPTY_BASE: BuildSel = {
  placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE',
};

function Lab() {
  const [markets] = useState<string[]>(openingFromQuery);
  const [nonce, setNonce] = useState(0);
  const bare = bareFromQuery();

  const { sel, d, inp } = useMemo(() => {
    const data = createLabBuildData(markets);
    const draft = draftFromQuery(data);
    const inputs = inputsFor(markets);
    const selection = buildSelectionFromDraft(draft, EMPTY_BASE, inputs.absoluteWeek ?? 0, {});
    return {
      sel: selection,
      inp: inputs,
      d: derive(selection, { ...inputs, homeCityId: selection.placements[0]?.cityId || null }),
    };
  }, [markets, nonce]);

  return (
    <div className="lab-root">
      {!bare && (
        <div className="lab-bar">
          <b>Rehearsal lab</b>
          <em>{sel.facilities?.length ?? 0} rooms · {d.countryService.length} countries · {markets.join(' ')}</em>
          <button type="button" onClick={() => setNonce(n => n + 1)}>Rebuild</button>
        </div>
      )}
      <div className="lab-frame">
        <React.Fragment key={nonce}>
          <StreamingLoadRehearsalExperience
            brand={BRAND}
            d={d}
            inp={inp}
            sel={sel}
            onClose={() => undefined}
            onResult={() => undefined}
            onRepair={() => undefined}
          />
        </React.Fragment>
      </div>
    </div>
  );
}

const host = document.getElementById("lab")!;
(window as any).__labRoot ??= ReactDOM.createRoot(host);
(window as any).__labRoot.render(<Lab />);
