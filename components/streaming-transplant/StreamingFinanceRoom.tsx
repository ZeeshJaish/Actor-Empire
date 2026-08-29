import { useMemo, type CSSProperties } from 'react';
import type { Player } from '../../types';
import { getStreamingStudioFinanceData } from '../../services/streamingStudioFinance';
import { StudioFinance, type FinanceTab } from '../studio-finance/components/StudioFinance';
import type { Brand } from './StreamingBrandVisuals';
import { hslHex } from './StreamingBrandVisuals';

type LegacyFinanceTab = 'SNAPSHOT' | 'PERFORMANCE' | 'LEDGER' | 'CAPITAL';
type LegacyCapitalView = 'DESK' | 'INJECT' | 'EQUITY';
interface ActionResult { ok: boolean; message: string; }

interface Props {
  brand: Brand;
  player: Player;
  initialTab?: LegacyFinanceTab;
  initialCapitalView?: LegacyCapitalView;
  onClose: () => void;
  onInjectCapital: (amount: number) => ActionResult;
  onAcceptInvestment: (offerId: string) => ActionResult;
  onOpenBuild: () => void;
  onOpenBank: () => void;
  onOpenLeadership: () => void;
  onOpenPublicMarkets: () => void;
  onOpenMarket?: (marketId: string) => void;
  onOpenTitle?: (titleId: string) => void;
}

const tabMap: Record<LegacyFinanceTab, FinanceTab> = {
  SNAPSHOT: 'snapshot',
  PERFORMANCE: 'performance',
  LEDGER: 'ledger',
  CAPITAL: 'capital',
};

export function StreamingFinanceRoom({
  brand,
  player,
  initialTab = 'SNAPSHOT',
  initialCapitalView = 'DESK',
  onClose,
  onInjectCapital,
  onAcceptInvestment,
  onOpenBank,
  onOpenLeadership,
  onOpenPublicMarkets,
  onOpenMarket,
  onOpenTitle,
}: Props) {
  const brandHex = useMemo(() => hslHex(brand.hue, brand.sat, 58), [brand.hue, brand.sat]);
  const shellStyle = useMemo(() => ({
    '--hq-accent': brandHex,
    '--hq-secondary': hslHex(brand.accentHue, brand.sat, 58),
  } as CSSProperties), [brand.accentHue, brand.sat, brandHex]);
  const data = useMemo(() => getStreamingStudioFinanceData(player, brandHex), [brandHex, player]);

  return (
    <div className="streaming-hq-shell" style={shellStyle}>
      <StudioFinance
        data={data}
        initialTab={tabMap[initialTab]}
        initialCapitalRoute={initialCapitalView === 'INJECT'
          ? 'founder'
          : initialCapitalView === 'EQUITY'
            ? 'equity'
            : undefined}
        onBack={onClose}
        onOpenBank={onOpenBank}
        onOpenLeadership={onOpenLeadership}
        onOpenPublicMarkets={onOpenPublicMarkets}
        onOpenMarket={onOpenMarket}
        onFounderInjection={onInjectCapital}
        onAcceptOffer={onAcceptInvestment}
        onOpenTitle={onOpenTitle}
      />
    </div>
  );
}

export default StreamingFinanceRoom;
