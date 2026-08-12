import React from 'react';
import { Mic, Search } from 'lucide-react';
import type { MusicCreditRole } from '../../../../types';
import type { MusicArtistSortOption } from '../greenlightUtils';

interface GreenlightSoundtrackSectionProps {
    effectiveMusicArtistCount: number;
    selectedMusicByline: string;
    isStudioDecidedMusicPlan: boolean;
    isCustomMusicPlan: boolean;
    musicBudget: number;
    musicBuzzBonus: number;
    selectedMusicPlan: any;
    selectedMusicImpact: any;
    allMusicDeliverableRoles: MusicCreditRole[];
    activeMusicCreditRoles: MusicCreditRole[];
    activeMusicSlotIndex: number;
    activeMusicSearchRole: MusicCreditRole | null;
    musicRoleSearchQueries: Record<string, string>;
    musicRoleSortOptions: Record<string, MusicArtistSortOption>;
    musicArtistSortOptions: readonly { id: MusicArtistSortOption }[];
    hasMusicPreviewProject: boolean;
    getMusicArtistSearchMatches: (role: MusicCreditRole) => any[];
    getMusicCreditRoleLabel: (role: MusicCreditRole) => string;
    getDisplayedArtistCost: (artist: any) => number;
    formatMoney: (amount: number) => string;
    translate: (key: any, vars?: Record<string, unknown>) => string;
    onLetStudioDecide: () => void;
    onToggleRole: (role: MusicCreditRole, isIncluded: boolean) => void;
    onFocusRole: (role: MusicCreditRole, roleIndex: number) => void;
    onSearchChange: (role: MusicCreditRole, roleIndex: number, value: string) => void;
    onSortChange: (role: MusicCreditRole, roleIndex: number, value: MusicArtistSortOption) => void;
    onAssignArtist: (role: MusicCreditRole, artistId: string) => void;
}

export const GreenlightSoundtrackSection: React.FC<GreenlightSoundtrackSectionProps> = ({
    effectiveMusicArtistCount,
    selectedMusicByline,
    isStudioDecidedMusicPlan,
    isCustomMusicPlan,
    musicBudget,
    musicBuzzBonus,
    selectedMusicPlan,
    selectedMusicImpact,
    allMusicDeliverableRoles,
    activeMusicCreditRoles,
    activeMusicSlotIndex,
    activeMusicSearchRole,
    musicRoleSearchQueries,
    musicRoleSortOptions,
    musicArtistSortOptions,
    hasMusicPreviewProject,
    getMusicArtistSearchMatches,
    getMusicCreditRoleLabel,
    getDisplayedArtistCost,
    formatMoney,
    translate,
    onLetStudioDecide,
    onToggleRole,
    onFocusRole,
    onSearchChange,
    onSortChange,
    onAssignArtist,
}) => (
    <section className="bg-zinc-950/80 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]" aria-labelledby="greenlight-soundtrack-heading">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
                <h3 id="greenlight-soundtrack-heading" className="text-sm font-black text-cyan-300 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Mic size={16} /> Soundtrack Desk
                </h3>
                <div className="mt-2 text-lg sm:text-xl font-black text-white truncate">
                    {effectiveMusicArtistCount > 0
                        ? `${effectiveMusicArtistCount} content type${effectiveMusicArtistCount === 1 ? '' : 's'} planned`
                        : 'Composer score only'}
                </div>
                <div className="mt-1 truncate text-xs font-bold text-zinc-500">
                    {selectedMusicByline
                        ? `${isStudioDecidedMusicPlan ? 'Studio preview: ' : ''}${selectedMusicByline}`
                        : isCustomMusicPlan
                            ? 'Choose the music work and assign artists.'
                            : 'Let the studio choose the music work.'}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-[310px]">
                <div className="rounded-xl bg-black/35 border border-white/10 p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Budget</div>
                    <div className="mt-1 text-sm font-black text-cyan-300 font-mono">{formatMoney(musicBudget)}</div>
                </div>
                <div className="rounded-xl bg-black/35 border border-white/10 p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Buzz</div>
                    <div className="mt-1 text-sm font-black text-emerald-300">+{musicBuzzBonus}</div>
                </div>
                <div className="rounded-xl bg-black/35 border border-white/10 p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Risk</div>
                    <div className={`mt-1 text-sm font-black ${(selectedMusicPlan?.musicRisk || 0) > 28 ? 'text-rose-300' : (selectedMusicPlan?.musicRisk || 0) > 16 ? 'text-amber-300' : 'text-cyan-300'}`}>
                        {selectedMusicPlan?.musicRisk || 0}
                    </div>
                </div>
            </div>
        </div>

        {selectedMusicImpact && selectedMusicImpact.score > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/55">Opening</div>
                    <div className="mt-1 font-mono text-sm font-black text-emerald-300">
                        {selectedMusicImpact.openingWeekendLiftPct >= 0 ? '+' : ''}{selectedMusicImpact.openingWeekendLiftPct}%
                    </div>
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/55">Trailer</div>
                    <div className="mt-1 font-mono text-sm font-black text-cyan-300">+{selectedMusicImpact.trailerStrengthLift}</div>
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/55">Awards</div>
                    <div className="mt-1 font-mono text-sm font-black text-purple-200">+{selectedMusicImpact.awardChanceLift}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">Backlash</div>
                    <div className={`mt-1 font-mono text-sm font-black ${selectedMusicImpact.mismatchBacklashRisk >= 38 || selectedMusicImpact.controversyRisk >= 36 ? 'text-amber-300' : 'text-zinc-300'}`}>
                        {Math.max(selectedMusicImpact.mismatchBacklashRisk, selectedMusicImpact.controversyRisk)}
                    </div>
                </div>
            </div>
        )}

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3 space-y-3">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/60">Content Types</div>
                    <div className="mt-0.5 truncate text-sm font-black text-white">
                        {isStudioDecidedMusicPlan
                            ? `Studio decides · ${effectiveMusicArtistCount} planned`
                            : effectiveMusicArtistCount > 0
                                ? 'Toggle what you want, then assign artists'
                                : 'All music content is off'}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onLetStudioDecide}
                    className={`shrink-0 rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${!isCustomMusicPlan ? 'border-cyan-200 bg-cyan-300 text-black shadow-[0_0_18px_rgba(34,211,238,0.16)]' : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-300 hover:text-black'}`}
                >
                    Let Studio Decide
                </button>
            </div>
            <div className="space-y-2">
                {allMusicDeliverableRoles.map(role => {
                    const roleIndex = activeMusicCreditRoles.indexOf(role);
                    const isIncluded = roleIndex >= 0;
                    const credit = isIncluded ? selectedMusicPlan?.credits?.[roleIndex] : undefined;
                    const isActiveSlot = isIncluded && (activeMusicSlotIndex === roleIndex || activeMusicSearchRole === role);
                    const roleQuery = musicRoleSearchQueries[role] || '';
                    const roleSort = musicRoleSortOptions[role] || 'RECOMMENDED';
                    const searchMatches = isIncluded ? getMusicArtistSearchMatches(role) : [];

                    return (
                        <div
                            key={`plan_${role}`}
                            className={`min-w-0 rounded-xl border p-3 transition-all ${isActiveSlot ? 'border-cyan-300 bg-cyan-400/[0.08] shadow-[0_0_18px_rgba(34,211,238,0.12)]' : isIncluded ? 'border-cyan-400/40 bg-cyan-400/10 hover:border-cyan-300' : 'border-zinc-800 bg-black/20 opacity-70 hover:opacity-100 hover:border-cyan-400/40'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className={`text-[9px] font-black uppercase tracking-[0.16em] ${isIncluded ? 'text-cyan-200/60' : 'text-zinc-600'}`}>
                                        {getMusicCreditRoleLabel(role)}
                                    </div>
                                    <div className="mt-1 truncate text-sm font-black text-white">
                                        {isIncluded
                                            ? isStudioDecidedMusicPlan
                                                ? `Studio pick: ${credit?.artistName || 'Choosing artist'}`
                                                : credit?.artistName || 'Choose artist'
                                            : 'Not producing this'}
                                    </div>
                                    <div className="mt-1 truncate text-[10px] font-bold text-zinc-500">
                                        {isIncluded
                                            ? isStudioDecidedMusicPlan
                                                ? 'Auto preview - tap to customize'
                                                : credit?.songTitle || 'Artist not assigned yet'
                                            : 'Toggle on to add artist'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={event => {
                                        event.stopPropagation();
                                        onToggleRole(role, isIncluded);
                                    }}
                                    className={`shrink-0 rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] ${isIncluded ? 'bg-cyan-300 text-black hover:bg-cyan-200' : 'bg-zinc-900 text-zinc-500 hover:bg-cyan-400/10 hover:text-cyan-200'}`}
                                >
                                    {isIncluded ? (isStudioDecidedMusicPlan ? 'Auto' : 'On') : 'Off'}
                                </button>
                            </div>
                            {isIncluded && (
                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_132px] gap-2">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-200/50" />
                                            <input
                                                value={roleQuery}
                                                onFocus={() => onFocusRole(role, roleIndex)}
                                                onChange={event => onSearchChange(role, roleIndex, event.target.value)}
                                                placeholder={credit?.artistName ? `Change ${credit.artistName}` : `Search artist for ${getMusicCreditRoleLabel(role).toLowerCase()}`}
                                                className="w-full rounded-xl border border-zinc-800 bg-black/35 py-2.5 pl-9 pr-3 text-xs font-bold text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-300"
                                            />
                                        </div>
                                        <select
                                            value={roleSort}
                                            onFocus={() => onFocusRole(role, roleIndex)}
                                            onChange={event => onSortChange(role, roleIndex, event.target.value as MusicArtistSortOption)}
                                            className="rounded-xl border border-zinc-800 bg-black/35 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 outline-none transition-colors focus:border-cyan-300"
                                            aria-label={translate('greenlight.music.sortArtistsFor', { role: getMusicCreditRoleLabel(role) })}
                                        >
                                            {musicArtistSortOptions.map(option => (
                                                <option key={option.id} value={option.id}>{translate(`greenlight.music.sort.${option.id}`)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {activeMusicSearchRole === role && (
                                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/85 p-2">
                                            {searchMatches.length === 0 ? (
                                                <div className="p-3 text-xs font-bold text-zinc-500">
                                                    {translate('greenlight.music.noArtistsMatch')}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                                    {searchMatches.map(artist => {
                                                        const displayedCost = hasMusicPreviewProject ? getDisplayedArtistCost(artist) : artist.costLow;
                                                        const isAssigned = credit?.artistId === artist.id;
                                                        return (
                                                            <button
                                                                key={`${role}_${artist.id}`}
                                                                type="button"
                                                                onClick={() => onAssignArtist(role, artist.id)}
                                                                className={`min-w-[180px] max-w-[180px] rounded-xl border p-3 text-left transition-colors ${isAssigned ? 'border-cyan-200 bg-cyan-300 text-black' : 'border-zinc-800 bg-black/35 hover:border-cyan-300/70 hover:bg-cyan-400/10'}`}
                                                            >
                                                                <div className={`truncate text-xs font-black ${isAssigned ? 'text-black' : 'text-white'}`}>{artist.stageName}</div>
                                                                <div className={`mt-1 truncate text-[9px] font-black uppercase tracking-[0.14em] ${isAssigned ? 'text-black/55' : 'text-cyan-200/55'}`}>
                                                                    {artist.genre} • {artist.fameTier}
                                                                </div>
                                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <div className={`text-[8px] font-black uppercase tracking-[0.16em] ${isAssigned ? 'text-black/45' : 'text-zinc-600'}`}>Rating</div>
                                                                        <div className={`mt-0.5 text-sm font-black ${isAssigned ? 'text-black' : 'text-emerald-300'}`}>{artist.reputation}/100</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className={`text-[8px] font-black uppercase tracking-[0.16em] ${isAssigned ? 'text-black/45' : 'text-zinc-600'}`}>Cost</div>
                                                                        <div className={`mt-0.5 font-mono text-sm font-black ${isAssigned ? 'text-black' : 'text-cyan-300'}`}>{formatMoney(displayedCost)}</div>
                                                                    </div>
                                                                </div>
                                                                <div className={`mt-2 truncate text-[9px] font-black uppercase tracking-[0.12em] ${isAssigned ? 'text-black/50' : 'text-zinc-500'}`}>
                                                                    {artist.availability} • {artist.audience}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </section>
);
