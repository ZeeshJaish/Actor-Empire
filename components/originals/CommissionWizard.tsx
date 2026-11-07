import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, Lock, Minus, Plus, Star, X } from 'lucide-react';
import type { Business, NPCActor, OwnedStreamingOriginalPitch, Player, Script } from '../../types';
import { GreenlightHeader } from '../../views/lifestyle/business/components/GreenlightHeader';
import { GreenlightWizard } from '../../views/lifestyle/business/GreenlightWizard';
import {
    buildOutsideStudioStandIn,
    createBlankOriginalConcept,
    getCommissionableScripts,
    getOriginalCommissionId,
    hasOwnProductionHouse,
    type OriginalCommissionWay,
    type OriginalWizardMode,
} from '../../services/originalsCommission';
import { getPitchFee, getStudioFee, ORIGINAL_STANDARD_EPISODES } from '../../services/originalsDeal';
import { estimatePitchAsk } from '../../services/originalsDesk';
import { getScriptGapFit } from '../../services/originalsAudienceReport';
import { getLiveOriginalPitches, getPitchStory, passOriginalPitch } from '../../services/originalsPitches';
import { getOriginalsStudios, type OriginalsStudioCard as StudioCardData } from '../../services/originalsStudios';
import { formatGenreLabel } from '../../services/genreCatalog';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { getPlayerLanguage, t } from '../../services/i18n';
import { NPC_DATABASE } from '../../services/npcLogic';
import { WRITER_NPC_LIBRARY } from '../../services/writerNpcLibrary';
import PersonFace from '../streaming-transplant/PersonFace';
import { OriginalPoster } from './OriginalsDesk';
import { OriginalsStudioCard } from './OriginalsStudioCard';
import '../../styles/commission-red.css';

const money = (value: number) => (value >= 1_000_000_000
    ? `$${(value / 1_000_000_000).toFixed(1)}B`
    : value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : value > 0
            ? `$${Math.round(value / 1_000)}K`
            : '$0');

const personOf = (player: Player, id: string | null | undefined): NPCActor | null => {
    if (!id) return null;
    return NPC_DATABASE.find(person => person.id === id) || ((player.flags?.extraNPCs || []) as NPCActor[]).find(person => person.id === id) || null;
};

export const COMMISSION_STEP_LABELS = ['Script', 'Studio', 'Director', 'Cast', 'Crew', 'Gear', 'Loc', 'Setup', 'Deal', 'Go'];

const EpisodeStepper: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => (
    <div data-episode-stepper className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center rounded-xl border border-white/10 bg-black/30">
        <button type="button" onClick={() => onChange(Math.max(4, value - 1))} disabled={value <= 4} aria-label="Fewer episodes" className="grid h-12 place-items-center text-white disabled:text-zinc-700"><Minus size={16} /></button>
        <div className="text-center">
            <div className="font-mono text-lg font-black leading-none">{value}</div>
            <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Episodes</div>
        </div>
        <button type="button" onClick={() => onChange(Math.min(24, value + 1))} disabled={value >= 24} aria-label="More episodes" className="grid h-12 place-items-center text-white disabled:text-zinc-700"><Plus size={16} /></button>
    </div>
);

const PersonRow: React.FC<{ person: { name: string; gender?: any } | null; label: string; line?: string; price?: string }> = ({ person, label, line, price }) => (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
        <span className="block h-11 w-11 overflow-hidden rounded-full border border-white/15 bg-zinc-800">
            {person && <PersonFace name={person.name} gender={person.gender} className="h-full w-full object-cover object-top" />}
        </span>
        <span className="min-w-0">
            <span className="block text-sm font-black leading-tight">{person?.name || 'Not named'}</span>
            <span className="block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{label}</span>
            {line && <span className="mt-0.5 block text-[10px] font-semibold text-emerald-300">{line}</span>}
        </span>
        {price && <span className="font-mono text-xs font-black text-zinc-300">{price}</span>}
    </div>
);

/** #282: the full pitch: the story in a few lines, tone and world, the people with their faces, the price and the deadline */
const FullPitch: React.FC<{
    player: Player;
    pitch: OwnedStreamingOriginalPitch;
    ask: number;
    fitsGap: boolean;
    onClose: () => void;
    onPass: () => void;
    onLook: () => void;
}> = ({ player, pitch, ask, fitsGap, onClose, onPass, onLook }) => {
    const lead = personOf(player, pitch.concept.castList[0]?.actorId);
    const director = personOf(player, pitch.concept.selectedCrew.director);
    const writer = WRITER_NPC_LIBRARY.find(item => item.id === pitch.script.writerId);
    const story = useMemo(() => getPitchStory(pitch, lead?.gender), [pitch, lead?.gender]);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const weeks = Math.max(0, pitch.answerByAbsoluteWeek - now);
    const isSeries = pitch.script.projectType === 'SERIES';
    return (
        <div data-full-pitch className="absolute inset-0 z-30 flex flex-col bg-[#0d0306]">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <OriginalPoster title={pitch.script.title} className="h-44">
                    <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-[calc(env(safe-area-inset-top)+12px)] z-20 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white"><X size={18} /></button>
                    <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex gap-1.5">
                        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">{isSeries ? 'Series' : 'Movie'}</span>
                        {fitsGap && <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">Fits your gap</span>}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#0d0306] via-[#0d0306]/80 to-transparent px-4 pb-2 pt-10">
                        <h2 className="font-serif text-2xl font-black italic leading-tight">{pitch.script.title}</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">A pitch from {pitch.studioName} · {weeks} {weeks === 1 ? 'week' : 'weeks'} to answer</p>
                    </div>
                </OriginalPoster>
                <div className="space-y-2.5 px-4 pb-4 pt-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                        <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-rose-300">The story</div>
                        <p data-pitch-story className="text-sm font-medium leading-relaxed text-zinc-200">{story.story}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[['Focus', story.focus], ['Tone', story.tone], ['World', story.world]].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                                <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</div>
                                <div className="mt-0.5 text-xs font-black leading-tight">{value}</div>
                            </div>
                        ))}
                    </div>
                    {/* #303: this is the studio's package, not people who came to you on their own */}
                    <div data-pitch-attached className="pt-1 text-[9px] font-black uppercase tracking-[0.14em] text-rose-300">{pitch.studioName} has attached</div>
                    <PersonRow person={writer ? { name: writer.name, gender: writer.gender } : null} label="Writer" line={`Script ★ ${pitch.script.quality}`} />
                    <PersonRow person={director} label="Director" line={director ? `Talent ${Math.round(director.stats?.talent ?? 0)}` : undefined} />
                    <PersonRow person={lead} label={`Lead, as ${pitch.heroName}`} line={lead ? `Talent ${Math.round(lead.stats?.talent ?? 0)} · Fame ${Math.round(lead.stats?.fame ?? 0)}` : undefined} />
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] p-3">
                        <span>
                            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">{pitch.studioName} makes it, and asks about</span>
                            <span className="block font-mono text-xl font-black text-amber-300">{money(ask)}</span>
                        </span>
                        <span className="text-right text-[11px] font-semibold leading-snug text-zinc-400">The whole bill is<br />on the last step</span>
                    </div>
                </div>
            </div>
            <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t border-white/10 bg-black/60 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
                <button type="button" data-pitch-pass onClick={onPass} className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 text-sm font-black text-white">Pass</button>
                <button type="button" onClick={onLook} className="min-h-[52px] rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.08em] text-white">Look through it</button>
            </div>
        </div>
    );
};

const PitchChoice: React.FC<{
    player: Player;
    pitch: OwnedStreamingOriginalPitch;
    selected: boolean;
    episodes: number;
    ask: number;
    fitsGap: boolean;
    onSelect: () => void;
    onEpisodes: (value: number) => void;
    onRead: () => void;
}> = ({ player, pitch, selected, episodes, ask, fitsGap, onSelect, onEpisodes, onRead }) => {
    const isSeries = pitch.script.projectType === 'SERIES';
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const weeks = Math.max(0, pitch.answerByAbsoluteWeek - now);
    const lead = personOf(player, pitch.concept.castList[0]?.actorId);
    const director = personOf(player, pitch.concept.selectedCrew.director);
    if (!selected) {
        return (
            <button type="button" data-pitch-choice={pitch.id} onClick={onSelect} className="grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left active:scale-[0.99]">
                <OriginalPoster title={pitch.script.title} small className="h-14 w-[52px] rounded-lg" />
                <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{pitch.script.title}</span>
                    <span className="block truncate text-[11px] font-semibold text-zinc-400">{formatGenreLabel(pitch.script.genres[0])} · {pitch.studioName}</span>
                </span>
                <span className="font-mono text-xs font-black text-amber-300">~{money(ask)}</span>
            </button>
        );
    }
    return (
        <div data-pitch-selected={pitch.id} className="overflow-hidden rounded-2xl border-2 border-rose-400 bg-white/[0.03] shadow-[0_0_22px_rgba(244,63,94,.22)]">
            <OriginalPoster title={pitch.script.title} className="h-28">
                <div className="absolute left-3 top-3 z-10 flex gap-1.5">
                    <span className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">{isSeries ? 'Series' : 'Movie'}</span>
                    {fitsGap && <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">Fits your gap</span>}
                </div>
                <span className="absolute right-3 top-3 z-10 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white"><Check size={14} /></span>
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-2 pt-8">
                    <h3 className="text-xl font-black uppercase leading-tight">{pitch.script.title}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-300">#{formatGenreLabel(pitch.script.genres[0])}</p>
                </div>
            </OriginalPoster>
            <div className="space-y-2.5 p-3">
                <p className="text-[13px] font-medium italic leading-snug text-zinc-200">“{pitch.script.logline}”</p>
                <div className="flex items-center gap-2.5">
                    <span className="flex shrink-0 -space-x-2">
                        {[director, lead].filter(Boolean).map(person => (
                            <span key={person!.id} className="block h-8 w-8 overflow-hidden rounded-full border-2 border-black bg-zinc-800"><PersonFace name={person!.name} gender={person!.gender} className="h-full w-full object-cover object-top" /></span>
                        ))}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xs font-black leading-tight">{[director?.name, lead?.name].filter(Boolean).join(', ')}</span>
                        <span className="block text-[10px] font-semibold text-zinc-500">Director and lead, attached</span>
                    </span>
                </div>
                <dl className="space-y-1 border-t border-white/10 pt-2 text-[10px] font-black uppercase tracking-[0.08em]">
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Script quality</dt><dd className="font-mono text-amber-300"><Star size={9} className="mr-1 inline fill-amber-300 text-amber-300" />{pitch.script.quality}/100</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">{pitch.studioName} asks</dt><dd className="font-mono text-white">~{money(ask)} in all</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Answer in</dt><dd className="font-mono text-white">{weeks} {weeks === 1 ? 'week' : 'weeks'}</dd></div>
                </dl>
                {isSeries && <EpisodeStepper value={episodes} onChange={onEpisodes} />}
                <button type="button" data-read-pitch onClick={onRead} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/10 text-[11px] font-black uppercase tracking-[0.1em] text-rose-200"><BookOpen size={14} /> Read the full pitch</button>
            </div>
        </div>
    );
};

/** #282: the Commission wizard. Script and Studio are here; everything after them is Greenlight's own wizard, in red. */
export const CommissionWizard: React.FC<{
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    onOpenProductionHouse?: () => void;
    initialPitchId?: string | null;
    onCommissioned: () => void;
}> = ({ player, onUpdatePlayer, onClose, onOpenProductionHouse, initialPitchId = null, onCommissioned }) => {
    const pitches = useMemo(() => getLiveOriginalPitches(player), [player.ownedStreamingPlatform?.originalPitches]);
    const ownScripts = useMemo(() => getCommissionableScripts(player), [player.businesses]);
    const studios = useMemo(() => getOriginalsStudios(player), [player.age, player.currentWeek]);
    const ownStudios = useMemo(() => (player.businesses || []).filter(item => item.type === 'PRODUCTION_HOUSE' && item.isActive && item.studioState), [player.businesses]);
    const [stage, setStage] = useState<'SCRIPT' | 'STUDIO'>('SCRIPT');
    const [making, setMaking] = useState<{ studio: Business; mode: OriginalWizardMode; concept: any; key: string } | null>(null);
    const [tab, setTab] = useState<'PITCHES' | 'SCRIPTS'>(initialPitchId || pitches.length || !ownScripts.length ? 'PITCHES' : 'SCRIPTS');
    const [pitchId, setPitchId] = useState<string | null>(initialPitchId || pitches[0]?.id || null);
    const [scriptId, setScriptId] = useState<string | null>(ownScripts[0]?.script.id || null);
    const [episodeChoice, setEpisodeChoice] = useState<Record<string, number>>({});
    const [readingPitch, setReadingPitch] = useState(false);
    /* an outside studio's id, or a studio of the player's own */
    const [makerId, setMakerId] = useState<string | null>(null);

    const pitch = tab === 'PITCHES' ? pitches.find(item => item.id === pitchId) || null : null;
    const own = tab === 'SCRIPTS' ? ownScripts.find(item => item.script.id === scriptId) || null : null;
    const script: Script | null = pitch?.script || own?.script || null;
    const isSeries = script?.projectType === 'SERIES';
    const episodes = script ? episodeChoice[script.id] ?? Number(script.episodes || ORIGINAL_STANDARD_EPISODES) : ORIGINAL_STANDARD_EPISODES;
    const setEpisodes = (value: number) => script && setEpisodeChoice(current => ({ ...current, [script.id]: value }));

    const way: OriginalCommissionWay = pitch ? 'PITCH' : ownStudios.some(item => item.id === makerId) ? 'OWN_STUDIO' : 'OUTSIDE';
    const makerCard: StudioCardData | null = pitch
        ? studios.find(item => item.id === pitch.studioId) || null
        : studios.find(item => item.id === makerId) || null;
    const ownMaker: Business | null = own ? ownStudios.find(item => item.id === makerId) || null : null;
    const feeSeed = pitch?.seed || `${script?.id || 'script'}:${makerId || ''}:${player.age}:${player.currentWeek}`;
    const fee = useMemo(() => (!makerCard ? { percent: 0, why: '' } : pitch ? getPitchFee(makerCard, pitch) : getStudioFee(makerCard, feeSeed)), [makerCard, feeSeed, pitch]);
    const askOf = (item: OwnedStreamingOriginalPitch) => estimatePitchAsk(player, item, studios.find(card => card.id === item.studioId) || null, episodeChoice[item.script.id] ?? item.script.episodes).total;
    const treasury = Number(player.ownedStreamingPlatform?.treasuryCash || 0);
    const canGoOn = Boolean(script);

    /* what the wizard reads: a copy of the script with the episodes chosen here; your own script's rights are already paid for */
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const wizardScript: Script | null = script ? {
        ...script,
        episodes: isSeries ? episodes : script.episodes,
        ...(pitch ? {} : { developmentCost: 0, developmentPayment: undefined }),
    } : null;
    const buildWizardStudio = (): Business | null => {
        if (!wizardScript) return null;
        if (pitch && makerCard) return buildOutsideStudioStandIn(makerCard, wizardScript, pitch.concept, [{ id: wizardScript.writerId, name: wizardScript.author, skill: wizardScript.quality, fee: 0, speed: 1, tier: 'COMMON', stats: {} }] as any, player.currentWeek);
        if (own && makerCard) return buildOutsideStudioStandIn(makerCard, wizardScript, createBlankOriginalConcept(wizardScript, absoluteWeek), own.studio.studioState?.writers as any, player.currentWeek);
        if (own && ownMaker) return { ...ownMaker, studioState: { ...ownMaker.studioState!, scripts: (ownMaker.studioState!.scripts || []).map(item => item.id === wizardScript.id ? wizardScript : item) } };
        return null;
    };

    const buildMode = (): OriginalWizardMode | null => wizardScript ? {
        way,
        locked: way === 'PITCH',
        commissionId: getOriginalCommissionId(player, wizardScript.id),
        platformName: player.ownedStreamingPlatform?.identity?.name || 'Your platform',
        treasury,
        studioCard: makerCard,
        feePercent: fee.percent,
        feeWhy: fee.why,
        episodes: isSeries ? episodes : 1,
        pitch: pitch || undefined,
        sourceStudioId: own?.studio.id,
        onStepBack: to => { setMaking(null); setStage(to); },
        onCommissioned,
    } : null;

    /* the pitch or script is used up when the commission goes through, so the wizard keeps what it was opened with */
    const openWizard = () => {
        const studio = buildWizardStudio();
        const mode = buildMode();
        if (!studio || !mode || !wizardScript) return;
        setMaking({
            studio,
            mode,
            concept: pitch ? { ...pitch.concept, lastStep: 'DIRECTOR' as const } : createBlankOriginalConcept(wizardScript, absoluteWeek),
            key: `${wizardScript.id}:${makerId || pitch?.studioId}`,
        });
    };

    const language = getPlayerLanguage(player);
    const headerStep = stage === 'SCRIPT' ? 0 : 1;
    const header = (
        <GreenlightHeader
            step="SELECT_SCRIPT"
            onBack={stage === 'SCRIPT' ? onClose : () => setStage('SCRIPT')}
            onStepChange={() => {}}
            selectedScriptId={script?.id || null}
            currentEstimatedBuzz={Math.round(Number(script?.hype || 0))}
            currentEstimatedQuality={Number(script?.quality || 0)}
            budgetBreakdown={{ baseCost: 0, scriptCost: 0, equipmentCost: 0 }}
            musicBudget={0}
            reservedMarketingBudget={0}
            packageBudget={pitch ? askOf(pitch) : 0}
            availableFunding={treasury}
            formatMoney={value => money(value)}
            translate={(key: any) => t(language, key)}
            commission={{
                labels: way === 'OWN_STUDIO' ? COMMISSION_STEP_LABELS.filter(label => label !== 'Deal') : COMMISSION_STEP_LABELS,
                index: headerStep,
                chip: stage === 'SCRIPT' ? 'Select script' : 'Studio',
                onStep: index => { if (index === 0) setStage('SCRIPT'); },
            }}
        />
    );

    if (making) {
        return createPortal(
            <div className="commission-red fixed inset-0 z-[90]">
                <GreenlightWizard
                    key={making.key}
                    player={player}
                    studio={making.studio}
                    initialConcept={making.concept}
                    onBack={() => { setMaking(null); setStage('STUDIO'); }}
                    onUpdatePlayer={onUpdatePlayer}
                    onComplete={onCommissioned}
                    originalCommission={making.mode}
                />
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div data-commission-wizard className="commission-red fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#0d0306] font-sans text-white">
            {header}
            {stage === 'SCRIPT' && (
                <>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-3">
                        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                            {([['PITCHES', `Pitches · ${pitches.length}`], ['SCRIPTS', `Your scripts · ${ownScripts.length}`]] as const).map(([id, label]) => (
                                <button key={id} type="button" data-commission-tab={id} onClick={() => setTab(id)} className={`min-h-10 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] ${tab === id ? 'bg-rose-500 text-white' : 'text-zinc-400'}`}>{label}</button>
                            ))}
                        </div>
                        {tab === 'PITCHES' && (pitches.length ? pitches.map(item => (
                            <PitchChoice
                                key={item.id}
                                player={player}
                                pitch={item}
                                selected={item.id === pitchId}
                                episodes={episodeChoice[item.script.id] ?? Number(item.script.episodes || ORIGINAL_STANDARD_EPISODES)}
                                ask={askOf(item)}
                                fitsGap={Boolean(getScriptGapFit(player, item.script.genres))}
                                onSelect={() => setPitchId(item.id)}
                                onEpisodes={value => setEpisodeChoice(current => ({ ...current, [item.script.id]: value }))}
                                onRead={() => setReadingPitch(true)}
                            />
                        )) : (
                            <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs font-semibold text-zinc-500">No studio is in the room right now. Your Desk says when the next pitches come.</p>
                        ))}
                        {tab === 'SCRIPTS' && (hasOwnProductionHouse(player) ? (ownScripts.length ? (
                            <>
                                {ownScripts.map(({ script: item, studio }) => {
                                    const selected = item.id === scriptId;
                                    const itemSeries = item.projectType === 'SERIES';
                                    return selected ? (
                                        <div key={item.id} data-script-selected={item.id} className="overflow-hidden rounded-2xl border-2 border-rose-400 bg-white/[0.03]">
                                            <OriginalPoster title={item.title} className="h-24">
                                                <span className="absolute right-3 top-3 z-10 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white"><Check size={14} /></span>
                                                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-2 pt-8">
                                                    <h3 className="text-lg font-black uppercase leading-tight">{item.title}</h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-300">#{formatGenreLabel(item.genres[0])} · from {studio.name}</p>
                                                </div>
                                            </OriginalPoster>
                                            <div className="space-y-2.5 p-3">
                                                {item.logline && <p className="text-[13px] font-medium italic leading-snug text-zinc-200">“{item.logline}”</p>}
                                                <div className="flex justify-between gap-3 border-t border-white/10 pt-2 text-[10px] font-black uppercase tracking-[0.08em]"><span className="text-zinc-500">Script quality</span><span className="font-mono text-amber-300">★ {item.quality}/100</span></div>
                                                {itemSeries && <EpisodeStepper value={episodeChoice[item.id] ?? Number(item.episodes || ORIGINAL_STANDARD_EPISODES)} onChange={value => setEpisodeChoice(current => ({ ...current, [item.id]: value }))} />}
                                            </div>
                                        </div>
                                    ) : (
                                        <button key={item.id} type="button" data-script-choice={item.id} onClick={() => setScriptId(item.id)} className="grid w-full grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left active:scale-[0.99]">
                                            <OriginalPoster title={item.title} small className="h-14 w-[52px] rounded-lg" />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-black">{item.title}</span>
                                                <span className="block truncate text-[11px] font-semibold text-zinc-400">{formatGenreLabel(item.genres[0])} · ★ {item.quality}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                                <p className="text-center text-[11px] font-semibold text-zinc-500">Scripts come from your studio's Script Market and Dev Lab.</p>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                                <p className="text-sm font-black">No script ready</p>
                                <p className="mt-1 text-xs font-semibold text-zinc-400">Scripts come from your studio's Script Market and Dev Lab. Buy or write one there, then come back.</p>
                                {onOpenProductionHouse && <button type="button" onClick={onOpenProductionHouse} className="mt-3 min-h-11 w-full rounded-xl border border-rose-300/30 bg-rose-500/10 text-[11px] font-black uppercase tracking-[0.1em] text-rose-200">Open your studio</button>}
                            </div>
                        )) : (
                            <div data-needs-studio className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                                <p className="text-sm font-black">Your own script needs a production house</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">Scripts come from a studio's Script Market and Dev Lab. Until you own one, you can take the pitches studios bring you.</p>
                                {onOpenProductionHouse && <button type="button" onClick={onOpenProductionHouse} className="mt-3 min-h-11 w-full rounded-xl border border-rose-300/30 bg-rose-500/10 text-[11px] font-black uppercase tracking-[0.1em] text-rose-200">See production houses</button>}
                            </div>
                        ))}
                    </div>
                    <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t border-white/10 bg-black/60 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
                        <button type="button" onClick={onClose} className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 text-sm font-black text-white">Cancel</button>
                        <button
                            type="button"
                            data-commission-next
                            disabled={!canGoOn}
                            onClick={() => {
                                if (!pitch && !makerId) setMakerId(studios[0]?.id || ownStudios[0]?.id || null);
                                setStage('STUDIO');
                            }}
                            className="min-h-[52px] rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.08em] text-white disabled:bg-zinc-800 disabled:text-zinc-600"
                        >
                            Next: Studio
                        </button>
                    </div>
                </>
            )}
            {stage === 'STUDIO' && (
                <>
                    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4 pt-3">
                        {pitch && makerCard && (
                            <>
                                <div data-locked-banner className="flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2 text-[11px] font-bold text-violet-100">
                                    <Lock size={12} className="shrink-0" /> {makerCard.name} chose this. You can see it, not change it.
                                </div>
                                <OriginalsStudioCard studio={makerCard} feePercent={fee.percent} feeLine={fee.why} spendingNote="Their call, not yours" />
                            </>
                        )}
                        {!pitch && (
                            <>
                                <p className="px-1 text-xs font-semibold text-zinc-400">Who makes it? You can see what each has made, how it works and what it charges.</p>
                                {studios.map(card => {
                                    const cardFee = getStudioFee(card, `${script?.id || 'script'}:${card.id}:${player.age}:${player.currentWeek}`);
                                    return makerId === card.id ? (
                                        <OriginalsStudioCard key={card.id} studio={card} selected feePercent={cardFee.percent} feeLine={cardFee.why} spendingNote="You set this on your script" />
                                    ) : (
                                        <OriginalsStudioCard key={card.id} studio={card} compact feePercent={cardFee.percent} onSelect={() => setMakerId(card.id)} />
                                    );
                                })}
                                {ownStudios.map(item => (
                                    <button key={item.id} type="button" data-own-studio={item.id} onClick={() => setMakerId(item.id)} aria-pressed={makerId === item.id} className={`grid min-h-[60px] w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] ${makerId === item.id ? 'border-rose-400 bg-rose-500/10' : 'border-emerald-400/30 bg-emerald-400/[0.05]'}`}>
                                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 text-[11px] font-black text-black">YOU</span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-black">{item.name}</span>
                                            <span className="block truncate text-[11px] font-semibold text-zinc-400">Your studio · no fee · Career tasks apply</span>
                                        </span>
                                        <span className="font-mono text-xs font-black text-emerald-300">NO FEE</span>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t border-white/10 bg-black/60 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
                        <button type="button" onClick={() => setStage('SCRIPT')} className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 text-sm font-black text-white">Back</button>
                        <button type="button" data-commission-next disabled={!pitch && !makerId} onClick={openWizard} className="min-h-[52px] rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.08em] text-white disabled:bg-zinc-800 disabled:text-zinc-600">Next: Director</button>
                    </div>
                </>
            )}
            {readingPitch && pitch && (
                <FullPitch
                    player={player}
                    pitch={pitch}
                    ask={askOf(pitch)}
                    fitsGap={Boolean(getScriptGapFit(player, pitch.script.genres))}
                    onClose={() => setReadingPitch(false)}
                    onPass={() => {
                        setReadingPitch(false);
                        const next = passOriginalPitch(player, pitch.id);
                        onUpdatePlayer(next);
                        const left = getLiveOriginalPitches(next);
                        setPitchId(left[0]?.id || null);
                    }}
                    onLook={() => { setReadingPitch(false); setStage('STUDIO'); }}
                />
            )}
        </div>,
        document.body,
    );
};

export default CommissionWizard;
