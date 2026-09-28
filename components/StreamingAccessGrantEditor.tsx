import type { StreamingRightsAccessGrant, StreamingTitleAccessMode } from '../types';
import '../styles/streaming-access-grant-editor.css';

const MODE_LABELS: Array<[StreamingTitleAccessMode, string]> = [
  ['SUBSCRIPTION', 'Subscription'],
  ['AD_SUPPORTED', 'Ad-supported'],
  ['RENTAL', 'Rental'],
  ['PURCHASE', 'Permanent purchase'],
];

interface Props {
  grant: StreamingRightsAccessGrant;
  onChange?: (grant: StreamingRightsAccessGrant) => void;
  ceiling?: StreamingRightsAccessGrant | null;
  permanentWindow: boolean;
  readOnly?: boolean;
}

export default function StreamingAccessGrantEditor({ grant, onChange, ceiling, permanentWindow, readOnly = false }: Props) {
  const canPurchase = permanentWindow && (!ceiling || (ceiling.modes.includes('PURCHASE') && ceiling.purchaseFulfillment === 'PERPETUAL'));
  const modes = grant.modes.filter(mode => mode !== 'PURCHASE' || canPurchase);
  const earlyCeiling = Math.min(4, ceiling?.earlyWindowWeeks ?? 4);
  const updateModes = (mode: StreamingTitleAccessMode) => {
    if (!onChange || readOnly || (mode === 'PURCHASE' && !canPurchase) || (ceiling && !ceiling.modes.includes(mode))) return;
    const nextModes = modes.includes(mode) ? modes.filter(item => item !== mode) : [...modes, mode];
    onChange({ ...grant, modes: nextModes,
      purchaseFulfillment: nextModes.includes('PURCHASE') && canPurchase ? 'PERPETUAL' : 'NONE',
      source: 'EXPLICIT' });
  };

  return <fieldset className="streaming-access-grant" aria-label="Title access rights">
    <legend>Title access rights</legend>
    <p>These routes are fixed when signed. Pricing changes later cannot add rights to this title.</p>
    <div className="streaming-access-grant-modes">
      {MODE_LABELS.map(([mode, label]) => {
        const blocked = mode === 'PURCHASE' ? !canPurchase : Boolean(ceiling && !ceiling.modes.includes(mode));
        return <button key={mode} type="button" aria-pressed={modes.includes(mode)}
          disabled={readOnly || blocked} onClick={() => updateModes(mode)}>{label}</button>;
      })}
    </div>
    <label>Early-access ceiling
      <select value={Math.min(grant.earlyWindowWeeks, earlyCeiling)}
        disabled={readOnly || !onChange || earlyCeiling === 0}
        onChange={event => onChange?.({ ...grant, earlyWindowWeeks: Number(event.target.value), source: 'EXPLICIT' })}>
        {Array.from({ length: earlyCeiling + 1 }, (_, weeks) => <option key={weeks} value={weeks}>{weeks} {weeks === 1 ? 'week' : 'weeks'}</option>)}
      </select>
    </label>
    <small>Final access also requires an active territory and a matching viewer offer. Early access needs a qualifying plan benefit.</small>
  </fieldset>;
}
