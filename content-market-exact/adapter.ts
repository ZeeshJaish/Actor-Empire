import type { Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';
import { getOwnedPlatformPackageCountryIds } from '../services/streamingRightsMarketplace';
import type { Lot, SellerAppetite, Terms, Territory } from './model';

type ContentMarketSources = {
  listings: any[];
  collections: any[];
  auctionLots: any[];
  upcomingSales: any[];
  ownedTitles: any[];
};

const hash = (value: string): number => [...value].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
const hueFor = (value: string): number => hash(value) % 360;
const yearFor = (value: unknown, fallback: number): number => {
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? Math.round(year) : fallback;
};
const projectType = (value: unknown): 'FILM' | 'SERIES' => String(value).toUpperCase() === 'SERIES' ? 'SERIES' : 'FILM';
const displayGenre = (value: unknown): string => String(value || 'Drama').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
const sellerKind = (sourceLicenseId: unknown, sellerType: unknown): Lot['sellerKind'] => sourceLicenseId
  ? 'PLATFORM RESALE'
  : String(sellerType).toUpperCase() === 'PLATFORM' ? 'PLATFORM RESALE' : 'STUDIO';

const appetiteFor = (id: string, marketHeat?: string, priorities?: Record<string, number>): SellerAppetite => {
  if (priorities) {
    const entries: Array<[SellerAppetite, number]> = [
      ['CASH', Number(priorities.cash || 0)],
      ['BACKEND', Number(priorities.backend || 0)],
      ['MARKETING', Number(priorities.marketing || 0)],
      ['RELATIONSHIP', Number(priorities.futureGreenlight || 0)],
    ];
    return entries.sort((left, right) => right[1] - left[1])[0][0];
  }
  if (marketHeat === 'HOT') return 'MARKETING';
  return (['CASH', 'BACKEND', 'MARKETING', 'RELATIONSHIP'] as SellerAppetite[])[hash(id) % 4];
};

const termsFor = (raw: any, countryCount: number): Terms => {
  const holderShare = Math.max(0, Math.min(100, 100 - Number(raw.platformRevenueShare ?? 70)));
  return {
    shape: holderShare > 0 ? 'GUARANTEE AND BACKEND' : 'PURE GUARANTEE',
    mg: Math.max(0, Number(raw.minimumGuarantee || 0)),
    recoupable: raw.guaranteeRecoupment === 'RECOUPABLE' || raw.inheritedContract?.guaranteeRecoupment === 'RECOUPABLE',
    backendPct: holderShare,
    basis: 'Adjusted gross',
    backendCap: raw.backendCap ?? raw.inheritedContract?.backendCap ?? undefined,
    termWeeks: Math.max(1, Number(raw.durationWeeks || 104)),
    window: raw.windowType === 'FIRST_WINDOW' ? 'FIRST' : raw.windowType === 'PERMANENT' ? 'PERPETUAL' : 'SECOND',
    excl: raw.exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'SHARED',
    scope: countryCount ? `${countryCount} markets` : 'Worldwide',
    localization: 'Subtitles only',
    renewal: raw.renewalOption || raw.inheritedContract?.renewalOption ? 'First option' : 'None',
    marketing: Math.max(0, Number(raw.marketingGuarantee || raw.inheritedContract?.marketingGuarantee || 0)),
    bonusAt: Math.max(0, Number(raw.viewershipBonusThreshold || raw.inheritedContract?.viewershipBonusThreshold || 0)) || undefined,
    sublicense: Boolean(raw.sublicensingAllowed || raw.inheritedContract?.sublicensingAllowed),
    sequel: Boolean(raw.sequelRightsIncluded || raw.inheritedContract?.sequelRightsIncluded),
  };
};

const territoryMap = (player: Player, freeIds: string[], excludedIds: string[] = [], unavailableReason?: string | null): Territory[] => {
  const platformIds = getOwnedPlatformPackageCountryIds(player.ownedStreamingPlatform);
  const allIds = [...new Set([...platformIds, ...freeIds, ...excludedIds])];
  const audiences = allIds.map(id => Math.max(1, Number(getStreamingDayOneMarket(id)?.streamingAudience || 1)));
  const total = audiences.reduce((sum, audience) => sum + audience, 0) || 1;
  return allIds.map((id, index) => {
    const market = getStreamingDayOneMarket(id);
    const free = freeIds.length === 0 || freeIds.includes(id);
    const blocked = excludedIds.includes(id) || Boolean(unavailableReason && !free);
    return {
      id,
      code: id === 'GB' ? 'UK' : id,
      name: market?.country || id,
      flag: '',
      weight: Math.max(1, Math.round((audiences[index] / total) * 100)),
      status: free && !blocked ? 'FREE' : blocked ? 'BLOCKED' : 'HELD',
      note: free && !blocked ? undefined : unavailableReason || 'Already licensed elsewhere',
    };
  });
};

const projectRecord = (player: Player, id: string): any => (
  (player.world.projects || []).find(project => project.id === id)
  || (player.pastProjects || []).find(project => project.id === id)
  || null
);

const storyCopy = (player: Player, id: string, title: string, genre: string, seller: string) => {
  const project = projectRecord(player, id);
  const logline = String(project?.logline || project?.premise || project?.description || `${seller} is offering the available streaming window for ${title}.`);
  const synopsis = String(project?.synopsis || project?.story || `A ${genre.toLowerCase()} title whose value will depend on its audience fit, rights reach, release history, and the final contract you sign.`);
  return { project, logline, synopsis };
};

const priorRun = (source: any, project: any) => {
  const rating = Number(source.rating ?? project?.rating ?? project?.imdbRating);
  const boxOffice = Number(source.gross ?? project?.boxOffice ?? project?.gross);
  if (!Number.isFinite(rating) && !Number.isFinite(boxOffice)) return undefined;
  return {
    rating: Number.isFinite(rating) ? rating : 0,
    votes: Math.max(0, Number(project?.ratingVotes || 0)),
    boxOffice: Number.isFinite(boxOffice) && boxOffice > 0 ? boxOffice : undefined,
  };
};

const collectionRows = (player: Player, collection: any, currentYear: number) => (
  collection?.rows?.map((row: any) => {
    const component = collection.package.components.find((item: any) => item.sourceProjectId === row.componentProjectId);
    const project = projectRecord(player, row.componentProjectId);
    return {
      id: row.componentProjectId,
      name: component?.title || project?.title || project?.name || 'Untitled',
      year: yearFor(project?.year || project?.releaseYear, currentYear),
      alloc: Number(row.minimumGuarantee || 0),
      share: Number(row.licensorRevenueShare || 0),
      genre: displayGenre(project?.genre || component?.genre || 'Mixed'),
      hue: hueFor(row.componentProjectId),
      runtime: 'Feature film',
    };
  }) || []
);

export const buildExactContentMarketLots = (player: Player, sources: ContentMarketSources): Lot[] => {
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const currentYear = Math.max(1, Math.floor(absoluteWeek / 52) + 1);
  const auctionListingIds = new Set(sources.auctionLots.map(lot => lot.listingId));
  const liveUpcomingIds = new Set(sources.auctionLots.map(lot => lot.upcomingRightsSaleId).filter(Boolean));

  const listings: Lot[] = sources.listings.filter(listing => !auctionListingIds.has(listing.id)).map(listing => {
    const genre = displayGenre(listing.title.genre);
    const copy = storyCopy(player, listing.title.id, listing.title.title, genre, listing.sellerName);
    const heat = listing.marketHeat === 'HOT' ? 82 : listing.marketHeat === 'ACTIVE' ? 64 : 42;
    return {
      id: listing.id,
      sourceId: listing.id,
      sourceKind: 'LISTING',
      title: listing.title.title,
      year: yearFor(listing.title.releaseYear, currentYear),
      runtime: projectType(listing.title.projectType) === 'SERIES' ? 'Series' : 'Feature film',
      format: projectType(listing.title.projectType),
      genre,
      seller: listing.sellerName,
      sellerKind: sellerKind(listing.sourceLicenseId, listing.sellerType),
      appetite: appetiteFor(listing.id, listing.marketHeat),
      hue: hueFor(listing.title.id),
      ...copy,
      path: listing.sourceLicenseId ? 'LIBRARY' : Number(copy.project?.boxOffice || listing.title.gross || 0) > 0 ? 'POST-THEATRICAL' : 'STREAMING ONLY',
      prior: priorRun(listing.title, copy.project),
      heat,
      heatWhy: [
        `${listing.marketHeat.toLowerCase()} buyer activity`,
        `${listing.countryIds.length || 'Worldwide'} market rights offered`,
        listing.rivalPlatformName ? `${listing.rivalPlatformName} has shown interest` : 'No public rival bid yet',
      ],
      terr: territoryMap(player, listing.countryIds, [], listing.unavailableReason),
      listed: termsFor({ ...listing.terms, inheritedContract: listing.inheritedContract }, listing.countryIds.length),
      mode: 'LISTED',
      avail: listing.unavailableReason ? 'WATCH' : 'OPEN',
      chain: listing.sourceLicenseId ? [listing.originalOwnerName, listing.sellerName] : undefined,
      note: listing.unavailableReason || undefined,
      unavailableReason: listing.unavailableReason,
    };
  });

  const collections: Lot[] = sources.collections.filter(collection => !auctionListingIds.has(collection.id)).map(collection => {
    const rows = collectionRows(player, collection, currentYear);
    const terr = territoryMap(player, collection.package.requestedCountryIds || []);
    return {
      id: collection.id,
      sourceId: collection.id,
      sourceKind: 'COLLECTION',
      title: collection.package.name,
      year: rows.length ? Math.min(...rows.map(row => row.year)) : currentYear,
      runtime: `${rows.length} titles`,
      format: 'COLLECTION',
      genre: 'Mixed',
      seller: collection.sellerName,
      sellerKind: 'SALES AGENT',
      appetite: appetiteFor(collection.id),
      hue: hueFor(collection.id),
      logline: `${rows.length} titles offered under one catalogue agreement.`,
      synopsis: 'The package signs together, while each title keeps its own allocated guarantee, backend share, and rights record.',
      path: 'LIBRARY',
      heat: Math.min(88, 46 + rows.length * 4),
      heatWhy: [`${rows.length} titles in one negotiation`, 'Per-title allocations remain visible'],
      terr,
      listed: termsFor({
        minimumGuarantee: collection.totalGuarantee,
        platformRevenueShare: rows.length ? 100 - rows.reduce((sum, row) => sum + row.share, 0) / rows.length : 70,
        durationWeeks: collection.package.maximumDurationWeeks || 104,
        windowType: collection.package.requestedWindowType,
        exclusivity: collection.package.requestedExclusivity,
        renewalOption: true,
      }, terr.length),
      mode: 'LISTED',
      avail: 'OPEN',
      rows,
    };
  });

  const auctions: Lot[] = sources.auctionLots.map(lot => {
    const sourceCollection = lot.listingKind === 'CATALOGUE_PACKAGE'
      ? sources.collections.find(collection => collection.id === lot.listingId)
      : null;
    const rows = collectionRows(player, sourceCollection, currentYear);
    const genre = displayGenre(lot.genre);
    const copy = storyCopy(player, lot.sourceProjectId, lot.title, genre, lot.sellerName);
    return {
      id: lot.id,
      sourceId: lot.id,
      sourceKind: 'AUCTION',
      title: lot.title,
      year: rows.length ? Math.min(...rows.map(row => row.year)) : yearFor(copy.project?.releaseYear || copy.project?.year, currentYear),
      runtime: lot.listingKind === 'CATALOGUE_PACKAGE' ? `${rows.length || lot.catalogueComponentIds?.length || 0} titles` : projectType(lot.projectType) === 'SERIES' ? 'Series' : 'Feature film',
      format: lot.listingKind === 'CATALOGUE_PACKAGE' ? 'COLLECTION' : projectType(lot.projectType),
      genre: lot.listingKind === 'CATALOGUE_PACKAGE' ? 'Mixed' : genre,
      seller: lot.sellerName,
      sellerKind: sellerKind(lot.sourceLicenseId, 'STUDIO'),
      appetite: appetiteFor(lot.id, 'HOT', lot.sellerPriorities),
      hue: hueFor(lot.sourceProjectId),
      ...copy,
      path: lot.upcomingRightsSaleId ? 'UNRELEASED' : priorRun({}, copy.project) ? 'POST-THEATRICAL' : 'STREAMING ONLY',
      prior: priorRun({}, copy.project),
      heat: lot.upcomingRightsSaleId ? 88 : 76,
      heatWhy: ['A live room is open now', `${lot.countryIds.length} market rights are in the room`],
      terr: territoryMap(player, lot.countryIds, lot.excludedCountryIds, lot.notice),
      mode: 'AUCTION',
      avail: 'LIVE',
      note: lot.notice || undefined,
      rows: rows.length ? rows : undefined,
    };
  });

  const upcoming: Lot[] = sources.upcomingSales.filter(sale => !liveUpcomingIds.has(sale.id) && ['ANNOUNCED', 'LIVE'].includes(sale.status)).map(sale => {
    const genre = displayGenre(sale.genre);
    const copy = storyCopy(player, sale.sourceProjectId, sale.title, genre, sale.sellerName);
    return {
      id: sale.id,
      sourceId: sale.id,
      sourceKind: 'UPCOMING',
      title: sale.title,
      year: yearFor(copy.project?.releaseYear || copy.project?.year, currentYear),
      runtime: projectType(sale.projectType) === 'SERIES' ? 'Series' : 'Feature film',
      format: projectType(sale.projectType),
      genre,
      seller: sale.sellerName,
      sellerKind: 'STUDIO',
      appetite: appetiteFor(sale.id, sale.publicInterest === 'EVENT' ? 'HOT' : 'ACTIVE'),
      hue: hueFor(sale.sourceProjectId),
      ...copy,
      path: 'UNRELEASED',
      heat: sale.publicInterestScore,
      heatWhy: sale.publicInterestDrivers.length ? sale.publicInterestDrivers : ['The production has been publicly announced'],
      terr: territoryMap(player, sale.countryIds),
      mode: 'UPCOMING',
      avail: sale.status === 'LIVE' ? 'LIVE' : 'OPENS',
      opensWeek: sale.opensAtAbsoluteWeek,
      deliversWeek: sale.plannedAvailabilityAbsoluteWeek,
      note: `Cannot be scheduled before week ${sale.plannedAvailabilityAbsoluteWeek}.`,
    };
  });

  const studio: Lot[] = sources.ownedTitles.map(title => {
    const genre = displayGenre(title.genre);
    const copy = storyCopy(player, title.id, title.title, genre, title.studioName);
    return {
      id: `studio:${title.id}`,
      sourceId: title.id,
      sourceKind: 'STUDIO',
      title: title.title,
      year: yearFor(title.releaseYear, currentYear),
      runtime: projectType(title.projectType) === 'SERIES' ? 'Series' : 'Feature film',
      format: projectType(title.projectType),
      genre,
      seller: title.studioName,
      sellerKind: 'YOUR STUDIO',
      appetite: 'RELATIONSHIP',
      hue: hueFor(title.id),
      ...copy,
      path: Number(title.gross || copy.project?.boxOffice || 0) > 0 ? 'POST-THEATRICAL' : 'STREAMING ONLY',
      prior: priorRun(title, copy.project),
      heat: Math.max(35, Math.min(92, Math.round(Number(title.rating || 6) * 10))),
      heatWhy: ['Controlled by your production company'],
      terr: territoryMap(player, title.countryIds, title.excludedCountryIds, title.unavailableReason),
      mode: 'STUDIO',
      avail: 'OPEN',
      note: title.unavailableReason || undefined,
      unavailableReason: title.unavailableReason,
      linked: title.linked,
    };
  });

  return [...auctions, ...listings, ...collections, ...upcoming, ...studio];
};
