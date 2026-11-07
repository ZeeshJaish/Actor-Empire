import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronRight, Plus, Radar, Search } from 'lucide-react';
import type { Player } from '../../types';
import { buyOriginalAudienceReport, getActiveAudienceReport, getOriginalAudienceReportPrice } from '../../services/originalsAudienceReport';
import { getOriginalsDeskView, type DeskPitch, type DeskTitle } from '../../services/originalsDesk';
import { getOriginalPitchRefreshInWeeks, getOriginalScoutQuote, scoutOriginalPitches } from '../../services/originalsPitches';
import { formatGenreLabel } from '../../services/genreCatalog';
import PersonFace from '../streaming-transplant/PersonFace';

const money = (value: number) => (value >= 1_000_000_000
    ? `$${(value / 1_000_000_000).toFixed(1)}B`
    : value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}M`
        : `$${Math.round(value / 1_000)}K`);

const POSTER_COLORS = ['#7f1d1d', '#1e3a8a', '#064e3b', '#581c87', '#78350f', '#831843', '#155e75', '#312e81'];
export const posterColor = (title: string) => POSTER_COLORS[title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % POSTER_COLORS.length];

/** A title's art: its name in big serif type over a colour of its own, the same look the Production House's cards have */
const posterInitials = (title: string): string => {
    const words = title.split(/\s+/).filter(word => word && !/^(the|of|and|a|an|in|on)$/i.test(word));
    return (words.length ? words : [title]).slice(0, 3).map(word => word[0]).join('');
};

export const OriginalPoster: React.FC<{ title: string; className?: string; small?: boolean; children?: React.ReactNode }> = ({ title, className = '', small, children }) => {
    const longestWord = title.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 1);
    const fontSize = small ? 18 : Math.min(22, Math.floor(118 / (longestWord * 0.66)));
    return (
        /* #316: "relative" beat a caller's "absolute" in the stylesheet, so a poster filling a card had no height and the card was black */
        <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative '}overflow-hidden ${className}`} style={{ background: `linear-gradient(145deg, ${posterColor(title)}, #000 120%)` }}>
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-1 text-center font-serif font-black uppercase leading-[.95] tracking-tighter text-white/15 -rotate-6" style={{ fontSize }}>{small ? posterInitials(title) : title}</div>
            {children}
        </div>
    );
};

const SlateCard: React.FC<{ title: DeskTitle; onOpen: () => void }> = ({ title, onOpen }) => (
    <button
        type="button"
        data-desk-making={title.commission.id}
        onClick={onOpen}
        className="relative h-[176px] w-[132px] shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-900 text-left active:scale-[0.98]"
        style={{ borderColor: title.color, boxShadow: `0 0 14px ${title.color}44` }}
    >
        <OriginalPoster title={title.commission.title} className="absolute inset-0" />
        <span className="absolute inset-x-0 top-0 z-10 truncate px-1.5 py-1 text-center text-[9px] font-black uppercase leading-none tracking-[0.06em] text-white" style={{ background: title.color }}>{title.byLabel}</span>
        <span className="absolute left-2 top-7 z-10 rounded bg-rose-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">{title.phaseLabel}</span>
        <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
            <span className="line-clamp-2 block text-[13px] font-black leading-tight text-white">{title.commission.title}</span>
            <span className="mt-1 flex items-end justify-between text-[9px] font-bold text-zinc-400">
                <span><span className="block text-[7px] uppercase">Budget</span><span className="font-mono text-zinc-200">{money(title.budget)}</span></span>
                {title.weeksLeft !== null && <span className="text-right"><span className="block text-[7px] uppercase">Time left</span><span className="font-mono text-zinc-200">{title.weeksLeft}w</span></span>}
            </span>
        </span>
    </button>
);

const PitchCard: React.FC<{ item: DeskPitch; onOpen: () => void }> = ({ item, onOpen }) => {
    const { pitch, studio } = item;
    const isSeries = pitch.script.projectType === 'SERIES';
    return (
        <button type="button" data-desk-pitch={pitch.id} onClick={onOpen} className="grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left active:scale-[0.99]">
            <span className="block">
                <OriginalPoster title={pitch.script.title} small className="h-[76px] w-16 rounded-lg" />
                <span data-pitch-ask className="mt-1 block text-center font-mono text-[11px] font-black leading-tight text-amber-300">~{money(isSeries ? item.perEpisodeAbout : item.askAbout)}</span>
                <span className="block text-center text-[8px] font-black uppercase leading-tight tracking-wider text-zinc-500">{isSeries ? 'per episode' : 'in all'}</span>
            </span>
            <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-200">{isSeries ? 'Series' : 'Movie'}</span>
                    {item.fitsGap && <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">Fits your gap</span>}
                    {item.recommended && <span className="rounded bg-amber-300/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-200">Your team likes it</span>}
                    {pitch.chasedByPlatformName && <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-200">{pitch.chasedByPlatformName} is looking</span>}
                    <span className="ml-auto whitespace-nowrap text-[9px] font-black uppercase text-rose-300">{item.weeksLeft === 0 ? 'Last week' : `${item.weeksLeft} ${item.weeksLeft === 1 ? 'week' : 'weeks'} left`}</span>
                </span>
                <span className="mt-1 block truncate text-sm font-black text-white">{pitch.script.title}</span>
                <span className="block truncate text-[11px] font-semibold text-zinc-400">{formatGenreLabel(pitch.script.genres[0])}{isSeries ? ` · ${pitch.script.episodes} episodes` : ''}</span>
                {/* #303: who is pitching: the studio, and who it has attached */}
                <span data-pitch-from className="mt-1.5 grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-2">
                    {studio ? <span className="grid h-5 w-5 place-items-center rounded text-[7px] font-black text-white" style={{ background: studio.color }}>{studio.mark}</span> : <span />}
                    <span className="truncate text-[11px] font-black leading-tight text-white"><span className="font-semibold text-zinc-400">Pitched by</span> {pitch.studioName}</span>
                </span>
                {(item.director || item.lead) && (
                    <span data-pitch-team className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2">
                        <span className="flex -space-x-2">
                            {[item.director, item.lead].filter(Boolean).map(person => (
                                <span key={person!.id} className="block h-7 w-7 overflow-hidden rounded-full border-2 border-black bg-zinc-800">
                                    <PersonFace name={person!.name} gender={person!.gender} className="h-full w-full object-cover object-top" />
                                </span>
                            ))}
                        </span>
                        <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-zinc-400">
                            {item.director && <><span className="text-zinc-200">{item.director.name}</span> directs</>}
                            {item.director && item.lead ? ', ' : ''}
                            {item.lead && <><span className="text-zinc-200">{item.lead.name}</span> leads</>}
                        </span>
                    </span>
                )}
            </span>
        </button>
    );
};

/** #281: the head of a platform's one place for Originals: what is pitched to them, what is being made, what is live */
export const OriginalsDesk: React.FC<{
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    /** A new Original, from a pitch or from the start */
    onCommission: (pitchId?: string) => void;
    onOpenReport: () => void;
    onOpenTitle: (commissionId: string, projectId: string | null) => void;
}> = ({ player, onUpdatePlayer, onClose, onCommission, onOpenReport, onOpenTitle }) => {
    const week = `${player.age}:${player.currentWeek}`;
    const [revision, setRevision] = useState(0);
    const view = useMemo(() => getOriginalsDeskView(player), [week, revision, player.ownedStreamingPlatform?.originalPitches, player.ownedStreamingPlatform?.originalCommissions]);
    const scout = useMemo(() => getOriginalScoutQuote(player), [player.ownedStreamingPlatform?.originalPitches, player.ownedStreamingPlatform?.treasuryCash]);
    const [notice, setNotice] = useState('');
    const reportPrice = useMemo(() => getOriginalAudienceReportPrice(player), [week]);
    const report = getActiveAudienceReport(player);

    const doScout = () => {
        const result = scoutOriginalPitches(player);
        setNotice(result.detail);
        if (result.changed) {
            onUpdatePlayer(result.player);
            setRevision(value => value + 1);
        }
    };
    const openReport = () => {
        if (report) return onOpenReport();
        const result = buyOriginalAudienceReport(player);
        if (!result.changed) return setNotice(result.detail);
        onUpdatePlayer(result.player);
        onOpenReport();
    };
    const treasury = Number(player.ownedStreamingPlatform?.treasuryCash || 0);

    return createPortal(
        <div data-originals-desk className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#0a0406] font-sans text-white">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-rose-950/50 to-transparent" />
            <div className="relative z-10 grid shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
                <button type="button" onClick={onClose} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5"><ArrowLeft size={18} /></button>
                <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-300">Content room</div>
                    <h1 className="truncate text-xl font-black leading-tight">Originals</h1>
                </div>
                <button type="button" onClick={() => onCommission()} aria-label="Commission an Original" data-desk-new className="grid h-11 w-11 place-items-center rounded-xl bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,.45)] active:scale-95"><Plus size={20} /></button>
            </div>

            <div className="relative z-10 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-10 pt-1">
                {notice && <p role="status" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200">{notice}</p>}

                <button type="button" data-desk-report onClick={openReport} className="grid min-h-[60px] w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] px-3 py-2.5 text-left active:scale-[0.99]">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-300/15 text-amber-300"><Search size={17} /></span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-black">Audience report</span>
                        <span className="block text-[11px] font-semibold leading-snug text-zinc-400">{report ? `${view.reportWeeksLeft} weeks left. Pitches that fit are tagged.` : 'See what your catalogue is missing'}</span>
                    </span>
                    {report ? <ChevronRight size={16} className="text-zinc-500" /> : <span className="rounded-lg bg-amber-300 px-2 py-1 font-mono text-[11px] font-black text-black">{money(reportPrice)}</span>}
                </button>

                <section>
                    <div className="mb-2 flex items-baseline justify-between">
                        <h2 className="text-sm font-black">Active Slate</h2>
                        <span className="text-[10px] font-bold text-zinc-500">{view.making.length ? `${view.making.length} in the works` : 'Nothing in the works'}</span>
                    </div>
                    {view.making.length ? (
                        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
                            {view.making.map(title => <SlateCard key={title.commission.id} title={title} onOpen={() => onOpenTitle(title.commission.id, title.commission.canonicalProjectId)} />)}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs font-semibold text-zinc-500">What you commission shows here while it is being made.</p>
                    )}
                </section>

                <section>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h2 className="text-sm font-black">Pitches</h2>
                        <button type="button" data-desk-scout onClick={doScout} disabled={!scout.canAfford} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[10px] font-black uppercase tracking-[0.08em] text-amber-300 disabled:text-zinc-600">
                            <Radar size={12} /> Scout more · {money(scout.price)}
                        </button>
                    </div>
                    <p data-pitches-explain className="mb-2 text-[11px] font-semibold leading-snug text-zinc-500">Studios bring you a ready package: their script, with a director and a lead already attached. You settle the deal, or pass.</p>
                    {view.pitches.length ? (
                        <div className="space-y-2">
                            {view.pitches.map(item => <PitchCard key={item.pitch.id} item={item} onOpen={() => onCommission(item.pitch.id)} />)}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs font-semibold text-zinc-500">
                            No studio is in the room. New pitches in {getOriginalPitchRefreshInWeeks(player)} {getOriginalPitchRefreshInWeeks(player) === 1 ? 'week' : 'weeks'}, or scout for some now.
                        </p>
                    )}
                </section>

                {view.gotAway.length > 0 && (
                    <section data-desk-got-away>
                        <h2 className="mb-2 text-sm font-black">The ones that got away</h2>
                        <div className="space-y-1.5">
                            {view.gotAway.map(item => (
                                <div key={item.id} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                                    <OriginalPoster title={item.title} small className="h-10 w-10 rounded-md" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-black">{item.title}</span>
                                        <span className="block truncate text-[11px] font-semibold text-zinc-400">{item.lostToRival ? 'Taken by' : 'You passed. Now on'} {item.madeByPlatformName}</span>
                                    </span>
                                    {item.rating !== undefined ? <span className="font-mono text-xs font-black text-amber-300">★ {item.rating.toFixed(1)}</span> : <span className="text-[10px] font-bold text-zinc-500">Being made</span>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {view.live.length > 0 && (
                    <section>
                        <div className="mb-2 flex items-baseline justify-between">
                            <h2 className="text-sm font-black">Live</h2>
                            <span className="text-[10px] font-bold text-zinc-500">{view.live.length} {view.live.length === 1 ? 'title' : 'titles'}</span>
                        </div>
                        <div className="space-y-1.5">
                            {view.live.map(title => (
                                <button key={title.commission.id} type="button" data-desk-live={title.commission.id} onClick={() => onOpenTitle(title.commission.id, title.commission.canonicalProjectId)} className="grid min-h-[56px] w-full grid-cols-[40px_minmax(0,1fr)_16px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left active:scale-[0.99]">
                                    <OriginalPoster title={title.commission.title} small className="h-10 w-10 rounded-md" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-black">{title.commission.title}</span>
                                        <span className="block truncate text-[11px] font-semibold text-zinc-400">{title.outside ? `Made by ${title.commission.producerStudioName}` : 'Made by your studio'}</span>
                                    </span>
                                    <ChevronRight size={15} className="text-zinc-500" />
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <p className="text-center text-[10px] font-semibold text-zinc-600">Treasury {money(treasury)}</p>
            </div>
        </div>,
        document.body,
    );
};

export default OriginalsDesk;
