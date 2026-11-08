import React, { useEffect, useState, useSyncExternalStore } from 'react';
import css from './StreamingPlus.module.css';
import { CampaignScene } from '../campaigns/scenes/CampaignScene';
import { CAMPAIGN_SCENES, type DronesScene } from '../campaigns/scenes/sceneCatalogue';
import { getStreamingPlusOwnedNow, openStreamingPlusSheet, subscribeStreamingPlusOwned, type StreamingPlusSheetRequest } from '../../services/streamingPlusEvents';

/** Whether the player owns the Streaming+ Pack, for screens that do not get the player. */
export const useStreamingPlusOwned = (): boolean => useSyncExternalStore(subscribeStreamingPlusOwned, getStreamingPlusOwnedNow, () => false);

/** "Included in the Streaming+ Pack when they arrive." (Products and the Deal Room; no date, no price) */
export const StreamingPlusLaterLine: React.FC<{ what: 'they' | 'it'; className?: string }> = ({ what, className }) => {
    const owned = useStreamingPlusOwned();
    const text = `Included in ${owned ? 'your' : 'the'} Streaming+ Pack when ${what === 'they' ? 'they arrive' : 'it arrives'}.`;
    return owned
        ? <p className={className} data-streaming-plus-later><StreamingPlusChip owned />{' '}{text}</p>
        : (
            <p className={className} data-streaming-plus-later>
                <button type="button" className={css.chipButton} style={{ minHeight: 32, padding: 0, verticalAlign: 'middle' }}
                    onClick={() => openStreamingPlusSheet({ source: 'later-line', focus: 'products', line: text })} aria-label={`${text} See the Streaming+ Pack`}>
                    <StreamingPlusChip />
                </button>{' '}{text}
            </p>
        );
};

/* ---- icons (one stroke family, 24-unit grid) ---- */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const StreamingPlusIcon: React.FC<{ id: string; size?: number }> = ({ id, size = 20 }) => {
    const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
    switch (id) {
        case 'cities': return <svg {...common}><path {...stroke} d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle {...stroke} cx="12" cy="10" r="2.4" /></svg>;
        case 'servers': return <svg {...common}><rect {...stroke} x="4" y="3.5" width="16" height="7" rx="1.8" /><rect {...stroke} x="4" y="13.5" width="16" height="7" rx="1.8" /><path {...stroke} d="M8 7h.01M8 17h.01M12 7h5M12 17h5" /></svg>;
        case 'tech': return <svg {...common}><rect {...stroke} x="6.5" y="6.5" width="11" height="11" rx="2" /><path {...stroke} d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21" /><path {...stroke} d="M10 12h4" /></svg>;
        case 'company': return <svg {...common}><path {...stroke} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" /><path {...stroke} d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>;
        case 'campaigns': return <svg {...common}><path {...stroke} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle {...stroke} cx="12" cy="12" r="2.6" /></svg>;
        case 'brand': return <svg {...common}><rect {...stroke} x="3.5" y="4" width="17" height="16" rx="2.4" /><path {...stroke} d="M3.5 9h17M9 9v11" /></svg>;
        case 'products': return <svg {...common}><rect {...stroke} x="3" y="5" width="18" height="12" rx="2.4" /><path {...stroke} d="m10.5 8.6 4 2.4-4 2.4Z" /><path {...stroke} d="M8 21h8" /></svg>;
        case 'deal-room': return <svg {...common}><path {...stroke} d="m4 12 4-4 3 2 3-2 6 4-6 6-3-2-3 2Z" /><path {...stroke} d="M8 8 5 5M16 8l3-3" /></svg>;
        case 'check': return <svg {...common}><path {...stroke} strokeWidth={2.4} d="m5 12.5 4.2 4.2L19 7" /></svg>;
        case 'lock': return <svg {...common}><rect {...stroke} x="5" y="10.5" width="14" height="10" rx="2.2" /><path {...stroke} d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>;
        case 'close': return <svg {...common}><path {...stroke} strokeWidth={2.2} d="M6 6l12 12M18 6 6 18" /></svg>;
        case 'plus': return <svg {...common}><path {...stroke} strokeWidth={3} d="M12 5v14M5 12h14" /></svg>;
        default: return <svg {...common}><circle {...stroke} cx="12" cy="12" r="7" /></svg>;
    }
};

/** The gold label on a pack item. `dim` for a quiet place (a list row) next to brighter content. */
export const StreamingPlusChip: React.FC<{ dim?: boolean; label?: string; className?: string; owned?: boolean; compact?: boolean }> = ({ dim, label = 'STREAMING+', className, owned, compact }) => (
    <span className={`${css.chip}${dim ? ` ${css.chipDim}` : ''}${compact ? ` ${css.chipCompact}` : ''}${className ? ` ${className}` : ''}`} data-streaming-plus-chip={owned ? 'owned' : ''}>
        <StreamingPlusIcon id={owned ? 'check' : 'lock'} size={9} />{label}
    </span>
);

/** A chip that opens the one sheet. Use where the chip itself is the control. */
export const StreamingPlusChipButton: React.FC<{ request: StreamingPlusSheetRequest; dim?: boolean; label?: string }> = ({ request, dim, label }) => (
    <button
        type="button"
        className={css.chipButton}
        aria-label={`${request.line || 'Part of the Streaming+ Pack'}. See the Streaming+ Pack`}
        onClick={event => { event.stopPropagation(); openStreamingPlusSheet(request); }}
    >
        <StreamingPlusChip dim={dim} label={label} />
    </button>
);

/* ---- the moving preview: the pack's own drone show writes its name over a real city at night ----
   (Zeesh, 2026-11-08: the first drawing "ekdum kharab hai"). The game's campaign scene draws it: the
   waterfront skyline, and the drones of the Drone show, one of the pack's big moments, spelling STREAMING+.
   The camera sits lower than the campaign card's, so the drones and the lit city are in one frame. */
const PLUS_SKY: DronesScene = {
    ...(CAMPAIGN_SCENES.DRONE_SKY as DronesScene),
    focus: [512, 885],
    sky: [150, 600, 874, 900],
};
const PLUS_GOLD = 40;

export const StreamingPlusPreview: React.FC<{ compact?: boolean; paused?: boolean }> = ({ compact, paused }) => {
    /* the scene (a photo and the drone fleet) is built a beat after the card appears, so the tap that opens it stays instant */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setReady(true), 90);
        return () => window.clearTimeout(timer);
    }, []);
    return (
        <div className={`${css.preview}${compact ? ` ${css.previewCompact}` : ''}${ready ? ` ${css.previewReady}` : ''}`} aria-hidden="true">
            {/* the full scene, not the compact card's: its glow layer is what makes the drones read as gold light */}
            {ready && <CampaignScene scene={PLUS_SKY} creative={null} play={0} compact={false} idle paused={paused} label="STREAMING+" hue={PLUS_GOLD} className={css.previewScene} />}
            <span className={css.previewShade} />
        </div>
    );
};
