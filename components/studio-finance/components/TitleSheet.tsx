/* One title's whole financial story, from the top line down to what it kept. */

import type { TitleFinance } from '../finance/types';
import { TITLE_STATUS_COPY, titleTotals } from '../finance/derive';
import { money, pct, signedPct } from '../finance/format';
import { Poster } from './Poster';
import { Row, Sheet, Tag, TrendChip } from './ui';

interface Props {
  title: TitleFinance | null;
  onClose: () => void;
  onOpenTitle?: (id: string) => void;
}

export function TitleSheet({ title, onClose, onOpenTitle }: Props) {
  if (!title) return null;
  const totals = titleTotals(title);
  const status = TITLE_STATUS_COPY[totals.status];

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow={`${title.format}${title.releasedLabel ? ` · ${title.releasedLabel}` : ''}`}
      title={title.name}
      footer={onOpenTitle && (
        <button type="button" className="sf-btn sf-btn--primary" onClick={() => onOpenTitle(title.id)}>
          Open title
        </button>
      )}
    >
      <div className="sf-sheet-hero">
        <Poster seed={title.posterSeed ?? title.id} size={58} />
        <div>
          <p className="sf-eyebrow">Lifetime profit</p>
          <p className={`sf-sheet-figure ${totals.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}`}>{money(totals.net, { sign: true })}</p>
          <p className="sf-sheet-tags">
            <Tag tone={status.tone}>{status.label}</Tag>
            <TrendChip value={title.trend} label={signedPct(title.trend)} />
          </p>
        </div>
      </div>

      <p className="sf-eyebrow sf-block-head">Earned</p>
      <Row label="Subscription value" value={money(title.subscriptionValue)} tone="good" />
      <Row label="Advertising revenue" value={money(title.advertising)} tone="good" />
      <Row label="Licensing revenue" value={money(title.licensing)} tone="good" />
      <Row label="Gross" value={money(totals.gross)} muted />

      <p className="sf-eyebrow sf-block-head">Spent</p>
      <Row label="Production cost" value={money(-title.productionCost)} tone="bad" />
      <Row label="Marketing cost" value={money(-title.marketingCost)} tone="bad" />
      <Row label="Infrastructure allocation" value={money(-title.infrastructureCost)} tone="bad" />
      <Row label="Total cost" value={money(totals.cost)} muted />

      <div className="sf-sheet-total">
        <span>Margin</span>
        <strong className={totals.margin >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}>{pct(totals.margin)}</strong>
      </div>
    </Sheet>
  );
}
