import type { Message, Player } from '../types';
import { APP_DISPLAY_VERSION } from './appVersion';
import { markQuietPlayerUpdate } from './quietPlayerUpdates';

/* Zeesh, 2026-11-09: a note from the developer for an update reaches every save once when that version opens: a new
   career gets it next to the welcome note, a returning player gets only this one. A developer's note leaves the inbox
   quietly when its weeks are up (it is not an offer, so it never turns into an "expired offer"). */

export const DEVELOPER_SENDER = 'Zeesh (Developer)';
const DEVELOPER_MESSAGE_PREFIX = 'msg_dev_';

interface DeveloperNote {
    id: string;
    /** the app version that delivers it; other versions do not */
    version: string;
    subject: string;
    text: string;
    /** weeks in the inbox */
    weeks: number;
}

export const DEVELOPER_NOTES: readonly DeveloperNote[] = [
    {
        id: 'msg_dev_update_1_0_26',
        version: '1.0.26',
        subject: 'A note from the developer ❤️',
        text: 'The Streaming update is here! I know it’s been a long wait, and I wanted to tell you why.\n\n'
            + 'Streaming grew into almost another game inside Actor Empire. Getting it to work with the rest of the game meant rebuilding some older systems and spending more time on testing, performance, and the bugs you reported. I also had to pause development for my exams, which pushed things back.\n\n'
            + 'Thank you for sticking with me, sharing your ideas, and taking the time to report what wasn’t working. You helped shape this update, and I’m glad you finally get to play it.\n\n'
            + 'Enjoy the update, and let me know how your first streaming launch goes! 🎬\n\n'
            + 'Actor Empire\nZedbury Studios',
        weeks: 8,
    },
];

/** A message from the developer (the welcome note, an update note). */
export const isDeveloperMessage = (message?: Pick<Message, 'id' | 'sender'> | null): boolean => Boolean(
    message && (String(message.id || '').startsWith(DEVELOPER_MESSAGE_PREFIX) || message.sender === DEVELOPER_SENDER),
);

/** Puts this version's developer notes in the inbox, once per save. Unchanged player when there is nothing to add.
    The change rides along with the next real save (no save of its own at start-up). */
export const deliverDeveloperNotes = (player: Player, appVersion: string = APP_DISPLAY_VERSION): Player => {
    const delivered = new Set<string>(Array.isArray(player.flags?.deliveredDeveloperNotes) ? player.flags.deliveredDeveloperNotes : []);
    const due = DEVELOPER_NOTES.filter(note => note.version === appVersion && !delivered.has(note.id));
    if (!due.length) return player;
    const inbox = Array.isArray(player.inbox) ? player.inbox : [];
    const notes: Message[] = due.map(note => ({
        id: note.id,
        sender: DEVELOPER_SENDER,
        subject: note.subject,
        text: note.text,
        type: 'SYSTEM',
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: note.weeks,
    }));
    return markQuietPlayerUpdate({
        ...player,
        inbox: [...notes, ...inbox.filter(message => !due.some(note => note.id === message.id))],
        flags: { ...player.flags, deliveredDeveloperNotes: [...delivered, ...due.map(note => note.id)] },
    });
};
