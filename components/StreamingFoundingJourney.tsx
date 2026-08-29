import React, { useMemo, useState } from 'react';
import type {
  OwnedStreamingFoundingDraft,
  Player,
  StreamingBrandPromiseId,
  StreamingLogoKey,
  StreamingSoundIdentKey,
} from '../types';
import {
  claimStreamingLaunchEligibility,
  evaluateStreamingEligibility,
} from '../services/streamingEligibility';
import {
  incorporateOwnedStreamingPlatform,
  saveStreamingFoundingDraft,
  STREAMING_INCORPORATION_ECONOMY,
} from '../services/streamingFounding';
import { formatMoney } from '../services/formatUtils';
import {
  Brand,
  Mark,
  PROMISES,
  brandColor,
  hslHex,
} from './streaming-transplant/StreamingBrandVisuals';
import { WallOfScreens } from './streaming-transplant/StreamingWallExperience';
import { MachineWakesUp } from './streaming-transplant/StreamingCinematicsExperience';
import {
  DEFAULT_CONFIG,
  EpConfig,
  StreamingFoundingWizardScene,
} from './streaming-transplant/StreamingPrototypeOrchestrator';
import shellCss from './streaming-transplant/presentation/screens/Shell/Shell.module.css';
import { cx } from './streaming-transplant/presentation/cx';

type FoundingScene = 'WALL' | 'CASE' | 'WIZARD';

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onBack: () => void;
  onOpenHeadquarters: (destination?: 'HOME' | 'FINANCE') => void;
}

const PROMISE_TO_VISUAL: Record<StreamingBrandPromiseId, string> = {
  EVENT_HOUSE: 'EVENT',
  BINGE_MACHINE: 'BINGE',
  FANDOM_FOREVER: 'FANDOM',
  WORLD_STAGE: 'WORLD',
  EVERYONES_SCREEN: 'EVERYONE',
  TECHNOLOGY_FIRST: 'TECH',
  BALANCED: 'EVENT',
};

const VISUAL_TO_PROMISE: Record<string, StreamingBrandPromiseId> = {
  EVENT: 'EVENT_HOUSE',
  BINGE: 'BINGE_MACHINE',
  FANDOM: 'FANDOM_FOREVER',
  WORLD: 'WORLD_STAGE',
  EVERYONE: 'EVERYONES_SCREEN',
  TECH: 'TECHNOLOGY_FIRST',
  PRESTIGE: 'EVENT_HOUSE',
};

const LOGO_TO_VISUAL: Record<StreamingLogoKey, string> = {
  FRAME_PLAY: 'BOLT',
  SIGNAL_RING: 'ORBIT',
  SPOTLIGHT: 'APERTURE',
  WORDMARK: 'MONOLITH',
};

const VISUAL_TO_LOGO: Record<string, StreamingLogoKey> = {
  BOLT: 'FRAME_PLAY',
  PULSE: 'FRAME_PLAY',
  ORBIT: 'SIGNAL_RING',
  SIGNALTOWER: 'SIGNAL_RING',
  APERTURE: 'SPOTLIGHT',
  ECLIPSE: 'SPOTLIGHT',
  MONOLITH: 'WORDMARK',
  PRISM: 'WORDMARK',
  CROWN: 'WORDMARK',
  RIFT: 'WORDMARK',
};

const SOUND_TO_VISUAL: Record<StreamingSoundIdentKey, string> = {
  PULSE: 'PULSE',
  ASCENT: 'RISE',
  PREMIERE: 'ANTHEM',
  SILENT: 'HUSH',
  CHOIR: 'ANTHEM',
  MACHINE: 'PULSE',
  SPARK: 'RISE',
  IMPACT: 'PULSE',
  ORBIT: 'PULSE',
  BLOOM: 'RISE',
  PRISM: 'ANTHEM',
  EMBER: 'HUSH',
  SIGNAL: 'PULSE',
  HORIZON: 'RISE',
  ANALOG: 'HUSH',
};

const hexToHsl = (value: string): { hue: number; sat: number } => {
  const clean = value.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return { hue: 248, sat: 91 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const light = (max + min) / 2;
  const sat = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  return { hue: Math.round(hue), sat: Math.round(sat * 100) };
};

const brandFromPlayer = (player: Player): Brand => {
  const identity = player.ownedStreamingPlatform.identity;
  const draft = player.ownedStreamingPlatform.foundingDraft;
  const primary = identity?.primaryColor || draft?.primaryColor || '#6D5DFB';
  const secondary = identity?.secondaryColor || draft?.secondaryColor || '#111225';
  const main = hexToHsl(primary);
  const accent = hexToHsl(secondary);
  const sound = identity?.soundIdentKey || draft?.soundIdentKey || 'PULSE';
  const promise = identity?.brandPromiseId || draft?.brandPromiseId || 'BALANCED';
  const visualPromiseId = PROMISE_TO_VISUAL[promise];
  const logo = identity?.logoKey || draft?.logoKey || 'FRAME_PLAY';
  return {
    name: identity?.name || draft?.name || '',
    markId: identity?.visualMarkId || draft?.visualMarkId || LOGO_TO_VISUAL[logo],
    customMark: identity?.customMarkDataUrl || draft?.customMarkDataUrl || null,
    hue: main.hue,
    sat: Math.max(36, main.sat),
    identId: SOUND_TO_VISUAL[sound],
    customIdent: null,
    promiseId: visualPromiseId,
    publicManifesto: identity?.publicManifesto
      || draft?.publicManifesto
      || PROMISES.find(option => option.id === visualPromiseId)?.manifesto
      || 'Built for every kind of night.',
    layoutId: 'HERO_IMG',
    typeId: identity?.typefaceId || draft?.typefaceId || 'GROTESK',
    accentHue: accent.hue,
    identMode: sound === 'SILENT' ? 'none' : 'badge',
    identLen: 2,
    ratingId: 'TEEN',
    lockupId: identity?.wordmarkStyleId || draft?.wordmarkStyleId || 'SIDE',
    serverCity: identity?.launchServerCityId || draft?.launchServerCityId || null,
  };
};

const foundingConfig = (player: Player): EpConfig => {
  const eligibility = evaluateStreamingEligibility(player);
  const titles = [...player.pastProjects, ...player.activeReleases]
    .slice(-5)
    .reverse()
    .map((project, index) => ({
      id: String((project as any).id || `career-title-${index}`),
      name: String((project as any).title || (project as any).name || 'Untitled Project'),
      kind: String((project as any).projectType || 'Owned title'),
      heat: Math.max(45, 92 - index * 8),
    }));
  return {
    ...DEFAULT_CONFIG,
    playerName: player.name,
    defaultName: player.ownedStreamingPlatform.identity?.name || 'EMPIRE+',
    playerCash: player.money,
    avatarUrl: player.avatar || undefined,
    registrationFee: STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed,
    brandLegalFee: 0,
    infraDeposit: STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
    setupCost: STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed,
    openingTreasury: STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
    fixedIncorporationTotal: STREAMING_INCORPORATION_ECONOMY.cashRequired,
    unlockReqs: eligibility.metrics.map(metric => ({
      id: metric.id === 'LIQUID_CASH' ? 'cash' : metric.id === 'FAME' ? 'fame' : 'rep',
      label: metric.label,
      have: metric.current,
      need: metric.target,
      kind: metric.unit === 'MONEY' ? 'money' : 'stat',
    })),
    starterTitles: titles.length ? titles : DEFAULT_CONFIG.starterTitles,
  };
};

export default function StreamingFoundingJourney({
  player,
  onUpdatePlayer,
  onBack,
  onOpenHeadquarters,
}: Props) {
  const platform = player.ownedStreamingPlatform;
  const [scene, setScene] = useState<FoundingScene>('WALL');
  const [workingPlayer, setWorkingPlayer] = useState(player);
  const [brand, setBrand] = useState<Brand>(() => brandFromPlayer(player));
  const config = useMemo(() => foundingConfig(workingPlayer), [workingPlayer]);
  const eligibility = useMemo(() => evaluateStreamingEligibility(workingPlayer), [workingPlayer]);
  const incorporated = Boolean(platform.identity && platform.foundingProfile);

  const persist = (nextPlayer: Player) => {
    setWorkingPlayer(nextPlayer);
    onUpdatePlayer?.(nextPlayer);
  };

  const enterFromWall = () => {
    const current = workingPlayer.ownedStreamingPlatform;
    if (current.identity && current.foundingProfile) {
      onOpenHeadquarters('HOME');
      return;
    }
    if (current.lifecycle === 'LOCKED') {
      const clearance = claimStreamingLaunchEligibility(workingPlayer);
      if (!clearance.changed) return;
      persist(clearance.player);
    }
    setScene('CASE');
  };

  const incorporate = () => {
    const primaryColor = hslHex(brand.hue, brand.sat, 58);
    const secondaryColor = hslHex(brand.accentHue, Math.max(30, brand.sat - 16), 18);
    const foundingDraft: OwnedStreamingFoundingDraft = {
      currentStep: 2,
      name: brand.name.trim() || config.defaultName,
      logoKey: VISUAL_TO_LOGO[brand.markId] || 'FRAME_PLAY',
      primaryColor,
      secondaryColor,
      visualMarkId: brand.markId,
      customMarkDataUrl: brand.customMark,
      wordmarkStyleId: brand.lockupId as OwnedStreamingFoundingDraft['wordmarkStyleId'],
      typefaceId: brand.typeId as OwnedStreamingFoundingDraft['typefaceId'],
      brandPromiseId: VISUAL_TO_PROMISE[brand.promiseId] || 'BALANCED',
      publicManifesto: brand.publicManifesto,
      updatedAtAbsoluteWeek: 0,
    };
    const withDraft = saveStreamingFoundingDraft(workingPlayer, foundingDraft);
    const result = incorporateOwnedStreamingPlatform(withDraft);
    if (!result.changed) return;

    persist(result.player);
    onOpenHeadquarters('FINANCE');
  };

  const liveBrand = brand.name.trim() ? brand : { ...brand, name: config.defaultName };
  const claimedIdentity = workingPlayer.ownedStreamingPlatform.identity;
  const claimedBrand = claimedIdentity ? brandFromPlayer(workingPlayer) : liveBrand;
  return (
    <div
      className={cx(shellCss.ep2, 'streaming-complete-foundation')}
      style={{
        '--epx-ep2-brand': brandColor(liveBrand),
        '--epx-ep2-brand2': `hsl(${liveBrand.hue} ${Math.max(24, liveBrand.sat - 18)}% 22%)`,
      } as React.CSSProperties}
    >
      {scene === 'WALL' ? (
        <WallOfScreens
          playerName={workingPlayer.name}
          avatarUrl={workingPlayer.avatar || undefined}
          rivals={config.rivals}
          requirements={eligibility.metrics.map(metric => ({
            id: metric.id,
            label: metric.label,
            have: metric.current,
            need: metric.target,
            fmt: metric.unit === 'MONEY' ? formatMoney : value => String(Math.round(value)),
          }))}
          setupCost={formatMoney(STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed)}
          treasury={formatMoney(STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash)}
          totalCost={formatMoney(STREAMING_INCORPORATION_ECONOMY.cashRequired)}
          claimed={incorporated ? {
            mark: <Mark brand={claimedBrand} />,
            name: claimedIdentity?.name || 'EMPIRE+',
            color: brandColor(claimedBrand),
          } : undefined}
          onEnter={enterFromWall}
          onClose={onBack}
        />
      ) : null}

      {scene === 'CASE' ? (
        <MachineWakesUp
          playerName={workingPlayer.name}
          totalCost={formatMoney(STREAMING_INCORPORATION_ECONOMY.cashRequired)}
          applicant={{
            name: workingPlayer.name,
            avatarUrl: workingPlayer.avatar || undefined,
            fame: workingPlayer.stats.fame,
            reputation: workingPlayer.stats.reputation,
            liquid: formatMoney(workingPlayer.money),
            credits: config.starterTitles.slice(0, 3).map(title => title.name),
          }}
          onDone={() => setScene('WIZARD')}
        />
      ) : null}

      {scene === 'WIZARD' ? (
        <StreamingFoundingWizardScene
          cfg={config}
          brand={brand}
          setBrand={setBrand}
          onIncorporate={incorporate}
          onBack={() => setScene('WALL')}
        />
      ) : null}

    </div>
  );
}
