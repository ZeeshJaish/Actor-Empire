import React, { useState } from 'react';
import { Briefcase, ChevronDown, Clapperboard, Globe2, Newspaper, Sparkles, Trophy, Tv, Wrench, type LucideIcon } from 'lucide-react';
import { getChangelogTypeLabel, type ChangelogEntry, type ChangelogHighlightIcon } from '../services/changelog';

/* Zeesh, 2026-11-09: the update popup was a long scroll of paragraphs. Now: the headline and four tiles fit one phone
   screen, "Also new" and "Fixes" open on a tap, and Continue stays pinned at the bottom. */

const ICONS: Record<ChangelogHighlightIcon, LucideIcon> = {
    STREAMING: Tv, GLOBE: Globe2, TROPHY: Trophy, BOARDROOM: Briefcase, SPARKLES: Sparkles, FILM: Clapperboard, NEWS: Newspaper, FIX: Wrench,
};
const TINTS = ['text-rose-300 bg-rose-500/15', 'text-sky-300 bg-sky-500/15', 'text-amber-300 bg-amber-500/15', 'text-emerald-300 bg-emerald-500/15'];
const EARLIER_SHOWN = 6;
const EARLIER = '__earlier';
const MOTION = `
@keyframes wn-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.wn-rise { animation: wn-rise 360ms cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .wn-rise { animation: none; } }
`;

interface WhatsNewModalProps {
    entry: ChangelogEntry;
    previous: ChangelogEntry[];
    version: string;
    eyebrow: string;
    continueLabel: string;
    onDismiss: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ entry, previous, version, eyebrow, continueLabel, onDismiss }) => {
    const [open, setOpen] = useState<string | null>(null);
    const toggle = (key: string) => setOpen(current => (current === key ? null : key));
    const highlights = entry.highlights || [];
    const rows = [
        ...entry.sections.map(section => ({ key: section.heading, label: section.heading, count: section.items.length, items: section.items })),
        ...(previous.length ? [{ key: EARLIER, label: 'Earlier updates', count: previous.length, items: [] as string[] }] : []),
    ];
    const safeTop = 'max(20px, calc(12px + env(safe-area-inset-top)))';
    const safeBottom = 'max(20px, calc(12px + env(safe-area-inset-bottom)))';

    return (
        <div
            data-whats-new
            className="fixed inset-0 z-[140] flex items-center bg-black/85 px-3 backdrop-blur-md sm:px-6"
            style={{ paddingTop: safeTop, paddingBottom: safeBottom }}
            role="dialog"
            aria-modal="true"
            aria-label={`${eyebrow}: ${entry.title}`}
        >
            <style>{MOTION}</style>
            {/* clear of the status bar and the home indicator: the card fits between them */}
            <div
                className="wn-rise relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 shadow-2xl"
                style={{ maxHeight: `calc(100dvh - ${safeTop} - ${safeBottom})` }}
            >
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-rose-500/20 via-amber-500/[0.06] to-transparent" />
                <div className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar px-5 pb-3 pt-5">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">{eyebrow}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                            v{version} · {getChangelogTypeLabel(entry.type)}
                        </span>
                    </div>
                    <h3 className="mt-3 text-[28px] font-black leading-[1.05] text-white">{entry.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{entry.summary}</p>

                    {highlights.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {highlights.map((highlight, index) => {
                                const Icon = ICONS[highlight.icon] || Sparkles;
                                return (
                                    <div
                                        key={highlight.title}
                                        className="wn-rise rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3"
                                        style={{ animationDelay: `${90 + index * 70}ms` }}
                                    >
                                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${TINTS[index % TINTS.length]}`}>
                                            <Icon size={16} strokeWidth={2.4} aria-hidden="true" />
                                        </span>
                                        <div className="mt-2 text-[13px] font-black leading-tight text-white">{highlight.title}</div>
                                        <div className="mt-1 text-[11.5px] leading-snug text-zinc-400">{highlight.text}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {entry.note && <p className="mt-3 text-[11.5px] leading-snug text-zinc-500">{entry.note}</p>}

                    <div className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                        {rows.map(row => (
                            <div key={row.key}>
                                <button
                                    type="button"
                                    onClick={() => toggle(row.key)}
                                    aria-expanded={open === row.key}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-white/[0.04]"
                                >
                                    <span className="text-[13px] font-bold text-zinc-100">{row.label}</span>
                                    <span className="flex items-center gap-2 text-[11px] font-bold text-zinc-500">
                                        {row.count}
                                        <ChevronDown size={15} aria-hidden="true" className={`transition-transform duration-200 ${open === row.key ? 'rotate-180' : ''}`} />
                                    </span>
                                </button>
                                {open === row.key && row.key !== EARLIER && (
                                    <ul className="wn-rise space-y-2 px-4 pb-4 text-[12.5px] leading-snug text-zinc-300">
                                        {row.items.map(item => (
                                            <li key={item} className="flex gap-2">
                                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-300/80" aria-hidden="true" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {open === row.key && row.key === EARLIER && (
                                    <div className="wn-rise px-4 pb-4">
                                        <ul className="space-y-2">
                                            {previous.slice(0, EARLIER_SHOWN).map(item => (
                                                <li key={item.version} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                                                    <span className="min-w-0 text-zinc-300">
                                                        <span className="font-bold text-zinc-500">v{item.version}</span> {item.title}
                                                    </span>
                                                    <span className="shrink-0 text-[11px] text-zinc-600">{item.releaseLabel}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="mt-3 text-[11px] leading-snug text-zinc-500">Every update's full notes are in Settings, under Changelog.</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative shrink-0 border-t border-white/[0.06] bg-zinc-950 px-5 pb-5 pt-3">
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-black text-black transition-transform active:scale-[0.98]"
                    >
                        {continueLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
