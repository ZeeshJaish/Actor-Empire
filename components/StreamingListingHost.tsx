/**
 * #188 (plan §22.3 point 12): the listing's own host. MARKETS replaced the old Public markets desk, so the listing
 * moved out of it: MARKETS' Ring the bell starts it (`beginStreamingListing`: 25⚡, or a listing under way resumes
 * for nothing) and opens its five chapters here; when the bell rings, public life lands on MARKETS.
 */
import { streamingTickerProblem } from '../services/streamingTicker';
import { useMemo, useState } from 'react';
import type { Gender, Player } from '../types';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import {
  checkpointStreamingCinematicIpoJourney,
  commitStreamingCinematicIpo,
  getStreamingPublicMarkets,
  startStreamingCinematicIpoJourney,
} from '../services/streamingPublicMarkets';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { resolveStreamingPlatformTechDebt } from '../services/streamingTechTreeCatalogue';
import { streamingExecutiveGender } from '../services/team/streamingTeam';
import { findIndustryInvestor, getIndustryPeople } from '../services/industry/industryPeople';
import AccessibleDialog from './AccessibleDialog';
import {
  Listing as StreamingListingExperience,
  sharesForFloat,
  type StreamingListingCheckpoint,
} from './streaming-transplant/StreamingListingExperience';
import type { Brand as StreamingPresentationBrand } from './streaming-transplant/StreamingBrandVisuals';
import type { StreamingIpoPresentationResult } from './streaming-transplant/streamingIpoPresentationModel';
import '../styles/streaming-listing-host.css';

/** the float the listing opens on; #189: the ask's own dial sets the real one (10–30%) */
const OPENING_FLOAT = 20;

/** the opening share count: the company's value in $10 shares, and the opening float as new shares on top */
const openingShares = (valuation: number) => {
  const preIpoShares = Math.max(5_000_000, Math.min(500_000_000, Math.round(valuation / 10 / 250_000) * 250_000));
  return { preIpoShares, initialNewShares: sharesForFloat(preIpoShares, OPENING_FLOAT) };
};

/** #189: the independent directors the table seats when the board has none of its own yet */
const STANDING_DIRECTORS: Record<string, Gender> = {
  'Helena Brandt': 'FEMALE', 'Alan Wray': 'MALE', 'Yusuf Karim': 'MALE', 'Nomi Reisz': 'FEMALE',
  /* the game's own independent directors (STREAMING_INDEPENDENT_DIRECTORS) */
  'Meera Sen': 'FEMALE', 'Thomas Adebayo': 'MALE', 'Lucia Reyes': 'FEMALE',
};

/** Ring the bell: start the listing (25⚡), or resume the one under way for nothing */
export const beginStreamingListing = (player: Player): { ok: boolean; player: Player; message?: string } => {
  if (player.ownedStreamingPlatform?.publicCompany?.ipoJourney?.status === 'ACTIVE') return { ok: true, player };
  const view = getStreamingPublicMarkets(player);
  const started = startStreamingCinematicIpoJourney(player, {
    ticker: view.suggestedTicker,
    ask: view.valuation,
    shares: openingShares(view.valuation).initialNewShares,
  });
  return started.changed ? { ok: true, player: started.player } : { ok: false, player, message: started.reason || 'The listing could not begin.' };
};

const hexToBrandTone = (hex: string | undefined) => {
  const source = /^#[0-9a-f]{6}$/i.test(hex || '') ? (hex as string).slice(1) : '21c7d9';
  const red = parseInt(source.slice(0, 2), 16) / 255;
  const green = parseInt(source.slice(2, 4), 16) / 255;
  const blue = parseInt(source.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const light = (maximum + minimum) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  return { hue: Math.round(hue), saturation: Math.round(Math.max(40, saturation * 100)) };
};

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  /** the bell rang: the company is public */
  onListed: () => void;
}

export default function StreamingListingHost({ player, onUpdatePlayer, onClose, onListed }: Props) {
  const platform = player.ownedStreamingPlatform;
  /* the company does not change while the listing is open, only its checkpoint does: read it once a week, not on every save of the dial */
  const view = useMemo(() => getStreamingPublicMarkets(player), [player.age, player.currentWeek]); // eslint-disable-line react-hooks/exhaustive-deps
  const [failure, setFailure] = useState<string | null>(null);

  const checkpointListing = (checkpoint: StreamingListingCheckpoint) => {
    const saved = checkpointStreamingCinematicIpoJourney(player, checkpoint);
    if (saved.changed) onUpdatePlayer(saved.player);
  };

  const presentationBrand = useMemo<StreamingPresentationBrand>(() => {
    const primary = hexToBrandTone(platform.identity?.primaryColor);
    const secondary = hexToBrandTone(platform.identity?.secondaryColor);
    const markId = platform.identity?.logoKey === 'SIGNAL_RING' ? 'ORBIT'
      : platform.identity?.logoKey === 'SPOTLIGHT' ? 'APERTURE'
        : platform.identity?.logoKey === 'WORDMARK' ? 'LETTER_SOLID' : 'BOLT';
    const identId = platform.identity?.soundIdentKey === 'ASCENT' ? 'RISE'
      : platform.identity?.soundIdentKey === 'PREMIERE' ? 'FANFARE' : 'PULSE';
    return {
      name: platform.identity?.name || 'EMPIRE+',
      markId,
      customMark: null,
      hue: primary.hue,
      sat: primary.saturation,
      identId,
      customIdent: null,
      promiseId: 'EVENT',
      layoutId: 'HERO_IMG',
      typeId: 'GROTESK',
      accentHue: secondary.hue,
      identMode: platform.identity?.soundIdentKey === 'SILENT' ? 'none' : 'full',
      identLen: 2,
      ratingId: 'TEEN',
      lockupId: 'SIDE',
      serverCity: null,
    };
  }, [platform.identity, platform.infrastructureSetup]);

  const ipoPresentationInputs = useMemo(() => {
    const latest = platform.weeklyHistory.at(-1);
    const appointments = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const executiveName = (role: string) => appointments.find(item => item.role === role)?.nameAtAppointment;
    const { preIpoShares, initialNewShares } = openingShares(view.valuation);
    const technicalDebt = Math.round(resolveStreamingPlatformTechDebt(platform));
    const peakLoad = latest?.operations?.capacityUtilizationPercent || 0;
    const weeklyNet = latest?.operations?.netCashContribution || 0;
    const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    return {
      founderName: player.name,
      founderPct: platform.founderOwnershipPercent,
      subscribers: platform.metrics.subscribers,
      arpu: Math.max(0.01, platform.metrics.averageRevenuePerUser),
      churnPct: platform.metrics.churnRate * 100,
      peakLoad,
      techDebt: technicalDebt,
      weeklyNet,
      treasury: platform.treasuryCash,
      checks: view.readiness.map(item => ({ id: item.id, label: item.label, ok: item.passed, note: item.passed ? item.value : item.requirement })),
      risks: [
        ...(peakLoad >= 85 ? [{ id: 'capacity', label: 'Capacity concentration', detail: `Peak demand used ${peakLoad.toFixed(0)}% of burst capacity.`, cost: 0.05 }] : []),
        ...(technicalDebt > 0 ? [{ id: 'technical-debt', label: 'Carried technical debt', detail: `${technicalDebt} technical-debt points remain in the delivery stack.`, cost: 0.04 }] : []),
        ...(platform.metrics.churnRate >= 0.035 ? [{ id: 'churn', label: 'Subscriber churn pressure', detail: `${(platform.metrics.churnRate * 100).toFixed(1)}% of members left in the latest measured week.`, cost: 0.05 }] : []),
        ...(platform.catalogLicenses.some(item => item.status === 'ACTIVE') ? [{ id: 'rights', label: 'Reliance on licensed catalogue', detail: 'Material viewing still depends on time-limited external rights.', cost: 0.04 }] : []),
      ],
      rivals: platform.competitiveWorld.rivals.map(item => item.platformName),
      executiveNames: {
        cfo: executiveName('CFO'),
        cto: executiveName('CTO'),
        coo: executiveName('COO'),
      },
      boardSeats: [
        { id: 'founder', name: player.name, kind: 'FOUNDER · CHAIR' },
        ...activeDirectors.map(item => ({ id: item.id, name: item.name, kind: item.seatType.replace(/_/g, ' ') })),
      ],
      preIpoShares,
      initialNewShares,
      simulationSeed: platform.simulationSeed,
      absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
      fairValue: view.valuation,
      /* #189: the faces at the table */
      people: (() => {
        const people: Record<string, { gender?: Gender | null; avatar?: string | null }> = { ...Object.fromEntries(Object.entries(STANDING_DIRECTORS).map(([name, gender]) => [name, { gender }])) };
        const industry = getIndustryPeople(player);
        for (const director of activeDirectors) {
          /* an investor's nominee sits with the investor's face */
          const investor = findIndustryInvestor(player, director.name.replace(/ nominee$/, ''));
          const person = industry.find(item => item.name === director.name);
          if (investor || person) people[director.name] = { gender: investor ? (investor.person ? investor.gender : null) : person?.gender ?? null };
        }
        for (const appointment of appointments) people[appointment.nameAtAppointment] = { gender: streamingExecutiveGender(player, appointment.executiveId) };
        people[player.name] = { gender: player.gender, avatar: player.avatar || null };
        return people;
      })(),
    };
  }, [player.age, player.currentWeek, player.name, view.readiness, view.valuation]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishListing = (result: StreamingIpoPresentationResult) => {
    const committed = commitStreamingCinematicIpo(player, {
      ticker: result.ticker,
      narrative: 'AUDIENCE_SCALE',
      price: result.price,
      preIpoShares: result.preIpoShares,
      newShares: result.newShares,
      employeeQuotaPercent: result.employeeQuotaPercent,
      underwriterId: result.bankId,
      underwriterName: result.bank,
      firmBook: result.firmBook,
      bookCoverage: result.coverage,
      anchorDiscountAccepted: result.anchorDiscountAccepted,
      governanceMarks: result.marks.map(mark => mark.short),
      diligenceWeeks: result.diligenceWeeks,
      regulatorAttempts: result.regulatorAttempts,
    });
    if (!committed.changed) {
      setFailure(committed.reason || 'The listing could not be completed.');
      return;
    }
    /* the bell already rang inside the listing: its scene is seen */
    const queuedListing = [...committed.player.ownedStreamingPlatform.cinematicQueue].reverse()
      .find(event => event.type === 'IPO_LISTING' && event.status === 'QUEUED');
    onUpdatePlayer(queuedListing ? {
      ...committed.player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(committed.player.ownedStreamingPlatform, queuedListing.id, 'VIEWED'),
    } : committed.player);
    onListed();
  };

  return (
    <AccessibleDialog className="lh-backdrop" role="dialog" aria-label="The listing" onEscape={onClose}>
      <section className="lh-stage">
        {failure ? (
          <div className="lh-failure" role="alert">
            <span>THE LISTING</span>
            <b>{failure}</b>
            <button type="button" onClick={onClose}>Back to MARKETS</button>
          </div>
        ) : (
          <StreamingListingExperience
            brand={presentationBrand}
            inputs={ipoPresentationInputs}
            initialCheckpoint={platform.publicCompany.ipoJourney as StreamingListingCheckpoint | null}
            onCheckpoint={checkpointListing}
            tickerProblem={ticker => streamingTickerProblem(player, ticker)}
            onBack={onClose}
            onDone={finishListing}
          />
        )}
      </section>
    </AccessibleDialog>
  );
}
