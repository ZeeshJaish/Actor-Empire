/**
 * #244 (plan §25.4 Q3): in Filmography: where the title streams, in one line, and the way off the player's own service. The way on is the rights
 * floor's second door (#252); a title on the shelves gets the way to its week. The sheet lives in a portal because the dashboard above it is transformed.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import type { Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingTitlePlacement } from '../services/streamingTitlePlacement';
import { pullTitleFromYourService } from '../services/streamingYourPlatform';
import css from './StreamingTitlePlacementPanel.module.css';

export const StreamingTitlePlacementPanel: React.FC<{
    player: Player;
    projectId: string;
    title: string;
    onUpdatePlayer: (player: Player) => void;
    /** opens Content, on the Slate */
    onSchedule?: () => void;
}> = ({ player, projectId, title, onUpdatePlayer, onSchedule }) => {
    const placement = React.useMemo(() => getStreamingTitlePlacement(player, projectId), [player, projectId]);
    const [sheet, setSheet] = React.useState(false);
    const [refused, setRefused] = React.useState('');
    const service = placement.serviceName;
    if (placement.kind === 'NOWHERE') return null;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const color = player.ownedStreamingPlatform?.identity?.primaryColor;
    const brand = (color ? { '--svc': color } : {}) as React.CSSProperties;
    const close = () => { setSheet(false); setRefused(''); };
    const pull = () => {
        const result = pullTitleFromYourService(player, projectId);
        if (!result.changed) { setRefused(result.detail); return; }
        onUpdatePlayer(result.player);
        close();
    };
    const premiereAhead = placement.yourPremiereWeek !== null && placement.yourPremiereWeek > now;

    return (
        <div className={css.panel} style={brand} data-ui="title-placement">
            <span className={css.eyebrow}>WHERE IT STREAMS</span>
            <b className={css.line}>{placement.line}</b>
            {placement.onShelf && onSchedule && <button type="button" className={css.put} onClick={onSchedule}>Schedule in Content</button>}
            {placement.mayPull && service && <button type="button" className={css.pull} onClick={() => setSheet(true)}>{placement.afterCinema ? 'Change this' : `Pull from ${service}`}</button>}
            {placement.mayPull && !placement.afterCinema && <p className={css.note}>To sell it outside, pull it off first.</p>}
            {sheet && createPortal(
                <div className={css.scrim} style={brand} onClick={close} data-ui="title-placement-sheet">
                    <div className={css.sheet} role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                        <span className={css.eyebrow}>YOUR PLATFORM</span>
                        <h3>{placement.afterCinema ? `Keep ${title} off ${service}?` : `Pull ${title} off ${service}?`}</h3>
                        <p>{placement.afterCinema ? 'It goes to the buyers when cinemas close instead.' : placement.onShelf ? 'It leaves your shelf. It was not live yet.' : premiereAhead ? 'It comes off your Slate before it premieres.' : 'Viewers lose it from next week.'}</p>
                        {refused && <p className={css.refused}>{refused}</p>}
                        <div className={css.foot}>
                            <button type="button" className={css.later} onClick={close}>Keep it</button>
                            <button type="button" className={css.confirm} onClick={pull}>{placement.afterCinema ? 'Yes, change it' : 'Pull it'}</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
};
