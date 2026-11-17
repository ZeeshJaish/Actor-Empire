import React from 'react';

/* 2026-11-16 (Zeesh: "campaign list ka sara error case"): the game had one error boundary, at its root, so a campaign
   picture that failed to draw (a phone out of canvas memory) took the whole game to the Startup Recovery screen. A
   scene that fails now shows its plain fallback and the rest of the page goes on. */
type Props = { children: React.ReactNode; fallback: React.ReactNode };

export class SceneBoundary extends React.Component<Props, { failed: boolean }> {
  /* as in index.tsx's RootRecoveryBoundary: this project's class fields hide the inherited `props` from tsc */
  declare props: Props;
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[campaign scene] shown without its picture:', error?.message || error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
