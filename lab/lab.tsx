/* Dev harness entry. Not part of the game bundle — see lab.html. */
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import { signatureOf, type BuildDraft, type RehearsalResult } from '../components/studio-finance/finance/build';
import { createLabBuildData, createLabDraft } from './buildLabData';
import { bareFromQuery, draftFromQuery, openingFromQuery, stageFromQuery } from './labQuery';
import './lab.css';

const query = () => new URLSearchParams(window.location.search);

type LabState = 'empty' | 'configured' | 'blocked' | 'failed' | 'commissioned' | 'construction' | 'complete';
const stateFromQuery = (): LabState => {
  const value = (query().get('state') || 'configured').toLowerCase();
  return ['empty', 'configured', 'blocked', 'failed', 'commissioned', 'construction', 'complete'].includes(value)
    ? value as LabState
    : 'configured';
};

function rehearsalFor(data: ReturnType<typeof createLabBuildData>, draft: BuildDraft, verdict: 'HELD' | 'BROKE'): RehearsalResult {
  const capacity = Math.max(1, draft.facilities.flatMap(facility => facility.groups).reduce((sum, group) => sum + group.capacity, 0));
  const peak = verdict === 'BROKE' ? Math.round(capacity * 1.3) : Math.round(capacity * 0.7);
  return {
    signature: signatureOf(data, draft),
    scenario: verdict === 'BROKE' ? 'SURGE' : 'LIKELY',
    verdict,
    peak,
    capacity,
    spare: Math.max(0, capacity - peak),
    failedPct: verdict === 'BROKE' ? 30 : 0,
    catalogue: .9,
    spof: 0,
    held: verdict === 'HELD' ? data.markets.map(market => market.name) : [],
    failed: verdict === 'BROKE' ? data.markets.slice(0, 2).map(market => market.name) : [],
    countries: data.markets.map(market => ({
      name: market.name,
      code: market.code,
      demand: market.demand,
      failedPct: verdict === 'BROKE' ? 30 : 0,
      state: verdict === 'BROKE' ? 'UNSTABLE' : 'READY',
    })),
    rooms: draft.facilities.map(facility => ({ city: facility.cityId, load: verdict === 'BROKE' ? 1.3 : .7, limiting: 'NONE', failedPct: verdict === 'BROKE' ? 30 : 0 })),
  };
}

function Lab() {
  const [markets] = useState<string[]>(openingFromQuery);
  const [nonce, setNonce] = useState(0);
  const labState = stateFromQuery();
  const baseData = useMemo(() => createLabBuildData(markets), [markets]);
  const seededDraft = useMemo(() => labState === 'empty' ? createLabDraft() : draftFromQuery(baseData), [baseData, labState, nonce]);
  const { data, draft } = useMemo(() => {
    const nextData = { ...baseData };
    const nextDraft = { ...seededDraft };
    if (labState === 'blocked') nextData.treasury = { ...nextData.treasury, available: 1_000_000 };
    if (labState === 'failed') nextDraft.rehearsal = rehearsalFor(nextData, nextDraft, 'BROKE');
    if (labState === 'commissioned' || labState === 'construction' || labState === 'complete') {
      nextDraft.rehearsal = rehearsalFor(nextData, nextDraft, 'HELD');
      nextData.commissioned = true;
      nextData.existing = nextDraft.facilities;
    }
    if (labState === 'construction') nextData.construction = { committedAtWeek: 10, readyAtWeek: 25 };
    if (labState === 'complete') nextData.construction = { committedAtWeek: 0, readyAtWeek: 12 };
    return { data: nextData, draft: nextDraft };
  }, [baseData, labState, seededDraft]);
  const bare = bareFromQuery();
  return (
    <div className="lab-root">
      {!bare && (
        <div className="lab-bar">
          <b>Network lab</b>
          <em>{data.cities.length} cities · {data.listings.length} rooms · {data.markets.map(market => market.code).join(' ')}</em>
          <button type="button" onClick={() => setNonce(value => value + 1)}>Reset draft</button>
        </div>
      )}
      <div className="lab-frame">
        <React.Fragment key={nonce}>
          <BuildWizard data={data} initialStage={stageFromQuery()} initialDraft={draft} />
        </React.Fragment>
      </div>
    </div>
  );
}

const host = document.getElementById('lab')!;
const labWindow = window as typeof window & { __labRoot?: ReturnType<typeof ReactDOM.createRoot> };
labWindow.__labRoot ??= ReactDOM.createRoot(host);
labWindow.__labRoot.render(<Lab />);
