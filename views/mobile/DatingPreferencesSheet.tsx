import React from 'react';
import { DatingPreferences } from '../../types';
import type { GameLanguage } from '../../types';
import { t } from '../../services/i18n';
import { SlidersHorizontal, X } from 'lucide-react';

interface DatingPreferencesSheetProps {
    preferences: DatingPreferences;
    onChange: (preferences: DatingPreferences) => void;
    onClose: () => void;
    onSave: () => void;
    language?: GameLanguage;
    tone?: 'tinder' | 'luxe';
}

const genderOptions: { value: DatingPreferences['gender']; labelKey: string }[] = [
    { value: 'MALE', labelKey: 'dating.preferences.gender.men' },
    { value: 'FEMALE', labelKey: 'dating.preferences.gender.women' },
    { value: 'ALL', labelKey: 'dating.preferences.gender.everyone' },
];

export const preferenceLabel = (preferences: DatingPreferences, language: GameLanguage = 'en') => {
    const genderKey = preferences.gender === 'MALE'
        ? 'dating.preferences.gender.men'
        : preferences.gender === 'FEMALE'
            ? 'dating.preferences.gender.women'
            : 'dating.preferences.gender.everyone';
    return t(language, 'dating.preferences.summary', {
        gender: t(language, genderKey),
        minAge: preferences.minAge,
        maxAge: preferences.maxAge
    });
};

export const DatingPreferencesSheet: React.FC<DatingPreferencesSheetProps> = ({
    preferences,
    onChange,
    onClose,
    onSave,
    language: selectedLanguage = 'en',
    tone = 'tinder',
}) => {
    const language = selectedLanguage as GameLanguage;
    const isLuxe = tone === 'luxe';
    const accentText = isLuxe ? 'text-amber-200' : 'text-rose-500';
    const activeButton = isLuxe ? 'bg-amber-400 text-black shadow-lg' : 'bg-gray-900 text-white shadow-md';
    const inactiveButton = isLuxe
        ? 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
        : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100';

    return (
        <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-6 pt-24 backdrop-blur-sm">
            <div
                className={`w-full max-w-md rounded-[30px] border p-5 shadow-2xl ${
                    isLuxe
                        ? 'border-white/10 bg-[linear-gradient(180deg,rgba(22,16,8,0.98),rgba(8,8,10,0.99))] text-white'
                        : 'border-gray-100 bg-white text-gray-950'
                }`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${accentText}`}>
	                            <SlidersHorizontal size={14} /> {t(language, 'dating.preferences.eyebrow')}
                        </div>
                        <h3 className="mt-2 text-2xl font-black">{t(language, 'dating.preferences.title')}</h3>
                        <p className={isLuxe ? 'mt-1 text-sm text-zinc-400' : 'mt-1 text-sm text-gray-500'}>
                            {t(language, 'dating.preferences.subtitle')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isLuxe ? 'bg-white/[0.06] text-zinc-300' : 'bg-gray-100 text-gray-500'
                        }`}
                        aria-label={t(language, 'dating.preferences.closeAria')}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    <div>
                        <label className={isLuxe ? 'text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500' : 'text-[10px] font-black uppercase tracking-[0.18em] text-gray-400'}>
                            {t(language, 'dating.preferences.interestedIn')}
                        </label>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {genderOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => onChange({ ...preferences, gender: option.value })}
                                    className={`rounded-2xl border px-3 py-3 text-xs font-black transition-colors ${
                                        preferences.gender === option.value ? activeButton : inactiveButton
                                    }`}
                                >
                                    {t(language, option.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-4 flex items-end justify-between gap-3">
                            <label className={isLuxe ? 'text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500' : 'text-[10px] font-black uppercase tracking-[0.18em] text-gray-400'}>
                                {t(language, 'dating.preferences.ageRange')}
                            </label>
                            <span className={`font-mono text-lg font-black ${isLuxe ? 'text-amber-100' : 'text-gray-950'}`}>
                                {preferences.minAge} - {preferences.maxAge}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className={isLuxe ? 'mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500' : 'mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400'}>
                                    {t(language, 'dating.preferences.minAge')}
                                </div>
                                <input
                                    type="range"
                                    min="18"
                                    max="50"
                                    value={preferences.minAge}
                                    onChange={event => {
                                        const minAge = parseInt(event.target.value, 10);
                                        onChange({ ...preferences, minAge: Math.min(minAge, preferences.maxAge) });
                                    }}
                                    className={`w-full accent-current ${isLuxe ? 'text-amber-400' : 'text-rose-500'}`}
                                />
                            </div>
                            <div>
                                <div className={isLuxe ? 'mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500' : 'mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400'}>
                                    {t(language, 'dating.preferences.maxAge')}
                                </div>
                                <input
                                    type="range"
                                    min="18"
                                    max="60"
                                    value={preferences.maxAge}
                                    onChange={event => {
                                        const maxAge = parseInt(event.target.value, 10);
                                        onChange({ ...preferences, maxAge: Math.max(maxAge, preferences.minAge) });
                                    }}
                                    className={`w-full accent-current ${isLuxe ? 'text-amber-400' : 'text-rose-500'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onSave}
                    className={`mt-7 w-full rounded-full px-5 py-4 text-sm font-black ${
                        isLuxe
                            ? 'bg-[linear-gradient(135deg,#f8d05e,#f59e0b)] text-black'
                            : 'bg-[linear-gradient(135deg,#f43f5e,#f97316)] text-white'
                    }`}
                >
                    {t(language, 'dating.preferences.save')}
                </button>
            </div>
        </div>
    );
};
