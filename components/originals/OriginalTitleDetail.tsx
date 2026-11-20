import { LICENCE_SHARE_OF_MAKING } from '../../services/originalsDeal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clapperboard, Film, Sparkles, Star, Tv, X, Zap, CalendarDays, Scissors, ImagePlus, PenLine } from 'lucide-react';
import type { Player } from '../../types';
import { buildProjectPosterIndex, setTitlePoster } from '../../services/projectPosterIndex';
import { createCustomPosterBlobFromFile, saveCustomPosterMedia } from '../../services/customPosterMedia';
import { getOriginalTitleDetail, ORIGINAL_JOURNEY_STEPS, ORIGINAL_NOTE_QUALITY, takeOriginalExtra, takeOriginalNote, type OriginalTitleDetail as Detail } from '../../services/originalsTitleDetail';
import { endOriginal, extendOriginalLicence, getOriginalFutureView, getOriginalInstallment, renewOriginal, spinOffOriginal, type OriginalExtrasChoice } from '../../services/originalsRenewal';
import { WorkingTitleDialog } from '../../views/lifestyle/business/components/WorkingTitleDialog';
import { BACKGROUND_CASTING_PACKAGES, findBackgroundCastingPackage, getBackgroundCastingPlanLabel } from '../../services/livingEnsemble';
import { getOriginalOwnMaker, getOriginalSpinOffScript, prepareOriginalSpinOffScript } from '../../services/originalSpinOffScript';
import type { OriginalCommissionMoment } from '../../services/originalsCommission';
import { CommissionMoment } from './CommissionDealAndGo';
import { OriginalPoster } from './OriginalsDesk';
import PersonFace from '../streaming-transplant/PersonFace';
import { TitleNumbersInPlace, type DossierTitle } from '../streaming-transplant/StreamingDossierExperience';
import type { Brand } from '../streaming-transplant/StreamingBrandVisuals';

/* #290: an Original's one page: the Production House's phases while it is made, its numbers and named episodes once it is live. */

export type OriginalTitleAction = 'slate' | 'campaign' | 'numbers' | 'studio';

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);
const count = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(value));
const weeksWords = (weeks: number | null) => (weeks === null ? 'Soon' : weeks === 1 ? '1 week' : `${weeks} weeks`);
const STEP_ICON = [Sparkles, Clapperboard, Scissors, Check, CalendarDays, Tv];
const ISSUE_WORDS = { QUALITY: 'A quality problem', LOCATION: 'A location problem', BUDGET: 'A money problem' };
const ratingTone = (rating: number) => (rating >= 8 ? 'bg-emerald-400 text-black' : rating >= 7 ? 'bg-lime-300 text-black' : rating >= 6 ? 'bg-amber-300 text-black' : 'bg-rose-500 text-white');

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 ${className}`}>{children}</div>
);
const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500 ${className}`}>{children}</div>
);

const Journey: React.FC<{ at: number }> = ({ at }) => (
    <Card>
        <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Production journey</Eyebrow>
            <span className="font-mono text-[11px] font-black text-zinc-500">{at + 1}/{ORIGINAL_JOURNEY_STEPS.length}</span>
        </div>
        <div className="grid grid-cols-6" data-title-journey>
            {ORIGINAL_JOURNEY_STEPS.map((step, index) => {
                const Icon = STEP_ICON[index];
                const done = index < at;
                const now = index === at;
                return (
                    <div key={step} className="relative flex min-w-0 flex-col items-center gap-1.5 text-center">
                        {index > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-[15px] h-0.5 w-full ${index <= at ? 'bg-rose-500' : 'bg-white/10'}`} />}
                        <span className={`relative grid h-8 w-8 place-items-center rounded-full border-2 ${now ? 'border-amber-200 bg-amber-300 text-black shadow-[0_0_14px_rgba(252,211,77,.55)]' : done ? 'border-rose-400 bg-rose-950 text-rose-300' : 'border-white/15 bg-zinc-900 text-zinc-600'}`}>
                            {done ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                        </span>
                        <span className={`max-w-full text-[clamp(7px,2.2vw,8px)] font-bold leading-[1.15] tracking-[-0.01em] ${now ? 'text-amber-200' : done ? 'text-zinc-300' : 'text-zinc-600'}`}>{step}</span>
                    </div>
                );
            })}
        </div>
    </Card>
);

const Team: React.FC<{ detail: Detail }> = ({ detail }) => (
    <Card className="space-y-2.5 !py-3">
        {detail.team.map(person => (
            <div key={person.role + person.id} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3" data-title-person>
                <span className="block h-10 w-10 overflow-hidden rounded-full bg-zinc-800"><PersonFace name={person.name} gender={person.gender} className="h-full w-full object-cover" /></span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-black leading-tight text-white">{person.name}</span>
                    <span className="block truncate text-[10px] font-semibold text-zinc-500">{person.role}</span>
                </span>
                {person.talent !== undefined && <span className="flex items-center gap-1 font-mono text-[11px] font-black text-emerald-300"><Star size={11} className="fill-current" />{Math.round(person.talent)}</span>}
            </div>
        ))}
    </Card>
);

export const OriginalTitleDetail: React.FC<{
    player: Player;
    commissionId: string;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    onAction: (action: OriginalTitleAction, detail: Detail) => void;
    /** 2026-11-16: open the Commission wizard on one of the player's own scripts (a spin-off's, to cast it) */
    onCommissionScript?: (scriptId: string) => void;
    /** #292: open another season's page */
    onOpenTitle?: (commissionId: string) => void;
    initialNotice?: string;
    /** #317: all the numbers, read when they are asked for and shown here on this page */
    numbers?: { brand: Brand; title: DossierTitle } | null;
}> = ({ player, commissionId, onUpdatePlayer, onClose, onAction, onOpenTitle, initialNotice, numbers, onCommissionScript }) => {
    const [notice, setNotice] = useState(initialNotice || '');
    const [showNumbers, setShowNumbers] = useState(false);
    const numbersRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (showNumbers && numbers) numbersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [showNumbers, Boolean(numbers)]);
    const [renewing, setRenewing] = useState(false);
    const [episodes, setEpisodes] = useState<number | null>(null);
    /* 2026-11-17: the next season's background extras. null keeps the last season's; a package changes them */
    const [extrasPick, setExtrasPick] = useState<OriginalExtrasChoice | null>(null);
    const [confirmEnd, setConfirmEnd] = useState(false);
    /* 20 Nov 2026: the next season's or sequel's name, renamed on the order sheet (null: the suggested name) */
    const [nextName, setNextName] = useState<string | null>(null);
    const [naming, setNaming] = useState(false);
    const [moment, setMoment] = useState<{ title: string; data: OriginalCommissionMoment } | null>(null);
    const commissions = player.ownedStreamingPlatform?.originalCommissions;
    /* reads the studio's record and the week's chart once for each week or change, never on a tap */
    const detail = useMemo(() => getOriginalTitleDetail(player, commissionId), [commissionId, commissions, player.age, player.currentWeek, player.commitments]);
    const future = useMemo(() => (detail?.stage === 'LIVE' ? getOriginalFutureView(player, commissionId, episodes ?? undefined, extrasPick ?? undefined) : null), [detail?.stage, commissionId, episodes, extrasPick, commissions, player.age, player.currentWeek, player.energy?.current]);
    /* B20: the title's own poster, and a way to set one (an Original made by another studio had none) */
    const posters = useMemo(() => buildProjectPosterIndex(player), [player]);
    const posterInput = useRef<HTMLInputElement | null>(null);
    const [posterBusy, setPosterBusy] = useState(false);
    if (!detail) return null;
    const poster = posters.get(detail.commission.canonicalProjectId || '') || posters.get(detail.commission.id);
    const choosePoster = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setPosterBusy(true);
        try {
            const picture = await createCustomPosterBlobFromFile(file);
            const media = await saveCustomPosterMedia(detail.commission.canonicalProjectId || detail.commission.id, picture.blob, { width: picture.width, height: picture.height });
            onUpdatePlayer(setTitlePoster(player, { projectId: detail.commission.canonicalProjectId, commissionId: detail.commission.id }, { type: 'IMAGE', posterMediaId: media.id }));
            setNotice('Poster saved. It shows here, on the Slate and on your service.');
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'That picture could not be used as a poster.');
        } finally {
            setPosterBusy(false);
        }
    };
    const next = future?.next;
    const stepEpisodes = (change: number) => setEpisodes(Math.max(4, Math.min(24, (episodes ?? detail.commission.episodes) + change)));
    const renew = () => {
        const result = renewOriginal(player, commissionId, episodes ?? undefined, extrasPick ?? undefined, nextName ?? undefined);
        setNotice(result.message);
        if (!result.changed) return;
        onUpdatePlayer(result.player);
        setRenewing(false);
        if (result.moment) setMoment({ title: result.title || detail.title, data: result.moment });
    };
    /* 2026-11-16 (player report, EJ; Zeesh: cast it as the production house Greenlight does): a spin-off of an Original your
       own studio made is a script in that studio, cast and commissioned in the wizard. One an outside studio made is
       still ordered in one tap (they cast it). */
    const ownMaker = getOriginalOwnMaker(player, commissionId);
    const spinOffScript = ownMaker ? getOriginalSpinOffScript(player, commissionId) : null;
    const spinOff = () => {
        if (ownMaker && onCommissionScript) {
            if (spinOffScript?.ready) { onCommissionScript(spinOffScript.scriptId); return; }
            const prepared = prepareOriginalSpinOffScript(player, commissionId);
            setNotice(prepared.message);
            if (prepared.changed) onUpdatePlayer(prepared.player);
            if (prepared.scriptId) onCommissionScript(prepared.scriptId);
            return;
        }
        const result = spinOffOriginal(player, commissionId);
        setNotice(result.message);
        if (!result.changed) return;
        onUpdatePlayer(result.player);
        if (result.moment) setMoment({ title: result.title || detail.title, data: result.moment });
    };
    const end = () => {
        if (!confirmEnd) return setConfirmEnd(true);
        const result = endOriginal(player, commissionId);
        setNotice(result.message);
        setConfirmEnd(false);
        if (result.changed) onUpdatePlayer(result.player);
    };
    const extend = () => {
        const result = extendOriginalLicence(player, commissionId);
        setNotice(result.message);
        if (result.changed) onUpdatePlayer(result.player);
    };
    if (moment) {
        return createPortal(
            <div className="fixed inset-0 z-[85] overflow-y-auto bg-[#0a0406] pt-[env(safe-area-inset-top)] font-sans text-white">
                <CommissionMoment
                    title={moment.title}
                    platformName={player.ownedStreamingPlatform?.identity?.name || detail.commission.commissionedByPlatformName}
                    headline={moment.data.headline}
                    subtext={moment.data.subtext}
                    post={moment.data.post}
                    onDone={onClose}
                />
            </div>,
            document.body,
        );
    }

    const takeNote = () => {
        const result = takeOriginalNote(player, commissionId);
        setNotice(result.message);
        if (result.changed) onUpdatePlayer(result.player);
    };
    const takeExtra = () => {
        const result = takeOriginalExtra(player, commissionId);
        setNotice(result.message);
        if (result.changed) onUpdatePlayer(result.player);
    };
    const making = detail.stage === 'MAKING' || detail.stage === 'READY' || detail.stage === 'ON_SLATE';
    const pinned = detail.stage === 'READY' || detail.stage === 'ON_SLATE' || detail.stage === 'NOT_STARTED' || detail.stage === 'LIVE';

    return createPortal(
        <div data-original-title={detail.stage} className="fixed inset-0 z-[85] flex flex-col overflow-hidden bg-[#0a0406] font-sans text-white">
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <OriginalPoster title={detail.title} className="h-[196px]" poster={poster}>
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#0a0406]" />
                    <input ref={posterInput} type="file" accept="image/*" className="hidden" onChange={choosePoster} />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
                        <div className="flex min-w-0 flex-wrap gap-1.5" data-title-chips>
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${detail.stage === 'LIVE' ? 'bg-amber-300 text-black' : 'bg-rose-500 text-white'}`}>{detail.stageChip}</span>
                            {detail.chartRank && <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-black">Top 10 · #{detail.chartRank}</span>}
                            {detail.rating !== null && <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black text-black">★ {detail.rating.toFixed(1)}</span>}
                            <span className="max-w-[170px] truncate rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white" style={{ background: detail.color }}>{detail.byLabel}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {/* B20: the studio's Edit Poster, here too: a commissioned Original had nowhere to set one */}
                            <button type="button" data-edit-poster onClick={() => posterInput.current?.click()} disabled={posterBusy}
                                aria-label={poster ? 'Change poster' : 'Add a poster'} title={poster ? 'Change poster' : 'Add a poster'}
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/60 text-white disabled:animate-pulse disabled:opacity-60">
                                <ImagePlus size={17} />
                            </button>
                            <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/60"><X size={17} /></button>
                        </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-2">
                        <h1 className="font-serif text-[32px] font-bold italic leading-[1.02] text-white [overflow-wrap:anywhere]">{detail.title}</h1>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">{detail.kindLine}</div>
                    </div>
                </OriginalPoster>

                <div className={`space-y-2.5 px-4 pt-3 ${pinned ? 'pb-40' : 'pb-10'}`}>
                    {notice && <p role="status" data-title-notice className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200">{notice}</p>}

                    {detail.stage === 'NOT_STARTED' && <Card><p className="text-sm font-semibold text-zinc-300">Ordered from {detail.studioName}, and waiting to go into production there.</p></Card>}

                    {making && (
                        <>
                            <div className="grid grid-cols-2 gap-2.5">
                                <Card>
                                    <Eyebrow>{detail.stage === 'ON_SLATE' ? 'Premieres in' : detail.stage === 'READY' ? 'Delivered' : 'Time left'}</Eyebrow>
                                    <div className="mt-1 text-xl font-black leading-none text-amber-300" data-title-time>
                                        {detail.stage === 'READY' ? 'Ready' : weeksWords(detail.stage === 'ON_SLATE' ? detail.premiere?.weeksAway ?? null : detail.weeksLeft)}
                                    </div>
                                    <div className="mt-1 text-[10px] font-semibold text-zinc-500">{detail.stage === 'ON_SLATE' ? (detail.premiere ? `Year ${detail.premiere.year}, week ${detail.premiere.week}` : 'On the opening slate') : detail.stage === 'READY' ? 'Nothing is booked yet' : detail.totalWeeks ? `of ${detail.totalWeeks}` : ''}</div>
                                </Card>
                                <Card>
                                    <Eyebrow>Paid</Eyebrow>
                                    <div className="mt-1 font-mono text-xl font-black leading-none text-white" data-title-paid>{money(detail.paid)}</div>
                                    <div className="mt-1 text-[10px] font-semibold leading-tight text-zinc-500">{detail.paidLine}</div>
                                </Card>
                            </div>
                            <Journey at={detail.journeyAt} />
                            <Team detail={detail} />
                            {/* #306: one more thing in each phase, each with its own effect */}
                            {detail.extra && (
                                <button type="button" data-title-extra={detail.extra.id} disabled={detail.extra.taken} onClick={takeExtra} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3.5 text-left ${detail.extra.taken ? 'border-white/10 bg-white/[0.03]' : 'border-amber-300/40 bg-amber-300/[0.07]'}`}>
                                    <span className="min-w-0">
                                        <Eyebrow>While it is being made</Eyebrow>
                                        <span className="mt-1 block text-sm font-black leading-tight text-white">{detail.extra.title}</span>
                                        <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-zinc-400">{detail.extra.line}</span>
                                        <span className={`mt-1 block text-[10px] font-black leading-tight ${detail.extra.taken ? 'text-zinc-500' : 'text-emerald-300'}`}>{detail.extra.effect}</span>
                                    </span>
                                    <span className={`flex items-center gap-1 whitespace-nowrap text-[11px] font-black ${detail.extra.taken ? 'text-zinc-500' : 'text-amber-300'}`}>
                                        {detail.extra.taken ? <><Check size={12} /> Done</> : <><Zap size={12} className="fill-current" />{detail.extra.energy}</>}
                                    </span>
                                </button>
                            )}
                            {detail.testScore !== null && (
                                <Card>
                                    <Eyebrow>Test audiences gave it</Eyebrow>
                                    <div data-title-test-score className="mt-1 font-mono text-xl font-black leading-none text-amber-300">{detail.testScore}<span className="text-xs text-zinc-500"> / 100</span></div>
                                </Card>
                            )}
                            <div className="grid grid-cols-2 gap-2.5">
                                {detail.outside ? (
                                    detail.note ? (
                                        <button type="button" data-title-note disabled={detail.note.taken} onClick={takeNote} className={`rounded-2xl border p-3.5 text-left ${detail.note.taken ? 'border-white/10 bg-white/[0.03]' : 'border-amber-300/40 bg-amber-300/[0.07]'}`}>
                                            <Eyebrow>Your notes</Eyebrow>
                                            <div className="mt-1 text-sm font-black leading-tight text-white">{detail.note.title}</div>
                                            <div className={`mt-1 flex items-center gap-1 text-[10px] font-black ${detail.note.taken ? 'text-zinc-500' : 'text-amber-300'}`}>
                                                {detail.note.taken ? <><Check size={11} /> Done this phase</> : <><Zap size={11} className="fill-current" />{detail.note.energy} · +{ORIGINAL_NOTE_QUALITY} quality</>}
                                            </div>
                                        </button>
                                    ) : (
                                        <Card>
                                            <Eyebrow>Your notes</Eyebrow>
                                            <div className="mt-1 text-sm font-black leading-tight text-white">{detail.notesTaken ? `${detail.notesTaken} taken` : 'None'}</div>
                                            <div className="mt-1 text-[10px] font-semibold text-zinc-500">{detail.notesTaken ? `+${detail.notesTaken * ORIGINAL_NOTE_QUALITY} quality` : 'The shoot is over'}</div>
                                        </Card>
                                    )
                                ) : (
                                    <button type="button" data-title-own-studio onClick={() => onAction('studio', detail)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left">
                                        <Eyebrow>Your studio</Eyebrow>
                                        <div className="mt-1 text-sm font-black leading-tight text-white">Open the Production House</div>
                                        <div className="mt-1 text-[10px] font-semibold text-zinc-500">The day-to-day work is there</div>
                                    </button>
                                )}
                                <Card>
                                    <Eyebrow>Issues so far</Eyebrow>
                                    {detail.issues.length ? (
                                        <div className="mt-1 space-y-1" data-title-issues>
                                            {detail.issues.map(issue => (
                                                <div key={issue.id}>
                                                    <div className="text-sm font-black leading-tight text-white">{ISSUE_WORDS[issue.kind]}</div>
                                                    <div className="text-[10px] font-semibold text-zinc-500">{issue.status === 'PAID' ? `You paid ${money(issue.amount)}` : issue.status === 'AD' ? 'Fixed, nothing paid' : issue.status === 'COMPROMISED' ? `Quality down ${issue.qualityRisk}` : 'Waiting for you'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="mt-1 text-sm font-black leading-tight text-white" data-title-issues>None</div>}
                                </Card>
                            </div>
                            {detail.logline && <p className="px-1 text-[12px] font-medium leading-relaxed text-zinc-500">{detail.logline}</p>}
                        </>
                    )}

                    {detail.stage === 'LIVE' && future?.licence && (
                        <Card className={future.licence.weeksLeft <= 26 ? '!border-amber-300/40' : ''}>
                            <div className="flex items-center justify-between gap-3" data-title-licence>
                                <span className="min-w-0">
                                    <Eyebrow>Your licence</Eyebrow>
                                    <span className="mt-1 block text-sm font-black leading-tight text-white">{future.licence.gone ? `It went back to ${detail.studioName}` : `Goes back in ${weeksWords(future.licence.weeksLeft)}`}</span>
                                </span>
                                <button type="button" data-title-extend onClick={extend} className="shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-[11px] font-black text-black">{future.licence.gone ? 'Buy it back' : 'Three more years'} · {money(future.licence.extendPrice)}</button>
                            </div>
                        </Card>
                    )}
                    {detail.stage === 'LIVE' && detail.live && (
                        <>
                            <div className="grid grid-cols-4 gap-1.5" data-title-numbers>
                                {[
                                    { label: 'Viewers', value: count(detail.live.viewers), tone: 'text-white' },
                                    { label: 'Finished', value: `${detail.live.finished}%`, tone: 'text-emerald-300' },
                                    { label: 'New subs', value: count(detail.live.newSubs), tone: 'text-sky-300' },
                                    { label: 'Stayed', value: count(detail.live.stayed), tone: 'text-sky-300' },
                                ].map(item => (
                                    <div key={item.label} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-2.5 text-center">
                                        <div className="truncate text-[8px] font-black uppercase tracking-[0.06em] text-zinc-500">{item.label}</div>
                                        <div className={`mt-1 truncate font-mono text-[15px] font-black leading-none ${item.tone}`}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                            {detail.wins.length > 0 && (
                                <Card className="!border-amber-300/40 !bg-amber-300/[0.07]">
                                    <Eyebrow className="!text-amber-300">Awards</Eyebrow>
                                    <div className="mt-1 space-y-1" data-title-wins>
                                        {detail.wins.map(win => <div key={`${win.show}${win.year}${win.category}`} className="text-[13px] font-bold leading-snug text-white">🏆 {win.category} <span className="font-semibold text-zinc-400">· {win.show}, year {win.year}</span></div>)}
                                    </div>
                                </Card>
                            )}
                            {detail.episodes.length > 0 && (
                                <Card className="!px-3" >
                                    <div className="mb-2 flex items-baseline justify-between gap-2">
                                        <Eyebrow>Season {getOriginalInstallment(detail.commission)} episodes</Eyebrow>
                                        {detail.seasonName && <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.08em] text-violet-300">{detail.seasonName}</span>}
                                    </div>
                                    <div data-title-episodes>
                                        {detail.episodes.map(episode => (
                                            <div key={episode.number} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-1.5 border-t border-white/[0.06] py-1.5 first:border-t-0">
                                                <span className="font-mono text-[10px] font-black text-rose-300">E{episode.number}</span>
                                                <span className="flex min-w-0 items-center gap-1.5">
                                                    <span className="truncate text-[13px] font-semibold text-white">{episode.name}</span>
                                                    {episode.best && <span className="shrink-0 rounded bg-amber-300 px-1 text-[8px] font-black text-black">BEST</span>}
                                                </span>
                                                {episode.rating !== null && <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-black ${ratingTone(episode.rating)}`}>{episode.rating.toFixed(1)}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                            {!detail.isSeries && detail.reviews.map(review => (
                                <Card key={review.id}>
                                    <p className="text-[13px] font-medium leading-snug text-zinc-200">“{review.text}”</p>
                                    {review.publication && <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">{review.publication}</div>}
                                </Card>
                            ))}
                            <button type="button" data-title-numbers-open aria-expanded={showNumbers} onClick={() => { if (!showNumbers) onAction('numbers', detail); setShowNumbers(value => !value); }} className="min-h-11 w-full py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-rose-300">{showNumbers ? 'Hide the numbers' : 'All the numbers ›'}</button>
                            {showNumbers && numbers && <div ref={numbersRef} className="scroll-mt-3"><TitleNumbersInPlace brand={numbers.brand} t={numbers.title} /></div>}
                        </>
                    )}
                </div>
            </div>

            {pinned && (
                <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-6" style={{ background: 'linear-gradient(to top, #0a0406 76%, rgba(10,4,6,.9) 90%, transparent)' }}>
                    {detail.stage === 'READY' && (
                        <button type="button" data-title-slate onClick={() => onAction('slate', detail)} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.08em] text-white">
                            <CalendarDays size={16} /> Put it on the Slate
                        </button>
                    )}
                    {detail.stage === 'ON_SLATE' && (
                        <div className="grid grid-cols-2 gap-2.5">
                            <button type="button" data-title-move onClick={() => onAction('slate', detail)} className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 text-[12px] font-black uppercase tracking-[0.06em] text-white">Move the week</button>
                            <button type="button" data-title-campaign onClick={() => onAction('campaign', detail)} className="min-h-[52px] rounded-2xl bg-rose-500 text-[12px] font-black uppercase tracking-[0.06em] text-white">Start a campaign</button>
                        </div>
                    )}
                    {detail.stage === 'NOT_STARTED' && (
                        <button type="button" onClick={() => onAction('studio', detail)} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.08em] text-white">
                            <Film size={16} /> Start it in your studio
                        </button>
                    )}
                    {detail.stage === 'LIVE' && future && (
                        <div className="space-y-2.5">
                            {future.ended ? (
                                <div className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 py-4 text-center text-[12px] font-black uppercase tracking-[0.06em] text-zinc-400">You ended it</div>
                            ) : future.nextCommissionId ? (
                                <button type="button" data-title-next onClick={() => onOpenTitle?.(future.nextCommissionId!)} className="min-h-[52px] w-full rounded-2xl border border-rose-400/40 bg-rose-500/15 text-[12px] font-black uppercase tracking-[0.06em] text-rose-200">The next one is ordered ›</button>
                            ) : future.waitWeeks > 0 ? (
                                <div data-title-wait className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 px-3 py-4 text-center text-[12px] font-black uppercase tracking-[0.06em] text-zinc-400">Renewal opens in {weeksWords(future.waitWeeks)}</div>
                            ) : next ? (
                                <button type="button" data-title-renew onClick={() => setRenewing(true)} className="min-h-[52px] w-full rounded-2xl bg-rose-500 text-[13px] font-black uppercase tracking-[0.06em] text-white">
                                    {detail.isSeries ? `Renew season ${next.nextSeason}` : 'Order a sequel'} · about {money(next.total)}
                                </button>
                            ) : (
                                /* 2026-11-15 (B14): never a silent gap where Renew should be */
                                <div data-title-renew-unavailable className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 px-3 py-4 text-center text-[12px] font-black uppercase tracking-[0.06em] text-zinc-400">
                                    {detail.isSeries ? 'Renew isn’t available for this season' : 'A sequel isn’t available for this title'}
                                </div>
                            )}
                            <div className={`grid gap-2.5 ${(future.canSpinOff && !future.nextCommissionId) || spinOffScript?.ready ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {((future.canSpinOff && !future.nextCommissionId) || spinOffScript?.ready) && <button type="button" data-title-spinoff onClick={spinOff} disabled={!spinOffScript?.ready && (future.waitWeeks > 0 || future.ended)} className="min-h-11 rounded-xl border border-white/10 bg-zinc-900 text-[11px] font-black uppercase tracking-[0.04em] text-white disabled:opacity-40">Spin-off</button>}
                                <button type="button" data-title-campaign onClick={() => onAction('campaign', detail)} className="min-h-11 rounded-xl border border-white/10 bg-zinc-900 text-[11px] font-black uppercase tracking-[0.04em] text-white">Campaign</button>
                                <button type="button" data-title-end onClick={end} disabled={future.ended} className={`min-h-11 rounded-xl border text-[11px] font-black uppercase tracking-[0.04em] disabled:opacity-40 ${confirmEnd ? 'border-rose-400 bg-rose-500 text-white' : 'border-white/10 bg-zinc-900 text-white'}`}>{confirmEnd ? 'Sure? End it' : 'End it'}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {renewing && next && (
                <div className="absolute inset-0 z-20 flex items-end bg-black/70" onClick={() => setRenewing(false)}>
                    <div data-renew-sheet onClick={event => event.stopPropagation()} className="w-full rounded-t-3xl border-t border-rose-500/30 bg-[#12070a] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                        <Eyebrow className="!text-rose-300">{next.outside ? `${next.studioName} is asking` : 'Your studio can start'}</Eyebrow>
                        {/* 20 Nov 2026 (player report: "Season 2: Season 2", "u can't edit the name"): the name it will have, renamed
                            here the way Greenlight renames a working title */}
                        <div className="mt-1 flex items-start justify-between gap-3">
                            <h2 data-renew-title className="min-w-0 text-2xl font-black leading-tight text-white [overflow-wrap:anywhere]">{nextName ?? next.suggestedTitle}</h2>
                            <button type="button" data-renew-rename onClick={() => setNaming(true)} aria-label="Rename it" className="mt-0.5 flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-black uppercase tracking-[0.06em] text-zinc-200">
                                <PenLine size={13} aria-hidden="true" /> Rename
                            </button>
                        </div>
                        <p className="mt-1 text-[12px] font-semibold text-zinc-400">{next.hitWord}. It costs {next.rise}% more to make this time.{next.feeWhy ? ` ${next.feeWhy}` : ''}</p>
                        {detail.isSeries && (
                            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                                <span className="text-sm font-black text-white">Episodes</span>
                                <span className="flex items-center gap-2">
                                    <button type="button" aria-label="Fewer episodes" onClick={() => stepEpisodes(-1)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-lg font-black text-white">−</button>
                                    <span className="w-7 text-center font-mono text-base font-black text-white" data-renew-episodes>{episodes ?? detail.commission.episodes}</span>
                                    <button type="button" aria-label="More episodes" onClick={() => stepEpisodes(1)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-lg font-black text-white">+</button>
                                </span>
                            </div>
                        )}
                        <RenewExtras extras={next.extras} onPick={setExtrasPick} />
                        <div className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] font-semibold text-zinc-300">
                            <div className="flex justify-between gap-3"><span>Making it</span><span className="font-mono font-black text-white">{money(next.making)}</span></div>
                            {next.extras.costChange !== 0 && <div className="flex justify-between gap-3 text-[12px]" data-renew-extras-cost><span>of it, the extras' change</span><span className={`font-mono font-black ${next.extras.costChange > 0 ? 'text-amber-200' : 'text-emerald-300'}`}>{next.extras.costChange > 0 ? '+' : '−'}{money(Math.abs(next.extras.costChange))}</span></div>}
                            {next.fee > 0 && <div className="flex justify-between gap-3"><span>Their fee, {next.feePercent}%</span><span className="font-mono font-black text-white">{money(next.fee)}</span></div>}
                            {next.deal === 'LICENCE' && <div className="flex justify-between gap-3"><span>On licence: {Math.round(LICENCE_SHARE_OF_MAKING * 100)}% of it</span><span className="font-mono font-black text-white">{money(next.total)}</span></div>}
                            {next.hype !== 0 && <div className="flex justify-between gap-3"><span>From the last finale</span><span className={`font-mono font-black ${next.hype > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{next.hype > 0 ? '+' : ''}{Math.round(next.hype * 100)}% first 4 weeks</span></div>}
                            <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5 text-white"><span className="font-black">Paid now, all at once</span><span className="font-mono text-base font-black text-amber-300" data-renew-total>{money(next.total)}</span></div>
                        </div>
                        {(!next.canAfford || !next.hasEnergy) && <p className="mt-2 text-[12px] font-bold text-amber-300">{!next.canAfford ? `The treasury is short.` : `It takes ${next.energy}⚡.`}</p>}
                        <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2.5">
                            <button type="button" onClick={() => setRenewing(false)} className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 text-sm font-black text-white">Back</button>
                            <button type="button" data-renew-go disabled={!next.canAfford || !next.hasEnergy} onClick={renew} className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.06em] text-white disabled:opacity-40">Order it <Zap size={13} className="fill-current" />{next.energy}</button>
                        </div>
                    </div>
                </div>
            )}
            {naming && next && (
                <WorkingTitleDialog
                    mode="RENAME"
                    eyebrow={detail.isSeries ? `Season ${next.nextSeason}` : 'The sequel'}
                    title={detail.isSeries ? 'Name this season' : 'Name the sequel'}
                    description={`What the next ${detail.isSeries ? 'season' : 'film'} of ${detail.title} is called.`}
                    initialTitle={nextName ?? next.suggestedTitle}
                    confirmLabel="Use this name"
                    helperText="You can change it here until you order it."
                    infoText="Once it is ordered, the name locks so releases, news and records stay the same."
                    onClose={() => setNaming(false)}
                    onConfirm={title => { setNextName(title === next.suggestedTitle ? null : title); setNaming(false); }}
                />
            )}
        </div>,
        document.body,
    );
};

export default OriginalTitleDetail;

/* 2026-11-17 (player report: a renewed season "doesn't pick the best background extras, it picks the pookie ones").
   The next season starts with the last season's background cast; the Greenlight packages change it for this season only.
   A package other than the last one moves the bill by the difference and the craft by Greenlight's rule (at most ±3). */
const EXTRAS_CHIP: Record<string, string> = { CONTROLLED: 'Lean', STORY: 'Story crowd', DISCOVERY: 'Open call', SPECTACLE: 'Premium' };
const RenewExtras: React.FC<{
    extras: { plan: import('../../types').BackgroundCastingPlan; lastSeason: import('../../types').BackgroundCastingPlan; lastSeasonKnown: boolean; costChange: number; qualityChange: number };
    onPick: (choice: OriginalExtrasChoice | null) => void;
}> = ({ extras, onPick }) => {
    const same = (a: OriginalExtrasChoice, b: OriginalExtrasChoice) => a.scale === b.scale && a.source === b.source && a.payStandard === b.payStandard && a.control === b.control;
    const lastPackage = findBackgroundCastingPackage(extras.lastSeason);
    const picked = findBackgroundCastingPackage(extras.plan);
    const lastName = lastPackage ? EXTRAS_CHIP[lastPackage.id] : getBackgroundCastingPlanLabel(extras.lastSeason);
    const quality = extras.qualityChange;
    return (
        <div data-renew-extras className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            {/* on a narrow phone the last season's name drops to its own line rather than being cut */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="whitespace-nowrap text-sm font-black text-white">Background extras</span>
                <span className="text-[11px] font-semibold text-zinc-400">{extras.lastSeasonKnown ? `Last season: ${lastName}` : `Last season: ${lastName} (usual)`}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {!lastPackage && (
                    <button type="button" aria-pressed={same(extras.plan, extras.lastSeason)} data-renew-extras-option="LAST" onClick={() => onPick(null)}
                        className={`min-h-9 rounded-lg border px-2.5 text-[11px] font-black ${same(extras.plan, extras.lastSeason) ? 'border-rose-300 bg-rose-500/20 text-white' : 'border-white/10 bg-black/30 text-zinc-300'}`}>As last season</button>
                )}
                {BACKGROUND_CASTING_PACKAGES.map(option => {
                    const selected = same(extras.plan, option.choices);
                    return (
                        <button key={option.id} type="button" aria-pressed={selected} data-renew-extras-option={option.id}
                            onClick={() => onPick(same(option.choices, extras.lastSeason) ? null : option.choices)}
                            className={`min-h-9 rounded-lg border px-2.5 text-[11px] font-black ${selected ? 'border-rose-300 bg-rose-500/20 text-white' : 'border-white/10 bg-black/30 text-zinc-300'}`}>
                            {EXTRAS_CHIP[option.id]}
                        </button>
                    );
                })}
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-snug text-zinc-400" data-renew-extras-note>
                {picked ? `${picked.name}: ${picked.description}` : `${getBackgroundCastingPlanLabel(extras.plan)}, as last season.`}
                {quality > 0 ? ` A little more real on screen (+${quality} quality).` : quality < 0 ? ` A little less real on screen (${quality} quality).` : ''}
            </p>
        </div>
    );
};
