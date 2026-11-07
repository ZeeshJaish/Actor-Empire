import React from 'react';
import type { GameLanguage } from '../types';
import { t } from '../services/i18n';

/** #255: the one "wait till 18" popup. A locked button opens this and nothing else happens. */
export const AgeGatePopup: React.FC<{ language: GameLanguage; onClose: () => void }> = ({ language, onClose }) => (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
        <div className="w-full max-w-xs rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center" onClick={event => event.stopPropagation()}>
            <div className="text-xl font-black text-white">{t(language, 'ageGate.title')}</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t(language, 'ageGate.body')}</p>
            <button onClick={onClose} className="mt-5 min-h-11 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">
                {t(language, 'common.continue')}
            </button>
        </div>
    </div>
);
