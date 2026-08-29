import React from 'react';

export const STREAMING_BRAND_MARKS: Record<string, { label: string; group: string; svg: React.ReactNode }> = {
    BOLT: {
        label: 'Strike', group: 'Geometric',
        svg: <path d="M27 4 10 27h11l-2 17 19-25H26l1-15z" fill="currentColor" />,
    },
    ORBIT: {
        label: 'Orbit', group: 'Geometric',
        svg: <g fill="none" stroke="currentColor" strokeWidth="3.4"><circle cx="24" cy="24" r="9.5" /><ellipse cx="24" cy="24" rx="20" ry="7.5" transform="rotate(-24 24 24)" /></g>,
    },
    PRISM: {
        label: 'Prism', group: 'Geometric',
        svg: <g fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round"><path d="M24 5 43 39H5Z" /><path d="M24 5v34" opacity=".5" /></g>,
    },
    PULSE: {
        label: 'Pulse', group: 'Geometric',
        svg: <path d="M4 24h8l4-12 8 24 5-16 3 4h12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />,
    },
    APERTURE: {
        label: 'Aperture', group: 'Emblem',
        svg: <g fill="none" stroke="currentColor" strokeWidth="3"><circle cx="24" cy="24" r="17" /><path d="M24 7 33 22M41 24 24 24M33 39 24 24M15 39 24 24M7 24 24 24M15 9 24 24" opacity=".85" /></g>,
    },
    SIGNALTOWER: {
        label: 'Tower', group: 'Emblem',
        svg: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="24" cy="17" r="4" fill="currentColor" stroke="none" /><path d="M16 9a11 11 0 0 0 0 16M32 9a11 11 0 0 1 0 16M10 3a19 19 0 0 0 0 28M38 3a19 19 0 0 1 0 28" /><path d="M24 21 20 44h8L24 21z" fill="currentColor" stroke="none" /></g>,
    },
    CROWN: {
        label: 'Crown', group: 'Emblem',
        svg: <path d="M6 34 5 13l10 8 9-14 9 14 10-8-1 21z" fill="currentColor" />,
    },
    MONOLITH: {
        label: 'Monolith', group: 'Abstract',
        svg: <g fill="currentColor"><rect x="14" y="6" width="8" height="36" rx="2" /><rect x="26" y="14" width="8" height="28" rx="2" opacity=".6" /></g>,
    },
    RIFT: {
        label: 'Rift', group: 'Abstract',
        svg: <path d="M18 4 30 4 24 22 34 22 18 44 22 26 12 26z" fill="currentColor" />,
    },
    ECLIPSE: {
        label: 'Eclipse', group: 'Abstract',
        svg: <g><circle cx="24" cy="24" r="18" fill="currentColor" /><circle cx="32" cy="18" r="14" fill="var(--streaming-mark-cutout, #07070c)" /></g>,
    },
    NETFLIX_N: {
        label: 'Netflix N treatment', group: 'Real platform',
        svg: <g fill="currentColor"><path d="M10 5h9v38h-9z" /><path d="M29 5h9v38h-9z" /><path d="M10 5h9l19 38h-9z" opacity=".88" /></g>,
    },
    YOUTUBE_PLAY: {
        label: 'YouTube play treatment', group: 'Real platform',
        svg: <g><rect x="3" y="10" width="42" height="28" rx="9" fill="currentColor" /><path d="m21 18 11 6-11 6z" fill="var(--platform-brand-on-primary, #fff)" /></g>,
    },
    PRIME_SMILE: {
        label: 'Prime smile treatment', group: 'Real platform',
        svg: <g fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18c8 12 22 15 34 6" /><path d="m34 22 7 2-3 7" /></g>,
    },
};

export const STREAMING_BRAND_LETTERFORMS = ['SOLID', 'OUTLINE', 'SLAB'] as const;

export const renderStreamingBrandLetterMark = (initial: string, style: string): React.ReactNode => {
    if (style === 'OUTLINE') return (
        <g><rect x="4" y="4" width="40" height="40" rx="11" fill="none" stroke="currentColor" strokeWidth="3.2" /><text x="24" y="24" textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="900" fill="currentColor" fontFamily="Inter,Helvetica,Arial">{initial}</text></g>
    );
    if (style === 'SLAB') return (
        <g><rect x="4" y="10" width="40" height="28" rx="4" fill="currentColor" /><text x="24" y="24" textAnchor="middle" dominantBaseline="central" fontSize="21" fontWeight="900" fill="var(--platform-brand-on-primary, #07070c)" fontFamily="Georgia,serif">{initial}</text></g>
    );
    return (
        <g><rect x="4" y="4" width="40" height="40" rx="12" fill="currentColor" /><text x="24" y="24" textAnchor="middle" dominantBaseline="central" fontSize="25" fontWeight="900" fill="var(--platform-brand-on-primary, #07070c)" fontFamily="Inter,Helvetica,Arial">{initial}</text></g>
    );
};

interface StreamingBrandMarkGlyphProps {
    name: string;
    markId: string;
    className?: string;
}

export function StreamingBrandMarkGlyph({ name, markId, className }: StreamingBrandMarkGlyphProps) {
    const initial = (name.trim()[0] || 'E').toUpperCase();
    const inner = markId.startsWith('LETTER_')
        ? renderStreamingBrandLetterMark(initial, markId.replace('LETTER_', ''))
        : STREAMING_BRAND_MARKS[markId]?.svg
            ?? renderStreamingBrandLetterMark(initial, 'OUTLINE');
    return (
        <svg
            className={className}
            viewBox="0 0 48 48"
            aria-hidden="true"
            data-platform-mark={markId}
            style={{ width: '100%', height: '100%' }}
        >
            {inner}
        </svg>
    );
}
