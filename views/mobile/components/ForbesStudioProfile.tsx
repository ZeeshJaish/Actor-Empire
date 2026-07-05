import React from 'react';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Archive,
    Award,
    Banknote,
    Building2,
    ChartNoAxesCombined,
    Clapperboard,
    Crown,
    Factory,
    Globe2,
    Landmark,
    ShieldCheck,
    Skull,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { ForbesStudioProfile as ForbesStudioProfileData, StudioAcquisitionState } from '../../../services/forbesStudioProfile';
import type { GameLanguage } from '../../../types';
import {
    getForbesOwnershipCommand,
    type ApplyForbesOwnershipDiscoveryResult,
} from '../../../services/forbesOwnershipDiscovery';
import { t } from '../../../services/i18n';
import { formatMoney } from '../../../services/formatUtils';
import type { CompanyPosition } from '../../../services/companyPosition';
import {
    getAcquisitionEligibility,
    type AcquisitionCase,
} from '../../../services/studioAcquisition';
import { ForbesCompanyPosition } from './ForbesCompanyPosition';

interface ForbesStudioProfileProps {
    profile: ForbesStudioProfileData;
    onClose: () => void;
    ownershipCommandRecorded: boolean;
    onOwnershipCommand: () => ApplyForbesOwnershipDiscoveryResult;
    companyPosition: CompanyPosition;
    acquisitionCase?: AcquisitionCase;
    onApproachStudio: () => void;
    onOpenStocks: () => void;
    language: GameLanguage;
}

const ACQUISITION_STATES: Record<StudioAcquisitionState, { labelKey: Parameters<typeof t>[1]; noteKey: Parameters<typeof t>[1]; className: string }> = {
    NOT_FOR_SALE: { labelKey: 'forbes.studioProfile.acquisitionState.NOT_FOR_SALE.label', noteKey: 'forbes.studioProfile.acquisitionState.NOT_FOR_SALE.note', className: 'border-zinc-600/60 bg-zinc-800/70 text-zinc-200' },
    OPEN_TO_OFFERS: { labelKey: 'forbes.studioProfile.acquisitionState.OPEN_TO_OFFERS.label', noteKey: 'forbes.studioProfile.acquisitionState.OPEN_TO_OFFERS.note', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    DISTRESSED: { labelKey: 'forbes.studioProfile.acquisitionState.DISTRESSED.label', noteKey: 'forbes.studioProfile.acquisitionState.DISTRESSED.note', className: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
    SEEKING_INVESTMENT: { labelKey: 'forbes.studioProfile.acquisitionState.SEEKING_INVESTMENT.label', noteKey: 'forbes.studioProfile.acquisitionState.SEEKING_INVESTMENT.note', className: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
    PUBLICLY_TRADED: { labelKey: 'forbes.studioProfile.acquisitionState.PUBLICLY_TRADED.label', noteKey: 'forbes.studioProfile.acquisitionState.PUBLICLY_TRADED.note', className: 'border-violet-500/40 bg-violet-500/10 text-violet-300' },
    AUCTION_EXPECTED: { labelKey: 'forbes.studioProfile.acquisitionState.AUCTION_EXPECTED.label', noteKey: 'forbes.studioProfile.acquisitionState.AUCTION_EXPECTED.note', className: 'border-amber-400/50 bg-amber-400/10 text-amber-300' },
};

const formatCompactMoney = (value: number) => value === 0 ? '$0' : formatMoney(value);

export const ForbesStudioProfile: React.FC<ForbesStudioProfileProps> = ({
    profile,
    onClose,
    ownershipCommandRecorded,
    onOwnershipCommand,
    companyPosition,
    acquisitionCase,
    onApproachStudio,
    onOpenStocks,
    language,
}) => {
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const acquisition = ACQUISITION_STATES[profile.acquisitionState];
    const isProfitable = profile.profitability >= 0;
    const [ownershipCommandFeedback, setOwnershipCommandFeedback] = React.useState<string | null>(null);
    const acquisitionEligibility = getAcquisitionEligibility(profile, acquisitionCase);
    const canOpenAcquisition = acquisitionEligibility.canApproach
        || acquisitionCase?.status === 'DRAFT'
        || ['OFFER_SUBMITTED', 'COUNTERED', 'RIVAL_BID', 'ACCEPTED', 'REJECTED'].includes(acquisitionCase?.status || '');
    const acquisitionStatusCopy = acquisitionCase?.status === 'COUNTERED'
        ? { title: tr('forbes.studioProfile.status.countered.title'), note: tr('forbes.studioProfile.status.countered.note'), action: tr('forbes.studioProfile.status.countered.action') }
        : acquisitionCase?.status === 'RIVAL_BID'
            ? { title: tr('forbes.studioProfile.status.rivalBid.title'), note: tr('forbes.studioProfile.status.rivalBid.note'), action: tr('forbes.studioProfile.status.rivalBid.action') }
            : acquisitionCase?.status === 'ACCEPTED'
                ? { title: tr('forbes.studioProfile.status.accepted.title'), note: tr('forbes.studioProfile.status.accepted.note'), action: tr('forbes.studioProfile.status.accepted.action') }
                : acquisitionCase?.status === 'REJECTED'
                    ? { title: tr('forbes.studioProfile.status.rejected.title'), note: tr('forbes.studioProfile.status.rejected.note'), action: tr('forbes.studioProfile.status.rejected.action') }
                    : acquisitionCase?.status === 'OFFER_SUBMITTED'
                        ? { title: tr('forbes.studioProfile.status.offerSubmitted.title'), note: tr('forbes.studioProfile.status.offerSubmitted.note'), action: tr('forbes.studioProfile.status.offerSubmitted.action') }
                        : null;
    const ownershipCommand = canOpenAcquisition
        ? null
        : getForbesOwnershipCommand(profile.acquisitionState, profile.isPlayerOwned, language);
    const commandCompleted = ownershipCommandRecorded || Boolean(ownershipCommandFeedback);
    const assetSourceLabel = profile.assetDataSource === 'SAVE_DATA'
        ? tr('forbes.studioProfile.assetSource.saveData')
        : profile.assetDataSource === 'MIXED'
            ? tr('forbes.studioProfile.assetSource.mixed')
            : tr('forbes.studioProfile.assetSource.estimate');

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={tr('forbes.studioProfile.aria', { name: profile.name })}
            className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#050505] text-white"
        >
            <header
                aria-label={tr('forbes.studioProfile.headerAria')}
                className="shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,#0c0c0d_0%,#070708_100%)] px-4 pb-4 pt-10"
            >
                <div className="mb-4 grid grid-cols-[44px_minmax(0,1fr)_58px] items-center gap-3">
                    <button
                        onClick={onClose}
                        aria-label="Close studio profile"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/10"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 text-center">
                        <div className="font-serif text-[17px] font-black italic tracking-[0.2em] text-[#f4f0e7]">FORBES</div>
                        <div className="mt-0.5 text-[6px] font-black uppercase tracking-[0.3em] text-zinc-600">{tr('forbes.studioProfile.studioIntelligence')}</div>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1.5 text-center">
                        <div className="text-[5px] font-black uppercase tracking-[0.18em] text-amber-500/55">{tr('forbes.studioProfile.marketRank')}</div>
                        <div className="font-mono text-sm font-black leading-tight text-amber-400">#{profile.rank}</div>
                    </div>
                </div>

                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <div className="border-l-2 border-amber-400 pl-3">
                        <div className="mb-1.5 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-500">
                            <Building2 size={12} className="text-amber-400" />
                            {tr('forbes.studioProfile.companyProfile', { archetype: profile.archetype })}
                        </div>
                        <h2 className="max-w-full break-words font-serif text-[clamp(1.85rem,8vw,2.65rem)] font-black uppercase italic leading-[0.9] tracking-[-0.045em] text-[#f4f0e7]">
                            {profile.name}
                        </h2>
                    </div>

                    <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="text-[6px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.marketReputation')}</span>
                            <span className="font-mono text-[9px] font-black text-amber-300">{profile.reputation}/100</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${profile.reputation}%` }} />
                        </div>
                    </div>
                </motion.div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-10 pt-4 custom-scrollbar">
                <section className={`mb-5 rounded-2xl border p-4 ${acquisition.className}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em]">
                            <ShieldCheck size={15} /> {tr('forbes.studioProfile.acquisitionState')}
                        </div>
                        <span className="rounded-full border border-current/25 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em]">{tr(acquisition.labelKey)}</span>
                    </div>
                    <p className="text-[11px] font-semibold leading-relaxed opacity-75">{tr(acquisition.noteKey)}</p>
                </section>

                <ForbesCompanyPosition position={companyPosition} onOpenStocks={onOpenStocks} />

                <section className="mb-5 overflow-hidden rounded-2xl border border-amber-400/20 bg-[linear-gradient(145deg,rgba(245,158,11,0.08),rgba(12,12,14,0.96))]">
                    <div className="border-b border-white/[0.07] px-4 py-3">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-amber-300">
                            <Landmark size={14} /> {tr('forbes.studioProfile.ownershipCommand')}
                        </div>
                    </div>
                    <div className="p-4">
                        {canOpenAcquisition ? (
                            <>
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                                        <Target size={17} />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-200">
                                            {acquisitionStatusCopy?.title || tr('forbes.studioProfile.status.available.title')}
                                        </div>
                                        <p className="mt-1 text-[9px] font-semibold leading-relaxed text-zinc-600">
                                            {acquisitionStatusCopy?.note || tr('forbes.studioProfile.status.available.note')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onApproachStudio}
                                    className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black uppercase tracking-[0.17em] transition-all active:scale-[0.99] ${
                                        acquisitionCase?.status === 'ACCEPTED'
                                            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                            : acquisitionCase?.status === 'REJECTED'
                                                ? 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300'
                                                : acquisitionCase?.status === 'COUNTERED' || acquisitionCase?.status === 'RIVAL_BID'
                                                    ? 'border-amber-400/30 bg-amber-400/[0.08] text-amber-300'
                                                    : acquisitionStatusCopy
                                                        ? 'border-sky-400/25 bg-sky-400/[0.08] text-sky-300'
                                            : 'border-amber-400/35 bg-amber-400 text-black hover:bg-amber-300'
                                    }`}
                                >
                                    <Target size={16} />
                                    {acquisitionStatusCopy?.action || tr('forbes.studioProfile.status.available.action')}
                                </button>
                            </>
                        ) : ownershipCommand ? (
                            <>
                                <p className="mb-3 text-[10px] font-semibold leading-relaxed text-zinc-500">
                                    {commandCompleted
                                        ? ownershipCommandFeedback || tr('services.forbesOwnership.feedback.alreadyRecorded')
                                        : ownershipCommand.description}
                                </p>
                                <button
                                    type="button"
                                    disabled={commandCompleted}
                                    onClick={() => {
                                        const result = onOwnershipCommand();
                                        if (result.success) {
                                            setOwnershipCommandFeedback(tr('services.forbesOwnership.feedback.sent'));
                                        } else if (result.reason === 'ALREADY_RECORDED') {
                                            setOwnershipCommandFeedback(tr('services.forbesOwnership.feedback.alreadyRecorded'));
                                        }
                                    }}
                                    className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black uppercase tracking-[0.17em] transition-all ${
                                        commandCompleted
                                            ? 'cursor-default border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                                            : 'border-amber-400/35 bg-amber-400 text-black hover:bg-amber-300 active:scale-[0.99]'
                                    }`}
                                >
                                    <ShieldCheck size={16} />
                                    {commandCompleted ? ownershipCommand.completedLabel : ownershipCommand.label}
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-500">
                                    <Crown size={17} />
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300">{tr('forbes.studioProfile.playerControlled.title')}</div>
                                    <p className="mt-1 text-[9px] font-semibold leading-relaxed text-zinc-600">{tr('forbes.studioProfile.playerControlled.note')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="mb-5">
                    <div className="mb-2.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        <Landmark size={14} className="text-emerald-400" /> {tr('forbes.studioProfile.financialCommand')}
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">
                        <div className="grid grid-cols-2">
                            <div className="border-b border-r border-white/10 p-4">
                                <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.valuation')}</div>
                                <div className="font-mono text-xl font-black text-white">{formatCompactMoney(profile.valuation)}</div>
                            </div>
                            <div className="border-b border-white/10 p-4">
                                <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.capital')}</div>
                                <div className="font-mono text-xl font-black text-emerald-400">{formatCompactMoney(profile.capital)}</div>
                            </div>
                            <div className="border-r border-white/10 p-4">
                                <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.estimatedDebt')}</div>
                                <div className="font-mono text-lg font-black text-zinc-300">{formatCompactMoney(profile.debt)}</div>
                            </div>
                            <div className="p-4">
                                <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.profitability')}</div>
                                <div className={`flex items-center gap-1.5 font-mono text-lg font-black ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isProfitable ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                                    {formatCompactMoney(profile.profitability)}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-5">
                    <div className="mb-2.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        <ChartNoAxesCombined size={14} className="text-amber-400" /> {tr('forbes.studioProfile.performanceRecord')}
                    </div>
                    <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">
                        <div className="border-r border-white/10 p-3 text-center">
                            <Award size={16} className="mx-auto mb-2 text-emerald-400" />
                            <div className="font-mono text-2xl font-black">{profile.hits}</div>
                            <div className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-600">{tr('forbes.studioProfile.hits')}</div>
                        </div>
                        <div className="border-r border-white/10 p-3 text-center">
                            <Skull size={16} className="mx-auto mb-2 text-rose-400" />
                            <div className="font-mono text-2xl font-black">{profile.flops}</div>
                            <div className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-600">{tr('forbes.studioProfile.flops')}</div>
                        </div>
                        <div className="p-3 text-center">
                            <Crown size={16} className="mx-auto mb-2 text-amber-400" />
                            <div className="font-mono text-2xl font-black">{profile.hitRate}%</div>
                            <div className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-600">{tr('forbes.studioProfile.hitRate')}</div>
                        </div>
                    </div>
                </section>

                <section className="mb-5">
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">
                            <Archive size={14} className="text-violet-400" /> {tr('forbes.studioProfile.strategicAssets')}
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[0.16em] ${
                            profile.assetDataSource === 'SAVE_DATA'
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                                : 'border-sky-500/20 bg-sky-500/5 text-sky-400'
                        }`}>
                            {assetSourceLabel}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">
                        <div className="border-b border-r border-white/10 p-3.5">
                            <div className="mb-2 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em] text-violet-300">
                                <Archive size={13} /> {tr('forbes.studioProfile.rightsIp')}
                            </div>
                            <div className="font-mono text-2xl font-black text-white">{profile.rightsCount}</div>
                            <div className="mt-1 line-clamp-2 text-[8px] font-semibold leading-relaxed text-zinc-600">
                                {profile.rightsHighlights.length ? profile.rightsHighlights.join(' · ') : tr('forbes.studioProfile.portfolioUnderReview')}
                            </div>
                        </div>
                        <div className="border-b border-white/10 p-3.5">
                            <div className="mb-2 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em] text-amber-300">
                                <Clapperboard size={13} /> {tr('forbes.studioProfile.franchises')}
                            </div>
                            <div className="font-mono text-2xl font-black text-white">{profile.franchiseCount}</div>
                            <div className="mt-1 text-[8px] font-semibold leading-relaxed text-zinc-600">
                                {profile.franchiseCount > 0 ? tr('forbes.studioProfile.expandableLineages') : tr('forbes.studioProfile.noEstablishedLineage')}
                            </div>
                        </div>
                        <div className="border-r border-white/10 p-3.5">
                            <div className="mb-2 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em] text-sky-300">
                                <Globe2 size={13} /> {tr('forbes.studioProfile.universes')}
                            </div>
                            <div className="font-mono text-2xl font-black text-white">{profile.universeCount}</div>
                            <div className="mt-1 line-clamp-2 text-[8px] font-semibold leading-relaxed text-zinc-600">
                                {profile.universeNames.length ? profile.universeNames.join(' · ') : tr('forbes.studioProfile.noSharedCanon')}
                            </div>
                        </div>
                        <div className="p-3.5">
                            <div className="mb-2 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em] text-emerald-300">
                                <Factory size={13} /> {tr('forbes.studioProfile.facilities')}
                            </div>
                            <div className="font-mono text-2xl font-black text-white">{profile.facilities.length}</div>
                            <div className="mt-1 line-clamp-2 text-[8px] font-semibold leading-relaxed text-zinc-600">
                                {profile.facilities.slice(0, 2).join(' · ')}
                            </div>
                        </div>
                    </div>

                    <div className="mt-2.5 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">
                        <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
                            <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                <Users size={13} className="text-rose-400" /> {tr('forbes.studioProfile.keyTalent')}
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-widest text-zinc-700">{tr('forbes.studioProfile.trackedCount', { count: profile.keyTalent.length })}</span>
                        </div>
                        <div className="divide-y divide-white/[0.07]">
                            {profile.keyTalent.map(talent => (
                                <div key={`${talent.name}-${talent.role}`} className="flex items-center gap-3 px-3.5 py-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-black text-zinc-400">
                                        {talent.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-black uppercase tracking-tight text-zinc-200">{talent.name}</div>
                                        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">{talent.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mb-5">
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">
                            <Sparkles size={14} className="text-sky-400" /> {tr('forbes.studioProfile.catalogIntelligence')}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">{tr('forbes.studioProfile.trackedCount', { count: profile.catalog.length })}</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">
                        {profile.catalog.length > 0 ? profile.catalog.map((title, index) => (
                            <div key={title.id} className={`flex items-center gap-3 p-3.5 ${index > 0 ? 'border-t border-white/10' : ''}`}>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 font-serif text-sm font-black italic text-zinc-500">
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-black uppercase tracking-tight text-zinc-100">{title.title}</div>
                                    <div className="mt-1 text-[8px] font-bold uppercase tracking-widest text-zinc-600">{tr('forbes.studioProfile.releaseMeta', { year: title.year, week: title.week, outcome: title.outcome })}</div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-mono text-xs font-black text-emerald-400">{formatCompactMoney(title.revenue)}</div>
                                    <div className="text-[7px] font-black uppercase tracking-widest text-zinc-700">{tr('forbes.studioProfile.revenue')}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-5 text-center">
                                <Banknote size={20} className="mx-auto mb-2 text-zinc-700" />
                                <div className="text-xs font-black uppercase tracking-wider text-zinc-400">{tr('forbes.studioProfile.noTrackedReleases.title')}</div>
                                <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{tr('forbes.studioProfile.noTrackedReleases.note')}</p>
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <div className="mb-2.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        <Users size={14} className="text-violet-400" /> {tr('forbes.studioProfile.companyIdentity')}
                    </div>
                    <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">
                        <div className="p-4">
                            <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.managementStyle')}</div>
                            <div className="text-xs font-bold leading-relaxed text-zinc-200">{profile.managementPersonality}</div>
                        </div>
                        <div className="p-4">
                            <div className="mb-1 text-[7px] font-black uppercase tracking-[0.22em] text-zinc-600">{tr('forbes.studioProfile.ownership')}</div>
                            <div className="text-xs font-bold leading-relaxed text-zinc-200">{profile.ownershipStructure}</div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};
