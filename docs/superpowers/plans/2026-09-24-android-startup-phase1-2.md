# Android Startup Phases 1-2 Implementation Plan

> Design spec: `docs/superpowers/specs/2026-09-24-android-startup-phase1-2-design.md`

## Task 1: Protect the coordinator contract with tests

- Add a focused executable audit for real task progress, terminal failure, timeout, retry, and stale-attempt rejection.
- Run it before implementation and confirm it fails because the coordinator does not exist.
- Implement the smallest pure startup coordinator that satisfies the contract.

## Task 2: Make the HTML entry point local-first

- Add Tailwind/PostCSS build dependencies and configuration.
- Add the app stylesheet entry using Tailwind plus current global utilities and packaged fonts.
- Remove blocking CDN Tailwind, Google Fonts, import map, startup AdSense, and the unresolved `/index.css` link.
- Add a small inline pre-React boot shell and import the compiled stylesheet from `index.tsx`.
- Move telemetry bootstrap after the React render call.

## Task 3: Integrate real startup work

- Add a strict save-key listing API that reports failure rather than converting it into an empty list.
- Drive `APP_CORE`, `STORAGE`, `SAVE_SUMMARIES`, and `FIRST_SCREEN` from the existing lightweight summary flow.
- Replace the 8.6-second fake progress animation and rotating timer with coordinator snapshots.
- Add a Retry action to the existing Actor Empire loading surface without redesigning it, plus a pre-React reload fallback if the bundle cannot mount.
- Reject overlapping attempts and ignore results from stale attempts.

## Task 4: Verify the release path

- Run the new coordinator audit.
- Run intro-flow and startup-performance regression audits.
- Run the production Vite build and inspect its HTML/CSS output for local-only startup dependencies.
- Run `git diff --check` and report any unrelated baseline failures separately.
