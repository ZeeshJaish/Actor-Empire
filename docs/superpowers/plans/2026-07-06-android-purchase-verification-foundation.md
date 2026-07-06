# Android Purchase Verification Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Android in-app purchases grant rewards only after a server verification contract approves the Google Play purchase token.

**Architecture:** The native Android Billing bridge returns purchase tokens, the web app sends those tokens to a verification facade, and the app only returns `success: true` when the verifier confirms the purchase. A Firebase Functions scaffold documents the deployable server path using Google Play Developer API and Firestore token replay protection, while local audits protect the client from accidental token-only grants.

**Tech Stack:** Capacitor, TypeScript, Firebase Auth REST token already present in `services/firebaseService.ts`, Firebase Callable Functions contract, Google Play Developer API `purchases.products.get`, Play Billing one-time products.

---

### Task 1: Secure Verification Contract Audit

**Files:**
- Create: `scripts/audit-android-purchase-verification.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing audit**

Create `scripts/audit-android-purchase-verification.mjs` that reads `services/iapService.ts`, `services/androidPurchaseVerifier.ts`, `functions/src/index.ts`, and `functions/package.json`. It must fail until:
- Android purchase flow calls `verifyAndroidPurchase`.
- Android purchase flow no longer returns the placeholder "Server verification is required" failure after capturing a token.
- A verifier service sends `purchaseToken`, `storeProductId`, and `premiumProductId`.
- The Firebase Functions scaffold includes package, product, token validation, purchased-state validation, and token replay protection.

- [ ] **Step 2: Run audit to verify it fails**

Run: `node scripts/audit-android-purchase-verification.mjs`

Expected: FAIL because the audit file is new and the verification files do not exist yet.

- [ ] **Step 3: Add npm script**

Add `"audit:android-purchase-verification": "node scripts/audit-android-purchase-verification.mjs"` to `package.json`.

- [ ] **Step 4: Commit**

Run:
```bash
git add scripts/audit-android-purchase-verification.mjs package.json
git commit -m "test: add android purchase verification audit"
```

### Task 2: Client Verifier Facade

**Files:**
- Create: `services/androidPurchaseVerifier.ts`
- Modify: `services/firebaseService.ts`
- Modify: `services/iapService.ts`

- [ ] **Step 1: Export Firebase auth token helper**

Export a small function from `services/firebaseService.ts` that returns the current anonymous Firebase `idToken` and `uid` for native calls:

```ts
export const getFirebaseAuthForServerCall = async (): Promise<{ uid: string; idToken: string } | null> => {
  const auth = await getFreshAnonymousAuth();
  if (!auth?.localId || !auth?.idToken) return null;
  return { uid: auth.localId, idToken: auth.idToken };
};
```

- [ ] **Step 2: Add verifier facade**

Create `services/androidPurchaseVerifier.ts` with a `verifyAndroidPurchase` function. It must:
- Accept `premiumProductId`, `storeProductId`, `purchaseToken`, and optional `orderId`.
- Use `getFirebaseAuthForServerCall`.
- POST to a callable-compatible endpoint at `https://<region>-<project>.cloudfunctions.net/verifyAndroidPurchase`.
- Return a typed success/failure result.
- Fail closed when not running on Android/native, auth is missing, or the server response is not verified.

- [ ] **Step 3: Wire Android purchase flow**

Update `services/iapService.ts` so Android purchase flow:
- Captures the matching purchase token.
- Calls `verifyAndroidPurchase`.
- Returns `success: true` only when the verifier returns `verified: true` for the same `premiumProductId`.
- Returns a clear failure message when verification fails.

- [ ] **Step 4: Wire restore flow safely**

Update Android restore so it verifies each restored token before returning `restoredProductIds`. It must restore only verified products and fail closed if none verify.

- [ ] **Step 5: Run focused audit**

Run: `npm run audit:android-purchase-verification`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add services/firebaseService.ts services/androidPurchaseVerifier.ts services/iapService.ts
git commit -m "feat: require server verification for android purchases"
```

### Task 3: Firebase Functions Verification Scaffold

**Files:**
- Create: `firebase.json`
- Create: `functions/package.json`
- Create: `functions/src/index.ts`
- Create: `functions/tsconfig.json`
- Create: `functions/README.md`

- [ ] **Step 1: Add Firebase config**

Create `firebase.json` with a Functions source of `functions`.

- [ ] **Step 2: Add functions package**

Create `functions/package.json` with scripts for `build` and `deploy`, and dependencies on `firebase-admin`, `firebase-functions`, and `googleapis`.

- [ ] **Step 3: Add verifier function**

Create `functions/src/index.ts` containing callable-style HTTPS function `verifyAndroidPurchase`. It must:
- Require authenticated Firebase user.
- Validate package name `com.zeeshapps.actorempire`.
- Validate `premiumProductId` maps to the expected Android product ID.
- Verify purchase token with Google Play Developer API `purchases.products.get`.
- Require `purchaseState === 0`.
- Reject reused tokens using Firestore transaction storage under `androidPurchaseTokens/{sha256(token)}`.
- Return `{ verified: true, premiumProductId, storeProductId, orderId }` only after all checks pass.

- [ ] **Step 4: Add setup docs**

Create `functions/README.md` explaining:
- Enable Google Play Android Developer API.
- Link Play Console and Google Cloud project.
- Grant the Functions service account permission to read monetization/order data.
- Deploy with Firebase CLI after dependencies are installed.

- [ ] **Step 5: Run focused audit**

Run: `npm run audit:android-purchase-verification`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add firebase.json functions scripts/audit-android-purchase-verification.mjs
git commit -m "feat: scaffold android purchase verifier function"
```

### Task 4: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run Android billing audit**

Run: `npm run audit:android-billing`

Expected: PASS.

- [ ] **Step 2: Run purchase verification audit**

Run: `npm run audit:android-purchase-verification`

Expected: PASS.

- [ ] **Step 3: Run TypeScript check**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Run web build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Sync Android**

Run: `npx cap sync android`

Expected: PASS.

- [ ] **Step 6: Build Android debug with Android Studio JDK**

Run:
```bash
JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home ./gradlew assembleDebug
```

Expected: PASS.

