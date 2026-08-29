import { useMemo } from 'react';
import { Boardroom as BoardroomHub } from '../studio-finance/components/Boardroom';
import type { BoardroomData } from '../studio-finance/finance/boardroom';
import type { Brand } from './StreamingBrandVisuals';
import { hslHex } from './StreamingBrandVisuals';

export interface LedgerLine { id: string; label: string; amount: number; note?: string }

export interface Exec {
  id: string;
  role: string;
  name: string;
  loyalty: number;
  salary: number;
  unlocks: string;
  founder?: boolean;
}

export interface BoardSeat {
  id: string;
  holder?: string;
  votes?: number;
}

export interface Holder {
  id: string;
  name: string;
  pct: number;
  since: string;
  you?: boolean;
}

export interface IpoCheck { id: string; label: string; done: boolean; note?: string }
export interface SharePoint { label: string; value: number }

export interface BoardroomState {
  live: boolean;
  absoluteWeek?: number;
  companyYear?: number;
  treasury: number;
  treasuryDelta?: number;
  weeklyNetDelta?: number;
  weeklyRevenue: LedgerLine[];
  weeklyCosts: LedgerLine[];
  execs: Exec[];
  seats: BoardSeat[];
  holders: Holder[];
  listed: boolean;
  ipoChecks: IpoCheck[];
  share?: {
    ticker?: string;
    price: number;
    changePct: number;
    marketCap: number;
    history: SharePoint[];
  };
  successor?: { name: string; role: string } | null;
  legacyTitle?: string;
}

type LegacyTab = 'FINANCE' | 'THE TABLE' | 'OWNERSHIP' | 'MARKETS';

interface Props {
  brand: Brand;
  founderName: string;
  state: BoardroomState;
  onBack: () => void;
  initialTab?: LegacyTab;
  onHire?: () => void;
  onIssueEquity?: () => void;
  onFileIpo?: () => void;
  onOpenLegacy?: () => void;
  onOpenFinance?: () => void;
  onOpenTable?: () => void;
  onOpenOwnership?: () => void;
  onOpenBrief?: () => void;
}

const money = (value: number): string => {
  const absolute = Math.abs(value);
  const compact = absolute >= 1e9
    ? `$${(absolute / 1e9).toFixed(1).replace(/\.0$/, '')}B`
    : absolute >= 1e6
      ? `$${(absolute / 1e6).toFixed(1).replace(/\.0$/, '')}M`
      : absolute >= 1e3
        ? `$${Math.round(absolute / 1e3)}K`
        : `$${Math.round(absolute)}`;
  return value < 0 ? `−${compact}` : compact;
};

const signedMoney = (value: number): string => value > 0 ? `+${money(value)}` : money(value);

export const Boardroom = ({
  brand,
  founderName,
  state,
  onBack,
  onHire,
  onIssueEquity,
  onFileIpo,
  onOpenLegacy,
  onOpenFinance,
  onOpenTable,
  onOpenOwnership,
  onOpenBrief,
}: Props) => {
  const data = useMemo<BoardroomData>(() => {
    const revenue = state.weeklyRevenue.reduce((sum, item) => sum + item.amount, 0);
    const costs = state.weeklyCosts.reduce((sum, item) => sum + item.amount, 0);
    const net = revenue - costs;
    const runway = net < 0 ? Math.floor(state.treasury / Math.max(1, Math.abs(net))) : null;
    const founderStake = state.holders.find((holder) => holder.you)?.pct ?? 100;
    const occupiedSeats = state.seats.filter((seat) => seat.holder).length;
    const ipoMet = state.ipoChecks.filter((check) => check.done).length;
    const ipoTotal = state.ipoChecks.length;
    const absoluteWeek = Math.max(1, Math.floor(state.absoluteWeek ?? 1));
    const companyYear = Math.max(1, Math.floor(state.companyYear ?? 1));
    const deltaTone = (value: number | undefined): 'good' | 'bad' | 'flat' => (
      typeof value !== 'number' || value === 0 ? 'flat' : value > 0 ? 'good' : 'bad'
    );
    const alerts: BoardroomData['alerts'] = [];

    if (!state.live) alerts.push({
      id: 'prelaunch',
      text: state.treasury > 0
        ? 'Treasury is funded. The company is waiting for its launch network.'
        : 'The company has no operating capital. Fund it before making commitments.',
      sectionId: 'finance',
      severity: state.treasury > 0 ? 'info' : 'urgent',
    });
    if (runway !== null && runway < 12) alerts.push({
      id: 'runway',
      text: `${runway} weeks of runway remain at the current operating burn.`,
      sectionId: 'finance',
      severity: runway < 4 ? 'urgent' : 'warn',
    });
    if (founderStake < 51) alerts.push({
      id: 'control',
      text: `Founder control is below a majority at ${founderStake.toFixed(1)}%.`,
      sectionId: 'ownership',
      severity: 'urgent',
    });

    return {
      company: { name: brand.name, year: companyYear, week: absoluteWeek, brandHex: hslHex(brand.hue, brand.sat, 58) },
      status: {
        label: !state.live ? 'Pre-launch' : runway !== null && runway < 12 ? 'Under pressure' : net >= 0 ? 'Stable' : 'Watch',
        tone: runway !== null && runway < 4 ? 'bad' : runway !== null && runway < 12 ? 'warn' : net >= 0 ? 'good' : 'flat',
      },
      subtitle: 'Money · People · Ownership',
      stamp: `Week ${absoluteWeek} · Books open`,
      stampRight: `Year ${companyYear}`,
      vitals: [
        {
          id: 'treasury', label: 'Treasury', value: money(state.treasury),
          delta: typeof state.treasuryDelta === 'number' ? signedMoney(state.treasuryDelta) : undefined,
          deltaTone: deltaTone(state.treasuryDelta),
          tone: state.treasury > 0 ? 'good' : 'bad', sectionId: 'finance',
        },
        {
          id: 'weekly', label: 'Net / wk', value: signedMoney(net),
          delta: typeof state.weeklyNetDelta === 'number' ? signedMoney(state.weeklyNetDelta) : undefined,
          deltaTone: deltaTone(state.weeklyNetDelta),
          tone: net >= 0 ? 'good' : 'bad', sectionId: 'finance',
        },
        { id: 'stake', label: 'Stake', value: `${founderStake.toFixed(founderStake % 1 ? 1 : 0)}%`, sectionId: 'ownership' },
        { id: 'board', label: 'Board', value: `${occupiedSeats} seat${occupiedSeats === 1 ? '' : 's'}`, sectionId: 'table' },
      ],
      alerts,
      sections: [
        {
          id: 'finance', name: 'Studio Finance', group: 'Running the company', glyph: 'finance',
          line: `${money(state.treasury)} treasury · ${signedMoney(net)}/wk`,
          attention: runway !== null && runway < 12 ? 'warn' : 'none',
        },
        {
          id: 'table', name: 'The Table', group: 'Running the company', glyph: 'people',
          line: `${state.execs.length} executive${state.execs.length === 1 ? '' : 's'} · ${occupiedSeats} of ${state.seats.length} director seats filled`,
          progress: (state.execs.length + occupiedSeats) / Math.max(1, state.execs.length + state.seats.length),
          progressSteps: Math.max(1, state.execs.length + state.seats.length), progressTone: 'brand',
        },
        {
          id: 'ownership', name: 'Ownership', group: 'Running the company', glyph: 'ownership',
          line: `You ${founderStake.toFixed(1)}% · ${Math.max(0, state.holders.length - 1)} outside holder${state.holders.length === 2 ? '' : 's'}`,
          attention: founderStake < 51 ? 'urgent' : 'none',
        },
        {
          id: 'ipo', name: state.listed ? 'Public Markets' : 'IPO Desk', group: 'The long game', glyph: 'markets',
          line: state.listed && state.share
            ? `${state.share.ticker || brand.name.slice(0, 4).toUpperCase()} · $${state.share.price.toFixed(2)} · ${state.share.changePct >= 0 ? '+' : ''}${state.share.changePct.toFixed(2)}%`
            : `${ipoMet} of ${ipoTotal} requirements met`,
          state: state.listed || (ipoTotal > 0 && ipoMet === ipoTotal) ? 'open' : 'locked',
          lockedReason: `${ipoMet} of ${ipoTotal} requirements met`,
          progress: ipoTotal ? ipoMet / ipoTotal : 0, progressSteps: Math.max(1, ipoTotal), progressTone: 'gold',
          badge: state.listed ? 'LIVE' : `${ipoMet} / ${ipoTotal}`,
        },
        {
          id: 'brief', name: 'CEO Brief', group: 'The long game', glyph: 'brief',
          line: state.live ? 'Weekly operations and executive decisions' : 'Opens with live operations',
          state: state.live ? 'open' : 'soon',
        },
        {
          id: 'legacy', name: 'Legacy', group: 'The long game', glyph: 'legacy',
          line: state.legacyTitle ? `Current legacy · ${state.legacyTitle}` : state.successor ? `Successor · ${state.successor.name}` : `${founderName} is still writing the story`,
        },
      ],
    };
  }, [brand, founderName, state]);

  const openSection = (id: string) => {
    if (id === 'finance') return onOpenFinance?.();
    if (id === 'table') return (onOpenTable ?? onHire)?.();
    if (id === 'ownership') return (onOpenOwnership ?? onIssueEquity)?.();
    if (id === 'ipo') return onFileIpo?.();
    if (id === 'brief') return onOpenBrief?.();
    if (id === 'legacy') return onOpenLegacy?.();
  };

  return <BoardroomHub data={data} onBack={onBack} onOpenSection={openSection} />;
};
