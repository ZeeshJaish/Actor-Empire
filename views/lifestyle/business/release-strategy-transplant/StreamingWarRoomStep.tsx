import React from 'react';
import type { StreamingBiddingSession, StreamingOfferVersion } from '../../../../types';
import { advanceStreamingBiddingSession, getStreamingBiddingClosingOffers } from '../../../../services/streamingBidding';
import { formatStreamingBiddingRightsLotScope } from '../../../../services/streamingRightsCompatibility';
import { FilmSheet } from './FilmSheet';
import type { ReleaseFilmArt } from './model';
import css from './ReleaseStrategy.module.css';

export interface WarMarketPlatform {
  id: string;
  name: string;
  color: string;
}

const money = (value: number) => value >= 1_000_000_000
  ? `$${(value / 1_000_000_000).toFixed(2)}B`
  : value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}M`
    : `$${Math.round(value / 1_000)}k`;

const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');
export const getStreamingOfferScopeLabel = (exclusivity: 'EXCLUSIVE' | 'NON_EXCLUSIVE'): string => (
  exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'SHARED'
);
const totalValue = (offer: StreamingOfferVersion) => Math.max(offer.fixedExposure, offer.expectedTotalCost);
const certainValue = (offer: StreamingOfferVersion) => Math.max(
  offer.fixedExposure,
  offer.minimumGuarantee + offer.productionFunding + offer.futureSeasonFunding,
);

const eventCopy = (session: StreamingBiddingSession, event: StreamingBiddingSession['events'][number]) => {
  const platform = session.platformStates.find(state => state.platformId === event.platformId)?.platformName || 'The room';
  if (event.type === 'PITCHED' || event.type === 'OPENED') return `${platform} put terms on the table.`;
  if (event.type === 'REVISED') return `${platform} improved its contract.`;
  if (event.type === 'FINAL') return `${platform} marked its contract final.`;
  if (event.type === 'WITHDREW') return `${platform} left the room.`;
  if (event.type === 'CLOSED') return 'The live floor closed.';
  return `${platform} updated the table.`;
};

const OfferTerms: React.FC<{ offer: StreamingOfferVersion; scope: string }> = ({ offer, scope }) => (
  <div className={css.warTerms}>
    <span><em>GUARANTEE</em><b>{money(offer.minimumGuarantee)}</b></span>
    <span><em>ESTIMATED TOTAL</em><b>{money(totalValue(offer))}</b></span>
    <span><em>BACKEND RATE</em><b>{offer.licensorRevenueShare}%</b></span>
    <span><em>FORECAST BACKEND</em><b>{money(Math.max(0, totalValue(offer) - certainValue(offer)))}</b></span>
    <span><em>TERM</em><b>{offer.durationWeeks} weeks</b></span>
    <span><em>RIGHTS</em><b>{scope}</b></span>
    <span><em>EXCLUSIVITY</em><b>{offer.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</b></span>
    <span><em>PREMIERE</em><b>Week {offer.proposedPremiereAbsoluteWeek ? ((offer.proposedPremiereAbsoluteWeek - 1) % 52) + 1 : 'TBA'}</b></span>
    <span><em>LOCALIZATION</em><b>{offer.localization === 'DUBS_AND_SUBTITLES' ? 'Dubs + subs' : offer.localization === 'SUBTITLES' ? 'Subtitles' : 'None'}</b></span>
  </div>
);

interface StreamingWarRoomStepProps {
  film: ReleaseFilmArt;
  session: StreamingBiddingSession | null;
  marketPlatforms: WarMarketPlatform[];
  canAccept: boolean;
  energyCost: number;
  onStart: () => void;
  onSessionChange: (session: StreamingBiddingSession) => void;
  onAccept: (offer: StreamingOfferVersion, session: StreamingBiddingSession) => void;
  onFinish: () => void;
  onContinue: () => void;
  onLeave: () => void;
  onBack: () => void;
  preflightMessage?: string | null;
  canStart?: boolean;
  commissionedPremiere?: { platformName: string; platformFunding: number; studioCashAtRisk: number } | null;
  onConfirmPremiere?: () => void;
}

export const StreamingWarRoomStep: React.FC<StreamingWarRoomStepProps> = ({
  film, session, marketPlatforms, canAccept, energyCost, onStart, onSessionChange,
  onAccept, onFinish, onContinue, onLeave, onBack, preflightMessage, canStart = true,
  commissionedPremiere, onConfirmPremiere,
}) => {
  const [opening, setOpening] = React.useState(false);
  const [openOfferId, setOpenOfferId] = React.useState<string | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  const startTimerRef = React.useRef<number | null>(null);
  const latestSessionRef = React.useRef(session);
  const onSessionChangeRef = React.useRef(onSessionChange);
  latestSessionRef.current = session;
  onSessionChangeRef.current = onSessionChange;

  React.useEffect(() => () => {
    if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
  }, []);

  React.useEffect(() => {
    if (!session || !opening) return undefined;
    const timer = window.setTimeout(() => setOpening(false), 1_050);
    return () => window.clearTimeout(timer);
  }, [opening, session?.id]);

  React.useEffect(() => {
    if (!session || session.status !== 'LIVE') return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const current = latestSessionRef.current;
      if (current?.status === 'LIVE') onSessionChangeRef.current(advanceStreamingBiddingSession(current, 1));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [session?.id, session?.status]);

  const beginRoom = () => {
    if (!canStart || opening) return;
    setOpening(true);
    startTimerRef.current = window.setTimeout(onStart, 420);
  };

  if (commissionedPremiere) return (
    <section className={join(css.war, css.warGate)} data-war-room>
      <header className={css.warGateTop}>
        <button type="button" className={css.warGateBack} onClick={onBack} aria-label="Go back">←</button>
        <span>COMMISSIONED SEASON</span>
      </header>
      <div className={css.warPremiere}>
        <span>PLATFORM PREMIERE</span>
        <h2>{commissionedPremiere.platformName}</h2>
        <p>This platform funded the production. Confirmation creates no second rights fee.</p>
        <div><em><b>{money(commissionedPremiere.platformFunding)}</b>platform covered</em><em><b>{money(commissionedPremiere.studioCashAtRisk)}</b>studio at risk</em></div>
      </div>
      <footer className={css.warGateFoot}>
        <button type="button" className={join(css.warGateGo, !canAccept && css.dead)} disabled={!canAccept} onClick={onConfirmPremiere}>
          {canAccept ? `CONFIRM PREMIERE · ${energyCost}E` : `NEED ${energyCost}E`}
        </button>
      </footer>
    </section>
  );

  if (!session) {
    const lanes = [0, 1, 2].map(index => marketPlatforms.map((_, platformIndex) => (
      marketPlatforms[(platformIndex + index * 2) % marketPlatforms.length]
    )).filter(Boolean));
    return (
      <section className={join(css.war, css.warGate)} data-war-room>
        <header className={css.warGateTop}>
          <button type="button" className={css.warGateBack} onClick={onBack} aria-label="Go back">←</button>
          <span>RIGHTS FLOOR</span>
        </header>
        <div className={css.warGateScroll}>
          <div className={css.warLot}>
            <div className={css.warLotArt} style={{ '--sh': String(film.hue) } as React.CSSProperties}><i /><FilmSheet film={film} size="md" /></div>
            <div className={css.warLotSide}>
              <span>LOT 01 · ON OFFER</span>
              <h2>{film.title}</h2>
              <p>Worldwide streaming rights. Exclusive, first window.</p>
              <div><em>WORLDWIDE</em><em>EXCLUSIVE</em><em>FIRST WINDOW</em></div>
            </div>
          </div>

          <div className={css.warMarket}>
            <span>OUTSIDE THE DOOR</span>
            {lanes.map((lane, laneIndex) => <div className={css.warLane} key={laneIndex}>
              <div className={join(css.warLaneRun, laneIndex % 2 === 1 && css.warLaneBack)} style={{ '--dur': `${Math.max(15, lane.length * 6)}s` } as React.CSSProperties}>
                {[0, 1].map(copy => <div className={css.warLaneHalf} key={copy} aria-hidden={copy === 1}>
                  {lane.map(platform => <b key={platform.id} style={{ '--pf': platform.color } as React.CSSProperties}>{platform.name}</b>)}
                </div>)}
              </div>
            </div>)}
            <p>Every active service in your market has read it. Which of them walks in is revealed when the doors open.</p>
          </div>

          <div className={css.warClockGuide}>
            <span>THE CLOCK</span>
            <div className={css.warClockGuideTrack}><i /><em className={css.warClockOpen}>OPENS 15s</em><em className={css.warClockClose}>45s</em><b>+4</b></div>
            <div className={css.warClockRules}>
              <em><b>15s</b>on the clock when the doors open</em>
              <em><b>+4s</b>back on it when a material offer improves</em>
              <em><b>45s</b>hard close — nothing runs past it</em>
            </div>
            <p><b>6s</b> No platform may improve its own offer twice inside six seconds.</p>
          </div>
          <p className={css.warGateWarn}>{preflightMessage || 'Take any standing contract at any moment, or let the room close and keep whatever is still on the table. Walk out and every offer dies with you.'}</p>
        </div>
        <footer className={css.warGateFoot}>
          <button type="button" className={join(css.warGateGo, opening && css.warGoing, !canStart && css.dead)} disabled={!canStart || opening} onClick={beginRoom}>
            {!canStart ? 'NO ELIGIBLE MARKET' : opening ? 'THE DOORS ARE OPENING' : 'OPEN THE ROOM'}
          </button>
        </footer>
      </section>
    );
  }

  if (opening) return (
    <section className={join(css.war, css.warThreshold)} data-war-room aria-live="polite">
      <span>TAKING THEIR SEATS</span>
      <div>{session.platformStates.map((platform, index) => <b key={platform.platformId} style={{ '--pf': platform.color, animationDelay: `${index * 110}ms` } as React.CSSProperties}>{platform.platformName}</b>)}</div>
      <em style={{ animationDelay: `${session.platformStates.length * 110 + 160}ms` }}>{session.platformStates.length} platforms came</em>
    </section>
  );

  const acceptedOffers = session.offers.filter(offer => offer.status === 'ACCEPTED');
  const acceptedTotal = acceptedOffers.reduce((sum, offer) => sum + offer.minimumGuarantee, 0);
  const acceptedScope = formatStreamingBiddingRightsLotScope(session.rightsLot);

  if (session.status === 'ACCEPTED' && acceptedOffers.length > 0) return (
    <section className={join(css.war, css.warSigned)} data-war-room>
      <header className={css.warRoomTop}>
        <button type="button" className={css.warRoomBack} onClick={onBack} aria-label="Review distribution">←</button>
        <div><b>{session.title}</b><span>LICENSING COMPLETE</span></div>
        <strong>✓</strong>
      </header>
      <div className={css.warScroll}>
        <div className={css.warSignedHero}>
          <span>SIGNED STREAMING DEALS</span>
          <h2>{acceptedOffers.length === 1 ? acceptedOffers[0].platformName : `${acceptedOffers.length} PLATFORM RELEASE`}</h2>
          <b>{money(acceptedTotal)} guaranteed</b>
          <p>{acceptedOffers.length > 1 ? 'Shared rights are locked across every signed platform.' : 'The streaming contract is signed and locked.'}</p>
        </div>
        <div className={css.warSignedBook}>
          {acceptedOffers.map(offer => <article key={offer.id} style={{ '--pf': session.platformStates.find(platform => platform.platformId === offer.platformId)?.color || '#6fc9ff' } as React.CSSProperties}>
            <header><strong>{offer.platformName}</strong><em>{offer.exclusivity === 'NON_EXCLUSIVE' ? 'SHARED · CO-STREAMS' : 'EXCLUSIVE · SOLE HOME'}</em></header>
            <div><span><i>GUARANTEE</i><b>{money(offer.minimumGuarantee)}</b></span><span><i>BACKEND</i><b>{offer.licensorRevenueShare}%</b></span></div>
            <p>{acceptedScope} · {offer.durationWeeks} weeks · premieres W{offer.proposedPremiereAbsoluteWeek ? ((offer.proposedPremiereAbsoluteWeek - 1) % 52) + 1 : 'TBA'}</p>
          </article>)}
        </div>
      </div>
      <footer className={css.warGateFoot}>
        <button type="button" className={css.warGateGo} onClick={onContinue}>RETURN TO CAMPAIGN</button>
      </footer>
    </section>
  );

  const offers = getStreamingBiddingClosingOffers(session).sort((left, right) => totalValue(right) - totalValue(left));
  const leader = offers[0] || null;
  const bestValue = Math.max(1, ...offers.map(totalValue));
  const scope = formatStreamingBiddingRightsLotScope(session.rightsLot);
  const closed = session.status !== 'LIVE';
  const live = session.platformStates.filter(platform => platform.status === 'WAITING' || platform.status === 'RESPONDING').length;
  const progress = Math.max(0, Math.min(100, session.roomSecondsRemaining / 45 * 100));

  return (
    <section className={css.war} data-war-room>
      <header className={css.warRoomTop}>
        <button type="button" className={css.warRoomBack} onClick={() => setLeaving(true)} aria-label="Leave the room">←</button>
        <div><b>{session.title}</b><span>{acceptedOffers.length > 0 ? `SHARED LICENSING · ${acceptedOffers.length}/3 SIGNED` : closed ? 'ROOM CLOSED — OFFERS STAND' : `${live} STILL BIDDING`}</span></div>
        <strong className={session.roomSecondsRemaining <= 8 && !closed ? css.warUrgent : ''}>{closed ? '—' : `${session.roomSecondsRemaining}s`}</strong>
      </header>
      <div className={css.warDrain}><i style={{ width: `${closed ? 0 : progress}%` }} /></div>

      <div className={css.warScroll}>
        {acceptedOffers.length > 0 && <section className={css.warAccepted}>
          <span>{acceptedOffers.length} SIGNED · SHARED RIGHTS</span>
          <div>{acceptedOffers.map(offer => <b key={offer.id}>{offer.platformName}<em>{money(offer.minimumGuarantee)}</em></b>)}</div>
          <p>You can sign more compatible shared offers, or finish licensing with the deals already locked.</p>
          <button type="button" onClick={onFinish}>FINISH LICENSING</button>
        </section>}
        {leader && <section className={css.warBest} style={{ '--pf': session.platformStates.find(platform => platform.platformId === leader.platformId)?.color || '#6fc9ff' } as React.CSSProperties}>
          <span>BEST ESTIMATED DEAL VALUE</span>
          <b>{money(totalValue(leader))}</b>
          <div><strong>{leader.platformName}</strong><em>{leader.exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE · CLOSES ROOM' : 'SHARED · UP TO 3'}</em><em>{money(certainValue(leader))} guaranteed now</em><em>{leader.licensorRevenueShare}% forecast backend</em></div>
          <p>{closed ? 'The room has closed.' : `${leader.platformName} is leading.`}</p>
        </section>}

        <div className={css.warStanding}><span>STANDING OFFERS <b>{offers.length}</b></span><p>Ranked by estimated total value: guaranteed money plus forecast backend. Tap a row for exact terms.</p></div>
        <div className={css.warBook}>
          {offers.map((offer, index) => {
            const platform = session.platformStates.find(state => state.platformId === offer.platformId);
            const color = platform?.color || '#6fc9ff';
            const certain = certainValue(offer);
            const expected = Math.max(0, totalValue(offer) - certain);
            const expanded = openOfferId === offer.id;
            return <article key={offer.id} className={join(css.warOfferRow, index === 0 && css.warLeader, expanded && css.warPicked)} style={{ '--pf': color } as React.CSSProperties}>
              <em className={css.warOfferStamp} data-offer-scope-stamp>{getStreamingOfferScopeLabel(offer.exclusivity)}</em>
              <div className={css.warOfferLine}>
                <button type="button" className={css.warOfferHead} aria-label={`${offer.platformName} offer details`} onClick={() => setOpenOfferId(expanded ? null : offer.id)}>
                  <i>{index + 1}</i>
                  <span><strong>{offer.platformName}</strong><small>{money(offer.minimumGuarantee)} guaranteed · {offer.licensorRevenueShare}% backend</small></span>
                  <b data-offer-estimated-total><small>EST. TOTAL</small>{money(totalValue(offer))}</b>
                </button>
                <button
                  type="button"
                  className={css.warTake}
                  aria-label={`TAKE ${getStreamingOfferScopeLabel(offer.exclusivity)} OFFER FROM ${offer.platformName}`}
                  disabled={!canAccept || session.status === 'LEFT'}
                  onClick={() => onAccept(offer, session)}
                >
                  {canAccept ? 'TAKE' : `NEED ${energyCost}E`}<i>{money(certain)} now · {energyCost}E</i>
                </button>
              </div>
              <div className={css.warValueBar}><i style={{ width: `${Math.max(0, certain / bestValue * 100)}%` }} /><em style={{ width: `${Math.max(0, expected / bestValue * 100)}%` }} /></div>
              {expanded && <OfferTerms offer={offer} scope={scope} />}
            </article>;
          })}
          {offers.length === 0 && <p className={css.empty}>The first contracts have not landed yet.</p>}
        </div>

        <aside className={css.warTape}>
          <header><span>ROOM TAPE</span><b>{session.events.length}</b></header>
          <div>{[...session.events].reverse().slice(0, 8).map(event => <p key={event.id}><i>{String(event.activeSecond).padStart(2, '0')}s</i><span>{eventCopy(session, event)}</span></p>)}{session.events.length === 0 && <em>The room is holding on final terms.</em>}</div>
        </aside>
        {closed && session.status !== 'LEFT' && acceptedOffers.length === 0 && <button type="button" className={css.warWalkButton} onClick={() => setLeaving(true)}>LEAVE UNSIGNED</button>}
      </div>

      {leaving && <div className={css.warLeaveWrap}>
        <div className={css.warLeave}>
          <b>{acceptedOffers.length > 0 ? 'Finish licensing?' : 'Walk out?'}</b>
          <p>{acceptedOffers.length > 0 ? 'Your signed deals stay locked. Every unsigned offer will expire.' : 'Every standing contract in this room will die with you.'}</p>
          <div><button type="button" onClick={() => setLeaving(false)}>{acceptedOffers.length > 0 ? 'KEEP NEGOTIATING' : 'STAY IN THE ROOM'}</button><button type="button" onClick={acceptedOffers.length > 0 ? onFinish : onLeave}>{acceptedOffers.length > 0 ? 'FINISH LICENSING' : 'WALK OUT'}</button></div>
        </div>
      </div>}
    </section>
  );
};
