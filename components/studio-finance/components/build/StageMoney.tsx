/* ============================================================================
   MONEY — can the company afford all of this?

   One answer, one lever, its consequences, and the record.

   · The answer is the bill laid end to end: one bar, each part a solid colour
     — settled, due when you commission, reserved for opening night — with a
     line across it where the treasury runs out, if it does. Beside it, the
     whole launch, what is available, and what is left after.
   · The launch campaign (#151, #158) is the launch's marketing: what it
     pushes, its picture, its picks, a week of them × its weeks before
     opening, and its opening night. It is built in the Campaign Studio's
     builder; the marketing ceiling it used to sit under is gone, so its own
     money is the bill's "Launch campaign" line.
   · Then the forecast it produces, and the commercial setup it will sell.

   Nothing here is a bare form control.
   ========================================================================== */

import { useState } from 'react';
import type {
  CampaignFormatId,
  OwnedStreamingLaunchMarketingDraft,
  StreamingLaunchMarketingObjective,
  StreamingLaunchMarketingTimeline,
} from '../../../../types';
import type { StageProps } from './BuildWizard';
import type { RoomCounterpart, SpendLine } from '../../finance/build';
import { roomCounterparts } from '../../finance/build';
import { regionOfCity, regionsOf } from '../../finance/placer';
import { compactCount, money, moneyPrecise, pct as formatPct } from '../../finance/format';
import { Figure, Hud, Verdict, type KitPartTone } from '../kit';
import { LAUNCH_DOORS, LaunchCampaignBuilder, launchCreativeSubject } from '../../../campaigns/studio/LaunchCampaignBuilder';
import { FormatGlyph } from '../../../campaigns/studio/formatGlyphs';
import launchCss from '../../../campaigns/studio/LaunchCampaign.module.css';
import { CAMPAIGN_FORMATS, CAMPAIGN_FORMAT_ORDER, campaignMomentOf } from '../../../../services/campaigns/campaignFormats';
import { LAUNCH_CAMPAIGN_MAX_WEEKS } from '../../../../services/streamingLaunchMarketing';
import { creativeFramesOf } from '../../../campaigns/creatives/creativeFrames';
import { useMadeForYou } from '../../../campaigns/creatives/CreativeStep';
import { useKeptCreative } from '../../../campaigns/creatives/creativeMedia';
import { DoorPicture, FormatPicture } from '../../../campaigns/scenes/FormatPicture';

/* #151: the launch builder's words for what the opening pushes, and when */
const OBJECTIVES: Array<{ id: StreamingLaunchMarketingObjective; label: string }> = [
  { id: 'PLATFORM_INTRODUCTION', label: 'The service' },
  { id: 'CATALOGUE_SHOWCASE', label: 'The catalogue' },
  { id: 'FLAGSHIP_ORIGINAL', label: 'A flagship original' },
  { id: 'VALUE_PROPOSITION', label: 'The price' },
];

const TIMELINES: Array<{ id: StreamingLaunchMarketingTimeline; label: string }> = [
  { id: 'FRONT_LOADED', label: 'Tease early' },
  { id: 'BALANCED', label: 'Steady' },
  { id: 'LAST_WEEK_PUSH', label: 'Opening-week push' },
];

/* #158: every format's creative frame; a campaign's picture is drawn in its lead format's (search ads show the square
   one; a door, the wide one) */
const ALL_FRAMES = creativeFramesOf(CAMPAIGN_FORMAT_ORDER);
const frameFor = (formatId: CampaignFormatId | null) => (formatId
  ? ALL_FRAMES.find((frame) => frame.formats.includes(formatId)) ?? ALL_FRAMES.find((frame) => frame.key === '1:1')
  : ALL_FRAMES.find((frame) => frame.key === '16:9')) ?? null;

/* The bill's parts, by when the money moves. A part's tone is its identity
   everywhere on the page: the bar, and the swatch beside its lines. */
const BILL_GROUPS: Array<{ id: string; label: string; tone: KitPartTone; match: (line: SpendLine) => boolean }> = [
  { id: 'settled', label: 'Settled', tone: 'flat', match: (line) => line.timing === 'SETTLED' },
  { id: 'commission', label: 'Due at commission', tone: 'brand', match: (line) => !line.timing || line.timing === 'COMMISSION' },
  { id: 'reserved', label: 'Reserved for opening night', tone: 'gold', match: (line) => line.timing === 'OPENING_NIGHT' },
];

const pct = (value: number): string => formatPct(value * 100, 1);
const whole = (value: number): string => String(Math.round(value));

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

export function StageMoney({ data, draft: build, totals, plan, handlers, campaignOnly }: StageProps) {
  const marketing = data.marketing;
  const draft = marketing?.draft;
  const forecast = marketing?.forecast;
  const setMarketing = (patch: Partial<OwnedStreamingLaunchMarketingDraft>) => handlers.onChangeMarketing?.(patch);
  /* #151: the launch campaign opens in the Campaign Studio's builder, in launch mode */
  const [buildingCampaign, setBuildingCampaign] = useState(false);
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

  /* #158: the launch campaign is the launch's marketing: a week of its picks × its weeks before opening, and its
     opening night, all in its own money (the plan's `budgetCeiling`) */
  const ceiling = draft?.budgetCeiling ?? 0;
  const campaignOn = ceiling > 0;
  const buildWeeks = Math.max(1, Math.min(LAUNCH_CAMPAIGN_MAX_WEEKS, totals?.weeks ?? LAUNCH_CAMPAIGN_MAX_WEEKS));
  const night = Math.min(ceiling, draft?.openingNight ?? 0);
  const campaignWeeks = draft?.weeks ?? null;
  const weekly = campaignWeeks ? Math.round((ceiling - night) / campaignWeeks) : null;
  const campaignFormats = draft?.formatIds ?? [];
  /* a plan from before the builder's picks has a channel mix only: no picks, no picture */
  const picked = Boolean(draft?.formatIds);
  const campaignDoors = picked ? LAUNCH_DOORS.filter((door) => (draft?.channelAllocations[door.id] ?? 0) > 0) : [];
  const openingIds = forecast?.countryForecasts.map((country) => country.countryId) ?? [];
  const openingName = (id: string) => forecast?.countryForecasts.find((country) => country.countryId === id)?.countryName ?? id;
  const moment = campaignMomentOf(campaignFormats, openingIds, draft?.places);
  /* its picture: its opening night where it happens, else a place it runs, else its first pick (a door: the store) */
  const leadFormat = moment?.formatId ?? campaignFormats.find((id) => CAMPAIGN_FORMATS[id].group === 'OUT_OF_HOME') ?? campaignFormats[0] ?? null;
  const leadFrame = campaignOn && (leadFormat || campaignDoors.length) ? frameFor(leadFormat) : null;
  const serviceName = marketing?.serviceName || 'EMPIRE+';
  const brandHue = marketing?.brandHue ?? 212;
  const subject = launchCreativeSubject(draft?.objective ?? 'PLATFORM_INTRODUCTION', marketing?.flagship ?? null, serviceName, brandHue);
  const made = useMadeForYou(leadFrame ? subject : null, leadFrame ? [leadFrame] : [], Boolean(leadFrame) && !buildingCampaign);
  const keptLead = useKeptCreative(leadFrame && leadFormat ? draft?.creativeIds?.[leadFrame.formats[0]] ?? null : null);
  const leadCreative = keptLead ?? (leadFrame ? made[leadFrame.key] ?? null : null);

  return (
    <>
      {/* ---- the answer: what leaves, against what there is -----------------
          The hero bar used to be scaled to the BILL, so it filled its track
          whether the launch cost a quarter of the treasury or all of it —
          a picture that answered the page's own question the same way every
          time. It is the treasury now: the bill's lines fill part of it and
          what survives is the rest of the track (#121). */}
      {!campaignOnly && <>
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
              : draft?.weeks
                ? `of ${money(plan.available)} in the treasury. All of it is charged when you commission, the launch campaign's weeks before opening too.`
                : `of ${money(plan.available)} in the treasury. Charged when you commission, except the launch campaign, which is paid week by week up to opening.`}
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

      </>}
      <p className="bw-money-divider"><b>{campaignOnly ? 'Opening campaign' : 'The launch'}</b><em>what it costs to be heard</em></p>

      {/* ---- the launch campaign (#151, #158): the launch's marketing, built like every later campaign in the
          Studio's builder. The ceiling it used to sit under is gone: its picks, weeks and opening night are its money. */}
      {marketing && draft && forecast && (
        <section className="bw-money bw-money--campaign" aria-label="Launch campaign">
          <p className="kit-title"><b>Launch campaign</b><em>{campaignOn
            ? `${objective?.label}${campaignWeeks ? ` · ${campaignWeeks} ${campaignWeeks === 1 ? 'week' : 'weeks'} before opening` : timeline ? ` · ${timeline.label}` : ''}`
            : 'organic opening'}</em></p>
          <div className={launchCss.card}>
            {leadFrame && (
              <div className={launchCss.cardPicture}>
                {leadFormat ? (
                  <FormatPicture formatId={leadFormat} countryId={moment?.formatId === leadFormat ? moment.countryId : openingIds.find((id) => CAMPAIGN_FORMATS[leadFormat].sites?.[id]) ?? null}
                    creative={leadCreative} subjectName={subject.title} brandName={serviceName} hue={brandHue} />
                ) : (
                  <DoorPicture doorId={campaignDoors[0].id} creative={leadCreative} subjectName={subject.title} brandName={serviceName} hue={brandHue} />
                )}
                {moment && <small>{CAMPAIGN_FORMATS[moment.formatId].name} · {moment.site ? `${moment.site}, ` : ''}{openingName(moment.countryId)} · opening night</small>}
              </div>
            )}
            {campaignOn ? (
              <>
                {picked && (campaignFormats.length || campaignDoors.length) ? (
                  <div className={launchCss.cardFormats}>
                    {campaignFormats.map((id) => <span key={id}><FormatGlyph id={id} />{CAMPAIGN_FORMATS[id].name}</span>)}
                    {campaignDoors.map((door) => <span key={door.id}><i aria-hidden="true">{door.id === 'DEVICE_STORES' ? '⇩' : '☏'}</i>{door.name}</span>)}
                  </div>
                ) : (
                  <p className="bw-money-why">{marketing.channels.filter((channel) => (draft.channelAllocations[channel.id] || 0) > 0).map((channel) => channel.label).join(' · ') || 'No channels picked yet.'}</p>
                )}
                <div className={launchCss.cardMoney}>
                  <span><small>A week</small><b>{weekly ? money(weekly) : '—'}</b><em>{weekly ? 'of what it runs' : campaignWeeks ? 'no weeks' : 'across the build'}</em></span>
                  <span><small>Weeks</small><b>{campaignWeeks ?? buildWeeks}</b><em>{campaignWeeks ? 'before opening' : 'the whole build'}</em></span>
                  <span><small>In all</small><b>{money(ceiling)}</b><em>{night ? `${money(night)} of it on opening night` : campaignWeeks ? 'paid at commission' : 'spent across the build'}</em></span>
                </div>
                {campaignWeeks !== null && campaignWeeks > buildWeeks && (
                  <p className={launchCss.cardWarn}>The build takes {buildWeeks} {buildWeeks === 1 ? 'week' : 'weeks'} now: its {campaignWeeks} weeks of money would be spent in them. Edit it to fit.</p>
                )}
              </>
            ) : (
              <p className="bw-money-why">No campaign: the service opens on word of mouth alone. Build one, and what it runs, its weeks and its money show here and on the bill.</p>
            )}
            <div className={launchCss.cardActions}>
              <button type="button" className="bw-money-jump" disabled={!marketing.forecastFor || data.commissioned} onClick={() => setBuildingCampaign(true)}>
                {data.commissioned ? 'Commissioned' : campaignOn ? 'Edit the launch campaign →' : 'Build the launch campaign →'}
              </button>
              {campaignOn && !data.commissioned && <button type="button" className={launchCss.cardQuiet} onClick={() => setMarketing({ budgetCeiling: 0, openingNight: 0 })}>Open without it</button>}
            </div>
          </div>
        </section>
      )}
      {buildingCampaign && marketing?.forecastFor && draft && forecast && (
        <LaunchCampaignBuilder
          draft={draft}
          channels={marketing.channels}
          forecastFor={marketing.forecastFor}
          rateCardFor={marketing.rateCardFor}
          maxWeeks={buildWeeks}
          countries={forecast.countryForecasts.map((country) => ({ countryId: country.countryId, countryName: country.countryName }))}
          hasFlagshipOriginal={Boolean(marketing.hasFlagshipOriginal)}
          hasSellablePlan={marketing.hasSellablePlan !== false}
          priceHook={marketing.priceHook ?? null}
          flagship={marketing.flagship ?? null}
          catalogue={marketing.catalogue ?? []}
          serviceName={serviceName}
          brandHue={brandHue}
          accent={marketing.accent || '#3b82f6'}
          spare={Math.max(0, data.treasury.available - ((plan.commissionNow ?? 0) - (draft.weeks ? ceiling : 0)) - (totals?.weeklyCost ?? 0) * 12)}
          onCancel={() => setBuildingCampaign(false)}
          onSave={(patch) => { setMarketing(patch); setBuildingCampaign(false); }}
        />
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
          { label: 'Ways to watch', value: <Figure value={data.pricing.plans} format={whole} /> },
          { label: 'A household', value: <Figure value={data.pricing.arpu} format={moneyPrecise} /> },
          { label: 'Forecast reach', value: <Figure value={data.pricing.reach} format={compactCount} /> },
        ]} />
        {data.pricing.plans === 0 && <Verdict label="Nothing on sale" tone="bad" line="Commissioning is blocked until at least one plan exists." />}
        {data.pricing.problems.length > 0 && <ul className="cr-risks">{data.pricing.problems.map((problem) => <li key={problem}><i aria-hidden="true">!</i>{problem}</li>)}</ul>}
      </section>
    </>
  );
}
