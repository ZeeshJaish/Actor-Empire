/**
 * #204 (plan §23.8): while someone else runs the company, you can watch but not steer. Zeesh (2026-11-04): "kya mai sab
 * trasnfer karne ke baad bhi streaming khol ke dekh sakta hu ki kya ho rha and aisa to nahi ki mai tb bhi cheeze manage
 * and change kar paa rha hu jab mai as a board sirf hu".
 *
 * Every room still opens, its title's small line saying who runs it (#219), and changing anything says the same. As chair you can
 * come back, replace the chief executive, vote, appoint a director, sell the company or list it (yours at 51% or more;
 * under it the board's, from 60 confidence). Off the board: only come back, and what any shareholder can do.
 */
import type { Player } from '../types';

export interface StreamingChairRule {
    ceoName: string;
    /** you chair the board, or you left it */
    chair: boolean;
    /** the HQ's line */
    line: string;
    /** #219: under each room's title */
    subtitle: string;
    /** what a tap on a changing control says */
    note: string;
}

export const getStreamingChairRule = (player: Pick<Player, 'ownedStreamingPlatform'>): StreamingChairRule | null => {
    const platform = player.ownedStreamingPlatform;
    const ceo = platform?.leadership?.currentCeo;
    if (!platform?.identity || ceo?.holderType !== 'EXECUTIVE') return null;
    const appointment = platform.leadership.appointments.find(item => item.executiveId === ceo.executiveId && item.status === 'ACTIVE');
    if (!appointment) return null;
    const chair = platform.legacy?.founderOfficeRole === 'EXECUTIVE_CHAIR';
    const name = platform.identity.name || 'the company';
    const first = appointment.nameAtAppointment.split(' ')[0];
    return {
        ceoName: appointment.nameAtAppointment,
        chair,
        line: `${appointment.nameAtAppointment} runs ${name} · You ${chair ? 'chair the board' : 'left the board'}`,
        subtitle: `${first} runs this · ${chair ? 'You chair' : 'You left the board'}`.toUpperCase(),
        note: `${first} runs this now. ${chair ? 'As chair you can come back, or replace them, on TEAM.' : 'You can come back on TEAM.'}`,
    };
};
