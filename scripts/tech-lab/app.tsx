/** The Tech tab on its own, for the layout audits and previews (scripts/tech-lab/lab.ts): the real TechDesk with
 *  a real desk (window.__TECH_LAB__), inside a scroll box like the Platform room's. Presses are only shown. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TechDesk } from '../../components/streaming-transplant/TechDesk';
import type { StreamingTechDeskView } from '../../services/streamingTechDesk';
import type { StreamingTechId } from '../../types';

declare global {
    interface Window { __TECH_LAB__: { desk: StreamingTechDeskView; focus?: StreamingTechId | null }; __TECH_LAB_LOG__: string[] }
}

const { desk, focus = null } = window.__TECH_LAB__;
window.__TECH_LAB_LOG__ = [];
createRoot(document.getElementById('root')!).render(
    <div id="scroller" style={{ height: '100vh', overflowY: 'auto', background: '#050609', padding: '0 16px 48px' }}>
        <div id="roomhead" style={{ height: 96, display: 'flex', alignItems: 'flex-end', paddingBottom: 12, color: '#7d8698', font: '900 9px/1 system-ui', letterSpacing: '.18em' }}>PLATFORM · TECH</div>
        <TechDesk desk={desk} focusTechId={focus}
            onUnlock={id => { window.__TECH_LAB_LOG__.push(`unlock ${id}`); return { ok: true, message: 'Unlocked.' }; }}
            onContribute={(id, amount) => { window.__TECH_LAB_LOG__.push(`energy ${id} ${amount}`); return { ok: true, message: '' }; }}
            onCompleteVersion={id => { window.__TECH_LAB_LOG__.push(`pay ${id}`); return { ok: true, message: 'Version reached.', completed: true }; }} />
    </div>,
);
