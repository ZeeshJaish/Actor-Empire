import React from 'react';
import '../styles/content-market-one-sheet.css';

const hueFor = (seed: string) => [...seed].reduce((sum, char) => sum + char.charCodeAt(0) * 7, 0) % 360;

const titleLines = (title: string) => {
    const lines: string[] = [];
    let line = '';
    title.toUpperCase().split(/\s+/).forEach(word => {
        if (`${line} ${word}`.trim().length > 12 && line) {
            lines.push(line);
            line = word;
        } else line = `${line} ${word}`.trim();
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
};

export default function ContentMarketOneSheet({ seed, title, genre, variant = 'card' }: {
    seed: string;
    title: string;
    genre: string;
    variant?: 'card' | 'hero';
}) {
    const hue = hueFor(seed);
    const upperGenre = genre.toUpperCase();
    const isOrbit = upperGenre.includes('SCI') || upperGenre.includes('FANTASY');
    const isThreat = upperGenre.includes('THRILL') || upperGenre.includes('HORROR') || upperGenre.includes('CRIME');
    const isWarm = upperGenre.includes('ROMANCE') || upperGenre.includes('COMEDY');
    return <span className={`cm-one-sheet cm-one-sheet-${variant}`} aria-hidden="true">
        <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id={`cm-sheet-${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={`hsl(${hue} 64% 36%)`} /><stop offset="60%" stopColor={`hsl(${(hue + 15) % 360} 54% 14%)`} /><stop offset="100%" stopColor={`hsl(${(hue + 22) % 360} 44% 5%)`} /></linearGradient>
                <radialGradient id={`cm-light-${seed}`} cx="48%" cy="30%" r="64%"><stop offset="0%" stopColor={`hsl(${(hue + 340) % 360} 90% 72%)`} stopOpacity=".56" /><stop offset="100%" stopColor={`hsl(${hue} 60% 18%)`} stopOpacity="0" /></radialGradient>
            </defs>
            <rect width="100" height="150" fill={`url(#cm-sheet-${seed})`} /><rect width="100" height="150" fill={`url(#cm-light-${seed})`} />
            {isOrbit ? <g><circle cx="50" cy="94" r="38" fill={`hsl(${(hue + 20) % 360} 45% 7%)`} /><ellipse cx="50" cy="94" rx="42" ry="24" fill="none" stroke={`hsl(${(hue + 330) % 360} 90% 72%)`} strokeWidth="1.2" opacity=".72" transform="rotate(-17 50 94)" /><circle cx="69" cy="37" r="4" fill="#fff1bd" opacity=".88" /></g>
                : isThreat ? <g><path d="M44 0H58L76 105H28Z" fill={`hsl(${(hue + 330) % 360} 90% 78%)`} opacity=".19" /><ellipse cx="50" cy="105" rx="28" ry="5" fill="#000" opacity=".35" /><path d="M50 104V84M46 91L50 84L54 91" stroke="#07070a" strokeWidth="3.4" strokeLinecap="round" /><circle cx="50" cy="80" r="3.2" fill="#07070a" /></g>
                : isWarm ? <g><circle cx="39" cy="55" r="25" fill={`hsl(${(hue + 340) % 360} 92% 72%)`} opacity=".38" /><circle cx="63" cy="65" r="27" fill={`hsl(${(hue + 28) % 360} 88% 67%)`} opacity=".36" /></g>
                : <g><circle cx="58" cy="51" r="17" fill={`hsl(${(hue + 332) % 360} 88% 74%)`} opacity=".48" /><rect y="96" width="100" height="54" fill="#050609" opacity=".74" /><path d="M0 98Q24 89 50 97T100 94V102H0Z" fill="#050609" /></g>}
        </svg>
        <i className="cm-one-sheet-grain" /><i className="cm-one-sheet-shade" />
        <span className="cm-one-sheet-title"><i />{titleLines(title).map((line, index) => <b key={`${line}-${index}`}>{line}</b>)}</span>
        <span className="cm-one-sheet-billing">CASTING BY · MUSIC BY · EDITED BY<br />PRODUCED BY · WRITTEN BY · DIRECTED BY</span>
    </span>;
}
