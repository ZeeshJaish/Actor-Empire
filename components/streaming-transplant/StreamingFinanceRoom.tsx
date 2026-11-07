import { useMemo, type CSSProperties } from 'react';
import type { Player } from '../../types';
import { getStreamingStudioFinanceData } from '../../services/streamingStudioFinance';
import { getStreamingYourMoneyView } from '../../services/streamingYourMoney';
import { YourMoneyPanel, type YourMoneyActions } from './BoardroomYourMoney';
import { StudioFinance, type FinanceTab } from '../studio-finance/components/StudioFinance';
import type { Brand } from './StreamingBrandVisuals';
import { hslHex } from './StreamingBrandVisuals';

type LegacyFinanceTab = 'SNAPSHOT' | 'PERFORMANCE' | 'LEDGER' | 'CAPITAL';
type LegacyCapitalView = 'DESK' | 'INJECT' | 'EQUITY' | 'YOUR_MONEY';
interface ActionResult { ok: boolean; message: string; }

interface Props {
  brand: Brand;
  player: Player;
  initialTab?: LegacyFinanceTab;
  initialCapitalView?: LegacyCapitalView;
  onClose: () => void;
  onInjectCapital: (amount: number) => ActionResult;
  onAcceptInvestment: (offerId: string) => ActionResult;
  /** #163: Decline on an investor's term sheet */
  onDeclineInvestment?: (offerId: string) => void;
  onOpenBuild: () => void;
  onOpenBank: () => void;
  onOpenLeadership: () => void;
  onOpenPublicMarkets: () => void;
  onOpenMarket?: (marketId: string) => void;
  onOpenTitle?: (titleId: string) => void;
  /** #175: owners and investors, and the listing, live in the Boardroom */
  onOpenOwnership?: () => void;
  onOpenMarkets?: () => void;
  /** #220: your salary, a bonus, taking money out */
  yourMoneyActions?: Pick<YourMoneyActions, 'setSalary' | 'payBonus' | 'takeOut' | 'payOffEstate'>;
}

/* worked out only while the page is open */
const YourMoneyPage = ({ player, startPutIn, actions }: { player: Player; startPutIn: boolean; actions: YourMoneyActions }) => {
  const view = useMemo(() => getStreamingYourMoneyView(player), [player]);
  return <YourMoneyPanel view={view} wallet={Math.round(player.money || 0)} startPutIn={startPutIn} actions={actions} />;
};

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
  onDeclineInvestment,
  onOpenBank,
  onOpenLeadership,
  onOpenPublicMarkets,
  onOpenMarket,
  onOpenTitle,
  onOpenOwnership,
  onOpenMarkets,
  yourMoneyActions,
}: Props) {
  const brandHex = useMemo(() => hslHex(brand.hue, brand.sat, 58), [brand.hue, brand.sat]);
  const shellStyle = useMemo(() => ({
    '--hq-accent': brandHex,
    '--hq-secondary': hslHex(brand.accentHue, brand.sat, 58),
  } as CSSProperties), [brand.accentHue, brand.sat, brandHex]);
  const data = useMemo(() => getStreamingStudioFinanceData(player, brandHex), [brandHex, player]);

  return (
    <div className="streaming-hq-shell" data-epx-root style={shellStyle}>
      <StudioFinance
        data={data}
        initialTab={tabMap[initialTab]}
        initialCapitalRoute={initialCapitalView === 'INJECT'
          ? 'founder'
          : initialCapitalView === 'EQUITY'
            ? 'equity'
            : initialCapitalView === 'YOUR_MONEY'
              ? 'you'
              : undefined}
        onBack={onClose}
        onOpenBank={onOpenBank}
        onOpenLeadership={onOpenLeadership}
        onOpenPublicMarkets={onOpenPublicMarkets}
        onOpenMarket={onOpenMarket}
        onFounderInjection={onInjectCapital}
        onAcceptOffer={onAcceptInvestment}
        onRejectOffer={onDeclineInvestment}
        onOpenTitle={onOpenTitle}
        onOpenOwnership={onOpenOwnership}
        onOpenMarkets={onOpenMarkets}
        renderYourMoney={yourMoneyActions ? tools => (
          <YourMoneyPage player={player} startPutIn={tools.startPutIn} actions={{ ...yourMoneyActions, putIn: tools.putIn, openMarkets: onOpenMarkets, openBank: onOpenBank }} />
        ) : undefined}
      />
    </div>
  );
}

export default StreamingFinanceRoom;
