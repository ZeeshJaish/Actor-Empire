import React, { useMemo, useState } from 'react';
import { ChevronDown, Mic, Music, Search } from 'lucide-react';
import type { MusicArtist, MusicCreditRole } from '../../../../types';
import type { MusicArtistSortOption } from '../greenlightUtils';
import { getMusicArtistById } from '../../../../services/musicIndustry';
import { getGenderedAvatar } from '../../../../services/npcAvatar';

/** #270: an artist's face, the same seeded portrait as any person; a group or an unknown keeps a music mark */
const ArtistFace: React.FC<{ artist?: MusicArtist | null; size?: string }> = ({ artist, size = 'h-12 w-12' }) => {
    const gender = artist?.gender === 'MALE' || artist?.gender === 'FEMALE' ? artist.gender : null;
    const face = useMemo(() => (gender && artist ? getGenderedAvatar(gender, artist.stageName) : null), [gender, artist?.stageName]);
    return face
        ? <img src={face} alt="" draggable={false} className={`${size} shrink-0 rounded-full border-2 border-cyan-300/30 bg-black object-cover object-top`} />
        : <span className={`${size} grid shrink-0 place-items-center rounded-full border-2 border-cyan-300/30 bg-cyan-400/10 text-cyan-200`}><Music size={18} aria-hidden="true" /></span>;
};

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
}) => {
    const [pickerRole, setPickerRole] = useState<MusicCreditRole | null>(null);
    return (
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
                                ? 'Pick what you want, then the artists'
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
                    const creditArtist = credit?.artistId ? (searchMatches.find(artist => artist.id === credit.artistId) || getMusicArtistById(credit.artistId)) : null;
                    const pickerOpen = isIncluded && pickerRole === role;

                    if (!isIncluded) {
                        return (
                            <div key={`plan_${role}`} className="flex min-h-[52px] min-w-0 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-black text-zinc-300">{getMusicCreditRoleLabel(role)}</div>
                                    <div className="truncate text-[10px] font-bold text-zinc-600">Not producing this</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={event => {
                                        event.stopPropagation();
                                        onToggleRole(role, false);
                                    }}
                                    className="min-h-9 shrink-0 rounded-full bg-zinc-900 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400 hover:bg-cyan-400/10 hover:text-cyan-200"
                                >
                                    Add
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`plan_${role}`}
                            className={`min-w-0 rounded-xl border p-3 transition-all ${isActiveSlot ? 'border-cyan-300 bg-cyan-400/[0.08] shadow-[0_0_18px_rgba(34,211,238,0.12)]' : 'border-cyan-400/40 bg-cyan-400/10'}`}
                        >
                            <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
                                <ArtistFace artist={creditArtist} />
                                <div className="min-w-0">
                                    <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/60">{getMusicCreditRoleLabel(role)}</div>
                                    <div className="mt-0.5 truncate text-sm font-black text-white">{credit?.artistName || 'Choose artist'}</div>
                                    <div className="mt-0.5 truncate text-[10px] font-bold text-zinc-400">
                                        {isStudioDecidedMusicPlan ? 'The studio picked this artist' : credit?.songTitle || 'Artist not assigned yet'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-sm font-black text-cyan-300">{credit ? formatMoney(credit.estimatedCost) : '—'}</div>
                                    {credit && <div className="mt-0.5 text-[9px] font-black text-emerald-300">+{credit.buzz} buzz</div>}
                                </div>
                            </div>
                            <div className="mt-2.5 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPickerRole(pickerOpen ? null : role);
                                        if (!pickerOpen) onFocusRole(role, roleIndex);
                                    }}
                                    aria-expanded={pickerOpen}
                                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-cyan-300/30 bg-black/30 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
                                >
                                    {credit?.artistName ? 'Change artist' : 'Pick artist'} <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={event => {
                                        event.stopPropagation();
                                        onToggleRole(role, true);
                                    }}
                                    className="min-h-11 rounded-xl border border-zinc-800 bg-black/30 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400"
                                >
                                    Remove
                                </button>
                            </div>
                            {pickerOpen && (
                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_132px] gap-2">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-200/50" />
                                            <input
                                                value={roleQuery}
                                                onFocus={() => onFocusRole(role, roleIndex)}
                                                onChange={event => onSearchChange(role, roleIndex, event.target.value)}
                                                placeholder={`Search artist for ${getMusicCreditRoleLabel(role).toLowerCase()}`}
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
                                    {searchMatches.length === 0 ? (
                                        <div className="rounded-xl border border-zinc-800 p-3 text-xs font-bold text-zinc-500">
                                            {translate('greenlight.music.noArtistsMatch')}
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {searchMatches.slice(0, 6).map(artist => {
                                                const displayedCost = hasMusicPreviewProject ? getDisplayedArtistCost(artist) : artist.costLow;
                                                const isAssigned = credit?.artistId === artist.id;
                                                return (
                                                    <button
                                                        key={`${role}_${artist.id}`}
                                                        type="button"
                                                        onClick={() => {
                                                            onAssignArtist(role, artist.id);
                                                            setPickerRole(null);
                                                        }}
                                                        className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${isAssigned ? 'border-cyan-200 bg-cyan-300/15' : 'border-zinc-800 bg-black/35 hover:border-cyan-300/70'}`}
                                                    >
                                                        <ArtistFace artist={artist} size="h-10 w-10" />
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-xs font-black text-white">{artist.stageName}</span>
                                                            <span className="mt-0.5 block truncate text-[9px] font-black uppercase tracking-[0.1em] text-cyan-200/55">{artist.genre} · {artist.fameTier} · {artist.availability}</span>
                                                        </span>
                                                        <span className="text-right">
                                                            <span className="block font-mono text-xs font-black text-cyan-300">{formatMoney(displayedCost)}</span>
                                                            <span className="mt-0.5 block text-[9px] font-black text-emerald-300">{artist.reputation}/100</span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
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
};
