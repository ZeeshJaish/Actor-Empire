import React from 'react';
import { Lock, Music, Star } from 'lucide-react';
import PersonFace from '../streaming-transplant/PersonFace';
import { PinnedBar } from './CommissionDealAndGo';

/**
 * #285: on a pitch, each Greenlight step is an overview of what the studio chose: the choice, its face, its price.
 * They read like the real screens, and there is nothing to press but Next and Skip to Deal.
 */

const money = (value: number) => (value >= 1_000_000_000
    ? `$${(value / 1_000_000_000).toFixed(1)}B`
    : value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : value > 0
            ? `$${Math.round(value / 1_000)}K`
            : '$0');

export const LockedShell: React.FC<{
    studioName: string;
    nextLabel: string;
    onBack: () => void;
    onNext: () => void;
    onSkip: () => void;
    children: React.ReactNode;
}> = ({ studioName, nextLabel, onBack, onNext, onSkip, children }) => (
    <div data-locked-step className="space-y-2.5 px-4 pb-44 pt-4">
        <div data-locked-banner className="flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2 text-[11px] font-bold text-violet-100">
            <Lock size={12} className="shrink-0" /> {studioName} chose this. You can see it, not change it.
        </div>
        {children}
        <PinnedBar onBack={onBack} nextLabel={nextLabel} onNext={onNext} skip={onSkip} />
    </div>
);

const Face: React.FC<{ name: string; gender?: any; size?: string }> = ({ name, gender, size = 'h-11 w-11' }) => (
    <span className={`block ${size} shrink-0 overflow-hidden rounded-full border border-white/15 bg-zinc-800`}>
        <PersonFace name={name} gender={gender} className="h-full w-full object-cover object-top" />
    </span>
);

export const LockedDirector: React.FC<{
    name: string;
    gender?: any;
    tier: string;
    talent: number;
    fame: number;
    fee: number;
    why: string;
    specialty?: string;
}> = ({ name, gender, tier, talent, fame, fee, why, specialty }) => (
    <>
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
            <Face name={name} gender={gender} size="h-24 w-24" />
            <h2 className="mt-2 text-lg font-black uppercase leading-tight">{name}</h2>
            <span className="mt-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-rose-200">{tier.replace(/_/g, ' ')}</span>
            {specialty && <p className="mt-1.5 text-xs font-semibold text-zinc-400">{specialty}</p>}
            <div className="mt-3 grid w-full grid-cols-3 gap-2">
                {[['Talent', String(talent)], ['Fame', String(fame)], ['Fee', money(fee)]].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-black/30 p-2">
                        <div className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-500">{label}</div>
                        <div className="font-mono text-sm font-black">{value}</div>
                    </div>
                ))}
            </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Why this director</div>
            <p className="text-sm font-medium leading-relaxed text-zinc-300">{why}</p>
        </div>
    </>
);

export interface LockedRole {
    id: string;
    name: string;
    gender?: any;
    character?: string;
    functionLabel: string;
    fee: number;
    fit: number;
}

export const LockedCast: React.FC<{
    dna: Array<{ label: string; value: string }>;
    balance?: number;
    roles: LockedRole[];
}> = ({ dna, balance, roles }) => (
    <>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">Script DNA</div>
            <div className="grid grid-cols-3 gap-1.5">
                {dna.map(item => (
                    <div key={item.label} className="min-w-0 rounded-lg bg-black/30 p-2">
                        <div className="text-[7px] font-black uppercase tracking-[0.1em] text-zinc-500">{item.label}</div>
                        <div className="text-[11px] font-black leading-tight">{item.value}</div>
                    </div>
                ))}
                {balance !== undefined && (
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-2">
                        <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-200">Balance</div>
                        <div className="font-mono text-sm font-black text-emerald-200">{balance}</div>
                    </div>
                )}
            </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Roles</div>
            <div className="space-y-2">
                {roles.map(role => (
                    <div key={role.id} data-locked-role className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5">
                        <Face name={role.name} gender={role.gender} />
                        <span className="min-w-0">
                            <span className="block text-sm font-black leading-tight">{role.name}</span>
                            {role.character && <span className="block text-[11px] font-semibold leading-tight text-zinc-300">as {role.character}</span>}
                            <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-zinc-500">{role.functionLabel}</span>
                        </span>
                        <span className="text-right">
                            <span className="block font-mono text-xs font-black text-amber-300">{money(role.fee)}</span>
                            <span className="block text-[9px] font-black text-emerald-300">Fit {role.fit}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    </>
);

export const LockedCrew: React.FC<{
    crew: Array<{ id: string; name: string; gender?: any; role: string; talent: number; fee: number }>;
    background: { title: string; line: string; cost: number };
}> = ({ crew, background }) => (
    <>
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {crew.map(person => (
                <div key={person.id} data-locked-crew className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5">
                    <Face name={person.name} gender={person.gender} />
                    <span className="min-w-0">
                        <span className="block text-sm font-black leading-tight">{person.name}</span>
                        <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-zinc-500">{person.role} · <span className="text-emerald-300">Talent {person.talent}</span></span>
                    </span>
                    <span className="font-mono text-xs font-black text-amber-300">{money(person.fee)}</span>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <span className="min-w-0">
                <span className="block text-sm font-black leading-tight">{background.title}</span>
                <span className="block text-[11px] font-semibold text-zinc-400">{background.line}</span>
            </span>
            <span className="font-mono text-xs font-black text-amber-300">{money(background.cost)}</span>
        </div>
    </>
);

export const LockedGear: React.FC<{
    gear: Array<{ id: string; icon: string; title: string; name: string; desc: string; cost: number }>;
    qualityLine: string;
}> = ({ gear, qualityLine }) => (
    <>
        {gear.map(item => (
            <div key={item.id} data-locked-gear className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/30 text-lg">{item.icon}</span>
                <span className="min-w-0">
                    <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">{item.title}</span>
                    <span className="block text-sm font-black leading-tight">{item.name}</span>
                    <span className="block text-[11px] font-semibold text-zinc-400">{item.desc}</span>
                </span>
                <span className="font-mono text-xs font-black text-amber-300">{money(item.cost)}</span>
            </div>
        ))}
        <p className="text-center text-[11px] font-semibold text-zinc-500">{qualityLine}</p>
    </>
);

export const LockedLocations: React.FC<{
    map?: React.ReactNode;
    regionLine: string;
    places: Array<{ id: string; name: string; desc: string; country: string; cost: number }>;
}> = ({ map, regionLine, places }) => (
    <>
        <div className="overflow-hidden rounded-2xl border border-sky-200/20 bg-sky-400/[0.06] p-3">
            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.12em] text-sky-200">{regionLine}</div>
            {map}
        </div>
        {places.map(place => (
            <div key={place.id} data-locked-place className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="min-w-0">
                    <span className="block text-sm font-black leading-tight">{place.name}</span>
                    <span className="block text-[11px] font-semibold leading-snug text-zinc-400">{place.country} · {place.desc}</span>
                </span>
                <span className="font-mono text-xs font-black text-amber-300">{money(place.cost)}</span>
            </div>
        ))}
    </>
);

export const LockedSetupTiles: React.FC<{
    look: string;
    pacing: string;
    effects: string;
    soundtrack: string;
    music?: Array<{ id: string; name: string; gender?: any; kind: string; fee: number }>;
}> = ({ look, pacing, effects, soundtrack, music }) => (
    <>
        <div className="grid grid-cols-2 gap-2">
            {[['Look', look], ['Pacing', pacing], ['Effects', effects], ['Soundtrack', soundtrack]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</div>
                    <div className="mt-0.5 text-sm font-black leading-tight">{value}</div>
                </div>
            ))}
        </div>
        {music && music.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.04] p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">Music</div>
                {music.map(item => (
                    <div key={item.id} data-locked-music className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5">
                        {item.gender === 'MALE' || item.gender === 'FEMALE'
                            ? <Face name={item.name} gender={item.gender} size="h-10 w-10" />
                            : <span className="grid h-10 w-10 place-items-center rounded-full bg-cyan-400/10 text-cyan-200"><Music size={16} /></span>}
                        <span className="min-w-0">
                            <span className="block text-sm font-black leading-tight">{item.name}</span>
                            <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-zinc-500">{item.kind}</span>
                        </span>
                        <span className="font-mono text-xs font-black text-cyan-300">{money(item.fee)}</span>
                    </div>
                ))}
            </div>
        )}
    </>
);

export const LockedScriptQuality: React.FC<{ quality: number }> = ({ quality }) => (
    <span className="inline-flex items-center gap-1 font-mono text-amber-300"><Star size={10} className="fill-amber-300" /> {quality}/100</span>
);
