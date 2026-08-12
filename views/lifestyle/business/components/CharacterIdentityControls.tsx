import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Info, RotateCcw, X } from 'lucide-react';
import {
    CharacterIdentityProfile,
    RoleType,
    StoryCompass,
} from '../../../../types';
import {
    CHARACTER_IDENTITY_FIELD_COPY,
    CHARACTER_IDENTITY_OPTIONS,
    evaluateCharacterProfileFit,
    formatCharacterStoryFitLabel,
    getCharacterIdentityOption,
} from '../../../../services/characterStoryFit';

type CharacterIdentityDraft = Partial<CharacterIdentityProfile>;
type IdentityField = 'storyFunction' | 'storyRole' | 'abilityType' | 'nature';

interface CharacterIdentityControlsProps {
    value: CharacterIdentityDraft;
    suggested: CharacterIdentityProfile;
    storyCompass: StoryCompass;
    roleType?: RoleType;
    locked?: boolean;
    sourceLabel: string;
    onChange: (patch: CharacterIdentityDraft) => void;
}

const IDENTITY_FIELDS: IdentityField[] = ['storyFunction', 'storyRole', 'abilityType', 'nature'];

const fitTone = {
    NATURAL_FIT: {
        text: 'text-emerald-300',
        border: 'border-emerald-400/25',
        background: 'bg-emerald-400/[0.055]',
        dot: 'bg-emerald-300',
    },
    BOLD_INTERPRETATION: {
        text: 'text-amber-200',
        border: 'border-amber-400/25',
        background: 'bg-amber-400/[0.055]',
        dot: 'bg-amber-300',
    },
    STORY_CONFLICT: {
        text: 'text-rose-300',
        border: 'border-rose-400/25',
        background: 'bg-rose-400/[0.055]',
        dot: 'bg-rose-300',
    },
} as const;

export const CharacterIdentityControls: React.FC<CharacterIdentityControlsProps> = ({
    value,
    suggested,
    storyCompass,
    roleType = 'SUPPORTING',
    locked,
    sourceLabel,
    onChange,
}) => {
    const [activeField, setActiveField] = useState<IdentityField | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const current = { ...suggested, ...value } as CharacterIdentityProfile;
    const effectiveRoleType = roleType as RoleType;
    const fit = useMemo(
        () => evaluateCharacterProfileFit(storyCompass, current, effectiveRoleType),
        [current.storyFunction, current.storyRole, current.abilityType, current.nature, effectiveRoleType, storyCompass],
    );
    const tone = fitTone[fit.label];
    const hasCustomChanges = IDENTITY_FIELDS.some(field => current[field] !== suggested[field])
        || value.identitySource === 'PLAYER';

    const restoreAll = () => {
        onChange({ ...suggested, identitySource: suggested.identitySource === 'CANON' ? 'CANON' : 'AUTO' });
    };

    const restoreField = (field: IdentityField) => {
        const next = { ...current, [field]: suggested[field] };
        const matchesAll = IDENTITY_FIELDS.every(key => next[key] === suggested[key]);
        onChange({
            [field]: suggested[field],
            identitySource: matchesAll ? (suggested.identitySource === 'CANON' ? 'CANON' : 'AUTO') : 'PLAYER',
        });
    };

    const activeCopy = activeField ? CHARACTER_IDENTITY_FIELD_COPY[activeField] : null;
    const activeOptions = activeField ? CHARACTER_IDENTITY_OPTIONS[activeField] : [];

    return (
        <section className="border-t border-zinc-800/80 pt-3" aria-label="Character profile">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Character Profile</p>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setShowGuide(true);
                        }}
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cyan-400/20 text-cyan-200/70 transition-colors hover:border-cyan-300/45 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        aria-label="Explain the character profile choices"
                    >
                        <Info size={12} aria-hidden="true" />
                    </button>
                </div>
                <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-950/80 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-zinc-400">
                    {locked ? 'Canon' : sourceLabel}
                </span>
            </div>
            <p className="mt-1 max-w-xl text-[9px] font-semibold leading-4 text-zinc-500">
                Define the character’s story job, audience read, abilities, and nature.
            </p>

            <div className="mt-3 grid auto-rows-fr grid-cols-2 overflow-hidden rounded-2xl border border-zinc-800/90 bg-black/25">
                {IDENTITY_FIELDS.map((field, index) => {
                    const copy = CHARACTER_IDENTITY_FIELD_COPY[field];
                    const option = getCharacterIdentityOption(field, current[field]);

                    return (
                        <button
                            key={field}
                            type="button"
                            disabled={locked}
                            onClick={(event) => {
                                event.stopPropagation();
                                setActiveField(field);
                            }}
                            className={`group min-h-[5.75rem] min-w-0 cursor-pointer px-3 py-3 text-left transition-colors hover:bg-white/[0.035] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 disabled:cursor-default ${
                                index % 2 === 0 ? 'border-r border-zinc-800/90' : ''
                            } ${index < 2 ? 'border-b border-zinc-800/90' : ''}`}
                        >
                            <span className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                {copy.label}
                            </span>
                            <span className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
                                <span className="min-w-0 text-[10px] font-black uppercase leading-4 tracking-[0.09em] text-zinc-100">
                                    {option.label}
                                </span>
                                {!locked && <ChevronRight size={13} className="shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-200" />}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className={`mt-2.5 rounded-xl border px-3 py-2.5 ${tone.border} ${tone.background}`} aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                        <span className={`text-[8px] font-black uppercase tracking-[0.16em] ${tone.text}`}>
                            {formatCharacterStoryFitLabel(fit.label)}
                        </span>
                    </div>
                    <span className="shrink-0 font-mono text-[9px] font-black text-zinc-500">{fit.score}/100</span>
                </div>
                <p className="mt-1 text-[9px] font-semibold leading-4 text-zinc-400">
                    {fit.warnings[0] || fit.strengths[0] || fit.summary}
                </p>
            </div>

            {!locked && hasCustomChanges && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        restoreAll();
                    }}
                    className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-1 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/80 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                    <RotateCcw size={12} aria-hidden="true" />
                    Restore story suggestions
                </button>
            )}

            {activeField && activeCopy && createPortal(
                <div
                    className="fixed inset-0 z-[140] flex items-end bg-black/75 backdrop-blur-sm"
                    role="presentation"
                    onClick={() => setActiveField(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`identity-${activeField}-title`}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-h-[82dvh] overflow-hidden rounded-t-[28px] border-t border-zinc-700 bg-[#0d0d0f] shadow-[0_-24px_80px_rgba(0,0,0,0.65)]"
                        style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
                    >
                        <div className="mx-auto mt-2.5 h-1 w-12 rounded-full bg-zinc-700" />
                        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300">Character Profile</p>
                                <h3 id={`identity-${activeField}-title`} className="mt-1 text-xl font-black text-white">{activeCopy.label}</h3>
                                <p className="mt-1 max-w-md text-[11px] font-medium leading-5 text-zinc-400">{activeCopy.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveField(null)}
                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                aria-label="Close options"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overscroll-contain overflow-y-auto border-t border-zinc-800/80 px-4 py-3" style={{ maxHeight: 'min(60dvh, 34rem)' }}>
                            <div className="space-y-2">
                                {activeOptions.map(option => {
                                    const selected = current[activeField] === option.value;
                                    const suggestedOption = suggested[activeField] === option.value;
                                    const candidate = { ...current, [activeField]: option.value } as CharacterIdentityProfile;
                                    const candidateFit = evaluateCharacterProfileFit(storyCompass, candidate, effectiveRoleType);
                                    const candidateTone = fitTone[candidateFit.label];

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onChange({ [activeField]: option.value, identitySource: 'PLAYER' });
                                                setActiveField(null);
                                            }}
                                            className={`w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                                                selected
                                                    ? 'border-cyan-300/55 bg-cyan-300/[0.08]'
                                                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                                            }`}
                                        >
                                            <span className="flex items-start justify-between gap-4">
                                                <span className="min-w-0">
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-black text-zinc-100">{option.label}</span>
                                                        {suggestedOption && (
                                                            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.14em] text-cyan-200">
                                                                Story suggestion
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="mt-1 block text-[10px] font-medium leading-4 text-zinc-500">{option.description}</span>
                                                    <span className={`mt-2 flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.14em] ${candidateTone.text}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${candidateTone.dot}`} />
                                                        {formatCharacterStoryFitLabel(candidateFit.label)}
                                                    </span>
                                                </span>
                                                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                                    selected ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-zinc-700 text-transparent'
                                                }`}>
                                                    <Check size={13} strokeWidth={3} />
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {current[activeField] !== suggested[activeField] && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        restoreField(activeField);
                                        setActiveField(null);
                                    }}
                                    className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] text-[8px] font-black uppercase tracking-[0.15em] text-cyan-200 transition-colors hover:bg-cyan-300/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                >
                                    <RotateCcw size={13} />
                                    Use suggested {activeCopy.shortLabel.toLowerCase()}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {showGuide && createPortal(
                <div
                    className="fixed inset-0 z-[145] flex items-end bg-black/75 backdrop-blur-sm"
                    role="presentation"
                    onClick={() => setShowGuide(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="character-profile-guide-title"
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-h-[84dvh] overflow-hidden rounded-t-[28px] border-t border-zinc-700 bg-[#0d0d0f]"
                        style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
                    >
                        <div className="mx-auto mt-2.5 h-1 w-12 rounded-full bg-zinc-700" />
                        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300">Casting Guide</p>
                                <h3 id="character-profile-guide-title" className="mt-1 text-xl font-black text-white">What these choices mean</h3>
                                <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-400">
                                    They shape story coherence and public reaction. They do not lock you into one “correct” cast.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                aria-label="Close character profile guide"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overscroll-contain overflow-y-auto border-t border-zinc-800/80 px-5 py-3" style={{ maxHeight: 'min(64dvh, 36rem)' }}>
                            {IDENTITY_FIELDS.map((field, index) => {
                                const copy = CHARACTER_IDENTITY_FIELD_COPY[field];
                                return (
                                    <div key={field} className={`py-3 ${index ? 'border-t border-zinc-800/80' : ''}`}>
                                        <p className="text-[9px] font-black uppercase tracking-[0.17em] text-zinc-100">{copy.label}</p>
                                        <p className="mt-1 text-[10px] font-medium leading-4 text-zinc-400">{copy.description}</p>
                                        <p className="mt-1 text-[9px] font-semibold leading-4 text-cyan-200/70">{copy.affects}</p>
                                    </div>
                                );
                            })}
                            <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4">
                                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-200">Creative freedom remains</div>
                                <p className="mt-2 text-[10px] font-medium leading-5 text-zinc-400">
                                    Natural fits are reliable. Bold interpretations can become inspired casting when the script and performance earn them. Only unexplained contradictions create a direct coherence penalty.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </section>
    );
};
