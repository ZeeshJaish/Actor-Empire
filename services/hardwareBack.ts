/* B5 (2026-11-15): Android's back button closed the game (no back handling: @capacitor/app was not installed). Back
   now works like in other games, in this order:
   1. an open sheet or dialog closes (its own Close / Cancel / Back control, else Escape);
   2. else the screen's own back control (the top-most back arrow on screen) is pressed;
   3. else, away from Home, the game goes Home;
   4. on Home, the game asks "Exit game?".
   It only ever presses a control the player could press, so each screen goes back the way its own button does. */

/* something the player could press now: on screen, shown, and taking taps (a closed sheet parked below the screen,
   like Home's Energy ledger, keeps role="dialog" but takes no taps) */
const visible = (element: Element): boolean => {
    const box = (element as HTMLElement).getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return false;
    if (box.bottom <= 0 || box.right <= 0 || box.top >= window.innerHeight || box.left >= window.innerWidth) return false;
    if (element.closest('[aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element as HTMLElement);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.05 && style.pointerEvents !== 'none';
};

const CLOSE_WORDS = /^(close|cancel|back|done|not now|dismiss|no thanks|stay|×|✕|←)$/i;
const CLOSE_LABELS = /\b(close|back|dismiss|cancel)\b/i;

const isCloseControl = (button: HTMLElement): boolean => {
    if ((button as HTMLButtonElement).disabled) return false;
    const label = button.getAttribute('aria-label') || '';
    const text = (button.innerText || '').trim();
    return CLOSE_LABELS.test(label) || CLOSE_WORDS.test(text)
        || Boolean(button.querySelector('svg.lucide-x, svg.lucide-arrow-left, svg.lucide-chevron-left'));
};

/** the open layer on top: the last visible dialog in the page */
const topDialog = (): HTMLElement | null => {
    /* open: it has something on screen that takes a tap (its frame may itself let taps through) */
    const layers = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]')]
        .filter(layer => [...layer.querySelectorAll('button, [role="button"], a, input')].some(visible));
    return layers.length ? layers[layers.length - 1] : null;
};

/** a back arrow on screen: the highest one, as a header's back sits above everything else */
const screenBackControl = (): HTMLElement | null => {
    const candidates = [...document.querySelectorAll<HTMLElement>('button, [role="button"], a')]
        .filter(button => visible(button) && !(button as HTMLButtonElement).disabled)
        .filter(button => /^(back|go back)$/i.test(button.getAttribute('aria-label') || '')
            || Boolean(button.querySelector('svg.lucide-arrow-left, svg.lucide-chevron-left')));
    candidates.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top
        || left.getBoundingClientRect().left - right.getBoundingClientRect().left);
    return candidates[0] || null;
};

export type HardwareBackStep = 'CLOSED_LAYER' | 'SCREEN_BACK' | 'HOME' | 'ASK_EXIT' | 'IGNORED';

export const runHardwareBack = ({ onHome, goHome, askExit, busy }: {
    onHome: boolean;
    goHome: () => void;
    askExit: () => void;
    /** a week is being played: back waits */
    busy?: boolean;
}): HardwareBackStep => {
    if (busy) return 'IGNORED';
    const dialog = topDialog();
    if (dialog) {
        const close = [...dialog.querySelectorAll<HTMLElement>('button, [role="button"]')].filter(visible).find(isCloseControl);
        if (close) { close.click(); return 'CLOSED_LAYER'; }
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return 'CLOSED_LAYER';
    }
    const back = screenBackControl();
    if (back) { back.click(); return 'SCREEN_BACK'; }
    if (!onHome) { goHome(); return 'HOME'; }
    askExit();
    return 'ASK_EXIT';
};
