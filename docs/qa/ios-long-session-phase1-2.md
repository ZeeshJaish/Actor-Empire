# iOS long-session crash phases 1–2

## What is implemented

Phase 1 adds a persistent native diagnostic record that survives a WebKit renderer restart or an abnormal app exit. It stores only bounded metadata: lifecycle state, last screen, age/week, save slot, runtime and persisted size estimates, selected collection counts, memory-warning count, and renderer-termination count. It never stores or transfers save content.

When iOS reports that the WKWebView content process terminated, Actor Empire records the event before retaining Capacitor's normal bridge reset and reload behavior. On the next JavaScript runtime, a pending report is uploaded to Firebase Analytics and exposed through Crashlytics keys. The native report is acknowledged only after Analytics confirms the event call completed.

Phase 2 adds a deterministic 468-week (nine-year) engine soak. It verifies exact week advancement, annual growth checkpoints, persistence-compacted size, retained collection bounds, heap samples, and Process Week timing. This is a quality-neutral test: it does not change graphics, motion, content, or gameplay data.

## Automated commands

```sh
npm run audit:ios-long-session-phase1-2
npm run audit:ios-long-session-store
npm run audit:ios-long-session-soak
```

For a quick local smoke run:

```sh
IOS_LONG_SESSION_WEEKS=52 npm run audit:ios-long-session-soak
```

## Physical-device release gate

Run the release build on at least three iPhone tiers: an older/small-memory device, a mid-tier device, and a current high-end device.

1. Start a fresh career and confirm `runtime_ready` appears in native logs/Crashlytics context.
2. Play or automate through at least 468 weeks; run 30-, 60-, and 120-minute sessions.
3. At each year boundary, exercise Home, Career, Improve, Social, Studio, and Streaming screens.
4. Background and foreground the app during an ordinary screen and during a week transition.
5. Trigger an Xcode memory warning and confirm the game creates a save checkpoint without duplicating a week.
6. Terminate the WebKit content process in a debug build and confirm the native report records `WEB_CONTENT_TERMINATED`, Capacitor reloads, and the last verified save returns.
7. Force-close from active and backgrounded states. On next launch confirm the classifications are `UNEXPECTED_ACTIVE_EXIT` and `BACKGROUND_TERMINATED` respectively.
8. Confirm no player progress is lost and no report contains names, save JSON, story content, or other payload data.

Passing the Node soak is directional engine evidence, not a substitute for this physical-device gate. A release should remain blocked until the older-device 120-minute run and the WebKit termination recovery both pass.
