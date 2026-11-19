import React from 'react';
import { recordNonFatal } from '../services/firebaseService';

/* Crash fix (19 Nov 2026), qa/2026-11-19-crash-scene/FIX-PLAN.md item 1.11: an error while drawing one page closes that
   page, not the whole game. Before, any such error opened Recovery Mode, whose button went back to the start menu,
   so the player had to open the career again: a whole-career load, the heaviest moment there is on a phone already
   short of memory. Now an error inside a page sends the player back to Home with a short note. Home's own errors, and
   a second error within a minute, still open Recovery Mode (the error is thrown on to GameErrorBoundary).

   The report keeps the error's own stack (where it was thrown), which Recovery Mode's report never had: it sent
   React's component stack only, so a 1.0.29 report could name the screen but not the line. */
type Props = {
  /** The page's name, for the report and the note. */
  screen: string;
  /** Home: its errors go on to Recovery Mode, because there is no page to go back to. */
  isHome: boolean;
  onClosed: (screen: string) => void;
  children?: React.ReactNode;
};
type State = { error: Error | null; at: number };

const REPEAT_WINDOW_MS = 60_000;
let lastClosedAt = 0;

export class ScreenErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  state: State = { error: null, at: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, at: Date.now() };
  }

  componentDidCatch(error: Error, info?: React.ErrorInfo) {
    lastClosedAt = this.state.at || Date.now();
    recordNonFatal(error, 'screen_render_closed', {
      screen: this.props.screen,
      error_stack: String(error?.stack || '').replace(/\s+/g, ' ').slice(0, 480),
      component_stack: String(info?.componentStack || '').replace(/\s+/g, ' ').slice(0, 320),
    });
    this.props.onClosed(this.props.screen);
  }

  render() {
    const { error, at } = this.state;
    if (!error) return this.props.children ?? null;
    // nothing to fall back to, or the same trouble again: the whole-game recovery screen takes over
    if (this.props.isHome || at - lastClosedAt < REPEAT_WINDOW_MS) throw error;
    return null;
  }
}
