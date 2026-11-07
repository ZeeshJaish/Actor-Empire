import React, { useState } from 'react';
import {
    CheckCircle,
    ChevronDown,
    Crown,
    Info,
    Plus,
    ShieldAlert,
    Users,
    X,
} from 'lucide-react';
import {
    type CastStoryRead,
    type CharacterIdentityProfile,
    type Player,
    type RoleType,
    type StoryCompass,
} from '../../../../types';
import { CharacterIdentityControls } from './CharacterIdentityControls';
import { StoryCompassStrip } from './StoryCompassStrip';
import type { GreenlightCastRole } from '../greenlightTypes';
import { isMissingMovieActorProfile } from '../greenlightUtils';
import { evaluateCharacterProfileFit, getCharacterIdentityOption } from '../../../../services/characterStoryFit';

interface GreenlightCastStepProps {
    player: Player;
    castList: GreenlightCastRole[];
    availableActors: any[];
    contractedActors: any[];
    currentReturningTalent: any[];
    playerActingTalent: number;
    selectedStoryCompass: StoryCompass | null;
    liveCastStoryRead: CastStoryRead | null;
    linkedCharacterOptions: any[];
    legacyCharacterOptions: any[];
    previousCharacterOptions: any[];
    activeUniverseId: string | null;
    allowsOutsideConnectedCharacters: boolean;
    showCharacterFlowInfo: boolean;
    showLegacyCharacterArchive: boolean;
    scriptTitle?: string;
    getRoleCharacterOption: (role: GreenlightCastRole) => any | null;
    getRoleCharacterOptionValue: (role: GreenlightCastRole) => string;
    getCharacterOptionValue: (character: any) => string;
    isKnownConnectedRole: (role: GreenlightCastRole) => boolean;
    getDefaultCharacterName: (role: GreenlightCastRole, index: number) => string;
    getSuggestedIdentity: (role: GreenlightCastRole, index: number) => CharacterIdentityProfile;
    getInHouseQuality: (role: string) => number;
    getInHouseFame: (role: string) => number;
    requiresReturningTalentNegotiation: (talent: any) => boolean;
    formatFee: (amount: number) => string;
    translate: (key: any) => string;
    onRemoveRole: (roleId: string) => void;
    onRoleTypeChange: (roleId: string, roleType: GreenlightCastRole['roleType']) => void;
    onToggleCharacterFlowInfo: () => void;
    onToggleLegacyCharacterArchive: () => void;
    onCharacterSelectionChange: (roleId: string, selectedValue: string) => void;
    onCharacterNameChange: (roleId: string, value: string) => void;
    onCharacterNameBlur: (roleId: string, index: number) => void;
    onIdentityChange: (roleId: string, patch: Partial<CharacterIdentityProfile>) => void;
    onNegotiate: (talentId: string, returningData: any, roleId: string) => void;
    onSelectActor: (roleId: string) => void;
    onAddRole: () => void;
    onBack: () => void;
    onNext: () => void;
}

export const GreenlightCastStep: React.FC<GreenlightCastStepProps> = ({
    player,
    castList,
    availableActors,
    contractedActors,
    currentReturningTalent,
    playerActingTalent,
    selectedStoryCompass,
    liveCastStoryRead,
    linkedCharacterOptions,
    legacyCharacterOptions,
    previousCharacterOptions,
    activeUniverseId,
    allowsOutsideConnectedCharacters,
    showCharacterFlowInfo,
    showLegacyCharacterArchive,
    scriptTitle,
    getRoleCharacterOption,
    getRoleCharacterOptionValue,
    getCharacterOptionValue,
    isKnownConnectedRole,
    getDefaultCharacterName,
    getSuggestedIdentity,
    getInHouseQuality,
    getInHouseFame,
    requiresReturningTalentNegotiation,
    formatFee,
    translate,
    onRemoveRole,
    onRoleTypeChange,
    onToggleCharacterFlowInfo,
    onToggleLegacyCharacterArchive,
    onCharacterSelectionChange,
    onCharacterNameChange,
    onCharacterNameBlur,
    onIdentityChange,
    onNegotiate,
    onSelectActor,
    onAddRole,
    onBack,
    onNext,
}) => {
    const castIncomplete = castList.some(role => !role.actorId);
    /* #269: one role's form open at a time; the rest stay short so the whole cast can be read at once */
    const [openRoleId, setOpenRoleId] = useState<string | null>(null);
    const [showScriptDna, setShowScriptDna] = useState(false);

    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 pb-[calc(13rem+env(safe-area-inset-bottom))] animate-in slide-in-from-right-4 duration-300">
            <section className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black text-white leading-tight">Assemble The Cast</h2>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400" aria-live="polite">
                            {liveCastStoryRead?.headline || 'Star power drives box office, but talent drives reviews.'}
                        </p>
                    </div>
                    {liveCastStoryRead && (
                        <div className="shrink-0 text-right">
                            <p className={`font-mono text-xl font-black ${
                                liveCastStoryRead.balanceScore >= 78
                                    ? 'text-emerald-300'
                                    : liveCastStoryRead.balanceScore >= 58
                                        ? 'text-amber-300'
                                        : 'text-rose-300'
                            }`}>
                                {liveCastStoryRead.balanceScore}
                            </p>
                            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-600">Balance</p>
                        </div>
                    )}
                </div>
                {(selectedStoryCompass || liveCastStoryRead) && (
                    <button
                        type="button"
                        onClick={() => setShowScriptDna(open => !open)}
                        aria-expanded={showScriptDna}
                        className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-3 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300"
                    >
                        <span className="flex items-center gap-2"><ShieldAlert size={14} aria-hidden="true" />Script DNA</span>
                        <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${showScriptDna ? 'rotate-180' : ''}`} />
                    </button>
                )}
                {showScriptDna && (
                    <div className="mt-3 space-y-3">
                        {selectedStoryCompass && <StoryCompassStrip compass={selectedStoryCompass} />}
                        {liveCastStoryRead && (
                            <div className="px-1">
                                <p className="text-[11px] leading-relaxed text-zinc-400">{liveCastStoryRead.summary}</p>
                                {(liveCastStoryRead.strengths[0] || liveCastStoryRead.warnings[0]) && (
                                    <p className={`mt-2 border-l-2 pl-3 text-[10px] leading-relaxed ${
                                        liveCastStoryRead.warnings[0]
                                            ? 'border-amber-400/60 text-amber-100/75'
                                            : 'border-emerald-400/60 text-emerald-100/75'
                                    }`}>
                                        {liveCastStoryRead.warnings[0] || liveCastStoryRead.strengths[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="space-y-3">
                {castList.map((role, index) => {
                    const assignedActor = role.actorId && role.actorId !== 'STUDIO_STAFF'
                        ? availableActors.find(actor => actor.id === role.actorId)
                        : null;
                    const isSelf = role.actorId === 'PLAYER_SELF';
                    const isStudio = role.actorId === 'STUDIO_STAFF';
                    const isConnection = role.actorId && !assignedActor && !isSelf && !isStudio;
                    const connection = isConnection
                        ? player.relationships.find(relationship => (relationship.npcId || relationship.id) === role.actorId)
                        : null;
                    const selectedCharacterOption = getRoleCharacterOption(role);
                    const selectedCharacterValue = getRoleCharacterOptionValue(role);
                    const isKnownRole = Boolean(selectedCharacterOption) || isKnownConnectedRole(role);
                    const usedCharacterValues = new Set(
                        castList
                            .filter(otherRole => otherRole.id !== role.id)
                            .map(getRoleCharacterOptionValue)
                            .filter(Boolean),
                    );
                    const availableCharacterOptions = linkedCharacterOptions.filter(character => {
                        const value = getCharacterOptionValue(character);
                        return value === selectedCharacterValue || !usedCharacterValues.has(value);
                    });
                    const activeAvailableCharacterOptions = availableCharacterOptions.filter(character => !character.legacyArchive);
                    const legacyAvailableCharacterOptions = availableCharacterOptions.filter(character => character.legacyArchive);
                    const characterFlowHelp = allowsOutsideConnectedCharacters
                        ? 'Crossover/Event: choose from this project plus other owned connected IP.'
                        : previousCharacterOptions.length > 0
                            ? 'Sequel: continuing characters from the previous movie or franchise.'
                            : activeUniverseId
                                ? 'Universe: choose characters from the selected universe.'
                                : showLegacyCharacterArchive
                                    ? 'Legacy Archive: retired-universe names are opt-in and will create comeback buzz.'
                                    : 'Standalone: name a new character for this movie.';
                    const returningData = role.actorId
                        ? currentReturningTalent.find(talent => talent.id === role.actorId && (talent.role === 'LEAD_ACTOR' || talent.role === 'SUPPORTING_ACTOR'))
                        : null;
                    const talentScore = isSelf
                        ? Math.round(playerActingTalent || 0)
                        : isStudio
                            ? getInHouseQuality('ACTOR')
                            : assignedActor
                                ? Math.round(assignedActor.stats.talent || 50)
                                : role.actorId
                                    ? 45
                                    : null;
                    const fameScore = isSelf
                        ? Math.round(player.stats.fame || 0)
                        : isStudio
                            ? getInHouseFame('ACTOR')
                            : assignedActor
                                ? Math.round(assignedActor.stats.fame || 0)
                                : role.actorId
                                    ? 15
                                    : null;
                    const feeDisplay = isSelf || isStudio
                        ? 'Free'
                        : role.actorId && contractedActors.some(actor => actor.id === role.actorId)
                            ? 'Contracted'
                            : returningData && requiresReturningTalentNegotiation(returningData)
                                ? 'Needs Deal'
                                : returningData && !returningData.accepted && (returningData.attemptsLeft ?? 0) === 0
                                    ? 'Walked Away'
                                    : formatFee(role.salary || 0);

                    /* #269: what the row shows without opening the form */
                    const isOpen = openRoleId === role.id;
                    const identity = { ...getSuggestedIdentity(role, index), ...role } as CharacterIdentityProfile;
                    const roleFit = selectedStoryCompass
                        ? evaluateCharacterProfileFit(selectedStoryCompass, identity, (role.roleType === 'EXTRA' ? 'CAMEO' : role.roleType) as RoleType)
                        : null;

                    return (
                        <div key={role.id} className="relative overflow-hidden bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3.5 animate-in slide-in-from-bottom-2">
                            <button
                                type="button"
                                onClick={() => onRemoveRole(role.id)}
                                className="absolute top-1.5 right-1.5 grid h-11 w-11 place-items-center text-zinc-600 hover:text-rose-500 transition-colors z-10"
                                title="Remove Role"
                                aria-label="Remove role"
                            >
                                <X size={16} />
                            </button>

                            <div className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-3 pr-8">
                                <div className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border overflow-hidden ${assignedActor || isSelf || isStudio || connection ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                                    {isSelf ? (
                                        <div className="w-full h-full bg-amber-500/10 flex items-center justify-center overflow-hidden">
                                            {player.avatar
                                                ? <img src={player.avatar} alt="Your actor portrait" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                : <Crown size={20} className="text-amber-500" />}
                                        </div>
                                    ) : isStudio ? (
                                        <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                                            <Users size={20} className="text-emerald-500" />
                                        </div>
                                    ) : connection ? (
                                        <img src={connection.image} alt={role.actorName || 'Connected actor'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : assignedActor ? (
                                        <img src={assignedActor.avatar} alt={assignedActor.name || 'Selected actor'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <Users size={20} />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <select
                                                value={role.roleType || 'SUPPORTING'}
                                                onChange={event => onRoleTypeChange(role.id, event.target.value as GreenlightCastRole['roleType'])}
                                                className="bg-black/50 border border-zinc-800 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-emerald-500 hover:border-zinc-700 transition-colors cursor-pointer"
                                                onClick={event => event.stopPropagation()}
                                            >
                                                <option value="LEAD">Lead Role</option>
                                                <option value="SUPPORTING">Supporting</option>
                                                <option value="CAMEO">Cameo</option>
                                                <option value="EXTRA">Extra</option>
                                            </select>
                                            {returningData && <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-[9px] font-black uppercase tracking-widest">Returning</span>}
                                            {isKnownRole && <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-[9px] font-black uppercase tracking-widest">Known Character</span>}
                                        </div>
                                    {role.actorId ? (
                                            <div className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
                                                {role.actorName || 'Selected Actor'}
                                            </div>
                                        ) : (
                                            <div className="text-base sm:text-xl font-black text-zinc-500 italic">Pending Audition</div>
                                        )}
                                        {isMissingMovieActorProfile(role.actorId, player.flags.extraNPCs || []) && <p className="mt-2 text-xs leading-relaxed text-amber-200">Profile unavailable. Restore a verified backup or choose another actor to continue with this role.</p>}
                                    <p className="mt-0.5 truncate text-[11px] italic text-zinc-300">{role.characterName ? `as ${role.characterName}` : 'Character not named yet'}</p>
                                </div>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.08em]">
                                <span className="rounded-md border border-zinc-800 bg-black/40 px-2 py-1 text-zinc-300">{getCharacterIdentityOption('storyFunction', identity.storyFunction).label}</span>
                                <span className="rounded-md border border-zinc-800 bg-black/40 px-2 py-1 text-zinc-300">{getCharacterIdentityOption('storyRole', identity.storyRole).label}</span>
                                {roleFit && (
                                    <span className={`rounded-md border px-2 py-1 ${roleFit.label === 'NATURAL_FIT' ? 'border-emerald-400/30 text-emerald-300' : roleFit.label === 'BOLD_INTERPRETATION' ? 'border-amber-400/30 text-amber-200' : 'border-rose-400/30 text-rose-300'}`}>Fit {roleFit.score}</span>
                                )}
                            </div>

                            <div className="mt-2.5">
                                {role.actorId && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                ['Talent', talentScore, 'text-emerald-300'],
                                                ['Fame', fameScore, 'text-rose-300'],
                                                ['Fee', feeDisplay, returningData && requiresReturningTalentNegotiation(returningData) ? 'text-purple-300' : 'text-amber-300'],
                                            ].map(([label, value, color]) => (
                                                <div key={String(label)} className="bg-black/30 border border-zinc-800 rounded-xl px-3 py-2 min-w-0">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                                                    <p className={`text-xs font-black font-mono truncate ${color}`}>{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpenRoleId(isOpen ? null : role.id)}
                                    aria-expanded={isOpen}
                                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-black/30 text-[10px] font-black uppercase tracking-widest text-zinc-300"
                                >
                                    Character <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <div className="flex min-w-0 gap-2">
                                    {returningData && requiresReturningTalentNegotiation(returningData) && role.actorId && (
                                        <button
                                            type="button"
                                            onClick={event => {
                                                event.stopPropagation();
                                                onNegotiate(role.actorId!, returningData, role.id);
                                            }}
                                            className="flex-1 sm:flex-none text-[10px] px-4 py-3 rounded-xl uppercase font-black tracking-widest bg-purple-500/15 text-purple-200 border border-purple-500/25 hover:bg-purple-500/25 transition-all"
                                        >
                                            Negotiate
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onSelectActor(role.id)}
                                        className={`min-h-11 flex-1 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${assignedActor || isSelf || isStudio || connection ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300' : 'border-emerald-300 bg-emerald-500 text-black shadow-[0_0_18px_rgba(16,185,129,0.35)]'}`}
                                    >
                                        {assignedActor || isSelf || isStudio || connection ? 'Change' : 'Select'}
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="mt-3 space-y-3 border-t border-zinc-800/80 pt-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {linkedCharacterOptions.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <label className="block text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                                        Playing Character
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={onToggleCharacterFlowInfo}
                                                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${showCharacterFlowInfo ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-zinc-700 bg-black/30 text-zinc-500 hover:text-white'}`}
                                                        aria-label="Explain playing character"
                                                    >
                                                        <Info size={11} />
                                                    </button>
                                                    {legacyCharacterOptions.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={onToggleLegacyCharacterArchive}
                                                            className={`h-5 rounded-full border px-2 text-[8px] font-black uppercase tracking-widest transition-colors ${showLegacyCharacterArchive ? 'border-amber-400 bg-amber-400/10 text-amber-200' : 'border-zinc-700 bg-black/30 text-zinc-500 hover:text-white'}`}
                                                            aria-pressed={showLegacyCharacterArchive}
                                                        >
                                                            Legacy
                                                        </button>
                                                    )}
                                                </div>
                                                <select
                                                    value={selectedCharacterValue}
                                                    onChange={event => onCharacterSelectionChange(role.id, event.target.value)}
                                                    onClick={event => event.stopPropagation()}
                                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                                >
                                                    <option value="">Create New Character</option>
                                                    {activeAvailableCharacterOptions.length > 0 && (
                                                        <optgroup label="Active Canon">
                                                            {activeAvailableCharacterOptions.map(character => (
                                                                <option key={getCharacterOptionValue(character)} value={getCharacterOptionValue(character)}>
                                                                    {character.name} {character.actorName ? `(${character.actorName})` : ''} - {character.sourceName}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {showLegacyCharacterArchive && legacyAvailableCharacterOptions.length > 0 && (
                                                        <optgroup label="Legacy Archive">
                                                            {legacyAvailableCharacterOptions.map(character => (
                                                                <option key={getCharacterOptionValue(character)} value={getCharacterOptionValue(character)}>
                                                                    {character.name} {character.actorName ? `(${character.actorName})` : ''} - {character.sourceName}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                                <p className="mt-1 text-[9px] text-zinc-600 leading-snug">{characterFlowHelp}</p>
                                            </div>
                                        )}
                                        <div className={linkedCharacterOptions.length > 0 ? '' : 'sm:col-span-2'}>
                                            <label className="block text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                                {selectedCharacterOption ? 'Character Identity' : 'New Character Name'}
                                            </label>
                                            {selectedCharacterOption ? (
                                                <div className="min-h-[42px] flex items-center justify-between gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2.5">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-blue-100 truncate">{role.characterName || selectedCharacterOption.name}</p>
                                                        <p className={`text-[9px] font-black uppercase tracking-widest truncate ${selectedCharacterOption.legacyArchive ? 'text-amber-300/80' : 'text-blue-300/70'}`}>
                                                            {selectedCharacterOption.legacyArchive ? 'Legacy Archive' : selectedCharacterOption.sourceName}
                                                        </p>
                                                    </div>
                                                    <CheckCircle size={15} className="text-blue-300 shrink-0" />
                                                </div>
                                            ) : (
                                                <input
                                                    value={role.characterName || ''}
                                                    onChange={event => onCharacterNameChange(role.id, event.target.value)}
                                                    onBlur={() => onCharacterNameBlur(role.id, index)}
                                                    onClick={event => event.stopPropagation()}
                                                    placeholder={role.roleType === 'LEAD' ? `e.g. ${scriptTitle || 'Iron Man'}` : getDefaultCharacterName(role, index)}
                                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {selectedStoryCompass && (
                                        <CharacterIdentityControls
                                            value={role}
                                            suggested={getSuggestedIdentity(role, index)}
                                            storyCompass={selectedStoryCompass}
                                            roleType={(role.roleType === 'EXTRA' ? 'CAMEO' : role.roleType) as RoleType}
                                            locked={Boolean(selectedCharacterOption)}
                                            sourceLabel={selectedCharacterOption
                                                ? translate('greenlight.characterIdentity.inherited')
                                                : role.identitySource === 'PLAYER'
                                                    ? 'Custom'
                                                    : translate('greenlight.characterIdentity.autoFilled')}
                                            onChange={patch => onIdentityChange(role.id, patch)}
                                        />
                                    )}
                                    {showCharacterFlowInfo && (
                                        <div className="mt-3 rounded-xl border border-blue-500/20 bg-black/35 p-3">
                                            <p className="text-[10px] leading-relaxed text-zinc-400">
                                                Existing characters can only be used once in this cast. Sequels continue the last movie's characters, universe projects use that universe roster, and outside owned IP appears only for crossover or event plans.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={onAddRole}
                    className="w-full py-5 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-3 group"
                >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors shadow-inner">
                        <Plus size={16} />
                    </div>
                    Add Another Role
                </button>
            </div>

            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-[#020a05] via-[#020a05]/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
                <div className="pointer-events-auto grid w-full max-w-md grid-cols-[0.9fr_1.7fr] gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="min-h-14 rounded-2xl border border-zinc-700 bg-zinc-900/95 px-3 py-4 text-sm font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition-colors hover:bg-zinc-800 active:bg-zinc-800"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={castIncomplete}
                        className={`min-h-14 rounded-2xl px-3 py-4 text-sm font-black uppercase tracking-[0.12em] transition-colors ${castIncomplete ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none' : 'bg-emerald-500 text-black shadow-[0_0_32px_rgba(16,185,129,0.35)] hover:bg-emerald-400 active:bg-emerald-400'}`}
                    >
                        Next: Crew
                    </button>
                </div>
            </div>
        </div>
    );
};
