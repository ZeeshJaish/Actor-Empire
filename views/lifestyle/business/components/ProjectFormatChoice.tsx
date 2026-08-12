import React from 'react';
import { Film, Tv } from 'lucide-react';
import type { ProjectType } from '../../../../types';

interface ProjectFormatChoiceProps {
    value: ProjectType;
    onChange: (value: ProjectType) => void;
    label?: string;
    helperText?: string;
}

const FORMAT_OPTIONS: Array<{
    value: ProjectType;
    label: string;
    description: string;
    icon: React.ReactNode;
}> = [
    {
        value: 'MOVIE',
        label: 'Feature Film',
        description: 'One focused big-screen story',
        icon: <Film size={18} />,
    },
    {
        value: 'SERIES',
        label: 'Series',
        description: 'An episodic world expansion',
        icon: <Tv size={18} />,
    },
];

export const ProjectFormatChoice: React.FC<ProjectFormatChoiceProps> = ({
    value,
    onChange,
    label = 'Choose Format',
    helperText = 'The format controls episode planning, budget structure, production, and release options.',
}) => (
    <fieldset>
        <legend className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {label}
        </legend>
        <div
            className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-black/45 p-1.5"
            role="radiogroup"
            aria-label={label}
        >
            {FORMAT_OPTIONS.map(option => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={`min-w-0 cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                            selected
                                ? 'border-amber-400/60 bg-amber-400/12 text-white'
                                : 'border-transparent text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className={selected ? 'text-amber-300' : 'text-zinc-600'}>{option.icon}</span>
                            <span className="text-xs font-black uppercase tracking-wider">{option.label}</span>
                        </span>
                        <span className={`mt-1.5 block text-[10px] leading-snug ${selected ? 'text-zinc-300' : 'text-zinc-600'}`}>
                            {option.description}
                        </span>
                    </button>
                );
            })}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{helperText}</p>
    </fieldset>
);
