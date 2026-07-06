# Android Play Billing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Android Play Billing foundation so Actor Empire can query Android one-time products and collect purchase tokens without granting rewards before server verification exists.

**Architecture:** Keep purchase reward logic behind the existing `services/iapService.ts` facade. Add a narrow native Capacitor bridge named `AndroidPurchases` for Android catalog, purchase, and restore token capture. This first slice deliberately blocks Android reward grants until the backend verifier is implemented.

**Tech Stack:** React 19, TypeScript, Capacitor 8, Android Java, Google Play Billing Library 9.1.0, Vite build checks.

---

## File Structure

- Modify `android/variables.gradle`: define the Play Billing Library version once.
- Modify `android/app/build.gradle`: add Google Play Billing dependency.
- Modify `android/app/src/main/AndroidManifest.xml`: add `com.android.vending.BILLING` permission.
- Create `android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java`: Capacitor bridge for product queries, purchase launch, and restore token collection.
- Modify `android/app/src/main/java/com/zeeshapps/actorempire/MainActivity.java`: register the local plugin.
- Modify `services/iapService.ts`: add Android product ids, platform detection, Android bridge typing, catalog mapping, and secure blocked purchase result.
- Create `scripts/audit-android-billing-config.mjs`: static guard for Android billing dependency, permission, plugin registration, product id map, and no direct Android reward grant.
- Modify `package.json`: add `audit:android-billing`.

## Task 1: Add Billing Build Configuration Guard

**Files:**
- Create: `scripts/audit-android-billing-config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing audit**

Create `scripts/audit-android-billing-config.mjs`:

```js
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const checks = [];

const assertIncludes = (label, path, needle) => {
  const content = read(path);
  if (!content.includes(needle)) {
    checks.push(`${label}: expected ${path} to include ${needle}`);
  }
};

assertIncludes('Billing version', 'android/variables.gradle', "playBillingVersion = '9.1.0'");
assertIncludes('Billing dependency', 'android/app/build.gradle', 'implementation "com.android.billingclient:billing:$playBillingVersion"');
assertIncludes('Billing permission', 'android/app/src/main/AndroidManifest.xml', '<uses-permission android:name="com.android.vending.BILLING" />');
assertIncludes('Plugin source', 'android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java', '@CapacitorPlugin(name = "AndroidPurchases")');
assertIncludes('Plugin registration', 'android/app/src/main/java/com/zeeshapps/actorempire/MainActivity.java', 'registerPlugin(AndroidPurchasesPlugin.class);');
assertIncludes('Android product ids', 'services/iapService.ts', 'ANDROID_PRODUCT_IDS');
assertIncludes('Verification block', 'services/iapService.ts', 'Android purchase captured. Server verification is required before granting rewards.');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('Android billing configuration audit passed.');
```

- [ ] **Step 2: Run audit to verify it fails**

Run: `node scripts/audit-android-billing-config.mjs`

Expected: FAIL with missing billing version, dependency, permission, plugin source, plugin registration, Android product ids, and verification block.

- [ ] **Step 3: Add package script**

In `package.json`, add this script near the other audit scripts:

```json
"audit:android-billing": "node scripts/audit-android-billing-config.mjs",
```

- [ ] **Step 4: Run package script to verify it fails for the same reason**

Run: `npm run audit:android-billing`

Expected: FAIL with the same missing billing configuration messages.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/audit-android-billing-config.mjs
git commit -m "test: add android billing configuration audit"
```

## Task 2: Add Android Billing Dependency and Permission

**Files:**
- Modify: `android/variables.gradle`
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Confirm audit is red**

Run: `npm run audit:android-billing`

Expected: FAIL and still mention missing billing version, dependency, and permission.

- [ ] **Step 2: Add billing version**

In `android/variables.gradle`, add:

```gradle
    playBillingVersion = '9.1.0'
```

inside the existing `ext { ... }` block.

- [ ] **Step 3: Add billing dependency**

In `android/app/build.gradle`, add:

```gradle
    implementation "com.android.billingclient:billing:$playBillingVersion"
```

inside the existing `dependencies { ... }` block.

- [ ] **Step 4: Add billing permission**

In `android/app/src/main/AndroidManifest.xml`, add:

```xml
    <uses-permission android:name="com.android.vending.BILLING" />
```

beside the existing app permissions.

- [ ] **Step 5: Run audit**

Run: `npm run audit:android-billing`

Expected: FAIL only for missing plugin source, plugin registration, Android product ids, and verification block.

- [ ] **Step 6: Commit**

```bash
git add android/variables.gradle android/app/build.gradle android/app/src/main/AndroidManifest.xml
git commit -m "build: add android play billing dependency"
```

## Task 3: Add Native Android Purchases Plugin

**Files:**
- Create: `android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java`
- Modify: `android/app/src/main/java/com/zeeshapps/actorempire/MainActivity.java`

- [ ] **Step 1: Confirm audit is red**

Run: `npm run audit:android-billing`

Expected: FAIL and mention missing plugin source and plugin registration.

- [ ] **Step 2: Create `AndroidPurchasesPlugin.java`**

Create `android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java`:

```java
package com.zeeshapps.actorempire;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "AndroidPurchases")
public class AndroidPurchasesPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall activePurchaseCall;
    private final Map<String, ProductDetails> productDetailsById = new HashMap<>();

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases()
            .build();
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray productIdsArray = call.getArray("productIds", new JSArray());
        List<String> productIds = productIdsArray.toList();
        if (productIds.isEmpty()) {
            call.resolve(new JSObject().put("products", new JSArray()));
            return;
        }

        startConnection(call, () -> queryProducts(call, productIds));
    }

    @PluginMethod
    public void purchaseProduct(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Missing productId.");
            return;
        }
        if (activePurchaseCall != null) {
            call.reject("Another purchase is already in progress.");
            return;
        }

        startConnection(call, () -> {
            ProductDetails details = productDetailsById.get(productId);
            if (details == null) {
                queryProducts(call, List.of(productId), () -> launchPurchase(call, productId));
                return;
            }
            launchPurchase(call, productId);
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        startConnection(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build(),
            (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }
                JSArray restored = new JSArray();
                for (Purchase purchase : purchases) {
                    restored.put(purchaseToJson(purchase));
                }
                call.resolve(new JSObject().put("purchases", restored));
            }
        ));
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.trim().isEmpty()) {
            call.reject("Missing purchaseToken.");
            return;
        }

        startConnection(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();
            billingClient.acknowledgePurchase(params, result -> resolveBillingAction(call, result));
        });
    }

    @PluginMethod
    public void consumePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.trim().isEmpty()) {
            call.reject("Missing purchaseToken.");
            return;
        }

        startConnection(call, () -> {
            ConsumeParams params = ConsumeParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();
            billingClient.consumeAsync(params, (result, token) -> resolveBillingAction(call, result));
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = activePurchaseCall;
        activePurchaseCall = null;
        if (call == null) return;

        int code = billingResult.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        if (code != BillingClient.BillingResponseCode.OK) {
            call.reject(billingResult.getDebugMessage());
            return;
        }

        JSArray purchaseArray = new JSArray();
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                purchaseArray.put(purchaseToJson(purchase));
            }
        }
        call.resolve(new JSObject().put("purchases", purchaseArray));
    }

    private void startConnection(PluginCall call, Runnable onReady) {
        if (billingClient.isReady()) {
            onReady.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }
                onReady.run();
            }

            @Override
            public void onBillingServiceDisconnected() {
            }
        });
    }

    private void queryProducts(PluginCall call, List<String> productIds) {
        queryProducts(call, productIds, () -> {
            JSArray products = new JSArray();
            for (String productId : productIds) {
                ProductDetails details = productDetailsById.get(productId);
                if (details != null) {
                    products.put(productToJson(details));
                }
            }
            call.resolve(new JSObject().put("products", products));
        });
    }

    private void queryProducts(PluginCall call, List<String> productIds, Runnable onComplete) {
        List<QueryProductDetailsParams.Product> requestedProducts = new ArrayList<>();
        for (String productId : productIds) {
            requestedProducts.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build());
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(requestedProducts)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(billingResult.getDebugMessage());
                return;
            }

            for (ProductDetails details : productDetailsResult.getProductDetailsList()) {
                productDetailsById.put(details.getProductId(), details);
            }
            onComplete.run();
        });
    }

    private void launchPurchase(PluginCall call, String productId) {
        ProductDetails details = productDetailsById.get(productId);
        if (details == null) {
            call.reject("Product unavailable.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Purchase activity unavailable.");
            return;
        }

        BillingFlowParams.ProductDetailsParams detailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .build();
        BillingFlowParams params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(List.of(detailsParams))
            .build();

        activePurchaseCall = call;
        BillingResult result = billingClient.launchBillingFlow(activity, params);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            activePurchaseCall = null;
            call.reject(result.getDebugMessage());
        }
    }

    private JSObject productToJson(ProductDetails details) {
        String priceLabel = "";
        long priceMicros = 0L;
        String currencyCode = "";
        List<ProductDetails.OneTimePurchaseOfferDetails> offers = details.getOneTimePurchaseOfferDetailsList();
        if (offers != null && !offers.isEmpty()) {
            ProductDetails.OneTimePurchaseOfferDetails offer = offers.get(0);
            priceLabel = offer.getFormattedPrice();
            priceMicros = offer.getPriceAmountMicros();
            currencyCode = offer.getPriceCurrencyCode();
        }

        return new JSObject()
            .put("productId", details.getProductId())
            .put("title", details.getTitle())
            .put("description", details.getDescription())
            .put("priceLabel", priceLabel)
            .put("priceMicros", priceMicros)
            .put("currencyCode", currencyCode)
            .put("type", "inapp");
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSArray productIds = new JSArray();
        for (String productId : purchase.getProducts()) {
            productIds.put(productId);
        }

        return new JSObject()
            .put("productIds", productIds)
            .put("purchaseToken", purchase.getPurchaseToken())
            .put("orderId", purchase.getOrderId())
            .put("purchaseState", purchase.getPurchaseState())
            .put("acknowledged", purchase.isAcknowledged());
    }

    private void resolveBillingAction(PluginCall call, BillingResult result) {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject(result.getDebugMessage());
            return;
        }
        call.resolve(new JSObject().put("success", true));
    }
}
```

- [ ] **Step 3: Register plugin in `MainActivity.java`**

Replace the file with:

```java
package com.zeeshapps.actorempire;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidPurchasesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 4: Run audit**

Run: `npm run audit:android-billing`

Expected: FAIL only for missing Android product ids and verification block.

- [ ] **Step 5: Run Android build**

Run: `./gradlew assembleDebug` from the `android` directory.

Expected: PASS. If the Java API names fail because Billing 9.1.0 differs from the planned method names, correct the native plugin using the installed Billing docs/API and rerun until build passes.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java android/app/src/main/java/com/zeeshapps/actorempire/MainActivity.java
git commit -m "feat: add android purchases bridge"
```

## Task 4: Add Android Product Map and Blocked Verification Result

**Files:**
- Modify: `services/iapService.ts`

- [ ] **Step 1: Confirm audit is red**

Run: `npm run audit:android-billing`

Expected: FAIL and mention missing Android product ids and verification block.

- [ ] **Step 2: Extend product ids and plugin types**

In `services/iapService.ts`, add this after `IOS_PRODUCT_IDS`:

```ts
export const ANDROID_PRODUCT_IDS: Record<PremiumProductId, string> = {
    no_ads: 'no_ads',
    energy_100: 'energy_100',
    energy_250: 'energy_250',
    energy_500: 'energy_500',
    energy_1000: 'energy_1000',
    cash_25000: 'cash_25000',
    cash_75000: 'cash_75000',
    cash_200000: 'cash_200000',
    cash_500000: 'cash_500000',
    cash_1250000: 'cash_1250000',
    bundle_luxury_homes: 'bundle_luxury_homes',
    bundle_elite_vehicles: 'bundle_elite_vehicles',
    bundle_sky_sea: 'bundle_sky_sea',
    bundle_ultimate_lifestyle: 'bundle_ultimate_lifestyle',
};
```

Add these interfaces after `NativeStoreProduct`:

```ts
interface AndroidPurchaseToken {
    productIds?: string[];
    purchaseToken?: string;
    orderId?: string;
    purchaseState?: number;
    acknowledged?: boolean;
}

interface AndroidPurchasesPlugin {
    getProducts(options: { productIds: string[] }): Promise<{ products?: NativeStoreProduct[] }>;
    purchaseProduct(options: { productId: string }): Promise<{ cancelled?: boolean; purchases?: AndroidPurchaseToken[] }>;
    restorePurchases(): Promise<{ purchases?: AndroidPurchaseToken[] }>;
}
```

- [ ] **Step 3: Add Android platform helpers**

Add after `isCapacitorIOS`:

```ts
const isCapacitorAndroid = () => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};
```

Add after `const Purchases = registerPlugin<PurchasesPlugin>('Purchases');`:

```ts
const AndroidPurchases = registerPlugin<AndroidPurchasesPlugin>('AndroidPurchases');
```

Add after `getPurchasesPlugin`:

```ts
const getAndroidPurchasesPlugin = () => {
    return Capacitor.isPluginAvailable('AndroidPurchases') ? AndroidPurchases : null;
};
```

- [ ] **Step 4: Add Android catalog path**

Inside `getPremiumCatalogProducts`, replace the initial platform guard and product id selection with:

```ts
    if (import.meta.env.DEV) {
        return [];
    }

    const platformProductIds = isCapacitorAndroid() ? ANDROID_PRODUCT_IDS : IOS_PRODUCT_IDS;
    if (!isCapacitorIOS() && !isCapacitorAndroid()) {
        return [];
    }
```

Then before the existing iOS `try`, add:

```ts
    if (isCapacitorAndroid()) {
        try {
            const purchases = getAndroidPurchasesPlugin();
            if (!purchases?.getProducts) {
                return [];
            }
            const result = await purchases.getProducts({ productIds: Object.values(platformProductIds) });
            const products = result?.products || [];

            return Object.entries(platformProductIds).map(([premiumProductId, storeProductId]) => {
                const match = products.find(product => product.productId === storeProductId);
                return {
                    premiumProductId: premiumProductId as PremiumProductId,
                    storeProductId,
                    title: match?.title || '',
                    description: match?.description || '',
                    priceLabel: match?.priceLabel || ''
                };
            }).filter(product => !!product.priceLabel);
        } catch {
            return [];
        }
    }
```

In the existing iOS branch, change `Object.values(IOS_PRODUCT_IDS)` and `Object.entries(IOS_PRODUCT_IDS)` to use `platformProductIds`.

- [ ] **Step 5: Add Android purchase blocked result**

Inside `purchasePremiumProduct`, after the dev block and before the iOS-only rejection, add:

```ts
    if (isCapacitorAndroid()) {
        const purchases = getAndroidPurchasesPlugin();
        if (!purchases?.purchaseProduct) {
            return { success: false, message: 'Purchases are not available in this Android build yet. Please update the app and try again.' };
        }

        try {
            const storeProductId = ANDROID_PRODUCT_IDS[productId];
            const result = await purchases.purchaseProduct({ productId: storeProductId });
            if (result?.cancelled) {
                return { success: false, cancelled: true, message: 'Purchase cancelled.' };
            }

            const purchaseToken = result?.purchases?.find(purchase => purchase.productIds?.includes(storeProductId))?.purchaseToken;
            if (!purchaseToken) {
                return { success: false, message: 'Purchase did not return a verification token.' };
            }

            return {
                success: false,
                message: 'Android purchase captured. Server verification is required before granting rewards.'
            };
        } catch (error: any) {
            const message = String(error?.message || error || 'Purchase failed.');
            const cancelled = /cancel/i.test(message);
            return { success: false, cancelled, message: cancelled ? 'Purchase cancelled.' : message };
        }
    }
```

- [ ] **Step 6: Add Android restore blocked result**

Inside `restorePremiumPurchases`, after the dev block and before the iOS-only rejection, add:

```ts
    if (isCapacitorAndroid()) {
        const purchases = getAndroidPurchasesPlugin();
        if (!purchases?.restorePurchases) {
            return { success: false, restoredProductIds: [], message: 'Purchases are not available in this Android build yet. Please update the app and try again.' };
        }

        try {
            await purchases.restorePurchases();
            return {
                success: false,
                restoredProductIds: [],
                message: 'Android restore found purchase data, but server verification is required before restoring rewards.'
            };
        } catch (error: any) {
            return {
                success: false,
                restoredProductIds: [],
                message: String(error?.message || error || 'Restore failed.')
            };
        }
    }
```

- [ ] **Step 7: Run audit and TypeScript build**

Run: `npm run audit:android-billing`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add services/iapService.ts
git commit -m "feat: add android purchase facade"
```

## Task 5: Verify Native Build and Web Build

**Files:**
- No source changes expected unless verification reveals compile errors.

- [ ] **Step 1: Run web build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Sync Android assets**

Run: `npx cap sync android`

Expected: PASS.

- [ ] **Step 3: Run Android debug build**

Run from `android`: `./gradlew assembleDebug`

Expected: PASS and includes the billing dependency.

- [ ] **Step 4: Manual Play Console check**

Upload the resulting internal test build only after the native build passes. Expected Play Console effect: billing-related product setup should be available because the build now includes Google Play Billing.

- [ ] **Step 5: Commit verification fixes only if needed**

If any source changes were required during verification:

```bash
git add <changed-files>
git commit -m "fix: pass android billing verification"
```

If no source changes were required, do not create an empty commit.

## Scope Left For Later Plans

- Server verification with Google Play Developer API.
- Play Integrity challenge/response.
- Firestore token de-duplication.
- Consuming/acknowledging only after server approval.
- Actually granting Android rewards from `applyPremiumPurchase()`.
- Pre-registration reward handling.

