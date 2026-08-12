import React, { useState } from 'react';
import {
    Check,
    ChevronDown,
    ChevronUp,
    CircleDollarSign,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import {
    type BackgroundCastingControl,
    type BackgroundCastingPlan,
    type BackgroundCastingSource,
    type BackgroundEnsembleScale,
    type BackgroundPayStandard,
} from '../../../../types';
import {
    buildBackgroundCastingPlan,
    type BackgroundCastingContext,
} from '../../../../services/livingEnsemble';

interface BackgroundCastingPanelProps {
    plan: BackgroundCastingPlan;
    context: BackgroundCastingContext;
    onChange: (plan: BackgroundCastingPlan) => void;
}

interface CastingPackage {
    id: string;
    name: string;
    label: string;
    description: string;
    choices: {
        scale: BackgroundEnsembleScale;
        source: BackgroundCastingSource;
        payStandard: BackgroundPayStandard;
        control: BackgroundCastingControl;
    };
}

const PACKAGES: CastingPackage[] = [
    {
        id: 'CONTROLLED',
        name: 'Essential Extras',
        label: 'Lean',
        description: 'A small agency unit for focused scenes and controlled schedules.',
        choices: { scale: 'LEAN', source: 'AGENCY', payStandard: 'COMPLIANT', control: 'DEPARTMENT' },
    },
    {
        id: 'STORY',
        name: 'Story-Matched Crowd',
        label: 'Recommended',
        description: 'Local faces, fair pay, and a crowd size matched to your script.',
        choices: { scale: 'STORY_FIT', source: 'LOCAL', payStandard: 'FAIR_PAY', control: 'REVIEW' },
    },
    {
        id: 'DISCOVERY',
        name: 'Open Casting Call',
        label: 'More discovery',
        description: 'A wider search that can uncover future talent, with more schedule risk.',
        choices: { scale: 'FULL_WORLD', source: 'OPEN_CALL', payStandard: 'FAIR_PAY', control: 'CUSTOM' },
    },
    {
        id: 'SPECTACLE',
        name: 'Large-Scale Ensemble',
        label: 'Premium',
        description: 'Specialist performers for action, crowds, period scenes, and spectacle.',
        choices: { scale: 'EPIC', source: 'SPECIALIST', payStandard: 'PREMIUM', control: 'REVIEW' },
    },
];

const SCALE_OPTIONS: Array<{ id: BackgroundEnsembleScale; label: string }> = [
    { id: 'LEAN', label: 'Lean' },
    { id: 'STORY_FIT', label: 'Story Fit' },
    { id: 'FULL_WORLD', label: 'Full World' },
    { id: 'EPIC', label: 'Epic' },
];
const SOURCE_OPTIONS: Array<{ id: BackgroundCastingSource; label: string }> = [
    { id: 'AGENCY', label: 'Agency' },
    { id: 'LOCAL', label: 'Local' },
    { id: 'OPEN_CALL', label: 'Open Call' },
    { id: 'COMMUNITY', label: 'Community' },
    { id: 'SPECIALIST', label: 'Specialist' },
];
const PAY_OPTIONS: Array<{ id: BackgroundPayStandard; label: string }> = [
    { id: 'COMPLIANT', label: 'Compliant' },
    { id: 'FAIR_PAY', label: 'Fair Pay' },
    { id: 'PREMIUM', label: 'Premium' },
    { id: 'COMMUNITY_SUPPORTED', label: 'Supported' },
];
const money = (value: number) => value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(1)}M`
    : `$${Math.max(0, Math.round(value / 1_000))}k`;

const TuneRow = <T extends string,>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: Array<{ id: T; label: string }>;
    onChange: (value: T) => void;
}) => (
    <fieldset>
        <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</legend>
        <div className="flex flex-wrap gap-2">
            {options.map(option => {
                const selected = value === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.id)}
                        className={`min-h-11 cursor-pointer rounded-xl border px-3.5 text-[10px] font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                            selected
                                ? 'border-emerald-400 bg-emerald-950 text-emerald-200'
                                : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900'
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    </fieldset>
);

const SummaryStat: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
}> = ({ icon, label, value }) => (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3">
        <div className="flex items-center gap-2 text-zinc-300">
            {icon}
            <span className="text-[10px] font-bold">{label}</span>
        </div>
        <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
);

export const BackgroundCastingPanel: React.FC<BackgroundCastingPanelProps> = ({ plan, context, onChange }) => {
    const [showTuning, setShowTuning] = useState(false);
    const update = (choices: Partial<Pick<BackgroundCastingPlan, 'scale' | 'source' | 'payStandard'>>) => {
        onChange(buildBackgroundCastingPlan(context, {
            scale: choices.scale || plan.scale,
            source: choices.source || plan.source,
            payStandard: choices.payStandard || plan.payStandard,
            // Control remains an internal package rule for backwards-compatible
            // save calculations; it is no longer a player-facing setting.
            control: plan.control,
        }));
    };
    const selectedPackage = PACKAGES.find(option => (
        option.choices.scale === plan.scale
        && option.choices.source === plan.source
        && option.choices.payStandard === plan.payStandard
        && option.choices.control === plan.control
    ));

    return (
        <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-[#09090b] shadow-xl">
            <header className="border-b border-zinc-700 bg-[#111114] p-5">
                <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                        <Users size={21} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">Casting Department</p>
                        <h3 className="mt-1 text-xl font-black text-white">Background Cast</h3>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
                            Choose how your production hires extras, day players, and specialist background performers.
                        </p>
                    </div>
                </div>
            </header>

            <div className="space-y-3 bg-[#09090b] p-3 sm:p-4">
                {PACKAGES.map(option => {
                    const preview = buildBackgroundCastingPlan(context, option.choices);
                    const selected = selectedPackage?.id === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(preview)}
                            className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                selected
                                    ? 'border-emerald-400 bg-[#13241d]'
                                    : 'border-zinc-700 bg-[#151518] hover:border-zinc-500 hover:bg-zinc-900'
                            }`}
                        >
                            <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
                                <span className={`grid h-11 w-11 place-items-center rounded-full border ${
                                    selected
                                        ? 'border-emerald-300 bg-emerald-500 text-black'
                                        : 'border-zinc-600 bg-zinc-900 text-zinc-400'
                                }`}>
                                    {selected
                                        ? <Check size={18} strokeWidth={3} aria-hidden="true" />
                                        : <Users size={18} aria-hidden="true" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-black text-white">{option.name}</span>
                                        <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                                            selected
                                                ? 'bg-emerald-700 text-white'
                                                : 'bg-zinc-800 text-zinc-300'
                                        }`}>
                                            {option.label}
                                        </span>
                                    </span>
                                    <span className="mt-1.5 block text-xs leading-relaxed text-zinc-300">{option.description}</span>
                                </span>
                                <span className="pl-2 text-right">
                                    <span className="block font-mono text-sm font-black text-white">{money(preview.estimatedCost)}</span>
                                    <span className="mt-1 block text-[10px] font-bold text-zinc-400">{preview.performerCount} people</span>
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="border-t border-zinc-700 bg-[#111114] p-4 sm:p-5" aria-live="polite">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Current plan</p>
                        <p className="mt-1 text-base font-black text-white">
                            {plan.performerCount} extras · {plan.recurringDayPlayers} recurring day players
                        </p>
                        {plan.specialistRoles.length > 0 && (
                            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                                Specialists: {plan.specialistRoles.join(', ')}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3">
                        <CircleDollarSign size={17} className="text-emerald-400" aria-hidden="true" />
                        <div>
                            <p className="font-mono text-base font-black text-white">{money(plan.estimatedCost)}</p>
                            <p className="text-[9px] font-bold text-zinc-400">Production budget</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    <SummaryStat icon={<Users size={14} />} label="Authenticity" value={plan.authenticity} />
                    <SummaryStat icon={<ShieldCheck size={14} />} label="Set care" value={plan.setCare} />
                    <SummaryStat icon={<Sparkles size={14} />} label="Discovery" value={plan.discoveryPotential} />
                </div>

                <button
                    type="button"
                    onClick={() => setShowTuning(value => !value)}
                    aria-expanded={showTuning}
                    className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-950 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200 transition-colors hover:border-zinc-400 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    Customise This Plan
                    {showTuning ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                </button>

                {showTuning && (
                    <div className="mt-4 space-y-5 rounded-xl border border-zinc-700 bg-[#09090b] p-4">
                        <TuneRow label="World Scale" value={plan.scale} options={SCALE_OPTIONS} onChange={scale => update({ scale })} />
                        <TuneRow label="Casting Source" value={plan.source} options={SOURCE_OPTIONS} onChange={source => update({ source })} />
                        <TuneRow label="Pay Standard" value={plan.payStandard} options={PAY_OPTIONS} onChange={payStandard => update({ payStandard })} />
                    </div>
                )}
            </div>
        </section>
    );
};
