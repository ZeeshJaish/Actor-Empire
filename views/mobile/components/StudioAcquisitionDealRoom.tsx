/**
 * ACTOR EMPIRE — STUDIO ACQUISITION: "THE DEAL ROOM" (React + TypeScript)
 *
 * Cinematic redesign of views/mobile/components/StudioAcquisitionDesk.tsx.
 * Scene flow:
 *   DOSSIER (classified folder + due-diligence redaction reveal)
 *   → WAR ROOM (offer dial + live seller-posture gauge + clause cards + funding vaults)
 *   → ENVELOPE (offer sealed & filed cutscene)
 *   → BREAKING (press interstitial for the seller's decision)
 *   → RESPONSE (counter / rival bid / accepted / rejected negotiation scenes)
 *   → CLOSING (stamp the 3 closing documents)
 *   → SIGNING (4-page contract ceremony, ink signature, notary slam)
 *   → ACQUIRED (studio gates cutscene + operating model pick)
 *
 * Self-contained: no Tailwind, no icon lib, no CDN. All CSS lives in the
 * STYLE constant (the game's existing <style>{STYLE}</style> pattern),
 * prefixed `sa-` so nothing clashes.
 *
 * WIRING NOTES (services/studioAcquisition.ts):
 *  - Posture gauge      → analyzeCustomOffer() posture (the demo recomputes it
 *                         locally from offer/reference ratio with the same bands)
 *  - Funding vaults     → getFundingOptions() (balance, remaining, compliance band)
 *  - Clause cards       → getAcquisitionCommitments()
 *  - File the Offer     → submitOpeningOffer() (energy = ACQUISITION_STRATEGY_ACTION)
 *  - Seller decision    → resolveStudioAcquisitionResponses() posts it to the inbox;
 *                         open this flow at the BREAKING scene with the real decision.
 *                         The demo's `decideSeller()` is a stand-in ONLY.
 *  - Accept / Revise /
 *    Beat rival / Walk  → acceptAcquisitionCounter / reviseAcquisitionOffer /
 *                         beatAcquisitionRivalBid / walkAwayFromAcquisition
 *  - Tap to sign        → completeAcquisitionTransaction() (energy = STUDIO_ACQUISITION_SIGNING)
 *  - Operating model    → setSubsidiaryOperatingModel() (IDs match SubsidiaryOperatingModel)
 *  - Requirement blocks → keep the game's requirement prompts; surface them with
 *                         the `sa-block` modal styling in here.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubsidiaryOperatingModel } from '../../../types';
import type {
  AcquisitionCase,
  AcquisitionCommitmentId,
  AcquisitionFundingSelection,
  AcquisitionOfferType,
} from '../../../services/studioAcquisition';

/* ============================================================
   TYPES & CONFIG
   ============================================================ */

export type AcqPhase =
  | 'DOSSIER' | 'WARROOM' | 'ENVELOPE' | 'BREAKING'
  | 'RESPONSE' | 'CLOSING' | 'SIGNING' | 'ACQUIRED';

export type SellerPosture = 'DISMISSIVE' | 'TESTING' | 'SERIOUS' | 'COMPELLING' | 'OVERPAYING';
export type SellerDecision = 'ACCEPTED' | 'COUNTERED' | 'RIVAL_BID' | 'REJECTED';
export type FundingSource = 'PERSONAL' | 'STUDIO';
export type OperatingModelId = 'INDEPENDENT_LABEL' | 'CONTROLLED_SUBSIDIARY' | 'FULL_MERGER';

export interface CommitmentDef { id: string; label: string; note: string; }
export interface OperatingModelDef {
  id: OperatingModelId; label: string; control: string;
  benefits: string[]; tradeoff: string;
}

export interface StudioAcqConfig {
  playerName: string;
  groupName: string;
  /** ForbesStudioProfile */
  studioName: string;
  archetype: string;
  rank: number;
  valuation: number;
  catalogCount: number;
  hitRate: number;          // 0-100
  reputation: number;       // 0-100
  keyTalent: string[];
  /** diligence report values (hidden until diligence is paid) */
  verifiedDebt: number;
  hiddenLiabilities: number;
  expectedIncome: number;
  riskFlags: string[];
  diligenceFee: number;
  /** funding */
  personalBalance: number;
  studioCapitalName: string;
  studioCapitalBalance: number;
  studioComplianceRisk: number; // 0-100
  /** energy */
  playerEnergy: number;
  strategyEnergyCost: number;
  signingEnergyCost: number;
  /** negotiation */
  commitments: CommitmentDef[];
  rivalStudioName: string;
  contractSerial: string;
  operatingModels: OperatingModelDef[];
  marketType?: 'PRIVATE' | 'PUBLIC';
  currentWeek?: number;
  currentYear?: number;
  currentOwnershipPercent?: number;
  strategicThresholdPercent?: number;
  controlTargetPercent?: number;
  remainingControlPercent?: number;
  sharesOwned?: number;
  sharesRequiredForControl?: number;
  outstandingShares?: number;
  stockSymbol?: string;
  /** Public-control ledger. Stock purchases are already paid, not charged again at closing. */
  stockCostBasis?: number;
  stockMarketValue?: number;
  controlBlockValue?: number;
  existingStakeCredit?: number;
  /** Private minority stake being converted into a negotiated 100% acquisition. */
  isPrivateControlUpgrade?: boolean;
  /** Cash reference for only the shares this new offer needs to acquire. */
  offerReferenceValue?: number;
  /** Existing in-world social accounts make the public reaction feel connected to this save. */
  mediaHandles?: string[];
  transactionOutcome?: 'MINORITY_STAKE' | 'CONTROL' | 'FULL_BUYOUT';
  rivalMaxRounds?: number;
  /** demo-only: force a seller decision instead of the ratio heuristic */
  forcedDecision?: SellerDecision;
}

export interface StudioAcqResult {
  acquired: boolean;
  finalPrice: number;
  fundingSource: FundingSource;
  commitments: string[];
  operatingModel: OperatingModelId | null;
}

type DealRoomAction = {
  success: boolean;
  reason?: string;
};

/**
 * The visual room deliberately owns no economic state. All money, energy,
 * seller decisions, and ownership changes stay in studioAcquisition.ts.
 */
export interface StudioAcquisitionDealRoomProps {
  config: StudioAcqConfig;
  acquisitionCase?: AcquisitionCase;
  studioFunding?: AcquisitionFundingSelection;
  onImmersiveChange?: (immersive: boolean) => void;
  onClose: () => void;
  onRunDiligence: (funding: AcquisitionFundingSelection) => DealRoomAction;
  onSubmitOffer: (input: {
    offerType: AcquisitionOfferType;
    offerAmount: number;
    minorityPercent?: number;
    funding: AcquisitionFundingSelection;
    commitments: AcquisitionCommitmentId[];
  }) => DealRoomAction;
  onAcceptCounter: () => DealRoomAction;
  onReviseOffer: (offerAmount: number) => DealRoomAction;
  onBeatRival: (offerAmount: number) => DealRoomAction;
  onWalkAway: () => DealRoomAction;
  onCompleteAcquisition: () => DealRoomAction;
  onSetOperatingModel: (model: SubsidiaryOperatingModel) => DealRoomAction;
  onUpdatePresentation?: (patch: NonNullable<AcquisitionCase['presentation']>) => DealRoomAction;
}

export const DEFAULT_ACQ_CONFIG: StudioAcqConfig = {
  playerName: 'Aiden Cross',
  groupName: 'Cross Pictures Group',
  studioName: 'Artisan Pictures',
  archetype: 'Prestige Indie',
  rank: 7,
  valuation: 3_300_000_000,
  catalogCount: 42,
  hitRate: 61,
  reputation: 74,
  keyTalent: ['Elena Cross · Director', 'Marcus Vale · Showrunner'],
  verifiedDebt: 802_400_000,
  hiddenLiabilities: 115_500_000,
  expectedIncome: 78_300_000,
  riskFlags: ['Two franchise rights lapse within 3 years', 'Union renegotiation due next season'],
  diligenceFee: 33_000_000,
  personalBalance: 5_100_000_000,
  studioCapitalName: 'Crossfire Studios',
  studioCapitalBalance: 2_400_000_000,
  studioComplianceRisk: 38,
  playerEnergy: 12,
  strategyEnergyCost: 3,
  signingEnergyCost: 5,
  commitments: [
    { id: 'PRESERVE_STUDIO_NAME', label: 'Name Protected', note: 'The label keeps its identity' },
    { id: 'PROTECT_EMPLOYEES', label: 'Staff Protected', note: 'No layoffs for 2 years' },
    { id: 'GUARANTEE_PRODUCTIONS', label: 'Slate Guaranteed', note: 'Greenlit projects survive' },
  ],
  rivalStudioName: 'Meridian Global',
  contractSerial: 'ARTI-29-3300',
  operatingModels: [
    { id: 'INDEPENDENT_LABEL', label: 'Independent Label', control: 'Light touch', benefits: ['Keeps creative identity', 'Reputation intact', 'Talent stays loyal'], tradeoff: 'Less direct control' },
    { id: 'CONTROLLED_SUBSIDIARY', label: 'Controlled Subsidiary', control: 'Board oversight', benefits: ['You set the mandate', 'Shared facilities', 'Balanced synergy'], tradeoff: 'Some staff friction' },
    { id: 'FULL_MERGER', label: 'Full Merger', control: 'Total absorption', benefits: ['Max cost synergy', 'One brand', 'Catalog folds in fully'], tradeoff: 'Culture shock risk' },
  ],
  marketType: 'PRIVATE',
  currentWeek: 1,
  currentYear: 18,
  currentOwnershipPercent: 0,
  strategicThresholdPercent: 25,
  controlTargetPercent: 50,
  remainingControlPercent: 50,
  sharesOwned: 0,
  sharesRequiredForControl: 0,
  outstandingShares: 0,
  stockSymbol: '',
  stockCostBasis: 0,
  stockMarketValue: 0,
  controlBlockValue: 0,
  existingStakeCredit: 0,
  isPrivateControlUpgrade: false,
  offerReferenceValue: 0,
  mediaHandles: [],
  transactionOutcome: 'FULL_BUYOUT',
  rivalMaxRounds: 3,
};

/* ============================================================
   HELPERS
   ============================================================ */

const fmtMoney = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `${sign}$${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${sign}$${Math.round(v / 1_000)}K`;
  return `${sign}$${Math.round(v)}`;
};

/** Keep every press meaningful at the precision displayed to the player. */
const getBidDialStep = (amount: number): number => {
  const value = Math.max(0, amount);
  if (value >= 1_000_000_000) return 100_000_000;
  if (value >= 250_000_000) return 25_000_000;
  if (value >= 50_000_000) return 10_000_000;
  return 2_000_000;
};

function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);
  return useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);
}

/** Same bands the desk uses for analyzeCustomOffer posture. */
const postureFor = (ratio: number): SellerPosture =>
  ratio < 0.75 ? 'DISMISSIVE'
    : ratio < 0.92 ? 'TESTING'
      : ratio < 1.05 ? 'SERIOUS'
        : ratio < 1.2 ? 'COMPELLING'
          : 'OVERPAYING';

const POSTURE_META: Record<SellerPosture, { label: string; note: string; color: string }> = {
  DISMISSIVE: { label: 'Dismissive', note: 'The board will not take this seriously.', color: '#ff5c6a' },
  TESTING: { label: 'Testing', note: 'Expect a counter well above this.', color: '#5cb8ff' },
  SERIOUS: { label: 'Serious', note: 'A credible bid. Negotiation opens.', color: '#57e389' },
  COMPELLING: { label: 'Compelling', note: 'Hard for the board to refuse.', color: '#f0b429' },
  OVERPAYING: { label: 'Overpaying', note: 'They will sign — you are burning cash.', color: '#ff9640' },
};

const ENERGY = ({ cost, have }: { cost: number; have: number }) => (
  <span className={`sa-energy${have >= cost ? '' : ' low'}`}>⚡ {cost}E</span>
);

/* ============================================================
   SHARED WIDGETS
   ============================================================ */

const PostureGauge: React.FC<{ ratio: number }> = ({ ratio }) => {
  const posture = postureFor(ratio);
  const meta = POSTURE_META[posture];
  // map ratio 0.6..1.4 → -82°..82°
  const angle = Math.max(-82, Math.min(82, ((ratio - 1) / 0.4) * 82));
  const segs = [
    { from: -90, to: -54, color: '#ff5c6a' },
    { from: -54, to: -18, color: '#5cb8ff' },
    { from: -18, to: 18, color: '#57e389' },
    { from: 18, to: 54, color: '#f0b429' },
    { from: 54, to: 90, color: '#ff9640' },
  ];
  const arc = (from: number, to: number) => {
    const r = 74, cx = 90, cy = 88;
    const a1 = ((from - 90) * Math.PI) / 180, a2 = ((to - 90) * Math.PI) / 180;
    return `M ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`;
  };
  return (
    <div className="sa-gauge">
      <svg viewBox="0 0 180 100">
        {segs.map((s, i) => (
          <path key={i} d={arc(s.from + 2, s.to - 2)} fill="none" stroke={s.color}
            strokeWidth={posture === (['DISMISSIVE', 'TESTING', 'SERIOUS', 'COMPELLING', 'OVERPAYING'] as SellerPosture[])[i] ? 11 : 6}
            strokeLinecap="round" opacity={posture === (['DISMISSIVE', 'TESTING', 'SERIOUS', 'COMPELLING', 'OVERPAYING'] as SellerPosture[])[i] ? 1 : .32} />
        ))}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '90px 88px', transition: 'transform .5s cubic-bezier(.3,1.4,.4,1)' }}>
          <line x1="90" y1="88" x2="90" y2="26" stroke="#f5f0e2" strokeWidth="3" strokeLinecap="round" />
          <line x1="90" y1="88" x2="90" y2="26" stroke={meta.color} strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <circle cx="90" cy="88" r="7" fill="#1b1710" stroke="#f0b429" strokeWidth="2" />
      </svg>
      <div className="sa-gauge-label" style={{ color: meta.color }}>{meta.label}</div>
      <div className="sa-gauge-note">{meta.note}</div>
    </div>
  );
};

const WaxSeal: React.FC<{ small?: boolean }> = ({ small }) => (
  <div className={`sa-waxseal${small ? ' small' : ''}`}>
    <svg viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="27" fill="#8f1524" />
      <circle cx="30" cy="30" r="27" fill="none" stroke="#5c0c16" strokeWidth="3" />
      <circle cx="30" cy="30" r="19" fill="none" stroke="rgba(255,220,160,.4)" strokeWidth="1.4" strokeDasharray="3 3" />
      <text x="30" y="37" textAnchor="middle" fontFamily="Georgia" fontWeight="900" fontSize="18" fill="#ffd9a0">A</text>
    </svg>
  </div>
);

/* ============================================================
   SCENE 1 — THE DOSSIER
   ============================================================ */

const DossierScene: React.FC<{
  cfg: StudioAcqConfig;
  diligenceDone: boolean;
  onRunDiligence: (funding: FundingSource) => boolean;
  onContinue: () => void;
  onClose: () => void;
}> = ({ cfg, diligenceDone, onRunDiligence, onContinue, onClose }) => {
  const [revealing, setRevealing] = useState(false);
  const [pickFunding, setPickFunding] = useState(false);
  const wait = useTimers();

  const runDiligence = (src: FundingSource) => {
    setPickFunding(false);
    setRevealing(true);
    wait(() => {
      if (!onRunDiligence(src)) setRevealing(false);
    }, 1400);
  };

  const secret = (value: string, flagIdx?: number) => (
    diligenceDone
      ? <span className={`sa-revealed${revealing ? ' burn' : ''}`} style={{ animationDelay: `${(flagIdx ?? 0) * .18}s` }}>{value}</span>
      : <span className="sa-redacted"><i /><i style={{ width: '55%' }} /></span>
  );

  return (
    <div className="sa-scene sa-dossier">
      <div className="sa-topbar">
        <button className="sa-backbtn" onClick={onClose}>←</button>
        <div className="sa-topbar-mid">
          <div className="sa-kicker">The Deal Room</div>
          <div className="sa-scene-title">Target Dossier</div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="sa-scroll">
        <div className="sa-folder">
          <div className="sa-folder-tab">CONFIDENTIAL · ACQ FILE #{cfg.contractSerial}</div>
          <div className="sa-folder-body">
            <div className="sa-folder-head">
              <div>
                <div className="sa-doss-arch">{cfg.archetype} · Forbes #{cfg.rank}</div>
                <div className="sa-doss-name">{cfg.studioName}</div>
              </div>
              <div className="sa-doss-val">
                <span>Street Valuation</span>
                <b>{fmtMoney(cfg.valuation)}</b>
              </div>
            </div>

            <div className="sa-doss-grid">
              <div className="sa-doss-cell"><span>Catalog</span><b>{cfg.catalogCount} titles</b></div>
              <div className="sa-doss-cell"><span>Hit Rate</span><b>{cfg.hitRate}%</b></div>
              <div className="sa-doss-cell"><span>Reputation</span><b>{cfg.reputation}/100</b></div>
              <div className="sa-doss-cell"><span>Key Talent</span><b>{cfg.keyTalent.length} names</b></div>
            </div>

            {cfg.marketType === 'PUBLIC' && (
              <div className="sa-market-position">
                <div className="sa-doss-sec">Your Market Position <em className="ok">{cfg.stockSymbol || 'PUBLIC'}</em></div>
                <div className="sa-position-head">
                  <div><span>Already owned</span><b>{(cfg.currentOwnershipPercent || 0).toFixed(2)}%</b></div>
                  <div><span>Control target</span><b>{cfg.controlTargetPercent || 50}%</b></div>
                  <div><span>Still required</span><b>{(cfg.remainingControlPercent || 0).toFixed(2)}%</b></div>
                </div>
                <div className="sa-position-track"><i style={{ width: `${Math.min(100, ((cfg.currentOwnershipPercent || 0) / (cfg.controlTargetPercent || 50)) * 100)}%` }} /></div>
                <div className="sa-position-note">
                  {(cfg.sharesOwned || 0).toLocaleString()} shares already count toward control. You have already committed {fmtMoney(cfg.stockCostBasis || 0)} in the market; the tender only covers the remaining {(cfg.sharesRequiredForControl || 0).toLocaleString()} shares.
                </div>
                <div className="sa-position-ledger">
                  <div><span>50% control value</span><b>{fmtMoney(cfg.controlBlockValue || 0)}</b></div>
                  <div><span>Stake credit</span><b className="ok">−{fmtMoney(cfg.existingStakeCredit || 0)}</b></div>
                  <div><span>Remaining tender</span><b>{fmtMoney(Math.max(0, (cfg.controlBlockValue || 0) - (cfg.existingStakeCredit || 0)))}</b></div>
                </div>
              </div>
            )}

            {cfg.isPrivateControlUpgrade && (
              <div className="sa-market-position private">
                <div className="sa-doss-sec">Ownership Strategy <em className="gold">STAKE TO CONTROL</em></div>
                <div className="sa-position-head">
                  <div><span>Already yours</span><b>{(cfg.currentOwnershipPercent || 0).toFixed(1)}%</b></div>
                  <div><span>Offer covers</span><b>{(cfg.remainingControlPercent || 0).toFixed(1)}%</b></div>
                  <div><span>After closing</span><b>100%</b></div>
                </div>
                <div className="sa-position-track private"><i style={{ width: `${Math.min(100, cfg.currentOwnershipPercent || 0)}%` }} /></div>
                <div className="sa-position-note">
                  Your existing stake stays credited. Fresh diligence values the whole studio, but this negotiation charges only for the remaining shares.
                </div>
                <div className="sa-position-ledger">
                  <div><span>Stake already held</span><b className="ok">{fmtMoney(cfg.existingStakeCredit || 0)}</b></div>
                  <div><span>Remaining block reference</span><b>{fmtMoney(cfg.offerReferenceValue || 0)}</b></div>
                </div>
              </div>
            )}

            <div className="sa-doss-sec">Financial Exposure {diligenceDone
              ? <em className="ok">VERIFIED</em>
              : <em>SEALED — DILIGENCE REQUIRED</em>}
            </div>
            <div className="sa-doss-rows">
              <div className="sa-doss-row"><span>Verified Debt</span>{secret(fmtMoney(cfg.verifiedDebt), 0)}</div>
              <div className="sa-doss-row"><span>Hidden Liabilities</span>{secret(fmtMoney(cfg.hiddenLiabilities), 1)}</div>
              <div className="sa-doss-row"><span>Expected Annual Income</span>{secret(fmtMoney(cfg.expectedIncome), 2)}</div>
            </div>

            <div className="sa-doss-sec">Risk Flags</div>
            <div className="sa-doss-rows">
              {cfg.riskFlags.map((flag, i) => (
                <div key={i} className="sa-doss-row flag"><span>▲</span>{secret(flag, 3 + i)}</div>
              ))}
            </div>

            <div className="sa-doss-stampzone">
              {diligenceDone && <div className="sa-inkstamp ok">VERIFIED</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="sa-foot">
        {!diligenceDone ? (
          <>
            <button className="sa-btn ghost" onClick={onContinue}>Bid Blind →</button>
            <button className="sa-btn gold" onClick={() => setPickFunding(true)}>
              Run Due Diligence · {fmtMoney(cfg.diligenceFee)}
            </button>
          </>
        ) : (
          <button className="sa-btn gold wide" onClick={onContinue}>Open the War Room →</button>
        )}
      </div>

      {pickFunding && (
        <div className="sa-veil" onClick={e => { if (e.target === e.currentTarget) setPickFunding(false); }}>
          <div className="sa-sheet">
            <div className="sa-sheet-grip" />
            <div className="sa-sheet-title">Who pays the investigators?</div>
            <button className="sa-vault" onClick={() => runDiligence('PERSONAL')}>
              <div className="sa-vault-ic personal">👤</div>
              <div><b>Personal Wealth</b><span>{fmtMoney(cfg.personalBalance)} available · cash research fee · no energy</span></div>
            </button>
            <button className="sa-vault" onClick={() => runDiligence('STUDIO')}>
              <div className="sa-vault-ic studio">🏛</div>
              <div><b>{cfg.studioCapitalName}</b><span>{fmtMoney(cfg.studioCapitalBalance)} available · cash research fee · no energy</span></div>
            </button>
          </div>
        </div>
      )}

      {revealing && !diligenceDone && (
        <div className="sa-scanveil">
          <div className="sa-scanline" />
          <div className="sa-scantext">INVESTIGATORS INSIDE THE BOOKS…</div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SCENE 2 — THE WAR ROOM
   ============================================================ */

interface OfferDraft {
  structure: 'FULL' | 'MINORITY';
  minorityPct: number;
  amount: number;
  commitments: string[];
  funding: FundingSource | null;
}

const WarRoomScene: React.FC<{
  cfg: StudioAcqConfig;
  diligenceDone: boolean;
  draft: OfferDraft;
  setDraft: React.Dispatch<React.SetStateAction<OfferDraft>>;
  actionPending: boolean;
  onFile: () => void;
  onBack: () => void;
}> = ({ cfg, diligenceDone, draft, setDraft, actionPending, onFile, onBack }) => {
  const publicTender = cfg.marketType === 'PUBLIC';
  const privateControlUpgrade = Boolean(cfg.isPrivateControlUpgrade);
  const controlReady = publicTender && (cfg.currentOwnershipPercent || 0) >= (cfg.controlTargetPercent || 50);
  const reference = publicTender
    ? Math.max(1, Math.round(cfg.valuation * ((cfg.remainingControlPercent || 0) / 100)))
    : privateControlUpgrade
    ? Math.max(1, cfg.offerReferenceValue || Math.round(cfg.valuation * ((cfg.remainingControlPercent || 0) / 100)))
    : draft.structure === 'MINORITY'
    ? Math.round(cfg.valuation * (draft.minorityPct / 100))
    : cfg.valuation;
  const ratio = draft.amount / Math.max(1, reference);
  const step = getBidDialStep(reference);
  const fundingBalance = draft.funding === 'PERSONAL' ? cfg.personalBalance : cfg.studioCapitalBalance;
  const affordable = draft.funding !== null && fundingBalance >= draft.amount;
  const canFile = controlReady || (draft.funding !== null && affordable && draft.amount > 0);

  const setAmount = (n: number) => setDraft(d => ({ ...d, amount: Math.max(step, n) }));
  const preset = (mult: number) => setAmount(Math.round(reference * mult));

  return (
    <div className="sa-scene sa-warroom">
      <div className="sa-topbar">
        <button className="sa-backbtn" onClick={onBack}>←</button>
        <div className="sa-topbar-mid">
          <div className="sa-kicker">The Deal Room</div>
          <div className="sa-scene-title">The War Room</div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="sa-scroll">
        {/* structure */}
        <div className="sa-sec">Deal Structure</div>
        {publicTender ? (
          <div className="sa-public-tender">
            <div className="sa-public-tender-head"><b>Public Control Tender</b><span>{cfg.stockSymbol || 'MARKET'} · control at {cfg.controlTargetPercent || 50}%</span></div>
            <div className="sa-public-tender-grid">
              <div><span>Current stake</span><b>{(cfg.currentOwnershipPercent || 0).toFixed(2)}%</b></div>
              <div><span>{controlReady ? 'Control status' : 'Tender adds'}</span><b>{controlReady ? 'SECURED' : `+${(cfg.remainingControlPercent || 0).toFixed(2)}%`}</b></div>
              <div><span>At closing</span><b>{cfg.controlTargetPercent || 50}%+</b></div>
            </div>
            <div className="sa-public-ledger" aria-label="Public control tender ledger">
              <div><span>Control block</span><b>{fmtMoney(cfg.controlBlockValue || reference)}</b></div>
              <div><span>Existing stake credit</span><b className="ok">−{fmtMoney(cfg.existingStakeCredit || 0)}</b></div>
              <div><span>Cash already invested</span><b>{fmtMoney(cfg.stockCostBasis || 0)}</b></div>
              <div><span>Remaining reference</span><b>{fmtMoney(reference)}</b></div>
            </div>
            <p>{controlReady
              ? 'You already hold the voting threshold. File a control-transfer notice to move into closing without buying the same shares again.'
              : 'Your existing shares are credited. The control value above is reduced by that stake; this filing buys only the remaining block after the board accepts.'}</p>
          </div>
        ) : privateControlUpgrade ? (
          <div className="sa-private-control">
            <div className="sa-private-control-head">
              <div><span>OWNERSHIP UPGRADE</span><b>Negotiate Full Control</b></div>
              <strong>{(cfg.currentOwnershipPercent || 0).toFixed(1)}% HELD</strong>
            </div>
            <div className="sa-private-control-flow" aria-label="Private stake to full control">
              <div><span>Existing stake</span><b>{(cfg.currentOwnershipPercent || 0).toFixed(1)}%</b></div>
              <i>+</i>
              <div><span>Remaining block</span><b>{(cfg.remainingControlPercent || 0).toFixed(1)}%</b></div>
              <i>=</i>
              <div><span>Closing target</span><b>100%</b></div>
            </div>
            <p>Your original shares are already paid for and remain credited. The number below is only the proposal for the remaining block.</p>
          </div>
        ) : (
          <div className="sa-structrow">
            <button className={`sa-struct${draft.structure === 'FULL' ? ' on' : ''}`}
              onClick={() => setDraft(d => ({ ...d, structure: 'FULL', amount: cfg.valuation }))}>
              <b>Full Acquisition</b><span>100% — the studio joins your group</span>
            </button>
            <button className={`sa-struct${draft.structure === 'MINORITY' ? ' on' : ''}`}
              onClick={() => setDraft(d => ({ ...d, structure: 'MINORITY', amount: Math.round(cfg.valuation * (d.minorityPct / 100)) }))}>
              <b>Minority Stake</b><span>Influence without control</span>
            </button>
          </div>
        )}
        {!publicTender && !privateControlUpgrade && draft.structure === 'MINORITY' && (
          <div className="sa-pctrow">
            <button className="sa-stepbtn" onClick={() => setDraft(d => {
              const pct = Math.max(10, d.minorityPct - 5);
              return { ...d, minorityPct: pct, amount: Math.round(cfg.valuation * (pct / 100)) };
            })}>−</button>
            <div className="sa-pct"><b>{draft.minorityPct}%</b><span>of the company</span></div>
            <button className="sa-stepbtn" onClick={() => setDraft(d => {
              const pct = Math.min(49, d.minorityPct + 5);
              return { ...d, minorityPct: pct, amount: Math.round(cfg.valuation * (pct / 100)) };
            })}>+</button>
          </div>
        )}

        {/* the money dial */}
        <div className="sa-sec">Your Number</div>
        <div className="sa-dial">
          <button className="sa-stepbtn big" onClick={() => setAmount(draft.amount - step)}>−</button>
          <div className="sa-dial-amt">
            <b>{fmtMoney(draft.amount)}</b>
            <span>{publicTender || privateControlUpgrade ? `for the remaining ${(cfg.remainingControlPercent || 0).toFixed(2)}% control block` : draft.structure === 'MINORITY' ? `for ${draft.minorityPct}%` : 'for full control'} · ref {fmtMoney(reference)}</span>
          </div>
          <button className="sa-stepbtn big" onClick={() => setAmount(draft.amount + step)}>+</button>
        </div>
        <div className="sa-presets">
          <button onClick={() => preset(0.88)}>Conservative ·88%</button>
          <button onClick={() => preset(1)}>Fair ·100%</button>
          <button onClick={() => preset(1.15)}>Aggressive ·115%</button>
        </div>

        <PostureGauge ratio={ratio} />
        {!diligenceDone && (
          <div className="sa-blindwarn">▲ Bidding blind — debt & hidden liabilities are unverified.</div>
        )}

        {/* clause cards */}
        <div className="sa-sec">Seller Commitments <em>sweeten the deal · bind you after closing</em></div>
        <div className="sa-clauses">
          {cfg.commitments.map(c => {
            const on = draft.commitments.includes(c.id);
            return (
              <button key={c.id} className={`sa-clause${on ? ' on' : ''}`}
                onClick={() => setDraft(d => ({
                  ...d,
                  commitments: on ? d.commitments.filter(x => x !== c.id) : [...d.commitments, c.id],
                }))}>
                <span className="chk">{on ? '✓' : '+'}</span>
                <div><b>{c.label}</b><span>{c.note}</span></div>
              </button>
            );
          })}
        </div>

        {/* funding vaults */}
        <div className="sa-sec">Funding Vault</div>
        <div className="sa-vaults">
          <button className={`sa-vault${draft.funding === 'PERSONAL' ? ' on' : ''}${cfg.personalBalance < draft.amount ? ' dead' : ''}`}
            onClick={() => setDraft(d => ({ ...d, funding: 'PERSONAL' }))}>
            <div className="sa-vault-ic personal">👤</div>
            <div>
              <b>Personal Wealth</b>
              <span>{fmtMoney(cfg.personalBalance)} → {fmtMoney(cfg.personalBalance - draft.amount)} after</span>
              <span className="ok">Clean books · no compliance heat</span>
            </div>
          </button>
          {!publicTender && (
            <button className={`sa-vault${draft.funding === 'STUDIO' ? ' on' : ''}${cfg.studioCapitalBalance < draft.amount ? ' dead' : ''}`}
              onClick={() => setDraft(d => ({ ...d, funding: 'STUDIO' }))}>
              <div className="sa-vault-ic studio">🏛</div>
              <div>
                <b>{cfg.studioCapitalName}</b>
                <span>{fmtMoney(cfg.studioCapitalBalance)} → {fmtMoney(cfg.studioCapitalBalance - draft.amount)} after</span>
                <span className="heat">Compliance heat
                  <i className="sa-heat"><i style={{ width: `${cfg.studioComplianceRisk}%` }} /></i>
                  {cfg.studioComplianceRisk}/100
                </span>
              </div>
            </button>
          )}
        </div>
        <div style={{ height: 8 }} />
      </div>

      <div className="sa-foot">
        <button
          className={`sa-btn gold wide${canFile && !actionPending ? '' : ' dead'}`}
          disabled={!canFile || actionPending}
          onClick={() => canFile && !actionPending && onFile()}
        >
          {actionPending ? 'Filed with the Board…' : controlReady ? 'File Majority Control Notice' : 'File the Offer with the Board'} {!controlReady && !actionPending && <ENERGY cost={cfg.strategyEnergyCost} have={cfg.playerEnergy} />}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   SCENE 3 — THE ENVELOPE (cutscene)
   ============================================================ */

const EnvelopeScene: React.FC<{
  cfg: StudioAcqConfig; draft: OfferDraft; onClose: () => void;
}> = ({ cfg, draft, onClose }) => {
  const wait = useTimers();
  const [beat, setBeat] = useState<'fold' | 'sealed' | 'waiting'>('fold');
  useEffect(() => {
    wait(() => setBeat('sealed'), 1500);
    wait(() => setBeat('waiting'), 3300);
  }, [wait]);
  return (
    <div className="sa-scene sa-envelope sa-center">
      {beat !== 'waiting' ? (
        <div className="sa-env-stage">
          <div className={`sa-env-paper${beat === 'sealed' ? ' folded' : ''}`}>
            <div className="k">Opening Offer · {cfg.studioName}</div>
            <b>{fmtMoney(draft.amount)}</b>
            <span>{cfg.marketType === 'PUBLIC' ? `${(cfg.remainingControlPercent || 0).toFixed(2)}% control tender` : draft.structure === 'MINORITY' ? `${draft.minorityPct}% stake` : 'Full acquisition'} · {draft.commitments.length} commitments</span>
          </div>
          <div className={`sa-env-envelope${beat === 'sealed' ? ' up' : ''}`}>
            <div className="flap" />
            {beat === 'sealed' && <WaxSeal />}
            {beat === 'sealed' && <div className="sa-filedstamp">FILED WITH THE BOARD</div>}
          </div>
        </div>
      ) : (
        <div className="sa-waiting">
          <div className="sa-kicker" style={{ letterSpacing: '.5em' }}>The Week Turns</div>
          <div className="sa-wait-title">The board deliberates<span className="sa-dots" /></div>
          <div className="sa-wait-sub">Your terms are on the table at {cfg.studioName}.</div>
          <div className="sa-wait-file">
            <div><span>Filed</span><b>Age {cfg.currentYear} · W{cfg.currentWeek}</b></div>
            <div><span>Response</span><b>After the next week progresses</b></div>
            <div><span>Strategy energy</span><b className="ok">{cfg.strategyEnergyCost}E recorded on filing</b></div>
            <div><span>Purchase funds</span><b className="ok">$0 until final signature</b></div>
          </div>
          <div className="sa-wait-note">Advance the week from Home. The offer will remain safely filed if you leave this screen.</div>
        </div>
      )}
      {beat === 'waiting' && (
        <button className="sa-btn gold" onClick={onClose}>Return to Forbes / Home</button>
      )}
    </div>
  );
};

/* ============================================================
   SCENE 4 — BREAKING NEWS interstitial
   ============================================================ */

const BREAKING_COPY: Record<SellerDecision, { head: string; sub: (cfg: StudioAcqConfig) => string; tone: string }> = {
  ACCEPTED: { head: 'DEAL OF THE DECADE', sub: c => `${c.studioName} board said YES`, tone: 'gold' },
  COUNTERED: { head: 'TALKS INTENSIFY', sub: c => `${c.studioName} slides the paper back`, tone: 'sky' },
  RIVAL_BID: { head: 'BIDDING WAR', sub: c => `${c.rivalStudioName} enters the race`, tone: 'red' },
  REJECTED: { head: 'DOOR SLAMMED', sub: c => `${c.studioName} declines the offer`, tone: 'red' },
};

type FeedItem =
  | { kind: 'press'; outlet: string; text: string }
  | { kind: 'x'; handle: string; text: string; reposts: string; likes: string }
  | { kind: 'ig'; handle: string; text: string; likes: string };

const DEALROOM_FALLBACK_HANDLES = ['@studiodealwire', '@marketmood', '@dealroomwire', '@marketdesk', '@boardwatch', '@tradewire'];
const stableIndex = (seed: string, length: number): number => (
  length ? Array.from(seed).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7) % length : 0
);
const pickFeedHandle = (cfg: StudioAcqConfig, decision: SellerDecision, offset: number): string => {
  const saveHandles = (cfg.mediaHandles || []).filter(handle => /^@?[a-z0-9_.-]+$/i.test(handle));
  const handles = Array.from(new Set([...saveHandles, ...DEALROOM_FALLBACK_HANDLES]));
  const selected = handles[stableIndex(`${cfg.studioName}:${cfg.playerName}:${decision}:${offset}`, handles.length)];
  return selected?.startsWith('@') ? selected : `@${selected || 'studiodealwire'}`;
};
const pickPressOutlet = (cfg: StudioAcqConfig, decision: SellerDecision, offset: number): string => {
  const outlets = ['HOLLYWOOD NOW', 'CINEWIRE', 'THE TRADE REPORT', 'SCREEN LEDGER', 'STUDIO WATCH'];
  return outlets[stableIndex(`${cfg.studioName}:${decision}:press:${offset}`, outlets.length)];
};

/** The internet reacts — different flood per seller decision. */
const feedFor = (decision: SellerDecision, cfg: StudioAcqConfig, amount: string): FeedItem[] => {
  const s = cfg.studioName, r = cfg.rivalStudioName, p = cfg.playerName;
  switch (decision) {
    case 'ACCEPTED': return [
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 0), text: `${s} sells — ${p}'s empire grows overnight` },
      { kind: 'x', handle: pickFeedHandle(cfg, decision, 0), text: `${amount}?? and the board took ${p}'s terms on the FIRST call 😳`, reposts: '4.2K', likes: '18.6K' },
      { kind: 'ig', handle: pickFeedHandle(cfg, decision, 1).replace(/^@/, ''), text: `new era unlocked 🎬🔥 ${s} x ${p}`, likes: '12.8K' },
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 1), text: `Analysts call it "a statement price, not a bargain"` },
      { kind: 'x', handle: pickFeedHandle(cfg, decision, 2), text: `${p} just added a real studio banner to the group. Rival execs are not sleeping tonight.`, reposts: '2.9K', likes: '9.4K' },
    ];
    case 'COUNTERED': return [
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 0), text: `Talks continue behind closed doors at ${s}` },
      { kind: 'x', handle: pickFeedHandle(cfg, decision, 0), text: `${p} got a counter — and it came back WAY higher 👀`, reposts: '1.8K', likes: '7.2K' },
      { kind: 'ig', handle: pickFeedHandle(cfg, decision, 1).replace(/^@/, ''), text: `this negotiation is my new reality show 🍿`, likes: '6.1K' },
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 1), text: `Neither side blinking — bankers on standby` },
    ];
    case 'RIVAL_BID': return [
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 0), text: `${r} crashes the party with a rival number` },
      { kind: 'x', handle: pickFeedHandle(cfg, decision, 0), text: `${p} vs ${r}. The bidding war is officially on. 🚨`, reposts: '8.7K', likes: '31K' },
      { kind: 'ig', handle: pickFeedHandle(cfg, decision, 1).replace(/^@/, ''), text: `${p} vs ${r}… grab the popcorn 🍿🍿`, likes: '15.3K' },
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 1), text: `Price discovery in real time — ${s} wins either way` },
    ];
    case 'REJECTED': return [
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 0), text: `${s} board unanimous: "not for sale — not at that number"` },
      { kind: 'x', handle: pickFeedHandle(cfg, decision, 0), text: `${p}'s opening number did not move the board. A return bid is already being discussed.`, reposts: '3.4K', likes: '14.1K' },
      { kind: 'ig', handle: pickFeedHandle(cfg, decision, 1).replace(/^@/, ''), text: `the board said no, but this file is not dead yet 😭`, likes: '5.8K' },
      { kind: 'press', outlet: pickPressOutlet(cfg, decision, 1), text: `Door closed — for now. Insiders expect a return.` },
    ];
  }
};

const BreakingScene: React.FC<{
  cfg: StudioAcqConfig; decision: SellerDecision; amount: number; onDone: () => void;
}> = ({ cfg, decision, amount, onDone }) => {
  const copy = BREAKING_COPY[decision];
  const feed = useMemo(() => feedFor(decision, cfg, fmtMoney(amount)), [decision, cfg, amount]);
  const [opening, setOpening] = useState(false);
  const openDecision = () => {
    if (opening) return;
    setOpening(true);
    onDone();
  };
  return (
    <div className="sa-scene sa-breaking">
      <div className="sa-break-top">
        <div className={`sa-break-bar ${copy.tone}`}>BREAKING</div>
        <div className="sa-break-head">{copy.head}</div>
        <div className="sa-break-sub">{copy.sub(cfg)}</div>
      </div>
      <div className="sa-feed" aria-hidden="true">
        {feed.map((item, i) => {
          const delay = `${1.1 + i * 0.5}s`;
          const tilt = `${(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.3)}deg`;
          if (item.kind === 'press') return (
            <div key={i} className="sa-feed-card press" style={{ animationDelay: delay, ['--tilt' as string]: tilt }}>
              <span className="tag">{item.outlet}</span>
              <p>{item.text}</p>
            </div>
          );
          if (item.kind === 'x') return (
            <div key={i} className="sa-feed-card x" style={{ animationDelay: delay, ['--tilt' as string]: tilt }}>
              <div className="row">
                <span className="av">𝕏</span>
                <b>{item.handle}</b>
                <em>· 2m</em>
              </div>
              <p>{item.text}</p>
              <div className="meta">↻ {item.reposts} &nbsp; ♥ {item.likes}</div>
            </div>
          );
          return (
            <div key={i} className="sa-feed-card ig" style={{ animationDelay: delay, ['--tilt' as string]: tilt }}>
              <div className="row">
                <span className="av ig" />
                <b>{item.handle}</b>
                <em>· just now</em>
              </div>
              <p>{item.text}</p>
              <div className="meta">♥ {item.likes} likes</div>
            </div>
          );
        })}
      </div>
      <div className="sa-break-action">
        <button type="button" className="sa-btn gold sa-break-continue" onClick={openDecision} disabled={opening}>
          {opening ? 'Opening Decision…' : 'Review the Board Decision'}
        </button>
      </div>
      <div className="sa-break-ticker" aria-hidden="true"><span>THE DAILY STAR · BUSINESS WIRE · INSIDERS SAY NUMBERS MOVED FAST · PHONES DOWN IN EVERY WRITERS ROOM · MORE AT ELEVEN · </span></div>
    </div>
  );
};

/* ============================================================
   SCENE 5 — RESPONSE (negotiation scenes)
   ============================================================ */

const ResponseScene: React.FC<{
  cfg: StudioAcqConfig;
  decision: SellerDecision;
  offerAmount: number;
  counterAmount: number;
  rivalAmount: number;
  requiredBidAmount: number;
  round: number;
  actionPending: boolean;
  onAcceptCounter: () => void;
  onRevise: (amount: number) => void;
  onBeatRival: (amount: number) => void;
  onWalkAway: () => void;
  onProceedToClosing: () => void;
  onBackToWarRoom: () => void;
  onClose: () => void;
}> = ({ cfg, decision, offerAmount, counterAmount, rivalAmount, requiredBidAmount, round, actionPending,
  onAcceptCounter, onRevise, onBeatRival, onWalkAway, onProceedToClosing, onBackToWarRoom, onClose }) => {
  const [reviseAmt, setReviseAmt] = useState(counterAmount);
  const qualifyingBid = Math.max(rivalAmount, requiredBidAmount);
  const [beatAmt, setBeatAmt] = useState(qualifyingBid);
  const step = getBidDialStep(qualifyingBid || cfg.valuation);

  useEffect(() => {
    setReviseAmt(counterAmount);
  }, [counterAmount]);

  useEffect(() => {
    setBeatAmt(qualifyingBid);
  }, [qualifyingBid]);

  if (decision === 'ACCEPTED') {
    const agreed = counterAmount || offerAmount;
    return (
      <div className="sa-scene sa-response sa-center">
        <div className="sa-spot" />
        <div className="sa-kicker" style={{ color: '#f0b429' }}>They Said Yes</div>
        <div className="sa-resp-title">The pen is on the table.</div>
        <div className="sa-dealmemo">
          <div className="sa-inkstamp ok slam memostamp">ACCEPTED</div>
          <div className="k">DEAL MEMO · {cfg.studioName.toUpperCase()}</div>
          <b>{fmtMoney(agreed)}</b>
          <div className="memorow"><span>Board Vote</span><i>Unanimous — terms approved</i></div>
          <div className="memorow"><span>Commitments</span><i>{cfg.commitments.length ? 'Bound at closing' : 'None attached'}</i></div>
          <div className="memorow"><span>Next Step</span><i>Closing packet · signature</i></div>
          <div className="sa-pen">
            <svg viewBox="0 0 200 34">
              <path d="M14 22 Q10 19 14 16 L138 6 Q146 5 152 9 L178 21 Q182 23 178 25 L150 29 Q144 30 138 28 Z" fill="#17141a" stroke="#3a3320" strokeWidth="1" />
              <path d="M152 9 L178 21 Q182 23 178 25 L172 26 Q160 18 150 10 Z" fill="#f0b429" />
              <circle cx="181" cy="23" r="1.6" fill="#ffe9a8" />
              <rect x="52" y="12" width="7" height="14" rx="2" fill="#c68a12" transform="rotate(-4 55 19)" />
              <ellipse cx="100" cy="30" rx="70" ry="3" fill="rgba(0,0,0,.25)" />
            </svg>
          </div>
        </div>
        <div className="sa-resp-sub">All that remains is the paperwork.</div>
        <button className="sa-btn gold" onClick={onProceedToClosing}>Proceed to Closing →</button>
      </div>
    );
  }

  if (decision === 'REJECTED') {
    const isFinalAttempt = round >= (cfg.rivalMaxRounds || 3);
    return (
      <div className="sa-scene sa-response sa-center">
        <div className="sa-declined-folder">
          <div className="sa-inkstamp bad big">DECLINED</div>
          <span>ACQ FILE #{cfg.contractSerial}</span>
        </div>
        <div className="sa-kicker" style={{ color: '#f0b429' }}>Offer {round} of {cfg.rivalMaxRounds || 3}</div>
        <div className="sa-resp-title">{isFinalAttempt ? 'The board closed the file.' : "The board didn't blink."}</div>
        <div className="sa-resp-sub">{isFinalAttempt
          ? `This was the final offer. ${cfg.studioName} has closed discussions for now; check Forbes again after the cooldown.`
          : `${fmtMoney(offerAmount)} did not make it past the first reading. You can revise the terms.`}</div>
        <div className="sa-btnrow">
          {isFinalAttempt ? (
            <button className="sa-btn gold" onClick={onClose}>Return to Forbes</button>
          ) : (
            <>
              <button className="sa-btn ghost" onClick={onWalkAway}>Walk Away</button>
              <button className="sa-btn gold" onClick={onBackToWarRoom}>Revise Offer <ENERGY cost={cfg.strategyEnergyCost} have={cfg.playerEnergy} /></button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (decision === 'RIVAL_BID') {
    return (
      <div className="sa-scene sa-response sa-center">
        <div className="sa-rival-card">
          <div className="sa-rival-head">RIVAL BID · ROUND {round}/{cfg.rivalMaxRounds || 3}</div>
          <div className="sa-rival-name">{cfg.rivalStudioName}</div>
          <div className="sa-rival-amt">{fmtMoney(rivalAmount)}</div>
          <div className="sa-rival-note">Beat it or lose {cfg.studioName} to them.</div>
        </div>
        <div className="sa-rival-minimum">Minimum qualifying bid <b>{fmtMoney(qualifyingBid)}</b></div>
        <div className="sa-dial small">
          <button className="sa-stepbtn" onClick={() => setBeatAmt(a => Math.max(qualifyingBid, a - step))}>−</button>
          <div className="sa-dial-amt"><b>{fmtMoney(beatAmt)}</b><span>your counter-bid</span></div>
          <button className="sa-stepbtn" onClick={() => setBeatAmt(a => a + step)}>+</button>
        </div>
        <div className="sa-btnrow">
          <button className="sa-btn ghost" disabled={actionPending} onClick={onWalkAway}>Let Them Have It</button>
          <button className="sa-btn gold" disabled={actionPending} onClick={() => onBeatRival(beatAmt)}>
            {actionPending ? 'Bid Filed…' : <>Beat the Bid <ENERGY cost={cfg.strategyEnergyCost} have={cfg.playerEnergy} /></>}
          </button>
        </div>
      </div>
    );
  }

  // COUNTERED — the paper slides back
  return (
    <div className="sa-scene sa-response sa-center">
      <div className="sa-counter-paper">
        <div className="k">COUNTER-PROPOSAL · {cfg.studioName}</div>
        <div className="sa-counter-old">{fmtMoney(offerAmount)}<i /></div>
        <div className="sa-counter-new">{fmtMoney(counterAmount)}</div>
        <div className="sa-counter-note">"This is the number that opens the door."</div>
      </div>
      <div className="sa-dial small">
        <button className="sa-stepbtn" onClick={() => setReviseAmt(a => Math.max(step, a - step))}>−</button>
        <div className="sa-dial-amt"><b>{fmtMoney(reviseAmt)}</b><span>your revised offer</span></div>
        <button className="sa-stepbtn" onClick={() => setReviseAmt(a => a + step)}>+</button>
      </div>
      <div className="sa-btnrow">
        <button className="sa-btn ghost" disabled={actionPending} onClick={onWalkAway}>Walk Away</button>
        <button className="sa-btn" disabled={actionPending} onClick={() => onRevise(reviseAmt)}>
          {actionPending ? 'Offer Filed…' : <>Revise <ENERGY cost={cfg.strategyEnergyCost} have={cfg.playerEnergy} /></>}
        </button>
        <button className="sa-btn gold" disabled={actionPending} onClick={onAcceptCounter}>
          {actionPending ? 'Terms Filed…' : <>Accept {fmtMoney(counterAmount)} <ENERGY cost={cfg.strategyEnergyCost} have={cfg.playerEnergy} /></>}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   SCENE 6 — CLOSING DOCUMENTS (stamp the packet)
   ============================================================ */

const ClosingScene: React.FC<{
  cfg: StudioAcqConfig; finalPrice: number; funding: FundingSource;
  onEnterSigningRoom: () => void; onBack: () => void;
}> = ({ cfg, finalPrice, funding, onEnterSigningRoom, onBack }) => {
  const docs = cfg.transactionOutcome === 'CONTROL' ? [
    { id: 'PURCHASE_AGREEMENT', label: 'Tender Agreement', value: fmtMoney(finalPrice), note: `${(cfg.sharesRequiredForControl || 0).toLocaleString()} remaining shares at the accepted block price` },
    { id: 'ASSETS_LIABILITIES', label: 'Market + Liability File', value: `${(cfg.currentOwnershipPercent || 0).toFixed(2)}% already held · ${fmtMoney(cfg.verifiedDebt + cfg.hiddenLiabilities)} exposure`, note: 'Existing shares remain credited to your position' },
    { id: 'OWNERSHIP_TRANSFER', label: 'Control Transfer', value: `${cfg.controlTargetPercent || 50}%+ voting control`, note: 'Board authority changes at final signature' },
  ] : cfg.transactionOutcome === 'MINORITY_STAKE' ? [
    { id: 'PURCHASE_AGREEMENT', label: 'Equity Subscription', value: fmtMoney(finalPrice), note: `Paid from ${funding === 'PERSONAL' ? 'personal wealth' : cfg.studioCapitalName}` },
    { id: 'ASSETS_LIABILITIES', label: 'Investor Rights', value: 'Strategic minority position', note: 'The studio remains independently operated' },
    { id: 'OWNERSHIP_TRANSFER', label: 'Stake Register', value: 'Influence instrument', note: 'Equity is recorded at final signature' },
  ] : [
    { id: 'PURCHASE_AGREEMENT', label: 'Purchase Agreement', value: fmtMoney(finalPrice), note: `Paid from ${funding === 'PERSONAL' ? 'personal wealth' : cfg.studioCapitalName}` },
    { id: 'ASSETS_LIABILITIES', label: 'Assets + Liabilities', value: `${cfg.catalogCount} titles · ${fmtMoney(cfg.verifiedDebt + cfg.hiddenLiabilities)} debt`, note: 'Everything moves into your group' },
    { id: 'OWNERSHIP_TRANSFER', label: 'Ownership Transfer', value: 'Control instrument', note: 'The keys change hands at signature' },
  ];
  const [stamped, setStamped] = useState<string[]>([]);
  const allStamped = stamped.length === docs.length;
  return (
    <div className="sa-scene sa-closing">
      <div className="sa-topbar">
        <button className="sa-backbtn" onClick={onBack}>←</button>
        <div className="sa-topbar-mid">
          <div className="sa-kicker">Closing Packet</div>
          <div className="sa-scene-title">Stamp Every Document</div>
        </div>
        <div style={{ width: 40 }} />
      </div>
      <div className="sa-scroll">
        <div className="sa-closing-note">Three documents stand between you and {cfg.studioName}. Tap each to stamp it.</div>
        {docs.map((doc, i) => {
          const done = stamped.includes(doc.id);
          return (
            <button key={doc.id} className={`sa-closedoc${done ? ' done' : ''}`}
              style={{ animationDelay: `${i * .12}s` }}
              onClick={() => !done && setStamped(s => [...s, doc.id])}>
              <div className="sa-closedoc-body">
                <b>{doc.label}</b>
                <span className="val">{doc.value}</span>
                <span className="note">{doc.note}</span>
              </div>
              <div className="sa-closedoc-stamp">
                {done ? <div className="sa-inkstamp ok slam">REVIEWED</div> : <span>TAP TO STAMP</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="sa-foot">
        <button className={`sa-btn gold wide${allStamped ? '' : ' dead'}`} onClick={() => allStamped && onEnterSigningRoom()}>
          Enter the Signing Room <ENERGY cost={cfg.signingEnergyCost} have={cfg.playerEnergy} />
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   SCENE 7 — THE SIGNING ROOM (4-page ceremony)
   ============================================================ */

const SigningScene: React.FC<{
  cfg: StudioAcqConfig; finalPrice: number; funding: FundingSource; commitments: string[];
  onSigned: () => DealRoomAction; onBack: () => void;
}> = ({ cfg, finalPrice, funding, commitments, onSigned, onBack }) => {
  const wait = useTimers();
  const [page, setPage] = useState(0);
  const [signed, setSigned] = useState(false);
  const [signingState, setSigningState] = useState<'IDLE' | 'WRITING' | 'SEALING'>('IDLE');
  const [shake, setShake] = useState(false);
  const commitmentDefs = cfg.commitments.filter(c => commitments.includes(c.id));
  const clauses = commitmentDefs.length ? commitmentDefs.map(c => c.label)
    : ['Seller terms accepted', 'All assets transfer', 'All liabilities accepted'];
  const meter = Math.round(((page + (signed ? 1 : 0)) / 4) * 100);

  const sign = () => {
    if (signed || signingState !== 'IDLE') return;
    setSigningState('WRITING');
    wait(() => {
      setSigningState('SEALING');
      setShake(true);
    }, 980);
    wait(() => {
      const result = onSigned();
      if (!result.success) {
        setSigningState('IDLE');
        setShake(false);
        return;
      }
      setSigned(true);
    }, 1420);
    wait(() => setShake(false), 1850);
  };

  const pages = [
    {
      eyebrow: 'Clause 1 · Deal Summary',
      rows: [[cfg.transactionOutcome === 'CONTROL' ? 'Tender Price' : cfg.transactionOutcome === 'MINORITY_STAKE' ? 'Stake Price' : 'Purchase Price', fmtMoney(finalPrice)], ['Funding Source', funding === 'PERSONAL' ? 'Personal Wealth' : cfg.studioCapitalName], ['Studio', cfg.studioName]],
      body: 'Seller terms are accepted. Confirm the price, funding source, and transfer authority.',
    },
    {
      eyebrow: 'Clause 2 · Assets + Risk',
      rows: cfg.transactionOutcome === 'CONTROL'
        ? [['Existing Stake', `${(cfg.currentOwnershipPercent || 0).toFixed(2)}% credited`], ['Control Block', `+${(cfg.remainingControlPercent || 0).toFixed(2)}%`], ['Debt + Liabilities', fmtMoney(cfg.verifiedDebt + cfg.hiddenLiabilities)]]
        : [['Catalog', `${cfg.catalogCount} titles`], ['Debt + Liabilities', fmtMoney(cfg.verifiedDebt + cfg.hiddenLiabilities)], ['Expected Income', fmtMoney(cfg.expectedIncome)]],
      body: 'Review what moves into your company group when the signature lands.',
    },
    {
      eyebrow: 'Clause 3 · Binding Clauses',
      clauses,
      body: 'These promises become active obligations after the seal.',
    },
    {
      eyebrow: 'Clause 4 · Signature',
      body: 'One signature files the transfer. Funds and energy are checked first.',
    },
  ];
  const p = pages[page];

  return (
    <div className={`sa-scene sa-signing${shake ? ' shake' : ''}`}>
      <div className="sa-topbar">
        <button className="sa-backbtn" onClick={onBack}>←</button>
        <div className="sa-topbar-mid">
          <div className="sa-kicker">{cfg.transactionOutcome === 'CONTROL' ? 'Public Control Ceremony' : cfg.transactionOutcome === 'MINORITY_STAKE' ? 'Equity Closing Ceremony' : 'Studio Takeover Ceremony'}</div>
          <div className="sa-scene-title serif">{cfg.studioName}</div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="sa-meterwrap">
        <div className="sa-meter-pips">{[0, 1, 2, 3].map(i => <i key={i} className={i <= page ? 'on' : ''} />)}</div>
        <div className="sa-meter">
          <span>TAKEOVER METER</span>
          <div className="sa-meter-track"><div style={{ width: `${meter}%` }} /></div>
          <b>{meter}%</b>
        </div>
      </div>

      <div className="sa-scroll">
        <div className="sa-contract" key={page}>
          <div className="sa-contract-eyebrow">{p.eyebrow} · DOC #{cfg.contractSerial}</div>
          <div className="sa-contract-body">{p.body}</div>
          {p.rows && (
            <div className="sa-contract-rows">
              {p.rows.map(([k, v]) => <div key={k} className="sa-contract-row"><span>{k}</span><b>{v}</b></div>)}
            </div>
          )}
          {p.clauses && (
            <div className="sa-contract-clauses">
              {p.clauses.map(c => <div key={c} className="sa-bound">✓ {c}</div>)}
            </div>
          )}
          {page === 3 && (
            <>
              <div className="sa-reqrow">
                <div className={`sa-req ok`}><span>Funds</span><b>Ready</b></div>
                <div className={`sa-req${cfg.playerEnergy >= cfg.signingEnergyCost ? ' ok' : ''}`}><span>Energy</span><b>{cfg.playerEnergy}/{cfg.signingEnergyCost}E</b></div>
                <div className="sa-req ok"><span>Terms</span><b>Accepted</b></div>
              </div>
              <button className={`sa-signline${signed ? ' signed' : ''}${signingState !== 'IDLE' ? ' writing' : ''}`} onClick={sign} disabled={signingState !== 'IDLE'}>
                {signingState === 'IDLE' ? (
                  <span className="hint">Tap to sign</span>
                ) : (
                  <span className="sa-cursive">{cfg.playerName}</span>
                )}
                <div className="line" />
                <div className="who">{cfg.playerName} · Buyer of Record</div>
              </button>
              {signingState === 'SEALING' && !signed && <div className="sa-signing-status">Notary seal in progress…</div>}
              {signed && (
                <div className="sa-notary">
                  <div className="sa-inkstamp gold slam big">TRANSFER<br />APPROVED</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="sa-foot">
        {page > 0 && !signed && <button className="sa-btn ghost" onClick={() => setPage(p2 => p2 - 1)}>Previous</button>}
        {page < 3 && (
          <button className="sa-btn gold" onClick={() => setPage(p2 => p2 + 1)}>Confirm Clause · Next →</button>
        )}
        {page === 3 && !signed && (
          <button className="sa-btn gold" onClick={sign} disabled={signingState !== 'IDLE'}>
            {signingState === 'IDLE' ? <>Sign the Transfer <ENERGY cost={cfg.signingEnergyCost} have={cfg.playerEnergy} /></> : signingState === 'WRITING' ? 'Writing Signature…' : 'Applying Notary Seal…'}
          </button>
        )}
        {signed && <div className="sa-signedmsg">Filing the transfer…</div>}
      </div>
    </div>
  );
};

/* ============================================================
   SCENE 8 — ACQUIRED (gates cutscene + operating model)
   ============================================================ */

const AcquiredScene: React.FC<{
  cfg: StudioAcqConfig; finalPrice: number;
  onFinish: (model: OperatingModelId | null) => void;
}> = ({ cfg, finalPrice, onFinish }) => {
  const [model, setModel] = useState<OperatingModelId | null>(null);
  const minorityOnly = cfg.transactionOutcome === 'MINORITY_STAKE';
  const outcomeLabel = minorityOnly ? 'Stake Secured' : cfg.transactionOutcome === 'CONTROL' ? 'Control Acquired' : 'Studio Acquired';
  const confetti = useMemo(() => {
    const colors = ['#f0b429', '#ffe9a8', '#c68a12', '#ffffff', '#e8c163'];
    return Array.from({ length: 60 }).map(() => ({
      left: `${Math.random() * 100}%`,
      background: colors[Math.floor(Math.random() * colors.length)],
      animationDuration: `${2.4 + Math.random() * 2.6}s`,
      animationDelay: `${Math.random() * .8}s`,
      width: `${6 + Math.random() * 6}px`,
      height: `${10 + Math.random() * 8}px`,
    } as React.CSSProperties));
  }, []);
  return (
    <div className="sa-scene sa-acquired">
      <div className="sa-confetti">{confetti.map((s, i) => <i key={i} style={s} />)}</div>
      <div className="sa-scroll center">
        <div className="sa-gates">
          <svg viewBox="0 0 320 150">
            <path d="M20 150 V70 Q20 24 160 24 Q300 24 300 70 V150" fill="none" stroke="#8a6a20" strokeWidth="7" />
            <path d="M34 150 V72 Q34 38 160 38 Q286 38 286 72 V150" fill="none" stroke="#3a2d10" strokeWidth="3" />
            <rect x="8" y="140" width="304" height="10" fill="#2a2010" />
            {[70, 100, 130, 160, 190, 220, 250].map(x => <line key={x} x1={x} y1={54 + Math.abs(160 - x) * 0.06} x2={x} y2={150} stroke="#241c0c" strokeWidth="4" />)}
            <text x="160" y="66" textAnchor="middle" fontFamily="Georgia" fontWeight="900" fontSize="17" letterSpacing="2" fill="#ffd76a">{cfg.studioName.toUpperCase()}</text>
          </svg>
          <div className="sa-gate-glow" />
        </div>
        <div className="sa-kicker" style={{ color: '#f0b429' }}>{outcomeLabel}</div>
        <div className="sa-acq-title">{minorityOnly ? <>A strategic position in<br />{cfg.studioName}</> : <>Now part of<br />{cfg.groupName}</>}</div>
        <div className="sa-acq-stats">
          <div><span>Paid</span><b>{fmtMoney(finalPrice)}</b></div>
          <div><span>{minorityOnly ? 'Position' : cfg.transactionOutcome === 'CONTROL' ? 'Voting Control' : 'Debt Absorbed'}</span><b>{minorityOnly ? `${Math.max(0, cfg.remainingControlPercent || 0).toFixed(2)}%` : cfg.transactionOutcome === 'CONTROL' ? `${cfg.controlTargetPercent || 50}%+` : fmtMoney(cfg.verifiedDebt + cfg.hiddenLiabilities)}</b></div>
          <div><span>Income / yr</span><b className="ok">+{fmtMoney(cfg.expectedIncome)}</b></div>
        </div>

        {minorityOnly ? (
          <div className="sa-stake-note">The studio stays independent. Your stake now appears in the company position and contributes to strategic influence.</div>
        ) : (
          <>
            <div className="sa-sec center">How will you run it?</div>
            <div className="sa-models">
              {cfg.operatingModels.map(m => (
                <button key={m.id} className={`sa-model${model === m.id ? ' on' : ''}`} onClick={() => setModel(m.id)}>
                  <b>{m.label}</b>
                  <span className="ctrl">{m.control}</span>
                  <span className="ben">{m.benefits[0]} · {m.benefits[1]}</span>
                  <span className="trade">▲ {m.tradeoff}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="sa-foot">
        <button className={`sa-btn gold wide${minorityOnly || model ? '' : ' dead'}`} onClick={() => minorityOnly ? onFinish(null) : model && onFinish(model)}>
          {minorityOnly ? 'Return to Forbes →' : 'Enter Your Empire →'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   ROOT — THE DEAL ROOM
   ============================================================ */

const responseKeyForCase = (acquisitionCase?: AcquisitionCase): string => (
  `${acquisitionCase?.offer?.round || acquisitionCase?.sellerResponse?.round || 0}:${acquisitionCase?.sellerResponse?.decision || acquisitionCase?.status || 'NONE'}`
);

const phaseForCase = (acquisitionCase?: AcquisitionCase): AcqPhase => {
  if (acquisitionCase?.status === 'ACQUIRED') return 'ACQUIRED';
  if (acquisitionCase?.status === 'OFFER_SUBMITTED') return 'ENVELOPE';
  if (acquisitionCase?.status === 'ACCEPTED' || acquisitionCase?.status === 'COUNTERED' || acquisitionCase?.status === 'RIVAL_BID' || acquisitionCase?.status === 'REJECTED') {
    if (acquisitionCase.presentation?.closingStage === 'SIGNING') return 'SIGNING';
    if (acquisitionCase.presentation?.closingStage === 'CLOSING') return 'CLOSING';
    return acquisitionCase.presentation?.responseSeenKey === responseKeyForCase(acquisitionCase) ? 'RESPONSE' : 'BREAKING';
  }
  // Diligence reveals the dossier; the player deliberately opens the War Room.
  // This also makes reopened files predictable instead of skipping a designed scene.
  return 'DOSSIER';
};

const actionFailureCopy = (reason?: string): string => {
  const energyMatch = reason?.match(/^Needs (\d+)E$/);
  if (energyMatch) {
    return `You need ${energyMatch[1]} energy to continue. Your money and shares are safe.`;
  }
  switch (reason) {
    case 'INSUFFICIENT_FUNDS': return 'You do not have enough money in the selected account. Nothing was charged.';
    case 'FUNDING_SOURCE_UNAVAILABLE': return 'That payment option is no longer available. Choose another way to pay.';
    case 'REGULATOR_REVIEW_ACTIVE': return 'This deal is temporarily on hold. Advance a few weeks, then try again.';
    case 'COOLDOWN_ACTIVE': return 'The studio is not ready for another offer yet. Check back in a few weeks.';
    case 'INVALID_OFFER_TERMS': return 'The board will not consider these terms. Adjust your offer and try again.';
    case 'OFFER_ALREADY_SUBMITTED': return 'Your offer is already with the board. Advance one week to receive their answer.';
    case 'CASE_NOT_ACCEPTED': return 'The seller has not accepted the deal yet. Check their latest response first.';
    case 'MINORITY_NOT_OWNERSHIP': return 'This offer only buys a smaller stake. You need control of the studio before it can join your empire.';
    case 'COUNTER_NOT_AVAILABLE': return 'That counteroffer has ended. Return to Forbes to check the latest deal.';
    case 'ALREADY_OWNED': return 'This studio is already in your group.';
    case 'STOCK_NOT_FOUND': return 'We could not find this company in the stock market. Your money and shares are safe.';
    case 'CONTROL_NOT_READY': return 'You do not own enough of the company yet. Check your ownership in Stocks and try again.';
    case 'CASE_NOT_FOUND':
    case 'CASE_NOT_ACTIONABLE': return 'This deal is no longer available. Nothing was charged. Return to Forbes to see the latest status.';
    case 'STUDIO_NOT_FOUND':
    case 'NOT_ACQUIRED_STUDIO': return 'We could not finish adding this studio to your empire. Your money and shares are safe. Return to Forbes and open the studio again.';
    case 'STREAMING_PLATFORM_RESERVED': return 'This company cannot join your studio empire yet. Your shares are safe and nothing was charged.';
    case 'PLAYER_OWNED': return 'This studio is already part of your empire.';
    case 'NOT_FOR_SALE': return 'This studio is not accepting offers right now.';
    case 'OFFER_TYPE_UNAVAILABLE': return 'That type of offer is not available for this studio. Choose another option.';
    default: return 'We could not finish that action. Nothing was charged. Review the deal or return to Forbes and try again.';
  }
};

export const StudioAcquisitionDealRoom: React.FC<StudioAcquisitionDealRoomProps> = ({
  config,
  acquisitionCase,
  studioFunding,
  onImmersiveChange,
  onClose,
  onRunDiligence,
  onSubmitOffer,
  onAcceptCounter,
  onReviseOffer,
  onBeatRival,
  onWalkAway,
  onCompleteAcquisition,
  onSetOperatingModel,
  onUpdatePresentation,
}) => {
  useEffect(() => {
    onImmersiveChange?.(true);
    return () => onImmersiveChange?.(false);
  }, [onImmersiveChange]);
  const cfg = useMemo<StudioAcqConfig>(() => ({ ...DEFAULT_ACQ_CONFIG, ...config }), [config]);
  const initialOfferReference = cfg.offerReferenceValue || (
    cfg.marketType === 'PUBLIC'
      ? Math.round(cfg.valuation * ((cfg.remainingControlPercent || 0) / 100))
      : cfg.valuation
  );
  const caseKey = `${acquisitionCase?.status || 'DRAFT'}:${acquisitionCase?.offer?.round || 0}:${acquisitionCase?.sellerResponse?.respondedWeek || 0}:${acquisitionCase?.presentation?.responseSeenKey || ''}:${acquisitionCase?.presentation?.closingStage || ''}`;
  const [phase, setPhase] = useState<AcqPhase>(() => phaseForCase(acquisitionCase));
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(() => ({
    structure: cfg.isPrivateControlUpgrade ? 'FULL' : cfg.marketType === 'PUBLIC' || acquisitionCase?.offer?.type === 'MINORITY' ? 'MINORITY' : 'FULL',
    minorityPct: acquisitionCase?.offer?.minorityPercent || (cfg.marketType === 'PUBLIC' ? Math.max(5, cfg.remainingControlPercent || 5) : 25),
    amount: acquisitionCase?.offer?.amount || initialOfferReference,
    commitments: acquisitionCase?.offer?.commitments || [],
    funding: acquisitionCase?.offer?.funding.source || (cfg.marketType === 'PUBLIC' ? 'PERSONAL' : null),
  }));
  const lastCaseKey = useRef(caseKey);
  const responseTransitionLock = useRef(false);
  const actionPendingRef = useRef(false);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (lastCaseKey.current === caseKey) return;
    lastCaseKey.current = caseKey;
    setDraft({
      structure: cfg.isPrivateControlUpgrade ? 'FULL' : cfg.marketType === 'PUBLIC' || acquisitionCase?.offer?.type === 'MINORITY' ? 'MINORITY' : 'FULL',
      minorityPct: acquisitionCase?.offer?.minorityPercent || (cfg.marketType === 'PUBLIC' ? Math.max(5, cfg.remainingControlPercent || 5) : 25),
      amount: acquisitionCase?.offer?.amount || initialOfferReference,
      commitments: acquisitionCase?.offer?.commitments || [],
      funding: acquisitionCase?.offer?.funding.source || (cfg.marketType === 'PUBLIC' ? 'PERSONAL' : null),
    });
    setPhase(phaseForCase(acquisitionCase));
    responseTransitionLock.current = false;
    actionPendingRef.current = false;
    setActionPending(false);
  }, [acquisitionCase, caseKey, cfg.isPrivateControlUpgrade, cfg.marketType, cfg.remainingControlPercent, cfg.valuation, initialOfferReference]);

  const diligenceDone = acquisitionCase?.diligence?.status === 'COMPLETE';
  const sellerResponse = acquisitionCase?.sellerResponse;
  const directControlReady = cfg.marketType === 'PUBLIC' && (cfg.currentOwnershipPercent || 0) >= (cfg.controlTargetPercent || 50);
  const decision = (sellerResponse?.decision || (directControlReady ? 'ACCEPTED' : 'COUNTERED')) as SellerDecision;
  const counterAmount = sellerResponse?.counterAmount || sellerResponse?.agreedAmount || 0;
  const rivalAmount = sellerResponse?.rivalAmount || sellerResponse?.requiredBidAmount || 0;
  const round = sellerResponse?.round || acquisitionCase?.offer?.round || 1;
  const finalPrice = sellerResponse?.agreedAmount || sellerResponse?.counterAmount || acquisitionCase?.offer?.amount || draft.amount;
  const funding: FundingSource = acquisitionCase?.offer?.funding.source || draft.funding || 'PERSONAL';
  const commitments = acquisitionCase?.offer?.commitments || draft.commitments;
  const transactionOutcome: NonNullable<StudioAcqConfig['transactionOutcome']> = acquisitionCase?.closing?.outcome
    || (cfg.marketType === 'PUBLIC' ? 'CONTROL' : acquisitionCase?.offer?.type === 'MINORITY' || draft.structure === 'MINORITY' ? 'MINORITY_STAKE' : 'FULL_BUYOUT');
  const sceneCfg = useMemo(() => ({ ...cfg, transactionOutcome }), [cfg, transactionOutcome]);

  const fundingFor = (source: FundingSource): AcquisitionFundingSelection | null => (
    source === 'PERSONAL' ? { source: 'PERSONAL' } : studioFunding || null
  );
  const handleResult = (result: DealRoomAction, nextPhase?: AcqPhase) => {
    if (!result.success) {
      setNotice(actionFailureCopy(result.reason));
      return false;
    }
    setNotice(null);
    if (nextPhase) setPhase(nextPhase);
    return true;
  };
  const runStrategicAction = (action: () => DealRoomAction, nextPhase: AcqPhase) => {
    if (actionPendingRef.current) return false;
    actionPendingRef.current = true;
    setActionPending(true);
    const didSucceed = handleResult(action(), nextPhase);
    if (!didSucceed) {
      actionPendingRef.current = false;
      setActionPending(false);
    }
    return didSucceed;
  };
  const runDiligence = (source: FundingSource) => {
    const fundingSelection = fundingFor(source);
    if (!fundingSelection) {
      setNotice('No production-house funding source is available for this file. Use personal wealth or open a production house first.');
      return false;
    }
    return handleResult(onRunDiligence(fundingSelection));
  };
  const fileOffer = () => {
    if (directControlReady) {
      setNotice(null);
      setPhase('BREAKING');
      return;
    }
    const fundingSelection = fundingFor(draft.funding || 'PERSONAL');
    if (!fundingSelection) {
      setNotice('Choose an available funding source before filing the opening offer.');
      return;
    }
    runStrategicAction(() => onSubmitOffer({
      offerType: draft.structure === 'MINORITY' ? 'MINORITY' : 'FAIR',
      offerAmount: draft.amount,
      minorityPercent: draft.structure === 'MINORITY' ? draft.minorityPct : undefined,
      funding: fundingSelection,
      commitments: draft.commitments as AcquisitionCommitmentId[],
    }), 'ENVELOPE');
  };
  const acceptCounter = () => runStrategicAction(onAcceptCounter, 'BREAKING');
  const revise = (amount: number) => runStrategicAction(() => onReviseOffer(amount), 'ENVELOPE');
  const beatRival = (amount: number) => runStrategicAction(() => onBeatRival(amount), 'ENVELOPE');
  const walkAway = () => {
    if (handleResult(onWalkAway())) onClose();
  };
  const sign = () => {
    const result = onCompleteAcquisition();
    if (handleResult(result)) setPhase('ACQUIRED');
    return result;
  };
  const finish = (model: OperatingModelId | null) => {
    if (!model) {
      onClose();
      return;
    }
    if (handleResult(onSetOperatingModel(model as SubsidiaryOperatingModel))) onClose();
  };
  const recordPresentation = (patch: NonNullable<AcquisitionCase['presentation']>) => {
    if (!onUpdatePresentation || !acquisitionCase) return;
    // This only records where to resume. It must never block a known deal decision.
    onUpdatePresentation(patch);
  };
  const revealResponse = () => {
    if (responseTransitionLock.current) return;
    responseTransitionLock.current = true;
    // The response is already known. Enter it immediately; persistence only
    // records the resume point and must never make the player tap again.
    setPhase('RESPONSE');
    recordPresentation({ responseSeenKey: responseKeyForCase(acquisitionCase), closingStage: 'RESPONSE' });
  };
  const proceedToClosing = () => {
    setPhase('CLOSING');
    recordPresentation({ closingStage: 'CLOSING' });
  };
  const enterSigning = () => {
    setPhase('SIGNING');
    recordPresentation({ closingStage: 'SIGNING' });
  };

  return (
    <div className="sa-stage" role="dialog" aria-modal="true" aria-label={`${cfg.studioName} acquisition deal room`}>
      <style>{STYLE}</style>
      {notice && (
        <div className="sa-veil sa-block" role="alertdialog" aria-modal="true">
          <div className="sa-sheet">
            <div className="sa-sheet-grip" />
            <div className="sa-sheet-title">Deal status</div>
            <p className="sa-block-copy">{notice}</p>
            <button type="button" className="sa-btn gold wide" onClick={() => setNotice(null)}>Review deal</button>
            <button type="button" className="sa-btn ghost wide" onClick={onClose}>Return to Forbes</button>
          </div>
        </div>
      )}
      {phase === 'DOSSIER' && <DossierScene cfg={sceneCfg} diligenceDone={diligenceDone} onRunDiligence={runDiligence} onContinue={() => setPhase('WARROOM')} onClose={onClose} />}
      {phase === 'WARROOM' && <WarRoomScene cfg={sceneCfg} diligenceDone={diligenceDone} draft={draft} setDraft={setDraft} actionPending={actionPending} onFile={fileOffer} onBack={() => setPhase('DOSSIER')} />}
      {phase === 'ENVELOPE' && <EnvelopeScene cfg={sceneCfg} draft={draft} onClose={onClose} />}
      {phase === 'BREAKING' && <BreakingScene cfg={sceneCfg} decision={decision} amount={decision === 'RIVAL_BID' ? rivalAmount : counterAmount || finalPrice} onDone={revealResponse} />}
      {phase === 'RESPONSE' && <ResponseScene cfg={sceneCfg} decision={decision} offerAmount={acquisitionCase?.offer?.amount || draft.amount} counterAmount={counterAmount} rivalAmount={rivalAmount} requiredBidAmount={sellerResponse?.requiredBidAmount || rivalAmount} round={round} actionPending={actionPending} onAcceptCounter={acceptCounter} onRevise={revise} onBeatRival={beatRival} onWalkAway={walkAway} onProceedToClosing={proceedToClosing} onBackToWarRoom={() => setPhase('WARROOM')} onClose={onClose} />}
      {phase === 'CLOSING' && <ClosingScene cfg={sceneCfg} finalPrice={finalPrice} funding={funding} onEnterSigningRoom={enterSigning} onBack={() => setPhase('RESPONSE')} />}
      {phase === 'SIGNING' && <SigningScene cfg={sceneCfg} finalPrice={finalPrice} funding={funding} commitments={commitments} onSigned={sign} onBack={() => setPhase('CLOSING')} />}
      {phase === 'ACQUIRED' && <AcquiredScene cfg={sceneCfg} finalPrice={finalPrice} onFinish={finish} />}
    </div>
  );
};

export default StudioAcquisitionDealRoom;

/* ============================================================
   STYLE
   ============================================================ */
const STYLE = `
.sa-stage{position:fixed;inset:0;z-index:90;max-width:520px;margin:0 auto;background:#050506;overflow:hidden;color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --gold:#f0b429;--gold-deep:#c68a12;--paper:#efe8d2;--manila:#c9a86a;
  --serif:"Georgia","Times New Roman",serif}
.sa-stage :where(*){margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.sa-stage :where(button){font-family:inherit;border:none;background:none;color:inherit;cursor:pointer;text-align:inherit}
.sa-stage :where(button):focus-visible{outline:3px solid #ffe29a;outline-offset:3px}
.sa-scene{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;
  background:radial-gradient(circle at 18% 8%,rgba(245,158,11,.16),transparent 32%),radial-gradient(circle at 82% 100%,rgba(120,53,15,.25),transparent 45%),linear-gradient(180deg,#120d07 0%,#050506 60%,#020202 100%)}
.sa-block{z-index:100;align-items:flex-end;padding:18px}
.sa-block-copy{margin:0 0 16px;color:#d6c9b0;font-size:14px;font-weight:700;line-height:1.45}
.sa-break-continue{position:absolute;z-index:4;left:50%;bottom:42px;transform:translateX(-50%);white-space:nowrap}
.sa-break-continue:disabled{cursor:wait;filter:saturate(.72);box-shadow:none}
.sa-center{align-items:center;justify-content:center;text-align:center;padding:28px;gap:16px}
@keyframes sa-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes sa-in{from{opacity:0}to{opacity:1}}
@keyframes sa-blink{50%{opacity:.25}}
.sa-devnav{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:999;display:flex;gap:3px;background:rgba(10,10,10,.75);border:1px solid rgba(255,255,255,.08);padding:4px 6px;border-radius:999px;backdrop-filter:blur(10px);opacity:.22;transition:.3s}
.sa-devnav:hover{opacity:1}
.sa-devnav button{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#888;padding:4px 6px;border-radius:999px;font-weight:800}
.sa-devnav button.cur{background:var(--gold);color:#000}

/* chrome */
.sa-topbar{display:flex;align-items:center;gap:10px;padding:20px 16px 10px;z-index:5}
.sa-backbtn{width:40px;height:40px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:17px;display:flex;align-items:center;justify-content:center}
.sa-topbar-mid{flex:1;text-align:center}
.sa-kicker{font-size:9px;font-weight:900;letter-spacing:.42em;text-transform:uppercase;color:var(--gold)}
.sa-scene-title{font-size:20px;font-weight:900;letter-spacing:-.01em;margin-top:4px}
.sa-scene-title.serif{font-family:var(--serif);font-style:italic}
.sa-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 16px 120px}
.sa-scroll.center{display:flex;flex-direction:column;align-items:center;text-align:center}
.sa-foot{position:absolute;left:0;right:0;bottom:0;padding:14px 16px 22px;display:flex;gap:10px;background:linear-gradient(transparent,#050506 45%);z-index:20}
.sa-btn{flex:1;padding:15px 14px;border-radius:16px;font-size:12px;font-weight:900;letter-spacing:.05em;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);transition:transform .12s}
.sa-btn:active{transform:scale(.97)}
.sa-btn.gold{background:linear-gradient(160deg,#ffd76a,var(--gold-deep));color:#1a1102;border:none;box-shadow:0 12px 34px rgba(240,180,41,.25)}
.sa-btn.ghost{background:transparent;color:#9a958c}
.sa-btn.wide{flex:1}
.sa-btn.dead{opacity:.35;pointer-events:none}
.sa-btnrow{display:flex;gap:8px;width:100%;max-width:400px}
.sa-energy{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;letter-spacing:.08em;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.25);border:1px solid rgba(0,0,0,.2)}
.sa-btn:not(.gold) .sa-energy{background:rgba(240,180,41,.12);border-color:rgba(240,180,41,.3);color:#ffd76a}
.sa-energy.low{color:#ff8b96;border-color:rgba(255,90,110,.4)}
.sa-rival-minimum{font-size:11px;font-weight:800;letter-spacing:.04em;color:#c8bda7;margin-top:-6px}.sa-rival-minimum b{color:#ffd76a;margin-left:5px}
.sa-sec{display:flex;align-items:baseline;gap:8px;font-size:9px;font-weight:900;letter-spacing:.34em;text-transform:uppercase;color:#8a8272;margin:20px 2px 10px}
.sa-sec em{font-style:normal;font-size:8px;letter-spacing:.08em;color:#5c564c;text-transform:none;font-weight:700}
.sa-sec.center{justify-content:center}

/* ===== dossier ===== */
.sa-folder{margin-top:8px;animation:sa-up .5s both}
.sa-folder-tab{display:inline-block;background:var(--manila);color:#3a2c10;font-size:8px;font-weight:900;letter-spacing:.2em;padding:7px 14px 5px;border-radius:8px 8px 0 0;margin-left:12px}
.sa-folder-body{background:linear-gradient(180deg,#d8b97b,#c9a86a 30%,#bd9c5c);border-radius:14px;padding:16px;color:#2b2008;box-shadow:0 24px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.25);position:relative}
.sa-folder-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border-bottom:2px solid rgba(58,44,16,.35);padding-bottom:12px;margin-bottom:12px}
.sa-doss-arch{font-size:8.5px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#6b5320}
.sa-doss-name{font-family:var(--serif);font-size:26px;font-weight:900;line-height:1.05;margin-top:4px}
.sa-doss-val{text-align:right;flex-shrink:0}
.sa-doss-val span{display:block;font-size:7px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#6b5320}
.sa-doss-val b{font-size:21px;font-family:ui-monospace,Menlo,monospace}
.sa-doss-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sa-doss-cell{background:rgba(255,248,230,.55);border:1px solid rgba(58,44,16,.2);border-radius:10px;padding:9px 11px}
.sa-doss-cell span{display:block;font-size:7px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#6b5320}
.sa-doss-cell b{font-size:13px}
.sa-market-position{margin-top:12px;background:rgba(255,248,230,.42);border:1px solid rgba(58,44,16,.25);border-radius:12px;padding:0 11px 11px}
.sa-market-position .sa-doss-sec{margin-top:11px}
.sa-position-head{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.sa-position-head div{min-width:0;background:rgba(255,248,230,.55);border:1px solid rgba(58,44,16,.18);border-radius:8px;padding:8px 6px;text-align:center}
.sa-position-head span{display:block;font-size:6.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#6b5320}
.sa-position-head b{display:block;font:800 12px ui-monospace,Menlo,monospace;margin-top:3px;white-space:nowrap}
.sa-position-track{height:8px;border-radius:999px;background:rgba(42,32,10,.2);overflow:hidden;margin-top:9px}
.sa-position-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#1d6b3f,#e3a927)}
.sa-position-note{font-size:8.5px;line-height:1.45;font-weight:700;color:#5c481c;margin-top:7px}
.sa-position-ledger{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:9px}
.sa-position-ledger div{min-width:0;border-top:1px dashed rgba(58,44,16,.25);padding-top:6px}
.sa-position-ledger span{display:block;font-size:6px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#6b5320}
.sa-position-ledger b{display:block;margin-top:3px;font:800 10px ui-monospace,Menlo,monospace;white-space:nowrap}
.sa-position-ledger b.ok{color:#1d6b3f}
.sa-doss-sec{margin:16px 0 8px;font-size:8.5px;font-weight:900;letter-spacing:.24em;text-transform:uppercase;color:#4a3812;display:flex;justify-content:space-between;align-items:center}
.sa-doss-sec em{font-style:normal;font-size:7.5px;letter-spacing:.14em;color:#8f1524}
.sa-doss-sec em.ok{color:#1d6b3f}
.sa-doss-rows{display:flex;flex-direction:column;gap:6px}
.sa-doss-row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,248,230,.55);border:1px solid rgba(58,44,16,.2);border-radius:10px;padding:10px 12px;font-size:11.5px;font-weight:700}
.sa-doss-row span{color:#5c481c;font-size:10px;font-weight:800}
.sa-doss-row.flag{justify-content:flex-start}
.sa-doss-row.flag span{color:#8f1524}
.sa-redacted{display:flex;gap:4px;flex:0 0 45%;justify-content:flex-end}
.sa-redacted i{display:block;height:12px;width:70%;background:#191408;border-radius:2px}
.sa-revealed{font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#1d3b16}
.sa-revealed.burn{animation:sa-burn .7s both}
@keyframes sa-burn{0%{clip-path:inset(0 100% 0 0);text-shadow:0 0 14px rgba(240,140,20,.9)}100%{clip-path:inset(0 0 0 0);text-shadow:none}}
.sa-doss-stampzone{height:44px;position:relative;margin-top:8px}
.sa-inkstamp{display:inline-block;border:3px solid #1d6b3f;color:#1d6b3f;font-weight:900;letter-spacing:.18em;font-size:13px;padding:5px 14px;border-radius:6px;transform:rotate(-8deg);opacity:.9}
.sa-inkstamp.ok{border-color:#1d6b3f;color:#1d6b3f}
.sa-inkstamp.bad{border-color:#8f1524;color:#8f1524}
.sa-inkstamp.gold{border-color:var(--gold);color:var(--gold);background:rgba(20,14,4,.7)}
.sa-inkstamp.big{font-size:20px;padding:10px 20px}
.sa-inkstamp.slam{animation:sa-slam .45s cubic-bezier(.2,1.6,.3,1) both}
@keyframes sa-slam{0%{opacity:0;transform:rotate(-8deg) scale(2.6)}60%{opacity:1;transform:rotate(-8deg) scale(.92)}100%{transform:rotate(-8deg) scale(1)}}
.sa-doss-stampzone .sa-inkstamp{position:absolute;right:8px;top:0;animation:sa-slam .5s .5s both}
.sa-blindwarn{margin-top:10px;text-align:center;font-size:10px;font-weight:800;color:#ff9640;background:rgba(140,70,10,.14);border:1px solid rgba(255,150,64,.3);border-radius:10px;padding:9px 12px}
/* diligence sheet + scan */
.sa-veil{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);animation:sa-in .2s}
.sa-sheet{position:absolute;left:0;right:0;bottom:0;background:#15130f;border-radius:24px 24px 0 0;border-top:1px solid rgba(240,180,41,.3);padding:10px 16px 28px;display:flex;flex-direction:column;gap:9px;animation:sa-sheetup .3s cubic-bezier(.2,1,.3,1)}
@keyframes sa-sheetup{from{transform:translateY(50%)}to{transform:none}}
.sa-sheet-grip{width:42px;height:5px;border-radius:3px;background:#2c2a24;margin:2px auto 8px}
.sa-sheet-title{font-size:15px;font-weight:900;text-align:center;margin-bottom:6px}
.sa-scanveil{position:absolute;inset:0;z-index:70;background:rgba(2,2,3,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;animation:sa-in .3s}
.sa-scanline{width:min(300px,76%);height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);animation:sa-scan 1.1s ease-in-out infinite;box-shadow:0 0 22px rgba(240,180,41,.6)}
@keyframes sa-scan{0%,100%{transform:translateY(-34px)}50%{transform:translateY(34px)}}
.sa-scantext{font-size:10px;font-weight:900;letter-spacing:.34em;color:#b9a05a;animation:sa-blink 1s infinite}

/* ===== war room ===== */
.sa-structrow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sa-struct{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:4px;transition:.2s}
.sa-struct b{font-size:12.5px}
.sa-struct span{font-size:9px;color:#8a857b;line-height:1.35}
.sa-struct.on{border-color:rgba(240,180,41,.6);background:rgba(56,40,10,.4)}
.sa-public-tender{border:1px solid rgba(73,198,255,.35);background:linear-gradient(145deg,rgba(8,38,50,.72),rgba(18,22,28,.78));border-radius:15px;padding:14px}
.sa-public-tender-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.sa-public-tender-head b{font-size:13px}
.sa-public-tender-head span{font-size:7.5px;font-weight:900;letter-spacing:.12em;color:#62d1ff;text-transform:uppercase;text-align:right}
.sa-public-tender-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:12px}
.sa-public-tender-grid div{min-width:0;border-top:1px solid rgba(98,209,255,.18);padding-top:8px;text-align:center}
.sa-public-tender-grid span{display:block;font-size:6.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7f929b}
.sa-public-tender-grid b{display:block;font:800 13px ui-monospace,Menlo,monospace;color:#d9f5ff;margin-top:3px;white-space:nowrap}
.sa-public-tender p{font-size:9px;line-height:1.45;color:#91a4ad;margin:11px 0 0}
.sa-public-ledger{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:11px}
.sa-public-ledger div{min-width:0;padding:8px;border:1px solid rgba(98,209,255,.14);border-radius:9px;background:rgba(3,14,19,.28)}
.sa-public-ledger span{display:block;font-size:6.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7f929b}
.sa-public-ledger b{display:block;margin-top:3px;font:800 11px ui-monospace,Menlo,monospace;color:#d9f5ff;white-space:nowrap}
.sa-public-ledger b.ok{color:#65e6b2}
.sa-market-position.private{border-color:rgba(240,180,41,.34);background:linear-gradient(145deg,rgba(52,36,8,.48),rgba(17,17,19,.7))}
.sa-market-position.private .sa-position-track{background:rgba(240,180,41,.12)}
.sa-position-track.private i{background:linear-gradient(90deg,#f0b429,#ffd76a)}
.sa-doss-sec em.gold{color:#ffd76a}
.sa-private-control{border-top:1px solid rgba(240,180,41,.38);border-bottom:1px solid rgba(240,180,41,.18);padding:13px 2px 12px;background:linear-gradient(90deg,rgba(240,180,41,.08),transparent 72%)}
.sa-private-control-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.sa-private-control-head span{display:block;font-size:7px;font-weight:900;letter-spacing:.2em;color:#f0b429}
.sa-private-control-head b{display:block;margin-top:3px;font-family:var(--serif);font-size:19px;font-style:italic}
.sa-private-control-head strong{font:800 9px ui-monospace,Menlo,monospace;color:#ffd76a;border:1px solid rgba(240,180,41,.35);border-radius:999px;padding:6px 8px;white-space:nowrap}
.sa-private-control-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:7px;margin-top:13px}
.sa-private-control-flow div{min-width:0;border-top:1px solid rgba(255,255,255,.1);padding-top:7px}
.sa-private-control-flow span{display:block;font-size:6px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#817b70}
.sa-private-control-flow b{display:block;margin-top:3px;font:800 12px ui-monospace,Menlo,monospace;color:#eee7d8;white-space:nowrap}
.sa-private-control-flow i{font-style:normal;font-size:11px;color:#8d7640}
.sa-private-control p{font-size:9px;line-height:1.5;color:#968f82;margin:11px 0 0}
.sa-pctrow{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:10px}
.sa-pct{text-align:center}
.sa-pct b{font-size:22px;font-family:ui-monospace,Menlo,monospace}
.sa-pct span{display:block;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#8a857b;font-weight:800}
.sa-stepbtn{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sa-stepbtn:active{transform:scale(.94)}
.sa-stepbtn.big{width:52px;height:52px;font-size:24px}
.sa-dial{display:flex;align-items:center;gap:14px;justify-content:center;background:rgba(255,255,255,.035);border:1px solid rgba(240,180,41,.25);border-radius:18px;padding:14px}
.sa-dial.small{width:100%;max-width:380px}
.sa-dial-amt{flex:1;text-align:center;min-width:0}
.sa-dial-amt b{display:block;font-size:31px;font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#ffd76a;letter-spacing:-.02em}
.sa-dial-amt span{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#8a857b;font-weight:800}
.sa-presets{display:flex;gap:6px;margin-top:8px}
.sa-presets button{flex:1;font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#c9c2b2;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:9px 4px;text-align:center}
.sa-presets button:active{background:rgba(240,180,41,.2)}
.sa-gauge{margin:14px auto 0;text-align:center;max-width:230px}
.sa-gauge svg{width:100%;display:block}
.sa-gauge-label{font-size:15px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-top:2px}
.sa-gauge-note{font-size:9.5px;color:#8a857b;margin-top:3px}
.sa-clauses{display:flex;flex-direction:column;gap:7px}
.sa-clause{display:flex;align-items:center;gap:11px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:13px;padding:11px 13px;transition:.2s}
.sa-clause .chk{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#8a857b;flex-shrink:0}
.sa-clause b{font-size:12px;display:block}
.sa-clause span{font-size:9px;color:#8a857b}
.sa-clause.on{border-color:rgba(87,227,137,.45);background:rgba(20,60,35,.25)}
.sa-clause.on .chk{background:#57e389;color:#052613}
.sa-vaults{display:flex;flex-direction:column;gap:8px}
.sa-vault{display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:14px;padding:12px;transition:.2s;width:100%}
.sa-vault b{display:block;font-size:12.5px}
.sa-vault span{display:block;font-size:9px;color:#8a857b;margin-top:2px}
.sa-vault span.ok{color:#57e389}
.sa-vault span.heat{color:#ff9640;display:flex;align-items:center;gap:6px}
.sa-heat{display:inline-block;width:54px;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.sa-heat i{display:block;height:100%;background:linear-gradient(90deg,#57e389,#f0b429,#ff5c6a)}
.sa-vault.on{border-color:rgba(240,180,41,.6);background:rgba(56,40,10,.35)}
.sa-vault.dead{opacity:.4;pointer-events:none}
.sa-vault-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.sa-vault-ic.personal{background:rgba(92,184,255,.12);border:1px solid rgba(92,184,255,.3)}
.sa-vault-ic.studio{background:rgba(190,140,255,.12);border:1px solid rgba(190,140,255,.3)}

/* ===== envelope ===== */
.sa-env-stage{position:relative;width:min(320px,84%);height:340px}
.sa-env-paper{position:absolute;left:50%;top:0;transform:translateX(-50%);width:86%;background:var(--paper);color:#221a08;border-radius:6px;padding:22px 18px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.7);transition:all .9s cubic-bezier(.5,0,.3,1);z-index:2}
.sa-env-paper .k{font-size:8px;font-weight:900;letter-spacing:.24em;text-transform:uppercase;color:#7a5c1c}
.sa-env-paper b{display:block;font-size:34px;font-family:ui-monospace,Menlo,monospace;margin:10px 0 6px}
.sa-env-paper span{font-size:10px;color:#5c4c22;font-weight:700}
.sa-env-paper.folded{top:140px;transform:translateX(-50%) scaleY(.12);opacity:0}
.sa-env-envelope{position:absolute;left:50%;bottom:30px;transform:translateX(-50%) translateY(40px);width:100%;height:170px;background:linear-gradient(#20180c,#171008);border:1.5px solid #6b5320;border-radius:10px;opacity:0;transition:all .7s cubic-bezier(.3,1.2,.4,1);display:flex;align-items:center;justify-content:center}
.sa-env-envelope .flap{position:absolute;left:0;right:0;top:0;height:74px;background:linear-gradient(#2a2010,#20180c);clip-path:polygon(0 0,100% 0,50% 100%);border-radius:10px 10px 0 0}
.sa-env-envelope.up{opacity:1;transform:translateX(-50%) translateY(0)}
.sa-waxseal{width:64px;height:64px;z-index:3;animation:sa-slamseal .5s .35s cubic-bezier(.2,1.8,.3,1) both;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6))}
.sa-waxseal.small{width:44px;height:44px}
@keyframes sa-slamseal{0%{opacity:0;transform:scale(2.4) rotate(-16deg)}60%{opacity:1;transform:scale(.9) rotate(3deg)}100%{transform:scale(1) rotate(0)}}
.sa-filedstamp{position:absolute;bottom:14px;left:50%;transform:translateX(-50%) rotate(-4deg);font-size:11px;font-weight:900;letter-spacing:.22em;color:var(--gold);border:2.5px solid var(--gold);border-radius:6px;padding:5px 12px;opacity:.9;animation:sa-slam .4s .8s both;white-space:nowrap}
.sa-waiting{animation:sa-in .8s}
.sa-wait-title{font-family:var(--serif);font-size:27px;font-style:italic;margin:14px 0 10px}
.sa-wait-sub{font-size:11px;color:#8a857b}
.sa-wait-file{width:min(340px,88vw);margin:20px auto 0;border:1px solid rgba(240,180,41,.25);border-radius:14px;overflow:hidden;text-align:left;background:rgba(255,255,255,.025)}
.sa-wait-file div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
.sa-wait-file div:last-child{border-bottom:0}
.sa-wait-file span{font-size:7px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#77736b}
.sa-wait-file b{font-size:9px;text-align:right;color:#ddd6c8}
.sa-wait-file b.ok{color:#57e389}
.sa-wait-note{width:min(330px,86vw);margin:12px auto 0;font-size:9px;line-height:1.45;color:#77736b}
.sa-dots::after{content:"...";display:inline-block;overflow:hidden;vertical-align:bottom;animation:sa-dotty 1.2s steps(4) infinite;width:0;white-space:nowrap}
@keyframes sa-dotty{to{width:1.3em}}

/* ===== breaking ===== */
.sa-breaking{background:#040405;align-items:center;padding:0 0 34px}
.sa-break-top{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:64px 26px 6px;flex-shrink:0}
.sa-break-bar{font-size:13px;font-weight:900;letter-spacing:.4em;padding:9px 26px;border-radius:4px;animation:sa-slam .4s both}
.sa-break-bar.red{background:#c11228;color:#fff}
.sa-break-bar.gold{background:var(--gold);color:#1a1102}
.sa-break-bar.sky{background:#1b4b9c;color:#fff}
.sa-break-head{font-family:var(--serif);font-size:42px;font-weight:900;font-style:italic;line-height:1;letter-spacing:-.01em;animation:sa-up .5s .2s both;text-transform:uppercase}
.sa-break-sub{font-size:12px;color:#b9b4a6;font-weight:700;animation:sa-up .5s .35s both}
.sa-feed{flex:1;width:100%;max-width:400px;padding:16px 20px;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:9px;pointer-events:none}
.sa-feed-card{border-radius:13px;padding:11px 13px;transform:rotate(var(--tilt,0deg));opacity:0;animation:sa-feedpop .5s cubic-bezier(.2,1.4,.4,1) both;box-shadow:0 10px 26px rgba(0,0,0,.45)}
@keyframes sa-feedpop{0%{opacity:0;transform:rotate(var(--tilt,0deg)) translateY(22px) scale(.9)}100%{opacity:1;transform:rotate(var(--tilt,0deg)) translateY(0) scale(1)}}
.sa-feed-card p{font-size:12px;line-height:1.45;font-weight:600}
.sa-feed-card .row{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.sa-feed-card .row b{font-size:11px;font-weight:900}
.sa-feed-card .row em{font-style:normal;font-size:9px;color:#77726a}
.sa-feed-card .av{width:22px;height:22px;border-radius:50%;background:#26262c;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.sa-feed-card .av.ig{background:conic-gradient(from 200deg,#f0b429,#e1306c,#833ab4,#f0b429)}
.sa-feed-card .meta{margin-top:7px;font-size:9.5px;font-weight:800;color:#77726a;letter-spacing:.04em}
.sa-feed-card.press{background:var(--paper);color:#221a08;border-left:4px solid #8f1524}
.sa-feed-card.press .tag{display:inline-block;font-size:7.5px;font-weight:900;letter-spacing:.22em;color:#8f1524;margin-bottom:5px}
.sa-feed-card.press p{font-family:var(--serif);font-weight:700;font-size:13px}
.sa-feed-card.x{background:#101014;border:1px solid rgba(255,255,255,.12);color:#e8e8ec}
.sa-feed-card.ig{background:#17141a;border:1px solid rgba(225,48,108,.3);color:#efe9f0}
.sa-break-action{position:relative;z-index:12;flex:0 0 auto;width:min(340px,calc(100% - 36px));padding:14px 0 42px;touch-action:manipulation}
.sa-break-continue{position:relative;left:auto;bottom:auto;transform:none;width:100%;min-height:58px;touch-action:manipulation}
.sa-break-ticker{position:absolute;z-index:1;bottom:0;left:0;right:0;height:30px;background:#0c0c0e;border-top:1px solid rgba(255,255,255,.1);overflow:hidden;display:flex;align-items:center;pointer-events:none}
.sa-break-ticker span{white-space:nowrap;font-size:10px;letter-spacing:.16em;color:#8a857b;font-weight:800;animation:sa-roll 14s linear infinite;padding-left:100%}
@keyframes sa-roll{to{transform:translateX(-100%)}}

/* ===== response ===== */
.sa-center>.sa-btn{flex:0 0 auto;width:100%;max-width:340px}
.sa-btnrow .sa-btn{flex:1;width:auto;max-width:none;min-width:0}
.sa-spot{position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:340px;height:380px;background:radial-gradient(ellipse at 50% 20%,rgba(255,240,200,.14),transparent 65%);pointer-events:none}
.sa-dealmemo{position:relative;width:min(330px,88%);background:var(--paper);color:#221a08;border-radius:8px;padding:20px 18px 8px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.7);transform:rotate(-1.2deg);animation:sa-up .6s .2s both}
.sa-dealmemo .k{font-size:8px;font-weight:900;letter-spacing:.24em;color:#7a5c1c;border-bottom:2px solid #221a08;padding-bottom:8px}
.sa-dealmemo>b{display:block;font-size:38px;font-family:var(--serif);font-weight:900;margin:12px 0 10px;color:#1d3b16}
.sa-dealmemo .memorow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-top:1px dashed rgba(58,44,16,.3);padding:7px 2px;text-align:left}
.sa-dealmemo .memorow span{font-size:8px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#6b5320;flex-shrink:0}
.sa-dealmemo .memorow i{font-style:normal;font-size:10.5px;font-weight:700;color:#3a2c10;text-align:right}
.sa-dealmemo .memostamp{position:absolute;top:-13px;right:-11px;transform:rotate(7deg)!important;font-size:15px;background:var(--paper);animation-delay:.7s}
@keyframes sa-slam7{0%{opacity:0;transform:rotate(7deg) scale(2.6)}60%{opacity:1;transform:rotate(7deg) scale(.92)}100%{transform:rotate(7deg) scale(1)}}
.sa-dealmemo .memostamp.slam{animation-name:sa-slam7}
.sa-pen{width:190px;margin:10px auto 2px;animation:sa-up .7s .45s both}
.sa-resp-title{font-family:var(--serif);font-size:27px;font-style:italic;animation:sa-up .6s .15s both}
.sa-resp-sub{font-size:12px;color:#b9b4a6;line-height:1.5;max-width:300px;animation:sa-up .6s .3s both}
.sa-resp-sub b{color:#ffd76a}
.sa-counter-paper{width:min(320px,86%);background:var(--paper);color:#221a08;border-radius:6px;padding:20px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.7);animation:sa-slidein .6s cubic-bezier(.2,1,.3,1) both}
@keyframes sa-slidein{from{opacity:0;transform:translateX(70px) rotate(2deg)}to{opacity:1;transform:none}}
.sa-counter-paper .k{font-size:8px;font-weight:900;letter-spacing:.22em;color:#7a5c1c}
.sa-counter-old{position:relative;display:inline-block;font-size:22px;font-family:ui-monospace,Menlo,monospace;color:#8a7648;margin-top:12px}
.sa-counter-old i{position:absolute;left:-6%;top:52%;width:112%;height:3px;background:#b3202e;transform:rotate(-5deg);border-radius:2px;animation:sa-strike .5s .5s both}
@keyframes sa-strike{from{transform:rotate(-5deg) scaleX(0)}to{transform:rotate(-5deg) scaleX(1)}}
.sa-counter-new{font-size:37px;font-family:var(--serif);font-weight:900;color:#8f1524;margin-top:4px;animation:sa-up .5s .8s both}
.sa-counter-note{font-size:11px;font-style:italic;color:#5c4c22;margin-top:8px;animation:sa-in .6s 1.1s both}
.sa-rival-card{width:min(320px,86%);border:1.5px solid rgba(255,60,80,.5);background:linear-gradient(180deg,rgba(120,10,25,.3),rgba(30,5,10,.6));border-radius:18px;padding:20px;animation:sa-slam .5s both}
.sa-rival-head{font-size:9px;font-weight:900;letter-spacing:.3em;color:#ff8b96}
.sa-rival-name{font-family:var(--serif);font-size:26px;font-weight:900;margin-top:8px}
.sa-rival-amt{font-size:34px;font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#ff5c6a;margin-top:4px}
.sa-rival-note{font-size:10px;color:#c9a0a6;margin-top:8px}
.sa-declined-folder{position:relative;width:min(300px,80%);background:linear-gradient(180deg,#d8b97b,#bd9c5c);border-radius:12px;padding:44px 18px;color:#6b5320;font-size:9px;font-weight:900;letter-spacing:.2em;box-shadow:0 20px 50px rgba(0,0,0,.6);animation:sa-up .5s both}
.sa-declined-folder .sa-inkstamp{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) rotate(-12deg)!important;animation:sa-slam .5s .4s both}

/* ===== closing ===== */
.sa-closing-note{font-size:11.5px;color:#b9b4a6;line-height:1.5;padding:4px 2px 12px}
.sa-closedoc{display:flex;gap:12px;align-items:center;width:100%;background:var(--paper);color:#221a08;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 10px 26px rgba(0,0,0,.5);animation:sa-up .5s both;transition:transform .12s}
.sa-closedoc:active{transform:scale(.98)}
.sa-closedoc-body{flex:1}
.sa-closedoc-body b{font-family:var(--serif);font-size:15px;display:block}
.sa-closedoc-body .val{display:block;font-size:11px;font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#7a5c1c;margin-top:3px}
.sa-closedoc-body .note{display:block;font-size:9px;color:#8a7648;margin-top:2px}
.sa-closedoc-stamp{width:96px;text-align:center;flex-shrink:0}
.sa-closedoc-stamp span{font-size:8px;font-weight:900;letter-spacing:.14em;color:#8a7648;border:1.5px dashed #b39a60;border-radius:8px;padding:10px 6px;display:block;animation:sa-blink 2s infinite}
.sa-closedoc.done{outline:2px solid rgba(29,107,63,.4)}

/* ===== signing ===== */
.sa-signing.shake{animation:sa-shake .45s}
@keyframes sa-shake{0%,100%{transform:none}20%{transform:translate(-6px,3px) rotate(-.4deg)}40%{transform:translate(5px,-4px) rotate(.4deg)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-2px)}}
.sa-meterwrap{padding:2px 16px 6px}
.sa-meter-pips{display:flex;gap:6px;margin-bottom:8px}
.sa-meter-pips i{flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,.08);transition:.4s}
.sa-meter-pips i.on{background:linear-gradient(90deg,#ffd76a,var(--gold))}
.sa-meter{display:flex;align-items:center;gap:10px;border:1px solid rgba(240,180,41,.3);background:rgba(255,255,255,.03);border-radius:12px;padding:9px 12px}
.sa-meter span{font-size:8px;font-weight:900;letter-spacing:.2em;color:#b9a05a}
.sa-meter-track{flex:1;height:8px;border-radius:5px;background:rgba(0,0,0,.4);overflow:hidden}
.sa-meter-track div{height:100%;border-radius:5px;background:linear-gradient(90deg,#ffd76a,var(--gold));transition:width .6s cubic-bezier(.3,1,.4,1)}
.sa-meter b{font-size:11px;font-family:ui-monospace,Menlo,monospace;color:#ffd76a}
.sa-contract{background:var(--paper);color:#221a08;border-radius:14px;padding:18px;margin-top:8px;box-shadow:0 18px 44px rgba(0,0,0,.55);animation:sa-pagein .45s cubic-bezier(.2,1,.3,1) both}
@keyframes sa-pagein{from{opacity:0;transform:translateX(46px) rotate(.6deg)}to{opacity:1;transform:none}}
.sa-contract-eyebrow{font-size:8px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#7a5c1c;border-bottom:2px solid #221a08;padding-bottom:8px}
.sa-contract-body{font-size:12.5px;line-height:1.55;font-weight:600;padding:12px 0}
.sa-contract-rows{display:flex;flex-direction:column;gap:7px}
.sa-contract-row{display:flex;justify-content:space-between;align-items:center;background:rgba(58,44,16,.08);border:1px solid rgba(58,44,16,.18);border-radius:10px;padding:11px 13px}
.sa-contract-row span{font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#6b5320}
.sa-contract-row b{font-size:13px;font-family:ui-monospace,Menlo,monospace}
.sa-contract-clauses{display:flex;flex-direction:column;gap:7px}
.sa-bound{background:rgba(29,107,63,.12);border:1px solid rgba(29,107,63,.35);color:#1d6b3f;border-radius:10px;padding:11px 13px;font-size:11.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
.sa-reqrow{display:flex;gap:6px;margin-bottom:12px}
.sa-req{flex:1;text-align:center;border:1px solid rgba(143,21,36,.4);background:rgba(143,21,36,.08);border-radius:10px;padding:8px 4px}
.sa-req span{display:block;font-size:7px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#8a7648}
.sa-req b{font-size:10.5px;color:#8f1524}
.sa-req.ok{border-color:rgba(29,107,63,.35);background:rgba(29,107,63,.1)}
.sa-req.ok b{color:#1d6b3f}
.sa-signline{position:relative;width:100%;min-height:96px;border:2px dashed #8a7648;border-radius:12px;background:rgba(29,107,63,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;transition:border-color .2s,background .2s,transform .2s}
.sa-signline:active:not(:disabled){transform:scale(.985)}
.sa-signline:disabled{cursor:wait}
.sa-signline .hint{font-family:var(--serif);font-style:italic;font-size:24px;color:#6b5320;animation:sa-blink 1.8s infinite}
.sa-cursive{font-family:"Snell Roundhand","Savoye LET","Segoe Script","Brush Script MT","Dancing Script",cursive;
  font-size:36px;font-weight:700;color:#122a18;line-height:1;transform:rotate(-3deg);padding:6px 4px 2px;
  text-shadow:0 0 1px rgba(18,42,24,.4);animation:sa-write 1.15s .1s cubic-bezier(.3,.6,.4,1) both;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes sa-write{0%{clip-path:inset(-20% 100% -20% 0);opacity:1}100%{clip-path:inset(-20% -8% -20% 0)}}
.sa-signline .line{width:82%;height:2px;background:#221a08;margin-top:4px}
.sa-signline .who{font-size:8.5px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#6b5320;margin-top:6px}
.sa-signline.signed{border-style:solid;border-color:#1d6b3f}
.sa-signline.writing{border-style:solid;border-color:#c68a12;background:rgba(240,180,41,.08)}
.sa-signing-status{margin-top:10px;text-align:center;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#7a5c1c;animation:sa-blink .9s infinite}
.sa-notary{display:flex;justify-content:center;margin-top:14px}
.sa-notary .sa-inkstamp{animation-delay:.85s}
.sa-signedmsg{flex:1;text-align:center;font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#ffd76a;animation:sa-blink 1s infinite;padding:15px}

/* ===== acquired ===== */
.sa-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:30}
.sa-confetti i{position:absolute;top:-4%;animation:sa-confall linear forwards}
@keyframes sa-confall{0%{transform:translateY(-4vh) rotate(0) rotateY(0)}100%{transform:translateY(110vh) rotate(680deg) rotateY(720deg)}}
.sa-gates{position:relative;width:min(330px,88%);margin-top:20px;animation:sa-up .7s both}
.sa-gates svg{width:100%;display:block;filter:drop-shadow(0 14px 30px rgba(0,0,0,.7))}
.sa-gate-glow{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:70%;height:60px;background:radial-gradient(ellipse,rgba(240,180,41,.28),transparent 70%);filter:blur(8px)}
.sa-acq-title{font-family:var(--serif);font-size:30px;font-style:italic;line-height:1.15;margin:10px 0 16px;animation:sa-up .6s .2s both}
.sa-acq-stats{display:flex;gap:8px;width:100%;max-width:380px;animation:sa-up .6s .35s both}
.sa-acq-stats div{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(240,180,41,.22);border-radius:12px;padding:10px 6px;text-align:center}
.sa-acq-stats span{display:block;font-size:7px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#8a857b}
.sa-acq-stats b{font-size:13px;font-family:ui-monospace,Menlo,monospace;color:#ffd76a}
.sa-acq-stats b.ok{color:#57e389}
.sa-stake-note{width:100%;max-width:380px;margin-top:18px;border:1px solid rgba(87,227,137,.28);background:rgba(18,70,44,.2);border-radius:14px;padding:14px;font-size:10px;line-height:1.55;color:#a9c9b5;text-align:left}
.sa-models{display:flex;flex-direction:column;gap:8px;width:100%;max-width:400px}
.sa-model{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:14px;padding:13px;text-align:left;transition:.2s}
.sa-model b{font-size:13px;display:block}
.sa-model .ctrl{display:inline-block;font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#b9a05a;margin-top:3px}
.sa-model .ben{display:block;font-size:9.5px;color:#9a958c;margin-top:5px}
.sa-model .trade{display:block;font-size:9px;color:#ff9640;margin-top:3px}
.sa-model.on{border-color:rgba(240,180,41,.6);background:rgba(56,40,10,.35)}
`;
