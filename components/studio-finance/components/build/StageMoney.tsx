/* ============================================================================
   MONEY — can the company afford all of this?

   One answer, one lever, its consequences, and the record.

   · The answer is the bill laid end to end: one bar, each part a solid colour
     — settled, due when you commission, reserved for opening night — with a
     line across it where the treasury runs out, if it does. Beside it, the
     whole launch, what is available, and what is left after.
   · The lever is the marketing ceiling: a dial across the team's four
     recommendations and a fifth position for any amount. The figure above it
     counts to the new value; the forecast further down moves with it.
   · Then the campaign's shape — what it says, when, where the money goes —
     the forecast it produces, and the commercial setup it will sell.

   Nothing here is a bare form control. Weights are steppers, choices are
   tiles and dials, and the only typed number lives in a sheet behind the
   dial's last position.
   ========================================================================== */

import { useState } from 'react';
import type {
  OwnedStreamingLaunchMarketingDraft,
  StreamingLaunchMarketingAllocationMode,
  StreamingLaunchMarketingObjective,
  StreamingLaunchMarketingTimeline,
} from '../../../../types';
import type { StageProps } from './BuildWizard';
import type { RoomCounterpart, SpendLine } from '../../finance/build';
import { roomCounterparts } from '../../finance/build';
import { regionOfCity, regionsOf } from '../../finance/placer';
import { compactCount, money, moneyPrecise, pct as formatPct } from '../../finance/format';
import { Sheet } from '../ui';
import { Dial, Figure, Hud, Split, Step, Tile, Verdict, type KitPartTone } from '../kit';

const OBJECTIVES: Array<{ id: StreamingLaunchMarketingObjective; label: string; line: string }> = [
  { id: 'PLATFORM_INTRODUCTION', label: 'Introduce the platform', line: 'Build broad familiarity and trial.' },
  { id: 'CATALOGUE_SHOWCASE', label: 'Showcase the catalogue', line: 'Sell range, discovery and household value.' },
  { id: 'FLAGSHIP_ORIGINAL', label: 'Lead with an original', line: 'Concentrate attention around the opening title.' },
  { id: 'VALUE_PROPOSITION', label: 'Sell the value', line: 'Lead with plans, bundles and flexible access.' },
];

const TIMELINES: Array<{ id: StreamingLaunchMarketingTimeline; label: string; line: string }> = [
  { id: 'FRONT_LOADED', label: 'Front-loaded', line: 'Build early awareness; some fades before opening.' },
  { id: 'BALANCED', label: 'Balanced', line: 'Steady pressure and the most stable forecast.' },
  { id: 'LAST_WEEK_PUSH', label: 'Last-week push', line: 'A louder opening moment with more volatility.' },
];

/* The team's four recommended ceilings, in the order the dial shows them. */
type Level = 'lean' | 'balanced' | 'heavy' | 'event';
const LEVELS: Array<{ id: Level; name: string; line: string }> = [
  { id: 'lean', name: 'Lean', line: 'Credible presence in every market.' },
  { id: 'balanced', name: 'Balanced', line: 'Best cost-to-acquisition mix.' },
  { id: 'heavy', name: 'Heavy', line: 'Wider awareness, weaker marginal returns.' },
  { id: 'event', name: 'Event', line: 'A major simultaneous opening moment.' },
];

/* The bill's parts, by when the money moves. A part's tone is its identity
   everywhere on the page: the bar, and the swatch beside its lines. */
const BILL_GROUPS: Array<{ id: string; label: string; tone: KitPartTone; match: (line: SpendLine) => boolean }> = [
  { id: 'settled', label: 'Settled', tone: 'flat', match: (line) => line.timing === 'SETTLED' },
  { id: 'commission', label: 'Due at commission', tone: 'brand', match: (line) => !line.timing || line.timing === 'COMMISSION' },
  { id: 'reserved', label: 'Reserved for opening night', tone: 'gold', match: (line) => line.timing === 'OPENING_NIGHT' },
];

const pct = (value: number): string => formatPct(value * 100, 1);
const whole = (value: number): string => String(Math.round(value));
const ceilingFigure = (value: number): string => (value > 0 ? money(value) : 'Organic launch');

/* The other way of getting this room's compute, in one sentence, with the
   week the dearer-today option becomes the cheaper one. The engine did the
   division; this only says it. */
const counterpartLine = (room: RoomCounterpart): string => {
  if (room.compute === 0) {
    return room.cloud ? 'Nothing bought yet, so nothing billed.' : 'Nothing installed yet. The rent runs either way.';
  }
  const { other } = room;
  if (!other) {
    return room.cloud
      ? `No building in ${room.cityName} can run ${room.compute} Workhorses.`
      : `No cloud region in ${room.cityName} sells ${room.compute} compute.`;
  }
  if (room.cloud) {
    return `${other.listing.name} with ${room.compute} Workhorse${room.compute === 1 ? '' : 's'} instead: ${money(other.once)} once, then ${money(other.weekly)}/wk, ready week ${other.readyWeeks}. ${
      room.crossoverWeeks ? `Cheaper from week ${room.crossoverWeeks}.` : 'Never cheaper than this.'}`;
  }
  return `As cloud instead: nothing once, ${money(other.weekly)}/wk, running week ${other.readyWeeks}. ${
    room.crossoverWeeks ? `This room is cheaper from week ${room.crossoverWeeks}.` : 'Cloud stays cheaper.'}`;
};

/** What the two ways cost, drawn (#120).

    Each line is what you have SPENT by a given week: your way starts high,
    because the metal is bought on day one, and climbs slowly; renting starts
    at nothing and climbs fast. Where they cross is the whole own-versus-rent
    decision, and it was previously said in twenty near-identical sentences,
    one per room. A network with nothing to buy has no crossing and the curve
    says so instead of drawing a lie. */
function CostCurve({ yoursOnce, yoursWeekly, rentedOnce, rentedWeekly, crossover }: {
  yoursOnce: number;
  yoursWeekly: number;
  rentedOnce: number;
  rentedWeekly: number;
  crossover: number | null;
}) {
  const W = 300;
  const H = 96;
  const pad = { l: 2, r: 2, t: 8, b: 16 };
  const weeks = Math.max(52, Math.min(208, crossover ? Math.round(crossover * 1.7) : 104));
  const at = (once: number, weekly: number, w: number) => once + weekly * w;
  const top = Math.max(at(yoursOnce, yoursWeekly, weeks), at(rentedOnce, rentedWeekly, weeks), 1);
  const x = (w: number) => pad.l + (w / weeks) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / top) * (H - pad.t - pad.b);
  const line = (once: number, weekly: number) => `M${x(0).toFixed(1)} ${y(at(once, weekly, 0)).toFixed(1)} L${x(weeks).toFixed(1)} ${y(at(once, weekly, weeks)).toFixed(1)}`;
  const crossing = crossover && crossover <= weeks
    ? { x: x(crossover), y: y(at(yoursOnce, yoursWeekly, crossover)) }
    : null;
  return (
    <figure className="bw-curve">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={
        crossover
          ? `Spending compared: your own network costs more until week ${crossover}, and less after it`
          : 'Spending compared: renting stays cheaper'
      }>
        <path d={`M${x(0)} ${H - pad.b} H${x(weeks)}`} className="bw-curve-base" vectorEffect="non-scaling-stroke" />
        <path d={line(rentedOnce, rentedWeekly)} className="bw-curve-line is-rented" vectorEffect="non-scaling-stroke" />
        <path d={line(yoursOnce, yoursWeekly)} className="bw-curve-line is-yours" vectorEffect="non-scaling-stroke" />
        {crossing && (
          <>
            <path d={`M${crossing.x.toFixed(1)} ${pad.t} V${H - pad.b}`} className="bw-curve-mark" vectorEffect="non-scaling-stroke" />
            <circle cx={crossing.x.toFixed(1)} cy={crossing.y.toFixed(1)} r={3} className="bw-curve-dot" />
          </>
        )}
      </svg>
      <figcaption className="bw-curve-key">
        <span className="is-yours"><i aria-hidden="true" />Yours</span>
        <span className="is-rented"><i aria-hidden="true" />All rented</span>
        <em>
          {crossover
            ? `Yours costs more until week ${crossover}, less after`
            : rentedWeekly > yoursWeekly
              ? 'Yours is cheaper from the first week'
              : 'Renting stays cheaper'}
        </em>
      </figcaption>
    </figure>
  );
}

export function StageMoney({ data, draft: build, totals, plan, handlers }: StageProps) {
  const marketing = data.marketing;
  const draft = marketing?.draft;
  const forecast = marketing?.forecast;
  const [customOpen, setCustomOpen] = useState(false);
  const setMarketing = (patch: Partial<OwnedStreamingLaunchMarketingDraft>) => handlers.onChangeMarketing?.(patch);
  /* A stage handed a partial draft (the marketing audits pass one with no
     facilities) has no rooms to bill. */
  const rooms = build?.facilities ? roomCounterparts(data, build) : [];
  /* Rooms under the region they serve (#105): the player set the network by
     region, so the bill reads by region too. A room in no region — a fixture,
     or a save from before the map knew its countries — is listed on its own. */
  const regionNames = new Map(regionsOf(data).map(region => [region.id, region.name]));
  const byRegion = rooms.reduce((groups, room) => {
    const id = regionOfCity(data, room.facility.cityId) ?? 'ELSEWHERE';
    groups.set(id, [...(groups.get(id) ?? []), room]);
    return groups;
  }, new Map<string, RoomCounterpart[]>());
  const canonicalQuote = data.canonical?.quote?.(build);
  const canonicalRegionQuote = new Map(canonicalQuote?.regions.map(region => [region.regionId, region]) ?? []);
  const regionGroups = [...byRegion.entries()].map(([id, list]) => {
    const quoted = canonicalRegionQuote.get(id);
    const once = quoted?.dueNow ?? list.reduce((sum, room) => sum + room.once, 0);
    const weekly = quoted?.weeklyTotal ?? list.reduce((sum, room) => sum + room.weekly, 0);
    /* The same region, rented instead: every building swapped for the cloud
       that would run the same compute, and the cloud left as it is (#120).
       A room nobody sells cloud for keeps its own price, and the row says so
       rather than quoting a number that cannot be had. */
    const rentable = list.every((room) => room.cloud || room.other);
    const cloudWeekly = list.reduce((sum, room) => sum + (room.cloud ? room.weekly : room.other?.weekly ?? room.weekly), 0);
    const cloudOnce = list.reduce((sum, room) => sum + (room.cloud ? room.once : 0), 0);
    const saves = cloudWeekly - weekly;
    return {
      id,
      name: regionNames.get(id) ?? 'Elsewhere',
      rooms: list,
      once,
      weekly,
      rentable,
      cloudWeekly,
      cloudOnce,
      /* The week your way has paid back what it cost to buy. */
      crossover: saves > 0 && once > cloudOnce ? Math.ceil((once - cloudOnce) / saves) : null,
    };
  });
  /* The whole network, both ways, for the curve. */
  const yoursOnce = regionGroups.reduce((sum, group) => sum + group.once, 0);
  const yoursWeekly = regionGroups.reduce((sum, group) => sum + group.weekly, 0);
  const rentedOnce = regionGroups.reduce((sum, group) => sum + group.cloudOnce, 0);
  const rentedWeekly = regionGroups.reduce((sum, group) => sum + group.cloudWeekly, 0);
  const netSaves = rentedWeekly - yoursWeekly;
  const netCrossover = netSaves > 0 && yoursOnce > rentedOnce ? Math.ceil((yoursOnce - rentedOnce) / netSaves) : null;

  const ceiling = draft?.budgetCeiling ?? 0;
  const level = marketing ? LEVELS.find((option) => marketing.recommendations[option.id] === ceiling)?.id ?? 'custom' : 'custom';
  const pickLevel = (id: string) => {
    if (id === 'custom') { setCustomOpen(true); return; }
    const option = LEVELS.find((candidate) => candidate.id === id);
    if (option && marketing) setMarketing({ budgetCeiling: marketing.recommendations[option.id] });
  };

  const groups = BILL_GROUPS
    .map((group) => {
      const lines = plan.lines.filter(group.match);
      return { ...group, lines, amount: lines.reduce((sum, line) => sum + line.amount, 0) };
    })
    .filter((group) => group.lines.length > 0);
  /* Settled money has already left: it is listed, folded, but it is not part
     of the total and so not part of the bar. */
  const settled = groups.find((group) => group.id === 'settled');
  const owed = groups.filter((group) => group.id !== 'settled');
  const short = plan.shortfall > 0;
  /* The bar is the treasury, or the bill when the bill is bigger — so a
     launch that overruns shows how far past the end it goes (#121). */
  const billScale = Math.max(1, plan.available, plan.total);
  const billBars = owed.map((group) => ({
    id: group.id,
    label: group.label,
    amount: group.amount,
    tone: group.tone,
    width: Math.max(0.6, (group.amount / billScale) * 100),
  }));
  /* Weeks the money that survives commissioning would run the network. A
     stage rendered without totals (the marketing audits do) has no burn. */
  const weeklyCost = totals?.weeklyCost ?? 0;
  const runway = weeklyCost > 0 && plan.headroom > 0
    ? Math.min(999, Math.floor(plan.headroom / weeklyCost))
    : null;

  const currentAwareness = forecast ? Math.min(1, forecast.organicAwareness + forecast.likelyAwarenessLift) : 0;
  const baselineConcurrency = forecast?.baselineConcurrentStreams ?? 0;
  const concurrencyDelta = forecast ? Math.max(0, forecast.concurrentStreams.likely - baselineConcurrency) : 0;
  const objective = OBJECTIVES.find((option) => option.id === draft?.objective);
  const timeline = TIMELINES.find((option) => option.id === draft?.timeline);

  return (
    <>
      {/* ---- the answer: what leaves, against what there is -----------------
          The hero bar used to be scaled to the BILL, so it filled its track
          whether the launch cost a quarter of the treasury or all of it —
          a picture that answered the page's own question the same way every
          time. It is the treasury now: the bill's lines fill part of it and
          what survives is the rest of the track (#121). */}
      <section className={short ? 'bw-money bw-money--fit is-short' : 'bw-money bw-money--fit'} aria-label="Launch allocation">
        <p className="kit-title"><b>Launch allocation</b></p>

        <div className="bw-vault">
          <p className="bw-vault-figures">
            <span>
              <b className={short ? 'is-bad' : undefined}>{money(plan.total)}</b>
              <em>leaves now</em>
            </span>
            <span className="is-end">
              <b className={short ? 'is-bad' : 'is-good'}>{short ? money(plan.shortfall) : money(plan.headroom)}</b>
              <em>{short ? 'short' : 'left after'}</em>
            </span>
          </p>
          <span className="bw-vault-bar" role="img" aria-label={`${money(plan.total)} of ${money(plan.available)} in the treasury`}>
            {billBars.map((bar) => (
              <i key={bar.id} className={`is-${bar.tone}`} style={{ width: `${bar.width.toFixed(2)}%` }} title={`${bar.label} ${money(bar.amount)}`} />
            ))}
            {short && (
              <>
                {/* What the treasury cannot cover, dimmed: the plan is kept
                    and the money is not there yet. */}
                <b className="bw-vault-beyond" style={{ left: `${((plan.available / billScale) * 100).toFixed(2)}%` }} />
                <b className="bw-vault-end" style={{ left: `${((plan.available / billScale) * 100).toFixed(2)}%` }} />
              </>
            )}
          </span>
          <p className="bw-vault-foot">
            {short
              ? `Treasury ends here — ${money(plan.shortfall)} short. The plan is kept, and commissioning waits for the money.`
              : `of ${money(plan.available)} in the treasury. Charged when you commission, except marketing, which is spent week by week up to its ceiling.`}
          </p>
        </div>

        {short && <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpenStudioFinance?.()}>Add money · Studio Finance</button>}

        {/* Every line, with the colour it wears in the bar above. */}
        <p className="kit-title bw-vault-rule"><b>Complete launch bill</b><em>{money(plan.total)} due</em></p>
        <ul className="bw-vault-lines">
          {owed.map((group) => (
            <li key={group.id} className="is-group">
              <p className="bw-vault-group">
                <i className={`is-${group.tone}`} aria-hidden="true" />
                <b>{group.label}</b>
                <strong>{money(group.amount)}</strong>
              </p>
              <ul>
                {group.lines.map((line) => (
                  <li key={line.id}>
                    <span><b>{line.label}</b>{line.note && <em>{line.note}</em>}</span>
                    <strong>{money(line.amount)}</strong>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {owed.length === 0 && <li className="is-empty"><span><b>Nothing on the bill yet.</b><em>Set a region in Network first.</em></span></li>}
        </ul>

        {settled && (
          <details className="bw-bill-settled">
            <summary>
              <b>Settled</b>
              <em>{settled.lines.length} {settled.lines.length === 1 ? 'line' : 'lines'} · already paid by Define the Launch</em>
              <strong>{money(settled.amount)}</strong>
            </summary>
            {settled.lines.map((line) => (
              <p key={line.id} className="bw-bill-line">
                <span><b>{line.label}</b>{line.note && <em>{line.note}</em>}</span>
                <strong>{money(line.amount)}</strong>
              </p>
            ))}
          </details>
        )}

        {/* How long what survives lasts at this burn — the number that turns a
            weekly figure into a decision (#121). */}
        {runway !== null && (
          <p className="bw-vault-runway">
            <b>{runway >= 260 ? 'Five years or more' : `${runway} weeks`}</b>
            <em>{money(plan.headroom)} left, {money(weeklyCost)} a week to run it</em>
          </p>
        )}
      </section>

      {/* ---- the network, week by week ---------------------------------------
          The bill above is what leaves the treasury when you commission. This
          is what leaves it every week after, room by room — and beside each
          room the other way of getting the same compute in the same city,
          with the week in which the one that costs more today becomes the one
          that costs less. A cloud region is nothing once and a lot every
          week; a building is the reverse. The week they cross is the whole
          cloud decision, so it is said rather than left to be worked out. */}
      {rooms.length > 0 && (
        <>
        <p className="bw-money-divider"><b>The network</b><em>what it costs to run</em></p>
        <section className="bw-money bw-money--rooms" aria-label="The network, week by week">
          <p className="kit-title"><b>Week by week</b><em>{money(totals.weeklyCost)} a week, once it runs</em></p>

          {/* What the two ways actually cost, drawn (#120). Twenty rooms each
              carrying the same sentence about cloud was a wall of near-identical
              text; the decision is one picture: what you have spent by week W
              your way, against renting the lot, and where the two cross. */}
          <CostCurve
            yoursOnce={yoursOnce}
            yoursWeekly={yoursWeekly}
            rentedOnce={rentedOnce}
            rentedWeekly={rentedWeekly}
            crossover={netCrossover}
          />

          {/* The estate, every week: what the rooms draw, and what the world
              thinks of them. It sat under the room list where nobody read it. */}
          <p className="bw-rooms-estate">
            <span><b>{totals.energy}</b><em>MWh a week</em></span>
            <span><b>{totals.water}</b><em>m³ a week</em></span>
            <span><b>{Math.round(totals.sustainability)}</b><em>sustainability</em></span>
            <span><b>{Math.round(totals.reputation)}</b><em>reputation</em></span>
          </p>

          <ul className="bw-rooms-regions">
            {regionGroups.map((group) => (
              <li key={group.id} className="bw-rooms-region">
                <p className="bw-rooms-region-head">
                  <b>{group.name}</b>
                  <em>{group.rooms.length} {group.rooms.length === 1 ? 'room' : 'rooms'}</em>
                  <strong>{money(group.once)} once · {money(group.weekly)}/wk</strong>
                </p>
                <details className="bw-rooms-region-comparison">
                  <summary>Compare renting this region</summary>
                  <p className="bw-rooms-region-vs">
                    {!group.rentable
                      ? 'Part of this region cannot be rented at the same compute.'
                      : group.crossover
                        ? `Rented instead: ${money(group.cloudWeekly)}/wk and nothing once. Your way is cheaper from week ${group.crossover}.`
                        : group.cloudWeekly > group.weekly
                          ? `Rented instead: ${money(group.cloudWeekly)}/wk, and you already own it.`
                          : `Rented instead: ${money(group.cloudWeekly)}/wk. Renting stays cheaper here.`}
                  </p>
                </details>
              </li>
            ))}
          </ul>

          {/* Every room, for anyone who wants it — the grain the bill used to
              open on, now one tap away. */}
          <details className="bw-rooms-every">
            <summary>Every room · {rooms.length}</summary>
            <ul className="bw-rooms-regions">
              {regionGroups.map((group) => (
                <li key={group.id} className="bw-rooms-region">
                  <p className="bw-rooms-region-head">
                    <b>{group.name}</b>
                    <em>{group.rooms.length} {group.rooms.length === 1 ? 'room' : 'rooms'}</em>
                  </p>
                  <ul className="bw-rooms-bill">
                    {group.rooms.map((room) => (
                      <li key={room.facility.id} className={room.cloud ? 'is-cloud' : undefined}>
                        <p className="bw-rooms-bill-line">
                          <span>
                            <b>{room.listing.name} · {room.cityName}</b>
                            <em>
                              {room.compute === 0
                                ? 'nothing in it'
                                : `${room.compute} ${room.cloud ? 'compute' : room.compute === 1 ? 'rack' : 'racks'}`}
                              {' · '}
                              {room.readyWeeks <= 1 ? 'running week one' : `ready week ${room.readyWeeks}`}
                            </em>
                          </span>
                          <strong>{money(room.once)} once<br />{money(room.weekly)}/wk</strong>
                        </p>
                        <p className="bw-rooms-bill-vs">{counterpartLine(room)}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
        </section>
        </>
      )}

      <p className="bw-money-divider"><b>The launch</b><em>what it costs to be heard</em></p>

      {/* ---- the lever: how much to authorize for marketing ------------------ */}
      <section className="bw-money bw-money--ceiling" aria-label="Marketing ceiling">
        <p className="kit-title"><b>Marketing ceiling</b><em>authorization only</em></p>
        {!marketing || !draft ? (
          <Verdict label="Waiting" tone="flat" line="Marketing recommendations become available when Day-One markets are confirmed." />
        ) : (
          <>
            <div className="bw-ceiling-figure">
              <Figure value={ceiling} format={ceilingFigure} />
              {forecast && <em>{forecast.customerAcquisitionCost === null ? 'No paid acquisition' : `${moneyPrecise(forecast.customerAcquisitionCost)} a household`}</em>}
            </div>
            <Dial
              label="The team recommends"
              value={level}
              options={[
                ...LEVELS.map((option) => ({ id: option.id, name: option.name, line: `${money(marketing.recommendations[option.id])} · ${option.line}` })),
                { id: 'custom', name: 'Custom', line: level === 'custom' ? 'Your own ceiling. Shortfalls stay visible.' : 'Any planning value. Shortfalls stay visible.' },
              ]}
              onPick={pickLevel}
            />
            <p className="bw-money-why">The campaign spends week by week and stops at this line; the money is reserved, not spent, until it does.</p>
          </>
        )}
      </section>

      {marketing && draft && (
        <Sheet
          open={customOpen}
          onClose={() => setCustomOpen(false)}
          eyebrow="Marketing ceiling"
          title="Set any ceiling"
          footer={<button type="button" className="sf-btn sf-btn--primary" onClick={() => setCustomOpen(false)}>Done</button>}
        >
          <label className="bw-ceiling-input">
            <span>Ceiling</span>
            <span className="bw-ceiling-field">
              <i aria-hidden="true">$</i>
              <input
                type="number"
                min="0"
                step="100000"
                inputMode="numeric"
                aria-label="Custom marketing ceiling"
                value={ceiling}
                onChange={(event) => setMarketing({ budgetCeiling: Math.max(0, Number(event.currentTarget.value) || 0) })}
              />
            </span>
          </label>
          <p className="bw-money-why">Authorization only. The campaign spends week by week and stops at this line.</p>
          <button type="button" className="bw-money-jump" onClick={() => { setMarketing({ budgetCeiling: 0 }); setCustomOpen(false); }}>No paid campaign — open organically</button>
        </Sheet>
      )}

      {/* ---- the campaign: what it says, when, and where the money goes ------ */}
      {marketing && draft && forecast && (
        <section className="bw-money bw-money--campaign" aria-label="Campaign plan">
          <p className="kit-title"><b>Campaign plan</b><em>{objective?.label}{timeline ? ` · ${timeline.label}` : ''}</em></p>
          <div className="kit-tiles" role="group" aria-label="Campaign objective">
            {OBJECTIVES.map((option) => (
              <Tile key={option.id} name={option.label} line={option.line} on={draft.objective === option.id} onClick={() => setMarketing({ objective: option.id })} />
            ))}
          </div>
          <Dial
            label="Timing"
            value={draft.timeline}
            options={TIMELINES.map((option) => ({ id: option.id, name: option.label, line: option.line }))}
            onPick={(id) => setMarketing({ timeline: id as StreamingLaunchMarketingTimeline })}
          />
          <details className="bw-money-more">
            <summary>Channels and countries</summary>
            <ul className="bw-weights" aria-label="Channel weights">
              {marketing.channels.map((channel) => {
                const weight = draft.channelAllocations[channel.id] || 0;
                const setWeight = (next: number) => setMarketing({
                  channelAllocations: { ...draft.channelAllocations, [channel.id]: Math.round(Math.max(0, Math.min(1, next)) * 100) / 100 },
                });
                return (
                  <li key={channel.id} className={channel.available ? 'bw-weight' : 'bw-weight is-locked'}>
                    <span className="bw-weight-text"><b>{channel.label}</b><em>{channel.available ? channel.line : channel.reason || 'Research required'}</em></span>
                    {channel.available
                      ? <Step label={`${channel.label} weight`} value={`${Math.round(weight * 100)}%`} onDown={() => setWeight(weight - 0.05)} onUp={() => setWeight(weight + 0.05)} atMin={weight <= 0} atMax={weight >= 1} />
                      : <em className="bw-weight-lock">Locked</em>}
                  </li>
                );
              })}
            </ul>
            <Dial
              label="Country money"
              value={draft.allocationMode}
              options={[
                { id: 'AUTO', name: 'Auto', line: 'Spread by market size and readiness.' },
                { id: 'MANUAL', name: 'Manual', line: 'Weight each country yourself.' },
              ]}
              onPick={(id) => setMarketing({ allocationMode: id as StreamingLaunchMarketingAllocationMode })}
            />
            <ul className="bw-weights" aria-label="Country allocation">
              {forecast.countryForecasts.map((country) => {
                const weight = draft.countryWeights[country.countryId] || 0;
                const setWeight = (next: number) => setMarketing({ countryWeights: { ...draft.countryWeights, [country.countryId]: Math.max(0, next) } });
                return (
                  <li key={country.countryId} className="bw-weight">
                    <span className="bw-weight-text"><b>{country.countryName}</b><em>{money(country.allocatedAmount)} · {pct(country.likelyAwarenessLift)} paid lift</em></span>
                    {draft.allocationMode === 'MANUAL' && (
                      <Step label={`${country.countryName} weight`} value={String(weight)} onDown={() => setWeight(weight - 1)} onUp={() => setWeight(weight + 1)} atMin={weight <= 0} />
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        </section>
      )}

      {/* ---- the forecast: before the campaign, and with this plan ----------- */}
      {forecast && (
        <section className="bw-money bw-money--forecast" aria-label="Country forecast" aria-live="polite">
          <p className="kit-title"><b>Country forecast</b><em>{forecast.confidenceScore}% · {forecast.confidence.toLowerCase()} confidence</em></p>
          <div className="bw-shift-head" aria-hidden="true"><span>Before campaign</span><span>With this plan</span></div>
          <ul className="bw-shift">
            <li>
              <em>Audience awareness</em>
              <span className="bw-shift-pair"><i>{pct(forecast.organicAwareness)}</i><span aria-hidden="true">→</span><Figure value={currentAwareness} format={pct} /></span>
              <small>+{pct(forecast.likelyAwarenessLift)} paid lift</small>
            </li>
            <li>
              <em>New households</em>
              <span className="bw-shift-pair"><i>0</i><span aria-hidden="true">→</span><Figure value={forecast.acquiredAccounts.likely} format={compactCount} /></span>
              <small>{compactCount(forecast.acquiredAccounts.low)}–{compactCount(forecast.acquiredAccounts.high)} likely range</small>
            </li>
            <li>
              <em>Opening concurrency</em>
              <span className="bw-shift-pair"><i>{compactCount(baselineConcurrency)}</i><span aria-hidden="true">→</span><Figure value={forecast.concurrentStreams.likely} format={compactCount} /></span>
              <small>+{compactCount(concurrencyDelta)} at opening</small>
            </li>
            <li>
              <em>Acquisition cost</em>
              <span className="bw-shift-pair">{forecast.customerAcquisitionCost === null ? <b className="kit-figure">Organic</b> : <Figure value={forecast.customerAcquisitionCost} format={moneyPrecise} />}</span>
              <small>a forecast household</small>
            </li>
          </ul>
          {forecast.efficiencyStatus === 'SATURATED' && <Verdict label="Market saturated" tone="warn" line={`${forecast.saturationPercent}% of useful paid reach is covered. More budget mostly raises the cost of each household.`} />}
          {forecast.efficiencyStatus === 'DIMINISHING' && <Verdict label="Diminishing returns" tone="warn" line={`${forecast.saturationPercent}% of useful paid reach is covered. Each extra dollar reaches fewer new households.`} />}
          {forecast.efficiencyStatus === 'EFFICIENT' && <Verdict label="Efficient" tone="good" />}
          {forecast.warnings.length > 0 && <ul className="cr-risks">{forecast.warnings.map((warning) => <li key={warning}><i aria-hidden="true">!</i>{warning.replaceAll('_', ' ').toLowerCase()}</li>)}</ul>}
          <p className="bw-money-why">Confidence combines market readiness, funded coverage, channel fit and campaign timing.</p>
        </section>
      )}

      {/* ---- the record: what it will sell ----------------------------------- */}
      <section className="bw-money bw-money--commercial" aria-label="Commercial setup">
        <p className="kit-title"><b>Commercial setup</b><button type="button" className="bw-money-jump" onClick={() => handlers.onEditPricing?.()}>Edit pricing →</button></p>
        <p className="bw-money-model">{data.pricing.model}</p>
        <Hud items={[
          { label: 'Plans on sale', value: <Figure value={data.pricing.plans} format={whole} /> },
          { label: 'A household', value: <Figure value={data.pricing.arpu} format={moneyPrecise} /> },
          { label: 'Forecast reach', value: <Figure value={data.pricing.reach} format={compactCount} /> },
        ]} />
        {data.pricing.plans === 0 && <Verdict label="Nothing on sale" tone="bad" line="Commissioning is blocked until at least one plan exists." />}
        {data.pricing.problems.length > 0 && <ul className="cr-risks">{data.pricing.problems.map((problem) => <li key={problem}><i aria-hidden="true">!</i>{problem}</li>)}</ul>}
      </section>
    </>
  );
}
