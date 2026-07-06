# Actor Empire Android Purchase Verifier

This Firebase Functions package is the server-side gate for Android in-app purchases. The app must not grant Android rewards from the local Billing result alone; it should grant only after `verifyAndroidPurchase` returns `verified: true`.

## Setup

1. Enable the Google Play Android Developer API in the Google Cloud project linked to the Play Console app.
2. Link the Play Console app `com.zeeshapps.actorempire` to this Firebase/Google Cloud project.
3. Grant the deployed Functions service account access to read Google Play monetization/order purchase data.
4. Install dependencies inside this folder with `npm install`.
5. Build with `npm run build`.
6. Deploy with `npm run deploy`.

The function verifies the Firebase user token, validates the product ID map, asks Google Play for the purchase status, requires `purchaseState === 0`, and stores a SHA-256 hash of each accepted purchase token in Firestore so a token cannot be used twice.
