import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';

export type StudioDivisionAccent = 'BLUE' | 'EMERALD' | 'PURPLE' | 'ORANGE' | 'GOLD';

const DIVISION_TONES: Record<StudioDivisionAccent, {
    frame: string;
    key: string;
    light: string;
    stat: string;
}> = {
    BLUE: {
        frame: 'border-blue-400/25',
        key: 'bg-[#10213a] text-blue-200 shadow-[0_5px_0_#071223]',
        light: 'bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.95)]',
        stat: 'text-blue-300',
    },
    EMERALD: {
        frame: 'border-emerald-400/25',
        key: 'bg-[#0a2b21] text-emerald-200 shadow-[0_5px_0_#03140f]',
        light: 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.95)]',
        stat: 'text-emerald-300',
    },
    PURPLE: {
        frame: 'border-purple-400/25',
        key: 'bg-[#29143a] text-purple-200 shadow-[0_5px_0_#13081d]',
        light: 'bg-purple-300 shadow-[0_0_8px_rgba(216,180,254,0.95)]',
        stat: 'text-purple-300',
    },
    ORANGE: {
        frame: 'border-orange-400/25',
        key: 'bg-[#371b08] text-orange-200 shadow-[0_5px_0_#1d0c03]',
        light: 'bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.95)]',
        stat: 'text-orange-300',
    },
    GOLD: {
        frame: 'border-amber-300/40',
        key: 'bg-[#3a2608] text-amber-100 shadow-[0_5px_0_#1c1002]',
        light: 'bg-amber-200 shadow-[0_0_9px_rgba(253,230,138,1)]',
        stat: 'text-amber-200',
    },
};

interface StudioDivisionCardProps {
    title: string;
    subtitle: string;
    eyebrow?: string;
    icon: React.ReactNode;
    accent: StudioDivisionAccent;
    stats: { label: string; value: string }[];
    onClick: () => void;
    locked?: boolean;
    wide?: boolean;
    ariaLabel?: string;
}

export const StudioDivisionCard: React.FC<StudioDivisionCardProps> = ({
    title,
    subtitle,
    eyebrow,
    icon,
    accent,
    stats,
    onClick,
    locked,
    wide,
    ariaLabel,
}) => {
    const tone = DIVISION_TONES[accent];
    return (
        <button
            type="button"
            onClick={locked ? undefined : onClick}
            disabled={locked}
            aria-label={ariaLabel || title}
            className={`division-command-card control-key group relative min-h-[88px] w-full touch-manipulation rounded-[16px] border-2 bg-[#11100f] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_5px_0_#030303] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_0_#030303] ${wide ? 'col-span-2 min-h-[92px] p-2.5' : ''} ${locked ? 'cursor-not-allowed border-white/[0.06] opacity-45' : `cursor-pointer ${tone.frame} hover:bg-[#171512]`}`}
        >
            <span className={`status-light absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full ${tone.light}`} />
            <div className={`relative flex h-full items-center gap-2 pr-1 ${wide ? 'pr-3 sm:gap-4' : ''}`}>
                <div className={`flex shrink-0 items-center justify-center rounded-[12px] border border-white/10 ${wide ? 'h-11 w-11' : 'h-10 w-10'} ${tone.key} transition-transform duration-200 group-active:translate-y-[2px]`}>
                    {icon}
                </div>

                <div className="min-w-0 flex-1">
                    {eyebrow ? <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-amber-300">{eyebrow}</div> : null}
                    <div className={`${wide ? 'text-[12px]' : 'text-[8px]'} break-words font-black uppercase leading-[1.05] text-white`}>{title}</div>
                    <div className={`mt-1 ${wide ? 'text-[6px]' : 'text-[5px]'} break-words font-black uppercase leading-tight tracking-[0.12em] text-zinc-500`}>{subtitle}</div>
                    {!locked && stats.length > 0 ? (
                        <div className={`mt-2 flex min-w-0 items-center gap-2 ${wide ? 'justify-between' : ''}`}>
                            {stats.slice(0, wide ? 2 : 1).map((stat, index) => (
                                <div key={stat.label} className={`min-w-0 ${wide && index > 0 ? 'text-right' : ''}`}>
                                    <span className="block truncate text-[5px] font-black uppercase tracking-[0.12em] text-zinc-600">{stat.label}</span>
                                    <span className={`mt-0.5 block truncate font-mono text-[9px] font-black ${tone.stat}`}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="absolute bottom-0 right-0 flex h-5 w-4 items-center justify-center text-zinc-600 transition-colors duration-200 group-hover:text-white">
                    {locked ? <Lock size={11} /> : <ChevronRight size={15} />}
                </div>
            </div>
        </button>
    );
};
