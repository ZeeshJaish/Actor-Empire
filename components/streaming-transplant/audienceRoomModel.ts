/**
 * The Audience room's numbers (#130; plan §20.8). Every figure comes from the save:
 *  - the last settled week (`weeklyHistory`, its `operations`);
 *  - the customer ledger and the viewing settlement (through the market view, #128);
 *  - the weekly Top 10 (#129);
 *  - the growth actions (campaigns).
 * Nothing is estimated for show. Pure functions; the room reads this through `createCanonicalAudienceState`.
 */
import type { OwnedStreamingMarketOperation, Player } from '../../types';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import type { StreamingAudienceMarketView } from '../../services/streamingAudienceMarket';
import { getStreamingWeeklyChartView, type StreamingChartBoard, type StreamingChartEntryView, type StreamingChartList, type StreamingWeeklyChartView } from '../../services/streamingWeeklyChart';
import { buildAtlasCountries, sharesOf, type AudienceKind } from './audienceAtlasModel';
import { hasStreamingPlus, streamingPlusLockedCountryIds } from '../../services/streamingPlusPack';

export const WEEKS_PER_MONTH = 4.33;

/** The same hue a title gets everywhere else (createCanonicalStreamingPresentation's `hueOf`). */
export const titleHue = (key: string) => [...key].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) >>> 0, 2166136261) % 360;

/** The last settled week, as a scoreboard. A subscription service has its ledger (joined, left, came back);
    an ad-only or store service has only this week's audience and last week's. */
export interface AudienceWeekCard {
  week: number | null;
  audience: number;
  joined: number;
  left: number;
  returned: number;
  net: number;
  previousAudience: number | null;
  settled: boolean;
}

/** One settled week in the room's lines. `revenue` is a month at that week's rate. */
export interface AudienceSeriesPoint {
  week: number;
  paid: number;
  revenue: number;
  churn: number;
  viewers: number;
}

/** A title doing the work this week: members it brought in and members it kept (the viewing settlement's own
    attribution), with what it needs to draw its poster. */
export interface AudienceTitleRow {
  id: string;
  title: string;
  kind: 'FILM' | 'SERIES';
  genre: string;
  hue: number;
  brought: number;
  kept: number;
  /** #136: accounts that watched it this week, and what it earned in the service's own money: ad revenue for an
      ad-supported service, rentals and purchases for a store, the subscriptions it is credited with otherwise. */
  watched: number;
  earned: number;
  hours: number;
  completion: number;
}

export type AudienceCampaignGrade = 'S' | 'A' | 'B' | 'C';

export interface AudienceCampaignRow {
  id: string;
  projectId: string;
  title: string;
  hue: number;
  /** the title's genre, for its poster (from the weekly viewing; DRAMA when it never showed) */
  genre: string;
  channels: string[];
  spend: number;
  objective: string;
  state: 'LOCKED' | 'DONE';
  /** the week its results settle (locked) or settled (done) */
  resultsWeek: number;
  viewers: number | null;
  joins: number | null;
  costPerJoin: number | null;
  /** #136: spent per thousand viewers added (what an ad-supported service, or a campaign with no joins, is judged by) */
  costPerThousand: number | null;
  artwork: string | null;
  artworkLift: number | null;
  summary: string | null;
  /** value against the room's other campaigns: S at most 0.6× the median cost, A 0.9×, B 1.25×, C above. The cost is
      per join when at least two finished campaigns brought joins, otherwise per thousand viewers added */
  grade: AudienceCampaignGrade | null;
}

export type AudienceNextMoveId = 'RETENTION' | 'OFFER_PRICE' | 'OFFER_SHARING' | 'ENTER_MARKET' | 'PUSH_TITLE' | 'STEADY';

/** One thing to do next, from fixed rules on the week's numbers; its button opens the place that acts on it. */
export interface AudienceNextMove {
  id: AudienceNextMoveId;
  title: string;
  detail: string;
  cta: string | null;
  countryId?: string;
  projectId?: string;
  tone: 'warn' | 'good' | 'info';
}

export interface AudienceCampaignsView {
  objective: string;
  running: AudienceCampaignRow[];
  done: AudienceCampaignRow[];
  /** the last 12 weeks: spent, joins and viewers from campaigns, spent per join and per thousand viewers */
  spent: number;
  joins: number;
  costPerJoin: number | null;
  viewers: number;
  costPerThousand: number | null;
  /** of the last 12 weeks too (#136): the most joins, or (when none brought joins) the most viewers added */
  best: AudienceCampaignRow | null;
  /** what the grades compare: cost per join, or cost per thousand viewers */
  gradeBasis: 'JOIN' | 'VIEWERS';
}

/** #135: a Top 10 row with its poster's hue. */
export type AudienceChartRow = StreamingChartEntryView & { hue: number };
export interface AudienceChartBoard extends Omit<StreamingChartBoard, 'lists'> {
  lists: Record<StreamingChartList, AudienceChartRow[]>;
}
export interface AudienceChartView extends Omit<StreamingWeeklyChartView, 'lists' | 'own'> {
  lists: Record<StreamingChartList, AudienceChartRow[]>;
  /** #142: your own service's Top 10 */
  own: AudienceChartBoard;
}

export interface AudienceRoomModel {
  live: boolean;
  kind: AudienceKind;
  /** The Streaming+ Pack is owned: no country is locked. */
  streamingPlusOwned: boolean;
  /** the last settled week (absolute), or null before launch */
  week: number | null;
  head: { audience: number; net: number | null; revenueMonthly: number | null };
  card: AudienceWeekCard;
  churn: { now: number; previous: number | null; risingWeeks: number } | null;
  arpu: { now: number; previous: number | null } | null;
  revenue: { monthly: number; subscriptions: number; ads: number; store: number; other: number } | null;
  /** of the members there N weeks ago (plus those who joined since), the share still here: the ledger's weekly
      survival multiplied over the weeks */
  retention: { rate: number; weeks: number } | null;
  series: AudienceSeriesPoint[];
  titles: AudienceTitleRow[];
  plans: { rows: Array<{ id: string; name: string; accounts: number; share: number; price: number }>; effectivePrice: number } | null;
  nextMove: AudienceNextMove | null;
  campaigns: AudienceCampaignsView;
  chart: AudienceChartView;
}

const OBJECTIVE_WORDS: Record<string, string> = {
  BALANCED: 'Balanced',
  RETENTION: 'Retention',
  CATALOG_DISCOVERY: 'Catalogue discovery',
  BREAKOUT: 'Breakout',
};
const CHANNEL_WORDS: Record<string, string> = { TRAILER: 'Trailer', BILLBOARD: 'Billboards', SOCIAL: 'Social', REGIONAL: 'Regional' };
const ARTWORK_WORDS: Record<string, string> = { FACE_FORWARD: 'Star close-up', WORLD_BUILDING: 'World key art', MYSTERY_HOOK: 'Mystery hook' };
const CHURN_ALARM = .055;
const RETENTION_WEEKS = 12;
const CAMPAIGN_WINDOW_WEEKS = 12;
const compact = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : `${Math.round(value)}`);

const gradeOf = (costPerJoin: number | null, median: number | null): AudienceCampaignGrade | null => {
  if (costPerJoin === null || median === null || median <= 0) return null;
  const ratio = costPerJoin / median;
  return ratio <= .6 ? 'S' : ratio <= .9 ? 'A' : ratio <= 1.25 ? 'B' : 'C';
};

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** The room's model. `market` is the canonical market view (`getStreamingAudienceMarket`), passed in because the
    caller already holds it. */
export const buildAudienceRoomModel = (player: Player, market: StreamingAudienceMarketView): AudienceRoomModel => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const live = platform.lifecycle === 'ACTIVE';
  const kind = market.playerModel.primary;
  const history = platform.weeklyHistory.filter(snapshot => snapshot.operations);
  const latest = history.at(-1) ?? null;
  const previous = history.at(-2) ?? null;
  const operations = latest?.operations;
  const commercial = market.playerCommercial;

  /* ── the week ── */
  const audienceNow = kind === 'AD_HOMES' ? commercial.adHouseholds
    : kind === 'BUYERS' ? commercial.storeBuyers
      : platform.metrics.subscribers;
  const joined = operations?.joinedSubscribers ?? 0;
  const left = operations?.cancellations ?? 0;
  const returned = operations?.reactivations ?? 0;
  const previousViewers = previous?.operations?.worldViewingAccounts ?? null;
  const card: AudienceWeekCard = {
    week: live && latest ? latest.absoluteWeek : null,
    audience: live ? audienceNow : 0,
    joined,
    left,
    returned,
    net: joined + returned - left,
    previousAudience: kind === 'AD_HOMES' && previousViewers !== null ? previousViewers : null,
    settled: Boolean(live && operations),
  };

  /* ── the lines ── */
  const series: AudienceSeriesPoint[] = history.map(snapshot => {
    const ops = snapshot.operations!;
    return {
      week: snapshot.absoluteWeek,
      paid: snapshot.subscribers,
      revenue: Math.round(((ops.subscriptionRevenue || 0) + (ops.worldViewingIncrementalRevenue || 0)) * WEEKS_PER_MONTH),
      churn: Math.round(snapshot.churnRate * 10_000) / 100,
      viewers: ops.worldViewingAccounts ?? 0,
    };
  });

  /* ── the tiles ── */
  let risingWeeks = 0;
  for (let index = series.length - 1; index > 0 && series[index].churn > series[index - 1].churn; index -= 1) risingWeeks += 1;
  const churn = live && latest ? { now: latest.churnRate, previous: previous?.churnRate ?? null, risingWeeks } : null;
  const arpu = live && latest ? { now: platform.metrics.averageRevenuePerUser, previous: previous?.averageRevenuePerUser ?? null } : null;
  const subscriptionsMonthly = market.customerAccess.available ? market.customerAccess.monthlySubscriptionRevenue : 0;
  const revenue = live && (commercial.available || subscriptionsMonthly > 0) ? {
    subscriptions: Math.round(subscriptionsMonthly),
    ads: Math.round(commercial.adRevenueWeekly * WEEKS_PER_MONTH),
    store: Math.round(commercial.storeRevenueWeekly * WEEKS_PER_MONTH),
    other: Math.round(commercial.otherRevenueWeekly * WEEKS_PER_MONTH),
    monthly: 0,
  } : null;
  if (revenue) revenue.monthly = revenue.subscriptions + revenue.ads + revenue.store + revenue.other;
  /* the ledger's weekly survival, multiplied over the last weeks (the Analytics Center's cohort rule) */
  const survivalWeeks = history.slice(-RETENTION_WEEKS);
  const retention = kind === 'ACCOUNTS' && live && survivalWeeks.length >= 2 ? (() => {
    let survival = 1;
    survivalWeeks.forEach(snapshot => {
      const ops = snapshot.operations!;
      const available = Math.max(1, snapshot.subscribers - (ops.joinedSubscribers + ops.reactivations - ops.cancellations) + ops.joinedSubscribers + ops.reactivations);
      survival *= Math.max(0, Math.min(1, snapshot.subscribers / available));
    });
    return { rate: Math.round(survival * 1000) / 10, weeks: survivalWeeks.length };
  })() : null;

  /* ── titles doing the work ── */
  const titles: AudienceTitleRow[] = (operations?.titlePerformance ?? []).map(row => ({
    id: String(row.projectId),
    title: row.title,
    kind: row.projectType === 'SERIES' ? 'SERIES' as const : 'FILM' as const,
    genre: row.genre,
    hue: titleHue(String(row.projectId)),
    brought: Math.round(row.acquisitionAttributedAccounts ?? 0),
    kept: Math.round(row.retentionAttributedAccounts ?? 0),
    watched: Math.round(row.viewingAccounts),
    earned: Math.round(kind === 'AD_HOMES' ? (row.advertisingRevenue ?? 0) + (row.sponsorshipRevenue ?? 0)
      : kind === 'BUYERS' ? (row.rentalRevenue ?? 0) + (row.purchaseRevenue ?? 0)
        : row.attributedSubscriptionRevenue),
    hours: Math.round(row.hoursViewed),
    completion: row.completionRate <= 1 ? row.completionRate * 100 : row.completionRate,
  }));

  /* ── plans ── */
  const planRows = market.customerAccess.planAllocations.filter(row => row.paidAccounts > 0);
  const planAccounts = planRows.reduce((sum, row) => sum + row.paidAccounts, 0);
  const plans = kind === 'ACCOUNTS' && planAccounts > 0 ? {
    rows: planRows.map(row => ({ id: row.planId, name: row.planName, accounts: row.paidAccounts, share: row.paidAccounts / planAccounts * 100, price: row.effectiveMonthlyPrice })),
    effectivePrice: planRows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0) / planAccounts,
  } : null;

  /* ── campaigns ── */
  const week = live && latest ? latest.absoluteWeek : null;
  const actions = [...platform.growthActions].sort((left, right) => right.selectedAtAbsoluteWeek - left.selectedAtAbsoluteWeek || right.id.localeCompare(left.id));
  const genreOf = new Map<string, string>();
  platform.weeklyHistory.forEach(snapshot => (snapshot.operations?.titlePerformance ?? []).forEach(row => genreOf.set(String(row.projectId), row.genre)));
  const finished = actions.filter(action => action.status === 'APPLIED' && action.outcome);
  const joinCosts = finished.filter(action => action.outcome!.costPerAttributedJoin != null && action.outcome!.attributedJoins > 0).map(action => action.outcome!.costPerAttributedJoin as number);
  const gradeBasis: 'JOIN' | 'VIEWERS' = joinCosts.length >= 2 ? 'JOIN' : 'VIEWERS';
  const costOf = (action: typeof actions[number]) => (gradeBasis === 'JOIN'
    ? (action.outcome?.attributedJoins ? action.outcome.costPerAttributedJoin ?? null : null)
    : (action.outcome && action.outcome.attributedViewingAccounts > 0 ? action.cashCost / action.outcome.attributedViewingAccounts * 1000 : null));
  const costs = finished.map(costOf).filter((value): value is number => value !== null);
  const typical = costs.length >= 2 ? median(costs) : null;
  const campaignRow = (action: typeof actions[number]): AudienceCampaignRow => ({
    id: action.id,
    projectId: action.projectId,
    title: action.title,
    hue: titleHue(action.projectId),
    genre: genreOf.get(action.projectId) ?? 'DRAMA',
    channels: action.channels.map(channel => CHANNEL_WORDS[channel] ?? channel),
    spend: action.cashCost,
    objective: OBJECTIVE_WORDS[action.recommendationObjective] ?? action.recommendationObjective,
    state: action.status === 'LOCKED' ? 'LOCKED' : 'DONE',
    resultsWeek: action.appliedAtAbsoluteWeek ?? action.targetAbsoluteWeek,
    viewers: action.outcome ? Math.round(action.outcome.attributedViewingAccounts) : null,
    joins: action.outcome ? Math.round(action.outcome.attributedJoins) : null,
    costPerJoin: action.outcome?.costPerAttributedJoin ?? null,
    costPerThousand: action.outcome && action.outcome.attributedViewingAccounts > 0
      ? Math.round(action.cashCost / action.outcome.attributedViewingAccounts * 1000) : null,
    artwork: action.outcome?.artworkWinner ? (ARTWORK_WORDS[action.outcome.artworkWinner] ?? action.outcome.artworkWinner) : null,
    artworkLift: action.outcome?.artworkWinnerLiftPercent ?? null,
    summary: action.outcome?.summary ?? null,
    grade: action.status === 'APPLIED' ? gradeOf(costOf(action), typical) : null,
  });
  const running = actions.filter(action => action.status === 'LOCKED').map(campaignRow);
  const done = actions.filter(action => action.status === 'APPLIED' && action.outcome).slice(0, 8).map(campaignRow);
  const windowStart = (week ?? 0) - CAMPAIGN_WINDOW_WEEKS;
  const recent = actions.filter(action => action.status === 'APPLIED' && action.outcome && (action.appliedAtAbsoluteWeek ?? action.targetAbsoluteWeek) > windowStart);
  const spent = recent.reduce((sum, action) => sum + action.cashCost, 0);
  const joins = recent.reduce((sum, action) => sum + Math.round(action.outcome!.attributedJoins), 0);
  const viewers = recent.reduce((sum, action) => sum + Math.round(action.outcome!.attributedViewingAccounts), 0);
  /* #136: the best is the season's, like the figures beside it (it was picked from any time) */
  const season = recent.map(campaignRow);
  const best = season.some(row => (row.joins ?? 0) > 0)
    ? season.filter(row => (row.joins ?? 0) > 0).sort((left, right) => (right.joins ?? 0) - (left.joins ?? 0))[0]
    : season.filter(row => (row.viewers ?? 0) > 0).sort((left, right) => (right.viewers ?? 0) - (left.viewers ?? 0))[0] ?? null;
  const campaigns: AudienceCampaignsView = {
    objective: OBJECTIVE_WORDS[actions[0]?.recommendationObjective ?? 'BALANCED'] ?? 'Balanced',
    running,
    done,
    spent,
    joins,
    costPerJoin: joins > 0 ? Math.round(spent / joins) : null,
    viewers,
    costPerThousand: viewers > 0 ? Math.round(spent / viewers * 1000) : null,
    best,
    gradeBasis,
  };

  /* ── the next move: the first rule that holds ── */
  const nextMove = live ? chooseNextMove({ player, platform, market, kind, churn, card, titles, operations: platform.marketOperations }) : null;

  return {
    live,
    kind,
    streamingPlusOwned: hasStreamingPlus(player),
    week,
    head: {
      audience: card.audience,
      net: !live ? null : kind === 'ACCOUNTS' ? (card.settled ? card.net : null) : card.previousAudience !== null ? card.audience - card.previousAudience : null,
      revenueMonthly: revenue?.monthly ?? null,
    },
    card,
    churn,
    arpu,
    revenue,
    retention,
    series,
    titles,
    plans,
    nextMove,
    campaigns,
    chart: withPosters(getStreamingWeeklyChartView(player)),
  };
};

/** #135: each chart row's poster hue (its genre is stored with the row). */
const withPosters = (view: StreamingWeeklyChartView): AudienceChartView => {
  const dress = (rows: StreamingChartEntryView[]): AudienceChartRow[] => rows.map(row => ({ ...row, hue: titleHue(row.id) }));
  const lists = (board: StreamingChartBoard) => ({ ALL: dress(board.lists.ALL), FILM: dress(board.lists.FILM), SERIES: dress(board.lists.SERIES) });
  return { ...view, lists: lists(view), own: { ...view.own, lists: lists(view.own) } };
};

const chooseNextMove = ({ player, platform, market, kind, churn, card, titles, operations }: {
  player: Player;
  platform: ReturnType<typeof normalizeOwnedStreamingPlatformState>;
  market: StreamingAudienceMarketView;
  kind: AudienceKind;
  churn: AudienceRoomModel['churn'];
  card: AudienceWeekCard;
  titles: AudienceTitleRow[];
  operations: OwnedStreamingMarketOperation[];
}): AudienceNextMove => {
  if (kind === 'ACCOUNTS' && churn && (churn.risingWeeks >= 3 || churn.now >= CHURN_ALARM)) {
    return {
      id: 'RETENTION',
      title: churn.risingWeeks >= 3 ? `Churn has risen ${churn.risingWeeks} weeks in a row` : 'Churn is above the comfort line',
      detail: `${(churn.now * 100).toFixed(1)}% of members left this week. A retention campaign keeps them watching.`,
      cta: 'Plan a retention campaign',
      tone: 'warn',
    };
  }
  const paying = market.customerAccess.available ? market.customerAccess.payingHouseholds : 0;
  const wanting = market.streamingCompetition.playerHouseholds;
  if (kind === 'ACCOUNTS' && paying > 0 && wanting < paying * .95) {
    return {
      id: 'OFFER_PRICE',
      title: 'Fewer homes want you at today\'s price',
      detail: `${compact(wanting)} homes would pay at today's price and ${compact(paying)} pay now: expect cancellations.`,
      cta: 'Open the offer',
      tone: 'warn',
    };
  }
  const shared = market.customerAccess.available ? market.customerAccess.externalSharedHouseholds : 0;
  if (kind === 'ACCOUNTS' && market.customerAccess.paidAccounts > 0 && shared > market.customerAccess.paidAccounts * .1) {
    return {
      id: 'OFFER_SHARING',
      title: 'Many homes watch on borrowed accounts',
      detail: `${compact(shared)} outside homes use your members' accounts and pay nothing.`,
      cta: 'Review sharing',
      tone: 'warn',
    };
  }
  /* a Streaming+ country is never the suggestion without the pack */
  const open = buildAtlasCountries(market.worldCountries, operations, streamingPlusLockedCountryIds(hasStreamingPlus(player)))
    .filter(country => country.state === 'AVAILABLE' && !country.streamingPlus && country.view.activeViewers >= 3_000_000)
    .map(country => ({ country, leader: sharesOf([country.view]).shares.filter(item => item.id !== 'PLAYER')[0]?.share ?? 0 }))
    .filter(item => item.leader < 35)
    .sort((left, right) => right.country.view.activeViewers - left.country.view.activeViewers)[0];
  if (open) {
    return {
      id: 'ENTER_MARKET',
      title: `${compact(open.country.view.activeViewers)} people stream in ${open.country.name}`,
      detail: open.leader > 0 ? `No service holds more than ${Math.round(open.leader)}% of its homes yet.` : 'No service holds its homes yet.',
      cta: `Enter ${open.country.name}`,
      countryId: open.country.id,
      tone: 'info',
    };
  }
  /* a title already pushed: by an old War Room action, or by a Studio campaign (#150) */
  const pushed = new Set([
    ...platform.growthActions.map(action => action.projectId),
    ...(platform.campaignBook?.campaigns ?? []).flatMap(campaign => [campaign.subject.id, ...campaign.subject.projectIds]),
  ]);
  const fresh = (platform.weeklyHistory.at(-1)?.operations?.titlePerformance ?? [])
    .filter(row => row.weeksAvailable <= 2 && !pushed.has(String(row.projectId)))
    .sort((left, right) => right.viewingAccounts - left.viewingAccounts)[0];
  if (fresh) {
    return {
      id: 'PUSH_TITLE',
      title: `${fresh.title} just premiered`,
      detail: 'A campaign in its first weeks brings the most new members.',
      cta: `Push ${fresh.title}`,
      projectId: String(fresh.projectId),
      tone: 'info',
    };
  }
  const grew = kind === 'ACCOUNTS' ? card.net : card.previousAudience !== null ? card.audience - card.previousAudience : 0;
  /* the title leading the week: the one that brought most members in, or (ads, store) the one that earned most */
  const leadOf = (title: AudienceTitleRow) => (kind === 'ACCOUNTS' ? title.brought : title.earned);
  const top = [...titles].sort((left, right) => leadOf(right) - leadOf(left))[0];
  return {
    id: 'STEADY',
    title: grew >= 0 ? 'Growing steadily' : 'Holding steady',
    detail: grew > 0
      ? `${grew > 0 ? '+' : ''}${compact(grew)} this week${top && leadOf(top) > 0 ? `, led by ${top.title}` : ''}. Nothing needs you right now.`
      : 'Nothing needs you right now.',
    cta: null,
    tone: 'good',
  };
};

/** For a screen with no save behind it (the founding prototype): an empty room. */
export const createEmptyAudienceRoom = (live: boolean): AudienceRoomModel => ({
  live,
  kind: 'ACCOUNTS',
  /* a prototype with no save locks no country */
  streamingPlusOwned: true,
  week: null,
  head: { audience: 0, net: null, revenueMonthly: null },
  card: { week: null, audience: 0, joined: 0, left: 0, returned: 0, net: 0, previousAudience: null, settled: false },
  churn: null,
  arpu: null,
  revenue: null,
  retention: null,
  series: [],
  titles: [],
  plans: null,
  nextMove: null,
  campaigns: { objective: 'Balanced', running: [], done: [], spent: 0, joins: 0, costPerJoin: null, viewers: 0, costPerThousand: null, best: null, gradeBasis: 'VIEWERS' },
  chart: { available: false, absoluteWeek: null, hasPrevious: false, weeksCounted: 0, lists: { ALL: [], FILM: [], SERIES: [] },
    own: { available: false, hasPrevious: false, weeksCounted: 0, lists: { ALL: [], FILM: [], SERIES: [] } } } as AudienceChartView,
});
