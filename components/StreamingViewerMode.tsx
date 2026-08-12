import React, { type CSSProperties, useId, useMemo, useState } from 'react';
import {
  Activity,
  Aperture,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Eye,
  Film,
  Gamepad2,
  HeartHandshake,
  Info,
  Laugh,
  Monitor,
  Play,
  RadioTower,
  Search,
  ShoppingBag,
  Signal,
  Smartphone,
  Sparkles,
  Tv,
  UserRound,
} from 'lucide-react';
import type {
  CustomPoster,
  OwnedStreamingCatalogLicense,
  OwnedStreamingOriginalCommission,
  OwnedStreamingSlateEntry,
  Player,
  StreamingOriginalCommissionStatus,
  StreamingOriginalReleasePattern,
  StreamingProductLineId,
} from '../types';
import { CustomPosterImage } from './CustomPosterImage';
import {
  getStreamingCatalogLicenseStatus,
  resolveStreamingCatalogTitle,
} from '../services/streamingCatalog';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
  getOwnedStreamingProgramEntries,
  getStreamingOriginalLiveStatus,
} from '../services/streamingOriginals';
import { getStreamingLaunchAftermath } from '../services/streamingAftermath';
import {
  getStreamingProductSuite,
  STREAMING_PRODUCT_DEFINITIONS,
} from '../services/streamingProductSuite';
import '../styles/streaming-viewer-mode.css';

export type StreamingViewerDevice = 'PHONE' | 'TV' | 'WEB';

export interface StreamingViewerModeProps {
  player: Player;
  onBackToHq: () => void;
  initialDevice?: StreamingViewerDevice;
  className?: string;
}

type ViewerTitleSource = 'ORIGINAL' | 'OWNED_LIBRARY' | 'LICENSED_WINDOW';

interface ViewerTitle {
  key: string;
  id: string;
  canonicalProjectId: string | null;
  title: string;
  projectType: 'MOVIE' | 'SERIES';
  genre: string;
  source: ViewerTitleSource;
  sourceLabel: string;
  studioName: string;
  description: string;
  rating: number | null;
  releaseYear: number | null;
  customPoster: CustomPoster | null;
  originalStatus: StreamingOriginalCommissionStatus | null;
  license: OwnedStreamingCatalogLicense | null;
  launchWeek: number | null;
  releasePattern: StreamingOriginalReleasePattern | null;
}

interface ProjectPresentation {
  customPoster: CustomPoster | null;
  description: string;
  rating: number | null;
  releaseYear: number | null;
}

const DEVICES: Array<{
  id: StreamingViewerDevice;
  label: string;
  Icon: typeof Smartphone;
}> = [
  { id: 'PHONE', label: 'Phone', Icon: Smartphone },
  { id: 'TV', label: 'TV', Icon: Tv },
  { id: 'WEB', label: 'Web', Icon: Monitor },
];

const POSTER_PALETTES = [
  ['#18264f', '#7546c8', '#070b19'],
  ['#4c1d35', '#d35b6f', '#11070c'],
  ['#123d3a', '#3cbca6', '#06110f'],
  ['#4c3513', '#d49a38', '#110b04'],
  ['#26314d', '#6ca6dc', '#080b12'],
  ['#3a2147', '#b75fc7', '#0d0711'],
] as const;

const EMPTY_PRESENTATION: ProjectPresentation = {
  customPoster: null,
  description: '',
  rating: null,
  releaseYear: null,
};

const VIEWER_ROW_PAGE_SIZE = 12;

const PRODUCT_PUBLIC_COPY: Record<StreamingProductLineId, {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  Icon: typeof Play;
}> = {
  CORE: {
    eyebrow: 'THE MAIN SERVICE',
    title: 'Everything worth watching, in one signal.',
    body: 'Your complete subscription catalog, Originals and weekly premieres.',
    action: 'Explore Core',
    Icon: Play,
  },
  KIDS: {
    eyebrow: 'A SAFER SPACE',
    title: 'Big stories for growing imaginations.',
    body: 'A calmer family home with child profiles, guardian controls and age-aware discovery.',
    action: 'Enter Kids',
    Icon: Laugh,
  },
  FREE: {
    eyebrow: 'WATCH WITHOUT A PLAN',
    title: 'A free front row to the culture.',
    body: 'A curated, ad-supported collection that opens the service to more viewers.',
    action: 'Watch Free',
    Icon: RadioTower,
  },
  LIVE: {
    eyebrow: 'HAPPENING TOGETHER',
    title: 'Premieres become appointments.',
    body: 'Live events, countdown rooms and synchronized moments from across the platform.',
    action: 'See Live',
    Icon: Signal,
  },
  FAN: {
    eyebrow: 'STAY AFTER THE CREDITS',
    title: 'Go deeper into the stories you love.',
    body: 'Franchise timelines, bonus drops and creator-led spaces powered by real Originals.',
    action: 'Enter Fan',
    Icon: HeartHandshake,
  },
  STORE: {
    eyebrow: 'FROM SCREEN TO COLLECTION',
    title: 'Own a piece of the story.',
    body: 'Rights-cleared merchandise and digital extras tied to active titles and fandom.',
    action: 'Visit Store',
    Icon: ShoppingBag,
  },
  INTERACTIVE: {
    eyebrow: 'YOUR CHOICE CHANGES THE STORY',
    title: 'Stop watching. Start deciding.',
    body: 'Branching experiences and synchronized participation built for the strongest platform stack.',
    action: 'Enter Interactive',
    Icon: Gamepad2,
  },
};

const asFinitePositiveNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const cleanCopy = (value: unknown): string => (
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
);

const humanize = (value: string): string => (
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
);

const formatProjectType = (projectType: ViewerTitle['projectType']): string => (
  projectType === 'SERIES' ? 'Series' : 'Film'
);

const formatOriginalStatus = (status: StreamingOriginalCommissionStatus): string => {
  switch (status) {
    case 'READY_FOR_GREENLIGHT':
      return 'In development';
    case 'GREENLIT':
      return 'Greenlit';
    case 'IN_PRODUCTION':
      return 'In production';
    case 'DELIVERED':
      return 'Delivered';
    case 'RELEASED':
      return 'Released';
    default:
      return humanize(status);
  }
};

const formatReleasePattern = (pattern: StreamingOriginalReleasePattern): string => {
  switch (pattern) {
    case 'SINGLE_PREMIERE':
      return 'Single premiere';
    case 'FULL_SEASON':
      return 'Full-season release';
    case 'WEEKLY':
      return 'Weekly release';
    case 'SPLIT_VOLUME':
      return 'Split-volume release';
    default:
      return humanize(pattern);
  }
};

const safeCssColor = (value: string | undefined, fallback: string): string => {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
};

const getPosterPalette = (key: string): readonly [string, string, string] => {
  const hash = Array.from(key).reduce(
    (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
    7,
  );
  return POSTER_PALETTES[hash % POSTER_PALETTES.length];
};

const getPosterStyle = (key: string): CSSProperties => {
  const [primary, secondary, shadow] = getPosterPalette(key);
  return {
    '--stream-viewer-art-primary': primary,
    '--stream-viewer-art-secondary': secondary,
    '--stream-viewer-art-shadow': shadow,
  } as CSSProperties;
};

const getInitials = (title: string): string => (
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    || 'P'
);

const getProjectPresentation = (player: Player, projectId: string): ProjectPresentation => {
  const pastProject = player.pastProjects.find(project => String(project.id) === projectId);
  if (pastProject) {
    return {
      customPoster: pastProject.customPoster || null,
      description: cleanCopy(pastProject.description),
      rating: asFinitePositiveNumber(pastProject.imdbRating ?? pastProject.rating),
      releaseYear: asFinitePositiveNumber(pastProject.releaseYear ?? pastProject.year),
    };
  }

  const activeRelease = player.activeReleases.find(project => String(project.id) === projectId);
  if (activeRelease) {
    return {
      customPoster: activeRelease.projectDetails.customPoster || null,
      description: cleanCopy(activeRelease.projectDetails.description),
      rating: asFinitePositiveNumber(activeRelease.imdbRating),
      releaseYear: asFinitePositiveNumber(activeRelease.releaseYear),
    };
  }

  const commitment = player.commitments.find(project => String(project.id) === projectId);
  if (commitment?.projectDetails) {
    return {
      customPoster: commitment.projectDetails.customPoster || null,
      description: cleanCopy(commitment.projectDetails.description),
      rating: null,
      releaseYear: null,
    };
  }

  const legacyProjects = Array.isArray(player.flags?.legacyStudioProjects)
    ? player.flags.legacyStudioProjects as Array<Record<string, any>>
    : [];
  const legacyProject = legacyProjects.find(project => String(project.id || '') === projectId);
  if (legacyProject) {
    return {
      customPoster: legacyProject.customPoster || legacyProject.projectDetails?.customPoster || null,
      description: cleanCopy(legacyProject.description || legacyProject.projectDetails?.description),
      rating: asFinitePositiveNumber(legacyProject.imdbRating ?? legacyProject.rating),
      releaseYear: asFinitePositiveNumber(legacyProject.releaseYear ?? legacyProject.year),
    };
  }

  return EMPTY_PRESENTATION;
};

const getOriginalPresentation = (
  player: Player,
  commission: OwnedStreamingOriginalCommission,
): ProjectPresentation => {
  if (commission.canonicalProjectId) {
    const canonical = getProjectPresentation(player, commission.canonicalProjectId);
    if (
      canonical.customPoster
      || canonical.description
      || canonical.rating
      || canonical.releaseYear
    ) return canonical;
  }

  const producingStudio = player.businesses.find(
    business => String(business.id) === String(commission.producerStudioId),
  );
  const sourceScript = producingStudio?.studioState?.scripts.find(
    script => String(script.id) === String(commission.scriptId),
  );
  if (!sourceScript) return EMPTY_PRESENTATION;
  return {
    customPoster: sourceScript.customPoster || null,
    description: cleanCopy(sourceScript.logline),
    rating: null,
    releaseYear: null,
  };
};

const titleFallbackDescription = (title: ViewerTitle): string => {
  if (title.source === 'ORIGINAL') {
    return `${formatProjectType(title.projectType)} produced by ${title.studioName} for this platform.`;
  }
  if (title.source === 'LICENSED_WINDOW') {
    const territory = title.license ? humanize(title.license.territory) : 'licensed';
    return `${formatProjectType(title.projectType)} licensed from ${title.studioName} for the ${territory.toLowerCase()} catalog.`;
  }
  return `${formatProjectType(title.projectType)} from the ${title.studioName} library.`;
};

function PosterFallback({
  title,
  projectType,
  decorative = false,
}: {
  title: string;
  projectType: ViewerTitle['projectType'];
  decorative?: boolean;
}) {
  return (
    <span
      className="stream-viewer-poster-fallback"
      style={getPosterStyle(title)}
      aria-hidden={decorative || undefined}
    >
      <span className="stream-viewer-poster-orbit" />
      <span className="stream-viewer-poster-initials">{getInitials(title)}</span>
      <span className="stream-viewer-poster-format">{formatProjectType(projectType)}</span>
    </span>
  );
}

function PlatformMark({
  name,
  logoKey,
}: {
  name: string;
  logoKey: 'FRAME_PLAY' | 'SIGNAL_RING' | 'SPOTLIGHT' | 'WORDMARK';
}) {
  const Icon = logoKey === 'SIGNAL_RING'
    ? RadioTower
    : logoKey === 'SPOTLIGHT'
      ? Aperture
      : logoKey === 'WORDMARK'
        ? Film
        : Play;
  return (
    <span className="stream-viewer-brand">
      <span className={`stream-viewer-brand-mark is-${logoKey.toLowerCase()}`} aria-hidden="true">
        <Icon size={17} fill={logoKey === 'FRAME_PLAY' ? 'currentColor' : 'none'} />
      </span>
      <strong>{name}</strong>
    </span>
  );
}

function TitleTile({
  item,
  active,
  ceoLens,
  isLive,
  programWeek,
  onSelect,
}: {
  item: ViewerTitle;
  active: boolean;
  ceoLens: boolean;
  isLive: boolean;
  programWeek: number;
  onSelect: () => void;
}) {
  const availableNow = isLive && (!item.launchWeek || item.launchWeek <= programWeek);
  return (
    <button
      type="button"
      className={`stream-viewer-title-tile ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      aria-label={`Feature ${item.title}`}
      onClick={onSelect}
    >
      <span className="stream-viewer-title-art">
        <CustomPosterImage
          poster={item.customPoster}
          alt={`${item.title} poster`}
          className="stream-viewer-title-image"
          fallback={<PosterFallback title={item.title} projectType={item.projectType} />}
        />
        <span className="stream-viewer-title-scrim" aria-hidden="true" />
        {item.source === 'ORIGINAL' ? (
          <span className="stream-viewer-original-pin"><Sparkles size={10} /> Original</span>
        ) : null}
        {availableNow ? (
          <span className="stream-viewer-live-pin"><Play size={9} fill="currentColor" /> Now</span>
        ) : null}
        {ceoLens ? (
          <span className="stream-viewer-title-lens">
            <span>{item.sourceLabel}</span>
            {item.launchWeek ? <strong>Launch W{item.launchWeek}</strong> : null}
            {item.originalStatus ? <strong>{formatOriginalStatus(item.originalStatus)}</strong> : null}
            {item.license ? <strong>{humanize(item.license.territory)} rights</strong> : null}
          </span>
        ) : null}
      </span>
      <span className="stream-viewer-title-copy">
        <strong>{item.title}</strong>
        <small>{humanize(item.genre)} · {formatProjectType(item.projectType)}</small>
      </span>
    </button>
  );
}

function TitleRow({
  id,
  eyebrow,
  title,
  items,
  selectedKey,
  ceoLens,
  isLive,
  programWeek,
  onSelect,
}: {
  id: string;
  eyebrow: string;
  title: string;
  items: ViewerTitle[];
  selectedKey: string | null;
  ceoLens: boolean;
  isLive: boolean;
  programWeek: number;
  onSelect: (key: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(VIEWER_ROW_PAGE_SIZE);
  if (!items.length) return null;
  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = Math.max(0, items.length - visibleItems.length);
  const nextPageSize = Math.min(VIEWER_ROW_PAGE_SIZE, remainingCount);
  return (
    <section className="stream-viewer-row" aria-labelledby={id}>
      <header>
        <span>{eyebrow}</span>
        <h2 id={id}>{title}</h2>
      </header>
      <div className="stream-viewer-title-rail">
        {visibleItems.map(item => (
          <React.Fragment key={`${id}-${item.key}`}>
            <TitleTile
              item={item}
              active={selectedKey === item.key}
              ceoLens={ceoLens}
              isLive={isLive}
              programWeek={programWeek}
              onSelect={() => onSelect(item.key)}
            />
          </React.Fragment>
        ))}
      </div>
      {remainingCount > 0 ? (
        <footer className="stream-viewer-row-more">
          <span>Showing {visibleItems.length} of {items.length}</span>
          <button
            type="button"
            onClick={() => setVisibleCount(current => Math.min(items.length, current + VIEWER_ROW_PAGE_SIZE))}
          >
            Show {nextPageSize} more
          </button>
        </footer>
      ) : null}
    </section>
  );
}

export default function StreamingViewerMode({
  player,
  onBackToHq,
  initialDevice = 'PHONE',
  className = '',
}: StreamingViewerModeProps) {
  const ceoPanelId = useId();
  const [device, setDevice] = useState<StreamingViewerDevice>(initialDevice);
  const [ceoLens, setCeoLens] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StreamingProductLineId>('CORE');
  const platform = useMemo(
    () => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id),
    [player.id, player.ownedStreamingPlatform],
  );
  const aftermath = useMemo(() => getStreamingLaunchAftermath(player), [player]);
  const productSuite = useMemo(() => getStreamingProductSuite(player), [player]);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const platformName = platform.identity?.name || 'EMPIRE+';
  const primaryColor = safeCssColor(platform.identity?.primaryColor, '#6d5dfb');
  const secondaryColor = safeCssColor(platform.identity?.secondaryColor, '#111225');
  const logoKey = platform.identity?.logoKey || 'FRAME_PLAY';
  const isLive = platform.lifecycle === 'ACTIVE';
  const isSuspended = platform.lifecycle === 'SUSPENDED';
  const isPrelaunch = !isLive && !isSuspended;
  const programWeek = aftermath.programWeek || 1;
  const publicProducts = STREAMING_PRODUCT_DEFINITIONS.filter(definition => (
    productSuite.activeProductIds.includes(definition.id)
  ));
  const effectiveProduct = productSuite.activeProductIds.includes(selectedProduct)
    ? selectedProduct
    : 'CORE';
  const productPresentation = PRODUCT_PUBLIC_COPY[effectiveProduct];
  const ProductPresentationIcon = productPresentation.Icon;

  const viewerData = useMemo(() => {
    const launchEntries = getOwnedStreamingProgramEntries(player);
    const launchEntryByProjectId = new Map<string, OwnedStreamingSlateEntry>(
      launchEntries.map((entry): [string, OwnedStreamingSlateEntry] => [
        String(entry.projectId),
        entry,
      ]),
    );
    const originalCanonicalIds = new Set(
      platform.originalCommissions
        .map(commission => commission.canonicalProjectId)
        .filter((id): id is string => Boolean(id)),
    );

    const originals: ViewerTitle[] = platform.originalCommissions.map(commission => {
      const presentation = getOriginalPresentation(player, commission);
      const resolved = commission.canonicalProjectId
        ? resolveStreamingCatalogTitle(player, commission.canonicalProjectId)
        : null;
      const projectId = commission.canonicalProjectId || commission.id;
      const launchEntry = launchEntryByProjectId.get(projectId);
      const originalStatus = getStreamingOriginalLiveStatus(player, commission);
      const item: ViewerTitle = {
        key: `original:${commission.id}`,
        id: projectId,
        canonicalProjectId: commission.canonicalProjectId,
        title: commission.title,
        projectType: commission.projectType,
        genre: commission.genre,
        source: 'ORIGINAL',
        sourceLabel: `${platformName} Original`,
        studioName: commission.producerStudioName,
        description: presentation.description,
        rating: presentation.rating ?? resolved?.rating ?? null,
        releaseYear: presentation.releaseYear ?? resolved?.releaseYear ?? null,
        customPoster: presentation.customPoster,
        originalStatus,
        license: null,
        launchWeek: launchEntry?.launchWeek || null,
        releasePattern: launchEntry?.releasePattern || null,
      };
      return {
        ...item,
        description: item.description || titleFallbackDescription(item),
      };
    });

    const catalog: ViewerTitle[] = platform.catalogProjectIds.flatMap(projectId => {
      if (originalCanonicalIds.has(projectId)) return [];
      const resolved = resolveStreamingCatalogTitle(player, projectId);
      if (!resolved) return [];
      const license = resolved.source === 'EXTERNAL_MARKET'
        ? platform.catalogLicenses.find(candidate => candidate.sourceProjectId === projectId) || null
        : null;
      if (
        resolved.source === 'EXTERNAL_MARKET'
        && (!license || getStreamingCatalogLicenseStatus(license, absoluteWeek) !== 'ACTIVE')
      ) return [];

      const presentation = getProjectPresentation(player, projectId);
      const launchEntry = launchEntryByProjectId.get(projectId);
      const source: ViewerTitleSource = resolved.source === 'OWNED_LIBRARY'
        ? 'OWNED_LIBRARY'
        : 'LICENSED_WINDOW';
      const item: ViewerTitle = {
        key: `${source.toLowerCase()}:${projectId}`,
        id: projectId,
        canonicalProjectId: projectId,
        title: resolved.title,
        projectType: resolved.projectType,
        genre: resolved.genre,
        source,
        sourceLabel: source === 'OWNED_LIBRARY' ? 'Studio library' : 'Licensed window',
        studioName: resolved.studioName,
        description: presentation.description,
        rating: presentation.rating ?? resolved.rating,
        releaseYear: presentation.releaseYear ?? resolved.releaseYear,
        customPoster: presentation.customPoster,
        originalStatus: null,
        license,
        launchWeek: launchEntry?.launchWeek || null,
        releasePattern: launchEntry?.releasePattern || null,
      };
      return [{
        ...item,
        description: item.description || titleFallbackDescription(item),
      }];
    });

    const all = [...originals, ...catalog];
    const byProjectId = new Map<string, ViewerTitle>();
    all.forEach(item => {
      byProjectId.set(item.id, item);
      if (item.canonicalProjectId) byProjectId.set(item.canonicalProjectId, item);
    });
    const opening = launchEntries
      .slice()
      .sort((a, b) => a.launchWeek - b.launchWeek)
      .map(entry => byProjectId.get(String(entry.projectId)))
      .filter((item): item is ViewerTitle => Boolean(item));
    const owned = catalog.filter(item => item.source === 'OWNED_LIBRARY');
    const licensed = catalog.filter(item => item.source === 'LICENSED_WINDOW');
    const expiredLicenseCount = platform.catalogLicenses.filter(
      license => getStreamingCatalogLicenseStatus(license, absoluteWeek) === 'EXPIRED',
    ).length;
    return {
      all,
      opening,
      originals,
      owned,
      licensed,
      expiredLicenseCount,
    };
  }, [absoluteWeek, platform, platformName, player]);

  const availableNow = viewerData.all.filter(item => !item.launchWeek || item.launchWeek <= programWeek);
  const newThisWeek = viewerData.opening.filter(item => item.launchWeek === programWeek);
  const comingNext = viewerData.opening.filter(item => (item.launchWeek || 0) > programWeek);
  const seriesDiscovery = availableNow.filter(item => item.projectType === 'SERIES');
  const filmDiscovery = availableNow.filter(item => item.projectType === 'MOVIE');
  const heroTitle = viewerData.all.find(item => item.key === selectedKey)
    || (isLive ? availableNow[0] : viewerData.opening[0])
    || viewerData.originals[0]
    || viewerData.all[0]
    || null;
  const effectiveSelectedKey = heroTitle?.key || null;
  const openingRow = isLive
    ? (availableNow.length ? availableNow : viewerData.all)
    : (viewerData.opening.length ? viewerData.opening : viewerData.all);
  const openingKeys = new Set(openingRow.map(item => item.key));
  const originalsRow = viewerData.originals.filter(item => !openingKeys.has(item.key));
  const ownedRow = viewerData.owned.filter(item => !openingKeys.has(item.key));
  const licensedRow = viewerData.licensed.filter(item => !openingKeys.has(item.key));
  const basicPrice = platform.subscriptionPrices.BASIC;
  const heroStatus = !heroTitle
    ? null
    : isSuspended
      ? 'Service paused'
      : isPrelaunch
        ? heroTitle.launchWeek
          ? `Coming soon · Launch week ${heroTitle.launchWeek}`
          : 'Coming soon'
        : heroTitle.launchWeek && heroTitle.launchWeek > programWeek
          ? `Coming in program week ${heroTitle.launchWeek}`
          : 'Now streaming';
  const rootStyle = {
    '--stream-viewer-primary': primaryColor,
    '--stream-viewer-secondary': secondaryColor,
  } as CSSProperties;

  return (
    <div
      className={`stream-viewer-mode ${className}`.trim()}
      style={rootStyle}
      data-device={device.toLowerCase()}
      data-lifecycle={isLive ? 'live' : isSuspended ? 'suspended' : 'prelaunch'}
      aria-label={`${platformName} ${isLive ? 'live viewer home' : 'public storefront preview'}`}
    >
      <header className="stream-viewer-lab-header">
        <button
          type="button"
          className="stream-viewer-back"
          aria-label="Back to Streaming Hall"
          onClick={onBackToHq}
        >
          <ArrowLeft size={18} />
          <span>Back to HQ</span>
        </button>
        <div className="stream-viewer-lab-title">
          <span>{isLive ? 'VIEWER HOME • LIVE' : 'VIEWER MODE'}</span>
          <strong>{isLive ? 'Customer experience and launch pulse' : 'Public storefront preview'}</strong>
        </div>
        <div className="stream-viewer-lab-controls">
          <div className="stream-viewer-device-toggle" role="group" aria-label="Preview device">
            {DEVICES.map(option => (
              <button
                type="button"
                key={option.id}
                aria-label={`Preview on ${option.label}`}
                aria-pressed={device === option.id}
                onClick={() => setDevice(option.id)}
              >
                <option.Icon size={16} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`stream-viewer-lens-toggle ${ceoLens ? 'is-active' : ''}`}
            aria-label={`${ceoLens ? 'Hide' : 'Show'} CEO Lens`}
            aria-pressed={ceoLens}
            aria-controls={ceoPanelId}
            onClick={() => setCeoLens(current => !current)}
          >
            {ceoLens ? <BriefcaseBusiness size={17} /> : <Eye size={17} />}
            <span>CEO Lens</span>
          </button>
        </div>
      </header>

      <main className="stream-viewer-stage">
        <div className={`stream-viewer-device-frame is-${device.toLowerCase()}`}>
          <div className="stream-viewer-device-detail" aria-hidden="true">
            <span />
            <i />
          </div>
          <div className="stream-viewer-screen">
            <header className="stream-viewer-public-header">
              <PlatformMark name={platformName} logoKey={logoKey} />
              <div className="stream-viewer-public-nav" aria-hidden="true">
                <span>Home</span>
                <span>Originals</span>
                <span>Films</span>
                <span>Series</span>
              </div>
              <div className="stream-viewer-public-tools" aria-hidden="true">
                <Search size={17} />
                <UserRound size={17} />
              </div>
            </header>

            {isPrelaunch ? (
              <div className="stream-viewer-state-ribbon">
                <Clock3 size={13} />
                <span>Coming soon</span>
                <small>This is the planned public storefront.</small>
              </div>
            ) : null}
            {isLive ? (
              <div className="stream-viewer-state-ribbon is-live">
                <Signal size={13} />
                <span>Now live</span>
                <small>Program week {programWeek} • The public home follows the locked slate.</small>
              </div>
            ) : null}
            {isSuspended ? (
              <div className="stream-viewer-state-ribbon is-paused">
                <RadioTower size={13} />
                <span>Service paused</span>
                <small>The catalog remains visible in HQ preview.</small>
              </div>
            ) : null}

            {ceoLens ? (
              <aside className="stream-viewer-ceo-panel" id={ceoPanelId} aria-label="CEO Lens operational facts">
                <header>
                  <BriefcaseBusiness size={17} />
                  <div>
                    <span>PRIVATE OVERLAY</span>
                    <strong>CEO Lens</strong>
                  </div>
                </header>
                <dl>
                  <div><dt>Lifecycle</dt><dd>{humanize(platform.lifecycle)}</dd></div>
                  <div><dt>Library + licenses</dt><dd>{viewerData.owned.length + viewerData.licensed.length}</dd></div>
                  <div><dt>Originals pipeline</dt><dd>{viewerData.originals.length}</dd></div>
                  <div><dt>Programmed titles</dt><dd>{getOwnedStreamingProgramEntries(player).length}</dd></div>
                  <div><dt>Basic price</dt><dd>${basicPrice.toFixed(2)}</dd></div>
                  <div><dt>Public products</dt><dd>{productSuite.activeProductIds.length}/7</dd></div>
                  <div><dt>Product run rate</dt><dd>${(productSuite.weeklyOperatingCost / 1_000_000).toFixed(2)}M/wk</dd></div>
                  <div><dt>Added peak load</dt><dd>+{productSuite.peakLoadPercent.toFixed(1)}%</dd></div>
                  <div><dt>Expired rights hidden</dt><dd>{viewerData.expiredLicenseCount}</dd></div>
                </dl>
                {isPrelaunch ? (
                  <p>Audience performance is intentionally blank until the platform launches.</p>
                ) : aftermath.available ? (
                  <>
                    <section className="stream-viewer-launch-pulse" aria-label="Committed launch pulse">
                      <header><Activity size={14} /><span>LAUNCH PULSE</span><strong>{aftermath.outcomeLabel}</strong></header>
                      <div>
                        {aftermath.signals.map(signal => (
                          <article key={signal.id} className={`is-${signal.tone.toLowerCase()}`}>
                            <span>{signal.label}</span>
                            <strong>{signal.value}</strong>
                            <small>{signal.detail}</small>
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="stream-viewer-report-queue" aria-label="Audience reports">
                      <header><Clock3 size={13} /><strong>{aftermath.nextReportLabel}</strong></header>
                      {aftermath.reports.map(report => (
                        <div key={report.id} className={report.status === 'AVAILABLE' ? 'is-available' : 'is-pending'}>
                          <span>{report.label}</span>
                          <strong>{report.value || 'Pending'}</strong>
                        </div>
                      ))}
                      <p>Opening facts stay visible; unprocessed weekly metrics are never shown as zero.</p>
                    </section>
                  </>
                ) : null}
              </aside>
            ) : null}

            {isLive ? (
              <nav className="stream-viewer-product-dock" aria-label="Available platform products">
                {publicProducts.map(definition => {
                  const presentation = PRODUCT_PUBLIC_COPY[definition.id];
                  const ProductIcon = presentation.Icon;
                  return (
                    <button
                      type="button"
                      key={definition.id}
                      className={effectiveProduct === definition.id ? 'is-selected' : ''}
                      aria-pressed={effectiveProduct === definition.id}
                      style={{ '--stream-viewer-product-accent': definition.accent } as CSSProperties}
                      onClick={() => setSelectedProduct(definition.id)}
                    >
                      <ProductIcon size={14} />
                      <span>{definition.shortTitle}</span>
                    </button>
                  );
                })}
              </nav>
            ) : null}

            {isLive && effectiveProduct !== 'CORE' ? (
              <section
                className={`stream-viewer-product-story is-${effectiveProduct.toLowerCase()}`}
                aria-label={`${effectiveProduct} product experience`}
              >
                <div className="stream-viewer-product-orbit" aria-hidden="true">
                  <span><ProductPresentationIcon size={24} /></span>
                  <i /><i /><i />
                </div>
                <div>
                  <span>{productPresentation.eyebrow}</span>
                  <h2>{productPresentation.title}</h2>
                  <p>{productPresentation.body}</p>
                </div>
                <strong>{productPresentation.action}<ChevronRight size={15} /></strong>
              </section>
            ) : null}

            <section
              className={`stream-viewer-hero ${heroTitle ? 'has-title' : 'is-empty'}`}
              aria-live="polite"
            >
              {heroTitle ? (
                <>
                  <div className="stream-viewer-hero-art" aria-hidden="true">
                    <CustomPosterImage
                      poster={heroTitle.customPoster}
                      alt=""
                      className="stream-viewer-hero-image"
                      loading="eager"
                      fallback={(
                        <PosterFallback
                          title={heroTitle.title}
                          projectType={heroTitle.projectType}
                          decorative
                        />
                      )}
                    />
                  </div>
                  <div className="stream-viewer-hero-signal" aria-hidden="true" />
                  <div className="stream-viewer-hero-copy">
                    <span className="stream-viewer-hero-source">
                      {heroTitle.source === 'ORIGINAL' ? <Sparkles size={11} /> : <Film size={11} />}
                      {heroTitle.sourceLabel}
                    </span>
                    <h1>{heroTitle.title}</h1>
                    <div className="stream-viewer-hero-meta">
                      <span>{formatProjectType(heroTitle.projectType)}</span>
                      <span>{humanize(heroTitle.genre)}</span>
                      {heroTitle.releaseYear ? <span>{heroTitle.releaseYear}</span> : null}
                      {heroTitle.rating ? <span>{heroTitle.rating.toFixed(1)} rating</span> : null}
                    </div>
                    <p>{heroTitle.description}</p>
                    {isLive ? (
                      <div className="stream-viewer-hero-actions" aria-hidden="true">
                        {(!heroTitle.launchWeek || heroTitle.launchWeek <= programWeek) ? (
                          <span className="is-primary"><Play size={14} fill="currentColor" /> Play</span>
                        ) : (
                          <span className="is-upcoming"><Clock3 size={14} /> Coming week {heroTitle.launchWeek}</span>
                        )}
                        <span><Info size={14} /> Details</span>
                      </div>
                    ) : null}
                    <div className="stream-viewer-hero-foot">
                      {heroStatus ? (
                        <span className="stream-viewer-availability">
                          {isLive && (!heroTitle.launchWeek || heroTitle.launchWeek <= programWeek)
                            ? <Play size={13} fill="currentColor" />
                            : <Clock3 size={13} />}
                          {heroStatus}
                        </span>
                      ) : null}
                      {heroTitle.releasePattern ? (
                        <small>{formatReleasePattern(heroTitle.releasePattern)}</small>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <div className="stream-viewer-empty-hero">
                  <RadioTower size={30} />
                  <span>{isPrelaunch ? 'STOREFRONT IN PREPARATION' : 'PUBLIC CATALOG'}</span>
                  <h1>{platformName}</h1>
                  <p>
                    {isPrelaunch
                      ? 'Imported titles, signed license windows and announced Originals will appear here automatically.'
                      : 'No titles are currently available in the public catalog.'}
                  </p>
                </div>
              )}
            </section>

            {isLive && aftermath.available ? (
              <section className="stream-viewer-opening-story" aria-label="Opening week programming">
                <span><BadgeCheck size={14} /> OPENING WEEK</span>
                <strong>{aftermath.launchCommit?.openingOriginalTitle} leads the signal.</strong>
                <p>{availableNow.length} title{availableNow.length === 1 ? '' : 's'} available now • {comingNext.length} programmed next</p>
                <ChevronRight size={17} aria-hidden="true" />
              </section>
            ) : null}

            <div className="stream-viewer-rows">
              {isLive ? (
                <>
                  <TitleRow
                    id={`${ceoPanelId}-opening`}
                    eyebrow={`PROGRAM WEEK ${programWeek}`}
                    title="Top picks this week"
                    items={openingRow}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-new`}
                    eyebrow="FRESH ON THE SERVICE"
                    title="New this week"
                    items={newThisWeek}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-originals`}
                    eyebrow="ONLY HERE"
                    title={`${platformName} Originals`}
                    items={viewerData.originals}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-series`}
                    eyebrow="STORIES THAT KEEP MOVING"
                    title="Series to start"
                    items={seriesDiscovery}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-films`}
                    eyebrow="ONE-SITTING STORIES"
                    title="Films for tonight"
                    items={filmDiscovery}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-next`}
                    eyebrow="FROM YOUR LOCKED SLATE"
                    title="Coming next"
                    items={comingNext}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                </>
              ) : (
                <>
                  <TitleRow
                    id={`${ceoPanelId}-opening`}
                    eyebrow={platform.launchSlate ? `SLATE REVISION ${platform.launchSlate.revision}` : 'CANONICAL CATALOG'}
                    title={platform.launchSlate ? 'Opening lineup' : 'Your catalog'}
                    items={openingRow}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-originals`}
                    eyebrow="MADE FOR THIS PLATFORM"
                    title={`${platformName} Originals`}
                    items={originalsRow}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-owned`}
                    eyebrow="IMPORTED RIGHTS"
                    title="From your studios"
                    items={ownedRow}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                  <TitleRow
                    id={`${ceoPanelId}-licensed`}
                    eyebrow="ACTIVE WINDOWS"
                    title="Licensed collection"
                    items={licensedRow}
                    selectedKey={effectiveSelectedKey}
                    ceoLens={ceoLens}
                    isLive={isLive}
                    programWeek={programWeek}
                    onSelect={setSelectedKey}
                  />
                </>
              )}
              {!viewerData.all.length ? (
                <section className="stream-viewer-empty-row" aria-label="Empty storefront">
                  <span className="stream-viewer-empty-track" aria-hidden="true" />
                  <div>
                    <strong>No public title cards yet</strong>
                    <p>The preview only publishes canonical catalog imports, active licenses and real Original commissions.</p>
                  </div>
                </section>
              ) : null}
            </div>

            <footer className="stream-viewer-public-footer">
              <PlatformMark name={platformName} logoKey={logoKey} />
              <span>{isLive ? `Live service · Program week ${programWeek}` : 'Storefront preview · Managed from Streaming Hall'}</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
