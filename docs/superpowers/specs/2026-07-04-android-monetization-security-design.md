# Android Monetization and Purchase Security Design

## Context

Actor Empire is in Google Play closed testing and may become eligible for production access around July 5 or July 6, 2026. The current app already has Android AdMob wiring and an Android AdMob app id. Premium purchases are currently iOS-only in the game service layer and Store UI.

The goal is to add Android ads and in-app purchases without letting local patch tools fake purchase success and grant game rewards.

## Release Strategy

Do not rush Android purchases into the current closed-test build if that build is already close to completing its required testing period. First apply for production access with the stable tested build. Then ship Android monetization as a focused update through internal testing, closed testing, and staged production rollout.

This avoids resetting practical QA confidence right before the closed-test milestone while still preparing the proper secure purchase path.

## Monetization Scope

Android should support the same premium product model as iOS:

- No Ads, non-consumable
- Energy packs, consumable
- Cash packs, consumable
- Lifestyle collection bundles, non-consumable

Android product ids should be defined beside the existing iOS ids, not mixed into game reward logic. The Store should show premium products on Android only when the Android purchase bridge and catalog query are available.

Ads should continue using AdMob rewarded ads and interstitials. The No Ads entitlement should suppress forced interstitials on Android exactly as it already does in game logic.

## Security Model

The app must not grant a premium reward just because the local Android purchase callback reports success. Local success only means "send this purchase token for verification."

For Android, purchase reward flow should be:

1. Player taps a premium product.
2. Native Google Play Billing launches the purchase flow.
3. App receives product id and purchase token.
4. App requests a Play Integrity token near the purchase verification action.
5. App calls a backend verifier with product id, purchase token, package name, and integrity token.
6. Backend verifies the Play Integrity verdict.
7. Backend verifies the purchase token with the Google Play Developer API.
8. Backend rejects reused tokens, mismatched products, invalid purchase states, risky integrity verdicts, and wrong package names.
9. Backend consumes consumables or acknowledges non-consumables.
10. Backend returns a signed/structured "grant approved" response.
11. Only then the app calls `applyPremiumPurchase()`.

This makes Lucky Patcher-style local purchase spoofing much less useful because patched local callbacks cannot create a valid Google purchase token that the backend accepts.

## Backend Shape

Use Firebase Cloud Functions because the project already uses Firebase diagnostics and Google services on Android.

The first function should be `verifyAndroidPurchase`. It should:

- Accept only HTTPS callable or HTTPS requests from the app.
- Validate the requested `PremiumProductId` against the server-side Android catalog.
- Verify Play Integrity against `com.zeeshapps.actorempire`.
- Verify the Google Play purchase token against the matching product id.
- Store purchase token processing state in Firestore or another server store to prevent duplicate grants.
- Consume Android consumables after successful validation.
- Acknowledge Android non-consumables after successful validation.
- Return a minimal success payload containing the premium product id and grant id.

No Google Play service account private key should be shipped in the app.

## Client Shape

`services/iapService.ts` should become a cross-platform facade:

- iOS keeps its current native purchase plugin path.
- Android uses a new native Play Billing bridge.
- Web/dev keeps simulation behavior only in development.

The Android path should return success only after backend verification, not immediately after billing success.

`views/StorePage.tsx` should stop using iOS-only device detection for premium visibility. It should show premium on native Android when Android catalog fetch succeeds, and keep clear disabled/error states when purchases are unavailable.

`App.tsx` can keep calling `handlePremiumPurchase(productId)` and `applyPremiumPurchase()` after service success. The change should stay inside the purchase service boundary as much as possible.

## Native Android Shape

Add a narrow Capacitor plugin or bridge for:

- Querying one-time products from Google Play Billing.
- Launching purchase flow.
- Returning purchase token, product id, purchase state, and acknowledgement/consumption state to TypeScript.
- Restoring/querying owned non-consumables.

Use current Google Play Billing requirements for the library version at implementation time. Keep product ids in one mapping so Play Console, native billing, backend verification, and game rewards cannot drift silently.

## Error Handling

Players should see plain messages:

- Purchase cancelled.
- Purchase pending approval.
- Purchase could not be verified.
- Purchase already applied.
- Purchases are unavailable in this build.

Never grant consumable rewards on verification failure. For pending purchases, show a pending message and grant only after a later verified owned-purchase query succeeds.

## Testing

Before production rollout:

- Verify Android catalog loads on an internal test build.
- Verify each consumable grants once and can be bought again.
- Verify each non-consumable grants once and restores.
- Verify No Ads suppresses forced interstitials.
- Verify failed backend verification does not grant rewards.
- Verify reused purchase tokens do not grant twice.
- Verify Lucky Patcher-style local success cannot grant rewards without backend approval.
- Run `npm run lint`, `npm run build`, and an Android debug/release build.

## Play Console Checklist

Before implementation:

- Confirm current closed-test eligibility and apply for production access when available.
- Create Android in-app products matching the product id map.
- Add license testers for billing tests.
- Confirm AdMob app id and ad unit ids are correct for Android.
- Prepare Play Integrity API access.
- Prepare a Google Play Developer API service account for backend-only purchase verification.
- Keep testing with test products/testers until verification and restore flows are proven.

