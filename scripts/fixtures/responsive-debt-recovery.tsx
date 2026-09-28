import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { DebtRecoveryModal } from '../../components/DebtRecoveryModal';
import { getPlayerLanguage, t } from '../../services/i18n';
import { INITIAL_PLAYER, type LocalizedTextVars } from '../../types';

const state = new URLSearchParams(location.search).get('state') || 'warning';
const player = {
  ...INITIAL_PLAYER,
  money: -123456789,
  flags: {
    ...INITIAL_PLAYER.flags,
    weeksInDebt: state === 'ruin' ? 8 : 5,
    bailoutAdsUsedThisWeek: state === 'exhausted' ? 2 : 0,
  },
};
const tr = (key: string, vars?: LocalizedTextVars) => t(getPlayerLanguage(player), key, vars);
const fail = () => { throw new Error('Debt action must not run in layout QA'); };

createRoot(document.getElementById('root')!).render(
  <DebtRecoveryModal player={player} tr={tr} onRestartCareer={fail} onBailout={fail} onManageFinances={fail} />,
);
