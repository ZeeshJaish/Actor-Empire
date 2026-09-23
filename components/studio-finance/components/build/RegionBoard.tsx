/* ============================================================================
   THE REGION BOARD — the Network stage, by region.

   Define the Launch chose countries. This page serves them, region by region,
   and it asks two things of each region and nothing else: how many of your
   own servers, and how much cloud. Where the rooms stand is the placer's job
   — by audience, inside the countries that insist on it, in buildings that
   can run them — and the row says where they landed.

   Every region carries the same reading: people on the night, the share
   served, and what it costs. The bar is in two colours, yours and rented, so
   the mix is something you can see rather than a mode you had to pick. The
   map above is tinted from the same numbers.

   The page opens empty. Nothing is drafted for you.
   ========================================================================== */

import React, { useEffect, useMemo, useRef, useState, type Key } from 'react';
import type { CloudProviderId, Facility, ServerTier } from '../../finance/build';
import {
  CLOUD_PROVIDERS, CLOUD_PROVIDER_IDS, CLOUD_WEEKLY_PER_RACK, OPEN_TIERS, SERVER_TIERS, cloudProviderServes,
  cloudWeeklyCost, computeRacks, facilityRacks, listingFor, rackBuildCost, tierCapacity, tierReachKm, tiersOf,
} from '../../finance/build';
import {
  canAddServer, cloudCeilingOf, coverWithCloud, emptySetup, facilitiesIn, openingRegions, placeRegion, regionReport,
  regionsOf, serverCeilingOf, whatIfsFor, type RegionReport, type RegionSetup, type WhatIf,
} from '../../finance/placer';
import { compactCount, money, pct } from '../../finance/format';
import { fibreMultiplier } from '../../../../services/streamingFibreLadder';
import type { StageProps } from './BuildWizard';
import { NetworkMapBox } from './NetworkMapBox';
import { CloudMark, ServerMark } from './BuildMachineMarks';
import { useCountUp } from './motion';

const share = (part: number, whole: number): number => (whole > 0 ? Math.min(1, part / whole) : 0);

/** A reach, short enough for a card: "1,000 km", "300 km". */
const compactKm = (km: number): string => (km >= 1000 ? `${(km / 1000).toFixed(1)}k km` : `${km} km`);

export function RegionBoard({ data, draft, patch, totals, services, onStartOver }: StageProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    const scroll = boardRef.current?.closest('.sf-scroll');
    if (!scroll) return undefined;
    const sync = () => {
      const shortPhone = window.matchMedia('(max-width: 520px) and (max-height: 650px)').matches;
      // Hysteresis stops the map bouncing at the threshold as its height changes.
      setTucked(was => shortPhone && (was ? scroll.scrollTop > 36 : scroll.scrollTop > 120));
    };
    scroll.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    return () => { scroll.removeEventListener('scroll', sync); window.removeEventListener('resize', sync); };
  }, []);
  const regions = useMemo(() => openingRegions(data), [data]);
  /* Opens on the first region with something in it — a saved network reopens
     where the work is — and otherwise on the first region, so the page never
     opens on a wall of closed rows. */
  const [openId, setOpenId] = useState<string | null>(() => (
    regions.find(region => facilitiesIn(data, draft, region.id).length > 0)?.id ?? regions[0]?.id ?? null
  ));
  const [note, setNote] = useState<{ regionId: string; text: string } | null>(null);
  /* Tapping a continent you are not opening in used to do nothing at all: the
     map reported the tap, the board found no row for it and quietly fell back
     to the world, which reads as a dead map (#111). It says so now. */
  const [scouted, setScouted] = useState<string | null>(null);
  const openIds = useMemo(() => new Set(regions.map(region => region.id)), [regions]);
  /* Tapping a continent opened its row and left it below the fold, so on a
     phone nothing appeared to happen and the player went looking for the row
     by hand (#116). The row comes to you now. */
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const selectRegion = (id: string) => {
    if (!openIds.has(id)) {
      setScouted(regionsOf(data).find(region => region.id === id)?.name ?? null);
      return;
    }
    setScouted(null);
    setOpenId(id);
    window.requestAnimationFrame(() => {
      rowRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const reports = useMemo(
    () => regions.map(region => regionReport(data, draft, services, region)),
    [data, draft, regions, services],
  );
  const open = reports.find(report => report.region.id === openId);

  /* One write path. A setup goes to the placer; what comes back is the draft
     with that region redrawn, and one line if something could not be placed. */
  const write = (regionId: string, setup: RegionSetup) => {
    const placed = placeRegion(data, draft, regionId, setup);
    patch({ facilities: placed.draft.facilities, rehearsal: null });
    setNote(placed.note ? { regionId, text: placed.note } : null);
  };
  /* Done with a region: close it and open the next one nothing is set in, so
     the page walks the regions in order without ever discarding a setup
     (#108). With every region set, Done just closes the row. */
  const nextUnset = (afterId: string) => regions.find(region => region.id !== afterId && facilitiesIn(data, draft, region.id).length === 0);

  return (
    <div ref={boardRef} className="bw-net bw-rg">
      <NetworkMapBox
        data={data}
        draft={draft}
        totals={totals}
        services={services}
        tucked={tucked}
        regionId={open?.region.id}
        onSelectRegion={selectRegion}
        onShowWorld={() => { setScouted(null); setOpenId(null); }}
        onShowRegion={() => undefined}
      />

      {scouted && (
        <p className="bw-rg-scouted" role="status">
          <b>You are not opening in {scouted}.</b>
          <em>Choose a market there in Define the Launch and it appears here as a region to serve.</em>
        </p>
      )}

      <p className="bw-rg-title">
        <b>Regions you open in</b>
        <em>{regions.length === 0 ? 'none yet' : `${regions.length} · ${compactCount(totals.capacity + totals.burst)} carried`}</em>
      </p>

      {regions.length === 0 && (
        <section className="bw-rg-empty">
          <b>Nothing to serve yet.</b>
          <em>Choose opening markets in Define the Launch first. Each region you open in appears here.</em>
        </section>
      )}

      <ul className="bw-rg-list">
        {reports.map(report => (
          <RegionRow
            key={report.region.id}
            data={data}
            draft={draft}
            report={report}
            open={report.region.id === openId}
            note={note?.regionId === report.region.id ? note.text : undefined}
            rowRef={element => { if (element) rowRefs.current.set(report.region.id, element); else rowRefs.current.delete(report.region.id); }}
            onToggle={() => setOpenId(report.region.id === openId ? null : report.region.id)}
            onWrite={setup => write(report.region.id, setup)}
            nextName={nextUnset(report.region.id)?.name}
            onDone={() => setOpenId(nextUnset(report.region.id)?.id ?? null)}
          />
        ))}
      </ul>

      {/* The estate, every week, in one line — it was a panel of tiles under a
          dial; the facts stay, the furniture went. */}
      {draft.facilities.length > 0 && (
        <p className="bw-rg-estate">
          <b>Every week, once it runs</b>
          <em>{money(totals.weeklyCost)} · {totals.energy} MWh · {totals.water} m³ · {totals.weeks} weeks to build</em>
        </p>
      )}
      {onStartOver && draft.facilities.length > 0 && (
        <button type="button" className="bw-rg-reset" onClick={onStartOver}>Start over</button>
      )}
    </div>
  );
}

/* --- one region ----------------------------------------------------------------- */

function RegionRow({ data, draft, report, open, note, onToggle, onWrite, nextName, onDone, rowRef }: {
  /* No `@types/react` in this project, so a value-based element rejects `key`.
     Declaring it is the house workaround. */
  key?: Key;
  data: StageProps['data'];
  draft: StageProps['draft'];
  report: RegionReport;
  open: boolean;
  note?: string;
  onToggle: () => void;
  onWrite: (setup: RegionSetup) => void;
  rowRef?: (element: HTMLLIElement | null) => void;
  /** The next region nothing is set in, if any — where Done goes. */
  nextName?: string;
  onDone: () => void;
}) {
  const { region, setup, peak, served, cloudServed, once, weekly, readyWeeks, word, tone, landed, countries, unservable, coverageAvailable } = report;
  const rooms = landed.flatMap(entry => entry.rooms);
  const cloudRooms = rooms.filter(room => room.tenure === 'CLOUD');
  const cloudWeekly = cloudRooms.reduce((sum, room) => sum + cloudWeeklyCost(room), 0);
  const extended = cloudRooms.reduce((sum, room) => sum + (room.cloudExtended ?? 0), 0);
  const servers = OPEN_TIERS.reduce((sum, tier) => sum + setup.servers[tier], 0);
  const serverCeiling = serverCeilingOf(data, region);
  /* The provider lives on the cloud rooms, so with nothing bought yet there is
     nowhere to keep the one you picked. It is kept here until the slider
     moves, then it goes onto the rooms with the compute. */
  const [picked, setPicked] = useState<CloudProviderId | null>(null);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const providerId: CloudProviderId = setup.cloud.compute > 0 ? setup.cloud.provider : (picked ?? setup.cloud.provider);
  const provider = CLOUD_PROVIDERS[providerId];
  const cloudCeiling = cloudCeilingOf(data, region, providerId);
  const sliderMax = cloudCeiling > 0 ? cloudCeiling + Math.ceil(cloudCeiling * 0.5) : 0;
  const ownServed = Math.max(0, served - cloudServed);
  const set = (next: Partial<RegionSetup>) => onWrite({ ...setup, ...next });
  const setTier = (tier: ServerTier, value: number) => set({ servers: { ...setup.servers, [tier]: Math.max(0, value) } });
  const pickProvider = (id: CloudProviderId) => {
    setPicked(id);
    if (setup.cloud.compute > 0) set({ cloud: { provider: id, compute: setup.cloud.compute } });
  };
  /* The three what-ifs, priced by running the placer and the forecast forward.
     Only for the open row — each one is a handful of forecasts. */
  const whatIfs = useMemo<WhatIf[]>(
    () => (open && alternativesOpen && peak > 0 ? whatIfsFor(data, draft, region, providerId) : []),
    [open, alternativesOpen, peak, data, draft, region, providerId],
  );
  /* What each provider would take to make this region Strong from here —
     the trade between them, on the chips, instead of a unit price (#108). */
  const covers = useMemo<Partial<Record<CloudProviderId, WhatIf | null>>>(
    () => (open && alternativesOpen && peak > 0
      ? Object.fromEntries(CLOUD_PROVIDER_IDS.map(id => [id, cloudProviderServes(CLOUD_PROVIDERS[id], region.id) ? coverWithCloud(data, draft, region, id) : null]))
      : {}),
    [open, alternativesOpen, peak, data, draft, region],
  );
  /* The line under the three cards describes the one you are leaning on, so
     the character of what you are buying is always on the page (#119). */
  const leaning = OPEN_TIERS.reduce((best, tier) => (setup.servers[tier] > setup.servers[best] ? tier : best), 'WORKHORSE' as ServerTier);
  const fibre = fibreMultiplier(data.fibre);
  /* Clearing a region is two taps, three seconds apart at most, so a thumb
     on the wrong button costs nothing. Built rooms stay: the placer never
     moves what is already standing. */
  const [clearing, setClearing] = useState(false);
  useEffect(() => {
    if (!clearing) return undefined;
    const timer = window.setTimeout(() => setClearing(false), 3000);
    return () => window.clearTimeout(timer);
  }, [clearing]);
  const clear = () => {
    if (!clearing) { setClearing(true); return; }
    setClearing(false);
    onWrite(emptySetup());
  };
  const whatIfLine = (option: WhatIf): { head: string; line: string } => {
    const servedPct = pct(share(option.served, option.peak) * 100, 0);
    switch (option.id) {
      case 'COVER':
        return {
          head: option.reached ? 'Cover the rest with cloud' : 'As much cloud as sells here',
          line: `+${option.addedCompute} compute · +${money(option.addedWeekly ?? 0)}/wk · ${servedPct} served`,
        };
      case 'ALL_CLOUD':
        return { head: 'All cloud here instead', line: `${money(option.weekly)}/wk · nothing once · ${servedPct} served${option.reached ? '' : ' at most'}` };
      default:
        return { head: 'All your own servers instead', line: `${money(option.once)} once, then ${money(option.weekly)}/wk · ready week ${Math.max(1, option.readyWeeks)} · ${servedPct} served${option.reached ? '' : ' at most'}` };
    }
  };
  const whatIfClass = (option: WhatIf): string => (
    option.id === 'COVER' ? 'is-cover' : option.id === 'ALL_SERVERS' ? 'is-servers' : 'is-cloud'
  );
  const strip = (
    <ul className="bw-rg-whatifs" aria-label="What it would cost instead">
      {whatIfs.map(option => {
        const { head, line } = whatIfLine(option);
        return (
          <li key={option.id}>
            <button type="button" className={`bw-rg-whatif ${whatIfClass(option)}`} onClick={() => onWrite(option.setup)}>
              <span><b>{head}</b><em>{line}</em></span>
              <i aria-hidden="true">→</i>
            </button>
          </li>
        );
      })}
    </ul>
  );
  /* The head's figures roll to their new value rather than jump (#107), and
     the word stamps when it changes — Thin to Fair is a moment. */
  const weeklyShown = useCountUp(weekly);
  const onceShown = useCountUp(once);
  const lastWord = useRef(word);
  const [stamp, setStamp] = useState(false);
  useEffect(() => {
    if (lastWord.current === word) return undefined;
    lastWord.current = word;
    setStamp(true);
    const timer = window.setTimeout(() => setStamp(false), 460);
    return () => window.clearTimeout(timer);
  }, [word]);

  return (
    <li ref={rowRef} className={['bw-rg-row', `is-${tone}`, open ? 'is-open' : ''].filter(Boolean).join(' ')}>
      <button type="button" className="bw-rg-head" aria-expanded={open} onClick={onToggle}>
        <span className="bw-rg-who">
          <b>{region.name}</b>
          <em>{region.opening.length} {region.opening.length === 1 ? 'country' : 'countries'} · {coverageAvailable ? compactCount(peak) : '—'} on the night</em>
        </span>
        <span className={stamp ? 'bw-rg-word is-stamp' : 'bw-rg-word'}><i aria-hidden="true" />{word}</span>
        <span className="bw-rg-cost">
          <b>{rooms.length === 0 ? '—' : `${money(Math.round(weeklyShown))}/wk`}</b>
          <em>{rooms.length === 0 ? 'nothing here yet' : once > 0 ? `${money(Math.round(onceShown))} once` : 'nothing once'}</em>
        </span>
        {/* A closed row used to say only a word and a price (#119). It carries
            its own coverage along the bottom now, and the kit standing in it,
            so six regions can be read without opening one. */}
        <span className="bw-rg-rail" aria-hidden="true">
          {coverageAvailable && <i className="is-own" style={{ width: `${Math.round(share(ownServed, peak) * 100)}%` }} />}
          {coverageAvailable && <i className="is-cloud" style={{ width: `${Math.round(share(cloudServed, peak) * 100)}%` }} />}
        </span>
        <span className="bw-rg-mix">
          {rooms.length === 0 ? <em>not set yet</em> : (
            <>
              {OPEN_TIERS.filter(tier => setup.servers[tier] > 0).map(tier => (
                <b key={tier} className={`is-${tier.toLowerCase()}`}>
                  <i aria-hidden="true" />{setup.servers[tier]}
                  <s>{SERVER_TIERS[tier].name}{setup.servers[tier] === 1 ? '' : 's'}</s>
                </b>
              ))}
              {setup.cloud.compute > 0 && (
                <b className="is-cloud"><i aria-hidden="true" />{setup.cloud.compute}<s>cloud</s></b>
              )}
              <em>{coverageAvailable ? `${pct(share(served, peak) * 100, 0)} served` : 'Coverage unavailable'}</em>
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="bw-rg-body">
          {/* --- the served bar: yours, rented, and what is still short ------- */}
          {coverageAvailable ? <ServedBar
            regionName={region.name}
            peak={peak}
            served={served}
            ownServed={ownServed}
            cloudServed={cloudServed}
            unservablePeak={unservable.peak}
          /> : <p className="bw-rg-dead" role="status">Coverage unavailable. Verify the network before rehearsing or commissioning.</p>}
          {/* A market nothing here can serve is said once, under the bar it
              is missing from — not left for the player to infer from a share
              that will not climb. */}
          {unservable.markets.length > 0 && (
            <p className="bw-rg-dead" role="status">
              <b>{unservable.markets.map(market => market.name).join(' and ')}</b>
              {` ${unservable.markets.length === 1 ? 'insists' : 'insist'} on rooms inside ${unservable.markets.length === 1 ? 'its' : 'their'} borders, and nobody rents there — ${pct(share(unservable.peak, peak) * 100, 0)} of the night cannot be served from anywhere.`}
            </p>
          )}

          {/* --- your servers: three machines, three cards (#119) ------------- */}
          <section className="bw-rg-block">
            <p className="bw-rg-block-head">
              <b>Your servers</b>
              <em>{servers === 0 ? 'none yet' : `${servers} standing`}</em>
            </p>
            <ul className="bw-net-duties bw-rg-tiers">
              {OPEN_TIERS.map(tier => {
                const spec = SERVER_TIERS[tier];
                const count = setup.servers[tier];
                const addable = servers < serverCeiling && canAddServer(data, draft, region.id, tier);
                return (
                  <li key={tier} className={count > 0 ? `bw-net-duty is-on is-${tier.toLowerCase()}` : `bw-net-duty is-${tier.toLowerCase()}`}>
                    <ServerMark tier={tier} />
                    <b>{spec.name}</b>
                    <s className="bw-rg-tier-reach">{compactKm(tierReachKm(tier, 1, fibre))}</s>
                    <span className="bw-net-duty-set">
                      <button type="button" disabled={count === 0} onClick={() => setTier(tier, count - 1)} aria-label={`One fewer ${spec.name} in ${region.name}`}>−</button>
                      <b key={count} aria-live="polite">{count}</b>
                      <button type="button" disabled={!addable} onClick={() => setTier(tier, count + 1)} aria-label={`One more ${spec.name} in ${region.name}`}>+</button>
                    </span>
                    <s className="bw-net-duty-price">{money(rackBuildCost(tier))} each</s>
                    {count > 0 && <em className="bw-net-duty-carry">{compactCount(tierCapacity(tier, count))} carried</em>}
                  </li>
                );
              })}
            </ul>
            <p className="bw-rg-tier-line">{SERVER_TIERS[leaning].line}</p>
            <p className="bw-rg-landed">
              {servers === 0
                ? 'Nothing of yours here yet.'
                : `Landed in ${landed.filter(entry => entry.rooms.some(room => room.tenure !== 'CLOUD')).map(entry => entry.city.name).join(', ')} · ready week ${Math.max(1, readyWeeks)}`}
            </p>
          </section>

          {/* --- cloud -------------------------------------------------------- */}
          <section className="bw-rg-block">
            <p className="bw-rg-block-head">
              <b>Cloud · Provider comparison</b>
              <em>
                {cloudCeiling === 0 ? 'not sold here' : `${setup.cloud.compute} of ${cloudCeiling}${extended > 0 ? ' · beyond the plan' : ''}`}
              </em>
            </p>
            <div className="bw-rg-prov" role="group" aria-label="Cloud provider">
              {CLOUD_PROVIDER_IDS.map(id => {
                const candidate = CLOUD_PROVIDERS[id];
                const here = cloudProviderServes(candidate, region.id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={id === providerId ? 'bw-rg-prov-btn is-on' : 'bw-rg-prov-btn'}
                    disabled={!here}
                    aria-pressed={id === providerId}
                    onClick={() => pickProvider(id)}
                  >
                    <span className="bw-rg-prov-identity"><CloudMark provider={id} /><b>{candidate.name}</b></span>
                    <span className="bw-rg-prov-spec">
                      <em>{here ? `${candidate.reach.toFixed(1)}× reach` : 'Not sold here'}</em>
                      <em>{here ? `${cloudCeilingOf(data, region, id)} plan ceiling` : 'No plan'}</em>
                      <em>{here ? `${money(Math.round(CLOUD_WEEKLY_PER_RACK * candidate.rate))}/wk each` : 'Unavailable'}</em>
                    </span>
                    <small>{candidate.line}</small>
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              className="sf-slider bw-cloud-slider"
              min={0}
              max={sliderMax}
              step={1}
              value={Math.min(sliderMax, setup.cloud.compute)}
              disabled={sliderMax === 0}
              aria-label={`Cloud compute in ${region.name}`}
              aria-valuetext={setup.cloud.compute > 0 ? `${setup.cloud.compute} compute, ${money(cloudWeekly)} a week` : 'Nothing bought yet'}
              style={{ ['--sf-fill' as string]: `${sliderMax > 0 ? Math.round((Math.min(sliderMax, setup.cloud.compute) / sliderMax) * 100) : 0}%` }}
              onChange={event => set({ cloud: { provider: providerId, compute: Number(event.currentTarget.value) } })}
            />
            <p className="bw-cloud-read">
              <span><b>{setup.cloud.compute}</b><em>compute</em></span>
              <span><b>{cloudRooms.length}</b><em>{cloudRooms.length === 1 ? 'city' : 'cities'}</em></span>
              <span><b>{money(cloudWeekly)}</b><em>a week</em></span>
            </p>
            {/* One line, not a paragraph (#119): who carries it, and the one
                thing that is unusual about this plan if anything is. */}
            <p className="bw-rg-tier-line">
              {extended > 0
                ? `${extended} compute above ${provider.name}'s ceiling here, at the step-up rate. A limit is a cost, not a wall.`
                : `${provider.name}: ${provider.line}`}
            </p>
          </section>

          {/* These searches simulate many placements. Only run them when the
              player asks for a priced alternative, not after every + tap. */}
          <details className="bw-rg-alternatives" open={alternativesOpen} onToggle={event => setAlternativesOpen(event.currentTarget.open)}>
            <summary>Compare paths to Strong <span>Provider-by-provider quotes and own-versus-cloud alternatives</span></summary>
            {alternativesOpen && (
              <>
                <ul className="bw-rg-cover-quotes">
                  {CLOUD_PROVIDER_IDS.map(id => {
                    const candidate = CLOUD_PROVIDERS[id];
                    const cover = covers[id];
                    return <li key={id}>
                      <b>{candidate.name}</b>
                      <em>{!cloudProviderServes(candidate, region.id) ? 'Not sold here'
                        : !cover ? 'No additional cloud needed or available'
                          : `+${cover.addedCompute} compute · +${money(cover.addedWeekly ?? 0)}/wk · ${cover.reached ? 'Strong' : `${pct(share(cover.served, cover.peak) * 100, 0)} at most`}`}</em>
                    </li>;
                  })}
                </ul>
                {whatIfs.length > 0 && strip}
              </>
            )}
          </details>

          {/* The regional answer remains above the controls; country detail is
              here on demand so a 23-country opening does not bury the levers. */}
          {countries.length > 0 && (
            <details className="bw-rg-countries-detail">
              <summary>Who you are serving <span>{countries.length} {countries.length === 1 ? 'country' : 'countries'} · {coverageAvailable ? `${pct(share(served, peak) * 100, 0)} served` : 'coverage unavailable'}</span></summary>
              <ul className="bw-rg-countries">
                {[...countries].sort((a, b) => a.share - b.share || b.peak - a.peak).map(country => (
                  <li key={country.id} className={country.share >= 0.9 ? 'is-good' : country.share >= 0.6 ? 'is-warn' : 'is-bad'}>
                    <span className="bw-rg-country-who"><b>{country.name}</b><em>{country.coverageAvailable ? compactCount(country.peak) : '—'} on the night</em></span>
                    <span className="bw-rg-country-bar" aria-hidden="true">{country.coverageAvailable && <i style={{ width: `${Math.round(country.share * 100)}%` }} />}</span>
                    <strong>{country.coverageAvailable ? pct(country.share * 100, 0) : 'Unavailable'}</strong>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {note && <p className="bw-rg-note" role="status">{note}</p>}

          {/* --- where they landed --------------------------------------------- */}
          {rooms.length > 0 && (
            <details className="bw-rg-rooms">
              <summary>Where they landed · {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</summary>
              <ul>
                {landed.map(entry => entry.rooms.map(room => <RoomLine key={room.id} data={data} room={room} cityName={entry.city.name} />))}
              </ul>
            </details>
          )}

          {/* --- done with this region, or not (#108) --------------------------- */}
          {rooms.length > 0 && (
            <div className="bw-rg-foot">
              <button type="button" className="bw-rg-done" onClick={onDone}>
                {nextName ? `Done · next: ${nextName}` : 'Done'}
              </button>
              <button type="button" className={clearing ? 'bw-rg-clear is-armed' : 'bw-rg-clear'} onClick={clear} aria-live="polite">
                {clearing ? `Clear ${region.name}? Tap again` : `Clear ${region.name}`}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* The bar is read, not shown: it sweeps in when the row opens and the figure
   rolls up from nothing to where the region stands, and after that both move
   only when the region does (#107). The label carries the true value for a
   screen reader whatever the meter is doing. */
function ServedBar({ regionName, peak, served, ownServed, cloudServed, unservablePeak }: {
  regionName: string;
  peak: number;
  served: number;
  ownServed: number;
  cloudServed: number;
  unservablePeak: number;
}) {
  const servedPct = useCountUp(share(served, peak) * 100, { fromZero: true });
  const servedCount = useCountUp(served, { fromZero: true });
  return (
    <div
      className="bw-rg-served"
      role="img"
      aria-label={`${Math.round(share(served, peak) * 100)} percent of ${regionName} served on the night`}
    >
      <span className="bw-rg-served-track">
        <i className="is-own" style={{ width: `${Math.round(share(ownServed, peak) * 100)}%` }} />
        <i className="is-cloud" style={{ width: `${Math.round(share(cloudServed, peak) * 100)}%` }} />
        {unservablePeak > 0 && <i className="is-dead" style={{ width: `${Math.round(share(unservablePeak, peak) * 100)}%` }} />}
      </span>
      <span className="bw-rg-served-read">
        <b>{pct(servedPct, 0)} served</b>
        <em>
          {compactCount(Math.round(servedCount))} of {compactCount(peak)}
          {cloudServed > 0 && ownServed > 0 ? ` · ${pct(share(ownServed, peak) * 100, 0)} yours, ${pct(share(cloudServed, peak) * 100, 0)} cloud` : ''}
          {cloudServed > 0 && ownServed === 0 ? ' · all by cloud' : ''}
        </em>
      </span>
    </div>
  );
}

/** What is standing in a room, named: "2 Titans · 1 Scout" (#115). The map's
    mark says which kind a city is mostly; this says exactly. */
function serverWords(room: Facility): string {
  const held = tiersOf(room);
  const parts = OPEN_TIERS
    .filter(tier => held[tier] > 0)
    .sort((a, b) => held[b] - held[a])
    .map(tier => `${held[tier]} ${SERVER_TIERS[tier].name}${held[tier] === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' · ') : 'Empty';
}

function RoomLine({ data, room, cityName }: { key?: Key; data: StageProps['data']; room: Facility; cityName: string }) {
  const listing = listingFor(data, room);
  const cloud = room.tenure === 'CLOUD';
  const racks = facilityRacks(room);
  return (
    <li className={cloud ? 'is-cloud' : undefined}>
      <span>
        <b>{cloud ? `Cloud · ${cityName}` : `${listing?.name ?? room.listingId} · ${cityName}`}</b>
        <em>
          {cloud
            ? `${computeRacks(room)} compute · ${CLOUD_PROVIDERS[room.provider ?? 'ATLAS'].name}`
            : `${serverWords(room)} · ${racks} of ${listing?.rackPositions ?? racks} positions · ready week ${listing?.provisioningWeeks ?? 1}`}
        </em>
      </span>
      <strong>{cloud ? `${money(cloudWeeklyCost(room))}/wk` : `${money((listing?.weeklyRent ?? 0) + room.opCost)}/wk`}</strong>
    </li>
  );
}
