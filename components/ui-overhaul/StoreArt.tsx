import React, { useId } from 'react';

/* Small pictures for the Store, so every item shows what it is (Zeesh, 2026-11-08:
   "visually thoda lage ki kya item hai"). Drawn in code, one family, 64-unit grid. */

const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

const Bolt: React.FC<{ x: number; y: number; s: number; fill: string; opacity?: number }> = ({ x, y, s, fill, opacity = 1 }) => (
    <path transform={`translate(${x} ${y}) scale(${s})`} d="M13 0 2 16h8l-3 14L20 12h-8L15 0Z" fill={fill} opacity={opacity} />
);

/** 1 to 4 bolts, brighter as the pack grows. */
export const EnergyArt: React.FC<{ level: number; size?: number }> = ({ level, size = 64 }) => {
    const uid = useUid();
    const fill = `url(#e${uid})`;
    const n = Math.max(1, Math.min(4, level));
    const spots = [[[22, 14, 1]], [[12, 16, .9], [32, 12, .9]], [[6, 20, .78], [22, 10, .86], [38, 20, .78]], [[4, 22, .7], [18, 10, .78], [32, 10, .78], [46, 22, .7]]][n - 1];
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <defs>
                <radialGradient id={`g${uid}`} cx=".5" cy=".55" r=".5"><stop offset="0" stopColor="#f8c020" stopOpacity=".45" /><stop offset="1" stopColor="#f8c020" stopOpacity="0" /></radialGradient>
                <linearGradient id={`e${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a0" /><stop offset=".5" stopColor="#f8c020" /><stop offset="1" stopColor="#e89000" /></linearGradient>
            </defs>
            <circle cx="32" cy="34" r={18 + n * 3} fill={`url(#g${uid})`} />
            {spots.map(([x, y, s], index) => <Bolt key={index} x={x} y={y} s={s * (1.05 + n * .04)} fill={fill} />)}
        </svg>
    );
};

/** 1 to 5 stacks of notes. */
export const CashArt: React.FC<{ level: number; size?: number }> = ({ level, size = 64 }) => {
    const uid = useUid();
    const n = Math.max(1, Math.min(5, level));
    const stacks = Array.from({ length: n }, (_, index) => index);
    const width = n > 3 ? 26 : 30;
    const left = 32 - ((n - 1) * 6 + width) / 2;
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <defs>
                <linearGradient id={`c${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9ff2c8" /><stop offset=".55" stopColor="#52e0a0" /><stop offset="1" stopColor="#1f9e69" /></linearGradient>
                <radialGradient id={`h${uid}`} cx=".5" cy=".6" r=".5"><stop offset="0" stopColor="#52e0a0" stopOpacity=".35" /><stop offset="1" stopColor="#52e0a0" stopOpacity="0" /></radialGradient>
            </defs>
            <circle cx="32" cy="38" r="26" fill={`url(#h${uid})`} />
            {stacks.map(index => {
                const height = 14 + index * 5;
                const x = left + index * 6;
                const y = 50 - height;
                return (
                    <g key={index}>
                        {Array.from({ length: Math.ceil(height / 4) }, (_, layer) => (
                            <rect key={layer} x={x} y={50 - (layer + 1) * 4} width={width} height={3.4} rx={1.2} fill={`url(#c${uid})`} opacity={.55 + layer * .08} />
                        ))}
                        <rect x={x} y={y - 6} width={width} height={6} rx={1.6} fill={`url(#c${uid})`} />
                        <circle cx={x + width / 2} cy={y - 3} r={1.8} fill="#0e3a26" opacity=".7" />
                    </g>
                );
            })}
        </svg>
    );
};

/** No Ads: a shield over a crossed-out ad. */
export const NoAdsArt: React.FC<{ size?: number }> = ({ size = 64 }) => {
    const uid = useUid();
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <defs><linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fe0ff" /><stop offset="1" stopColor="#2a8fd8" /></linearGradient></defs>
            <circle cx="32" cy="32" r="28" fill="#4cc9ff" opacity=".12" />
            <path d="M32 8 50 15v14c0 12-8 21-18 25-10-4-18-13-18-25V15Z" fill={`url(#s${uid})`} />
            <rect x="21" y="25" width="22" height="14" rx="3" fill="#0b2340" opacity=".85" />
            <text x="32" y="35.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#8fe0ff" fontFamily="-apple-system, Inter, sans-serif">AD</text>
            <path d="M19 41 45 23" stroke="#ff5c5c" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
    );
};

const COLLECTION_GLYPH: Record<string, string> = {
    home: 'M12 34 32 17l20 17v17a2 2 0 0 1-2 2H39V40H25v13H14a2 2 0 0 1-2-2Z',
    car: 'M10 40v-6l6-10h28l8 10h2v12h-4a5 5 0 0 1-10 0H24a5 5 0 0 1-10 0h-4Zm10-7h26l-5-6H21Z',
    yacht: 'M8 42h48l-6 9H14Zm8-4 16-24v24Zm20 0V22l12 16Z',
    crown: 'M10 22l11 9 11-15 11 15 11-9-5 25H15Zm6 28h32v4H16Z',
};

/** A collection's picture: a home, a car, a yacht or a crown. */
export const CollectionArt: React.FC<{ kind: 'home' | 'car' | 'yacht' | 'crown'; size?: number }> = ({ kind, size = 64 }) => {
    const uid = useUid();
    const tone = kind === 'crown' ? ['#ffe9a0', '#e89000'] : kind === 'yacht' ? ['#b8ecff', '#3aa0d8'] : ['#e8c8ff', '#9b55e0'];
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <defs><linearGradient id={`k${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tone[0]} /><stop offset="1" stopColor={tone[1]} /></linearGradient></defs>
            <circle cx="32" cy="34" r="27" fill={tone[1]} opacity=".14" />
            <path d={COLLECTION_GLYPH[kind]} fill={`url(#k${uid})`} />
        </svg>
    );
};

/** A reward card's corner: a play button, so an ad is always plainly an ad. */
export const PlayBadge: React.FC<{ size?: number }> = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#f9f6ef" />
        <path d="M10 7.8 16.4 12 10 16.2Z" fill="#141210" />
    </svg>
);

/** Wellness: four stat rings filling to 90. */
export const WellnessArt: React.FC<{ size?: number }> = ({ size = 56 }) => {
    const rings = [['#ff5c7a', 22], ['#35e0a8', 17], ['#c77dff', 12], ['#ff9a3c', 7]] as const;
    return (
        <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
            {rings.map(([color, radius]) => {
                const length = 2 * Math.PI * radius;
                return (
                    <g key={color}>
                        <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeOpacity=".18" strokeWidth="3.6" />
                        <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round"
                            strokeDasharray={`${length * .9} ${length}`} transform="rotate(-90 28 28)" />
                    </g>
                );
            })}
        </svg>
    );
};

/** Skill: a script with a star. Genre: a clapperboard. */
export const SkillArt: React.FC<{ size?: number }> = ({ size = 56 }) => (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="25" fill="#7c7cff" opacity=".14" />
        <rect x="14" y="12" width="24" height="32" rx="3" fill="#a6a6ff" />
        <path d="M19 20h14M19 26h14M19 32h9" stroke="#2b2b6e" strokeWidth="2.4" strokeLinecap="round" />
        <path d="m41 30 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8Z" fill="#f8c020" />
    </svg>
);

export const GenreArt: React.FC<{ size?: number }> = ({ size = 56 }) => (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="25" fill="#c77dff" opacity=".14" />
        <rect x="11" y="24" width="34" height="20" rx="3" fill="#d9a8ff" />
        <path d="m11 17 32-6 1.6 8-32 6Z" fill="#f9f6ef" />
        <path d="m17 15.8 4 6.6M25 14.3l4 6.6M33 12.8l4 6.6" stroke="#141210" strokeWidth="2.6" />
        <path d="M17 32h22M17 37h14" stroke="#4b1f7a" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
);
