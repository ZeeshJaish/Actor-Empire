import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { google } from 'googleapis';

initializeApp();

const PACKAGE_NAME = 'com.zeeshapps.actorempire';
const TOKEN_COLLECTION = 'androidPurchaseTokens';
const ANDROID_PRODUCT_IDS = {
  no_ads: { storeProductId: 'no_ads', kind: 'non_consumable' },
  energy_100: { storeProductId: 'energy_100', kind: 'consumable' },
  energy_250: { storeProductId: 'energy_250', kind: 'consumable' },
  energy_500: { storeProductId: 'energy_500', kind: 'consumable' },
  energy_1000: { storeProductId: 'energy_1000', kind: 'consumable' },
  cash_25000: { storeProductId: 'cash_25000', kind: 'consumable' },
  cash_75000: { storeProductId: 'cash_75000', kind: 'consumable' },
  cash_200000: { storeProductId: 'cash_200000', kind: 'consumable' },
  cash_500000: { storeProductId: 'cash_500000', kind: 'consumable' },
  cash_1250000: { storeProductId: 'cash_1250000', kind: 'consumable' },
  bundle_luxury_homes: { storeProductId: 'bundle_luxury_homes', kind: 'non_consumable' },
  bundle_elite_vehicles: { storeProductId: 'bundle_elite_vehicles', kind: 'non_consumable' },
  bundle_sky_sea: { storeProductId: 'bundle_sky_sea', kind: 'non_consumable' },
  bundle_ultimate_lifestyle: { storeProductId: 'bundle_ultimate_lifestyle', kind: 'non_consumable' },
} as const;

type PremiumProductId = keyof typeof ANDROID_PRODUCT_IDS;

const androidPublisher = async () => {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
};

const json = (status: number, body: Record<string, unknown>) => ({ status, body: { result: body } });

const readBearerToken = (authorization: string | undefined) => {
  const match = /^Bearer\s+(.+)$/i.exec(authorization || '');
  return match?.[1] || '';
};

const getRequestData = (body: any) => body?.data || body || {};

const isPremiumProductId = (value: string): value is PremiumProductId =>
  Object.prototype.hasOwnProperty.call(ANDROID_PRODUCT_IDS, value);

const tokenDocumentId = (purchaseToken: string) =>
  createHash('sha256').update(purchaseToken).digest('hex');

export const verifyAndroidPurchase = onRequest(
  { region: 'us-central1', cors: true },
  async (request, response) => {
    try {
      if (request.method !== 'POST') {
        const { status, body } = json(405, { verified: false, message: 'Method not allowed.' });
        response.status(status).json(body);
        return;
      }

      const idToken = readBearerToken(request.header('authorization'));
      if (!idToken) {
        const { status, body } = json(401, { verified: false, message: 'Firebase auth is required.' });
        response.status(status).json(body);
        return;
      }

      const decodedToken = await getAuth().verifyIdToken(idToken);
      const data = getRequestData(request.body);
      const premiumProductId = String(data.premiumProductId || '');
      const storeProductId = String(data.storeProductId || '');
      const purchaseToken = String(data.purchaseToken || '');
      const clientOrderId = typeof data.orderId === 'string' ? data.orderId : undefined;

      if (!isPremiumProductId(premiumProductId)) {
        const { status, body } = json(400, { verified: false, message: 'Unknown Android product.' });
        response.status(status).json(body);
        return;
      }

      const product = ANDROID_PRODUCT_IDS[premiumProductId];
      if (product.storeProductId !== storeProductId || !purchaseToken) {
        const { status, body } = json(400, { verified: false, message: 'Android product verification mismatch.' });
        response.status(status).json(body);
        return;
      }

      const publisher = await androidPublisher();
      const purchaseResponse = await publisher.purchases.products.get({
        packageName: PACKAGE_NAME,
        productId: storeProductId,
        token: purchaseToken,
      });
      const purchase = purchaseResponse.data;

      if (purchase.purchaseState !== 0) {
        const { status, body } = json(409, { verified: false, message: 'Android purchase is not completed.' });
        response.status(status).json(body);
        return;
      }

      if (purchase.productId && purchase.productId !== storeProductId) {
        const { status, body } = json(409, { verified: false, message: 'Android purchase returned a different product.' });
        response.status(status).json(body);
        return;
      }

      const tokenHash = tokenDocumentId(purchaseToken);
      const db = getFirestore();
      const tokenRef = db.collection(TOKEN_COLLECTION).doc(tokenHash);
      const orderId = purchase.orderId || clientOrderId || '';

      await db.runTransaction(async transaction => {
        const existing = await transaction.get(tokenRef);
        if (existing.exists) {
          throw new Error('PURCHASE_TOKEN_ALREADY_USED');
        }
        transaction.set(tokenRef, {
          uid: decodedToken.uid,
          packageName: PACKAGE_NAME,
          premiumProductId,
          storeProductId,
          kind: product.kind,
          orderId,
          purchaseState: purchase.purchaseState,
          acknowledgementState: purchase.acknowledgementState,
          consumptionState: purchase.consumptionState,
          regionCode: purchase.regionCode || '',
          tokenHash,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      response.status(200).json({
        result: {
          verified: true,
          premiumProductId,
          storeProductId,
          orderId,
          message: 'Android purchase verified.',
        },
      });
    } catch (error: any) {
      const message = String(error?.message || error || 'Android purchase verification failed.');
      logger.warn('Android purchase verification failed', { message });
      const status = message === 'PURCHASE_TOKEN_ALREADY_USED' ? 409 : 500;
      response.status(status).json({
        result: {
          verified: false,
          message: status === 409 ? 'Android purchase token was already used.' : 'Android purchase verification failed.',
        },
      });
    }
  }
);
