import { Capacitor } from '@capacitor/core';
import { PremiumProductId } from './premiumLogic';
import { getFirebaseAuthForServerCall } from './firebaseService';

const FIREBASE_PROJECT_ID = 'actor-empire-1ff1d';
const FIREBASE_FUNCTION_REGION = 'us-central1';
const VERIFY_ANDROID_PURCHASE_URL =
  `https://${FIREBASE_FUNCTION_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/verifyAndroidPurchase`;
const VERIFY_TIMEOUT_MS = 15000;

export interface AndroidPurchaseVerificationRequest {
  premiumProductId: PremiumProductId;
  storeProductId: string;
  purchaseToken: string;
  orderId?: string;
}

export interface AndroidPurchaseVerificationResult {
  verified: boolean;
  premiumProductId?: PremiumProductId;
  storeProductId?: string;
  orderId?: string;
  message: string;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Purchase verification timed out.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const asVerificationResult = (payload: any): AndroidPurchaseVerificationResult => {
  const result = payload?.result || payload;
  if (result?.verified === true) {
    return {
      verified: true,
      premiumProductId: result.premiumProductId,
      storeProductId: result.storeProductId,
      orderId: result.orderId,
      message: String(result.message || 'Android purchase verified.'),
    };
  }
  return {
    verified: false,
    message: String(result?.message || payload?.error?.message || 'Android purchase could not be verified.'),
  };
};

export const verifyAndroidPurchase = async (
  request: AndroidPurchaseVerificationRequest
): Promise<AndroidPurchaseVerificationResult> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { verified: false, message: 'Android purchase verification is only available on Android.' };
  }

  if (!request.purchaseToken || !request.storeProductId || !request.premiumProductId) {
    return { verified: false, message: 'Android purchase verification is missing purchase data.' };
  }

  const auth = await getFirebaseAuthForServerCall();
  if (!auth?.idToken) {
    return { verified: false, message: 'Android purchase verification needs Firebase sign-in. Please restart the app and try again.' };
  }

  try {
    const response = await withTimeout(
      fetch(VERIFY_ANDROID_PURCHASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            premiumProductId: request.premiumProductId,
            storeProductId: request.storeProductId,
            purchaseToken: request.purchaseToken,
            orderId: request.orderId,
          },
        }),
      }),
      VERIFY_TIMEOUT_MS
    );

    const payload = await response.json().catch(() => ({}));
    const verification = asVerificationResult(payload);
    if (!response.ok || verification.verified !== true) {
      return {
        verified: false,
        message: verification.message || `Android purchase verification failed with HTTP ${response.status}.`,
      };
    }

    if (
      verification.premiumProductId !== request.premiumProductId ||
      verification.storeProductId !== request.storeProductId
    ) {
      return { verified: false, message: 'Android purchase verification returned mismatched product data.' };
    }

    return verification;
  } catch (error: any) {
    return {
      verified: false,
      message: String(error?.message || error || 'Android purchase verification failed.'),
    };
  }
};
