import React, { useMemo, useRef } from 'react';
import { ArrowRight, ChevronsUp, Star } from 'lucide-react';
import {
    evenEpisodeShares,
    getEpisodeZone,
    getSeasonEffects,
    getSeasonShape,
    getSeasonZones,
    moveEpisodeBar,
    SEASON_SHAPE_NAMES,
    type EpisodeZone,
} from '../../services/originalsEpisodeBudget';

const money = (value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}` : `${(value / 1_000_000).toFixed(2)}`);
const percent = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value * 100))}%`;

const ZONE_STYLE: Record<EpisodeZone, { label: string; bar: string; panel: string; text: string }> = {
    START: { label: 'Start', bar: 'linear-gradient(to top, #d97706, #fcd34d)', panel: 'rgba(245,158,11,.08)', text: '#fcd34d' },
    MIDDLE: { label: 'Middle', bar: 'linear-gradient(to top, #2563eb, #93c5fd)', panel: 'rgba(59,130,246,.08)', text: '#93c5fd' },
    FINALE: { label: 'Finale', bar: 'linear-gradient(to top, #7c3aed, #d8b4fe)', panel: 'rgba(168,85,247,.08)', text: '#d8b4fe' },
};

const CHART_HEIGHT = 132;

const EffectRow: React.FC<{ icon: React.ReactNode; title: string; line: string; value: number }> = ({ icon, title, line, value }) => (
    <div className="grid min-h-[44px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 py-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-zinc-300">{icon}</span>
        <span className="min-w-0">
            <span className="block text-xs font-black leading-tight">{title}</span>
            <span className="block text-[10px] font-semibold leading-tight text-zinc-500">{line}</span>
        </span>
        <span className={`font-mono text-sm font-black ${value > 0 ? 'text-emerald-300' : value < 0 ? 'text-rose-300' : 'text-zinc-400'}`}>{percent(value)}</span>
    </div>
);

/** #286: the season's money as bars you drag. There are no shape buttons: the game names the season from what you did. */
export const EpisodeBudgetBars: React.FC<{
    shares: number[];
    /** What making the season costs: the bars divide it and never change it */
    total: number;
    /** Set on a pitch: the studio's way of spending, shown and not changed */
    readOnly?: boolean;
    studioName?: string;
    onChange?: (shares: number[]) => void;
}> = ({ shares, total, readOnly, studioName, onChange }) => {
    const count = shares.length;
    const shape = useMemo(() => getSeasonShape(shares), [shares]);
    const effects = useMemo(() => getSeasonEffects(shares), [shares]);
    const zones = getSeasonZones(count);
    const biggest = Math.max(...shares);
    const drag = useRef<{ index: number; startY: number; startValue: number; scale: number } | null>(null);

    const onPointerDown = (event: React.PointerEvent, index: number) => {
        if (readOnly) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { index, startY: event.clientY, startValue: shares[index], scale: biggest / CHART_HEIGHT };
    };
    const onPointerMove = (event: React.PointerEvent) => {
        if (!drag.current || readOnly) return;
        const { index, startY, startValue, scale } = drag.current;
        onChange?.(moveEpisodeBar(shares, index, startValue + (startY - event.clientY) * scale));
    };
    const onPointerUp = () => { drag.current = null; };

    const groups: Array<{ zone: EpisodeZone; indexes: number[] }> = [
        { zone: 'START', indexes: Array.from({ length: zones.start }, (_, i) => i) },
        { zone: 'MIDDLE', indexes: Array.from({ length: zones.middle }, (_, i) => zones.start + i) },
        { zone: 'FINALE', indexes: Array.from({ length: zones.finale }, (_, i) => count - zones.finale + i) },
    ].filter(group => group.indexes.length > 0) as Array<{ zone: EpisodeZone; indexes: number[] }>;

    return (
        <section id="setup-episodes" data-episode-budget className="scroll-mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2">
                <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-amber-200/80">{readOnly ? `How ${studioName || 'the studio'} spends the season` : 'Your season is'}</span>
                    <span data-season-shape className="block text-lg font-black uppercase italic leading-tight text-amber-200">{SEASON_SHAPE_NAMES[shape]}</span>
                </span>
                {!readOnly && (
                    <button type="button" data-budget-reset onClick={() => onChange?.(evenEpisodeShares(count))} className="min-h-9 shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">Reset</button>
                )}
            </div>

            <div className="mt-2.5 flex gap-1.5" style={{ touchAction: readOnly ? undefined : 'none' }}>
                {groups.map(({ zone, indexes }) => (
                    <div key={zone} className="min-w-0 rounded-xl p-1.5" style={{ flexGrow: indexes.length, flexBasis: 0, background: ZONE_STYLE[zone].panel }}>
                        <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.12em]" style={{ color: ZONE_STYLE[zone].text }}>{ZONE_STYLE[zone].label}</div>
                        <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT + 16 }}>
                            {indexes.map(index => (
                                <div
                                    key={index}
                                    data-episode-bar={index}
                                    role={readOnly ? undefined : 'slider'}
                                    aria-label={`Episode ${index + 1} money`}
                                    aria-valuenow={Math.round(shares[index] * total)}
                                    tabIndex={readOnly ? undefined : 0}
                                    onPointerDown={event => onPointerDown(event, index)}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
                                    onPointerCancel={onPointerUp}
                                    onKeyDown={event => {
                                        if (readOnly) return;
                                        if (event.key === 'ArrowUp') onChange?.(moveEpisodeBar(shares, index, shares[index] * 1.1));
                                        if (event.key === 'ArrowDown') onChange?.(moveEpisodeBar(shares, index, shares[index] * 0.9));
                                    }}
                                    className={`flex h-full min-w-0 flex-1 flex-col items-center justify-end ${readOnly ? '' : 'cursor-ns-resize'}`}
                                >
                                    <span className="mb-0.5 font-mono text-[8px] font-black leading-none text-zinc-300">{money(shares[index] * total)}</span>
                                    <span className="block w-full rounded-t" style={{ height: Math.max(3, (shares[index] / biggest) * CHART_HEIGHT), background: ZONE_STYLE[zone].bar }} />
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 flex gap-1">
                            {indexes.map(index => <span key={index} className="min-w-0 flex-1 text-center text-[8px] font-black text-zinc-500">{index + 1}</span>)}
                        </div>
                    </div>
                ))}
            </div>
            {!readOnly && <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-500">Drag any bar, no limit. The total stays ${money(total)}M.</p>}

            <div className="mt-2 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
                <EffectRow icon={<ChevronsUp size={14} />} title="Pull viewers in" line="More people start it" value={effects.pull} />
                <EffectRow icon={<ArrowRight size={14} />} title="Keep them watching" line="More people finish it" value={effects.keep} />
                <EffectRow icon={<Star size={14} />} title="Season 2 hype" line="Fans wait for more" value={effects.hype} />
            </div>
        </section>
    );
};

export default EpisodeBudgetBars;
