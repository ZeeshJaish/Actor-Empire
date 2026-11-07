/**
 * #257: what the opening night shows, worked out from the company: the go / no-go poll's desks, and which of the launch campaign's purchases a camera visits.
 * Pure, so the numbers on the night can be held by an audit. The show itself only presents these and the saved launch.
 */
import type { CampaignFormatId, OwnedStreamingLaunchMarketingPlan } from '../types';
import { CAMPAIGN_FORMATS, campaignFormatIn } from './campaigns/campaignFormats';
import type { StreamingLaunchReadinessItem } from './streamingLaunch';

/** a desk in the go / no-go poll: what the company has done, in its own numbers */
export interface OpeningNightStation { id: string; label: string; line: string; tone: 'READY' | 'WATCH' | 'BLOCKED' }

/** something big the launch campaign bought: a flare on the night's map, and its name */
export interface OpeningNightMoment {
  formatId: CampaignFormatId;
  countryId: string | null;
  /** the real place when it has a name (Times Square), else the format's own */
  label: string;
  line: string;
}

const MOST_MOMENTS = 4;
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : `$${Math.round(value / 1e3)}K`);
const many = (count: number, one: string, more: string) => `${count} ${count === 1 ? one : more}`;

/** Each desk answers from what the company has done. A warning or a blocker speaks for itself. Once the launch is saved nothing can be blocked: readiness then reads "already live". */
export const openingNightStations = (input: {
  items: StreamingLaunchReadinessItem[];
  committed: boolean;
  cities: number;
  countries: number;
  titles: number;
  title: string;
  treasury: number;
}): OpeningNightStation[] => ([
  ['NETWORK', 'Network', ['network', 'peak'], `${many(input.cities, 'city', 'cities')} online`],
  ['CATALOGUE', 'Catalogue', ['slate', 'original', 'rights', 'offer-coverage'], `${many(input.titles, 'title', 'titles')}, ${input.title} opens`],
  ['MARKETS', 'Markets', ['markets'], `${many(input.countries, 'country', 'countries')} cleared`],
  ['TREASURY', 'Treasury', ['company', 'runway'], `${money(input.treasury)} in the bank`],
  ['PROGRAMME', 'Launch programme', ['opening-programme', 'launch-definition'], 'Built and signed off'],
] as const).map(([id, label, checks, line]) => {
  const items = input.items.filter(item => (checks as readonly string[]).includes(item.id));
  const worst = input.committed ? undefined : items.find(item => item.tone === 'BLOCKED') ?? items.find(item => item.tone === 'WATCH');
  return { id, label, line: worst ? worst.detail : line, tone: worst ? worst.tone as OpeningNightStation['tone'] : 'READY' as const };
});

/** The campaign's biggest purchases, on the map: its big moments first, then the famous screens. Everything else it bought has no one place to show. */
export const openingNightMoments = (plan: Pick<OwnedStreamingLaunchMarketingPlan, 'formatIds' | 'places' | 'openingCountryIds'> | null | undefined): OpeningNightMoment[] => {
  const countries = plan?.openingCountryIds ?? [];
  return (plan?.formatIds ?? []).flatMap(formatId => {
    const format = CAMPAIGN_FORMATS[formatId];
    if (format.group !== 'BIG_MOMENT' && formatId !== 'CITY_SCREEN') return [];
    const placed = plan?.places?.[formatId];
    const countryId = placed && campaignFormatIn(format, placed) ? placed : countries.find(id => campaignFormatIn(format, id)) ?? null;
    if (!countryId) return [];
    return [{ order: format.group === 'BIG_MOMENT' ? 0 : 1, moment: { formatId, countryId, label: format.sites?.[countryId] ?? format.name, line: 'YOUR CAMPAIGN' } }];
  }).sort((left, right) => left.order - right.order).slice(0, MOST_MOMENTS).map(row => row.moment);
};
