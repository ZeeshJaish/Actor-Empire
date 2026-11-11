import { isStreamingPlusItem } from '../../../services/streamingPlusPack';
import { openStreamingPlusSheet } from '../../../services/streamingPlusEvents';
import { StreamingPlusChip } from '../../streamingPlus/StreamingPlusParts';
/**
 * The launch campaign, built like every later campaign (#151; plan §20.12, Zeesh: "विजार्ड पेज में … कुछ कुछ चेंजेस हो
 * जाएंगे, जैसे कि उस टाइम हमारे पास शायद कोई सीरीज ना हो … प्लेटफॉर्म पुश करना है या क्या करना है"). The Campaign
 * Studio's builder in launch mode, opened from Build the Platform's Money stage. It writes the launch marketing plan the
 * wizard always had (`OwnedStreamingLaunchMarketingDraft`), so the opening forecast and the opening subscribers come from
 * the same engine, unchanged.
 *  - What: the four pushes an opening can make (the service, the catalogue, a flagship original, the price), each saying
 *    when it cannot be used yet and why;
 *  - Where: the opening countries, spread by opportunity or weighted by hand;
 *  - How: the Studio's formats under the launch engine's channels, and the two doors only an opening has (app stores,
 *    carrier bundles); a locked channel says what unlocks it, a format with no site in the opening countries says where it
 *    is. The formats set the channels' weights. #158: each card shows its live picture with the campaign's creative in it
 *    and what it costs a week in the opening countries (a big moment: its night, at a place that can be changed);
 *  - Creative: the Studio's Creative step: your art in each format's frame, or art made for you from the brand (or the
 *    flagship's poster);
 *  - Budget (#158, plan §20.13: the Studio's, "a week × the weeks before opening"): a week of what you picked × how hard,
 *    for 1 to the build's weeks before opening, and the big moments once, on opening night. The ceiling it replaced and
 *    the "when" are gone: one week is an opening-week push, more is steady;
 *  - Review: the forecast with this plan, and the art in its frames.
 * Nothing saves until "Use this launch campaign"; the forecast is worked out as you go. With a big moment or a famous
 * screen, its picture is drawn once the builder has closed, for the opening night's news.
 */
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import css from './CampaignStudio.module.css';
import launchCss from './LaunchCampaign.module.css';
import creativeCss from '../creatives/Creatives.module.css';
import type {
  CampaignFormatId,
  OwnedStreamingLaunchMarketingDraft,
  StreamingLaunchMarketingChannelId,
  StreamingLaunchMarketingForecastSnapshot,
  StreamingLaunchMarketingObjective,
} from '../../../types';
import { CAMPAIGN_FORMATS, CAMPAIGN_FORMAT_ORDER, campaignFormatIn, campaignMomentOf } from '../../../services/campaigns/campaignFormats';
import { CAMPAIGN_STRENGTHS } from '../../../services/campaigns/campaignEngine';
import { launchCampaignMoney, launchCampaignTimeline, launchRateCardOf, type LaunchDoorId, type LaunchRateCard } from '../../../services/campaigns/launchCampaignRates';
import { LAUNCH_CAMPAIGN_MAX_WEEKS } from '../../../services/streamingLaunchMarketing';
import { CountryFlagSvg } from '../../studio-finance/components/FlagField';
import { Poster } from '../../../content-market-exact/Poster';
import { FormatGlyph } from './formatGlyphs';
import { STRENGTH_WORDS } from './campaignWords';
import { creativeFramesOf, creativeIdsFor } from '../creatives/creativeFrames';
import { CreativeStep, FrameThumb, sceneOfFormat, sceneOfFrame, useMadeForYou, type KeptCreative } from '../creatives/CreativeStep';
import { newCreativeId } from '../creatives/creativeMedia';
import { keepCampaignPicture } from '../creatives/campaignPicture';
import { DoorPicture, FormatPicture } from '../scenes/FormatPicture';
import type { CreativeSubject } from '../scenes/defaultCreative';

/* the Studio's six steps */
export type LaunchCampaignStep = 'WHAT' | 'WHERE' | 'HOW' | 'CREATIVE' | 'BUDGET' | 'REVIEW';
type Step = LaunchCampaignStep;
const STEPS: Step[] = ['WHAT', 'WHERE', 'HOW', 'CREATIVE', 'BUDGET', 'REVIEW'];
const STEP_WORDS: Record<Step, string> = { WHAT: 'What', WHERE: 'Where', HOW: 'How', CREATIVE: 'Creative', BUDGET: 'Budget', REVIEW: 'Review' };
type Places = Partial<Record<CampaignFormatId, string>>;

/** each format feeds one of the launch engine's channels */
export const LAUNCH_CHANNEL_OF: Record<CampaignFormatId, StreamingLaunchMarketingChannelId> = {
  SOCIAL_FEED: 'SOCIAL_DIGITAL', SHORT_VIDEO: 'SOCIAL_DIGITAL', SEARCH: 'SOCIAL_DIGITAL', CTV: 'SOCIAL_DIGITAL',
  CREATORS: 'CREATORS',
  TV_SPOTS: 'TV_OUTDOOR', BILLBOARD: 'TV_OUTDOOR', METRO_WRAP: 'TV_OUTDOOR', POSTER_WALL: 'TV_OUTDOOR', FLYERS: 'TV_OUTDOOR',
  AIRPORT_SCREENS: 'TV_OUTDOOR', MALL_SCREENS: 'TV_OUTDOOR', CITY_SCREEN: 'TV_OUTDOOR',
  BUILDING_REVEAL: 'PRESS_EVENTS', LANDMARK_LIGHT_SHOW: 'PRESS_EVENTS', DRONE_SHOW: 'PRESS_EVENTS', FAN_FESTIVAL: 'PRESS_EVENTS', LIVE_SHOW: 'PRESS_EVENTS',
};
/** the doors only an opening has */
export const LAUNCH_DOORS: Array<{ id: LaunchDoorId; name: string; line: string }> = [
  { id: 'DEVICE_STORES', name: 'App stores', line: 'Pre-registration and store featuring, where people install' },
  { id: 'TELCO_BUNDLES', name: 'Carrier bundles', line: 'Distribution and value in one agreement' },
];
const CHANNEL_GROUPS: Array<{ id: StreamingLaunchMarketingChannelId; label: string }> = [
  { id: 'SOCIAL_DIGITAL', label: 'Social & digital' },
  { id: 'CREATORS', label: 'Creators' },
  { id: 'TV_OUTDOOR', label: 'TV & outdoor' },
  { id: 'PRESS_EVENTS', label: 'Press & events · opening night' },
];
/* #158: a plan from before formats (a channel mix only) opens with one format for each of its channels, so its week has
   a price */
const FORMAT_OF_CHANNEL: Partial<Record<StreamingLaunchMarketingChannelId, CampaignFormatId>> = { SOCIAL_DIGITAL: 'SOCIAL_FEED', CREATORS: 'CREATORS', TV_OUTDOOR: 'TV_SPOTS' };

/** The channels' weights from the picked formats and doors: each picked format adds one to its channel. */
export const launchChannelWeights = (formats: CampaignFormatId[], doors: StreamingLaunchMarketingChannelId[]): Partial<Record<StreamingLaunchMarketingChannelId, number>> => {
  const counts = new Map<StreamingLaunchMarketingChannelId, number>();
  formats.forEach(id => counts.set(LAUNCH_CHANNEL_OF[id], (counts.get(LAUNCH_CHANNEL_OF[id]) || 0) + 1));
  doors.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
  const top = Math.max(1, ...counts.values());
  return Object.fromEntries([...counts.entries()].map(([id, count]) => [id, Math.round((count / top) * 100) / 100]));
};

/** What the launch's made-for-you art is drawn from: the flagship's poster when it leads, else the service. */
export const launchCreativeSubject = (objective: StreamingLaunchMarketingObjective, flagship: LaunchCampaignBuilderProps['flagship'], serviceName: string, brandHue: number): CreativeSubject => (
  objective === 'FLAGSHIP_ORIGINAL' && flagship
    ? { title: flagship.title, service: serviceName, hue: flagship.hue, brandHue, kind: 'TITLE', art: { id: flagship.id, genre: flagship.genre, hue: flagship.hue } }
    : { title: serviceName, service: serviceName, hue: brandHue, brandHue, kind: 'SERVICE', art: null }
);

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : `$${Math.round(value)}`);
const count = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value)));
const pct = (value: number) => `${Math.round(value * 100)}%`;
const weeksWord = (weeks: number) => `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

const WARNING_WORDS: Record<string, string> = {
  NO_OPENING_COUNTRIES: 'Pick the opening countries in Markets first.',
  NO_SELLABLE_PLAN: 'Nothing is on sale yet: set a plan in the offer.',
  MISSING_FLAGSHIP_ORIGINAL: 'No Original is ready by opening day, so a flagship push falls flat.',
  BUDGET_SHORTFALL: 'The treasury cannot spare this much and keep the service running.',
  INSUFFICIENT_MARKET_COVERAGE: 'The budget is too thin to be seen in every opening country.',
  MANUAL_ALLOCATION_REVIEW: 'Give at least one country some weight.',
  LOCKED_CHANNEL: 'A channel you picked is still locked.',
};

export interface LaunchCampaignBuilderProps {
  /** Whether the player owns the Streaming+ Pack; absent reads as owned (labs). */
  streamingPlusOwned?: boolean;
  draft: OwnedStreamingLaunchMarketingDraft;
  channels: Array<{ id: StreamingLaunchMarketingChannelId; label: string; line: string; available: boolean; reason?: string }>;
  forecastFor: (draft: OwnedStreamingLaunchMarketingDraft) => StreamingLaunchMarketingForecastSnapshot;
  /** #158: what each format and door costs a week in the opening countries; without the world (a fixture), each
      opening country is priced as the reference market */
  rateCardFor?: (places?: Places) => LaunchRateCard;
  /** #158: the weeks before opening: the build's weeks */
  maxWeeks: number;
  countries: Array<{ countryId: string; countryName: string }>;
  hasFlagshipOriginal: boolean;
  hasSellablePlan: boolean;
  /** what the price push leads with: the free tier, a trial, a launch price … */
  priceHook: string | null;
  flagship: { id: string; title: string; genre: string; hue: number } | null;
  /** the opening catalogue's best-known titles */
  catalogue: Array<{ id: string; title: string; genre?: string; hue?: number }>;
  serviceName: string;
  brandHue: number;
  accent: string;
  /** what the treasury can spare for the campaign */
  spare: number;
  /** 2026-11-11: where spare comes from (company treasury, the network at commission, 12 weeks of running costs) */
  spareBreakdown?: { treasury: number; network: number; reserve: number };
  /** 2026-11-11: the ways out when nothing is left for a campaign (a campaign is optional) */
  onInjectCapital?: () => void;
  onOpenWithout?: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<OwnedStreamingLaunchMarketingDraft>) => void;
  /** where it opens (an audit, a fixture); the builder opens on What */
  initialStep?: LaunchCampaignStep;
}

export const LaunchCampaignBuilder: React.FC<LaunchCampaignBuilderProps> = props => {
  const { draft, channels, forecastFor, rateCardFor, maxWeeks, countries, hasFlagshipOriginal, hasSellablePlan, priceHook, flagship, catalogue, serviceName, brandHue, accent, spare, onCancel, onSave, initialStep, spareBreakdown, onInjectCapital, onOpenWithout } = props;
  const channelOf = (id: StreamingLaunchMarketingChannelId) => channels.find(channel => channel.id === id);
  const longest = Math.max(1, Math.min(LAUNCH_CAMPAIGN_MAX_WEEKS, Math.round(maxWeeks) || 1));
  const [step, setStep] = useState<Step>(initialStep ?? 'WHAT');
  const [objective, setObjective] = useState<StreamingLaunchMarketingObjective>(draft.objective);
  const [mode, setMode] = useState(draft.allocationMode);
  const [weights, setWeights] = useState<Record<string, number>>(draft.countryWeights);
  const [formats, setFormats] = useState<CampaignFormatId[]>(draft.formatIds
    ?? Object.entries(FORMAT_OF_CHANNEL).filter(([id]) => (draft.channelAllocations[id as StreamingLaunchMarketingChannelId] ?? 0) > 0).map(([, id]) => id!));
  const [doors, setDoors] = useState<LaunchDoorId[]>(LAUNCH_DOORS.filter(door => (draft.channelAllocations[door.id] ?? 0) > 0).map(door => door.id));
  /* #158: its weeks before opening, how hard, and where its nights happen */
  const [weeks, setWeeks] = useState(() => Math.min(longest, draft.weeks ?? Math.min(4, longest)));
  const [strength, setStrength] = useState<number>(draft.strength ?? 1);
  const [places, setPlaces] = useState<Places>(draft.places ?? {});
  const [placing, setPlacing] = useState<CampaignFormatId | null>(null);
  const [placingAll, setPlacingAll] = useState(false);
  /* the art uploaded for each frame, kept from before; the rest is made for you */
  const [kept, setKept] = useState<Record<string, KeptCreative | undefined>>(() => Object.fromEntries(creativeFramesOf(draft.formatIds ?? [])
    .filter(frame => draft.creativeIds?.[frame.formats[0]])
    .map(frame => [frame.key, { mediaId: draft.creativeIds![frame.formats[0]]!, canvas: null }])));
  const countryIds = countries.map(country => country.countryId);
  const countryKey = countryIds.join(',');
  const countryName = (id: string) => countries.find(country => country.countryId === id)?.countryName ?? id;
  /* a big moment's place: its landmark or screen and the country, or the country */
  const nightPlace = (formatId: CampaignFormatId, countryId: string) => {
    const site = CAMPAIGN_FORMATS[formatId].sites?.[countryId];
    return site ? `${site}, ${countryName(countryId)}` : countryName(countryId);
  };
  const nightAt = (formatId: CampaignFormatId, countryId: string) => {
    if (CAMPAIGN_FORMATS[formatId].sites?.[countryId]) return `at ${nightPlace(formatId, countryId)}`;
    const name = countryName(countryId);
    return `in ${/^(United|Netherlands|Philippines|Czech|Dominican|Bahamas|Maldives)/.test(name) ? 'the ' : ''}${name}`;
  };
  /* #158: what everything costs here, and what the picks come to */
  const card = useMemo(() => (rateCardFor ? rateCardFor(places) : launchRateCardOf(countryIds.map(countryId => ({ countryId, homes: 20_000_000, costIndex: 1 })), places)),
    [rateCardFor, countryKey, places]);
  const flowing = formats.filter(id => CAMPAIGN_FORMATS[id].group !== 'BIG_MOMENT');
  const nights = formats.filter(id => CAMPAIGN_FORMATS[id].group === 'BIG_MOMENT');
  /* only big moments: opening night, no weeks */
  const runs = flowing.length > 0 || doors.length > 0;
  const plan = launchCampaignMoney(card, { formats, doors, weeks, strength }, longest);
  const timeline = launchCampaignTimeline(plan.weeks);
  const budget = plan.total;
  const weekPrice = flowing.reduce((sum, id) => sum + card.formats[id].weekly, 0) + doors.reduce((sum, id) => sum + card.doors[id], 0);
  const channelAllocations = launchChannelWeights(formats, doors);
  const next: OwnedStreamingLaunchMarketingDraft = {
    ...draft, objective, allocationMode: mode, countryWeights: weights, channelAllocations, timeline, budgetCeiling: budget, formatIds: formats,
    weeks: plan.weeks, strength, places: plan.places, openingNight: plan.night,
  };
  const forecast = useMemo(() => forecastFor(next), [objective, mode, JSON.stringify(weights), JSON.stringify(channelAllocations), timeline, budget]);
  const at = STEPS.indexOf(step);
  const toggle = (id: CampaignFormatId) => setFormats(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  const toggleDoor = (id: LaunchDoorId) => setDoors(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  const subject = launchCreativeSubject(objective, flagship, serviceName, brandHue);
  const frames = useMemo(() => creativeFramesOf(formats), [formats.join(',')]);
  /* #158: every format's frame, from How on: How's cards show each format with its creative (as the Studio's, #156) */
  const allFrames = useMemo(() => creativeFramesOf(CAMPAIGN_FORMAT_ORDER), []);
  const made = useMadeForYou(subject, allFrames, step !== 'WHAT' && step !== 'WHERE');
  const creativeIn = (key: string | undefined) => {
    const frame = allFrames.find(item => item.key === key);
    return frame ? (kept[frame.key]?.canvas ?? made[frame.key] ?? null) : null;
  };
  /* search ads carry no image of their own: their result shows the square one */
  const creativeOf = (formatId: CampaignFormatId) => creativeIn((allFrames.find(item => item.formats.includes(formatId)) ?? allFrames.find(item => item.key === '1:1'))?.key);
  const yours = frames.filter(frame => kept[frame.key]).length;
  /* a format picked before the opening countries changed may have no site left in them */
  const nowhereOf = (id: CampaignFormatId) => !countryIds.some(countryId => campaignFormatIn(CAMPAIGN_FORMATS[id], countryId));
  const stranded = formats.filter(nowhereOf);
  const pushes: Array<{ id: StreamingLaunchMarketingObjective; name: string; line: string; off: string | null }> = [
    { id: 'PLATFORM_INTRODUCTION', name: 'The service', line: `What ${serviceName} is and why to join. Every opening can lead with it.`, off: null },
    { id: 'CATALOGUE_SHOWCASE', name: 'The catalogue', line: catalogue.length ? `Its best-known opening titles: ${catalogue.slice(0, 3).map(item => item.title).join(', ')}${catalogue.length > 3 ? ' …' : ''}` : 'The range of what streams on day one.', off: catalogue.length ? null : 'No titles are in the opening catalogue yet.' },
    { id: 'FLAGSHIP_ORIGINAL', name: 'A flagship original', line: flagship ? `${flagship.title} premieres with the service.` : 'One Original, premiering on opening day.', off: hasFlagshipOriginal ? null : 'No Original is ready by opening day.' },
    { id: 'VALUE_PROPOSITION', name: 'The price', line: priceHook ? `Lead with ${priceHook}.` : 'Lead with the plans and what they cost.', off: hasSellablePlan ? null : 'Nothing is on sale yet: set a plan in the offer.' },
  ];
  const ready: Record<Step, boolean> = {
    WHAT: !pushes.find(push => push.id === objective)?.off,
    WHERE: countries.length > 0 && (mode === 'AUTO' || Object.values(weights).some((value: unknown) => Number(value) > 0)),
    HOW: (formats.length > 0 || doors.length > 0) && stranded.length === 0,
    CREATIVE: true,
    BUDGET: budget > 0 && budget <= spare,
    REVIEW: budget > 0 && budget <= spare,
  };
  /* where the fixed-site formats and the nights happen: a landmark, a famous screen, a country */
  const sites = formats.flatMap(id => {
    const format = CAMPAIGN_FORMATS[id];
    const countryId = card.formats[id].show?.countryId ?? (format.sites ? countryIds.find(item => campaignFormatIn(format, item)) : undefined);
    return countryId ? [`${format.name}: ${nightPlace(id, countryId)}`] : [];
  });
  const save = () => {
    /* a big moment or a famous screen makes the opening night's news; its picture is its scene where it happens,
       else its widest art (16:9 first), the same rule as a Studio campaign */
    const placed = plan.places;
    const moment = campaignMomentOf(formats, countryIds, placed);
    /* #156: the moment's own scene where it happens leads (a drone show draws the name) */
    const momentScene = moment ? sceneOfFormat(moment.formatId, countryIds, placed) : null;
    const momentFrame = moment ? frames.find(frame => frame.formats.includes(moment.formatId)) ?? null : null;
    const pictureFrame = moment ? ((momentScene ? momentFrame : null) ?? frames.find(frame => sceneOfFrame(frame, countryIds, placed)) ?? frames.find(frame => frame.key === '16:9') ?? frames[0] ?? null) : null;
    const pictureScene = momentScene ?? (pictureFrame ? sceneOfFrame(pictureFrame, countryIds, placed) : null);
    const pictureSource = pictureFrame ? (kept[pictureFrame.key]?.canvas ?? (kept[pictureFrame.key] ? { mediaId: kept[pictureFrame.key]!.mediaId } : made[pictureFrame.key]) ?? null)
      : momentScene === 'DRONE_SKY' ? Object.values(made).find(Boolean) ?? null : null;
    const pictureMediaId = pictureSource ? newCreativeId() : undefined;
    onSave({
      objective, allocationMode: mode, countryWeights: weights, timeline, budgetCeiling: budget, formatIds: formats, channelAllocations,
      weeks: plan.weeks, strength, places: placed, openingNight: plan.night,
      creativeIds: creativeIdsFor(frames, Object.fromEntries(frames.map(frame => [frame.key, kept[frame.key]?.mediaId]))),
      pictureMediaId,
    });
    /* drawn once the builder has closed, never on the tap */
    if (pictureMediaId && pictureSource) {
      window.setTimeout(() => { keepCampaignPicture(pictureMediaId, pictureScene, pictureSource, serviceName, brandHue).catch(() => undefined); }, 160);
    }
  };
  /* the totals Budget and Review share */
  const totals = (
    <section className={css.totals}>
      <div><span>IN ALL</span><b>{money(budget)}</b><small>{runs ? `${weeksWord(plan.weeks)} before opening` : 'opening night'}</small></div>
      <div><span>A WEEK</span><b>{runs ? money(plan.weekly) : '—'}</b><small>{runs ? STRENGTH_WORDS[strength].name : 'no weeks'}</small></div>
      <div><span>OPENING NIGHT</span><b>{plan.night ? money(plan.night) : '—'}</b><small>{nights.length ? `${nights.length} big ${nights.length === 1 ? 'moment' : 'moments'}` : 'no big moment'}</small></div>
      {/* 2026-11-11 (player report "why's it not letting me"): at $0 spare no smaller plan fits, so "fewer weeks,
          or less" sent players round in circles. Say where the money goes, and give the two ways out. */}
      <p>{spare <= 0
        ? spareBreakdown
          ? `Your company treasury has ${money(spareBreakdown.treasury)}. The network takes ${money(spareBreakdown.network)} and ${money(spareBreakdown.reserve)} is kept for 12 weeks of running costs, so nothing is left for a campaign.`
          : 'Nothing is left in the company treasury for a campaign after the network and its running costs.'
        : budget > spare
          ? `The treasury can spare ${money(spare)} and keep the service running: fewer weeks, or less.`
          : `It is paid week by week up to opening; ${money(spare - budget)} is left to spare.`}</p>
      {budget > spare && (onInjectCapital || (spare <= 0 && onOpenWithout)) && (
        <div className={css.totalsActions}>
          {onInjectCapital && <button type="button" onClick={onInjectCapital}>Inject capital</button>}
          {spare <= 0 && onOpenWithout && <button type="button" onClick={onOpenWithout}>Open without a campaign</button>}
        </div>
      )}
    </section>
  );

  const page = (
    <div className={cx(css.studio, launchCss.launch)} role="dialog" aria-modal="true" aria-label="Launch campaign" style={{ ['--cs-accent' as string]: accent }}>
      <header className={css.top}>
        <button type="button" className={css.back} onClick={() => (at === 0 ? onCancel() : setStep(STEPS[at - 1]))} aria-label="Back">←</button>
        <div className={css.title}><b>LAUNCH CAMPAIGN</b><span>{`STEP ${at + 1} OF ${STEPS.length} · BEFORE OPENING`}</span></div>
      </header>
      <ol className={cx(css.steps, launchCss.steps)}>
        {STEPS.map((item, index) => (
          <li key={item} className={cx(index === at && css.stepOn, index < at && css.stepDone)}>
            <button type="button" disabled={index > at && !STEPS.slice(0, index).every(prior => ready[prior])} onClick={() => setStep(item)}>
              <i>{index < at ? '✓' : index + 1}</i>{STEP_WORDS[item]}
            </button>
          </li>
        ))}
      </ol>
      <div className={css.scroll} key={step}>
        {step === 'WHAT' && (
          <>
            <p className={css.note}>Before opening there are no reviews and maybe no Originals yet. An opening pushes one of four things.</p>
            {pushes.map(push => (
              <button key={push.id} type="button" disabled={Boolean(push.off)} className={cx(css.whereCard, objective === push.id && css.picked, push.off && css.off)}
                onClick={() => setObjective(push.id)}>
                <b>{push.name}</b><span>{push.off ?? push.line}</span>
                {push.id === 'CATALOGUE_SHOWCASE' && !push.off && (
                  <span className={launchCss.posters} aria-hidden="true">
                    {catalogue.slice(0, 4).map(item => <i key={item.id}><Poster id={item.id} title={item.title} genre={item.genre || 'DRAMA'} hue={item.hue ?? brandHue} size="xs" bare /></i>)}
                  </span>
                )}
              </button>
            ))}
          </>
        )}
        {step === 'WHERE' && (
          <>
            <div className={css.segment} role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'AUTO'} className={mode === 'AUTO' ? css.on : ''} onClick={() => setMode('AUTO')}>By opportunity</button>
              <button type="button" role="tab" aria-selected={mode === 'MANUAL'} className={mode === 'MANUAL' ? css.on : ''} onClick={() => setMode('MANUAL')}>By hand</button>
            </div>
            <p className={cx(css.note, launchCss.lead)}>{mode === 'AUTO' ? 'The money goes where the opening can win the most homes for it.' : 'Give each opening country its share.'}</p>
            <div className={css.countries}>
              {countries.map(country => {
                const share = forecast.countryForecasts.find(item => item.countryId === country.countryId);
                const weight = weights[country.countryId] ?? 0;
                return (
                  <div key={country.countryId} className={cx(css.countryRow, launchCss.countryRow)}>
                    <i className={css.flag}><CountryFlagSvg code={country.countryId} fit="stretch" /></i>
                    <b>{country.countryName}</b>
                    <span>{share ? `${money(share.allocatedAmount)} · +${pct(share.likelyAwarenessLift)} aware` : '—'}</span>
                    {mode === 'MANUAL' ? (
                      <span className={launchCss.weight}>
                        <button type="button" aria-label={`Less for ${country.countryName}`} onClick={() => setWeights(current => ({ ...current, [country.countryId]: Math.max(0, weight - 1) }))}>−</button>
                        <em>{weight}</em>
                        <button type="button" aria-label={`More for ${country.countryName}`} onClick={() => setWeights(current => ({ ...current, [country.countryId]: weight + 1 }))}>+</button>
                      </span>
                    ) : <em aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {step === 'HOW' && (
          <>
            {stranded.length > 0 && <ul className={css.problems}><li>{stranded.map(id => CAMPAIGN_FORMATS[id].name).join(', ')}: no site in your opening countries.</li></ul>}
            {CHANNEL_GROUPS.map(group => {
              const channel = channelOf(group.id);
              const locked = channel && !channel.available;
              return (
                <section key={group.id} className={css.group}>
                  <div className={css.sh}><h2>{group.label}</h2><span>{locked ? 'locked' : channel?.line}</span></div>
                  {locked && <p className={css.note}>{channel?.reason || 'Research required.'}</p>}
                  <div className={css.formatGrid}>
                    {CAMPAIGN_FORMAT_ORDER.filter(id => LAUNCH_CHANNEL_OF[id] === group.id).map(id => {
                      const format = CAMPAIGN_FORMATS[id];
                      const on = formats.includes(id);
                      const nowhere = nowhereOf(id);
                      const where = countryIds.filter(countryId => campaignFormatIn(format, countryId));
                      const site = format.sites ? where.map(countryId => format.sites![countryId]).slice(0, 2).join(' · ') : null;
                      const rate = card.formats[id];
                      /* #158: where its picture is set: a big moment's place, a famous screen's first site */
                      const pictured = rate.show?.countryId ?? (format.sites ? where[0] ?? null : null);
                      /* Streaming+: a pack format keeps its picture; picking it opens the pack's sheet */
                      const plus = !on && props.streamingPlusOwned === false && isStreamingPlusItem({ kind: 'CAMPAIGN', id });
                      return (
                        <button key={id} type="button" className={cx(css.format, css.pictured, on && css.picked, (locked || nowhere) && css.off)} disabled={(Boolean(locked) || nowhere) && !on} aria-pressed={on}
                          onClick={() => (plus
                            ? openStreamingPlusSheet({ source: 'launch-campaign-format', focus: 'campaigns', line: `${format.name} is one of the Streaming+ Pack's 7 big campaign moments.` })
                            : toggle(id))}>
                          <span className={css.formatPicture}>
                            <FormatPicture formatId={id} countryId={pictured} creative={creativeOf(id)} subjectName={subject.title} brandName={serviceName} hue={brandHue} />
                            <span className={css.formatBadge}><FormatGlyph id={id} /></span>
                            {plus && <span className={css.formatPlus}><StreamingPlusChip /></span>}
                            {on && <i className={css.formatCheck} aria-hidden="true">✓</i>}
                          </span>
                          <b>{format.name}</b>
                          <small>{nowhere ? (format.sites ? `Only at ${Object.values(format.sites).slice(0, 2).join(', ')}` : 'Not in your opening countries')
                            : rate.show ? nightPlace(id, rate.show.countryId) : site || format.line}</small>
                          <em>{rate.show ? `Opening night · ${money(rate.show.price)}` : nowhere || locked ? '—' : `${money(rate.weekly)} a week`}</em>
                        </button>
                      );
                    })}
                  </div>
                  {/* #158: where each big night happens, changeable (the Studio's, #155) */}
                  {group.id === 'PRESS_EVENTS' && nights.length > 0 && (
                    <div className={css.nights}>
                      <div className={css.sh}><h2>Where the nights happen</h2><span>opening night, one place each</span></div>
                      {nights.map(id => {
                        const show = card.formats[id].show;
                        const options = card.markets.filter(market => campaignFormatIn(CAMPAIGN_FORMATS[id], market.countryId))
                          .sort((left, right) => right.homes * right.costIndex - left.homes * left.costIndex);
                        const open = placing === id;
                        return (
                          <div key={id} className={css.night}>
                            <button type="button" className={css.nightRow} aria-expanded={open} disabled={options.length < 2} onClick={() => { setPlacingAll(false); setPlacing(current => (current === id ? null : id)); }}>
                              <i aria-hidden="true"><FormatGlyph id={id} /></i>
                              <span><b>{CAMPAIGN_FORMATS[id].name}</b><small>{show ? nightPlace(id, show.countryId) : 'Nowhere in your opening countries'}</small></span>
                              <em>{options.length < 2 ? (show ? money(show.price) : '') : open ? 'Close' : 'Change'}</em>
                            </button>
                            {open && (
                              <div className={css.nightList}>
                                {/* the six biggest ad markets first; the rest on a tap */}
                                {(placingAll ? options : options.slice(0, 6)).map(market => (
                                  <button key={market.countryId} type="button" className={cx(css.nightOption, show?.countryId === market.countryId && css.picked)}
                                    onClick={() => { setPlaces(current => ({ ...current, [id]: market.countryId })); setPlacing(null); }}>
                                    <i className={css.flag}><CountryFlagSvg code={market.countryId} fit="stretch" /></i>
                                    <b>{nightPlace(id, market.countryId)}</b>
                                    <em>{money(Math.round(CAMPAIGN_FORMATS[id].minWeekly * market.costIndex))}</em>
                                  </button>
                                ))}
                                {!placingAll && options.length > 6 && (
                                  <button type="button" className={css.nightMore} onClick={() => setPlacingAll(true)}>All {options.length} countries</button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            <section className={css.group}>
              <div className={css.sh}><h2>Only before opening</h2><span>the doors a launch has</span></div>
              <div className={css.formatGrid}>
                {LAUNCH_DOORS.map(door => {
                  const channel = channelOf(door.id);
                  const locked = channel && !channel.available;
                  const on = doors.includes(door.id);
                  return (
                    <button key={door.id} type="button" className={cx(css.format, css.pictured, on && css.picked, locked && css.off)} disabled={Boolean(locked) && !on} aria-pressed={on} onClick={() => toggleDoor(door.id)}>
                      <span className={css.formatPicture}>
                        <DoorPicture doorId={door.id} creative={creativeIn('16:9')} subjectName={subject.title} brandName={serviceName} hue={brandHue} />
                        <span className={cx(css.formatBadge, launchCss.doorBadge)} aria-hidden="true">{door.id === 'DEVICE_STORES' ? '⇩' : '☏'}</span>
                        {on && <i className={css.formatCheck} aria-hidden="true">✓</i>}
                      </span>
                      <b>{door.name}</b>
                      <small>{locked ? channel?.reason || 'Research required.' : door.line}</small>
                      <em>{locked ? '—' : `${money(card.doors[door.id])} a week`}</em>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
        {step === 'CREATIVE' && (formats.length > 0 ? (
          <CreativeStep frames={frames} formats={formats} made={made} kept={kept} accent={accent} countryIds={countryIds} places={plan.places}
            subjectName={subject.kind === 'TITLE' ? `${subject.title}${/s$/i.test(subject.title) ? "'" : "'s"} poster` : "your service's own colours"}
            onKeep={(key, creative) => setKept(current => ({ ...current, [key]: creative ?? undefined }))} />
        ) : (
          <p className={css.note}>The doors you picked need no art of their own: the stores and carriers use your service's.</p>
        ))}
        {step === 'BUDGET' && (
          <>
            <section className={css.weekCard}>
              <span>{runs ? 'A WEEK OF WHAT YOU PICKED' : 'OPENING NIGHT'}</span>
              <b>{money(runs ? plan.weekly : plan.night)}</b>
              {runs && (
                <div className={css.weekParts}>
                  {flowing.map(id => <span key={id}><FormatGlyph id={id} />{CAMPAIGN_FORMATS[id].name}<em>{money(card.formats[id].weekly * strength)}</em></span>)}
                  {doors.map(id => <span key={id}><i className={launchCss.doorGlyph} aria-hidden="true">{id === 'DEVICE_STORES' ? '⇩' : '☏'}</i>{LAUNCH_DOORS.find(door => door.id === id)!.name}<em>{money(card.doors[id] * strength)}</em></span>)}
                </div>
              )}
              {nights.length > 0 && (
                <p className={css.nightLine}>{runs ? '+ once, on opening night: ' : ''}{nights.map(id => `${CAMPAIGN_FORMATS[id].name} ${card.formats[id].show ? nightAt(id, card.formats[id].show!.countryId) : ''}`).join(' · ')} · {money(plan.night)}</p>
              )}
            </section>
            {runs && (
              <>
                <div className={css.stepper}>
                  <span>WEEKS BEFORE OPENING</span>
                  <button type="button" onClick={() => setWeeks(value => Math.max(1, Math.min(longest, value) - 1))} disabled={plan.weeks <= 1} aria-label="One week less">−</button>
                  <b>{plan.weeks}<small>{plan.weeks === 1 ? 'week' : 'weeks'}</small></b>
                  <button type="button" onClick={() => setWeeks(value => Math.min(longest, value + 1))} disabled={plan.weeks >= longest} aria-label="One week more">+</button>
                </div>
                {/* the build's weeks, commission to opening night: the campaign lights the last of them */}
                <div className={cx(css.weekStrip, launchCss.weekStrip)} style={{ ['--weeks' as string]: longest }} aria-hidden="true">
                  {Array.from({ length: longest }, (_, index) => <i key={index} className={cx(index >= longest - plan.weeks && css.lit, index === longest - 1 && nights.length > 0 && css.star)} />)}
                </div>
                <p className={launchCss.stripEnds} aria-hidden="true"><span>Commission</span><span>Opening night</span></p>
                <div className={css.segment} role="tablist" aria-label="How hard">
                  {CAMPAIGN_STRENGTHS.map(option => (
                    <button key={option} type="button" role="tab" aria-selected={strength === option} className={strength === option ? css.on : ''} onClick={() => setStrength(option)}>
                      {STRENGTH_WORDS[option].name}
                    </button>
                  ))}
                </div>
                <p className={css.note}>
                  {STRENGTH_WORDS[strength].line} {longest === 1 ? 'The build takes a week, so it runs that week.'
                    : plan.weeks === longest ? `It runs all ${weeksWord(longest)} of the build, commission to opening night.`
                      : `The build takes ${weeksWord(longest)}; it runs the last ${plan.weeks === 1 ? 'one, the opening-week push' : plan.weeks}.`}
                </p>
              </>
            )}
            {totals}
          </>
        )}
        {step === 'REVIEW' && (
          <section className={css.review}>
            <div className={launchCss.reviewHead}>
              <small>{pushes.find(push => push.id === objective)?.name.toUpperCase()}</small>
              <b>{serviceName}</b>
              <span>{countries.length} opening {countries.length === 1 ? 'country' : 'countries'} · {runs ? `${weeksWord(plan.weeks)} before opening` : 'opening night'} · {money(budget)}</span>
            </div>
            {(formats.length > 0 || doors.length > 0) && (
              <div className={css.reviewFormats}>
                {formats.map(id => <span key={id}><FormatGlyph id={id} />{CAMPAIGN_FORMATS[id].name}</span>)}
                {doors.map(id => <span key={id}><i className={launchCss.doorGlyph} aria-hidden="true">{id === 'DEVICE_STORES' ? '⇩' : '☏'}</i>{LAUNCH_DOORS.find(door => door.id === id)!.name}</span>)}
              </div>
            )}
            {frames.length > 0 && (
              <div className={creativeCss.strip}>
                {frames.map(frame => (
                  <figure key={frame.key}>
                    <FrameThumb kept={kept[frame.key]} made={made[frame.key]} ratio={frame.ratio} />
                    <figcaption><b>{frame.key}</b> {kept[frame.key] ? 'yours' : 'made for you'}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            {sites.length > 0 && <p className={css.sites}>{sites.join(' · ')}</p>}
            <p className={css.reviewLine}>{runs ? `${money(plan.weekly)} a week for ${weeksWord(plan.weeks)} · ${STRENGTH_WORDS[strength].name}${plan.night ? ` · + ${money(plan.night)} on opening night` : ''}` : `One night, opening night · ${money(plan.night)}`}</p>
          </section>
        )}
        {step === 'REVIEW' && totals}
        {step !== 'WHAT' && step !== 'CREATIVE' && (
          <section className={css.quote}>
            <div><span>AWARE</span><b>{pct(Math.min(1, forecast.organicAwareness + forecast.likelyAwarenessLift))}</b></div>
            <div><span>NEW HOMES</span><b>{count(forecast.acquiredAccounts.likely)}</b></div>
            <div><span>OPENING</span><b>{count(forecast.concurrentStreams.likely)}</b></div>
            <div><span>PER HOME</span><b>{forecast.customerAcquisitionCost === null ? '—' : money(forecast.customerAcquisitionCost)}</b></div>
            <p>The launch forecast with this plan: {pct(forecast.organicAwareness)} aware without it, +{pct(forecast.likelyAwarenessLift)} with it; {count(forecast.acquiredAccounts.low)}–{count(forecast.acquiredAccounts.high)} new homes; {forecast.confidenceScore}% confidence.</p>
          </section>
        )}
        {step !== 'WHAT' && step !== 'CREATIVE' && forecast.warnings.length > 0 && (
          <ul className={css.problems}>{forecast.warnings.map(warning => <li key={warning}>{WARNING_WORDS[warning] ?? warning.replaceAll('_', ' ').toLowerCase()}</li>)}</ul>
        )}
      </div>
      <div className={css.pin}>
        {step === 'REVIEW' ? (
          <button type="button" className={css.primary} disabled={!ready.REVIEW} onClick={save}>
            <span><b>Use this launch campaign</b><small>{money(budget)} · {runs ? `${weeksWord(plan.weeks)} before opening` : 'opening night'} · {count(forecast.acquiredAccounts.likely)} new homes</small></span><i aria-hidden="true">✓</i>
          </button>
        ) : (
          <button type="button" className={css.primary} disabled={!ready[step]} onClick={() => setStep(STEPS[at + 1])}>
            <span><b>Next: {STEP_WORDS[STEPS[at + 1]]}</b><small>{step === 'WHAT' ? pushes.find(push => push.id === objective)?.name
              : step === 'WHERE' ? `${countries.length} opening ${countries.length === 1 ? 'country' : 'countries'}`
                : step === 'HOW' ? (formats.length || doors.length ? `${formats.length + doors.length} picked · ${runs ? `${money(weekPrice)} a week` : 'opening night'}${plan.night ? ` · ${runs ? '+' : ''}${money(plan.night)}${runs ? ' once' : ''}` : ''}` : 'Pick what runs')
                  : step === 'CREATIVE' ? (frames.length ? `${yours} yours · ${frames.length - yours} made for you` : 'No images needed')
                    : `${money(budget)} in all · ${count(forecast.acquiredAccounts.likely)} new homes`}</small></span><i aria-hidden="true">→</i>
          </button>
        )}
      </div>
    </div>
  );
  /* over the whole screen, above the wizard; drawn in place where there is no document (an audit) */
  return typeof document === 'undefined' ? page : createPortal(page, document.body);
};
