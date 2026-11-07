/**
 * #252: what a title sent to the player's own service is waiting for. Zeesh (2026-11-05): "ek pop up notification de clean minimal sa ki agar sirf
 * push hua hai to content me jake isko schedule karna hoga". A portal, because some of the screens underneath are transformed.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import { YOUR_SERVICE_AFTER_CINEMA_WEEKS } from '../services/streamingYourPlatform';
import css from './StreamingShelfNotice.module.css';

export interface StreamingShelfNoticeModel {
    /** the title, or "3 titles" */
    what: string;
    plural?: boolean;
}

/** the service's colour can be bright: the words on it follow */
const inkOn = (hex?: string) => {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!match) return '#ffffff';
    const value = parseInt(match[1], 16);
    const [red, green, blue] = [value >> 16 & 255, value >> 8 & 255, value & 255].map(channel => {
        const part = channel / 255;
        return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
    });
    const light = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return (light + 0.05) / 0.0521 >= 1.05 / (light + 0.05) ? '#05070b' : '#ffffff';
};

const brandOf = (color?: string) => (color ? { '--svc': color, '--svc-ink': inkOn(color) } : {}) as React.CSSProperties;

/** #253: a film still in cinemas: Zeesh (2026-11-05): "cinema wali film shelf par aaye and mai schedule karo ya fir quick wo bhi aaye ki jaise abhi hai ki khud bhi live ho sakte selected week ke baad" */
export const StreamingAfterCinemaChoice: React.FC<{
    what: string;
    service: string;
    color?: string;
    onSend: (weeks: number) => void;
    onClose: () => void;
}> = ({ what, service, color, onSend, onClose }) => {
    const [weeks, setWeeks] = React.useState(0);
    return createPortal(
        <AccessibleDialog className={css.scrim} style={brandOf(color)} aria-label={`Send ${what} to ${service}`} onEscape={onClose} onClick={onClose} data-ui="after-cinema-choice">
            <div className={css.card} onClick={event => event.stopPropagation()}>
                <span className={css.brandTop}>{service}</span>
                <h3>When {what} leaves cinemas</h3>
                <div className={css.roads}>
                    <button type="button" className={weeks === 0 ? css.roadOn : css.road} aria-pressed={weeks === 0} onClick={() => setWeeks(0)}>
                        <i aria-hidden="true" /><span><b>On my shelf</b><em>I schedule it in Content</em></span>
                    </button>
                    <div className={weeks > 0 ? css.roadOn : css.road}>
                        <button type="button" className={css.roadHead} aria-pressed={weeks > 0} onClick={() => setWeeks(current => current || 1)}>
                            <i aria-hidden="true" /><span><b>Live by itself</b><em>After cinemas close</em></span>
                        </button>
                        <div className={css.chips}>
                            {YOUR_SERVICE_AFTER_CINEMA_WEEKS.map(choice => (
                                <button type="button" key={choice} className={choice === weeks ? css.chipOn : css.chip} aria-pressed={choice === weeks} onClick={() => setWeeks(choice)}>
                                    {choice === 1 ? 'Next week' : `${choice} weeks`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className={css.foot}>
                    <button type="button" className={css.later} onClick={onClose}>Not now</button>
                    <button type="button" className={css.go} onClick={() => onSend(weeks)}>Send it</button>
                </div>
            </div>
        </AccessibleDialog>,
        document.body,
    );
};

/** #253: a door the build has closed */
export const StreamingBuildLockNotice: React.FC<{
    service: string;
    color?: string;
    weeksLeft: number;
    onSeeBuild: () => void;
    onClose: () => void;
}> = ({ service, color, weeksLeft, onSeeBuild, onClose }) => createPortal(
    <AccessibleDialog className={css.scrim} style={brandOf(color)} aria-label="Locked until opening night" onEscape={onClose} onClick={onClose} data-ui="build-lock-notice">
        <div className={css.card} onClick={event => event.stopPropagation()}>
            <span className={css.padlock} aria-hidden="true"><Lock /></span>
            <span className={css.brand}>{service}</span>
            <h3>Locked until opening night</h3>
            <p>The crews are building the plan you approved.{weeksLeft > 0 ? ` ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weeks'} to go.` : ''}</p>
            <div className={css.foot}>
                <button type="button" className={css.later} onClick={onClose}>OK</button>
                <button type="button" className={css.go} onClick={onSeeBuild}>See the build</button>
            </div>
        </div>
    </AccessibleDialog>,
    document.body,
);

export const StreamingShelfNotice: React.FC<StreamingShelfNoticeModel & {
    service: string;
    color?: string;
    onSchedule?: () => void;
    onClose: () => void;
}> = ({ what, plural = false, service, color, onSchedule, onClose }) => {
    const brand = brandOf(color);
    const schedule = onSchedule;
    return createPortal(
        <AccessibleDialog className={css.scrim} style={brand} aria-label={`${what} sent to ${service}`} onEscape={onClose} onClick={onClose} data-ui="shelf-notice">
            <div className={css.card} onClick={event => event.stopPropagation()}>
                <div className={css.shelf} aria-hidden="true"><i /><i /><b /><i /><i /></div>
                <span className={css.brand}>{service}</span>
                <h3>{what} {plural ? 'are' : 'is'} on your shelf</h3>
                <p>{plural ? 'They are' : 'It is'} not live yet. Schedule {plural ? 'them' : 'it'} in Content.</p>
                <div className={schedule ? css.foot : css.footOne}>
                    <button type="button" className={schedule ? css.later : css.go} onClick={onClose}>{schedule ? 'Later' : 'Got it'}</button>
                    {schedule && <button type="button" className={css.go} onClick={schedule}>Schedule {plural ? 'them' : 'it'}</button>}
                </div>
            </div>
        </AccessibleDialog>,
        document.body,
    );
};
